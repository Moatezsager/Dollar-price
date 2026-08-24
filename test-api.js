const fs = require('fs');
fetch('http://localhost:3000/api/health').then(res=>res.text()).then(console.log);
