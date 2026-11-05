// What the robot does: attacks, trends and hit reactions; the visitor's pointer input is in input.ts.
import { AGENT_TREND_LINES, CAUGHT_TPL, COMBO_LINES, CYAN, DEEP_BLUE, FETCH_BACK_LINES, INK, KNOCK_LINES, MISS_LINES, ORANGE, PET_LINES, PINK, PUFF_LINES, STEAL_LINES, TRENDS, WHITE, clamp, pick, rand, vary } from './config'
import { cursorHit, emit, explode, feedback, fireBeam, fxBurst } from './effects'
import { learn, onJuggle, onKnock, onPop } from './guide'
import { questPop } from './quest'
import { onTrendCaught } from './team'
import { attackStyle, heft, linesFor } from './critters'
import { track } from '~/utils/track'
import type { Game } from './core'

// A critter fires its own particle (embers, bubbles, leaves) instead of the robot's pellets.
function fireBullets(g: Game, txx: number, tyy: number, n: number): void {
  const ang = Math.atan2(tyy - g.pos.y, txx - g.pos.x), st = attackStyle(g)
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.14
    g.bullets.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4, life: 0, max: 80, glyph: st ? pick(st.t) : undefined, c: st?.c })
  }
}

// Only thrown while in a critter form.
function throwBall(g: Game, tx: number, ty: number): void {
  const ang = Math.atan2(ty - g.pos.y, tx - g.pos.x), sp = 5
  g.balls.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4, spin: 0, dspin: 0.34, life: 0, max: 72 })
}

// An attack run starts only while the cursor is moving; it never just trails the cursor.
export function scheduleAttack(g: Game, recent: boolean): void {
  if (g.knockT <= 0 && !g.held && !g.asleep && !g.boss && (!g.trend || g.angryT > 0) && recent && g.attackT <= 0 && g.beamAt <= 0) {
    if (g.attackCD > 0) g.attackCD--
    else {
      g.attackT = 1; g.atkPhase = 'approach'; g.atkTimer = 0; g.fired = false
      const rk = Math.random()
      if (g.curForm !== 'robot') g.attackKind = rk < 0.4 ? 'ball' : (rk < 0.62 ? 'bullets' : (rk < 0.82 ? 'beam' : 'melee'))
      else g.attackKind = rk < 0.45 ? 'bullets' : (rk < 0.78 ? 'beam' : 'melee')
    }
  }
}

// Approaches the cursor, fires, then heads home; returns the lerp rate toward the target.
export function runAttack(g: Game, recent: boolean): number {
  g.atkTimer++
  let lerp: number
  if (g.atkPhase === 'approach') {
    g.tgt.x = g.mouseX; g.tgt.y = g.mouseY; lerp = g.attackKind === 'melee' ? 0.1 : 0.07
    const dM = Math.hypot(g.pos.x - g.mouseX, g.pos.y - g.mouseY)
    if (!g.fired) {
      if (g.attackKind === 'melee') {
        if (dM < 40 || g.atkTimer > 110) { if (dM < 48 && recent) cursorHit(g, g.mouseX, g.mouseY, 'BONK!'); else if (Math.random() < 0.5) g.say(pick(MISS_LINES), 170); g.fired = true; g.atkPhase = 'return' }
      } else if (dM < 150 || g.atkTimer > 90) {
        if (g.attackKind === 'ball' && g.curForm !== 'robot') throwBall(g, g.mouseX, g.mouseY)
        else if (g.attackKind === 'bullets' || g.attackKind === 'ball') fireBullets(g, g.mouseX, g.mouseY, 3)
        else { g.lockX = g.mouseX; g.lockY = g.mouseY; g.beamAt = g.t + 9 }
        g.fired = true; g.atkPhase = 'return'
      }
    }
  } else {
    g.tgt.x = g.W * 0.80; g.tgt.y = g.H * 0.5; lerp = 0.05
    if (Math.hypot(g.pos.x - g.tgt.x, g.pos.y - g.tgt.y) < 36 || g.atkTimer > 280) { g.attackT = 0; g.attackCD = vary(g.angryT > 0 ? 80 : 300, g.angryT > 0 ? 80 : 260) }
  }
  return lerp
}

// The laser fires 9 ticks after it locks on; that delay is the visitor's window to dodge.
export function resolveBeam(g: Game, recent: boolean): void {
  if (g.beamAt > 0 && g.t >= g.beamAt) {
    const c = attackStyle(g)?.c ?? ORANGE
    fireBeam(g, g.pos.x, g.pos.y, g.lockX, g.lockY, c); fxBurst(g, g.lockX, g.lockY, 12, c)
    if (Math.hypot(g.mouseX - g.lockX, g.mouseY - g.lockY) < 46 && recent) { cursorHit(g, g.mouseX, g.mouseY) } else if (Math.random() < 0.5) g.say(pick(MISS_LINES), 170)
    g.beamAt = 0
  }
}

