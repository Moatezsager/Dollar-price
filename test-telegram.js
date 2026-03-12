import fs from 'fs';

async function test() {
  const TELEGRAM_CHANNELS = ["dollarr_ly", "musheermarket", "lydollar"];
  for (const channel of TELEGRAM_CHANNELS) {
    console.log(`\n--- Fetching ${channel} ---`);
    const response = await fetch(`https://t.me/s/${channel}`);
    const html = await response.text();
    
    // Let's print some of the text content to see what it looks like
    // We'll look for the class "tgme_widget_message_text"
    const messages = html.match(/<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/g);
    if (messages) {
      console.log(`Found ${messages.length} messages. Last 3:`);
      messages.slice(-3).forEach(m => {
        // clean up html tags
        const clean = m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(clean);
      });
    } else {
      console.log("No messages found.");
    }
  }
}

test();
