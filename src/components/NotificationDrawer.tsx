import React from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  Users,
  DollarSign,
  Info,
  Trash2,
  Calendar,
  Phone,
  Sparkles
} from 'lucide-react';
import { usePitchStore } from '../lib/usePitchStore';
import { useLanguage } from '../lib/useLanguage';
import { InAppNotification } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMatch?: (matchId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectMatch,
}) => {
  const {
    notifications,
    currentUser,
    markNotificationAsRead,
    clearAllNotifications,
  } = usePitchStore();
  const { t, language, isRTL } = useLanguage();

  if (!isOpen) return null;

  const userNotifications = notifications.filter(
    (n) => n.userId === currentUser.id || n.userId === 'all'
  );

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const getIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className="w-4 h-4 text-[#F5D794]" />;
      case 'match_join':
        return <Users className="w-4 h-4 text-[#E5B869]" />;
      case 'waitlist_promoted':
        return <Sparkles className="w-4 h-4 text-[#F5D794]" />;
      case 'cost_reminder':
        return <DollarSign className="w-4 h-4 text-[#E5B869]" />;
      case 'team_balance':
        return <Users className="w-4 h-4 text-[#E5B869]" />;
      default:
        return <Info className="w-4 h-4 text-[#E5B869]" />;
    }
  };

  const handleNotificationClick = (notif: InAppNotification) => {
    markNotificationAsRead(notif.id);
    if (notif.linkId && onSelectMatch) {
      onSelectMatch(notif.linkId);
      onClose();
    }
  };

  return (
    <div
      id="notification-drawer-overlay"
      className={`fixed inset-0 z-50 flex ${isRTL ? 'justify-start' : 'justify-end'} bg-black/70 backdrop-blur-xs animate-in fade-in duration-200`}
      onClick={onClose}
    >
      <div
        id="notification-drawer-panel"
        className={`w-full max-w-md bg-[#0A3A2A] ${isRTL ? 'border-r border-[#E5B869]/35 slide-in-from-left' : 'border-l border-[#E5B869]/35 slide-in-from-right'} h-full shadow-2xl flex flex-col animate-in duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E5B869]/20 bg-[#081813]/95 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0E4836] border border-[#E5B869]/40 flex items-center justify-center text-[#F5D794]">
              <Bell className="w-4 h-4 text-[#E5B869]" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                {t('notifications.title')}
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#E5B869] text-slate-950">
                    {language === 'ar' ? `${unreadCount} جديد` : `${unreadCount} new`}
                  </span>
                )}
              </h2>
              <p className="text-xs text-emerald-300/70">
                {language === 'ar' ? 'تنبيهات المباريات، الموافقات، وتحديثات الرسوم' : 'Match alerts, approvals, and fee updates'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {userNotifications.length > 0 && (
              <button
                id="clear-all-notifications-btn"
                type="button"
                onClick={clearAllNotifications}
                className="p-2 text-emerald-300/70 hover:text-rose-300 rounded-lg hover:bg-[#0E4836] transition-colors text-xs cursor-pointer"
                title={t('notifications.clearAll')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              id="close-notification-drawer-btn"
              type="button"
              onClick={onClose}
              className="p-2 text-emerald-300/70 hover:text-white rounded-lg hover:bg-[#0E4836] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {userNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0E4836] border border-[#E5B869]/40 text-[#F5D794] flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 text-[#E5B869]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t('notifications.noNotifications')}</h3>
                <p className="text-xs text-emerald-300/70 max-w-xs mx-auto mt-1">
                  {language === 'ar'
                    ? 'أنت على اطلاع دائم! ستظهر هنا تنبيهات المباريات، الترقية من قائمة الانتظار، وتحديثات اللاعبين.'
                    : "You're all caught up! Game alerts, waitlist promotions, and player updates will appear here."}
                </p>
              </div>
            </div>
          ) : (
            userNotifications.map((notif) => (
              <div
                key={notif.id}
                id={`notification-card-${notif.id}`}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  notif.read
                    ? 'bg-[#081813]/70 border-[#E5B869]/15 text-emerald-200/70'
                    : 'bg-[#0E4836]/90 border-[#E5B869]/40 text-white shadow-md'
                } hover:border-[#E5B869]/60`}
              >
                <div className="p-2 rounded-lg bg-[#081813] border border-[#E5B869]/25 shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                    <span className="text-[10px] text-emerald-300/70 shrink-0 font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 mt-1 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.linkId && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#F5D794] hover:text-white">
                      <Calendar className="w-3 h-3 text-[#E5B869]" />
                      <span>{t('notifications.viewDetails')}</span>
                    </div>
                  )}
                </div>

                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-[#E5B869] shrink-0 self-center" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5B869]/20 bg-[#081813]/95 text-center">
          <p className="text-[11px] text-emerald-300/70">
            {language === 'ar'
              ? 'الإشعارات الفورية مفعلة لجميع اللاعبين المسجلين في المنصة'
              : 'Real-time notifications enabled for registered league players'}
          </p>
        </div>
      </div>
    </div>
  );
};

