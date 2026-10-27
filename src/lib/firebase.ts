import { type FirebaseApp, initializeApp } from 'firebase/app'
import { type Auth, getAuth } from 'firebase/auth'
import {
  doc,
  type DocumentReference,
  type Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { type FirebaseStorage, getStorage } from 'firebase/storage'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

/**
 * All app data lives under one shared document: RC-FormWork-Design-Web-App/root/{category}/…
 * Every signed-in user (anonymous included) reads and writes the same tree — nothing is split per user.
 */
export const ROOT_COLLECTION = 'RC-FormWork-Design-Web-App'
export const ROOT_DOC = 'root'
/** Sub-collections of the root document, one per menu. */
export const CATEGORY = {
  projects: 'projects',
  elements: 'elements',
  uploads: 'uploads',
  settings: 'settings',
} as const

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined
let rootRef: DocumentReference | undefined

/** Error raised while starting Firebase; the app falls back to Local mode instead of a blank page. */
export let firebaseInitError: string | undefined

if (config.apiKey && config.projectId && config.appId) {
  try {
    app = initializeApp(config)
    auth = getAuth(app)
    try {
      // offline persistence so site users keep working without signal
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        // engine inputs carry optional fields (e.g. spacingCm) that are often undefined
        ignoreUndefinedProperties: true,
      })
    } catch {
      // IndexedDB unavailable (private mode, some embedded browsers) → memory cache
      try {
        db = initializeFirestore(app, { localCache: memoryLocalCache(), ignoreUndefinedProperties: true })
      } catch {
        db = getFirestore(app)
      }
    }
    if (config.storageBucket) storage = getStorage(app)
    rootRef = doc(db, ROOT_COLLECTION, ROOT_DOC)
  } catch (e) {
    firebaseInitError = (e as Error).message
    console.error('Firebase init failed — running in Local mode', e)
    app = auth = db = storage = rootRef = undefined
  }
}

/** Firebase is used only when the web-app config is provided and started cleanly; otherwise the app runs in Local mode. */
export const firebaseEnabled = Boolean(db && auth)
export const storageEnabled = Boolean(storage)

export { app, auth, db, rootRef, storage }
