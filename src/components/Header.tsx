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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo - Scaled down on mobile to preserve ample space */}
          <div
            id="header-brand-logo"
            className="cursor-pointer transition-transform hover:scale-[1.02] shrink-0"
            onClick={() => setActiveTab('matches')}
          >
            <div className="sm:hidden">
              <PitchMateLogo size="sm" withSubtitle={false} />
            </div>
            <div className="hidden sm:block">
              <PitchMateLogo size="md" />
            </div>
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

            {/* Admin Panel (Visible EXCLUSIVELY to Super Admin Mustapha) */}
            {isMustapha && (
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
            )}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Switcher Button */}
            <div className="relative shrink-0">
              <button
                id="header-language-toggle-btn"
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-xs font-bold text-slate-200 transition-all cursor-pointer shrink-0"
                title={t('nav.switchLanguage')}
              >
                <Globe className="w-3.5 h-3.5 text-[#E5B869] shrink-0" />
                <span className="font-extrabold text-[11px] sm:text-xs">{language === 'ar' ? 'العربية' : 'English'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {isLangDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 sm:hidden"
                    onClick={() => setIsLangDropdownOpen(false)}
                    aria-hidden="true"
                  />
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
                </>
              )}
            </div>

            {/* Notification Bell CTA */}
            {onOpenNotifications && (
              <button
                id="header-notifications-btn"
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 sm:p-2.5 rounded-2xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                title={t('nav.notifications')}
              >
                <Bell className="w-4 h-4 text-[#E5B869] shrink-0" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 text-[9px] font-black animate-pulse shadow-sm shadow-amber-500/50">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Direct Messages CTA (Hidden on mobile as it is in MobileBottomNav) */}
            {onOpenDirectMessages && (
              <button
                id="header-direct-messages-btn"
                type="button"
                onClick={onOpenDirectMessages}
                className="hidden sm:flex relative p-2.5 rounded-2xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
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
            <div className="relative shrink-0">
              <button
                id="user-menu-btn"
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-3 sm:py-1.5 rounded-2xl bg-[#0B211A] hover:bg-[#0E2C22] border border-[#E5B869]/30 hover:border-[#E5B869]/70 text-left transition-all cursor-pointer shrink-0"
                aria-label="User profile menu"
              >
                <div className="relative shrink-0 w-8 h-8 min-w-[32px] min-h-[32px]">
                  <img
                    src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.name}
                    className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full object-cover border border-[#E5B869] shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  {isMustapha && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#E5B869] border-2 border-[#0A3A2A] shrink-0" />
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

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
              </button>

              {/* User Dropdown / Mobile Sheet */}
              {isUserDropdownOpen && (
                <>
                  {/* Backdrop on mobile */}
                  <div
                    className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm sm:hidden animate-in fade-in"
                    onClick={() => setIsUserDropdownOpen(false)}
                    aria-hidden="true"
                  />

                  <div
                    id="user-dropdown-menu"
                    className={`fixed sm:absolute inset-x-3.5 top-20 sm:top-full sm:inset-x-auto ${
                      isRTL ? 'sm:left-0' : 'sm:right-0'
                    } mt-2 sm:w-72 bg-[#081813] border-2 border-[#E5B869] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-4 sm:p-3.5 z-50 animate-in fade-in zoom-in-95 space-y-3.5`}
                  >
                    {/* User info card with close button */}
                    <div className="p-2.5 bg-[#0B211A] border border-[#E5B869]/30 rounded-2xl flex items-center justify-between gap-2.5 text-start">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={currentUser.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#E5B869] shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">{currentUser.name}</span>
                            {isMustapha && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#0A3A2A] text-[#F5D794] border border-[#E5B869] shrink-0">
                                {t('nav.superAdminBadge')}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-emerald-300/70 block truncate">{currentUser.email}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="sm:hidden p-1.5 text-slate-400 hover:text-white rounded-xl bg-[#081813] border border-[#E5B869]/30 shrink-0 cursor-pointer"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-start">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('profile');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-[#F5D794] bg-[#0A2B20]/60 hover:bg-[#0E2C22] border border-transparent hover:border-[#E5B869]/30 transition-all cursor-pointer"
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
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#F5D794] bg-[#0A2B20]/60 hover:bg-[#0A3A2A] border border-transparent hover:border-[#E5B869]/30 transition-all cursor-pointer"
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
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#F5D794] bg-[#0E4836]/70 hover:bg-[#0A3A2A] border border-[#E5B869]/40 hover:border-[#E5B869] transition-all cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-[#E5B869]" />
                          <span>{t('admin.title')}</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#E5B869]/20">
                      <button
                        id="header-logout-btn"
                        type="button"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-rose-950/70 text-rose-200 hover:bg-rose-900/80 border border-rose-500/40 transition-all cursor-pointer shadow-md shadow-rose-950/40"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>{t('nav.signOut')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 text-slate-300 hover:text-white rounded-xl bg-[#0B211A] border border-[#E5B869]/20 hover:bg-slate-800 shrink-0 cursor-pointer"
              aria-label="Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-[#E5B869]" /> : <Menu className="w-5 h-5 text-[#E5B869]" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#E5B869]/20 space-y-2 animate-in fade-in">
            <div className={`grid ${isMustapha ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5`}>
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

              {isMustapha && (
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold text-center ${
                    activeTab === 'admin'
                      ? 'bg-[#0A3A2A] text-[#F5D794] font-black border border-[#E5B869]'
                      : 'bg-[#0B211A] text-[#F5D794] border border-[#E5B869]/20'
                  }`}
                >
                  {t('nav.admin')}
                </button>
              )}
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


