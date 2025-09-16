/* ============================================================================
   PPX UI Buttons (buttons.js) – v7.9.4
   - btn(), chip() mit Icon-Support (data-ic)
   - Back/Home-Buttons + Nav-Leisten
   - goHome(): popToScope(0) + stepHome(force)
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  PPX.ui = PPX.ui || {};

  // kleine lokale Helfer (identisch zur Logik in panel.js)
  function isObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }
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

  // --- Basis Buttons ---------------------------------------------------------
  function btn(label, onClick, extraCls, ic) {
    var a = { 'class':'ppx-b ' + (extraCls || ''), 'onclick':onClick, 'type':'button' };
    if (ic) a['data-ic'] = ic;
    var n = el('button', a);
    n.appendChild(el('span', { 'class':'ppx-label' }, label));
    return n;
  }

  function chip(label, onClick, extraCls, ic) {
    var a = { 'class':'ppx-chip ' + (extraCls || ''), 'onclick':onClick, 'type':'button' };
    if (ic) a['data-ic'] = ic;
    var n = el('button', a);
    n.appendChild(el('span', { 'class':'ppx-label' }, label));
    return n;
  }

  // --- Navigation ------------------------------------------------------------
  function backBtnAt(scopeIdx) {
    return btn('← Zurück', function () {
      try { PPX.ui.popToScope(scopeIdx); } catch (e) {}
    }, 'ppx-secondary ppx-back');
  }

  function goHome() {
    try { PPX.ui.popToScope(0); } catch (e) {}
    try {
      if (PPX.flows && typeof PPX.flows.stepHome === 'function') {
        PPX.flows.stepHome(true); // force
      }
    } catch (e) { /* noop */ }
  }

  function homeBtn() {
    return btn('Zurück ins Hauptmenü', goHome, 'ppx-secondary', '🏠');
  }

  function homeNavBtn() {
    return btn('Zurück ins Hauptmenü', goHome, 'ppx-secondary ppx-back', '🏠');
  }

  function navBottom(scopeIdx) {
    var wrap = el('div', { 'class':'ppx-nav ppx-bottom' });
    wrap.appendChild(backBtnAt(scopeIdx));
    wrap.appendChild(homeNavBtn());
    return wrap;
  }

  function navBottomBackOnly(scopeIdx) {
    var wrap = el('div', { 'class':'ppx-nav ppx-bottom' });
    wrap.appendChild(backBtnAt(scopeIdx));
    return wrap;
  }

  // Exports
  PPX.ui.btn = btn;
  PPX.ui.chip = chip;
  PPX.ui.backBtnAt = backBtnAt;
  PPX.ui.homeBtn = homeBtn;
  PPX.ui.homeNavBtn = homeNavBtn;
  PPX.ui.navBottom = navBottom;
  PPX.ui.navBottomBackOnly = navBottomBackOnly;
  PPX.ui.goHome = goHome;
})();
