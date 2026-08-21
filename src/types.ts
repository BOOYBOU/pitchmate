export type TeamSide = 'green' | 'blue' | 'unassigned';

export interface PlayerRosterItem {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  joinedAt: string;
  team: TeamSide;
  position?: 'GK' | 'DEF' | 'MID' | 'FWD' | 'ANY';
  jerseyNumber?: number;
  isHost?: boolean;
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

export interface MatchWeather {
  tempC: number;
  tempF: number;
  feelsLikeC?: number;
  feelsLikeF?: number;
  condition: string;
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'cloud-rain' | 'wind' | 'moon' | 'sunset' | 'sunrise' | 'home';
  precipitationChance: number; // percentage (0 - 100)
  windSpeedKmh: number;
  windSpeedMph?: number;
  humidity: number; // percentage (0 - 100)
  dewPointC?: number;
  pitchSuitability: string;
  turfAdvisory?: string;
  advisory: string;
  timeSlotLabel?: string;
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
  receiverId: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number; // duration in seconds
  createdAt: string;
  read: boolean;
}

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';

export interface ActiveVoiceCall {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  status: CallStatus;
  startedAt?: string;
  connectedAt?: string;
  endedAt?: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'approval' | 'match_join' | 'waitlist_promoted' | 'cost_reminder' | 'system' | 'call';
  createdAt: string;
  read: boolean;
  linkId?: string;
}

export const SUPER_ADMIN_EMAIL = 'bouhbousmustapha@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'AZRouww@#$&&$#@9934';

/** Strict check if an email matches the single authorized Super Admin email */
export const isSuperAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
};

/** Strict check to verify the single master password for Super Admin */
export const verifySuperAdminMasterPassword = (password: string): boolean => {
  return password === SUPER_ADMIN_PASSWORD;
};
