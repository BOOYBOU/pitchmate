import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  SoccerMatch,
  UserProfile,
  PlayerRosterItem,
  MatchComment,
  AdminAnnouncement,
  DirectMessage,
  TeamSide,
  InAppNotification,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  isSuperAdminEmail,
  verifySuperAdminMasterPassword,
} from '../types';
import { INITIAL_MATCHES, INITIAL_USERS, INITIAL_DIRECT_MESSAGES, INITIAL_NOTIFICATIONS } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase';
import { SoundEffects } from './audioService';
import { hashPassword, verifyPassword, generateSalt, sanitizeInput } from './security';
import { mediaStorage } from './mediaStorage';

const STORAGE_KEYS = {
  MATCHES: 'pitchmate_matches_v1',
  USERS: 'pitchmate_users_v1',
  CURRENT_USER_ID: 'pitchmate_current_user_id_v1',
  AUTH_TOKEN: 'pitchmate_auth_token_v1',
  COMMENTS: 'pitchmate_comments_v1',
  ANNOUNCEMENTS: 'pitchmate_announcements_v1',
  DIRECT_MESSAGES: 'pitchmate_direct_messages_v1',
  NOTIFICATIONS: 'pitchmate_notifications_v1',
};

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
  isSupabaseLive: boolean;
  isLoading: boolean;

  // Authentication Actions
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signupWithCredentials: (
    name: string,
    email: string,
    password: string,
    avatarUrl?: string
  ) => Promise<{ success: boolean; pendingApproval?: boolean; error?: string }>;
  resetPasswordWithEmail: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
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
  togglePlayerPaidStatus: (matchId: string, playerId: string) => Promise<boolean>;
  updateMatchPitchCost: (matchId: string, totalCost: number, pricePerPlayer: number) => Promise<boolean>;
  autoBalanceTeams: (matchId: string) => Promise<boolean>;
  updateTacticalFormation: (
    matchId: string,
    formationGreen: string,
    formationBlue: string,
    tacticalAssignments: Record<string, string>
  ) => Promise<boolean>;
  markMatchAttendance: (
    matchId: string,
    attendedPlayerIds: string[],
    noShowPlayerIds: string[]
  ) => Promise<boolean>;

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

const broadcastChannel = typeof window !== 'undefined' ? new BroadcastChannel('pitchmate_realtime_sync') : null;

