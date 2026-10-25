// The orchestrator: one Game owns all state and element refs, loop() runs each frame.
import { CRITTERS, CX, CY, FORM_LINE, HALF, MORPH, U, col, dispScale, pick, quips, rand, recoverLines } from './config'
import type { FormName, Mood } from './config'
import { draw } from './forms'
import type { Pxl } from './forms'
import { emit, magic, renderFx, renderSparks } from './effects'
import { bindInput, chaseTarget, idleTarget, resolveBeam, runAttack, scheduleAttack, shootAndCatch, spawnTrend, updateBullets, updateTrendMotion } from './actions'
import type { AttackKind, AttackPhase, Ball, Beam, Bullet, Debris, GameRefs, Mode, Point, Popup, Ring, Spark, Trend } from './types'

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
  raf = 0
  unbind: (() => void) | null = null

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
  nextQuip = 240
  lastQuip = -1
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
  angryT = 0
  // rapid-knock counter for the peak-rage flash
  knockStreak = 0
  lastKnock = -999
  // the robot is the true form; magic morphs robot to critter and back
  curForm: FormName = 'robot'
  morphFlash = 0
  formCD = 300 + (rand(0, 240) | 0)

  constructor(refs: GameRefs, ctx: CanvasRenderingContext2D) {
    this.pet = refs.pet
    this.canvas = refs.canvas
    this.ctx = ctx
    this.bubble = refs.bubble
    this.trendEl = refs.trend
    this.fx = refs.fx
    this.fxc = refs.fx.getContext('2d')
    this.rageEl = refs.rage
    this.pxl = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * U), Math.round(y * U), Math.ceil(w * U), Math.ceil(h * U)); }
    this.sizeFx()
  }

  sizeFx(): void {
    this.fx.width = this.W; this.fx.height = this.H;
  }

  start(): void {
    this.unbind = bindInput(this)
    this.raf = requestAnimationFrame(() => frame(this))
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.unbind?.()
    this.unbind = null
    clearTimeout(this.rageTO)
    this.rageEl.classList.remove('rage--on')
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
    this.bubbleUntil = this.t + (dur || 280); this.nextQuip = this.bubbleUntil + 260 + (rand(0, 360) | 0);
  }

  morphTo(f: FormName): void {
    this.curForm = f; this.morphFlash = MORPH; magic(this);
    if (FORM_LINE[f] && this.knockT <= 0 && this.attackT <= 0 && !this.trend) this.say(pick(FORM_LINE[f]), 240);
  }
}

