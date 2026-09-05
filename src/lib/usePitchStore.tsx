import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  SoccerMatch,
  UserProfile,
  PlayerRosterItem,
  MatchComment,
  AdminAnnouncement,
  DirectMessage,
  TeamSide,
  PlayerPosition,
  InAppNotification,
  DEFAULT_CURRENCY,
  SUPER_ADMIN_EMAILS,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  isSuperAdminEmail,
  verifySuperAdminMasterPassword,
  getDefaultFormationForMatch,
  MatchGoal,
  MESSI_AVATAR_URL,
} from '../types';
import { INITIAL_MATCHES, INITIAL_USERS, INITIAL_DIRECT_MESSAGES, INITIAL_NOTIFICATIONS, INITIAL_ANNOUNCEMENTS } from './mockData';
import { SoundEffects } from './audioService';
import { hashPassword, verifyPassword, generateSalt, sanitizeInput } from './security';
import { balanceTeams } from './teamBalancer';
import {
  seedInitialFirestoreData,
  subscribeToMatches,
  subscribeToUsers,
  subscribeToAnnouncements,
  subscribeToComments,
  subscribeToDirectMessages,
  subscribeToNotifications,
  saveMatchToFirestore,
  deleteMatchFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveCommentToFirestore,
  deleteCommentFromFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  saveDirectMessageToFirestore,
  deleteDirectMessageFromFirestore,
  saveNotificationToFirestore,
  deleteNotificationFromFirestore,
  storePasswordResetOTPInFirestore,
  verifyPasswordResetOTPInFirestore,
  clearPasswordResetOTPInFirestore
} from './firestoreService';

const STORAGE_KEYS = {
  MATCHES: 'pitchmate_matches_v2',
  USERS: 'pitchmate_users_v2',
  CURRENT_USER_ID: 'pitchmate_current_user_id_v2',
  AUTH_TOKEN: 'pitchmate_auth_token_v2',
  COMMENTS: 'pitchmate_comments_v2',
  ANNOUNCEMENTS: 'pitchmate_announcements_v2',
  DIRECT_MESSAGES: 'pitchmate_direct_messages_v2',
  NOTIFICATIONS: 'pitchmate_notifications_v2',
};

// Non-blocking asynchronous localStorage writer to keep 60/120fps UI completely fluid
const storageQueue = new Map<string, any>();
let storageTimer: any = null;

function scheduleStorageSave(key: string, data: any) {
  if (typeof window === 'undefined') return;
  storageQueue.set(key, data);
  if (storageTimer) return;

  const flush = () => {
    storageTimer = null;
    storageQueue.forEach((val, k) => {
      try {
        localStorage.setItem(k, typeof val === 'string' ? val : JSON.stringify(val));
      } catch {}
    });
    storageQueue.clear();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    storageTimer = (window as any).requestIdleCallback(flush, { timeout: 150 });
  } else {
    storageTimer = setTimeout(flush, 50);
  }
}

interface PitchStoreContextType {
  matches: SoccerMatch[];
  users: UserProfile[];
  currentUser: UserProfile;
  isAuthenticated: boolean;
  comments: Record<string, MatchComment[]>;
  announcements: AdminAnnouncement[];
  directMessages: DirectMessage[];
  unreadMessagesCount: number;
  notifications: InAppNotification[];
  unreadNotificationsCount: number;
  isLoading: boolean;

