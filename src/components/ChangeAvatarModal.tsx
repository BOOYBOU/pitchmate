import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Sparkles, Loader2 } from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { mediaStorage } from '../lib/mediaStorage';

export interface FootballLegendAvatar {
  id: string;
  nameAr: string;
  nameEn: string;
  nickname: string;
  url: string;
}

export const FOOTBALL_LEGEND_AVATARS: FootballLegendAvatar[] = [
  {
    id: 'zidane',
    nameAr: 'زين الدين زيدان',
    nameEn: 'Zinedine Zidane',
    nickname: 'Zizou 🇫🇷',
    url: '/images/avatars/zidane.jpg',
  },
  {
    id: 'messi',
    nameAr: 'ليونيل ميسي',
    nameEn: 'Lionel Messi',
    nickname: 'La Pulga 🇦🇷',
    url: '/images/avatars/messi.jpg',
  },
  {
    id: 'ronaldo',
    nameAr: 'كريستيانو رونالدو',
    nameEn: 'Cristiano Ronaldo',
    nickname: 'CR7 🇵🇹',
    url: '/images/avatars/ronaldo.jpg',
  },
  {
    id: 'maradona',
    nameAr: 'دييغو مارادونا',
    nameEn: 'Diego Maradona',
    nickname: 'El Pibe de Oro 🇦🇷',
    url: '/images/avatars/maradona.jpg',
  },
  {
    id: 'ronaldinho',
    nameAr: 'رونالدينيو',
    nameEn: 'Ronaldinho',
    nickname: 'O Bruxo 🇧🇷',
    url: '/images/avatars/ronaldinho.jpg',
  },
  {
    id: 'hakimi',
    nameAr: 'أشرف حكيمي',
    nameEn: 'Achraf Hakimi',
    nickname: 'The Moroccan Flash 🇲🇦',
    url: '/images/avatars/hakimi.jpg',
  },
  {
    id: 'mbappe',
    nameAr: 'كيليان مبابي',
    nameEn: 'Kylian Mbappé',
    nickname: 'Kyks 🇫🇷',
    url: '/images/avatars/mbappe.jpg',
  },
  {
    id: 'modric',
    nameAr: 'لوكا مودريتش',
    nameEn: 'Luka Modrić',
    nickname: 'Maestro 🇭🇷',
    url: '/images/avatars/modric.jpg',
  },
  {
    id: 'iniesta',
    nameAr: 'أندريس إنييستا',
    nameEn: 'Andrés Iniesta',
    nickname: 'Don Andrés 🇪🇸',
    url: '/images/avatars/iniesta.jpg',
  },
  {
    id: 'neymar',
    nameAr: 'نيمار جونيور',
    nameEn: 'Neymar Jr',
    nickname: 'Ney 🇧🇷',
    url: '/images/avatars/neymar.jpg',
  },
];

