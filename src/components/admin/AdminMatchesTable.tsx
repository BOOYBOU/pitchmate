import React, { useState } from 'react';
import { SoccerMatch } from '../../types';
import { filterMatches } from '../../lib/adminUtils';
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
import { formatMAD, formatMoroccoDate } from '../../lib/moroccoUtils';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredMatches = filterMatches(matches, searchTerm, 'all');

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search matches, venues, or Moroccan cities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0E1526] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-bold">{filteredMatches.length}</span> of {matches.length} matches
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
              className="bg-[#0E1526] border border-[#1E293B] rounded-2xl overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
            >
              {/* Match Header Row */}
              <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {match.format || '7v7'}
                    </span>
                    <h3 className="font-bold text-white text-base truncate">{match.title}</h3>
                    {match.isLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                    {match.isRecurring && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        <Repeat className="w-3 h-3" /> Weekly
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatMoroccoDate(match.dateTime, 'day_month_time')}
                    </span>
                    <span>•</span>
                    <span>{match.location.venueName} ({match.location.city || 'Casablanca'})</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{formatMAD(match.pricePerPlayer, { showZeroAsFree: true })}</span>
                  </div>
                </div>

                {/* Match Stats & Actions */}
                <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2 bg-[#090D16] px-3 py-1.5 rounded-xl border border-[#1E293B] text-xs">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-white">{match.roster.length}</span>
                    <span className="text-slate-400">/ {match.maxPlayers}</span>
                  </div>

                  <button
                    onClick={() => onOpenMatchDetails(match)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="View Match Details & Scoreboard"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>

                  <button
                    onClick={() => onAutoBalanceTeams(match.id)}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Auto-Balance Teams (Snake Draft)"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Balance
                  </button>

                  <button
                    onClick={() => onToggleLock(match.id)}
                    className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      match.isLocked
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={match.isLocked ? 'Unlock Roster' : 'Lock Roster'}
                  >
                    {match.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    {isExpanded ? 'Hide' : 'Roster'}
                  </button>

                  {confirmDeleteId === match.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDeleteMatch(match.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-950 animate-pulse flex items-center gap-1"
                        title="Confirm Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm?</span>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(match.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                      title="Super Admin: Delete Match"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Player Roster */}
              {isExpanded && (
                <div className="bg-[#090D16] border-t border-[#1E293B] p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Green Team */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                        <span>Team Green ({greenPlayers.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {greenPlayers.map((player) => (
                          <div
                            key={player.userId}
                            className="flex items-center justify-between p-2 rounded-xl bg-[#0E1526] border border-[#1E293B] text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="font-semibold text-white truncate">{player.name}</span>
                              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                {player.position || 'MID'}
                              </span>
                            </div>
                            <button
                              onClick={() => onRemovePlayer(match.id, player.userId)}
                              className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                              title="Remove Player"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {greenPlayers.length === 0 && (
                          <div className="text-xs text-slate-500 py-2 italic">No players on Green yet</div>
                        )}
                      </div>
                    </div>

                    {/* Blue Team */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                        <span>Team Blue ({bluePlayers.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {bluePlayers.map((player) => (
                          <div
                            key={player.userId}
                            className="flex items-center justify-between p-2 rounded-xl bg-[#0E1526] border border-[#1E293B] text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="font-semibold text-white truncate">{player.name}</span>
                              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                {player.position || 'MID'}
                              </span>
                            </div>
                            <button
                              onClick={() => onRemovePlayer(match.id, player.userId)}
                              className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                              title="Remove Player"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {bluePlayers.length === 0 && (
                          <div className="text-xs text-slate-500 py-2 italic">No players on Blue yet</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Waitlist */}
                  {match.waitlist && match.waitlist.length > 0 && (
                    <div className="pt-2 border-t border-[#1E293B]">
                      <h4 className="text-xs font-bold text-amber-400 mb-2">Waitlist Queue ({match.waitlist.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {match.waitlist.map((waiter, idx) => (
                          <div
                            key={waiter.userId}
                            className="flex items-center gap-2 px-2.5 py-1 bg-[#0E1526] border border-[#1E293B] rounded-lg text-xs text-slate-300"
                          >
                            <span className="text-amber-400 font-bold">#{idx + 1}</span>
                            <span>{waiter.name}</span>
                            <button
                              onClick={() => onRemovePlayer(match.id, waiter.userId)}
                              className="text-slate-500 hover:text-rose-400"
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
