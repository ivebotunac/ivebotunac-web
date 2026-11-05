import { GLOBAL_READS_PER_MIN, clientKey, createGameLimiter, parseRun } from '../../utils/game-guard'
import { readGameStats } from '../../utils/game-stats'

const limiter = createGameLimiter(GLOBAL_READS_PER_MIN)

export default defineEventHandler(async (event) => {
  const run = parseRun(getQuery(event).run)
  // The client IP is held only as a limiter key for the window; it is never logged or stored.
  if (!limiter.allow(clientKey(event), 'read')) throw createError({ statusCode: 429, statusMessage: 'Too many board reads' })
  try {
    const stats = await readGameStats(run)
    // a visitor's own fight is personal, so only the anonymous answer may sit in a shared cache
    setResponseHeader(event, 'cache-control', run ? 'no-store' : 'public, max-age=60, s-maxage=60')
    return stats
  } catch (err) {
    console.error('[game] stats read failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 503, statusMessage: 'Game stats unavailable' })
  }
})
