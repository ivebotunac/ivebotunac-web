// What a recruited team does besides following the robot, on the fx canvas, rate-limited and capped.
import { MONO, agentBossHitLines, agentGrabLines, agentLandLines, agentTossLines, agentTossRobotLines, bossReviewLines, clamp, pick, rand, reviewLines, vary } from './config'
import { ROLE_INFO } from './agents'
import { feedback, fireBeam, fxBurst } from './effects'
import { knockTrend } from './actions'
import { bossFighting, bossR, hurtBoss } from './boss'
import type { Game } from './core'
import type { Glyph, AgentRole, TeamMember } from './types'

const MAX_SHOTS = 24
const MAX_GLYPHS = 6
const MAX_ROCKETS = 3
// fxp is shared with every burst, so rocket trails stop feeding it past this
const MAX_TRAIL = 260
const NOTE = 150
const FONT = '700 10px ' + MONO

const member = (g: Game, role: AgentRole) => g.team.find(m => m.role === role)

function note(m: TeamMember, text: string): void {
  m.note = text; m.noteT = NOTE
}

function glyph(g: Game, kind: Glyph['kind'], m: TeamMember, max: number): void {
  if (g.crew.glyphs.length < MAX_GLYPHS) g.crew.glyphs.push({ kind, role: m.role, x: m.x, y: m.y - 22, life: 0, max })
}

// A volley staggers its shots with negative life: each waits a few ticks before it leaves.
function shoot(g: Game, m: TeamMember, tx: number, ty: number, n: number, sp: number, dmg: number, boss: boolean): void {
  const ang = Math.atan2(ty - m.y, tx - m.x), c = ROLE_INFO[m.role].c
  for (let i = 0; i < n && g.crew.shots.length < MAX_SHOTS; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.12
    g.crew.shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: -i * 5, max: 110, c, dmg, boss })
  }
}

// The Researcher hovers above the trend tag and lands a few beams of its own.
function research(g: Game, m: TeamMember): boolean {
  const tr = g.trend
  if (!tr || g.angryT > 0) return false
  const cx = tr.x + 45, cy = tr.y + 12
  const tx = clamp(cx + (tr.vx > 0 ? 70 : -70), 20, g.W - 20), ty = clamp(tr.y - 34, 20, g.H - 20)
  m.x += (tx - m.x) * 0.06; m.y += (ty - m.y) * 0.06
  m.dir = cx < m.x ? -1 : 1
  if (m.cd <= 0 && tr.x > 70 && tr.x < g.W - 70 && Math.hypot(cx - m.x, cy - m.y) < 220) {
    fireBeam(g, m.x, m.y, cx, cy, ROLE_INFO.researcher.c); fxBurst(g, cx, cy, 4, '#ffffff')
    tr.hits++; m.cd = vary(50, 30)
  }
  return true
}

// The Coder fires at a cursor that is moving right now, far less often than the robot attacks.
function code(g: Game, m: TeamMember): void {
  if (m.cd > 0 || g.coarse || g.t - g.lastMove > 12 || g.attackT > 0 || g.trend || g.t < 600) return
  if (Math.hypot(g.mouseX - m.x, g.mouseY - m.y) > 380) return
  shoot(g, m, g.mouseX, g.mouseY, 3, 4.2, 0, false)
  m.cd = vary(1000, 800)
}

// During the fight the team fans out in an arc under the boss and fires at it.
function bossDuty(g: Game, m: TeamMember): boolean {
  const b = g.boss!, n = Math.max(1, g.team.length - 1)
  const a = Math.PI * (0.12 + 0.76 * (g.team.length > 1 ? Math.min(1, m.slot / n) : 0.5))
  const R = bossR(g) + 50
  const tx = clamp(b.x + Math.cos(a) * R, 20, g.W - 20)
  const ty = clamp(b.y + Math.sin(a) * R * 0.75 + 14 + Math.sin(g.t * 0.07 + m.slot) * 4, 20, g.H - 20)
  m.x += (tx - m.x) * 0.07; m.y += (ty - m.y) * 0.07
  m.dir = b.x < m.x ? -1 : 1
  if (m.cd > 0 || b.phase !== 'fight') return true
  if (m.role === 'coder') shoot(g, m, b.x, b.y, 3, 5, 0.3, true)
  else if (m.role === 'researcher') {
    fireBeam(g, m.x, m.y, b.x, b.y, ROLE_INFO.researcher.c); fxBurst(g, b.x + rand(-12, 12), b.y + rand(-12, 12), 5, '#36c6e0')
    hurtBoss(g, 0.6, false)
  } else {
    shoot(g, m, b.x, b.y, 1, 5, 0.5, true)
    if (m.role === 'reviewer' && m.noteT <= 0 && Math.random() < 0.25) note(m, pick(bossReviewLines))
  }
  m.cd = vary(90, 50)
  return true
}

