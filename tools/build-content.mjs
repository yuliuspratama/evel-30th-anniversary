#!/usr/bin/env node
/* =====================================================================
   build-content.mjs — pembuat index.html dari content.config.json
   ---------------------------------------------------------------------
   content.config.json adalah SATU-SATUNYA sumber naskah & nilai.
   Konsep situs: KARTU UCAPAN dari anak (Yuli) untuk Papa & Mama —
   30 tahun pernikahan, 1 anak, tanpa detail yang tidak diketahui anak.
   File ini merakit index.html dan assets/js/config.js.
   ===================================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const cfg = JSON.parse(readFileSync(join(ROOT, 'content.config.json'), 'utf8'));

/* ---------- 1. Registry nilai ---------- */
const VALUES = cfg.values || {};
const SET = cfg.settings || {};

/** Daftar token yang sah. Selain daftar ini, token apa pun = bug. */
const DOCUMENTED_TOKENS = new Set(Object.keys(VALUES));

const TOKEN_RE = /\[([A-Za-z][A-Za-z0-9 .&-]{2,40})\]/g;

/* ---------- 2. Substitusi token ---------- */
function fill(text) {
  return String(text ?? '').replace(TOKEN_RE, (whole, name) =>
    VALUES[name] !== undefined ? VALUES[name] : whole);
}

function isUnresolved(text) {
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(String(text ?? '')))) {
    const name = m[1].trim();
    if (VALUES[name] !== undefined && VALUES[name].trim() === m[0]) return name;
  }
  return null;
}

/** Ganti [Token] dengan nilainya; token yang belum diisi dibiarkan
    dan diberi penanda visual <mark class="todo">. */
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function mark(text) {
  const filled = fill(text);
  if (isUnresolved(filled) === null) return esc(filled);
  return esc(filled).replace(TOKEN_RE,
    (whole) => `<mark class="todo" title="Belum diisi — ganti di content.config.json">${whole}</mark>`);
}

/* ---------- 3. Lirik ---------- */
function buildLyrics() {
  const secs = (cfg.lirik?.sections) || [];
  return secs.map(s => {
    const lines = (s.lines || [])
      .map(l => `          <p class="lyric__line">${esc(l)}</p>`).join('\n');
    return `        <section class="lyric__stanza" data-label="${esc(s.label)}">
          <h3 class="lyric__label">${esc(s.label)}</h3>
${lines}
        </section>`;
  }).join('\n');
}

/* ---------- 4. Navigasi ---------- */
function buildNav() {
  return (cfg.nav || []).map(n =>
    `      <li><a href="${esc(n.target)}">${esc(n.label)}</a></li>`).join('\n');
}

/* ---------- 5. Rakit halaman ---------- */
const M = cfg.meta, H = cfg.hero, K = cfg.kartu, L = cfg.lirik, PN = cfg.pesan;
const AU = SET.audio || {};
const F = cfg.footer;

const SITE_URL = String(SET.siteUrl || '').trim().replace(/\/+$/, '');
const absolute = (rel) => SITE_URL ? `${SITE_URL}/${rel}` : rel;

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
<meta name="theme-color" content="${esc(SET.themeColor || '#7a1f2b')}">
<meta property="og:title" content="${esc(fill(M.ogTitle))}">
<meta property="og:description" content="${esc(fill(M.ogDescription))}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(absolute(''))}">
<meta property="og:image" content="${esc(absolute('assets/img/og-cover.png'))}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<a class="skip-link" href="#kartu">Lompat ke isi utama</a>

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

    <a class="btn btn--primary" href="#kartu">Buka Kartunya</a>
  </div>
</header>

<!-- ============ NAVIGASI ============ -->
<nav class="nav" aria-label="Navigasi utama">
  <ul class="nav__list">
${buildNav()}
  </ul>
</nav>

<main id="isi">

  <!-- ============ KARTU UCAPAN ============ -->
  <section class="section" id="${esc(K.id)}" aria-labelledby="h-kartu">
    <div class="wrap">
      <h2 class="section__title" id="h-kartu">${mark(K.heading)}</h2>
      <p class="section__lead">${mark(K.lead)}</p>

      <article class="card">
        <p class="card__salutation">${mark(K.salutation)}</p>
        <div class="prose prose--full">
${(K.paragraphs || []).map(p => `          <p>${mark(p)}</p>`).join('\n')}
        </div>
      </article>
    </div>
  </section>

  <!-- ============ LIRIK ============ -->
  <section class="section section--alt" id="${esc(L.id)}" aria-labelledby="h-lirik">
    <div class="wrap">
      <h2 class="section__title" id="h-lirik">${mark(L.heading)}</h2>
      <p class="section__lead">${mark(L.lead)}</p>

      <div class="lyrics" id="lyrics">
${buildLyrics()}
      </div>
    </div>
  </section>

  <!-- ============ PESAN PENUTUP ============ -->
  <section class="section" id="${esc(PN.id)}" aria-labelledby="h-pesan">
    <div class="wrap">
      <h2 class="section__title" id="h-pesan">${mark(PN.heading)}</h2>
      <p class="section__lead">${mark(PN.lead)}</p>

      <figure class="quote">
        <blockquote>
          <p>${mark(PN.blockquote)}</p>
        </blockquote>
        <figcaption><cite>${mark(PN.attribution)}</cite></figcaption>
      </figure>

      <p class="pesan__closing">${mark(PN.closing)}</p>
      <p class="pesan__closing2">${mark(PN.closing2)}</p>
    </div>
  </section>

</main>

<!-- ============ AUDIO: lagu mengalun saat situs dibuka ============ -->
<section class="player" aria-label="Pemutar lagu">
  <div class="wrap player__inner">
    <p class="player__meta">
      <span class="player__note">${esc(AU.title || 'Lagu')}</span>
      <span class="player__artist">— ${esc(AU.artist || '')}</span>
    </p>
    <button type="button" class="player__btn" id="audio-toggle"
      aria-pressed="false" aria-label="Putar lagu">
      <span class="player__icon player__icon--play" aria-hidden="true"></span>
      <span class="player__state">Putar lagu</span>
    </button>
    <audio id="bg-audio" src="${esc(AU.src || '')}" loop preload="auto"></audio>
  </div>
</section>

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

const out = html;

writeFileSync(join(ROOT, 'index.html'), out, 'utf8');

/* ---------- 6. config.js (lapisan runtime) ---------- */
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

/* ---------- 7. Laporan ---------- */
console.log('index.html      : ' + out.length + ' byte, ' +
  (cfg.lirik?.sections || []).length + ' stanza lirik');
console.log('audio           : ' + (AU.src || '(tidak ada)') +
  (AU.autostart ? ' [autostart]' : ' [manual]'));
console.log('OK');
