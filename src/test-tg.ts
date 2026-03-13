async function run() {
  const res = await fetch('https://t.me/s/djheih2026');
  const html = await res.text();
  const blocks = html.split('tgme_widget_message_wrap');
  for (let i = blocks.length - 5; i < blocks.length; i++) {
    if (!blocks[i]) continue;
    const textMatch = blocks[i].match(/<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/);
    if (textMatch) {
      console.log(textMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '));
    }
  }
}
run();
