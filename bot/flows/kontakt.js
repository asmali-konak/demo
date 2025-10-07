/* ============================================================================
   PPX Flow: Kontaktdaten (kontakt.js) – v8.4.1
   - Zeigt Telefon, E-Mail, Adresse mit passenden Aktionen (Call/Mail/Maps)
   - I18N (DE/EN) – Texte außerhalb bot.json
   - Typo-Check: Nur UI.line für ruhige Textdarstellung (kein UI.note)
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI = PPX.ui || {};
  var I  = PPX.i18n || {};

  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function t(k, fb){ try { return (I && I.t) ? I.t(k, fb) : (fb||k); } catch(e){ return fb||k; } }

  // I18N-Schlüssel registrieren
  try { I.reg && I.reg({
    'contact.title': { de:'KONTAKTDATEN', en:'CONTACT INFO' },
    'contact.call':  { de:'Anrufen',      en:'Call' },
    'contact.email': { de:'E-Mail schreiben', en:'Send email' },
    'contact.route': { de:'Anfahrt öffnen',   en:'Open directions' }
  }); } catch(e){}

  function stepKontakt(){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var Cfg = cfg();

    var B = UI.block(t('contact.title','KONTAKTDATEN'), { maxWidth:'100%' });
    B.setAttribute('data-block','kontakt');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));

    // Telefon
    if (Cfg.phone){
      C.appendChild(UI.line('📞 ' + Cfg.phone));
      var r1 = UI.row(); r1.style.justifyContent = 'flex-start';
      r1.appendChild(UI.btn(t('contact.call','Anrufen'), function(){
        try { window.location.href = 'tel:' + String(Cfg.phone).replace(/\s+/g,''); } catch(e){}
      }, '', '📞'));
      C.appendChild(r1);
    }

    // E-Mail
    if (Cfg.email){
      C.appendChild(UI.line('✉️  ' + Cfg.email));
      var r2 = UI.row(); r2.style.justifyContent = 'flex-start';
      r2.appendChild(UI.btn(t('contact.email','E-Mail schreiben'), function(){
        try { window.location.href = 'mailto:' + Cfg.email; } catch(e){}
      }, '', '✉️'));
      C.appendChild(r2);
    }

    // Adresse + Maps
    if (Cfg.address){
      C.appendChild(UI.line('📍 ' + Cfg.address));
      var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(Cfg.address);
      var r3 = UI.row(); r3.style.justifyContent = 'flex-start';
      r3.appendChild(UI.btn(t('contact.route','Anfahrt öffnen'), function(){
        try { window.open(maps, '_blank', 'noopener'); } catch(e){}
      }, '', '🗺️'));
      C.appendChild(r3);
    }

    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepKontakt = stepKontakt;
})();
