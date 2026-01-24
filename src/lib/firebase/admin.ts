
import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

if (!admin.apps.length) {
    const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON;
    const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

    if (serviceAccountJson) {
        try {
            // Attempt to parse the JSON
            let serviceAccount: any; // Use 'any' since actual Firebase JSON uses snake_case (private_key, not privateKey)
            try {
                serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
                console.log('✅ Service account JSON parsed successfully');
            } catch (e) {
                // If simple parse fails, try to clean up the string
                // Sometimes env vars come with extra wrapping quotes or escaped characters
                console.warn("⚠️  Initial JSON parse failed, attempting to clean JSON string...");
                let cleanedJson = serviceAccountJson;
                if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
                    cleanedJson = cleanedJson.slice(1, -1);
                }
                // Unescape double-escaped quotes if they exist (e.g. \" -> ")
                cleanedJson = cleanedJson.replace(/\\"/g, '"');
                serviceAccount = JSON.parse(cleanedJson) as ServiceAccount;
                console.log('✅ Service account JSON parsed after cleaning');
            }

            // Fix private key newlines if they are literal "\n" strings
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            // Validate required fields
            if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
                throw new Error('Service account is missing required fields: project_id, client_email, or private_key');
            }

            // Initialize with explicit credential object to prevent ADC fallback
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount), // Pass the whole object directly
                projectId: serviceAccount.project_id,
                databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
            });

            console.log(`✅ Firebase Admin initialized with project: ${serviceAccount.project_id}`);
            console.log(`   Service Account: ${serviceAccount.client_email}`);
        } catch (error) {
            console.error("❌ Warning: Failed to parse SERVICE_ACCOUNT_JSON. Using default credentials as fallback.");
            console.error("   Details:", error instanceof Error ? error.message : String(error));
            // Do not throw here. Fall through to ADC.
        }
    }

    // Fallback: Use Application Default Credentials (ADC)
    // This is the preferred method for Cloud Functions / App Hosting
    if (!admin.apps.length) {
        try {
            // Try initializing without arguments (auto-discovery)
            admin.initializeApp();
            console.log('✅ Firebase Admin initialized with Default Credentials (ADC)');
        } catch (e) {
            // If that fails (e.g. no project ID found), try with explicit project ID
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
            if (projectId) {
                try {
                    console.log(`⚠️ ADC failed, retrying with project ID: ${projectId}`);
                    admin.initializeApp({ projectId });
                    console.log('✅ Firebase Admin initialized with Project ID');
                } catch (retryErr) {
                    console.error("❌ Fatal: Failed to initialize Firebase Admin:", retryErr);
                    // Now we throw, because we have no other options
                }
            } else {
                console.warn("⚠️ Could not find Project ID. Admin SDK might not work.");
            }
        }
    }

    // Connect to emulators if enabled
    if (useEmulators) {
        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
        process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
        console.log('🔧 Firebase Admin connected to emulators');
    }
}

// Export initialized services
const firestoreDb = admin.firestore();
const auth = admin.auth();

export { admin, firestoreDb, auth };
