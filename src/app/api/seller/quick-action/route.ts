import { NextRequest, NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Public API for Seller Quick Actions via Email
 * Allows a seller to update an enquiry status without logging in, 
 * provided they have the unique quickActionToken.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const token = searchParams.get('token');
        const action = searchParams.get('action') as 'pending' | 'sold' | 'available';

        if (!productId || !token || !action) {
            return new NextResponse('Missing parameters', { status: 400 });
        }

        const docRef = firestoreDb.collection('products').doc(productId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return new NextResponse('Product not found', { status: 404 });
        }

        const data = docSnap.data();

        // Security: Validate the unique token
        if (data?.quickActionToken !== token) {
            return new NextResponse('Invalid or expired token', { status: 403 });
        }

        let updateData: any = { 
            enquiryStatus: action,
            updatedAt: FieldValue.serverTimestamp() 
        };

        let message = '';

        if (action === 'sold') {
            updateData.status = 'sold';
            message = 'Congratulations! The item has been marked as SOLD and removed from the public feed.';
            
            // Trigger review nudge if someone was holding/enquiring
            if (data.heldBy) {
                const { triggerReviewNudge } = await import('@/app/actions/nudge-actions');
                await triggerReviewNudge(productId, data.heldBy);
            }
        } else if (action === 'available') {
            updateData.status = 'available';
            updateData.enquiryStatus = FieldValue.delete();
            updateData.heldBy = FieldValue.delete();
            updateData.holdExpiresAt = FieldValue.delete();
            message = 'The listing is now back to AVAILABLE for other buyers.';
        } else if (action === 'pending') {
            message = 'The listing is now marked as PENDING. Other buyers will see it as Under Offer.';
        }

        await docRef.update(updateData);

        // Simple HTML response for the seller
        return new NextResponse(`
            <html>
                <head>
                    <title>Action Confirmed | Benched.au</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4 font-sans text-center">
                    <div class="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100">
                        <div class="bg-indigo-50 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">✓</div>
                        <h1 class="text-2xl font-black text-slate-900 mb-4">Success!</h1>
                        <p class="text-slate-600 mb-8 leading-relaxed">${message}</p>
                        <a href="https://benched.au/seller/dashboard" class="inline-block w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all">Go to Dashboard</a>
                    </div>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });

    } catch (error: any) {
        console.error('Quick action error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
