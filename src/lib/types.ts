
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

export type UserRole = 'viewer' | 'seller' | 'admin' | 'superadmin';

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
  imageUrls: string[];
  status: 'available' | 'sold' | 'draft';
  isPrivate?: boolean;
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
  viewedByUsers?: string[]; // List of user IDs who have viewed for unique tracking
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
  view?: 'grid' | 'list';
  priceRange?: [number, number];
  conditions?: string[];
  categories?: string[];
  sellers?: string[];
  yearRange?: [number, number];
};


export type Bid = {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: Timestamp; // Firestore timestamp
  status: 'pending' | 'accepted' | 'rejected';
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
}
