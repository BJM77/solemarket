import { ScannerModeConfig } from '../engine/types';
import { deepScanCoin } from '@/ai/flows/deep-scan-coin';

export interface CoincamReviewData {
  docId: string;
  mainUrl: string;
  secondaryUrl: string;
  coinName: string;
  setName: string;
  denomination: string;
  country: string;
  year: number | undefined;
  mintMark: string;
  composition: string;
  rarity: string;
  isRare: boolean;
  description: string;
  price: number | undefined;
  condition: string;
  subCategory: string;
  brand: string;
  model: string;
  isMultiCoin: boolean;
  coinCount: number;
  identificationSource: string;
  identificationConfidence: number;
}

export const coincamMode: ScannerModeConfig<CoincamReviewData> = {
  id: 'coincam',
  captureSequence: ['FRONT', 'BACK'],
  aspectRatio: '1:1', // Coins are typically shot 1:1, but the engine currently uses 16:9 for everything under the hood unless tweaked
  tips: 'Ensure the coin is well lit and fills the center frame.',
  storagePathPrefix: 'coincam_uploads/',
  firestoreCollection: 'coin_imports',
  aiFlow: async (imageUrls: string[]) => {
    // coincam capture sequence gives us 2 images: [FRONT, BACK]
    const [frontUrl, backUrl] = imageUrls;
    const aiResult = await deepScanCoin(frontUrl, backUrl);
    return aiResult as Partial<CoincamReviewData>;
  },
  processResultData: (rawAiOutput: any) => {
    return rawAiOutput;
  },
  reviewLayout: 'numismatic'
};
