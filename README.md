# evel-30th-anniversary

Situs ucapan satu halaman untuk peringatan 30 tahun pernikahan.
HTML, CSS, dan JavaScript murni — tanpa backend, tanpa dependensi runtime,
tanpa build step untuk menyajikan situs.

## Struktur

    content.config.json      SATU-SATUNYA sumber naskah & nilai yang dapat diganti
    tools/build-content.mjs  pembuat index.html dari content.config.json
    tools/lint-text.mjs      gagalkan karakter asing & kebocoran istilah teknis
    index.html              BERKAS HASIL GENERASI — jangan disunting langsung
    assets/css/style.css    gaya, responsif, hormat prefers-reduced-motion
    assets/js/config.js     hasil generasi: pengaturan + registry nilai untuk main.js
    assets/js/main.js       substitusi token, hitung mundur, fallback foto, reveal
    assets/img/*.svg        ilustrasi bawaan (SVG asli proyek ini, bebas hak)
    tools/static-server.mjs server statis untuk pratinjau & pengujian
    tests/                  rangkaian uji browser + tangkapan layar

## Mengubah isi — hanya satu file

Semua teks, nama, tanggal, foto, dan kutipan ada di
**`content.config.json`**. Setelah mengedit file itu, bangun ulang:

    node tools/build-content.mjs

Tidak ada edit manual ke `index.html`. Konsekuensinya: apa pun yang
tidak ada di `content.config.json` tidak bisa bocor ke halaman.

### Registry nilai

Bagian `values` memetakan nama token ke nilainya. Ada dua cara memakai:

| Cara                | Contoh                                    | Hasil                       |
| ------------------- | ----------------------------------------- | --------------------------- |
| Isi nilai aslinya   | `"Nama Pasangan": "Budi Santoso"`         | token hilang, teks jadi asli |
| Biarkan kosong      | `"Nama Pasangan": "[Nama Pasangan]"`       | token tampil ditandai kuning |

Placeholder yang sengaja dibiarkan tampil diberi latar kuning
(`.todo`) supaya jelas masih ada yang perlu diisi, dan `build-content.mjs`
mencetak daftar token yang belum terisi setiap kali dijalankan.

### Daftar placeholder

Semua placeholder ada di registry `values`. Placeholder yang tidak ada
di sana akan **menggagalkan build** — begitu juga `lorem ipsum`.

| Token                                     | Wajib? | Contoh                     |
| ----------------------------------------- | ------ | -------------------------- |
| `[Nama Pasangan]`                         | ya     | `Budi Santoso`             |
| `[Tanggal Pernikahan]`                    | ya     | `12 Juni 1996`             |
| `[Lokasi Pernikahan]`                     | ya     | `Gedung Serbaguna, Malang`  |
| `[Tanggal Perayaan]`                      | ya     | `8 Juni 2026`               |
| `[Lokasi Perayaan]`                       | ya     | `Kafe Reid, Malang`          |
| `[Nama Penyusun]`                         | ya     | `Keluarga Besar`            |
| `[Kota Domisili]`                         | opsional | `Malang`                 |
| `[Nama Anak 1]` `[Nama Anak 2]`           | ya     | `Alya`, `Rafi`              |
| `[Nama Anak 3]` `[Nama Keponakan]`        | opsional | `Nadia`, `Bagas`         |
| `[Nama Orang Tua]`                        | ya     | `Bapak Hendra & Ibu Sri`    |
| `[Deskripsi Foto 1..3]`                   | ya*    | `Budi dan partner di taman` |
| `[Keterangan Foto 1..3]`                  | tidak  | boleh dikosongkan           |

\* Alt text hanya wajib bila file foto aslinya sudah dipasang.

Ucapan keluarga yang ditandai `optional: true` di `config.keluarga.voices`
**ikut hilang** bila namanya belum diisi, supaya tidak ada kartu kosong.
Placeholder yang muncul di dalam kalimat (mis. `[Kota Domisili]`)
selalu tetap tampil menandai teks yang belum lengkap.

## Mengganti foto

1. Letakkan foto di `assets/foto-1.jpg` (atau nama lain, ubah di config).
2. Isi `Deskripsi Foto N` di registry `values` — **wajib**, alt tidak boleh kosong.
3. `Keterangan Foto N` boleh dikosongkan; paragraf caption-nya otomatis dihapus.
4. Jalankan `node tools/build-content.mjs`.

Selama file fotonya belum ada, galeri otomatis memakai ilustrasi SVG
bawaan yang alt-nya menjelaskan ilustrasi itu sendiri. Jika foto dipasang
lalu gagal dimuat (404), `main.js` mengembalikannya ke ilustrasi.

## Menjalankan secara lokal

    node tools/build-content.mjs        # bangun ulang setelah edit
    node tools/static-server.mjs . 8899 # buka http://127.0.0.1:8899

## Menjalankan pengujian

    bash tests/run-tests.sh

Lima rangkaian, semuanya memakai Chromium sungguhan:

| Rangkaian            | Cakupan                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `build-content.mjs`  | token tak dikenal / lorem ipsum ditolak; laporan placeholder kosong      |
| `lint-text.mjs`      | karakter asing (CJK/Cyrillic) & istilah teknis yang bocor ke teks halaman |
| `tests/ui.test.mjs`  | struktur, heading, alt, tautan, aset, konsol, keyboard, kontras WCAG AA, 5 viewport, reduced motion, tanpa-JS, registry |
| `tests/filled.test.mjs` | config berisi nilai nyata: judul, meta, hitung mundur, foto asli vs fallback, ketahanan konfigurasi rusak |
| `tests/shots.mjs`    | tangkapan layar ke `tests/screenshots/` untuk pemeriksaan visual         |

Butuh `playwright-core` (sudah ada di `tests/node_modules/`) dan Chromium
di `/usr/bin/chromium`.

## Perilaku bila JavaScript mati

Seluruh naskah sudah ada di `index.html`, jadi halaman tetap lengkap dan
terbaca. Yang tidak aktif: substitusi token runtime, hitung mundur,
animasi muncul saat digulir, dan penanda section aktif.

## Aksesibilitas

- Satu `<h1>`, lalu `<h2>` per section, urutan heading tidak melompat
- `lang="id-ID"`, `<title>` ≤ 60 karakter, meta description ≤ 155 karakter
- Skip-link, cincin fokus 3px yang terlihat di setiap latar, target sentuh ≥ 24px
- Semua pasangan warna teks/latar diuji WCAG AA dari DOM sungguhan
- `prefers-reduced-motion: reduce` mematikan animasi, transisi, dan scroll halus

## Deploy ke GitHub Pages

Tidak ada build step dan semua path aset relatif, sehingga aman pada URL
subpath repository. Detail langkah publikasi ada di kartu tersendiri.

## Batasan yang perlu diketahui

- Foto bawaan adalah **ilustrasi SVG**, bukan foto keluarga. Ganti lewat
  `content.config.json`.
- Nilai `[Nama Pasangan]` dll. masih berupa token sampai diisi — inilah
  disengaja, dan ditandai kuning di halaman.
- Kutipan adalah teks orisinal untuk halaman ini, bukan kutipan penulis lain.
