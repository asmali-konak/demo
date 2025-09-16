/* ============================================================================
   PPX Flow: Kontaktformular (contactform.js) – v7.9.4
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI = PPX.ui || {};
  var U  = PPX.util || {};
  var DLY = PPX.D || {};
  var EM = (PPX.services && PPX.services.email) || {};
  var Forms = (UI && UI.forms) || {};

  var CF = null;

  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }

  // --- start -----------------------------------------------------------------
  function stepContactForm(){
    CF = { email:'', message:'' };

    var B = UI.block('KONTAKTFORMULAR', { maxWidth:'100%' });
    B.setAttribute('data-block','cf-intro');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);

    C.appendChild(UI.note('Du möchtest uns gerne eine Nachricht da lassen?'));
    try { UI.keepBottom(); } catch(e){}

    // Wichtig: Hier KEINE navBottom – erst ab der E-Mail-Eingabe anzeigen
    U.delay(renderContactEmail, DLY.step || 450);
  }

  // --- email -----------------------------------------------------------------
  function renderContactEmail(){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','cf-email');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    // Ab hier Navigationsleiste unten sichtbar (Zurück / Hauptmenü)
    B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));

    C.appendChild(UI.note('Alles klar – dann brauche ich erstmal deine E-Mail-Adresse.'));
    var rIn = Forms.inputRow({ type:'email', placeholder:'dein.name@example.com' });
    C.appendChild(rIn.row);

    var r = UI.row();
    r.appendChild(UI.btn('Weiter', function(){
      var v = Forms.val(rIn.input);
      if (!(Forms.isValidEmail ? Forms.isValidEmail(v) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))){
        alert('Bitte gib eine gültige E-Mail-Adresse ein.'); Forms.focus(rIn.input); return;
      }
      CF.email = v;
      U.delay(renderContactMessage, DLY.step || 450);
    }, 'ppx-cta', '➡️'));
    C.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  // --- message ---------------------------------------------------------------
  function renderContactMessage(){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','cf-msg');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));

    C.appendChild(UI.note('Lass uns unten eine Nachricht da.'));
    var rTa = Forms.textareaRow({ placeholder:'Hier kannst du dein Anliegen äußern. Wir freuen uns über deine Nachricht! :)' });
    C.appendChild(rTa.row);

    var r = UI.row();
    r.appendChild(UI.btn('Absenden', function(){
      var msg = Forms.val(rTa.textarea);
      if (!msg){ alert('Bitte schreib kurz, worum es geht.'); Forms.focus(rTa.textarea); return; }
      CF.message = msg;
      U.delay(submitContactForm, DLY.tap || 260);
    }, 'ppx-cta', '✉️'));
    C.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  // --- submit ----------------------------------------------------------------
  function submitContactForm(){
    var Cfg = cfg();
    var payload = { brand: (Cfg.brand || 'Restaurant'), email: CF.email, message: CF.message };
    var svcId = Cfg.EMAIL && (Cfg.EMAIL.service || Cfg.EMAIL.serviceId);
    var tplContact = Cfg.EMAIL && (Cfg.EMAIL.contactTemplate || Cfg.EMAIL.contactTemplateId);
    var tplContactAuto = Cfg.EMAIL && Cfg.EMAIL.contactAutoReplyTemplate;

    var B = UI.block('SENDE NACHRICHT …', { maxWidth:'100%' });
    B.setAttribute('data-block','cf-sending');

    if (svcId && tplContact && EM.ensureEmailJSReady && EM.ensureEmailJSReady()){
      EM.sendEmailJS(svcId, tplContact, payload).then(function(){
        if (tplContactAuto){
          return EM.sendEmailJS(svcId, tplContactAuto, payload)
            .catch(function(e){ console.warn('[PPX] cf auto-reply failed:', e && e.message); });
        }
      }).then(function(){ showContactSuccess('emailjs'); })
        .catch(function(err){ console.warn('[PPX] cf send failed:', err && err.message); showContactError(err && err.message, payload); });
      return;
    }
    showContactError('EmailJS nicht verfügbar', payload);
  }

  function mailtoHrefContact(p){
    var Cfg = cfg();
    var addr = Cfg.email || (Cfg.EMAIL && (Cfg.EMAIL.to || Cfg.EMAIL.toEmail)) || 'info@example.com';
    var body = encodeURIComponent(['Kontaktformular','E-Mail: '+p.email,'',p.message,'','— gesendet via Bot'].join('\n'));
    return 'mailto:'+addr+'?subject='+encodeURIComponent('Kontaktformular')+'&body='+body;
  }

  // --- outcomes --------------------------------------------------------------
  function showContactSuccess(kind){
    var B = UI.block('NACHRICHT GESENDET', { maxWidth:'100%' });
    B.setAttribute('data-block','cf-success');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line('Danke – deine Nachricht ist bei uns eingegangen. Wir melden uns so schnell wie möglich!'));
    var r = UI.row();
    r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn('Zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  function showContactError(msg, payload){
    var B = UI.block('SENDEN FEHLGESCHLAGEN', { maxWidth:'100%' });
    B.setAttribute('data-block','cf-error');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line('Uff, das hat leider nicht geklappt. Grund (technisch): '+(msg||'unbekannt')));
    C.appendChild(UI.line('Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.'));
    var r = UI.row();
    r.appendChild(UI.btn('Nochmal senden', function(){ try { U.delay(submitContactForm, DLY.tap || 260); } catch(e){} }, 'ppx-cta', '⤴️'));
    r.appendChild(UI.btn('E-Mail manuell öffnen', function(){ try { window.location.href = mailtoHrefContact(payload); } catch(e){} }, 'ppx-secondary', '✉️'));
    r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn('Zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepContactForm = stepContactForm;
})();
