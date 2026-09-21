const path = require('path');
const Imap = require('imap');
const dotenvPath = path.resolve(__dirname, 'server/node_modules/dotenv');
require(dotenvPath).config({ path: path.resolve(__dirname, '.env') });

function readInbox() {
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

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) return reject(err);
        imap.search(['ALL'], (searchErr, results) => {
          if (searchErr) return reject(searchErr);
          const uids = (results || []).slice(-10).reverse();
          if (!uids.length) return resolve([]);
          const all = [];
          const fetcher = imap.fetch(uids, { bodies: '' });
          fetcher.on('message', (msg, seqno) => {
            let subject = ''; let to = ''; let from = ''; let body = '';
            msg.on('body', (stream) => {
              let buffer = '';
              stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
              stream.on('end', () => {
                const subjects = [...buffer.matchAll(/Subject: ([^\r\n]+)/g)].map(m => m[1]);
                const tos = [...buffer.matchAll(/To: ([^\r\n]+)/g)].map(m => m[1]);
                const froms = [...buffer.matchAll(/From: ([^\r\n]+)/g)].map(m => m[1]);
                subject = subjects[0] || '';
                to = tos[0] || '';
                from = froms[0] || '';
                body = buffer.slice(buffer.indexOf('\r\n\r\n') + 4).replace(/\r/g, '').slice(0, 500);
                all.push({ subject, to, from, body: body.replace(/\s+/g, ' ').trim() });
              });
            });
          });
          fetcher.on('end', () => {
            imap.end();
            resolve(all);
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
  const messages = await readInbox();
  console.log('MESSAGE_COUNT', messages.length);
  for (const msg of messages) {
    console.log('---');
    console.log('SUBJECT:', msg.subject);
    console.log('TO:', msg.to);
    console.log('FROM:', msg.from);
    console.log('BODY_SNIPPET:', msg.body);
  }
})();
