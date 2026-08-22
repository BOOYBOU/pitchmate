import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  Users,
  Trophy,
  Megaphone,
  BarChart3,
  RefreshCw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { SoccerMatch, UserProfile, SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { AdminOverview } from './admin/AdminOverview';
import { AdminUsersTable } from './admin/AdminUsersTable';
import { AdminMatchesTable } from './admin/AdminMatchesTable';
import { AdminAnnouncements } from './admin/AdminAnnouncements';

interface AdminPanelProps {
  onOpenMatchDetails: (match: SoccerMatch) => void;
  onOpenCreateMatch: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onOpenMatchDetails, onOpenCreateMatch }) => {
  const {
    currentUser,
    users,
    matches,
    announcements,
    deleteMatch,
    toggleMatchLock,
    removePlayerFromMatch,
    createAnnouncement,
    deleteAnnouncement,
    resetToDefaultData,
    approveUser,
    rejectUser,
    approveAllPendingUsers,
    banUser,
    unbanUser,
    deleteUserAccount,
    autoBalanceTeams,
  } = usePitchStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'matches' | 'announcements'>('overview');
  const [isResetting, setIsResetting] = useState(false);

  const isMustapha = isSuperAdminEmail(currentUser.email) || currentUser.isAdmin;
  const pendingUsersCount = users.filter((u) => u.status === 'pending').length;

  const handleResetData = async () => {
    if (confirm('Reset league database to default fixtures and players? All local changes will reset.')) {
      setIsResetting(true);
      try {
        await resetToDefaultData();
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleAddAnnouncement = async (ann: { title: string; message: string; type: any }) => {
    await createAnnouncement(ann.title, ann.message, ann.type);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0E1526] to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Admin Command Center</h1>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time player approvals, match oversight, tactical lineups, and league broadcasts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg border border-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Reset Database to Default Fixtures"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Fixtures
            </button>

            <button
              onClick={onOpenCreateMatch}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              Create Fixture
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            Player Management
            {pendingUsersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {pendingUsersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'matches'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Matches & Rosters ({matches.length})
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'announcements'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Announcements ({announcements.length})
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'overview' && (
        <AdminOverview
          matches={matches}
          users={users}
          announcements={announcements}
          onOpenMatchDetails={onOpenMatchDetails}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'users' && (
        <AdminUsersTable
          users={users}
          onApproveUser={approveUser}
          onApproveAllUsers={approveAllPendingUsers}
          onRejectUser={rejectUser}
          onBanUser={banUser}
          onUnbanUser={unbanUser}
          onDeleteUser={deleteUserAccount}
        />
      )}

      {activeTab === 'matches' && (
        <AdminMatchesTable
          matches={matches}
          onOpenMatchDetails={onOpenMatchDetails}
          onToggleLock={toggleMatchLock}
          onDeleteMatch={deleteMatch}
          onRemovePlayer={removePlayerFromMatch}
          onAutoBalanceTeams={autoBalanceTeams}
        />
      )}

      {activeTab === 'announcements' && (
        <AdminAnnouncements
          announcements={announcements}
          onAddAnnouncement={handleAddAnnouncement}
          onDeleteAnnouncement={deleteAnnouncement}
          adminName={currentUser.name}
        />
      )}
    </div>
  );
};
