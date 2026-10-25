import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getGameDb } from './firebase-admin'

// Mirrors BoardEntry, MyRun and GameStats in app/game/stats-client.ts.
export interface BoardEntry {
  initials: string
  ms: number
  mine: boolean
}

export interface MyRun {
  ms: number
  // 1 + the named entries strictly faster, so it reads as "you would be #n" before the name too
  place: number
  initials: string | null
  eligible: boolean
}

export interface GameStatsResponse {
  pops: number
  teams: number
  bestMs: number | null
  fasterThanPct: number | null
  rank: number | null
  board: BoardEntry[]
  mine: MyRun | null
}

export type GameEvent =
  | { kind: 'pop' }
  | { kind: 'run' }
  | { kind: 'team', ms: number, run: string | null }
  | { kind: 'name', run: string, initials: string }
export type GameEventKind = GameEvent['kind']

export const GAME_STATS_DOC = 'ivebotunacGame/stats'
// One doc per team attempt, created at the first recruit; its id is the visitor's claim on the time.
export const RUNS = 'ivebotunacGame/stats/runs'
// Named finishes only, so the top ten is one ordered query.
export const BOARD = 'ivebotunacGame/stats/board'
export const BOARD_SIZE = 10
// Five rows to find plus a popped robot; anything faster than this was not played.
export const BOARD_MIN_MS = 40_000
export const TEAM_MIN_MS = 20_000
export const TEAM_MAX_MS = 86_400_000
export const BUCKET_MS = 30_000
// 120 buckets of 30 s cover the first hour; everything slower shares one.
export const BUCKET_COUNT = 120
export const OVERFLOW_BUCKET = 'over'

// Arcade initials can still spell things; these never reach the board.
const BLOCKED = new Set([
  'ASS', 'CUM', 'DIC', 'DIK', 'DIX', 'FAG', 'FCK', 'FUC', 'FUK', 'FUQ', 'JIZ', 'KKK', 'KYS', 'NAZ', 'NGR', 'NIG',
  'PIS', 'SEX', 'SHT', 'SUX', 'TIT', 'VAG', 'WTF', 'XXX', 'JEB', 'KUR', 'PIZ', 'PUS', 'SRA', 'HIV', 'GAS', 'SSS'
])

export const LIMIT_WINDOW_MS = 10 * 60_000
export const LIMITS: Record<GameEventKind, number> = { pop: 20, run: 3, team: 2, name: 3 }
// Bounds the map; when full, the oldest key makes room for the new one.
export const LIMIT_MAX_KEYS = 50_000
// Firestore writes per instance per minute across all keys, so cost and the hot document stay bounded.
export const GLOBAL_LIMIT_PER_MIN = 120

const RUN_ID = /^[A-Za-z0-9]{20}$/

export const parseRun = (v: unknown): string | null => (typeof v === 'string' && RUN_ID.test(v) ? v : null)

export function parseInitials(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(s) && !BLOCKED.has(s) ? s : null
}

export function parseGameEvent(body: unknown): GameEvent | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const { kind, ms, run, initials } = body as { kind?: unknown, ms?: unknown, run?: unknown, initials?: unknown }
  if (ms !== undefined && !Number.isInteger(ms)) return null
  if (kind === 'pop' || kind === 'run') return { kind }
  if (kind === 'name') {
    const r = parseRun(run), i = parseInitials(initials)
    return r && i ? { kind, run: r, initials: i } : null
  }
  if (kind !== 'team' || typeof ms !== 'number') return null
  if (ms < TEAM_MIN_MS) return null
  // a team kept across visits can take days; anything over an hour lands in the same bucket anyway
  return { kind, ms: Math.min(ms, TEAM_MAX_MS), run: parseRun(run) }
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
  const hits = new Map<string, { start: number, n: Record<GameEventKind, number> }>()
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
        entry = { start: now, n: { pop: 0, run: 0, team: 0, name: 0 } }
        hits.delete(key)
        hits.set(key, entry)
      }
      if (entry.n[kind] >= limits[kind]) return false
      entry.n[kind]++
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
    board: [],
    mine: null,
  }
}

const runMs = (data: Record<string, unknown> | undefined): number | null => (typeof data?.ms === 'number' ? data.ms : null)
const runInitials = (data: Record<string, unknown> | undefined): string | null => (typeof data?.initials === 'string' ? data.initials : null)

