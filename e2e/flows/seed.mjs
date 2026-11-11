// Seeds the Firebase emulators (project demo-benched) for e2e flow tests.
// Run inside `firebase emulators:exec`; never touches a real project.
import admin from 'firebase-admin';

const projectId = process.env.GCLOUD_PROJECT || 'demo-benched';
if (!projectId.startsWith('demo-')) throw new Error('Refusing to seed a non-demo project');
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

admin.initializeApp({ projectId });
const db = admin.firestore();
const auth = admin.auth();

export const PASSWORD = 'e2e-Password-123';
const users = {
  seller: { uid: 'e2e-seller', email: 'seller@e2e.test', displayName: 'E2E Seller' },
  buyer: { uid: 'e2e-buyer', email: 'buyer@e2e.test', displayName: 'E2E Buyer' },
};

for (const u of Object.values(users)) {
  try { await auth.deleteUser(u.uid); } catch { /* new */ }
  await auth.createUser({ ...u, password: PASSWORD, emailVerified: true });
}

const now = admin.firestore.FieldValue.serverTimestamp();
await db.doc('users/e2e-seller').set({
  uid: 'e2e-seller', email: users.seller.email, displayName: 'E2E Seller', storeName: 'E2E Store',
  sellerStatus: 'approved', canSell: true, role: 'user', acceptsCash: true, acceptsPayID: true, payIdReady: true,
  suburb: 'Perth', state: 'WA', createdAt: now,
});
await db.doc('users/e2e-seller/private/payout').set({ payId: '0400000000', payIdType: 'phone', accountName: 'E2E Seller' });
await db.doc('users/e2e-buyer').set({
  uid: 'e2e-buyer', email: users.buyer.email, displayName: 'E2E Buyer', role: 'user', createdAt: now,
});

const base = {
  sellerId: 'e2e-seller', sellerName: 'E2E Seller', category: 'Collector Cards', subCategory: 'Pokemon',
  condition: 'Near Mint', quantity: 1, imageUrls: ['/placeholder.png'], description: 'Seeded for e2e.',
  acceptsPayId: true, acceptsCash: true, createdAt: now, updatedAt: now,
};
await db.doc('products/e2e-live-1').set({
  ...base, title: 'E2E Charizard Test Card', price: 12, status: 'available', isDraft: false, isPrivate: false,
});
// Guest checkout flow (signed-out buyer, email code, 30-minute PayID hold).
await db.doc('products/e2e-guest-1').set({
  ...base, title: 'E2E Guest Checkout Card', price: 15, status: 'available', isDraft: false, isPrivate: false,
});
for (let i = 1; i <= 3; i++) {
  await db.doc(`products/e2e-draft-${i}`).set({
    ...base, title: `E2E Draft Card ${i}`, price: 5 + i, status: 'draft', isDraft: true,
  });
}
console.log('Seeded emulators for', projectId);
process.exit(0);
