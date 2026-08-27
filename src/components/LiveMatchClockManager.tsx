import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Flame,
  ArrowRightLeft,
  AlertCircle,
  Shield,
  Activity,
  Trophy,
  CheckCircle2,
} from 'lucide-react';
import { SoccerMatch, TeamSide, MatchSubstitution, MatchCardEvent } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';

interface LiveMatchClockManagerProps {
  match: SoccerMatch;
}

export const LiveMatchClockManager: React.FC<LiveMatchClockManagerProps> = ({ match }) => {
  const {
    currentUser,
    updateMatchScore,
    recordMatchGoal,
    recordMatchSubstitution,
    recordMatchCard,
  } = usePitchStore();

  const { t, language, isRTL } = useLanguage();

  // Match Timer State
  const durationTotalSeconds = (match.durationMinutes || 90) * 60;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Goal Form State
  const [goalTeam, setGoalTeam] = useState<TeamSide>('green');
  const [goalScorerId, setGoalScorerId] = useState('');
  const [goalAssistId, setGoalAssistId] = useState('');

  // Substitution Form State
  const [subTeam, setSubTeam] = useState<TeamSide>('green');
  const [subOutPlayerId, setSubOutPlayerId] = useState('');
  const [subInPlayerId, setSubInPlayerId] = useState('');

  // Card Form State
  const [cardTeam, setCardTeam] = useState<TeamSide>('green');
  const [cardPlayerId, setCardPlayerId] = useState('');
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');
  const [cardReason, setCardReason] = useState(language === 'ar' ? 'خطأ تكتيكي / تدخل قوي' : 'Tactical foul / Reckless challenge');

  const currentMatchMinute = Math.max(1, Math.min(match.durationMinutes, Math.floor(elapsedSeconds / 60) + 1));

  // Format Elapsed Time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const greenRoster = match.roster.filter((p) => p.team === 'green');
  const blueRoster = match.roster.filter((p) => p.team === 'blue');

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateRoster = goalTeam === 'green' ? greenRoster : blueRoster;
    const scorer = candidateRoster.find((p) => p.userId === goalScorerId);
    if (!scorer) return;

    const assist = candidateRoster.find((p) => p.userId === goalAssistId);

    await recordMatchGoal(
      match.id,
      goalTeam,
      scorer.userId,
      scorer.name,
      currentMatchMinute,
      assist?.userId,
      assist?.name
    );

    setGoalScorerId('');
    setGoalAssistId('');
  };

  const handleAddSubstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateRoster = subTeam === 'green' ? greenRoster : blueRoster;
    const playerOut = candidateRoster.find((p) => p.userId === subOutPlayerId);
    const playerIn = candidateRoster.find((p) => p.userId === subInPlayerId);

    if (!playerOut || !playerIn || playerOut.userId === playerIn.userId) return;

    await recordMatchSubstitution(
      match.id,
      subTeam,
      playerOut.userId,
      playerOut.name,
      playerIn.userId,
      playerIn.name,
      currentMatchMinute
    );

    setSubOutPlayerId('');
    setSubInPlayerId('');
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidateRoster = cardTeam === 'green' ? greenRoster : blueRoster;
    const player = candidateRoster.find((p) => p.userId === cardPlayerId);
    if (!player) return;

    await recordMatchCard(
      match.id,
      cardTeam,
      player.userId,
      player.name,
      cardType,
      cardReason,
      currentMatchMinute
    );

    setCardPlayerId('');
  };

  const scoreGreen = match.score?.green ?? 0;
  const scoreBlue = match.score?.blue ?? 0;

  return (
    <div className="space-y-6">
      {/* Live Match Clock & Score Center Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] border border-[#1E293B] shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isRunning
                ? (language === 'ar' ? 'المباراة جارية الآن' : 'Match In Progress')
                : (language === 'ar' ? 'ساعة المباراة متوقفة مؤقتاً' : 'Match Clock Paused')}
            </span>
          </div>

          {/* Big Digital Clock Display */}
          <div className="flex items-center gap-3">
            <div className="px-5 py-2 rounded-2xl bg-black/60 border border-slate-700 text-center font-mono">
              <span className="text-2xl sm:text-3xl font-black tracking-widest text-emerald-400">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {language === 'ar' ? `الدقيقة ${currentMatchMinute}' / ${match.durationMinutes}'` : `Min ${currentMatchMinute}' / ${match.durationMinutes}'`}
              </span>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                }`}
                title={isRunning ? (language === 'ar' ? 'إيقاف مؤقت' : 'Pause Clock') : (language === 'ar' ? 'بدء التوقيت' : 'Start Clock')}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-slate-950" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setElapsedSeconds(0);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={language === 'ar' ? 'إعادة ضبط الساعة إلى 00:00' : 'Reset Clock to 00:00'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setElapsedSeconds((prev) => prev + 300)}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                title={language === 'ar' ? 'إضافة 5 دقائق وقت إضافي' : 'Add +5 Minutes Extra Time'}
              >
                +5m
              </button>
            </div>
          </div>
        </div>

        {/* Big Live Scoreboard */}
        <div className="grid grid-cols-3 items-center p-5 rounded-2xl bg-black/40 border border-[#1E293B]">
          {/* Green Team */}
          <div className="text-center space-y-1">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
              🟢 {t('matches.greenTeam')}
            </div>
            <div className="text-4xl sm:text-5xl font-black text-white font-mono">{scoreGreen}</div>
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => updateMatchScore(match.id, Math.max(0, scoreGreen - 1), scoreBlue)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                -
              </button>
              <button
                onClick={() => updateMatchScore(match.id, scoreGreen + 1, scoreBlue)}
                className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-center text-slate-500 font-bold text-sm uppercase tracking-widest">
            {language === 'ar' ? 'ضد' : 'VS'}
          </div>

          {/* Blue Team */}
          <div className="text-center space-y-1">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-black">
              🔵 {t('matches.blueTeam')}
            </div>
            <div className="text-4xl sm:text-5xl font-black text-white font-mono">{scoreBlue}</div>
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => updateMatchScore(match.id, scoreGreen, Math.max(0, scoreBlue - 1))}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                -
              </button>
              <button
                onClick={() => updateMatchScore(match.id, scoreGreen, scoreBlue + 1)}
                className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Log Goal */}
        <form onSubmit={handleAddGoal} className="p-4 rounded-2xl bg-[#090D16] border border-[#1E293B] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{language === 'ar' ? 'تسجيل هدف في المباراة' : 'Log Match Goal'}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setGoalTeam('green')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                goalTeam === 'green' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              🟢 {t('matches.greenTeam')}
            </button>
            <button
              type="button"
              onClick={() => setGoalTeam('blue')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                goalTeam === 'blue' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              🔵 {t('matches.blueTeam')}
            </button>
          </div>

          <select
            value={goalScorerId}
            onChange={(e) => setGoalScorerId(e.target.value)}
            required
            className="w-full px-2.5 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">{language === 'ar' ? 'اختر مسجل الهدف *' : 'Select Scorer *'}</option>
            {(goalTeam === 'green' ? greenRoster : blueRoster).map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name} ({p.position || 'MID'})
              </option>
            ))}
          </select>

          <select
            value={goalAssistId}
            onChange={(e) => setGoalAssistId(e.target.value)}
            className="w-full px-2.5 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">{language === 'ar' ? 'اختر صانع الهدف (اختياري)' : 'Select Assist (Optional)'}</option>
            {(goalTeam === 'green' ? greenRoster : blueRoster).map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name} ({language === 'ar' ? 'تمريرة حاسمة' : 'Assist'})
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!goalScorerId}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            {language === 'ar' ? `تسجيل الهدف (الدقيقة ${currentMatchMinute}')` : `Record Goal (${currentMatchMinute}')`}
          </button>
        </form>

        {/* 2. Substitution Manager */}
        <form onSubmit={handleAddSubstitution} className="p-4 rounded-2xl bg-[#090D16] border border-[#1E293B] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>{language === 'ar' ? 'إجراء تبديل تكتيكي' : 'Tactical Substitution'}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setSubTeam('green')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTeam === 'green' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              🟢 {language === 'ar' ? 'الأخضر' : 'Green'}
            </button>
            <button
              type="button"
              onClick={() => setSubTeam('blue')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTeam === 'blue' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              🔵 {language === 'ar' ? 'الأزرق' : 'Blue'}
            </button>
          </div>

          <select
            value={subOutPlayerId}
            onChange={(e) => setSubOutPlayerId(e.target.value)}
            required
            className="w-full px-2.5 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-rose-300 focus:outline-none focus:border-rose-500"
          >
            <option value="">{language === 'ar' ? '🔴 اللاعب المغادر (خارج) *' : '🔴 Player Coming OFF *'}</option>
            {(subTeam === 'green' ? greenRoster : blueRoster).map((p) => (
              <option key={p.userId} value={p.userId}>
                {language === 'ar' ? `خروج: ${p.name}` : `OUT: ${p.name}`}
              </option>
            ))}
          </select>

          <select
            value={subInPlayerId}
            onChange={(e) => setSubInPlayerId(e.target.value)}
            required
            className="w-full px-2.5 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">{language === 'ar' ? '🟢 اللاعب البديل (داخل) *' : '🟢 Player Coming ON *'}</option>
            {(subTeam === 'green' ? greenRoster : blueRoster).map((p) => (
              <option key={p.userId} value={p.userId}>
                {language === 'ar' ? `دخول: ${p.name}` : `IN: ${p.name}`}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!subOutPlayerId || !subInPlayerId}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {language === 'ar' ? `تنفيذ التبديل (الدقيقة ${currentMatchMinute}')` : `Execute Sub (${currentMatchMinute}')`}
          </button>
        </form>

        {/* 3. Cards & Discipline */}
        <form onSubmit={handleAddCard} className="p-4 rounded-2xl bg-[#090D16] border border-[#1E293B] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>{language === 'ar' ? 'البطاقات والإنذارات الانضباطية' : 'Disciplinary Cards'}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setCardType('yellow')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                cardType === 'yellow' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              🟨 {language === 'ar' ? 'بطاقة صفراء' : 'Yellow Card'}
            </button>
            <button
              type="button"
              onClick={() => setCardType('red')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                cardType === 'red' ? 'bg-rose-600 text-white font-black' : 'bg-slate-800 text-slate-400'
              }`}
            >
              🟥 {language === 'ar' ? 'بطاقة حمراء' : 'Red Card'}
            </button>
          </div>

          <select
            value={cardPlayerId}
            onChange={(e) => setCardPlayerId(e.target.value)}
            required
            className="w-full px-2.5 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">{language === 'ar' ? 'اختر اللاعب المستحق للبطاقة *' : 'Select Player *'}</option>
            {match.roster.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name} ({p.team === 'green' ? (language === 'ar' ? 'الأخضر' : 'Green') : (language === 'ar' ? 'الأزرق' : 'Blue')})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={language === 'ar' ? 'السبب (مثال: خطأ تكتيكي، اعتراض على التحكيم)' : 'Reason (e.g. Tactical Foul)'}
            value={cardReason}
            onChange={(e) => setCardReason(e.target.value)}
            className="w-full px-2.5 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          />

          <button
            type="submit"
            disabled={!cardPlayerId}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {language === 'ar' ? `إشهار البطاقة (الدقيقة ${currentMatchMinute}')` : `Issue Card (${currentMatchMinute}')`}
          </button>
        </form>
      </div>

      {/* Live Match Timeline Feed */}
      <div className="p-5 rounded-2xl bg-[#090D16] border border-[#1E293B] space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          {language === 'ar'
            ? `سجل أحداث المباراة المباشرة (${match.goals?.length || 0} أهداف، ${match.substitutions?.length || 0} تبديلات، ${match.cardEvents?.length || 0} بطاقات)`
            : `Live Match Event Log (${match.goals?.length || 0} goals, ${match.substitutions?.length || 0} subs, ${match.cardEvents?.length || 0} cards)`}
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(!match.goals?.length && !match.substitutions?.length && !match.cardEvents?.length) && (
            <p className="text-xs text-slate-500 italic py-2 text-center">
              {language === 'ar' ? 'لم يتم تسجيل أي أحداث حتى الآن. انطلق في المباراة!' : 'No match events logged yet. Kick off the match!'}
            </p>
          )}

          {/* Goals */}
          {match.goals?.map((g, i) => (
            <div key={`g_${i}`} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-400">{g.minute ?? 45}'</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">{language === 'ar' ? 'هدف!' : 'GOAL!'} {g.scorerName}</span>
                {g.assistName && <span className="text-slate-400">({language === 'ar' ? 'صناعة:' : 'Assist:'} {g.assistName})</span>}
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${g.team === 'green' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                {g.team === 'green' ? (language === 'ar' ? 'الأخضر' : 'Green') : (language === 'ar' ? 'الأزرق' : 'Blue')}
              </span>
            </div>
          ))}

          {/* Substitutions */}
          {match.substitutions?.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-400">{s.minute}'</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">
                  <strong className="text-emerald-400">{language === 'ar' ? 'دخول:' : 'IN:'}</strong> {s.playerInName} ↔ <strong className="text-rose-400">{language === 'ar' ? 'خروج:' : 'OUT:'}</strong> {s.playerOutName}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">{s.team === 'green' ? (language === 'ar' ? 'الأخضر' : 'Green') : (language === 'ar' ? 'الأزرق' : 'Blue')}</span>
            </div>
          ))}

          {/* Cards */}
          {match.cardEvents?.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-400">{c.minute}'</span>
                <span>{c.type === 'yellow' ? '🟨' : '🟥'}</span>
                <span className="font-bold text-white">{c.playerName}</span>
                {c.reason && <span className="text-slate-400">({c.reason})</span>}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                {c.type === 'yellow' ? (language === 'ar' ? 'صفراء' : 'yellow') : (language === 'ar' ? 'حمراء' : 'red')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
