
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from 'sharp';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Initialize AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeCard(images: { buffer: Buffer, mimeType: string }[]) {
    console.log(`🤖 AI: Analyzing card with ${images.length} images...`);
    
    // ... same prompt ...
    const prompt = `You are an expert at identifying and valuing sports and collector cards. 
Analyze the provided images of ONE card (front and back).
Provide the following detailed listing information in JSON format:
{
  "title": "Professional listing title",
  "description": "Brief professional description",
  "price": estimated market price in AUD as a number,
  "subCategory": "Basketball Cards", "Pokemon", etc.,
  "condition": "Estimated grade (e.g. Near Mint)",
  "brand": "Manufacturer (e.g. Panini)",
  "model": "Set name (e.g. Prizm)",
  "year": release year as number,
  "cardNumber": "Specific card number if visible",
  "gradingCompany": "PSA, BGS, SGC if slabbed, or null",
  "grade": "Numeric grade if slabbed, or null"
}
Return ONLY the JSON object.`;

    const imageParts = images.map(img => ({
        inlineData: {
            data: img.buffer.toString('base64'),
            mimeType: img.mimeType
        }
    }));

    let retries = 5;
    while (retries > 0) {
        try {
            const result = await model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = response.text();
            
            // Clean up markdown if present
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
            return parsed;
        } catch (error: any) {
            if (error.status === 429) {
                console.warn(`⚠️ Rate limited. Waiting 120s before retry... (${retries} left)`);
                await sleep(120000);
                retries--;
            } else {
                console.error("❌ AI Error:", error.message || error);
                throw error;
            }
        }
    }
    return null;
}

async function uploadBufferToStorage(buffer: Buffer, destPath: string) {
    console.log(`📤 Storage: Uploading to ${destPath}...`);
    const file = bucket.file(destPath);
    await file.save(buffer, {
        metadata: { contentType: 'image/jpeg' }
    });
    
    // Construct public URL (Firebase format)
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destPath)}?alt=media`;
}

async function processImage(buffer: Buffer): Promise<Buffer> {
    console.log(`🖼️ Processing image (resize & compress)...`);
    return await sharp(buffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
}

async function main() {
    const cardsDir = path.join(process.cwd(), 'cards');
    if (!fs.existsSync(cardsDir)) {
        console.error("❌ Error: /cards directory not found.");
        return;
    }

    const files = fs.readdirSync(cardsDir)
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort();

    if (files.length === 0) {
        console.error("❌ Error: No images found in /cards.");
        return;
    }

    console.log(`📂 Found ${files.length} images. Grouping into cards (2 images per card)...`);

    // Find an admin user to own these listings
    const adminUsers = await db.collection('users').where('role', '==', 'superadmin').limit(1).get();
    const adminUser = adminUsers.docs[0];
    if (!adminUser) {
        console.error("❌ Error: No superadmin user found in database.");
        return;
    }
    const adminUid = adminUser.id;
    const adminData = adminUser.data();

    // Grouping logic: 2 images per card
    for (let i = 0; i < files.length; i += 2) {
        const cardIndex = Math.floor(i / 2) + 1;
        const group = files.slice(i, i + 2);
        console.log(`\n📦 Processing Card #${cardIndex}: ${group.join(', ')}`);

        // 1. Read and Process images
        const processedImages = await Promise.all(group.map(async imgName => {
            const filePath = path.join(cardsDir, imgName);
            const buffer = fs.readFileSync(filePath);
            const processedBuffer = await processImage(buffer);
            return {
                buffer: processedBuffer,
                mimeType: 'image/jpeg',
                originalName: imgName
            };
        }));

        // 2. AI Analysis
        const aiImages = processedImages.map(img => ({
            buffer: img.buffer,
            mimeType: img.mimeType
        }));

        const aiResult = await analyzeCard(aiImages);
        if (!aiResult) {
            console.error(`❌ Skipped Card #${cardIndex}: AI analysis failed.`);
            continue;
        }

        console.log(`✨ AI result: ${aiResult.title} - $${aiResult.price}`);

        // 3. Upload to Storage
        const imageUrls = [];
        for (const img of processedImages) {
            const storagePath = `products/${adminUid}/bulk_optimized_${Date.now()}_${img.originalName}`;
            const url = await uploadBufferToStorage(img.buffer, storagePath);
            imageUrls.push(url);
        }

        // 4. Save to Firestore
        const productData = {
            ...aiResult,
            category: 'Collector Cards',
            imageUrls,
            sellerId: adminUid,
            sellerName: adminData.displayName || 'Admin',
            sellerEmail: adminData.email || '',
            sellerAvatar: adminData.photoURL || '',
            status: 'available',
            isDraft: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            quantity: 1,
            views: 0,
            sellerVerified: true
        };

        const docRef = await db.collection('products').add(productData);
        console.log(`✅ Success: Card #${cardIndex} listed! Doc ID: ${docRef.id}`);

        // 5. Delay before next card to stay under quota
        if (i + 2 < files.length) {
            console.log(`⏳ Waiting 30s before next card...`);
            await sleep(30000);
        }
    }

    console.log("\n🏁 Bulk processing complete.");
}

main().catch(console.error).finally(() => process.exit(0));
