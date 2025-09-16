/* ============================================================================
   PPX Core (core.js) – v7.9.4
   - Namespace & Version
   - Datenzugriff auf window.PPX_DATA / __PPX_DATA__
   - Delays & delay()
   - Utilities (isObj, pretty)
   - Boot-Sequenz (ruft PPX.ui.bindOnce mit gleichen Fallbacks)
   ============================================================================ */
(function () {
  'use strict';

  var W = window;
  var DOC = document;

  // Namespace
  var PPX = W.PPX = W.PPX || {};
  PPX.VERSION = '7.9.4';

  // --- Datenzugriff ----------------------------------------------------------
  // Immer frisch aus PPX_DATA oder __PPX_DATA__ lesen (Single Source of Truth)
  function raw() {
    return (W.PPX_DATA || W.__PPX_DATA__ || {});
  }
  function cfg() {
    var R = raw();
    return R.cfg || R.config || {};
  }
  function dishes() {
    var R = raw();
    return R.dishes || R.menu || {};
  }
  function faqs() {
    var R = raw();
    return R.faqs || R.faq || [];
  }

  // Public Getter
  PPX.data = {
    raw: raw,
    cfg: cfg,
    dishes: dishes,
    faqs: faqs
  };

  // --- Delays & Helper -------------------------------------------------------
  var Delays = { tiny:120, tap:260, step:450, sub:550, long:1000 };
  function delay(fn, ms) { return setTimeout(fn, ms); }

  // Utilities
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function pretty(s) {
    return String(s || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  PPX.util = {
    isObj: isObj,
    pretty: pretty,
    delay: delay
  };
  PPX.D = Delays;

  // --- Boot-Sequenz (entspricht ursprünglicher Bind-Logik) -------------------
  // Ruft PPX.ui.bindOnce() sobald DOM & Elemente bereit sind.
  function tryBind() {
    if (PPX.ui && typeof PPX.ui.bindOnce === 'function') {
      try { return !!PPX.ui.bindOnce(); } catch (e) { /* noop */ }
    }
    return false;
  }

  function boot() {
    // 1) DOMContentLoaded
    if (DOC.readyState === 'loading') {
      var onReady = function () {
        DOC.removeEventListener('DOMContentLoaded', onReady);
        tryBind();
      };
      DOC.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
      tryBind();
    }

    // 2) Fallback via MutationObserver (wie zuvor im Widget)
    var mo = new MutationObserver(function () {
      if (tryBind()) {
        try { mo.disconnect(); } catch (e) {}
      }
    });
    try {
      mo.observe(DOC.documentElement || DOC.body, { childList: true, subtree: true });
      // Sicherheitsnetz nach 5s trennen
      setTimeout(function(){ try { mo.disconnect(); } catch(e){} }, 5000);
    } catch (e) { /* older browsers: ignore */ }
  }

  PPX.boot = boot;

  // Vorbereiten von Teil-Namespaces, die andere Dateien befüllen
  PPX.ui = PPX.ui || {};          // panel, components, helpers
  PPX.services = PPX.services || {}; // email, openHours
  PPX.flows = PPX.flows || {};    // home, speisen, reservieren, hours, kontakt, contactform, faq
})();
