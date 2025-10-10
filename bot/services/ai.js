/* ============================================================================
   PPX AI Service – v2.3.4
   Änderungen:
   - STRIKTES FAQ-Matching (Hybrid):
     * Triggern über exakte Kategorienamen (key, title, title_en)
     * PLUS nur explizite Synonyme aus AI.intents.faq.categories.<key>
     * Keine Tokenisierung, keine Heuristik.
   - Prematch läuft vor dem Worker (verhindert ⏳ bei klaren Treffern).
   - Dock-Fix: Eingabefeld erscheint auch, wenn #ppx-v spät vorhanden ist.
============================================================================ */
(function () {
  'use strict';
  var W=window, D=document;
  var PPX=W.PPX=W.PPX||{}; PPX.services=PPX.services||{};
  var AI={};

  // --- utils -----------------------------------------------------------------
  function el(tag,attrs){var n=D.createElement(tag);attrs=attrs||{};
    Object.keys(attrs||{}).forEach(function(k){var v=attrs[k];
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

  // --- data getters ----------------------------------------------------------
  function nowLang(){ try{ return (PPX.i18n&&PPX.i18n.nowLang&&PPX.i18n.nowLang()) || PPX.lang || 'de'; }catch(e){ return 'de'; } }
  function cfg(){ try{ return (PPX.data&&PPX.data.cfg&&PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function dishes(){ try{ return (PPX.data&&PPX.data.dishes&&PPX.data.dishes()) || {}; } catch(e){ return {}; } }
  function faqs(){ try{ return (PPX.data&&PPX.data.faqs&&PPX.data.faqs()) || []; } catch(e){ return []; } }
  function aiCfg(){ try{ return (PPX.data&&PPX.data.ai&&PPX.data.ai()) || {}; } catch(e){ return {}; } }

  // --- DOM helpers / labels (Speisen) ---------------------------------------
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

  // --- UI helpers ------------------------------------------------------------
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
    var i=0;(function tick(){try{ if(targetFn()===true) return; }catch(e){} if(++i>=tries) return; setTimeout(tick,100);})();
  }
  function selectSpeisen(detail){
    if(!detail) return;
    if(detail.category){
      var catKey=String(detail.category), label=catLabelFromKey(catKey);
      clickChipAfterRender(function(){
        var root=D.querySelector('[data-block="speisen-root"]'); if(!root) return false;
        var chip=findChipByTextWithin(root,label); if(!chip) return false; chip.click(); return true;
      });
    }
    if(detail.category && detail.itemId){
      var catKey2=String(detail.category), itemLbl=itemLabel(catKey2, String(detail.itemId));
      if(itemLbl){
        clickChipAfterRender(function(){
          var root2=D.querySelector('[data-block="speisen-cat"]'); if(!root2) return false;
          var itemChip=findChipByTextWithin(root2,itemLbl); if(!itemChip) return false; itemChip.click(); return true;
        });
      }
    }
  }

  // --- thread & bubbles ------------------------------------------------------
  var $v,$dock,$inp,$send,$consent; var reorderLock=false;
  function viewRoot(){ return viewEl(); }
  function ensureThread(){
    $v=viewRoot(); if(!$v) return null;
    var t=$v.querySelector('#ppx-ai-thread');
    if(!t){ t=el('div',{id:'ppx-ai-thread',style:{marginTop:'8px'}}); $v.appendChild(t); }
    return t;
  }
  function moveThreadToEnd(force){
    if(!force && reorderLock) return;
    $v=viewRoot(); if(!$v) return;
    var t=$v.querySelector('#ppx-ai-thread'); if(!t) return;
    if($v.lastElementChild!==t) $v.appendChild(t);
    try{ $v.scrollTop=$v.scrollHeight; requestAnimationFrame(function(){ $v.scrollTop=$v.scrollHeight; }); }catch(e){}
  }
  function bubble(side,html){
    var wrap=el('div',{class:'ppx-ai-bwrap'});
    var b=el('div',{class:'ppx-ai-bubble',style:{
      margin:'8px 0',padding:'10px 12px',borderRadius:'12px',
      border:'1px solid var(--ppx-bot-chip-border, rgba(255,255,255,.18))',
      background: side==='user' ? 'rgba(255,255,255,.10)' : 'var(--ppx-bot-chip, rgba(255,255,255,.06))',
      color:'var(--ppx-bot-text,#fff)',maxWidth:'86%'
    }}); if(side==='user') wrap.style.textAlign='right';
    b.innerHTML=html; wrap.appendChild(b); return wrap;
  }
  function userEcho(text){
    var v=viewRoot(); if(!v) return null;
    var wrap=el('div',{class:'ppx-user-echo',style:{textAlign:'right',margin:'8px 0 0',padding:'0 4px',color:'var(--ppx-bot-text,#fff)'}});
    var span=el('span',{html:esc(text)}); wrap.appendChild(span); v.appendChild(wrap);
    moveThreadToEnd(true); return wrap;
  }

  // --- notes / rate-limit + dock --------------------------------------------
  var rl={hits:[],max:15};
  function allowHit(){
    var t=now(); rl.hits=rl.hits.filter(function(h){return t-h<60000;});
    if(rl.hits.length>=rl.max) return false; rl.hits.push(t); return true;
  }

  var $panel;
  function showNote(txt){
    var t=ensureThread(); if(!t) return;
    var n=el('div',{class:'ppx-note',style:{
      background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.28)',
      borderLeft:'4px solid var(--ppx-accent,#c9a667)',borderRadius:'12px',
      padding:'8px 10px',marginTop:'8px'}},txt);
    t.appendChild(n); moveThreadToEnd(true);
  }

  // Dock sicher anlegen – auch wenn #ppx-v beim ersten Mal fehlt
  function ensureDock(){
    var panel=document.getElementById('ppx-panel'); $panel=panel;
    if(!panel) return false;

    var exist=panel.querySelector('.ppx-ai-dock');
    if(exist){
      $dock=exist; $inp=$dock.querySelector('.ai-inp'); $send=$dock.querySelector('.ai-send'); $consent=$dock.querySelector('.ai-consent');
      return true;
    }

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

    var cfgAI=aiCfg();
    $consent=el('div',{class:'ai-consent',role:'note',style:{display:'none'}});
    var txt=esc(cfgAI.compliance && cfgAI.compliance.consentText || 'Deine Frage wird an unseren KI-Dienst gesendet.');
    txt+=' <a href="'+esc((cfgAI.compliance&&cfgAI.compliance.privacyUrl)||'/datenschutz')+'" target="_blank" rel="noopener">Datenschutz</a> · ';
    txt+='<a href="'+esc((cfgAI.compliance&&cfgAI.compliance.imprintUrl)||'/impressum')+'" target="_blank" rel="noopener">Impressum</a> · ';
    txt+=esc((cfgAI.compliance&&cfgAI.compliance.disclaimer)||'Keine Rechts- oder Medizinberatung.');
    $consent.innerHTML=txt;

    $inp=el('input',{type:'text',class:'ai-inp',placeholder:'Frag unseren KI-Assistenten :)','aria-label':'KI-Frage eingeben'});
    $send=el('button',{type:'button',class:'ai-send'},'Senden');
    var row=el('div',{class:'ai-row'},$inp,$send);
    $dock=el('div',{class:'ppx-ai-dock'},$consent,row);

    $v=viewRoot();
    if($v && $v.nextSibling){ panel.insertBefore($dock,$v.nextSibling); }
    else { panel.appendChild($dock); }

    $inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});
    $send.addEventListener('click',send);
    return true;
  }

  // --- consent & worker ------------------------------------------------------
  var _consented=false;
  function ensureConsent(){
    var cfg=aiCfg(); if(_consented){ if($consent) $consent.style.display='none'; return true; }
    if($consent){ $consent.style.display='block'; } return false;
  }

  function askWorker(question,cfg){
    var meta={provider:cfg.provider,model:cfg.model,maxTokens:(cfg.limits&&cfg.limits.maxTokens)||300,timeoutMs:(cfg.limits&&cfg.limits.timeoutMs)||8000,
              systemPrompt:cfg.systemPrompt,allowlist:cfg.allowlist,forbid:cfg.forbid,
              behaviors:cfg.behaviors,intentMap:cfg.intentMap};
    meta.brand=(PPX.data&&PPX.data.cfg&&PPX.data.cfg().brand)||''; meta.langs=cfg.languages||['de','en'];
    var url=(cfg.workerUrl||'').replace(/\/+$/,''); if(!/\/ask-ai$/.test(url)) url+='/ask-ai';
    return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({question:String(question||'').slice(0,2000),meta:meta})}).then(function(r){return r.json();});
  }

  // --- flows öffnen ----------------------------------------------------------
  function cap(s){ s=String(s||''); return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
  function openFlow(tool,detail){
    try{
      var fn = PPX.flows && PPX.flows['step'+cap(tool)];
      if (typeof fn === 'function'){ fn(detail||{}); return true; }
      if(PPX.flows&&typeof PPX.flows.open==='function'){ PPX.flows.open(tool,detail||{}); return true; }
    }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('ppx:tool',{detail:{tool:tool,detail:detail||{}}})); }catch(e){}
    return openFlowHint(tool);
  }
  function openFlowHint(tool){
    var v=viewRoot(); var words={
      reservieren:['reservieren','reserve','buchen','booking','tisch','table'],
      kontakt:['kontakt','contact','email','mail','anrufen','call','telefon'],
      'öffnungszeiten':['öffnungszeiten','zeiten','hours','open','geöffnet'],
      speisen:['speisen','speise','gerichte','gericht','menu','menue','speisekarte','essen','durst','getränk','getraenk','ayran','cola','fanta','sprite','raki','tee','cay','çay','wasser'],
      faq:['faq','fragen','hilfe']
    }[tool]||[tool];
    if(!v){ return false; }
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
  // --- FAQ strict hybrid map -------------------------------------------------
  // Nur exakte Namen (key, title, title_en) + explizite Synonyme aus
  // AI.intents.faq.categories.<key>. Keine Tokenisierung/Heuristik.
  function faqCategoryMapStrict(){
    var out=Object.create(null);
    try{
      var F=faqs();
      var cats=[];
      if (F && Array.isArray(F.cats)) cats=F.cats;
      else if (F && Array.isArray(F.items)) cats=[{key:'all',title:F.title||'FAQ',title_en:F.title_en||'FAQ'}];

      // Namen (key, title, title_en)
      cats.forEach(function(c){
        var k = (c && c.key) ? String(c.key) : '';
        var t = (c && c.title) ? String(c.title) : '';
        var te= (c && c.title_en) ? String(c.title_en) : '';
        if(k){ out[_norm(k)]=k; }
        if(t){ out[_norm(t)]=k||_norm(t); }
        if(te){ out[_norm(te)]=k||_norm(te); }
      });

      // Explizite Synonyme aus AI.intents.faq.categories
      var A=aiCfg()||{}, intents=(A.intents||{}), faq=(intents.faq||{}), catsCfg=(faq.categories||{});
      Object.keys(catsCfg).forEach(function(catKey){
        var entry=catsCfg[catKey];
        var arr = Array.isArray(entry) ? entry : (Array.isArray(entry.keywords) ? entry.keywords : []);
        arr.forEach(function(s){
          var n=_norm(s); if(!n) return;
          out[n]=catKey; // Synonym → Ziel-Category-Key
        });
      });
    }catch(e){}
    return out;
  }

  // Findet Category-Key anhand exakter Namen oder expliziter Synonyme
  function faqMatchFromTextStrict(txt){
    var map=faqCategoryMapStrict();
    var n=_norm(txt);
    if(!n) return null;
    // 1) Volltext (z. B. "küche & allergene")
    if(map[n]) return map[n];
    // 2) Exakte Wörter nur wenn vom Benutzer genau so eingegeben (kein Tokenizing)
    // → nicht nötig, da oben bereits Volltext und explizite Synonyme abgedeckt.
    return null;
  }

  // --- send() ---------------------------------------------------------------
  async function send(){
    ensureDock(); if(!$inp) return;
    var q=String($inp.value||'').trim(); if(!q) return;

    if(!_consented){ if(!ensureConsent()){ _consented=true; if($consent) $consent.style.display='none'; } }
    if(!allowHit()){ showNote('Bitte kurz warten ⏳'); return; }

    // Sofort UI-Echo (wie zuvor)
    $inp.value=''; userEcho(q);

    var cfg=aiCfg();

    // 1) Prematch: SPEISEN (Items > Kategorien) – unverändert
    try{
      var DSH=dishes(), cats=Object.keys(DSH||{});
      for(var i=0;i<cats.length;i++){
        var ck=cats[i], arr=Array.isArray(DSH[ck])?DSH[ck]:[], lab=catLabelFromKey(ck);
        if(wbRegex(ck).test(q) || wbRegex(lab).test(q)){
          if(st().activeFlowId && !toolMatchesActive('speisen')){ pauseActiveFlow('ai-speisen'); }
          openFlow('speisen',{category:ck}); return;
        }
        for(var j=0;j<arr.length;j++){
          var nm=arr[j].name||arr[j].name_en||'';
          if(nm && wbRegex(nm).test(q)){
            if(st().activeFlowId && !toolMatchesActive('speisen')){ pauseActiveFlow('ai-speisen'); }
            openFlow('speisen',{category:ck,itemId:arr[j].id}); return;
          }
        }
      }
    }catch(e){}

    // 2) Prematch: FAQ (strikt: exakte Namen + explizite Synonyme)
    try{
      var fc=faqMatchFromTextStrict(q);
      if(fc){
        if(st().activeFlowId && !toolMatchesActive('faq')){ pauseActiveFlow('ai-faq'); }
        openFlow('faq',{category:fc,behavior:'silent'}); return;
      }
    }catch(e){}

    // 3) Statische Intents (Reservieren/Kontakt/Öffnungszeiten)
    var intents={reservieren:['reservieren','tisch','buchen','booking','reserve'],
                 kontakt:['kontakt','email','mail','anrufen','telefon','call'],
                 'öffnungszeiten':['öffnungszeiten','zeiten','hours','open','geöffnet']};
    for(var tool in intents){
      if((intents[tool]||[]).some(function(w){return wbRegex(w).test(q);})){
        if(st().activeFlowId && !toolMatchesActive(tool)){ pauseActiveFlow('ai-intent'); }
        openFlow(tool,{}); return;
      }
    }

    // 4) Worker als Fallback
    var t=ensureThread(); if(!t) return;
    var bBot=bubble('bot','⏳ ...'); t.appendChild(bBot); moveThreadToEnd(true);
    var res=null;
    try{ res=await askWorker(q,cfg); }catch(e){ res=null; }
    if(!res || res.error){
      bBot.innerHTML='Ups, die KI antwortet gerade nicht 😞';
      return;
    }

    // Kleine Veredelung: Öffnungszeiten-One-Liner falls zutreffend
    if(res.tool==='öffnungszeiten' && res.behavior==='one_liner'){
      var h=hoursOneLiner(); if(h) res.text=h;
    }

    // Wenn der Worker "faq" ohne Detail liefert, versuchen wir ein striktes Match
    if(res.tool==='faq' && (!res.detail || !res.detail.category)){
      var m=faqMatchFromTextStrict(q); if(m) res.detail={category:m};
    }

    // Flow öffnen oder Antwort ausgeben
    if(res.tool){
      if(st().activeFlowId && !toolMatchesActive(res.tool)){ pauseActiveFlow('ai-redirect'); }
      openFlow(String(res.tool).toLowerCase(), res.detail||{}); return;
    }

    bBot.innerHTML=linkify(esc(res.text||'Gerne.'));
    moveThreadToEnd(true);
  }

  // --- readAI + boot + export ----------------------------------------------
  function readAI(){
    var A=aiCfg()||{},L=A.limits||{},T=A.tone||{},CMP=A.compliance||{},intents=A.intents||{};
    function catMap(n){var o={},c=n&&n.categories;if(!c) return o;
      Object.keys(c).forEach(function(k){
        var a=(c[k]&&(c[k].keywords||c[k])); o[k]=Array.isArray(a)?uniq(a):[];
      }); return o;}
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
      speisen:{ keywords:speisenKw, items:speisenItems, itemsMap:speisenItemsMap },
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

  function boot(){
    // Sofort versuchen
    ensureDock(); ensureThread();

    // DOMContentLoaded
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', function(){
        ensureDock(); ensureThread();
      }, {once:true});
    }

    // Fallback: sobald #ppx-panel / #ppx-v auftauchen
    try{
      var mo=new MutationObserver(function(){
        var panel=document.getElementById('ppx-panel');
        if(panel){
          ensureDock(); ensureThread();
          if(panel.querySelector('.ppx-ai-dock')){ try{ mo.disconnect(); }catch(e){} }
        }
      });
      mo.observe(document.documentElement||document.body,{childList:true,subtree:true});
      setTimeout(function(){ try{ mo.disconnect(); }catch(e){} },10000);
    }catch(e){}

    // Sicherstellen bei Panel-Open
    window.addEventListener('click', function(){
      var p=document.getElementById('ppx-panel');
      if(p && p.classList.contains('ppx-open') && !p.querySelector('.ppx-ai-dock')) ensureDock();
      ensureThread();
    });
  }

  PPX.services.ai = AI;
  AI.send = send; AI.boot = boot;
  AI.faqCategoryMapStrict = faqCategoryMapStrict; AI.faqMatchFromTextStrict = faqMatchFromTextStrict;

  try{ boot(); }catch(e){}
})();
