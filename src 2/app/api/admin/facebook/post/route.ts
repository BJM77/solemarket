import { AuthenticatedRequest, withAuth } from '@/lib/auth-wrapper';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { NextResponse } from 'next/server';

/**
 * Admin API: Post to Official Facebook Page
 * This uses the Facebook Graph API to create a post on the Benched.au page wall.
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
    try {
        const decodedToken = request.user!;
        
        // Ensure user is superadmin
        const isSuperAdmin = SUPER_ADMIN_UIDS.includes(decodedToken.uid) || 
                           (decodedToken.email && SUPER_ADMIN_EMAILS.includes(decodedToken.email)) ||
                           decodedToken.role === 'superadmin';
        
        const { productId, title, imageUrl, link } = await request.json();

        // If not super admin, verify they own the product they are trying to post
        if (!isSuperAdmin) {
            const { firestoreDb } = await import('@/lib/firebase/admin');
            const productDoc = await firestoreDb.collection('products').doc(productId).get();
            
            if (!productDoc.exists) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }

            const productData = productDoc.data();
            if (productData?.sellerId !== decodedToken.uid) {
                return NextResponse.json({ error: 'Forbidden: You can only post your own listings to the official page.' }, { status: 403 });
            }
        }

        const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '61586602780294';
        const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

        if (!ACCESS_TOKEN) {
            return NextResponse.json({ 
                error: 'Facebook Page Access Token not configured in environment variables.' 
            }, { status: 500 });
        }

        // Facebook Graph API call: Post to page feed
        // Documentation: https://developers.facebook.com/docs/graph-api/reference/v22.0/page/feed
        const fbResponse = await fetch(`https://graph.facebook.com/v22.0/${PAGE_ID}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `🔥 JUST IN: ${title}\n\nCheck it out now on Benched.au!\n\n${link}`,
                link: link,
                picture: imageUrl,
                access_token: ACCESS_TOKEN
            })
        });

        const fbData = await fbResponse.json();

        if (!fbResponse.ok) {
            console.error('Facebook Graph API Error:', fbData);
            return NextResponse.json({ 
                error: fbData.error?.message || 'Failed to post to Facebook' 
            }, { status: fbResponse.status });
        }

        return NextResponse.json({ 
            success: true, 
            postId: fbData.id,
            message: 'Successfully posted to Facebook Page Wall!' 
        });

    } catch (error: any) {
        console.error('Facebook Posting Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { requiredRole: ['user', 'seller', 'admin', 'superadmin'] });
