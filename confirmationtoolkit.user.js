// ==UserScript==
// @name         Confirmation Text Toolkit 6.1
// @namespace    http://tampermonkey.net/
// @version      6.1.1
// @description  Date/time regex fixes, emoji-safe copy, SMS Safe toggle, Dracula theme, draggable launcher + free resize.
// @author       James (maintained by RBA Central NJ)
// @updateURL    https://raw.githubusercontent.com/MortemFlora/Confirm-ToolkitV6.0/main/confirmationtoolkit.user.js
// @downloadURL  https://raw.githubusercontent.com/MortemFlora/Confirm-ToolkitV6.0/main/confirmationtoolkit.user.js
// @match        https://www.enabledplus.com/*
// @grant        GM_xmlhttpRequest
// @connect      gist.githubusercontent.com
// @run-at       document-start
// ==/UserScript==

/* ──────────────────────────────────────────────────────────────────────────
   RBA CENTRAL NJ — maintenance notes (added when reviving James's toolkit)
   Configured for github.com/MortemFlora/Confirm-ToolkitV6.0 (auto-updates
        from the raw file on branch main; bump @version to push team updates).
        Contact button emails gjohnston@rbacentralnj.com (change anytime). Feedback link -> app.tinypulse.com.
   Left intentionally unchanged from James's original:
     - the daily "Today's Message" feed (MANAGER_MESSAGE_URL)
   ────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';
  console.log('✅ Toolkit v6.1.1 Loading…');

  const FEEDBACK_FORM_URL   = 'https://app.tinypulse.com';
  const MANAGER_MESSAGE_URL = 'https://gist.githubusercontent.com/ConfirmationMGR/423dcb2729326738bd4f1e8df1754701/raw/manager-message.json';
  const MESSAGE_REFRESH_MS  = 60_000;

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
`Cancel/Resch|I completely understand if you need to reschedule, but I did want to remind you that we have some great promotions this month which our design consultant would love to discuss with you. If you can't make your current appointment, I have openings tomorrow at 10 AM or 2 PM. Which time works better for you?`,
`Missing Info|Action Required: Before assigning your design consultant, we need to verify some details about your project to ensure it fits within our scope of work and to make the best use of your time. [Enter project question when you paste into Text Request extension].`,
`Please Call|Renewal by Andersen: Hello ${firstName || 'there'}, this is Renewal by Andersen reaching out in regards to your upcoming scheduled appointment. We would need to speak with you briefly regarding your appointment. Please give us a call at ${phoneNumber}.
NOTE: Replying STOP will only unsubscribe you from text messages, it will not cancel your appointment. To reschedule or cancel, please call us at ${phoneNumber}`
    ];
    const msgs = msgsText.map(s=>{const [title,...rest]=s.split('|');return {title,text:rest.join('|')};});

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
      <div style="font-weight:900;">Confirmation Toolkit 6.1 • ${storeName}</div>
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
    body.appendChild(quickLabel); body.appendChild(chips);

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
