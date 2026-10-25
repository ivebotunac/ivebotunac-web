// The AGI boss: a glitchy floating core that enters from the top, takes clicks, taps and team fire, and fires slow dodgeable orbs.
import { bossBurnLines, bossHalfLines, bossLeaveLines, bossStartLines, bossWinLines, pick, rand } from './config'
import { explode, feedback, fireBeam, fxBurst } from './effects'
import { clearTrend } from './actions'
import { confetti, speak, syncQuest } from './quest'
import { deployRocket } from './team'
import { repairAll, scorch, textTarget } from './scorch'
import { saveMemory } from './guide'
import { track } from '~/utils/track'
import type { Memory } from './guide'
import type { Game } from './core'
import type { Boss, BossOrb } from './types'

// Tuned so taps plus team fire win in about 30 to 60 s; the team and robot alone do about 2 hp a second.
const HP = 300
const TAP = 2
const CRIT = 6
// Ticks: the entry, the death throes, a visitor who stops hitting for this long sends it away.
const ENTER = 100
const DIE = 100
const IDLE = 2400
const IDLE_TOUCH = 900
const BRAND = ['#0c2236', '#36c6e0', '#ff5a1f', '#f5f9fd', '#3b7cc0']
// Same key as guide.ts; the best boss time rides along in the visitor's memory object.
const KEY = 'ib-robot-v1'

export type GameMemory = Memory & { bossMs: number | null }

export function withBoss(m: Memory): GameMemory {
  let bossMs: number | null = null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof raw.bossMs === 'number') bossMs = raw.bossMs;
  } catch { /* storage blocked or corrupt */ }
  return Object.assign(m, { bossMs });
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
// Once a fight, when its first shot burns letters.
let burnSaid = false;
const cool = (a: number, b: number) => (a + rand(0, b)) | 0;
// Screen pixels per sprite cell; the sprite is 24 cells wide.
const cell = (g: Game) => (g.W < 520 ? 3 : 4);
export const bossR = (g: Game) => 12 * cell(g) + 6 + g.tapPad;
export const bossFighting = (g: Game) => !!g.boss && (g.boss.phase === 'enter' || g.boss.phase === 'fight');

export function fmtMs(ms: number): string {
  const s = Math.round(ms / 1000);
  return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
}

function homeY(g: Game): number {
  return Math.max(110, g.H * 0.26);
}

export function startBoss(g: Game): void {
  if (g.boss || g.printing) return;
  g.boss = {
    phase: 'enter', x: g.W / 2, y: -14 * cell(g), t: 0, hp: HP, max: HP, shown: HP, flash: 0, shake: 0,
    combo: 0, comboT: 0, lastHit: g.t, quarter: 4, atkCD: 60, tele: null, orbs: [], ms: 0, last: performance.now(), fireCD: 90
  };
  if (g.trend) clearTrend(g);
  g.attackT = 0; g.beamAt = 0; g.angryT = 0; g.wake();
  burnSaid = false;
  for (const m of g.team) m.cd = cool(60, 90);
  track('boss_start');
  speak(g, pick(bossStartLines));
  g.bridge?.announce('AGI boss incoming. ' + (g.coarse ? 'Tap' : 'Click') + ' it to fight.');
  syncQuest(g);
}

// Window listeners for the team card's and the HUD's "Fight AGI", and the HUD's "End fight".
export function bindBoss(g: Game): () => void {
  const onFight = () => { startBoss(g); };
  const onEnd = () => { if (g.boss && bossFighting(g)) leave(g, g.boss); };
  window.addEventListener('game:fight-agi', onFight);
  window.addEventListener('game:end-fight', onEnd);
  return () => { window.removeEventListener('game:fight-agi', onFight); window.removeEventListener('game:end-fight', onEnd); };
}

// The dying core still takes presses, so fast taps on its death throes never fall through to a link underneath.
export function bossAt(g: Game, x: number, y: number): boolean {
  const b = g.boss;
  return !!b && b.phase !== 'leave' && Math.hypot(x - b.x, y - b.y) < bossR(g);
}