export function updateBullets(g: Game, recent: boolean): void {
  for (let k = g.bullets.length - 1; k >= 0; k--) {
    const bu = g.bullets[k]!
    bu.x += bu.vx; bu.y += bu.vy; bu.life++
    const hit = recent && Math.hypot(bu.x - g.mouseX, bu.y - g.mouseY) < 24
    if (hit) { cursorHit(g, g.mouseX, g.mouseY); g.bullets.splice(k, 1); continue }
    if (bu.life > bu.max || bu.x < -20 || bu.x > g.W + 20 || bu.y < -20 || bu.y > g.H + 20) g.bullets.splice(k, 1)
  }
}

// Trends: the flying AI-trend tags.
export function spawnTrend(g: Game): void {
  const fromLeft = Math.random() < 0.5
  g.trend = { x: fromLeft ? -90 : g.W + 90, baseY: rand(110, Math.max(150, g.H - 200)), y: 0, vx: (fromLeft ? 1 : -1) * rand(1.2, 1.7), tt: 0, label: pick(TRENDS), hits: 0, held: false, fvx: 0, fvy: 0 }
  g.trend.y = g.trend.baseY; g.trendEl.textContent = g.trend.label; g.trendEl.hidden = false
}

export function clearTrend(g: Game): void {
  if (g.carry?.kind === 'trend') g.carry = null
  g.fetch = 0
  g.trend = null; g.trendEl.hidden = true; g.trendCD = vary(520, 420)
}

export function humanGrab(g: Game): void {
  if (!g.trend) return
  const tx = g.trend.x, ty = g.trend.y
  g.say(pick(STEAL_LINES))
  explode(g, tx, ty); fxBurst(g, tx, ty, 18, WHITE)
  feedback(g, tx, ty, 'DESTROYED', DEEP_BLUE)
  clearTrend(g); g.angryT = 260
}

// A thrown agent knocks the tag out of the air; no anger, since the team took it, not the visitor.
export function knockTrend(g: Game, role: string): void {
  if (!g.trend) return
  const tx = g.trend.x, ty = g.trend.y
  explode(g, tx, ty); fxBurst(g, tx, ty, 14, CYAN); feedback(g, tx, ty, 'KNOCKED OUT', CYAN)
  if (g.gone <= 0 && !g.held) g.say(pick(AGENT_TREND_LINES).replace('{r}', role), 200)
  clearTrend(g)
}

// A dragged tag sits where the hand puts it; a thrown one carries the throw, then eases into its cruise.
export function updateTrendMotion(g: Game): void {
  const tr = g.trend
  if (!tr) return
  tr.tt++
  if (g.fetch && (++g.fetchT > 900 || g.angryT > 0 || g.held || g.knockT > 0 || g.gone > 0 || g.asleep || g.boss || tr.held)) {
    // a tag dropped from its mouth cruises on from where it hung
    if (g.fetch === 2) tr.baseY = tr.y - Math.sin(tr.tt * 0.04) * 32
    g.fetch = 0
  }
  if (g.fetch === 2) {
    // carried in its mouth: the tag hangs just under the robot until it is dropped
    tr.x = g.pos.x - (g.trendEl.offsetWidth || 90) / 2; tr.y = g.pos.y + 10 * g.size() * g.displayScale; tr.fvx = 0; tr.fvy = 0
  } else if (!tr.held) {
    tr.x += tr.vx + tr.fvx; tr.fvx *= 0.95
    tr.baseY = clamp(tr.baseY + tr.fvy, 40, Math.max(60, g.H - 60)); tr.fvy *= 0.95
    tr.y = tr.baseY + Math.sin(tr.tt * 0.04) * 32
  }
  g.trendEl.style.transform = 'translate(' + tr.x + 'px,' + tr.y + 'px)'
  if (!tr.held && (tr.x < -150 || tr.x > g.W + 150)) clearTrend(g)
}

