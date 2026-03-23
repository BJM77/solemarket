/**
 * Re-index Product Search Keywords
 * 
 * This script iterates through all existing products in Firestore and regenerates 
 * their 'keywords' and 'title_lowercase' fields to include Title, Category, 
 * Sub-Category, and Listing Details (Description).
 * 
 * Usage: 
 * export SERVICE_ACCOUNT_KEY=...
 * npx tsx scripts/reindex-search.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Or use service account path
    });
}

const db = admin.firestore();

function generateKeywords(text: string): string[] {
    if (!text) return [];
    
    // Split into words, remove punctuation, and lowercase
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
        .split(/\s+/)
        .filter(word => word.length >= 2); // Only words with 2+ chars

    const keywords: string[] = [];

    words.forEach(word => {
        keywords.push(word);
    });

    // Also include the full text lowercase if it's short (like a category name)
    if (text.length < 50) {
        keywords.push(text.toLowerCase().trim());
    }

    return [...new Set(keywords)]; // Unique
}

async function reindex() {
    console.log('--- STARTING RE-INDEX ---');
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    console.log(`Found ${snapshot.size} products to process.`);

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const title = data.title || '';
        const brand = data.brand || '';
        const subCategory = data.subCategory || '';
        const category = data.category || '';
        const description = data.description || '';

        const keywordsSet = new Set<string>();
        generateKeywords(title).forEach(k => keywordsSet.add(k));
        generateKeywords(brand).forEach(k => keywordsSet.add(k));
        generateKeywords(subCategory).forEach(k => keywordsSet.add(k));
        generateKeywords(category).forEach(k => keywordsSet.add(k));
        generateKeywords(description).forEach(k => keywordsSet.add(k));

        const updates = {
            title_lowercase: title.toLowerCase(),
            keywords: Array.from(keywordsSet),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.update(doc.ref, updates);
        count++;

        if (count % 500 === 0) {
            await batch.commit();
            console.log(`Commited ${count} updates...`);
        }
    }

    if (count % 500 !== 0) {
        await batch.commit();
    }

    console.log(`--- RE-INDEX COMPLETE: ${count} products updated ---`);
}

reindex().catch(err => {
    console.error('Re-index failed:', err);
    process.exit(1);
});
