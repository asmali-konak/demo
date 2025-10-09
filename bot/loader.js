/* ============================================================================
   PPX Bot Loader – "Never-Undefined" v8.2
   - Lädt bot.json sicher
   - Setzt IMMER window.PPX_DATA (+ Alias __PPX_DATA__)
   - Übernimmt EMAIL / EMAILJS und spiegelt EMAIL -> cfg.EMAIL (falls nicht da)
   - NEU: Übernimmt AI und spiegelt AI -> cfg.AI (falls nicht da)
   - Stellt minimales PPX.data-API bereit
   - Optional: EmailJS laden (per data-emailjs)
   - Lädt danach bot/index.js
   Daten-Attribute am <script id="ppx-bot-loader">:
     data-config="bot-data/bot.json"
     data-widget="bot/index.js?v=9.1.0"
     (optional) data-emailjs="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"
     (optional) data-nocache
   ============================================================================ */
(function () {
  'use strict';
  var W = window, D = document;

  function pickScript() {
    return D.currentScript || D.getElementById('ppx-bot-loader') || D.querySelector('script[data-ppx-loader]');
  }
  function withBust(url, nocache) {
    if (!url) return url;
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
    var src = obj || {};
    var safe = {
      cfg:    (src.cfg || src.config || current.cfg || {}),
      dishes: (src.dishes || src.menu || current.dishes || {}),
      faqs:   (src.faqs || src.faq || current.faqs || []),
      // EMAIL übernehmen
      EMAIL:  (src.EMAIL || src.email || src.EMAILJS || current.EMAIL || current.email || null),
      EMAILJS:(src.EMAILJS || null),
      // *** NEU: AI übernehmen ***
      AI:     (src.AI || current.AI || null)
    };
    // Bridges: EMAIL/AI auch unter cfg.* verfügbar machen (ohne zu überschreiben)
    if (safe.EMAIL && (!safe.cfg || !safe.cfg.EMAIL)) {
      safe.cfg = safe.cfg || {};
      safe.cfg.EMAIL = safe.EMAIL;
    }
    if (safe.AI && (!safe.cfg || !safe.cfg.AI)) {
      safe.cfg = safe.cfg || {};
      safe.cfg.AI = safe.AI;
    }

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
      console.info('[PPX DEBUG] EMAIL at top =', !!x.EMAIL, 'cfg.EMAIL =', !!(x.cfg && x.cfg.EMAIL),
                   '| AI at top =', !!x.AI, 'cfg.AI =', !!(x.cfg && x.cfg.AI));
      return x;
    };
  }
  function loadScript(src, nocache) {
    return new Promise(function (resolve, reject) {
      if (!src) return resolve();
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
          .then(ensurePPXNamespace)
          .then(function(){
            var x = (W.PPX_DATA || {});
            console.info('[PPX Loader] PPX_DATA ready – EMAIL:', !!x.EMAIL, 'cfg.EMAIL:', !!(x.cfg && x.cfg.EMAIL),
                         '| AI:', !!x.AI, 'cfg.AI:', !!(x.cfg && x.cfg.AI));
          });
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
