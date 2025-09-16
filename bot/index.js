/* ============================================================================
   PPX Widget Orchestrator (index.js) – v7.9.4
   Lädt die Modul-Dateien sequentiell und startet den Bot (1:1 Verhalten).
   Keine neuen Globals außer window.PPX (durch die Module selbst).
   ============================================================================ */
(function () {
  try {
    var d = document, w = window;

    // Basis-URL und Cache-Buster aus dem eigenen <script src=".../bot/index.js?v=...">
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

    // Reihenfolge ist wichtig → exakt so laden
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
      // 'compat/compat_v794.js' // optional, aktuell weggelassen
    ];

    function loadOne(i) {
      if (i >= files.length) { return finish(); }
      var s = d.createElement('script');
      s.src = toUrl(files[i]);
      s.async = true;
      s.onload = function () { loadOne(i + 1); };
      s.onerror = function () {
        console.error('[PPX index] Failed to load:', files[i]);
        // Wir machen weiter, um möglichst viel funktionsfähig zu halten
        loadOne(i + 1);
      };
      (d.head || d.documentElement).appendChild(s);
    }

    function finish() {
      try {
        if (w.PPX && typeof w.PPX.boot === 'function') {
          w.PPX.boot();
        } else if (w.PPX && w.PPX.ui && typeof w.PPX.ui.bindOnce === 'function') {
          // Fallback – sollte selten gebraucht werden
          w.PPX.ui.bindOnce();
        }
      } catch (e) {
        console.error('[PPX index] Boot failed:', e);
      }
    }

    loadOne(0);
  } catch (err) {
    console.error('[PPX index] Unexpected error:', err);
  }
})();
