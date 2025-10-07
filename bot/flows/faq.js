/* ============================================================================
   PPX Flow: FAQ / Q&As (faq.js) – v8.4.0
   - stepQAs(): Root mit PDF-Button + Kategorien (I18N)
   - renderFaqCat(ct): Header im Screenshot-Stil + Fragenliste (I18N)
   - renderFaqAnswer(ct,it): Antwort, optional Quick-Bestell-CTA (I18N)
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI  = PPX.ui || {};
  var U   = PPX.util || {};
  var DLY = PPX.D || {};
  var I   = PPX.i18n || {};

  // --- data getters ----------------------------------------------------------
  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function faqsRaw(){ try { return (PPX.data && PPX.data.faqs && PPX.data.faqs()) || []; } catch(e){ return []; } }
  function L(){ try { return (I && I.nowLang && I.nowLang()) || PPX.lang || 'de'; } catch(e){ return 'de'; } }
  function t(k, fb){ try { return (I && I.t) ? I.t(k, fb) : (fb||k); } catch(e){ return fb||k; } }

  // --- I18N registry ---------------------------------------------------------
  try { I.reg && I.reg({
    'faq.title':        { de:'Q&As', en:'Q&As' },
    'faq.pdf':          { de:'Alle FAQs als PDF', en:'All FAQs as PDF' },
    'faq.soon':         { de:'Häufige Fragen folgen in Kürze.', en:'FAQs coming soon.' },
    'faq.lookup':       { de:'Wonach möchtest du schauen?', en:'What would you like to look up?' },
    'faq.choose':       { de:'Wähle eine Frage:', en:'Choose a question:' },
    'faq.emptyCat':     { de:'Für diese Kategorie sind noch keine Fragen hinterlegt.',
                          en:'No questions yet in this category.' },
    'faq.helpAsk':      { de:'Konnte dir das helfen? Wenn nicht, lass uns gerne eine Nachricht da!',
                          en:'Did that help? If not, feel free to leave us a message!' },
    'faq.toForm':       { de:'Ja, bitte zum Kontaktformular', en:'Yes, open contact form' },
    'faq.noHome':       { de:'Nein, zurück ins Hauptmenü', en:'No, back to main menu' }
  }); } catch(e){}

  // --- helpers ---------------------------------------------------------------
  function getFaqPdfUrl(){
    var C = cfg(), F = faqsRaw();
    return (C.faqPdf) ||
           ((F && typeof F === 'object' && F.pdfUrl) ? F.pdfUrl : null) ||
           (C.pdf && (C.pdf.faq || C.pdf.url)) ||
           'pizza_papa_faq.pdf';
  }

  // Order-Listen (DE/EN akzeptieren)
  var FAQ_ORDER_DE = ['Speisekarte','Allergene','Lieferung','Öffnungszeiten','Preise','Bestellung'];
  var FAQ_ORDER_EN = ['Menu','Allergens','Delivery','Opening Hours','Prices','Ordering'];

  function normTitleToOrderKey(title){
    var s = String(title||'').trim();
    // Normalisierungen
    if (/speisekarte/i.test(s) || /^menu$/i.test(s)) return L()==='en' ? 'Menu' : 'Speisekarte';
    if (/allergen/i.test(s)) return L()==='en' ? 'Allergens' : 'Allergene';
    if (/liefer/i.test(s) || /delivery/i.test(s)) return L()==='en' ? 'Delivery' : 'Lieferung';
    if (/öffnungs/i.test(s) || /opening/i.test(s)) return L()==='en' ? 'Opening Hours' : 'Öffnungszeiten';
    if (/preis/i.test(s) || /price/i.test(s)) return L()==='en' ? 'Prices' : 'Preise';
    if (/bestell/i.test(s) || /order/i.test(s)) return L()==='en' ? 'Ordering' : 'Bestellung';
    return s;
  }

  function orderListForLang(){
    return (L()==='en') ? FAQ_ORDER_EN : FAQ_ORDER_DE;
  }

  function orderFaqCats(cats){
    var allowList = orderListForLang();
    var allow = Object.create(null); allowList.forEach(function(t){ allow[t]=1; });
    // Filter + Norm
    var filtered = cats.map(function(c){
      var t = (c.title || c.name || '').trim();
      var norm = normTitleToOrderKey(t);
      return Object.assign({}, c, { title:norm });
    }).filter(function(c){ return !!allow[c.title]; });

    var pos = Object.create(null); allowList.forEach(function(t,i){ pos[t]=i; });
    return filtered.sort(function(a,b){
      var ta = a.title || a.name || '', tb = b.title || b.name || '';
      return ((ta in pos ? pos[ta] : 999) - (tb in pos ? pos[tb] : 999)) || ta.localeCompare(tb);
    });
  }

  // pick localized fields from items or categories
  function pickQA(it, key){
    if (!it) return '';
    if (L()==='en' && typeof it[key+'_en'] !== 'undefined') return it[key+'_en'];
    return it[key] || it[{q:'question',a:'answer',more:'more'}[key]] || '';
  }
  function catTitle(ct){
    if (!ct) return '';
    if (L()==='en'){
      if (ct.title_en) return ct.title_en;
      if (ct.name_en) return ct.name_en;
    }
    return ct.title || ct.name || '';
  }

  function getFaqCats(){
    var F = faqsRaw();
    if (Array.isArray(F)) {
      // Single list → "Speisekarte/Menu"
      return orderFaqCats([{ key:'all', title:(L()==='en'?'Menu':'Speisekarte'), icon:'🍕', items:F }]);
    }
    if (F && typeof F === 'object') {
      if (Array.isArray(F.cats)) {
        // Localize titles if *_en present
        var list = F.cats.map(function(c){
          var t = catTitle(c);
          return Object.assign({}, c, { title: t });
        });
        return orderFaqCats(list);
      }
      if (Array.isArray(F.items)) {
        var t0 = F.title_en && L()==='en' ? F.title_en : (F.title|| (L()==='en'?'Menu':'Speisekarte'));
        return orderFaqCats([{ key:'all', title:t0, icon:(F.icon||'🍕'), items:F.items }]);
      }
    }
    return [];
  }

  function isOrderQuick(it){
    var qd = (pickQA(it,'q')||'').toLowerCase();
    return (it && it.special === 'orderQuick') ||
           /wie\s+bestelle\s+ich\s+am\s+schnellsten/.test(qd) ||
           /how\s+do\s+i\s+order\s+fast/.test(qd);
  }

  // --- flow: root ------------------------------------------------------------
  function stepQAs(){
    var scopeIdx = UI.getScopeIndex ? UI.getScopeIndex() : 0;
    var B = UI.block(t('faq.title','Q&As'), { maxWidth:'100%' });
    B.setAttribute('data-block','faq-root');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));

    var rTop = UI.row(); rTop.className += ' ppx-center';
    rTop.appendChild(UI.btn(t('faq.pdf','Alle FAQs als PDF'), function(){
      try { window.open(getFaqPdfUrl(), '_blank', 'noopener'); } catch(e){}
    }, '', '📄'));
    C.appendChild(rTop);

    U.delay(function(){
      var cats = getFaqCats();
      if (!cats.length){ C.appendChild(UI.line(t('faq.soon','Häufige Fragen folgen in Kürze.'))); try { UI.keepBottom(); } catch(e){} return; }
      C.appendChild(UI.note(t('faq.lookup','Wonach möchtest du schauen?')));

      var G = UI.grid();
      cats.forEach(function(ct){
        var label = (ct.icon ? (ct.icon + ' ') : '') + (ct.title || (L()==='en'?'Category':'Kategorie'));
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
    var title = catTitle(ct) || (L()==='en'?'Questions':'Fragen');
    B.appendChild((function(){
      var h = D.createElement('div'); h.className = 'ppx-h'; h.textContent = title; return h;
    })());

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(scopeIdx) : D.createTextNode(''));

    C.appendChild(UI.note(t('faq.choose','Wähle eine Frage:')));

    var items = (ct && Array.isArray(ct.items)) ? ct.items.slice() : [];
    if (!items.length){ C.appendChild(UI.line(t('faq.emptyCat','Für diese Kategorie sind noch keine Fragen hinterlegt.'))); try { UI.keepBottom(); } catch(e){} return; }

    var Ls = UI.row();
    items.forEach(function(it){
      var q = pickQA(it,'q');
      if (!q) return;
      Ls.appendChild(UI.btn(q, function(){ U.delay(function(){ renderFaqAnswer(ct, it, scopeIdx); }, DLY.tap || 260); }, '', '➜'));
    });
    C.appendChild(Ls);
    try { UI.keepBottom(); } catch(e){}
  }

  // --- answer ----------------------------------------------------------------
  function renderFaqAnswer(ct, it, backScopeIdx){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','faq-answer');

    var C = D.createElement('div'); C.className = 'ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(backScopeIdx) : D.createTextNode(''));

    var q = pickQA(it,'q') || (L()==='en'?'Question':'Frage');
    var a = pickQA(it,'a') || '';
    var more = pickQA(it,'more');

    C.appendChild(UI.note(q));
    if (a)    C.appendChild(UI.line(a));
    if (more) C.appendChild(UI.line(more));
    try { UI.keepBottom(); } catch(e){}

    if (isOrderQuick(it)){
      var r = UI.row(); r.style.justifyContent = 'flex-start';
      var Cfg = cfg();
      var orderUrl = (Cfg.orderUrl || (Cfg.links && Cfg.links.lieferando) || 'https://www.lieferando.de/');
      var btnOrder = (L()==='en') ? 'Open Lieferando' : 'Lieferando öffnen';
      var btnCall  = (L()==='en') ? 'Call' : 'Anrufen';
      r.appendChild(UI.btn(btnOrder, function(){ try { window.open(orderUrl, '_blank', 'noopener'); } catch(e){} }, 'ppx-cta', '⚡'));
      if (Cfg.phone){
        r.appendChild(UI.btn(btnCall, function(){ try { window.location.href = 'tel:' + String(Cfg.phone).replace(/\s+/g,''); } catch(e){} }, '', '📞'));
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
    Q.appendChild(UI.note(t('faq.helpAsk','Konnte dir das helfen? Wenn nicht, lass uns gerne eine Nachricht da!')));
    var r = UI.row(); r.style.justifyContent = 'flex-start';
    r.appendChild(UI.btn(t('faq.toForm','Ja, bitte zum Kontaktformular'), function(){ try { U.delay(PPX.flows.stepContactForm, DLY.step || 450); } catch(e){} }, 'ppx-cta', '📝'));
    r.appendChild(UI.btn(t('faq.noHome','Nein, zurück ins Hauptmenü'), function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    Q.appendChild(r);
    try { UI.keepBottom && UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepQAs = stepQAs;
})();
