# Panduan Publikasi — GitHub Pages

Panduan ini untuk **menerbitkan ulang** situs ini setelah diedit, memverifikasi
hasilnya, dan mengembalikan ke versi sebelumnya kalau ada yang salah.

Situsnya **tidak punya build step**. GitHub Pages menyajikan branch `main`
apa adanya. Tidak ada Jekyll, tidak ada Node di server, tidak ada bundler.

    URL situs: https://yuliuspratama.github.io/evel-30th-anniversary/
    Repository: https://github.com/yuliuspratama/evel-30th-anniversary

---

## 1. Mengaktifkan GitHub Pages (sudah dilakukan)

Kalau repo ini sudah punya halaman di Settings → Pages, langkah ini selesai.
Untuk repo baru:

**Cara termudah — CLI `gh`:**

    gh repo create <nama-repo> --public --source=. --remote=origin --push
    gh api -X POST repos/<pemilik>/<nama-repo>/pages \
      -f source[branch]=main -f source[path]=/

**Cara lewat web:**

1. Buka repo → tab **Settings**
2. Menu kiri **Pages**
3. **Build and deployment** → Source: **Deploy from a branch**
4. Branch: **main**, folder: **/ (root)** → Save

Tunggu 1–2 menit, lalu buka `https://<pemilik>.github.io/<nama-repo>/`.

> **Kenapa "deploy from branch", bukan GitHub Actions?**
> Actions butuh berkas `.github/workflows/`, dan token `gh` di mesin ini
> tidak punya scope `workflow` sehingga push workflow bisa ditolak GitHub.
> Pages dari branch tidak butuh token apa pun dan tidak bisa gagal-build.
> Kalau nanti butuh Actions (mis. optimasi gambar otomatis), jalankan
> `gh auth refresh -h github.com -s workflow` lebih dulu.

> **Kenapa ada berkas `.nojekyll`?**
> Tanpa itu, GitHub menjalankan Jekyll dan bisa:
> melewati berkas/direktori diawali `_` atau `.`,
> memproses Liquid `{{ ... }}` dan `{% ... %}` di dalam HTML.
> `.nojekyll` mematikan seluruh proses itu, jadi yang disajikan persis
> seperti isi repo. Repo ini memang tidak punya pola nama seperti itu,
> tapi `.nojekyll` membuat situs aman dari perubahan isi di masa depan.

---

## 2. Mengganti isi situs (nama, tanggal, foto)

**Semua isi ada di satu file: `content.config.json`.**

Alurnya selalu sama:

    # 1. edit content.config.json
    # 2. bangun ulang halaman
    node tools/build-content.mjs

    # 3. cek tidak ada yang rusak
    node tools/lint-text.mjs

    # 4. commit & push
    git add -A && git commit -m "isi: nama & tanggal"
    git push origin main

`index.html` adalah **berkas hasil generasi** — jangan disunting langsung,
perubahan manual akan hilang saat build berikutnya.

### Mengganti nama pasangan

Bagian `values`, kunci `"Nama Pasangan"`:

    "Nama Pasangan": "Budi Santoso"

Ganti sekali, seluruh halaman ikut berubah: judul tab, hero, kutipan, footer.

### Mengganti tanggal

| Kunci                     | Untuk                     | Contoh                       |
| ------------------------- | ------------------------- | ---------------------------- |
| `"Tanggal Pernikahan"`    | teks "Sejak ..."          | `9 Oktober 1991`            |
| `"Tanggal Perayaan"`      | baris "Perayaan" di hero  | `9 Oktober 2021`            |
| `"Lokasi Perayaan"`       | baris "Perayaan" di hero  | `Gedung Serbaguna, Malang`  |

**Hitung mundur hanya hidup bila `Tanggal Perayaan` terisi.** Formatnya ISO
agar tidak ambigu:

    "settings": { "countdownTarget": "2021-10-09T08:00:00+07:00" }

Tanpa itu, blok hitung mundur otomatis disembunyikan dan halaman tetap utuh.

### Mengganti foto

