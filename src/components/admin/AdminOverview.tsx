import React from 'react';
import { SoccerMatch, UserProfile, AdminAnnouncement, SUPER_ADMIN_EMAIL } from '../../types';
import { Users, Trophy, Coins, ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../lib/useLanguage';

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
  onOpenMatchDetails,
  onNavigateTab,
}: AdminOverviewProps) {
  const { t, language, formatMAD, formatMoroccoDate, getCityName } = useLanguage();
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved' || !u.status);

  const totalPlayersInRosters = matches.reduce((acc, m) => acc + (m.roster?.length || 0), 0);
  const upcomingMatches = matches.filter((m) => m.status === 'upcoming');

  const totalRevenueCollected = matches.reduce((acc, m) => {
    const paidCount = m.paidPlayerIds?.length || 0;
    return acc + paidCount * (m.pricePerPlayer || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-5 shadow-md hover:border-[#E5B869]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70">
              {t('admin.totalUsers', 'إجمالي اللاعبين المسجلين')}
            </span>
            <div className="p-2 bg-[#0E4836] border border-[#E5B869]/30 rounded-xl text-[#F5D794]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-display">{approvedUsers.length}</span>
            <span className="text-xs text-emerald-300/70">{language === 'ar' ? 'لاعب نشط' : 'registered'}</span>
          </div>
          {pendingUsers.length > 0 && (
            <button
              onClick={() => onNavigateTab('users')}
              className="mt-3 text-xs text-[#F5D794] flex items-center gap-1 font-bold hover:underline cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{pendingUsers.length} {language === 'ar' ? 'طلبات قيد المراجعة' : 'pending review'}</span>
            </button>
          )}
        </div>

        <div className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-5 shadow-md hover:border-[#E5B869]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70">
              {language === 'ar' ? 'المباريات القادمة' : 'Morocco Matches'}
            </span>
            <div className="p-2 bg-[#0E4836] border border-[#E5B869]/30 rounded-xl text-[#F5D794]">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-display">{upcomingMatches.length}</span>
            <span className="text-xs text-emerald-300/70">{language === 'ar' ? 'مباراة مجدولة' : 'upcoming'}</span>
          </div>
          <div className="mt-3 text-xs text-emerald-200/80 flex items-center gap-1">
            <span>{totalPlayersInRosters} {language === 'ar' ? 'مقعد محجوز في التشكيلات' : 'active roster spots'}</span>
          </div>
        </div>

        <div className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-5 shadow-md hover:border-[#E5B869]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70">
              {language === 'ar' ? 'المبالغ المحصلة' : 'Collected Dues (MAD)'}
            </span>
            <div className="p-2 bg-[#0E4836] border border-[#E5B869]/30 rounded-xl text-[#E5B869]">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#F5D794] font-display">{formatMAD(totalRevenueCollected)}</span>
          </div>
          <div className="mt-3 text-xs text-emerald-300/70">
            {language === 'ar' ? 'تتبع مصاريف حجز الملاعب' : 'Pitch rental fee tracking'}
          </div>
        </div>

        <div className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-5 shadow-md hover:border-[#E5B869]/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/70">
              {language === 'ar' ? 'المشرف العام' : 'Super Admin'}
            </span>
            <div className="p-2 bg-[#081813] border border-[#E5B869]/30 rounded-xl text-[#E5B869]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-sm font-bold text-white truncate">مصطفى بوهبوس (Mustapha Bouhbous)</span>
          </div>
          <div className="mt-2 text-[11px] text-[#F5D794] truncate">{SUPER_ADMIN_EMAIL}</div>
        </div>
      </div>

      {/* Pending Approvals Card */}
      {pendingUsers.length > 0 && (
        <div className="bg-[#0E4836] border border-[#E5B869]/40 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#081813] text-[#F5D794] rounded-xl border border-[#E5B869]/30">
                <AlertCircle className="w-6 h-6 text-[#E5B869]" />
              </div>
              <div>
                <h4 className="font-semibold text-white">
                  {language === 'ar'
                    ? `${pendingUsers.length} طلبات انضمام لاعبين بانتظار الموافقة`
                    : `${pendingUsers.length} Player Registration${pendingUsers.length > 1 ? 's' : ''} Awaiting Approval`}
                </h4>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  {language === 'ar'
                    ? 'قم باعتماد اللاعبين لمنحهم الصلاحية الكاملة للانضمام للمباريات، والتصويت على رجل المباراة، ومراسلة الفريق.'
                    : 'Approve players to grant full access to join matches, vote for MVPs, and message teammates.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('users')}
              className="px-4 py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
            >
              <span>{language === 'ar' ? 'مراجعة الطلبات' : 'Review Queue'}</span>
              <ArrowUpRight className="w-4 h-4 rtl:rotate-[-90deg]" />
            </button>
          </div>
        </div>
      )}

      {/* Active Fixtures Overview */}
      <div className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-base font-display">
              {language === 'ar' ? 'المباريات والملاعب النشطة' : 'Live Fixtures & Moroccan Pitches'}
            </h3>
            <p className="text-xs text-emerald-300/70">
              {language === 'ar' ? 'إدارة سريعة لكافة المباريات المبرمجة' : 'Quick management of all upcoming games'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('matches')}
            className="text-xs text-[#F5D794] hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{language === 'ar' ? 'عرض جميع المباريات' : 'Manage All Matches'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-[-90deg]" />
          </button>
        </div>

        <div className="space-y-3">
          {matches.slice(0, 4).map((match) => (
            <div
              key={match.id}
              onClick={() => onOpenMatchDetails(match)}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#081813] hover:bg-[#0E4836] border border-[#E5B869]/25 rounded-xl transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40">
                    {match.format || '7v7'}
                  </span>
                  <h4 className="text-sm font-semibold text-white">{match.title}</h4>
                </div>
                <div className="text-xs text-emerald-300/70 flex items-center gap-2">
                  <span>{formatMoroccoDate(match.dateTime, 'short')}</span>
                  <span>•</span>
                  <span>{match.location.venueName} ({getCityName(match.location.city || 'Casablanca')})</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-xs text-emerald-200/80">
                  <span className="font-semibold text-white">{match.roster.length}</span>/{match.maxPlayers}{' '}
                  {language === 'ar' ? 'لاعبين' : 'players'}
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40">
                  {formatMAD(match.pricePerPlayer)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

