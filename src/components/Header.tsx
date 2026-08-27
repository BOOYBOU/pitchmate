import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Calendar,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Camera,
  MessageSquare,
  Bell,
  Trophy,
  Globe,
  Check
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../types';
import { PitchMateLogo } from './PitchMateLogo';

interface HeaderProps {
  activeTab: 'matches' | 'leaderboard' | 'profile' | 'admin';
  setActiveTab: (tab: 'matches' | 'leaderboard' | 'profile' | 'admin') => void;
  onOpenCreateMatch: () => void;
  onOpenChangeAvatar?: () => void;
  onOpenDirectMessages?: () => void;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateMatch,
  onOpenChangeAvatar,
  onOpenDirectMessages,
  onOpenNotifications,
}) => {
  const {
    currentUser,
    users,
    setCurrentUserById,
    unreadMessagesCount,
    unreadNotificationsCount,
    logout
  } = usePitchStore();

  const { language, setLanguage, toggleLanguage, t, isRTL, getPositionName } = useLanguage();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isMustapha = isSuperAdminEmail(currentUser.email);

  return (
    <header className="sticky top-0 z-40 bg-[#040813]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div
            id="header-brand-logo"
            className="cursor-pointer transition-transform hover:scale-[1.02] shrink-0"
            onClick={() => setActiveTab('matches')}
          >
            <PitchMateLogo size="md" />
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#0A1020]/90 p-1.5 rounded-2xl border border-white/[0.08] shadow-inner">
            <button
              id="nav-tab-matches"
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{t('nav.matches')}</span>
            </button>

            <button
              id="nav-tab-leaderboard"
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'fill-slate-950 text-slate-950' : 'text-amber-400'}`} />
              <span>{t('nav.leaderboard')}</span>
            </button>

            <button
              id="nav-tab-profile"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{t('nav.profile')}</span>
            </button>

            {/* Admin Panel (Visible to Super Admin Mustapha) */}
            {isMustapha ? (
              <button
                id="nav-tab-admin"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.admin')}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
              </button>
            ) : (
              <button
                id="nav-tab-admin-locked"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-slate-700 text-slate-200'
                    : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/40'
                }`}
                title="Super Admin restricted to Mustapha"
              >
                <Shield className="w-4 h-4 text-slate-500" />
                <span>{t('nav.admin')}</span>
              </button>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Language Switcher Button */}
            <div className="relative">
              <button
                id="header-language-toggle-btn"
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] hover:border-emerald-500/40 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                title={t('nav.switchLanguage')}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-extrabold">{language === 'ar' ? 'العربية' : 'English'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangDropdownOpen && (
                <div
                  className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-36 bg-[#0E1526] border border-[#1E293B] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in space-y-1`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('ar');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      language === 'ar'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>العربية (المغرب)</span>
                    {language === 'ar' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      language === 'en'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>English</span>
                    {language === 'en' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell CTA */}
            {onOpenNotifications && (
              <button
                id="header-notifications-btn"
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2.5 rounded-2xl bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] hover:border-blue-500/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                title={t('nav.notifications')}
              >
                <Bell className="w-4 h-4 text-blue-400" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black animate-pulse shadow-sm shadow-blue-500">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Direct Messages CTA */}
            {onOpenDirectMessages && (
              <button
                id="header-direct-messages-btn"
                type="button"
                onClick={onOpenDirectMessages}
                className="relative p-2.5 rounded-2xl bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                title={t('nav.messages')}
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black animate-pulse">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            )}

            {/* Create Match CTA */}
            <button
              id="header-create-match-btn"
              type="button"
              onClick={onOpenCreateMatch}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('nav.createMatch')}</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                id="user-menu-btn"
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] hover:border-emerald-500/40 text-left transition-all cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
                    referrerPolicy="no-referrer"
                  />
                  {isMustapha && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#090D16]" />
                  )}
                </div>

                <div className="hidden lg:block text-start">
                  <span className="text-xs font-bold text-white block leading-tight">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    {isMustapha ? (
                      <strong className="text-emerald-400">{t('nav.superAdminBadge')}</strong>
                    ) : (
                      `#${currentUser.jerseyNumber || 10} • ${getPositionName(currentUser.preferredPosition || 'MID')}`
                    )}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div
                  id="user-dropdown-menu"
                  className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-64 bg-[#0E1526] border border-[#1E293B] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in space-y-3`}
                >
                  <div className="p-2 border-b border-[#1E293B] text-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                      {isMustapha && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 shrink-0">
                          {t('nav.superAdminBadge')}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">{currentUser.email}</span>
                  </div>

                  <div className="space-y-1 text-start">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('profile');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-[#131C31] transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-blue-400" />
                      <span>{t('profile.title')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        onOpenChangeAvatar?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-950/30 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>{t('nav.changeAvatar')}</span>
                    </button>

                    {isMustapha && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('admin');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span>{t('admin.title')}</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#1E293B]">
                    <button
                      id="header-logout-btn"
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-500/30 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>{t('nav.signOut')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#1E293B] space-y-2 animate-in fade-in">
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => {
                  setActiveTab('matches');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold text-center ${
                  activeTab === 'matches' ? 'bg-blue-600 text-white' : 'bg-[#0E1526] text-slate-300'
                }`}
              >
                {t('nav.matches')}
              </button>

              <button
                onClick={() => {
                  setActiveTab('leaderboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold text-center ${
                  activeTab === 'leaderboard' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-[#0E1526] text-amber-400'
                }`}
              >
                MOTM 🏆
              </button>

              <button
                onClick={() => {
                  setActiveTab('profile');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold text-center ${
                  activeTab === 'profile' ? 'bg-blue-600 text-white' : 'bg-[#0E1526] text-slate-300'
                }`}
              >
                {t('nav.profile')}
              </button>

              <button
                onClick={() => {
                  setActiveTab('admin');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold text-center ${
                  activeTab === 'admin'
                    ? isMustapha
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-white'
                    : 'bg-[#0E1526] text-slate-300'
                }`}
              >
                {t('nav.admin')} {isMustapha ? '' : '🔒'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onOpenChangeAvatar?.();
                  setIsMobileMenuOpen(false);
                }}
                className="py-2 bg-[#0E1526] border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{t('nav.changeAvatar')}</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="py-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>{t('nav.signOut')}</span>
              </button>
            </div>

            <button
              onClick={() => {
                onOpenCreateMatch();
                setIsMobileMenuOpen(false);
              }}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('createMatch.modalTitle')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


