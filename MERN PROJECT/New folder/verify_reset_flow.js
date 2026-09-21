const path = require('path');
const dotenvPath = path.resolve(__dirname, 'server/node_modules/dotenv');
require(dotenvPath).config({ path: path.resolve(__dirname, '.env') });
const Imap = require('imap');

const BASE = 'http://localhost:5001';
const UNKNOWN_EMAIL = 'nope@notreal.invalid';
const KNOWN_EMAIL = 'demo@jobtrack.app';

async function fetchJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: response.status, data };
}

function readLatestResetToken() {
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

          const uids = results.slice(-20);
          const fetcher = imap.fetch(uids, { bodies: '', struct: true });

          fetcher.on('message', (msg) => {
            msg.on('body', (stream) => {
              let chunks = [];
              stream.on('data', (chunk) => chunks.push(chunk));
              stream.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                const match = body.match(/\/reset-password\/([^"'&\s]+)/i);
                if (match) found.push(match[1]);
              });
            });
          });

          fetcher.on('end', () => {
            imap.end();
            resolve(found[found.length - 1] || null);
          });

          fetcher.on('error', reject);
        });
      });
    });

    imap.once('error', reject);
    imap.connect();
  });
}

(async () => {
  const unknown = await fetchJson(`${BASE}/api/auth/forgot-password`, { email: UNKNOWN_EMAIL });
  const firstKnownRequest = await fetchJson(`${BASE}/api/auth/forgot-password`, { email: KNOWN_EMAIL });
  await new Promise((resolve) => setTimeout(resolve, 12000));

  const token = await readLatestResetToken();
  if (!token) {
    console.log(JSON.stringify({
      unknown,
      firstKnownRequest,
      tokenFound: false,
    }, null, 2));
    return;
  }

  const reset = await fetchJson(`${BASE}/api/auth/reset-password`, {
    token,
    newPassword: 'ResetPass123!',
    confirmPassword: 'ResetPass123!',
  });

  const oldLogin = await fetchJson(`${BASE}/api/auth/login`, {
    email: KNOWN_EMAIL,
    password: 'demo123',
  });

  const newLogin = await fetchJson(`${BASE}/api/auth/login`, {
    email: KNOWN_EMAIL,
    password: 'ResetPass123!',
  });

  const tokenReuse = await fetchJson(`${BASE}/api/auth/reset-password`, {
    token,
    newPassword: 'DifferentPass456!',
    confirmPassword: 'DifferentPass456!',
  });

  const invalidToken = await fetchJson(`${BASE}/api/auth/reset-password`, {
    token: `${token}x`,
    newPassword: 'BadTokenPass456!',
    confirmPassword: 'BadTokenPass456!',
  });

  const secondRequest = await fetchJson(`${BASE}/api/auth/forgot-password`, { email: KNOWN_EMAIL });
  await new Promise((resolve) => setTimeout(resolve, 12000));
  const nextToken = await readLatestResetToken();

  const restoreDemoPassword = nextToken
    ? await fetchJson(`${BASE}/api/auth/reset-password`, {
        token: nextToken,
        newPassword: 'demo123',
        confirmPassword: 'demo123',
      })
    : { status: 0, data: { message: 'no_token_found' } };

  console.log(JSON.stringify({
    unknown,
    firstKnownRequest,
    reset,
    oldLogin,
    newLogin,
    tokenReuse,
    invalidToken,
    secondRequest,
    restoreDemoPassword,
    tokenFound: true,
  }, null, 2));
})();
