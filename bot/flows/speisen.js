/* ============================================================================
   PPX Flow: Speisen (speisen.js) – v7.9.4
   - stepSpeisen() Intro + Delay → renderSpeisenRoot()
   - orderCats(keys) mit CFG.menuOrder
   - renderSpeisenRoot(): PDF-Button + Kategorien-Grid
   - renderCategory(): Items-Grid (Fallback, wenn leer)
   - renderItem(): Detail + Reservierungsfrage nach 3s
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function dishes(){ try { return (PPX.data && PPX.data.dishes && PPX.data.dishes()) || {}; } catch(e){ return {}; } }

  var U = PPX.util || {};
  var UI = PPX.ui || {};
  var DLY = PPX.D || {};
  var delay = U.delay || function(fn,ms){ return setTimeout(fn, ms); };
  var pretty = U.pretty || function(s){ return s; };

  // ---- Flow: Einstieg -------------------------------------------------------
  function stepSpeisen(){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var M = UI.block(null, { maxWidth:'100%' });
    M.setAttribute('data-block','speisen-info');
    var Cb = D.createElement('div'); Cb.className = 'ppx-body'; M.appendChild(Cb);
    Cb.appendChild(UI.note('Super Wahl 👍  Hier sind unsere Speisen-Kategorien:'));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    delay(function(){ renderSpeisenRoot(scopeIdx); }, DLY.step || 450);
  }

  // ---- Helpers --------------------------------------------------------------
  function orderCats(keys){
    var morder = [];
    try {
      var conf = cfg();
      if (Array.isArray(conf.menuOrder) && conf.menuOrder.length) {
        morder = conf.menuOrder.map(pretty);
      } else {
        morder = ['Antipasti','Salate','Pizza','Pasta','Desserts','Getränke'];
      }
    } catch(e){ morder = ['Antipasti','Salate','Pizza','Pasta','Desserts','Getränke']; }

    var pos = Object.create(null);
    morder.forEach(function(k,i){ pos[k] = i; });

    return keys.slice().sort(function(a,b){
      var ia = (a in pos) ? pos[a] : 999;
      var ib = (b in pos) ? pos[b] : 999;
      return ia - ib || a.localeCompare(b);
    });
  }

  // ---- Root: PDF + Kategorien ----------------------------------------------
  function renderSpeisenRoot(scopeIdx){
    var B = UI.block('SPEISEN', { maxWidth:'100%' });
    B.setAttribute('data-block','speisen-root');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    // PDF URL-Auflösung (gleiche Reihenfolge wie Original)
    var Cfg = cfg();
    var pdfUrl = (Cfg.menuPdf) ||
                 (Cfg.pdf && (Cfg.pdf.menu || Cfg.pdf.url)) ||
                 Cfg.menuPDF ||
                 'speisekarte.pdf';

    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn('Speisekarte als PDF', function(){
      try { window.open(pdfUrl, '_blank', 'noopener'); } catch(e){}
    }, '', '📄'));
    C.appendChild(r);
    C.appendChild(UI.note('…oder wähle eine Kategorie:'));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    delay(function(){
      var DISH = dishes();
      var cats = Object.keys(DISH || {});
      cats = cats.length ? orderCats(cats.map(function(k){ return pretty(k); }))
                         : ['Antipasti','Salate','Pizza','Pasta','Desserts','Getränke'];

      var map = {};
      Object.keys(DISH || {}).forEach(function(k){ map[pretty(k)] = k; });

      var G = UI.grid();
      cats.forEach(function(catPretty){
        var rawKey = map[catPretty] || catPretty.toLowerCase();
        G.appendChild(UI.chip(catPretty, function(){ renderCategory(rawKey); }, 'ppx-cat', '►'));
      });
      C.appendChild(G);
      try { UI.keepBottom && UI.keepBottom(); } catch(e){}
    }, DLY.long || 1000);
  }

  // ---- Kategorie → Items ----------------------------------------------------
  function renderCategory(catKey){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','speisen-cat');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    C.appendChild(UI.note('Gern! Hier ist die Auswahl für ' + pretty(catKey) + ':'));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    var list = [];
    try {
      var DISH = dishes();
      list = Array.isArray(DISH[catKey]) ? DISH[catKey] : [];
    } catch(e){ list = []; }

    if (!list.length) {
      list = [
        { name: pretty(catKey)+' Classic', price:'9,50 €' },
        { name: pretty(catKey)+' Special', price:'12,90 €' }
      ];
    }

    var G = UI.grid();
    list.forEach(function(it){
      var label = (it && it.name) ? it.name : 'Artikel';
      G.appendChild(UI.chip(label, function(){ renderItem(catKey, it); }, '', '➜'));
    });
    C.appendChild(G);
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // ---- Item → Detail + „Reservieren?“ --------------------------------------
  function renderItem(catKey, item){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','speisen-item');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    var title = (item && item.name) ? item.name : pretty(catKey);
    C.appendChild(UI.note(title));
    if (item && (item.info || item.desc)) C.appendChild(UI.line(item.info || item.desc));
    if (item && item.price) C.appendChild(UI.line('Preis: ' + String(item.price)));
    if (item && item.hinweis) C.appendChild(UI.line('ℹ️ ' + item.hinweis));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    setTimeout(function(){ askReserveAfterItem(scopeIdx); }, 3000);
  }

  function askReserveAfterItem(scopeIdx){
    var Q = UI.block(null, { maxWidth:'100%' });
    Q.setAttribute('data-block','speisen-item-ask');
    Q.appendChild(UI.note('Na, Appetit bekommen? 😍 Soll ich dir gleich einen Tisch reservieren?'));
    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn('Ja, bitte reservieren', function(){ 
      try { (PPX.flows && PPX.flows.stepReservieren) ? delay(PPX.flows.stepReservieren, DLY.step || 450) : null; } catch(e){}
    }, 'ppx-cta', '🗓️'));
    r.appendChild(UI.btn('Nein, zurück ins Hauptmenü', function(){ 
      try { UI.goHome && UI.goHome(); } catch(e){}
    }, 'ppx-secondary', '🏠'));
    Q.appendChild(r);
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // Export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepSpeisen = stepSpeisen;
})();
