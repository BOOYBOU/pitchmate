import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  Plus,
  Shield,
  Zap,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Coins,
  Sparkles,
  Building2,
  Check,
  X,
  Edit2,
  Trash2,
  Car,
  Bath,
  SunMedium,
  Coffee,
  Trophy,
  SlidersHorizontal,
  Info,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { PartnerVenue, VenueBookingSlot } from '../types';
import { MOROCCAN_CITIES_LOCALIZED } from '../lib/translations';
import { getTodayDateString } from '../lib/mockVenues';
import { compressImage } from '../lib/mediaStorage';

interface VenuesViewProps {
  onOrganizeMatchFromSlot?: (venueData: {
    venueName: string;
    city: string;
    address: string;
    date: string;
    time: string;
    format: string;
    totalCost: number;
  }) => void;
}

export const VenuesView: React.FC<VenuesViewProps> = ({ onOrganizeMatchFromSlot }) => {
  const {
    venues,
    currentUser,
    addPartnerVenue,
    updatePartnerVenue,
    deletePartnerVenue,
    addVenueBookingSlot,
    updateVenueBookingSlot,
    deleteVenueBookingSlot,
    batchGenerateVenueSlots,
  } = usePitchStore();

  const { t, language, isRTL, formatMAD } = useLanguage();

  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedTurf, setSelectedTurf] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date for slot viewing
  const todayStr = useMemo(() => getTodayDateString(0), []);
  const tomorrowStr = useMemo(() => getTodayDateString(1), []);
  const [activeDate, setActiveDate] = useState<string>(todayStr);

  // Management Mode (Venue owners / platform admins)
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [managingVenueId, setManagingVenueId] = useState<string | null>(null);

  // Modals
  const [isAddVenueModalOpen, setIsAddVenueModalOpen] = useState(false);
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [activeVenueForSlot, setActiveVenueForSlot] = useState<PartnerVenue | null>(null);
  const [editingSlot, setEditingSlot] = useState<VenueBookingSlot | null>(null);

  // Form State: Add Venue
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueCity, setNewVenueCity] = useState(currentUser.city || 'Casablanca');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [newVenueMapsUrl, setNewVenueMapsUrl] = useState('');
  const [newVenuePhone, setNewVenuePhone] = useState(currentUser.phone || '');
  const [newVenueWhatsapp, setNewVenueWhatsapp] = useState('');
  const [newVenueManager, setNewVenueManager] = useState(currentUser.name || '');
  const [newVenueRate, setNewVenueRate] = useState('500');
  const [newVenueTurf, setNewVenueTurf] = useState<'synthetic_fifa' | 'indoor_hall' | 'natural_grass'>('synthetic_fifa');
  const [newVenueFormats, setNewVenueFormats] = useState<string[]>(['7v7', '5v5']);
  const [newVenueAmenities, setNewVenueAmenities] = useState<string[]>([
    'parking',
    'showers',
    'night_lighting',
    'bibs_balls',
  ]);
  const [newVenueImageUrl, setNewVenueImageUrl] = useState<string>('');
  const [isUploadingVenueImage, setIsUploadingVenueImage] = useState(false);
  const [venueImageError, setVenueImageError] = useState('');
  const venueFileInputRef = React.useRef<HTMLInputElement>(null);

  // Form State: Add/Edit Slot
  const [slotDate, setSlotDate] = useState(todayStr);
  const [slotStartTime, setSlotStartTime] = useState('19:00');
  const [slotEndTime, setSlotEndTime] = useState('20:30');
  const [slotPitchNumber, setSlotPitchNumber] = useState('الملعب 1 (Terrain 1)');
  const [slotFormat, setSlotFormat] = useState('7v7');
  const [slotPrice, setSlotPrice] = useState('500');
  const [slotStatus, setSlotStatus] = useState<'available' | 'booked' | 'maintenance'>('available');
  const [slotNotes, setSlotNotes] = useState('');

  // Form State: Batch Generator
  const [batchDate, setBatchDate] = useState(todayStr);
  const [batchStartHour, setBatchStartHour] = useState(17);
  const [batchEndHour, setBatchEndHour] = useState(24);
  const [batchSlotDuration, setBatchSlotDuration] = useState(90); // minutes
  const [batchPitchNumber, setBatchPitchNumber] = useState('الملعب الرئيسي');
  const [batchFormat, setBatchFormat] = useState('7v7');
  const [batchPrice, setBatchPrice] = useState('500');
  const [batchSuccessMsg, setBatchSuccessMsg] = useState('');

  // Filtered Venues
  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      const matchCity = selectedCity === 'all' || v.city.toLowerCase() === selectedCity.toLowerCase();
      const matchTurf = selectedTurf === 'all' || v.turfType === selectedTurf;
      const matchFormat = selectedFormat === 'all' || (v.formats && v.formats.includes(selectedFormat));
      const matchQuery =
        !searchQuery.trim() ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCity && matchTurf && matchFormat && matchQuery;
    });
  }, [venues, selectedCity, selectedTurf, selectedFormat, searchQuery]);

  // Handle Venue Image Upload
  const handleVenueImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setVenueImageError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setVenueImageError('حجم الصورة يجب أن لا يتعدى 8 ميغابايت');
      return;
    }

    setVenueImageError('');
    setIsUploadingVenueImage(true);

    try {
      const compressed = await compressImage(file, 1200, 800, 0.82);
      setNewVenueImageUrl(compressed.dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewVenueImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingVenueImage(false);
    }
  };

  // Handle Add Venue Submit
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName.trim() || !newVenueAddress.trim()) return;

    await addPartnerVenue({
      name: newVenueName.trim(),
      city: newVenueCity,
      address: newVenueAddress.trim(),
      googleMapsUrl: newVenueMapsUrl.trim() || undefined,
      phone: newVenuePhone.trim() || '+212 6 00 00 00 00',
      whatsapp: newVenueWhatsapp.trim() || undefined,
      managerName: newVenueManager.trim() || currentUser.name,
      managerUserId: currentUser.id,
      managerEmail: currentUser.email,
      formats: newVenueFormats,
      turfType: newVenueTurf,
      hourlyRateMAD: Number(newVenueRate) || 500,
      pitchCount: 2,
      imageUrl: newVenueImageUrl || '/images/stadiums/floodlit_night_arena.jpg',
      amenities: newVenueAmenities,
      openingTime: '09:00',
      closingTime: '01:00',
      isVerifiedPartner: true,
    });

    setIsAddVenueModalOpen(false);
    // Reset
    setNewVenueName('');
    setNewVenueAddress('');
    setNewVenueMapsUrl('');
    setNewVenueImageUrl('');
    setVenueImageError('');
  };

  // Handle Save Slot Submit
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVenueForSlot) return;

    if (editingSlot) {
      await updateVenueBookingSlot(activeVenueForSlot.id, editingSlot.id, {
        date: slotDate,
        startTime: slotStartTime,
        endTime: slotEndTime,
        pitchNumber: slotPitchNumber,
        format: slotFormat,
        priceTotal: Number(slotPrice) || 500,
        status: slotStatus,
        notes: slotNotes.trim() || undefined,
      });
    } else {
      await addVenueBookingSlot(activeVenueForSlot.id, {
        date: slotDate,
        startTime: slotStartTime,
        endTime: slotEndTime,
        pitchNumber: slotPitchNumber,
        format: slotFormat,
        priceTotal: Number(slotPrice) || 500,
        status: slotStatus,
        notes: slotNotes.trim() || undefined,
      });
    }

    setIsAddSlotModalOpen(false);
    setEditingSlot(null);
  };

  // Handle Batch Generator Submit
  const handleRunBatchGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVenueForSlot) return;

    const count = await batchGenerateVenueSlots(
      activeVenueForSlot.id,
      batchDate,
      Number(batchStartHour),
      Number(batchEndHour),
      Number(batchSlotDuration),
      Number(batchPrice) || 500,
      batchFormat,
      batchPitchNumber
    );

    setBatchSuccessMsg(
      language === 'ar'
        ? `تم توليد وإضافة ${count} حصص بنجاح إلى جدول المركب!`
        : `Successfully generated and scheduled ${count} slots!`
    );

    setTimeout(() => {
      setBatchSuccessMsg('');
      setIsBatchModalOpen(false);
    }, 1800);
  };

  // Open slot editor
  const handleOpenAddSlot = (venue: PartnerVenue, slotToEdit?: VenueBookingSlot) => {
    setActiveVenueForSlot(venue);
    if (slotToEdit) {
      setEditingSlot(slotToEdit);
      setSlotDate(slotToEdit.date);
      setSlotStartTime(slotToEdit.startTime);
      setSlotEndTime(slotToEdit.endTime);
      setSlotPitchNumber(slotToEdit.pitchNumber || 'الملعب 1');
      setSlotFormat(slotToEdit.format);
      setSlotPrice(String(slotToEdit.priceTotal));
      setSlotStatus(slotToEdit.status);
      setSlotNotes(slotToEdit.notes || '');
    } else {
      setEditingSlot(null);
      setSlotDate(activeDate);
      setSlotStartTime('19:00');
      setSlotEndTime('20:30');
      setSlotPitchNumber('الملعب 1');
      setSlotFormat(venue.formats[0] || '7v7');
      setSlotPrice(String(venue.hourlyRateMAD || 500));
      setSlotStatus('available');
      setSlotNotes('');
    }
    setIsAddSlotModalOpen(true);
  };

  // Open Batch Generator
  const handleOpenBatchGenerator = (venue: PartnerVenue) => {
    setActiveVenueForSlot(venue);
    setBatchDate(activeDate);
    setBatchFormat(venue.formats[0] || '7v7');
    setBatchPrice(String(venue.hourlyRateMAD || 500));
    setBatchPitchNumber('الملعب 1');
    setIsBatchModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06261c] via-[#093527] to-[#041912] border border-[#E5B869]/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E5B869]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B869]/15 border border-[#E5B869]/40 text-[#F5D794] text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'شبكة الملاعب الشريكة GoMatch' : 'GoMatch Partner Pitches Network'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight leading-tight">
              {t('venues.title')}
            </h1>
            <p className="text-sm text-emerald-200/80 leading-relaxed">
              {t('venues.subtitle')}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              id="toggle-owner-mode-btn"
              type="button"
              onClick={() => setIsOwnerMode(!isOwnerMode)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                isOwnerMode
                  ? 'bg-[#E5B869] text-slate-950 border-[#E5B869] shadow-lg shadow-amber-950/40 font-black'
                  : 'bg-[#0A3A2A]/90 hover:bg-[#0E4836] text-[#F5D794] border-[#E5B869]/40'
              }`}
            >
              <Zap className={`w-4 h-4 ${isOwnerMode ? 'fill-slate-950 text-slate-950' : 'text-[#E5B869]'}`} />
              <span>{t('venues.manageMyVenue')}</span>
              {isOwnerMode && (
                <span className="w-2 h-2 rounded-full bg-emerald-950 animate-ping" />
              )}
            </button>

            <button
              id="open-register-venue-btn"
              type="button"
              onClick={() => setIsAddVenueModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] hover:opacity-95 text-slate-950 text-xs font-black shadow-lg shadow-amber-950/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>{t('venues.addVenueBtn')}</span>
            </button>
          </div>
        </div>

        {/* Quick Venue Owner Notice Banner when Owner Mode is ON */}
        {isOwnerMode && (
          <div className="mt-6 p-4 rounded-2xl bg-[#E5B869]/15 border border-[#E5B869]/40 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#F5D794] shrink-0 mt-0.5" />
            <div className="text-xs text-[#F5D794] leading-relaxed">
              <span className="font-bold">
                {language === 'ar' ? 'وضع أصحاب الملاعب مفعل:' : 'Venue Owner Mode Active:'}
              </span>{' '}
              {language === 'ar'
                ? 'يمكنك الآن إضافة وتعديل حصص الحجز لمركبك، تحويل الحالة إلى "محجوز"، أو استخدام ميزة التوليد التلقائي لملء جدول الأسبوع بضغطة زر واحدة.'
                : 'You can now schedule open slots, toggle slot bookings, or use 1-click schedule generator to populate weekly slots easily.'}
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#081813]/90 border border-[#E5B869]/25 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <input
              id="venue-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'البحث باسم الملعب، الحي، أو المدينة...' : 'Search by pitch name, area, or city...'}
              className="w-full pl-4 pr-10 py-2.5 bg-[#061e16] border border-[#E5B869]/25 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-emerald-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City Filter */}
          <div className="w-full md:w-48">
            <select
              id="venue-city-filter"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#061e16] border border-[#E5B869]/25 rounded-xl text-xs text-[#F5D794] focus:outline-none focus:border-[#E5B869] cursor-pointer"
            >
              <option value="all">{t('venues.allCities')}</option>
              {Object.entries(MOROCCAN_CITIES_LOCALIZED).map(([cityKey, cityData]) => (
                <option key={cityKey} value={cityKey}>
                  {language === 'ar' ? cityData.ar : cityData.en}
                </option>
              ))}
            </select>
          </div>

          {/* Turf Filter */}
          <div className="w-full md:w-48">
            <select
              id="venue-turf-filter"
              value={selectedTurf}
              onChange={(e) => setSelectedTurf(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#061e16] border border-[#E5B869]/25 rounded-xl text-xs text-[#F5D794] focus:outline-none focus:border-[#E5B869] cursor-pointer"
            >
              <option value="all">{t('venues.allTurfs')}</option>
              <option value="synthetic_fifa">{t('venues.syntheticFifa')}</option>
              <option value="indoor_hall">{t('venues.indoorHall')}</option>
              <option value="natural_grass">{t('venues.naturalGrass')}</option>
            </select>
          </div>

          {/* Format Filter */}
          <div className="w-full md:w-36">
            <select
              id="venue-format-filter"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#061e16] border border-[#E5B869]/25 rounded-xl text-xs text-[#F5D794] focus:outline-none focus:border-[#E5B869] cursor-pointer"
            >
              <option value="all">{t('venues.allFormats')}</option>
              <option value="5v5">5v5</option>
              <option value="7v7">7v7</option>
              <option value="8v8">8v8</option>
              <option value="9v9">9v9</option>
              <option value="11v11">11v11</option>
            </select>
          </div>
        </div>

        {/* Date Selector for Viewing Live Slots */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#E5B869]/15">
          <span className="text-xs text-emerald-300/80 font-bold shrink-0 flex items-center gap-1.5 mr-2">
            <Calendar className="w-3.5 h-3.5 text-[#E5B869]" />
            <span>{t('venues.dateLabel')}:</span>
          </span>

          <button
            type="button"
            onClick={() => setActiveDate(todayStr)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDate === todayStr
                ? 'bg-[#E5B869] text-slate-950 font-black shadow-md'
                : 'bg-[#061e16] text-slate-300 hover:text-white border border-[#E5B869]/20'
            }`}
          >
            {language === 'ar' ? 'اليوم' : 'Today'} ({todayStr})
          </button>

          <button
            type="button"
            onClick={() => setActiveDate(tomorrowStr)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeDate === tomorrowStr
                ? 'bg-[#E5B869] text-slate-950 font-black shadow-md'
                : 'bg-[#061e16] text-slate-300 hover:text-white border border-[#E5B869]/20'
            }`}
          >
            {language === 'ar' ? 'غداً' : 'Tomorrow'} ({tomorrowStr})
          </button>

          <input
            type="date"
            value={activeDate}
            onChange={(e) => e.target.value && setActiveDate(e.target.value)}
            className="px-3 py-1 bg-[#061e16] border border-[#E5B869]/20 rounded-xl text-xs text-emerald-300 focus:outline-none focus:border-[#E5B869] cursor-pointer shrink-0"
          />
        </div>
      </div>

      {/* Venues Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#E5B869]" />
            <span>{t('venues.viewAllVenues')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E5B869]/15 text-[#F5D794] border border-[#E5B869]/30">
              {filteredVenues.length}
            </span>
          </h2>
        </div>

        {filteredVenues.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#081813]/90 border border-[#E5B869]/20 space-y-3">
            <Building2 className="w-12 h-12 text-emerald-500/40 mx-auto" />
            <h3 className="text-base font-bold text-white">
              {language === 'ar' ? 'لا توجد ملاعب مطابقة للبحث' : 'No partner venues match your search'}
            </h3>
            <p className="text-xs text-emerald-300/70 max-w-md mx-auto">
              {language === 'ar'
                ? 'جرّب تغيير المدينة أو خيارات الفلترة لعرض الملاعب الشريكة المتوفرة.'
                : 'Try adjusting your city filter or search query.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredVenues.map((venue) => {
              // Slots on activeDate
              const dateSlots = (venue.slots || []).filter((s) => s.date === activeDate);
              const availableSlotsCount = dateSlots.filter((s) => s.status === 'available').length;

              return (
                <div
                  key={venue.id}
                  className="bg-[#0A261D]/95 border border-[#E5B869]/30 rounded-3xl overflow-hidden shadow-xl hover:border-[#E5B869]/60 transition-all flex flex-col justify-between group"
                >
                  {/* Top Image Banner */}
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-slate-900">
                    <img
                      src={venue.imageUrl || '/images/stadiums/floodlit_night_arena.jpg'}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A261D] via-transparent to-black/60" />

                    {/* Verified Partner Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-[#E5B869]/40 text-[#F5D794] text-xs font-bold">
                      <Shield className="w-3.5 h-3.5 text-[#E5B869]" />
                      <span>{t('venues.verifiedPartner')}</span>
                    </div>

                    {/* Hourly Rate Chip */}
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#0A3A2A]/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-black">
                      {formatMAD(venue.hourlyRateMAD)} / {language === 'ar' ? 'ساعة' : 'hr'}
                    </div>

                    {/* Venue Title & City inside bottom of cover */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-base sm:text-lg font-bold font-display text-white truncate drop-shadow-md">
                        {venue.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-emerald-200/90 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#E5B869] shrink-0" />
                        <span className="truncate">{venue.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    {/* Specs / Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#061e16] border border-[#E5B869]/20 text-[#F5D794] text-xs font-medium">
                        {venue.turfType === 'synthetic_fifa'
                          ? t('venues.syntheticFifa')
                          : venue.turfType === 'indoor_hall'
                          ? t('venues.indoorHall')
                          : t('venues.naturalGrass')}
                      </span>

                      {venue.formats.map((fmt) => (
                        <span
                          key={fmt}
                          className="px-2 py-0.5 rounded-lg bg-[#0E382A] border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                        >
                          {fmt}
                        </span>
                      ))}

                      <span className="px-2 py-0.5 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 text-xs">
                        {venue.pitchCount} {language === 'ar' ? 'ملاعب' : 'pitches'}
                      </span>
                    </div>

                    {/* Amenities Icons */}
                    {venue.amenities && venue.amenities.length > 0 && (
                      <div className="flex items-center gap-3 pt-1 text-xs text-emerald-300/70 flex-wrap">
                        {venue.amenities.includes('parking') && (
                          <span className="flex items-center gap-1" title={t('venues.parking')}>
                            <Car className="w-3.5 h-3.5 text-[#E5B869]" />
                            <span>{t('venues.parking')}</span>
                          </span>
                        )}
                        {venue.amenities.includes('showers') && (
                          <span className="flex items-center gap-1" title={t('venues.showers')}>
                            <Bath className="w-3.5 h-3.5 text-[#E5B869]" />
                            <span>{t('venues.showers')}</span>
                          </span>
                        )}
                        {venue.amenities.includes('night_lighting') && (
                          <span className="flex items-center gap-1" title={t('venues.nightLighting')}>
                            <SunMedium className="w-3.5 h-3.5 text-[#E5B869]" />
                            <span>{t('venues.nightLighting')}</span>
                          </span>
                        )}
                        {venue.amenities.includes('cafeteria') && (
                          <span className="flex items-center gap-1" title={t('venues.cafeteria')}>
                            <Coffee className="w-3.5 h-3.5 text-[#E5B869]" />
                            <span>{t('venues.cafeteria')}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Booking Schedule Header */}
                    <div className="pt-3 border-t border-[#E5B869]/15">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#E5B869]" />
                          <h4 className="text-xs font-bold text-white font-display">
                            {t('venues.availableSlotsToday')} ({activeDate})
                          </h4>
                          <span className="text-xs px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            {availableSlotsCount} {t('venues.statusAvailable')}
                          </span>
                        </div>

                        {/* Owner Quick Controls */}
                        {isOwnerMode && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenAddSlot(venue)}
                              className="px-2.5 py-1 rounded-lg bg-[#0E4836] hover:bg-[#145d46] text-[#F5D794] text-xs font-bold border border-[#E5B869]/30 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{t('venues.addSlotBtn')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenBatchGenerator(venue)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#F5D794] to-[#E5B869] text-slate-950 text-xs font-black shadow-sm flex items-center gap-1 cursor-pointer"
                              title={t('venues.generateModalTitle')}
                            >
                              <Zap className="w-3 h-3 fill-slate-950" />
                              <span className="hidden sm:inline">{t('venues.generateSlotsBtn')}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Slots List */}
                      {dateSlots.length === 0 ? (
                        <div className="p-4 text-center rounded-xl bg-[#061811] border border-dashed border-[#E5B869]/20 text-xs text-emerald-300/60">
                          {t('venues.noSlotsAvailable')}
                          {isOwnerMode && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddSlot(venue)}
                              className="block mx-auto mt-2 text-[#F5D794] hover:underline font-bold"
                            >
                              + {t('venues.addSlotBtn')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {dateSlots.map((slot) => {
                            const isAvailable = slot.status === 'available';

                            return (
                              <div
                                key={slot.id}
                                className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between gap-1.5 transition-all ${
                                  isAvailable
                                    ? 'bg-[#07241a] border-emerald-500/30 hover:border-emerald-500/60'
                                    : slot.status === 'booked'
                                    ? 'bg-[#15231c]/60 border-slate-700/60 opacity-75'
                                    : 'bg-amber-950/20 border-amber-500/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#E5B869]" />
                                    <span>{slot.startTime} - {slot.endTime}</span>
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isAvailable
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : slot.status === 'booked'
                                      ? 'bg-slate-800 text-slate-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                    {slot.status === 'available'
                                      ? t('venues.statusAvailable')
                                      : slot.status === 'booked'
                                      ? t('venues.statusBooked')
                                      : t('venues.statusMaintenance')}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-emerald-200/80">
                                  <span>{slot.pitchNumber || 'ملعب 1'} • {slot.format}</span>
                                  <span className="font-bold text-[#F5D794]">{formatMAD(slot.priceTotal)}</span>
                                </div>

                                {/* Slot Actions */}
                                {isAvailable && onOrganizeMatchFromSlot && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOrganizeMatchFromSlot({
                                        venueName: venue.name,
                                        city: venue.city,
                                        address: venue.address,
                                        date: slot.date,
                                        time: slot.startTime,
                                        format: slot.format,
                                        totalCost: slot.priceTotal,
                                      })
                                    }
                                    className="w-full mt-1 py-1 rounded-lg bg-[#0E4836] hover:bg-[#145d46] text-[#F5D794] border border-[#E5B869]/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Zap className="w-3 h-3 text-[#E5B869]" />
                                    <span>{t('venues.quickOrganizeMatch')}</span>
                                  </button>
                                )}

                                {/* Owner quick actions */}
                                {isOwnerMode && (
                                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateVenueBookingSlot(venue.id, slot.id, {
                                          status: isAvailable ? 'booked' : 'available',
                                        })
                                      }
                                      className="text-emerald-300 hover:underline cursor-pointer"
                                    >
                                      {isAvailable ? 'تحويل لـ محجوز' : 'تحويل لـ متاح'}
                                    </button>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAddSlot(venue, slot)}
                                        className="text-[#E5B869] hover:text-white cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteVenueBookingSlot(venue.id, slot.id)}
                                        className="text-red-400 hover:text-red-300 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Direct Contact Buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-[#E5B869]/15">
                      {venue.whatsapp && (
                        <a
                          href={`https://wa.me/${venue.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `السلام عليكم، أريد الاستفسار عن حجز حصة في ملعب ${venue.name} عبر تطبيق GoMatch.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{t('venues.whatsappDirect')}</span>
                        </a>
                      )}

                      {venue.phone && (
                        <a
                          href={`tel:${venue.phone}`}
                          className="px-3.5 py-2 rounded-xl bg-[#061e16] hover:bg-[#0a2f23] text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#E5B869]" />
                          <span>{t('venues.callDirect')}</span>
                        </a>
                      )}

                      {venue.googleMapsUrl && (
                        <a
                          href={venue.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in Google Maps"
                          className="p-2 rounded-xl bg-[#061e16] hover:bg-[#0a2f23] text-[#E5B869] border border-[#E5B869]/25 text-xs flex items-center justify-center transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER NEW PARTNER VENUE                                       */}
      {/* ========================================================================= */}
      {isAddVenueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A261D] border border-[#E5B869]/40 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5B869]/20 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display text-white">
                  {t('venues.venueRegisterTitle')}
                </h3>
                <p className="text-xs text-emerald-200/70 mt-1">
                  {t('venues.venueRegisterDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVenueModalOpen(false)}
                className="p-2 rounded-xl bg-[#061e16] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="space-y-4 text-xs">
              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {t('venues.venueNameLabel')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مركب الرياض لكرة القدم (Oasis Sports)"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.cityLabel')} *
                  </label>
                  <select
                    value={newVenueCity}
                    onChange={(e) => setNewVenueCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                  >
                    {Object.entries(MOROCCAN_CITIES_LOCALIZED).map(([k, v]) => (
                      <option key={k} value={k}>
                        {language === 'ar' ? v.ar : v.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.rateLabel')} *
                  </label>
                  <input
                    type="number"
                    required
                    value={newVenueRate}
                    onChange={(e) => setNewVenueRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {t('venues.addressLabel')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شارع الواحة، بالقرب من محطة القطار"
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {t('venues.mapsLabel')}
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={newVenueMapsUrl}
                  onChange={(e) => setNewVenueMapsUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.phoneLabel')} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+212 6 XX XX XX XX"
                    value={newVenuePhone}
                    onChange={(e) => setNewVenuePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.whatsappLabel')}
                  </label>
                  <input
                    type="tel"
                    placeholder="2126XXXXXXXX"
                    value={newVenueWhatsapp}
                    onChange={(e) => setNewVenueWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.filterTurf')}
                  </label>
                  <select
                    value={newVenueTurf}
                    onChange={(e) => setNewVenueTurf(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                  >
                    <option value="synthetic_fifa">{t('venues.syntheticFifa')}</option>
                    <option value="indoor_hall">{t('venues.indoorHall')}</option>
                    <option value="natural_grass">{t('venues.naturalGrass')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.managerLabel')}
                  </label>
                  <input
                    type="text"
                    value={newVenueManager}
                    onChange={(e) => setNewVenueManager(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              {/* Venue Image Upload */}
              <div className="p-3 bg-[#061e16] border border-[#E5B869]/25 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#E5B869]" />
                    {language === 'ar' ? 'صورة الملعب / المركب الرياضي:' : 'Venue Photo:'}
                  </label>
                  <span className="text-[10px] text-emerald-400/60">
                    {language === 'ar' ? 'اختياري (JPG, PNG, WebP)' : 'Optional'}
                  </span>
                </div>

                <input
                  type="file"
                  ref={venueFileInputRef}
                  onChange={handleVenueImageChange}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />

                {newVenueImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#E5B869]/40 group h-36 w-full">
                    <img
                      src={newVenueImageUrl}
                      alt="Venue Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => venueFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-[#0E4836] hover:bg-[#135d46] text-white rounded-lg text-xs font-bold border border-[#E5B869]/50 flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'تغيير الصورة' : 'Change'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewVenueImageUrl('')}
                        className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-white rounded-lg text-xs font-bold border border-red-500/50 flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        {language === 'ar' ? 'حذف' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => venueFileInputRef.current?.click()}
                    disabled={isUploadingVenueImage}
                    className="w-full py-3 px-4 border border-dashed border-[#E5B869]/40 hover:border-[#E5B869] bg-[#081813]/60 hover:bg-[#0E4836]/40 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-200 transition-colors cursor-pointer"
                  >
                    {isUploadingVenueImage ? (
                      <>
                        <Loader2 className="w-4 h-4 text-[#E5B869] animate-spin" />
                        <span>{language === 'ar' ? 'جاري ضغط ومعالجة الصورة...' : 'Processing photo...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#E5B869]" />
                        <span>{language === 'ar' ? 'رفع صورة للملعب من جهازك' : 'Upload photo from your device'}</span>
                      </>
                    )}
                  </button>
                )}

                {venueImageError && (
                  <p className="text-[11px] text-red-400 font-medium">{venueImageError}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5B869]/20">
                <button
                  type="button"
                  onClick={() => setIsAddVenueModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 text-xs font-black shadow-lg cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD OR EDIT BOOKING SLOT                                         */}
      {/* ========================================================================= */}
      {isAddSlotModalOpen && activeVenueForSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A261D] border border-[#E5B869]/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5B869]/20 pb-4">
              <div>
                <h3 className="text-base font-bold font-display text-white">
                  {editingSlot ? t('venues.editSlot') : t('venues.addSlotBtn')}
                </h3>
                <p className="text-xs text-emerald-200/70 mt-1">
                  {activeVenueForSlot.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSlotModalOpen(false)}
                className="p-2 rounded-xl bg-[#061e16] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.dateLabel')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.pitchNumberLabel')}
                  </label>
                  <input
                    type="text"
                    value={slotPitchNumber}
                    onChange={(e) => setSlotPitchNumber(e.target.value)}
                    placeholder="الملعب 1"
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.startTimeLabel')} *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.endTimeLabel')} *
                  </label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.formatLabel')}
                  </label>
                  <select
                    value={slotFormat}
                    onChange={(e) => setSlotFormat(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                  >
                    <option value="5v5">5v5</option>
                    <option value="6v6">6v6</option>
                    <option value="7v7">7v7</option>
                    <option value="8v8">8v8</option>
                    <option value="9v9">9v9</option>
                    <option value="11v11">11v11</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {t('venues.priceTotalLabel')} *
                  </label>
                  <input
                    type="number"
                    required
                    value={slotPrice}
                    onChange={(e) => setSlotPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {t('venues.statusLabel')}
                </label>
                <select
                  value={slotStatus}
                  onChange={(e) => setSlotStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                >
                  <option value="available">{t('venues.statusAvailable')}</option>
                  <option value="booked">{t('venues.statusBooked')}</option>
                  <option value="maintenance">{t('venues.statusMaintenance')}</option>
                </select>
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {language === 'ar' ? 'ملاحظات إضافية' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: إضاءة ليلية، كرات تداريب متوفرة"
                  value={slotNotes}
                  onChange={(e) => setSlotNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5B869]/20">
                <button
                  type="button"
                  onClick={() => setIsAddSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 text-xs font-black shadow-lg cursor-pointer"
                >
                  {t('venues.saveSlot')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: 1-CLICK DAILY SLOT GENERATOR                                     */}
      {/* ========================================================================= */}
      {isBatchModalOpen && activeVenueForSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A261D] border border-[#E5B869]/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5B869]/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5B869]/20 flex items-center justify-center text-[#F5D794]">
                  <Zap className="w-5 h-5 fill-[#E5B869]" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    {t('venues.generateModalTitle')}
                  </h3>
                  <p className="text-xs text-emerald-200/70 mt-0.5">
                    {activeVenueForSlot.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-2 rounded-xl bg-[#061e16] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchSuccessMsg ? (
              <div className="p-6 text-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 animate-bounce" />
                <p className="text-sm font-bold">{batchSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleRunBatchGenerator} className="space-y-4 text-xs">
                <p className="text-xs text-emerald-200/80 leading-relaxed bg-[#061e16] p-3 rounded-xl border border-[#E5B869]/20">
                  {t('venues.generateModalDesc')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-emerald-200 font-bold mb-1">
                      {t('venues.dateLabel')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={batchDate}
                      onChange={(e) => setBatchDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-200 font-bold mb-1">
                      {t('venues.pitchNumberLabel')}
                    </label>
                    <input
                      type="text"
                      value={batchPitchNumber}
                      onChange={(e) => setBatchPitchNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-emerald-200 font-bold mb-1">
                      {language === 'ar' ? 'ساعة البدء (مثال: 17:00)' : 'Start Hour (e.g. 17:00)'}
                    </label>
                    <select
                      value={batchStartHour}
                      onChange={(e) => setBatchStartHour(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                    >
                      {[15, 16, 17, 18, 19, 20].map((h) => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-emerald-200 font-bold mb-1">
                      {language === 'ar' ? 'ساعة الانتهاء (مثال: 01:00)' : 'End Hour'}
                    </label>
                    <select
                      value={batchEndHour}
                      onChange={(e) => setBatchEndHour(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                    >
                      {[22, 23, 24, 25].map((h) => (
                        <option key={h} value={h}>
                          {h === 24 ? '00:00' : h === 25 ? '01:00' : `${h}:00`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-emerald-200 font-bold mb-1">
                      {t('venues.formatLabel')}
                    </label>
                    <select
                      value={batchFormat}
                      onChange={(e) => setBatchFormat(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                    >
                      <option value="5v5">5v5</option>
                      <option value="7v7">7v7</option>
                      <option value="8v8">8v8</option>
                      <option value="9v9">9v9</option>
                      <option value="11v11">11v11</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-emerald-200 font-bold mb-1">
                      {t('venues.priceTotalLabel')}
                    </label>
                    <input
                      type="number"
                      value={batchPrice}
                      onChange={(e) => setBatchPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5B869]/20">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 text-xs font-black shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>{language === 'ar' ? 'بدء التوليد التلقائي للحصص' : 'Generate Slots Now'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
