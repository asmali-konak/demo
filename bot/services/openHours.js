/* ============================================================================
   PPX Service: Open Hours & Slots (openHours.js) – v8.5.0
   - I18N-aware (DE/EN)
   - parseSpanToText(span[, lang])
   - hoursFromOpen([lang])  // erzeugt aus cfg.OPEN schöne Zeilen (DE/EN)
   - normalizeHoursLines(v) // akzeptiert cfg.hoursLines (DE/EN), behält Format
   - hmToMin(), minToHM()
   - buildSlotsForDate(dateObj)  // 30-min Slots, heute mit 4h Lead
   - groupSlots(mins)            // 1–3 Gruppen
   - NEW: isOpenNow(), closeTimeToday(), describeToday()
   ============================================================================ */
(function () {
  'use strict';

  var W = window;
  var PPX = W.PPX = W.PPX || {};
  PPX.services = PPX.services || {};

  function cfg(){ try{ return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; }catch(e){ return {}; } }
  function nowLang(){ try{ return (PPX.i18n && PPX.i18n.nowLang && PPX.i18n.nowLang()) || PPX.lang || 'de'; }catch(e){ return (PPX && PPX.lang) || 'de'; }

  // ---- Helpers: HM <-> Min --------------------------------------------------
  function hmToMin(s){
    var a=String(s||'').trim().replace(/\s/g,''); var m=a.match(/^(\d{1,2}):(\d{2})$/);
    if(!m) return NaN; var h=+m[1], mi=+m[2]; if(h===24 && mi===0) return 1440; return h*60+mi;
  }
  function minToHM(n){ var h=Math.floor(n/60), m=n%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }

  // ---- Day-Names per Sprache ------------------------------------------------
  var DAYS_DE=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var DAYS_EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function dayName(idx, lang){ var L=lang||nowLang(); return (L==='en'?DAYS_EN:DAYS_DE)[idx]||''; }

  // ---- OPEN parsing ---------------------------------------------------------
  function parseSpan(span){
    var from,to;
    if(Array.isArray(span)){ from=span[0]; to=span[1]; }
    else if(span && typeof span==='object'){ from=span.from||span.start; to=span.to||span.end; }
    else if(typeof span==='string'){
      var m=span.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/); if(m){ from=m[1]; to=m[2]; }
    }
    return {from:from||'', to:to||''};
  }
  function parseSpanToText(span, lang){
    var L=lang||nowLang(); var p=parseSpan(span);
    if(!p.from||!p.to) return (L==='en')?'closed':'geschlossen';
    return (L==='en') ? (p.from+' – '+p.to) : (p.from+' – '+p.to+' Uhr');
  }

  // ---- Public: OPEN → table lines ------------------------------------------
  function hoursFromOpen(lang){
    var L=lang||nowLang(), out=[], O=(cfg().OPEN||{});
    for(var i=1;i<=6;i++){ out.push([dayName(i,L), parseSpanToText(O[String(i)], L)]); }
    out.push([dayName(0,L), parseSpanToText(O['0'], L)]);
    return out;
  }

  // ---- Public: cfg.hoursLines normalisieren --------------------------------
  function normalizeHoursLines(v){
    var out=[];
    if(Array.isArray(v)){
      v.forEach(function(it){
        if(Array.isArray(it) && it.length>=2){ out.push([String(it[0]), String(it[1])]); }
        else if(it && typeof it==='object'){
          var day=it.day||it.name||it.title||it[0]; var time=it.time||it.hours||it[1];
          if(day && time) out.push([String(day), String(time)]);
        }
      });
      return out;
    }
    if(v && typeof v==='object'){
      ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag',
       'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach(function(d){
        if(v[d]) out.push([d, String(v[d])]);
      });
    }
    return out;
  }

  // ---- Slots (30-min) -------------------------------------------------------
  function buildSlotsForDate(d){
    var C=cfg(); var O=C.OPEN||{}; var wd=d.getDay(); var span=O[String(wd)]||null;
    if(!span) return [];
    var p=parseSpan(span); if(!p.from||!p.to) return [];
    var openMin=hmToMin(p.from), closeMin=hmToMin(p.to);
    if(isNaN(openMin)||isNaN(closeMin)) return [];
    var lastStartExclusive=closeMin-60; if(lastStartExclusive<=openMin) return [];
    var slots=[]; for(var t=openMin; t<lastStartExclusive; t+=30){ slots.push(t); }
    // Heute: 4h Lead
    var now=new Date();
    var isToday= now.getFullYear()===d.getFullYear() && now.getMonth()===d.getMonth() && now.getDate()===d.getDate();
    if(isToday){ var lead=(now.getHours()*60+now.getMinutes())+240; slots=slots.filter(function(t){return t>=lead;}); }
    return slots;
  }

  // ---- Gruppenbildung -------------------------------------------------------
  function groupSlots(mins){
    if(!mins||!mins.length) return [];
    var start=mins[0], lastStart=mins[mins.length-1], endExclusive=lastStart+30;
    var L=endExclusive-start; if(L<=0) return [{from:start,to:endExclusive,slots:mins}];
    var G=(L<=180)?1:((L<=360)?2:3); if(G===1) return [{from:start,to:endExclusive,slots:mins}];
    var step=Math.max(60, Math.round((L/G)/30)*30), cuts=[];
    for(var i=1;i<G;i++){ cuts.push(start+step*i); }
    cuts=cuts.map(function(c){ var onHour=Math.round(c/60)*60; return (Math.abs(onHour-c)<=30)?onHour:Math.round(c/30)*30; })
             .filter(function(c){return c>start && c<endExclusive;})
             .sort(function(a,b){return a-b;});
    var bounds=[start].concat(cuts).concat([endExclusive]); var groups=[];
    for(var j=0;j<bounds.length-1;j++){
      var a=bounds[j], b=bounds[j+1], g=mins.filter(function(t){return t>=a&&t<b;});
      if(g.length>=2) groups.push({from:a,to:b,slots:g});
    }
    if(!groups.length) groups=[{from:start,to:endExclusive,slots:mins}];
    return groups;
  }

  // ---- NEW: Status & Formulierungen ----------------------------------------
  function isOpenNow(){
    var C=cfg(), O=C.OPEN||{}, now=new Date(), wd=now.getDay();
    var s=parseSpan(O[String(wd)]||null); if(!s.from||!s.to) return false;
    var m=now.getHours()*60+now.getMinutes(); var a=hmToMin(s.from), b=hmToMin(s.to);
    return (m>=a && m<b);
  }
  function closeTimeToday(){
    var C=cfg(), O=C.OPEN||{}, now=new Date(), wd=now.getDay();
    var s=parseSpan(O[String(wd)]||null); if(!s.from||!s.to) return '';
    return minToHM(hmToMin(s.to));
  }
  function describeToday(){
    var L=nowLang(), C=cfg(), O=C.OPEN||{}, now=new Date(), wd=now.getDay();
    var s=parseSpan(O[String(wd)]||null); if(!s.from||!s.to) return (L==='en')?'We’re closed today.':'Heute geschlossen.';
    var txt = (L==='en')
      ? ('Today: '+s.from+' – '+s.to)
      : ('Heute: '+s.from+' – '+s.to+' Uhr');
    return txt;
  }

  // ---- export ---------------------------------------------------------------
  PPX.services.openHours={
    parseSpanToText:parseSpanToText,
    hoursFromOpen:hoursFromOpen,
    normalizeHoursLines:normalizeHoursLines,
    hmToMin:hmToMin,
    minToHM:minToHM,
    buildSlotsForDate:buildSlotsForDate,
    groupSlots:groupSlots,
    // new
    isOpenNow:isOpenNow,
    closeTimeToday:closeTimeToday,
    describeToday:describeToday
  };
})();
