import React, { useState } from 'react';

interface PitchMateLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
  withSubtitle?: boolean;
  className?: string;
}

export const PitchMateLogo: React.FC<PitchMateLogoProps> = ({
  size = 'md',
  iconOnly = false,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Dimensions mapping
  const iconSizes = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-[17px] font-black tracking-tight',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const gapSizes = {
    xs: 'gap-1.5',
    sm: 'gap-2',
    md: 'gap-2.5 sm:gap-3',
    lg: 'gap-3',
    xl: 'gap-4',
  };

  return (
    <div className={`inline-flex items-center ${gapSizes[size]} select-none ${className}`}>
      {/* High-Resolution Professional GoMatch Emblem */}
      <div
        className={`relative ${iconSizes[size]} rounded-2xl p-[1.5px] bg-gradient-to-br from-[#F5D794] via-[#E5B869] to-[#0D503C] shadow-xl shadow-black/80 shrink-0 group`}
      >
        <div className="w-full h-full bg-[#080B10] rounded-[14px] flex items-center justify-center relative overflow-hidden ring-1 ring-white/10">
          {!imageError ? (
            <img
              src="/images/brand/gomatch_logo_512.png?v=5"
              alt="GoMatch Emblem"
              className="w-full h-full object-cover rounded-[13px] transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            /* Premium Vector Fallback: Soccer Crest with Geometric GoMatch Monogram */
            <svg
              className="w-full h-full p-1.5"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="fallbackGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5D794" />
                  <stop offset="50%" stopColor="#E5B869" />
                  <stop offset="100%" stopColor="#C69238" />
                </linearGradient>
                <linearGradient id="fallbackBg" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#141B26" />
                  <stop offset="100%" stopColor="#080B10" />
                </linearGradient>
              </defs>
              <path
                d="M50 6 L86 19 C86 55 67 84 50 94 C33 84 14 55 14 19 Z"
                fill="url(#fallbackBg)"
                stroke="url(#fallbackGold)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cx="50" cy="48" r="18" fill="#0A131F" stroke="url(#fallbackGold)" strokeWidth="2" />
              <polygon points="50,38 58,44 55,54 45,54 42,44" fill="url(#fallbackGold)" />
              <line x1="50" y1="38" x2="50" y2="30" stroke="#F5D794" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="58" y1="44" x2="65" y2="40" stroke="#F5D794" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="55" y1="54" x2="61" y2="61" stroke="#F5D794" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="45" y1="54" x2="39" y2="61" stroke="#F5D794" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="42" y1="44" x2="35" y2="40" stroke="#F5D794" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {/* Subtle luminous gloss reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none rounded-[14px]" />
        </div>
      </div>

      {/* Modern High-Impact Brand Wordmark */}
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black font-display tracking-tight ${textSizes[size]}`}
            >
              <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]">
                GO
              </span>
              <span className="bg-gradient-to-r from-[#F5D794] via-[#E5B869] to-[#C69238] bg-clip-text text-transparent ml-1 drop-shadow-[0_0_8px_rgba(229,184,105,0.2)]">
                MATCH
              </span>
            </span>

            {/* Dynamic Status Pill */}
            {size !== 'xs' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[#241A0B] text-[#F5D794] border border-[#E5B869]/40 ml-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5B869] animate-pulse" />
                FC
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Aliased export for modern GoMatch naming convention
export const GoMatchLogo = PitchMateLogo;

