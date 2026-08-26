import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Flame,
  Star,
  Target,
  ShieldCheck,
  Search,
  MessageSquare,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { UserProfile, PlayerPosition } from '../types';
import { getReputationTier } from '../lib/reliabilityEngine';

interface LeaderboardViewProps {
  onOpenDirectMessage?: (userId: string) => void;
}

type LeaderboardCategory = 'motm' | 'scorers' | 'fairplay';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onOpenDirectMessage }) => {
  const { users, currentUser, matches } = usePitchStore();

  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('motm');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamically extract unique cities from active users
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    users.forEach((u) => {
      const city = u.preferredCity || u.city;
      if (city && city.trim().length > 0) {
        citySet.add(city.trim());
      }
    });
    return Array.from(citySet).sort();
  }, [users]);

  // Aggregate user statistics with match events (goals, motm wins)
  const enrichedUsers = useMemo(() => {
    // Tally match-level stats
    const userGoalsMap: Record<string, number> = {};
    const userMotmMap: Record<string, number> = {};

    matches.forEach((m) => {
      // Tally goals
      if (m.goals) {
        m.goals.forEach((g) => {
          if (g.scorerId) {
            userGoalsMap[g.scorerId] = (userGoalsMap[g.scorerId] || 0) + 1;
          }
        });
      }
      // Tally MOTM wins
      const motmWinner = m.motmWinnerId || m.mvpWinnerId;
      if (motmWinner) {
        userMotmMap[motmWinner] = (userMotmMap[motmWinner] || 0) + 1;
      }
    });

    return users.map((u) => {
      const totalGoals = Math.max(u.goalsCount || 0, userGoalsMap[u.id] || 0);
      const totalMotm = Math.max(u.mvpCount || 0, userMotmMap[u.id] || 0);
      const reliability = u.reliabilityScore ?? 95;
      const matchesPlayed = u.matchesPlayed ?? (u.matchesAttended || 0);

      return {
        ...u,
        totalGoals,
        totalMotm,
        reliability,
        matchesPlayed,
      };
    });
  }, [users, matches]);

  // Filter and sort users based on active category and filters
  const filteredAndSortedUsers = useMemo(() => {
    return enrichedUsers
      .filter((u) => {
        // Exclude banned users
        if (u.isBanned) return false;

        // City filter
        if (selectedCity !== 'all') {
          const userCity = (u.preferredCity || u.city || '').toLowerCase();
          if (!userCity.includes(selectedCity.toLowerCase())) return false;
        }

        // Position filter
        if (selectedPosition !== 'all') {
          if (u.preferredPosition !== selectedPosition) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const nameMatch = u.name.toLowerCase().includes(query);
          const cityMatch = (u.preferredCity || u.city || '').toLowerCase().includes(query);
          const emailMatch = u.email.toLowerCase().includes(query);
          if (!nameMatch && !cityMatch && !emailMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (activeCategory === 'motm') {
          // Sort by MOTM count desc, then reliability desc, then matches desc
          if ((b.totalMotm || 0) !== (a.totalMotm || 0)) {
            return (b.totalMotm || 0) - (a.totalMotm || 0);
          }
          return (b.reliability || 0) - (a.reliability || 0);
        } else if (activeCategory === 'scorers') {
          // Sort by total goals desc, then matches played
          if ((b.totalGoals || 0) !== (a.totalGoals || 0)) {
            return (b.totalGoals || 0) - (a.totalGoals || 0);
          }
          return (b.matchesPlayed || 0) - (a.matchesPlayed || 0);
        } else {
          // Fair Play / Reliability
          if ((b.reliability || 0) !== (a.reliability || 0)) {
            return (b.reliability || 0) - (a.reliability || 0);
          }
          return (b.matchesPlayed || 0) - (a.matchesPlayed || 0);
        }
      });
  }, [enrichedUsers, selectedCity, selectedPosition, searchQuery, activeCategory]);

  const topThree = filteredAndSortedUsers.slice(0, 3);
  const remainingUsers = filteredAndSortedUsers.slice(3);

  // Position badge helper
  const renderPositionBadge = (pos?: PlayerPosition) => {
    switch (pos) {
      case 'GK':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">GK</span>;
      case 'DEF':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">DEF</span>;
      case 'MID':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">MID</span>;
      case 'FWD':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">FWD</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-800 text-slate-400">FLEX</span>;
    }
  };

  return (
    <div id="leaderboard-view" className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A0F1D] border border-amber-500/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>Hall of Fame & Player Rankings</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Leaderboard & MOTM Stars</span>
              <span className="text-xs md:text-sm font-bold px-2.5 py-1 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/40">
                Morocco 🇲🇦
              </span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-1.5 max-w-2xl">
              Track top performers, Man of the Match awards, league top scorers, and the most reliable teammates across all pitches.
            </p>
          </div>

          {/* Quick Stat Highlights */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800">
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-lg md:text-xl font-black text-amber-400">{enrichedUsers.length}</div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Players</div>
            </div>
            <div className="text-center px-3 border-r border-slate-800">
              <div className="text-lg md:text-xl font-black text-emerald-400">{matches.length}</div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Matches</div>
            </div>
            <div className="text-center px-3">
              <div className="text-lg md:text-xl font-black text-rose-400">
                {enrichedUsers.reduce((acc, u) => acc + (u.totalGoals || 0), 0)}
              </div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Goals Scored</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tab Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-2 bg-[#0E1526] p-1.5 rounded-2xl border border-slate-800/80">
          <button
            id="tab-motm-stars"
            type="button"
            onClick={() => setActiveCategory('motm')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeCategory === 'motm'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Star className={`w-4 h-4 ${activeCategory === 'motm' ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
            <span>MOTM / MVP Stars</span>
          </button>

          <button
            id="tab-top-scorers"
            type="button"
            onClick={() => setActiveCategory('scorers')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeCategory === 'scorers'
                ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white shadow-lg shadow-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Flame className={`w-4 h-4 ${activeCategory === 'scorers' ? 'fill-white text-white' : 'text-rose-400'}`} />
            <span>Top Scorers</span>
          </button>

          <button
            id="tab-fair-play"
            type="button"
            onClick={() => setActiveCategory('fairplay')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeCategory === 'fairplay'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeCategory === 'fairplay' ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span>Fair Play & Reliability</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0E1526] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* City Filter */}
          {availableCities.length > 0 && (
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-[#0E1526] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Cities 🇲🇦</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Position Filter */}
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            className="bg-[#0E1526] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Positions</option>
            <option value="GK">Goalkeeper (GK)</option>
            <option value="DEF">Defender (DEF)</option>
            <option value="MID">Midfielder (MID)</option>
            <option value="FWD">Forward (FWD)</option>
          </select>
        </div>
      </div>

      {/* Podium for Top 3 Players */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place (Silver) */}
          {topThree[1] && (
            <div className="md:order-1 bg-gradient-to-b from-slate-800/50 to-[#0E1526] border-2 border-slate-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-300/20 border border-slate-300/40 flex items-center justify-center font-black text-slate-200 text-sm">
                🥈 2
              </div>

              <div className="flex items-center gap-3 mb-4">
                <img
                  src={topThree[1].avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[1].id}`}
                  alt={topThree[1].name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-400/50 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-white text-base">{topThree[1].name}</span>
                    {renderPositionBadge(topThree[1].preferredPosition)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {topThree[1].preferredCity || topThree[1].city || 'Morocco'} • #{topThree[1].jerseyNumber || '10'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {activeCategory === 'motm' ? 'MOTM Awards' : activeCategory === 'scorers' ? 'Goals Scored' : 'Reliability'}
                  </div>
                  <div className="text-xl font-black text-slate-200">
                    {activeCategory === 'motm'
                      ? `${topThree[1].totalMotm} ⭐`
                      : activeCategory === 'scorers'
                      ? `${topThree[1].totalGoals} ⚽`
                      : `${topThree[1].reliability}% 🛡️`}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{topThree[1].matchesPlayed} Matches</div>
                  <div className="text-emerald-400 font-bold">{topThree[1].reliability}% Attended</div>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {topThree[0] && (
            <div className="md:order-2 bg-gradient-to-b from-amber-950/40 via-[#0F172A] to-[#0A0F1D] border-2 border-amber-400/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between -mt-2 md:-mt-4">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-amber-500 text-slate-950 text-xs font-black px-4 py-1.5 rounded-bl-2xl shadow-lg flex items-center gap-1">
                <CrownIcon className="w-3.5 h-3.5 fill-slate-950" />
                <span>LEADER #1</span>
              </div>

              <div className="flex items-center gap-4 mb-4 mt-2">
                <div className="relative">
                  <img
                    src={topThree[0].avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[0].id}`}
                    alt={topThree[0].name}
                    referrerPolicy="no-referrer"
                    className="w-18 h-18 rounded-2xl object-cover border-2 border-amber-400 shadow-xl shadow-amber-500/20"
                  />
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                    👑
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-white text-lg md:text-xl">{topThree[0].name}</span>
                    {renderPositionBadge(topThree[0].preferredPosition)}
                  </div>
                  <div className="text-xs text-amber-300/80 font-medium">
                    {topThree[0].preferredCity || topThree[0].city || 'Morocco'} • Jersey #{topThree[0].jerseyNumber || '10'}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      🏆 Hall of Fame
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 rounded-2xl p-4 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-amber-400">
                    {activeCategory === 'motm' ? 'Total MOTM Wins' : activeCategory === 'scorers' ? 'Golden Boot Goals' : 'Reliability Score'}
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-amber-300">
                    {activeCategory === 'motm'
                      ? `${topThree[0].totalMotm} Awards ⭐`
                      : activeCategory === 'scorers'
                      ? `${topThree[0].totalGoals} Goals ⚽`
                      : `${topThree[0].reliability}% Rating 🛡️`}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div className="font-bold">{topThree[0].matchesPlayed} Matches Played</div>
                  <div className="text-emerald-400 font-bold">{topThree[0].reliability}% Reliability</div>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {topThree[2] && (
            <div className="md:order-3 bg-gradient-to-b from-amber-950/20 to-[#0E1526] border-2 border-amber-700/40 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-amber-700/20 border border-amber-700/40 flex items-center justify-center font-black text-amber-300 text-sm">
                🥉 3
              </div>

              <div className="flex items-center gap-3 mb-4">
                <img
                  src={topThree[2].avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[2].id}`}
                  alt={topThree[2].name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-700/50 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-white text-base">{topThree[2].name}</span>
                    {renderPositionBadge(topThree[2].preferredPosition)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {topThree[2].preferredCity || topThree[2].city || 'Morocco'} • #{topThree[2].jerseyNumber || '10'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {activeCategory === 'motm' ? 'MOTM Awards' : activeCategory === 'scorers' ? 'Goals Scored' : 'Reliability'}
                  </div>
                  <div className="text-xl font-black text-amber-200">
                    {activeCategory === 'motm'
                      ? `${topThree[2].totalMotm} ⭐`
                      : activeCategory === 'scorers'
                      ? `${topThree[2].totalGoals} ⚽`
                      : `${topThree[2].reliability}% 🛡️`}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{topThree[2].matchesPlayed} Matches</div>
                  <div className="text-emerald-400 font-bold">{topThree[2].reliability}% Attended</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Standings Table */}
      <div className="bg-[#0E1526] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="font-black text-white text-sm md:text-base">
              Full Standings ({filteredAndSortedUsers.length} Players)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Updated in real-time with match outcomes
          </span>
        </div>

        {filteredAndSortedUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-slate-300">No players match the selected filters</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting the city or position filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">Position</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4 text-center">Matches</th>
                  <th className="py-3.5 px-4 text-center">
                    {activeCategory === 'motm' ? 'MOTM Wins ⭐' : activeCategory === 'scorers' ? 'Goals ⚽' : 'Reliability 🛡️'}
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredAndSortedUsers.map((user, idx) => {
                  const rank = idx + 1;
                  const isCurrent = user.id === currentUser.id;
                  const tier = getReputationTier(user.reliability || 95);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-black">
                        {rank === 1 ? (
                          <span className="inline-flex w-7 h-7 rounded-xl bg-amber-400 text-slate-950 items-center justify-center shadow-md">
                            🥇
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex w-7 h-7 rounded-xl bg-slate-300 text-slate-950 items-center justify-center shadow-md">
                            🥈
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex w-7 h-7 rounded-xl bg-amber-700 text-white items-center justify-center shadow-md">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-400">#{rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Jersey #{user.jerseyNumber || '10'} • {tier.label}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderPositionBadge(user.preferredPosition)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {user.preferredCity || user.city || 'Morocco'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-300">
                        {user.matchesPlayed}
                      </td>

                      <td className="py-3.5 px-4 text-center font-black">
                        {activeCategory === 'motm' ? (
                          <span className="text-amber-400 text-sm font-black flex items-center justify-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            {user.totalMotm || 0}
                          </span>
                        ) : activeCategory === 'scorers' ? (
                          <span className="text-rose-400 text-sm font-black flex items-center justify-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-rose-400" />
                            {user.totalGoals || 0}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-sm font-black">
                            {user.reliability}%
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {user.id !== currentUser.id && onOpenDirectMessage && (
                          <button
                            type="button"
                            onClick={() => onOpenDirectMessage(user.id)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
                            title={`Chat with ${user.name}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                            <span>Message</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  );
}
