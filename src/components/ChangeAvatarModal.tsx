import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Sparkles, Loader2, Flame, Trophy } from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { mediaStorage } from '../lib/mediaStorage';

export interface FootballLegendAvatar {
  id: string;
  nameAr: string;
  nameEn: string;
  nickname: string;
  celebrationAr: string;
  celebrationEn: string;
  url: string;
}

export const FOOTBALL_LEGEND_AVATARS: FootballLegendAvatar[] = [
  {
    id: 'messi',
    nameAr: 'ليونيل ميسي',
    nameEn: 'Lionel Messi',
    nickname: 'La Pulga 🇦🇷',
    celebrationAr: 'رفع اليدين للسماء وصرخة المجد بعد التتويج التاريخي',
    celebrationEn: 'Pointing to the heavens & glory victory celebration',
    url: '/images/avatars/messi.jpg',
  },
  {
    id: 'ronaldo',
    nameAr: 'كريستيانو رونالدو',
    nameEn: 'Cristiano Ronaldo',
    nickname: 'CR7 ⚪ Real Madrid',
    celebrationAr: 'صرخة الفوز الملكي واحتفال الـ Siuuu الأسطوري بقميص ريال مدريد',
    celebrationEn: 'Iconic Real Madrid Siuuu victory roar celebration',
    url: '/images/avatars/ronaldo.jpg',
  },
  {
    id: 'cruyff',
    nameAr: 'يوهان كرويف',
    nameEn: 'Johan Cruyff',
    nickname: 'El Salvador 🇳🇱 #14',
    celebrationAr: 'فرحة الكرة الشاملة ورفع الذراعين بالقميص الهولندي الأسطوري رقم 14',
    celebrationEn: 'Total Football victory celebration in iconic #14 orange jersey',
    url: '/images/avatars/cruyff.jpg',
  },
  {
    id: 'zidane',
    nameAr: 'زين الدين زيدان',
    nameEn: 'Zinedine Zidane',
    nickname: 'Zizou 🇫🇷',
    celebrationAr: 'صرخة الفوز بالهدف الصاروخي في نهائي دوري الأبطال',
    celebrationEn: 'Legendary Champions League volley goal celebration',
    url: '/images/avatars/zidane.jpg',
  },
  {
    id: 'ronaldinho',
    nameAr: 'رونالدينيو',
    nameEn: 'Ronaldinho',
    nickname: 'O Bruxo 🇧🇷',
    celebrationAr: 'ابتسامة السامبا وحركة الشاكا الشهيرة بعد سحر الهدف',
    celebrationEn: 'Joyful samba shaka smile goal celebration',
    url: '/images/avatars/ronaldinho.jpg',
  },
  {
    id: 'mbappe',
    nameAr: 'كيليان مبابي',
    nameEn: 'Kylian Mbappé',
    nickname: 'Kyks 🇫🇷',
    celebrationAr: 'احتفال الأذرع المتقاطعة الشهير والانزلاق على العشب',
    celebrationEn: 'Iconic crossed-arms slide goal celebration',
    url: '/images/avatars/mbappe.jpg',
  },
  {
    id: 'iniesta',
    nameAr: 'أندريس إنييستا',
    nameEn: 'Andrés Iniesta',
    nickname: 'Don Andrés 🔵🔴',
    celebrationAr: 'فرحة هدف المجد لبرشلونة وفتح الذراعين في الكامب نو',
    celebrationEn: 'Legendary FC Barcelona midfield goal celebration',
    url: '/images/avatars/iniesta.jpg',
  },
  {
    id: 'maradona',
    nameAr: 'دييغو مارادونا',
    nameEn: 'Diego Maradona',
    nickname: 'El Pibe de Oro 🇦🇷',
    celebrationAr: 'صرخة الجنون والفرحة الكروية الأسطورية مونديال 1986',
    celebrationEn: 'Legendary 1986 World Cup ecstatic goal celebration',
    url: '/images/avatars/maradona.jpg',
  },
  {
    id: 'neymar',
    nameAr: 'نيمار جونيور',
    nameEn: 'Neymar Jr',
    nickname: 'Ney 🇧🇷',
    celebrationAr: 'حركة الوجه المرحة واحتفال الهدف البرازيلي الاستعراضي',
    celebrationEn: 'Playful face gesture & Brazil goal celebration',
    url: '/images/avatars/neymar.jpg',
  },
  {
    id: 'modric',
    nameAr: 'لوكا مودريتش',
    nameEn: 'Luka Modrić',
    nickname: 'Maestro 🇭🇷',
    celebrationAr: 'صرخة الفرحة وانزلاق الركبة الملحمي مع كرواتيا',
    celebrationEn: 'Emotional knee-slide victory roar',
    url: '/images/avatars/modric.jpg',
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
                  ? 'اختر لقطة احتفال أسطورية بالهدف (بدقة 8K) أو ارفع صورتك الخاصة'
                  : 'Choose an iconic goal celebration avatar (8K) or upload your own photo'}
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
            src={avatarPreview || '/images/avatars/messi.jpg'}
            alt="Preview"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E5B869] shadow-md shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/avatars/messi.jpg';
            }}
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white block truncate">{currentUser.name}</span>
              {selectedLegend && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5B869]/20 text-[#F5D794] border border-[#E5B869]/40">
                  <Sparkles className="w-3 h-3 text-[#E5B869]" />
                  {language === 'ar' ? selectedLegend.nameAr : selectedLegend.nameEn}
                </span>
              )}
            </div>

            {selectedLegend ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300/90 bg-[#0E4836]/60 px-2.5 py-1 rounded-xl border border-[#E5B869]/20">
                <Flame className="w-3.5 h-3.5 text-[#E5B869] shrink-0" />
                <span className="truncate">
                  {language === 'ar' ? selectedLegend.celebrationAr : selectedLegend.celebrationEn}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-emerald-300/70 block">
                {language === 'ar'
                  ? 'تظهر في بطاقة اللاعب، تشكيلات المباريات، والتعليقات الحية.'
                  : 'Visible in player card, match formations, and live chat.'}
              </span>
            )}
          </div>
        </div>

        {/* 10 Football Legends Selection */}
        <div className="space-y-2.5">
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
                      ? 'bg-[#0E4836] border-[#E5B869] ring-2 ring-[#E5B869]/60 shadow-xl shadow-amber-950/40 scale-[1.03]'
                      : 'bg-[#081813]/80 border-[#E5B869]/15 hover:border-[#E5B869]/60 hover:bg-[#0E4836]/40'
                  }`}
                  title={`${language === 'ar' ? legend.nameAr : legend.nameEn} - ${
                    language === 'ar' ? legend.celebrationAr : legend.celebrationEn
                  }`}
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-1 shadow-sm">
                    <img
                      src={legend.url}
                      alt={legend.nameEn}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {isSelected ? (
                      <div className="absolute inset-0 bg-[#E5B869]/25 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-[#E5B869] text-slate-950 flex items-center justify-center shadow-lg">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-0.5 rounded-md bg-black/60 text-[#E5B869]">
                          <Flame className="w-2.5 h-2.5" />
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

