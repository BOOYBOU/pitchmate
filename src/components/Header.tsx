import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Calendar,
  User,
  Users,
  Database,
  Menu,
  X,
  ChevronDown,
  RefreshCw,
  LogOut,
  Camera,
  LogIn,
  UserPlus,
  MessageSquare,
  Bell
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { SUPER_ADMIN_EMAIL } from '../types';
import { PitchMateLogo } from './PitchMateLogo';

interface HeaderProps {
  activeTab: 'matches' | 'profile' | 'admin';
  setActiveTab: (tab: 'matches' | 'profile' | 'admin') => void;
  onOpenCreateMatch: () => void;
  onOpenChangeAvatar?: () => void;
  onOpenSignIn?: () => void;
  onOpenSignUp?: () => void;
  onOpenDirectMessages?: () => void;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateMatch,
  onOpenChangeAvatar,
  onOpenSignIn,
  onOpenSignUp,
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
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isMustapha = currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();


  return (
    <header className="sticky top-0 z-40 bg-[#090D16]/95 backdrop-blur-md border-b border-[#1E293B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div
            id="header-brand-logo"
            className="cursor-pointer transition-transform hover:scale-[1.01]"
            onClick={() => setActiveTab('matches')}
          >
            <PitchMateLogo size="md" />
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0E1526] p-1.5 rounded-2xl border border-[#1E293B]">
            <button
              id="nav-tab-matches"
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Matches
            </button>

            <button
              id="nav-tab-profile"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </button>

            {/* Admin Panel (Visible to Super Admin Mustapha) */}
            {isMustapha ? (
              <button
                id="nav-tab-admin"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                Admin Panel
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
              </button>
            ) : (
              <button
                id="nav-tab-admin-locked"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-slate-700 text-slate-300'
                    : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/40'
                }`}
                title="Super Admin restricted to Mustapha (bouhbousmustapha@gmail.com)"
              >
                <Shield className="w-4 h-4 text-slate-500" />
                Admin
              </button>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell CTA */}
            {onOpenNotifications && (
              <button
                id="header-notifications-btn"
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2.5 rounded-2xl bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] hover:border-blue-500/40 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="In-App Notifications & Alerts"
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
                title="Direct Messages & Teammate Chat"
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
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Organize Match
            </button>

            {/* Quick Auth Buttons (if on Landing page or wanting to sign in) */}
            <button
              id="header-signin-btn"
              type="button"
              onClick={onOpenSignIn}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] transition-colors cursor-pointer"
              title="Sign in with email"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              Sign In
            </button>

            {/* User Profile Switcher Dropdown */}
            <div className="relative">
              <button
                id="user-menu-btn"
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] text-left transition-colors cursor-pointer"
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

                <div className="hidden lg:block">
                  <span className="text-xs font-bold text-white block leading-tight">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    {isMustapha ? (
                      <strong className="text-emerald-400">Super Admin</strong>
                    ) : (
                      `#${currentUser.jerseyNumber} • ${currentUser.preferredPosition}`
                    )}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div
                  id="user-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 bg-[#0E1526] border border-[#1E293B] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in space-y-2.5"
                >
                  <div className="p-2 border-b border-[#1E293B] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{currentUser.name}</span>
                        {isMustapha && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">{currentUser.email}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        onOpenChangeAvatar?.();
                      }}
                      className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="Change profile picture"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Change Profile Photo Direct CTA */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenChangeAvatar?.();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Change Profile Picture
                  </button>

                  <div className="text-[10px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
                    Switch Active User Account:
                  </div>

                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {users.map((u) => {
                      const isSelected = u.id === currentUser.id;
                      const isUserSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            if (isUserSuperAdmin && !isSelected) {
                              setIsUserDropdownOpen(false);
                              onOpenSignIn?.();
                              return;
                            }
                            setCurrentUserById(u.id);
                            setIsUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-950/50 text-emerald-300' : 'hover:bg-[#131C31] text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img
                              src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={u.name}
                              className="w-5 h-5 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <span className="truncate">{u.name}</span>
                          </div>
                          {isUserSuperAdmin && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                              Super Admin
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-[#1E293B] space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('profile');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      View Profile
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          onOpenSignIn?.();
                        }}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3 h-3" />
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          logout();
                        }}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-500/30 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3 h-3 text-rose-400" />
                        Log Out
                      </button>
                    </div>
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
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setActiveTab('matches');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 rounded-xl text-xs font-bold text-center ${
                  activeTab === 'matches' ? 'bg-blue-600 text-white' : 'bg-[#0E1526] text-slate-300'
                }`}
              >
                Matches
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
                Profile
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
                Admin {isMustapha ? '' : '🔒'}
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
                Change Photo
              </button>
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="py-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                Log Out
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
              Create Soccer Match
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

