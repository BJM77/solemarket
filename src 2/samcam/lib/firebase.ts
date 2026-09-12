import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

let firebaseConfig: any;

// App Hosting provides the config as an environment variable.
// In a local dev environment, we'll fall back to the public env vars.
if (process.env.FIREBASE_CONFIG) {
  try {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  } catch (e) {
    console.error("Failed to parse FIREBASE_CONFIG", e);
  }
} else {
  firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  // Check if we have at least the minimum required config
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    console.warn("Firebase config is incomplete. Services may not be available.");
    // @ts-ignore
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
    // @ts-ignore
    storage = undefined;
  } else {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Benched.au: Firebase Services initialized.");
  }
} catch (error) {
  console.error("Firebase initialization critical error:", error);
  // @ts-ignore
  app = undefined;
  // @ts-ignore
  auth = undefined;
  // @ts-ignore
  db = undefined;
  // @ts-ignore
  storage = undefined;
}

export { app, auth, db, storage };



