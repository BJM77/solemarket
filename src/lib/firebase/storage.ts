
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { storage } from "./config";
import { auth } from "./config";
import imageCompression from "browser-image-compression";
import { IMAGE_VARIANT_WIDTHS, MASTER_MAX_DIMENSION, IMAGE_CACHE_CONTROL, variantPath, safeWebpFilename } from "@/lib/images/variants";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (matches storage.rules)
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: MASTER_MAX_DIMENSION,
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.85,
};

/** Convert to WebP master (<=1600px). Falls back to the original on unsupported browsers. */
async function toWebp(file: File | Blob, maxWidthOrHeight: number, maxSizeMB: number): Promise<Blob> {
  try {
    const asFile = file instanceof File ? file : new File([file], 'image', { type: file.type || 'image/jpeg' });
    return await imageCompression(asFile, { ...COMPRESSION_OPTIONS, maxWidthOrHeight, maxSizeMB });
  } catch (e) {
    console.warn('WebP conversion failed, uploading original', e);
    return file;
  }
}

function sanitizePath(path: string): string {
  // Remove any path traversal attempts
  const sanitized = path.replace(/\.\./g, '').replace(/\/\//g, '/');

  // Ensure path starts with allowed prefixes
  const allowedPrefixes = ['products/', 'media-library/', 'temp-analysis/', 'grading-temp/'];
  if (!allowedPrefixes.some(prefix => sanitized.startsWith(prefix))) {
    console.warn(`Upload path ${sanitized} does not start with whitelisted prefix. Defaulting to 'media-library/'.`);
    return 'media-library/';
  }

  return sanitized;
}

export async function uploadImages(
  files: (File | Blob)[],
  path: string
): Promise<string[]> {
  const sanitizedPath = sanitizePath(path);

  const uploadPromises = files.map(async (file) => {
    // 1. Enforce size limit
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${(file as File).name || 'Unknown'} is too large. Max size is 20MB.`);
    }

    // 2. Convert to a WebP master (<=1600px) plus small renditions. Frontend may
    // already have compressed for AI analysis; re-encoding here is cheap and
    // guarantees every stored product photo is web-sized.
    const isImage = (file.type || '').startsWith('image/') && !(file.type || '').includes('svg') && !(file.type || '').includes('gif');
    const master = isImage ? await toWebp(file, MASTER_MAX_DIMENSION, 0.8) : file;

    const filename = isImage
      ? safeWebpFilename((file as File).name)
      : `${Date.now()}-${((file as File).name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const fullPath = sanitizedPath.endsWith('/')
      ? `${sanitizedPath}${filename}`
      : `${sanitizedPath}/${filename}`;

    const metadata = { cacheControl: IMAGE_CACHE_CONTROL, contentType: isImage && master.type ? master.type : undefined };
    const fileRef = ref(storage, fullPath);
    await uploadBytes(fileRef, master, metadata);

    if (isImage) {
      // Best-effort renditions; failure must never block a listing.
      await Promise.all(IMAGE_VARIANT_WIDTHS.map(async (w) => {
        try {
          const small = await toWebp(master, w, 0.3);
          await uploadBytes(ref(storage, variantPath(fullPath, w)), small, { cacheControl: IMAGE_CACHE_CONTROL, contentType: 'image/webp' });
        } catch (e) {
          console.warn(`Variant w${w} failed`, e);
        }
      }));
    }

    return getDownloadURL(fileRef);
  });

  return Promise.all(uploadPromises);
}


// Uploads files to a general 'media-library' folder
export async function uploadMedia(files: File[]): Promise<string[]> {
  const uploadPromises = files.map(async (file) => {
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileRef = ref(storage, `media-library/${Date.now()}-${safeFilename}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  });

  return Promise.all(uploadPromises);
}

// Lists all files from the 'media-library'
export async function listMedia(): Promise<{ name: string, url: string }[]> {
  const listRef = ref(storage, 'media-library');
  const res = await listAll(listRef);

  const files = await Promise.all(
    res.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      return { name: itemRef.name, url };
    })
  );

  return files;
}

// Deletes a specific file from the 'media-library'
export async function deleteMedia(fileName: string): Promise<void> {
  const desertRef = ref(storage, `media-library/${fileName}`);
  await deleteObject(desertRef);
}
