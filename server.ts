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
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  isSuperAdminEmail,
  verifySuperAdminMasterPassword,
} from './src/types';
import {
  INITIAL_MATCHES,
  INITIAL_USERS,
  INITIAL_DIRECT_MESSAGES,
  INITIAL_NOTIFICATIONS,
} from './src/lib/mockData';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'pitchmate_db.json');

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

// Initial In-Memory State Generator
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
      totalPitchCost: m.totalPitchCost ?? m.pricePerPlayer * (m.roster?.length || 10),
      paidPlayerIds: m.paidPlayerIds ?? (m.roster?.slice(0, 2).map((p) => p.userId) || [m.creatorId]),
      formationGreen: m.formationGreen || '2-3-1',
      formationBlue: m.formationBlue || '2-3-1',
      tacticalAssignments: m.tacticalAssignments || {},
      attendedPlayerIds: m.attendedPlayerIds || [],
      noShowPlayerIds: m.noShowPlayerIds || [],
    })),
    comments: {
      match_01_friday_lights: [
        {
          id: 'c1',
          matchId: 'match_01_friday_lights',
          userId: 'user_mustapha',
          userName: 'Mustapha Bouhbous',
          userEmail: SUPER_ADMIN_EMAIL,
          userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          text: 'Pitch 3 is booked and confirmed! I will bring the Green and Blue bibs plus match balls. See everyone at 7:15 PM.',
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
        },
      ],
    },
    announcements: [
      {
        id: 'ann_1',
        title: 'Spring League Schedule & Tactical Guidelines',
        message:
          'Welcome to PitchMate! Check the new 2D Tactical Pitch Formation view, WhatsApp 1-Click invite sharing, and player reliability scoring.',
        authorName: 'Mustapha Bouhbous (Admin)',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        type: 'info',
      },
    ],
    directMessages: INITIAL_DIRECT_MESSAGES,
    notifications: INITIAL_NOTIFICATIONS,
  };
}

// Ensure Data Directory Exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or Initialize DB
let db: DatabaseSchema;
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
    console.log('[PitchMate DB] Loaded database from file.');
  } else {
    db = getInitialData();
    saveDatabaseSync();
    console.log('[PitchMate DB] Initialized fresh database file.');
  }
} catch (err) {
  console.error('[PitchMate DB] Error reading DB file, fallback to initial:', err);
  db = getInitialData();
}

// Ensure all super admin accounts exist with full administrative privileges
const superAdminEmailsList = ['topreviewsamazon2025@gmail.com', 'bouhbousmustapha@gmail.com'];
for (const sEmail of superAdminEmailsList) {
  const existing = db.users.find((u) => u.email.toLowerCase() === sEmail.toLowerCase());
  if (existing) {
    existing.isAdmin = true;
    existing.status = 'approved';
  } else {
    db.users.unshift({
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
// Sync flags across all users
db.users = db.users.map((u) => ({
  ...u,
  isAdmin: isSuperAdminEmail(u.email) || u.isAdmin === true,
  status: (isSuperAdminEmail(u.email) || u.isAdmin === true) ? ('approved' as const) : (u.status || 'approved'),
}));
saveDatabaseDebounced();

// Non-blocking Asynchronous Disk Persistence Queue to eliminate event loop bottlenecks
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
  db.lastUpdated = new Date().toISOString();
  db.version = (db.version || 0) + 1;

  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    executeSaveAsync();
  }, 250);
}

function saveDatabaseSync() {
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[PitchMate DB] Failed to save DB to disk:', err);
  }
}

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
      client.res.write(message);
      return true;
    } catch {
      return false;
    }
  });
}

// Mutex / Queue for Concurrent Match Roster Operations (Guarantees zero race conditions)
const matchOperationLocks = new Map<string, Promise<void>>();

