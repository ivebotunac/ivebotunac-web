// The fixed-timestep loop: frame() runs the 60Hz ticks, and each tick moves, poses and draws the robot.
import { CX, CY, HALF, MORPH, SECTION_LINES, col, pick, quips, recoverLines, respawnLines, scrollLines, sleepLines, vary } from './config'
import { drawRobot } from './robot'
import { CRITTERS, actAlpha, actLook, actTarget, copyPalette, drawCritter, gait, heft, linesFor, nextForm, pace, tickCritter } from './critters'
import { agentAt } from './team'
import { emit, magic, renderFx, renderSparks } from './effects'
import { chaseTarget, idleTarget, pet, resolveBeam, runAttack, scheduleAttack, shootAndCatch, spawnTrend, updateBullets, updateTrendMotion } from './actions'
import { calmHint, endCombo } from './guide'
import { drawQuest, flybyTarget, peekAt, tickQuest } from './quest'
import { bossAt, bossFighting, bossRobotTarget } from './boss'
import type { Game } from './core'
import type { Mode } from './types'

const STEP = 1000 / 60

// Runs as many 60Hz ticks as real time allows (at most 3), then reschedules until destroy() cancels it.
// A doze frame (timer, never in a hidden tab, where rAF pauses) runs one tick, so the nap plays slowed.
export function frame(g: Game, now: number): void {
  const max = g.idleTO === undefined ? 3 : 1
  g.idleTO = undefined
  g.acc += g.lastNow ? Math.min(100, now - g.lastNow) : STEP
  g.lastNow = now
  let n = 0
  while (g.acc >= STEP - 1.5 && n < max) { g.acc = Math.max(0, g.acc - STEP); tick(g); n++ }
  // below 20 fps the backlog is dropped, or it would replay later at triple speed
  if (n === max) g.acc = Math.min(g.acc, STEP)
  if (g.asleep && !document.hidden && g.bubble.hidden && !g.boss && !g.flyby && !g.peeks.length && !g.carry) g.idleTO = setTimeout(() => frame(g, performance.now()), 100)
  else g.raf = requestAnimationFrame(t => frame(g, t))
}

function respawn(g: Game): void {
  g.pos.x = g.W * 0.8; g.pos.y = g.H * 0.48; g.tgt.x = g.pos.x; g.tgt.y = g.pos.y; g.prevX = g.pos.x; g.prevY = g.pos.y
  g.scale = 1; g.scaleTarget = 1; g.krot = 0; g.kvx = 0; g.kvy = 0
  g.curForm = 'robot'; g.act = null; g.morphFlash = MORPH; magic(g)
  g.angryT = 300; g.say(g.afterRespawn || pick(respawnLines), 240); g.afterRespawn = ''
}

function drawPet(g: Game): void {
  const c = g.ctx
  c.clearRect(0, 0, 220, 220)
  if (g.gone > 0) return
  const mp = 1 - g.morphFlash / MORPH
  // poof: grow-in plus a bulge
  const pop = g.morphFlash > 0 ? 0.5 + 0.5 * mp + 0.14 * Math.sin(mp * Math.PI) : 1
  const S = g.size() * g.DS * pop
  // squash spring plus a nervous wobble while inflated
  const wob = g.puff * 0.05 * Math.sin(g.t * 0.5)
  const sx = 1 + g.sq + wob, sy = 1 - g.sq - wob
  const ox = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0, oy = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0
  c.save()
  c.globalAlpha = actAlpha(g)
  c.translate(CX + ox, CY + g.bob + oy); c.rotate(g.lean + g.krot); c.scale(g.dir * S * sx, S * sy); c.translate(-24, -24)
  if (g.act?.kind === 'copy') drawRobot(g.pxl, copyPalette(g.curForm, col), g.t, g.st, g.closed, g.moving)
  else if (!drawCritter(c, g.curForm, g.st, g.closed, g.moving, g.t)) drawRobot(g.pxl, col, g.t, g.st, g.closed, g.moving)
  c.restore()
  if (g.flash > 0) {
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = Math.min(1, g.flash / 4) * 0.8
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 220, 220)
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
  }
}

