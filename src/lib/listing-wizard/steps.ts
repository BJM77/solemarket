/** Listing wizard model: categories, guided shot lists and per-step validation (pure, unit tested). */
export const WIZARD_CATEGORIES = ['Sneakers', 'Collector Cards', 'Apparel', 'Accessories'] as const;
export type WizardCategory = (typeof WIZARD_CATEGORIES)[number];

export interface Shot { id: string; label: string; hint: string; required: boolean }

/** Guided photo angles, modelled on what buyers (and authenticators) need to see. */
export const SHOT_LISTS: Record<WizardCategory, Shot[]> = {
  Sneakers: [
    { id: 'side', label: 'Outer side', hint: 'Whole shoe, side on, good light', required: true },
    { id: 'pair', label: 'Pair', hint: 'Both shoes together', required: true },
    { id: 'tag', label: 'Size tag', hint: 'Inside tongue/collar label - size & style code readable', required: true },
    { id: 'sole', label: 'Outsole', hint: 'Bottom of the shoe to show wear', required: false },
    { id: 'heel', label: 'Heel', hint: 'Back of the shoe', required: false },
    { id: 'box', label: 'Box label', hint: 'Box end label if you have the box', required: false },
    { id: 'flaws', label: 'Any flaws', hint: 'Creases, marks, yellowing', required: false },
  ],
  'Collector Cards': [
    { id: 'front', label: 'Front', hint: 'Flat, no glare, all four corners visible', required: true },
    { id: 'back', label: 'Back', hint: 'Flat, no glare', required: true },
    { id: 'corners', label: 'Corners/edges close-up', hint: 'Helps buyers judge condition', required: false },
    { id: 'slab', label: 'Slab label', hint: 'For graded cards: cert number readable', required: false },
  ],
  Apparel: [
    { id: 'front', label: 'Front', hint: 'Laid flat or on a hanger', required: true },
    { id: 'back', label: 'Back', hint: '', required: true },
    { id: 'tag', label: 'Size/brand tag', hint: 'Readable', required: true },
    { id: 'flaws', label: 'Any flaws', hint: '', required: false },
  ],
  Accessories: [
    { id: 'main', label: 'Main photo', hint: 'Whole item', required: true },
    { id: 'detail', label: 'Detail', hint: 'Logo / serial / label', required: false },
    { id: 'flaws', label: 'Any flaws', hint: '', required: false },
  ],
};

export const CONDITIONS: Record<WizardCategory, string[]> = {
  Sneakers: ['New', 'New (no box)', 'Used - Like New', 'Used - Good', 'Used - Fair'],
  'Collector Cards': ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'],
  Apparel: ['New with tags', 'New', 'Used - Like New', 'Used - Good', 'Used - Fair'],
  Accessories: ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'],
};

export interface WizardDraft {
  category?: WizardCategory;
  photos: Record<string, string>; // shot id -> uploaded URL
  title: string;
  brand: string;
  size: string;
  condition: string;
  description: string;
  price: string;
  isNegotiable: boolean;
}

export const EMPTY_DRAFT: WizardDraft = {
  photos: {}, title: '', brand: '', size: '', condition: '', description: '', price: '', isNegotiable: true,
};

export const STEPS = ['category', 'photos', 'details', 'price', 'review'] as const;
export type StepId = (typeof STEPS)[number];

/** Returns a list of human-readable problems; empty = step complete. */
export function validateStep(step: StepId, d: WizardDraft): string[] {
  const errs: string[] = [];
  if (step === 'category' || step === 'review') {
    if (!d.category) errs.push('Choose what you are selling.');
  }
  if ((step === 'photos' || step === 'review') && d.category) {
    for (const s of SHOT_LISTS[d.category]) if (s.required && !d.photos[s.id]) errs.push(`Add the "${s.label}" photo.`);
  }
  if (step === 'details' || step === 'review') {
    if (d.title.trim().length < 5) errs.push('Title needs at least 5 characters.');
    if (d.title.length > 100) errs.push('Title must be under 100 characters.');
    if (!d.condition) errs.push('Choose a condition.');
    if (d.category === 'Sneakers' && !d.size.trim()) errs.push('Add the US size.');
    if (d.description.length > 2000) errs.push('Description must be under 2000 characters.');
  }
  if (step === 'price' || step === 'review') {
    const p = Number(d.price);
    if (!d.price || isNaN(p) || p < 1) errs.push('Enter a price of at least $1.');
    if (p > 100000) errs.push('Price must be under $100,000.');
  }
  return errs;
}

/** Map a completed draft to the createProductAction payload (validated again server-side). */
export function draftToProduct(d: WizardDraft) {
  const order = d.category ? SHOT_LISTS[d.category].map((s) => s.id) : Object.keys(d.photos);
  const imageUrls = order.map((id) => d.photos[id]).filter(Boolean).slice(0, 10);
  return {
    title: d.title.trim(),
    description: d.description.trim(),
    price: Math.round(Number(d.price) * 100) / 100,
    category: d.category!,
    brand: d.brand.trim() || undefined,
    size: d.size.trim() || undefined,
    condition: d.condition,
    imageUrls,
    isNegotiable: d.isNegotiable,
    status: 'available' as const,
    quantity: 1,
  };
}
