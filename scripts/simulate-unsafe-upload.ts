import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const projectId = 'studio-3973035687-658c0'; // Your project ID
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: projectId,
    });
}

const db = admin.firestore();

/**
 * SIMULATION: This script bypasses the Auth requirement to demonstrate
 * how the "AI Pipeline" logic handles an 'Unsafe' detection (e.g., PII in background).
 */
async function simulateUnsafeUpload() {
    console.log('Starting Unsafe Upload Simulation...');

    // 1. Mock the "AI Intelligence Report" as if Gemini Flash detected PII
    const mockAIAnalysis = {
        altText: "1999 Pokemon Base Set Charizard Holo Card",
        seoFilename: "1999-pokemon-charizard-holo.jpg",
        qualityScore: 8,
        isSafe: false, // SIMULATED SAFETY FAILURE
        safetyReason: "PII Detected: Home address visible on a letter in the background.",
        detectedAttributes: {
            year: 1999,
            brand: "Pokemon",
            player: "Charizard",
            grade: "Raw"
        },
        smartCrop: { x: 0.5, y: 0.5, width: 0.4, height: 0.6 }
    };

    const testProductId = `test_unsafe_${Date.now()}`;
    const productData = {
        id: testProductId,
        title: "Simulation: 1999 Charizard (DO NOT SHIP)",
        price: 450,
        category: "Collector Cards",
        imageUrls: ["https://example.com/unsafe-image.jpg"],
        sellerId: "test_seller_123",
        sellerName: "Test Seller",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        
        // Applying the AI Pipeline Logic
        aiIntelligence: [mockAIAnalysis],
        imageAltTexts: [mockAIAnalysis.altText],
        qualityScore: mockAIAnalysis.qualityScore,
        isSafe: mockAIAnalysis.isSafe,
        status: mockAIAnalysis.isSafe ? 'pending_approval' : 'on_hold', // THE KEY LOGIC
        safetyReason: mockAIAnalysis.safetyReason
    };

    console.log(`Creating product ${testProductId} with status: ${productData.status}`);
    
    try {
        await db.collection('products').doc(testProductId).set(productData);
        
        // 2. Verify the result
        const savedDoc = await db.collection('products').doc(testProductId).get();
        const data = savedDoc.data();

        if (data && data.status === 'on_hold') {
            console.log('SUCCESS: AI Moderation Pipeline correctly placed the listing "On Hold".');
            console.log(`Reason: ${data.safetyReason}`);
            console.log(`AI Intelligence Data saved: ${JSON.stringify(data.aiIntelligence[0], null, 2)}`);
        } else {
            console.error('FAILURE: Listing was not correctly placed on hold.');
        }

    } catch (error) {
        console.error('Simulation failed:', error);
    } finally {
        process.exit(0);
    }
}

simulateUnsafeUpload();