const fs = require('fs');
let content = fs.readFileSync('public/push-sw.js', 'utf8');
if (content.endsWith('actions: [')) {
  content += `
      { action: 'open', title: 'فتح التطبيق' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      let matchingClient = null;
      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes(APP_URL) || windowClient.url.includes(self.location.origin)) {
          matchingClient = windowClient;
          break;
        }
      }
      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
`;
  fs.writeFileSync('public/push-sw.js', content, 'utf8');
  console.log("Fixed truncated push-sw.js");
} else {
  console.log("File did not end with actions: [");
  // maybe there's a trailing newline or spaces
  if (content.trim().endsWith('actions: [')) {
    content = content.trim() + `
      { action: 'open', title: 'فتح التطبيق' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      let matchingClient = null;
      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes(APP_URL) || windowClient.url.includes(self.location.origin)) {
          matchingClient = windowClient;
          break;
        }
      }
      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
`;
    fs.writeFileSync('public/push-sw.js', content, 'utf8');
    console.log("Fixed truncated push-sw.js (trimmed)");
  }
}
