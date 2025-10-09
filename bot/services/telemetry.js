/* ============================================================================
   /bot/services/telemetry.js – v1.0.0 (minimal, PII-frei)
   - Zweck: Nur grobe Metriken für Debug/Kostenblick.
   - Erfasst: intent, ok/err, durationMs, tokensIn, tokensOut (falls bekannt).
   - Speicherung: nur in-memory + console.debug (keine externen Calls).
   ============================================================================ */
(function () {
  'use strict';
  var W = window; var PPX = W.PPX = W.PPX || {};
  var store = [];

  function now(){ return Date.now(); }

  function clamp(n){ n = Number(n)||0; return Math.max(0, Math.min(n, 999999)); }

  function ping(ev){
    // ev: { intent, ok, durationMs, tokensIn, tokensOut, note }
    var rec = {
      ts: now(),
      intent: (ev && ev.intent) || '',
      ok: !!(ev && ev.ok),
      durationMs: clamp((ev && ev.durationMs) || 0),
      tokensIn: clamp((ev && ev.tokensIn) || 0),
      tokensOut: clamp((ev && ev.tokensOut) || 0),
      note: ev && ev.note ? String(ev.note).slice(0,120) : ''
    };
    store.push(rec);
    if (store.length > 2000) store.shift();
    try { console.debug('[PPX telemetry]', rec); } catch (e) {}
  }

  function all(){ return store.slice(); }
  function clear(){ store.length = 0; }

  PPX.services = PPX.services || {};
  PPX.services.telemetry = { ping: ping, all: all, clear: clear };
})();
