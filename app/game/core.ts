// The orchestrator: one Game owns all state and element refs; frame() steps it at a fixed 60 ticks a second.
import { CRITTERS, CX, CY, FORM_LINE, HALF, MAX_SIZE, MORPH, SECTION_LINES, U, col, dispScale, pick, quips, rand, recoverLines, respawnLines, scrollLines, sleepLines, wakeLines } from './config'
import type { FormName, Mood } from './config'
import { draw } from './forms'
import type { Pxl } from './forms'
import { emit, magic, renderFx, renderSparks } from './effects'
import { bindInput, chaseTarget, idleTarget, pet, resolveBeam, runAttack, scheduleAttack, shootAndCatch, spawnTrend, updateBullets, updateTrendMotion } from './actions'
import { calmHint, endCombo, loadMemory } from './guide'
import type { Memory, Skill } from './guide'
import type { AttackKind, AttackPhase, Ball, Beam, Bullet, Debris, GameRefs, Mode, Point, Popup, Press, Ring, Spark, Trend } from './types'

const STEP = 1000 / 60

export class Game {
  // element refs
  pet: HTMLElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  bubble: HTMLElement
  trendEl: HTMLElement
  fx: HTMLCanvasElement
  fxc: CanvasRenderingContext2D | null
  rageEl: HTMLElement
  rageTO: ReturnType<typeof setTimeout> | undefined = undefined
  pxl: Pxl
  getSection: () => string
  raf = 0
  unbind: (() => void) | null = null
  // fixed timestep, so the speed does not follow the display's refresh rate
  lastNow = 0
  acc = 0

