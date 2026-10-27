// "Assemble the team": six sub-agents hide in CV rows, the visitor recruits them, and they trail the robot.
import { CONFETTI, notHereLines, peekLines, pick, rand, restartLines, teamDoneLines } from './config'
import { ROLES, ROLE_INFO, drawAgent } from './agents'
import { fxBurst } from './effects'
import { recruitLine, saveMemory } from './guide'
import { bossFighting, drawBoss, drawBossOver, tickBoss } from './boss'
import { deployRocket, drawCrew, drawPlanPath, flyAgent, teamBehaviour, tickCrew } from './team'
import { track } from '~/utils/track'
import { drawScorch, healNow, tickScorch } from './scorch'
import type { Game } from './core'
import type { Peek, Role } from './types'

// Ticks: the pop-out, the wait for a click (a minute at most, or until its row closes), the duck back in, and the completion fly-by.
const OUT = 24
const WAIT = 3600
const IN = 18
const FLYBY = 240
const MAX_CONFETTI = 180
// Screen pixels per sprite cell: bigger while waiting to be clicked, smaller in formation.
const PEEK_P = 3
const TEAM_P = 2

// True until a pointer press: keyboard and screen-reader visitors open rows without one, so they recruit on the toggle.
let kbd = true;
// performance.now() of the last tick, for the team clock
let lastNow = 0;
// the formation's bob, which holds still while the robot sleeps
let drift = 0;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const roleFor = (section: string): Role | undefined => ROLES.find(r => ROLE_INFO[r].section === section);
// Popped robots cannot talk; their line waits for the respawn.
export function speak(g: Game, line: string): void {
  if (!line) return;
  if (g.gone > 0) g.afterRespawn = line; else g.say(line, 260);
}

export function syncQuest(g: Game): void {
  const m = g.mem;
  g.bridge?.view({ team: [...m.team], done: m.team.length === ROLES.length, ms: m.teamMs, bossRun: m.bossRun, bossMs: m.bossRunMs, boss: bossFighting(g) });
}

// One random row per section, picked once a page view, among the rows on show: the CvMore "show all" wrapper and the
// rows folded inside it never hide an agent.
function pickHides(g: Game): void {
  for (const r of ROLES) {
    const id = ROLE_INFO[r].section;
    if (!id || g.mem.team.includes(r) || g.hides[r]?.isConnected) continue;
    const rows = [...document.querySelectorAll<HTMLDetailsElement>('#' + id + ' details')].filter(d => !d.closest('.more'));
    if (rows.length) g.hides[r] = rows[(Math.random() * rows.length) | 0];
  }
}

