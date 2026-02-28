
import { Timestamp } from "firebase/firestore";

// We can extend the FirebaseUser type to include our custom fields
export type User = {
  id: string;
  displayName?: string;
  avatarUrl?: string; // Mock data uses avatarUrl
  storeName?: string;
  bio?: string;
  friendIds?: string[];
  blockedSellerIds?: string[];
  birthDate?: string;
  privateCollectionPassword?: string;
  postcode?: string;
};

// Define the shape of the safe, plain user object
export type SafeUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // Add the getIdTokenResult method for custom claims
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: { [key: string]: any; }; }>;
} | null;

export type UserRole = 'viewer' | 'seller' | 'business' | 'admin' | 'superadmin';

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt?: Timestamp;
  accountType?: 'buyer' | 'seller';
  storeName?: string;
  storeDescription?: string;
  bio?: string;
  // Mock data for demo
  rating?: number;
  totalSales?: number;
  isVerified?: boolean;
  joinDate?: string;
  // New Role-Based Access Fields
  role?: UserRole;
  canSell?: boolean;
  sellerStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  listingLimit?: number;
  agreementAccepted?: boolean;
  agreementAcceptedAt?: Timestamp;
  // Payouts & Stripe
  stripeAccountId?: string;
  stripeEnabled?: boolean;
  totalEarnings?: number;
  onStop?: boolean; // If true, seller is suspended and listings are hidden
  stopReason?: string; // Reason for suspension
  // New Contact & Management Fields
  phoneNumber?: string;
  businessName?: string; // For Business users (Slug can be derived or stored in storeName)
  bannerUrl?: string;
  isFounder?: boolean;
  warningCount?: number;
  isBanned?: boolean;
  shopSlug?: string;
  paypalMeLink?: string;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subCategory?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  sellerAvatar?: string;
  sellerVerified?: boolean;
  imageUrls: string[];
  imageAltTexts?: string[]; // Pillar 1: AI Visual SEO
  aiIntelligence?: any[]; // Store full AI vision metadata
  qualityScore?: number; // Overall photo quality (1-10)
  isSafe?: boolean; // Content moderation flag
  safetyReason?: string;
  detectedAttributes?: {
    year?: number | null;
    brand?: string | null;
    model?: string | null;
    styleCode?: string | null;
    size?: string | null;
    colorway?: string | null;
  };
  status: 'available' | 'sold' | 'draft' | 'pending_approval' | 'on_hold'; // Added on_hold
  holdReason?: string;
  isPrivate?: boolean;
  approvedAt?: Timestamp;
  publicReleaseAt?: Timestamp;

  // Sneaker Specifics
  brand?: string;
  model?: string;
  styleCode?: string;
  size?: string;
  colorway?: string;
  color?: string;
  material?: string;

  // Legacy / Other
  gradingCompany?: 'PSA' | 'BGS' | 'CGC' | 'SGC' | 'Raw';
  grade?: string;
  certNumber?: string;
  year?: number;
  manufacturer?: string;
  cardNumber?: string;

  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  soldAt?: any;
  condition?: string;
  conditionDescription?: string;
  isReverseBidding?: boolean;
  bids?: Bid[];
  acceptedBidId?: string;
  isDraft?: boolean;
  quantity?: number;
  views?: number; // Total views (non-unique)
  uniqueViews?: number; // Unique views for auto-repricing
  lastViewedTimestamp?: Timestamp; // Timestamp of the most recent view for auto-repricing
  isVault?: boolean;
  // New Auction Fields
  isAuction?: boolean;
  startingBid?: number;
  currentBid?: number;
  auctionEndTime?: Timestamp;
  buyItNowPrice?: number;
  bidHistory?: Bid[];
  autoRepricingEnabled?: boolean;
  minStockQuantity?: number;
  contactCallCount?: number; // Analytics for phone reveals
  watchCount?: number; // Total number of users watching this product
  isNegotiable?: boolean;
  isFeatured?: boolean;
  isPromoted?: boolean;
  promotionExpiresAt?: Timestamp;
  promotionSessionId?: string;
  title_lowercase?: string;
  isUntimed?: boolean;
  multibuyEnabled?: boolean;
  multibuyTiers?: { minQuantity: number; discountPercent: number; }[];
  multiCardTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  dealId?: string;
  bundlePrice?: number;
  keywords?: string[];
  acceptsPayId?: boolean;
};

