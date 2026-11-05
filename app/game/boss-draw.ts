// The AGI boss's pixel art: the core on a 24x24 grid, its reticles and orbs, and the health bar.
import { BODY, BODY2, CYAN, INK, MONO, ORANGE, PAPER, VIOLET, WHITE, YELLOW, rand } from './config'
import { fxBurst } from './effects'
import { DIE, ENTER, TP_GONE, TP_OUT, bossPx, vanished } from './boss-shared'
import type { Game } from './core'
import type { Boss, BossOrb } from './types'

type Cell = { x: number, y: number, k: 'edge' | 'shell' | 'lit' | 'ring' | 'core' | 'text' | 'tip' }

// 3x5 letters for the forehead.
const FONT5: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  G: ['###', '#..', '#.#', '#.#', '###'],
  I: ['###', '.#.', '.#.', '.#.', '###']
}

// The core on a 24x24 grid: an octagonal shell, a segmented cyan ring, a dark core with a visor and "AGI".
function buildCells(): Cell[] {
  const out: Cell[] = [], text = new Set<string>()
  'AGI'.split('').forEach((ch, i) => FONT5[ch]!.forEach((row, y) => row.split('').forEach((v, x) => { if (v === '#') text.add((6 + i * 4 + x) + ',' + (11 + y)) })))
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const dx = x + 0.5 - 12, dy = y + 0.5 - 12, d = Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) * 0.7071)
    if (d > 11.2) continue
    let k: Cell['k']
    if (d > 10.1) k = 'edge'
    else if (d > 8.4) k = dx + dy < -6 ? 'lit' : 'shell'
    else if (d > 7.2) k = 'ring'
    else k = text.has(x + ',' + y) ? 'text' : 'core'
    out.push({ x, y, k })
  }
  out.push({ x: 7, y: -1, k: 'tip' }, { x: 7, y: 0, k: 'edge' }, { x: 16, y: -1, k: 'tip' }, { x: 16, y: 0, k: 'edge' })
  return out
}
const CELLS = buildCells()

// The health bar's paper plate: padding round the bar, room above it for the label, the shadow offset.
const PLATE_PAD = 8
const PLATE_LABEL = 18
const PLATE_SHADOW = 4

// A stable pseudo-random value per integer, so glitch bands hold a few ticks instead of flickering.
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s) }

function cellColour(b: Boss, cl: Cell, warn: boolean): string {
  switch (cl.k) {
    case 'edge': return INK
    case 'shell': return BODY2
    case 'lit': return BODY
    case 'tip': return b.t % 30 < 15 ? ORANGE : YELLOW
    case 'ring': {
      const a = Math.atan2(cl.y + 0.5 - 12, cl.x + 0.5 - 12), seg = (((a / (Math.PI * 2)) * 12 + b.t * 0.08) | 0) % 3
      return seg === 0 ? '#1fa9c2' : CYAN
    }
    case 'text': return warn ? (b.t % 6 < 3 ? WHITE : YELLOW) : ORANGE
    default: {
      // the visor sweep over the letters
      const vx = 6 + ((b.t * 0.25) | 0) % 12
      if (cl.y === 8 && (cl.x === vx || cl.x === vx + 1)) return warn ? WHITE : ORANGE
      if (cl.y === 8 && cl.x > 5 && cl.x < 18) return '#3a1a12'
      return (cl.y + ((b.t * 0.2) | 0)) % 9 === 0 ? '#16324d' : INK
    }
  }
}

export function drawBoss(g: Game): void {
  const c = g.fxc, b = g.boss
  if (!c || !b) return
  const P = bossPx(g)
  // mid-teleport: nothing, except a faint shimmer where it is about to land
  if (vanished(b)) {
    const mv = b.mv!
    if (mv.t > TP_OUT + TP_GONE - 9 && g.t % 3 === 0) fxBurst(g, b.x - b.offX + mv.tx + rand(-30, 30), b.y - b.offY + mv.ty + rand(-30, 30), 1, VIOLET)
    return
  }
  // the flicker before it goes
  if (b.mv?.kind === 'tp' && b.mv.t % 4 < 2) return
  const warn = !!b.tele || b.mv?.kind === 'tp'
  const sx = b.shake > 0 ? Math.round((Math.random() - 0.5) * b.shake) : 0, sy = b.shake > 0 ? Math.round((Math.random() - 0.5) * b.shake) : 0
  const x0 = Math.round(b.x - 12 * P) + sx, y0 = Math.round(b.y - 12 * P + Math.sin(b.t * 0.05) * 3) + sy
  const seed = (b.t / 6) | 0, glitch = b.phase === 'dying' || warn || b.flash > 0 || hash(seed) < 0.3
  const band = (hash(seed + 7) * 20) | 0, bandH = 2 + ((hash(seed + 3) * 3) | 0), bandOff = hash(seed + 11) < 0.5 ? -1 : 1
  const gone = b.phase === 'dying' ? (b.t / DIE) * 0.55 : 0
  const leaving = b.phase === 'leave' ? Math.max(0, 1 - b.t / 60) : 1
  const put = (cl: Cell, ox: number, colour: string) => {
    const off = glitch && cl.y >= band && cl.y < band + bandH ? bandOff : 0
    c.fillStyle = colour; c.fillRect(x0 + (cl.x + off) * P + ox, y0 + cl.y * P, P, P)
  }
  const keep = (cl: Cell) => !gone || hash(cl.x * 31 + cl.y * 7) >= gone
  // chromatic split while glitching
  if (glitch) {
    c.globalAlpha = 0.35 * leaving
    for (const cl of CELLS) if (keep(cl)) put(cl, -2, CYAN)
    for (const cl of CELLS) if (keep(cl)) put(cl, 2, ORANGE)
  }
  c.globalAlpha = leaving
  for (const cl of CELLS) if (keep(cl)) put(cl, 0, cellColour(b, cl, warn))
  if (b.flash > 0) {
    c.globalAlpha = Math.min(1, b.flash / 3) * 0.85 * leaving
    for (const cl of CELLS) if (keep(cl)) put(cl, 0, WHITE)
  }
  // four satellites on a tilted orbit
  for (let i = 0; i < 4; i++) {
    const a = b.t * 0.03 + i * Math.PI / 2, ox = Math.cos(a) * 15 * P, oy = Math.sin(a) * 5 * P
    c.globalAlpha = (Math.sin(a) > 0 ? 1 : 0.55) * leaving
    c.fillStyle = i % 2 ? ORANGE : CYAN
    c.fillRect(Math.round(b.x + ox - P), Math.round(b.y + oy - P), P * 2, P * 2)
  }
  c.globalAlpha = 1
}

