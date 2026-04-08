import { useState, useEffect } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showPostInstall, setShowPostInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const iosPromptDismissed = localStorage.getItem('iosPromptDismissed');
    if (/iphone|ipad|ipod/.test(userAgent) && !iosPromptDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => setShowIOSPrompt(true), 5000);
    }

    const handleAppInstalled = () => {
      setShowPostInstall(true);
      setTimeout(() => setShowPostInstall(false), 15000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async (triggerHaptic: (p: number) => void) => {
    triggerHaptic(20);
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    } catch (err) {
      console.error("Install prompt failed:", err);
    }
  };

  return {
    showInstallBanner,
    isStandalone,
    isIOS,
    showIOSPrompt,
    showPostInstall,
    setShowPostInstall,
    setShowIOSPrompt,
    handleInstall
  };
}
