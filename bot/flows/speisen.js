/* ============================================================================
   PPX Flow: Speisen (speisen.js) – v8.5.3
   - KI-Fall mit detail:
       • Wenn detail.category + detail.itemId -> direkt renderItem(...)
       • Wenn nur detail.category            -> direkt renderCategory(...)
   - Manuell (ohne detail): Intro → Root → Kategorien (unverändert)
   - Timer-Handling: Delays werden gecancelt, um Doppel-Renders zu verhindern
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  var U  = PPX.util || {};
  var UI = PPX.ui   || {};
  var DLY= PPX.D    || {};
  var I  = PPX.i18n || {};
  var delay = U.delay || function(fn,ms){ return setTimeout(fn, ms); };
  var pretty= U.pretty || function(s){ return s; };

  // Timer-Tracker
  var T = { introToRoot:null, rootToCats:null };

  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function dishes(){ try { return (PPX.data && PPX.data.dishes && PPX.data.dishes()) || {}; } catch(e){ return {}; } }
  function nowLang(){ try { return (PPX.i18n && PPX.i18n.nowLang && PPX.i18n.nowLang()) || PPX.lang || 'de'; } catch(e){ return 'de'; } }

  // I18N
  try { I.reg && I.reg({
    'speisen.head':   { de:'SPEISEN', en:'MENU' },
    'speisen.intro':  { de:'Super Wahl 👍  Hier sind unsere Speisen-Kategorien:', en:'Great choice 👍  Here are our menu categories:' },
    'speisen.pdf':    { de:'Speisekarte als PDF', en:'Menu as PDF' },
    'speisen.orPick': { de:'…oder wähle eine Kategorie:', en:'…or pick a category:' },
    'speisen.selFor': { de:'Gern! Hier ist die Auswahl für {cat}:', en:'Sure! Here is the selection for {cat}:' },
    'speisen.price':  { de:'Preis:', en:'Price:' },
    'speisen.hint':   { de:'ℹ️ ', en:'ℹ️ ' },
    'speisen.ask':    { de:'Na, Appetit bekommen? 😍 Soll ich dir gleich einen Tisch reservieren?', en:'Feeling hungry? 😍 Shall I book you a table right away?' },
    'speisen.yesReserve': { de:'Ja, bitte reservieren', en:'Yes, reserve a table' },
    'speisen.noHome': { de:'Nein, zurück ins Hauptmenü', en:'No, back to main menu' }
  }); } catch(e) {}

  function t(k, fb){ try { return (I && I.t) ? I.t(k, fb) : (fb||k); } catch(e){ return fb||k; } }

  // Labels
  function catTitle(catKey){
    var C = cfg(), DSH = dishes(), L = nowLang();
    var obj = (C.menuTitles && C.menuTitles[catKey]) || (DSH.__titles__ && DSH.__titles__[catKey]) || null;
    if (obj && typeof obj === 'object') return (L==='en' && obj.en) ? obj.en : (obj.de || obj.name || pretty(catKey));
    return pretty(catKey);
  }
  function pickField(it, base){
    var L = nowLang(); if (!it) return '';
    if (L==='en' && typeof it[base+'_en'] !== 'undefined') return it[base+'_en'];
    return it[base];
  }

  // Sortierung
  function orderCats(keys){
    var morder = [];
    try {
      var conf = cfg();
      if (Array.isArray(conf.menuOrder) && conf.menuOrder.length) morder = conf.menuOrder.map(pretty);
      else morder = ['Antipasti','Salate','Pizza','Pasta','Desserts','Getränke'];
    } catch(e){ morder = ['Antipasti','Salate','Pizza','Pasta','Desserts','Getränke']; }
    var pos = Object.create(null); morder.forEach(function(k,i){ pos[k] = i; });
    return keys.slice().sort(function(a,b){ var ia=(a in pos)?pos[a]:999, ib=(b in pos)?pos[b]:999; return ia-ib || a.localeCompare(b); });
  }

  function cancelTimers(){
    if (T.introToRoot){ clearTimeout(T.introToRoot); T.introToRoot=null; }
    if (T.rootToCats){  clearTimeout(T.rootToCats);  T.rootToCats=null; }
  }

  // Helper: Item-Objekt per category + itemId finden
  function findItem(catKey, itemId){
    try{
      var arr = Array.isArray(dishes()[catKey]) ? dishes()[catKey] : [];
      for(var i=0;i<arr.length;i++){ if(String(arr[i].id)===String(itemId)) return arr[i]; }
    }catch(e){}
    return null;
  }

  // Einstieg
  function stepSpeisen(detail){
    // KI-Fall: mit Detail -> Root-Timer stoppen und gezielt rendern
    if (detail && (detail.category || detail.itemId)) {
      cancelTimers();
      var catKey = detail.category ? String(detail.category) : '';
      var itemId = detail.itemId ? String(detail.itemId) : '';

      if (catKey && itemId){
        var it = findItem(catKey, itemId);
        if (it){ renderItem(catKey, it); return; }
        // Fallback: wenn Item nicht gefunden, wenigstens Kategorie öffnen
        renderCategory(catKey); return;
      }
      if (catKey){
        renderCategory(catKey); return;
      }
      // Falls nur itemId käme (theoretisch), versuche Kategorie zu finden
      try{
        var DSH = dishes();
        for (var k in DSH){
          if (!Array.isArray(DSH[k])) continue;
          for (var j=0;j<DSH[k].length;j++){
            if (String(DSH[k][j].id)===String(itemId)){ renderItem(k, DSH[k][j]); return; }
          }
        }
      }catch(e){}
      // Letzter Rückfall: normal starten
    }

    // Manueller Pfad: Intro → später Root
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var M = UI.block(null, { maxWidth:'100%' });
    M.setAttribute('data-block','speisen-info');
    var Cb = D.createElement('div'); Cb.className = 'ppx-body'; M.appendChild(Cb);
    Cb.appendChild(UI.line(t('speisen.intro','Super Wahl 👍  Hier sind unsere Speisen-Kategorien:')));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
    cancelTimers();
    T.introToRoot = delay(function(){ renderSpeisenRoot(scopeIdx); }, DLY.step || 450);
  }

  // Root: PDF + Kategorien (nur manuell)
  function renderSpeisenRoot(scopeIdx){
    var B = UI.block(t('speisen.head','SPEISEN'), { maxWidth:'100%' });
    B.setAttribute('data-block','speisen-root');
    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    var Cfg = cfg();
    var pdfUrl = (Cfg.menuPdf) || (Cfg.pdf && (Cfg.pdf.menu || Cfg.pdf.url)) || Cfg.menuPDF || 'speisekarte.pdf';

    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn(t('speisen.pdf','Speisekarte als PDF'), function(){ try { window.open(pdfUrl, '_blank', 'noopener'); } catch(e){} }, '', '📄'));
    C.appendChild(r);
    C.appendChild(UI.line(t('speisen.orPick','…oder wähle eine Kategorie:')));

    cancelTimers();
    T.rootToCats = delay(function(){
      var DISH = dishes();
      var keys = Object.keys(DISH || {}).filter(function(k){ return k !== '__titles__'; });
      var cats = keys.length ? orderCats(keys.map(function(k){ return pretty(k); })) :
                               ['Antipasti','Salate','Pizza','Pasta','Desserts','Getränke'];
      var map = {}; (keys||[]).forEach(function(k){ map[pretty(k)] = k; });

      var G = UI.grid();
      cats.forEach(function(catPretty){
        var rawKey = map[catPretty] || catPretty.toLowerCase();
        var label  = catTitle(rawKey);
        G.appendChild(UI.chip(label, function(){ renderCategory(rawKey); }, 'ppx-cat', '►'));
      });
      C.appendChild(G);
      try { UI.keepBottom && UI.keepBottom(); } catch(e){}
    }, DLY.long || 1000);
  }

  // Kategorie → Items
  function renderCategory(catKey){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','speisen-cat');
    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    var catLbl = catTitle(catKey);
    var msg = t('speisen.selFor','Gern! Hier ist die Auswahl für {cat}:').replace('{cat}', catLbl);
    C.appendChild(UI.line(msg));

    var list = [];
    try { var DISH = dishes(); list = Array.isArray(DISH[catKey]) ? DISH[catKey] : []; } catch(e){ list = []; }
    if (!list.length) list = [
      { name: pretty(catKey)+' Classic', name_en: pretty(catKey)+' Classic', price:'9,50 €' },
      { name: pretty(catKey)+' Special', name_en: pretty(catKey)+' Special', price:'12,90 €' }
    ];

    var G = UI.grid();
    list.forEach(function(it){
      var label = pickField(it, 'name') || 'Artikel';
      G.appendChild(UI.chip(label, function(){ renderItem(catKey, it); }, '', '➜'));
    });
    C.appendChild(G);
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // Item → Detail + „Reservieren?“
  function renderItem(catKey, item){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','speisen-item');
    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    var title = pickField(item, 'name') || pretty(catKey);
    var desc  = pickField(item, 'info') || pickField(item, 'desc');
    var hint  = pickField(item, 'hinweis');
    var price = item && item.price;

    C.appendChild(UI.note(title));
    if (desc)  C.appendChild(UI.line(desc));
    if (price) C.appendChild(UI.line(t('speisen.price','Preis:') + ' ' + String(price)));
    if (hint)  C.appendChild(UI.line(t('speisen.hint','ℹ️ ') + hint));
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}

    setTimeout(function(){ askReserveAfterItem(scopeIdx); }, 3000);
  }

  function askReserveAfterItem(scopeIdx){
    var Q = UI.block(null, { maxWidth:'100%' });
    Q.setAttribute('data-block','speisen-item-ask');
    Q.appendChild(UI.note(t('speisen.ask','Na, Appetit bekommen? 😍 Soll ich dir gleich einen Tisch reservieren?')));
    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn(t('speisen.yesReserve','Ja, bitte reservieren'), function(){
      try { (PPX.flows && PPX.flows.stepReservieren) ? delay(PPX.flows.stepReservieren, DLY.step || 450) : null; } catch(e){}
    }, 'ppx-cta', '🗓️'));
    r.appendChild(UI.btn(t('speisen.noHome','Nein, zurück ins Hauptmenü'), function(){
      try { UI.goHome && UI.goHome(); } catch(e){}
    }, 'ppx-secondary', '🏠'));
    Q.appendChild(r);
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // Export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepSpeisen = stepSpeisen;
})();
