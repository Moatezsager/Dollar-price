async function checkLogs() {
  const res = await fetch("http://localhost:3000/api/temp-logs");
  const data = await res.json();
  const tm = data.filter((d: any) => d.message && d.message.includes("TelegramManager"));
  console.log(JSON.stringify(tm, null, 2));
}
checkLogs();
