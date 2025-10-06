/* ============================================================================
   /bot/services/email.js – v8.4.0
   Auto-Discovery + SDK-Load + Init (stabil)
   - Liest EMAIL-Block aus window.PPX_DATA (SST: bot-data/bot.json)
   - Erwartet Keys: publicKey, service, contactTemplate, reservTemplate, autoReplyTemplate
   - Aliase rückwärtskompatibel
   - Lädt EmailJS-SDK via data-emailjs vom #ppx-bot-loader (Fallback: jsDelivr)
   - Init sicher (alte/neue Signatur), Logging
   - Neu: I18N-Unterstützung (Betreff/Standardtexte je nach PPX.lang)
   ============================================================================ */
(function () {
  'use strict';
  var W = window, D = document, PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};
  var SVC = PPX.services.email = {};

  // ---------- Utils ----------------------------------------------------------
  function log(){ try{ console.log.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function err(){ try{ console.error.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function S(v){ return v==null ? '' : String(v); }
  function DATA(){ return (W.PPX_DATA||{}); }
  function CFG(){ return (DATA().cfg||{}); }
  function nowLang(){ try{ return (PPX.i18n && PPX.i18n.nowLang && PPX.i18n.nowLang()) || PPX.lang || 'de'; }catch(e){ return 'de'; } }
  function T(key, fb){ try{ return (PPX.i18n && PPX.i18n.t) ? PPX.i18n.t(key, fb) : (fb||key); }catch(e){ return fb||key; } }

  // ---------- I18N Defaults --------------------------------------------------
  // Module registriert seine UI-Texte (außerhalb bot.json)
  try {
    (PPX.i18n && PPX.i18n.reg) && PPX.i18n.reg({
      'email.subject.contact':   { de:'Kontaktanfrage',          en:'Contact Inquiry' },
      'email.subject.reserv':    { de:'Reservierungsanfrage',    en:'Reservation Request' },
      'email.subject.autoreply': { de:'Automatische Antwort',    en:'Automatic Reply' },
      'email.brand.default':     { de:'Website',                 en:'Website' }
    });
  } catch(e){}

  // ---------- Konfig-Findung (SST + Aliase) ---------------------------------
  function findEmailBlock() {
    var D0 = DATA(), C0 = CFG(), cand = [];
    if (D0.EMAIL)   cand.push({p:'EMAIL',   o:D0.EMAIL});
    if (D0.EMAILJS) cand.push({p:'EMAILJS', o:D0.EMAILJS});
    Object.keys(D0).forEach(function(k){ if(/email/i.test(k)) cand.push({p:k, o:D0[k]}); });
    Object.keys(C0).forEach(function(k){ if(/email/i.test(k)) cand.push({p:'cfg.'+k, o:C0[k]}); });
    var pick = cand.find(function(e){
      var o=e.o||{};
      return !!(o.service||o.serviceId||o.service_id||o.SERVICE_ID||
                o.publicKey||o.public_key||o.PUBLIC_KEY||o.key||o.public||
                o.contactTemplate||o.template_contact||o.contact||
                o.reservTemplate||o.template_reserv||o.reserv||
                o.autoReplyTemplate||o.template_autoreply||o.autoreply);
    });
    return pick || {p:'(none)', o:{}};
  }

  function norm() {
    var f = findEmailBlock(), E = f.o || {};
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

  // ---------- SDK Laden & Init ----------------------------------------------
  function sdkUrl() {
    var tag = D.getElementById('ppx-bot-loader');
    return (tag && tag.getAttribute('data-emailjs')) ||
           'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
  }

  function ensureSDK() {
    return new Promise(function(resolve, reject){
      if (W.emailjs && typeof W.emailjs.send === 'function') return resolve();
      var s = D.createElement('script');
      s.src = sdkUrl();
      s.async = true;
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error('EmailJS SDK konnte nicht geladen werden.')); };
      (D.head||D.documentElement).appendChild(s);
    });
  }

  function init(publicKey){
    try{
      if (W.emailjs && typeof W.emailjs.init === 'function'){
        if (typeof publicKey === 'string' && publicKey) {
          W.emailjs.init(publicKey);
        } else if (publicKey && publicKey.publicKey) {
          W.emailjs.init(publicKey); // { publicKey: '...' }
        }
      }
    }catch(e){}
  }

  // ---------- Senden ---------------------------------------------------------
  function sendTemplate(tplId, params){
    var N = norm();
    if (!keysOk(N)) {
      warn('Konfiguration unvollständig:', N);
      return Promise.reject(new Error('Email-Konfiguration fehlt (service/publicKey).'));
    }
    var payload = Object.assign({
      site_name: CFG().brand || T('email.brand.default', 'Website'),
      timestamp: new Date().toISOString(),
      lang: nowLang()
    }, params||{});
    log('Sende:', { from:N.sourcePath, service:N.service, template:tplId, lang:payload.lang });

    return ensureSDK()
      .then(function(){ init(N.publicKey); })
      .then(function(){ return W.emailjs.send(N.service, tplId, payload); })
      .then(function(r){ log('send OK', r && (r.text||r.status)); return r; })
      .catch(function(e){
        var msg = (e && (e.text||e.message)) || e;
        err('send FAIL', msg);
        try{
          if (String(msg).match(/403|forbidden|origin/i)) {
            warn('Möglicher EmailJS-Origin-Fehler: Prüfe in EmailJS → Account → Allowed Origins die exakte Codespaces-/Domain-URL.');
          }
        }catch(_){}
        throw e;
      });
  }

  // Mapping von Kurzarten auf Templates
  var KIND = { contact:'contact', reserv:'reserv', reserve:'reserv', booking:'reserv', autoreply:'autoreply' };
  function tplFor(kindOrId){
    var k = S(kindOrId).toLowerCase().trim(), N = norm(), m = KIND[k];
    return m ? N.templates[m] : kindOrId;
  }

  // Öffentliche API (mit I18N-Defaults für Betreff)
  function sendEmailJS(kindOrTemplate, params){
    var tpl = tplFor(kindOrTemplate);
    if (!tpl) return Promise.reject(new Error('Template-ID unbekannt/leer für "'+kindOrTemplate+'"'));
    return sendTemplate(tpl, params);
  }

  function send(kindOrTemplate, params){ return sendEmailJS(kindOrTemplate, params); }

  function subj(kind){
    if (kind==='contact') return T('email.subject.contact','Kontaktanfrage');
    if (kind==='reserv')  return T('email.subject.reserv','Reservierungsanfrage');
    if (kind==='autoreply')return T('email.subject.autoreply','Automatische Antwort');
    return '';
  }

  function sendContact(form){
    form = form || {};
    var kind = 'contact';
    return sendEmailJS(kind, Object.assign({
      subject:    subj(kind),
      from_email: String(form.email||''),
      reply_to:   String(form.email||''),
      from_name:  String((form.name||'') || (form.email||'').split('@')[0] || 'Gast'),
      email:      String(form.email||'')
    }, form));
  }

  function sendReservation(form){
    form = form || {};
    var kind = 'reserv';
    return sendEmailJS(kind, Object.assign({
      subject:    subj(kind),
      from_email: String(form.email||form.from_email||''),
      reply_to:   String(form.email||form.from_email||''),
      from_name:  String(form.name || (form.email||'').split('@')[0] || 'Gast'),
      email:      String(form.email||form.from_email||'')
    }, form));
  }

  function autoReply(toEmail, params){
    var e = String(toEmail||'');
    var kind = 'autoreply';
    return sendEmailJS(kind, Object.assign({
      subject: subj(kind),
      to_email: e,
      email:   e,
      reply_to:e
    }, params||{}));
  }

  // Expose
  SVC.sendEmailJS = sendEmailJS;
  SVC.send = send;
  SVC.sendContact = sendContact;
  SVC.sendReservation = sendReservation;
  SVC.autoReply = autoReply;

  // Boot-Log
  (function(){
    var N = norm();
    log('Service geladen. SDK:', !!W.emailjs, 'Keys OK:', keysOk(N), 'Quelle:', N.sourcePath, 'Templates:', N.templates, 'Lang:', nowLang());
    if(!keysOk(N)) warn('Hinweis: Erwartet werden service + publicKey im gefundenen Block.');
  })();
})();
