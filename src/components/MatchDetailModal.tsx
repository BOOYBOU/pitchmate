import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Shield,
  Send,
  MessageSquare,
  Lock,
  Unlock,
  Trash2,
  Share2,
  Check,
  X,
  ExternalLink,
  UserCheck,
  UserX,
  Sparkles,
  Shirt,
  Navigation,
  MessageCircle,
  AlertTriangle,
  Phone,
  Mic,
  Droplets,
  CheckCircle2,
  Edit2,
  Activity,
  ClipboardList,
} from 'lucide-react';
import { SoccerMatch, TeamSide, isSuperAdminEmail } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { VoiceNoteRecorder, VoiceNotePlayer } from './VoiceNotes';
import { getMatchMapUrl } from '../lib/mapUtils';
import { TacticalPitchFormation } from './TacticalPitchFormation';
import { MatchShareModal } from './MatchShareModal';

interface MatchDetailModalProps {
  match: SoccerMatch | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (match: SoccerMatch) => void;
  onOpenDirectMessage?: (userId: string) => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  isOpen,
  onClose,
  onEdit,
  onOpenDirectMessage,
}) => {
  const {
    currentUser,
    users,
    joinMatch,
    leaveMatch,
    assignPlayerTeam,
    removePlayerFromMatch,
    toggleMatchLock,
    deleteMatch,
    togglePlayerPaidStatus,
    updateMatchPitchCost,
    autoBalanceTeams,
    updateTacticalFormation,
    markMatchAttendance,
    comments,
    addComment,
    addVoiceComment,
    banUser,
    sendNotification,
  } = usePitchStore();

  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'tactical' | 'attendance'>('overview');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedBibFilter, setSelectedBibFilter] = useState<'all' | 'green' | 'blue'>('all');
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [editTotalCost, setEditTotalCost] = useState<number>(0);
  const [editPricePerPlayer, setEditPricePerPlayer] = useState<number>(0);

  // Attendance state
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [noShowIds, setNoShowIds] = useState<string[]>([]);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  if (!isOpen || !match) return null;

  const isUserInRoster = match.roster.some((p) => p.userId === currentUser.id);
  const isUserInWaitlist = match.waitlist.some((p) => p.userId === currentUser.id);
  const isCreator = match.creatorId === currentUser.id;
  const isAdmin = Boolean(currentUser?.isAdmin || isSuperAdminEmail(currentUser?.email));
  const canManage = isAdmin || isCreator;

  const matchComments = comments[match.id] || [];
  const spotsLeft = Math.max(0, match.maxPlayers - match.roster.length);
  const isMatchFull = spotsLeft === 0;

  // Split rosters by bib team
  const greenTeam = match.roster.filter((p) => p.team === 'green');
  const blueTeam = match.roster.filter((p) => p.team === 'blue');

  const matchDate = new Date(match.dateTime);
  const formattedDate = matchDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = matchDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Cost split calculations
  const totalCost = match.totalPitchCost ?? (match.pricePerPlayer * match.maxPlayers);
  const pricePerPlayer = match.pricePerPlayer;
  const paidPlayerIds = match.paidPlayerIds || [];
  const confirmedRosterCount = match.roster.length;
  const paidCount = paidPlayerIds.filter((id) => match.roster.some((p) => p.userId === id)).length;
  const collectedAmount = paidCount * pricePerPlayer;
  const remainingCost = Math.max(0, totalCost - collectedAmount);

  const handleJoin = async (teamSide?: TeamSide) => {
    setIsActionLoading(true);
    await joinMatch(match.id, teamSide);
    setIsActionLoading(false);
  };

  const handleLeave = async () => {
    setIsActionLoading(true);
    await leaveMatch(match.id);
    setIsActionLoading(false);
  };

  const handleAutoBalance = async () => {
    if (confirm('Auto-balance teams based on player skill ratings & positions (Snake Draft)?')) {
      setIsActionLoading(true);
      await autoBalanceTeams(match.id);
      setIsActionLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment(match.id, commentText);
    setCommentText('');
  };

  const handleSendVoiceNote = async (audioUrl: string, durationSeconds: number) => {
    await addVoiceComment(match.id, audioUrl, durationSeconds);
  };

  const handleDeleteMatch = async () => {
    if (confirm('Are you sure you want to permanently delete this match and cancel all player bookings?')) {
      await deleteMatch(match.id);
      onClose();
    }
  };

  const handleAdminBanUser = async (targetUserId: string, targetUserName: string) => {
    if (confirm(`ADMIN ACTION: Suspend player "${targetUserName}" from joining matches?`)) {
      await banUser(targetUserId, 'Suspended by Super Admin');
      await removePlayerFromMatch(match.id, targetUserId);
    }
  };

  const handleSaveCost = async () => {
    await updateMatchPitchCost(match.id, editTotalCost, editPricePerPlayer);
    setIsEditingCost(false);
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      await markMatchAttendance(match.id, attendedIds, noShowIds);
      alert('Match attendance & reliability scores successfully recorded!');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleSendFeeReminder = (player: { userId: string; name: string }) => {
    sendNotification({
      userId: player.userId,
      title: 'Match Fee Reminder',
      message: `Friendly reminder from the host to pay your $${match.pricePerPlayer} share for "${match.title}".`,
      type: 'cost_reminder',
      linkId: match.id,
    });
    alert(`Fee reminder sent to ${player.name}`);
  };

  const getPlayerReliability = (userId: string) => {
    const profile = users.find((u) => u.id === userId);
    return profile?.reliabilityScore ?? 95;
  };

  return (
    <>
      <div
        id="match-detail-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          id="match-detail-modal-card"
          className="relative w-full max-w-4xl bg-[#0E1526] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {match.format || '7v7'} Match
              </span>
              {match.isLocked ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lock className="w-3.5 h-3.5" /> Locked
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Unlock className="w-3.5 h-3.5" /> Open
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                id="match-detail-share-btn"
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Share WhatsApp invite card"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                Share
              </button>

              {canManage && (
                <button
                  id="match-detail-lock-toggle-btn"
                  type="button"
                  onClick={() => toggleMatchLock(match.id)}
                  className="p-2 text-slate-400 hover:text-amber-300 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title={match.isLocked ? 'Unlock match' : 'Lock match roster'}
                >
                  {match.isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </button>
              )}

              {canManage && (
                <button
                  id="match-detail-delete-btn"
                  type="button"
                  onClick={handleDeleteMatch}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Delete Match (Admin/Creator)"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <button
                id="match-detail-close-btn"
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Modal Tab Navigator */}
          <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 border-b border-slate-800">
            <button
              onClick={() => setActiveModalTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeModalTab === 'overview'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Rosters & Info
            </button>

            <button
              onClick={() => setActiveModalTab('tactical')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeModalTab === 'tactical'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              2D Tactical Pitch
            </button>

            {canManage && (
              <button
                onClick={() => setActiveModalTab('attendance')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === 'attendance'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
                Attendance & Reliability
              </button>
            )}
          </div>

          {/* Modal Main Scrollable Content */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {/* TAB 1: OVERVIEW & ROSTERS */}
            {activeModalTab === 'overview' && (
              <div className="space-y-6">
                {/* Title & Host row */}
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-white">{match.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      Organized by <strong className="text-slate-200">{match.creatorName}</strong>
                    </span>
                    {match.creatorEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" /> Super Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Key Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-400">Date</div>
                      <div className="text-xs font-bold text-slate-200">{formattedDate}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-400">Time & Duration</div>
                      <div className="text-xs font-bold text-slate-200">{formattedTime} ({match.durationMinutes}m)</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-400">Roster Capacity</div>
                      <div className="text-xs font-bold text-slate-200">
                        {match.roster.length} / {match.maxPlayers} Players
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-400">Cost per Player</div>
                      <div className="text-xs font-bold text-slate-200">
                        {match.pricePerPlayer === 0 ? 'Free to Play' : `$${match.pricePerPlayer} / player`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pitch Cost Split & Payment Collection Tracker */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          Pitch Cost Split & Payment Tracker
                        </h3>
                        <p className="text-xs text-slate-400">
                          Track pitch rental fees and verified player payments
                        </p>
                      </div>
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditTotalCost(totalCost);
                          setEditPricePerPlayer(pricePerPlayer);
                          setIsEditingCost(!isEditingCost);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        {isEditingCost ? 'Cancel' : 'Edit Pitch Fees'}
                      </button>
                    )}
                  </div>

                  {/* Edit Pitch Fee Drawer */}
                  {isEditingCost && (
                    <div className="p-4 rounded-xl bg-[#0E1526] border border-blue-500/30 space-y-3">
                      <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">Update Pitch Rental Pricing</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Total Pitch Rental Cost ($)</label>
                          <input
                            type="number"
                            value={editTotalCost}
                            onChange={(e) => setEditTotalCost(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Price Per Player Share ($)</label>
                          <input
                            type="number"
                            value={editPricePerPlayer}
                            onChange={(e) => setEditPricePerPlayer(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveCost}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}

                  {/* Cost Progress Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#0E1526] rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total Pitch Cost</span>
                      <span className="text-base font-bold text-white">${totalCost}</span>
                    </div>
                    <div className="p-3 bg-[#0E1526] rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Per Player Share</span>
                      <span className="text-base font-bold text-slate-200">${pricePerPlayer}</span>
                    </div>
                    <div className="p-3 bg-[#0E1526] rounded-xl border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 block">Collected So Far</span>
                      <span className="text-base font-bold text-emerald-400">${collectedAmount} ({paidCount} Paid)</span>
                    </div>
                    <div className="p-3 bg-[#0E1526] rounded-xl border border-amber-500/30">
                      <span className="text-[10px] text-amber-400 block">Uncollected Balance</span>
                      <span className="text-base font-bold text-amber-400">${remainingCost}</span>
                    </div>
                  </div>
                </div>

                {/* Location & Directions Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{match.location.venueName}</h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-emerald-400 border border-emerald-500/20">
                          {match.location.pitchNumber || 'Pitch 1'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{match.location.address}, {match.location.city}</p>
                    </div>
                  </div>

                  <a
                    id="open-match-google-maps-btn"
                    href={getMatchMapUrl(match.location)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition-all shrink-0 cursor-pointer shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Google Maps
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>

                {/* Team Rosters with Auto-Balance Control */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Confirmed Match Rosters</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManage && (
                        <button
                          type="button"
                          onClick={handleAutoBalance}
                          disabled={isActionLoading || match.roster.length < 2}
                          className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                          title="Auto-balance teams based on player skill ratings and positions"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          Auto-Balance
                        </button>
                      )}

                      {/* Filter Bibs */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedBibFilter('all')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            selectedBibFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          All ({match.roster.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBibFilter('green')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            selectedBibFilter === 'green' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                          }`}
                        >
                          Green ({greenTeam.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBibFilter('blue')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            selectedBibFilter === 'blue' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-300'
                          }`}
                        >
                          Blue ({blueTeam.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tactical Green vs Blue Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Green Team Column */}
                    {(selectedBibFilter === 'all' || selectedBibFilter === 'green') && (
                      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
                            <span className="text-sm font-bold text-emerald-400">Team Green Bibs</span>
                          </div>
                          <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                            {greenTeam.length} Players
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {greenTeam.length === 0 ? (
                            <p className="text-xs text-slate-500 py-3 text-center">No players assigned to Green yet.</p>
                          ) : (
                            greenTeam.map((player) => {
                              const isPaid = paidPlayerIds.includes(player.userId);
                              const reliability = getPlayerReliability(player.userId);
                              return (
                                <div
                                  key={player.userId}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0E1526] border border-slate-800 hover:border-emerald-500/30 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                                      alt={player.name}
                                      className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-white truncate">{player.name}</span>
                                        {player.isHost && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            Host
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-emerald-400 font-bold">
                                          {reliability}% Rel.
                                        </span>
                                        <span className="text-[10px] text-slate-500">•</span>
                                        <button
                                          type="button"
                                          onClick={() => canManage && togglePlayerPaidStatus(match.id, player.userId)}
                                          disabled={!canManage}
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 transition-all ${
                                            isPaid
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                          } ${canManage ? 'cursor-pointer hover:scale-105' : ''}`}
                                          title={canManage ? 'Click to toggle payment' : undefined}
                                        >
                                          <CheckCircle2 className={`w-2.5 h-2.5 ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`} />
                                          {isPaid ? 'Paid' : 'Unpaid'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {player.userId !== currentUser.id && onOpenDirectMessage && (
                                      <button
                                        onClick={() => onOpenDirectMessage(player.userId)}
                                        className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                        title={`Message ${player.name}`}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {canManage && (
                                      <button
                                        onClick={() => assignPlayerTeam(match.id, player.userId, 'blue')}
                                        className="px-2 py-1 text-[10px] font-medium rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 transition-colors cursor-pointer"
                                        title="Move to Blue bibs"
                                      >
                                        ➔ Blue
                                      </button>
                                    )}

                                    {canManage && player.userId !== currentUser.id && (
                                      <button
                                        onClick={() => removePlayerFromMatch(match.id, player.userId)}
                                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Force remove player from roster"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {/* Blue Team Column */}
                    {(selectedBibFilter === 'all' || selectedBibFilter === 'blue') && (
                      <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-400 shadow-sm" />
                            <span className="text-sm font-bold text-blue-400">Team Blue Bibs</span>
                          </div>
                          <span className="text-xs font-semibold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/20">
                            {blueTeam.length} Players
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {blueTeam.length === 0 ? (
                            <p className="text-xs text-slate-500 py-3 text-center">No players assigned to Blue yet.</p>
                          ) : (
                            blueTeam.map((player) => {
                              const isPaid = paidPlayerIds.includes(player.userId);
                              const reliability = getPlayerReliability(player.userId);
                              return (
                                <div
                                  key={player.userId}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0E1526] border border-slate-800 hover:border-blue-500/30 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                                      alt={player.name}
                                      className="w-8 h-8 rounded-full object-cover border border-blue-500/40 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-white truncate">{player.name}</span>
                                        {player.isHost && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            Host
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-blue-400 font-bold">
                                          {reliability}% Rel.
                                        </span>
                                        <span className="text-[10px] text-slate-500">•</span>
                                        <button
                                          type="button"
                                          onClick={() => canManage && togglePlayerPaidStatus(match.id, player.userId)}
                                          disabled={!canManage}
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 transition-all ${
                                            isPaid
                                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                          } ${canManage ? 'cursor-pointer hover:scale-105' : ''}`}
                                          title={canManage ? 'Click to toggle payment' : undefined}
                                        >
                                          <CheckCircle2 className={`w-2.5 h-2.5 ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`} />
                                          {isPaid ? 'Paid' : 'Unpaid'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {player.userId !== currentUser.id && onOpenDirectMessage && (
                                      <button
                                        onClick={() => onOpenDirectMessage(player.userId)}
                                        className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                        title={`Message ${player.name}`}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {canManage && (
                                      <button
                                        onClick={() => assignPlayerTeam(match.id, player.userId, 'green')}
                                        className="px-2 py-1 text-[10px] font-medium rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 transition-colors cursor-pointer"
                                        title="Move to Green bibs"
                                      >
                                        ➔ Green
                                      </button>
                                    )}

                                    {canManage && player.userId !== currentUser.id && (
                                      <button
                                        onClick={() => removePlayerFromMatch(match.id, player.userId)}
                                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Force remove player from roster"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Waitlist Queue (if any) */}
                {match.waitlist && match.waitlist.length > 0 && (
                  <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Auto-Promotion Waitlist Queue
                      </span>
                      <span className="text-[11px] text-slate-400">{match.waitlist.length} in queue</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {match.waitlist.map((waiter, index) => (
                        <div
                          key={waiter.userId}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E1526] border border-slate-800 text-xs"
                        >
                          <span className="text-amber-400 font-bold text-[10px]">#{index + 1}</span>
                          <span className="text-slate-200">{waiter.name}</span>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => removePlayerFromMatch(match.id, waiter.userId)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors ml-0.5 cursor-pointer"
                              title="Remove player from waitlist"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match Chat & Voice Board */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Match Discussion & Voice Notes</h3>
                    </div>
                    <span className="text-xs text-slate-400">{matchComments.length} messages</span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {matchComments.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No discussion yet. Ask questions about pitch gear, bibs, or warmups!
                      </div>
                    ) : (
                      matchComments.map((comment) => (
                        <div key={comment.id} className="p-3 rounded-xl bg-[#0E1526] border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={comment.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.userName}`}
                                alt={comment.userName}
                                className="w-6 h-6 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-xs font-semibold text-white">{comment.userName}</span>
                              {comment.userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                                  Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {comment.text && <p className="text-xs text-slate-300 pl-8 leading-relaxed">{comment.text}</p>}

                          {comment.audioUrl && (
                            <div className="pl-8 pt-1">
                              <VoiceNotePlayer
                                audioUrl={comment.audioUrl}
                                durationSeconds={comment.audioDuration}
                              />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <form onSubmit={handlePostComment} className="flex items-center gap-2">
                      <input
                        id="match-comment-input"
                        type="text"
                        placeholder="Post an update for the squad (e.g. Bringing bibs, match ball)..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-[#0E1526] border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
                        title="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="text-[11px]">Or record a voice message:</span>
                      <VoiceNoteRecorder onSendAudio={handleSendVoiceNote} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 2D TACTICAL PITCH */}
            {activeModalTab === 'tactical' && (
              <TacticalPitchFormation
                match={match}
                isHostOrAdmin={canManage}
                onUpdateTactical={(fg, fb, ta) => updateTacticalFormation(match.id, fg, fb, ta)}
              />
            )}

            {/* TAB 3: ATTENDANCE & RELIABILITY SCORING */}
            {activeModalTab === 'attendance' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-base">Match Attendance & Player Reliability</h3>
                  <p className="text-xs text-slate-400">
                    Mark confirmed player attendance or report no-shows to automatically update league reliability scores.
                  </p>
                </div>

                <div className="space-y-2">
                  {match.roster.map((player) => {
                    const isAttended = attendedIds.includes(player.userId);
                    const isNoShow = noShowIds.includes(player.userId);

                    return (
                      <div
                        key={player.userId}
                        className="flex items-center justify-between p-3 bg-[#0E1526] border border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                            alt={player.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{player.name}</div>
                            <div className="text-[11px] text-slate-400">Team {player.team === 'green' ? 'Green' : 'Blue'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAttendedIds((prev) =>
                                prev.includes(player.userId)
                                  ? prev.filter((id) => id !== player.userId)
                                  : [...prev, player.userId]
                              );
                              setNoShowIds((prev) => prev.filter((id) => id !== player.userId));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isAttended
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-emerald-300'
                            }`}
                          >
                            Attended
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNoShowIds((prev) =>
                                prev.includes(player.userId)
                                  ? prev.filter((id) => id !== player.userId)
                                  : [...prev, player.userId]
                              );
                              setAttendedIds((prev) => prev.filter((id) => id !== player.userId));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isNoShow
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-red-300'
                            }`}
                          >
                            No Show
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={isSavingAttendance || (attendedIds.length === 0 && noShowIds.length === 0)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingAttendance ? 'Saving...' : 'Record Attendance & Update Scores'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Sticky Bottom Action Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              {isUserInRoster ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> You are on the confirmed game roster!
                </span>
              ) : isUserInWaitlist ? (
                <span className="text-amber-300 font-semibold">
                  You are in the queue. You will be auto-promoted if someone drops out.
                </span>
              ) : spotsLeft > 0 ? (
                <span>{spotsLeft} spots available. Choose a bib side or join auto-balancing.</span>
              ) : (
                <span className="text-amber-400">Match is full. Join the queue for auto-promotion.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isUserInRoster ? (
                <button
                  id="modal-leave-match-btn"
                  type="button"
                  onClick={handleLeave}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                >
                  <UserX className="w-4 h-4" />
                  Leave Match
                </button>
              ) : isUserInWaitlist ? (
                <button
                  id="modal-leave-waitlist-btn"
                  type="button"
                  onClick={handleLeave}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                >
                  <UserX className="w-4 h-4" />
                  Leave Waitlist
                </button>
              ) : match.isLocked ? (
                <div className="text-xs font-bold text-slate-500 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                  Roster Locked
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="modal-join-green-btn"
                    type="button"
                    onClick={() => handleJoin('green')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all cursor-pointer"
                  >
                    <Shirt className="w-3.5 h-3.5" />
                    Join Green
                  </button>
                  <button
                    id="modal-join-blue-btn"
                    type="button"
                    onClick={() => handleJoin('blue')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all cursor-pointer"
                  >
                    <Shirt className="w-3.5 h-3.5" />
                    Join Blue
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp & Social Match Share Card Modal */}
      <MatchShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        match={match}
      />
    </>
  );
};
