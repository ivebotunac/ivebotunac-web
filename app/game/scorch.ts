// Boss shots burn CV letters for a while: each flares, burns in pixel flame, then leaves soot.
// Only the visitor's DOM changes, never the served HTML; letters heal on a timer, a win, or before print.
import { fxBurst } from './effects'
import type { Game } from './core'

const CLASS = 'ib-burnt'
// HEAL: ticks a letter stays out at 60 Hz; FLAME: the first of those it burns; MAX: the most out at once.
const HEAL = 1500
const FLAME = 200
const MAX = 260
// Text that must stay whole: links and buttons, headings that name a section, the game's own UI.
const KEEP = 'a, button, input, label, h1, h2, script, style, [data-game-ui], .cv-tog'
const ASH = ['#0c2236', '#213b54', '#3b7cc0', '#ff5a1f', '#ffd23b']
// Flame pixels cool from white-hot to smoke as they rise.
const HEAT = ['#fff6c2', '#ffd23b', '#ffa51f', '#ff5a1f', '#d7381b', '#7a2414', '#3a2a2a']
const PX = 3

interface Burn { span: HTMLSpanElement, born: number, healAt: number }
interface Flame { x: number, y: number, vx: number, vy: number, life: number, max: number }
const burns: Burn[] = []
const flames: Flame[] = []

const range = typeof document === 'undefined' ? null : document.createRange()

// Letters whose centre is within r of the impact, nearest first; lines count a little closer than columns.
function lettersNear(x: number, y: number, r: number): { node: Text, i: number, d: number }[] {
  if (!range) return []
  const nodes = new Set<Text>()
  for (let dy = -r; dy <= r; dy += 8) for (let dx = -r; dx <= r; dx += 8) {
    const el = document.elementFromPoint(x + dx, y + dy)
    if (!el || !el.closest('.cv') || el.closest(KEEP)) continue
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) nodes.add(n as Text)
  }
  const out: { node: Text, i: number, d: number }[] = []
  for (const node of nodes) {
    const el = node.parentElement
    if (!el || el.classList.contains(CLASS) || el.closest(KEEP) || !node.data.trim()) continue
    range.selectNodeContents(node)
    const box = range.getBoundingClientRect()
    if (box.right < x - r || box.left > x + r || box.bottom < y - r || box.top > y + r) continue
    for (let i = 0; i < node.data.length; i++) {
      if (/\s/.test(node.data[i]!)) continue
      range.setStart(node, i); range.setEnd(node, i + 1)
      const b = range.getBoundingClientRect()
      const d = Math.hypot(b.left + b.width / 2 - x, (b.top + b.height / 2 - y) * 1.15)
      if (d < r) out.push({ node, i, d })
    }
  }
  return out.sort((a, b) => a.d - b.d)
}

function burnLetter(g: Game, node: Text, i: number): void {
  const mid = node.splitText(i)
  mid.splitText(1)
  const span = document.createElement('span')
  span.className = CLASS
  mid.replaceWith(span)
  span.append(mid)
  burns.push({ span, born: g.t, healAt: g.t + HEAL + ((Math.random() * 240) | 0) })
  const b = span.getBoundingClientRect()
  // the glyph shatters into pixels that fall
  for (let k = 0; k < 5; k++) {
    g.debris.push({ x: b.left + Math.random() * b.width, y: b.top + Math.random() * b.height, vx: (Math.random() - 0.5) * 3.2, vy: -1.5 - Math.random() * 2.5, sz: 2 + ((Math.random() * 2) | 0), c: ASH[(Math.random() * ASH.length) | 0]!, life: 0, max: 120 + ((Math.random() * 90) | 0), landed: false })
  }
}

