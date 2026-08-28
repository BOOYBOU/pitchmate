import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Media Storage Helper
 * Uploads audio voice notes, avatar photos, and match pitch photos
 * to Firebase Cloud Storage (or backend high-speed endpoint as robust fallback).
 */

export const mediaStorage = {
  /**
   * Upload Voice Note recording to Firebase Cloud Storage
   */
  async uploadAudio(audioBlob: Blob): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${audioBlob.type.includes('wav') ? 'wav' : 'webm'}`;
    
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

    // 2. Server Disk Endpoint Fallback
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, format: audioBlob.type.includes('wav') ? 'wav' : 'webm' }),
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      return { success: true, audioUrl: data.audioUrl };
    } catch (err: any) {
      console.warn('[mediaStorage] Server upload error, fallback to blob URL:', err);
      return { success: true, audioUrl: URL.createObjectURL(audioBlob) };
    }
  },

  /**
   * Upload Avatar or Pitch Image to Firebase Cloud Storage
   */
  async uploadAvatar(imageBlobOrFile: Blob | File): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
    const filename = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

    // 1. Try Firebase Cloud Storage
    try {
      if (storage) {
        const avatarStorageRef = ref(storage, `pitchmate/avatars/${filename}`);
        const snapshot = await uploadBytes(avatarStorageRef, imageBlobOrFile, {
          contentType: (imageBlobOrFile as File).type || 'image/jpeg',
        });
        const cloudUrl = await getDownloadURL(snapshot.ref);
        if (cloudUrl) {
          return { success: true, avatarUrl: cloudUrl };
        }
      }
    } catch (cloudErr) {
      console.warn('[mediaStorage] Firebase Storage avatar upload fallback to server endpoint:', cloudErr);
    }

    // 2. Server Disk Endpoint Fallback
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(imageBlobOrFile);
      const base64Data = await base64Promise;

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data }),
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      return { success: true, avatarUrl: data.avatarUrl };
    } catch (err: any) {
      console.warn('[mediaStorage] Server upload error, fallback to blob URL:', err);
      return { success: true, avatarUrl: URL.createObjectURL(imageBlobOrFile) };
    }
  },

  /**
   * Upload Pitch / Stadium Photo to Firebase Cloud Storage
   */
  async uploadPitchPhoto(imageBlobOrFile: Blob | File): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
    const filename = `pitch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;

    try {
      if (storage) {
        const pitchStorageRef = ref(storage, `pitchmate/pitches/${filename}`);
        const snapshot = await uploadBytes(pitchStorageRef, imageBlobOrFile, {
          contentType: (imageBlobOrFile as File).type || 'image/jpeg',
        });
        const cloudUrl = await getDownloadURL(snapshot.ref);
        if (cloudUrl) {
          return { success: true, photoUrl: cloudUrl };
        }
      }
    } catch (cloudErr) {
      console.warn('[mediaStorage] Firebase Storage pitch upload fallback:', cloudErr);
    }

    // Fallback using avatar upload handler
    const res = await this.uploadAvatar(imageBlobOrFile);
    return { success: res.success, photoUrl: res.avatarUrl, error: res.error };
  }
};

