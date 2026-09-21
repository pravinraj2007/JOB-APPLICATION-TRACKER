fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'aniruth945+jobtrackb8@gmail.com', password: 'StrongPassword123' })
}).then(async (r) => {
  const text = await r.text();
  console.log('STATUS', r.status);
  console.log(text);
}).catch((err) => {
  console.error('ERROR', err.message);
  process.exit(1);
});
