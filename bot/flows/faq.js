/* ============================================================================
   PPX Flow: FAQ / Q&As (faq.js) – v8.7.0
   Neu:
   - Keine Wegfilterung mehr: bekannte Kategorien werden bevorzugt sortiert,
     alle übrigen bleiben erhalten (hinten angehängt).
   - stepFaq(detail): Wenn detail.category vorhanden, direkt Kategorie-Sicht,
     ohne Root/PDF/Übersicht.
============================================================================ */
(function () {
  'use strict';
  var W=window,D=document,PPX=W.PPX=W.PPX||{},UI=PPX.ui||{},U=PPX.util||{},DLY=PPX.D||{},I=PPX.i18n||{};

  function cfg(){ try{ return (PPX.data&&PPX.data.cfg&&PPX.data.cfg())||{}; }catch(e){ return {}; } }
  function faqsRaw(){ try{ return (PPX.data&&PPX.data.faqs&&PPX.data.faqs())||[]; }catch(e){ return []; } }
  function L(){ try{ return (I&&I.nowLang&&I.nowLang())||PPX.lang||'de'; }catch(e){ return 'de'; } }
  function t(k,fb){ try{ return (I&&I.t)?I.t(k,fb):(fb||k); }catch(e){ return fb||k; } }

  try{ I.reg&&I.reg({
    'faq.title':{de:'Q&As',en:'Q&As'},'faq.pdf':{de:'Alle FAQs als PDF',en:'All FAQs as PDF'},
    'faq.soon':{de:'Häufige Fragen folgen in Kürze.',en:'FAQs coming soon.'},
    'faq.lookup':{de:'Wonach möchtest du schauen?',en:'What would you like to look up?'},
    'faq.choose':{de:'Wähle eine Frage:',en:'Choose a question:'},
    'faq.emptyCat':{de:'Für diese Kategorie sind noch keine Fragen hinterlegt.',en:'No questions yet in this category.'},
    'faq.helpAsk':{de:'Konnte dir das helfen? Wenn nicht, lass uns gerne eine Nachricht da!',en:'Did that help? If not, feel free to leave us a message!'},
    'faq.toForm':{de:'Ja, bitte zum Kontaktformular',en:'Yes, open contact form'},
    'faq.noHome':{de:'Nein, zurück ins Hauptmenü',en:'No, back to main menu'}
  }); }catch(e){}

  function getFaqPdfUrl(){
    var C=cfg(),F=faqsRaw();
    return (C.faqPdf) || ((F&&typeof F==='object'&&F.pdfUrl)?F.pdfUrl:null) ||
           (C.pdf&&(C.pdf.faq||C.pdf.url)) || 'pizza_papa_faq.pdf';
  }

  var PREF_DE=['Speisekarte','Allergene','Lieferung','Öffnungszeiten','Preise','Bestellung'];
  var PREF_EN=['Menu','Allergens','Delivery','Opening Hours','Prices','Ordering'];
  function pref(){ return (L()==='en')?PREF_EN:PREF_DE; }

  function normTitleToOrderKey(title){
    var s=String(title||'').trim();
    if(/speisekarte/i.test(s)||/^menu$/i.test(s)) return L()==='en'?'Menu':'Speisekarte';
    if(/allergen/i.test(s)) return L()==='en'?'Allergens':'Allergene';
    if(/liefer/i.test(s)||/delivery/i.test(s)) return L()==='en'?'Delivery':'Lieferung';
    if(/öffnungs/i.test(s)||/opening/i.test(s)) return L()==='en'?'Opening Hours':'Öffnungszeiten';
    if(/preis/i.test(s)||/price/i.test(s)) return L()==='en'?'Prices':'Preise';
    if(/bestell/i.test(s)||/order/i.test(s)) return L()==='en'?'Ordering':'Bestellung';
    return s;
  }
  function catTitle(ct){
    if(!ct) return '';
    if(L()==='en'){ if(ct.title_en) return ct.title_en; if(ct.name_en) return ct.name_en; }
    return ct.title||ct.name||'';
  }
  function orderFaqCatsKeepUnknown(cats){
    var P=pref(), pos=Object.create(null); P.forEach(function(t,i){ pos[t]=i; });
    // map + normalize for sort, but keep originals
    var mapped=cats.map(function(c){
      var t=catTitle(c), norm=normTitleToOrderKey(t);
      return Object.assign({}, c, { _sortKey: (norm in pos? ('A'+String(pos[norm]).padStart(2,'0')) : ('Z'+norm.toLowerCase())), title:t });
    });
    return mapped.sort(function(a,b){
      if(a._sortKey<b._sortKey) return -1; if(a._sortKey>b._sortKey) return 1;
      var ta=a.title||'', tb=b.title||''; return ta.localeCompare(tb);
    });
  }

  function getFaqCats(){
    var F=faqsRaw();
    if(Array.isArray(F)){ return orderFaqCatsKeepUnknown([{ key:'all', title:(L()==='en'?'Menu':'Speisekarte'), icon:'🍕', items:F }]); }
    if(F&&typeof F==='object'){
      if(Array.isArray(F.cats)){
        var list=F.cats.map(function(c){ return Object.assign({}, c, { title:catTitle(c) }); });
        return orderFaqCatsKeepUnknown(list);
      }
      if(Array.isArray(F.items)){
        var t0=(L()==='en'&&F.title_en)?F.title_en:(F.title||(L()==='en'?'Menu':'Speisekarte'));
        return orderFaqCatsKeepUnknown([{ key:'all', title:t0, icon:(F.icon||'🍕'), items:F.items }]);
      }
    }
    return [];
  }

  function pickQA(it,key){
    if(!it) return '';
    if(L()==='en' && typeof it[key+'_en']!=='undefined') return it[key+'_en'];
    return it[key] || it[{q:'question',a:'answer',more:'more'}[key]] || '';
  }

  function _norm(s){
    return String(s||'').toLowerCase()
      .replace(/[ä]/g,'ae').replace(/[ö]/g,'oe').replace(/[ü]/g,'ue').replace(/[ß]/g,'ss')
      .replace(/[ç]/g,'c').replace(/[ş]/g,'s').replace(/[ı]/g,'i')
      .replace(/[_.,!?;:()[\]{}"']/g,' ').replace(/\s+/g,' ').trim();
  }
  function softMatch(hay,needle){
    hay=_norm(hay); needle=_norm(needle);
    if(!hay||!needle) return false;
    if(hay===needle) return true;
    if(hay.indexOf(needle)!==-1) return true;
    if(needle.endsWith('en') && hay===needle.slice(0,-2)) return true;
    if(needle.endsWith('e')  && hay===needle.slice(0,-1)) return true;
    if(needle.endsWith('s')  && hay===needle.slice(0,-1)) return true;
    return false;
  }
  function findFaqCatByAny(idOrName){
    var cats=getFaqCats(); if(!cats.length) return null;
    var q=String(idOrName||'').trim(); if(!q) return null;
    for(var i=0;i<cats.length;i++){ if(String(cats[i].key||'')===q) return cats[i]; }
    for(var j=0;j<cats.length;j++){ if(_norm(catTitle(cats[j]))===_norm(q)) return cats[j]; }
    for(var k=0;k<cats.length;k++){
      var c=cats[k], titles=[c.title,c.name,c.title_en,c.name_en].filter(Boolean);
      for(var tIdx=0;tIdx<titles.length;tIdx++){ if(softMatch(titles[tIdx],q)) return c; }
    }
    return null;
  }

  function stepQAs(){
    var scopeIdx=UI.getScopeIndex?UI.getScopeIndex():0;
    var B=UI.block(t('faq.title','Q&As'),{maxWidth:'100%'}); B.setAttribute('data-block','faq-root');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom?UI.navBottom(scopeIdx):D.createTextNode(''));
    var rTop=UI.row(); rTop.className+=' ppx-center';
    rTop.appendChild(UI.btn(t('faq.pdf','Alle FAQs als PDF'),function(){ try{ window.open(getFaqPdfUrl(),'_blank','noopener'); }catch(e){} },'', '📄'));
    C.appendChild(rTop);

    U.delay(function(){
      var cats=getFaqCats();
      if(!cats.length){ C.appendChild(UI.line(t('faq.soon','Häufige Fragen folgen in Kürze.'))); try{ UI.keepBottom(); }catch(e){} return; }
      C.appendChild(UI.line(t('faq.lookup','Wonach möchtest du schauen?')));
      var G=UI.grid();
      cats.forEach(function(ct){
        var label=(ct.icon?(ct.icon+' '):'')+(ct.title||(L()==='en'?'Category':'Kategorie'));
        G.appendChild(UI.chip(label,function(){ renderFaqCat(ct); },'ppx-cat'));
      });
      C.appendChild(G); try{ UI.keepBottom(); }catch(e){}
    }, DLY.long||1000);
  }

  function renderFaqCat(ct){
    var scopeIdx=UI.getScopeIndex?UI.getScopeIndex():0;
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','faq-cat');
    var title=catTitle(ct)||(L()==='en'?'Questions':'Fragen');
    var H=D.createElement('div'); H.className='ppx-h'; H.textContent=title; B.appendChild(H);
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom?UI.navBottom(scopeIdx):D.createTextNode(''));
    C.appendChild(UI.line(t('faq.choose','Wähle eine Frage:')));

    var items=(ct&&Array.isArray(ct.items))?ct.items.slice():[];
    if(!items.length){ C.appendChild(UI.line(t('faq.emptyCat','Für diese Kategorie sind noch keine Fragen hinterlegt.'))); try{ UI.keepBottom(); }catch(e){} return; }

    var Ls=UI.row();
    items.forEach(function(it){
      var q=pickQA(it,'q'); if(!q) return;
      Ls.appendChild(UI.btn(q,function(){ U.delay(function(){ renderFaqAnswer(ct,it,scopeIdx); }, DLY.tap||260); },'','➜'));
    });
    C.appendChild(Ls); try{ UI.keepBottom(); }catch(e){}
  }

  function renderFaqAnswer(ct,it,backScopeIdx){
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','faq-answer');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom?UI.navBottom(backScopeIdx):D.createTextNode(''));
    var q=pickQA(it,'q')||(L()==='en'?'Question':'Frage'); var a=pickQA(it,'a')||'', more=pickQA(it,'more');
    C.appendChild(UI.line(q)); if(a) C.appendChild(UI.line(a)); if(more) C.appendChild(UI.line(more)); try{ UI.keepBottom(); }catch(e){}

    if(isOrderQuick(it)){
      var r=UI.row(); r.style.justifyContent='flex-start';
      var Cfg=cfg(), orderUrl=(Cfg.orderUrl||(Cfg.links&&Cfg.links.lieferando)||'https://www.lieferando.de/');
      var btnOrder=(L()==='en')?'Open Lieferando':'Lieferando öffnen'; var btnCall=(L()==='en')?'Call':'Anrufen';
      r.appendChild(UI.btn(btnOrder,function(){ try{ window.open(orderUrl,'_blank','noopener'); }catch(e){} },'ppx-cta','⚡'));
      if(Cfg.phone){ r.appendChild(UI.btn(btnCall,function(){ try{ window.location.href='tel:'+String(Cfg.phone).replace(/\s+/g,''); }catch(e){} },'','📞')); }
      C.appendChild(r); try{ UI.keepBottom(); }catch(e){}; return;
    }
    setTimeout(function(){ askAfterFaqAnswer(backScopeIdx); },2000);
  }
  function isOrderQuick(it){
    var qd=(pickQA(it,'q')||'').toLowerCase();
    return (it&&it.special==='orderQuick')||/wie\s+bestelle\s+ich\s+am\s+schnellsten/.test(qd)||/how\s+do\s+i\s+order\s+fast/.test(qd);
  }
  function askAfterFaqAnswer(backScopeIdx){
    var Q=UI.block(null,{maxWidth:'100%'}); Q.setAttribute('data-block','faq-answer-ask');
    Q.appendChild(UI.line(t('faq.helpAsk','Konnte dir das helfen? Wenn nicht, lass uns gerne eine Nachricht da!')));
    var r=UI.row(); r.style.justifyContent='flex-start';
    r.appendChild(UI.btn(t('faq.toForm','Ja, bitte zum Kontaktformular'),function(){ try{ U.delay(PPX.flows.stepContactForm, DLY.step||450); }catch(e){} },'ppx-cta','📝'));
    r.appendChild(UI.btn(t('faq.noHome','Nein, zurück ins Hauptmenü'),function(){ try{ UI.goHome(); }catch(e){} },'ppx-secondary','🏠'));
    Q.appendChild(r); try{ UI.keepBottom&&UI.keepBottom(); }catch(e){}
  }

  function stepFaq(detail){
    var cat=(detail&&detail.category)||'';
    var ct=findFaqCatByAny(cat);
    if(ct){ renderFaqCat(ct); return; }
    stepQAs();
  }

  PPX.flows=PPX.flows||{};
  PPX.flows.stepQAs=stepQAs;
  PPX.flows.stepFaq=stepFaq;
})();
