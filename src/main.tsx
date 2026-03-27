import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Admin from './Admin.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { logErrorToServer } from './utils/logger';

// Global error handlers
window.addEventListener('error', (event) => {
  logErrorToServer(event.error || event.message, 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
  logErrorToServer(event.reason, 'Unhandled Promise Rejection');
});

// Register service worker
try {
  registerSW({ 
    immediate: true,
    onRegisterError(error) {
      console.error('SW registration error', error);
      logErrorToServer(error, 'Service Worker Registration Error');
    }
  });
} catch (error) {
  console.error('SW registration call error', error);
  logErrorToServer(error, 'Service Worker Registration Call Error');
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
