/**
 * @fileOverview Core Data Models for Benched.au.
 */

export type CardStatus = 
  | 'CAPTURED' 
  | 'PROCESSING' 
  | 'NEEDS_REVIEW' 
  | 'VERIFIED'
  | 'READY_TO_EXPORT' 
  | 'ERROR';

export type IdentificationSource = 
  | 'DATABASE_MATCH' 
  | 'AI_FALLBACK' 
  | 'MANUAL' 
  | 'GRADED_SLAB'
  | 'ERROR';

export interface QualityMetricsReport {
  blurScore: number;
  brightnessScore: number;
  glarePercentage: number;
  isAcceptable: boolean;
}

export interface CardImport {
  id: string;
  status: CardStatus;
  userId?: string;
  
  frontImagePath: string;
  backImagePath: string;
  
  gradedCertNumber?: string;
  gradingCompany?: 'PSA' | 'BGS' | 'CGC' | 'SGC';
  grade?: string;
  ocrText?: string;
  
  cardName?: string;
  setName?: string;
  cardNumber?: string;
  sport?: string;
  year?: number;
  condition?: string;
  price?: number;
  description?: string;
  
  identificationSource: IdentificationSource;
  identificationConfidence?: number;
  
  qualityReport?: {
    front: QualityMetricsReport;
    back: QualityMetricsReport;
  };
  
  createdAt: number;
  updatedAt: number;
  serverTimestamp?: any;
}

export type ScanHistoryItem = {
  id: string;
  name: string; // Title
  isKeeper: boolean;
  timestamp: Date;
  brand?: string; // Manufacturer / Set
  cardType?: string;
  imageDataUri?: string;
  sport?: string;
  isRare?: boolean;
  notes?: string; // Description or just notes
  cardYear?: number | null; // Year
  isPrizmRookie?: boolean;
  
  // Benched Integration Fields
  subCategory?: string;
  enableBuyAndCollect?: boolean;
  condition?: string;
  gradingCompany?: string;
  grade?: string;
  gradedCertNumber?: string;
  cardNumber?: string;
  price?: number;
  quantity?: number;
  description?: string;
  salesData?: {
    averagePrice?: string | number;
    salesCount?: string | number;
    source?: string;
  };
};



