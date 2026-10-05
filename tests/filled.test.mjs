/* =====================================================================
   filled.test.mjs — uji dengan config yang SUDAH DIISI NILAI NYATA
   ---------------------------------------------------------------------
   uji utama memakai config setengah kosong (placeholder tampil). Skrip ini
   menyalin proyek ke direktori sementara, mengisi semua token di
   content.config.json dengan nilai contoh, lalu memverifikasi:

     1. Tidak ada satu pun placeholder yang tersisa di halaman
     2. Judul & meta berubah sesuai config
     3. Hitung mundur aktif dan menghitung ke depan
     4. Foto asli (JPG) menggantikan ilustrasi bila file-nya ada
     5. Penanda "belum diisi" hilang total
     6. Foto hilang -> otomatis kembali ke ilustrasi

   Ini membuktikan jalur konfigurasi terpusat bekerja end-to-end.
   Jalankan: node tests/filled.test.mjs
   ===================================================================== */

import { chromium } from 'playwright-core';
import { startServer } from '../tools/static-server.mjs';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); }
  else { failures.push(`${name}: ${detail}`); console.log(`  FAIL  ${name}  — ${detail}`); }
}

/* ---------- 1. Salin proyek ke temp & isi semua nilai ---------- */
const TMP = mkdtempSync(join(tmpdir(), 'evel-filled-'));
cpSync(ROOT, TMP, {
  recursive: true,
  filter: (src) => !src.includes('/.git') && !src.includes('/node_modules') && !src.includes('/tests/.cache')
});

const cfgPath = join(TMP, 'content.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));

Object.assign(cfg.values, {
  'Nama Pasangan': 'Budi Santoso',
  'Tanggal Pernikahan': '12 Juni 1996',
  'Lokasi Pernikahan': 'Gedung Serbaguna Bunga Melati, Malang',
  'Tanggal Perayaan': '8 Juni 2026',
  'Lokasi Perayaan': 'Kafe Reid, Malang',
  'Kota Domisili': 'Malang',
  'Nama Anak 1': 'Alya',
  'Nama Anak 2': 'Rafi',
  'Nama Anak 3': 'Nadia',
  'Nama Orang Tua': 'Bapak Hendra & Ibu Sri',
  'Nama Keponakan': 'Bagas',
  'Nama Penyusun': 'Keluarga Besar',
  'Deskripsi Foto 1': 'Budi dan pasangannya tersenyum di depan taman bunga',
  'Deskripsi Foto 2': 'Kedua tangan terkunci bergandengan',
  'Deskripsi Foto 3': 'Foto bersama seluruh keluarga di ruang tamu',
  'Keterangan Foto 1': 'Musim pertama berdua',
  'Keterangan Foto 2': 'Tetap begitu saja',
  'Keterangan Foto 3': ''
});

// hitung mundur ke tanggal yang pasti masih di depan
const future = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
cfg.settings.countdownTarget = future;

writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');

/* ---------- 2. Buat dua "foto asli" JPG sungguhan ---------- */
/* JPEG 1x1 yang valid, ditulis sebagai biner agar benar-benar(file) foto. */
const JPEG_1PX = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');
writeFileSync(join(TMP, 'assets/foto-1.jpg'), JPEG_1PX);
writeFileSync(join(TMP, 'assets/foto-2.jpg'), JPEG_1PX);
// foto-3 sengaja TIDAK dibuat -> harus jatuh ke ilustrasi

/* ---------- 3. Bangun ulang ---------- */
const { execFileSync } = await import('node:child_process');
execFileSync('node', [join(TMP, 'tools/build-content.mjs')], { stdio: 'pipe' });

const builtHtml = readFileSync(join(TMP, 'index.html'), 'utf8');
console.log('\n=== Bangunan dari config berisi nilai ===');
check('build-content berhasil tanpa error', true, 'exit 0');
check('index.html tidak lagi memuat token kosong',
  !/\[(Nama|Tanggal|Lokasi|Kota)[^\]]*\]/.test(builtHtml),
  'nol placeholder tersisa');
