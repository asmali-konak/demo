/* ============================================================================
   PPX AI Service – v2.9.3 (DockFix)
   - Bringt das KI-Eingabedock (Input + Senden) zurück
   - Beibehaltung aller Fixes (Smart-Reply Öffnungszeiten, FAQ-strikt, OOS, Consent)
   - Keine Globals außer window.PPX; liest aus window.PPX_DATA
============================================================================ */
(function () {
  'use strict';
  var W=window, D=document, PPX=W.PPX=W.PPX||{}; PPX.services=PPX.services||{};
  var AI={};

  // ---------- utils ----------------------------------------------------------
  function el(tag,attrs){var n=D.createElement(tag);attrs=attrs||{};
    Object.keys(attrs||{}).forEach(function(k){var v=attrs[k];
      if(k==='text') n.textContent=v;
      else if(k==='html') n.innerHTML=v;
      else if(k==='style'&&v&&typeof v==='object') Object.assign(n.style,v);
      else if(k.slice(0,2)==='on'&&typeof v==='function') n.addEventListener(k.slice(2),v);
      else if(k==='className'||k==='class') n.setAttribute('class',v);
      else n.setAttribute(k,v);
    });
    for(var i=2;i<arguments.length;i++){var c=arguments[i];
      if(c!=null) n.appendChild(typeof c==='string'?D.createTextNode(c):c);
    } return n;
  }
  function esc(s){return String(s).replace(/[&<>"']/g,function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]);});}
  function linkify(s){return s.replace(/\bhttps?:\/\/[^\s)]+/g,function(u){return '<a href="'+u+'" target="_blank" rel="nofollow noopener" class="ppx-link">'+u+'</a>';});}
  function viewEl(){ return D.getElementById('ppx-v'); }
  function now(){ return Date.now(); }
  function st(){ PPX.state=PPX.state||{activeFlowId:null,expecting:null,unknownCount:0,lastUnknownAt:0,oosCount:0,lastOosAt:0}; return PPX.state; }

  // ---------- normalizer -----------------------------------------------------
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

  // ---------- UI helpers -----------------------------------------------------
  function appendToView(node){ var v=viewEl(); if(!v) return null; v.appendChild(node); moveThreadToEnd(); return node; }
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
  function moveThreadToEnd(){ var v=viewEl(); if(!v) return; try{ v.scrollTop=v.scrollHeight; requestAnimationFrame(function(){ v.scrollTop=v.scrollHeight; }); }catch(e){} }
  function showNote(txt){
    var n=el('div',{class:'ppx-note',style:{background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.28)',borderLeft:'4px solid var(--ppx-accent,#c9a667)',borderRadius:'12px',padding:'8px 10px',marginTop:'8px'}},txt);
    appendToView(n);
  }

  // ---------- counters -------------------------------------------------------
  var rl={hits:[],max:15};
  function allowHit(){ var t=now(); rl.hits=rl.hits.filter(function(h){return t-h<60000;}); if(rl.hits.length>=rl.max) return false; rl.hits.push(t); return true; }
  function bumpUnknown(){ var S=st(), t=now(); if((t-(S.lastUnknownAt||0))>45000){ S.unknownCount=0; } S.unknownCount=(S.unknownCount||0)+1; S.lastUnknownAt=t; return S.unknownCount; }
  function resetUnknown(){ var S=st(); S.unknownCount=0; S.lastUnknownAt=0; }
  function bumpOos(){ var S=st(), t=now(); if((t-(S.lastOosAt||0))>45000){ S.oosCount=0; } S.oosCount=(S.oosCount||0)+1; S.lastOosAt=t; return S.oosCount; }
  function resetOos(){ var S=st(); S.oosCount=0; S.lastOosAt=0; }

  // ---------- labels (Speisen) ----------------------------------------------
  function catLabelFromKey(catKey){
    var C=cfg(), L=nowLang(); var obj=(C.menuTitles && C.menuTitles[catKey]) || null;
    if(obj && typeof obj==='object'){ return (L==='en' && obj.en) ? obj.en : (obj.de || catKey); }
    return catKey;
  }

  // ---------- Category chips & Not-offered ----------------------------------
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
  function respondNotOffered(query){
    var label=(function(q){ var m=String(q||'').match(/\b(italienisch|italy|italiano|pizza|pasta|chinesisch|chinese|sushi|indisch|thai|mexikanisch|mexico|ramen|pho|koreanisch|burger|tacos|currywurst)\b/i); return m?m[0]:''; })(query)||'das';
    var nice=label; var n=_norm(label);
    if(/ital/.test(n)) nice='italienische Küche'; else if(/chines/.test(n)) nice='chinesische Küche'; else if(/indisch/.test(n)) nice='indische Küche';
    var txt=textOf('notOffered')||"Aktuell haben wir keine {{query}}. Schau gern in unsere Kategorien:";
    var html=esc(txt.replace('{{query}}', nice));
    var wrap=bubble('bot', html); appendToView(wrap);
    var blk=(PPX.ui&&PPX.ui.block)?PPX.ui.block('',{blockKey:'not-offered'}):el('div',{'class':'ppx-bot'});
    renderCategoryChips(blk); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }

  // ---------- Smalltalk detection -------------------------------------------
  function detectSmalltalk(q){
    var n=_norm(q);
    if(/\b(wie\s+gehts|wie\s+geht\s+es|how\s+are\s+you)\b/i.test(n)){
      return (nowLang()==='en')
        ? "I'm fine, thanks! How can I help — menu, opening hours or a reservation?"
        : "Mir geht’s gut, danke! Wobei kann ich helfen – Speisekarte, Öffnungszeiten oder Reservierung?";
    }
    var A=aiCfg()||{}, ST=(A.intents&&A.intents.smalltalk)||{}, hit=function(list){ return (list||[]).some(function(p){ return wbRegex(p).test(q); }); };
    if(hit(ST.greetings && ST.greetings.phrases)) return textOf('greeting') || "Hi! Wie kann ich dir helfen?";
    if(hit(ST.thanks && ST.thanks.phrases)) return textOf('smalltalkThanks') || "Sehr gern! Willst du noch etwas wissen?";
    if(hit(ST.bye && ST.bye.phrases)) return textOf('smalltalkBye') || "Bis bald 👋";
    if(hit(ST.capabilities && ST.capabilities.phrases)) return textOf('capability') || "Ich helfe dir mit Speisekarte, Öffnungszeiten oder Reservierungen.";
    if(hit(ST.identity && ST.identity.phrases)) return (textOf('isReal') || textOf('identity') || "Ich bin dein digitaler Assistent.");
    if(/\b(was ein tag|was fuer ein tag|puh|anstrengend|stressig|uff)\b/i.test(n)){ return "Klingt nach einem langen Tag. Womit kann ich dir helfen?"; }
    return null;
  }

  // ---------- FAQ strict map + matcher --------------------------------------
  function faqCategoryMapStrict(){
    var out=Object.create(null);
    try{
      var F=faqs(), cats=[];
      if(F && Array.isArray(F.cats)) cats=F.cats;
      else if(F && Array.isArray(F.items)) cats=[{key:'all',title:F.title||'FAQ',title_en:F.title_en||'FAQ'}];
      cats.forEach(function(c){
        var k=(c&&c.key)?String(c.key):'', t=(c&&c.title)?String(c.title):'', te=(c&&c.title_en)?String(c.title_en):'';
        if(k){ out[_norm(k)]=k; } if(t){ out[_norm(t)]=k||_norm(t); } if(te){ out[_norm(te)]=k||_norm(te); }
      });
      var A=aiCfg()||{}, intents=(A.intents||{}), faq=(intents.faq||{}), catsCfg=(faq.categories||{});
      Object.keys(catsCfg).forEach(function(catKey){
        var entry=catsCfg[catKey], arr=Array.isArray(entry)?entry:(Array.isArray(entry.keywords)?entry.keywords:[]);
        (arr||[]).forEach(function(s){ var n=_norm(s); if(!n) return; out[n]=catKey; });
      });
    }catch(e){}
    return out;
  }
  function faqMatchFromTextStrict(txt){ var map=faqCategoryMapStrict(); var n=_norm(txt); if(!n) return null; return map[n]||null; }

  // ---------- Tool alias & flow open ----------------------------------------
  function toolAlias(name){ var n=String(name||'').toLowerCase();
    if(n==='öffnungszeiten'||n==='oeffnungszeiten'||n==='hours') return 'hours';
    if(n==='reservieren'||n==='reserve') return 'reservieren';
    if(n==='kontakt'||n==='contact') return 'kontakt';
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
  // ---------- Öffnungszeiten Intent & Smart-Reply ----------------------------
  function matchesOpenHours(q){
    var n=_norm(q);
    var base=['oeffnungszeiten','offen','geoeffnet','geoffnet','geöffnet','open','hours','zeiten'];
    for(var i=0;i<base.length;i++){ if(wbRegex(base[i]).test(n)) return true; }
    var patterns=[
      'habt ihr auf','habt ihr heute auf','seid ihr offen','seid ihr heute offen','seid ihr da','seid ihr heute da',
      'seid ihr geoeffnet','seid ihr geoffnet','kann ich heute vorbeikommen',
      'open now','are you open now','are you open today','open today','opening hours'
    ];
    for(var j=0;j<patterns.length;j++){ if(wbRegex(patterns[j]).test(n)) return true; }
    if(/\bheute\b/.test(n) && /\b(geoeffnet|geoffnet|offen|open)\b/.test(n)) return true;
    return false;
  }
  function hoursOneLiner(){
    try{
      var svc=PPX.services&&PPX.services.openHours;
      if(!svc||typeof svc.describeToday!=='function') return '';
      return svc.describeToday();
    }catch(e){ return ''; }
  }
  function replyOpenHoursSmart(){
    try{
      var L=nowLang(), svc=PPX.services&&PPX.services.openHours;
      if(!svc){ openFlow('öffnungszeiten',{}); return; }
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
      var btnReserve=(PPX.ui&&PPX.ui.btn)
        ? PPX.ui.btn((L==='en'?'Reserve':'Reservieren'), function(){ openFlow('reservieren',{}); }, 'ppx-cta','🗓️')
        : el('button',{class:'ppx-b ppx-cta',onclick:function(){ openFlow('reservieren',{}); }}, (L==='en'?'Reserve':'Reservieren'));
      var btnHours=(PPX.ui&&PPX.ui.btn)
        ? PPX.ui.btn((L==='en'?'Opening Hours':'Öffnungszeiten'), function(){ openFlow('öffnungszeiten',{}); }, 'ppx-secondary','⏰')
        : el('button',{class:'ppx-b ppx-secondary',onclick:function(){ openFlow('öffnungszeiten',{}); }}, (L==='en'?'Opening Hours':'Öffnungszeiten'));
      row.appendChild(btnReserve); row.appendChild(btnHours);
      var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{maxWidth:'100%',blockKey:'openhours-choice'}) : el('div',{'class':'ppx-bot'});
      blk.appendChild(row); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
    }catch(e){ openFlow('öffnungszeiten',{}); }
  }

  // ---------- Out-of-scope (z. B. Wetter/News etc.) --------------------------
  function isOutOfScope(q){
    return /\b(wetter|news|nachrichten|politik|aktien|kurs|bitcoin|technik|programmiere|programmierung|heutiges wetter|vorhersage)\b/i
      .test(_norm(q));
  }
  function offerContactChoice(){
    var L=nowLang();
    var txt=textOf('unknownOnce')||(L==='en'
      ? 'I don’t have info on that here. Should I open our contact options for you?'
      : 'Dazu habe ich hier keine Infos. Soll ich dir unser Kontaktformular öffnen?');
    appendToView(bubble('bot', esc(txt)));

    var row=(PPX.ui&&PPX.ui.row)?PPX.ui.row():el('div',{'class':'ppx-row'});
    var yes=(PPX.ui&&PPX.ui.btn)
      ? PPX.ui.btn((L==='en'?'Open contact form':'Kontakt öffnen'),function(){ openFlow('kontakt',{}); },'ppx-cta','✉️')
      : el('button',{class:'ppx-b ppx-cta',onclick:function(){ openFlow('kontakt',{}); }}, (L==='en'?'Open contact form':'Kontakt öffnen'));
    var no =(PPX.ui&&PPX.ui.btn)
      ? PPX.ui.btn((L==='en'?'No, thanks':'Nein, danke'),function(){
          appendToView(bubble('bot', esc(textOf('closing')||(L==='en'
            ? 'All right! Feel free to ask something else. Or click here to return to the main menu!'
            : 'Alles klar! Frag mich gern etwas anderes. Oder klick hier, um ins Hauptmenü zu kommen!'))));
          PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
        },'ppx-secondary','🙌')
      : el('button',{class:'ppx-b ppx-secondary',onclick:function(){
          appendToView(bubble('bot', esc(textOf('closing')||'Alles klar! Frag mich gern etwas anderes. Oder klick hier, um ins Hauptmenü zu kommen!')));
        }}, (L==='en'?'No, thanks':'Nein, danke'));
    row.appendChild(yes); row.appendChild(no);

    var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{maxWidth:'100%',blockKey:'unknown-choice'}) : el('div',{'class':'ppx-bot'});
    blk.appendChild(row); appendToView(blk); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
  }
  function respondOutOfScope(q){
    var cnt=bumpOos();
    if(cnt===1){
      var L=nowLang();
      var msg=(L==='en')
        ? 'I don’t have info on that here — I can help with our menu, opening hours or reservations.'
        : 'Dazu habe ich hier keine Infos – ich helfe dir gern mit Speisekarte, Öffnungszeiten oder Reservierungen.';
      appendToView(bubble('bot', esc(msg)));
    }else{
      offerContactChoice();
    }
  }
  // ---------- Dock (Input/Send) ---------------------------------------------
  var $dock,$inp,$send,$consentInline,_dockTimer=null,_dockTries=0;

  function ensureDock(){
    var panel=document.getElementById('ppx-panel');
    if(!panel) return false;

    // Existiert bereits?
    var exist=panel.querySelector('.ppx-ai-dock');
    if(exist){
      $dock=exist; $inp=$dock.querySelector('.ai-inp'); $send=$dock.querySelector('.ai-send'); $consentInline=$dock.querySelector('.ai-consent');
      return true;
    }

    // CSS einmalig injizieren
    if(!document.getElementById('ppx-ai-inside-style')){
      var css=("#ppx-panel .ppx-ai-dock{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:var(--ppx-bot-header,#0f3a2f);border-top:1px solid rgba(0,0,0,.25)}\
#ppx-panel .ppx-ai-dock .ai-consent{font-size:13px;line-height:1.4;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:8px 10px;display:none}\
#ppx-panel .ppx-ai-dock .ai-consent a{color:#fff;text-decoration:underline}\
#ppx-panel .ppx-ai-dock .ai-row{display:flex;gap:10px;align-items:center}\
#ppx-panel .ppx-ai-dock .ai-inp{flex:1;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#f7faf8;font-size:16px;outline:none}\
#ppx-panel .ppx-ai-dock .ai-inp::placeholder{color:rgba(255,255,255,.75)}\
#ppx-panel .ppx-ai-dock .ai-send{appearance:none;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 16px;background:#123f31;color:#fff;font-weight:700;cursor:pointer}\
#ppx-panel .ppx-ai-dock.busy .ai-send{opacity:.65;pointer-events:none}");
      var s=el('style',{id:'ppx-ai-inside-style'}); s.textContent=css; (document.head||document.documentElement).appendChild(s);
    }

    // Consent-Text
    var cfgAI=aiCfg(); var comp=cfgAI.compliance||{};
    $consentInline=el('div',{class:'ai-consent',role:'note'});
    var txt=esc(comp.consentText||'Deine Frage wird an unseren KI-Dienst gesendet.');
    txt+=' <a href="'+esc(comp.privacyUrl||'/datenschutz')+'" target="_blank" rel="noopener">Datenschutz</a> · ';
    txt+='<a href="'+esc(comp.imprintUrl||'/impressum')+'" target="_blank" rel="noopener">Impressum</a> · ';
    txt+=esc(comp.disclaimer||'Keine Rechts- oder Medizinberatung.');
    $consentInline.innerHTML=txt;

    // Input + Button
    $inp=el('input',{type:'text',class:'ai-inp',placeholder:'Frag unseren KI-Assistenten :)','aria-label':'KI-Frage eingeben'});
    $send=el('button',{type:'button',class:'ai-send'},'Senden');
    var row=el('div',{class:'ai-row'},$inp,$send);
    $dock=el('div',{class:'ppx-ai-dock'},$consentInline,row);

    // Platzierung: direkt über Brandbar/Footer oder ans Ende des Panels
    var v = viewEl();
    var panelFooter = (panel.querySelector('.ppx-brandbar, .ppx-elements-footer, .ai-elements-footer, .ppx-footer, footer')) || null;
    try{
      if(panelFooter){ panel.insertBefore($dock, panelFooter); }
      else if(v && v.parentNode===panel && v.nextSibling){ panel.insertBefore($dock, v.nextSibling); }
      else panel.appendChild($dock);
    }catch(e){ panel.appendChild($dock); }

    // Events
    $inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});
    $send.addEventListener('click',send);

    // Consent-Inline anzeigen, wenn noch nicht zugestimmt
    try{ if(!(localStorage.getItem('ppx_ai_consent')==='true')){ $consentInline.style.display='block'; } }catch(e){}
    return true;
  }

  function ensureDockLoop(){
    if(_dockTimer) return;
    _dockTries=0;
    _dockTimer = setInterval(function(){
      _dockTries++;
      var ok=ensureDock();
      if(ok || _dockTries>60){ try{ clearInterval(_dockTimer); }catch(e){} _dockTimer=null; }
    },1000);
  }
  // ---------- Consent (persist) ---------------------------------------------
  var _consented=false, _pendingQ=null;
  function loadConsent(){ try{ _consented=(localStorage.getItem('ppx_ai_consent')==='true'); }catch(e){ _consented=false; } return _consented; }
  function saveConsent(v){ _consented=!!v; try{ v?localStorage.setItem('ppx_ai_consent','true'):localStorage.removeItem('ppx_ai_consent'); }catch(e){} }
  function renderConsentBlock(originalQ){
    var A=aiCfg()||{}, C=A.compliance||{}, L=nowLang();
    _pendingQ=String(originalQ||'').slice(0,2000);
    var block=(PPX.ui&&PPX.ui.block)?PPX.ui.block('KI-Einwilligung',{blockKey:'ai-consent',maxWidth:'640px'}):appendToView(bubble('bot','KI-Einwilligung'));
    var msg=esc(C.consentText||'Deine Frage wird an unseren KI-Dienst gesendet. Keine sensiblen Daten eingeben.');
    var links=' <a class="ppx-link" href="'+esc(C.privacyUrl||'/datenschutz')+'" target="_blank" rel="noopener">Datenschutz</a> · '
             + '<a class="ppx-link" href="'+esc(C.imprintUrl||'/impressum')+'" target="_blank" rel="noopener">Impressum</a> · '
             + esc(C.disclaimer||'Keine Rechts- oder Medizinberatung.');
    block.appendChild((PPX.ui&&PPX.ui.line)?PPX.ui.line(msg+' '+links):document.createTextNode(msg));
    var r=(PPX.ui&&PPX.ui.row)?PPX.ui.row():document.createElement('div');
    var yesLbl=(L==='en')?'Agree & continue':'Zustimmen & fortfahren';
    var noLbl =(L==='en')?'Decline':'Ablehnen';
    var yes=(PPX.ui&&PPX.ui.btn)?PPX.ui.btn(yesLbl,onAgree,'ppx-cta','✅'):el('button',{class:'ppx-b ppx-cta',onclick:onAgree},yesLbl);
    var no =(PPX.ui&&PPX.ui.btn)?PPX.ui.btn(noLbl,onDecline,'ppx-secondary','✖️'):el('button',{class:'ppx-b ppx-secondary',onclick:onDecline},noLbl);
    r.appendChild(yes); r.appendChild(no); block.appendChild(r); PPX.ui&&PPX.ui.keepBottom&&PPX.ui.keepBottom();
    function onAgree(){ saveConsent(true); try{ if($consentInline) $consentInline.style.display='none'; }catch(e){} var q=_pendingQ; _pendingQ=null; if(q){ doWorker(q); } }
    function onDecline(){ saveConsent(false); appendToView(bubble('bot', esc(L==='en'?'Without consent I can’t send the question to our AI.':'Ohne Einwilligung können wir hier keine KI-Antwort senden.'))); }
  }

  // ---------- Worker wireup --------------------------------------------------
  function askWorker(question,cfg){
    var meta={provider:cfg.provider,model:cfg.model,maxTokens:(cfg.limits&&cfg.limits.maxTokens)||300,timeoutMs:(cfg.limits&&cfg.limits.timeoutMs)||8000,
              systemPrompt:cfg.systemPrompt,allowlist:cfg.allowlist,forbid:cfg.forbid,behaviors:cfg.behaviors,intentMap:cfg.intentMap};
    meta.brand=(PPX.data&&PPX.data.cfg&&PPX.data.cfg().brand)||''; meta.langs=cfg.languages||['de','en'];
    var url=(cfg.workerUrl||'').replace(/\/+$/,''); if(!/\/ask-ai$/.test(url)) url+='/ask-ai';
    return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({question:String(question||'').slice(0,2000),meta:meta})}).then(function(r){return r.json();});
  }

  // ---------- Active-flow helpers & fallback --------------------------------
  function toolMatchesActive(tool){ try{ return st().activeFlowId===toolAlias(tool); }catch(e){ return false; } }
  function pauseActiveFlow(){ /* hook (no-op) */ }
  function fallbackToContactForm(baseBubble){
    var cfg=aiCfg()||{}, fb=(cfg.fallback||{}), msg=fb.message||{}, L=nowLang();
    var m=(L==='en'?msg.en:msg.de)||"Das übertrifft mein Können. Magst du uns eine Nachricht da lassen?";
    if(baseBubble){ baseBubble.innerHTML=esc(m); } else { appendToView(bubble('bot', esc(m))); }
    openFlow('kontakt',{ startAt:(fb.step||'email'), skipHeader:!!fb.skipHeader });
  }

  // ---------- doWorker() -----------------------------------------------------
  async function doWorker(q){
    var cfg=aiCfg(), bWrap=appendToView(bubble('bot','⏳ …')), bBot=bWrap && bWrap.querySelector('.ppx-ai-bubble'), res=null;
    try{ res=await askWorker(q,cfg); }catch(e){ res=null; }
    if(!res || res.error){
      var count=bumpUnknown(); if(count>=2){ fallbackToContactForm(bBot); } else { offerContactChoice(); }
      return;
    }
    if(res.tool==='öffnungszeiten' && res.behavior==='one_liner'){ var h=hoursOneLiner(); if(h) res.text=h; }
    if(res.tool==='faq' && (!res.detail || !res.detail.category)){ var m=faqMatchFromTextStrict(q); if(m) res.detail={category:m}; }

    var allow=(cfg.allowlist||['reservieren','kontakt','öffnungszeiten','speisen','faq']).map(function(s){return String(s).toLowerCase();});
    var tool=(res.tool||'').toLowerCase();

    if(res.text && !tool){ if(bBot){ bBot.innerHTML=linkify(esc(res.text)); } resetUnknown(); moveThreadToEnd(); return; }
    if(!tool || allow.indexOf(tool)===-1 || tool==='kontakt'){
      var c=bumpUnknown(); if(c>=2){ fallbackToContactForm(bBot); } else { offerContactChoice(); }
      return;
    }
    if(res.text && bBot){ bBot.innerHTML=linkify(esc(res.text)); }
    if(st().activeFlowId && !toolMatchesActive(tool)){ pauseActiveFlow('ai-redirect'); }
    openFlow(tool, res.detail||{});
    resetUnknown(); moveThreadToEnd();
  }

  // ---------- send(): Routing ------------------------------------------------
  async function send(){
    ensureDock(); // falls DOM gerade neu gebaut wurde
    if(!$inp) return;
    var raw=String($inp.value||''); var q=raw.trim(); if(!q) return;
    if(!allowHit()){ showNote('Bitte kurz warten ⏳'); return; }
    $inp.value=''; userEcho(q);

    // 0) Öffnungszeiten (Smart Reply)
    if(matchesOpenHours(q)){ replyOpenHoursSmart(); resetUnknown(); resetOos(); return; }

    // 1) SPEISEN – Items vor Kategorien
    try{
      var DSH=dishes(), cats=Object.keys(DSH||{}), qn=_norm(q);
      for(var i=0;i<cats.length;i++){
        var ck=cats[i], arr=Array.isArray(DSH[ck])?DSH[ck]:[];
        for(var j=0;j<arr.length;j++){
          var nm=(arr[j].name||''), ne=(arr[j].name_en||''), nmN=_norm(nm), neN=_norm(ne), ckN=_norm(ck);
          if( (nm && (wbRegex(nm).test(q) || wbNormHit(nmN,qn))) ||
              (ne && (wbRegex(ne).test(q) || wbNormHit(neN,qn))) ||
              (ckN && nmN && qn.indexOf(ckN)>=0 && qn.indexOf(nmN)>=0) ){
            if(st().activeFlowId && !toolMatchesActive('speisen')){ pauseActiveFlow('ai-speisen'); }
            openFlow('speisen',{category:ck,itemId:arr[j].id}); resetUnknown(); resetOos(); return;
          }
        }
      }
      for(var i2=0;i2<cats.length;i2++){
        var ck2=cats[i2], lab=(function(){var C=cfg(), L=nowLang(), obj=(C.menuTitles && C.menuTitles[ck2])||null; return obj?(L==='en'?obj.en:(obj.de||ck2)):ck2; })();
        var ckN2=_norm(ck2), labN=_norm(lab);
        if(wbRegex(ck2).test(q) || wbRegex(lab).test(q) || wbNormHit(ckN2,qn) || wbNormHit(labN,qn)){
          if(st().activeFlowId && !toolMatchesActive('speisen')){ pauseActiveFlow('ai-speisen'); }
          openFlow('speisen',{category:ck2}); resetUnknown(); resetOos(); return;
        }
      }
    }catch(e){}

    // 2) FAQ (strikt)
    try{
      var fc=faqMatchFromTextStrict(q);
      if(fc){ if(st().activeFlowId && !toolMatchesActive('faq')){ pauseActiveFlow('ai-faq'); }
        openFlow('faq',{category:fc,behavior:'silent'}); resetUnknown(); resetOos(); return; }
    }catch(e){}

    // 3) Statische Intents
    var intents={
      reservieren:['reservieren','tisch','buchen','booking','reserve'],
      kontakt:['kontakt','email','mail','anrufen','telefon','call'],
      'öffnungszeiten':['öffnungszeiten','zeiten','hours','open','geöffnet','geoeffnet','offen','open today','are you open today'],
      speisen:['speisen','speise','gericht','gerichte','essen','menü','menu','karte','speisekarte','hunger','ich habe hunger','food']
    };
    for(var tool in intents){
      if((intents[tool]||[]).some(function(w){return wbRegex(w).test(q);})){
        if(st().activeFlowId && !toolMatchesActive(tool)){ pauseActiveFlow('ai-intent'); }
        openFlow(tool,{}); resetUnknown(); resetOos(); return;
      }
    }

    // 4) Smalltalk
    var sm=detectSmalltalk(q);
    if(sm){ appendToView(bubble('bot', esc(sm))); resetUnknown(); resetOos(); moveThreadToEnd(); return; }

    // 5) Nicht im Angebot
    if(maybeNotOffered(q)){ resetUnknown(); resetOos(); return; }

    // 6) Out-of-scope
    if(isOutOfScope(q)){ respondOutOfScope(q); resetUnknown(); return; }

    // 7) Consent → KI
    if(!_consented && !loadConsent()){ renderConsentBlock(q); return; }
    doWorker(q);
  }

  // ---------- Boot & Export --------------------------------------------------
  function boot(){
    try{ loadConsent(); }catch(e){}
    ensureDockLoop(); // baue Dock nachträglich, falls Panel bereit
    ensureDock();
    // Falls Panel später geöffnet wird, erneut prüfen
    window.addEventListener('ppx:panel:open', function(){ ensureDock(); ensureDockLoop(); });
    // Safety: falls View neu gerendert wurde
    try{
      var mo=new MutationObserver(function(){
        var panel=document.getElementById('ppx-panel');
        if(panel && !panel.querySelector('.ppx-ai-dock')) ensureDock();
      });
      mo.observe(document.documentElement||document.body,{childList:true,subtree:true});
      setTimeout(function(){ try{ mo.disconnect(); }catch(e){} },60000);
    }catch(e){}
  }

  PPX.services.ai=AI;
  AI.send=send; AI.boot=boot;
  AI.faqCategoryMapStrict=faqCategoryMapStrict; AI.faqMatchFromTextStrict=faqMatchFromTextStrict;

  try{ boot(); }catch(e){}
})();
