const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

serverFile = serverFile.replace(
  `error_rate_percentage: apiStats.public.totalRequests > 0 ? ((apiStats.bannedIPsCount / apiStats.public.totalRequests) * 100).toFixed(2) : "0.00"`,
  `error_rate_percentage: apiStats.public.totalRequests > 0 ? (((apiStats.public.failedRequests + apiStats.premium.failedRequests) / (apiStats.public.totalRequests + apiStats.premium.totalRequests)) * 100).toFixed(2) : "0.00"`
);

fs.writeFileSync('server.ts', serverFile);
