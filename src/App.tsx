/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PitchStoreProvider, usePitchStore } from './lib/usePitchStore';
import { LanguageProvider, useLanguage } from './lib/useLanguage';
import { Header } from './components/Header';
import { MatchList } from './components/MatchList';
import { ProfileView } from './components/ProfileView';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminPanel } from './components/AdminPanel';
import { CreateMatchModal } from './components/CreateMatchModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { ChangeAvatarModal } from './components/ChangeAvatarModal';
import { AuthView } from './components/AuthView';
import { DirectMessagesModal } from './components/DirectMessagesModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SoccerMatch, SUPER_ADMIN_EMAIL } from './types';
import { Shield, Sparkles, MapPin, Database, Heart } from 'lucide-react';

function PitchMateApp() {
  const {
    matches,
    currentUser,
    users,
    setCurrentUserById,
    isAuthenticated,
  } = usePitchStore();

  const { t, isRTL } = useLanguage();

  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard' | 'profile' | 'admin'>('matches');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<SoccerMatch | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Direct Messaging State
  const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(false);
  const [directMessageRecipientId, setDirectMessageRecipientId] = useState<string | null>(null);

  // Deep-link support: auto-open match if URL contains ?match=match_id
  React.useEffect(() => {
    if (typeof window !== 'undefined' && matches.length > 0 && !selectedMatch) {
      const params = new URLSearchParams(window.location.search);
      const matchIdParam = params.get('match');
      if (matchIdParam) {
        const found = matches.find((m) => m.id === matchIdParam);
        if (found) {
          setSelectedMatch(found);
        }
      }
    }
  }, [matches, selectedMatch]);

  // Mandatory Authentication Gate: if user is not authenticated, render the dedicated Auth landing view
  if (!isAuthenticated) {
    return <AuthView />;
  }

  const handleOpenMatchDetails = (match: SoccerMatch) => {
    // Look up freshest match from store state
    const current = matches.find((m) => m.id === match.id) || match;
    setSelectedMatch(current);
  };

  const handleOpenDirectMessageWithUser = (userId: string) => {
    setDirectMessageRecipientId(userId);
    setIsDirectMessagesOpen(true);
  };

  return (
    <div className="min-h-screen stadium-ambient-bg text-slate-100 flex flex-col selection:bg-[#E5B869]/30 selection:text-[#F5D794]">
      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateMatch={() => setIsCreateModalOpen(true)}
        onOpenChangeAvatar={() => setIsAvatarModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenDirectMessages={() => {
          setDirectMessageRecipientId(null);
          setIsDirectMessagesOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'matches' && (
          <MatchList
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onOpenDetails={handleOpenMatchDetails}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            onOpenDirectMessage={handleOpenDirectMessageWithUser}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            onOpenMatchDetails={handleOpenMatchDetails}
            onOpenDirectMessage={handleOpenDirectMessageWithUser}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            onOpenMatchDetails={handleOpenMatchDetails}
            onOpenCreateMatch={() => setIsCreateModalOpen(true)}
          />
        )}
      </main>

      {/* Persistent Modals */}
      <CreateMatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newMatchId) => {
          const created = matches.find((m) => m.id === newMatchId);
          if (created) setSelectedMatch(created);
        }}
      />

      <MatchDetailModal
        isOpen={Boolean(selectedMatch)}
        match={selectedMatch ? matches.find((m) => m.id === selectedMatch.id) || selectedMatch : null}
        onClose={() => setSelectedMatch(null)}
        onOpenDirectMessage={handleOpenDirectMessageWithUser}
      />

      <DirectMessagesModal
        isOpen={isDirectMessagesOpen}
        onClose={() => {
          setIsDirectMessagesOpen(false);
          setDirectMessageRecipientId(null);
        }}
        initialSelectedUserId={directMessageRecipientId}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectMatch={(matchId) => {
          const match = matches.find((m) => m.id === matchId);
          if (match) setSelectedMatch(match);
        }}
      />

      <ChangeAvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E5B869]/25 bg-[#081813]/95 py-6 text-xs text-emerald-300/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#F5D794] font-display">PitchMate</span>
            <span className="text-[#E5B869]/40">•</span>
            <span className="text-emerald-200/80">{t('brand.tagline')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab('matches')}
              className="text-emerald-300/70 hover:text-[#F5D794] cursor-pointer transition-colors"
            >
              {t('nav.matches')}
            </button>

            <span className="text-[#E5B869]/40">•</span>

            <button
              onClick={() => setActiveTab('profile')}
              className="text-emerald-300/70 hover:text-[#F5D794] cursor-pointer transition-colors"
            >
              {t('nav.profile')}
            </button>

            <span className="text-[#E5B869]/40">•</span>

            <span className="flex items-center gap-1 text-emerald-100/90">
              <Shield className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>{t('nav.superAdminBadge')}:</span> <strong className="text-[#F5D794]">Mustapha Bouhbous</strong>
            </span>

            {currentUser?.isAdmin && (
              <>
                <span className="text-[#E5B869]/40">•</span>
                <button
                  onClick={() => setActiveTab('admin')}
                  className="text-[#E5B869] hover:underline hover:text-[#F5D794] font-bold cursor-pointer transition-colors"
                >
                  {t('admin.title')}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PitchStoreProvider>
        <LanguageProvider>
          <PitchMateApp />
        </LanguageProvider>
      </PitchStoreProvider>
    </ErrorBoundary>
  );
}
