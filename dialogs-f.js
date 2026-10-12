// Blackout Party — окна «Меню», «Правила» (с таблицей выплат) и «История»: направление F (выбор владельца 2026-10-11).
// Подключается до ui.js. ui.js зовёт DlgF.menu / DlgF.rules / DlgF.history, если DlgF.on(); логика игры (GS, звук, скорость, реплей, фокус) остаётся в ui.js и приходит через ctx = BPUI().
// Каждое окно — свой shadow DOM со стилями dialogs-f.css: стили игры окон не задевают, а эти — игру. Тексты правил берутся из RULES в ui.js — один источник, ничего не продублировано.
// Вид — один: шрифты набора 2 (Black Ops One мелко + Barlow), разделители — латунная линейка (выбор владельца 2026-10-11), см. dialogs-f.css.
// Переключатели для сравнения (адрес главнее запомненного в этой вкладке; «Экраны макета» и тест-панель запоминают выбор в sessionStorage):
//   ?dlg=old                 — прежние окна-мониторы;
//   ?dlgnav=top|side         — вкладки правил сверху (по умолчанию) или колонкой слева с Рокко.
(()=>{
'use strict';
const SS={get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } },set(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} },del(k){ try{ sessionStorage.removeItem(k); }catch(e){} }};
const QQ=()=>typeof q!=='undefined'&&q&&q.get?q:new URLSearchParams(location.search); // в артефакте адрес приходит через q (index.html?bpv=0b88879c)
const NAVS=['top','side'], DEF_NAV='top';
const pick=(name,list,def)=>{ const v=QQ().get(name)||SS.get('bp-'+name); return list.includes(v)?v:def; };
const cfg=()=>({old:(QQ().get('dlg')||SS.get('bp-dlg'))==='old',nav:pick('dlgnav',NAVS,DEF_NAV)});
const on=()=>!cfg().old;
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- шрифты: Black Ops One, Barlow SC и VT323 уже объявлены в index.html (в shadow DOM @font-face не работает, но семейства из документа доступны) ----------

// ---------- стили окон: текст dialogs-f.css. Локально это <link id="bp-dlgcss" media="not all"> (в документе не действует): текст берём fetch-ем при загрузке страницы.
// В сборке артефакта это <style id="bp-dlgcss" media="not all"> — текст читаем прямо из него. Читать CSSOM (cssRules) нельзя: shorthand с var() сериализуется пустым.
let CSS=null;
(()=>{ const l=document.getElementById('bp-dlgcss'); if(l&&l.tagName==='LINK'&&l.href) fetch(l.href).then(r=>r.ok?r.text():null).then(t=>{ if(t) CSS=t; }).catch(()=>{}); })();
function cssText(){
 if(CSS) return CSS;
 const l=document.getElementById('bp-dlgcss'); if(l&&l.tagName==='STYLE'&&l.textContent.trim()){ CSS=l.textContent; return CSS; }
 return null;
}
const styleHTML=()=>{ const t=cssText(); return t?`<style>${t}</style>`:`<link rel="stylesheet" href="dialogs-f.css">`; };
// «Записка на плите» (plates-note.js, <html data-plates=note>): поверх основных стилей окна добавляется dialogs-f-note.css — тот же приём, что с dialogs-f.css (<link id="bp-dlgnote" media="not all"> или <style id="bp-dlgnote">). В режиме plates=old файл не читается, окна прежние.
let NCSS=null;
(()=>{ const l=document.getElementById('bp-dlgnote'); if(l&&l.tagName==='LINK'&&l.href) fetch(l.href).then(r=>r.ok?r.text():null).then(t=>{ if(t) NCSS=t; }).catch(()=>{}); })();
const noteHTML=()=>{ if(!(window.bpPlates&&window.bpPlates.on())) return ''; let t=NCSS; if(!t){ const l=document.getElementById('bp-dlgnote'); if(l&&l.tagName==='STYLE'&&l.textContent.trim()){ t=NCSS=l.textContent; } } return t?`<style>${t}</style>`:`<link rel="stylesheet" href="dialogs-f-note.css">`; };

