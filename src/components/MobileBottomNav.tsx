import React from 'react';
import {
  Calendar,
  Trophy,
  Plus,
  MessageSquare,
  User,
  Shield,
  Building2,
  Film,
} from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';
import { usePitchStore } from '../lib/usePitchStore';
import { isSuperAdminEmail } from '../types';

interface MobileBottomNavProps {
  activeTab: 'matches' | 'venues' | 'reels' | 'leaderboard' | 'profile' | 'admin';
  setActiveTab: (tab: 'matches' | 'venues' | 'reels' | 'leaderboard' | 'profile' | 'admin') => void;
  onOpenCreateMatch: () => void;
  onOpenDirectMessages: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateMatch,
  onOpenDirectMessages,
}) => {
  const { t, language } = useLanguage();
  const { currentUser, directMessages } = usePitchStore();

  const isMustapha = isSuperAdminEmail(currentUser?.email);

  const unreadMessagesCount = directMessages.filter(
    (m) => m.receiverId === currentUser?.id && !m.read
  ).length;

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#081813]/95 backdrop-blur-xl border-t border-[#E5B869]/25 px-2 py-1 shadow-2xl shadow-black transition-all"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Matches Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('matches')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[56px] ${
            activeTab === 'matches'
              ? 'text-[#F5D794]'
              : 'text-emerald-300/60 hover:text-emerald-100'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'matches'
                ? 'bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] shadow-sm shadow-amber-950'
                : ''
            }`}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">
            {language === 'ar' ? 'المباريات' : 'Matches'}
          </span>
        </button>

        {/* Reels Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('reels')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[52px] ${
            activeTab === 'reels'
              ? 'text-[#F5D794]'
              : 'text-emerald-300/60 hover:text-emerald-100'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'reels'
                ? 'bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] shadow-sm shadow-amber-950'
                : ''
            }`}
          >
            <Film className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">
            {language === 'ar' ? 'أهداف وريلز' : 'Reels'}
          </span>
        </button>

        {/* Quick Add Match Floating Button */}
        <button
          type="button"
          onClick={onOpenCreateMatch}
          className="flex flex-col items-center justify-center -mt-4 cursor-pointer group"
          title={t('createMatch.title')}
          aria-label={t('createMatch.title')}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#C69238] via-[#E5B869] to-[#F5D794] text-slate-950 flex items-center justify-center shadow-lg shadow-amber-950/70 border border-[#F5D794] group-active:scale-95 transition-transform">
            <Plus className="w-6 h-6 stroke-[2.8]" />
          </div>
          <span className="text-[10px] font-extrabold text-[#F5D794] mt-1 whitespace-nowrap">
            {language === 'ar' ? 'تنظيم' : 'Create'}
          </span>
        </button>

        {/* Venues Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('venues')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[52px] ${
            activeTab === 'venues'
              ? 'text-[#F5D794]'
              : 'text-emerald-300/60 hover:text-emerald-100'
          }`}
        >
          <div
            className={`p-1 rounded-xl transition-all ${
              activeTab === 'venues'
                ? 'bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] shadow-sm shadow-amber-950'
                : ''
            }`}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">
            {language === 'ar' ? 'الملاعب' : 'Venues'}
          </span>
        </button>

        {/* Profile or Admin Tab */}
        {isMustapha ? (
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'admin' ? 'profile' : 'admin')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[56px] ${
              activeTab === 'admin' || activeTab === 'profile'
                ? 'text-[#F5D794]'
                : 'text-emerald-300/60 hover:text-emerald-100'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeTab === 'admin' || activeTab === 'profile'
                  ? 'bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] shadow-sm shadow-amber-950'
                  : ''
              }`}
            >
              {activeTab === 'admin' ? (
                <Shield className="w-5 h-5 text-[#E5B869]" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">
              {activeTab === 'admin'
                ? (language === 'ar' ? 'الإدارة' : 'Admin')
                : (language === 'ar' ? 'حسابي' : 'Profile')}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[56px] ${
              activeTab === 'profile'
                ? 'text-[#F5D794]'
                : 'text-emerald-300/60 hover:text-emerald-100'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeTab === 'profile'
                  ? 'bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] shadow-sm shadow-amber-950'
                  : ''
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">
              {language === 'ar' ? 'حسابي' : 'Profile'}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
