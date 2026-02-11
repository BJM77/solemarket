import 'server-only';
import * as admin from 'firebase-admin';
export { admin };
import path from 'path';
import fs from 'fs';


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
        // Priority 1: Application Default Credentials (production/GCP)
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
            console.log('✅ Firebase Admin: Using GOOGLE_APPLICATION_CREDENTIALS');
            return admin.initializeApp({
                ...config,
                credential: admin.credential.applicationDefault(),
            });
        }

        // Priority 2: Service Account JSON from Environment Variable
        const saJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        console.log('🔍 Firebase Admin Check: saJson length:', saJson?.length || 0);
        if (saJson) {
            console.log('✅ Firebase Admin: Using Service Account JSON from env');
            try {
                const serviceAccount = JSON.parse(saJson);
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                return admin.initializeApp({
                    ...config,
                    credential: admin.credential.cert(serviceAccount),
                });
            } catch (error: any) {
                // Don't throw here - log and continue to next priority
                // This allows production to fall through to ADC if JSON is malformed
                console.warn('⚠️ Firebase Admin: SERVICE_ACCOUNT_JSON parsing failed, trying other methods...');
                console.warn('   Error:', error.message);
            }
        }

        // Priority 2.5: Individual Secret Environment Variables (App Hosting/Secrets)
        if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
            console.log('✅ Firebase Admin: Attempting to use Individual Secrets');
            console.log('   FIREBASE_ADMIN_CLIENT_EMAIL is set:', !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
            console.log('   FIREBASE_ADMIN_PRIVATE_KEY length:', process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length);
            try {
                // Handle private key newlines - support both escaped (\\n) and literal newlines
                let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
                // Replace escaped literal \n with actual newlines if needed
                if (privateKey.includes('\\n')) {
                    privateKey = privateKey.replace(/\\n/g, '\n');
                }
                const app = admin.initializeApp({
                    ...config,
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || projectId,
                        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                        privateKey: privateKey,
                    }),
                });
                console.log('✅ Firebase Admin: Successfully initialized with Individual Secrets');
                return app;
            } catch (error: any) {
                console.error('❌ Firebase Admin: Failed to initialize with individual secrets:', error.message);
            }
        } else {
            console.log('⚠️ Firebase Admin: Individual secrets not set, skipping Priority 2.5');
            console.log('   FIREBASE_ADMIN_PRIVATE_KEY:', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);
            console.log('   FIREBASE_ADMIN_CLIENT_EMAIL:', !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
        }

        // Priority 3: File-based Service Account (Development/Local)
        // Only attempt this if we are likely in a local environment
        const saPath = path.resolve(process.cwd(), 'studio-8322868971-8ca89-firebase-adminsdk-fbsvc-b2a4041fbd.json');
        if (fs.existsSync(saPath)) {
            console.log('✅ Firebase Admin: Using local service account file');
            return admin.initializeApp({
                ...config,
                credential: admin.credential.cert(require(saPath)),
            });
        }

        // Priority 4: Default ADC Fallback (useful if running in Cloud Run/Functions without explicitly set env var)
        console.log('ℹ️ Firebase Admin: Falling back to default Application Default Credentials');
        return admin.initializeApp({
            ...config,
            credential: admin.credential.applicationDefault(),
        });

    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
        // Return existing app if something raced and created it, mostly for safety
        if (admin.apps.length > 0) return admin.apps[0]!;
        throw error;
    }
}

let firebaseAdminApp: admin.app.App | undefined;
let firestoreDb: admin.firestore.Firestore | any;
let authAdmin: admin.auth.Auth | any;
let storageAdmin: admin.storage.Storage | any;
let messagingAdmin: admin.messaging.Messaging | any;

try {
    firebaseAdminApp = initializeFirebaseAdmin();
    firestoreDb = firebaseAdminApp.firestore();
    authAdmin = firebaseAdminApp.auth();
    storageAdmin = firebaseAdminApp.storage();
    messagingAdmin = firebaseAdminApp.messaging();
    console.log('✅ Firebase Admin: All services initialized successfully');
} catch (error) {
    console.error('❌ CRITICAL: Failed to initialize Firebase Admin services:', error);
    // Continue without crashing the whole module load - dependent calls will fail later with better context
}

export {
    firestoreDb,
    authAdmin,
    storageAdmin,
    messagingAdmin,
    firebaseAdminApp,
    initializeFirebaseAdmin
};
export const auth = authAdmin; // Alias
