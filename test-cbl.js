async function fetchFromCBL() {
    try {
        const response = await fetch('https://cbl.gov.ly/currency-exchange-rates/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();
        const rows = html.split(/<tr[^>]*>/i);
        const results = {};
        for (const row of rows) {
            if (!row.includes("<td>") && !row.includes("<td ")) continue;
            
            // match all tds
            const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
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
                    const sellHtml = tds[4];
                    // extract the first float from the selling html
                    const match = sellHtml.match(/[\d.]+/);
                    if (match) {
                        results[currencyId] = parseFloat(match[0]);
                    }
                }
            }
        }
        console.log(results);
    } catch(err) {
        console.error(err);
    }
}
fetchFromCBL();
