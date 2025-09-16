/* ============================================================================
   PPX Flow: Home (home.js) – v7.9.4
   - stepHome(force): baut das Hauptmenü (zentriert), identische Reihenfolge/Icons
   ============================================================================ */
(function () {
  'use strict';

  var W = window;
  var PPX = W.PPX = W.PPX || {};

  function cfg() {
    try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; }
  }

  function stepHome(force){
    var UI = PPX.ui || {};
    var D = document;
    var $view = D.getElementById('ppx-v');
    if (!force && $view && $view.querySelector('[data-block="home"]')) return;

    var brand = (cfg().brand || 'Pizza Papa Hamburg');
    var B = UI.block('Hauptmenü', { hCenter:true });
    B.setAttribute('data-block','home');

    var C = D.createElement('div');
    C.className = 'ppx-body';
    B.appendChild(C);

    C.appendChild(UI.line('👋 WILLKOMMEN BEI ' + brand.toUpperCase() + '!'));
    C.appendChild(UI.line('Schön, dass du da bist. Wie können wir dir heute helfen?'));

    // 1) Speisen
    var r1 = UI.row();
    r1.appendChild(UI.btn('Speisen', function(){ try { PPX.flows.stepSpeisen(); } catch(e){} }, 'ppx-cta', '🍽️'));
    C.appendChild(r1);

    // 2) Reservieren
    var r2 = UI.row();
    r2.appendChild(UI.btn('Reservieren', function(){ try { PPX.flows.stepReservieren(); } catch(e){} }, '', '📅'));
    C.appendChild(r2);

    // 3) Kontaktdaten
    var r3 = UI.row();
    r3.appendChild(UI.btn('Kontaktdaten', function(){ try { PPX.flows.stepKontakt(); } catch(e){} }, '', '☎️'));
    C.appendChild(r3);

    // 4) Kontaktformular
    var r4 = UI.row();
    r4.appendChild(UI.btn('Kontaktformular', function(){ try { PPX.flows.stepContactForm(); } catch(e){} }, '', '📝'));
    C.appendChild(r4);

    // 5) Öffnungszeiten
    var r5 = UI.row();
    r5.appendChild(UI.btn('Öffnungszeiten', function(){ try { PPX.flows.stepHours(); } catch(e){} }, '', '⏰'));
    C.appendChild(r5);

    // 6) Q&As
    var r6 = UI.row();
    r6.appendChild(UI.btn('Q&As', function(){ try { PPX.flows.stepQAs(); } catch(e){} }, '', '❓'));
    C.appendChild(r6);

    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // Export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepHome = stepHome;
})();
