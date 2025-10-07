/* ============================================================================
   PPX Flow: Home (home.js) – v8.4.3
   - stepHome(force): baut das Hauptmenü, identische Reihenfolge/Icons
   - I18N: Alle UI-Texte außerhalb der bot.json registriert (DE/EN)
   - Fix: Reihen/Buttons füllen immer die komplette Zeile (DE & EN)
   - Neu: Sichtbarer Abstand zwischen Icon und Label via withGap()
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  function cfg() {
    try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; }
  }

  // I18N Setup
  (function registerI18N(){
    try {
      var I = PPX.i18n; if (!I || !I.reg) return;
      I.reg({
        'home.title':        { de:'Hauptmenü',                 en:'Main Menu' },
        'home.welcome.1':    { de:'👋 WILLKOMMEN BEI {brand}!', en:'👋 WELCOME TO {brand}!' },
        'home.welcome.2':    { de:'Schön, dass du da bist. Wie können wir dir heute helfen?',
                               en:'Glad you’re here. How can we help today?' },
        'home.menu.dishes':  { de:'Speisen',                   en:'Menu' },
        'home.menu.reserve': { de:'Reservieren',               en:'Reserve' },
        'home.menu.contact': { de:'Kontaktdaten',              en:'Contact Info' },
        'home.menu.form':    { de:'Kontaktformular',           en:'Contact Form' },
        'home.menu.hours':   { de:'Öffnungszeiten',            en:'Opening Hours' },
        'home.menu.faq':     { de:'Q&As',                      en:'Q&As' }
      });
    } catch(e){}
  })();

  function t(key, fb){ try { return (PPX.i18n && PPX.i18n.t) ? PPX.i18n.t(key, fb) : (fb||key); } catch(e){ return fb||key; } }

  // Sichtbarer Abstand zwischen Icon und Textlabel
  // NBSP (U+00A0) kollabiert nicht und bleibt auch bei Flex/Inline sichtbar.
  function withGap(label){
    try { label = String(label||''); } catch(e){ label = label||''; }
    return '\u00A0' + label;
  }

  // Helper: baut eine Row, die IMMER volle Breite füllt
  function fullRow(UI){
    var r = UI.row();
    try {
      r.style.width = '100%';
      r.style.display = 'flex';
      r.style.flex = '1 1 100%';
    } catch(e){}
    return r;
  }

  function stepHome(force){
    var UI = PPX.ui || {};
    var $view = D.getElementById('ppx-v');
    if (!force && $view && $view.querySelector('[data-block="home"]')) return;

    var brand = String(cfg().brand || 'Pizza Papa Hamburg').toUpperCase();

    var B = UI.block(t('home.title','Hauptmenü'), { hCenter:true });
    B.setAttribute('data-block','home');

    var C = D.createElement('div');
    C.className = 'ppx-body';
    B.appendChild(C);

    // Willkommenstexte (Brand einsetzen)
    var welcome1 = t('home.welcome.1','👋 WILLKOMMEN BEI {brand}!').replace('{brand}', brand);
    var welcome2 = t('home.welcome.2','Schön, dass du da bist. Wie können wir dir heute helfen?');
    C.appendChild(UI.line(welcome1));
    C.appendChild(UI.line(welcome2));

    // 1) Speisen
    var r1 = fullRow(UI);
    r1.appendChild(UI.btn(withGap(t('home.menu.dishes','Speisen')), function(){ try { PPX.flows.stepSpeisen(); } catch(e){} }, '', '🍽️'));
    C.appendChild(r1);

    // 2) Reservieren
    var r2 = fullRow(UI);
    r2.appendChild(UI.btn(withGap(t('home.menu.reserve','Reservieren')), function(){ try { PPX.flows.stepReservieren(); } catch(e){} }, '', '📅'));
    C.appendChild(r2);

    // 3) Kontaktdaten
    var r3 = fullRow(UI);
    r3.appendChild(UI.btn(withGap(t('home.menu.contact','Kontaktdaten')), function(){ try { PPX.flows.stepKontakt(); } catch(e){} }, '', '☎️'));
    C.appendChild(r3);

    // 4) Kontaktformular
    var r4 = fullRow(UI);
    r4.appendChild(UI.btn(withGap(t('home.menu.form','Kontaktformular')), function(){ try { PPX.flows.stepContactForm(); } catch(e){} }, '', '📝'));
    C.appendChild(r4);

    // 5) Öffnungszeiten
    var r5 = fullRow(UI);
    r5.appendChild(UI.btn(withGap(t('home.menu.hours','Öffnungszeiten')), function(){ try { PPX.flows.stepHours(); } catch(e){} }, '', '⏰'));
    C.appendChild(r5);

    // 6) Q&As
    var r6 = fullRow(UI);
    r6.appendChild(UI.btn(withGap(t('home.menu.faq','Q&As')), function(){ try { PPX.flows.stepQAs(); } catch(e){} }, '', '❓'));
    C.appendChild(r6);

    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // Export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepHome = stepHome;
})();
