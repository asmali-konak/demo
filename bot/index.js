/* ============================================================================
   PPX Widget Orchestrator (index.js) – v8.5.0
   Lädt die Modul-Dateien sequentiell und startet den Bot (1:1 Verhalten).
   Änderungen:
   - Initialisiert window.PPX Namespace früh (ohne Globals außer window.PPX)
   - Immer DE als Startsprache (KEIN localStorage-Read mehr)
   - Setzt data-ppx-lang am <html> früh, damit Styles/Module es nutzen können
============================================================================ */
(function () {
  'use strict';
  try {
    var d = document, w = window;

    // --- Früh: Namespace + Sprache ------------------------------------------
    var PPX = w.PPX = w.PPX || {};
    PPX.lang = 'de';
    try { d.documentElement.setAttribute('data-ppx-lang', PPX.lang); } catch (e) {}

    // --- Basis-URL und Cache-Buster aus dem eigenen <script src=".../bot/index.js?v=...">
    var self = d.currentScript || (function () {
      var s = d.getElementsByTagName('script');
      return s[s.length - 1];
    })();
    var src = (self && self.src) || '';
    var base = src.replace(/[^\/?#]+(?:\?.*)?$/, ''); // bis zum letzten '/'
    var qs = src.split('?')[1] || '';
    var ver = '';
    try { ver = new URLSearchParams(qs).get('v') || ''; } catch (e) {}
    var cacheParam = ver ? ('v=' + encodeURIComponent(ver)) : ('cb=' + Date.now());
    function toUrl(path) {
      var sep = path.indexOf('?') > -1 ? '&' : '?';
      return base + path + sep + cacheParam;
    }

    // --- Orchestrierte Lade-Reihenfolge (wichtig) ----------------------------
    var files = [
      'core.js',
      'ui/styles-inject.js',
      'ui/panel.js',
      'ui/components/buttons.js',
      'ui/components/forms.js',
      'services/email.js',
      'services/openHours.js',
      // NEU: AI-Service (Dock + Logik) – bewusst NACH UI, aber VOR Flows ok
      'services/ai.js',
      'flows/home.js',
      'flows/speisen.js',
      'flows/reservieren.js',
      'flows/hours.js',
      'flows/kontakt.js',
      'flows/contactform.js',
      'flows/faq.js'
      // 'compat/compat_v794.js' // optional
    ];

    // Kleines Ready-Queue-Utility, falls Module Hooks registrieren wollen
    PPX._readyQ = PPX._readyQ || [];
    PPX.onReady = function (fn) { if (typeof fn === 'function') PPX._readyQ.push(fn); };

    function drainReadyQueue() {
      var q = PPX._readyQ || [];
      for (var i = 0; i < q.length; i++) {
        try { q[i](); } catch (e) { /* noop */ }
      }
      PPX._readyQ = [];
    }

    // --- Loader --------------------------------------------------------------
    function loadOne(i) {
      if (i >= files.length) { return finish(); }
      var s = d.createElement('script');
      s.src = toUrl(files[i]);
      s.async = true;
      s.onload = function () { loadOne(i + 1); };
      s.onerror = function () {
        console.error('[PPX index] Failed to load:', files[i]);
        // Weiterladen, damit möglichst viel funktioniert
        loadOne(i + 1);
      };
      (d.head || d.documentElement).appendChild(s);
    }

    function finish() {
      try {
        if (w.PPX && typeof w.PPX.boot === 'function') {
          w.PPX.boot();
        } else if (w.PPX && w.PPX.ui && typeof w.PPX.ui.bindOnce === 'function') {
          w.PPX.ui.bindOnce();
        }
      } catch (e) {
        console.error('[PPX index] Boot failed:', e);
      } finally {
        try { drainReadyQueue(); } catch (e) {}
      }
    }

    loadOne(0);
  } catch (err) {
    console.error('[PPX index] Unexpected error:', err);
  }
})();
