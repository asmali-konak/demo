/* ============================================================================
   PPX Flow: FAQ / Q&As (faq.js) – v7.9.4
   - stepQAs(): Root mit PDF-Button + Kategorien
   - renderFaqCat(ct): Header im Screenshot-Stil + Fragenliste
   - renderFaqAnswer(ct,it): Antwort, optional Quick-Bestell-CTA
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI  = PPX.ui || {};
  var U   = PPX.util || {};
  var DLY = PPX.D || {};

  // --- data getters ----------------------------------------------------------
  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function faqsRaw(){ try { return (PPX.data && PPX.data.faqs && PPX.data.faqs()) || []; } catch(e){ return []; } }

  // --- helpers ---------------------------------------------------------------
  function getFaqPdfUrl(){
    var C = cfg(), F = faqsRaw();
    return (C.faqPdf) ||
           ((F && typeof F === 'object' && F.pdfUrl) ? F.pdfUrl : null) ||
           (C.pdf && (C.pdf.faq || C.pdf.url)) ||
           'pizza_papa_faq.pdf';
  }

  var FAQ_ORDER = ['Speisekarte','Allergene','Lieferung','Öffnungszeiten','Preise','Bestellung'];

  function orderFaqCats(cats){
    // Nur erlaubte Titel, "speisekarte" normalisieren
    var allow = Object.create(null); FAQ_ORDER.forEach(function(t){ allow[t]=1; });
    var filtered = cats.filter(function(c){
      var t = (c.title || c.name || '').trim();
      if (/speisekarte/i.test(t)) c.title = 'Speisekarte';
      return allow[c.title || c.name];
    });
    var pos = Object.create(null); FAQ_ORDER.forEach(function(t,i){ pos[t]=i; });
    return filtered.sort(function(a,b){
      var ta = a.title || a.name || '', tb = b.title || b.name || '';
      return ((ta in pos ? pos[ta] : 999) - (tb in pos ? pos[tb] : 999)) || ta.localeCompare(tb);
    });
  }

  function getFaqCats(){
    var F = faqsRaw();
    if (Array.isArray(F)) {
      return orderFaqCats([{ key:'all', title:'Speisekarte', icon:'🍕', items:F }]);
    }
    if (F && typeof F === 'object') {
      if (Array.isArray(F.cats)) return orderFaqCats(F.cats.slice());
      if (Array.isArray(F.items)) return orderFaqCats([{ key:'all', title:(F.title||'Speisekarte'), icon:(F.icon||'🍕'), items:F.items }]);
    }
    return [];
  }

  function isOrderQuick(it){
    var q = (it && (it.q || it.question) || '').toLowerCase();
    return (it && it.special === 'orderQuick') || /wie\s+bestelle\s+ich\s+am\s+schnellsten/.test(q);
  }

  // --- flow: root ------------------------------------------------------------
  function stepQAs(){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var B = UI.block('Q&As', { maxWidth:'100%' });
    B.setAttribute('data-block','faq-root');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));

    var rTop = UI.row(); rTop.className += ' ppx-center';
    rTop.appendChild(UI.btn('Alle FAQs als PDF', function(){
      try { window.open(getFaqPdfUrl(), '_blank', 'noopener'); } catch(e){}
    }, '', '📄'));
    C.appendChild(rTop);

    U.delay(function(){
      var cats = getFaqCats();
      if (!cats.length){ C.appendChild(UI.line('Häufige Fragen folgen in Kürze.')); try { UI.keepBottom(); } catch(e){} return; }
      C.appendChild(UI.note('Wonach möchtest du schauen?'));

      var G = UI.grid();
      cats.forEach(function(ct){
        var label = (ct.icon ? (ct.icon + ' ') : '') + (ct.title || 'Kategorie');
        G.appendChild(UI.chip(label, function(){ renderFaqCat(ct); }, 'ppx-cat'));
      });
      C.appendChild(G);
      try { UI.keepBottom(); } catch(e){}
    }, DLY.long || 1000);
  }

  // --- category --------------------------------------------------------------
  function renderFaqCat(ct){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','faq-cat');

    // Header wie im Screenshot/Original
    var title = (ct && (ct.title || ct.name)) || 'Fragen';
    B.appendChild((function(){
      var h = D.createElement('div'); h.className = 'ppx-h'; h.textContent = title; return h;
    })());

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));

    C.appendChild(UI.note('Wähle eine Frage:'));

    var items = (ct && Array.isArray(ct.items)) ? ct.items.slice() : [];
    if (!items.length){ C.appendChild(UI.line('Für diese Kategorie sind noch keine Fragen hinterlegt.')); try { UI.keepBottom(); } catch(e){} return; }

    var L = UI.row();
    items.forEach(function(it){
      var q = (it && (it.q || it.question)) || '';
      if (!q) return;
      L.appendChild(UI.btn(q, function(){ U.delay(function(){ renderFaqAnswer(ct, it, scopeIdx); }, DLY.tap || 260); }, '', '➜'));
    });
    C.appendChild(L);
    try { UI.keepBottom(); } catch(e){}
  }

  // --- answer ----------------------------------------------------------------
  function renderFaqAnswer(ct, it, backScopeIdx){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','faq-answer');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(backScopeIdx) : D.createTextNode(''));

    var q = (it && (it.q || it.question)) || 'Frage';
    var a = (it && (it.a || it.answer)) || '';
    var more = it && it.more;

    C.appendChild(UI.note(q));
    if (a)    C.appendChild(UI.line(a));
    if (more) C.appendChild(UI.line(more));
    try { UI.keepBottom(); } catch(e){}

    if (isOrderQuick(it)){
      var r = UI.row(); r.style.justifyContent = 'flex-start';
      var Cfg = cfg();
      var orderUrl = (Cfg.orderUrl || (Cfg.links && Cfg.links.lieferando) || 'https://www.lieferando.de/');
      r.appendChild(UI.btn('Lieferando öffnen', function(){ try { window.open(orderUrl, '_blank', 'noopener'); } catch(e){} }, 'ppx-cta', '⚡'));
      if (Cfg.phone){
        r.appendChild(UI.btn('Anrufen', function(){ try { window.location.href = 'tel:' + String(Cfg.phone).replace(/\s+/g,''); } catch(e){} }, '', '📞'));
      }
      C.appendChild(r);
      try { UI.keepBottom(); } catch(e){}
      return;
    }

    setTimeout(function(){ askAfterFaqAnswer(backScopeIdx); }, 2000);
  }

  function askAfterFaqAnswer(backScopeIdx){
    var Q = UI.block(null, { maxWidth:'100%' });
    Q.setAttribute('data-block','faq-answer-ask');
    Q.appendChild(UI.note('Konnte dir das helfen? Wenn nicht, lass uns gerne eine Nachricht da!'));
    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn('Ja, bitte zum Kontaktformular', function(){ try { U.delay(PPX.flows.stepContactForm, DLY.step || 450); } catch(e){} }, 'ppx-cta', '📝'));
    r.appendChild(UI.btn('Nein, zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    Q.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepQAs = stepQAs;
})();
