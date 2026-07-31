const channels = ["lyd_rates", "usd_lyd", "Usd_lyd_usd"]; // example channels
async function run() {
  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  ];
  for (const channel of channels) {
    const res = await fetch(`https://t.me/s/${channel}`, {
      headers: { 'User-Agent': USER_AGENTS[0] }
    });
    console.log(`${channel} status: ${res.status}`);
    const html = await res.text();
    console.log(`HTML size: ${html.length}`);
    if (html.includes("tgme_widget_message_wrap")) {
        console.log("Found messages.");
    } else {
        console.log("No messages.");
        console.log(html.substring(0, 500));
    }
  }
}
run();
