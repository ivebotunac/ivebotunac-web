// Client for /api/game, the team totals and boss board; failures and the 4 s timeout give null, never a hang.
// postName alone returns the HTTP status of a failure instead, or 0 when nothing answered.
import type { GameStats } from '~~/shared/types/game-stats'

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

const jsonPost = (body: object): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const post = <T>(body: object, ok: (v: unknown) => v is T) => request('/api/game/event', ok, jsonPost(body))

// Passing the visitor's boss run id also returns that fight's place on the board.
export function getGameStats(run: string | null): Promise<GameStats | null> {
  return request(run ? `/api/game/stats?run=${encodeURIComponent(run)}` : '/api/game/stats', isStats)
}

// Asks the server to start timing a boss fight; only the returned id can later finish or sign that run.
export async function startRun(): Promise<string | null> {
  const r = await post({ kind: 'run' }, (v): v is { run: string } => typeof (v as { run?: unknown } | null)?.run === 'string')
  return r?.run ?? null
}

// A finished team adds to the shared totals; passing the boss run id also returns that fight's place.
export function postTeam(ms: number, run: string | null): Promise<GameStats | null> {
  return post({ kind: 'team', ms, ...(run ? { run } : {}) }, isStats)
}

export function postBoss(run: string): Promise<GameStats | null> {
  return post({ kind: 'boss', run }, isStats)
}

export async function postName(run: string, initials: string): Promise<GameStats | number> {
  const r = await send('/api/game/event', jsonPost({ kind: 'name', run, initials }))
  if (typeof r === 'number') return r
  return isStats(r.data) ? r.data : 0
}
