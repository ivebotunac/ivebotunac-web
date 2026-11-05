import { clientKey, createGameLimiter, parseGameEvent, readEventBody } from '../../utils/game-guard'
import { nameRun, recordBoss, recordTeam, startRun } from '../../utils/game-stats'

const limiter = createGameLimiter()

export default defineEventHandler(async (event) => {
  const parsed = parseGameEvent(await readEventBody(event))
  if (!parsed) throw createError({ statusCode: 400, statusMessage: 'Invalid game event' })

  // Held only as a limiter key for the window; never logged or stored.
  if (!limiter.allow(clientKey(event), parsed.kind)) throw createError({ statusCode: 429, statusMessage: 'Too many game events' })

  setResponseHeader(event, 'cache-control', 'no-store')
  let result
  try {
    if (parsed.kind === 'run') return await startRun()
    if (parsed.kind === 'team') return await recordTeam(parsed.ms, parsed.run)
    result = parsed.kind === 'boss' ? await recordBoss(parsed.run) : await nameRun(parsed.run, parsed.initials)
  } catch (err) {
    console.error('[game] event write failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 503, statusMessage: 'Game stats unavailable' })
  }
  // a fight unknown or impossibly fast, or one already signed or unfinished
  if (!result) throw createError({ statusCode: 409, statusMessage: parsed.kind === 'name' ? 'Run cannot be named' : 'Time not accepted' })
  return result
})
