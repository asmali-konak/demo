/* ============================================================================
   PPX UI Panel (panel.js) – v7.9.4
   - DOM Query & Panel open/close
   - Scroll-Always (keepBottom)
   - UI-Basics: block(), line(), note(), row(), grid()
   - Scope-Stack: getScopeIndex(), popToScope()
   - Einmaliges Binden der Events (bindOnce)
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  var U = PPX.util || {};

  // DOM refs
  var $launch, $panel, $close, $view;
  var BOUND = false;

  function queryDom() {
    $launch = D.getElementById('ppx-launch');
    $panel  = D.getElementById('ppx-panel');
    $close  = D.getElementById('ppx-close');
    $view   = D.getElementById('ppx-v');
    return !!($launch && $panel && $close && $view);
  }

  function openPanel() {
    if (!queryDom()) return;
    $panel.classList.add('ppx-open', 'ppx-v5');
    if (!$panel.dataset.init) {
      $panel.dataset.init = '1';
      if (PPX.flows && typeof PPX.flows.stepHome === 'function') {
        try { PPX.flows.stepHome(); } catch (e) { /* noop */ }
      }
    }
  }

  function closePanel() {
    if (!queryDom()) return;
    $panel.classList.remove('ppx-open');
  }

  // --- Scroll helpers --------------------------------------------------------
  function jumpBottom() {
    if (!$view) return;
    try {
      $view.scrollTop = $view.scrollHeight;
      requestAnimationFrame(function () { $view.scrollTop = $view.scrollHeight; });
    } catch (e) {}
  }
  function keepBottom() {
    jumpBottom();
    setTimeout(jumpBottom, 80);
    setTimeout(jumpBottom, 200);
  }

  // --- Utils -----------------------------------------------------------------
  function isObj(v){ return U && typeof U.isObj === 'function' ? U.isObj(v) : (v && typeof v==='object' && !Array.isArray(v)); }

  function el(tag, attrs) {
    var n = D.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (k === 'style' && isObj(v)) { Object.assign(n.style, v); }
      else if (k === 'text') { n.textContent = v; }
      else if (k === 'html') { n.innerHTML = v; }
      else if (k.slice(0,2) === 'on' && typeof v === 'function') { n.addEventListener(k.slice(2), v); }
      else if (k === 'className' || k === 'class') { n.setAttribute('class', v); }
      else { n.setAttribute(k, v); }
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i]; if (c == null) continue;
      n.appendChild(typeof c === 'string' ? D.createTextNode(c) : c);
    }
    return n;
  }

  // --- UI building blocks ----------------------------------------------------
  function block(title, opts) {
    opts = opts || {};
    var w = el('div', { 'class':'ppx-bot ppx-appear', style:{ maxWidth:(opts.maxWidth || '640px'), margin:'12px auto' } });
    if (title) {
      var hStyle = opts.hCenter ? { justifyContent:'center', textAlign:'center' } : null;
      var h = el('div', { 'class':'ppx-h', style:hStyle }, title);
      w.appendChild(h);
    }
    if ($view) $view.appendChild(w);
    keepBottom();
    return w;
  }
  function line(txt){ return el('div', { 'class':'ppx-m' }, txt); }
  function note(txt){ return el('div', { 'class':'ppx-m ppx-note' }, txt); }
  function row(){ return el('div', { 'class':'ppx-row' }); }
  function grid(){ return el('div', { 'class':'ppx-grid' }); }

  // --- Scope helpers ---------------------------------------------------------
  function getScopeIndex(){ return $view ? $view.children.length : 0; }
  function popToScope(idx){
    if (!$view) return;
    while ($view.children.length > idx) {
      var last = $view.lastElementChild; if (!last) break;
      last.remove();
    }
    keepBottom();
  }

  // --- One-time binding ------------------------------------------------------
  function bindOnce() {
    if (BOUND) return true;
    if (!queryDom()) return false;

    $panel.classList.add('ppx-v5');

    // open / close
    $launch.addEventListener('click', openPanel);
    $close.addEventListener('click', closePanel);
    W.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

    // Button highlight + keepBottom on click inside view
    $panel.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('.ppx-b, .ppx-chip') : null;
      if (t && $view && $view.contains(t)) {
        t.classList.add('ppx-selected');
        keepBottom();
      }
    });

    // Fallback: document click on launcher
    D.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('#ppx-launch') : null;
      if (t) openPanel();
    });

    // Falls Panel bei Start schon offen ist
    if ($panel.classList.contains('ppx-open') && !$panel.dataset.init) {
      $panel.dataset.init = '1';
      if (PPX.flows && typeof PPX.flows.stepHome === 'function') {
        try { PPX.flows.stepHome(); } catch (e) {}
      }
    }

    BOUND = true;
    return true;
  }

  // Exports
  PPX.ui.block = block;
  PPX.ui.line = line;
  PPX.ui.note = note;
  PPX.ui.row = row;
  PPX.ui.grid = grid;

  PPX.ui.getScopeIndex = getScopeIndex;
  PPX.ui.popToScope = popToScope;
  PPX.ui.keepBottom = keepBottom;

  PPX.ui.openPanel = openPanel;
  PPX.ui.closePanel = closePanel;
  PPX.ui.bindOnce = bindOnce;
})();
