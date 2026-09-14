async function checkLogs() {
  const res = await fetch("http://localhost:3000/api/temp-logs");
  const data = await res.json();
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
}
checkLogs();
