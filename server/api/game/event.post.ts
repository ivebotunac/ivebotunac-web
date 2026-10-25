import { createGameLimiter, parseGameEvent, recordPop, recordTeam } from '../../utils/game-stats'

const limiter = createGameLimiter()

// App Hosting sets x-fah-client-ip after its own proxies; the leftmost X-Forwarded-For entry is whatever the client sent.
function clientKey(event: Parameters<typeof getRequestIP>[0]): string {
  const fah = process.env.K_SERVICE ? getRequestHeader(event, 'x-fah-client-ip')?.split(',')[0]?.trim() : undefined
  return fah || getRequestIP(event) || 'unknown'
}

export default defineEventHandler(async (event) => {
  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }
  const parsed = parseGameEvent(body)
  if (!parsed) throw createError({ statusCode: 400, statusMessage: 'Invalid game event' })

  // Held only as a limiter key for the window; never logged or stored.
  if (!limiter.allow(clientKey(event), parsed.kind)) throw createError({ statusCode: 429, statusMessage: 'Too many game events' })

  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    return parsed.kind === 'team' ? await recordTeam(parsed.ms) : await recordPop()
  } catch (err) {
    console.error('[game] event write failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 503, statusMessage: 'Game stats unavailable' })
  }
})
