
/**
 * @fileoverview This file centralizes all Zod schemas for AI flows.
 * This prevents schema duplication and ensures consistency across the application.
 */

import { z } from 'zod';

// Schema for src/ai/flows/check-card-condition.ts
export const cardConditionInputSchema = z.object({
  frontImageUri: z.string().describe("Image URL or Data URI of the front of the card."),
  backImageUri: z.string().describe("Image URL or Data URI of the back of the card."),
  idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type CardConditionInput = z.infer<typeof cardConditionInputSchema>;

export const cardConditionOutputSchema = z.object({
  overallGrade: z.string().describe("The overall assessment of the card's grade as a string, including a number from 1-10 and a descriptive title (e.g., 'Mint 9', 'Near Mint 7', 'Poor 1')."),
  corners: z.string().describe("A brief, one-sentence description of the corners' condition (e.g., 'Sharp with minor whitening on the back-left corner.')."),
  edges: z.string().describe("A brief, one-sentence description of the edges' condition (e.g., 'Clean with one minor chip on the top edge.')."),
  surface: z.string().describe("A brief, one-sentence description of the card's surface, noting any scratches, print lines, or dimples."),
  centering: z.string().describe("An estimation of the centering as a ratio (e.g., '60/40 Front, 55/45 Back')."),
  isImageQualitySufficient: z.boolean().describe("A boolean indicating if the images were clear enough for a confident assessment."),
  qualityFeedback: z.string().optional().describe("If image quality is insufficient, provide a brief suggestion for improvement (e.g., 'Images are too blurry. Please provide higher resolution photos.'). Leave empty if quality is sufficient."),
});
export type CardConditionOutput = z.infer<typeof cardConditionOutputSchema>;


// Schema for src/ai/flows/suggest-listing-details.ts
export const suggestListingDetailsInputSchema = z.object({
  photoDataUris: z
    .array(z.string().describe("Image URL or Data URI"))
    .max(5, 'A maximum of 5 images are allowed.')
    .default([]),
  title: z.string().optional().describe("User-provided title to help generate details if images are missing."),
  idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type SuggestListingDetailsInput = z.infer<typeof suggestListingDetailsInputSchema>;

export const suggestListingDetailsOutputSchema = z.object({
  title: z
    .string()
    .describe('A concise, descriptive, and SEO-friendly title for the listing.'),
  description: z
    .string()
    .describe(
      'A concise, one-to-two-line description of the item, highlighting its key features and condition.'
    ),
  price: z
    .number()
    .describe(
      'An estimated market price for the item in AUD, based on the provided images and analysis of similar items.'
    ),
  category: z.string().describe("The single best category from this list: 'Collector Cards', 'Coins', 'Collectibles'."),
  subCategory: z.string().describe("The single best sub-category based on the main category. For 'Collector Cards', choose from: 'Sports Cards', 'Trading Cards', 'Pokemon'. For 'Coins', use: 'Coins', 'World Coins', 'Ancient Coins', 'Bullion'. For 'Collectibles', use: 'Stamps', 'Comics', 'Figurines', 'Toys', 'Shoes', 'Memorabilia'."),
  condition: z.string().describe("The single best condition from this list: 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'."),
  manufacturer: z.string().describe("The manufacturer or brand of the item (e.g., 'Topps', 'Nintendo', 'US Mint')."),
  year: z.number().describe("The year the item was manufactured or released."),
  cardNumber: z.string().optional().describe("The card number, typically found at the bottom of a collector card (e.g., '4/102', 'RC12')."),
});
export type SuggestListingDetailsOutput = z.infer<typeof suggestListingDetailsOutputSchema>;


// Schema for src/ai/flows/process-donation.ts
export const processDonationInputSchema = z.object({
  donationId: z.string().describe('The ID of the donation document in Firestore.'),
  fullName: z.string(),
  email: z.string(),
  donationType: z.string(),
  description: z.string(),
  quantity: z.string(),
  idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type ProcessDonationInput = z.infer<typeof processDonationInputSchema>;

export const processDonationOutputSchema = z.object({
  status: z.string(),
  message: z.string(),
});
export type ProcessDonationOutput = z.infer<typeof processDonationOutputSchema>;
