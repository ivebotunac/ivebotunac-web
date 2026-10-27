// What the robot and the visitor do: attacks, trends, input and hit reactions.
import { COMBO_LINES, caughtTpl, dispScale, grabLines, knockLines, lureLines, missLines, petLines, pick, puffLines, rand, stealLines, throwLines, trends } from './config'
import { cursorHit, emit, explode, feedback, fireBeam, fxBurst } from './effects'
import { learn, linkLine, onJuggle, onKnock, onPop } from './guide'
import { hitPeek, questPop } from './quest'
import { hitBoss } from './boss'
import { agentAt, grabAgent, onTrendCaught, tossAgent } from './team'
import { actAlpha, linesFor } from './critters'
import { track } from '~/utils/track'
import type { Game } from './core'
import type { Carry, Press } from './types'

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let tt = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  tt = Math.max(0, Math.min(1, tt));
  return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy));
}

// ---- attacks ----
function fireBullets(g: Game, txx: number, tyy: number, n: number): void {
  const ang = Math.atan2(tyy - g.pos.y, txx - g.pos.x);
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.14;
    g.bullets.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4, life: 0, max: 80 });
  }
}

// Only thrown while in a critter form.
function throwBall(g: Game, tx: number, ty: number): void {
  const ang = Math.atan2(ty - g.pos.y, tx - g.pos.x), sp = 5;
  g.balls.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4, spin: 0, dspin: 0.34, life: 0, max: 72 });
}

// An attack run starts only while the cursor is moving; it never just trails the cursor.
export function scheduleAttack(g: Game, recent: boolean): void {
  if (g.knockT <= 0 && !g.held && !g.asleep && !g.boss && (!g.trend || g.angryT > 0) && recent && g.attackT <= 0 && g.beamAt <= 0) {
    if (g.attackCD > 0) g.attackCD--;
    else {
      g.attackT = 1; g.atkPhase = 'approach'; g.atkTimer = 0; g.fired = false;
      const rk = Math.random();
      if (g.curForm !== 'robot') g.attackKind = rk < 0.4 ? 'ball' : (rk < 0.62 ? 'bullets' : (rk < 0.82 ? 'beam' : 'melee'));
      else g.attackKind = rk < 0.45 ? 'bullets' : (rk < 0.78 ? 'beam' : 'melee');
    }
  }
}

// Approach the cursor, fire, return home. Returns lerp.
export function runAttack(g: Game, recent: boolean): number {
  g.atkTimer++;
  let lerp: number;
  if (g.atkPhase === 'approach') {
    g.tgt.x = g.mouseX; g.tgt.y = g.mouseY; lerp = g.attackKind === 'melee' ? 0.1 : 0.07;
    const dM = Math.hypot(g.pos.x - g.mouseX, g.pos.y - g.mouseY);
    if (!g.fired) {
      if (g.attackKind === 'melee') {
        if (dM < 40 || g.atkTimer > 110) { if (dM < 48 && recent) cursorHit(g, g.mouseX, g.mouseY, 'BONK!'); else if (Math.random() < 0.5) g.say(pick(missLines), 170); g.fired = true; g.atkPhase = 'return'; }
      } else if (dM < 150 || g.atkTimer > 90) {
        if (g.attackKind === 'ball' && g.curForm !== 'robot') throwBall(g, g.mouseX, g.mouseY);
        else if (g.attackKind === 'bullets' || g.attackKind === 'ball') fireBullets(g, g.mouseX, g.mouseY, 3);
        else { g.lockX = g.mouseX; g.lockY = g.mouseY; g.beamAt = g.t + 9; }
        g.fired = true; g.atkPhase = 'return';
      }
    }
  } else {
    g.tgt.x = g.W * 0.80; g.tgt.y = g.H * 0.5; lerp = 0.05;
    if (Math.hypot(g.pos.x - g.tgt.x, g.pos.y - g.tgt.y) < 36 || g.atkTimer > 280) { g.attackT = 0; g.attackCD = (g.angryT > 0 ? 80 : 300) + (rand(0, g.angryT > 0 ? 80 : 260) | 0); }
  }
  return lerp;
}

