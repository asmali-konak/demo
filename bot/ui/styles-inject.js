/* ============================================================================
   PPX UI Styles Injector (styles-inject.js) – v8.6.0
   - Liest THEME aus window.PPX_DATA / __PPX_DATA__ / PPX.data
   - Setzt CSS-Variablen global (:root) + Bot-Scope (#ppx-panel / .ppx-launch)
   - Injiziert PPX-UI-Verfeinerungen (Grid, Chips, Inputs, etc.)
   - Toggle-Variablen (THEME.toggle.*) → --ppx-toggle-*
============================================================================ */
(function () {
  'use strict';

  var STYLE_ID_VARS  = 'ppx-theme-vars';
  var STYLE_ID_EXTRA = 'ppx-style-v860';

  function ensureStyleTag(id, css) {
    try { var old = document.getElementById(id); if (old) old.remove(); } catch (e) {}
    var tag = document.createElement('style');
    tag.id = id;
    tag.textContent = css || '';
    (document.head || document.documentElement).appendChild(tag);
    return tag;
  }

  function readThemeSync() {
    var src = (window.PPX_DATA) || (window.__PPX_DATA__) || (window.PPX && window.PPX.data);
    return (src && src.THEME) ? src.THEME : null;
  }

  function px(n, fallback) {
    if (typeof n === 'number' && isFinite(n)) return n + 'px';
    if (typeof n === 'string' && n.trim()) return n;
    return fallback;
  }

  function asVars(theme) {
    var r = (theme && theme.root)   || {};
    var b = (theme && theme.bot)    || {};
    var t = (theme && theme.toggle) || {};

    // Global vars (:root)
    var css = ':root{'
      + '--ppx-font-body:' + (r.fontBody || "system-ui, sans-serif") + ';'
      + '--ppx-font-heading:' + (r.fontHeading || "system-ui, sans-serif") + ';'
      + '--ppx-font-mono:' + (r.fontMono || "ui-monospace, monospace") + ';'

      + '--ppx-text:' + (r.text || '#222') + ';'
      + '--ppx-text-muted:' + (r.textMuted || '#666') + ';'
      + '--ppx-bg:' + (r.bg || '#fff') + ';'
      + '--ppx-surface:' + (r.surface || '#fff') + ';'

      + '--ppx-primary:' + (r.primary || '#0a7') + ';'
      + '--ppx-primary-contrast:' + (r.primaryContrast || '#fff') + ';'
      + '--ppx-accent:' + (r.accent || '#d4b483') + ';'
      + '--ppx-link:' + (r.link || r.primary || '#06c') + ';'

      + '--ppx-border:' + (r.border || 'rgba(0,0,0,.12)') + ';'
      + '--ppx-radius-sm:' + (r.radiusSm || '6px') + ';'
      + '--ppx-radius-md:' + (r.radiusMd || '10px') + ';'
      + '--ppx-radius-lg:' + (r.radiusLg || '16px') + ';'
      + '--ppx-radius-full:' + (r.radiusFull || '999px') + ';'

      + '--ppx-space-xs:' + (r.spaceXS || '4px') + ';'
      + '--ppx-space-s:' + (r.spaceS || '8px') + ';'
      + '--ppx-space-m:' + (r.spaceM || '12px') + ';'
      + '--ppx-space-l:' + (r.spaceL || '16px') + ';'
      + '--ppx-space-xl:' + (r.spaceXL || '24px') + ';'

      + '--ppx-shadow-sm:' + (r.shadowSm || '0 2px 8px rgba(0,0,0,.10)') + ';'
      + '--ppx-shadow-md:' + (r.shadowMd || '0 6px 20px rgba(0,0,0,.10)') + ';'
      + '--ppx-shadow-lg:' + (r.shadowLg || '0 28px 80px rgba(0,0,0,.35)') + ';'

      + '--ppx-focus:' + (r.focusOutline || '2px dashed #aaa') + ';'
      + '--ppx-t-fast:' + (r.transitionFast || '120ms') + ';'
      + '--ppx-t:' + (r.transition || '200ms') + ';'
      + '--ppx-t-slow:' + (r.transitionSlow || '320ms') + ';'

      + '--ppx-z-chat:' + (r.zChat || '100000') + ';'
      + '}';

    // Bot scope overrides
    css += '#ppx-panel, .ppx-launch{'
      + '--ppx-bot-bg:' + (b.bg || '#0a2a21') + ';'
      + '--ppx-bot-surface:' + (b.surface || 'rgba(255,255,255,.06)') + ';'
      + '--ppx-bot-header:' + (b.header || '#0f3a2f') + ';'
      + '--ppx-bot-text:' + (b.text || '#f7faf8') + ';'
      + '--ppx-bot-chip:' + (b.chip || 'rgba(255,255,255,.06)') + ';'
      + '--ppx-bot-chip-border:' + (b.chipBorder || 'rgba(255,255,255,.18)') + ';'
      + '--ppx-bot-dot:' + (b.brandDot || '#0f3a2f') + ';'
      + '--ppx-bot-brandbar-bg:' + (b.brandbarBg || 'rgba(255,255,255,.92)') + ';'
      + '--ppx-bot-brandbar-text:' + (b.brandbarText || '#11231c') + ';'

      + '--ppx-toggle-size:' + px(t.size, '28px') + ';'
      + '--ppx-toggle-track-on:' + (t.trackOn || '#1e7a5a') + ';'
      + '--ppx-toggle-track-off:' + (t.trackOff || 'rgba(255,255,255,.18)') + ';'
      + '--ppx-toggle-knob:' + (t.knob || '#ffffff') + ';'
      + '--ppx-toggle-border:' + (t.border || 'rgba(255,255,255,.35)') + ';'
      + '--ppx-toggle-focus:' + (t.focus || '#c9a667') + ';'
      + '}';

    return css;
  }

  function applyTheme(theme) {
    ensureStyleTag(STYLE_ID_VARS, asVars(theme));
  }

  function initExtraStyles() {
    var css = `
/* --- Scroll + Blocks ------------------------------------------------------ */
#ppx-panel.ppx-v5 #ppx-v{overflow-y:auto;max-height:calc(100vh - 120px);-webkit-overflow-scrolling:touch;padding:10px 10px 16px;}
#ppx-panel.ppx-v5 #ppx-v .ppx-bot{background:linear-gradient(180deg,rgba(14,59,51,.45),rgba(14,59,51,.30));border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:14px;margin:12px auto;max-width:640px;box-shadow:var(--ppx-shadow-sm);text-align:left!important}
#ppx-panel.ppx-v5 #ppx-v [data-block^=resv-],#ppx-panel.ppx-v5 #ppx-v [data-block^=cf-],#ppx-panel.ppx-v5 #ppx-v [data-block^=speisen-],#ppx-panel.ppx-v5 #ppx-v [data-block=kontakt],#ppx-panel.ppx-v5 #ppx-v [data-block=hours]{max-width:100%!important;margin-left:0!important;margin-right:0!important}
#ppx-panel.ppx-v5 #ppx-v .ppx-h{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--ppx-bot-header);color:var(--ppx-bot-text);border:1px solid rgba(255,255,255,.10);border-radius:12px;margin:-2px -2px 10px;font-family:var(--ppx-font-heading);font-weight:600;letter-spacing:.02em;text-transform:uppercase;font-size:18px}
#ppx-panel.ppx-v5 #ppx-v .ppx-m{color:var(--ppx-bot-text);line-height:1.5;margin:6px 0 10px;font-family:var(--ppx-font-body);font-weight:400;font-size:18px}
#ppx-panel.ppx-v5 #ppx-v .ppx-note{font-weight:600;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.28);border-left:4px solid var(--ppx-accent);border-radius:12px;padding:10px 12px;margin:6px 0 10px;box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 2px 8px rgba(0,0,0,.15)}
#ppx-panel.ppx-v5 #ppx-v .ppx-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start!important;margin-top:8px;width:100%}
#ppx-panel.ppx-v5 #ppx-v .ppx-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px;width:100%}

/* --- Buttons / Chips ------------------------------------------------------ */
#ppx-panel.ppx-v5 #ppx-v .ppx-b,#ppx-panel.ppx-v5 #ppx-v .ppx-chip{-webkit-appearance:none;appearance:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:flex-start!important;gap:10px;width:100%!important;text-align:left;color:var(--ppx-bot-text);border:1px solid var(--ppx-bot-chip-border);border-radius:14px;padding:10px 14px!important;background:var(--ppx-bot-chip);box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 2px 8px rgba(0,0,0,.20);transition:transform .06s,filter .2s,box-shadow .2s,background .2s;font-family:var(--ppx-font-body);font-weight:400!important;font-size:17px!important}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-cta{background:var(--ppx-primary);color:var(--ppx-primary-contrast);border-color:transparent}
#ppx-panel.ppx-v5 #ppx-v .ppx-chip{background:var(--ppx-bot-chip)}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-secondary,#ppx-panel.ppx-v5 #ppx-v .ppx-chip.ppx-secondary{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.22);padding:8px 12px!important;font-size:15px!important;box-shadow:none}
#ppx-panel.ppx-v5 #ppx-v .ppx-b[data-ic]::before,#ppx-panel.ppx-v5 #ppx-v .ppx-chip[data-ic]::before{content:attr(data-ic);display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;min-width:26px;border-radius:999px;background:var(--ppx-accent);color:#2a2a1f;font-size:15px;line-height:1;box-shadow:inset 0 0 0 2px rgba(0,0,0,.08),0 1px 0 rgba(255,255,255,.22) inset}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-selected,#ppx-panel.ppx-v5 #ppx-v .ppx-chip.ppx-selected{filter:brightness(1.10);box-shadow:0 0 0 2px rgba(201,166,103,.35) inset,0 2px 8px rgba(0,0,0,.26)}

/* --- Inputs --------------------------------------------------------------- */
#ppx-panel.ppx-v5 #ppx-v .ppx-input{display:flex;gap:8px;margin-top:8px}
#ppx-panel.ppx-v5 #ppx-v .ppx-input input,#ppx-panel.ppx-v5 #ppx-v .ppx-input select,#ppx-panel.ppx-v5 #ppx-v .ppx-input textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;font-size:15px;outline:none}
#ppx-panel.ppx-v5 #ppx-v .ppx-input textarea{min-height:96px;resize:vertical}

/* --- Slot-Grid + Home-Zentrierung ---------------------------------------- */
#ppx-panel.ppx-v5 #ppx-v .ppx-grid.ppx-slotgrid{grid-template-columns:repeat(3,minmax(0,1fr));max-height:280px;overflow:auto;padding-right:4px}
@media (max-width:520px){#ppx-panel.ppx-v5 #ppx-v .ppx-grid.ppx-slotgrid{grid-template-columns:repeat(2,minmax(0,1fr));max-height:260px}}
#ppx-panel.ppx-v5 #ppx-v [data-block=home] .ppx-row{justify-content:center!important}
#ppx-panel.ppx-v5 #ppx-v [data-block=home] .ppx-b,#ppx-panel.ppx-v5 #ppx-v [data-block=home] .ppx-chip{justify-content:center!important;text-align:center!important}

/* --- Nav / Back ----------------------------------------------------------- */
#ppx-panel.ppx-v5 #ppx-v .ppx-nav{display:flex;gap:10px;width:100%;margin-top:10px}
#ppx-panel.ppx-v5 #ppx-v .ppx-nav.ppx-bottom{justify-content:space-between!important}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-back{width:auto!important;min-width:130px!important;flex:0 0 auto!important;font-size:14px!important;padding:8px 10px!important}

/* --- Language Switch (Kugel, neben dem X) -------------------------------- */
#ppx-panel.ppx-v5 .ppx-switch{position:relative;display:inline-flex;align-items:center;height:var(--ppx-toggle-size);width:calc(var(--ppx-toggle-size) * 2.05);border-radius:999px;border:1px solid var(--ppx-toggle-border);background:var(--ppx-toggle-track-off);cursor:pointer;user-select:none;padding:0;margin-right:8px;outline:none;transition:background var(--ppx-t-fast),box-shadow var(--ppx-t),border-color var(--ppx-t);}
#ppx-panel.ppx-v5 .ppx-switch:focus-visible{box-shadow:0 0 0 3px color-mix(in oklab, var(--ppx-toggle-focus) 55%, transparent);border-color:var(--ppx-toggle-focus);}
#ppx-panel.ppx-v5 .ppx-switch[data-state="en"]{background:var(--ppx-toggle-track-on);}
#ppx-panel.ppx-v5 .ppx-switch-track{position:relative;flex:1;height:100%;display:block;overflow:hidden;border-radius:inherit;}
#ppx-panel.ppx-v5 .ppx-switch-label{position:absolute;top:50%;transform:translateY(-50%);font-size:12px;font-weight:700;letter-spacing:.2px;color:#fff;opacity:.85;pointer-events:none}
#ppx-panel.ppx-v5 .ppx-switch-de{left:8px}
#ppx-panel.ppx-v5 .ppx-switch-en{right:8px}
#ppx-panel.ppx-v5 .ppx-switch-knob{position:absolute;top:2px;left:2px;width:calc(var(--ppx-toggle-size) - 4px);height:calc(var(--ppx-toggle-size) - 4px);border-radius:999px;background:var(--ppx-toggle-knob);box-shadow:0 2px 8px rgba(0,0,0,.35);transition:transform var(--ppx-t-fast);}
#ppx-panel.ppx-v5 .ppx-switch[data-state="en"] .ppx-switch-knob{transform:translateX(calc(var(--ppx-toggle-size) - 2px));}
`;
    ensureStyleTag(STYLE_ID_EXTRA, css);
  }
  function bootstrap() {
    var theme = readThemeSync();
    if (theme) {
      applyTheme(theme);
      initExtraStyles();
      return;
    }
    // Fallback: fetch bot.json (robust gegen Lade-Reihenfolge)
    try {
      fetch('bot-data/bot.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.THEME) applyTheme(j.THEME);
          initExtraStyles();
        })
        .catch(function () { initExtraStyles(); });
    } catch (e) {
      initExtraStyles();
    }
  }

  // Run
  bootstrap();
})();
