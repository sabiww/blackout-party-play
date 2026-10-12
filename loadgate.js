// Blackout Party — порядок загрузки и «ворота первого спина» (fb/perf, 2026-10-12).
// Зачем: владелец в артефакте (iframe claude.ai) не видел части анимаций. Первые спины шли раньше, чем скачались ролики Рокко (1–4 МБ каждый),
// и код честно брал запасной путь без ролика (глотание — без пасти, бросок — без руки, радость — без ролика). Теперь:
//  1. к первому спину сначала качаются ролики Рокко, которые нужны сразу (ui.js mount → BPLoad.need('rocco', …)), потом звуки (audio.js → need('audio', …)),
//     остальное (лапа, ролики Big Win) — после ворот: BPLoad.whenOpen(kind, fn, задержка);
//  2. первый Play, пока ролики не пришли, не теряется: спин ждёт (BPLoad.hold) и тонкая плашка внизу показывает ход загрузки; потолок ожидания — 10 с, дальше играем что успело;
//  3. на экране приветствия ролики и звуки зала докачиваются в кэш (BPLoad.prefetch), к нажатию PLAY они уже на месте;
//  4. «Меньше движения» в системе (Windows: «Показывать анимацию» выключено, экономия заряда) тихо отключает ВСЕ ролики и анимации — в макете это выглядело как «нет анимаций».
//     Плашка в углу сообщает об этом и одной кнопкой включает полное движение на эту вкладку (sessionStorage bp-motion=full; адрес ?motion=full / ?motion=system).
// Ворота выключаются адресом ?nogate=1, счётом без анимаций (window.__sim) и под автотестами (navigator.webdriver; ?gate=1 их возвращает).
(()=>{
'use strict';
const T0=performance.now(), CAP=10000, RCAP=7000, ASOFT=2500; // потолки (мс): общий, для роликов Рокко, для звуков после роликов
const qs=(()=>{ try{ return new URLSearchParams(location.search); }catch(e){ return new URLSearchParams(''); } })();
const ss={ get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} } };

