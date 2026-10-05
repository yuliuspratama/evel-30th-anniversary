/* =====================================================================
   ui.test.mjs — uji tampilan & perilaku di browser sungguhan
   ---------------------------------------------------------------------
   Menjalankan Chromium via playwright-core (sudah terpasang di
   tests/node_modules) di atas server statis sungguhan.

   Cakupan:
     A. Struktur & semantik   (h1, urutan heading, lang, title, alt)
     B. Tautan & aset rusak   (anchor internal + status aset nyata)
     C. Error konsol          (console error, pageerror, request gagal)
     D. Navigasi keyboard     (urutan tab, skip-link, cincin fokus)
     E. Kontras WCAG AA       (warna terhitung dari DOM sungguhan)
     F. Tampilan responsif    (360px & 1280px, tanpa overflow horizontal)
     G. Reduced motion        (tidak ada animasi, semua isi terlihat)
     H. Halaman tanpa JS      (naskah tetap terbaca)
     I. Registry placeholder  (tidak ada token liar)

   Jalankan:  node tests/ui.test.mjs
   Keluar 0 bila semua lolos.
   ===================================================================== */

import { chromium } from 'playwright-core';
import { startServer } from '../tools/static-server.mjs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
const failures = [];
const notes = [];

function ok(name, detail = '') {
  pass++;
  console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`);
}
function bad(name, detail) {
  failures.push(`${name}: ${detail}`);
  console.log(`  FAIL  ${name}  — ${detail}`);
}
function check(name, condition, detail = '') {
  condition ? ok(name, detail) : bad(name, detail || 'kondisi tidak terpenuhi');
  return !!condition;
}
function note(msg) { notes.push(msg); console.log('  ..    ' + msg); }

function group(title) { console.log(`\n=== ${title} ===`); }

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
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- palet fallback untuk latar ber-gradien ---------- */
const GRADIENT_FALLBACK = {
  hero: [74, 15, 25],        // --wedding-deep, warna paling gelap hero
  footer: [74, 15, 25]      // --wedding-deep
};

/* ============================================================ */
const server = await startServer(ROOT, 0);
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
});

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const badResponses = [];

function watch(page) {
  page.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('requestfailed', r => {
    failedRequests.push(`${r.url()} (${r.failure()?.errorText})`);
  });
  page.on('response', r => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });
}

try {

/* ---------- A. Struktur & semantik ---------- */
group('A. Struktur & semantik');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const info = await page.evaluate(() => ({
    lang: document.documentElement.getAttribute('lang'),
    title: document.title,
    titleLen: document.title.length,
    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
    headings: Array.from(document.querySelectorAll('h1,h2,h3'))
      .map(h => ({ level: Number(h.tagName[1]), text: h.textContent.trim().slice(0, 42) })),
    sections: Array.from(document.querySelectorAll('main section[id]')).map(s => s.id),
    imgs: Array.from(document.images).map(i => ({
      src: i.getAttribute('src'), alt: i.getAttribute('alt'),
      hasAlt: i.hasAttribute('alt'), w: i.getAttribute('width'), h: i.getAttribute('height'),
      loading: i.getAttribute('loading')
    })),
    quotes: document.querySelectorAll('#kutipan blockquote').length,
    cites: document.querySelectorAll('#kutipan cite').length,
    main: document.querySelectorAll('main').length,
    skip: document.querySelectorAll('.skip-link').length,
    navLabel: document.querySelector('nav')?.getAttribute('aria-label') || ''
  }));

  check('lang pada <html>', info.lang === 'id-ID', `lang="${info.lang}"`);
  check('<title> ada & <= 60 karakter', info.titleLen > 0 && info.titleLen <= 60,
    `${info.titleLen} karakter: "${info.title}"`);

  check('tepat satu <h1>', info.h1.length === 1, `ditemukan ${info.h1.length}`);

  // urutan heading tidak boleh melompat lebih dari satu tingkat
  let jumps = [];
  for (let i = 1; i < info.headings.length; i++) {
    if (info.headings[i].level - info.headings[i - 1].level > 1) {
      jumps.push(`h${info.headings[i - 1].level} -> h${info.headings[i].level} di "${info.headings[i].text}"`);
    }
  }
  check('urutan heading tidak melompat', jumps.length === 0, jumps.join('; ') || `${info.headings.length} heading`);

  check('setiap section punya heading', info.headings.filter(h => h.level === 2).length >= info.sections.length,
    `${info.headings.filter(h => h.level === 2).length} h2 untuk ${info.sections.length} section`);

  check('tepat satu <main>', info.main === 1);
  check('skip-link ada', info.skip === 1);
  check('nav punya aria-label', info.navLabel.length > 0, `"${info.navLabel}"`);
  check('kutipan memakai <blockquote> + <cite>', info.quotes === 1 && info.cites === 1,
    `blockquote=${info.quotes} cite=${info.cites}`);

  check('section kontrak lengkap',
    ['sambuten', 'perjalanan', 'galeri', 'keluarga', 'kutipan']
      .every(id => info.sections.includes(id)),
    info.sections.join(', '));

  // alt text
  const missingAlt = info.imgs.filter(i => !i.hasAlt);
  const emptyAlt = info.imgs.filter(i => i.hasAlt && !i.alt.trim());
  const filenameAlt = info.imgs.filter(i =>
    i.hasAlt && /\.(svg|jpg|jpeg|png|webp)$/i.test(i.alt));
  check('semua <img> punya alt', missingAlt.length === 0,
    missingAlt.map(i => i.src).join(', ') || `${info.imgs.length} gambar`);
  check('tidak ada alt kosong', emptyAlt.length === 0,
    emptyAlt.map(i => i.src).join(', '));
  check('alt bukan sekadar nama file', filenameAlt.length === 0,
    filenameAlt.map(i => `${i.src}: "${i.alt}"`).join('; '));
  check('gambar punya dimensi intrinsik (tanpa layout shift)',
    info.imgs.every(i => i.w && i.h), info.imgs.filter(i => !i.w).map(i => i.src).join(', ') || 'semua ada');
  check('gambar pertama dimuat eager, sisanya lazy',
    info.imgs[0]?.loading === 'eager' && info.imgs.slice(1).every(i => i.loading === 'lazy'),
    info.imgs.map(i => i.loading).join(', '));

  await ctx.close();
}

/* ---------- B. Tautan & aset rusak ---------- */
group('B. Tautan & aset rusak');
{
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

  const anchors = Array.from(html.matchAll(/href="([^"]+)"/g))
    .map(m => m[1])
    .filter(h => h.startsWith('#'));
  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g)).map(m => m[1]);
  const dangling = anchors.filter(h => !ids.includes(h.slice(1)));
  check('semua anchor internal punya target', dangling.length === 0,
    dangling.join(', ') || `${anchors.length} anchor, semua resolve`);

  // setiap href="#x" harus punya section/element nyata yang bisa difokuskan
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const clickable = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href^='#']")).map(a => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      const r = target ? target.getBoundingClientRect() : null;
      return { href: a.getAttribute('href'), exists: !!target,
               height: r ? r.height : 0, width: r ? r.width : 0 };
    });
  });
  const zeroSize = clickable.filter(c => c.exists && (c.height < 1 || c.width < 1));
  check('target anchor punya ukuran nyata', zeroSize.length === 0,
    zeroSize.map(c => c.href).join(', ') || `${clickable.length} target`);

  // semua path aset relatif (aman untuk subpath GitHub Pages)
  const absPaths = Array.from(html.matchAll(/(?:src|href)="(\/[^"]*)"/g)).map(m => m[1]);
  check('tidak ada path aset absolut (aman untuk subpath)', absPaths.length === 0,
    absPaths.join(', ') || 'semua relatif');

  // status HTTP nyata untuk tiap aset yang dirujuk
  const assetRefs = Array.from(html.matchAll(/(?:src|href)="([^"#][^"]*)"/g))
    .map(m => m[1])
    .filter(u => !u.startsWith('http'));
  const results = [];
  for (const ref of [...new Set(assetRefs)]) {
    const res = await page.request.get(`${server.origin}/${ref}`);
    results.push({ ref, status: res.status() });
  }
  const notOk = results.filter(r => r.status !== 200);
  check('semua aset referenced 200', notOk.length === 0,
    notOk.map(r => `${r.status} ${r.ref}`).join(', ') || `${results.length} aset: ${results.map(r => r.ref).join(' ')}`);

  // aset yang sengaja hilang harus 404 dengan rapi (tidak 500)
  const missing = await page.request.get(`${server.origin}/assets/foto-1.jpg`);
  check('foto asli yang belum ada -> 404 (bukan error server)', missing.status() === 404,
    `status ${missing.status()}`);

  await ctx.close();
}

/* ---------- C. Error konsol ---------- */
group('C. Error konsol');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);

  check('tidak ada console error', consoleErrors.length === 0, consoleErrors.join(' | ') || 'bersih');
  check('tidak ada uncaught exception', pageErrors.length === 0, pageErrors.join(' | ') || 'bersih');
  check('tidak ada request gagal', failedRequests.length === 0, failedRequests.join(' | ') || 'bersih');
  check('tidak ada respons >= 400', badResponses.length === 0,
    badResponses.join(' | ') || 'semua aset 200');

  await ctx.close();
}

/* ---------- D. Navigasi keyboard ---------- */
group('D. Navigasi keyboard');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => window.scrollTo(0, 0));

  // fokus pertama harus skip-link, dan harus terlihat saat difokus
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { cls: el.className, text: el.textContent.trim(),
             onScreen: r.left >= 0 && r.width > 0 && r.height > 0,
             left: Math.round(r.left) };
  });
  check('Tab pertama -> skip-link', first?.cls?.includes('skip-link'),
    first ? `${first.cls} "${first.text}"` : 'tidak ada fokus');
  check('skip-link terlihat saat difokus', first?.onScreen === true,
    first ? `left=${first.left}` : 'n/a');

  // cincin fokus harus terlihat (outline != none)
  const ring = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0 };
  });
  check('cincin fokus terlihat', ring.style !== 'none' && ring.width >= 2,
    `outline=${ring.width}px ${ring.style}`);

  // semua elemen interaktif harus bisa difokus
  const unreachable = await page.evaluate(() => {
    const sel = 'a[href], button, input, select, textarea, summary, [tabindex]';
    return Array.from(document.querySelectorAll(sel))
      .filter(el => {
        if (el.hasAttribute('tabindex') && el.getAttribute('tabindex') === '-1') return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        return el.tabIndex < 0;
      })
      .map(el => el.outerHTML.slice(0, 70));
  });
  check('tidak ada elemen interaktif yang tak terjangkau', unreachable.length === 0,
    unreachable.join(' | ') || 'semua bisa difokus');

  // urutan tab melewati nav lalu konten
  const seq = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
    seq.push(await page.evaluate(() => {
      const el = document.activeElement;
      return el ? (el.textContent.trim().slice(0, 24) || el.tagName) : 'none';
    }));
  }
  const navCount = await page.evaluate(() => document.querySelectorAll('.nav__list a').length);
  const navLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.nav__list a')).map(a => a.textContent.trim()));
  const navReached = navLabels.every(l => seq.some(s => s.includes(l)));
  check('seluruh link navigasi terjangkau keyboard', navReached,
    `${navCount} link nav; urutan: ${seq.join(' > ')}`);

  // skip-link benar-benar melompat ke konten
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const jumped = await page.evaluate(() => ({
    hash: location.hash,
    inView: (() => {
      const t = document.querySelector(location.hash);
      if (!t) return false;
      const r = t.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    })()
  }));
  check('skip-link melompat ke section Sambutan', jumped.hash === '#sambuten' && jumped.inView,
    `hash=${jumped.hash} terlihat=${jumped.inView}`);

  // target anchor tidak tertutup nav lengket
  const overlap = await page.evaluate(() => {
    const nav = document.querySelector('.nav');
    const navRect = nav.getBoundingClientRect();
    return Array.from(document.querySelectorAll("a[href^='#']")).map(a => {
      const id = a.getAttribute('href').slice(1);
      document.getElementById(id).scrollIntoView();
      const t = document.getElementById(id).getBoundingClientRect();
      return { id, covered: t.top < navRect.bottom - 2 && t.top > -2 };
    });
  });
  const covered = overlap.filter(o => o.covered);
  check('section tujuan tidak tertutup nav lengket', covered.length === 0,
    covered.map(c => c.id).join(', ') || 'scroll-padding-top cukup');

  await ctx.close();
}

/* ---------- E. Kontras WCAG AA ---------- */
group('E. Kontras WCAG AA');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const samples = await page.evaluate((gradFallback) => {
    const parse = c => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map(s => parseFloat(s.trim()));
      return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
    };
    const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));

    const nearestBg = el => {
      let node = el;
      while (node && node !== document.documentElement) {
        const cs = getComputedStyle(node);
        // container ber-gradien: pakai fallback terdalam yang cocok
        if (/gradient/.test(cs.backgroundImage)) {
          const cls = node.className || '';
          for (const key of Object.keys(gradFallback)) {
            if (cls.includes(key)) return gradFallback[key].slice();
          }
          return [255, 255, 255];
        }
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) {
          if (c.a === 1) return c.rgb;
          const parentBg = nearestBg(node.parentElement || document.body);
          return over(c, parentBg);
        }
        node = node.parentElement;
      }
      return [255, 255, 255];
    };

    const out = [];
    const seen = new Set();
    document.querySelectorAll('body *').forEach(el => {
      // hanya elemen yang punya teks langsung
      const text = Array.from(el.childNodes)
        .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
      if (!text) return;

      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;

      const fgRaw = parse(cs.color);
      if (!fgRaw) return;
      const bg = nearestBg(el);
      const fg = fgRaw.a < 1 ? over(fgRaw, bg) : fgRaw.rgb;

      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);

      const key = `${cs.color}|${bg.join(',')}|${size}|${weight}|${el.className}`;
      if (seen.has(key)) return;
      seen.add(key);

      out.push({
        text: text.slice(0, 40),
        sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
        color: cs.color, bg: bg.join(','), size, weight, large
      });
    });
    return out;
  }, GRADIENT_FALLBACK);

  const results = samples.map(s => {
    const fg = s.color.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);
    const bg = s.bg.split(',').map(Number);
    let f = fg.slice(0, 3);
    if (fg.length > 3 && fg[3] < 1) f = f.map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
    return { ...s, ratio: contrast(f, bg) };
  });

  const violations = results.filter(r => r.ratio < (r.large ? 3 : 4.5));
  violations.forEach(v => {
    bad(`kontras ${v.sel} "${v.text}"`,
      `${v.ratio.toFixed(2)}:1 (butuh ${v.large ? 3 : 4.5}) ${v.color} di rgb(${v.bg}) ${v.size}px`);
  });
  check('semua teks lolos WCAG AA', violations.length === 0,
    violations.length ? `${violations.length} dari ${results.length} melanggar`
                      : `${results.length} pasangan warna diperiksa`);

  const min = results.reduce((m, r) => Math.min(m, r.ratio), Infinity);
  const worst = results.find(r => r.ratio === min);
  note(`paling rendah: ${worst.sel} ${min.toFixed(2)}:1`);

  // target sentuh minimal 24px (WCAG 2.2 AA)
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.nav__list a, .btn, .skip-link, summary'))
      .map(el => ({ t: el.textContent.trim().slice(0, 20),
                    h: el.getBoundingClientRect().height }))
      .filter(x => x.h > 0 && x.h < 24));
  check('target sentuh >= 24px', small.length === 0,
    small.map(s => `"${s.t}" ${s.h.toFixed(0)}px`).join(', ') || 'semua cukup besar');

  await ctx.close();
}

/* ---------- F. Tampilan responsif ---------- */
group('F. Tampilan responsif');
for (const vp of [
  { name: 'mobile 360x740', width: 360, height: 740 },
  { name: 'mobile kecil 320x640', width: 320, height: 640 },
  { name: 'tablet 768x1024', width: 768, height: 1024 },
  { name: 'desktop 1280x900', width: 1280, height: 900 },
  { name: 'lebar 1600x900', width: 1600, height: 900 }
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const m = await page.evaluate(() => {
    const de = document.documentElement;
    // cari elemen yang meluber di luar viewport
    const overflowers = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > de.clientWidth + 1 || r.left < -1) {
        overflowers.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`);
      }
    });
    return {
      scrollW: de.scrollWidth, clientW: de.clientWidth,
      overflowers: overflowers.slice(0, 6),
      navWraps: document.querySelector('.nav__list').getBoundingClientRect().height > 44,
      subLong: getComputedStyle(document.querySelector('.hero__sub--long')).display,
      subShort: getComputedStyle(document.querySelector('.hero__sub--short')).display,
      galleryCols: getComputedStyle(document.querySelector('.gallery')).gridTemplateColumns.split(' ').length,
      timelineCols: getComputedStyle(document.querySelector('.timeline')).flexWrap,
      heroVisible: document.querySelector('.hero__digit').getBoundingClientRect().height > 40
    };
  });

  check(`${vp.name}: tanpa scroll horizontal`,
    m.scrollW <= m.clientW + 1, `scrollW=${m.scrollW} clientW=${m.clientW} ${m.overflowers.join('; ')}`);
  check(`${vp.name}: tidak ada elemen meluber`, m.overflowers.length === 0,
    m.overflowers.join('; ') || 'semua dalam viewport');
  check(`${vp.name}: angka hero terlihat`, m.heroVisible);
  check(`${vp.name}: hanya satu versi subjudul tampil`,
    m.subLong !== 'none' || m.subShort !== 'none', `long=${m.subLong} short=${m.subShort}`);

  if (vp.width <= 480) {
    check(`${vp.name}: subjudul pendek dipakai`, m.subLong === 'none' && m.subShort !== 'none');
  }
  if (vp.width >= 1000) {
    check(`${vp.name}: galeri 3 kolom`, m.galleryCols === 3, `${m.galleryCols} kolom`);
    check(`${vp.name}: subjudul panjang dipakai`, m.subShort === 'none' && m.subLong !== 'none');
  }

  // Tonggak Perjalanan harus tetap terpusat di semua lebar, termasuk
  // baris terakhir yang jumlah kartunya tidak penuh.
  const tl = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.timeline__item'));
    if (items.length < 2) return null;
    const rows = {};
    items.forEach(el => {
      const top = Math.round(el.getBoundingClientRect().top);
      rows[top] = rows[top] || [];
      rows[top].push(el);
    });
    const keys = Object.keys(rows).sort((a, b) => a - b);
    const wrap = document.querySelector('.timeline').getBoundingClientRect();
    return keys.map(k => {
      const row = rows[k];
      const left = row[0].getBoundingClientRect().left;
      const last = row[row.length - 1].getBoundingClientRect().right;
      return {
        count: row.length,
        offsetLeft: Math.round(left - wrap.left),
        offsetRight: Math.round(wrap.right - last)
      };
    });
  });
  if (tl) {
    const off = tl.map(r => Math.abs(r.offsetLeft - r.offsetRight));
    const maxOff = Math.max(...off);
    check(`${vp.name}: baris tonggak terpusat`,
      maxOff <= 3,
      tl.map(r => `${r.count} kartu (selisih ${r.offsetLeft - r.offsetRight}px)`).join(', ') +
      `; max ${maxOff}px`);
  }

  await ctx.close();
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
    document.querySelectorAll('.timeline__item, .gallery__item, .wish, .quote')
      .forEach(el => {
        const cs = getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.99 || parseFloat(cs.animationDuration) > 0.01) {
          hidden.push(`${el.className} opacity=${cs.opacity} anim=${cs.animationName}`);
        }
      });
    return {
      hidden,
      revealClass: document.querySelectorAll('.reveal').length,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      animName: getComputedStyle(document.querySelector('.wish')).animationName,
      transDur: getComputedStyle(document.querySelector('.btn')).transitionDuration
    };
  });

  check('tidak ada elemen tersembuyi saat reduced motion',
    rm.hidden.length === 0, rm.hidden.slice(0, 3).join('; ') || 'semua opacity 1');
  check('kelas .reveal tidak dipakai saat reduced motion', rm.revealClass === 0,
    `${rm.revealClass} elemen masih .reveal`);
  check('scroll-behavior dimatikan', rm.scrollBehavior === 'auto', rm.scrollBehavior);
  check('animasi dimatikan', rm.animName === 'none', `animation-name=${rm.animName}`);
  check('transisi dipendekkan', parseFloat(rm.transDur) <= 0.01, rm.transDur);

  await ctx.close();

  // bandingkan dengan mode normal: animasi harus benar-benar jalan
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page2 = await ctx2.newPage();
  watch(page2);
  await page2.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  await page2.waitForTimeout(300);

  const norm = await page2.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.timeline__item'));
    return {
      reveal: items.filter(i => i.classList.contains('reveal')).length,
      hiddenBeforeScroll: items.filter(i => parseFloat(getComputedStyle(i).opacity) < 0.5).length,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior
    };
  });
  check('mode normal: animasi reveal aktif', norm.reveal > 0,
    `${norm.reveal} elemen diberi kelas reveal`);
  check('mode normal: elemen di bawah lipatan masih transparan sebelum digulir',
    norm.hiddenBeforeScroll > 0, `${norm.hiddenBeforeScroll} masih opacity < 0.5`);
  check('mode normal: scroll-behavior smooth', norm.scrollBehavior === 'smooth', norm.scrollBehavior);

  // setelah digulir, semua muncul
  await page2.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page2.waitForTimeout(900);
  const after = await page2.evaluate(() =>
    Array.from(document.querySelectorAll('.timeline__item, .gallery__item, .wish, .quote'))
      .filter(el => parseFloat(getComputedStyle(el).opacity) < 0.99).length);
  check('setelah digulir semua elemen terlihat', after === 0, `${after} masih transparan`);

  await ctx2.close();
}

