
import { UserProfile } from '../types';
import { API_URL } from './api';

interface AnalyticsEvent {
  timestamp: string;
  eventType: string;
  userId: string;
  username: string;
  details: string; // JSON string
}

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private isProcessing = false;
  private flushInterval: any = null;
  private BATCH_SIZE = 15;
  private FLUSH_DELAY = 10000;

  constructor() {
    // HMR Cleanup: Stop previous instance if exists
    if ((window as any).__ANALYTICS_INSTANCE__) {
        try { (window as any).__ANALYTICS_INSTANCE__.destroy(); } catch(e) {}
    }
    (window as any).__ANALYTICS_INSTANCE__ = this;
    
    this.startAutoFlush();
  }

  public destroy() {
      if (this.flushInterval) {
          clearInterval(this.flushInterval);
          this.flushInterval = null;
      }
  }

  private startAutoFlush() {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.FLUSH_DELAY);
  }

  public track(eventType: string, user: UserProfile | null, data: Record<string, any> = {}) {
    try {
      const event: AnalyticsEvent = {
        timestamp: new Date().toISOString(),
        eventType,
        userId: user?.email || user?.uid || 'anonymous', // Changed to prefer email for sheets
        username: user?.username || 'Guest',
        details: JSON.stringify(data),
      };

      this.queue.push(event);

      // Если очередь большая, отправляем немедленно
      if (this.queue.length >= this.BATCH_SIZE) {
        this.flush();
      }
    } catch (e) {
      console.warn('Analytics track error (silent):', e);
    }
  }

  private async flush() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const batch = [...this.queue];
    this.queue = []; // Очищаем очередь

    try {
      // Используем action='analytics' если скрипт это поддерживает, или просто отправляем массив
      // Так как структура скрипта изменилась, лучше обернуть в стандартный формат API
      const payload = JSON.stringify({
        action: 'analyticsBatch',
        events: batch
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: payload,
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);

    } catch (error) {
      console.warn('Analytics flush failed, returning to queue:', error);
      this.queue = [...batch, ...this.queue]; // Возвращаем в очередь
      // Обрезаем если слишком много
      if (this.queue.length > 100) {
          this.queue = this.queue.slice(-100);
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const analytics = new AnalyticsService();