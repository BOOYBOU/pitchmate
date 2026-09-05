import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
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
  MESSI_AVATAR_URL,
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
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const DB_FILE = path.join(DATA_DIR, 'pitchmate_db.json');

// Ensure all upload directories exist
[DATA_DIR, UPLOADS_DIR, AUDIO_DIR, AVATAR_DIR, IMAGES_DIR].forEach((dir) => {
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
          userAvatar: MESSI_AVATAR_URL,
          text: 'Terrain 2 at Oasis Soccer Club is booked and confirmed! 50 MAD fee per player. Bibs and match balls ready.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
    announcements: INITIAL_ANNOUNCEMENTS,
    directMessages: [],
    notifications: [],
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

// Ensure unique users list, remove old mock users, and ensure only the authorized super admin (bouhbousmustapha@gmail.com) has administrative privileges
const MOCK_IDS_TO_REMOVE = new Set([
  'user_yassine',
  'user_achraf',
  'user_sofyan',
  'user_youssef',
  'user_admin_likobig',
  'user_admin_main',
  'user_mustapha_alt',
]);

const seenEmails = new Set<string>();
const sanitizedUsers: UserProfile[] = [];

for (const u of db.users || []) {
  const emailNorm = (u.email || '').toLowerCase().trim();
  if (MOCK_IDS_TO_REMOVE.has(u.id) || emailNorm.endsWith('@pitchmate.ma')) {
    continue; // Remove legacy mock player accounts
  }

  if (emailNorm && !seenEmails.has(emailNorm)) {
    seenEmails.add(emailNorm);
    const isMustapha = isSuperAdminEmail(u.email);
    sanitizedUsers.push({
      ...u,
      id: isMustapha ? 'user_mustapha' : u.id,
      name: isMustapha ? 'Mustapha Bouhbous' : u.name,
      avatarUrl: isMustapha ? MESSI_AVATAR_URL : u.avatarUrl,
      isAdmin: isMustapha,
      status: isMustapha ? 'approved' : (u.status || 'pending'),
      approvedAt: isMustapha ? (u.approvedAt || new Date().toISOString()) : u.approvedAt,
    });
  }
}

// Ensure Super Admin Mustapha exists in user list
if (!seenEmails.has(SUPER_ADMIN_EMAIL.toLowerCase())) {
  sanitizedUsers.unshift({
    id: 'user_mustapha',
    email: SUPER_ADMIN_EMAIL,
    name: 'Mustapha Bouhbous',
    avatarUrl: MESSI_AVATAR_URL,
    phone: '+212 661-234567',
    city: 'Casablanca',
    isAdmin: true,
    status: 'approved',
    preferredPosition: 'MID',
    skillRating: 5.0,
    reliabilityScore: 100,
    matchesAttended: 50,
    matchesPlayed: 50,
    mvpCount: 8,
    goalsCount: 24,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  });
}

db.users = sanitizedUsers;

// Clean DMs from removed users
if (Array.isArray(db.directMessages)) {
  const validUserIds = new Set(sanitizedUsers.map((u) => u.id));
  db.directMessages = db.directMessages.filter(
    (dm) => validUserIds.has(dm.senderId) && validUserIds.has(dm.receiverId)
  );
}

// Clean matches rosters from removed users
if (Array.isArray(db.matches)) {
  const validUserIds = new Set(sanitizedUsers.map((u) => u.id));
  db.matches = db.matches.map((m) => {
    const cleanedRoster = (m.roster || []).filter((p) => validUserIds.has(p.userId));
    return {
      ...m,
      roster: cleanedRoster.length > 0 ? cleanedRoster : [
        {
          userId: 'user_mustapha',
          name: 'Mustapha Bouhbous',
          email: SUPER_ADMIN_EMAIL,
          avatarUrl: MESSI_AVATAR_URL,
          joinedAt: new Date().toISOString(),
          team: 'green' as const,
          position: 'MID',
          jerseyNumber: 10,
          isHost: true,
          reliabilityScore: 100,
          rating: 5.0,
          paymentStatus: 'paid' as const,
          paymentMethod: 'cash' as const,
        },
      ],
      paidPlayerIds: (m.paidPlayerIds || []).filter((id) => validUserIds.has(id)),
      score: m.score || { green: 0, blue: 0 },
      goals: (m.goals || []).filter((g) => validUserIds.has(g.scorerId)),
    };
  });
}

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
  const isSuper = Boolean(req.user && isSuperAdminEmail(req.user.email));
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
  const isSuper = Boolean(req.user && isSuperAdminEmail(req.user.email));
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

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  // MEDIA UPLOADS (AUDIO, AVATARS & IMAGES TO DISK)
  // ---------------------------------------------------------
  app.post('/api/upload/audio', async (req: AuthenticatedRequest, res) => {
    try {
      const { base64Data, format } = req.body;
      if (!base64Data) {
        return res.status(400).json({ success: false, error: 'No audio data provided' });
      }

      let ext = format === 'wav' ? 'wav' : 'webm';
      if (base64Data.startsWith('data:audio/wav')) {
        ext = 'wav';
      } else if (base64Data.startsWith('data:audio/mp4') || base64Data.startsWith('data:audio/m4a')) {
        ext = 'mp4';
      } else if (base64Data.startsWith('data:audio/ogg')) {
        ext = 'ogg';
      }

      const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const filePath = path.join(AUDIO_DIR, filename);

      const base64Pure = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Pure, 'base64');
      await fs.promises.writeFile(filePath, buffer);

      const audioUrl = `/uploads/audio/${filename}`;
      res.json({ success: true, audioUrl });
    } catch (err) {
      console.error('[Upload Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to save audio file' });
    }
  });

  app.post('/api/upload/avatar', async (req: AuthenticatedRequest, res) => {
    try {
      const { base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ success: false, error: 'No image data provided' });
      }

      let ext = 'jpg';
      if (base64Data.startsWith('data:image/png')) {
        ext = 'png';
      } else if (base64Data.startsWith('data:image/webp')) {
        ext = 'webp';
      } else if (base64Data.startsWith('data:image/gif')) {
        ext = 'gif';
      }

      const filename = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const filePath = path.join(AVATAR_DIR, filename);

      const base64Pure = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Pure, 'base64');
      await fs.promises.writeFile(filePath, buffer);

      const avatarUrl = `/uploads/avatars/${filename}`;
      res.json({ success: true, avatarUrl });
    } catch (err) {
      console.error('[Upload Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to save avatar image' });
    }
  });

  app.post('/api/upload/image', async (req: AuthenticatedRequest, res) => {
    try {
      const { base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ success: false, error: 'No image data provided' });
      }

      let ext = 'jpg';
      if (base64Data.startsWith('data:image/png')) {
        ext = 'png';
      } else if (base64Data.startsWith('data:image/webp')) {
        ext = 'webp';
      } else if (base64Data.startsWith('data:image/gif')) {
        ext = 'gif';
      }

      const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const filePath = path.join(IMAGES_DIR, filename);

      const base64Pure = base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Pure, 'base64');
      await fs.promises.writeFile(filePath, buffer);

      const imageUrl = `/uploads/images/${filename}`;
      res.json({ success: true, imageUrl });
    } catch (err) {
      console.error('[Upload Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to save image file' });
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
  const otpCooldowns = new Map<string, number>();
  const otpHourlyCounts = new Map<string, { count: number; resetAt: number }>();
  const otpFailedAttempts = new Map<string, number>();

  // Initialize Firebase Firestore for server-side OTP persistence
  let serverFirestoreDb: any = null;
  (async () => {
    try {
      const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(firebaseConfigPath)) {
        const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
        const dbName = config.firestoreDatabaseId || '(default)';
        try {
          const testUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${dbName}/documents/test?key=${config.apiKey}`;
          const resp = await fetch(testUrl);
          const data: any = await resp.json().catch(() => ({}));
          if (data?.error?.message?.includes('The database') && data?.error?.message?.includes('does not exist')) {
            console.log(`[Server Firestore] Cloud Firestore database "${dbName}" is not yet provisioned in project "${config.projectId}". Server using local & memory state.`);
            serverFirestoreDb = null;
            return;
          }
        } catch {
          serverFirestoreDb = null;
          return;
        }

        const { initializeApp, getApps } = await import('firebase/app');
        const { getFirestore } = await import('firebase/firestore');
        const app = getApps().length === 0 ? initializeApp(config, 'pitchmate-server') : getApps()[0];
        const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' ? config.firestoreDatabaseId : undefined;
        serverFirestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
        console.log('[Server Firestore] Initialized for project:', config.projectId);
      }
    } catch (e) {
      console.warn('[Server Firestore] Note on Firestore init:', e);
    }
  })();

  // Nodemailer SMTP Transporter Factory
  function getEmailTransporter(): any {
    // 1. SendGrid API Key integration
    if (process.env.SENDGRID_API_KEY) {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    }

    // 2. Standard SMTP / Gmail SMTP integration
    const rawUser = process.env.SMTP_USER || process.env.EMAIL_USER || '';
    const rawPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || '';
    const smtpUser = rawUser.trim();
    // Google App Passwords are 16 characters often generated with spaces like "xxxx xxxx xxxx xxxx"
    const smtpPass = rawPass.trim().replace(/\s+/g, '');
    const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (smtpUser && smtpPass) {
      const isGmail = smtpHost.includes('gmail') || smtpUser.toLowerCase().includes('@gmail.com');
      if (isGmail) {
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      }

      return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    return null;
  }

  // Real Email Sending Service using Nodemailer
  async function sendOTPEmail(
    toEmail: string,
    code: string,
    type: 'signup' | 'forgot_password'
  ): Promise<{ success: boolean; method: string; messageId?: string }> {
    const isForgot = type === 'forgot_password';
    const subject = isForgot
      ? `PitchMate - رمز استعادة كلمة المرور: ${code}`
      : `PitchMate - رمز تأكيد الحساب: ${code}`;

    const fromAddress =
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `"PitchMate Security" <${process.env.SMTP_USER}>` : '"PitchMate Security" <security@pitchmate.ma>');

    // Clean, well-formatted email containing only the 6-digit numbers in the main highlight box
    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020A07; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F1F5F9;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020A07; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #082218; border: 1px solid rgba(229, 184, 105, 0.4); border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="padding: 26px 20px 20px; text-align: center; background: linear-gradient(180deg, #0E382A 0%, #082218 100%); border-bottom: 1px solid rgba(229, 184, 105, 0.25);">
              <div style="display: inline-block; padding: 8px 18px; background-color: #020A07; border: 1px solid rgba(229, 184, 105, 0.35); border-radius: 10px; margin-bottom: 12px;">
                <span style="font-size: 19px; font-weight: 900; color: #F5D794; letter-spacing: 1px;">⚽ PitchMate</span>
              </div>
              <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #F5D794;">
                ${isForgot ? 'استعادة كلمة المرور' : 'تأكيد الحساب'}
              </h2>
              <p style="margin: 5px 0 0; font-size: 12px; color: #6EE7B7;">
                ${isForgot ? 'Password Reset Verification Code' : 'Account Verification Code'}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px; text-align: center;">
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                مرحباً،
                <br>
                ${isForgot
                  ? 'لقد تلقينا طلباً لاستعادة كلمة المرور الخاصة بحسابك المسجل في منصة <strong>PitchMate</strong>.'
                  : 'شكراً لانضمامك إلى منصة <strong>PitchMate</strong>.'}
                <br>
                أدخل رمز التحقق التالي المكون من 6 أرقام في شاشة التحقق داخل التطبيق:
              </p>

              <!-- Prominent 6-digit numeric OTP container -->
              <div style="margin: 22px auto; max-width: 290px; background-color: #020A07; border: 2px solid #E5B869; border-radius: 14px; padding: 18px 10px; text-align: center; box-shadow: inset 0 2px 10px rgba(0,0,0,0.7);">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #F5D794; display: inline-block; padding-left: 8px;">
                  ${code}
                </span>
              </div>

              <p style="margin: 16px 0 0; font-size: 12px; font-weight: 600; color: #94A3B8;">
                ⏱️ هذا الرمز صالح للاستخدام لمدة <strong>10 دقائق</strong> فقط.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #64748B; line-height: 1.5;">
                ${isForgot ? 'إذا لم تكن أنت من طلب استعادة كلمة المرور، يرجى تجاهل هذه الرسالة بأمان ولن يطرأ أي تغيير على حسابك.' : 'إذا لم تكن أنت من قام بإنشاء هذا الحساب في منصة PitchMate، يرجى تجاهل هذه الرسالة بأمان.'}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 20px; background-color: #04130D; border-top: 1px solid rgba(229, 184, 105, 0.2); text-align: center; font-size: 11px; color: #64748B;">
              منصة PitchMate لتنظيم مباريات وحجوزات ملاعب كرة القدم بالمغرب 🇲🇦
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `كود التحقق في PitchMate هو: ${code}\nصالح لمدة 10 دقائق فقط.\nإذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.`;

    const transporter = getEmailTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });
        console.log(`[NODEMAILER SUCCESS] Real email sent to ${toEmail}. MessageId: ${info.messageId}`);
        return { success: true, method: 'smtp', messageId: info.messageId };
      } catch (err: any) {
        console.error(`[NODEMAILER ERROR] Failed to send via SMTP to ${toEmail}:`, err?.message || err);
      }
    }

    // Fallback console log if SMTP credentials are not yet configured in .env
    console.log(`\n============================================================`);
    console.log(`📧 [PITCHMATE EMAIL OTP DISPATCH via NODEMAILER]`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`6-Digit OTP Code: [ ${code} ]`);
    console.log(`Expires in: 10 minutes`);
    console.log(`(Configure SMTP_USER & SMTP_PASS in Settings / .env to deliver real emails directly to Gmail inbox)`);
    console.log(`============================================================\n`);

    return { success: true, method: 'console_and_firestore' };
  }

  // Helper to persist OTP in Firestore
  async function persistOTPInFirestore(email: string, code: string, expiresAt: number, type: string) {
    if (!serverFirestoreDb) return;
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const docId = `otp_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await setDoc(doc(serverFirestoreDb, 'password_resets', docId), {
        email,
        code,
        expiresAt,
        type,
        createdAt: new Date().toISOString(),
      });
      console.log(`[Server Firestore] Stored OTP in 'password_resets' doc: ${docId}`);
    } catch (err) {
      console.warn('[Server Firestore] Could not write OTP to Firestore:', err);
    }
  }

  // Helper to check OTP in Firestore
  async function checkOTPInFirestore(email: string, code: string): Promise<boolean> {
    if (!serverFirestoreDb) return false;
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(serverFirestoreDb, 'password_resets'), where('email', '==', email));
      const snap = await getDocs(q);
      let isValid = false;
      snap.forEach((d) => {
        const data = d.data();
        if (data.email === email && data.code === code && Date.now() <= data.expiresAt) {
          isValid = true;
        }
      });
      return isValid;
    } catch (err) {
      console.warn('[Server Firestore] Error verifying OTP:', err);
      return false;
    }
  }

  // Helper to delete OTP from Firestore
  async function deleteOTPFromFirestore(email: string) {
    if (!serverFirestoreDb) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const docId = `otp_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await deleteDoc(doc(serverFirestoreDb, 'password_resets', docId));
      console.log(`[Server Firestore] Cleared OTP for ${email}`);
    } catch (err) {
      console.warn('[Server Firestore] Error clearing OTP:', err);
    }
  }

  // Comprehensive helper to detect if an email already has an active account or pending registration
  async function checkUserExistsByEmail(cleanEmail: string): Promise<{ exists: boolean; reason?: string; user?: any }> {
    if (!cleanEmail) return { exists: false };
    const lower = cleanEmail.trim().toLowerCase();

    // 1. Check in-memory database
    const localUser = db.users.find((u) => u.email.toLowerCase() === lower);
    if (localUser) {
      return { exists: true, reason: 'LOCAL_DB', user: localUser };
    }

    // 2. Check super admin email
    if (isSuperAdminEmail(lower)) {
      return { exists: true, reason: 'SUPER_ADMIN' };
    }

    // 3. Check Firestore 'users' and 'registration_requests' collections
    if (serverFirestoreDb) {
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const qUsers = query(collection(serverFirestoreDb, 'users'), where('email', '==', lower));
        const snapUsers = await getDocs(qUsers);
        if (!snapUsers.empty) {
          return { exists: true, reason: 'FIRESTORE_USERS', user: snapUsers.docs[0].data() };
        }

        const qReqs = query(collection(serverFirestoreDb, 'registration_requests'), where('email', '==', lower));
        const snapReqs = await getDocs(qReqs);
        if (!snapReqs.empty) {
          return { exists: true, reason: 'FIRESTORE_REG_REQUEST', user: snapReqs.docs[0].data() };
        }
      } catch (err) {
        console.warn('[Server Firestore] Error checking user existence:', err);
      }
    }

    return { exists: false };
  }

  // Send 6-digit OTP Verification Code
  app.post('/api/auth/send-otp', async (req, res) => {
    const { email, type } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'الرجاء إدخال بريد إلكتروني صالح بالصيغة الصحيحة (مثال: name@domain.com).',
      });
    }

    // Check if account already exists across all storages
    const userStatus = await checkUserExistsByEmail(cleanEmail);

    if (type === 'signup') {
      if (userStatus.exists) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_ALREADY_EXISTS',
          error: 'هذا البريد الإلكتروني مسجل به حساب بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة بدلاً من إنشاء حساب جديد.',
        });
      }
    }

    if (type === 'forgot_password') {
      if (!userStatus.exists) {
        return res.status(404).json({
          success: false,
          code: 'EMAIL_NOT_FOUND',
          error: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني. يرجى التأكد من البريد أو إنشاء حساب جديد.',
        });
      }
    }

    // Rate Limiting: 60-second cooldown between requests
    const lastSent = otpCooldowns.get(cleanEmail);
    if (lastSent && Date.now() - lastSent < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({
        success: false,
        error: `يرجى الانتظار ${waitSec} ثانية قبل طلب رمز تحقق جديد لحماية الحساب من المحاولات المتكررة.`,
      });
    }

    // Hourly Rate Limiting: Maximum 5 OTP requests per hour per email
    const now = Date.now();
    let hourly = otpHourlyCounts.get(cleanEmail);
    if (!hourly || now > hourly.resetAt) {
      hourly = { count: 0, resetAt: now + 3600 * 1000 };
      otpHourlyCounts.set(cleanEmail, hourly);
    }
    if (hourly.count >= 5) {
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد الأقصى المسموح لطلبات الرمز في الساعة (5 طلبات). يرجى المحاولة لاحقاً لحماية أمان الحساب.',
      });
    }

    // Generate secure 6-digit numeric OTP using Node crypto
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update rate limits and reset failed attempts on new dispatch
    hourly.count += 1;
    otpCooldowns.set(cleanEmail, now);
    otpFailedAttempts.delete(cleanEmail);

    // 1. Save in memory map
    otpSessions.set(cleanEmail, {
      email: cleanEmail,
      code,
      expiresAt,
      type: type || 'signup',
    });

    // 2. Save in Firestore password_resets collection
    await persistOTPInFirestore(cleanEmail, code, expiresAt, type || 'forgot_password');

    // 3. Dispatch real email via Nodemailer
    const emailDispatch = await sendOTPEmail(cleanEmail, code, type || 'forgot_password');

    // NEVER return the OTP code in the JSON payload! Strict zero-leakage security.
    res.json({
      success: true,
      email: cleanEmail,
      expiresAt,
      method: emailDispatch.method,
      message: 'تم إرسال رمز التحقق بنجاح إلى صندوق بريدك الإلكتروني.',
    });
  });

  // Verify OTP Code with Brute-Force Rate Limiting
  app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ success: false, error: 'البريد الإلكتروني ورمز التحقق كلاهما مطلوب.' });
    }

    const currentAttempts = (otpFailedAttempts.get(cleanEmail) || 0) + 1;
    otpFailedAttempts.set(cleanEmail, currentAttempts);

    if (currentAttempts > 5) {
      otpSessions.delete(cleanEmail);
      await deleteOTPFromFirestore(cleanEmail);
      otpFailedAttempts.delete(cleanEmail);
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم إبطال الرمز لأسباب أمنية، يرجى طلب رمز جديد.',
      });
    }

    // Check memory session
    const session = otpSessions.get(cleanEmail);
    if (session && Date.now() <= session.expiresAt && session.code === cleanCode) {
      otpFailedAttempts.delete(cleanEmail);
      return res.json({ success: true, verified: true, email: cleanEmail });
    }

    // Check Firestore fallback
    const firestoreValid = await checkOTPInFirestore(cleanEmail, cleanCode);
    if (firestoreValid) {
      otpFailedAttempts.delete(cleanEmail);
      return res.json({ success: true, verified: true, email: cleanEmail });
    }

    if (session && Date.now() > session.expiresAt) {
      otpSessions.delete(cleanEmail);
      await deleteOTPFromFirestore(cleanEmail);
      return res.status(400).json({ success: false, error: 'انتهت صلاحية رمز التحقق (10 دقائق). يرجى طلب رمز جديد.' });
    }

    const remaining = 5 - currentAttempts;
    return res.status(400).json({
      success: false,
      error: `رمز التحقق غير صحيح. متبقي لديك ${remaining} محاولات قبل إبطال الرمز.`,
    });
  });

  // Reset Password for Account - Strictly requires verified OTP and minimum 6 characters
  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword, passwordHash, passwordSalt } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!cleanEmail || !cleanCode || (!newPassword && !passwordHash)) {
      return res.status(400).json({
        success: false,
        error: 'البريد الإلكتروني، رمز التحقق (OTP)، وكلمة المرور الجديدة كلها مطلوبة.',
      });
    }

    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف.',
      });
    }

    // Strict OTP verification
    let isCodeValid = false;
    const session = otpSessions.get(cleanEmail);
    if (session && Date.now() <= session.expiresAt && session.code === cleanCode) {
      isCodeValid = true;
    } else {
      isCodeValid = await checkOTPInFirestore(cleanEmail, cleanCode);
    }

    if (!isCodeValid) {
      const currentAttempts = (otpFailedAttempts.get(cleanEmail) || 0) + 1;
      otpFailedAttempts.set(cleanEmail, currentAttempts);
      if (currentAttempts > 5) {
        otpSessions.delete(cleanEmail);
        await deleteOTPFromFirestore(cleanEmail);
        otpFailedAttempts.delete(cleanEmail);
        return res.status(429).json({
          success: false,
          error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم إبطال الرمز، يرجى طلب رمز جديد.',
        });
      }
      return res.status(400).json({
        success: false,
        error: 'رمز التحقق غير صحيح أو انتهت صلاحيته.',
      });
    }

    // Immediately burn the OTP code so it can NEVER be reused (single-use security)
    otpSessions.delete(cleanEmail);
    otpFailedAttempts.delete(cleanEmail);
    await deleteOTPFromFirestore(cleanEmail);

    const targetUserIndex = db.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (targetUserIndex === -1 && !isSuperAdminEmail(cleanEmail)) {
      return res.status(404).json({ success: false, error: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.' });
    }

    if (targetUserIndex !== -1) {
      const targetUser = db.users[targetUserIndex];
      targetUser.passwordHash = passwordHash;
      targetUser.passwordSalt = passwordSalt;
      // Permanently remove any legacy or old plaintext password
      delete (targetUser as any).password;
      db.users[targetUserIndex] = targetUser;
    } else if (isSuperAdminEmail(cleanEmail)) {
      const newAdminUser: any = {
        id: cleanEmail === 'bouhbousmustapha@gmail.com' ? 'user_mustapha' : `user_admin_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: cleanEmail,
        name: 'Mustapha Bouhbous',
        avatarUrl: MESSI_AVATAR_URL,
        city: 'Casablanca',
        isAdmin: true,
        status: 'approved',
        matchesPlayed: 50,
        createdAt: new Date().toISOString(),
        passwordHash,
        passwordSalt,
      };
      db.users.push(newAdminUser);
    }

    // Also update in Firestore if user exists there
    if (serverFirestoreDb) {
      try {
        const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
        const q = query(collection(serverFirestoreDb, 'users'), where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docRef = snap.docs[0].ref;
          await updateDoc(docRef, {
            passwordHash: passwordHash || null,
            passwordSalt: passwordSalt || null,
            password: null, // Wipe out legacy plaintext password from cloud DB
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('Firestore password update error:', e);
      }
    }

    saveDatabaseDebounced();
    broadcastSSE('SYNC_USERS', db.users);

    console.log(`[PITCHMATE] Password successfully reset for user: ${cleanEmail}`);
    res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.' });
  });

  app.post('/api/users/register', async (req, res) => {
    const { name, email, passwordHash, passwordSalt, avatarUrl, bio, city, preferredPosition, skillRating, otpCode } = req.body;
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanName || !cleanEmail || !passwordHash) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);

    // Strict duplication prevention: verify across memory and cloud database
    const userStatus = await checkUserExistsByEmail(cleanEmail);
    if (userStatus.exists) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        error: 'هذا البريد الإلكتروني مسجل به حساب بالفعل مسبقاً. يرجى تسجيل الدخول مباشرة بدلاً من إنشاء حساب جديد.',
      });
    }

    // Verify Email Ownership via OTP code
    if (otpCode) {
      const cleanCode = (otpCode || '').trim();
      let isCodeValid = false;
      const session = otpSessions.get(cleanEmail);
      if (session && Date.now() <= session.expiresAt && session.code === cleanCode) {
        isCodeValid = true;
      } else {
        isCodeValid = await checkOTPInFirestore(cleanEmail, cleanCode);
      }

      if (!isCodeValid) {
        const currentAttempts = (otpFailedAttempts.get(cleanEmail) || 0) + 1;
        otpFailedAttempts.set(cleanEmail, currentAttempts);
        if (currentAttempts > 5) {
          otpSessions.delete(cleanEmail);
          await deleteOTPFromFirestore(cleanEmail);
          otpFailedAttempts.delete(cleanEmail);
          return res.status(429).json({
            success: false,
            error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم إلغاء الرمز، يرجى طلب رمز جديد.',
          });
        }
        return res.status(400).json({
          success: false,
          error: 'رمز التحقق غير صحيح أو انتهت صلاحيته.',
        });
      }

      // Single-use OTP: Burn immediately
      otpSessions.delete(cleanEmail);
      otpFailedAttempts.delete(cleanEmail);
      await deleteOTPFromFirestore(cleanEmail);
    } else if (!isMustapha) {
      return res.status(400).json({
        success: false,
        error: 'يرجى تأكيد ملكية البريد الإلكتروني عبر إدخال رمز التحقق (OTP) المرسل إلى بريدك أولاً.',
      });
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
          title: 'طلب انضمام لاعب جديد',
          message: `اللاعب ${cleanName} (${cleanEmail} - ${city || 'الدار البيضاء'}) بانتظار موافقتك للانضمام للمنصة.`,
          type: 'system',
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

    res.json({ success: true, user: newUser, pendingApproval: !isMustapha });
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
    if (action === 'signup' && existingUser) {
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
          code: 'ACCOUNT_PENDING',
          pendingApproval: true,
          error: 'حسابك ما زال قيد الانتظار والمراجعة من قِبل المشرف العام (Mustapha Bouhbous). يرجى الانتظار حتى يتم قبول طلبك.',
        });
      }

      existingUser.isGoogleAuth = true;
      existingUser.emailVerified = true;
      if (avatarUrl && (!existingUser.avatarUrl || existingUser.avatarUrl.includes('dicebear'))) {
        existingUser.avatarUrl = avatarUrl;
      }
      existingUser.isAdmin = isMustapha;

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
          title: 'طلب انضمام جديد عبر Google',
          message: `اللاعب ${cleanName} (${cleanEmail}) أنشأ حساباً وينتظر موافقتك.`,
          type: 'system',
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

    res.json({ success: true, user: newUser, pendingApproval: !isMustapha });
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

      // Handle tactical slot lock if requested during join
      const requestedSlot: string | undefined = playerItem.tacticalSlot;
      const assignments = { ...(match.tacticalAssignments || {}) };
      let assignedSlotKey: string | undefined = undefined;

      if (requestedSlot) {
        const currentOccupant = assignments[requestedSlot];
        if (!currentOccupant || currentOccupant === playerItem.userId) {
          // Free slot, lock it for this player
          Object.keys(assignments).forEach((k) => {
            if (assignments[k] === playerItem.userId) delete assignments[k];
          });
          assignments[requestedSlot] = playerItem.userId;
          assignedSlotKey = requestedSlot;
          match.tacticalAssignments = assignments;
        }
      }

      const newPlayerItem: PlayerRosterItem = {
        ...playerItem,
        team,
        position: playerItem.position || userProfile?.preferredPosition || 'MID',
        tacticalSlot: assignedSlotKey || playerItem.tacticalSlot,
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

      // Late Cancellation Reliability Engine Check (< 3 hours before kickoff)
      if (wasInRoster && match.dateTime) {
        const matchTime = new Date(match.dateTime).getTime();
        const now = Date.now();
        const hoursRemaining = (matchTime - now) / (1000 * 60 * 60);

        if (hoursRemaining < 3 && hoursRemaining > -2) {
          const leavingUser = db.users.find((u) => u.id === userId);
          if (leavingUser) {
            leavingUser.reliabilityScore = Math.max(0, Math.round((leavingUser.reliabilityScore || 100) - 5));
            db.notifications.unshift({
              id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userId: leavingUser.id,
              title: 'Late Dropout Notice',
              message: `You left "${match.title}" less than 3 hours before kickoff. A 5% reliability score deduction was recorded.`,
              type: 'system',
              linkId: matchId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }

          if (match.creatorId && match.creatorId !== userId) {
            db.notifications.unshift({
              id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userId: match.creatorId,
              title: 'Late Player Cancellation',
              message: `A player dropped out of "${match.title}" with less than 3 hours to kickoff.`,
              type: 'match_leave',
              linkId: matchId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
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

  // Claim or Release Tactical Position (Protected by withMatchLock concurrency protection)
  app.post('/api/matches/:id/claim-slot', requireAuth, async (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { slotKey, userId, rolePosition, teamSide } = req.body;
    const callerId = req.user?.id;

    if (!callerId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const targetUserId = userId || callerId;

    const result = await withMatchLock(matchId, async () => {
      const match = db.matches.find((m) => m.id === matchId);
      if (!match) return { status: 404, data: { success: false, error: 'Match not found' } };

      if (match.isLocked && !req.user?.isAdmin && match.creatorId !== callerId) {
        return { status: 403, data: { success: false, error: 'This match roster is locked by the host.' } };
      }

      const assignments = { ...(match.tacticalAssignments || {}) };

      // 1. If releasing the slot (userId is empty string or null)
      if (!userId) {
        const currentOccupantId = assignments[slotKey];
        if (currentOccupantId && currentOccupantId !== callerId && !req.user?.isAdmin && match.creatorId !== callerId) {
          return { status: 403, data: { success: false, error: "Cannot release another player's position." } };
        }

        delete assignments[slotKey];
        match.tacticalAssignments = assignments;

        match.roster = match.roster.map((p) =>
          p.tacticalSlot === slotKey ? { ...p, tacticalSlot: undefined } : p
        );
        match.updatedAt = new Date().toISOString();

        broadcastSSE('SYNC_MATCHES', db.matches);
        return { status: 200, data: { success: true, match } };
      }

      // 2. If claiming the slot: Check if already locked by someone else
      const currentOccupantId = assignments[slotKey];
      if (currentOccupantId && currentOccupantId !== targetUserId) {
        const occupant = match.roster.find((p) => p.userId === currentOccupantId) || db.users.find((u) => u.id === currentOccupantId);
        const occupantName = occupant ? occupant.name : 'another player';
        return {
          status: 409,
          data: {
            success: false,
            code: 'SLOT_ALREADY_LOCKED',
            error: `This position is already locked and reserved for ${occupantName}.`,
            occupantName,
            occupantId: currentOccupantId,
            match,
          },
        };
      }

      // Check if player is in roster; if not, add them to roster
      const playerInRoster = match.roster.find((p) => p.userId === targetUserId);
      const userProfile = db.users.find((u) => u.id === targetUserId);

      if (!playerInRoster) {
        if (match.roster.length >= match.maxPlayers) {
          return { status: 400, data: { success: false, error: 'Match roster is already full.' } };
        }
        const newPlayer: PlayerRosterItem = {
          userId: targetUserId,
          name: userProfile?.name || req.user?.name || 'Player',
          email: userProfile?.email || req.user?.email || '',
          avatarUrl: userProfile?.avatarUrl || req.user?.avatarUrl,
          team: teamSide || 'green',
          position: rolePosition || userProfile?.preferredPosition || 'MID',
          tacticalSlot: slotKey,
          reliabilityScore: userProfile?.reliabilityScore ?? 100,
          rating: userProfile?.skillRating ?? 4.5,
          paymentStatus: 'unpaid',
          joinedAt: new Date().toISOString(),
        };
        match.roster.push(newPlayer);
      } else {
        // Update existing roster item
        match.roster = match.roster.map((p) => {
          if (p.userId === targetUserId) {
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

      // Remove target user from any other slot in tacticalAssignments
      Object.keys(assignments).forEach((key) => {
        if (assignments[key] === targetUserId) {
          delete assignments[key];
        }
      });
      assignments[slotKey] = targetUserId;
      match.tacticalAssignments = assignments;
      match.updatedAt = new Date().toISOString();

      broadcastSSE('SYNC_MATCHES', db.matches);
      return { status: 200, data: { success: true, match } };
    });

    res.status(result.status).json(result.data);
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

  app.post('/api/matches/:id/broadcast-waitlist-alert', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const openSpots = Math.max(0, match.maxPlayers - match.roster.length);
    const notifiedUserIds: string[] = [];

    // Notify all waitlist players
    (match.waitlist || []).forEach((wPlayer) => {
      notifiedUserIds.push(wPlayer.userId);
      db.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: wPlayer.userId,
        title: '🚨 Urgent: Spot Available in Match!',
        message: `A spot is open for "${match.title}" at ${match.location?.venueName || 'the pitch'}! Tap to claim your slot right now.`,
        type: 'waitlist_promoted',
        linkId: matchId,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    broadcastSSE('SYNC_ALL', {
      matches: db.matches,
      notifications: db.notifications,
    });

    res.json({
      success: true,
      openSpots,
      notifiedCount: notifiedUserIds.length,
      waitlistCount: (match.waitlist || []).length,
    });
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
      id: comment.id || `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: req.user?.id || comment.userId,
      userName: req.user?.name || comment.userName,
      userEmail: req.user?.email || comment.userEmail,
      userAvatar: req.user?.avatarUrl || comment.userAvatar,
      createdAt: comment.createdAt || new Date().toISOString(),
    };

    const existingIdx = currentList.findIndex((c) => c.id === newComment.id);
    if (existingIdx >= 0) {
      currentList[existingIdx] = newComment;
    } else {
      currentList.push(newComment);
    }
    // Maintain chronological ordering
    currentList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    db.comments[matchId] = currentList;

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
    const senderId = req.user?.id || msg.senderId;
    const senderName = req.user?.name || msg.senderName || 'Teammate';
    const senderAvatar = req.user?.avatarUrl || msg.senderAvatar;

    const newMsg: DirectMessage = {
      ...msg,
      id: msg.id || `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId,
      senderName,
      senderAvatar,
      receiverId: msg.receiverId,
      text: msg.text || '',
      imageUrl: msg.imageUrl || undefined,
      audioUrl: msg.audioUrl || undefined,
      audioDuration: msg.audioDuration || undefined,
      createdAt: msg.createdAt || new Date().toISOString(),
      read: Boolean(msg.read),
    };

    const existingMsgIdx = db.directMessages.findIndex((m) => m.id === newMsg.id);
    if (existingMsgIdx >= 0) {
      db.directMessages[existingMsgIdx] = newMsg;
    } else {
      db.directMessages.push(newMsg);
    }
    // Maintain chronological ordering
    db.directMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Generate real-time notification for receiver
    if (newMsg.receiverId && !newMsg.read) {
      const notifId = `notif_dm_${newMsg.id}`;
      const notifData: InAppNotification = {
        id: notifId,
        userId: newMsg.receiverId,
        title: `رسالة من ${senderName}`,
        message: newMsg.audioUrl
          ? '🎤 أرسل لك رسالة صوتية'
          : newMsg.imageUrl
          ? '📷 أرسل لك صورة'
          : newMsg.text || 'أرسل لك رسالة جديدة',
        type: 'direct_message',
        linkId: senderId,
        createdAt: newMsg.createdAt,
        read: false,
      };
      db.notifications = [notifData, ...db.notifications.filter((n) => n.id !== notifId).slice(0, 49)];
    }

    broadcastSSE('SYNC_DIRECT_MESSAGES', db.directMessages);
    broadcastSSE('SYNC_NOTIFICATIONS', db.notifications);
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
