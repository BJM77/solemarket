import { suggestListingDetails } from './src/ai/flows/suggest-listing-details';
import * as fs from 'fs';

async function testAI(filePath: string) {
    const file = fs.readFileSync(filePath);
    const base64 = file.toString('base64');
    const mimeType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const uri = `data:${mimeType};base64,${base64}`;
    
    console.log(`Testing with ${filePath}...`);
    try {
        const result = await suggestListingDetails({
            imageUris: [uri]
        });
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

async function main() {
    await testAI('./public/sc-test-card.jpg');
    // await testAI('./public/shoe.png');
    // await testAI('./public/real_cards_test.jpg');
}

main().catch(console.error);