function drawReticle(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, a: number): void {
  c.globalAlpha = a; c.strokeStyle = ORANGE; c.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const s = t * 0.06 + i * Math.PI / 2
    c.beginPath(); c.arc(x, y, r, s, s + Math.PI / 3); c.stroke()
  }
  c.fillStyle = ORANGE
  c.fillRect(Math.round(x) - 1, Math.round(y - r * 0.5) - 4, 2, 5); c.fillRect(Math.round(x) - 1, Math.round(y + r * 0.5), 2, 5)
  c.fillRect(Math.round(x - r * 0.5) - 4, Math.round(y) - 1, 5, 2); c.fillRect(Math.round(x + r * 0.5), Math.round(y) - 1, 5, 2)
  c.globalAlpha = 1
}

function drawOrb(c: CanvasRenderingContext2D, o: BossOrb, t: number): void {
  const R = o.kind === 'lock' ? 8 : 6
  c.fillStyle = INK; c.beginPath(); c.arc(o.x, o.y, R, 0, Math.PI * 2); c.fill()
  c.fillStyle = t % 8 < 4 ? ORANGE : YELLOW; c.beginPath(); c.arc(o.x, o.y, R - 3, 0, Math.PI * 2); c.fill()
  c.fillStyle = WHITE; c.fillRect(Math.round(o.x) - 2, Math.round(o.y - R) + 2, 2, 2)
}

// Drawn last: telegraphs, orbs, and the health bar on a paper plate so it reads in either theme.
export function drawBossOver(g: Game): void {
  const c = g.fxc, b = g.boss
  if (!c || !b) return
  const tl = b.tele, P = bossPx(g)
  if (tl?.kind === 'lock') drawReticle(c, tl.x, tl.y, 40 - 22 * (tl.life / tl.max), g.t, 0.5 + 0.5 * Math.abs(Math.sin(tl.life * 0.25)))
  else if (tl) {
    c.globalAlpha = tl.life / tl.max; c.strokeStyle = YELLOW; c.lineWidth = 2
    c.beginPath(); c.arc(b.x, b.y, 14 * P - 10 * (tl.life / tl.max) * P, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = 1
  }
  for (const o of b.orbs) {
    if (o.kind === 'lock') drawReticle(c, o.tx, o.ty, 18, g.t, 0.9)
    if (o.life >= 0) drawOrb(c, o, g.t)
  }
  if (b.phase === 'leave') return
  const w = Math.min(320, g.W - 48), h = 10, x = Math.round((g.W - w) / 2), y = 30
  const k = b.phase === 'enter' ? Math.min(1, b.t / ENTER) : 1
  const px = x - PLATE_PAD, py = y - PLATE_LABEL, pw = w + PLATE_PAD * 2, ph = h + PLATE_LABEL + PLATE_PAD
  c.save()
  c.globalAlpha = k
  c.fillStyle = '#d3deee'; c.fillRect(px + PLATE_SHADOW, py + PLATE_SHADOW, pw, ph)
  c.fillStyle = PAPER; c.fillRect(px, py, pw, ph)
  c.strokeStyle = '#c6d7e7'; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1)
  c.fillStyle = WHITE; c.fillRect(x, y, w, h)
  c.fillStyle = YELLOW; c.fillRect(x + 1, y + 1, Math.round((w - 2) * (b.shown / b.max) * k), h - 2)
  c.fillStyle = ORANGE; c.fillRect(x + 1, y + 1, Math.round((w - 2) * (b.hp / b.max) * k), h - 2)
  c.fillStyle = 'rgba(12, 34, 54, 0.35)'
  for (let q = 1; q < 4; q++) c.fillRect(x + Math.round((w * q) / 4), y + 1, 1, h - 2)
  c.strokeStyle = INK; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  c.font = '700 11px ' + MONO; c.fillStyle = INK
  c.textAlign = 'left'; c.fillText(b.combo >= 2 ? 'AGI  ' + b.combo + 'x' : 'AGI', x, y - 5)
  c.textAlign = 'right'; c.fillText(Math.ceil((b.hp / b.max) * 100) + '%', x + w, y - 5)
  c.restore()
}