async function withMatchLock<T>(matchId: string, fn: () => Promise<T> | T): Promise<T> {
  const existingLock = matchOperationLocks.get(matchId) || Promise.resolve();
  let resolver: () => void;
  const currentLock = new Promise<void>((resolve) => {
    resolver = resolve;
  });

  matchOperationLocks.set(matchId, existingLock.then(() => currentLock));

  try {
    await existingLock;
    return await fn();
  } finally {
    resolver!();
    if (matchOperationLocks.get(matchId) === currentLock) {
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

  if (adminSecret && verifySuperAdminMasterPassword(adminSecret)) {
    let admin = db.users.find((u) => isSuperAdminEmail(u.email));
    if (admin) {
      req.user = { ...admin, isAdmin: true, status: 'approved' };
      return next();
    }
  }

  // If userEmail is provided in header/body/query
  if (userEmail) {
    const cleanEmail = userEmail.trim().toLowerCase();
    let foundByEmail = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (foundByEmail) {
      if (isSuperAdminEmail(foundByEmail.email)) {
        foundByEmail.isAdmin = true;
        foundByEmail.status = 'approved';
      }
      req.user = foundByEmail;
      return next();
    } else if (isSuperAdminEmail(cleanEmail)) {
      const autoAdmin: UserProfile = {
        id: `user_admin_${Date.now()}`,
        email: cleanEmail,
        name: 'Mustapha Bouhbous',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isAdmin: true,
        status: 'approved',
        matchesPlayed: 50,
        createdAt: new Date().toISOString(),
      };
      db.users.unshift(autoAdmin);
      req.user = autoAdmin;
      return next();
    }
  }

  if (userId) {
    const found = db.users.find((u) => u.id === userId);
    if (found) {
      if (isSuperAdminEmail(found.email)) {
        found.isAdmin = true;
        found.status = 'approved';
      }
      req.user = found;
      return next();
    }
  }

  if (token) {
    // Matches pitchmate_token_<userId>_<timestamp>
    const match = token.match(/^pitchmate_token_(.+)_(\d+)$/);
    if (match) {
      const extractedId = match[1];
      const found = db.users.find((u) => u.id === extractedId || u.id === `user_${extractedId}`);
      if (found) {
        if (isSuperAdminEmail(found.email)) {
          found.isAdmin = true;
          found.status = 'approved';
        }
        req.user = found;
        return next();
      }
    }
  }

  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const reqEmail = (req.headers['x-user-email'] as string) || req.user?.email;
  if (!req.user && (!reqEmail || !isSuperAdminEmail(reqEmail))) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }
  if (req.user?.isBanned) {
    return res.status(403).json({ success: false, error: `Account suspended: ${req.user.banReason || 'Contact administrator'}` });
  }
  if (req.user && (req.user.status === 'pending' || req.user.status === 'rejected') && !isSuperAdminEmail(req.user.email)) {
    return res.status(403).json({ success: false, error: 'Account not approved by administrator.' });
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const reqEmail = (req.headers['x-user-email'] as string) || req.user?.email;
  const isSuper = (req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin === true)) || (reqEmail && isSuperAdminEmail(reqEmail));
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
  const reqEmail = (req.headers['x-user-email'] as string) || req.user?.email;
  const isSuper = (req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin === true)) || (reqEmail && isSuperAdminEmail(reqEmail));
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
  app.use(extractUserMiddleware);

  // =========================================================
  // API ROUTES
  // =========================================================

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), connectedClients: sseClients.length });
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

  // Server-Sent Events (SSE) Stream for Instant Universal Real-Time Sync
  app.get('/api/sync/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const client: SSEClient = { id: clientId, res };
    sseClients.push(client);

    // Initial greeting and heartbeat
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, version: db.version })}\n\n`);

    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(pingInterval);
        sseClients = sseClients.filter((c) => c.id !== clientId);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
  });

  // ---------------------------------------------------------
  // USER REGISTRATION & APPROVAL FLOWS
  // ---------------------------------------------------------

  // User Registration
  app.post('/api/users/register', (req, res) => {
    const { name, email, passwordHash, passwordSalt, avatarUrl, bio, preferredPosition, skillRating } = req.body;
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanName || !cleanEmail || !passwordHash) {
      return res.status(400).json({ success: false, error: 'Name, email, and password hash are required.' });
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const isMustapha = isSuperAdminEmail(cleanEmail);
    const userId = isMustapha
      ? 'user_mustapha'
      : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser: UserProfile = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      avatarUrl:
        avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      bio: bio || '',
      preferredPosition: preferredPosition || 'MID',
      skillRating: skillRating || 4.5,
      reliabilityScore: 100,
      matchesAttended: 0,
      noShowCount: 0,
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
          message: `${cleanName} (${cleanEmail}) registered and is awaiting your approval in the Admin Panel.`,
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

  // Approve User (Strict Admin Auth Required)
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

  // Reject User (Strict Admin Auth Required)
  app.post('/api/users/reject', requireAdmin, (req: AuthenticatedRequest, res) => {
    const { userId, reason } = req.body;
    const userIndex = db.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const targetUser = db.users[userIndex];
    targetUser.status = 'rejected';
    targetUser.banReason = reason || 'Registration declined by administrator';

    broadcastSSE('SYNC_USERS', db.users);
    res.json({ success: true, user: targetUser });
  });

  // Approve All Pending Users (Strict Admin Auth Required)
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

  // Ban User (Strict Admin Auth Required)
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

    // Remove user from all matches
    db.matches = db.matches.map((m) => ({
      ...m,
      roster: m.roster.filter((p) => p.userId !== userId),
      waitlist: m.waitlist.filter((p) => p.userId !== userId),
      paidPlayerIds: (m.paidPlayerIds || []).filter((id) => id !== userId),
    }));

    broadcastSSE('SYNC_ALL', {
      users: db.users,
      matches: db.matches,
    });

    res.json({ success: true, user });
  });

  // Unban User (Strict Admin Auth Required)
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

  // Delete User Account (Strict Admin Auth Required)
  app.delete('/api/users/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const userId = req.params.id;
    const targetUser = db.users.find((u) => u.id === userId);
    if (!targetUser) return res.status(404).json({ success: false, error: 'User not found' });

    if (isSuperAdminEmail(targetUser.email)) {
      return res.status(403).json({ success: false, error: 'Cannot delete Super Admin account' });
    }

    db.users = db.users.filter((u) => u.id !== userId);
    db.matches = db.matches.map((m) => ({
      ...m,
      roster: m.roster.filter((p) => p.userId !== userId),
      waitlist: m.waitlist.filter((p) => p.userId !== userId),
      paidPlayerIds: (m.paidPlayerIds || []).filter((id) => id !== userId),
    }));
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

    const updatedUser = {
      ...db.users[userIndex],
      ...updates,
      isAdmin: isSuperAdminEmail(db.users[userIndex].email),
    };
    db.users[userIndex] = updatedUser;

    // Update player information inside matches
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

  // Create Match (Auth Required)
  app.post('/api/matches', requireAuth, (req: AuthenticatedRequest, res) => {
    const matchData = req.body;
    const newMatch: SoccerMatch = {
      ...matchData,
      id: matchData.id || `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      creatorId: req.user?.id || matchData.creatorId,
      creatorName: req.user?.name || matchData.creatorName,
      creatorEmail: req.user?.email || matchData.creatorEmail,
      formationGreen: matchData.formationGreen || '2-3-1',
      formationBlue: matchData.formationBlue || '2-3-1',
      tacticalAssignments: matchData.tacticalAssignments || {},
      attendedPlayerIds: [],
      noShowPlayerIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.matches.unshift(newMatch);
    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match: newMatch });
  });

  // Update Match (Host or Admin Auth Required)
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

  // Delete Match (Host or Admin Auth Required)
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

  // Join Match (Protected by Atomic Match Mutex to Prevent Capacity Race Conditions)
  app.post('/api/matches/:id/join', requireAuth, async (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { playerItem, teamChoice } = req.body;

    const result = await withMatchLock(matchId, async () => {
      const match = db.matches.find((m) => m.id === matchId);
      if (!match) return { status: 404, data: { success: false, error: 'Match not found' } };

      if (match.isLocked) {
        return { status: 403, data: { success: false, error: 'This match is currently locked by the host.' } };
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

      // Fetch player reliability from user profile
      const userProfile = db.users.find((u) => u.id === playerItem.userId);

      const newPlayerItem: PlayerRosterItem = {
        ...playerItem,
        team,
        position: playerItem.position || userProfile?.preferredPosition || 'MID',
        reliabilityScore: userProfile?.reliabilityScore ?? 98,
        rating: userProfile?.skillRating ?? 4.5,
        joinedAt: new Date().toISOString(),
      };

      // Strict capacity check under atomic lock
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
          title: 'Player Joined Your Match',
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

  // Leave Match (Protected by Atomic Match Mutex)
  app.post('/api/matches/:id/leave', requireAuth, async (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { userId } = req.body;

    const result = await withMatchLock(matchId, async () => {
      const match = db.matches.find((m) => m.id === matchId);
      if (!match) return { status: 404, data: { success: false, error: 'Match not found' } };

      const wasInRoster = match.roster.some((p) => p.userId === userId);
      let updatedRoster = match.roster.filter((p) => p.userId !== userId);
      let updatedWaitlist = match.waitlist.filter((p) => p.userId !== userId);

      // Auto promote from waitlist if spot opened
      if (wasInRoster && updatedWaitlist.length > 0 && updatedRoster.length < match.maxPlayers) {
        const promoted = updatedWaitlist.shift();
        if (promoted) {
          const greenCount = updatedRoster.filter((p) => p.team === 'green').length;
          const blueCount = updatedRoster.filter((p) => p.team === 'blue').length;
          promoted.team = greenCount <= blueCount ? 'green' : 'blue';
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
      match.updatedAt = new Date().toISOString();

      broadcastSSE('SYNC_ALL', {
        matches: db.matches,
        notifications: db.notifications,
      });

      return { status: 200, data: { success: true, match } };
    });

    res.status(result.status).json(result.data);
  });

  // Admin / Host Player Removal (Strict Host or Admin Auth Required)
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

  // Update Tactical Formation & Pitch Slots (Host or Admin Auth Required)
  app.post('/api/matches/:id/tactical', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { formationGreen, formationBlue, tacticalAssignments } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    if (formationGreen) match.formationGreen = formationGreen;
    if (formationBlue) match.formationBlue = formationBlue;
    if (tacticalAssignments) match.tacticalAssignments = tacticalAssignments;
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // Smart Auto-Balance Teams Algorithm (Host or Admin Auth Required)
  app.post('/api/matches/:id/auto-balance', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    if (match.roster.length < 2) {
      return res.status(400).json({ success: false, error: 'Need at least 2 players to balance teams.' });
    }

    // Sort players by skill rating & reliability (descending)
    const sortedPlayers = [...match.roster].sort((a, b) => {
      const ratingA = (a.rating || 4.5) * 0.7 + ((a.reliabilityScore || 95) / 100) * 0.3;
      const ratingB = (b.rating || 4.5) * 0.7 + ((b.reliabilityScore || 95) / 100) * 0.3;
      return ratingB - ratingA;
    });

    const greenTeam: PlayerRosterItem[] = [];
    const blueTeam: PlayerRosterItem[] = [];

    // Snake drafting for balanced rating distribution
    sortedPlayers.forEach((player, index) => {
      const isGreen = index % 4 === 0 || index % 4 === 3;
      if (isGreen) {
        greenTeam.push({ ...player, team: 'green' });
      } else {
        blueTeam.push({ ...player, team: 'blue' });
      }
    });

    match.roster = [...greenTeam, ...blueTeam];
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match, greenCount: greenTeam.length, blueCount: blueTeam.length });
  });

  // Post-Match Attendance & Reliability Scoring (Host or Admin Auth Required)
  app.post('/api/matches/:id/attendance', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { attendedPlayerIds, noShowPlayerIds } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    match.attendedPlayerIds = attendedPlayerIds || [];
    match.noShowPlayerIds = noShowPlayerIds || [];
    match.status = 'completed';
    match.updatedAt = new Date().toISOString();

    // Recalculate reliability score for attended players (+1 attended)
    (attendedPlayerIds || []).forEach((pId: string) => {
      const user = db.users.find((u) => u.id === pId);
      if (user) {
        user.matchesAttended = (user.matchesAttended || 0) + 1;
        user.matchesPlayed = (user.matchesPlayed || 0) + 1;
        const total = (user.matchesAttended || 1) + (user.noShowCount || 0);
        user.reliabilityScore = Math.min(100, Math.round(((user.matchesAttended || 1) / total) * 100));
      }
    });

    // Recalculate for no-show players (-reliability)
    (noShowPlayerIds || []).forEach((pId: string) => {
      const user = db.users.find((u) => u.id === pId);
      if (user) {
        user.noShowCount = (user.noShowCount || 0) + 1;
        const total = (user.matchesAttended || 0) + (user.noShowCount || 1);
        user.reliabilityScore = Math.max(10, Math.round(((user.matchesAttended || 0) / total) * 100));
      }
    });

    broadcastSSE('SYNC_ALL', {
      matches: db.matches,
      users: db.users,
    });

    res.json({ success: true, match });
  });

  // Toggle Lock (Host or Admin Auth Required)
  app.post('/api/matches/:id/toggle-lock', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    match.isLocked = !match.isLocked;
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // Toggle Player Paid (Host or Admin Auth Required)
  app.post('/api/matches/:id/toggle-paid', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { playerId } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    const currentPaid = match.paidPlayerIds || [];
    const isPaid = currentPaid.includes(playerId);
    match.paidPlayerIds = isPaid ? currentPaid.filter((id) => id !== playerId) : [...currentPaid, playerId];
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // Update Match Pitch Cost (Host or Admin Auth Required)
  app.post('/api/matches/:id/cost', requireAdminOrHost, (req: AuthenticatedRequest, res) => {
    const matchId = req.params.id;
    const { totalCost, pricePerPlayer } = req.body;
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) return res.status(404).json({ success: false, error: 'Match not found' });

    match.totalPitchCost = totalCost;
    match.pricePerPlayer = pricePerPlayer;
    match.updatedAt = new Date().toISOString();

    broadcastSSE('SYNC_MATCHES', db.matches);
    res.json({ success: true, match });
  });

  // ---------------------------------------------------------
  // COMMENTS, ANNOUNCEMENTS, DIRECT MESSAGES & NOTIFICATIONS
  // ---------------------------------------------------------

  // Comments (Auth Required)
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
    if (db.comments[matchId]) {
      const isSuper = req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin);
      db.comments[matchId] = db.comments[matchId].filter((c) => {
        if (c.id === commentId) {
          return c.userId !== req.user?.id && !isSuper;
        }
        return true;
      });
      broadcastSSE('SYNC_COMMENTS', db.comments);
    }
    res.json({ success: true });
  });

  // Announcements (Strict Admin Auth Required)
  app.post('/api/announcements', requireAdmin, (req: AuthenticatedRequest, res) => {
    const announcement = req.body;
    const newAnn = {
      ...announcement,
      id: announcement.id || `ann_${Date.now()}`,
      authorName: req.user?.name || announcement.authorName || 'Mustapha Bouhbous (Admin)',
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

  // Direct Messages (Auth Required)
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
    const isSuper = req.user && (isSuperAdminEmail(req.user.email) || req.user.isAdmin);
    db.directMessages = db.directMessages.filter((m) => {
      if (m.id === id) {
        return m.senderId !== req.user?.id && !isSuper;
      }
      return true;
    });
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

  // Notifications
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

  // Reset to default data (Strict Admin Auth Required)
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
    console.log(`[PitchMate Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
