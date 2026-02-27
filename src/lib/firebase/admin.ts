import 'server-only';
import * as admin from 'firebase-admin';

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

        // Priority 2: Service Account JSON from Environment Variable (Generic/GCP)
        const saJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (saJson) {
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
                console.warn('⚠️ Firebase Admin: SERVICE_ACCOUNT_JSON parsing failed:', error.message);
            }
        }

        // Priority 2: Individual Secret Environment Variables (App Hosting/Secrets)
        // Priority 2: Individual Secret Environment Variables (App Hosting/Secrets)
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
        const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
        console.log('DIAGNOSTICS:', { hasClientEmail: !!clientEmail, hasPk: !!pk });

        if (pk && clientEmail) {
            console.log('✅ Firebase Admin: Using Individual Secrets');
            try {
                // Formatting Fixes for Private Key
                let privateKey = pk.trim();

                // Handle literal string "\n"
                if (privateKey.includes('\\n')) {
                    privateKey = privateKey.replace(/\\n/g, '\n');
                }

                // Ensure newlines are restored if they were stripped (common in some UI dashboards)
                // PEM keys must have newlines between lines.
                if (!privateKey.includes('\n')) {
                    console.log('🔧 Firebase Admin: Single-line private key detected, attempting to restore PEM formatting.');
                    // Standard PEM line length is 64 chars, but we only really care about the wrap
                    privateKey = privateKey
                        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
                        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----\n');

                    // We can't easily guess where the internal newlines should be if they are gone, 
                    // but usually modern Google SDKs can handle long lines IF the header/footer are on their own lines.
                }

                // Strip extra quotes
                if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
                if (privateKey.startsWith("'") && privateKey.endsWith("'")) privateKey = privateKey.slice(1, -1);

                return admin.initializeApp({
                    ...config,
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || projectId,
                        clientEmail: clientEmail.trim(),
                        privateKey: privateKey,
                    }),
                });
            } catch (error: any) {
                console.error('❌ Firebase Admin: Failed to initialize with individual secrets:', error.message);
            }
        }

        // Priority 3: Default ADC Fallback (Production/GCP)
        // This works automatically on Google Cloud without manual file checks
        console.log('ℹ️ Firebase Admin: Falling back to Application Default Credentials');
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

try {
    firebaseAdminApp = initializeFirebaseAdmin();
    // Lazy getters or just direct assignment? Direct assignment matches original file structure.
    firestoreDb = firebaseAdminApp.firestore();
    authAdmin = firebaseAdminApp.auth();
    storageAdmin = firebaseAdminApp.storage();
    messagingAdmin = firebaseAdminApp.messaging();
    console.log('✅ Firebase Admin: All services initialized successfully');
} catch (error) {
    console.error('❌ CRITICAL: Failed to initialize Firebase Admin services:', error);
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
