// "Assemble the team": six sub-agents hide in CV rows, the visitor recruits them, and they trail the robot.
import { CONFETTI, notHereLines, peekLines, pick, rand, restartLines, teamDoneLines } from './config'
import { ROLES, ROLE_INFO, drawAgent } from './agents'
import { fxBurst } from './effects'
import { recruitLine, saveMemory } from './guide'
import { bossFighting, drawBoss, drawBossOver, tickBoss } from './boss'
import { deployRocket, drawCrew, drawPlanPath, teamBehaviour, tickCrew } from './team'
import { track } from '~/utils/track'
import { startRun } from './stats-client'
import { drawScorch, healNow, tickScorch } from './scorch'
import type { Game } from './core'
import type { Peek, Role } from './types'

// Ticks: the pop-out, the wait for a click (about 8 s), the duck back in, and the completion fly-by.
const OUT = 24
const WAIT = 480
const IN = 18
const FLYBY = 240
const MAX_CONFETTI = 180
// Screen pixels per sprite cell: bigger while waiting to be clicked, smaller in formation.
const PEEK_P = 3
const TEAM_P = 2

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const roleFor = (section: string): Role | undefined => ROLES.find(r => ROLE_INFO[r].section === section);
// Popped robots cannot talk; their line waits for the respawn.
export function speak(g: Game, line: string): void {
  if (!line) return;
  if (g.gone > 0) g.afterRespawn = line; else g.say(line, 260);
}

export function syncQuest(g: Game): void {
  const m = g.mem;
  g.bridge?.view({ team: [...m.team], done: m.team.length === ROLES.length, ms: m.teamMs, run: m.signRun, bossRun: m.bossRun, bossMs: m.bossRunMs, boss: !!g.boss });
}

// One random row per section, picked once a page view; the CvMore "show all" wrapper is not a row.
function pickHides(g: Game): void {
  for (const r of ROLES) {
    const id = ROLE_INFO[r].section;
    if (!id || g.mem.team.includes(r) || g.hides[r]?.isConnected) continue;
    const rows = [...document.querySelectorAll<HTMLDetailsElement>('#' + id + ' details')].filter(d => !d.classList.contains('more'));
    if (rows.length) g.hides[r] = rows[(Math.random() * rows.length) | 0];
  }
}

function addMember(g: Game, role: Role, x: number, y: number): void {
  g.team.push({ role, x, y, tx: x, ty: y, dir: 1, slot: g.team.length, cd: 300 + (rand(0, 600) | 0), note: '', noteT: 0 });
}

export function initQuest(g: Game): void {
  g.teamBehaviours.push(teamBehaviour);
  for (const r of g.mem.team) addMember(g, r, g.pos.x + rand(-40, 40), g.pos.y + rand(-30, 30));
  pickHides(g);
  syncQuest(g);
}

// 1 while out, growing in from 0 on the way out and shrinking on the way back in.
function peekScale(pk: Peek): number {
  if (pk.phase === 'out') { const e = pk.life / OUT; return 1 - (1 - e) * (1 - e); }
  return pk.phase === 'in' ? 1 - pk.life / IN : 1;
}

// Follows the row's summary line, so the agent stays with its row while the page scrolls.
function placePeek(g: Game, pk: Peek): void {
  const s = pk.row.querySelector(':scope > summary') ?? pk.row;
  const r = s.getBoundingClientRect();
  const ax = clamp(r.left + r.width * pk.ox, 28, g.W - 28), ay = r.top + Math.min(r.height, 64) / 2;
  const wait = pk.phase === 'wait';
  pk.x = ax + (wait ? Math.sin(pk.life * 0.03) * 10 : 0);
  pk.y = ay - 26 * peekScale(pk) + (wait ? Math.sin(pk.life * 0.09) * 4 : 0);
}

function spawnPeek(g: Game, role: Role, row: HTMLDetailsElement): void {
  if (g.peeks.some(p => p.role === role)) return;
  const pk: Peek = { role, row, x: 0, y: 0, ox: rand(0.55, 0.8), life: 0, phase: 'out' };
  placePeek(g, pk);
  g.peeks.push(pk);
  fxBurst(g, pk.x, pk.y, 18, '#9b6bff'); fxBurst(g, pk.x, pk.y, 10, ROLE_INFO[role].c); fxBurst(g, pk.x, pk.y, 8, '#ffffff');
  g.rings.push({ x: pk.x, y: pk.y, life: 0, max: 28, c: '#9b6bff' });
  if (g.gone <= 0) g.say(pick(g.coarse ? peekLines.touch : peekLines.mouse).replace('{r}', ROLE_INFO[role].label), 240);
}

