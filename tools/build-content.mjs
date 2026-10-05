#!/usr/bin/env node
/* =====================================================================
   build-content.mjs — pembuat index.html dari content.config.json
   ---------------------------------------------------------------------
   content.config.json adalah SATU-SATUNYA sumber naskah & nilai.
   File ini merakit index.html dan assets/js/config.js dari sumber itu.

   Jalankan setelah mengubah content.config.json:
       node tools/build-content.mjs

   index.html adalah BERKAS HASIL GENERASI. Jangan menyunting langsung;
   edit content.config.json lalu bangun ulang. Header pada index.html
   yang dihasilkan akan mengulang peringatan ini.

   Tanpa dependensi: hanya modul bawaan Node (fs, path).
   ===================================================================== */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CFG_PATH = join(ROOT, 'content.config.json');

const cfg = JSON.parse(readFileSync(CFG_PATH, 'utf8'));

/* ---------- 1. Registry nilai ---------- */
const VALUES = cfg.values || {};
const SET = cfg.settings || {};

/** Daftar token yang sah. Selain daftar ini, token apa pun = bug. */
const DOCUMENTED_TOKENS = new Set([
  ...Object.keys(VALUES),
  'Deskripsi Foto 1', 'Deskripsi Foto 2', 'Deskripsi Foto 3',
  'Keterangan Foto 1', 'Keterangan Foto 2', 'Keterangan Foto 3'
]);

/* Token opsional: dibuang seluruh kartunya bila belum diisi, sesuai
   kontrak naskah. Token wajib tetap tampil agar jelas belum diisi. */
const OPTIONAL_TOKENS = new Set([
  'Kota Domisili', 'Nama Anak 1', 'Nama Anak 2', 'Nama Anak 3',
  'Nama Orang Tua', 'Nama Keponakan', 'Nama Penyusun'
]);

const TOKEN_RE = /\[([A-Za-z][A-Za-z0-9 .&-]{2,40})\]/g;

function isUnresolved(text) {
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(String(text ?? '')))) {
    const name = m[1].trim();
    if (VALUES[name] !== undefined && VALUES[name].trim() === m[0]) return name;
  }
  return null;
}

/** Ganti [Token] dengan nilainya; token yang belum diisi dibiarkan. */
function fill(text) {
  return String(text ?? '').replace(TOKEN_RE, (whole, name) => {
    const key = name.trim();
    return VALUES[key] !== undefined ? VALUES[key] : whole;
  });
}

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- 2. Laporan placeholder ---------- */
const usedTokens = new Set();
function scanTokens(html) {
  let m;
  const re = new RegExp(TOKEN_RE.source, 'g');
  while ((m = re.exec(html))) usedTokens.add(m[1].trim());
  return html;
}

/** Tandai token yang belum diisi agar terlihat jelas sebagai "belum diisi". */
function mark(text) {
  const filled = fill(text);
  if (isUnresolved(filled) === null) return esc(filled);
  return esc(filled).replace(TOKEN_RE,
    (whole) => `<mark class="todo" title="Belum diisi — ganti di content.config.json">${whole}</mark>`);
}

/* ---------- 3. Galeri: pakai foto bila ada, ilustrasi bila belum ----------
   Aturan alt & caption mengikuti kontrak naskah:
     - alt WAJIB terisi. Kalau nama fotonya sudah terisi tapi deskripsi
       belum, tampilkan placeholder terdaftar (menandai pekerjaan tersisa)
       dan beri peringatan saat build.
     - caption BOLEH kosong. Kalau belum diisi, paragrafnya dihapus
       sekalian — jangan sisakan placeholder kosong di halaman.
   Deskripsi & keterangan foto dibaca dari registry `values` yang sama,
   jadi bisa diisi terpusat. */
function resolvePhotoText(text) {
  const filled = fill(text);
  return isUnresolved(filled) === null ? filled : null;
}

const photoWarnings = [];

function buildGallery() {
  const items = (cfg.galeri?.items || []).map((it, i) => {
    const photoExists = it.photo && existsSync(join(ROOT, it.photo));
    const src = photoExists ? it.photo : it.fallback;

    let alt;
    if (photoExists) {
      alt = resolvePhotoText(it.photoAltToken);
      if (alt === null) {
        // alt wajib — tampilkan token terdaftar, jangan diamkan.
        alt = esc(fill(it.photoAltToken)).replace(TOKEN_RE,
          (whole) => `<mark class="todo" title="Alt text foto wajib diisi — content.config.json">${whole}</mark>`);
        photoWarnings.push(`${it.photo}: alt belum diisi`);
      }
    } else {
      alt = it.alt; // ilustrasi default: alt menjelaskan ilustrasi itu
    }

    const captionRaw = photoExists ? it.photoCaptionToken : it.caption;
    const caption = resolvePhotoText(captionRaw);

    return `        <li class="gallery__item">
          <img src="${esc(src)}" alt="${esc(alt)}" width="640" height="480"
               loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"
               data-fallback="${esc(it.fallback)}" data-photo="${esc(it.photo)}">
          ${caption ? `<p class="gallery__caption">${mark(caption)}</p>` : ''}
        </li>`;
  });
  return items.join('\n');
}

