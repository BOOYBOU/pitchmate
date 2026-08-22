/**
 * Media Storage Helper
 * Uploads audio voice notes and avatar images to the backend disk store (/uploads/*)
 */

export const mediaStorage = {
  /**
   * Upload Voice Note recording
   */
  async uploadAudio(audioBlob: Blob): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
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
   * Upload Avatar Image
   */
  async uploadAvatar(imageBlobOrFile: Blob | File): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
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
};
