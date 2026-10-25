// Global counters from /api/game; every failure resolves null so the game never waits on them.
export interface GameStats {
  pops: number
  teams: number
  bestMs: number | null
  fasterThanPct: number | null
  rank: number | null
}

const TIMEOUT_MS = 4000

const isStats = (v: unknown): v is GameStats => {
  const s = v as GameStats | null
  return !!s && typeof s === 'object' && typeof s.pops === 'number' && typeof s.teams === 'number'
}

async function request(path: string, init?: RequestInit): Promise<GameStats | null> {
  if (typeof fetch !== 'function' || typeof AbortController !== 'function') return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal })
    if (!res.ok) return null
    const data: unknown = await res.json()
    return isStats(data) ? data : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function getGameStats(): Promise<GameStats | null> {
  return request('/api/game/stats')
}

export function postGameEvent(kind: 'pop' | 'team', ms?: number): Promise<GameStats | null> {
  return request('/api/game/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ms === undefined ? { kind } : { kind, ms }),
  })
}
