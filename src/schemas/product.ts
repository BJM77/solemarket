import { z } from 'zod';

export const productFormSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
    description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description must be less than 2000 characters"),
    price: z.number().min(0.01, "Price must be at least $0.01"),
    category: z.string().min(1, "Category is required"),
    subCategory: z.string().optional(),
    imageUrls: z.array(z.string().url("Invalid image URL")).min(1, "At least one image is required").max(10, "Maximum 10 images"),
    condition: z.string().min(1, "Condition is required"),
    conditionDescription: z.string().optional(),

    // Grading
    gradingCompany: z.enum(['PSA', 'BGS', 'CGC', 'SGC', 'Raw']).optional(),
    grade: z.string().optional(),
    certNumber: z.string().optional(),

    // Additional details
    year: z.number().int().min(1800).max(new Date().getFullYear() + 1).optional(),
    manufacturer: z.string().optional(),
    cardNumber: z.string().optional(),

    // Settings
    status: z.enum(['available', 'sold', 'draft']).default('available'),
    isPrivate: z.boolean().default(false),
    isDraft: z.boolean().default(false),
    quantity: z.number().int().min(1).default(1),
    
    // Feature Flags (Added for new features)
    isVault: z.boolean().optional(),
    isReverseBidding: z.boolean().optional(),
    autoRepricingEnabled: z.boolean().optional(),

    // Auction fields
    isAuction: z.boolean().optional(),
    startingBid: z.number().min(0).optional(),
    auctionEndTime: z.any().optional(), // Timestamp handling can be complex in zod, using any or coercion
    buyItNowPrice: z.number().min(0).optional(),
    minStockQuantity: z.number().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;