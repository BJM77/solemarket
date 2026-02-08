'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { detectCardGrid, cropCard, generateThumbnail } from '@/lib/scan/grid-detector';
import { matchCardName } from '@/lib/scan/card-matcher';
import type { ScannedCard } from '@/lib/types/scan';

export interface ScanCardsResult {
    success: boolean;
    cards?: ScannedCard[];
    totalValue?: number;
    totalCards?: number;
    processingTime?: number;
    error?: string;
}

/**
 * Scan multiple cards from a single image using Gemini Vision
 */
export async function scanCards(formData: FormData, userId: string): Promise<ScanCardsResult> {
    const startTime = Date.now();

    console.log('=== SCAN STARTED ===');
    console.log('User ID:', userId);

    try {
        const file = formData.get('image') as File;
        if (!file) {
            console.error('No image file provided');
            return { success: false, error: 'No image provided' };
        }

        console.log('Image file:', file.name, 'Size:', file.size, 'bytes');

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        console.log('Image buffer created, size:', imageBuffer.length);

        // Detect card grid
        const targetCards = parseInt(formData.get('targetCards') as string) || 20;
        console.log('Target cards:', targetCards);

        const gridResult = await detectCardGrid(imageBuffer, targetCards);
        console.log(`✓ Grid detected: ${gridResult.cards.length} cards in ${gridResult.rows}x${gridResult.cols} grid`);

        // Process each card
        const scannedCards: ScannedCard[] = [];

        // Initialize Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY not found in environment');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GENAI')));
            throw new Error('GEMINI_API_KEY not configured. Please add it to your .env.local file.');
        }
        console.log('✓ Gemini API key found, length:', apiKey.length);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        for (let i = 0; i < gridResult.cards.length; i++) {
            const boundingBox = gridResult.cards[i];
            console.log(`\nProcessing card ${i + 1}/${gridResult.cards.length}...`);

            try {
                // Crop card from image
                console.log(`  Cropping card at (${boundingBox.x}, ${boundingBox.y})...`);
                const cardBuffer = await cropCard(imageBuffer, boundingBox);
                console.log(`  ✓ Card cropped, buffer size: ${cardBuffer.length}`);

                // Generate thumbnail
                console.log(`  Generating thumbnail...`);
                const thumbnail = await generateThumbnail(cardBuffer);
                const thumbnailBase64 = `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
                console.log(`  ✓ Thumbnail generated`);

                // Use Gemini Vision to extract card information
                const prompt = `
Analyze this trading card image and extract the following information in JSON format:
{
  "name": "card name",
  "set": "set or edition name",
  "cardNumber": "card number if visible",
  "condition": "estimated condition (Near Mint, Excellent, Good, Poor, or Unknown)"
}

If you cannot read the card clearly, return:
{
  "name": "Unreadable",
  "set": "",
  "cardNumber": "",
  "condition": "Unknown"
}

Be concise. Only return the JSON object.
`;

                console.log(`  Calling Gemini Vision API...`);
                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: cardBuffer.toString('base64'),
                            mimeType: 'image/jpeg',
                        },
                    },
                ]);

                const responseText = result.response.text();
                console.log(`  ✓ Gemini response received:`, responseText.substring(0, 100));

                // Parse JSON response
                let cardInfo;
                try {
                    // Extract JSON from response (handle markdown code blocks)
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    cardInfo = jsonMatch ? JSON.parse(jsonMatch[0]) : { name: 'Unknown', set: '', cardNumber: '', condition: 'Unknown' };
                } catch (parseError) {
                    console.error('Failed to parse Gemini response:', responseText);
                    cardInfo = { name: 'Unknown', set: '', cardNumber: '', condition: 'Unknown' };
                }

                // Match against user's keep list from research preferences
                console.log(`  Matching card "${cardInfo.name}" against keep list...`);
                const matchResult = await matchCardName(cardInfo.name, userId);
                console.log(`  ✓ Match result: ${matchResult.name} (confidence: ${matchResult.confidence}%, value: $${matchResult.estimatedValue})`);

                scannedCards.push({
                    id: `card-${i}`,
                    name: matchResult.name,
                    confidence: matchResult.confidence,
                    estimatedValue: matchResult.estimatedValue,
                    action: matchResult.action,
                    boundingBox,
                    thumbnailUrl: thumbnailBase64,
                    set: cardInfo.set,
                    cardNumber: cardInfo.cardNumber,
                    condition: cardInfo.condition,
                });

                console.log(`Card ${i + 1}: ${matchResult.name} - $${matchResult.estimatedValue} (${matchResult.action})`);
            } catch (cardError: any) {
                console.error(`Error processing card ${i}:`, cardError);
                console.error(`Card error message:`, cardError.message);
                console.error(`Card error stack:`, cardError.stack);
                // Add placeholder for failed card
                scannedCards.push({
                    id: `card-${i}`,
                    name: 'Error',
                    confidence: 0,
                    estimatedValue: 0,
                    action: 'bulk',
                    boundingBox,
                    thumbnailUrl: '',
                });
            }
        }

        const totalValue = scannedCards.reduce((sum, card) => sum + card.estimatedValue, 0);
        const processingTime = Date.now() - startTime;

        return {
            success: true,
            cards: scannedCards,
            totalValue,
            totalCards: scannedCards.length,
            processingTime,
        };
    } catch (error: any) {
        console.error('Scan error:', error);
        console.error('Error stack:', error.stack);
        return {
            success: false,
            error: `Failed to scan cards: ${error.message}`,
        };
    }
}
