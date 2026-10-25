// What the robot and the visitor do: attacks, trends, input and hit reactions.
import { caughtTpl, dispScale, knockLines, missLines, pick, rand, stealLines, trends } from './config'
import { cursorHit, emit, explode, feedback, fireBeam, fxBurst } from './effects'
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
  if (g.knockT <= 0 && (!g.trend || g.angryT > 0) && recent && g.attackT <= 0 && g.beamAt <= 0) {
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

// ---- input + hit reactions ----
export function knockRobot(g: Game, dirx: number): void {
  g.knockT = 120; g.hitCD = 70; g.attackT = 0; g.beamAt = 0;
  g.kvx = Math.max(-7, Math.min(7, dirx)); g.kvy = -4; g.krot = 0;
  // The more it is knocked, the angrier it gets and the more it targets the visitor.
  g.angryT = Math.min(900, g.angryT + 240);
  emit(g, 16, 16); g.say(pick(knockLines)); feedback(g, g.pos.x, g.pos.y, 'POW!', '#0b6bcb');
  // Three knocks each within ~300 frames trigger the rage flash; angryT decays too fast to ever peak.
  g.knockStreak = (g.t - g.lastKnock < 300) ? g.knockStreak + 1 : 1;
  g.lastKnock = g.t;
  if (g.knockStreak >= 3) { g.rage(); g.knockStreak = 0; }
}

// Idle wandering target. Returns lerp.
export function idleTarget(g: Game): number {
  if (!g.homeTgt || --g.homeHold <= 0) { g.homeTgt = { x: g.W * 0.80 + rand(-g.W * 0.05, g.W * 0.05), y: g.H * 0.48 + rand(-g.H * 0.1, g.H * 0.1) }; g.homeHold = 220 + (rand(0, 260) | 0); }
  g.tgt.x = g.homeTgt.x; g.tgt.y = g.homeTgt.y;
  return 0.03;
}

// A tap or click on the trend destroys it, on the robot knocks it down.
export function tryTapHit(g: Game, x: number, y: number, e?: Event): boolean {
  if (g.trend && !g.trendEl.hidden) {
    const r = g.trendEl.getBoundingClientRect(), pad = g.coarse ? 16 : 12;
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      g.mouseX = x; g.mouseY = y; g.lastMove = g.t; humanGrab(g); return true;
    }
  }
  if (g.knockT <= 0 && g.hitCD <= 0 && Math.hypot(x - g.pos.x, y - g.pos.y) < 30 * g.scale * g.DS + g.tapPad) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    g.mouseX = x; g.mouseY = y; g.lastMove = g.t; knockRobot(g, (Math.random() - 0.5) * 9); return true;
  }
  return false;
}

// Binds every window listener and returns the function that removes them all.
export function bindInput(g: Game): () => void {
  const onMouseMove = (e: MouseEvent) => {
    const cx = e.clientX, cy = e.clientY;
    if (g.pmX > -900) {
      const sp = Math.hypot(cx - g.pmX, cy - g.pmY);
      if (sp > 26) {
        // fast swipe through the robot knocks it down
        if (g.knockT <= 0 && g.hitCD <= 0 && segDist(g.pos.x, g.pos.y, g.pmX, g.pmY, cx, cy) < (36 + 18 * g.scale) * g.DS) {
          g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; knockRobot(g, (cx - g.pmX) * 0.45);
        }
        // fast swipe through the trend destroys it
        else if (g.trend && !g.trendEl.hidden) {
          const r = g.trendEl.getBoundingClientRect();
          if (segDist(r.left + r.width / 2, r.top + r.height / 2, g.pmX, g.pmY, cx, cy) < Math.max(r.width, r.height) / 2 + 14) {
            g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; humanGrab(g);
          }
        }
      }
    }
    g.pmX = cx; g.pmY = cy; g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t;
  };
  const onMouseOut = (e: MouseEvent) => { if (!e.relatedTarget) g.lastMove = -999; };
  const onClick = (e: MouseEvent) => { tryTapHit(g, e.clientX, e.clientY, e); };
  // Swallows the touch only when it lands, so taps elsewhere still scroll and click.
  const onTouchStart = (e: TouchEvent) => {
    const tch = e.touches && e.touches[0];
    if (!tch) return;
    tryTapHit(g, tch.clientX, tch.clientY, e);
  };
  const onResize = () => { g.W = innerWidth; g.H = innerHeight; g.DS = dispScale(g.W); g.sizeFx(); };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseout', onMouseOut, { passive: true });
  window.addEventListener('click', onClick, true);
  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseout', onMouseOut);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('resize', onResize);
  };
}
