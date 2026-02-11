---
name: seo-guide-generator
description: Automates the creation of high-value, programmatic SEO "Guide Pages" for collectibles (e.g., Guide to 1999 Pokemon). Use when generating static content to capture search traffic.
---

# SEO Guide Generator

This skill automates the creation of "Encyclopedia-style" guide pages for the Picksy marketplace. It uses AI to generate authoritative content about specific collectible categories, sets, or items, helping to capture long-tail search traffic and funnel users to active listings.

## Workflow

1.  **Identify Target**: Determine the specific subject for the guide (e.g., "1986 Fleer Basketball", "Pokemon Base Set", "Australian Gold Sovereigns").
2.  **Generate Content**: Use the `scripts/generate-guide-content.ts` script to call the AI (Gemini Pro) and generate the "Investment Profile", "History", and "Key Cards" sections.
3.  **Create Page**: Use the `scripts/create-next-page.ts` script to scaffold a new Next.js page in `src/app/guide/[slug]/page.tsx` (or similar) using the generated content.
4.  **Inject Data**: The page template automatically fetches live market data (active listings, recent sales) to keep the page fresh.

## Usage

### 1. Generate a Guide

Run the generation script with the target topic:

```bash
npx ts-node .gemini/skills/seo-guide-generator/scripts/generate-guide.ts --topic "1999 Pokemon Base Set" --slug "pokemon-base-set-1999"
```

### 2. (Optional) Bulk Generation

To generate multiple guides from a list:

```bash
npx ts-node .gemini/skills/seo-guide-generator/scripts/bulk-generate.ts --file topics.json
```

## Resources

-   **`scripts/generate-guide.ts`**: The main orchestration script.
-   **`assets/GuidePageTemplate.tsx`**: The React component template for the guide page.
-   **`references/seo-structure.md`**: Guidelines for H1, H2, and metadata structure.
