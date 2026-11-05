// Particle factories plus the per-frame sparkle and fx-layer render passes.
import { BRAND, CX, CY, MONO, col, hitLines, pick } from './config'
import { scorchBusy } from './scorch'
import type { Game } from './core'

export function emit(g: Game, n: number, spread: number): void {
  if (g.sparks.length > 120) return;
  const spark = col.spark;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 1.2;
    g.sparks.push({ x: CX + (Math.random() - 0.5) * spread, y: CY + (Math.random() - 0.5) * spread, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, life: 0, max: 22 + Math.random() * 20, c: pick(spark) });
  }
}

export function fireBeam(g: Game, x1: number, y1: number, x2: number, y2: number, c?: string): void {
  if (g.fxc) g.beams.push({ x1, y1, x2, y2, life: 0, max: 10, c: c || '#ff5a1f' });
}

export function fxBurst(g: Game, x: number, y: number, n: number, c?: string): void {
  if (!g.fxc) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
    g.fxp.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 20 + Math.random() * 20, c: c || pick(col.spark) });
  }
}

// Every hit and destroy shares this: flash, shockwave ring and a floating label.
export function feedback(g: Game, x: number, y: number, text: string, c: string): void {
  fxBurst(g, x, y, 14, c);
  g.rings.push({ x, y, life: 0, max: 24, c });
  g.popups.push({ x, y, text, life: 0, max: 60, c });
}

// The AI lands a hit on the cursor.
export function cursorHit(g: Game, x: number, y: number, text?: string): void {
  g.say(pick(hitLines));
  feedback(g, x, y, text || 'HIT!', '#ff5a1f');
}

export function explode(g: Game, x: number, y: number): void {
  if (!g.fxc) return;
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
    g.debris.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, sz: 2 + (Math.random() * 5 | 0), c: BRAND[(Math.random() * BRAND.length) | 0] as string, life: 0, max: 240 + (Math.random() * 160 | 0), landed: false });
  }
}

export function magic(g: Game): void {
  emit(g, 30, 30);
  if (!g.fxc) return;
  fxBurst(g, g.pos.x, g.pos.y, 24, '#9b6bff');
  fxBurst(g, g.pos.x, g.pos.y, 16, '#36c6e0');
  fxBurst(g, g.pos.x, g.pos.y, 10, '#ffffff');
  g.rings.push({ x: g.pos.x, y: g.pos.y, life: 0, max: 30, c: '#9b6bff' });
  g.rings.push({ x: g.pos.x, y: g.pos.y, life: 0, max: 22, c: '#ffffff' });
}

// Drawn on the robot's own canvas, not the fx layer.
export function renderSparks(g: Game): void {
  const ctx = g.ctx;
  for (let i = g.sparks.length - 1; i >= 0; i--) {
    const p = g.sparks[i]!;
    p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.015;
    if (p.life >= p.max) { g.sparks.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.c;
    const s2 = p.life > p.max * 0.6 ? 1 : 2;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), s2, s2);
  }
  ctx.globalAlpha = 1;
}

