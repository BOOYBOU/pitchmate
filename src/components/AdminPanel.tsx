import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  Database,
  Users,
  Calendar,
  Trash2,
  Lock,
  Unlock,
  Edit2,
  Plus,
  Send,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Flame,
  UserCheck,
  UserX,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  MessageSquare,
  MessageCircle,
  Eye,
  Filter,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { SoccerMatch, UserProfile, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, isSuperAdminEmail, verifySuperAdminMasterPassword, DirectMessage, MatchComment } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { isSupabaseConfigured, SUPABASE_SETUP_SQL } from '../lib/supabase';

interface AdminPanelProps {
  onOpenMatchDetails: (match: SoccerMatch) => void;
  onOpenCreateMatch: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onOpenMatchDetails, onOpenCreateMatch }) => {
  const {
    currentUser,
    users,
    matches,
    announcements,
    directMessages,
    comments,
    isSupabaseLive,
    deleteMatch,
    updateMatch,
    toggleMatchLock,
    removePlayerFromMatch,
    updateUserProfile,
    createAnnouncement,
    deleteAnnouncement,
    resetToDefaultData,
    setCurrentUserById,
    authenticateSuperAdmin,
    banUser,
    unbanUser,
    approveUser,
    rejectUser,
    approveAllPendingUsers,
    deleteDirectMessage,
    deleteComment,
  } = usePitchStore();

  const isMustapha = isSuperAdminEmail(currentUser.email);

  // Admin access unlock state
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');

  // Active admin tab
  const [activeAdminTab, setActiveAdminTab] = useState<'pending' | 'matches' | 'users' | 'announcements' | 'chats' | 'supabase'>('pending');

  // Chat Oversight state
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatUserFilter, setChatUserFilter] = useState<string>('all');
  const [chatViewMode, setChatViewMode] = useState<'threads' | 'all_messages' | 'comments'>('threads');
  const [selectedThreadPair, setSelectedThreadPair] = useState<{ userAId: string; userBId: string } | null>(null);

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'info' | 'warning' | 'pitch_update'>('info');
  const [copiedSql, setCopiedSql] = useState(false);

  // Search in tables
  const [matchSearch, setMatchSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Editing match modal
  const [editingMatch, setEditingMatch] = useState<SoccerMatch | null>(null);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    await createAnnouncement(annTitle.trim(), annMessage.trim(), annType);
    setAnnTitle('');
    setAnnMessage('');
  };

  const handleAdminPasswordUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError('');
    if (!adminPasswordInput) {
      setAdminPasswordError('Please enter the Super Admin master password');
      return;
    }

    const success = authenticateSuperAdmin(adminPasswordInput);
    if (success) {
      setAdminPasswordInput('');
      setAdminPasswordError('');
    } else {
      setAdminPasswordError('Invalid Master Password. Access restricted to authorized Super Admin.');
    }
  };

  // Strict Admin Access Guard
  if (!isMustapha) {
    return (
      <div id="admin-access-denied" className="max-w-md mx-auto py-12 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-950/40">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold font-display text-white">Super Admin Access Required</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Admin Panel privileges and platform management controls are restricted exclusively to:
          </p>
          <div className="p-3 bg-[#0E1526] border border-emerald-500/30 rounded-2xl text-xs font-mono text-emerald-400">
            {SUPER_ADMIN_EMAIL}
          </div>
          <p className="text-[11px] text-slate-500">
            Currently logged in as: <span className="text-slate-300">{currentUser.email}</span>
          </p>
        </div>

        {/* Master Password Challenge Form */}
        <form onSubmit={handleAdminPasswordUnlock} className="space-y-3 pt-2 text-left">
          {adminPasswordError && (
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
              {adminPasswordError}
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1">
              Super Admin Master Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="admin-master-password-input"
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Enter Master Password..."
                className="w-full pl-9 pr-3 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            id="authenticate-mustapha-admin-btn"
            type="submit"
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            Unlock Admin Panel With Master Password
          </button>
        </form>
      </div>
    );
  }

  const filteredMatches = matches.filter((m) =>
    m.title.toLowerCase().includes(matchSearch.toLowerCase()) ||
    m.location.venueName.toLowerCase().includes(matchSearch.toLowerCase()) ||
    m.creatorName.toLowerCase().includes(matchSearch.toLowerCase())
  );

  const pendingUsers = users.filter((u) => u.status === 'pending');

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div id="admin-panel-container" className="space-y-6">
      {/* Admin Status Header */}
      <div className="bg-gradient-to-r from-[#0E1526] via-[#131C31] to-[#0E1526] border border-[#1E293B] rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-display text-white">Admin Command Center</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Full Privileges
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Authorized Administrator: <strong className="text-emerald-400">{SUPER_ADMIN_EMAIL} (Mustapha)</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Global Admin Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-[#1E293B]">
          <div className="p-3 bg-[#090D16]/80 rounded-xl border border-[#1E293B]">
            <div className="text-xs text-slate-400">Pending Approvals</div>
            <div className={`text-lg font-black font-display ${pendingUsers.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              {pendingUsers.length} waiting
            </div>
          </div>

          <div className="p-3 bg-[#090D16]/80 rounded-xl border border-[#1E293B]">
            <div className="text-xs text-slate-400">Total Matches</div>
            <div className="text-lg font-black text-emerald-400 font-display">{matches.length}</div>
          </div>

          <div className="p-3 bg-[#090D16]/80 rounded-xl border border-[#1E293B]">
            <div className="text-xs text-slate-400">Registered Players</div>
            <div className="text-lg font-black text-blue-400 font-display">{users.length}</div>
          </div>

          <div className="p-3 bg-[#090D16]/80 rounded-xl border border-[#1E293B]">
            <div className="text-xs text-slate-400">Database Status</div>
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isSupabaseLive ? 'Supabase Live' : 'Synchronized Local'}
            </div>
          </div>

          <div className="p-3 bg-[#090D16]/80 rounded-xl border border-[#1E293B]">
            <div className="text-xs text-slate-400">Rosters Confirmed</div>
            <div className="text-lg font-black text-slate-200 font-display">
              {matches.reduce((acc, m) => acc + m.roster.length, 0)} slots
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3 overflow-x-auto">
        <button
          id="admin-pending-approvals-tab-btn"
          type="button"
          onClick={() => setActiveAdminTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'pending'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
              : 'bg-[#0E1526] text-amber-300 hover:text-amber-200 border border-amber-500/30'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>Pending Approvals</span>
          {pendingUsers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[10px] animate-bounce">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('matches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'matches'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-[#0E1526] text-slate-400 hover:text-white border border-[#1E293B]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Manage Matches ({matches.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'users'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-[#0E1526] text-slate-400 hover:text-white border border-[#1E293B]'
          }`}
        >
          <Users className="w-4 h-4" />
          Manage Players & Profiles ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'announcements'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-[#0E1526] text-slate-400 hover:text-white border border-[#1E293B]'
          }`}
        >
          <Send className="w-4 h-4" />
          Broadcast Announcements ({announcements.length})
        </button>

        <button
          id="admin-chat-oversight-tab-btn"
          type="button"
          onClick={() => setActiveAdminTab('chats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'chats'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-[#0E1526] text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat Oversight & Moderation ({directMessages.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'supabase'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-[#0E1526] text-slate-400 hover:text-white border border-[#1E293B]'
          }`}
        >
          <Database className="w-4 h-4" />
          Supabase Database & SQL
        </button>
      </div>

      {/* Tab 0: Pending User Approvals */}
      {activeAdminTab === 'pending' && (
        <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-white">Pending Player Registrations</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingUsers.length} Awaiting Approval
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                New accounts cannot sign in or access matches until you review and approve them here.
              </p>
            </div>

            {pendingUsers.length > 0 && (
              <button
                id="approve-all-pending-btn"
                type="button"
                onClick={() => {
                  if (window.confirm(`Approve all ${pendingUsers.length} pending player registrations?`)) {
                    approveAllPendingUsers();
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve All Pending ({pendingUsers.length})
              </button>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="py-12 px-4 rounded-xl bg-[#090D16] border border-[#1E293B] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  There are no pending registrations waiting for review. When new users sign up, their account requests will appear here immediately for approval.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((pUser) => (
                <div
                  key={pUser.id}
                  id={`pending-user-card-${pUser.id}`}
                  className="p-4 rounded-2xl bg-[#090D16] border border-amber-500/30 space-y-4 hover:border-amber-500/60 transition-colors shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={pUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                        alt={pUser.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-500/40 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {pUser.name}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Pending Review
                          </span>
                        </h4>
                        <span className="text-xs text-slate-400 font-mono block">{pUser.email}</span>
                      </div>
                    </div>
                  </div>

                  {pUser.bio && (
                    <p className="text-xs text-slate-300 italic bg-[#0B1120] p-2.5 rounded-xl border border-[#1E293B]">
                      "{pUser.bio}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-[#1E293B]">
                    <button
                      id={`approve-user-btn-${pUser.id}`}
                      type="button"
                      onClick={() => approveUser(pUser.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      Approve Account
                    </button>

                    <button
                      id={`reject-user-btn-${pUser.id}`}
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Reject registration request for ${pUser.name}?`)) {
                          rejectUser(pUser.id);
                        }
                      }}
                      className="py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UserX className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Unrestricted Match Management */}
      {activeAdminTab === 'matches' && (
        <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-display text-white">Unrestricted Match Control</h2>
              <p className="text-xs text-slate-400">Edit, delete, lock, or override rosters for any match across the platform</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search matches..."
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <button
                onClick={onOpenCreateMatch}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Match
              </button>
            </div>
          </div>

          {/* Matches Table */}
          <div className="overflow-x-auto border border-[#1E293B] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090D16] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3">Match Title</th>
                  <th className="px-4 py-3">Venue & Pitch</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Roster</th>
                  <th className="px-4 py-3">Organizer</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-slate-200">
                {filteredMatches.map((m) => {
                  const mDate = new Date(m.dateTime);
                  return (
                    <tr key={m.id} className="hover:bg-[#131C31]/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenMatchDetails(m)}
                            className="hover:text-emerald-400 text-left font-bold"
                          >
                            {m.title}
                          </button>
                          {m.isLocked && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300">
                              Locked
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {m.format ? `${m.format} • ` : ''}{m.pricePerPlayer === 0 ? 'Free' : `$${m.pricePerPlayer}`}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <div className="truncate max-w-[160px]">{m.location.venueName}</div>
                        <span className="text-[10px] text-slate-500">{m.location.pitchNumber || 'Pitch 1'}</span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <div>{mDate.toLocaleDateString()}</div>
                        <span className="text-[10px] text-slate-400">
                          {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-400">{m.roster.length}</span>
                        <span className="text-slate-400">/{m.maxPlayers}</span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <div className="truncate max-w-[120px]">{m.creatorName}</div>
                        <span className="text-[10px] text-slate-500">{m.creatorEmail}</span>
                      </td>

                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => toggleMatchLock(m.id)}
                          className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-800/80 rounded-lg transition-colors"
                          title={m.isLocked ? 'Unlock roster' : 'Lock roster'}
                        >
                          {m.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => onOpenMatchDetails(m)}
                          className="p-1.5 text-slate-400 hover:text-blue-300 bg-slate-800/80 rounded-lg transition-colors"
                          title="Manage Roster"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete match "${m.title}"?`)) {
                              deleteMatch(m.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/80 rounded-lg transition-colors"
                          title="Delete match"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: User Profiles & Role Control */}
      {activeAdminTab === 'users' && (
        <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-display text-white">Player Profiles Directory</h2>
              <p className="text-xs text-slate-400">View all registered players, adjust jersey numbers, or manage admin rights</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search players by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-[#1E293B] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090D16] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1E293B]">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Role / Status</th>
                  <th className="px-4 py-3">Position & Jersey</th>
                  <th className="px-4 py-3">Matches</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B] text-slate-200">
                {filteredUsers.map((u) => {
                  const isUserSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                  return (
                    <tr key={u.id} className={`hover:bg-[#131C31]/60 transition-colors ${u.isBanned ? 'bg-rose-950/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={u.name}
                            className={`w-8 h-8 rounded-full object-cover border ${u.isBanned ? 'border-rose-500' : 'border-slate-700'}`}
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white block">{u.name}</span>
                              {u.isBanned && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  Banned
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{u.email}</span>
                            {u.isBanned && u.banReason && (
                              <span className="text-[10px] text-rose-400 block italic">
                                Reason: {u.banReason}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isUserSuperAdmin ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Super Admin (Exclusive)
                          </span>
                        ) : u.isBanned ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Suspended Account
                          </span>
                        ) : u.status === 'pending' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pending Approval
                          </span>
                        ) : u.status === 'rejected' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Approved Player
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        <span>#{u.jerseyNumber}</span> • <span>{u.preferredPosition}</span> •{' '}
                        <span>{u.preferredFoot} Foot</span>
                      </td>

                      <td className="px-4 py-3 text-slate-300">{u.matchesPlayed} games</td>

                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {u.status === 'pending' && (
                          <button
                            onClick={() => approveUser(u.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-sm shadow-emerald-950"
                            title="Approve player registration"
                          >
                            Approve
                          </button>
                        )}

                        <button
                          onClick={() => setCurrentUserById(u.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                          title="Switch active user to this profile"
                        >
                          Login As
                        </button>

                        {!isUserSuperAdmin && (
                          u.isBanned ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Reinstate ${u.name}'s account?`)) {
                                  unbanUser(u.id);
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                              title="Unban player"
                            >
                              Reinstate
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = window.prompt(`Reason for suspending ${u.name}:`, 'Unsportsmanlike conduct / repeated no-shows');
                                if (reason) {
                                  banUser(u.id, reason);
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                              title="Ban or suspend player account"
                            >
                              Suspend
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Announcements Broadcaster */}
      {activeAdminTab === 'announcements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Announcement Form */}
          <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Publish System Broadcast
            </h2>
            <p className="text-xs text-slate-400">Broadcast weather updates, pitch changes, or tournament notices to all players</p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Pitch 3 Light Maintenance"
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Announcement Type</label>
                <select
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-white"
                >
                  <option value="info">General Info (Green)</option>
                  <option value="warning">Warning / Weather (Amber)</option>
                  <option value="pitch_update">Pitch Venue Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Message Content</label>
                <textarea
                  rows={3}
                  required
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Details for all players..."
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Broadcast Notice
              </button>
            </form>
          </div>

          {/* Active Announcements list */}
          <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold font-display text-white">Active Broadcasts ({announcements.length})</h2>

            <div className="space-y-2.5">
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No active announcements right now.</p>
              ) : (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3.5 bg-[#090D16] border border-[#1E293B] rounded-xl space-y-1 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300">{ann.title}</span>
                      <button
                        onClick={() => deleteAnnouncement(ann.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-300">{ann.message}</p>
                    <div className="text-[10px] text-slate-500 pt-1">
                      By {ann.authorName} • {new Date(ann.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Super Admin Chat Oversight & Platform Moderation */}
      {activeAdminTab === 'chats' && (() => {
        // Group direct messages by unique user pairs (order-independent)
        const conversationPairsMap = new Map<string, {
          pairKey: string;
          userA: UserProfile;
          userB: UserProfile;
          messages: DirectMessage[];
          lastMessage: DirectMessage;
        }>();

        directMessages.forEach((msg) => {
          const sortedIds = [msg.senderId, msg.receiverId].sort();
          const pairKey = `${sortedIds[0]}_${sortedIds[1]}`;
          const userA = users.find((u) => u.id === sortedIds[0]);
          const userB = users.find((u) => u.id === sortedIds[1]);

          if (userA && userB) {
            if (!conversationPairsMap.has(pairKey)) {
              conversationPairsMap.set(pairKey, {
                pairKey,
                userA,
                userB,
                messages: [],
                lastMessage: msg,
              });
            }
            const item = conversationPairsMap.get(pairKey)!;
            item.messages.push(msg);
            if (new Date(msg.createdAt).getTime() > new Date(item.lastMessage.createdAt).getTime()) {
              item.lastMessage = msg;
            }
          }
        });

        const conversationPairs = Array.from(conversationPairsMap.values()).sort(
          (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
        );

        // Filter conversation pairs by search & selected user filter
        const filteredPairs = conversationPairs.filter((pair) => {
          const matchesUser =
            chatUserFilter === 'all' ||
            pair.userA.id === chatUserFilter ||
            pair.userB.id === chatUserFilter;

          const matchesSearch =
            !chatSearchQuery.trim() ||
            pair.userA.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
            pair.userB.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
            pair.messages.some((m) => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()));

          return matchesUser && matchesSearch;
        });

        // If no active thread selected, default to first available
        const currentActivePair = selectedThreadPair
          ? conversationPairs.find(
              (p) =>
                (p.userA.id === selectedThreadPair.userAId && p.userB.id === selectedThreadPair.userBId) ||
                (p.userA.id === selectedThreadPair.userBId && p.userB.id === selectedThreadPair.userAId)
            ) || filteredPairs[0] || null
          : filteredPairs[0] || null;

        // All direct messages flat list for table view
        const filteredAllMessages = directMessages
          .filter((msg) => {
            const sender = users.find((u) => u.id === msg.senderId);
            const receiver = users.find((u) => u.id === msg.receiverId);

            const matchesUser =
              chatUserFilter === 'all' ||
              msg.senderId === chatUserFilter ||
              msg.receiverId === chatUserFilter;

            const matchesSearch =
              !chatSearchQuery.trim() ||
              msg.text.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
              (sender && sender.name.toLowerCase().includes(chatSearchQuery.toLowerCase())) ||
              (receiver && receiver.name.toLowerCase().includes(chatSearchQuery.toLowerCase()));

            return matchesUser && matchesSearch;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Match comments flat list
        const allCommentsList: { match: SoccerMatch; comment: MatchComment }[] = [];
        Object.entries(comments).forEach(([matchId, list]) => {
          const matchObj = matches.find((m) => m.id === matchId);
          if (matchObj && Array.isArray(list)) {
            (list as MatchComment[]).forEach((c) => allCommentsList.push({ match: matchObj, comment: c }));
          }
        });

        const filteredComments = allCommentsList
          .filter(({ match, comment }) => {
            const matchesUser =
              chatUserFilter === 'all' || comment.userId === chatUserFilter;

            const matchesSearch =
              !chatSearchQuery.trim() ||
              comment.text.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
              comment.userName.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
              match.title.toLowerCase().includes(chatSearchQuery.toLowerCase());

            return matchesUser && matchesSearch;
          })
          .sort((a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime());

        return (
          <div className="space-y-6">
            {/* Super Admin Oversight Security Header */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#0E1526] to-[#090D16] border border-emerald-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold font-display text-white">
                        Super Admin Chat Oversight & Platform Moderation
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Admin Confidential
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Exclusive monitoring and enforcement terminal authorized strictly for{' '}
                      <strong className="text-emerald-400">{SUPER_ADMIN_EMAIL}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Platform Security Protocol</span>
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 justify-end">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Message Auditing Active
                  </span>
                </div>
              </div>

              {/* Oversight Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-emerald-500/20">
                <div className="p-3 bg-[#090D16]/90 rounded-xl border border-[#1E293B]">
                  <div className="text-xs text-slate-400">Total Direct Messages</div>
                  <div className="text-lg font-black text-emerald-400 font-display">{directMessages.length}</div>
                </div>

                <div className="p-3 bg-[#090D16]/90 rounded-xl border border-[#1E293B]">
                  <div className="text-xs text-slate-400">Active Chat Threads</div>
                  <div className="text-lg font-black text-blue-400 font-display">{conversationPairs.length}</div>
                </div>

                <div className="p-3 bg-[#090D16]/90 rounded-xl border border-[#1E293B]">
                  <div className="text-xs text-slate-400">Match Comments</div>
                  <div className="text-lg font-black text-amber-400 font-display">{allCommentsList.length}</div>
                </div>

                <div className="p-3 bg-[#090D16]/90 rounded-xl border border-[#1E293B]">
                  <div className="text-xs text-slate-400">Suspended Users</div>
                  <div className="text-lg font-black text-rose-400 font-display">
                    {users.filter((u) => u.isBanned).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Sub-View Controls */}
            <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Sub-View Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChatViewMode('threads')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chatViewMode === 'threads'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-[#090D16] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Conversation Inspector ({filteredPairs.length})
                </button>

                <button
                  type="button"
                  onClick={() => setChatViewMode('all_messages')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chatViewMode === 'all_messages'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-[#090D16] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  All Messages Audit Log ({filteredAllMessages.length})
                </button>

                <button
                  type="button"
                  onClick={() => setChatViewMode('comments')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chatViewMode === 'comments'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-[#090D16] text-slate-400 hover:text-white border border-[#1E293B]'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Match Boards ({filteredComments.length})
                </button>
              </div>

              {/* Search & Player Filter */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search keywords, players..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="shrink-0">
                  <select
                    value={chatUserFilter}
                    onChange={(e) => setChatUserFilter(e.target.value)}
                    className="px-3 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="all">All Players</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* View Mode 1: Conversation Inspector (Split View) */}
            {chatViewMode === 'threads' && (
              <div className="bg-[#0E1526] border border-[#1E293B] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[620px]">
                {/* Left Panel: Conversation Threads List */}
                <div className="w-full md:w-80 md:border-r border-[#1E293B] flex flex-col bg-[#090D16]/95">
                  <div className="p-3.5 border-b border-[#1E293B] bg-[#0E1526]/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 font-display">
                      Player Dialogues ({filteredPairs.length})
                    </span>
                    <span className="text-[10px] text-slate-500">Click to inspect</span>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]/60">
                    {filteredPairs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No conversations matched your filter.
                      </div>
                    ) : (
                      filteredPairs.map((pair) => {
                        const isSelected =
                          currentActivePair &&
                          ((currentActivePair.userA.id === pair.userA.id && currentActivePair.userB.id === pair.userB.id) ||
                            (currentActivePair.userA.id === pair.userB.id && currentActivePair.userB.id === pair.userA.id));

                        return (
                          <button
                            key={pair.pairKey}
                            type="button"
                            onClick={() =>
                              setSelectedThreadPair({
                                userAId: pair.userA.id,
                                userBId: pair.userB.id,
                              })
                            }
                            className={`w-full p-3.5 flex flex-col gap-2 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#131C31] border-l-4 border-emerald-400'
                                : 'hover:bg-[#0E1526]/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              {/* Avatars Pair */}
                              <div className="flex items-center -space-x-2">
                                <img
                                  src={pair.userA.avatarUrl}
                                  alt={pair.userA.name}
                                  className="w-7 h-7 rounded-full object-cover border border-emerald-500/40"
                                  referrerPolicy="no-referrer"
                                />
                                <img
                                  src={pair.userB.avatarUrl}
                                  alt={pair.userB.name}
                                  className="w-7 h-7 rounded-full object-cover border border-blue-500/40"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <span className="text-[10px] text-slate-500">
                                {new Date(pair.lastMessage.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1 text-xs font-bold text-white truncate">
                                <span className={pair.userA.isBanned ? 'text-rose-400 line-through' : ''}>
                                  {pair.userA.name}
                                </span>
                                <span className="text-slate-500 font-normal">↔</span>
                                <span className={pair.userB.isBanned ? 'text-rose-400 line-through' : ''}>
                                  {pair.userB.name}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                <strong className="text-slate-300">
                                  {pair.lastMessage.senderId === pair.userA.id ? pair.userA.name : pair.userB.name}:
                                </strong>{' '}
                                {pair.lastMessage.text}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-[#1E293B]/40">
                              <span>{pair.messages.length} messages total</span>
                              {(pair.userA.isBanned || pair.userB.isBanned) && (
                                <span className="text-rose-400 font-bold">Suspended User Present</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Panel: Selected Conversation Stream with Moderation Controls */}
                <div className="flex-1 flex flex-col bg-[#0E1526] min-w-0">
                  {currentActivePair ? (
                    <>
                      {/* Thread Header */}
                      <div className="p-4 border-b border-[#1E293B] bg-[#0E1526] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center -space-x-2">
                            <img
                              src={currentActivePair.userA.avatarUrl}
                              alt={currentActivePair.userA.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                              referrerPolicy="no-referrer"
                            />
                            <img
                              src={currentActivePair.userB.avatarUrl}
                              alt={currentActivePair.userB.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold font-display text-white">
                                {currentActivePair.userA.name} &amp; {currentActivePair.userB.name}
                              </h3>
                              <span className="px-2 py-0.2 rounded text-[9px] font-extrabold bg-blue-500/20 text-blue-300">
                                {currentActivePair.messages.length} Messages Exchanged
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{currentActivePair.userA.email}</span>
                              <span>•</span>
                              <span>{currentActivePair.userB.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Player Quick Moderation Tools */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {/* User A Moderation */}
                          {currentActivePair.userA.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() && (
                            currentActivePair.userA.isBanned ? (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Reinstate ${currentActivePair.userA.name}?`)) {
                                    unbanUser(currentActivePair.userA.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40 cursor-pointer"
                              >
                                Reinstate {currentActivePair.userA.name}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const reason = window.prompt(`Reason for suspending ${currentActivePair.userA.name}:`, 'Harassment in direct messages');
                                  if (reason) banUser(currentActivePair.userA.id, reason);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/40 cursor-pointer"
                              >
                                Suspend {currentActivePair.userA.name}
                              </button>
                            )
                          )}

                          {/* User B Moderation */}
                          {currentActivePair.userB.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() && (
                            currentActivePair.userB.isBanned ? (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Reinstate ${currentActivePair.userB.name}?`)) {
                                    unbanUser(currentActivePair.userB.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40 cursor-pointer"
                              >
                                Reinstate {currentActivePair.userB.name}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const reason = window.prompt(`Reason for suspending ${currentActivePair.userB.name}:`, 'Harassment in direct messages');
                                  if (reason) banUser(currentActivePair.userB.id, reason);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/40 cursor-pointer"
                              >
                                Suspend {currentActivePair.userB.name}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Full Message Stream */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-[#090D16]/50">
                        {currentActivePair.messages
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                          .map((msg) => {
                            const isSenderA = msg.senderId === currentActivePair.userA.id;
                            const sender = isSenderA ? currentActivePair.userA : currentActivePair.userB;
                            const receiver = isSenderA ? currentActivePair.userB : currentActivePair.userA;
                            const msgTime = new Date(msg.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <div
                                key={msg.id}
                                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                                  isSenderA
                                    ? 'bg-[#10182C] border-emerald-500/20'
                                    : 'bg-[#131C31] border-blue-500/20'
                                }`}
                              >
                                <img
                                  src={sender.avatarUrl}
                                  alt={sender.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 mt-0.5"
                                  referrerPolicy="no-referrer"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-white">{sender.name}</span>
                                      <span className="text-[10px] text-slate-400">➔ to {receiver.name}</span>
                                      {sender.isBanned && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300">
                                          Banned
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500">{msgTime}</span>
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Delete message "${msg.text}" from platform?`)) {
                                            deleteDirectMessage(msg.id);
                                          }
                                        }}
                                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                        title="Admin Delete Message"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Attached Image Thumbnail */}
                                  {msg.imageUrl && (
                                    <div className="my-1.5 max-w-xs rounded-xl overflow-hidden border border-slate-700 bg-black/40">
                                      <img
                                        src={msg.imageUrl}
                                        alt="Shared media"
                                        className="max-h-48 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(msg.imageUrl, '_blank')}
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="p-1.5 text-[10px] text-slate-400 flex items-center justify-between bg-[#090D16]/90">
                                        <span className="flex items-center gap-1 text-emerald-400">
                                          <ImageIcon className="w-3 h-3" /> Photo Attached
                                        </span>
                                        <a
                                          href={msg.imageUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-400 hover:underline"
                                        >
                                          Open full size ↗
                                        </a>
                                      </div>
                                    </div>
                                  )}

                                  {msg.text && (
                                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                                      {msg.text}
                                    </p>
                                  )}

                                  <div className="mt-1.5 text-[9px] text-slate-500 flex items-center gap-2">
                                    <span>Status: {msg.read ? 'Read by recipient' : 'Sent / Unread'}</span>
                                    <span>•</span>
                                    <span className="font-mono">ID: {msg.id}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center p-8 text-center text-xs text-slate-500">
                      Select a player dialogue on the left to inspect exchanged direct messages.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View Mode 2: All Messages Chronological Audit Log */}
            {chatViewMode === 'all_messages' && (
              <div className="bg-[#0E1526] border border-[#1E293B] rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#1E293B] bg-[#090D16]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-display text-white">
                      Complete Direct Messages Chronological Ledger
                    </h3>
                    <span className="px-2 py-0.2 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300">
                      {filteredAllMessages.length} Entries
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">All registered player-to-player exchanges</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#090D16] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1E293B]">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Sender</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Message Content</th>
                        <th className="px-4 py-3">Delivery Status</th>
                        <th className="px-4 py-3 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B] text-slate-200">
                      {filteredAllMessages.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No direct messages found matching query.
                          </td>
                        </tr>
                      ) : (
                        filteredAllMessages.map((msg) => {
                          const sender = users.find((u) => u.id === msg.senderId) || {
                            name: 'Unknown User',
                            email: 'unknown',
                            avatarUrl: '',
                            isBanned: false,
                          };
                          const receiver = users.find((u) => u.id === msg.receiverId) || {
                            name: 'Unknown User',
                            email: 'unknown',
                            avatarUrl: '',
                            isBanned: false,
                          };

                          return (
                            <tr key={msg.id} className="hover:bg-[#131C31]/60 transition-colors">
                              <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                                {new Date(msg.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={sender.avatarUrl}
                                    alt={sender.name}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-700"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <span className="font-bold text-white block">{sender.name}</span>
                                    <span className="text-[10px] text-slate-400">{sender.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={receiver.avatarUrl}
                                    alt={receiver.name}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-700"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <span className="font-bold text-white block">{receiver.name}</span>
                                    <span className="text-[10px] text-slate-400">{receiver.email}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 max-w-xs">
                                {msg.imageUrl && (
                                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <a
                                      href={msg.imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="hover:underline flex items-center gap-1"
                                    >
                                      [Photo Attached ↗]
                                    </a>
                                  </div>
                                )}
                                {msg.text && (
                                  <p className="text-slate-200 line-clamp-2 leading-relaxed">{msg.text}</p>
                                )}
                              </td>

                              <td className="px-4 py-3 whitespace-nowrap">
                                {msg.read ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                    Delivered &amp; Read
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                                    Delivered / Unread
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete message "${msg.text}" from platform?`)) {
                                      deleteDirectMessage(msg.id);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Delete Message"
                                >
                                  Delete
                                </button>

                                {msg.senderId !== currentUser.id && (
                                  <button
                                    onClick={() => {
                                      const reason = window.prompt(`Reason for suspending ${sender.name}:`, 'Spam or offensive direct messages');
                                      if (reason) banUser(msg.senderId, reason);
                                    }}
                                    className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                    title="Suspend Sender"
                                  >
                                    Suspend Sender
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View Mode 3: Match Comments Moderation */}
            {chatViewMode === 'comments' && (
              <div className="bg-[#0E1526] border border-[#1E293B] rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[#1E293B] bg-[#090D16]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-display text-white">
                      Public Match Discussion Boards &amp; Comments
                    </h3>
                    <span className="px-2 py-0.2 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300">
                      {filteredComments.length} Comments
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Comments posted on public match rosters</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#090D16] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1E293B]">
                      <tr>
                        <th className="px-4 py-3">Match</th>
                        <th className="px-4 py-3">Author</th>
                        <th className="px-4 py-3">Comment Text</th>
                        <th className="px-4 py-3">Posted Date</th>
                        <th className="px-4 py-3 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B] text-slate-200">
                      {filteredComments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            No match comments found matching query.
                          </td>
                        </tr>
                      ) : (
                        filteredComments.map(({ match, comment }) => (
                          <tr key={comment.id} className="hover:bg-[#131C31]/60 transition-colors">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => onOpenMatchDetails(match)}
                                className="font-bold text-emerald-400 hover:underline text-left block"
                              >
                                {match.title}
                              </button>
                              <span className="text-[10px] text-slate-400">{match.location.venueName}</span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={comment.userAvatar}
                                  alt={comment.userName}
                                  className="w-6 h-6 rounded-full object-cover border border-slate-700"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <span className="font-bold text-white block">{comment.userName}</span>
                                  <span className="text-[10px] text-slate-400">{comment.userEmail}</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 max-w-sm">
                              <p className="text-slate-200 leading-relaxed">{comment.text}</p>
                            </td>

                            <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                              {new Date(comment.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>

                            <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete comment "${comment.text}"?`)) {
                                    deleteComment(match.id, comment.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Delete Comment"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab 5: Supabase Database Hub */}
      {activeAdminTab === 'supabase' && (
        <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold font-display text-white">Supabase Cloud Database Hub</h2>
              </div>
              <p className="text-xs text-slate-400">
                Connect your Supabase project to persist matches, rosters, comments, and realtime publications across devices.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToDefaultData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                title="Reset local cache to demo fixtures"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Sample Fixtures
              </button>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="p-4 bg-[#090D16] border border-[#1E293B] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isSupabaseLive ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-blue-400'
                }`}
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  {isSupabaseLive ? 'Supabase Connected & Synchronized' : 'High-Fidelity Realtime Engine Active'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isSupabaseConfigured
                    ? 'Connected with live Supabase client & postgres_changes channel'
                    : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment to bind your Supabase database instance'}
                </span>
              </div>
            </div>
          </div>

          {/* 1-Click Supabase SQL Script Generator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Supabase Tables & Realtime SQL Schema
              </span>

              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}
              </button>
            </div>

            <pre className="p-4 bg-[#090D16] border border-[#1E293B] rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
