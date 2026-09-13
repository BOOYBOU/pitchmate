import React, { useState } from 'react';
import { PartnerVenue } from '../../types';
import { useLanguage } from '../../lib/useLanguage';
import {
  Search,
  Trash2,
  Edit2,
  Building2,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Shield,
  User,
  Clock,
  Layers,
  Calendar,
  Sparkles,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { MOROCCAN_CITIES_LOCALIZED } from '../../lib/translations';

interface AdminVenuesTableProps {
  venues: PartnerVenue[];
  onDeleteVenue: (venueId: string) => Promise<any> | any;
  onUpdateVenue?: (venueId: string, updates: Partial<PartnerVenue>) => Promise<any> | any;
  onOpenCreateVenue?: () => void;
}

export const AdminVenuesTable: React.FC<AdminVenuesTableProps> = ({
  venues,
  onDeleteVenue,
  onUpdateVenue,
  onOpenCreateVenue,
}) => {
  const { t, language, formatMAD } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [confirmDeleteVenue, setConfirmDeleteVenue] = useState<PartnerVenue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingVenue, setEditingVenue] = useState<PartnerVenue | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editManagerName, setEditManagerName] = useState('');
  const [editRateMAD, setEditRateMAD] = useState('500');
  const [editTurfType, setEditTurfType] = useState<PartnerVenue['turfType']>('synthetic_fifa');
  const [editFormats, setEditFormats] = useState<string[]>(['7v7']);
  const [editMapsUrl, setEditMapsUrl] = useState('');

  const filteredVenues = venues.filter((venue) => {
    const matchCity = selectedCity === 'all' || venue.city.toLowerCase() === selectedCity.toLowerCase();
    const q = searchTerm.toLowerCase().trim();
    const matchQuery =
      !q ||
      venue.name.toLowerCase().includes(q) ||
      venue.city.toLowerCase().includes(q) ||
      venue.address.toLowerCase().includes(q) ||
      (venue.managerName && venue.managerName.toLowerCase().includes(q)) ||
      (venue.managerEmail && venue.managerEmail.toLowerCase().includes(q)) ||
      (venue.phone && venue.phone.includes(q));
    return matchCity && matchQuery;
  });

  const handleStartEdit = (venue: PartnerVenue) => {
    setEditingVenue(venue);
    setEditName(venue.name);
    setEditCity(venue.city);
    setEditAddress(venue.address);
    setEditPhone(venue.phone || '');
    setEditWhatsapp(venue.whatsapp || '');
    setEditManagerName(venue.managerName || '');
    setEditRateMAD(String(venue.hourlyRateMAD || 500));
    setEditTurfType(venue.turfType || 'synthetic_fifa');
    setEditFormats(venue.formats || ['7v7']);
    setEditMapsUrl(venue.googleMapsUrl || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue || !onUpdateVenue) return;
    await onUpdateVenue(editingVenue.id, {
      name: editName.trim(),
      city: editCity.trim(),
      address: editAddress.trim(),
      phone: editPhone.trim(),
      whatsapp: editWhatsapp.trim() || undefined,
      managerName: editManagerName.trim(),
      hourlyRateMAD: Number(editRateMAD) || 500,
      turfType: editTurfType,
      formats: editFormats,
      googleMapsUrl: editMapsUrl.trim() || undefined,
    });
    setEditingVenue(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteVenue) return;
    setIsDeleting(true);
    try {
      await onDeleteVenue(confirmDeleteVenue.id);
      setConfirmDeleteVenue(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث باسم المركب، المدير، المدينة أو الهاتف...' : 'Search by complex, manager, city, phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-white placeholder-emerald-400/40 focus:outline-none focus:border-[#E5B869]"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 bg-[#081813] border border-[#E5B869]/25 rounded-xl text-xs text-[#F5D794] focus:outline-none focus:border-[#E5B869] cursor-pointer"
          >
            <option value="all">{language === 'ar' ? 'جميع المدن' : 'All Cities'}</option>
            {Object.entries(MOROCCAN_CITIES_LOCALIZED).map(([k, v]) => (
              <option key={k} value={k}>
                {language === 'ar' ? v.ar : v.en}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-emerald-300/70">
          <span>
            {language === 'ar' ? 'إجمالي المركبات المسجلة:' : 'Total Registered Venues:'}{' '}
            <strong className="text-[#F5D794] font-bold">{venues.length}</strong>
          </span>
          {onOpenCreateVenue && (
            <button
              onClick={onOpenCreateVenue}
              className="px-3 py-1.5 rounded-xl bg-[#E5B869] text-slate-950 font-bold hover:bg-[#F5D794] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة مركب' : 'Add Venue'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-[#081813] border border-[#E5B869]/30 flex items-center justify-between gap-3 text-xs text-emerald-200">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#E5B869] shrink-0" />
          <span>
            {language === 'ar'
              ? 'صلاحيات المشرف العام: يمكنك حذف أي مركب رياضي نهائياً من قاعدة البيانات والتطبيق، وتعديل بيانات الاتصال والأسعار.'
              : 'Super Admin Authority: You can permanently delete any sports complex from the database & app, or modify rates & details.'}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#E5B869]/20 text-[#F5D794] text-[10px] font-black shrink-0 border border-[#E5B869]/40">
          {language === 'ar' ? 'تحكم كامل' : 'FULL ACCESS'}
        </span>
      </div>

      {/* Venues Cards / Table */}
      {filteredVenues.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#081813] border border-dashed border-[#E5B869]/25 text-emerald-300/60 text-xs">
          {language === 'ar' ? 'لا توجد مركبات تطابق معايير البحث' : 'No partner venues match search criteria'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVenues.map((venue) => {
            const slotsCount = venue.slots?.length || 0;
            const availableSlots = (venue.slots || []).filter((s) => s.status === 'available').length;

            return (
              <div
                key={venue.id}
                className="bg-[#0A3A2A] border border-[#E5B869]/30 rounded-2xl p-4 shadow-md hover:border-[#E5B869]/60 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-[#E5B869]/30 shrink-0">
                    <img
                      src={venue.imageUrl || '/images/stadiums/floodlit_night_arena.jpg'}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-white text-base truncate font-display">
                        {venue.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-lg bg-[#0E4836] text-[#F5D794] text-xs font-bold border border-[#E5B869]/30">
                        {venue.city}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#061e16] text-emerald-300 text-xs border border-emerald-500/20">
                        {venue.turfType === 'synthetic_fifa'
                          ? 'عشب فيفا'
                          : venue.turfType === 'indoor_hall'
                          ? 'قاعة مغطاة'
                          : 'عشب طبيعي'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-300/70">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#E5B869]" />
                        <span className="truncate max-w-xs">{venue.address}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#E5B869]" />
                        <span>
                          {language === 'ar' ? 'المدير:' : 'Manager:'}{' '}
                          <strong className="text-white">{venue.managerName}</strong>
                          {venue.managerEmail && (
                            <span className="text-[11px] text-emerald-400/80 mr-1 ml-1">
                              ({venue.managerEmail})
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="text-[#F5D794] font-bold">
                        {formatMAD(venue.hourlyRateMAD)} / {language === 'ar' ? 'ساعة' : 'hr'}
                      </span>

                      <span className="px-2 py-0.2 rounded-full bg-[#081813] text-emerald-300 text-[11px] border border-emerald-500/30">
                        {slotsCount} {language === 'ar' ? 'حصص' : 'slots'} ({availableSlots} {language === 'ar' ? 'متاح' : 'available'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {venue.whatsapp && (
                    <a
                      href={`https://wa.me/${venue.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all cursor-pointer"
                      title={language === 'ar' ? 'محادثة واتساب المدير' : 'WhatsApp Manager'}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  {venue.phone && (
                    <a
                      href={`tel:${venue.phone}`}
                      className="p-2 rounded-xl bg-[#081813] hover:bg-[#0E4836] text-emerald-300 border border-[#E5B869]/25 transition-all cursor-pointer"
                      title={venue.phone}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

                  {venue.googleMapsUrl && (
                    <a
                      href={venue.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#081813] hover:bg-[#0E4836] text-[#E5B869] border border-[#E5B869]/25 transition-all cursor-pointer"
                      title="Google Maps"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {onUpdateVenue && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(venue)}
                      className="px-3 py-1.5 rounded-xl bg-[#081813] hover:bg-[#0E4836] text-[#F5D794] border border-[#E5B869]/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title={language === 'ar' ? 'تعديل بيانات المركب' : 'Edit Complex'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteVenue(venue)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title={language === 'ar' ? 'حذف المركب كمسؤول (Admin)' : 'Delete Venue as Admin'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'حذف المركب' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN CONFIRM DELETE VENUE                                         */}
      {/* ========================================================================= */}
      {confirmDeleteVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A261D] border border-rose-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base font-display">
                  {language === 'ar' ? 'تأكيد حذف المركب الرياضي نهائياً' : 'Confirm Permanent Venue Deletion'}
                </h3>
                <span className="text-[11px] text-rose-300/80">
                  {language === 'ar' ? 'صلاحية المشرف العام (Super Admin)' : 'Super Admin Access'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#061811] border border-[#E5B869]/20 space-y-2 text-xs">
              <div className="font-bold text-[#F5D794] text-sm">{confirmDeleteVenue.name}</div>
              <div className="text-emerald-200/80 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#E5B869]" />
                <span>{confirmDeleteVenue.city} - {confirmDeleteVenue.address}</span>
              </div>
              <div className="text-emerald-300/70">
                {language === 'ar' ? 'المسؤول المسجل:' : 'Manager:'}{' '}
                <span className="text-white font-semibold">{confirmDeleteVenue.managerName}</span>
                {confirmDeleteVenue.managerEmail && ` (${confirmDeleteVenue.managerEmail})`}
              </div>
            </div>

            <p className="text-xs text-rose-200/90 leading-relaxed">
              {language === 'ar'
                ? 'هل أنت متأكد من رغبتك في حذف هذا المركب الرياضي نهائياً؟ سيتم إزالته من قاعدة البيانات السحابية ومن شبكة الملاعب في التطبيق بشكل فوري.'
                : 'Are you sure you want to delete this venue? It will be permanently removed from Cloud Firestore and the application immediately.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteVenue(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? 'نعم، حذف المركب نهائياً' : 'Yes, Permanently Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT VENUE                                                         */}
      {/* ========================================================================= */}
      {editingVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0A261D] border border-[#E5B869]/40 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-[#E5B869]/20 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#E5B869]" />
                <h3 className="font-bold text-base font-display">
                  {language === 'ar' ? 'تعديل بيانات المركب الرياضي' : 'Edit Sports Complex'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingVenue(null)}
                className="p-2 rounded-xl bg-[#061e16] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {language === 'ar' ? 'اسم المركب الرياضي' : 'Venue Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {language === 'ar' ? 'المدينة' : 'City'} *
                  </label>
                  <select
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
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
                    {language === 'ar' ? 'السعر بالساعة (MAD)' : 'Hourly Rate (MAD)'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={editRateMAD}
                    onChange={(e) => setEditRateMAD(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {language === 'ar' ? 'العنوان التفصيلي' : 'Address'} *
                </label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {language === 'ar' ? 'اسم المدير / المسؤول' : 'Manager Name'}
                  </label>
                  <input
                    type="text"
                    value={editManagerName}
                    onChange={(e) => setEditManagerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {language === 'ar' ? 'نوع الأرضية' : 'Turf'}
                  </label>
                  <select
                    value={editTurfType}
                    onChange={(e) => setEditTurfType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-[#F5D794] focus:outline-none focus:border-[#E5B869]"
                  >
                    <option value="synthetic_fifa">{language === 'ar' ? 'عشب اصطناعي (فيفا)' : 'FIFA Synthetic'}</option>
                    <option value="indoor_hall">{language === 'ar' ? 'قاعة مغطاة (فوتسال)' : 'Indoor Hall'}</option>
                    <option value="natural_grass">{language === 'ar' ? 'عشب طبيعي' : 'Natural Grass'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>

                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    {language === 'ar' ? 'رقم الواتساب' : 'WhatsApp'}
                  </label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-200 font-bold mb-1">
                  {language === 'ar' ? 'رابط خرائط جوجل' : 'Google Maps Link'}
                </label>
                <input
                  type="url"
                  value={editMapsUrl}
                  onChange={(e) => setEditMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3.5 py-2 bg-[#061e16] border border-[#E5B869]/30 rounded-xl text-white focus:outline-none focus:border-[#E5B869]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5B869]/20">
                <button
                  type="button"
                  onClick={() => setEditingVenue(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] text-slate-950 font-black cursor-pointer shadow-md"
                >
                  {language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
