import React, { useState, useRef } from 'react';
import {
  User,
  Shield,
  Edit3,
  Calendar,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  Award,
  Sparkles,
  RefreshCw,
  Plus,
  Users,
  Check,
  ChevronRight,
  Camera,
  Upload,
  Link,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { UserProfile, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, isSuperAdminEmail, verifySuperAdminMasterPassword, SoccerMatch } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { MessageCircle, Lock } from 'lucide-react';

const PRESET_AVATARS = [
  { name: 'Captain Striker', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { name: 'Playmaker', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { name: 'Winger Pro', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { name: 'Solid Defender', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80' },
  { name: 'Goalkeeper Ace', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80' },
  { name: 'Midfield Maestro', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80' },
];

interface ProfileViewProps {
  onOpenMatchDetails: (match: SoccerMatch) => void;
  onOpenDirectMessage?: (userId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenMatchDetails, onOpenDirectMessage }) => {
  const {
    currentUser,
    users,
    matches,
    setCurrentUserById,
    authenticateSuperAdmin,
    updateUserProfile,
    createNewUserAccount,
    initiateVoiceCall,
  } = usePitchStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatarUrl);

  // Avatar Upload / URL Modal state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState(currentUser.avatarUrl);
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatarUrl);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Find all matches joined by current user
  const myMatches = matches.filter((m) => m.roster.some((p) => p.userId === currentUser.id));

  const handleOpenAvatarModal = () => {
    setAvatarUrlInput(currentUser.avatarUrl);
    setAvatarPreview(currentUser.avatarUrl);
    setUploadError('');
    setIsAvatarModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size should be under 5MB');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAvatarPreview(event.target.result);
        setAvatarUrlInput(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!avatarPreview) return;
    await updateUserProfile(currentUser.id, {
      avatarUrl: avatarPreview,
    });
    setEditAvatar(avatarPreview);
    setIsAvatarModalOpen(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile(currentUser.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      avatarUrl: editAvatar,
    });
    setIsEditing(false);
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError('');
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const emailClean = newUserEmail.trim().toLowerCase();
    if (isSuperAdminEmail(emailClean)) {
      setNewUserError('The Super Admin account already exists and cannot be duplicated.');
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
      setAdminPassError('Incorrect Master Password. Access restricted to Super Admin.');
    }
  };

  return (
    <div id="profile-view-container" className="space-y-6 max-w-4xl mx-auto">
      {/* Account Switcher Bar for fast role testing */}
      <div className="bg-[#0E1526] border border-[#1E293B] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-xs font-bold text-white block">Switch Active User Account</span>
            <span className="text-[11px] text-slate-400">Test different player perspectives or login as Super Admin</span>
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
                    Super Admin
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

      {/* Super Admin Master Password Challenge Modal */}
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
              Access to <span className="text-emerald-400 font-mono font-semibold">{SUPER_ADMIN_EMAIL}</span> requires the designated Master Password.
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

      {/* New User Account Modal */}
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
              placeholder="Full Name (e.g. Leo Messi)"
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
        {/* Subtle Pitch Aesthetic Lines */}
        <div className="pitch-grid-pattern absolute inset-0 opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar with interactive photo edit overlay */}
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

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleOpenAvatarModal}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Upload Photo or Set Image URL
                </button>
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

        {/* Player Stats Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-[#1E293B]">
          <div className="p-3.5 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Matches Played</span>
            <div className="text-base font-bold text-emerald-300 font-display">
              {currentUser.matchesPlayed + myMatches.length} Games
            </div>
          </div>

          <div className="p-3.5 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Account Status</span>
            <div className="text-base font-bold text-emerald-400 font-display flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Active Member
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="relative z-10 p-5 bg-[#090D16] border border-emerald-500/30 rounded-2xl space-y-4 animate-in fade-in"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Update Player Profile</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                <label className="block text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Avatar Image URL / Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleOpenAvatarModal}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Change...
                  </button>
                </div>
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
                className="px-5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Avatar Upload / URL Modal Dialog */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0E1526] border border-[#1E293B] rounded-3xl p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-white">Change Profile Picture</h3>
                  <p className="text-xs text-slate-400">Upload a photo from your device or paste an image URL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-[#090D16] border border-[#1E293B] rounded-2xl">
              <img
                src={avatarPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt="Avatar Preview"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';
                }}
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold text-white block">Preview on Live Match Rosters</span>
                <span className="text-[11px] text-slate-400 block">
                  This picture will appear next to your name in game rosters, comments, and the top navigation bar.
                </span>
              </div>
            </div>

            {/* Upload from Device */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Option 1: Upload from Device
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl bg-[#090D16] text-xs font-medium text-slate-300 hover:text-emerald-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                Select Image File (JPG, PNG, WebP)
              </button>
              {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
            </div>

            {/* Paste Image URL */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Option 2: Provide Image URL
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://example.com/my-photo.jpg"
                    value={avatarUrlInput}
                    onChange={(e) => {
                      setAvatarUrlInput(e.target.value);
                      setAvatarPreview(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Preset Avatars */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Or Pick a Soccer Pro Avatar:
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarPreview(preset.url);
                      setAvatarUrlInput(preset.url);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                      avatarPreview === preset.url
                        ? 'border-emerald-400 ring-2 ring-emerald-500/40 scale-105'
                        : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                    }`}
                    title={preset.name}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="apply-avatar-btn"
                type="button"
                onClick={handleSaveAvatar}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/30 transition-colors cursor-pointer"
              >
                Save Profile Picture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Active Joined Matches Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            My Confirmed Matches ({myMatches.length})
          </h3>
        </div>

        {myMatches.length === 0 ? (
          <div className="p-8 text-center bg-[#0E1526] border border-[#1E293B] rounded-2xl text-xs text-slate-400">
            You haven't joined any upcoming matches yet. Head over to the Matches tab and click "Join Match"!
          </div>
        ) : (
          <div className="space-y-2.5">
            {myMatches.map((m) => {
              const myRosterEntry = m.roster.find((p) => p.userId === currentUser.id);
              const mDate = new Date(m.dateTime);
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
                      {m.location.venueName} • {mDate.toLocaleDateString()} at{' '}
                      {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Community Teammates & Direct Message Network */}
      <div className="space-y-4 pt-6 border-t border-[#1E293B]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              PitchMate Teammates ({users.length})
            </h3>
            <p className="text-xs text-slate-400">Connect with fellow footballers and start private chats</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((player) => {
            const isMe = player.id === currentUser.id;
            const isPlayerSuperAdmin = player.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

            return (
              <div
                key={player.id}
                className="p-3.5 bg-[#0E1526] border border-[#1E293B] hover:border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={player.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={player.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0E1526]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{player.name}</span>
                      {isPlayerSuperAdmin && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                          Admin
                        </span>
                      )}
                      {isMe && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {player.matchesPlayed} Matches • Member
                    </span>
                  </div>
                </div>

                {!isMe && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => initiateVoiceCall(player.id)}
                      className="p-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      title={`Start Voice Call with ${player.name}`}
                    >
                      <Phone className="w-4 h-4" />
                    </button>

                    {onOpenDirectMessage && (
                      <button
                        type="button"
                        onClick={() => onOpenDirectMessage(player.id)}
                        className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        title={`Send Direct Message to ${player.name}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