// The laser fires a few frames after locking, which is the dodge window.
export function resolveBeam(g: Game, recent: boolean): void {
  if (g.beamAt > 0 && g.t >= g.beamAt) {
    fireBeam(g, g.pos.x, g.pos.y, g.lockX, g.lockY, '#ff5a1f'); fxBurst(g, g.lockX, g.lockY, 12, '#ff5a1f');
    if (Math.hypot(g.mouseX - g.lockX, g.mouseY - g.lockY) < 46 && recent) { cursorHit(g, g.mouseX, g.mouseY); }
    else if (Math.random() < 0.5) g.say(pick(missLines), 170);
    g.beamAt = 0;
  }
}

export function updateBullets(g: Game, recent: boolean): void {
  for (let k = g.bullets.length - 1; k >= 0; k--) {
    const bu = g.bullets[k]!;
    bu.x += bu.vx; bu.y += bu.vy; bu.life++;
    const hit = recent && Math.hypot(bu.x - g.mouseX, bu.y - g.mouseY) < 24;
    if (hit) { cursorHit(g, g.mouseX, g.mouseY); g.bullets.splice(k, 1); continue; }
    if (bu.life > bu.max || bu.x < -20 || bu.x > g.W + 20 || bu.y < -20 || bu.y > g.H + 20) g.bullets.splice(k, 1);
  }
}

// ---- trends (the flying AI-trend tags) ----
export function spawnTrend(g: Game): void {
  const fromLeft = Math.random() < 0.5;
  g.trend = { x: fromLeft ? -90 : g.W + 90, baseY: rand(110, Math.max(150, g.H - 200)), y: 0, vx: (fromLeft ? 1 : -1) * rand(1.2, 1.7), tt: 0, label: pick(trends), hits: 0, held: false, fvx: 0, fvy: 0 };
  g.trend.y = g.trend.baseY; g.trendEl.textContent = g.trend.label; g.trendEl.hidden = false;
}

export function clearTrend(g: Game): void {
  if (g.carry?.kind === 'trend') g.carry = null;
  g.trend = null; g.trendEl.hidden = true; g.trendCD = 520 + (rand(0, 420) | 0);
}

function humanGrab(g: Game): void {
  if (!g.trend) return;
  const tx = g.trend.x, ty = g.trend.y;
  g.say(pick(stealLines));
  explode(g, tx, ty); fxBurst(g, tx, ty, 18, '#ffffff');
  feedback(g, tx, ty, 'DESTROYED', '#0b6bcb');
  clearTrend(g); g.angryT = 260;
}

// A dragged tag sits where the hand puts it; a thrown one carries the throw, which fades back into its cruise.
export function updateTrendMotion(g: Game): void {
  const tr = g.trend;
  if (!tr) return;
  tr.tt++;
  if (!tr.held) {
    tr.x += tr.vx + tr.fvx; tr.fvx *= 0.95;
    tr.baseY = clamp(tr.baseY + tr.fvy, 40, Math.max(60, g.H - 60)); tr.fvy *= 0.95;
    tr.y = tr.baseY + Math.sin(tr.tt * 0.04) * 32;
  }
  g.trendEl.style.transform = 'translate(' + tr.x + 'px,' + tr.y + 'px)';
  if (!tr.held && (tr.x < -150 || tr.x > g.W + 150)) clearTrend(g);
}

// Chase from behind, never on top; a tag in the visitor's hand is followed wherever it goes. Only called with a trend and no anger. Returns lerp.
export function chaseTarget(g: Game): number {
  const trend = g.trend!;
  g.attackT = 0; g.beamAt = 0;
  const tw = g.trendEl.offsetWidth || 90;
  if (trend.held) {
    const cx = trend.x + tw / 2, cy = trend.y + 12, a = Math.atan2(g.pos.y - cy, g.pos.x - cx);
    g.tgt.x = clamp(cx + Math.cos(a) * (tw / 2 + 50), 40, g.W - 40);
    g.tgt.y = clamp(cy + Math.sin(a) * 60, 60, g.H - 60);
    return 0.08;
  }
  const behindX = trend.vx > 0 ? (trend.x - 100) : (trend.x + tw + 60);
  g.tgt.x = Math.max(40, Math.min(g.W - 40, behindX));
  g.tgt.y = Math.max(60, Math.min(g.H - 60, trend.y + 6));
  return 0.08;
}

