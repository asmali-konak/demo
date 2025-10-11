/* ============================================================================
   PPX AI Service – v2.7.3 (Fix: „Oder …“ komplett verlinken)
   Änderungen (gezielt, kein Layout-Flickern):
   - Unknown-Dialog: Text auf „…unser Kontaktformular…“ geändert.
   - Optionen: „Kontaktformular öffnen“ + „Nein, danke“ (beide ppx-secondary).
   - Nach „Nein, danke“: Bot-Bubble im gleichen Stil, 2-zeilig + Link ins Hauptmenü
     (gesamter Satz „Oder klick hier …“ ist jetzt der Link).
   - Rest unverändert (Consent-Order, Routing, Prematches etc.).
============================================================================ */
(function () {
  'use strict';
  var W=window, D=document;
  var PPX=W.PPX=W.PPX||{}; PPX.services=PPX.services||{};
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
    }
    return n;
  }
  function esc(s){return String(s).replace(/[&<>"']/g,function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]);});}
  function linkify(s){return s.replace(/\bhttps?:\/\/[^\s)]+/g,function(u){return '<a href="'+u+'" target="_blank" rel="nofollow noopener" class="ppx-link">'+u+'</a>';});}
  function viewEl(){ return D.getElementById('ppx-v'); }
  function now(){ return Date.now(); }
  function st(){ PPX.state=PPX.state||{activeFlowId:null,expecting:null}; return PPX.state; }

  // ---------- normalizer -----------------------------------------------------
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

  // ---------- data getters ---------------------------------------------------
  function nowLang(){ try{ return (PPX.i18n&&PPX.i18n.nowLang&&PPX.i18n.nowLang()) || PPX.lang || 'de'; }catch(e){ return 'de'; } }
  function cfg(){ try{ return (PPX.data&&PPX.data.cfg&&PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function dishes(){ try{ return (PPX.data&&PPX.data.dishes&&PPX.data.dishes()) || {}; } catch(e){ return {}; } }
  function faqs(){ try{ return (PPX.data&&PPX.data.faqs&&PPX.data.faqs()) || []; } catch(e){ return []; } }
  function aiCfg(){ try{ return (PPX.data&&PPX.data.ai&&PPX.data.ai()) || {}; } catch(e){ return {}; } }

  // ---------- labels (Speisen) ----------------------------------------------
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

  // ---------- UI helpers (generic append) -----------------------------------
  function appendToView(node){
    var v=viewEl(); if(!v) return null;
    v.appendChild(node);
    moveThreadToEnd();
    return node;
  }
  function bubble(side,html){
    var wrap=el('div',{class:'ppx-ai-bwrap'});
    var b=el('div',{class:'ppx-ai-bubble',style:{
      display:'inline-block',
      margin:'8px 0',padding:'10px 12px',borderRadius:'12px',
      border:'1px solid var(--ppx-bot-chip-border, rgba(255,255,255,.18))',
      background: side==='user' ? 'rgba(255,255,255,.10)' : 'var(--ppx-bot-chip, rgba(255,255,255,.06))',
      color:'var(--ppx-bot-text,#fff)',maxWidth:'86%'
    }}); if(side==='user') wrap.style.textAlign='right';
    b.innerHTML=html; wrap.appendChild(b); return wrap;
  }
  function userEcho(text){
    var wrap = bubble('user', esc(text));
    return appendToView(wrap);
  }

  // ---------- notes / rate-limit & scroll -----------------------------------
  var rl={hits:[],max:15};
  function allowHit(){
    var t=now(); rl.hits=rl.hits.filter(function(h){return t-h<60000;});
    if(rl.hits.length>=rl.max) return false; rl.hits.push(t); return true;
  }
  function moveThreadToEnd(){
    var v=viewEl(); if(!v) return;
    try{
      v.scrollTop=v.scrollHeight;
      requestAnimationFrame(function(){ v.scrollTop=v.scrollHeight; });
    }catch(e){}
  }
  function showNote(txt){
    var n=el('div',{class:'ppx-note',style:{
      background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.28)',
      borderLeft:'4px solid var(--ppx-accent,#c9a667)',borderRadius:'12px',
      padding:'8px 10px',marginTop:'8px'}},txt);
    appendToView(n);
  }

  // ---------- Dock (Input/Send) ---------------------------------------------
  var $dock,$inp,$send,$consentInline;
  function ensureDock(){
    var panel=document.getElementById('ppx-panel');
    if(!panel) return false;

    var exist=panel.querySelector('.ppx-ai-dock');
    if(exist){
      $dock=exist; $inp=$dock.querySelector('.ai-inp'); $send=$dock.querySelector('.ai-send'); $consentInline=$dock.querySelector('.ai-consent');
      return true;
    }

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

    var cfgAI=aiCfg();
    $consentInline=el('div',{class:'ai-consent',role:'note'});
    var txt=esc(cfgAI.compliance && cfgAI.compliance.consentText || 'Deine Frage wird an unseren KI-Dienst gesendet.');
    txt+=' <a href="'+esc((cfgAI.compliance&&cfgAI.compliance.privacyUrl)||'/datenschutz')+'" target="_blank" rel="noopener">Datenschutz</a> · ';
    txt+='<a href="'+esc((cfgAI.compliance&&cfgAI.compliance.imprintUrl)||'/impressum')+'" target="_blank" rel="noopener">Impressum</a> · ';
    txt+=esc((cfgAI.compliance&&cfgAI.compliance.disclaimer)||'Keine Rechts- oder Medizinberatung.');
    $consentInline.innerHTML=txt;

    $inp=el('input',{type:'text',class:'ai-inp',placeholder:'Frag unseren KI-Assistenten :)','aria-label':'KI-Frage eingeben'});
    $send=el('button',{type:'button',class:'ai-send'},'Senden');
    var row=el('div',{class:'ai-row'},$inp,$send);
    $dock=el('div',{class:'ppx-ai-dock'},$consentInline,row);

    var v = viewEl();
    var footer = panel.querySelector('.ppx-brandbar, .ppx-elements-footer, .ai-elements-footer, .ppx-footer, footer');
    try{
      if(footer){ panel.insertBefore($dock, footer); }
      else if(v && v.parentNode===panel && v.nextSibling){ panel.insertBefore($dock, v.nextSibling); }
      else if(v && v.parentNode===panel){ panel.appendChild($dock); }
      else{ panel.appendChild($dock); }
    }catch(e){ panel.appendChild($dock); }

    $inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});
    $send.addEventListener('click',send);
    return true;
  }
  // ---------- Consent (persist) ---------------------------------------------
  var _consented=false, _pendingQ=null;
  function loadConsent(){
    try{ _consented = (localStorage.getItem('ppx_ai_consent')==='true'); }catch(e){ _consented=false; }
    return _consented;
  }
  function saveConsent(v){
    _consented=!!v;
    try{
      if(v) localStorage.setItem('ppx_ai_consent','true');
      else localStorage.removeItem('ppx_ai_consent');
    }catch(e){}
  }
  // Consent-Block im Chat (Flow-Optik), keine Styles verändert
  function renderConsentBlock(originalQ){
    var I=PPX.i18n||{}, t=(I&&I.t)?I.t:function(k,fb){return fb||k;};
    var pick=(I&&I.pick)?I.pick:function(v){return (v&&typeof v==='object')?(v.de||v.en||''):v;};
    var A=aiCfg()||{}, C=A.compliance||{};
    _pendingQ = String(originalQ||'').slice(0,2000);

    var block = (PPX.ui && PPX.ui.block) ? PPX.ui.block('KI-Einwilligung',{blockKey:'ai-consent',maxWidth:'640px'}) : el('div',{'class':'ppx-bot'},'KI-Einwilligung');
    if(!block.parentNode) appendToView(block);

    var msg = esc(C.consentText||'Deine Frage wird an unseren KI-Dienst gesendet. Keine sensiblen Daten eingeben.');
    var links = ' <a class="ppx-link" href="'+esc(C.privacyUrl||'/datenschutz')+'" target="_blank" rel="noopener">Datenschutz</a> · '
              + '<a class="ppx-link" href="'+esc(C.imprintUrl||'/impressum')+'" target="_blank" rel="noopener">Impressum</a> · '
              + esc(C.disclaimer||'Keine Rechts- oder Medizinberatung.');
    var p = el('div',{'class':'ppx-m', 'html': msg + ' ' + links});
    block.appendChild(p);

    var row = (PPX.ui && PPX.ui.row) ? PPX.ui.row() : el('div',{'class':'ppx-row'});
    var agreeLbl = {de:'Zustimmen & fortfahren', en:'Agree & continue'};
    var declineLbl= {de:'Ablehnen',              en:'Decline'};
    var agreeBtn = (PPX.ui&&PPX.ui.btn)? PPX.ui.btn(agreeLbl, onAgree, 'ppx-cta','✅') : el('button',{class:'ppX-b ppx-cta',onclick:onAgree}, pick(agreeLbl));
    var noBtn    = (PPX.ui&&PPX.ui.btn)? PPX.ui.btn(declineLbl,onDecline,'ppx-secondary','✖️') : el('button',{class:'ppx-b ppx-secondary',onclick:onDecline}, pick(declineLbl));

    row.appendChild(agreeBtn); row.appendChild(noBtn);
    block.appendChild(row);
    PPX.ui && PPX.ui.keepBottom && PPX.ui.keepBottom();

    function removeConsentBlockOnly(){
      try{
        var v=viewEl(); if(!v) return;
        var last = v.querySelector('[data-block="ai-consent"]');
        if(last && last.parentNode && v.contains(last)) last.parentNode.removeChild(last);
      }catch(e){}
    }

    function onAgree(){
      saveConsent(true);
      var q=_pendingQ; _pendingQ=null;
      removeConsentBlockOnly();
      if(q){ doWorker(q); }
    }
    function onDecline(){
      saveConsent(false);
      showNote('Ohne Einwilligung können wir hier keine KI-Antwort senden.');
      PPX.ui && PPX.ui.keepBottom && PPX.ui.keepBottom();
    }
  }

  // ---------- Flow Helpers ---------------------------------------------------
  function cap(s){ s=String(s||''); return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
  function openFlow(tool,detail){
    try{
      var tname=String(tool||'');
      var fn = PPX.flows && (PPX.flows['step'+cap(tname)]);
      if (typeof fn === 'function'){ fn(detail||{}); moveThreadToEnd(); return true; }
      if(PPX.flows&&typeof PPX.flows.open==='function'){ PPX.flows.open(tool,detail||{}); moveThreadToEnd(); return true; }
    }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('ppx:tool',{detail:{tool:tool,detail:detail||{}}})); }catch(e){}
    return false;
  }
  function hoursOneLiner(){
    try{
      var svc=PPX.services&&PPX.services.openHours;
      if(!svc||typeof svc.describeToday!=='function') return '';
      return svc.describeToday();
    }catch(e){ return ''; }
  }
  function tPing(ev){ try{ if(PPX.services&&PPX.services.telemetry){ PPX.services.telemetry.ping(ev||{}); } }catch(e){} }

  function pauseActiveFlow(reason){
    var S=st(); if(!S.activeFlowId) return;
    var prev=S.activeFlowId; S.activeFlowId=null; S.expecting=null;
    try{ window.dispatchEvent(new CustomEvent('ppx:flow:pause',{detail:{flow:prev,reason:reason||'ai-divert'}})); }catch(e){}
  }
  function toolMatchesActive(tool){
    var S=st(); if(!S.activeFlowId||!tool) return false;
    return String(tool).toLowerCase()===String(S.activeFlowId).toLowerCase();
  }

  // ---------- FAQ strict hybrid map -----------------------------------------
  function faqCategoryMapStrict(){
    var out=Object.create(null);
    try{
      var F=faqs();
      var cats=[];
      if (F && Array.isArray(F.cats)) cats=F.cats;
      else if (F && Array.isArray(F.items)) cats=[{key:'all',title:F.title||'FAQ',title_en:F.title_en||'FAQ'}];

      cats.forEach(function(c){
        var k = (c && c.key) ? String(c.key) : '';
        var t = (c && c.title) ? String(c.title) : '';
        var te= (c && c.title_en) ? String(c.title_en) : '';
        if(k){ out[_norm(k)]=k; }
        if(t){ out[_norm(t)]=k||_norm(t); }
        if(te){ out[_norm(te)]=k||_norm(te); }
      });

      var A=aiCfg()||{}, intents=(A.intents||{}), faq=(intents.faq||{}), catsCfg=(faq.categories||{});
      Object.keys(catsCfg).forEach(function(catKey){
        var entry=catsCfg[catKey];
        var arr = Array.isArray(entry) ? entry : (Array.isArray(entry.keywords) ? entry.keywords : []);
        (arr||[]).forEach(function(s){
          var n=_norm(s); if(!n) return; out[n]=catKey;
        });
      });
    }catch(e){}
    return out;
  }
  function faqMatchFromTextStrict(txt){
    var map=faqCategoryMapStrict();
    var n=_norm(txt); if(!n) return null;
    if(map[n]) return map[n];
    return null;
  }

  // ---------- Worker + Unknown-Fallback -------------------------------------
  function askWorker(question,cfg){
    var meta={provider:cfg.provider,model:cfg.model,maxTokens:(cfg.limits&&cfg.limits.maxTokens)||300,timeoutMs:(cfg.limits&&cfg.limits.timeoutMs)||8000,
              systemPrompt:cfg.systemPrompt,allowlist:cfg.allowlist,forbid:cfg.forbid,
              behaviors:cfg.behaviors,intentMap:cfg.intentMap};
    meta.brand=(PPX.data&&PPX.data.cfg&&PPX.data.cfg().brand)||''; meta.langs=cfg.languages||['de','en'];
    var url=(cfg.workerUrl||'').replace(/\/+$/,''); if(!/\/ask-ai$/.test(url)) url+='/ask-ai';
    return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({question:String(question||'').slice(0,2000),meta:meta})}).then(function(r){return r.json();});
  }

  function offerContactChoice(baseBubble){
    var L=nowLang();
    var msg = (L==='en')
      ? "I don't have info on that here. Should I open our contact form for you?"
      : "Dazu habe ich hier keine Infos. Soll ich dir unser Kontaktformular öffnen?";
    if(baseBubble){ baseBubble.innerHTML=esc(msg); }

    var row = (PPX.ui&&PPX.ui.row)? PPX.ui.row() : el('div',{'class':'ppx-row'});
    var yesLbl={de:'Ja, Kontaktformular öffnen', en:'Open contact form'};
    var noLbl ={de:'Nein, danke',           en:'No, thanks'};

    function onYes(){ openFlow('contactForm',{ startAt:'email', skipHeader:true }); }
    function onNo (){
      var text = (L==='en')
        ? "Alright! Feel free to ask me something else.<br><a href='#' class='ppx-link' onclick='PPX.ui.goHome();return false;'>Or click here to return to the main menu!</a>"
        : "Alles klar! Frag mich gern etwas anderes.<br><a href='#' class='ppx-link' onclick='PPX.ui.goHome();return false;'>Oder klick hier um ins Hauptmenü zu kommen!</a>";
      appendToView(bubble('bot', text));
      PPX.ui && PPX.ui.keepBottom && PPX.ui.keepBottom();
    }

    var y=(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(yesLbl,onYes,'ppx-secondary','✉️') : el('button',{class:'ppx-b ppx-secondary',onclick:onYes},(L==='en'?yesLbl.en:yesLbl.de));
    var n=(PPX.ui&&PPX.ui.btn)? PPX.ui.btn(noLbl ,onNo ,'ppx-secondary','❌') : el('button',{class:'ppx-b ppx-secondary',onclick:onNo},(L==='en'?noLbl.en:noLbl.de));

    var blk=(PPX.ui&&PPX.ui.block)? PPX.ui.block('',{blockKey:'unknown-choice'}) : el('div',{'class':'ppx-bot'});
    row.appendChild(y); row.appendChild(n); blk.appendChild(row); appendToView(blk);
  }
  // ---------- doWorker(): Routing mit „Text-ohne-Tool“ ----------------------
  async function doWorker(q){
    var cfg=aiCfg();
    var bWrap=appendToView(bubble('bot','⏳ …'));
    var bBot=bWrap && bWrap.querySelector('.ppx-ai-bubble');
    var res=null;
    try{ res=await askWorker(q,cfg); }catch(e){ res=null; }

    // Provider-/Netzfehler → echter Fallback (mit Text + Formular)
    if(!res || res.error){ fallbackToContactForm(bBot); return; }

    // Öffnungszeiten one-liner ggf. local zusammenfassen
    if(res.tool==='öffnungszeiten' && res.behavior==='one_liner'){
      var h=hoursOneLiner(); if(h) res.text=h;
    }
    // FAQ Kategorie aus strengem Map ergänzen
    if(res.tool==='faq' && (!res.detail || !res.detail.category)){
      var m=faqMatchFromTextStrict(q); if(m) res.detail={category:m};
    }

    var allow=(cfg.allowlist||['reservieren','kontakt','öffnungszeiten','speisen','faq']).map(function(s){return String(s).toLowerCase();});
    var tool=(res.tool||'').toLowerCase();

    // 1) KI liefert NUR Text → Text anzeigen, fertig (kein Kontakt)
    if(res.text && !tool){
      if(bBot){ bBot.innerHTML=linkify(esc(res.text)); }
      moveThreadToEnd(); return;
    }

    // 2) Tool unzulässig/leer ODER „kontakt“ (vom Modell fälschlich geraten) → Unknown-Frage
    if(!tool || allow.indexOf(tool)===-1 || tool==='kontakt'){
      offerContactChoice(bBot);
      return;
    }

    // 3) Normale Bot-Antwort + ggf. Flow öffnen
    if(res.text && bBot){ bBot.innerHTML=linkify(esc(res.text)); }
    if(st().activeFlowId && !toolMatchesActive(tool)){ pauseActiveFlow('ai-redirect'); }
    openFlow(tool, res.detail||{});
    moveThreadToEnd();
  }
  // ---------- send(): Prematches → ggf. Consent → Worker --------------------
  async function send(){
    ensureDock(); if(!$inp) return;
    var q=String($inp.value||'').trim(); if(!q) return;
    if(!allowHit()){ showNote('Bitte kurz warten ⏳'); return; }

    $inp.value='';
    userEcho(q);

    // 1) Prematch: SPEISEN (Kategorie/Item)
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

    // 2) Prematch: FAQ (strikt)
    try{
      var fc=faqMatchFromTextStrict(q);
      if(fc){
        if(st().activeFlowId && !toolMatchesActive('faq')){ pauseActiveFlow('ai-faq'); }
        openFlow('faq',{category:fc,behavior:'silent'}); return;
      }
    }catch(e){}

    // 3) Statische Intents (reservieren/kontakt/öffnungszeiten)
    var intents={reservieren:['reservieren','tisch','buchen','booking','reserve'],
                 kontakt:['kontakt','email','mail','anrufen','telefon','call'],
                 'öffnungszeiten':['öffnungszeiten','zeiten','hours','open','geöffnet']};
    for(var tool in intents){
      if((intents[tool]||[]).some(function(w){return wbRegex(w).test(q);})){
        if(st().activeFlowId && !toolMatchesActive(tool)){ pauseActiveFlow('ai-intent'); }
        openFlow(tool,{}); return;
      }
    }

    // 4) Erster echter KI-Call → Consent-Gate
    if(!_consented && !loadConsent()){
      renderConsentBlock(q);
      return;
    }

    // 5) KI-Worker
    doWorker(q);
  }

  // ---------- readAI + boot + export ---------------------------------------
  function _catMap(n){var o={},c=n&&n.categories;if(!c) return o;
    Object.keys(c).forEach(function(k){
      var a=(c[k]&&(c[k].keywords||c[k])); o[k]=Array.isArray(a)?uniq(a):[];
    }); return o;}
  function readAI(){
    var A=aiCfg()||{},L=A.limits||{},T=A.tone||{},CMP=A.compliance||{},intents=A.intents||{};
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
      faq:{ categories:_catMap(intents.faq) }
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
      forbid:Array.isArray(H.forbid)?H.forbid:["andere_restaurants","wetter","news","preise_erfinden","medizin","recht"],
      knowledge:{prioritize:Array.isArray(H.prioritize)?H.prioritize:["hours","menu","faq"],contextShort:H.contextShort||""},
      compliance:{consentText:(CMP.consentText||"Deine Frage wird an unseren KI-Dienst gesendet. Keine sensiblen Daten eingeben."),
                  privacyUrl:CMP.privacyUrl||"/datenschutz",imprintUrl:CMP.imprintUrl||"/impressum",
                  disclaimer:CMP.disclaimer||"Keine Rechts- oder Medizinberatung."},
      systemPrompt:A.systemPrompt||"",
      fallback:A.fallback||null
    };
  }

  function boot(){
    loadConsent();
    ensureDock();
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', function(){ ensureDock(); }, {once:true});
    }
    try{
      var mo=new MutationObserver(function(){
        var panel=document.getElementById('ppx-panel');
        if(panel && panel.querySelector('.ppx-ai-dock')){ try{ mo.disconnect(); }catch(e){} }
        else { ensureDock(); }
      });
      mo.observe(document.documentElement||document.body,{childList:true,subtree:true});
      setTimeout(function(){ try{ mo.disconnect(); }catch(e){} },10000);
    }catch(e){}
    window.addEventListener('click', function(){
      var p=document.getElementById('ppx-panel');
      if(p && p.classList.contains('ppx-open') && !p.querySelector('.ppx-ai-dock')) ensureDock();
    });
  }

  PPX.services.ai = AI;
  AI.send = send; AI.boot = boot;
  AI.faqCategoryMapStrict = faqCategoryMapStrict; AI.faqMatchFromTextStrict = faqMatchFromTextStrict;

  try{ boot(); }catch(e){}
})();
