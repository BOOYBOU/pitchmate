import React, { useState } from 'react';
import {
  Shield,
  Edit3,
  Calendar,
  CheckCircle,
  Phone,
  Mail,
  Sparkles,
  ChevronRight,
  Camera,
  X,
  Star,
  MapPin,
  Coins,
  Bell,
  Smartphone,
  Check
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
    matches,
    updateUserProfile,
    pushNotificationPermission,
    requestPushPermission,
    sendTestPushNotification,
  } = usePitchStore();
  const { t, language, isRTL, formatMoroccoDate } = useLanguage();

  const [isPushLoading, setIsPushLoading] = useState(false);
  const [testPushSent, setTestPushSent] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPhone, setEditPhone] = useState(currentUser.phone || '');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatarUrl);
  const [editCity, setEditCity] = useState(currentUser.preferredCity || (language === 'ar' ? 'الدار البيضاء' : 'Casablanca'));
  const [editPosition, setEditPosition] = useState<PlayerPosition>(currentUser.preferredPosition || 'MID');
  const [editSkillLevel, setEditSkillLevel] = useState<number>(currentUser.skillRating || 3);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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

  return (
    <div id="profile-view-container" className="space-y-6 max-w-4xl mx-auto">
      {/* Main Profile Card */}
      <div className="bg-[#0A3A2A]/95 border border-[#E5B869]/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-start">
            <div className="relative group">
              <img
                src={currentUser.avatarUrl || '/images/avatars/messi.jpg'}
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
                <label className="block text-emerald-200 mb-1">{t('auth.avatarUpload', 'الصورة الشخصية')}</label>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="w-full py-2 px-3 bg-[#0A3A2A] border border-[#E5B869]/25 hover:border-[#E5B869] rounded-lg text-emerald-200 hover:text-white flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <img
                      src={currentUser.avatarUrl || '/images/avatars/messi.jpg'}
                      alt="Avatar"
                      className="w-5 h-5 rounded-md object-cover border border-[#E5B869]"
                    />
                    <span>{language === 'ar' ? 'تغيير الصورة الشخصية' : 'Change Profile Picture'}</span>
                  </span>
                  <Camera className="w-3.5 h-3.5 text-[#E5B869]" />
                </button>
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

      {/* Push Notifications Settings Card */}
      <div className="bg-[#0A3A2A]/95 border border-[#E5B869]/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
              pushNotificationPermission === 'granted'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-[#E5B869]/20 border-[#E5B869]/40 text-[#F5D794]'
            }`}>
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold font-display text-white">
                  {t('notifications.pushTitle')}
                </h3>
                {pushNotificationPermission === 'granted' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {language === 'ar' ? 'مفعلة وتعمل' : 'Active & Ready'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {language === 'ar' ? 'غير مفعلة' : 'Not Enabled'}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200/80 mt-1 max-w-xl leading-relaxed">
                {language === 'ar'
                  ? `تنبيهك فور انطلاق مباراة جديدة في مدينتك (${currentUser.city || 'الدار البيضاء'}) وبدء تصويت رجل المباراة (MOTM) مباشرة على هاتفك.`
                  : `Instant alert when a new match is organized in your city (${currentUser.city || 'Casablanca'}) or when MOTM voting begins.`}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex sm:flex-col gap-2 shrink-0">
            {pushNotificationPermission === 'granted' ? (
              <button
                id="profile-test-push-btn"
                type="button"
                disabled={testPushSent}
                onClick={async () => {
                  setTestPushSent(true);
                  await sendTestPushNotification();
                  setTimeout(() => setTestPushSent(false), 3500);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0E4836] hover:bg-[#145d46] text-[#F5D794] border border-[#E5B869]/40 hover:border-[#E5B869] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {testPushSent ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'ar' ? 'تم إرسال الإشعار! 🔔' : 'Alert Sent!'}</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-[#E5B869]" />
                    <span>{t('notifications.pushTestBtn')}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                id="profile-enable-push-btn"
                type="button"
                disabled={isPushLoading}
                onClick={async () => {
                  setIsPushLoading(true);
                  try {
                    await requestPushPermission();
                  } finally {
                    setIsPushLoading(false);
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-95 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/30"
              >
                <Bell className="w-4 h-4 text-slate-950" />
                <span>{isPushLoading ? t('common.loading') : t('notifications.pushEnableBtn')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

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