export function shootAndCatch(g: Game): void {
  if (g.trend && g.angryT <= 0) {
    const central = g.trend.x > 70 && g.trend.x < g.W - 70;
    const dT = Math.hypot(g.pos.x - g.trend.x, g.pos.y - g.trend.y);
    if (g.fireCD > 0) g.fireCD--;
    if (central && dT < 320 && g.fireCD <= 0) { fireBeam(g, g.pos.x, g.pos.y - 6, g.trend.x, g.trend.y, '#36c6e0'); fxBurst(g, g.trend.x, g.trend.y, 5, '#36c6e0'); g.fireCD = 18; g.trend.hits++; }
    // Lets it fly about 4.5s, then catches it with a laser from behind; never out of the visitor's hand, nor mid-throw.
    if (g.trend.tt > 280 && g.trend.hits >= 2 && !g.trend.held && Math.hypot(g.trend.fvx, g.trend.fvy) < 1) {
      const cx2 = g.trend.x, cy2 = g.trend.y;
      g.say(pick(caughtTpl) + g.trend.label + ' trend!'); fireBeam(g, g.pos.x, g.pos.y - 6, cx2, cy2, '#ff5a1f'); feedback(g, cx2, cy2, 'CAUGHT!', '#ff5a1f'); emit(g, 10, 12); onTrendCaught(g); clearTrend(g);
    }
  }
}

// ---- hits, combo and inflation ----
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Shared juice for every landed hit: hit-stop, flash, shake, squash, haptics, combo, inflation.
function impact(g: Game, freeze: number): void {
  g.freeze = freeze; g.flash = 6; g.shake = 9; g.kick(0.32); g.buzz(18);
  if (!g.hitTracked && track('game_hit')) g.hitTracked = true;
  g.combo++; g.comboT = 150;
  // Every hit inflates it from normal size; random growth waits until it deflates.
  if (g.combo === 1) g.scaleTarget = 1;
  g.puff += 0.1 + Math.min(g.combo, 10) * 0.008;
  if (g.combo >= 2) g.popups.push({ x: g.pos.x, y: g.pos.y - 30 * g.size() * g.DS, text: g.combo + 'x COMBO', life: 0, max: 50, c: '#ff5a1f', size: 15 + Math.min(g.combo, 12) });
  const line = COMBO_LINES[g.combo];
  if (line) g.say(line, 200);
  else if (g.puff > 0.55 && !g.puffSaid) { g.puffSaid = true; g.say(pick(puffLines), 180); }
  if (g.puff >= 1) popRobot(g);
}

function knockRobot(g: Game, dirx: number): void {
  g.knockT = 120; g.hitCD = 20; g.attackT = 0; g.beamAt = 0;
  g.kvx = clamp(dirx, -7, 7); g.kvy = -4; g.krot = 0;
  // The more it is knocked, the angrier it gets and the more it targets the visitor.
  g.angryT = Math.min(900, g.angryT + 240); g.attackCD = Math.min(g.attackCD, 30);
  emit(g, 16, 16); g.say(pick(linesFor(g, 'hit') ?? knockLines)); feedback(g, g.pos.x, g.pos.y, 'POW!', '#0b6bcb');
  impact(g, 5);
  if (g.gone <= 0) onKnock(g);
}

// A hit while it is still in the air bounces it back up and keeps the combo going.
export function juggle(g: Game, dirx: number): void {
  g.kvy = -7 - Math.min(g.combo, 8) * 0.35; g.kvx = clamp(g.kvx * 0.5 + dirx, -8, 8);
  g.knockT = Math.max(g.knockT, 110); g.jugCD = 5; g.angryT = Math.min(900, g.angryT + 60);
  emit(g, 10, 14); fxBurst(g, g.pos.x, g.pos.y, 10, '#ffffff');
  g.rings.push({ x: g.pos.x, y: g.pos.y, life: 0, max: 20, c: '#0b6bcb' });
  impact(g, 3);
  // stretch on the way up, after the impact squash
  g.sqv = -0.3;
  if (g.gone <= 0) onJuggle(g);
}

