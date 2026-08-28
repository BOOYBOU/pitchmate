import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
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
  Coins,
  CheckCircle,
  CheckCircle2,
  Edit2,
  Activity,
  ClipboardList,
  Trophy,
  CalendarPlus,
  Repeat,
  Flame,
  Plus,
} from 'lucide-react';
import { SoccerMatch, TeamSide, isSuperAdminEmail, SUPER_ADMIN_EMAIL } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { VoiceNoteRecorder, VoiceNotePlayer } from './VoiceNotes';
import { getMatchMapUrl } from '../lib/mapUtils';
import { TacticalPitchFormation } from './TacticalPitchFormation';
import { ErrorBoundary } from './ErrorBoundary';
import { MatchShareModal } from './MatchShareModal';
import { LiveMatchClockManager } from './LiveMatchClockManager';
import { CihPaymentTracker } from './CihPaymentTracker';
import { MotmPostMatchVoting } from './MotmPostMatchVoting';
import { getReputationTier } from '../lib/reliabilityEngine';
import {
  generateGoogleCalendarUrl,
  downloadIcsFile,
} from '../lib/moroccoUtils';
import {
  calculateMatchPricing,
  parsePrice,
} from '../lib/matchPricing';

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
    updatePlayerPaymentStatus,
    updateMatchPitchCost,
    autoBalanceTeams,
    updateTacticalFormation,
    markMatchAttendance,
    updateMatchScore,
    recordMatchGoal,
    voteMatchMvp,
    duplicateAsRecurringMatch,
    comments,
    addComment,
    addVoiceComment,
    banUser,
    sendNotification,
  } = usePitchStore();

  const { t, formatMAD, formatMoroccoDate, isRTL, language } = useLanguage();

  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'live' | 'payments' | 'motm' | 'tactical' | 'attendance'>('overview');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [selectedBibFilter, setSelectedBibFilter] = useState<'all' | 'green' | 'blue'>('all');
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [editTotalCost, setEditTotalCost] = useState<number | string>(0);
  const [editPricePerPlayer, setEditPricePerPlayer] = useState<number | string>(0);

  // Scoreboard form state
  const [goalTeam, setGoalTeam] = useState<TeamSide>('green');
  const [goalScorerId, setGoalScorerId] = useState<string>('');
  const [goalMinute, setGoalMinute] = useState<number>(15);
  const [goalAssistId, setGoalAssistId] = useState<string>('');

  // Attendance state
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [noShowIds, setNoShowIds] = useState<string[]>([]);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSuccessMessage, setAttendanceSuccessMessage] = useState<string | null>(null);

  // Synchronize and reset modal-internal states whenever the selected match changes
  useEffect(() => {
    if (match) {
      const matchFee = match.pricePerPlayer ?? 50;
      setAttendedIds(match.attendedPlayerIds || []);
      setNoShowIds(match.noShowPlayerIds || []);
      setEditTotalCost(match.totalPitchCost ?? (matchFee * match.maxPlayers));
      setEditPricePerPlayer(matchFee);
      setGoalScorerId('');
      setGoalAssistId('');
      setGoalMinute(15);
      setCommentText('');
      setIsEditingCost(false);
      setSelectedBibFilter('all');
      setAttendanceSuccessMessage(null);
    }
  }, [match?.id]);

  if (!isOpen || !match) return null;

  const isUserInRoster = match.roster.some((p) => p.userId === currentUser.id);
  const isUserInWaitlist = match.waitlist.some((p) => p.userId === currentUser.id);
  const isCreator = match.creatorId === currentUser.id;
  const isAdmin = Boolean(
    currentUser?.isAdmin ||
    isSuperAdminEmail(currentUser?.email) ||
    currentUser?.name?.toLowerCase().includes('mustapha')
  );
  const canManage = isAdmin || isCreator;

  const matchComments = comments[match.id] || [];
  const spotsLeft = Math.max(0, match.maxPlayers - match.roster.length);

  const greenTeam = match.roster.filter((p) => p.team === 'green');
  const blueTeam = match.roster.filter((p) => p.team === 'blue');

  const formattedDate = formatMoroccoDate(match.dateTime, 'day_month_time');
  const formattedTime = formatMoroccoDate(match.dateTime, 'time_only');
  const relativeTime = formatMoroccoDate(match.dateTime, 'relative');

  // Moroccan Dirham Cost calculations - standardized
  const pricing = calculateMatchPricing(
    match.totalPitchCost,
    match.pricePerPlayer,
    match.maxPlayers,
    match.roster.length,
    match.paidPlayerIds || [],
    match.roster.map((p) => p.userId)
  );

  const pricePerPlayer = pricing.pricePerPlayer;
  const totalCost = pricing.totalPitchCost;
  const paidCount = pricing.paidCount;
  const collectedAmount = pricing.totalCollected;
  const remainingCost = pricing.remainingBalance;
  const paidPlayerIds = match.paidPlayerIds || [];

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

  const handleAutoBalance = async (mode: 'balanced' | 'random' | 'veterans_vs_newcomers' = 'balanced') => {
    setIsActionLoading(true);
    await autoBalanceTeams(match.id, mode);
    setIsActionLoading(false);
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
    await deleteMatch(match.id);
    onClose();
  };

  const handleSaveCost = async () => {
    const finalTotal = typeof editTotalCost === 'number'
      ? editTotalCost
      : (editTotalCost !== '' && !isNaN(Number(editTotalCost)) ? Number(editTotalCost) : 0);

    const finalPrice = typeof editPricePerPlayer === 'number'
      ? editPricePerPlayer
      : (editPricePerPlayer !== '' && !isNaN(Number(editPricePerPlayer)) ? Number(editPricePerPlayer) : 0);

    await updateMatchPitchCost(match.id, finalTotal, finalPrice);
    setIsEditingCost(false);
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      await markMatchAttendance(match.id, attendedIds, noShowIds);
      setAttendanceSuccessMessage(language === 'ar' ? 'تم تسجيل الحضور بنجاح وتحديث مؤشر الموثوقية!' : 'Attendance recorded successfully! Reliability index updated.');
      setTimeout(() => setAttendanceSuccessMessage(null), 4000);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const scorer = match.roster.find((p) => p.userId === goalScorerId);
    if (!scorer) return;

    const assist = match.roster.find((p) => p.userId === goalAssistId);
    await recordMatchGoal(
      match.id,
      goalTeam,
      scorer.userId,
      scorer.name,
      Number(goalMinute) || undefined,
      assist?.userId,
      assist?.name
    );
  };

  const handleVoteMvp = async (playerId: string) => {
    await voteMatchMvp(match.id, playerId);
  };

  const handleDuplicateNextWeek = async () => {
    const newId = await duplicateAsRecurringMatch(match.id, 7);
    if (newId) {
      alert(language === 'ar' ? 'تمت جدولة مباراة متكررة للأسبوع القادم بنجاح!' : 'Recurring match scheduled for next week!');
      onClose();
    }
  };

  const getPlayerReliability = (userId: string) => {
    const profile = users.find((u) => u.id === userId);
    return profile?.reliabilityScore ?? 95;
  };

  const scoreGreen = match.score?.green ?? 0;
  const scoreBlue = match.score?.blue ?? 0;

  return (
    <>
      <div
        id="match-detail-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          id="match-detail-modal-card"
          className="relative w-full max-w-4xl bg-[#081813] border border-[#E5B869]/35 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden my-6 max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header Bar */}
          <div className="p-4 sm:p-5 border-b border-[#E5B869]/25 flex items-center justify-between bg-[#06140F]/95">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]">
                {match.format || '7v7'} {t('matches.matchLabel')}
              </span>
              {match.isLocked ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0A2B20] text-slate-300 border border-[#E5B869]/30">
                  <Lock className="w-3.5 h-3.5 text-[#E5B869]" /> {language === 'ar' ? 'مغلقة' : 'Locked'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]">
                  <Unlock className="w-3.5 h-3.5 text-[#E5B869]" /> {language === 'ar' ? 'متاحة' : 'Open'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Add to Calendar */}
              <button
                id="match-detail-calendar-btn"
                type="button"
                onClick={() => downloadIcsFile(match)}
                className="p-2 text-slate-300 hover:text-[#F5D794] rounded-xl bg-[#0A2B20] hover:bg-[#0E4836] border border-[#E5B869]/25 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title={t('matches.addToCalendar')}
              >
                <CalendarPlus className="w-4 h-4 text-[#E5B869]" />
                <span className="hidden sm:inline">{t('matches.addToCalendar')}</span>
              </button>

              <button
                id="match-detail-share-btn"
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 text-slate-300 hover:text-[#F5D794] rounded-xl bg-[#0A2B20] hover:bg-[#0E4836] border border-[#E5B869]/25 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title={t('matches.shareMatch')}
              >
                <Share2 className="w-4 h-4 text-[#E5B869]" />
                <span className="hidden sm:inline">{t('matches.shareMatch')}</span>
              </button>

              {canManage && (
                <button
                  id="match-detail-duplicate-btn"
                  type="button"
                  onClick={handleDuplicateNextWeek}
                  className="p-2 text-slate-400 hover:text-[#F5D794] rounded-xl hover:bg-[#0A2B20] transition-colors cursor-pointer"
                  title={language === 'ar' ? 'تكرار للأسبوع القادم' : "Schedule Next Week's Match"}
                >
                  <Repeat className="w-4 h-4 text-[#E5B869]" />
                </button>
              )}

              {canManage && (
                <button
                  id="match-detail-lock-toggle-btn"
                  type="button"
                  onClick={() => toggleMatchLock(match.id)}
                  className="p-2 text-slate-400 hover:text-[#F5D794] rounded-xl hover:bg-[#0A2B20] transition-colors cursor-pointer"
                  title={match.isLocked ? (language === 'ar' ? 'إلغاء قفل المباراة' : 'Unlock match') : (language === 'ar' ? 'قفل تشكيلة المباراة' : 'Lock match roster')}
                >
                  {match.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
              )}

              {canManage && (
                confirmDeleteModal ? (
                  <div className="flex items-center gap-1">
                    <button
                      id="match-detail-confirm-delete-btn"
                      type="button"
                      onClick={handleDeleteMatch}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer text-xs font-bold shadow-md shadow-rose-950 animate-pulse"
                      title="Confirm Permanent Deletion"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('admin.confirmDelete')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteModal(false)}
                      className="px-2 py-1.5 text-slate-300 hover:text-white bg-[#0A2B20] hover:bg-[#0E4836] border border-[#E5B869]/20 rounded-xl text-xs cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    id="match-detail-delete-btn"
                    type="button"
                    onClick={() => setConfirmDeleteModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 rounded-xl border border-rose-500/30 hover:border-rose-500/60 transition-colors text-xs font-bold cursor-pointer"
                    title={isAdmin ? 'Super Admin: Universal Delete Match' : 'Delete Match'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">{isAdmin ? t('admin.deleteMatch') : t('common.delete')}</span>
                  </button>
                )
              )}

              <button
                id="match-detail-close-btn"
                type="button"
                onClick={onClose}
                className="p-2 text-slate-300 hover:text-[#F5D794] rounded-xl hover:bg-[#0A2B20] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Tab Navigator */}
          <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-[#06140F] border-b border-[#E5B869]/25 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveModalTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'overview'
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'التشكيلة واللاعبون' : 'Squads & Roster'}</span>
            </button>

            <button
              onClick={() => setActiveModalTab('live')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'live'
                  ? 'bg-[#0A3A2A] text-[#F5D794] font-black border border-[#E5B869] shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>{language === 'ar' ? 'توقيت المباراة والتبديلات' : 'Live Clock & Subs'}</span>
            </button>

            <button
              onClick={() => setActiveModalTab('payments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'payments'
                  ? 'bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>{language === 'ar' ? 'تتبع مدفوعات CIH' : 'CIH Payments (MAD)'}</span>
            </button>

            <button
              id="match-detail-motm-tab-btn"
              onClick={() => setActiveModalTab('motm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'motm'
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 ${activeModalTab === 'motm' ? 'fill-slate-950 text-slate-950' : 'text-[#E5B869]'}`} />
              <span>{t('motm.title')}</span>
            </button>

            <button
              id="match-detail-tactical-tab-btn"
              onClick={() => setActiveModalTab('tactical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeModalTab === 'tactical'
                  ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>{language === 'ar' ? 'الرسم التكتيكي' : 'Tactical Pitch'}</span>
            </button>

            {canManage && (
              <button
                onClick={() => setActiveModalTab('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeModalTab === 'attendance'
                    ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-[#0A2B20]'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 text-[#E5B869]" />
                <span>{language === 'ar' ? 'تسجيل الحضور' : 'Attendance'}</span>
              </button>
            )}
          </div>

          {/* Modal Main Content */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {/* TAB 1: OVERVIEW & ROSTERS */}
            {activeModalTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-white">{match.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span>{language === 'ar' ? 'المنظم:' : 'Organized by'}</span> <strong className="text-slate-200">{match.creatorName}</strong>
                    </span>
                    {isSuperAdminEmail(match.creatorEmail) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[#E5B869]" /> {language === 'ar' ? 'المشرف العام مصطفى' : 'Super Admin Mustapha'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#0A2B20] border border-[#E5B869]/25 rounded-xl flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#E5B869] shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-300">{language === 'ar' ? 'التاريخ (المغرب)' : 'Date (Morocco)'}</div>
                      <div className="text-xs font-bold text-slate-100">{formattedDate}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0A2B20] border border-[#E5B869]/25 rounded-xl flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#F5D794] shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-300">{relativeTime}</div>
                      <div className="text-xs font-bold text-slate-100">{formattedTime} (GMT+1)</div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0A2B20] border border-[#E5B869]/25 rounded-xl flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#E5B869] shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-300">{t('createMatch.maxPlayers')}</div>
                      <div className="text-xs font-bold text-slate-100">
                        {match.roster.length} / {match.maxPlayers} {language === 'ar' ? 'لاعبين' : 'Players'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0A2B20] border border-[#E5B869]/25 rounded-xl flex items-center gap-3">
                    <Coins className="w-5 h-5 text-[#E5B869] shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-300">{language === 'ar' ? 'رسوم المشاركة' : 'Match Fee'}</div>
                      <div className="text-xs font-bold text-[#F5D794]">
                        {formatMAD(match.pricePerPlayer, { showZeroAsFree: true })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Moroccan Dirham Cost Split Tracker */}
                <div className="bg-[#0A2B20] border border-[#E5B869]/25 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5B869]/20">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#0A3A2A] border border-[#E5B869] text-[#E5B869]">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {language === 'ar' ? 'تقسيم تكلفة إيجار الملعب (درهم)' : 'Moroccan Pitch Cost Split (MAD)'}
                        </h3>
                        <p className="text-xs text-slate-300">
                          {language === 'ar' ? 'تتبع الدفع نقداً بالملعب أو عبر CIH Bank أو التجاري وفا بنك أو كاش بلس' : 'Track cash on pitch, CIH Bank, Attijariwafa, or Wafacash payments'}
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#06140F] hover:bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]/30 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{isEditingCost ? t('common.cancel') : (language === 'ar' ? 'تعديل الرسوم' : 'Edit Fee (MAD)')}</span>
                      </button>
                    )}
                  </div>

                  {isEditingCost && (
                    <div className="p-4 rounded-xl bg-[#06140F] border border-[#E5B869]/40 space-y-3">
                      <h4 className="text-xs font-bold text-[#F5D794] uppercase tracking-wider">{language === 'ar' ? 'تعديل رسوم وتكاليف الملعب' : 'Update Pitch Fees (MAD)'}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">{language === 'ar' ? 'إجمالي إيجار الملعب (درهم)' : 'Total Pitch Rental (MAD)'}</label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="e.g. 30, 600, 700"
                            value={editTotalCost}
                            onChange={(e) => setEditTotalCost(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-[#081813] border border-[#E5B869]/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B869]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-300 block mb-1">{language === 'ar' ? 'رسوم كل لاعب (درهم)' : 'Player Fee (MAD)'}</label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="e.g. 2, 3, 50, 75"
                            value={editPricePerPlayer}
                            onChange={(e) => setEditPricePerPlayer(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-[#081813] border border-[#E5B869]/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B869]"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveCost}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 hover:brightness-110 transition-colors cursor-pointer"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#06140F] rounded-xl border border-[#E5B869]/20">
                      <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'إجمالي إيجار الملعب' : 'Total Pitch Cost'}</span>
                      <span className="text-base font-bold text-white">{formatMAD(totalCost)}</span>
                    </div>
                    <div className="p-3 bg-[#06140F] rounded-xl border border-[#E5B869]/20">
                      <span className="text-[10px] text-slate-400 block">{language === 'ar' ? 'سعر اللاعب' : 'Per Player'}</span>
                      <span className="text-base font-bold text-slate-200">{formatMAD(pricePerPlayer)}</span>
                    </div>
                    <div className="p-3 bg-[#06140F] rounded-xl border border-[#E5B869]/40">
                      <span className="text-[10px] text-[#F5D794] block">{language === 'ar' ? 'المبلغ المحصل' : 'Collected So Far'}</span>
                      <span className="text-base font-bold text-[#F5D794]">{formatMAD(collectedAmount)} ({paidCount} {language === 'ar' ? 'دفعوا' : 'Paid'})</span>
                    </div>
                    <div className="p-3 bg-[#06140F] rounded-xl border border-amber-500/30">
                      <span className="text-[10px] text-amber-400 block">{language === 'ar' ? 'المتبقي لتحصيله' : 'Uncollected Balance'}</span>
                      <span className="text-base font-bold text-amber-400">{formatMAD(remainingCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Location Card */}
                <div className="bg-[#0A2B20] border border-[#E5B869]/25 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0A3A2A] border border-[#E5B869] flex items-center justify-center text-[#E5B869] shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{match.location.venueName}</h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#06140F] text-[#F5D794] border border-[#E5B869]/30">
                          {match.location.city || 'الدار البيضاء'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{match.location.address}</p>
                    </div>
                  </div>

                  <a
                    id="open-match-google-maps-btn"
                    href={getMatchMapUrl(match.location)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 transition-all shrink-0 cursor-pointer shadow-md"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{t('matches.viewOnMap')}</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>

                {/* Confirmed Rosters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4 text-[#E5B869]" />
                      <h3 className="text-sm font-bold text-white">{language === 'ar' ? 'تشكيلة الفريقين المؤكدة' : 'Confirmed Match Rosters'}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAutoBalance('balanced')}
                            disabled={isActionLoading || match.roster.length < 2}
                            className="px-2.5 py-1 bg-[#0A3A2A] hover:bg-[#0E4836] text-[#F5D794] border border-[#E5B869] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                            title="Auto-Balance Teams (Skill Snake Draft)"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#E5B869]" />
                            <span>{language === 'ar' ? 'توزيع ذكي متوازن' : 'Skill Snake Draft'}</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1 bg-[#06140F] p-1 rounded-lg border border-[#E5B869]/25 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedBibFilter('all')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            selectedBibFilter === 'all' ? 'bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {language === 'ar' ? 'الكل' : 'All'} ({match.roster.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBibFilter('green')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            selectedBibFilter === 'green' ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]' : 'text-slate-300'
                          }`}
                        >
                          {t('matches.greenTeam')} ({greenTeam.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBibFilter('blue')}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            selectedBibFilter === 'blue' ? 'bg-blue-600 text-white' : 'text-blue-400'
                          }`}
                        >
                          {t('matches.blueTeam')} ({blueTeam.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Green vs Blue Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(selectedBibFilter === 'all' || selectedBibFilter === 'green') && (
                      <div className="bg-[#0A2B20] border border-[#E5B869]/35 rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between pb-2 border-b border-[#E5B869]/25">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#E5B869] shadow-sm" />
                            <span className="text-sm font-bold text-[#F5D794]">{t('matches.greenTeam')}</span>
                          </div>
                          <span className="text-xs font-semibold text-[#F5D794] bg-[#0A3A2A] px-2 py-0.5 rounded border border-[#E5B869]">
                            {greenTeam.length} {language === 'ar' ? 'لاعبين' : 'Players'}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {greenTeam.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 text-center">{language === 'ar' ? 'لا يوجد لاعبون في الفريق الأخضر بعد.' : 'No players assigned to Green yet.'}</p>
                          ) : (
                            greenTeam.map((player) => {
                              const isPaid = paidPlayerIds.includes(player.userId);
                              const reliability = getPlayerReliability(player.userId);
                              return (
                                <div
                                  key={player.userId}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#06140F] border border-[#E5B869]/25 hover:border-[#E5B869]/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                                      alt={player.name}
                                      className="w-8 h-8 rounded-full object-cover border border-[#E5B869]/50 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold text-white truncate">{player.name}</span>
                                        {player.isHost && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E5B869]/20 text-[#F5D794] border border-[#E5B869]/40">
                                            {language === 'ar' ? 'المنظم' : 'Host'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-[#E5B869] font-bold">
                                          {reliability}% {language === 'ar' ? 'موثوقية' : 'Rel.'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">•</span>
                                        <button
                                          type="button"
                                          onClick={() => canManage && togglePlayerPaidStatus(match.id, player.userId)}
                                          disabled={!canManage}
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 transition-all ${
                                            isPaid
                                              ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]'
                                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                          } ${canManage ? 'cursor-pointer hover:scale-105' : ''}`}
                                          title={canManage ? 'Click to toggle payment' : undefined}
                                        >
                                          <CheckCircle2 className={`w-2.5 h-2.5 ${isPaid ? 'text-[#E5B869]' : 'text-rose-400'}`} />
                                          <span>{isPaid ? (language === 'ar' ? 'تم الدفع (درهم)' : 'Paid (MAD)') : (language === 'ar' ? 'لم يدفع' : 'Unpaid')}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {player.userId !== currentUser.id && onOpenDirectMessage && (
                                      <button
                                        onClick={() => onOpenDirectMessage(player.userId)}
                                        className="p-1 text-slate-400 hover:text-[#F5D794] hover:bg-[#0A2B20] rounded transition-colors cursor-pointer"
                                        title={`Message ${player.name}`}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {canManage && (
                                      <button
                                        onClick={() => assignPlayerTeam(match.id, player.userId, 'blue')}
                                        className="px-2 py-1 text-[10px] font-medium rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 transition-colors cursor-pointer"
                                      >
                                        ➔ {t('matches.blueTeam')}
                                      </button>
                                    )}

                                    {canManage && (
                                      <button
                                        onClick={() => removePlayerFromMatch(match.id, player.userId)}
                                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                        title={`Remove ${player.name} from match`}
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

                    {(selectedBibFilter === 'all' || selectedBibFilter === 'blue') && (
                      <div className="bg-[#0A2B20] border border-blue-500/35 rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-400 shadow-sm" />
                            <span className="text-sm font-bold text-blue-400">{t('matches.blueTeam')}</span>
                          </div>
                          <span className="text-xs font-semibold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/20">
                            {blueTeam.length} {language === 'ar' ? 'لاعبين' : 'Players'}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {blueTeam.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 text-center">{language === 'ar' ? 'لا يوجد لاعبون في الفريق الأزرق بعد.' : 'No players assigned to Blue yet.'}</p>
                          ) : (
                            blueTeam.map((player) => {
                              const isPaid = paidPlayerIds.includes(player.userId);
                              const reliability = getPlayerReliability(player.userId);
                              return (
                                <div
                                  key={player.userId}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#06140F] border border-[#1E293B] hover:border-blue-500/30 transition-colors"
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
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E5B869]/20 text-[#F5D794]">
                                            {language === 'ar' ? 'المنظم' : 'Host'}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-blue-400 font-bold">
                                          {reliability}% {language === 'ar' ? 'موثوقية' : 'Rel.'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">•</span>
                                        <button
                                          type="button"
                                          onClick={() => canManage && togglePlayerPaidStatus(match.id, player.userId)}
                                          disabled={!canManage}
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex items-center gap-1 transition-all ${
                                            isPaid
                                              ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]'
                                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                          } ${canManage ? 'cursor-pointer hover:scale-105' : ''}`}
                                          title={canManage ? 'Click to toggle payment' : undefined}
                                        >
                                          <CheckCircle2 className={`w-2.5 h-2.5 ${isPaid ? 'text-[#E5B869]' : 'text-rose-400'}`} />
                                          <span>{isPaid ? (language === 'ar' ? 'تم الدفع (درهم)' : 'Paid (MAD)') : (language === 'ar' ? 'لم يدفع' : 'Unpaid')}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {player.userId !== currentUser.id && onOpenDirectMessage && (
                                      <button
                                        onClick={() => onOpenDirectMessage(player.userId)}
                                        className="p-1 text-slate-400 hover:text-blue-400 hover:bg-[#0A2B20] rounded transition-colors cursor-pointer"
                                        title={`Message ${player.name}`}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {canManage && (
                                      <button
                                        onClick={() => assignPlayerTeam(match.id, player.userId, 'green')}
                                        className="px-2 py-1 text-[10px] font-medium rounded bg-[#0A3A2A] text-[#F5D794] hover:bg-[#0E4836] border border-[#E5B869]/40 transition-colors cursor-pointer"
                                      >
                                        ➔ {t('matches.greenTeam')}
                                      </button>
                                    )}

                                    {canManage && (
                                      <button
                                        onClick={() => removePlayerFromMatch(match.id, player.userId)}
                                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                        title={`Remove ${player.name} from match`}
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

                {/* Match Chat & Voice Board */}
                <div className="bg-[#0A2B20] border border-[#E5B869]/25 rounded-2xl p-4 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5B869]/20">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#E5B869]" />
                      <h3 className="text-sm font-bold text-white">{language === 'ar' ? 'نقاش المباراة والرسائل الصوتية' : 'Match Discussion & Voice Notes'}</h3>
                    </div>
                    <span className="text-xs text-slate-300">{matchComments.length} {language === 'ar' ? 'رسالة' : 'messages'}</span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {matchComments.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        {language === 'ar' ? 'لا يوجد نقاش حتى الآن. نسق مع الفريق هنا!' : 'No discussion yet. Coordinate bibs, balls, or carpools here!'}
                      </div>
                    ) : (
                      matchComments.map((comment) => (
                        <div key={comment.id} className="p-3 rounded-xl bg-[#06140F] border border-[#E5B869]/20 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={comment.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.userName}`}
                                alt={comment.userName}
                                className="w-6 h-6 rounded-full object-cover border border-[#E5B869]/30"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-xs font-semibold text-white">{comment.userName}</span>
                              {isSuperAdminEmail(comment.userEmail) && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]">
                                  {language === 'ar' ? 'مشرف' : 'Admin'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {comment.text && <p className="text-xs text-slate-200 pl-8 rtl:pr-8 rtl:pl-0 leading-relaxed">{comment.text}</p>}

                          {comment.audioUrl && (
                            <div className="pl-8 rtl:pr-8 rtl:pl-0 pt-1">
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

                  <div className="pt-2 border-t border-[#E5B869]/20 space-y-2">
                    <form onSubmit={handlePostComment} className="flex items-center gap-2">
                      <input
                        id="match-comment-input"
                        type="text"
                        placeholder={language === 'ar' ? 'اكتب رسالة للاعبين في التشكيلة...' : 'Post an update for the squad...'}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 bg-[#06140F] border border-[#E5B869]/30 focus:border-[#E5B869] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!commentText.trim()}
                        className="p-2 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 text-slate-950 font-black disabled:opacity-40 transition-colors cursor-pointer shadow-md"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                      <span className="text-[11px]">{language === 'ar' ? 'أو سجل رسالة صوتية للمباراة:' : 'Or record a voice message:'}</span>
                      <VoiceNoteRecorder onSendAudio={handleSendVoiceNote} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LIVE MATCH CLOCK & SUBS */}
            {activeModalTab === 'live' && (
              <LiveMatchClockManager match={match} />
            )}

            {/* TAB: CIH BANK & PAYMENTS */}
            {activeModalTab === 'payments' && (
              <CihPaymentTracker match={match} />
            )}

            {/* TAB: MOTM VOTING */}
            {activeModalTab === 'motm' && (
              <MotmPostMatchVoting match={match} />
            )}

            {/* TAB 3: 2D/3D TACTICAL PITCH */}
            {activeModalTab === 'tactical' && (
              <ErrorBoundary fallbackTitle="Tactical Pitch Unavailable">
                <TacticalPitchFormation
                  match={match}
                  isHostOrAdmin={canManage}
                  onUpdateTactical={(fg, fb, ta) => updateTacticalFormation(match.id, fg, fb, ta)}
                />
              </ErrorBoundary>
            )}

            {/* TAB 4: ATTENDANCE */}
            {activeModalTab === 'attendance' && (
              <div className="bg-[#0A2B20] border border-[#E5B869]/25 rounded-2xl p-5 space-y-4 shadow-lg">
                <div>
                  <h3 className="font-bold text-white text-base">{language === 'ar' ? 'تسجيل الحضور ومؤشر الموثوقية' : 'Attendance & Reliability Tracking'}</h3>
                  <p className="text-xs text-slate-300">
                    {language === 'ar' ? 'سجل حضور اللاعبين لتحديث مؤشرات الالتزام والموثوقية واللعب النظيف.' : 'Record player attendance to update player reliability and fair play scores.'}
                  </p>
                </div>

                {attendanceSuccessMessage && (
                  <div className="p-3 rounded-xl bg-[#0A3A2A] border border-[#E5B869] text-[#F5D794] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 text-[#E5B869] shrink-0" />
                    {attendanceSuccessMessage}
                  </div>
                )}

                <div className="space-y-2">
                  {match.roster.map((player) => {
                    const isAttended = attendedIds.includes(player.userId);
                    const isNoShow = noShowIds.includes(player.userId);

                    return (
                      <div
                        key={player.userId}
                        className="flex items-center justify-between p-3 bg-[#06140F] border border-[#E5B869]/20 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                            alt={player.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#E5B869]/30"
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{player.name}</div>
                            <div className="text-[11px] text-slate-300">{player.team === 'green' ? t('matches.greenTeam') : t('matches.blueTeam')}</div>
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
                                ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] font-bold'
                                : 'bg-[#081813] text-slate-300 hover:text-white border border-[#E5B869]/20'
                            }`}
                          >
                            {language === 'ar' ? 'حضر' : 'Attended'}
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
                                ? 'bg-rose-600 text-white'
                                : 'bg-[#081813] text-slate-400 hover:text-rose-300 border border-[#E5B869]/20'
                            }`}
                          >
                            {language === 'ar' ? 'غائب (No Show)' : 'No Show'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-[#E5B869]/20 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={isSavingAttendance || (attendedIds.length === 0 && noShowIds.length === 0)}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 hover:brightness-110 font-black text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isSavingAttendance ? t('common.loading') : (language === 'ar' ? 'حفظ الحضور وتحديث النقاط' : 'Record Attendance & Update Scores')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="p-4 sm:p-5 border-t border-[#E5B869]/25 bg-[#06140F]/95 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300 text-center sm:text-start">
              {isUserInRoster ? (
                <span className="text-[#F5D794] font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4 text-[#E5B869]" /> {language === 'ar' ? 'أنت مسجل في التشكيلة الأساسية المؤكدة!' : 'You are on the confirmed roster!'}
                </span>
              ) : isUserInWaitlist ? (
                <span className="text-amber-300 font-semibold">
                  {language === 'ar' ? 'أنت في قائمة الانتظار، سيتم ترقيتك تلقائياً عند انسحاب لاعب.' : 'In waitlist queue. Auto-promoted if a player drops out.'}
                </span>
              ) : spotsLeft > 0 ? (
                <span>{spotsLeft} {t('matches.spotsRemaining')}. {language === 'ar' ? 'انضم للفريق الأخضر أو الأزرق!' : 'Join Green or Blue team!'}</span>
              ) : (
                <span className="text-amber-400">{language === 'ar' ? 'المباراة ممتلئة. انضم لقائمة الانتظار.' : 'Match is full. Join waitlist.'}</span>
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
                  <span>{t('matches.leaveMatch')}</span>
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
                  <span>{language === 'ar' ? 'مغادرة قائمة الانتظار' : 'Leave Waitlist'}</span>
                </button>
              ) : match.isLocked ? (
                <div className="text-xs font-bold text-slate-400 bg-[#0A2B20] px-4 py-2 rounded-xl border border-[#E5B869]/30">
                  {language === 'ar' ? 'التشكيلة مغلقة' : 'Roster Locked'}
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="modal-join-green-btn"
                    type="button"
                    onClick={() => handleJoin('green')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#F5D794] bg-[#0A3A2A] hover:bg-[#0E4836] border border-[#E5B869] shadow-md transition-all cursor-pointer hover:scale-105"
                  >
                    <Shirt className="w-3.5 h-3.5 text-[#E5B869]" />
                    <span>{language === 'ar' ? 'انضم للأخضر' : 'Join Green'}</span>
                  </button>
                  <button
                    id="modal-join-blue-btn"
                    type="button"
                    onClick={() => handleJoin('blue')}
                    disabled={isActionLoading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all cursor-pointer hover:scale-105"
                  >
                    <Shirt className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'انضم للأزرق' : 'Join Blue'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MatchShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        match={match}
      />
    </>
  );
};