// Checked in pointerDown before the robot; true when the press landed on the boss.
export function hitBoss(g: Game, x: number, y: number): boolean {
  const b = g.boss;
  if (!b || !bossAt(g, x, y)) return false;
  // a short gate, so an autoclicker cannot melt it
  if (b.phase !== 'fight' || g.t - b.lastHit < 4) return true;
  b.lastHit = g.t; b.combo++; b.comboT = 90;
  const big = b.combo % 8 === 0;
  g.freeze = big ? 5 : 2; g.buzz(big ? [20, 20, 40] : 12);
  fxBurst(g, x, y, big ? 16 : 8, pick(BRAND)); fxBurst(g, x, y, 6, '#ffffff');
  g.rings.push({ x, y, life: 0, max: big ? 26 : 16, c: big ? '#ff5a1f' : '#0b6bcb' });
  if (big) g.popups.push({ x: b.x, y: b.y - 13 * cell(g), text: b.combo + 'x CRIT!', life: 0, max: 60, c: '#ff5a1f', size: 18 });
  hurtBoss(g, big ? CRIT : TAP, big);
  return true;
}

// Every source of damage goes through here; a big hit also sends the Deployer's rocket.
export function hurtBoss(g: Game, dmg: number, big: boolean): void {
  const b = g.boss;
  if (!b || b.phase !== 'fight') return;
  b.hp = Math.max(0, b.hp - dmg);
  b.flash = Math.max(b.flash, big ? 6 : 3); b.shake = Math.max(b.shake, big ? 10 : 3);
  if (big) deployRocket(g, true);
  const q = Math.ceil((b.hp / b.max) * 4);
  if (q < b.quarter && q > 0) {
    b.quarter = q;
    g.bridge?.announce('AGI at ' + q * 25 + '% health.');
    if (q === 2) speak(g, pick(bossHalfLines));
    deployRocket(g, true);
  }
  if (b.hp <= 0) { b.phase = 'dying'; b.t = 0; b.tele = null; b.orbs.length = 0; }
}

// The robot fights from beside the boss with its cyan laser. Returns lerp.
export function bossRobotTarget(g: Game): number {
  const b = g.boss!, side = g.pos.x >= b.x ? 1 : -1;
  g.tgt.x = clamp(b.x + side * (bossR(g) + 90), 40, g.W - 40);
  g.tgt.y = clamp(b.y + 100 + Math.sin(g.t * 0.03) * 16, 60, g.H - 60);
  g.attackT = 0; g.beamAt = 0;
  if (b.phase === 'fight' && --b.fireCD <= 0) {
    fireBeam(g, g.pos.x, g.pos.y - 6, b.x, b.y, '#36c6e0'); fxBurst(g, b.x + rand(-10, 10), b.y + rand(-10, 10), 6, '#36c6e0');
    hurtBoss(g, 1.2, false);
    b.fireCD = cool(70, 30);
  }
  return 0.045;
}

// A spot is under the pointer when it moved or tapped there just now; touch has no hover, so the window is shorter.
function cursorNear(g: Game, x: number, y: number, r: number): boolean {
  return g.t - g.lastMove < (g.coarse ? 40 : 90) && Math.hypot(g.mouseX - x, g.mouseY - y) < r;
}

function landHit(g: Game, b: Boss): void {
  feedback(g, g.mouseX, g.mouseY, 'HIT!', '#ff5a1f');
  b.combo = 0; b.comboT = 0; g.buzz(30);
}

