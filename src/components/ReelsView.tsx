import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Share2,
  Trash2,
  Plus,
  Video,
  Sparkles,
  MapPin,
  Calendar,
  Eye,
  Film,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  MessageCircle,
  ChevronDown,
  Check,
  Search,
  Building2,
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { FootballReel, ReelCategory, isSuperAdminEmail } from '../types';
import { MOROCCAN_CITIES_LOCALIZED } from '../lib/translations';
import { mediaStorage } from '../lib/mediaStorage';

export interface MoroccanCityItem {
  id: string;
  nameAr: string;
  nameEn: string;
}

export const MOROCCAN_CITIES_LIST: MoroccanCityItem[] = [
  { id: 'Casablanca', nameAr: 'الدار البيضاء', nameEn: 'Casablanca' },
  { id: 'Rabat', nameAr: 'الرباط', nameEn: 'Rabat' },
  { id: 'Marrakech', nameAr: 'مراكش', nameEn: 'Marrakech' },
  { id: 'Tangier', nameAr: 'طنجة', nameEn: 'Tangier' },
  { id: 'Agadir', nameAr: 'أكادير', nameEn: 'Agadir' },
  { id: 'Fes', nameAr: 'فاس', nameEn: 'Fes' },
  { id: 'Kenitra', nameAr: 'القنيطرة', nameEn: 'Kenitra' },
  { id: 'Tetouan', nameAr: 'تطوان', nameEn: 'Tetouan' },
  { id: 'Mohammedia', nameAr: 'المحمدية', nameEn: 'Mohammedia' },
  { id: 'El Jadida', nameAr: 'الجديدة', nameEn: 'El Jadida' },
  { id: 'Meknes', nameAr: 'مكناس', nameEn: 'Meknes' },
  { id: 'Oujda', nameAr: 'وجدة', nameEn: 'Oujda' },
  { id: 'Nador', nameAr: 'الناظور', nameEn: 'Nador' },
  { id: 'Beni Mellal', nameAr: 'بني ملال', nameEn: 'Beni Mellal' },
  { id: 'Safi', nameAr: 'آسفي', nameEn: 'Safi' },
  { id: 'Laayoune', nameAr: 'العيون', nameEn: 'Laayoune' },
  { id: 'Essaouira', nameAr: 'الصويرة', nameEn: 'Essaouira' },
];

export const matchCityHelper = (reelCity: string | undefined, filterCity: string): boolean => {
  if (!filterCity || filterCity === 'all') return true;
  if (!reelCity) return false;
  const rc = reelCity.trim().toLowerCase();
  const fc = filterCity.trim().toLowerCase();
  if (rc === fc) return true;

  const foundFilter = MOROCCAN_CITIES_LIST.find(
    (c) => c.id.toLowerCase() === fc || c.nameAr.toLowerCase() === fc || c.nameEn.toLowerCase() === fc
  );
  if (foundFilter) {
    if (
      rc === foundFilter.id.toLowerCase() ||
      rc === foundFilter.nameAr.toLowerCase() ||
      rc === foundFilter.nameEn.toLowerCase()
    ) {
      return true;
    }
  }

  const foundReel = MOROCCAN_CITIES_LIST.find(
    (c) => c.id.toLowerCase() === rc || c.nameAr.toLowerCase() === rc || c.nameEn.toLowerCase() === rc
  );
  if (foundReel) {
    if (
      fc === foundReel.id.toLowerCase() ||
      fc === foundReel.nameAr.toLowerCase() ||
      fc === foundReel.nameEn.toLowerCase()
    ) {
      return true;
    }
  }

  return false;
};

