import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface StructuredPricingResult {
    title: string;
    finalPrice: number;
    soldDate: string;
    condition: string;
    shippingCost: number;
    itemUrl: string;
    isConfirmedSold: boolean;
}

export async function parseWithGemini(scrapeResult: any): Promise<StructuredPricingResult[]> {
    if (!apiKey) {
        console.warn('GOOGLE_AI_API_KEY not found. Returning raw data.');
        return [];
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const itemsSummary = scrapeResult.items?.slice(0, 15).map((item: any) => ({
        t: item.title,
        p: item.price,
        d: item.soldDate,
        l: item.link
    }));

    const prompt = `
  Analyze this eBay Australia sold listings data and extract structured information.
  
  Keyword: ${scrapeResult.metadata?.keyword}
  Data: ${JSON.stringify(itemsSummary)}
  
  Return a valid JSON array of objects with this structure ONLY:
  {
    "title": string,
    "finalPrice": number (numeric value in AUD, extract from strings like "AU $15.00"),
    "soldDate": string (format: DD/MM/YYYY),
    "condition": string (e.g., "Graded", "Raw", "New", "Used"),
    "shippingCost": number (0 if free, extract numeric if present),
    "itemUrl": string,
    "isConfirmedSold": boolean
  }
  
  Rules:
  1. Only include items that appear to be actual sales (not active listings).
  2. If the price is a range, take the final sold price if possible.
  3. AUD conversion: Assume AU $ is the default.
  4. Return ONLY the JSON array. No markdown, no backticks, no comments.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean up markdown if AI included it
        if (text.startsWith('```json')) text = text.replace(/```json|```/g, '');
        else if (text.startsWith('```')) text = text.replace(/```/g, '');

        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Gemini parsing error:', error);
        return [];
    }
}
