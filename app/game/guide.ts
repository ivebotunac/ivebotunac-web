// Teaches the game one skill at a time and remembers the visitor, in their own browser only.
import { LINK_LINES, TUT_LINES, DEPLOYER_LINES, LAST_AGENT_LINE, LAST_DEPLOYER_LINE, pick, RECRUIT_LINES, ROW_RECRUIT_LINE, WELCOME_LINES, WELCOME_POP_LINES } from './config'
import { ROLES, ROLE_INFO } from './agents'
import { CRITTERS } from './critters'
import type { Game } from './core'
import type { AgentRole } from './types'

export type Skill = keyof typeof TUT_LINES

// team: roles recruited; teamActiveMs: page time while the team was incomplete, summed over visits.
// teamMs: the finished time; bossRun/bossRunMs: the fastest fight's server id and time; seen: critter forms met.
// bossMs: the best boss fight time on this device; a restart clears it.
export interface Memory {
  learned: Skill[], best: number, pops: number, visits: number, team: AgentRole[], teamActiveMs: number, teamMs: number | null,
  bossRun: string | null, bossRunMs: number | null, seen: string[], bossMs: number | null
}

const KEY = 'ib-robot-v1'
// A calm-time hint repeats after 45 s; any hint is said at most three times a visit.
const REPEAT = 2700
const MAX_SAID = 3

export function loadMemory(): Memory {
  const m: Memory = { learned: [], best: 0, pops: 0, visits: 0, team: [], teamActiveMs: 0, teamMs: null, bossRun: null, bossRunMs: null, seen: [], bossMs: null }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (Array.isArray(raw.learned)) m.learned = raw.learned
    for (const k of ['best', 'pops', 'visits'] as const) if (typeof raw[k] === 'number') m[k] = raw[k]
    if (Array.isArray(raw.team)) m.team = ROLES.filter(r => raw.team.includes(r))
    if (typeof raw.teamActiveMs === 'number') m.teamActiveMs = raw.teamActiveMs
    // memory saved before teamActiveMs has only teamStartedAt: use the wall time since, capped at an hour
    else if (m.team.length && typeof raw.teamStartedAt === 'number') m.teamActiveMs = Math.max(0, Math.min(Date.now() - raw.teamStartedAt, 3600000))
    if (typeof raw.teamMs === 'number') m.teamMs = raw.teamMs
    if (typeof raw.bossRun === 'string') m.bossRun = raw.bossRun
    if (typeof raw.bossRunMs === 'number') m.bossRunMs = raw.bossRunMs
    if (typeof raw.bossMs === 'number') m.bossMs = raw.bossMs
    if (Array.isArray(raw.seen)) m.seen = CRITTERS.filter(k => raw.seen.includes(k))
  } catch { /* storage blocked or corrupt: start fresh */ }
  m.visits++
  return m
}

export function saveMemory(g: Game): void {
  try { localStorage.setItem(KEY, JSON.stringify(g.mem)) } catch { /* storage blocked */ }
}

export function learn(g: Game, s: Skill): void {
  if (g.mem.learned.includes(s)) return
  g.mem.learned.push(s); saveMemory(g)
}

const knows = (g: Game, s: Skill) => g.mem.learned.includes(s)

function hint(g: Game, s: Skill): void {
  const said = g.hintSaid[s] || 0
  if (said >= MAX_SAID) return
  g.hintSaid[s] = said + 1; g.hintAt = g.t
  const l = TUT_LINES[s]
  g.say((g.coarse && l.touch) || l.mouse, 300)
}

