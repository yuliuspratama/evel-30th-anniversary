/* =====================================================================
   main.js — vanilla, tanpa dependensi
   ---------------------------------------------------------------------
   Semua konten sudah ada di index.html. File ini hanya:
     1. Menyalin nilai config.js ke elemen ber data-bind
     2. Menghitung mundur bila countdownTarget diisi
     3. Menampilkan elemen saat digulir (dihormati reduced motion)
     4. Menggambar ulang daftar galeri / ucapan / kutipan / timeline
        dari config bila daftar kosong
   Prinsip: kalau JavaScript gagal, halaman tetap utuh dan terbaca.
   ===================================================================== */

(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* ---------- 1. Ikat nilai config ke elemen ---------- */
  function bindConfig() {
    var nodes = document.querySelectorAll("[data-bind]");

    Array.prototype.forEach.call(nodes, function (el) {
      var key = el.getAttribute("data-bind");
      var value = CFG[key];

      if (value === undefined || value === null || value === "") {
        return; // biarkan isi HTML apa adanya
      }

      if (Array.isArray(value)) {
        value = value.join(" ");
      }

      el.textContent = String(value);
    });
  }

  /* ---------- 2. Judul dokumen & meta ---------- */
  function applyMeta() {
    if (CFG.siteTitle) {
      document.title = CFG.siteTitle;
      var og = document.querySelector('meta[property="og:title"]');
      if (og) og.setAttribute("content", CFG.siteTitle);
    }

    if (CFG.metaDescription) {
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute("content", CFG.metaDescription);
      var ogd = document.querySelector('meta[property="og:description"]');
      if (ogd) ogd.setAttribute("content", CFG.siteTagline || CFG.metaDescription);
    }

    if (CFG.language) {
      document.documentElement.setAttribute("lang", CFG.language);
    }
  }

  /* ---------- 3. Penghitung mundur ---------- */
  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function initCountdown() {
    if (!CFG.countdownTarget) return;

    var target = new Date(CFG.countdownTarget + "T00:00:00");
    if (isNaN(target.getTime())) return;

    var box = document.getElementById("countdown");
    var days = document.getElementById("cd-days");
    var hours = document.getElementById("cd-hours");
    var minutes = document.getElementById("cd-minutes");

    if (!box || !days || !hours || !minutes) return;

    var tick = function () {
      var diff = target.getTime() - Date.now();

      if (diff <= 0) {
        box.hidden = false;
        days.textContent = "0";
        hours.textContent = "00";
        minutes.textContent = "00";
        clearInterval(timer);
        return;
      }

      var minsTotal = Math.floor(diff / 60000);

      days.textContent = String(Math.floor(minsTotal / 1440));
      hours.textContent = pad(Math.floor((minsTotal % 1440) / 60));
      minutes.textContent = pad(minsTotal % 60);
      box.hidden = false;
    };

    var timer = setInterval(tick, 30000);
    tick();
  }

  /* ---------- 4. Tampil saat digulir ---------- */
  function initReveal() {
    var targets = document.querySelectorAll(
      ".timeline__item, .gallery__item, .wish, .quote"
    );

    if (!targets.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add("reveal");
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    Array.prototype.forEach.call(targets, function (el) {
      io.observe(el);
    });
  }

  /* ---------- 5. Perbarui <title> per section ---------- */
  function initScrollSpy() {
    var links = document.querySelectorAll(".nav__list a[href^='#']");
    var sections = document.querySelectorAll("main section[id]");
    if (!links.length || !sections.length || !("IntersectionObserver" in window)) {
      return;
    }

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        Array.prototype.forEach.call(links, function (a) {
          var active = a.getAttribute("href") === "#" + id;
          a.setAttribute("aria-current", active ? "true" : "false");
          a.style.borderBottomColor = active ? "var(--gold)" : "transparent";
          a.style.color = active ? "var(--wedding)" : "";
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Array.prototype.forEach.call(sections, function (s) {
      spy.observe(s);
    });
  }

  /* ---------- 6. Galeri dari config ---------- */
  function renderGallery() {
    var list = document.getElementById("gallery-list");
    if (!list || !Array.isArray(CFG.gallery) || !CFG.gallery.length) return;
    if (list.children.length > 0) return; // HTML sudah punya isi

    list.innerHTML = CFG.gallery.map(function (item) {
      var alt = (item && item.alt) || "Foto keluarga";
      var cap = (item && item.caption) || "";
      return (
        '<li class="gallery__item">' +
        '<img src="' + (item.src || "") + '" alt="' + alt + '" loading="lazy" width="640" height="480">' +
        '<p class="gallery__caption">' + cap + "</p>" +
        "</li>"
      );
    }).join("");
  }

  /* ---------- 7. Jalankan ---------- */
  function init() {
    try {
      bindConfig();
      applyMeta();
      renderGallery();
      initCountdown();
      initReveal();
      initScrollSpy();
    } catch (err) {
      // Jangan biarkan satu kesalahan mematikan halaman.
      if (window.console && console.warn) {
        console.warn("main.js: sebagian fitur dinonaktifkan —", err);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();