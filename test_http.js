async function test() {
  const channel = "libya_index_dollar";
  const url = `https://t.me/s/${channel}`;
  const res = await fetch(url);
  const text = await res.text();
  console.log("Length of HTML:", text.length);
  const msgs = text.split('tgme_widget_message_text').length - 1;
  console.log("Messages found:", msgs);
}
test();
