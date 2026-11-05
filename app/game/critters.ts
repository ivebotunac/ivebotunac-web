// Critter forms: sprites from ./critters baked per mood, plus each one's gait, particles, quirk and lines.
// Each critter's key matches its JSON file name; visitors only ever see its label and lines.
import { ROBOT_PALETTE, pick, rand, vary } from './config'
import type { Mood, Palette } from './types'
import { fxBurst } from './effects'
import type { Game } from './core'

type Move = 'walk' | 'hop' | 'float' | 'waddle' | 'slow' | 'dash'
type Particle = 'spark' | 'ember' | 'bubble' | 'leaf' | 'heart' | 'shadow' | 'star' | 'psychic' | 'none'
type Quirk = 'none' | 'nap' | 'copy' | 'daze' | 'vanish' | 'shy' | 'evolve' | 'proud'
// How it flies when hit or thrown; a floating critter with no weight set counts as light.
type Weight = 'heavy' | 'light'
export type LineKind = 'morph' | 'pet' | 'hit' | 'idle'

// A 24x24 map of palette characters, '.' transparent; the outline and the eyes are drawn on top.
export interface Sprite {
  key: string
  label: string
  palette: Record<string, string>
  outline?: string
  eyes: { l: number[], r: number[], color?: string }
  frames: { idle: string[], walk: string[] }
  trait: { move: Move, particle: Particle, quirk: Quirk, weight?: Weight }
  lines: Record<LineKind, string[]>
}

// A timed quirk under way: `t` counts down.
export interface Act { kind: Quirk, t: number }

const files = import.meta.glob<Sprite>('./critters/*.json', { eager: true, import: 'default' })
const SPRITES: Record<string, Sprite> = Object.fromEntries(Object.values(files).map(s => [s.key, s]))
export const CRITTERS: string[] = Object.keys(SPRITES)
export const critter = (form: string): Sprite | undefined => SPRITES[form]

// The baby neuron's rare evolution into the deep network instead of morphing back to the robot.
const EVOLVES: Record<string, string> = { neurlet: 'deepnet' }

const N = 24
type Eyes = Mood | 'blink'

const PARTICLES: Record<Exclude<Particle, 'none'>, { t: string[], c: string }> = {
  spark: { t: ['✦'], c: '#f2c500' },
  ember: { t: ['•', '✦'], c: '#ff7a2e' },
  bubble: { t: ['○', '°'], c: '#4aa8e0' },
  leaf: { t: ['♣'], c: '#4caf50' },
  heart: { t: ['♥'], c: '#ff6fa3' },
  shadow: { t: ['•'], c: '#7a4fc0' },
  star: { t: ['★', '✦'], c: '#f2c500' },
  psychic: { t: ['○', '✦'], c: '#b45fd6' }
}

// Ticks each quirk lasts once it starts.
const ACT_T: Partial<Record<Quirk, number>> = { nap: 240, daze: 120, proud: 90, vanish: 56, copy: 150 }

// The same cells scripts/critter-sheet.mjs renders: frame, 4-neighbour outline, then the mood's eyes.
function bake(s: Sprite, frame: 'idle' | 'walk', eyes: Eyes): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = N; cv.height = N
  const c = cv.getContext('2d')
  if (!c) return cv
  const map = s.frames[frame]
  const put = (x: number, y: number, col: string) => { if (x >= 0 && y >= 0 && x < N && y < N) { c.fillStyle = col; c.fillRect(x, y, 1, 1) } }
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && map[y]![x] !== '.'
  const out = s.outline || '#1d2433'
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = map[y]![x]!
    if (ch !== '.') put(x, y, s.palette[ch]!)
    else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) put(x, y, out)
  }
  const ec = s.eyes.color || '#1a1a1a'
  for (const side of ['l', 'r'] as const) {
    const [x = 0, y = 0] = s.eyes[side]
    // brows slope down toward the face's centre line
    const brow = () => { if (side === 'l') { put(x, y - 2, ec); put(x + 1, y - 1, ec) } else { put(x + 1, y - 2, ec); put(x, y - 1, ec) } }
    const iris = () => { put(x, y, ec); put(x + 1, y, ec); put(x, y + 1, ec); put(x + 1, y + 1, ec) }
    if (eyes === 'idle') { iris(); put(x, y, '#ffffff') } else if (eyes === 'blink') { put(x, y + 1, ec); put(x + 1, y + 1, ec) } else if (eyes === 'happy') { iris(); put(x, y - 1, '#ffffff'); put(x + 1, y - 1, ec) } else if (eyes === 'attack') { brow(); iris() } else if (eyes === 'mad') { brow(); put(x, y + 1, ec); put(x + 1, y + 1, ec) } else {
      const o = x - 1
      put(o, y - 1, ROBOT_PALETTE.dizzy); put(o + 2, y - 1, ROBOT_PALETTE.dizzy); put(o + 1, y, ROBOT_PALETTE.dizzy); put(o, y + 1, ROBOT_PALETTE.dizzy); put(o + 2, y + 1, ROBOT_PALETTE.dizzy)
    }
  }
  return cv
}

