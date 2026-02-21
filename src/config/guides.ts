export interface Guide {
    slug: string;
    title: string;
    excerpt: string;
    content: string; // HTML or Markdown content
    coverImage: string;
    date: string;
    author: string;
    readingTime: string;
    category: 'Sneakers' | 'Trading Cards' | 'General';
}

export const SEO_GUIDES: Guide[] = [
    {
        slug: 'how-to-authenticate-jordan-1s',
        title: 'How to Authenticate Air Jordan 1s: The Ultimate Guide',
        excerpt: 'Learn the professional methods for spotting fake Air Jordan 1s before you buy.',
        content: `
      <h2>The Importance of Authentication</h2>
      <p>As the sneaker market grows, so does the sophistication of replicas. The Air Jordan 1 is one of the most replicated shoes in the world. Knowing how to spot a fake is crucial for any serious collector in Australia.</p>
      
      <h2>1. The Wing Logo</h2>
      <p>The Wings logo on a genuine Jordan 1 should be deeply embossed, not just printed. The letters "A" and "R" in JORDAN should touch at the bottom. The spacing between the basketball panels should be thin and crisp, not muddy.</p>
      
      <h2>2. The Swoosh and Stitching</h2>
      <p>Pay close attention to the sweeping point of the Nike Swoosh. It should be sharp and elegant. The stitching across the shoe should be uniformly tight and perfectly parallel to the edges. Corner stitching flaws where the stitch line cuts across the Swoosh instead of above it are a common giveaway on older replicas.</p>

      <h2>3. The Hourglass Shape</h2>
      <p>When viewed from directly behind, an authentic Air Jordan 1 will have a distinct "hourglass" shape: wider at the top, curving in at the middle, and widening slightly at the base. Many fakes are completely straight and rigid.</p>

      <h2>Buying with Confidence on Benched</h2>
      <p>At Benched, we protect Australian buyers with our rigorous DealSafe escrow system, ensuring you never get burned on a high-value transaction.</p>
    `,
        coverImage: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?q=80&w=2600&auto=format&fit=crop',
        date: '2024-03-15',
        author: 'Benched Editorial Team',
        readingTime: '5 min read',
        category: 'Sneakers'
    },
    {
        slug: 'investing-in-nba-cards',
        title: 'The Beginner\'s Guide to Investing in NBA Cards in Australia',
        excerpt: 'Everything you need to know to start building a high-value basketball card collection.',
        content: `
      <h2>Why Basketball Cards?</h2>
      <p>The sports card market experienced a massive boom in 2020, and NBA cards led the charge. For Australian collectors, accessing premium cards has traditionally been difficult. Benched changes that by providing a local, secure marketplace.</p>
      
      <h2>Rookie Cards (RC)</h2>
      <p>The golden rule of card investing: Rookie Cards rule the market. A player's first licensed NBA card will almost always be their most valuable. Look for the "RC" shield logo on Panini products.</p>
      
      <h2>Understanding Grading (PSA, BGS, SGC)</h2>
      <p>Grading authenticates a card and assigns it a condition score from 1 to 10. A PSA 10 (Gem Mint) card can sell for significantly more than a raw (ungraded) version of the exact same card. When buying high-end modern cards, graded is usually the safest bet.</p>

      <h2>The Prizm Standard</h2>
      <p>In the modern era (2012-present), Panini Prizm is considered the flagship set. A player's "Silver Prizm" rookie card is the benchmark for its value across the hobby.</p>
    `,
        coverImage: 'https://images.unsplash.com/photo-1606016159991-cdf4a33237f6?q=80&w=2600&auto=format&fit=crop',
        date: '2024-04-02',
        author: 'Alex (Benched Cards Expert)',
        readingTime: '8 min read',
        category: 'Trading Cards'
    }
];

export function getGuideBySlug(slug: string): Guide | undefined {
    return SEO_GUIDES.find(g => g.slug === slug);
}
