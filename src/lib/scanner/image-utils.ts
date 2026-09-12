/**
 * Unified High-Performance Scanner Image Pre-processing Utility
 * Optimizes image resolution and compression client-side before sending to GenAI flows,
 * drastically reducing mobile latency and memory usage.
 */

export interface OptimizedImageResult {
  dataUri: string;
  width: number;
  height: number;
  originalSizeKb: number;
  compressedSizeKb: number;
}

export async function optimizeScannerImage(
  dataUri: string,
  maxWidth = 1024,
  quality = 0.85
): Promise<OptimizedImageResult> {
  const originalSizeKb = Math.round((dataUri.length * (3 / 4)) / 1024);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Unable to initialize canvas context'));
        return;
      }

      // Smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const optimizedDataUri = canvas.toDataURL('image/jpeg', quality);
      const compressedSizeKb = Math.round((optimizedDataUri.length * (3 / 4)) / 1024);

      resolve({
        dataUri: optimizedDataUri,
        width,
        height,
        originalSizeKb,
        compressedSizeKb,
      });
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for optimization: ' + err));
    };

    img.src = dataUri;
  });
}
