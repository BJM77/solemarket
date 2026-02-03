
import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  getFirestore,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getPerformance, FirebasePerformance } from "firebase/performance";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  if (!firebaseConfig.apiKey) {
    if (typeof window === 'undefined') {
      // Build time or Server side without keys - safe to ignore or partial init?
      // But if we throw, build fails.
      // Let's log warning and proceed? But initializeApp will fail with empty config?
      console.warn("⚠️ Missing Firebase API Key during server/build. functionality may be limited.");
    } else {
      throw new Error("Missing Firebase API Key. Please set NEXT_PUBLIC_FIREBASE_API_KEY");
    }
  }
  app = initializeApp(firebaseConfig);

  if (typeof window !== 'undefined') {
    // Enable offline persistence on the client
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (error) {
      console.error("Firestore persistence initialization error:", error);
      db = getFirestore(app);
    }
  } else {
    db = getFirestore(app);
  }
} else {
  app = getApp();
  db = getFirestore(app);
}


// Auth and Storage rely on browser APIs, so we initialize them conditionally
// to prevent errors during server-side rendering or build steps.
let auth: Auth;
let storage: FirebaseStorage;
let perf: FirebasePerformance | undefined;

if (typeof window !== 'undefined') {
  try {
    auth = getAuth(app);
    storage = getStorage(app);

    // Initialize performance monitoring on the client in production
    if (process.env.NODE_ENV === 'production') {
      perf = getPerformance(app);
    }

    // CRITICAL: Ensure we're NEVER in emulator mode in production
    const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && useEmulators) {
      console.error('❌ CRITICAL: Emulator mode is enabled in production! This should never happen.');
    } else if (isProduction) {
      console.log('✅ Firebase running in PRODUCTION mode (emulators disabled)');
    } else if (useEmulators) {
      console.log('🔧 Firebase running in DEVELOPMENT mode with emulators');
      connectAuthEmulator(auth, "http://localhost:9099");
      connectFirestoreEmulator(db, "localhost", 8080);
      connectStorageEmulator(storage, "localhost", 9199);
    } else {
      console.log('🔧 Firebase running in DEVELOPMENT mode (no emulators)');
    }
  } catch (e) {
    console.error("Firebase Auth/Storage could not be initialized on the client.", e);
  }
}

// @ts-ignore - auth and storage may be uninitialized on the server
export { app, auth, db, storage, perf };
