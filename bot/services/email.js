/* ============================================================================
   /bot/services/email.js – Auto-Discovery + Aliase (Pizza-Papa kompatibel)
   - Findet EMAIL-Config automatisch (EMAIL, EMAILJS, email, email_settings, cfg.email*)
   - Akzeptiert Aliase: service|serviceId|service_id, publicKey|public_key|key|public
   - Stellt EM.sendEmailJS(...) + send/sendContact/sendReservation/autoReply bereit
   ============================================================================ */
(function () {
  'use strict';
  var W = window;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};
  var SVC = PPX.services.email = {};

  // ---- Utils ----------------------------------------------------------------
  function log(){ try{ console.log.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function err(){ try{ console.error.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function S(v){ return v==null ? '' : String(v); }
  function DATA(){ return (W.PPX_DATA||{}); }
  function CFG(){ return (DATA().cfg||{}); }

  // ---- Auto-Discovery für EMAIL-Block ---------------------------------------
  function findEmailBlock() {
    var D = DATA();
    var candidates = [];

    // 1) Direkt auf Top-Level nach „email“-
    Object.keys(D).forEach(function(k){
      if (/email/i.test(k)) candidates.push({path:k, obj:D[k]});
    });

    // 2) Unter cfg.* suchen
    var c = CFG();
    Object.keys(c||{}).forEach(function(k){
      if (/email/i.test(k)) candidates.push({path:'cfg.'+k, obj:c[k]});
    });

    // 3) Standardpfade zuletzt
    if (D.EMAIL) candidates.unshift({path:'EMAIL', obj:D.EMAIL});
    if (D.EMAILJS) candidates.unshift({path:'EMAILJS', obj:D.EMAILJS});

    // Erstes Objekt mit irgend einem relevanten Key nehmen
    var pick = candidates.find(function(e){
      var o=e.obj||{};
      return !!(o.service||o.serviceId||o.service_id||o.SERVICE_ID||
                o.publicKey||o.public_key||o.PUBLIC_KEY||o.key||
                o.contactTemplate||o.template_contact||o.contact||
                o.reservTemplate||o.reserveTemplate||o.bookingTemplate||
                o.template_reserv||o.reserv||
                o.autoReplyTemplate||o.autoreplyTemplate||o.autoreply||o.template_autoreply);
    });

    return pick || {path:'(none)', obj:{}};
  }

  function normalizeEmailConfig(){
    var f = findEmailBlock();
    var E = f.obj || {};
    var service   = E.service || E.serviceId || E.service_id || E.SERVICE_ID || '';
    var publicKey = E.publicKey || E.public_key || E.PUBLIC_KEY || E.key || E.public || '';
    var contact   = E.contactTemplate || E.template_contact || E.contact || '';
    var reserv    = E.reservTemplate || E.reserveTemplate || E.bookingTemplate || E.template_reserv || E.reserv || '';
    var auto      = E.autoReplyTemplate || E.autoreplyTemplate || E.autoreply || E.template_autoreply || '';

    var out = {
      sourcePath: f.path,
      service: S(service),
      publicKey: S(publicKey),
      templates: { contact:S(contact), reserv:S(reserv), autoreply:S(auto) }
    };
    return out;
  }

  function ensureSdk(){ if(!W.emailjs){ warn('EmailJS SDK fehlt (window.emailjs).'); return false; } return true; }
  function keysOk(N){ return !!(N.service && N.publicKey); }

  // ---- Core Sender -----------------------------------------------------------
  function sendTemplate(tplId, params){
    return new Promise(function(resolve,reject){
      var N = normalizeEmailConfig();
      if(!ensureSdk() || !keysOk(N)){ 
        warn('Konfiguration erkannt:', N);
        return reject(new Error('EmailJS not ready')); 
      }
      try{ W.emailjs.init(N.publicKey); }catch(e){ /* idempotent */ }
      var defaults = {
        site_name: CFG().siteTitle || CFG().brand || 'Website',
        timestamp: new Date().toISOString()
      };
      var data = Object.assign({}, defaults, params||{});
      log('Sende via EmailJS:', { from:N.sourcePath, service:N.service, template:tplId });
      W.emailjs.send(N.service, tplId, data)
        .then(function(r){ log('send OK', r && r.text || r); resolve(r); })
        .catch(function(e){ err('send FAIL', e && (e.text||e.message) || e); reject(e); });
    });
  }

  // ---- Shim-API (Pizza-Papa kompatibel) -------------------------------------
  var KIND_MAP = { contact:'contact', reserv:'reserv', reserve:'reserv', booking:'reserv', autoreply:'autoreply' };
  function resolveTemplate(kindOrId){
    var k = S(kindOrId).toLowerCase().trim();
    var N = normalizeEmailConfig();
    var m = KIND_MAP[k];
    if(m) return N.templates[m];
    return kindOrId; // direkte Template-ID
  }

  function sendEmailJS(kindOrTemplate, params){
    var tpl = resolveTemplate(kindOrTemplate);
    if(!tpl){ return Promise.reject(new Error('Template-ID unbekannt/leer für "'+kindOrTemplate+'"')); }
    return sendTemplate(tpl, params);
  }

  // Komfort-Wrapper
  function send(kindOrTemplate, params){ return sendEmailJS(kindOrTemplate, params); }
  function sendContact(form){
    var p = Object.assign({ subject:'Kontaktanfrage', reply_to:S(form&&form.email) }, form||{});
    return sendEmailJS('contact', p);
  }
  function sendReservation(form){
    var p = Object.assign({ subject:'Reservierungsanfrage', reply_to:S(form&&form.email) }, form||{});
    return sendEmailJS('reserv', p);
  }
  function autoReply(toEmail, params){
    var p = Object.assign({ to_email:S(toEmail), subject:'Danke für Ihre Nachricht', reply_to:S(toEmail) }, params||{});
    return sendEmailJS('autoreply', p);
  }

  // Public API
  SVC.sendEmailJS = sendEmailJS;
  SVC.send = send;
  SVC.sendContact = sendContact;
  SVC.sendReservation = sendReservation;
  SVC.autoReply = autoReply;

  // Diagnose zum Start
  (function(){
    var N = normalizeEmailConfig();
    log('Service geladen. SDK:', !!W.emailjs, 'Keys OK:', keysOk(N), 'Quelle:', N.sourcePath, 'Templates:', N.templates);
    if(!keysOk(N)) warn('Hinweis: Erwartet werden service + publicKey im gefundenen Block.');
  })();
})();
