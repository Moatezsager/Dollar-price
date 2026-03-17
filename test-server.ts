import fetch from "node-fetch";

async function test() {
  // We need to login to get the token
  const loginRes = await fetch("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || "admin123" }) // Assuming default or empty
  });
  
  const loginData = await loginRes.json();
  console.log("Login:", loginData);
  
  if (loginData.token) {
    const statusRes = await fetch("http://localhost:3000/api/admin/ai-status", {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    const statusData = await statusRes.json();
    console.log("AI Status:", statusData);
    
    const extractRes = await fetch("http://localhost:3000/api/admin/ai-extract", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.token}`
      },
      body: JSON.stringify({ text: "الدولار اليوم 7.50 واليورو 8.20" })
    });
    const extractData = await extractRes.json();
    console.log("AI Extract:", extractData);
  }
}

test();
