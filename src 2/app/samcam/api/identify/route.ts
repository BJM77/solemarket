import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import stringSimilarity from "string-similarity";
import { defaultPlayers } from "@/samcam/lib/players";

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET || "benched_studio_v4_6_secure";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("X-Benched-Token");
    if (authHeader !== INTERNAL_TOKEN) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { frontImage, backImage } = await req.json();
    if (!frontImage) return NextResponse.json({ error: "Missing front image" }, { status: 400 });
    
    let frontBase64 = frontImage.includes(',') ? frontImage.split(',')[1] : frontImage;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            cardName: { type: SchemaType.STRING },
            setName: { type: SchemaType.STRING },
            year: { type: SchemaType.INTEGER },
            sport: { type: SchemaType.STRING },
            cardNumber: { type: SchemaType.STRING },
            pokemonCode: { type: SchemaType.STRING },
            isRare: { type: SchemaType.BOOLEAN },
            rarity: { type: SchemaType.STRING },
            confidence: { type: SchemaType.NUMBER },
            description: { type: SchemaType.STRING },
            manufacturer: { type: SchemaType.STRING },
            subCategory: { type: SchemaType.STRING },
            condition: { type: SchemaType.STRING },
          },
          required: ["cardName", "setName", "year", "sport", "cardNumber", "description", "isRare", "rarity"]
        }
      } 
    });

    const prompt = `You are an expert trading card appraiser and cataloger. You MUST examine BOTH images (front and back) very carefully.

CRITICAL — How to find the CARD NUMBER:
- Look at the BOTTOM of the front face for numbers like "101/140", "#24", "SV049", "025/198"
- Check the BACK of the card near the bottom, in small text boxes, or near copyright info
- For Pokemon: the collector number is usually at the bottom-left or bottom-right of the front face
- For sports cards: check bottom corners, card back footer, or small text in the border
- NEVER leave cardNumber empty — look harder if you don't see it immediately

CRITICAL — How to find the SET NAME:
- Look for logos, watermarks, or expansion symbols on the front
- Check the BACK of the card for the full set name in text
- For Pokemon: match the set symbol icon to known sets (e.g. crown = Prismatic Evolutions, pokeball variants, etc.)
- For sports: look for "Prizm", "Select", "Donruss", "Mosaic", "Chrome", "Bowman", etc.

CRITICAL — How to find the YEAR:
- Check the BACK of the card for copyright text like "© 2024 The Pokemon Company" or "© 2023 Panini"
- The year in the copyright text is the release year of the card
- For vintage cards, the design style and card stock can help date them

Extract these fields with maximum accuracy:
1. cardName: Full name of the player, Pokemon, or character (REQUIRED)
2. setName: Complete set/expansion name (e.g. "Prismatic Evolutions", "Panini Prizm", "Topps Chrome")
3. year: Release year as integer from copyright text or card design
4. sport: Category — Pokemon, Basketball, Football, Baseball, Soccer, Yu-Gi-Oh, etc.
5. cardNumber: The card number EXACTLY as printed (e.g. "150/150", "#24", "SV049"). LOOK CAREFULLY.
6. pokemonCode: For Pokemon only — set code like "SV4a", "sv7", "S12a"
7. isRare: true if holo/foil/special treatment, numbered card, or rarity markers beyond Common/Uncommon
8. rarity: Specific rarity — Common, Uncommon, Rare, Holo Rare, Ultra Rare, Secret Rare, Illustration Rare, Special Art Rare, etc.
9. confidence: Your confidence score from 0.0 to 1.0 in the overall identification accuracy
10. description: A compelling 1-3 sentence listing description
11. manufacturer: Card manufacturer — Panini, Topps, Upper Deck, The Pokemon Company, Konami, etc.
12. subCategory: Sub-category — Sports Cards, Pokemon TCG, Yu-Gi-Oh TCG, NBA Cards, etc.
13. condition: Estimated condition from image — Mint, Near Mint, Lightly Played, Moderately Played, Damaged

If you cannot determine a field, provide your BEST educated guess rather than leaving it empty or null.`;

    const contentParts: any[] = [
      prompt,
      "\n\n--- FRONT OF CARD ---",
      { inlineData: { data: frontBase64, mimeType: "image/jpeg" } }
    ];

    if (backImage) {
      let backBase64 = backImage.includes(',') ? backImage.split(',')[1] : backImage;
      contentParts.push(
        "\n\n--- BACK OF CARD ---",
        { inlineData: { data: backBase64, mimeType: "image/jpeg" } }
      );
    } else {
      contentParts.push(
        "\n\nNote: Only the front image is available. Extract as much data as possible from the front alone. Pay extra attention to any visible card number, set name, or year on the front face."
      );
    }

    const result = await model.generateContent(contentParts);

    const aiData = JSON.parse((await result.response).text());
    
    // Database Match Verification
    const matches = stringSimilarity.findBestMatch(aiData.cardName || "", defaultPlayers.map(p => p.name));
    if (matches.bestMatch.rating > 0.85) {
      const p = defaultPlayers.find(pl => pl.name === matches.bestMatch.target);
      return NextResponse.json({ 
        ...aiData, 
        cardName: p?.name, 
        sport: p?.sport, 
        identificationSource: 'DATABASE_MATCH', 
        identificationConfidence: matches.bestMatch.rating 
      });
    }
    
    return NextResponse.json({ 
      ...aiData, 
      identificationSource: 'AI_FALLBACK',
      identificationConfidence: aiData.confidence || 0.5
    });
  } catch (e: any) { 
    console.error("AI Error:", e);
    return NextResponse.json({ status: 'NEEDS_REVIEW', identificationSource: 'ERROR' }); 
  }
}