  // viewport
  W = innerWidth
  H = innerHeight
  DS = dispScale(this.W)
  // touch gets bigger tap targets
  coarse = !!(typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  tapPad = this.coarse ? 18 : 8

  // motion
  pos: Point = { x: this.W * 0.8, y: this.H * 0.48 }
  tgt: Point = { x: this.pos.x, y: this.pos.y }
  prevX = this.pos.x
  prevY = this.pos.y
  dir = 1
  mouseX = -999
  mouseY = -999
  lastMove = -999
  pmX = -999
  pmY = -999
  t = 0
  // particles + flags
  sparks: Spark[] = []
  beams: Beam[] = []
  fxp: Spark[] = []
  bullets: Bullet[] = []
  balls: Ball[] = []
  debris: Debris[] = []
  rings: Ring[] = []
  popups: Popup[] = []
  fxActive = false
  fireCD = 0
  // bubble / quips
  bubbleUntil = 0
  // random quips are rare, about every 20 to 35 s; reactive lines carry the game
  nextQuip = 1500
  lastQuip = -1
  // tutorial and the visitor's own memory
  mem: Memory = loadMemory()
  hintSaid: Partial<Record<Skill, number>> = {}
  hintAt = -9999
  greeted = false
  linkCD = 0
  linksSeen = new Set<string>()
  cursor = ''
  // home / trend / size
  homeTgt: Point | null = null
  homeHold = 0
  trend: Trend | null = null
  trendCD = 220
  scale = 1
  scaleTarget = 1
  sizeCD = 120
  // attack
  attackT = 0
  attackCD = 200
  attackKind: AttackKind = 'bullets'
  beamAt = 0
  lockX = 0
  lockY = 0
  atkPhase: AttackPhase = 'approach'
  atkTimer = 0
  fired = false
  // knock / anger
  krot = 0
  kvx = 0
  kvy = 0
  knockT = 0
  hitCD = 0
  jugCD = 0
  angryT = 0
  // hit juice: hit-stop ticks, white flash, shake, squash spring
  freeze = 0
  flash = 0
  shake = 0
  sq = 0
  sqv = 0
  // combo and inflation; at puff 1 it pops and is gone for `gone` ticks
  combo = 0
  comboT = 0
  puff = 0
  puffSaid = false
  gone = 0
  // grab and throw
  press: Press | null = null
  held = false
  swallowClick = false
  // petting, sleep, scroll, sections
  petT = -999
  petAcc = 0
  lastInput = 0
  asleep = false
  night = (() => { const h = new Date().getHours(); return h >= 22 || h < 6 })()
  scrollY = scrollY
  scrollDY = 0
  scrollCD = 0
  lastSection = ''
  pendingSection = ''
  seenSections = new Set<string>()
  // the robot is the true form; magic morphs robot to critter and back
  curForm: FormName = 'robot'
  morphFlash = 0
  formCD = 300 + (rand(0, 240) | 0)
  // last pose, redrawn unchanged during hit-stop
  st: Mood = 'idle'
  bob = 0
  lean = 0
  moving = false
  closed = false

  constructor(refs: GameRefs, ctx: CanvasRenderingContext2D, getSection: () => string) {
    this.pet = refs.pet
    this.canvas = refs.canvas
    this.ctx = ctx
    this.bubble = refs.bubble
    this.trendEl = refs.trend
    this.fx = refs.fx
    this.fxc = refs.fx.getContext('2d')
    this.rageEl = refs.rage
    this.getSection = getSection
    this.pxl = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * U), Math.round(y * U), Math.ceil(w * U), Math.ceil(h * U)); }
    this.sizeFx()
  }

  sizeFx(): void {
    this.fx.width = this.W; this.fx.height = this.H;
  }

  start(): void {
    this.unbind = bindInput(this)
    this.raf = requestAnimationFrame(now => frame(this, now))
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.unbind?.()
    this.unbind = null
    clearTimeout(this.rageTO)
    this.rageEl.classList.remove('rage--on')
    document.documentElement.classList.remove('robot-grab', 'robot-grabbing')
  }

  // Drawn size: the random growth plus inflation from hits.
  size(): number {
    return Math.min(MAX_SIZE, this.scale + this.puff * 1.3)
  }

  hitR(): number {
    return 30 * this.size() * this.DS + this.tapPad
  }

  kick(amt: number): void {
    this.sqv += amt
  }

  // Haptics on touch devices; iOS Safari has no vibrate and ignores it.
  buzz(pattern: number | number[]): void {
    if (!this.coarse || typeof navigator.vibrate !== 'function') return
    try { navigator.vibrate(pattern) } catch { /* blocked without a user gesture */ }
  }

  wake(): void {
    this.lastInput = this.t
    if (this.asleep) { this.asleep = false; this.say(pick(wakeLines), 180) }
  }

  // Peak-anger screen flash: orange tint and faint blur over the whole viewport.
  rage(): void {
    const el = this.rageEl;
    el.classList.remove('rage--on');
    // reflow restarts the animation when re-triggered
    void el.offsetWidth;
    el.classList.add('rage--on');
    clearTimeout(this.rageTO);
    this.rageTO = setTimeout(() => { el.classList.remove('rage--on'); }, 2600);
  }

  say(txt: string, dur?: number): void {
    this.bubble.textContent = txt; this.bubble.hidden = false;
    this.bubbleUntil = this.t + (dur || 280); this.nextQuip = this.bubbleUntil + 1200 + (rand(0, 900) | 0);
  }

  morphTo(f: FormName): void {
    this.curForm = f; this.morphFlash = MORPH; magic(this);
    if (FORM_LINE[f] && this.knockT <= 0 && this.attackT <= 0 && !this.trend) this.say(pick(FORM_LINE[f]), 240);
  }
}

// Runs as many 60Hz ticks as real time allows (at most 3), then reschedules until destroy() cancels it.
function frame(g: Game, now: number): void {
  g.acc += g.lastNow ? Math.min(100, now - g.lastNow) : STEP;
  g.lastNow = now;
  let n = 0;
  while (g.acc >= STEP - 1.5 && n < 3) { g.acc = Math.max(0, g.acc - STEP); tick(g); n++; }
  g.raf = requestAnimationFrame(t => frame(g, t));
}

