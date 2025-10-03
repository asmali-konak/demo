/* ============================================================================
   /bot/services/email.js  –  v7.9.4 Shim-kompatibel
   Stellt alte API `EM.sendEmailJS(...)` bereit und moderne Wrapper.
   Single Source of Truth: window.PPX_DATA.EMAIL
   Keine neuen Globals außer window.PPX.
   ============================================================================ */
(function () {
  'use strict';
  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};
  var NS = PPX.services.email = PPX.services.email || {};

  // ---------- Utils -----------------------------------------------------------
  function log(){ try{ console.log.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function warn(){ try{ console.warn.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }
  function err(){ try{ console.error.apply(console, ['[PPX email]'].concat([].slice.call(arguments))); }catch(e){} }

  function EMAIL(){ return (W.PPX_DATA && W.PPX_DATA.EMAIL) || {}; }
  function cfg(){ return (W.PPX_DATA && W.PPX_DATA.cfg) || {}; }
  function safeStr(v){ return (v==null)?'':String(v); }

  // Map „Kinds“ → Templateschlüssel in PPX_DATA.EMAIL
  var KIND_MAP = {
    contact: 'contactTemplate',
    reserv:  'reservTemplate',
    reserve: 'reservTemplate',
    booking: 'reservTemplate',
    autoreply: 'autoReplyTemplate'
  };

  // ---------- Guards ----------------------------------------------------------
  function ensureSdk(){
    if (!W.emailjs) { warn('EmailJS SDK fehlt (window.emailjs).'); return false; }
    return true;
  }

  function ensureKeys(){
    var E = EMAIL();
    var ok = !!(E.publicKey && E.service);
    if (!ok){
      warn('EMAIL.publicKey oder EMAIL.service fehlt in bot.json.');
    }
    return ok;
  }

  // ---------- Core Sender -----------------------------------------------------
  /**
   * Low-level Send (ruft emailjs.send).
   * @param {string} templateId - exakte Template-ID (z. B. 'template_abcd123').
   * @param {object} params - Template-Parameter (name, message, reply_to, etc.).
   * @returns {Promise<{status:number,text:string}>}
   */
  function sendTemplate(templateId, params){
    return new Promise(function(resolve, reject){
      try{
        if (!ensureSdk() || !ensureKeys()) return reject(new Error('EmailJS not ready'));
        var E = EMAIL();
        // emailjs.init nur aufrufen, wenn möglich/sinnvoll (idempotent ok)
        try{ W.emailjs.init(E.publicKey); }catch(e){ /* already inited or sdk variant */ }
        // Defaults aus cfg
        var defaults = {
          site_name: cfg().siteTitle || cfg().brand || 'Website',
          timestamp: new Date().toISOString()
        };
        var data = Object.assign({}, defaults, params || {});

        W.emailjs.send(E.service, templateId, data)
          .then(function(r){ log('send ok', templateId, r && r.text || r); resolve(r); })
          .catch(function(e){ err('send fail', templateId, e && e.text || e); reject(e); });
      }catch(e){
        reject(e);
      }
    });
  }

  /**
   * Kompatible Shim-API:
   * EM.sendEmailJS(kindOrTemplate, params)
   *
   * - Wenn `kindOrTemplate` einem bekannten „Kind“ entspricht (contact/reserv/…),
   *   wird die Template-ID aus PPX_DATA.EMAIL genommen.
   * - Sonst behandeln wir `kindOrTemplate` als direkte Template-ID.
   */
  function sendEmailJS(kindOrTemplate, params){
    var kind = safeStr(kindOrTemplate).toLowerCase().trim();
    var E = EMAIL();
    var key = KIND_MAP[kind]; // z.B. 'contactTemplate'
    var tpl = key ? E[key] : kindOrTemplate; // direkte ID, wenn kein Kind
    if (!tpl){
      return Promise.reject(new Error('Template-ID fehlt (kind="'+kind+'")'));
    }
    return sendTemplate(tpl, params);
  }

  // ---------- Convenience Wrapper --------------------------------------------
  /**
   * Modernere Kurzform: send(kindOrTemplate, params)
   */
  function send(kindOrTemplate, params){
    return sendEmailJS(kindOrTemplate, params);
  }

  /**
   * Spezialisierte Helfer, falls in Flows verwendet:
   */
  function sendContact(formData){
    // Erwartete Felder: name, email, phone, message, subject
    var p = Object.assign({
      subject: 'Kontaktanfrage',
      reply_to: safeStr(formData && formData.email)
    }, formData||{});
    return sendEmailJS('contact', p);
  }

  function sendReservation(formData){
    // Erwartete Felder: name, email, phone, date, time, persons, note
    var p = Object.assign({
      subject: 'Reservierungsanfrage',
      reply_to: safeStr(formData && formData.email)
    }, formData||{});
    return sendEmailJS('reserv', p);
  }

  function autoReply(toEmail, params){
    var p = Object.assign({
      to_email: safeStr(toEmail),
      subject: 'Danke für Ihre Nachricht',
      reply_to: safeStr(toEmail)
    }, params||{});
    return sendEmailJS('autoreply', p);
  }

  // ---------- Public API (Pizza-Papa-kompatibel) ------------------------------
  // Alter Alias „EM“ wurde im Flow oft so verwendet:
  // const EM = PPX.services.email; EM.sendEmailJS(...)
  NS.sendEmailJS = sendEmailJS;
  NS.send        = send;
  NS.sendContact = sendContact;
  NS.sendReservation = sendReservation;
  NS.autoReply   = autoReply;

  // Optional: kleine Diagnose für Entwickler
  log('Service geladen. SDK:', !!W.emailjs, 'Keys:', ensureKeys());
})();
