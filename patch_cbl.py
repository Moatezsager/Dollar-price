import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'    // Split by rows to ensure we only match numbers within the correct row[\s\S]*?if \(results\.USD && results\.USD > 4\.0 && results\.USD < 8\.0\) \{')

new_block = """    // Split by rows to ensure we only match numbers within the correct row
    const rows = html.split(/<tr[^>]*>/i);
    
    for (const row of rows) {
      if (!row.includes("<td>") && !row.includes("<td ")) continue;
      
      const tds = row.match(/<td[^>]*>([\\s\\S]*?)<\\/td>/gi);
      if (tds && tds.length >= 6) {
        const currencyHtml = tds[1];
        let currencyId = null;
        
        if (currencyHtml.includes("الدولار الأمريكي") || currencyHtml.includes("USD")) currencyId = "USD";
        else if (currencyHtml.includes("اليورو") || currencyHtml.includes("EUR")) currencyId = "EUR";
        else if (currencyHtml.includes("الجنيه الاسترليني") || currencyHtml.includes("الجنيه الإسترليني") || currencyHtml.includes("GBP")) currencyId = "GBP";
        else if (currencyHtml.includes("الدينار التونسي") || currencyHtml.includes("TND")) currencyId = "TND";
        else if (currencyHtml.includes("الليرة التركية") || currencyHtml.includes("TRY")) currencyId = "TRY";
        else if (currencyHtml.includes("الريال السعودي") || currencyHtml.includes("SAR")) currencyId = "SAR";
        else if (currencyHtml.includes("الدرهم الإماراتي") || currencyHtml.includes("الدرهم الاماراتي") || currencyHtml.includes("AED")) currencyId = "AED";
        else if (currencyHtml.includes("اليوان الصيني") || currencyHtml.includes("الايوان الصيني") || currencyHtml.includes("CNY")) currencyId = "CNY";
        else if (currencyHtml.includes("الدولار الكندي") || currencyHtml.includes("CAD")) currencyId = "CAD";

        if (currencyId) {
          // Index 4 is strictly the 'Selling' (بيع) column on the CBL website
          const sellHtml = tds[4];
          const match = sellHtml.match(/[\\d.]+/);
          if (match) {
            const val = parseFloat(match[0]);
            if (!isNaN(val) && val > 0 && val < 10) {
              results[currencyId] = val;
            }
          }
        }
      }
    }

    if (results.USD && results.USD > 4.0 && results.USD < 8.0) {"""

if pattern.search(content):
    content = pattern.sub(lambda m: new_block, content)
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully patched server.ts")
else:
    print("Pattern not found!")
