import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronRight,
  Shield,
  Lock,
  Shirt,
  Sparkles,
  Navigation,
  Sun,
  CloudSun,
  CloudRain,
  Wind,
  Moon,
  Cloud,
  Sunrise,
  Sunset,
  Home,
  CheckCircle2
} from 'lucide-react';
import { SoccerMatch, SUPER_ADMIN_EMAIL } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { getMatchWeatherForecast, getMatchMapUrl } from '../lib/weatherService';

interface MatchCardProps {
  match: SoccerMatch;
  onOpenDetails: (match: SoccerMatch) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onOpenDetails }) => {
  const { currentUser, joinMatch, leaveMatch } = usePitchStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const isUserInRoster = match.roster.some((p) => p.userId === currentUser.id);
  const isUserInWaitlist = match.waitlist.some((p) => p.userId === currentUser.id);
  const isMustaphaSuperAdmin = currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || currentUser.isAdmin;

  const spotsLeft = Math.max(0, match.maxPlayers - match.roster.length);
  const percentFilled = Math.min(100, Math.round((match.roster.length / match.maxPlayers) * 100));

  const matchDate = new Date(match.dateTime);
  const formattedDate = matchDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = matchDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const greenCount = match.roster.filter((p) => p.team === 'green').length;
  const blueCount = match.roster.filter((p) => p.team === 'blue').length;

  // Compute live pitch weather forecast
  const weather = getMatchWeatherForecast(
    match.dateTime,
    match.location.venueName,
    match.location.city,
    match.location.latitude,
    match.location.longitude
  );

  // Compute payments count
  const paidCount = (match.paidPlayerIds || []).filter((id) =>
    match.roster.some((p) => p.userId === id)
  ).length;

  const getWeatherIcon = () => {
    switch (weather.icon) {
      case 'sunrise':
        return <Sunrise className="w-3.5 h-3.5 text-amber-400" />;
      case 'sunset':
        return <Sunset className="w-3.5 h-3.5 text-orange-400" />;
      case 'sun':
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'cloud-sun':
        return <CloudSun className="w-3.5 h-3.5 text-amber-300" />;
      case 'cloud-rain':
        return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
      case 'wind':
        return <Wind className="w-3.5 h-3.5 text-teal-400" />;
      case 'moon':
        return <Moon className="w-3.5 h-3.5 text-indigo-300" />;
      case 'home':
        return <Home className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
    }
  };

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mapUrl = getMatchMapUrl(match.location);
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleJoinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    await joinMatch(match.id);
    setIsProcessing(false);
  };

  const handleLeaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    await leaveMatch(match.id);
    setIsProcessing(false);
  };

  return (
    <div
      id={`match-card-${match.id}`}
      onClick={() => onOpenDetails(match)}
      className="group relative bg-[#0E1526] hover:bg-[#111A30] border border-[#1E293B] hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Top accent glow line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/20 via-blue-500/40 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Card Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {match.format && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {match.format}
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
              {match.maxPlayers} Max Players
            </span>
            {match.pricePerPlayer === 0 ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20">
                Free
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 flex items-center gap-1">
                <span>${match.pricePerPlayer}/p</span>
                {match.roster.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono">({paidCount}/{match.roster.length} Paid)</span>
                )}
              </span>
            )}
            {match.isLocked && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}
          </div>

          {/* Admin badge tag */}
          {match.creatorEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shrink-0"
              title="Official match organized by Super Admin Mustapha"
            >
              <Shield className="w-3 h-3 text-emerald-400" />
              Mustapha
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base sm:text-lg font-bold font-display text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
            {match.title}
          </h3>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <p className="text-xs text-slate-400 flex items-center gap-1.5 line-clamp-1 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{match.location.venueName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-medium shrink-0">{match.location.pitchNumber || 'Pitch 1'}</span>
            </p>

            {/* Dedicated Accurate Maps Button */}
            <button
              id={`match-card-maps-btn-${match.id}`}
              type="button"
              onClick={handleOpenMaps}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 hover:border-blue-400/50 transition-all cursor-pointer shrink-0 shadow-sm"
              title={`Open ${match.location.venueName} GPS coordinates (${match.location.latitude ?? 37.77}, ${match.location.longitude ?? -122.41}) on Google Maps`}
            >
              <Navigation className="w-3 h-3 text-blue-400" />
              <span>Maps</span>
              <ExternalLink className="w-2.5 h-2.5 text-blue-400/80" />
            </button>
          </div>
        </div>

        {/* Live Weather Forecast Preview Badge */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#090D16]/90 border border-[#1E293B] text-[11px]">
          <div className="flex items-center gap-2 text-slate-300 min-w-0 flex-1">
            {getWeatherIcon()}
            <span className="font-bold text-white shrink-0">{weather.tempC}°C</span>
            <span className="text-[10px] text-slate-400 hidden xs:inline shrink-0">({weather.tempF}°F)</span>
            <span className="text-slate-400 truncate text-[11px]">{weather.condition}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-teal-400 font-mono flex items-center gap-0.5">
              <Wind className="w-2.5 h-2.5 inline" /> {weather.windSpeedKmh}k/h
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              weather.pitchSuitability.includes('Warning')
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            }`}>
              {weather.pitchSuitability}
            </span>
          </div>
        </div>

        {/* Match Time & Team Balance Preview */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#090D16] border border-[#1E293B]/70 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">Kickoff Date</div>
              <div className="font-semibold text-slate-200">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#090D16] border border-[#1E293B]/70 text-xs">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="truncate">
              <div className="text-[10px] text-slate-400">Match Time</div>
              <div className="font-semibold text-slate-200">{formattedTime} ({match.durationMinutes}m)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Roster Stats & Action */}
      <div className="mt-4 pt-3 border-t border-[#1E293B] space-y-3">
        {/* Roster filled meter */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Confirmed Players:
              <strong className="text-slate-200">{match.roster.length} / {match.maxPlayers}</strong>
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <Shirt className="w-3 h-3 text-emerald-400" /> {greenCount} Green
              </span>
              <span className="text-blue-400 font-bold flex items-center gap-0.5">
                <Shirt className="w-3 h-3 text-blue-400" /> {blueCount} Blue
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentFilled >= 100
                  ? 'bg-emerald-400'
                  : percentFilled >= 70
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${percentFilled}%` }}
            />
          </div>
        </div>

        {/* Avatars Preview & Instant Action Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Avatar stack */}
          <div className="flex items-center -space-x-2 overflow-hidden">
            {match.roster.slice(0, 5).map((player) => (
              <img
                key={player.userId}
                src={player.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={player.name}
                className={`w-7 h-7 rounded-full object-cover border-2 ${
                  player.team === 'green'
                    ? 'border-emerald-500'
                    : player.team === 'blue'
                    ? 'border-blue-500'
                    : 'border-slate-700'
                }`}
                referrerPolicy="no-referrer"
              />
            ))}
            {match.roster.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-[#0E1526] text-[10px] font-bold text-slate-300 flex items-center justify-center">
                +{match.roster.length - 5}
              </div>
            )}
            {match.roster.length === 0 && (
              <span className="text-[11px] text-slate-500">Be the first to join!</span>
            )}
          </div>

          {/* Instant Action Button */}
          <div>
            {isUserInRoster ? (
              <button
                id={`leave-match-btn-${match.id}`}
                type="button"
                onClick={handleLeaveClick}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                title="Leave this match"
              >
                <UserX className="w-3.5 h-3.5" />
                Leave Match
              </button>
            ) : isUserInWaitlist ? (
              <button
                id={`leave-waitlist-btn-${match.id}`}
                type="button"
                onClick={handleLeaveClick}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                title="In waitlist queue"
              >
                <UserX className="w-3.5 h-3.5" />
                Waitlist (Joined)
              </button>
            ) : match.isLocked ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                Locked
              </span>
            ) : (
              <button
                id={`join-match-btn-${match.id}`}
                type="button"
                onClick={handleJoinClick}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/30 transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {spotsLeft === 0 ? 'Join Waitlist' : 'Join Match'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

