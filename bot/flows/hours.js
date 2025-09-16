/* ============================================================================
   PPX Flow: Öffnungszeiten (hours.js) – v7.9.4
   - stepHours(): zeigt Stundenliste zentriert
   - askReserveAfterHours(): Follow-up CTA
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI = PPX.ui || {};
  var U  = PPX.util || {};
  var DLY = PPX.D || {};
  var OH = (PPX.services && PPX.services.openHours) || {};

  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }

  function stepHours(){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;

    var B = UI.block('ÖFFNUNGSZEITEN', { maxWidth:'100%', hCenter:true });
    B.setAttribute('data-block','hours');

    var C = D.createElement('div'); C.className = 'ppx-body'; C.style.textAlign = 'center';
    B.appendChild(C);

    if (UI.navBottomBackOnly) B.appendChild(UI.navBottomBackOnly(scopeIdx));

    // Linien aus cfg.hoursLines normalisieren, sonst aus OPEN generieren
    var lines = [];
    try {
      var Cfg = cfg();
      lines = OH.normalizeHoursLines ? OH.normalizeHoursLines(Cfg.hoursLines) : [];
      if (!lines.length && OH.hoursFromOpen) lines = OH.hoursFromOpen();
    } catch (e) { lines = []; }

    if (!Array.isArray(lines) || !lines.length) {
      C.appendChild(UI.line('Keine Zeiten hinterlegt.'));
    } else {
      lines.forEach(function (rowArr) {
        var txt = Array.isArray(rowArr) ? (rowArr[0] + ': ' + rowArr[1]) : String(rowArr);
        C.appendChild(UI.line('• ' + txt));
      });
    }

    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
    setTimeout(function(){ askReserveAfterHours(scopeIdx); }, 2000);
  }

  function askReserveAfterHours(scopeIdx){
    var Q = UI.block(null, { maxWidth:'100%' });
    Q.setAttribute('data-block','hours-ask');
    Q.appendChild(UI.note('Samstagabend ist meist voll – möchtest du dir jetzt schon einen Platz sichern?'));
    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn('Ja, bitte reservieren', function(){ try { U.delay(PPX.flows.stepReservieren, DLY.step || 450); } catch(e){} }, 'ppx-cta', '🗓️'));
    r.appendChild(UI.btn('Nein, zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    Q.appendChild(r);
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepHours = stepHours;
})();
