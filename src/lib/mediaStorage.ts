import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Media Storage Helper
 * Uploads audio voice notes, avatar photos, and chat/pitch images
 * to Firebase Cloud Storage (or backend high-speed endpoint as robust fallback).
 * Ensures files are globally accessible to all simultaneous connected users.
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
  } catch {}
  return headers;
}

export const mediaStorage = {
  /**
   * Upload Voice Note recording to Firebase Cloud Storage or Server
   * Returns a globally accessible URL for all connected users
   */
  async uploadAudio(audioBlob: Blob): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    const ext = audioBlob.type.includes('wav') ? 'wav' : 'webm';
    const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    
    // 1. Try Firebase Cloud Storage
    try {
      if (storage) {
        const audioStorageRef = ref(storage, `pitchmate/voice_notes/${filename}`);
        const snapshot = await uploadBytes(audioStorageRef, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
        });
        const cloudUrl = await getDownloadURL(snapshot.ref);
        if (cloudUrl) {
          return { success: true, audioUrl: cloudUrl };
        }
      }
    } catch (cloudErr) {
      console.warn('[mediaStorage] Firebase Storage audio upload fallback to server endpoint:', cloudErr);
    }

    // 2. Server Disk Endpoint Fallback (served under /uploads/audio/)
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Data = await base64Promise;

      const res = await fetch('/api/upload/audio', {
        method: 'POST',
        headers: getStorageAuthHeaders(),
        body: JSON.stringify({ base64Data, format: ext }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          return { success: true, audioUrl: data.audioUrl };
        }
      }
      
      // If server returned non-ok or failed, return the base64 data URL so all peers can play it
      return { success: true, audioUrl: base64Data };
    } catch (err: any) {
      console.warn('[mediaStorage] Server upload error, fallback to base64 Data URL:', err);
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(audioBlob);
        const base64Data = await base64Promise;
        return { success: true, audioUrl: base64Data };
      } catch {
        return { success: false, error: 'Failed to process audio' };
      }
    }
  },

  /**
   * Upload Chat Photo, Avatar, or Match Image
   * Returns a globally accessible URL for all connected users
   */
  async uploadImage(imageBlobOrFile: Blob | File): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

    // 1. Try Firebase Cloud Storage
    try {
      if (storage) {
        const imageStorageRef = ref(storage, `pitchmate/images/${filename}`);
        const snapshot = await uploadBytes(imageStorageRef, imageBlobOrFile, {
          contentType: (imageBlobOrFile as File).type || 'image/jpeg',
        });
        const cloudUrl = await getDownloadURL(snapshot.ref);
        if (cloudUrl) {
          return { success: true, imageUrl: cloudUrl };
        }
      }
    } catch (cloudErr) {
      console.warn('[mediaStorage] Firebase Storage image upload fallback to server endpoint:', cloudErr);
    }

    // 2. Server Disk Endpoint Fallback (served under /uploads/images/)
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(imageBlobOrFile);
      const base64Data = await base64Promise;

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: getStorageAuthHeaders(),
        body: JSON.stringify({ base64Data }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          return { success: true, imageUrl: data.imageUrl };
        }
      }

      // If server returned non-ok, return the base64 data URL so all peers can view it
      return { success: true, imageUrl: base64Data };
    } catch (err: any) {
      console.warn('[mediaStorage] Server upload error, fallback to base64 Data URL:', err);
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(imageBlobOrFile);
        const base64Data = await base64Promise;
        return { success: true, imageUrl: base64Data };
      } catch {
        return { success: false, error: 'Failed to process image' };
      }
    }
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


