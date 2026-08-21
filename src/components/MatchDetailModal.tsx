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
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  Moon,
  Cloud,
  Sunrise,
  Sunset,
  Home,
  Droplets,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { SoccerMatch, TeamSide, SUPER_ADMIN_EMAIL } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { VoiceNoteRecorder, VoiceNotePlayer } from './VoiceNotes';
import { getMatchWeatherForecast, getMatchMapUrl } from '../lib/weatherService';

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
    joinMatch,
    leaveMatch,
    assignPlayerTeam,
    removePlayerFromMatch,
    toggleMatchLock,
    deleteMatch,
    togglePlayerPaidStatus,
    updateMatchPitchCost,
    comments,
    addComment,
    addVoiceComment,
    initiateVoiceCall,
    banUser,
    sendNotification,
  } = usePitchStore();

  const [commentText, setCommentText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedBibFilter, setSelectedBibFilter] = useState<'all' | 'green' | 'blue'>('all');
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [editTotalCost, setEditTotalCost] = useState<number>(0);
  const [editPricePerPlayer, setEditPricePerPlayer] = useState<number>(0);

  if (!isOpen || !match) return null;

  const isUserInRoster = match.roster.some((p) => p.userId === currentUser.id);
  const isUserInWaitlist = match.waitlist.some((p) => p.userId === currentUser.id);
  const isCreator = match.creatorId === currentUser.id;
  const isMustaphaSuperAdmin = currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || currentUser.isAdmin;
  const canManage = isMustaphaSuperAdmin || isCreator;

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

  // Weather forecast calculation with exact geographic coordinates & kickoff hour calibration
  const weather = getMatchWeatherForecast(
    match.dateTime,
    match.location.venueName,
    match.location.city,
    match.location.latitude,
    match.location.longitude
  );

  const getWeatherIcon = () => {
    switch (weather.icon) {
      case 'sunrise':
        return <Sunrise className="w-5 h-5 text-amber-400" />;
      case 'sunset':
        return <Sunset className="w-5 h-5 text-orange-400" />;
      case 'sun':
        return <Sun className="w-5 h-5 text-amber-400" />;
      case 'cloud-sun':
        return <CloudSun className="w-5 h-5 text-amber-300" />;
      case 'cloud-rain':
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case 'wind':
        return <Wind className="w-5 h-5 text-teal-400" />;
      case 'moon':
        return <Moon className="w-5 h-5 text-indigo-300" />;
      case 'home':
        return <Home className="w-5 h-5 text-emerald-400" />;
      default:
        return <Cloud className="w-5 h-5 text-slate-300" />;
    }
  };

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

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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

  return (
    <div
      id="match-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="match-detail-modal-container"
        className="relative w-full max-w-4xl bg-[#0E1526] border border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#1E293B] bg-[#090D16]/90">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {match.format} Match
            </span>
            {match.isLocked ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Lock className="w-3.5 h-3.5" /> Locked
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Unlock className="w-3.5 h-3.5" /> Registration Open
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="match-detail-share-btn"
              type="button"
              onClick={handleCopyShareLink}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Copy link to invite players"
            >
              {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>

            {canManage && (
              <button
                id="match-detail-lock-toggle-btn"
                type="button"
                onClick={() => toggleMatchLock(match.id)}
                className="p-2 text-slate-400 hover:text-amber-300 rounded-xl hover:bg-slate-800 transition-colors"
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
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
                title="Delete Match (Admin/Creator)"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button
              id="match-detail-close-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Main Scrollable Content */}
        <div className="p-5 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Title & Host row */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-white">{match.title}</h1>
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
            <div className="p-3 bg-[#090D16] border border-[#1E293B] rounded-2xl flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Date</div>
                <div className="text-xs font-bold text-slate-200">{formattedDate}</div>
              </div>
            </div>

            <div className="p-3 bg-[#090D16] border border-[#1E293B] rounded-2xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Time & Duration</div>
                <div className="text-xs font-bold text-slate-200">{formattedTime} ({match.durationMinutes}m)</div>
              </div>
            </div>

            <div className="p-3 bg-[#090D16] border border-[#1E293B] rounded-2xl flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Roster Capacity</div>
                <div className="text-xs font-bold text-slate-200">
                  {match.roster.length} / {match.maxPlayers} Players
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#090D16] border border-[#1E293B] rounded-2xl flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Cost per Player</div>
                <div className="text-xs font-bold text-slate-200">
                  {match.pricePerPlayer === 0 ? 'Free to Play' : `$${match.pricePerPlayer} / player`}
                </div>
              </div>
            </div>
          </div>

          {/* Live Pitch Weather & Turf Conditions Forecast */}
          <div className="bg-[#090D16] border border-blue-500/20 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 shrink-0">
                  {getWeatherIcon()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                    <span>Live Pitch Weather & Turf Analysis</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                      {weather.tempC}°C ({weather.tempF}°F)
                    </span>
                    {weather.feelsLikeC !== undefined && (
                      <span className="text-[11px] text-slate-400 font-normal">
                        Feels like {weather.feelsLikeC}°C ({weather.feelsLikeF}°F)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span className="text-blue-400 font-medium">{weather.timeSlotLabel}</span>
                    <span>•</span>
                    <span>{match.location.venueName}</span>
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto ${
                weather.pitchSuitability.includes('Warning')
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {weather.pitchSuitability}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1E293B]">
              <div className="p-2.5 rounded-xl bg-[#0E1526] border border-[#1E293B] text-xs">
                <span className="text-[10px] text-slate-400 block">Condition</span>
                <span className="font-semibold text-white truncate block" title={weather.condition}>{weather.condition}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0E1526] border border-[#1E293B] text-xs">
                <span className="text-[10px] text-slate-400 block">Precipitation Chance</span>
                <span className="font-semibold text-blue-400">{weather.precipitationChance}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0E1526] border border-[#1E293B] text-xs">
                <span className="text-[10px] text-slate-400 block">Wind Speed</span>
                <span className="font-semibold text-teal-400">{weather.windSpeedKmh} km/h</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0E1526] border border-[#1E293B] text-xs">
                <span className="text-[10px] text-slate-400 block">Humidity & Dew Pt</span>
                <span className="font-semibold text-slate-200">{weather.humidity}% ({weather.dewPointC ?? 12}°C)</span>
              </div>
            </div>

            {weather.turfAdvisory && (
              <div className="px-3 py-2 rounded-xl bg-[#0E1526]/80 border border-[#1E293B] text-[11px] text-slate-300 flex items-center gap-2">
                <span className="text-emerald-400 font-bold shrink-0">Turf & Cleats Advice:</span>
                <span>{weather.turfAdvisory}</span>
              </div>
            )}
          </div>

          {/* Pitch Cost Split & Payment Collection Tracker */}
          <div className="bg-[#090D16] border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1E293B]">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#131C31] hover:bg-slate-800 text-slate-300 border border-[#1E293B] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isEditingCost ? 'Cancel' : 'Edit Pitch Fees'}
                </button>
              )}
            </div>

            {/* Edit Pitch Fee Drawer (For Host / Admin) */}
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
                      className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Price Per Player Share ($)</label>
                    <input
                      type="number"
                      value={editPricePerPlayer}
                      onChange={(e) => setEditPricePerPlayer(Number(e.target.value))}
                      className="w-full bg-[#090D16] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCost}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}

            {/* Cost Progress Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#0E1526] rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 block">Total Pitch Cost</span>
                <span className="text-base font-black text-white">${totalCost}</span>
              </div>
              <div className="p-3 bg-[#0E1526] rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 block">Per Player Share</span>
                <span className="text-base font-black text-slate-200">${pricePerPlayer}</span>
              </div>
              <div className="p-3 bg-[#0E1526] rounded-xl border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 block">Collected So Far</span>
                <span className="text-base font-black text-emerald-400">${collectedAmount} ({paidCount} Paid)</span>
              </div>
              <div className="p-3 bg-[#0E1526] rounded-xl border border-amber-500/30">
                <span className="text-[10px] text-amber-400 block">Uncollected Balance</span>
                <span className="text-base font-black text-amber-400">${remainingCost}</span>
              </div>
            </div>
          </div>

          {/* Location & Directions Card */}
          <div className="bg-[#090D16] border border-[#1E293B] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                {(match.location.latitude || match.location.longitude) && (
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    GPS: {match.location.latitude ?? 37.7749}, {match.location.longitude ?? -122.4194}
                  </p>
                )}
              </div>
            </div>

            <a
              id="open-match-google-maps-btn"
              href={getMatchMapUrl(match.location)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition-all shrink-0 cursor-pointer shadow-md shadow-blue-900/30"
            >
              <Navigation className="w-3.5 h-3.5" />
              Directions in Google Maps
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          </div>

          {/* Match Notes if any */}
          {match.notes && (
            <div className="p-4 bg-[#131C31]/40 border border-[#1E293B] rounded-xl text-xs text-slate-300">
              <span className="font-semibold text-emerald-400 block mb-1">Match Rules & Notes:</span>
              {match.notes}
            </div>
          )}

          {/* Interactive Tactical Field / Team Bib Split */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Team Rosters & Fee Status</h3>
              </div>

              {/* Filter Bibs */}
              <div className="flex items-center gap-1 bg-[#090D16] p-1 rounded-xl border border-[#1E293B] text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedBibFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedBibFilter === 'all' ? 'bg-[#1E293B] text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({match.roster.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBibFilter('green')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedBibFilter === 'green' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Green ({greenTeam.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBibFilter('blue')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    selectedBibFilter === 'blue' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  Blue ({blueTeam.length})
                </button>
              </div>
            </div>

            {/* Tactical Green vs Blue Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Green Team Column */}
              {(selectedBibFilter === 'all' || selectedBibFilter === 'green') && (
                <div className="bg-[#090D16] border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
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
                        return (
                          <div
                            key={player.userId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#0E1526] border border-[#1E293B] hover:border-emerald-500/30 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={player.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={player.name}
                                className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-white">{player.name}</span>
                                  {player.isHost && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      Host
                                    </span>
                                  )}
                                </div>
                                {/* Paid / Unpaid Status Tag */}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => canManage && togglePlayerPaidStatus(match.id, player.userId)}
                                    disabled={!canManage}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                                      isPaid
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    } ${canManage ? 'cursor-pointer hover:scale-105' : ''}`}
                                    title={canManage ? 'Click to toggle payment' : undefined}
                                  >
                                    <CheckCircle2 className={`w-3 h-3 ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`} />
                                    {isPaid ? 'Paid' : 'Unpaid'}
                                  </button>

                                  {!isPaid && canManage && player.userId !== currentUser.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendFeeReminder(player)}
                                      className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline"
                                    >
                                      Remind
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions: DM, Bib Switch, Admin Remove/Ban */}
                            <div className="flex items-center gap-1">
                              {player.userId !== currentUser.id && onOpenDirectMessage && (
                                <button
                                  onClick={() => onOpenDirectMessage(player.userId)}
                                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                                  title={`Message ${player.name}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canManage && (
                                <button
                                  onClick={() => assignPlayerTeam(match.id, player.userId, 'blue')}
                                  className="px-2 py-1 text-[10px] font-medium rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 transition-colors"
                                  title="Move to Blue bibs"
                                >
                                  ➔ Blue
                                </button>
                              )}

                              {canManage && player.userId !== currentUser.id && (
                                <button
                                  onClick={() => removePlayerFromMatch(match.id, player.userId)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                  title="Force remove player from roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isMustaphaSuperAdmin && player.userId !== currentUser.id && (
                                <button
                                  onClick={() => handleAdminBanUser(player.userId, player.name)}
                                  className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                                  title="Admin: Suspend Player"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
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
                <div className="bg-[#090D16] border border-blue-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
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
                        return (
                          <div
                            key={player.userId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#0E1526] border border-[#1E293B] hover:border-blue-500/30 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={player.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                                alt={player.name}
                                className="w-8 h-8 rounded-full object-cover border border-blue-500/40"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-white">{player.name}</span>
                                  {player.isHost && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      Host
                                    </span>
                                  )}
                                </div>
                                {/* Paid / Unpaid Status Tag */}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => canManage && togglePlayerPaidStatus(match.id, player.userId)}
                                    disabled={!canManage}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                                      isPaid
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    } ${canManage ? 'cursor-pointer hover:scale-105' : ''}`}
                                    title={canManage ? 'Click to toggle payment' : undefined}
                                  >
                                    <CheckCircle2 className={`w-3 h-3 ${isPaid ? 'text-emerald-400' : 'text-rose-400'}`} />
                                    {isPaid ? 'Paid' : 'Unpaid'}
                                  </button>

                                  {!isPaid && canManage && player.userId !== currentUser.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendFeeReminder(player)}
                                      className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline"
                                    >
                                      Remind
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions: DM, Bib Switch, Admin Remove/Ban */}
                            <div className="flex items-center gap-1">
                              {player.userId !== currentUser.id && onOpenDirectMessage && (
                                <button
                                  onClick={() => onOpenDirectMessage(player.userId)}
                                  className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
                                  title={`Message ${player.name}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canManage && (
                                <button
                                  onClick={() => assignPlayerTeam(match.id, player.userId, 'green')}
                                  className="px-2 py-1 text-[10px] font-medium rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 transition-colors"
                                  title="Move to Green bibs"
                                >
                                  ➔ Green
                                </button>
                              )}

                              {canManage && player.userId !== currentUser.id && (
                                <button
                                  onClick={() => removePlayerFromMatch(match.id, player.userId)}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                  title="Force remove player from roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isMustaphaSuperAdmin && player.userId !== currentUser.id && (
                                <button
                                  onClick={() => handleAdminBanUser(player.userId, player.name)}
                                  className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                                  title="Admin: Suspend Player"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
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

          {/* Waitlist Queue (if any players) */}
          {match.waitlist.length > 0 && (
            <div className="bg-[#090D16] border border-amber-500/20 rounded-2xl p-4 space-y-3">
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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E1526] border border-[#1E293B] text-xs"
                  >
                    <span className="text-amber-400 font-bold text-[10px]">#{index + 1}</span>
                    <img
                      src={waiter.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={waiter.name}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-slate-200">{waiter.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match Chat & Voice Board */}
          <div className="bg-[#090D16] border border-[#1E293B] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Match Discussion & Voice Notes</h3>
              </div>
              <span className="text-xs text-slate-400">{matchComments.length} messages</span>
            </div>

            {/* Comments Stream */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {matchComments.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No discussion yet. Ask questions about pitch gear, bibs, or warmups!
                </div>
              ) : (
                matchComments.map((comment) => (
                  <div key={comment.id} className="p-3 rounded-xl bg-[#0E1526] border border-[#1E293B] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={comment.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
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

            {/* Text & Voice Message Inputs */}
            <div className="pt-2 border-t border-[#1E293B] space-y-2">
              <form onSubmit={handlePostComment} className="flex items-center gap-2">
                <input
                  id="match-comment-input"
                  type="text"
                  placeholder="Post an update for the squad (e.g. Bringing bibs, match ball)..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-[#0E1526] border border-[#1E293B] focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
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

              {/* Push to talk voice note recorder */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span className="text-[11px]">Or record a voice message:</span>
                <VoiceNoteRecorder onSendAudio={handleSendVoiceNote} />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Bottom Action Footer */}
        <div className="p-4 sm:p-6 border-t border-[#1E293B] bg-[#090D16]/95 flex flex-col sm:flex-row items-center justify-between gap-3">
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
              <span>{spotsLeft} spots available. Choose a bib side or let the system balance teams automatically.</span>
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
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <Shirt className="w-3.5 h-3.5" />
                  Join Green
                </button>
                <button
                  id="modal-join-blue-btn"
                  type="button"
                  onClick={() => handleJoin('blue')}
                  disabled={isActionLoading}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/30 transition-all cursor-pointer"
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
  );
};
