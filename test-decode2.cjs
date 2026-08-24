const fs = require('fs');
fetch('http://localhost:3000/api/rates', { headers: { 'User-Agent': 'GreenBox' } })
  .then(res => res.text())
  .then(text => {
     fs.writeFileSync('rates_response.txt', text);
     
     const xorCipher = (str, key) => {
       let result = '';
       for (let i = 0; i < str.length; i++) {
         result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
       }
       return result;
     };

     const dataString = JSON.parse(text);
     const decoded = Buffer.from(dataString, 'base64').toString('utf8');
     const decrypted = xorCipher(decoded, 'gb_secret_key_2024');
     console.log(decrypted.substring(0, 500));
  });
