/* ============================================================================
   PPX AI Service – v2.0.0
   - Consent-Banner (minimal) vor erster KI-Nutzung
   - Intents/Trigger & Kategorien aus bot.json.AI (SST)
   - Behaviors: silent | one_liner | two_liners
   - Off-topic → Kontakt (silent) (serverseitig abgesichert)
   - Telemetry-Pings (ok/err, intent, duration)
   - Öffnungszeiten One-Liner via PPX.services.openHours (falls vorhanden)
   - Mini-Hooks: toolDetail (z. B. {category:"meze"}) an Flows übergeben
============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};
  var AI = {};

  // --- Utils -----------------------------------------------------------------
  function el(tag, attrs) {
    var n = D.createElement(tag); attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'style' && v && typeof v === 'object') Object.assign(n.style, v);
      else n.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i]; if (c != null) n.appendChild(typeof c === 'string' ? D.createTextNode(c) : c);
    }
    return n;
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,function(m){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]);}); }
  function linkify(s){ return s.replace(/\bhttps?:\/\/[^\s)]+/g,function(u){return '<a href="'+u+'" target="_blank" rel="nofollow noopener" class="ppx-link">'+u+'</a>';}); }
  function viewEl(){ return D.getElementById('ppx-v'); }
  function now(){ return Date.now(); }

  // --- Read AI config from bot.json (SST) ------------------------------------
  function readAI() {
    var A = (PPX.data && PPX.data.ai && PPX.data.ai()) || {};
    var L = (A.limits || {});
    var T = (A.tone || {});
    var CMP = (A.compliance || {});
    var intents = A.intents || {};
    // Flatten categories to simple arrays for worker intentMap
    function catMap(node){
      var out = {}; var cats = node && node.categories;
      if (!cats) return out;
      Object.keys(cats).forEach(function(k){
        var arr = (cats[k] && (cats[k].keywords || cats[k]));
        out[k] = Array.isArray(arr) ? arr : [];
      });
      return out;
    }
    var intentMap = {
      reservieren: (intents.reservieren && intents.reservieren.keywords) || intents.reservieren || [],
      kontakt: (intents.kontakt && intents.kontakt.keywords) || intents.kontakt || [],
      "öffnungszeiten": (intents["öffnungszeiten"] && intents["öffnungszeiten"].keywords) || intents["öffnungszeiten"] || [],
      speisen: { categories: catMap(intents.speisen) },
      faq:     { categories: catMap(intents.faq) }
    };
    var behaviors = {
      reservieren: intents.reservieren && intents.reservieren.behavior || "silent",
      kontakt:     intents.kontakt && intents.kontakt.behavior || "silent",
      "öffnungszeiten": intents["öffnungszeiten"] && intents["öffnungszeiten"].behavior || "one_liner",
      speisen:     intents.speisen && intents.speisen.behavior || "two_liners",
      faq:         intents.faq && intents.faq.behavior || "two_liners"
    };
    var H = A.knowledgeHints || {};
    return {
      enabled: A.enabled !== false,
      workerUrl: (A.workerUrl || '').replace(/\/+$/,'') + '/ask-ai',
      provider: A.provider || 'openai',
      model: A.model || 'gpt-4o-mini',
      limits: {
        ratePerMin: Math.max(1, Number(L.ratePerMin || 15)),
        dailyCapEur: Number(L.dailyCapEur || 5),
        maxTokens: Math.min(800, Number(L.maxTokens || 300)),
        timeoutMs: Math.min(15000, Number(L.timeoutMs || 8000))
      },
      tone: {
        voice: T.voice || 'freundlich, direkt, sachlich',
        length: T.length || 'kurz',
        emojis: Number(T.emojis || 0),
        exclamationsMax: Number(T.exclamationsMax || 1),
        address: T.address || 'du'
      },
      languages: Array.isArray(A.languages) ? A.languages : ['de','en'],
      behaviors: behaviors,
      intentMap: intentMap,
      allowlist: ["reservieren","kontakt","öffnungszeiten","speisen","faq"],
      forbid: Array.isArray(H.forbid) ? H.forbid : ["andere_restaurants","wetter","news","preise_erfinden","medizin","recht","smalltalk"],
      knowledge: {
        prioritize: Array.isArray(H.prioritize) ? H.prioritize : ["hours","menu","faq"],
        contextShort: H.contextShort || ""
      },
      compliance: {
        consentText: (CMP.consentText || "Deine Frage wird an unseren KI-Dienst gesendet. Keine sensiblen Daten eingeben."),
        privacyUrl: CMP.privacyUrl || "/datenschutz",
        imprintUrl: CMP.imprintUrl || "/impressum",
        disclaimer: CMP.disclaimer || "Keine Rechts- oder Medizinberatung."
      },
      systemPrompt: A.systemPrompt || ""
    };
  }

  // --- UI helpers ------------------------------------------------------------
  function keepBottom(){
    var $v=viewEl(); if(!$v) return;
    try{ $v.scrollTop=$v.scrollHeight; requestAnimationFrame(function(){ $v.scrollTop=$v.scrollHeight; }); }catch(e){}
  }
  function ensureThread(){
    var $v=viewEl(); if(!$v) return null;
    var t=$v.querySelector('#ppx-ai-thread');
    if(t) return t;
    t=el('div',{id:'ppx-ai-thread',class:'ppx-bot',style:{marginTop:'8px'}});
    $v.appendChild(t); keepBottom(); return t;
  }
  function bubble(side, html){
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
  function showNote(txt){
    var t=ensureThread(); if(!t) return;
    var n=el('div',{class:'ppx-note',style:{
      background:'rgba(255,255,255,.10)',border:'1px solid rgba(255,255,255,.28)',
      borderLeft:'4px solid var(--ppx-accent,#c9a667)',borderRadius:'12px',
      padding:'8px 10px',marginTop:'8px'}},txt);
    t.appendChild(n); keepBottom();
  }

  // --- Dock (input + send) ---------------------------------------------------
  var $panel,$v,$dock,$inp,$send,$consent;
  var rl = { hits:[], max:15 };
  function allowHit() {
    var t = now();
    rl.hits = rl.hits.filter(function(h){ return t - h < 60000; });
    if (rl.hits.length >= rl.max) return false;
    rl.hits.push(t); return true;
  }
  function ensureDock(){
    $panel=D.getElementById('ppx-panel'); $v=D.getElementById('ppx-v');
    if(!$panel||!$v) return false;
    var exist = $panel.querySelector('.ppx-ai-dock');
    if(exist){ $dock=exist; $inp=$dock.querySelector('.ai-inp'); $send=$dock.querySelector('.ai-send'); $consent=$dock.querySelector('.ai-consent'); return true; }
    // styles
    if(!D.getElementById('ppx-ai-inside-style')){
      var css = `
#ppx-panel .ppx-ai-dock{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:var(--ppx-bot-header,#0f3a2f);border-top:1px solid rgba(0,0,0,.25)}
#ppx-panel .ppx-ai-dock .ai-consent{font-size:13px;line-height:1.4;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:8px 10px}
#ppx-panel .ppx-ai-dock .ai-consent a{color:#fff;text-decoration:underline}
#ppx-panel .ppx-ai-dock .ai-row{display:flex;gap:10px;align-items:center}
#ppx-panel .ppx-ai-dock .ai-inp{flex:1;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#f7faf8;font-size:16px;outline:none}
#ppx-panel .ppx-ai-dock .ai-inp::placeholder{color:rgba(255,255,255,.75)}
#ppx-panel .ppx-ai-dock .ai-send{appearance:none;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 16px;background:#123f31;color:#fff;font-weight:700;cursor:pointer}
#ppx-panel .ppx-ai-dock.busy .ai-send{opacity:.65;pointer-events:none}
`.trim();
      var s=el('style',{id:'ppx-ai-inside-style'}); s.textContent=css; (D.head||D.documentElement).appendChild(s);
    }
    // elements
    var cfg=readAI();
    $consent = el('div',{class:'ai-consent',role:'note',style:{display:'none'}});
    var txt = escapeHtml(cfg.compliance.consentText) + ' ';
    txt += '<a href="'+escapeHtml(cfg.compliance.privacyUrl)+'" target="_blank" rel="noopener">Datenschutz</a> · ';
    txt += '<a href="'+escapeHtml(cfg.compliance.imprintUrl)+'" target="_blank" rel="noopener">Impressum</a> · ';
    txt += escapeHtml(cfg.compliance.disclaimer);
    $consent.innerHTML = txt;

    $inp = el('input',{type:'text',class:'ai-inp',placeholder:'Frag unseren KI-Assistenten :)','aria-label':'KI-Frage eingeben'});
    $send= el('button',{type:'button',class:'ai-send'},'Senden');
    var row = el('div',{class:'ai-row'},$inp,$send);
    $dock= el('div',{class:'ppx-ai-dock'},$consent,row);

    if($v.nextSibling){ $panel.insertBefore($dock,$v.nextSibling); } else { $panel.appendChild($dock); }
    $inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});
    $send.addEventListener('click',send);
    return true;
  }

  // --- Consent (in-memory, session-only) ------------------------------------
  var _consented = false;
  function ensureConsent(){
    var cfg=readAI();
    if(_consented) { if($consent) $consent.style.display='none'; return true; }
    if($consent){ $consent.style.display='block'; }
    // consent by first send click or Enter — minimal UX
    return false;
  }

  // --- Worker call -----------------------------------------------------------
  function askWorker(question,cfg){
    var meta = {
      provider:cfg.provider, model:cfg.model, maxTokens:cfg.limits.maxTokens, timeoutMs:cfg.limits.timeoutMs,
      systemPrompt: cfg.systemPrompt,
      allowlist: cfg.allowlist, forbid: cfg.forbid, behaviors: cfg.behaviors, intentMap: cfg.intentMap
    };
    // enrich for optional server logic (not sensitive)
    meta.brand = (PPX.data && PPX.data.cfg && PPX.data.cfg().brand) || '';
    meta.langs = cfg.languages;
    return fetch(cfg.workerUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({ question:String(question||'').slice(0,2000), meta: meta })})
      .then(function(r){ return r.json(); });
  }

  // --- Flow opening helpers (Mini-Hooks) ------------------------------------
  function openFlow(tool, detail){
    // 1) Preferred: explicit API
    try{
      if (PPX.flows && typeof PPX.flows.open === 'function') {
        PPX.flows.open(tool, detail||{});
        return true;
      }
    }catch(e){}
    // 2) Broadcast event for flows to hook into
    try{
      W.dispatchEvent(new CustomEvent('ppx:tool',{detail:{tool:tool, detail:detail||{}}}));
    }catch(e){}
    // 3) Fallback: find matching button by keywords
    return openFlowHint(tool);
  }
  function openFlowHint(tool){
    var $v=viewEl(); if(!$v) return false;
    var words={
      reservieren:['reservieren','reserve','buchen','booking','tisch'],
      kontakt:['kontakt','contact','email','mail','anrufen','call','telefon'],
      'öffnungszeiten':['öffnungszeiten','zeiten','hours','open','geöffnet'],
      speisen:['speisen','gerichte','menu','speisekarte'],
      faq:['faq','fragen','hilfe']
    }[tool]||[tool];
    var btn=[].find.call($v.querySelectorAll('.ppx-b,.ppx-chip,.ppx-opt,button,a'),function(n){
      var t=(n.innerText||n.textContent||'').toLowerCase();
      return words.some(function(k){return t.indexOf(k)!==-1;});
    });
    if(btn){ btn.click(); return true; }
    return false;
  }
  // --- Opening-hours one-liner (client-side) --------------------------------
  function hoursOneLiner(){
    try{
      var svc = PPX.services && PPX.services.openHours;
      if(!svc || typeof svc.describeToday!=='function') return '';
      return svc.describeToday(); // z. B. "Heute geöffnet 12–23 Uhr."
    }catch(e){ return ''; }
  }

  // --- Telemetry -------------------------------------------------------------
  function tPing(ev){
    try{ if(PPX.services && PPX.services.telemetry){ PPX.services.telemetry.ping(ev||{}); } }catch(e){}
  }

  // --- Send flow -------------------------------------------------------------
  function send(){
    var cfg=readAI(); rl.max = cfg.limits.ratePerMin;
    if(!cfg.enabled) return;
    if(!ensureDock()) return;
    var text=($inp&&$inp.value||'').trim(); if(!text){ if($inp) $inp.focus(); return; }
    if(!_consented){
      if(!ensureConsent()){ _consented = true; if($consent) $consent.style.display='none'; }
    }
    if(!allowHit()){ showNote('Bitte kurz warten – kleines Limit zum Schutz aktiv.'); return; }

    var t0 = now();
    var tEl=ensureThread(); if(!tEl) return;
    tEl.appendChild(bubble('user',escapeHtml(text))); keepBottom();
    $dock.classList.add('busy');

    askWorker(text,cfg).then(function(res){
      var dt = now()-t0;
      if(res && res.error){
        showNote('Ups, die KI antwortet gerade nicht. Versuch es gleich nochmal.');
        tPing({intent:'', ok:false, durationMs:dt, note:'err:'+String(res.error).slice(0,40)});
        return;
      }

      var tool = (res && res.tool) || '';
      var behavior = (res && res.behavior) || (tool ? (cfg.behaviors[tool]||'one_liner') : 'two_liners');
      var answer = (res && (res.answer||res.output||res.text)) || '';

      // Client-side override for opening hours
      if(tool==='öffnungszeiten' && behavior==='one_liner'){
        var h = hoursOneLiner();
        if(h) answer = h;
      }

      // Behaviors
      if(behavior !== 'silent'){
        var out = linkify(escapeHtml(answer)).trim();
        if(!out) out = 'Gerne.';
        // enforce brevity (defensive)
        if(behavior==='one_liner'){ out = out.split(/[\n\r]+/)[0]; }
        tEl.appendChild(bubble('bot', out));
      }

      // Mini-Hooks: open target flow (+ detail)
      var detail = (res && res.toolDetail) || null;
      if(tool){ openFlow(String(tool).toLowerCase(), detail); }

      tPing({intent:tool||'', ok:true, durationMs:dt});
    }).catch(function(err){
      var dt = now()-t0;
      console.error('[PPX AI] Worker error:',err);
      showNote('Ups, die KI antwortet gerade nicht. Versuch es gleich nochmal.');
      tPing({intent:'', ok:false, durationMs:dt, note:'exception'});
    }).finally(function(){
      if($inp) $inp.value='';
      $dock.classList.remove('busy');
      if($inp) $inp.focus();
    });
  }

  // --- Boot ------------------------------------------------------------------
  function boot(){
    if(D.readyState==='loading'){ D.addEventListener('DOMContentLoaded',boot,{once:true}); return; }
    ensureDock();
    W.addEventListener('click', function(){
      var p=D.getElementById('ppx-panel');
      if(p && p.classList.contains('ppx-open') && !p.querySelector('.ppx-ai-dock')) ensureDock();
    });
  }

  AI.boot = boot; PPX.services.ai = AI; boot();
})();
