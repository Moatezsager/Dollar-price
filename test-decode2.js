const fs = require('fs');
fetch('http://localhost:3000/api/rates', { headers: { 'User-Agent': 'GreenBox' } })
  .then(res => res.text())
  .then(text => {
     fs.writeFileSync('rates_response.txt', text);
     console.log('Saved');
  });
