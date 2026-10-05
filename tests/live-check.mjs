#!/usr/bin/env node
/* =====================================================================
   live-check.mjs — verifikasi URL GitHub Pages yang BENCH-ALREADYUP
   ---------------------------------------------------------------------
   Menguji situs yang sudah daring di URL subpath github.io/<repo>/,
   karena kondisi itu TIDAK bisa dibuktikan oleh server lokal: path
   absolut akan lolos di localhost tapi rusak di subpath, dan itu hanya
   terlihat ketika semua aset diunduh lewat URL publik.

   Dipakai juga untuk smoke test setelah rollback.

   Jalankan:  node tests/live-check.mjs [url]
   ===================================================================== */

import { chromium } from 'playwright-core';

const URL_ = process.argv[2] ||
  'https://yuliuspratama.github.io/evel-30th-anniversary/';

let pass = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); pass++; }
  else { console.log(`  FAIL  ${name}  — ${detail}`); failures.push(name); }
}

console.log(`\nMenguji: ${URL_}\n`);

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const consoleErrors = [];
const failedRequests = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });

let resp;
try {
  resp = await page.goto(URL_, { waitUntil: 'networkidle', timeout: 45000 });
} catch (e) {
  console.log(`  FAIL  halaman tidak termuat — ${e.message}`);
  await browser.close();
  process.exit(1);
}

check('halaman utama 200', resp.status() === 200, `status ${resp.status()}`);

/* Aset yang benar-benar diunduh browser pada URL subpath. Inilah yang
   membuktikan path relatif aman — bukan asumsi. */
const assets = await page.evaluate(() =>
  Array.from(document.querySelectorAll('img[src], link[href][rel="stylesheet"], script[src]'))
    .map(el => el.getAttribute('src') || el.getAttribute('href'))
    .filter(Boolean));

const assetResults = [];
for (const a of [...new Set(assets)]) {
  const res = await page.request.get(new URL(a, URL_).href);
  assetResults.push({ a, status: res.status() });
}
const bad = assetResults.filter(r => r.status !== 200);
check('semua aset termuat lewat URL subpath', bad.length === 0,
  bad.map(r => `${r.status} ${r.a}`).join(', ') || `${assetResults.length} aset: ${assetResults.map(r => r.a).join(' ')}`);

/* CSS benar-benar termuat? Kalau stylesheet 404 diam-diam, halaman
   tetap "200" tapi tampil polos — cek computed style. */
const styled = await page.evaluate(() => {
  const body = document.body;
  const bg = getComputedStyle(body).backgroundColor;
  const h1 = document.querySelector('h1');
  return {
    bg,
    fontFamily: h1 ? getComputedStyle(h1).fontFamily : '',
    h1Size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
    h1Text: h1 ? h1.textContent.trim().slice(0, 40) : ''
  };
});
check('CSS benar-benar diterapkan (bukan 404 diam-diam)',
  styled.bg !== 'rgba(0, 0, 0, 0)' && styled.h1Size >= 24,
  `bg=${styled.bg} h1=${styled.h1Size}px "${styled.h1Text}"`);
check('h1 ada & bukan placeholder generator',
  styled.h1Text.length > 0, `"${styled.h1Text}"`);

/* Anchor internal harus tetap resolve setelah path subpath */
const anchors = await page.evaluate(() =>
  Array.from(document.querySelectorAll("a[href^='#']")).map(a => ({
    href: a.getAttribute('href'),
    ok: !!document.getElementById(a.getAttribute('href').slice(1))
  })));
check('semua anchor internal resolve', anchors.every(a => a.ok),
  `${anchors.length} anchor`);

/* Countdown hanya hidup bila tanggal celebration diisi. */
const cd = await page.evaluate(() => {
  const el = document.getElementById('countdown');
  return { exists: !!el, hidden: el ? el.hidden : null, days: (document.getElementById('cd-days') || {}).textContent };
});
check('countdown: tersembunyi bila tanggal belum diisi (diharapkan)',
  cd.exists && cd.hidden === true, `hidden=${cd.hidden}`);

/* Naskah benar-benar tampil, bukan hanya kerangka HTML */
const copy = await page.evaluate(() => ({
  sections: document.querySelectorAll('main section').length,
  textLen: document.querySelector('main').innerText.trim().length,
  lang: document.documentElement.lang,
  title: document.title
}));
check('naskah tampil utuh (5 section, teks panjang)', copy.sections === 5 && copy.textLen > 800,
  `${copy.sections} section, ${copy.textLen} karakter`);
check('lang & title benar', copy.lang === 'id-ID' && copy.title.length > 0 && copy.title.length <= 60,
  `lang=${copy.lang} title="${copy.title}" (${copy.title.length} karakter)`);

/* og:image harus ABSOLUT agar social card bisa di-render, dan harus
   mengembalikan 200 dari CDN GitHub. */
const og = await page.evaluate(() => {
  const el = document.querySelector('meta[property="og:image"]');
  return el ? el.content : null;
});
check('og:image ada', !!og, og || '(tidak ada)');
check('og:image absolut (wajib untuk social card)', !!og && /^https?:\/\//.test(og), og || '—');
if (og && /^https?:\/\//.test(og)) {
  const r = await page.request.get(og);
  check('og:image bisa diambil (200)', r.status() === 200, `status ${r.status()} ${og}`);
}

check('tidak ada error konsol', consoleErrors.length === 0,
  consoleErrors.slice(0, 3).join(' | ') || 'bersih');
check('tidak ada permintaan gagal (4xx/5xx)', failedRequests.length === 0,
  failedRequests.slice(0, 3).join(' | ') || 'bersih');

await page.screenshot({ path: new URL('../tests/screenshots/30-live-github-pages.png', import.meta.url).pathname,
  fullPage: false });
await browser.close();

console.log(`\n${'='.repeat(62)}`);
console.log(`LULOS ${pass}   GAGAL ${failures.length}`);
if (failures.length) {
  console.log('\nGAGAL:');
  failures.forEach(f => console.log('  x ' + f));
  console.log('\nSITUS LIVE BERMASALAH');
  process.exit(1);
}
console.log('\nSITUS LIVE TERVERIFIKASI');