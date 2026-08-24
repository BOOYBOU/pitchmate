import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Coins, X, PlusCircle, Navigation } from 'lucide-react';
import { MatchLocation } from '../types';
import { usePitchStore } from '../lib/usePitchStore';

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
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(50); // 50 MAD standard in Morocco
  const [totalPitchCost, setTotalPitchCost] = useState<number>(700); // 700 MAD total pitch booking
  const [locationLink, setLocationLink] = useState('https://maps.google.com/?q=33.5592,-7.6321');
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
    if (!title.trim() || !locationLink.trim()) return;

    setIsSubmitting(true);
    try {
      // Local ISO string with Africa/Casablanca time representation
      const combinedDateTime = new Date(`${matchDate}T${matchTime}:00`);

      const trimmedLink = locationLink.trim();
      const isUrl = trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://');

      // Extract coordinates if present in Google Maps URL (e.g., @33.5892,-7.6038 or q=33.5892,-7.6038)
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
        venueName: 'Pitch Location',
        address: trimmedLink,
        city: 'Morocco',
        latitude,
        longitude,
        googleMapsUrl: isUrl ? trimmedLink : `https://maps.google.com/?q=${encodeURIComponent(trimmedLink)}`,
      };

      const newMatchId = await createMatch({
        title: title.trim(),
        dateTime: combinedDateTime.toISOString(),
        durationMinutes: Number(durationMinutes) || 90,
        location: locationData,
        format: format as any,
        maxPlayers: Number(maxPlayers) || 14,
        pricePerPlayer: Number(pricePerPlayer) || 50,
        currency: 'MAD',
        totalPitchCost: Number(totalPitchCost) || Number(pricePerPlayer) * Number(maxPlayers),
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
      <div className="relative w-full max-w-xl bg-[#0E1526] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#090D16]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">Create Match</h2>
              <p className="text-xs text-slate-400">Schedule a soccer match with MAD pricing and location link</p>
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
              placeholder="e.g. Friday Night Pickup 7v7"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
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
                Kick-Off *
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
                Location / Map Link *
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
              placeholder="e.g. https://maps.app.goo.gl/... or https://maps.google.com/?q=..."
              value={locationLink}
              onChange={(e) => setLocationLink(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Provide a Google Maps or location link for players to get one-click directions to the pitch.
            </p>
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

          {/* Submit Action */}
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
              disabled={isSubmitting || !title.trim() || !locationLink.trim()}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
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

