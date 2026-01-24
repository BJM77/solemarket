
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { storage } from "./config";
import { auth } from "./config";

export async function uploadImages(
  files: File[],
  path: string
): Promise<string[]> {
  const user = auth.currentUser;
  // Loosening this restriction to allow category image uploads, etc.
  // if (!user) throw new Error("User not authenticated");

  const uploadPromises = files.map(async (file) => {
    // The path is now more specific, e.g., 'products/userId/timestamp-filename'
    const fileRef = ref(
      storage,
      `${path}/${Date.now()}-${file.name}`
    );
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  });

  return Promise.all(uploadPromises);
}

// Uploads files to a general 'media-library' folder
export async function uploadMedia(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
        const fileRef = ref(storage, `media-library/${Date.now()}-${file.name}`);
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
    });

    return Promise.all(uploadPromises);
}

// Lists all files from the 'media-library'
export async function listMedia(): Promise<{name: string, url: string}[]> {
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
