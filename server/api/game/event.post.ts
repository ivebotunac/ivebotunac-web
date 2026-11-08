import { clientKey, createGameLimiter, parseGameEvent, readEventBody } from '../../utils/game-guard'
import { nameRun, recordBoss, recordTeam, startRun } from '../../utils/game-stats'
import type { GameStats } from '~~/shared/types/game-stats'

const limiter = createGameLimiter()

export default defineEventHandler(async (event) => {
  const parsed = parseGameEvent(await readEventBody(event))
  if (!parsed) throw createError({ statusCode: 400, statusMessage: 'Invalid game event' })

  // The client IP is held only as a limiter key for the window; it is never logged or stored.
  if (!limiter.allow(clientKey(event), parsed.kind)) throw createError({ statusCode: 429, statusMessage: 'Too many game events' })

  setResponseHeader(event, 'cache-control', 'no-store')
  let result: GameStats | null
  try {
    switch (parsed.kind) {
      case 'run': return await startRun()
      case 'team': return await recordTeam(parsed.ms, parsed.run)
      case 'boss': result = await recordBoss(parsed.run); break
      case 'name': result = await nameRun(parsed.run, parsed.initials); break
    }
  } catch (err) {
    console.error('[game] event write failed:', err instanceof Error ? err.message : err)
    throw createError({ statusCode: 503, statusMessage: 'Game stats unavailable' })
  }
  // null: the fight is unknown or impossibly fast, or for a name, already signed or not finished yet
  if (!result) throw createError({ statusCode: 409, statusMessage: parsed.kind === 'name' ? 'Run cannot be named' : 'Time not accepted' })
  return result
})
