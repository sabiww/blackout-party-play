// Blackout Party — скрытая тестовая панель (2026-10-10). Макет, не игра.
// Включается только флагом: адрес ?test=1 (?test=0 выключает) или sessionStorage 'bp-test'='1' (в артефакте — кнопка «Тест-панель» в «Экранах макета» → bpTestToggle()).
// Без флага ничего не рисует и ничего не меняет в игре. Подключать обычным <script> в <head>, раньше ui.js (нужен ранний перехват пробела).
// Нужен крючок из ui.js: window.bpTest={startBonus,startCameras,save,syncHUD}; общее состояние — window.bpTime.GS.
(()=>{
'use strict';
const FLAG='bp-test', OPEN='bp-test-open', RESET='bp-reset';
const ss={ get:k=>{ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set:(k,v)=>{ try{ sessionStorage.setItem(k,v); }catch(e){} }, del:k=>{ try{ sessionStorage.removeItem(k); }catch(e){} } };

// «Сбросить игру»: очищаем сохранение уже на новой странице, ДО того как ui.js его прочитает (старая страница могла бы успеть записать его заново)
if(ss.get(RESET)){ ss.del(RESET); ss.del('bp-ui'); ss.del('bp-q'); }
try{ const t=new URLSearchParams(location.search).get('test'); if(t==='1') ss.set(FLAG,'1'); else if(t==='0') ss.del(FLAG); }catch(e){}
const on=()=>ss.get(FLAG)==='1';

// Пробел на кнопке панели (фокус с клавиатуры) не должен крутить игру: слушатель игры висит на window в фазе перехвата, наш зарегистрирован раньше (скрипт в <head>)
addEventListener('keydown',e=>{ if(e.code==='Space'&&e.target&&e.target.closest&&e.target.closest('#bp-test')) e.stopImmediatePropagation(); },true);

// ---------- seed для «Следующего спина» ----------
// Найдены перебором раундов без анимаций (зал, режим не выбран; tools/rtp_sim/find_seeds.js); подобраны заново 2026-10-13 под математику 2.0.0 (новая таблица выплат и веса). Раньше — 2026-10-12 (ветка fb/rebalance: новая таблица выплат и вес WILD в зале поменяли почти все раунды; до этого 2026-10-11, ветка fb/kitchen-rules: новые правила WILD, PAY и веса символов; поиск — быстрый порт движка, сверенный с ui.js по seed). Исход от ставки не зависит (проверено: $0,10 / $1 / $100 — одинаковые итоги в × ставки),
// но зависит от режима: при включённом «Двойном приглашении» тот же seed даёт другой раунд — панель предупреждает.
// [seed, что получится]
const SEEDS={
 steals:[[11,'2 кражи, выигрыш ×2,4'],[13,'3 кражи, выигрыш ×2,81'],[17,'3 кражи, выигрыш ×4,01'],[2432362,'4 кражи, выигрыш ×7,02'],[4671992,'4 кражи, выигрыш ×7,68']],
 big:[[375,'большой выигрыш ×24,66 (глава 10×)'],[453,'большой выигрыш ×18,68 (глава 10×)'],[528,'большой выигрыш ×13,36 (глава 10×)'],[649,'большой выигрыш ×23,45 (глава 10×)'],[54,'большой выигрыш ×26,97 (глава 25×)'],[196,'большой выигрыш ×29,83 (глава 25×)']],
 inv:[[4751,'3 приглашения и 2 кражи (×1,1) → Кухня'],[2528,'3 приглашения и 3 кражи (×1,12) → Кухня'],[1909,'3 приглашения и 1 кража (×0,18) → Кухня'],[3195,'3 приглашения и 1 кража (×0,14) → Кухня'],[1181,'3 приглашения, без выигрыша → Кухня'],[1726,'3 приглашения, без выигрыша → Кухня']],
 inv4:[[8208,'4 приглашения → Камеры'],[12416,'4 приглашения и 1 кража → Камеры'],[16293,'4 приглашения и 1 кража → Камеры'],[25555,'4 приглашения и 5 краж → Камеры']],
 punch:[[54,'удар на ×8 → столбец WILD, 5 краж, выигрыш ×26,97'],[196,'удар на ×8 → столбец WILD, 5 краж, выигрыш ×29,83'],[375,'удар на ×8 → столбец WILD, 5 краж, выигрыш ×24,66'],[453,'удар на ×8 → столбец WILD, 5 краж, выигрыш ×18,68'],[528,'удар на ×8 → столбец WILD, 5 краж, выигрыш ×13,36']],
 toss:[[11,'подброс WILD на ×3 → 2 кражи, выигрыш ×2,4'],[13,'подброс WILD на ×3 → 3 кражи, выигрыш ×2,81'],[17,'подброс WILD на ×3 → 3 кражи, выигрыш ×4,01'],[20,'подброс WILD на ×3 → 3 кражи, выигрыш ×4,42'],[22,'подброс WILD на ×3 → 3 кражи, выигрыш ×1,9']]
};
const NEXT=[ // кнопка → набор seed, подпись кнопки
 ['steals','Следующий спин: выигрыш со 2–4 кражами'],
 ['big','Следующий спин: большой выигрыш (≥10×)'],
 ['inv','Следующий спин: 3 приглашения'],
 ['inv4','Следующий спин: 4 приглашения → Камеры'],
 ['punch','Следующий спин: Удар Рокко (столбец WILD)'],
 ['toss','Следующий спин: Подброс WILD']];
const idx={}; // по какому кругу идём: каждое нажатие берёт следующий seed набора

// ---------- действия ----------
const T=()=>window.bpTest||{};
const GS=()=>window.bpTime&&window.bpTime.GS;
const SC=()=>{ try{ return typeof scene==='string'?scene:'hall'; }catch(e){ return 'hall'; } }; // общая переменная index.html
const SCN={hall:'зал',kitchen:'кухня',cameras:'камеры'};
const nav=p=>{ if(typeof goQ==='function') goQ(p); else location.search=p; };
const bal1000=()=>window.bpMoney?window.bpMoney.bal(1000):'$1,000'; // 1000 макета в валюте страницы (money.js: знак, знаки после запятой, ?cur= ?scale= ?social=)
const act={
 k10(){ if(!T().startBonus) return no(); say('Кухня — идём в кухню…'); T().startBonus(10,null,null,'kitchen'); },
 c10(){ if(!T().startCameras) return no(); say('Камеры: 4 приглашения — идём в охрану…'); T().startCameras(); },
 buyk(){ if(!T().buySpin) return no(); if(SC()!=='hall'){ say('Покупка — только в зале.'); return; } say('Покупка «Кухни»: вступительный спин с 3 приглашениями…'); T().buySpin('kitchen',0); },
 buyc(){ if(!T().buySpin) return no(); if(SC()!=='hall'){ say('Покупка — только в зале.'); return; } say('Покупка «Камер»: вступительный спин с 4 приглашениями…'); T().buySpin('cameras',0); },
 bal(){ const g=GS(); if(!g||!T().save) return no(); g.bal=1000; T().save(); T().syncHUD&&T().syncHUD(); say('Баланс: '+bal1000()); },
 reset(){ ss.set(RESET,'1'); say('Сбрасываем игру…'); const p='?state=idle'; if(window.SceneTrans) SceneTrans.go(p,()=>nav(p)); else nav(p); },
 next(key){ const n=NEXT.find(x=>x[0]===key), L=SEEDS[key]; if(!n) return;
  if(SC()!=='hall'){ say('«Следующий спин» работает только в зале.'); return; }
  if(!L.length){ say('Для этой кнопки пока нет seed.'); return; }
  const i=idx[key]=((idx[key]==null?-1:idx[key])+1)%L.length, [seed,what]=L[i];
  window.__seeds=[seed]; // runRound берёт seed из очереди; «Следующий» — один спин
  let m=false; try{ m=typeof modeOn!=='undefined'&&modeOn; }catch(e){}
  say(`Следующий спин — ${what} (${i+1} из ${L.length}, seed ${seed}). Нажми Play.`+(m?' Режим включён — исход будет другой, выключи его.':'')); }
};
const no=()=>say('Игра ещё не готова — подожди секунду и нажми ещё раз.');

// ---------- вид ----------
let root=null, msg=null, toast=null, toastT=0;
const narrow=()=>innerWidth<700;
const say=t=>{ if(msg) msg.textContent=t; if(!root) return;
 if(narrow()) setOpen(false); // на телефоне после любого действия панель сворачивается в кнопку (иначе закрывает игру и окна бонуса), сообщение остаётся плашкой
 if(root.dataset.open==='0'&&toast){ toast.textContent=t; toast.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ toast.hidden=true; },4500); } };
const setOpen=v=>{ if(!root) return; root.dataset.open=v?'1':'0'; ss.set(OPEN,v?'1':'0'); const tab=root.querySelector('.tt-tab'); tab.setAttribute('aria-expanded',v?'true':'false'); if(v&&toast) toast.hidden=true; };
const AB=(()=>{ const cs=document.currentScript, here=((cs&&cs.src)||'').split('?')[0]; return (cs&&cs.getAttribute('data-a'))||(/\/mockup\/[^\/]*$/.test(here)?'../assets/':'assets/'); })();
const FONT=(()=>{ try{ return new URL(AB.replace(/assets\/$/,'fonts/')+'RussoOne-Regular.ttf',document.baseURI).href; }catch(e){ return ''; } })();
const CSS=`
@font-face{font-family:"BP Test Ru";src:url(${FONT}) format("truetype");font-display:swap}
#bp-test{position:fixed;z-index:250;right:max(10px,var(--sa-r,0px));top:max(10px,var(--sa-t,0px));font:600 14px/1.2 "Barlow SC","BP Test Ru",system-ui,sans-serif;font-synthesis:none;color:#efe4c8;-webkit-text-size-adjust:100%;touch-action:manipulation;-webkit-user-select:none;user-select:none}
#bp-test *{box-sizing:border-box}
#bp-test .tt-tab{display:none;height:40px;padding:0 15px;border:0;border-radius:999px;background:rgba(14,10,8,.84);color:#FFC861;font:700 14px "Barlow SC","BP Test Ru",sans-serif;letter-spacing:.16em;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(201,138,44,.75),0 6px 18px rgba(0,0,0,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
#bp-test[data-open="0"] .tt-tab{display:block}
#bp-test .tt-box{width:min(284px,calc(100vw - 20px - var(--sa-r,0px)));max-height:calc(100vh - 20px - var(--sa-t,0px) - var(--sa-b,0px));max-height:calc(100dvh - 20px - var(--sa-t,0px) - var(--sa-b,0px));overflow:auto;padding:10px;border-radius:12px;background:linear-gradient(rgba(38,19,15,.9),rgba(14,8,7,.93));box-shadow:inset 0 0 0 1px rgba(201,138,44,.65),0 14px 34px rgba(0,0,0,.75);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:tt-in .2s ease-out;overscroll-behavior:contain}
#bp-test[data-open="0"] .tt-box{display:none}
@keyframes tt-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){#bp-test .tt-box{animation:none}}
#bp-test .tt-hd{display:flex;align-items:center;gap:8px;padding:0 2px 2px}
#bp-test .tt-hd b{font:700 14px "Barlow SC","BP Test Ru",sans-serif;letter-spacing:.18em;color:#FFC861}
#bp-test .tt-hd span{flex:1;font-size:12px;color:#c9a46a;letter-spacing:.04em}
#bp-test .tt-x{flex:none;width:34px;height:34px;border:0;border-radius:8px;background:none;color:#d8cba8;font:700 18px/1 "Barlow SC",sans-serif;cursor:pointer}
#bp-test .tt-sec{margin:11px 2px 5px;font:700 10.5px "Barlow SC","BP Test Ru",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#c9a46a}
#bp-test .tt-b{display:block;width:100%;min-height:38px;margin:0 0 4px;padding:8px 10px;border:0;border-radius:8px;background:#241c18;color:#efe4c8;font:600 13.5px/1.2 "Barlow SC","BP Test Ru",system-ui,sans-serif;text-align:left;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(201,138,44,.38)}
#bp-test .tt-b:hover{background:#3a2a20;color:#FFC861}
#bp-test .tt-b:active{background:#4a3424}
#bp-test .tt-b:disabled{opacity:.38;cursor:default;background:#241c18;color:#efe4c8}
#bp-test .tt-b.warn{box-shadow:inset 0 0 0 1px rgba(176,42,31,.8)}
#bp-test button:focus-visible{outline:2px solid #FFC861;outline-offset:1px}
#bp-test .tt-msg{margin:8px 0 0;padding:7px 9px;min-height:2.6em;border-radius:8px;background:rgba(0,0,0,.4);color:#FFC861;font:600 12.5px/1.3 "Barlow SC","BP Test Ru",system-ui,sans-serif}
#bp-test .tt-toast{position:fixed;right:max(10px,var(--sa-r,0px));top:calc(max(10px,var(--sa-t,0px)) + 48px);max-width:min(300px,calc(100vw - 20px));padding:8px 11px;border-radius:10px;background:rgba(14,8,7,.92);color:#FFC861;font:600 13px/1.3 "Barlow SC","BP Test Ru",system-ui,sans-serif;box-shadow:inset 0 0 0 1px rgba(201,138,44,.65),0 8px 22px rgba(0,0,0,.7)}
#bp-test .tt-toast[hidden]{display:none}
@media(pointer:coarse){#bp-test .tt-b{min-height:44px}}
`;
const btn=(cls,txt,fn,extra)=>{ const b=document.createElement('button'); b.type='button'; b.className=cls; b.textContent=txt; if(extra) Object.assign(b,extra); b.addEventListener('click',e=>{ fn(); if(e.detail) b.blur(); }); return b; }; // после щелчка мышью фокус уходит с кнопки: иначе пробел (Play, закрыть шоу) нажимал бы её снова
function mount(){
 if(root||!document.body) return;
 root=document.createElement('div'); root.id='bp-test'; root.setAttribute('role','region'); root.setAttribute('aria-label','Тестовая панель');
 const st=document.createElement('style'); st.textContent=CSS; root.appendChild(st);
 const tab=btn('tt-tab','ТЕСТ',()=>setOpen(true)); tab.setAttribute('aria-label','Открыть тестовую панель'); tab.setAttribute('aria-expanded','false'); root.appendChild(tab);
 const box=document.createElement('div'); box.className='tt-box';
 const hd=document.createElement('div'); hd.className='tt-hd'; hd.innerHTML='<b>ТЕСТ</b><span></span>'; hd.querySelector('span').textContent='сцена: '+(SCN[SC()]||SC());
 const x=btn('tt-x','—',()=>setOpen(false)); x.setAttribute('aria-label','Свернуть панель'); hd.appendChild(x); box.appendChild(hd);
 const sec=t=>{ const d=document.createElement('div'); d.className='tt-sec'; d.textContent=t; box.appendChild(d); };
 sec('Бонус — как будто выпал');
 box.append(btn('tt-b','Кухня: 10 спинов (3 приглашения)',act.k10),btn('tt-b','Камеры: 10 спинов (4 приглашения)',act.c10),btn('tt-b','Купить «Кухню» без списания (вступительный спин)',act.buyk),btn('tt-b','Купить «Камеры» без списания (вступительный спин)',act.buyc));
 sec(SC()==='hall'?'Следующий спин':'Следующий спин — только в зале');
 for(const n of NEXT) box.appendChild(btn('tt-b',n[1],()=>act.next(n[0]),{disabled:SC()!=='hall'||!SEEDS[n[0]].length}));
 sec('Коллект — как Рокко забирает символы'); // варианты collect.js; выбор запоминается в этой вкладке (sessionStorage bp-collect), адрес ?collect=… главнее
 { const CV=[['mix','по размеру выигрыша (основной)'],['swallow','Рокко глотает — все выигрыши'],['paw1','лапа «Горсть» — все выигрыши'],['paw2','рука «Хваты» — все выигрыши'],['old','старый вид']], cur=()=>{ const m=ss.get('bp-collect'); return CV.findIndex(x=>x[0]===m)>=0?m:'mix'; };
  const cb=btn('tt-b','',()=>{ const i=(CV.findIndex(x=>x[0]===cur())+1)%CV.length; ss.set('bp-collect',CV[i][0]); cb.textContent='Коллект: '+CV[i][1]; say('Коллект — '+CV[i][1]+'. Действует со следующего выигрыша.'); });
  cb.textContent='Коллект: '+CV[CV.findIndex(x=>x[0]===cur())][1]; box.appendChild(cb); }
 sec('Вид плашек — счётчик ×N, FREE SPINS, SACK, MODE'); // ui.css «тон плашек М1»; выбор в этой вкладке (sessionStorage bp-hudtone), адрес ?hudtone=0..5 главнее при загрузке; меняется сразу, без перезагрузки
 { const TV=[['0','прежний, тёмный'],['1','под рамку поля'],['2','под пульт (красный и латунь)'],['3','светлая кремовая подпись'],['4','выбор: рама как пульт, краска как рамка, без обводок (основной)'],['5','пульт: плитка, латунные кнопки, окна как у баланса']], cur=()=>{ const m=document.documentElement.dataset.hudtone; return TV.findIndex(x=>x[0]===m)>=0?m:'4'; };
  const tb=btn('tt-b','',()=>{ const i=(TV.findIndex(x=>x[0]===cur())+1)%TV.length; ss.set('bp-hudtone',TV[i][0]); document.documentElement.dataset.hudtone=TV[i][0]; tb.textContent='Тон: '+TV[i][0]+' — '+TV[i][1]; say('Тон плашек М1 — '+TV[i][0]+', '+TV[i][1]+'.'); });
  tb.textContent='Тон: '+cur()+' — '+TV[TV.findIndex(x=>x[0]===cur())][1]; box.appendChild(tb); }
 sec('Рамки плашек — FREE SPINS, SACK, ×N, MODE'); // ui.css «рамки плашек»; выбор в этой вкладке (sessionStorage bp-hudframe), адрес ?hudframe=0|a..f главнее при загрузке; меняется сразу; на виде «пульт» (5) рамка своя
 { const FV=[['0','прежняя: красная рейка с винтами'],['a','лист стали, неровная резка, две заклёпки'],['b','чугунная табличка с фаской'],['c','гнутый лоток, два разных винта'],['d','без рамки: охра и окно — пластины на планке'],['e','край рамы поля (frame1.png)'],['f','плита на сварке, без винтов']], cur=()=>{ const m=document.documentElement.dataset.hudframe; return FV.findIndex(x=>x[0]===m)>=0?m:'a'; };
  const fb=btn('tt-b','',()=>{ const i=(FV.findIndex(x=>x[0]===cur())+1)%FV.length; ss.set('bp-hudframe',FV[i][0]); document.documentElement.dataset.hudframe=FV[i][0]; fb.textContent='Рамка: '+FV[i][0]+' — '+FV[i][1]; say('Рамка плашек — '+FV[i][0]+', '+FV[i][1]+(document.documentElement.dataset.hudtone==='5'?'. На виде «пульт» не видна — включи вид 4.':'.')); });
  fb.textContent='Рамка: '+cur()+' — '+FV[FV.findIndex(x=>x[0]===cur())][1]; box.appendChild(fb); }
 sec('Радость Рокко на Big Win'); // bigwin-rocco.js: ?bwcheer=yes|dance|jump|old, выбор в этой вкладке (sessionStorage bp-bwcheer), адрес главнее; действует со следующего Big Win
 { const BV=[['yes','кулаки вверх-вниз «yes!» (основной)'],['dance','пританцовывает, кулаки у плеч'],['jump','подпрыгивает, руки вверх (кончики пальцев левой синеватые)'],['old','прежний (металлическая рука в поднятой фазе)']], cur=()=>{ const m=new URLSearchParams(location.search).get('bwcheer')||ss.get('bp-bwcheer'); return BV.findIndex(x=>x[0]===m)>=0?m:'yes'; };
  const bb=btn('tt-b','',()=>{ const i=(BV.findIndex(x=>x[0]===cur())+1)%BV.length; ss.set('bp-bwcheer',BV[i][0]); bb.textContent='Радость: '+BV[i][1]; say('Радость на Big Win — '+BV[i][1]+'.'+(new URLSearchParams(location.search).get('bwcheer')?' В адресе стоит ?bwcheer=… — он главнее, убери его.':' Откроется на следующем Big Win (кнопка ниже — перезагрузка в Big Win).')); });
  bb.textContent='Радость: '+BV[BV.findIndex(x=>x[0]===cur())][1]; box.appendChild(bb);
  box.appendChild(btn('tt-b','Показать Big Win сейчас (перезагрузка)',()=>{ const u=new URL(location.href); u.search='?state=idle&screen=bigwin&bwcheer='+cur(); location.href=u.toString(); })); }
 sec('Подсветка выигрыша — как выделяются символы'); // hl.js: cam (янтарные уголки, основной), bulbs, spot, neon, pop; адрес ?hl=… главнее; выбор в этой вкладке (sessionStorage bp-hl), действует со следующего выигрыша, без перезагрузки
 { const H=()=>window.bpHl, lab=()=>{ const h=H(); return h?h.label[h.mode()]:'нет hl.js'; };
  const hb=btn('tt-b','',()=>{ const h=H(); if(!h) return no(); const L=h.names, i=(L.indexOf(h.mode())+1)%L.length; h.set(L[i]); hb.textContent='Подсветка: '+lab(); say('Подсветка — '+h.label[h.mode()]+'.'+(h.urlLocked()?' В адресе стоит ?hl=… — он главнее, убери его.':' Действует со следующего выигрыша.')); });
  hb.textContent='Подсветка: '+lab(); box.appendChild(hb);
  let hn=0; box.appendChild(btn('tt-b',SC()==='cameras'?'Показать подсветку — только в зале и кухне':'Показать подсветку сейчас (на готовом поле)',async()=>{ if(SC()==='cameras') return say('В «Камерах» этот показ не работает — открой зал или кухню.'); if(!window.bpHlDemo) return no(); if(GS()&&GS().spinning) return say('Дождись конца спина.'); setOpen(false); try{ await window.bpHlDemo(++hn); }catch(e){ console.error(e); } })); }
 sec('Мешок «Кухни» — как Рокко высыпает'); // варианты высыпания (sack.js): pawempty (основной) — лапа, мешок вверх дном сбоку, пустеет и обмякает, paw — прежняя лапа (мешок переворачивается над лапой), coins — фонтан монет из окошка SACK, rocco — Рокко поднимает и трясёт; выбор в этой вкладке (sessionStorage bp-sackfx), адрес ?sackfx=… главнее; действует со следующего высыпания, без перезагрузки
 { const SV=[['pawempty','лапа: мешок вверх дном сбоку, пустеет и обмякает (основной)'],['paw','прежняя лапа: мешок переворачивается над лапой'],['coins','фонтан монет из окошка SACK'],['rocco','Рокко поднимает и трясёт']], cur=()=>{ const u=new URLSearchParams(location.search).get('sackfx'), m=SV.find(x=>x[0]===u)?u:ss.get('bp-sackfx'); return SV.findIndex(x=>x[0]===m)>=0?m:'pawempty'; };
  const sb=btn('tt-b','',()=>{ const i=(SV.findIndex(x=>x[0]===cur())+1)%SV.length; ss.set('bp-sackfx',SV[i][0]); sb.textContent='Мешок: '+SV[i][1]; say('Мешок — '+SV[i][1]+'.'+(new URLSearchParams(location.search).get('sackfx')?' В адресе стоит ?sackfx=… — он главнее, убери его.':' Действует со следующего высыпания (каждая 4-я кража).')); });
  sb.textContent='Мешок: '+SV[SV.findIndex(x=>x[0]===cur())][1]; box.appendChild(sb);
  box.appendChild(btn('tt-b',SC()!=='hall'?'Показать высыпание мешка сейчас':'Показать высыпание — только в бонусе',async()=>{ const F=window.bpFx; if(!F||!F.dump||(window.bpTime&&window.bpTime.GS&&window.bpTime.GS.spinning)) return say('Дождись конца спина.'); setOpen(false); try{ await F.dump((Date.now()%9973)+1); }catch(e){ console.error(e); } setTimeout(()=>{ F.restore&&F.restore(); },1800); },{disabled:SC()==='hall'})); }
 sec('Лапа коллекта'); // collect.js: основная paw2 (утренняя мохнатая из W-grab, владелец 2026-10-12), ?paw=paw4|fur5|gold — другие; выбор в этой вкладке (sessionStorage bp-paw), адрес ?paw=… главнее; смена — перезагрузка
 { const WV=[['paw2','утренняя: мохнатая рука из W-grab, paw2 (основная)'],['paw4','форма прежней руки в меху, paw4'],['fur5','мохнатая с нуля, paw5'],['gold','золотая латунь, прямая «труба»']], cur=()=>{ const m=new URLSearchParams(location.search).get('paw')||ss.get('bp-paw'); return m==='paw4'||m==='new'?'paw4':m==='fur5'?'fur5':m==='gold'?'gold':'paw2'; };
  const wb=btn('tt-b','',()=>{ const i=(WV.findIndex(x=>x[0]===cur())+1)%WV.length; ss.set('bp-paw',WV[i][0]); const u=new URL(location.href); u.searchParams.delete('paw'); location.replace(u.toString()); });
  wb.textContent='Лапа: '+WV[WV.findIndex(x=>x[0]===cur())][1]; box.appendChild(wb); }
 sec('Бант Рокко — «поправляет бант» (зал)'); // rocco-alive.js: slide (основной), tips, dust, all — три по очереди, 0 — без банта; sessionStorage bp-bow, адрес ?bow= главнее; смена — перезагрузка
 { const BV=[['slide','тянет бант вбок и выравнивает (основной)'],['tips','двумя пальцами за кончики'],['dust','поправляет и отряхивает грудь'],['all','все три вперемешку'],['0','без банта']], cur=()=>{ const m=new URLSearchParams(location.search).get('bow')||ss.get('bp-bow'); return BV.findIndex(x=>x[0]===m)>=0?m:'slide'; };
  const bb=btn('tt-b','',()=>{ const i=(BV.findIndex(x=>x[0]===cur())+1)%BV.length; ss.set('bp-bow',BV[i][0]); const u=new URL(location.href); u.searchParams.delete('bow'); location.replace(u.toString()); });
  bb.textContent='Бант: '+BV[BV.findIndex(x=>x[0]===cur())][1]; box.appendChild(bb); }
 sec('Удар Рокко — варианты'); // сам момент удара — punchhit.js (bp-punchhit, ?punchhit=), последствие — punchfx-<имя>.js (владелец 2026-10-11); выбор в этой вкладке (sessionStorage bp-punchfx), адрес ?punchfx=… главнее; смена — перезагрузка
 { const PV=[['old','прежний (молния по рамке)'],['shake','A · Тряска: столбец высыпается'],['blackout','B · Блэкаут: свет гаснет, луч на столбец'],['glass','C · Стекло трескается и осыпается'],['ribbon','D · Лента билетов из автомата'],['scatter','E · Разлёт: символы летят по физике, билеты падают сверху (основной)']], cur=()=>{ const m=new URLSearchParams(location.search).get('punchfx')||ss.get('bp-punchfx'); return PV.findIndex(x=>x[0]===m)>=0?m:'scatter'; };
  const pb=btn('tt-b','',()=>{ const i=(PV.findIndex(x=>x[0]===cur())+1)%PV.length; ss.set('bp-punchfx',PV[i][0]); const u=new URL(location.href); u.searchParams.delete('punchfx'); location.replace(u.toString()); });
  pb.textContent='После удара: '+PV[PV.findIndex(x=>x[0]===cur())][1]; box.appendChild(pb);
  const HV=[['old','прежний (вспышка-звезда)'],['dent','1 · Вмятина: рама гнётся, пыль и сколы'],['wave','2 · Волна по стеклу + вмятина (основной)'],['arc','3 · Замыкание: искра и мигание ламп'],['stop','4 · Стоп-кадр и тяжёлая тряска']], hcur=()=>{ const m=new URLSearchParams(location.search).get('punchhit')||ss.get('bp-punchhit'); return HV.findIndex(x=>x[0]===m)>=0?m:'wave'; };
  const hb=btn('tt-b','',()=>{ const i=(HV.findIndex(x=>x[0]===hcur())+1)%HV.length; ss.set('bp-punchhit',HV[i][0]); const u=new URL(location.href); u.searchParams.delete('punchhit'); location.replace(u.toString()); });
  hb.textContent='Сам удар: '+HV[HV.findIndex(x=>x[0]===hcur())][1]; box.appendChild(hb);
  box.appendChild(btn('tt-b',SC()==='hall'?'Показать удар сейчас':'Показать удар — только в зале',async()=>{ const F=window.bpFx; if(!F||!F.punch||(window.bpTime&&window.bpTime.GS&&window.bpTime.GS.spinning)) return say('Дождись конца спина.'); setOpen(false); try{ await F.punch((Date.now()%9973)+1,false,8); }catch(e){ console.error(e); } setTimeout(()=>{ F.restore&&F.restore(); },1800); },{disabled:SC()!=='hall'})); }
 sec('Плашки — вид всех окон и записок'); // plates-note.js: dark — тёмные плашки как окна F (по умолчанию), note — «Записка на плите», old — прежний красный вид; выбор в этой вкладке (sessionStorage bp-plates), адрес ?plates=old|note главнее; смена перезагружает страницу (окна F читают стиль при создании)
 { const PM=window.bpPlates, ORD=['dark','note','old'], cur=()=>PM?PM.mode():'dark', NM={dark:'тёмные, как окна F (основной)',note:'записка на плите (бумага)',old:'прежние красные'};
  const pb=btn('tt-b','',()=>{ if(!PM) return no(); PM.set(ORD[(ORD.indexOf(cur())+1)%ORD.length]); });
  pb.textContent='Плашки: '+NM[cur()]+' — переключить'; box.appendChild(pb); }
 sec('Окна — Меню / Правила / История'); // варианты для сравнения; выбор запоминается в этой вкладке (sessionStorage bp-dlg*), адрес ?dlgnav=… ?dlg=old главнее; смена — перезагрузка в окно правил
 { const DV=[['dlgnav','Вкладки правил',[['top','сверху (основной)'],['side','колонкой слева, с Рокко']]],['dlg','Вид окон',[['','новые (F)'],['old','прежние мониторы']]]];
  for(const [k,lab,vals] of DV){ const cur=()=>{ const v=new URLSearchParams(location.search).get(k)||ss.get('bp-'+k)||''; return vals.findIndex(x=>x[0]===v)>=0?v:(k==='dlg'?'':vals[0][0]); };
   const bb=btn('tt-b','',()=>{ const i=(vals.findIndex(x=>x[0]===cur())+1)%vals.length; if(vals[i][0]==='') ss.del('bp-'+k); else ss.set('bp-'+k,vals[i][0]); const u=new URL(location.href); ['dlg','dlgnav'].forEach(n=>u.searchParams.delete(n)); u.searchParams.set('state','idle'); u.searchParams.set('screen','rules'); location.replace(u.toString()); });
   bb.textContent=lab+': '+vals[Math.max(0,vals.findIndex(x=>x[0]===cur()))][1]; box.appendChild(bb); } }
 sec('Звук — выбор'); // движок — audio.js (window.bpAudio): выбор хранится в sessionStorage 'bp-snd', музыка включается сразу; полный список — страница sound-board.html
 { const AUD=()=>window.bpAudio, lab=[], upd=()=>lab.forEach(f=>f());
  const mu=btn('tt-b','',()=>{ const a=AUD(); if(!a) return say('Звуковой движок не загружен.'); const m=a.toggleMute(); say(m?'Звук выключен.':'Звук включён.'); upd(); });
  lab.push(()=>{ const a=AUD(); mu.textContent='Звук: '+(a&&a.vol().mute?'выключен — включить':'включён — выключить'); });
  const fb=btn('tt-b','',()=>{ const a=AUD(); if(!a) return say('Звуковой движок не загружен.'); const F=[...a.flavourKeys(),null], cu=a.flavourExplicit()?a.flavour():null, n=F[(F.indexOf(cu)+1)%F.length]; a.setFlavour(n); a.play('win.cluster',{force:true}); say(n?'Эффекты: набор '+n+(a.flavours()[n]?' — '+a.flavours()[n]:'')+'.':'Эффекты: умолчания игры (набор '+a.flavour()+' и исключения владельца).'); upd(); });
  lab.push(()=>{ const a=AUD(); const n=a?a.flavour():'E'; fb.textContent=a&&!a.flavourExplicit()?'Эффекты: умолчания игры':'Эффекты: набор '+n+(a&&a.flavours()[n]?' — '+a.flavours()[n]:''); });
  const tb=btn('tt-b','',()=>{ const a=AUD(); if(!a) return say('Звуковой движок не загружен.'); const n=a.cycleSfxTrim(); a.play('spin.stop',{force:true}); say('Подъём эффектов: '+(n>0?'+':'')+n+' дБ (если игра кажется тихой).'); upd(); });
  lab.push(()=>{ const a=AUD(); const n=a?a.sfxTrim():0; tb.textContent='Подъём эффектов: '+(n>0?'+':'')+n+' дБ — ещё'; });
  box.append(mu,fb,tb);
  // Музыка «по одной механике» (2026-10-12): зал и приветствие — одна дорожка (hall), Кухня и Камеры — одна дорожка бонуса (bonus), поверх неё в Камерах необязательный слой (camlayer), вставки большого и максимального выигрыша
  const fmtDb=n=>(n<0?'−':'')+Math.abs(n)+' дБ';
  for(const cat of ['hall','bonus','layer','bigwin','maxwin']){
   if(cat==='layer'){
    const lb=btn('tt-b','',()=>{ const a=AUD(), L=a?a.tracks('camlayer'):[]; if(!L.length) return say('Для слоя Камер пока нет файлов.'); const cur=a.selected('camlayer'), i=cur?L.findIndex(t=>t.id===cur.id)+1:0; // выкл → 1-й → 2-й … → выкл
     if(i>=L.length){ a.pickLayer('off'); say('Слой Камер: выключен (играет только дорожка бонуса).'); } else { a.pickLayer(L[i].id); say('Слой Камер: '+(L[i].title||L[i].id)+' ('+(i+1)+' из '+L.length+') — поверх дорожки бонуса.'); } upd(); });
    lab.push(()=>{ const a=AUD(), L=a?a.tracks('camlayer'):[], cur=a&&a.selected('camlayer'); lb.textContent='Слой Камер: '+(L.length?(cur?(cur.title||cur.id):'выкл'):'нет файлов'); lb.disabled=!L.length; });
    const db=btn('tt-b','',()=>{ const a=AUD(); if(!a) return say('Звуковой движок не загружен.'); const n=a.cycleLayerDb(); say('Уровень слоя Камер: '+fmtDb(n)+' к музыке.'); upd(); });
    lab.push(()=>{ const a=AUD(); db.textContent='Уровень слоя: '+fmtDb(a?a.layerDb():-8)+' — ещё'; db.disabled=!(a&&a.tracks('camlayer').length); });
    box.append(lb,db); continue; }
   const nm=()=>{ const a=AUD(); return (a&&a.catNames&&a.catNames[cat])||cat; }, sting=cat==='bigwin'||cat==='maxwin', pre=sting?'Вставка · ':'Музыка · ';
   const mb=btn('tt-b','',()=>{ const a=AUD(), L=a?a.tracks(cat):[]; if(!L.length) return say('Для «'+nm()+'» пока нет музыкальных файлов.'); const cur=a.selected(cat), i=(L.findIndex(t=>cur&&t.id===cur.id)+1)%L.length; a.pickMusic(cat,L[i].id); say((sting?'Вставка «':'Музыка «')+nm()+'»: '+(L[i].title||L[i].id)+' ('+(i+1)+' из '+L.length+').'+(sting?' Играет стинг.':'')); upd(); });
   lab.push(()=>{ const a=AUD(), L=a?a.tracks(cat):[], cur=a&&a.selected(cat); mb.textContent=pre+nm()+': '+(L.length?((cur&&(cur.title||cur.id))||L[0].title||L[0].id):'нет файлов'); mb.disabled=!L.length; });
   box.append(mb); }
  box.append(btn('tt-b','Все звуки — прослушать (отдельная страница)',()=>{ location.href='sound-board.html?bpv=abe1725e'; }));
  upd(); let tries=0; const w=()=>{ if(AUD()) AUD().onReady(upd); else if(++tries<20) setTimeout(w,300); }; w(); }
 sec('Большой выигрыш — варианты'); // bigwin-fx.js: четыре выбора (осадки, плашка, лампы, надпись «тап»); хранятся в этой вкладке (sessionStorage bp-bwfx|bwpl|bwlamp|bwhint), адрес ?bwfx=… ?bwpl=… ?bwlamp=… ?bwhint=… главнее; каждое нажатие — следующий вариант и сразу показ шоу
 for(const g of ['pl','lamp','top','fx','hint']){ const F=()=>window.BigWinFx, G=()=>F()&&F().groups[g];
  const cur=()=>F().opt(g), lab=()=>{ const l=G().list.find(x=>x[0]===cur()); return l?l[1]:cur(); };
  const bb=btn('tt-b','',()=>{ if(!F()) return no(); const L=G().list, i=(L.findIndex(x=>x[0]===cur())+1)%L.length, u=new URL(location.href); ss.set('bp-'+F().keys[g],L[i][0]); ['bwfx','bwpl','bwlamp','bwtop','bwhint'].forEach(k=>u.searchParams.delete(k)); u.searchParams.set('state','idle'); u.searchParams.set('screen','bigwin'); location.replace(u.toString()); });
  bb.textContent=g==='pl'?'Плашка: …':g==='lamp'?'Пороги: …':g==='top'?'Верх плашки: …':g==='fx'?'Вместо конфетти: …':'Надпись «тап»: …'; box.appendChild(bb);
  const upd=()=>{ if(F()) bb.textContent=G().title+': '+lab(); else setTimeout(upd,400); }; upd(); }
 box.appendChild(btn('tt-b','Показать большой выигрыш сейчас',()=>{ const u=new URL(location.href); u.searchParams.set('state','idle'); u.searchParams.set('screen','bigwin'); location.replace(u.toString()); }));
 sec('Эффекты выигрыша'); // winfx.js: четыре выбора (сумма на поле, строка WIN, цепочка, малый/средний выигрыш); хранятся в этой вкладке (sessionStorage bp-winfx-p|r|c|t), адрес ?winp= ?winr= ?winc= ?wint= главнее; нажатие — следующий вариант, страница не перезагружается
 for(const g of ['p','r','c','t']){ const F=()=>window.WinFx, G=()=>F()&&F().groups[g];
  const cur=()=>F().opt(g), lab=()=>{ const l=G().list.find(x=>x[0]===cur()); return l?l[1]:cur(); };
  const bb=btn('tt-b','',()=>{ if(!F()) return no(); const L=G().list, i=(L.findIndex(x=>x[0]===cur())+1)%L.length, u=new URL(location.href); ss.set('bp-winfx-'+g,L[i][0]); ['winp','winr','winc','wint'].forEach(k=>{ if(u.searchParams.has(k)){ u.searchParams.delete(k); history.replaceState(null,'',u.toString()); } }); bb.textContent=G().title+': '+lab(); say(G().title+': '+lab()+'.'); });
  bb.textContent=({p:'Сумма на поле',r:'Строка WIN',c:'Цепочка',t:'Малый и средний выигрыш'})[g]+': …'; box.appendChild(bb);
  const upd=()=>{ if(F()) bb.textContent=G().title+': '+lab(); else setTimeout(upd,400); }; upd(); }
 box.append(btn('tt-b','Показать выигрыш: 3 шага цепочки (на готовом поле)',()=>{ if(!window.bpWinDemo) return no(); if(SC()==='cameras') return say('В «Камерах» показ недоступен — нужен настоящий спин.'); window.bpWinDemo(1,3); say('Показ: три выигрыша подряд, счёт строки WIN, метка цепочки.'); }));
 sec('Игра');
 box.append(btn('tt-b','Баланс = '+bal1000(),act.bal),btn('tt-b warn','Сбросить игру',act.reset));
 msg=document.createElement('p'); msg.className='tt-msg'; msg.setAttribute('role','status'); msg.setAttribute('aria-live','polite'); msg.textContent='Бонус начнётся сразу. После «Следующего спина» нажми Play.'; box.appendChild(msg);
 root.appendChild(box);
 toast=document.createElement('div'); toast.className='tt-toast'; toast.hidden=true; toast.setAttribute('role','status'); root.appendChild(toast);
 document.body.appendChild(root);
 const o=ss.get(OPEN); setOpen(o==null?!narrow():o==='1'); // телефон: по умолчанию маленькая кнопка; запоминаем выбор в этой вкладке
}
function unmount(){ if(root){ root.remove(); root=msg=toast=null; } }
window.bpTestToggle=()=>{ if(on()){ ss.del(FLAG); unmount(); } else { ss.set(FLAG,'1'); mount(); } return on(); };
const start=()=>{ if(on()) mount(); };
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