function hitRobot(g: Game, dirx: number): void {
  if (g.knockT > 0) { if (g.jugCD <= 0) juggle(g, dirx); }
  else if (g.hitCD <= 0) knockRobot(g, dirx);
}

// Inflated past its limit: bursts into debris, the screen flashes, and it respawns a moment later.
function popRobot(g: Game): void {
  onPop(g);
  const x = g.pos.x, y = g.pos.y;
  explode(g, x, y); explode(g, x, y); fxBurst(g, x, y, 30, '#ff5a1f'); fxBurst(g, x, y, 20, '#ffffff');
  g.rings.push({ x, y, life: 0, max: 34, c: '#ff5a1f' }, { x, y, life: 0, max: 26, c: '#0c2236' });
  g.popups.push({ x, y, text: 'POP!', life: 0, max: 70, c: '#ff5a1f', size: 28 });
  g.rage(); g.buzz([40, 30, 80]);
  g.gone = 110; g.freeze = 0; g.puff = 0; g.puffSaid = false; g.combo = 0; g.comboT = 0;
  g.knockT = 0; g.held = false; g.press = null; g.attackT = 0; g.beamAt = 0;
  g.bubble.hidden = true; g.sparks.length = 0;
  if (g.trend) clearTrend(g);
  track('game_pop');
  questPop(g, x, y);
}

// A slow cursor over the robot: hearts, and the anger and inflation drain away.
export function pet(g: Game): void {
  g.petAcc++; g.angryT = Math.max(0, g.angryT - 6); g.puff = Math.max(0, g.puff - 0.004);
  g.attackT = 0; g.attackCD = Math.max(g.attackCD, 120);
  if (g.petAcc % 22 === 1) g.popups.push({ x: g.pos.x + rand(-14, 14), y: g.pos.y - 24 * g.size() * g.DS, text: '♥', life: 0, max: 50, c: '#ff6fa3', size: 17 });
  if (g.petAcc === 90) { g.say(pick(linesFor(g, 'pet') ?? petLines), 220); learn(g, 'pet'); }
}

// Idle wandering target, lower and slower while asleep. Returns lerp.
export function idleTarget(g: Game): number {
  if (!g.homeTgt || --g.homeHold <= 0) { g.homeTgt = { x: g.W * 0.80 + rand(-g.W * 0.05, g.W * 0.05), y: g.H * 0.48 + rand(-g.H * 0.1, g.H * 0.1) }; g.homeHold = 220 + (rand(0, 260) | 0); }
  g.tgt.x = g.homeTgt.x; g.tgt.y = g.asleep ? g.H * 0.62 : g.homeTgt.y;
  return g.asleep ? 0.015 : 0.03;
}

