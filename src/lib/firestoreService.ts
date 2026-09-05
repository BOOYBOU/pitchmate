import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  SoccerMatch,
  UserProfile,
  MatchComment,
  AdminAnnouncement,
  DirectMessage,
  InAppNotification
} from '../types';
import {
  INITIAL_MATCHES,
  INITIAL_USERS,
  INITIAL_ANNOUNCEMENTS
} from './mockData';

// Collection references
export const COLLECTIONS = {
  MATCHES: 'matches',
  USERS: 'users',
  COMMENTS: 'match_comments',
  ANNOUNCEMENTS: 'announcements',
  DIRECT_MESSAGES: 'direct_messages',
  NOTIFICATIONS: 'notifications',
  PASSWORD_RESETS: 'password_resets',
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Cached readiness status for Firestore database
let isFirestoreAvailable: boolean | null = null;
let firestoreCheckPromise: Promise<boolean> | null = null;

/**
 * Check if the Firestore database actually exists and is reachable
 * in the user's Google Cloud / Firebase project before opening streams or writing.
 */
export async function checkFirestoreAvailable(): Promise<boolean> {
  if (isFirestoreAvailable !== null) return isFirestoreAvailable;
  if (firestoreCheckPromise) return firestoreCheckPromise;

  firestoreCheckPromise = (async () => {
    try {
      const dbName = firebaseConfig.firestoreDatabaseId || '(default)';
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbName}/documents/test?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));

      // Google returns 404 NOT_FOUND with "The database ... does not exist" when the database hasn't been created
      if (data?.error?.message?.includes('The database') && data?.error?.message?.includes('does not exist')) {
        console.log(
          `[Firestore] Note: Database "${dbName}" is not yet created in Firebase project "${firebaseConfig.projectId}". PitchMate is running in synchronized local & server mode.`
        );
        isFirestoreAvailable = false;
        return false;
      }

      isFirestoreAvailable = true;
      return true;
    } catch {
      isFirestoreAvailable = false;
      return false;
    }
  })();

  return firestoreCheckPromise;
}

/**
 * Seed initial data if Firestore collections are empty and database is available
 */
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    const ready = await checkFirestoreAvailable();
    if (!ready) return;

    // Check if matches collection has documents
    const matchesSnap = await getDocs(collection(db, COLLECTIONS.MATCHES));
    if (matchesSnap.empty) {
      console.log('[Firestore] Seeding initial matches...');
      const batch = writeBatch(db);
      for (const m of INITIAL_MATCHES) {
        const ref = doc(db, COLLECTIONS.MATCHES, m.id);
        batch.set(ref, m);
      }
      await batch.commit();
    }

    // Check users
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    if (usersSnap.empty) {
      console.log('[Firestore] Seeding initial users...');
      const batch = writeBatch(db);
      for (const u of INITIAL_USERS) {
        const ref = doc(db, COLLECTIONS.USERS, u.id);
        batch.set(ref, u);
      }
      await batch.commit();
    }

    // Check announcements
    const annSnap = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));
    if (annSnap.empty) {
      console.log('[Firestore] Seeding initial announcements...');
      const batch = writeBatch(db);
      for (const a of INITIAL_ANNOUNCEMENTS) {
        const ref = doc(db, COLLECTIONS.ANNOUNCEMENTS, a.id);
        batch.set(ref, a);
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firestore] Auto-seed note:', err);
  }
}

/**
 * Realtime subscription to matches
 */
export function subscribeToMatches(callback: (matches: SoccerMatch[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  checkFirestoreAvailable().then((ready) => {
    if (!ready || !active) return;
    try {
      const q = query(collection(db, COLLECTIONS.MATCHES));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const matches: SoccerMatch[] = [];
          snapshot.forEach((doc) => {
            matches.push({ id: doc.id, ...doc.data() } as SoccerMatch);
          });
          callback(matches);
        },
        (err) => {
          console.warn('[Firestore] matches subscription note:', err.message);
        }
      );
    } catch (err) {
      console.warn('[Firestore] subscribeToMatches note:', err);
    }
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

/**
 * Realtime subscription to users
 */
export function subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  checkFirestoreAvailable().then((ready) => {
    if (!ready || !active) return;
    try {
      const q = query(collection(db, COLLECTIONS.USERS));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const users: UserProfile[] = [];
          snapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() } as UserProfile);
          });
          callback(users);
        },
        (err) => {
          console.warn('[Firestore] users subscription note:', err.message);
        }
      );
    } catch (err) {
      console.warn('[Firestore] subscribeToUsers note:', err);
    }
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

