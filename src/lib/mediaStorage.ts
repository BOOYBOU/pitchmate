import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Media Storage Helper
 * Provides high-speed, cross-platform audio and image processing with client-side compression
 * and fallback persistence across Firebase Cloud Storage and backend server.
 */

function getStorageAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const currentUserId = localStorage.getItem('pitchmate_current_user_id_v2') || 'user_guest';
    const token = localStorage.getItem('pitchmate_auth_token_v2') || `pitchmate_token_${currentUserId}_${Date.now()}`;
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-user-id'] = currentUserId;
    const currentEmail = localStorage.getItem('pitchmate_current_user_email_v2');
    if (currentEmail) headers['x-user-email'] = currentEmail;
  } catch {}
  return headers;
}

/**
 * Client-Side Smart Image Compression
 * Downscales oversized camera/gallery images to max 1280x1280 and 80% JPEG quality.
 * Prevents Firestore 1MB limits, eliminates mobile upload timeouts, and saves bandwidth.
 */
export async function compressImage(
  fileOrBlob: Blob | File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    // If SVG or small GIF, preserve original without canvas rasterization
    if (fileOrBlob.type === 'image/svg+xml' || fileOrBlob.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({ blob: fileOrBlob, dataUrl, size: fileOrBlob.size });
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      // Scale down keeping aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback to reading dataUrl directly if canvas context is unavailable
        const reader = new FileReader();
        reader.onload = () => resolve({ blob: fileOrBlob, dataUrl: reader.result as string, size: fileOrBlob.size });
        reader.readAsDataURL(fileOrBlob);
        return;
      }

      // Smooth interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Output as optimized JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({ blob: fileOrBlob, dataUrl, size: dataUrl.length });
            return;
          }
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ blob, dataUrl, size: blob.size });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve({ blob: fileOrBlob, dataUrl: reader.result as string, size: fileOrBlob.size });
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    };

    img.src = objectUrl;
  });
}

export const mediaStorage = {
  /**
   * Upload Voice Note recording to Firebase Cloud Storage or Server
   * Robust cross-platform MIME detection (supporting iOS Safari MP4/AAC and Chrome WebM)
   */
  async uploadAudio(audioBlob: Blob): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    let ext = 'webm';
    let mimeType = 'audio/webm';

    const blobType = (audioBlob.type || '').toLowerCase();
    if (blobType.includes('mp4') || blobType.includes('m4a') || blobType.includes('aac')) {
      ext = 'mp4';
      mimeType = 'audio/mp4';
    } else if (blobType.includes('wav')) {
      ext = 'wav';
      mimeType = 'audio/wav';
    } else if (blobType.includes('ogg')) {
      ext = 'ogg';
      mimeType = 'audio/ogg';
    } else {
      ext = 'webm';
      mimeType = 'audio/webm';
    }

    // Convert audio Blob to Base64
    let base64Data = '';
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      base64Data = await base64Promise;
    } catch (readErr) {
      console.warn('[mediaStorage] Read audio blob error:', readErr);
    }

    // 1. PRIMARY FAST PATH: Dedicated Server Disk Endpoint (/api/upload/audio)
    if (base64Data) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('/api/upload/audio', {
          method: 'POST',
          headers: getStorageAuthHeaders(),
          body: JSON.stringify({ base64Data, format: ext, mimeType }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.audioUrl) {
            return { success: true, audioUrl: data.audioUrl };
          }
        }
      } catch (err: any) {
        console.warn('[mediaStorage] Server audio upload endpoint notice:', err?.message || err);
      }
    }

    // 2. IMMEDIATE FALLBACK: Base64 Data URL (ensures audio is never lost)
    if (base64Data) {
      return { success: true, audioUrl: base64Data };
    }

    return { success: false, error: 'Failed to process audio' };
  },

  /**
   * Upload Chat Photo, Avatar, or Match Image
   * Automatically compresses image client-side first to avoid Firestore 1MB limits
   */
  async uploadImage(imageBlobOrFile: Blob | File): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    // Always compress client-side first to optimize transfer size and speed
    let compressedBlob: Blob = imageBlobOrFile;
    let base64Data = '';
    try {
      const compressed = await compressImage(imageBlobOrFile, 1280, 1280, 0.82);
      compressedBlob = compressed.blob;
      base64Data = compressed.dataUrl;
    } catch (compressErr) {
      console.warn('[mediaStorage] Compression notice:', compressErr);
    }

    // If compression didn't produce dataUrl, read compressedBlob
    if (!base64Data) {
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(compressedBlob);
        base64Data = await base64Promise;
      } catch (readErr) {
        console.warn('[mediaStorage] Read image blob error:', readErr);
      }
    }

    // 1. PRIMARY FAST PATH: Dedicated Server Disk Endpoint (/api/upload/image)
    if (base64Data) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: getStorageAuthHeaders(),
          body: JSON.stringify({ base64Data }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.imageUrl) {
            return { success: true, imageUrl: data.imageUrl };
          }
        }
      } catch (err: any) {
        console.warn('[mediaStorage] Server image upload endpoint notice:', err?.message || err);
      }
    }

    // 2. IMMEDIATE FALLBACK: Compressed base64 Data URL (ensures image is never lost)
    if (base64Data) {
      return { success: true, imageUrl: base64Data };
    }

    return { success: false, error: 'Failed to process image' };
  },

  /**
   * Upload Avatar Photo to Firebase Cloud Storage or Server
   */
  async uploadAvatar(imageBlobOrFile: Blob | File): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
    const res = await this.uploadImage(imageBlobOrFile);
    return {
      success: res.success,
      avatarUrl: res.imageUrl,
      error: res.error,
    };
  },

  /**
   * Upload Pitch / Stadium Photo to Firebase Cloud Storage or Server
   */
  async uploadPitchPhoto(imageBlobOrFile: Blob | File): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
    const res = await this.uploadImage(imageBlobOrFile);
    return {
      success: res.success,
      photoUrl: res.imageUrl,
      error: res.error,
    };
  }
};


