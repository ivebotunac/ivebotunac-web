import { FieldValue } from 'firebase-admin/firestore'
import { getGameDb } from './firebase-admin'

// Mirrors GameStats in app/game/stats-client.ts.
export interface GameStatsResponse {
  pops: number
  teams: number
  bestMs: number | null
  fasterThanPct: number | null
  rank: number | null
}

export type GameEvent = { kind: 'pop' } | { kind: 'team', ms: number }
export type GameEventKind = GameEvent['kind']

export const GAME_STATS_DOC = 'ivebotunacGame/stats'
export const TEAM_MIN_MS = 20_000
export const TEAM_MAX_MS = 86_400_000
export const BUCKET_MS = 30_000
// 120 buckets of 30 s cover the first hour; everything slower shares one.
export const BUCKET_COUNT = 120
export const OVERFLOW_BUCKET = 'over'

export const LIMIT_WINDOW_MS = 10 * 60_000
export const LIMITS: Record<GameEventKind, number> = { pop: 20, team: 2 }
// Bounds the map; when full, the oldest key makes room for the new one.
export const LIMIT_MAX_KEYS = 50_000
// Firestore writes per instance per minute across all keys, so cost and the hot document stay bounded.
export const GLOBAL_LIMIT_PER_MIN = 120

export function parseGameEvent(body: unknown): GameEvent | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const { kind, ms } = body as { kind?: unknown, ms?: unknown }
  if (ms !== undefined && !Number.isInteger(ms)) return null
  if (kind === 'pop') return { kind }
  if (kind !== 'team' || typeof ms !== 'number') return null
  if (ms < TEAM_MIN_MS) return null
  // a team kept across visits can take days; anything over an hour lands in the same bucket anyway
  return { kind, ms: Math.min(ms, TEAM_MAX_MS) }
}

export function bucketKey(ms: number): string {
  const i = Math.floor(ms / BUCKET_MS)
  return i >= BUCKET_COUNT ? OVERFLOW_BUCKET : String(i)
}

function bucketOrder(key: string): number {
  if (key === OVERFLOW_BUCKET) return BUCKET_COUNT
  const i = Number(key)
  return Number.isInteger(i) && i >= 0 && i < BUCKET_COUNT ? i : -1
}

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

// Share of earlier completions slower than ms; a tie in the same bucket counts half.
export function fasterThanPct(teamTimes: Record<string, unknown>, ms: number, prevBestMs: number | null): number {
  if (prevBestMs === null || ms < prevBestMs) return 100
  const mine = bucketOrder(bucketKey(ms))
  let total = 0
  let slower = 0
  let same = 0
  for (const [key, raw] of Object.entries(teamTimes)) {
    const order = bucketOrder(key)
    const n = count(raw)
    if (order < 0 || n === 0) continue
    total += n
    if (order > mine) slower += n
    else if (order === mine) same += n
  }
  if (total === 0) return 100
  return Math.max(0, Math.min(100, Math.round((100 * (slower + same / 2)) / total)))
}

// Fixed window per key, in memory and per instance; the key never leaves this map.
export function createGameLimiter(windowMs = LIMIT_WINDOW_MS, limits = LIMITS, maxKeys = LIMIT_MAX_KEYS, globalPerMin = GLOBAL_LIMIT_PER_MIN) {
  const hits = new Map<string, { start: number, pop: number, team: number }>()
  let lastSweep = 0
  let minuteStart = 0
  let minuteCount = 0

  const sweep = (now: number) => {
    lastSweep = now
    for (const [key, entry] of hits) if (now - entry.start >= windowMs) hits.delete(key)
  }
  // The privacy policy promises the IP leaves memory with its window, even on an instance that gets no more requests.
  setInterval(() => sweep(Date.now()), 60_000).unref?.()

  return {
    allow(key: string, kind: GameEventKind, now = Date.now()): boolean {
      if (now - lastSweep >= windowMs) sweep(now)
      if (now - minuteStart >= 60_000) { minuteStart = now; minuteCount = 0 }
      if (minuteCount >= globalPerMin) return false
      let entry = hits.get(key)
      if (entry && now - entry.start >= windowMs) entry = undefined
      if (!entry) {
        if (hits.size >= maxKeys) sweep(now)
        // Map keeps insertion order, so the first key is the oldest window
        if (hits.size >= maxKeys) { const oldest = hits.keys().next().value; if (oldest !== undefined) hits.delete(oldest) }
        entry = { start: now, pop: 0, team: 0 }
        hits.delete(key)
        hits.set(key, entry)
      }
      if (entry[kind] >= limits[kind]) return false
      entry[kind]++
      minuteCount++
      return true
    },
    size: () => hits.size,
  }
}

function toStats(data: Record<string, unknown> | undefined): GameStatsResponse {
  const best = data?.bestMs
  return {
    pops: count(data?.pops),
    teams: count(data?.teams),
    bestMs: typeof best === 'number' && Number.isFinite(best) ? best : null,
    fasterThanPct: null,
    rank: null,
  }
}

export async function readGameStats(): Promise<GameStatsResponse> {
  const snap = await getGameDb().doc(GAME_STATS_DOC).get()
  return toStats(snap.data())
}

// The client ignores the answer to a pop, so it costs one write and no read.
export async function recordPop(): Promise<{ ok: true }> {
  await getGameDb().doc(GAME_STATS_DOC).set({ pops: FieldValue.increment(1) }, { merge: true })
  return { ok: true }
}

export async function recordTeam(ms: number): Promise<GameStatsResponse> {
  const db = getGameDb()
  const ref = db.doc(GAME_STATS_DOC)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const before = toStats(snap.data())
    const raw = snap.get('teamTimes')
    const teamTimes = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const pct = fasterThanPct(teamTimes, ms, before.bestMs)
    const bestMs = before.bestMs === null ? ms : Math.min(before.bestMs, ms)
    tx.set(ref, {
      teams: FieldValue.increment(1),
      bestMs,
      teamTimes: { [bucketKey(ms)]: FieldValue.increment(1) },
    }, { merge: true })
    const teams = before.teams + 1
    return { pops: before.pops, teams, bestMs, fasterThanPct: pct, rank: teams }
  })
}