async function readBoard(run: string | null): Promise<BoardEntry[]> {
  const snap = await getGameDb().collection(BOARD).orderBy('ms').limit(BOARD_SIZE).get()
  return snap.docs.map(d => ({ initials: String(d.get('initials')), ms: Number(d.get('ms')), mine: d.id === run }))
}

async function place(ms: number): Promise<number> {
  const agg = await getGameDb().collection(BOARD).where('ms', '<', ms).count().get()
  return agg.data().count + 1
}

async function withBoard(stats: GameStatsResponse, run: string | null, data: Record<string, unknown> | undefined): Promise<GameStatsResponse> {
  const ms = runMs(data)
  const [board, at] = await Promise.all([readBoard(run), ms === null ? null : place(ms)])
  stats.board = board
  if (ms !== null && at !== null) stats.mine = { ms, place: at, initials: runInitials(data), eligible: ms >= BOARD_MIN_MS }
  return stats
}

export async function readGameStats(run: string | null = null): Promise<GameStatsResponse> {
  const db = getGameDb()
  const [snap, runSnap] = await Promise.all([db.doc(GAME_STATS_DOC).get(), run ? db.collection(RUNS).doc(run).get() : null])
  return withBoard(toStats(snap.data()), run, runSnap?.data())
}

// The client ignores the answer to a pop, so it costs one write and no read.
export async function recordPop(): Promise<{ ok: true }> {
  await getGameDb().doc(GAME_STATS_DOC).set({ pops: FieldValue.increment(1) }, { merge: true })
  return { ok: true }
}

export async function startRun(): Promise<{ run: string }> {
  const ref = await getGameDb().collection(RUNS).add({ startedAt: FieldValue.serverTimestamp(), ms: null, initials: null })
  return { run: ref.id }
}

// With a live run the server's own clock sets the time and the client's ms is ignored; without one the time
// still counts toward the totals but can never reach the board. Null means the run's time is impossibly short.
export async function recordTeam(clientMs: number, run: string | null): Promise<GameStatsResponse | null> {
  const db = getGameDb()
  const ref = db.doc(GAME_STATS_DOC)
  const runRef = run ? db.collection(RUNS).doc(run) : null
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const runSnap = runRef ? await tx.get(runRef) : null
    const before = toStats(snap.data())
    const startedAt = runSnap?.get('startedAt')
    const timed = runRef && startedAt instanceof Timestamp ? runRef : null
    // a finished run is a replay of the same finish, so it answers without counting twice
    if (timed && runMs(runSnap?.data()) !== null) return { stats: before, data: runSnap?.data(), timed }
    const ms = timed ? Math.min(Date.now() - startedAt.toMillis(), TEAM_MAX_MS) : clientMs
    if (ms < TEAM_MIN_MS) return null
    const raw = snap.get('teamTimes')
    const teamTimes = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const pct = fasterThanPct(teamTimes, ms, before.bestMs)
    const bestMs = before.bestMs === null ? ms : Math.min(before.bestMs, ms)
    tx.set(ref, {
      teams: FieldValue.increment(1),
      bestMs,
      teamTimes: { [bucketKey(ms)]: FieldValue.increment(1) },
    }, { merge: true })
    if (timed) tx.update(timed, { ms, finishedAt: FieldValue.serverTimestamp() })
    const teams = before.teams + 1
    return { stats: { ...before, teams, bestMs, fasterThanPct: pct, rank: teams }, data: { ms, initials: null }, timed }
  })
  if (!result) return null
  return withBoard(result.stats, result.timed ? run : null, result.timed ? result.data : undefined)
}

// Once per run, only for a finished run fast enough for the board. Null means it cannot be named.
export async function nameRun(run: string, initials: string): Promise<GameStatsResponse | null> {
  const db = getGameDb()
  const runRef = db.collection(RUNS).doc(run)
  const ok = await db.runTransaction(async (tx) => {
    const data = (await tx.get(runRef)).data()
    const ms = runMs(data)
    if (ms === null || ms < BOARD_MIN_MS || runInitials(data) !== null) return false
    tx.update(runRef, { initials })
    tx.set(db.collection(BOARD).doc(run), { initials, ms, at: FieldValue.serverTimestamp() })
    return true
  })
  return ok ? readGameStats(run) : null
}
