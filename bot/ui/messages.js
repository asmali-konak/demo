/* ============================================================================
   PPX UI Messages (v1)
   - Keine Globals außer window.PPX
   - Liest nur aus window.PPX_DATA (optional: .UI_TEXT, .cfg.brand)
   - Bietet minimale Helfer zum Erzeugen/Anhängen von Chatblasen,
     damit der Orchestrator v8.x nicht mehr auf "missing module" läuft.
============================================================================ */
(function () {
  var w = window;
  w.PPX = w.PPX || {};
  var UI = w.PPX.ui = w.PPX.ui || {};

  // Exporte-Objekt
  var M = UI.messages = UI.messages || {};

  // ---- Konfig / Texte ------------------------------------------------------
  function getTextMap() {
    var D = (w.PPX_DATA && (w.PPX_DATA.UI_TEXT || w.PPX_DATA.ui_text)) || {};
    // Fallback-Texte
    return {
      sending: D.sending || 'Senden …',
      failed:  D.failed  || 'Uff, das hat leider nicht geklappt.',
      retry:   D.retry   || 'Nochmal versuchen',
      system:  D.system  || 'Hinweis',
      botName: (w.PPX_DATA && w.PPX_DATA.cfg && w.PPX_DATA.cfg.brand) || 'Unser Bot'
    };
  }

  // ---- Utilities ------------------------------------------------------------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function sanitizeText(t) {
    // sehr einfache Text-Säuberung → als Textknoten einfügen
    return (t == null) ? '' : String(t);
  }

  function nowHHMM() {
    var d = new Date();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  function host() {
    // Standard-Container des Chats
    return document.getElementById('ppx-v');
  }

  // ---- Message-Fabrik -------------------------------------------------------
  function bubble(role, textHTML) {
    var wrap = el('div', 'ppx-m ppx-' + role); // role: bot|user|sys|err
    wrap.setAttribute('role', 'group');

    var inner = el('div', 'ppx-b');
    inner.innerHTML = textHTML;
    wrap.appendChild(inner);

    var meta = el('div', 'ppx-meta', nowHHMM());
    wrap.appendChild(meta);

    return wrap;
  }

  function messageHTMLFromText(text) {
    // Plaintext → sicher als Textnode, einfache \n zu <br>
    var safe = sanitizeText(text).replace(/\n/g, '<br>');
    return safe;
  }

  // ---- Öffentliche Builder --------------------------------------------------
  M.bot = function (text) {
    return bubble('bot', messageHTMLFromText(text));
  };

  M.user = function (text) {
    return bubble('user', messageHTMLFromText(text));
  };

  M.system = function (text) {
    var T = getTextMap();
    var title = '<strong>' + T.system + ':</strong> ';
    return bubble('sys', title + messageHTMLFromText(text));
  };

  M.error = function (text) {
    var T = getTextMap();
    var html = '<div class="ppx-err-txt">' + messageHTMLFromText(text || T.failed) + '</div>';
    // optional: Retry-Button (ohne Logik – nur visuell vorhanden)
    html += '<div class="ppx-actions"><button class="ppx-btn ppx-retry" type="button">' +
            T.retry + '</button></div>';
    return bubble('err', html);
  };

  // Tippen-Status (…)
  M.typing = function () {
    var wv = el('div', 'ppx-m ppx-bot ppx-typing', '');
    wv.setAttribute('aria-live', 'polite');
    var dots = el('div', 'ppx-b');
    dots.innerHTML = '<span class="ppx-dot"></span><span class="ppx-dot"></span><span class="ppx-dot"></span>';
    wv.appendChild(dots);
    return wv;
  };

  // ---- Convenience: an Container anhängen ----------------------------------
  M.append = function (node) {
    var v = host();
    if (!v || !node) return;
    v.appendChild(node);
    // Auto-Scroll ans Ende
    try { v.scrollTop = v.scrollHeight; } catch (e) {}
  };

  // Kurz-API: direkt Text anhängen
  M.appendBot = function (text)  { M.append(M.bot(text));   };
  M.appendUser = function (text) { M.append(M.user(text));  };
  M.appendSys  = function (text) { M.append(M.system(text));};
  M.appendErr  = function (text) { M.append(M.error(text)); };

  // ---- Minimaler Startgruß (optional, nur wenn Container schon da ist) -----
  // NICHT invasiv: wird nur gezeigt, wenn keine Kinder vorhanden sind
  M.ensureWelcome = function () {
    var v = host();
    if (!v) return;
    if (v.children && v.children.length === 0) {
      var T = getTextMap();
      M.appendBot('Willkommen bei ' + T.botName + ' 👋');
    }
  };

  // Export einiger Helfer (können von Flows genutzt werden)
  M.util = {
    time: nowHHMM,
    text: sanitizeText
  };

  // Keine Auto-Ausführung hier – Orchestrator ruft die Module der Reihe nach.
})();
