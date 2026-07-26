export type CoinStatus = 
  | 'CAPTURED' 
  | 'PROCESSING' 
  | 'NEEDS_REVIEW' 
  | 'VERIFIED'
  | 'READY_TO_EXPORT' 
  | 'ERROR';

export type IdentificationSource = 
  | 'DATABASE_MATCH' 
  | 'AI_FALLBACK' 
  | 'AI_DEEP_SCAN'
  | 'MANUAL' 
  | 'ERROR';

export interface QualityMetricsReport {
  blurScore: number;
  brightnessScore: number;
  glarePercentage: number;
  isAcceptable: boolean;
}

export interface CoinImport {
  id: string;
  status: CoinStatus;
  userId?: string;
  
  frontImagePath: string;
  backImagePath: string;
  
  coinName?: string;
  setName?: string;
  denomination?: string;
  country?: string;
  year?: number;
  mintMark?: string;
  composition?: string;
  rarity?: string;
  isRare?: boolean;
  
  price?: number;
  description?: string;
  condition?: string;
  subCategory?: string;
  brand?: string;
  model?: string;
  
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