// One frame of the game; reschedules itself until destroy() cancels it.
function frame(g: Game): void {
  g.t++;
  if (g.hitCD > 0) g.hitCD--;
  if (g.angryT > 0) g.angryT--;
  const recent = (g.t - g.lastMove) < 90;

  // No trends while angry: the visitor is the target.
  if (--g.trendCD <= 0 && !g.trend && g.knockT <= 0 && g.angryT <= 0) spawnTrend(g);
  updateTrendMotion(g);

  scheduleAttack(g, recent);

  let mode: Mode, lerp = 0.05;
  if (g.knockT > 0) mode = 'knock';
  else if (g.trend && g.angryT <= 0) { mode = 'chase'; lerp = chaseTarget(g); }
  else if (g.attackT > 0) { mode = 'attack'; lerp = runAttack(g, recent); }
  else { mode = 'idle'; lerp = idleTarget(g); }

  if (mode === 'knock') {
    g.kvy += 0.45; g.pos.x += g.kvx; g.pos.y += g.kvy; g.kvx *= 0.97;
    const gnd = g.H - 30; if (g.pos.y > gnd) { g.pos.y = gnd; g.kvy = (g.kvy > 1.6) ? g.kvy * -0.32 : 0; g.kvx *= 0.6; }
    g.pos.x = Math.max(24, Math.min(g.W - 24, g.pos.x));
    g.krot += (g.knockT > 72 ? 0.3 : (Math.PI / 2 - g.krot) * 0.12);
    if (--g.knockT === 0) { emit(g, 14, 14); g.say(pick(recoverLines), 200); g.kvy = -2.4; }
  } else {
    g.pos.x += (g.tgt.x - g.pos.x) * lerp; g.pos.y += (g.tgt.y - g.pos.y) * lerp;
    if (g.krot !== 0) { g.krot *= 0.7; if (Math.abs(g.krot) < 0.02) g.krot = 0; }
  }
  const dx = g.pos.x - g.prevX, dy = g.pos.y - g.prevY; g.prevX = g.pos.x; g.prevY = g.pos.y;
  const spd = Math.sqrt(dx * dx + dy * dy);
  if (mode === 'attack') g.dir = (g.mouseX < g.pos.x ? -1 : 1);
  else if (mode === 'chase') g.dir = (g.trend!.x < g.pos.x ? -1 : 1);
  else if (dx < -0.4) g.dir = -1; else if (dx > 0.4) g.dir = 1;

  resolveBeam(g, recent);
  updateBullets(g, recent);
  shootAndCatch(g);

  // Slow grow or shrink, held for a while; not a pulse.
  if (--g.sizeCD <= 0) {
    const r = Math.random();
    g.scaleTarget = r < 0.45 ? 1 : (r < 0.68 ? 1.5 : (r < 0.86 ? 2 : (r < 0.96 ? 2.5 : 0.75)));
    g.sizeCD = 200 + (rand(0, 320) | 0);
  }
  // charge-up while closing in
  const eff = g.scaleTarget + ((mode === 'attack' && g.atkPhase === 'approach' && !g.fired) ? 0.28 : 0);
  g.scale += (eff - g.scale) * 0.06;
  if (g.scale > 2.5) g.scale = 2.5;

  if (spd > 2.4 && g.t % 5 === 0) emit(g, 1, 6);

  // Position only: size is drawn in-canvas so the pixel art never blurs.
  g.pet.style.transform = 'translate(' + (g.pos.x - HALF) + 'px,' + (g.pos.y - HALF) + 'px)';
  // A fixed gap above the robot's scaled top, so the bubble never overlaps it.
  g.bubble.style.bottom = (132 + 24 * g.scale * g.DS) + 'px';

  g.ctx.clearRect(0, 0, 220, 220);
  const bob = mode === 'knock' ? 0 : Math.sin(g.t * 0.05) * (spd > 1 ? 1.1 : 2);
  const lean = mode === 'knock' ? 0 : Math.max(-0.18, Math.min(0.18, dx * 0.02));
  // Morph cycle is robot to critter and back only, never critter to critter.
  g.formCD--;
  if (g.formCD <= 0 && g.knockT <= 0) {
    if (g.curForm === 'robot') {
      const nf = pick(CRITTERS);
      g.morphTo(nf); g.formCD = 420 + (rand(0, 360) | 0);
    } else {
      g.morphTo('robot'); g.formCD = 540 + (rand(0, 600) | 0);
    }
  }
  if (g.morphFlash > 0) g.morphFlash--;
  const mp = 1 - g.morphFlash / MORPH;
  // poof: grow-in plus a bulge
  const pop = g.morphFlash > 0 ? 0.5 + 0.5 * mp + 0.14 * Math.sin(mp * Math.PI) : 1;
  g.ctx.save();
  g.ctx.translate(CX, CY + bob); g.ctx.rotate(lean + g.krot); g.ctx.scale(g.dir * g.scale * g.DS * pop, g.scale * g.DS * pop); g.ctx.translate(-24, -24);
  const st: Mood = mode === 'knock' ? 'knock' : (g.angryT > 0 ? 'mad' : (mode === 'attack' || g.beamAt > 0 ? 'attack' : (mode === 'chase' ? 'happy' : 'idle')));
  draw(g.pxl, col, g.t, g.curForm, st, (g.t % 200 < 7), spd > 1 && mode !== 'knock');
  g.ctx.restore();

  renderSparks(g);
  renderFx(g, recent);

  // quips in calm states only
  if (mode !== 'knock' && mode !== 'attack' && !g.trend && g.t > g.nextQuip && g.bubble.hidden) {
    let j: number; do { j = (Math.random() * quips.length) | 0; } while (j === g.lastQuip && quips.length > 1);
    g.lastQuip = j; g.say(quips[j]!);
  }
  if (!g.bubble.hidden && g.t > g.bubbleUntil) g.bubble.hidden = true;

  g.raf = requestAnimationFrame(() => frame(g));
}

let game: Game | null = null

// Builds nothing under reduced motion or without a 2D context.
export function start(refs: GameRefs): void {
  destroy()
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const ctx = refs.canvas.getContext('2d')
  if (!ctx) return
  game = new Game(refs, ctx)
  game.start()
}

export function destroy(): void {
  game?.destroy()
  game = null
}
