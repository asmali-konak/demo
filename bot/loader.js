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
/* ============================================================================
   PPX Service: Email – Robust v8.1
   - Single Source: window.PPX_DATA.cfg.EMAIL (Alias __PPX_DATA__)
   - init() versucht beide Formen (string / { publicKey })
   - Klare Fehlermeldungen, nie "undefined"
   - Template-Resolver: semantische Keys → echte Template-IDs
   - Config-Validator + Self-Test
   ============================================================================ */
(function () {
  'use strict';
  var W = window;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};

  function raw() { return (W.PPX_DATA || W.__PPX_DATA__ || {}); }
  function cfg() { return (raw().cfg || {}); }
  function emailCfg() { return (cfg().EMAIL || {}); }

  function getPublicKey() { return (emailCfg().publicKey || '').toString().trim(); }
  function getServiceId() { return (emailCfg().service || '').toString().trim(); }

  // --- Template-Resolver ----------------------------------------------------
  var TEMPLATE_ALIASES = {
    reservationOwner: ['reservTemplate', 'toTemplate', 'reservationTemplate', 'template_reserv', 'template_reserv_brand'],
    contactOwner:     ['contactTemplate', 'template_contact', 'template_kontakt_brand'],
    autoReplyUser:    ['autoReplyTemplate', 'template_kunde', 'template_autoreply', 'template_kunde_brand']
  };
  function resolveTemplate(alias) {
    var e = emailCfg();
    var list = TEMPLATE_ALIASES[alias] || [];
    for (var i = 0; i < list.length; i++) {
      var key = list[i];
      if (e[key]) return ('' + e[key]).trim();
    }
    return '';
  }

  // --- Validator & Self-Test -----------------------------------------------
  function validateEmailConfig() {
    var miss = [];
    if (!getPublicKey()) miss.push('EMAIL.publicKey');
    if (!getServiceId()) miss.push('EMAIL.service');
    var anyTpl = resolveTemplate('reservationOwner') || resolveTemplate('contactOwner') || resolveTemplate('autoReplyUser');
    if (!anyTpl) miss.push('mind. 1 Template (reservationOwner/contactOwner/autoReplyUser)');
    return { ok: miss.length === 0, missing: miss };
  }

  function ensureEmailJSReady() {
    var reasons = [];
    if (!W.emailjs || typeof W.emailjs.send !== 'function') reasons.push('emailjs SDK fehlt');
    var v = validateEmailConfig();
    if (!v.ok) reasons.push('Config: ' + v.missing.join(', '));
    if (reasons.length) return { ok: false, reason: reasons.join(' | ') };

    try { try { W.emailjs.init(getPublicKey()); } catch (e1) { W.emailjs.init({ publicKey: getPublicKey() }); } }
    catch (e) { return { ok: false, reason: 'init failed: ' + (e && e.message ? e.message : String(e)) }; }
    return { ok: true };
  }

  // --- Senden ---------------------------------------------------------------
  function sendEmailJS(serviceId, templateId, params) {
    var ready = ensureEmailJSReady();
    if (!ready.ok) return Promise.reject(new Error(ready.reason));

    var s = (serviceId || getServiceId()).trim();
    var t = (templateId || '').trim();
    var p = params || {};
    if (!s) return Promise.reject(new Error('serviceId missing'));
    if (!t) return Promise.reject(new Error('templateId missing'));

    return W.emailjs.send(s, t, p, getPublicKey());
  }

  // Exporte
  PPX.services.email = {
    getPublicKey: getPublicKey,
    getServiceId: getServiceId,
    resolveTemplate: resolveTemplate,
    validateEmailConfig: validateEmailConfig,
    ensureEmailJSReady: ensureEmailJSReady,
    sendEmailJS: sendEmailJS
  };
})();
/* ============================================================================
   PPX Widget Orchestrator (index.js) – v8.1 (robust)
   - Lädt Module sequentiell (wie v7.9.4)
   - Vorab-Diagnostik: PPX_DATA vorhanden? EmailJS-Config valide?
   - Exponiert PPX.safeSend + PPX.email.template(alias)
   - Self-Test via URL-Hash: #ppx-check
   ============================================================================ */
