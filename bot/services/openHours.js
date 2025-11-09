/* ============================================================================
   PPX Service: openHours.js – v9.0.0 (slots)
   - Liefert: buildSlotsForDate(date), groupSlots(minutes), minToHM(min)
   - Nutzt cfg.hoursLines / cfg.OPEN (0=So … 6=Sa), optional cfg.reservations
   - Overnight-Support (Ende <= Start → +1440)
   - Lead-Time nur für "heute" (minLeadMinutes, allowSameDay)
   - BUCKETS-Gruppierung aus cfg.BUCKETS (optional)
   ============================================================================ */
(function () {
  'use strict';
  var W = window, PPX = W.PPX = W.PPX || {};
  var S = PPX.services = PPX.services || {};

  // ---- cfg / i18n helpers ---------------------------------------------------
  function cfg() { try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch (e) { return {}; } }
  function now() { return new Date(); }
  function lang() { try { return (PPX.i18n && PPX.i18n.nowLang && PPX.i18n.nowLang()) || 'de'; } catch(e){ return 'de'; } }

  // ---- time helpers ---------------------------------------------------------
  function parseHM(s) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(s || ''));
    if (!m) return null;
    var h = parseInt(m[1], 10), mi = parseInt(m[2], 10);
    return (h * 60) + mi;
  }
  function hmToMin(s) { return parseHM(s); }
  function minToHM(mins) {
    mins = Math.max(0, mins|0) % (24*60);
    var h = Math.floor(mins / 60), m = mins % 60;
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  }

  // ---- hours sources --------------------------------------------------------
  function normalizeHoursLines(lines) {
    var out = [];
    try {
      (lines || []).forEach(function (r) {
        if (Array.isArray(r) && r.length >= 2 && r[1]) {
          out.push([String(r[0]).trim(), String(r[1]).trim()]);
        }
      });
    } catch (e) {}
    return out;
  }
  function splitRangeToHM(rangeStr) {
    if (!rangeStr) return null;
    var parts = String(rangeStr).split(/–|—|-|to/i);
    if (parts.length < 2) return null;
    return [parts[0].trim(), parts[1].trim()];
  }
  function dayIdxOf(dateObj) { return dateObj.getDay(); } // 0=So … 6=Sa

  function windowFromHoursLinesForDate(dateObj, L) {
    var idx = dayIdxOf(dateObj);
    var n = normalizeHoursLines(L);
    var row = n[idx];
    if (!row) return null;
    var split = splitRangeToHM(row[1]);
    if (!split) return null;
    return [split[0], split[1]]; // ["12:00","23:00"]
  }
  function windowFromOPENForDate(dateObj, O) {
    var v = O && O[String(dayIdxOf(dateObj))];
    return (Array.isArray(v) && v.length === 2) ? v : null;
  }
  function windowForDate(dateObj) {
    var C = cfg();
    return windowFromHoursLinesForDate(dateObj, C.hoursLines) || windowFromOPENForDate(dateObj, C.OPEN) || ['00:00','00:00'];
  }

  // ---- public "today" helpers (bestand) -------------------------------------
  function todayWindow() {
    var C = cfg();
    var d = now();
    return windowForDate(d) || ['00:00','00:00'];
  }
  function isOpenNow() {
    try {
      var win = todayWindow();
      var s = parseHM(win[0]) || 0, e = parseHM(win[1]) || 0;
      if (e <= s) e += 1440; // overnight
      var cur = now().getHours() * 60 + now().getMinutes();
      if (e > 1440 && cur < s) cur += 1440; // nach Mitternacht
      return cur >= s && cur <= e;
    } catch (e) { return false; }
  }
  function closeTimeToday() {
    try {
      var win = todayWindow(), e = parseHM(win[1]) || 0;
      var h = Math.floor(e / 60) % 24, m = ('0' + (e % 60)).slice(-2);
      return h + ':' + m;
    } catch (e) { return ''; }
  }
  function describeToday() {
    try {
      var L = lang();
      var win = todayWindow();
      if (!win || !win[0]) return (L === 'en' ? 'Closed today.' : 'Heute geschlossen.');
      var line = (L === 'en') ? ('Today: ' + win[0] + ' – ' + win[1]) : ('Heute: ' + win[0] + ' – ' + win[1] + ' Uhr');
      return line;
    } catch (e) { return ''; }
  }

  // ---- reservations config --------------------------------------------------
  function reservationsCfg() {
    var C = cfg();
    var R = (C.reservations || {});
    return {
      slotSizeMinutes: (R.slotSizeMinutes|0) || 30,
      minLeadMinutes: (R.minLeadMinutes|0) || 60,
      allowSameDay: (typeof R.allowSameDay === 'boolean') ? R.allowSameDay : true
    };
  }

  // ---- slot generator -------------------------------------------------------
  function isSameYMD(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }
  function ceilToNextStep(mins, step) {
    return Math.ceil(mins / step) * step;
  }
  function buildSlotsForDate(dateObj, opts) {
    opts = opts || {};
    var cfgR = reservationsCfg();
    var step = opts.slotSizeMinutes || cfgR.slotSizeMinutes;
    var lead = (opts.minLeadMinutes != null) ? opts.minLeadMinutes : cfgR.minLeadMinutes;
    var allowSameDay = (opts.allowSameDay != null) ? opts.allowSameDay : cfgR.allowSameDay;

    var win = windowForDate(dateObj); // ["HH:MM","HH:MM"]
    var s = parseHM(win[0]) || 0, e = parseHM(win[1]) || 0;
    if (e <= s) e += 1440; // overnight window

    // Basis-Slots: Startzeiten innerhalb [s, e - step]
    var firstStart = s;
    var lastStart = Math.max(s, e - step);
    var slots = [];
    for (var t = firstStart; t <= lastStart; t += step) slots.push(t);

    // Same-day Lead-Time Filter
    var today = now();
    if (isSameYMD(dateObj, today)) {
      if (!allowSameDay) return [];
      var cur = today.getHours() * 60 + today.getMinutes();
      var minStart = ceilToNextStep(cur + lead, step);
      slots = slots.filter(function (m) { return m >= minStart; });
    }

    // Nach-Mitternacht Anpassung: Für datumsbezogene Anzeige Slots > 1440 zurück auf 0–1439 mappen
    // (In unserem Konstrukt bleiben Startzeiten immer 0–1439, da wir e nur erhöhen.)
    return slots;
  }

  // ---- grouping -------------------------------------------------------------
  function groupSlots(minutes) {
    var C = cfg(), B = C.BUCKETS || null;
    if (!B) {
      if (!minutes.length) return [];
      return [{ from: minutes[0], to: (minutes[minutes.length - 1] + 30), slots: minutes.slice() }];
    }
    var groups = [];
    Object.keys(B).forEach(function (key) {
      var rng = B[key];
      if (!Array.isArray(rng) || rng.length < 2) return;
      var f = parseHM(rng[0]) || 0, t = parseHM(rng[1]) || 0;
      if (t <= f) t += 1440;
      var slots = minutes.filter(function (m) {
        var mm = m;
        // Falls Bucket über Mitternacht ginge: hier analog behandeln
        var TT = t, FF = f;
        if (TT > 1440 && mm < FF) mm += 1440;
        return mm >= FF && mm < TT;
      });
      if (slots.length) groups.push({ key: key, from: f, to: t, slots: slots });
    });
    if (!groups.length && minutes.length) {
      groups.push({ from: minutes[0], to: (minutes[minutes.length - 1] + 30), slots: minutes.slice() });
    }
    return groups;
  }

  // ---- public api -----------------------------------------------------------
  S.openHours = {
    // Bestand
    isOpenNow: isOpenNow,
    todayWindow: todayWindow,
    closeTimeToday: closeTimeToday,
    describeToday: describeToday,
    // Neu
    hmToMin: hmToMin,
    minToHM: minToHM,
    windowForDate: windowForDate,
    buildSlotsForDate: buildSlotsForDate,
    groupSlots: groupSlots
  };
})();
