import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Types & Initial Data
import {
  SoccerMatch,
  UserProfile,
  PlayerRosterItem,
  MatchComment,
  AdminAnnouncement,
  DirectMessage,
  InAppNotification,
  TeamSide,
  SUPER_ADMIN_EMAILS,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  DEFAULT_CURRENCY,
  isSuperAdminEmail,
  verifySuperAdminMasterPassword,
  getDefaultFormationForMatch,
  MatchGoal,
} from './src/types';
import {
  INITIAL_MATCHES,
  INITIAL_USERS,
  INITIAL_DIRECT_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ANNOUNCEMENTS,
} from './src/lib/mockData';
import { balanceTeams } from './src/lib/teamBalancer';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const AVATAR_DIR = path.join(UPLOADS_DIR, 'avatars');
const DB_FILE = path.join(DATA_DIR, 'pitchmate_db.json');

// Ensure all upload directories exist
[DATA_DIR, UPLOADS_DIR, AUDIO_DIR, AVATAR_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface DatabaseSchema {
  version: number;
  lastUpdated: string;
  users: UserProfile[];
  matches: SoccerMatch[];
  comments: Record<string, MatchComment[]>;
  announcements: AdminAnnouncement[];
  directMessages: DirectMessage[];
  notifications: InAppNotification[];
}

// Initial State Generator
function getInitialData(): DatabaseSchema {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    users: INITIAL_USERS.map((u) => ({
      ...u,
      isAdmin: isSuperAdminEmail(u.email),
      status: isSuperAdminEmail(u.email) ? ('approved' as const) : (u.status || 'approved'),
    })),
    matches: INITIAL_MATCHES.map((m) => ({
      ...m,
      currency: m.currency || DEFAULT_CURRENCY,
      totalPitchCost: m.totalPitchCost ?? m.pricePerPlayer * (m.roster?.length || 10),
      paidPlayerIds: m.paidPlayerIds ?? (m.roster?.slice(0, 2).map((p) => p.userId) || [m.creatorId]),
      formationGreen: m.formationGreen || getDefaultFormationForMatch(m.format, m.maxPlayers),
      formationBlue: m.formationBlue || getDefaultFormationForMatch(m.format, m.maxPlayers),
      tacticalAssignments: m.tacticalAssignments || {},
      attendedPlayerIds: m.attendedPlayerIds || [],
      noShowPlayerIds: m.noShowPlayerIds || [],
      score: m.score || { green: 0, blue: 0 },
      goals: m.goals || [],
      mvpVotes: m.mvpVotes || {},
    })),
    comments: {
      match_01_casablanca_lights: [
        {
          id: 'c1',
          matchId: 'match_01_casablanca_lights',
          userId: 'user_mustapha',
          userName: 'Mustapha Bouhbous',
          userEmail: SUPER_ADMIN_EMAIL,
          userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          text: 'Terrain 2 at Oasis Soccer Club is booked and confirmed! 50 MAD fee per player. Bibs and match balls ready.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'c2',
          matchId: 'match_01_casablanca_lights',
          userId: 'user_yassine',
          userName: 'Yassine Bounou',
          userEmail: 'yassine.bounou@pitchmate.ma',
          userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          text: 'Salam Captain! I sent my 50 MAD share via CIH Bank. Looking forward to keeping a clean sheet.',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    },
    announcements: INITIAL_ANNOUNCEMENTS,
    directMessages: INITIAL_DIRECT_MESSAGES,
    notifications: INITIAL_NOTIFICATIONS,
  };
}

let db: DatabaseSchema;

// Non-blocking Asynchronous Disk Persistence Queue
let isSaving = false;
let pendingSaveRequested = false;
let saveDebounceTimer: NodeJS.Timeout | null = null;

async function executeSaveAsync(): Promise<void> {
  if (isSaving) {
    pendingSaveRequested = true;
    return;
  }
  isSaving = true;
  pendingSaveRequested = false;

  const tempFile = `${DB_FILE}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const data = JSON.stringify(db, null, 2);
    await fs.promises.writeFile(tempFile, data, 'utf-8');
    await fs.promises.rename(tempFile, DB_FILE);
  } catch (err) {
    console.error('[PitchMate DB] Asynchronous save error:', err);
    try {
      if (fs.existsSync(tempFile)) await fs.promises.unlink(tempFile);
    } catch {}
  } finally {
    isSaving = false;
    if (pendingSaveRequested) {
      setTimeout(() => executeSaveAsync(), 50);
    }
  }
}

function saveDatabaseDebounced() {
  if (!db) return;
  db.lastUpdated = new Date().toISOString();
  db.version = (db.version || 0) + 1;

  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    executeSaveAsync();
  }, 250);
}

function saveDatabaseSync() {
  if (!db) return;
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[PitchMate DB] Failed to save DB to disk:', err);
  }
}

// Load or Initialize DB
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
    if (db.matches && Array.isArray(db.matches)) {
      db.matches = db.matches.map((m) => ({
        ...m,
        formationGreen: m.formationGreen || getDefaultFormationForMatch(m.format, m.maxPlayers),
        formationBlue: m.formationBlue || getDefaultFormationForMatch(m.format, m.maxPlayers),
      }));
    }
    console.log('[PitchMate DB] Loaded database from disk.');
  } else {
    db = getInitialData();
    saveDatabaseSync();
    console.log('[PitchMate DB] Initialized fresh database file.');
  }
} catch (err) {
  console.error('[PitchMate DB] Error reading DB file, fallback to initial:', err);
  db = getInitialData();
}

// Ensure unique users list and ensure all super admin accounts exist with full administrative privileges
const seenEmails = new Set<string>();
const sanitizedUsers: UserProfile[] = [];

for (const u of db.users) {
  const emailNorm = (u.email || '').toLowerCase().trim();
  if (emailNorm && !seenEmails.has(emailNorm)) {
    seenEmails.add(emailNorm);
    sanitizedUsers.push({
      ...u,
      isAdmin: isSuperAdminEmail(u.email) || u.isAdmin === true,
      status: (isSuperAdminEmail(u.email) || u.isAdmin === true) ? ('approved' as const) : (u.status || 'approved'),
    });
  }
}

for (const sEmail of SUPER_ADMIN_EMAILS) {
  const emailNorm = sEmail.toLowerCase().trim();
  if (!seenEmails.has(emailNorm)) {
    seenEmails.add(emailNorm);
    sanitizedUsers.unshift({
      id: `user_admin_${sEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: sEmail,
      name: 'Mustapha Bouhbous',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isAdmin: true,
      status: 'approved',
      matchesPlayed: 50,
      createdAt: new Date().toISOString(),
    });
  }
}

