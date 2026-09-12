import { NextResponse } from 'next/server';
import { firestoreDb, authAdmin, storageAdmin } from '@/lib/firebase/admin';
import type { Product } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // Cache preflight request for 24 hours
};

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate the Request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers: corsHeaders });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await authAdmin.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const sellerId = decodedToken.uid;
    const sellerEmail = decodedToken.email || '';
    const sellerName = decodedToken.name || decodedToken.email?.split('@')[0] || 'Unknown Seller';

    // 2. Parse the Request Body
    const body = await request.json();
    const { 
      imageDataUri, 
      title, 
      description, 
      price, 
      category, 
      subCategory,
      manufacturer,
      year,
      cardNumber,
      condition,
      gradingCompany,
      grade,
      certNumber
    } = body;

    if (!title || !price || !category) {
      return NextResponse.json({ error: 'Missing required fields: title, price, category' }, { status: 400, headers: corsHeaders });
    }

    let imageUrls: string[] = [];

    // 3. Handle the Image (Base64 Upload to Firebase Storage)
    if (imageDataUri) {
      try {
        const bucket = storageAdmin.bucket();
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = imageDataUri.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Determine file extension (default to jpg)
        const mimeMatch = imageDataUri.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const extension = mimeType.split('/')[1] === 'png' ? 'png' : 'jpg';

        const fileName = `products/${sellerId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
        const file = bucket.file(fileName);

        await file.save(buffer, {
          metadata: {
            contentType: mimeType,
          },
          public: true // Make file publicly readable if bucket supports it
        });

        // Construct the public URL manually or use makePublic (depends on Firebase rules, but this is the standard format)
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
        imageUrls.push(publicUrl);
      } catch (imageError) {
        console.error('Error uploading image:', imageError);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500, headers: corsHeaders });
      }
    }

    // 4. Construct the Product Document
    const newProduct: Partial<Product> = {
      title,
      description: description || '',
      price: Number(price),
      category,
      subCategory: subCategory || '',
      sellerId,
      sellerName,
      sellerEmail,
      imageUrls,
      status: 'available', // Or 'draft' / 'pending_approval' based on your workflow
      createdAt: FieldValue.serverTimestamp() as any,
      
      // Card specific fields
      ...(manufacturer && { manufacturer }),
      ...(year && { year: Number(year) }),
      ...(cardNumber && { cardNumber }),
      ...(condition && { condition }),
      
      // Grading specifics
      ...(gradingCompany && { gradingCompany }),
      ...(grade && { grade }),
      ...(certNumber && { certNumber }),
    };

    // 5. Save to Firestore
    const docRef = await firestoreDb.collection('products').add(newProduct);

    return NextResponse.json({ 
      success: true, 
      message: 'Listing created successfully',
      productId: docRef.id,
      product: { ...newProduct, id: docRef.id }
    }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
