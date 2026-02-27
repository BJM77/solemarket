
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

const saPath = path.resolve(process.cwd(), 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

async function grantAdmin(email) {
    try {
        const user = await getAuth().getUserByEmail(email);
        await getAuth().setCustomUserClaims(user.uid, { role: 'superadmin', admin: true });
        console.log(`✅ Success! Granted superadmin claims to ${email} (UID: ${user.uid})`);

        // Verify
        const updatedUser = await getAuth().getUser(user.uid);
        console.log('Current claims:', updatedUser.customClaims);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

const email = '1@1.com';
grantAdmin(email);
