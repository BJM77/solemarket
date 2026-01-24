
import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

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
        throw new Error("Missing Firebase API Key. Please set NEXT_PUBLIC_FIREBASE_API_KEY in your .env file");
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

if (typeof window !== 'undefined') {
  try {
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (e) {
    console.error("Firebase Auth/Storage could not be initialized on the client.", e);
  }
}

// @ts-ignore - auth and storage may be uninitialized on the server
export { app, auth, db, storage };
