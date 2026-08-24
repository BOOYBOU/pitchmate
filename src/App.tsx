/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PitchStoreProvider, usePitchStore } from './lib/usePitchStore';
import { Header } from './components/Header';
import { MatchList } from './components/MatchList';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { CreateMatchModal } from './components/CreateMatchModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { ChangeAvatarModal } from './components/ChangeAvatarModal';
import { AuthModal } from './components/AuthModal';
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

  const [activeTab, setActiveTab] = useState<'matches' | 'profile' | 'admin'>('matches');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [selectedMatch, setSelectedMatch] = useState<SoccerMatch | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Direct Messaging State
  const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(false);
  const [directMessageRecipientId, setDirectMessageRecipientId] = useState<string | null>(null);

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

  const handleOpenSignIn = () => {
    setAuthMode('signin');
    setIsAuthModalOpen(true);
  };

  const handleOpenSignUp = () => {
    setAuthMode('signup');
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateMatch={() => setIsCreateModalOpen(true)}
        onOpenChangeAvatar={() => setIsAvatarModalOpen(true)}
        onOpenSignIn={handleOpenSignIn}
        onOpenSignUp={handleOpenSignUp}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1E293B] bg-[#090D16]/90 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-display">PitchMate</span>
            <span>•</span>
            <span>Local Soccer Match Organizer</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab('matches')}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Matches
            </button>

            <span>•</span>

            <button
              onClick={() => setActiveTab('profile')}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              My Profile
            </button>

            <span>•</span>

            <span className="flex items-center gap-1 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Super Admin: <strong className="text-emerald-400">Mustapha Bouhbous</strong>
            </span>

            <span>•</span>

            <button
              onClick={() => {
                const mustapha = users.find((u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
                if (mustapha) {
                  setCurrentUserById(mustapha.id);
                  setActiveTab('admin');
                }
              }}
              className="text-blue-400 hover:underline hover:text-blue-300 font-semibold cursor-pointer"
            >
              Open Admin Command Center
            </button>
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
        <PitchMateApp />
      </PitchStoreProvider>
    </ErrorBoundary>
  );
}