function respawn(g: Game): void {
  g.pos.x = g.W * 0.8; g.pos.y = g.H * 0.48; g.tgt.x = g.pos.x; g.tgt.y = g.pos.y; g.prevX = g.pos.x; g.prevY = g.pos.y;
  g.scale = 1; g.scaleTarget = 1; g.krot = 0; g.kvx = 0; g.kvy = 0;
  g.curForm = 'robot'; g.morphFlash = MORPH; magic(g);
  g.angryT = 300; g.say(pick(respawnLines), 240);
}

function drawPet(g: Game): void {
  const c = g.ctx;
  c.clearRect(0, 0, 220, 220);
  if (g.gone > 0) return;
  const mp = 1 - g.morphFlash / MORPH;
  // poof: grow-in plus a bulge
  const pop = g.morphFlash > 0 ? 0.5 + 0.5 * mp + 0.14 * Math.sin(mp * Math.PI) : 1;
  const S = g.size() * g.DS * pop;
  // squash spring plus a nervous wobble while inflated
  const wob = g.puff * 0.05 * Math.sin(g.t * 0.5);
  const sx = 1 + g.sq + wob, sy = 1 - g.sq - wob;
  const ox = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0, oy = g.shake > 0 ? (Math.random() - 0.5) * g.shake : 0;
  c.save();
  c.translate(CX + ox, CY + g.bob + oy); c.rotate(g.lean + g.krot); c.scale(g.dir * S * sx, S * sy); c.translate(-24, -24);
  draw(g.pxl, col, g.t, g.curForm, g.st, g.closed, g.moving);
  c.restore();
  if (g.flash > 0) {
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = Math.min(1, g.flash / 4) * 0.8;
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 220, 220);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
}

