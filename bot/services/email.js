/* ============================================================================
   PPX Email Service – minimal & robust (EmailJS v3)
   Liest NUR aus window.PPX_DATA.EMAIL. Keine Globals außer window.PPX.
   API:
     PPX.services.email.validateEmailConfig() -> {ok:boolean, reason?}
     PPX.services.email.ensureEmailJSReady()  -> Promise<{ok:boolean, reason?}>
     PPX.services.email.template(key)         -> Template-ID (string|undefined)
     PPX.services.email.send(tpl, params)     -> Promise<EmailJSResponse>
============================================================================ */
(function () {
  var w = window;
  w.PPX = w.PPX || {};
  var S = w.PPX.services = w.PPX.services || {};

  function getCfg() { return (w.PPX_DATA && w.PPX_DATA.EMAIL) || {}; }
  function has(v) { return typeof v === 'string' && v.trim().length > 0; }

  function validateEmailConfig() {
    var C = getCfg();
    if (!has(C.publicKey))  return { ok:false, reason:'Config: EMAIL.publicKey fehlt/leer' };
    if (!has(C.service))    return { ok:false, reason:'Config: EMAIL.service fehlt/leer' };
    if (!has(C.reservTemplate) && !has(C.contactTemplate) && !has(C.autoReplyTemplate))
      return { ok:false, reason:'Config: Mind. eine Template-ID in EMAIL.*Template fehlt' };
    return { ok:true };
  }

  function ensureEmailJSReady() {
    return new Promise(function (resolve) {
      var C = getCfg();
      if (!w.emailjs) { resolve({ ok:false, reason:'emailjs SDK fehlt' }); return; }
      try {
        // v3 akzeptiert init('public_…') oder init({publicKey:'…'})
        if (!w.__PPX_EMAILJS_INIT__) {
          w.emailjs.init(C.publicKey);
          w.__PPX_EMAILJS_INIT__ = true;
        }
        resolve({ ok:true });
      } catch (e) {
        resolve({ ok:false, reason:'init failed: '+ (e && e.message || e) });
      }
    });
  }

  function template(alias) {
    var C = getCfg();
    var map = {
      reservationOwner: C.reservTemplate,
      contactOwner:     C.contactTemplate,
      autoReply:        C.autoReplyTemplate
    };
    return map[alias] || C[alias];
  }

  function send(tpl, params) {
    var C = getCfg();
    if (!has(tpl)) return Promise.reject(new Error('templateId missing'));
    if (!w.emailjs) return Promise.reject(new Error('emailjs SDK fehlt'));
    try {
      return w.emailjs.send(C.service, tpl, params || {});
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // Public API
  S.email = {
    validateEmailConfig: validateEmailConfig,
    ensureEmailJSReady:  ensureEmailJSReady,
    template:            template,
    send:                send
  };
})();
