import { z } from 'zod';

export const productFormSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
    description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
    price: z.number().min(0, "Price must be positive"),

    // Categories
    category: z.enum(['Sneakers', 'Apparel', 'Trading Cards', 'Accessories'], {
        errorMap: () => ({ message: "Please select a valid category" })
    }),
    subCategory: z.string().optional(),

    imageUrls: z.array(z.string().url("Invalid image URL")).min(1, "At least one image is required").max(10, "Maximum 10 images"),

    // Sneaker Specifics
    brand: z.string().min(1, "Brand is required (e.g., Nike, Jordan)"),
    model: z.string().optional(),
    styleCode: z.string().optional(), // Highly recommended for sneakers
    colorway: z.string().optional(),
    size: z.string().min(1, "Size is required (e.g., US 10)"),

    condition: z.string().min(1, "Condition is required"), // Keeping as string to allow flexibility, but usually New/Used
    conditionDescription: z.string().optional(),
    boxCondition: z.enum(['Good Box', 'Bad Box', 'No Box']).optional(),

    // Legacy / Optional (kept for compatibility but generally unused for sneakers)
    year: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
    gradingCompany: z.enum(['PSA', 'BGS', 'CGC', 'SGC', 'Raw']).optional(),
    grade: z.string().optional(),
    certNumber: z.string().optional(),
    manufacturer: z.string().optional(),
    cardNumber: z.string().optional(),

    // Settings
    status: z.enum(['available', 'sold', 'draft']).default('available'),
    isPrivate: z.boolean().default(false),
    isDraft: z.boolean().default(false),
    quantity: z.number().int().min(1).default(1),

    // Feature Flags
    isVault: z.boolean().optional(),
    isReverseBidding: z.boolean().optional(),
    autoRepricingEnabled: z.boolean().optional(),
    isNegotiable: z.boolean().optional(),
    isUntimed: z.boolean().optional(),

    isPromoted: z.boolean().optional().default(false),
    promotionExpiresAt: z.any().optional(),
    promotionSessionId: z.string().optional(),

    // Auction fields
    isAuction: z.boolean().optional(),
    startingBid: z.number().min(0).optional(),
    auctionEndTime: z.any().optional(),
    buyItNowPrice: z.number().min(0).optional(),
    minStockQuantity: z.number().optional(),
}).refine(data => {
    if (data.isUntimed) {
        return true;
    }
    return data.price >= 0.01;
}, {
    message: "Price must be at least $0.01",
    path: ["price"],
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