// One 60Hz step of the game.
function tick(g: Game): void {
  // Hit-stop: the impact pose holds for a few ticks while it shakes and flashes.
  if (g.freeze > 0) { g.freeze--; if (g.flash > 0) g.flash--; if (g.shake > 0) g.shake--; drawPet(g); return; }
  g.t++;
  if (g.hitCD > 0) g.hitCD--;
  if (g.jugCD > 0) g.jugCD--;
  if (g.angryT > 0) g.angryT--;
  if (g.flash > 0) g.flash--;
  if (g.shake > 0) g.shake--;
  if (g.scrollCD > 0) g.scrollCD--;
  if (g.linkCD > 0) g.linkCD--;
  if (g.comboT > 0 && --g.comboT === 0) { endCombo(g); g.combo = 0; }
  if (g.puff > 0) { g.puff = Math.max(0, g.puff - 0.0012); if (g.puff < 0.4) g.puffSaid = false; }
  const recent = (g.t - g.lastMove) < 90;

  if (g.gone > 0) {
    if (--g.gone === 0) respawn(g);
    drawPet(g); renderFx(g, recent);
    return;
  }

  if (!g.held && g.knockT <= 0 && g.t - g.petT < 8) pet(g);
  else if (g.petAcc > 0 && g.t - g.petT > 300) g.petAcc = 0;

  // Falls asleep after a long stretch with no input, sooner at night.
  if (!g.asleep && g.t - g.lastInput > (g.night ? 900 : 1800) && g.knockT <= 0 && !g.held && !g.trend && g.attackT <= 0 && g.angryT <= 0 && g.puff < 0.05) {
    g.asleep = true; g.say(pick(sleepLines), 200);
  }
  const calm = !g.asleep && !g.held;

  // No trends while angry: the visitor is the target.
  if (calm && --g.trendCD <= 0 && !g.trend && g.knockT <= 0 && g.angryT <= 0) spawnTrend(g);
  updateTrendMotion(g);

  scheduleAttack(g, recent);

  let mode: Mode, lerp = 0.05;
  if (g.held && g.press) mode = 'held';
  else if (g.knockT > 0) mode = 'knock';
  else if (g.trend && g.angryT <= 0) { mode = 'chase'; lerp = chaseTarget(g); }
  else if (g.attackT > 0) { mode = 'attack'; lerp = runAttack(g, recent); }
  else { mode = 'idle'; lerp = idleTarget(g); }

  if (mode === 'held') {
    g.pos.x = g.press!.x + g.press!.ox; g.pos.y = g.press!.y + g.press!.oy;
    g.krot *= 0.8;
  } else if (mode === 'knock') {
    g.kvy += 0.45; g.pos.x += g.kvx; g.pos.y += g.kvy; g.kvx *= 0.985;
    const gnd = g.H - 30;
    if (g.pos.y > gnd) { g.pos.y = gnd; if (g.kvy > 1.6) { g.kick(Math.min(0.4, g.kvy * 0.035)); g.kvy *= -0.32; } else g.kvy = 0; g.kvx *= 0.6; }
    if (g.pos.y < 30) { g.pos.y = 30; g.kvy = Math.abs(g.kvy) * 0.5; }
    // side walls bounce it back, hard hits shake it
    if (g.pos.x < 24 || g.pos.x > g.W - 24) {
      g.pos.x = Math.max(24, Math.min(g.W - 24, g.pos.x));
      if (Math.abs(g.kvx) > 4) { g.kick(0.3); g.shake = 6; emit(g, 8, 10); }
      g.kvx *= -0.6;
    }
    g.krot += (g.knockT > 72 ? 0.3 : (Math.PI / 2 - g.krot) * 0.12);
    if (--g.knockT === 0) { emit(g, 14, 14); if (g.combo < 3) g.say(pick(recoverLines), 200); g.kvy = -2.4; }
  } else {
    g.pos.x += (g.tgt.x - g.pos.x) * lerp; g.pos.y += (g.tgt.y - g.pos.y) * lerp;
    if (g.krot !== 0) { g.krot *= 0.7; if (Math.abs(g.krot) < 0.02) g.krot = 0; }
  }
  // The page scrolls under a fixed robot, so it lags a little behind and squashes.
  if (g.scrollDY !== 0) {
    if (mode !== 'held') { g.pos.y -= Math.max(-40, Math.min(40, g.scrollDY * 0.18)); g.kick(Math.min(0.12, Math.abs(g.scrollDY) * 0.002)); }
    if (Math.abs(g.scrollDY) > 140 && g.scrollCD <= 0 && mode === 'idle' && Math.random() < 0.35) { g.say(pick(scrollLines), 160); g.scrollCD = 900; }
    g.scrollDY = 0;
  }
  const dx = g.pos.x - g.prevX, dy = g.pos.y - g.prevY; g.prevX = g.pos.x; g.prevY = g.pos.y;
  const spd = Math.sqrt(dx * dx + dy * dy);
  if (mode === 'attack') g.dir = (g.mouseX < g.pos.x ? -1 : 1);
  else if (mode === 'chase') g.dir = (g.trend!.x < g.pos.x ? -1 : 1);
  else if (dx < -0.4) g.dir = -1; else if (dx > 0.4) g.dir = 1;

  resolveBeam(g, recent);
  updateBullets(g, recent);
  shootAndCatch(g);

  // Slow grow or shrink, held for a while; not a pulse. Paused while inflated from hits.
  if (g.puff < 0.05 && --g.sizeCD <= 0) {
    const r = Math.random();
    g.scaleTarget = r < 0.45 ? 1 : (r < 0.68 ? 1.5 : (r < 0.86 ? 2 : (r < 0.96 ? 2.5 : 0.75)));
    g.sizeCD = 200 + (rand(0, 320) | 0);
  }
  // charge-up while closing in
  const eff = g.scaleTarget + ((mode === 'attack' && g.atkPhase === 'approach' && !g.fired) ? 0.28 : 0);
  g.scale += (eff - g.scale) * 0.06;
  if (g.scale > 2.5) g.scale = 2.5;
  g.sqv += -g.sq * 0.28; g.sqv *= 0.72; g.sq = Math.max(-0.45, Math.min(0.45, g.sq + g.sqv));

  if (spd > 2.4 && g.t % 5 === 0) emit(g, 1, 6);
  if (g.asleep && g.t % 70 === 0) g.popups.push({ x: g.pos.x + 16, y: g.pos.y - 26 * g.size() * g.DS, text: 'z', life: 0, max: 80, c: '#93a8bc' });

  // Position only: size is drawn in-canvas so the pixel art never blurs.
  g.pet.style.transform = 'translate(' + (g.pos.x - HALF) + 'px,' + (g.pos.y - HALF) + 'px)';
  // A fixed gap above the robot's scaled top, so the bubble never overlaps it.
  g.bubble.style.bottom = (132 + 24 * g.size() * g.DS) + 'px';
  // The cursor turns into a hand over the robot and a fist while holding it.
  if (!g.coarse) {
    const over = g.t - g.lastMove < 600 && Math.hypot(g.mouseX - g.pos.x, g.mouseY - g.pos.y) < g.hitR();
    const cur = g.held ? 'robot-grabbing' : (over ? 'robot-grab' : '');
    if (cur !== g.cursor) {
      const cl = document.documentElement.classList;
      if (g.cursor) cl.remove(g.cursor);
      if (cur) cl.add(cur);
      g.cursor = cur;
    }
  }

  g.bob = (mode === 'knock' || mode === 'held') ? 0 : Math.sin(g.t * (g.asleep ? 0.025 : 0.05)) * (spd > 1 ? 1.1 : 2);
  g.lean = mode === 'knock' ? 0 : (mode === 'held' ? Math.max(-0.5, Math.min(0.5, dx * 0.04)) : Math.max(-0.18, Math.min(0.18, dx * 0.02)));
  // Morph cycle is robot to critter and back only, never critter to critter.
  g.formCD--;
  if (g.formCD <= 0 && g.knockT <= 0 && !g.held && !g.asleep) {
    if (g.curForm === 'robot') {
      const nf = pick(CRITTERS);
      g.morphTo(nf); g.formCD = 420 + (rand(0, 360) | 0);
    } else {
      g.morphTo('robot'); g.formCD = 540 + (rand(0, 600) | 0);
    }
  }
  if (g.morphFlash > 0) g.morphFlash--;
  g.st = mode === 'knock' ? 'knock' : (mode === 'held' || g.angryT > 0 ? 'mad' : (mode === 'attack' || g.beamAt > 0 ? 'attack' : (mode === 'chase' || g.t - g.petT < 30 ? 'happy' : 'idle')));
  g.closed = g.asleep || g.t % 200 < 7;
  g.moving = spd > 1 && mode !== 'knock' && mode !== 'held';
  drawPet(g);

  renderSparks(g);
  renderFx(g, recent);

  // A section seen for the first time queues its line.
  if (g.t % 30 === 0) {
    const s = g.getSection();
    if (s !== g.lastSection) { g.lastSection = s; if (!g.seenSections.has(s) && SECTION_LINES[s]) g.pendingSection = s; }
  }
  // calm moments only: a tutorial hint first, then section lines, then a rare random quip
  if (mode !== 'knock' && mode !== 'attack' && mode !== 'held' && !g.asleep && g.bubble.hidden && g.t > g.bubbleUntil + 60) {
    // hints may interrupt a trend chase; section lines wait until the first hint has had its moment
    if (!calmHint(g) && !g.trend) {
      if (g.pendingSection && g.t > 720) {
        const s = g.pendingSection; g.pendingSection = ''; g.seenSections.add(s); g.say(pick(SECTION_LINES[s]!), 260);
      } else if (g.t > g.nextQuip) {
        let j: number; do { j = (Math.random() * quips.length) | 0; } while (j === g.lastQuip && quips.length > 1);
        g.lastQuip = j; g.say(quips[j]!);
      }
    }
  }
  if (!g.bubble.hidden && g.t > g.bubbleUntil) g.bubble.hidden = true;
}

let game: Game | null = null

// Builds nothing under reduced motion or without a 2D context.
export function start(refs: GameRefs, getSection: () => string): void {
  destroy()
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const ctx = refs.canvas.getContext('2d')
  if (!ctx) return
  game = new Game(refs, ctx, getSection)
  game.start()
}

export function destroy(): void {
  game?.destroy()
  game = null
}