// Telegraph first, fire after: a reticle that a slow orb lands on, or (with a mouse) a slow three-orb spread.
function attack(g: Game, b: Boss): void {
  const tl = b.tele;
  if (tl) {
    if (++tl.life < tl.max) return;
    const sx = b.x, sy = b.y + 6 * cell(g);
    if (tl.kind === 'lock') b.orbs.push({ kind: 'lock', x: sx, y: sy, sx, sy, tx: tl.x, ty: tl.y, vx: 0, vy: 0, life: 0, max: 54 });
    else {
      const ang = Math.atan2(g.mouseY - sy, g.mouseX - sx);
      for (let i = -1; i <= 1; i++) b.orbs.push({ kind: 'spread', x: sx, y: sy, sx, sy, tx: 0, ty: 0, vx: Math.cos(ang + i * 0.28) * 2.4, vy: Math.sin(ang + i * 0.28) * 2.4, life: 0, max: 320 });
    }
    b.tele = null;
    b.atkCD = b.hp < b.max / 2 ? cool(110, 60) : cool(170, 80);
    return;
  }
  if (--b.atkCD > 0 || b.t < 90) return;
  // a spread at a cursor resting on the boss would land before it could move, so that case gets the reticle
  const far = Math.hypot(g.mouseX - b.x, g.mouseY - b.y) > bossR(g) + 90;
  if (!g.coarse && far && g.t - g.lastMove < 90 && Math.random() < 0.45) { b.tele = { kind: 'spread', x: b.x, y: b.y, life: 0, max: 40 }; return; }
  const aim = g.mouseX > -900 && g.t - g.lastMove < 600;
  // two shots in five, and every shot with no cursor to chase, go for the CV's text, so the fight leaves marks
  const page = !aim || Math.random() < 0.4 ? textTarget(g) : null;
  const x = page ? page.x : aim ? g.mouseX : rand(g.W * 0.2, g.W * 0.8), y = page ? page.y : aim ? g.mouseY : rand(g.H * 0.45, g.H * 0.8);
  b.tele = { kind: 'lock', x: clamp(x, 20, g.W - 20), y: clamp(y, 20, g.H - 20), life: 0, max: 56 };
}

function tickOrbs(g: Game, b: Boss): void {
  for (let i = b.orbs.length - 1; i >= 0; i--) {
    const o = b.orbs[i]!;
    o.life++;
    if (o.kind === 'lock') {
      const k = o.life / o.max, e = k * k * (3 - 2 * k);
      o.x = o.sx + (o.tx - o.sx) * e; o.y = o.sy + (o.ty - o.sy) * e - Math.sin(k * Math.PI) * 40;
      if (o.life >= o.max) {
        fxBurst(g, o.tx, o.ty, 14, '#ff5a1f'); g.rings.push({ x: o.tx, y: o.ty, life: 0, max: 22, c: '#ff5a1f' });
        if (cursorNear(g, o.tx, o.ty, 40)) landHit(g, b);
        if (scorch(g, o.tx, o.ty) && !burnSaid) { burnSaid = true; speak(g, pick(bossBurnLines)); }
        b.orbs.splice(i, 1);
      }
      continue;
    }
    o.x += o.vx; o.y += o.vy;
    if (!g.coarse && cursorNear(g, o.x, o.y, 18)) { landHit(g, b); fxBurst(g, o.x, o.y, 10, '#ff5a1f'); b.orbs.splice(i, 1); continue; }
    // a spread orb that runs out on screen lands where it is
    if (o.life >= o.max) scorch(g, o.x, o.y);
    if (o.life >= o.max || o.x < -20 || o.x > g.W + 20 || o.y < -20 || o.y > g.H + 20) b.orbs.splice(i, 1);
  }
}

function defeat(g: Game, b: Boss): void {
  const x = b.x, y = b.y, ms = Math.round(b.ms), best = g.mem.bossMs, record = best === null || ms < best;
  explode(g, x, y); explode(g, x, y); explode(g, x, y);
  fxBurst(g, x, y, 30, '#ff5a1f'); fxBurst(g, x, y, 24, '#36c6e0'); fxBurst(g, x, y, 20, '#ffffff');
  g.rings.push({ x, y, life: 0, max: 40, c: '#ff5a1f' }, { x, y, life: 0, max: 32, c: '#36c6e0' }, { x, y, life: 0, max: 24, c: '#0c2236' });
  confetti(g, 60, x, y);
  g.rage(true); g.buzz([40, 30, 80, 30, 120]);
  repairAll(g);
  if (record) { g.mem.bossMs = ms; saveMemory(g); }
  const py = Math.max(140, g.H * 0.46);
  g.popups.push({ x: g.W / 2, y: py, text: 'AGI defeated in ' + fmtMs(ms), life: 0, max: 220, c: '#ff5a1f', size: g.W < 520 ? 20 : 26 });
  if (record && best !== null) g.popups.push({ x: g.W / 2, y: py + 30, text: 'new best!', life: 0, max: 200, c: '#0b6bcb', size: 15 });
  track('boss_defeated', { ms });
  speak(g, pick(bossWinLines));
  g.bridge?.announce('AGI defeated in ' + fmtMs(ms) + '.' + (best === null ? '' : record ? ' New best.' : ' Best ' + fmtMs(best) + '.'));
  g.boss = null; g.angryT = 0;
  syncQuest(g);
}

