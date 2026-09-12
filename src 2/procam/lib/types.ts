export type ProStatus = 
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

export interface ProImport {
  id: string;
  status: ProStatus;
  userId?: string;
  
  mainImagePath: string;
  secondaryImagePath: string;
  
  title?: string;
  price?: number;
  description?: string;
  condition?: string;
  category?: string;
  brand?: string;
  model?: string;
  year?: number;
  
  identificationSource: IdentificationSource;
  identificationConfidence?: number;
  
  qualityReport?: {
    main: QualityMetricsReport;
    secondary: QualityMetricsReport;
  };
  
  createdAt: number;
  updatedAt: number;
  serverTimestamp?: any;
}
