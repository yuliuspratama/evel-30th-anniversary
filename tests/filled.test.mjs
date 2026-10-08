/* =====================================================================
   filled.test.mjs — uji dengan config yang SUDAH DIISI NILAI NYATA
   ---------------------------------------------------------------------
   Skrip ini menyalin proyek ke direktori sementara, mengganti nilai di
   content.config.json (nama, sapaan, judul lagu), membangun ulang,
   lalu memverifikasi di browser sungguhan bahwa:
     - nilai terpusat benar-benar tampil di halaman
     - audio mengikuti judul lagu dari config
     - tanpa penanda placeholder tersisa
   Membuktikan "sumber tunggal = content.config.json" bukan sekadar
   klaim: ganti config, halaman ikut berubah.
   ===================================================================== */

import { chromium } from 'playwright-core';
import { startServer } from '../tools/static-server.mjs';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`); }
  else { failures.push(`${name}: ${detail}`); console.log(`  x ${name}  —  ${detail}`); }
}

/* ---------- 1. Salin proyek ke temp & isi nilai nyata ---------- */
const TMP = mkdtempSync(join(tmpdir(), 'evel-filled-'));
cpSync(ROOT, TMP, {
  recursive: true,
  filter: (src) => !src.includes('/.git') && !src.includes('/node_modules') && !src.includes('/tests/.cache')
});

const cfgPath = join(TMP, 'content.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));

/* Nilai nyata yang berbeda dari bawaan — supaya perubahan terlihat jelas */
Object.assign(cfg.values, {
  'Nama Anak': 'Alya',
  'Nama Pasangan': 'Bapak Hendra & Ibu Sri'
});
cfg.hero.h1 = 'Untuk Ayah & Ibu Tercinta';
cfg.kartu.salutation = 'Ayah, Ibu yang kusayang,';
cfg.settings.audio = {
  ...cfg.settings.audio,
  title: 'Lagu Uji Coba',
  artist: 'Penyanyi Uji'
};
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');

/* ---------- 2. Bangun ulang ---------- */
execFileSync('node', [join(TMP, 'tools/build-content.mjs')], { stdio: 'pipe' });

const builtHtml = readFileSync(join(TMP, 'index.html'), 'utf8');

/* ---------- 3. Verifikasi hasil generasi (statis) ---------- */
console.log('\n=== Generasi dari config terisi ===');
check('h1 mengikuti config baru',
  builtHtml.includes('Untuk Ayah &amp; Ibu Tercinta'), 'hero.h1 diganti (ter-escape HTML)');
check('salutation kartu mengikuti config',
  builtHtml.includes('Ayah, Ibu yang kusayang,'), 'kartu.salutation diganti');
check('judul lagu tampil di player',
  builtHtml.includes('Lagu Uji Coba'), 'audio.title diganti');
check('artis lagu tampil di player',
  builtHtml.includes('Penyanyi Uji'), 'audio.artist diganti');
check('audio src tetap menunjuk file lagu',
  builtHtml.includes('src="assets/audio/mutiara-cinta-kita.mp3"'), 'audio src benar');
check('angka anniversary tampil',
  builtHtml.includes('>30<'), 'angka 30 ada');
check('tidak ada penanda mark.todo lagi',
  !builtHtml.includes('mark class="todo"'), 'nol penanda');
check('lirik tetap utuh (8 stanza)',
  (builtHtml.match(/lyric__stanza/g) || []).length >= 8,
    `${(builtHtml.match(/lyric__stanza/g) || []).length} kemunculan`);

/* ---------- 4. Uji di browser ---------- */
const server = await startServer(TMP, 0);
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']
});

try {
  const consoleErrors = [];
  const pageErrors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });

  console.log('\n=== Halaman dengan nilai nyata ===');

  const live = await page.evaluate(() => {
    const audio = document.getElementById('bg-audio');
    const body = document.body.innerText;
    return {
      h1: document.querySelector('h1')?.textContent,
      title: document.title,
      salutation: document.querySelector('.card__salutation')?.textContent,
      playerNote: document.querySelector('.player__note')?.textContent,
      playerArtist: document.querySelector('.player__artist')?.textContent,
      audioSrc: audio?.getAttribute('src'),
      stanzas: document.querySelectorAll('.lyric__stanza').length,
      todoMarks: document.querySelectorAll('mark.todo').length,
      leftoverTokens: body.match(/\[[A-Za-z][^\]]{2,40}\]/g) || []
    };
  });

  check('h1 live mengikuti config',
    live.h1 === 'Untuk Ayah & Ibu Tercinta', live.h1);
  check('salutation live mengikuti config',
    live.salutation === 'Ayah, Ibu yang kusayang,', live.salutation);
  check('player menampilkan judul dari config',
    live.playerNote === 'Lagu Uji Coba', live.playerNote);
  check('player menampilkan artis dari config',
    (live.playerArtist || '').includes('Penyanyi Uji'), live.playerArtist);
  check('audio live menunjuk file lagu',
    live.audioSrc === 'assets/audio/mutiara-cinta-kita.mp3', live.audioSrc);
  check('lirik live utuh',
    live.stanzas === 8, `${live.stanzas} stanza`);
  check('nol placeholder tampil live',
    live.todoMarks === 0 && live.leftoverTokens.length === 0,
    `${live.todoMarks} penanda, ${live.leftoverTokens.length} token`);

  check('tanpa error konsol', consoleErrors.length === 0, consoleErrors.join(' | ') || 'bersih');
  check('tanpa uncaught exception', pageErrors.length === 0, pageErrors.join(' | ') || 'bersih');

  /* ---------- 5. Skenario: audio gagal dimuat (404) ---------- */
  console.log('\n=== Skenario kegagalan audio ===');
  const brokenPage = await ctx.newPage();
  const bErrors = [];
  brokenPage.on('pageerror', e => bErrors.push(e.message));
  await brokenPage.route('**/assets/audio/mutiara-cinta-kita.mp3', route => route.abort());
  await brokenPage.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await brokenPage.waitForTimeout(600);

  const badState = await brokenPage.evaluate(() => {
    const btn = document.getElementById('audio-toggle');
    return {
      btnExists: !!btn,
      pressed: btn?.getAttribute('aria-pressed') || null,
      pageReadable: document.body.innerText.includes('mutiara indah')
    };
  });
  check('audio gagal: halaman tetap terbaca penuh', badState.pageReadable === true,
    'naskah tidak bergantung pada lagu');
  check('audio gagal: tombol tetap ada (tidak error fatal)',
    badState.btnExists === true, 'tombol ada');
  check('audio gagal: tidak ada exception', bErrors.length === 0,
    bErrors.join(' | ') || 'bersih');

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
