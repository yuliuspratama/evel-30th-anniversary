# evel-30th-anniversary

Situs kartu ucapan satu halaman dari seorang anak (Yuli) untuk Papa &
Mama — merayakan tiga puluh tahun pernikahan mereka sejak
5 Oktober 1996, dengan lagu "Mutiara Cinta Kita" yang mengalun saat
situs dibuka.

HTML, CSS, dan JavaScript murni — tanpa backend, tanpa dependensi
runtime, tanpa build step untuk menyajikan situs.

## Konsep

Kartu ucapan biasa dari anak ke orang tua:

- **Satu anak (Yuli)** — tidak ada ucapan dari anggota keluarga lain.
- **Tanpa cerita perjalanan** — anak tidak menceritakan hal yang tidak
  ia ketahui tentang pernikahan orang tuanya. Naskahnya jujur: "aku
  tidak hadir di awal cerita kalian... aku tidak akan berpura-pura
  tahu."
- **Lagu** "Mutiara Cinta Kita" berputar saat situs dibuka (autoplay
  dengan fallback interaksi pertama bila browser memblokir), lengkap
  dengan **lirik** 8 stanza.

## Struktur

| Berkas                    | Peran                                                |
| -------------------------- | ---------------------------------------------------- |
| `content.config.json`      | SATU-SATUNYA sumber naskah & nilai                   |
| `tools/build-content.mjs`  | merakit `index.html` + `assets/js/config.js`         |
| `assets/css/style.css`     | seluruh tampilan                                     |
| `assets/js/main.js`        | pemutar lagu, token, reveal, scroll-spy              |
| `assets/audio/`            | lagu (mp3)                                           |
| `tools/`                   | build + server statis + lint teks                    |
| `tests/`                   | rangkaian uji (Chromium via playwright-core)         |

## Alur kerja

1. Edit `content.config.json`.
2. Jalankan `node tools/build-content.mjs`.
3. Refresh browser (atau `node tools/static-server.mjs . 8899`).

## Menjalankan pengujian

    bash tests/run-tests.sh

Enam rangkaian, semuanya memakai Chromium sungguhan:

| Rangkaian            | Cakupan                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `build-content.mjs`  | merakit ulang index.html + config.js dari config                          |
| `lint-text.mjs`      | karakter asing & kebocoran istilah teknis ditolak                         |
| `og-preview.mjs`     | kartu OG dirender sungguhan; teks tidak terpotong                         |
| `ui.test.mjs`        | 70+ cek: semantik, kontras WCAG, 4 viewport, reduced-motion, tanpa-JS, audio player, autoplay, kontrak POV anak (tanpa "adik"/"kucing"/"pindah kota") |
| `filled.test.mjs`    | bukti config terpusat: ganti nilai — halaman ikut berubah; skenario audio gagal |
| `shots.mjs`          | tangkapan layar tiap section untuk pemeriksaan mata                       |

Butuh `playwright-core` (ada di `tests/node_modules/`, tidak di-commit) dan
Chromium di `/usr/bin/chromium`. Kalau `tests/node_modules/` belum ada:

    cd tests && npm ci

Satu rangkaian **tidak** ada di `run-tests.sh`: `tests/live-check.mjs`. Ia
menguji URL `github.io/<repo>/` yang sudah daring, untuk membuktikan aset
memuat di subpath — kondisi yang tidak bisa dibuktikan server lokal.
Termasuk memverifikasi file lagu tersaji (200, `audio/mp3`). Jalankan
setelah publish:

    node tests/live-check.mjs

## Perilaku bila JavaScript mati

Seluruh naskah sudah ada di `index.html`, jadi halaman tetap lengkap dan
terbaca. Yang tidak aktif: substitusi token runtime, autoplay lagu,
animasi muncul saat digulir, dan penanda section aktif. Tombol player
tetap tampil tapi tidak berfungsi — naskah kartu tetap utuh tanpa itu.

## Mengganti/menambah lagu

1. Taruh file mp3 di `assets/audio/`.
2. Ubah `settings.audio.src` di `content.config.json`.
3. Bangun ulang: `node tools/build-content.mjs`.

Perilaku pemutaran:

- Saat halaman dibuka, `main.js` mencoba autoplay.
- Bila kebijakan browser memblokir, lagu mulai otomatis pada interaksi
  pertama (klik/gulir/sentuh/tombol apa pun).
- Tombol di bilah player menjeda/melanjutkan; lagu berputar berulang
  (loop).

## Lirik

Lirik lengkap "Mutiara Cinta Kita" tersimpan di
`content.config.json` -> `lirik.sections` (8 stanza: Intro, Verse 1,
Pre-Chorus, Chorus, Verse 2, Chorus, Bridge, Outro) dan dirender
sebagai teks utuh yang bisa dibaca sambil mendengarkan.

## Aksesibilitas

- Satu `<h1>`, lalu `<h2>` per section, urutan heading tidak melompat
- `lang="id-ID"`, `<title>` <= 70 karakter
- Skip-link, cincin fokus 3px yang terlihat di setiap latar
- Semua pasangan warna teks/latar diuji WCAG AA dari DOM sungguhan
- `prefers-reduced-motion: reduce` mematikan animasi, transisi, dan scroll halus

## Deploy ke GitHub Pages

Situsnya sudah daring:

    https://yuliuspratama.github.io/evel-30th-anniversary/

Tidak ada build step, tidak ada Jekyll, dan semua path aset relatif
sehingga aman pada URL subpath repository. GitHub Pages menyajikan
branch `main` apa adanya (berkas `.nojekyll` mematikan pemrosesan
Jekyll). Panduan lengkap ada di **[DEPLOY.md](DEPLOY.md)**.

## Batasan yang perlu diketahui

- Autoplay dengan suara penuh bergantung kebijakan browser; di
  sebagian browser lagu mulai setelah interaksi pertama.
- Kutipan adalah teks orisinal dari lirik lagu, untuk halaman ini.
