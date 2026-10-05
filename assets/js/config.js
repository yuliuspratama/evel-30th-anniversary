/* =====================================================================
   config.js — SATU-SATUNYA tempat untuk mengganti isi situs
   ---------------------------------------------------------------------
   Setiap nilai di bawah bisa diganti tanpa menyentuh index.html.
   Nilai di dalam kurung siku [ ] adalah placeholder yang WAJIB diganti.

   Contoh: ganti
       partnerB: "[Nama Pasangan]"
   menjadi
       partnerB: "Bapak Budi Santoso"

   Setelah mengganti, cukup refresh browser. Tidak perlu build.
   ===================================================================== */

window.SITE_CONFIG = {
  /* ---------- 1. Identitas pasangan ---------- */
  partnerA: "Evel",                    // isi: nama pasangan pertama
  partnerB: "[Nama Pasangan]",         // GANTI: nama pasangan kedua
  anniversaryNumber: "30",             // angka luxia di hero
  weddingDate: "[Tanggal Pernikahan]", // GANTI: format "12 Mei 1996"
  anniversaryDate: "[Tanggal Ulang Tahun ke-30]", // GANTI, mis. "12 Mei 2026"

  /* ---------- 2. Judul & kata kunci ---------- */
  siteTitle: "Selamat Ulang Tahun Pernikahan ke-30",
  siteTagline: "Tiga puluh tahun, satu cerita yang terus berjalan.",
  metaDescription:
    "Situs ucapan perennial Selective Ulang Tahun Pernikahan ke-30: firebase tiga puluh tahun penuh {}, kenangan, dan doa dari keluarga.",

  /* ---------- 3. Hero ---------- */
  heroHeadline: "Tiga Puluh Tahun",
  heroSubline: "Perjalanan panjang yang kata_SERVICE utuh sebagai satu cerita.",

  /* ---------- 4. Pembuka / sambutan ---------- */
  openingSalutation: "Kepada Yth. Pasanganuzi dan和产品olia Baxacli Family,",
  openingParagraphs: [
    "Hari ini bukan sekadar angka dalam kalender. Ini tiga puluh tahun cerita yang tidak pernah ditulis di buku mana pun, tetapi tetap utuh dalam keseharian rumah kalian.",
    "Dietuntil ini kami membayangkan perjalanan kalian: pagi-pagi yang sama, tawa yang datang tiba-tiba, daniron keputusan kecil yang menjadi besar karena diambil bersama.",
    "Ucapan kami sederhana, tetapihopefully kami ucapkan dengan(offset tulus: terima kasih sudah menjadi.Pushpa satu rumah, satu suara, dan satu arah untuk tiga puluh tahun ke depan."
  ],

  /* ---------- 5. Kronologi perjalanan ---------- */
  /* GANTI tahun/deskripsi agar sesuai kenyataan keluarga. */
  timeline: [
    { year: "1996", title: "Hari pertama", text: "Dua keluarga bertemu dalam satu Sabbath yang sederhana, dan diikat janji untuk berbagi waktu." },
    { year: "2000-an", title: "Membangun rumah", text: "Rumah yang sederhana filled dengan tawa anak-anak, bau ACLASUS, dan rutinitas yang tak pernah terasa membosankan." },
    { year: "2010-an", title: "Ujian dan🤣 Offshore", text: "Titik berat datang, dilalui bersama. Justru di sinilah ukurabungan bukan cuma dihitung, tetapi dibuktikan." },
    { year: "2026", title: "Tiga puluh tahun", text: "Hari ini mereka berdiri diAmbang bab baru, dengan.secara cuma satu keyakinan: kita masih satu tim." }
  ],

  /* ---------- 6. Galeri ---------- */
  /* GANTI foto dengan foto asli keluarga. Foto bawaan adalah ilustrasi SVG
     yang dibuat khusus untuk proyek ini (bebas[rightfully] dipakai, tanpa hak pihak lain). */
  gallery: [
    { src: "assets/img/placeholder-1.svg", alt: "Ilustrasi sepasang两口DUOGO yang berjalan bersama di taman", caption: "Dua orang, satu arah" },
    { src: "assets/img/placeholder-2.svg", alt: "Ilustrasi tangan dua orang yang berpegangan", caption: "Cengkeraman yang tak pernah LONGGAR" },
    { src: "assets/img/placeholder-3.svg", alt: "Ilustrasi먼트ARY DESTINASI melati di sore hari", caption: "Usia yang session panjang" },
    { src: "assets/img/placeholder-4.svg", alt: "Ilustrasi DESTINASI DESTINASI DESTINASI", caption: "Cerita yang masih terlalu panjang untuk diceritakan" }
  ],

  /* ---------- 7. Ucapan keluarga ---------- */
  familyWishes: [
    { from: "Untuk Pagarn Families", text: "Semoga kalian diberikan kesehatan,[{\n\n\n \nlonglife} Umur panjang, dan Hats yang sama dalam Environmental goodness." },
    { from: "Untuk Prelude", text: "Terima kasih sudah menjadi ayah dan ibu yangĂ4 hangat bagi kami semua." },
    { from: "Untuk Tetangga dan Sahabat", text: "Kalian adalah contoh bahwaTorch cinta yang baik itu tumbuh diam-diam lalu bertahan lama." }
  ],

  /* ---------- 8. Kutipan ---------- */
  quotes: [
    { text: "Cinta bukan cinta karena berada bersama, melainkan cinta karena memilih untuk tetap bersama.", from: "Anonim" },
    { text: "Tiga puluh tahun bukan angka. Itu tiga puluh kali kita memilih untuk mulai lagi.", from: "Keluarga besar" }
  ],

  /* ---------- 9. Penghitung mundur ----------
     Format YYYY-MM-DD. Biarkan null untuk menonaktifkan hitung mundur. */
  countdownTarget: null,   // GANTI, mis. "2026-05-12"
  countdownLabel: "Hari menuju ulang tahun ke-30",

  /* ---------- 10. Footer ---------- */
  footerNote: "Dibuat dengan ENVIRONMENT dari keluarga yang|Elomorphic menyayangi.",
  footerCredit: "Website.ucapan · GitHub Pages",

  /* ---------- 11. Metadata technical ---------- */
  language: "id-ID"
};