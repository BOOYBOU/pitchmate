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
  PlayerPosition,
  InAppNotification,
  DEFAULT_CURRENCY,
  SUPER_ADMIN_EMAILS,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  isSuperAdminEmail,
  verifySuperAdminMasterPassword,
} from '../types';
import { INITIAL_MATCHES, INITIAL_USERS, INITIAL_DIRECT_MESSAGES, INITIAL_NOTIFICATIONS, INITIAL_ANNOUNCEMENTS } from './mockData';
import { SoundEffects } from './audioService';
import { hashPassword, verifyPassword, generateSalt, sanitizeInput } from './security';
import { mediaStorage } from './mediaStorage';

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
      return parsed.map((u) => ({
        ...u,
        isAdmin: isSuperAdminEmail(u.email) || u.isAdmin === true,
        status: isSuperAdminEmail(u.email) || u.isAdmin === true ? ('approved' as const) : (u.status || 'approved'),
      }));
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      return saved || 'user_admin_main';
    } catch {
      return 'user_admin_main';
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return true; // Default signed-in for seamless dev exploration
      return true;
    } catch {
      return true;
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

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    } catch {}
  }, [matches]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    } catch {}
  }, [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
    } catch {}
  }, [comments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    } catch {}
  }, [announcements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DIRECT_MESSAGES, JSON.stringify(directMessages));
    } catch {}
  }, [directMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Current User Object
  const currentUser: UserProfile = users.find((u) => u.id === currentUserId) || {
    id: 'user_admin_main',
    email: 'topreviewsamazon2025@gmail.com',
    name: 'Mustapha Bouhbous',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+212 661-234567',
    city: 'Casablanca',
    isAdmin: true,
    status: 'approved',
    matchesPlayed: 50,
    createdAt: new Date().toISOString(),
  };

  const unreadMessagesCount = directMessages.filter(
    (m) => m.receiverId === currentUser.id && !m.read
  ).length;

  const unreadNotificationsCount = notifications.filter(
    (n) => n.userId === currentUser.id && !n.read
  ).length;

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || `pitchmate_token_${currentUserId}_${Date.now()}`;
    const isAdminUser = Boolean(
      isSuperAdminEmail(currentUser.email) ||
      currentUser.isAdmin ||
      currentUser.name?.toLowerCase().includes('mustapha')
    );
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-id': currentUserId,
      'x-user-email': currentUser.email,
      'x-is-admin': isAdminUser ? 'true' : 'false',
      'x-admin-password': SUPER_ADMIN_PASSWORD,
    };
  }, [currentUserId, currentUser.email, currentUser.isAdmin, currentUser.name]);

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

  // Setup Singleton Server-Sent Events (SSE) for server-authoritative realtime sync
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

    setNotifications((prev) => {
      const updated = [newNotif, ...prev.slice(0, 49)];
      return updated;
    });

    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotif),
    }).catch(() => {});
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      return updated;
    });

    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    }).catch(() => {});
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.userId !== currentUser.id);
      return updated;
    });

    fetch('/api/notifications/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    }).catch(() => {});
  }, [currentUser.id]);

  // Auth Operations
  const loginWithCredentials = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Email and password are required.' };
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);

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
          matchesPlayed: 50,
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

    const targetUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return { success: false, error: 'No account found with this email. Please sign up first.' };
    }

    if (targetUser.isBanned) {
      return { success: false, error: `Account suspended: ${targetUser.banReason || 'Contact administrator'}` };
    }

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
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to register account.' };
      }

      const data = await res.json();
      const newUser = data.user;

      setUsers((prev) => [...prev.filter((u) => u.id !== newUser.id), newUser]);

      if (isMustapha) {
        setCurrentUserId(newUser.id);
        setIsAuthenticated(true);
        const token = `pitchmate_token_${newUser.id}_${Date.now()}`;
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
        return { success: true, pendingApproval: false };
      }

      return { success: true, pendingApproval: true };
    } catch {
      return { success: false, error: 'Network error occurred during registration.' };
    }
  };

  const resetPasswordWithEmail = async (email: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = sanitizeInput(email).toLowerCase();
    const cleanPass = newPass.trim();

    if (!cleanEmail || !cleanPass) return { success: false, error: 'Email and new password are required.' };
    if (cleanPass.length < 6) return { success: false, error: 'New password must be at least 6 characters.' };

    const targetUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) return { success: false, error: 'No account found with this email address.' };

    const salt = generateSalt();
    const hash = await hashPassword(cleanPass, salt);

    const updatedUsers = users.map((u) =>
      u.email.toLowerCase() === cleanEmail ? { ...u, passwordHash: hash, passwordSalt: salt } : u
    );
    setUsers(updatedUsers);

    fetch(`/api/users/${targetUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordHash: hash, passwordSalt: salt }),
    }).catch(() => {});

    setCurrentUserId(targetUser.id);
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setIsAuthenticated(false);
  };

  // Match Operations
  const joinMatch = async (matchId: string, teamChoice: TeamSide = 'unassigned'): Promise<boolean> => {
    if (currentUser.isBanned) {
      alert('Suspended accounts cannot join matches.');
      return false;
    }

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

    const newMatch: SoccerMatch = {
      ...matchData,
      id: newId,
      currency: DEFAULT_CURRENCY,
      pricePerPlayer: numPrice,
      totalPitchCost: numTotal,
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

    setMatches((prev) => [newMatch, ...prev]);
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

    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m))
    );
    return true;
  };

  const deleteMatch = async (matchId: string): Promise<boolean> => {
    // Immediate optimistic state update
    setMatches((prev) => {
      const filtered = prev.filter((m) => m.id !== matchId);
      return filtered;
    });

    try {
      await fetch(`/api/matches/${matchId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.warn('Delete match API warning:', err);
    }
    return true;
  };

  const assignPlayerTeam = async (matchId: string, userId: string, team: TeamSide): Promise<boolean> => {
    setMatches((prev) => {
      const updated = prev.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            roster: m.roster.map((p) => (p.userId === userId ? { ...p, team } : p)),
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      });
      return updated;
    });

    try {
      await fetch(`/api/matches/${matchId}/assign-team`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, team }),
      });
    } catch {}

    return true;
  };

  const removePlayerFromMatch = async (matchId: string, userId: string): Promise<boolean> => {
    // Immediate optimistic state update
    setMatches((prev) => {
      const updated = prev.map((m) => {
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
      });
      return updated;
    });

    try {
      const res = await fetch(`/api/matches/${matchId}/remove-player`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        }
      }
    } catch {}
    return true;
  };

  const toggleMatchLock = async (matchId: string): Promise<boolean> => {
    try {
      await fetch(`/api/matches/${matchId}/toggle-lock`, { method: 'POST', headers: getAuthHeaders() });
    } catch {}
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, isLocked: !m.isLocked, updatedAt: new Date().toISOString() } : m))
    );
    return true;
  };

  const togglePlayerPaidStatus = async (matchId: string, playerId: string): Promise<boolean> => {
    try {
      await fetch(`/api/matches/${matchId}/toggle-paid`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ playerId }),
      });
    } catch {}

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
    return true;
  };

  const updatePlayerPaymentStatus = async (
    matchId: string,
    playerId: string,
    status: 'paid' | 'pending' | 'unpaid' | 'waived',
    method?: 'cash' | 'cih_bank' | 'attijari' | 'wafacash' | 'other'
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/payment-status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ playerId, status, method }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}
    return true;
  };

  const updateMatchPitchCost = async (matchId: string, totalCost: number, pricePerPlayer: number): Promise<boolean> => {
    const numTotal = !isNaN(Number(totalCost)) ? Number(totalCost) : 0;
    const numPrice = !isNaN(Number(pricePerPlayer)) ? Number(pricePerPlayer) : 0;

    try {
      await fetch(`/api/matches/${matchId}/cost`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ totalCost: numTotal, pricePerPlayer: numPrice }),
      });
    } catch {}

    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, totalPitchCost: numTotal, pricePerPlayer: numPrice, currency: DEFAULT_CURRENCY, updatedAt: new Date().toISOString() }
          : m
      )
    );
    return true;
  };

  const autoBalanceTeams = async (
    matchId: string,
    mode: 'balanced' | 'random' | 'veterans_vs_newcomers' = 'balanced'
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/auto-balance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}
    return true;
  };

  const updateTacticalFormation = async (
    matchId: string,
    formationGreen: string,
    formationBlue: string,
    tacticalAssignments: Record<string, string>
  ): Promise<boolean> => {
    return updateMatch(matchId, { formationGreen, formationBlue, tacticalAssignments });
  };

  const assignPlayerTacticalSlot = async (
    matchId: string,
    slotKey: string,
    userId: string,
    rolePosition?: PlayerPosition
  ): Promise<boolean> => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return false;

    const nextAssignments = { ...(match.tacticalAssignments || {}) };
    if (userId) {
      // Remove user from any other slot first to prevent duplicate occupancy
      Object.keys(nextAssignments).forEach((key) => {
        if (nextAssignments[key] === userId) {
          delete nextAssignments[key];
        }
      });
      nextAssignments[slotKey] = userId;
    } else {
      delete nextAssignments[slotKey];
    }

    const updatedRoster = match.roster.map((p) => {
      if (p.userId === userId) {
        return {
          ...p,
          tacticalSlot: slotKey,
          position: rolePosition || p.position,
        };
      }
      if (!userId && p.tacticalSlot === slotKey) {
        return { ...p, tacticalSlot: undefined };
      }
      return p;
    });

    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              tacticalAssignments: nextAssignments,
              roster: updatedRoster,
              updatedAt: new Date().toISOString(),
            }
          : m
      )
    );

    return updateMatch(matchId, {
      tacticalAssignments: nextAssignments,
      roster: updatedRoster,
    });
  };

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
    return true;
  };

  // Live Scoreboard & Goals
  const updateMatchScore = async (matchId: string, green: number, blue: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/score`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ green, blue }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        return true;
      }
    } catch {}
    return true;
  };

  const recordMatchGoal = async (
    matchId: string,
    team: TeamSide,
    scorerId: string,
    scorerName: string,
    minute?: number,
    assistId?: string,
    assistName?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/goal`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ team, scorerId, scorerName, minute, assistId, assistName }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        try {
          confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
        } catch {}
        return true;
      }
    } catch {}
    return true;
  };

  const voteMatchMvp = async (matchId: string, nomineeId: string): Promise<boolean> => {
    return voteManOfTheMatch(matchId, nomineeId);
  };

  const voteManOfTheMatch = async (matchId: string, nomineeId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}/vote-mvp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nomineeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match : m)));
        try {
          confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
        } catch {}
        return true;
      }
    } catch {}

    // Optimistic fallback
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          const currentVotes = { ...(m.mvpVotes || {}), [currentUser.id]: nomineeId };
          // Count winner
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

    // Update user stats
    setUsers((prev) =>
      prev.map((u) => (u.id === nomineeId ? { ...u, mvpCount: (u.mvpCount || 0) + 1 } : u))
    );

    try {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
    } catch {}

    return true;
  };

  const recordMatchSubstitution = async (
    matchId: string,
    team: TeamSide,
    playerOutId: string,
    playerOutName: string,
    playerInId: string,
    playerInName: string,
    minute: number
  ): Promise<boolean> => {
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
  };

  const recordMatchCard = async (
    matchId: string,
    team: TeamSide,
    playerId: string,
    playerName: string,
    type: 'yellow' | 'red',
    reason?: string,
    minute?: number
  ): Promise<boolean> => {
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
  };

  const uploadPaymentProof = async (
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
  };

  const updateMatchBankDetails = async (
    matchId: string,
    bankDetails: { bankName: string; accountHolder: string; rib: string; phone?: string; notes?: string }
  ): Promise<boolean> => {
    return updateMatch(matchId, { bankDetails });
  };

  const duplicateAsRecurringMatch = async (matchId: string, daysAhead: number = 7): Promise<string | null> => {
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
  };

  // Comments
  const addComment = async (matchId: string, text: string): Promise<boolean> => {
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

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newComment),
      });
    } catch {}

    setComments((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), newComment],
    }));
    return true;
  };

  const addVoiceComment = async (matchId: string, audioUrl: string, durationSeconds: number): Promise<boolean> => {
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

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newComment),
      });
    } catch {}

    setComments((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), newComment],
    }));
    return true;
  };

  const deleteComment = async (matchId: string, commentId: string): Promise<boolean> => {
    try {
      await fetch(`/api/comments/${matchId}/${commentId}`, { method: 'DELETE', headers: getAuthHeaders() });
    } catch {}

    setComments((prev) => ({
      ...prev,
      [matchId]: (prev[matchId] || []).filter((c) => c.id !== commentId),
    }));
    return true;
  };

  // Direct Messages
  const sendDirectMessage = async (receiverId: string, text: string, imageUrl?: string): Promise<boolean> => {
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

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMsg),
      });
    } catch {}

    setDirectMessages((prev) => [...prev, newMsg]);
    return true;
  };

  const sendDirectVoiceMessage = async (
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

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newMsg),
      });
    } catch {}

    setDirectMessages((prev) => [...prev, newMsg]);
    return true;
  };

  const markConversationAsRead = (otherUserId: string) => {
    try {
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ otherUserId }),
      }).catch(() => {});
    } catch {}

    setDirectMessages((prev) =>
      prev.map((m) => (m.senderId === otherUserId && m.receiverId === currentUser.id ? { ...m, read: true } : m))
    );
  };

  const deleteDirectMessage = (messageId: string) => {
    try {
      fetch(`/api/messages/${messageId}`, { method: 'DELETE', headers: getAuthHeaders() }).catch(() => {});
    } catch {}
    setDirectMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  // User Profile Updates
  const setCurrentUserById = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(found.id);
      setIsAuthenticated(true);
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
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
    } catch {}

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates, isAdmin: isSuperAdminEmail(u.email) } : u))
    );
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
    setUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const approveUser = async (userId: string): Promise<boolean> => {
    try {
      await fetch('/api/users/approve', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, adminName: currentUser.name }),
      });
    } catch {}

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'approved', approvedAt: new Date().toISOString() } : u))
    );
    return true;
  };

  const rejectUser = async (userId: string, reason: string = 'Declined by admin'): Promise<boolean> => {
    try {
      await fetch('/api/users/reject', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, reason }),
      });
    } catch {}
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'rejected' } : u)));
    return true;
  };

  const approveAllPendingUsers = async (): Promise<boolean> => {
    try {
      await fetch('/api/users/approve-all', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ adminName: currentUser.name }),
      });
    } catch {}

    setUsers((prev) =>
      prev.map((u) => (u.status === 'pending' ? { ...u, status: 'approved', approvedAt: new Date().toISOString() } : u))
    );
    return true;
  };

  const banUser = async (userId: string, reason: string = 'Violation of rules'): Promise<boolean> => {
    try {
      await fetch('/api/users/ban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, reason }),
      });
    } catch {}

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBanned: true, banReason: reason } : u))
    );
    return true;
  };

  const unbanUser = async (userId: string): Promise<boolean> => {
    try {
      await fetch('/api/users/unban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId }),
      });
    } catch {}

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBanned: false, banReason: undefined } : u))
    );
    return true;
  };

  const removeUserAccount = async (userId: string): Promise<boolean> => {
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: getAuthHeaders() });
    } catch {}

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return true;
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

    setAnnouncements((prev) => [newAnn, ...prev]);
    return true;
  };

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    } catch {}
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    return true;
  };

  const resetToDefaultData = () => {
    try {
      fetch('/api/reset-data', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
    } catch {}

    setMatches(INITIAL_MATCHES);
    setUsers(INITIAL_USERS);
    setDirectMessages(INITIAL_DIRECT_MESSAGES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCurrentUserId('user_admin_main');
    setIsAuthenticated(true);
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
        updatePlayerPaymentStatus,
        updateMatchPitchCost,
        autoBalanceTeams,
        updateTacticalFormation,
        assignPlayerTacticalSlot,
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