function leave(g: Game, b: Boss): void {
  b.phase = 'leave'; b.t = 0; b.tele = null; b.orbs.length = 0;
  repairAll(g);
  speak(g, pick(bossLeaveLines));
  g.bridge?.announce('AGI left. Fight it again from the team button.');
}

// Runs from tickQuest, so it keeps going while the robot is popped; it only counts time while the fight is on.
export function tickBoss(g: Game): void {
  const b = g.boss;
  if (!b) return;
  const now = performance.now();
  // capped, so a hidden tab does not count
  if (b.phase === 'fight') b.ms += Math.min(100, now - b.last);
  b.last = now;
  b.t++;
  if (b.flash > 0) b.flash--;
  if (b.shake > 0) b.shake--;
  b.shown = b.shown > b.hp ? Math.max(b.hp, b.shown - b.max * 0.004) : b.hp;
  if (b.comboT > 0 && --b.comboT === 0) b.combo = 0;
  const P = cell(g), hy = homeY(g);
  if (b.phase === 'enter') {
    const k = Math.min(1, b.t / ENTER), e = 1 - Math.pow(1 - k, 3);
    b.x = g.W / 2; b.y = -14 * P + (hy + 14 * P) * e;
    if (b.t % 10 === 0) fxBurst(g, b.x + rand(-30, 30), b.y - 10 * P, 4, pick(['#36c6e0', '#9b6bff']));
    if (k >= 1) { b.phase = 'fight'; b.t = 0; b.lastHit = g.t; b.last = now; }
  } else if (b.phase === 'fight') {
    const amp = Math.max(0, Math.min(g.W * 0.3, g.W / 2 - 12 * P - 24));
    b.x = g.W / 2 + Math.sin(b.t * 0.011) * amp; b.y = hy + Math.sin(b.t * 0.023) * g.H * 0.04;
    attack(g, b);
    // on touch the boss takes every tap under it, so an idle fight ends sooner there
    if (g.t - b.lastHit > (g.coarse ? IDLE_TOUCH : IDLE)) leave(g, b);
  } else if (b.phase === 'dying') {
    b.shake = 8;
    if (b.t % 7 === 0) {
      const px = b.x + rand(-12, 12) * P, py = b.y + rand(-12, 12) * P;
      fxBurst(g, px, py, 10, pick(BRAND)); g.rings.push({ x: px, y: py, life: 0, max: 18, c: pick(['#ff5a1f', '#36c6e0']) });
    }
    if (b.t % 14 === 0) g.buzz(15);
    if (b.t >= DIE) { defeat(g, b); return; }
  } else {
    b.y -= 1 + b.t * 0.12;
    if (b.y < -16 * P) { g.boss = null; syncQuest(g); return; }
  }
  tickOrbs(g, b);
}

// ---- drawing ----
type Cell = { x: number, y: number, k: 'edge' | 'shell' | 'lit' | 'ring' | 'core' | 'text' | 'tip' }

// 3x5 letters for the forehead.
const FONT5: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  G: ['###', '#..', '#.#', '#.#', '###'],
  I: ['###', '.#.', '.#.', '.#.', '###']
}

// The core on a 24x24 grid: an octagonal shell, a segmented cyan ring, a dark core with a visor and "AGI".
let CELLS: Cell[] | null = null
function cells(): Cell[] {
  if (CELLS) return CELLS;
  const out: Cell[] = [], text = new Set<string>();
  'AGI'.split('').forEach((ch, i) => FONT5[ch]!.forEach((row, y) => row.split('').forEach((v, x) => { if (v === '#') text.add((6 + i * 4 + x) + ',' + (11 + y)); })));
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const dx = x + 0.5 - 12, dy = y + 0.5 - 12, d = Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) * 0.7071);
    if (d > 11.2) continue;
    let k: Cell['k'];
    if (d > 10.1) k = 'edge';
    else if (d > 8.4) k = dx + dy < -6 ? 'lit' : 'shell';
    else if (d > 7.2) k = 'ring';
    else k = text.has(x + ',' + y) ? 'text' : 'core';
    out.push({ x, y, k });
  }
  out.push({ x: 7, y: -1, k: 'tip' }, { x: 7, y: 0, k: 'edge' }, { x: 16, y: -1, k: 'tip' }, { x: 16, y: 0, k: 'edge' });
  CELLS = out;
  return out;
}

