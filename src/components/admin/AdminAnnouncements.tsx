import React, { useState } from 'react';
import { AdminAnnouncement } from '../../types';
import { Bell, Plus, Trash2, Info, AlertTriangle, Trophy, Wrench, Megaphone } from 'lucide-react';
import { useLanguage } from '../../lib/useLanguage';

interface AdminAnnouncementsProps {
  announcements: AdminAnnouncement[];
  onAddAnnouncement: (announcement: Omit<AdminAnnouncement, 'id' | 'createdAt'>) => Promise<any> | any;
  onDeleteAnnouncement: (id: string) => Promise<any> | any;
  adminName: string;
}

export function AdminAnnouncements({
  announcements,
  onAddAnnouncement,
  onDeleteAnnouncement,
  adminName,
}: AdminAnnouncementsProps) {
  const { t, language, formatMoroccoDate } = useLanguage();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AdminAnnouncement['type']>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddAnnouncement({
        title: title.trim(),
        message: message.trim(),
        authorName: adminName,
        type,
      });
      setTitle('');
      setMessage('');
      setIsCreating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (annType: AdminAnnouncement['type']) => {
    switch (annType) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'tournament':
        return <Trophy className="w-4 h-4 text-[#F5D794]" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-emerald-300" />;
      default:
        return <Info className="w-4 h-4 text-[#E5B869]" />;
    }
  };

  const getTypeLabel = (annType: AdminAnnouncement['type']) => {
    if (language === 'ar') {
      switch (annType) {
        case 'warning':
          return 'تنبيه هام';
        case 'tournament':
          return 'دوري / بطولة';
        case 'maintenance':
          return 'صيانة الملعب';
        case 'pitch_update':
          return 'تحديث الملعب';
        default:
          return 'معلومات عامة';
      }
    }
    return annType;
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
            <Megaphone className="w-5 h-5 text-[#E5B869]" />
            <span>{t('admin.broadcastTitle', 'إعلانات وتعميمات الدوري')}</span>
          </h3>
          <p className="text-xs text-emerald-300/70">
            {language === 'ar' ? 'نشر تحديثات فورية وإشعارات لكافة اللاعبين في المنصة' : 'Post system-wide updates to all registered players'}
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إعلان جديد' : 'New Broadcast'}</span>
          </button>
        )}
      </div>

      {/* Create Announcement Form */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="bg-[#0A3A2A] border border-[#E5B869]/40 rounded-2xl p-5 space-y-4 shadow-xl">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
            <Bell className="w-4 h-4 text-[#E5B869]" />
            <span>{language === 'ar' ? 'نشر إعلان رسمي للمجتمع' : 'Publish Broadcast Announcement'}</span>
          </h4>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">
                {language === 'ar' ? 'عنوان الإعلان' : 'Headline'}
              </label>
              <input
                type="text"
                placeholder={language === 'ar' ? 'مثال: أعمال صيانة الإنارة بملعب القرب نهاية الأسبوع' : 'e.g. Pitch 4 Lighting Maintenance this Weekend'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  {language === 'ar' ? 'تصنيف الإعلان' : 'Category'}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AdminAnnouncement['type'])}
                  className="w-full px-3.5 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-white focus:outline-none focus:border-[#E5B869]"
                >
                  <option value="info">{language === 'ar' ? 'معلومات عامة' : 'General Info'}</option>
                  <option value="pitch_update">{language === 'ar' ? 'تحديث الملاعب' : 'Pitch Update'}</option>
                  <option value="tournament">{language === 'ar' ? 'دوري / مسابقة' : 'Tournament / Event'}</option>
                  <option value="warning">{language === 'ar' ? 'تنبيه عاجل' : 'Important Alert'}</option>
                  <option value="maintenance">{language === 'ar' ? 'صيانة وإصلاحات' : 'Maintenance'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">
                {language === 'ar' ? 'نص وتفاصيل الإعلان' : 'Message Body'}
              </label>
              <textarea
                placeholder={language === 'ar' ? 'اكتب تفاصيل الإعلان والتوجيهات الموجهة للاعبين...' : 'Provide clear details for players...'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                required
                className="w-full px-3.5 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3.5 py-2 bg-[#081813] hover:bg-[#0E4836] text-emerald-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-[#E5B869]/30"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting
                ? (language === 'ar' ? 'جاري النشر...' : 'Publishing...')
                : (language === 'ar' ? 'تعميم الإعلان على الجميع' : 'Broadcast to Players')}
            </button>
          </div>
        </form>
      )}

      {/* Announcements Feed */}
      <div className="space-y-3">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-md"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#081813] border border-[#E5B869]/25 shrink-0">
                {getTypeIcon(ann.type)}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm truncate font-display">{ann.title}</h4>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#081813] text-[#F5D794] border border-[#E5B869]/30">
                    {getTypeLabel(ann.type)}
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed">{ann.message}</p>
                <div className="text-[11px] text-emerald-300/60 pt-1">
                  {language === 'ar' ? 'نُشر بواسطة' : 'Posted by'}{' '}
                  <span className="text-[#F5D794] font-semibold">{ann.authorName}</span> •{' '}
                  {formatMoroccoDate(ann.createdAt, 'datetime')}
                </div>
              </div>
            </div>

            <button
              onClick={() => onDeleteAnnouncement(ann.id)}
              className="p-1.5 text-emerald-400/60 hover:text-rose-400 hover:bg-[#081813] rounded-lg transition-colors cursor-pointer shrink-0"
              title={language === 'ar' ? 'حذف الإعلان' : 'Delete announcement'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-8 text-emerald-300/50 text-xs">
            {language === 'ar'
              ? 'لا توجد إعلانات منشورة حالياً. انقر على "إعلان جديد" لنشر تعميم.'
              : 'No active broadcasts. Click "New Broadcast" to post an announcement.'}
          </div>
        )}
      </div>
    </div>
  );
}

