#!/usr/bin/env node

/**
 * Script to set isSuperAdmin flag for a user
 * Usage: node set-super-admin.js <email>
 * Example: node set-super-admin.js admin@example.com
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(__dirname, 'service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        projectId: 'studio-3973035687-658c0'
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function setSuperAdmin(email) {
    console.log('🔥 [Safety Check] Verifying environment...');
    
    // Safety check: Prevents running on production unless forced
    const isForced = process.argv.includes('--force-prod');
    const projectId = admin.app().options.projectId;
    const isProductionProject = projectId?.includes('-prod');

    if (isProductionProject && !isForced) {
        console.error('❌ ERROR: Running on a production project without --force-prod');
        console.error(`Current Project: ${projectId}`);
        process.exit(1);
    }

    if (isForced) {
        console.warn('⚠️  WARNING: Running in FORCE PRODUCTION mode.');
    }

    try {
        console.log(`🔍 Looking for user with email: ${email}`);

        // Get user by email
        const userRecord = await auth.getUserByEmail(email);
        console.log(`✅ Found user: ${userRecord.uid}`);

        // Update Firestore document
        await db.collection('users').doc(userRecord.uid).update({
            isSuperAdmin: true
        });

        console.log(`✅ Successfully set isSuperAdmin=true for ${email}`);
        console.log(`User ID: ${userRecord.uid}`);

        // Verify the update
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const userData = userDoc.data();
        console.log(`\n📊 Updated user data:`);
        console.log(`  - Email: ${userData.email}`);
        console.log(`  - isVerified: ${userData.isVerified}`);
        console.log(`  - isSuperAdmin: ${userData.isSuperAdmin}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node set-super-admin.js <email>');
    process.exit(1);
}

setSuperAdmin(email)
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
