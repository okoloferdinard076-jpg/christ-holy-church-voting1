/**
 * Image compression utility to prevent heavy base64 strings from bloating
 * Firestore documents or exhausting mobile device memory.
 * Aggressively compresses images to max 250x250 with JPEG quality 0.5 targeting strictly under 50KB.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPercentage: number;
}

export async function compressImageFile(
  file: File,
  maxWidth = 250,
  maxHeight = 250,
  quality = 0.5
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    // If not an image file (e.g., PDF or document), return without canvas compression
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = (e.target?.result as string) || '';
        resolve({
          dataUrl: src,
          originalSizeKb,
          compressedSizeKb: originalSizeKb,
          reductionPercentage: 0,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read document file'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Empty image data'));
        return;
      }

      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;

          // Downscale while preserving aspect ratio (max 400x400)
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Ensure minimum dimensions
          width = Math.max(1, width);
          height = Math.max(1, height);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback if canvas context unavailable
            resolve({
              dataUrl: src,
              originalSizeKb,
              compressedSizeKb: originalSizeKb,
              reductionPercentage: 0,
            });
            return;
          }

          // Clean white background for transparent PNG / WEBP
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with target strictly < 50KB
          let currentQuality = quality;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          let compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

          // Iteratively step down quality if still over 50KB
          if (compressedSizeKb > 50 && currentQuality > 0.4) {
            currentQuality = 0.4;
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          }

          if (compressedSizeKb > 50 && currentQuality > 0.25) {
            currentQuality = 0.25;
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          }

          if (compressedSizeKb > 50) {
            // Further scale canvas if still oversized
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = Math.max(1, Math.round(width * 0.75));
            smallCanvas.height = Math.max(1, Math.round(height * 0.75));
            const smallCtx = smallCanvas.getContext('2d');
            if (smallCtx) {
              smallCtx.fillStyle = '#FFFFFF';
              smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
              smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
              compressedDataUrl = smallCanvas.toDataURL('image/jpeg', 0.3);
              compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
            }
          }

          const reductionPercentage = Math.max(
            0,
            Math.round(((originalSizeKb - compressedSizeKb) / (originalSizeKb || 1)) * 100)
          );

          resolve({
            dataUrl: compressedDataUrl,
            originalSizeKb,
            compressedSizeKb,
            reductionPercentage,
          });
        } catch (canvasErr) {
          console.warn('Canvas rendering error, falling back to original:', canvasErr);
          resolve({
            dataUrl: src,
            originalSizeKb,
            compressedSizeKb: originalSizeKb,
            reductionPercentage: 0,
          });
        }
      };

      img.onerror = () => {
        console.warn('Image object decode failed, falling back to raw dataUrl');
        resolve({
          dataUrl: src,
          originalSizeKb,
          compressedSizeKb: originalSizeKb,
          reductionPercentage: 0,
        });
      };

      img.src = src;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file. Please check device permissions.'));
    };

    reader.readAsDataURL(file);
  });
}

