import { ScannerModeConfig } from '../engine/types';
import { deepScanPro } from '@/ai/flows/deep-scan-pro';

export interface ProcamReviewData {
  docId: string;
  mainUrl: string;
  secondaryUrl: string;
  title: string;
  price: number | null | undefined;
  description: string;
  condition: string;
  category: string;
  brand: string;
  model: string;
  year: number | null | undefined;
}

export const procamMode: ScannerModeConfig<ProcamReviewData> = {
  id: 'procam',
  captureSequence: ['MAIN', 'DETAIL'],
  aspectRatio: '16:9',
  tips: 'Capture a clear photo of the main item, then a close-up detail.',
  
  // Storage and DB config
  storagePathPrefix: 'raw/pro',
  firestoreCollection: 'pro_imports',
  
  aiFlow: async (imageUrls: string[]) => {
    // deepScanPro expects (mainUrl, secondaryUrl)
    return await deepScanPro(imageUrls[0], imageUrls[1]);
  },
  
  reviewLayout: 'standard',
};
