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
    <header className="sticky top-0 z-40 bg-[#080B10]/95 backdrop-blur-xl border-b border-[#E5B869]/20 shadow-2xl">
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
          <nav className="hidden md:flex items-center gap-1.5 bg-[#091F18]/90 p-1.5 rounded-2xl border border-[#E5B869]/30 shadow-inner">
            <button
              id="nav-tab-matches"
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-lg shadow-amber-950/50 font-black'
                  : 'text-slate-300 hover:text-[#F5D794] hover:bg-[#0D382B]/40'
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
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-lg shadow-amber-950/50 font-black'
                  : 'text-slate-300 hover:text-[#F5D794] hover:bg-[#0D382B]/40'
              }`}
            >
              <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'fill-slate-950 text-slate-950' : 'text-[#E5B869]'}`} />
              <span>{t('nav.leaderboard')}</span>
            </button>

            <button
              id="nav-tab-profile"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 shadow-lg shadow-amber-950/50 font-black'
                  : 'text-slate-300 hover:text-[#F5D794] hover:bg-[#0D382B]/40'
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
                    ? 'bg-[#0A3A2A] text-[#F5D794] font-black border border-[#E5B869] shadow-lg shadow-emerald-950/60'
                    : 'bg-[#0D382B]/60 text-[#F5D794] hover:bg-[#0A3A2A] border border-[#E5B869]/30'
                }`}
              >
                <Shield className="w-4 h-4 text-[#E5B869]" />
                <span>{t('nav.admin')}</span>
                <span className="w-2 h-2 rounded-full bg-[#E5B869] shadow-sm shadow-amber-400 animate-pulse" />
              </button>
            ) : (
              <button
                id="nav-tab-admin-locked"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#0D241C] text-slate-200 border border-slate-700'
                    : 'text-slate-500 hover:text-slate-400 hover:bg-[#0D241C]/40'
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                title={t('nav.switchLanguage')}
              >
                <Globe className="w-3.5 h-3.5 text-[#E5B869]" />
                <span className="font-extrabold">{language === 'ar' ? 'العربية' : 'English'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangDropdownOpen && (
                <div
                  className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-36 bg-[#081813] border border-[#E5B869]/40 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in space-y-1`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('ar');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      language === 'ar'
                        ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]'
                        : 'text-slate-300 hover:bg-[#0E2C22]'
                    }`}
                  >
                    <span>العربية (المغرب)</span>
                    {language === 'ar' && <Check className="w-3.5 h-3.5 text-[#E5B869]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      language === 'en'
                        ? 'bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]'
                        : 'text-slate-300 hover:bg-[#0E2C22]'
                    }`}
                  >
                    <span>English</span>
                    {language === 'en' && <Check className="w-3.5 h-3.5 text-[#E5B869]" />}
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
                className="relative p-2.5 rounded-2xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-slate-300 hover:text-white transition-all cursor-pointer"
                title={t('nav.notifications')}
              >
                <Bell className="w-4 h-4 text-[#E5B869]" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 text-[9px] font-black animate-pulse shadow-sm shadow-amber-500/50">
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
                className="relative p-2.5 rounded-2xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-slate-300 hover:text-white transition-all cursor-pointer"
                title={t('nav.messages')}
              >
                <MessageSquare className="w-4 h-4 text-[#E5B869]" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 text-[9px] font-black animate-pulse shadow-sm shadow-amber-500/50">
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
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 shadow-lg shadow-amber-950/50 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('nav.createMatch')}</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                id="user-menu-btn"
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-left transition-all cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#E5B869]"
                    referrerPolicy="no-referrer"
                  />
                  {isMustapha && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E5B869] border-2 border-[#0A3A2A]" />
                  )}
                </div>

                <div className="hidden lg:block text-start">
                  <span className="text-xs font-bold text-white block leading-tight">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1">
                    {isMustapha ? (
                      <span className="px-1.5 py-0.2 rounded bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869]/60 font-black">
                        {t('nav.superAdminBadge')}
                      </span>
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
                  className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-64 bg-[#081813] border border-[#E5B869]/40 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in space-y-3`}
                >
                  <div className="p-2 border-b border-[#E5B869]/20 text-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                      {isMustapha && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] shrink-0">
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-[#F5D794] hover:bg-[#0E2C22] transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#E5B869]" />
                      <span>{t('profile.title')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        onOpenChangeAvatar?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#F5D794] hover:bg-[#0A3A2A] transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#E5B869]" />
                      <span>{t('nav.changeAvatar')}</span>
                    </button>

                    {isMustapha && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('admin');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#F5D794] hover:bg-[#0A3A2A] transition-colors cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-[#E5B869]" />
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
          <div className="md:hidden py-3 border-t border-[#E5B869]/20 space-y-2 animate-in fade-in">
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => {
                  setActiveTab('matches');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold text-center ${
                  activeTab === 'matches'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md'
                    : 'bg-[#0B211A] text-slate-300 border border-[#E5B869]/20'
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
                  activeTab === 'leaderboard'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md'
                    : 'bg-[#0B211A] text-[#F5D794] border border-[#E5B869]/20'
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
                  activeTab === 'profile'
                    ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-md'
                    : 'bg-[#0B211A] text-slate-300 border border-[#E5B869]/20'
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
                      ? 'bg-[#0A3A2A] text-[#F5D794] font-black border border-[#E5B869]'
                      : 'bg-slate-700 text-white'
                    : 'bg-[#0B211A] text-[#F5D794] border border-[#E5B869]/20'
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
                className="py-2 bg-[#0B211A] border border-[#E5B869]/30 text-[#F5D794] rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Camera className="w-3.5 h-3.5 text-[#E5B869]" />
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
              className="w-full py-2.5 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/50"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('createMatch.modalTitle')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


