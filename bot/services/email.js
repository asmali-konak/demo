/* ============================================================================
   /bot/services/email.js – Auto-Discovery + SDK-Load + Init
   ============================================================================ */
(function () {
  'use strict';
  var W = window, PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};
  var SVC = PPX.services.email = {};

  function log(){ try{ console.log.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function err(){ try{ console.error.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function S(v){ return v==null ? '' : String(v); }
  function DATA(){ return (W.PPX_DATA||{}); }
  function CFG(){ return (DATA().cfg||{}); }

  function findEmailBlock() {
    var D = DATA(), C = CFG(), cand = [];
    if (D.EMAIL)   cand.push({p:'EMAIL',   o:D.EMAIL});
    if (D.EMAILJS) cand.push({p:'EMAILJS', o:D.EMAILJS});
    Object.keys(D).forEach(function(k){ if(/email/i.test(k)) cand.push({p:k, o:D[k]}); });
    Object.keys(C).forEach(function(k){ if(/email/i.test(k)) cand.push({p:'cfg.'+k, o:C[k]}); });
    var pick = cand.find(function(e){
      var o=e.o||{}; return !!(o.service||o.serviceId||o.service_id||o.SERVICE_ID||
        o.publicKey||o.public_key||o.PUBLIC_KEY||o.key||o.public||
        o.contactTemplate||o.template_contact||o.contact||
        o.reservTemplate||o.template_reserv||o.reserv||
        o.autoReplyTemplate||o.template_autoreply||o.autoreply);
    });
    return pick || {p:'(none)', o:{}};
  }

  function norm() {
    var f = findEmailBlock(), E = f.o||{};
    var service   = E.service || E.serviceId || E.service_id || E.SERVICE_ID || '';
    var publicKey = E.publicKey || E.public_key || E.PUBLIC_KEY || E.key || E.public || '';
    var contact   = E.contactTemplate || E.template_contact || E.contact || '';
    var reserv    = E.reservTemplate  || E.template_reserv  || E.reserv  || '';
    var auto      = E.autoReplyTemplate || E.template_autoreply || E.autoreply || '';
    return {
      sourcePath: f.p,
      service: S(service),
      publicKey: S(publicKey),
      templates: { contact:S(contact), reserv:S(reserv), autoreply:S(auto) }
    };
  }
  function keysOk(N){ return !!(N.service && N.publicKey); }

  function sdkUrl() {
    var tag = document.getElementById('ppx-bot-loader');
    return (tag && tag.getAttribute('data-emailjs')) ||
           'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
  }
  function ensureSDK() {
    return new Promise(function(resolve, reject){
      if (W.emailjs && W.emailjs.send) return resolve();
      var s = document.createElement('script');
      s.src = sdkUrl();
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error('EmailJS SDK konnte nicht geladen werden.')); };
      document.head.appendChild(s);
    });
  }
  function init(publicKey){ try{ W.emailjs && W.emailjs.init && W.emailjs.init(publicKey); }catch(e){} }

  function sendTemplate(tplId, params){
    var N = norm();
    if (!keysOk(N)) {
      warn('Konfiguration unvollständig:', N); 
      return Promise.reject(new Error('Email-Konfiguration fehlt (service/publicKey).'));
    }
    var payload = Object.assign({
      site_name: CFG().brand || 'Website',
      timestamp: new Date().toISOString()
    }, params||{});
    log('Sende:', { from:N.sourcePath, service:N.service, template:tplId });

    return ensureSDK()
      .then(function(){ init(N.publicKey); })
      .then(function(){ return W.emailjs.send(N.service, tplId, payload); })
      .then(function(r){ log('send OK', r && (r.text||r.status)); return r; })
      .catch(function(e){ err('send FAIL', e && (e.text||e.message)||e); throw e; });
  }

  var KIND = { contact:'contact', reserv:'reserv', reserve:'reserv', booking:'reserv', autoreply:'autoreply' };
  function tplFor(kindOrId){
    var k = S(kindOrId).toLowerCase().trim(), N = norm(), m = KIND[k];
    return m ? N.templates[m] : kindOrId;
  }

  function sendEmailJS(kindOrTemplate, params){
    var tpl = tplFor(kindOrTemplate);
    if (!tpl) return Promise.reject(new Error('Template-ID unbekannt/leer für "'+kindOrTemplate+'"'));
    return sendTemplate(tpl, params);
  }

  function send(kindOrTemplate, params){ return sendEmailJS(kindOrTemplate, params); }
  function sendContact(form){ 
    form = form || {};
    return sendEmailJS('contact', Object.assign({
      subject:'Kontaktanfrage',
      from_email: String(form.email||''),
      reply_to:   String(form.email||''),
      from_name:  String((form.name||'') || (form.email||'').split('@')[0] || 'Gast'),
      email:      String(form.email||'')         // <- für Templates mit {{email}}
    }, form));
  }
  function sendReservation(form){
    form = form || {};
    return sendEmailJS('reserv', Object.assign({
      subject:'Reservierungsanfrage',
      from_email: String(form.email||form.from_email||''),
      reply_to:   String(form.email||form.from_email||''),
      from_name:  String(form.name || (form.email||'').split('@')[0] || 'Gast'),
      email:      String(form.email||form.from_email||'') // <- für Templates mit {{email}}
    }, form));
  }
  function autoReply(toEmail, params){ 
    var e = String(toEmail||'');
    return sendEmailJS('autoreply', Object.assign({
      to_email: e,   // viele Templates nutzen das
      email:   e,    // dein Template nutzt {{email}} in "To Email"
      reply_to:e
    }, params||{})); 
  }

  SVC.sendEmailJS = sendEmailJS;
  SVC.send = send;
  SVC.sendContact = sendContact;
  SVC.sendReservation = sendReservation;
  SVC.autoReply = autoReply;

  (function(){
    var N = norm();
    log('Service geladen. SDK:', !!W.emailjs, 'Keys OK:', keysOk(N), 'Quelle:', N.sourcePath, 'Templates:', N.templates);
    if(!keysOk(N)) warn('Hinweis: Erwartet werden service + publicKey im gefundenen Block.');
  })();
})();