// Knocked down or thrown: falls by the form's heft, bounces off the floor and walls, then gets up.
function knockPhysics(g: Game): void {
  // a heavy form drops and lands with a thud, a light one drifts down
  const hf = heft(g)
  g.kvy += hf.grav; g.pos.x += g.kvx; g.pos.y += g.kvy; g.kvx *= hf.drag; if (hf.kind === 'light') g.kvy *= hf.drag
  const gnd = g.H - 30
  if (g.pos.y > gnd) {
    g.pos.y = gnd
    if (hf.kind === 'heavy' && g.kvy > 5) { g.shake = 8; emit(g, 10, 10); g.popups.push({ x: g.pos.x, y: g.pos.y - 20, text: 'THUD', life: 0, max: 40, c: '#5a6b7c', size: 14 }) }
    if (g.kvy > 1.6) { g.kick(Math.min(0.4, g.kvy * 0.035)); g.kvy *= hf.kind === 'heavy' ? -0.12 : -0.32 } else g.kvy = 0
    g.kvx *= 0.6
  }
  if (g.pos.y < 30) { g.pos.y = 30; g.kvy = Math.abs(g.kvy) * 0.5 }
  // side walls bounce it back, hard hits shake it
  if (g.pos.x < 24 || g.pos.x > g.W - 24) {
    g.pos.x = Math.max(24, Math.min(g.W - 24, g.pos.x))
    if (Math.abs(g.kvx) > 4) { g.kick(0.3); g.shake = 6; emit(g, 8, 10) }
    g.kvx *= -0.6
  }
  g.krot += (g.knockT > 72 ? 0.3 : (Math.PI / 2 - g.krot) * 0.12)
  if (--g.knockT === 0) { emit(g, 14, 14); if (g.combo < 3) g.say(pick(recoverLines), 200); g.kvy = -2.4 }
}

// Hand cursor over the robot or a teammate, fist while holding; a link or toggle under it keeps its own.
function updateCursor(g: Game): void {
  if (!g.coarse) {
    const live = g.t - g.lastMove < 600
    const over = live && !g.overPage && ((Math.hypot(g.mouseX - g.pos.x, g.mouseY - g.pos.y) < g.hitR() && actAlpha(g) >= 0.3) || !!agentAt(g, g.mouseX, g.mouseY))
    const cur = g.held || g.carry?.moved ? 'robot-grabbing' : (over ? 'robot-grab' : ((g.peeks.length && g.t - g.lastMove < 600 && peekAt(g, g.mouseX, g.mouseY)) || (g.boss && g.t - g.lastMove < 600 && bossAt(g, g.mouseX, g.mouseY)) ? 'robot-point' : ''))
    if (cur !== g.cursor) {
      const cl = document.documentElement.classList
      if (g.cursor) cl.remove(g.cursor)
      if (cur) cl.add(cur)
      g.cursor = cur
    }
  }
}

// Morphs go robot to critter and back; the only critter-to-critter step is an evolution.
// No robot-to-critter step during a fly-by, a waiting agent or a trend chase; the boss fights the robot.
function cycleForm(g: Game): void {
  g.formCD--
  if (g.boss && g.curForm !== 'robot') { g.morphTo('robot'); g.formCD = vary(540, 600) } else if (g.formCD <= 0 && g.knockT <= 0 && !g.held && !g.asleep) {
    if (g.curForm !== 'robot') {
      const nf = nextForm(g)
      g.morphTo(nf); g.formCD = nf === 'robot' ? vary(540, 600) : vary(420, 360)
    } else if (!g.boss && g.flyby <= 0 && !g.peeks.length && !g.trend) {
      g.morphTo(pick(CRITTERS)); g.formCD = vary(420, 360)
    }
  }
}

function talk(g: Game, mode: Mode): void {
  // A section seen for the first time queues its line.
  if (g.t % 30 === 0) {
    const s = g.getSection()
    if (s !== g.lastSection) { g.lastSection = s; if (!g.seenSections.has(s) && SECTION_LINES[s]) g.pendingSection = s }
  }
  // calm moments only: a tutorial hint first, then section lines, then a rare random quip
  if (mode !== 'knock' && mode !== 'attack' && mode !== 'held' && !g.asleep && !g.boss && g.bubble.hidden && g.t > g.bubbleUntil + 60) {
    // hints may interrupt a trend chase; section lines wait until the first hint has had its moment
    if (!calmHint(g) && !g.trend) {
      if (g.pendingSection && g.t > 720) {
        const s = g.pendingSection; g.pendingSection = ''; g.seenSections.add(s); g.say(pick(SECTION_LINES[s]!), 260)
      } else if (g.t > g.nextQuip && linesFor(g, 'idle')) {
        g.say(pick(linesFor(g, 'idle')!))
      } else if (g.t > g.nextQuip) {
        let j: number; do { j = (Math.random() * quips.length) | 0 } while (j === g.lastQuip && quips.length > 1)
        g.lastQuip = j; g.say(quips[j]!)
      }
    }
  }
  if (!g.bubble.hidden && g.t > g.bubbleUntil) g.bubble.hidden = true
}

