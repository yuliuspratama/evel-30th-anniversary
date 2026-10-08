/* =====================================================================
   ui.test.mjs — uji tampilan & perilaku di browser sungguhan
   ---------------------------------------------------------------------
   Menjalankan Chromium via playwright-core di atas server statis
   sungguhan. Kontrak KONSEP BARU: kartu ucapan dari anak (Yuli)
   untuk Papa & Mama — 30 tahun, 1 anak, lagu + lirik.

   Cakupan:
     A. Struktur & semantik
     B. Aset & font
     C. Error konsol
     D. Navigasi keyboard & anchor
     E. Kontras warna
     F. Viewport (responsif)
     G. Reduced motion
     H. Tanpa JS
     I. Registry placeholder
     J. Audio player
   ===================================================================== */

import { chromium } from 'playwright-core';
import { startServer } from '../tools/static-server.mjs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let failures = [];
const notes = [];

function ok(name, detail = '') {
  pass++;
  console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`);
}
function bad(name, detail) {
  failures.push(`${name}: ${detail}`);
  console.log(`  x ${name}  —  ${detail}`);
}
function group(title) {
  console.log('\n' + title);
}
function check(name, cond, detail = '') {
  cond ? ok(name, detail) : bad(name, detail);
}

/* ---------- utilitas warna ---------- */
const srgb = c => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
function luminance([r, g, b]) {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const server = await startServer(ROOT);
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
});

function watch(page) {
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  return pageErrors;
}

try {

/* ---------- A. Struktur & semantik ---------- */
group('A. Struktur & semantik');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const info = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
      .map(h => ({ level: +h.tagName.slice(1), text: h.textContent.trim() }));
    return {
      title: document.title,
      lang: document.documentElement.lang,
      h1: Array.from(document.querySelectorAll('h1')),
      headings,
      sections: Array.from(document.querySelectorAll('main section[id]')).map(s => s.id),
      quotes: document.querySelectorAll('blockquote').length,
      cites: document.querySelectorAll('blockquote cite, figcaption cite').length,
      cardText: (document.querySelector('.card')?.innerText || '').length,
      lyricStanzas: document.querySelectorAll('.lyric__stanza').length,
      lyricLines: document.querySelectorAll('.lyric__line').length,
      playerBtn: !!document.getElementById('audio-toggle'),
      childName: (document.querySelector('.card__salutation')?.textContent || ''),
      err: null
    };
  });

  check('title dokumen benar', info.title.includes('Papa & Mama'), info.title);
  check('lang="id-ID"', info.lang === 'id-ID', info.lang);
  check('tepat satu <h1>', info.h1.length === 1, `ditemukan ${info.h1.length}`);

  // urutan heading tidak boleh melompat lebih dari satu tingkat
  let jumps = [];
  for (let i = 1; i < info.headings.length; i++) {
    if (info.headings[i].level - info.headings[i - 1].level > 1) {
      jumps.push(`h${info.headings[i - 1].level}->h${info.headings[i].level} "${info.headings[i].text.slice(0, 30)}"`);
    }
  }
  check('urutan heading tidak melompat', jumps.length === 0, jumps.join(' | ') || 'berurutan');

  check('kutipan memakai <blockquote> + <cite>', info.quotes >= 1 && info.cites >= 1,
    `blockquote=${info.quotes} cite=${info.cites}`);

  check('section kontrak lengkap',
    ['kartu', 'lirik', 'pesan'].every(id => info.sections.includes(id)),
    info.sections.join(', '));

  check('satu kartu ucapan (bukan grid keluarga)',
    await page.locator('.card').count() === 1, 'tepat satu elemen .card');

  check('teks kartu cukup panjang (ucapan sungguhan)', info.cardText > 300,
    `${info.cardText} karakter`);

  check('8 stanza lirik', info.lyricStanzas === 8, `${info.lyricStanzas} stanza`);
  check('lirik memuat chorus kunci',
    (await page.locator('.lyric__line', { hasText: 'mutiara indah' }).count()) >= 1,
    'kau adalah mutiara indah ada');
  check('lirik tidak berisi bagian perjalanan fiktif',
    (await page.locator('.lyric__line', { hasText: 'kucing' }).count()) === 0,
    'tidak ada detail fiktif');

  check('tombol player ada', info.playerBtn, 'audio-toggle ada');
  check('POV anak: salutation menyapa Papa & Mama',
    /papa/i.test(info.childName), info.childName.trim());

  // Penanda "anak tunggal" — tidak boleh ada kata Adik/saudara/kakak
  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
  check('tidak ada ucapan dari "adik" (1 anak saja)',
    !/\badik\b|\bkakak\b|\bsaudara\b/.test(bodyText), 'hanya Yuli, anak tunggal');

  check('tidak ada error halaman', errs.length === 0, errs.join(' | ') || 'bersih');

  await ctx.close();
}

/* ---------- B. Aset & font ---------- */
group('B. Aset & font');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const failedRequests = [];
  const badResponses = [];
  page.on('requestfailed', r => {
    failedRequests.push(`${r.url()} (${r.failure()?.errorText})`);
  });
  page.on('response', r => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const assetRefs = Array.from(html.matchAll(/(?:src|href)="([^"#][^"]*)"/g))
    .map(m => m[1])
    .filter(u => !u.startsWith('http'));
  const results = [];
  for (const ref of [...new Set(assetRefs)]) {
    const res = await page.request.get(`${server.origin}/${ref}`);
    results.push({ ref, status: res.status() });
  }
  const broken = results.filter(r => r.status !== 200);
  check('semua aset lokal merespons 200', broken.length === 0,
    broken.map(b => `${b.ref}=${b.status}`).join(', ') ||
    `${results.length} aset OK (audio termasuk)`);

  // audio harus benar-benar tersaji
  const audioRes = await page.request.get(`${server.origin}/assets/audio/mutiara-cinta-kita.mp3`);
  check('file lagu tersaji (200)', audioRes.status() === 200,
    `status=${audioRes.status()}`);
  const audioHead = audioRes.headers()['content-type'] || '';
  check('audio bertipe audio/*', /^audio\//.test(audioHead), audioHead || '(tanpa tipe)');

  check('tidak ada request gagal', failedRequests.length === 0, failedRequests.join(' | ') || 'bersih');
  check('tidak ada respons >= 400', badResponses.length === 0,
    badResponses.join(' | ') || 'semua aset 200');

  await ctx.close();
}

/* ---------- C. Audio player ---------- */
group('C. Audio player');
{
  // Chromium headless: autoplay dengan suara sering diblokir. Yang diuji
  // bukan "bunyi", tapi: elemen audio dibuat, tombol toggle bekerja, dan
  // status tombol mengikuti.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const before = await page.evaluate(() => {
    const btn = document.getElementById('audio-toggle');
    const audio = document.getElementById('bg-audio');
    return {
      pressed: btn?.getAttribute('aria-pressed'),
      state: btn?.querySelector('.player__state')?.textContent,
      autoplayed: audio ? !audio.paused : false
    };
  });
  check('tombol player status awal terdefinisi', before.pressed !== null,
    `aria-pressed=${before.pressed}, autoplay=${before.autoplayed}`);

  // Chromium test menjalankan autoplay (flag no-user-gesture-required),
  // sama seperti target produksi: lagu mengalun saat situs dibuka.
  check('autoplay: lagu mengalun saat halaman dibuka',
    before.autoplayed === true, before.autoplayed ? 'berputar' : 'terblokir');

  // klik toggle: karena sudah berputar, klik pertama = JEDA
  await page.click('#audio-toggle');
  await page.waitForTimeout(400);
  const afterClick = await page.evaluate(() => {
    const btn = document.getElementById('audio-toggle');
    const audio = document.getElementById('bg-audio');
    return {
      pressed: btn?.getAttribute('aria-pressed'),
      state: btn?.querySelector('.player__state')?.textContent,
      audioExists: !!audio,
      paused: audio ? audio.paused : null,
      currentTime: audio ? audio.currentTime : null,
      src: audio ? audio.getAttribute('src') : null
    };
  });
  check('audio element ada di DOM', afterClick.audioExists, 'ada <audio>');
  check('audio menunjuk file lagu',
    afterClick.src === 'assets/audio/mutiara-cinta-kita.mp3', afterClick.src);
  check('lagu sempat berputar sebelum jeda (waktu > 0)',
    afterClick.currentTime !== null && afterClick.currentTime > 0,
    `currentTime=${afterClick.currentTime?.toFixed(2)}s`);
  check('klik saat berputar: lagu dijeda', afterClick.paused === true,
    `paused=${afterClick.paused}`);
  check('tombol kembali "Putar lagu" saat jeda', afterClick.state === 'Putar lagu',
    afterClick.state);

  // klik kedua: putar lagi
  await page.click('#audio-toggle');
  await page.waitForTimeout(500);
  const afterResume = await page.evaluate(() => {
    const btn = document.getElementById('audio-toggle');
    const audio = document.getElementById('bg-audio');
    return {
      pressed: btn?.getAttribute('aria-pressed'),
      state: btn?.querySelector('.player__state')?.textContent,
      paused: audio ? audio.paused : null
    };
  });
  check('klik kedua: lagu berputar lagi', afterResume.paused === false,
    `paused=${afterResume.paused}`);
  check('tombol jadi "Jeda" saat berputar', afterResume.state === 'Jeda lagu',
    afterResume.state);
  check('aria-pressed mengikuti status', afterResume.pressed === 'true',
    `aria-pressed=${afterResume.pressed}`);

  check('tidak ada error halaman saat main audio', errs.length === 0, errs.join(' | ') || 'bersih');

  await ctx.close();
}

/* ---------- D. Navigasi keyboard & anchor ---------- */
group('D. Navigasi keyboard & anchor');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  // skip-link benar-benar melompat ke konten
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const jumped = await page.evaluate(() => ({
    hash: location.hash,
    inView: (() => {
      const el = document.querySelector('.skip-link');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    })()
  }));
  check('skip-link melompat ke section kartu', jumped.hash === '#kartu',
    `hash=${jumped.hash}`);

  // target anchor tidak tertutup nav lengket
  const overlap = await page.evaluate(() => {
    const nav = document.querySelector('.nav');
    const navRect = nav.getBoundingClientRect();
    return Array.from(document.querySelectorAll("a[href^='#']")).map(a => {
      const id = a.getAttribute('href').slice(1);
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top < navRect.bottom - 4 ? id : null;
    }).filter(Boolean);
  });
  check('anchor tidak tertutup nav lengket', overlap.length === 0,
    overlap.join(', ') || 'semua anchor terlihat');

  // semua link nav menunjuk section yang ada
  const navTargets = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".nav__list a[href^='#']")).map(a => {
      const id = a.getAttribute('href').slice(1);
      return { id, exists: !!document.getElementById(id) };
    }));
  check('semua link nav valid', navTargets.every(t => t.exists),
    navTargets.map(t => `${t.id}:${t.exists ? 'OK' : 'HILANG'}`).join(', '));

  await ctx.close();
}

/* ---------- E. Kontras warna ---------- */
group('E. Kontras warna');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  // Sampel: teks di hero (latar gelap) dan teks body (latar terang).
  const GRADIENT_FALLBACK = {
    'hero': [74, 15, 25],
    'section--alt': [246, 239, 234]
  };
  const samples = await page.evaluate(fallback => {
    const parse = str => {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map(Number);
      return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
    };
    const nearestBg = node => {
      for (let n = node; n; n = n.parentElement || null) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage !== 'none') {
          for (const key of Object.keys(fallback)) {
            if (n.className && String(n.className).includes(key)) return fallback[key].slice();
          }
          return [255, 255, 255];
        }
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) {
          if (c.a === 1) return c.rgb;
          const parentBg = nearestBg(node.parentElement || document.body);
          return c.rgb.map((ch, i) => ch * c.a + parentBg[i] * (1 - c.a));
        }
      }
      return [255, 255, 255];
    };
    const sels = [
      '.hero__title', '.hero__eyebrow', '.hero__sub--long',
      '.nav__list a', '.section__lead', '.card__salutation',
      '.card .prose p', '.lyric__line', '.lyric__label',
      '.player__meta', '.player__btn', '.footer__credit'
    ];
    const out = [];
    for (const sel of sels) {
      document.querySelectorAll(sel).forEach(el => {
        const cs = getComputedStyle(el);
        const fgRaw = parse(cs.color);
        if (!fgRaw) return;
        const bg = nearestBg(el);
        const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw.rgb;
        function over(top, bot) {
          return top.rgb.map((c, i) => c * top.a + bot[i] * (1 - top.a));
        }
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        out.push({
          sel, color: cs.color, bg: bg.join(','), size, weight, large
        });
      });
    }
    return out;
  }, GRADIENT_FALLBACK);

  const results = samples.map(s => {
    const fg = s.color.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);
    const bg = s.bg.split(',').map(Number);
    let f = fg.slice(0, 3);
    if (fg.length > 3 && fg[3] < 1) f = f.map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
    const ratio = contrast(f, bg);
    const need = s.large ? 3 : 4.5;
    return { sel: s.sel, ratio, need, pass: ratio >= need };
  });
  const fail = results.filter(r => !r.pass);
  check('kontras teks memenuhi WCAG', fail.length === 0,
    fail.map(f => `${f.sel} ${f.ratio.toFixed(2)}<${f.need}`).join('; ') ||
    `${results.length} sampel lolos`);

  await ctx.close();
}

/* ---------- F. Viewport ---------- */
for (const vp of [
  { name: 'ponsel', width: 360, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'lebar', width: 1600, height: 900 }
]) {
  group(`F. Viewport ${vp.name} (${vp.width}px)`);
  {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    watch(page);
    await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const overflowers = [];
      document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.right > de.clientWidth + 1 || r.left < -1) {
          overflowers.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`);
        }
      });
      return {
        overflow: overflowers,
        scrollW: de.scrollWidth,
        clientW: de.clientWidth,
        subShort: getComputedStyle(document.querySelector('.hero__sub--short')).display,
        subLong: getComputedStyle(document.querySelector('.hero__sub--long')).display,
        heroVisible: document.querySelector('.hero__digit') &&
          document.querySelector('.hero__digit').getBoundingClientRect().height > 0,
        cardVisible: !!document.querySelector('.card') &&
          document.querySelector('.card').getBoundingClientRect().width > 0
      };
    });

    check(`${vp.name}: tidak ada elemen meluber horizontal`,
      m.overflow.length === 0 && m.scrollW <= m.clientW + 1,
      m.overflow.slice(0, 3).join('; ') || `scroll=${m.scrollW} client=${m.clientW}`);
    check(`${vp.name}: angka 30 terlihat`, m.heroVisible, 'hero__digit tampil');
    check(`${vp.name}: kartu terlihat`, m.cardVisible, '.card tampil');

    if (vp.width < 640) {
      check(`${vp.name}: subjudul pendek dipakai`, m.subShort !== 'none' && m.subLong === 'none');
    } else {
      check(`${vp.name}: subjudul panjang dipakai`, m.subShort === 'none' && m.subLong !== 'none');
    }

    await ctx.close();
  }
}

