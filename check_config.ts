import { readFileSync } from 'fs';
const res = await fetch("http://localhost:3000/api/temp-config");
const data = await res.json();
console.log(data.telegramSessionString ? "Has session string" : "No session string");
console.log("Channels:", data.channels);