/* ---------- 4. Kartu ucapan keluarga ---------- */
function buildWishes() {
  const voices = cfg.keluarga?.voices || [];
  const kept = [];
  for (const v of voices) {
    const unresolvedName = isUnresolved(fill(v.name));
    if (unresolvedName && v.optional && OPTIONAL_TOKENS.has(unresolvedName)) {
      continue; // opsional & belum diisi -> buang kartunya, jangan sisakan placeholder
    }
    kept.push(v);
  }
  return kept.map(v => `        <li class="wish">
          <p class="wish__from">${mark(v.name)}</p>
          <p class="wish__relation">${esc(v.relation)}</p>
          <p class="wish__text">${mark(v.text)}</p>
        </li>`).join('\n');
}

/* ---------- 5. Timeline ---------- */
function buildTimeline() {
  return (cfg.perjalanan?.items || []).map((it, i) => `        <li class="timeline__item">
          <p class="timeline__step" aria-hidden="true">${i + 1}</p>
          <h3 class="timeline__title">${mark(it.label)}</h3>
          <p class="timeline__text">${mark(it.text)}</p>
        </li>`).join('\n');
}

/* ---------- 6. Navigasi ---------- */
function buildNav() {
  return (cfg.nav || []).map(n =>
    `      <li><a href="${esc(n.target)}">${esc(n.label)}</a></li>`).join('\n');
}

/* ---------- 7. Rakit halaman ---------- */
const M = cfg.meta, H = cfg.hero, S = cfg.sambutan, P = cfg.perjalanan;
const G = cfg.galeri, K = cfg.keluarga, Q = cfg.kutipan, F = cfg.footer;

const title = fill(M.title);
const description = fill(M.description);

const html = `<!DOCTYPE html>
<!--
  BERKAS HASIL GENERASI — jangan disunting langsung.
  Sumber tunggal: content.config.json
  Bangun ulang:  node tools/build-content.mjs
-->
<html lang="${esc(SET.language || 'id-ID')}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="${esc(SET.themeColor || '#6f1a26')}">
<meta name="author" content="${esc(VALUES['Nama Penyusun'] || '')}">
<meta property="og:type" content="website">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="${esc(fill(M.ogTitle))}">
<meta property="og:description" content="${esc(fill(M.ogDescription))}">
<meta property="og:image" content="assets/img/og-cover.svg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<a class="skip-link" href="#sambuten">Lompat ke isi utama</a>

<!-- ============ HERO ============ -->
<header class="hero" id="atas">
  <div class="hero__inner">
    <p class="hero__eyebrow">${mark(H.eyebrow)}</p>

    <h1 class="hero__title">${mark(H.h1)}</h1>

    <p class="hero__number">
      <span class="hero__digit">${esc(SET.anniversaryNumber)}</span>
      <span class="hero__unit">${esc(H.unit)}</span>
    </p>

    <p class="hero__sub hero__sub--long">${mark(H.subtitle)}</p>
    <p class="hero__sub hero__sub--short">${mark(H.subtitleShort)}</p>

    <p class="hero__date">
      <span class="hero__date-label">Perayaan</span>
      <span data-bind="celebrationDate">${mark(VALUES['Tanggal Perayaan'])}</span>
      <span aria-hidden="true">&middot;</span>
      <span data-bind="celebrationPlace">${mark(VALUES['Lokasi Perayaan'])}</span>
    </p>

    <a class="btn btn--primary" href="#sambuten">Baca Ucapan</a>
  </div>
</header>

<!-- ============ NAVIGASI ============ -->
<nav class="nav" aria-label="Navigasi utama">
  <ul class="nav__list">
${buildNav()}
  </ul>
</nav>

<main id="isi">

  <!-- ============ SAMBUTAN ============ -->
  <section class="section" id="${esc(S.id)}" aria-labelledby="h-sambuten">
    <div class="wrap">
      <h2 class="section__title" id="h-sambuten">${mark(S.heading)}</h2>

      <div class="prose prose--full">
${(S.paragraphs || []).map(p => `        <p>${mark(p)}</p>`).join('\n')}
      </div>

      <details class="prose-short">
        <summary>${mark(S.short.heading)}</summary>
        <div class="prose">
${(S.short?.paragraphs || []).map(p => `          <p>${mark(p)}</p>`).join('\n')}
        </div>
      </details>

      <div class="countdown" id="countdown" hidden>
        <p class="countdown__label">${mark(SET.countdownLabel || '')}</p>
        <p class="countdown__value">
          <span id="cd-days">0</span><span class="countdown__sep" aria-hidden="true">&middot;</span><span id="cd-hours">00</span><span class="countdown__sep" aria-hidden="true">&middot;</span><span id="cd-minutes">00</span>
        </p>
        <p class="countdown__hint">hari &middot; jam &middot; menit</p>
      </div>
    </div>
  </section>

  <!-- ============ PERJALANAN ============ -->
  <section class="section section--alt" id="${esc(P.id)}" aria-labelledby="h-perjalanan">
    <div class="wrap">
      <h2 class="section__title" id="h-perjalanan">${mark(P.heading)}</h2>
      <p class="section__lead">${mark(P.lead)}</p>
      <ol class="timeline">
${buildTimeline()}
      </ol>
    </div>
  </section>

  <!-- ============ GALERI ============ -->
  <section class="section" id="${esc(G.id)}" aria-labelledby="h-galeri">
    <div class="wrap">
      <h2 class="section__title" id="h-galeri">${mark(G.heading)}</h2>
      <p class="section__lead">${mark(G.lead)}</p>
      <ul class="gallery" id="gallery-list">
${buildGallery()}
      </ul>
    </div>
  </section>

  <!-- ============ UCAPAN KELUARGA ============ -->
  <section class="section section--alt" id="${esc(K.id)}" aria-labelledby="h-keluarga">
    <div class="wrap">
      <h2 class="section__title" id="h-keluarga">${mark(K.heading)}</h2>
      <p class="section__lead">${mark(K.lead)}</p>
      <ul class="wishes" id="wishes-list">
${buildWishes()}
      </ul>
    </div>
  </section>

  <!-- ============ KUTIPAN ============ -->
  <section class="section" id="${esc(Q.id)}" aria-labelledby="h-kutipan">
    <div class="wrap">
      <h2 class="section__title" id="h-kutipan">${mark(Q.heading)}</h2>
      <figure class="quote">
        <blockquote>
          <p>${mark(Q.blockquote)}</p>
        </blockquote>
        <figcaption><cite>${mark(Q.attribution)}</cite></figcaption>
      </figure>
    </div>
  </section>

</main>

<!-- ============ FOOTER ============ -->
<footer class="footer">
  <div class="wrap">
    <p class="footer__line1">${mark(F.line1)}</p>
    <p class="footer__line2">${mark(F.line2)}</p>
    <p class="footer__credit">${mark(F.credit)}</p>
  </div>
</footer>

<script src="assets/js/config.js"></script>
<script src="assets/js/main.js"></script>
</body>
</html>
`;