// Hit, throw, pet, the quest, carrying agents and luring are taught in calm moments; returns if it spoke.
export function calmHint(g: Game): boolean {
  if (!g.greeted && g.t > 240) {
    g.greeted = true
    if (g.mem.visits > 1 && knows(g, 'hit')) { g.say(pick(g.mem.pops ? WELCOME_POP_LINES : WELCOME_LINES), 240); return true }
  }
  if (g.t < 360) return false
  const want: Skill[] = []
  if (!knows(g, 'hit')) want.push('hit')
  // throwing comes once they have played a little: popped it, or a minute on the page
  else if (!knows(g, 'throw') && (knows(g, 'pop') || g.t > 3600)) want.push('throw')
  else if (!knows(g, 'pet') && !g.coarse && knows(g, 'throw')) want.push('pet')
  // the quest comes after half a minute, until the first agent is found
  if (!knows(g, 'team') && g.t > 1800) want.push('team')
  // carrying agents and luring with the trend, once there is a team to throw and a trend in the air
  if (!knows(g, 'toss') && g.team.length > 0 && knows(g, 'throw')) want.push('toss')
  if (!knows(g, 'lure') && g.trend && !g.trend.held && knows(g, 'hit')) want.push('lure')
  // a hint not yet said goes before a repeat of another
  const s = want.find(k => !g.hintSaid[k]) ?? want.find(k => (g.hintSaid[k] || 0) < MAX_SAID)
  // the first hint in line speaks at once; a repeat, or a hint queued behind another, waits REPEAT ticks
  if (!s || ((g.hintSaid[s] || s !== want[0]) && g.t - g.hintAt < REPEAT)) return false
  hint(g, s)
  return true
}

// Juggling and inflation are taught at the moment they apply.
export function onKnock(g: Game): void {
  learn(g, 'hit')
  if (!knows(g, 'juggle')) hint(g, 'juggle')
}

export function onJuggle(g: Game): void {
  learn(g, 'juggle')
  if (g.combo === 3 && !knows(g, 'pop')) hint(g, 'pop')
}

export function onPop(g: Game): void {
  g.mem.best = Math.max(g.mem.best, g.combo); g.mem.pops++
  learn(g, 'pop'); saveMemory(g)
  // after the respawn line, the next calm hint is the grab
  if (!knows(g, 'throw')) { g.hintSaid.throw = 0; g.hintAt = -REPEAT }
}

// A finished combo of 3 or more reports against the visitor's record.
export function endCombo(g: Game): void {
  const c = g.combo
  if (c < 3) return
  if (c > g.mem.best) {
    const first = g.mem.best === 0
    g.mem.best = c; saveMemory(g)
    g.say(first ? c + 'x combo. not bad.' : c + 'x. new record!', 220)
  } else if (c >= 5 && Math.random() < 0.5) g.say(c + 'x. your record is ' + g.mem.best + 'x.', 220)
}

export function linkLine(g: Game, href: string): void {
  if (g.coarse || g.gone > 0 || g.held || g.knockT > 0 || g.linkCD > 0) return
  const kind = Object.keys(LINK_LINES).find(k => href.includes(k))
  if (!kind || g.linksSeen.has(kind)) return
  g.linksSeen.add(kind); g.linkCD = 300
  g.say(pick(LINK_LINES[kind]!), 220)
}

// Progress line after a recruit, naming its CV row if any; the sixth recruit gets the completion line.
export function recruitLine(g: Game, role: AgentRole, row = ''): string {
  learn(g, 'team')
  const left = ROLES.filter(r => !g.mem.team.includes(r))
  if (!left.length) return ''
  if (role === 'deployer' && left.length > 1) return pick(DEPLOYER_LINES)
  const last = left.length === 1 ? left[0]! : null
  if (last === 'deployer') return LAST_DEPLOYER_LINE
  if (last) return LAST_AGENT_LINE.replace('{r}', ROLE_INFO[last].label).replace('{s}', ROLE_INFO[last].where)
  const line = row ? ROW_RECRUIT_LINE.replace('{row}', () => row) : pick(RECRUIT_LINES)
  return line.replace('{r}', ROLE_INFO[role].label) + ' ' + g.mem.team.length + '/' + ROLES.length + '.'
}