check('foto-1 & foto-2 memakai file JPG asli',
  builtHtml.includes('assets/foto-1.jpg') && builtHtml.includes('assets/foto-2.jpg'),
  'src terisi foto asli');
check('foto-3 (belum ada) memakai ilustrasi fallback',
  builtHtml.includes('assets/img/placeholder-3.svg'), 'fallback terpasang');
check('tidak ada penanda mark.todo lagi',
  !builtHtml.includes('mark class="todo"'), 'nol penanda');
check('judul memakai nama nyata',
  builtHtml.includes('<title>30 Tahun Pernikahan — Budi Santoso</title>'),
  readFileSync(join(TMP, 'index.html'), 'utf8').match(/<title>[^<]*<\/title>/)[0]);

/* ---------- 4. Uji di browser ---------- */
const server = await startServer(TMP, 0);
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

try {
  const consoleErrors = [];
  const pageErrors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  // gambar ke-2 & ke-3 memakai loading="lazy" — harus digulir dulu agar termuat
  await page.evaluate(() => document.getElementById('galeri').scrollIntoView());
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  console.log('\n=== Halaman dengan nilai nyata ===');

  const live = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      title: document.title,
      desc: document.querySelector('meta[name="description"]')?.content,
      leftoverTokens: body.match(/\[[A-Za-z][^\]]{2,40}\]/g) || [],
      todoMarks: document.querySelectorAll('mark.todo').length,
      h1: document.querySelector('h1')?.textContent.trim(),
      countdownVisible: !document.getElementById('countdown').hidden,
      cdDays: document.getElementById('cd-days').textContent,
      cdHours: document.getElementById('cd-hours').textContent,
      images: Array.from(document.querySelectorAll('.gallery__item img')).map(i => ({
        src: i.getAttribute('src'), natural: i.naturalWidth, alt: i.getAttribute('alt')
      })),
      captions: Array.from(document.querySelectorAll('.gallery__caption')).map(c => c.textContent.trim()),
      wishes: Array.from(document.querySelectorAll('.wish__from')).map(w => w.textContent.trim()),
      footer: document.querySelector('.footer__credit').textContent.trim(),
      // nilai yang di-substitusi runtime oleh main.js
      runtimeFilled: body.includes('Budi Santoso')
    };
  });

  check('judul dokumen memakai nama pasangan', live.title === '30 Tahun Pernikahan — Budi Santoso', live.title);
  check('meta description terisi nama & tanggal',
    live.desc.includes('Budi Santoso') && live.desc.includes('12 Juni 1996'),
    live.desc.slice(0, 60) + '...');
  check('nol placeholder tersisa di halaman', live.leftoverTokens.length === 0,
    live.leftoverTokens.join(', ') || 'bersih');
  check('nol penanda "belum diisi"', live.todoMarks === 0, `${live.todoMarks} penanda`);
  check('H1 memakai nama nyata', live.h1.includes('Budi Santoso') && live.h1.includes('Tiga Pulas Tahun'),
    `"${live.h1}"`);
  check('5 kartu ucapan muncul setelah semua nama diisi', live.wishes.length === 5,
    live.wishes.join(', '));
  check('kredit footer memakai Nama Penyusun', live.footer.includes('Keluarga Besar'), live.footer);

  check('hitung mundur aktif', live.countdownVisible, `visible=${live.countdownVisible}`);
  const days = Number(live.cdDays);
  check('hitung mundur menghitung ke depan (bukan 0 atau negatif)',
    days >= 43 && days <= 45, `${days} hari (target ${future}) -> ${live.cdHours} jam`);

  check('foto-1 & foto-2 benar-benar dimuat (naturalWidth > 0)',
    live.images[0].natural > 0 && live.images[1].natural > 0,
    live.images.map(i => `${i.src}=${i.natural}px`).join(', '));
  check('foto-1 & foto-2 memakai JPG',
    live.images[0].src.endsWith('foto-1.jpg') && live.images[1].src.endsWith('foto-2.jpg'),
    live.images.map(i => i.src).join(', '));
  check('foto-3 jatuh ke ilustrasi (karena JPG-nya belum ada)',
    live.images[2].src.endsWith('placeholder-3.svg') && live.images[2].natural > 0,
    `${live.images[2].src} naturalWidth=${live.images[2].natural}`);

  // alt foto asli memakai nilai yang diisi, bukan nama file
  check('alt foto asli terisi deskripsi nyata',
    live.images[0].alt.includes('taman bunga') && live.images[1].alt.includes('bergandengan'),
    live.images.map(i => `"${i.alt}"`).join(' | '));

  // caption yang diisi tampil; yang dikosongkan dihapus, bukan dibiarkan kosong
  check('caption yang diisi tampil', live.captions.includes('Musim pertama berdua'),
    live.captions.join(' | '));
  check('caption kosong dihapus, tidak ada placeholder tertinggal',
    live.captions.length === 3 && !live.captions.some(c => /\[[^\]]+\]/.test(c)),
    `${live.captions.length} caption: ${live.captions.join(' | ')}`);

  check('tanpa error konsol', consoleErrors.length === 0, consoleErrors.join(' | ') || 'bersih');
  check('tanpa uncaught exception', pageErrors.length === 0, pageErrors.join(' | ') || 'bersih');

  /* ---------- 5. Skenario: file foto ada tapi rusak/404 saat runtime ---------- */
  console.log('\n=== Skenario kegagalan foto ===');
  const brokenPage = await ctx.newPage();
  await brokenPage.route('**/assets/foto-1.jpg', route => route.abort());
  const bErrors = [];
  brokenPage.on('console', m => { if (m.type() === 'error') bErrors.push(m.text()); });
  await brokenPage.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await brokenPage.evaluate(() => document.getElementById('galeri').scrollIntoView());
  await brokenPage.waitForTimeout(800);

  const afterFail = await brokenPage.locator('.gallery__item img').first().evaluate(el => ({
    src: el.getAttribute('src'), natural: el.naturalWidth
  }));
  check('foto gagal dimuat -> otomatis kembali ke ilustrasi',
    afterFail.src.endsWith('placeholder-1.svg') && afterFail.natural > 0,
    `src=${afterFail.src} naturalWidth=${afterFail.natural}`);

  /* ---------- 6. Countdown lewat / tidak valid ---------- */
  console.log('\n=== Ketahanan konfigurasi ===');
  const badPage = await ctx.newPage();
  await badPage.addInitScript(() => {
    // rusak sengaja: countdownTarget bukan tanggal
    Object.defineProperty(window, 'SITE_CONFIG', {
      configurable: true,
      set(v) { this.__cfg = v; },
      get() {
        const c = this.__cfg || {};
        return { ...c, settings: { ...(c.settings || {}), countdownTarget: 'bukan-tanggal' } };
      }
    });
  });
  const badErrors = [];
  badPage.on('pageerror', e => badErrors.push(e.message));
  await badPage.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  const badState = await badPage.evaluate(() => ({
    hidden: document.getElementById('countdown').hidden,
    text: document.body.innerText.includes('Budi Santoso')
  }));
  check('countdownTarget tidak valid -> countdown dimatikan, halaman utuh',
    badState.hidden === true && badState.text === true,
    `hidden=${badState.hidden} teks tetap ada=${badState.text}`);
  check('tidak ada exception dari countdown tidak valid', badErrors.length === 0,
    badErrors.join(' | ') || 'bersih');

  await ctx.close();
} finally {
  await browser.close();
  await server.close();
  rmSync(TMP, { recursive: true, force: true });
}

console.log('\n' + '='.repeat(62));
console.log(`LULOS ${pass}   GAGAL ${failures.length}`);
if (failures.length) {
  failures.forEach(f => console.log('  x ' + f));
  process.exit(1);
}
console.log('KONFIGURASI TERPUSAT TERBUKTI BERJALAN');
