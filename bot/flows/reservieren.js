/* ============================================================================
   PPX Flow: Reservieren (reservieren.js) – v8.4.2
   Minimal ergänzt um Flow-State:
   - Start: PPX.state.activeFlowId='reservieren'
   - Vor jedem Step: PPX.state.expecting='name'|'date'|'time'|'persons'|'phone'|'email'
   - Am Ende/Abbruch: Reset (activeFlowId=null, expecting=null)
============================================================================ */
(function () {
  'use strict';

  var W=window, D=document;
  var PPX=W.PPX=W.PPX||{};
  var UI=PPX.ui||{}, U=PPX.util||{}, DLY=PPX.D||{};
  var OH=(PPX.services&&PPX.services.openHours)||{};
  var Forms=(UI&&UI.forms)||{};
  var I=PPX.i18n||{};
  var RESV=null;

  function S(){ PPX.state=PPX.state||{activeFlowId:null,expecting:null}; return PPX.state; }

  // I18N
  try { I.reg && I.reg({
    'resv.title':{de:'RESERVIEREN',en:'RESERVE'},
    'resv.intro.1':{de:'Du möchtest gerne reservieren?',en:'You’d like to make a reservation?'},
    'resv.ask.name':{de:'Darf ich bitte deinen Namen wissen?',en:'May I have your name, please?'},
    'resv.ph.name':{de:'Vor- und Nachname',en:'First and last name'},
    'resv.next':{de:'Weiter',en:'Next'},
    'resv.err.name':{de:'Bitte gib einen gültigen Namen ein.',en:'Please enter a valid name.'},
    'resv.great':{de:'Perfekt, {name}! :)',en:'Perfect, {name}! :)'},
    'resv.ask.date':{de:'Für welches Datum möchtest du reservieren?',en:'For which date would you like to book?'},
    'resv.ph.date':{de:'TT.MM.JJJJ',en:'YYYY-MM-DD'},
    'resv.err.date':{de:'Bitte wähle ein Datum.',en:'Please choose a date.'},
    'resv.ask.time':{de:'Um welche Uhrzeit möchtest du reservieren?',en:'At what time would you like to reserve?'},
    'resv.no.slots':{de:'Für dieses Datum sind aktuell keine Reservierungszeiten verfügbar (geschlossen oder zu kurzfristig).',en:'No reservation times available for this date (closed or too short notice).'},
    'resv.ok.name':{de:'Super, {name}!',en:'Great, {name}!'},
    'resv.ask.persons':{de:'Für wie viele Personen darf ich den Tisch vorbereiten?',en:'For how many people should I prepare the table?'},
    'resv.err.persons':{de:'Bitte gib eine gültige Anzahl ein.',en:'Please enter a valid number of guests.'},
    'resv.ask.phone':{de:'Magst du mir deine Nummer dalassen? (optional)',en:'Would you like to leave your phone number? (optional)'},
    'resv.ph.phone':{de:'+49 …',en:'+44 …'},
    'resv.skip.phone':{de:'Ohne Telefon weiter',en:'Continue without phone'},
    'resv.ask.email.1':{de:'Und deine E-Mail für die Bestätigung?',en:'And your email for the confirmation?'},
    'resv.ask.email.2':{de:'Wir schicken dir dort eine kurze Eingangsbestätigung.',en:'We’ll send a brief confirmation there.'},
    'resv.ph.email':{de:'dein.name@example.com',en:'your.name@example.com'},
    'resv.send':{de:'Anfrage senden',en:'Send request'},
    'resv.err.email':{de:'Bitte gib eine gültige E-Mail-Adresse ein.',en:'Please enter a valid email address.'},
    'resv.sending':{de:'SENDE ANFRAGE …',en:'SENDING REQUEST …'},
    'resv.success.title':{de:'RESERVIERUNG',en:'RESERVATION'},
    'resv.success.body':{de:'Danke für deine Anfrage! Schau bitte in dein E-Mail-Postfach – wir melden uns kurz zurück.',en:'Thanks for your request! Please check your inbox—we’ll get back to you shortly.'},
    'resv.error.title':{de:'SENDEN FEHLGESCHLAGEN',en:'SENDING FAILED'},
    'resv.error.why':{de:'Uff, das hat gerade nicht geklappt. Grund (technisch): {msg}',en:'Oops, that didn’t work. Technical reason: {msg}'},
    'resv.error.try':{de:'Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.',en:'You can try again or open your email app manually.'},
    'resv.retry':{de:'Nochmal senden',en:'Send again'},
    'resv.mailto':{de:'E-Mail manuell öffnen',en:'Open email app'},
    'nav.home':{de:'Zurück ins Hauptmenü',en:'Back to Main Menu'}
  }); } catch(e){}

  function t(k,fb){ try { return (I&&I.t)?I.t(k,fb):(fb||k); } catch(e){ return fb||k; } }
  function L(){ try { return (I&&I.nowLang&&I.nowLang())||PPX.lang||'de'; } catch(e){ return 'de'; } }

  function EM(){ return (W.PPX&&W.PPX.services&&W.PPX.services.email)||null; }
  function CFG(){ try { return (PPX.data&&PPX.data.cfg&&PPX.data.cfg())||{}; } catch(e){ return {}; } }
  function todayISO(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function parseDateAny(s){
    if(!s) return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
    var m=s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    return m?new Date(+m[3],+m[2]-1,+m[1]):null;
  }
  function fmtDateReadable(d){
    var de=['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()];
    var en=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    var pre=(L()==='en'?en:de);
    return (L()==='en' ? (pre+', '+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.')
                       : (pre+', '+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'));
  }
  function toEmailFallback(){ var c=CFG(); return c.email||(c.EMAIL&&(c.EMAIL.to||c.EMAIL.toEmail))||''; }

  // --- Flow ------------------------------------------------------------------
  function stepReservieren(){
    // Flow-Start: aktiv + erwartetes Feld
    S().activeFlowId='reservieren'; S().expecting='name';

    RESV={ name:'', dateISO:'', dateReadable:'', time:'', persons:'', phone:'', email:'' };
    var B=UI.block(t('resv.title','RESERVIEREN'),{maxWidth:'100%'}); B.setAttribute('data-block','resv-name');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.intro.1','Du möchtest gerne reservieren?'))); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.line(t('resv.ask.name','Darf ich bitte deinen Namen wissen?')));
      S().expecting='name';
      var rIn=Forms.inputRow({type:'text',placeholder:t('resv.ph.name','Vor- und Nachname')}); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn(t('resv.next','Weiter'),function(){
        var v=Forms.val(rIn.input); if(v.length<2){ alert(t('resv.err.name','Bitte gib einen gültigen Namen ein.')); Forms.focus(rIn.input); return; }
        RESV.name=v; U.delay(renderResvDate, DLY.step||450);
      },'ppx-cta','➡️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function renderResvDate(){
    S().expecting='date';
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-date');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.great','Perfekt, {name}! :)').replace('{name}',RESV.name))); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.line(t('resv.ask.date','Für welches Datum möchtest du reservieren?')));
      var rIn=Forms.inputRow({type:'date',min:todayISO(),placeholder:t('resv.ph.date','TT.MM.JJJJ')}); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn(t('resv.next','Weiter'),function(){
        var val=Forms.val(rIn.input), d=val?parseDateAny(val):null;
        if(!d){ alert(t('resv.err.date','Bitte wähle ein Datum.')); Forms.focus(rIn.input); return; }
        RESV.dateISO=d.toISOString().slice(0,10); RESV.dateReadable=fmtDateReadable(d);
        U.delay(function(){ renderResvTime(d); }, DLY.step||450);
      },'ppx-cta','🗓️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function renderResvTime(dateObj){
    S().expecting='time';
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-time');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.ask.time','Um welche Uhrzeit möchtest du reservieren?'))); try{UI.keepBottom();}catch(e){}
    var minutes=OH.buildSlotsForDate?OH.buildSlotsForDate(dateObj):[];
    if(!minutes.length){ C.appendChild(UI.line(t('resv.no.slots','Für dieses Datum sind aktuell keine Reservierungszeiten verfügbar (geschlossen oder zu kurzfristig).'))); try{UI.keepBottom();}catch(e){}; return; }
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
    S().expecting='persons';
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-persons');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.ok.name','Super, {name}!').replace('{name}',RESV.name))); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.line(t('resv.ask.persons','Für wie viele Personen darf ich den Tisch vorbereiten?')));
      var rIn=Forms.inputRow({type:'number',min:'1',max:'20',value:'2'}); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn(t('resv.next','Weiter'),function(){
        var val=Number(Forms.val(rIn.input)||0);
        if(!val||val<1){ alert(t('resv.err.persons','Bitte gib eine gültige Anzahl ein.')); Forms.focus(rIn.input); return; }
        RESV.persons=String(val); U.delay(renderResvPhone, DLY.step||450);
      },'ppx-cta','➡️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function renderResvPhone(){
    S().expecting='phone';
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-phone');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.ask.phone','Magst du mir deine Nummer dalassen? (optional)')));
    var rIn=Forms.inputRow({type:'tel',placeholder:t('resv.ph.phone','+49 …')}); C.appendChild(rIn.row);
    var r=UI.row();
    r.appendChild(UI.btn(t('resv.next','Weiter'),function(){ RESV.phone=Forms.val(rIn.input); U.delay(renderResvEmail, DLY.step||450); },'ppx-cta','➡️'));
    r.appendChild(UI.btn(t('resv.skip.phone','Ohne Telefon weiter'),function(){ RESV.phone=''; U.delay(renderResvEmail, DLY.step||450); },'ppx-secondary','⏭️'));
    C.appendChild(r); try{UI.keepBottom();}catch(e){}
  }

  function renderResvEmail(){
    S().expecting='email';
    var B=UI.block(null,{maxWidth:'100%'}); B.setAttribute('data-block','resv-email');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.ask.email.1','Und deine E-Mail für die Bestätigung?'))); try{UI.keepBottom();}catch(e){}
    U.delay(function(){
      C.appendChild(UI.line(t('resv.ask.email.2','Wir schicken dir dort eine kurze Eingangsbestätigung.')));
      var rIn=Forms.inputRow({type:'email',placeholder:t('resv.ph.email','dein.name@example.com')}); C.appendChild(rIn.row);
      var r=UI.row();
      r.appendChild(UI.btn(t('resv.send','Anfrage senden'),function(){
        var v=Forms.val(rIn.input);
        if(!(Forms.isValidEmail?Forms.isValidEmail(v):/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))){
          alert(t('resv.err.email','Bitte gib eine gültige E-Mail-Adresse ein.')); Forms.focus(rIn.input); return;
        }
        RESV.email=v; U.delay(submitReservation, DLY.tap||240);
      },'ppx-cta','✉️'));
      C.appendChild(r); try{UI.keepBottom();}catch(e){}
    }, DLY.long||900);
  }

  function submitReservation(){
    // Während des Sendens kein Slot erwartet
    S().expecting=null;

    var cfg=CFG(), brand=(cfg.brand||'Restaurant');
    var payload={
      brand:brand,name:RESV.name,
      date:RESV.dateReadable,date_iso:RESV.dateISO,
      time:RESV.time,persons:RESV.persons,
      phone:RESV.phone||'',
      from_email:RESV.email,reply_to:RESV.email,
      from_name:RESV.name||(RESV.email||'').split('@')[0]||'Gast',
      email:RESV.email,message:''
    };
    var toFallback=toEmailFallback(); if(toFallback) payload.to_email=toFallback;

    var svc=EM();
    var B=UI.block(t('resv.sending','SENDE ANFRAGE …'),{maxWidth:'100%'}); B.setAttribute('data-block','resv-sending');

    if(svc && svc.sendReservation){
      svc.sendReservation(payload)
        .then(function(){
          try{
            var hasAuto=(W.PPX_DATA&&((W.PPX_DATA.EMAIL&&W.PPX_DATA.EMAIL.autoReplyTemplate)||(W.PPX_DATA.cfg&&W.PPX_DATA.cfg.EMAIL&&W.PPX_DATA.cfg.EMAIL.autoReplyTemplate)));
            if(hasAuto && svc.autoReply){
              var subj=(L()==='en')?'We received your reservation request!':'Wir haben deine Reservierungsanfrage erhalten!';
              return svc.autoReply(RESV.email,{name:RESV.name,date:RESV.dateReadable,time:RESV.time,persons:RESV.persons,subject:subj});
            }
          }catch(e){}
        })
        .then(function(){ showReservationSuccess(); })
        .catch(function(e){
          var msg=e&&(e.text||e.message)||'Unbekannter Fehler';
          showReservationError(msg, payload);
        });
      return;
    }
    showReservationError('Email-Service nicht geladen', payload);
  }

  function mailtoHrefReservation(p){
    var c=CFG(); var addr=c.email||(c.EMAIL&&(c.EMAIL.to||c.EMAIL.toEmail))||'info@example.com';
    var bodyLines=(L()==='en'
      ? ['Reservation request','Name: '+p.name,'Date: '+p.date,'Time: '+p.time,'Guests: '+p.persons,'Phone: '+(p.phone||'-'),'Email: '+(p.from_email||p.email||'-'),'— sent via bot']
      : ['Reservierungsanfrage','Name: '+p.name,'Datum: '+p.date,'Uhrzeit: '+p.time,'Personen: '+p.persons,'Telefon: '+(p.phone||'-'),'E-Mail: '+(p.from_email||p.email||'-'),'— gesendet via Bot']);
    var subj=(L()==='en')?'Reservation':'Reservierung';
    return 'mailto:'+addr+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(bodyLines.join('\n'));
  }

  function showReservationSuccess(){
    // Flow-Ende: Reset
    S().activeFlowId=null; S().expecting=null;

    var B=UI.block(t('resv.success.title','RESERVIERUNG'),{maxWidth:'100%'}); B.setAttribute('data-block','reservieren-success');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.success.body','Danke für deine Anfrage! Schau bitte in dein E-Mail-Postfach – wir melden uns kurz zurück.')));
    var r=UI.row(); r.appendChild(UI.btn(t('nav.home','Zurück ins Hauptmenü'),function(){ try{UI.goHome();}catch(e){} },'ppx-secondary','🏠'));
    C.appendChild(r); try{UI.keepBottom();}catch(e){}
  }

  function showReservationError(msg,payload){
    // Flow bleibt aktiv – User kann neu senden oder abbrechen; Erwartung ist wieder E-Mail.
    S().expecting='email';

    var B=UI.block(t('resv.error.title','SENDEN FEHLGESCHLAGEN'),{maxWidth:'100%'}); B.setAttribute('data-block','resv-error');
    var C=D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    C.appendChild(UI.line(t('resv.error.why','Uff, das hat gerade nicht geklappt. Grund (technisch): {msg}').replace('{msg}',String(msg||'unbekannt'))));
    C.appendChild(UI.line(t('resv.error.try','Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.')));
    var r=UI.row();
    r.appendChild(UI.btn(t('resv.retry','Nochmal senden'),function(){ try{U.delay(submitReservation, DLY.tap||240);}catch(e){} },'ppx-cta','⤴️'));
    r.appendChild(UI.btn(t('resv.mailto','E-Mail manuell öffnen'),function(){ try{window.location.href=mailtoHrefReservation(payload);}catch(e){} },'ppx-secondary','✉️'));
    r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn(t('nav.home','Zurück ins Hauptmenü'),function(){
      // Home = Flow-Abbruch → Reset
      S().activeFlowId=null; S().expecting=null;
      try{UI.goHome();}catch(e){}
    },'ppx-secondary','🏠'));
    C.appendChild(r); try{UI.keepBottom();}catch(e){}
  }

  PPX.flows=PPX.flows||{};
  PPX.flows.stepReservieren=stepReservieren;
})();