(function () {
  'use strict';
  var d = document, w = window;
  var PPX = w.PPX = w.PPX || {}; PPX.services = PPX.services || {};

  // ---- Sequenzielles Laden (wie bisher) ------------------------------------
  var self = d.currentScript || (function(){ var s=d.getElementsByTagName('script'); return s[s.length-1]; })();
  var src = (self && self.src) || ''; var base = src.replace(/[^\/?#]+(?:\?.*)?$/,'');
  var qs = src.split('?')[1] || ''; var ver = ''; try { ver = new URLSearchParams(qs).get('v') || ''; } catch(e){}
  var cacheParam = ver ? ('v='+encodeURIComponent(ver)) : ('cb='+Date.now());
  function toUrl(path){ var sep = path.indexOf('?')>-1 ? '&':'?'; return base + path + sep + cacheParam; }

  var files = [
    'core.js','ui/styles-inject.js','ui/panel.js',
    'ui/components/buttons.js','ui/components/forms.js',
    'services/email.js','services/openHours.js',
    'flows/home.js','flows/speisen.js','flows/reservieren.js',
    'flows/hours.js','flows/kontakt.js','flows/contactform.js','flows/faq.js'
  ];

  function loadOne(i){ if(i>=files.length){ return finish(); }
    var s=d.createElement('script'); s.src=toUrl(files[i]); s.async=true;
    s.onload=function(){ loadOne(i+1); };
    s.onerror=function(){ console.error('[PPX index] Failed to load:', files[i]); loadOne(i+1); };
    (d.head||d.documentElement).appendChild(s);
  }

  // ---- Diagnostics & Helpers ----------------------------------------------
  function hasPPXData(){ return !!(w.PPX_DATA || w.__PPX_DATA__); }
  function diagBoot(){
    if(!hasPPXData()){ console.error('[PPX boot] PPX_DATA fehlt – bot.json nicht geladen. Prüfe data-config Pfad.'); }
    if(PPX.services.email && PPX.services.email.validateEmailConfig){
      var v = PPX.services.email.validateEmailConfig();
      if(!v.ok){ console.warn('[PPX boot] EmailJS-Konfig unvollständig:', v.missing.join(', ')); }
    }
    if(PPX.services.email && PPX.services.email.ensureEmailJSReady){
      var r = PPX.services.email.ensureEmailJSReady();
      if(!r.ok){ console.warn('[PPX boot] EmailJS not ready →', r.reason); }
    }
  }

  // Einheitliches Senden (niemals "undefined" im Fehler)
  PPX.safeSend = function(serviceId, templateId, params){
    if(!PPX.services.email || !PPX.services.email.sendEmailJS){
      var e = new Error('email service missing'); console.error('[PPX send] FAILED:', e.message); return Promise.reject(e);
    }
    return PPX.services.email.sendEmailJS(serviceId, templateId, params)
      .then(function(r){ console.info('[PPX send] OK', r && r.status); return r; })
      .catch(function(e){ var msg=(e&&e.message)?e.message:String(e); console.warn('[PPX send] FAILED:', msg); throw e; });
  };
  // Semantischer Template-Zugriff für Flows:
  PPX.email = PPX.email || {};
  PPX.email.template = function(alias){
    if(!PPX.services.email || !PPX.services.email.resolveTemplate) return '';
    return PPX.services.email.resolveTemplate(alias);
  };

  // Self-Test (optional): in Adresszeile #ppx-check anhängen
  function selfTest(){
    if(location.hash !== '#ppx-check') return;
    console.group('[PPX Self-Test]');
    try{
      console.log('PPX_DATA present:', hasPPXData());
      if(PPX.services.email){
        console.log('Email validate:', PPX.services.email.validateEmailConfig());
        console.log('Email ready:', PPX.services.email.ensureEmailJSReady());
      }
      var t = PPX.email.template('reservationOwner') || PPX.email.template('contactOwner');
      if(t){ PPX.safeSend(undefined, t, { message:'PPX check', reply_to:'test@example.com' })
            .then(function(){ console.log('Send test: OK'); })
            .catch(function(e){ console.log('Send test: ERR', e.message); }); }
      else { console.log('Send test skipped (kein Template)'); }
    } finally { console.groupEnd(); }
  }

  function finish(){
    try{
      diagBoot(); selfTest();
      if(w.PPX && typeof w.PPX.boot==='function'){ w.PPX.boot(); }
      else if(w.PPX && w.PPX.ui && typeof w.PPX.ui.bindOnce==='function'){ w.PPX.ui.bindOnce(); }
    } catch(e){ console.error('[PPX index] Boot failed:', e); }
  }

  try { loadOne(0); } catch(err){ console.error('[PPX index] Unexpected error:', err); }
})();
