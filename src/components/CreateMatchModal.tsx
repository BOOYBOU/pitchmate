import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, DollarSign, FileText, X, PlusCircle, Navigation } from 'lucide-react';
import { MatchLocation, SoccerMatch } from '../types';
import { GoogleMapsPickerModal } from './GoogleMapsPickerModal';
import { usePitchStore } from '../lib/usePitchStore';
import { POPULAR_PITCH_PRESETS } from '../lib/mockData';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (matchId: string) => void;
}

const DEFAULT_LOCATION: MatchLocation = {
  venueName: POPULAR_PITCH_PRESETS[0].name,
  address: POPULAR_PITCH_PRESETS[0].address,
  city: POPULAR_PITCH_PRESETS[0].city,
  latitude: 37.7749,
  longitude: -122.4194,
  googleMapsUrl: POPULAR_PITCH_PRESETS[0].mapsUrl,
  pitchNumber: 'Pitch 3',
};

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createMatch } = usePitchStore();

  // Match form fields
  const [title, setTitle] = useState('');
  
  // Date & Time computation
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(19, 0, 0, 0);

  const [matchDate, setMatchDate] = useState(defaultDate.toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('19:00');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [format, setFormat] = useState('7v7');
  const [maxPlayers, setMaxPlayers] = useState(14);
  const [pricePerPlayer, setPricePerPlayer] = useState<number>(0);
  const [notes, setNotes] = useState('');
  
  // Location
  const [location, setLocation] = useState<MatchLocation>(DEFAULT_LOCATION);
  const [isMapsPickerOpen, setIsMapsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const combinedDateTime = new Date(`${matchDate}T${matchTime}:00`);

      const newMatchId = await createMatch({
        title: title.trim(),
        dateTime: combinedDateTime.toISOString(),
        durationMinutes: Number(durationMinutes) || 90,
        location,
        format: format as any,
        maxPlayers: Number(maxPlayers) || 14,
        pricePerPlayer: Number(pricePerPlayer) || 0,
        notes: notes.trim(),
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
                <h2 className="text-lg font-bold font-display text-white">Create Soccer Match</h2>
                <p className="text-xs text-slate-400">Set pitch location, match time, player capacity, and invite local players</p>
              </div>
            </div>
            <button
              id="close-create-modal-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
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
                placeholder="e.g. Wednesday Sunset Battle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date & Time Grid */}
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
                  Kick-Off Time *
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

            {/* Match Location (Single text/URL field with Auto-Map Link) */}
            <div className="p-4 bg-[#090D16] border border-[#1E293B] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Pitch Location & Venue *
                </label>
                <button
                  id="open-google-maps-picker-btn"
                  type="button"
                  onClick={() => setIsMapsPickerOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded-lg transition-all cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Preset Locations
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Venue Name</label>
                  <input
                    id="venue-name-input"
                    type="text"
                    required
                    placeholder="e.g. Metropolitan Soccer Complex"
                    value={location.venueName}
                    onChange={(e) =>
                      setLocation({
                        ...location,
                        venueName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-400">
                      Google Maps URL or Address
                    </label>
                    {location.googleMapsUrl && (
                      <a
                        href={location.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Test / Open Map
                      </a>
                    )}
                  </div>
                  <input
                    id="maps-url-input"
                    type="text"
                    required
                    placeholder="Paste Google Maps link (e.g. https://maps.google.com/?q=...) or Address"
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
            </div>

            {/* Format & Player Capacity & Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    // Automatically adjust default capacity
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
                      setMaxPlayers(capacityMap[nextFormat]);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="5v5">5v5 (10 Players)</option>
                  <option value="6v6">6v6 (12 Players)</option>
                  <option value="7v7">7v7 (14 Players)</option>
                  <option value="8v8">8v8 (16 Players)</option>
                  <option value="9v9">9v9 (18 Players)</option>
                  <option value="10v10">10v10 (20 Players)</option>
                  <option value="11v11">11v11 (22 Players)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Capacity (Max) *
                </label>
                <input
                  id="match-max-players-input"
                  type="number"
                  min={2}
                  max={44}
                  required
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Price / Player ($)
                </label>
                <input
                  id="match-price-input"
                  type="number"
                  min={0}
                  max={100}
                  value={pricePerPlayer}
                  onChange={(e) => setPricePerPlayer(Number(e.target.value))}
                  placeholder="0 for free"
                  className="w-full px-3 py-2 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Match Notes / Gear Info */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Match Notes & Rules
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Bring a white shirt and a dark shirt. Shin guards recommended."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="submit-create-match-btn"
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                {isSubmitting ? 'Creating...' : 'Publish Match'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Google Maps Picker Modal */}
      <GoogleMapsPickerModal
        isOpen={isMapsPickerOpen}
        onClose={() => setIsMapsPickerOpen(false)}
        onSelectLocation={(selectedLoc) => setLocation(selectedLoc)}
        currentLocation={location}
      />
    </>
  );
};
