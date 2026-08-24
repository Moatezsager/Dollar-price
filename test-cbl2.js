async function fetchFromCBL() {
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
      
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (tds && tds.length >= 6) {
        const currencyHtml = tds[1];
        let currencyId = null;
        if (currencyHtml.includes("الدولار الأمريكي") || currencyHtml.includes("USD")) currencyId = "USD";
        if (currencyId) {
          console.log(tds);
          const sellHtml = tds[4];
          const match = sellHtml.match(/[\d.]+/);
          console.log("sellHtml: ", sellHtml);
          console.log("match: ", match);
        }
      }
    }
}
fetchFromCBL();