// Chases the trend tag from behind, or keeps a distance from a held one, never on top; returns the lerp rate.
// Called only while there is a trend and the robot is not angry.
export function chaseTarget(g: Game): number {
  const trend = g.trend!
  g.attackT = 0; g.beamAt = 0
  const tw = g.trendEl.offsetWidth || 90
  if (g.fetch) return fetchTarget(g, trend, tw)
  if (trend.held) {
    const cx = trend.x + tw / 2, cy = trend.y + 12, a = Math.atan2(g.pos.y - cy, g.pos.x - cx)
    g.tgt.x = clamp(cx + Math.cos(a) * (tw / 2 + 50), 40, g.W - 40)
    g.tgt.y = clamp(cy + Math.sin(a) * 60, 60, g.H - 60)
    return 0.08
  }
  const behindX = trend.vx > 0 ? (trend.x - 100) : (trend.x + tw + 60)
  g.tgt.x = Math.max(40, Math.min(g.W - 40, behindX))
  g.tgt.y = Math.max(60, Math.min(g.H - 60, trend.y + 6))
  return 0.08
}

// Fetch: run to the thrown tag, carry it back beside the cursor and drop it for another throw.
function fetchTarget(g: Game, tr: NonNullable<Game['trend']>, tw: number): number {
  if (g.fetch === 1) {
    const cx = tr.x + tw / 2, cy = tr.y + 12
    g.tgt.x = clamp(cx, 40, g.W - 40); g.tgt.y = clamp(cy - 10, 60, g.H - 60)
    if (Math.hypot(g.pos.x - cx, g.pos.y - cy) < 40) { g.fetch = 2; g.fetchT = 0; g.kick(0.3); feedback(g, cx, cy, 'GOT IT', CYAN) }
    return 0.11
  }
  const side = g.pos.x < g.mouseX ? -1 : 1
  g.tgt.x = clamp(g.mouseX + side * 80, 40, g.W - 40); g.tgt.y = clamp(g.mouseY, 60, g.H - 60)
  if (Math.hypot(g.pos.x - g.tgt.x, g.pos.y - g.tgt.y) < 30 || g.fetchT > 420) {
    // dropped as a fresh tag: the bob and catch clock restart, so there is time to throw again
    g.fetch = 0; tr.tt = 0; tr.hits = 0; tr.baseY = tr.y
    g.kick(0.35); g.say(pick(FETCH_BACK_LINES), 160); feedback(g, g.pos.x, g.pos.y - 20, 'FETCH!', DEEP_BLUE)
    for (let i = 0; i < 3; i++) g.popups.push({ x: g.pos.x + rand(-16, 16), y: g.pos.y - 26 * g.size() * g.displayScale, text: '♥', life: -i * 8, max: 50, c: PINK, size: 15 })
  }
  return 0.09
}

export function shootAndCatch(g: Game): void {
  if (g.trend && g.angryT <= 0 && !g.fetch) {
    const central = g.trend.x > 70 && g.trend.x < g.W - 70
    const dT = Math.hypot(g.pos.x - g.trend.x, g.pos.y - g.trend.y)
    if (g.fireCD > 0) g.fireCD--
    if (central && dT < 320 && g.fireCD <= 0) { fireBeam(g, g.pos.x, g.pos.y - 6, g.trend.x, g.trend.y, CYAN); fxBurst(g, g.trend.x, g.trend.y, 5, CYAN); g.fireCD = 18; g.trend.hits++ }
    // Laser-caught after about 4.7 s of flight and two hits; never from the visitor's hand or mid-throw.
    if (g.trend.tt > 280 && g.trend.hits >= 2 && !g.trend.held && Math.hypot(g.trend.fvx, g.trend.fvy) < 1) {
      const cx2 = g.trend.x, cy2 = g.trend.y
      g.say(pick(CAUGHT_TPL) + g.trend.label + ' trend!'); fireBeam(g, g.pos.x, g.pos.y - 6, cx2, cy2, ORANGE); feedback(g, cx2, cy2, 'CAUGHT!', ORANGE); emit(g, 10, 12); onTrendCaught(g); clearTrend(g)
    }
  }
}

// Shared feedback for every landed hit: hit-stop, flash, shake, squash, haptics, combo, inflation.
function impact(g: Game, freeze: number): void {
  g.freeze = freeze; g.flash = 6; g.shake = 9; g.kick(0.32); g.buzz(18)
  if (!g.hitTracked && track('game_hit')) g.hitTracked = true
  g.combo++; g.comboT = 150
  // Every hit inflates it from normal size; random growth waits until it deflates.
  if (g.combo === 1) g.scaleTarget = 1
  g.puff += 0.1 + Math.min(g.combo, 10) * 0.008
  if (g.combo >= 2) g.popups.push({ x: g.pos.x, y: g.pos.y - 30 * g.size() * g.displayScale, text: g.combo + 'x COMBO', life: 0, max: 50, c: ORANGE, size: 15 + Math.min(g.combo, 12) })
  const line = COMBO_LINES[g.combo]
  if (line) g.say(line, 200)
  else if (g.puff > 0.55 && !g.puffSaid) { g.puffSaid = true; g.say(pick(PUFF_LINES), 180) }
  if (g.puff >= 1) popRobot(g)
}

