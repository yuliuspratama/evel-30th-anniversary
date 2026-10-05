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
  anniversaryNumber: "30",             // angka utama di hero
  weddingDate: "[Tanggal Pernikahan]", // GANTI: contoh "12 Mei 1996"
  anniversaryDate: "[Tanggal Ulang Tahun]", // GANTI: contoh "12 Mei 2026"

  /* ---------- 2. Judul & deskripsi ---------- */
  siteTitle: "Selamat Ulang Tahun Pernikahan ke-30",
  siteTagline: "Tiga puluh tahun, satu cerita yang terus berjalan.",
  metaDescription:
    "Situs ucapan ulang tahun pernikahan ke-30: tiga puluh tahun penuh kenangan, cerita, dan doa dari keluarga.",

  /* ---------- 3. Hero ---------- */
  heroHeadline: "Tiga Puluh Tahun",
  heroSubline: "Perjalanan panjang yang tetap utuh sebagai satu cerita.",

  /* ---------- 4. Pembuka / sambutan ---------- */
  openingSalutation: "Salam untuk pasangan yang kita mulailah dengan cinta dan hormat.",
  openingParagraphs: [
    "Hari ini bukan sekadar angka dalam kalender. Ini tiga puluh tahun cerita yang tidak pernah ditulis di buku mana pun, tetapi tetap utuh dalam keseharian rumah kalian.",
    "Di penghujung ini kami membayangkan perjalanan kalian: pagi-pagi yang sama, tawa yang datang tiba-tiba, dan keputusan kecil yang menjadi besar karena diambil bersama.",
    "Ucapan kami sederhana, tetapi kami ucapkan dengan tulus: terima kasih sudah menjadi satu rumah, satu suara, dan satu arah selama tiga puluh tahun."
  ],

  /* ---------- 5. Kronologi perjalanan ---------- */
  /* GANTI tahun dan deskripsi agar sesuai kenyataan keluarga. */
  timeline: [
    { year: "1996", title: "Hari pertama", text: "Dua keluarga bertemu dalam satu hari yang sederhana, dan diikat janji untuk berbagi waktu." },
    { year: "2000-an", title: "Membangun rumah", text: "Rumah yang sederhana terisi tawa anak-anak, aroma dapur, dan rutinitas yang tak pernah terasa membosankan." },
    { year: "2010-an", title: "Ujian yang dilalui", text: "Titik berat datang, dilewati bersama. Justru di sinilah kedekatan tidak hanya dihitung, tetapi dibuktikan." },
    { year: "2026", title: "Tiga puluh tahun", text: "Hari ini berdiri di ambang bab baru, dengan satu keyakinan sederhana: kita masih satu tim." }
  ],

  /* ---------- 6. Galeri ---------- */
  /* GANTI foto dengan foto asli keluarga. Foto bawaan adalah ilustrasi SVG
     yang dibuat khusus untuk proyek ini, bebas dipakai, tanpa hak pihak lain. */
  gallery: [
    { src: "assets/img/placeholder-1.svg", alt: "Ilustrasi sepasang elderly yang berjalan bersama di taman", caption: "Dua orang, satu arah" },
    { src: "assets/img/placeholder-2.svg", alt: "Ilustrasi dua tangan yang berpegangan", caption: "Cengkeraman yang tak pernah longgar" },
    { src: "assets/img/placeholder-3.svg", alt: "Ilustrasi bunga melati di sore hari", caption: "Usia yang panjang" },
    { src: "assets/img/placeholder-4.svg", alt: "Ilustrasi dua orang duduk melihat cakrawala", caption: "Cerita yang masih terlalu panjang untuk diceritakan" }
  ],

  /* ---------- 7. Ucapan keluarga ---------- */
  familyWishes: [
    { from: "Untuk keluarga besar", text: "Semoga kesehatan dan umur panjang selalu menyertai kalian." },
    { from: "Untuk anak-anak", text: "Terima kasih sudah menjadi ayah dan ibu yang hangat bagi kami semua." },
    { from: "Untuk tetangga dan sahabat", text: "Kalian adalah contoh bahwa cinta yang baik tumbuh diam-diam, lalu bertahan lama." }
  ],

  /* ---------- 8. Kutipan ---------- */
  quotes: [
    { text: "Cinta bukan cinta karena berada bersama, melainkan cinta karena memilih untuk tetap bersama.", from: "Anonim" },
    { text: "Tiga puluh tahun bukan angka. Itu tiga puluh kali kita memilih untuk mulai lagi.", from: "Keluarga besar" }
  ],

  /* ---------- 9. Penghitung mundur ---------- */
  /* Format YYYY-MM-DD. Biarkan null untuk menonaktifkan hitung mundur. */
  countdownTarget: null,   // GANTI, contoh: "2026-05-12"
  countdownLabel: "Hari menuju ulang tahun ke-30",

  /* ---------- 10. Footer ---------- */
  footerNote: "Situs ini dibuat sebagai hadiah dari keluarga yang menyayangi.",
  footerCredit: "Website ucapan · GitHub Pages",

  /* ---------- 11. Bahasa ---------- */
  language: "id-ID"
};