const baked = new Map<string, HTMLCanvasElement>()

// Draws into the 48px box drawPet sets up; false when `form` is not a critter.
export function drawCritter(c: CanvasRenderingContext2D, form: string, mood: Mood, eyesClosed: boolean, moving: boolean, t: number): boolean {
  const s = SPRITES[form]
  if (!s) return false
  const eyes: Eyes = mood === 'knock' ? 'knock' : (eyesClosed ? 'blink' : mood)
  // floaters sway their tail or wisp all the time, walkers step only while moving
  const step = s.trait.move === 'float' ? Math.floor(t / 22) % 2 : (moving ? Math.floor(t / 7) % 2 : 0)
  const frame = step ? 'walk' : 'idle'
  const id = form + frame + eyes
  let img = baked.get(id)
  if (!img) { img = bake(s, frame, eyes); baked.set(id, img) }
  c.imageSmoothingEnabled = false
  c.drawImage(img, 0, 0, 48, 48)
  return true
}

// A form's cursor-attack ammo: particle glyphs and colour; null for the robot and particle-less forms.
export function attackStyle(g: Game): { t: string[], c: string } | null {
  const p = SPRITES[g.curForm]?.trait.particle
  return p && p !== 'none' ? PARTICLES[p] : null
}

// Knocked: gravity and drag per tick, and the share of a throw's speed kept; heavy drops, light drifts.
export function heft(g: Game): { grav: number, drag: number, fling: number, kind: Weight | 'normal' } {
  const t = SPRITES[g.curForm]?.trait
  const w = t?.weight ?? (t?.move === 'float' ? 'light' : undefined)
  if (w === 'heavy') return { grav: 0.85, drag: 0.96, fling: 0.6, kind: w }
  if (w === 'light') return { grav: 0.12, drag: 0.993, fling: 1.1, kind: w }
  return { grav: 0.45, drag: 0.985, fling: 1, kind: 'normal' }
}

// A 24px collection tile: the form in its colours once seen, a flat silhouette until then.
export function drawFormIcon(c: CanvasRenderingContext2D, form: string, seen: boolean): void {
  const s = SPRITES[form]
  if (!s) return
  let img = baked.get(form + 'idleidle')
  if (!img) { img = bake(s, 'idle', 'idle'); baked.set(form + 'idleidle', img) }
  c.clearRect(0, 0, N, N)
  c.imageSmoothingEnabled = false
  c.drawImage(img, 0, 0)
  if (seen) return
  c.globalCompositeOperation = 'source-in'
  c.fillStyle = '#9fb3c6'
  c.fillRect(0, 0, N, N)
  c.globalCompositeOperation = 'source-over'
}

// The copying blob turns into the robot, in its own colours.
export function copyPalette(form: string, base: Palette): Palette {
  const s = SPRITES[form]
  const body = s ? (s.palette[s.frames.idle[12]![12]!] ?? base.body) : base.body
  return { ...base, body, body2: shade(body, 0.72), screen: shade(body, 0.35), eye: '#1a1a1a' }
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v * k).toString(16).padStart(2, '0')
  return '#' + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255)
}

// The critter's own line bank for a moment, or null while the robot is itself.
export function linesFor(g: Game, kind: LineKind): string[] | null {
  return SPRITES[g.curForm]?.lines[kind] ?? null
}

// Lerp multiplier for how fast the current form gets anywhere.
export function pace(g: Game): number {
  const m = SPRITES[g.curForm]?.trait.move
  return m === 'slow' ? 0.6 : (m === 'dash' ? 1.35 : 1)
}

// Bob and lean for the current gait; null keeps the robot's own.
export function gait(g: Game, spd: number): { bob: number, lean: number } | null {
  const m = SPRITES[g.curForm]?.trait.move
  if (!m) return null
  const t = g.t
  if (m === 'hop') return { bob: -Math.abs(Math.sin(t * (spd > 1 ? 0.22 : 0.08))) * (spd > 1 ? 6 : 2.5), lean: 0 }
  if (m === 'float') return { bob: Math.sin(t * 0.045) * 4.5, lean: Math.sin(t * 0.03) * 0.06 }
  if (m === 'waddle') return { bob: Math.abs(Math.sin(t * 0.18)) * -1.5, lean: Math.sin(t * 0.18) * (spd > 1 ? 0.16 : 0.05) }
  if (m === 'slow') return { bob: Math.sin(t * 0.03) * 1.2, lean: 0 }
  return null
}

