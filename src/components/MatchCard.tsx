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
import { useLanguage } from '../lib/useLanguage';
import { getMatchMapUrl } from '../lib/mapUtils';
import { MatchShareModal } from './MatchShareModal';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../lib/moroccoUtils';

interface MatchCardProps {
  match: SoccerMatch;
  onOpenDetails: (match: SoccerMatch) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onOpenDetails }) => {
  const { currentUser, joinMatch, leaveMatch, deleteMatch } = usePitchStore();
  const { t, formatMAD, formatMoroccoDate, isRTL, language } = useLanguage();
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
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Card Header */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {match.format && (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider uppercase bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]/40 shadow-sm">
                {match.format}
              </span>
            )}
            
            {/* Live / Status Badge */}
            {match.status === 'in_progress' ? (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black text-rose-300 bg-rose-950/70 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {t('matches.live')}
              </span>
            ) : match.status === 'completed' ? (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-black text-slate-300 bg-[#081813] border border-[#E5B869]/30">
                {t('matches.finished')}
              </span>
            ) : spotsLeft === 0 ? (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-300 bg-[#28180A]/80 border border-[#E5B869]/40">
                {t('matches.full')} ({match.maxPlayers})
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#F5D794] bg-[#0A3A2A] border border-[#E5B869]/40 shadow-sm">
                {spotsLeft} {t('matches.spotsRemaining')}
              </span>
            )}

            {/* Price in MAD */}
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-[#F5D794] bg-[#082218] border border-[#E5B869]/40 flex items-center gap-1">
              <span>{formatMAD(match.pricePerPlayer, { showZeroAsFree: true })}</span>
              {match.roster.length > 0 && match.pricePerPlayer > 0 && (
                <span className="text-[10px] text-[#E5B869] font-mono">({paidCount}/{match.roster.length})</span>
              )}
            </span>

            {match.isLocked && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#0A241C] text-slate-400 border border-[#E5B869]/20 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-[#E5B869]" /> {language === 'ar' ? 'مغلقة' : 'Locked'}
              </span>
            )}
          </div>

          {/* Admin badge tag */}
          {isSuperAdminEmail(match.creatorEmail) && (
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] shrink-0 shadow-md"
              title="Official match organized by Administrator Mustapha"
            >
              <Shield className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>{language === 'ar' ? 'المشرف مصطفى' : 'Mustapha'}</span>
            </span>
          )}
        </div>

        {/* Title & Live Score Banner */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black font-display text-white group-hover:text-[#F5D794] transition-colors line-clamp-1 tracking-tight">
              {match.title}
            </h3>

            {hasScore && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[#081813] rounded-xl border border-[#E5B869]/30 shrink-0 shadow-inner">
                <span className="text-xs font-black text-[#F5D794] font-mono">{match.score?.green ?? 0}</span>
                <span className="text-[10px] text-[#E5B869] font-bold">:</span>
                <span className="text-xs font-black text-blue-400 font-mono">{match.score?.blue ?? 0}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <p className="text-xs text-slate-300 flex items-center gap-1.5 line-clamp-1 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-[#E5B869] shrink-0" />
              <span className="truncate text-slate-100 font-medium">{match.location.venueName}</span>
              <span className="text-[#E5B869]/40">•</span>
              <span className="text-slate-300 shrink-0 font-medium">{match.location.city || 'الدار البيضاء'}</span>
            </p>

            <button
              id={`match-card-maps-btn-${match.id}`}
              type="button"
              onClick={handleOpenMaps}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#F5D794] bg-[#0A3A2A] hover:bg-[#0E4836] border border-[#E5B869]/40 hover:border-[#E5B869] transition-all cursor-pointer shrink-0 shadow-sm"
              title={`Open ${match.location.venueName} on Google Maps`}
            >
              <Navigation className="w-3 h-3 text-[#E5B869]" />
              <span>{t('matches.viewOnMap')}</span>
              <ExternalLink className="w-2.5 h-2.5 text-[#E5B869]" />
            </button>
          </div>
        </div>

        {/* Match Time (Morocco GMT+1) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#081813] border border-[#E5B869]/20 text-xs">
            <Calendar className="w-4 h-4 text-[#E5B869] shrink-0" />
            <div className="truncate text-start">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t('createMatch.date')}</div>
              <div className="font-bold text-slate-100">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#081813] border border-[#E5B869]/20 text-xs">
            <Clock className="w-4 h-4 text-[#F5D794] shrink-0" />
            <div className="truncate text-start">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{relativeTime}</div>
              <div className="font-bold text-slate-100">{formattedTime} (GMT+1)</div>
            </div>
          </div>
        </div>

        {/* MVP Winner Banner if Present */}
        {match.mvpWinnerName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#0A3A2A] to-[#082218] border border-[#E5B869]/40 text-[#F5D794] text-xs shadow-md">
            <Trophy className="w-4 h-4 text-[#E5B869] fill-[#E5B869] shrink-0" />
            <span className="truncate font-bold">
              <span className="text-[#E5B869] font-extrabold uppercase tracking-wider">{t('motm.motmWinner')}:</span> {match.mvpWinnerName}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#E5B869]/20 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 flex items-center gap-1.5 text-[11px] font-medium">
              <Users className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>{t('matches.rosterCount')}:</span>
              <strong className="text-[#F5D794] font-bold">{match.roster.length} / {match.maxPlayers}</strong>
            </span>
            <div className="flex items-center gap-2.5 text-[11px]">
              <span className="text-[#F5D794] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#E5B869] inline-block" /> {greenCount} {t('matches.greenTeam')}
              </span>
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> {blueCount} {t('matches.blueTeam')}
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-[#081813] rounded-full overflow-hidden p-0.5 border border-[#E5B869]/25">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                percentFilled >= 100
                  ? 'bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500'
                  : percentFilled >= 70
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238]'
                  : 'bg-gradient-to-r from-[#0E4836] to-[#E5B869]'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>

        {/* Avatars & Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center -space-x-2 rtl:space-x-reverse overflow-hidden">
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
                    : 'border-slate-500'
                }`}
                referrerPolicy="no-referrer"
              />
            ))}
            {match.roster.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-[#141A26] border-2 border-[#E5B869]/30 text-[10px] font-extrabold text-[#F5D794] flex items-center justify-center shadow-md">
                +{match.roster.length - 5}
              </div>
            )}
            {match.roster.length === 0 && (
              <span className="text-[11px] text-slate-500 font-medium">{language === 'ar' ? 'كن أول المسجلين في المباراة!' : 'Be first on the pitch!'}</span>
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
                className="p-1.5 text-slate-400 hover:text-[#F5D794] hover:bg-[#E5B869]/10 rounded-xl border border-transparent hover:border-[#E5B869]/30 transition-all cursor-pointer"
                title={t('matches.addToCalendar')}
              >
                <CalendarPlus className="w-4 h-4" />
              </button>

              {showCalendarMenu && (
                <div
                  className={`absolute ${isRTL ? 'left-0' : 'right-0'} bottom-full mb-2 w-44 bg-[#141A26] border border-[#E5B869]/30 rounded-xl shadow-2xl p-1 z-50 text-xs space-y-1`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleGoogleCalendar}
                    className="w-full text-start px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-[#0D503C]/30 hover:text-[#F5D794] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#E5B869]" />
                    <span>Google Calendar</span>
                  </button>
                  <button
                    onClick={handleDownloadIcs}
                    className="w-full text-start px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-[#0D503C]/30 hover:text-[#F5D794] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-[#E5B869]" />
                    <span>{language === 'ar' ? 'تحميل ملف (.ics)' : 'Download .ics file'}</span>
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
              className="p-1.5 text-slate-400 hover:text-[#F5D794] hover:bg-[#E5B869]/10 rounded-xl border border-transparent hover:border-[#E5B869]/30 transition-all cursor-pointer"
              title={t('matches.shareMatch')}
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
                    <span>{t('admin.confirmDelete')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(false);
                    }}
                    className="px-2 py-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl text-xs cursor-pointer"
                  >
                    {t('common.cancel')}
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
                  <span className="inline">{t('admin.deleteMatch')}</span>
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
                <span>{t('matches.leaveMatch')}</span>
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
                <span>{t('matches.waitlisted')}</span>
              </button>
            ) : match.isLocked ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                {language === 'ar' ? 'مغلقة' : 'Locked'}
              </span>
            ) : (
              <button
                id={`join-match-btn-${match.id}`}
                type="button"
                onClick={handleJoinClick}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 shadow-md shadow-amber-950/60 transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{spotsLeft === 0 ? t('matches.joinWaitlist') : t('matches.joinMatch')}</span>
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

