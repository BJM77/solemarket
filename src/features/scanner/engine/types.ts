export type BoothStep = 'CAPTURE' | 'REVIEW' | 'SUBMITTING';

export interface ScannerModeConfig<TReview extends Record<string, any>> {
  id: string; // e.g. 'procam', 'coincam'
  captureSequence: string[]; // e.g. ['MAIN', 'DETAIL'] or ['FRONT', 'BACK']
  aspectRatio: string; // e.g. '16:9' or '1:1'
  tips: string;
  
  // AI and Data flows
  aiFlow: (imageUrls: string[]) => Promise<Partial<TReview>>;
  
  // Storage and DB config for the GenericSyncService
  storagePathPrefix: string;
  firestoreCollection: string;
  processResultData?: (aiResult: any) => any;
  
  // UI Hints
  reviewLayout?: 'standard' | 'numismatic' | 'trading-card' | 'sneaker';
}
