const fetch = require('node-fetch'); // wait no, just native fetch
async function fetchFromCBL() {
    try {
        const response = await fetch('https://cbl.gov.ly/currency-exchange-rates/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = await response.text();

        const currencies = [
            { id: "USD", names: ["الدولار الأمريكي", "USD"] },
            { id: "EUR", names: ["اليورو", "EUR", "EURO"] },
            { id: "GBP", names: ["الجنيه الإسترليني", "GBP", "STIRLING", "الجنيه الاسترليني"] },
            { id: "TND", names: ["الدينار التونسي", "TND"] },
            { id: "TRY", names: ["الليرة التركية", "TRY"] },
            { id: "SAR", names: ["الريال السعودي", "SAR"] },
            { id: "AED", names: ["الدرهم الإماراتي", "AED", "الدرهم الاماراتي"] },
            { id: "CNY", names: ["الايوان الصيني", "اليوان الصيني", "CNY"] },
            { id: "CAD", names: ["الدولار الكندي", "CAD"] },
        ];
        const results = {};

        const rows = html.split(/<tr[^>]*>/i);

        for (const currency of currencies) {
            for (const name of currency.names) {
                const targetRow = rows.find(row => row.includes(name));
                if (targetRow) {
                    const rateMatch = targetRow.match(/بيع:\s*<\/span>\s*([\d.]+)/i) ||
                                      targetRow.match(/بيع\s*([\d.]+)/i) ||
                                      targetRow.match(/([\d.]+)\s*بيع/i);
                    
                    if (rateMatch && rateMatch[1]) {
                        results[currency.id] = parseFloat(rateMatch[1]);
                        break;
                    }
                }
            }
        }
        console.log(results);
    } catch (err) {
        console.error(err);
    }
}
fetchFromCBL();
