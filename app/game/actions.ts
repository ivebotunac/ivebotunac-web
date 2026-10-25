// What the robot and the visitor do: attacks, trends, input and hit reactions.
import { COMBO_LINES, caughtTpl, dispScale, grabLines, knockLines, missLines, petLines, pick, puffLines, rand, stealLines, throwLines, trends } from './config'
import { cursorHit, emit, explode, feedback, fireBeam, fxBurst } from './effects'
import { learn, linkLine, onJuggle, onKnock, onPop } from './guide'
import type { Game } from './core'

export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let tt = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  tt = Math.max(0, Math.min(1, tt));
  return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy));
}

// ---- attacks ----
export function fireBullets(g: Game, txx: number, tyy: number, n: number): void {
  const ang = Math.atan2(tyy - g.pos.y, txx - g.pos.x);
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.14;
    g.bullets.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4, life: 0, max: 80 });
  }
}

// Only thrown while in a critter form.
export function throwBall(g: Game, tx: number, ty: number): void {
  const ang = Math.atan2(ty - g.pos.y, tx - g.pos.x), sp = 5;
  g.balls.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4, spin: 0, dspin: 0.34, life: 0, max: 72 });
}

// An attack run starts only while the cursor is moving; it never just trails the cursor.
export function scheduleAttack(g: Game, recent: boolean): void {
  if (g.knockT <= 0 && !g.held && !g.asleep &&(!g.trend || g.angryT > 0) && recent && g.attackT <= 0 && g.beamAt <= 0) {
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
  g.trend = { x: fromLeft ? -90 : g.W + 90, baseY: rand(110, Math.max(150, g.H - 200)), y: 0, vx: (fromLeft ? 1 : -1) * rand(1.2, 1.7), tt: 0, label: pick(trends), hits: 0 };
  g.trend.y = g.trend.baseY; g.trendEl.textContent = g.trend.label; g.trendEl.hidden = false;
}

export function clearTrend(g: Game): void {
  g.trend = null; g.trendEl.hidden = true; g.trendCD = 520 + (rand(0, 420) | 0);
}

export function humanGrab(g: Game): void {
  if (!g.trend) return;
  const tx = g.trend.x, ty = g.trend.y;
  g.say(pick(stealLines));
  explode(g, tx, ty); fxBurst(g, tx, ty, 18, '#ffffff');
  feedback(g, tx, ty, 'DESTROYED', '#0b6bcb');
  clearTrend(g); g.angryT = 260;
}

export function updateTrendMotion(g: Game): void {
  if (g.trend) {
    g.trend.tt++; g.trend.x += g.trend.vx; g.trend.y = g.trend.baseY + Math.sin(g.trend.tt * 0.04) * 32;
    g.trendEl.style.transform = 'translate(' + g.trend.x + 'px,' + g.trend.y + 'px)';
    if (g.trend.x < -150 || g.trend.x > g.W + 150) clearTrend(g);
  }
}

// Chase from behind, never on top. Only called with a trend and no anger. Returns lerp.
export function chaseTarget(g: Game): number {
  const trend = g.trend!;
  g.attackT = 0; g.beamAt = 0;
  const tw = g.trendEl.offsetWidth || 90;
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
    // Lets it fly about 4.5s, then catches it with a laser from behind.
    if (g.trend.tt > 280 && g.trend.hits >= 2) {
      const cx2 = g.trend.x, cy2 = g.trend.y;
      g.say(pick(caughtTpl) + g.trend.label + ' trend!'); fireBeam(g, g.pos.x, g.pos.y - 6, cx2, cy2, '#ff5a1f'); feedback(g, cx2, cy2, 'CAUGHT!', '#ff5a1f'); emit(g, 10, 12); clearTrend(g);
    }
  }
}

