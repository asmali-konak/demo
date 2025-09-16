/* ============================================================================
   PPX UI Styles Injector (styles-inject.js) – v7.9.4
   Injiziert das erweiterte Widget-CSS (Equal-Height Grids etc.) 1:1.
   ============================================================================ */
(function () {
  'use strict';
  var id = 'ppx-style-v760';
  try { var old = document.getElementById(id); if (old) old.remove(); } catch (e) {}

  var css = `
:root{--ppx-green-850:#0f3b33;--ppx-green-800:#114136;--ppx-green-700:#154a3e;--ppx-green-650:#1a5044;--ppx-green-600:#195446;--ppx-ink:#f1f7f4;--ppx-gold:#e6c48a;--ppx-gold-ink:#2a2a1f;--ppx-border:rgba(255,255,255,.10);--ppx-shadow:0 4px 12px rgba(0,0,0,.20);--ppx-item-h:66px;}
#ppx-panel.ppx-v5 #ppx-v{overflow-y:auto;max-height:calc(100vh - 120px);-webkit-overflow-scrolling:touch;padding:10px 10px 16px;}
#ppx-panel.ppx-v5 #ppx-v .ppx-bot{background:linear-gradient(180deg,rgba(14,59,51,.45),rgba(14,59,51,.30));border:1px solid var(--ppx-border);border-radius:14px;padding:14px;margin:12px auto;max-width:640px;box-shadow:var(--ppx-shadow);text-align:left!important}
#ppx-panel.ppx-v5 #ppx-v [data-block^=resv-],#ppx-panel.ppx-v5 #ppx-v [data-block^=cf-],#ppx-panel.ppx-v5 #ppx-v [data-block^=speisen-],#ppx-panel.ppx-v5 #ppx-v [data-block^=faq-],#ppx-panel.ppx-v5 #ppx-v [data-block=kontakt],#ppx-panel.ppx-v5 #ppx-v [data-block=hours]{max-width:100%!important;margin-left:0!important;margin-right:0!important}
#ppx-panel.ppx-v5 #ppx-v .ppx-h{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--ppx-green-800);color:var(--ppx-ink);border:1px solid var(--ppx-border);border-radius:12px;margin:-2px -2px 10px;font-family:Cinzel,serif;font-weight:600;letter-spacing:.02em;text-transform:uppercase;font-size:18px}
#ppx-panel.ppx-v5 #ppx-v .ppx-m{color:var(--ppx-ink);line-height:1.5;margin:6px 0 10px;font-family:'Cormorant Garamond',serif;font-weight:400;font-size:18px}
#ppx-panel.ppx-v5 #ppx-v .ppx-note{font-weight:600;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.28);border-left:4px solid var(--ppx-gold);border-radius:12px;padding:10px 12px;margin:6px 0 10px;box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 2px 8px rgba(0,0,0,.15)}
#ppx-panel.ppx-v5 #ppx-v .ppx-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start!important;margin-top:8px;width:100%}
#ppx-panel.ppx-v5 #ppx-v .ppx-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px;width:100%;grid-auto-rows:var(--ppx-item-h);}
#ppx-panel.ppx-v5 #ppx-v .ppx-b,#ppx-panel.ppx-v5 #ppx-v .ppx-chip{-webkit-appearance:none;appearance:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:flex-start!important;gap:10px;width:100%!important;text-align:left;color:var(--ppx-ink);border:1px solid var(--ppx-border);border-radius:14px;padding:10px 14px!important;background:var(--ppx-green-650);box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 2px 8px rgba(0,0,0,.20);transition:transform .06s,filter .2s,box-shadow .2s,background .2s;font-family:'Cormorant Garamond',serif;font-weight:400!important;font-size:17px!important}
#ppx-panel.ppx-v5 #ppx-v .ppx-grid .ppx-b,#ppx-panel.ppx-v5 #ppx-v .ppx-grid .ppx-chip{height:100%;min-height:var(--ppx-item-h);align-items:center}
#ppx-panel.ppx-v5 #ppx-v .ppx-b .ppx-label,#ppx-panel.ppx-v5 #ppx-v .ppx-chip .ppx-label{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.25}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-cta{background:var(--ppx-green-600)}
#ppx-panel.ppx-v5 #ppx-v .ppx-chip{background:var(--ppx-green-700)}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-secondary,#ppx-panel.ppx-v5 #ppx-v .ppx-chip.ppx-secondary{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.22);padding:8px 12px!important;font-size:15px!important;box-shadow:none}
#ppx-panel.ppx-v5 #ppx-v .ppx-b[data-ic]::before,#ppx-panel.ppx-v5 #ppx-v .ppx-chip[data-ic]::before{content:attr(data-ic);display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;min-width:26px;border-radius:999px;background:var(--ppx-gold);color:var(--ppx-gold-ink);font-size:15px;line-height:1;box-shadow:inset 0 0 0 2px rgba(0,0,0,.08),0 1px 0 rgba(255,255,255,.22) inset}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-selected,#ppx-panel.ppx-v5 #ppx-v .ppx-chip.ppx-selected{filter:brightness(1.10);box-shadow:0 0 0 2px rgba(230,196,138,.55) inset,0 2px 8px rgba(0,0,0,.26)}
#ppx-panel.ppx-v5 #ppx-v .ppx-input{display:flex;gap:8px;margin-top:8px}
#ppx-panel.ppx-v5 #ppx-v .ppx-input input,#ppx-panel.ppx-v5 #ppx-v .ppx-input select,#ppx-panel.ppx-v5 #ppx-v .ppx-input textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;font-size:15px;outline:none}
#ppx-panel.ppx-v5 #ppx-v .ppx-input textarea{min-height:96px;resize:vertical}
#ppx-panel.ppx-v5 #ppx-v .ppx-grid.ppx-slotgrid{grid-template-columns:repeat(3,minmax(0,1fr));max-height:280px;overflow:auto;padding-right:4px;grid-auto-rows:auto;}
#ppx-panel.ppx-v5 #ppx-v .ppx-grid.ppx-slotgrid .ppx-chip{height:auto;min-height:auto}
@media (max-width:520px){#ppx-panel.ppx-v5 #ppx-v .ppx-grid.ppx-slotgrid{grid-template-columns:repeat(2,minmax(0,1fr));max-height:260px}}
#ppx-panel.ppx-v5 #ppx-v [data-block=home] .ppx-row{justify-content:center!important}
#ppx-panel.ppx-v5 #ppx-v [data-block=home] .ppx-b,#ppx-panel.ppx-v5 #ppx-v [data-block=home] .ppx-chip{justify-content:center!important;text-align:center!important}
#ppx-panel.ppx-v5 #ppx-v .ppx-nav{display:flex;gap:10px;width:100%;margin-top:10px}
#ppx-panel.ppx-v5 #ppx-v .ppx-nav.ppx-bottom{justify-content:space-between!important}
#ppx-panel.ppx-v5 #ppx-v .ppx-b.ppx-back{width:auto!important;min-width:130px!important;flex:0 0 auto!important;font-size:14px!important;padding:8px 10px!important}
`;

  var tag = document.createElement('style');
  tag.id = id;
  tag.textContent = css;
  (document.head || document.documentElement).appendChild(tag);
})();
