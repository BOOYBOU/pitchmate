import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const firestoreDbId = firebaseConfig.firestoreDatabaseId || undefined;

// Initialize Firestore with long-polling transport for rock-solid connection inside sandboxed iframes
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      firestoreDbId
    );
  } catch {
    return firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
  }
})();

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firebase Cloud Storage
export const storage = getStorage(app);

export default app;
