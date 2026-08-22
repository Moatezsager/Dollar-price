const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const brokenCode = `          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }async function sendPushNotificationToAll`;

const fixedCode = `          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error('[Push] Retention error:', err);
  }
}

async function sendPushNotificationToAll`;

code = code.replace(brokenCode, fixedCode);
fs.writeFileSync('server.ts', code);
console.log('Fixed');
