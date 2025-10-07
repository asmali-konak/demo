/* ============================================================================
   PPX UI Panel (panel.js) – v8.4.1
   - Panel open/close, keepBottom, UI building blocks (block/line/note/row/grid)
   - Scope-Stack (getScopeIndex/popToScope)
   - Sprach-Toggle (DE/EN) neben dem Close-"X" mit Persistenz + CustomEvent
   - Keine Änderung am Look & Feel außer: ruhige Typo bleibt euch in den Flows
============================================================================ */
(function () {
  'use strict';
  var W=window, D=document, PPX=W.PPX=W.PPX||{}, U=PPX.util||{};
  var $launch,$panel,$close,$view,$langBtn,BOUND=false;

  // --- DOM Query -------------------------------------------------------------
  function queryDom(){ $launch=D.getElementById('ppx-launch'); $panel=D.getElementById('ppx-panel'); $close=D.getElementById('ppx-close'); $view=D.getElementById('ppx-v'); return !!($launch&&$panel&&$close&&$view); }

  // --- Language handling -----------------------------------------------------
  function getStoredLang(){ try{return localStorage.getItem('ppx.lang');}catch(e){return null;} }
  function storeLang(v){ try{ localStorage.setItem('ppx.lang',v); }catch(e){} }
  function currentLang(){ return (PPX.lang||getStoredLang()||'de'); }
  function updateLangIndicator(){ if(!$langBtn) return; var lang=currentLang(); $langBtn.setAttribute('aria-pressed', lang==='en'?'true':'false'); $langBtn.textContent=(lang==='en')?'EN':'DE'; $langBtn.title=(lang==='en')?'Switch to German':'Auf Englisch umschalten'; }
  function applyLangToDom(lang){ if($panel){ $panel.setAttribute('data-lang',lang); } D.documentElement.setAttribute('data-ppx-lang',lang); }
  function setLang(lang,opts){ opts=opts||{}; var prev=currentLang(); if(lang!=='de'&&lang!=='en') lang='de'; PPX.lang=lang; storeLang(lang); applyLangToDom(lang); updateLangIndicator();
    try{ W.dispatchEvent(new CustomEvent('ppx:lang',{detail:{lang:lang,prev:prev}})); }catch(e){}
    if(opts.rerender!==false){ popToScope(0); if(PPX.flows&&typeof PPX.flows.stepHome==='function'){ try{ PPX.flows.stepHome(); }catch(e){} } }
  }

  // --- Utils -----------------------------------------------------------------
  function isObj(v){ return U&&typeof U.isObj==='function' ? U.isObj(v) : (v&&typeof v==='object'&&!Array.isArray(v)); }
  function el(tag,attrs){ var n=D.createElement(tag); attrs=attrs||{}; Object.keys(attrs).forEach(function(k){ var v=attrs[k];
      if(k==='style'&&isObj(v)) Object.assign(n.style,v);
      else if(k==='text') n.textContent=v;
      else if(k==='html') n.innerHTML=v;
      else if(k.slice(0,2)==='on'&&typeof v==='function') n.addEventListener(k.slice(2),v);
      else if(k==='className'||k==='class') n.setAttribute('class',v);
      else n.setAttribute(k,v);
    }); for(var i=2;i<arguments.length;i++){ var c=arguments[i]; if(c!=null) n.appendChild(typeof c==='string'?D.createTextNode(c):c); } return n; }

  // --- UI building blocks ----------------------------------------------------
  function block(title,opts){ opts=opts||{}; var w=el('div',{'class':'ppx-bot ppx-appear',style:{maxWidth:(opts.maxWidth||'640px'),margin:'12px auto'}}); if(title){ var hStyle=opts.hCenter?{justifyContent:'center',textAlign:'center'}:null; var h=el('div',{'class':'ppx-h',style:hStyle},title); w.appendChild(h); } if($view) $view.appendChild(w); keepBottom(); return w; }
  function line(txt){ return el('div',{'class':'ppx-m'},txt); }
  function note(txt){ return el('div',{'class':'ppx-m ppx-note'},txt); }
  function row(){ return el('div',{'class':'ppx-row'}); }
  function grid(){ return el('div',{'class':'ppx-grid'}); }

  // --- Scope helpers ---------------------------------------------------------
  function getScopeIndex(){ return $view ? $view.children.length : 0; }
  function popToScope(idx){ if(!$view) return; while($view.children.length>idx){ var last=$view.lastElementChild; if(!last) break; last.remove(); } keepBottom(); }

  // --- Scroll helpers --------------------------------------------------------
  function jumpBottom(){ if(!$view) return; try{ $view.scrollTop=$view.scrollHeight; requestAnimationFrame(function(){ $view.scrollTop=$view.scrollHeight; }); }catch(e){} }
  function keepBottom(){ jumpBottom(); setTimeout(jumpBottom,80); setTimeout(jumpBottom,200); }

  // --- Language Toggle Button ------------------------------------------------
  function buildLangToggle(){
    if(!$close||!$panel) return; if($langBtn&&$langBtn.parentNode) return;
    $langBtn = el('button',{ id:'ppx-lang', type:'button', 'aria-label':'Language', 'class':'ppx-lang-btn',
      style:{display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'12px',lineHeight:'1',minWidth:'34px',height:'28px',marginRight:'6px',padding:'0 8px',borderRadius:'14px',border:'0',cursor:'pointer'},
      onclick:function(){ var lang=currentLang()==='de'?'en':'de'; setLang(lang,{rerender:true}); }
    });
    try{ $close.parentNode.insertBefore($langBtn,$close); }catch(e){ $panel.appendChild($langBtn); }
    applyLangToDom(currentLang()); updateLangIndicator();
  }

  // --- Panel open/close ------------------------------------------------------
  function openPanel(){ if(!queryDom()) return; $panel.classList.add('ppx-open','ppx-v5'); buildLangToggle();
    if(!$panel.dataset.init){ $panel.dataset.init='1'; setLang(currentLang(),{rerender:false}); if(PPX.flows&&typeof PPX.flows.stepHome==='function'){ try{ PPX.flows.stepHome(); }catch(e){} } } }
  function closePanel(){ if(!queryDom()) return; $panel.classList.remove('ppx-open'); }

  // --- One-time binding ------------------------------------------------------
  function bindOnce(){
    if(BOUND) return true; if(!queryDom()) return false; $panel.classList.add('ppx-v5');
    $launch.addEventListener('click', openPanel); $close.addEventListener('click', closePanel);
    W.addEventListener('keydown', function(e){ if(e.key==='Escape') closePanel(); });
    $panel.addEventListener('click', function(ev){ var t=ev.target&&ev.target.closest?ev.target.closest('.ppx-b, .ppx-chip'):null; if(t&&$view&&$view.contains(t)){ t.classList.add('ppx-selected'); keepBottom(); } });
    D.addEventListener('click', function(ev){ var t=ev.target&&ev.target.closest?ev.target.closest('#ppx-launch'):null; if(t) openPanel(); });
    buildLangToggle();
    if($panel.classList.contains('ppx-open') && !$panel.dataset.init){ $panel.dataset.init='1'; setLang(currentLang(),{rerender:false}); if(PPX.flows&&typeof PPX.flows.stepHome==='function'){ try{ PPX.flows.stepHome(); }catch(e){} } }
    BOUND=true; return true;
  }

  // --- Exports ---------------------------------------------------------------
  PPX.ui=PPX.ui||{};
  PPX.ui.block=block; PPX.ui.line=line; PPX.ui.note=note; PPX.ui.row=row; PPX.ui.grid=grid;
  PPX.ui.getScopeIndex=getScopeIndex; PPX.ui.popToScope=popToScope; PPX.ui.keepBottom=keepBottom;
  PPX.ui.openPanel=openPanel; PPX.ui.closePanel=closePanel; PPX.ui.bindOnce=bindOnce;
  PPX.ui.setLang=setLang; PPX.ui.currentLang=currentLang;
})();