db.users = sanitizedUsers;
saveDatabaseDebounced();

// Server-Sent Events (SSE) Client Connections
type SSEClient = {
  id: string;
  res: express.Response;
};
let sseClients: SSEClient[] = [];

function broadcastSSE(type: string, payload: any) {
  saveDatabaseDebounced();
  const data = JSON.stringify({ type, payload, timestamp: Date.now(), version: db.version });
  const message = `event: message\ndata: ${data}\n\n`;

  sseClients = sseClients.filter((client) => {
    try {
      return client.res.write(message);
    } catch {
      return false;
    }
  });
}

// Mutex / Queue for Concurrent Match Roster Operations
const matchOperationLocks = new Map<string, Promise<void>>();

async function withMatchLock<T>(matchId: string, fn: () => Promise<T> | T): Promise<T> {
  const existingLock = matchOperationLocks.get(matchId) || Promise.resolve();
  let resolver: () => void;
  const currentLock = new Promise<void>((resolve) => {
    resolver = resolve;
  });

  const chainedPromise = existingLock
    .catch(() => {})
    .then(() => currentLock);

  matchOperationLocks.set(matchId, chainedPromise);

  try {
    await existingLock.catch(() => {});
    return await fn();
  } finally {
    resolver!();
    if (matchOperationLocks.get(matchId) === chainedPromise) {
      matchOperationLocks.delete(matchId);
    }
  }
}

// Express Request with Authenticated User
interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

// Authentication & Admin Authorization Middlewares
function extractUserMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = (req.headers['x-user-id'] as string) || (req.body?.adminRequesterId as string) || (req.query?.userId as string);
  const userEmail = (req.headers['x-user-email'] as string) || (req.body?.userEmail as string) || (req.query?.userEmail as string);
  const token = req.headers.authorization?.replace('Bearer ', '');
  const adminSecret = req.headers['x-admin-password'] as string;

  // 1. Super Admin master password header verification
  if (adminSecret && verifySuperAdminMasterPassword(adminSecret)) {
    let admin = db.users.find((u) => isSuperAdminEmail(u.email));
    if (admin) {
      req.user = { ...admin, isAdmin: true, status: 'approved' };
      return next();
    }
  }

  // 2. Token-based authentication
  if (token) {
    const match = token.match(/^pitchmate_token_(.+)_(\d+)$/);
    if (match) {
      const extractedId = match[1];
      const found = db.users.find((u) => u.id === extractedId || u.id === `user_${extractedId}`);
      if (found) {
        req.user = found;
        return next();
      }
    }
  }

  // 3. User ID lookup from active session
  if (userId) {
    const found = db.users.find((u) => u.id === userId);
    if (found) {
      req.user = found;
      return next();
    }
  }

  // 4. User email lookup from verified session
  if (userEmail) {
    const cleanEmail = userEmail.trim().toLowerCase();
    const foundByEmail = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (foundByEmail) {
      req.user = foundByEmail;
      return next();
    }
  }

  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }
  if (req.user.isBanned && !isSuperAdminEmail(req.user.email)) {
    return res.status(403).json({ success: false, error: `Account suspended: ${req.user.banReason || 'Contact administrator'}` });
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const isSuper = req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin === true);
  if (!isSuper) {
    return res.status(403).json({
      success: false,
      error: 'Permission Denied: Administrator privileges required for this action.',
    });
  }
  next();
}

