/* ============================================================================
   PPX Service: openHours.js – v8.7.1
   - Toleranter Parser für hoursLines / OPEN
   - Overnight-Support (00:xx → Folgetag)
   - describeToday(): „Heute: 12:00 – 23:00 Uhr“ / EN ohne „Uhr“
   ============================================================================ */
(function () {
  'use strict';
  var W = window, PPX = W.PPX = W.PPX || {};
  var S = PPX.services = PPX.services || {};

  function cfg(){ try{ return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; }catch(e){ return {}; } }
  function now(){ return new Date(); }

  function parseHM(s){
    var m = /^(\d{1,2}):(\d{2})/.exec(String(s||''));
    if(!m) return null;
    var h=parseInt(m[1],10), mi=parseInt(m[2],10);
    return (h*60)+mi;
  }

  function normalizeHoursLines(lines){
    var out=[];
    try{
      (lines||[]).forEach(function(r){
        if(Array.isArray(r) && r.length>=2 && r[1]){
          out.push([String(r[0]).trim(), String(r[1]).trim()]);
        }
      });
    }catch(e){}
    return out;
  }

  function todayIdx(){ return (new Date()).getDay(); } // 0=Sonntag
  function dayKey(d){ return String(d); }

  function todayWindow(){
    var C=cfg(), L=C.hoursLines, O=C.OPEN||{};
    if(Array.isArray(L) && L.length){ 
      var day=normalizeHoursLines(L)[todayIdx()];
      if(day){ var s=(day[1]||'').split(/–|-/); if(s.length===2) return [s[0].trim(), s[1].trim()]; }
    }
    var win=O[dayKey(todayIdx())]; if(Array.isArray(win)&&win.length===2) return win;
    return ['00:00','00:00'];
  }

  function isOpenNow(){
    try{
      var win=todayWindow();
      var nowM=now().getHours()*60+now().getMinutes();
      var s=parseHM(win[0])||0, e=parseHM(win[1])||0;
      if(e<=s) e+=1440; // overnight
      var cur=nowM; if(e>1440) cur+=1440; // falls über Mitternacht
      return cur>=s && cur<=e;
    }catch(e){ return false; }
  }

  function closeTimeToday(){
    try{
      var win=todayWindow(), e=parseHM(win[1])||0;
      var h=Math.floor(e/60)%24, m=('0'+(e%60)).slice(-2);
      return h+':'+m;
    }catch(e){ return ''; }
  }

  function describeToday(){
    try{
      var L=(PPX.i18n && PPX.i18n.nowLang && PPX.i18n.nowLang())||'de';
      var win=todayWindow();
      if(!win||!win[0]) return (L==='en'?'Closed today.':'Heute geschlossen.');
      var line=(L==='en')?('Today: '+win[0]+' – '+win[1]):('Heute: '+win[0]+' – '+win[1]+' Uhr');
      return line;
    }catch(e){ return ''; }
  }

  S.openHours={
    isOpenNow:isOpenNow,
    todayWindow:todayWindow,
    closeTimeToday:closeTimeToday,
    describeToday:describeToday
  };
})();
