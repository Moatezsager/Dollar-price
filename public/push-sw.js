// ============================================================
const APP_NAME = 'مؤشر الدينار';
const APP_URL  = 'https://dollar-price-qp14.onrender.com';
const ICON_URL = '/icons/icon-192.png';
const BADGE_URL = '/icons/badge-72.png';
// ----------------------------------------------------------------
// حدث استقبال الإشعار من السيرفر
// ----------------------------------------------------------------
self.addEventListener('push', function (event) {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: APP_NAME, body: event.data.text(), url: '/' };
  }
  const title = data.title || APP_NAME;
  const body  = data.body  || 'تحديث جديد للأسعار';
  const url   = data.url   || '/';
  const tag   = data.tag   || 'dinar-update-' + Date.now();
  const options = {
    body,
    icon:             data.icon  || ICON_URL,
    badge:            data.badge || BADGE_URL,
    tag,
    renotify:         true,           // يُصوِّت حتى لو نفس الـ tag
    requireInteraction: false,        // لا يبقى مفتوحاً على Android
    silent:           false,
    vibrate:          [200, 100, 200],
    timestamp:        Date.now(),
    dir:              'rtl',
    lang:             'ar',
    data: {
      url:     url.startsWith('http') ? url : APP_URL + url,
      tag,
      sentAt:  Date.now()
    },
    actions: [