// A stable pseudo-random value per integer, so glitch bands hold for a few ticks instead of flickering every frame.
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

function cellColour(b: Boss, cl: Cell, warn: boolean): string {
  switch (cl.k) {
    case 'edge': return '#0c2236';
    case 'shell': return '#285a8c';
    case 'lit': return '#3b7cc0';
    case 'tip': return b.t % 30 < 15 ? '#ff5a1f' : '#ffd23b';
    case 'ring': {
      const a = Math.atan2(cl.y + 0.5 - 12, cl.x + 0.5 - 12), seg = (((a / (Math.PI * 2)) * 12 + b.t * 0.08) | 0) % 3;
      return seg === 0 ? '#1fa9c2' : '#36c6e0';
    }
    case 'text': return warn ? (b.t % 6 < 3 ? '#ffffff' : '#ffd23b') : '#ff5a1f';
    default: {
      // the visor sweep over the letters
      const vx = 6 + ((b.t * 0.25) | 0) % 12;
      if (cl.y === 8 && (cl.x === vx || cl.x === vx + 1)) return warn ? '#ffffff' : '#ff5a1f';
      if (cl.y === 8 && cl.x > 5 && cl.x < 18) return '#3a1a12';
      return (cl.y + ((b.t * 0.2) | 0)) % 9 === 0 ? '#16324d' : '#0c2236';
    }
  }
}

export function drawBoss(g: Game): void {
  const c = g.fxc, b = g.boss;
  if (!c || !b) return;
  const P = cell(g), warn = !!b.tele;
  const sx = b.shake > 0 ? Math.round((Math.random() - 0.5) * b.shake) : 0, sy = b.shake > 0 ? Math.round((Math.random() - 0.5) * b.shake) : 0;
  const x0 = Math.round(b.x - 12 * P) + sx, y0 = Math.round(b.y - 12 * P + Math.sin(b.t * 0.05) * 3) + sy;
  const seed = (b.t / 6) | 0, glitch = b.phase === 'dying' || warn || b.flash > 0 || hash(seed) < 0.3;
  const band = (hash(seed + 7) * 20) | 0, bandH = 2 + ((hash(seed + 3) * 3) | 0), bandOff = hash(seed + 11) < 0.5 ? -1 : 1;
  const gone = b.phase === 'dying' ? (b.t / DIE) * 0.55 : 0;
  const leaving = b.phase === 'leave' ? Math.max(0, 1 - b.t / 60) : 1;
  const all = cells();
  const put = (cl: Cell, ox: number, col: string) => {
    const off = glitch && cl.y >= band && cl.y < band + bandH ? bandOff : 0;
    c.fillStyle = col; c.fillRect(x0 + (cl.x + off) * P + ox, y0 + cl.y * P, P, P);
  };
  const keep = (cl: Cell) => !gone || hash(cl.x * 31 + cl.y * 7) >= gone;
  // chromatic split while glitching
  if (glitch) {
    c.globalAlpha = 0.35 * leaving;
    for (const cl of all) if (keep(cl)) put(cl, -2, '#36c6e0');
    for (const cl of all) if (keep(cl)) put(cl, 2, '#ff5a1f');
  }
  c.globalAlpha = leaving;
  for (const cl of all) if (keep(cl)) put(cl, 0, cellColour(b, cl, warn));
  if (b.flash > 0) {
    c.globalAlpha = Math.min(1, b.flash / 3) * 0.85 * leaving;
    for (const cl of all) if (keep(cl)) put(cl, 0, '#ffffff');
  }
  // four satellites on a tilted orbit
  for (let i = 0; i < 4; i++) {
    const a = b.t * 0.03 + i * Math.PI / 2, ox = Math.cos(a) * 15 * P, oy = Math.sin(a) * 5 * P;
    c.globalAlpha = (Math.sin(a) > 0 ? 1 : 0.55) * leaving;
    c.fillStyle = i % 2 ? '#ff5a1f' : '#36c6e0';
    c.fillRect(Math.round(b.x + ox - P), Math.round(b.y + oy - P), P * 2, P * 2);
  }
  c.globalAlpha = 1;
}

