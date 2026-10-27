// Global counters and the leaderboard from /api/game; every failure resolves null so the game never waits on them,
// except postName, which answers the HTTP status so the board can say what went wrong.
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
  teams: number
  bestMs: number | null
  fasterThanPct: number | null
  rank: number | null
  // the AGI board, and the visitor's fight on it
  board: BoardEntry[]
  mine: MyRun | null
}

const TIMEOUT_MS = 4000

const isStats = (v: unknown): v is GameStats => {
  const s = v as GameStats | null
  return !!s && typeof s === 'object' && typeof s.teams === 'number' && Array.isArray(s.board)
}

// The answer's JSON, or the HTTP status when it failed, 0 when nothing answered.
async function send(path: string, init?: RequestInit): Promise<{ data: unknown } | number> {
  if (typeof fetch !== 'function' || typeof AbortController !== 'function') return 0
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal })
    if (!res.ok) return res.status
    return { data: await res.json() }
  } catch {
    return 0
  } finally {
    clearTimeout(timer)
  }
}

async function request<T>(path: string, ok: (v: unknown) => v is T, init?: RequestInit): Promise<T | null> {
  const r = await send(path, init)
  return typeof r !== 'number' && ok(r.data) ? r.data : null
}

const event = (body: object): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const post = <T>(body: object, ok: (v: unknown) => v is T) => request('/api/game/event', ok, event(body))

// run: the visitor's boss fight, to show its place on the board.
export function getGameStats(run: string | null): Promise<GameStats | null> {
  return request(run ? `/api/game/stats?run=${encodeURIComponent(run)}` : '/api/game/stats', isStats)
}

// The server notes a boss fight's start; its id is this visitor's claim on the finished time.
export async function startRun(): Promise<string | null> {
  const r = await post({ kind: 'run' }, (v): v is { run: string } => typeof (v as { run?: unknown } | null)?.run === 'string')
  return r?.run ?? null
}

// A finished team adds to the totals; run is the visitor's boss fight, so the answer carries its place.
export function postTeam(ms: number, run: string | null): Promise<GameStats | null> {
  return post({ kind: 'team', ms, ...(run ? { run } : {}) }, isStats)
}

export function postBoss(run: string): Promise<GameStats | null> {
  return post({ kind: 'boss', run }, isStats)
}

export async function postName(run: string, initials: string): Promise<GameStats | number> {
  const r = await send('/api/game/event', event({ kind: 'name', run, initials }))
  if (typeof r === 'number') return r
  return isStats(r.data) ? r.data : 0
}
