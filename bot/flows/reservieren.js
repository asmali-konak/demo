/* ============================================================================
   PPX Flow: Reservieren (reservieren.js) – v7.9.4
   ============================================================================ */
(function () {
  'use strict';

  var W = window, D = document;
  var PPX = W.PPX = W.PPX || {};

  var UI = PPX.ui || {};
  var U  = PPX.util || {};
  var DLY = PPX.D || {};
  var OH = (PPX.services && PPX.services.openHours) || {};
  var EM = (PPX.services && PPX.services.email) || {};
  var Forms = (UI && UI.forms) || {};

  var RESV = null;

  // --- helpers ---------------------------------------------------------------
  function cfg(){ try { return (PPX.data && PPX.data.cfg && PPX.data.cfg()) || {}; } catch(e){ return {}; } }
  function todayISO(){
    var d = new Date();
    var m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return d.getFullYear()+'-'+m+'-'+day;
  }
  function parseDateAny(s){
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)){ var p=s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
    var m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if (m){ return new Date(+m[3], +m[2]-1, +m[1]); }
    return null;
  }
  function fmtDateReadable(d){
    var wd = ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()];
    var dd = String(d.getDate()).padStart(2,'0'), mm = String(d.getMonth()+1).padStart(2,'0');
    return wd+', '+dd+'.'+mm+'.';
  }

  // --- flow: start -----------------------------------------------------------
  function stepReservieren(){
    RESV = { name:'', dateISO:'', dateReadable:'', time:'', persons:'', phone:'', email:'' };

    var B = UI.block('RESERVIEREN', { maxWidth:'100%' });
    B.setAttribute('data-block','resv-name');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    var backScopeIdx = (UI.getScopeIndex ? UI.getScopeIndex() : 1) - 1;

    C.appendChild(UI.note('Du möchtest gerne reservieren?'));
    try { UI.keepBottom(); } catch(e){}

    U.delay(function(){
      C.appendChild(UI.note('Darf ich bitte deinen Namen wissen?'));
      var rIn = Forms.inputRow({ type:'text', placeholder:'Vor- und Nachname' });
      C.appendChild(rIn.row);

      var r = UI.row();
      r.appendChild(UI.btn('Weiter', function(){
        var v = Forms.val(rIn.input);
        if (v.length < 2) { alert('Bitte gib einen gültigen Namen ein.'); Forms.focus(rIn.input); return; }
        RESV.name = v;
        U.delay(renderResvDate, DLY.step || 450);
      }, 'ppx-cta', '➡️'));
      C.appendChild(r);

      B.appendChild(UI.navBottom ? UI.navBottom(backScopeIdx) : D.createTextNode(''));
      try { UI.keepBottom(); } catch(e){}
    }, DLY.long || 1000);
  }

  // --- date ------------------------------------------------------------------
  function renderResvDate(){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','resv-date');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);

    C.appendChild(UI.note('Perfekt, '+RESV.name+'! :)'));
    try { UI.keepBottom(); } catch(e){}

    U.delay(function(){
      C.appendChild(UI.note('Für welches Datum möchtest du reservieren?'));
      var rIn = Forms.inputRow({ type:'date', min: todayISO(), placeholder:'TT.MM.JJJJ' });
      C.appendChild(rIn.row);

      var r = UI.row();
      r.appendChild(UI.btn('Weiter', function(){
        var val = Forms.val(rIn.input);
        var d = val ? parseDateAny(val) : null;
        if (!d){ alert('Bitte wähle ein Datum.'); Forms.focus(rIn.input); return; }
        RESV.dateISO = d.toISOString().slice(0,10);
        RESV.dateReadable = fmtDateReadable(d);
        U.delay(function(){ renderResvTime(d, (UI.getScopeIndex?UI.getScopeIndex():1)-1); }, DLY.step || 450);
      }, 'ppx-cta', '🗓️'));
      C.appendChild(r);

      B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));
      try { UI.keepBottom(); } catch(e){}
    }, DLY.long || 1000);
  }

  // --- time ------------------------------------------------------------------
  function renderResvTime(dateObj, backScopeIdx){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','resv-time');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(backScopeIdx) : D.createTextNode(''));
    C.appendChild(UI.note('Um welche Uhrzeit möchtest du reservieren?'));
    try { UI.keepBottom(); } catch(e){}

    var minutes = OH.buildSlotsForDate ? OH.buildSlotsForDate(dateObj) : [];
    if (!minutes.length){
      C.appendChild(UI.line('Für dieses Datum sind aktuell keine Reservierungszeiten verfügbar (geschlossen oder zu kurzfristig).'));
      try { UI.keepBottom(); } catch(e){}
      return;
    }

    var groups = OH.groupSlots ? OH.groupSlots(minutes) : [{ from:minutes[0], to:minutes[minutes.length-1]+30, slots:minutes }];

    if (groups.length === 1){
      var only = groups[0];
      C.appendChild(UI.line((OH.minToHM?OH.minToHM(only.from):only.from) + ' – ' + (OH.minToHM?OH.minToHM(only.to):only.to)));
      var G = UI.grid(); G.classList.add('ppx-slotgrid');
      U.delay(function(){
        only.slots.forEach(function(t){
          var hm = OH.minToHM ? OH.minToHM(t) : String(t);
          G.appendChild(UI.chip(hm, function(){ RESV.time = hm; U.delay(renderResvPersons, DLY.step || 450); }, '', '🕒'));
        });
        C.appendChild(G);
        try { UI.keepBottom(); } catch(e){}
      }, DLY.sub || 550);
      return;
    }

    var slotWrap = D.createElement('div');
    slotWrap.className = 'ppx-slotwrap';

    groups.forEach(function(g){
      var label = (OH.minToHM?OH.minToHM(g.from):g.from) + ' – ' + (OH.minToHM?OH.minToHM(g.to):g.to);
      var r = UI.row(); r.classList.add('ppx-grouprow');
      r.appendChild(UI.chip(label, function(){
        slotWrap.innerHTML = '';
        U.delay(function(){
          var G = UI.grid(); G.classList.add('ppx-slotgrid');
          g.slots.forEach(function(t){
            var hm = OH.minToHM ? OH.minToHM(t) : String(t);
            G.appendChild(UI.chip(hm, function(){ RESV.time = hm; U.delay(renderResvPersons, DLY.step || 450); }, '', '🕒'));
          });
          slotWrap.appendChild(G);
          try { UI.keepBottom(); } catch(e){}
        }, DLY.tap || 260);
      }, 'ppx-group'));
      C.appendChild(r);
      try { UI.keepBottom(); } catch(e){}
    });

    U.delay(function(){ C.appendChild(slotWrap); try { UI.keepBottom(); } catch(e){} }, DLY.sub || 550);
  }

  // --- persons ---------------------------------------------------------------
  function renderResvPersons(){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','resv-persons');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);

    C.appendChild(UI.note('Super, '+RESV.name+'!'));
    try { UI.keepBottom(); } catch(e){}

    U.delay(function(){
      C.appendChild(UI.note('Für wie viele Personen darf ich den Tisch vorbereiten?'));
      var rIn = Forms.inputRow({ type:'number', min:'1', max:'20', value:'2' });
      C.appendChild(rIn.row);

      var r = UI.row();
      r.appendChild(UI.btn('Weiter', function(){
        var val = Number(Forms.val(rIn.input) || 0);
        if (!val || val < 1){ alert('Bitte gib eine gültige Anzahl ein.'); Forms.focus(rIn.input); return; }
        RESV.persons = String(val);
        U.delay(function(){ renderResvPhone((UI.getScopeIndex?UI.getScopeIndex():1)-1); }, DLY.step || 450);
      }, 'ppx-cta', '➡️'));
      C.appendChild(r);

      B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));
      try { UI.keepBottom(); } catch(e){}
    }, DLY.long || 1000);
  }

  // --- phone (optional) ------------------------------------------------------
  function renderResvPhone(backScopeIdx){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','resv-phone');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);
    B.appendChild(UI.navBottom ? UI.navBottom(backScopeIdx) : D.createTextNode(''));

    C.appendChild(UI.note('Magst du mir deine Nummer dalassen? (optional)'));
    var rIn = Forms.inputRow({ type:'tel', placeholder:'+49 …' });
    C.appendChild(rIn.row);

    var r = UI.row();
    r.appendChild(UI.btn('Weiter', function(){
      RESV.phone = Forms.val(rIn.input);
      U.delay(renderResvEmail, DLY.step || 450);
    }, 'ppx-cta', '➡️'));
    r.appendChild(UI.btn('Ohne Telefon weiter', function(){
      RESV.phone = '';
      U.delay(renderResvEmail, DLY.step || 450);
    }, 'ppx-secondary', '⏭️'));
    C.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  // --- email (required) ------------------------------------------------------
  function renderResvEmail(){
    var B = UI.block(null, { maxWidth:'100%' });
    B.setAttribute('data-block','resv-email');

    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);

    C.appendChild(UI.note('Und deine E-Mail für die Bestätigung?'));
    try { UI.keepBottom(); } catch(e){}

    U.delay(function(){
      C.appendChild(UI.note('Wir schicken dir dort eine kurze Eingangsbestätigung.'));
      var rIn = Forms.inputRow({ type:'email', placeholder:'dein.name@example.com' });
      C.appendChild(rIn.row);

      var r = UI.row();
      r.appendChild(UI.btn('Anfrage senden', function(){
        var v = Forms.val(rIn.input);
        if (!(Forms.isValidEmail ? Forms.isValidEmail(v) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))){
          alert('Bitte gib eine gültige E-Mail-Adresse ein.'); Forms.focus(rIn.input); return;
        }
        RESV.email = v;
        U.delay(submitReservation, DLY.tap || 260);
      }, 'ppx-cta', '✉️'));
      C.appendChild(r);

      B.appendChild(UI.navBottom ? UI.navBottom((UI.getScopeIndex?UI.getScopeIndex():1)-1) : D.createTextNode(''));
      try { UI.keepBottom(); } catch(e){}
    }, DLY.long || 1000);
  }

  // --- submit ---------------------------------------------------------------
  function submitReservation(){
    var Cfg = cfg();
    var brand = (Cfg.brand || 'Restaurant');
    var payload = {
      brand: brand,
      name: RESV.name,
      date: RESV.dateReadable,
      time: RESV.time,
      persons: RESV.persons,
      phone: RESV.phone || '',
      email: RESV.email,
      message: ''
    };
    var svcId   = Cfg.EMAIL && (Cfg.EMAIL.service || Cfg.EMAIL.serviceId);
    var tplTo   = Cfg.EMAIL && (Cfg.EMAIL.toTemplate || Cfg.EMAIL.templateId);
    var tplAuto = Cfg.EMAIL && Cfg.EMAIL.autoReplyTemplate;

    var B = UI.block('SENDE ANFRAGE …', { maxWidth:'100%' });
    B.setAttribute('data-block','resv-sending');

    if (svcId && tplTo && EM.ensureEmailJSReady && EM.ensureEmailJSReady()){
      EM.sendEmailJS(svcId, tplTo, payload).then(function(){
        if (tplAuto){ return EM.sendEmailJS(svcId, tplAuto, payload).catch(function(e){ console.warn('[PPX] auto-reply failed:', e && e.message); }); }
      }).then(function(){ showReservationSuccess('emailjs'); })
        .catch(function(err){ console.warn('[PPX] reservation send failed:', err && err.message); showReservationError(err && err.message, payload); });
      return;
    }
    showReservationError('EmailJS nicht verfügbar', payload);
  }

  function mailtoHrefReservation(p){
    var Cfg = cfg();
    var addr = Cfg.email || (Cfg.EMAIL && (Cfg.EMAIL.to || Cfg.EMAIL.toEmail)) || 'info@example.com';
    var bodyLines = [
      'Reservierungsanfrage',
      'Name: '+p.name,
      'Datum: '+p.date,
      'Uhrzeit: '+p.time,
      'Personen: '+p.persons,
      'Telefon: '+(p.phone||'-'),
      'E-Mail: '+p.email,
      '— gesendet via Bot'
    ];
    var body = encodeURIComponent(bodyLines.join('\n'));
    return 'mailto:'+addr+'?subject='+encodeURIComponent('Reservierung')+'&body='+body;
  }

  function showReservationSuccess(kind){
    var B = UI.block('RESERVIERUNG', { maxWidth:'100%' });
    B.setAttribute('data-block','reservieren-success');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);

    C.appendChild(UI.line('Danke für deine Anfrage! Schau doch mal in deinem E-Mail-Postfach vorbei! ;)'));
    C.appendChild(UI.line('Möchtest du noch etwas anderes wissen?'));
    var r = UI.row();
    r.appendChild(UI.btn('Ja, zeig mir die Q&As', function(){ try { U.delay(PPX.flows.stepQAs, DLY.step || 450); } catch(e){} }, 'ppx-cta', '❓'));
    r.appendChild(UI.btn('Nein, zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  function showReservationError(msg, payload){
    var B = UI.block('SENDEN FEHLGESCHLAGEN', { maxWidth:'100%' });
    B.setAttribute('data-block','resv-error');
    var C = D.createElement('div'); C.className='ppx-body'; B.appendChild(C);

    C.appendChild(UI.line('Uff, das hat gerade nicht geklappt. Grund (technisch): '+(msg||'unbekannt')));
    C.appendChild(UI.line('Du kannst es nochmal versuchen oder deine E-Mail-App manuell öffnen.'));
    var r = UI.row();
    r.appendChild(UI.btn('Nochmal senden', function(){ try { U.delay(submitReservation, DLY.tap || 260); } catch(e){} }, 'ppx-cta', '⤴️'));
    r.appendChild(UI.btn('E-Mail manuell öffnen', function(){ try { window.location.href = mailtoHrefReservation(payload); } catch(e){} }, 'ppx-secondary', '✉️'));
    r.appendChild(UI.homeBtn ? UI.homeBtn() : UI.btn('Zurück ins Hauptmenü', function(){ try { UI.goHome(); } catch(e){} }, 'ppx-secondary', '🏠'));
    C.appendChild(r);
    try { UI.keepBottom(); } catch(e){}
  }

  // export
  PPX.flows = PPX.flows || {};
  PPX.flows.stepReservieren = stepReservieren;
})();
