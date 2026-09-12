'use server';

import { firestoreDb as db, auth as adminAuth, storageAdmin } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ensureActionAuth } from '@/lib/action-utils';

export async function quickSaveAndPublish(idToken: string, data: any, imageDataUris: string[] = []) {
    console.log('🚀 Starting quickSaveAndPublish', { imageDataCount: imageDataUris.length });
    try {
        const { uid: userId } = await ensureActionAuth(idToken, ['admin', 'superadmin']);
        console.log('✅ Action authorized for admin:', userId);

        // Fetch remaining user details for metadata
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        let imageUrls = data.imageUrls || [];

        // Upload multiple images
        if (imageDataUris.length > 0) {
            console.log('📸 Uploading images...');
            for (let i = 0; i < imageDataUris.length; i++) {
                const uri = imageDataUris[i];
                if (uri && uri.startsWith('data:')) {
                    const matches = uri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const type = matches[1];
                        const buffer = Buffer.from(matches[2], 'base64');
                        const fileName = `products/${userId}/fast_${Date.now()}_${i}.jpg`;
                        const file = storageAdmin.bucket().file(fileName);

                        console.log(`⏳ Saving file ${i + 1}/${imageDataUris.length}: ${fileName}`);
                        await file.save(buffer, {
                            metadata: { contentType: type }
                        });

                        const bucketName = storageAdmin.bucket().name;
                        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`;
                        imageUrls.push(publicUrl);
                        console.log(`✅ File saved. URL: ${publicUrl}`);
                    }
                }
            }
        }

        console.log('📂 Proceeding with sanitized user data...');
        // Sanitization and product data preparation (using userData from above)

        // Sanitize data - remove undefined/null that might crash Firestore
        // Also ensure no 'id' field is passed to .add()
        const sanitizedData = { ...data };
        Object.keys(sanitizedData).forEach(key => {
            if (sanitizedData[key] === undefined) {
                delete sanitizedData[key];
            }
        });

        if (sanitizedData.id) delete sanitizedData.id;

        const productData = {
            ...sanitizedData,
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

        console.log('📝 Adding product to Firestore...', {
            title: productData.title,
            imageCount: productData.imageUrls?.length,
            category: productData.category
        });

        const docRef = await db.collection('products').add(productData);
        console.log('✅ Product added with ID:', docRef.id);

        return { success: true, id: docRef.id };

    } catch (error: any) {
        console.error('❌ Error in quickSaveAndPublish:', error);
        return { success: false, error: error.message };
    }
}
