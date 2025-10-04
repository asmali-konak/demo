/* ============================================================================
   PPX Flow: Reservieren – nutzt PPX.services.email.sendReservation(...)
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};
  var UI = PPX.ui || {}, U = PPX.util || {}, DLY = PPX.D || {};
  var OH = (PPX.services && PPX.services.openHours) || {};
  var Forms = (UI && UI.forms) || {};

  function EM(){ return (W.PPX && W.PPX.services && W.PPX.services.email) || null; }
  function CFG(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }

  var RESV = null;

  function todayISO(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function parseDateAny(s){ if(!s)return null; if(/^\d{4}-\d{2}-\d{2}$/.test(s)){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);} var m=s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/); return m?new Date(+m[3],+m[2]-1,+m[1]):null; }
  function fmtDateReadable(d){ var wd=['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()]; return wd+', '+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'; }
  function toEmailFallback(){ var c=CFG(); return c.email || (c.EMAIL && (c.EMAIL.to || c.EMAIL.toEmail)) || ''; }

  function stepReservieren(){
    RESV = { name:'', dateISO:'', dateReadable:'', time:'', persons:'', phone:'', email:'' };
    var B = UI.block('RESERVIEREN', { maxWidth:'100%' }); B.setAttribute('data-block','resv-name');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note('Du möchtest gerne reservieren?')); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.note('Darf ich bitte deinen Namen wissen?'));
      var rIn=Forms.inputRow({ type:'text', placeholder:'Vor- und Nachname' }); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn('Weiter', function(){
        var v=Forms.val(rIn.input); if(v.length<2){ alert('Bitte gib einen gültigen Namen ein.'); Forms.focus(rIn.input); return; }
        RESV.name=v; U.delay(renderResvDate, DLY.step||450);
      }, 'ppx-cta', '➡️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function renderResvDate(){
    var B = UI.block(null, { maxWidth:'100%' }); B.setAttribute('data-block','resv-date');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note('Perfekt, '+RESV.name+'! :)')); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.note('Für welches Datum möchtest du reservieren?'));
      var rIn=Forms.inputRow({ type:'date', min:todayISO(), placeholder:'TT.MM.JJJJ' }); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn('Weiter', function(){
        var val=Forms.val(rIn.input), d=val?parseDateAny(val):null;
        if(!d){ alert('Bitte wähle ein Datum.'); Forms.focus(rIn.input); return; }
        RESV.dateISO=d.toISOString().slice(0,10); RESV.dateReadable=fmtDateReadable(d);
        U.delay(function(){ renderResvTime(d); }, DLY.step||450);
      }, 'ppx-cta', '🗓️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function renderResvTime(dateObj){
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-time');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note('Um welche Uhrzeit möchtest du reservieren?')); try{UI.keepBottom();}catch(e){}
    var minutes=OH.buildSlotsForDate?OH.buildSlotsForDate(dateObj):[];
    if(!minutes.length){ C.appendChild(UI.line('Für dieses Datum sind aktuell keine Reservierungszeiten verfügbar (geschlossen oder zu kurzfristig).')); try{UI.keepBottom();}catch(e){}; return; }
    var groups=OH.groupSlots?OH.groupSlots(minutes):[{from:minutes[0],to:minutes[minutes.length-1]+30,slots:minutes}];
    if(groups.length===1){
      var only=groups[0]; C.appendChild(UI.line((OH.minToHM?OH.minToHM(only.from):only.from)+' – '+(OH.minToHM?OH.minToHM(only.to):only.to)));
      var G=UI.grid(); G.classList.add('ppx-slotgrid');
      U.delay(function(){ only.slots.forEach(function(t){ var hm=OH.minToHM?OH.minToHM(t):String(t);
        G.appendChild(UI.chip(hm,function(){ RESV.time=hm; U.delay(renderResvPersons,DLY.step||450); },'', '🕒')); });
        C.appendChild(G); try{UI.keepBottom();}catch(e){} }, DLY.sub||500);
      return;
    }
    var slotWrap=D.createElement('div'); slotWrap.className='ppx-slotwrap';
    groups.forEach(function(g){
      var label=(OH.minToHM?OH.minToHM(g.from):g.from)+' – '+(OH.minToHM?OH.minToHM(g.to):g.to);
      var r=UI.row(); r.classList.add('ppx-grouprow');
      r.appendChild(UI.chip(label,function(){
        slotWrap.innerHTML=''; U.delay(function(){
          var G=UI.grid(); G.classList.add('ppx-slotgrid');
          g.slots.forEach(function(t){ var hm=OH.minToHM?OH.minToHM(t):String(t);
            G.appendChild(UI.chip(hm,function(){ RESV.time=hm; U.delay(renderResvPersons,DLY.step||450); },'', '🕒')); });
          slotWrap.appendChild(G); try{UI.keepBottom();}catch(e){} }, DLY.tap||240);
      },'ppx-group'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    });
    U.delay(function(){ C.appendChild(slotWrap); try{UI.keepBottom();}catch(e){} }, DLY.sub||500);
  }

  function renderResvPersons(){
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-persons');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note('Super, '+RESV.name+'!')); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.note('Für wie viele Personen darf ich den Tisch vorbereiten?'));
      var rIn=Forms.inputRow({ type:'number', min:'1', max:'20', value:'2' }); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn('Weiter', function(){
        var val=Number(Forms.val(rIn.input)||0);
        if(!val||val<1){ alert('Bitte gib eine gültige Anzahl ein.'); Forms.focus(rIn.input); return; }
        RESV.persons=String(val); U.delay(renderResvPhone, DLY.step||450);
      }, 'ppx-cta', '➡️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function renderResvPhone(){
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-phone');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note('Magst du mir deine Nummer dalassen? (optional)'));
    var rIn=Forms.inputRow({ type:'tel', placeholder:'+49 …' }); C.appendChild(rIn.row);
    var r=UI.row();
    r.appendChild(UI.btn('Weiter', function(){ RESV.phone=Forms.val(rIn.input); U.delay(renderResvEmail, DLY.step||450); }, 'ppx-cta', '➡️'));
    r.appendChild(UI.btn('Ohne Telefon weiter', function(){ RESV.phone=''; U.delay(renderResvEmail, DLY.step||450); }, 'ppx-secondary', '⏭️'));
    C.appendChild(r); try{UI.keepBottom();}catch(e){}
  }

  function renderResvEmail(){
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-email');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.note('Und deine E-Mail für die Bestätigung?')); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.note('Wir schicken dir dort eine kurze Eingangsbestätigung.'));
      var rIn=Forms.inputRow({ type:'email', placeholder:'dein.name@example.com' }); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn('Anfrage senden', function(){
        var v=Forms.val(rIn.input);
        if(!(Forms.isValidEmail?Forms.isValidEmail(v):/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))){
          alert('Bitte gib eine gültige E-Mail-Adresse ein.'); Forms.focus(rIn.input); return;
        }
        RESV.email=v; U.delay(submitReservation, DLY.tap||240);
      }, 'ppx-cta', '✉️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function submitReservation(){
    var cfg=CFG(), brand=(cfg.brand||'Restaurant');
    var payload={
      brand:      brand,
      name:       RESV.name,
      date:       RESV.dateReadable,
      date_iso:   RESV.dateISO,
      time:       RESV.time,
      persons:    RESV.persons,
      phone:      RESV.phone||'',
      from_email: RESV.email,
      reply_to:   RESV.email,
      from_name:  RESV.name || (RESV.email||'').split('@')[0] || 'Gast',
      email:      RESV.email,   // <- Dein Template nutzt {{email}} (To Email)
      message:    ''
    };
    var toFallback=toEmailFallback(); if(toFallback) payload.to_email=toFallback;

    var svc=EM();
    var B=UI.block('SENDE ANFRAGE …',{maxWidth:'100%'}); B.setAttribute('data-block','resv-sending');

    if(svc && svc.sendReservation){
      svc.sendReservation(payload)
        .then(function(){
          try{
            var hasAuto = (W.PPX_DATA && ((W.PPX_DATA.EMAIL && W.PPX_DATA.EMAIL.autoReplyTemplate) || (W.PPX_DATA.cfg && W.PPX_DATA.cfg.EMAIL && W.PPX_DATA.cfg.EMAIL.autoReplyTemplate)));
            if(hasAuto && svc.autoReply){ return svc.autoReply(RESV.email, { name:RESV.name, date:RESV.dateReadable, time:RESV.time, persons:RESV.persons, subject:'Wir haben deine Reservierungsanfrage erhalten!' }); }
          }catch(e){}
        })
        .then(function(){ showReservationSuccess(); })
        .catch(function(e){
          console.warn('[PPX] reservation send failed:', e && (e.text||e.message)||e);
          showReservationError(e && (e.text||e.message)||'Unbekannter Fehler', payload);
        });
      return;
    }
    showReservationError('Email-Service nicht geladen', payload);
  }

  function mailtoHrefReservation(p){
    var c=CFG(); var addr=c.email || (c.EMAIL && (c.EMAIL.to || c.EMAIL.toEmail)) || 'info@example.com';
    var bodyLines=['Reservierungsanfrage','Name: '+p.name,'Datum: '+p.date,'Uhrzeit: '+p.time,'Personen: '+p.persons,'Telefon: '+(p.phone||'-'),'E-Mail: '+(p.from_email||p.email||'-'),'— gesendet via Bot'];
    return 'mailto:'+addr+'?subject='+encodeURIComponent('Reservierung')+'&body='+encodeURIComponent(bodyLines.join('\n'));
  }

  function showReservationSuccess(){
    var B=UI.block('RESERVIERUNG',{maxWidth:'100%'}); B.setAttribute('data-block','reservieren-success');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line('Danke für deine Anfrage! Schau bitte in dein E-Mail-Postfach – wir melden uns kurz zurück.'));
    var r=UI.row(); r.appendChild(UI.btn('Zurück ins Hauptmenü', function(){ try{UI.goHome();}catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r); try{UI.keepBottom();}catch(e){}
  }

  function showReservationError(msg, payload){
    var B=UI.block('SENDEN FEHLGESCHLAGEN',{maxWidth:'100%'}); B.setAttribute('data-block','resv-error');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line('Uff, das hat gerade nicht geklappt. Grund (technisch): '+(msg||'unbekannt')));
    C.appendChild(UI.line('Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.'));
    var r=UI.row();
    r.appendChild(UI.btn('Nochmal senden', function(){ try{U.delay(submitReservation, DLY.tap||240);}catch(e){} }, 'ppx-cta', '⤴️'));
    r.appendChild(UI.btn('E-Mail manuell öffnen', function(){ try{window.location.href = mailtoHrefReservation(payload);}catch(e){} }, 'ppx-secondary', '✉️'));
    r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn('Zurück ins Hauptmenü', function(){ try{UI.goHome();}catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r); try{UI.keepBottom();}catch(e){}
  }

  PPX.flows = PPX.flows || {};
  PPX.flows.stepReservieren = stepReservieren;
})();
