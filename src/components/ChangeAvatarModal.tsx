import React, { useState, useRef } from 'react';
import { Camera, Upload, Link, X, Check, Sparkles, Loader2 } from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { mediaStorage } from '../lib/mediaStorage';

const PRESET_AVATARS = [
  { name: 'Captain Striker', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { name: 'Playmaker', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { name: 'Winger Pro', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { name: 'Solid Defender', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80' },
  { name: 'Goalkeeper Ace', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80' },
  { name: 'Midfield Maestro', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80' },
];

interface ChangeAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = usePitchStore();
  const { t, language } = useLanguage();
  const [avatarUrlInput, setAvatarUrlInput] = useState(currentUser.avatarUrl);
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
      setUploadError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)' : 'Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(language === 'ar' ? 'حجم الصورة يجب أن لا يتعدى 5 ميغابايت' : 'Image size should be under 5MB');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    try {
      const uploadRes = await mediaStorage.uploadAvatar(file);
      if (uploadRes.success && uploadRes.avatarUrl) {
        setAvatarPreview(uploadRes.avatarUrl);
        setAvatarUrlInput(uploadRes.avatarUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            setAvatarPreview(event.target.result);
            setAvatarUrlInput(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch {
      setUploadError(language === 'ar' ? 'فشل رفع الصورة إلى السحابة.' : 'Cloud upload failed.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="change-avatar-modal"
        className="w-full max-w-md bg-[#0A3A2A] border border-[#E5B869]/35 rounded-3xl p-6 shadow-2xl space-y-5 text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5B869]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0E4836] text-[#F5D794] flex items-center justify-center border border-[#E5B869]/40">
              <Camera className="w-5 h-5 text-[#E5B869]" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-white">
                {t('profile.updateAvatar', 'تغيير الصورة الشخصية')}
              </h3>
              <p className="text-xs text-emerald-300/70">
                {language === 'ar' ? 'قم برفع صورة من جهازك أو وضع رابط صورة مباشر' : 'Set your avatar via file upload or image URL'}
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
            src={avatarPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
            alt="Preview"
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E5B869] shadow-md shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';
            }}
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1">
            <span className="text-xs font-bold text-white block">{currentUser.name}</span>
            <span className="text-[11px] text-emerald-300/70 block">
              {language === 'ar'
                ? 'تظهر في قوائم وتشكيلات المباريات والتعليقات والشريط العلوي.'
                : 'Displayed in match rosters, comments, and top navigation.'}
            </span>
          </div>
        </div>

        {/* Option 1: File Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200">
            {language === 'ar' ? 'رفع صورة من الجهاز' : 'Upload From Device'}
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
                <span>{language === 'ar' ? 'جاري رفع الصورة إلى التخزين السحابي (Firebase)...' : 'Uploading to Cloud Storage (Firebase)...'}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-[#E5B869]" />
                <span>{language === 'ar' ? 'اختيار ملف صورة (JPG, PNG, WebP)' : 'Choose Photo File (JPG, PNG, WebP)'}</span>
              </>
            )}
          </button>
          {uploadError && <p className="text-xs text-rose-400">{uploadError}</p>}
        </div>

        {/* Option 2: Image URL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-emerald-200">
            {language === 'ar' ? 'أو أدخل رابط الصورة المباشر' : 'Or Paste Image URL'}
          </label>
          <div className="relative">
            <Link className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={avatarUrlInput}
              onChange={(e) => {
                setAvatarUrlInput(e.target.value);
                setAvatarPreview(e.target.value);
              }}
              className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
            />
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300/70">
            {language === 'ar' ? 'أو اختر شخصية جاهزة:' : 'Or Choose Soccer Pro:'}
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
                    ? 'border-[#E5B869] ring-2 ring-[#E5B869]/40 scale-105'
                    : 'border-[#0E4836] hover:border-[#E5B869]/60 opacity-80 hover:opacity-100'
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

