import { TelegramManager, getTelegramManager } from '../../telegramClient';
import { appConfig, telegramManager, setTelegramManager } from '../config';

export let facebookBroadcastStatus = {
  status: 'ok',
  lastError: '',
  lastErrorTime: '',
  lastSuccessTime: ''
};

export let telegramBroadcastStatus = {
  status: 'ok',
  lastError: '',
  lastErrorTime: '',
  lastSuccessTime: ''
};

export let lastSocialBroadcastTime = 0;

export function getOrInitTelegramManager(): TelegramManager | null {
  if (telegramManager) return telegramManager;
  
  const apiId = Number(process.env.TELEGRAM_API_ID || appConfig.telegramApiId);
  const apiHash = process.env.TELEGRAM_API_HASH || appConfig.telegramApiHash || "";
  const sessionString = process.env.TELEGRAM_SESSION || process.env.TG_SESSION_V2 || appConfig.telegramSessionString || "";
  
  if (apiId && apiHash && sessionString) {
    try {
      const manager = getTelegramManager(apiId, apiHash, sessionString);
      setTelegramManager(manager);
      return manager;
    } catch (e: any) {
      console.error("[TelegramManager] Initialization error:", e.message || e);
    }
  }
  return null;
}

export async function broadcastToSocialMedia(message: string, isTest: boolean = false, target: 'all' | 'telegram' | 'facebook' = 'all') {
  const manager = getOrInitTelegramManager();

  // Helper for small pause between retries
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Telegram
  const shouldPostTg = (target === 'telegram' || target === 'all') && ((!isTest && appConfig.telegramAutoPost) || isTest);
  if (shouldPostTg) {
    let tgChannel = (appConfig.telegramPostChannel || "").trim();
    if (tgChannel.includes('t.me/')) {
      tgChannel = tgChannel.split('t.me/')[1].split('/')[0].split('?')[0];
    }
    tgChannel = tgChannel.replace('@', '').trim();

    if (!tgChannel) {
      console.warn("[Telegram Broadcast] Skipping: No channel configured (telegramPostChannel is empty)");
      telegramBroadcastStatus = {
        status: 'error',
        lastError: 'لم يتم تحديد القناة',
        lastErrorTime: new Date().toISOString(),
        lastSuccessTime: telegramBroadcastStatus.lastSuccessTime
      };
      if (isTest && target === 'telegram') throw new Error("لا توجد قناة تيليجرام محددة للنشر.");
    } else if (!manager) {
      console.error("[Telegram Broadcast] Failed: Telegram credentials not initialized or missing");
      telegramBroadcastStatus = {
        status: 'error',
        lastError: 'بيانات أو جلسة تيليجرام غير مفعلة',
        lastErrorTime: new Date().toISOString(),
        lastSuccessTime: telegramBroadcastStatus.lastSuccessTime
      };
      if (isTest && target === 'telegram') throw new Error("بيانات تيليجرام غير مكتملة أو الجلسة غير مفعلة.");
    } else {
      let success = false;
      let lastErrMessage = "";
      const maxRetries = isTest ? 1 : 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          success = await manager.sendMessage(tgChannel, message);
          if (success) {
            break;
          } else {
            lastErrMessage = (manager as any).lastError || "فشل غير معروف";
            if (attempt < maxRetries) {
              console.warn(`[Telegram Broadcast] Attempt ${attempt} failed: ${lastErrMessage}. Retrying in 2s...`);
              await delay(2000);
            }
          }
        } catch (e: any) {
          lastErrMessage = e.message || String(e);
          if (attempt < maxRetries) {
            console.warn(`[Telegram Broadcast] Exception in attempt ${attempt}: ${lastErrMessage}. Retrying in 2s...`);
            await delay(2000);
          }
        }
      }

      if (!success) {
        telegramBroadcastStatus = {
          status: 'error',
          lastError: lastErrMessage || "فشل إرسال الرسالة",
          lastErrorTime: new Date().toISOString(),
          lastSuccessTime: telegramBroadcastStatus.lastSuccessTime
        };
        console.error(`[Telegram Broadcast] Failed to send message to ${tgChannel}: ${lastErrMessage}`);
        if (isTest && target === 'telegram') {
          if (lastErrMessage.includes('CHAT_WRITE_FORBIDDEN') || lastErrMessage.includes('CHAT_ADMIN_REQUIRED')) {
            throw new Error(`حساب تيليجرام المربوط ليس مشرفاً في القناة @${tgChannel} أو لا يملك صلاحية نشر الرسائل.`);
          }
          throw new Error(`فشل إرسال الرسالة إلى القناة @${tgChannel}: ${lastErrMessage}`);
        }
      } else {
        telegramBroadcastStatus = {
          status: 'ok',
          lastError: '',
          lastErrorTime: telegramBroadcastStatus.lastErrorTime,
          lastSuccessTime: new Date().toISOString()
        };
        lastSocialBroadcastTime = Date.now();
        console.log(`[Telegram Broadcast] Successfully sent message to ${tgChannel}`);
      }
    }
  }

  // Facebook
  const shouldPostFb = (target === 'facebook' || target === 'all') && ((!isTest && appConfig.facebookAutoPost) || isTest);
  if (shouldPostFb) {
    if (!appConfig.facebookPageId || !appConfig.facebookAccessToken) {
      console.warn("[Facebook Broadcast] Skipping Facebook post: Page ID or Access Token missing");
      facebookBroadcastStatus = {
        status: 'error',
        lastError: 'معرف الصفحة أو رمز الوصول مفقود',
        lastErrorTime: new Date().toISOString(),
        lastSuccessTime: facebookBroadcastStatus.lastSuccessTime
      };
      if (isTest && target === 'facebook') throw new Error("بيانات فيسبوك غير مكتملة. يرجى إدخال معرف الصفحة ورمز وصول الصفحة أولاً.");
    } else {
      let fbMessage = message.replace(/[*_`]/g, '');
      const maxRetries = isTest ? 1 : 2;
      let postedSuccessfully = false;
      let lastFbError = "";

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const targetId = appConfig.facebookPageId.trim() || 'me';
          let url = `https://graph.facebook.com/v20.0/${targetId}/feed`;
          
          let linkToAttach = null;
          const urlMatch = fbMessage.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            linkToAttach = urlMatch[0];
          }
          
          const payload: any = { message: fbMessage, access_token: appConfig.facebookAccessToken };
          if (linkToAttach) {
            payload.link = linkToAttach;
          }

          let fbRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          let fbData = await fbRes.json();

          // Fallback 1: If link parameter error, retry cleanly without link
          if (fbData.error && payload.link) {
            console.log("[Facebook Broadcast] Retrying without link parameter...");
            delete payload.link;
            const retryRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const retryData = await retryRes.json();
            if (!retryData.error) {
              fbData = retryData;
            }
          }

          // Fallback 2: If global ID error or invalid ID, attempt posting to /me/feed directly
          if (fbData.error && (fbData.error.code === 100 || fbData.error.message?.includes('global id'))) {
            console.log("[Facebook Broadcast] Trying fallback to /me/feed...");
            const fallbackUrl = `https://graph.facebook.com/v20.0/me/feed`;
            const fallbackRes = await fetch(fallbackUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: fbMessage, access_token: appConfig.facebookAccessToken })
            });
            const fallbackData = await fallbackRes.json();
            if (!fallbackData.error) {
              fbData = fallbackData;
            }
          }

          if (fbData.error) {
            lastFbError = fbData.error.message || "خطأ غير معروف في واجهة فيسبوك";
            if (attempt < maxRetries) {
              console.warn(`[Facebook Broadcast] Attempt ${attempt} failed: ${lastFbError}. Retrying in 2s...`);
              await delay(2000);
              continue;
            }
            facebookBroadcastStatus = { status: 'error', lastError: lastFbError, lastErrorTime: new Date().toISOString(), lastSuccessTime: facebookBroadcastStatus.lastSuccessTime };
            console.error("[Facebook Broadcast] Error:", lastFbError);
            if (isTest && target === 'facebook') {
              if (lastFbError.includes('global id') || fbData.error.code === 100) {
                throw new Error("المعرف المدخل هو معرف حساب شخصي وليس معرف صفحة عامة (Page). يجب استخدام معرف صفحة فيسبوك ورمز وصول الصفحة (Page Token).");
              }
              throw new Error(lastFbError);
            }
          } else {
            postedSuccessfully = true;
            console.log("[Facebook Broadcast] Successfully posted, ID:", fbData.id);
            facebookBroadcastStatus = { status: 'ok', lastError: '', lastErrorTime: facebookBroadcastStatus.lastErrorTime, lastSuccessTime: new Date().toISOString() };
            lastSocialBroadcastTime = Date.now();
            
            // Add comment safely without breaking the main post status
            try {
              const commentMessage = `📢 تابعنا على تيليجرام لتصلك التحديثات فوراً:\n👉 https://t.me/libya_index_dollar\n\n🌐 للمزيد من التفاصيل والرسوم البيانية، تفضل بزيارة موقعنا:\n👉 https://dollar-price-qp14.onrender.com/?v=${Math.floor(Date.now() / 60000)}`;
              const commentUrl = `https://graph.facebook.com/v20.0/${fbData.id}/comments`;
              const commentRes = await fetch(commentUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: commentMessage, access_token: appConfig.facebookAccessToken })
              });
              const commentData = await commentRes.json();
              if (commentData.error) {
                console.warn("[Facebook Broadcast] Note: Comment skipped or failed (non-fatal):", commentData.error.message);
              } else {
                console.log("[Facebook Broadcast] Successfully added comment, ID:", commentData.id);
              }
            } catch (commentErr: any) {
              console.warn("[Facebook Broadcast] Non-fatal comment error:", commentErr.message);
            }
            break; // Done successfully
          }
        } catch(e: any) {
          lastFbError = e.message || String(e);
          if (attempt < maxRetries) {
            console.warn(`[Facebook Broadcast] Exception on attempt ${attempt}: ${lastFbError}. Retrying in 2s...`);
            await delay(2000);
            continue;
          }
          facebookBroadcastStatus = { status: 'error', lastError: lastFbError, lastErrorTime: new Date().toISOString(), lastSuccessTime: facebookBroadcastStatus.lastSuccessTime };
          console.error("[Facebook Broadcast] Failed:", e);
          if (isTest && target === 'facebook') throw e;
        }
      }
    }
  }
}

