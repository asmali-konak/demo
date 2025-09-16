/* ============================================================================
   PPX Flow: Kontaktdaten (kontakt.js) – v7.9.4
   - Zeigt Telefon, E-Mail, Adresse mit passenden Aktionen (Call/Mail/Maps)
   - 1:1 Texte/Verhalten zum Original
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI = PPX.ui || {};

  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }

  function stepKontakt(){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var Cfg = cfg();

    var B = UI.block('KONTAKTDATEN', { maxWidth:'100%' });
    B.setAttribute('data-block','kontakt');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));

    // Telefon
    if (Cfg.phone){
      C.appendChild(UI.line('📞 ' + Cfg.phone));
      var r1 = UI.row(); r1.style.justifyContent = 'flex-start';
      r1.appendChild(UI.btn('Anrufen', function(){
        try { window.location.href = 'tel:' + String(Cfg.phone).replace(/\s+/g,''); } catch(e){}
      }, '', '📞'));
      C.appendChild(r1);
    }

    // E-Mail
    if (Cfg.email){
      C.appendChild(UI.line('✉️  ' + Cfg.email));
      var r2 = UI.row(); r2.style.justifyContent = 'flex-start';
      r2.appendChild(UI.btn('E-Mail schreiben', function(){
        try { window.location.href = 'mailto:' + Cfg.email; } catch(e){}
      }, '', '✉️'));
      C.appendChild(r2);
    }

    // Adresse + Maps
    if (Cfg.address){
      C.appendChild(UI.line('📍 ' + Cfg.address));
      var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(Cfg.address);
      var r3 = UI.row(); r3.style.justifyContent = 'flex-start';
      r3.appendChild(UI.btn('Anfahrt öffnen', function(){
        try { window.open(maps, '_blank'); } catch(e){}
      }, '', '🗺️'));
      C.appendChild(r3);
    }

    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepKontakt = stepKontakt;
})();
