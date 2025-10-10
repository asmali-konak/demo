/* ============================================================================
   PPX AI Service – v2.2.8
   Change: Entfernt selectSpeisen(...) nach openFlow('speisen', detail),
           um doppeltes Rendern (Kategorie + Item) und doppelte Reservierungs-
           CTA zu verhindern.
   v2.2.7: Direkter Flow-Call (stepSpeisen etc.) statt UI-Fallback, damit detail
           korrekt ankommt und kein doppelter Speisen-Root gerendert wird.
   v2.2.6: Chronologie-Fix (moveThreadToEnd(force))
   ============================================================================ */
(function () {
  'use strict';
  var W=window, D=document;
  var PPX=W.PPX=W.PPX||{}; PPX.services=PPX.services||{};
  var AI={};

  // --- utils -----------------------------------------------------------------
  function el(tag,attrs){var n=D.createElement(tag);attrs=attrs||{};
    Object.keys(attrs).forEach(function(k){var v=attrs[k];
      if(k==='text') n.textContent=v;
      else if(k==='html') n.innerHTML=v;
      else if(k==='style'&&v&&typeof v==='object') Object.assign(n.style,v);
      else n.setAttribute(k,v);
    });
    for(var i=2;i<arguments.length;i++){var c=arguments[i];
      if(c!=null) n.appendChild(typeof c==='string'?D.createTextNode(c):c);
    }
    return n;
  }
  function esc(s){return String(s).replace(/[&<>"']/g,function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]);});}
  function linkify(s){return s.replace(/\bhttps?:\/\/[^\s)]+/g,function(u){return '<a href="'+u+'" target="_blank" rel="nofollow noopener" class="ppx-link">'+u+'</a>';});}
  function viewEl(){ return D.getElementById('ppx-v'); }
  function now(){ return Date.now(); }
  function st(){ PPX.state=PPX.state||{activeFlowId:null,expecting:null}; return PPX.state; }

  // --- normalizer ------------------------------------------------------------
  function _norm(s){
    return String(s||'').toLowerCase()
      .replace(/[ä]/g,'ae').replace(/[ö]/g,'oe').replace(/[ü]/g,'ue').replace(/[ß]/g,'ss')
      .replace(/[ç]/g,'c').replace(/[ş]/g,'s').replace(/[ı]/g,'i')
      .replace(/[éèêë]/g,'e').replace(/[áàâ]/g,'a').replace(/[íìî]/g,'i').replace(/[óòô]/g,'o').replace(/[úùû]/g,'u')
      .replace(/[_.,!?;:()[\]{}"']/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function uniq(arr){
    var seen=Object.create(null), out=[];
    for(var i=0;i<(arr||[]).length;i++){
      var v=_norm(arr[i]); if(!v) continue;
      if(!seen[v]){ seen[v]=1; out.push(v); }
    }
    return out;
  }
  function wbRegex(term){
    var t=_norm(term).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
    return new RegExp('(^|\\W)'+t+'(\\W|$)','i');
  }

  // --- AI cfg (SSoT) ---------------------------------------------------------
  function readAI(){
    var A=(PPX.data&&PPX.data.ai&&PPX.data.ai())||{},L=A.limits||{},T=A.tone||{},CMP=A.compliance||{},intents=A.intents||{};
    function catMap(n){var o={},c=n&&n.categories; if(!c) return o;
      Object.keys(c).forEach(function(k){
        var a=(c[k]&&(c[k].keywords||c[k])); o[k]=Array.isArray(a)?uniq(a):[];
      }); return o;
    }
    var speisenKw = [], speisenItems = [], speisenItemsMap = {};
    try{
      if(intents.speisen){
        var baseK = intents.speisen.keywords || [];
        if(Array.isArray(baseK)) speisenKw = uniq(baseK);
        var items = intents.speisen.items || [];
        if(Array.isArray(items)){
          for(var i=0;i<items.length;i++){
            var it = items[i]||{}, names = it.names||[];
            for(var j=0;j<names.length;j++){
              var nkey=_norm(names[j]); if(!nkey) continue;
              if(!speisenItemsMap[nkey]) speisenItemsMap[nkey]={category:it.category||'', itemId:it.itemId||''};
              speisenItems.push(names[j]);
            }
          }
          speisenItems = uniq(speisenItems);
        }
      }
    }catch(e){}
    var intentMap={
      reservieren:(intents.reservieren&&intents.reservieren.keywords)||intents.reservieren||[],
      kontakt:(intents.kontakt&&intents.kontakt.keywords)||intents.kontakt||[],
      "öffnungszeiten":(intents["öffnungszeiten"]&&intents["öffnungszeiten"].keywords)||intents["öffnungszeiten"]||[],
      speisen:{ keywords:speisenKw, categories:catMap(intents.speisen), items:speisenItems, itemsMap:speisenItemsMap },
      faq:{ categories:catMap(intents.faq) }
    };
    var behaviors={
      reservieren:(intents.reservieren&&intents.reservieren.behavior)||"silent",
      kontakt:(intents.kontakt&&intents.kontakt.behavior)||"silent",
      "öffnungszeiten":(intents["öffnungszeiten"]&&intents["öffnungszeiten"].behavior)||"one_liner",
      speisen:(intents.speisen&&intents.speisen.behavior)||"two_liners",
      faq:(intents.faq&&intents.faq.behavior)||"two_liners"
    };
    var H=A.knowledgeHints||{};
    return {
      enabled:A.enabled!==false,
      workerUrl:(A.workerUrl||'').replace(/\/+$/,'')+'/ask-ai',
      provider:A.provider||'openai',
      model:A.model||'gpt-4o-mini',
      limits:{ratePerMin:Math.max(1,Number(L.ratePerMin||15)),dailyCapEur:Number(L.dailyCapEur||5),
              maxTokens:Math.min(800,Number(L.maxTokens||300)),timeoutMs:Math.min(15000,Number(L.timeoutMs||8000))},
      tone:{voice:T.voice||'freundlich, direkt, sachlich',length:T.length||'kurz',
            emojis:Number(T.emojis||0),exclamationsMax:Number(T.exclamationsMax||1),address:T.address||'du'},
      languages:Array.isArray(A.languages)?A.languages:['de','en'],
      behaviors:behaviors,intentMap:intentMap,
      allowlist:["reservieren","kontakt","öffnungszeiten","speisen","faq"],
      forbid:Array.isArray(H.forbid)?H.forbid:["andere_restaurants","wetter","news","preise_erfinden","medizin","recht","smalltalk"],
      knowledge:{prioritize:Array.isArray(H.prioritize)?H.prioritize:["hours","menu","faq"],contextShort:H.contextShort||""},
      compliance:{consentText:(CMP.consentText||"Deine Frage wird an unseren KI-Dienst gesendet. Keine sensiblen Daten eingeben."),
                  privacyUrl:CMP.privacyUrl||"/datenschutz",imprintUrl:CMP.imprintUrl||"/impressum",
                  disclaimer:CMP.disclaimer||"Keine Rechts- oder Medizinberatung."},
      systemPrompt:A.systemPrompt||""
    };
  }

  // --- DOM helpers / Labels --------------------------------------------------
  function nowLang(){ try{ return (PPX.i18n&&PPX.i18n.nowLang&&PPX.i18n.nowLang()) || PPX.lang || 'de'; }catch(e){ return 'de'; } }
  function cfg(){ try{ return (PPX.data&&PPX.data.cfg&&PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function dishes(){ try{ return (PPX.data&&PPX.data.dishes&&PPX.data.dishes()) || {}; } catch(e){ return {}; } }
  function catLabelFromKey(catKey){
    var C=cfg(), L=nowLang();
    var obj=(C.menuTitles && C.menuTitles[catKey]) || null;
    if(obj && typeof obj==='object'){
      return (L==='en' && obj.en) ? obj.en : (obj.de || catKey);
    }
    return catKey;
  }
  function itemLabel(catKey,itemId){
    var DSH=dishes(), L=nowLang();
    var arr=Array.isArray(DSH[catKey])?DSH[catKey]:[];
    for(var i=0;i<arr.length;i++){
      var it=arr[i]; if(String(it.id)===String(itemId)){
        return (L==='en' && typeof it.name_en!=='undefined') ? it.name_en : (it.name || '');
      }
    }
    return '';
  }
  function findChipByTextWithin(root,label){
    if(!root||!label) return null;
    var want=_norm(label);
    var nodes=[].slice.call(root.querySelectorAll('.ppx-chip, .ppx-opt, button, a'));
    for(var i=0;i<nodes.length;i++){
      var txt=(nodes[i].innerText||nodes[i].textContent||'').trim();
      if(_norm(txt)===want) return nodes[i];
    }
    for(var j=0;j<nodes.length;j++){
      var t2=(nodes[j].innerText||nodes[j].textContent||'').trim();
      if(_norm(t2).indexOf(want)!==-1) return nodes[j];
    }
    return null;
  }
  function clickChipAfterRender(targetFn, tries){
    tries = (typeof tries==='number')?tries:16;
    var i=0;
    (function tick(){
      try{ if(targetFn()===true) return; }catch(e){}
      if(++i>=tries) return;
      setTimeout(tick,100);
    })();
  }
  // NOTE: selectSpeisen bleibt vorhanden, wird aber NICHT mehr automatisch
  // nach openFlow(...) genutzt – nur für manuelle/Legacy-Fälle.
  function selectSpeisen(detail){
    if(!detail) return;
    if(detail.category){
      var catKey=String(detail.category);
      var label=catLabelFromKey(catKey);
      clickChipAfterRender(function(){
        var root=D.querySelector('[data-block="speisen-root"]');
        if(!root) return false;
        var chip=findChipByTextWithin(root,label);
        if(!chip) return false;
        chip.click();
        return true;
      });
    }
    if(detail.category && detail.itemId){
      var catKey2=String(detail.category);
      var itemLbl=itemLabel(catKey2, String(detail.itemId));
      if(itemLbl){
        clickChipAfterRender(function(){
          var root2=D.querySelector('[data-block="speisen-cat"]');
          if(!root2) return false;
          var itemChip=findChipByTextWithin(root2,itemLbl);
          if(!itemChip) return false;
          itemChip.click();
          return true;
        });
      }
    }
  }
  // --- thread & bubbles ------------------------------------------------------
  var $panel,$v,$dock,$inp,$send,$consent;
  var reorderLock=false;
  function viewRoot(){ return viewEl(); }
  function ensureThread(){
    $v=viewRoot(); if(!$v) return null;
    var t=$v.querySelector('#ppx-ai-thread');
    if(!t){ t=el('div',{id:'ppx-ai-thread',style:{marginTop:'8px'}}); $v.appendChild(t); }
    return t;
  }
  // allow forcing even during reorderLock
  function moveThreadToEnd(force){
    if(!force && reorderLock) return;
    $v=viewRoot(); if(!$v) return;
    var t=$v.querySelector('#ppx-ai-thread'); if(!t) return;
    if($v.lastElementChild!==t) $v.appendChild(t);
    try{
      $v.scrollTop=$v.scrollHeight;
      requestAnimationFrame(function(){ $v.scrollTop=$v.scrollHeight; });
    }catch(e){}
  }
  function bubble(side,html){
    var wrap=el('div',{class:'ppx-ai-bwrap'});
    var b=el('div',{class:'ppx-ai-bubble',style:{
      margin:'8px 0',padding:'10px 12px',borderRadius:'12px',
      border:'1px solid var(--ppx-bot-chip-border, rgba(255,255,255,.18))',
      background: side==='user' ? 'rgba(255,255,255,.10)' : 'var(--ppx-bot-chip, rgba(255,255,255,.06))',
      color:'var(--ppx-bot-text,#fff)',maxWidth:'86%'
    }});
    if(side==='user') wrap.style.textAlign='right';
    b.innerHTML=html; wrap.appendChild(b); return wrap;
  }
  function userEcho(text){
    var v=viewRoot(); if(!v) return null;
    var wrap=el('div',{class:'ppx-user-echo',
      style:{textAlign:'right',margin:'8px 0 0',padding:'0 4px',color:'var(--ppx-bot-text,#fff)'}});
    var span=el('span',{html:esc(text)});
    wrap.appendChild(span); v.appendChild(wrap);
    // push to bottom immediately
    moveThreadToEnd(true);
    return wrap;
  }
  function showNote(txt){
    var t=ensureThread(); if(!t) return;
    var n=el('div',{class:'ppx-note',style:{
      background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.28)',
      borderLeft:'4px solid var(--ppx-accent,#c9a667)',borderRadius:'12px',
      padding:'8px 10px',marginTop:'8px'}},txt);
    t.appendChild(n); moveThreadToEnd(true);
  }

  // --- rate-limit + dock -----------------------------------------------------
  var rl={hits:[],max:15};
  function allowHit(){
    var t=now(); rl.hits=rl.hits.filter(function(h){return t-h<60000;});
    if(rl.hits.length>=rl.max) return false; rl.hits.push(t); return true;
  }

  function ensureDock(){
    var panel=document.getElementById('ppx-panel'); $v=viewRoot(); if(!panel||!$v) return false;
    var exist=panel.querySelector('.ppx-ai-dock');
    if(exist){ $dock=exist; $inp=$dock.querySelector('.ai-inp'); $send=$dock.querySelector('.ai-send'); $consent=$dock.querySelector('.ai-consent'); return true; }
    if(!document.getElementById('ppx-ai-inside-style')){
      var css=("#ppx-panel .ppx-ai-dock{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:var(--ppx-bot-header,#0f3a2f);border-top:1px solid rgba(0,0,0,.25)}\
#ppx-panel .ppx-ai-dock .ai-consent{font-size:13px;line-height:1.4;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:8px 10px}\
#ppx-panel .ppx-ai-dock .ai-consent a{color:#fff;text-decoration:underline}\
#ppx-panel .ppx-ai-dock .ai-row{display:flex;gap:10px;align-items:center}\
#ppx-panel .ppx-ai-dock .ai-inp{flex:1;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#f7faf8;font-size:16px;outline:none}\
#ppx-panel .ppx-ai-dock .ai-inp::placeholder{color:rgba(255,255,255,.75)}\
#ppx-panel .ppx-ai-dock .ai-send{appearance:none;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 16px;background:#123f31;color:#fff;font-weight:700;cursor:pointer}\
#ppx-panel .ppx-ai-dock.busy .ai-send{opacity:.65;pointer-events:none}");
      var s=el('style',{id:'ppx-ai-inside-style'}); s.textContent=css; (document.head||document.documentElement).appendChild(s);
    }
    var cfg=readAI();
    $consent=el('div',{class:'ai-consent',role:'note',style:{display:'none'}});
    var txt=esc(cfg.compliance.consentText)+' ';
    txt+='<a href="'+esc(cfg.compliance.privacyUrl)+'" target="_blank" rel="noopener">Datenschutz</a> · ';
    txt+='<a href="'+esc(cfg.compliance.imprintUrl)+'" target="_blank" rel="noopener">Impressum</a> · ';
    txt+=esc(cfg.compliance.disclaimer);
    $consent.innerHTML=txt;

    $inp=el('input',{type:'text',class:'ai-inp',placeholder:'Frag unseren KI-Assistenten :)','aria-label':'KI-Frage eingeben'});
    $send=el('button',{type:'button',class:'ai-send'},'Senden');
    var row=el('div',{class:'ai-row'},$inp,$send);
    $dock=el('div',{class:'ppx-ai-dock'},$consent,row);
    if($v.nextSibling){ panel.insertBefore($dock,$v.nextSibling); } else { panel.appendChild($dock); }
    $inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});
    $send.addEventListener('click',send);
    return true;
  }

  // --- consent & worker ------------------------------------------------------
  var _consented=false;
  function ensureConsent(){
    var cfg=readAI(); if(_consented){ if($consent) $consent.style.display='none'; return true; }
    if($consent){ $consent.style.display='block'; } return false;
  }

  function askWorker(question,cfg){
    var meta={provider:cfg.provider,model:cfg.model,maxTokens:cfg.limits.maxTokens,timeoutMs:cfg.limits.timeoutMs,
              systemPrompt:cfg.systemPrompt,allowlist:cfg.allowlist,forbid:cfg.forbid,
              behaviors:cfg.behaviors,intentMap:cfg.intentMap};
    meta.brand=(PPX.data&&PPX.data.cfg&&PPX.data.cfg().brand)||''; meta.langs=cfg.languages;
    return fetch(cfg.workerUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({question:String(question||'').slice(0,2000),meta:meta})}).then(function(r){return r.json();});
  }

  // --- flows öffnen ----------------------------------------------------------
  function cap(s){ s=String(s||''); return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
  function openFlow(tool,detail){
    try{
      // 1) Direkter Flow-Call, wenn vorhanden (stepSpeisen, stepReservieren, …)
      var fn = PPX.flows && PPX.flows['step'+cap(tool)];
      if (typeof fn === 'function'){ fn(detail||{}); return true; }

      // 2) Generische Router-Funktion, falls ihr später PPX.flows.open ergänzt
      if(PPX.flows&&typeof PPX.flows.open==='function'){ PPX.flows.open(tool,detail||{}); return true; }
    }catch(e){}

    // 3) Event an App – kann ein globaler Listener übernehmen
    try{ window.dispatchEvent(new CustomEvent('ppx:tool',{detail:{tool:tool,detail:detail||{}}})); }catch(e){}

    // 4) UI-Fallback (Button suchen & klicken) – letzter Versuch
    return openFlowHint(tool);
  }
  function openFlowHint(tool){
    var v=viewRoot(); if(!v) return false;
    var words={
      reservieren:['reservieren','reserve','buchen','booking','tisch','table'],
      kontakt:['kontakt','contact','email','mail','anrufen','call','telefon'],
      'öffnungszeiten':['öffnungszeiten','zeiten','hours','open','geöffnet'],
      speisen:['speisen','speise','gerichte','gericht','menu','menue','speisekarte','essen','durst','getränk','getraenk','ayran','cola','fanta','sprite','raki','tee','cay','çay','wasser'],
      faq:['faq','fragen','hilfe']
    }[tool]||[tool];
    var btn=[].find.call(v.querySelectorAll('.ppx-b,.ppx-chip,.ppx-opt,button,a'),function(n){
      var t=(n.innerText||n.textContent||'').toLowerCase(); return words.some(function(k){return t.indexOf(k)!==-1;});
    });
    if(btn){ btn.click(); return true; }
    return false;
  }
  // --- opening-hours & telemetry --------------------------------------------
  function hoursOneLiner(){
    try{
      var svc=PPX.services&&PPX.services.openHours;
      if(!svc||typeof svc.describeToday!=='function') return '';
      return svc.describeToday();
    }catch(e){ return ''; }
  }
  function tPing(ev){ try{ if(PPX.services&&PPX.services.telemetry){ PPX.services.telemetry.ping(ev||{}); } }catch(e){} }

  // --- flow-state helpers ----------------------------------------------------
  function pauseActiveFlow(reason){
    var S=st(); if(!S.activeFlowId) return;
    var prev=S.activeFlowId; S.activeFlowId=null; S.expecting=null;
    try{ window.dispatchEvent(new CustomEvent('ppx:flow:pause',{detail:{flow:prev,reason:reason||'ai-divert'}})); }catch(e){}
  }
  function toolMatchesActive(tool){
    var S=st(); if(!S.activeFlowId||!tool) return false;
    return String(tool).toLowerCase()===String(S.activeFlowId).toLowerCase();
  }

  // --- local pre-match (Regex WB: Items > Kategorien > Basis) ----------------
  function localPreMatch(text,cfg){
    var q=_norm(text); if(!q) return null;
    var m=cfg&&cfg.intentMap&&cfg.intentMap.speisen; if(!m) return null;

    // 1) Items
    var im=m.itemsMap||{}, bestItem=null, bestLen=0;
    Object.keys(im).forEach(function(key){
      if(!key) return;
      if(wbRegex(key).test(q)){
        if(key.length>bestLen){ bestLen=key.length; bestItem={category:im[key].category||'', itemId:im[key].itemId||''}; }
      }
    });
    if(bestItem){ return { tool:'speisen', behavior:'silent', toolDetail:bestItem, answer:'' }; }

    // 2) Kategorien
    var cats=m.categories||{}, catHit=null, catLen=0;
    Object.keys(cats).forEach(function(cat){
      var arr=cats[cat]||[];
      for(var i=0;i<arr.length;i++){
        var kk=_norm(arr[i]); if(!kk) continue;
        if(wbRegex(kk).test(q)){ if(kk.length>catLen){ catLen=kk.length; catHit=cat; } }
      }
    });
    if(catHit){ return { tool:'speisen', behavior:'silent', toolDetail:{category:catHit}, answer:'' }; }

    // 3) Basis
    var base=m.keywords||[];
    for(var j=0;j<base.length;j++){
      var b=_norm(base[j]); if(!b) continue;
      if(wbRegex(b).test(q)){ return { tool:'speisen', behavior:'silent', toolDetail:null, answer:'' }; }
    }
    return null;
  }

  // --- refine nach Worker (wenn tool:"speisen" ohne Detail) ------------------
  function localRefineSpeisenAfterWorker(text,cfg,detail){
    if(detail&&((detail.itemId&&detail.category)||detail.category)) return detail;
    var m=cfg&&cfg.intentMap&&cfg.intentMap.speisen; if(!m) return detail||null;
    var q=_norm(text); if(!q) return detail||null;

    // Items zuerst
    var im=m.itemsMap||{}, bestItem=null, bestLen=0;
    Object.keys(im).forEach(function(key){
      if(!key) return;
      if(wbRegex(key).test(q)){
        if(key.length>bestLen){ bestLen=key.length; bestItem={category:im[key].category||'', itemId:im[key].itemId||''}; }
      }
    });
    if(bestItem) return bestItem;

    // Kategorien
    var cats=m.categories||{}, catHit=null, catLen=0;
    Object.keys(cats).forEach(function(cat){
      var arr=cats[cat]||[];
      for(var i=0;i<arr.length;i++){
        var kk=_norm(arr[i]); if(!kk) continue;
        if(wbRegex(kk).test(q)){ if(kk.length>catLen){ catLen=kk.length; catHit=cat; } }
      }
    });
    if(catHit) return {category:catHit};

    return detail||null;
  }
  // --- send ------------------------------------------------------------------
  function send(){
    var cfg=readAI(); if(!cfg.enabled) return;
    if(!ensureDock()) return;
    var text=($inp&&$inp.value||'').trim(); if(!text){ if($inp)$inp.focus(); return; }

    if(!_consented){ if(!ensureConsent()){ _consented=true; if($consent) $consent.style.display='none'; } }
    if(!allowHit()){ showNote('Bitte kurz warten – kleines Limit zum Schutz aktiv.'); return; }

    var t0=now();
    var pendingEcho = userEcho(text); // pusht bereits nach unten
    $dock.classList.add('busy');

    // 1) Prematch (Items > Kategorien > Basis)
    var pm=localPreMatch(text,cfg);
    if(pm && pm.tool==='speisen'){
      reorderLock=true; setTimeout(function(){ reorderLock=false; }, 1600);
      if(st().activeFlowId && !toolMatchesActive('speisen')){ pauseActiveFlow('ai-offtopic'); }

      // Direkter Flow-Aufruf; KEIN selectSpeisen(...) mehr!
      openFlow('speisen', pm.toolDetail||null);
      moveThreadToEnd(true);
      setTimeout(function(){ moveThreadToEnd(true); }, 0);
      setTimeout(function(){ moveThreadToEnd(true); }, 300);

      tPing({intent:'speisen', ok:true, durationMs: now()-t0, note:'prematch'});
      if($inp) $inp.value='';
      $dock.classList.remove('busy');
      if($inp) $inp.focus();
      moveThreadToEnd(true);
      return;
    }

    // 2) Worker
    askWorker(text,cfg).then(function(res){
      if(res && res.error){
        showNote('Ups, die KI antwortet gerade nicht. Versuch es gleich nochmal.');
        tPing({intent:'',ok:false,durationMs:now()-t0,note:'err'});
        return;
      }

      var tool=(res&&res.tool)||'';
      var behavior=(res&&res.behavior)||(tool?(cfg.behaviors[tool]||'one_liner'):'two_liners');
      var answer=(res&&(res.answer||res.output||res.text))||'';
      var detail=(res&&res.toolDetail)||null;

      if(st().activeFlowId && !toolMatchesActive(tool)){ pauseActiveFlow('ai-offtopic'); }
      if(tool==='öffnungszeiten' && behavior==='one_liner'){
        var h=hoursOneLiner(); if(h) answer=h;
      }
      if(tool==='speisen'){ detail = localRefineSpeisenAfterWorker(text,cfg,detail); }

      if(behavior!=='silent'){
        if(pendingEcho && pendingEcho.parentNode) pendingEcho.parentNode.removeChild(pendingEcho);
        var tEl=ensureThread(); if(!tEl) return;
        tEl.appendChild(bubble('user',esc(text)));
        var out=linkify(esc(answer)).trim(); if(!out) out='Gerne.';
        if(behavior==='one_liner') out=out.split(/[\n\r]+/)[0];
        tEl.appendChild(bubble('bot',out));
        reorderLock=false; moveThreadToEnd(true);
      } else {
        reorderLock=true; setTimeout(function(){ reorderLock=false; }, 1600);
      }

      if(tool){
        // Direkter Flow-Aufruf; KEIN selectSpeisen(...) mehr!
        openFlow(String(tool).toLowerCase(), detail||null);
        moveThreadToEnd(true);
        setTimeout(function(){ moveThreadToEnd(true); }, 0);
        setTimeout(function(){ moveThreadToEnd(true); }, 300);
      }

      tPing({intent:tool||'', ok:true, durationMs: now()-t0});
    }).catch(function(err){
      console.error('[PPX AI] Worker error:', err);
      showNote('Ups, die KI antwortet gerade nicht. Versuch es gleich nochmal.');
      tPing({intent:'', ok:false, durationMs: now()-t0, note:'exception'});
    }).finally(function(){
      if($inp) $inp.value='';
      $dock.classList.remove('busy');
      if($inp) $inp.focus();
      moveThreadToEnd(true);
    });
  }

  // --- boot ------------------------------------------------------------------
  function boot(){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',boot,{once:true});
      return;
    }
    ensureDock(); ensureThread();
    window.addEventListener('click', function(){
      var p=document.getElementById('ppx-panel');
      if(p && p.classList.contains('ppx-open') && !p.querySelector('.ppx-ai-dock')) ensureDock();
      ensureThread();
    });
  }

  AI.boot=boot; PPX.services.ai=AI; boot();
})();
