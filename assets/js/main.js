/* =====================================================================
   main.js — vanilla, tanpa dependensi
   ---------------------------------------------------------------------
   index.html sudah berisi SELURUH naskah, jadi halaman tetap terbaca
   tanpa JavaScript. File ini hanya menambah lapisan konfigurasi:

     1. Substitusi token [Nama ...] dengan nilai dari content.config.json
        (runtime) — hasil bangun tools/build-content.mjs sudah substituting,
        ini jaring pengaman bila config berubah tanpa bangun ulang.
     2. Penghitung mundur bila settings.countdownTarget diisi.
     3. Foto galeri: otomatis kembali ke ilustrasi bila file foto 404.
     4. Muncul saat digulir, hormat prefers-reduced-motion.
     5. Penanda section aktif di navigasi.

   Prinsip: kalau JavaScript gagal, halaman tetap utuh dan terbaca.
   Semua error ditangkap; tidak ada yang mematikan halaman.
   ===================================================================== */

(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var SET = CFG.settings || {};
  var VALUES = CFG.values || {};

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  var TOKEN_RE = /\[([A-Za-z][A-Za-z0-9 .&-]{2,40})\]/g;

  /* ---------- 1. Substitusi token ---------- */
  function looksLikeToken(name) {
    if (name.indexOf("http") !== -1) return false;
    return true;
  }

  function fillTokens(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        TOKEN_RE.lastIndex = 0;
        if (!TOKEN_RE.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (node.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(node.parentNode.nodeName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    var replaced = 0;
    nodes.forEach(function (node) {
      node.nodeValue = node.nodeValue.replace(TOKEN_RE, function (whole, name) {
        var key = name.trim();
        if (!looksLikeToken(key)) return whole;
        var value = VALUES[key];
        if (value === undefined || value === null || value === "") return whole;
        // Jangan isi dengan nilai yang masih berupa token itu sendiri.
        if (value.trim() === whole) return whole;
        replaced++;
        return value;
      });
    });
    return replaced;
  }

  function clearTodoMarks() {
    var marks = document.querySelectorAll("mark.todo");
    Array.prototype.forEach.call(marks, function (mark) {
      if (/\[.+\]/.test(mark.textContent)) return; // masih kosong
      var parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
  }

  /* ---------- 2. Judul dokumen & meta ---------- */
  function applyMeta() {
    if (CFG.meta && CFG.meta.title) document.title = CFG.meta.title;
    if (!CFG.meta) return;

    var pairs = [
      ['meta[name="description"]', CFG.meta.description],
      ['meta[property="og:title"]', CFG.meta.ogTitle],
      ['meta[property="og:description"]', CFG.meta.ogDescription]
    ];

    pairs.forEach(function (pair) {
      var el = document.querySelector(pair[0]);
      if (el && pair[1]) el.setAttribute("content", pair[1]);
    });

    if (SET.language) {
      document.documentElement.setAttribute("lang", SET.language);
    }
    if (SET.themeColor) {
      var tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute("content", SET.themeColor);
    }
  }

  /* ---------- 3. Penghitung mundur ---------- */
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function initCountdown() {
    if (!SET.countdownTarget) return;

    var target = new Date(SET.countdownTarget + "T00:00:00");
    if (isNaN(target.getTime())) {
      if (window.console) console.warn("main.js: countdownTarget tidak valid — hitung mundur dimatikan.");
      return;
    }

    var box = document.getElementById("countdown");
    var days = document.getElementById("cd-days");
    var hours = document.getElementById("cd-hours");
    var minutes = document.getElementById("cd-minutes");
    if (!box || !days || !hours || !minutes) return;

    var timer = null;

    var tick = function () {
      var diff = target.getTime() - Date.now();

      if (diff <= 0) {
        days.textContent = "0";
        hours.textContent = "00";
        minutes.textContent = "00";
        box.hidden = false;
        if (timer) clearInterval(timer);
        return;
      }

      var minsTotal = Math.floor(diff / 60000);
      days.textContent = String(Math.floor(minsTotal / 1440));
      hours.textContent = pad(Math.floor((minsTotal % 1440) / 60));
      minutes.textContent = pad(minsTotal % 60);
      box.hidden = false;
    };

    timer = setInterval(tick, 30000);
    tick();
  }

  /* ---------- 4. Galeri: ganti foto bila gagal dimuat ---------- */
  function initGalleryFallback() {
    var images = document.querySelectorAll(".gallery__item img[data-fallback]");

    Array.prototype.forEach.call(images, function (img) {
      img.addEventListener("error", function () {
        var fallback = img.getAttribute("data-fallback");
        if (!fallback || img.src.indexOf(fallback) !== -1) return;
        img.src = fallback;
        img.classList.add("gallery__item--fallback");
      }, { once: true });
    });
  }

  /* ---------- 5. Muncul saat digulir ---------- */
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
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* ---------- 6. Section aktif di navigasi ---------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll(".nav__list a[href^='#']"));
    var sections = document.querySelectorAll("main section[id]");
    if (!links.length || !sections.length || !("IntersectionObserver" in window)) return;

    var setActive = function (id) {
      links.forEach(function (a) {
        if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Array.prototype.forEach.call(sections, function (s) { spy.observe(s); });
  }

  /* ---------- 7. Jalankan ---------- */
  function init() {
    try {
      fillTokens(document.body);
      clearTodoMarks();
      applyMeta();
      initGalleryFallback();
      initCountdown();
      initReveal();
      initScrollSpy();
    } catch (err) {
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
