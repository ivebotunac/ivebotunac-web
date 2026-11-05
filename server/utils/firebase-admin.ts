import { getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

const PROJECT_ID = 'tech-primo'

let db: Firestore | null = null

// Application Default Credentials only (App Hosting's service account): no key file exists.
export function getGameDb(): Firestore {
  if (db) return db
  // Local runs, `nuxt preview` included, never reach production: only Cloud Run (K_SERVICE) or the emulator.
  if (!process.env.K_SERVICE && !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Game stats are off outside Cloud Run without FIRESTORE_EMULATOR_HOST')
  const app: App = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID })
  db = getFirestore(app)
  return db
}
