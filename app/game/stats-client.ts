// Global counters and the leaderboard from /api/game; every failure resolves null so the game never waits on them.
export interface BoardEntry {
  initials: string
  ms: number
  mine: boolean
}

export interface MyRun {
  ms: number
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
}

const TIMEOUT_MS = 4000

const isStats = (v: unknown): v is GameStats => {
  const s = v as GameStats | null
  return !!s && typeof s === 'object' && typeof s.pops === 'number' && typeof s.teams === 'number' && Array.isArray(s.board)
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

export function getGameStats(run: string | null): Promise<GameStats | null> {
  return request(run ? `/api/game/stats?run=${encodeURIComponent(run)}` : '/api/game/stats', isStats)
}

export function postPop(): Promise<unknown> {
  return post({ kind: 'pop' }, (_v): _v is unknown => true)
}

// The server notes the start; its id is this visitor's claim on the finished time.
export async function startRun(): Promise<string | null> {
  const r = await post({ kind: 'run' }, (v): v is { run: string } => typeof (v as { run?: unknown } | null)?.run === 'string')
  return r?.run ?? null
}

export function postTeam(ms: number, run: string | null): Promise<GameStats | null> {
  return post(run ? { kind: 'team', ms, run } : { kind: 'team', ms }, isStats)
}

export function postName(run: string, initials: string): Promise<GameStats | null> {
  return post({ kind: 'name', run, initials }, isStats)
}
