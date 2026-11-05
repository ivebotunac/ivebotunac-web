// Pointer input: window listeners that hit, grab, carry and throw the robot, its agents and the trend tag.
import { clamp, dispScale, FETCH_GO_LINES, GRAB_LINES, LURE_LINES, pick, THROW_LINES } from './config'
import { feedback } from './effects'
import { learn, linkLine } from './guide'
import { hitPeek } from './quest'
import { hitBoss } from './boss'
import { agentAt, grabAgent, tossAgent } from './team'
import { actAlpha, heft } from './critters'
import { hitRobot, humanGrab, popRobot } from './actions'
import type { Game } from './core'
import type { Carry, Press } from './types'

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy
  let tt = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0
  tt = Math.max(0, Math.min(1, tt))
  return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy))
}

type Hist = { x: number, y: number, ms: number }[]

// Keeps the last 8 pointer samples, enough for flingVelocity's 90ms window.
function track(hist: Hist, x: number, y: number): Hist {
  hist.push({ x, y, ms: performance.now() }); if (hist.length > 8) hist.shift()
  return hist
}

// Claims a press for the game: the cursor position jumps there and the click that follows is swallowed.
function claim(g: Game, x: number, y: number): void {
  g.mouseX = x; g.mouseY = y; g.lastMove = g.t; g.swallowClick = true
}

// Pointer: a press hits at once (touch on lift), a move or hold grabs, a release throws.
// With `robot` false only a waiting agent or the boss can take it; `hold` (a still finger) grabs, no hit.
function pointerDown(g: Game, x: number, y: number, robot = true, hold = false): boolean {
  g.swallowClick = false; g.wake()
  // a waiting sub-agent, then the boss, win over the robot and the trend, even while the robot is popped
  if (hitPeek(g, x, y) || hitBoss(g, x, y)) { claim(g, x, y); return true }
  // a teammate is picked up at once, no hit; it stays grabbable while the robot is popped
  const m = robot ? agentAt(g, x, y) : null
  if (m) {
    claim(g, x, y)
    g.carry = { kind: 'agent', m, sx: x, sy: y, ox: m.x - x, oy: m.y - y, moved: true, hist: track([], x, y) }
    grabAgent(g, m)
    return true
  }
  if (g.gone > 0 || !robot) return false
  // the trend tag: a tap destroys it, a drag carries it and the robot follows
  if (g.trend && !g.trendEl.hidden) {
    const r = g.trendEl.getBoundingClientRect(), pad = g.coarse ? 16 : 12
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
      claim(g, x, y)
      g.fetch = 0
      g.carry = { kind: 'trend', m: null, sx: x, sy: y, ox: g.trend.x - x, oy: g.trend.y - y, moved: false, hist: track([], x, y) }
      return true
    }
  }
  // a vanished critter is not there to hit, so the click reaches the page
  if (Math.hypot(x - g.pos.x, y - g.pos.y) >= g.hitR() || actAlpha(g) < 0.3) return false
  g.mouseX = x; g.mouseY = y; g.lastMove = g.t
  if (!hold) hitRobot(g, (g.pos.x - x) * 0.2 + (Math.random() - 0.5) * 6)
  if (g.gone <= 0) g.press = { sx: x, sy: y, x, y, ox: g.pos.x - x, oy: g.pos.y - y, t0: g.t, moved: false, hist: track([], x, y) }
  if (hold && g.press) grabRobot(g, g.press)
  g.swallowClick = true
  return true
}

function carryMove(g: Game, c: Carry, x: number, y: number): void {
  track(c.hist, x, y)
  if (c.kind === 'agent') {
    // a restart can take the member away mid-carry
    if (!c.m || !g.team.includes(c.m)) { g.carry = null; return }
    c.m.x = clamp(x + c.ox, 12, g.W - 12); c.m.y = clamp(y + c.oy, 12, g.H - 12)
    return
  }
  const tr = g.trend
  if (!tr) { g.carry = null; return }
  if (!c.moved && Math.hypot(x - c.sx, y - c.sy) > 10) {
    c.moved = true; tr.held = true; tr.fvx = 0; tr.fvy = 0
    if (g.angryT <= 0 && !g.held) g.say(pick(LURE_LINES), 160)
  }
  if (!c.moved) return
  tr.x = x + c.ox; tr.y = y + c.oy
  // keeps the bob continuous for when it is let go
  tr.baseY = tr.y - Math.sin(tr.tt * 0.04) * 32
  if (Math.abs(x - c.hist[0]!.x) > 2) tr.vx = (x < c.hist[0]!.x ? -1 : 1) * Math.abs(tr.vx)
}

// Throw velocity is the pointer's over its last ~90ms, in pixels per tick.
function flingVelocity(hist: Hist): { vx: number, vy: number } {
  const now = performance.now(), last = hist[hist.length - 1]!, first = hist.find(h => now - h.ms < 90) ?? last
  const k = (1000 / 60) / Math.max(16, last.ms - first.ms)
  return { vx: clamp((last.x - first.x) * k, -24, 24), vy: clamp((last.y - first.y) * k, -24, 24) }
}

