
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { storage } from "./config";
import { auth } from "./config";
import imageCompression from "browser-image-compression";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
};

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
  files: File[],
  path: string
): Promise<string[]> {
  const sanitizedPath = sanitizePath(path);

  const uploadPromises = files.map(async (file) => {
    // 1. Enforce size limit
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} is too large. Max size is 25MB.`);
    }

    // 2. Compress image if it's a large image
    let fileToUpload: File | Blob = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await imageCompression(file, COMPRESSION_OPTIONS);
      } catch (error) {
        console.error("Image compression failed, uploading original:", error);
      }
    }

    // Sanitize filename
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${Date.now()}-${safeFilename}`;

    const fullPath = sanitizedPath.endsWith('/')
      ? `${sanitizedPath}${uniqueFilename}`
      : `${sanitizedPath}/${uniqueFilename}`;

    const fileRef = ref(
      storage,
      fullPath
    );
    await uploadBytes(fileRef, fileToUpload);
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
