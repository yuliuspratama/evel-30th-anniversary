const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setContent('<h1 id="x">hello</h1>');
  console.log('TITLE_OK', await page.evaluate(() => document.querySelector('h1').textContent));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
