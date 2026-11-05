import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getGameDb } from './firebase-admin'

// Mirrors BoardEntry, MyRun and GameStats in app/game/stats-client.ts.
export interface BoardEntry {
  initials: string
  ms: number
  mine: boolean
}

export interface MyRun {
  // the fight's own time, and the time its initials hold on the board once signed
  ms: number
  best: number | null
  // 1 + board entries strictly faster than this run would show, so it reads as "#n" before signing too
  place: number
  initials: string | null
}

export interface GameStatsResponse {
  teams: number
  bestMs: number | null
  fasterThanPct: number | null
  rank: number | null
  // the AGI board, and the visitor's fight on it
  board: BoardEntry[]
  mine: MyRun | null
}

// The leaderboard is the AGI fight's alone; a finished team only adds to the totals.
export type GameEvent =
  | { kind: 'run' }
  // run: the visitor's boss fight, so the answer carries its place on the board
  | { kind: 'team', ms: number, run: string | null }
  | { kind: 'boss', run: string }
  | { kind: 'name', run: string, initials: string }
export type GameEventKind = GameEvent['kind']
// Board reads are limited like events, on their own limiter so they never use up the write budget.
export type LimitKind = GameEventKind | 'read'

const GAME_STATS_DOC = 'ivebotunac/stats'
// One doc per boss fight, from its entry; the id is the visitor's claim on the time.
const RUNS = 'ivebotunac/stats/bossRuns'
// One doc per initials at their best time: the top ten is one ordered query and a name appears once.
const BOARD = 'ivebotunac/stats/bossBoard'
const BOARD_SIZE = 10
// Entry, at least 300 hp at the fastest tap rate, then the death throes: no real fight is shorter.
const BOSS_MIN_MS = 9_000
// The client reports the team's time itself, so anything faster than this was not played.
const TEAM_MIN_MS = 20_000
const TEAM_MAX_MS = 86_400_000
const BUCKET_MS = 30_000
// 120 buckets of 30 s cover the first hour; everything slower shares one.
const BUCKET_COUNT = 120
const OVERFLOW_BUCKET = 'over'

// Arcade initials can still spell things; these never reach the board.
const BLOCKED = new Set([
  'ASS', 'CUM', 'DIC', 'DIK', 'DIX', 'FAG', 'FCK', 'FUC', 'FUK', 'FUQ', 'JIZ', 'KKK', 'KYS', 'NAZ', 'NGR', 'NIG',
  'PIS', 'SEX', 'SHT', 'SUX', 'TIT', 'VAG', 'WTF', 'XXX', 'JEB', 'KUR', 'PIZ', 'PUS', 'SRA', 'HIV', 'GAS', 'SSS',
  'FGT', 'FGS', 'FAP', 'CNT', 'KNT', 'NGA', 'NGG', 'NGS', 'GAY', 'HOE', 'JAP', 'SPK', 'WOP', 'CHK', 'COK', 'COC',
  'KOK', 'RAP', 'RPE', 'PNS', 'SLT', 'WHR', 'HOR', 'BCH', 'TWT', 'DCK', 'KMS', 'KIL', 'HHH', 'NDH', 'PDR', 'GOV'
])

const LIMIT_WINDOW_MS = 10 * 60_000
const LIMITS: Record<LimitKind, number> = { run: 12, team: 2, boss: 10, name: 10, read: 30 }
// Bounds the map; when full, the oldest key makes room for the new one.
const LIMIT_MAX_KEYS = 50_000
// Firestore writes per instance per minute across all keys, so cost and the hot document stay bounded.
const GLOBAL_LIMIT_PER_MIN = 120
// A board read costs about a dozen Firestore reads, so reads get their own cap per instance per minute.
export const GLOBAL_READS_PER_MIN = 240

const RUN_ID = /^[A-Za-z0-9]{20}$/

export const parseRun = (v: unknown): string | null => (typeof v === 'string' && RUN_ID.test(v) ? v : null)

function parseInitials(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(s) && !BLOCKED.has(s) ? s : null
}

