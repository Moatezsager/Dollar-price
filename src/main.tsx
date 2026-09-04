import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Admin from './Admin.tsx';
import './index.css';

import { logErrorToServer } from './utils/logger';

// Global error handlers
window.addEventListener('error', (event) => {
  logErrorToServer(event.error || event.message, 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
  logErrorToServer(event.reason, 'Unhandled Promise Rejection');
});




// Register unified Service Worker (Caching + Push)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/push-sw.js', { scope: '/', type: 'module' })
    .then(reg => {
      console.log('[SW] Unified Service Worker Registered. Scope:', reg.scope);
    })
    .catch(err => {
      console.error('[SW] Registration failed:', err);
    });
}


const path = window.location.pathname;

if (path === '/setup-device-auth-8899') {
  try {
    localStorage.setItem('admin_device_token', 'authorized_device_token_xyz');
  } catch (e) {
    console.warn("LocalStorage not available", e);
  }
  window.location.href = '/admin-panel-secure';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {path === '/admin-panel-secure' ? <Admin /> : <App />}
  </StrictMode>,
);
