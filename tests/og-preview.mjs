#!/usr/bin/env node
/* =====================================================================
   og-preview.mjs — render kartu OG dengan Chromium sungguhan
   ---------------------------------------------------------------------
   Verify that assets/img/og-cover.svg renders correctly at the size
   social platforms use, and write the raster PNG used as og:image.

   ImageMagick is NOT used for verification: it substitutes fonts and
   handles letter-spacing differently from a browser, so it can report
   clipping the real renderer never produces (and miss clipping it does).

   Run:  node tests/og-preview.mjs [--write]
         --write  also regenerate assets/img/og-cover.png
   ===================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG = join(ROOT, 'assets/img/og-cover.svg');
const PNG = join(ROOT, 'assets/img/og-cover.png');
const WRITE = process.argv.includes('--write');

const W = 1200, H = 630;

const svg = readFileSync(SVG, 'utf8');
const html = `<!DOCTYPE html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>
${svg}`;

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html, { waitUntil: 'load' });
await page.waitForTimeout(150);

let fail = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fail++;
};

/* Does any text inside the card overflow the 1200px card width?
   Compare each text element's bounding box against the card. */
const boxes = await page.evaluate((cardW) => {
  return Array.from(document.querySelectorAll('text')).map(t => {
    const b = t.getBBox();
    return {
      text: t.textContent.trim(),
      left: Math.round(b.x),
      right: Math.round(b.x + b.width),
      width: Math.round(b.width)
    };
  }).filter(t => t.text);
}, W);

console.log('\n=== Teks di dalam kartu OG ===');
for (const t of boxes) {
  console.log(`  x=${String(t.left).padStart(4)}..${String(t.right).padStart(4)}  (${t.width}px)  "${t.text}"`);
}

/* A centred element is clipped when it extends past either card edge.
   Social platforms crop the centre of the card, so text must stay inside. */
const clipped = boxes.filter(t => t.left < 0 || t.right > W);
check('tidak ada teks terpotong keluar kartu 1200px', clipped.length === 0,
  clipped.map(t => `"${t.text}" (${t.left}..${t.right})`).join(', ') || `${boxes.length} teks di dalam kartu`);

const overflowing = boxes.filter(t => t.width > W * 0.94);
check('tidak ada teks selebar >94% kartu', overflowing.length === 0,
  overflowing.map(t => `"${t.text}" ${t.width}px`).join(', ') || 'lebar wajar');

const key = ['30', 'Tahun Bersama'].filter(w => boxes.some(t => t.text.includes(w)));
check('teks utama tetap ada', key.length === 2, key.join(', '));

if (WRITE) {
  const buf = await page.screenshot({ type: 'png' });
  writeFileSync(PNG, buf);
  console.log(`\n  tulis ${PNG} (${buf.length} byte)`);
}

await browser.close();

console.log(fail ? `\nADA YANG GAGAL (${fail})` : '\nKARTU OG OK');
process.exit(fail ? 1 : 0);