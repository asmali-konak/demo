/* ============================================================================
   PPX Bot Loader – "Never-Undefined" v8.1
   - Lädt bot.json sicher
   - Setzt IMMER window.PPX_DATA (+ Alias __PPX_DATA__)
   - Stellt minimales PPX.data-API bereit
   - Optional: EmailJS laden (per data-emailjs)
   - Lädt danach bot/index.js
   Daten-Attribute am <script>:
     data-ppx-loader
     data-config="bot-data/bot.json"
     data-widget="bot/index.js?v=7.9.4"
     data-nocache
     (optional) data-emailjs="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"
   ============================================================================ */
(function () {
  'use strict';
  var W = window, D = document;

  function pickScript() {
    return D.currentScript ||
      D.querySelector('script[data-ppx-loader]') ||
      D.getElementById('ppx-bot-loader');
  }
  function withBust(url, nocache) {
    if (!nocache) return url;
    var sep = url.indexOf('?') > -1 ? '&' : '?';
    return url + sep + 'cb=' + Date.now();
  }
  function fetchJSON(url, nocache) {
    return fetch(withBust(url, nocache), { cache: nocache ? 'no-store' : 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url); return r.json(); });
  }
  function setPPX_DATA(obj) {
    var current = W.PPX_DATA || W.__PPX_DATA__ || {};
    var safe = {
      cfg:    (obj && (obj.cfg || obj.config)) || current.cfg || {},
      dishes: (obj && (obj.dishes || obj.menu)) || current.dishes || {},
      faqs:   (obj && (obj.faqs || obj.faq)) || current.faqs || []
    };
    W.PPX_DATA = safe;
    W.__PPX_DATA__ = W.PPX_DATA; // Alias für Altcode
  }
  function ensurePPXNamespace() {
    var PPX = W.PPX = W.PPX || {};
    PPX.data = PPX.data || {};
    PPX.data.raw    = function () { return W.PPX_DATA || W.__PPX_DATA__ || {}; };
    PPX.data.cfg    = function () { return (PPX.data.raw().cfg || {}); };
    PPX.data.dishes = function () { return (PPX.data.raw().dishes || {}); };
    PPX.data.faqs   = function () { return (PPX.data.raw().faqs || []); };
    // Debug:
    W.PPX_DEBUG = function () {
      var x = PPX.data.raw();
      console.info('[PPX DEBUG] cfg.EMAIL =', x.cfg && x.cfg.EMAIL ? x.cfg.EMAIL : null);
      return x;
    };
  }
  function loadScript(src, nocache) {
    return new Promise(function (resolve, reject) {
      var s = D.createElement('script');
      s.src = withBust(src, nocache);
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load: ' + src)); };
      (D.head || D.documentElement).appendChild(s);
    });
  }

  try {
    var tag = pickScript();
    var CONFIG_URL = (tag && tag.getAttribute('data-config')) || 'bot-data/bot.json';
    var WIDGET_URL = (tag && tag.getAttribute('data-widget')) || 'bot/index.js';
    var EMAILJS_URL = tag && tag.getAttribute('data-emailjs'); // optional
    var NOCACHE = !!(tag && tag.hasAttribute('data-nocache'));

    Promise.resolve()
      .then(function () {
        return fetchJSON(CONFIG_URL, NOCACHE)
          .then(function (data) { setPPX_DATA(data); })
          .catch(function (err) {
            console.warn('[PPX Loader] Config nicht geladen, nutze leere Defaults.', err);
            setPPX_DATA({});
          })
          .then(ensurePPXNamespace);
      })
      .then(function () {
        if (EMAILJS_URL && !W.emailjs) {
          return loadScript(EMAILJS_URL, NOCACHE).catch(function (e) {
            console.warn('[PPX Loader] EmailJS SDK nicht geladen (fahre ohne fort).', e);
          });
        }
      })
      .then(function () { return loadScript(WIDGET_URL, NOCACHE); })
      .catch(function (err) { console.error('[PPX Loader] Kritischer Ladefehler:', err); });
  } catch (err) {
    console.error('[PPX Loader] Unerwarteter Fehler:', err);
  }
})();
