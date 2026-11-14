/**
 * Shrinks a screenshot before it is sent to a server action for AI analysis.
 *
 * Why: React's server action decoder (decodeReply) rejects any request whose
 * array arguments add up to more than ~1,000,000 characters, failing with
 * "Maximum array nesting exceeded" before the action even runs. A full-size
 * iPhone screenshot (1–2 MB PNG) becomes a 1.5–3 million character base64
 * data URL, so it has to be resized and re-encoded as JPEG in the browser first.
 */

/** Longest edge, in pixels, of the image sent for analysis. */
export const SCREENSHOT_MAX_EDGE = 1600;
/** Safe ceiling for the data URL length (well under React's 1,000,000 limit). */
export const SCREENSHOT_MAX_DATA_URL_CHARS = 700_000;

const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];
const EDGE_STEPS = [SCREENSHOT_MAX_EDGE, 1280, 1024, 800];

export class ScreenshotReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScreenshotReadError';
  }
}

/** Scale (width, height) down so the longest edge is at most maxEdge. Never upscales. */
export function scaleToFit(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Try progressively smaller sizes and lower JPEG qualities until the encoded data URL
 * fits under maxChars. `encode` does the actual drawing/encoding (injected for testing).
 */
export function encodeWithinLimit(
  sourceWidth: number,
  sourceHeight: number,
  encode: (width: number, height: number, quality: number) => string,
  maxChars: number = SCREENSHOT_MAX_DATA_URL_CHARS,
): string {
  let smallest: string | null = null;
  for (const edge of EDGE_STEPS) {
    const { width, height } = scaleToFit(sourceWidth, sourceHeight, edge);
    for (const quality of QUALITY_STEPS) {
      const dataUrl = encode(width, height, quality);
      if (dataUrl.length <= maxChars) return dataUrl;
      if (smallest === null || dataUrl.length < smallest.length) smallest = dataUrl;
    }
  }
  if (smallest !== null && smallest.length <= maxChars) return smallest;
  throw new ScreenshotReadError('That screenshot is too large to analyse. Please try a smaller screenshot.');
}

export function isHeicFile(file: { type?: string; name?: string }): boolean {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}

/**
 * Browser only: decode the file, resize it (max 1600px long edge) and re-encode as JPEG,
 * returning a data URL small enough for a server action argument.
 */
export async function compressScreenshotForAnalysis(file: File): Promise<string> {
  if (file.type && !file.type.startsWith('image/') && !isHeicFile(file)) {
    throw new ScreenshotReadError('Please choose an image file (a screenshot of the listing).');
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new ScreenshotReadError(
      isHeicFile(file)
        ? "This browser can't open HEIC photos. Please take a normal screenshot (PNG/JPEG) of the listing and upload that."
        : "We couldn't open that image. Please try a different screenshot."
    );
  }

  const sourceWidth = img.naturalWidth || img.width;
  const sourceHeight = img.naturalHeight || img.height;
  if (!sourceWidth || !sourceHeight) {
    throw new ScreenshotReadError("We couldn't open that image. Please try a different screenshot.");
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new ScreenshotReadError("Your browser couldn't process that image. Please try again.");
  }

  return encodeWithinLimit(sourceWidth, sourceHeight, (width, height, quality) => {
    canvas.width = width;
    canvas.height = height;
    // JPEG has no transparency: paint white first so transparent PNGs don't turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  });
}
