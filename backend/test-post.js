
async function test() {
  const res = await fetch('http://127.0.0.1:3010/api/v1/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'test', phone: '0911223344' })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
