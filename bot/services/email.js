/* ============================================================================
   /bot/services/email.js – v7.9.4 compat + Alias-Normalisierung
   - Akzeptiert aliasierte Keys in PPX_DATA.EMAIL (serviceId/service, publicKey/public_key)
   - Stellt EM.sendEmailJS(...) + send/sendContact/sendReservation/autoReply bereit
   - Robustes Logging (welche Werte wirklich genutzt werden)
   ============================================================================ */
(function () {
  'use strict';
  var W = window;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};

  var SVC = PPX.services.email = {};

  // ---------- Utils ----------
  function log(){ try{ console.log.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function err(){ try{ console.error.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function safe(v){ return v==null ? '' : String(v); }
  function DATA(){ return (W.PPX_DATA||{}); }
  function CFG(){ return (DATA().cfg||{}); }

  // Normalisiert EMAIL-Konfig aus bot.json (alle üblichen Aliase)
  function EMAIL(){
    var E = (DATA().EMAIL||{});
    var service = E.service || E.serviceId || E.service_id || E.SERVICE_ID || '';
    var publicKey = E.publicKey || E.public_key || E.public || E.key || E.PUBLIC_KEY || '';
    var contactTpl = E.contactTemplate || E.template_contact || E.contactTpl || E.contact || '';
    var reservTpl  = E.reservTemplate  || E.reserveTemplate || E.bookingTemplate || E.template_reserv || E.reserv || '';
    var autoTpl    = E.autoReplyTemplate || E.autoreplyTemplate || E.autoreply || E.template_autoreply || '';
    return {
      service: safe(service),
      publicKey: safe(publicKey),
      templates: {
        contact: safe(contactTpl),
        reserv:  safe(reservTpl),
        autoreply: safe(autoTpl)
      }
    };
  }

  function ensureSdk(){
    if(!W.emailjs){ warn('EmailJS SDK fehlt (window.emailjs).'); return false; }
    return true;
  }
  function hasKeys(N){
    return !!(N.publicKey && N.service);
  }

  // Low-level Sender
  function sendTemplate(tplId, params){
    return new Promise(function(resolve,reject){
      var N = EMAIL();
      if(!ensureSdk() || !hasKeys(N)) return reject(new Error('EmailJS not ready'));
      try{ W.emailjs.init(N.publicKey); }catch(e){ /* idempotent */ }
      var defaults = {
        site_name: CFG().siteTitle || CFG().brand || 'Website',
        timestamp: new Date().toISOString()
      };
      var data = Object.assign({}, defaults, params||{});
      log('Sende via EmailJS:', { service:N.service, template:tplId });
      W.emailjs.send(N.service, tplId, data)
        .then(function(r){ log('send OK', r && r.text || r); resolve(r); })
        .catch(function(e){ err('send FAIL', e && (e.text||e.message) || e); reject(e); });
    });
  }

  // Shim-API (Pizza-Papa kompatibel)
  var KIND_MAP = { contact:'contact', reserv:'reserv', reserve:'reserv', booking:'reserv', autoreply:'autoreply' };
  function resolveTemplate(kindOrId){
    var k = safe(kindOrId).toLowerCase().trim();
    var N = EMAIL();
    var mapped = KIND_MAP[k];
    if(mapped){ return N.templates[mapped]; }
    // ansonsten: direkte ID durchreichen
    return kindOrId;
  }

  function sendEmailJS(kindOrTemplate, params){
    var tpl = resolveTemplate(kindOrTemplate);
    if(!tpl){ return Promise.reject(new Error('Template-ID unbekannt/leer für "'+kindOrTemplate+'"')); }
    return sendTemplate(tpl, params);
  }

  // Komfort-Wrapper
  function send(kindOrTemplate, params){ return sendEmailJS(kindOrTemplate, params); }
  function sendContact(form){
    var p = Object.assign({
      subject:'Kontaktanfrage',
      reply_to: safe(form && form.email)
    }, form||{});
    return sendEmailJS('contact', p);
  }
  function sendReservation(form){
    var p = Object.assign({
      subject:'Reservierungsanfrage',
      reply_to: safe(form && form.email)
    }, form||{});
    return sendEmailJS('reserv', p);
  }
  function autoReply(toEmail, params){
    var p = Object.assign({
      to_email: safe(toEmail),
      subject: 'Danke für Ihre Nachricht',
      reply_to: safe(toEmail)
    }, params||{});
    return sendEmailJS('autoreply', p);
  }

  // Public API
  SVC.sendEmailJS = sendEmailJS;
  SVC.send = send;
  SVC.sendContact = sendContact;
  SVC.sendReservation = sendReservation;
  SVC.autoReply = autoReply;

  // Diagnose
  (function(){
    var N = EMAIL();
    log('Service geladen. SDK:', !!W.emailjs, 'Keys OK:', hasKeys(N));
    if(!hasKeys(N)){
      warn('Konfiguration erkannt:', {
        service: N.service ? '✓' : '(leer)',
        publicKey: N.publicKey ? '✓' : '(leer)',
        templates: N.templates
      });
    } else {
      log('Benutze:', { service:N.service, publicKey:'***'+N.publicKey.slice(-4),
                        templates:N.templates });
    }
  })();
})();
