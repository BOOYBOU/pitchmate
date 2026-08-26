import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  UserX,
  ExternalLink,
  Shield,
  Lock,
  Shirt,
  Navigation,
  Trash2,
  Share2,
  CalendarPlus,
  Trophy,
  Award,
} from 'lucide-react';
import { SoccerMatch, isSuperAdminEmail } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { getMatchMapUrl } from '../lib/mapUtils';
import { MatchShareModal } from './MatchShareModal';
import { formatMAD, formatMoroccoDate, generateGoogleCalendarUrl, downloadIcsFile } from '../lib/moroccoUtils';

interface MatchCardProps {
  match: SoccerMatch;
  onOpenDetails: (match: SoccerMatch) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onOpenDetails }) => {
  const { currentUser, joinMatch, leaveMatch, deleteMatch } = usePitchStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isUserInRoster = match.roster.some((p) => p.userId === currentUser.id);
  const isUserInWaitlist = match.waitlist.some((p) => p.userId === currentUser.id);
  const isAdmin = Boolean(
    currentUser?.isAdmin ||
    isSuperAdminEmail(currentUser?.email) ||
    currentUser?.name?.toLowerCase().includes('mustapha')
  );
  const isHost = match.creatorId === currentUser?.id;
  // Super Admin (Mustapha Bouhbous) has universal permission to delete ANY match
  const canDelete = isAdmin || isHost;

  const spotsLeft = Math.max(0, match.maxPlayers - match.roster.length);
  const percentFilled = Math.min(100, Math.round((match.roster.length / match.maxPlayers) * 100));

  const formattedDate = formatMoroccoDate(match.dateTime, 'date_only');
  const formattedTime = formatMoroccoDate(match.dateTime, 'time_only');
  const relativeTime = formatMoroccoDate(match.dateTime, 'relative');

  const greenCount = match.roster.filter((p) => p.team === 'green').length;
  const blueCount = match.roster.filter((p) => p.team === 'blue').length;

  const paidCount = (match.paidPlayerIds || []).filter((id) =>
    match.roster.some((p) => p.userId === id)
  ).length;

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mapUrl = getMatchMapUrl(match.location);
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleJoinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    await joinMatch(match.id);
    setIsProcessing(false);
  };

  const handleLeaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    await leaveMatch(match.id);
    setIsProcessing(false);
  };

  const handleGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCalendarMenu(false);
    const url = generateGoogleCalendarUrl(match);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCalendarMenu(false);
    downloadIcsFile(match);
  };

  const hasScore = match.score && (match.score.green > 0 || match.score.blue > 0 || match.status === 'completed');

  return (
    <div
      id={`match-card-${match.id}`}
      onClick={() => onOpenDetails(match)}
      className="group relative broadcast-card rounded-2xl p-5 shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1"
    >
      {/* Top accent glow line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Card Header */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {match.format && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                {match.format}
              </span>
            )}
            
            {/* Live / Status Badge */}
            {match.status === 'in_progress' ? (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black text-rose-300 bg-rose-950/70 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                LIVE
              </span>
            ) : match.status === 'completed' ? (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black text-slate-300 bg-slate-800/80 border border-slate-700">
                FULL TIME
              </span>
            ) : spotsLeft === 0 ? (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-300 bg-amber-950/50 border border-amber-500/30">
                FULL ({match.maxPlayers})
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30">
                {spotsLeft} SPOTS LEFT
              </span>
            )}

            {/* Price in MAD */}
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-amber-300 bg-amber-950/40 border border-amber-500/30 flex items-center gap-1">
              <span>{formatMAD(match.pricePerPlayer, { showZeroAsFree: true })}</span>
              {match.roster.length > 0 && match.pricePerPlayer > 0 && (
                <span className="text-[10px] text-amber-400/80 font-mono">({paidCount}/{match.roster.length})</span>
              )}
            </span>

            {match.isLocked && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}
          </div>

          {/* Admin badge tag */}
          {isSuperAdminEmail(match.creatorEmail) && (
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shrink-0 shadow-sm"
              title="Official match organized by Administrator Mustapha"
            >
              <Shield className="w-3 h-3 text-emerald-400" />
              Mustapha
            </span>
          )}
        </div>

        {/* Title & Live Score Banner */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black font-display text-white group-hover:text-emerald-300 transition-colors line-clamp-1 tracking-tight">
              {match.title}
            </h3>

            {hasScore && (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/90 rounded-xl border border-slate-800 shrink-0 shadow-inner">
                <span className="text-xs font-black text-emerald-400 font-mono">{match.score?.green ?? 0}</span>
                <span className="text-[10px] text-slate-500 font-bold">:</span>
                <span className="text-xs font-black text-blue-400 font-mono">{match.score?.blue ?? 0}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <p className="text-xs text-slate-400 flex items-center gap-1.5 line-clamp-1 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate text-slate-300 font-medium">{match.location.venueName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 shrink-0 font-medium">{match.location.city || 'Casablanca'}</span>
            </p>

            <button
              id={`match-card-maps-btn-${match.id}`}
              type="button"
              onClick={handleOpenMaps}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/50 transition-all cursor-pointer shrink-0 shadow-sm"
              title={`Open ${match.location.venueName} on Google Maps`}
            >
              <Navigation className="w-3 h-3 text-emerald-400" />
              <span>Map</span>
              <ExternalLink className="w-2.5 h-2.5 text-emerald-400/80" />
            </button>
          </div>
        </div>

        {/* Match Time (Morocco GMT+1) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#070B16]/80 border border-[#1E293B]/60 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date</div>
              <div className="font-bold text-slate-100">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#070B16]/80 border border-[#1E293B]/60 text-xs">
            <Clock className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{relativeTime}</div>
              <div className="font-bold text-slate-100">{formattedTime} (GMT+1)</div>
            </div>
          </div>
        </div>

        {/* MVP Winner Banner if Present */}
        {match.mvpWinnerName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl gold-motm-card text-amber-200 text-xs shadow-md">
            <Trophy className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
            <span className="truncate font-bold">
              <span className="text-amber-400 font-extrabold uppercase tracking-wider">MOTM Star:</span> {match.mvpWinnerName}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#1E293B]/80 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px] font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Roster:
              <strong className="text-white font-bold">{match.roster.length} / {match.maxPlayers}</strong>
            </span>
            <div className="flex items-center gap-2.5 text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {greenCount} Green
              </span>
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> {blueCount} Blue
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-slate-800/80">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                percentFilled >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : percentFilled >= 70
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-blue-500 to-teal-500'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>

        {/* Avatars & Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center -space-x-2 overflow-hidden">
            {match.roster.slice(0, 5).map((player) => (
              <img
                key={player.userId}
                src={player.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={player.name}
                className={`w-7 h-7 rounded-full object-cover border-2 shadow-md ${
                  player.team === 'green'
                    ? 'border-emerald-400'
                    : player.team === 'blue'
                    ? 'border-blue-400'
                    : 'border-slate-700'
                }`}
                referrerPolicy="no-referrer"
              />
            ))}
            {match.roster.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-[#1E293B] text-[10px] font-extrabold text-slate-200 flex items-center justify-center shadow-md">
                +{match.roster.length - 5}
              </div>
            )}
            {match.roster.length === 0 && (
              <span className="text-[11px] text-slate-500 font-medium">Be first on the pitch!</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 relative">
            {/* Add to Calendar Button */}
            <div className="relative">
              <button
                id={`card-calendar-btn-${match.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCalendarMenu(!showCalendarMenu);
                }}
                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer"
                title="Add to Calendar (Google / Apple / Outlook)"
              >
                <CalendarPlus className="w-4 h-4" />
              </button>

              {showCalendarMenu && (
                <div
                  className="absolute right-0 bottom-full mb-2 w-44 bg-[#111A30] border border-[#1E293B] rounded-xl shadow-2xl p-1 z-50 text-xs space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleGoogleCalendar}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Google Calendar</span>
                  </button>
                  <button
                    onClick={handleDownloadIcs}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-blue-500/20 hover:text-blue-300 transition-colors flex items-center gap-1.5"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Download .ics file</span>
                  </button>
                </div>
              )}
            </div>

            <button
              id={`card-share-btn-${match.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsShareModalOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer"
              title="Share match details to WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {canDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    id={`card-confirm-delete-btn-${match.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMatch(match.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer text-xs font-bold shadow-md shadow-rose-950 animate-pulse"
                    title="Confirm Permanent Deletion"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm?</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(false);
                    }}
                    className="px-2 py-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id={`card-delete-match-btn-${match.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 rounded-xl border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer text-xs font-bold shadow-sm"
                  title={isAdmin ? 'Super Admin: Universal Delete Permission' : 'Host: Delete match'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="inline">{isAdmin ? 'Delete Match' : 'Delete'}</span>
                </button>
              )
            )}

            {isUserInRoster ? (
              <button
                id={`leave-match-btn-${match.id}`}
                type="button"
                onClick={handleLeaveClick}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                Leave Match
              </button>
            ) : isUserInWaitlist ? (
              <button
                id={`leave-waitlist-btn-${match.id}`}
                type="button"
                onClick={handleLeaveClick}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                Waitlist (Joined)
              </button>
            ) : match.isLocked ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                Locked
              </span>
            ) : (
              <button
                id={`join-match-btn-${match.id}`}
                type="button"
                onClick={handleJoinClick}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {spotsLeft === 0 ? 'Join Waitlist' : 'Join Match'}
              </button>
            )}
          </div>
        </div>
      </div>

      <MatchShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        match={match}
      />
    </div>
  );
};