function knockRobot(g: Game, dirx: number): void {
  g.knockT = 120; g.hitCD = 20; g.attackT = 0; g.beamAt = 0
  const hf = heft(g)
  g.knockVx = clamp(dirx, -7, 7) * hf.fling; g.knockVy = -4 * Math.min(1, hf.fling); g.knockRot = 0
  // The more it is knocked, the angrier it gets and the more it targets the visitor.
  g.angryT = Math.min(900, g.angryT + 240); g.attackCD = Math.min(g.attackCD, 30)
  emit(g, 16, 16); g.say(pick(linesFor(g, 'hit') ?? KNOCK_LINES)); feedback(g, g.pos.x, g.pos.y, 'POW!', DEEP_BLUE)
  impact(g, 5)
  if (g.gone <= 0) onKnock(g)
}

// A hit while it is still in the air bounces it back up and keeps the combo going.
export function juggle(g: Game, dirx: number): void {
  g.knockVy = -7 - Math.min(g.combo, 8) * 0.35; g.knockVx = clamp(g.knockVx * 0.5 + dirx, -8, 8)
  g.knockT = Math.max(g.knockT, 110); g.juggleCD = 5; g.angryT = Math.min(900, g.angryT + 60)
  emit(g, 10, 14); fxBurst(g, g.pos.x, g.pos.y, 10, WHITE)
  g.rings.push({ x: g.pos.x, y: g.pos.y, life: 0, max: 20, c: DEEP_BLUE })
  impact(g, 3)
  // stretch on the way up, after the impact squash
  g.squashV = -0.3
  if (g.gone <= 0) onJuggle(g)
}

export function hitRobot(g: Game, dirx: number): void {
  if (g.knockT > 0) { if (g.juggleCD <= 0) juggle(g, dirx) } else if (g.hitCD <= 0) knockRobot(g, dirx)
}

// Inflated past its limit: bursts into debris, the screen flashes, and it respawns a moment later.
export function popRobot(g: Game): void {
  onPop(g)
  const x = g.pos.x, y = g.pos.y
  explode(g, x, y); explode(g, x, y); fxBurst(g, x, y, 30, ORANGE); fxBurst(g, x, y, 20, WHITE)
  g.rings.push({ x, y, life: 0, max: 34, c: ORANGE }, { x, y, life: 0, max: 26, c: INK })
  g.popups.push({ x, y, text: 'POP!', life: 0, max: 70, c: ORANGE, size: 28 })
  g.rage(); g.buzz([40, 30, 80])
  g.gone = 110; g.freeze = 0; g.puff = 0; g.puffSaid = false; g.combo = 0; g.comboT = 0
  g.knockT = 0; g.held = false; g.press = null; g.attackT = 0; g.beamAt = 0
  g.bubble.hidden = true; g.sparks.length = 0
  if (g.trend) clearTrend(g)
  track('game_pop')
  questPop(g, x, y)
}

// A slow cursor over the robot: hearts, and the anger and inflation drain away.
export function pet(g: Game): void {
  g.petAcc++; g.angryT = Math.max(0, g.angryT - 6); g.puff = Math.max(0, g.puff - 0.004)
  g.attackT = 0; g.attackCD = Math.max(g.attackCD, 120)
  if (g.petAcc % 22 === 1) g.popups.push({ x: g.pos.x + rand(-14, 14), y: g.pos.y - 24 * g.size() * g.displayScale, text: '♥', life: 0, max: 50, c: PINK, size: 17 })
  if (g.petAcc === 90) { g.say(pick(linesFor(g, 'pet') ?? PET_LINES), 220); learn(g, 'pet') }
}

// Picks an idle wandering target, lower and slower while asleep; returns the lerp rate.
export function idleTarget(g: Game): number {
  if (!g.homeTgt || --g.homeHold <= 0) { g.homeTgt = { x: g.W * 0.80 + rand(-g.W * 0.05, g.W * 0.05), y: g.H * 0.48 + rand(-g.H * 0.1, g.H * 0.1) }; g.homeHold = vary(220, 260) }
  g.tgt.x = g.homeTgt.x; g.tgt.y = g.asleep ? g.H * 0.62 : g.homeTgt.y
  return g.asleep ? 0.015 : 0.03
}
