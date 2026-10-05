/* =====================================================================
   shots.mjs — tangkapan layar untuk pemeriksaan visual
   ---------------------------------------------------------------------
   Menyimpan PNG ke tests/screenshots/ untuk viewport utama dan untuk
   setiap section, supaya hasil Integr can diperiksa mata, bukan hanya
   lewat angka. Jalankan: node tests/shots.mjs
   ===================================================================== */

import { chromium } from 'playwright-core';
import { startServer } from '../tools/static-server.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tests/screenshots');
mkdirSync(OUT, { recursive: true });

const server = await startServer(ROOT, 0);
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

const shots = [];

async function capture(page, name, opts = {}) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: !!opts.full });
  shots.push(name);
  console.log(`  shot  ${name}.png`);
}

try {
  /* Desktop */
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1
  });
  const p = await desktop.newPage();
  await p.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  await capture(p, '01-desktop-hero');

  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1100);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  await capture(p, '02-desktop-full', { full: true });

  for (const [name, sel] of [
    ['03-sambutan', '#sambuten'],
    ['04-perjalanan', '#perjalanan'],
    ['05-galeri', '#galeri'],
    ['06-keluarga', '#keluarga'],
    ['07-kutipan', '#kutipan']
  ]) {
    await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'start' }), sel);
    await p.waitForTimeout(950);
    await capture(p, name);
  }
  await desktop.close();

  /* Mobile */
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const m = await mobile.newPage();
  await m.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await m.waitForTimeout(400);
  await capture(m, '10-mobile-hero');

  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await m.waitForTimeout(1200);
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(400);
  await capture(m, '11-mobile-full', { full: true });
  await mobile.close();

  /* Mobile dengan menu navigasi terfokus (bukti cincin fokus) */
  const k = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const kp = await k.newPage();
  await kp.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await kp.keyboard.press('Tab');
  await kp.keyboard.press('Tab');
  await kp.keyboard.press('Tab');
  await kp.waitForTimeout(250);
  await capture(kp, '20-focus-nav');
  await k.close();
} finally {
  await browser.close();
  await server.close();
}

console.log(`\n${shots.length} tangkapan layar di tests/screenshots/`);
