export const compressImage = (dataUri: string, maxWidth: number = 1024, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's not a data URI (e.g. empty or remote URL), just return it
    if (!dataUri.startsWith('data:')) {
      resolve(dataUri);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Convert to JPEG with specified quality (default 80%)
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
    img.src = dataUri;
  });
};