function rowToggled(g: Game, d: HTMLDetailsElement): void {
  if (g.printing || !d.open || d.classList.contains('more')) return;
  const sec = d.closest('section[id]')?.id;
  const role = sec ? roleFor(sec) : undefined;
  if (!role || g.mem.team.includes(role)) return;
  pickHides(g);
  if (g.hides[role] === d) { spawnPeek(g, role, d); return; }
  // only sometimes, so reading the CV never turns into a nag
  if (g.t - g.notHereAt > 600 && Math.random() < 0.45 && g.gone <= 0 && !g.held && g.knockT <= 0 && !g.peeks.length) {
    g.notHereAt = g.t; g.say(pick(notHereLines).replace('{s}', ROLE_INFO[role].where), 220);
  }
}

export function peekAt(g: Game, x: number, y: number): Peek | null {
  const r = 8 * PEEK_P + g.tapPad;
  for (const pk of g.peeks) if (peekScale(pk) > 0.4 && Math.hypot(x - pk.x, y - pk.y) < r) return pk;
  return null;
}

// Checked in pointerDown before the robot; true when the press recruited an agent.
export function hitPeek(g: Game, x: number, y: number): boolean {
  const pk = peekAt(g, x, y);
  if (!pk) return false;
  g.peeks.splice(g.peeks.indexOf(pk), 1);
  recruit(g, pk.role, pk.x, pk.y);
  return true;
}

// The Deployer only turns up when the robot pops, and from then on launches a rocket on every pop.
export function questPop(g: Game, x: number, y: number): void {
  if (!g.mem.team.includes('deployer')) recruit(g, 'deployer', x, y);
  deployRocket(g, bossFighting(g));
}

// The server times the attempt from here; a reply for an attempt since restarted is dropped.
function beginRun(g: Game, startedAt: number): void {
  void startRun('team').then((run) => {
    if (!run || g.mem.teamStartedAt !== startedAt) return;
    g.mem.run = run; saveMemory(g); syncQuest(g);
  });
}

function recruit(g: Game, role: Role, x: number, y: number): void {
  const m = g.mem, info = ROLE_INFO[role];
  if (m.team.includes(role)) return;
  if (m.teamStartedAt === null) { m.teamStartedAt = Date.now(); m.run = null; beginRun(g, m.teamStartedAt); }
  m.team.push(role);
  addMember(g, role, x, y);
  fxBurst(g, x, y, 18, info.c); fxBurst(g, x, y, 10, '#ffffff');
  g.rings.push({ x, y, life: 0, max: 26, c: info.c });
  g.popups.push({ x, y: y - 26, text: '+ ' + info.label.toUpperCase(), life: 0, max: 80, c: '#ff5a1f', size: 16 });
  g.buzz(25);
  const n = m.team.length;
  track('agent_found', { role, section: info.section ?? 'pop', count: n });
  let text = info.label + ' recruited. Team ' + n + ' of ' + ROLES.length + '.';
  const line = recruitLine(g, role);
  if (n === ROLES.length) {
    m.teamMs = Math.max(0, Date.now() - m.teamStartedAt);
    track('team_complete', { ms: m.teamMs });
    // the faster of this team and the one kept from before a restart is the one the card offers to sign
    if (m.run && (m.signMs === null || m.teamMs < m.signMs)) { m.signRun = m.run; m.signMs = m.teamMs; }
    g.bridge?.finished(m.teamMs, m.run);
    g.flyby = FLYBY; text += ' Team assembled.';
    speak(g, pick(teamDoneLines));
  } else speak(g, line);
  saveMemory(g);
  g.bridge?.announce(text);
  syncQuest(g);
}

export function confetti(g: Game, n: number, x: number | null, y: number): void {
  for (let i = 0; i < n && g.confetti.length < MAX_CONFETTI; i++) {
    const a = rand(-Math.PI, 0), sp = x === null ? rand(0.5, 2) : rand(2, 5);
    g.confetti.push({ x: x ?? rand(0, g.W), y, vx: Math.cos(a) * sp, vy: x === null ? rand(0, 1.5) : Math.sin(a) * sp, rot: rand(0, 6), vr: rand(-0.3, 0.3), c: pick(CONFETTI), life: 0, max: 150 + (rand(0, 90) | 0) });
  }
}

// The completion fly-by: out to the left along the top, then back home lower down. Returns lerp.
export function flybyTarget(g: Game): number {
  const p = 1 - g.flyby / FLYBY, k = p < 0.5 ? p * 2 : 2 - p * 2;
  g.tgt.x = g.W * (0.85 - 0.7 * k);
  g.tgt.y = g.H * (p < 0.5 ? 0.28 : 0.5) + Math.sin(p * Math.PI * 4) * g.H * 0.05;
  g.attackT = 0; g.beamAt = 0;
  return 0.07;
}

