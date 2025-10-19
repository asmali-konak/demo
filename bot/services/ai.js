/* ============================================================================
   PPX AI Service – v2.13.3 (minimal)
   Änderung (einzig & allein):
   • FAQ via KI: Vor dem Öffnen der passenden FAQ-Kategorie eine Lead-Nachricht.
   Alles andere unverändert (Styles, Layout, Funktionen, Delays).
============================================================================ */
(function () {
  'use strict';
  var W=window, D=document, PPX=W.PPX=W.PPX||{}; PPX.services=PPX.services||{};
  var AI={};

  // ---------- tiny utils -----------------------------------------------------
  function el(t,a){var n=D.createElement(t);a=a||{};Object.keys(a).forEach(function(k){var v=a[k];
    if(k==='text') n.textContent=v; else if(k==='html') n.innerHTML=v;
    else if(k==='style'&&v&&typeof v==='object') Object.assign(n.style,v);
    else if(k.slice(0,2)==='on'&&typeof v==='function') n.addEventListener(k.slice(2),v);
    else if(k==='class'||k==='className') n.setAttribute('class',v); else n.setAttribute(k,v);});
    for(var i=2;i<arguments.length;i++){var c=arguments[i]; if(c!=null) n.appendChild(typeof c==='string'?D.createTextNode(c):c);} return n;}
  function esc(s){return String(s).replace(/[&<>"']/g,function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]);});}
  function linkify(s){return s.replace(/\bhttps?:\/\/[^\s)]+/g,function(u){return '<a href="'+u+'" target="_blank" rel="nofollow noopener" class="ppx-link">'+u+'</a>';});}
  function viewEl(){ return D.getElementById('ppx-v'); }
  function now(){ return Date.now(); }
  function st(){ PPX.state=PPX.state||{activeFlowId:null,expecting:null,unknownCount:0,lastUnknownAt:0,oosCount:0,lastOosAt:0}; return PPX.state; }
  function dbgPush(evt){ try{ AI.debugEvents=AI.debugEvents||[]; AI.debugEvents.push(evt); if(AI.debugEvents.length>30) AI.debugEvents.shift(); }catch(e){} }

  // ---------- normalizer + word-boundary ------------------------------------
  function _norm(s){
    s=String(s||'').toLowerCase();
    try{ s=s.normalize('NFD').replace(/\p{M}+/gu,''); }catch(e){}
    s=s.replace(/[ä]/g,'ae').replace(/[ö]/g,'oe').replace(/[ü]/g,'ue').replace(/[ß]/g,'ss')
       .replace(/[ç]/g,'c').replace(/[ş]/g,'s').replace(/[ı]/g,'i')
       .replace(/[éèêë]/g,'e').replace(/[áàâ]/g,'a').replace(/[íìî]/g,'i').replace(/[óòô]/g,'o').replace(/[úùû]/g,'u')
       .replace(/[-_.,!?;:()[\]{}"']/g,' ').replace(/\s+/g,' ').trim();
    return s;
  }
  function wbRegex(term){ var t=_norm(term).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'); return new RegExp('(^|\\W)'+t+'(\\W|$)','i'); }
  function wbNormHit(termNorm,qNorm){ if(!termNorm||!qNorm) return false; var t=String(termNorm).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'); return new RegExp('(^|\\s)'+t+'(\\s|$)','i').test(qNorm); }
  function isVeryShort(q){ return String(q||'').trim().length<=3; }

  // ---------- data getters ---------------------------------------------------
  function nowLang(){ try{ return (PPX.i18n&&PPX.i18n.nowLang&&PPX.i18n.nowLang()) || PPX.lang || 'de'; }catch(e){ return 'de'; } }
  function cfg(){ try{ return (PPX.data&&PPX.data.cfg&&PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function dishes(){ try{ return (PPX.data&&PPX.data.dishes&&PPX.data.dishes()) || {}; } catch(e){ return {}; } }
  function faqs(){ try{ return (PPX.data&&PPX.data.faqs&&PPX.data.faqs()) || []; } catch(e){ return []; } }
  function aiCfg(){ try{ return (PPX.data&&PPX.data.ai&&PPX.data.ai()) || {}; } catch(e){ return {}; } }
  function langPick(obj){ var L=nowLang(); if(obj&&typeof obj==='object'){ return (L==='en'&&obj.en)?obj.en:(obj.de||obj.en||''); } return String(obj||''); }
  function textOf(key){ try{
    var A=aiCfg()||{}, REF=A.TEXTS_REF||{}, raw=(PPX.data&&PPX.data.raw&&PPX.data.raw())||{}, T=raw.TEXTS||{};
    var path=(REF[key]||'').split('.'); var cur=raw; for(var i=0;i<path.length;i++){ if(cur && typeof cur==='object') cur=cur[path[i]]; }
    return langPick(cur||T[key]||'');
  }catch(e){ return ''; } }

  // ---------- Typing/Delay ---------------------------------------------------
  function typingCfg(){
    var A=aiCfg()||{}, S=(A.settings||{}), T=(S.typingDelays||{});
    return {
      enabled: (T.enabled!==false),
      baseMs: (isFinite(T.baseMs)?T.baseMs:350),
      perCharMs: (isFinite(T.perCharMs)?T.perCharMs:18),
      minMs: (isFinite(T.minMs)?T.minMs:300),
      maxMs: (isFinite(T.maxMs)?T.maxMs:2000),
      afterLeadToFlowMs: (isFinite(T.afterLeadToFlowMs)?T.afterLeadToFlowMs:1200),
      betweenQueuedMs: (isFinite(T.betweenQueuedMs)?T.betweenQueuedMs:220)
    };
  }
  function _strip(html){ var d=D.createElement('div'); d.innerHTML=html||''; return (d.textContent||d.innerText||'').trim(); }
  function _calcDelay(html){
    try{
      var t=typingCfg(); if(!t.enabled) return 0;
      var len=_strip(html||'').length;
      var ms = t.baseMs + len * t.perCharMs;
      if(ms<t.minMs) ms=t.minMs; if(ms>t.maxMs) ms=t.maxMs;
      return ms|0;
    }catch(e){ return 0; }
  }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, Math.max(0,ms|0)); }); }

  // ---------- UI helpers -----------------------------------------------------
  function appendToView(node){ var v=viewEl(); if(!v) return null; v.appendChild(node); moveThreadToEnd(); return node; }
  function moveThreadToEnd(){ var v=viewEl(); if(!v) return; try{ v.scrollTop=v.scrollHeight; requestAnimationFrame(function(){ v.scrollTop=v.scrollHeight; }); }catch(e){} }
  function bubble(side,html){
    var wrap=el('div',{class:'ppx-ai-bwrap'});
    var b=el('div',{class:'ppx-ai-bubble',style:{
      display:'inline-block',margin:'8px 0',padding:'10px 12px',borderRadius:'12px',
      border:'1px solid var(--ppx-bot-chip-border, rgba(255,255,255,.18))',
      background: side==='user' ? 'rgba(255,255,255,.10)' : 'var(--ppx-bot-chip, rgba(255,255,255,.06))',
      color:'var(--ppx-bot-text,#fff)',maxWidth:'86%'}});
    if(side==='user') wrap.style.textAlign='right';
    b.innerHTML=html; wrap.appendChild(b); return wrap;
  }
  function userEcho(text){ return appendToView(bubble('user', esc(text))); }

  // ---------- Typing-Queue (Bot) --------------------------------------------
  var Q=[], Qbusy=false;
  async function _runQ(){
    if(Qbusy) return; Qbusy=true;
    while(Q.length){
      var job=Q.shift();
      try{ await job(); }catch(e){}
      var t=typingCfg(); if(t.enabled) await sleep(t.betweenQueuedMs);
    }
    Qbusy=false;
  }
  function say(html){
    var t=typingCfg();
    if(!t.enabled){ appendToView(bubble('bot', esc(html))); return; }
    Q.push(async function(){
      var wrap=bubble('bot','<span class="ppx-typing">...</span>'); appendToView(wrap);
      var inner=wrap.querySelector('.ppx-ai-bubble'); var ms=_calcDelay(html);
      await sleep(ms);
      try{ inner.innerHTML=esc(html); }catch(e){}
      moveThreadToEnd();
    });
    _runQ();
  }
  function queueFlowOpen(tool, detail){
    var t=typingCfg();
    Q.push(async function(){ await sleep(t.afterLeadToFlowMs); openFlow(tool, detail||{}); moveThreadToEnd(); });
    _runQ();
  }
  // ---------- Rate / Unknown / Out-of-scope ---------------------------------
  var rl={hits:[],max:15};
  function allowHit(){ var t=now(); rl.hits=rl.hits.filter(function(h){return t-h<60000;}); if(rl.hits.length>=rl.max) return false; rl.hits.push(t); return true; }
  function bumpUnknown(){ var S=st(), t=now(); if((t-(S.lastUnknownAt||0))>45000){ S.unknownCount=0; } S.unknownCount=(S.unknownCount||0)+1; S.lastUnknownAt=t; return S.unknownCount; }
  function resetUnknown(){ var S=st(); S.unknownCount=0; S.lastUnknownAt=0; }
  function bumpOos(){ var S=st(), t=now(); if((t-(S.lastOosAt||0))>45000){ S.oosCount=0; } S.oosCount=(S.oosCount||0)+1; S.lastOosAt=t; return S.oosCount; }
  function resetOos(){ var S=st(); S.oosCount=0; S.lastOosAt=0; }

  // ---------- labels & categories -------------------------------------------
  function catLabelFromKey(catKey){ var C=cfg(), L=nowLang(); var obj=(C.menuTitles && C.menuTitles[catKey]) || null; return obj?(L==='en'&&obj.en?obj.en:(obj.de||catKey)):catKey; }

  // ---------- render category chips -----------------------------------------
  function renderCategoryChips(block){
    try{
      var C=cfg(), order=Array.isArray(C.menuOrder)?C.menuOrder:[], row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
      order.forEach(function(key){
        var lab=catLabelFromKey(key);
        var btn=(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(lab,function(){ openFlow('speisen',{category:key}); },'ppx-secondary')
                                    : el('button',{class:'ppx-b ppx-secondary',onclick:function(){ openFlow('speisen',{category:key}); }}, lab);
        row.appendChild(btn);
      }); block.appendChild(row);
    }catch(e){}
  }

  // ---------- not offered ----------------------------------------------------
  function respondNotOffered(query){
    var label=(function(q){ var m=String(q||'').match(/\b(italienisch|italy|italiano|pizza|pasta|chinesisch|chinese|sushi|indisch|thai|mexikanisch|mexico|ramen|pho|koreanisch|burger|tacos|currywurst|fisch|sea\s*food|seafood)\b/i); return m?m[0]:''; })(query)||'das';
    var nice=label; var n=_norm(label);
    if(/ital/.test(n)||/pizza|pasta/.test(n)) nice='italienische Küche';
    else if(/chines/.test(n)) nice='chinesische Küche';
    else if(/indisch/.test(n)) nice='indische Küche';
    else if(/thai/.test(n)) nice='thailändische Küche';
    else if(/korean/.test(n)) nice='koreanische Küche';
    else if(/sushi|ramen|pho/.test(n)) nice='Sushi/Asia';
    else if(/mexi|tacos/.test(n)) nice='mexikanische Küche';
    else if(/fisch|sea\s*food|seafood/.test(n)) nice='Fisch/Seafood';
    var txt=textOf('notOffered')||"Aktuell haben wir keine {{query}}. Schau gern in unsere Kategorien:";
    var add=(cfg().tagline? (' '+esc(cfg().tagline)) : '');
    var html=esc(txt.replace('{{query}}', nice))+add;
    var wrap=bubble('bot', html); appendToView(wrap);
    var blk=(PPX.ui&&PPX.ui.block)?PPX.ui.block('',{blockKey:'not-offered'}):el('div',{'class':'ppx-bot'});
    renderCategoryChips(blk); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }
  function maybeNotOffered(q){
    var n=_norm(q);
    var kws=['italienisch','italy','italiano','pizza','pasta','sushi','ramen','pho','fisch','seafood','sea food','chinesisch','chinese','indisch','thai','mexikanisch','mexico','koreanisch','burger','tacos','currywurst'];
    for(var i=0;i<kws.length;i++){ if(wbRegex(kws[i]).test(n)){ respondNotOffered(q); return true; } }
    return false;
  }

  // ---------- open contact (priorisiert Formular) ---------------------------
  function openContactEmail(extra){
    extra = extra || {};
    var ok = openFlow('contactform', Object.assign({ startAt:'email', skipHeader:true }, extra)); if(ok) return true;
    ok = openFlow('kontakt', Object.assign({ startAt:'email', skipHeader:true }, extra)); if(ok) return true;
    try{ window.dispatchEvent(new CustomEvent('ppx:tool',{detail:{tool:'contactform', detail:Object.assign({ startAt:'email', skipHeader:true }, extra)}})); return true; }catch(e){}
    return false;
  }

  // ---------- unknown/manual -------------------------------------------------
  function respondUnknownManual(){
    var L=nowLang(); var cnt=bumpUnknown();
    if(cnt===1){
      var msg=(L==='en')
        ? 'I don’t have info on that here — I can help with our menu, opening hours or reservations.'
        : 'Dazu habe ich hier keine Infos – ich helfe dir gern mit Speisekarte, Öffnungszeiten oder Reservierungen.';
      appendToView(bubble('bot', esc(msg)));
    }else{
      var again=(L==='en'
        ? (textOf('unknownAgain')||'I’ll open our contact form so we can assist you.')
        : (textOf('unknownAgain')||'Ich öffne dir unser Kontaktformular, damit wir dir helfen können.'));
      appendToView(bubble('bot', esc(again))); openContactEmail();
    }
    PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }

  // ---------- alias / synonyms (offline) ------------------------------------
  function aliasMap(){ try{ var A=aiCfg()||{}; return (A.alias||{}); }catch(e){ return {}; } }
  function aliasExpand(q){
    try{
      var m=aliasMap(), n=_norm(q); Object.keys(m).forEach(function(core){
        var arr=m[core]||[]; arr.forEach(function(alt){
          if(wbRegex(alt).test(n)) n=n.replace(wbRegex(alt), ' '+core+' ');
        });
      }); return n;
    }catch(e){ return _norm(q); }
  }

  // ---------- smalltalk & identity ------------------------------------------
  function detectSmalltalk(q){
    var n=_norm(q);
    if(/\b(wie\s+gehts|wie\s+geht\s+es|how\s+are\s+you)\b/.test(n)){
      return (nowLang()==='en')
        ? "I'm fine, thanks! How can I help — menu, opening hours or a reservation?"
        : "Mir geht’s gut, danke! Wobei kann ich helfen – Speisekarte, Öffnungszeiten oder Reservierung?";
    }
    var A=aiCfg()||{}, ST=(A.intents.smalltalk)||{}, hit=function(list){ return (list||[]).some(function(p){ return wbRegex(p).test(q); }); };
    if(hit(ST.greetings && ST.greetings.phrases)) return textOf('greeting') || "Hi! Wie kann ich dir helfen?";
    if(hit(ST.thanks && ST.thanks.phrases)) return textOf('smalltalkThanks') || "Sehr gern! Willst du noch etwas wissen?";
    if(hit(ST.bye && ST.bye.phrases)) return textOf('smalltalkBye') || "Bis bald 👋";
    if(hit(ST.capabilities && ST.capabilities.phrases)) return textOf('capability') || "Ich helfe dir mit Speisekarte, Öffnungszeiten oder Reservierungen.";
    if(hit(ST.identity && ST.identity.phrases)) return identityReply();
    return null;
  }

  function identityReply(){
    var C=cfg(), L=nowLang();
    var brand=C.brand||'Unser Restaurant', tag=C.tagline||'Authentische Küche in deiner Nähe.';
    return (L==='en')
      ? ('We are '+brand+' — '+tag+' I can show the menu or help you reserve.')
      : ('Wir sind '+brand+' – '+tag+' Ich kann dir die Speisekarte zeigen oder eine Reservierung starten.');
  }

  // ---------- empathy --------------------------------------------------------
  function isPersonalEmotion(q){
    var n=_norm(q);
    return /\b(langweilig|getrennt|freundin\s+hat\s+sich\s+getrennt|freund\s+hat\s+sich\s+getrennt|traurig|down|einsam|allein|stress|gestresst|schlechter\s+tag|bad\s+day|wuetend|sauer)\b/.test(n);
  }
  function isPositiveEmotion(q){
    var n=_norm(q);
    return /\b(gluecklich|glücklich|froh|happy|gut\s+drauf|super\s+stimmung)\b/.test(n);
  }

  function respondEmpathyLocal(){
    var L=nowLang();
    var txt=(L==='en')
      ? "Sorry you're having a rough moment. A little treat can help — want me to show the menu or book a cozy table?"
      : "Tut mir leid, das klingt nicht so gut. Etwas Leckeres hilft oft – soll ich dir die Speisekarte zeigen oder direkt einen gemütlichen Tisch sichern?";
    appendToView(bubble('bot', esc(txt)));
    var row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
    var btnMenu=(PPX.ui&&PPX.ui.btn)?PPX.ui.btn((L==='en'?'Show menu':'Speisekarte zeigen'), function(){ openFlow('speisen',{}); }, 'ppx-secondary','📜'):el('button',{class:'ppx-b ppx-secondary',onclick:function(){ openFlow('speisen',{}); }}, (L==='en'?'Show menu':'Speisekarte zeigen'));
    var btnRes =(PPX.ui&&PPX.ui.btn)?PPX.ui.btn((L==='en'?'Reserve':'Reservieren'), function(){ openFlow('reservieren',{}); }, 'ppx-cta','🗓️'):el('button',{class:'ppx-b ppx-cta',onclick:function(){ openFlow('reservieren',{}); }}, (L==='en'?'Reserve':'Reservieren'));
    row.appendChild(btnMenu); row.appendChild(btnRes);
    var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{maxWidth:'100%',blockKey:'empathy-suggest'}) : el('div',{'class':'ppx-bot'});
    blk.appendChild(row); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }

  function respondEmpathyPositive(){
    var L=nowLang();
    var txt=(L==='en')
      ? "Love to hear that! Want a quick recommendation or the menu?"
      : "Wie schön! Soll ich dir etwas empfehlen oder die Speisekarte zeigen?";
    appendToView(bubble('bot', esc(txt)));
    var row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
    var btnMenu=(PPX.ui&&PPX.ui.btn)?PPX.ui.btn((L==='en'?'Show menu':'Speisekarte zeigen'), function(){ openFlow('speisen',{}); }, 'ppx-secondary','📜'):el('button',{class:'ppx-b ppx-secondary',onclick:function(){ openFlow('speisen',{}); }}, (L==='en'?'Show menu':'Speisekarte zeigen'));
    var btnRes =(PPX.ui&&PPX.ui.btn)?PPX.ui.btn((L==='en'?'Reserve':'Reservieren'), function(){ openFlow('reservieren',{}); }, 'ppx-cta','🗓️'):el('button',{class:'ppx-b ppx-cta',onclick:function(){ openFlow('reservieren',{}); }}, (L==='en'?'Reserve':'Reservieren'));
    row.appendChild(btnMenu); row.appendChild(btnRes);
    var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{maxWidth:'100%',blockKey:'empathy-positive'}) : el('div',{'class':'ppx-bot'});
    blk.appendChild(row); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }

  // ---------- FAQ Strict Map -------------------------------------------------
  function faqCategoryMapStrict(){
    var out=Object.create(null);
    try{
      var F=faqs(), cats=[];
      if(F && Array.isArray(F.cats)) cats=F.cats;
      else if(F && Array.isArray(F.items)) cats=[{key:'all',title:F.title||'FAQ',title_en:F.title_en||'FAQ'}];
      cats.forEach(function(c){
        var k=(c&&c.key)?String(c.key):'';
        var t=(c&&c.title)?String(c.title):'';
        var te=(c&&c.title_en)?String(c.title_en):'';
        if(k){ out[_norm(k)]=k; }
        if(t){ out[_norm(t)]=k||_norm(t); }
        if(te){ out[_norm(te)]=k||_norm(te); }
      });
      var A=aiCfg()||{}, intents=(A.intents||{}), faq=(intents.faq||{}), catsCfg=(faq.categories||{});
      Object.keys(catsCfg).forEach(function(catKey){
        var entry=catsCfg[catKey], arr=Array.isArray(entry)?entry:(Array.isArray(entry.keywords)?entry.keywords:[]);
        (arr||[]).forEach(function(s){
          var n=_norm(s); if(!n) return; out[n]=catKey;
        });
      });
    }catch(e){}
    return out;
  }
  function faqMatchFromTextStrict(txt){ var map=faqCategoryMapStrict(); var n=_norm(txt); if(!n) return null; return map[n]||null; }
  // ---------- tool alias & openFlow -----------------------------------------
  function toolAlias(n){ n=String(n||'').toLowerCase();
    if(n==='öffnungszeiten'||n==='oeffnungszeiten'||n==='hours') return 'hours';
    if(n==='reservieren'||n==='reserve') return 'reservieren';
    if(n==='kontakt'||n==='contact') return 'kontakt';
    if(n==='contactform'||n==='kontaktformular') return 'contactform';
    if(n==='speisen'||n==='menu'||n==='menü'||n==='menue'||n==='dishes') return 'speisen';
    if(n==='faq') return 'faq'; return n; }
  function cap(s){ s=String(s||''); return s? s.charAt(0).toUpperCase()+s.slice(1) : s; }
  function openFlow(tool,detail){
    try{
      var tname=toolAlias(tool||''), fn=PPX.flows && (PPX.flows['step'+cap(tname)]);
      if(typeof fn==='function'){ fn(detail||{}); moveThreadToEnd(); st().activeFlowId=tname; return true; }
      if(PPX.flows&&typeof PPX.flows.open==='function'){ PPX.flows.open(tname,detail||{}); moveThreadToEnd(); st().activeFlowId=tname; return true; }
    }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('ppx:tool',{detail:{tool:toolAlias(tool||''),detail:detail||{}}})); }catch(e){}
    return false;
  }

  // ---------- open hours matching -------------------------------------------
  function matchesOpenHours(q){
    var n=aliasExpand(q);
    var base=['oeffnungszeiten','offen','geoeffnet','geoffnet','geöffnet','open','hours','zeiten','auf'];
    for(var i=0;i<base.length;i++){ if(wbRegex(base[i]).test(n)) return true; }
    var patterns=['habt ihr auf','habt ihr heute auf','seid ihr offen','seid ihr heute offen','seid ihr da','seid ihr heute da','seid ihr geoeffnet','seid ihr geoffnet','kann ich heute vorbeikommen','open now','are you open now','are you open today','open today','opening hours','hast du heute auf','hast du auf','hast du offen','habt ihr offen'];
    for(var j=0;j<patterns.length;j++){ if(wbRegex(patterns[j]).test(n)) return true; }
    if(/\bheute\b/.test(n) && /\b(auf|offen|geoeffnet|geoffnet|geöffnet|open)\b/.test(n)) return true;
    return false;
  }
  function replyOpenHoursSmart(){
    try{
      var L=nowLang(), svc=PPX.services&&PPX.services.openHours; if(!svc){ openFlow('öffnungszeiten',{}); return; }
      var isOpen=(typeof svc.isOpenNow==='function')?!!svc.isOpenNow():false;
      if(!isOpen){
        appendToView(bubble('bot', esc(L==='en'
          ? 'We’re currently closed, but here are our opening hours for you.'
          : 'Wir haben gerade geschlossen, aber hier sind unsere Öffnungszeiten für dich.')));
        openFlow('öffnungszeiten',{}); return;
      }
      var closeHM=(typeof svc.closeTimeToday==='function')?(svc.closeTimeToday()||''):'';
      var msg=(L==='en')
        ? ('Good news — we’re open today until '+(closeHM||'late')+'. Would you like to reserve or view hours?')
        : ('Du hast Glück, heute sind wir noch bis '+(closeHM||'später')+' geöffnet. Möchtest du reservieren oder zu den Öffnungszeiten?');
      appendToView(bubble('bot', esc(msg)));
      var row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
      var btnReserve=(PPX.ui&&PPX.ui.btn)?PPX.ui.btn((L==='en'?'Reserve':'Reservieren'), function(){ openFlow('reservieren',{}); }, 'ppx-cta','🗓️'):el('button',{class:'ppx-b ppx-cta',onclick:function(){ openFlow('reservieren',{}); }}, (L==='en'?'Reserve':'Reservieren'));
      var btnHours=(PPX.ui&&PPX.ui.btn)?PPX.ui.btn((L==='en'?'Opening Hours':'Öffnungszeiten'), function(){ openFlow('öffnungszeiten',{}); }, 'ppx-secondary','⏰'):el('button',{class:'ppx-b ppx-secondary',onclick:function(){ openFlow('öffnungszeiten',{}); }}, (L==='en'?'Opening Hours':'Öffnungszeiten'));
      row.appendChild(btnReserve); row.appendChild(btnHours);
      var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{maxWidth:'100%',blockKey:'openhours-choice'}) : el('div',{'class':'ppx-bot'});
      blk.appendChild(row); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
    }catch(e){ openFlow('öffnungszeiten',{}); }
  }

  // ---------- Out-of-scope & choices ----------------------------------------
  function isOutOfScope(q){
    return /\b(wetter|news|nachrichten|politik|aktien|kurs|bitcoin|technik|programmiere|programmierung|heutiges wetter|vorhersage)\b/i.test(_norm(q));
  }
  function offerMainMenuButton(){
    var L=nowLang();
    var row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
    var backLbl=(L==='en'?'Back to main menu':'Zurück ins Hauptmenü');
    var backBtn=(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(backLbl,function(){ openFlow('home',{}); },'ppx-secondary','🏠') : el('button',{class:'ppX-b ppx-secondary',onclick:function(){ openFlow('home',{}); }}, backLbl);
    row.appendChild(backBtn);
    var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{maxWidth:'100%',blockKey:'back-home'}) : el('div',{'class':'ppx-bot'});
    blk.appendChild(row); appendToView(blk);
  }
  function offerContactChoice(){
    var L=nowLang();
    var txt=textOf('unknownOnce')||(L==='en'
      ? 'I don’t have info on that here. Should I open our contact form for you?'
      : 'Dazu habe ich hier keine Infos. Soll ich dir unser Kontaktformular öffnen?');
    appendToView(bubble('bot', esc(txt)));
    var row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
    var yesLbl=(L==='en'?'Open contact form':'Kontaktformular öffnen');
    var yes=(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(yesLbl,function(){ openContactEmail(); },'ppx-cta','✉️') : el('button',{class:'ppx-b ppx-cta',onclick:function(){ openContactEmail(); }}, yesLbl);
    var noLbl=(L==='en'?'No, thanks':'Nein, danke');
    var no=(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(noLbl,function(){
      appendToView(bubble('bot', esc(textOf('closing')||(L==='en'
        ? 'All right! Feel free to ask something else. Or click here to return to the main menu!'
        : 'Alles klar! Frag mich gern etwas anderes. Oder klick hier, um ins Hauptmenü zu kommen!'))));
      offerMainMenuButton(); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
    },'ppx-secondary','🙌') : el('button',{class:'ppx-b ppx-secondary',onclick:function(){
      appendToView(bubble('bot', esc(textOf('closing')||'Alles klar! Frag mich gern etwas anderes. Oder klick hier, um ins Hauptmenü zu kommen!'))); offerMainMenuButton();
    }}, noLbl);
    row.appendChild(yes); row.appendChild(no);
    var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{maxWidth:'100%',blockKey:'unknown-choice'}) : el('div',{'class':'ppx-bot'});
    blk.appendChild(row); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }

  // ---------- FAQ Lead (nur KI) ---------------------------------------------
  function faqLabelFromKey(catKey){
    try{
      var F=faqs(), L=nowLang(), cats = (F && Array.isArray(F.cats)) ? F.cats : [];
      for(var i=0;i<cats.length;i++){
        var c=cats[i]; if(!c) continue;
        if(c.key===catKey){
          if(L==='en' && c.title_en) return c.title_en;
          return c.title || c.title_en || catKey || '';
        }
      }
      return catKey || '';
    }catch(e){ return String(catKey||''); }
  }
  function leadForFaq(catKey){
    var lab = faqLabelFromKey(catKey)||catKey;
    var L = nowLang();
    var tpl = textOf('faqLead') || (L==='en'
      ? 'Here are the Q&As for {{category}}. Hope that helps.'
      : 'Hier findest du die Q&As zu „{{category}}“. Ich hoffe, das hilft dir weiter.');
    say(tpl.replace('{{category}}', lab));
  }

  // ---------- Regeln/Flows (true = handled) ----------------------------------
  function dessertAsk(q){
    var n=_norm(q);
    return /\b(dessert|desserts|nachspeise|nachspeisen|sues|suess|sueß|süß|suesse?s?|süßes|sweet|sweets)\b/.test(n);
  }
  function leadForCategory(catKey){
    var lab=catLabelFromKey(catKey)||catKey;
    var tpl=textOf('categoryLead')||'Hast du Lust auf {{category}}? Dann schau mal hier rein!';
    say(tpl.replace('{{category}}', lab));
  }
  function leadForItem(itemName){
    var tpl=textOf('itemLead')||'Gute Wahl. Hier habe ich alle Informationen dazu:';
    if(/\{\{\s*item\s*\}\}/.test(tpl)){ say(tpl.replace('{{item}}', itemName||'')); }
    else { say(tpl); }
  }

  function processRulesMaybeFlow(q){
    if(!allowHit()){ appendToView(bubble('bot','Bitte kurz warten ⏳')); return true; }

    // Positive Empathie / Smalltalk / Identität
    if(isPositiveEmotion(q)){ userEcho(q); respondEmpathyPositive(); resetUnknown(); resetOos(); dbgPush({type:'empathy_positive',q:q}); return true; }
    var sm=detectSmalltalk(q);
    if(sm){
      userEcho(q);
      appendToView(bubble('bot', esc(sm)));
      if(sm === (textOf('capability') || 'Ich helfe dir mit Speisekarte, Öffnungszeiten oder Reservierungen.')){
        queueFlowOpen('speisen',{});
      }
      resetUnknown(); resetOos(); moveThreadToEnd(); dbgPush({type:'smalltalk',q:q}); return true;
    }
    if(isPersonalEmotion(q)){ userEcho(q); respondEmpathyLocal(); resetUnknown(); resetOos(); dbgPush({type:'empathy',q:q}); return true; }

    // Kurz & nicht whitelisted → Unknown
    var A=aiCfg()||{}, wl=(A.settings&&A.settings.whitelistWh)||[];
    if(isVeryShort(q)){
      var n=_norm(q); var wh=wl.some(function(w){ return wbRegex(w).test(n); });
      if(!wh){ userEcho(q); respondUnknownManual(); resetOos(); dbgPush({type:'very_short_block',q:q}); return true; }
    }
    // Blocklist kurz
    try{
      var bl=Array.isArray(A.blocklistShort)?A.blocklistShort:[]; var qn=_norm(q);
      for(var i=0;i<bl.length;i++){ var term=String(bl[i]||'').trim();
        if(term && wbRegex(term).test(qn)){ userEcho(q); respondUnknownManual(); resetOos(); dbgPush({type:'short_block',q:q,term:term}); return true; } }
    }catch(e){}

    // Öffnungszeiten
    if(matchesOpenHours(q)){ userEcho(q); replyOpenHoursSmart(); resetUnknown(); resetOos(); dbgPush({type:'hours',q:q}); return true; }

    // Reservieren – Prematch
    try{
      var n=_norm(q), ql=q.toLowerCase().trim();
      var hardShort=(ql==='kr'||/^kr[\s.!?]*$/.test(ql)||ql==='res'||/^res[\s.!?]*$/.test(ql));
      if(!isVeryShort(q) && !hardShort){
        var pat=/\b(reservier|reserviere|reservierung)\w*\b/;
        var any=pat.test(n)||wbRegex('tisch reservieren').test(n)||wbRegex('book a table').test(n)
                 ||(/\bbook\b/.test(n)&&/\btable\b/.test(n))||/\btable\s+for\s+\d+/.test(n)
                 ||wbRegex('booking').test(n)||wbRegex('reserve').test(n);
        if(any){ userEcho(q); openFlow('reservieren',{}); resetUnknown(); resetOos(); dbgPush({type:'reserve',q:q}); return true; }
      }
    }catch(e){}

    // Desserts
    try{
      if(dessertAsk(q)){ userEcho(q); say(textOf('sweetsLead')||'Klar – hier findest du unsere Desserts:'); queueFlowOpen('speisen',{category:'desserts'}); resetUnknown(); resetOos(); dbgPush({type:'desserts',q:q}); return true; }
    }catch(e){}

    // Speisen – Items vor Kategorien
    try{
      var DSH=dishes(), cats=Object.keys(DSH||{}), qn2=_norm(q);
      if(/\bvegetarisch\w*\b/.test(qn2)){ userEcho(q); leadForCategory('vegetarisch'); queueFlowOpen('speisen',{category:'vegetarisch'}); resetUnknown(); resetOos(); dbgPush({type:'dish_cat_forced',q:q}); return true; }
      for(var i=0;i<cats.length;i++){
        var ck=cats[i], arr=Array.isArray(DSH[ck])?DSH[ck]:[];
        for(var j=0;j<arr.length;j++){
          var nm=(arr[j].name||''), ne=(arr[j].name_en||''), nmN=_norm(nm), neN=_norm(ne), ckN=_norm(ck);
          if((nm&&(wbRegex(nm).test(q)||wbNormHit(nmN,qn2)))||(ne&&(wbRegex(ne).test(q)||wbNormHit(neN,qn2)))||(ckN&&nmN&&qn2.indexOf(ckN)>=0&&qn2.indexOf(nmN)>=0)){
            userEcho(q);
            var disp=(nowLang()==='en' && ne)? ne : nm;
            leadForItem(disp);
            queueFlowOpen('speisen',{category:ck,itemId:arr[j].id}); resetUnknown(); resetOos(); dbgPush({type:'dish_item',q:q}); return true;
          }
        }
      }
      for(var i2=0;i2<cats.length;i2++){
        var ck2=cats[i2], lab=(function(){var C=cfg(), L=nowLang(), obj=(C.menuTitles && C.menuTitles[ck2])||null; return obj?(L==='en'?obj.en:(obj.de||ck2)):ck2; })();
        var ckN2=_norm(ck2), labN=_norm(lab), qn3=_norm(q);
        if(wbRegex(ck2).test(q) || wbRegex(lab).test(q) || wbNormHit(ckN2,qn3) || wbNormHit(labN,qn3)){
          userEcho(q); leadForCategory(ck2); queueFlowOpen('speisen',{category:ck2}); resetUnknown(); resetOos(); dbgPush({type:'dish_cat',q:q}); return true;
        }
      }
    }catch(e){}

    // FAQ strikt (+ contains fallback) — NUR via KI mit Lead & Delay (dein Wunsch)
    try{
      var fc=faqMatchFromTextStrict(q);
      if(!fc){
        var map=faqCategoryMapStrict(), qN=_norm(q);
        if(qN && map){ for(var k in map){ if(qN.indexOf(k)>=0){ fc=map[k]; break; } } }
      }
      if(fc){ 
        userEcho(q);
        // >> Lead-Vornachricht NUR bei KI-Öffnung <<
        leadForFaq(fc);
        queueFlowOpen('faq',{category:fc,behavior:'silent'}); // Flow erst nach Delay
        resetUnknown(); resetOos(); dbgPush({type:'faq',q:q}); return true; 
      }
    }catch(e){}

    // Statische Intents
    var intents={ kontakt:['kontakt','email','mail','anrufen','telefon','call'],
      'öffnungszeiten':['öffnungszeiten','zeiten','hours','open','geöffnet','geoeffnet','offen','open today','are you open today'],
      speisen:['speisen','speise','gericht','gerichte','essen','menü','menu','karte','speisekarte','hunger','ich habe hunger','food'] };
    var qRaw=String(q||''), qNorm=_norm(q);
    for(var tool in intents){
      var arr=intents[tool]||[]; var hit=false;
      for(var kk=0;kk<arr.length;kk++){ if(wbRegex(arr[kk]).test(qRaw) || wbNormHit(_norm(arr[kk]), qNorm)){ hit=true; break; } }
      if(hit){
        userEcho(q);
        if(tool==='speisen'){
          var fallbackLead = (nowLang()==='en') ? 'Want to see our dishes? Take a look:' : 'Du möchtest mehr über unsere Speisen wissen? Schau hier:';
          say(textOf('speisenLead') || fallbackLead);
          queueFlowOpen(tool,{});
        }else{
          queueFlowOpen(tool,{});
        }
        resetUnknown(); resetOos(); dbgPush({type:'intent',q:q,tool:tool}); return true;
      }
    }

    // Nicht im Angebot
    try{ if(maybeNotOffered(q)){ userEcho(q); resetUnknown(); resetOos(); dbgPush({type:'not_offered',q:q}); return true; } }catch(e){}

    // Out-of-scope
    if(isOutOfScope(q)){ userEcho(q); respondOutOfScope(q); resetUnknown(); dbgPush({type:'oos',q:q}); return true; }

    return false;
  }

  // ---------- Out-of-scope response -----------------------------------------
  function respondOutOfScope(){
    var L=nowLang();
    appendToView(bubble('bot', esc(
      L==='en'
        ? 'That’s outside my scope here. I can help with our menu, opening hours or a reservation.'
        : 'Das liegt außerhalb meines Rahmens hier. Ich helfe dir gern mit Speisekarte, Öffnungszeiten oder Reservierung.'
    )));
    offerMainMenuButton();
    PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }
  // ---------- Consent + Sende-Pipeline --------------------------------------
  var _consented=false, _pendingQ=null, _consentBlockEl=null, $dock=null, $inp=null, $send=null;

  async function send(){
    ensureDock(); if(!$inp) return;
    var raw=String($inp.value||''); var q=raw.trim(); if(!q) return;
    $inp.value='';
    _consented = (_consented===true) || loadConsent();
    if(!_consented){
      _pendingQ = q;
      if(!_consentBlockEl || !_consentBlockEl.isConnected){ renderConsentBlock(); }
      return;
    }
    if(processRulesMaybeFlow(q)) return;
    userEcho(q);
    processOnlyAi(q);
  }

  // ---------- Nur-AI Verarbeitung (nach Regeln) ------------------------------
  function processOnlyAi(q){
    try{
      if(typeof doWorkerHybrid==='function'){ return doWorkerHybrid(q); }
      var svc = PPX.services && PPX.services.aiWorker;
      if(svc && typeof svc.process==='function'){ return svc.process(q); }
    }catch(e){}
    appendToView(bubble('bot', esc(nowLang()==='en'
      ? "I can't answer that here. Would you like to contact us?"
      : "Das kann ich hier nicht beantworten. Möchtest du uns eine Nachricht senden?")));
    offerContactChoice();
  }

  // ---------- Consent helpers ------------------------------------------------
  function loadConsent(){ try{ return localStorage.getItem('ppx_ai_consent')==='true'; }catch(e){ return false; } }
  function saveConsent(v){ try{ v?localStorage.setItem('ppx_ai_consent','true'):localStorage.removeItem('ppx_ai_consent'); }catch(e){} }

  function renderConsentBlock(){
    var A=aiCfg()||{}, C=A.compliance||{}, L=nowLang();

    var lbls=((A.compliance&&A.compliance.labels)||{});
    var LAB={
      title: (L==='en'?'AI consent':'KI-Einwilligung'),
      agree: (L==='en'?'Agree & continue':'Zustimmen & fortfahren'),
      decline: (L==='en'?'Decline':'Ablehnen')
    };
    try{
      if(lbls.title){ LAB.title = (L==='en'&&lbls.title.en)?lbls.title.en:(lbls.title.de||LAB.title); }
      if(lbls.agree){ LAB.agree = (L==='en'&&lbls.agree.en)?lbls.agree.en:(lbls.agree.de||LAB.agree); }
      if(lbls.decline){ LAB.decline = (L==='en'&&lbls.decline.en)?lbls.decline.en:(lbls.decline.de||LAB.decline); }
    }catch(e){}

    var title = LAB.title;
    var msg   = C.consentText || (L==='en'
      ? 'Your message will be sent to our AI service. Please avoid sensitive data.'
      : 'Deine Frage wird an unseren KI-Dienst gesendet. Bitte keine sensiblen Daten eingeben.');

    var privacyHref = (C.privacyUrl && String(C.privacyUrl).charAt(0)==='#') ? C.privacyUrl : '#datenschutz';
    var imprintHref = (C.imprintUrl && String(C.imprintUrl).charAt(0)==='#') ? C.imprintUrl : '#impressum';

    var links = [
      '<a class="ppx-link" href="'+esc(privacyHref)+'">Datenschutz</a>',
      '<a class="ppx-link" href="'+esc(imprintHref)+'">Impressum</a>',
      esc(C.disclaimer || (L==='en'?'No legal or medical advice.':'Keine Rechts- oder Medizinberatung.'))
    ].join(' · ');

    var scopeIdx = (PPX.ui&&PPX.ui.getScopeIndex)? PPX.ui.getScopeIndex() : 0;
    var blk=(PPX.ui&&PPX.ui.block) ? PPX.ui.block(title,{blockKey:'ai-consent',maxWidth:'640px'})
                                   : appendToView(bubble('bot', esc(title)));
    var content = el('div', {'class':'ppx-block-content'});
    content.innerHTML = esc(msg)+' '+links;
    blk.appendChild(content);

    try{
      var anchors = content.querySelectorAll('a.ppx-link[href^="#"]');
      anchors.forEach(function(a){
        a.addEventListener('click', function(e){
          var id=a.getAttribute('href')||''; if(!id||id.charAt(0)!=='#') return;
          var target=document.querySelector(id);
          if(target){
            e.preventDefault();
            try{ target.scrollIntoView({behavior:'smooth',block:'start'}); }catch(_){ location.hash=id; }
          }
        });
      });
    }catch(e){}

    var row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
    var yes=(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(LAB.agree, agreeConsent, 'ppx-cta','✅')
                                : el('button',{class:'ppx-b ppx-cta',onclick:agreeConsent}, LAB.agree);
    var no =(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(LAB.decline,  declineConsent, 'ppx-secondary','✖️')
                                : el('button',{class:'ppx-b ppx-secondary',onclick:declineConsent}, LAB.decline);
    row.appendChild(yes); row.appendChild(no);
    blk.appendChild(row);

    if (PPX.ui && typeof PPX.ui.navBottom === 'function') {
      var nav = PPX.ui.navBottom(scopeIdx);
      blk.appendChild(nav);
    }

    appendToView(blk);
    _consentBlockEl = blk;
    PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }

  function agreeConsent(){
    saveConsent(true);
    _consented = true;
    if(_consentBlockEl && _consentBlockEl.parentNode) _consentBlockEl.parentNode.removeChild(_consentBlockEl);
    if(_pendingQ){
      var msg=_pendingQ; _pendingQ=null;
      if($inp){ $inp.value = msg; setTimeout(send,0); }
    }
  }
  function declineConsent(){
    saveConsent(false);
    _pendingQ=null;
    if(_consentBlockEl && _consentBlockEl.parentNode) _consentBlockEl.parentNode.removeChild(_consentBlockEl);
    appendToView(bubble('bot', esc(nowLang()==='en'
      ? 'Okay! You can still use the site without the AI assistant.'
      : 'Alles klar! Du kannst die Seite auch ohne KI-Assistent nutzen.')));
  }
  // ---------- Dock (Input/Send) ---------------------------------------------
  function ensureDock(){
    var panel=document.getElementById('ppx-panel'); if(!panel) return false;
    var exist = panel.querySelector('.ppx-ai-dock');
    if(exist){
      $dock=exist; $inp=$dock.querySelector('.ai-inp'); $send=$dock.querySelector('.ai-send');
      return true;
    }
    if(!document.getElementById('ppx-ai-inside-style')){
      var css=("#ppx-panel .ppx-ai-dock{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:var(--ppx-bot-header,#0f3a2f);border-top:1px solid rgba(0,0,0,.25)}\
#ppx-panel .ppx-ai-dock .ai-consent{display:none}\
#ppx-panel .ppx-ai-dock .ai-row{display:flex;gap:10px;align-items:center}\
#ppx-panel .ppx-ai-dock .ai-inp{flex:1;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#f7faf8;font-size:16px;outline:none}\
#ppx-panel .ppx-ai-dock .ai-inp::placeholder{color:rgba(255,255,255,.75)}\
#ppx-panel .ppx-ai-dock .ai-send{appearance:none;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 16px;background:#123f31;color:#fff;font-weight:700;cursor:pointer}\
#ppx-panel .ppx-ai-dock.busy .ai-send{opacity:.65;pointer-events:none}");
      var s=el('style',{id:'ppx-ai-inside-style'}); s.textContent=css; (document.head||document.documentElement).appendChild(s);
    }
    $inp = el('input',{type:'text',class:'ai-inp',placeholder:'Frag unseren KI-Assistenten :)','aria-label':'KI-Frage eingeben'});
    $send= el('button',{type:'button',class:'ai-send'},'Senden');
    var row = el('div',{class:'ai-row'}, $inp, $send);
    $dock  = el('div',{class:'ppx-ai-dock'}, row);

    var v = viewEl(); var panelFooter = (panel.querySelector('.ppx-brandbar, .ppx-elements-footer, .ai-elements-footer, .ppx-footer, footer')) || null;
    try{
      if(panelFooter){ panel.insertBefore($dock, panelFooter); }
      else if(v && v.parentNode===panel && v.nextSibling){ panel.insertBefore($dock, v.nextSibling); }
      else panel.appendChild($dock);
    }catch(e){ panel.appendChild($dock); }

    $inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});
    $send.addEventListener('click', send);
    return true;
  }

  var _dockTimer=null,_dockTries=0;
  function ensureDockLoop(){
    if(_dockTimer) return;
    _dockTries=0;
    _dockTimer=setInterval(function(){
      _dockTries++; var ok=ensureDock(); if(ok || _dockTries>60){
        try{ clearInterval(_dockTimer); }catch(e){}
        _dockTimer=null;
      }
    },1000);
  }

  // ---------- Boot & Export --------------------------------------------------
  function boot(){
    try{ _consented = loadConsent(); }catch(e){}
    ensureDockLoop(); ensureDock();
    window.addEventListener('ppx:panel:open', function(){ ensureDock(); ensureDockLoop(); });
    try{
      var mo=new MutationObserver(function(){
        var panel=document.getElementById('ppx-panel'); if(panel && !panel.querySelector('.ppx-ai-dock')) ensureDock();
      });
      mo.observe(document.documentElement||document.body,{childList:true,subtree:true});
      setTimeout(function(){ try{ mo.disconnect(); }catch(e){} },60000);
    }catch(e){}
  }

  PPX.services.ai = AI;
  AI.send  = send;
  AI.boot  = boot;
  AI.faqCategoryMapStrict  = faqCategoryMapStrict;
  AI.faqMatchFromTextStrict= faqMatchFromTextStrict;

  try{ boot(); }catch(e){}
})();