// Per tick per member, before formation; true only when it moved the member itself.
export function teamBehaviour(g: Game, m: TeamMember): boolean {
  if (m.noteT > 0) m.noteT--
  if (g.held || g.asleep) return false
  if (m.cd > 0) m.cd--
  if (bossFighting(g)) return bossDuty(g, m)
  if (g.gone > 0 || g.flyby > 0) return false
  if (m.role === 'researcher') return research(g, m)
  if (m.role === 'coder') code(g, m)
  else if (m.role === 'reviewer' && m.cd <= 0 && g.t > 600) { note(m, pick(reviewLines)); m.cd = vary(1500, 1200) } else if (m.role === 'analyst' && m.cd <= 0 && g.t > 600) { glyph(g, 'chart', m, 90); m.cd = vary(1300, 1100) }
  return false
}

// Called by shootAndCatch just before the caught trend is cleared.
export function onTrendCaught(g: Game): void {
  const m = member(g, 'researcher')
  if (!m || g.held || g.asleep || bossFighting(g)) return
  glyph(g, 'sparkle', m, 70)
  note(m, 'reading…')
  fxBurst(g, m.x, m.y, 6, '#36c6e0')
}

// The Deployer's rocket: up and away after a pop, or homing on the boss after a big hit.
export function deployRocket(g: Game, boss: boolean): void {
  const m = member(g, 'deployer')
  if (!m || g.held || g.asleep || g.crew.rockets.length >= MAX_ROCKETS) return
  g.crew.rockets.push({ x: m.x, y: m.y - 8, vx: rand(-1.2, 1.2), vy: -3.2, life: 0, max: boss ? 120 : 70, boss })
  fxBurst(g, m.x, m.y + 10, 8, '#ffd23b')
}

