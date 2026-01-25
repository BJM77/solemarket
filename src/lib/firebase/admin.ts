
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

if (!admin.apps.length) {
    const isProduction = process.env.NODE_ENV === 'production';
    const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

    try {
        if (serviceAccountJson) {
            // Priority 1: Service Account JSON (Works in Prod & Dev if variable is set)
            try {
                let serviceAccount = JSON.parse(serviceAccountJson);
                // Fix common string escaping issues
                if (typeof serviceAccount === 'string') {
                    serviceAccount = JSON.parse(serviceAccount);
                }

                // Fix newline characters in private_key
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                });
                console.log('✅ Firebase Admin initialized with Service Account JSON.');
            } catch (jsonError) {
                console.error('⚠️ Malformed SERVICE_ACCOUNT_JSON. Falling back to ADC.', jsonError);
                // Fallback to ADC if JSON fails
                admin.initializeApp({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-8322868971-8ca89',
                    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                });
            }
        } else {
            // Priority 2: ADC (Production default)
            console.log('🚀 No JSON found. Initializing Firebase Admin with ADC...');
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-8322868971-8ca89',
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-8322868971-8ca89.firebasestorage.app',
            });
            console.log('✅ Firebase Admin initialized with ADC.');
        }
    } catch (error) {
        console.error('❌ CRITICAL: Firebase Admin initialization failed:', error);
    }

    // Connect to emulators if enabled (works for both AD and cert)
    if (useEmulators) {
        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
        process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
        process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
        console.log('🔧 Firebase Admin connected to emulators');
    }
}

// Safety check before exporting to prevent module crash if init failed completely
if (!admin.apps.length) {
    console.error('❌ CRITICAL: Firebase Admin app not initialized. Attempting emergency init...');
    try {
        admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-8322868971-8ca89',
        });
    } catch (e) {
        console.error('❌ CRITICAL: Emergency init failed.', e);
    }
}

// Export initialized services
const firestoreDb = admin.firestore();
const auth = admin.auth();
const storage = admin.storage(); // Also export storage

export { admin, firestoreDb, auth, storage };