// The per-tick hook for the whole quest: peeks, formation, behaviours, fly-by, confetti, the boss and the team's effects.
export function tickQuest(g: Game): void {
  for (let i = g.peeks.length - 1; i >= 0; i--) {
    const pk = g.peeks[i]!;
    pk.life++;
    if (pk.phase === 'out' && pk.life >= OUT) { pk.phase = 'wait'; pk.life = 0; }
    else if (pk.phase === 'wait' && (pk.life >= WAIT || !pk.row.open || !pk.row.isConnected)) { pk.phase = 'in'; pk.life = 0; }
    else if (pk.phase === 'in' && pk.life >= IN) { fxBurst(g, pk.x, pk.y, 6, ROLE_INFO[pk.role].c); g.peeks.splice(i, 1); continue; }
    placePeek(g, pk);
    if (pk.phase === 'wait' && pk.life % 50 === 1) g.rings.push({ x: pk.x, y: pk.y, life: 0, max: 30, c: ROLE_INFO[pk.role].c });
  }

  // A loose V behind the robot, pairs further back; each member lags a little more than the one before.
  const reach = 16 * Math.max(1, g.size()) * g.DS;
  for (let i = 0; i < g.team.length; i++) {
    const m = g.team[i]!, row = (i >> 1) + 1, side = i % 2 ? 1 : -1;
    m.tx = clamp(g.pos.x - g.dir * (reach + row * 28 * g.DS), 20, g.W - 20);
    m.ty = clamp(g.pos.y + side * (8 + row * 7) * g.DS - 4 * g.DS + Math.sin(g.t * 0.06 + i * 1.3) * 4, 20, g.H - 20);
    if (g.teamBehaviours.some(b => b(g, m))) continue;
    const px = m.x, k = 0.085 - i * 0.008;
    m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k;
    const dx = m.x - px;
    m.dir = Math.abs(dx) > 0.5 ? (dx < 0 ? -1 : 1) : g.dir;
  }

  if (g.flyby > 0 && g.gone <= 0) {
    if (g.flyby === FLYBY) confetti(g, 90, null, -10);
    else if (g.flyby % 5 === 0) confetti(g, 4, g.pos.x, g.pos.y);
    if (--g.flyby === 0) g.bridge?.complete();
  }

  for (let i = g.confetti.length - 1; i >= 0; i--) {
    const q = g.confetti[i]!;
    q.life++; q.vy += 0.06; q.vx *= 0.99; q.x += q.vx; q.y += q.vy; q.rot += q.vr;
    if (q.life >= q.max || q.y > g.H + 10) g.confetti.splice(i, 1);
  }
  tickBoss(g);
  tickScorch(g);
  tickCrew(g);
}

// Drawn after renderFx, on the same fx canvas.
export function drawQuest(g: Game): void {
  const c = g.fxc; if (!c) return;
  for (const q of g.confetti) {
    c.globalAlpha = q.life > q.max - 30 ? (q.max - q.life) / 30 : 1; c.fillStyle = q.c;
    const w = 1 + Math.round(Math.abs(Math.cos(q.rot)) * 5);
    c.fillRect(Math.round(q.x - w / 2), Math.round(q.y), w, 4);
  }
  c.globalAlpha = 1;
  drawScorch(g);
  drawBoss(g);
  drawPlanPath(g);
  for (const m of g.team) drawAgent(c, m.role, m.x, m.y, TEAM_P, m.dir, g.t, m.slot);
  drawCrew(g);
  for (const pk of g.peeks) {
    const k = peekScale(pk);
    if (k > 0.05) drawAgent(c, pk.role, pk.x, pk.y, PEEK_P * k, pk.x < g.pos.x ? 1 : -1, g.t, 7);
  }
  drawBossOver(g);
}

// Starts this visitor's game over: team, times and records go; tricks already learned stay, so nothing is taught twice,
// and the fastest finished runs stay, so a record not yet signed can still be.
export function restartGame(g: Game): void {
  const m = g.mem;
  m.team = []; m.teamStartedAt = null; m.teamMs = null; m.best = 0; m.pops = 0; m.bossMs = null; m.run = null;
  m.learned = m.learned.filter(s => s !== 'team');
  g.boss = null; g.flyby = 0; g.team.length = 0; g.peeks.length = 0; g.confetti.length = 0; g.hides = {};
  saveMemory(g); pickHides(g); syncQuest(g);
  speak(g, pick(restartLines));
  track('game_restart');
}

// The toggle event does not bubble, so it is caught on the way down.
export function bindQuest(g: Game): () => void {
  const onToggle = (e: Event) => { if (e.target instanceof HTMLDetailsElement) rowToggled(g, e.target); };
  const onRestart = () => { healNow(); restartGame(g); };
  const onBefore = () => { g.printing = true; healNow(); };
  // the page closes its print-opened rows after printing, and their toggles land a moment later
  const onAfter = () => { setTimeout(() => { g.printing = false; }, 400); };
  document.addEventListener('toggle', onToggle, true);
  window.addEventListener('game:restart', onRestart);
  window.addEventListener('beforeprint', onBefore);
  window.addEventListener('afterprint', onAfter);
  return () => {
    healNow();
    document.removeEventListener('toggle', onToggle, true);
    window.removeEventListener('game:restart', onRestart);
    window.removeEventListener('beforeprint', onBefore);
    window.removeEventListener('afterprint', onAfter);
  };
}