// Moves the team's shots, rockets and glyphs, and tracks the robot's heading for the Planner's path.
export function tickCrew(g: Game): void {
  const cr = g.crew, recent = g.t - g.lastMove < 90
  const vx = g.pos.x - cr.lx, vy = g.pos.y - cr.ly
  cr.lx = g.pos.x; cr.ly = g.pos.y
  // a respawn or a resize jumps the robot; that is not a heading
  if (Math.abs(vx) < 60 && Math.abs(vy) < 60) { cr.vx += (vx - cr.vx) * 0.15; cr.vy += (vy - cr.vy) * 0.15 }
  const moving = Math.hypot(cr.vx, cr.vy) > 1.1 && !g.held && !g.asleep && g.gone <= 0 && g.knockT <= 0 && !bossFighting(g)
  cr.plan = clamp(cr.plan + (moving ? 0.06 : -0.04), 0, 1)

  for (let i = cr.shots.length - 1; i >= 0; i--) {
    const s = cr.shots[i]!
    if (s.life++ < 0) continue
    const b = g.boss
    if (s.boss && b) {
      // a light homing, so shots still land on a drifting boss
      const a = Math.atan2(b.y - s.y, b.x - s.x), sp = Math.hypot(s.vx, s.vy)
      s.vx += (Math.cos(a) * sp - s.vx) * 0.12; s.vy += (Math.sin(a) * sp - s.vy) * 0.12
    }
    s.x += s.vx; s.y += s.vy
    if (s.boss && b && Math.hypot(s.x - b.x, s.y - b.y) < bossR(g) - g.tapPad) {
      fxBurst(g, s.x, s.y, 4, s.c); hurtBoss(g, s.dmg, false); cr.shots.splice(i, 1); continue
    }
    if (!s.boss && recent && Math.hypot(s.x - g.mouseX, s.y - g.mouseY) < 16) {
      fxBurst(g, s.x, s.y, 6, s.c)
      g.popups.push({ x: g.mouseX, y: g.mouseY - 12, text: 'bug!', life: 0, max: 44, c: s.c, size: 11 })
      cr.shots.splice(i, 1); continue
    }
    if (s.life > s.max || s.x < -20 || s.x > g.W + 20 || s.y < -20 || s.y > g.H + 20) cr.shots.splice(i, 1)
  }

  for (let i = cr.rockets.length - 1; i >= 0; i--) {
    const r = cr.rockets[i]!, b = g.boss
    r.life++
    if (r.boss && b && r.life > 14) {
      const a = Math.atan2(b.y - r.y, b.x - r.x)
      r.vx += (Math.cos(a) * 6 - r.vx) * 0.08; r.vy += (Math.sin(a) * 6 - r.vy) * 0.08
    } else { r.vy -= 0.12; r.vx += Math.sin(r.life * 0.3) * 0.15 }
    r.x += r.vx; r.y += r.vy
    if (g.fxp.length < MAX_TRAIL) g.fxp.push({ x: r.x - r.vx, y: r.y - r.vy, vx: -r.vx * 0.2 + rand(-0.4, 0.4), vy: -r.vy * 0.2 + rand(-0.4, 0.4), life: 0, max: 16 + rand(0, 10), c: pick(['#ffd23b', '#ff5a1f', '#ffffff']) })
    const hit = r.boss && b && Math.hypot(r.x - b.x, r.y - b.y) < bossR(g) - g.tapPad
    if (hit) hurtBoss(g, 4, false)
    if (hit || r.life >= r.max || r.y < -20 || r.x < -20 || r.x > g.W + 20) {
      fxBurst(g, r.x, r.y, 12, '#ffd23b'); fxBurst(g, r.x, r.y, 6, '#ffffff')
      g.rings.push({ x: r.x, y: r.y, life: 0, max: 20, c: '#ff5a1f' })
      cr.rockets.splice(i, 1)
    }
  }

  for (let i = cr.glyphs.length - 1; i >= 0; i--) {
    const q = cr.glyphs[i]!
    if (++q.life >= q.max) cr.glyphs.splice(i, 1)
  }
}

function fade(life: number, max: number, tail: number): number {
  return life > max - tail ? Math.max(0, (max - life) / tail) : 1
}

// A dotted path from the robot along its heading, ending in a small waypoint cross.
function drawPlan(c: CanvasRenderingContext2D, g: Game): void {
  const cr = g.crew
  if (cr.plan <= 0.02 || g.gone > 0 || !member(g, 'planner')) return
  const sp = Math.hypot(cr.vx, cr.vy) || 1, ux = cr.vx / sp, uy = cr.vy / sp
  const d0 = 22 * g.size() * g.DS, len = clamp(sp * 26, 50, 120), off = (g.t * 0.5) % 16
  c.fillStyle = ROLE_INFO.planner.c
  for (let i = 0; i < 8; i++) {
    const d = d0 + off + i * 16
    if (d > d0 + len) break
    c.globalAlpha = cr.plan * (1 - i / 9) * 0.9
    c.fillRect(Math.round(g.pos.x + ux * d) - 2, Math.round(g.pos.y + uy * d) - 2, 4, 4)
  }
  const ex = Math.round(g.pos.x + ux * (d0 + len + 10)), ey = Math.round(g.pos.y + uy * (d0 + len + 10))
  c.globalAlpha = cr.plan * 0.8; c.fillStyle = '#ff5a1f'
  for (let k = -3; k <= 3; k++) { c.fillRect(ex + k - 1, ey + k - 1, 2, 2); c.fillRect(ex + k - 1, ey - k - 1, 2, 2) }
  c.globalAlpha = 1
}

