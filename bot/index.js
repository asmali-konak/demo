/* ============================================================================
   PPX Widget Orchestrator – Safe Guard v8.1.1
   - Defensive Boot (kein .join auf undefined)
   - Prüft erwartete Module-URLs (200 OK)
   - Initialisiert EmailJS, falls vorhanden
   - Bindet Basis-UI (Launcher/Panel), ohne dein HTML zu verändern
   - Keine neuen Globals außer window.PPX (read-only); liest aus window.PPX_DATA
   ============================================================================ */
(function () {
  var d = document, w = window;

  function now() { return new Date().toISOString().replace('T',' ').split('.')[0]; }
  function log() { try { console.log.apply(console, ['[PPX index]', now(), '|'].concat([].slice.call(arguments))); } catch(_){} }
  function warn(){ try { console.warn.apply(console, ['[PPX index]', now(), '|'].concat([].slice.call(arguments))); } catch(_){} }
  function err(){ try { console.error.apply(console, ['[PPX index]', now(), '|'].concat([].slice.call(arguments))); } catch(_){} }

  // --- Locate loader + config path ------------------------------------------------
  var loader = d.getElementById('ppx-bot-loader');
  if (!loader) { err('Loader <script id="ppx-bot-loader"> nicht gefunden.'); return; }
  var cfgUrl = loader.dataset.config || '/bot-data/bot.json';
  var emailjsFlag = (loader.dataset.emailjs || '').toString().toLowerCase();

  // --- Ensure PPX_DATA is present (try fetch if not yet populated) ----------------
  function ensureConfig(cb){
    if (w.PPX_DATA && typeof w.PPX_DATA === 'object') { cb(); return; }
    fetch(cfgUrl, {cache:'no-store'})
      .then(function(r){ if(!r.ok) throw new Error('config ' + r.status); return r.json(); })
      .then(function(json){ w.PPX_DATA = json; log('Config geladen aus', cfgUrl); cb(); })
      .catch(function(e){ err('Konfiguration konnte nicht geladen werden →', e && e.message || e); });
  }

  // --- EmailJS init (defensiv) ----------------------------------------------------
  function initEmailJS(){
    try {
      if (emailjsFlag !== 'true' && emailjsFlag !== '1' && emailjsFlag !== 'yes') {
        log('EmailJS-Flag ist nicht aktiv (data-emailjs). Überspringe Init.');
        return;
      }
      if (!w.emailjs) { warn('EmailJS SDK nicht vorhanden (window.emailjs fehlt).'); return; }
      var pub = (w.PPX_DATA||{}).EMAIL && w.PPX_DATA.EMAIL.publicKey;
      if (!pub) { warn('EMAIL.publicKey fehlt in bot.json – EmailJS wird nicht initialisiert.'); return; }
      w.emailjs.init(pub);
      log('EmailJS init ok');
    } catch(e) {
      err('EmailJS init failed:', e && e.message || e);
    }
  }

  // --- Module-Existenz prüfen (ohne zu crashen) -----------------------------------
  var required = [
    '/bot/ui/panel.js',
    '/bot/ui/messages.js',
    '/bot/ui/styles-inject.js',
    '/bot/ui/components/buttons.js',
    '/bot/ui/components/forms.js',
    '/bot/services/email.js',
    '/bot/services/openHours.js',
    '/bot/flows/home.js',
    '/bot/flows/speisen.js',
    '/bot/flows/reservieren.js',
    '/bot/flows/hours.js',
    '/bot/flows/kontakt.js',
    '/bot/flows/contactform.js',
    '/bot/flows/faq.js'
  ];

  function checkModules(cb){
    var missing = [];
    var done = 0;
    required.forEach(function(u){
      fetch(u, {cache:'no-store'})
        .then(function(r){ if(!r.ok){ missing.push(u+' ['+r.status+']'); } })
        .catch(function(){ missing.push(u+' [neterr]'); })
        .finally(function(){ done++; if(done===required.length) cb(missing); });
    });
  }

  // --- Minimal UI-Bindings (kollidiert nicht mit deiner HTML-Struktur) ------------
  function bindUI(){
    try {
      var launch = d.getElementById('ppx-launch');
      var panel  = d.getElementById('ppx-panel');
      var close  = d.getElementById('ppx-close');
      if (!launch || !panel) { warn('Launcher/Panel nicht im DOM gefunden – UI-Binding übersprungen.'); return; }
      function open(){ panel.classList.add('ppx-open'); }
      function hide(){ panel.classList.remove('ppx-open'); }
      launch.addEventListener('click', open, {passive:true});
      if (close) close.addEventListener('click', hide, {passive:true});
      log('UI gebunden (Launcher/Panel).');
    } catch(e){ warn('UI-Binding Problem:', e && e.message || e); }
  }

  // --- Bootsequence ----------------------------------------------------------------
  function boot(){
    // 1) E-Mail (optional)
    initEmailJS();

    // 2) Module prüfen
    checkModules(function(missing){
      // Defensiv: missing ist garantiert ein Array
      if (missing.length){
        err('Fehlende Module:', missing.join(', '));
        // Trotzdem UI benutzbar machen, damit die Seite nicht „tot“ wirkt
        bindUI();
        return;
      }
      log('Alle Module erreichbar (200). Starte UI.');
      bindUI();
      // Falls eure UI-Module sich selbst mounten, stört das Binding nicht.
    });
  }

  // --- Start ----------------------------------------------------------------------
  try {
    ensureConfig(boot);
  } catch(e) {
    err('Boot failed (outer):', e && e.message || e);
  }
})();
