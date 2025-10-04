/* ============================================================================
   PPX Flow: Kontaktformular – nutzt PPX.services.email.sendEmailJS('contact', …)
   (Keine Service-ID im Aufruf – das übernimmt der Email-Service.)
   ============================================================================ */
(function () {
  'use strict';
  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  var UI = PPX.ui || {}, U = PPX.util || {}, DLY = PPX.D || {};
  var EM = (PPX.services && PPX.services.email) || {};
  var Forms = (UI && UI.forms) || {};
  var CF = null;

  function stepContactForm(){
    CF = { email:'', message:'' };
    var B = UI.block('KONTAKTFORMULAR', { maxWidth:'100%' });
    B.setAttribute('data-block','cf-intro');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note('Du möchtest uns gerne eine Nachricht da lassen?'));
    try { UI.keepBottom(); } catch(e){}
    U.delay(renderContactEmail, DLY.step || 450);
  }

  function renderContactEmail(){
    var B = UI.block(null, { maxWidth:'100%' }); B.setAttribute('data-block','cf-email');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));
    C.appendChild(UI.note('Alles klar – dann brauche ich erstmal deine E-Mail-Adresse.'));
    var rIn = Forms.inputRow({ type:'email', placeholder:'dein.name@example.com' }); C.appendChild(rIn.row);
    var r = UI.row();
    r.appendChild(UI.btn('Weiter', function(){
      var v = Forms.val(rIn.input);
      if (!(Forms.isValidEmail ? Forms.isValidEmail(v) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))){
        alert('Bitte gib eine gültige E-Mail-Adresse ein.'); Forms.focus(rIn.input); return;
      }
      CF.email = v; U.delay(renderContactMessage, DLY.step || 450);
    }, 'ppx-cta', '➡️'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  function renderContactMessage(){
    var B = UI.block(null, { maxWidth:'100%' }); B.setAttribute('data-block','cf-msg');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));
    C.appendChild(UI.note('Lass uns unten eine Nachricht da.'));
    var rTa = Forms.textareaRow({ placeholder:'Hier kannst du dein Anliegen äußern. Wir freuen uns über deine Nachricht! :)' }); C.appendChild(rTa.row);
    var r = UI.row();
    r.appendChild(UI.btn('Absenden', function(){
      var msg = Forms.val(rTa.textarea);
      if (!msg){ alert('Bitte schreib kurz, worum es geht.'); Forms.focus(rTa.textarea); return; }
      CF.message = msg; U.delay(submitContactForm, DLY.tap || 260);
    }, 'ppx-cta', '✉️'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  function submitContactForm(){
    var B = UI.block('SENDE NACHRICHT …', { maxWidth:'100%' }); B.setAttribute('data-block','cf-sending');
    var payload = { subject:'Kontaktanfrage', email: CF.email, from_email: CF.email, message: CF.message };
    // Wichtig: KEINE Service-ID hier! Der Email-Service kennt service & publicKey aus bot.json
    if (EM && EM.sendEmailJS){
      EM.sendEmailJS('contact', payload)
        .then(function(){ showContactSuccess(); })
        .catch(function(e){ console.warn('[PPX] cf send failed:', e && (e.text||e.message)||e); showContactError(e && (e.text||e.message)||'Unbekannter Fehler', payload); });
      return;
    }
    showContactError('Email-Service nicht geladen', payload);
  }

  function mailtoHrefContact(p){
    var cfg = (W.PPX_DATA && W.PPX_DATA.cfg) || {};
    var addr = cfg.email || (cfg.EMAIL && (cfg.EMAIL.to || cfg.EMAIL.toEmail)) || 'info@example.com';
    var body = encodeURIComponent(['Kontaktformular','E-Mail: '+p.email,'',p.message,'','— gesendet via Bot'].join('\n'));
    return 'mailto:'+addr+'?subject='+encodeURIComponent('Kontaktformular')+'&body='+body;
  }

  function showContactSuccess(){
    var B = UI.block('NACHRICHT GESENDET', { maxWidth:'100%' }); B.setAttribute('data-block','cf-success');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line('Danke – deine Nachricht ist bei uns eingegangen. Wir melden uns so schnell wie möglich!'));
    var r = UI.row(); r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn('Zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  function showContactError(msg, payload){
    var B = UI.block('SENDEN FEHLGESCHLAGEN', { maxWidth:'100%' }); B.setAttribute('data-block','cf-error');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line('Uff, das hat leider nicht geklappt. Grund (technisch): '+(msg||'unbekannt')));
    C.appendChild(UI.line('Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.'));
    var r = UI.row();
    r.appendChild(UI.btn('Nochmal senden', function(){ try { U.delay(submitContactForm, DLY.tap || 260); } catch(e){} }, 'ppx-cta', '⤴️'));
    r.appendChild(UI.btn('E-Mail manuell öffnen', function(){ try { window.location.href = mailtoHrefContact(payload); } catch(e){} }, 'ppx-secondary', '✉️'));
    r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn('Zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r); try { UI.keepBottom(); } catch(e){}
  }

  PPX.flows = PPX.flows || {};
  PPX.flows.stepContactForm = stepContactForm;
})();