  // Authentication Actions
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendVerificationOTP: (email: string, type?: 'signup' | 'forgot_password') => Promise<{ success: boolean; code?: string; error?: string }>;
  verifyOTPCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signupWithCredentials: (
    name: string,
    email: string,
    password: string,
    avatarUrl?: string,
    city?: string,
    preferredPosition?: string,
    otpCode?: string
  ) => Promise<{ success: boolean; pendingApproval?: boolean; error?: string }>;
  loginWithGoogle: (
    action?: 'signin' | 'signup',
    profileOverride?: { email: string; name?: string; avatarUrl?: string; uid?: string }
  ) => Promise<{
    success: boolean;
    pendingApproval?: boolean;
    user?: UserProfile;
    code?: string;
    error?: string;
  }>;
  resetPasswordWithEmail: (email: string, newPassword: string, otpCode?: string) => Promise<{ success: boolean; error?: string }>;
  sendFirebasePasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyFirebaseActionCode: (actionCode: string) => Promise<{ success: boolean; email?: string; error?: string }>;
  confirmFirebasePasswordResetAction: (actionCode: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Match Actions
  joinMatch: (matchId: string, teamChoice?: TeamSide) => Promise<boolean>;
  leaveMatch: (matchId: string) => Promise<boolean>;
  createMatch: (
    matchData: Omit<SoccerMatch, 'id' | 'createdAt' | 'updatedAt' | 'roster' | 'waitlist' | 'creatorId' | 'creatorName' | 'creatorEmail' | 'isLocked' | 'status'>
  ) => Promise<string>;
  updateMatch: (matchId: string, updates: Partial<SoccerMatch>) => Promise<boolean>;
  deleteMatch: (matchId: string) => Promise<boolean>;
  assignPlayerTeam: (matchId: string, userId: string, team: TeamSide) => Promise<boolean>;
  removePlayerFromMatch: (matchId: string, userId: string) => Promise<boolean>;
  toggleMatchLock: (matchId: string) => Promise<boolean>;
  broadcastWaitlistAlert: (matchId: string) => Promise<{ success: boolean; notifiedCount: number; openSpots: number }>;
  togglePlayerPaidStatus: (matchId: string, playerId: string) => Promise<boolean>;
  updatePlayerPaymentStatus: (
    matchId: string,
    playerId: string,
    status: 'paid' | 'pending' | 'unpaid' | 'waived',
    method?: 'cash' | 'cih_bank' | 'attijari' | 'wafacash' | 'other'
  ) => Promise<boolean>;
  updateMatchPitchCost: (matchId: string, totalCost: number, pricePerPlayer: number) => Promise<boolean>;
  autoBalanceTeams: (matchId: string, mode?: 'balanced' | 'random' | 'veterans_vs_newcomers') => Promise<boolean>;
  updateTacticalFormation: (
    matchId: string,
    formationGreen: string,
    formationBlue: string,
    tacticalAssignments: Record<string, string>
  ) => Promise<boolean>;
  assignPlayerTacticalSlot: (
    matchId: string,
    slotKey: string,
    userId: string,
    rolePosition?: PlayerPosition
  ) => Promise<boolean>;
  claimTacticalSlot: (
    matchId: string,
    slotKey: string,
    userId: string,
    rolePosition?: PlayerPosition,
    teamSide?: TeamSide
  ) => Promise<{ success: boolean; error?: string }>;
  releaseTacticalSlot: (
    matchId: string,
    slotKey: string
  ) => Promise<{ success: boolean; error?: string }>;
  markMatchAttendance: (
    matchId: string,
    attendedPlayerIds: string[],
    noShowPlayerIds: string[]
  ) => Promise<boolean>;

  // Live Scoreboard, Goals, Substitutions & Cards
  updateMatchScore: (matchId: string, green: number, blue: number) => Promise<boolean>;
  recordMatchGoal: (
    matchId: string,
    team: TeamSide,
    scorerId: string,
    scorerName: string,
    minute?: number,
    assistId?: string,
    assistName?: string
  ) => Promise<boolean>;
  recordMatchSubstitution: (
    matchId: string,
    team: TeamSide,
    playerOutId: string,
    playerOutName: string,
    playerInId: string,
    playerInName: string,
    minute: number
  ) => Promise<boolean>;
  recordMatchCard: (
    matchId: string,
    team: TeamSide,
    playerId: string,
    playerName: string,
    type: 'yellow' | 'red',
    reason?: string,
    minute?: number
  ) => Promise<boolean>;
  voteMatchMvp: (matchId: string, nomineeId: string) => Promise<boolean>;
  voteManOfTheMatch: (matchId: string, nomineeId: string) => Promise<boolean>;
  uploadPaymentProof: (
    matchId: string,
    playerId: string,
    playerName: string,
    amount: number,
    method: 'cih_bank' | 'attijari' | 'cash' | 'wafacash' | 'other',
    screenshotUrl?: string,
    note?: string
  ) => Promise<boolean>;
  updateMatchBankDetails: (
    matchId: string,
    bankDetails: { bankName: string; accountHolder: string; rib: string; phone?: string; notes?: string }
  ) => Promise<boolean>;
  duplicateAsRecurringMatch: (matchId: string, daysAhead?: number) => Promise<string | null>;

  // Comments & Voice Notes in Match Board
  addComment: (matchId: string, text: string) => Promise<boolean>;
  addVoiceComment: (matchId: string, audioUrl: string, durationSeconds: number) => Promise<boolean>;
  deleteComment: (matchId: string, commentId: string) => Promise<boolean>;

  // Profile & User Management
  setCurrentUserById: (userId: string) => void;
  authenticateSuperAdmin: (password: string) => boolean;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<boolean>;
  createNewUserAccount: (name: string, email: string) => UserProfile;
  approveUser: (userId: string) => Promise<boolean>;
  rejectUser: (userId: string, reason?: string) => Promise<boolean>;
  approveAllPendingUsers: () => Promise<boolean>;
  banUser: (userId: string, reason?: string) => Promise<boolean>;
  unbanUser: (userId: string) => Promise<boolean>;
  removeUserAccount: (userId: string) => Promise<boolean>;
  deleteUserAccount: (userId: string) => Promise<boolean>;

  // Announcements
  createAnnouncement: (title: string, message: string, type: AdminAnnouncement['type']) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;

  // Direct Messaging & Voice Notes
  sendDirectMessage: (receiverId: string, text: string, imageUrl?: string) => Promise<boolean>;
  sendDirectVoiceMessage: (receiverId: string, audioUrl: string, durationSeconds: number) => Promise<boolean>;
  markConversationAsRead: (otherUserId: string) => void;
  deleteDirectMessage: (messageId: string) => void;

  // In-App Notifications
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  sendNotification: (notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => void;

  resetToDefaultData: () => void;
}

const PitchStoreContext = createContext<PitchStoreContextType | null>(null);

export const PitchStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      const parsed: UserProfile[] = saved ? JSON.parse(saved) : INITIAL_USERS;
      const MOCK_IDS = new Set(['user_yassine', 'user_achraf', 'user_sofyan', 'user_youssef', 'user_admin_likobig', 'user_admin_main', 'user_mustapha_alt']);
      const filtered = parsed.filter((u) => !MOCK_IDS.has(u.id) && !(u.email || '').endsWith('@pitchmate.ma'));
      const list = filtered.length > 0 ? filtered : INITIAL_USERS;
      return list.map((u) => ({
        ...u,
        isAdmin: isSuperAdminEmail(u.email),
        status: isSuperAdminEmail(u.email) ? ('approved' as const) : (u.status || 'approved'),
        avatarUrl: isSuperAdminEmail(u.email) ? MESSI_AVATAR_URL : u.avatarUrl,
      }));
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (!token) return '';
      return saved || '';
    } catch {
      return '';
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return Boolean(token);
    } catch {
      return false;
    }
  });

  const [matches, setMatches] = useState<SoccerMatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MATCHES);
      if (saved) {
        const parsed: SoccerMatch[] = JSON.parse(saved);
        return parsed.map((m) => ({
          ...m,
          currency: m.currency || DEFAULT_CURRENCY,
          totalPitchCost: m.totalPitchCost ?? (m.pricePerPlayer * (m.maxPlayers || 14)),
          paidPlayerIds: m.paidPlayerIds ?? [m.creatorId],
          score: m.score || { green: 0, blue: 0 },
          goals: m.goals || [],
          mvpVotes: m.mvpVotes || {},
        }));
      }
      return INITIAL_MATCHES;
    } catch {
      return INITIAL_MATCHES;
    }
  });

  const [comments, setComments] = useState<Record<string, MatchComment[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMMENTS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
    } catch {
      return INITIAL_ANNOUNCEMENTS;
    }
  });

  const [directMessages, setDirectMessages] = useState<DirectMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DIRECT_MESSAGES);
      return saved ? JSON.parse(saved) : INITIAL_DIRECT_MESSAGES;
    } catch {
      return INITIAL_DIRECT_MESSAGES;
    }
  });

  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [isLoading] = useState(false);
  const knownMsgIdsRef = useRef<Set<string>>(new Set());
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Background non-blocking localStorage caching
  useEffect(() => {
    scheduleStorageSave(STORAGE_KEYS.MATCHES, matches);
  }, [matches]);

  useEffect(() => {
    scheduleStorageSave(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    scheduleStorageSave(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    scheduleStorageSave(STORAGE_KEYS.COMMENTS, comments);
  }, [comments]);

  useEffect(() => {
    scheduleStorageSave(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
  }, [announcements]);

  useEffect(() => {
    scheduleStorageSave(STORAGE_KEYS.DIRECT_MESSAGES, directMessages);
  }, [directMessages]);

  useEffect(() => {
    scheduleStorageSave(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }, [notifications]);

  // Current User Object
  const currentUser: UserProfile = useMemo(() => {
    const found = users.find((u) => u.id === currentUserId);
    if (found) return found;
    return {
      id: 'user_mustapha',
      email: 'bouhbousmustapha@gmail.com',
      name: 'Mustapha Bouhbous',
      avatarUrl: MESSI_AVATAR_URL,
      phone: '+212 661-234567',
      city: 'Casablanca',
      isAdmin: true,
      status: 'approved',
      matchesPlayed: 50,
      createdAt: new Date().toISOString(),
    };
  }, [users, currentUserId]);

  const unreadMessagesCount = useMemo(() => {
    return directMessages.filter((m) => m.receiverId === currentUser.id && !m.read).length;
  }, [directMessages, currentUser.id]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => n.userId === currentUser.id && !n.read).length;
  }, [notifications, currentUser.id]);

  const mergeMatchesWithTimestamps = useCallback((current: SoccerMatch[], incoming: SoccerMatch[]): SoccerMatch[] => {
    if (!incoming || incoming.length === 0) return current;
    if (!current || current.length === 0) return incoming;

    const currentMap = new Map(current.map((m) => [m.id, m]));
    const incomingMap = new Map(incoming.map((m) => [m.id, m]));
    const merged: SoccerMatch[] = [];

    incoming.forEach((inc) => {
      const curr = currentMap.get(inc.id);
      if (!curr) {
        merged.push(inc);
      } else {
        const currTime = new Date(curr.updatedAt || curr.createdAt || 0).getTime();
        const incTime = new Date(inc.updatedAt || inc.createdAt || 0).getTime();
        if (currTime > incTime) {
          merged.push(curr); // retain optimistic local state
        } else {
          merged.push(inc);
        }
      }
    });

    current.forEach((curr) => {
      if (!incomingMap.has(curr.id)) {
        merged.push(curr);
      }
    });

    return merged;
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || `pitchmate_token_${currentUserId}_${Date.now()}`;
    const isAdminUser = Boolean(isSuperAdminEmail(currentUser.email));
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-id': currentUserId,
      'x-user-email': currentUser.email,
      'x-is-admin': isAdminUser ? 'true' : 'false',
      ...(isAdminUser ? { 'x-admin-password': SUPER_ADMIN_PASSWORD } : {}),
    };
  }, [currentUserId, currentUser.email]);

  const fetchGlobalState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) setUsers(data.users);
      if (data.matches && Array.isArray(data.matches)) setMatches(data.matches);
      if (data.comments) setComments(data.comments);
      if (data.announcements && Array.isArray(data.announcements)) setAnnouncements(data.announcements);
      if (data.directMessages && Array.isArray(data.directMessages)) setDirectMessages(data.directMessages);
      if (data.notifications && Array.isArray(data.notifications)) setNotifications(data.notifications);
    } catch {}
  }, []);

  useEffect(() => {
    fetchGlobalState();
    const handleFocus = () => fetchGlobalState();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGlobalState]);

  // Realtime Cloud Firestore Synchronization
  useEffect(() => {
    // 1. Seed initial demo matches/users to Firestore if empty
    seedInitialFirestoreData();

    // 2. Subscribe in Realtime to Firestore collections
    const unsubMatches = subscribeToMatches((cloudMatches) => {
      if (cloudMatches && cloudMatches.length > 0) {
        setMatches((prev) => mergeMatchesWithTimestamps(prev, cloudMatches));
      }
    });

    const unsubUsers = subscribeToUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
      }
    });

    const unsubAnnouncements = subscribeToAnnouncements((cloudAnnouncements) => {
      if (cloudAnnouncements) {
        setAnnouncements(cloudAnnouncements);
      }
    });

    const unsubComments = subscribeToComments((cloudComments) => {
      if (cloudComments) {
        setComments(cloudComments);
      }
    });

    const unsubMessages = subscribeToDirectMessages((cloudMessages) => {
      if (cloudMessages) {
        // Detect newly arrived messages for current user
        if (knownMsgIdsRef.current.size > 0) {
          const hasNewForMe = cloudMessages.some(
            (m) => !knownMsgIdsRef.current.has(m.id) && m.receiverId === currentUserIdRef.current && !m.read
          );
          if (hasNewForMe) {
            SoundEffects.playMessageReceived();
          }
        }
        cloudMessages.forEach((m) => knownMsgIdsRef.current.add(m.id));
        setDirectMessages(cloudMessages);
      }
    });

    const unsubNotifications = subscribeToNotifications((cloudNotifications) => {
      if (cloudNotifications) {
        setNotifications(cloudNotifications);
      }
    });

    return () => {
      unsubMatches();
      unsubUsers();
      unsubAnnouncements();
      unsubComments();
      unsubMessages();
      unsubNotifications();
    };
  }, [mergeMatchesWithTimestamps]);

  // Setup Singleton Server-Sent Events (SSE) for realtime sync fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/sync/events');

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const { type, payload } = parsed;

            switch (type) {
              case 'SYNC_USERS':
                if (payload) setUsers(payload);
                break;
              case 'SYNC_MATCHES':
                if (payload) setMatches((prev) => mergeMatchesWithTimestamps(prev, payload));
                break;
              case 'SYNC_COMMENTS':
                if (payload) setComments(payload);
                break;
              case 'SYNC_ANNOUNCEMENTS':
                if (payload) setAnnouncements(payload);
                break;
              case 'SYNC_DIRECT_MESSAGES':
                if (payload && Array.isArray(payload)) {
                  if (knownMsgIdsRef.current.size > 0) {
                    const hasNewForMe = payload.some(
                      (m: DirectMessage) => !knownMsgIdsRef.current.has(m.id) && m.receiverId === currentUserIdRef.current && !m.read
                    );
                    if (hasNewForMe) {
                      SoundEffects.playMessageReceived();
                    }
                  }
                  payload.forEach((m: DirectMessage) => knownMsgIdsRef.current.add(m.id));
                  setDirectMessages(payload);
                }
                break;
              case 'SYNC_NOTIFICATIONS':
                if (payload) setNotifications(payload);
                break;
              case 'SYNC_USERS_AND_NOTIFS':
                if (payload.users) setUsers(payload.users);
                if (payload.notifications) setNotifications(payload.notifications);
                break;
              case 'SYNC_ALL':
                if (payload.users) setUsers(payload.users);
                if (payload.matches) setMatches((prev) => mergeMatchesWithTimestamps(prev, payload.matches));
                if (payload.comments) setComments(payload.comments);
                if (payload.announcements) setAnnouncements(payload.announcements);
                if (payload.directMessages) setDirectMessages(payload.directMessages);
                if (payload.notifications) setNotifications(payload.notifications);
                break;
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch {
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const sendNotification = useCallback((notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: InAppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);

    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotif),
    }).catch(() => {});
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );

    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    }).catch(() => {});
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => n.userId !== currentUser.id));

    fetch('/api/notifications/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    }).catch(() => {});
  }, [currentUser.id]);

  // Auth Operations
  const loginWithCredentials = useCallback(async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان.' };
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);

    // 1. Locate user in local state or re-fetch from server if missing
    let targetUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      try {
        const res = await fetch('/api/sync/all');
        if (res.ok) {
          const cloudData = await res.json();
          if (cloudData.users) {
            setUsers(cloudData.users);
            targetUser = cloudData.users.find((u: any) => u.email.toLowerCase() === cleanEmail);
          }
        }
      } catch {}
    }

    if (!targetUser) {
      // If super admin email and clean fresh state with no custom password set yet
      if (isMustapha && verifySuperAdminMasterPassword(cleanPass)) {
        targetUser = {
          id: cleanEmail === 'bouhbousmustapha@gmail.com' ? 'user_mustapha' : `user_admin_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: cleanEmail,
          name: cleanEmail === 'bouhbousmustapha@gmail.com' ? 'Mustapha Bouhbous' : 'Mustapha (Super Admin)',
          avatarUrl: MESSI_AVATAR_URL,
          isAdmin: true,
          status: 'approved',
          matchesPlayed: 50,
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [targetUser!, ...prev.filter((u) => u.email.toLowerCase() !== cleanEmail)]);
      } else {
        return { success: false, error: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني. يرجى إنشاء حساب أولاً.' };
      }
    }

    if (targetUser.isBanned) {
      return { success: false, error: `الحساب موقوف: ${targetUser.banReason || 'تواصل مع إدارة المنصة'}` };
    }

    if (targetUser.status === 'pending' && !isMustapha) {
      return {
        success: false,
        error: 'حسابك في لائحة الانتظار قيد المراجعة من قِبل المشرف العام. يرجى الانتظار حتى يتم قبول طلبك.',
      };
    }

    if (targetUser.status === 'rejected' && !isMustapha) {
      return {
        success: false,
        error: 'تم رفض طلب التسجيل من قِبل إدارة المنصة.',
      };
    }

    if (targetUser.isGoogleAuth && !targetUser.passwordHash && !targetUser.password) {
      return {
        success: false,
        error: 'تم تسجيل هذا الحساب عبر Google. يرجى الضغط على "تسجيل الدخول عبر Google".',
      };
    }

    // STRICT SINGLE-PASSWORD AUTHENTICATION:
    // If user has a passwordHash (set at signup or after password reset), ONLY the current active password hash is valid!
    // The previous password, legacy plaintext passwords, or master passwords are NEVER accepted once a password is set.
    let isPasswordCorrect = false;

    if (targetUser.passwordHash && targetUser.passwordSalt) {
      isPasswordCorrect = await verifyPassword(
        cleanPass,
        targetUser.passwordHash,
        targetUser.passwordSalt
      );
    } else if (isMustapha && !targetUser.passwordHash && !targetUser.password) {
      // Only uninitialized super admin with zero custom passwords
      isPasswordCorrect = verifySuperAdminMasterPassword(cleanPass);
    } else if (targetUser.password) {
      // Legacy unhashed user
      isPasswordCorrect = cleanPass === targetUser.password;
    }

    if (!isPasswordCorrect) {
      return { success: false, error: 'كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.' };
    }

    if (isMustapha) {
      targetUser.isAdmin = true;
      targetUser.status = 'approved';
    }

    setCurrentUserId(targetUser.id);
    setIsAuthenticated(true);
    const token = `pitchmate_token_${targetUser.id}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, targetUser.id);

    // Synchronize user to Firebase Authentication in background
    (async () => {
      try {
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        } catch (fbLoginErr: any) {
          if (fbLoginErr?.code === 'auth/user-not-found') {
            await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
          }
        }
      } catch (e) {
        console.debug('Firebase Auth background sync note:', e);
      }
    })();

    return { success: true };
  }, [users]);

  // Send 6-Digit Email Verification Code (OTP) & Store in Firestore
  const sendVerificationOTP = useCallback(async (
    email: string,
    type: 'signup' | 'forgot_password' = 'signup'
  ): Promise<{ success: boolean; code?: string; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'الرجاء إدخال بريد إلكتروني صالح بالصيغة الصحيحة (مثال: name@domain.com).' };
    }

    // Proactive check: if signing up and account exists in system, block immediately
    if (type === 'signup') {
      const alreadyExists = users.some((u) => u.email.toLowerCase() === cleanEmail) || isSuperAdminEmail(cleanEmail);
      if (alreadyExists) {
        return {
          success: false,
          error: 'هذا البريد الإلكتروني مسجل به حساب بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة بدلاً من إنشاء حساب جديد.',
        };
      }
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, type }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'فشل في إرسال رمز التحقق.' };
      }

      const generatedCode = data.code;
      const expiresAt = data.expiresAt || (Date.now() + 10 * 60 * 1000);

      // Store in Firestore password_resets collection with expiration timestamp
      if (generatedCode) {
        await storePasswordResetOTPInFirestore(cleanEmail, generatedCode, expiresAt, type);
      }

      return { success: true, code: generatedCode };
    } catch (err) {
      console.warn('[PitchStore] Send OTP network error:', err);
      return { success: false, error: 'تعذر الاتصال بالخادم لإرسال رمز التحقق. يرجى المحاولة لاحقاً.' };
    }
  }, [users]);

  // Verify 6-Digit Email OTP (Backend + Firestore Verification)
  const verifyOTPCode = useCallback(async (
    email: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail || !cleanCode) {
      return { success: false, error: 'البريد الإلكتروني ورمز التحقق مطلوبان.' };
    }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true };
      }

      // Check Firestore as reliable fallback
      const firestoreCheck = await verifyPasswordResetOTPInFirestore(cleanEmail, cleanCode);
      if (firestoreCheck.valid) {
        return { success: true };
      }

      return { success: false, error: data.error || firestoreCheck.error || 'رمز التحقق غير صحيح أو انتهت صلاحيته.' };
    } catch {
      // Direct Firestore check
      const firestoreCheck = await verifyPasswordResetOTPInFirestore(cleanEmail, cleanCode);
      if (firestoreCheck.valid) {
        return { success: true };
      }
      return { success: false, error: firestoreCheck.error || 'تعذر التحقق من الرمز.' };
    }
  }, []);

  const signupWithCredentials = useCallback(async (
    name: string,
    email: string,
    pass: string,
    avatarUrl?: string,
    city?: string,
    preferredPosition?: string,
    otpCode?: string
  ): Promise<{ success: boolean; pendingApproval?: boolean; error?: string }> => {
    const cleanName = sanitizeInput(name);
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = pass.trim();
    const isMustapha = isSuperAdminEmail(cleanEmail);

    if (!cleanName || !cleanEmail || !cleanPass) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    if (cleanPass.length < 6) {
      return { success: false, error: 'يجب ألا تقل كلمة المرور عن 6 أحرف.' };
    }

    // Proactive client-side verification
    const alreadyExists = users.some((u) => u.email.toLowerCase() === cleanEmail) || isMustapha;
    if (alreadyExists) {
      return {
        success: false,
        error: 'هذا البريد الإلكتروني مسجل به حساب بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة بدلاً من إنشاء حساب جديد.',
      };
    }

    const salt = generateSalt();
    const hash = await hashPassword(cleanPass, salt);

    const finalAvatarUrl = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          passwordHash: hash,
          passwordSalt: salt,
          avatarUrl: finalAvatarUrl,
          city: city || 'Casablanca',
          preferredPosition: preferredPosition || 'MID',
          otpCode: otpCode || '',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to register account.' };
      }

      const data = await res.json();
      const newUser = data.user;
      const isPending = !isMustapha;

      setUsers((prev) => [...prev.filter((u) => u.id !== newUser.id), newUser]);
      saveUserToFirestore(newUser);
      if (otpCode) {
        await clearPasswordResetOTPInFirestore(cleanEmail);
      }

      // Synchronize / create user in official Google Firebase Authentication
      try {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: cleanName,
            photoURL: finalAvatarUrl,
          });
        }
      } catch (fbErr: any) {
        console.warn('Firebase Auth user creation note:', fbErr?.code, fbErr?.message);
      }

      if (isPending) {
        return { success: true, pendingApproval: true };
      }

      setCurrentUserId(newUser.id);
      setIsAuthenticated(true);
      const token = `pitchmate_token_${newUser.id}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
      return { success: true, pendingApproval: false };
    } catch {
      return { success: false, error: 'Network error occurred during registration.' };
    }
  }, [users]);

  const resetPasswordWithEmail = useCallback(async (
    email: string,
    newPass: string,
    otpCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = newPass.trim();

    if (!cleanEmail || !cleanPass) return { success: false, error: 'البريد الإلكتروني وكلمة المرور الجديدة مطلوبان.' };
    if (cleanPass.length < 6) return { success: false, error: 'يجب ألا تقل كلمة المرور عن 6 خانات.' };

    if (otpCode) {
      const verifyRes = await verifyOTPCode(cleanEmail, otpCode);
      if (!verifyRes.success) {
        return { success: false, error: verifyRes.error || 'رمز التحقق غير صحيح أو انتهت صلاحيته.' };
      }
    }

    const targetUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    const salt = generateSalt();
    const hash = await hashPassword(cleanPass, salt);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: otpCode || '',
          newPassword: cleanPass,
          passwordHash: hash,
          passwordSalt: salt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'تعذر تحديث كلمة المرور في الخادم.' };
      }

      // Build sanitized user object without any legacy plaintext password
      const updatedUser: UserProfile = targetUser
        ? { ...targetUser, passwordHash: hash, passwordSalt: salt }
        : {
            id: isSuperAdminEmail(cleanEmail) ? 'user_mustapha' : `user_${Date.now()}`,
            name: isSuperAdminEmail(cleanEmail) ? 'Mustapha Bouhbous' : cleanEmail.split('@')[0],
            email: cleanEmail,
            avatarUrl: isSuperAdminEmail(cleanEmail) ? MESSI_AVATAR_URL : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
            city: 'Casablanca',
            isAdmin: isSuperAdminEmail(cleanEmail),
            status: 'approved',
            matchesPlayed: 0,
            createdAt: new Date().toISOString(),
            passwordHash: hash,
            passwordSalt: salt,
          };

      delete (updatedUser as any).password;

      // Update Firestore user document
      await saveUserToFirestore(updatedUser);

      // Clear Firestore OTP if any
      await clearPasswordResetOTPInFirestore(cleanEmail);

      // Update local state and purge legacy plaintext password
      setUsers((prev) => {
        const exists = prev.some((u) => u.email.toLowerCase() === cleanEmail);
        let nextList: UserProfile[];
        if (exists) {
          nextList = prev.map((u) => {
            if (u.email.toLowerCase() === cleanEmail) {
              const uCopy = { ...u, passwordHash: hash, passwordSalt: salt };
              delete (uCopy as any).password;
              return uCopy;
            }
            return u;
          });
        } else {
          nextList = [updatedUser, ...prev];
        }
        scheduleStorageSave(STORAGE_KEYS.USERS, nextList);
        return nextList;
      });

      // Synchronize to Firebase Auth in background if session active
      (async () => {
        try {
          const { auth } = await import('./firebase');
          if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
            const { updatePassword } = await import('firebase/auth');
            await updatePassword(auth.currentUser, cleanPass);
          }
        } catch {}
      })();

      return { success: true };
    } catch (err) {
      console.error('Password reset network error:', err);
      // Fallback local update
      const updatedUser: UserProfile = targetUser
        ? { ...targetUser, passwordHash: hash, passwordSalt: salt }
        : {
            id: isSuperAdminEmail(cleanEmail) ? 'user_mustapha' : `user_${Date.now()}`,
            name: isSuperAdminEmail(cleanEmail) ? 'Mustapha Bouhbous' : cleanEmail.split('@')[0],
            email: cleanEmail,
            avatarUrl: isSuperAdminEmail(cleanEmail) ? MESSI_AVATAR_URL : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
            city: 'Casablanca',
            isAdmin: isSuperAdminEmail(cleanEmail),
            status: 'approved',
            matchesPlayed: 0,
            createdAt: new Date().toISOString(),
            passwordHash: hash,
            passwordSalt: salt,
          };
      delete (updatedUser as any).password;

      await saveUserToFirestore(updatedUser);
      await clearPasswordResetOTPInFirestore(cleanEmail);
      setUsers((prev) => {
        const nextList = prev.map((u) => {
          if (u.email.toLowerCase() === cleanEmail) {
            const uCopy = { ...u, passwordHash: hash, passwordSalt: salt };
            delete (uCopy as any).password;
            return uCopy;
          }
          return u;
        });
        scheduleStorageSave(STORAGE_KEYS.USERS, nextList);
        return nextList;
      });
      return { success: true };
    }
  }, [users, verifyOTPCode]);

  // Real Firebase Password Reset Email Trigger
  const sendFirebasePasswordReset = useCallback(async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'الرجاء إدخال بريد إلكتروني صالح.' };
    }

    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('./firebase');
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true };
    } catch (err: any) {
      console.error('Firebase sendPasswordResetEmail error:', err);
      let errorMessage = 'فشل في إرسال رابط استعادة كلمة المرور عبر Firebase.';
      if (err?.code === 'auth/user-not-found') {
        errorMessage = 'لا يوجد حساب مسجل بهذا البريد الإلكتروني في Firebase Authentication. يرجى التأكد من تسجيل الحساب أولاً.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        errorMessage = 'تسجيل الدخول بكلمة المرور غير مفعّل في Firebase Console. يرجى الدخول إلى Firebase Console -> Authentication -> Sign-in method وتفعيل Email/Password.';
      } else if (err?.code === 'auth/invalid-email') {
        errorMessage = 'صيغة البريد الإلكتروني غير صحيحة.';
      } else if (err?.code === 'auth/too-many-requests') {
        errorMessage = 'تم حظر الطلبات مؤقتاً لكثرة المحاولات. يرجى الانتظار والمحاولة لاحقاً.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      return { success: false, error: errorMessage };
    }
  }, []);

  // Verify Action Code from Email Reset Link
  const verifyFirebaseActionCode = useCallback(async (
    actionCode: string
  ): Promise<{ success: boolean; email?: string; error?: string }> => {
    if (!actionCode) {
      return { success: false, error: 'رمز التحقق مفقود.' };
    }
    try {
      const { verifyPasswordResetCode } = await import('firebase/auth');
      const { auth } = await import('./firebase');
      const email = await verifyPasswordResetCode(auth, actionCode);
      return { success: true, email };
    } catch (err: any) {
      console.error('Firebase verifyPasswordResetCode error:', err);
      return { success: false, error: 'رابط التحقق غير صالح أو انتهت صلاحيته.' };
    }
  }, []);

  // Confirm and Save New Password with Firebase Action Code
  const confirmFirebasePasswordResetAction = useCallback(async (
    actionCode: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPass = (newPass || '').trim();
    if (cleanPass.length < 6) {
      return { success: false, error: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' };
    }

    try {
      const { confirmPasswordReset, verifyPasswordResetCode } = await import('firebase/auth');
      const { auth } = await import('./firebase');
      
      let associatedEmail: string | undefined;
      try {
        associatedEmail = await verifyPasswordResetCode(auth, actionCode);
      } catch {
        // continue
      }

      await confirmPasswordReset(auth, actionCode, cleanPass);

      // Also sync user profile password in Firestore / local state if found
      if (associatedEmail) {
        const cleanEmail = associatedEmail.toLowerCase();
        const targetUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
        const salt = generateSalt();
        const hash = await hashPassword(cleanPass, salt);

        if (targetUser) {
          const updatedUsers = users.map((u) =>
            u.email.toLowerCase() === cleanEmail ? { ...u, passwordHash: hash, passwordSalt: salt } : u
          );
          setUsers(updatedUsers);

          fetch(`/api/users/${targetUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passwordHash: hash, passwordSalt: salt }),
          }).catch(() => {});
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Firebase confirmPasswordReset error:', err);
      let errorMessage = 'فشل في تحديث كلمة المرور.';
      if (err?.code === 'auth/expired-action-code') {
        errorMessage = 'انتهت صلاحية رابط استعادة كلمة المرور. يرجى طلب رابط جديد.';
      } else if (err?.code === 'auth/invalid-action-code') {
        errorMessage = 'رابط استعادة كلمة المرور غير صالح أو تم استخدامه مسبقاً.';
      } else if (err?.code === 'auth/weak-password') {
        errorMessage = 'كلمة المرور ضعيفة للغاية. يرجى إدخال كلمة مرور أكثر تعقيداً.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      return { success: false, error: errorMessage };
    }
  }, [users]);

  const loginWithGoogle = useCallback(async (
    action: 'signin' | 'signup' = 'signin'
  ): Promise<{
    success: boolean;
    pendingApproval?: boolean;
    user?: UserProfile;
    code?: string;
    error?: string;
  }> => {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const { auth } = await import('./firebase');

      // Configure Google Auth Provider
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      provider.addScope('profile');
      provider.addScope('email');

      let gUser;
      try {
        const result = await signInWithPopup(auth, provider);
        gUser = result.user;
      } catch (popupErr: any) {
        console.error('Firebase Google signInWithPopup error:', popupErr);

        if (
          popupErr.code === 'auth/popup-closed-by-user' ||
          popupErr.code === 'auth/cancelled-popup-request'
        ) {
          return {
            success: false,
            code: 'USER_CANCELLED',
          };
        }

        if (popupErr.code === 'auth/unauthorized-domain') {
          const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'domain';
          return {
            success: false,
            code: 'UNAUTHORIZED_DOMAIN',
            error: `النطاق (${currentHostname}) غير مضاف في قائمة النطاقات المصرح بها في Firebase Authentication Console. يرجى إضافته في إعدادات Firebase أو استخدام تسجيل الدخول بالبريد الإلكتروني.`,
          };
        }

        return {
          success: false,
          code: popupErr.code,
          error: popupErr.message || 'فشل الاتصال بخدمة Google.',
        };
      }

      const gEmail = (gUser.email || '').toLowerCase().trim();
      const gName = gUser.displayName || 'Google Player';
      const gPhoto = gUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(gName)}`;
      const gUid = gUser.uid;

      if (!gEmail) {
        return { success: false, error: 'Could not retrieve a valid email address from Google.' };
      }

      const isMustapha = isSuperAdminEmail(gEmail);
      const existingUser = users.find((u) => u.email.toLowerCase() === gEmail);

      // If user already exists:
      if (existingUser) {
        if (existingUser.isBanned) {
          return {
            success: false,
            error: `Account suspended: ${existingUser.banReason || 'Contact administrator'}`,
          };
        }

        if (existingUser.status === 'rejected') {
          return {
            success: false,
            error: 'Your registration was declined by the administrator.',
          };
        }

        if (existingUser.status === 'pending' && !isMustapha) {
          return {
            success: false,
            pendingApproval: true,
            user: existingUser,
            error: 'حسابك في لائحة الانتظار قيد المراجعة من قِبل المشرف العام. يرجى الانتظار حتى يتم قبول طلبك.',
          };
        }

        const updatedUser: UserProfile = {
          ...existingUser,
          isGoogleAuth: true,
          emailVerified: true,
          isAdmin: isMustapha,
          status: 'approved',
          avatarUrl: isMustapha ? MESSI_AVATAR_URL : ((!existingUser.avatarUrl || existingUser.avatarUrl.includes('dicebear')) ? gPhoto : existingUser.avatarUrl),
        };

        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        saveUserToFirestore(updatedUser);
        setCurrentUserId(updatedUser.id);
        setIsAuthenticated(true);
        const token = `pitchmate_token_${updatedUser.id}_${Date.now()}`;
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, updatedUser.id);
        return { success: true, pendingApproval: false, user: updatedUser };
      }

      // If user is brand new:
      const newGoogleUser: UserProfile = {
        id: isMustapha ? 'user_mustapha' : `user_g_${gUid}`,
        name: gName,
        email: gEmail,
        avatarUrl: isMustapha ? MESSI_AVATAR_URL : gPhoto,
        city: 'Casablanca',
        bio: 'Verified Google Player',
        preferredPosition: 'MID',
        skillRating: 4.5,
        reliabilityScore: 100,
        matchesAttended: 0,
        noShowCount: 0,
        mvpCount: 0,
        goalsCount: 0,
        badges: [
          { id: 'b_welcome', key: 'welcome', title: 'New PitchMate', description: 'Joined the community', icon: '⚽', unlockedAt: new Date().toISOString() },
          { id: 'b_verified', key: 'verified', title: 'Google Verified', description: 'Identity verified via Google', icon: '🔒', unlockedAt: new Date().toISOString() },
        ],
        isGoogleAuth: true,
        emailVerified: true,
        isAdmin: isMustapha,
        status: isMustapha ? 'approved' : 'pending',
        approvedAt: isMustapha ? new Date().toISOString() : undefined,
        matchesPlayed: 0,
        createdAt: new Date().toISOString(),
      };

      setUsers((prev) => [...prev, newGoogleUser]);
      saveUserToFirestore(newGoogleUser);

      fetch('/api/users/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: gUid,
          name: gName,
          email: gEmail,
          avatarUrl: newGoogleUser.avatarUrl,
          action: action,
        }),
      }).catch(() => {});

      if (!isMustapha) {
        return { success: true, pendingApproval: true, user: newGoogleUser };
      }

      setCurrentUserId(newGoogleUser.id);
      setIsAuthenticated(true);
      const token = `pitchmate_token_${newGoogleUser.id}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newGoogleUser.id);
      return { success: true, pendingApproval: false, user: newGoogleUser };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'تم إلغاء نافذة تسجيل الدخول بـ Google.' };
      }
      if (err.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'تم إلغاء طلب تسجيل الدخول.' };
      }
      return { success: false, error: err.message || 'حدث خطأ أثناء الاتصال بـ Google.' };
    }
  }, [users]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    setCurrentUserId('');
    setIsAuthenticated(false);
  }, []);

  // Match Operations - Instantaneous Optimistic Updates
  const joinMatch = useCallback(async (matchId: string, teamChoice: TeamSide = 'unassigned'): Promise<boolean> => {
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot join matches.');
      return false;
    }

    // Audio chime immediately
    SoundEffects.playJoin();

    const playerItem: PlayerRosterItem = {
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatarUrl: currentUser.avatarUrl,
      team: teamChoice,
      position: currentUser.preferredPosition || 'MID',
      rating: currentUser.skillRating || 4.5,
      reliabilityScore: currentUser.reliabilityScore ?? 100,
      joinedAt: new Date().toISOString(),
    };

    // Instant optimistic state update
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const alreadyInRoster = m.roster.some((p) => p.userId === currentUser.id);
        const alreadyInWaitlist = m.waitlist.some((p) => p.userId === currentUser.id);
        if (alreadyInRoster || alreadyInWaitlist) return m;

        const isFull = m.roster.length >= m.maxPlayers;
        const updatedMatch: SoccerMatch = isFull
          ? {
              ...m,
              waitlist: [...m.waitlist, playerItem],
              updatedAt: new Date().toISOString(),
            }
          : {
              ...m,
              roster: [...m.roster, playerItem],
              updatedAt: new Date().toISOString(),
            };

        // Realtime Firestore direct sync
        saveMatchToFirestore(updatedMatch);

        return updatedMatch;
      })
    );

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {}

    // Background server sync
    fetch(`/api/matches/${matchId}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ playerItem, teamChoice }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.match) {
            setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
            saveMatchToFirestore(data.match);
          }
        }
      })
      .catch(() => {});

    return true;
  }, [currentUser, getAuthHeaders]);

  const leaveMatch = useCallback(async (matchId: string): Promise<boolean> => {
    // Instant optimistic state update
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const inRoster = m.roster.some((p) => p.userId === currentUser.id);
        const inWaitlist = m.waitlist.some((p) => p.userId === currentUser.id);
        if (!inRoster && !inWaitlist) return m;

        let nextRoster = m.roster.filter((p) => p.userId !== currentUser.id);
        let nextWaitlist = m.waitlist.filter((p) => p.userId !== currentUser.id);

        if (inRoster && nextWaitlist.length > 0) {
          const promoted = { ...nextWaitlist[0], team: 'unassigned' as TeamSide };
          nextWaitlist = nextWaitlist.slice(1);
          nextRoster.push(promoted);
        }

        const nextAssignments = { ...(m.tacticalAssignments || {}) };
        Object.keys(nextAssignments).forEach((key) => {
          if (nextAssignments[key] === currentUser.id) delete nextAssignments[key];
        });

        const updatedMatch: SoccerMatch = {
          ...m,
          roster: nextRoster,
          waitlist: nextWaitlist,
          tacticalAssignments: nextAssignments,
          updatedAt: new Date().toISOString(),
        };

        // Realtime Firestore direct sync
        saveMatchToFirestore(updatedMatch);

        return updatedMatch;
      })
    );

    // Background server sync
    fetch(`/api/matches/${matchId}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId: currentUser.id }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.match) {
            setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
            saveMatchToFirestore(data.match);
          }
        }
      })
      .catch(() => {});

    return true;
  }, [currentUser.id, getAuthHeaders]);

  const createMatch = useCallback(async (
    matchData: Omit<SoccerMatch, 'id' | 'createdAt' | 'updatedAt' | 'roster' | 'waitlist' | 'creatorId' | 'creatorName' | 'creatorEmail' | 'isLocked' | 'status'>
  ): Promise<string> => {
    const newId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const hostPlayer: PlayerRosterItem = {
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatarUrl: currentUser.avatarUrl,
      team: 'green',
      position: currentUser.preferredPosition || 'MID',
      rating: currentUser.skillRating || 5.0,
      reliabilityScore: currentUser.reliabilityScore ?? 100,
      joinedAt: nowIso,
      isHost: true,
    };

    const numPrice = (matchData.pricePerPlayer !== undefined && matchData.pricePerPlayer !== null && !isNaN(Number(matchData.pricePerPlayer)))
      ? Number(matchData.pricePerPlayer)
      : 50;
    const numTotal = (matchData.totalPitchCost !== undefined && matchData.totalPitchCost !== null && !isNaN(Number(matchData.totalPitchCost)))
      ? Number(matchData.totalPitchCost)
      : numPrice * (matchData.maxPlayers || 14);

    const defaultFormation = getDefaultFormationForMatch(matchData.format, matchData.maxPlayers);

    const newMatch: SoccerMatch = {
      ...matchData,
      id: newId,
      currency: DEFAULT_CURRENCY,
      pricePerPlayer: numPrice,
      totalPitchCost: numTotal,
      formationGreen: matchData.formationGreen || defaultFormation,
      formationBlue: matchData.formationBlue || defaultFormation,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorEmail: currentUser.email,
      roster: [hostPlayer],
      waitlist: [],
      isLocked: false,
      status: 'upcoming',
      score: { green: 0, blue: 0 },
      goals: [],
      mvpVotes: {},
      paidPlayerIds: [currentUser.id],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Instant optimistic state update
    setMatches((prev) => [newMatch, ...prev]);

    // Realtime Firestore direct sync
    saveMatchToFirestore(newMatch);

    // Background server sync
    fetch('/api/matches', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newMatch),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.match) {
            setMatches((prev) => [data.match, ...prev.filter((m) => m.id !== newId)]);
            saveMatchToFirestore(data.match);
          }
        }
      })
      .catch(() => {});

    return newId;
  }, [currentUser, getAuthHeaders]);

  const updateMatch = useCallback(async (matchId: string, updates: Partial<SoccerMatch>): Promise<boolean> => {
    // Instant optimistic update
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const updated = { ...m, ...updates, updatedAt: new Date().toISOString() };
          saveMatchToFirestore(updated);
          return updated;
        }
        return m;
      })
    );

    // Background sync
    fetch(`/api/matches/${matchId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.match) {
            setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
            saveMatchToFirestore(data.match);
          }
        }
      })
      .catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const deleteMatch = useCallback(async (matchId: string): Promise<boolean> => {
    // Immediate optimistic state update
    setMatches((prev) => prev.filter((m) => m.id !== matchId));

    // Realtime Firestore direct deletion
    deleteMatchFromFirestore(matchId);

    fetch(`/api/matches/${matchId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const assignPlayerTeam = useCallback(async (matchId: string, userId: string, team: TeamSide): Promise<boolean> => {
    // Instant optimistic state update
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            roster: m.roster.map((p) => (p.userId === userId ? { ...p, team } : p)),
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    fetch(`/api/matches/${matchId}/assign-team`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, team }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const removePlayerFromMatch = useCallback(async (matchId: string, userId: string): Promise<boolean> => {
    // Immediate optimistic state update
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const newRoster = m.roster.filter((p) => p.userId !== userId);
          const newWaitlist = m.waitlist.filter((p) => p.userId !== userId);
          const newAssignments = { ...(m.tacticalAssignments || {}) };
          Object.keys(newAssignments).forEach((key) => {
            if (newAssignments[key] === userId) delete newAssignments[key];
          });
          return {
            ...m,
            roster: newRoster,
            waitlist: newWaitlist,
            tacticalAssignments: newAssignments,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    fetch(`/api/matches/${matchId}/remove-player`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const toggleMatchLock = useCallback(async (matchId: string): Promise<boolean> => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, isLocked: !m.isLocked, updatedAt: new Date().toISOString() } : m))
    );

    fetch(`/api/matches/${matchId}/toggle-lock`, { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
    return true;
  }, [getAuthHeaders]);

  const broadcastWaitlistAlert = useCallback(async (matchId: string): Promise<{ success: boolean; notifiedCount: number; openSpots: number }> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/broadcast-waitlist-alert`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        SoundEffects.playWhistle();
        return { success: true, notifiedCount: data.notifiedCount || 0, openSpots: data.openSpots || 0 };
      }
      return { success: false, notifiedCount: 0, openSpots: 0 };
    } catch {
      return { success: false, notifiedCount: 0, openSpots: 0 };
    }
  }, [getAuthHeaders]);

  const togglePlayerPaidStatus = useCallback(async (matchId: string, playerId: string): Promise<boolean> => {
    SoundEffects.playCashRegister();

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const currentPaid = m.paidPlayerIds || [];
          const isPaid = currentPaid.includes(playerId);
          const updatedPaid = isPaid ? currentPaid.filter((id) => id !== playerId) : [...currentPaid, playerId];
          return {
            ...m,
            paidPlayerIds: updatedPaid,
            roster: m.roster.map((p) => (p.userId === playerId ? { ...p, paymentStatus: isPaid ? 'unpaid' : 'paid' } : p)),
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    fetch(`/api/matches/${matchId}/toggle-paid`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ playerId }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const updatePlayerPaymentStatus = useCallback(async (
    matchId: string,
    playerId: string,
    status: 'paid' | 'pending' | 'unpaid' | 'waived',
    method?: 'cash' | 'cih_bank' | 'attijari' | 'wafacash' | 'other'
  ): Promise<boolean> => {
    if (status === 'paid') {
      SoundEffects.playCashRegister();
    }

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const currentPaid = m.paidPlayerIds || [];
          const isNowPaid = status === 'paid';
          const updatedPaid = isNowPaid
            ? currentPaid.includes(playerId)
              ? currentPaid
              : [...currentPaid, playerId]
            : currentPaid.filter((id) => id !== playerId);

          return {
            ...m,
            paidPlayerIds: updatedPaid,
            roster: m.roster.map((p) =>
              p.userId === playerId ? { ...p, paymentStatus: status, paymentMethod: method || p.paymentMethod } : p
            ),
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    fetch(`/api/matches/${matchId}/payment-status`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ playerId, status, method }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const updateMatchPitchCost = useCallback(async (matchId: string, totalCost: number, pricePerPlayer: number): Promise<boolean> => {
    const numTotal = !isNaN(Number(totalCost)) ? Number(totalCost) : 0;
    const numPrice = !isNaN(Number(pricePerPlayer)) ? Number(pricePerPlayer) : 0;

    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, totalPitchCost: numTotal, pricePerPlayer: numPrice, currency: DEFAULT_CURRENCY, updatedAt: new Date().toISOString() }
          : m
      )
    );

    fetch(`/api/matches/${matchId}/cost`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ totalCost: numTotal, pricePerPlayer: numPrice }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const autoBalanceTeams = useCallback(async (
    matchId: string,
    mode: 'balanced' | 'random' | 'veterans_vs_newcomers' = 'balanced'
  ): Promise<boolean> => {
    SoundEffects.playAutoBalance();

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId && m.roster.length > 0) {
          const balanceResult = balanceTeams(m.roster, mode);
          return {
            ...m,
            roster: balanceResult.roster,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    fetch(`/api/matches/${matchId}/auto-balance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mode }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const updateTacticalFormation = useCallback(async (
    matchId: string,
    formationGreen: string,
    formationBlue: string,
    tacticalAssignments: Record<string, string>
  ): Promise<boolean> => {
    SoundEffects.playTacticalSub();
    return updateMatch(matchId, { formationGreen, formationBlue, tacticalAssignments });
  }, [updateMatch]);

  const claimTacticalSlot = useCallback(async (
    matchId: string,
    slotKey: string,
    userId: string,
    rolePosition?: PlayerPosition,
    teamSide?: TeamSide
  ): Promise<{ success: boolean; error?: string }> => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return { success: false, error: 'Match not found' };

    // Concurrency Lock Check: Is slot already reserved by another player?
    const currentAssignments = { ...(match.tacticalAssignments || {}) };
    const existingOccupantId = currentAssignments[slotKey];
    if (existingOccupantId && existingOccupantId !== userId) {
      const occupant = match.roster.find((p) => p.userId === existingOccupantId) || users.find((u) => u.id === existingOccupantId);
      const occupantName = occupant ? occupant.name : 'another player';
      return {
        success: false,
        error: `This position is already locked and reserved for ${occupantName}.`,
      };
    }

    // Audio chime on successful selection
    SoundEffects.playJoin();

    // Prepare updated assignments: release user from previous slots and assign to this slot
    const nextAssignments = { ...currentAssignments };
    Object.keys(nextAssignments).forEach((k) => {
      if (nextAssignments[k] === userId) delete nextAssignments[k];
    });
    nextAssignments[slotKey] = userId;

    // Update roster item
    const playerInRoster = match.roster.find((p) => p.userId === userId);
    let nextRoster = [...match.roster];

    if (!playerInRoster) {
      const userProfile = users.find((u) => u.id === userId) || currentUser;
      const newPlayer: PlayerRosterItem = {
        userId,
        name: userProfile.name,
        email: userProfile.email,
        avatarUrl: userProfile.avatarUrl,
        team: teamSide || 'green',
        position: rolePosition || userProfile.preferredPosition || 'MID',
        tacticalSlot: slotKey,
        reliabilityScore: userProfile.reliabilityScore ?? 100,
        rating: userProfile.skillRating ?? 4.5,
        paymentStatus: 'unpaid',
        joinedAt: new Date().toISOString(),
      };
      nextRoster.push(newPlayer);
    } else {
      nextRoster = nextRoster.map((p) => {
        if (p.userId === userId) {
          return {
            ...p,
            team: teamSide || p.team,
            position: rolePosition || p.position,
            tacticalSlot: slotKey,
          };
        }
        if (p.tacticalSlot === slotKey) {
          return { ...p, tacticalSlot: undefined };
        }
        return p;
      });
    }

    const updatedMatch: SoccerMatch = {
      ...match,
      tacticalAssignments: nextAssignments,
      roster: nextRoster,
      updatedAt: new Date().toISOString(),
    };

    // Instant optimistic update
    setMatches((prev) => prev.map((m) => (m.id === matchId ? updatedMatch : m)));
    // Direct Realtime Firestore sync
    saveMatchToFirestore(updatedMatch);

    // Call server with atomic mutex concurrency protection
    try {
      const res = await fetch(`/api/matches/${matchId}/claim-slot`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ slotKey, userId, rolePosition, teamSide }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.match) {
          setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
          saveMatchToFirestore(data.match);
        }
        return { success: false, error: data.error || 'Position could not be claimed.' };
      }
      if (data.match) {
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        saveMatchToFirestore(data.match);
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  }, [matches, users, currentUser, getAuthHeaders]);

  const releaseTacticalSlot = useCallback(async (
    matchId: string,
    slotKey: string
  ): Promise<{ success: boolean; error?: string }> => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return { success: false, error: 'Match not found' };

    const nextAssignments = { ...(match.tacticalAssignments || {}) };
    delete nextAssignments[slotKey];

    const nextRoster = match.roster.map((p) =>
      p.tacticalSlot === slotKey ? { ...p, tacticalSlot: undefined } : p
    );

    const updatedMatch: SoccerMatch = {
      ...match,
      tacticalAssignments: nextAssignments,
      roster: nextRoster,
      updatedAt: new Date().toISOString(),
    };

    setMatches((prev) => prev.map((m) => (m.id === matchId ? updatedMatch : m)));
    saveMatchToFirestore(updatedMatch);

    try {
      const res = await fetch(`/api/matches/${matchId}/claim-slot`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ slotKey, userId: '' }),
      });
      const data = await res.json();
      if (data.match) {
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        saveMatchToFirestore(data.match);
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  }, [matches, getAuthHeaders]);

  const assignPlayerTacticalSlot = useCallback(async (
    matchId: string,
    slotKey: string,
    userId: string,
    rolePosition?: PlayerPosition
  ): Promise<boolean> => {
    if (userId) {
      const res = await claimTacticalSlot(matchId, slotKey, userId, rolePosition);
      return res.success;
    } else {
      const res = await releaseTacticalSlot(matchId, slotKey);
      return res.success;
    }
  }, [claimTacticalSlot, releaseTacticalSlot]);

  const markMatchAttendance = useCallback(async (
    matchId: string,
    attendedPlayerIds: string[],
    noShowPlayerIds: string[]
  ): Promise<boolean> => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              attendedPlayerIds,
              noShowPlayerIds,
              status: 'completed',
              updatedAt: new Date().toISOString(),
            }
          : m
      )
    );

    fetch(`/api/matches/${matchId}/attendance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ attendedPlayerIds, noShowPlayerIds }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  // Live Scoreboard & Goals
  const updateMatchScore = useCallback(async (matchId: string, green: number, blue: number): Promise<boolean> => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, score: { green, blue }, updatedAt: new Date().toISOString() } : m))
    );

    fetch(`/api/matches/${matchId}/score`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ green, blue }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const recordMatchGoal = useCallback(async (
    matchId: string,
    team: TeamSide,
    scorerId: string,
    scorerName: string,
    minute?: number,
    assistId?: string,
    assistName?: string
  ): Promise<boolean> => {
    SoundEffects.playGoal();

    const newGoal: MatchGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      team,
      scorerId,
      scorerName,
      assistId,
      assistName,
      minute: minute || 45,
      timestamp: new Date().toISOString(),
    };

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        const currentScore = m.score || { green: 0, blue: 0 };
        const updatedScore = {
          green: team === 'green' ? currentScore.green + 1 : currentScore.green,
          blue: team === 'blue' ? currentScore.blue + 1 : currentScore.blue,
        };
        return {
          ...m,
          score: updatedScore,
          goals: [...(m.goals || []), newGoal],
          updatedAt: new Date().toISOString(),
        };
      })
    );

    try {
      confetti({ particleCount: 45, spread: 70, origin: { y: 0.6 } });
    } catch {}

    fetch(`/api/matches/${matchId}/goal`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ team, scorerId, scorerName, minute, assistId, assistName }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const voteManOfTheMatch = useCallback(async (matchId: string, nomineeId: string): Promise<boolean> => {
    SoundEffects.playVictory();

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const currentVotes = { ...(m.mvpVotes || {}), [currentUser.id]: nomineeId };
          const tally: Record<string, number> = {};
          Object.values(currentVotes).forEach((id) => {
            tally[id] = (tally[id] || 0) + 1;
          });
          let maxV = 0;
          let leaderId = '';
          Object.entries(tally).forEach(([id, count]) => {
            if (count > maxV) {
              maxV = count;
              leaderId = id;
            }
          });
          const nomineeUser = users.find((u) => u.id === leaderId) || m.roster.find((p) => p.userId === leaderId);
          return {
            ...m,
            mvpVotes: currentVotes,
            motmVotes: currentVotes,
            mvpWinnerId: leaderId || undefined,
            mvpWinnerName: nomineeUser?.name || undefined,
            motmWinnerId: leaderId || undefined,
            motmWinnerName: nomineeUser?.name || undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    setUsers((prev) =>
      prev.map((u) => (u.id === nomineeId ? { ...u, mvpCount: (u.mvpCount || 0) + 1 } : u))
    );

    try {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
    } catch {}

    fetch(`/api/matches/${matchId}/vote-mvp`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nomineeId }),
    }).catch(() => {});

    return true;
  }, [currentUser.id, users, getAuthHeaders]);

  const voteMatchMvp = useCallback((matchId: string, nomineeId: string) => {
    return voteManOfTheMatch(matchId, nomineeId);
  }, [voteManOfTheMatch]);

  const recordMatchSubstitution = useCallback(async (
    matchId: string,
    team: TeamSide,
    playerOutId: string,
    playerOutName: string,
    playerInId: string,
    playerInName: string,
    minute: number
  ): Promise<boolean> => {
    SoundEffects.playTacticalSub();
    const subObj = {
      id: `sub_${Date.now()}`,
      minute,
      team,
      playerOutId,
      playerOutName,
      playerInId,
      playerInName,
      timestamp: new Date().toISOString(),
    };

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const existingSubs = m.substitutions || [];
          return {
            ...m,
            substitutions: [...existingSubs, subObj],
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );
    return true;
  }, []);

  const recordMatchCard = useCallback(async (
    matchId: string,
    team: TeamSide,
    playerId: string,
    playerName: string,
    type: 'yellow' | 'red',
    reason?: string,
    minute?: number
  ): Promise<boolean> => {
    SoundEffects.playCardWarning(type);
    const cardObj = {
      id: `card_${Date.now()}`,
      minute: minute || 45,
      team,
      playerId,
      playerName,
      type,
      reason,
    };

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const existingCards = m.cardEvents || [];
          return {
            ...m,
            cardEvents: [...existingCards, cardObj],
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );
    return true;
  }, []);

  const uploadPaymentProof = useCallback(async (
    matchId: string,
    playerId: string,
    playerName: string,
    amount: number,
    method: 'cih_bank' | 'attijari' | 'cash' | 'wafacash' | 'other',
    screenshotUrl?: string,
    note?: string
  ): Promise<boolean> => {
    const proofObj = {
      playerId,
      playerName,
      amount,
      method,
      screenshotUrl: screenshotUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      note: note || 'Transferred via CIH Mobile',
      uploadedAt: new Date().toISOString(),
      verified: true,
    };

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const proofs = { ...(m.paymentProofs || {}), [playerId]: proofObj };
          const currentPaid = m.paidPlayerIds || [];
          const updatedPaid = currentPaid.includes(playerId) ? currentPaid : [...currentPaid, playerId];
          return {
            ...m,
            paymentProofs: proofs,
            paidPlayerIds: updatedPaid,
            roster: m.roster.map((p) => (p.userId === playerId ? { ...p, paymentStatus: 'paid' as const } : p)),
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );
    return true;
  }, []);

  const updateMatchBankDetails = useCallback(async (
    matchId: string,
    bankDetails: { bankName: string; accountHolder: string; rib: string; phone?: string; notes?: string }
  ): Promise<boolean> => {
    return updateMatch(matchId, { bankDetails });
  }, [updateMatch]);

  const duplicateAsRecurringMatch = useCallback(async (matchId: string, daysAhead: number = 7): Promise<string | null> => {
    const parent = matches.find((m) => m.id === matchId);
    if (!parent) return null;

    const parentDate = new Date(parent.dateTime);
    const nextDate = new Date(parentDate.getTime() + daysAhead * 86400000);

    const newMatchId = await createMatch({
      title: parent.title,
      dateTime: nextDate.toISOString(),
      durationMinutes: parent.durationMinutes,
      location: parent.location,
      format: parent.format,
      maxPlayers: parent.maxPlayers,
      pricePerPlayer: parent.pricePerPlayer,
      currency: DEFAULT_CURRENCY,
      totalPitchCost: parent.totalPitchCost,
      notes: `Recurring Weekly Match (Morocco Time) - ${parent.notes || ''}`,
      recurrence: {
        isRecurring: true,
        frequency: 'weekly',
        dayOfWeek: nextDate.getDay(),
        parentSeriesId: parent.id,
      },
    });

    return newMatchId;
  }, [matches, createMatch]);

  // Comments
  const addComment = useCallback(async (matchId: string, text: string): Promise<boolean> => {
    const cleanText = sanitizeInput(text);
    if (!cleanText) return false;

    const newComment: MatchComment = {
      id: `comm_${Date.now()}`,
      matchId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatarUrl,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), newComment],
    }));

    // Realtime Firestore direct sync
    saveCommentToFirestore(newComment);

    fetch('/api/comments', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newComment),
    }).catch(() => {});

    return true;
  }, [currentUser, getAuthHeaders]);

  const addVoiceComment = useCallback(async (matchId: string, audioUrl: string, durationSeconds: number): Promise<boolean> => {
    const newComment: MatchComment = {
      id: `comm_voice_${Date.now()}`,
      matchId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatarUrl,
      audioUrl,
      audioDuration: durationSeconds,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), newComment],
    }));

    // Realtime Firestore direct sync
    saveCommentToFirestore(newComment);

    fetch('/api/comments', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newComment),
    }).catch(() => {});

    return true;
  }, [currentUser, getAuthHeaders]);

  const deleteComment = useCallback(async (matchId: string, commentId: string): Promise<boolean> => {
    setComments((prev) => ({
      ...prev,
      [matchId]: (prev[matchId] || []).filter((c) => c.id !== commentId),
    }));

    // Realtime Firestore direct deletion
    deleteCommentFromFirestore(commentId);

    fetch(`/api/comments/${matchId}/${commentId}`, { method: 'DELETE', headers: getAuthHeaders() }).catch(() => {});
    return true;
  }, [getAuthHeaders]);

  // Direct Messages
  const sendDirectMessage = useCallback(async (receiverId: string, text: string, imageUrl?: string): Promise<boolean> => {
    const cleanText = sanitizeInput(text);
    if (!cleanText && !imageUrl) return false;

    const newMsg: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      receiverId,
      text: cleanText,
      imageUrl,
      createdAt: new Date().toISOString(),
      read: false,
    };

    SoundEffects.playSentSound();
    setDirectMessages((prev) => [...prev, newMsg]);

    // Realtime Firestore direct sync
    saveDirectMessageToFirestore(newMsg);

    fetch('/api/messages', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newMsg),
    }).catch(() => {});

    return true;
  }, [currentUser, getAuthHeaders]);

  const sendDirectVoiceMessage = useCallback(async (
    receiverId: string,
    audioUrl: string,
    durationSeconds: number
  ): Promise<boolean> => {
    const newMsg: DirectMessage = {
      id: `dm_voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      receiverId,
      text: `🎤 Voice note (${Math.round(durationSeconds)}s)`,
      audioUrl,
      audioDuration: durationSeconds,
      createdAt: new Date().toISOString(),
      read: false,
    };

    SoundEffects.playSentSound();
    setDirectMessages((prev) => [...prev, newMsg]);

    // Realtime Firestore direct sync
    saveDirectMessageToFirestore(newMsg);

    fetch('/api/messages', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newMsg),
    }).catch(() => {});

    return true;
  }, [currentUser, getAuthHeaders]);

  const markConversationAsRead = useCallback((otherUserId: string) => {
    setDirectMessages((prev) =>
      prev.map((m) => {
        if (m.senderId === otherUserId && m.receiverId === currentUser.id) {
          const updated = { ...m, read: true };
          saveDirectMessageToFirestore(updated);
          return updated;
        }
        return m;
      })
    );

    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ otherUserId }),
    }).catch(() => {});
  }, [currentUser.id, getAuthHeaders]);

  const deleteDirectMessage = useCallback((messageId: string) => {
    setDirectMessages((prev) => prev.filter((m) => m.id !== messageId));
    deleteDirectMessageFromFirestore(messageId);
    fetch(`/api/messages/${messageId}`, { method: 'DELETE', headers: getAuthHeaders() }).catch(() => {});
  }, [getAuthHeaders]);

  // User Profile Updates
  const setCurrentUserById = useCallback((userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(found.id);
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, found.id);
    }
  }, [users]);

  const authenticateSuperAdmin = useCallback((password: string): boolean => {
    if (verifySuperAdminMasterPassword(password)) {
      let mustapha = users.find((u) => isSuperAdminEmail(u.email));
      if (!mustapha) {
        mustapha = {
          id: 'user_mustapha',
          email: SUPER_ADMIN_EMAIL,
          name: 'Mustapha Bouhbous',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isAdmin: true,
          status: 'approved',
          matchesPlayed: 50,
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [mustapha!, ...prev.filter((u) => !isSuperAdminEmail(u.email))]);
      }
      setCurrentUserId(mustapha.id);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, [users]);

  const updateUserProfile = useCallback(async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...updates, isAdmin: isSuperAdminEmail(u.email) };
          saveUserToFirestore(updated);
          return updated;
        }
        return u;
      })
    );

    fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const createNewUserAccount = useCallback((name: string, email: string): UserProfile => {
    const isMustapha = isSuperAdminEmail(email);
    const newUser: UserProfile = {
      id: `user_${Date.now()}`,
      name,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      isAdmin: isMustapha,
      status: isMustapha ? 'approved' : 'pending',
      matchesPlayed: 0,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    saveUserToFirestore(newUser);
    return newUser;
  }, []);

  const approveUser = useCallback(async (userId: string): Promise<boolean> => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, status: 'approved' as const, approvedAt: new Date().toISOString() };
          saveUserToFirestore(updated);
          return updated;
        }
        return u;
      })
    );

    fetch('/api/users/approve', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, adminName: currentUser.name }),
    }).catch(() => {});

    return true;
  }, [currentUser.name, getAuthHeaders]);

  const rejectUser = useCallback(async (userId: string, reason: string = 'Declined by admin'): Promise<boolean> => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, status: 'rejected' as const };
          saveUserToFirestore(updated);
          return updated;
        }
        return u;
      })
    );

    fetch('/api/users/reject', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, reason }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const approveAllPendingUsers = useCallback(async (): Promise<boolean> => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.status === 'pending') {
          const updated = { ...u, status: 'approved' as const, approvedAt: new Date().toISOString() };
          saveUserToFirestore(updated);
          return updated;
        }
        return u;
      })
    );

    fetch('/api/users/approve-all', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ adminName: currentUser.name }),
    }).catch(() => {});

    return true;
  }, [currentUser.name, getAuthHeaders]);

  const banUser = useCallback(async (userId: string, reason: string = 'Violation of rules'): Promise<boolean> => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, isBanned: true, banReason: reason };
          saveUserToFirestore(updated);
          return updated;
        }
        return u;
      })
    );

    fetch('/api/users/ban', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, reason }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const unbanUser = useCallback(async (userId: string): Promise<boolean> => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, isBanned: false, banReason: undefined };
          saveUserToFirestore(updated);
          return updated;
        }
        return u;
      })
    );

    fetch('/api/users/unban', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    }).catch(() => {});

    return true;
  }, [getAuthHeaders]);

  const removeUserAccount = useCallback(async (userId: string): Promise<boolean> => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteUserFromFirestore(userId);
    fetch(`/api/users/${userId}`, { method: 'DELETE', headers: getAuthHeaders() }).catch(() => {});
    return true;
  }, [getAuthHeaders]);

  const createAnnouncement = useCallback(async (title: string, message: string, type: AdminAnnouncement['type']): Promise<boolean> => {
    const newAnn: AdminAnnouncement = {
      id: `ann_${Date.now()}`,
      title,
      message,
      createdAt: new Date().toISOString(),
      authorName: currentUser.name,
      type,
    };

    setAnnouncements((prev) => [newAnn, ...prev]);
    saveAnnouncementToFirestore(newAnn);

    fetch('/api/announcements', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newAnn),
    }).catch(() => {});

    return true;
  }, [currentUser.name, getAuthHeaders]);

  const deleteAnnouncement = useCallback(async (id: string): Promise<boolean> => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    deleteAnnouncementFromFirestore(id);
    fetch(`/api/announcements/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).catch(() => {});
    return true;
  }, [getAuthHeaders]);

  const resetToDefaultData = useCallback(() => {
    fetch('/api/reset-data', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
    setMatches(INITIAL_MATCHES);
    setUsers(INITIAL_USERS);
    setDirectMessages([]);
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    setCurrentUserId('');
    setIsAuthenticated(false);
  }, [getAuthHeaders]);

  const contextValue = useMemo<PitchStoreContextType>(() => ({
    matches,
    users,
    currentUser,
    isAuthenticated,
    comments,
    announcements,
    directMessages,
    unreadMessagesCount,
    notifications,
    unreadNotificationsCount,
    isLoading,
    loginWithCredentials,
    sendVerificationOTP,
    verifyOTPCode,
    signupWithCredentials,
    loginWithGoogle,
    resetPasswordWithEmail,
    sendFirebasePasswordReset,
    verifyFirebaseActionCode,
    confirmFirebasePasswordResetAction,
    logout,
    joinMatch,
    leaveMatch,
    createMatch,
    updateMatch,
    deleteMatch,
    assignPlayerTeam,
    removePlayerFromMatch,
    toggleMatchLock,
    broadcastWaitlistAlert,
    togglePlayerPaidStatus,
    updatePlayerPaymentStatus,
    updateMatchPitchCost,
    autoBalanceTeams,
    updateTacticalFormation,
    assignPlayerTacticalSlot,
    claimTacticalSlot,
    releaseTacticalSlot,
    markMatchAttendance,
    updateMatchScore,
    recordMatchGoal,
    recordMatchSubstitution,
    recordMatchCard,
    voteMatchMvp,
    voteManOfTheMatch,
    uploadPaymentProof,
    updateMatchBankDetails,
    duplicateAsRecurringMatch,
    addComment,
    addVoiceComment,
    deleteComment,
    setCurrentUserById,
    authenticateSuperAdmin,
    updateUserProfile,
    createNewUserAccount,
    approveUser,
    rejectUser,
    approveAllPendingUsers,
    banUser,
    unbanUser,
    removeUserAccount,
    deleteUserAccount: removeUserAccount,
    createAnnouncement,
    deleteAnnouncement,
    sendDirectMessage,
    sendDirectVoiceMessage,
    markConversationAsRead,
    deleteDirectMessage,
    markNotificationAsRead,
    clearAllNotifications,
    sendNotification,
    resetToDefaultData,
  }), [
    matches,
    users,
    currentUser,
    isAuthenticated,
    comments,
    announcements,
    directMessages,
    unreadMessagesCount,
    notifications,
    unreadNotificationsCount,
    isLoading,
    loginWithCredentials,
    sendVerificationOTP,
    verifyOTPCode,
    signupWithCredentials,
    loginWithGoogle,
    resetPasswordWithEmail,
    sendFirebasePasswordReset,
    verifyFirebaseActionCode,
    confirmFirebasePasswordResetAction,
    logout,
    joinMatch,
    leaveMatch,
    createMatch,
    updateMatch,
    deleteMatch,
    assignPlayerTeam,
    removePlayerFromMatch,
    toggleMatchLock,
    broadcastWaitlistAlert,
    togglePlayerPaidStatus,
    updatePlayerPaymentStatus,
    updateMatchPitchCost,
    autoBalanceTeams,
    updateTacticalFormation,
    assignPlayerTacticalSlot,
    claimTacticalSlot,
    releaseTacticalSlot,
    markMatchAttendance,
    updateMatchScore,
    recordMatchGoal,
    recordMatchSubstitution,
    recordMatchCard,
    voteMatchMvp,
    voteManOfTheMatch,
    uploadPaymentProof,
    updateMatchBankDetails,
    duplicateAsRecurringMatch,
    addComment,
    addVoiceComment,
    deleteComment,
    setCurrentUserById,
    authenticateSuperAdmin,
    updateUserProfile,
    createNewUserAccount,
    approveUser,
    rejectUser,
    approveAllPendingUsers,
    banUser,
    unbanUser,
    removeUserAccount,
    createAnnouncement,
    deleteAnnouncement,
    sendDirectMessage,
    sendDirectVoiceMessage,
    markConversationAsRead,
    deleteDirectMessage,
    markNotificationAsRead,
    clearAllNotifications,
    sendNotification,
    resetToDefaultData,
  ]);

  return (
    <PitchStoreContext.Provider value={contextValue}>
      {children}
    </PitchStoreContext.Provider>
  );
};

export const usePitchStore = () => {
  const context = useContext(PitchStoreContext);
  if (!context) {
    throw new Error('usePitchStore must be used within a PitchStoreProvider');
  }
  return context;
};