import { db, supabase, supabaseAnonKey } from '../db';
import { sendPushNotificationToAll } from './push.service';

export let lastOfficialBroadcastDate = "";
export let lastBroadcastState: Record<string, { price: number, time: number }> = {};

// Smart Queue (Debounce Buffer) to aggregate rapid price updates safely
export let broadcastQueue: Map<string, { id?: string, name: string, oldVal: number, newVal: number, flag: string }> = new Map();
export let broadcastQueueTimer: NodeJS.Timeout | null = null;

export async function broadcastOfficialRates(rates: any, isTest: boolean = false) {
  if (!appConfig.telegramPostChannel || !telegramManager) {
    console.log("[Telegram Broadcast] Aborting broadcast. channel or manager missing.");
    return;
  }

  if (!isTest && !appConfig.telegramAutoPost) {
    console.log("[Telegram Broadcast] Aborting official broadcast because telegramAutoPost is disabled.");
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  const timeStr = now.toLocaleTimeString('ar-LY', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit' });
  
  if (!isTest && lastOfficialBroadcastDate === dateStr) {
    console.log("[Official Broadcast] Already broadcasted today. Skipping duplicate post.");
    return;
  }

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  let dayName = "الخميس";
  try {
    const dayIndex = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Tripoli' })).getDay();
    dayName = dayNames[dayIndex];
  } catch (e) {}

  let message = `🏦 *نشرة أسعار مصرف ليبيا المركزي* 🏦\n`;
  message += `━━━━━━━━━━━━━━━━━━━\n`;
  message += `🗓 ${dayName}، ${dateStr} | ⏰ ${timeStr}\n\n`;

  for (const t of appConfig.terms) {
    if (rates.official[t.id]) {
      const val = rates.official[t.id];
      const flag = t.flag === 'us' ? '🇺🇸' : t.flag === 'eu' ? '🇪🇺' : t.flag === 'gb' ? '🇬🇧' : t.flag === 'tn' ? '🇹🇳' : t.flag === 'eg' ? '🇪🇬' : t.flag === 'tr' ? '🇹🇷' : '💰';
      message += `${flag} *${t.name}*: ${val.toFixed(4)} د.ل\n`;
    }
  }

  message += `\n━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 *لمزيد من التفاصيل والبيانات الحية:*\n🌐 https://dollar-price-qp14.onrender.com/?v=${Math.floor(Date.now() / 60000)}\n`;
  message += `📱 *المصدر:* مصرف ليبيا المركزي`;

  try {
    // Send only to Telegram, disable Facebook for official rates to prevent spamming
    await broadcastToSocialMedia(message, typeof isTest !== "undefined" ? isTest : false, 'telegram');
    if (!isTest) {
      lastOfficialBroadcastDate = dateStr;
    }
  } catch(e) {
    console.error("[Official Broadcast] Failed to broadcast", e);
  }
}

export async function broadcastRateChanges(updates: {id?: string, name: string, oldVal: number, newVal: number, flag: string}[], isTest: boolean = false, target: 'all' | 'telegram' | 'facebook' = 'all') {
  if (!isTest && !appConfig.telegramAutoPost && !appConfig.facebookAutoPost) {
    return;
  }
  if (updates.length === 0) {
    return;
  }

  // If live broadcast, use Smart Debounce Buffer (20s) to aggregate rapid updates and prevent spam/flooding
  if (!isTest) {
    for (const u of updates) {
      const key = u.id || u.name;
      const existing = broadcastQueue.get(key);
      if (existing) {
        // Keep initial oldVal to track cumulative shift
        broadcastQueue.set(key, { ...u, oldVal: existing.oldVal });
      } else {
        broadcastQueue.set(key, { ...u });
      }
    }

    if (broadcastQueueTimer) {
      clearTimeout(broadcastQueueTimer);
    }

    broadcastQueueTimer = setTimeout(() => {
      broadcastQueueTimer = null;
      const batchedUpdates = Array.from(broadcastQueue.values());
      broadcastQueue.clear();
      if (batchedUpdates.length > 0) {
        executeBroadcast(batchedUpdates, false, target).catch(e => console.error("[Smart Queue] Broadcast error:", e));
      }
    }, 20000); // 20-second aggregation buffer

    return;
  }

  // If manual test broadcast, execute immediately
  await executeBroadcast(updates, isTest, target);
}

export async function executeBroadcast(updates: {id?: string, name: string, oldVal: number, newVal: number, flag: string}[], isTest: boolean = false, target: 'all' | 'telegram' | 'facebook' = 'all') {
  if (updates.length === 0) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-LY', { timeZone: 'Africa/Tripoli' });
  const timeStr = now.toLocaleTimeString('ar-LY', { timeZone: 'Africa/Tripoli', hour: '2-digit', minute: '2-digit' });
  
  if (!isTest) {
    const nowMs = Date.now();
    for (const u of updates) {
      if (u.id) {
        lastBroadcastState[u.id] = { price: u.newVal, time: nowMs };
        
        // Save to SQLite
        try {
          db.prepare(`
            INSERT INTO broadcast_state (term_id, last_price, last_broadcast_time) 
            VALUES (?, ?, ?)
            ON CONFLICT(term_id) DO UPDATE SET 
              last_price = excluded.last_price,
              last_broadcast_time = excluded.last_broadcast_time
          `).run(u.id, u.newVal, nowMs);
        } catch (err) {
          console.error("[BroadcastState] Local DB save error:", err);
        }

        // Sync to Supabase in background
        if (supabase && supabaseAnonKey && !supabaseAnonKey.includes('dummy')) {
          supabase.from('broadcast_state').upsert({
            term_id: u.id,
            last_price: u.newVal,
            last_broadcast_time: nowMs
          }).then(({ error }) => {
            if (error) console.error("[BroadcastState] Supabase sync error:", error);
          }, err => {
            console.error("[BroadcastState] Supabase sync error:", err);
          });
        }
      }
    }
  }
  // ------------------------------------------------

  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  let dayName = "الخميس";
  try {
    const dayIndex = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Tripoli' })).getDay();
    dayName = dayNames[dayIndex];
  } catch (e) {}

  const flagMap: Record<string, string> = {
    'us': '🇺🇸', 'eu': '🇪🇺', 'gb': '🇬🇧', 'tn': '🇹🇳', 'eg': '🇪🇬', 
    'tr': '🇹🇷', 'ly': '🇱🇾', 'jo': '🇯🇴', 'bh': '🇧🇭', 'kw': '🇰🇼',
    'ae': '🇦🇪', 'sa': '🇸🇦', 'qa': '🇶🇦', 'cn': '🇨🇳',
    'gold': '✨', 'silver': '🪙'
  };

  let message = `📊 *مؤشر الدينار | تحديث السوق الموازي*\n`;
  message += `━━━━━━━━━━━━━━━━━━━\n`;
  message += `📅 ${dayName}، ${dateStr} | ⏰ ${timeStr}\n\n`;

  for (const u of updates) {
    const isUp = u.newVal > u.oldVal;
    const isDown = u.newVal < u.oldVal;
    const diff = Math.abs(u.newVal - u.oldVal);
    let fe = flagMap[u.flag] || '💰';
    if (u.id.startsWith('GOLD')) fe = '✨';
    if (u.id.startsWith('SILVER')) fe = '🪙';
    
    let changeText = '➖ استقرار';
    if (isUp) changeText = `🔺 ارتفاع بمقدار ${diff.toFixed(3)}`;
    if (isDown) changeText = `🔻 انخفاض بمقدار ${diff.toFixed(3)}`;

    message += `${fe} *${u.name}*\n`;
    message += `💵 السعر: *${u.newVal.toFixed(3)} د.ل*\n`;
    if (isUp || isDown) {
      message += `📊 التغير: ${changeText} (كان ${u.oldVal.toFixed(3)})\n\n`;
    } else {
      message += `📊 التغير: ${changeText}\n\n`;
    }
  }

  message += `━━━━━━━━━━━━━━━━━━━\n`;
  message += `🔗 *المتابعة الحية والرسوم البيانية:*\n`;
  message += `🌐 https://dollar-price-qp14.onrender.com/?v=${Math.floor(Date.now() / 60000)}\n`;
  message += `📱 *المصدر:* شبكة مؤشر الدينار`;

  if (isTest) {
    await broadcastToSocialMedia(message, isTest, target);
  } else {
    broadcastToSocialMedia(message, isTest, target).catch(e => console.error("[Background Broadcast] Error:", e));
  }

  // SEND PUSH NOTIFICATION
  if (!isTest) {
    const mainUpdates = updates.filter(u => u.id === 'USD' || u.id === 'EUR' || u.id === 'GOLD' || u.id === 'GOLD_CAST_21').slice(0, 2);
    if (mainUpdates.length > 0) {
      const pushTitle = 'تحديث جديد لأسعار السوق';
      const pushBody = mainUpdates.map(u => `${u.name}: ${u.newVal.toFixed(3)}`).join(' | ');
      sendPushNotificationToAll(pushTitle, pushBody);
    } else {
      sendPushNotificationToAll('تحديث جديد', 'تم تحديث أسعار السوق الموازي');
    }
  }
}

