import React, { useState } from 'react';
import { MapPin, Search, ExternalLink, Compass, Check, X, Navigation } from 'lucide-react';
import { MatchLocation } from '../types';
import { POPULAR_PITCH_PRESETS } from '../lib/mockData';
import { getMatchMapUrl } from '../lib/mapUtils';

interface GoogleMapsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (loc: MatchLocation) => void;
  currentLocation?: MatchLocation;
}

export const GoogleMapsPickerModal: React.FC<GoogleMapsPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<(typeof POPULAR_PITCH_PRESETS)[0] | null>(null);
  const [customVenue, setCustomVenue] = useState(currentLocation?.venueName || '');
  const [customAddress, setCustomAddress] = useState(currentLocation?.address || '');
  const [customCity, setCustomCity] = useState(currentLocation?.city || 'Downtown');
  const [customLat, setCustomLat] = useState<number>(currentLocation?.latitude || 37.7749);
  const [customLng, setCustomLng] = useState<number>(currentLocation?.longitude || -122.4194);
  const [pitchNumber, setPitchNumber] = useState(currentLocation?.pitchNumber || 'Pitch 1');

  if (!isOpen) return null;

  const filteredPresets = POPULAR_PITCH_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPreset = (preset: (typeof POPULAR_PITCH_PRESETS)[0]) => {
    setSelectedPreset(preset);
    setCustomVenue(preset.name);
    setCustomAddress(preset.address);
    setCustomCity(preset.city);
    setCustomLat(preset.latitude);
    setCustomLng(preset.longitude);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomLat(pos.coords.latitude);
          setCustomLng(pos.coords.longitude);
          setCustomVenue('Current GPS Location');
          setCustomAddress(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        (err) => {
          console.warn('Geolocation error:', err);
        }
      );
    }
  };

  const handleConfirm = () => {
    const lat = Number(customLat) || 37.7749;
    const lng = Number(customLng) || -122.4194;
    const venue = customVenue.trim() || 'Soccer Pitch Venue';
    const addr = customAddress.trim() || 'Local Pitch Address';
    const city = customCity.trim() || 'City Center';

    const loc: MatchLocation = {
      venueName: venue,
      address: addr,
      city: city,
      latitude: lat,
      longitude: lng,
      pitchNumber: pitchNumber.trim() || 'Pitch 1',
    };

    loc.googleMapsUrl = getMatchMapUrl(loc);

    onSelectLocation(loc);
    onClose();
  };

  const googleMapsSearchLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    customAddress ? `${customVenue}, ${customAddress}` : `${customLat},${customLng}`
  )}`;

  return (
    <div
      id="google-maps-picker-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[#0E1526] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#090D16]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white">Google Maps Pitch Picker</h2>
              <p className="text-xs text-slate-400">Select a venue, search verified soccer pitches, or set custom GPS</p>
            </div>
          </div>
          <button
            id="close-maps-picker-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="pitch-search-input"
              type="text"
              placeholder="Search soccer pitches, complexes, or addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Quick preset pitches */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Popular Soccer Pitches & Venues
              </span>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Use My Location
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = customVenue === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm shadow-emerald-950'
                        : 'bg-[#131C31]/50 border-[#1E293B] hover:border-slate-600 hover:bg-[#131C31]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100 line-clamp-1">{preset.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-1">{preset.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-slate-400">{preset.city}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom / Selected Details Form */}
          <div className="p-4 bg-[#090D16] border border-[#1E293B] rounded-xl space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Venue Coordinates & Pitch Label
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Venue / Park Name</label>
                <input
                  type="text"
                  value={customVenue}
                  onChange={(e) => setCustomVenue(e.target.value)}
                  placeholder="e.g. Westside Park Turf"
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Pitch / Court #</label>
                <input
                  type="text"
                  value={pitchNumber}
                  onChange={(e) => setPitchNumber(e.target.value)}
                  placeholder="e.g. Pitch 3 or Court A"
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Street Address or Area</label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="e.g. 450 Stadium Way, Downtown"
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">City / Region</label>
                <input
                  type="text"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="e.g. San Francisco"
                  className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLat}
                    onChange={(e) => setCustomLat(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLng}
                    onChange={(e) => setCustomLng(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#0E1526] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Google Maps Live Direction button */}
            <div className="pt-2 flex items-center justify-between border-t border-[#1E293B]">
              <span className="text-xs text-slate-400">Verify in Google Maps:</span>
              <a
                href={googleMapsSearchLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Preview in Google Maps
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1E293B] bg-[#090D16]/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-location-btn"
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Set Pitch Location
          </button>
        </div>
      </div>
    </div>
  );
};
