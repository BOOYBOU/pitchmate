import React, { useState } from 'react';
import { Search, Plus, Calendar, Flame, Sparkles, Info, X, Trophy, Activity } from 'lucide-react';
import { SoccerMatch } from '../types';
import { MatchCard } from './MatchCard';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';

interface MatchListProps {
  onOpenCreate: () => void;
  onOpenDetails: (match: SoccerMatch) => void;
}

export const MatchList: React.FC<MatchListProps> = ({ onOpenCreate, onOpenDetails }) => {
  const { matches, currentUser, announcements, deleteAnnouncement } = usePitchStore();
  const { t, isRTL, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyMatches, setOnlyMyMatches] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | '5v5' | '7v7' | '11v11'>('all');

  const now = new Date();

  // Filter matches
  const filteredMatches = matches.filter((match) => {
    // Format filter
    if (formatFilter !== 'all') {
      if (match.format !== formatFilter) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = match.title.toLowerCase();
      const venue = match.location.venueName.toLowerCase();
      const address = match.location.address.toLowerCase();
      const city = (match.location.city || '').toLowerCase();
      if (!matchTitle.includes(q) && !venue.includes(q) && !address.includes(q) && !city.includes(q)) {
        return false;
      }
    }

    // My Matches filter
    if (onlyMyMatches) {
      const inRoster = match.roster.some((p) => p.userId === currentUser.id);
      const inWaitlist = match.waitlist.some((p) => p.userId === currentUser.id);
      if (!inRoster && !inWaitlist) return false;
    }

    // Date filter
    if (dateFilter === 'today') {
      const isToday = new Date(match.dateTime).toDateString() === now.toDateString();
      if (!isToday) return false;
    }

    return true;
  });

  const myJoinedCount = matches.filter(
    (m) => m.roster.some((p) => p.userId === currentUser.id) || m.waitlist.some((p) => p.userId === currentUser.id)
  ).length;

  return (
    <div id="matches-feed-container" className="space-y-6">
      {/* Admin Announcements Banner if any */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="flex items-start justify-between gap-3 p-3.5 bg-[#0A3A2A] border border-[#E5B869] rounded-2xl text-xs text-[#F5D794] shadow-lg shadow-emerald-950/40"
            >
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#E5B869] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#F5D794] block">{ann.title}</span>
                  <p className="text-slate-200 mt-0.5">{ann.message}</p>
                </div>
              </div>
              <button
                onClick={() => deleteAnnouncement(ann.id)}
                className="text-slate-300 hover:text-white p-1 cursor-pointer"
                title={t('common.close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hero Stats & Quick Create Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A2B20] via-[#0E3D2E] to-[#071610] border border-[#E5B869]/35 hover:border-[#E5B869]/60 transition-all duration-300 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
        {/* Subtle Ambient Radial Lighting & Pitch Grid */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#E5B869]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#0A3A2A]/40 rounded-full blur-3xl pointer-events-none" />
        <div className="pitch-lines absolute inset-0 opacity-25 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5 max-w-2xl">
            {/* Sleek Moroccan Gold Icon Badge */}
            <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0A3A2A] border border-[#E5B869] text-[#F5D794] shadow-[0_0_20px_rgba(229,184,105,0.25)] shrink-0 transition-all duration-300 hover:scale-105 hover:border-[#E5B869] hover:shadow-[0_0_30px_rgba(229,184,105,0.4)]">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-[#E5B869] drop-shadow-[0_0_8px_rgba(229,184,105,0.5)]" />
            </div>
            
            {/* Modern Gradient Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight leading-tight bg-gradient-to-r from-white via-[#F5D794] to-[#E5B869] bg-clip-text text-transparent">
              {language === 'ar' ? 'اعثر على مباراتك وانزل للملعب الآن' : 'Find Your Match & Hit The Pitch'}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="hero-create-match-btn"
              onClick={onOpenCreate}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-slate-950 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 shadow-lg shadow-amber-950/40 hover:shadow-amber-900/60 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('matches.createMatch')}</span>
            </button>
          </div>
        </div>

        {/* Quick Numbers Bar */}
        <div className="relative z-10 grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-[#E5B869]/25 text-center sm:text-start">
          <div>
            <div className="text-xl sm:text-2xl font-black font-display text-[#F5D794]">{matches.length}</div>
            <div className="text-xs text-slate-300">{t('admin.totalMatches')}</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-display text-[#E5B869]">
              {matches.reduce((acc, m) => acc + m.roster.length, 0)}
            </div>
            <div className="text-xs text-slate-300">{t('stats.activePlayers')}</div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-display text-white">{myJoinedCount}</div>
            <div className="text-xs text-slate-300">{t('matches.myMatches')}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3 broadcast-card rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className={`absolute ${isRTL ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-[#E5B869]`} />
            <input
              id="matches-search-input"
              type="text"
              placeholder={t('matches.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-[#081813] border border-[#E5B869]/25 focus:border-[#E5B869] rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner`}
            />
          </div>

          {/* Quick toggle filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => {
                setDateFilter('all');
                setOnlyMyMatches(false);
                setFormatFilter('all');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                !onlyMyMatches && dateFilter === 'all' && formatFilter === 'all'
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md shadow-amber-950'
                  : 'bg-[#081813] border border-[#E5B869]/20 text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              {t('matches.allMatches')}
            </button>

            {/* Format quick filters */}
            {(['5v5', '7v7', '11v11'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(formatFilter === fmt ? 'all' : fmt)}
                className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  formatFilter === fmt
                    ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] font-black shadow-md'
                    : 'bg-[#081813] border border-[#E5B869]/20 text-slate-400 hover:text-white hover:bg-[#0A2B20]'
                }`}
              >
                {fmt}
              </button>
            ))}

            <button
              id="filter-my-matches-btn"
              type="button"
              onClick={() => setOnlyMyMatches(!onlyMyMatches)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                onlyMyMatches
                  ? 'bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 font-black shadow-md shadow-amber-950'
                  : 'bg-[#081813] border border-[#E5B869]/20 text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#E5B869] fill-[#E5B869]" />
              <span>{t('matches.myMatches')} ({myJoinedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md'
                  : 'bg-[#081813] border border-[#E5B869]/20 text-slate-300 hover:text-white hover:bg-[#0A2B20]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>{t('matches.today')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Match Cards Grid */}
      {filteredMatches.length === 0 ? (
        <div className="p-12 text-center broadcast-card rounded-2xl space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#E5B869]/10 border border-[#E5B869]/30 text-[#E5B869] flex items-center justify-center mx-auto shadow-lg shadow-black">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white font-display">{t('matches.noMatchesFound')}</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {t('matches.noMatchesDesc')}
            </p>
          </div>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 shadow-lg shadow-amber-950 transition-all cursor-pointer hover:scale-105"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('matches.createMatch')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} onOpenDetails={onOpenDetails} />
          ))}
        </div>
      )}
    </div>
  );
};

