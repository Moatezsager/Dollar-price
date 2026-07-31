import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const initPush = async () => {
      // Wait for a few seconds before prompting
      await new Promise(resolve => setTimeout(resolve, 5000));

      const dismissed = localStorage.getItem('pushPromptDismissed');
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 30 * 24 * 60 * 60 * 1000) {
        return; // Don't prompt if dismissed recently
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return; // Push not supported
      }

      if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        // If already granted, update active status
        if (Notification.permission === 'granted') {
          updateActiveStatus();
        }
        return; 
      }

      // Check if iOS and not standalone
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;

      // On iOS, web push only works in PWA standalone mode
      if (isIosDevice && !isStandalone) {
        return; 
      }

      setShowPrompt(true);
    };

    initPush();
  }, []);

  const updateActiveStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }
    } catch(e) {}
  };

  const handleSubscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const response = await fetch('/api/push/public-key');
        const data = await response.json();
        
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey)
        });
        
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });
      }
    } catch (e) {
      console.error('Push subscription failed:', e);
    }
    
    setShowPrompt(false);
    localStorage.setItem('pushPromptDismissed', Date.now().toString());
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pushPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: 20, x: '-50%' }}
        className="fixed bottom-[100px] left-1/2 w-[calc(100%-2rem)] max-w-md z-[90]"
      >
        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-400/20">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <h3 className="text-white font-bold text-sm sm:text-base">تفعيل التنبيهات</h3>
                <p className="text-zinc-400 text-xs sm:text-sm">تابع تغييرات الأسعار لحظة بلحظة</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2" dir="ltr">
              <button 
                onClick={handleSubscribe}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
              >
                تفعيل
              </button>
              <button 
                onClick={handleDismiss}
                className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
