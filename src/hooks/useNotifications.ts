import { useState, useRef, useEffect } from 'react';
import { logErrorToServer } from '../utils/logger';

export function useNotifications(soundEnabled: boolean) {
  const [toasts, setToasts] = useState<{ id: string, title: string, body: string, type: 'up' | 'down' | 'info' }[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const addToast = (title: string, body: string, type: 'up' | 'down' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const playNotificationSound = (type: 'up' | 'down') => {
    if (!soundEnabledRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'up') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.15);
      }
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  };

  const requestPermission = async () => {
    try {
      if (!("Notification" in window)) {
        addToast("غير مدعوم", "متصفحك لا يدعم الإشعارات", "info");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        addToast("تم تفعيل التنبيهات", "ستصلك إشعارات عند تغير الأسعار الهامة", "info");
      } else {
        addToast("تم رفض التنبيهات", "يرجى تفعيل الإشعارات من إعدادات المتصفح", "info");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      logErrorToServer(error, "useNotifications: requestPermission");
      addToast("خطأ", "تعذر تفعيل الإشعارات", "info");
    }
  };

  const showPriceNotification = async (code: string, name: string, oldPrice: number, newPrice: number, threshold: number) => {
    const diff = newPrice - oldPrice;
    const absDiff = Math.abs(diff);
    
    if (absDiff < threshold) return;

    try {
      const lastNotifyData = localStorage.getItem(`last_notify_${code}`);
      if (lastNotifyData) {
        const { price, time } = JSON.parse(lastNotifyData);
        const timeDiff = Date.now() - time;
        if (price === newPrice && timeDiff < 10 * 60 * 1000) return;
      }
    } catch (e) {}

    const direction = diff > 0 ? 'ارتفاع' : 'انخفاض';
    const arrow = diff > 0 ? '📈' : '📉';
    const title = `${arrow} ${direction} في سعر ${name}`;
    const body = `السعر الجديد: ${newPrice.toFixed(2)} د.ل (تغير بمقدار ${diff > 0 ? '+' : ''}${diff.toFixed(2)})`;

    localStorage.setItem(`last_notify_${code}`, JSON.stringify({ price: newPrice, time: Date.now() }));

    addToast(title, body, diff > 0 ? 'up' : 'down');
    playNotificationSound(diff > 0 ? 'up' : 'down');

    try {
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: 'https://flagcdn.com/w80/ly.png',
            badge: 'https://flagcdn.com/w80/ly.png',
            vibrate: [200, 100, 200],
            tag: `price-change-${code}`,
            renotify: true,
            data: { url: window.location.origin },
            dir: 'rtl'
          } as any);
        }
      }
    } catch (err) {
      logErrorToServer(err, "useNotifications: showPriceNotification");
    }
  };

  return {
    toasts, setToasts, addToast,
    notificationsEnabled, setNotificationsEnabled,
    requestPermission, showPriceNotification, playNotificationSound
  };
}
