async function test() {
  const channel = "libya_rates";
  const url = `https://t.me/s/${channel}`;
  const res = await fetch(url);
  const text = await res.text();
  const msgs = text.split('tgme_widget_message_text').length - 1;
  console.log("libya_rates messages:", msgs);
}
test();
