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
      className="group relative bg-[#0E1526] hover:bg-[#111A30] border border-[#1E293B] hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Top accent glow line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/20 via-blue-500/40 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Card Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {match.format && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {match.format}
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
              {match.maxPlayers} Max Players
            </span>

            {/* Price in MAD */}
            <span className="px-2 py-0.5 rounded text-[11px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 flex items-center gap-1">
              <span>{formatMAD(match.pricePerPlayer, { showZeroAsFree: true })}</span>
              {match.roster.length > 0 && match.pricePerPlayer > 0 && (
                <span className="text-[10px] text-emerald-400/80 font-mono">({paidCount}/{match.roster.length} Paid)</span>
              )}
            </span>

            {match.isLocked && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}

            {match.recurrence?.isRecurring && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Weekly Match
              </span>
            )}
          </div>

          {/* Admin badge tag */}
          {isSuperAdminEmail(match.creatorEmail) && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shrink-0"
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
            <h3 className="text-base sm:text-lg font-bold font-display text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
              {match.title}
            </h3>

            {hasScore && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900 rounded-lg border border-slate-700 shrink-0">
                <span className="text-xs font-bold text-emerald-400 font-mono">{match.score?.green ?? 0}</span>
                <span className="text-[10px] text-slate-500">-</span>
                <span className="text-xs font-bold text-blue-400 font-mono">{match.score?.blue ?? 0}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-1.5">
            <p className="text-xs text-slate-400 flex items-center gap-1.5 line-clamp-1 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{match.location.venueName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-medium shrink-0">{match.location.city || 'Casablanca'}</span>
            </p>

            <button
              id={`match-card-maps-btn-${match.id}`}
              type="button"
              onClick={handleOpenMaps}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 hover:border-blue-400/50 transition-all cursor-pointer shrink-0 shadow-sm"
              title={`Open ${match.location.venueName} on Google Maps`}
            >
              <Navigation className="w-3 h-3 text-blue-400" />
              <span>Maps</span>
              <ExternalLink className="w-2.5 h-2.5 text-blue-400/80" />
            </button>
          </div>
        </div>

        {/* Match Time (Morocco GMT+1) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#090D16] border border-[#1E293B]/70 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">Date (Morocco)</div>
              <div className="font-semibold text-slate-200">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#090D16] border border-[#1E293B]/70 text-xs">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">{relativeTime}</div>
              <div className="font-semibold text-slate-200">{formattedTime} (GMT+1)</div>
            </div>
          </div>
        </div>

        {/* MVP Winner Banner if Present */}
        {match.mvpWinnerName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Match MVP:</strong> {match.mvpWinnerName}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-4 pt-3 border-t border-[#1E293B] space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Roster:
              <strong className="text-slate-200">{match.roster.length} / {match.maxPlayers}</strong>
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <Shirt className="w-3 h-3 text-emerald-400" /> {greenCount} Green
              </span>
              <span className="text-blue-400 font-bold flex items-center gap-0.5">
                <Shirt className="w-3 h-3 text-blue-400" /> {blueCount} Blue
              </span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentFilled >= 100
                  ? 'bg-emerald-400'
                  : percentFilled >= 70
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
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
                className={`w-7 h-7 rounded-full object-cover border-2 ${
                  player.team === 'green'
                    ? 'border-emerald-500'
                    : player.team === 'blue'
                    ? 'border-blue-500'
                    : 'border-slate-700'
                }`}
                referrerPolicy="no-referrer"
              />
            ))}
            {match.roster.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-[#0E1526] text-[10px] font-bold text-slate-300 flex items-center justify-center">
                +{match.roster.length - 5}
              </div>
            )}
            {match.roster.length === 0 && (
              <span className="text-[11px] text-slate-500">Be the first to join!</span>
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
