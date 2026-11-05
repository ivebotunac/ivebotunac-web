// The AGI boss's pixel art: the core on a 24x24 grid, its reticles and orbs, and the health bar.
import { MONO, rand } from './config'
import { fxBurst } from './effects'
import { DIE, ENTER, TP_GONE, TP_OUT, cell, vanished } from './boss'
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
let CELLS: Cell[] | null = null
function cells(): Cell[] {
  if (CELLS) return CELLS
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
  CELLS = out
  return out
}

// A stable pseudo-random value per integer, so glitch bands hold a few ticks instead of flickering.
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s) }

function cellColour(b: Boss, cl: Cell, warn: boolean): string {
  switch (cl.k) {
    case 'edge': return '#0c2236'
    case 'shell': return '#285a8c'
    case 'lit': return '#3b7cc0'
    case 'tip': return b.t % 30 < 15 ? '#ff5a1f' : '#ffd23b'
    case 'ring': {
      const a = Math.atan2(cl.y + 0.5 - 12, cl.x + 0.5 - 12), seg = (((a / (Math.PI * 2)) * 12 + b.t * 0.08) | 0) % 3
      return seg === 0 ? '#1fa9c2' : '#36c6e0'
    }
    case 'text': return warn ? (b.t % 6 < 3 ? '#ffffff' : '#ffd23b') : '#ff5a1f'
    default: {
      // the visor sweep over the letters
      const vx = 6 + ((b.t * 0.25) | 0) % 12
      if (cl.y === 8 && (cl.x === vx || cl.x === vx + 1)) return warn ? '#ffffff' : '#ff5a1f'
      if (cl.y === 8 && cl.x > 5 && cl.x < 18) return '#3a1a12'
      return (cl.y + ((b.t * 0.2) | 0)) % 9 === 0 ? '#16324d' : '#0c2236'
    }
  }
}

export function drawBoss(g: Game): void {
  const c = g.fxc, b = g.boss
  if (!c || !b) return
  const P = cell(g)
  // mid-teleport: nothing, except a faint shimmer where it is about to land
  if (vanished(b)) {
    const mv = b.mv!
    if (mv.t > TP_OUT + TP_GONE - 9 && g.t % 3 === 0) fxBurst(g, b.x - b.offX + mv.tx + rand(-30, 30), b.y - b.offY + mv.ty + rand(-30, 30), 1, '#9b6bff')
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
  const all = cells()
  const put = (cl: Cell, ox: number, col: string) => {
    const off = glitch && cl.y >= band && cl.y < band + bandH ? bandOff : 0
    c.fillStyle = col; c.fillRect(x0 + (cl.x + off) * P + ox, y0 + cl.y * P, P, P)
  }
  const keep = (cl: Cell) => !gone || hash(cl.x * 31 + cl.y * 7) >= gone
  // chromatic split while glitching
  if (glitch) {
    c.globalAlpha = 0.35 * leaving
    for (const cl of all) if (keep(cl)) put(cl, -2, '#36c6e0')
    for (const cl of all) if (keep(cl)) put(cl, 2, '#ff5a1f')
  }
  c.globalAlpha = leaving
  for (const cl of all) if (keep(cl)) put(cl, 0, cellColour(b, cl, warn))
  if (b.flash > 0) {
    c.globalAlpha = Math.min(1, b.flash / 3) * 0.85 * leaving
    for (const cl of all) if (keep(cl)) put(cl, 0, '#ffffff')
  }
  // four satellites on a tilted orbit
  for (let i = 0; i < 4; i++) {
    const a = b.t * 0.03 + i * Math.PI / 2, ox = Math.cos(a) * 15 * P, oy = Math.sin(a) * 5 * P
    c.globalAlpha = (Math.sin(a) > 0 ? 1 : 0.55) * leaving
    c.fillStyle = i % 2 ? '#ff5a1f' : '#36c6e0'
    c.fillRect(Math.round(b.x + ox - P), Math.round(b.y + oy - P), P * 2, P * 2)
  }
  c.globalAlpha = 1
}

function drawReticle(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, a: number): void {
  c.globalAlpha = a; c.strokeStyle = '#ff5a1f'; c.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const s = t * 0.06 + i * Math.PI / 2
    c.beginPath(); c.arc(x, y, r, s, s + Math.PI / 3); c.stroke()
  }
  c.fillStyle = '#ff5a1f'
  c.fillRect(Math.round(x) - 1, Math.round(y - r * 0.5) - 4, 2, 5); c.fillRect(Math.round(x) - 1, Math.round(y + r * 0.5), 2, 5)
  c.fillRect(Math.round(x - r * 0.5) - 4, Math.round(y) - 1, 5, 2); c.fillRect(Math.round(x + r * 0.5), Math.round(y) - 1, 5, 2)
  c.globalAlpha = 1
}

