const path = require('path');
const dotenvPath = path.resolve(__dirname, 'server/node_modules/dotenv');
require(dotenvPath).config({ path: path.resolve(__dirname, '.env') });
const Imap = require('imap');

const emailToRegister = 'aniruth945+jobtrackb8@gmail.com';

async function registerB() {
  const response = await fetch('http://localhost:5001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Account B', email: emailToRegister, password: 'StrongPassword123' })
  });
  const text = await response.text();
  console.log('REGISTER_STATUS', response.status);
  console.log(text);
}

function readOtpFromGmail() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
    });

    const found = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) return reject(err);
        imap.search(['ALL'], (searchErr, results) => {
          if (searchErr) return reject(searchErr);
          if (!results || results.length === 0) {
            imap.end();
            return resolve(null);
          }
          const uids = results.slice(-10);
          const fetcher = imap.fetch(uids, { bodies: '', struct: true });
          fetcher.on('message', (msg, seqno) => {
            msg.on('body', (stream) => {
              let chunks = [];
              stream.on('data', (chunk) => chunks.push(chunk));
              stream.on('end', () => {
                const buffer = Buffer.concat(chunks).toString('utf8');
                const match = buffer.match(/\b(\d{6})\b/);
                if (match) found.push(match[1]);
              });
            });
          });
          fetcher.on('end', () => {
            imap.end();
            resolve(found[found.length - 1] || null);
          });
          fetcher.on('error', (fetchErr) => reject(fetchErr));
        });
      });
    });

    imap.once('error', reject);
    imap.once('end', () => {});
    imap.connect();
  });
}

(async () => {
  await registerB();
  await new Promise((r) => setTimeout(r, 20000));
  const otp = await readOtpFromGmail();
  console.log('OTP_FROM_GMAIL', otp || 'NO_OTP_FOUND');
})();