function drawChart(c: CanvasRenderingContext2D, q: Glyph): void {
  const k = Math.min(1, q.life / 24), x = Math.round(q.x - 9), y = Math.round(q.y - q.life * 0.4)
  const bars: [number, string][] = [[5, '#36c6e0'], [9, '#ff5a1f'], [7, '#36c6e0'], [13, '#0b6bcb']]
  c.globalAlpha = fade(q.life, q.max, 25)
  c.fillStyle = '#f5f9fd'; c.fillRect(x - 2, y - 16, 22, 19)
  c.fillStyle = '#0c2236'; c.fillRect(x - 2, y + 2, 22, 1); c.fillRect(x - 2, y - 16, 1, 18)
  bars.forEach(([h, col], i) => { c.fillStyle = col; const bh = Math.round(h * k); c.fillRect(x + i * 5, y + 1 - bh, 4, bh) })
  c.globalAlpha = 1
}

function drawSparkle(c: CanvasRenderingContext2D, g: Game, q: Glyph): void {
  const m = member(g, q.role)
  if (!m) return
  c.globalAlpha = fade(q.life, q.max, 20)
  for (let i = 0; i < 4; i++) {
    const a = q.life * 0.06 + i * Math.PI / 2, r = 16 + Math.sin(q.life * 0.2 + i) * 3
    const x = Math.round(m.x + Math.cos(a) * r), y = Math.round(m.y - 4 + Math.sin(a) * r * 0.7)
    const arm = (q.life + i * 5) % 16 < 8 ? 3 : 1
    c.fillStyle = i % 2 ? '#ffffff' : '#36c6e0'
    c.fillRect(x - arm, y, arm * 2 + 1, 1); c.fillRect(x, y - arm, 1, arm * 2 + 1)
  }
  c.globalAlpha = 1
}

function drawNote(c: CanvasRenderingContext2D, m: TeamMember): void {
  const age = NOTE - m.noteT, rise = Math.min(1, age / 8)
  c.font = FONT
  const w = Math.ceil(c.measureText(m.note).width) + 10, h = 15
  const x = Math.round(m.x - w / 2), y = Math.round(m.y - 24 - h - rise * 4)
  c.globalAlpha = fade(age, NOTE, 20) * rise
  c.fillStyle = '#0c2236'; c.fillRect(x + 2, y + 2, w, h)
  c.fillStyle = '#f5f9fd'; c.fillRect(x, y, w, h)
  c.strokeStyle = '#0c2236'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  c.fillStyle = '#f5f9fd'; c.fillRect(Math.round(m.x) - 2, y + h - 1, 4, 3)
  c.fillStyle = '#0c2236'; c.fillRect(Math.round(m.x) - 3, y + h - 1, 1, 3); c.fillRect(Math.round(m.x) + 2, y + h - 1, 1, 3); c.fillRect(Math.round(m.x) - 2, y + h + 2, 4, 1)
  c.textAlign = 'center'; c.fillText(m.note, Math.round(m.x), y + 11)
  c.globalAlpha = 1
}

function drawRocket(c: CanvasRenderingContext2D, r: { x: number, y: number, vx: number, vy: number }): void {
  c.save(); c.translate(Math.round(r.x), Math.round(r.y)); c.rotate(Math.atan2(r.vy, r.vx) + Math.PI / 2)
  c.fillStyle = '#ffd23b'; c.fillRect(-2, -5, 4, 8)
  c.fillStyle = '#ff5a1f'; c.fillRect(-1, -7, 2, 2); c.fillRect(-4, 1, 2, 3); c.fillRect(2, 1, 2, 3)
  c.fillStyle = '#0c2236'; c.fillRect(-1, -3, 2, 2)
  c.restore()
}

// The Planner's path goes under the team; shots, rockets, glyphs and notes over it.
export function drawPlanPath(g: Game): void {
  if (g.fxc) drawPlan(g.fxc, g)
}

export function drawCrew(g: Game): void {
  const c = g.fxc; if (!c) return
  const cr = g.crew
  for (const s of cr.shots) {
    if (s.life < 0) continue
    c.fillStyle = s.c; c.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4)
    c.globalAlpha = 0.4; c.fillRect(Math.round(s.x - s.vx) - 1, Math.round(s.y - s.vy) - 1, 2, 2); c.globalAlpha = 1
  }
  for (const r of cr.rockets) drawRocket(c, r)
  for (const q of cr.glyphs) { if (q.kind === 'chart') drawChart(c, q); else drawSparkle(c, g, q) }
  for (const m of g.team) if (m.noteT > 0 && m.note) drawNote(c, m)
}

