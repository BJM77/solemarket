/**
 * Firebase Category Update Script
 * This script updates all categories with proper slugs, image URLs, and consistent data structure
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as fs from 'fs';
import * as path from 'path';

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Category data to update
const categories = [
    {
        id: 'CkHRBe2AXdhfTjiny3NE',
        name: 'Barbie',
        section: 'collectibles',
        slug: 'barbie',
        href: '/collectibles/barbie',
        description: 'Vintage and modern Barbie dolls, accessories, and collectibles',
        imagePath: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_barbie_1769139535234.png',
        storagePath: 'categories/barbie.png'
    },
    {
        id: 'FeSJk9dSmueaZdftDTVh',
        name: '$2 Coins',
        section: 'coins',
        slug: '2-dollar-coins',
        href: '/coins/2-dollar-coins',
        description: 'Australian $2 coins including commemorative and special editions',
        imagePath: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_coins_2dollar_1769139555620.png',
        storagePath: 'categories/2-dollar-coins.png'
    },
    {
        id: 'Q9mzULqVpmCiMFTp1bQ7',
        name: 'Rookies',
        section: 'collector-cards',
        slug: 'rookies',
        href: '/collector-cards/rookies',
        description: 'Rookie trading cards from basketball, baseball, football and more',
        imagePath: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_rookies_1769139573500.png',
        storagePath: 'categories/rookies.png'
    },
    {
        id: 'XJbzOPYXNvG4jZW2OF8L',
        name: 'Shoes',
        section: 'collectibles',
        slug: 'shoes',
        href: '/collectibles/shoes',
        description: 'Collectible sneakers including Air Jordans, Yeezys, and limited editions',
        imagePath: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_shoes_1769139597519.png',
        storagePath: 'categories/shoes.png'
    },
    {
        id: 'cVsKy2RDFsAIdoCVoMD0',
        name: 'NBA',
        section: 'collector-cards',
        slug: 'nba',
        href: '/collector-cards/nba',
        description: 'NBA basketball trading cards, autographs, and memorabilia',
        imagePath: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_nba_1769139636840.png',
        storagePath: 'categories/nba.png'
    },
    {
        id: 'keoCY31BVa080tIkqkwE',
        name: '$1 Coins',
        section: 'coins',
        slug: '1-dollar-coins',
        href: '/coins/1-dollar-coins',
        description: 'Australian $1 coins including commemorative and special editions',
        imagePath: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_coins_1dollar_1769139655286.png',
        storagePath: 'categories/1-dollar-coins.png'
    },
    {
        id: 'rr6UWJL3YsJZkzFK0jN4',
        name: '50c Coins',
        section: 'coins',
        slug: '50-cent-coins',
        href: '/coins/50-cent-coins',
        description: 'Australian 50 cent coins including commemorative and special editions',
        imagePath: '/Users/bjm/.gemini/antigravity/brain/9532d0f6-cfaa-4727-ba8a-be1ae38c474b/category_coins_50cent_1769139677674.png',
        storagePath: 'categories/50-cent-coins.png'
    }
];

async function uploadImageToStorage(localPath: string, storagePath: string): Promise<string> {
    try {
        const fileBuffer = fs.readFileSync(localPath);
        const storageRef = ref(storage, storagePath);

        console.log(`📤 Uploading ${path.basename(localPath)} to Storage...`);
        await uploadBytes(storageRef, fileBuffer, {
            contentType: 'image/png',
            cacheControl: 'public, max-age=31536000', // Cache for 1 year
        });

        const downloadURL = await getDownloadURL(storageRef);
        console.log(`✅ Uploaded: ${path.basename(localPath)}`);
        return downloadURL;
    } catch (error) {
        console.error(`❌ Error uploading ${localPath}:`, error);
        throw error;
    }
}

async function updateCategory(categoryData: typeof categories[0], imageUrl: string) {
    try {
        const categoryRef = doc(db, 'categories', categoryData.id);

        const updateData = {
            name: categoryData.name,
            section: categoryData.section,
            slug: categoryData.slug,
            href: categoryData.href,
            description: categoryData.description,
            imageUrl: imageUrl,
            updatedAt: Timestamp.now(),
        };

        console.log(`📝 Updating category: ${categoryData.name}...`);
        await updateDoc(categoryRef, updateData);
        console.log(`✅ Updated: ${categoryData.name}`);
    } catch (error) {
        console.error(`❌ Error updating ${categoryData.name}:`, error);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting Category Update Script');
    console.log('===================================\n');

    let successCount = 0;
    let errorCount = 0;

    for (const category of categories) {
        try {
            console.log(`\n📂 Processing: ${category.name}`);
            console.log(`   ID: ${category.id}`);
            console.log(`   Section: ${category.section}`);
            console.log(`   Slug: ${category.slug}`);

            // Upload image to Storage
            const imageUrl = await uploadImageToStorage(category.imagePath, category.storagePath);
            console.log(`   Image URL: ${imageUrl.substring(0, 60)}...`);

            // Update Firestore document
            await updateCategory(category, imageUrl);

            successCount++;
            console.log(`✅ Complete: ${category.name}\n`);

        } catch (error) {
            errorCount++;
            console.error(`❌ Failed: ${category.name}`, error);
        }
    }

    console.log('\n===================================');
    console.log('📊 Update Summary');
    console.log('===================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📋 Total: ${categories.length}`);

    if (errorCount === 0) {
        console.log('\n🎉 All categories updated successfully!');
    } else {
        console.log('\n⚠️  Some categories failed to update. Please check the errors above.');
    }
}

// Run the script
main()
    .then(() => {
        console.log('\n✅ Script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
