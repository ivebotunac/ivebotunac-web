// The elements the component renders and hands to start().
export interface GameRefs {
  pet: HTMLElement
  canvas: HTMLCanvasElement
  bubble: HTMLElement
  trend: HTMLElement
  fx: HTMLCanvasElement
  rage: HTMLElement
}

// 'robot', or the key of a critter sprite in critters/.
export type FormName = string

export type Mood = 'idle' | 'happy' | 'attack' | 'mad' | 'knock'

export interface Palette {
  body: string
  body2: string
  screen: string
  eye: string
  dizzy: string
  spark: string[]
}

export type Mode = 'held' | 'knock' | 'chase' | 'attack' | 'idle'
export type AttackKind = 'bullets' | 'beam' | 'melee' | 'ball'
export type AttackPhase = 'approach' | 'return'

export interface Point { x: number, y: number }
// Fills one sprite cell rectangle: the robot's and the agents' pixel art draw through it.
export type Pxl = (x: number, y: number, w: number, h: number, c: string) => void

export interface Spark { x: number, y: number, vx: number, vy: number, life: number, max: number, c: string }
export interface Beam { x1: number, y1: number, x2: number, y2: number, life: number, max: number, c: string }
// `glyph`/`c`: a critter's own ammunition instead of the robot's orange pellet.
export interface Bullet { x: number, y: number, vx: number, vy: number, life: number, max: number, glyph?: string, c?: string }
export interface Ball { x: number, y: number, vx: number, vy: number, spin: number, dspin: number, life: number, max: number }
export interface Debris { x: number, y: number, vx: number, vy: number, sz: number, c: string, life: number, max: number, landed: boolean }
export interface Ring { x: number, y: number, life: number, max: number, c?: string }
export interface Popup { x: number, y: number, text: string, life: number, max: number, c?: string, size?: number }
// `held` while the visitor drags it; `fvx`/`fvy` is the throw, which decays back into its own cruise.
export interface Trend { x: number, baseY: number, y: number, vx: number, tt: number, label: string, hits: number, held: boolean, fvx: number, fvy: number }
// A press that landed on the robot: becomes a grab once it moves, a throw when released.
export interface Press { sx: number, sy: number, x: number, y: number, ox: number, oy: number, t0: number, moved: boolean, hist: { x: number, y: number, ms: number }[] }
// An agent or trend tag in hand: `ox`/`oy` keep the grab point, `hist` gives the throw, `moved` a drag.
export interface Carry { kind: 'agent' | 'trend', m: TeamMember | null, sx: number, sy: number, ox: number, oy: number, moved: boolean, hist: { x: number, y: number, ms: number }[] }

// Window events between the Vue UI and the game loop.
export const GAME_EVENTS = { fight: 'game:fight-agi', endFight: 'game:end-fight', restart: 'game:restart' } as const

// The "Assemble the team" quest
export type AgentRole = 'planner' | 'researcher' | 'analyst' | 'reviewer' | 'coder' | 'deployer'
// A recruited sub-agent trailing the robot; `tx`/`ty`: its formation spot, `cd`: behaviour cooldown.
// `note`/`noteT`: a speech popup; `held` while carried; `air`: ticks of flight left at `vx`/`vy`; `rot`: spin.
export interface TeamMember { role: AgentRole, x: number, y: number, tx: number, ty: number, dir: number, slot: number, cd: number, note: string, noteT: number, held: boolean, air: number, vx: number, vy: number, rot: number, struck: boolean }
// An agent popped out of an opened CV row, waiting for a click; it follows the row as the page scrolls.
export interface Peek { role: AgentRole, row: HTMLDetailsElement, x: number, y: number, ox: number, life: number, phase: 'out' | 'wait' | 'in' }
export interface Confetti { x: number, y: number, vx: number, vy: number, rot: number, vr: number, c: string, life: number, max: number }
// What the HUD shows; the component holds it reactively.
// bossRun: the fastest finished boss fight the card shows and offers to sign; bossMs: its time.
// seen: the critter forms this visitor has met, for the collection grid.
export interface QuestView { team: AgentRole[], done: boolean, ms: number | null, bossRun: string | null, bossMs: number | null, boss: boolean, seen: string[] }
// The game's way out to the Vue layer: HUD state, screen-reader lines, and the finished team.
export interface QuestBridge {
  view(v: QuestView): void
  announce(text: string): void
  // the last recruit: posts the time at once, so a reload during the fly-by cannot lose it
  finished(ms: number): void
  // the end of the fly-by: opens the team card
  complete(): void
  // a won boss fight, its run and game-clock time: posts it, then opens the card on the boss board
  bossDone(run: string | null, ms: number): void
}

// Team behaviours (team.ts)
// A team projectile: `boss` shots fly at the boss and damage it, the rest at the cursor.
export interface Shot { x: number, y: number, vx: number, vy: number, life: number, max: number, c: string, dmg: number, boss: boolean }
// A small glyph tied to a member: the Analyst's rising chart or the Researcher's reading sparkle.
export interface Glyph { kind: 'chart' | 'sparkle', role: AgentRole, x: number, y: number, life: number, max: number }
export interface Rocket { x: number, y: number, vx: number, vy: number, life: number, max: number, boss: boolean }
export interface Crew { shots: Shot[], glyphs: Glyph[], rockets: Rocket[], lx: number, ly: number, vx: number, vy: number, plan: number }

// The AGI boss (boss.ts)
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
  // offX/offY: how far a dash or teleport pushed it off its sweep, easing back; mv: the move under way
  // mvCD/burstCD: ticks until the next dash or teleport, and until the next barrage
  offX: number, offY: number, mv: BossMove | null, mvCD: number, burstCD: number
}
// A dash glides fast to a new spot; a teleport flickers, vanishes, and lands somewhere else.
export interface BossMove { kind: 'dash' | 'tp', t: number, sx: number, sy: number, tx: number, ty: number }