1. Simpan fotonya, mis. `assets/foto-1.jpg`
2. Isi `"Deskripsi Foto 1"` di registry `values` — **wajib**, alt tidak boleh kosong
3. `"Keterangan Foto 1"` boleh dikosongkan — paragraf caption otomatis dihapus
4. Arahkan `galeri.items[].photo` ke nama file itu di `content.config.json`
5. `node tools/build-content.mjs`

Selama file foto belum ada, galeri otomatis memakai ilustrasi SVG bawaan.
Kalau foto dipasang lalu gagal dimuat, `main.js` mengembalikannya ke ilustrasi.

### Placeholder yang masih kosong

Sepuluh nilai sengaja dibiarkan sebagai token (`[Nama Pasangan]` dst.) dan
ditandai kuning di halaman — datanya memang belum ada. Daftar lengkap ada di
[README.md](README.md#daftar-placeholder).

---

## 3. Memperbarui situs yang sudah daring

Cukup: **edit → build → commit → push.** Tidak ada langkah lain.

    git push origin main

GitHub Pages membangun ulang otomatis, biasanya selesai dalam 1–2 menit.

Untuk memastikan build Pages selesai:

    gh api repos/<pemilik>/<nama-repo>/pages/builds/latest --jq '.status'

`built` = siap, `building` = sedang, `errored` = gagal (lihat bagian bawah).

> **Auto-sync lokal:** mesin ini punya cron `auto-git-sync.sh` yang
> `commit` + `push` otomatis tiap 10 menit ke semua repo di
> `~/root-workspace`. Itu berarti kadang commit kamu sudah terp pushed
> sebelum sempat kamu push manual. Setelah `git push`, selalu cek:
>
>     git log --oneline -1 origin/main
>
> Kalau commit cron muncul di remote, isi kamu tetap terpush — tidak ada
> yang hilang.

---

## 4. Rollback

Kembalikan situs ke versi sebelumnya. Pilihannya:

**Paling aman — revert commit (riwayat tidak ditulis ulang):**

    git log --oneline -5                       # cari commit yang bagus
    git revert <commit-id>                     # undo commit itu saja
    git push origin main

**Kembali ke commit tertentu (riwayat berubah — pakai dengan hati-hati):**

    git revert --no-commit <commit-id>..HEAD   # undo semua setelah commit itu
    git commit -m "rollback ke <commit-id>"
    git push origin main

**Recovery total — branch `main` benar-benar rusak:**

    git branch pulih backup-2026-10-05         # sebelum eksperimen
    # ... perbaiki di main ...
    git reset --hard backup-2026-10-05        # kembali persis
    git push --force-with-lease origin main

Pastikan `git push` tidak ditolak sebelum `--force`. Kalau `git push` biasa
ditolak karena ada commit orang lain, lihat bagian **Pemecahan Masalah**.

Setelah rollback, tunggu build Pages, lalu verifikasi dengan
`node tests/live-check.mjs`.

---

## 5. Verifikasi

### Sebelum push (lokal, cepat)

    node tools/build-content.mjs     # harus keluar "OK"
    node tools/lint-text.mjs         # harus keluar "OK"

### Setelah publish (live, membuktikan URL publik)

    node tests/live-check.mjs

`live-check.mjs` sengaja memakai URL `github.io/<repo>/` karena kondisi itu
**tidak bisa dibuktikan server lokal** — di `localhost` path absolut selalu
berhasil, di subpath tidak. Skrip ini mengunduh setiap aset lewat URL publik,
memastikan CSS benar-benar terpakai (bukan 404 yang diam-diam), memastikan
`og:image` bisa diambil, dan menyimpan tangkapan layar ke
`tests/screenshots/30-live-github-pages.png`.

### Uji browser penuh (lokal, opsional)

    bash tests/run-tests.sh

Butuh Chromium di `/usr/bin/chromium` dan dependensi di `tests/node_modules/`:

    cd tests && npm ci

---

## Checklist verifikasi akhir

- [ ] `node tools/build-content.mjs` keluar `OK`, tanpa "tanpa daftar"
- [ ] `node tools/lint-text.mjs` keluar `OK`
- [ ] Tidak ada `[Token Asing]` yang belum terdaftar (build akan gagal kalau ada)
- [ ] `bash tests/run-tests.sh` — semua rangkaian lolos
- [ ] `node tests/live-check.mjs` — situs live lolos, termasuk aset di subpath
- [ ] `gh api repos/<pemilik>/<repo>/pages/builds/latest --jq '.status'` → `built`
- [ ] Buka URL di browser sungguhan — teks, gambar, dan gaya tampil benar
- [ ] Buka di ponsel (atau DevTools mode ponsel) — layout 1 kolom, tidak ada
      scroll horizontal
- [ ] Scroll ke bawah — animasi muncul, tidak ada elemen nyangkut di luar
- [ ] Bagikan tautan ke WhatsApp — kartu berbagi tampil dengan gambar, bukan teks polos
- [ ] Placeholder yang tersisa memang disengaja (nama/tanggal belum diisi)
- [ ] Tidak ada file rahasia di repo: `git ls-files | grep -E '\.env|\.pem|\.key'`
- [ ] Kalau sempat Salah commit rahasia: **cabut dengan** `git filter-repo`,
      bukan sekadar `rm` (riwayat lama masih menyimpan isinya)

---

## Pemecahan masalah

**Halaman masih versi lama setelah push.**
Build Pages butuh 1–2 menit. Cek status build:

    gh api repos/<pemilik>/<repo>/pages/builds/latest --jq '.status,.commit'

Kalau `commit` masih yang lama, push-mu belum masuk. Kalau status `errored`:

    gh api repos/<pemilik>/<repo>/pages/builds/latest --jq '.error'

**Gaya halaman hilang (halaman polos).**
Berkas CSS 404. Cek di browser: Network → `style.css` → status. Kalau 404,
`assets/css/style.css` belum ikut ter-push:

    git ls-files assets/css/style.css

**`git push` ditolak (`rejected — fetch first`).**
Cron auto-sync mungkin sudah push duluan, atau ada commit dari remote:

    git pull --rebase --autostash origin main
    git push origin main

**Kartu di WhatsApp/Facebook tidak ada gambarnya.**
`og:image` harus **URL absolut** dan bisa diambil tanpa login. Kalau
`content.config.json` → `settings.siteUrl` kosong, `og:image` jadi path
relatif dan scraper tidak bisa me-resolve-nya. Isi `siteUrl` dengan URL situs
tanpa garis miring di akhir, lalu build ulang. Facebook juga hanya mengambil
kartu OG **saat pertama kali** URL dibagikan — kalau belum muncul, pakai
https://developers.facebook.com/tools/debug/ .

---

## Batasan saat ini

- **Domain kustom belum dipakai.** Situs berjalan di
  `yuliuspratama.github.io/evel-30th-anniversary/`. Untuk domain sendiri:
  Settings → Pages → **Custom domain** → isi domain, lalu set DNS `CNAME`
  `yuliuspratama.github.io`. Setelah itu isi `settings.siteUrl` dengan
  domain itu dan build ulang. GitHub otomatis memesan sertifikat Let's
  Encrypt, tapi DNS harus sudah terpasang atau Pages akan gagal build.
- **Foto asli belum ada.** Galeri memakai 4 ilustrasi SVG asli proyek ini.
- **Sepuluh nilai placeholder belum diisi** (nama pasangan, tanggal, lokasi).
  Ditandai kuning di halaman. Isi di `content.config.json`.
- **Font memakai Georgia/system-ui bawaan sistem** — tidak ada permintaan
  jaringan ke pihak ketiga, tapi belum diuji dengan mata di iOS/Safari asli.
- **Tanpa CI.** `tests/run-tests.sh` hanya berjalan di mesin ini, tidak
  otomatis tiap commit.
- **Og:image PNG hasil generate** dari `assets/img/og-cover.svg` via Chromium.
  Kalau SVG-nya diubah, hasilkan ulang:

      node tests/og-preview.mjs --write