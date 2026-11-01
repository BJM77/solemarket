/** A club or stadium with its own free microsite at /club/[slug]. Stored in Firestore `clubs/{id}`. */
export interface Club {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  logoUrl?: string;
  tagline?: string;
  location?: string;
  /** Seller accounts whose listings appear on the club page (max 30). */
  sellerIds: string[];
  sortOrder?: number;
}
