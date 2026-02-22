const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
    admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

async function setupTestUser() {
    try {
        const email = 'testbenched@example.com';
        let user;
        try {
            user = await auth.getUserByEmail(email);
            await auth.updateUser(user.uid, { password: 'password123', emailVerified: true });
            console.log('User updated');
        } catch (e) {
            user = await auth.createUser({
                email,
                password: 'password123',
                emailVerified: true,
                displayName: 'Automated Tester'
            });
            console.log('User created');
        }

        await db.collection('users').doc(user.uid).set({
            email,
            displayName: 'Automated Tester',
            role: 'seller',
            canSell: true,
            emailVerified: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Also create a dummy image for testing
        fs.writeFileSync(path.join(process.cwd(), 'public', 'test-image.jpg'), 'dummy content');
        console.log('Setup complete!');
    } catch (e) {
        console.error('Error:', e);
    }
}

setupTestUser();
