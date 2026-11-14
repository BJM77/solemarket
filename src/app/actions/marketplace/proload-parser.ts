'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { AI_CONFIG } from '@/config/ai';

const ProloadParsedDetailsSchema = z.object({
  title: z.string().describe("A clean, descriptive title for the item, removing excess punctuation and emojis."),
  price: z.number().describe("The listing price as a number in AUD. If not present or 'Free', output 0."),
  description: z.string().describe("The item description, cleaning up formatting and preserving all relevant specifications."),
  condition: z.enum(['New', 'Used', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair']).describe("The extracted condition of the item mapped to one of these values."),
  category: z.enum(['Sneakers', 'Apparel', 'Collector Cards', 'Accessories']).describe("The best matching Benched category."),
  subCategory: z.string().optional().describe("A specific subcategory name based on context."),
  brand: z.string().optional().describe("The brand of the item (e.g., 'KMC', 'Nike', 'Adidas', etc.)."),
  model: z.string().optional().describe("The specific model of the item (e.g. 'KMC549')."),
  size: z.string().optional().describe("The size or dimensions (e.g., '18 inch', 'US 10')."),
  externalUrl: z.string().optional().describe("If a web browser address bar or Facebook Marketplace URL (e.g. facebook.com/marketplace/item/...) is visible in the screenshot image, extract the exact URL. Otherwise leave empty."),
  specs: z.record(z.string()).optional().describe("A map of other key-value attributes extracted (e.g., stud patterns, seller name, joined year, etc.).")
});

export type ProloadParsedDetails = z.infer<typeof ProloadParsedDetailsSchema>;

// The browser shrinks screenshots to well under this before calling the action.
const MAX_SCREENSHOT_CHARS = 950_000;

const GENERIC_ERROR = "We couldn't analyse that screenshot right now. Please try again in a moment.";

export async function parseFacebookMarketplaceScreenshot(
  idToken: string,
  screenshotBase64: string
): Promise<{ success: true; data: ProloadParsedDetails } | { success: false; error: string }> {
  if (typeof screenshotBase64 !== 'string' || screenshotBase64.length === 0) {
    return { success: false, error: 'Please choose a screenshot to analyse.' };
  }
  if (screenshotBase64.length > MAX_SCREENSHOT_CHARS) {
    return { success: false, error: 'That screenshot is too large. Please try a smaller screenshot.' };
  }
  if (screenshotBase64.startsWith('data:') && !screenshotBase64.startsWith('data:image/')) {
    return { success: false, error: 'Please upload an image file (a screenshot of the listing).' };
  }

  try {
    await verifyIdToken(idToken);
  } catch (error) {
    console.error('Proload: ID token verification failed:', error);
    return { success: false, error: 'Your sign-in has expired. Please refresh the page and try again.' };
  }

  try {

    // 2. Call Gemini Vision Model to extract structure
    const prompt = `You are a Facebook Marketplace screenshot parsing specialist.
    Analyze the uploaded screenshot of a Facebook Marketplace listing.
    Extract the title, price in AUD, description, condition, category, subcategory, brand, model, size, externalUrl (if visible in address bar), and any other attributes.
    
    Ensure you clean up the title and description (e.g. remove trailing commas, Facebook-specific boilerplate like 'Message seller' or 'Good afternoon, is this still available?').
    Map the category to one of the following exact Benched categories: 'Sneakers', 'Apparel', 'Collector Cards', 'Accessories'.
    If the listing is for wheels, rims, or tires, map it to 'Accessories'.`;

    // Extract content type from base64 if available, or default to image/jpeg
    let mediaUrl = screenshotBase64;
    if (!mediaUrl.startsWith('data:')) {
      mediaUrl = `data:image/jpeg;base64,${screenshotBase64}`;
    }

    const result = await ai.generate({
      model: AI_CONFIG.DEFAULT_VISION_MODEL,
      prompt: [
        { text: prompt },
        { media: { url: mediaUrl } }
      ],
      output: { schema: ProloadParsedDetailsSchema }
    });

    if (!result.output) {
      return { success: false, error: 'Failed to extract structured details from screenshot. Please try a different image.' };
    }

    return { success: true, data: result.output };
  } catch (error) {
    // Log the real cause (missing key, model error, timeout...) server-side; sellers get a friendly message.
    console.error('Error parsing FB Marketplace listing:', error);
    return { success: false, error: GENERIC_ERROR };
  }
}