interface ChangeAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = usePitchStore();
  const { t, language } = useLanguage();
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatarUrl);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(
        language === 'ar'
          ? 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)'
          : 'Please select a valid image file (PNG, JPG, WebP)'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(
        language === 'ar' ? 'حجم الصورة يجب أن لا يتعدى 5 ميغابايت' : 'Image size should be under 5MB'
      );
      return;
    }

    setUploadError('');
    setIsUploading(true);
    try {
      const uploadRes = await mediaStorage.uploadAvatar(file);
      if (uploadRes.success && uploadRes.avatarUrl) {
        setAvatarPreview(uploadRes.avatarUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            setAvatarPreview(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch {
      setUploadError(language === 'ar' ? 'فشل رفع الصورة.' : 'Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!avatarPreview) return;
    setIsSaving(true);
    await updateUserProfile(currentUser.id, {
      avatarUrl: avatarPreview,
    });
    setIsSaving(false);
    onClose();
  };

  // Find if current preview matches one of the legends
  const selectedLegend = FOOTBALL_LEGEND_AVATARS.find(
    (legend) => legend.url === avatarPreview || avatarPreview.includes(legend.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="change-avatar-modal"
        className="w-full max-w-lg bg-[#0A3A2A] border border-[#E5B869]/35 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-white max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5B869]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0E4836] text-[#F5D794] flex items-center justify-center border border-[#E5B869]/40">
              <Camera className="w-5 h-5 text-[#E5B869]" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white">
                {t('profile.updateAvatar', 'تغيير الصورة الشخصية')}
              </h3>
              <p className="text-xs text-emerald-300/70">
                {language === 'ar'
                  ? 'اختر أسطورة كروية جاهزة أو ارفع صورتك من جهازك'
                  : 'Choose a football legend avatar or upload from your device'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-300/70 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="flex items-center gap-4 p-3.5 bg-[#081813] border border-[#E5B869]/25 rounded-2xl">
          <img
            src={avatarPreview || '/images/avatars/zidane.jpg'}
            alt="Preview"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E5B869] shadow-md shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/avatars/zidane.jpg';
            }}
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white block truncate">{currentUser.name}</span>
              {selectedLegend && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5B869]/20 text-[#F5D794] border border-[#E5B869]/40">
                  <Sparkles className="w-3 h-3 text-[#E5B869]" />
                  {language === 'ar' ? selectedLegend.nameAr : selectedLegend.nameEn}
                </span>
              )}
            </div>
            <span className="text-[11px] text-emerald-300/70 block">
              {language === 'ar'
                ? 'تظهر في بطاقة اللاعب، تشكيلات المباريات، والتعليقات الحية.'
                : 'Visible in player card, match formations, and live chat.'}
            </span>
          </div>
        </div>

        {/* 10 Football Legends Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E5B869]" />
              {language === 'ar' ? 'اختر شخصية جاهزة (10 أساطير كرة القدم):' : 'Choose Ready-Made Legend (10 Football Icons):'}
            </label>
            <span className="text-[10px] text-emerald-300/60">
              {language === 'ar' ? 'صور احترافية جاهزة' : 'Pro Quality'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
            {FOOTBALL_LEGEND_AVATARS.map((legend) => {
              const isSelected = avatarPreview === legend.url || avatarPreview.includes(legend.id);
              return (
                <button
                  key={legend.id}
                  type="button"
                  onClick={() => {
                    setAvatarPreview(legend.url);
                    setUploadError('');
                  }}
                  className={`group relative flex flex-col items-center rounded-2xl p-1.5 border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-[#0E4836] border-[#E5B869] ring-2 ring-[#E5B869]/50 shadow-lg scale-102'
                      : 'bg-[#081813]/80 border-[#E5B869]/15 hover:border-[#E5B869]/60 hover:bg-[#0E4836]/40'
                  }`}
                  title={`${legend.nameAr} - ${legend.nickname}`}
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-1">
                    <img
                      src={legend.url}
                      alt={legend.nameEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#E5B869]/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-[#E5B869] text-slate-950 flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold leading-tight line-clamp-1 ${
                    isSelected ? 'text-[#F5D794]' : 'text-emerald-100 group-hover:text-white'
                  }`}>
                    {language === 'ar' ? legend.nameAr : legend.nameEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload From Device */}
        <div className="space-y-2 pt-2 border-t border-[#E5B869]/15">
          <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200">
            {language === 'ar' ? 'أو ارفع صورة خاصة من جهازك:' : 'Or Upload From Your Device:'}
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
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-4 border border-dashed border-[#E5B869]/40 hover:border-[#E5B869] rounded-xl bg-[#081813] text-xs font-medium text-emerald-200 hover:text-[#F5D794] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 text-[#E5B869] animate-spin" />
                <span>{language === 'ar' ? 'جاري معالجة الصورة...' : 'Processing photo...'}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-[#E5B869]" />
                <span>{language === 'ar' ? 'اختيار صورة من هاتفك أو حاسوبك (JPG, PNG, WebP)' : 'Choose Photo From Device (JPG, PNG, WebP)'}</span>
              </>
            )}
          </button>
          {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5B869]/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-emerald-300/70 hover:text-white cursor-pointer"
          >
            {t('common.cancel', 'إلغاء')}
          </button>
          <button
            id="save-avatar-btn"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-90 shadow-md shadow-amber-950/30 transition-all cursor-pointer"
          >
            {isSaving
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'حفظ الصورة الشخصية' : 'Save Profile Picture')}
          </button>
        </div>
      </div>
    </div>
  );
};