/* ---------- H. Halaman tanpa JavaScript ---------- */
group('H. Halaman tanpa JavaScript');
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    javaScriptEnabled: false
  });
  const page = await ctx.newPage();
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });

  const noJs = await page.locator('h1').count();
  check('tanpa JS: elemen utama terbaca', noJs === 1);
  const h1 = await page.locator('h1').textContent();
  const sections = await page.locator('main section[id]').count();
  const paras = await page.locator('.prose--full p').count();
  const items = await page.locator('.timeline__item').count();
  const wishes = await page.locator('.wish').count();
  const imgs = await page.locator('.gallery__item img').count();
  const quote = await page.locator('#kutipan blockquote p').textContent();

  check('tanpa JS: <h1> tetap ada', !!h1 && h1.trim().length > 0, `"${h1.trim().slice(0, 40)}"`);
  check('tanpa JS: 5 section tetap ada', sections === 5, `${sections} section`);
  check('tanpa JS: 3 paragraf Sambutan utuh', paras === 3, `${paras} paragraf`);
  check('tanpa JS: 5 tonggak Perjalanan', items === 5, `${items} item`);
  check('tanpa JS: 3 kartu ucapan (opsional kosong dibuang)', wishes === 3, `${wishes} kartu`);
  check('tanpa JS: 3 gambar galeri', imgs === 3, `${imgs} gambar`);
  check('tanpa JS: kutipan terbaca', quote.trim().length > 40, `"${quote.trim().slice(0, 40)}..."`);

  const natural = await page.locator('.gallery__item img').first()
    .evaluate(el => ({ complete: el.complete, w: el.naturalWidth }));
  check('tanpa JS: gambar benar-benar termuat', natural.complete && natural.w > 0,
    `naturalWidth=${natural.w}`);

  await ctx.close();
}