function carryUp(g: Game, c: Carry): void {
  g.carry = null
  const v = flingVelocity(c.hist)
  if (c.kind === 'agent') {
    if (c.m && g.team.includes(c.m)) { tossAgent(g, c.m, v.vx, v.vy); learn(g, 'toss') }
    return
  }
  const tr = g.trend
  if (!tr) return
  if (!c.moved) { humanGrab(g); return }
  tr.held = false; tr.fvx = v.vx * 0.8; tr.fvy = v.vy * 0.8
  if (Math.abs(v.vx) > 1) tr.vx = (v.vx < 0 ? -1 : 1) * Math.abs(tr.vx)
  learn(g, 'lure')
  // a real throw sends the robot after it
  if (Math.hypot(v.vx, v.vy) > 8 && !g.held && g.gone <= 0 && g.angryT <= 0 && !g.boss && !g.asleep) { g.fetch = 1; g.fetchT = 0; g.say(pick(FETCH_GO_LINES), 120) }
}

function pointerMove(g: Game, x: number, y: number): void {
  if (g.carry) { carryMove(g, g.carry, x, y); return }
  const p = g.press; if (!p) return
  track(p.hist, x, y)
  p.x = x; p.y = y
  if (!g.held && Math.hypot(x - p.sx, y - p.sy) > 10) grabRobot(g, p)
}

function pointerUp(g: Game): void {
  if (g.carry) { carryUp(g, g.carry); return }
  const p = g.press; g.press = null
  if (!p || !g.held) return
  g.held = false
  const v = flingVelocity(p.hist)
  g.knockVx = v.vx; g.knockVy = v.vy
  const fl = heft(g).fling; g.knockVx *= fl; g.knockVy *= fl
  const sp = Math.hypot(g.knockVx, g.knockVy)
  g.knockT = (70 + Math.min(60, sp * 3)) | 0; g.knockRot = 0
  learn(g, 'throw')
  if (sp > 9) {
    feedback(g, g.pos.x, g.pos.y, 'WHEEE!', '#0b6bcb'); g.say(pick(THROW_LINES), 160)
    g.angryT = Math.min(900, g.angryT + 120); g.puff += 0.08
    if (g.puff >= 1) popRobot(g)
  }
}

function grabRobot(g: Game, p: Press): void {
  p.moved = true; g.held = true; g.knockT = 0; g.knockVx = 0; g.knockVy = 0; g.attackT = 0; g.beamAt = 0
  g.say(pick(GRAB_LINES), 160); g.kick(-0.25)
}

