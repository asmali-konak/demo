/* ============================================================================
   PPX Service: Email (email.js) – v7.9.4
   - getPublicKey(): liest CFG.EMAIL.publicKey
   - ensureEmailJSReady(): prüft window.emailjs und init(key)
   - sendEmailJS(serviceId, templateId, params): delegiert an emailjs.send(...)
   ============================================================================ */
(function () {
  'use strict';

  var W = window;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};

  // --- intern ---------------------------------------------------------------
  function cfg() {
    try { return (PPX.data && typeof PPX.data.cfg === 'function') ? PPX.data.cfg() : (W.PPX_DATA || W.__PPX_DATA__ || {}).cfg || {}; }
    catch (e) { return {}; }
  }

  function getPublicKey() {
    var C = cfg();
    var key = C && C.EMAIL && C.EMAIL.publicKey;
    return key ? String(key).trim() : '';
  }

  function ensureEmailJSReady() {
    try {
      if (!W.emailjs || typeof W.emailjs.send !== 'function') return false;
      var key = getPublicKey();
      if (!key) return false;
      try {
        // emailjs@3 akzeptiert init(string) oder init({ publicKey })
        W.emailjs.init(key);
      } catch (e1) {
        try { W.emailjs.init({ publicKey: key }); } catch (e2) { /* noop */ }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function sendEmailJS(serviceId, templateId, params) {
    var key = getPublicKey();
    if (!W.emailjs) throw new Error('emailjs not loaded');
    if (!key) throw new Error('public key missing');
    return W.emailjs.send(serviceId, templateId, params, key);
  }

  // --- export ---------------------------------------------------------------
  PPX.services.email = {
    getPublicKey: getPublicKey,
    ensureEmailJSReady: ensureEmailJSReady,
    sendEmailJS: sendEmailJS
  };
})();
