async function fetchFromCBL() {
    const response = await fetch('https://cbl.gov.ly/currency-exchange-rates/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    const html = await response.text();
    const rows = html.split(/<tr[^>]*>/i);
    for (const row of rows) {
      if (!row.includes("<td>") && !row.includes("<td ")) continue;
      
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (tds && tds.length >= 6) {
        console.log(tds[1].replace(/<[^>]*>/g, '').trim());
      }
    }
}
fetchFromCBL();
