#!/usr/bin/env node

/**
 * Firebase Category Update Script (Node.js version)
 * Run with: node scripts/update-categories-simple.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) {
    console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_JSON not found in environment');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'studio-8322868971-8ca89.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Category data to update (using placeholder URLs for now)
const categories = [
    {
        id: 'CkHRBe2AXdhfTjiny3NE',
        name: 'Barbie',
        section: 'collectibles',
        slug: 'barbie',
        href: '/collectibles/barbie',
        description: 'Vintage and modern Barbie dolls, accessories, and collectibles',
        localImage: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_barbie_1769139535234.png',
        storagePath: 'categories/barbie.png'
    },
    {
        id: 'FeSJk9dSmueaZdftDTVh',
        name: '$2 Coins',
        section: 'coins',
        slug: '2-dollar-coins',
        href: '/coins/2-dollar-coins',
        description: 'Australian $2 coins including commemorative and special editions',
        localImage: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_coins_2dollar_1769139555620.png',
        storagePath: 'categories/2-dollar-coins.png'
    },
    {
        id: 'Q9mzULqVpmCiMFTp1bQ7',
        name: 'Rookies',
        section: 'collector-cards',
        slug: 'rookies',
        href: '/collector-cards/rookies',
        description: 'Rookie trading cards from basketball, baseball, football and more',
        localImage: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_rookies_1769139573500.png',
        storagePath: 'categories/rookies.png'
    },
    {
        id: 'XJbzOPYXNvG4jZW2OF8L',
        name: 'Shoes',
        section: 'collectibles',
        slug: 'shoes',
        href: '/collectibles/shoes',
        description: 'Collectible sneakers including Air Jordans, Yeezys, and limited editions',
        localImage: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_shoes_1769139597519.png',
        storagePath: 'categories/shoes.png'
    },
    {
        id: 'cVsKy2RDFsAIdoCVoMD0',
        name: 'NBA',
        section: 'collector-cards',
        slug: 'nba',
        href: '/collector-cards/nba',
        description: 'NBA basketball trading cards, autographs, and memorabilia',
        localImage: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_nba_1769139636840.png',
        storagePath: 'categories/nba.png'
    },
    {
        id: 'keoCY31BVa080tIkqkwE',
        name: '$1 Coins',
        section: 'coins',
        slug: '1-dollar-coins',
        href: '/coins/1-dollar-coins',
        description: 'Australian $1 coins including commemorative and special editions',
        localImage: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_coins_1dollar_1769139655286.png',
        storagePath: 'categories/1-dollar-coins.png'
    },
    {
        id: 'rr6UWJL3YsJZkzFK0jN4',
        name: '50c Coins',
        section: 'coins',
        slug: '50-cent-coins',
        href: '/coins/50-cent-coins',
        description: 'Australian 50 cent coins including commemorative and special editions',
        localImage: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_coins_50cent_1769139677674.png',
        storagePath: 'categories/50-cent-coins.png'
    }
];

async function uploadImageToStorage(localPath, storagePath) {
    try {
        if (!fs.existsSync(localPath)) {
            throw new Error(`File not found: ${localPath}`);
        }

        const file = bucket.file(storagePath);

        console.log(`📤 Uploading ${path.basename(localPath)}...`);

        await bucket.upload(localPath, {
            destination: storagePath,
            metadata: {
                contentType: 'image/png',
                cacheControl: 'public, max-age=31536000',
            },
        });

        // Make the file public
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`✅ Uploaded successfully`);
        return publicUrl;
    } catch (error) {
        console.error(`❌ Upload error:`, error.message);
        throw error;
    }
}

async function updateCategory(categoryData, imageUrl) {
    try {
        const categoryRef = db.collection('categories').doc(categoryData.id);

        const updateData = {
            name: categoryData.name,
            section: categoryData.section,
            slug: categoryData.slug,
            href: categoryData.href,
            description: categoryData.description,
            imageUrl: imageUrl,
            updatedAt: admin.firestore.Timestamp.now(),
        };

        console.log(`📝 Updating Firestore...`);
        await categoryRef.update(updateData);
        console.log(`✅ Firestore updated`);
    } catch (error) {
        console.error(`❌ Firestore error:`, error.message);
        throw error;
    }
}

async function processCategory(category) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 Processing: ${category.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`   ID: ${category.id}`);
    console.log(`   Section: ${category.section}`);
    console.log(`   Slug: ${category.slug}`);
    console.log(`   Image: ${path.basename(category.localImage)}`);

    try {
        // Upload image
        const imageUrl = await uploadImageToStorage(category.localImage, category.storagePath);
        console.log(`   URL: ${imageUrl.substring(0, 70)}...`);

        // Update Firestore
        await updateCategory(category, imageUrl);

        console.log(`\n✅ ${category.name} - COMPLETE\n`);
        return { success: true, category: category.name };
    } catch (error) {
        console.error(`\n❌ ${category.name} - FAILED:`, error.message, '\n');
        return { success: false, category: category.name, error: error.message };
    }
}

async function main() {
    console.log('\n🚀 Firebase Category Update Script');
    console.log('='.repeat(60));
    console.log(`📊 Categories to process: ${categories.length}`);
    console.log(`📁 Storage bucket: ${bucket.name}`);
    console.log('='.repeat(60));

    const results = [];

    for (const category of categories) {
        const result = await processCategory(category);
        results.push(result);

        // Small delay between uploads
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    if (successful.length > 0) {
        successful.forEach(r => console.log(`   - ${r.category}`));
    }

    console.log(`\n❌ Failed: ${failed.length}`);
    if (failed.length > 0) {
        failed.forEach(r => console.log(`   - ${r.category}: ${r.error}`));
    }

    console.log(`\n📋 Total: ${categories.length}`);
    console.log('='.repeat(60));

    if (failed.length === 0) {
        console.log('\n🎉 ALL CATEGORIES UPDATED SUCCESSFULLY!\n');
        return 0;
    } else {
        console.log('\n⚠️  SOME CATEGORIES FAILED - Please check errors above\n');
        return 1;
    }
}

// Run the script
main()
    .then((exitCode) => {
        process.exit(exitCode);
    })
    .catch((error) => {
        console.error('\n❌ SCRIPT FAILED:', error);
        process.exit(1);
    });