// ---------- мелочи ----------
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LONG=()=>{ try{ return !!(typeof CUR!=='undefined'&&CUR&&!window.bpSocial); }catch(e){ return false; } };
const modeNow=()=>innerWidth<600?'phone':innerHeight<520?'land':'desk';
const navNow=c=>c.nav==='side'&&innerWidth>=1100&&innerHeight>=800?'side':'top'; // колонка слева — только на большом экране: на меньших места не хватает, там вкладки сверху
// винт-крестовик (Phillips): выпуклая шляпка с бликом, медный ободок, тень, царапины; крест повёрнут на 45° и читается как «×»
let sid=0;
const screw=()=>{ const n='s'+(++sid);
 return `<svg class="scr" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs>
 <radialGradient id="${n}h" cx="36%" cy="28%" r="85%"><stop offset="0" stop-color="#e2d3b8"/><stop offset=".32" stop-color="#a08e78"/><stop offset=".72" stop-color="#4d3f34"/><stop offset="1" stop-color="#241b16"/></radialGradient>
 <linearGradient id="${n}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4b872"/><stop offset=".45" stop-color="#9a5420"/><stop offset="1" stop-color="#2a1208"/></linearGradient>
 <linearGradient id="${n}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#080403"/><stop offset="1" stop-color="#2c1f17"/></linearGradient></defs>
 <circle cx="16.9" cy="17.8" r="14.2" fill="#000" fill-opacity=".5"/>
 <circle cx="16" cy="16" r="14" fill="url(#${n}r)"/><circle cx="16" cy="16" r="12.3" fill="#190d07"/><circle cx="16" cy="16" r="11.7" fill="url(#${n}h)"/>
 <circle cx="16" cy="16" r="11.7" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width=".7"/>
 <g class="cross" style="transform:rotate(45deg);transform-origin:16px 16px"><rect x="13.3" y="6.3" width="5.4" height="19.4" rx="1.9" fill="url(#${n}s)"/><rect x="6.3" y="13.3" width="19.4" height="5.4" rx="1.9" fill="url(#${n}s)"/>
  <path d="M18.7 8.2v7.6h7" fill="none" stroke="#e8d8bc" stroke-opacity=".38" stroke-width=".8" stroke-linecap="round"/><path d="M13.3 23.8v-7.6H6.6" fill="none" stroke="#000" stroke-opacity=".5" stroke-width=".8" stroke-linecap="round"/></g>
 <ellipse cx="11.4" cy="9.4" rx="4.4" ry="2.1" fill="#fff" fill-opacity=".3" transform="rotate(-34 11.4 9.4)"/>
 <path d="M20.5 24.6l3.1-2.2M9 21.8l1.6 2.4" stroke="#e8d8bc" stroke-opacity=".2" stroke-width=".6" stroke-linecap="round" fill="none"/><circle cx="23.6" cy="12" r=".7" fill="#b4531f" fill-opacity=".7"/></svg>`; };
