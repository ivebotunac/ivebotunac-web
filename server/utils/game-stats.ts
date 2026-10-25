import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getGameDb } from './firebase-admin'

// Mirrors BoardEntry, MyRun and GameStats in app/game/stats-client.ts.
export interface BoardEntry {
  initials: string
  ms: number
  mine: boolean
}

export interface MyRun {
  // the run's own time, and the time its initials hold on the board once signed
  ms: number
  best: number | null
  // 1 + the board entries strictly faster than what this run would show, so it reads as "#n" before signing too
  place: number
  initials: string | null
}

export interface GameStatsResponse {
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

export type Game = 'team' | 'boss'
export type GameEvent =
  | { kind: 'pop' }
  | { kind: 'run', game: Game }
  // other: the visitor's run of the other kind, so one answer carries both boards
  | { kind: 'team', ms: number, run: string | null, other: string | null }
  | { kind: 'boss', run: string, other: string | null }
  | { kind: 'name', run: string, initials: string, other: string | null }
export type GameEventKind = GameEvent['kind']

export const GAME_STATS_DOC = 'ivebotunac/stats'
// One doc per attempt, a team from its first recruit or a boss fight from its entry; the id is the visitor's claim on the time.
export const RUNS = 'ivebotunac/stats/runs'
// One doc per initials holding their best time, so the top ten is one ordered query and a name appears once.
export const BOARDS: Record<Game, string> = { team: 'ivebotunac/stats/board', boss: 'ivebotunac/stats/bossBoard' }
export const BOARD_SIZE = 10
// Entry, at least 300 hp at the fastest tap rate, then the death throes: no real fight is shorter.
export const BOSS_MIN_MS = 9_000
// Only for a time the client reports itself; a run the server timed needs no floor, it cannot come in short.
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
export const LIMITS: Record<GameEventKind, number> = { pop: 20, run: 14, team: 4, boss: 10, name: 10 }
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
  const { kind, ms, run, initials, game, other: o } = body as { kind?: unknown, ms?: unknown, run?: unknown, initials?: unknown, game?: unknown, other?: unknown }
  const other = parseRun(o)
  if (ms !== undefined && !Number.isInteger(ms)) return null
  if (kind === 'pop') return { kind }
  // a client from before the boss board starts team runs without saying so
  if (kind === 'run') return game === undefined || game === 'team' || game === 'boss' ? { kind, game: game === 'boss' ? 'boss' : 'team' } : null
  if (kind === 'boss') { const r = parseRun(run); return r ? { kind, run: r, other } : null }
  if (kind === 'name') {
    const r = parseRun(run), i = parseInitials(initials)
    return r && i ? { kind, run: r, initials: i, other } : null
  }
  if (kind !== 'team' || typeof ms !== 'number') return null
  const r = parseRun(run)
  if (!r && ms < TEAM_MIN_MS) return null
  // a team kept across visits can take days; anything over an hour lands in the same bucket anyway
  return { kind, ms: Math.min(Math.max(0, ms), TEAM_MAX_MS), run: r, other }
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
        entry = { start: now, n: { pop: 0, run: 0, team: 0, boss: 0, name: 0 } }
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
    bossBoard: [],
    bossMine: null,
  }
}

type Data = Record<string, unknown> | undefined
const runMs = (data: Data): number | null => (typeof data?.ms === 'number' ? data.ms : null)
const runInitials = (data: Data): string | null => (typeof data?.initials === 'string' ? data.initials : null)
const runGame = (data: Data): Game => (data?.game === 'boss' ? 'boss' : 'team')

async function readBoard(game: Game, initials: string | null): Promise<BoardEntry[]> {
  const snap = await getGameDb().collection(BOARDS[game]).orderBy('ms').limit(BOARD_SIZE).get()
  return snap.docs.map(d => ({ initials: String(d.get('initials')), ms: Number(d.get('ms')), mine: d.id === initials }))
}

// What a run shows: its own time, or once signed the best its initials hold, and the place of that time.
async function myRun(game: Game, data: Data): Promise<MyRun | null> {
  const ms = runMs(data)
  if (ms === null) return null
  const initials = runInitials(data)
  const held = initials ? await getGameDb().collection(BOARDS[game]).doc(initials).get() : null
  const best = held?.exists ? Number(held.get('ms')) : null
  const shown = best ?? ms
  const agg = await getGameDb().collection(BOARDS[game]).where('ms', '<', shown).count().get()
  return { ms, best, place: agg.data().count + 1, initials }
}