/* ---------- G. Reduced motion ---------- */
group('G. Reduced motion');
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce'
  });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const rm = await page.evaluate(() => {
    const hidden = [];
    document.querySelectorAll('.card, .lyric__stanza, .quote, .pesan__closing')
      .forEach(el => {
        const cs = getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.5) hidden.push(el.className);
      });
    return {
      hidden,
      revealClass: document.querySelectorAll('.reveal').length,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      transDur: getComputedStyle(document.querySelector('.player__btn')).transitionDuration
    };
  });

  check('tidak ada elemen tersembunyi saat reduced motion',
    rm.hidden.length === 0, rm.hidden.slice(0, 3).join('; ') || 'semua opacity 1');
  check('scroll-behavior dimatikan', rm.scrollBehavior === 'auto', rm.scrollBehavior);
  check('transisi dipendekkan', parseFloat(rm.transDur) <= 0.01, rm.transDur);

  // bandingkan dengan mode normal: halaman harus interaktif normal
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();
  watch(page2);
  await page2.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await page2.waitForTimeout(300);

  const norm = await page2.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior
  }));
  check('mode normal: scroll-behavior smooth', norm.scrollBehavior === 'smooth', norm.scrollBehavior);

  await ctx2.close();
  await ctx.close();
}

/* ---------- H. Tanpa JS ---------- */
group('H. Tanpa JS');
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    javaScriptEnabled: false
  });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const noJs = await page.locator('h1').count();
  check('tanpa JS: elemen utama terbaca', noJs === 1);
  const h1 = await page.locator('h1').textContent();
  check('tanpa JS: H1 menyapa Papa & Mama', /papa/i.test(h1 || ''), h1);

  const cardText = await page.locator('.card').innerText();
  check('tanpa JS: kartu ucapan terbaca penuh', cardText.trim().length > 300,
    `${cardText.trim().length} karakter`);

  const stanzas = await page.locator('.lyric__stanza').count();
  check('tanpa JS: 8 stanza lirik terbaca', stanzas === 8, `${stanzas} stanza`);

  const quote = await page.locator('.quote').innerText();
  check('tanpa JS: kutipan terbaca', quote.trim().length > 20,
    `"${quote.trim().slice(0, 40)}..."`);

  await ctx.close();
}