// ---- pointer: press hits at once (a touch on lift), moving or holding turns it into a grab, release throws ----
// `robot` false limits the press to a waiting agent and the boss; `hold` (a finger kept still) grabs the robot without the hit.
function pointerDown(g: Game, x: number, y: number, robot = true, hold = false): boolean {
  g.swallowClick = false; g.wake();
  // a waiting sub-agent wins over the robot and the trend, and is clickable while the robot is popped
  if (hitPeek(g, x, y)) { g.mouseX = x; g.mouseY = y; g.lastMove = g.t; g.swallowClick = true; return true; }
  // the boss sits over the page, so it wins over the robot and stays hittable while the robot is popped
  if (hitBoss(g, x, y)) { g.mouseX = x; g.mouseY = y; g.lastMove = g.t; g.swallowClick = true; return true; }
  // a teammate is picked up at once, no hit; it stays grabbable while the robot is popped
  const m = robot ? agentAt(g, x, y) : null;
  if (m) {
    g.mouseX = x; g.mouseY = y; g.lastMove = g.t; g.swallowClick = true;
    g.carry = { kind: 'agent', m, sx: x, sy: y, ox: m.x - x, oy: m.y - y, moved: true, hist: [{ x, y, ms: performance.now() }] };
    grabAgent(g, m);
    return true;
  }
  if (g.gone > 0 || !robot) return false;
  // the trend tag: a tap destroys it as before, a drag carries it and the robot follows
  if (g.trend && !g.trendEl.hidden) {
    const r = g.trendEl.getBoundingClientRect(), pad = g.coarse ? 16 : 12;
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
      g.mouseX = x; g.mouseY = y; g.lastMove = g.t; g.swallowClick = true;
      g.carry = { kind: 'trend', m: null, sx: x, sy: y, ox: g.trend.x - x, oy: g.trend.y - y, moved: false, hist: [{ x, y, ms: performance.now() }] };
      return true;
    }
  }
  // a vanished critter is not there to hit, so the click reaches the page
  if (Math.hypot(x - g.pos.x, y - g.pos.y) >= g.hitR() || actAlpha(g) < 0.3) return false;
  g.mouseX = x; g.mouseY = y; g.lastMove = g.t;
  if (!hold) hitRobot(g, (g.pos.x - x) * 0.2 + (Math.random() - 0.5) * 6);
  if (g.gone <= 0) g.press = { sx: x, sy: y, x, y, ox: g.pos.x - x, oy: g.pos.y - y, t0: g.t, moved: false, hist: [{ x, y, ms: performance.now() }] };
  if (hold && g.press) grabRobot(g, g.press);
  g.swallowClick = true;
  return true;
}

function carryMove(g: Game, c: Carry, x: number, y: number): void {
  c.hist.push({ x, y, ms: performance.now() }); if (c.hist.length > 8) c.hist.shift();
  if (c.kind === 'agent') {
    // a restart can take the member away mid-carry
    if (!c.m || !g.team.includes(c.m)) { g.carry = null; return; }
    c.m.x = clamp(x + c.ox, 12, g.W - 12); c.m.y = clamp(y + c.oy, 12, g.H - 12);
    return;
  }
  const tr = g.trend;
  if (!tr) { g.carry = null; return; }
  if (!c.moved && Math.hypot(x - c.sx, y - c.sy) > 10) {
    c.moved = true; tr.held = true; tr.fvx = 0; tr.fvy = 0;
    if (g.angryT <= 0 && !g.held) g.say(pick(lureLines), 160);
  }
  if (!c.moved) return;
  tr.x = x + c.ox; tr.y = y + c.oy;
  // keeps the bob continuous for when it is let go
  tr.baseY = tr.y - Math.sin(tr.tt * 0.04) * 32;
  if (Math.abs(x - c.hist[0]!.x) > 2) tr.vx = (x < c.hist[0]!.x ? -1 : 1) * Math.abs(tr.vx);
}

// Throw velocity is the pointer's over its last ~90ms, in pixels per tick.
function flingVelocity(hist: { x: number, y: number, ms: number }[]): { vx: number, vy: number } {
  const now = performance.now(), last = hist[hist.length - 1]!, first = hist.find(h => now - h.ms < 90) ?? last;
  const k = (1000 / 60) / Math.max(16, last.ms - first.ms);
  return { vx: clamp((last.x - first.x) * k, -24, 24), vy: clamp((last.y - first.y) * k, -24, 24) };
}

function carryUp(g: Game, c: Carry): void {
  g.carry = null;
  const v = flingVelocity(c.hist);
  if (c.kind === 'agent') {
    if (c.m && g.team.includes(c.m)) { tossAgent(g, c.m, v.vx, v.vy); learn(g, 'toss'); }
    return;
  }
  const tr = g.trend;
  if (!tr) return;
  if (!c.moved) { humanGrab(g); return; }
  tr.held = false; tr.fvx = v.vx * 0.8; tr.fvy = v.vy * 0.8;
  if (Math.abs(v.vx) > 1) tr.vx = (v.vx < 0 ? -1 : 1) * Math.abs(tr.vx);
  learn(g, 'lure');
}

function pointerMove(g: Game, x: number, y: number): void {
  if (g.carry) { carryMove(g, g.carry, x, y); return; }
  const p = g.press; if (!p) return;
  p.hist.push({ x, y, ms: performance.now() }); if (p.hist.length > 8) p.hist.shift();
  p.x = x; p.y = y;
  if (!g.held && Math.hypot(x - p.sx, y - p.sy) > 10) grabRobot(g, p);
}