async function withBoards(stats: GameStatsResponse, team: Data, boss: Data): Promise<GameStatsResponse> {
  const [board, mine, bossBoard, bossMine] = await Promise.all([
    readBoard('team', runInitials(team)), myRun('team', team), readBoard('boss', runInitials(boss)), myRun('boss', boss),
  ])
  return { ...stats, board, mine, bossBoard, bossMine }
}

const runData = async (run: string | null, game: Game): Promise<Data> => {
  if (!run) return undefined
  const data = (await getGameDb().collection(RUNS).doc(run).get()).data()
  return data && runGame(data) === game ? data : undefined
}

export async function readGameStats(team: string | null = null, boss: string | null = null): Promise<GameStatsResponse> {
  const [snap, teamData, bossData] = await Promise.all([getGameDb().doc(GAME_STATS_DOC).get(), runData(team, 'team'), runData(boss, 'boss')])
  return withBoards(toStats(snap.data()), teamData, bossData)
}

// The client ignores the answer to a pop, so it costs one write and no read.
export async function recordPop(): Promise<{ ok: true }> {
  await getGameDb().doc(GAME_STATS_DOC).set({ pops: FieldValue.increment(1) }, { merge: true })
  return { ok: true }
}

export async function startRun(game: Game): Promise<{ run: string }> {
  const ref = await getGameDb().collection(RUNS).add({ game, startedAt: FieldValue.serverTimestamp(), ms: null, initials: null })
  return { run: ref.id }
}

// With a live run the server's own clock sets the time and the client's ms is ignored; without one the time
// still counts toward the totals but can never reach the board. Null means a self-reported time under the floor.
export async function recordTeam(clientMs: number, run: string | null, boss: string | null): Promise<GameStatsResponse | null> {
  const db = getGameDb()
  const ref = db.doc(GAME_STATS_DOC)
  const runRef = run ? db.collection(RUNS).doc(run) : null
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const runSnap = runRef ? await tx.get(runRef) : null
    const before = toStats(snap.data())
    const startedAt = runSnap?.get('startedAt')
    const timed = runRef && startedAt instanceof Timestamp && runGame(runSnap?.data()) === 'team' ? runRef : null
    // a finished run is a replay of the same finish, so it answers without counting twice
    if (timed && runMs(runSnap?.data()) !== null) return { stats: before, data: runSnap?.data() }
    const ms = timed ? Math.min(Date.now() - startedAt.toMillis(), TEAM_MAX_MS) : clientMs
    if (!timed && ms < TEAM_MIN_MS) return null
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
    return { stats: { ...before, teams, bestMs, fasterThanPct: pct, rank: teams }, data: timed ? { ms, initials: null } : undefined }
  })
  if (!result) return null
  return withBoards(result.stats, result.data, await runData(boss, 'boss'))
}

// The boss fight only counts when the server timed it; null means an unknown run or a time no fight can reach.
export async function recordBoss(run: string, team: string | null): Promise<GameStatsResponse | null> {
  const db = getGameDb()
  const runRef = db.collection(RUNS).doc(run)
  const data = await db.runTransaction(async (tx) => {
    const d = (await tx.get(runRef)).data()
    const startedAt = d?.startedAt
    if (!d || runGame(d) !== 'boss' || !(startedAt instanceof Timestamp)) return null
    if (runMs(d) !== null) return d
    const ms = Date.now() - startedAt.toMillis()
    if (ms < BOSS_MIN_MS) return null
    tx.update(runRef, { ms, finishedAt: FieldValue.serverTimestamp() })
    return { ...d, ms }
  })
  if (!data) return null
  const [snap, teamData] = await Promise.all([db.doc(GAME_STATS_DOC).get(), runData(team, 'team')])
  return withBoards(toStats(snap.data()), teamData, data)
}

// Once per run. The board keeps one row per initials with their best time, so a slower signature leaves it as it is.
// Null means the run is unknown, unfinished or already signed.
export async function nameRun(run: string, initials: string, other: string | null): Promise<GameStatsResponse | null> {
  const db = getGameDb()
  const runRef = db.collection(RUNS).doc(run)
  const game = await db.runTransaction(async (tx) => {
    const data = (await tx.get(runRef)).data()
    const ms = runMs(data)
    if (ms === null || runInitials(data) !== null) return null
    const g = runGame(data)
    const entryRef = db.collection(BOARDS[g]).doc(initials)
    const held = await tx.get(entryRef)
    tx.update(runRef, { initials })
    if (!held.exists || ms < Number(held.get('ms'))) tx.set(entryRef, { initials, ms, at: FieldValue.serverTimestamp() })
    return g
  })
  if (!game) return null
  return game === 'team' ? readGameStats(run, other) : readGameStats(other, run)
}