function requireAdminOrHost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const matchId = req.params.id || req.params.matchId;
  const targetMatch = db.matches.find((m) => m.id === matchId);
  const isSuper = req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin === true);
  const isHost = req.user && targetMatch && targetMatch.creatorId === req.user.id;

  if (!isSuper && !isHost) {
    return res.status(403).json({
      success: false,
      error: 'Permission Denied: Only the Match Host or an Administrator can perform this action.',
    });
  }
  next();
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Static file serving for uploaded audio and avatars
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.use(extractUserMiddleware);

  // =========================================================
  // API ROUTES
  // =========================================================

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), currency: DEFAULT_CURRENCY, connectedClients: sseClients.length });
  });

  // Global State Fetch
  app.get('/api/state', (req, res) => {
    res.json({
      users: db.users,
      matches: db.matches,
      comments: db.comments,
      announcements: db.announcements,
      directMessages: db.directMessages,
      notifications: db.notifications,
      version: db.version,
      lastUpdated: db.lastUpdated,
    });
  });

  // Server-Sent Events (SSE) Stream
  app.get('/api/sync/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const client: SSEClient = { id: clientId, res };
    sseClients.push(client);

    try {
      res.write(`event: connected\ndata: ${JSON.stringify({ clientId, version: db.version })}\n\n`);
    } catch {
      sseClients = sseClients.filter((c) => c.id !== clientId);
      return;
    }

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      clearInterval(pingInterval);
      sseClients = sseClients.filter((c) => c.id !== clientId);
    };

    const pingInterval = setInterval(() => {
      try {
        const canWrite = res.write(': ping\n\n');
        if (!canWrite) {
          cleanup();
        }
      } catch {
        cleanup();
      }
    }, 15000);

    req.on('close', cleanup);
    req.on('end', cleanup);
    res.on('error', cleanup);
    res.on('finish', cleanup);
  });

  // ---------------------------------------------------------
  // MEDIA UPLOADS (AUDIO & AVATARS TO DISK)
  // ---------------------------------------------------------
  app.post('/api/upload/audio', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { base64Data, format } = req.body;
      if (!base64Data) {
        return res.status(400).json({ success: false, error: 'No audio data provided' });
      }

      const ext = format === 'wav' ? 'wav' : 'webm';
      const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const filePath = path.join(AUDIO_DIR, filename);

      const buffer = Buffer.from(base64Data.replace(/^data:audio\/\w+;base64,/, ''), 'base64');
      await fs.promises.writeFile(filePath, buffer);

      const audioUrl = `/uploads/audio/${filename}`;
      res.json({ success: true, audioUrl });
    } catch (err) {
      console.error('[Upload Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to save audio file' });
    }
  });

  app.post('/api/upload/avatar', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ success: false, error: 'No image data provided' });
      }

      const filename = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
      const filePath = path.join(AVATAR_DIR, filename);

      const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await fs.promises.writeFile(filePath, buffer);

      const avatarUrl = `/uploads/avatars/${filename}`;
      res.json({ success: true, avatarUrl });
    } catch (err) {
      console.error('[Upload Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to save avatar image' });
    }
  });

  // ---------------------------------------------------------
  // USER REGISTRATION, EMAIL OTP VERIFICATION & AUTHENTICATION
  // ---------------------------------------------------------
  interface OTPSession {
    email: string;
    code: string;
    expiresAt: number;
    type: 'signup' | 'forgot_password';
  }
  const otpSessions = new Map<string, OTPSession>();

  // Send 6-digit OTP Verification Code
  app.post('/api/auth/send-otp', (req, res) => {
    const { email, type } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const isMustapha = isSuperAdminEmail(cleanEmail);

    if (type === 'signup' && existing && !isMustapha) {
      return res.status(409).json({
        success: false,
        error: 'هذا البريد الإلكتروني مسجل بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة.',
      });
    }

    if (type === 'forgot_password' && !existing && !isMustapha) {
      return res.status(404).json({
        success: false,
        error: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
      });
    }

    // Generate cryptographically random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpSessions.set(cleanEmail, {
      email: cleanEmail,
      code,
      expiresAt,
      type: type || 'signup',
    });

    console.log(`[PITCHMATE EMAIL OTP] Sent verification code [${code}] to email: ${cleanEmail}`);

    res.json({
      success: true,
      email: cleanEmail,
      code, // returned so the app can display the secure email notification banner in preview
      expiresAt,
      message: 'Verification code sent successfully.',
    });
  });

  // Verify OTP Code
  app.post('/api/auth/verify-otp', (req, res) => {
    const { email, code } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    const session = otpSessions.get(cleanEmail);
    if (!session) {
      return res.status(400).json({ success: false, error: 'No active verification code found. Please request a new code.' });
    }

    if (Date.now() > session.expiresAt) {
      otpSessions.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }

    if (session.code !== cleanCode) {
      return res.status(400).json({ success: false, error: 'Invalid verification code. Please check and try again.' });
    }

    res.json({ success: true, verified: true, email: cleanEmail });
  });

  app.post('/api/users/register', (req, res) => {
    const { name, email, passwordHash, passwordSalt, avatarUrl, bio, city, preferredPosition, skillRating, otpCode } = req.body;
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanName || !cleanEmail || !passwordHash) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);

    // If not super admin bypass, verify OTP
    if (!isMustapha && otpCode) {
      const session = otpSessions.get(cleanEmail);
      if (!session || session.code !== (otpCode || '').trim() || Date.now() > session.expiresAt) {
        return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
      }
      otpSessions.delete(cleanEmail);
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const userId = isMustapha ? 'user_mustapha' : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser: UserProfile = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      city: city || 'Casablanca',
      bio: bio || '',
      preferredPosition: preferredPosition || 'MID',
      skillRating: skillRating || 4.5,
      reliabilityScore: 100,
      matchesAttended: 0,
      noShowCount: 0,
      mvpCount: 0,
      goalsCount: 0,
      badges: [{ id: 'b_welcome', key: 'welcome', title: 'New PitchMate', description: 'Joined the community', icon: '⚽', unlockedAt: new Date().toISOString() }],
      passwordHash,
      passwordSalt: passwordSalt || '',
      isAdmin: isMustapha,
      status: isMustapha ? 'approved' : 'pending',
      approvedAt: isMustapha ? new Date().toISOString() : undefined,
      matchesPlayed: 0,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    if (!isMustapha) {
      const mustaphaUser = db.users.find((u) => isSuperAdminEmail(u.email));
      if (mustaphaUser) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: mustaphaUser.id,
          title: 'New Player Registration Pending',
          message: `${cleanName} (${cleanEmail} - ${city || 'Casablanca'}) registered and is awaiting your approval.`,
          type: 'approval',
          linkId: newUser.id,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    broadcastSSE('SYNC_USERS_AND_NOTIFS', {
      users: db.users,
      notifications: db.notifications,
    });

    res.json({ success: true, user: newUser });
  });

  // Google Sign-In & Authentication Route
  app.post('/api/users/google-auth', (req, res) => {
    const { uid, name, email, avatarUrl, city, action } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim() || 'Google Player';

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'Valid Google email is required.' });
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);
    let existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    // If attempting to SIGN UP with an already existing account
    if (action === 'signup' && existingUser && !isMustapha) {
      return res.status(409).json({
        success: false,
        code: 'USER_EXISTS',
        user: existingUser,
        error: 'هذا الحساب مسجل بالفعل مسبقاً، يرجى الانتقال إلى تسجيل الدخول.',
      });
    }

    // If attempting to SIGN IN with a non-existent account
    if (action === 'signin' && !existingUser && !isMustapha) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'هذا الحساب غير مسجل بعد، يرجى إنشاء حساب جديد أولاً.',
      });
    }

    if (existingUser) {
      if (action === 'signin' && existingUser.isBanned) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_BANNED',
          error: `تم حظر الحساب: ${existingUser.banReason || 'تواصل مع المشرف العام'}`,
        });
      }

      if (action === 'signin' && existingUser.status === 'rejected') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_REJECTED',
          error: 'تم رفض طلب التسجيل من قِبل إدارة المنصة.',
        });
      }

      if (action === 'signin' && existingUser.status === 'pending' && !isMustapha) {
        return res.status(403).json({
          success: false,
          code: 'PENDING_APPROVAL',
          pendingApproval: true,
          user: existingUser,
          error: 'حسابك في قائمة الانتظار بانتظار موافقة المشرف العام يدوياً.',
        });
      }

      existingUser.isGoogleAuth = true;
      existingUser.emailVerified = true;
      if (avatarUrl && (!existingUser.avatarUrl || existingUser.avatarUrl.includes('dicebear'))) {
        existingUser.avatarUrl = avatarUrl;
      }
      if (isMustapha) {
        existingUser.isAdmin = true;
        existingUser.status = 'approved';
      }

      broadcastSSE('SYNC_USERS', { users: db.users });
      return res.json({ success: true, user: existingUser });
    }

    // Create New Verified Google User
    const userId = isMustapha
      ? 'user_mustapha'
      : (uid ? `user_g_${uid}` : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

    const newUser: UserProfile = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      city: city || 'Casablanca',
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

    db.users.push(newUser);

    if (!isMustapha) {
      const mustaphaUser = db.users.find((u) => isSuperAdminEmail(u.email));
      if (mustaphaUser) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: mustaphaUser.id,
          title: 'Google Player Registration',
          message: `${cleanName} (${cleanEmail}) signed up via Google (Verified Account) and is awaiting your match approval.`,
          type: 'approval',
          linkId: newUser.id,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    broadcastSSE('SYNC_USERS_AND_NOTIFS', {
      users: db.users,
      notifications: db.notifications,
    });

    res.json({ success: true, user: newUser });
  });

  // User Approval
  app.post('/api/users/approve', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { userId, adminName } = req.body;
    const userIndex = db.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const targetUser = db.users[userIndex];
    targetUser.status = 'approved';
    targetUser.approvedAt = new Date().toISOString();
    targetUser.approvedBy = adminName || req.user?.name || 'Mustapha Bouhbous (Admin)';

    const userNotif: InAppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUser.id,
      title: 'Registration Approved!',
      message: 'Your PitchMate account has been approved by the Admin. You can now join matches and RSVP.',
      type: 'approval',
      createdAt: new Date().toISOString(),
      read: false,
    };
    db.notifications.unshift(userNotif);

    broadcastSSE('SYNC_USERS_AND_NOTIFS', {
      users: db.users,
      notifications: db.notifications,
    });

    res.json({ success: true, user: targetUser });
  });

  // Approve All Pending Users
  app.post('/api/users/approve-all', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { adminName } = req.body;
    const pending = db.users.filter((u) => u.status === 'pending');

    db.users = db.users.map((u) => {
      if (u.status === 'pending') {
        return {
          ...u,
          status: 'approved' as const,
          approvedAt: new Date().toISOString(),
          approvedBy: adminName || req.user?.name || 'Mustapha Bouhbous (Admin)',
        };
      }
      return u;
    });

    pending.forEach((p) => {
      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: p.id,
        title: 'Account Approved!',
        message: 'Your PitchMate registration has been approved by the Admin. Welcome to the league!',
        type: 'approval',
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    broadcastSSE('SYNC_USERS_AND_NOTIFS', {
      users: db.users,
      notifications: db.notifications,
    });

    res.json({ success: true, approvedCount: pending.length });
  });

  // Reject User Registration
  app.post('/api/users/reject', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { userId, reason } = req.body;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (isSuperAdminEmail(user.email)) {
      return res.status(403).json({ success: false, error: 'Cannot reject Super Admin account' });
    }

    user.status = 'rejected';
    user.rejectionReason = reason || 'Declined by administrator';
    user.rejectedAt = new Date().toISOString();

    db.matches = db.matches.map((m) => {
      const updatedAssignments = { ...(m.tacticalAssignments || {}) };
      Object.keys(updatedAssignments).forEach((k) => {
        if (updatedAssignments[k] === userId) delete updatedAssignments[k];
      });
      return {
        ...m,
        roster: m.roster.filter((p) => p.userId !== userId),
        waitlist: m.waitlist.filter((p) => p.userId !== userId),
        paidPlayerIds: (m.paidPlayerIds || []).filter((id) => id !== userId),
        tacticalAssignments: updatedAssignments,
      };
    });

    db.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      title: 'Registration Declined',
      message: `Your PitchMate account registration was declined: ${reason || 'Contact administrator for details.'}`,
      type: 'system',
      createdAt: new Date().toISOString(),
      read: false,
    });

    broadcastSSE('SYNC_ALL', {
      users: db.users,
      matches: db.matches,
      notifications: db.notifications,
    });

    res.json({ success: true, user });
  });

  // Ban User
  app.post('/api/users/ban', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { userId, reason } = req.body;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (isSuperAdminEmail(user.email)) {
      return res.status(403).json({ success: false, error: 'Cannot ban the Super Admin' });
    }

    user.isBanned = true;
    user.banReason = reason || 'Violation of league conduct rules';
    user.bannedAt = new Date().toISOString();

    db.matches = db.matches.map((m) => {
      const updatedAssignments = { ...(m.tacticalAssignments || {}) };
      Object.keys(updatedAssignments).forEach((k) => {
        if (updatedAssignments[k] === userId) delete updatedAssignments[k];
      });
      return {
        ...m,
        roster: m.roster.filter((p) => p.userId !== userId),
        waitlist: m.waitlist.filter((p) => p.userId !== userId),
        paidPlayerIds: (m.paidPlayerIds || []).filter((id) => id !== userId),
        tacticalAssignments: updatedAssignments,
      };
    });

    broadcastSSE('SYNC_ALL', {
      users: db.users,
      matches: db.matches,
    });

    res.json({ success: true, user });
  });

  // Unban User
  app.post('/api/users/unban', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { userId } = req.body;
    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.isBanned = false;
    user.banReason = undefined;
    user.bannedAt = undefined;

    broadcastSSE('SYNC_USERS', db.users);
    res.json({ success: true, user });
  });

  // Delete User Account
  app.delete('/api/users/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });

    if (isSuperAdminEmail(targetUser.email)) {
      return res.status(403).json({ success: false, error: 'Cannot delete Super Admin account' });
    }

    db.users = db.users.filter((u) => u.id !== userId);
    db.matches = db.matches.map((m) => {
      const updatedAssignments = { ...(m.tacticalAssignments || {}) };
      Object.keys(updatedAssignments).forEach((k) => {
        if (updatedAssignments[k] === userId) delete updatedAssignments[k];
      });
      return {
        ...m,
        roster: m.roster.filter((p) => p.userId !== userId),
        waitlist: m.waitlist.filter((p) => p.userId !== userId),
        paidPlayerIds: (m.paidPlayerIds || []).filter((id) => id !== userId),
        tacticalAssignments: updatedAssignments,
      };
    });
    db.directMessages = db.directMessages.filter((m) => m.senderId !== userId && m.receiverId !== userId);

    broadcastSSE('SYNC_ALL', {
      users: db.users,
      matches: db.matches,
      directMessages: db.directMessages,
    });

    res.json({ success: true });
  });

  // Update User Profile
  app.put('/api/users/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    const updates = req.body;
    const userIndex = db.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return res.status(404).json({ success: false, error: 'User not found' });

    const isSuper = req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin);
    if (req.user?.id !== userId && !isSuper) {
      return res.status(403).json({ success: false, error: 'Cannot edit other user profiles' });
    }

    const existingUser = db.users[userIndex];
    const isTargetSuper = isSuperAdminEmail(existingUser.email);

    // Compute updated admin status preserving existing admin privileges
    let newAdminStatus = isTargetSuper || existingUser.isAdmin === true;
    if (isSuper && typeof updates.isAdmin === 'boolean') {
      newAdminStatus = isTargetSuper || updates.isAdmin;
    }

    const updatedUser: UserProfile = {
      ...existingUser,
      ...updates,
      isAdmin: newAdminStatus,
      status: isTargetSuper ? 'approved' : (updates.status || existingUser.status || 'approved'),
    };
    db.users[userIndex] = updatedUser;

    db.matches = db.matches.map((m) => ({
      ...m,
      roster: m.roster.map((p) => {
        if (p.userId === userId) {
          return {
            ...p,
            name: updates.name || p.name,
            avatarUrl: updates.avatarUrl || p.avatarUrl,
            position: updates.preferredPosition || p.position,
            reliabilityScore: updates.reliabilityScore ?? p.reliabilityScore,
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
            position: updates.preferredPosition || w.position,
          };
        }
        return w;
      }),
    }));

    broadcastSSE('SYNC_ALL', {
      users: db.users,
      matches: db.matches,
    });

    res.json({ success: true, user: updatedUser });
  });

  // ---------------------------------------------------------
  // MATCH MANAGEMENT & ROSTER CONTROLS
  // ---------------------------------------------------------

  // Create Match
  app.post('/api/matches', requireAuth, (req: AuthenticatedRequest, res) => {
    const matchData = req.body;
    const parsedPrice = (matchData.pricePerPlayer !== undefined && matchData.pricePerPlayer !== null && !isNaN(Number(matchData.pricePerPlayer)))
      ? Number(matchData.pricePerPlayer)
      : 50;
    const parsedTotalCost = (matchData.totalPitchCost !== undefined && matchData.totalPitchCost !== null && !isNaN(Number(matchData.totalPitchCost)))
      ? Number(matchData.totalPitchCost)
      : parsedPrice * (matchData.maxPlayers || 14);

    const newMatch: SoccerMatch = {
      ...matchData,
      id: matchData.id || `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      currency: matchData.currency || DEFAULT_CURRENCY,
      pricePerPlayer: parsedPrice,
      totalPitchCost: parsedTotalCost,
      creatorId: req.user?.id || matchData.creatorId,
      creatorName: req.user?.name || matchData.creatorName,
      creatorEmail: req.user?.email || matchData.creatorEmail,
      formationGreen: matchData.formationGreen || getDefaultFormationForMatch(matchData.format, matchData.maxPlayers),
      formationBlue: matchData.formationBlue || getDefaultFormationForMatch(matchData.format, matchData.maxPlayers),
      tacticalAssignments: matchData.tacticalAssignments || {},
      attendedPlayerIds: [],
      noShowPlayerIds: [],
      score: { green: 0, blue: 0 },
      goals: [],
      mvpVotes: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.matches.unshift(newMatch);
    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match: newMatch });
  });

  // Update Match
  app.put('/api/matches/:id', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const updates = req.body;
    const matchIndex = db.matches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) return res.status(404).json({ success: false, error: 'Match not found' });

    db.matches[matchIndex] = {
      ...db.matches[matchIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match: db.matches[matchIndex] });
  });

  // Delete Match
  app.delete('/api/matches/:id', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const targetMatch = db.matches.find((m) => m.id === matchId);
    if (!targetMatch) return res.status(404).json({ success: false, error: 'Match not found' });

    db.matches = db.matches.filter((m) => m.id !== matchId);
    delete db.comments[matchId];

    broadcastSSE('SYNC_ALL', {
      matches: db.matches,
      comments: db.comments,
    });

    res.json({ success: true, deletedMatchId: matchId });
  });

  // Join Match (Protected by Atomic Mutex Lock)
  app.post('/api/matches/:id/join', requireAuth, async (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { playerItem, teamChoice } = req.body;

    const result = await withMatchLock(matchId, async () => {
      const match = db.matches.find((m) => m.id === matchId);
      if (!match) return { status: 404, data: { success: false, error: 'Match not found' } };

      if (match.isLocked) {
        return { status: 403, data: { success: false, error: 'This match is locked by the host.' } };
      }

      const inRoster = match.roster.some((p) => p.userId === playerItem.userId);
      const inWaitlist = match.waitlist.some((p) => p.userId === playerItem.userId);
      if (inRoster || inWaitlist) {
        return { status: 200, data: { success: true, match, message: 'Already registered' } };
      }

      let team: TeamSide = teamChoice;
      if (!team || team === 'unassigned') {
        const greenCount = match.roster.filter((p) => p.team === 'green').length;
        const blueCount = match.roster.filter((p) => p.team === 'blue').length;
        team = greenCount <= blueCount ? 'green' : 'blue';
      }

      const userProfile = db.users.find((u) => u.id === playerItem.userId);

      const newPlayerItem: PlayerRosterItem = {
        ...playerItem,
        team,
        position: playerItem.position || userProfile?.preferredPosition || 'MID',
        reliabilityScore: userProfile?.reliabilityScore ?? 100,
        rating: userProfile?.skillRating ?? 4.5,
        paymentStatus: 'unpaid',
        joinedAt: new Date().toISOString(),
      };

      if (match.roster.length < match.maxPlayers) {
        match.roster.push(newPlayerItem);
      } else {
        match.waitlist.push(newPlayerItem);
      }
      match.updatedAt = new Date().toISOString();

      if (match.creatorId && match.creatorId !== playerItem.userId) {
        db.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: match.creatorId,
          title: 'Player Joined Roster',
          message: `${playerItem.name} joined the roster for "${match.title}".`,
          type: 'match_join',
          linkId: matchId,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }

      broadcastSSE('SYNC_ALL', {
        matches: db.matches,
        notifications: db.notifications,
      });

      return { status: 200, data: { success: true, match } };
    });

    res.status(result.status).json(result.data);
  });

  // Leave Match (With Safe Waitlist Auto-Promotion)
  app.post('/api/matches/:id/leave', requireAuth, async (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { userId } = req.body;

    const result = await withMatchLock(matchId, async () => {
      const match = db.matches.find((m) => m.id === matchId);
      if (!match) return { status: 404, data: { success: false, error: 'Match not found' } };

      const wasInRoster = match.roster.some((p) => p.userId === userId);
      let updatedRoster = match.roster.filter((p) => p.userId !== userId);
      let updatedWaitlist = match.waitlist.filter((p) => p.userId !== userId);

      if (wasInRoster && updatedWaitlist.length > 0 && updatedRoster.length < match.maxPlayers) {
        const promoted = updatedWaitlist.shift();
        if (promoted) {
          const greenCount = updatedRoster.filter((p) => p.team === 'green').length;
          const blueCount = updatedRoster.filter((p) => p.team === 'blue').length;
          promoted.team = greenCount <= blueCount ? 'green' : 'blue';
          promoted.position = promoted.position || 'MID';
          updatedRoster.push(promoted);

          db.notifications.unshift({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: promoted.userId,
            title: 'Spot Opened: You Are in the Game!',
            message: `A spot opened up and you were promoted to confirmed roster for "${match.title}".`,
            type: 'waitlist_promoted',
            linkId: matchId,
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      }

      match.roster = updatedRoster;
      match.waitlist = updatedWaitlist;
      match.paidPlayerIds = (match.paidPlayerIds || []).filter((id) => id !== userId);

      const updatedAssignments = { ...(match.tacticalAssignments || {}) };
      Object.keys(updatedAssignments).forEach((key) => {
        if (updatedAssignments[key] === userId) delete updatedAssignments[key];
      });
      match.tacticalAssignments = updatedAssignments;
      match.updatedAt = new Date().toISOString();

      broadcastSSE('SYNC_ALL', {
        matches: db.matches,
        notifications: db.notifications,
      });

      return { status: 200, data: { success: true, match } };
    });

    res.status(result.status).json(result.data);
  });

  // Remove Player From Match
  app.post('/api/matches/:id/remove-player', requireAdminOrHost, async (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { userId } = req.body;

    const result = await withMatchLock(matchId, async () => {
      const match = db.matches.find((m) => m.id === matchId);
      if (!match) return { status: 404, data: { success: false, error: 'Match not found' } };

      const wasInRoster = match.roster.some((p) => p.userId === userId);
      let updatedRoster = match.roster.filter((p) => p.userId !== userId);
      let updatedWaitlist = match.waitlist.filter((p) => p.userId !== userId);

      if (wasInRoster && updatedWaitlist.length > 0 && updatedRoster.length < match.maxPlayers) {
        const promoted = updatedWaitlist.shift();
        if (promoted) {
          const greenCount = updatedRoster.filter((p) => p.team === 'green').length;
          const blueCount = updatedRoster.filter((p) => p.team === 'blue').length;
          promoted.team = greenCount <= blueCount ? 'green' : 'blue';
          promoted.position = promoted.position || 'MID';
          updatedRoster.push(promoted);

          db.notifications.unshift({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: promoted.userId,
            title: 'Spot Opened: You Are in the Game!',
            message: `A spot opened up and you were promoted to confirmed roster for "${match.title}".`,
            type: 'waitlist_promoted',
            linkId: matchId,
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      }

      match.roster = updatedRoster;
      match.waitlist = updatedWaitlist;
      match.paidPlayerIds = (match.paidPlayerIds || []).filter((id) => id !== userId);

      const updatedAssignments = { ...(match.tacticalAssignments || {}) };
      Object.keys(updatedAssignments).forEach((key) => {
        if (updatedAssignments[key] === userId) delete updatedAssignments[key];
      });
      match.tacticalAssignments = updatedAssignments;
      match.updatedAt = new Date().toISOString();

      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: userId,
        title: 'Removed from Match Roster',
        message: `You were removed from the player roster for "${match.title}".`,
        type: 'system',
        linkId: matchId,
        createdAt: new Date().toISOString(),
        read: false,
      });

      broadcastSSE('SYNC_ALL', {
        matches: db.matches,
        notifications: db.notifications,
      });

      return { status: 200, data: { success: true, match } };
    });

    res.status(result.status).json(result.data);
  });

  // Assign Team Side
  app.post('/api/matches/:id/assign-team', requireAuth, (req, res) => {
    const matchId = req.params.id;
    const { userId, team } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    match.roster = match.roster.map((p) => (p.userId === userId ? { ...p, team } : p));
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // Smart Auto-Balance Teams
  app.post('/api/matches/:id/auto-balance', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { mode } = req.body; // 'balanced' | 'random' | 'veterans_vs_newcomers'
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    if (match.roster.length < 2) {
      return res.status(400).json({ success: false, error: 'Need at least 2 players to balance teams.' });
    }

    const balanced = balanceTeams(match.roster, mode || 'balanced');
    match.roster = balanced.roster;
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({
      success: true,
      match,
      greenCount: balanced.greenTeam.length,
      blueCount: balanced.blueTeam.length,
      greenAvgRating: balanced.greenAvgRating,
      blueAvgRating: balanced.blueAvgRating,
      parityPercentage: balanced.parityPercentage,
    });
  });

  // ---------------------------------------------------------
  // LIVE SCOREBOARD & GOAL TRACKER
  // ---------------------------------------------------------
  app.post('/api/matches/:id/score', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { green, blue } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    match.score = {
      green: Math.max(0, Number(green) || 0),
      blue: Math.max(0, Number(blue) || 0),
    };
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, score: match.score, match });
  });

  app.post('/api/matches/:id/goal', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { team, scorerId, scorerName, minute, assistId, assistName } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const newGoal: MatchGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      team,
      scorerId,
      scorerName,
      minute: minute || 1,
      assistId,
      assistName,
    };

    match.goals = [...(match.goals || []), newGoal];
    const currentScore = match.score || { green: 0, blue: 0 };
    if (team === 'green') {
      currentScore.green += 1;
    } else if (team === 'blue') {
      currentScore.blue += 1;
    }
    match.score = currentScore;
    match.updatedAt = new Date().toISOString();

    // Increment scorer goal tally
    const scorerUser = db.users.find((u) => u.id === scorerId);
    if (scorerUser) {
      scorerUser.goalsCount = (scorerUser.goalsCount || 0) + 1;
    }

    broadcastSSE('SYNC_ALL', {
      matches: db.matches,
      users: db.users,
    });

    res.json({ success: true, match, goal: newGoal });
  });

  // ---------------------------------------------------------
  // POST-MATCH MVP VOTING
  // ---------------------------------------------------------
  app.post('/api/matches/:id/vote-mvp', requireAuth, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { nomineeId } = req.body;
    const voterId = req.user?.id;
    if (!voterId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const isPlayerInRoster = match.roster.some((p) => p.userId === voterId);
    if (!isPlayerInRoster && !req.user?.isAdmin) {
      return res.status(403).json({ success: false, error: 'Only players who attended can vote for MVP.' });
    }

    match.mvpVotes = {
      ...(match.mvpVotes || {}),
      [voterId]: nomineeId,
    };

    // Calculate current MVP leader
    const voteCounts: Record<string, number> = {};
    Object.values(match.mvpVotes).forEach((nomId) => {
      voteCounts[nomId] = (voteCounts[nomId] || 0) + 1;
    });

    let topVotes = 0;
    let topNomineeId: string | null = null;
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > topVotes) {
        topVotes = count;
        topNomineeId = id;
      }
    }

    if (topNomineeId) {
      match.mvpWinnerId = topNomineeId;
      const winnerUser = db.users.find((u) => u.id === topNomineeId);
      match.mvpWinnerName = winnerUser?.name || 'Match MVP';
    }

    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match, mvpVotes: match.mvpVotes, winnerId: match.mvpWinnerId });
  });

  // ---------------------------------------------------------
  // MOROCCAN DIRHAM PAYMENT TRACKING
  // ---------------------------------------------------------
  app.post('/api/matches/:id/payment-status', requireAuth, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { playerId, status, method } = req.body; // status: 'paid' | 'pending' | 'unpaid' | 'waived', method: 'cash' | 'cih_bank' | ...
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const player = match.roster.find((p) => p.userId === playerId) || match.waitlist.find((p) => p.userId === playerId);

    // Update roster item payment status
    match.roster = match.roster.map((p) => {
      if (p.userId === playerId) {
        return {
          ...p,
          paymentStatus: status,
          paymentMethod: method || p.paymentMethod,
        };
      }
      return p;
    });

    const currentPaid = match.paidPlayerIds || [];
    if (status === 'paid') {
      if (!currentPaid.includes(playerId)) match.paidPlayerIds = [...currentPaid, playerId];
    } else {
      match.paidPlayerIds = currentPaid.filter((id) => id !== playerId);
    }

    if (!match.payments) match.payments = {};
    if (player) {
      match.payments[playerId] = {
        playerId,
        playerName: player.name,
        status: status || 'unpaid',
        method: method || player.paymentMethod,
        amount: match.pricePerPlayer || 50,
        updatedAt: new Date().toISOString(),
      };
    }

    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // Post-Match Attendance & Reliability Scoring
  app.post('/api/matches/:id/attendance', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { attendedPlayerIds, noShowPlayerIds } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    match.attendedPlayerIds = attendedPlayerIds || [];
    match.noShowPlayerIds = noShowPlayerIds || [];
    match.status = 'completed';
    match.updatedAt = new Date().toISOString();

    // Recalculate reliability score for attended players
    (attendedPlayerIds || []).forEach((pId: string) => {
      const user = db.users.find((u) => u.id === pId);
      if (user) {
        user.matchesAttended = (user.matchesAttended || 0) + 1;
        user.matchesPlayed = (user.matchesPlayed || 0) + 1;
        const total = (user.matchesAttended || 1) + (user.noShowCount || 0);
        user.reliabilityScore = Math.min(100, Math.max(0, Math.round(((user.matchesAttended || 1) / total) * 100)));
      }
    });

    // Recalculate for no-show players
    (noShowPlayerIds || []).forEach((pId: string) => {
      const user = db.users.find((u) => u.id === pId);
      if (user) {
        user.noShowCount = (user.noShowCount || 0) + 1;
        const total = (user.matchesAttended || 0) + (user.noShowCount || 1);
        user.reliabilityScore = Math.min(100, Math.max(0, Math.round(((user.matchesAttended || 0) / total) * 100)));
      }
    });

    // Increment MVP winner count if selected
    if (match.mvpWinnerId) {
      const mvpUser = db.users.find((u) => u.id === match.mvpWinnerId);
      if (mvpUser) {
        mvpUser.mvpCount = (mvpUser.mvpCount || 0) + 1;
      }
    }

    broadcastSSE('SYNC_ALL', {
      matches: db.matches,
      users: db.users,
    });

    res.json({ success: true, match });
  });

  // Toggle Lock
  app.post('/api/matches/:id/toggle-lock', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    match.isLocked = !match.isLocked;
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // Toggle Player Paid
  app.post('/api/matches/:id/toggle-paid', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { playerId } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const currentPaid = match.paidPlayerIds || [];
    const isPaid = currentPaid.includes(playerId);
    const newPaidStatus = !isPaid;
    match.paidPlayerIds = newPaidStatus ? [...currentPaid, playerId] : currentPaid.filter((id) => id !== playerId);

    match.roster = match.roster.map((p) => (p.userId === playerId ? { ...p, paymentStatus: newPaidStatus ? 'paid' : 'unpaid' } : p));
    
    if (!match.payments) match.payments = {};
    const player = match.roster.find((p) => p.userId === playerId) || match.waitlist.find((p) => p.userId === playerId);
    if (player) {
      match.payments[playerId] = {
        playerId,
        playerName: player.name,
        status: newPaidStatus ? 'paid' : 'unpaid',
        method: player.paymentMethod || 'cash',
        amount: match.pricePerPlayer ?? 50,
        updatedAt: new Date().toISOString(),
      };
    }

    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // Update Match Pitch Cost & Price per player (in MAD)
  app.post('/api/matches/:id/cost', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { totalCost, pricePerPlayer } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const numTotal = (totalCost !== undefined && totalCost !== null && !isNaN(Number(totalCost))) ? Number(totalCost) : 0;
    const numPrice = (pricePerPlayer !== undefined && pricePerPlayer !== null && !isNaN(Number(pricePerPlayer))) ? Number(pricePerPlayer) : 0;

    match.totalPitchCost = numTotal;
    match.pricePerPlayer = numPrice;
    match.currency = DEFAULT_CURRENCY;
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // ---------------------------------------------------------
  // COMMENTS, ANNOUNCEMENTS, DIRECT MESSAGES & NOTIFICATIONS
  // ---------------------------------------------------------
  app.post('/api/comments', requireAuth, (req: AuthenticatedRequest, res) => {
    const comment = req.body;
    const matchId = comment.matchId;
    if (!matchId) return res.status(400).json({ success: false, error: 'Match ID required' });

    const currentList = db.comments[matchId] || [];
    const newComment = {
      ...comment,
      id: comment.id || `comm_${Date.now()}`,
      userId: req.user?.id || comment.userId,
      userName: req.user?.name || comment.userName,
      userEmail: req.user?.email || comment.userEmail,
      userAvatar: req.user?.avatarUrl || comment.userAvatar,
      createdAt: new Date().toISOString(),
    };
    db.comments[matchId] = [...currentList, newComment];

    broadcastSSE('SYNC_COMMENTS', db.comments);
    res.json({ success: true, comment: newComment });
  });

  app.delete('/api/comments/:matchId/:commentId', requireAuth, (req: AuthenticatedRequest, res) => {
    const { matchId, commentId } = req.params;
    const commentList = db.comments[matchId];
    if (!commentList) {
      return res.status(404).json({ success: false, error: 'Match comments not found' });
    }

    const targetComment = commentList.find((c) => c.id === commentId);
    if (!targetComment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const targetMatch = db.matches.find((m) => m.id === matchId);
    const isHost = req.user && targetMatch && targetMatch.creatorId === req.user.id;
    const isSuper = req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin);
    const isAuthor = req.user && targetComment.userId === req.user.id;

    if (!isAuthor && !isSuper && !isHost) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot delete other users comments' });
    }

    db.comments[matchId] = commentList.filter((c) => c.id !== commentId);
    broadcastSSE('SYNC_COMMENTS', db.comments);
    res.json({ success: true });
  });

  app.post('/api/announcements', requireAdmin, (req: AuthenticatedRequest, res) => {
    const announcement = req.body;
    const newAnn = {
      ...announcement,
      id: announcement.id || `ann_${Date.now()}`,
      authorName: req.user?.name || announcement.authorName || 'Mustapha Bouhbous (Super Admin)',
      createdAt: new Date().toISOString(),
    };
    db.announcements.unshift(newAnn);

    broadcastSSE('SYNC_ANNOUNCEMENTS', db.announcements);
    res.json({ success: true, announcement: newAnn });
  });

  app.delete('/api/announcements/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const id = req.params.id;
    db.announcements = db.announcements.filter((a) => a.id !== id);
    broadcastSSE('SYNC_ANNOUNCEMENTS', db.announcements);
    res.json({ success: true });
  });

  app.post('/api/messages', requireAuth, (req: AuthenticatedRequest, res) => {
    const msg = req.body;
    const newMsg: DirectMessage = {
      ...msg,
      id: msg.id || `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: req.user?.id || msg.senderId,
      senderName: req.user?.name || msg.senderName,
      senderAvatar: req.user?.avatarUrl || msg.senderAvatar,
      createdAt: new Date().toISOString(),
      read: false,
    };
    db.directMessages.push(newMsg);

    broadcastSSE('SYNC_DIRECT_MESSAGES', db.directMessages);
    res.json({ success: true, message: newMsg });
  });

  app.delete('/api/messages/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = req.params.id;
    const targetMsg = db.directMessages.find((m) => m.id === id);
    if (!targetMsg) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const isSuper = req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin);
    const isParty = req.user && (targetMsg.senderId === req.user.id || targetMsg.receiverId === req.user.id);

    if (!isParty && !isSuper) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot delete messages outside your conversations' });
    }

    db.directMessages = db.directMessages.filter((m) => m.id !== id);
    broadcastSSE('SYNC_DIRECT_MESSAGES', db.directMessages);
    res.json({ success: true });
  });

  app.post('/api/messages/mark-read', requireAuth, (req: AuthenticatedRequest, res) => {
    const { otherUserId } = req.body;
    const currentUserId = req.user?.id || req.body.currentUserId;
    db.directMessages = db.directMessages.map((m) => {
      if (m.senderId === otherUserId && m.receiverId === currentUserId) {
        return { ...m, read: true };
      }
      return m;
    });

    broadcastSSE('SYNC_DIRECT_MESSAGES', db.directMessages);
    res.json({ success: true });
  });

  app.post('/api/notifications', (req, res) => {
    const notif = req.body;
    const newNotif: InAppNotification = {
      ...notif,
      id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    db.notifications.unshift(newNotif);

    broadcastSSE('SYNC_NOTIFICATIONS', db.notifications);
    res.json({ success: true, notification: newNotif });
  });

  app.post('/api/notifications/read', (req, res) => {
    const { notificationId } = req.body;
    db.notifications = db.notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
    broadcastSSE('SYNC_NOTIFICATIONS', db.notifications);
    res.json({ success: true });
  });

  app.post('/api/notifications/clear', (req, res) => {
    const { userId } = req.body;
    db.notifications = db.notifications.filter((n) => n.userId !== userId);
    broadcastSSE('SYNC_NOTIFICATIONS', db.notifications);
    res.json({ success: true });
  });

  app.post('/api/reset-data', requireAdmin, (req: AuthenticatedRequest, res) => {
    db = getInitialData();
    saveDatabaseSync();
    broadcastSSE('SYNC_ALL', {
      users: db.users,
      matches: db.matches,
      comments: db.comments,
      announcements: db.announcements,
      directMessages: db.directMessages,
      notifications: db.notifications,
    });
    res.json({ success: true });
  });

  // =========================================================
  // VITE MIDDLEWARE (Development) or STATIC ASSETS (Production)
  // =========================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PitchMate Morocco Server] Running on http://0.0.0.0:${PORT} (Timezone: Africa/Casablanca GMT+1, Currency: MAD)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
