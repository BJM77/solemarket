import 'server-only';
import * as admin from 'firebase-admin';
import { resolveAdminCredential } from './admin-credential';

// Re-export admin for convenience
export { admin };

function initializeFirebaseAdmin() {
    // Check for Emulator usage
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
        if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
            process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
            console.log('🔧 Configured Firebase Admin to use Auth Emulator at 127.0.0.1:9099');
        }
        if (!process.env.FIRESTORE_EMULATOR_HOST) {
            process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
        }
        if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
            process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
        }
    }

    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!projectId || !storageBucket) {
        console.error('Missing Firebase configuration environment variables');
    }

    const config = {
        projectId,
        storageBucket,
    };

    try {
        // Priority 1: Local Service Account File (Development)
        const fs = require('fs');
        const path = require('path');
        const saFile = path.resolve(process.cwd(), 'service-account.json');
        if (fs.existsSync(saFile)) {
            const serviceAccount = JSON.parse(fs.readFileSync(saFile, 'utf8'));
            return admin.initializeApp({
                ...config,
                credential: admin.credential.cert(serviceAccount),
            });
        }

        // Priority 2: env-var service account (validated). Falls back to ADC
        // (App Hosting's runtime service account) when absent or invalid.
        const resolved = resolveAdminCredential();
        if (resolved.kind === 'cert') {
            console.log(`✅ Firebase Admin: using service-account credential from ${resolved.from}`);
            return admin.initializeApp({
                ...config,
                credential: admin.credential.cert({
                    projectId: resolved.projectId || projectId,
                    clientEmail: resolved.clientEmail,
                    privateKey: resolved.privateKey,
                }),
            });
        }

        console.log(`ℹ️ Firebase Admin: using Application Default Credentials (${resolved.reason}).`);
        return admin.initializeApp({
            ...config,
            credential: admin.credential.applicationDefault(),
        });

    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
        if (admin.apps.length > 0) return admin.apps[0]!;
        throw error;
    }
}

let firebaseAdminApp: admin.app.App | undefined;
let firestoreDb: admin.firestore.Firestore | any;
let authAdmin: admin.auth.Auth | any;
let storageAdmin: admin.storage.Storage | any;
let messagingAdmin: admin.messaging.Messaging | any;
let isFirebaseAdminReady = false;

try {
    firebaseAdminApp = initializeFirebaseAdmin();
    // Use a proxy or simple object if init failed to avoid "Cannot read properties of undefined"
    if (firebaseAdminApp) {
        firestoreDb = firebaseAdminApp.firestore();
        authAdmin = firebaseAdminApp.auth();
        storageAdmin = firebaseAdminApp.storage();
        messagingAdmin = firebaseAdminApp.messaging();
        isFirebaseAdminReady = true;
        if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Firebase Admin: All services initialized successfully');
        }
    } else {
        throw new Error('initializeFirebaseAdmin returned undefined');
    }
} catch (error) {
    console.error('❌ CRITICAL: Failed to initialize Firebase Admin services:', error);
    isFirebaseAdminReady = false;

    // Fail-fast in production: Do not hide fatal infrastructure errors with placeholders.
    if (process.env.NODE_ENV === 'production') {
        throw error;
    }

    // Fallback dummies for local development to prevent massive 500s on the homepage
    // Robust recursive proxy to handle any chain of Firestore calls without crashing
    const createPlaceholder = (name: string): any => {
        const placeholder: any = new Proxy(() => { }, {
            get: (target, prop) => {
                const p = String(prop);
                // Terminal methods that return promises
                if (p === 'get') return () => Promise.resolve({
                    exists: false,
                    data: () => ({}),
                    docs: [],
                    size: 0,
                    empty: true
                });
                if (p === 'set' || p === 'update' || p === 'add' || p === 'delete' || p === 'commit') return () => Promise.resolve();

                // Chainable methods
                if (['collection', 'doc', 'where', 'orderBy', 'limit', 'startAfter', 'count'].includes(p)) {
                    return () => placeholder;
                }

                // Data access on the result of a get() might call .data() or .count
                if (p === 'data') return () => ({ count: 0 });

                return placeholder;
            }
        });
        return placeholder;
    };

    firestoreDb = createPlaceholder('firestore');
    firestoreDb.runTransaction = () => Promise.resolve();
    authAdmin = {
        verifyIdToken: () => {
            console.warn('⚠️ Firebase Admin: verifyIdToken called on fallback.');
            throw new Error('Firebase Authentication is currently unavailable.');
        }
    };
    storageAdmin = { bucket: () => ({ name: 'unknown', setCorsConfiguration: () => Promise.resolve() }) };
    messagingAdmin = { send: () => Promise.resolve() };
}

export {
    firestoreDb,
    authAdmin,
    storageAdmin,
    messagingAdmin,
    firebaseAdminApp,
    initializeFirebaseAdmin,
    isFirebaseAdminReady
};
export const auth = authAdmin; // Alias
