export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

const MIN_DIMENSION = 1080; 
const MIN_DIMENSION_MACRO = 1440; // Stricter for cards/coins

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
      const shortestSide = Math.min(img.width, img.height);
      const threshold = requireMacro ? MIN_DIMENSION_MACRO : MIN_DIMENSION;

      if (shortestSide < threshold) {
        return resolve({
          isValid: false,
          error: `Resolution too low (${img.width}x${img.height}). ${requireMacro ? 'Macro mode requires higher detail.' : 'Please get closer and tap to focus.'}`,
        });
      }

      resolve({ isValid: true, width: img.width, height: img.height });
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