function drawReticle(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, a: number): void {
  c.globalAlpha = a; c.strokeStyle = '#ff5a1f'; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const s = t * 0.06 + i * Math.PI / 2;
    c.beginPath(); c.arc(x, y, r, s, s + Math.PI / 3); c.stroke();
  }
  c.fillStyle = '#ff5a1f';
  c.fillRect(Math.round(x) - 1, Math.round(y - r * 0.5) - 4, 2, 5); c.fillRect(Math.round(x) - 1, Math.round(y + r * 0.5), 2, 5);
  c.fillRect(Math.round(x - r * 0.5) - 4, Math.round(y) - 1, 5, 2); c.fillRect(Math.round(x + r * 0.5), Math.round(y) - 1, 5, 2);
  c.globalAlpha = 1;
}

function drawOrb(c: CanvasRenderingContext2D, o: BossOrb, t: number): void {
  const R = o.kind === 'lock' ? 8 : 6;
  c.fillStyle = '#0c2236'; c.beginPath(); c.arc(o.x, o.y, R, 0, Math.PI * 2); c.fill();
  c.fillStyle = t % 8 < 4 ? '#ff5a1f' : '#ffd23b'; c.beginPath(); c.arc(o.x, o.y, R - 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff'; c.fillRect(Math.round(o.x) - 2, Math.round(o.y - R) + 2, 2, 2);
}

// Drawn last: telegraphs, orbs, and the health bar on a paper plate so it reads in either theme.
export function drawBossOver(g: Game): void {
  const c = g.fxc, b = g.boss;
  if (!c || !b) return;
  const tl = b.tele;
  if (tl?.kind === 'lock') drawReticle(c, tl.x, tl.y, 40 - 22 * (tl.life / tl.max), g.t, 0.5 + 0.5 * Math.abs(Math.sin(tl.life * 0.25)));
  else if (tl) {
    c.globalAlpha = tl.life / tl.max; c.strokeStyle = '#ffd23b'; c.lineWidth = 2;
    c.beginPath(); c.arc(b.x, b.y, 14 * cell(g) - 10 * (tl.life / tl.max) * cell(g), 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
  }
  for (const o of b.orbs) {
    if (o.kind === 'lock') drawReticle(c, o.tx, o.ty, 18, g.t, 0.9);
    drawOrb(c, o, g.t);
  }
  if (b.phase === 'leave') return;
  const w = Math.min(320, g.W - 48), h = 10, x = Math.round((g.W - w) / 2), y = 30;
  const k = b.phase === 'enter' ? Math.min(1, b.t / ENTER) : 1;
  c.globalAlpha = k;
  c.fillStyle = '#d3deee'; c.fillRect(x - 8 + 4, y - 18 + 4, w + 16, h + 26);
  c.fillStyle = '#f5f9fd'; c.fillRect(x - 8, y - 18, w + 16, h + 26);
  c.strokeStyle = '#c6d7e7'; c.lineWidth = 1; c.strokeRect(x - 7.5, y - 17.5, w + 15, h + 25);
  c.fillStyle = '#ffffff'; c.fillRect(x, y, w, h);
  c.fillStyle = '#ffd23b'; c.fillRect(x + 1, y + 1, Math.round((w - 2) * (b.shown / b.max) * k), h - 2);
  c.fillStyle = '#ff5a1f'; c.fillRect(x + 1, y + 1, Math.round((w - 2) * (b.hp / b.max) * k), h - 2);
  c.fillStyle = 'rgba(12, 34, 54, 0.35)';
  for (let q = 1; q < 4; q++) c.fillRect(x + Math.round((w * q) / 4), y + 1, 1, h - 2);
  c.strokeStyle = '#0c2236'; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  c.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace'; c.fillStyle = '#0c2236';
  c.textAlign = 'left'; c.fillText(b.combo >= 2 ? 'AGI  ' + b.combo + 'x' : 'AGI', x, y - 5);
  c.textAlign = 'right'; c.fillText(Math.ceil((b.hp / b.max) * 100) + '%', x + w, y - 5);
  c.textAlign = 'center';
  c.globalAlpha = 1;
}
