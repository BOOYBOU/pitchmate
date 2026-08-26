import React, { useState } from 'react';
import {
  Shield,
  Edit3,
  Calendar,
  CheckCircle,
  Phone,
  Mail,
  Sparkles,
  RefreshCw,
  Plus,
  ChevronRight,
  Camera,
  X,
  Lock,
  Star,
  MapPin,
  Coins,
} from 'lucide-react';
import { SUPER_ADMIN_EMAIL, isSuperAdminEmail, SoccerMatch, PlayerPosition } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { formatMoroccoDate } from '../lib/moroccoUtils';
import { ChangeAvatarModal } from './ChangeAvatarModal';

interface ProfileViewProps {
  onOpenMatchDetails: (match: SoccerMatch) => void;
  onOpenDirectMessage?: (userId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenMatchDetails }) => {
  const {
    currentUser,
    users,
    matches,
    setCurrentUserById,
    authenticateSuperAdmin,
    updateUserProfile,
    createNewUserAccount,
  } = usePitchStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatarUrl);
  const [editCity, setEditCity] = useState(currentUser.preferredCity || 'Casablanca');
  const [editPosition, setEditPosition] = useState<PlayerPosition>(currentUser.preferredPosition || 'MID');
  const [editSkillLevel, setEditSkillLevel] = useState<number>(currentUser.skillRating || 3);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Super Admin Password Modal state
  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminPassError, setAdminPassError] = useState('');

  // New account form
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserError, setNewUserError] = useState('');

  const isMustapha = isSuperAdminEmail(currentUser.email);
  const myMatches = matches.filter((m) => m.roster.some((p) => p.userId === currentUser.id));

  const handleOpenAvatarModal = () => {
    setIsAvatarModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile(currentUser.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      avatarUrl: editAvatar,
      preferredCity: editCity,
      preferredPosition: editPosition,
      skillRating: editSkillLevel,
    });
    setIsEditing(false);
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError('');
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const emailClean = newUserEmail.trim().toLowerCase();
    if (isSuperAdminEmail(emailClean)) {
      setNewUserError('The Super Admin account already exists.');
      return;
    }

    createNewUserAccount(newUserName.trim(), emailClean);
    setNewUserName('');
    setNewUserEmail('');
    setIsAddingUser(false);
  };

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassError('');
    const success = authenticateSuperAdmin(adminPassInput);
    if (success) {
      const mustapha = users.find((u) => isSuperAdminEmail(u.email));
      if (mustapha) {
        setEditName(mustapha.name);
        setEditPhone(mustapha.phone || '');
        setEditAvatar(mustapha.avatarUrl);
        setIsEditing(false);
      }
      setShowAdminPassModal(false);
      setAdminPassInput('');
    } else {
      setAdminPassError('Incorrect Master Password.');
    }
  };

  return (
    <div id="profile-view-container" className="space-y-6 max-w-4xl mx-auto">
      {/* Account Switcher Bar */}
      <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-xs font-bold text-white block">Switch Active User Account</span>
            <span className="text-[11px] text-slate-400">Test different player roles or login as Mustapha (Super Admin)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {users.map((u) => {
            const isSelected = u.id === currentUser.id;
            const isUserAdmin = isSuperAdminEmail(u.email);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  if (isUserAdmin && !isSelected) {
                    setShowAdminPassModal(true);
                    setAdminPassError('');
                    setAdminPassInput('');
                    return;
                  }
                  setCurrentUserById(u.id);
                  setEditName(u.name);
                  setEditPhone(u.phone || '');
                  setEditAvatar(u.avatarUrl);
                  setEditCity(u.preferredCity || 'Casablanca');
                  setEditPosition(u.preferredPosition || 'MID');
                  setIsEditing(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-sm'
                    : 'bg-[#090D16] border-[#1E293B] text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <img
                  src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={u.name}
                  className="w-4 h-4 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span>{u.name.split(' ')[0]}</span>
                {isUserAdmin && (
                  <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-500/30 text-emerald-300 font-bold">
                    Admin
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsAddingUser(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
            title="Create new player account"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>
      </div>

      {/* Super Admin Password Modal */}
      {showAdminPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0E1526] border border-[#1E293B] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Super Admin Verification</h3>
              </div>
              <button
                onClick={() => setShowAdminPassModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Access to <span className="text-emerald-400 font-mono font-semibold">{SUPER_ADMIN_EMAIL}</span> requires the Master Password.
            </p>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-3 text-xs">
              {adminPassError && (
                <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-medium text-center">
                  {adminPassError}
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder="Master Password..."
                  className="w-full pl-9 pr-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminPassModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {isAddingUser && (
        <div className="p-4 bg-[#090D16] border border-blue-500/30 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Register New Player Account
            </span>
            <button onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
              Cancel
            </button>
          </div>

          {newUserError && (
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-medium">
              {newUserError}
            </div>
          )}

          <form onSubmit={handleCreateNewUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              required
              placeholder="Full Name (e.g. Hakim Ziyech)"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white placeholder-slate-500"
            />
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="Email Address"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white placeholder-slate-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-[#0E1526] border border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative group">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt={currentUser.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-xl shadow-emerald-950 transition-transform group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
              <button
                id="change-photo-quick-btn"
                type="button"
                onClick={handleOpenAvatarModal}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 transition-opacity cursor-pointer"
                title="Change profile picture"
              >
                <Camera className="w-5 h-5 text-emerald-400" />
                Change
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">{currentUser.name}</h2>
                {isMustapha && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    Super Admin
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  {currentUser.email}
                </span>
                {currentUser.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      {currentUser.phone}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#090D16] border border-[#1E293B] text-emerald-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  {currentUser.preferredCity || 'Casablanca, Morocco'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#090D16] border border-[#1E293B] text-blue-300">
                  {currentUser.preferredPosition || 'Midfielder'}
                </span>
              </div>
            </div>
          </div>

          <button
            id="edit-profile-btn"
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#131C31] hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors self-center md:self-start cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#1E293B]">
          <div className="p-3.5 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Matches</span>
            <div className="text-base font-bold text-emerald-300 font-display">
              {currentUser.matchesPlayed + myMatches.length} Games
            </div>
          </div>

          <div className="p-3.5 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Reliability</span>
            <div className="text-base font-bold text-emerald-400 font-display">
              {currentUser.reliabilityScore ?? 95}% Fair Play
            </div>
          </div>

          <div className="p-3.5 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Skill Level</span>
            <div className="text-base font-bold text-amber-300 font-display">
              {'★'.repeat(currentUser.skillRating || 3)} ({currentUser.skillRating || 3}/5)
            </div>
          </div>

          <div className="p-3.5 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Status</span>
            <div className="text-base font-bold text-emerald-400 font-display flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Active
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="relative z-10 p-5 bg-[#090D16] border border-emerald-500/30 rounded-2xl space-y-4 animate-in fade-in"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Update Profile Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Phone Number (Morocco +212)</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+212 600-000000"
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Home City</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Casablanca, Rabat, Marrakech"
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Fav Position</label>
                <select
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value as PlayerPosition)}
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="FWD">Striker / Forward (FWD)</option>
                  <option value="MID">Midfielder (MID)</option>
                  <option value="DEF">Defender (DEF)</option>
                  <option value="GK">Goalkeeper (GK)</option>
                  <option value="ANY">Any / Flexible (ANY)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Skill Rating (1-5)</label>
                <select
                  value={editSkillLevel}
                  onChange={(e) => setEditSkillLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>1 - Casual / Beginner</option>
                  <option value={2}>2 - Recreational</option>
                  <option value={3}>3 - Intermediate</option>
                  <option value={4}>4 - Advanced / Competitive</option>
                  <option value={5}>5 - Pro / Semi-Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Avatar Image URL</label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-profile-btn"
                type="submit"
                className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Standardized Change Avatar Modal */}
      <ChangeAvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />

      {/* Confirmed Matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            My Confirmed Matches ({myMatches.length})
          </h3>
        </div>

        {myMatches.length === 0 ? (
          <div className="p-8 text-center bg-[#0E1526] border border-[#1E293B] rounded-2xl text-xs text-slate-400">
            You haven't joined any matches yet. Head over to the Matches tab and click "Join Match"!
          </div>
        ) : (
          <div className="space-y-2.5">
            {myMatches.map((m) => {
              const myRosterEntry = m.roster.find((p) => p.userId === currentUser.id);
              return (
                <div
                  key={m.id}
                  onClick={() => onOpenMatchDetails(m)}
                  className="p-4 bg-[#0E1526] hover:bg-[#131C31] border border-[#1E293B] hover:border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{m.title}</span>
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                          myRosterEntry?.team === 'green'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        Team {myRosterEntry?.team === 'green' ? 'Green' : 'Blue'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {m.location.venueName} ({m.location.city || 'Casablanca'}) • {formatMoroccoDate(m.dateTime, 'day_month_time')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs text-slate-300 font-semibold">
                      {m.roster.length}/{m.maxPlayers} Players
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
