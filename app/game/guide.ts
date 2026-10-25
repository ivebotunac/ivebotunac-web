// Teaches the game one skill at a time and remembers the visitor, in their own browser only.
import { LINK_LINES, TUT_LINES, pick, welcomeLines, welcomePopLines } from './config'
import type { Game } from './core'

export type Skill = keyof typeof TUT_LINES

export interface Memory { learned: Skill[], best: number, pops: number, visits: number }

const KEY = 'ib-robot-v1'
// A calm-time hint repeats after 45 s; any hint is said at most three times a visit.
const REPEAT = 2700
const MAX_SAID = 3

export function loadMemory(): Memory {
  const m: Memory = { learned: [], best: 0, pops: 0, visits: 0 }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (Array.isArray(raw.learned)) m.learned = raw.learned
    for (const k of ['best', 'pops', 'visits'] as const) if (typeof raw[k] === 'number') m[k] = raw[k]
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
  g.say(g.coarse ? l.touch : l.mouse, 300)
}

// Hit, throw and pet are taught in calm moments; returns whether it spoke.
export function calmHint(g: Game): boolean {
  if (!g.greeted && g.t > 240) {
    g.greeted = true
    if (g.mem.visits > 1 && knows(g, 'hit')) { g.say(pick(g.mem.pops ? welcomePopLines : welcomeLines), 240); return true }
  }
  if (g.t < 360) return false
  let s: Skill | null = null
  if (!knows(g, 'hit')) s = 'hit'
  // throwing comes once they have played a little: popped it, or a minute on the page
  else if (!knows(g, 'throw') && (knows(g, 'pop') || g.t > 3600)) s = 'throw'
  else if (!knows(g, 'pet') && !g.coarse && knows(g, 'throw')) s = 'pet'
  if (!s || (g.hintSaid[s] && g.t - g.hintAt < REPEAT)) return false
  if ((g.hintSaid[s] || 0) >= MAX_SAID) return false
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
