import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import stringSimilarity from "string-similarity";
import { defaultPlayers } from "@/samcam/lib/players";

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET || "benched_studio_v4_6_secure";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("X-Benched-Token");
    if (authHeader !== INTERNAL_TOKEN) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { frontImage } = await req.json();
    let base64Data = frontImage.includes(',') ? frontImage.split(',')[1] : frontImage;
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { 
        responseMimeType: "application/json" 
      } 
    });

    const prompt = `Identify this trading card. Extract player name, set name, year, sport, and confidence. 
    JSON Schema: {
      "cardName": string, 
      "setName": string, 
      "year": number, 
      "sport": string, 
      "confidence": number
    }`;

    const result = await model.generateContent([
      prompt, 
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ]);

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