// One 60Hz step of the game.
function tick(g: Game): void {
  // Hit-stop: the impact pose holds for a few ticks while it shakes and flashes.
  if (g.freeze > 0) { g.freeze--; if (g.flash > 0) g.flash--; if (g.shake > 0) g.shake--; drawPet(g); return }
  g.t++
  if (g.hitCD > 0) g.hitCD--
  if (g.jugCD > 0) g.jugCD--
  // anger does not drain while it is knocked down, so a single hit still ends in a counter-attack
  if (g.angryT > 0 && g.knockT <= 0) g.angryT--
  if (g.flash > 0) g.flash--
  if (g.shake > 0) g.shake--
  if (g.scrollCD > 0) g.scrollCD--
  if (g.linkCD > 0) g.linkCD--
  if (g.comboT > 0 && --g.comboT === 0) { endCombo(g); g.combo = 0 }
  if (g.puff > 0) { g.puff = Math.max(0, g.puff - 0.0012); if (g.puff < 0.4) g.puffSaid = false }
  const recent = (g.t - g.lastMove) < 90

  if (g.gone > 0) {
    if (--g.gone === 0) respawn(g)
    tickQuest(g); drawPet(g); renderFx(g, recent); drawQuest(g)
    return
  }

  if (!g.held && g.knockT <= 0 && g.t - g.petT < 8) pet(g)
  else if (g.petAcc > 0 && g.t - g.petT > 300) g.petAcc = 0

  // Falls asleep after a long stretch with no input, sooner at night.
  if (!g.asleep && g.t - g.lastInput > (g.night ? 900 : 1800) && g.knockT <= 0 && !g.held && !g.trend && g.attackT <= 0 && g.angryT <= 0 && g.puff < 0.05 && !g.boss) {
    g.asleep = true; g.say(pick(sleepLines), 200)
  }
  const calm = !g.asleep && !g.held

  // No trends while angry: the visitor is the target.
  if (calm && !g.boss && --g.trendCD <= 0 && !g.trend && g.knockT <= 0 && g.angryT <= 0) spawnTrend(g)
  updateTrendMotion(g)

  scheduleAttack(g, recent)

  let mode: Mode, lerp = 0.05
  if (g.held && g.press) mode = 'held'
  else if (g.knockT > 0) mode = 'knock'
  else if (g.flyby > 0) { mode = 'idle'; lerp = flybyTarget(g) } else if (bossFighting(g)) { mode = 'idle'; lerp = bossRobotTarget(g) } else if (g.trend && g.angryT <= 0) { mode = 'chase'; lerp = chaseTarget(g) } else if (g.attackT > 0) { mode = 'attack'; lerp = runAttack(g, recent) } else { mode = 'idle'; lerp = actTarget(g) ?? idleTarget(g) }
  if (mode !== 'held' && mode !== 'knock') lerp *= pace(g)

  if (mode === 'held') {
    g.pos.x = g.press!.x + g.press!.ox; g.pos.y = g.press!.y + g.press!.oy
    g.krot *= 0.8
  } else if (mode === 'knock') {
    knockPhysics(g)
  } else {
    g.pos.x += (g.tgt.x - g.pos.x) * lerp; g.pos.y += (g.tgt.y - g.pos.y) * lerp
    if (g.krot !== 0) { g.krot *= 0.7; if (Math.abs(g.krot) < 0.02) g.krot = 0 }
  }
  // The page scrolls under a fixed robot, so it lags a little behind and squashes.
  if (g.scrollDY !== 0) {
    if (mode !== 'held') { g.pos.y -= Math.max(-40, Math.min(40, g.scrollDY * 0.18)); g.kick(Math.min(0.12, Math.abs(g.scrollDY) * 0.002)) }
    if (Math.abs(g.scrollDY) > 140 && g.scrollCD <= 0 && mode === 'idle' && Math.random() < 0.35) { g.say(pick(scrollLines), 160); g.scrollCD = 900 }
    g.scrollDY = 0
  }
  const dx = g.pos.x - g.prevX, dy = g.pos.y - g.prevY; g.prevX = g.pos.x; g.prevY = g.pos.y
  const spd = Math.sqrt(dx * dx + dy * dy)
  if (mode === 'attack') g.dir = (g.mouseX < g.pos.x ? -1 : 1)
  else if (mode === 'chase') g.dir = (g.trend!.x < g.pos.x ? -1 : 1)
  else if (dx < -0.4) g.dir = -1; else if (dx > 0.4) g.dir = 1
  if (g.boss && mode === 'idle' && g.flyby <= 0 && Math.abs(dx) < 1.5) g.dir = g.boss.x < g.pos.x ? -1 : 1

  resolveBeam(g, recent)
  updateBullets(g, recent)
  shootAndCatch(g)

  // Slow grow or shrink, held for a while; not a pulse. Paused while inflated from hits.
  if (g.puff < 0.05 && --g.sizeCD <= 0) {
    const r = Math.random()
    g.scaleTarget = r < 0.45 ? 1 : (r < 0.68 ? 1.5 : (r < 0.86 ? 2 : (r < 0.96 ? 2.5 : 0.75)))
    g.sizeCD = vary(200, 320)
  }
  // charge-up while closing in
  const eff = g.scaleTarget + ((mode === 'attack' && g.atkPhase === 'approach' && !g.fired) ? 0.28 : 0)
  g.scale += (eff - g.scale) * 0.06
  if (g.scale > 2.5) g.scale = 2.5
  g.sqv += -g.sq * 0.28; g.sqv *= 0.72; g.sq = Math.max(-0.45, Math.min(0.45, g.sq + g.sqv))

  if (spd > 2.4 && g.t % 5 === 0) emit(g, 1, 6)
  if (g.asleep && g.t % 70 === 0) g.popups.push({ x: g.pos.x + 16, y: g.pos.y - 26 * g.size() * g.DS, text: 'z', life: 0, max: 80, c: '#93a8bc' })

  // Position only: size is drawn in-canvas so the pixel art never blurs.
  g.pet.style.transform = 'translate(' + (g.pos.x - HALF) + 'px,' + (g.pos.y - HALF) + 'px)'
  // A fixed gap above the robot's scaled top, so the bubble never overlaps it.
  g.bubble.style.bottom = (132 + 24 * g.size() * g.DS) + 'px'
  // Near the right edge the bubble shifts to stay on screen.
  if (!g.bubble.hidden) { const hw = g.bubble.offsetWidth / 2; g.bubble.style.marginLeft = (Math.max(8 + hw, Math.min(g.W - 8 - hw, g.pos.x)) - g.pos.x) + 'px' }
  updateCursor(g)

  g.bob = (mode === 'knock' || mode === 'held') ? 0 : Math.sin(g.t * (g.asleep ? 0.025 : 0.05)) * (spd > 1 ? 1.1 : 2)
  g.lean = mode === 'knock' ? 0 : (mode === 'held' ? Math.max(-0.5, Math.min(0.5, dx * 0.04)) : Math.max(-0.18, Math.min(0.18, dx * 0.02)))
  const gt = mode !== 'knock' && mode !== 'held' && !g.asleep ? gait(g, spd) : null
  if (gt) { g.bob = gt.bob; g.lean += gt.lean }
  cycleForm(g)
  if (g.morphFlash > 0) g.morphFlash--
  tickCritter(g, mode === 'idle' && g.flyby <= 0 && !g.boss && !g.trend && g.attackT <= 0 && !g.asleep)
  g.st = mode === 'knock' ? 'knock' : (mode === 'held' || g.angryT > 0 ? 'mad' : (mode === 'attack' || g.beamAt > 0 || bossFighting(g) ? 'attack' : (mode === 'chase' || g.flyby > 0 || g.t - g.petT < 30 ? 'happy' : 'idle')))
  g.closed = g.asleep || g.t % 200 < 7;
  ({ st: g.st, closed: g.closed } = actLook(g, g.st, g.closed))
  g.moving = spd > 1 && mode !== 'knock' && mode !== 'held'
  drawPet(g)

  tickQuest(g)
  renderSparks(g)
  renderFx(g, recent)
  drawQuest(g)

  talk(g, mode)
}
