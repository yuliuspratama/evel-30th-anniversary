#!/usr/bin/env node
/* =====================================================================
   lint-text.mjs — cegah karakter asing yang tidak sengaja masuk
   ---------------------------------------------------------------------
   Naskah situs ini Bahasa Indonesia (huruf Latin). Skrip ini gagal bila
   ada karakter CJK/Cyrillic/Hangul yang tersesut, ATAU kata "null"/
   "undefined" yang bocor ke teks yang dilihat pengunjung.

   Jalankan: node tools/lint-text.mjs
   ===================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'screenshots', '.cache']);
const TEXT_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.md', '.sh', '.svg']);
const SELF = 'lint-text.mjs'; // berkas ini memang memuat kelas karakter

/* Aksen & simbol yang memang dipakai (Indonesian + tipografi umum).
  Termasuk U+0300-U+036F (tanda Gabung) — dipakai untuk memecah huruf
  beraksen bila diedit di editor tertentu, bukan huruf asing. */
const ALLOWED_NON_ASCII = new Set(
  '—–…‘’“”·×→≠≤≥°±§¶©®™'
);
const isAllowed = ch => {
  const c = ch.charCodeAt(0);
  if (ALLOWED_NON_ASCII.has(ch)) return true;
  if (c >= 0x0300 && c <= 0x036f) return true; // combining marks
  return false;
};

const SUSPECT = /[Ѐ-ӿ가-힯一-鿿぀-ヿ]/;

let files = 0;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { walk(full); continue; }
    if (!TEXT_EXT.has(extname(name))) continue;
    if (name === SELF) continue;
    files++;

    const text = readFileSync(full, 'utf8');
    text.split('\n').forEach((line, i) => {
      // lewati baris yang memang mendokumentasikan istilah teknis
      const isDoc = /\.(md)$/.test(name);

      const bad = [];
      for (const ch of line) {
        if (ch.charCodeAt(0) < 128) continue;
        if (isAllowed(ch)) continue;
        bad.push(ch);
      }
      if (bad.length) {
        problems.push(`${relative(ROOT, full)}:${i + 1}  karakter asing: ` +
          bad.map(c => `${JSON.stringify(c)} U+${c.charCodeAt(0).toString(16).toUpperCase()}`).join(', '));
      }
      if (SUSPECT.test(line) && !isDoc) {
        problems.push(`${relative(ROOT, full)}:${i + 1}  scripting system: ${line.trim().slice(0, 60)}`);
      }
    });
  }
}

walk(ROOT);

/* Istilah teknis yang tidak boleh muncul di TEKS YANG DILIHAT. Atribut
  title= pada mark.todo memang berisi petunjuk editor — itu disengaja
  dan tidak pernah tampil sebagai teks halaman, jadi dikecualikan. */
const PAGE_COPY = ['index.html'];
const BANNED_IN_PAGE = ['lorem ipsum', 'config.js', 'content.config.json', 'index.html',
  'undefined', 'NaN', '[object Object]'];

for (const f of PAGE_COPY) {
  const full = readFileSync(join(ROOT, f), 'utf8');
  // buang <head>, komentar, dan seluruh nilai atribut title=
  const body = (full.split('<body')[1] || '')
    .replace(/<!--[\s\S]*?-->/g, '')       // komentar
    .replace(/\stitle="[^"]*"/g, '')        // tooltip (petunjuk editor)
    .replace(/\sclass="[^"]*"/g, '')        // nama kelas
    .replace(/\sdata-[\w-]+="[^"]*"/g, '') // atribut data
    .replace(/<[^>]+>/g, ' ');              // tag -> spasi (sisakan teks)
  for (const word of BANNED_IN_PAGE) {
    if (body.includes(word)) {
      problems.push(`${f}: istilah "${word}" bocor ke teks halaman`);
    }
  }
}

console.log(`Diperiksa ${files} berkas teks.`);
if (problems.length) {
  console.log('\nMASALAH:');
  problems.forEach(p => console.log('  x ' + p));
  process.exit(1);
}
console.log('OK — tidak ada karakter asing atau kebocoran istilah.');