// One impact burns up to `most` letters within r; returns how many went.
export function scorch(g: Game, x: number, y: number, r = 34, most = 22): number {
  if (g.printing || !g.fxc) return 0
  const hits = lettersNear(x, y, r).slice(0, Math.min(most, MAX - burns.length))
  // from the end of each text node backwards, so a split never moves a letter still to burn
  hits.sort((a, b) => b.i - a.i)
  for (const h of hits) burnLetter(g, h.node, h.i)
  if (hits.length) { fxBurst(g, x, y, 10, '#ffa51f'); fxBurst(g, x, y, 6, '#0c2236') }
  return hits.length
}

// A random point in a block of on-screen CV text, for shots aimed at the page, not the cursor.
export function textTarget(g: Game): { x: number, y: number } | null {
  const seen = [...document.querySelectorAll<HTMLElement>('.cv h3, .cv p, .cv li')].filter((el) => {
    if (el.closest(KEEP)) return false
    const b = el.getBoundingClientRect()
    return b.width > 40 && b.top > 70 && b.bottom < g.H - 70
  })
  const el = seen[(Math.random() * seen.length) | 0]
  if (!el) return null
  const b = el.getBoundingClientRect()
  return { x: b.left + Math.random() * Math.min(b.width, 420), y: b.top + Math.random() * b.height }
}

function heal(g: Game | null, burn: Burn, sparkle: boolean): void {
  const { span } = burn
  if (sparkle && g && span.isConnected) {
    const b = span.getBoundingClientRect()
    if (b.bottom > 0 && b.top < g.H) fxBurst(g, b.left + b.width / 2, b.top + b.height / 2, 3, '#36c6e0')
  }
  const parent = span.parentNode
  if (!parent) return
  span.replaceWith(...span.childNodes)
  // joins the split text back into the node Vue rendered, so a later patch still finds it whole
  parent.normalize()
}

export const scorchBusy = (): boolean => flames.length > 0

// Heals what is due, and feeds the flames of the letters still burning.
export function tickScorch(g: Game): void {
  for (let i = burns.length - 1; i >= 0; i--) {
    const burn = burns[i]!
    if (g.t >= burn.healAt) { burns.splice(i, 1); heal(g, burn, true); continue }
    const age = g.t - burn.born
    // the fire dies down over FLAME ticks; a letter off screen feeds nothing
    if (age > FLAME || flames.length > 700 || Math.random() > 0.75 * (1 - age / FLAME)) continue
    const b = burn.span.getBoundingClientRect()
    if (b.bottom < 0 || b.top > g.H) continue
    flames.push({ x: b.left + Math.random() * b.width, y: b.bottom - Math.random() * b.height * 0.5, vx: (Math.random() - 0.5) * 0.5, vy: -0.7 - Math.random() * 0.9, life: 0, max: 18 + ((Math.random() * 18) | 0) })
  }
  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i]!
    f.life++; f.x += f.vx + Math.sin((f.life + i) * 0.5) * 0.25; f.y += f.vy
    if (f.life >= f.max) flames.splice(i, 1)
  }
}

// Square pixels snapped to a 3px grid, so the fire reads as pixel art like the rest of the game.
export function drawScorch(g: Game): void {
  const c = g.fxc
  if (!c || !flames.length) return
  for (const f of flames) {
    const k = f.life / f.max
    c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1
    c.fillStyle = HEAT[Math.min(HEAT.length - 1, (k * HEAT.length) | 0)]!
    const s = k < 0.35 ? PX : k < 0.7 ? PX - 1 : 2
    c.fillRect(Math.round(f.x / PX) * PX, Math.round(f.y / PX) * PX, s, s)
  }
  c.globalAlpha = 1
}

// The team fixes the CV after a win: a wave from the top of the screen down over about a second.
export function repairAll(g: Game): void {
  for (const burn of burns) {
    const top = burn.span.getBoundingClientRect().top
    burn.healAt = g.t + 20 + Math.round(Math.max(0, Math.min(g.H, top)) / Math.max(1, g.H) * 60)
  }
}

// Before print, on restart and when the game stops: everything back at once, without effects.
export function healNow(): void {
  flames.length = 0
  for (const burn of burns.splice(0)) heal(null, burn, false)
}
