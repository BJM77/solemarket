export type ShoeStatus = 
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

export interface ShoeImport {
  id: string;
  status: ShoeStatus;
  userId?: string;
  
  front45ImagePath: string;
  sideImagePath: string;
  topImagePath: string;
  labelImagePath: string;
  
  brand?: string;
  model?: string;
  styleCode?: string;
  sizeUs?: string;
  colorway?: string;
  condition?: string;
  
  price?: number;
  description?: string;
  
  identificationSource: IdentificationSource;
  identificationConfidence?: number;
  
  qualityReport?: {
    front45: QualityMetricsReport;
    side: QualityMetricsReport;
    top: QualityMetricsReport;
    label: QualityMetricsReport;
  };
  
  createdAt: number;
  updatedAt: number;
  serverTimestamp?: any;
}
