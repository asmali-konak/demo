/* PPX Bot Loader (robust)
   - Lädt bot.json (mit Fallback auf Defaults, falls Fehler)
   - Optional lädt EmailJS (wenn data-emailjs gesetzt)
   - Lädt IMMER das widget.js (mit Cache-Buster, wenn data-nocache)
   - Normalisiert window.__PPX_DATA__ auf { cfg, dishes, faqs }
   Daten-Attrs am <script>:
   - data-config="bot-data/bot.json"
   - data-widget="bot/widget.js?v=6"
   - (optional) data-emailjs="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"
   - (optional) data-nocache → cache: 'no-store' + ?cb=TIMESTAMP
*/
(function () {
  try {
    var w = window;
    var script =
      document.currentScript ||
      document.querySelector('script[data-ppx-loader]') ||
      document.getElementById('ppx-bot-loader');

    var CONFIG_URL = (script && script.getAttribute('data-config')) || 'bot-data/bot.json';
    var WIDGET_URL = (script && script.getAttribute('data-widget')) || 'bot/widget.js';
    var EMAILJS_URL = script && script.getAttribute('data-emailjs'); // optional
    var noCache = !!(script && script.hasAttribute('data-nocache'));
    var cacheMode = noCache ? 'no-store' : 'no-cache';

    function bust(url) {
      if (!noCache) return url;
      var sep = url.indexOf('?') > -1 ? '&' : '?';
      return url + sep + 'cb=' + Date.now();
    }

    function ensureDataShape(obj) {
      obj = obj || {};
      var current = w.__PPX_DATA__ || {};
      w.__PPX_DATA__ = {
        cfg:   obj.cfg   || obj.config || current.cfg   || {},
        dishes:obj.dishes|| obj.menu   || current.dishes|| {},
        faqs:  obj.faqs  || obj.faq    || current.faqs  || []
      };
    }

    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = bust(src);
        s.async = true;
        s.onload = resolve;
        s.onerror = function () { reject(new Error('Failed to load: ' + src)); };
        (document.head || document.documentElement).appendChild(s);
      });
    }

    function fetchJSON(url) {
      return fetch(bust(url), { cache: cacheMode }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
        return res.json();
      });
    }

    // 1) Config laden (oder Defaults setzen) → 2) optional EmailJS → 3) Widget
    Promise.resolve()
      .then(function () {
        return fetchJSON(CONFIG_URL)
          .then(function (data) { ensureDataShape(data); })
          .catch(function (err) {
            console.warn('[PPX Loader] Konnte Config nicht laden, nutze Defaults.', err);
            ensureDataShape({});
          });
      })
      .then(function () {
        if (EMAILJS_URL && !w.emailjs) {
          return loadScript(EMAILJS_URL).catch(function (err) {
            console.warn('[PPX Loader] EmailJS konnte nicht geladen werden (fahre ohne fort).', err);
          });
        }
      })
      .then(function () {
        return loadScript(WIDGET_URL);
      })
      .catch(function (err) {
        console.error('[PPX Loader] Fehler beim Laden. Versuche Widget dennoch zu laden …', err);
        try { loadScript(WIDGET_URL); } catch (e) {}
      });
  } catch (err) {
    console.error('[PPX Loader] Unerwarteter Fehler:', err);
  }
})();
