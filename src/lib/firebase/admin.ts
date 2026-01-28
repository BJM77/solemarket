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
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log('✅ Firebase Admin: Using GOOGLE_APPLICATION_CREDENTIALS');
            return admin.initializeApp({
                ...config,
                credential: admin.credential.applicationDefault(),
            });
        }

        // Priority 2: Service Account JSON from Environment Variable
        const saJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (saJson) {
            console.log('✅ Firebase Admin: Using Service Account JSON from env');
            try {
                const serviceAccount = JSON.parse(saJson.replace(/\\n/g, '\n'));
                return admin.initializeApp({
                    ...config,
                    credential: admin.credential.cert(serviceAccount),
                });
            } catch (error) {
                console.error('❌ Firebase Admin: Failed to parse SERVICE_ACCOUNT_JSON:', error);
                throw new Error('Invalid SERVICE_ACCOUNT_JSON format');
            }
        }

        // Priority 2.5: Individual Secret Environment Variables (App Hosting/Secrets)
        if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
            console.log('✅ Firebase Admin: Using Individual Secrets');
            try {
                // Handle private key newlines
                const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
                return admin.initializeApp({
                    ...config,
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || projectId,
                        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                        privateKey: privateKey,
                    }),
                });
            } catch (error) {
                console.error('❌ Firebase Admin: Failed to initialize with individual secrets:', error);
            }
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

const firebaseAdminApp = initializeFirebaseAdmin();
export const firestoreDb = firebaseAdminApp.firestore();
export const authAdmin = firebaseAdminApp.auth();
export const auth = authAdmin; // Alias for compatibility
export const storageAdmin = firebaseAdminApp.storage();
export const messagingAdmin = firebaseAdminApp.messaging();
