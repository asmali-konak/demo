/* ============================================================================
   PPX Service: Email – Robust v8.1
   - Single Source: window.PPX_DATA.cfg.EMAIL (Alias __PPX_DATA__)
   - init() versucht beide Formen (string / { publicKey })
   - Klare Fehlermeldungen, nie "undefined"
   - Template-Resolver: semantische Keys → echte Template-IDs
   - Config-Validator + Self-Test
   ============================================================================ */
(function () {
  'use strict';
  var W = window;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};

  function raw() { return (W.PPX_DATA || W.__PPX_DATA__ || {}); }
  function cfg() { return (raw().cfg || {}); }
  function emailCfg() { return (cfg().EMAIL || {}); }

  function getPublicKey() { return (emailCfg().publicKey || '').toString().trim(); }
  function getServiceId() { return (emailCfg().service || '').toString().trim(); }

  // --- Template-Resolver ----------------------------------------------------
  var TEMPLATE_ALIASES = {
    reservationOwner: ['reservTemplate', 'toTemplate', 'reservationTemplate', 'template_reserv', 'template_reserv_brand'],
    contactOwner:     ['contactTemplate', 'template_contact', 'template_kontakt_brand'],
    autoReplyUser:    ['autoReplyTemplate', 'template_kunde', 'template_autoreply', 'template_kunde_brand']
  };
  function resolveTemplate(alias) {
    var e = emailCfg();
    var list = TEMPLATE_ALIASES[alias] || [];
    for (var i = 0; i < list.length; i++) {
      var key = list[i];
      if (e[key]) return ('' + e[key]).trim();
    }
    return '';
  }

  // --- Validator & Self-Test -----------------------------------------------
  function validateEmailConfig() {
    var miss = [];
    if (!getPublicKey()) miss.push('EMAIL.publicKey');
    if (!getServiceId()) miss.push('EMAIL.service');
    var anyTpl = resolveTemplate('reservationOwner') || resolveTemplate('contactOwner') || resolveTemplate('autoReplyUser');
    if (!anyTpl) miss.push('mind. 1 Template (reservationOwner/contactOwner/autoReplyUser)');
    return { ok: miss.length === 0, missing: miss };
  }

  function ensureEmailJSReady() {
    var reasons = [];
    if (!W.emailjs || typeof W.emailjs.send !== 'function') reasons.push('emailjs SDK fehlt');
    var v = validateEmailConfig();
    if (!v.ok) reasons.push('Config: ' + v.missing.join(', '));
    if (reasons.length) return { ok: false, reason: reasons.join(' | ') };

    try { try { W.emailjs.init(getPublicKey()); } catch (e1) { W.emailjs.init({ publicKey: getPublicKey() }); } }
    catch (e) { return { ok: false, reason: 'init failed: ' + (e && e.message ? e.message : String(e)) }; }
    return { ok: true };
  }

  // --- Senden ---------------------------------------------------------------
  function sendEmailJS(serviceId, templateId, params) {
    var ready = ensureEmailJSReady();
    if (!ready.ok) return Promise.reject(new Error(ready.reason));

    var s = (serviceId || getServiceId()).trim();
    var t = (templateId || '').trim();
    var p = params || {};
    if (!s) return Promise.reject(new Error('serviceId missing'));
    if (!t) return Promise.reject(new Error('templateId missing'));

    return W.emailjs.send(s, t, p, getPublicKey());
  }

  // Exporte
  PPX.services.email = {
    getPublicKey: getPublicKey,
    getServiceId: getServiceId,
    resolveTemplate: resolveTemplate,
    validateEmailConfig: validateEmailConfig,
    ensureEmailJSReady: ensureEmailJSReady,
    sendEmailJS: sendEmailJS
  };
})();
