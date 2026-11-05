// Timings and helpers that both the boss logic in boss.ts and its drawing in boss-draw.ts read.
import type { Game } from './core'
import type { Boss } from './types'

// How many ticks the entry and the death throes last.
export const ENTER = 100
export const DIE = 100
// Ticks a teleport flickers before it goes, then ticks it stays gone.
export const TP_OUT = 24
export const TP_GONE = 22

// Screen pixels per sprite cell; the sprite is 24 cells wide.
export const bossPx = (g: Game) => (g.W < 520 ? 3 : 4)

// Mid-teleport, between the flicker and the landing, nothing can hit it.
export const vanished = (b: Boss) => b.mv?.kind === 'tp' && b.mv.t >= TP_OUT
