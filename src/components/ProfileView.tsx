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
import { useLanguage } from '../lib/useLanguage';
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
  const { t, language, isRTL, formatMoroccoDate } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatarUrl);
  const [editCity, setEditCity] = useState(currentUser.preferredCity || (language === 'ar' ? 'الدار البيضاء' : 'Casablanca'));
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
      setNewUserError(language === 'ar' ? 'حساب المشرف العام مسجل مسبقاً.' : 'The Super Admin account already exists.');
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
      setAdminPassError(language === 'ar' ? 'كلمة المرور الرئيسية غير صحيحة.' : 'Incorrect Master Password.');
    }
  };

  return (
    <div id="profile-view-container" className="space-y-6 max-w-4xl mx-auto">
      {/* Account Switcher Bar */}
      <div className="bg-[#0A3A2A]/90 border border-[#E5B869]/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#E5B869]" />
          <div>
            <span className="text-xs font-bold text-white block">
              {language === 'ar' ? 'تبديل الحساب النشط للتجربة' : 'Switch Active User Account'}
            </span>
            <span className="text-[11px] text-emerald-300/70">
              {language === 'ar' ? 'تجربة أدوار اللاعبين المختلفة أو الدخول بحساب المشرف العام' : 'Test different player roles or login as Mustapha (Super Admin)'}
            </span>
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
                  setEditCity(u.preferredCity || (language === 'ar' ? 'الدار البيضاء' : 'Casablanca'));
                  setEditPosition(u.preferredPosition || 'MID');
                  setIsEditing(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#0E4836] border-[#E5B869] text-[#F5D794] shadow-sm'
                    : 'bg-[#081813] border-[#E5B869]/20 text-emerald-200/80 hover:text-white hover:border-[#E5B869]/40'
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
                  <span className="px-1 py-0.2 rounded text-[9px] bg-[#0E4836] text-[#F5D794] font-bold border border-[#E5B869]/40">
                    {language === 'ar' ? 'مشرف' : 'Admin'}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsAddingUser(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40 hover:bg-[#125842] transition-colors cursor-pointer"
            title={language === 'ar' ? 'إنشاء حساب لاعب جديد' : 'Create new player account'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'جديد' : 'New'}</span>
          </button>
        </div>
      </div>

      {/* Super Admin Password Modal */}
      {showAdminPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#E5B869]" />
                <h3 className="text-sm font-bold text-white">
                  {language === 'ar' ? 'التحقق من هوية المشرف العام' : 'Super Admin Verification'}
                </h3>
              </div>
              <button
                onClick={() => setShowAdminPassModal(false)}
                className="text-emerald-300/70 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-emerald-200">
              {language === 'ar' ? (
                <>
                  يتطلب الوصول لحساب <span className="text-[#F5D794] font-mono font-semibold">{SUPER_ADMIN_EMAIL}</span> إدخال كلمة المرور الرئيسية.
                </>
              ) : (
                <>
                  Access to <span className="text-[#F5D794] font-mono font-semibold">{SUPER_ADMIN_EMAIL}</span> requires the Master Password.
                </>
              )}
            </p>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-3 text-xs">
              {adminPassError && (
                <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-[11px] font-medium text-center">
                  {adminPassError}
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder={language === 'ar' ? 'كلمة المرور الرئيسية...' : 'Master Password...'}
                  className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869] focus:ring-1 focus:ring-[#E5B869]/40"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminPassModal(false)}
                  className="flex-1 py-2 bg-[#081813] hover:bg-[#0E4836] text-emerald-200 rounded-xl font-medium cursor-pointer border border-[#E5B869]/25"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 rounded-xl font-bold cursor-pointer shadow-md shadow-amber-950/40"
                >
                  {language === 'ar' ? 'تحقق ودخول' : 'Authenticate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {isAddingUser && (
        <div className="p-4 bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl space-y-3 animate-in fade-in shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#F5D794] uppercase tracking-wider">
              {language === 'ar' ? 'تسجيل حساب لاعب جديد' : 'Register New Player Account'}
            </span>
            <button onClick={() => setIsAddingUser(false)} className="text-emerald-300/70 hover:text-white text-xs cursor-pointer">
              {t('common.cancel')}
            </button>
          </div>

          {newUserError && (
            <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium">
              {newUserError}
            </div>
          )}

          <form onSubmit={handleCreateNewUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              required
              placeholder={language === 'ar' ? 'الاسم الكامل (مثال: حكيم زياش)' : 'Full Name (e.g. Hakim Ziyech)'}
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="px-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-lg text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
            />
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder={t('auth.email')}
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-lg text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 rounded-lg font-bold cursor-pointer shadow-sm"
              >
                {language === 'ar' ? 'إنشاء الحساب' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-[#0A3A2A]/95 border border-[#E5B869]/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-start">
            <div className="relative group">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt={currentUser.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-[#E5B869] shadow-xl shadow-black/40 transition-transform group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
              <button
                id="change-photo-quick-btn"
                type="button"
                onClick={handleOpenAvatarModal}
                className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 transition-opacity cursor-pointer"
                title={language === 'ar' ? 'تغيير الصورة الشخصية' : 'Change profile picture'}
              >
                <Camera className="w-5 h-5 text-[#E5B869]" />
                <span>{language === 'ar' ? 'تغيير' : 'Change'}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white">{currentUser.name}</h2>
                {currentUser.isGoogleAuth && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/90 text-blue-300 border border-blue-400/40 shadow-sm">
                    <span>Google Verified ✓</span>
                  </span>
                )}
                {isMustapha && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40 shadow-sm">
                    <Shield className="w-3.5 h-3.5 text-[#E5B869]" />
                    <span>{t('nav.superAdminBadge')}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-emerald-200">
                <span className="flex items-center gap-1 text-emerald-200">
                  <Mail className="w-3.5 h-3.5 text-[#E5B869]" />
                  <span>{currentUser.email}</span>
                </span>
                {currentUser.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-200">
                      <Phone className="w-3.5 h-3.5 text-[#E5B869]" />
                      <span>{currentUser.phone}</span>
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#081813] border border-[#E5B869]/25 text-[#F5D794] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#E5B869]" />
                  <span>{currentUser.preferredCity || (language === 'ar' ? 'الدار البيضاء، المغرب' : 'Casablanca, Morocco')}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            id="edit-profile-btn"
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#081813] hover:bg-[#0E4836] text-emerald-200 hover:text-[#F5D794] border border-[#E5B869]/30 transition-colors self-center md:self-start cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#E5B869]" />
            <span>{isEditing ? t('common.cancel') : t('profile.editProfile')}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#E5B869]/20">
          <div className="p-3.5 bg-[#081813] border border-[#E5B869]/25 rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-emerald-300/70 font-semibold">{t('profile.totalMatches')}</span>
            <div className="text-base font-bold text-[#F5D794] font-display">
              {currentUser.matchesPlayed + myMatches.length} {language === 'ar' ? 'مباراة' : 'Games'}
            </div>
          </div>

          <div className="p-3.5 bg-[#081813] border border-[#E5B869]/25 rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-emerald-300/70 font-semibold">{t('profile.reliabilityRate')}</span>
            <div className="text-base font-bold text-[#F5D794] font-display">
              {currentUser.reliabilityScore ?? 95}% {language === 'ar' ? 'التزام' : 'Fair Play'}
            </div>
          </div>

          <div className="p-3.5 bg-[#081813] border border-[#E5B869]/25 rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-emerald-300/70 font-semibold">{t('profile.skillRating')}</span>
            <div className="text-base font-bold text-[#F5D794] font-display">
              {'★'.repeat(currentUser.skillRating || 3)} ({currentUser.skillRating || 3}/5)
            </div>
          </div>

          <div className="p-3.5 bg-[#081813] border border-[#E5B869]/25 rounded-2xl space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-emerald-300/70 font-semibold">{language === 'ar' ? 'الحالة' : 'Status'}</span>
            <div className="text-base font-bold text-[#F5D794] font-display flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-[#E5B869]" /> <span>{language === 'ar' ? 'نشط ومعتمد' : 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="relative z-10 p-5 bg-[#081813] border border-[#E5B869]/30 rounded-2xl space-y-4 animate-in fade-in"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5D794]">
              {language === 'ar' ? 'تحديث البيانات الرياضية والشخصية' : 'Update Profile Details'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-emerald-200 mb-1">{t('auth.fullName')}</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A3A2A] border border-[#E5B869]/25 rounded-lg text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div>
                <label className="block text-emerald-200 mb-1">{t('profile.phone')} (+212)</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+212 600-000000"
                  className="w-full px-3 py-2 bg-[#0A3A2A] border border-[#E5B869]/25 rounded-lg text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div>
                <label className="block text-emerald-200 mb-1">{t('profile.city')}</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder={language === 'ar' ? 'الدار البيضاء، الرباط، مراكش...' : 'e.g. Casablanca, Rabat, Marrakech'}
                  className="w-full px-3 py-2 bg-[#0A3A2A] border border-[#E5B869]/25 rounded-lg text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div>
                <label className="block text-emerald-200 mb-1">{t('auth.avatarUpload')}</label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A3A2A] border border-[#E5B869]/25 rounded-lg text-white focus:outline-none focus:border-[#E5B869] text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-emerald-300/70 hover:text-white cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                id="save-profile-btn"
                type="submit"
                className="px-5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 shadow-md transition-all cursor-pointer"
              >
                {t('common.save')}
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
            <Calendar className="w-4 h-4 text-[#E5B869]" />
            <span>{t('profile.matchHistory')} ({myMatches.length})</span>
          </h3>
        </div>

        {myMatches.length === 0 ? (
          <div className="p-8 text-center bg-[#0A3A2A]/90 border border-[#E5B869]/25 rounded-2xl text-xs text-emerald-300/70 shadow-md">
            {t('profile.noMatchesYet')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {myMatches.map((m) => {
              const myRosterEntry = m.roster.find((p) => p.userId === currentUser.id);
              return (
                <div
                  key={m.id}
                  onClick={() => onOpenMatchDetails(m)}
                  className="p-4 bg-[#0A3A2A]/95 hover:bg-[#0E4836] border border-[#E5B869]/25 hover:border-[#E5B869]/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{m.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          myRosterEntry?.team === 'green'
                            ? 'bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40'
                            : 'bg-[#081813] text-[#F5D794] border border-[#E5B869]/40'
                        }`}
                      >
                        {myRosterEntry?.team === 'green' ? t('matches.greenTeam') : t('matches.blueTeam')}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300/70">
                      {m.location.venueName} ({m.location.city || (language === 'ar' ? 'الدار البيضاء' : 'Casablanca')}) • {formatMoroccoDate(m.dateTime, 'day_month_time')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs text-emerald-200 font-semibold">
                      {m.roster.length}/{m.maxPlayers} {t('common.players')}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#E5B869] rtl:rotate-180" />
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

