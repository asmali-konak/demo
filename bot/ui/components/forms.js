/* ============================================================================
   PPX UI Forms (forms.js) – v8.4.0
   - Input-/Textarea-/Select-Row-Builder (mit .ppx-input Wrapper)
   - Helpers: val(el), focus(el)
   - Validation: isValidEmail()
   - I18N: akzeptiert {de:'…', en:'…'} bei placeholder/option.label (außerhalb bot.json)
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  PPX.ui = PPX.ui || {};

  // I18N helpers (sanfte Fallbacks)
  var I = PPX.i18n || {};
  var pick = (I && I.pick) ? I.pick : function(v){ return (v && typeof v==='object') ? (v.de||v.en||'') : v; };

  // ---- small utils ----------------------------------------------------------
  function assignAttrs(node, attrs) {
    if (!attrs) return node;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      // I18N: placeholder kann {de,en} sein
      if (k === 'placeholder') v = pick(v);
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
    // I18N: placeholder unterstützen
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
  // options: [{ value:'', label:''|{de,en} }, ...]  or  ['A','B']
  function selectRow(options, attrs) {
    var wrap = makeWrap();
    var sel = D.createElement('select');
    (options || []).forEach(function (opt) {
      var o = D.createElement('option');
      if (typeof opt === 'string') {
        o.value = opt; o.textContent = opt;
      } else {
        var val = (opt.value != null ? String(opt.value) : String(opt.label || ''));
        var lbl = (opt.label != null ? pick(opt.label) : val);
        o.value = val; o.textContent = String(lbl);
      }
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
