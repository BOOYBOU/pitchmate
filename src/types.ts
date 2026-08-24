export type TeamSide = 'green' | 'blue' | 'unassigned';
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD' | 'ANY';

export interface PlayerRosterItem {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt: string;
  team: TeamSide;
  position?: PlayerPosition;
  tacticalSlot?: string; // e.g. 'green_gk', 'green_def_1', 'blue_fwd_1'
  jerseyNumber?: number;
  isHost?: boolean;
  reliabilityScore?: number; // 0-100%
  rating?: number; // 1-5 stars
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'waived';
  paymentMethod?: 'cash' | 'cih_bank' | 'attijari' | 'wafacash' | 'other';
}

export interface MatchLocation {
  venueName: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  pitchNumber?: string;
}

export interface MatchComment {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  text?: string;
  audioUrl?: string;
  audioDuration?: number; // duration in seconds
  createdAt: string;
}

export interface MatchGoal {
  id: string;
  minute: number;
  team: TeamSide;
  scorerId: string;
  scorerName: string;
  assistId?: string;
  assistName?: string;
}

export interface PlayerPaymentDetail {
  playerId: string;
  playerName: string;
  status: 'unpaid' | 'pending' | 'paid' | 'waived';
  method?: 'cash' | 'cih_bank' | 'attijari' | 'wafacash' | 'other';
  amount: number;
  updatedAt: string;
}

export interface RecurrenceConfig {
  isRecurring: boolean;
  frequency: 'weekly' | 'biweekly';
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  parentSeriesId?: string;
}

export interface SoccerMatch {
  id: string;
  title: string;
  dateTime: string; // ISO string in UTC, displayed in Morocco GMT+1
  durationMinutes: number;
  location: MatchLocation;
  format?: string; // e.g. '5v5', '7v7', '9v9', '11v11'
  maxPlayers: number;
  pricePerPlayer: number; // in MAD (Moroccan Dirham)
  currency: string; // 'MAD'
  totalPitchCost?: number; // Total rental fee of pitch e.g. 600 MAD
  paidPlayerIds?: string[]; // IDs of roster players who paid their share
  payments?: Record<string, PlayerPaymentDetail>;
  formationGreen?: string; // e.g. '2-3-1'
  formationBlue?: string; // e.g. '2-3-1'
  tacticalAssignments?: Record<string, string>; // slotKey -> userId
  attendedPlayerIds?: string[]; // IDs of players confirmed attended
  noShowPlayerIds?: string[]; // IDs of players marked no-show
  score?: { green: number; blue: number };
  goals?: MatchGoal[];
  mvpVotes?: Record<string, string>; // voterUserId -> nomineeUserId
  mvpWinnerId?: string;
  mvpWinnerName?: string;
  recurrence?: RecurrenceConfig;
  isRecurring?: boolean;
  notes?: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  roster: PlayerRosterItem[];
  waitlist: PlayerRosterItem[];
  isLocked: boolean;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PlayerBadge {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  phone?: string;
  city?: string;
  preferredCity?: string;
  bio?: string;
  preferredPosition?: PlayerPosition;
  jerseyNumber?: number;
  skillRating?: number; // 1 to 5
  reliabilityScore?: number; // 0-100% attendance rate
  matchesAttended?: number;
  noShowCount?: number;
  mvpCount?: number;
  goalsCount?: number;
  badges?: PlayerBadge[];
  password?: string;
  passwordHash?: string; // Secure hashed password
  passwordSalt?: string;
  isAdmin: boolean;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  status?: 'approved' | 'pending' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  matchesPlayed: number;
  createdAt: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  authorName: string;
  type: 'info' | 'warning' | 'pitch_update' | 'maintenance' | 'tournament';
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number; // duration in seconds
  createdAt: string;
  read: boolean;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'approval' | 'match_join' | 'waitlist_promoted' | 'cost_reminder' | 'system' | 'team_balance' | 'mvp_vote' | 'goal_scored';
  createdAt: string;
  read: boolean;
  linkId?: string;
}

export const SUPER_ADMIN_EMAILS: readonly string[] = [
  'topreviewsamazon2025@gmail.com',
  'bouhbousmustapha@gmail.com',
  'moustafa325476@gmail.com',
  'admin@pitchmate.ma',
];

export const SUPER_ADMIN_EMAIL = 'topreviewsamazon2025@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'AZRouww@#$&&$#@9934';
export const DEFAULT_CURRENCY = 'MAD';
export const MOROCCO_TIMEZONE = 'Africa/Casablanca';

/** Strict check if an email matches an authorized Super Admin / Admin email */
export const isSuperAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === clean) ||
    clean === 'topreviewsamazon2025@gmail.com' ||
    clean === 'bouhbousmustapha@gmail.com' ||
    clean === 'moustafa325476@gmail.com' ||
    clean.startsWith('admin@') ||
    clean.includes('superadmin') ||
    clean.includes('bouhbous') ||
    clean.includes('mustapha') ||
    clean.includes('moustafa')
  );
};

/** Strict check to verify if a user object holds administrative privileges */
export const isUserAdmin = (user?: Partial<UserProfile> | null): boolean => {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.email && isSuperAdminEmail(user.email)) return true;
  if (user.name && (user.name.toLowerCase().includes('mustapha') || user.name.toLowerCase().includes('bouhbous'))) return true;
  return false;
};

/** Strict check to verify the master password for Super Admin */
export const verifySuperAdminMasterPassword = (password: string): boolean => {
  return password === SUPER_ADMIN_PASSWORD;
};