/**
 * Realtime subscription to announcements
 */
export function subscribeToAnnouncements(callback: (announcements: AdminAnnouncement[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  checkFirestoreAvailable().then((ready) => {
    if (!ready || !active) return;
    try {
      const q = query(collection(db, COLLECTIONS.ANNOUNCEMENTS));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: AdminAnnouncement[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as AdminAnnouncement);
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(list);
        },
        (err) => {
          console.warn('[Firestore] announcements subscription note:', err.message);
        }
      );
    } catch (err) {
      console.warn('[Firestore] subscribeToAnnouncements note:', err);
    }
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

/**
 * Realtime subscription to match comments
 */
export function subscribeToComments(callback: (comments: Record<string, MatchComment[]>) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  checkFirestoreAvailable().then((ready) => {
    if (!ready || !active) return;
    try {
      const q = query(collection(db, COLLECTIONS.COMMENTS));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const grouped: Record<string, MatchComment[]> = {};
          snapshot.forEach((doc) => {
            const item = { id: doc.id, ...doc.data() } as MatchComment;
            if (!grouped[item.matchId]) grouped[item.matchId] = [];
            grouped[item.matchId].push(item);
          });
          Object.keys(grouped).forEach((key) => {
            grouped[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
          callback(grouped);
        },
        (err) => {
          console.warn('[Firestore] comments subscription note:', err.message);
        }
      );
    } catch (err) {
      console.warn('[Firestore] subscribeToComments note:', err);
    }
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

/**
 * Realtime subscription to direct messages
 */
export function subscribeToDirectMessages(callback: (messages: DirectMessage[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  checkFirestoreAvailable().then((ready) => {
    if (!ready || !active) return;
    try {
      const q = query(collection(db, COLLECTIONS.DIRECT_MESSAGES));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: DirectMessage[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as DirectMessage);
          });
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          callback(list);
        },
        (err) => {
          console.warn('[Firestore] direct messages subscription note:', err.message);
        }
      );
    } catch (err) {
      console.warn('[Firestore] subscribeToDirectMessages note:', err);
    }
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

/**
 * Realtime subscription to notifications
 */
export function subscribeToNotifications(callback: (notifications: InAppNotification[]) => void): () => void {
  let unsub: (() => void) | null = null;
  let active = true;

  checkFirestoreAvailable().then((ready) => {
    if (!ready || !active) return;
    try {
      const q = query(collection(db, COLLECTIONS.NOTIFICATIONS));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: InAppNotification[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as InAppNotification);
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(list);
        },
        (err) => {
          console.warn('[Firestore] notifications subscription note:', err.message);
        }
      );
    } catch (err) {
      console.warn('[Firestore] subscribeToNotifications note:', err);
    }
  });

  return () => {
    active = false;
    if (unsub) unsub();
  };
}

/**
 * Helper to recursively remove undefined properties from objects
 * to prevent Firestore setDoc "Unsupported field value: undefined" errors.
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        cleaned[key] = value
          .filter((item) => item !== undefined)
          .map((item) => (typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item));
      } else if (value instanceof Date) {
        cleaned[key] = value.toISOString();
      } else {
        cleaned[key] = sanitizeForFirestore(value);
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ----------------------------------------------------
// Firestore Direct Mutation Helpers
// ----------------------------------------------------

export async function saveMatchToFirestore(match: SoccerMatch): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanData = sanitizeForFirestore(match);
    await setDoc(doc(db, COLLECTIONS.MATCHES, match.id), cleanData, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Note saving match:', err);
  }
}

export async function deleteMatchFromFirestore(matchId: string): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.MATCHES, matchId));
  } catch (err) {
    console.warn('[Firestore] Note deleting match:', err);
  }
}

export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanData = sanitizeForFirestore(user);
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), cleanData, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Note saving user:', err);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  } catch (err) {
    console.warn('[Firestore] Note deleting user:', err);
  }
}

export async function saveCommentToFirestore(comment: MatchComment): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanData = sanitizeForFirestore(comment);
    await setDoc(doc(db, COLLECTIONS.COMMENTS, comment.id), cleanData, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Note saving comment:', err);
  }
}

export async function deleteCommentFromFirestore(commentId: string): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.COMMENTS, commentId));
  } catch (err) {
    console.warn('[Firestore] Note deleting comment:', err);
  }
}

export async function saveAnnouncementToFirestore(announcement: AdminAnnouncement): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanData = sanitizeForFirestore(announcement);
    await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcement.id), cleanData, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Note saving announcement:', err);
  }
}

export async function deleteAnnouncementFromFirestore(announcementId: string): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId));
  } catch (err) {
    console.warn('[Firestore] Note deleting announcement:', err);
  }
}

export async function saveDirectMessageToFirestore(msg: DirectMessage): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanData = sanitizeForFirestore(msg);
    await setDoc(doc(db, COLLECTIONS.DIRECT_MESSAGES, msg.id), cleanData, { merge: true });

    // Also trigger instant InAppNotification document in Firestore for receiver
    if (msg.receiverId && !msg.read) {
      const notifId = `notif_dm_${msg.id}`;
      const notifData: InAppNotification = {
        id: notifId,
        userId: msg.receiverId,
        title: `Message from ${msg.senderName || 'Teammate'}`,
        message: msg.audioUrl
          ? '🎤 Sent you a voice note'
          : msg.imageUrl
          ? '📷 Sent you a photo'
          : msg.text || 'Sent you a message',
        type: 'direct_message',
        linkId: msg.senderId,
        createdAt: msg.createdAt || new Date().toISOString(),
        read: false,
      };
      await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId), sanitizeForFirestore(notifData), { merge: true });
    }
  } catch (err) {
    console.warn('[Firestore] Note saving direct message:', err);
  }
}

export async function deleteDirectMessageFromFirestore(messageId: string): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.DIRECT_MESSAGES, messageId));
  } catch (err) {
    console.warn('[Firestore] Note deleting direct message:', err);
  }
}

export async function saveNotificationToFirestore(notif: InAppNotification): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanData = sanitizeForFirestore(notif);
    await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notif.id), cleanData, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Note saving notification:', err);
  }
}

export async function deleteNotificationFromFirestore(notifId: string): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId));
  } catch (err) {
    console.warn('[Firestore] Note deleting notification:', err);
  }
}

/**
 * Store 6-digit OTP code in Firestore with expiration timestamp
 */
export async function storePasswordResetOTPInFirestore(
  email: string,
  code: string,
  expiresAt: number,
  type: 'signup' | 'forgot_password' = 'forgot_password'
): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await setDoc(doc(db, COLLECTIONS.PASSWORD_RESETS, docId), {
      email: cleanEmail,
      code: code.trim(),
      expiresAt,
      type,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Firestore] Note saving OTP to Firestore:', err);
  }
}

/**
 * Verify 6-digit OTP code in Firestore
 */
export async function verifyPasswordResetOTPInFirestore(
  email: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  if (isFirestoreAvailable === false) return { valid: false, error: 'Cloud verification unavailable' };
  const ready = await checkFirestoreAvailable();
  if (!ready) return { valid: false, error: 'Cloud verification unavailable' };
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const snap = await getDocs(query(collection(db, COLLECTIONS.PASSWORD_RESETS), where('email', '==', cleanEmail)));

    if (snap.empty) {
      return { valid: false, error: 'No verification code found for this email.' };
    }

    let matchingDoc: any = null;
    snap.forEach((d) => {
      const data = d.data();
      if (data.email === cleanEmail) {
        matchingDoc = data;
      }
    });

    if (!matchingDoc) {
      return { valid: false, error: 'No verification code found for this email.' };
    }

    if (Date.now() > matchingDoc.expiresAt) {
      return { valid: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (matchingDoc.code !== cleanCode) {
      return { valid: false, error: 'Invalid verification code. Please check and try again.' };
    }

    return { valid: true };
  } catch (err) {
    console.warn('[Firestore] Note verifying OTP in Firestore:', err);
    return { valid: false, error: 'Verification failed.' };
  }
}

/**
 * Delete consumed OTP from Firestore
 */
export async function clearPasswordResetOTPInFirestore(email: string): Promise<void> {
  if (isFirestoreAvailable === false) return;
  const ready = await checkFirestoreAvailable();
  if (!ready) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docId = `otp_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await deleteDoc(doc(db, COLLECTIONS.PASSWORD_RESETS, docId));
  } catch (err) {
    console.warn('[Firestore] Note clearing OTP from Firestore:', err);
  }
}