const IC={
 play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.5v13l10-6.5z"/></svg>',
 arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
 rules:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h11a3 3 0 0 1 3 3V19.5H8a3 3 0 0 1-3-3zM9 9h6M9 13h6"/></svg>',
 table:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16M9 6v12"/></svg>',
 clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>',
 full:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
 chevd:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'};
// суммы: число и код валюты («1,000.00 ARS») — код мельче; в социальном режиме текст правит bpSocialFix ($ → SC)
function moneyH(C,v){ const s=C.money(v), m=/^(.*?)\s+([A-Z]{2,4})$/.exec(s); return m?`<span class="m">${esc(m[1])} <small>${m[2]}</small></span>`:`<span class="m">${esc(s)}</span>`; }
// социальный режим stake.us: правила замены слов и сумм из ui.js (window.bpSocialFix) не видят shadow DOM — применяем сами
function socialize(root){
 if(!(window.bpSocial&&window.bpSocialFix)) return; const fix=window.bpSocialFix;
 const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n; while((n=tw.nextNode())){ if(n.parentElement&&n.parentElement.tagName==='STYLE') continue; const v=fix(n.nodeValue); if(v!==n.nodeValue) n.nodeValue=v; }
 root.querySelectorAll('[aria-label],[title],[alt]').forEach(e=>['aria-label','title','alt'].forEach(a=>{ const v=e.getAttribute(a); if(v){ const f=fix(v); if(f!==v) e.setAttribute(a,f); } })); }
// shadow-корень окна: стили + сцена; возвращает {sh,stage,layer}
function shell(host,popup,extraCss){
 const c=cfg(), sh=host.attachShadow({mode:'open'});
 sh.innerHTML=`${styleHTML()}${extraCss?`<style>${extraCss}</style>`:''}${noteHTML()}<div id="stage" class="${popup?'pop':''}" data-mode="${modeNow()}" data-nav="${navNow(c)}" ${LONG()?' data-long="1"':''}><div class="layer"></div></div>`;
 return {sh,stage:sh.getElementById?sh.getElementById('stage'):sh.querySelector('#stage'),layer:sh.querySelector('.layer')};
}
const frame=(s,title,body,foot)=>`<div class="dlg dlg-${s}" tabindex="-1"><div class="face"><header class="hd"><button type="button" class="x" aria-label="Close">${screw()}</button></header>
 <div class="bd"><div class="ttl"><h2 id="dlgT">${title}</h2></div><div class="dv dt" aria-hidden="true"></div>${body}</div>${foot?'<div class="dv df" aria-hidden="true"></div>'+foot:''}</div></div>`;
// фокус внутри окна: Tab и Shift+Tab ходят по кругу
function trap(sh,onEsc){ sh.addEventListener('keydown',e=>{
 if(e.key==='Tab'){ const f=[...sh.querySelectorAll('button,select,input,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length&&x.tabIndex>=0); if(!f.length) return; const a=sh.activeElement, i=f.indexOf(a);
  if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&(i===f.length-1)){ e.preventDefault(); f[0].focus(); } else if(i<0){ e.preventDefault(); (e.shiftKey?f[f.length-1]:f[0]).focus(); } } }); }
const rise=el=>{ if(!RM()) el.animate([{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'none'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'}); };
// размер и режим при повороте экрана и изменении окна
function follow(host,stage){ const f=()=>{ if(!host.isConnected){ removeEventListener('resize',f); return; } stage.dataset.mode=modeNow(); stage.dataset.nav=navNow(cfg()); }; addEventListener('resize',f); }

// ---------- меню: выезжает из кнопки ≡ на пульте (место, направление и время — как в игре) ----------
function menu(C,b){
 const GS=C.GS, c=cfg(), m=document.createElement('div'); m.id='bp-menu'; m.setAttribute('role','dialog'); m.setAttribute('aria-label','Menu'); m._ret=b; m.dataset.f='1';
 Object.assign(m.style,{background:'none',boxShadow:'none',padding:'0',borderRadius:'0',width:'auto',maxHeight:'none',overflow:'visible',border:'0',color:'inherit'});
 const {sh,stage,layer}=shell(m,true);
 const vol=(k,lab)=>`<div class="row vol"><label class="lb" for="v-${k}">${lab}</label><input type="range" id="v-${k}" data-k="${k}" min="0" max="100" step="10" value="${GS[k]}" style="--n:${GS[k]}"><output for="v-${k}">${GS[k]}%</output></div>`;
 const spd=[['normal','Normal'],['quick','Quick'],['turbo','Turbo']].map(([v,t])=>`<button type="button" data-spd="${v}" aria-pressed="${GS.speed===v}">${t}</button>`).join('');
 const go=[['rules','Rules',IC.rules],['pay','Paytable',IC.table],['hist','History',IC.clock],['fs','Fullscreen',IC.full]].map(([g,t,i])=>`<button type="button" class="go" data-go="${g}"><span class="gi">${i}</span><span class="gt">${t}</span></button>`).join('');
 const body=`<div class="m-cols"><section class="m-set" aria-label="Settings">
   <div class="row sw"><span class="lb" id="l-snd">Sound</span><button type="button" class="tg" role="switch" aria-checked="${!GS.mute}" aria-labelledby="l-snd"><i></i><span class="tgt">${GS.mute?'Off':'On'}</span></button></div>
   ${vol('music','Music')}${vol('sfx','Effects')}
   <div class="row spd"><span class="lb" id="l-spd">Speed</span><div class="seg" role="group" aria-labelledby="l-spd">${spd}</div></div>
   <div class="row lng"><label class="lb" for="lang">Language</label><span class="sel"><select id="lang"><option>English</option></select>${IC.chevd}</span></div></section>
  <nav class="m-go" aria-label="Game information">${go}</nav></div>`;
 layer.innerHTML=frame('menu','Menu',body).replace('<div class="dlg dlg-menu"','<div class="dlg dlg-menu'+(GS.mute?' muted':'')+'"');
 socialize(sh); document.body.append(m);
 const dlg=layer.querySelector('.dlg'), mw=m.offsetWidth, mode=stage.dataset.mode; let mh=m.offsetHeight;
 const pod=document.getElementById('pod').getBoundingClientRect(), W=innerWidth, H=innerHeight, E=C.popEdge?C.popEdge():{t:8,r:8,b:8,l:8}; // выдвигается из верхнего края пульта; E — край экрана не ближе выреза, углов и полосы «домой» (ui.js popEdge)
 if(mh>H-E.t-E.b){ dlg.style.maxHeight=(H-E.t-E.b)+'px'; mh=m.offsetHeight; } // меню выше безопасной области (маленький телефон боком): тело меню листается, а не уходит под полосу «домой»
 if(mode==='land'){ const br=b.getBoundingClientRect(); m.style.left=Math.max(E.l,pod.left-mw+6)+'px'; m.style.top=Math.max(E.t,Math.min(H-mh-E.b,br.bottom-mh))+'px'; } // лёжа пульт — колонка справа: меню выезжает влево из-под него
 else { m.style.left=Math.max(E.l,Math.min(W-mw-E.r,pod.left+8))+'px'; m.style.top=Math.max(E.t,pod.top-mh+6)+'px'; }
 if(!C.RM()){
  const kf=mode==='land'?[{clipPath:`inset(0 ${mw}px 0 0)`,transform:`translateX(${mw}px)`},{clipPath:'inset(0 0 0 0)',transform:'translateX(0px)'}]:[{clipPath:`inset(0 0 ${mh}px 0)`,transform:`translateY(${mh}px)`},{clipPath:'inset(0 0 0px 0)',transform:'translateY(0px)'}];
  m.animate(kf,{duration:340,easing:'cubic-bezier(.2,.8,.3,1)'}); // видна только часть над краем пульта
  // экран включается, как в игре: светлая линия, потом раскрывается и остывает. Раскрытие и яркость идут одной кривой с плавной остановкой (раньше раскрытие обрывалось на полном ходу, а яркость доезжала отдельно: скачки скорости на кадрах 0,25 и 0,7)
  const bd=layer.querySelector('.bd'), E='cubic-bezier(.2,.8,.25,1)';
  bd.animate([{clipPath:'inset(49.5% 0 49.5% 0)'},{clipPath:'inset(49.5% 0 49.5% 0)',offset:.22,easing:E},{clipPath:'inset(0 0 0 0)'}],{duration:320});
  bd.animate([{filter:'brightness(3)'},{filter:'brightness(3)',offset:.22,easing:E},{filter:'brightness(1)'}],{duration:320}); }
 m.style.zIndex=50; document.getElementById('pod').style.zIndex=60; // пульт поверх — окно будто выезжает из него
 const setMute=off=>{ GS.mute=off; const tg=sh.querySelector('.tg'); tg.setAttribute('aria-checked',String(!off)); tg.querySelector('.tgt').textContent=window.bpSocialFix&&window.bpSocial?window.bpSocialFix(off?'Off':'On'):(off?'Off':'On'); dlg.classList.toggle('muted',off); }; // при OFF громкости серые (main d3ea8af)
 sh.addEventListener('click',e=>{ const t=e.target;
  if(t.closest('.x')){ C.popOut(m); C.syncHUD(); b.focus(); return; }
  const sp=t.closest('[data-spd]'); if(sp){ GS.speed=sp.dataset.spd; sh.querySelectorAll('[data-spd]').forEach(x=>x.setAttribute('aria-pressed',String(x===sp))); C.syncHUD(); return; }
  if(t.closest('.tg')){ setMute(!GS.mute); C.save(); return; }
  const g=t.closest('[data-go]'); if(g){ const k=g.dataset.go;
   if(k==='fs'){ const d=document.documentElement; try{ (document.fullscreenElement||document.webkitFullscreenElement?(document.exitFullscreen||document.webkitExitFullscreen).call(document):(d.requestFullscreen||d.webkitRequestFullscreen).call(d))?.catch?.(()=>{}); }catch(err){} return; }
   C.setRet(m._ret); m.remove(); if(k==='rules') C.rules(); if(k==='pay') C.rules('pay'); if(k==='hist') C.history(); C.syncHUD(); } });
 sh.addEventListener('input',e=>{ const r=e.target; if(r.type==='range'){ GS[r.dataset.k]=+r.value; r.style.setProperty('--n',r.value); r.nextElementSibling.textContent=r.value+'%'; if(GS.mute) setMute(false); C.save(); } }); // сдвинул громкость при OFF — звук включается
 trap(sh); setTimeout(()=>dlg.focus({preventScroll:true}),30); follow(m,stage); C.syncHUD();
}

// ---------- правила ----------
const GROUPS={pay:'Game',counter:'Features',max:'Info'}; // подписи групп в колонке слева (?dlgnav=side)
function paneHTML(C,k,next){
 const r=C.RULES[k]; let h=r[2]();
 if(r[0]==='pay') h=h.replace('<table>','<table class="pay">');
 if(r[0]==='rtp') h=h.replace('<table>','<table class="rtp">');
 if(r[0]==='counter') h=h.replace(/<div class="ladder">[\s\S]*?<\/div>/,m=>m.replace(/×/g,'<span class="xs">×</span>'));
 h=h.replace(/<td class="n">[^<]*<\/td>/g,m=>m.replace(/×/g,'<span class="xs">×</span>')); // × в VT323 похож на X
 const ill=r[0]==='kitchen'?`<img class="ill" src="${C.A}ill-mode-kitchen.webp" alt="" width="384" height="340">`:r[0]==='cameras'?`<img class="ill" src="${C.A}ill-mode-cameras.webp" alt="" width="384" height="372">`:'';
 const nx=C.RULES[k+1];
 return `<h3 class="ph">${esc(r[1])}</h3><div class="pb">${ill}${h}</div>${nx?`<button type="button" class="next" data-t="${k+1}"><span>Next</span><b>${esc(nx[1])}</b>${IC.arrow}</button>`:''}`; }
function rules(C,start){
 const R=C.RULES; let idx=Math.max(0,R.findIndex(r=>r[0]===(start||'how')));
 const w=C.el('div','bp-wrap'); w.setAttribute('role','dialog'); w.setAttribute('aria-modal','true'); w.setAttribute('aria-label','Game rules'); C.takeRet(w);
 const {sh,stage,layer}=shell(w,false);
 let tabs='', open=false; R.forEach((r,k)=>{ const g=GROUPS[r[0]]; if(g){ if(open) tabs+='</span></span>'; tabs+=`<span class="grp" role="presentation"><span class="gl" aria-hidden="true">${g}</span><span class="gg" role="presentation">`; open=true; }
  tabs+=`<button type="button" class="tab" role="tab" id="tab-${k}" data-t="${k}" aria-selected="false" aria-controls="pane" tabindex="-1"><span class="n" aria-hidden="true">${String(k+1).padStart(2,'0')}</span><span class="t">${esc(r[1])}</span></button>`; });
 if(open) tabs+='</span></span>';
 const body=`<div class="r-wrap"><div class="lcol"><nav class="tabs" role="tablist" aria-label="Rules sections">${tabs}</nav><div class="fill" aria-hidden="true"><i class="glow"></i><img src="${C.A}uikit/rocco-hall-still.webp" alt="" width="294" height="656"></div></div>
  <div class="dv dn" aria-hidden="true"></div><section class="pane" id="pane" role="tabpanel" tabindex="0"></section></div>`;
 const foot=`<footer class="ft"><span>RTP 96.0%</span><i aria-hidden="true"></i><span>Max win ${C.MAXX.toLocaleString('en-US')}×</span></footer>`;
 layer.innerHTML=frame('rules','Rules',body,foot);
 const pane=sh.querySelector('.pane'), dlg=layer.querySelector('.dlg');
 const show=(k,fx)=>{ idx=(k+R.length)%R.length;
  sh.querySelectorAll('.tab').forEach((t,m)=>{ const on=m===idx; t.setAttribute('aria-selected',String(on)); t.tabIndex=on?0:-1; });
  pane.setAttribute('aria-labelledby','tab-'+idx); pane.innerHTML=paneHTML(C,idx); socialize(pane); pane.scrollTop=0;
  const on=sh.querySelector('.tab[aria-selected=true]'); on.scrollIntoView({block:'nearest',inline:'nearest'});
  if(fx&&!C.RM()) pane.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'}); };
 const close=e=>{ if(w.dataset.out) return; C.winOut(w); C.syncHUD(); if(e&&e.detail===0) C.giveBack(w); }; w.close=close;
 sh.addEventListener('click',e=>{ const t=e.target;
  if(t.closest('.x')){ close(e); return; }
  const tb=t.closest('[data-t]'); if(tb){ const nxt=tb.classList.contains('next'); show(+tb.dataset.t,true); (nxt?pane:sh.querySelector('.tab[aria-selected=true]')).focus({preventScroll:true}); } });
 w.addEventListener('click',e=>{ if(e.composedPath()[0]===w) close(); }); // клик мимо окна
 sh.addEventListener('keydown',e=>{ const t=e.target.closest&&e.target.closest('[role=tab]');
  if(t&&['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)){ e.preventDefault(); const i=+t.dataset.t; const j=e.key==='Home'?0:e.key==='End'?R.length-1:(i+(/Right|Down/.test(e.key)?1:-1)+R.length)%R.length; show(j,true); sh.querySelector('.tab[aria-selected=true]').focus({preventScroll:true}); } });
 trap(sh); document.body.append(w); show(idx,false); socialize(sh); rise(dlg); follow(w,stage);
 setTimeout(()=>dlg.focus({preventScroll:true}),30);
}

// ---------- история ----------
function history(C){
 const H=C.GS.hist, w=C.el('div','bp-wrap'); w.setAttribute('role','dialog'); w.setAttribute('aria-modal','true'); w.setAttribute('aria-label','History'); C.takeRet(w);
 const {sh,stage,layer}=shell(w,false);
 const rows=H.map((h,n)=>`<li class="hr${h.win>0?' win':''}"><span class="tm">${esc(h.t)}</span><span class="mo">${esc(h.mode)}</span><span class="nums"><span class="bt" data-l="Bet">${moneyH(C,h.cost)}</span><span class="wn" data-l="Win">${moneyH(C,h.win)}</span></span>
  ${h.norep?'<span class="rp none" aria-hidden="true">—</span>':`<button type="button" class="rp" data-r="${n}" aria-label="Replay round of ${esc(h.t)}">${IC.play}<span>Replay</span></button>`}</li>`).join('');
 const body=H.length?`<div class="h-wrap"><div class="hh" aria-hidden="true"><span>Time</span><span>Mode</span><span>Bet</span><span>Win</span><span></span></div><ol class="hl" tabindex="0" aria-label="Last rounds">${rows}</ol></div>`:`<div class="h-wrap"><p class="empty">No rounds yet. Press Play.</p></div>`;
 layer.innerHTML=frame('hist','History',body,`<footer class="ft"><span>Last ${H.length} rounds</span></footer>`);
 const dlg=layer.querySelector('.dlg');
 const close=e=>{ if(w.dataset.out) return; C.winOut(w); C.syncHUD(); if(e&&e.detail===0) C.giveBack(w); }; w.close=close;
 sh.addEventListener('click',e=>{ const t=e.target; if(t.closest('.x')){ close(e); return; }
  const b=t.closest('[data-r]'); if(b){ const h=H[+b.dataset.r]; C.winOut(w); C.syncHUD(); C.startReplay(h); } });
 w.addEventListener('click',e=>{ if(e.composedPath()[0]===w) close(); });
 trap(sh); document.body.append(w); socialize(sh); rise(dlg); follow(w,stage); setTimeout(()=>dlg.focus({preventScroll:true}),30);
}

// ---------- выбор вариантов (меню «Экраны макета», тест-панель): запоминаем в этой вкладке и показываем окно правил ----------
function setPick(k,v){ const name={dlg:'bp-dlg',nav:'bp-dlgnav'}[k]; if(!name) return; if(v==null||v==='') SS.del(name); else SS.set(name,v); }
window.bpDlgPick=(k,v)=>{ setPick(k,v); const u=new URL(location.href); ['dlg','dlgnav'].forEach(n=>u.searchParams.delete(n)); const p='?state=idle&screen=rules'; // адрес с параметрами главнее запомненного — убираем
 if(typeof goQ==='function') goQ(p); else { u.search=p; location.href=u.toString(); } };
window.DlgF={on,cfg,menu,rules,history,pick:setPick,NAVS,DEF_NAV,
 shell,frame,trap,rise,follow,socialize,screw,moneyH,modeNow,esc,IC}; // shell, frame, trap, … — оболочка для других окон F (описание — в начале dialogs-f.css)
})();