interface ReelsViewProps {
  onOpenMatch?: (matchId: string) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({ onOpenMatch }) => {
  const {
    reels,
    currentUser,
    addReel,
    deleteReel,
    toggleLikeReel,
    incrementReelViews,
    matches,
  } = usePitchStore();

  // Active playing video ID (only 1 video plays at a time for maximum 60fps fluidity)
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Professional City Selector Dropdown State
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement | null>(null);

  // Modals & States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fullscreenReelIndex, setFullscreenReelIndex] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [videoPlaybackErrors, setVideoPlaybackErrors] = useState<Record<string, boolean>>({});

  // New Reel Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<ReelCategory>('goal');
  const [newCity, setNewCity] = useState(currentUser.city || 'الدار البيضاء');
  const [newMatchId, setNewMatchId] = useState('');
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'url'>('upload');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [uploadedVideoBlobUrl, setUploadedVideoBlobUrl] = useState<string | null>(null);
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [extractedThumbnail, setExtractedThumbnail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Close city dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    if (isCityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCityDropdownOpen]);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Label for the active city in UI
  const selectedCityLabel = useMemo(() => {
    if (selectedCity === 'all') return 'كل المدن';
    const found = MOROCCAN_CITIES_LIST.find(
      (c) => c.id === selectedCity || c.nameAr === selectedCity || c.nameEn === selectedCity
    );
    return found ? found.nameAr : selectedCity;
  }, [selectedCity]);

  // Count reels in specific city
  const getCityReelsCount = (cityQuery: string) => {
    return reels.filter((r) => matchCityHelper(r.cityName, cityQuery)).length;
  };

  // Filtered Cities for search inside dropdown
  const filteredCitiesForDropdown = useMemo(() => {
    if (!citySearchQuery.trim()) return MOROCCAN_CITIES_LIST;
    const q = citySearchQuery.toLowerCase().trim();
    return MOROCCAN_CITIES_LIST.filter(
      (c) => c.nameAr.includes(q) || c.nameEn.toLowerCase().includes(q)
    );
  }, [citySearchQuery]);

  // Filtered Reels
  const filteredReels = useMemo(() => {
    return reels.filter((r) => {
      const matchCat = selectedCategory === 'all' || r.category === selectedCategory;
      const matchCity = matchCityHelper(r.cityName, selectedCity);
      const matchQuery =
        !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.authorName && r.authorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchCity && matchQuery;
    });
  }, [reels, selectedCategory, selectedCity, searchQuery]);

  // Handle Play/Pause in feed
  const handleTogglePlay = (reelId: string) => {
    if (activePlayingId === reelId) {
      setActivePlayingId(null);
    } else {
      setActivePlayingId(reelId);
      incrementReelViews(reelId);
    }
  };

  // Handle Like
  const handleLike = (reelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleLikeReel(reelId);
  };

  // Handle WhatsApp Share
  const handleShare = (reel: FootballReel, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `⚽ شاهد هذا الهدف الرائع على منصة GoMatch FC!\n"${reel.title}" بواسطة ${reel.authorName}\n#GoMatch #MoroccoFootball`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  // Check admin/owner permission to delete
  const canDeleteReel = (reel: FootballReel) => {
    if (!currentUser) return false;
    return (
      reel.authorId === currentUser.id ||
      reel.authorEmail === currentUser.email ||
      currentUser.isAdmin ||
      isSuperAdminEmail(currentUser.email)
    );
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const ok = await deleteReel(deleteConfirmId);
    if (ok) {
      showToast('تم حذف الفيديو بنجاح');
      if (activePlayingId === deleteConfirmId) {
        setActivePlayingId(null);
      }
    }
    setDeleteConfirmId(null);
  };

  // Video File selection & automatic thumbnail capture from canvas
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limit check (max 35MB)
    const maxBytes = 35 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError('حجم الفيديو كبير جداً. الحد الأقصى المسموح به هو 35 ميغابايت لضمان سرعة التطبيق.');
      return;
    }

    setUploadedVideoFile(file);
    const blobUrl = URL.createObjectURL(file);
    setUploadedVideoBlobUrl(blobUrl);

    // Generate lightweight thumbnail poster at 0.5 second mark
    const tempVideo = document.createElement('video');
    tempVideo.src = blobUrl;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.currentTime = 0.5;

    tempVideo.onloadeddata = () => {
      tempVideo.currentTime = 0.5;
    };

    tempVideo.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = (tempVideo.videoHeight / tempVideo.videoWidth) * 480 || 270;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setExtractedThumbnail(thumbDataUrl);
        }
      } catch {
        // Fallback: no thumbnail
      }
    };
  };

  // Submit New Reel
  const handleSubmitReel = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!newTitle.trim()) {
      setUploadError('يرجى كتابة عنوان جذاب للفيديو');
      return;
    }

    if (videoSourceType === 'upload' && !uploadedVideoFile && !uploadedVideoBlobUrl) {
      setUploadError('يرجى اختيار ملف فيديو لرفعه');
      return;
    }

    if (videoSourceType === 'url' && !videoUrlInput.trim()) {
      setUploadError('يرجى إدخال رابط فيديو صالح');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalVideoUrl = '';

      if (videoSourceType === 'upload' && uploadedVideoFile) {
        // Upload video file directly to the backend disk so all users across devices can stream it!
        const uploadResult = await mediaStorage.uploadVideo(uploadedVideoFile);
        if (uploadResult.success && uploadResult.videoUrl) {
          finalVideoUrl = uploadResult.videoUrl;
        } else {
          // Fallback to blob URL if network save failed
          finalVideoUrl = uploadedVideoBlobUrl || '';
        }
      } else {
        finalVideoUrl = videoUrlInput.trim();
      }

      if (!finalVideoUrl) {
        throw new Error('فشل معالجة الفيديو، يرجى المحاولة مرة أخرى');
      }

      const selectedMatch = matches.find((m) => m.id === newMatchId);

      await addReel({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        videoUrl: finalVideoUrl,
        thumbnailUrl:
          extractedThumbnail ||
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
        category: newCategory,
        authorId: currentUser.id,
        authorName: currentUser.name || 'لاعب كروي',
        authorAvatar: currentUser.avatarUrl,
        authorEmail: currentUser.email,
        cityName: newCity,
        matchId: selectedMatch?.id,
        matchTitle: selectedMatch?.title,
      });

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setUploadedVideoBlobUrl(null);
      setUploadedVideoFile(null);
      setExtractedThumbnail(null);
      setVideoUrlInput('');
      setNewMatchId('');
      setIsUploadModalOpen(false);
      showToast('تم نشر الهدف بنجاح! ⚽🔥 سيظهر الآن لجميع اللاعبين فوراً');
    } catch (err: any) {
      setUploadError(err.message || 'حدث خطأ أثناء حفظ الفيديو');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fullscreen Reel Navigation
  const currentFullscreenReel = fullscreenReelIndex !== null ? filteredReels[fullscreenReelIndex] : null;

  const handleNextFullscreen = () => {
    if (fullscreenReelIndex === null) return;
    if (fullscreenReelIndex < filteredReels.length - 1) {
      setFullscreenReelIndex(fullscreenReelIndex + 1);
    } else {
      setFullscreenReelIndex(0); // loop back
    }
  };

  const handlePrevFullscreen = () => {
    if (fullscreenReelIndex === null) return;
    if (fullscreenReelIndex > 0) {
      setFullscreenReelIndex(fullscreenReelIndex - 1);
    } else {
      setFullscreenReelIndex(filteredReels.length - 1); // loop to end
    }
  };

  // Category Badge Label & Icon with Moroccan Theme Colors
  const getCategoryMeta = (cat: ReelCategory) => {
    switch (cat) {
      case 'goal':
        return { label: 'هدف صاروخي', color: 'bg-[#0E4836] text-[#F5D794] border-[#E5B869]/40' };
      case 'skill':
        return { label: 'مهارة ومراوغة', color: 'bg-[#0A2E22] text-[#E5B869] border-[#E5B869]/30' };
      case 'save':
        return { label: 'تصدٍّ أسطوري', color: 'bg-[#081813] text-emerald-300 border-emerald-500/30' };
      case 'funny':
        return { label: 'لقطة طريفة', color: 'bg-[#28180A] text-amber-300 border-[#E5B869]/30' };
      default:
        return { label: 'لقطة كروية', color: 'bg-[#0E4836] text-[#F5D794] border-[#E5B869]/40' };
    }
  };

  return (
    <div id="reels-view" className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0E4836] text-[#F5D794] px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold border border-[#E5B869] animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#E5B869]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner - Royal Moroccan Emerald & Gold */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#081813] via-[#0A3A2A] to-[#081813] border border-[#E5B869]/35 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#E5B869]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-[#0E4836]/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] text-xs font-black uppercase tracking-wider mb-2">
              <Film className="w-3.5 h-3.5 text-[#E5B869]" />
              <span>أهداف وريلز لاعبي المغرب • سرعة وأداء 60fps</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>أهداف ولقطات كروية</span>
              <span className="text-[#F5D794]">Reels</span>
              <span className="text-xs md:text-sm font-bold px-2.5 py-1 bg-[#0E4836] text-[#F5D794] rounded-xl border border-[#E5B869]/40">
                {filteredReels.length} مقطع
              </span>
            </h1>
            <p className="text-emerald-200/90 text-sm md:text-base mt-1.5 max-w-2xl">
              شارك لحظاتك الكروية الخالدة، أهداف الدقيقة 90، مهاراتك الفردية، وتصديات الحراس في ملاعب المغرب.
              مصممة بأعلى معايير الخفة والسرعة 60fps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {filteredReels.length > 0 && (
              <button
                id="reels-fullscreen-view-btn"
                type="button"
                onClick={() => setFullscreenReelIndex(0)}
                className="px-4 py-2.5 rounded-xl bg-[#0B211A] hover:bg-[#0E2C22] text-[#F5D794] border border-[#E5B869]/35 font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
              >
                <Film className="w-4 h-4 text-[#E5B869]" />
                <span>مشاهدة كـ Reels</span>
              </button>
            )}

            <button
              id="reels-publish-btn"
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/40 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>نشر هدف أو لقطة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`space-y-3 relative ${isCityDropdownOpen ? 'z-40' : 'z-20'}`}>
        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: 'جميع المقاطع' },
            { id: 'goal', label: 'الأهداف 🚀' },
            { id: 'skill', label: 'مهارات ومراوغات 🪄' },
            { id: 'save', label: 'تصديات الحراس 🧤' },
            { id: 'funny', label: 'طرائف وضحك 😂' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black shadow-lg shadow-amber-950/30 border-[#F5D794]'
                  : 'bg-[#0B211A] text-emerald-200/80 border-[#E5B869]/20 hover:text-[#F5D794] hover:border-[#E5B869]/40 hover:bg-[#0E2C22]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Secondary Bar: City Filter + Search + Sound Toggle */}
        <div className={`relative ${isCityDropdownOpen ? 'z-50' : 'z-20'} flex flex-wrap items-center justify-between gap-3 bg-[#081813]/95 backdrop-blur-md border border-[#E5B869]/25 rounded-2xl p-3 shadow-xl`}>
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="ابحث عن هدف، مهارة، أو لاعب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#061410] border border-[#E5B869]/20 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-emerald-300/40 focus:outline-none focus:border-[#E5B869]"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Professional Moroccan City Selector Dropdown */}
            <div className={`relative ${isCityDropdownOpen ? 'z-[60]' : 'z-20'}`} ref={cityDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-sm ${
                  isCityDropdownOpen
                    ? 'bg-[#0E4836] text-[#F5D794] border-[#E5B869] shadow-amber-900/30 ring-2 ring-[#E5B869]/40'
                    : selectedCity !== 'all'
                    ? 'bg-[#0E4836]/90 text-[#F5D794] border-[#E5B869]/60 hover:border-[#E5B869]'
                    : 'bg-[#061410] text-[#F5D794] border-[#E5B869]/30 hover:border-[#E5B869]/60 hover:bg-[#0E2C22]'
                }`}
                aria-expanded={isCityDropdownOpen}
                aria-label="تصفية مقاطع الفيديو حسب المدينة المغربية"
              >
                <MapPin className="w-3.5 h-3.5 text-[#E5B869] shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-[140px]">{selectedCityLabel}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[#081813] text-[#F5D794] border border-[#E5B869]/40 min-w-[18px] text-center">
                  {selectedCity === 'all' ? reels.length : filteredReels.length}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#E5B869] transition-transform duration-200 shrink-0 ${
                    isCityDropdownOpen ? 'rotate-180 text-[#F5D794]' : ''
                  }`}
                />
              </button>

              {/* Custom Professional Dropdown Menu */}
              {isCityDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-[#081813] border-2 border-[#E5B869]/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2.5 z-[70] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between px-2.5 py-1 text-xs font-bold text-[#F5D794] border-b border-[#E5B869]/15 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#E5B869]" />
                      <span>اختر المدينة المغربية</span>
                    </span>
                    <span className="text-[10px] text-emerald-300/70 font-semibold">المملكة المغربية 🇲🇦</span>
                  </div>

                  {/* Search inside Dropdown */}
                  <div className="relative my-2">
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#E5B869]/60" />
                    <input
                      type="text"
                      placeholder="بحث سريع عن مدينة..."
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      className="w-full bg-[#05110D] border border-[#E5B869]/25 rounded-xl pr-8 pl-7 py-1.5 text-xs text-white placeholder-emerald-300/40 focus:outline-none focus:border-[#E5B869]"
                      autoFocus
                    />
                    {citySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCitySearchQuery('')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Option: All Moroccan Cities */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity('all');
                      setIsCityDropdownOpen(false);
                      setCitySearchQuery('');
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      selectedCity === 'all'
                        ? 'bg-gradient-to-r from-[#0E4836] to-[#14533D] text-[#F5D794] border-[#E5B869]/70 font-black shadow-md'
                        : 'text-slate-200 hover:text-[#F5D794] hover:bg-[#0E2C22] border-transparent hover:border-[#E5B869]/25'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇲🇦</span>
                      <div className="text-right">
                        <span className="font-bold block text-xs">كل المدن المغربية</span>
                        <span className="text-[10px] text-emerald-200/60 block">عرض جميع اللقطات والأهداف</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#05110D] text-[#F5D794] border border-[#E5B869]/30">
                        {reels.length} مقطع
                      </span>
                      {selectedCity === 'all' && <Check className="w-4 h-4 text-[#F5D794] shrink-0" />}
                    </div>
                  </button>

                  <div className="h-px bg-[#E5B869]/15 my-1.5" />

                  {/* Scrollable Cities List */}
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredCitiesForDropdown.length === 0 ? (
                      <div className="text-center py-4 text-xs text-emerald-200/60">
                        لم يتم العثور على مدينة بهذا الاسم
                      </div>
                    ) : (
                      filteredCitiesForDropdown.map((c) => {
                        const isSelected =
                          selectedCity === c.id ||
                          selectedCity === c.nameAr ||
                          selectedCity === c.nameEn;
                        const count = getCityReelsCount(c.id);

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCity(c.nameAr);
                              setIsCityDropdownOpen(false);
                              setCitySearchQuery('');
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#0E4836] to-[#14533D] text-[#F5D794] border-[#E5B869]/70 font-black shadow-md'
                                : 'text-slate-200 hover:text-[#F5D794] hover:bg-[#0E2C22] border-transparent hover:border-[#E5B869]/25'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSelected ? 'text-[#F5D794]' : 'text-[#E5B869]'
                                }`}
                              />
                              <div className="text-right flex items-center gap-1.5">
                                <span className="font-bold">{c.nameAr}</span>
                                <span className="text-[10px] text-emerald-200/50">({c.nameEn})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {count > 0 ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#05110D] text-[#F5D794] border border-[#E5B869]/30">
                                  {count} {count === 1 ? 'هدف' : 'أهداف'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-200/40 px-1">0</span>
                              )}
                              {isSelected && <Check className="w-4 h-4 text-[#F5D794] shrink-0" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Global sound toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-[#061410] hover:bg-[#0E2C22] border border-[#E5B869]/20 text-[#F5D794] transition cursor-pointer"
              title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#E5B869]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Reels Grid */}
      <div className="relative z-10">
        {filteredReels.length === 0 ? (
          <div className="bg-[#081813]/90 border border-[#E5B869]/25 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#0E4836] border border-[#E5B869]/40 flex items-center justify-center mx-auto mb-4 text-[#F5D794]">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">لا توجد مقاطع فيديو مطابقة</h3>
            <p className="text-emerald-200/70 text-xs sm:text-sm mb-6">
              كن أول من يرفع مقطع هدف أو مهارة كروية وشاركها مع لاعبي مدينتك!
            </p>
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>رفع أول فيديو الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredReels.map((reel, index) => {
              const isPlaying = activePlayingId === reel.id;
              const isLiked = (reel.likes || []).includes(currentUser.id);
              const meta = getCategoryMeta(reel.category);
              const isAuthorOrAdmin = canDeleteReel(reel);

              return (
                <div
                  key={reel.id}
                  className="group relative broadcast-card rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1"
                >
                  {/* Top accent glow line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] opacity-70 group-hover:opacity-100 transition-opacity z-10" />
                  {/* Media Container */}
                  <div className="relative aspect-[9/14] bg-black overflow-hidden flex items-center justify-center">
                    {isPlaying ? (
                      videoPlaybackErrors[reel.id] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-900 text-white">
                          <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
                          <p className="text-xs font-bold mb-1">تعذر تشغيل الفيديو مباشرة</p>
                          <p className="text-[11px] text-slate-400 mb-3">قد تكون صيغة الفيديو غير مدعومة من هذا المتصفح</p>
                          <a
                            href={reel.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-[#E5B869] text-[#05110D] font-bold px-3 py-1.5 rounded-lg hover:bg-[#F5D794] transition"
                          >
                            فتح الفيديو في نافذة جديدة ↗
                          </a>
                          <button
                            onClick={() => {
                              setVideoPlaybackErrors((prev) => ({ ...prev, [reel.id]: false }));
                              setActivePlayingId(null);
                            }}
                            className="text-[11px] text-slate-400 hover:text-white mt-2 underline"
                          >
                            إغلاق
                          </button>
                        </div>
                      ) : (
                        <video
                          ref={videoPlayerRef}
                          src={reel.videoUrl}
                          controls
                          autoPlay
                          muted={isMuted}
                          playsInline
                          loop
                          preload="metadata"
                          className="w-full h-full object-cover"
                          onError={() => {
                            console.warn(`[ReelsView] Failed to play video: ${reel.videoUrl}`);
                            setVideoPlaybackErrors((prev) => ({ ...prev, [reel.id]: true }));
                          }}
                          onEnded={() => setActivePlayingId(null)}
                        />
                      )
                    ) : (
                      <div
                        onClick={() => handleTogglePlay(reel.id)}
                        className="w-full h-full cursor-pointer relative group/thumb"
                      >
                        <img
                          src={reel.thumbnailUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'}
                          alt={reel.title}
                          className="w-full h-full object-cover transition duration-300 group-hover/thumb:scale-105"
                          loading="lazy"
                        />
                        {/* Dark Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/30 to-black/20" />

                        {/* Play Center Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition transform group-hover/thumb:scale-110">
                            <Play className="w-6 h-6 ml-0.5 fill-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md ${meta.color}`}>
                        {meta.label}
                      </span>

                      {reel.cityName && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 backdrop-blur-md text-slate-200 border border-white/10 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{reel.cityName}</span>
                        </span>
                      )}
                    </div>

                    {/* Bottom overlay in thumbnail */}
                    {!isPlaying && (
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90 pointer-events-none">
                        <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-[11px]">
                          <Eye className="w-3 h-3 text-slate-300" />
                          <span>{reel.viewsCount || 1}</span>
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenReelIndex(index);
                          }}
                          className="pointer-events-auto p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition"
                          title="عرض ملء الشاشة"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Author Info */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={reel.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'}
                            alt={reel.authorName}
                            className="w-7 h-7 rounded-full object-cover border border-[#E5B869]/40 shadow-sm"
                          />
                          <div className="leading-tight">
                            <span className="text-xs font-bold text-[#F5D794] block truncate max-w-[130px]">
                              {reel.authorName}
                            </span>
                            {reel.authorEmail === 'moustafa325476@gmail.com' && (
                              <span className="text-[10px] text-[#F5D794] bg-[#0E4836] border border-[#E5B869]/40 px-1 rounded font-bold inline-block">
                                مشرف عام
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete Button for Owner or Admin */}
                        {isAuthorOrAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(reel.id)}
                            className="text-slate-400 hover:text-rose-400 p-1 rounded transition cursor-pointer"
                            title="حذف الفيديو"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-black text-sm text-white line-clamp-2 mb-1 group-hover:text-[#F5D794] transition-colors">
                        {reel.title}
                      </h4>

                      {/* Description */}
                      {reel.description && (
                        <p className="text-emerald-200/70 text-xs line-clamp-2 mb-2 leading-relaxed">
                          {reel.description}
                        </p>
                      )}

                      {/* Match Link Tag if associated */}
                      {reel.matchTitle && (
                        <button
                          type="button"
                          onClick={() => reel.matchId && onOpenMatch && onOpenMatch(reel.matchId)}
                          className="inline-flex items-center gap-1.5 text-[11px] text-[#F5D794] bg-[#0E4836]/60 hover:bg-[#0E4836] px-2.5 py-1 rounded-lg border border-[#E5B869]/30 mb-3 transition cursor-pointer"
                        >
                          <Calendar className="w-3 h-3 text-[#E5B869]" />
                          <span className="truncate max-w-[180px] font-bold">{reel.matchTitle}</span>
                        </button>
                      )}
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-3 border-t border-[#E5B869]/15 flex items-center justify-between text-xs mt-2">
                      {/* Like button */}
                      <button
                        type="button"
                        onClick={(e) => handleLike(reel.id, e)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer border ${
                          isLiked
                            ? 'text-rose-400 bg-rose-950/60 border-rose-500/40'
                            : 'text-emerald-200/80 hover:text-rose-400 bg-[#071510] hover:bg-[#0E2C22] border-[#E5B869]/20'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400' : ''}`} />
                        <span className="font-bold">{(reel.likes || []).length}</span>
                      </button>

                      {/* Play/Pause Button in card */}
                      <button
                        type="button"
                        onClick={() => handleTogglePlay(reel.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0E4836] hover:bg-[#125842] border border-[#E5B869]/30 text-[#F5D794] transition font-bold cursor-pointer"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                            <span>إيقاف</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-[#E5B869] fill-[#E5B869]" />
                            <span>تشغيل</span>
                          </>
                        )}
                      </button>

                      {/* Share WhatsApp */}
                      <button
                        type="button"
                        onClick={(e) => handleShare(reel, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-emerald-200/80 hover:text-[#F5D794] bg-[#071510] hover:bg-[#0E2C22] border border-[#E5B869]/20 transition cursor-pointer"
                        title="مشاركة على واتساب"
                      >
                        <Share2 className="w-3.5 h-3.5 text-[#E5B869]" />
                        <span className="font-semibold">مشاركة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULLSCREEN IMMERSIVE REELS PLAYER MODAL */}
      {currentFullscreenReel && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4">
          <div className="relative w-full h-full max-w-md bg-slate-950 sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
            {/* Top Bar Controls */}
            <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
              <button
                onClick={() => setFullscreenReelIndex(null)}
                className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm transition"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-slate-300" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Video Canvas */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              {videoPlaybackErrors[currentFullscreenReel.id] ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-white z-10">
                  <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
                  <h4 className="text-base font-bold mb-1">تعذر تشغيل هذا الفيديو على المتصفح الحالي</h4>
                  <p className="text-xs text-slate-300 max-w-sm mb-4">
                    قد تكون صيغة الفيديو (مثل QuickTime/MOV) تتطلب مشغل النظام المباشر
                  </p>
                  <a
                    href={currentFullscreenReel.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-[#E5B869] text-[#05110D] font-bold px-4 py-2.5 rounded-xl hover:bg-[#F5D794] transition shadow-lg text-sm"
                  >
                    <span>مشاهدة الفيديو في نافذة مستقلة</span>
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <video
                  key={currentFullscreenReel.id}
                  src={currentFullscreenReel.videoUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.warn(`[ReelsView Fullscreen] Error playing ${currentFullscreenReel.videoUrl}`);
                    setVideoPlaybackErrors((prev) => ({ ...prev, [currentFullscreenReel.id]: true }));
                  }}
                />
              )}

              {/* Side Floating Actions (Like, Share, etc.) */}
              <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-5">
                {/* Like Button */}
                <button
                  onClick={() => handleLike(currentFullscreenReel.id)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition transform active:scale-90 ${
                      (currentFullscreenReel.likes || []).includes(currentUser.id)
                        ? 'bg-rose-500/80 text-white'
                        : 'bg-black/60 text-white hover:bg-black/80'
                    }`}
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        (currentFullscreenReel.likes || []).includes(currentUser.id) ? 'fill-white' : ''
                      }`}
                    />
                  </div>
                  <span className="text-white text-xs font-bold drop-shadow">
                    {(currentFullscreenReel.likes || []).length}
                  </span>
                </button>

                {/* WhatsApp Share */}
                <button
                  onClick={() => handleShare(currentFullscreenReel)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-white text-xs font-bold drop-shadow">مشاركة</span>
                </button>

                {/* Delete if allowed */}
                {canDeleteReel(currentFullscreenReel) && (
                  <button
                    onClick={() => setDeleteConfirmId(currentFullscreenReel.id)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-600/60 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </div>
                  </button>
                )}
              </div>

              {/* Bottom Reel Details */}
              <div className="absolute left-4 right-16 bottom-6 z-20 text-white text-right">
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={currentFullscreenReel.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80'}
                    alt={currentFullscreenReel.authorName}
                    className="w-8 h-8 rounded-full border border-white/30 object-cover"
                  />
                  <div>
                    <h5 className="font-bold text-sm drop-shadow">{currentFullscreenReel.authorName}</h5>
                    {currentFullscreenReel.cityName && (
                      <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{currentFullscreenReel.cityName}</span>
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-bold text-base leading-tight mb-1 drop-shadow">
                  {currentFullscreenReel.title}
                </h4>

                {currentFullscreenReel.description && (
                  <p className="text-xs text-slate-200 drop-shadow line-clamp-2 mb-2">
                    {currentFullscreenReel.description}
                  </p>
                )}

                {currentFullscreenReel.matchTitle && (
                  <div className="inline-block bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full">
                    ⚽ {currentFullscreenReel.matchTitle}
                  </div>
                )}
              </div>

              {/* Left/Right navigation arrows */}
              <button
                onClick={handlePrevFullscreen}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center z-20 backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNextFullscreen}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center z-20 backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD / PUBLISH NEW REEL MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#081813] border border-[#E5B869]/35 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5B869]/20 flex items-center justify-between bg-[#0A261D]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/40">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">نشر هدف أو لقطة كروية</h3>
                  <p className="text-xs text-emerald-200/70">شارك أفضل لحظاتك مع مجتمع لاعبي كرة القدم بالمغرب</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReel} className="p-5 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#F5D794] mb-1">
                  عنوان اللقطة أو الهدف <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: هدف صاروخي على الطاير في الدقيقة 90 ⚽🔥"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#05110D] border border-[#E5B869]/25 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-emerald-300/40 focus:outline-none focus:border-[#E5B869]"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  وصف اللقطة (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="أين سُجل الهدف، تفاصيل التمريرة، أو أبطال اللقطة..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#05110D] border border-[#E5B869]/25 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-emerald-300/40 focus:outline-none focus:border-[#E5B869] resize-none"
                />
              </div>

              {/* Category & City in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#F5D794] mb-1">
                    نوع اللقطة <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ReelCategory)}
                    className="w-full bg-[#05110D] border border-[#E5B869]/25 rounded-xl px-3 py-2.5 text-sm text-[#F5D794] focus:outline-none focus:border-[#E5B869] cursor-pointer"
                  >
                    <option value="goal" className="bg-[#081813] text-white">هدف رائع 🚀</option>
                    <option value="skill" className="bg-[#081813] text-white">مهارة ومراوغة 🪄</option>
                    <option value="save" className="bg-[#081813] text-white">تصدٍّ حارس مرمى 🧤</option>
                    <option value="funny" className="bg-[#081813] text-white">لقطة طريفة 😂</option>
                    <option value="other" className="bg-[#081813] text-white">أخرى ⚽</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#F5D794] mb-1">
                    المدينة <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-[#05110D] border border-[#E5B869]/25 rounded-xl px-3 py-2.5 text-sm text-[#F5D794] focus:outline-none focus:border-[#E5B869] cursor-pointer"
                  >
                    {MOROCCAN_CITIES_LIST.map((city) => (
                      <option key={city.id} value={city.nameAr} className="bg-[#081813] text-white">
                        {city.nameAr} ({city.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Video Source Switcher */}
              <div>
                <label className="block text-xs font-bold text-[#F5D794] mb-1.5">
                  مصدر الفيديو <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setVideoSourceType('upload')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      videoSourceType === 'upload'
                        ? 'bg-[#0E4836] text-[#F5D794] border-[#E5B869]'
                        : 'bg-[#05110D] text-emerald-200/70 border-[#E5B869]/20 hover:text-[#F5D794]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع ملف فيديو (MP4/WebM)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoSourceType('url')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      videoSourceType === 'url'
                        ? 'bg-[#0E4836] text-[#F5D794] border-[#E5B869]'
                        : 'bg-[#05110D] text-emerald-200/70 border-[#E5B869]/20 hover:text-[#F5D794]'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>رابط فيديو مباشر</span>
                  </button>
                </div>

                {videoSourceType === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E5B869]/30 hover:border-[#E5B869] rounded-2xl p-5 text-center cursor-pointer bg-[#05110D]/70 transition group"
                    >
                      {uploadedVideoBlobUrl ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-[#E5B869] mx-auto" />
                          <p className="text-xs font-bold text-[#F5D794]">تم اختيار الفيديو بنجاح!</p>
                          {extractedThumbnail && (
                            <div className="w-24 h-16 mx-auto rounded-lg overflow-hidden border border-[#E5B869]/40 mt-2">
                              <img src={extractedThumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-[11px] text-emerald-200/60">انقر لتغيير الملف</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-7 h-7 text-[#E5B869]/60 group-hover:text-[#F5D794] mx-auto transition" />
                          <p className="text-xs font-bold text-slate-200">
                            انقر لاختيار فيديو من هاتفك أو حاسوبك
                          </p>
                          <p className="text-[11px] text-emerald-200/60">
                            صيغ MP4، WebM، MOV (الحد الأقصى 35 ميغابايت)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://.../video.mp4"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      className="w-full bg-[#05110D] border border-[#E5B869]/25 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-emerald-300/40 focus:outline-none focus:border-[#E5B869]"
                    />
                    <p className="text-[11px] text-emerald-200/60 mt-1">
                      أدخل رابط مباشر لملف فيديو MP4 سريع التحميل
                    </p>
                  </div>
                )}
              </div>

              {/* Optional Match Association */}
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  ربط الهدف بمباراة نظمتها أو شاركت بها (اختياري)
                </label>
                <select
                  value={newMatchId}
                  onChange={(e) => setNewMatchId(e.target.value)}
                  className="w-full bg-[#05110D] border border-[#E5B869]/25 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#E5B869] cursor-pointer"
                >
                  <option value="" className="bg-[#081813] text-white">بدون ربط بمباراة محددة</option>
                  {matches.slice(0, 15).map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#081813] text-white">
                      {m.title} ({m.location?.city || 'المغرب'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#E5B869]/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/40 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>جاري النشر...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>نشر اللقطة الآن</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#081813] border border-[#E5B869]/35 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-white mb-1">حذف مقطع الفيديو؟</h4>
            <p className="text-xs text-emerald-200/70 mb-5 leading-relaxed">
              هل أنت متأكد من حذف هذا الهدف أو اللقطة نهائياً من منصة GoMatch؟ لن تتمكن من استرجاعه.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#071510] hover:bg-[#0E2C22] text-slate-300 border border-[#E5B869]/20 transition cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
