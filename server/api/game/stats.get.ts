import { parseRun, readGameStats } from '../../utils/game-stats'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const run = parseRun(q.run), boss = parseRun(q.boss)
  try {
    const stats = await readGameStats(run, boss)
    // a visitor's own runs are personal, so only the anonymous answer may sit in a shared cache
    setResponseHeader(event, 'cache-control', run || boss ? 'no-store' : 'public, max-age=60, s-maxage=60')
    return stats
  } catch (err) {
    console.error('[game] stats read failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 503, statusMessage: 'Game stats unavailable' })
  }
})
