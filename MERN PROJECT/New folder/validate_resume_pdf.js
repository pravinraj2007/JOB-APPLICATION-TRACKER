const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle', timeout: 120000 });
    await page.fill('input[type="email"]', 'demo@jobtrack.app');
    await page.fill('input[type="password"]', 'demo123');
    await page.getByRole('button', { name: /login/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 120000 });

    await page.goto('http://localhost:5174/resume', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(2000);

    const downloadPath = 'C:/Temp/jobtrack-pdf-check';
    fs.mkdirSync(downloadPath, { recursive: true });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Download PDF")').click(),
    ]);

    const file = path.join(downloadPath, 'resume.pdf');
    await download.saveAs(file);
    const stat = fs.statSync(file);
    const buffer = fs.readFileSync(file);
    const header = buffer.slice(0, 5).toString('ascii');

    console.log('SAVED_FILE=' + file);
    console.log('FILE_SIZE=' + stat.size);
    console.log('HEADER=' + header);
    console.log('HAS_PDF=' + (header === '%PDF-'));
  } finally {
    await browser.close();
  }
})();
