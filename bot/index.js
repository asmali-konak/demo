/* ============================================================================
   PPX Widget Orchestrator (index.js) – v8.5.1-AF
   Lädt die Modul-Dateien sequentiell und startet den Bot (1:1 Verhalten).
   Änderungen (minimal & gezielt):
   - AI vor E-Mail laden (robuster gegen fehlendes/kaputtes E-Mail-SDK).
   - Fallback: Falls AI nach der Sequenz nicht existiert, lade services/ai.js
     einmalig nach und boote sie. Keine weiteren Verhaltensänderungen.
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

    // --- Orchestrierte Lade-Reihenfolge -------------------------------------
    // Hinweis: AI VOR E-Mail, damit ein optionales/fehlendes E-Mail-SDK die KI nicht blockiert.
    var files = [
      'core.js',
      'ui/styles-inject.js',
      'ui/panel.js',
      'ui/components/buttons.js',
      'ui/components/forms.js',
      'services/telemetry.js',   // Telemetry vor AI
      'services/ai.js',          // << KI jetzt VOR E-Mail
      'services/openHours.js',
      'services/email.js',       // E-Mail bewusst NACH AI
      // Flows
      'flows/home.js',
      'flows/speisen.js',
      'flows/reservieren.js',
      'flows/hours.js',
      'flows/kontakt.js',
      'flows/contactform.js',
      'flows/faq.js'
      // 'compat/compat_v794.js' // optional
    ];

    // Ready-Queue-Utility
    PPX._readyQ = PPX._readyQ || [];
    PPX.onReady = function (fn) { if (typeof fn === 'function') PPX._readyQ.push(fn); };
    function drainReadyQueue() {
      var q = PPX._readyQ || [];
      for (var i = 0; i < q.length; i++) {
        try { q[i](); } catch (e) {}
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
        // Non-blocking: weiterladen, damit KI/Rest weiter funktionieren
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
        try {
          // --- AI-Fallback: wenn AI-Service fehlt, einmalig nachladen & booten
          var hasAI = !!(w.PPX && w.PPX.services && w.PPX.services.ai);
          if (!hasAI) {
            var s = d.createElement('script');
            s.src = toUrl('services/ai.js');
            s.async = true;
            s.onload = function () {
              try {
                if (w.PPX && w.PPX.services && w.PPX.services.ai && typeof w.PPX.services.ai.boot === 'function') {
                  w.PPX.services.ai.boot();
                }
              } catch (e) {
                console.error('[PPX index] AI boot (fallback) failed:', e);
              } finally {
                try { drainReadyQueue(); } catch (e) {}
              }
            };
            s.onerror = function () {
              console.error('[PPX index] AI fallback load failed');
              try { drainReadyQueue(); } catch (e) {}
            };
            (d.head || d.documentElement).appendChild(s);
            return; // drainReadyQueue wird in onload/onerror aufgerufen
          } else {
            // Falls AI schon da ist, sicherheitshalber booten (idempotent)
            try {
              var ai = w.PPX.services.ai;
              if (ai && typeof ai.boot === 'function') ai.boot();
            } catch (e) {}
            drainReadyQueue();
          }
        } catch (e) {
          try { drainReadyQueue(); } catch (e2) {}
        }
      }
    }

    loadOne(0);
  } catch (err) {
    console.error('[PPX index] Unexpected error:', err);
  }
})();
