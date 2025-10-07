/* ============================================================================
   PPX Flow: Öffnungszeiten (hours.js) – v8.4.1
   - stepHours(): zeigt Stundenliste zentriert (I18N)
   - askReserveAfterHours(): Follow-up CTA (I18N)
   - Änderung: UI.note → UI.line bei hours.ask (ruhige Typo)
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI  = PPX.ui || {};
  var U   = PPX.util || {};
  var DLY = PPX.D || {};
  var OH  = (PPX.services && PPX.services.openHours) || {};
  var I   = PPX.i18n || {};

  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function L(){ try { return (I && I.nowLang && I.nowLang()) || PPX.lang || 'de'; } catch(e){ return 'de'; } }
  function t(k, fb){ try { return (I && I.t) ? I.t(k, fb) : (fb||k); } catch(e){ return fb||k; } }

  // I18N-Schlüssel registrieren
  try { I.reg && I.reg({
    'hours.title':     { de:'ÖFFNUNGSZEITEN', en:'OPENING HOURS' },
    'hours.none':      { de:'Keine Zeiten hinterlegt.', en:'No hours configured.' },
    'hours.ask':       { de:'Samstagabend ist meist voll – möchtest du dir jetzt schon einen Platz sichern?',
                         en:'Saturday evenings are usually busy—want to secure a table now?' },
    'hours.reserve':   { de:'Ja, bitte reservieren', en:'Yes, reserve a table' },
    'hours.nohome':    { de:'Nein, zurück ins Hauptmenü', en:'No, back to main menu' }
  }); } catch(e){}

  function stepHours(){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;

    var B = UI.block(t('hours.title','ÖFFNUNGSZEITEN'), { maxWidth:'100%', hCenter:true });
    B.setAttribute('data-block','hours');

    var C = D.createElement('div'); C.className = 'ppx-body'; C.style.textAlign = 'center';
    B.appendChild(C);

    if (UI.navBottomBackOnly) B.appendChild(UI.navBottomBackOnly(scopeIdx));

    // Linien aus cfg.hoursLines normalisieren, sonst aus OPEN generieren
    var lines = [];
    try {
      var Cfg = cfg();
      lines = OH.normalizeHoursLines ? OH.normalizeHoursLines(Cfg.hoursLines) : [];
      if (!lines.length && OH.hoursFromOpen) lines = OH.hoursFromOpen(L());
    } catch (e) { lines = []; }

    if (!Array.isArray(lines) || !lines.length) {
      C.appendChild(UI.line(t('hours.none','Keine Zeiten hinterlegt.')));
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
    // NOTE→LINE (hours.ask)
    Q.appendChild(UI.line(t('hours.ask','Samstagabend ist meist voll – möchtest du dir jetzt schon einen Platz sichern?')));
    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn(t('hours.reserve','Ja, bitte reservieren'), function(){ try { U.delay(PPX.flows.stepReservieren, DLY.step || 450); } catch(e){} }, 'ppx-cta', '🗓️'));
    r.appendChild(UI.btn(t('hours.nohome','Nein, zurück ins Hauptmenü'), function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    Q.appendChild(r);
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepHours = stepHours;
})();
