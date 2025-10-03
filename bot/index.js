/* ============================================================================
   PPX Orchestrator – Flows Boot (robust + Fallback)
   Keine neuen Globals außer window.PPX; liest nur aus window.PPX_DATA.
   ============================================================================ */
(function(){
  var d=document,w=window; w.PPX=w.PPX||{};

  function log(){ try{ console.log.apply(console,['[PPX index]'].concat([].slice.call(arguments))); }catch(e){} }
  function warn(){ try{ console.warn.apply(console,['[PPX index]'].concat([].slice.call(arguments))); }catch(e){} }
  function err(){ try{ console.error.apply(console,['[PPX index]'].concat([].slice.call(arguments))); }catch(e){} }

  var loader=d.getElementById('ppx-bot-loader');
  if(!loader){ err('Loader <script id="ppx-bot-loader"> fehlt.'); return; }

  var CFG_URL=loader.dataset.config||'/bot-data/bot.json';
  var emailjsFlag=(loader.dataset.emailjs||'').toString().toLowerCase();
  var V=(function(){ var m=/[?&]v=([^&]+)/.exec(loader.dataset.widget||''); return m?('?v='+m[1]):''; })();

  var scripts=[
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

  function loadJSON(u){ return fetch(u,{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status+' '+u); return r.json(); }); }
  function loadScript(u){ return new Promise(function(res,rej){ var s=d.createElement('script'); s.src=u+V; s.async=false; s.defer=true; s.onload=function(){res(u)}; s.onerror=function(){rej(new Error('Script 404 '+u))}; d.head.appendChild(s); }); }
  function series(list){ var p=Promise.resolve(), failed=[]; list.forEach(function(u){ p=p.then(function(){return loadScript(u)}).catch(function(e){ failed.push(u); warn(e.message||e); return Promise.resolve(); }); }); return p.then(function(){return failed}); }

  function initEmailJS(){
    try{
      var active=(emailjsFlag==='true'||emailjsFlag==='1'||emailjsFlag==='yes');
      if(!active){ log('EmailJS Flag aus – übersprungen.'); return; }
      if(!w.emailjs){ warn('EmailJS SDK fehlt (window.emailjs).'); return; }
      var pub=(w.PPX_DATA||{}).EMAIL && w.PPX_DATA.EMAIL.publicKey;
      if(!pub){ warn('EMAIL.publicKey fehlt in bot.json.'); return; }
      w.emailjs.init(pub); log('EmailJS init ok');
    }catch(e){ err('EmailJS init failed:', e && e.message || e); }
  }

  function bindUI(){
    var launch=d.getElementById('ppx-launch'), panel=d.getElementById('ppx-panel'), close=d.getElementById('ppx-close');
    if(!launch||!panel){ warn('Launcher/Panel nicht im DOM – Binding übersprungen.'); return; }
    function open(){ panel.classList.add('ppx-open'); }
    function hide(){ panel.classList.remove('ppx-open'); }
    launch.addEventListener('click',open,{passive:true});
    if(close) close.addEventListener('click',hide,{passive:true});
  }

  function fallbackHome(mount,DATA){
    var c=(DATA&&DATA.cfg)||{}, title=c.siteTitle||'Willkommen', items=[
      {k:'reservieren',label:'Reservieren'},
      {k:'hours',label:'Öffnungszeiten'},
      {k:'speisen',label:'Speisekarte'},
      {k:'kontakt',label:'Kontakt/Anfrage'}
    ];
    mount.innerHTML='<div class="ppx-welcome"><div class="ppx-w-title">'+title+'</div><div class="ppx-w-grid"></div></div>';
    var grid=mount.querySelector('.ppx-w-grid');
    items.forEach(function(it){
      var b=d.createElement('button'); b.className='ppx-btn'; b.textContent=it.label;
      b.onclick=function(){ log('Fallback click:', it.k); };
      grid.appendChild(b);
    });
    log('Fallback-Home gerendert (temporär).');
  }

  function tryStartHome(mount,DATA){
    // 1) Core bevorzugt
    if(w.PPX.core && typeof w.PPX.core.boot==='function'){
      try{ w.PPX.core.boot(mount, DATA); log('PPX.core.boot gestartet.'); return true; }
      catch(e){ err('PPX.core.boot Fehler:', e && e.message || e); }
    }
    // 2) flows.home – mehrere mögliche Signaturen
    var fh=((w.PPX.flows||{}).home)||((w.PPX.flows||{}).Home)||null;
    var fns=['start','init','run','render','show'];
    if(fh){
      for(var i=0;i<fns.length;i++){
        var fn=fns[i];
        try{
          if(typeof fh[fn]==='function'){ fh[fn](mount, DATA); log('flows.home.'+fn+' gestartet.'); return true; }
        }catch(e){ err('flows.home.'+fn+' Fehler:', e && e.message || e); }
      }
      warn('flows.home gefunden, aber keine kompatible Methode.');
    } else {
      warn('flows.home nicht gefunden.');
    }
    // 3) Fallback
    fallbackHome(mount, DATA);
    return false;
  }

  function start(){
    bindUI(); initEmailJS();
    var mount=d.getElementById('ppx-v'); if(!mount){ err('Mount #ppx-v fehlt.'); return; }
    series(scripts).then(function(missing){
      if(missing.length){ warn('Fehlende Module (weiter im Boot):', missing.join(', ')); }
      tryStartHome(mount, w.PPX_DATA);
    });
  }

  // Load config → start
  if(!w.PPX_DATA){
    loadJSON(CFG_URL).then(function(json){ w.PPX_DATA=json; log('Config geladen.'); start(); })
      .catch(function(e){ err('Config-Load fehlgeschlagen:', e && e.message || e); bindUI(); });
  } else {
    start();
  }
})();
