import type { H3Event } from 'h3'

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

// The client reports the team's time itself, so anything faster than this was not played.
const TEAM_MIN_MS = 20_000
const TEAM_MAX_MS = 86_400_000

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

// App Hosting sets x-fah-client-ip behind its proxies; the last entry is the one a client cannot forge.
export function clientKey(event: H3Event): string {
  const fah = process.env.K_SERVICE ? getRequestHeader(event, 'x-fah-client-ip')?.split(',').pop()?.trim() : undefined
  return fah || getRequestIP(event) || 'unknown'
}

// A valid event is under 100 bytes; anything larger is refused before it is buffered or parsed.
const MAX_BODY_BYTES = 1024

export async function readEventBody(event: H3Event): Promise<unknown> {
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
