// The boss's shots burn letters out of the CV for a while: the glyph goes transparent in place and drops as pixels.
// Only the visitor's own DOM changes, never the served HTML, and every letter heals: on a timer, on a win, before print.
import { fxBurst } from './effects'
import type { Game } from './core'

const CLASS = 'ib-burnt'
// Letters stay burnt this long (ticks at 60 Hz), and the page never holds more than MAX at once.
const HEAL = 900
const MAX = 160
// Sample points around an impact, in pixels from its centre: a crater about seven letters wide and three lines tall.
const SPREAD: [number, number][] = []
for (let dy = -16; dy <= 16; dy += 8) {
  const w = 28 - Math.abs(dy)
  for (let dx = -w; dx <= w; dx += 7) SPREAD.push([dx, dy])
}
// Text that must stay whole: links and buttons, headings that name a section, the game's own UI.
const KEEP = 'a, button, input, label, h1, h2, script, style, [data-game-ui], .cv-tog'
const ASH = ['#0c2236', '#213b54', '#3b7cc0', '#ff5a1f']

interface Burn { span: HTMLSpanElement, healAt: number }
const burns: Burn[] = []

function caretAt(x: number, y: number): { node: Text, offset: number } | null {
  if (typeof document.caretPositionFromPoint === 'function') {
    const p = document.caretPositionFromPoint(x, y)
    return p && p.offsetNode instanceof Text ? { node: p.offsetNode, offset: p.offset } : null
  }
  // Safari before 18.4 only has the older call
  const r = document.caretRangeFromPoint?.(x, y)
  return r && r.startContainer instanceof Text ? { node: r.startContainer, offset: r.startOffset } : null
}

const range = typeof document === 'undefined' ? null : document.createRange()
const inBox = (b: DOMRect, x: number, y: number) => x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 1 && y <= b.bottom + 1

function isLetter(node: Text, i: number, x: number, y: number): boolean {
  if (!range || i < 0 || i >= node.data.length || /\s/.test(node.data[i]!)) return false
  range.setStart(node, i); range.setEnd(node, i + 1)
  return inBox(range.getBoundingClientRect(), x, y)
}

// The caret sits between letters, so the letter is whichever side's box holds the point. Inside a <summary>
// Chrome answers with the element, not the text, so those rows fall back to a scan of the text under the point.
function letterAt(x: number, y: number): { node: Text, i: number } | null {
  const c = caretAt(x, y)
  if (c) {
    for (const i of [c.offset, c.offset - 1]) if (isLetter(c.node, i, x, y)) return { node: c.node, i }
    return null
  }
  const el = document.elementFromPoint(x, y)
  if (!el || !range) return null
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
    range.selectNodeContents(n)
    if (!inBox(range.getBoundingClientRect(), x, y)) continue
    for (let i = 0; i < n.data.length; i++) if (isLetter(n, i, x, y)) return { node: n, i }
  }
  return null
}

function burnLetter(g: Game, node: Text, i: number): void {
  const el = node.parentElement
  if (!el || el.classList.contains(CLASS) || el.closest(KEEP) || !el.closest('.cv')) return
  const mid = node.splitText(i)
  mid.splitText(1)
  const span = document.createElement('span')
  span.className = CLASS
  mid.replaceWith(span)
  span.append(mid)
  burns.push({ span, healAt: g.t + HEAL + ((Math.random() * 120) | 0) })
  const b = span.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2
  // the glyph falls as a few pixels of ash
  for (let k = 0; k < 3; k++) {
    g.debris.push({ x: cx + (Math.random() - 0.5) * b.width, y: cy + (Math.random() - 0.5) * b.height, vx: (Math.random() - 0.5) * 2.4, vy: -1 - Math.random() * 2, sz: 2 + ((Math.random() * 2) | 0), c: ASH[(Math.random() * ASH.length) | 0]!, life: 0, max: 120 + ((Math.random() * 80) | 0), landed: false })
  }
}

// A random point inside a block of CV text on screen, for the shots that aim at the page instead of the cursor.
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

// One impact burns the letters under it; returns how many went.
export function scorch(g: Game, x: number, y: number): number {
  if (g.printing || !g.fxc) return 0
  let n = 0
  for (const [dx, dy] of SPREAD) {
    if (burns.length >= MAX) break
    const hit = letterAt(x + dx, y + dy)
    if (hit) { burnLetter(g, hit.node, hit.i); n++ }
  }
  if (n) fxBurst(g, x, y, 6, '#0c2236')
  return n
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

// Each letter heals on its own clock, or all at once from repairAll's wave.
export function tickScorch(g: Game): void {
  for (let i = burns.length - 1; i >= 0; i--) {
    const burn = burns[i]!
    if (g.t < burn.healAt) continue
    burns.splice(i, 1)
    heal(g, burn, true)
  }
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
  for (const burn of burns.splice(0)) heal(null, burn, false)
}
