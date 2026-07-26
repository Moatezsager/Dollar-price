const channels = ["dollarr_ly", "musheermarket"];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

async function run() {
  for (const channel of channels) {
    const randomUA = USER_AGENTS[0];
    const response = await fetch(`https://t.me/s/${channel}`, { 
      headers: {
        'User-Agent': randomUA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    console.log(channel, response.status);
    const html = await response.text();
    console.log(html.length);
    console.log(html.includes("tgme_widget_message_wrap"));
  }
}
run();
