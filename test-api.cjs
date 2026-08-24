fetch('http://localhost:3000/api/health', {headers: {'User-Agent': 'GreenBox'}}).then(res=>res.text()).then(console.log);