const out = scanTokens(html);

/* ---------- 8. Validasi ---------- */
const undocumented = [...usedTokens].filter(t => !DOCUMENTED_TOKENS.has(t));
const unresolved = [...usedTokens].filter(t =>
  VALUES[t] !== undefined && VALUES[t].trim() === `[${t}]`);

if (undocumented.length) {
  console.error('GAGAL — placeholder tanpa daftar: ' + undocumented.join(', '));
  process.exit(1);
}
if (/lorem ipsum/i.test(out)) {
  console.error('GAGAL — ditemukan "lorem ipsum"');
  process.exit(1);
}

writeFileSync(join(ROOT, 'index.html'), out, 'utf8');

/* ---------- 9. config.js (lapisan runtime) ---------- */
const runtime = `/* BERKAS HASIL GENERASI dari content.config.json.
   Hanya memuat PENGATURAN + registry nilai untuk main.js.
   Naskah halaman ada di index.html. Jalankan node tools/build-content.mjs
   setelah mengubah content.config.json. */
window.SITE_CONFIG = {
  settings: ${JSON.stringify(SET, null, 2).replace(/\n/g, '\n  ')},
  values: ${JSON.stringify(VALUES, null, 2).replace(/\n/g, '\n  ')},
  meta: {
    title: ${JSON.stringify(title)},
    description: ${JSON.stringify(description)},
    ogTitle: ${JSON.stringify(fill(M.ogTitle))},
    ogDescription: ${JSON.stringify(fill(M.ogDescription))}
  },
  documentedTokens: ${JSON.stringify([...DOCUMENTED_TOKENS])}
};
`;
writeFileSync(join(ROOT, 'assets/js/config.js'), runtime, 'utf8');

/* ---------- 10. Laporan ---------- */
console.log('index.html      : ' + out.length + ' byte, ' + (cfg.galeri?.items || []).length + ' foto, ' +
  (cfg.keluarga?.voices || []).length + ' ucapan');
console.log('placeholder     : ' + usedTokens.size + ' token terdaftar, ' +
  unresolved.length + ' belum diisi' + (unresolved.length ? ' -> ' + unresolved.join(', ') : ''));
console.log('tanpa daftar    : ' + (undocumented.length || 0));
if (photoWarnings.length) {
  console.log('\nPERINGATAN — foto asli terpasang tapi alt belum diisi:');
  photoWarnings.forEach(w => console.log('  ! ' + w));
}
console.log('OK');
