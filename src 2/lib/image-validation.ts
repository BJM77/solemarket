export interface ImageValidationResult {
  isValid: boolean;
  isWarning?: boolean; // NEW: Allow proceeding with a warning
  error?: string;
  warning?: string;
  width?: number;
  height?: number;
  sharpnessScore?: number;
  brightnessScore?: number;
  aspectRatio?: number;
}

const MIN_DIMENSION = 1080;
const MIN_DIMENSION_MACRO = 1440;
const SHARPNESS_THRESHOLD = 40; // Lowered for conservative initial testing
const MIN_BRIGHTNESS = 30;  
const MAX_BRIGHTNESS = 250; 

const CARD_ASPECT_RATIO = 0.71;

export async function validateImageQuality(file: File, requireMacro: boolean = false): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    if (file.size < 80 * 1024) { // Slightly lowered size threshold
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
      } catch (e) {}
    };

    img.onload = () => {
      cleanup();
      
      const width = img.width;
      const height = img.height;
      const shortestSide = Math.min(width, height);
      const aspectRatio = width / height;
      const threshold = requireMacro ? MIN_DIMENSION_MACRO : MIN_DIMENSION;

      if (shortestSide < threshold) {
        return resolve({
          isValid: false,
          error: `Resolution too low (${width}x${height}). ${requireMacro ? 'Macro mode requires higher detail.' : 'Please get closer.'}`,
        });
      }

      if (requireMacro) {
        const diff = Math.abs(aspectRatio - CARD_ASPECT_RATIO);
        const invDiff = Math.abs(aspectRatio - (1/CARD_ASPECT_RATIO));
        if (diff > 0.5 && invDiff > 0.5) {
          return resolve({
            isValid: false,
            error: "Unusual framing. Please ensure the card fills the frame.",
            aspectRatio
          });
        }
      }

      try {
        const { sharpness, brightness } = analyzeImageCanvas(img);
        
        // Log scores for real-world calibration as requested
        console.log(`[Image Quality] ${file.name} - Sharpness: ${sharpness}, Brightness: ${brightness}`);

        // Initial Calibration Phase: Use warnings instead of hard blocks for blur/brightness
        let warning: string | undefined;

        if (sharpness < SHARPNESS_THRESHOLD) {
          warning = "Photo might be blurry. Please ensure text is sharp.";
        } else if (brightness < MIN_BRIGHTNESS) {
          warning = "Photo looks a bit dark. Ensure details are visible.";
        } else if (brightness > MAX_BRIGHTNESS) {
          warning = "Photo looks very bright. Watch out for glare.";
        }

        resolve({
          isValid: true,
          isWarning: !!warning,
          warning,
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
          error: "HEIC format detected. Please use JPEG or 'Most Compatible' camera settings."
        });
      } else {
        resolve({
          isValid: false,
          error: "Could not read image file."
        });
      }
    };

    img.src = objectUrl;
  });
}

function analyzeImageCanvas(img: HTMLImageElement): { sharpness: number, brightness: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas fail");

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
    const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    grayscale[i / 4] = gray;
    brightnessSum += gray;
  }

  const avgBrightness = brightnessSum / (sampleSize * sampleSize);

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

  return { sharpness: Math.round(variance), brightness: Math.round(avgBrightness) };
}
