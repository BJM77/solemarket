export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
  sharpnessScore?: number;
  brightnessScore?: number;
  aspectRatio?: number;
}

const MIN_DIMENSION = 1080;
const MIN_DIMENSION_MACRO = 1440;
const SHARPNESS_THRESHOLD = 50; 
const MIN_BRIGHTNESS = 40;  
const MAX_BRIGHTNESS = 245; 

// Card aspect ratio is roughly 2.5/3.5 = 0.71 (portrait)
const CARD_ASPECT_RATIO = 0.71;
const ASPECT_TOLERANCE = 0.25;

/**
 * Validates image quality: Size, Resolution, Sharpness, Brightness, and Framing.
 */
export async function validateImageQuality(file: File, requireMacro: boolean = false): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    // 1. Format/HEIC Check
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    // 2. Basic File Size Check
    if (file.size < 100 * 1024) {
      return resolve({
        isValid: false,
        error: "Image size is too small. Please move closer and retake."
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
      const aspectRatio = width / height;
      const threshold = requireMacro ? MIN_DIMENSION_MACRO : MIN_DIMENSION;

      // 3. Resolution Check
      if (shortestSide < threshold) {
        return resolve({
          isValid: false,
          error: `Resolution too low (${width}x${height}). ${requireMacro ? 'Macro mode requires higher detail.' : 'Please get closer and tap to focus.'}`,
        });
      }

      // 4. Aspect Ratio Sanity Check (for Cards)
      if (requireMacro) {
        const diff = Math.abs(aspectRatio - CARD_ASPECT_RATIO);
        const invDiff = Math.abs(aspectRatio - (1/CARD_ASPECT_RATIO));
        
        // If it's not even close to a rectangle (nearly square), warn
        if (diff > 0.4 && invDiff > 0.4) {
          return resolve({
            isValid: false,
            error: "Unusual framing detected. Please ensure the card fills most of the photo in portrait or landscape mode.",
            aspectRatio
          });
        }
      }

      // 5. Sharpness and Brightness Check via Canvas
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
            error: "Photo is too dark. Please use better lighting or move closer to a window.",
            brightnessScore: brightness
          });
        }

        if (brightness > MAX_BRIGHTNESS) {
          return resolve({
            isValid: false,
            error: "Photo is too bright (overexposed). Please avoid direct glare on the surface.",
            brightnessScore: brightness
          });
        }

        resolve({
          isValid: true,
          width,
          height,
          sharpnessScore: sharpness,
          brightnessScore: brightness,
          aspectRatio
        });
      } catch (err) {
        console.error("Canvas analysis failed", err);
        resolve({ isValid: true, width, height });
      }
    };

    img.onerror = () => {
      cleanup();
      if (isHeic) {
        resolve({
          isValid: false,
          error: "Your device is using HEIC format which this browser cannot read yet. Please change your camera settings to 'Most Compatible' or upload a JPEG."
        });
      } else {
        resolve({
          isValid: false,
          error: "Could not read the image file. Please try taking the photo again."
        });
      }
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

  // Sample center area
  const sampleSize = 512;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const sx = Math.max(0, (img.width - sampleSize) / 2);
  const sy = Math.max(0, (img.height - sampleSize) / 2);

  ctx.drawImage(img, sx, sy, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imageData.data;

  let brightnessSum = 0;
  const grayscale = new Float32Array(sampleSize * sampleSize);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale[i / 4] = gray;
    brightnessSum += gray;
  }

  const avgBrightness = brightnessSum / (sampleSize * sampleSize);

  // Laplacian Variance
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  const count = (sampleSize - 2) * (sampleSize - 2);

  for (let y = 1; y < sampleSize - 1; y++) {
    for (let x = 1; x < sampleSize - 1; x++) {
      const idx = y * sampleSize + x;
      const val = grayscale[idx - sampleSize] + grayscale[idx - 1] + -4 * grayscale[idx] + grayscale[idx + 1] + grayscale[idx + sampleSize];
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
