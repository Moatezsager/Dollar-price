const PAGE_ID = "1340772592445016";
const TOKEN = "EAAjIZCQ4kAq4BSQLwQH0JrZASN3S5Bp58WOyC8TOoJEpP2OUrmKyRJEZAcSWICK7KQmnOVEnxk4ziZBBNNgZCALn2YgyNEZBGpyrJSoPzeWGn6vgvva5dGfyXD94yZBKuU0qTpShjUyTOz5D0wiBGrLbaGJPD4Hd9ZAtbAQhxxbfiMNy2bOodpvPc22HYn4CZBQlGJt4nuPaF";

const url = `https://graph.facebook.com/v20.0/${PAGE_ID}/feed`;
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: "Test Facebook Broadcast", access_token: TOKEN })
}).then(r => r.json()).then(console.log).catch(console.error);
