/* ============================================================================
   PPX Orchestrator – Flows Boot (defensiv)
   Keine neuen Globals außer window.PPX; liest nur aus window.PPX_DATA.
   ============================================================================ */
(function () {
  var d = document, w = window;
  w.PPX = w.PPX || {};

  // --- helpers ----------------------------------------------------------------
  function log(){ try{ console.log.apply(console, ['[PPX index]'].concat([].slice.call(arguments)));}catch{} }
  function warn(){ try{ console.warn.apply(console, ['[PPX index]'].concat([].slice.call(arguments)));}catch{} }
  function err(){ try{ console.error.apply(console, ['[PPX index]'].concat([].slice.call(arguments)));}catch{} }

  var loader = d.getElementById('ppx-bot-loader');
  if(!loader){ err('Loader <script id="ppx-bot-loader"> fehlt.'); return; }

  var CFG_URL = loader.dataset.config || '/bot-data/bot.json';
  var emailjsFlag = (loader.dataset.emailjs || '').toString().toLowerCase();
  var V = (function(){ // Versionsstring für Cache-Bust ggf. aus widget
    var wsrc = loader.dataset.widget || ''; var m = /[?&]v=([^&]+)/.exec(wsrc);
    return m ? ('?v=' + m[1]) : '';
  })();

  var scripts = [
    '/bot/ui/styles-inject.js',
    '/bot/ui/panel.js',
    '/bot/ui/components/buttons.js',
    '/bot/ui/components/forms.js',
    '/bot/services/openHours.js',
    '/bot/services/email.js',
    '/bot/flows/home.js',
    '/bot/flows/speisen.js',
    '/bot/flows/reservieren.js',
    '/bot/flows/hours.js',
    '/bot/flows/kontakt.js',
    '/bot/flows/contactform.js',
    '/bot/flows/faq.js',
    '/bot/core.js'
  ];

  function loadJSON(url){ return fetch(url, {cache:'no-store'}).then(function(r){
    if(!r.ok) throw new Error('HTTP '+r.status+' '+url); return r.json();
  });}

  function loadScript(url){
    return new Promise(function(res, rej){
      var s = d.createElement('script');
      s.src = url + V; s.async = false; s.defer = true;
      s.onload = function(){ res(url); };
      s.onerror = function(){ rej(new Error('Script 404 '+url)); };
      d.head.appendChild(s);
    });
  }

  function series(urls){
    var out = Promise.resolve(); var failed = [];
    urls.forEach(function(u){
      out = out.then(function(){ return loadScript(u); })
               .catch(function(e){ failed.push(u); warn(e.message||e); /* continue */ return Promise.resolve(); });
    });
    return out.then(function(){ return failed; });
  }

  function initEmailJS(){
    try{
      var active = (emailjsFlag==='true'||emailjsFlag==='1'||emailjsFlag==='yes');
      if(!active){ log('EmailJS Flag aus – übersprungen.'); return; }
      if(!w.emailjs){ warn('EmailJS SDK fehlt (window.emailjs).'); return; }
      var pub = (w.PPX_DATA||{}).EMAIL && w.PPX_DATA.EMAIL.publicKey;
      if(!pub){ warn('EMAIL.publicKey fehlt in bot.json.'); return; }
      w.emailjs.init(pub); log('EmailJS init ok');
    }catch(e){ err('EmailJS init failed:', e && e.message || e); }
  }

  function bindUI(){
    var launch = d.getElementById('ppx-launch');
    var panel = d.getElementById('ppx-panel');
    var close = d.getElementById('ppx-close');
    if(!launch || !panel){ warn('Launcher/Panel nicht im DOM → Binding übersprungen.'); return; }
    function open(){ panel.classList.add('ppx-open'); }
    function hide(){ panel.classList.remove('ppx-open'); }
    launch.addEventListener('click', open, {passive:true});
    if(close) close.addEventListener('click', hide, {passive:true});
  }

  function startFlows(){
    var mount = d.getElementById('ppx-v');
    if(!mount){ warn('Mount-Element #ppx-v fehlt.'); return; }

    // Core bevorzugt
    if(w.PPX.core && typeof w.PPX.core.boot === 'function'){
      try{ w.PPX.core.boot(mount, w.PPX_DATA); log('PPX.core.boot gestartet.'); return; }
      catch(e){ err('PPX.core.boot Fehler:', e && e.message || e); }
    }

    // Fallback: home flow
    var flows = (w.PPX.flows||{});
    var home = flows.home || (flows.Home||{});
    if(home){
      try{
        if(typeof home.start === 'function'){ home.start(mount, w.PPX_DATA); log('flows.home.start gestartet.'); return; }
        if(typeof home.init === 'function'){ home.init(mount, w.PPX_DATA); log('flows.home.init gestartet.'); return; }
      }catch(e){ err('home flow Fehler:', e && e.message || e); }
    }
    warn('Kein Core/Home-Flow gefunden – Panel bleibt leer.');
  }

  function boot(){
    bindUI();
    initEmailJS();
    series(scripts).then(function(missing){
      if(missing.length){ warn('Fehlende Module (geladen wird trotzdem):', missing.join(', ')); }
      startFlows();
    });
  }

  // Load config then boot
  if(!w.PPX_DATA){
    loadJSON(CFG_URL).then(function(json){ w.PPX_DATA=json; log('Config geladen.'); boot(); })
      .catch(function(e){ err('Config-Load fehlgeschlagen:', e && e.message || e); bindUI(); });
  } else {
    boot();
  }
})();