function addMember(g: Game, role: Role, x: number, y: number): void {
  g.team.push({ role, x, y, tx: x, ty: y, dir: 1, slot: g.team.length, cd: 300 + (rand(0, 600) | 0), note: '', noteT: 0, held: false, air: 0, vx: 0, vy: 0, rot: 0 });
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

// A point on the row's summary line, `ox` of the way across.
function rowPoint(g: Game, row: HTMLDetailsElement, ox: number): { x: number, y: number } {
  const r = (row.querySelector(':scope > summary') ?? row).getBoundingClientRect();
  return { x: clamp(r.left + r.width * ox, 28, g.W - 28), y: r.top + Math.min(r.height, 64) / 2 };
}

// The row's title, clipped to `max` characters.
function rowTitle(row: HTMLDetailsElement, max: number): string {
  const t = (row.querySelector('summary h3, .item__title, .skill__label')?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 3).trimEnd() + '...' : t;
}

// Follows the row's summary line, so the agent stays with its row while the page scrolls.
function placePeek(g: Game, pk: Peek): void {
  const a = rowPoint(g, pk.row, pk.ox);
  const wait = pk.phase === 'wait';
  pk.x = a.x + (wait ? Math.sin(pk.life * 0.03) * 10 : 0);
  pk.y = a.y - 26 * peekScale(pk) + (wait ? Math.sin(pk.life * 0.09) * 4 : 0);
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
  if (g.hides[role] === d) { if (kbd) recruitByKey(g, role, d); else spawnPeek(g, role, d); return; }
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
  g.bridge?.announce(recruit(g, pk.role, pk.x, pk.y, pk.row));
  return true;
}

// The Deployer only turns up when the robot pops, and from then on launches a rocket on every pop.
export function questPop(g: Game, x: number, y: number): void {
  if (!g.mem.team.includes('deployer')) g.bridge?.announce(recruit(g, 'deployer', x, y));
  deployRocket(g, bossFighting(g));
}

// Opening the hiding row from the keyboard recruits at once; nobody can pop the robot without a pointer, so the last
// row also brings the Deployer, and one announcement covers both.
function recruitByKey(g: Game, role: Role, row: HTMLDetailsElement): void {
  const { x, y } = rowPoint(g, row, 0.7);
  let text = recruit(g, role, x, y, row);
  if (ROLES.every(r => r === 'deployer' || g.mem.team.includes(r)) && !g.mem.team.includes('deployer')) text += ' ' + recruit(g, 'deployer', x, y + 30);
  g.bridge?.announce(text);
}

// Returns the screen-reader line for the caller to announce.
function recruit(g: Game, role: Role, x: number, y: number, row: HTMLDetailsElement | null = null): string {
  const m = g.mem, info = ROLE_INFO[role];
  if (m.team.includes(role)) return '';
  m.team.push(role);
  addMember(g, role, x, y);
  fxBurst(g, x, y, 18, info.c); fxBurst(g, x, y, 10, '#ffffff');
  g.rings.push({ x, y, life: 0, max: 26, c: info.c });
  g.popups.push({ x, y: y - 26, text: '+ ' + info.label.toUpperCase(), life: 0, max: 80, c: '#ff5a1f', size: 16 });
  g.buzz(25);
  const n = m.team.length;
  track('agent_found', { role, section: info.section ?? (kbd ? 'keyboard' : 'pop'), count: n });
  // the screen-reader line takes more of the title than the speech bubble, which keeps its line near 42 characters
  const title = row ? rowTitle(row, 40) : '';
  let text = info.label + ' recruited' + (title ? ' in "' + title + '"' : '') + '. Team ' + n + ' of ' + ROLES.length + '.';
  const line = recruitLine(g, role, row ? rowTitle(row, 18) : '');
  if (n === ROLES.length) {
    m.teamMs = Math.round(m.teamActiveMs);
    track('team_complete', { ms: m.teamMs });
    g.bridge?.finished(m.teamMs);
    g.flyby = FLYBY; text += ' Team assembled.';
    speak(g, pick(teamDoneLines));
  } else speak(g, line);
  saveMemory(g);
  syncQuest(g);
  return text;
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

  // capped like the boss clock, so a hidden tab does not count; only an incomplete team's time is the team's time
  const now = performance.now(), n = g.mem.team.length;
  if (n > 0 && n < ROLES.length) g.mem.teamActiveMs += Math.min(100, now - lastNow);
  lastNow = now;

  // A loose V behind the robot, pairs further back; each member lags a little more than the one before.
  const reach = 16 * Math.max(1, g.size()) * g.DS;
  if (!g.asleep) drift++;
  for (let i = 0; i < g.team.length; i++) {
    const m = g.team[i]!, row = (i >> 1) + 1, side = i % 2 ? 1 : -1;
    m.tx = clamp(g.pos.x - g.dir * (reach + row * 28 * g.DS), 20, g.W - 20);
    m.ty = clamp(g.pos.y + side * (8 + row * 7) * g.DS - 4 * g.DS + Math.sin(drift * 0.06 + i * 1.3) * 4, 20, g.H - 20);
    if (flyAgent(g, m) || g.teamBehaviours.some(b => b(g, m))) continue;
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
  for (const m of g.team) {
    if (!m.rot) { drawAgent(c, m.role, m.x, m.y, TEAM_P, m.dir, g.t, m.slot); continue; }
    c.save(); c.translate(m.x, m.y); c.rotate(m.rot); drawAgent(c, m.role, 0, 0, TEAM_P, m.dir, g.t, m.slot); c.restore();
  }
  drawCrew(g);
  for (const pk of g.peeks) {
    const k = peekScale(pk);
    if (k > 0.05) drawAgent(c, pk.role, pk.x, pk.y, PEEK_P * k, pk.x < g.pos.x ? 1 : -1, g.t, 7);
  }
  drawBossOver(g);
}

// Starts this visitor's game over: team, times and records go; tricks already learned stay, so nothing is taught twice,
// and the fastest finished boss fight stays, so a record not yet signed can still be.
function restartGame(g: Game): void {
  const m = g.mem;
  m.team = []; m.teamActiveMs = 0; m.teamMs = null; m.best = 0; m.pops = 0; m.bossMs = null;
  m.learned = m.learned.filter(s => s !== 'team');
  g.boss = null; g.flyby = 0; g.team.length = 0; g.carry = null; g.peeks.length = 0; g.confetti.length = 0; g.hides = {};
  saveMemory(g); pickHides(g); syncQuest(g);
  speak(g, pick(restartLines));
  track('game_restart');
}

// The toggle event does not bubble, so it is caught on the way down.
export function bindQuest(g: Game): () => void {
  kbd = true; lastNow = performance.now();
  const onToggle = (e: Event) => { if (e.target instanceof HTMLDetailsElement) rowToggled(g, e.target); };
  const onKey = () => { kbd = true; };
  const onPointer = () => { kbd = false; };
  // the team clock lives in memory, so leaving the tab keeps what it counted
  const onVisible = () => { if (document.hidden) saveMemory(g); };
  const onRestart = () => { healNow(); restartGame(g); };
  const onBefore = () => { g.printing = true; healNow(); };
  // the page closes its print-opened rows after printing, and their toggles land a moment later
  const onAfter = () => { setTimeout(() => { g.printing = false; }, 400); };
  document.addEventListener('toggle', onToggle, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('pointerdown', onPointer, true);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('game:restart', onRestart);
  window.addEventListener('beforeprint', onBefore);
  window.addEventListener('afterprint', onAfter);
  return () => {
    healNow();
    saveMemory(g);
    document.removeEventListener('toggle', onToggle, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointerdown', onPointer, true);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('game:restart', onRestart);
    window.removeEventListener('beforeprint', onBefore);
    window.removeEventListener('afterprint', onAfter);
  };
}
