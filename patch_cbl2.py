import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'    for \(const row of rows\) \{[\s\S]*?if \(results\.USD && results\.USD > 4\.0 && results\.USD < 8\.0\) \{')

new_block = """    for (const row of rows) {
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
        else if (currencyHtml.includes("الدولار الاسترالي") || currencyHtml.includes("الدولار الأسترالي") || currencyHtml.includes("AUD")) currencyId = "AUD";
        else if (currencyHtml.includes("الفرنك السويسري") || currencyHtml.includes("CHF")) currencyId = "CHF";
        else if (currencyHtml.includes("الكرونر السويدي") || currencyHtml.includes("الكرونة السويدية") || currencyHtml.includes("SEK")) currencyId = "SEK";
        else if (currencyHtml.includes("الكرونر النرويجي") || currencyHtml.includes("الكرونة النرويجية") || currencyHtml.includes("NOK")) currencyId = "NOK";
        else if (currencyHtml.includes("الكرونر الدنمركي") || currencyHtml.includes("الكرونة الدنماركية") || currencyHtml.includes("DKK")) currencyId = "DKK";
        else if (currencyHtml.includes("الين الياباني") || currencyHtml.includes("JPY")) currencyId = "JPY";

        if (currencyId) {
          // Index 4 is strictly the 'Selling' (بيع) column on the CBL website
          const sellHtml = tds[4];
          const match = sellHtml.match(/[\\d.]+/);
          if (match) {
            let val = parseFloat(match[0]);
            if (!isNaN(val) && val > 0 && val < 20) {
              if (currencyId === 'JPY') {
                val = parseFloat((val / 100).toFixed(4));
              }
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