// The visitor carries and throws agents: a short flight, a hit on what it meets, a dizzy landing.
const TEAM_HALF = 16

// The member under a press, the one drawn last winning.
export function agentAt(g: Game, x: number, y: number): TeamMember | null {
  const r = TEAM_HALF + g.tapPad
  for (let i = g.team.length - 1; i >= 0; i--) {
    const m = g.team[i]!
    if (Math.abs(x - m.x) < r && Math.abs(y - m.y) < r) return m
  }
  return null
}

export function grabAgent(g: Game, m: TeamMember): void {
  m.held = true; m.air = 0
  note(m, pick(agentGrabLines))
  fxBurst(g, m.x, m.y, 6, ROLE_INFO[m.role].c)
  g.buzz(12)
}

// `vx`/`vy` in pixels per tick, the same scale the robot's throw uses.
export function tossAgent(g: Game, m: TeamMember, vx: number, vy: number): void {
  const sp = Math.hypot(vx, vy)
  m.held = false; m.vx = vx; m.vy = vy; m.air = (30 + Math.min(70, sp * 4)) | 0; m.struck = false
  if (sp > 9) {
    note(m, pick(agentTossLines))
    if (Math.random() < 0.35 && g.gone <= 0 && !g.held) g.say(pick(agentTossRobotLines).replace('{r}', ROLE_INFO[m.role].label), 180)
  }
}

// A thrown agent hits what it meets once a throw: the boss takes damage by speed, the trend tag drops.
function strike(g: Game, m: TeamMember): void {
  const b = g.boss, sp = Math.hypot(m.vx, m.vy), c = ROLE_INFO[m.role].c
  if (b && b.phase === 'fight' && Math.hypot(m.x - b.x, m.y - b.y) < bossR(g)) {
    m.struck = true
    hurtBoss(g, Math.min(12, 2 + sp * 0.5), sp > 14)
    g.freeze = 3; g.buzz(20)
    fxBurst(g, m.x, m.y, 14, c); fxBurst(g, m.x, m.y, 8, '#ffffff')
    feedback(g, m.x, m.y, 'THROWN!', c); note(m, pick(agentBossHitLines))
    m.vx *= -0.5; m.vy *= -0.5
    return
  }
  const tr = g.trend
  if (!tr || tr.held || g.trendEl.hidden) return
  const w = g.trendEl.offsetWidth || 90, h = g.trendEl.offsetHeight || 24
  if (m.x > tr.x - 12 && m.x < tr.x + w + 12 && m.y > tr.y - 12 && m.y < tr.y + h + 12) {
    m.struck = true
    knockTrend(g, ROLE_INFO[m.role].label)
  }
}

// Per tick before the behaviours: true while the member is carried or flying, so formation skips it.
export function flyAgent(g: Game, m: TeamMember): boolean {
  if (m.held) {
    if (m.noteT > 0) m.noteT--
    // a little struggle in the hand
    m.rot = Math.sin(g.t * 0.45) * 0.22
    return true
  }
  if (m.air <= 0) {
    if (m.rot !== 0) { m.rot *= 0.82; if (Math.abs(m.rot) < 0.02) m.rot = 0 }
    return false
  }
  if (m.noteT > 0) m.noteT--
  m.air--
  m.x += m.vx; m.y += m.vy; m.vx *= 0.955; m.vy *= 0.955
  m.rot += m.vx * 0.05
  if (!m.struck && Math.hypot(m.vx, m.vy) > 5) strike(g, m)
  if (m.x < TEAM_HALF || m.x > g.W - TEAM_HALF) { m.x = clamp(m.x, TEAM_HALF, g.W - TEAM_HALF); m.vx *= -0.7; fxBurst(g, m.x, m.y, 5, ROLE_INFO[m.role].c) }
  if (m.y < TEAM_HALF || m.y > g.H - TEAM_HALF) { m.y = clamp(m.y, TEAM_HALF, g.H - TEAM_HALF); m.vy *= -0.7; fxBurst(g, m.x, m.y, 5, ROLE_INFO[m.role].c) }
  if (Math.abs(m.vx) > 0.5) m.dir = m.vx < 0 ? -1 : 1
  if (m.air === 0) note(m, pick(agentLandLines))
  return true
}
