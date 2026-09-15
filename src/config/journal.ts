export interface JournalArticle {
    slug: string;
    title: string;
    excerpt: string;
    content: string; // Markdown or HTML
    coverImage: string;
    datePublished: string;
    dateModified: string;
    authorName: string;
    readingTime: string;
    category: 'Sneakers' | 'Cards' | 'Coins' | 'Market Reports';
    featured?: boolean;
}

export const JOURNAL_ARTICLES: JournalArticle[] = [
    {
        slug: 'how-to-spot-fake-kobe-6-protros',
        title: 'How to Spot Fake Kobe 6 Protros in Australia',
        excerpt: 'The Reverse Grinch and Mambacita colorways are highly replicated. Learn the exact details our Vault authenticators look for to verify authentic Nike Kobe 6 Protro basketball shoes.',
        content: `
## Why the Kobe 6 Protro is Highly Replicated

Since Nike relaunched the Kobe line as "Protro" (Performance Retro), demand has skyrocketed. With resale prices for colorways like the "Reverse Grinch" routinely hitting $600-$1000 AUD, counterfeiters have heavily targeted this silhouette.

If you are buying outside of the Benched Vault, here is what you need to look for.

### 1. The Scale Texture (Snake Skin)

The most iconic feature of the Kobe 6 is its polyurethane "snake scale" upper. 
- **Authentic:** The scales have a matte finish, are distinctly raised, and vary slightly in size and orientation to mimic actual snake skin. They feel rubbery and grippy.
- **Fake:** Replicas often make the scales too glossy, too flat, or uniformly stamped. If they feel like hard plastic rather than grippy polyurethane, walk away.

### 2. The Carbon Fiber Shank Plate

Under the arch of the foot, the Kobe 6 Protro features a real carbon fiber shank plate.
- **Authentic:** Real carbon fiber has a distinct woven texture that catches the light differently depending on the angle. If you tap it with your fingernail, it sounds dense and metallic.
- **Fake:** Fakes often use printed plastic. The "weave" pattern will look flat and pixelated up close, and tapping it yields a hollow, cheap plastic sound.

### 3. The Heel Signature

Kobe's signature is printed on the heel counter.
- **Authentic:** The signature should be crisp, perfectly centered, and sunken slightly into the TPU heel counter.
- **Fake:** Replica factories frequently misplace the signature—it may be too high, too low, or have messy edges where the paint bled.

### 4. Cushioning and Weight (The True Test)

The Protro features a large Zoom Turbo unit in the forefoot and Cushlon foam in the heel.
- **Authentic:** The shoe should feel incredibly responsive in the forefoot. A Men's US 10 should weigh approximately 380-400 grams per shoe.
- **Fake:** Fakes use cheap EVA foam. They often weigh 50+ grams less than authentic pairs because they hollow out the midsole to save material costs. 

### Why Use the Benched Vault?

While these tips help, the best replicas (often called "God Killer" batches) can pass visual inspections. Our Benched Vault authenticators use UV light analysis, weight discrepancy testing, and glue-smell checks to guarantee authenticity.

When you buy a [Vault-Verified Kobe 6](?ref=journal&article=how-to-spot-fake-kobe-6-protros), you receive our cryptographic Passport guaranteeing it is 100% authentic.
        `,
        coverImage: 'https://images.unsplash.com/photo-1552346154-21d32810baa3?auto=format&fit=crop&q=80&w=2600',
        datePublished: '2026-03-01T12:00:00Z',
        dateModified: '2026-03-01T12:00:00Z',
        authorName: 'Alex Benched',
        readingTime: '5 min read',
        category: 'Sneakers',
        featured: true
    }
];

export function getArticleBySlug(slug: string): JournalArticle | undefined {
    return JOURNAL_ARTICLES.find(article => article.slug === slug);
}