/* ---------- I. Registry placeholder ---------- */
group('I. Registry placeholder');
{
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const cfg = JSON.parse(readFileSync(join(ROOT, 'content.config.json'), 'utf8'));

  const documented = new Set(Object.keys(cfg.values));

  const found = new Set();
  const re = /\[([A-Za-z][A-Za-z0-9 .&-]{2,40})\]/g;
  let m;
  while ((m = re.exec(html))) found.add(m[1].trim());

  const undocumented = [...found].filter(t => !documented.has(t));
  check('tidak ada placeholder di luar registry', undocumented.length === 0,
    undocumented.join(', ') || `${found.size} token, semua terdaftar`);

  check('registry di config.js sama dengan config.json', (() => {
    const js = readFileSync(join(ROOT, 'assets/js/config.js'), 'utf8');
    return [...documented].every(t => js.includes(JSON.stringify(t)) ||
      js.includes(`"${t}"`));
  })(), 'semua token ada di config.js');

  check('index.html ditandai sebagai hasil generasi',
    html.includes('BERKAS HASIL GENERASI'), 'header generator ada');
  check('tidak ada lorem ipsum', !/lorem ipsum/i.test(html));

  // semua nilai harus sudah diisi (situs final, bukan template)
  const unfilled = Object.entries(cfg.values)
    .filter(([, v]) => String(v).trim().startsWith('['));
  check('semua nilai config terisi (tidak ada token kosong)', unfilled.length === 0,
    unfilled.map(([k]) => k).join(', ') || `${Object.keys(cfg.values).length} nilai OK`);
}

