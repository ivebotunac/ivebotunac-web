// The orchestrator: one Game owns all state and element refs; tick.ts steps it at 60 ticks a second.
import { MAX_SIZE, MORPH, ROBOT_LINES, U, dispScale, pick, vary, wakeLines } from './config'
import type { FormName, Mood } from './config'
import { linesFor } from './critters'
import type { Act } from './critters'
import { magic } from './effects'
import { bindInput } from './input'
import { loadMemory } from './guide'
import { bindQuest, initQuest, noteForm } from './quest'
import { bindBoss } from './boss'
import { frame } from './tick'
import type { Memory, Skill } from './guide'
import type { AttackKind, AttackPhase, Ball, Beam, Boss, Bullet, Carry, Confetti, Crew, Debris, GameRefs, Peek, Point, Popup, Press, Pxl, QuestBridge, Ring, AgentRole, Spark, TeamMember, Trend } from './types'

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
  // set while asleep with nothing going on, when frames come from a 100ms timer instead of rAF
  idleTO: ReturnType<typeof setTimeout> | undefined = undefined
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
  pmMs = 0
  // cursor speed over the last mousemove, in px per ms
  mouseV = 0
  // the cursor is over a link or a row toggle, which takes the click
  overPage = false
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
  // fetch: 1 while it runs after a thrown trend tag, 2 while it carries the tag back to the cursor
  fetch: 0 | 1 | 2 = 0
  fetchT = 0
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
  // an agent or the trend tag in the visitor's hand
  carry: Carry | null = null
  held = false
  swallowClick = false
  // performance.now() of the last touchstart, to drop the mouse events a tap sends after it
  lastTouch = -1e9
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
  formCD = vary(300, 240)
  // critter quirk: the one under way, ticks to the next quirk and particle, how long a shy one hides
  act: Act | null = null
  actCD = 300
  partCD = 0
  shyT = 0
  // last pose, redrawn unchanged during hit-stop
  st: Mood = 'idle'
  bob = 0
  lean = 0
  moving = false
  closed = false
  // team quest (quest.ts): recruited agents in formation order, agents waiting in opened rows, the fly-by
  bridge: QuestBridge | null
  team: TeamMember[] = []
  peeks: Peek[] = []
  confetti: Confetti[] = []
  hides: Partial<Record<AgentRole, HTMLDetailsElement>> = {}
  flyby = 0
  notHereAt = -9999
  hitTracked = false
  printing = false
  // a line to say on respawn instead of the usual one
  afterRespawn = ''
  // the AGI boss (boss.ts) and the team's own effects (team.ts)
  boss: Boss | null = null
  crew: Crew = { shots: [], glyphs: [], rockets: [], lx: 0, ly: 0, vx: 0, vy: 0, plan: 0 }

  constructor(refs: GameRefs, ctx: CanvasRenderingContext2D, getSection: () => string, bridge: QuestBridge | null) {
    this.bridge = bridge
    this.pet = refs.pet
    this.canvas = refs.canvas
    this.ctx = ctx
    this.bubble = refs.bubble
    this.trendEl = refs.trend
    this.fx = refs.fx
    this.fxc = refs.fx.getContext('2d')
    this.rageEl = refs.rage
    this.getSection = getSection
    this.pxl = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * U), Math.round(y * U), Math.ceil(w * U), Math.ceil(h * U)) }
    this.sizeFx()
  }

  // The CSS size is set with the bitmap, so drawing stays 1:1 with clientX/Y under a dynamic toolbar.
  // The bitmap is at devicePixelRatio, capped lower on phones, so text and lasers stay sharp.
  sizeFx(): void {
    const r = Math.min(this.coarse ? 1.5 : 2, devicePixelRatio || 1)
    this.fx.width = Math.round(this.W * r); this.fx.height = Math.round(this.H * r)
    this.fx.style.width = this.W + 'px'; this.fx.style.height = this.H + 'px'
    this.fxc?.setTransform(r, 0, 0, r, 0, 0)
  }

  start(): void {
    const unInput = bindInput(this), unQuest = bindQuest(this), unBoss = bindBoss(this)
    this.unbind = () => { unInput(); unQuest(); unBoss() }
    initQuest(this)
    this.raf = requestAnimationFrame(now => frame(this, now))
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    clearTimeout(this.idleTO)
    this.idleTO = undefined
    this.unbind?.()
    this.unbind = null
    clearTimeout(this.rageTO)
    this.rageEl.classList.remove('rage--on', 'rage--brand')
    document.documentElement.classList.remove('robot-grab', 'robot-grabbing', 'robot-point')
  }

  // Drawn size: the random growth plus inflation from hits.
  size(): number {
    return Math.min(MAX_SIZE, this.scale + this.puff * 1.3)
  }

  // About the sprite's own half-width, so presses beside it reach the page underneath.
  hitR(): number {
    return 16 * this.size() * this.DS + this.tapPad
  }

  kick(amt: number): void {
    this.sqv += amt
  }

  // Haptics on touch devices; iOS Safari has no vibrate and ignores it.
  buzz(pattern: number | number[]): void {
    if (!this.coarse || typeof navigator.vibrate !== 'function') return
    try { navigator.vibrate(pattern) } catch { /* blocked without a user gesture */ }
  }

  // Back to rAF at once if the loop was dozing on its timer.
  wake(): void {
    this.lastInput = this.t
    if (this.idleTO !== undefined) { clearTimeout(this.idleTO); this.idleTO = undefined; this.raf = requestAnimationFrame(now => frame(this, now)) }
    if (this.asleep) { this.asleep = false; this.say(pick(wakeLines), 180) }
  }

  // Peak-anger flash: an orange tint and faint blur over the viewport; `brand` mixes in cyan and blue.
  rage(brand = false): void {
    const el = this.rageEl
    el.classList.remove('rage--on')
    el.classList.toggle('rage--brand', brand)
    // reflow restarts the animation when re-triggered
    void el.offsetWidth
    el.classList.add('rage--on')
    clearTimeout(this.rageTO)
    this.rageTO = setTimeout(() => { el.classList.remove('rage--on', 'rage--brand') }, 2600)
  }

  say(txt: string, dur?: number): void {
    this.bubble.textContent = txt; this.bubble.hidden = false
    this.bubbleUntil = this.t + (dur || 280); this.nextQuip = vary(this.bubbleUntil + 1200, 900)
  }

  morphTo(f: FormName): void {
    this.curForm = f; this.morphFlash = MORPH; magic(this)
    this.act = null; this.actCD = vary(240, 240); this.partCD = 30
    const lines = linesFor(this, 'morph') ?? ROBOT_LINES, seen = noteForm(this, f)
    // the boss's arrival keeps the bubble for itself
    if (this.knockT <= 0 && this.attackT <= 0 && !this.trend && !this.boss) this.say(seen || pick(lines), 240)
  }
}

let game: Game | null = null

// Builds nothing under reduced motion or without a 2D context; `bridge` carries quest state to the HUD.
export function start(refs: GameRefs, getSection: () => string, bridge: QuestBridge | null = null): void {
  destroy()
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const ctx = refs.canvas.getContext('2d')
  if (!ctx) return
  game = new Game(refs, ctx, getSection, bridge)
  game.start()
}

export function destroy(): void {
  game?.destroy()
  game = null
}