// A quirk may own the target: nappers, dazed and posing critters stay put; a shy one flees a fast cursor.
export function actTarget(g: Game): number | null {
  const s = SPRITES[g.curForm]
  if (!s) return null
  const k = g.act?.kind
  if (k === 'nap' || k === 'daze' || k === 'proud' || k === 'copy') { g.tgt.x = g.pos.x; g.tgt.y = g.pos.y; return 0.02 }
  // faster than petting speed, so a slow hand can still reach it
  if (s.trait.quirk === 'shy' && g.t - g.lastMove < 10 && g.mouseV > 0.8 && Math.hypot(g.mouseX - g.pos.x, g.mouseY - g.pos.y) < 150) {
    const a = Math.atan2(g.pos.y - g.mouseY, g.pos.x - g.mouseX)
    g.tgt.x = Math.max(40, Math.min(g.W - 40, g.pos.x + Math.cos(a) * 120))
    g.tgt.y = Math.max(60, Math.min(g.H - 60, g.pos.y + Math.sin(a) * 120))
    g.shyT = 20
    return 0.06
  }
  return null
}

// The mood and eyes a running quirk shows instead of the usual ones.
export function actLook(g: Game, mood: Mood, eyesClosed: boolean): { mood: Mood, eyesClosed: boolean } {
  const k = g.act?.kind
  if (k === 'nap') return { mood: 'idle', eyesClosed: true }
  if (k === 'daze') return { mood: 'knock', eyesClosed: false }
  if (k === 'proud') return { mood: 'happy', eyesClosed: false }
  if (g.shyT > 0 && mood === 'idle') return { mood, eyesClosed: true }
  return { mood, eyesClosed }
}

// Per tick while a critter is out: its particles, and now and then its quirk when nothing else is going on.
export function tickCritter(g: Game, calm: boolean): void {
  const s = SPRITES[g.curForm]
  if (g.shyT > 0) g.shyT--
  if (!s) { g.act = null; return }
  const top = g.pos.y - 22 * g.size() * g.displayScale
  if (s.trait.particle !== 'none' && --g.partCD <= 0) {
    const p = PARTICLES[s.trait.particle]
    g.partCD = vary(36, 40)
    g.popups.push({ x: g.pos.x + rand(-18, 18) * g.size(), y: top + rand(0, 20), text: pick(p.t), life: 0, max: 46, c: p.c, size: 12 })
  }
  const a = g.act
  if (a) {
    if (!calm && a.kind !== 'vanish') { g.act = null; return }
    a.t--
    if (a.kind === 'nap' && a.t % 60 === 0) g.popups.push({ x: g.pos.x + 16, y: top, text: 'z', life: 0, max: 80, c: '#93a8bc' })
    if (a.t <= 0) {
      g.act = null
      // reappears a little way off
      if (a.kind === 'vanish') {
        g.pos.x = Math.max(40, Math.min(g.W - 40, g.pos.x + rand(-90, 90))); g.pos.y = Math.max(60, Math.min(g.H - 60, g.pos.y + rand(-50, 50)))
        g.prevX = g.pos.x; g.prevY = g.pos.y
        fxBurst(g, g.pos.x, g.pos.y, 12, '#9b6bff')
      }
    }
    return
  }
  if (!calm || --g.actCD > 0) return
  g.actCD = vary(360, 480)
  const q = s.trait.quirk, t = ACT_T[q]
  if (!t) return
  g.act = { kind: q, t }
  if (q === 'daze') g.popups.push({ x: g.pos.x, y: top, text: '?', life: 0, max: 60, c: '#9b6bff', size: 16 })
  else if (q === 'proud') { g.kick(0.3); fxBurst(g, g.pos.x, top + 10, 10, '#ffd23b'); g.popups.push({ x: g.pos.x, y: top, text: '★', life: 0, max: 50, c: '#f2c500', size: 16 }) } else if (q === 'vanish' || q === 'copy') fxBurst(g, g.pos.x, g.pos.y, 12, '#9b6bff')
}

// How visible the critter is: a vanishing one fades out and back in.
export function actAlpha(g: Game): number {
  const a = g.act
  if (a?.kind !== 'vanish') return 1
  const edge = Math.min(ACT_T.vanish! - a.t, a.t)
  return edge >= 10 ? 0.08 : 1 - edge / 10 * 0.92
}

// The form to take when a critter's time is up: the robot, or now and then its evolved form.
export function nextForm(g: Game): string {
  const evo = EVOLVES[g.curForm]
  return evo && SPRITES[evo] && Math.random() < 0.5 ? evo : 'robot'
}
