import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Coins,
  X,
  PlusCircle,
  Navigation,
  FileText,
} from 'lucide-react';
import { MatchLocation } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { formatMAD } from '../lib/moroccoUtils';
import {
  parsePrice,
  derivePlayerPriceFromTotal,
  deriveTotalFromPlayerPrice,
} from '../lib/matchPricing';
import { getDefaultFormationForFormat } from './TacticalPitchFormation';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (matchId: string) => void;
}

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createMatch } = usePitchStore();

  const [title, setTitle] = useState('');

  // Setup default Moroccan kickoff time (tomorrow 19:30 GMT+1)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [matchDate, setMatchDate] = useState(tomorrowStr);
  const [matchTime, setMatchTime] = useState('19:30');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [format, setFormat] = useState('7v7');
  const [maxPlayers, setMaxPlayers] = useState(14);
  const [pricePerPlayer, setPricePerPlayer] = useState<number | string>(50); // MAD per player
  const [totalPitchCost, setTotalPitchCost] = useState<number | string>(700); // MAD total pitch booking
  const [locationLink, setLocationLink] = useState('https://maps.google.com/?q=33.5592,-7.6321');
  const [venueName, setVenueName] = useState('Oasis Sports Club');
  const [city, setCity] = useState('Casablanca');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePriceChange = (valStr: string) => {
    if (valStr === '') {
      setPricePerPlayer('');
      return;
    }
    const price = Number(valStr);
    if (isNaN(price)) return;
    setPricePerPlayer(price);
    if (maxPlayers > 0) {
      setTotalPitchCost(deriveTotalFromPlayerPrice(price, maxPlayers));
    }
  };

  const handleTotalCostChange = (valStr: string) => {
    if (valStr === '') {
      setTotalPitchCost('');
      return;
    }
    const total = Number(valStr);
    if (isNaN(total)) return;
    setTotalPitchCost(total);
    if (maxPlayers > 0) {
      setPricePerPlayer(derivePlayerPriceFromTotal(total, maxPlayers));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Local ISO string with Africa/Casablanca time representation
      const combinedDateTime = new Date(`${matchDate}T${matchTime}:00`);

      const trimmedLink = locationLink.trim();
      const isUrl = trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://');

      let latitude: number | undefined = 33.5592;
      let longitude: number | undefined = -7.6321;
      const coordMatch =
        trimmedLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        trimmedLink.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
        trimmedLink.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        latitude = parseFloat(coordMatch[1]);
        longitude = parseFloat(coordMatch[2]);
      }

      const locationData: MatchLocation = {
        venueName: venueName.trim() || 'Morocco Football Pitch',
        address: trimmedLink || 'Morocco',
        city: city.trim() || 'Casablanca',
        latitude,
        longitude,
        googleMapsUrl: isUrl ? trimmedLink : (trimmedLink ? `https://maps.google.com/?q=${encodeURIComponent(trimmedLink)}` : undefined),
      };

      const finalPrice = parsePrice(pricePerPlayer, 50);
      const finalTotalCost = totalPitchCost !== '' && totalPitchCost !== null && totalPitchCost !== undefined
        ? parsePrice(totalPitchCost, finalPrice * (Number(maxPlayers) || 14))
        : finalPrice * (Number(maxPlayers) || 14);

      const defaultFormation = getDefaultFormationForFormat(format, Number(maxPlayers));

      const newMatchId = await createMatch({
        title: title.trim(),
        dateTime: combinedDateTime.toISOString(),
        durationMinutes: Number(durationMinutes) || 90,
        location: locationData,
        format: format as any,
        maxPlayers: Number(maxPlayers) || 14,
        pricePerPlayer: finalPrice,
        currency: 'MAD',
        totalPitchCost: finalTotalCost,
        formationGreen: defaultFormation,
        formationBlue: defaultFormation,
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

  const isLinkValidUrl = locationLink.startsWith('http://') || locationLink.startsWith('https://');

  return (
    <div
      id="create-match-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-[#0E1526] border border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#090D16]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">Create Match</h2>
              <p className="text-xs text-slate-400">Set pitch location, kickoff time & split fees</p>
            </div>
          </div>
          <button
            id="close-create-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
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
              placeholder="e.g. Oasis Sports Club 7v7 Friday Night"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Venue Name & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Pitch / Stadium Name *
              </label>
              <input
                id="match-venue-name-input"
                type="text"
                required
                placeholder="e.g. Oasis Sports Club"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                City / Area *
              </label>
              <input
                id="match-city-input"
                type="text"
                required
                placeholder="e.g. Casablanca, Rabat, Marrakech"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Date, Time & Duration Grid */}
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
                className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-slate-600 font-medium"
              >
                <option value={60}>60 Minutes (1 hr)</option>
                <option value={90}>90 Minutes (1.5 hrs)</option>
                <option value={120}>120 Minutes (2 hrs)</option>
              </select>
            </div>
          </div>

          {/* Location / Map Link */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Location / Address / Maps Link *
              </label>
              {isLinkValidUrl && (
                <a
                  href={locationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  Test Map Link
                </a>
              )}
            </div>
            <input
              id="maps-url-input"
              type="text"
              required
              placeholder="e.g. https://maps.google.com/?q=33.5592,-7.6321 or street address"
              value={locationLink}
              onChange={(e) => setLocationLink(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
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
                    '11v11': 22,
                  };
                  if (capacityMap[nextFormat]) {
                    const newCap = capacityMap[nextFormat];
                    setMaxPlayers(newCap);
                    const numP = parsePrice(pricePerPlayer, 50);
                    setTotalPitchCost(deriveTotalFromPlayerPrice(numP, newCap));
                  }
                }}
                className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="5v5">5 vs 5 (10 players)</option>
                <option value="6v6">6 vs 6 (12 players)</option>
                <option value="7v7">7 vs 7 (14 players)</option>
                <option value="8v8">8 vs 8 (16 players)</option>
                <option value="9v9">9 vs 9 (18 players)</option>
                <option value="11v11">11 vs 11 (22 players)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Max Players Capacity
              </label>
              <input
                id="match-max-players-input"
                type="number"
                min={2}
                max={50}
                value={maxPlayers}
                onChange={(e) => {
                  const count = Number(e.target.value);
                  setMaxPlayers(count);
                  const numP = parsePrice(pricePerPlayer, 50);
                  setTotalPitchCost(deriveTotalFromPlayerPrice(numP, count));
                }}
                className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Pricing & Cost Split (MAD) */}
          <div className="p-4 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Match Pricing & Pitch Split (MAD)
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                {pricePerPlayer === 0 || pricePerPlayer === '0' ? 'Free Match' : `${pricePerPlayer} MAD / player`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Price Per Player (MAD)
                </label>
                <div className="relative">
                  <input
                    id="price-per-player-input"
                    type="number"
                    value={pricePerPlayer}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    MAD
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Total Pitch Booking (MAD)
                </label>
                <div className="relative">
                  <input
                    id="total-pitch-cost-input"
                    type="number"
                    value={totalPitchCost}
                    onChange={(e) => handleTotalCostChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500 pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    MAD
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Set to 0 MAD for free matches, or enter any custom rate.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-create-match-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmitting ? 'Publishing...' : 'Publish Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
