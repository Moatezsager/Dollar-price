async function test() {
  const res = await fetch('http://localhost:3000/api/rates');
  const data = await res.json();
  console.log(JSON.stringify({
    parallel: data.data?.parallel?.USD,
    previous: data.data?.previousParallel?.USD,
    usdChecks: data.data?.parallel?.USD_CHECKS,
    prevUsdChecks: data.data?.previousParallel?.USD_CHECKS
  }, null, 2));
}
test();