// Binds every window listener and returns the function that removes them all.
export function bindInput(g: Game): () => void {
  // A tap is followed by compatibility mouse events; read as a mouse, it would swipe through the robot.
  const fromTouch = () => performance.now() - g.lastTouch < 800
  const onMouseMove = (e: MouseEvent) => {
    if (fromTouch()) return
    const cx = e.clientX, cy = e.clientY, now = performance.now()
    g.wake()
    // in px per ms, so a swipe takes the same flick at any mouse polling or frame rate
    g.mouseV = g.prevMouseX > -900 ? Math.hypot(cx - g.prevMouseX, cy - g.prevMouseY) / Math.max(4, now - g.prevMouseMs) : 0
    if (g.press || g.carry) pointerMove(g, cx, cy)
    else if (g.prevMouseX > -900 && g.gone <= 0) {
      const sp = Math.hypot(cx - g.prevMouseX, cy - g.prevMouseY)
      const canHit = g.knockT > 0 ? g.juggleCD <= 0 : g.hitCD <= 0
      if (g.mouseV > 1.6) {
        // fast swipe through the robot knocks it down, or juggles it while airborne
        if (canHit && segDist(g.pos.x, g.pos.y, g.prevMouseX, g.prevMouseY, cx, cy) < (36 + 18 * g.size()) * g.displayScale) {
          g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; hitRobot(g, (cx - g.prevMouseX) * 0.45)
        } else if (g.trend && !g.trendEl.hidden) {
          // fast swipe through the trend destroys it
          const r = g.trendEl.getBoundingClientRect()
          if (segDist(r.left + r.width / 2, r.top + r.height / 2, g.prevMouseX, g.prevMouseY, cx, cy) < Math.max(r.width, r.height) / 2 + 14) {
            g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; humanGrab(g)
          }
        }
      } else if (sp < 6 && g.knockT <= 0 && Math.hypot(cx - g.pos.x, cy - g.pos.y) < g.hitR()) g.petT = g.t
    }
    g.prevMouseX = cx; g.prevMouseY = cy; g.prevMouseMs = now; g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t
  }
  const onMouseOut = (e: MouseEvent) => { if (!e.relatedTarget) g.lastMove = -999 }
  // The quest HUD and team card take their own clicks, even with the robot flying over them.
  const onUi = (e: Event) => !!(e.target as Element | null)?.closest?.('[data-game-ui]')
  // Under a mouse, a link or row toggle does what it shows; only a waiting agent or the boss beats it.
  const onPage = (e: Event) => !!(e.target as Element | null)?.closest?.('a[href],button,summary,[role=button]')
  // swallowClick resets on every primary press, so a press that never clicked cannot eat a later HUD click.
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    g.swallowClick = false
    if (!fromTouch() && !onUi(e) && pointerDown(g, e.clientX, e.clientY, !onPage(e))) e.preventDefault()
  }
  // the click, if any, is dispatched before this timeout runs, so the swallow cannot outlive it
  const onMouseUp = () => { pointerUp(g); setTimeout(() => { g.swallowClick = false }, 0) }
  // A touch on the robot, trend or an agent waits: lifting taps, holding still 220ms grabs, moving scrolls.
  let pend: { sx: number, sy: number } | null = null
  let pendTO: ReturnType<typeof setTimeout> | undefined
  const dropPend = () => { clearTimeout(pendTO); pend = null }
  // No text selection while a finger holds something: a long-press callout makes Android drop the touch.
  const holdCls = (on: boolean) => { document.documentElement.classList.toggle('robot-hold', on) }
  const onMenu = (e: Event) => { if (pend || g.press || g.carry) e.preventDefault() }
  // losing focus mid-press is not a tap, so a trend still in place is let go rather than destroyed
  const onBlur = () => { dropPend(); holdCls(false); g.swallowClick = false; if (g.carry?.kind === 'trend' && !g.carry.moved) g.carry = null; pointerUp(g) }
  // The click that follows a press on the robot or the trend must not reach a link underneath.
  const onClick = (e: MouseEvent) => { if (g.swallowClick) { e.preventDefault(); e.stopPropagation(); g.swallowClick = false } }
  const onTouchStart = (e: TouchEvent) => {
    g.lastTouch = performance.now(); g.prevMouseX = -999; dropPend()
    const tch = e.touches[0]
    if (!tch || e.touches.length > 1 || onUi(e)) return
    const p = { sx: tch.clientX, sy: tch.clientY }
    // an agent or the boss takes the touch now; no click follows, so a stale swallow would eat the next tap
    if (pointerDown(g, p.sx, p.sy, false)) { e.preventDefault(); g.swallowClick = false; return }
    // no onPage check: on a phone the CV rows span the screen, so the robot is always over one; hitR decides
    pend = p
    pendTO = setTimeout(() => { pend = null; if (pointerDown(g, p.sx, p.sy, true, true)) holdCls(true); g.swallowClick = false }, 220)
  }
  const onTouchMove = (e: TouchEvent) => {
    const tch = e.touches[0]
    if (!tch) return
    if (pend) { if (Math.hypot(tch.clientX - pend.sx, tch.clientY - pend.sy) > 8) dropPend(); return }
    if (!g.press && !g.carry) return
    e.preventDefault(); pointerMove(g, tch.clientX, tch.clientY)
  }
  const onTouchEnd = (e: TouchEvent) => {
    // a lift before the hold is a quick click: hits the robot, destroys the trend or drops an agent
    if (pend) { const p = pend; dropPend(); if (pointerDown(g, p.sx, p.sy)) { pointerUp(g); e.preventDefault(); g.swallowClick = false } return }
    // whatever the finger held is let go without a click on the page under it
    if (g.press || g.carry) e.preventDefault()
    holdCls(false); pointerUp(g)
  }
  const onOver = (e: MouseEvent) => {
    g.overPage = onPage(e)
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null; if (a) linkLine(g, a.href)
  }
  const onScroll = () => { g.scrollDY += scrollY - g.scrollY; g.scrollY = scrollY; g.wake() }
  // A shrunk or rotated viewport must not leave it off-screen until its next wander.
  const onResize = () => {
    g.W = innerWidth; g.H = innerHeight; g.displayScale = dispScale(g.W); g.sizeFx(); g.homeTgt = null
    g.pos.x = clamp(g.pos.x, 24, g.W - 24); g.pos.y = clamp(g.pos.y, 30, g.H - 30); g.prevX = g.pos.x; g.prevY = g.pos.y
  }

  const ac = new AbortController(), signal = ac.signal
  window.addEventListener('mousemove', onMouseMove, { passive: true, signal })
  window.addEventListener('mouseout', onMouseOut, { passive: true, signal })
  window.addEventListener('mousedown', onMouseDown, { signal })
  window.addEventListener('mouseup', onMouseUp, { passive: true, signal })
  window.addEventListener('blur', onBlur, { signal })
  window.addEventListener('click', onClick, { capture: true, signal })
  window.addEventListener('touchstart', onTouchStart, { passive: false, signal })
  window.addEventListener('touchmove', onTouchMove, { passive: false, signal })
  window.addEventListener('touchend', onTouchEnd, { passive: false, signal })
  window.addEventListener('touchcancel', onBlur, { passive: true, signal })
  window.addEventListener('contextmenu', onMenu, { signal })
  window.addEventListener('scroll', onScroll, { passive: true, signal })
  document.addEventListener('mouseover', onOver, { passive: true, signal })
  window.addEventListener('resize', onResize, { passive: true, signal })

  return () => { ac.abort(); dropPend(); holdCls(false) }
}
