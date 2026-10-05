const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('BROWSER:' + msg.type() + ':' + msg.text()));
  page.on('pageerror', (err) => console.log('PAGEERROR:' + err.message));

  await page.goto('http://localhost:5174/login');
  await page.fill('input[placeholder="you@example.com"]', 'demo@jobtrack.app');
  await page.fill('input[placeholder="••••••••"]', 'demo123');
  await page.click('button:has-text("Login")');
  await page.waitForURL('**/dashboard', { timeout: 20000 });

  await page.goto('http://localhost:5174/resume');
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const originalCreateObjectURL = window.URL.createObjectURL.bind(window.URL);
    window.URL.createObjectURL = function (blob) {
      const url = originalCreateObjectURL(blob);
      window.__lastPdfUrl = url;
      return url;
    };

    const originalClick = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () {
      if (this.download && this.href.startsWith('blob:')) {
        fetch(this.href)
          .then((res) => res.arrayBuffer())
          .then((buffer) => {
            const header = Array.from(new Uint8Array(buffer.slice(0, 5)))
              .map((b) => String.fromCharCode(b))
              .join('');
            window.__pdfMeta = {
              bytes: buffer.byteLength,
              header,
              ok: header === '%PDF-',
            };
          })
          .catch((error) => {
            window.__pdfMeta = { error: error.message };
          });
      }
      return originalClick.apply(this, arguments);
    };
  });

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((el) => el.textContent.includes('Download PDF'));
    if (!btn) throw new Error('Download button not found');
    btn.click();
  });

  await page.waitForTimeout(8000);

  const result = await page.evaluate(() => ({
    lastPdfUrl: window.__lastPdfUrl || null,
    pdfMeta: window.__pdfMeta || null,
    buttonText: [...document.querySelectorAll('button')].find((el) => el.textContent.includes('Download PDF'))?.textContent || '',
  }));

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
