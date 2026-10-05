const email = 'aniruth945+jobtrackb8@gmail.com';
const code = '329760';

fetch('http://localhost:5001/api/auth/verify-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code })
}).then(async (r) => {
  const text = await r.text();
  console.log('STATUS', r.status);
  console.log(text);
}).catch((err) => {
  console.error('ERROR', err.message);
  process.exit(1);
});
