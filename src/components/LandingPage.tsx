import React from 'react';
import {
  Calendar,
  Users,
  MapPin,
  Shield,
  ArrowRight,
  UserCheck,
  Flame,
  Navigation,
} from 'lucide-react';
import { SUPER_ADMIN_EMAIL, SoccerMatch } from '../types';
import { usePitchStore } from '../lib/usePitchStore';
import { formatMAD, formatMoroccoDate } from '../lib/moroccoUtils';

interface LandingPageProps {
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onExploreMatches: () => void;
  onOpenMatchDetails: (match: SoccerMatch) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenSignIn,
  onOpenSignUp,
  onExploreMatches,
  onOpenMatchDetails,
}) => {
  const { matches, isSupabaseLive } = usePitchStore();

  return (
    <div id="landing-page-container" className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0E1526] via-[#090D16] to-[#090D16] border border-[#1E293B] rounded-3xl p-6 sm:p-12 shadow-2xl">
        <div className="pitch-lines absolute inset-0 opacity-15 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Morocco's Premier Pickup Soccer & Roster Platform
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-display text-white tracking-tight leading-none">
            Find Your Game. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
              Own The Moroccan Pitch.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            The instant soccer match platform for organizers and players across Casablanca, Rabat, Marrakech, Tangier, and Agadir. Live rosters, snake team balancing, live scoreboards, and MAD fee splitting.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="landing-signup-cta-btn"
              onClick={onOpenSignUp}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="landing-signin-cta-btn"
              onClick={onOpenSignIn}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold text-slate-200 bg-[#0E1526] hover:bg-slate-800 border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Sign In
            </button>

            <button
              id="landing-explore-cta-btn"
              onClick={onExploreMatches}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-emerald-400" />
              Browse Active Matches
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[#1E293B]/80 max-w-lg mx-auto">
            <div>
              <div className="text-2xl sm:text-3xl font-black font-display text-emerald-400">{matches.length}</div>
              <div className="text-xs text-slate-400 font-medium">Morocco Fixtures</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-display text-blue-400">
                {matches.reduce((a, b) => a + b.roster.length, 0)}
              </div>
              <div className="text-xs text-slate-400 font-medium">Active Players</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-display text-slate-200">
                GMT+1
              </div>
              <div className="text-xs text-slate-400 font-medium">Casablanca Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Matches Preview Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Upcoming Matches in Morocco
            </h2>
            <p className="text-xs text-slate-400">Claim your roster slot before it fills up</p>
          </div>

          <button
            onClick={onExploreMatches}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer self-start sm:self-center"
          >
            View All Matches ({matches.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.slice(0, 3).map((match) => {
            const spotsLeft = Math.max(0, match.maxPlayers - match.roster.length);
            return (
              <div
                key={match.id}
                onClick={() => onOpenMatchDetails(match)}
                className="group p-5 bg-[#0E1526] hover:bg-[#111A30] border border-[#1E293B] hover:border-emerald-500/40 rounded-2xl transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30">
                      {spotsLeft} Spots Available
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold">
                      {formatMAD(match.pricePerPlayer, { showZeroAsFree: true })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {match.title}
                  </h3>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      {formatMoroccoDate(match.dateTime, 'day_month_time')}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate">{match.location.venueName} ({match.location.city || 'Casablanca'})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between">
                  <div className="flex items-center -space-x-1.5">
                    {match.roster.slice(0, 4).map((p) => (
                      <img
                        key={p.userId}
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-6 h-6 rounded-full object-cover border border-[#0E1526]"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                    {match.roster.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-[#0E1526] text-[9px] font-bold text-slate-300 flex items-center justify-center">
                        +{match.roster.length - 4}
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
                    View Roster
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 bg-[#0E1526] border border-[#1E293B] rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Instant Live Rosters</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Join or leave matches with a single click. Player counts, bib assignments, and waitlists update in real-time.
          </p>
        </div>

        <div className="p-6 bg-[#0E1526] border border-[#1E293B] rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Navigation className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Google Maps Directions</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Direct map links for every Moroccan pitch so players arrive on time to kickoff.
          </p>
        </div>

        <div className="p-6 bg-[#0E1526] border border-[#1E293B] rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Super Admin & Master Pass</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Strict admin security for Mustapha Bouhbous with match moderation, snake team balancing, and roster overrides.
          </p>
        </div>
      </section>

      {/* Call to action footer banner */}
      <section className="bg-gradient-to-r from-[#0E1526] via-[#131C31] to-[#0E1526] border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold font-display text-white">Ready for Kickoff?</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Create your account now and connect with local soccer players across Morocco.
        </p>
        <button
          onClick={onOpenSignUp}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/30 transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          Sign Up Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