export function parseGameEvent(body: unknown): GameEvent | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const { kind, ms, run: r, initials } = body as { kind?: unknown, ms?: unknown, run?: unknown, initials?: unknown }
  if (ms !== undefined && !Number.isInteger(ms)) return null
  const run = parseRun(r)
  if (kind === 'run') return { kind }
  if (kind === 'boss') return run ? { kind, run } : null
  if (kind === 'name') {
    const i = parseInitials(initials)
    return run && i ? { kind, run, initials: i } : null
  }
  if (kind !== 'team' || typeof ms !== 'number' || ms < TEAM_MIN_MS) return null
  // a team kept across visits can take days; anything over an hour lands in the same bucket anyway
  return { kind, ms: Math.min(ms, TEAM_MAX_MS), run }
}

function bucketKey(ms: number): string {
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
function fasterThanPct(teamTimes: Record<string, unknown>, ms: number, prevBestMs: number | null): number {
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

// App Hosting sets x-fah-client-ip behind its proxies; the last entry is the one a client cannot forge.
export function clientKey(event: Parameters<typeof getRequestIP>[0]): string {
  const fah = process.env.K_SERVICE ? getRequestHeader(event, 'x-fah-client-ip')?.split(',').pop()?.trim() : undefined
  return fah || getRequestIP(event) || 'unknown'
}

// A valid event is under 100 bytes; anything larger is refused before it is buffered or parsed.
const MAX_BODY_BYTES = 1024

export async function readEventBody(event: Parameters<typeof getRequestIP>[0]): Promise<unknown> {
  const tooLarge = () => createError({ statusCode: 413, statusMessage: 'Body too large' })
  if (Number(getRequestHeader(event, 'content-length')) > MAX_BODY_BYTES) throw tooLarge()
  const chunks: Buffer[] = []
  let size = 0
  // a chunked body has no content-length, so the cap also holds while reading
  // past the cap the rest is drained, not kept: breaking out of the stream destroys the socket
  for await (const chunk of event.node.req) {
    size += (chunk as Buffer).length
    if (size <= MAX_BODY_BYTES) chunks.push(chunk as Buffer)
  }
  if (size > MAX_BODY_BYTES) throw tooLarge()
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }
}

// Fixed window per key, in memory and per instance; the key never leaves this map.
export function createGameLimiter(globalPerMin = GLOBAL_LIMIT_PER_MIN) {
  const hits = new Map<string, { start: number, n: Record<LimitKind, number> }>()
  let lastSweep = 0
  let minuteStart = 0
  let minuteCount = 0

  const sweep = (now: number) => {
    lastSweep = now
    for (const [key, entry] of hits) if (now - entry.start >= LIMIT_WINDOW_MS) hits.delete(key)
  }
  // The privacy policy promises the IP leaves memory with its window, even on an idle instance.
  setInterval(() => sweep(Date.now()), 60_000).unref?.()

  return {
    allow(key: string, kind: LimitKind, now = Date.now()): boolean {
      if (now - lastSweep >= LIMIT_WINDOW_MS) sweep(now)
      if (now - minuteStart >= 60_000) { minuteStart = now; minuteCount = 0 }
      if (minuteCount >= globalPerMin) return false
      let entry = hits.get(key)
      if (entry && now - entry.start >= LIMIT_WINDOW_MS) entry = undefined
      if (!entry) {
        if (hits.size >= LIMIT_MAX_KEYS) sweep(now)
        // Map keeps insertion order, so the first key is the oldest window
        if (hits.size >= LIMIT_MAX_KEYS) { const oldest = hits.keys().next().value; if (oldest !== undefined) hits.delete(oldest) }
        entry = { start: now, n: { run: 0, team: 0, boss: 0, name: 0, read: 0 } }
        hits.delete(key)
        hits.set(key, entry)
      }
      if (entry.n[kind] >= LIMITS[kind]) return false
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
    teams: count(data?.teams),
    bestMs: typeof best === 'number' && Number.isFinite(best) ? best : null,
    fasterThanPct: null,
    rank: null,
    board: [],
    mine: null,
  }
}

type Data = Record<string, unknown> | undefined
const runMs = (data: Data): number | null => (typeof data?.ms === 'number' ? data.ms : null)
const runInitials = (data: Data): string | null => (typeof data?.initials === 'string' ? data.initials : null)

// The top ten, and the visitor's fight: its time, or once signed its initials' best, with its place.
async function withBoard(stats: GameStatsResponse, run: Data): Promise<GameStatsResponse> {
  const db = getGameDb(), initials = runInitials(run), ms = runMs(run)
  const [top, held] = await Promise.all([
    db.collection(BOARD).orderBy('ms').limit(BOARD_SIZE).get(),
    initials ? db.collection(BOARD).doc(initials).get() : null,
  ])
  const board = top.docs.map(d => ({ initials: String(d.get('initials')), ms: Number(d.get('ms')), mine: d.id === initials }))
  let mine: MyRun | null = null
  if (ms !== null) {
    const best = held?.exists ? Number(held.get('ms')) : null
    const agg = await db.collection(BOARD).where('ms', '<', best ?? ms).count().get()
    mine = { ms, best, place: agg.data().count + 1, initials }
  }
  return { ...stats, board, mine }
}

const runData = async (run: string | null): Promise<Data> => (run ? (await getGameDb().collection(RUNS).doc(run).get()).data() : undefined)

export async function readGameStats(run: string | null = null): Promise<GameStatsResponse> {
  const [snap, data] = await Promise.all([getGameDb().doc(GAME_STATS_DOC).get(), runData(run)])
  return withBoard(toStats(snap.data()), data)
}

export async function startRun(): Promise<{ run: string }> {
  const ref = await getGameDb().collection(RUNS).add({ startedAt: FieldValue.serverTimestamp(), ms: null, initials: null })
  return { run: ref.id }
}

// A finished team counts toward the totals with the time the client reports; it has no board.
export async function recordTeam(ms: number, run: string | null): Promise<GameStatsResponse> {
  const db = getGameDb()
  const ref = db.doc(GAME_STATS_DOC)
  const stats = await db.runTransaction(async (tx) => {
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
    return { ...before, teams, bestMs, fasterThanPct: pct, rank: teams }
  })
  return withBoard(stats, await runData(run))
}

// The server's own clock times the fight; null means an unknown run or a time no fight can reach.
// A finished run repeats its answer.
export async function recordBoss(run: string): Promise<GameStatsResponse | null> {
  const db = getGameDb()
  const runRef = db.collection(RUNS).doc(run)
  const data = await db.runTransaction(async (tx) => {
    const d = (await tx.get(runRef)).data()
    const startedAt = d?.startedAt
    if (!d || !(startedAt instanceof Timestamp)) return null
    if (runMs(d) !== null) return d
    const ms = Date.now() - startedAt.toMillis()
    if (ms < BOSS_MIN_MS) return null
    tx.update(runRef, { ms, finishedAt: FieldValue.serverTimestamp() })
    return { ...d, ms }
  })
  if (!data) return null
  return withBoard(toStats((await db.doc(GAME_STATS_DOC).get()).data()), data)
}

// Once per fight. One row per initials at their best, so a slower signature leaves the board as is.
// Null means the fight is unknown, unfinished or already signed.
export async function nameRun(run: string, initials: string): Promise<GameStatsResponse | null> {
  const db = getGameDb()
  const runRef = db.collection(RUNS).doc(run)
  const ok = await db.runTransaction(async (tx) => {
    const data = (await tx.get(runRef)).data()
    const ms = runMs(data)
    if (ms === null || runInitials(data) !== null) return false
    const entryRef = db.collection(BOARD).doc(initials)
    const held = await tx.get(entryRef)
    tx.update(runRef, { initials })
    if (!held.exists || ms < Number(held.get('ms'))) tx.set(entryRef, { initials, ms, at: FieldValue.serverTimestamp() })
    return true
  })
  return ok ? readGameStats(run) : null
}
