const MAX_AVATAR_EDGE = 512;
const JPEG_QUALITY = 0.82;

/** Resize and compress an image for persona avatar storage (data URL). */
export async function compressAvatarDataUrl(source: string): Promise<string> {
  if (!source.startsWith('data:image/')) {
    return source;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_AVATAR_EDGE / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(source);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('avatar_load_failed'));
    img.src = source;
  });
}

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('avatar_read_failed'));
    };
    reader.onerror = () => reject(new Error('avatar_read_failed'));
    reader.readAsDataURL(file);
  });
  return compressAvatarDataUrl(raw);
}
