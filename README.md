# evel-30th-anniversary

Situs ucapan satu halaman untuk peringatan 30 tahun pernikahan.
HTML, CSS, dan JavaScript murni tanpa backend dan tanpa dependensi.

Project workspace — auto-sync ke GitHub private repo
`yuliuspratama/evel-30th-anniversary-hermes`.

## Struktur

    index.html              seluruh isi halaman (baca tanpa JS)
    assets/css/style.css    gaya, responsif, hormat reduced-motion
    assets/js/config.js     SATU-SATUNYA tempat mengganti teks & data
    assets/js/main.js       pengikatan config, hitung mundur, animasi
    assets/img/*.svg        ilustrasi bawaan (SVG asli proyek ini)

## Cara mengganti isi

Buka `assets/js/config.js` dan ubah nilainya. Tidak perlu build,
cukup refresh browser.

| Kunci               | Ganti dengan                                 |
| ------------------- | -------------------------------------------- |
| `partnerB`          | nama pasangan kedua                          |
| `weddingDate`       | tanggal pernikahan, mis. "12 Mei 1996"        |
| `anniversaryDate`   | tanggal ulang tahun, mis. "12 Mei 2026"       |
| `anniversaryNumber` | angka di hero, default "30"                  |
| `timeline`          | tahun dan isi kronologi                      |
| `gallery`           | `src` foto asli + `alt` + `caption`           |
| `familyWishes`      | ucapan keluarga                              |
| `quotes`            | kutipan                                      |
| `countdownTarget`   | `YYYY-MM-DD` untuk mengaktifkan hitung mundur |

Nilai dalam kurung siku `[ ]` adalah placeholder yang wajib diganti:

    [Nama Pasangan]
    [Tanggal Pernikahan]
    [Tanggal Ulang Tahun]

## Mengganti foto

Letakkan foto di `assets/img/`, lalu arahkan `gallery` di `config.js`:

    { src: "assets/img/foto-keluarga-1.jpg", alt: "Evel dan ...", caption: "..." }

`alt` wajib diisi agar tetap ramah pembaca layar.

## Menjalankan secara lokal

    python3 -m http.server 8899

Lalu buka http://127.0.0.1:8899

## Deploy ke GitHub Pages

Tidak ada build step. Repository dapat disajikan apa adanya melalui
GitHub Pages, dan semua path aset bersifat relatif sehingga aman pada
URL subpath repository.

## Perilaku bila JavaScript mati

Seluruh isi sudah ada di `index.html`. Mematikan JavaScript tidak
menghilangkan teks; hanya hitung mundur, animasi masuk layar, dan
scroll-spy yang tidak aktif.