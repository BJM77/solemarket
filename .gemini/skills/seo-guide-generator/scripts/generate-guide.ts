
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as fs from 'fs';
import * as path from 'path';

// Define the schema for the Guide Content
const GuideContentSchema = z.object({
    title: z.string().describe("The H1 title of the page (e.g., 'The Ultimate Investment Guide to 1999 Pokemon Base Set')."),
    metaDescription: z.string().describe("SEO meta description (under 160 chars)."),
    history: z.string().describe("3-4 paragraphs on the history and significance of this set/item."),
    investmentProfile: z.string().describe("Analysis of long-term value, volatility, and buyer demand."),
    keyItems: z.array(z.object({
        name: z.string(),
        description: z.string(),
        approxValue: z.string().describe("e.g., '$500 - $5,000'")
    })).describe("Top 5 most sought-after items in this category."),
    faq: z.array(z.object({
        question: z.string(),
        answer: z.string()
    })).describe("3-5 common questions collectors ask.")
});

async function generateGuide(topic: string, slug: string) {
    console.log(`Generating guide for: ${topic}...`);

    const prompt = `
    Write a comprehensive, authoritative "Collector's Guide" for: "${topic}".
    Target Audience: Serious collectors and investors in Australia and worldwide.
    Tone: Professional, insightful, enthusiastic but grounded in data.
    
    Structure:
    1. History & Significance
    2. Investment Profile (Risk/Reward)
    3. Key Items to Watch
    4. FAQ
    
    Ensure the content is optimized for SEO keywords related to "${topic}".
    `;

    try {
        const result = await ai.generate({
            model: 'googleai/gemini-2.5-flash', // Use Flash for speed/reliability in this demo
            prompt: prompt,
            output: { schema: GuideContentSchema }
        });

        const content = result.output;
        if (!content) throw new Error("No content generated.");

        // Save to a JSON file to be used by the page builder
        const outputPath = path.resolve(process.cwd(), `src/content/guides/${slug}.json`);
        
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(content, null, 2));
        console.log(`✅ Guide content saved to: ${outputPath}`);

    } catch (error) {
        console.error("Failed to generate guide:", error);
    }
}

// CLI args parser (simple)
const args = process.argv.slice(2);
const topicArg = args.find(a => a.startsWith('--topic='));
const slugArg = args.find(a => a.startsWith('--slug='));

if (topicArg && slugArg) {
    const topic = topicArg.split('=')[1];
    const slug = slugArg.split('=')[1];
    generateGuide(topic, slug);
} else {
    console.log("Usage: npx ts-node generate-guide.ts --topic=\"Topic\" --slug=\"slug\"");
}
