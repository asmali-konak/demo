/* ============================================================================
   PPX Core (core.js) – v8.5.2
   - Namespace & Version
   - Datenzugriff auf window.PPX_DATA / __PPX_DATA__ (SST)
   - Delays & delay()
   - Utilities (isObj, pretty)
   - I18N-Basis: nowLang(), pick(), t(), reg()
   - Boot-Sequenz (ruft PPX.ui.bindOnce)
   - NEU (minimal): PPX.state { activeFlowId, expecting }
============================================================================ */
(function () {
  'use strict';

  var W = window, DOC = document;
  var PPX = W.PPX = W.PPX || {};
  PPX.VERSION = '8.5.2';

  // Sprache (Start)
  PPX.lang = PPX.lang || 'de';

  // --- Minimaler Global-State für Flow-Steuerung -----------------------------
  // Wird von Flows gesetzt/gelöscht; von AI-Service gelesen.
  PPX.state = PPX.state || { activeFlowId: null, expecting: null };

  // --- Datenzugriff (Single Source of Truth) ---------------------------------
  function raw() { return (W.PPX_DATA || W.__PPX_DATA__ || {}); }
  function cfg() { var R = raw(); return R.cfg || R.config || {}; }
  function dishes() { var R = raw(); return R.dishes || R.menu || {}; }
  function faqs() { var R = raw(); return R.faqs || R.faq || []; }
  function ai() { var R = raw(); return R.AI || {}; }

  PPX.data = { raw: raw, cfg: cfg, dishes: dishes, faqs: faqs, ai: ai };

  // --- Delays & Helper -------------------------------------------------------
  var Delays = { tiny:120, tap:260, step:450, sub:550, long:1000 };
  function delay(fn, ms) { return setTimeout(fn, ms); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function pretty(s) {
    return String(s || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  PPX.util = { isObj: isObj, pretty: pretty, delay: delay };
  PPX.D = Delays;

  // --- I18N ------------------------------------------------------------------
  var I18N = PPX.i18n || {};
  var DICT = I18N._dict || {};

  function nowLang() { return (PPX.lang || 'de'); }

  function pick(v) {
    var L = nowLang();
    if (isObj(v)) {
      if (typeof v[L] !== 'undefined') return v[L];
      if (typeof v.de !== 'undefined') return v.de;
      if (typeof v.en !== 'undefined') return v.en;
      var m = [
        ['title','title_en'], ['name','name_en'], ['label','label_en'],
        ['desc','desc_en'], ['text','text_en'], ['category','category_en']
      ];
      for (var i=0;i<m.length;i++){
        var base=m[i][0], alt=m[i][1];
        if (L==='en' && typeof v[alt] !== 'undefined') return v[alt];
        if (L==='de' && typeof v[base] !== 'undefined') return v[base];
      }
    }
    return v;
  }

  function t(key, fallback) {
    var L = nowLang(), entry = DICT[key];
    if (entry && typeof entry === 'object') {
      if (typeof entry[L] !== 'undefined') return entry[L];
      if (typeof entry.de !== 'undefined') return entry.de;
      if (typeof entry.en !== 'undefined') return entry.en;
    }
    return (typeof fallback !== 'undefined') ? fallback : (key || '');
  }

  function reg(dict) {
    if (!isObj(dict)) return;
    Object.keys(dict).forEach(function (k) {
      var v = dict[k];
      if (isObj(v)) {
        var cur = DICT[k] || {};
        DICT[k] = {
          de: (typeof v.de !== 'undefined') ? v.de : cur.de,
          en: (typeof v.en !== 'undefined') ? v.en : cur.en
        };
      }
    });
  }

  I18N._dict = DICT; I18N.nowLang = nowLang; I18N.pick = pick; I18N.t = t; I18N.reg = reg;
  PPX.i18n = I18N;

  // Sprache im DOM spiegeln + Sync bei Wechsel
  try { DOC.documentElement.setAttribute('data-ppx-lang', nowLang()); } catch (e) {}
  try {
    W.addEventListener('ppx:lang', function (ev) {
      try {
        var next = (ev && ev.detail && ev.detail.lang) ? ev.detail.lang : nowLang();
        PPX.lang = next;
        DOC.documentElement.setAttribute('data-ppx-lang', next);
      } catch (e2) {}
    });
  } catch (e) {}

  // --- Boot-Sequenz ----------------------------------------------------------
  function tryBind() {
    if (PPX.ui && typeof PPX.ui.bindOnce === 'function') {
      try { return !!PPX.ui.bindOnce(); } catch (e) {}
    }
    return false;
  }

  function boot() {
    if (DOC.readyState === 'loading') {
      var onReady = function () { DOC.removeEventListener('DOMContentLoaded', onReady); tryBind(); };
      DOC.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
      tryBind();
    }
    // Fallback: MutationObserver trennt nach Erfolg oder 5s
    var mo = new MutationObserver(function () { if (tryBind()) { try { mo.disconnect(); } catch(e){} } });
    try {
      mo.observe(DOC.documentElement || DOC.body, { childList: true, subtree: true });
      setTimeout(function(){ try { mo.disconnect(); } catch(e){} }, 5000);
    } catch (e) {}
  }

  PPX.boot = boot;

  // Namespaces vorbereiten
  PPX.ui = PPX.ui || {};
  PPX.services = PPX.services || {};
  PPX.flows = PPX.flows || {};
})();
