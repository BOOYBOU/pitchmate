import React from 'react';

interface PitchMateLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
  withSubtitle?: boolean;
  className?: string;
}

export const PitchMateLogo: React.FC<PitchMateLogoProps> = ({
  size = 'md',
  iconOnly = false,
  withSubtitle = true,
  className = '',
}) => {
  // Dimensions mapping
  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-13 h-13',
    xl: 'w-18 h-18',
  };

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const subtitleSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* High-Resolution Professional Vector Crest */}
      <div
        className={`relative ${iconSizes[size]} rounded-2xl p-[1.5px] bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 shadow-xl shadow-emerald-950/60 shrink-0 group`}
      >
        {/* Inner Obsidian Pitch Badge */}
        <div className="w-full h-full bg-[#090D16] rounded-[14px] flex items-center justify-center relative overflow-hidden">
          {/* Subtle luminous ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-transparent to-teal-500/10 pointer-events-none" />

          {/* SVG Vector Artwork: Soccer Pitch Crest & Ball Geometry */}
          <svg
            className="w-full h-full p-1.5"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Emerald Neon Gradient */}
              <linearGradient id="pitchEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              {/* Pitch Grass Grid Shimmer */}
              <linearGradient id="shieldBg" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0E1726" />
                <stop offset="100%" stopColor="#050B14" />
              </linearGradient>

              {/* Gold/Emerald Glow Accent */}
              <radialGradient id="ballGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Shield Outline Path */}
            <path
              d="M50 5 L88 18 C88 56 68 85 50 95 C32 85 12 56 12 18 Z"
              fill="url(#shieldBg)"
              stroke="url(#pitchEmeraldGrad)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Tactical Pitch Lines Inside Shield */}
            {/* Center Line */}
            <line x1="20" y1="50" x2="80" y2="50" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.45" />

            {/* Center Circle */}
            <circle cx="50" cy="50" r="16" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.5" />

            {/* Penalty Box Top */}
            <rect
              x="32"
              y="12"
              width="36"
              height="18"
              stroke="#10B981"
              strokeWidth="1.2"
              strokeOpacity="0.35"
              fill="none"
            />
            {/* Penalty Arc Top */}
            <path
              d="M40 30 C45 35 55 35 60 30"
              stroke="#10B981"
              strokeWidth="1.2"
              strokeOpacity="0.35"
              fill="none"
            />

            {/* Penalty Box Bottom */}
            <rect
              x="32"
              y="70"
              width="36"
              height="18"
              stroke="#10B981"
              strokeWidth="1.2"
              strokeOpacity="0.35"
              fill="none"
            />

            {/* Central Precision Soccer Ball with Facets */}
            <circle cx="50" cy="50" r="14" fill="#090D16" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="14" fill="url(#ballGlow)" />

            {/* Central Pentagon */}
            <polygon
              points="50,42 57,47 54,55 46,55 43,47"
              fill="url(#pitchEmeraldGrad)"
            />

            {/* Seam Lines Radiating */}
            <line x1="50" y1="42" x2="50" y2="36" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="57" y1="47" x2="63" y2="44" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="54" y1="55" x2="59" y2="60" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="46" y1="55" x2="41" y2="60" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="43" y1="47" x2="37" y2="44" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />

            {/* Outer Speed Accent Arc */}
            <path
              d="M75 22 C84 32 86 46 82 60"
              stroke="url(#pitchEmeraldGrad)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Modern High-Impact Brand Wordmark */}
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black font-display tracking-tight text-white ${textSizes[size]}`}
            >
              PITCH
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 bg-clip-text text-transparent ml-0.5">
                MATE
              </span>
            </span>

            {/* Dynamic Status Pill */}
            {size !== 'xs' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ml-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                FC
              </span>
            )}
          </div>

          {withSubtitle && (
            <span
              className={`text-slate-400 font-medium tracking-normal mt-0.5 hidden sm:block ${subtitleSizes[size]}`}
            >
              Match Organizer &amp; Roster Hub
            </span>
          )}
        </div>
      )}
    </div>
  );
};
