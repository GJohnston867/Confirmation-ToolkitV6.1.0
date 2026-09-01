// ==UserScript==
// @name         Confirmation Text Toolkit 6.2
// @namespace    http://tampermonkey.net/
// @version      7.3.2
// @description  Date/time regex fixes, emoji-safe copy, SMS Safe toggle, Dracula theme, draggable launcher + free resize + Pull Up Form button (bottom) linking to the monday Pull Up Request form.
// @author       Hammad (maintained by RBA Central NJ)
// @updateURL    https://raw.githubusercontent.com/GJohnston867/Confirmation-ToolkitV6.1.0/main/confirmationtoolkit.user.js
// @downloadURL  https://raw.githubusercontent.com/GJohnston867/Confirmation-ToolkitV6.1.0/main/confirmationtoolkit.user.js
// @match        https://www.enabledplus.com/*
// @grant        GM_xmlhttpRequest
// @connect      gist.githubusercontent.com
// @run-at       document-start
// ==/UserScript==

/* ──────────────────────────────────────────────────────────────────────────
   RBA CENTRAL NJ — maintenance notes (added when reviving James's toolkit)
   Configured for github.com/GJohnston867/Confirmation-ToolkitV6.1.0 (auto-updates
        from the raw file on branch main; bump @version to push team updates).
        Contact button emails gjohnston@rbacentralnj.com (change anytime). Feedback link -> app.tinypulse.com.
   Left intentionally unchanged from James's original:
     - the daily "Today's Message" feed (MANAGER_MESSAGE_URL)
   ────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';
  const CTK_VER = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) ? GM_info.script.version : '7.3.2';
  console.log('✅ Confirmation Toolkit v' + CTK_VER + ' loading…');

  const FEEDBACK_FORM_URL   = 'https://app.tinypulse.com';
  // v6.4.0 — monday "Pull up Request Form" (board 18041809916).
  // PULL_UP_FORM_URL must be the WEB form ('https://forms.monday.com/forms/<token>')
  // so the fields can be pre-filled. The mndy.onelink.me link is a mobile deep-link
  // and will NOT accept pre-fill params — keep it only as the fallback below.
  const PULL_UP_FORM_URL     = 'https://forms.monday.com/forms/1f1451588a12b259fec1b62c46bb4819?r=use1';
  const PULL_UP_FALLBACK_URL = 'https://mndy.onelink.me/jkGO/zfea9oce';

  // v7.3.0 — monday "Rep to Result & Appointment Result Change" (board 18401003837).
  // One form serves both requests; the Request Type field selects which branch shows.
  // Territory here uses the same full labels as the OB form, so OB_TERRITORY_MAP is reused.
  const ARC_FORM_URL = 'https://forms.monday.com/forms/49278cceb230f58458c2e58dd630fb90?r=use1';

  // v6.8.0 — monday "Cancelled Leads Form" (board 2492150645)
  const CAL_FORM_URL = 'https://forms.monday.com/forms/a84486242555294d3554f55e7df7a511?r=use1';

  // Enable+ store name -> Territory labels on the Cancelled Leads form (Toronto = GTA here)
  const CAL_TERRITORY_MAP = {
    'Chattanooga':'Chattanooga','Cincinnati':'Cincinnati','Georgia':'Georgia',
    'Indianapolis':'Indianapolis','Knoxville':'Knoxville','Long Island':'Long Island',
    'Nashville':'Nashville','New Jersey':'New Jersey','San Francisco':'San Francisco',
    'South Bend':'South Bend','Toronto':'GTA','Westchester':'Westchester'
  };
  const CAL_APPT_TIMES = ['10:00 AM','10:30 AM','11:00 AM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','6:30 PM','7:00 PM','7:30 PM'];
  const CAL_REASONS = ['Cannot Afford','Does not have 90 minutes','Not interested at this time','ORA','ORA due to capacity','Sales rep schedule change','Schedule conflict','Spouse is no longer available','Unconfirmed'];

  // v6.7.0 — monday "Cancel Save" form (board 6538004672)
  const CS_FORM_URL = 'https://forms.monday.com/forms/4ebb9d22e9060fee95a80cb61225d2b6?r=use1';


  // v7.3.1 - Coach auto-fill map removed to keep employee names out of the public repo;
  // the Coach field on the Cancel Save form is selected by the agent instead.

  // v6.6.0 — monday "Confirmation Outbound SETS" form (board 2052644894)
  const OB_FORM_URL = 'https://forms.monday.com/forms/52108e04f57489584a6dd4d28e3126dc?r=use1';

  // Enable+ store name -> the "What Territory?" labels on the OB form
  const OB_TERRITORY_MAP = {
    'Chattanooga':'Chattanooga, TN (792)', 'Cincinnati':'Cincinnati-Dayton OH (576)',
    'Georgia':'Atlanta, GA (930)',         'Indianapolis':'Indianapolis, IN (867)',
    'Knoxville':'Knoxville, TN (790)',     'Long Island':'Long Island, NY (800)',
    'Nashville':'Nashville, TN (791)',     'New Jersey':'New Jersey-New York Metro (535)',
    'San Francisco':'San Francisco, CA (890)', 'South Bend':'South Bend, IN (868)',
    'Toronto':'Toronto, Ontario (914)',    'Westchester':'Westchester, NY (534)'
  };

  // Enable+ store name -> the Store dropdown labels on the Pull Up form
  const PULLUP_STORE_MAP = {
    'Chattanooga':'Chatt', 'Cincinnati':'Cincy', 'Georgia':'GA', 'Indianapolis':'Indy',
    'Knoxville':'Knox', 'Long Island':'LI', 'Nashville':'Nash', 'San Francisco':'SF',
    'South Bend':'SB', 'Toronto':'GTA', 'Westchester':'WC', 'New Jersey':'NJ'
  };
  const MANAGER_MESSAGE_URL = 'https://gist.githubusercontent.com/ConfirmationMGR/423dcb2729326738bd4f1e8df1754701/raw/manager-message.json';
  const MESSAGE_REFRESH_MS  = 60_000;

  // ===================== Send to Monday (v6.2.5 — token-free form) =====================
  // The "MSG Confirm" button opens the monday WorkForm "Issued Leads via MSG CONFIRM"
  // with the current Enable+ lead pre-filled in the URL. The agent reviews and clicks
  // Submit, which adds the item to the "Enable+ Lead Button Clicks" board.
  //
  // NO API token anywhere — the form's own public submission is the authorization.
  // Set MONDAY.FORM_URL below to the form URL (the /forms/<token> part).
  const MONDAY = {
    // monday WorkForm "Issued Leads via MSG CONFIRM". The MSG Confirm button opens this
    // form with the lead pre-filled (no API token anywhere); the agent just clicks Submit.
    FORM_URL: 'https://forms.monday.com/forms/d93575c22f1f7449144f174fb1e2473f'
  };

  // (v6.2.5) getMondayToken removed — no monday API token is used at all; the pre-filled form is the intake.

  function collectMondayLead(){
    const base = collectLeadData(); // {firstName, address, cityStateZip, storeName, latestAppointment}
    const fullName =
      document.querySelector('#leadinformation a')?.textContent?.trim() ||
      base.firstName || 'Enable+ Lead';

    const bodyTxt = document.body?.innerText || '';
    const lines = bodyTxt.split(/\r?\n/).map(s => s.trim());
    const lineVal = (label) => {
      const re = new RegExp('^' + label + '\\s*:?\\s*(.+)$', 'i');
      for (const ln of lines){ const m = ln.match(re); if (m && m[1].trim()) return m[1].trim(); }
      return '';
    };

    let phone  = lineVal('Cell');
    let email  = lineVal('Email');
    let source = lineVal('Source');

    // fallbacks if the label layout differs
    if(!email){ const m = bodyTxt.match(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i); if(m) email = m[0]; }
    if(!phone){ const m = bodyTxt.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/); if(m) phone = m[0]; }

    const address = [base.address, base.cityStateZip].filter(Boolean).join(', ');
    const leadId  = new URLSearchParams(location.search).get('L')
                  || document.querySelector('#leadid, .lead-id')?.textContent?.trim() || '';
    const link  = location.href;
    // Store - match the store selector against the toolkit's known store list
    // (robust against label ordering); fall back to the scraped storeName.
    const KNOWN_STORES = ['Chattanooga','Cincinnati','Georgia','Indianapolis','Knoxville','Long Island','Nashville','New Jersey','San Francisco','South Bend','Toronto','Westchester'];
    const storeRaw = ((document.querySelector('#selectedstorename')?.textContent || '') + ' ' + (base.storeName || '')).replace(/\u00a0/g,' ');
    const store = (KNOWN_STORES.find(k => storeRaw.toLowerCase().includes(k.toLowerCase())) || (base.storeName || '')).trim();

    // Confirming agent - pulled from the opener line the toolkit fills in:
    //   "My name is @MGMT - <Agent Name> calling with Renewal by Andersen"
    // Confirming agent = the "@ROLE - Name" shown next to the store in the Enable+
    // header (#selectedstorename), e.g. "@MGMT - Hammad Griffin - Georgia". Drop the
    // store segment (and any company text) and keep the rest -> "@MGMT Hammad Griffin".
    // Always present, even on Review-mode leads where the opener line is not shown.
    let agent = '';
    {
      const rawSel = (document.querySelector('#selectedstorename')?.textContent || '')
        .replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (rawSel) {
        let segs = rawSel.split(/[-|\u2013\u2014]/).map(x => x.trim()).filter(Boolean);
        segs = segs.filter(x => !(store && x.toLowerCase().includes(store.toLowerCase())));
        segs = segs.filter(x => !/^(rba|renewal|andersen|moore|holdings|central|enable)\b/i.test(x));
        agent = segs.join(' ').replace(/\s+/g, ' ').trim();   // -> "@MGMT Hammad Griffin"
      }
      if (!agent) {
        const m = bodyTxt.match(/My name is\s*(@[A-Za-z]+)?\s*-?\s*([A-Za-z][A-Za-z.'\- ]+?)\s+calling/i);
        if (m) { const p = (m[1] || '').trim(); const n = (m[2] || '').trim(); agent = (p ? p + ' ' : '') + n; }
      }
    }
    agent = agent.trim();

    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    return { fullName, phone, email, source, address, leadId, link, store, agent, dateStr };
  }

  function setMondayBtn(btn, label, state){ // state: true=ok, false=err, null=busy
    if(!btn) return;
    btn.textContent = label;
    btn.disabled = (state === null);
    btn.style.opacity = (state === null) ? '0.7' : '1';
    if(state === true || state === false){
      setTimeout(() => { btn.textContent = 'MSG Confirm'; btn.style.opacity = '1'; btn.disabled = false; }, 2600);
    }
  }

  function sendToMonday(btn){
    const L = collectMondayLead();
    if(!L.fullName){ setMondayBtn(btn, 'No lead found', false); return; }
    // Build the monday form pre-fill URL - NO API token. The agent reviews + clicks Submit.
    const p = new URLSearchParams();
    p.set('name', L.fullName);
    if(L.address) p.set('address', L.address);
    if(L.phone)   p.set('phone', L.phone.replace(/\D/g,''));   // form defaults the country code to US
    if(L.email)   p.set('email', L.email);
    if(L.source)  p.set('source', L.source);
    if(L.leadId)  p.set('leadid', L.leadId);
    if(L.store)   p.set('store', L.store);
    if(L.agent)   p.set('agent', L.agent);
    if(L.link)    p.set('link', L.link);   // monday's Link field ignores pre-fill; sent anyway, harmless
    // "Date Added" auto-fills to today on the form.
    const sep = (MONDAY.FORM_URL.indexOf('?') >= 0) ? '&' : '?';
    window.open(MONDAY.FORM_URL + sep + p.toString(), '_blank', 'noopener');
    setMondayBtn(btn, '\u2713 Form opened', true);
  }
  // =================== end Send to Monday ===================

  // =================== Pull Up Request (v6.4.0) ===================
  // Scrapes the current Enable+ lead, shows a pre-filled review card in the toolkit,
  // and on Submit opens the monday Pull up Request Form with every field pre-filled.

  function collectPullUpData(){
    const base = collectLeadData();
    const bodyTxt = document.body?.innerText || '';

    // Homeowner last name — prefer the linked name in #leadinformation
    let hoLast = '';
    const fullNm = (document.querySelector('#leadinformation a')?.textContent || '').replace(/\s+/g,' ').trim();
    if (fullNm){
      const parts = fullNm.replace(/\s*\+\s*$/,'').split(' ').filter(Boolean);
      hoLast = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    }
    if (!hoLast && base.firstName) hoLast = base.firstName;

    // Store -> form label
    const KNOWN = Object.keys(PULLUP_STORE_MAP);
    const storeRaw = ((document.querySelector('#selectedstorename')?.textContent || '') + ' ' + (base.storeName || '')).replace(/\u00a0/g,' ');
    const storeLong = KNOWN.find(k => storeRaw.toLowerCase().includes(k.toLowerCase())) || '';
    const store = PULLUP_STORE_MAP[storeLong] || '';

    // Confirming agent (same logic as the monday sender)
    let agent = '';
    {
      const rawSel = (document.querySelector('#selectedstorename')?.textContent || '')
        .replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
      if (rawSel){
        let segs = rawSel.split(/[-|\u2013\u2014]/).map(x=>x.trim()).filter(Boolean);
        segs = segs.filter(x => !(storeLong && x.toLowerCase().includes(storeLong.toLowerCase())));
        segs = segs.filter(x => !/^(rba|renewal|andersen|moore|holdings|central|enable)\b/i.test(x));
        agent = segs.join(' ').replace(/@\w+\s*/,'').replace(/\s+/g,' ').trim();
      }
      if (!agent){
        const m = bodyTxt.match(/My name is\s*(@[A-Za-z]+)?\s*-?\s*([A-Za-z][A-Za-z.'\- ]+?)\s+calling/i);
        if (m) agent = (m[2]||'').trim();
      }
    }

    // Current appointment date -> YYYY-MM-DD for the monday date field
    let apptISO = '', apptRaw = (base.latestAppointment || '').trim();
    {
      const m = apptRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (m){
        let [, mo, da, yr] = m;
        if (yr.length === 2) yr = '20' + yr;
        apptISO = `${yr}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}`;
      }
    }

    return { agent, hoLast, store, apptISO, apptRaw, link: location.href };
  }

  function collectOBData(){
    const base = collectLeadData();
    const bodyTxt = document.body?.innerText || '';

    let hoLast = '';
    const fullNm = (document.querySelector('#leadinformation a')?.textContent || '').replace(/\s+/g,' ').trim();
    if (fullNm){
      const parts = fullNm.replace(/\s*\+\s*$/,'').split(' ').filter(Boolean);
      hoLast = parts.length > 1 ? parts[parts.length-1] : parts[0];
    }
    if (!hoLast && base.firstName) hoLast = base.firstName;

    const KNOWN = Object.keys(OB_TERRITORY_MAP);
    const storeRaw = ((document.querySelector('#selectedstorename')?.textContent || '') + ' ' + (base.storeName || '')).replace(/\u00a0/g,' ');
    const storeLong = KNOWN.find(k => storeRaw.toLowerCase().includes(k.toLowerCase())) || '';
    const territory = OB_TERRITORY_MAP[storeLong] || '';

    let agent = '';
    {
      const rawSel = (document.querySelector('#selectedstorename')?.textContent || '')
        .replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
      if (rawSel){
        let segs = rawSel.split(/[-|\u2013\u2014]/).map(x=>x.trim()).filter(Boolean);
        segs = segs.filter(x => !(storeLong && x.toLowerCase().includes(storeLong.toLowerCase())));
        segs = segs.filter(x => !/^(rba|renewal|andersen|moore|holdings|central|enable)\b/i.test(x));
        agent = segs.join(' ').replace(/@\w+\s*/,'').replace(/\s+/g,' ').trim();
      }
      if (!agent){
        const m = bodyTxt.match(/My name is\s*(@[A-Za-z]+)?\s*-?\s*([A-Za-z][A-Za-z.'\- ]+?)\s+calling/i);
        if (m) agent = (m[2]||'').trim();
      }
    }

    // Appointment date + time -> datetime-local value
    let apptLocal = '';
    const raw = (base.latestAppointment || '').trim();
    {
      const dm = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dm){
        let [, mo, da, yr] = dm;
        if (yr.length === 2) yr = '20' + yr;
        let hh = '10', mi = '00';
        const tm = raw.match(/(\d{1,2}):(\d{2})\s*([AaPp])?\.?[Mm]?/);
        if (tm){
          hh = parseInt(tm[1], 10); mi = tm[2];
          const ap = (tm[3]||'').toLowerCase();
          if (ap === 'p' && hh < 12) hh += 12;
          if (ap === 'a' && hh === 12) hh = 0;
          hh = String(hh).padStart(2,'0');
        }
        apptLocal = `${yr}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}T${hh}:${mi}`;
      }
    }

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Same-day / next-day suggestion vs the appointment
    let sdnd = '';
    if (apptLocal){
      const a = apptLocal.slice(0,10);
      const diff = Math.round((new Date(a) - new Date(today)) / 86400000);
      sdnd = (diff === 0 || diff === 1) ? 'YES' : 'NO';
    }

    return { agent, hoLast, territory, apptLocal, today, sdnd, link: location.href };
  }

  // ---------- generic: open the pre-filled monday form in a new tab ----------
  // Mirrors how the old MSG Confirm button worked: build the pre-fill URL from the
  // live Enable+ lead, open the real monday form, agent reviews and hits Submit.
  function openMondayFormModal(opts){
    // opts: {id, title, color, url, params, chip}
    const sep  = opts.url.indexOf('?') >= 0 ? '&' : '?';
    const full = opts.url + sep + opts.params.toString();
    window.open(full, '_blank', 'noopener');
    flashChip(opts.chip, '\u2713 Opened');
  }

  // brief visual ack on the Quick Forms chip that was clicked
  function flashChip(chip, label){
    if (!chip) return;
    const orig = chip.textContent;
    chip.textContent = label;
    chip.style.opacity = '0.75';
    setTimeout(() => { chip.textContent = orig; chip.style.opacity = '1'; }, 1200);
  }

  // ---------- Pull Up ----------
  function showPullUpForm(chip){
    const D = collectPullUpData();
    const p = new URLSearchParams();
    if (D.agent)   p.set('name', D.agent);
    if (D.hoLast)  p.set('text_mm2pvk69', D.hoLast);
    if (D.store)   p.set('multi_selectd1ynwxrl', D.store);
    if (D.link)    p.set('linkle8n5mfg', D.link);
    if (D.apptISO) p.set('date_mm2tax9y', D.apptISO);
    openMondayFormModal({ id:'ctk-pu-wrap', title:'Pull Up Request', color:'#0B4DA2',
      url: (/PASTE_TOKEN_HERE/.test(PULL_UP_FORM_URL) ? PULL_UP_FALLBACK_URL : PULL_UP_FORM_URL), params:p, chip  });
  }

  // ---------- OB Set ----------
  function showOBForm(chip){
    const D = collectOBData();
    const p = new URLSearchParams();
    if (D.agent)     p.set('status1', D.agent);
    if (D.hoLast)    p.set('text_mkspg1wc', D.hoLast);
    if (D.territory) p.set('dropdown9', D.territory);
    if (D.apptLocal) p.set('appt_date', D.apptLocal.replace('T',' '));
    if (D.today)     p.set('date4', D.today);
    if (D.sdnd)      p.set('status7', D.sdnd);
    if (D.link)      p.set('text4', D.link);
    p.set('checkbox1', 'NO');
    openMondayFormModal({ id:'ctk-ob-wrap', title:'OB Set — Confirmation Outbound', color:'#0E7A0D',
      url: OB_FORM_URL, params:p, chip  });
  }

  // ---------- Same Day Cancel Save ----------
  function showCancelSaveForm(chip){
    const D = collectOBData();
    const coach = ''; // v7.3.1 - no coach auto-fill; agent selects Coach on the form
    const p = new URLSearchParams();
    if (D.agent) p.set('multi_select2__1', D.agent);
    if (coach)   p.set('single_select_mkmxz7hc', coach);
    p.set('label__1', 'SAVE VIA PHONE');
    if (D.today) p.set('date4', D.today);
    if (D.link)  p.set('e__link__1', D.link);
    openMondayFormModal({ id:'ctk-cs-wrap', title:'Same Day Cancel Save', color:'#B00020',
      url: CS_FORM_URL, params:p, chip  });
  }

  // ---------- Rep to Result ----------
  function showRepToResultForm(chip){
    const D = collectOBData();
    const p = new URLSearchParams();
    if (D.agent)     p.set('name', D.agent);
    p.set('multi_select7r2xra4b', 'Rep to Result');
    p.set('multi_selectxupu03ur', 'Confirmation');
    if (D.territory) p.set('territory_7_3_23', D.territory);
    if (D.link)      p.set('text', D.link);
    if (D.apptLocal) p.set('date4', D.apptLocal.slice(0,10));
    openMondayFormModal({ id:'ctk-rtr-wrap', title:'Rep to Result', color:'#0F766E',
      url: ARC_FORM_URL, params:p, chip });
  }

  // ---------- Appt Result Change ----------
  function showApptResultChangeForm(chip){
    const D = collectOBData();
    const p = new URLSearchParams();
    if (D.agent)     p.set('name', D.agent);
    p.set('multi_select7r2xra4b', 'Appointment Result Change');
    p.set('multi_selectxupu03ur', 'Confirmation');
    if (D.territory) p.set('territory_7_3_23', D.territory);
    if (D.link)      p.set('text', D.link);
    if (D.apptLocal) p.set('date4', D.apptLocal.slice(0,10));
    openMondayFormModal({ id:'ctk-arc-wrap', title:'Appt Result Change', color:'#B45309',
      url: ARC_FORM_URL, params:p, chip  });
  }

  // ---------- Cancelled Assigned Lead ----------
  function showCancelledLeadForm(chip){
    const base = collectLeadData();
    const D = collectOBData();

    let hoFirst = base.firstName || '', hoLast = '';
    const fullNm = (document.querySelector('#leadinformation a')?.textContent || '').replace(/\s+/g,' ').trim();
    if (fullNm){
      const parts = fullNm.replace(/\s*\+\s*$/,'').split(' ').filter(Boolean);
      if (parts.length > 1){ hoFirst = hoFirst || parts[0]; hoLast = parts[parts.length-1]; }
      else { hoLast = parts[0] || ''; }
    }

    const KNOWN = Object.keys(CAL_TERRITORY_MAP);
    const storeRaw = ((document.querySelector('#selectedstorename')?.textContent || '') + ' ' + (base.storeName || '')).replace(/\u00a0/g,' ');
    const storeLong = KNOWN.find(k => storeRaw.toLowerCase().includes(k.toLowerCase())) || '';
    const territory = CAL_TERRITORY_MAP[storeLong] || '';

    let apptTime = '';
    if (D.apptLocal){
      let [h, m] = D.apptLocal.slice(11).split(':').map(Number);
      const ap = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12; if (h12 === 0) h12 = 12;
      const guess = `${h12}:${String(m).padStart(2,'0')} ${ap}`;
      if (CAL_APPT_TIMES.includes(guess)) apptTime = guess;
    }

    let lastMin = '';
    if (D.apptLocal){
      const mins = (new Date(D.apptLocal) - new Date()) / 60000;
      lastMin = (mins >= 0 && mins <= 60) ? 'YES' : 'NO';
    }

    const p = new URLSearchParams();
    if (D.agent)   p.set('dropdown', D.agent);
    if (hoFirst)   p.set('short_textsky24kzc', hoFirst);
    if (hoLast)    p.set('short_textbnnhvcn5', hoLast);
    if (territory) p.set('dup__of_territory', territory);
    p.set('name', 'Not Assigned');
    if (apptTime)  p.set('appt_time6', apptTime);
    if (lastMin)   p.set('status3', lastMin);
    p.set('dropdown2', 'no');
    if (D.today)   p.set('date4', D.today);
    if (D.link)    p.set('link', D.link);

    openMondayFormModal({ id:'ctk-cal-wrap', title:'Cancelled Assigned Lead', color:'#6B21A8',
      url: CAL_FORM_URL, params:p, chip  });
  }
  // =================== end Cancelled Assigned Lead ===================





  // v6.2.1 — "MSG Confirm" Quick Copy tile: invoke Enable+'s own Message-Confirm
  // control so it logs exactly like a manual click (the "Message Confirm - <appt>"
  // entry plus the auto "Msg Confirmed-<Source>" note).
  function doEnableMsgConfirm(chip){
    const orig = chip ? chip.textContent : '';
    const btn = document.querySelector('#messageConfirmButton')
      || Array.from(document.querySelectorAll('input[type=button], input[type=submit], button'))
           .find(e => /message[\s-]?confirm/i.test((e.value || e.textContent || '')));
    if(!btn){
      if(chip){ chip.textContent='Not on confirm screen'; setTimeout(()=>chip.textContent=orig,1800); }
      else alert('Enable+ Message-Confirm button not found. Open the confirm screen first.');
      return;
    }
    showMsgConfirmModal(function(){
      btn.click();                 // Enable+ native Message-Confirm (logs it, same as clicking by hand)
      playSound();
      // v7.3.2 — confirm only; do NOT open the monday form
      if(chip){ chip.classList.add('copied'); chip.textContent='✓ Confirmed'; setTimeout(function(){ chip.classList.remove('copied'); chip.textContent=orig; },1600); }
    });
  }

  // v6.2.2 - styled confirm dialog for the MSG Confirm tile (populated with live lead data)
  function showMsgConfirmModal(onYes){
    let L = {}, appt = '';
    try { L = collectMondayLead(); } catch(e){}
    try { appt = (collectLeadData().latestAppointment) || ''; } catch(e){}
    const esc = s => (s==null?'':String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const nm = esc(L.fullName || 'this lead');
    const apptTxt = esc(appt);
    const addr = esc(L.address || '');
    const store = esc(L.store || '');
    const agent = esc(L.agent || '');
    const dim = document.createElement('div');
    dim.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:10000001;font-family:Tahoma,Verdana,Segoe UI,system-ui,sans-serif;';
    dim.innerHTML =
      '<div style="width:330px;background:#F1F4DD;border:1px solid #5a5a5a;border-radius:8px;box-shadow:0 14px 34px rgba(0,0,0,.4);overflow:hidden;">'
      + '<div style="background:#009612;color:#fff;font-weight:900;font-size:15px;padding:11px 14px;">MSG Confirm this lead?</div>'
      + '<div style="padding:14px;color:#000;font-size:13px;line-height:1.5;">This runs <b>Message-Confirm</b> in Enable+ for:'
      +   '<div style="background:#fff;border:1px solid #cdd3b8;border-radius:6px;padding:10px 12px;margin:6px 0 12px;">'
      +     '<div style="font-weight:900;font-size:14px;margin-bottom:2px;">' + nm + (apptTxt ? (' — ' + apptTxt) : '') + '</div>'
      +     (addr ? ('<div style="color:#333;font-size:12px;">' + addr + '</div>') : '')
      +     ((store||agent) ? ('<div style="color:#333;font-size:12px;">' + (store ? ('Store: ' + store) : '') + (store&&agent ? ' • ' : '') + (agent||'') + '</div>') : '')
      +   '</div>'
      +   '<div style="color:#5C3D00;background:#FFF3CD;border:1px solid #F0A500;border-radius:6px;padding:7px 10px;font-size:12px;font-weight:700;">This logs the Message Confirm in Enable+. Don’t forget to post your note and send the text before hitting MSG Confirm.</div>'
      + '</div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end;padding:12px 14px;background:#E6EED1;border-top:1px solid #cdd3b8;">'
      +   '<button id="ctk-mc-cancel" style="font-family:inherit;font-weight:900;font-size:13px;border-radius:6px;cursor:pointer;padding:9px 14px;border:1px solid #7A7A7A;background:#DFDFDF;color:#000;box-shadow:inset 1px 1px #fff, inset -1px -1px #4a4a4a;">Cancel</button>'
      +   '<button id="ctk-mc-go" style="font-family:inherit;font-weight:900;font-size:13px;border-radius:6px;cursor:pointer;padding:9px 14px;border:1px solid #0E7A0D;background:#0E7A0D;color:#fff;">Yes, MSG Confirm</button>'
      + '</div></div>';
    document.body.appendChild(dim);
    const close = () => dim.remove();
    dim.addEventListener('click', (e) => { if(e.target === dim) close(); });
    dim.querySelector('#ctk-mc-cancel').onclick = close;
    dim.querySelector('#ctk-mc-go').onclick = () => { close(); try { onYes && onYes(); } catch(e){ console.error(e); } };
  }

  // ---------------- prefs ----------------
  let soundEnabled     = localStorage.getItem('ctk_sound') !== 'false';
  let soundType        = localStorage.getItem('ctk_sound_type') || 'chime';
  let themeMode        = localStorage.getItem('ctk_theme_mode') || 'dark';
  let themeName        = localStorage.getItem('ctk_theme_name') || 'enabled';
  let currentSize      = localStorage.getItem('ctk_size') || 'medium';
  let currentWidth     = localStorage.getItem('ctk_width') || 'normal';
  let sectionsExpanded = localStorage.getItem('ctk_sections') !== 'false';
  let settingsVisible  = localStorage.getItem('ctk_settings') === 'true';
  let scale            = parseFloat(localStorage.getItem('ctk_scale') || '1');
  let notesOpen        = localStorage.getItem('ctk_notes_open') !== 'false';
  // v5.1 — SMS Safe: strip emoji from copied text to avoid UCS-2 carrier issues
  let smsSafe          = localStorage.getItem('ctk_sms_safe') === 'true';

  const MIN_SCALE=0.7, MAX_SCALE=1.8, STEP=0.1;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const safeNow = () => new Date();

  // v5.1 — emoji stripper used by all copy paths when smsSafe is on
  const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  function safeCopy(text) {
    if (!smsSafe) return text;
    return text.replace(EMOJI_RE, '').replace(/  +/g, ' ').trim();
  }

  const hexToRgb=(hex)=>{if(!hex) return {r:255,g:255,b:255};const h=hex.replace('#','');const b=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return{r:(b>>16)&255,g:(b>>8)&255,b:b&255};};
  const lum=({r,g,b})=>{const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];};
  const idealText=(bg)=> lum(hexToRgb(bg||'#fff'))>0.5 ? '#111' : '#fff';

  // -------------- themes --------------
  const BRAND_YELLOW = '#ffff02';
  const BRAND_BLUE   = '#0601ff';
  const BRAND_BLACK  = '#000000';
  const BRAND_RED    = '#e60a0e';

  const THEMES={
   enabled:{
  radius:8, font:'Tahoma, Verdana, Segoe UI, system-ui, sans-serif',
  light:{
    headerBg:'#009612', headerTx:'#FFFFFF',
    mainBg:'#F1F4DD', sectionBg:'#FFFFFF', sectionTx:'#000000',
    textBg:'#F8FAEC', border:'#5a5a5a', text:'#000000',
    buttonBg:'#DFDFDF', buttonTx:'#000000', footerBg:'#E6EED1', footerTx:'#1B1B1B',
    accentHd:'#0601ff', accentBg:'#F3F9E8', accentTx:'#FFFFFF',
    accentRing:'#3a3a3a', glow:'#29B341',
    btnFace:'#DFDFDF', btnShadow:'#4a4a4a', btnHighlight:'#ffffff',
    btnHoverHL:'#ededed', hoverOutline:'#ffff02', hoverGlow:'#0601ff'
  },
  dark:{
    headerBg:'#006d0e', headerTx:'#E9FFE9',
    mainBg:'#1B2312', sectionBg:'#212C16', sectionTx:'#E9FFE9',
    textBg:'#263518', border:'#4a4a4a', text:'#E9FFE9',
    buttonBg:'#5C5C5C', buttonTx:'#FFFFFF', footerBg:'#1E2715', footerTx:'#E9FFE9',
    accentHd:'#0601ff', accentBg:'#203417', accentTx:'#DFFFE1',
    accentRing:'#3a3a3a', glow:'#5ED07E',
    btnFace:'#5C5C5C', btnShadow:'#2a2a2a', btnHighlight:'#a0a0a0',
    btnHoverHL:'#6d6d6d', hoverOutline:'#ffff02', hoverGlow:'#0601ff'
  }
},
    rba:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#79AE5E',headerTx:'#0B1C0A',mainBg:'#F6FBF3',sectionBg:'#FFFFFF',sectionTx:'#0B1C0A',textBg:'#EAF6E2',border:'#B8D9A7',text:'#0B1C0A',buttonBg:'#FFD580',buttonTx:'#0B1C0A',footerBg:'#E3F1D8',footerTx:'#0B1C0A',accentHd:'#5C9443',accentBg:'#EEF7E7',accentTx:'#0B1C0A',accentRing:'#79AE5E',glow:'#8FD77B'},
      dark :{headerBg:'#4F7E3E',headerTx:'#E9FBE0',mainBg:'#0E1A0D',sectionBg:'#152315',sectionTx:'#E9FBE0',textBg:'#1B2E1A',border:'#5F9A4B',text:'#E9FBE0',buttonBg:'#FFD580',buttonTx:'#0B1C0A',footerBg:'#102110',footerTx:'#E9FBE0',accentHd:'#76C167',accentBg:'#133116',accentTx:'#E9FBE0',accentRing:'#76C167',glow:'#7CE28A'}
    },
    win98:{
      radius:0, font:'"MS Sans Serif", Tahoma, Geneva, sans-serif',
      light:{headerBg:'#008080',headerTx:'#FFFFFF',mainBg:'#C0C0C0',sectionBg:'#E5E5E5',sectionTx:'#000',textBg:'#FFFFFF',border:'#7A7A7A',text:'#000',buttonBg:'#DFDFDF',buttonTx:'#000',footerBg:'#D9D9D9',footerTx:'#000',accentHd:'#000080',accentBg:'#F5F5F5',accentTx:'#FFFFFF',accentRing:'#008080',glow:'#008080'},
      dark :{headerBg:'#005F5F',headerTx:'#E8FFFF',mainBg:'#2E2E2E',sectionBg:'#3A3A3A',sectionTx:'#F5F5F5',textBg:'#2C2C2C',border:'#808080',text:'#F5F5F5',buttonBg:'#5C5C5C',buttonTx:'#FFF',footerBg:'#333333',footerTx:'#FFF',accentHd:'#1E90FF',accentBg:'#2E2E2E',accentTx:'#F8FCFF',accentRing:'#1E90FF',glow:'#1E90FF'}
    },
    cosmic:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#4338CA',headerTx:'#FFFFFF',mainBg:'#F6F7FF',sectionBg:'#FFFFFF',sectionTx:'#0A1026',textBg:'#E7E9FF',border:'#B9C6FF',text:'#0A1026',buttonBg:'#FFB703',buttonTx:'#121212',footerBg:'#E9EDFF',footerTx:'#0A1026',accentHd:'#7C3AED',accentBg:'#F3E8FF',accentTx:'#FFFFFF',accentRing:'#7C3AED',glow:'#7C80FF'},
      dark :{headerBg:'#1E1B4B',headerTx:'#E9EDFF',mainBg:'#090B1A',sectionBg:'#0F1130',sectionTx:'#E9EDFF',textBg:'#141A45',border:'#6576FF',text:'#E9EDFF',buttonBg:'#FFB703',buttonTx:'#121212',footerBg:'#0E1032',footerTx:'#E9EDFF',accentHd:'#4F46E5',accentBg:'#0F153B',accentTx:'#FFFFFF',accentRing:'#7C3AED',glow:'#9F7AEA'}
    },
    neon:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#0F172A',headerTx:'#00FFF5',mainBg:'#FFFFFF',sectionBg:'#FFFFFF',sectionTx:'#111827',textBg:'#F3F4F6',border:'#D1D5DB',text:'#111827',buttonBg:'#00FFF0',buttonTx:'#061016',footerBg:'#E5E7EB',footerTx:'#0F172A',accentHd:'#00FFFF',accentBg:'#ECFEFF',accentTx:'#061016',accentRing:'#39FF14',glow:'#39FF14'},
      dark :{headerBg:'#080B16',headerTx:'#7CFFFB',mainBg:'#0A0F1A',sectionBg:'#111827',sectionTx:'#E5E7EB',textBg:'#141C2A',border:'#28374E',text:'#E5E7EB',buttonBg:'#00FFFF',buttonTx:'#051018',footerBg:'#0F172A',footerTx:'#C7D2FE',accentHd:'#00FFFF',accentBg:'#0E1928',accentTx:'#DFFFFF',accentRing:'#39FF14',glow:'#00FFFF'}
    },
    lava:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#E53935',headerTx:'#FFFFFF',mainBg:'#FFF7F7',sectionBg:'#FFFFFF',sectionTx:'#3A0E0E',textBg:'#FFE3E3',border:'#FFC0C0',text:'#3A0E0E',buttonBg:'#FF8A80',buttonTx:'#230808',footerBg:'#FFD7D7',footerTx:'#3A0E0E',accentHd:'#EF4444',accentBg:'#FFEAEA',accentTx:'#FFFFFF',accentRing:'#E53935',glow:'#FF5A4D'},
      dark :{headerBg:'#7A1D1D',headerTx:'#FFEDEC',mainBg:'#170C0C',sectionBg:'#2C1212',sectionTx:'#FFEDEC',textBg:'#381515',border:'#A75B5B',text:'#FFE6E6',buttonBg:'#F87171',buttonTx:'#2B0B0B',footerBg:'#1F0E0E',footerTx:'#FFEDEC',accentHd:'#EF4444',accentBg:'#2C1212',accentTx:'#FFEDEC',accentRing:'#EF4444',glow:'#FF5959'}
    },
    evergreen:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#2E7D32',headerTx:'#FFFFFF',mainBg:'#F7FFF9',sectionBg:'#FFFFFF',sectionTx:'#062014',textBg:'#E8F5E9',border:'#B6E1C3',text:'#062014',buttonBg:'#66BB6A',buttonTx:'#062014',footerBg:'#E0F4E5',footerTx:'#062014',accentHd:'#2E7D32',accentBg:'#E9FFF5',accentTx:'#0B1C0A',accentRing:'#2E7D32',glow:'#5ED07E'},
      dark :{headerBg:'#0D3B2E',headerTx:'#E9FFF8',mainBg:'#061F1A',sectionBg:'#0F4036',sectionTx:'#E9FFF8',textBg:'#134E42',border:'#4FBF9E',text:'#E9FFF8',buttonBg:'#34D399',buttonTx:'#0A3E36',footerBg:'#08352C',footerTx:'#E9FFF8',accentHd:'#22C55E',accentBg:'#0E3A31',accentTx:'#D1FAE5',accentRing:'#22C55E',glow:'#31E07F'}
    },
    ocean:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#0277BD',headerTx:'#FFFFFF',mainBg:'#F7FBFF',sectionBg:'#FFFFFF',sectionTx:'#06293D',textBg:'#E3F2FD',border:'#9BC9F4',text:'#06293D',buttonBg:'#40A9F3',buttonTx:'#06293D',footerBg:'#DDEEFF',footerTx:'#06293D',accentHd:'#0277BD',accentBg:'#E8F3FF',accentTx:'#FFFFFF',accentRing:'#0277BD',glow:'#4FB5FF'},
      dark :{headerBg:'#0D2438',headerTx:'#EAF2FF',mainBg:'#0B1622',sectionBg:'#152537',sectionTx:'#EAF2FF',textBg:'#1A2E46',border:'#3E5871',text:'#EAF2FF',buttonBg:'#69AEF9',buttonTx:'#0B1622',footerBg:'#0C1B2C',footerTx:'#EAF2FF',accentHd:'#3AA0FF',accentBg:'#122235',accentTx:'#DFF1FF',accentRing:'#3AA0FF',glow:'#5FB2FF'}
    },
    plum:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#B26CE0',headerTx:'#FFFFFF',mainBg:'#FCFAFF',sectionBg:'#FFFFFF',sectionTx:'#271B33',textBg:'#F2E9FF',border:'#DCCBFA',text:'#271B33',buttonBg:'#FFCF99',buttonTx:'#2A1B00',footerBg:'#F2E9FF',footerTx:'#271B33',accentHd:'#B26CE0',accentBg:'#F7F0FF',accentTx:'#FFFFFF',accentRing:'#B26CE0',glow:'#C798F1'},
      dark :{headerBg:'#7E52A3',headerTx:'#F7F1FF',mainBg:'#1B1423',sectionBg:'#241B2E',sectionTx:'#F7F1FF',textBg:'#2B2038',border:'#9B84C7',text:'#F1E9FF',buttonBg:'#FFC78B',buttonTx:'#2A1B00',footerBg:'#211933',footerTx:'#F7F1FF',accentHd:'#B28FD9',accentBg:'#281F38',accentTx:'#F0E9FF',accentRing:'#B28FD9',glow:'#BFA6EA'}
    },
    dracula:{
      radius:14, font:'Inter, Segoe UI, system-ui, sans-serif',
      light:{headerBg:'#644AC9',headerTx:'#FFFBEB',mainBg:'#FFFBEB',sectionBg:'#FFFFFF',sectionTx:'#1F1F1F',textBg:'#F3EFFD',border:'#D5CFEF',text:'#1F1F1F',buttonBg:'#E7E2FA',buttonTx:'#1F1F1F',footerBg:'#F1EDFB',footerTx:'#1F1F1F',accentHd:'#644AC9',accentBg:'#F3EFFD',accentTx:'#FFFFFF',accentRing:'#644AC9',glow:'#A3144D'},
      dark :{headerBg:'#bd93f9',headerTx:'#282a36',mainBg:'#282a36',sectionBg:'#343746',sectionTx:'#f8f8f2',textBg:'#21222c',border:'#44475a',text:'#f8f8f2',buttonBg:'#44475a',buttonTx:'#f8f8f2',footerBg:'#21222c',footerTx:'#f8f8f2',accentHd:'#bd93f9',accentBg:'#343746',accentTx:'#f8f8f2',accentRing:'#bd93f9',glow:'#ff79c6'}
    }
  };
  const activeTheme=()=>{const t=THEMES[themeName]||THEMES.enabled;return {...(themeMode==='dark'?t.dark:t.light),radius:t.radius,font:t.font};};

  // -------------- sounds --------------
  function tone({freq=800,dur=200,type='sine',gainStart=0.08,gainEnd=0.005}){ if(!soundEnabled) return; try{const ctx=new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;o.connect(g);g.connect(ctx.destination);const now=ctx.currentTime;g.gain.setValueAtTime(gainStart,now);g.gain.exponentialRampToValueAtTime(gainEnd,now+dur/1000);o.start(now);o.stop(now+dur/1000);}catch{} }
  const playChime=()=>{tone({freq:660,dur:180});setTimeout(()=>tone({freq:880,dur:160}),120);};
  const playPing =()=> tone({freq:920,dur:140,type:'triangle',gainStart:0.05});
  const playBell =()=>{tone({freq:520,dur:260});setTimeout(()=>tone({freq:780,dur:220}),60);};
  function playSound(){ if(!soundEnabled) return; if(soundType==='ping') return playPing(); if(soundType==='bell') return playBell(); return playChime(); }

  // -------------- manager message --------------
  let lastMessageKey=localStorage.getItem('ctk_last_msg')||null, messageTimer=null;

  function fetchMessage(cb){
    if(typeof GM_xmlhttpRequest==='undefined') return;
    GM_xmlhttpRequest({
      method:'GET',
      url:MANAGER_MESSAGE_URL+'?t='+Date.now(),
      headers:{'Cache-Control':'no-cache'},
      onload:(r)=>{try{if(r.status!==200)return;const data=JSON.parse(r.responseText);cb&&cb(data);}catch{}},
      onerror:()=>{}
    });
  }
  function hashKey(text, from){ return `msg_${(text||'').length}_${(from||'Manager')}_${(text||'').slice(0,24)}`; }

  function updateMessage(){
    const box=document.querySelector('.mgr-msg-box'); if(!box) return;
    fetchMessage((data)=>{
      if(!data||!data.message) return;
      const from = data.from || 'Manager';
      const key  = hashKey(data.message, from);
      let stamp;
      if (data.timestamp && String(data.timestamp).toLowerCase()!=='auto') {
        stamp = new Date(data.timestamp).toLocaleString();
      } else {
        let seen = localStorage.getItem('ctk_mgr_seen_at_'+key);
        if (!seen) {
          seen = safeNow().toISOString();
          localStorage.setItem('ctk_mgr_seen_at_'+key, seen);
        }
        stamp = new Date(seen).toLocaleString();
      }

      const nextKey=`${data.message}|${from}`;
      const changed=lastMessageKey!==nextKey;
      lastMessageKey=nextKey; localStorage.setItem('ctk_last_msg',lastMessageKey);

      const payload={text:data.message,from, timestamp:stamp};
      localStorage.setItem('ctk_mgr_cache',JSON.stringify(payload));
      box.style.display='block';
      box.querySelector('.mgr-msg-text').textContent=payload.text;
      box.querySelector('.mgr-msg-from').textContent=payload.from;
      box.querySelector('.mgr-msg-time').textContent=payload.timestamp;
      if(changed) playSound();
    });
  }

  // -------------- templates modals --------------
  function showAddTemplateModal(){
    const modal=document.createElement('div'); modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:10000000;';
    const content=document.createElement('div'); content.style.cssText='background:#fff;border-radius:14px;width:92%;max-width:560px;padding:18px;box-shadow:0 12px 32px rgba(0,0,0,.25);font-family:Inter,Segoe UI,system-ui,sans-serif;';
    content.innerHTML=`<h3 style="margin:0 0 12px 0;font-size:18px;">Add Custom Template</h3>
      <div style="margin-bottom:10px;"><label style="display:block;margin-bottom:4px;font-size:12px;font-weight:700;">Name</label>
      <input type="text" id="tpl-name" placeholder="Template name" style="width:100%;padding:10px;border:1px solid #ccd;border-radius:10px;"></div>
      <div style="margin-bottom:10px;"><label style="display:block;margin-bottom:4px;font-size:12px;font-weight:700;">Text</label>
      <textarea id="tpl-text" rows="7" placeholder="Use {firstName}, {appointment}, {date}, {time}, {address}, {phone}, {store}" style="width:100%;padding:10px;border:1px solid #ccd;border-radius:10px;resize:vertical;"></textarea></div>
      <div style="margin-bottom:16px;"><label style="display:block;margin-bottom:4px;font-size:12px;font-weight:700;">Header Color</label>
      <input type="color" id="tpl-color" value="#E0F7FA" style="width:100%;height:42px;border:1px solid #ccd;border-radius:10px;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="cancel-tpl" style="padding:10px 14px;background:#f5f5f7;border:1px solid #ccd;border-radius:10px;cursor:pointer;font-weight:800;">Cancel</button>
        <button id="save-tpl" style="padding:10px 14px;background:#FFD580;border:none;border-radius:10px;cursor:pointer;font-weight:900;">Save</button>
      </div>`;
    modal.appendChild(content); document.body.appendChild(modal);
    const close=()=>modal.remove();
    content.querySelector('#cancel-tpl').onclick=close; modal.onclick=(e)=>{if(e.target===modal)close();};
    content.querySelector('#save-tpl').onclick=()=>{
      const name=content.querySelector('#tpl-name').value.trim();
      const text=content.querySelector('#tpl-text').value.trim();
      const color=content.querySelector('#tpl-color').value;
      if(!name||!text){alert('Please enter both name and text.');return;}
      const list=JSON.parse(localStorage.getItem('ctk_custom_templates')||'[]');
      list.push({name,text,color,id:Date.now()});
      localStorage.setItem('ctk_custom_templates',JSON.stringify(list));
      alert('Template saved! Close/reopen Toolkit to reload templates.');
      close();
    };
  }
  function showManageTemplatesModal(){
    const modal=document.createElement('div'); modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:10000000;';
    const content=document.createElement('div'); content.style.cssText='background:#fff;border-radius:14px;width:92%;max-width:580px;padding:18px;box-shadow:0 12px 32px rgba(0,0,0,.25);font-family:Inter,Segoe UI,system-ui,sans-serif;max-height:80vh;overflow:auto;';
    let html=`<h3 style="margin:0 0 12px 0;font-size:18px;">Manage Templates</h3>`;
    const list=JSON.parse(localStorage.getItem('ctk_custom_templates')||'[]');
    if(list.length===0){
      html+=`<p style="text-align:center;color:#666;padding:40px 20px;">No custom templates yet.</p>`;
    } else {
      list.forEach(tpl=>{
        html+=`<div style="margin-bottom:12px;border:1px solid #ccd;border-radius:12px;padding:12px;background:#fff;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:900;margin-bottom:6px;">
                <span style="display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:6px;background:${tpl.color};border:1px solid #ccd;"></span>
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tpl.name}</span>
              </div>
              <div style="font-size:12px;color:#333;max-height:3.6em;overflow:hidden;white-space:pre-wrap;">${tpl.text}</div>
            </div>
            <button class="del-tpl" data-id="${tpl.id}" style="padding:10px 12px;background:#ff5252;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:900;white-space:nowrap;">Delete</button>
          </div>
        </div>`;
      });
    }
    html+=`<div style="display:flex;justify-content:flex-end;margin-top:10px;">
      <button id="close-manage" style="padding:10px 14px;background:#FFD580;border:none;border-radius:10px;cursor:pointer;font-weight:900;">Close</button></div>`;
    content.innerHTML=html; modal.appendChild(content); document.body.appendChild(modal);
    const close=()=>modal.remove();
    content.querySelector('#close-manage').onclick=close; modal.onclick=(e)=>{if(e.target===modal)close();};
    content.querySelectorAll('.del-tpl').forEach(btn=>{
      btn.onclick=()=>{ if(confirm('Delete this template?')){const id=parseInt(btn.dataset.id);const after=list.filter(t=>t.id!==id);localStorage.setItem('ctk_custom_templates',JSON.stringify(after)); alert('Deleted! Close/reopen Toolkit to reload templates.'); close(); }};
    });
  }

  // -------------- scrape --------------
  const storePhoneMap={"Chattanooga TN":"423-241-8687","Cincinnati":"513-991-7207","Georgia":"470-845-2689","Indianapolis":"317-593-5605","Knoxville":"865-419-0919","Long Island":"908-460-9975","Nashville":"615-236-6163","New Jersey":"908-858-5268","San Francisco":"415-796-9036","South Bend":"574-337-3288","Toronto":"877-627-4031","Westchester":"631-319-8317"};
  // v6.1.4 — per-store template overrides. Key = lowercase store, matched as a case-insensitive substring of the
  // detected store name, so ONLY that market sees its override; every other store keeps the default template text.
  const STORE_TEMPLATE_OVERRIDES = {
    toronto: {
      'Cancel/Resch': `Totally understand if this date doesn't work. Quick reminder, this month Buy 1 Get 1 40% Off! Plus No Payments, No Interest for 12 Months. If you need to reschedule, I have tomorrow at 10 AM or 2 PM open. Which works better?`
    }
  };
  const fuzzyPhone=(store)=>storePhoneMap[store]||'513-991-7207';

  function parseStoreFromLabel(val){
    if(!val) return '';
    const clean=val.replace(/\u00a0/g,' ').trim();
    if(clean.includes('-')){const parts=clean.split('-').map(s=>s.trim()).filter(Boolean);return parts[parts.length-1];}
    return clean;
  }
  function watchStoreLabel(){
    const el=document.querySelector('#selectedstorename'); if(!el) return;
    const update=()=>{const v=parseStoreFromLabel(el.textContent||''); if(v&&v.length>1) localStorage.setItem('ctk_store',v);};
    update(); new MutationObserver(update).observe(el,{childList:true,characterData:true,subtree:true});
  }

  // v5.1 FIX — type guards + format validation before trusting window globals
  function getAppointmentFromWindow(){
    try {
      const d = String(window.appointmentdate  || '').trim();
      const t = String(window.appointmenttime  || '').trim();
      // Validate both look like actual date/time strings before combining
      if (d && t && /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(d) && /\d{1,2}:\d{2}/.test(t)) {
        return `${d} at ${t}`;
      }
    } catch(e) {
      console.warn('[CTK] getAppointmentFromWindow error:', e);
    }
    return null;
  }

  // v5.1 FIX — dropped \b anchors on time pattern; \b fails when a space precedes AM/PM
  // Also unified the simple match to use the same validated combo approach
  function scrapeAppointmentFallback(){
    const text = document.body?.innerText || '';

    // Attempt 1: dedicated combo pattern (most reliable)
    const combo = text.match(
      /Appointment\s*(?:Date|Day)[^0-9]*(\d{1,2}\/\d{1,2}\/\d{2,4})[^0-9]*Appointment\s*Time[^0-9]*(\d{1,2}:\d{2}\s?[AaPp][Mm])/i
    );
    if (combo) return `${combo[1]} at ${combo[2]}`;

    // Attempt 2: independent patterns — fixed time regex (no \b, case-insensitive AM/PM)
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    const timeMatch = text.match(/\b((?:1[0-2]|0?[1-9]):[0-5]\d\s?[AaPp][Mm])/);
    if (dateMatch && timeMatch) return `${dateMatch[1]} at ${timeMatch[1]}`;

    return null;
  }

  const splitAppt=(appt)=>{const m=(appt||'').match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s?[AaPp][Mm])$/i);return {date:m?m[1]:'TBD',time:m?m[2]:'TBD'};};

  function collectLeadData(){
    const leadDiv=document.querySelector('#leadinformation');
    const fullName=leadDiv?.querySelector('a')?.textContent?.trim()||'';
    const firstName=fullName.split(' ')[0]||'';
    const address=document.querySelector('.lead-attribute.address')?.textContent?.trim()||'';
    const cityStateZip=document.querySelector('.lead-attribute.city-state-zip')?.textContent?.trim()||'';
    const storeName=localStorage.getItem('ctk_store') || parseStoreFromLabel(document.querySelector('#selectedstorename')?.textContent || '');
    let latestAppointment=getAppointmentFromWindow();
    if(!latestAppointment){
      const histCells=Array.from(document.querySelectorAll('.historycolumn, .history, .timeline, .appointment-history'));
      // v6.1.1 — prefer rows that actually set/assign an appointment (history is newest-first)
      const APPT_LINE=/(?:Set Appointment|Set Via Call|Assigned Appointment|Appointment)[^\d]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s?[AaPp][Mm])/i;
      histCells.some(entry=>{ const m=(entry.textContent||'').match(APPT_LINE); if(m){ latestAppointment=`${m[1]} at ${m[2]}`; return true; } });
      // fallback: any date + time found anywhere in the history
      if(!latestAppointment) histCells.some(entry=>{ const m=(entry.textContent||'').match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s?[AaPp][Mm])/); if(m){ latestAppointment=`${m[1]} at ${m[2]}`; return true; } });
    }
    if(!latestAppointment){
      const apptDate=document.querySelector('.lead-attribute.appointment-date, .appointment-date, [data-appointment-date]')?.textContent?.trim()
                    || document.querySelector('input[name="appointment_date"]')?.value?.trim();
      const apptTime=document.querySelector('.lead-attribute.appointment-time, .appointment-time, [data-appointment-time]')?.textContent?.trim()
                    || document.querySelector('input[name="appointment_time"]')?.value?.trim();
      if(apptDate&&apptTime) latestAppointment=`${apptDate} at ${apptTime}`;
    }
    if(!latestAppointment) latestAppointment=scrapeAppointmentFallback();

    return { firstName, address, cityStateZip, storeName, latestAppointment };
  }

  // -------------- messages --------------
  // v5.1 — emoji removed from all copyable message bodies.
  // The "NOTE:" prefix replaces the "👉" that was causing UCS-2 encoding + carrier issues.
  // UI labels/headers still use emoji (those are never sent).
  function buildMessages(data){
    const { firstName, address, cityStateZip, storeName, latestAppointment } = data;
    const phoneNumber=fuzzyPhone(storeName||'');
    const fullAddress=(address && cityStateZip) ? `${address}, ${cityStateZip}` : '';
    const apptText=latestAppointment || 'TBD';
    const {date:apptDate,time:apptTime}=splitAppt(apptText);

    const msgsText = [
`SD/ND Remind|Renewal by Andersen: This is a friendly reminder about our upcoming meeting. We'll arrive promptly on ${apptText} to discuss your project.
NOTE: Replying STOP will only unsubscribe you from text messages, it will not cancel your appointment. To reschedule or cancel, please call us at ${phoneNumber}`,
`Reply Text|Renewal by Andersen: Hi ${firstName || 'there'}! You have an appointment scheduled with Renewal by Andersen on ${apptText} at ${fullAddress || '[address]'}.
Please reply "C" to confirm.
NOTE: Replying STOP will only unsubscribe you from text messages, it will not cancel your appointment. To reschedule or cancel, please call us at ${phoneNumber}`,
`Thank You|Renewal by Andersen: Thank you for confirming your upcoming appointment with Renewal by Andersen. Please keep in mind this is an in home consultation. We estimate the visit to last between 60-90 minutes and we would be unable to fix or service existing units. If you need to reschedule or modify your appointment, please contact us at ${phoneNumber}. Otherwise, your appointment will remain as scheduled.

We also have an opening in your area today, if you are home and available, feel free to let us know and we'll get you rescheduled with a design consultant today!`,
`Cancel/Resch|Totally understand if this date doesn't work. Quick reminder, this month you save $365 on Windows & $900 on Doors +No Interest for 3 Years. If you need to reschedule, I have tomorrow at 10 AM or 2 PM open. Which works better?`,
`Missing Info|Action Required: Before assigning your design consultant, we need to verify some details about your project to ensure it fits within our scope of work and to make the best use of your time. [Enter project question when you paste into Text Request extension].`,
`Please Call|Renewal by Andersen: Hello ${firstName || 'there'}, this is Renewal by Andersen reaching out in regards to your upcoming scheduled appointment. We would need to speak with you briefly regarding your appointment. Please give us a call at ${phoneNumber}.
NOTE: Replying STOP will only unsubscribe you from text messages, it will not cancel your appointment. To reschedule or cancel, please call us at ${phoneNumber}`
    ];
    // v6.1.4 — apply any per-store overrides for this market before rendering the built-in templates
    const _sk = String(storeName||'').toLowerCase();
    const _ovKey = Object.keys(STORE_TEMPLATE_OVERRIDES).find(k=>_sk.includes(k));
    const _ov = _ovKey ? STORE_TEMPLATE_OVERRIDES[_ovKey] : null;
    const msgs = msgsText.map(s=>{const [title,...rest]=s.split('|');const base=rest.join('|');return {title, text:(_ov && _ov[title]!=null) ? _ov[title] : base};});

    const list=JSON.parse(localStorage.getItem('ctk_custom_templates')||'[]');
    list.forEach(tpl=>{
      const txt=(tpl.text||'')
        .replace(/{firstName}/g, firstName || 'there')
        .replace(/{appointment}/g, apptText)
        .replace(/{date}/g, apptDate)
        .replace(/{time}/g, apptTime)
        .replace(/{address}/g, fullAddress || '[address]')
        .replace(/{phone}/g, phoneNumber)
        .replace(/{store}/g, storeName || 'your area');
      msgs.push({ title:tpl.name, text:txt, color:tpl.color||'#E0F7FA', isCustom:true });
    });

    return {messages:msgs, storeName:storeName || 'Unknown Store'};
  }

  // -------------- UI --------------
  function showToolkit(messages, storeName){
    const existing=document.querySelector('.ctk-popup'); if(existing) existing.remove();
    // v6.1 — toolkit is open now: remember state + hide the launcher button
    localStorage.setItem('ctk_open','true');
    const _fab=document.querySelector('.ctk-fab'); if(_fab) _fab.style.display='none';
    const savedW=localStorage.getItem('ctk_w')||'';
    const savedH=localStorage.getItem('ctk_h')||'';
    const th=activeTheme();
    const neonGlow = themeName==='neon' ? `, 0 0 14px ${th.glow}AA, 0 0 26px ${th.glow}80, 0 0 42px ${th.glow}4D` : '';
    const strongRing = th.accentRing;

    const sizeMap={small:'320px',medium:'400px',large:'480px'};
    const widthMap={compact:'280px',normal:sizeMap[currentSize],wide:'520px'};
    const width=widthMap[currentWidth]||sizeMap[currentSize];

    const fs = (()=>{
      if(currentSize==='small') return {header:14,body:12,label:11,btn:14};
      if(currentSize==='large') return {header:17,body:14,label:13,btn:15};
      return {header:15,body:13,label:12,btn:15};
    })();
    const pad=currentSize==='small'?8: currentSize==='large'?10:8;
    const pad2=currentSize==='small'?10: currentSize==='large'?12:10;

    const style=document.createElement('style');
    style.textContent=`
      .ctk-popup{--scale:${clamp(scale,MIN_SCALE,MAX_SCALE)};
        position:fixed;left:${localStorage.getItem('ctk_left')||'30px'};top:${localStorage.getItem('ctk_top')||'80px'};
        width:${width};background:${th.mainBg};border:1px solid ${th.border};border-radius:${th.radius}px;
        box-shadow:0 12px 30px rgba(0,0,0,.22);font-family:${th.font};color:${th.text};
        z-index:999999;display:flex;flex-direction:column;overflow:hidden;max-height:calc(100vh - 16px);transform:scale(var(--scale));transform-origin:top left;
      }
      .ctk-popup, .ctk-popup *{box-sizing:border-box}

      ${themeName==='win98'?`
        .ctk-btn, .quick-chip, .section, .note-area { border-width:2px !important; border-radius:0 !important; }
        .ctk-btn, .quick-chip { background:${th.buttonBg}; border:2px solid ${th.border}; box-shadow:inset 1px 1px #fff, inset -1px -1px #4a4a4a; }
        .section { background:${th.sectionBg}; border:2px solid ${th.border}; box-shadow:inset 1px 1px #fff, inset -1px -1px #4a4a4a; }
      `:`
        .ctk-btn, .quick-chip, .section, .note-area { border-radius:${th.radius}px; }
        .ctk-btn, .quick-chip { box-shadow:0 1px 0 ${strongRing}33, 0 0 0 2px ${strongRing}22 inset${neonGlow}; }
        .ctk-btn:hover{ box-shadow:0 2px 0 ${strongRing}3b, 0 0 0 2px ${strongRing}55 inset${neonGlow}; }
      `}

      ${themeName==='enabled'?`
        .ctk-btn, .quick-chip, .copy-btn, .footer button {
          background:${th.btnFace};
          color:${th.buttonTx};
          border:1px solid #7A7A7A;
          border-radius:6px;
          box-shadow:inset 1px 1px ${th.btnHighlight}, inset -1px -1px ${th.btnShadow};
        }
        .ctk-btn:hover, .quick-chip:hover, .copy-btn:hover, .footer button:hover {
          outline:1px solid ${th.hoverOutline};
          box-shadow:inset 1px 1px ${th.btnHoverHL}, inset -1px -1px ${th.btnShadow}, 0 0 0 2px ${th.hoverGlow}55;
        }
      `:''}

      .ctk-header{
        padding:${pad}px ${pad+42}px ${pad}px ${pad+2}px;background:${th.headerBg};color:${th.headerTx};
        font-size:${fs.header}px;font-weight:900;position:sticky;top:0;z-index:5;cursor:grab;
        transition:filter .15s ease, box-shadow .15s ease;
      }
      .ctk-header:hover{
        filter:brightness(1.05);
        box-shadow: inset 0 -2px 0 ${themeName==='enabled' ? BRAND_BLUE : strongRing}70;
      }
      .ctk-close{position:absolute;right:12px;top:6px;cursor:pointer;font-weight:900;font-size:${currentSize==='small'?18:20}px;color:${th.headerTx};z-index:6;}

      .ctk-settings-toggle{padding:${pad}px ${pad+2}px;background:${th.textBg};border-top:1px solid ${th.border};border-bottom:1px solid ${th.border};
        cursor:pointer;font-size:${fs.label}px;font-weight:800;color:${th.text};display:flex;justify-content:space-between;align-items:center;}
      .ctk-settings{display:${settingsVisible?'block':'none'};flex:2 1 auto;min-height:0;overflow-y:auto;padding:${pad2}px ${pad2+2}px;background:${th.textBg};border-bottom:1px solid ${th.border};}

      .ctk-body{flex:1 1 auto;min-height:0;background:${th.mainBg};overflow-x:hidden;overflow-y:auto;}
      .ctk-body.scroll{overflow-y:auto;}

      .ctk-group{margin:12px 0}
      .ctk-group-title{font-weight:900;margin:0 0 8px 0;font-size:${fs.label}px;text-transform:uppercase;letter-spacing:.3px}
      .ctk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      @media (max-width:430px){ .ctk-grid{grid-template-columns:repeat(2,1fr);} }

      .ctk-btn{height:44px;width:100%;display:inline-flex;align-items:center;justify-content:center;
        padding:6px 10px;background:${th.buttonBg};border:1px solid ${strongRing};cursor:pointer;
        font-size:${fs.btn}px;font-weight:900;color:${th.buttonTx||idealText(th.buttonBg)};
        transition:transform .06s ease, filter .12s ease; user-select:none; white-space:normal; line-height:1.15; text-align:center; overflow-wrap:break-word;}
      .ctk-btn:active{transform:scale(0.98)}
      .ctk-btn.active{outline:2px solid ${strongRing}99}

      /* v5.1 — SMS Safe active state: amber tint to signal mode is on */
      .ctk-btn.sms-safe-active{
        background:#FFF3CD !important;
        color:#5C3D00 !important;
        outline:2px solid #F0A500 !important;
      }

      .mgr-msg-box{margin:12px;background:${th.accentBg};border:1px solid ${th.border};}
      .mgr-msg-header{padding:${pad}px ${pad+2}px;background:${th.accentHd};color:${idealText(th.accentHd)};font-weight:900;}
      .mgr-msg-text{padding:${pad2}px ${pad2+2}px;font-size:${fs.body}px;line-height:1.45;background:${th.sectionBg};border-top:1px solid ${th.border};white-space:pre-wrap;color:${th.text};}
      .mgr-msg-meta{padding:8px 12px;font-size:${fs.label}px;display:flex;justify-content:space-between;color:${th.text};}

      .quick-label{padding:${pad}px ${pad+2}px;background:${th.textBg};border-bottom:1px solid ${th.border};font-size:${fs.label}px;font-weight:900;text-align:center;}
      .quick-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;padding:12px;background:${th.textBg};border-bottom:1px solid ${th.border};}
      .quick-chip{height:44px;display:flex;align-items:center;justify-content:center;padding:6px 10px;background:${th.sectionBg};border:1px solid ${strongRing};text-align:center;cursor:pointer;font-size:${fs.btn}px;font-weight:800;color:${th.text};}
      .quick-chip:hover{background:${th.buttonBg};color:${th.buttonTx||idealText(th.buttonBg)};}
      .quick-chip.copied{outline:2px solid ${strongRing}}

      .note-toggle{padding:${pad}px ${pad+2}px;background:${th.textBg};border-top:1px solid ${th.border};border-bottom:1px solid ${th.border};cursor:pointer;
        font-size:${fs.label}px;font-weight:900;display:flex;justify-content:space-between;align-items:center;}
      .note-wrap{display:block;background:${th.mainBg};}
      .note-area{width:calc(100% - 24px);margin:8px 12px 12px 12px;border:1px solid ${strongRing};background:${th.sectionBg};color:${themeName==='enabled'?th.sectionTx:th.text};
        min-height:120px;padding:10px;resize:vertical;font: normal 11px/1.35 Tahoma,Verdana,Segoe UI,system-ui,sans-serif;overflow-x:hidden;}

      .sections-toggle{padding:${pad2}px ${pad2+2}px;background:${th.textBg};border-bottom:1px solid ${th.border};cursor:pointer;font-size:${fs.label}px;font-weight:900;text-align:center;}
      .sections{display:${sectionsExpanded?'block':'none'};padding:12px;background:${th.mainBg};}
      .section{margin-bottom:12px;border:1px solid ${strongRing};overflow:hidden;background:${th.sectionBg};}
      .section-header{padding:${pad}px ${pad+2}px;font-weight:900;display:flex;justify-content:space-between;align-items:center;font-size:${fs.body}px;border-bottom:1px solid ${th.border};}
      .section-text{padding:${pad2}px ${pad2+2}px;background:${th.textBg};font-size:${fs.body}px;line-height:1.45;white-space:pre-wrap;color:${th.text};}
      .copy-btn{height:36px;padding:0 12px;background:${th.buttonBg};border:1px solid ${strongRing};cursor:pointer;font-size:${fs.btn}px;font-weight:900;color:${th.buttonTx||idealText(th.buttonBg)};}

      .footer{padding:${pad2}px ${pad2+2}px;border-top:1px solid ${th.border};background:${th.footerBg};display:flex;justify-content:space-between;align-items:center;gap:10px;}
      .footer a{font-size:${fs.label}px;color:${th.footerTx};text-decoration:underline;}
      .footer button{height:36px;padding:0 14px;background:${th.buttonBg};border:1px solid ${strongRing};cursor:pointer;font-weight:900;font-size:${fs.body}px;color:${th.buttonTx||idealText(th.buttonBg)};}

      .ctk-resize { position:absolute; right:8px; bottom:8px; width:16px; height:16px; cursor:nwse-resize; z-index:7; }
      .ctk-resize::before{
        content:""; position:absolute; inset:0;
        background:repeating-linear-gradient(135deg,#cacaca 0 2px,#8b8b8b 2px 4px);
        clip-path:polygon(100% 0, 0 100%, 100% 100%);
        border-radius:2px; opacity:.95; filter:drop-shadow(0 1px 0 rgba(0,0,0,.28));
      }
      .ctk-resize:hover{transform:scale(1.06);}

      /* v6.1 — free resize handles on every edge + corner */
      .ctk-rh{position:absolute;z-index:8;}
      .ctk-rh-n{top:-3px;left:10px;right:10px;height:7px;cursor:ns-resize;}
      .ctk-rh-s{bottom:-3px;left:10px;right:10px;height:7px;cursor:ns-resize;}
      .ctk-rh-e{right:-3px;top:10px;bottom:10px;width:7px;cursor:ew-resize;}
      .ctk-rh-w{left:-3px;top:10px;bottom:10px;width:7px;cursor:ew-resize;}
      .ctk-rh-ne{top:-4px;right:-4px;width:14px;height:14px;cursor:nesw-resize;}
      .ctk-rh-nw{top:-4px;left:-4px;width:14px;height:14px;cursor:nwse-resize;}
      .ctk-rh-sw{bottom:-4px;left:-4px;width:14px;height:14px;cursor:nesw-resize;}
      .ctk-rh-se{bottom:0;right:0;width:18px;height:18px;cursor:nwse-resize;}
      .ctk-rh-se::before{content:"";position:absolute;inset:5px 5px auto auto;width:11px;height:11px;background:repeating-linear-gradient(135deg,${th.border} 0 2px,transparent 2px 4px);clip-path:polygon(100% 0,0 100%,100% 100%);opacity:.85;}

      /* v5.1 — TBD date warning badge */
      .ctk-tbd-warn{
        margin:8px 12px 0 12px;padding:6px 10px;
        background:#FFF3CD;border:1px solid #F0A500;border-radius:6px;
        font-size:${fs.label}px;font-weight:800;color:#5C3D00;
      }
    `;
    document.head.appendChild(style);

    const popup=document.createElement('div'); popup.className='ctk-popup';
    if(savedW) popup.style.width=savedW;
    if(savedH) popup.style.height=savedH;

    const setScale=(s)=>{
      scale = clamp(parseFloat(s||1), MIN_SCALE, MAX_SCALE);
      popup.style.setProperty('--scale', scale);
      localStorage.setItem('ctk_scale', String(scale));
      const sv=document.getElementById('scale-val'); if(sv) sv.textContent=scale.toFixed(1);
    };

    // Header
    const header=document.createElement('div'); header.className='ctk-header';
    const storeLabel=document.querySelector('#selectedstorename');
    let userName='', greeting='';
    if (storeLabel){
      const text=storeLabel.textContent.replace(/\u00a0/g,' ').trim();
      const parts=text.split('-').map(s=>s.trim());
      if(parts.length>=2){ const fullName=parts[1]; userName=(fullName.split(' ')[0]||''); const h=new Date().getHours(); greeting=h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening'; }
    }
    header.innerHTML=`
      <div style="font-weight:900;">Confirmation Toolkit ${CTK_VER} • ${storeName}</div>
      ${userName?`<div style="margin-top:4px;font-size:${fs.label}px;font-weight:700;opacity:.95;">${greeting}, ${userName}!</div>`:''}
      <span class="ctk-close" title="Close">✕</span>`;
    popup.appendChild(header);
    header.querySelector('.ctk-close').onclick=()=>{ if(messageTimer) clearInterval(messageTimer); localStorage.setItem('ctk_open','false'); popup.remove(); const f=document.querySelector('.ctk-fab'); if(f){ f.style.display='flex'; } else { showFab(); } };
    header.addEventListener('mouseup',()=>{ document.querySelectorAll('.ctk-btn').forEach(b=>b.classList.remove('active')); });

    // Settings toggle
    const settingsToggle=document.createElement('div'); settingsToggle.className='ctk-settings-toggle';
    settingsToggle.innerHTML=`<span>Settings</span><span>${settingsVisible?'▲':'▼'}</span>`;
    settingsToggle.onclick=()=>{ settingsVisible=!settingsVisible; localStorage.setItem('ctk_settings',settingsVisible); popup.remove(); setTimeout(()=>showToolkit(messages,storeName),10); };
    popup.appendChild(settingsToggle);

    // Settings content
    const settings=document.createElement('div'); settings.className='ctk-settings';
    settings.innerHTML=`
      <div class="ctk-group">
        <div class="ctk-group-title">Mode</div>
        <div class="ctk-grid">
          <button class="ctk-btn ${themeMode==='light'?'active':''}" data-mode="light">Light</button>
          <button class="ctk-btn ${themeMode==='dark'?'active':''}"  data-mode="dark">Dark</button>
        </div>
      </div>

      <div class="ctk-group">
        <div class="ctk-group-title">Theme</div>
        <div class="ctk-grid">
          <button class="ctk-btn ${themeName==='enabled'?'active':''}"  data-theme="enabled">Enabled+</button>
          <button class="ctk-btn ${themeName==='rba'?'active':''}"      data-theme="rba">RbA</button>
          <button class="ctk-btn ${themeName==='win98'?'active':''}"    data-theme="win98">Win98</button>
          <button class="ctk-btn ${themeName==='cosmic'?'active':''}"   data-theme="cosmic">Cosmic</button>
          <button class="ctk-btn ${themeName==='neon'?'active':''}"     data-theme="neon">Neon</button>
          <button class="ctk-btn ${themeName==='lava'?'active':''}"     data-theme="lava">Lava</button>
          <button class="ctk-btn ${themeName==='evergreen'?'active':''}"data-theme="evergreen">Evergreen</button>
          <button class="ctk-btn ${themeName==='ocean'?'active':''}"    data-theme="ocean">Ocean</button>
          <button class="ctk-btn ${themeName==='plum'?'active':''}"     data-theme="plum">Plum</button>
          <button class="ctk-btn ${themeName==='dracula'?'active':''}"  data-theme="dracula">Dracula</button>
        </div>
      </div>

      <div class="ctk-group">
        <div class="ctk-group-title">Layout</div>
        <div class="ctk-grid">
          <button class="ctk-btn ${currentSize==='small'?'active':''}"  data-size="small">Text-S</button>
          <button class="ctk-btn ${currentSize==='medium'?'active':''}" data-size="medium">Text-M</button>
          <button class="ctk-btn ${currentSize==='large'?'active':''}"  data-size="large">Text-L</button>
          <button class="ctk-btn ${currentWidth==='compact'?'active':''}" data-width="compact">Width-S</button>
          <button class="ctk-btn ${currentWidth==='normal'?'active':''}"  data-width="normal">Width-M</button>
          <button class="ctk-btn ${currentWidth==='wide'?'active':''}"    data-width="wide">Width-L</button>
          <button class="ctk-btn" id="scale-dec">Scale -</button>
          <button class="ctk-btn" id="scale-inc">Scale +</button>
          <button class="ctk-btn" id="scale-reset">Reset Scale</button>
          <div style="display:flex;align-items:center;justify-content:center;font-weight:900;">x<span id="scale-val">${scale.toFixed(1)}</span></div>
        </div>
      </div>

      <div class="ctk-group">
        <div class="ctk-group-title">Sound</div>
        <div class="ctk-grid">
          <button class="ctk-btn ${soundEnabled?'active':''}" id="sound-toggle">${soundEnabled?'On':'Off'}</button>
          <button class="ctk-btn ${soundType==='chime'?'active':''}" data-sound="chime">Chime</button>
          <button class="ctk-btn ${soundType==='ping'?'active':''}"  data-sound="ping">Ping</button>
          <button class="ctk-btn ${soundType==='bell'?'active':''}"  data-sound="bell">Bell</button>
        </div>
      </div>

      <div class="ctk-group">
        <div class="ctk-group-title">SMS</div>
        <div class="ctk-grid" style="grid-template-columns:1fr 2fr;">
          <button class="ctk-btn ${smsSafe?'sms-safe-active':''}" id="sms-safe-toggle">${smsSafe?'SMS Safe: ON':'SMS Safe: OFF'}</button>
          <div style="font-size:${fs.label}px;padding:4px 6px;line-height:1.4;color:${th.text};opacity:.8;">
            Strips emoji from copied text. Use if messages are splitting or failing to deliver.
          </div>
        </div>
      </div>

      <div class="ctk-group">
        <div class="ctk-group-title">Templates</div>
        <div class="ctk-grid">
          <button class="ctk-btn" id="add-tpl">Add Template</button>
          <button class="ctk-btn" id="manage-tpl">Manage Templates</button>
        </div>
      </div>`;
    popup.appendChild(settings);

    const rerender=()=>{ popup.remove(); setTimeout(()=>showToolkit(messages,storeName),10); };
    settings.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{ themeMode=b.dataset.mode; localStorage.setItem('ctk_theme_mode',themeMode); rerender(); }));
    settings.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>{ themeName=b.dataset.theme; localStorage.setItem('ctk_theme_name',themeName); rerender(); }));
    settings.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{ currentSize=b.dataset.size; localStorage.setItem('ctk_size',currentSize); rerender(); }));
    settings.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>{ currentWidth=b.dataset.width; localStorage.setItem('ctk_width',currentWidth); rerender(); }));
    settings.querySelector('#sound-toggle').addEventListener('click',function(){ soundEnabled=!soundEnabled; localStorage.setItem('ctk_sound',soundEnabled); this.textContent=soundEnabled?'On':'Off'; this.classList.toggle('active'); playSound(); });
    settings.querySelectorAll('[data-sound]').forEach(b=>b.addEventListener('click',()=>{ soundType=b.dataset.sound; localStorage.setItem('ctk_sound_type',soundType); playSound(); rerender(); }));
    settings.querySelector('#add-tpl').addEventListener('click',showAddTemplateModal);
    settings.querySelector('#manage-tpl').addEventListener('click',showManageTemplatesModal);
    settings.querySelector('#scale-dec').addEventListener('click',()=> setScale(scale - STEP));
    settings.querySelector('#scale-inc').addEventListener('click',()=> setScale(scale + STEP));
    settings.querySelector('#scale-reset').addEventListener('click',()=> setScale(1));

    // v5.1 — SMS Safe toggle handler (no full rerender needed, just update state + button label/class)
    settings.querySelector('#sms-safe-toggle').addEventListener('click', function(){
      smsSafe = !smsSafe;
      localStorage.setItem('ctk_sms_safe', smsSafe);
      this.textContent = smsSafe ? 'SMS Safe: ON' : 'SMS Safe: OFF';
      if (smsSafe) { this.classList.add('sms-safe-active'); }
      else         { this.classList.remove('sms-safe-active'); }
    });

    // Body
    const body=document.createElement('div'); body.className='ctk-body'; popup.appendChild(body);

    // v5.1 — TBD warning badge if date couldn't be scraped
    const apptCheck = messages[0]?.text || '';
    if (apptCheck.includes('TBD')) {
      const warn = document.createElement('div');
      warn.className = 'ctk-tbd-warn';
      warn.textContent = 'Warning: Appointment date/time not found. Verify before sending.';
      body.appendChild(warn);
    }

    // v6.3.0 — MSG Confirm button removed; replaced by Pull Up Form button at the bottom

    // Manager message
    const msgBox=document.createElement('div'); msgBox.className='mgr-msg-box';
    msgBox.innerHTML=`<div class="mgr-msg-header">Today's Message</div>
      <div class="mgr-msg-text"></div>
      <div class="mgr-msg-meta"><span class="mgr-msg-from"></span><span class="mgr-msg-time"></span></div>`;
    body.appendChild(msgBox);
    const cached=JSON.parse(localStorage.getItem('ctk_mgr_cache')||'null');
    if (cached && cached.text){
      msgBox.style.display='block';
      msgBox.querySelector('.mgr-msg-text').textContent=cached.text;
      msgBox.querySelector('.mgr-msg-from').textContent=cached.from||'Manager';
      msgBox.querySelector('.mgr-msg-time').textContent=cached.timestamp||new Date().toLocaleString();
    }

    // Quick Copy
    const quickLabel=document.createElement('div'); quickLabel.className='quick-label'; quickLabel.textContent='Quick Copy';
    const chips=document.createElement('div'); chips.className='quick-chips';
    messages.forEach(msg=>{
      const chip=document.createElement('div'); chip.className='quick-chip'; chip.textContent=msg.title;
      chip.addEventListener('click',()=>{
        // v5.1 — run through safeCopy so SMS Safe strips emoji when active
        navigator.clipboard.writeText(safeCopy(msg.text));
        chip.classList.add('copied'); chip.textContent='Copied!';
        setTimeout(()=>{ chip.classList.remove('copied'); chip.textContent=msg.title; },900);
        playSound();
      });
      chips.appendChild(chip);
    });
    // v6.2.4 — MSG Confirm moved out of Quick Copy to the top button (see above)

    body.appendChild(quickLabel); body.appendChild(chips);

    // v6.5.0 — Quick Forms: same chip styling as Quick Copy, sits directly beneath it
    const formsLabel = document.createElement('div');
    formsLabel.className = 'quick-label';
    formsLabel.textContent = 'Quick Forms';
    const formChips = document.createElement('div');
    formChips.className = 'quick-chips';

    const puChip = document.createElement('div');
    puChip.className = 'quick-chip ctk-pullup-chip';
    puChip.textContent = 'Pull Up Form';
    puChip.title = 'Open a pre-filled Pull Up Request for this lead';
    puChip.style.cssText = 'background:#0B4DA2;color:#fff;border-color:#093c7d;font-weight:800;';
    puChip.addEventListener('click', () => { showPullUpForm(puChip); playSound(); });
    formChips.appendChild(puChip);

    const obChip = document.createElement('div');
    obChip.className = 'quick-chip ctk-ob-chip';
    obChip.textContent = 'OB Form';
    obChip.title = 'Open a pre-filled OB Set submission for this lead';
    obChip.style.cssText = 'background:#0E7A0D;color:#fff;border-color:#0b5f0a;font-weight:800;';
    obChip.addEventListener('click', () => { showOBForm(obChip); playSound(); });
    formChips.appendChild(obChip);

    const csChip = document.createElement('div');
    csChip.className = 'quick-chip ctk-cs-chip';
    csChip.textContent = 'Cancel Save';
    csChip.title = 'Open a pre-filled Same Day Cancel Save for this lead';
    csChip.style.cssText = 'background:#B00020;color:#fff;border-color:#8a0018;font-weight:800;';
    csChip.addEventListener('click', () => { showCancelSaveForm(csChip); playSound(); });
    formChips.appendChild(csChip);

    const calChip = document.createElement('div');
    calChip.className = 'quick-chip ctk-cal-chip';
    calChip.textContent = 'Cancelled Lead';
    calChip.title = 'Open a pre-filled Cancelled Assigned Lead form for this lead';
    calChip.style.cssText = 'background:#6B21A8;color:#fff;border-color:#55198a;font-weight:800;';
    calChip.addEventListener('click', () => { showCancelledLeadForm(calChip); playSound(); });
    formChips.appendChild(calChip);

    const arcChip = document.createElement('div');
    arcChip.className = 'quick-chip ctk-arc-chip';
    arcChip.textContent = 'Result Change';
    arcChip.title = 'Open a pre-filled Appointment Result Change request for this lead';
    arcChip.style.cssText = 'background:#B45309;color:#fff;border-color:#8a3f07;font-weight:800;';
    arcChip.addEventListener('click', () => { showApptResultChangeForm(arcChip); playSound(); });
    formChips.appendChild(arcChip);

    const rtrChip = document.createElement('div');
    rtrChip.className = 'quick-chip ctk-rtr-chip';
    rtrChip.textContent = 'Rep to Result';
    rtrChip.title = 'Open a pre-filled Rep to Result request for this lead';
    rtrChip.style.cssText = 'background:#0F766E;color:#fff;border-color:#0b5a54;font-weight:800;';
    rtrChip.addEventListener('click', () => { showRepToResultForm(rtrChip); playSound(); });
    formChips.appendChild(rtrChip);

    body.appendChild(formsLabel); body.appendChild(formChips);

    // v7.3.2 — "E+ Quick Click" group (under Quick Forms): green MSG Confirm -> pop-up reminder, then Enable+ Message-Confirm (no monday form)
    const eqcLabel=document.createElement('div'); eqcLabel.className='quick-label'; eqcLabel.textContent='E+ Quick Click';
    const eqcChips=document.createElement('div'); eqcChips.className='quick-chips';
    const eqcMsg=document.createElement('div'); eqcMsg.className='quick-chip'; eqcMsg.textContent='MSG Confirm';
    eqcMsg.title='Confirm pop-up, then runs Enable+ Message-Confirm';
    eqcMsg.style.cssText='background:#009612;color:#fff;border-color:#009612;font-weight:900;';
    eqcMsg.addEventListener('click',()=>doEnableMsgConfirm(eqcMsg));
    eqcChips.appendChild(eqcMsg);
    body.appendChild(eqcLabel); body.appendChild(eqcChips);

    // Notepad
    const noteToggle=document.createElement('div'); noteToggle.className='note-toggle'; noteToggle.innerHTML=`<span>Notepad</span><span class="note-chevron">${notesOpen?'▼':'▶'}</span>`;
    const noteWrap=document.createElement('div'); noteWrap.className='note-wrap';
    const noteArea=document.createElement('textarea'); noteArea.className='note-area';
    const leadKey=(()=>{ const id=document.querySelector('#leadid, .lead-id')?.textContent?.trim(); return 'ctk_notes_'+(id || (location.pathname+location.search)); })();
    noteArea.value=localStorage.getItem(leadKey)||'';
    let noteTimer=null; noteArea.addEventListener('input',()=>{ clearTimeout(noteTimer); noteTimer=setTimeout(()=>localStorage.setItem(leadKey,noteArea.value),300); });
    noteWrap.style.display=notesOpen?'block':'none';
    noteToggle.addEventListener('click',()=>{ notesOpen=!notesOpen; localStorage.setItem('ctk_notes_open',notesOpen); noteWrap.style.display=notesOpen?'block':'none'; setScrollMode(); });
    noteWrap.appendChild(noteArea);
    body.appendChild(noteToggle); body.appendChild(noteWrap);

    // Full templates toggle
    const sectionsToggle=document.createElement('div'); sectionsToggle.className='sections-toggle';
    sectionsToggle.textContent = `${sectionsExpanded?'▼':'▶'} ${sectionsExpanded?'Hide':'Show'} Full Templates`;
    sectionsToggle.addEventListener('click',()=>{ sectionsExpanded=!sectionsExpanded; localStorage.setItem('ctk_sections',sectionsExpanded); popup.remove(); setTimeout(()=>showToolkit(messages,storeName),10); });
    body.appendChild(sectionsToggle);

    const headerPalettes={
      cosmic:['#7C3AED','#22D3EE','#F43F5E','#A78BFA','#F59E0B','#10B981'],
      neon:['#00FFFF','#39FF14','#FF00FF','#FFD700','#00BFFF','#FF1493'],
      lava:['#EF4444','#F97316','#FB7185','#EA580C','#DC2626','#F59E0B'],
      evergreen:['#2E7D32','#16A34A','#65A30D','#059669','#84CC16','#34D399'],
      ocean:['#0277BD','#3AA0FF','#22D3EE','#60A5FA','#06B6D4','#0EA5E9'],
      plum:['#B26CE0','#7C3AED','#EF4444','#F59E0B','#22C55E','#60A5FA'],
      dracula:['#bd93f9','#ff79c6','#8be9fd','#50fa7b','#ffb86c','#ff5555'],
      rba:['#5C9443','#79AE5E','#22C55E','#84CC16','#06B6D4','#F59E0B'],
      enabled:[BRAND_BLUE, BRAND_RED, '#0E7A0D', '#84CC16', '#0284C7', BRAND_YELLOW],
      win98:['#000080','#008080','#800000','#808000','#4B0082','#2F4F4F']
    };
    const palette=headerPalettes[themeName]||headerPalettes.rba;

    const sections=document.createElement('div'); sections.className='sections';
    let idx=0;
    messages.forEach(msg=>{
      const color = msg.isCustom ? (msg.color||palette[ idx++ % palette.length]) : palette[ idx++ % palette.length ];
      const section=document.createElement('div'); section.className='section';
      const sh = document.createElement('div'); sh.className='section-header'; sh.style.background=color; sh.style.color=idealText(color);
      const title  = document.createElement('span'); title.textContent = msg.title;
      const copyB  = document.createElement('button'); copyB.className='copy-btn'; copyB.textContent='Copy';
      // v5.1 — safeCopy applied here too
      copyB.addEventListener('click',()=>{ navigator.clipboard.writeText(safeCopy(msg.text)); playSound(); });
      sh.appendChild(title); sh.appendChild(copyB);

      const textDiv = document.createElement('div'); textDiv.className='section-text';
      textDiv.textContent = msg.text;

      section.appendChild(sh); section.appendChild(textDiv);
      sections.appendChild(section);
    });
    body.appendChild(sections);

    // v6.5.0 — Pull Up Form moved up into the new "Quick Forms" section (see above)

    // Footer
    const footer=document.createElement('div'); footer.className='footer';
    footer.innerHTML=`<a href="${FEEDBACK_FORM_URL}" target="_blank">Feedback</a><button type="button">Contact</button>`;
    footer.querySelector('button').onclick=()=>{ location.href='mailto:gjohnston@rbacentralnj.com?subject=Confirmation%20Toolkit%20Support'; };
    popup.appendChild(footer);

    // Drag
    let dragging=false, offsetX=0, offsetY=0;
    header.addEventListener('mousedown',(e)=>{ if(e.target.classList.contains('ctk-close')) return; dragging=true; const r=popup.getBoundingClientRect(); offsetX=e.clientX-r.left; offsetY=e.clientY-r.top; e.preventDefault(); header.style.cursor='grabbing'; });
    document.addEventListener('mousemove',(e)=>{ if(!dragging) return; const r=popup.getBoundingClientRect(); const left=Math.max(0,Math.min(e.clientX-offsetX,window.innerWidth-r.width)); const top=Math.max(0,Math.min(e.clientY-offsetY,window.innerHeight-r.height)); popup.style.left=left+'px'; popup.style.top=top+'px'; localStorage.setItem('ctk_left',left+'px'); localStorage.setItem('ctk_top',top+'px'); });
    document.addEventListener('mouseup',()=>{ dragging=false; header.style.cursor='grab'; });

    // v6.1 — free resize from any edge or corner (replaces the old scale-only grip)
    const RH=[['n',{n:1}],['s',{s:1}],['e',{e:1}],['w',{w:1}],['ne',{n:1,e:1}],['nw',{n:1,w:1}],['sw',{s:1,w:1}],['se',{s:1,e:1}]];
    let rz=null;
    RH.forEach(([name,dirs])=>{
      const h=document.createElement('div'); h.className='ctk-rh ctk-rh-'+name; popup.appendChild(h);
      h.addEventListener('mousedown',(e)=>{
        e.preventDefault(); e.stopPropagation();
        const cs=getComputedStyle(popup);
        rz={dirs, sx:e.clientX, sy:e.clientY, sw:parseFloat(cs.width), sh:parseFloat(cs.height), sl:parseFloat(cs.left), st:parseFloat(cs.top), s:clamp(scale,MIN_SCALE,MAX_SCALE)};
        document.body.style.userSelect='none';
      });
    });
    document.addEventListener('mousemove',(e)=>{
      if(!rz) return;
      const dx=e.clientX-rz.sx, dy=e.clientY-rz.sy;
      let w=rz.sw, h=rz.sh;
      if(rz.dirs.e) w=rz.sw+dx/rz.s;
      if(rz.dirs.w) w=rz.sw-dx/rz.s;
      if(rz.dirs.s) h=rz.sh+dy/rz.s;
      if(rz.dirs.n) h=rz.sh-dy/rz.s;
      w=Math.max(240,w); h=Math.max(180,h);
      popup.style.width=w+'px'; popup.style.height=h+'px';
      if(rz.dirs.w) popup.style.left=(rz.sl+(rz.sw-w)*rz.s)+'px';
      if(rz.dirs.n) popup.style.top =(rz.st+(rz.sh-h)*rz.s)+'px';
      body.style.flex='1'; body.style.minHeight='0'; body.style.overflowY='auto';
    });
    document.addEventListener('mouseup',()=>{
      if(!rz) return;
      if(popup.style.width)  localStorage.setItem('ctk_w', parseFloat(popup.style.width)+'px');
      if(popup.style.height) localStorage.setItem('ctk_h', parseFloat(popup.style.height)+'px');
      if(popup.style.left)   localStorage.setItem('ctk_left', popup.style.left);
      if(popup.style.top)    localStorage.setItem('ctk_top', popup.style.top);
      rz=null; document.body.style.userSelect='';
    });

    document.body.appendChild(popup);
    setScale(scale);

    updateMessage();
    if(messageTimer) clearInterval(messageTimer);
    messageTimer=setInterval(updateMessage,MESSAGE_REFRESH_MS);

    function setScrollMode(){
      if (savedH){ body.style.flex='1'; body.style.minHeight='0'; body.style.overflowY='auto'; body.classList.remove('scroll'); return; }
      const collapsed = !settingsVisible && !sectionsExpanded;
      if (collapsed) { body.classList.remove('scroll'); }
      else { body.classList.add('scroll'); }
    }
    setScrollMode();
  }

  // -------------- launcher button (v6.1) --------------
  let CTK_DATA={messages:[],storeName:''};
  function renderIfOpen(){ if(document.querySelector('.ctk-popup')) showToolkit(CTK_DATA.messages, CTK_DATA.storeName); }
  function showFab(){
    if(document.querySelector('.ctk-fab')) return;
    const th=activeTheme();
    const fab=document.createElement('div'); fab.className='ctk-fab'; fab.title='Open Confirmation Toolkit';
    fab.style.cssText='position:fixed;left:'+(localStorage.getItem('ctk_fab_left')||'24px')+';top:'+(localStorage.getItem('ctk_fab_top')||'120px')+';width:54px;height:54px;border-radius:50%;background:'+th.headerBg+';color:'+th.headerTx+';display:'+(localStorage.getItem('ctk_open')==='true'?'none':'flex')+';align-items:center;justify-content:center;cursor:grab;z-index:999998;box-shadow:0 6px 18px rgba(0,0,0,.30);border:2px solid '+th.headerTx+';user-select:none;';
    fab.innerHTML='<span style="font-size:24px;line-height:1;">&#128172;</span>';
    let down=false, moved=false, ox=0, oy=0, dsx=0, dsy=0;
    fab.addEventListener('mousedown',(e)=>{ down=true; moved=false; dsx=e.clientX; dsy=e.clientY; const r=fab.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top; e.preventDefault(); fab.style.cursor='grabbing'; });
    document.addEventListener('mousemove',(e)=>{
      if(!down) return;
      if(Math.abs(e.clientX-dsx)+Math.abs(e.clientY-dsy)>4) moved=true;
      const left=clamp(e.clientX-ox,0,window.innerWidth-fab.offsetWidth);
      const top =clamp(e.clientY-oy,0,window.innerHeight-fab.offsetHeight);
      fab.style.left=left+'px'; fab.style.top=top+'px';
      localStorage.setItem('ctk_fab_left',left+'px'); localStorage.setItem('ctk_fab_top',top+'px');
    });
    document.addEventListener('mouseup',()=>{ if(down){ down=false; fab.style.cursor='grab'; } });
    fab.addEventListener('click',()=>{ if(moved){ moved=false; return; } showToolkit(CTK_DATA.messages, CTK_DATA.storeName); });
    document.body.appendChild(fab);
  }

  // -------------- boot --------------
  function ready(){return !!(document.querySelector('#leadinformation')||document.querySelector('#historydatadiv')||document.querySelector('#scriptdiv')); }
  let booted=false;
  function scrapeAndBuild(){ const d=collectLeadData(); CTK_DATA=buildMessages(d); return d.latestAppointment; }
  function boot(){
    if(booted) return true;
    if(!ready()) return false;
    booted=true;
    watchStoreLabel();
    const appt=scrapeAndBuild();
    showFab();
    if(localStorage.getItem('ctk_open')==='true') showToolkit(CTK_DATA.messages, CTK_DATA.storeName);
    // v6.1.1 — appointment/history can populate a beat after the lead loads; re-scrape until found
    if(!appt){
      let n=0;
      const iv=setInterval(()=>{
        n++;
        if(scrapeAndBuild()){ renderIfOpen(); clearInterval(iv); }
        else if(n>=10){ clearInterval(iv); }
      },1000);
    }
    return true;
  }
  const observer=new MutationObserver(()=>{ if(boot()) observer.disconnect(); });
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(boot,1500);
  setTimeout(()=>{ if(!booted) boot(); },4000);
})();
