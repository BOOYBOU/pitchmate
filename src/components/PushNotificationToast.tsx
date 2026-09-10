import React, { useEffect, useState } from 'react';
import { Trophy, Award, Bell, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../lib/useLanguage';
import { pushNotificationService } from '../lib/pushNotificationService';

export interface ToastAlert {
  id: string;
  type: 'new_match' | 'voting_started' | 'general';
  title: string;
  message: string;
  linkId?: string;
}

interface PushNotificationToastProps {
  onSelectMatch: (matchId: string) => void;
}

export const PushNotificationToast: React.FC<PushNotificationToastProps> = ({ onSelectMatch }) => {
  const { isRTL, language } = useLanguage();
  const [activeAlert, setActiveAlert] = useState<ToastAlert | null>(null);

  useEffect(() => {
    // Listen for custom push events in app
    const handlePushEvent = (e: CustomEvent<ToastAlert>) => {
      if (e.detail) {
        setActiveAlert(e.detail);
      }
    };

    window.addEventListener('gomatch:push_toast' as any, handlePushEvent as any);
    return () => {
      window.removeEventListener('gomatch:push_toast' as any, handlePushEvent as any);
    };
  }, []);

  useEffect(() => {
    if (activeAlert) {
      const timer = setTimeout(() => {
        setActiveAlert(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeAlert]);

  if (!activeAlert) return null;

  const handleClick = () => {
    if (activeAlert.linkId) {
      onSelectMatch(activeAlert.linkId);
    }
    setActiveAlert(null);
  };

  return (
    <aside
      aria-label={language === 'ar' ? 'تنبيه فوري' : 'Notification alert'}
      id="push-notification-toast"
      className={`fixed top-4 z-[9999] max-w-sm w-[92%] sm:w-full transition-all duration-300 animate-in slide-in-from-top-4 ${
        isRTL ? 'left-4 sm:left-6' : 'right-4 sm:right-6'
      }`}
    >
      <div
        onClick={handleClick}
        className="cursor-pointer rounded-2xl bg-[#081813]/95 border-2 border-[#E5B869] p-4 shadow-2xl backdrop-blur-md hover:border-[#F5D794] transition-all group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0E4836] to-[#081813] border border-[#E5B869]/50 text-[#F5D794] shrink-0 group-hover:scale-105 transition-transform shadow-md">
            {activeAlert.type === 'new_match' ? (
              <Trophy className="w-5 h-5 text-emerald-400" />
            ) : activeAlert.type === 'voting_started' ? (
              <Award className="w-5 h-5 text-[#F5D794]" />
            ) : (
              <Bell className="w-5 h-5 text-[#E5B869]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#E5B869] bg-[#E5B869]/10 px-2 py-0.5 rounded-md border border-[#E5B869]/20">
                {language === 'ar' ? 'إشعار فوري 🔔' : 'Instant Alert 🔔'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAlert(null);
                }}
                className="p-1 text-emerald-400/60 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <h4 className="text-xs font-bold text-white mt-1 group-hover:text-[#F5D794] transition-colors line-clamp-1">
              {activeAlert.title}
            </h4>
            <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-relaxed line-clamp-2">
              {activeAlert.message}
            </p>

            {activeAlert.linkId && (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#F5D794] group-hover:underline">
                <span>{language === 'ar' ? 'اضغط لعرض المباراة الآن' : 'Tap to view match now'}</span>
                {isRTL ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export const dispatchInAppPushToast = (alert: ToastAlert) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gomatch:push_toast', { detail: alert }));
  }
};
