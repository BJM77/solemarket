/**
 * @fileOverview Advanced computer vision for Benched.au Laboratory.
 * Implements real Laplacian Variance for focus and Luminance/Saturation checks for glare.
 */

export interface QualityMetrics {
  blurScore: number;
  brightnessScore: number;
  glarePercentage: number;
  contrastScore: number;
  sharpnessScore: number;
  colorTemperature: number;
  overallScore: number;
  isAcceptable: boolean;
  messages: string[];
}

/**
 * Measures image sharpness using the variance of the Laplacian.
 * Higher score = Sharper edges.
 */
function calculateLaplacianVariance(data: Uint8ClampedArray, width: number, height: number): number {
  const laplacian = new Int32Array(width * height);
  // Central 60% region for focus analysis (most card names are central)
  const startX = Math.round(width * 0.2);
  const endX = Math.round(width * 0.8);
  const startY = Math.round(height * 0.2);
  const endY = Math.round(height * 0.8);

  for (let y = startY + 1; y < endY - 1; y++) {
    for (let x = startX + 1; x < endX - 1; x++) {
      const idx = (y * width + x) * 4;
      // Simple 3x3 Laplacian Kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
      const val = 
        data[((y - 1) * width + x) * 4] +
        data[(y * width + (x - 1)) * 4] +
        data[(y * width + (x + 1)) * 4] +
        data[((y + 1) * width + x) * 4] -
        (4 * data[idx]);
      laplacian[y * width + x] = val;
    }
  }

  // Calculate Variance
  let sum = 0;
  let count = 0;
  for (let i = 0; i < laplacian.length; i++) {
    if (laplacian[i] !== 0) {
      sum += laplacian[i];
      count++;
    }
  }
  const mean = sum / count;
  let sqDiffSum = 0;
  for (let i = 0; i < laplacian.length; i++) {
    if (laplacian[i] !== 0) {
      sqDiffSum += Math.pow(laplacian[i] - mean, 2);
    }
  }

  return Math.sqrt(sqDiffSum / count); // Standard Deviation as a focus score
}

function calculateSharpness(data: Uint8ClampedArray, width: number, height: number): number {
  // Gradient magnitude-based sharpness
  let sumGradient = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const idxTop = ((y - 1) * width + x) * 4;
      const idxBottom = ((y + 1) * width + x) * 4;
      const idxLeft = (y * width + (x - 1)) * 4;
      const idxRight = (y * width + (x + 1)) * 4;
      
      const gx = (data[idxRight] * 0.299 + data[idxRight+1] * 0.587 + data[idxRight+2] * 0.114) -
                 (data[idxLeft] * 0.299 + data[idxLeft+1] * 0.587 + data[idxLeft+2] * 0.114);
      const gy = (data[idxBottom] * 0.299 + data[idxBottom+1] * 0.587 + data[idxBottom+2] * 0.114) -
                 (data[idxTop] * 0.299 + data[idxTop+1] * 0.587 + data[idxTop+2] * 0.114);
      
      const gradient = Math.sqrt(gx * gx + gy * gy);
      sumGradient += gradient;
      count++;
    }
  }
  
  const avgGradient = sumGradient / count;
  // Normalize to 0-100 scale (typical values range 0-50)
  return Math.min(Math.round(avgGradient * 2), 100);
}

function estimateColorTemperature(r: number, g: number, b: number): number {
  // Simplified color temperature estimation
  // 6500K = Daylight, 5000K = Tungsten, 3000K = Warm
  const ratio = (r - b) / (r + g + b);
  return Math.round(6500 - (ratio * 3500));
}

export function analyzeImageQuality(canvas: HTMLCanvasElement): QualityMetrics {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  let totalBrightness = 0;
  let glareCount = 0;
  let sampleCount = 0;
  let rSum = 0, gSum = 0, bSum = 0;
  const step = 4; // Sample every 4th pixel for performance

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      
      const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
      totalBrightness += luminance;
      
      rSum += r;
      gSum += g;
      bSum += b;
      
      sampleCount++;

      // Glare Detection: High luminance + Low saturation
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      if (luminance > 220 && saturation < 0.15) {
        glareCount++;
      }
    }
  }

  const brightnessScore = totalBrightness / sampleCount;
  const glarePercentage = (glareCount / sampleCount) * 100;
  
  // Real Laplacian Variance for blur detection
  const blurScore = calculateLaplacianVariance(data, width, height);

  // Contrast calculation (using RMS contrast)
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
    sum += Math.pow(gray - 128, 2);
  }
  const contrastScore = Math.sqrt(sum / (data.length / 4));

  // Sharpness (using gradient magnitude)
  const sharpnessScore = calculateSharpness(data, width, height);
  
  // Color temperature (simplified)
  const avgR = rSum / sampleCount;
  const avgG = gSum / sampleCount;
  const avgB = bSum / sampleCount;
  const colorTemperature = estimateColorTemperature(avgR, avgG, avgB);

  // Overall score (weighted combination)
  const scores = {
    focus: Math.min(blurScore / 20, 100),
    brightness: Math.min(brightnessScore / 2.55, 100),
    contrast: Math.min(contrastScore / 2, 100),
    sharpness: sharpnessScore
  };
  
  const overallScore = Math.round(
    scores.focus * 0.3 + 
    scores.brightness * 0.2 + 
    scores.contrast * 0.25 + 
    scores.sharpness * 0.25
  );

  const messages: string[] = [];
  if (brightnessScore < 50) messages.push('TOO DARK');
  if (brightnessScore > 200) messages.push('TOO BRIGHT');
  if (glarePercentage > 15) messages.push('REDUCE GLARE');
  if (blurScore < 10) messages.push('NOT IN FOCUS');
  if (contrastScore < 30) messages.push('LOW CONTRAST');

  return {
    blurScore: Math.round(blurScore),
    brightnessScore: Math.round(brightnessScore),
    glarePercentage: parseFloat(glarePercentage.toFixed(2)),
    contrastScore: Math.round(contrastScore),
    sharpnessScore: Math.round(sharpnessScore),
    colorTemperature: Math.round(colorTemperature),
    overallScore: Math.min(overallScore, 100),
    isAcceptable: messages.length === 0,
    messages
  };
}

export async function detectBarcode(canvas: HTMLCanvasElement): Promise<string | null> {
  if (typeof window === 'undefined' || !(window as any).BarcodeDetector) return null;
  try {
    const detector = new (window as any).BarcodeDetector({ formats: ['code_128', 'qr_code'] });
    const barcodes = await detector.detect(canvas);
    return barcodes.length > 0 ? barcodes[0].rawValue : null;
  } catch (e) { return null; }
}
