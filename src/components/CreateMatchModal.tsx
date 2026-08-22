import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Coins, FileText, X, PlusCircle, Navigation, Repeat } from 'lucide-react';
import { MatchLocation } from '../types';
import { GoogleMapsPickerModal } from './GoogleMapsPickerModal';
import { usePitchStore } from '../lib/usePitchStore';
import { POPULAR_PITCH_PRESETS } from '../lib/mockData';
import { getMoroccoNow, MOROCCO_CITIES } from '../lib/moroccoUtils';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (matchId: string) => void;
}

const DEFAULT_LOCATION: MatchLocation = {
  venueName: POPULAR_PITCH_PRESETS[0]?.name || 'Stade Oasis Soccer Complex',
  address: POPULAR_PITCH_PRESETS[0]?.address || 'Boulevard de l\'Oasis, Casablanca',
  city: POPULAR_PITCH_PRESETS[0]?.city || 'Casablanca',
  latitude: POPULAR_PITCH_PRESETS[0]?.latitude || 33.5592,
  longitude: POPULAR_PITCH_PRESETS[0]?.longitude || -7.6321,
  googleMapsUrl: 'https://maps.google.com/?q=33.5592,-7.6321',
  pitchNumber: 'Pitch A (Turf)',
};

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createMatch } = usePitchStore();

  const [title, setTitle] = useState('');

  // Setup default Moroccan kickoff time (tomorrow 19:00 GMT+1)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [matchDate, setMatchDate] = useState(tomorrowStr);
  const [matchTime, setMatchTime] = useState('19:30');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [format, setFormat] = useState('7v7');
  const [maxPlayers, setMaxPlayers] = useState(14);
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(50); // 50 MAD standard in Morocco
  const [totalPitchCost, setTotalPitchCost] = useState<number>(700); // 700 MAD total pitch booking
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');

  const [location, setLocation] = useState<MatchLocation>(DEFAULT_LOCATION);
  const [isMapsPickerOpen, setIsMapsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePriceChange = (price: number) => {
    setPricePerPlayer(price);
    setTotalPitchCost(price * maxPlayers);
  };

  const handleTotalCostChange = (total: number) => {
    setTotalPitchCost(total);
    if (maxPlayers > 0) {
      setPricePerPlayer(Math.round(total / maxPlayers));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Local ISO string with Africa/Casablanca time representation
      const combinedDateTime = new Date(`${matchDate}T${matchTime}:00`);

      const newMatchId = await createMatch({
        title: title.trim(),
        dateTime: combinedDateTime.toISOString(),
        durationMinutes: Number(durationMinutes) || 90,
        location,
        format: format as any,
        maxPlayers: Number(maxPlayers) || 14,
        pricePerPlayer: Number(pricePerPlayer) || 50,
        currency: 'MAD',
        totalPitchCost: Number(totalPitchCost) || Number(pricePerPlayer) * Number(maxPlayers),
        notes: notes.trim(),
        recurrence: isRecurring
          ? {
              isRecurring: true,
              frequency: 'weekly',
              dayOfWeek: combinedDateTime.getDay(),
            }
          : undefined,
      });

      if (onSuccess) {
        onSuccess(newMatchId);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create match:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        id="create-match-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div className="relative w-full max-w-2xl bg-[#0E1526] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#090D16]/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-white">Create Match (Morocco)</h2>
                <p className="text-xs text-slate-400">Schedule a pitch in Casablanca, Rabat, Marrakech, or Tangier with MAD pricing</p>
              </div>
            </div>
            <button
              id="close-create-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Match Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Match Title *
              </label>
              <input
                id="match-title-input"
                type="text"
                required
                placeholder="e.g. Oasis Friday Night Derby 7v7"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date & Time Grid (Morocco GMT+1) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Date *
                </label>
                <input
                  id="match-date-input"
                  type="date"
                  required
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Kick-Off (GMT+1) *
                </label>
                <input
                  id="match-time-input"
                  type="time"
                  required
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-slate-600"
                >
                  <option value={60}>60 Minutes (1 hr)</option>
                  <option value={90}>90 Minutes (1.5 hrs)</option>
                  <option value={120}>120 Minutes (2 hrs)</option>
                </select>
              </div>
            </div>

            {/* Match Location in Morocco */}
            <div className="p-4 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Morocco Pitch & City *
                </label>
                <button
                  id="open-google-maps-picker-btn"
                  type="button"
                  onClick={() => setIsMapsPickerOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Moroccan Pitch Presets
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Venue Name</label>
                  <input
                    id="venue-name-input"
                    type="text"
                    required
                    placeholder="e.g. Oasis Sports City"
                    value={location.venueName}
                    onChange={(e) => setLocation({ ...location, venueName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">City</label>
                  <select
                    value={location.city || 'Casablanca'}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {MOROCCO_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] text-slate-400">Google Maps URL or Street Address</label>
                  {location.googleMapsUrl && (
                    <a
                      href={location.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      Verify on Map
                    </a>
                  )}
                </div>
                <input
                  id="maps-url-input"
                  type="text"
                  required
                  placeholder="e.g. https://maps.google.com/?q=... or Bd de l'Oasis, Casablanca"
                  value={location.googleMapsUrl || location.address}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isUrl = val.startsWith('http://') || val.startsWith('https://');
                    setLocation({
                      ...location,
                      address: isUrl ? location.address || val : val,
                      googleMapsUrl: isUrl ? val : `https://maps.google.com/?q=${encodeURIComponent(val)}`,
                    });
                  }}
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Format & Player Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Format
                </label>
                <select
                  id="match-format-select"
                  value={format}
                  onChange={(e) => {
                    const nextFormat = e.target.value;
                    setFormat(nextFormat);
                    const capacityMap: Record<string, number> = {
                      '5v5': 10,
                      '6v6': 12,
                      '7v7': 14,
                      '8v8': 16,
                      '9v9': 18,
                      '10v10': 20,
                      '11v11': 22,
                    };
                    if (capacityMap[nextFormat]) {
                      const newCap = capacityMap[nextFormat];
                      setMaxPlayers(newCap);
                      setTotalPitchCost(pricePerPlayer * newCap);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="5v5">5v5 (10 Players)</option>
                  <option value="6v6">6v6 (12 Players)</option>
                  <option value="7v7">7v7 (14 Players)</option>
                  <option value="8v8">8v8 (16 Players)</option>
                  <option value="9v9">9v9 (18 Players)</option>
                  <option value="11v11">11v11 (22 Players)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Max Capacity *
                </label>
                <input
                  id="match-max-players-input"
                  type="number"
                  min={2}
                  max={44}
                  required
                  value={maxPlayers}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    setMaxPlayers(count);
                    setTotalPitchCost(pricePerPlayer * count);
                  }}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Moroccan Dirham Pricing Breakdown */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Match Fee & Pitch Cost (MAD / د.م.)
                </label>
                <span className="text-[11px] text-emerald-400 font-semibold">Moroccan Dirham</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Price per Player (MAD)</label>
                  <input
                    id="match-price-input"
                    type="number"
                    min={0}
                    step={5}
                    value={pricePerPlayer}
                    onChange={(e) => handlePriceChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Total Pitch Rental (MAD)</label>
                  <input
                    id="match-total-cost-input"
                    type="number"
                    min={0}
                    step={50}
                    value={totalPitchCost}
                    onChange={(e) => handleTotalCostChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Weekly Recurrence Option */}
            <label className="flex items-center gap-3 p-3 bg-[#090D16] border border-[#1E293B] rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Set as Weekly Recurring Match (Repeats same day/time each week in Morocco)
                </span>
              </div>
            </label>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Pitch Notes & Gear
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Turf cleats recommended. Please arrive 15 minutes before kickoff for warm-up."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-create-match-btn"
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                {isSubmitting ? 'Publishing...' : 'Publish Match'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <GoogleMapsPickerModal
        isOpen={isMapsPickerOpen}
        onClose={() => setIsMapsPickerOpen(false)}
        onSelectLocation={(selectedLoc) => setLocation(selectedLoc)}
        currentLocation={location}
      />
    </>
  );
};
