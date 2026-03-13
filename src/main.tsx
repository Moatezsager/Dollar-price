import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Admin from './Admin.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

const path = window.location.pathname;

if (path === '/setup-device-auth-8899') {
  localStorage.setItem('admin_device_token', 'authorized_device_token_xyz');
  window.location.href = '/admin';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {path === '/admin' ? <Admin /> : <App />}
  </StrictMode>,
);
