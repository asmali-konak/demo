/* ============================================================================
   /bot/ui/panel.js – PPX UI Panel – v8.5.2
   - Panel open/close, keepBottom, UI building blocks (block/line/note/row/grid)
   - Scope-Stack (getScopeIndex/popToScope)
   - Sprach-Switch (DE⇄EN) als Kugel-Toggle, direkt links neben dem "X"
   - Toggle erscheint NUR, wenn bot.json → cfg.i18n.enabled ≥ 2 (SSoT)
   - Immer DE bei Seiten-Neustart (kein LocalStorage)
   - Klick + Drag, feuert CustomEvent 'ppx:lang'
   - Keine Globals außer window.PPX; liest nur aus window.PPX_DATA (indirekt für Flows)
============================================================================ */
(function () {
  'use strict';
  var W=window, D=document, PPX=W.PPX=W.PPX||{}, U=PPX.util||{};
  var $launch,$panel,$close,$view,$switchBtn,BOUND=false;

  // --- DOM Query -------------------------------------------------------------
  function queryDom(){
    $launch=D.getElementById('ppx-launch');
    $panel =D.getElementById('ppx-panel');
    $close =D.getElementById('ppx-close');
    $view  =D.getElementById('ppx-v');
    return !!($launch&&$panel&&$close&&$view);
  }

  // --- i18n aus bot.json (Single Source of Truth) ----------------------------
  function enabledLangs(){
    try{
      if (PPX.data && PPX.data.cfg) { var c=PPX.data.cfg(); var i=c&&c.i18n; return Array.isArray(i&&i.enabled)?i.enabled:[]; }
      var C=(W.PPX_DATA&&W.PPX_DATA.cfg)||(W.__PPX_DATA__&&W.__PPX_DATA__.cfg)||{};
      var I=C.i18n||{}; return Array.isArray(I.enabled)?I.enabled:[];
    }catch(e){ return []; }
  }
  function hasMultiLang(){ return enabledLangs().length>=2; }

  // --- Language handling (immer DE als Start) --------------------------------
  function currentLang(){ return (PPX.lang==='en')?'en':'de'; }
  function applyLangToDom(lang){
    if($panel){ $panel.setAttribute('data-lang',lang); }
    D.documentElement.setAttribute('data-ppx-lang',lang);
  }
  function reflectSwitch(){
    if(!$switchBtn) return;
    var isEN = currentLang()==='en';
    $switchBtn.setAttribute('aria-checked', isEN?'true':'false');
    $switchBtn.setAttribute('data-state', isEN?'en':'de');
    var labDe = $switchBtn.querySelector('.ppx-switch-de');
    var labEn = $switchBtn.querySelector('.ppx-switch-en');
    if(labDe) labDe.textContent='DE';
    if(labEn) labEn.textContent='EN';
  }
  function fireLangEvent(prev,lang){
    try{ W.dispatchEvent(new CustomEvent('ppx:lang',{detail:{lang:lang,prev:prev}})); }catch(e){}
  }
  function setLang(lang,opts){
    opts=opts||{};
    var prev=currentLang();
    if(lang!=='de'&&lang!=='en') lang='de';
    PPX.lang=lang; // keine Persistenz
    applyLangToDom(lang);
    reflectSwitch();
    if(opts.rerender!==false){
      popToScope(0);
      if(PPX.flows&&typeof PPX.flows.stepHome==='function'){ try{ PPX.flows.stepHome(); }catch(e){} }
    }
    fireLangEvent(prev,lang);
  }

  // --- Small utils -----------------------------------------------------------
  function isObj(v){ return U&&typeof U.isObj==='function' ? U.isObj(v) : (v&&typeof v==='object'&&!Array.isArray(v)); }
  function el(tag,attrs){
    var n=D.createElement(tag); attrs=attrs||{};
    Object.keys(attrs).forEach(function(k){
      var v=attrs[k];
      if(k==='style'&&isObj(v)) Object.assign(n.style,v);
      else if(k==='text') n.textContent=v;
      else if(k==='html') n.innerHTML=v;
      else if(k.slice(0,2)==='on'&&typeof v==='function') n.addEventListener(k.slice(2),v);
      else if(k==='className'||k==='class') n.setAttribute('class',v);
      else n.setAttribute(k,v);
    });
    for(var i=2;i<arguments.length;i++){
      var c=arguments[i]; if(c!=null) n.appendChild(typeof c==='string'?D.createTextNode(c):c);
    }
    return n;
  }

  // --- UI building blocks ----------------------------------------------------
  function block(title,opts){
    opts=opts||{};
    var w=el('div',{'class':'ppx-bot ppx-appear',style:{maxWidth:(opts.maxWidth||'640px'),margin:'12px auto'}, 'data-block': (opts.blockKey || '')});
    if(title){
      var hStyle=opts.hCenter?{justifyContent:'center',textAlign:'center'}:null;
      var h=el('div',{'class':'ppx-h',style:hStyle},title); w.appendChild(h);
    }
    if($view) $view.appendChild(w); keepBottom(); return w;
  }
  function line(txt){ return el('div',{'class':'ppx-m'},txt); }
  function note(txt){ return el('div',{'class':'ppx-m ppx-note'},txt); }
  function row(){ return el('div',{'class':'ppx-row'}); }
  function grid(){ return el('div',{'class':'ppx-grid'}); }

  // --- Scope helpers ---------------------------------------------------------
  function getScopeIndex(){ return $view ? $view.children.length : 0; }
  function popToScope(idx){
    if(!$view) return;
    while($view.children.length>idx){
      var last=$view.lastElementChild; if(!last) break; last.remove();
    }
    keepBottom();
  }

  // --- Scroll helpers --------------------------------------------------------
  function jumpBottom(){
    if(!$view) return;
    try{
      $view.scrollTop=$view.scrollHeight;
      requestAnimationFrame(function(){ $view.scrollTop=$view.scrollHeight; });
    }catch(e){}
  }
  function keepBottom(){ jumpBottom(); setTimeout(jumpBottom,80); setTimeout(jumpBottom,200); }

  // --- Language Switch builder (Kugel-Toggle) --------------------------------
  function buildLangSwitch(){
    if(!$close||!$panel) return;
    if(!hasMultiLang()) return;              // nur wenn mehrere Sprachen aktiv
    if($switchBtn && $switchBtn.parentNode) return;

    // --- Ensure right controls container exists & sits at far right
    var parent = $close.parentNode;
    var $controls = parent && parent.classList && parent.classList.contains('ppx-controls')
      ? parent
      : null;
    if(!$controls){
      $controls = el('div',{class:'ppx-controls'});
      if(parent){
        parent.insertBefore($controls,$close);
        $controls.appendChild($close);
      }else{
        ($panel||document.body).appendChild($controls);
        $controls.appendChild($close);
      }
    }

    // Build switch
    $switchBtn = el('button', {
      id:'ppx-lang', type:'button', role:'switch',
      'aria-checked':'false', 'aria-label':'Sprache umschalten',
      class:'ppx-switch'
    });

    var $track = el('span',{class:'ppx-switch-track'});
    var $labDe = el('span',{class:'ppx-switch-label ppx-switch-de',text:'DE'});
    var $labEn = el('span',{class:'ppx-switch-label ppx-switch-en',text:'EN'});
    var $knob  = el('span',{class:'ppx-switch-knob'});
    $track.appendChild($labDe); $track.appendChild($labEn); $track.appendChild($knob);
    $switchBtn.appendChild($track);

    // Click toggelt
    $switchBtn.addEventListener('click', function(){
      if($switchBtn._dragJustEnded){ $switchBtn._dragJustEnded=false; return; }
      setLang(currentLang()==='de' ? 'en' : 'de', {rerender:true});
    });

    // Drag/Swipe
    var startX=null, moved=false, base=currentLang();
    function onDown(e){
      startX = (e.touches? e.touches[0].clientX : e.clientX);
      moved=false; base=currentLang();
      D.addEventListener('pointermove', onMove);
      D.addEventListener('pointerup', onUp, {once:true});
      D.addEventListener('touchmove', onMove, {passive:false});
      D.addEventListener('touchend', onUp, {once:true});
    }
    function onMove(e){
      var x = (e.touches? e.touches[0].clientX : e.clientX);
      if(startX==null) return;
      var dx = x - startX;
      if(Math.abs(dx) > 6){ moved=true; }
      if(dx > 24){ if(base!=='en') setLang('en',{rerender:false}); }
      else if(dx < -24){ if(base!=='de') setLang('de',{rerender:false}); }
      reflectSwitch();
      if(e.cancelable) e.preventDefault();
    }
    function onUp(){
      startX=null; $switchBtn._dragJustEnded = moved; moved=false;
      setLang(currentLang(),{rerender:true});
      D.removeEventListener('pointermove', onMove);
      D.removeEventListener('touchmove', onMove);
    }
    $switchBtn.addEventListener('pointerdown', onDown);
    $switchBtn.addEventListener('touchstart', onDown, {passive:true});

    // Place switch directly before the X inside right controls
    try{ $controls.insertBefore($switchBtn,$close); }
    catch(e){ $controls.appendChild($switchBtn); }

    reflectSwitch();
  }

  // --- Panel open/close ------------------------------------------------------
  function openPanel(){
    if(!queryDom()) return;
    $panel.classList.add('ppx-open','ppx-v5');
    buildLangSwitch();
    if(!$panel.dataset.init){
      $panel.dataset.init='1';
      setLang('de',{rerender:false}); // immer DE beim ersten Öffnen
      if(PPX.flows && typeof PPX.flows.stepHome==='function'){
        try{ PPX.flows.stepHome(); }catch(e){}
      }
    }
  }
  function closePanel(){ if(!queryDom()) return; $panel.classList.remove('ppx-open'); }

  // --- One-time binding ------------------------------------------------------
  function bindOnce(){
    if(BOUND) return true;
    if(!queryDom()) return false;
    $panel.classList.add('ppx-v5');

    $launch.addEventListener('click', openPanel);
    $close.addEventListener('click', closePanel);
    W.addEventListener('keydown', function(e){ if(e.key==='Escape') closePanel(); });

    $panel.addEventListener('click', function(ev){
      var t=ev.target&&ev.target.closest?ev.target.closest('.ppx-b, .ppx-chip'):null;
      if(t&&$view&&$view.contains(t)){ t.classList.add('ppx-selected'); keepBottom(); }
    });

    D.addEventListener('click', function(ev){
      var t=ev.target&&ev.target.closest?ev.target.closest('#ppx-launch'):null;
      if(t) openPanel();
    });

    buildLangSwitch();

    if($panel.classList.contains('ppx-open') && !$panel.dataset.init){
      $panel.dataset.init='1';
      setLang('de',{rerender:false});
      if(PPX.flows && typeof PPX.flows.stepHome==='function'){
        try{ PPX.flows.stepHome(); }catch(e){}
      }
    }

    BOUND=true; return true;
  }

  // --- Exports ---------------------------------------------------------------
  PPX.ui=PPX.ui||{};
  PPX.ui.block=block; PPX.ui.line=line; PPX.ui.note=note; PPX.ui.row=row; PPX.ui.grid=grid;
  PPX.ui.getScopeIndex=getScopeIndex; PPX.ui.popToScope=popToScope; PPX.ui.keepBottom=keepBottom;
  PPX.ui.openPanel=openPanel; PPX.ui.closePanel=closePanel; PPX.ui.bindOnce=bindOnce;
  PPX.ui.setLang=setLang; PPX.ui.currentLang=currentLang;
})();
