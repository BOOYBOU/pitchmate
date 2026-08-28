import React, { useState } from 'react';
import {
  Trophy,
  Star,
  Award,
  Flame,
  CheckCircle2,
  Users,
  Sparkles,
  Crown,
  Vote,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SoccerMatch, PlayerRosterItem } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { SoundEffects } from '../lib/audioService';

interface MotmPostMatchVotingProps {
  match: SoccerMatch;
}

export const MotmPostMatchVoting: React.FC<MotmPostMatchVotingProps> = ({ match }) => {
  const { currentUser, voteMatchMvp } = usePitchStore();
  const { t, language, isRTL } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract votes and winner
  const votes = match.motmVotes || match.mvpVotes || {};
  const myVote = votes[currentUser.id];

  // Tally votes
  const tally: Record<string, number> = {};
  Object.values(votes).forEach((nomineeId) => {
    tally[nomineeId] = (tally[nomineeId] || 0) + 1;
  });

  const totalVotesCount = Object.keys(votes).length;

  // Determine leading nominee
  let topNomineeId = match.motmWinnerId || match.mvpWinnerId || '';
  let maxVotes = 0;
  Object.entries(tally).forEach(([nomineeId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      topNomineeId = nomineeId;
    }
  });

  const topNomineePlayer = match.roster.find((p) => p.userId === topNomineeId);

  // Handle vote action
  const handleCastVote = async (nomineeId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await voteMatchMvp(match.id, nomineeId);
      SoundEffects.playJoin();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err) {
      console.error('Failed to cast vote:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract goalscorers in this match for performance context
  const goalsPerPlayer: Record<string, number> = {};
  if (match.goals) {
    match.goals.forEach((g) => {
      if (g.scorerId) {
        goalsPerPlayer[g.scorerId] = (goalsPerPlayer[g.scorerId] || 0) + 1;
      }
    });
  }

  return (
    <div id="motm-post-match-voting" className="space-y-6 animate-in fade-in duration-200">
      {/* MOTM Leader / Winner Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#241A0B] via-[#141A26] to-[#080B10] border-2 border-[#E5B869]/80 p-5 md:p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-[#E5B869]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {topNomineePlayer ? (
                <img
                  src={
                    topNomineePlayer.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${topNomineePlayer.userId}`
                  }
                  alt={topNomineePlayer.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E5B869] shadow-xl shadow-amber-950/40"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#E5B869]/20 border-2 border-[#E5B869]/50 flex items-center justify-center text-[#E5B869]">
                  <Trophy className="w-8 h-8" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-lg bg-[#E5B869] text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                👑
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E5B869]/20 text-[#F5D794] text-[10px] font-black uppercase tracking-wider border border-[#E5B869]/30">
                <Star className="w-3 h-3 fill-[#F5D794]" />
                <span>{language === 'ar' ? 'نجم ورجل المباراة (MOTM)' : 'Man of the Match (MOTM)'}</span>
              </div>
              <h3 className="text-lg md:text-xl font-black text-white mt-1">
                {topNomineePlayer ? topNomineePlayer.name : (language === 'ar' ? 'التصويت جارٍ الآن...' : 'Voting in Progress...')}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {topNomineePlayer
                  ? (language === 'ar'
                      ? `حصل على ${maxVotes} ${maxVotes === 1 ? 'صوت' : 'أصوات'} من اللاعبين والجمهور`
                      : `${maxVotes} ${maxVotes === 1 ? 'vote' : 'votes'} received from players and supporters`)
                  : (language === 'ar'
                      ? 'صوّت للاعب الأكثر تميزاً وتأثيراً في أرضية الملعب!'
                      : 'Cast your vote for the standout player of this fixture!')}
              </p>
            </div>
          </div>

          <div className="bg-[#080B10] rounded-2xl px-4 py-3 border border-[#E5B869]/20 flex items-center gap-4 self-start sm:self-auto">
            <div className="text-center">
              <div className="text-lg font-black text-[#F5D794]">{totalVotesCount}</div>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                {language === 'ar' ? 'إجمالي الأصوات' : 'Total Votes'}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <div className="text-lg font-black text-[#E5B869]">{match.roster.length}</div>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                {language === 'ar' ? 'المرشحون' : 'Nominees'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Instruction Card */}
      <div className="bg-[#141A26] border border-[#E5B869]/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E5B869]/15 border border-[#E5B869]/30 flex items-center justify-center text-[#E5B869] shrink-0">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              {language === 'ar' ? 'من هو اللاعب الذي صنع الفارق في المباراة؟' : 'Who made the biggest impact on the pitch?'}
            </div>
            <div className="text-[11px] text-slate-400">
              {myVote
                ? (language === 'ar'
                    ? `لقد صوتت لصالح ${match.roster.find((p) => p.userId === myVote)?.name || 'لاعب'}. يمكنك تغيير اختيارك في أي وقت.`
                    : `You voted for ${match.roster.find((p) => p.userId === myVote)?.name || 'a player'}. You can change your pick anytime.`)
                : (language === 'ar'
                    ? 'اضغط على زر "صوّت لرجل المباراة" بجانب مرشحك المفضل أدناه.'
                    : 'Click "Vote MOTM" next to your chosen nominee below.')}
            </div>
          </div>
        </div>

        {myVote && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0D503C]/40 text-[#F5D794] text-xs font-black rounded-xl border border-[#E5B869]/40 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#E5B869]" />
            <span>{language === 'ar' ? 'تم تسجيل صوتك' : 'Vote Recorded'}</span>
          </span>
        )}
      </div>

      {/* Nominees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {match.roster.map((player) => {
          const voteCount = tally[player.userId] || 0;
          const percentage =
            totalVotesCount > 0 ? Math.round((voteCount / totalVotesCount) * 100) : 0;
          const isVotedByMe = myVote === player.userId;
          const isCurrentLeader = topNomineeId === player.userId && maxVotes > 0;
          const goalsScored = goalsPerPlayer[player.userId] || 0;

          return (
            <div
              key={player.userId}
              className={`rounded-2xl p-4 transition-all border ${
                isCurrentLeader
                  ? 'bg-gradient-to-r from-[#141A26] to-[#1F293D] border-[#E5B869]/80 shadow-lg shadow-amber-950/20 ring-1 ring-[#E5B869]/40'
                  : isVotedByMe
                  ? 'bg-gradient-to-r from-[#0D503C]/30 to-[#141A26] border-[#E5B869]/60'
                  : 'bg-[#141A26] border-[#E5B869]/15 hover:border-[#E5B869]/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={
                        player.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${player.userId}`
                      }
                      alt={player.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md"
                    />
                    {isCurrentLeader && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#E5B869] text-slate-950 rounded-full flex items-center justify-center text-[10px] shadow">
                        👑
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{player.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          player.team === 'green'
                            ? 'bg-[#0D503C]/40 text-[#F5D794] border border-[#E5B869]/30'
                            : 'bg-[#241A0B] text-[#F5D794] border border-[#E5B869]/30'
                        }`}
                      >
                        {player.team === 'green' ? (language === 'ar' ? 'الأخضر' : 'Green') : (language === 'ar' ? 'الذهبي' : 'Gold')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{player.position || (language === 'ar' ? 'لاعب' : 'Player')}</span>
                      {goalsScored > 0 && (
                        <span className="text-rose-400 font-bold flex items-center gap-0.5">
                          <Flame className="w-3 h-3 fill-rose-400" />
                          {goalsScored} {language === 'ar' ? (goalsScored === 1 ? 'هدف' : 'أهداف') : (goalsScored === 1 ? 'Goal' : 'Goals')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vote Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCastVote(player.userId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isVotedByMe
                      ? 'bg-[#E5B869] text-slate-950 shadow-md shadow-amber-950/30 ring-1 ring-[#F5D794]'
                      : 'bg-[#080B10] hover:bg-[#E5B869] hover:text-slate-950 text-slate-200 border border-[#E5B869]/20'
                  }`}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      isVotedByMe ? 'fill-slate-950 text-slate-950' : 'text-[#E5B869]'
                    }`}
                  />
                  <span>{isVotedByMe ? (language === 'ar' ? 'صوتي المسجل ✓' : 'My Pick ✓') : (language === 'ar' ? 'صوّت لرجل المباراة' : 'Vote MOTM')}</span>
                </button>
              </div>

              {/* Progress Bar & Votes Count */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">
                    {voteCount} {language === 'ar' ? (voteCount === 1 ? 'صوت' : 'أصوات') : (voteCount === 1 ? 'Vote' : 'Votes')}
                  </span>
                  <span className="font-bold text-[#F5D794]">{percentage}%</span>
                </div>
                <div className="w-full h-2 bg-[#080B10] rounded-full overflow-hidden border border-[#E5B869]/20">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCurrentLeader
                        ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238]'
                        : isVotedByMe
                        ? 'bg-[#E5B869]'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {match.roster.length === 0 && (
        <div className="bg-[#141A26] border border-[#E5B869]/20 rounded-2xl p-8 text-center text-slate-400">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-slate-300">
            {language === 'ar' ? 'لا يوجد لاعبون في تشكيلة هذه المباراة حتى الآن' : 'No players in this match roster yet'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar' ? 'اللاعبون الذين ينضمون إلى هذه المباراة سيظهرون هنا للتصويت.' : 'Players who join this match will be listed here for MOTM voting.'}
          </p>
        </div>
      )}
    </div>
  );
};
