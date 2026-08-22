import React from 'react';
import { SoccerMatch, UserProfile, AdminAnnouncement, SUPER_ADMIN_EMAIL } from '../../types';
import { Users, Trophy, DollarSign, Clock, ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react';

interface AdminOverviewProps {
  matches: SoccerMatch[];
  users: UserProfile[];
  announcements: AdminAnnouncement[];
  onOpenMatchDetails: (match: SoccerMatch) => void;
  onNavigateTab: (tab: 'users' | 'matches' | 'announcements') => void;
}

export function AdminOverview({
  matches,
  users,
  announcements,
  onOpenMatchDetails,
  onNavigateTab,
}: AdminOverviewProps) {
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved' || !u.status);
  const bannedUsers = users.filter((u) => u.isBanned);

  const totalPlayersInRosters = matches.reduce((acc, m) => acc + (m.roster?.length || 0), 0);
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const totalRevenueCollected = matches.reduce((acc, m) => {
    const paidCount = m.paidPlayerIds?.length || 0;
    return acc + paidCount * (m.pricePerPlayer || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0E1526] border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Players</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-display">{approvedUsers.length}</span>
            <span className="text-xs text-slate-400">registered</span>
          </div>
          {pendingUsers.length > 0 && (
            <button
              onClick={() => onNavigateTab('users')}
              className="mt-3 text-xs text-amber-400 flex items-center gap-1 font-medium hover:underline"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingUsers.length} pending review
            </button>
          )}
        </div>

        <div className="bg-[#0E1526] border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Matches</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-display">{upcomingMatches.length}</span>
            <span className="text-xs text-slate-400">upcoming fixtures</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
            <span>{totalPlayersInRosters} active roster slots filled</span>
          </div>
        </div>

        <div className="bg-[#0E1526] border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Collected Dues</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400 font-display">${totalRevenueCollected}</span>
            <span className="text-xs text-slate-400">player shares</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Pitch rental fee balance tracking</div>
        </div>

        <div className="bg-[#0E1526] border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Super Admin</span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-sm font-bold text-white truncate">Mustapha Bouhbous</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate">{SUPER_ADMIN_EMAIL}</div>
        </div>
      </div>

      {/* Quick Pending Approvals Card */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-white">
                  {pendingUsers.length} Player Registration{pendingUsers.length > 1 ? 's' : ''} Awaiting Approval
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Approve players to grant full access to join matches, vote for MVPs, and message teammates.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('users')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              Review Queue
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Fixtures Overview */}
      <div className="bg-[#0E1526] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Live Fixtures & Pitch Schedule</h3>
            <p className="text-xs text-slate-400">Quick management of all upcoming games</p>
          </div>
          <button
            onClick={() => onNavigateTab('matches')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            Manage All Matches
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {matches.slice(0, 4).map((match) => (
            <div
              key={match.id}
              onClick={() => onOpenMatchDetails(match)}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {match.format || '7v7'}
                  </span>
                  <h4 className="text-sm font-semibold text-white">{match.title}</h4>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{new Date(match.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span>{match.location.venueName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">{match.roster.length}</span>/{match.maxPlayers} players
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                  {match.pricePerPlayer === 0 ? 'Free' : `$${match.pricePerPlayer}/ea`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
