import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { GameStats, MyRun } from '~~/shared/types/game-stats'
import { BOARD_SIZE } from '~~/shared/utils/game-stats'
import { getGameDb } from './firebase-admin'

const GAME_STATS_DOC = 'ivebotunac/stats'
// One doc per boss fight, from its entry; the id is the visitor's claim on the time.
const RUNS = 'ivebotunac/stats/bossRuns'
// One doc per initials at their best time: the top ten is one ordered query and a name appears once.
const BOARD = 'ivebotunac/stats/bossBoard'
// Entry, at least 300 hp at the fastest tap rate, then the death throes: no real fight is shorter.
const BOSS_MIN_MS = 9_000
const BUCKET_MS = 30_000
// 120 buckets of 30 s cover the first hour; everything slower shares one.
const BUCKET_COUNT = 120
const OVERFLOW_BUCKET = 'over'

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

function toStats(data: Record<string, unknown> | undefined): GameStats {
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
async function withBoard(stats: GameStats, run: Data): Promise<GameStats> {
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

export async function readGameStats(run: string | null = null): Promise<GameStats> {
  const [snap, data] = await Promise.all([getGameDb().doc(GAME_STATS_DOC).get(), runData(run)])
  return withBoard(toStats(snap.data()), data)
}

export async function startRun(): Promise<{ run: string }> {
  const ref = await getGameDb().collection(RUNS).add({ startedAt: FieldValue.serverTimestamp(), ms: null, initials: null })
  return { run: ref.id }
}

// A finished team counts toward the totals with the time the client reports; it has no board.
export async function recordTeam(ms: number, run: string | null): Promise<GameStats> {
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
export async function recordBoss(run: string): Promise<GameStats | null> {
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
export async function nameRun(run: string, initials: string): Promise<GameStats | null> {
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
