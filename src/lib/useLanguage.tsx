import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { SupportedLanguage, TRANSLATIONS, MOROCCAN_CITIES_LOCALIZED } from './translations';
import { MOROCCO_TIMEZONE } from '../types';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (path: string, fallback?: string) => string;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
  formatMAD: (amount: number | string | undefined | null, options?: { showZeroAsFree?: boolean; suffix?: string }) => string;
  formatMoroccoDate: (
    dateInput: string | Date | number,
    format?:
      | 'full'
      | 'short'
      | 'relative'
      | 'time'
      | 'datetime'
      | 'date_only'
      | 'time_only'
      | 'day_month_time'
      | 'short_date'
  ) => string;
  getCityName: (cityName: string) => string;
  getPositionName: (posKey: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'pitchmate_selected_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
    return 'ar'; // Default to Arabic as requested
  });

  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    // Synchronize HTML element attributes immediately with zero layout glitch
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language, dir]);

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = useMemo(() => {
    return (path: string, fallback?: string): string => {
      const keys = path.split('.');
      let current: any = TRANSLATIONS[language];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          // Fallback to English dictionary if not found in current
          let enFallback: any = TRANSLATIONS.en;
          for (const ek of keys) {
            if (enFallback && typeof enFallback === 'object' && ek in enFallback) {
              enFallback = enFallback[ek];
            } else {
              enFallback = null;
              break;
            }
          }
          if (typeof enFallback === 'string') return enFallback;
          return fallback || path;
        }
      }

      return typeof current === 'string' ? current : fallback || path;
    };
  }, [language]);

  const formatMAD = useMemo(() => {
    return (
      amount: number | string | undefined | null,
      options?: { showZeroAsFree?: boolean; suffix?: string }
    ): string => {
      const num = typeof amount === 'number' ? amount : Number(amount) || 0;
      if (num === 0 && options?.showZeroAsFree) {
        return language === 'ar' ? 'مجاني' : 'Free';
      }
      const suffix = options?.suffix || (language === 'ar' ? 'درهم مغربي' : 'MAD');
      if (language === 'ar') {
        return `${num.toLocaleString('ar-MA')} ${suffix}`;
      }
      return `${num.toLocaleString('en-US')} ${suffix}`;
    };
  }, [language]);

  const formatMoroccoDate = useMemo(() => {
    return (
      dateInput: string | Date | number,
      format:
        | 'full'
        | 'short'
        | 'relative'
        | 'time'
        | 'datetime'
        | 'date_only'
        | 'time_only'
        | 'day_month_time'
        | 'short_date' = 'datetime'
    ): string => {
      const date = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
      if (isNaN(date.getTime())) return language === 'ar' ? 'تاريخ غير محدد' : 'TBD';

      const locale = language === 'ar' ? 'ar-MA' : 'en-GB';

      if (format === 'time' || format === 'time_only') {
        return new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);
      }

      if (format === 'date_only') {
        return new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(date);
      }

      if (format === 'short_date') {
        return new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          day: 'numeric',
          month: 'short',
        }).format(date);
      }

      if (format === 'day_month_time') {
        const dStr = new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(date);
        const tStr = new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);
        return `${dStr} • ${tStr}`;
      }

      if (format === 'short') {
        const dStr = new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(date);
        const tStr = new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);
        return `${dStr} • ${tStr}`;
      }

      if (format === 'full') {
        const dStr = new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(date);
        const tStr = new Intl.DateTimeFormat(locale, {
          timeZone: MOROCCO_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);
        return language === 'ar' ? `${dStr} على الساعة ${tStr} (غرينتش+1)` : `${dStr} at ${tStr} (GMT+1)`;
      }

      if (format === 'relative') {
        const now = Date.now();
        const diffMs = date.getTime() - now;
        const diffMin = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMs < 0) {
          const pastMin = Math.abs(diffMin);
          if (pastMin < 60) return language === 'ar' ? `منذ ${pastMin} دقيقة` : `${pastMin}m ago`;
          const pastHours = Math.abs(diffHours);
          if (pastHours < 24) return language === 'ar' ? `منذ ${pastHours} ساعة` : `${pastHours}h ago`;
          const pastDays = Math.abs(diffDays);
          return language === 'ar' ? `منذ ${pastDays} يوم` : `${pastDays}d ago`;
        }

        if (diffMin < 60) return language === 'ar' ? `خلال ${diffMin} دقيقة` : `In ${diffMin} mins`;
        if (diffHours < 24) return language === 'ar' ? `خلال ${diffHours} ساعة` : `In ${diffHours} hours`;
        if (diffDays === 1) return language === 'ar' ? 'غداً' : 'Tomorrow';
        return language === 'ar' ? `خلال ${diffDays} أيام` : `In ${diffDays} days`;
      }

      // Default 'datetime'
      const formatted = new Intl.DateTimeFormat(locale, {
        timeZone: MOROCCO_TIMEZONE,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);

      return language === 'ar' ? `${formatted} (توقيت المغرب)` : `${formatted} (Morocco Time)`;
    };
  }, [language]);

  const getCityName = (cityName: string): string => {
    if (!cityName) return '';
    const localized = MOROCCAN_CITIES_LOCALIZED[cityName];
    if (localized) {
      return language === 'ar' ? localized.ar : localized.en;
    }
    // Check if cityName is already Arabic
    return cityName;
  };

  const getPositionName = (posKey: string): string => {
    const pos = (TRANSLATIONS[language] as any)?.positions?.[posKey];
    return pos || posKey;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        dir,
        isRTL,
        formatMAD,
        formatMoroccoDate,
        getCityName,
        getPositionName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
