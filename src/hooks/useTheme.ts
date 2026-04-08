import { useState, useEffect } from 'react';

export function useTheme() {
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    const saved = localStorage.getItem('hapticEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    const saved = localStorage.getItem('autoRefreshEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [showChart, setShowChart] = useState(() => {
    const saved = localStorage.getItem('showChart');
    return saved !== null ? saved === 'true' : true;
  });
  const [compactMode, setCompactMode] = useState(() => {
    const saved = localStorage.getItem('compactMode');
    return saved !== null ? saved === 'true' : false;
  });
  const [dataSaver, setDataSaver] = useState(() => {
    const saved = localStorage.getItem('dataSaver');
    return saved !== null ? saved === 'true' : false;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    const saved = localStorage.getItem('animationsEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (hapticEnabled && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  return {
    hapticEnabled, setHapticEnabled,
    autoRefreshEnabled, setAutoRefreshEnabled,
    showChart, setShowChart,
    compactMode, setCompactMode,
    dataSaver, setDataSaver,
    soundEnabled, setSoundEnabled,
    animationsEnabled, setAnimationsEnabled,
    triggerHaptic
  };
}
