/**
 * GoMatch Push Notification Service
 * Handles browser & mobile Web Push notifications, vibration, sound chimes,
 * and service worker synchronization.
 */

import { SoundEffects } from './audioService';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  linkId?: string;
  data?: Record<string, unknown>;
  vibrate?: number[];
}

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private matchClickListeners: Set<(matchId: string) => void> = new Set();
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Initializes Service Worker & listens for notification interactions
   */
  public async init(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Register Service Worker if supported
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        this.swRegistration = reg;
      } catch (err) {
        console.warn('[Push Service] Service Worker registration note:', err);
      }

      // Listen for message from service worker when notification is clicked
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'GOMATCH_OPEN_MATCH' && event.data.matchId) {
          this.notifyMatchClick(event.data.matchId);
        }
      });
    }
  }

  /**
   * Checks if Notification API is supported by current browser
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Returns current notification permission state ('granted' | 'denied' | 'default')
   */
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Prompts user for push notification permission
   */
  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('gomatch_push_notifications_enabled', 'true');
        // Trigger a pleasant welcome confirmation chime
        SoundEffects.playSentSound();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Push Service] Error requesting permission:', err);
      return false;
    }
  }

  /**
   * Sends a real system Push Notification to the user's phone / desktop
   */
  public async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    // 1. Play audio chime and device vibration
    try {
      SoundEffects.playMessageReceived();
    } catch {}

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && navigator.vibrate) {
      try {
        navigator.vibrate(payload.vibrate || [200, 100, 200, 100, 200]);
      } catch {}
    }

    // 2. Check if browser push notification is permitted
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const icon = payload.icon || '/images/brand/gomatch_logo_192.png';
    const badge = payload.badge || '/images/brand/gomatch_logo_192.png';

    try {
      const swOptions: any = {
        body: payload.body,
        icon,
        badge,
        tag: payload.tag || 'gomatch-alert',
        vibrate: payload.vibrate || [200, 100, 200],
        data: {
          url: payload.linkId ? `/?matchId=${payload.linkId}` : '/',
          matchId: payload.linkId,
          ...payload.data,
        },
        renotify: true,
      };

      if (this.swRegistration && 'showNotification' in this.swRegistration) {
        await this.swRegistration.showNotification(payload.title, swOptions);
        return true;
      } else {
        const notif = new Notification(payload.title, {
          body: payload.body,
          icon,
          tag: payload.tag || 'gomatch-alert',
        });
        notif.onclick = () => {
          window.focus();
          if (payload.linkId) {
            this.notifyMatchClick(payload.linkId);
          }
        };
        return true;
      }
    } catch (err) {
      console.warn('[Push Service] Notification send note:', err);
      return false;
    }
  }

  /**
   * Subscribe to match click from notifications
   */
  public onMatchClick(callback: (matchId: string) => void): () => void {
    this.matchClickListeners.add(callback);
    return () => {
      this.matchClickListeners.delete(callback);
    };
  }

  private notifyMatchClick(matchId: string) {
    this.matchClickListeners.forEach((listener) => {
      try {
        listener(matchId);
      } catch (err) {
        console.error('[Push Service] Listener error:', err);
      }
    });
  }
}

export const pushNotificationService = new PushNotificationService();
