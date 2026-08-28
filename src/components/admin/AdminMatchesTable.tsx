import React, { useState } from 'react';
import { SoccerMatch } from '../../types';
import { filterMatches } from '../../lib/adminUtils';
import { useLanguage } from '../../lib/useLanguage';
import {
  Search,
  Lock,
  Unlock,
  Trash2,
  Users,
  Eye,
  Calendar,
  Sparkles,
  Repeat,
} from 'lucide-react';

interface AdminMatchesTableProps {
  matches: SoccerMatch[];
  onOpenMatchDetails: (match: SoccerMatch) => void;
  onToggleLock: (matchId: string) => Promise<any> | any;
  onDeleteMatch: (matchId: string) => Promise<any> | any;
  onRemovePlayer: (matchId: string, userId: string) => Promise<any> | any;
  onAutoBalanceTeams: (matchId: string) => Promise<any> | any;
}

export function AdminMatchesTable({
  matches,
  onOpenMatchDetails,
  onToggleLock,
  onDeleteMatch,
  onRemovePlayer,
  onAutoBalanceTeams,
}: AdminMatchesTableProps) {
  const { t, language, formatMAD, formatMoroccoDate, getCityName, getPositionName } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredMatches = filterMatches(matches, searchTerm, 'all');

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'البحث بالمباريات، الملاعب، أو المدن المغربية...' : 'Search matches, venues, or Moroccan cities...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
          />
        </div>
        <div className="text-xs text-emerald-300/70">
          {language === 'ar' ? (
            <>
              عرض <span className="text-[#F5D794] font-bold">{filteredMatches.length}</span> من أصل {matches.length} مباراة
            </>
          ) : (
            <>
              Showing <span className="text-[#F5D794] font-bold">{filteredMatches.length}</span> of {matches.length} matches
            </>
          )}
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {filteredMatches.map((match) => {
          const isExpanded = expandedMatchId === match.id;
          const greenPlayers = match.roster.filter((p) => p.team === 'green');
          const bluePlayers = match.roster.filter((p) => p.team === 'blue');

          return (
            <div
              key={match.id}
              className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl overflow-hidden shadow-md hover:border-[#E5B869]/60 transition-colors"
            >
              {/* Match Header Row */}
              <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40">
                      {match.format || '7v7'}
                    </span>
                    <h3 className="font-bold text-white text-base truncate font-display">{match.title}</h3>
                    {match.isLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#081813] text-[#F5D794] border border-[#E5B869]/30">
                        <Lock className="w-3 h-3 text-[#E5B869]" /> {language === 'ar' ? 'مقفلة' : 'Locked'}
                      </span>
                    )}
                    {match.isRecurring && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#081813] text-[#F5D794] border border-[#E5B869]/30">
                        <Repeat className="w-3 h-3 text-[#E5B869]" /> {language === 'ar' ? 'أسبوعية' : 'Weekly'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-300/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#E5B869]" />
                      {formatMoroccoDate(match.dateTime, 'short')}
                    </span>
                    <span>•</span>
                    <span>{match.location.venueName} ({getCityName(match.location.city || 'Casablanca')})</span>
                    <span>•</span>
                    <span className="text-[#F5D794] font-bold">{formatMAD(match.pricePerPlayer)}</span>
                  </div>
                </div>

                {/* Match Stats & Actions */}
                <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2 bg-[#081813] px-3 py-1.5 rounded-xl border border-[#E5B869]/25 text-xs">
                    <Users className="w-3.5 h-3.5 text-[#E5B869]" />
                    <span className="font-bold text-white">{match.roster.length}</span>
                    <span className="text-emerald-300/60">/ {match.maxPlayers}</span>
                  </div>

                  <button
                    onClick={() => onOpenMatchDetails(match)}
                    className="p-2 bg-[#081813] hover:bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={language === 'ar' ? 'عرض تفاصيل المباراة ولوحة النتائج' : 'View Match Details & Scoreboard'}
                  >
                    <Eye className="w-4 h-4 text-[#E5B869]" />
                    <span>{language === 'ar' ? 'عرض' : 'View'}</span>
                  </button>

                  <button
                    onClick={() => onAutoBalanceTeams(match.id)}
                    className="p-2 bg-[#0E4836] hover:bg-[#0D503C] text-[#F5D794] border border-[#E5B869]/40 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title={language === 'ar' ? 'موازنة الفرق تلقائياً وفق المهارات' : 'Auto-Balance Teams (Snake Draft)'}
                  >
                    <Sparkles className="w-4 h-4 text-[#E5B869]" />
                    <span>{language === 'ar' ? 'موازنة' : 'Balance'}</span>
                  </button>

                  <button
                    onClick={() => onToggleLock(match.id)}
                    className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      match.isLocked
                        ? 'bg-[#081813] text-[#F5D794] border-[#E5B869]/40 hover:bg-[#0E4836]'
                        : 'bg-[#081813] text-emerald-300/70 border-[#E5B869]/20 hover:text-white'
                    }`}
                    title={match.isLocked ? (language === 'ar' ? 'فتح التشكيلة للتسجيل' : 'Unlock Roster') : (language === 'ar' ? 'إقفال التشكيلة' : 'Lock Roster')}
                  >
                    {match.isLocked ? <Lock className="w-4 h-4 text-[#E5B869]" /> : <Unlock className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                    className="px-3 py-2 bg-[#081813] hover:bg-[#0E4836] text-xs font-semibold text-emerald-200 border border-[#E5B869]/25 rounded-xl transition-colors cursor-pointer"
                  >
                    {isExpanded ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'التشكيلة' : 'Roster')}
                  </button>

                  {confirmDeleteId === match.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDeleteMatch(match.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-950 animate-pulse flex items-center gap-1"
                        title={language === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirm Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'تأكيد؟' : 'Confirm?'}</span>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 bg-[#081813] hover:bg-[#0E4836] text-emerald-300/70 hover:text-white rounded-xl text-xs border border-[#E5B869]/25 cursor-pointer"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(match.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                      title={language === 'ar' ? 'حذف المباراة' : 'Super Admin: Delete Match'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Player Roster */}
              {isExpanded && (
                <div className="bg-[#081813] border-t border-[#E5B869]/25 p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Green Team */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#F5D794]">
                        <span>{language === 'ar' ? 'الفريق الأخضر' : 'Team Green'} ({greenPlayers.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {greenPlayers.map((player) => (
                          <div
                            key={player.userId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#0A3A2A] border border-[#E5B869]/25 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-[#E5B869] shrink-0" />
                              <span className="font-semibold text-white truncate">{player.name}</span>
                              <span className="text-[10px] text-[#F5D794] px-1.5 py-0.5 rounded bg-[#081813] border border-[#E5B869]/30 shrink-0">
                                {getPositionName(player.position || 'MID')}
                              </span>
                            </div>
                            <button
                              onClick={() => onRemovePlayer(match.id, player.userId)}
                              className="text-emerald-400/60 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                              title={language === 'ar' ? 'إزالة اللاعب' : 'Remove Player'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {greenPlayers.length === 0 && (
                          <div className="text-xs text-emerald-300/50 py-2 italic">
                            {language === 'ar' ? 'لا يوجد لاعبون في الفريق الأخضر حتى الآن' : 'No players on Green yet'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blue/Gold Team */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#F5D794]">
                        <span>{language === 'ar' ? 'الفريق الذهبي' : 'Team Gold'} ({bluePlayers.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {bluePlayers.map((player) => (
                          <div
                            key={player.userId}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#0A3A2A] border border-[#E5B869]/25 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-[#E5B869] shrink-0" />
                              <span className="font-semibold text-white truncate">{player.name}</span>
                              <span className="text-[10px] text-[#F5D794] px-1.5 py-0.5 rounded bg-[#081813] border border-[#E5B869]/30 shrink-0">
                                {getPositionName(player.position || 'MID')}
                              </span>
                            </div>
                            <button
                              onClick={() => onRemovePlayer(match.id, player.userId)}
                              className="text-emerald-400/60 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                              title={language === 'ar' ? 'إزالة اللاعب' : 'Remove Player'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {bluePlayers.length === 0 && (
                          <div className="text-xs text-emerald-300/50 py-2 italic">
                            {language === 'ar' ? 'لا يوجد لاعبون في الفريق الذهبي حتى الآن' : 'No players on Gold yet'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Waitlist */}
                  {match.waitlist && match.waitlist.length > 0 && (
                    <div className="pt-3 border-t border-[#E5B869]/20">
                      <h4 className="text-xs font-bold text-[#F5D794] mb-2">
                        {language === 'ar' ? 'قائمة الانتظار' : 'Waitlist Queue'} ({match.waitlist.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {match.waitlist.map((waiter, idx) => (
                          <div
                            key={waiter.userId}
                            className="flex items-center gap-2 px-2.5 py-1 bg-[#0A3A2A] border border-[#E5B869]/25 rounded-xl text-xs text-emerald-100"
                          >
                            <span className="text-[#F5D794] font-bold">#{idx + 1}</span>
                            <span>{waiter.name}</span>
                            <button
                              onClick={() => onRemovePlayer(match.id, waiter.userId)}
                              className="text-emerald-400/60 hover:text-rose-400 transition-colors"
                              title={language === 'ar' ? 'إزالة من الانتظار' : 'Remove'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