// ---- 4. полное движение по просьбе владельца ----
const RMQ=/prefers-reduced-motion/;
const sysRM=(()=>{ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
{ const m=qs.get('motion'); if(m==='full') ss.set('bp-motion','full'); else if(m==='system') { try{ sessionStorage.removeItem('bp-motion'); }catch(e){} } }
const FULL=sysRM&&ss.get('bp-motion')==='full';
if(FULL){
 const mm0=window.matchMedia.bind(window);
 window.matchMedia=function(s){ if(typeof s==='string'&&RMQ.test(s)){ const reduce=/:\s*reduce/.test(s); const fake={ matches:!reduce, media:s, onchange:null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){ return false; } }; return fake; } return mm0(s); };
 // CSS: правила @media (prefers-reduced-motion: reduce) гасим (media → not all), у открытых и появляющихся позже таблиц стилей
 const kill=sheet=>{ let rules; try{ rules=sheet.cssRules; }catch(e){ return; } if(!rules) return; for(const r of rules){ try{ if(r.type===4&&r.media&&RMQ.test(r.conditionText||r.media.mediaText)&&/reduce/.test(r.media.mediaText)) r.media.mediaText='not all'; else if(r.cssRules&&r.type!==4) kill(r); }catch(e){} } };
 const all=()=>{ for(const s of document.styleSheets) kill(s); };
 document.addEventListener('DOMContentLoaded',all); addEventListener('load',()=>{ all(); setTimeout(all,1500); });
 new MutationObserver(ms=>{ for(const m of ms) for(const n of m.addedNodes) if(n.tagName==='STYLE'&&n.sheet) kill(n.sheet); }).observe(document.documentElement,{childList:true,subtree:true});
 document.documentElement.setAttribute('data-motion','full');
}

// ---- 1–2. ворота ----
const G={ rocco:{n:0,k:0,open:false,sealed:false,cb:[]}, audio:{n:0,k:0,open:false,sealed:false,cb:[]} };
const held=new Set(); let pill=null, shown=false, passive=0, allOpen=false;
const force=qs.get('gate')==='1'||ss.get('bp-gate')==='1'; // автотесты (navigator.webdriver) ворота обходят, чтобы не менять их ожидания; ?gate=1 или sessionStorage bp-gate=1 включает их и под автоматикой
const off=()=>!!(qs.get('nogate')==='1'||window.__sim||(navigator.webdriver&&!force));
const total=()=>G.rocco.n+G.audio.n, got=()=>G.rocco.k+G.audio.k;
function paint(){ if(!pill) return; pill.firstChild.textContent=G.rocco.open?'Loading sounds…':'Loading Rocco…'; const t=total(), g=got(); pill.querySelector('b').textContent=t?`${Math.min(g,t)}/${t}`:''; pill.querySelector('i').style.transform=`scaleX(${t?Math.min(1,g/t):.05})`; }
function showPill(){ if(shown||allOpen) return; shown=true;
 if(!document.getElementById('bp-load-css')){ const s=document.createElement('style'); s.id='bp-load-css'; s.textContent='#bp-load{position:fixed;left:50%;bottom:max(14px,var(--sa-b,0px));transform:translateX(-50%);z-index:400;display:flex;align-items:center;gap:10px;padding:8px 14px 11px;border-radius:6px;background:rgba(14,8,5,.92);color:#F0D890;font:700 12px/1 var(--ui,system-ui,sans-serif);letter-spacing:.12em;text-transform:uppercase;box-shadow:0 0 0 1px rgba(201,138,44,.7),0 6px 18px rgba(0,0,0,.5);pointer-events:none;overflow:hidden}#bp-load b{font-weight:700;opacity:.8;min-width:2.4em;text-align:right}#bp-load i{position:absolute;left:0;right:0;bottom:0;height:3px;background:#FFC861;transform-origin:0 50%;transform:scaleX(.05);transition:transform .25s ease-out}'; document.head.append(s); }
 pill=document.createElement('div'); pill.id='bp-load'; pill.setAttribute('role','status'); pill.innerHTML='<span>Loading Rocco…</span><b></b><i></i>'; (document.body||document.documentElement).append(pill); paint(); }
function hidePill(){ shown=false; if(pill){ pill.remove(); pill=null; } }
function opened(kind){ const g=G[kind]; if(g.open) return; g.open=true; g.cb.splice(0).forEach(f=>f()); paint();
 if(kind==='rocco'&&!G.audio.open) setTimeout(()=>opened('audio'),ASOFT); // звуки ждём не дольше ASOFT после роликов (остальные догрузятся во время первого спина); не зарегистрировались (выключены, нет контекста) — тоже открываем
 if(G.rocco.open&&G.audio.open&&!allOpen){ allOpen=true; clearTimeout(passive); hidePill(); const fs=[...held]; held.clear(); fs.forEach(f=>setTimeout(f,0)); } }
function check(kind){ const g=G[kind]; if(!g.open&&g.sealed&&g.k>=g.n) opened(kind); }
function need(kind,promise){ const g=G[kind]; if(!g||g.open) return; g.n++; Promise.resolve(promise).catch(()=>{}).then(()=>{ g.k++; paint(); check(kind); }); }
function seal(kind){ const g=G[kind]; if(!g) return; g.sealed=true; check(kind); }
// kind: 'rocco' | 'audio'; fn запускается, когда ворота этого вида открыты (+ delay мс); ворота закрыты — ждём (потолок CAP страхует)
function whenOpen(kind,fn,delay){ const g=G[kind], run=()=>setTimeout(fn,delay||0); if(g&&!g.open) g.cb.push(run); else run(); }
function hold(fn){ if(off()||allOpen) return false; held.add(fn); showPill(); return true; }
setTimeout(()=>{ if(!G.rocco.sealed&&G.rocco.n===0) opened('rocco'); },2000);  // на странице нет Рокко (экран, Камеры) — ждать нечего
setTimeout(()=>opened('rocco'),RCAP);                                         // потолок для роликов: дальше идут звуки и игра, что успело — то успело
setTimeout(()=>{ opened('rocco'); opened('audio'); },CAP);                    // общий потолок первого спина
passive=setTimeout(()=>{ if(!allOpen&&total()) showPill(); },1800);         // загрузка затянулась — плашка и без нажатия Play

// ---- 3. докачка в кэш (экран приветствия) ----
function prefetch(urls,gap){ if(!urls||!urls.length) return; const L=urls.slice(); const next=()=>{ const u=L.shift(); if(!u) return; const done=()=>setTimeout(next,gap||150);
  try{ fetch(u,{priority:'low'}).then(r=>r.ok?r.blob():null).then(done,done); }catch(e){ done(); } };
 (window.requestIdleCallback?requestIdleCallback:f=>setTimeout(f,800))(next,{timeout:2500}); }

// ---- 4. плашка про «меньше движения» ----
function motionNote(){ if(!sysRM||FULL||ss.get('bp-motion-note')==='1') return;
 const mk=()=>{ if(document.getElementById('bp-mnote')) return; const d=document.createElement('div'); d.id='bp-mnote'; d.setAttribute('role','status');
  d.innerHTML='<span>Your system asks for reduced motion, so Rocco and effects are switched off.</span><button type="button" data-a="on">Show all animations</button><button type="button" data-a="x" aria-label="Close">×</button>';
  const s=document.createElement('style'); s.textContent='#bp-mnote{position:fixed;left:max(10px,var(--sa-l,0px));bottom:max(10px,var(--sa-b,0px));z-index:401;display:flex;align-items:center;gap:10px;max-width:min(560px,calc(100vw - 20px));padding:8px 10px 8px 14px;border-radius:6px;background:rgba(14,8,5,.95);color:#efe4c8;font:600 13px/1.3 var(--ui,system-ui,sans-serif);box-shadow:0 0 0 1px rgba(201,138,44,.7),0 6px 18px rgba(0,0,0,.5)}#bp-mnote button{flex:none;min-height:34px;padding:0 12px;border:0;border-radius:4px;background:#F0D890;color:#2a0f06;font:700 12px var(--ui,system-ui,sans-serif);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}#bp-mnote button[data-a=x]{background:none;color:#d8cba8;font-size:18px;padding:0 8px}';
  d.append(s); d.addEventListener('click',e=>{ const a=e.target.closest('button')&&e.target.closest('button').dataset.a; if(a==='on'){ ss.set('bp-motion','full'); location.reload(); } else if(a==='x'){ ss.set('bp-motion-note','1'); d.remove(); } });
  (document.body||document.documentElement).append(d); };
 if(document.body) mk(); else addEventListener('DOMContentLoaded',mk); }
motionNote();

window.BPLoad={ need, seal, whenOpen, hold, prefetch, isOpen:()=>allOpen, state:()=>({rocco:{...G.rocco,cb:0},audio:{...G.audio,cb:0},allOpen,ms:Math.round(performance.now()-T0),full:FULL,sysRM}) };
})();
