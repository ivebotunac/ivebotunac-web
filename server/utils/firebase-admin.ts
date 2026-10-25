import { getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'tech-primo'

let db: Firestore | null = null

// Application Default Credentials only: on App Hosting that is the backend's service account, so no key exists anywhere.
export function getGameDb(): Firestore {
  if (db) return db
  // Local play, `nuxt preview` included, must never move the production counters: only Cloud Run (K_SERVICE) or the emulator.
  if (!process.env.K_SERVICE && !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Game stats are off outside Cloud Run without FIRESTORE_EMULATOR_HOST')
  const app: App = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID })
  db = getFirestore(app)
  return db
}