// ---- hits, combo and inflation ----
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Shared juice for every landed hit: hit-stop, flash, shake, squash, haptics, combo, inflation.
function impact(g: Game, freeze: number): void {
  g.freeze = freeze; g.flash = 6; g.shake = 9; g.kick(0.32); g.buzz(18);
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

export function knockRobot(g: Game, dirx: number): void {
  g.knockT = 120; g.hitCD = 20; g.attackT = 0; g.beamAt = 0;
  g.kvx = clamp(dirx, -7, 7); g.kvy = -4; g.krot = 0;
  // The more it is knocked, the angrier it gets and the more it targets the visitor.
  g.angryT = Math.min(900, g.angryT + 240);
  emit(g, 16, 16); g.say(pick(knockLines)); feedback(g, g.pos.x, g.pos.y, 'POW!', '#0b6bcb');
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
export function popRobot(g: Game): void {
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
}

// A slow cursor over the robot: hearts, and the anger and inflation drain away.
export function pet(g: Game): void {
  g.petAcc++; g.angryT = Math.max(0, g.angryT - 6); g.puff = Math.max(0, g.puff - 0.004);
  g.attackT = 0; g.attackCD = Math.max(g.attackCD, 120);
  if (g.petAcc % 22 === 1) g.popups.push({ x: g.pos.x + rand(-14, 14), y: g.pos.y - 24 * g.size() * g.DS, text: '♥', life: 0, max: 50, c: '#ff6fa3', size: 17 });
  if (g.petAcc === 90) { g.say(pick(petLines), 220); learn(g, 'pet'); }
}

// Idle wandering target, lower and slower while asleep. Returns lerp.
export function idleTarget(g: Game): number {
  if (!g.homeTgt || --g.homeHold <= 0) { g.homeTgt = { x: g.W * 0.80 + rand(-g.W * 0.05, g.W * 0.05), y: g.H * 0.48 + rand(-g.H * 0.1, g.H * 0.1) }; g.homeHold = 220 + (rand(0, 260) | 0); }
  g.tgt.x = g.homeTgt.x; g.tgt.y = g.asleep ? g.H * 0.62 : g.homeTgt.y;
  return g.asleep ? 0.015 : 0.03;
}

// ---- pointer: press hits at once, moving turns it into a grab, release throws ----
function pointerDown(g: Game, x: number, y: number): boolean {
  g.swallowClick = false; g.wake();
  if (g.gone > 0) return false;
  if (g.trend && !g.trendEl.hidden) {
    const r = g.trendEl.getBoundingClientRect(), pad = g.coarse ? 16 : 12;
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
      g.mouseX = x; g.mouseY = y; g.lastMove = g.t; humanGrab(g); g.swallowClick = true; return true;
    }
  }
  if (Math.hypot(x - g.pos.x, y - g.pos.y) >= g.hitR()) return false;
  g.mouseX = x; g.mouseY = y; g.lastMove = g.t;
  hitRobot(g, (g.pos.x - x) * 0.2 + (Math.random() - 0.5) * 6);
  if (g.gone <= 0) g.press = { sx: x, sy: y, x, y, ox: g.pos.x - x, oy: g.pos.y - y, t0: g.t, moved: false, hist: [{ x, y, ms: performance.now() }] };
  g.swallowClick = true;
  return true;
}

function pointerMove(g: Game, x: number, y: number): void {
  const p = g.press; if (!p) return;
  p.hist.push({ x, y, ms: performance.now() }); if (p.hist.length > 8) p.hist.shift();
  p.x = x; p.y = y;
  if (!g.held && Math.hypot(x - p.sx, y - p.sy) > 10) {
    p.moved = true; g.held = true; g.knockT = 0; g.kvx = 0; g.kvy = 0; g.attackT = 0; g.beamAt = 0;
    g.say(pick(grabLines), 160); g.kick(-0.25);
  }
}

// Throw velocity is the pointer's over its last ~90ms, in pixels per tick.
function pointerUp(g: Game): void {
  const p = g.press; g.press = null;
  if (!p || !g.held) return;
  g.held = false;
  const now = performance.now(), last = p.hist[p.hist.length - 1]!, first = p.hist.find(h => now - h.ms < 90) ?? last;
  const k = (1000 / 60) / Math.max(16, last.ms - first.ms);
  g.kvx = clamp((last.x - first.x) * k, -24, 24); g.kvy = clamp((last.y - first.y) * k, -24, 24);
  const sp = Math.hypot(g.kvx, g.kvy);
  g.knockT = (70 + Math.min(60, sp * 3)) | 0; g.krot = 0;
  learn(g, 'throw');
  if (sp > 9) {
    feedback(g, g.pos.x, g.pos.y, 'WHEEE!', '#0b6bcb'); g.say(pick(throwLines), 160);
    g.angryT = Math.min(900, g.angryT + 120); g.puff += 0.08;
    if (g.puff >= 1) popRobot(g);
  }
}

// Binds every window listener and returns the function that removes them all.
export function bindInput(g: Game): () => void {
  const onMouseMove = (e: MouseEvent) => {
    const cx = e.clientX, cy = e.clientY;
    g.wake();
    if (g.press) pointerMove(g, cx, cy);
    else if (g.pmX > -900 && g.gone <= 0) {
      const sp = Math.hypot(cx - g.pmX, cy - g.pmY);
      const canHit = g.knockT > 0 ? g.jugCD <= 0 : g.hitCD <= 0;
      if (sp > 26) {
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
    g.pmX = cx; g.pmY = cy; g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t;
  };
  const onMouseOut = (e: MouseEvent) => { if (!e.relatedTarget) g.lastMove = -999; };
  const onMouseDown = (e: MouseEvent) => { if (e.button === 0 && pointerDown(g, e.clientX, e.clientY)) e.preventDefault(); };
  const onMouseUp = () => { pointerUp(g); };
  // The click that follows a press on the robot or the trend must not reach a link underneath.
  const onClick = (e: MouseEvent) => { if (g.swallowClick) { e.preventDefault(); e.stopPropagation(); g.swallowClick = false; } };
  // Swallows the touch only when it lands, so taps elsewhere still scroll and click.
  const onTouchStart = (e: TouchEvent) => {
    const tch = e.touches[0];
    if (!tch || e.touches.length > 1) return;
    if (pointerDown(g, tch.clientX, tch.clientY)) e.preventDefault();
  };
  const onTouchMove = (e: TouchEvent) => {
    const tch = e.touches[0];
    if (!g.press || !tch) return;
    e.preventDefault(); pointerMove(g, tch.clientX, tch.clientY);
  };
  const onTouchEnd = () => { pointerUp(g); };
  const onOver = (e: MouseEvent) => { const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null; if (a) linkLine(g, a.href); };
  const onScroll = () => { g.scrollDY += scrollY - g.scrollY; g.scrollY = scrollY; g.wake(); };
  const onResize = () => { g.W = innerWidth; g.H = innerHeight; g.DS = dispScale(g.W); g.sizeFx(); };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseout', onMouseOut, { passive: true });
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp, { passive: true });
  window.addEventListener('blur', onMouseUp);
  window.addEventListener('click', onClick, true);
  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('mouseover', onOver, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseout', onMouseOut);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onMouseUp);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('mouseover', onOver);
    window.removeEventListener('resize', onResize);
  };
}
