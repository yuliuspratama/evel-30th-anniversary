/* =====================================================================
   main.js — vanilla, tanpa dependensi
   ---------------------------------------------------------------------
   index.html sudah berisi SELURUH naskah, jadi halaman tetap terbaca
   tanpa JavaScript. File ini menambahkan:

     1. Inisialisasi pemutar lagu "Mutiara Cinta Kita"
        - Coba autoplay saat halaman dibuka; bila diblokir kebijakan
          browser, lagu mulai otomatis pada interaksi pertama
          (klik / gulir / sentuh / tombol).
     2. Pengganti token [Nama ...] bila runtime membawa nilai baru.
     3. Reveal animasi section saat digulir (hormat reduced-motion).
     4. Section aktif di navigasi (scroll-spy).

   Lirik ditampilkan sebagai teks utuh (tidak karaoke per baris) —
   bisa dibaca sambil mendengarkan.
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

  /* ---------- 1. Substitusi token runtime ---------- */
  function fillTokens(root) {
    if (!Object.keys(VALUES).length) return;
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

    nodes.forEach(function (n) {
      TOKEN_RE.lastIndex = 0;
      n.nodeValue = n.nodeValue.replace(TOKEN_RE, function (whole, name) {
        var value = VALUES[name];
        if (value === undefined || value.trim() === whole) return whole;
        return value;
      });
    });
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

  /* ---------- 3. Pemutar lagu ---------- */
  function initAudio() {
    var AU = SET.audio;
    if (!AU || !AU.src) return;

    var btn = document.getElementById("audio-toggle");
    var audio = document.getElementById("bg-audio");
    if (!btn || !audio) return;
    var stateEl = btn.querySelector(".player__state");
    var iconEl = btn.querySelector(".player__icon");

    var started = false;   // pernah berbunyi
    var armed = false;     // listener interaksi pertama terpasang

    function setPlaying(playing) {
      btn.setAttribute("aria-pressed", playing ? "true" : "false");
      if (stateEl) stateEl.textContent = playing ? "Jeda lagu" : "Putar lagu";
      if (iconEl) {
        iconEl.classList.toggle("player__icon--pause", playing);
        iconEl.classList.toggle("player__icon--play", !playing);
      }
    }

    function kick() {
      if (!started && audio.paused) tryPlay();
    }

    function disarm() {
      started = true;
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (evt) {
        window.removeEventListener(evt, kick);
      });
    }

    function arm() {
      if (armed) return;
      armed = true;
      ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (evt) {
        window.addEventListener(evt, kick, { passive: true });
      });
    }

    function tryPlay() {
      audio.play().then(function () {
        setPlaying(true);
        disarm();
      }).catch(function () {
        // Ditolak kebijakan autoplay — pasang pemicu interaksi pertama.
        setPlaying(false);
        arm();
      });
    }

    btn.addEventListener("click", function () {
      if (audio.paused) {
        tryPlay();
      } else {
        audio.pause();
        setPlaying(false);
      }
    });

    // Saat situs dibuka: coba putar lagu.
    tryPlay();
  }

  /* ---------- 4. Reveal saat digulir ---------- */
  function initReveal() {
    var targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* ---------- 5. Section aktif di navigasi ---------- */
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

  /* ---------- 6. Jalankan ---------- */
  function init() {
    try {
      fillTokens(document.body);
      clearTodoMarks();
      applyMeta();
      initAudio();
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
