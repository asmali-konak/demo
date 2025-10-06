/* ============================================================================
   PPX Widget Orchestrator (index.js) – v8.4.0
   Lädt die Modul-Dateien sequentiell und startet den Bot (1:1 Verhalten).
   Neu:
   - Initialisiert window.PPX Namespace früh (ohne Globals außer window.PPX)
   - Liest bevorzugte Sprache aus localStorage ("ppx.lang") → PPX.lang
   - Setzt data-ppx-lang am <html> früh, damit Styles/Module es nutzen können
   ============================================================================ */
(function () {
  'use strict';
  try {
    var d = document, w = window;

    // --- Früh: Namespace + Sprache ------------------------------------------
    var PPX = w.PPX = w.PPX || {};
    // gewählte Sprache (persistiert in panel.js, aber hier früh verfügbar)
    try {
      PPX.lang = PPX.lang || localStorage.getItem('ppx.lang') || 'de';
    } catch (e) {
      PPX.lang = PPX.lang || 'de';
    }
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
        // Falls core ein boot() bereitstellt → bevorzugt nutzen
        if (w.PPX && typeof w.PPX.boot === 'function') {
          w.PPX.boot();
        } else if (w.PPX && w.PPX.ui && typeof w.PPX.ui.bindOnce === 'function') {
          // Fallback – sollte selten gebraucht werden
          w.PPX.ui.bindOnce();
        }
      } catch (e) {
        console.error('[PPX index] Boot failed:', e);
      } finally {
        // Ready-Queue ausführen (z. B. Module, die erst nach Boot arbeiten sollen)
        try { drainReadyQueue(); } catch (e) {}
      }
    }

    loadOne(0);
  } catch (err) {
    console.error('[PPX index] Unexpected error:', err);
  }
})();
