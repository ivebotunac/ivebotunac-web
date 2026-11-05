// The /api/game answers, read by app/game/stats-client.ts and written by server/utils/game-stats.ts.
export interface BoardEntry {
  // three-letter arcade signature
  initials: string
  // the boss fight's time in milliseconds, timed by the server
  ms: number
  // true on the row held by the initials the visitor's fight was signed with
  mine: boolean
}

export interface MyRun {
  // the fight's own time
  ms: number
  // the time these initials hold on the board once signed, which can be an earlier, faster run
  best: number | null
  // board position: 1 + board entries strictly faster, so it reads as "#n" before signing too
  place: number
  // the initials this fight was signed with, null until signed
  initials: string | null
}

export interface GameStats {
  // how many teams have finished the quest, across all visitors
  teams: number
  // the fastest team quest time in milliseconds, null before the first finish
  bestMs: number | null
  // share of earlier finishes slower than this team's, set only on the answer to a finished team
  fasterThanPct: number | null
  // the visitor's ordinal among teams that finished ("#n to do it"), set only on that same answer
  rank: number | null
  // the AGI boss board's top entries, fastest first
  board: BoardEntry[]
  // the visitor's boss fight on that board, null without a finished fight
  mine: MyRun | null
}
