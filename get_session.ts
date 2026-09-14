const res = await fetch("http://localhost:3000/api/temp-config");
const data = await res.json();
console.log(data.telegramSessionString);
