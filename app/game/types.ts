import type { Game } from './core'

// The elements the component renders and hands to start().
export interface GameRefs {
  pet: HTMLElement
  canvas: HTMLCanvasElement
  bubble: HTMLElement
  trend: HTMLElement
  fx: HTMLCanvasElement
  rage: HTMLElement
}

export type Mode = 'held' | 'knock' | 'chase' | 'attack' | 'idle'
export type AttackKind = 'bullets' | 'beam' | 'melee' | 'ball'
export type AttackPhase = 'approach' | 'return'

export interface Point { x: number, y: number }

export interface Spark { x: number, y: number, vx: number, vy: number, life: number, max: number, c: string }
export interface Beam { x1: number, y1: number, x2: number, y2: number, life: number, max: number, c: string }
export interface Bullet { x: number, y: number, vx: number, vy: number, life: number, max: number }
export interface Ball { x: number, y: number, vx: number, vy: number, spin: number, dspin: number, life: number, max: number }
export interface Debris { x: number, y: number, vx: number, vy: number, sz: number, c: string, life: number, max: number, landed: boolean }
export interface Ring { x: number, y: number, life: number, max: number, c?: string }
export interface Popup { x: number, y: number, text: string, life: number, max: number, c?: string, size?: number }
// `held` while the visitor drags it; `fvx`/`fvy` is the throw, which decays back into its own cruise.
export interface Trend { x: number, baseY: number, y: number, vx: number, tt: number, label: string, hits: number, held: boolean, fvx: number, fvy: number }
// A press that landed on the robot: becomes a grab once it moves, a throw when released.
export interface Press { sx: number, sy: number, x: number, y: number, ox: number, oy: number, t0: number, moved: boolean, hist: { x: number, y: number, ms: number }[] }
// An agent or the trend tag in the visitor's hand: `ox`/`oy` keep the grab point, `hist` gives the throw, `moved` turns a trend press from a tap into a drag.
export interface Carry { kind: 'agent' | 'trend', m: TeamMember | null, sx: number, sy: number, ox: number, oy: number, moved: boolean, hist: { x: number, y: number, ms: number }[] }

// ---- the "Assemble the team" quest ----
export type Role = 'planner' | 'researcher' | 'analyst' | 'reviewer' | 'coder' | 'deployer'
// A recruited sub-agent trailing the robot; `tx`/`ty` is its formation spot, set before the behaviours run.
// `cd` is the behaviour cooldown in ticks; `note`/`noteT` is a tiny speech popup above the member.
// `held` while the visitor carries it, `air` the ticks left of a throw at `vx`/`vy`, `rot` its spin.
export interface TeamMember { role: Role, x: number, y: number, tx: number, ty: number, dir: number, slot: number, cd: number, note: string, noteT: number, held: boolean, air: number, vx: number, vy: number, rot: number }
// Runs once per tick per member, before formation; returning true means it moved the member itself.
export type TeamBehaviour = (g: Game, m: TeamMember) => boolean
// An agent that popped out of an opened CV row and waits to be clicked; it follows the row as the page scrolls.
export interface Peek { role: Role, row: HTMLDetailsElement, x: number, y: number, ox: number, life: number, phase: 'out' | 'wait' | 'in' }
export interface Confetti { x: number, y: number, vx: number, vy: number, rot: number, vr: number, c: string, life: number, max: number }
// What the HUD shows; the component holds it reactively.
// bossRun: the fastest finished boss fight the card shows and offers to sign; bossMs: its time.
export interface QuestView { team: Role[], done: boolean, ms: number | null, bossRun: string | null, bossMs: number | null, boss: boolean }
// The game's way out to the Vue layer: HUD state, screen-reader lines, and the finished team.
export interface QuestBridge {
  view(v: QuestView): void
  announce(text: string): void
  // the last recruit: posts the time at once, so a reload during the fly-by cannot lose it
  finished(ms: number): void
  // the end of the fly-by: opens the team card
  complete(): void
  // a won boss fight, its run and its time by the game's clock: posts it, then opens the card on the boss board
  bossDone(run: string | null, ms: number): void
}

// ---- team behaviours (team.ts) ----
// A team projectile: `boss` shots fly at the boss and damage it, the rest at the cursor.
export interface Shot { x: number, y: number, vx: number, vy: number, life: number, max: number, c: string, dmg: number, boss: boolean }
// A small glyph tied to a member: the Analyst's rising chart or the Researcher's reading sparkle.
export interface Glyph { kind: 'chart' | 'sparkle', role: Role, x: number, y: number, life: number, max: number }
export interface Rocket { x: number, y: number, vx: number, vy: number, life: number, max: number, boss: boolean }
export interface Crew { shots: Shot[], glyphs: Glyph[], rockets: Rocket[], lx: number, ly: number, vx: number, vy: number, plan: number }

// ---- the AGI boss (boss.ts) ----
// A slow orb: `lock` glides to a telegraphed spot and bursts there, `spread` flies straight on.
export interface BossOrb { kind: 'lock' | 'spread', x: number, y: number, sx: number, sy: number, tx: number, ty: number, vx: number, vy: number, life: number, max: number }
export interface Boss {
  phase: 'enter' | 'fight' | 'dying' | 'leave'
  x: number, y: number, t: number, hp: number, max: number, shown: number
  flash: number, shake: number, combo: number, comboT: number, lastHit: number, quarter: number
  atkCD: number, tele: { kind: 'lock' | 'spread', x: number, y: number, life: number, max: number } | null
  orbs: BossOrb[], ms: number, last: number, fireCD: number
  // the server's id for this fight, which times it for the boss board
  run: string | null
  // where it is pushed off its sweep (dashes and teleports set it, then it drifts back), the move under way,
  // and the ticks until the next move and the next barrage
  offX: number, offY: number, mv: BossMove | null, mvCD: number, burstCD: number
}
// A dash glides fast to a new spot; a teleport flickers, vanishes, and lands somewhere else.
export interface BossMove { kind: 'dash' | 'tp', t: number, sx: number, sy: number, tx: number, ty: number }
