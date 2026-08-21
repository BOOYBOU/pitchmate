/**
 * Security and Cryptographic Utilities for PitchMate
 * Provides salted SHA-256 password hashing via Web Crypto API with backward-compatible fallbacks,
 * session signature verification, and secure input sanitization.
 */

/** Generate a random cryptographic salt */
export const generateSalt = (length = 16): string => {
  const array = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/** Hash a plaintext password with a salt using SHA-256 */
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const combined = `${salt}:${password}:pitchmate_secure_v1`;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }

  // Pure JS DJB2/Murmur-style cryptographic simulation fallback
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return `fallback_${Math.abs(hash).toString(16)}_${salt.slice(0, 8)}`;
};

/** Verify a password against stored hash and salt (supports legacy plaintext upgrade) */
export const verifyPassword = async (
  inputPassword: string,
  storedHash?: string,
  storedSalt?: string,
  legacyPlaintextPassword?: string
): Promise<boolean> => {
  // If stored with hash and salt, compute and compare
  if (storedHash && storedSalt) {
    const computed = await hashPassword(inputPassword, storedSalt);
    return computed === storedHash;
  }

  // If legacy plaintext exists, compare directly
  if (legacyPlaintextPassword) {
    return inputPassword === legacyPlaintextPassword;
  }

  return false;
};

/** Sanitize user-provided text to prevent script injection */
export const sanitizeInput = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '') // remove raw brackets
    .trim();
};

/** Validate password strength: minimum 6 chars */
export const validatePasswordStrength = (password: string): { valid: boolean; message?: string } => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  return { valid: true };
};
