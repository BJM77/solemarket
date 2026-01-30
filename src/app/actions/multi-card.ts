'use server';

import { firestoreDb as db, auth as adminAuth, storageAdmin } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function quickSaveAndPublish(idToken: string, data: any, imageDataUris: string[] = []) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Verify Super Admin
        const user = await adminAuth.getUser(userId);
        const isSuperAdmin = user.customClaims?.role === 'superadmin' || user.customClaims?.role === 'admin';

        if (!isSuperAdmin) {
            throw new Error('Unauthorized: Super Admin access required.');
        }

        let imageUrls = data.imageUrls || [];

        // Upload multiple images
        if (imageDataUris.length > 0) {
            for (let i = 0; i < imageDataUris.length; i++) {
                const uri = imageDataUris[i];
                if (uri && uri.startsWith('data:')) {
                    const matches = uri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const type = matches[1];
                        const buffer = Buffer.from(matches[2], 'base64');
                        const fileName = `products/${userId}/fast_${Date.now()}_${i}.jpg`;
                        const file = storageAdmin.bucket().file(fileName);

                        await file.save(buffer, {
                            metadata: { contentType: type },
                            public: true
                        });

                        const publicUrl = `https://storage.googleapis.com/${storageAdmin.bucket().name}/${fileName}`;
                        imageUrls.push(publicUrl);
                    }
                }
            }
        }

        const userRef = db.collection('users').doc(userId);
        const userData = (await userRef.get()).data();

        const productData = {
            ...data,
            imageUrls,
            sellerId: userId,
            sellerName: userData?.displayName || 'Admin',
            sellerEmail: userData?.email || '',
            sellerAvatar: userData?.photoURL || '',
            status: 'available',
            isDraft: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('products').add(productData);
        return { success: true, id: docRef.id };

    } catch (error: any) {
        console.error('Error in quickSaveAndPublish:', error);
        return { success: false, error: error.message };
    }
}