// Screen-space layer: lasers, bursts, bullets, balls, debris, rings, popups; quest, team, boss draw after.
export function renderFx(g: Game, recent: boolean): void {
  const fxc = g.fxc; if (!fxc) return;
  const W = g.W, H = g.H;
  const anyFx = g.beams.length || g.fxp.length || g.bullets.length || g.balls.length || g.debris.length || g.rings.length || g.popups.length
    || g.team.length || g.peeks.length || g.confetti.length || g.boss || g.crew.shots.length || g.crew.rockets.length || g.crew.glyphs.length || scorchBusy();
  if (anyFx || g.fxActive) fxc.clearRect(0, 0, W, H);
  g.fxActive = !!anyFx;
  for (let b = g.beams.length - 1; b >= 0; b--) {
    const bm = g.beams[b]!;
    bm.life++;
    if (bm.life >= bm.max) { g.beams.splice(b, 1); continue; }
    const al = 1 - bm.life / bm.max;
    fxc.strokeStyle = bm.c; fxc.globalAlpha = al; fxc.lineWidth = 3;
    fxc.beginPath(); fxc.moveTo(bm.x1, bm.y1); fxc.lineTo(bm.x2, bm.y2); fxc.stroke();
    fxc.globalAlpha = al * 0.5; fxc.lineWidth = 1; fxc.stroke();
  }
  fxc.globalAlpha = 1;
  for (let m = 0; m < g.bullets.length; m++) {
    const bb = g.bullets[m]!;
    if (bb.glyph) {
      fxc.font = '700 14px ' + MONO; fxc.textAlign = 'center'; fxc.textBaseline = 'middle';
      fxc.fillStyle = bb.c ?? '#ff5a1f'; fxc.fillText(bb.glyph, Math.round(bb.x), Math.round(bb.y));
      fxc.textBaseline = 'alphabetic';
      continue;
    }
    fxc.fillStyle = '#ff5a1f'; fxc.fillRect(Math.round(bb.x) - 2, Math.round(bb.y) - 2, 4, 4);
    fxc.globalAlpha = 0.4; fxc.fillStyle = '#ffd9c7'; fxc.fillRect(Math.round(bb.x - bb.vx) - 1, Math.round(bb.y - bb.vy) - 1, 2, 2);
    fxc.globalAlpha = 1;
  }
  // Thrown balls arc under gravity, spin, and catch the cursor on contact.
  for (let z = g.balls.length - 1; z >= 0; z--) {
    const ba = g.balls[z]!;
    ba.vy += 0.12; ba.x += ba.vx; ba.y += ba.vy; ba.spin += ba.dspin; ba.life++;
    if (recent && Math.hypot(ba.x - g.mouseX, ba.y - g.mouseY) < 42) { cursorHit(g, g.mouseX, g.mouseY, 'GOTCHA!'); fxBurst(g, ba.x, ba.y, 18, '#ffffff'); g.balls.splice(z, 1); continue; }
    if (ba.life > ba.max || ba.x < -28 || ba.x > W + 28 || ba.y > H + 28) { fxBurst(g, ba.x, ba.y, 6, '#ff5a1f'); g.balls.splice(z, 1); continue; }
    // A data orb in the site palette: navy shell, orange ring, cyan core, a notch that shows the spin.
    fxc.save(); fxc.translate(Math.round(ba.x), Math.round(ba.y)); fxc.rotate(ba.spin);
    const R = 15;
    fxc.fillStyle = '#0c2236'; fxc.beginPath(); fxc.arc(0, 0, R, 0, Math.PI * 2); fxc.fill();
    fxc.strokeStyle = '#ff5a1f'; fxc.lineWidth = 3; fxc.beginPath(); fxc.arc(0, 0, R - 4, 0, Math.PI * 2); fxc.stroke();
    fxc.fillStyle = '#36c6e0'; fxc.beginPath(); fxc.arc(0, 0, 5, 0, Math.PI * 2); fxc.fill();
    fxc.fillStyle = '#ffffff'; fxc.fillRect(-2, -R + 1, 4, 5);
    fxc.restore();
  }
  for (let f = g.fxp.length - 1; f >= 0; f--) {
    const q = g.fxp[f]!;
    q.life++; q.x += q.vx; q.y += q.vy; q.vy += 0.04;
    if (q.life >= q.max) { g.fxp.splice(f, 1); continue; }
    fxc.globalAlpha = 1 - q.life / q.max; fxc.fillStyle = q.c;
    const qs = q.life > q.max * 0.6 ? 2 : 3;
    fxc.fillRect(Math.round(q.x), Math.round(q.y), qs, qs);
  }
  // Debris bursts out, falls, piles at the bottom, then fades.
  for (let d = g.debris.length - 1; d >= 0; d--) {
    const dd = g.debris[d]!;
    dd.life++;
    if (!dd.landed) {
      dd.vy += 0.35; dd.x += dd.vx; dd.y += dd.vy;
      if (dd.y >= H - dd.sz) { dd.y = H - dd.sz; dd.vy *= -0.32; dd.vx *= 0.6; if (Math.abs(dd.vy) < 1.1) { dd.landed = true; dd.vy = 0; dd.vx = 0; } }
    }
    if (dd.life >= dd.max) { g.debris.splice(d, 1); continue; }
    fxc.globalAlpha = dd.life > dd.max - 45 ? (dd.max - dd.life) / 45 : 1;
    fxc.fillStyle = dd.c; fxc.fillRect(Math.round(dd.x), Math.round(dd.y), dd.sz, dd.sz);
  }
  for (let gg = g.rings.length - 1; gg >= 0; gg--) {
    const rg = g.rings[gg]!;
    rg.life++;
    if (rg.life >= rg.max) { g.rings.splice(gg, 1); continue; }
    fxc.globalAlpha = (1 - rg.life / rg.max) * 0.85; fxc.strokeStyle = rg.c || '#0b6bcb'; fxc.lineWidth = 2;
    fxc.beginPath(); fxc.arc(rg.x, rg.y, 8 + rg.life * 2.4, 0, Math.PI * 2); fxc.stroke();
  }
  fxc.textAlign = 'center';
  for (let u = g.popups.length - 1; u >= 0; u--) {
    const pu = g.popups[u]!;
    pu.life++; pu.y -= 0.8;
    if (pu.life >= pu.max) { g.popups.splice(u, 1); continue; }
    fxc.font = '700 ' + (pu.size || 15) + 'px ' + MONO;
    fxc.globalAlpha = pu.life > pu.max - 26 ? (pu.max - pu.life) / 26 : 1;
    fxc.fillStyle = pu.c || '#0b6bcb'; fxc.fillText(pu.text, pu.x, pu.y);
  }
  fxc.globalAlpha = 1;
}
