/* ============================================================================
   PPX Flow: Kontaktformular (contactform.js) – v8.4.0
   Nutzt PPX.services.email.sendEmailJS('contact', …)
   - I18N (DE/EN) – alle UI-Texte außerhalb der bot.json
   ============================================================================ */
(function () {
  'use strict';
  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  var UI = PPX.ui || {}, U = PPX.util || {}, DLY = PPX.D || {};
  function EM(){ return (W.PPX && W.PPX.services && W.PPX.services.email) || null; } // <- live lookup
  var Forms = (UI && UI.forms) || {};
  var I = PPX.i18n || {};
  var CF = null;

  // ---------- I18N -----------------------------------------------------------
  try { I.reg && I.reg({
    'cf.title':        { de:'KONTAKTFORMULAR', en:'CONTACT FORM' },
    'cf.intro':        { de:'Du möchtest uns gerne eine Nachricht da lassen?', en:'You’d like to leave us a message?' },
    'cf.ask.email':    { de:'Alles klar – dann brauche ich erstmal deine E-Mail-Adresse.', en:'Great—first I’ll need your email address.' },
    'cf.ph.email':     { de:'dein.name@example.com', en:'your.name@example.com' },
    'cf.next':         { de:'Weiter', en:'Next' },
    'cf.err.email':    { de:'Bitte gib eine gültige E-Mail-Adresse ein.', en:'Please enter a valid email address.' },

    'cf.ask.msg':      { de:'Lass uns unten eine Nachricht da.', en:'Leave your message below.' },
    'cf.ph.msg':       { de:'Hier kannst du dein Anliegen äußern. Wir freuen uns über deine Nachricht! :)',
                         en:'Share your request here. We look forward to your message! :)' },
    'cf.send':         { de:'Absenden', en:'Send' },
    'cf.sending':      { de:'SENDE NACHRICHT …', en:'SENDING MESSAGE …' },

    'cf.subject':      { de:'Kontaktanfrage', en:'Contact Inquiry' },
    'cf.success.title':{ de:'NACHRICHT GESENDET', en:'MESSAGE SENT' },
    'cf.success.body': { de:'Danke – deine Nachricht ist bei uns eingegangen. Wir melden uns so schnell wie möglich!',
                         en:'Thanks—your message has arrived. We’ll get back to you as soon as possible!' },

    'cf.error.title':  { de:'SENDEN FEHLGESCHLAGEN', en:'SENDING FAILED' },
    'cf.error.why':    { de:'Uff, das hat leider nicht geklappt. Grund (technisch): {msg}',
                         en:'Oops, that didn’t work. Technical reason: {msg}' },
    'cf.error.try':    { de:'Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.',
                         en:'You can try again or open your email app manually.' },
    'cf.retry':        { de:'Nochmal senden', en:'Send again' },
    'cf.mailto':       { de:'E-Mail manuell öffnen', en:'Open email app' },
    'nav.home':        { de:'Zurück ins Hauptmenü', en:'Back to Main Menu' }
  }); } catch(e){}

  function t(k, fb){ try { return (I && I.t) ? I.t(k, fb) : (fb||k); } catch(e){ return fb||k; } }
  function L(){ try { return (I && I.nowLang && I.nowLang()) || PPX.lang || 'de'; } catch(e){ return 'de'; } }

  // ---------- Flow -----------------------------------------------------------
  function stepContactForm(){
    CF = { email:'', message:'' };
    var B = UI.block(t('cf.title','KONTAKTFORMULAR'), { maxWidth:'100%' });
    B.setAttribute('data-block','cf-intro');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note(t('cf.intro','Du möchtest uns gerne eine Nachricht da lassen?')));
    try { UI.keepBottom(); } catch(e){}
    U.delay(renderContactEmail, DLY.step || 450);
  }

  function renderContactEmail(){
    var B = UI.block(null, { maxWidth:'100%' }); B.setAttribute('data-block','cf-email');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));
    C.appendChild(UI.note(t('cf.ask.email','Alles klar – dann brauche ich erstmal deine E-Mail-Adresse.')));
    var rIn = Forms.inputRow({ type:'email', placeholder:t('cf.ph.email','dein.name@example.com') }); C.appendChild(rIn.row);
    var r = UI.row();
    r.appendChild(UI.btn(t('cf.next','Weiter'), function(){
      var v = Forms.val(rIn.input);
      if (!(Forms.isValidEmail ? Forms.isValidEmail(v) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))){
        alert(t('cf.err.email','Bitte gib eine gültige E-Mail-Adresse ein.')); Forms.focus(rIn.input); return;
      }
      CF.email = v; U.delay(renderContactMessage, DLY.step || 450);
    }, 'ppx-cta', '➡️'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  function renderContactMessage(){
    var B = UI.block(null, { maxWidth:'100%' }); B.setAttribute('data-block','cf-msg');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));
    C.appendChild(UI.note(t('cf.ask.msg','Lass uns unten eine Nachricht da.')));
    var rTa = Forms.textareaRow({ placeholder:t('cf.ph.msg','Hier kannst du dein Anliegen äußern. Wir freuen uns über deine Nachricht! :)') }); C.appendChild(rTa.row);
    var r = UI.row();
    r.appendChild(UI.btn(t('cf.send','Absenden'), function(){
      var msg = Forms.val(rTa.textarea);
      if (!msg){ alert(L()==='en' ? 'Please write a short message.' : 'Bitte schreib kurz, worum es geht.'); Forms.focus(rTa.textarea); return; }
      CF.message = msg; U.delay(submitContactForm, DLY.tap || 260);
    }, 'ppx-cta', '✉️'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  function submitContactForm(){
    var SVC = EM();
    var B = UI.block(t('cf.sending','SENDE NACHRICHT …'), { maxWidth:'100%' }); B.setAttribute('data-block','cf-sending');
    var payload = {
      subject:    t('cf.subject','Kontaktanfrage'),
      email:      CF.email,
      from_email: CF.email,
      reply_to:   CF.email,
      from_name:  (CF.email||'').split('@')[0] || (L()==='en' ? 'Guest' : 'Gast'),
      message:    CF.message,
      lang:       L()
    };
    if (SVC && SVC.sendEmailJS){
      SVC.sendEmailJS('contact', payload)
        .then(function(){ showContactSuccess(); })
        .catch(function(e){
          var msg = e && (e.text||e.message)||'Unbekannter Fehler';
          showContactError(msg, payload);
        });
      return;
    }
    showContactError('Email-Service nicht geladen', payload);
  }

  function mailtoHrefContact(p){
    var cfg = (W.PPX_DATA && W.PPX_DATA.cfg) || {};
    var addr = cfg.email || (cfg.EMAIL && (cfg.EMAIL.to || cfg.EMAIL.toEmail)) || 'info@example.com';
    var subj = t('cf.subject','Kontaktanfrage');
    var bodyLines = (L()==='en'
      ? ['Contact form','Email: '+p.email,'',p.message,'','— sent via bot']
      : ['Kontaktformular','E-Mail: '+p.email,'',p.message,'','— gesendet via Bot']);
    return 'mailto:'+addr+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(bodyLines.join('\n'));
  }

  function showContactSuccess(){
    var B = UI.block(t('cf.success.title','NACHRICHT GESENDET'), { maxWidth:'100%' }); B.setAttribute('data-block','cf-success');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('cf.success.body','Danke – deine Nachricht ist bei uns eingegangen. Wir melden uns so schnell wie möglich!')));
    var r = UI.row(); r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn(t('nav.home','Zurück ins Hauptmenü'), function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  function showContactError(msg, payload){
    var B = UI.block(t('cf.error.title','SENDEN FEHLGESCHLAGEN'), { maxWidth:'100%' }); B.setAttribute('data-block','cf-error');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('cf.error.why','Uff, das hat leider nicht geklappt. Grund (technisch): {msg}').replace('{msg}', String(msg||'unbekannt'))));
    C.appendChild(UI.line(t('cf.error.try','Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.')));
    var r = UI.row();
    r.appendChild(UI.btn(t('cf.retry','Nochmal senden'), function(){ try { U.delay(submitContactForm, DLY.tap || 260); } catch(e){} }, 'ppx-cta', '⤴️'));
    r.appendChild(UI.btn(t('cf.mailto','E-Mail manuell öffnen'), function(){ try { window.location.href = mailtoHrefContact(payload); } catch(e){} }, 'ppx-secondary', '✉️'));
    r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn(t('nav.home','Zurück ins Hauptmenü'), function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  PPX.flows = PPX.flows || {};
  PPX.flows.stepContactForm = stepContactForm;
})();
