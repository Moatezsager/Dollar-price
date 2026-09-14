async function checkLogs() {
  const res = await fetch("http://localhost:3000/api/temp-logs");
  const data = await res.json();
  const dup = data.filter((d: any) => d.message && d.message.includes("AUTH_KEY_DUPLICATED"));
  console.log(JSON.stringify(dup, null, 2));
}
checkLogs();
