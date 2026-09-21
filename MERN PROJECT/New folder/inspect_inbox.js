const path = require('path');
const dotenvPath = path.resolve(__dirname, 'server/node_modules/dotenv');
require(dotenvPath).config({ path: path.resolve(__dirname, '.env') });
const Imap = require('imap');

const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  authTimeout: 30000,
});

imap.once('ready', () => {
  imap.openBox('INBOX', false, (err) => {
    if (err) throw err;
    imap.search(['ALL'], (searchErr, results) => {
      if (searchErr) throw searchErr;
      const uids = (results || []).slice(-12);
      const fetcher = imap.fetch(uids, { bodies: '', struct: true });

      fetcher.on('message', (msg) => {
        msg.on('body', (stream) => {
          let chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const subjectMatch = body.match(/Subject: (.*?)(?:\r?\n|$)/);
            const subject = subjectMatch ? subjectMatch[1].trim() : null;
            const resetMatch = body.match(/reset-password\/[^"'&\s]+/i);
            if (subject) console.log('SUBJECT:', subject);
            if (resetMatch) console.log('RESET_LINK_FOUND:', true);
            if (body.includes('JobTrack') && body.includes('Reset')) {
              console.log('BODY_SNIPPET:', body.slice(0, 260));
            }
          });
        });
      });

      fetcher.on('end', () => imap.end());
    });
  });
});

imap.once('error', (err) => {
  console.error('IMAP_ERROR:', err.message);
});

imap.connect();