export const PitchStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      const parsed: UserProfile[] = saved ? JSON.parse(saved) : INITIAL_USERS;
      return parsed.map((u) => ({
        ...u,
        isAdmin: isSuperAdminEmail(u.email) || u.isAdmin === true,
        status: (isSuperAdminEmail(u.email) || u.isAdmin === true) ? ('approved' as const) : (u.status || 'approved'),
      }));
    } catch {
      return INITIAL_USERS.map((u) => ({
        ...u,
        isAdmin: isSuperAdminEmail(u.email) || u.isAdmin === true,
        status: 'approved' as const,
      }));
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      return saved || 'user_mustapha';
    } catch {
      return 'user_mustapha';
    }
  });

  // Strict Authentication Gate: defaults to false if no token is saved or if user is unapproved/banned
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return false;
      const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (!savedUserId) return false;
      const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      const userList: UserProfile[] = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
      const found = userList.find((u) => u.id === savedUserId);
      if (!found || found.isBanned || found.status === 'pending' || found.status === 'rejected') {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        return false;
      }
      return true;
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
          totalPitchCost: m.totalPitchCost ?? (m.pricePerPlayer * (m.roster?.length || m.maxPlayers || 10)),
          paidPlayerIds: m.paidPlayerIds ?? [m.creatorId],
        }));
      }
      return INITIAL_MATCHES.map((m) => ({
        ...m,
        totalPitchCost: m.pricePerPlayer * (m.roster?.length || 10),
        paidPlayerIds: m.roster?.slice(0, 2).map((p) => p.userId) || [m.creatorId],
      }));
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
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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

  const [isLoading, setIsLoading] = useState(false);
  const [isSupabaseLive, setIsSupabaseLive] = useState(isSupabaseConfigured);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [matches]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [comments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [announcements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DIRECT_MESSAGES, JSON.stringify(directMessages));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [directMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  }, [notifications]);

  // Current User Object
  const currentUser: UserProfile = users.find((u) => u.id === currentUserId) || {
    id: 'user_admin_main',
    email: 'topreviewsamazon2025@gmail.com',
    name: 'Mustapha Bouhbous',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isAdmin: true,
    status: 'approved',
    matchesPlayed: 50,
    createdAt: new Date().toISOString(),
  };

  // Direct message unread count
  const unreadMessagesCount = directMessages.filter(
    (m) => m.receiverId === currentUser.id && !m.read
  ).length;

  // Unread notifications count
  const unreadNotificationsCount = notifications.filter(
    (n) => n.userId === currentUser.id && !n.read
  ).length;

  // Real-time broadcast sync helper (Tab-to-tab)
  const broadcastChange = useCallback((type: string, payload: any) => {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type, payload, senderId: currentUserId });
      } catch (err) {
        console.warn('Broadcast sync error:', err);
      }
    }
  }, [currentUserId]);

  // Auth Header Generation Helper
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || `pitchmate_token_${currentUserId}_${Date.now()}`;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-id': currentUserId,
      'x-user-email': currentUser.email,
    };
  }, [currentUserId, currentUser.email]);

  // =========================================================
  // UNIVERSAL BACKEND REAL-TIME SYNC (Server-Sent Events & Polling)
  // =========================================================
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
    } catch (err) {
      // Backend not available in isolated client mode, fallback silently
    }
  }, []);

  // Fetch initial global state on mount and on window focus
  useEffect(() => {
    fetchGlobalState();

    const handleFocus = () => fetchGlobalState();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGlobalState]);

  // Setup Server-Sent Events (SSE) for Real-Time Cross-Device Synchronization
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/sync/events');

        eventSource.onopen = () => {
          // Connected to live server push stream
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const { type, payload } = parsed;

            switch (type) {
              case 'SYNC_USERS':
                if (payload) setUsers(payload);
                break;
              case 'SYNC_MATCHES':
                if (payload) setMatches(payload);
                break;
              case 'SYNC_COMMENTS':
                if (payload) setComments(payload);
                break;
              case 'SYNC_ANNOUNCEMENTS':
                if (payload) setAnnouncements(payload);
                break;
              case 'SYNC_DIRECT_MESSAGES':
                if (payload) setDirectMessages(payload);
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
                if (payload.matches) setMatches(payload.matches);
                if (payload.comments) setComments(payload.comments);
                if (payload.announcements) setAnnouncements(payload.announcements);
                if (payload.directMessages) setDirectMessages(payload.directMessages);
                if (payload.notifications) setNotifications(payload.notifications);
                break;
            }
          } catch (e) {
            console.error('SSE Message parsing error:', e);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Retry connection in 3 seconds
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    // Background heartbeat sync fallback every 4 seconds to guarantee consistency across external phones/browsers
    const interval = setInterval(() => {
      fetchGlobalState();
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [fetchGlobalState]);

  // Broadcast channel listener (for intra-browser tabs)
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload, senderId } = event.data || {};
      if (senderId === currentUserId && !type.startsWith('CALL_')) return;

      switch (type) {
        case 'SYNC_MATCHES':
          setMatches(payload);
          break;
        case 'SYNC_USERS':
          setUsers(payload);
          break;
        case 'SYNC_COMMENTS':
          setComments(payload);
          break;
        case 'SYNC_ANNOUNCEMENTS':
          setAnnouncements(payload);
          break;
        case 'SYNC_DIRECT_MESSAGES':
          setDirectMessages(payload);
          break;
        case 'SYNC_NOTIFICATIONS':
          setNotifications(payload);
          break;
      }
    };

    broadcastChannel.addEventListener('message', handleMessage);
    return () => {
      broadcastChannel.removeEventListener('message', handleMessage);
    };
  }, [currentUserId]);

  // Helper to send internal notifications
  const sendNotification = useCallback((notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: InAppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev.slice(0, 49)];
      broadcastChange('SYNC_NOTIFICATIONS', updated);
      return updated;
    });

    // Push to backend
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotif),
    }).catch(() => {});
  }, [broadcastChange]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      broadcastChange('SYNC_NOTIFICATIONS', updated);
      return updated;
    });

    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    }).catch(() => {});
  }, [broadcastChange]);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.userId !== currentUser.id);
      broadcastChange('SYNC_NOTIFICATIONS', updated);
      return updated;
    });

    fetch('/api/notifications/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    }).catch(() => {});
  }, [currentUser.id, broadcastChange]);

  // ==========================================
  // AUTHENTICATION: SECURE HASHING & GLOBAL APPROVALS
  // ==========================================
  const loginWithCredentials = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Email and password are required.' };
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);

    // Super Admin Mustapha Master Login
    if (isMustapha) {
      if (!verifySuperAdminMasterPassword(cleanPass)) {
        return { success: false, error: 'Invalid Super Admin master password.' };
      }
      let mustapha = users.find((u) => isSuperAdminEmail(u.email));
      if (!mustapha) {
        mustapha = {
          id: 'user_mustapha',
          email: SUPER_ADMIN_EMAIL,
          name: 'Mustapha Bouhbous',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isAdmin: true,
          status: 'approved',
          matchesPlayed: 48,
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [mustapha!, ...prev.filter((u) => !isSuperAdminEmail(u.email))]);
      }
      setCurrentUserId(mustapha.id);
      setIsAuthenticated(true);
      const token = `pitchmate_token_${mustapha.id}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, mustapha.id);
      return { success: true };
    }

    // Refresh state from backend before validating to ensure freshest status
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const state = await res.json();
        if (state.users && Array.isArray(state.users)) {
          setUsers(state.users);
        }
      }
    } catch {}

    // Regular user login
    const targetUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return { success: false, error: 'No account found with this email. Please sign up first.' };
    }

    if (targetUser.isBanned) {
      return { success: false, error: `Account suspended: ${targetUser.banReason || 'Contact administrator'}` };
    }

    // Check Approval Status
    if (targetUser.status === 'pending') {
      return {
        success: false,
        error: 'Your account is pending review. The Admin must approve your registration before you can sign in.',
      };
    }

    if (targetUser.status === 'rejected') {
      return {
        success: false,
        error: 'Your registration was declined by the administrator.',
      };
    }

    // Secure Verification: Hash and Salt
    const isPasswordCorrect = await verifyPassword(
      cleanPass,
      targetUser.passwordHash,
      targetUser.passwordSalt,
      targetUser.password
    );

    if (!isPasswordCorrect) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    setCurrentUserId(targetUser.id);
    setIsAuthenticated(true);
    const token = `pitchmate_token_${targetUser.id}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, targetUser.id);
    return { success: true };
  };

  const signupWithCredentials = async (
    name: string,
    email: string,
    pass: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; pendingApproval?: boolean; error?: string }> => {
    const cleanName = sanitizeInput(name);
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    if (cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);
    if (isMustapha) {
      if (!verifySuperAdminMasterPassword(cleanPass)) {
        return { success: false, error: 'Super Admin registration requires the verified Master Password.' };
      }
    }

    // Compute cryptographic salt and SHA-256 hash
    const salt = generateSalt();
    const hash = await hashPassword(cleanPass, salt);

    let finalAvatarUrl = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;
    const userId = isMustapha ? 'user_mustapha' : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (avatarUrl && avatarUrl.startsWith('data:')) {
      finalAvatarUrl = await mediaStorage.saveAvatar(userId, avatarUrl);
    }

    // Submit to Universal Backend API for Global Admin Approval Synchronization
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
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to register account on server.' };
      }

      const data = await res.json();
      const newUser = data.user;

      setUsers((prev) => {
        const updated = [...prev.filter((u) => u.id !== newUser.id), newUser];
        broadcastChange('SYNC_USERS', updated);
        return updated;
      });

      if (isMustapha) {
        setCurrentUserId(newUser.id);
        setIsAuthenticated(true);
        const token = `pitchmate_token_${newUser.id}_${Date.now()}`;
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
        return { success: true, pendingApproval: false };
      }

      // Regular users: Require Admin approval. DO NOT log them in.
      return { success: true, pendingApproval: true };
    } catch (err) {
      // Fallback local registration if network is offline
      const newUser: UserProfile = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        avatarUrl: finalAvatarUrl,
        passwordHash: hash,
        passwordSalt: salt,
        isAdmin: isMustapha,
        status: isMustapha ? 'approved' : 'pending',
        approvedAt: isMustapha ? new Date().toISOString() : undefined,
        matchesPlayed: 0,
        createdAt: new Date().toISOString(),
      };

      setUsers((prev) => {
        const updated = [...prev, newUser];
        broadcastChange('SYNC_USERS', updated);
        return updated;
      });

      if (isMustapha) {
        setCurrentUserId(newUser.id);
        setIsAuthenticated(true);
        return { success: true, pendingApproval: false };
      }

      sendNotification({
        userId: 'user_mustapha',
        title: 'New Player Registration Pending',
        message: `${cleanName} (${cleanEmail}) registered and is awaiting your review in Admin Panel.`,
        type: 'approval',
      });

      return { success: true, pendingApproval: true };
    }
  };

  const resetPasswordWithEmail = async (
    email: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = newPass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Email and new password are required.' };
    }

    if (cleanPass.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    const targetUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return { success: false, error: 'No account found with this email address.' };
    }

    if (targetUser.isBanned) {
      return { success: false, error: `Cannot recover account: ${targetUser.banReason || 'Account is suspended'}.` };
    }

    const salt = generateSalt();
    const hash = await hashPassword(cleanPass, salt);

    // Update user's password hash
    const updatedUsers = users.map((u) =>
      u.email.toLowerCase() === cleanEmail
        ? { ...u, passwordHash: hash, passwordSalt: salt, password: undefined }
        : u
    );

    setUsers(updatedUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    broadcastChange('SYNC_USERS', updatedUsers);

    // Update on server
    fetch(`/api/users/${targetUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordHash: hash, passwordSalt: salt }),
    }).catch(() => {});

    if (targetUser.status === 'pending') {
      return {
        success: false,
        error: 'Password updated. However, your account is still awaiting Admin approval before you can sign in.',
      };
    }

    if (targetUser.status === 'rejected') {
      return {
        success: false,
        error: 'Your registration was declined. Please contact the administrator.',
      };
    }

    // Auto authenticate into the recovered approved account
    setCurrentUserId(targetUser.id);
    setIsAuthenticated(true);
    const token = `pitchmate_token_${targetUser.id}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, targetUser.id);

    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setIsAuthenticated(false);
  };

  // ==========================================
  // MATCH MANAGEMENT & FULL ADMIN CONTROL
  // ==========================================
  const joinMatch = async (matchId: string, teamChoice: TeamSide = 'unassigned'): Promise<boolean> => {
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot join matches.');
      return false;
    }

    const chosenTeam = teamChoice;
    const playerItem: PlayerRosterItem = {
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatarUrl: currentUser.avatarUrl,
      team: chosenTeam,
      joinedAt: new Date().toISOString(),
    };

    // Call server backend
    try {
      const res = await fetch(`/api/matches/${matchId}/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ playerItem, teamChoice }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        } catch {}
        return true;
      }
    } catch {}

    // Fallback local update
    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const target = prev[matchIndex];
      const isAlreadyInRoster = target.roster.some((p) => p.userId === currentUser.id);
      const isAlreadyInWaitlist = target.waitlist.some((p) => p.userId === currentUser.id);
      if (isAlreadyInRoster || isAlreadyInWaitlist) return prev;

      let finalTeam = teamChoice;
      if (finalTeam === 'unassigned') {
        const greenCount = target.roster.filter((p) => p.team === 'green').length;
        const blueCount = target.roster.filter((p) => p.team === 'blue').length;
        finalTeam = greenCount <= blueCount ? 'green' : 'blue';
      }

      const pItem = { ...playerItem, team: finalTeam };
      const updated = [...prev];
      if (target.roster.length < target.maxPlayers) {
        updated[matchIndex] = {
          ...target,
          roster: [...target.roster, pItem],
          updatedAt: new Date().toISOString(),
        };
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        } catch {}
      } else {
        updated[matchIndex] = {
          ...target,
          waitlist: [...target.waitlist, pItem],
          updatedAt: new Date().toISOString(),
        };
      }
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  const leaveMatch = async (matchId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/leave`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}

    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const target = prev[matchIndex];
      let updatedRoster = target.roster.filter((p) => p.userId !== currentUser.id);
      let updatedWaitlist = target.waitlist.filter((p) => p.userId !== currentUser.id);

      if (updatedWaitlist.length > 0 && updatedRoster.length < target.maxPlayers) {
        const promoted = updatedWaitlist.shift();
        if (promoted) {
          const greenCount = updatedRoster.filter((p) => p.team === 'green').length;
          const blueCount = updatedRoster.filter((p) => p.team === 'blue').length;
          promoted.team = greenCount <= blueCount ? 'green' : 'blue';
          updatedRoster.push(promoted);
        }
      }

      const updated = [...prev];
      updated[matchIndex] = {
        ...target,
        roster: updatedRoster,
        waitlist: updatedWaitlist,
        paidPlayerIds: (target.paidPlayerIds || []).filter((id) => id !== currentUser.id),
        updatedAt: new Date().toISOString(),
      };
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  const createMatch = async (
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
      joinedAt: nowIso,
      isHost: true,
    };

    const newMatch: SoccerMatch = {
      ...matchData,
      id: newId,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorEmail: currentUser.email,
      roster: [hostPlayer],
      waitlist: [],
      isLocked: false,
      status: 'upcoming',
      totalPitchCost: matchData.totalPitchCost || matchData.pricePerPlayer * matchData.maxPlayers,
      paidPlayerIds: [currentUser.id],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMatch),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => [data.match, ...prev.filter((m) => m.id !== newId)]);
        return data.match.id;
      }
    } catch {}

    setMatches((prev) => {
      const updated = [newMatch, ...prev];
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return newId;
  };

  const updateMatch = async (matchId: string, updates: Partial<SoccerMatch>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}

    setMatches((prev) => {
      const index = prev.findIndex((m) => m.id === matchId);
      if (index === -1) return prev;

      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });
    return true;
  };

  // Delete Match with Unrestricted Admin Privileges (Admin can delete ANY match at ANY time)
  const deleteMatch = async (matchId: string): Promise<boolean> => {
    const isAdmin = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin === true;
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return false;

    // Check permission: Admin or match creator
    if (!isAdmin && targetMatch.creatorId !== currentUser.id) {
      alert('Permission Denied: Only an Administrator or the match host can delete this match.');
      return false;
    }

    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server failed to delete match:', errorData);
      }
    } catch (err) {
      console.error('Network error deleting match:', err);
    }

    // Immediately remove from local state and broadcast
    setMatches((prev) => {
      const updated = prev.filter((m) => m.id !== matchId);
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    setComments((prev) => {
      if (!prev[matchId]) return prev;
      const copy = { ...prev };
      delete copy[matchId];
      broadcastChange('SYNC_COMMENTS', copy);
      return copy;
    });

    return true;
  };

  const assignPlayerTeam = async (matchId: string, userId: string, team: TeamSide): Promise<boolean> => {
    try {
      await fetch(`/api/matches/${matchId}/assign-team`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, team }),
      });
    } catch {}

    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const target = prev[matchIndex];
      const updatedRoster = target.roster.map((p) => (p.userId === userId ? { ...p, team } : p));

      const updated = [...prev];
      updated[matchIndex] = {
        ...target,
        roster: updatedRoster,
        updatedAt: new Date().toISOString(),
      };

      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });
    return true;
  };

  // Full Admin & Host Control: Remove or Kick Out ANY Player from Roster OR Waitlist Instantly
  const removePlayerFromMatch = async (matchId: string, userId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/remove-player`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, adminRequesterId: currentUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}

    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const target = prev[matchIndex];
      const wasInRoster = target.roster.some((p) => p.userId === userId);
      let updatedRoster = target.roster.filter((p) => p.userId !== userId);
      let updatedWaitlist = target.waitlist.filter((p) => p.userId !== userId);

      if (wasInRoster && updatedWaitlist.length > 0 && updatedRoster.length < target.maxPlayers) {
        const promoted = updatedWaitlist.shift();
        if (promoted) {
          const greenCount = updatedRoster.filter((p) => p.team === 'green').length;
          const blueCount = updatedRoster.filter((p) => p.team === 'blue').length;
          promoted.team = greenCount <= blueCount ? 'green' : 'blue';
          updatedRoster.push(promoted);
        }
      }

      const updated = [...prev];
      updated[matchIndex] = {
        ...target,
        roster: updatedRoster,
        waitlist: updatedWaitlist,
        paidPlayerIds: (target.paidPlayerIds || []).filter((id) => id !== userId),
        updatedAt: new Date().toISOString(),
      };

      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });
    return true;
  };

  const toggleMatchLock = async (matchId: string): Promise<boolean> => {
    try {
      await fetch(`/api/matches/${matchId}/toggle-lock`, { method: 'POST', headers: getAuthHeaders() });
    } catch {}

    setMatches((prev) => {
      const targetIndex = prev.findIndex((m) => m.id === matchId);
      if (targetIndex === -1) return prev;

      const target = prev[targetIndex];
      const updated = [...prev];
      updated[targetIndex] = {
        ...target,
        isLocked: !target.isLocked,
        updatedAt: new Date().toISOString(),
      };

      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });
    return true;
  };

  // Toggle player payment status (Pitch Cost Sharing)
  const togglePlayerPaidStatus = async (matchId: string, playerId: string): Promise<boolean> => {
    try {
      await fetch(`/api/matches/${matchId}/toggle-paid`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ playerId }),
      });
    } catch {}

    setMatches((prev) => {
      const index = prev.findIndex((m) => m.id === matchId);
      if (index === -1) return prev;

      const target = prev[index];
      const currentPaid = target.paidPlayerIds || [];
      const isPaid = currentPaid.includes(playerId);
      const updatedPaid = isPaid ? currentPaid.filter((id) => id !== playerId) : [...currentPaid, playerId];

      const updated = [...prev];
      updated[index] = {
        ...target,
        paidPlayerIds: updatedPaid,
        updatedAt: new Date().toISOString(),
      };

      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  // Update total pitch cost & per-player split
  const updateMatchPitchCost = async (matchId: string, totalCost: number, pricePerPlayer: number): Promise<boolean> => {
    try {
      await fetch(`/api/matches/${matchId}/cost`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ totalCost, pricePerPlayer }),
      });
    } catch {}

    setMatches((prev) => {
      const index = prev.findIndex((m) => m.id === matchId);
      if (index === -1) return prev;

      const target = prev[index];
      const updated = [...prev];
      updated[index] = {
        ...target,
        totalPitchCost: totalCost,
        pricePerPlayer: pricePerPlayer,
        updatedAt: new Date().toISOString(),
      };

      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  // Auto-Balance Teams based on Player Skill Rating & Preferred Positions (Snake Draft)
  const autoBalanceTeams = async (matchId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/auto-balance`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}

    // Client-side fallback snake draft
    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;
      const target = prev[matchIndex];
      const rosterWithRatings = target.roster.map((player) => {
        const profile = users.find((u) => u.id === player.userId);
        return {
          ...player,
          skillRating: profile?.skillRating ?? 4.5,
          reliabilityScore: profile?.reliabilityScore ?? 95,
          position: profile?.preferredPosition ?? player.position ?? 'MID',
        };
      });

      rosterWithRatings.sort((a, b) => {
        const scoreA = (a.skillRating || 4.5) * 20 + (a.reliabilityScore || 95) * 0.5;
        const scoreB = (b.skillRating || 4.5) * 20 + (b.reliabilityScore || 95) * 0.5;
        return scoreB - scoreA;
      });

      const balancedRoster = rosterWithRatings.map((player, idx) => ({
        ...player,
        team: idx % 4 === 0 || idx % 4 === 3 ? ('green' as const) : ('blue' as const),
      }));

      const updated = [...prev];
      updated[matchIndex] = {
        ...target,
        roster: balancedRoster,
        updatedAt: new Date().toISOString(),
      };
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  // Update 2D Tactical Formation & Lineup Slot Assignments
  const updateTacticalFormation = async (
    matchId: string,
    formationGreen: string,
    formationBlue: string,
    tacticalAssignments: Record<string, string>
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/tactical`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ formationGreen, formationBlue, tacticalAssignments }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}

    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;
      const target = prev[matchIndex];
      const updated = [...prev];
      updated[matchIndex] = {
        ...target,
        formationGreen,
        formationBlue,
        tacticalAssignments,
        updatedAt: new Date().toISOString(),
      };
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  // Record Attendance & No-Shows with Automatic Reliability Scoring
  const markMatchAttendance = async (
    matchId: string,
    attendedPlayerIds: string[],
    noShowPlayerIds: string[]
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/attendance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ attendedPlayerIds, noShowPlayerIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}

    // Client fallback
    setUsers((prev) =>
      prev.map((user) => {
        if (attendedPlayerIds.includes(user.id)) {
          const newAttended = (user.matchesAttended || user.matchesPlayed || 0) + 1;
          const noShows = user.noShowsCount || 0;
          const reliability = Math.min(100, Math.round((newAttended / (newAttended + noShows)) * 100));
          return {
            ...user,
            matchesAttended: newAttended,
            matchesPlayed: newAttended,
            reliabilityScore: reliability,
          };
        }
        if (noShowPlayerIds.includes(user.id)) {
          const attended = user.matchesAttended || user.matchesPlayed || 0;
          const newNoShows = (user.noShowsCount || 0) + 1;
          const reliability = Math.max(0, Math.round((attended / (attended + newNoShows)) * 100));
          return {
            ...user,
            noShowsCount: newNoShows,
            reliabilityScore: reliability,
          };
        }
        return user;
      })
    );

    return true;
  };

  // ==========================================
  // MATCH COMMENTS & VOICE NOTES
  // ==========================================
  const addComment = async (matchId: string, text: string): Promise<boolean> => {
    const cleanText = sanitizeInput(text);
    if (!cleanText) return false;
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot post comments.');
      return false;
    }

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

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment),
      });
    } catch {}

    setComments((prev) => {
      const currentList = prev[matchId] || [];
      const updatedList = [...currentList, newComment];
      const updatedMap = { ...prev, [matchId]: updatedList };
      broadcastChange('SYNC_COMMENTS', updatedMap);
      return updatedMap;
    });

    return true;
  };

  const addVoiceComment = async (matchId: string, audioUrl: string, durationSeconds: number): Promise<boolean> => {
    if (!audioUrl) return false;
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot post voice notes.');
      return false;
    }

    const commentId = `comm_voice_${Date.now()}`;
    await mediaStorage.saveVoiceNote(commentId, audioUrl);

    const newComment: MatchComment = {
      id: commentId,
      matchId,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userAvatar: currentUser.avatarUrl,
      audioUrl,
      audioDuration: durationSeconds,
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newComment),
      });
    } catch {}

    setComments((prev) => {
      const currentList = prev[matchId] || [];
      const updatedList = [...currentList, newComment];
      const updatedMap = { ...prev, [matchId]: updatedList };
      broadcastChange('SYNC_COMMENTS', updatedMap);
      return updatedMap;
    });

    return true;
  };

  const deleteComment = async (matchId: string, commentId: string): Promise<boolean> => {
    try {
      await fetch(`/api/comments/${matchId}/${commentId}`, { method: 'DELETE', headers: getAuthHeaders() });
    } catch {}

    setComments((prev) => {
      if (!prev[matchId]) return prev;
      const updatedList = prev[matchId].filter((c) => c.id !== commentId);
      const updatedMap = { ...prev, [matchId]: updatedList };
      broadcastChange('SYNC_COMMENTS', updatedMap);
      return updatedMap;
    });
    return true;
  };

  // ==========================================
  // DIRECT MESSAGING & VOICE CHAT
  // ==========================================
  const sendDirectMessage = async (receiverId: string, text: string, imageUrl?: string): Promise<boolean> => {
    const cleanText = sanitizeInput(text);
    if (!cleanText && !imageUrl) return false;
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot send messages.');
      return false;
    }

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

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMsg),
      });
    } catch {}

    setDirectMessages((prev) => {
      const updated = [...prev, newMsg];
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });

    sendNotification({
      userId: receiverId,
      title: `New message from ${currentUser.name}`,
      message: cleanText || 'Sent you an image',
      type: 'chat',
      linkId: currentUser.id,
    });

    return true;
  };

  const sendDirectVoiceMessage = async (
    receiverId: string,
    audioUrl: string,
    durationSeconds: number
  ): Promise<boolean> => {
    if (!audioUrl) return false;
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot send voice messages.');
      return false;
    }

    const messageId = `dm_voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await mediaStorage.saveVoiceNote(messageId, audioUrl);

    const newMsg: DirectMessage = {
      id: messageId,
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

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMsg),
      });
    } catch {}

    setDirectMessages((prev) => {
      const updated = [...prev, newMsg];
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });

    sendNotification({
      userId: receiverId,
      title: `Voice message from ${currentUser.name}`,
      message: `Sent you a ${Math.round(durationSeconds)}s voice recording.`,
      type: 'chat',
      linkId: currentUser.id,
    });

    return true;
  };

  const markConversationAsRead = (otherUserId: string) => {
    try {
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentUserId: currentUser.id, otherUserId }),
      }).catch(() => {});
    } catch {}

    setDirectMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.senderId === otherUserId && m.receiverId === currentUser.id) {
          return { ...m, read: true };
        }
        return m;
      });
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });
  };

  const deleteDirectMessage = (messageId: string) => {
    try {
      fetch(`/api/messages/${messageId}`, { method: 'DELETE', headers: getAuthHeaders() }).catch(() => {});
    } catch {}

    setDirectMessages((prev) => {
      const updated = prev.filter((m) => m.id !== messageId);
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });
  };

  const deleteUserAccount = async (userId: string): Promise<boolean> => {
    return removeUserAccount(userId);
  };

  // ==========================================
  // USER PROFILES & GLOBAL ADMIN APPROVALS
  // ==========================================
  const setCurrentUserById = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(found.id);
      setIsAuthenticated(true);
      const token = `pitchmate_token_${found.id}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, found.id);
    }
  };

  const authenticateSuperAdmin = (password: string): boolean => {
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
          matchesPlayed: 48,
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [mustapha!, ...prev.filter((u) => !isSuperAdminEmail(u.email))]);
      }
      setCurrentUserId(mustapha.id);
      setIsAuthenticated(true);
      const token = `pitchmate_token_${mustapha.id}_${Date.now()}`;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, mustapha.id);
      return true;
    }
    return false;
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === userId ? { ...u, ...updates, isAdmin: isSuperAdminEmail(u.email) } : u));
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    setMatches((prev) => {
      const updated = prev.map((m) => ({
        ...m,
        roster: m.roster.map((p) => {
          if (p.userId === userId) {
            return {
              ...p,
              name: updates.name || p.name,
              avatarUrl: updates.avatarUrl || p.avatarUrl,
            };
          }
          return p;
        }),
        waitlist: m.waitlist.map((w) => {
          if (w.userId === userId) {
            return {
              ...w,
              name: updates.name || w.name,
              avatarUrl: updates.avatarUrl || w.avatarUrl,
            };
          }
          return w;
        }),
      }));
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  const banUser = async (userId: string, reason: string = 'Violation of community conduct rules'): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email);
    if (!isMustapha) return false;

    try {
      await fetch('/api/users/ban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, reason }),
      });
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            isBanned: true,
            banReason: reason,
            bannedAt: new Date().toISOString(),
          };
        }
        return u;
      });
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    return true;
  };

  const unbanUser = async (userId: string): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email);
    if (!isMustapha) return false;

    try {
      await fetch('/api/users/unban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId }),
      });
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === userId ? { ...u, isBanned: false, banReason: undefined, bannedAt: undefined } : u));
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });
    return true;
  };

  const removeUserAccount = async (userId: string): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    if (!isMustapha) return false;

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return false;
    if (isSuperAdminEmail(targetUser.email)) {
      alert('Cannot delete the Super Admin profile.');
      return false;
    }

    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: getAuthHeaders() });
    } catch {}

    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    setMatches((prev) => {
      const updated = prev.map((m) => ({
        ...m,
        roster: m.roster.filter((p) => p.userId !== userId),
        waitlist: m.waitlist.filter((p) => p.userId !== userId),
      }));
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    setDirectMessages((prev) => {
      const updated = prev.filter((m) => m.senderId !== userId && m.receiverId !== userId);
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });

    return true;
  };

  // Global Admin Approval Action
  const approveUser = async (userId: string): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    if (!isMustapha) return false;

    const target = users.find((u) => u.id === userId);

    try {
      await fetch('/api/users/approve', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, adminName: currentUser.name || 'Mustapha Bouhbous (Admin)' }),
      });
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'approved' as const,
              approvedAt: new Date().toISOString(),
              approvedBy: currentUser.name || 'Admin',
              isBanned: false,
              banReason: undefined,
            }
          : u
      );
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    if (target) {
      sendNotification({
        userId: target.id,
        title: 'Account Approved!',
        message: 'Your PitchMate registration has been approved by the Admin. You can now join matches and chat.',
        type: 'approval',
      });
    }

    try {
      SoundEffects.playJoin();
    } catch {}

    return true;
  };

  // Global Admin Reject Action
  const rejectUser = async (userId: string, reason: string = 'Registration declined by administrator'): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    if (!isMustapha) return false;

    try {
      await fetch('/api/users/reject', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, reason }),
      });
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'rejected' as const,
              banReason: reason,
            }
          : u
      );
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    return true;
  };

  // Global Admin Bulk Approve All Action
  const approveAllPendingUsers = async (): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    if (!isMustapha) return false;

    const pending = users.filter((u) => u.status === 'pending');

    try {
      await fetch('/api/users/approve-all', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminName: currentUser.name || 'Mustapha Bouhbous (Admin)' }),
      });
    } catch {}

    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.status === 'pending'
          ? {
              ...u,
              status: 'approved' as const,
              approvedAt: new Date().toISOString(),
              approvedBy: currentUser.name || 'Admin',
            }
          : u
      );
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    pending.forEach((p) => {
      sendNotification({
        userId: p.id,
        title: 'Account Approved!',
        message: 'Your PitchMate registration has been approved by the Admin. Welcome to the league!',
        type: 'approval',
      });
    });

    try {
      SoundEffects.playVictory();
    } catch {}

    return true;
  };

  const createNewUserAccount = (name: string, email: string): UserProfile => {
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

    setUsers((prev) => {
      const updated = [...prev, newUser];
      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    setCurrentUserId(newUser.id);
    return newUser;
  };

  const createAnnouncement = async (title: string, message: string, type: AdminAnnouncement['type']): Promise<boolean> => {
    const newAnn: AdminAnnouncement = {
      id: `ann_${Date.now()}`,
      title,
      message,
      createdAt: new Date().toISOString(),
      authorName: currentUser.name,
      type,
    };

    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newAnn),
      });
    } catch {}

    setAnnouncements((prev) => {
      const updated = [newAnn, ...prev];
      broadcastChange('SYNC_ANNOUNCEMENTS', updated);
      return updated;
    });
    return true;
  };

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    } catch {}

    setAnnouncements((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      broadcastChange('SYNC_ANNOUNCEMENTS', updated);
      return updated;
    });
    return true;
  };

  const resetToDefaultData = () => {
    try {
      fetch('/api/reset-data', { method: 'POST' }).catch(() => {});
    } catch {}

    setMatches(INITIAL_MATCHES);
    setUsers(INITIAL_USERS);
    setDirectMessages(INITIAL_DIRECT_MESSAGES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCurrentUserId('user_mustapha');
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEYS.MATCHES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.COMMENTS);
    localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
    localStorage.removeItem(STORAGE_KEYS.DIRECT_MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  };

  return (
    <PitchStoreContext.Provider
      value={{
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
        isSupabaseLive,
        isLoading,
        loginWithCredentials,
        signupWithCredentials,
        resetPasswordWithEmail,
        logout,
        joinMatch,
        leaveMatch,
        createMatch,
        updateMatch,
        deleteMatch,
        assignPlayerTeam,
        removePlayerFromMatch,
        toggleMatchLock,
        togglePlayerPaidStatus,
        updateMatchPitchCost,
        autoBalanceTeams,
        updateTacticalFormation,
        markMatchAttendance,
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
        deleteUserAccount,
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
      }}
    >
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
