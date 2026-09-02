import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const firestoreDbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

// Initialize Firestore with long-polling transport for rock-solid connection inside sandboxed iframes
export const db = (() => {
  try {
    return firestoreDbId
      ? initializeFirestore(app, { experimentalForceLongPolling: true }, firestoreDbId)
      : initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
  }
})();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Helper for sending real Firebase Password Reset Email
export const sendFirebasePasswordReset = async (email: string) => {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  return sendPasswordResetEmail(auth, email);
};

// Helper for verifying Firebase Password Reset Code from action link
export const verifyFirebaseResetCode = async (actionCode: string) => {
  const { verifyPasswordResetCode } = await import('firebase/auth');
  return verifyPasswordResetCode(auth, actionCode);
};

// Helper for confirming password reset with action code
export const confirmFirebasePasswordReset = async (actionCode: string, newPass: string) => {
  const { confirmPasswordReset } = await import('firebase/auth');
  return confirmPasswordReset(auth, actionCode, newPass);
};

// Initialize Firebase Cloud Storage
export const storage = getStorage(app);

// Initialize Firebase Analytics safely (supported in browser environment)
export let analytics: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Ignore analytics unsupported environment errors
  });
}

export default app;
