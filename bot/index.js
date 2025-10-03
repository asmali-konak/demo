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
