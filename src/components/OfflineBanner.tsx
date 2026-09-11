import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnectedAlert, setShowReconnectedAlert] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedAlert(true);
      const timer = setTimeout(() => {
        setShowReconnectedAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedAlert(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnectedAlert) {
    return null;
  }

  return (
    <div
      id="connection-status-banner"
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-xs font-bold transition-all duration-300 shadow-lg flex items-center justify-between backdrop-blur-md ${
        isOnline
          ? 'bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-200'
          : 'bg-rose-950/95 border-b border-rose-500/50 text-rose-200 animate-pulse'
      }`}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>
            {isOnline
              ? language === 'ar'
                ? 'تمت استعادة الاتصال بالإنترنت بنجاح!'
                : 'Internet connection restored! Syncing data...'
              : language === 'ar'
              ? 'أنت غير متصل بالإنترنت حالياً. بياناتك محفوظة محلياً.'
              : 'You are currently offline. Your data remains saved locally.'}
          </span>
        </div>

        {!isOnline && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-100 border border-rose-400/40 text-[11px] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
