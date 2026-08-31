import React, { useState } from 'react';
import { SoccerMatch, PlayerPosition, TeamSide } from '../types';
import {
  Sparkles,
  Check,
  ChevronDown,
  Lock,
  UserCheck,
  Shirt,
  Rotate3d,
  Layers,
  Trash2,
  Eye,
  Sliders,
  Shield,
  Compass,
  CheckCircle2,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { TacticalPitch3DWebGL } from './TacticalPitch3DWebGL';
import { SoundEffects } from '../lib/audioService';
import {
  SlotDefinition,
  FormationConfig,
  FORMATIONS,
  getPositionArabicLabel,
  getDefaultFormationForFormat,
  getNormalizedFormationKey,
  generateDynamicTacticalSlots,
} from '../lib/tacticalFormations';

export type { SlotDefinition, FormationConfig };
export { FORMATIONS, getPositionArabicLabel, getDefaultFormationForFormat, getNormalizedFormationKey, generateDynamicTacticalSlots };

interface TacticalPitchFormationProps {
  match: SoccerMatch;
  onUpdateTactical?: (formationGreen: string, formationBlue: string, tacticalAssignments: Record<string, string>) => void;
  isHostOrAdmin?: boolean;
}

export const TacticalPitchFormation: React.FC<TacticalPitchFormationProps> = ({
  match,
  onUpdateTactical,
  isHostOrAdmin,
}) => {
  const {
    currentUser,
    assignPlayerTacticalSlot,
    claimTacticalSlot,
    releaseTacticalSlot,
    joinMatch,
    assignPlayerTeam,
  } = usePitchStore();
  const { t, language, isRTL } = useLanguage();

  const [formationKey, setFormationKey] = useState<string>(
    getNormalizedFormationKey(match.formationGreen, match.format, match.maxPlayers)
  );
  const [assignments, setAssignments] = useState<Record<string, string>>(
    match.tacticalAssignments || {}
  );
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'green' | 'blue'>('full');
  const [isConfirmingPosition, setIsConfirmingPosition] = useState(false);
  const [confirmationSuccessMsg, setConfirmationSuccessMsg] = useState<string | null>(null);
  const [slotErrorMsg, setSlotErrorMsg] = useState<string | null>(null);

  // Sync state if match format, match ID, or formation changes
  React.useEffect(() => {
    const normalized = getNormalizedFormationKey(match.formationGreen, match.format, match.maxPlayers);
    setFormationKey(normalized);
  }, [match.id, match.format, match.formationGreen, match.maxPlayers]);

  // Sync assignments if match updates from broadcast
  React.useEffect(() => {
    if (match.tacticalAssignments) {
      setAssignments(match.tacticalAssignments);
    }
  }, [match.tacticalAssignments]);

  const formation = React.useMemo(() => {
    if (FORMATIONS[formationKey]) {
      return FORMATIONS[formationKey];
    }
    const teamSize = Math.max(3, Math.floor((match.maxPlayers || 14) / 2));
    return {
      label: `${teamSize}v${teamSize} (Dynamic Tactical Setup)`,
      category: 'custom' as const,
      slots: {
        green: generateDynamicTacticalSlots(teamSize, 'green'),
        blue: generateDynamicTacticalSlots(teamSize, 'blue'),
      },
    };
  }, [formationKey, match.maxPlayers]);

  const greenPlayers = match.roster.filter((p) => p.team === 'green');
  const bluePlayers = match.roster.filter((p) => p.team === 'blue');

  const isUserInRoster = match.roster.some((p) => p.userId === currentUser.id);
  const userTeam = match.roster.find((p) => p.userId === currentUser.id)?.team;

  // Selected slot details
  const allSlots = [...formation.slots.green, ...formation.slots.blue];
  const selectedSlot = allSlots.find((s) => s.key === selectedSlotKey);
  const isSelectedSlotOccupiedByMe = selectedSlot ? assignments[selectedSlot.key] === currentUser.id : false;
  const currentOccupantId = selectedSlot ? assignments[selectedSlot.key] : null;
  const currentOccupantPlayer = currentOccupantId ? match.roster.find((p) => p.userId === currentOccupantId) : null;

  // Handle slot selection
  const handleSlotClick = (slotKey: string) => {
    if (selectedSlotKey === slotKey) {
      setSelectedSlotKey(null);
    } else {
      setSelectedSlotKey(slotKey);
      setConfirmationSuccessMsg(null);
      setSlotErrorMsg(null);
    }
  };

  // Primary Position Confirmation Function with Concurrency Protection
  const handleConfirmMyPosition = async (slot: SlotDefinition) => {
    const currentOccupant = assignments[slot.key];
    if (currentOccupant && currentOccupant !== currentUser.id && !isHostOrAdmin) {
      const occupant = match.roster.find((p) => p.userId === currentOccupant);
      const occupantName = occupant ? occupant.name : 'another player';
      setSlotErrorMsg(
        language === 'ar'
          ? `🔒 عذراً، هذا المركز (${slot.label}) محجوز ومثبت مسبقاً للاعب ${occupantName}. لا يمكن حجزه إلا إذا ألغى اللاعب حجزه أو قام المنظم بتفريغه.`
          : `🔒 This position (${slot.label}) is already locked and reserved for ${occupantName}. Only this player or the match organizer can release it.`
      );
      setTimeout(() => setSlotErrorMsg(null), 6000);
      return;
    }

    setIsConfirmingPosition(true);
    setSlotErrorMsg(null);
    try {
      // 1. Join match roster if not already joined
      if (!isUserInRoster) {
        await joinMatch(match.id, slot.team);
      } else if (userTeam !== slot.team) {
        await assignPlayerTeam(match.id, currentUser.id, slot.team);
      }

      // 2. Claim tactical slot with atomic concurrency lock
      const claimResult = await claimTacticalSlot(match.id, slot.key, currentUser.id, slot.position, slot.team);
      if (!claimResult.success) {
        setSlotErrorMsg(
          claimResult.error ||
            (language === 'ar' ? 'تعذر حجز وتثبيت المركز.' : 'Could not reserve position due to a conflict.')
        );
        setTimeout(() => setSlotErrorMsg(null), 6000);
        return;
      }

      const next = { ...assignments };
      Object.keys(next).forEach((key) => {
        if (next[key] === currentUser.id) delete next[key];
      });
      next[slot.key] = currentUser.id;
      setAssignments(next);
      onUpdateTactical?.(formationKey, formationKey, next);

      SoundEffects.playJoin();
      const posLabel = getPositionArabicLabel(slot.position, slot.label);
      const teamLabel = slot.team === 'green' ? (language === 'ar' ? 'الفريق الأخضر' : 'Team Green') : (language === 'ar' ? 'الفريق الأزرق' : 'Team Blue');

      const successText = language === 'ar'
        ? `🔒 تم تثبيت وقفل مركزك في الملعب بنجاح: ${slot.label} - ${posLabel} في ${teamLabel}!`
        : `🔒 Position successfully locked & reserved: ${slot.label} - ${posLabel} in ${teamLabel}!`;

      setConfirmationSuccessMsg(successText);
      setTimeout(() => {
        setConfirmationSuccessMsg(null);
      }, 5000);
    } catch (err) {
      console.error('Failed to confirm position:', err);
    } finally {
      setIsConfirmingPosition(false);
    }
  };

  // Direct Self Claim Position (alias for backwards compatibility)
  const handleSelfClaimPosition = async (slot: SlotDefinition) => {
    await handleConfirmMyPosition(slot);
  };

  // Host/Admin Assign Player
  const handleAssignPlayer = async (slotKey: string, userId: string, position: PlayerPosition) => {
    const claimRes = await claimTacticalSlot(match.id, slotKey, userId, position);
    if (!claimRes.success && claimRes.error) {
      setSlotErrorMsg(claimRes.error);
      setTimeout(() => setSlotErrorMsg(null), 5000);
      return;
    }

    const next = { ...assignments };
    Object.keys(next).forEach((key) => {
      if (next[key] === userId) delete next[key];
    });
    next[slotKey] = userId;
    setAssignments(next);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  // Clear / Release Slot
  const handleClearSlot = async (slotKey: string) => {
    await releaseTacticalSlot(match.id, slotKey);

    const next = { ...assignments };
    delete next[slotKey];
    setAssignments(next);
    setSelectedSlotKey(null);
    setConfirmationSuccessMsg(null);
    setSlotErrorMsg(null);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  // Smart Auto-Fill Lineup
  const handleAutoFillFormation = () => {
    const next: Record<string, string> = { ...assignments };

    // Auto-fill Green slots
    formation.slots.green.forEach((slot) => {
      if (!next[slot.key]) {
        const matching = greenPlayers.find(
          (p) =>
            (p.position === slot.position || p.position === 'ANY' || !p.position) &&
            !Object.values(next).includes(p.userId)
        );
        if (matching) {
          next[slot.key] = matching.userId;
        } else {
          const unassigned = greenPlayers.find((p) => !Object.values(next).includes(p.userId));
          if (unassigned) next[slot.key] = unassigned.userId;
        }
      }
    });

    // Auto-fill Blue slots
    formation.slots.blue.forEach((slot) => {
      if (!next[slot.key]) {
        const matching = bluePlayers.find(
          (p) =>
            (p.position === slot.position || p.position === 'ANY' || !p.position) &&
            !Object.values(next).includes(p.userId)
        );
        if (matching) {
          next[slot.key] = matching.userId;
        } else {
          const unassigned = bluePlayers.find((p) => !Object.values(next).includes(p.userId));
          if (unassigned) next[slot.key] = unassigned.userId;
        }
      }
    });

    setAssignments(next);
    onUpdateTactical?.(formationKey, formationKey, next);
  };

  // Reset / Clear All Slots
  const handleResetFormation = () => {
    const confirmPrompt = language === 'ar' ? 'هل أنت متأكد من رغبتك في تفريغ كافة المراكز التكتيكية في الملعب؟' : 'Clear all tactical position assignments on the pitch?';
    if (confirm(confirmPrompt)) {
      setAssignments({});
      setSelectedSlotKey(null);
      onUpdateTactical?.(formationKey, formationKey, {});
    }
  };

  // Eligible candidate players for selected slot
  const eligiblePlayers = selectedSlot
    ? selectedSlot.team === 'green'
      ? greenPlayers
      : bluePlayers
    : [];

  const categories: Array<'5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11'> = [
    '5v5',
    '6v6',
    '7v7',
    '8v8',
    '9v9',
    '10v10',
    '11v11',
  ];

  return (
    <div id="3d-tactical-pitch-container" className="space-y-4">
      {/* 3D Tactical Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141A26] p-3 sm:p-4 rounded-2xl border border-[#E5B869]/30 shadow-xl">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Formation Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-[#E5B869]" />
              {language === 'ar' ? 'الخطة التكتيكية:' : 'Formation:'}
            </span>
            <div className="relative">
              <select
                id="tactical-formation-select"
                value={formationKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setFormationKey(key);
                  onUpdateTactical?.(key, key, assignments);
                }}
                className="appearance-none pl-3 pr-8 py-2 bg-[#080B10] border border-[#E5B869]/30 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#E5B869] cursor-pointer shadow-sm transition-all"
              >
                {categories.map((cat) => (
                  <optgroup
                    key={cat}
                    label={`─── ${cat} ───`}
                    className="bg-[#080B10] font-bold text-[#F5D794]"
                  >
                    {Object.entries(FORMATIONS)
                      .filter(([_, val]) => val.category === cat)
                      .map(([key, val]) => (
                        <option key={key} value={key} className="bg-[#080B10] text-white font-normal">
                          {val.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#E5B869] absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Controls: Auto-Fill, Clear & Team Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {isHostOrAdmin && (
            <button
              id="tactical-autofill-btn"
              type="button"
              onClick={handleAutoFillFormation}
              className="px-3 py-1.5 bg-[#0D503C]/40 hover:bg-[#0D503C]/60 text-[#F5D794] border border-[#E5B869]/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title={language === 'ar' ? 'توزيع اللاعبين المؤكدين تلقائياً على مراكز الخطة' : 'Auto-place confirmed roster players onto tactical pitch slots'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5B869]" />
              {language === 'ar' ? 'توزيع التشكيلة تلقائياً' : 'Auto-Fill Lineup'}
            </button>
          )}

          {isHostOrAdmin && Object.keys(assignments).length > 0 && (
            <button
              id="tactical-reset-btn"
              type="button"
              onClick={handleResetFormation}
              className="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title={language === 'ar' ? 'إعادة ضبط كافة المراكز' : 'Reset all positions'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
            </button>
          )}

          {/* Team Filter */}
          <div className="flex items-center bg-[#080B10] p-1 rounded-xl border border-[#E5B869]/20">
            <button
              type="button"
              onClick={() => setViewMode('full')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'full' ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'الفريقين' : 'Both'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('green')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'green' ? 'bg-[#0D503C] text-[#F5D794] font-black border border-[#E5B869]/40' : 'text-slate-400 hover:text-[#F5D794]'
              }`}
            >
              {t('matches.greenTeam')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('blue')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'blue' ? 'bg-[#241A0B] text-[#F5D794] font-black border border-[#E5B869]/40' : 'text-slate-400 hover:text-[#E5B869]'
              }`}
            >
              {t('matches.blueTeam')}
            </button>
          </div>
        </div>
      </div>

      {/* Error / Concurrency Conflict Alert Banner */}
      {slotErrorMsg && (
        <div
          id="position-concurrency-error-banner"
          className="bg-amber-950/90 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-white animate-in shake duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                {language === 'ar' ? 'تنبيه: المركز محجوز' : 'Position Locked'}
              </div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                {slotErrorMsg}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSlotErrorMsg(null)}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold rounded-xl border border-amber-500/30 cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Confirmation Success Toast / Banner */}
      {confirmationSuccessMsg && (
        <div
          id="position-confirmation-success-banner"
          className="bg-gradient-to-r from-[#0D503C]/90 via-[#241A0B]/90 to-[#141A26] border-2 border-[#E5B869]/80 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-white animate-in zoom-in-95 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E5B869]/20 border border-[#E5B869]/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-[#E5B869]" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[#F5D794]">
                {language === 'ar' ? 'تم تثبيت وتأكيد المركز' : 'Position Confirmed & Locked'}
              </div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">
                {confirmationSuccessMsg}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmationSuccessMsg(null)}
            className="px-3 py-1.5 bg-[#E5B869]/20 hover:bg-[#E5B869]/30 text-[#F5D794] text-xs font-bold rounded-xl border border-[#E5B869]/30 cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Interactive Slot Assignment & Confirmation Drawer */}
      {selectedSlot && (
        <div
          id="slot-assignment-drawer"
          className="bg-gradient-to-b from-[#141A26] to-[#080B10] border-2 border-[#E5B869]/50 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200"
        >
          {/* Header with Slot Identity */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5B869]/20">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg border ${
                  selectedSlot.team === 'green'
                    ? 'bg-[#0D503C]/80 border-[#E5B869] text-[#F5D794]'
                    : 'bg-[#241A0B] border-[#E5B869] text-[#F5D794]'
                }`}
              >
                <span className="text-base leading-none">{selectedSlot.label}</span>
                <span className="text-[9px] uppercase tracking-tighter text-slate-400 mt-0.5">
                  {selectedSlot.position}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedSlot.team === 'green'
                        ? 'bg-[#0D503C]/30 text-[#F5D794] border border-[#E5B869]/40'
                        : 'bg-[#241A0B] text-[#F5D794] border border-[#E5B869]/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedSlot.team === 'green' ? 'bg-[#0D503C]' : 'bg-[#E5B869]'}`} />
                    {selectedSlot.team === 'green' ? (language === 'ar' ? 'الفريق الأخضر' : 'Team Green') : (language === 'ar' ? 'الفريق الأزرق' : 'Team Blue')}
                  </span>

                  <span className="text-sm font-black text-[#F5D794]">
                    {getPositionArabicLabel(selectedSlot.position, selectedSlot.label)}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-2">
                  <span>{selectedSlot.roleDescription}</span>
                  {currentOccupantPlayer && (
                    <span className="text-slate-300 text-[11px] flex items-center gap-1">
                      • {language === 'ar' ? 'يشغله ومثبت لـ:' : 'Locked by:'}{' '}
                      <strong className={currentOccupantPlayer.userId === currentUser.id ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                        {currentOccupantPlayer.name} {currentOccupantPlayer.userId === currentUser.id && (language === 'ar' ? '(أنت)' : '(You)')}
                      </strong>
                    </span>
                  )}
                  {!currentOccupantPlayer && (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      • <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> {language === 'ar' ? 'مركز شاغر ومتاح للحجز' : 'Open & Available to Lock'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* DIRECT ACTION BUTTONS (LOCK / UNLOCK POSITION BUTTONS) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {currentOccupantPlayer && currentOccupantPlayer.userId !== currentUser.id && !isHostOrAdmin ? (
                /* Slot is locked by someone else */
                <div className="px-4 py-3 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-300 text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ar' ? `محجوز ومثبت لـ ${currentOccupantPlayer.name}` : `Locked by ${currentOccupantPlayer.name}`}</span>
                </div>
              ) : isSelectedSlotOccupiedByMe ? (
                /* Slot is locked by current user */
                <div className="flex items-center gap-2">
                  <div className="px-4 py-3 bg-emerald-500/20 border-2 border-emerald-500/60 rounded-2xl text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'ar' ? `مركزك المثبت (${selectedSlot.label})` : `Your Locked Spot (${selectedSlot.label})`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClearSlot(selectedSlot.key)}
                    className="px-3.5 py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title={language === 'ar' ? 'إلغاء حجز وتفريغ مركزي' : 'Release my position'}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'ar' ? 'إلغاء الحجز' : 'Release'}</span>
                  </button>
                </div>
              ) : (
                /* Slot is open for locking */
                <button
                  id="confirm-tactical-position-btn"
                  type="button"
                  disabled={isConfirmingPosition}
                  onClick={() => handleConfirmMyPosition(selectedSlot)}
                  className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-xl cursor-pointer active:scale-95 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 text-slate-950 shadow-amber-950/30 border border-[#F5D794]"
                >
                  {isConfirmingPosition ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'ar' ? 'جارٍ قفل وتثبيت المركز...' : 'Locking Position...'}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>{language === 'ar' ? `قفل وتثبيت المركز (${selectedSlot.label})` : `Lock & Reserve Position (${selectedSlot.label})`}</span>
                    </>
                  )}
                </button>
              )}

              {/* Host/Admin can clear any slot */}
              {isHostOrAdmin && assignments[selectedSlot.key] && !isSelectedSlotOccupiedByMe && (
                <button
                  id="admin-clear-slot-btn"
                  type="button"
                  onClick={() => handleClearSlot(selectedSlot.key)}
                  className="px-3.5 py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title={language === 'ar' ? 'تفريغ المركز بواسطة المنظم' : 'Admin: Vacate position'}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تفريغ المركز' : 'Vacate Slot'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Host / Admin Player Candidates List */}
          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="uppercase tracking-wider">
                {language === 'ar'
                  ? `أو قم بتعيين لاعب آخر من التشكيلة (${selectedSlot.team === 'green' ? 'الأخضر' : 'الأزرق'}):`
                  : `Or Assign Another Roster Teammate (${selectedSlot.team === 'green' ? 'Green' : 'Blue'}):`}
              </span>
              <span>{language === 'ar' ? 'اضغط على لاعب لوضعه في هذا المركز' : 'Click a teammate to place them here'}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {eligiblePlayers.map((player) => {
                const isCurrent = assignments[selectedSlot.key] === player.userId;
                const isAssignedElsewhere = Object.entries(assignments).some(
                  ([k, uId]) => k !== selectedSlot.key && uId === player.userId
                );

                return (
                  <button
                    key={player.userId}
                    type="button"
                    onClick={() => handleAssignPlayer(selectedSlot.key, player.userId, selectedSlot.position)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-[#E5B869] text-slate-950 ring-2 ring-[#F5D794] shadow-md font-black'
                        : isAssignedElsewhere
                        ? 'bg-[#080B10] text-slate-400 border border-slate-800 hover:border-slate-700'
                        : selectedSlot.team === 'green'
                        ? 'bg-[#0D503C]/30 hover:bg-[#0D503C]/50 text-[#F5D794] border border-[#E5B869]/30'
                        : 'bg-[#241A0B] hover:bg-[#342410] text-[#F5D794] border border-[#E5B869]/30'
                    }`}
                  >
                    <img
                      src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                      alt={player.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span>{player.name}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
              {eligiblePlayers.length === 0 && (
                <div className="text-xs text-slate-400 py-1">
                  {language === 'ar' ? 'لا يوجد لاعبون آخرون مؤكدون في تشكيلة هذا الفريق بعد.' : 'No other confirmed players on this team roster yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRUE 3D WEBGL SOCCER STADIUM & PITCH CANVAS */}
      <TacticalPitch3DWebGL
        match={match}
        formation={formation}
        assignments={assignments}
        selectedSlotKey={selectedSlotKey}
        viewMode={viewMode}
        onSelectSlot={(key) => handleSlotClick(key)}
        onSelfClaimSlot={(slot) => handleSelfClaimPosition(slot)}
      />

      {/* Roster Bench Breakdown & Position Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Team Green Lineup & Bench */}
        <div className="bg-[#141A26] p-4 rounded-2xl border border-[#0D503C]/40 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-[#F5D794] mb-2.5">
            <span>{language === 'ar' ? `تشكيلة الفريق الأخضر (${greenPlayers.length})` : `Team Green Squad (${greenPlayers.length})`}</span>
            <span className="text-[10px] text-slate-400">
              {Object.keys(assignments).filter((k) => k.startsWith('g_')).length} / {formation.slots.green.length} {language === 'ar' ? 'مراكز محجوزة' : 'Roles Assigned'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {greenPlayers.map((player) => {
              const assignedSlotKey = Object.entries(assignments).find(
                ([_, uId]) => uId === player.userId
              )?.[0];
              const slotDef = formation.slots.green.find((s) => s.key === assignedSlotKey);

              return (
                <div
                  key={player.userId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#080B10] border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-[#0D503C] shrink-0" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#0D503C] text-[#F5D794] border border-[#E5B869]/30">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {language === 'ar' ? 'بدون مركز' : 'Unassigned'}
                    </span>
                  )}
                </div>
              );
            })}
            {greenPlayers.length === 0 && (
              <span className="text-xs text-slate-500 py-1">
                {language === 'ar' ? 'لا يوجد لاعبون مسجلون في الفريق الأخضر بعد.' : 'No players assigned to Team Green yet.'}
              </span>
            )}
          </div>
        </div>

        {/* Team Blue Lineup & Bench */}
        <div className="bg-[#141A26] p-4 rounded-2xl border border-[#E5B869]/30 shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-[#E5B869] mb-2.5">
            <span>{language === 'ar' ? `تشكيلة الفريق الذهبي/الأزرق (${bluePlayers.length})` : `Team Blue Squad (${bluePlayers.length})`}</span>
            <span className="text-[10px] text-slate-400">
              {Object.keys(assignments).filter((k) => k.startsWith('b_')).length} / {formation.slots.blue.length} {language === 'ar' ? 'مراكز محجوزة' : 'Roles Assigned'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bluePlayers.map((player) => {
              const assignedSlotKey = Object.entries(assignments).find(
                ([_, uId]) => uId === player.userId
              )?.[0];
              const slotDef = formation.slots.blue.find((s) => s.key === assignedSlotKey);

              return (
                <div
                  key={player.userId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#080B10] border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-[#E5B869] shrink-0" />
                  <span className="font-semibold">{player.name}</span>
                  {slotDef ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#241A0B] text-[#F5D794] border border-[#E5B869]/40">
                      {slotDef.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {language === 'ar' ? 'بدون مركز' : 'Unassigned'}
                    </span>
                  )}
                </div>
              );
            })}
            {bluePlayers.length === 0 && (
              <span className="text-xs text-slate-500 py-1">
                {language === 'ar' ? 'لا يوجد لاعبون مسجلون في الفريق الأزرق بعد.' : 'No players assigned to Team Blue yet.'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