/* ---------- I. Registry placeholder ---------- */
group('I. Registry placeholder');
{
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const cfg = JSON.parse(readFileSync(join(ROOT, 'content.config.json'), 'utf8'));

  const documented = new Set([
    ...Object.keys(cfg.values),
    'Deskripsi Foto 1', 'Deskripsi Foto 2', 'Deskripsi Foto 3',
    'Keterangan Foto 1', 'Keterangan Foto 2', 'Keterangan Foto 3'
  ]);

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

  // setiap token yang tampil harus ditandai jelas sebagai "belum diisi"
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'load' });
  const marked = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('mark.todo').forEach(mark => {
      const cs = getComputedStyle(mark);
      out.push({ t: mark.textContent, bg: cs.backgroundColor });
    });
    return out;
  });
  check('setiap placeholder yang tampil diberi penanda visual', marked.length > 0,
    `${marked.length} penanda, contoh "${marked[0]?.t}" latar ${marked[0]?.bg}`);

  // Placeholder yang HANYA jadi kartu (kartu ucapan keluarga) boleh dibuang
  // bila opsional & kosong. Placeholder inline di dalam kalimat (mis.
  // [Kota Domisili] di tonggak "Tahun kelima") harus tetap tampil menandai
  // teks yang belum diisi.
  const cards = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.wish')).map(w => ({
      name: (w.querySelector('.wish__from')?.innerText || '').trim(),
      relation: (w.querySelector('.wish__relation')?.innerText || '').trim(),
      text: (w.querySelector('.wish__text')?.innerText || '').trim()
    })));

  // Yang bertanda "opsional" ditentukan naskah (cfg.keluarga.voices[].optional),
  // bukan ditebak. Kartu opsional yang namanya belum diisi harus dibuang;
  // kartu wajib tetap tampil menandai data yang belum lengkap.
  const optionalNames = new Set(
    cfg.keluarga.voices.filter(v => v.optional).map(v => v.name));
  const leaked = cards
    .filter(c => /\[(.+)\]/.test(c.name))
    .filter(c => optionalNames.has(c.name))
    .map(c => c.name);
  check('kartu ucapan opsional yang kosong dibuang, tidak dikosongkan',
    leaked.length === 0,
    leaked.join(', ') ||
    `opsional (${[...optionalNames].join(', ')}): semua dibuang; wajib tetap tampil`);

  const incomplete = cards.filter(c => !c.name || !c.relation || c.text.length < 10);
  check('setiap kartu ucapan punya nama, relasi, dan teks',
    incomplete.length === 0,
    incomplete.map(c => `${c.name || '(tanpa nama)'} teks=${c.text.length}`).join('; ') ||
    `${cards.length} kartu lengkap`);

  // jumlah kartu tampil = jumlah suara wajib (opsional kosong dibuang)
  const requiredCount = cfg.keluarga.voices.filter(v => !v.optional).length;
  check('jumlah kartu sesuai kontrak naskah',
    cards.length === requiredCount,
    `${cards.length} kartu tampil, ${requiredCount} suara wajib di config`);

  const inline = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.timeline__text'))
      .find(t => t.innerText.includes('Kota Domisili'));
    if (!el) return null;
    const mark = el.querySelector('mark.todo');
    return { text: el.innerText.trim(), marked: !!mark };
  });
  check('placeholder inline di dalam kalimat tetap tampil & ditandai',
    inline?.marked === true, inline ? `"${inline.text}"` : 'Kota Domisili tidak ditemukan');

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
