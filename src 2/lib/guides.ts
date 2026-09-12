import fs from 'fs/promises';
import path from 'path';

export interface GuideContent {
    title: string;
    metaDescription: string;
    history: string;
    investmentProfile: string;
    keyItems: {
        name: string;
        description: string;
        approxValue: string;
    }[];
    faq: {
        question: string;
        answer: string;
    }[];
}

/**
 * Fetches the SEO guide content for a specific slug from the file system.
 */
export async function getGuideContent(slug: string): Promise<GuideContent | null> {
    try {
        const filePath = path.join(process.cwd(), 'src/content/guides', `${slug}.json`);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return null;
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as GuideContent;
    } catch (error) {
        console.error(`Error reading guide content for slug ${slug}:`, error);
        return null;
    }
}
