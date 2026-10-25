import { readGameStats } from '../../utils/game-stats'

export default defineEventHandler(async (event) => {
  try {
    const stats = await readGameStats()
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=60')
    return stats
  } catch (err) {
    console.error('[game] stats read failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 503, statusMessage: 'Game stats unavailable' })
  }
})
