import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
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
  INITIAL_ANNOUNCEMENTS,
  INITIAL_DIRECT_MESSAGES,
  INITIAL_NOTIFICATIONS
} from './mockData';

// Collection references
export const COLLECTIONS = {
  MATCHES: 'matches',
  USERS: 'users',
  COMMENTS: 'match_comments',
  ANNOUNCEMENTS: 'announcements',
  DIRECT_MESSAGES: 'direct_messages',
  NOTIFICATIONS: 'notifications',
};

/**
 * Seed initial data if Firestore collections are empty
 */
export async function seedInitialFirestoreData(): Promise<void> {
  try {
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
  try {
    const q = query(collection(db, COLLECTIONS.MATCHES));
    return onSnapshot(
      q,
      (snapshot) => {
        const matches: SoccerMatch[] = [];
        snapshot.forEach((doc) => {
          matches.push({ id: doc.id, ...doc.data() } as SoccerMatch);
        });
        callback(matches);
      },
      (err) => {
        console.warn('[Firestore] matches subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore] subscribeToMatches failed:', err);
    return () => {};
  }
}

/**
 * Realtime subscription to users
 */
export function subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.USERS));
    return onSnapshot(
      q,
      (snapshot) => {
        const users: UserProfile[] = [];
        snapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() } as UserProfile);
        });
        callback(users);
      },
      (err) => {
        console.warn('[Firestore] users subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore] subscribeToUsers failed:', err);
    return () => {};
  }
}

/**
 * Realtime subscription to announcements
 */
export function subscribeToAnnouncements(callback: (announcements: AdminAnnouncement[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.ANNOUNCEMENTS));
    return onSnapshot(
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
        console.warn('[Firestore] announcements subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore] subscribeToAnnouncements failed:', err);
    return () => {};
  }
}

/**
 * Realtime subscription to match comments
 */
export function subscribeToComments(callback: (comments: Record<string, MatchComment[]>) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.COMMENTS));
    return onSnapshot(
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
        console.warn('[Firestore] comments subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore] subscribeToComments failed:', err);
    return () => {};
  }
}

/**
 * Realtime subscription to direct messages
 */
export function subscribeToDirectMessages(callback: (messages: DirectMessage[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.DIRECT_MESSAGES));
    return onSnapshot(
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
        console.warn('[Firestore] direct messages subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore] subscribeToDirectMessages failed:', err);
    return () => {};
  }
}

/**
 * Realtime subscription to notifications
 */
export function subscribeToNotifications(callback: (notifications: InAppNotification[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.NOTIFICATIONS));
    return onSnapshot(
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
        console.warn('[Firestore] notifications subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore] subscribeToNotifications failed:', err);
    return () => {};
  }
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
  try {
    const cleanData = sanitizeForFirestore(match);
    await setDoc(doc(db, COLLECTIONS.MATCHES, match.id), cleanData, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving match:', err);
  }
}

export async function deleteMatchFromFirestore(matchId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.MATCHES, matchId));
  } catch (err) {
    console.error('[Firestore] Error deleting match:', err);
  }
}

export async function saveUserToFirestore(user: UserProfile): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(user);
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), cleanData, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving user:', err);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  } catch (err) {
    console.error('[Firestore] Error deleting user:', err);
  }
}

export async function saveCommentToFirestore(comment: MatchComment): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(comment);
    await setDoc(doc(db, COLLECTIONS.COMMENTS, comment.id), cleanData, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving comment:', err);
  }
}

export async function deleteCommentFromFirestore(commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.COMMENTS, commentId));
  } catch (err) {
    console.error('[Firestore] Error deleting comment:', err);
  }
}

export async function saveAnnouncementToFirestore(announcement: AdminAnnouncement): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(announcement);
    await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcement.id), cleanData, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving announcement:', err);
  }
}

export async function deleteAnnouncementFromFirestore(announcementId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId));
  } catch (err) {
    console.error('[Firestore] Error deleting announcement:', err);
  }
}

export async function saveDirectMessageToFirestore(msg: DirectMessage): Promise<void> {
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
    console.error('[Firestore] Error saving direct message:', err);
  }
}

export async function deleteDirectMessageFromFirestore(messageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.DIRECT_MESSAGES, messageId));
  } catch (err) {
    console.error('[Firestore] Error deleting direct message:', err);
  }
}

export async function saveNotificationToFirestore(notif: InAppNotification): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(notif);
    await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notif.id), cleanData, { merge: true });
  } catch (err) {
    console.error('[Firestore] Error saving notification:', err);
  }
}

export async function deleteNotificationFromFirestore(notifId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId));
  } catch (err) {
    console.error('[Firestore] Error deleting notification:', err);
  }
}

