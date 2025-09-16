/* ============================================================================
   PPX UI Forms (forms.js) – v7.9.4
   - Input-/Textarea-/Select-Row-Builder (mit .ppx-input Wrapper)
   - Helpers: val(el), focus(el)
   - Validation: isValidEmail()
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  PPX.ui = PPX.ui || {};

  // ---- small utils ----------------------------------------------------------
  function assignAttrs(node, attrs) {
    if (!attrs) return node;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === 'class' || k === 'className') node.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k in node) { try { node[k] = v; } catch(e){ node.setAttribute(k, v); } }
      else node.setAttribute(k, v);
    });
    return node;
  }

  function makeWrap() {
    var wrap = D.createElement('div');
    wrap.className = 'ppx-input';
    return wrap;
  }

  // ---- builders -------------------------------------------------------------
  // inputRow({ type, placeholder, value, min, max, step, pattern, autocomplete, ... })
  function inputRow(attrs) {
    attrs = attrs || {};
    var wrap = makeWrap();
    var inp = D.createElement('input');
    assignAttrs(inp, Object.assign({ type:'text' }, attrs));
    wrap.appendChild(inp);
    return { row: wrap, input: inp };
  }

  // textareaRow({ placeholder, rows, value, ... })
  function textareaRow(attrs) {
    attrs = attrs || {};
    var wrap = makeWrap();
    var ta = D.createElement('textarea');
    assignAttrs(ta, attrs);
    wrap.appendChild(ta);
    return { row: wrap, textarea: ta };
  }

  // selectRow(options, { value, ... })
  // options: [{ value:'', label:'' }, ...]  or  ['A','B']
  function selectRow(options, attrs) {
    var wrap = makeWrap();
    var sel = D.createElement('select');
    (options || []).forEach(function (opt) {
      var o = D.createElement('option');
      if (typeof opt === 'string') { o.value = opt; o.textContent = opt; }
      else { o.value = String(opt.value != null ? opt.value : (opt.label || '')); o.textContent = String(opt.label != null ? opt.label : o.value); }
      sel.appendChild(o);
    });
    assignAttrs(sel, attrs || {});
    wrap.appendChild(sel);
    return { row: wrap, select: sel };
  }

  // ---- helpers --------------------------------------------------------------
  function val(el) { return String((el && el.value) || '').trim(); }
  function focus(el) { try { el && el.focus && el.focus(); } catch(e){} return el; }

  // ---- validation -----------------------------------------------------------
  // exakt wie im Original-Widget
  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
  }

  // ---- export ---------------------------------------------------------------
  PPX.ui.forms = {
    inputRow: inputRow,
    textareaRow: textareaRow,
    selectRow: selectRow,
    val: val,
    focus: focus,
    isValidEmail: isValidEmail
  };
})();
