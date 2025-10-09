/* ============================================================================
   PPX AI Service – Inside Panel Footer (services/ai.js) – v1.2
   - AI-Eingabefeld im Panel (unter #ppx-v, über Brandbar)
   - Sendet jetzt: { question: "...", meta:{...} }  (vorher: text)
   - Rest unverändert: Bubbles, Flow-Trigger, Rate-Limit – alles scoped
============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};
  var AI = {};

  function readAI() {
    var R = (W.PPX_DATA || W.__PPX_DATA__ || {}).AI || {};
    return {
      enabled: typeof R.enabled === 'boolean' ? R.enabled : true,
      workerUrl: (R.workerUrl || 'https://ppx-ai.muciyil.workers.dev') + '/ask-ai',
      provider: R.provider || 'openai',
      model: R.model || 'gpt-4o-mini',
      rateLimitPerMin: R.rateLimitPerMin || 6,
      maxTokens: R.maxTokens || 500,
      systemPrompt: R.systemPrompt || '',
      intents: R.intents || {
        reservieren: ['reservieren','reserve','tisch','table','buchen'],
        kontakt: ['kontakt','contact','email','mail','anrufen','call'],
        öffnungszeiten: ['öffnungszeiten','zeiten','hours','open','geöffnet']
      }
    };
  }

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

  var RL = { hits: [], max: 6 };
  function allowHit() {
    var t = Date.now();
    RL.hits = RL.hits.filter(function(h){ return t - h < 60000; });
    if (RL.hits.length >= RL.max) return false;
    RL.hits.push(t); return true;
  }

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

  function askWorker(question,cfg){
    var payload={ question:String(question||'').slice(0,2000),
      meta:{ provider:cfg.provider, model:cfg.model, maxTokens:cfg.maxTokens,
        systemPrompt:cfg.systemPrompt,
        hints:{ brand: (PPX.data&&PPX.data.cfg&&PPX.data.cfg().brand)||'' } } };
    return fetch(cfg.workerUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){ return r.json(); });
  }

  function openFlowHint(tool){
    var $v=viewEl(); if(!$v) return false;
    var words={
      reservieren:['reservieren','reserve','buchen','booking','tisch'],
      kontakt:['kontakt','contact','email','mail','anrufen','call'],
      öffnungszeiten:['öffnungszeiten','zeiten','hours','open','geöffnet']
    }[tool]||[tool];
    var btn=[].find.call($v.querySelectorAll('.ppx-b,.ppx-chip,.ppx-opt,button,a'),function(n){
      var t=(n.innerText||n.textContent||'').toLowerCase();
      return words.some(function(k){return t.indexOf(k)!==-1;});
    });
    if(btn){ btn.click(); return true; }
    var tEl=ensureThread(); if(!tEl) return false;
    var cta=el('button',{class:'ppx-mini',style:{marginTop:'6px'}},'↳ Aktion öffnen');
    cta.addEventListener('click',function(){ openFlowHint(tool); });
    tEl.appendChild(cta); keepBottom(); return false;
  }

  var $panel,$v,$dock,$inp,$send;
  function ensureStyles(){
    if(D.getElementById('ppx-ai-inside-style')) return;
    var css = `
#ppx-panel .ppx-ai-dock{display:flex;gap:10px;align-items:center;padding:10px 12px;background:var(--ppx-bot-header,#0f3a2f);border-top:1px solid rgba(0,0,0,.25)}
#ppx-panel .ppx-ai-dock .ai-inp{flex:1;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#f7faf8;font-size:16px;outline:none}
#ppx-panel .ppx-ai-dock .ai-inp::placeholder{color:rgba(255,255,255,.75)}
#ppx-panel .ppx-ai-dock .ai-send{appearance:none;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 16px;background:#123f31;color:#fff;font-weight:700;cursor:pointer}
#ppx-panel .ppx-ai-dock.busy .ai-send{opacity:.65;pointer-events:none}
`.trim();
    var s=el('style',{id:'ppx-ai-inside-style'}); s.textContent=css; (D.head||D.documentElement).appendChild(s);
  }
  function buildInside(){
    $panel=D.getElementById('ppx-panel'); $v=D.getElementById('ppx-v');
    if(!$panel||!$v) return false;
    var oldGlobal = D.getElementById('ppx-ai-dock'); if(oldGlobal && !$panel.contains(oldGlobal)) oldGlobal.remove();
    var exist = $panel.querySelector('.ppx-ai-dock'); if(exist){ $dock=exist; $inp=$dock.querySelector('.ai-inp'); $send=$dock.querySelector('.ai-send'); return true; }

    ensureStyles();
    $inp = el('input',{type:'text',class:'ai-inp',placeholder:'Frag unseren KI-Assistenten :)','aria-label':'KI-Frage eingeben'});
    $send= el('button',{type:'button',class:'ai-send'},'Senden');
    $dock= el('div',{class:'ppx-ai-dock'},$inp,$send);

    if($v.nextSibling){ $panel.insertBefore($dock,$v.nextSibling); } else { $panel.appendChild($dock); }
    $inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); send(); }});
    $send.addEventListener('click',send);
    return true;
  }

  function send(){
    var cfg=readAI(); RL.max=cfg.rateLimitPerMin||6;
    if(!cfg.enabled) return;
    var text=($inp&&$inp.value||'').trim(); if(!text){ if($inp) $inp.focus(); return; }
    if(!allowHit()){ showNote('Bitte kurz warten – kleines Limit zum Schutz aktiv.'); return; }

    var tEl=ensureThread(); if(!tEl) return;
    tEl.appendChild(bubble('user',escapeHtml(text))); keepBottom();
    $dock.classList.add('busy');

    askWorker(text,cfg).then(function(res){
      var answer=(res&&(res.answer||res.output||res.text))||'…';
      tEl.appendChild(bubble('bot',linkify(escapeHtml(answer)))); keepBottom();
      var tool=(res&&res.tool)||''; if(tool) openFlowHint(String(tool).toLowerCase());
    }).catch(function(err){
      console.error('[PPX AI] Worker error:',err);
      showNote('Ups, die KI antwortet gerade nicht. Versuch es gleich nochmal.');
    }).finally(function(){
      if($inp) $inp.value='';
      $dock.classList.remove('busy');
      if($inp) $inp.focus();
    });
  }

  function boot(){
    if(D.readyState==='loading'){ D.addEventListener('DOMContentLoaded',boot,{once:true}); return; }
    buildInside();
    W.addEventListener('click', function(){
      var p=D.getElementById('ppx-panel');
      if(p && p.classList.contains('ppx-open') && !p.querySelector('.ppx-ai-dock')) buildInside();
    });
  }

  AI.boot = boot; PPX.services.ai = AI; boot();
})();
