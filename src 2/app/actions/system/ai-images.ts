'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIIntelligenceSchema = z.object({
    altText: z.string().describe("A descriptive, SEO-optimized alt text for the image."),
    seoFilename: z.string().describe("A URL-friendly, descriptive filename (e.g., 2021-panini-jordan-rookie.jpg)."),
    qualityScore: z.number().min(1).max(10).describe("1-10 score of photo quality (lighting, focus, clarity)."),
    qualityTip: z.string().optional().describe("Advice if quality score is low."),
    isSafe: z.boolean().describe("True if no PII, offensive content, or prohibited items are detected."),
    safetyReason: z.string().optional().describe("Reason for safety failure (e.g., PII detected)."),
    detectedAttributes: z.object({
        year: z.number().optional().nullable(),
        brand: z.string().optional().nullable(),
        player: z.string().optional().nullable(),
        grade: z.string().optional().nullable(),
    }).optional(),
    smartCrop: z.object({
        x: z.number().describe("Center X coordinate (0-1)"),
        y: z.number().describe("Center Y coordinate (0-1)"),
        width: z.number().describe("Relative width (0-1)"),
        height: z.number().describe("Relative height (0-1)")
    }).optional().describe("Bounding box for the main subject.")
});

export type AIIntelligence = z.infer<typeof AIIntelligenceSchema>;

/**
 * Generates a comprehensive AI Intelligence report for a product image using Gemini Flash.
 */
export async function analyzeProductImage(imageUrl: string, productTitle?: string): Promise<AIIntelligence> {
    try {
        const prompt = `You are an expert at SEO, accessibility, and content moderation for a collectibles marketplace.
    Analyze this product image and provide:
    
    1. SEO-optimized Alt-Text (10-15 words, keyword-rich).
    2. A URL-friendly SEO filename (hyphenated, lowercase, includes key attributes).
    3. A Quality Score (1-10) based on focus, lighting, and detail visibility.
    4. Safety Check: Detect PII (mailing addresses, phone numbers), offensive text, or prohibited items.
    5. Attributes: Extract Year, Brand, Player, and Grade if visible.
    6. Smart Crop: Provide the bounding box coordinates (0-1 range) for the main collectible item.
    
    ${productTitle ? `Context: This is an image for "${productTitle}"` : ''}`;

        const result = await ai.generate({
            model: 'googleai/gemini-flash-latest',
            prompt: [
                { text: prompt },
                { media: { url: imageUrl, contentType: 'image/jpeg' } }
            ],
            output: { schema: AIIntelligenceSchema }
        });

        return result.output || {
            altText: productTitle || 'Collectible item',
            seoFilename: 'product-image.jpg',
            qualityScore: 5,
            isSafe: true
        };
    } catch (error) {
        console.error('Error in AI Image Analysis:', error);
        return {
            altText: productTitle || 'Collectible item',
            seoFilename: 'product-image.jpg',
            qualityScore: 5,
            isSafe: true
        };
    }
}
