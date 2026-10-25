// Global counters and the leaderboard from /api/game; every failure resolves null so the game never waits on them.
export interface BoardEntry {
  initials: string
  ms: number
  mine: boolean
}

export interface MyRun {
  ms: number
  // the time these initials hold on the board, which can be an earlier, faster run
  best: number | null
  place: number
  initials: string | null
}

export interface GameStats {
  pops: number
  teams: number
  bestMs: number | null
  fasterThanPct: number | null
  rank: number | null
  board: BoardEntry[]
  mine: MyRun | null
  bossBoard: BoardEntry[]
  bossMine: MyRun | null
}

const TIMEOUT_MS = 4000

const isStats = (v: unknown): v is GameStats => {
  const s = v as GameStats | null
  return !!s && typeof s === 'object' && typeof s.pops === 'number' && typeof s.teams === 'number' && Array.isArray(s.board) && Array.isArray(s.bossBoard)
}

async function request<T>(path: string, ok: (v: unknown) => v is T, init?: RequestInit): Promise<T | null> {
  if (typeof fetch !== 'function' || typeof AbortController !== 'function') return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal })
    if (!res.ok) return null
    const data: unknown = await res.json()
    return ok(data) ? data : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const post = <T>(body: object, ok: (v: unknown) => v is T) => request('/api/game/event', ok, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

// team: the visitor's team run to show; boss: their boss run.
export function getGameStats(team: string | null, boss: string | null): Promise<GameStats | null> {
  const q = new URLSearchParams()
  if (team) q.set('run', team)
  if (boss) q.set('boss', boss)
  const qs = q.toString()
  return request(qs ? `/api/game/stats?${qs}` : '/api/game/stats', isStats)
}

export function postPop(): Promise<unknown> {
  return post({ kind: 'pop' }, (_v): _v is unknown => true)
}

// The server notes the start; its id is this visitor's claim on the finished time.
export async function startRun(game: 'team' | 'boss'): Promise<string | null> {
  const r = await post({ kind: 'run', game }, (v): v is { run: string } => typeof (v as { run?: unknown } | null)?.run === 'string')
  return r?.run ?? null
}

// other: the visitor's run of the other kind, so the answer carries both boards.
export function postTeam(ms: number, run: string | null, other: string | null): Promise<GameStats | null> {
  return post({ kind: 'team', ms, ...(run ? { run } : {}), ...(other ? { other } : {}) }, isStats)
}

export function postBoss(run: string, other: string | null): Promise<GameStats | null> {
  return post({ kind: 'boss', run, ...(other ? { other } : {}) }, isStats)
}

export function postName(run: string, initials: string, other: string | null): Promise<GameStats | null> {
  return post({ kind: 'name', run, initials, ...(other ? { other } : {}) }, isStats)
}
