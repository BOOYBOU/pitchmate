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

export interface SoccerMatch {
  id: string;
  title: string;
  dateTime: string; // ISO string
  durationMinutes: number;
  location: MatchLocation;
  format?: string;
  maxPlayers: number;
  pricePerPlayer: number; // 0 for free
  totalPitchCost?: number; // Total rental fee of pitch e.g. $100
  paidPlayerIds?: string[]; // IDs of roster players who paid their share
  formationGreen?: string; // e.g. '2-3-1'
  formationBlue?: string; // e.g. '2-3-1'
  tacticalAssignments?: Record<string, string>; // slotKey -> userId
  attendedPlayerIds?: string[]; // IDs of players confirmed attended
  noShowPlayerIds?: string[]; // IDs of players marked no-show
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

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  phone?: string;
  bio?: string;
  preferredPosition?: PlayerPosition;
  skillRating?: number; // 1 to 5
  reliabilityScore?: number; // 0-100% attendance rate
  matchesAttended?: number;
  noShowCount?: number;
  password?: string;
  passwordHash?: string; // Secure SHA-256 hashed password with salt
  passwordSalt?: string;
  isAdmin: boolean;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  status?: 'approved' | 'pending' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
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
  type: 'approval' | 'match_join' | 'waitlist_promoted' | 'cost_reminder' | 'system' | 'team_balance';
  createdAt: string;
  read: boolean;
  linkId?: string;
}

export const SUPER_ADMIN_EMAILS: string[] = [
  'topreviewsamazon2025@gmail.com',
  'bouhbousmustapha@gmail.com',
];
export const SUPER_ADMIN_EMAIL = 'topreviewsamazon2025@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'AZRouww@#$&&$#@9934';

/** Strict check if an email matches an authorized Super Admin / Admin email */
export const isSuperAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (
    SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === clean) ||
    clean === 'topreviewsamazon2025@gmail.com' ||
    clean === 'bouhbousmustapha@gmail.com' ||
    clean.startsWith('admin@') ||
    clean.includes('admin')
  );
};

/** Strict check to verify if a user object holds administrative privileges */
export const isUserAdmin = (user?: Partial<UserProfile> | null): boolean => {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  if (user.email && isSuperAdminEmail(user.email)) return true;
  return false;
};

/** Strict check to verify the single master password for Super Admin */
export const verifySuperAdminMasterPassword = (password: string): boolean => {
  return password === SUPER_ADMIN_PASSWORD;
};

