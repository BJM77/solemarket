export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
  sharpnessScore?: number;
  brightnessScore?: number;
}

const MIN_DIMENSION = 1080;
const MIN_DIMENSION_MACRO = 1440;
const SHARPNESS_THRESHOLD = 50; // Laplacian variance threshold (conservative)
const MIN_BRIGHTNESS = 40;  // 0-255 scale
const MAX_BRIGHTNESS = 230; // 0-255 scale

/**
 * Validates image quality: Size, Resolution, Sharpness, and Brightness.
 */
export async function validateImageQuality(file: File, requireMacro: boolean = false): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    // 1. Basic File Size Check
    if (file.size < 100 * 1024) {
      return resolve({
        isValid: false,
        error: "Image size is too small. The photo may be heavily compressed. Please move closer and retake."
      });
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.error("Failed to revoke object URL", e);
      }
    };

    img.onload = () => {
      cleanup();
      
      const width = img.width;
      const height = img.height;
      const shortestSide = Math.min(width, height);
      const threshold = requireMacro ? MIN_DIMENSION_MACRO : MIN_DIMENSION;

      // 2. Resolution Check
      if (shortestSide < threshold) {
        return resolve({
          isValid: false,
          error: `Resolution too low (${width}x${height}). ${requireMacro ? 'Macro mode requires higher detail.' : 'Please get closer and tap to focus.'}`,
        });
      }

      // 3. Sharpness and Brightness Check via Canvas
      try {
        const { sharpness, brightness } = analyzeImageCanvas(img);

        if (sharpness < SHARPNESS_THRESHOLD) {
          return resolve({
            isValid: false,
            error: "Photo appears blurry. Please hold your phone steady and tap the screen to focus.",
            sharpnessScore: sharpness
          });
        }

        if (brightness < MIN_BRIGHTNESS) {
          return resolve({
            isValid: false,
            error: "Photo is too dark. Please use better lighting or a flash.",
            brightnessScore: brightness
          });
        }

        if (brightness > MAX_BRIGHTNESS) {
          return resolve({
            isValid: false,
            error: "Photo is overexposed (too bright). Please avoid direct glare or flash blowout.",
            brightnessScore: brightness
          });
        }

        resolve({
          isValid: true,
          width,
          height,
          sharpnessScore: sharpness,
          brightnessScore: brightness
        });
      } catch (err) {
        console.error("Canvas analysis failed", err);
        // Fallback to pass if canvas analysis fails (e.g. memory issues)
        resolve({ isValid: true, width, height });
      }
    };

    img.onerror = () => {
      cleanup();
      resolve({
        isValid: false,
        error: "Could not read the image file. Please try taking the photo again."
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Uses Laplacian variance for blur detection and average pixel sampling for brightness.
 */
function analyzeImageCanvas(img: HTMLImageElement): { sharpness: number, brightness: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get canvas context");

  // We sample a 512x512 area from the center for speed and reliability
  const sampleSize = 512;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const sx = (img.width - sampleSize) / 2;
  const sy = (img.height - sampleSize) / 2;

  ctx.drawImage(img, sx, sy, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imageData.data;

  let brightnessSum = 0;
  const grayscale = new Float32Array(sampleSize * sampleSize);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Grayscale conversion (Luma)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale[i / 4] = gray;
    brightnessSum += gray;
  }

  const avgBrightness = brightnessSum / (sampleSize * sampleSize);

  // Laplacian Variance (Sharpness detection)
  // Laplacian Kernel: 
  // [ 0,  1, 0 ]
  // [ 1, -4, 1 ]
  // [ 0,  1, 0 ]
  
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  const count = (sampleSize - 2) * (sampleSize - 2);

  for (let y = 1; y < sampleSize - 1; y++) {
    for (let x = 1; x < sampleSize - 1; x++) {
      const idx = y * sampleSize + x;
      const val = 
        grayscale[idx - sampleSize] + // top
        grayscale[idx - 1] +           // left
        -4 * grayscale[idx] +          // center
        grayscale[idx + 1] +           // right
        grayscale[idx + sampleSize];   // bottom
      
      laplacianSum += val;
      laplacianSqSum += val * val;
    }
  }

  const mean = laplacianSum / count;
  const variance = (laplacianSqSum / count) - (mean * mean);

  return {
    sharpness: Math.round(variance),
    brightness: Math.round(avgBrightness)
  };
}
