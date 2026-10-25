import { parseRun, readGameStats } from '../../utils/game-stats'

export default defineEventHandler(async (event) => {
  const run = parseRun(getQuery(event).run)
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
