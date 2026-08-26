/**
 * Image compression utility to prevent heavy base64 strings from bloating
 * Firestore documents or exhausting mobile device memory.
 * Compresses images to max 800x800 with JPEG quality targeting strictly under 150KB.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPercentage: number;
}

export async function compressImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.55
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

          // Downscale while preserving aspect ratio (max 800x800)
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

          // Compress to JPEG with target < 150KB
          let currentQuality = quality;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          let compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

          // Iteratively step down quality if still over 150KB
          if (compressedSizeKb > 150 && currentQuality > 0.4) {
            currentQuality = 0.4;
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          }

          if (compressedSizeKb > 150 && currentQuality > 0.25) {
            currentQuality = 0.25;
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            compressedSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          }

          if (compressedSizeKb > 150) {
            // Further scale canvas if still oversized
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = Math.max(1, Math.round(width * 0.75));
            smallCanvas.height = Math.max(1, Math.round(height * 0.75));
            const smallCtx = smallCanvas.getContext('2d');
            if (smallCtx) {
              smallCtx.fillStyle = '#FFFFFF';
              smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
              smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
              compressedDataUrl = smallCanvas.toDataURL('image/jpeg', 0.4);
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