function pointerUp(g: Game): void {
  if (g.carry) { carryUp(g, g.carry); return; }
  const p = g.press; g.press = null;
  if (!p || !g.held) return;
  g.held = false;
  ({ vx: g.kvx, vy: g.kvy } = flingVelocity(p.hist));
  const sp = Math.hypot(g.kvx, g.kvy);
  g.knockT = (70 + Math.min(60, sp * 3)) | 0; g.krot = 0;
  learn(g, 'throw');
  if (sp > 9) {
    feedback(g, g.pos.x, g.pos.y, 'WHEEE!', '#0b6bcb'); g.say(pick(throwLines), 160);
    g.angryT = Math.min(900, g.angryT + 120); g.puff += 0.08;
    if (g.puff >= 1) popRobot(g);
  }
}

function grabRobot(g: Game, p: Press): void {
  p.moved = true; g.held = true; g.knockT = 0; g.kvx = 0; g.kvy = 0; g.attackT = 0; g.beamAt = 0;
  g.say(pick(grabLines), 160); g.kick(-0.25);
}

// Binds every window listener and returns the function that removes them all.
export function bindInput(g: Game): () => void {
  // Browsers follow a tap with compatibility mouse events; read as a mouse, a tap would swipe through the robot.
  const fromTouch = () => performance.now() - g.lastTouch < 800;
  const onMouseMove = (e: MouseEvent) => {
    if (fromTouch()) return;
    const cx = e.clientX, cy = e.clientY, now = performance.now();
    g.wake();
    // in px per ms, so a swipe takes the same flick at any mouse polling or frame rate
    g.mouseV = g.pmX > -900 ? Math.hypot(cx - g.pmX, cy - g.pmY) / Math.max(4, now - g.pmMs) : 0;
    if (g.press || g.carry) pointerMove(g, cx, cy);
    else if (g.pmX > -900 && g.gone <= 0) {
      const sp = Math.hypot(cx - g.pmX, cy - g.pmY);
      const canHit = g.knockT > 0 ? g.jugCD <= 0 : g.hitCD <= 0;
      if (g.mouseV > 1.6) {
        // fast swipe through the robot knocks it down, or juggles it while airborne
        if (canHit && segDist(g.pos.x, g.pos.y, g.pmX, g.pmY, cx, cy) < (36 + 18 * g.size()) * g.DS) {
          g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; hitRobot(g, (cx - g.pmX) * 0.45);
        }
        // fast swipe through the trend destroys it
        else if (g.trend && !g.trendEl.hidden) {
          const r = g.trendEl.getBoundingClientRect();
          if (segDist(r.left + r.width / 2, r.top + r.height / 2, g.pmX, g.pmY, cx, cy) < Math.max(r.width, r.height) / 2 + 14) {
            g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; humanGrab(g);
          }
        }
      } else if (sp < 6 && g.knockT <= 0 && Math.hypot(cx - g.pos.x, cy - g.pos.y) < g.hitR()) g.petT = g.t;
    }
    g.pmX = cx; g.pmY = cy; g.pmMs = now; g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t;
  };
  const onMouseOut = (e: MouseEvent) => { if (!e.relatedTarget) g.lastMove = -999; };
  // The quest HUD and team card take their own clicks, even with the robot flying over them.
  const onUi = (e: Event) => !!(e.target as Element | null)?.closest?.('[data-game-ui]');
  // A link or a row toggle does what it shows; only a waiting agent or the boss wins over it.
  const onPage = (e: Event) => !!(e.target as Element | null)?.closest?.('a[href],button,summary,[role=button]');
  // Cleared on every primary press, so a swallow left by a press that sent no click never eats a HUD click.
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    g.swallowClick = false;
    if (!fromTouch() && !onUi(e) && pointerDown(g, e.clientX, e.clientY, !onPage(e))) e.preventDefault();
  };
  // the click, if any, is dispatched before this timeout runs, so the swallow cannot outlive it
  const onMouseUp = () => { pointerUp(g); setTimeout(() => { g.swallowClick = false; }, 0); };
  // A touch on the robot, the trend or an agent waits: a lift is a tap, a finger kept still 220ms grabs, any other move scrolls the page.
  let pend: { sx: number, sy: number } | null = null;
  let pendTO: ReturnType<typeof setTimeout> | undefined;
  const dropPend = () => { clearTimeout(pendTO); pend = null; };
  // A finger kept on the robot past the platform's long press would start a text selection or callout, and Android then
  // cancels the touch, dropping the robot; the class turns selection off while a finger holds something.
  const holdCls = (on: boolean) => { document.documentElement.classList.toggle('robot-hold', on); };
  const onMenu = (e: Event) => { if (pend || g.press || g.carry) e.preventDefault(); };
  // losing focus mid-press is not a tap, so a trend still in place is let go rather than destroyed
  const onBlur = () => { dropPend(); holdCls(false); g.swallowClick = false; if (g.carry?.kind === 'trend' && !g.carry.moved) g.carry = null; pointerUp(g); };
  // The click that follows a press on the robot or the trend must not reach a link underneath.
  const onClick = (e: MouseEvent) => { if (g.swallowClick) { e.preventDefault(); e.stopPropagation(); g.swallowClick = false; } };
  const onTouchStart = (e: TouchEvent) => {
    g.lastTouch = performance.now(); g.pmX = -999; dropPend();
    const tch = e.touches[0];
    if (!tch || e.touches.length > 1 || onUi(e)) return;
    const p = { sx: tch.clientX, sy: tch.clientY };
    // a waiting agent or the boss takes the touch at once; a cancelled touchstart sends no click, so a pending swallow would eat the next tap
    if (pointerDown(g, p.sx, p.sy, false)) { e.preventDefault(); g.swallowClick = false; return; }
    if (onPage(e)) return;
    pend = p;
    pendTO = setTimeout(() => { pend = null; if (pointerDown(g, p.sx, p.sy, true, true)) holdCls(true); g.swallowClick = false; }, 220);
  };
  const onTouchMove = (e: TouchEvent) => {
    const tch = e.touches[0];
    if (!tch) return;
    if (pend) { if (Math.hypot(tch.clientX - pend.sx, tch.clientY - pend.sy) > 8) dropPend(); return; }
    if (!g.press && !g.carry) return;
    e.preventDefault(); pointerMove(g, tch.clientX, tch.clientY);
  };
  const onTouchEnd = (e: TouchEvent) => {
    // a lift before the hold hits the robot, destroys the trend or drops an agent, as a quick press and release would
    if (pend) { const p = pend; dropPend(); if (pointerDown(g, p.sx, p.sy)) { pointerUp(g); e.preventDefault(); g.swallowClick = false; } return; }
    // whatever the finger held is let go without a click on the page under it
    if (g.press || g.carry) e.preventDefault();
    holdCls(false); pointerUp(g);
  };
  const onOver = (e: MouseEvent) => {
    g.overPage = onPage(e);
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null; if (a) linkLine(g, a.href);
  };
  const onScroll = () => { g.scrollDY += scrollY - g.scrollY; g.scrollY = scrollY; g.wake(); };
  // A shrunk or rotated viewport must not leave it off-screen until its next wander.
  const onResize = () => {
    g.W = innerWidth; g.H = innerHeight; g.DS = dispScale(g.W); g.sizeFx(); g.homeTgt = null;
    g.pos.x = clamp(g.pos.x, 24, g.W - 24); g.pos.y = clamp(g.pos.y, 30, g.H - 30); g.prevX = g.pos.x; g.prevY = g.pos.y;
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseout', onMouseOut, { passive: true });
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp, { passive: true });
  window.addEventListener('blur', onBlur);
  window.addEventListener('click', onClick, true);
  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: false });
  window.addEventListener('touchcancel', onBlur, { passive: true });
  window.addEventListener('contextmenu', onMenu);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('mouseover', onOver, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseout', onMouseOut);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onBlur);
    window.removeEventListener('contextmenu', onMenu);
    dropPend(); holdCls(false);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('mouseover', onOver);
    window.removeEventListener('resize', onResize);
  };
}
