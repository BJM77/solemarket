
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
  category: z.string().optional().describe("User-selected category context."),
  idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type SuggestListingDetailsInput = z.infer<typeof suggestListingDetailsInputSchema>;

export const suggestListingDetailsOutputSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('A concise, descriptive, and SEO-friendly title for the listing (e.g., "Air Jordan 1 High OG Chicago Lost and Found").'),
  description: z
    .string()
    .optional()
    .describe(
      'A concise, one-to-two-line description of the item, highlighting its key features and condition.'
    ),
  price: z
    .number()
    .optional()
    .describe(
      'An estimated market price for the item in AUD, based on the provided images and analysis of similar items.'
    ),
  category: z.string().optional().describe("The single best category from this list: 'Sneakers', 'Streetwear', 'Accessories', 'Collector Cards', 'Coins'. MUST match these exact strings."),
  subCategory: z.string().optional().describe("The single best sub-category based on the category context."),
  condition: z.string().optional().describe("The single best condition description from this list: 'New', 'Used', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'."),
  brand: z.string().optional().describe("The brand of the item (e.g., 'Nike', 'Adidas', 'Supreme', 'Panini', 'Topps')."),
  model: z.string().optional().describe("The model name or set name (e.g., 'Air Jordan 1', 'Prizm')."),
  styleCode: z.string().optional().describe("The unique style code (e.g., 'DZ5485-612'). Found on size tag."),
  colorway: z.string().optional().describe("The colorway name (e.g., 'Chicago', 'Zebra', 'Bred')."),
  size: z.string().optional().describe("The size of the item (e.g., '10.5', 'L', 'OS')."),
  year: z.number().optional().describe("The year the item was manufactured or released."),
  gradingCompany: z.string().optional().describe("For cards and coins: PSA, BGS, SGC, PCGS, NGC, Raw."),
  grade: z.string().optional().describe("For cards and coins: 10, 9.5, MS65, Near Mint, etc."),
  certNumber: z.string().optional().describe("For graded cards and coins: The certification number (e.g. 12345678) found on the slab/label."),
  cardNumber: z.string().optional().describe("For cards: The card number (e.g., #123)."),
  manufacturer: z.string().optional().describe("For cards: Panini, Upper Deck, Topps, etc."),
  suggestedFields: z.array(z.string()).optional().describe("A list of field keys that were successfully identified and filled by the AI model."),
  imageAltTexts: z.array(z.string()).optional().describe("A list of descriptive, SEO-friendly alternative text descriptions for each provided photo, in the same order."),
  seoDescription: z.string().optional().describe("A rich, two-paragraph SEO-friendly description detailing the item's historical context, brand significance, set context, specs, and visual details."),
  
  // Alternatives for disambiguation
  alternatives: z.array(z.object({
    title: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    cardNumber: z.string().optional(),
    description: z.string().optional(),
  })).optional().describe("If there are multiple possible distinct matches (e.g., similar parallels or variants) and the exact identity is ambiguous, provide up to 3 alternative options here."),
  
  // Custom Visual Grading & Defect Mapping extension (Phase 2)
  cornersGrade: z.string().optional().describe("A brief, one-sentence description of the card corners' condition (e.g., 'Sharp corners with minor whitening on back left')."),
  edgesGrade: z.string().optional().describe("A brief, one-sentence description of the card edges' condition (e.g., 'Mostly clean edges with a tiny chip on the top')."),
  surfaceGrade: z.string().optional().describe("A brief, one-sentence description of the card surface (e.g., 'Clean with a slight hairline scratch near center')."),
  centeringGrade: z.string().optional().describe("An estimation of the centering as a ratio (e.g., '60/40 Front, 55/45 Back')."),
  defects: z
    .array(z.object({
      x: z.number().min(0).max(100).describe("X-coordinate of the defect on a percentage scale from 0 to 100."),
      y: z.number().min(0).max(100).describe("Y-coordinate of the defect on a percentage scale from 0 to 100."),
      description: z.string().describe("Brief description of what this defect is (e.g., 'Corner whitening', 'Surface scratch', 'Edge chip')."),
      imageIndex: z.number().describe("Index of the image this defect was found on (0 for first photo, 1 for second, etc.).")
    }))
    .optional()
    .describe("List of visual defects found on the card images with their percentage coordinates."),
});
export type SuggestListingDetailsOutput = z.infer<typeof suggestListingDetailsOutputSchema>;


// Schema for src/ai/flows/bulk-suggest-cards.ts
export const bulkSuggestCardsInputSchema = z.object({
  photoDataUris: z
    .array(z.string().describe("Image URL or Data URI"))
    .max(20, 'A maximum of 20 images are allowed.')
    .default([]),
  idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type BulkSuggestCardsInput = z.infer<typeof bulkSuggestCardsInputSchema>;

export const bulkSuggestCardsOutputSchema = z.object({
  cards: z.array(z.object({
    id: z.string().describe("Original index of the image provided."),
    title: z.string().optional().describe('Card Name/Player/Set/Year (e.g., "2019 Panini Prizm Zion Williamson #248").'),
    description: z.string().optional().describe("Brief description of the card."),
    price: z.number().optional().describe('Estimated market price in AUD.'),
    category: z.string().default('Collector Cards'),
    subCategory: z.string().optional().describe("Sport or type (e.g., 'Basketball Cards')."),
    condition: z.string().optional().describe("Estimated condition or grade (e.g., 'Raw', 'Near Mint')."),
    brand: z.string().optional().describe("Manufacturer (e.g., 'Panini', 'Topps')."),
    model: z.string().optional().describe("Set name (e.g., 'Prizm', 'Chrome')."),
    year: z.number().optional().describe("Release year."),
    cardNumber: z.string().optional().describe("Card number (e.g., #248)."),
    gradingCompany: z.string().optional().describe("PSA, BGS, etc."),
    grade: z.string().optional().describe("10, 9, etc."),
  })).describe("The list of detected cards corresponding to the provided images.")
});
export type BulkSuggestCardsOutput = z.infer<typeof bulkSuggestCardsOutputSchema>;


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
