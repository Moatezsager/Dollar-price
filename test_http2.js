async function test() {
  const channel = "libya_index_dollar";
  const url = `https://t.me/s/${channel}`;
  const res = await fetch(url);
  const text = await res.text();
  console.log(text.substring(0, 1000));
}
test();
