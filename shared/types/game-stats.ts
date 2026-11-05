// The /api/game answers, read by app/game/stats-client.ts and written by server/utils/game-stats.ts.
export interface BoardEntry {
  initials: string
  ms: number
  mine: boolean
}

export interface MyRun {
  // the fight's own time
  ms: number
  // the time these initials hold on the board once signed, which can be an earlier, faster run
  best: number | null
  // 1 + board entries strictly faster than this run would show, so it reads as "#n" before signing too
  place: number
  initials: string | null
}

export interface GameStats {
  teams: number
  bestMs: number | null
  fasterThanPct: number | null
  rank: number | null
  // the AGI board, and the visitor's fight on it
  board: BoardEntry[]
  mine: MyRun | null
}
