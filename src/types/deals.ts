/**
 * Multi-Card Deal Engine Types
 */

import { Timestamp } from 'firebase/firestore';

export type MultiCardTier = 'bronze' | 'silver' | 'gold' | 'platinum' | null;

export interface DealRequirements {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
}

export interface DealProgress {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
}

export interface Deal {
    id: string;
    code: string; // e.g., "STARTER-PACK"
    name: string; // Display name
    description: string;
    price: number; // Total bundle price
    isActive: boolean;

    requirements: DealRequirements;

    // Optional constraints
    maxPerCustomer?: number;
    validUntil?: Timestamp;
    minTotalValue?: number;

    // Metadata
    createdAt: Timestamp;
    createdBy: string; // Admin user ID
    timesUsed: number;
}

export interface DealCartItem {
    productId: string;
    dealId: string;
    slot: MultiCardTier; // Which slot it fills
    price: number; // Original price
    title: string;
    imageUrl?: string;
}

export interface DealGroup {
    dealId: string;
    deal: Deal;
    items: DealCartItem[];
    isComplete: boolean;
    progress: DealRequirements; // Current progress
    totalPrice: number; // Deal price if complete, sum if not
}

export interface DealValidationResult {
    isValid: boolean;
    errors: string[];
    missingSlots?: {
        bronze: number;
        silver: number;
        gold: number;
        platinum: number;
    };
}
