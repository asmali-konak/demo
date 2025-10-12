/* ============================================================================
   PPX Flow: Öffnungszeiten (hours.js) – v8.7.1
   - Fallback auf cfg.OPEN, falls hoursLines fehlt oder leer
   - Sichere Day-Labels (DE/EN)
   - Kompatibel mit openHours.js v8.7+
   ============================================================================ */
(function () {
  'use strict';
  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  var UI = PPX.ui || {};
  var DLY = PPX.D || {};
  var I = PPX.i18n || {};

  function cfg() {
    try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; }
    catch (e) { return {}; }
  }
  function t(k, fb) {
    try { return (I && I.t) ? I.t(k, fb) : (fb || k); }
    catch (e) { return fb || k; }
  }

  function normDayNames(list) {
    var L = (I && I.nowLang && I.nowLang()) || 'de';
    if (L === 'en') {
      return list.map(function (r) {
        var d = r[0] || '';
        var map = {
          'Montag': 'Monday', 'Dienstag': 'Tuesday', 'Mittwoch': 'Wednesday',
          'Donnerstag': 'Thursday', 'Freitag': 'Friday',
          'Samstag': 'Saturday', 'Sonntag': 'Sunday'
        };
        return [map[d] || d, r[1] || ''];
      });
    }
    return list;
  }

  function deriveFromOPEN(openObj) {
    var days = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var arr = [];
    try {
      Object.keys(openObj || {}).forEach(function (k) {
        var idx = parseInt(k, 10);
        var v = openObj[k];
        if (Array.isArray(v) && v.length === 2) {
          arr.push([days[idx] || ('Tag ' + k), v[0] + ' – ' + v[1]]);
        }
      });
    } catch (e) {}
    return arr;
  }

  function stepHours() {
    var C = cfg();
    var list = Array.isArray(C.hoursLines) && C.hoursLines.length ? C.hoursLines : deriveFromOPEN(C.OPEN);
    list = normDayNames(list);

    var block = UI.block ? UI.block('Öffnungszeiten', { maxWidth: '100%' }) :
      D.createElement('div');
    block.setAttribute('data-block', 'hours-root');

    var body = D.createElement('div');
    body.className = 'ppx-body';
    block.appendChild(body);

    list.forEach(function (r) {
      var line = (r && Array.isArray(r)) ? r[0] + ': ' + r[1] : String(r);
      body.appendChild(UI.line ? UI.line(line) : D.createTextNode(line));
    });

    try { UI.keepBottom && UI.keepBottom(); } catch (e) {}

    var row = UI.row ? UI.row() : D.createElement('div');
    row.style.justifyContent = 'flex-start';
    row.appendChild(UI.btn ? UI.btn('Reservieren', function(){ PPX.flows && PPX.flows.stepReservieren && PPX.flows.stepReservieren(); }, 'ppx-cta','🗓️')
                           : D.createTextNode('Reservieren'));
    row.appendChild(UI.btn ? UI.btn('Zurück', function(){ UI.goHome && UI.goHome(); }, 'ppx-secondary','🏠')
                           : D.createTextNode('Zurück'));
    body.appendChild(row);

    try { UI.keepBottom && UI.keepBottom(); } catch (e) {}
  }

  PPX.flows = PPX.flows || {};
  PPX.flows.stepHours = stepHours;
})();
