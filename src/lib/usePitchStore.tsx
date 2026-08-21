import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  SoccerMatch,
  UserProfile,
  PlayerRosterItem,
  MatchComment,
  AdminAnnouncement,
  DirectMessage,
  TeamSide,
  ActiveVoiceCall,
  InAppNotification,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  isSuperAdminEmail,
  verifySuperAdminMasterPassword
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
  activeCall: ActiveVoiceCall | null;

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

  // Voice Calling Actions
  initiateVoiceCall: (receiverId: string) => void;
  acceptVoiceCall: () => void;
  rejectVoiceCall: () => void;
  endVoiceCall: () => void;

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
        isAdmin: isSuperAdminEmail(u.email),
        status: isSuperAdminEmail(u.email) ? ('approved' as const) : (u.status || 'approved'),
      }));
    } catch {
      return INITIAL_USERS.map((u) => ({
        ...u,
        isAdmin: isSuperAdminEmail(u.email),
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
      return saved ? JSON.parse(saved) : {
        'match_01_friday_lights': [
          {
            id: 'c1',
            matchId: 'match_01_friday_lights',
            userId: 'user_mustapha',
            userName: 'Mustapha Bouhbous',
            userEmail: SUPER_ADMIN_EMAIL,
            userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            text: 'Pitch 3 is booked and confirmed! I will bring the Green and Blue bibs plus two match balls. See everyone at 7:15 PM for warmups.',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'c2',
            matchId: 'match_01_friday_lights',
            userId: 'user_karim',
            userName: 'Karim Benzema',
            userEmail: 'karim.b@pitchmate.io',
            userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            text: 'Looking forward to it captain! Let’s get a full 7v7 squad.',
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          }
        ]
      };
    } catch {
      return {};
    }
  });

  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      return saved ? JSON.parse(saved) : [
        {
          id: 'ann_1',
          title: 'Spring League Schedule & Pitch Guidelines',
          message: 'Welcome to PitchMate! All matches have real-time rosters, voice notes, live pitch weather, and cost split tracking. Contact Mustapha for admin requests.',
          authorName: 'Mustapha Bouhbous (Admin)',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          type: 'info'
        }
      ];
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

  // Voice Call State
  const [activeCall, setActiveCall] = useState<ActiveVoiceCall | null>(null);

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
    id: 'user_mustapha',
    email: SUPER_ADMIN_EMAIL,
    name: 'Mustapha Bouhbous',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isAdmin: true,
    status: 'approved',
    matchesPlayed: 48,
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

  // Real-time broadcast sync helper
  const broadcastChange = useCallback((type: string, payload: any) => {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type, payload, senderId: currentUserId });
      } catch (err) {
        console.warn('Broadcast sync error:', err);
      }
    }
  }, [currentUserId]);

  // Broadcast channel listener
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
        case 'CALL_INITIATE':
          if (payload.receiverId === currentUserId) {
            setActiveCall({ ...payload, status: 'incoming' });
            try {
              SoundEffects.startIncomingRingtone();
            } catch {}
          }
          break;
        case 'CALL_ACCEPT':
          if (activeCall && (activeCall.id === payload.id || activeCall.callerId === currentUserId)) {
            setActiveCall(payload);
            try {
              SoundEffects.stopRingtone();
            } catch {}
          }
          break;
        case 'CALL_REJECT':
        case 'CALL_END':
          if (activeCall && activeCall.id === payload.id) {
            setActiveCall(payload);
            try {
              SoundEffects.stopRingtone();
            } catch {}
            setTimeout(() => setActiveCall(null), 1500);
          }
          break;
      }
    };

    broadcastChannel.addEventListener('message', handleMessage);
    return () => {
      broadcastChannel.removeEventListener('message', handleMessage);
    };
  }, [currentUserId, activeCall]);

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
  }, [broadcastChange]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      broadcastChange('SYNC_NOTIFICATIONS', updated);
      return updated;
    });
  }, [broadcastChange]);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.userId !== currentUser.id);
      broadcastChange('SYNC_NOTIFICATIONS', updated);
      return updated;
    });
  }, [currentUser.id, broadcastChange]);

  // ==========================================
  // AUTHENTICATION: SECURE HASHING & APPROVALS
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
        error: 'Your account has been created. Please wait until the Admin approves your account.',
      };
    }

    if (targetUser.status === 'rejected') {
      return {
        success: false,
        error: 'Your registration was declined. Please contact the administrator.',
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

    // Transparently upgrade legacy plaintext password to salted SHA-256 hash if needed
    if (!targetUser.passwordHash) {
      const salt = generateSalt();
      const hash = await hashPassword(cleanPass, salt);
      const updatedUser = {
        ...targetUser,
        passwordHash: hash,
        passwordSalt: salt,
        password: undefined, // remove plaintext
      };
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updatedUser : u)));
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

    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists. Please Sign In.' };
    }

    // Compute cryptographic salt and SHA-256 hash
    const salt = generateSalt();
    const hash = await hashPassword(cleanPass, salt);

    // Save avatar to IndexedDB storage if it is a data URI
    let finalAvatarUrl = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;
    const userId = isMustapha ? 'user_mustapha' : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (avatarUrl && avatarUrl.startsWith('data:')) {
      finalAvatarUrl = await mediaStorage.saveAvatar(userId, avatarUrl);
    }

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
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
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

    // Send admin notification about pending registration
    sendNotification({
      userId: 'user_mustapha',
      title: 'New Player Registration Pending',
      message: `${cleanName} (${cleanEmail}) registered and is awaiting your review in Admin Panel.`,
      type: 'approval',
    });

    // Regular users: Require Admin approval. DO NOT log them in.
    return { success: true, pendingApproval: true };
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
  // MATCH MANAGEMENT & COST SPLITTING
  // ==========================================
  const joinMatch = async (matchId: string, teamChoice: TeamSide = 'unassigned'): Promise<boolean> => {
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot join matches.');
      return false;
    }

    let matchCreatorId = '';
    let matchTitle = '';

    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const target = prev[matchIndex];
      matchCreatorId = target.creatorId;
      matchTitle = target.title;

      const isAlreadyInRoster = target.roster.some((p) => p.userId === currentUser.id);
      const isAlreadyInWaitlist = target.waitlist.some((p) => p.userId === currentUser.id);

      if (isAlreadyInRoster || isAlreadyInWaitlist) return prev;

      let chosenTeam = teamChoice;
      if (chosenTeam === 'unassigned') {
        const greenCount = target.roster.filter((p) => p.team === 'green').length;
        const blueCount = target.roster.filter((p) => p.team === 'blue').length;
        chosenTeam = greenCount <= blueCount ? 'green' : 'blue';
      }

      const playerItem: PlayerRosterItem = {
        userId: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
        team: chosenTeam,
        joinedAt: new Date().toISOString(),
      };

      const updated = [...prev];
      if (target.roster.length < target.maxPlayers) {
        updated[matchIndex] = {
          ...target,
          roster: [...target.roster, playerItem],
          updatedAt: new Date().toISOString(),
        };
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
          });
        } catch {
          // Confetti fallback
        }
      } else {
        updated[matchIndex] = {
          ...target,
          waitlist: [...target.waitlist, playerItem],
          updatedAt: new Date().toISOString(),
        };
      }

      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    // Send notification to match creator
    if (matchCreatorId && matchCreatorId !== currentUser.id) {
      sendNotification({
        userId: matchCreatorId,
        title: 'New Player Joined Your Match',
        message: `${currentUser.name} joined the roster for "${matchTitle}".`,
        type: 'match_join',
        linkId: matchId,
      });
    }

    return true;
  };

  const leaveMatch = async (matchId: string): Promise<boolean> => {
    let promotedUserId = '';
    let matchTitle = '';

    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const target = prev[matchIndex];
      matchTitle = target.title;
      let updatedRoster = target.roster.filter((p) => p.userId !== currentUser.id);
      let updatedWaitlist = target.waitlist.filter((p) => p.userId !== currentUser.id);

      // Auto promote from waitlist
      if (updatedWaitlist.length > 0 && updatedRoster.length < target.maxPlayers) {
        const promoted = updatedWaitlist.shift();
        if (promoted) {
          promotedUserId = promoted.userId;
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

    // Notify promoted player
    if (promotedUserId) {
      sendNotification({
        userId: promotedUserId,
        title: 'Spot Opened: You Are in the Game!',
        message: `A spot opened up and you were promoted to confirmed roster for "${matchTitle}".`,
        type: 'waitlist_promoted',
        linkId: matchId,
      });
    }

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

    setMatches((prev) => {
      const updated = [newMatch, ...prev];
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return newId;
  };

  const updateMatch = async (matchId: string, updates: Partial<SoccerMatch>): Promise<boolean> => {
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

  // Delete Match with unrestricted Super Admin authority override
  const deleteMatch = async (matchId: string): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return false;

    // Check permission: Super Admin or match creator
    if (!isMustapha && targetMatch.creatorId !== currentUser.id) {
      alert('Permission Denied: Only Super Admin or the match creator can delete this match.');
      return false;
    }

    setMatches((prev) => {
      const updated = prev.filter((m) => m.id !== matchId);
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    // Also clean up associated comments for this match
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

  const removePlayerFromMatch = async (matchId: string, userId: string): Promise<boolean> => {
    setMatches((prev) => {
      const matchIndex = prev.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return prev;

      const target = prev[matchIndex];
      let updatedRoster = target.roster.filter((p) => p.userId !== userId);
      let updatedWaitlist = target.waitlist.filter((p) => p.userId !== userId);

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
        paidPlayerIds: (target.paidPlayerIds || []).filter((id) => id !== userId),
        updatedAt: new Date().toISOString(),
      };

      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });
    return true;
  };

  const toggleMatchLock = async (matchId: string): Promise<boolean> => {
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

    setComments((prev) => {
      const currentList = prev[matchId] || [];
      const updatedList = [...currentList, newComment];
      const updatedMap = {
        ...prev,
        [matchId]: updatedList,
      };
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
    // Save to IndexedDB to avoid overloading localStorage
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

    setComments((prev) => {
      const currentList = prev[matchId] || [];
      const updatedList = [...currentList, newComment];
      const updatedMap = {
        ...prev,
        [matchId]: updatedList,
      };
      broadcastChange('SYNC_COMMENTS', updatedMap);
      return updatedMap;
    });

    return true;
  };

  const deleteComment = async (matchId: string, commentId: string): Promise<boolean> => {
    setComments((prev) => {
      const currentList = prev[matchId] || [];
      const updatedList = currentList.filter((c) => c.id !== commentId);
      const updatedMap = {
        ...prev,
        [matchId]: updatedList,
      };
      broadcastChange('SYNC_COMMENTS', updatedMap);
      return updatedMap;
    });
    return true;
  };

  // ==========================================
  // DIRECT MESSAGING & VOICE NOTES
  // ==========================================
  const sendDirectMessage = async (receiverId: string, text: string, imageUrl?: string): Promise<boolean> => {
    const cleanText = sanitizeInput(text);
    if (!cleanText && !imageUrl) return false;
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot send messages.');
      return false;
    }

    let finalImageUrl = imageUrl?.trim() || undefined;
    const msgId = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (finalImageUrl && finalImageUrl.startsWith('data:')) {
      finalImageUrl = await mediaStorage.saveAvatar(msgId, finalImageUrl);
    }

    const newMsg: DirectMessage = {
      id: msgId,
      senderId: currentUser.id,
      receiverId,
      text: cleanText,
      imageUrl: finalImageUrl,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setDirectMessages((prev) => {
      const updated = [...prev, newMsg];
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });

    return true;
  };

  const sendDirectVoiceMessage = async (receiverId: string, audioUrl: string, durationSeconds: number): Promise<boolean> => {
    if (!audioUrl) return false;
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot send voice messages.');
      return false;
    }

    const msgId = `dm_voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await mediaStorage.saveVoiceNote(msgId, audioUrl);

    const newMsg: DirectMessage = {
      id: msgId,
      senderId: currentUser.id,
      receiverId,
      audioUrl,
      audioDuration: durationSeconds,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setDirectMessages((prev) => {
      const updated = [...prev, newMsg];
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });

    return true;
  };

  const markConversationAsRead = (otherUserId: string) => {
    setDirectMessages((prev) => {
      let changed = false;
      const updated = prev.map((m) => {
        if (m.senderId === otherUserId && m.receiverId === currentUser.id && !m.read) {
          changed = true;
          return { ...m, read: true };
        }
        return m;
      });

      if (changed) {
        broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      }
      return changed ? updated : prev;
    });
  };

  const deleteDirectMessage = (messageId: string) => {
    setDirectMessages((prev) => {
      const updated = prev.filter((m) => m.id !== messageId);
      broadcastChange('SYNC_DIRECT_MESSAGES', updated);
      return updated;
    });
  };

  // ==========================================
  // LIVE VOICE CALLING (WHATSAPP-STYLE)
  // ==========================================
  const initiateVoiceCall = (receiverId: string) => {
    const receiver = users.find((u) => u.id === receiverId);
    if (!receiver) return;

    const call: ActiveVoiceCall = {
      id: `call_${Date.now()}`,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerAvatar: currentUser.avatarUrl,
      receiverId: receiver.id,
      receiverName: receiver.name,
      receiverAvatar: receiver.avatarUrl,
      status: 'outgoing',
      startedAt: new Date().toISOString(),
    };

    setActiveCall(call);
    broadcastChange('CALL_INITIATE', call);

    // Auto-timeout if no answer after 35 seconds
    setTimeout(() => {
      setActiveCall((curr) => {
        if (curr && curr.id === call.id && curr.status === 'outgoing') {
          broadcastChange('CALL_END', { ...curr, status: 'ended' });
          return { ...curr, status: 'ended' };
        }
        return curr;
      });
      setTimeout(() => {
        setActiveCall((curr) => (curr && curr.id === call.id ? null : curr));
      }, 1500);
    }, 35000);
  };

  const acceptVoiceCall = () => {
    if (!activeCall) return;
    const updated: ActiveVoiceCall = {
      ...activeCall,
      status: 'connected',
      connectedAt: new Date().toISOString(),
    };
    setActiveCall(updated);
    broadcastChange('CALL_ACCEPT', updated);
  };

  const rejectVoiceCall = () => {
    if (!activeCall) return;
    const updated: ActiveVoiceCall = {
      ...activeCall,
      status: 'ended',
      endedAt: new Date().toISOString(),
    };
    setActiveCall(updated);
    broadcastChange('CALL_REJECT', updated);
    setTimeout(() => setActiveCall(null), 1500);
  };

  const endVoiceCall = () => {
    if (!activeCall) return;
    const updated: ActiveVoiceCall = {
      ...activeCall,
      status: 'ended',
      endedAt: new Date().toISOString(),
    };
    setActiveCall(updated);
    broadcastChange('CALL_END', updated);
    setTimeout(() => setActiveCall(null), 1500);
  };

  // ==========================================
  // PROFILE & ANNOUNCEMENT MANAGEMENT
  // ==========================================
  const setCurrentUserById = (userId: string) => {
    setCurrentUserId(userId);
  };

  const authenticateSuperAdmin = (password: string): boolean => {
    if (verifySuperAdminMasterPassword(password)) {
      const mustapha = users.find((u) => isSuperAdminEmail(u.email));
      if (mustapha) {
        setCurrentUserId(mustapha.id);
        return true;
      }
    }
    return false;
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          const isMustapha = isSuperAdminEmail(u.email);
          return {
            ...u,
            ...updates,
            isAdmin: isMustapha,
          };
        }
        return u;
      });

      broadcastChange('SYNC_USERS', updated);
      return updated;
    });

    // Update match rosters
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
      }));
      broadcastChange('SYNC_MATCHES', updated);
      return updated;
    });

    return true;
  };

  const banUser = async (userId: string, reason: string = 'Violation of community conduct rules'): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email);
    if (!isMustapha) return false;

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

  const approveUser = async (userId: string): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    if (!isMustapha) return false;

    const target = users.find((u) => u.id === userId);

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

  const rejectUser = async (userId: string, reason: string = 'Registration declined by administrator'): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    if (!isMustapha) return false;

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

  const approveAllPendingUsers = async (): Promise<boolean> => {
    const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
    if (!isMustapha) return false;

    const pending = users.filter((u) => u.status === 'pending');

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

    setAnnouncements((prev) => {
      const updated = [newAnn, ...prev];
      broadcastChange('SYNC_ANNOUNCEMENTS', updated);
      return updated;
    });
    return true;
  };

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    setAnnouncements((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      broadcastChange('SYNC_ANNOUNCEMENTS', updated);
      return updated;
    });
    return true;
  };

  const resetToDefaultData = () => {
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
        activeCall,
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
        initiateVoiceCall,
        acceptVoiceCall,
        rejectVoiceCall,
        endVoiceCall,
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
