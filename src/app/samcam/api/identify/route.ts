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
      model: "gemini-1.5-pro",
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
            description: { type: SchemaType.STRING }
          },
          required: ["cardName", "setName", "year", "sport", "cardNumber", "description", "isRare", "rarity"]
        }
      } 
    });

    const prompt = `Identify the trading card in the image(s). You must scan the card and extract the following details accurately:
    1. Card Name or Player Name: The full name printed on the card.
    2. Year: The release year of the card/set.
    3. Card Number: The number of the card in the set (e.g., "101/140", "12", "H15").
    4. Set Name: The name of the expansion set or card series.
    5. Category/Sport: The sport (e.g. Basketball, Football, Baseball, Soccer) or game name (e.g. Pokemon).
    6. Description: Generate a short sentence or paragraph (1-3 sentences) describing the card, its key features, and visual characteristics.
    7. For Pokemon cards ONLY:
       - pokemonCode: The set identifier or card code if visible (e.g., "SV4a", "BS-103", "Base Set"). If not a Pokemon card, return null or empty string.
       - isRare: Analyze the card symbols (like stars * at the bottom/corners, holograms, foil, etc.) or card type to determine if it is a rare card. Return true if rare, otherwise false.
       - rarity: The specific rarity level (e.g., "Rare", "Common", "Uncommon", "Ultra Rare", "Secret Rare", "Promo") based on stars/symbols or visual cues. If not Pokemon, estimate the general rarity.
    `;

    const contentParts: any[] = [
      prompt,
      { inlineData: { data: frontBase64, mimeType: "image/jpeg" } }
    ];

    if (backImage) {
      let backBase64 = backImage.includes(',') ? backImage.split(',')[1] : backImage;
      contentParts.push({ inlineData: { data: backBase64, mimeType: "image/jpeg" } });
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
      identificationSource: 'AI_FALLBACK' 
    });
  } catch (e: any) { 
    console.error("AI Error:", e);
    return NextResponse.json({ status: 'NEEDS_REVIEW', identificationSource: 'ERROR' }); 
  }
}
