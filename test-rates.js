const xorCipher = (str, key) => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
};

fetch('http://localhost:3000/api/rates', { headers: { 'User-Agent': 'GreenBox' } })
  .then(res => res.json())
  .then(dataString => {
      // In JS, atob on utf8 might fail, let's use Buffer
      const decoded = Buffer.from(dataString, 'base64').toString('utf-8');
      const decrypted = xorCipher(decoded, 'gb_secret_key_2024');
      const obj = JSON.parse(decrypted);
      console.log(JSON.stringify(obj._o, null, 2));
  })
  .catch(console.error);