export type ProductSearchParams = {
  [key: string]: any;
  q?: string;
  category?: string;
  subCategory?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
  sort?: string;
  view?: 'grid' | 'list' | 'compact' | 'montage';
  priceRange?: [number, number];
  conditions?: string[];
  categories?: string[];
  sizes?: string[];
  sellers?: string[];
  yearRange?: [number, number];
  verifiedOnly?: boolean;
  lastId?: string;
  status?: string;
  isUntimed?: boolean;
  multibuyEnabled?: boolean;
};


export type Bid = {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: Timestamp; // Firestore timestamp
  status: 'pending' | 'accepted' | 'rejected';
  paymentMethodId?: string;
  stripeSetupIntentId?: string;
};

export interface Donation {
  id?: string;
  fullName: string;
  email: string;
  donationType: "Cards" | "Coins" | "Mixed Collectibles";
  description: string;
  quantity: string;
  status: "Pending Label" | "Label Sent" | "Received" | "Sorted" | "Delivered to Hospital";
  createdAt: Timestamp;
}

export interface Seller {
  id: string;
  displayName: string;
  avatarUrl: string;
  rating: number;
  totalSales: number;
}

export interface Review {
  id: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Timestamp;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'user' | 'item';
  itemId?: string; // product id if type is 'item'
  status: 'pending' | 'approved' | 'rejected';
  documentUrls: string[];
  userMessage: string;
  createdAt: Timestamp;
  reviewedBy?: string; // admin id
  reviewedAt?: Timestamp;
  rejectionReason?: string;
}

export interface WishlistItem {
  id: string; // Corresponds to product ID
  addedAt: Timestamp;
}

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  category: string; // e.g., 'General', 'Showcase', 'Advice'
  likes: number;
  repliesCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: 'outbid' | 'sale' | 'system' | 'mention' | 'wishlist_alert';
  title: string;
  message: string;
  link?: string; // URL to redirect to (e.g., /product/123)
  read: boolean;
  createdAt: Timestamp;
}

export interface Transaction {
  id: string;
  transactionId: string; // From payment provider
  buyerId: string;
  sellerId: string;
  productId: string;
  amount: number;
  platformFee: number;
  status: 'completed' | 'refunded' | 'disputed';
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  section: string;
  href?: string;
  showOnHomepage?: boolean;
  showInNav?: boolean;
  isPopular?: boolean;
  order?: number;
  subcategories?: { id: string; name: string; slug: string; parentId: string; }[];
}


export interface Dispute {
  id: string;
  orderId: string;
  transactionId?: string;
  initiatorId: string; // The user who lodged the dispute
  initiatorName: string;
  initiatorRole: 'buyer' | 'seller';
  reason: string;
  description: string;
  evidenceUrls?: string[];
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolution?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string; // Admin ID
}

// Wanted To Buy (WTB) Listings
export interface WantedListing {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  title: string;
  description: string;
  category?: string;
  subCategory?: string;
  maxPrice: number;
  desiredCondition: 'mint' | 'near-mint' | 'excellent' | 'good' | 'fair' | 'any';
  location: string;
  imageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'fulfilled' | 'cancelled';
  contactCount: number;
}

// WTB Contact Messages
export interface WTBMessage {
  id: string;
  wtbListingId: string;
  wtbListingTitle: string;
  wtbUserId: string;
  wtbUserName: string;
  sellerId: string;
  sellerName: string;
  message: string;
  status: 'pending' | 'read' | 'replied';
  createdAt: Timestamp;
}

// Advertising System
export interface Advertisement {
  id: string;
  title: string;
  advertiserName: string;
  linkUrl: string;
  imageUrl: string;
  placement: 'home_hero_footer' | 'grid_interstitial' | 'drops_header';
  status: 'active' | 'paused' | 'scheduled' | 'ended';
  startDate: Timestamp;
  endDate: Timestamp;
  impressions: number;
  clicks: number;
  createdAt: Timestamp;
}