/* ---------- J. Isi konten kontrak POV anak ---------- */
group('J. Isi konten kontrak POV anak');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();

  // larangan konten: tidak ada detail perjalanan fiktif
  check('tidak ada cerita "pindah kota"',
    !text.includes('pindah ke'), 'bersih');
  check('tidak ada kucing yang datang sendiri', !text.includes('kucing'), 'bersih');
  check('tidak ada lokasi pernikahan fiktif',
    !text.includes('lokasi pernikahan'), 'bersih');

  // keharusan: ucapan dari satu anak bernama Yuli
  check('nama anak (Yuli) disebut', text.includes('yuli'), 'Yuli ada');
  check('30 tahun disebut', /tiga puluh tahun|30 tahun/.test(text), 'angka 30 ada');
  check('tanggal 1996 disebut', text.includes('1996'), '5 Oktober 1996 ada');

  await ctx.close();
}

} finally {
  await browser.close();
  await server.close();
}

/* ---------- Ringkasan ---------- */
console.log('\n' + '='.repeat(62));
console.log(`LULOS ${pass}   GAGAL ${failures.length}`);
if (notes.length) {
  console.log('\nCatatan:');
  notes.forEach(n => console.log('  - ' + n));
}
if (failures.length) {
  console.log('\nGAGAL:');
  failures.forEach(f => console.log('  x ' + f));
  process.exit(1);
}
console.log('SEMUA UJI LOLOS');