function drawOrb(c: CanvasRenderingContext2D, o: BossOrb, t: number): void {
  const R = o.kind === 'lock' ? 8 : 6
  c.fillStyle = '#0c2236'; c.beginPath(); c.arc(o.x, o.y, R, 0, Math.PI * 2); c.fill()
  c.fillStyle = t % 8 < 4 ? '#ff5a1f' : '#ffd23b'; c.beginPath(); c.arc(o.x, o.y, R - 3, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffffff'; c.fillRect(Math.round(o.x) - 2, Math.round(o.y - R) + 2, 2, 2)
}

// Drawn last: telegraphs, orbs, and the health bar on a paper plate so it reads in either theme.
export function drawBossOver(g: Game): void {
  const c = g.fxc, b = g.boss
  if (!c || !b) return
  const tl = b.tele
  if (tl?.kind === 'lock') drawReticle(c, tl.x, tl.y, 40 - 22 * (tl.life / tl.max), g.t, 0.5 + 0.5 * Math.abs(Math.sin(tl.life * 0.25)))
  else if (tl) {
    c.globalAlpha = tl.life / tl.max; c.strokeStyle = '#ffd23b'; c.lineWidth = 2
    c.beginPath(); c.arc(b.x, b.y, 14 * cell(g) - 10 * (tl.life / tl.max) * cell(g), 0, Math.PI * 2); c.stroke()
    c.globalAlpha = 1
  }
  for (const o of b.orbs) {
    if (o.kind === 'lock') drawReticle(c, o.tx, o.ty, 18, g.t, 0.9)
    if (o.life >= 0) drawOrb(c, o, g.t)
  }
  if (b.phase === 'leave') return
  const w = Math.min(320, g.W - 48), h = 10, x = Math.round((g.W - w) / 2), y = 30
  const k = b.phase === 'enter' ? Math.min(1, b.t / ENTER) : 1
  c.globalAlpha = k
  c.fillStyle = '#d3deee'; c.fillRect(x - 8 + 4, y - 18 + 4, w + 16, h + 26)
  c.fillStyle = '#f5f9fd'; c.fillRect(x - 8, y - 18, w + 16, h + 26)
  c.strokeStyle = '#c6d7e7'; c.lineWidth = 1; c.strokeRect(x - 7.5, y - 17.5, w + 15, h + 25)
  c.fillStyle = '#ffffff'; c.fillRect(x, y, w, h)
  c.fillStyle = '#ffd23b'; c.fillRect(x + 1, y + 1, Math.round((w - 2) * (b.shown / b.max) * k), h - 2)
  c.fillStyle = '#ff5a1f'; c.fillRect(x + 1, y + 1, Math.round((w - 2) * (b.hp / b.max) * k), h - 2)
  c.fillStyle = 'rgba(12, 34, 54, 0.35)'
  for (let q = 1; q < 4; q++) c.fillRect(x + Math.round((w * q) / 4), y + 1, 1, h - 2)
  c.strokeStyle = '#0c2236'; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  c.font = '700 11px ' + MONO; c.fillStyle = '#0c2236'
  c.textAlign = 'left'; c.fillText(b.combo >= 2 ? 'AGI  ' + b.combo + 'x' : 'AGI', x, y - 5)
  c.textAlign = 'right'; c.fillText(Math.ceil((b.hp / b.max) * 100) + '%', x + w, y - 5)
  c.textAlign = 'center'
  c.globalAlpha = 1
}
