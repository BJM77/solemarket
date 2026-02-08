export interface MultibuyTier {
    minQuantity: number;
    discountPercent: number;
}

export interface MultibuyTemplate {
    id: string;
    name: string;
    description: string;
    tiers: MultibuyTier[];
    isDefault: boolean;
    createdAt: any;
    updatedAt: any;
}

export interface ProductMultibuy {
    enabled: boolean;
    tiers: MultibuyTier[];
}

export interface MultibuyDiscount {
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    savings: number;
    tierApplied: MultibuyTier | null;
}
