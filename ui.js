// Blackout Party — живые кнопки макета (2026-10-09). Не игра: исход случайный в браузере, только чтобы показать поведение кнопок.
// В настоящей игре исход приходит из книги событий RGS, суммы — в микро-единицах (BigInt).
// Использует общие переменные index.html: A, q, scene, SYM, HALL, BETS, betI, modeOn, MODES, money, render, openFeatures, closeFeatures, el.
(()=>{
const MAXX=25000;
let PITCH_C=0; // кэш шага клеток (см. pitch())
const HL_NUM=false; // номера 01, 02… рядом с янтарными уголками выигрыша (владелец 2026-10-10: выключены; true вернёт). Всё остальное в подсветке от неё не зависит
const toScreen=p=>{ const nav=()=>{ if(typeof goQ==='function') goQ(p); else location.search=p; }; if(window.SceneTrans) SceneTrans.go(p,nav); else nav(); }; // в артефакте экраны переключает goQ, в локальном макете — адрес // максимальный выигрыш, × ставки
// <<<CAL pay
const PAY={ // × ставки за 8–9 / 10–11 / 12+ всего символов (настоящие + WILD). Черновик: подгонка симуляцией tools/rtp_sim (2026-10-12, «Кухня» 10 спинов за 100× ≈96%, «Камеры» за 150× ≈96%, RTP ≈96% в каждом режиме); обновляет tools/rtp_sim/export_ui.js
 'sym-high-mask':['Trophy',0.319,0.638,1.276],
 'sym-high-pizza':['Pizza',0.268,0.536,1.072],
 'sym-high-gift':['Gift',0.226,0.452,0.904],
 'sym-high-mic':['Microphone',0.19,0.38,0.76],
 'sym-low-cupcake':['Cupcake',0.16,0.32,0.64],
 'sym-low-horn':['Horn',0.134,0.268,0.536],
 'sym-low-balloon':['Balloon',0.113,0.226,0.452],
 'sym-low-hat':['Party hat',0.095,0.19,0.38],
 'sym-low-cup':['Soda',0.08,0.16,0.32]};
// >>>CAL pay
const COST={hungry:1.5,double:2};
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const AU=(e,o)=>{ try{ window.bpAudio&&window.bpAudio.play(e,o); }catch(_){} try{ window.RoccoAlive&&window.RoccoAlive.ev(e); }catch(_){} }; // звук (audio.js): по одной строке на событие; без audio.js или файлов звука — тишина
const store={get(){try{return JSON.parse(sessionStorage.getItem('bp-ui')||'null')}catch(e){return null}},set(v){try{sessionStorage.setItem('bp-ui',JSON.stringify(v))}catch(e){}}};
const S0=store.get()||{};
const GS={fs:S0.fs||0,fst:S0.fst||0,kstep:S0.kstep||0,ksteals:S0.ksteals||0,sack:S0.sack||0,kintro:!!S0.kintro,ktotal:S0.ktotal||0,mute:!!S0.mute,bal:(+q.get('bal')||S0.bal)??1250.50,lastWin:S0.lastWin??0,speed:S0.speed||'normal',sound:S0.sound??2,music:S0.music??40,sfx:S0.sfx??60,hist:S0.hist||[],rec:S0.rec||null,kind:S0.kind||null,kgo:!!S0.kgo,
 spinning:false,skip:null,auto:0,autoOpt:{stopBonus:true,stopWin:0},holdTurbo:false,replay:null};
// больше уровней ставки (владелец 2026-10-09: «чтобы выбор был большой»). В игре уровни приходят из authenticate RGS.
BETS.splice(0,BETS.length,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.2,1.4,1.6,1.8,2,2.5,3,3.5,4,4.5,5,6,7,8,9,10,12,14,16,18,20,25,30,40,50,60,70,80,90,100); // 40 уровней — ровно 5 рядов по 8, без пустого места
betI=BETS.indexOf(1);
if(S0.betI!=null&&S0.betI<BETS.length) betI=S0.betI; if(S0.modeOn!==undefined) modeOn=S0.modeOn;
const save=()=>store.set({fs:GS.fs,fst:GS.fst,kstep:GS.kstep,ksteals:GS.ksteals,sack:GS.sack,kintro:GS.kintro,ktotal:GS.ktotal,mute:GS.mute,bal:GS.bal,lastWin:GS.lastWin,speed:GS.speed,sound:GS.sound,music:GS.music,sfx:GS.sfx,hist:GS.hist.slice(0,20),rec:GS.rec,kind:GS.kind,kgo:GS.kgo,betI,modeOn});
const bet=()=>BETS[betI], spinCost=()=>bet()*(COST[modeOn]||1);
const $=s=>document.querySelector(s);
const transBusy=()=>!!(window.SceneTrans&&SceneTrans.busy&&SceneTrans.busy()); // шторка перехода закрывается, стоит или поднимается
let BWWAIT=0; // 1 — большой выигрыш ждёт, пока Рокко зала дойдёт до покоя (bigWin()): окно ещё не открыто, но спин уже не начинать
const dialogOpen=()=>!!(BWWAIT||transBusy()||document.getElementById('fmenu')||$('.bp-wrap:not([data-out])')||$('#bp-big:not([data-out])')||document.getElementById('ovl')||document.getElementById('wel')); // под шторкой и пока она закрывается, спин не начинается: раньше пробел во время ставня запускал спин на старой странице
// ---------- переходы окон (владелец 2026-10-11, п.1): у всех окон одни длительности и кривые; в CSS — ui.css «окна: появление и уход» ----------
// Окно не пропадает рывком: гаснет за 170 мс (при «меньше движения» 110), потом уходит из разметки. Пока гаснет, оно уже «закрыто»: dialogOpen() его не считает.
function winOut(w,done){ if(!w||!w.isConnected||w.dataset.out) return; w.dataset.out='1'; w.style.pointerEvents='none'; AU('ui.close');
 const D=RM()?110:170; let ok=false; const fin=()=>{ if(ok) return; ok=true; if(w.isConnected) w.remove(); done&&done(); };
 try{ const a=w.animate([{opacity:1},{opacity:0}],{duration:D,easing:'cubic-bezier(.5,0,.8,.4)',fill:'forwards'}); a.onfinish=fin; a.oncancel=fin; }catch(e){ fin(); } setTimeout(fin,D+120); }
// Край экрана для выпадающих окон (меню, список ставок): 8 px от края, но не ближе выреза, скруглённого угла и полосы «домой». Отступы читаем заново (поворот), общий SA не трогаем; без выреза всюду 8 — как было.
const popEdge=()=>{ const s=typeof readSafe==='function'?readSafe({t:0,r:0,b:0,l:0}):{t:0,r:0,b:0,l:0}; return {t:Math.max(8,s.t),r:Math.max(8,s.r),b:Math.max(8,s.b),l:Math.max(8,s.l)}; };
const popEl=id=>document.querySelector('#'+id+':not([data-out])'); // выпадающие панели (меню, список ставок): уходящая уже не считается открытой
function popOut(p){ if(!p||!p.isConnected||p.dataset.out) return; p.dataset.out='1'; p.style.pointerEvents='none'; AU('ui.close');
 const D=RM()?90:140, fin=()=>{ if(p.isConnected) p.remove(); }; try{ const a=p.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(6px)'}],{duration:D,easing:'cubic-bezier(.5,0,.8,.4)',fill:'forwards'}); a.onfinish=fin; a.oncancel=fin; }catch(e){ fin(); } setTimeout(fin,D+100); }
// Фокус после закрытия окон (QA m5): окно/меню запоминает кнопку пульта, с которой открыто (w._ret); Esc и закрытие кнопкой с клавиатуры возвращают фокус на неё — как у списка ставок. Мышью закрыли — фокус не трогаем (обводка не «залипает»)
let nextRet=null; // кому вернуть фокус у окна, которое сейчас откроется (меню → правила / история / paytable: кнопка Menu)
const takeRet=w=>{ if(w){ w._ret=nextRet; AU('ui.open'); } nextRet=null; return w; };
const giveBack=w=>{ const r=w&&w._ret; if(r&&r.isConnected&&!r.disabled) r.focus({preventScroll:true}); };
// Игра готова к показу: картинки под заставкой разобраны (decode), фон тоже, два кадра прошло — до этого заставку не убираем (иначе поле и Рокко «выскакивают кусками»)
function gameReady(ms){ const L=[...document.querySelectorAll('#app img')].map(i=>i.decode?i.decode().catch(()=>0):0);
 try{ const bg=document.getElementById('bg'), m=bg&&/url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(bg).backgroundImage); if(m){ const im=new Image(); im.src=m[1]; if(im.decode) L.push(im.decode().catch(()=>0)); } }catch(e){}
 if(typeof window.roccoReady==='function') L.push(window.roccoReady()); // первый кадр Рокко (покой) на месте: иначе при открытии заставки он «выскакивает» следом
 const raf=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 return Promise.race([Promise.all(L).then(raf),new Promise(r=>setTimeout(r,ms))]); }
// Заставка (приветствие, ворота бонуса) закрывается так: игра перестраивается ПОД ней — без заставки раскладка другая (Рокко в полный рост), — картинки готовятся, и только потом заставка гаснет.
// Раньше render() рвал кадр рывком: сцена появлялась разом, а Рокко — на кадр позже. Закрытие идёт один раз, повторные нажатия игнорируются.
function leaveOverlay(ov,then){ if(!ov||!ov.isConnected||ov.dataset.out) return; ov.dataset.out='1'; ov.style.pointerEvents='none'; q.delete('screen'); if(ov.id==='wel'){ AU('ui.start'); window.bpAudio&&bpAudio.scene(scene); } // приветствие → музыка зала (кроссфейд)
 const W=window.Welcome, stop=W&&W.stop; if(W) W.stop=()=>{}; // render() вызвал бы Welcome.stop() и выгрузил демонстрации, которые ещё на экране
 ov.style.animation='none'; ov.querySelectorAll('.bu-panel,.pl8').forEach(p=>p.style.animation='none'); // при возврате в разметку CSS-появление началось бы заново
 ov.remove(); try{ render(); }finally{ if(W) W.stop=stop; }
 const app=document.getElementById('app'); if(!app){ return; } app.append(ov);
 gameReady(1000).then(()=>{ if(!ov.isConnected) return; const wel=ov.id==='wel', D=RM()?160:wel?420:260, E='cubic-bezier(.4,0,.2,1)';
  let ok=false; const fin=()=>{ if(ok) return; ok=true; if(ov.isConnected){ if(wel&&W) W.stop(); ov.remove(); } then&&then(); };
  try{ const pan=ov.querySelector('.bu-panel'); if(pan&&!RM()) pan.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(10px) scale(.97)'}],{duration:D*.85,easing:E,fill:'forwards'});
   const a=ov.animate([{opacity:1},{opacity:0}],{duration:D,easing:E,fill:'forwards'}); a.onfinish=fin; a.oncancel=fin; }catch(e){ fin(); } setTimeout(fin,D+150); }); }

// ---------- HUD: баланс, ставка, выигрыш ----------
function syncHUD(){
 document.querySelectorAll('#pod .k').forEach(k=>{const v=k.nextElementSibling; if(!v) return;
  if(k.textContent==='Balance') v.textContent=money(GS.bal);
  if(k.textContent==='Bet'||k.textContent==='Play') v.textContent=money(spinCost());});
 const r=document.getElementById('result'); if(r&&scene==='hall'){ const b=r.querySelector('b'); if(b) b.textContent=money(GS.replay?GS.replay.win:GS.lastWin); }
 const play=podBtn('Play')||podBtn('Skip')||podBtn('Stop autoplay')||podBtn('Replay');
 if(play){ const lab=GS.replay?'Replay':GS.auto?'Stop autoplay':GS.spinning?'Skip':'Play'; play.setAttribute('aria-label',lab);
  play.dataset.state=GS.auto?'stop':GS.spinning?'skip':GS.replay?'replay':''; } // значок на самой кнопке вместо таблички SKIP
 const ac=document.querySelector('#pod .acount'); if(ac) ac.textContent=GS.auto?(GS.auto===Infinity?'∞':GS.auto):'';
 const cap=document.getElementById('bp-playcap');
 if(cap) cap.textContent=GS.replay?'REPLAY':GS.auto?`STOP ${GS.auto===Infinity?'':GS.auto}`.trim():GS.spinning?'SKIP':'';
 const sp=document.querySelector('#pod .spd'); // клавиша скорости: 1–3 лампочки, зажатый пробел зажигает все три
 if(sp){ const lv={normal:1,quick:2,turbo:3}[GS.speed]||1; sp.dataset.s=GS.holdTurbo?3:lv; sp.classList.toggle('hold',GS.holdTurbo);
  sp.setAttribute('aria-label',`Spin speed: ${GS.holdTurbo?'Turbo (Space held)':{normal:'Normal',quick:'Quick',turbo:'Turbo'}[GS.speed]}`); }
 const betsOpen=!!popEl('bp-bets'), ch=document.getElementById('bp-chev'); if(ch) ch.classList.toggle('open',betsOpen); // стрелка в окне BET переворачивается, пока открыт список
 const bk=podBtn('Bet list'); if(bk) bk.setAttribute('aria-expanded',betsOpen);
 const au=podBtn('Autoplay'); if(au){ au.classList.toggle('on',GS.auto>0); // в бонусах («Камеры», «Кухня») автоигры нет — как и Buy bonus (машина есть только в зале): кнопка выключена, окно не открывается (QA m3)
  const lock=autoLocked(); au.disabled=lock; if(lock){ au.setAttribute('aria-disabled','true'); au.title='Autoplay is not available during bonuses'; } else{ au.removeAttribute('aria-disabled'); au.removeAttribute('title'); } }
 const mn=podBtn('Menu'); if(mn) mn.classList.toggle('on',!!popEl('bp-menu'));
 fitPod(); save();
}
// суммы в окнах пульта (BALANCE, BET): шрифт уменьшается, пока сумма не влезет в окно, но не меньше 11 px — так читаются и длинные валюты («10,000,000,000.00 ARS»)
function fitPod(){
 if(typeof podRelayout==='function') podRelayout(); // сначала окна растягиваются под сумму (ландшафт и телефон стоя), потом шрифт ужимается — только если растягивать уже некуда
 document.querySelectorAll('#pod .v').forEach(v=>{
  const box=v.parentElement, cs=getComputedStyle(box), avail=box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
  v.style.fontSize=''; v.style.letterSpacing=''; if(avail<=0) return;
  const base=parseFloat(getComputedStyle(v).fontSize); let sz=base;
  if(v.scrollWidth>avail+.5){ sz=Math.max(11,Math.floor(base*avail/v.scrollWidth*2)/2); v.style.fontSize=sz+'px';
   while(v.scrollWidth>avail+.5&&sz>11){ sz-=.5; v.style.fontSize=sz+'px'; }
   if(v.scrollWidth>avail+.5) v.style.letterSpacing='-.03em'; } // совсем крайний случай: 11 px и чуть теснее буквы
 });
}
let fitQ=false; const fitSoon=()=>{ if(fitQ) return; fitQ=true; queueMicrotask(()=>{ fitQ=false; fitPod(); }); };
document.fonts&&document.fonts.ready.then(fitPod); document.fonts&&document.fonts.addEventListener&&document.fonts.addEventListener('loadingdone',fitPod);
new MutationObserver(ms=>{ if(ms.some(m=>{ const n=m.target.nodeType===3?m.target.parentElement:m.target; return n&&n.closest&&n.closest('#pod .v'); })) fitSoon(); }).observe(document.body,{subtree:true,childList:true,characterData:true}); // соцрежим переписывает суммы уже после syncHUD
const podBtn=l=>document.querySelector(`#pod [aria-label="${l}"]`)||(/^Bet /.test(l)?document.querySelector(`#pod [aria-label="${l.replace(/^Bet/,'Play')}"]`):null); // в социальном режиме Bet → Play

// ---------- после каждой перерисовки макета ----------
const _render=render;
render=function(){ _render(); after(); };
// строки на воротах бонуса (после ворот — сами спины): настоящие числа из BONUS
const gateList=kind=>kind==='cameras'?`<li>Same as the Kitchen: the counter never resets, a full sack adds ${BONUS.dumpSpins} spins, Rocco pulls a trick every spin</li><li>Plus cameras record: where Rocco steals, that screen multiplies ×2, then ×4, ×${BONUS.recCap}</li><li>Screens keep their multipliers all bonus; a win is multiplied by ${BONUS.recMode==='sum'?'the sum':'the average'} of the multipliers under it</li>`:`<li>The counter never resets — it keeps growing</li><li>A full sack (${SACK_N} steals) pays again, steps the counter up and adds ${BONUS.dumpSpins} spins</li><li>Every spin Rocco pulls a trick: WILDs or a WILD column</li>`;
function after(){
 // табличка максимального выигрыша под вывеской — во всех сценах
 // табличка MAX WIN убрана из игры (владелец 2026-10-09): максимальный выигрыш показан на экране приветствия и в правилах
 // подписи у Play
 const play=podBtn('Play');
 if(play){ const r=play.getBoundingClientRect();
  const cap=el('div'); cap.id='bp-playcap'; cap.style.left=(r.left+r.width/2)+'px'; cap.style.top=(r.bottom-6)+'px';
  document.getElementById('app').append(cap); }
 roccoGuard();
 restoreBoard(); hudBuild(); demoWin(); setTimeout(warmClips,2500); setSpinsMeter(); if(bonusScene()&&GS.fs>0) setCounter(GS.kstep,false); else if(scene==='hall'&&!q.get('step')&&q.get('state')!=='win') setCounter(0,false); if(bonusScene()&&(q.get('screen')==='kitchen'||q.get('screen')==='cameras')){ const bg=document.querySelector('#ovl .big'), ul=document.querySelector('#ovl .bu-list'); if(bg&&GS.fs) bg.textContent=`${GS.fs} FREE SPINS`; if(ul) ul.innerHTML=gateList(scene); } // на воротах — настоящее число спинов

 fitPod(); // суммы в окнах пульта по ширине окна (стрелка списка ставок — часть разметки окна BET, index.html)
 if(q.get('screen')==='rules'){ q.delete('screen'); document.getElementById('ovl')?.remove(); setTimeout(()=>rules(),0); }
 // «Кухня» (владелец 2026-10-11, п.10): после ворот бесплатные спины идут сами. Страницу перезагрузили посреди бонуса — ворота не показываем и крутим дальше; спины кончились — сразу итог
 if(bonusScene()&&GS.fst>0&&!q.get('step')){
  setResult(GS.ktotal||0); // до первого спина строка TOTAL WIN показывала заготовку «$84.20»
  if(GS.fs<=0){ q.delete('screen'); document.getElementById('ovl')?.remove(); bonusEnd(); }
  else { if(GS.kgo&&(q.get('screen')==='kitchen'||q.get('screen')==='cameras')){ q.delete('screen'); document.getElementById('ovl')?.remove(); } if(!q.get('screen')) freeChain(700); }
 }
 // экраны поверх: закрыть правила, продолжить бонус
 const ov=document.getElementById('ovl');
 if(ov&&ov.querySelector('.rules')){ const x=el('button','bp-x','✕'); x.setAttribute('aria-label','Close'); x.onclick=()=>{q.delete('screen');render();}; ov.querySelector('.rules').append(x); x.focus(); }
 if(ov&&!window.__gateSnd&&ov.querySelector('.btnplay')&&(scene==='kitchen'||scene==='cameras')){ window.__gateSnd=1; AU(scene==='kitchen'?'kitchen.enter':'cams.enter',{delay:500}); } // ворота бонуса появились (раз на страницу)
 if(ov) ov.querySelectorAll('.btnplay').forEach(b=>b.onclick=()=>{ if(ov.dataset.out) return; AU(bonusScene()&&GS.fs>0?'freespins.start':'ui.confirm'); if(bonusScene()&&GS.fs>0){ GS.kgo=true; save(); } leaveOverlay(ov); }); // CONTINUE на воротах: ворота гаснут над готовой игрой; render() внутри запускает цепочку спинов «Кухни» / перезапуски «Камер» (after)
 // приветствие W2 (welcome.js): разметка, размеры и три демонстрации; PLAY, клик мимо пульта и пробел закрывают; без приветствия — часы и видео демонстраций остановлены
 const wl=document.getElementById('wel');
 if(window.Welcome){ if(wl) Welcome.open(wl,()=>leaveOverlay(wl)); else Welcome.stop(); } // PLAY: игра пересобирается под приветствием, оно растворяется (leaveOverlay)
 if(q.get('screen')==='bigwin') bigWin(64.5*bet(),false);
 if(q.get('screen')==='maxwin') bigWin(MAXX*bet(),true);
 if(q.get('screen')==='end') bonusEnd(true);
 if(scene==='cameras'&&window.CamRec){ CamRec.mount(document.getElementById('field')); CamRec.recAll(GS.rec||[]); } // «Камеры»: рамки-мониторы на клетках и REC-значки (после перезагрузки или смены размера — как были)
 syncHUD();
}

// ---------- Рокко не пропадает: если видео на паузе или не загрузилось — показываем стоп-кадр ----------
function roccoGuard(){
 const r=document.getElementById('rocco'), v=r&&r.querySelector('video:not(.act)'); if(!v||r.querySelector('img.still')) return;
 const im=el('img','still'); im.src=v.getAttribute('poster'); im.alt=''; Object.assign(im.style,{position:'absolute',left:0,top:0,height:'100%'}); r.prepend(im);
 const upd=()=>{ const act=r.querySelector('video.act'); const playing=(!v.paused&&v.readyState>=2)||(act&&act.style.opacity==='1'&&!act.paused); im.style.visibility=playing?'hidden':'visible'; };
 ['play','playing','pause','waiting','emptied','loadeddata'].forEach(ev=>v.addEventListener(ev,upd)); upd(); setInterval(upd,500);
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) document.querySelectorAll('#rocco video:not(.act),#paw video').forEach(v=>v.play().catch(()=>{})); });
// ---------- активный режим: окошко MODE в столбике счётчиков слева (вариант H, владелец 2026-10-10); автомат «Функции» остаётся на месте ----------
function modeBadge(){ hudBuild(); setSpinsMeter(); }
const _close=closeFeatures; closeFeatures=function(){ _close(); setTimeout(()=>{modeBadge();syncHUD();},260); };
// покупка — второй шаг с подтверждением (гайд Engine): суть, цена, одна кнопка BUY и тихая «Назад»
// Окно Buy bonus меняет содержимое (список режимов <-> подтверждение): размер плавно перетекает, содержимое выступает из затухания. Раньше ширина 980 -> 520 px и обратно прыгала за один кадр.
function buMorph(box,swap){ if(RM()||!box.animate){ swap(); return; }
 const w0=box.offsetWidth, h0=box.offsetHeight, in0=box.querySelector('.bu-in,.bb-in'); let ghost=null;
 if(in0){ const r=in0.getBoundingClientRect(), br=box.getBoundingClientRect(), cs=getComputedStyle(box); // прежнее содержимое остаётся поверх и гаснет: окно не пустеет посреди перехода
  ghost=in0.cloneNode(true); ghost.removeAttribute('id'); ghost.setAttribute('aria-hidden','true'); ghost.style.cssText=bpvT`position:absolute;left:${r.left-br.left-parseFloat(cs.borderLeftWidth)}px;top:${r.top-br.top-parseFloat(cs.borderTopWidth)}px;width:${r.width}px;height:${r.height}px;overflow:hidden;pointer-events:none;z-index:2`; }
 swap(); const w1=box.offsetWidth, h1=box.offsetHeight;
 box.style.overflow='hidden'; const E='cubic-bezier(.4,0,.2,1)';
 if(ghost){ box.append(ghost); const g=ghost.animate([{opacity:1},{opacity:0}],{duration:150,easing:'ease-in',fill:'forwards'}); g.onfinish=g.oncancel=()=>ghost.remove(); setTimeout(()=>ghost.remove(),400); }
 const a=box.animate([{width:w0+'px',height:h0+'px'},{width:w1+'px',height:h1+'px'}],{duration:280,easing:E});
 const fin=()=>{ box.style.overflow=''; }; a.onfinish=fin; a.oncancel=fin;
 const inn=box.querySelector('.bu-in,.bb-in'); if(inn) inn.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:200,delay:100,easing:'cubic-bezier(.2,.8,.3,1)',fill:'backwards'}); }
window.bbOpts=()=>({modes:MODES,bet:bet(),bal:GS.bal,on:modeOn,money,A,screw:buScrew,mini:'cards/'+POSTART+'kitchen.webp',inline:{pick:k=>`fpick('${k}')`,bet:d=>`fbet(${d})`,close:'closeFeatures()'}}); // данные для BuyBoard (buy-board.js)
fpick=function(k){ const m=MODES.find(x=>x.k===k), box=document.querySelector('#fmenu .bb'), price=bet()*m.x;
 if(m.toggle){ if(modeOn!==k&&GS.bal<price){ AU('ui.error'); return; } modeOn=modeOn===k?null:k; fredraw('#bu-go-'+k); return; } // режим выключить можно всегда; включить — только если хватает на спин
 if(GS.bal<price){ AU('ui.error'); return; } // карточка «NEED … MORE» не открывает подтверждение
 buMorph(box,()=>{ box.classList.add('bb-sm'); box.innerHTML=BuyBoard.confirm(bbOpts(),m); }); // второй шаг покупки: афиша, кнопка BUY и тихая «Back»
 box.querySelector('#bp-buy').focus();
 box.querySelector('#bp-back').onclick=()=>{ const t=document.createElement('div'); t.innerHTML=fmenuHTML(); const np=t.firstElementChild; // обратно к списку — тем же окном, без пересоздания
  buMorph(box,()=>{ box.className=np.className; box.innerHTML=np.innerHTML; }); box.querySelector('#bu-go-'+k)?.focus(); };
 box.querySelector('#bp-buy').onclick=()=>{ if(GS.bal<price){ AU('ui.error'); box.querySelector('#bp-buy span').textContent='NOT ENOUGH BALANCE'; return; } AU('ui.buy');
  GS.bal-=price; save(); if(k==='kitchen') startBonus(BONUS.spinsK,null,null,'kitchen'); else startBonus(BONUS.spinsC4,null,null,'cameras'); };
};

// ---------- окна F: меню, правила, история (dialogs-f.js, выбор владельца 2026-10-11) ----------
// Логика остаётся здесь, оформление — в dialogs-f.js/.css. Тексты правил (RULES) — общие для F и прежних окон (?dlg=old). Переключатели для сравнения: ?dlg=old, ?dlgnav=top|side. Вид один: шрифты набора 2, латунная линейка (выбор владельца 2026-10-11).
const DLGF=()=>!!(window.DlgF&&DlgF.on());
const dlgCtx=()=>({GS,RM,money,bet,A,SYM,MAXX,RULES,el,save,syncHUD,popOut,winOut,takeRet,giveBack,startReplay,rules,history,popEdge,setRet:v=>{nextRet=v;}});

// ---------- меню ----------
function toggleMenu(){ // меню — монитор охраны (выбор владельца 2026-10-09): корпус как у пульта, внутри экран ночного видения
 const old=popEl('bp-menu'); if(old){ popOut(old); syncHUD(); podBtn('Menu')?.focus(); return; }
 document.querySelectorAll('#bp-menu[data-out]').forEach(e=>e.remove());
 const b=podBtn('Menu'), r=b.getBoundingClientRect();
 if(DLGF()) return DlgF.menu(dlgCtx(),b); // окна F (dialogs-f.js); ?dlg=old — прежний монитор
 const bar=(k,lab)=>`<label class="ln"><span class="lb">${lab}</span><span class="bar" aria-hidden="true">${'<i></i>'.repeat(10)}</span><output>${GS[k]}%</output><input type="range" id="bp-${k}" min="0" max="100" step="10" value="${GS[k]}" aria-label="${lab} volume"></label>`;
 const m=el('div','crt',`<div class="scr"><div class="hd"><span>CAM 00 · SETTINGS</span><span class="rec">● REC</span></div>
  <div class="sel" role="group" aria-label="Sound"><span class="lb">SOUND</span>${[['on','ON'],['off','OFF']].map(([v,t])=>`<button data-m="${v}" class="${(GS.mute?'off':'on')===v?'on':''}" aria-pressed="${(GS.mute?'off':'on')===v}">${t}</button>`).join('')}</div>
  ${bar('music','MUSIC')}${bar('sfx','EFFECTS')}
  <div class="sel" role="group" aria-label="Spin speed"><span class="lb">SPEED</span>${[['normal','NORMAL'],['quick','QUICK'],['turbo','TURBO']].map(([v,t])=>`<button data-v="${v}" class="${GS.speed===v?'on':''}" aria-pressed="${GS.speed===v}">${t}</button>`).join('')}</div>
  <div class="ln lang"><span class="lb">LANG</span><span>ENGLISH</span></div>
  <div class="cmd">${[['rules','RULES'],['pay','PAYTABLE'],['hist','HISTORY'],['fs','FULLSCREEN']].map(([g,t])=>`<button data-go="${g}">${t}</button>`).join('')}</div></div>
  <i class="rv" style="left:7px;top:7px"></i><i class="rv" style="right:7px;top:7px"></i><i class="rv" style="left:7px;bottom:7px"></i><i class="rv" style="right:7px;bottom:7px"></i><span class="led" aria-hidden="true"></span>`);
 m.id='bp-menu'; m.setAttribute('role','dialog'); m.setAttribute('aria-label','Menu'); m._ret=b;
 document.body.append(m); const mh=m.offsetHeight, mw=m.offsetWidth;
 const pod=document.getElementById('pod').getBoundingClientRect(), E=popEdge(); // выдвигается из верхнего края пульта
 m.style.left=Math.max(E.l,Math.min(innerWidth-mw-E.r,pod.left+8))+'px'; m.style.top=Math.max(E.t,pod.top-mh+6)+'px';
 if(!RM()) m.animate([{clipPath:`inset(0 0 ${mh}px 0)`,transform:`translateY(${mh}px)`},{clipPath:'inset(0 0 0px 0)',transform:'translateY(0px)'}],{duration:340,easing:'cubic-bezier(.2,.8,.3,1)'}); // видна только часть над краем пульта
 m.style.zIndex=50; document.getElementById('pod').style.zIndex=60; // пульт поверх — экран будто выезжает из него
 if(!RM()) m.querySelector('.scr').animate([{clipPath:'inset(49.5% 0 49.5% 0)',filter:'brightness(3)'},{clipPath:'inset(49.5% 0 49.5% 0)',filter:'brightness(3)',offset:.25},{clipPath:'inset(0 0 0 0)',filter:'brightness(1.4)',offset:.7},{clipPath:'inset(0 0 0 0)',filter:'brightness(1)'}],{duration:320,easing:'ease-out'}); // экран включается, как старый монитор
 m.querySelectorAll('input[type=range]').forEach(inp=>{ const k=inp.id.slice(3), o=inp.previousElementSibling, cells=inp.parentElement.querySelectorAll('.bar i');
  const paint=()=>{ o.textContent=inp.value+'%'; cells.forEach((c,n)=>c.classList.toggle('f',n<Math.round(inp.value/10))); };
  paint(); inp.oninput=()=>{ GS[k]=+inp.value; paint(); if(GS.mute) setMute(false); save(); }; }); // сдвинул громкость при OFF — звук включается
 const setMute=off=>{ GS.mute=off; m.querySelectorAll('[data-m]').forEach(x=>{const on=(x.dataset.m==='off')===off; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on);}); m.classList.toggle('muted',off); }; // при OFF ползунки MUSIC и EFFECTS серые (владелец 2026-10-11)
 m.classList.toggle('muted',GS.mute);
 m.onclick=e=>{ const v=e.target.closest('[data-v]'), g=e.target.closest('[data-go]'), mu=e.target.closest('[data-m]');
  if(mu){ setMute(mu.dataset.m==='off'); save(); }
  if(v){ GS.speed=v.dataset.v; m.querySelectorAll('[data-v]').forEach(x=>{x.classList.toggle('on',x===v); x.setAttribute('aria-pressed',x===v);}); syncHUD(); }
  if(g){ nextRet=m._ret; m.remove(); if(g.dataset.go==='rules') rules(); if(g.dataset.go==='pay') rules('pay'); if(g.dataset.go==='hist') history();
   if(g.dataset.go==='fs'){ const d=document.documentElement; try{ (document.fullscreenElement||document.webkitFullscreenElement?(document.exitFullscreen||document.webkitExitFullscreen).call(document):(d.requestFullscreen||d.webkitRequestFullscreen).call(d))?.catch?.(()=>{}); }catch(err){} } syncHUD(); } };
 m.querySelector('input').focus(); syncHUD();
}
function closeBets(hard){ const p=document.getElementById('bp-bets'); if(!p) return; if(hard) p.remove(); else popOut(p); syncHUD(); }
function betList(){
 if(popEl('bp-bets')){ closeBets(); return; }
 AU('ui.open');
 document.querySelectorAll('#bp-bets[data-out]').forEach(e=>e.remove());
 const b=podBtn('Bet list'), r=b.getBoundingClientRect();
 const p=el('div',null,BETS.map((v,i)=>`<button class="bp-chip${i===betI?' on':''}" data-i="${i}">${money(v)}</button>`).join('')); p.id='bp-bets'; p.setAttribute('role','dialog'); p.setAttribute('aria-label','Bet list');
 document.body.append(p); const w=p.offsetWidth, h=p.offsetHeight;
 const E=popEdge(); p.style.left=Math.max(E.l,Math.min(innerWidth-w-E.r,r.left+r.width/2-w/2))+'px'; p.style.top=Math.max(E.t,r.top-h-10)+'px';
 p.onclick=e=>{ const c=e.target.closest('[data-i]'); if(!c) return; AU(+c.dataset.i>betI?'ui.bet_up':'ui.bet_down'); betI=+c.dataset.i; closeBets(); b.focus(); };
 p.querySelector('.on')?.focus(); syncHUD();
}
// ---------- окна ----------
function dlg(title,html,onClose){
 const w=el('div','bp-wrap',`<div class="bp-box" role="dialog" aria-modal="true" aria-label="${title}"><button class="bp-x" aria-label="Close">✕</button><h2>${title}</h2>${html}</div>`); takeRet(w);
 const close=e=>{ if(w.dataset.out) return; winOut(w); onClose&&onClose(); syncHUD(); if(e&&e.detail===0) giveBack(w); };
 w.querySelector('.bp-x').onclick=close; w.onclick=e=>{ if(e.target===w) close(); }; w.close=close;
 document.body.append(w); w.querySelector('.bp-x').focus(); return w;
}
const autoLocked=()=>scene!=='hall'; // бонусные сцены: автоигра недоступна
function autoplay(){
 if(autoLocked()) return; nextRet=podBtn('Autoplay');
 if(DLGF()&&DlgF.auto) return DlgF.auto({...dlgCtx(),spinCost,spin,setAuto:(n,o)=>{ GS.autoOpt=o; GS.auto=n; }}); // окно F (dialogs-f-auto.js): старт только по кнопке START; ?dlg=old — прежнее окно ниже
 const N=[10,25,50,100,500]; let n=25;
 const w=dlg('AUTOPLAY',`<div class="bp-lab">Number of spins</div><div class="bp-row">${N.map(v=>`<button class="bp-chip${v===n?' on':''}" data-n="${v}">${v}</button>`).join('')}</div>
  <div class="bp-lab">Stop when</div><div class="bp-row"><button class="bp-chip on" data-sb>A bonus starts</button><button class="bp-chip" data-sw>A single win is 100× or more</button></div>
  <button class="bp-btn gold" id="bp-astart">START ${n} SPINS</button><div class="bp-lab" style="margin-top:10px">Each spin costs ${money(spinCost())}. Press Play to stop at any time.</div>`);
 w.onclick=e=>{ if(e.target===w){w.close();return;} const c=e.target.closest('[data-n]');
  if(c){ n=+c.dataset.n; w.querySelectorAll('[data-n]').forEach(x=>x.classList.toggle('on',x===c)); w.querySelector('#bp-astart').textContent=`START ${n} SPINS`; }
  if(e.target.closest('[data-sb]')) e.target.closest('[data-sb]').classList.toggle('on');
  if(e.target.closest('[data-sw]')) e.target.closest('[data-sw]').classList.toggle('on');
  if(e.target.id==='bp-astart'){ GS.autoOpt={stopBonus:w.querySelector('[data-sb]').classList.contains('on'),stopWin:w.querySelector('[data-sw]').classList.contains('on')?100:0}; GS.auto=n; w.close(); if(!GS.spinning) spin(); } };
}
function history(){ if(DLGF()) return DlgF.history(dlgCtx()); // история — тот же большой монитор (владелец 2026-10-10): ручки листают страницы, [REPLAY] запускает повтор
 const PER=8, pages=Math.max(1,Math.ceil(GS.hist.length/PER)); let pg=0, turn=0;
 const w=el('div','bp-wrap',`<div class="mon" role="dialog" aria-modal="true" aria-label="History">
  <div class="mon-scr"><div class="mon-hd"><span>CAM 00 · HISTORY</span><span class="rec">● REC</span></div><div class="mon-txt cam-txt hist" aria-live="polite"></div></div>
  <div class="mon-base"><span class="mon-brand">BLACKOUT · HISTORY</span><span class="mon-meta"><b>ROUNDS ${GS.hist.length}</b><span class="mon-pos"></span></span>
   <span class="mon-knobs"><button class="knob kprev" aria-label="Newer rounds"><i></i>CH −</button><button class="knob knext" aria-label="Older rounds"><i></i>CH +</button><span class="pwr" aria-hidden="true"></span><button class="mon-x" aria-label="Close">[X]</button></span></div></div>`); takeRet(w);
 const close=e=>{ winOut(w); syncHUD(); if(e&&e.detail===0) giveBack(w); }; w.close=close; w.querySelector('.mon-x').onclick=close; w.onclick=e=>{ if(e.target===w) close(); };
 const show=p=>{ pg=(p+pages)%pages; const rows=GS.hist.slice(pg*PER,pg*PER+PER);
  w.querySelector('.mon-txt').innerHTML=rows.length?`<table><tr><th>#</th><th>TIME</th><th>MODE</th><th style="text-align:right">COST</th><th style="text-align:right">WIN</th><th></th></tr>${rows.map((h,k)=>{const n=pg*PER+k; return `<tr class="${h.win>0?'w':''}"><td>${String(n+1).padStart(2,'0')}</td><td>${h.t}</td><td>${h.mode.toUpperCase()}</td><td class="n">${money(h.cost)}</td><td class="n">${money(h.win)}</td><td style="text-align:right">${h.norep?'':`<button class="rp" data-r="${n}">[REPLAY]</button>`}</td></tr>`;}).join('')}</table>`:'<p>NO ROUNDS YET. PRESS PLAY.</p>';
  w.querySelector('.mon-pos').textContent=`PAGE ${pg+1} / ${pages}`; };
 const knob=d=>{ turn+=d*30; w.querySelectorAll('.knob i').forEach(i=>i.style.transform=`rotate(${turn}deg)`); show(pg+d); };
 w.querySelector('.kprev').onclick=()=>knob(-1); w.querySelector('.knext').onclick=()=>knob(1);
 w.addEventListener('click',e=>{ const b=e.target.closest('[data-r]'); if(!b) return; const h=GS.hist[+b.dataset.r]; winOut(w); syncHUD(); startReplay(h); });
 document.body.append(w); show(0); w.querySelector('.mon-x').focus();
 if(!RM()) w.querySelector('.mon-scr').animate([{filter:'brightness(3)',clipPath:'inset(49% 0 49% 0)'},{filter:'brightness(1)',clipPath:'inset(0 0 0 0)'}],{duration:300,easing:'ease-out'});
}

// ---------- правила игры: вкладки-разделы, как в Fat Food (RNGeesus) ----------
const RULES=[
 ['pay','Paytable',()=>`<p>Pays for 8 or more of the same symbol anywhere on the grid. Values are shown for the current bet of ${money(bet())}. Inside the Kitchen and the Cameras they are scaled down: see their sections.</p>
  <table><tr><th></th><th></th><th style="text-align:right">8–9</th><th style="text-align:right">10–11</th><th style="text-align:right">12+</th></tr>${Object.entries(PAY).map(([id,[nm,a,b2,c]])=>`<tr><td><img src="${SYM(id)}" alt=""></td><td>${nm}</td>${[a,b2,c].map(x=>`<td class="n">${money(x*bet())}</td>`).join('')}</tr>`).join('')}</table>`],
 ['special','Special symbols',()=>`<div class="sym"><img src="${SYM('sym-wild')}" alt=""><div><b>WILD — golden ticket</b><p>Counts as any regular symbol, in every win on the grid at once. It leaves with the win it helped. It has no multiplier of its own.</p></div></div>
  <div class="sym"><img src="${SYM('sym-scatter-invitation')}" alt=""><div><b>Invitation</b><p>3 anywhere start the Kitchen. 4 or more start the Cameras. Rocco never steals invitations.</p></div></div>`],
 ['how','How to play',()=>`<ol><li>6 columns × 5 rows, 30 symbols.</li><li>A win is 8 or more of the same symbol anywhere. WILDs count as that symbol: 5 balloons and 3 WILDs win. The pay depends on the total: 8–9, 10–11 or 12+. Wins of different symbols add up.</li><li>Rocco steals the winning symbols and the WILDs that helped, new ones fall in, and you can win again in the same spin. This repeats while there are wins.</li><li>Invitations start the bonus: 3 start the Kitchen, 4 or more start the Cameras. Both are free spins, and each has its own section here.</li></ol>
  <div class="callout">Every spin in the base game starts at ×1. Each steal moves Rocco's counter one step up, and the next win is multiplied by it.</div>`],
 ['counter','Rocco’s counter',()=>`<div class="ladder">${['×1','×2','×3 TOSS','×5','×8 PUNCH','×10','×15 LEVER'].map(t=>`<span class="${/[A-Z]/.test(t)?'t':''}">${t}</span>`).join('')}</div>
  <ol><li><b>Toss</b> at ×3 — Rocco throws 2–3 WILDs onto the grid.</li><li><b>Punch</b> at ×8 — Rocco punches the frame and a column turns WILD. The WILDs wait for the next win, help it and leave with it.</li><li><b>Lever</b> at ×15 — the lights go out and every regular symbol turns into one.</li></ol>
  <div class="callout">Rocco’s prank: now and then, at the start of a spin, Rocco tosses 2–3 WILDs or starts the counter at ×2 by himself.</div>`],
 ['kitchen','The Kitchen',()=>`<ol><li>3 invitations anywhere start the Kitchen: ${BONUS.spinsK} free spins.</li><li>The rules are the same as in the base game, but Rocco’s counter never resets. It keeps growing for the whole bonus, up to ×${LADDER.kitchen[LADDER.kitchen.length-1]}.</li><li>At the start of every free spin Rocco pulls a trick: he throws ${BONUS.spinWild[0]}–${BONUS.spinWild[1]} WILDs onto the grid, or (about ${Math.round(BONUS.startPunch*10)} spins in 10) punches the frame and one column turns WILD. The WILDs wait for the next win, help it and leave with it.</li><li>Rocco’s sack: every stolen win counts at once and is also added to his sack. Every ${SACK_N} steals he empties it: its contents are added to your win a second time, the counter goes up one step and you get ${BONUS.dumpSpins} more free spins. The ${SACK_N} lamps next to the SACK window show the steals.</li><li>3 or more new invitations add ${BONUS.retroSpins} spins.</li><li>In the Kitchen the paytable values count ×${+BONUS.kitPay.toPrecision(2)}: the counter and the sack make up for it.</li></ol>`],
 ['cameras','The Cameras',()=>`<ol><li>4 invitations anywhere start the Cameras: ${BONUS.spinsC4} free spins. 5 or more give ${BONUS.spinsC5}.</li><li>The rules are the Kitchen’s: the counter never resets, every spin starts with Rocco’s trick (WILDs or a WILD column), a full sack of ${SACK_N} steals pays again, steps the counter up and adds ${BONUS.dumpSpins} spins, and 3 or more new invitations add ${BONUS.retroSpins} spins.</li><li><b>Cameras record.</b> Every cell is a monitor. Where Rocco steals, that screen lights up and shows ×2. Steal there again — ×4, then ×${BONUS.recCap} (the highest). The glow turns from cream to amber to red as the number grows, and stays for the whole bonus.</li>${BONUS.recMode==='sum'?`<li>A win is multiplied by the sum of the numbers on its winning screens, then by the counter. Dark screens add nothing, and if there are none the factor is ×1. A WILD that is part of the win counts its screen’s number.</li>`:`<li>A win is multiplied by the average of the screen multipliers on its winning cells — add them up and divide by the number of winning cells; a screen without a multiplier counts as 0, and the factor is never below ×1. A WILD that is part of the win counts its screen’s multiplier. Then the counter multiplies it as usual.</li>`}<li>A screen’s multiplier appears after the steal, so it works from the next win.</li><li>In the Cameras the paytable values count ×${+BONUS.camPay.toPrecision(2)}: the screen multipliers make up for it.</li></ol>
  <div class="callout">${BONUS.recMode==='sum'?'Example: one screen shows ×4 and another ×2. A win covers both, so it is multiplied by 4 + 2 = 6. If the counter shows ×3, that makes ×18 in all.':'Example: a win covers 10 cells. Four of them show ×2, ×2, ×4 and ×8; the other six screens have no multiplier. The average is (2 + 2 + 4 + 8) ÷ 10 = 1.6, so the win is multiplied by 1.6. With the counter at ×3 that makes ×4.8 in all.'}</div>`],
 ['buy','Buy bonus',()=>`<p>Bonuses and modes are bought from the Buy bonus machine next to the grid. They are not available during free spins and autoplay.</p>
  ${MODES.map(m=>`<div class="buy"><img src="${A}${m.img}" alt=""><div><b>${m.nm}</b><div class="chips"><span>PRICE <em>${m.x}× bet</em></span>${m.toggle?'<span>EVERY SPIN</span>':'<span>STARTS AT ONCE</span>'}</div><p>${m.d}</p></div></div>`).join('')}`],
 ['max','Max win',()=>`<p>The maximum win is <b>${MAXX.toLocaleString('en-US')}×</b> the bet in every mode. When a round reaches it, the round ends at once and the max win is paid.</p>`],
 ['rtp','RTP',()=>`<p>Theoretical return to player and max win for every mode. Draft values until the game math is final.</p><table><tr><th>Mode</th><th style="text-align:right">Price</th><th style="text-align:right">RTP</th><th style="text-align:right">Max win</th></tr>${[['Base game','1×'],...MODES.map(m=>[m.nm.replace(/\b\w/g,c=>c).toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase()),m.x+'×'])].map(([n,p])=>`<tr><td>${n}</td><td class="n">${p}</td><td class="n">96.0%</td><td class="n">${MAXX.toLocaleString('en-US')}×</td></tr>`).join('')}</table>`],
 ['controls','Controls',()=>`<ul class="ctl"><li><b>Play</b> starts a spin. During a spin it becomes Skip: each press finishes the animation that is playing now, then the game goes on at normal speed. Press again to skip the next one.</li><li><b>Space</b> works like Play. Hold Space to finish the current spin at turbo speed; every new spin needs a new press.</li><li><b>− / +</b> change the bet; the arrow opens the bet list.</li><li><b>Autoplay</b> runs a chosen number of spins after confirmation. Press Play to stop.</li><li><b>Speed key</b> (› ›› ›››) switches Normal, Quick and Turbo; its lamps show the speed.</li><li><b>Menu</b> holds sound on/off, music and effects volume, spin speed, language, rules, paytable, history and fullscreen.</li><li><b>Buy bonus</b> opens the bonus buys and modes.</li></ul>`],
 ['legal','Legal information',()=>`<p>Malfunction voids all pays and plays. Results are decided by the game server before the animation starts; animations, speed and skipping never change a result. Pays are shown in the selected currency. Unfinished rounds are completed when you return to the game.</p>`]];
function rules(start){ if(DLGF()) return DlgF.rules(dlgCtx(),start); // правила — один большой монитор (вариант A, выбор владельца 2026-10-10): каналы на экране, ручки CH−/CH+ листают, [X] закрывает
 let idx=Math.max(0,RULES.findIndex(r=>r[0]===(start||'how'))), turn=0;
 const n2=k=>String(k+1).padStart(2,'0');
 const w=el('div','bp-wrap',`<div class="mon" role="dialog" aria-modal="true" aria-label="Game rules">
  <div class="mon-scr">
   <nav class="mon-ch" aria-label="Rules sections">${RULES.map((r,k)=>`<button data-t="${k}">${n2(k)} ${r[1].toUpperCase()}</button>`).join('')}</nav>
   <div class="mon-hd"><span class="mon-name"></span><span class="rec">● REC</span></div>
   <div class="mon-txt cam-txt" aria-live="polite"></div>
  </div>
  <div class="mon-base">
   <span class="mon-brand">BLACKOUT · RULES</span>
   <span class="mon-meta"><b>RTP 96.0%</b><span>MAX ${MAXX.toLocaleString('en-US')}×</span><span class="mon-pos"></span></span>
   <span class="mon-knobs"><button class="knob kprev" aria-label="Previous section"><i></i>CH −</button><button class="knob knext" aria-label="Next section"><i></i>CH +</button><span class="pwr" aria-hidden="true"></span><button class="mon-x" aria-label="Close">[X]</button></span>
  </div></div>`); takeRet(w);
 const close=e=>{ winOut(w); syncHUD(); if(e&&e.detail===0) giveBack(w); }; w.close=close;
 w.querySelector('.mon-x').onclick=close; w.onclick=e=>{ if(e.target===w) close(); };
 const show=k=>{ idx=(k+RULES.length)%RULES.length;
  w.querySelectorAll('.mon-ch button').forEach((b,m)=>{ b.classList.toggle('on',m===idx); b.setAttribute('aria-current',m===idx?'true':'false'); });
  w.querySelector('.mon-name').textContent=`CH ${n2(idx)} · ${RULES[idx][1].toUpperCase()}`;
  w.querySelector('.mon-txt').innerHTML=RULES[idx][2](); w.querySelector('.mon-txt').scrollTop=0;
  w.querySelector('.mon-pos').textContent=`${idx+1} / ${RULES.length}`;
  w.querySelector('.mon-ch button.on').scrollIntoView({block:'nearest',inline:'nearest'});
  if(!RM()) w.querySelector('.mon-txt').animate([{opacity:.2,filter:'brightness(2)'},{opacity:1,filter:'brightness(1)'}],{duration:220,easing:'ease-out'}); };
 const knob=(d)=>{ turn+=d*30; w.querySelectorAll('.knob i').forEach(i=>i.style.transform=`rotate(${turn}deg)`); show(idx+d); }; // ручка поворачивается на щелчок
 w.querySelector('.kprev').onclick=()=>knob(-1); w.querySelector('.knext').onclick=()=>knob(1);
 w.addEventListener('click',e=>{ const t=e.target.closest('[data-t]'); if(t) show(+t.dataset.t); });
 w.addEventListener('keydown',e=>{ if(e.key==='ArrowRight'||e.key==='ArrowDown'){ e.preventDefault(); knob(1); } if(e.key==='ArrowLeft'||e.key==='ArrowUp'){ e.preventDefault(); knob(-1); } });
 document.body.append(w); show(idx); w.querySelector('.mon-ch button.on').focus();
 if(!RM()) w.querySelector('.mon-scr').animate([{filter:'brightness(3)',clipPath:'inset(49% 0 49% 0)'},{filter:'brightness(1.3)',clipPath:'inset(0 0 0 0)',offset:.6},{filter:'brightness(1)',clipPath:'inset(0 0 0 0)'}],{duration:320,easing:'ease-out'});
}
// ---------- реплей ----------
function startReplay(h){
 GS.replay=h; document.getElementById('bp-replay')?.remove();
 const bar=el('div',null,`REPLAY · ${h.t} · WIN ${money(h.win)} <button id="bp-rpa">PLAY AGAIN</button><button id="bp-rpx">EXIT</button>`); bar.id='bp-replay'; document.body.append(bar);
 bar.querySelector('#bp-rpa').onclick=()=>spin(); bar.querySelector('#bp-rpx').onclick=()=>{GS.replay=null;bar.remove();syncHUD();};
 spin();
}
// ---------- большой / максимальный выигрыш: шоу bigwin-show.js (владелец 2026-10-10: плашка A1, главы 10×/25×/50×/100×, финал на максимуме) ----------
function bigWin(amount,isMax,done,bt,summary){ // summary — шоу как итог бонуса ({title,btn,hold}, см. bigwin-show.js)
 if(document.querySelector('#bp-big:not([data-out])')||BWWAIT) return;   // data-out — оверлей уже гаснет (bigwin-show.js), он не считается
 // «Тот же Рокко»: шоу ставит своего Рокко ровно на место Рокко зала в позе покоя. Если зальный как раз в движении (радость, глотание), даём ему дойти до нейтрального окна своего ролика — не дольше 1,5 с; в Turbo/Quick (роликов нет), под ?screen=… и «меньше движения» не ждём.
 const wait=(!q.get('screen')&&K()>=1&&window.roccoRestIn)?Math.min(1500,window.roccoRestIn()):0; if(window.roccoHush&&wait>=0&&!q.get('screen')) window.roccoHush();
 const go=()=>{ BWWAIT=0; BigWinShow.play({amount,bet:bt||bet(),isMax,moneyFmt:money,summary,onDone:()=>{ if(q.get('screen')){q.delete('screen');} done&&done(); syncHUD(); }}); }; // оверлей #bp-big с .next(): тап/пробел — доматать, ещё раз — закрыть
 if(wait>60){ BWWAIT=1; setTimeout(go,wait+30); } else go();
}
function bonusEnd(onlyWindow){ // итог бонуса — ОДИН экран (владелец/QA m2: раньше BIG WIN и сразу «COMPLETE» с той же суммой, два нажатия). Сумма ≥ 10× ставки: шоу большого выигрыша, и его последний кадр и есть итог («CAMERAS COMPLETE», сумма, CONTINUE). Меньше — окно «Красная сталь» D1 (bonus-ui.css): сумма на стекле и одна кнопка CONTINUE; Esc и клик мимо окна делают то же самое (раньше в «Кухне» закрытие оставляло игру в пустой кухне). onlyWindow — только окно (?screen=end в «Экранах макета»)
 if(document.querySelector('.bp-wrap')||document.querySelector('#bp-big:not([data-out])')) return; const nm=scene==='cameras'?'CAMERAS':'KITCHEN', tot=GS.ktotal||84.2, amt=money(tot); if(bonusScene()&&!onlyWindow) AU('kitchen.end');
 let gone=false; const fin=()=>{ if(gone) return; gone=true; GS.fs=0; GS.fst=0; GS.ktotal=0; GS.sack=0; GS.kstep=0; GS.ksteals=0; GS.kintro=false; GS.rec=null; GS.kind=null; GS.kgo=false; if(window.CamRec) CamRec.clear(); save(); toScreen('?state=idle'); };
 const bt=bet();
 if(!onlyWindow&&tot>=10*bt){ bigWin(tot,tot>=MAXX*bt,()=>{ q.delete('screen'); fin(); },bt,{title:nm+' COMPLETE',btn:'CONTINUE',hold:true}); return; } // шоу остаётся под шторкой до ухода со страницы (hold)
 // CONTINUE: окно остаётся на экране, пока шторка (занавес) не закроет всё — раньше оно исчезало на кадр раньше шторки, и между ними мелькала игра. Страница не ушла (шторка отменилась) — окно гаснет само.
 const w=el('div','bp-wrap',`<div class="bu-panel bu-end" role="dialog" aria-modal="true" aria-labelledby="bu-et"><div class="bu-in"><span class="bu-tag">Bonus</span><div class="bu-h" id="bu-et" role="heading" aria-level="2">${nm} COMPLETE</div>
  <div class="bu-fit"><div class="bu-scr bu-total" style="--n:${amt.length}">${amt}</div></div><span class="bu-cap">Total bonus win</span>
  <div class="bu-btns"><button class="bu-lens" id="bp-cont">CONTINUE</button></div></div></div>`);
 w.close=()=>{ if(gone) return; q.delete('screen'); w.style.pointerEvents='none'; fin(); syncHUD(); setTimeout(()=>{ if(w.isConnected){ gone=false; winOut(w); } },9500); };
 w.onclick=e=>{ if(e.target===w) w.close(); }; w.querySelector('#bp-cont').onclick=()=>w.close();
 document.body.append(w); w.querySelector('#bp-cont').focus(); syncHUD();
}

// ---------- движок спина (2026-10-10): падение символов, каскады, счётчик Рокко, трюки, кухня ----------
// Исход в макете случайный, но от seed: тот же seed даёт тот же раунд, поэтому реплей проигрывает то же самое.
// В настоящей игре исход приходит из книги событий RGS, а движок только показывает его.
const ROWS=5, COLS=6;
// --- правила бонусов и веса символов (черновые числа; подгонка симуляцией tools/rtp_sim, блок между CAL-метками пишет tools/rtp_sim/export_ui.js из config_final.json) ---
// <<<CAL rules
const INV_W=0.875, INV_B=0.9678, WILD_W=2; // вес приглашения среди символов в зале; вес приглашения в бесплатных спинах (отдельно, чтобы частота «Кухни» в зале не меняла внутренности бонусов); вес WILD в зале (в бонусах WILD падают только от Рокко)
const MODE_X={hungry:{inv:0.9335,wild:0.5},double:{inv:1.1612,wild:1.9}}; // во сколько раз режим меняет вес приглашения (inv) и WILD (wild, только зал); без режима — ×1
const BONUS={spinsK:10,spinsC4:10,spinsC5:12,spinWild:[1,2],startPunch:0.3,sackEvery:8,dumpSpins:3,retroSpins:5,recCap:8,recMode:"sum",kitPay:0.195276,camPay:0.003691,camPayAvg:0.038191,camPaySum:0.003691}; // правила бонусов: спины «Кухни» / «Камер» (4 и 5+ приглашений), начало спина — подброс 1–2 WILD или (с шансом startPunch) удар, мешок раз в sackEvery краж (+dumpSpins спинов), +retroSpins за 3+ приглашения, потолок множителя экрана, как считается множитель выигрыша (sum — сумма, как решил владелец; avg — среднее), множитель выплат таблицы в «Кухне» (kitPay) и в «Камерах» для каждого из двух способов (camPay — действующий)
// >>>CAL rules
// способ счёта множителей экранов «Камер»: sum — сумма (решение владельца), avg — среднее по клеткам выигрыша (запасной, см. docs/MECHANICS.md); ?rec=sum|avg, выбор помнит вкладка (sessionStorage bp-rec); у каждого способа свой множитель выплат camPay
{ let m=q.get('rec'); try{ if(m==='sum'||m==='avg') sessionStorage.setItem('bp-rec',m); else m=sessionStorage.getItem('bp-rec'); }catch(e){} if((m==='sum'||m==='avg')&&BONUS.camPayAvg!=null&&BONUS.camPaySum!=null){ BONUS.recMode=m; BONUS.camPay=m==='avg'?BONUS.camPayAvg:BONUS.camPaySum; } }
const SACK_N=BONUS.sackEvery; // кражи до высыпания мешка = лампы SACK
const WILD_KITCHEN=0; // вес WILD среди символов бесплатных спинов: там билеты приходят только от Рокко (начало спина, ступени счётчика); в зале вес обычный (WGT)
const FORCE_P=0.0382; // шанс, что на поле сразу лежит кластер 8–11 одинаковых символов
const bonusScene=()=>scene==='kitchen'||scene==='cameras'; // «Кухня» и «Камеры» — одна механика (бесплатные спины), «Камеры» добавляют REC на клетках
const spinsFor=inv=>inv>=5?{kind:'cameras',n:BONUS.spinsC5}:inv===4?{kind:'cameras',n:BONUS.spinsC4}:inv===3?{kind:'kitchen',n:BONUS.spinsK}:null; // 3 приглашения — «Кухня», 4+ — «Камеры»
const symSrc=id=>SYM(id);
const WGT=[['sym-low-cup',12],['sym-low-hat',12],['sym-low-balloon',12],['sym-low-horn',12],['sym-low-cupcake',12],['sym-high-mic',9],['sym-high-gift',8],['sym-high-pizza',7],['sym-high-mask',6],['sym-wild',WILD_W],['sym-scatter-invitation',INV_W]];
WGT.forEach(([id])=>{ const im=new Image(); im.decoding='async'; im.src=SYM(id); }); /* заранее загружаем символы, чтобы первый спин не лагал */
const REGULAR=WGT.slice(0,9).map(w=>w[0]);
const LADDER={hall:[1,2,3,5,8,10,15],kitchen:[1,2,3,5,8,10,15,20,30,50,100]};
const TRICK_AT={2:'toss',4:'punch',6:'lever'}; // на эту ступень встал счётчик → трюк
const TRICK_KEY={toss:'throw',punch:'jump',lever:'lever'};
const IDLE_CLIPS=['I-wave','I-hat','I-look','I-sway','I-glitch']; // I-mic убран из оживления (2026-10-12, владелец: «зачем Рокко открывает рот в микрофон» — без звука жест пустой); файлы I-mic/H-mic остались
const rngOf=seed=>{ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
const shuffle=(arr,rng)=>{ for(let i=arr.length-1;i>0;i--){ const j=(rng()*(i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };
const pickSym=(rng,mk,counts)=>{
 if(counts&&rng()<.0){ let best=null,bn=3; for(const s of REGULAR) if((counts[s]||0)>bn){best=s;bn=counts[s];} if(best) return best; } // изредка тянет к уже частому символу — получаются цепочки
 const mx=MODE_X[mk]||{}, w=WGT.map(([s,x])=>[s,s==='sym-scatter-invitation'?(scene!=='hall'?INV_B:x*(mx.inv||1)):s==='sym-wild'?(scene!=='hall'?WILD_KITCHEN:x*(mx.wild||1)):x]); let r=rng()*w.reduce((a,b)=>a+b[1],0);
 for(const [s,x] of w){ r-=x; if(r<=0) return s; } return w[0][0]; };
const countsOf=B=>{ const c={}; B.flat().forEach(s=>{ if(s) c[s]=(c[s]||0)+1; }); return c; };
function genIds(rng,mk,rich){
 const g=[...Array(ROWS)].map(()=>Array(COLS).fill(null));
 for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) g[r][c]=pickSym(rng,mk);
 if(rng()<FORCE_P){ const s=REGULAR[(rng()*9)|0], cnt=8+((rng()*4)|0); shuffle([...Array(30).keys()],rng).slice(0,cnt).forEach(i=>g[(i/COLS)|0][i%COLS]=s); }
 return g; }
function evalIds(B,bt,rec){ // символ выигрывает, если настоящих n ≥ 1 и n + ВСЕ WILD на поле ≥ 8; WILD заменяет любой символ полностью, считается в каждом таком выигрыше и уходит вместе с ним (владелец 2026-10-11)
 // rec — REC-значки «Камер» (30 чисел по клеткам, 0 — нет значка; владелец 2026-10-12): выплата символа × множитель REC. Клетки выигрыша — клетки символа и все WILD поля.
 // Множитель = среднее значков по клеткам выигрыша (сумма значков ÷ число клеток, клетки без значка — 0), не меньше ×1; BONUS.recMode:'sum' — просто сумма (в симуляции слишком сильна, docs/MECHANICS.md). Выплаты символов в «Камерах» × BONUS.camPay.
 const flat=B.flat(), W=flat.filter(s=>s==='sym-wild').length, cnt={};
 flat.forEach(s=>{ if(REGULAR.includes(s)) cnt[s]=(cnt[s]||0)+1; });
 const wins=[]; let base=0;
 for(const s of REGULAR){ const n=cnt[s]||0, m=n+W; if(n<1||m<8) continue; const p=PAY[s], x0=m>=12?p[3]:m>=10?p[2]:p[1];
  let f=1; const rc=[]; if(rec){ let sum=0; B.forEach((row,r)=>row.forEach((o,c)=>{ const v=rec[r*COLS+c]; if(v&&(o===s||o==='sym-wild')){ sum+=v; rc.push(r*COLS+c); } })); f=BONUS.recMode==='sum'?(sum>0?sum:1):Math.max(1,sum/m); }
  const pf=rec?BONUS.camPay:bonusScene()?BONUS.kitPay:1, x=x0*f*pf; wins.push({s,n,m,x,x0:x0*pf,f,rc}); base+=x*bt; } // pf: выплаты символов в «Камерах» × camPay, в «Кухне» × kitPay, в зале × 1
 const cells=[]; if(wins.length){ const ws=new Set(wins.map(w=>w.s)); for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ const s=B[r][c]; if(ws.has(s)||s==='sym-wild') cells.push([r,c]); } } // все WILD поля участвуют в выигрыше и уходят с ним
 return {wins,cells,base}; }

// --- время: скорость, пропуск, прерывание ---
const ST={fast:false,anims:[],sleeps:[]};
let LAYER=null, GEO=null, BOARD=null, GRIDIDS=null;
const K=()=> ((window.__sim||RM()||(LAYER&&!document.body.contains(LAYER)))?0:ST.fast?.05:(GS.holdTurbo||GS.speed==='turbo')?.35:GS.speed==='quick'?.6:1)*(window.__slow||1); // window.__slow — только для съёмки раскадровок: замедляет все anim()/sleep() в N раз (ролики Рокко не замедляются)
const sleep=ms=>new Promise(res=>{ const d=ms*K(); if(d<=0){ res(); return; } const t=setTimeout(()=>{ ST.sleeps=ST.sleeps.filter(s=>s[0]!==t); res(); },d); ST.sleeps.push([t,res]); });
// Сглаживание ключевых кадров (владелец 2026-10-12: «никакой рваности»). Ломаная из ключевых кадров на каждом стыке меняет скорость рывком, а в точках «развернулся» (сжатие → отскок, замах → возврат) скорость
// мгновенно меняет знак. smoothKF проводит через те же значения гладкую кривую (монотонный кубический Эрмит, как PCHIP): в точке разворота скорость 0, на проходных кадрах скачка нет, на «полочках» (одинаковые
// соседние значения) движение плавно трогается и плавно встаёт, выше/ниже заданных значений кривая не уходит. Работает по свойствам: если у всех кадров свойство одной «формы» (те же функции transform/filter и единицы),
// оно заменяется плотной выборкой; остальное остаётся как было. Включается опцией smooth:true у anim()/animA() — для дуг, посадок, качаний; рваные по замыслу (помехи камер, шаги steps) не трогаем.
const KF_NUM=/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const SMK=new Map(); // кэш: посадка 30 клеток за спин использует 3–4 разных набора кадров — считаем кривую один раз
function smoothKF(kf,M=24){
 if(!Array.isArray(kf)||kf.length<3||kf.length>16||kf.some(f=>f.easing!=null&&f.easing!=='linear'&&f.easing!=='ease')) return kf;
 const ck=M+'|'+JSON.stringify(kf), hit=SMK.get(ck); if(hit) return hit;
 const res=smoothKF0(kf,M); if(SMK.size>300) SMK.clear(); SMK.set(ck,res); return res; }
function smoothKF0(kf,M){
 const n=kf.length, off=new Array(n).fill(null); kf.forEach((f,i)=>{ if(f.offset!=null) off[i]=+f.offset; }); if(off[0]==null) off[0]=0; if(off[n-1]==null) off[n-1]=1;
 for(let i=1;i<n-1;i++) if(off[i]==null){ let a=i-1, b=i+1; while(off[b]==null) b++; off[i]=off[a]+(off[b]-off[a])/(b-a); } // кадры без offset делят отрезок поровну
 for(let i=1;i<n;i++) if(!(off[i]>off[i-1])) return kf; // одинаковые offset (скачок) — не сглаживаем
 const keys=[...new Set(kf.flatMap(f=>Object.keys(f)))].filter(k=>k!=='offset'&&k!=='easing'&&k!=='composite'&&k!=='computedOffset'), sm={};
 for(const k of keys){ const sig=[], vec=[]; let ok=true; for(const f of kf){ const v=f[k]; if(v==null||typeof v==='number'&&false){ ok=false; break; } const str=String(v), nums=(str.match(KF_NUM)||[]).map(Number); sig.push(str.replace(KF_NUM,'#')); vec.push(nums); }
  if(!ok||sig.some(x=>x!==sig[0])||vec.some(v=>v.length!==vec[0].length)||!vec[0].length) continue;
  sm[k]={tpl:sig[0],vec}; }
 const sk=Object.keys(sm); if(!sk.length) return kf;
 const pchip=(y)=>{ // наклоны монотонного кубического Эрмита (Fritsch–Carlson)
  const h=[], d=[]; for(let i=0;i<n-1;i++){ h.push(off[i+1]-off[i]); d.push((y[i+1]-y[i])/h[i]); }
  const m=new Array(n).fill(0);
  for(let i=1;i<n-1;i++){ if(d[i-1]*d[i]<=0) m[i]=0; else { const w1=2*h[i]+h[i-1], w2=h[i]+2*h[i-1]; m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]); } }
  const end=(h0,h1,d0,d1)=>{ let v=((2*h0+h1)*d0-h0*d1)/(h0+h1); if(v*d0<=0) v=0; else if(d0*d1<=0&&Math.abs(v)>3*Math.abs(d0)) v=3*d0; return v; };
  m[0]=end(h[0],h[1],d[0],d[1]); m[n-1]=end(h[n-2],h[n-3],d[n-2],d[n-3]); return {h,m}; };
 const slopes={}; sk.forEach(k=>{ slopes[k]=sm[k].vec[0].map((_,j)=>pchip(sm[k].vec.map(v=>v[j]))); });
 const xs=new Set(off); for(let i=1;i<M;i++) xs.add(+(i/M).toFixed(5)); const grid=[...xs].sort((a,b)=>a-b);
 const fmt=v=>String(+v.toFixed(4));
 const out=grid.map(x=>{ const o={offset:x}; let seg=0; while(seg<n-2&&x>off[seg+1]) seg++;
  sk.forEach(k=>{ const t=(x-off[seg])/(off[seg+1]-off[seg]); const t2=t*t, t3=t2*t, h00=2*t3-3*t2+1, h10=t3-2*t2+t, h01=-2*t3+3*t2, h11=t3-t2; let j=0;
   o[k]=sm[k].tpl.replace(/#/g,()=>{ const y=sm[k].vec, S=slopes[k][j], hh=off[seg+1]-off[seg], val=h00*y[seg][j]+h10*hh*S.m[seg]+h01*y[seg+1][j]+h11*hh*S.m[seg+1]; j++; return fmt(val); }); });
  return o; });
 // свойства, которые не сглаживались, остаются в своих исходных кадрах (в промежутках браузер плавит их линейно)
 const rest=keys.filter(k=>!sm[k]); if(rest.length) kf.forEach((f,i)=>{ const o=out.find(q=>Math.abs(q.offset-off[i])<1e-9); rest.forEach(k=>{ if(f[k]!=null) o[k]=f[k]; }); });
 return out; }
window.bpSmoothKF=smoothKF;
const anim=(node,kf,opt)=>{ const o={...opt}; o.duration=(opt.duration||0)*K(); o.delay=(opt.delay||0)*K(); if(o.duration<=0) return Promise.resolve(); /* без анимации (меньше движения) — сразу итоговое состояние */ if(o.smooth){ kf=smoothKF(kf,o.smooth===true?24:o.smooth); } delete o.smooth; const a=node.animate(kf,o); ST.anims.push(a); return a.finished.catch(()=>{}).then(()=>{ ST.anims=ST.anims.filter(x=>x!==a); }); };
const animA=(node,kf,opt)=>{ const o={...opt}; o.duration=(opt.duration||0)*K(); o.delay=(opt.delay||0)*K(); if(o.duration<=0) return null; if(o.smooth){ kf=smoothKF(kf,o.smooth===true?24:o.smooth); } delete o.smooth; const a=node.animate(kf,o); ST.anims.push(a); a.finished.catch(()=>{}).then(()=>{ ST.anims=ST.anims.filter(x=>x!==a); }); return a; }; // как anim, но отдаёт сам Animation (a.finished — промис); без анимации (K=0) — null
const fast=()=>K()<=.06; // «пропуск» (второй Play), быстрее турбо, меньше движения и расчёт без анимаций: ролики не ждём
// --- ролики: ожидание загрузки, перемотка, планировщик по времени ролика ---
const readyV=(v,ms)=>new Promise(res=>{ if(v.readyState>=3) return res(true); let t; const done=()=>{ clearTimeout(t); v.removeEventListener('canplay',done); v.removeEventListener('error',done); res(v.readyState>=2); }; v.addEventListener('canplay',done); v.addEventListener('error',done); t=setTimeout(done,ms); });
const seekV=(v,t)=>new Promise(res=>{ if(Math.abs(v.currentTime-t)<.03&&v.readyState>=2) return res(); let w; const d=()=>{ clearTimeout(w); v.removeEventListener('seeked',d); res(); }; v.addEventListener('seeked',d); w=setTimeout(d,800); try{ v.currentTime=t; }catch(e){ d(); } });
function vcue(v,rateAt){ // S.cue(t,fn): вызвать fn, когда ролик дойдёт до времени t (сразу, если пропуск, сбой или ролик встал); rateAt(t) — скорость в долях нормальной (делится на K)
 const S={cues:[],dead:false,on:false}; let last=performance.now(), lt=-1;
 const flush=()=>{ const c=S.cues.splice(0); c.forEach(x=>x[1]()); };
 const tick=()=>{ if(S.dead) return; const t=v.currentTime, now=performance.now();
  if(fast()||v.ended){ S.dead=true; flush(); return; }
  if(rateAt) v.playbackRate=Math.min(8,rateAt(t)/Math.max(.05,K()));
  if(document.hidden||t!==lt){ lt=t; last=now; } else if(now-last>1500){ S.dead=true; flush(); return; } // ролик встал — вечно не ждём
  for(let i=0;i<S.cues.length;){ if(S.cues[i][0]<=t){ const c=S.cues.splice(i,1)[0]; c[1](); } else i++; }
  requestAnimationFrame(tick); };
 S.go=()=>{ if(S.on) return; S.on=true; last=performance.now(); tick(); };
 S.stop=()=>{ S.dead=true; flush(); };
 S.cue=(t,fn)=>{ if(S.dead) fn(); else S.cues.push([t,fn]); };
 S.at=t=>new Promise(res=>S.cue(t,res));
 S.t=()=>v.currentTime; return S; }
window.bpTime={K,RM,GS,fast,readyV,seekV,vcue}; // общие часы и состояние для блока «Рокко в полный рост» (он в отдельной области видимости)
window.bpTest={startBonus,startCameras:()=>startBonus(BONUS.spinsC4,null,null,'cameras'),bigWin,bonusEnd,save,syncHUD,startKitchenSack:()=>startBonus(BONUS.spinsK,null,()=>{ GS.ksteals=SACK_N-1; GS.sack=2.4*bet(); GS.kintro=true; })}; // startKitchenSack — «Кухня» с мешком на предпоследней краже: следующая кража высыпает мешок // тестовая панель (test-panel.js)
const skipAll=()=>{ ST.fast=true; if(window.CamRec&&CamRec.finish) CamRec.finish(); ST.anims.slice().forEach(a=>{ try{a.finish();}catch(e){} }); ST.sleeps.slice().forEach(([t,res])=>{ clearTimeout(t); res(); }); ST.sleeps=[]; };
window.bpTime.skip=on=>{ if(on) skipAll(); else ST.fast=false; }; // для проверок (tools/rocco_flow_check.js): «Skip» из кода
// --- пропуск по фазам (отзыв тестера 2026-10-12: «скип должен скипать следующую анимацию, а не фулл спин или не фулл бонуску») ---
// Раунд и бонусы идут фазами: падение, подсветка выигрыша, кража Рокко, счётчик, досыпание новых символов, трюки, мешок, спины «Кухни», перезапуски «Камер». Начало каждой фазы — одна строка `await phase('имя')`.
// Нажатие Skip (skipPhase) домотывает ТОЛЬКО ту фазу, что играет сейчас: ST.fast=true — анимации прыгают в конец, паузы снимаются, расчёт и исход не меняются. Ближайшая граница phase() снимает ST.fast, и следующая
// фаза идёт с обычной скоростью; ещё одно нажатие — ещё одна фаза. Ролики Рокко скорость не меняют: идущий доигрывает сам (rocco-flow.js). Автоповтор зажатой клавиши и второй клик за SKIP_HOLD мс нажатием не считаются.
// Граница ждёт SKIP_HOLD мс после нажатия: эффекты вне цепочки ожиданий (монетки в окошко SACK, частицы, модули с опросом fast() раз в 80 мс, как cams-rec.js) проверяют fast() не чаще раза в кадр, и без этой паузы пропуск мог бы пройти мимо них.
// Кроме того skipPhase шлёт событие 'bp-skip' на document: модулю, которому нужно «доиграть сейчас», достаточно подписаться (например, CamRec.finish()).
const SKIP_HOLD=100, PHL=[]; let PHC=null, SKT=0, PHN=0;
window.bpPhases=PHL; // журнал фаз {i, name, info, t0, t1, skip}: для проверок (tools/skip_phase_check.js) и отладки; window.__onPhase(запись) вызывается в начале каждой фазы, __onPhase(null) — в конце раунда
function phase(name,info){ if(window.__sim) return; // расчёт без экрана (__baseSim, __kitchenSim) фаз не ведёт
 const now=performance.now(); if(PHC&&!PHC.t1) PHC.t1=now;
 const open=()=>{ ST.fast=false; SKT=0; PHC={i:PHN++,name,info:info||null,t0:performance.now(),t1:0,skip:0}; PHL.push(PHC); if(PHL.length>1000) PHL.splice(0,PHL.length-1000); try{ window.__onPhase&&window.__onPhase(PHC); }catch(e){} };
 const wait=ST.fast&&SKT?SKIP_HOLD-(now-SKT):0; if(wait>0) return new Promise(r=>setTimeout(()=>{ open(); r(); },wait));
 open(); }
function phaseEnd(){ if(PHC&&!PHC.t1) PHC.t1=performance.now(); try{ window.__onPhase&&window.__onPhase(null); }catch(e){} } // раунд/бонус кончился: последняя фаза закрыта; __onPhase(null) — «конец» для проверок
function skippable(p){ let ent; const w=new Promise(res=>{ ent=[0,res]; ST.sleeps.push(ent); }); return Promise.race([p,w]).finally(()=>{ ST.sleeps=ST.sleeps.filter(e=>e!==ent); }); } // ждать p (ролик ещё не стартовал и т. п.), но не дольше нажатия Skip: тогда результат undefined
function skipPhase(){ if(ST.fast) return false; // фаза уже домотывается: повторный клик/дубль события — не новое нажатие
 if(PHC) PHC.skip++; SKT=performance.now(); skipAll(); try{ document.dispatchEvent(new Event('bp-skip')); }catch(e){} return true; }

// --- слой символов поверх клеток поля ---
function buildLayer(field){
 PITCH_C=0;
 field.querySelector('#symlayer')?.remove(); field.querySelectorAll('#hlu,#hlx').forEach(e=>e.remove()); // доска пересобирается — рамки WILD-столбцов снимаются (wildFrame ставит их заново)
 const cells=[...field.querySelectorAll('.cell')]; if(cells.length!==30||!cells[0].style.left) return false;
 const cs=cells.map(c=>({l:parseFloat(c.style.left),t:parseFloat(c.style.top),w:parseFloat(c.style.width),h:parseFloat(c.style.height)}));
 const L0=cs[0].l, T0=cs[0].t, Wd=cs[5].l+cs[5].w-L0, Ht=cs[24].t+cs[24].h-T0;
 LAYER=el('div'); LAYER.id='symlayer'; Object.assign(LAYER.style,{left:L0+'%',top:T0+'%',width:Wd+'%',height:Ht+'%'}); field.append(LAYER);
 // Слой символов обрезаем по проёму рамки: края клеток поля = внутренний край рамки (она лежит над скатертью, ui.css .frm). Раньше обрезка выходила на полшага решётки за клетки — до края скатерти, который тогда заходил на рамку;
 // теперь скатерть и рамка сходятся по контуру проёма, и падающие/уходящие символы не заходят на рамку.
 // clip-path вместо overflow:hidden — надёжнее для слоёв с transform/filter (иначе в части браузеров символы видны за краем поля).
 LAYER.style.clipPath='inset(0)';
 // Клетка = стекло + её кусок рамки (решётки) вместе: берём из картинки поля прямоугольник клетки, расширенный на полшага решётки, и двигаем его целиком.
 const R=null; /* плитки с решёткой отключены (владелец 2026-10-10): падают только символы, сетка неподвижна */ let gx=0.02, gy=0.02;
 if(R){ const sx=[],sy=[]; for(let r=0;r<ROWS;r++) for(let c=0;c<COLS-1;c++){ const a=R[r*COLS+c], b=R[r*COLS+c+1]; sx.push(b[0]-(a[0]+a[2])); }
  for(let r=0;r<ROWS-1;r++) for(let c=0;c<COLS;c++){ const a=R[r*COLS+c], b=R[(r+1)*COLS+c]; sy.push(b[1]-(a[1]+a[3])); }
  gx=sx.reduce((p,q)=>p+q,0)/sx.length/2; gy=sy.reduce((p,q)=>p+q,0)/sy.length/2; }
 // gx, gy — полшага решётки в процентах картинки; на экране — масштаб клетки: g.w/R.w
 const ex=cs.map((g,i)=>{ const k=R?R[i]:null; return k?{x:gx*g.w/k[2], y:gy*g.h/k[3]}:{x:0,y:0}; });
 GEO={cs,L0,T0,Wd,Ht,ex,R,gx,gy}; field.classList.add('eng');
 cs.forEach((g,i)=>{ const p=el('div','pit'); const e=ex[i]; Object.assign(p.style,{left:((g.l-e.x-L0)/Wd*100)+'%',top:((g.t-e.y-T0)/Ht*100)+'%',width:((g.w+2*e.x)/Wd*100)+'%',height:((g.h+2*e.y)/Ht*100)+'%'}); LAYER.append(p); });

 // Чистая сетка клеток, нарисованная кодом: ровные стёкла, решётка, заклёпки в узлах. Закрывает кривые клетки из картинки поля (владелец 2026-10-10).
 // Скатерть (#cellgrid) — тяжёлый SVG (размытия, потёртости): на каждый спин её не пересобираем, иначе подложка перерисовывается и мигает. Пересборка только если поменялась сетка клеток или сцена.
 const gkey=scene+'|'+cs.map(g=>[g.l,g.t,g.w,g.h].join(',')).join(';'), G0=field.querySelector('#cellgrid');
 if(G0&&G0.dataset.key===gkey){ /* оставляем как есть: DOM-порядок не важен (z-index), элемент не двигаем — иначе слой растеризуется заново */ } else {
 G0?.remove();
 { const gx2=(cs[1].l-(cs[0].l+cs[0].w))/2, gy2=(cs[COLS].t-(cs[0].t+cs[0].h))/2; // полшага решётки в % поля
  const G=el('div'); G.id='cellgrid'; G.dataset.key=gkey; const l=cs[0].l, t=cs[0].t, w=Wd, h=Ht; /* #cellgrid = проём рамки (область клеток): по нему обрезаны лапа, вмятина и слой символов; скатерть на полшага решётки шире и уходит под рамку — FieldTable.paint, ui.css .ft-bleed */ Object.assign(G.style,{position:'absolute',left:l+'%',top:t+'%',width:w+'%',height:h+'%',zIndex:0,pointerEvents:'none'});
  const pw=v=>(v/w*100)+'%', ph=v=>(v/h*100)+'%'; let html='';
  for(let r=0;r<=ROWS;r++) for(let c=0;c<=COLS;c++){ const x=(c===0?cs[0].l:c===COLS?cs[COLS-1].l+cs[COLS-1].w:cs[c].l-gx2)-l, y=(r===0?cs[0].t:r===ROWS?cs[(ROWS-1)*COLS].t+cs[(ROWS-1)*COLS].h:cs[r*COLS].t-gy2)-t; if(c>0&&c<COLS&&r>0&&r<ROWS) html+=`<b class="rv" style="left:${pw(x)};top:${ph(y)}"></b>`; if(c>0&&c<COLS&&r===0) html+=`<u class="vl" style="left:${pw(x)}"></u>`; if(r>0&&r<ROWS&&c===0) html+=`<u class="hl" style="top:${ph(y)}"></u>`; }
  G.innerHTML=html; field.insertBefore(G,LAYER); window.FieldTable&&FieldTable.paint(G,cs,gx2,gy2,scene); } } // фон поля: скатерть (зал), сталь (кухня), сукно (охрана) — field-table.js
 cells.forEach(c=>c.classList.remove('win','dim','wild')); return true; }
function spriteAt(id,r,c){
 const i=r*COLS+c, g=GEO.cs[i], e=GEO.ex[i], d=el('div','sp'); d.dataset.id=id;
 const bw=g.w+2*e.x, bh=g.h+2*e.y;
 Object.assign(d.style,{left:((g.l-e.x-GEO.L0)/GEO.Wd*100)+'%',top:((g.t-e.y-GEO.T0)/GEO.Ht*100)+'%',width:(bw/GEO.Wd*100)+'%',height:(bh/GEO.Ht*100)+'%'});
 d.style.setProperty('--kx',(g.w/bw).toFixed(4)); d.style.setProperty('--ky',(g.h/bh).toFixed(4));
 if(GEO.R&&typeof FIMG==='function'&&FIMG()){ const k=GEO.R[i], x=k[0]-GEO.gx, y=k[1]-GEO.gy, w=k[2]+2*GEO.gx, h=k[3]+2*GEO.gy;
  Object.assign(d.style,{backgroundImage:bpvT`url(${A}${FIMG().img})`,backgroundSize:`${100/w*100}% ${100/h*100}%`,backgroundPosition:`${x/(100-w)*100}% ${y/(100-h)*100}%`,backgroundRepeat:'no-repeat'}); }
 d.innerHTML=`<img src="${symSrc(id)}" alt="">`; LAYER.append(d); return d; }
const rowTop=r=>((GEO.cs[r*COLS].t-GEO.T0)/GEO.Ht*100)+'%';
// Шаг клеток (px) считается один раз после раскладки (buildLayer и resize сбрасывают кэш PITCH_C). Раньше каждый символ в dropIn/collapseRefill читал getBoundingClientRect сразу после добавления в разметку — браузер пересчитывал раскладку по 60 раз за спин
const pitch=()=>{ if(PITCH_C) return PITCH_C; const h=LAYER.getBoundingClientRect().height; return PITCH_C=h*(GEO.cs[COLS].t-GEO.cs[0].t)/GEO.Ht; };
addEventListener('resize',()=>{ PITCH_C=0; });
const mkBoard=ids=>ids.map((row,r)=>row.map((id,c)=>{ if(!id) return null; const o={id,sp:spriteAt(id,r,c)}; if(id==='sym-wild'){ o.pw=true; o.sp.classList.add('pwild'); } return o; })); // WILD после удара/броска живут до следующего спина — пересборка поля даёт им тот же слой, что у оригинала
const idsOf=B=>B.map(row=>row.map(o=>o?o.id:null));
function setSprite(o,id){ o.id=id; o.sp.dataset.id=id; o.sp.querySelector('img').src=symSrc(id); o.sp.querySelector('.val')?.remove(); }
function restoreBoard(){ // после перерисовки (resize) — вернуть последнее поле без анимации
 const field=document.getElementById('field'); if(!field) return;
 if(!GRIDIDS){ const im=[...field.querySelectorAll('.cell>img')]; if(im.length===30) GRIDIDS=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>((im[r*COLS+c].getAttribute('src')||'').match(/(sym-[a-z0-9-]+)\.(?:webp|png)/)||[])[1]||'sym-low-cup')); } // первый показ: берём символы, которые нарисовал макет
 if(!GRIDIDS) return;
 if(buildLayer(field)) BOARD=mkBoard(GRIDIDS); } // WILD живут до выигрыша в своём спине — после перезагрузки страницы их нет

// --- счётчик Рокко ---
// Плашка М1 (владелец 2026-10-12; разметку строит index.html, стили — ui.css «плашки М1»): .win — стекло с золотым ×N, .sg — кремовая табличка «▸ ×следующий», значок трюка .tki сидит на уголке плашки.
// Ступень «катится» (0,17 с, как ролик в «Пульте»): старое число уезжает вверх, новое въезжает снизу; Turbo/Quick короче через anim(), «меньше движения» и Skip — сразу. Цифры — в ячейках равной ширины (m1Cells), плашка не прыгает.
function setCounter(idx,pop){
 const w=document.querySelector('#alt .ctr2'); if(!w) return; const win=w.querySelector('.win'), v=w.querySelector('.win .v'), inn=w.querySelector('.in')||win; if(!v) return; // .win — стекло плашки (flyMult ищет `#alt .ctr2 .win .v`)
 const go=!!pop&&!RM()&&K()>0, w0=go?inn.getBoundingClientRect().width:0; // ширина платы до правки: ячейки равной ширины держат её, но на последней ступени табличка «▸ следующий» исчезает — тогда ширина меняется плавно, а не прыжком
 const L=LADDER[bonusScene()?'kitchen':'hall']; idx=Math.min(idx,L.length-1); m1Roll(v,m1Cells(String(L[idx])),go);
 const nxt=L[idx+1], on=idx+1, ntr=!!TRICK_AT[on]; let sg=w.querySelector('.sg');
 if(nxt){ if(!sg){ sg=el('div','sg','<i class="ar"></i><span class="nx"><span class="nt"></span></span>'); inn.append(sg); }
  const nx=sg.querySelector('.nx'), nt=sg.querySelector('.nt'); nx.className='nx'+(ntr?' tr':''); m1Roll(nt,m1Cells('×'+nxt),go);
  let tk=nx.querySelector('.tki'); // значок трюка на уголке: зажигается, когда следующая ступень — трюк
  if(ntr){ const ico=TRICK_ICON[TRICK_KEY[TRICK_AT[on]]]; if(!tk){ tk=el('i','tki'); nx.append(tk); if(go) anim(tk,[{transform:'scale(.4)',opacity:0},{transform:'scale(1.25)',opacity:1,offset:.6},{transform:'scale(1)',opacity:1}],{duration:260,easing:'cubic-bezier(.2,.8,.3,1)'}); } tk.title=TRICK_AT[on]; if(tk._ic!==ico){ tk._ic=ico; tk.innerHTML=ico; } }
  else tk?.remove(); }
 else sg?.remove();
 if(go){ const w1=inn.getBoundingClientRect().width; if(Math.abs(w1-w0)>1.5) anim(inn,[{width:w0+'px'},{width:w1+'px'}],{duration:240,easing:'cubic-bezier(.2,.8,.3,1)'}); } } // плата плавно меняет ширину (один маленький элемент), а не прыгает
// Мешок поднимает счётчик на ступень (владелец 2026-10-11): золотая монетка летит из окошка SACK на плашку множителя, число щёлкает на ступень выше, вокруг плашки кольцо и метка «SACK +1 STEP».
// На самой верхней ступени (×100) счётчику расти некуда: метка «MAX STEP», число не меняется. «Меньше движения» — без полёта и кольца: метка стоит ~0,9 с. Turbo/Quick короче через anim()/sleep().
async function counterLift(from,to){ await phase('counter',{from,to});
 const pl=document.querySelector('#alt .ctr2'), val=pl&&pl.querySelector('.win .v'), up=to>from, txt=up?'SACK +1 STEP':'SACK · MAX STEP';
 if(window.__sim||!pl||!val||(fast()&&!RM())){ setCounter(to,false); return; } // fast() верно и при «меньше движения» (K=0), но там метка нужна — её рисует ветка ниже
 const mk=()=>{ pl.querySelectorAll('.lring,.lchip').forEach(e=>e.remove()); const r=el('i','lring'), c=el('b','lchip',txt); pl.append(r,c); return [r,c]; };
 if(RM()){ setCounter(to,false); const [r,c]=mk(); await new Promise(res=>setTimeout(res,900)); r.remove(); c.remove(); return; }
 const sw=document.querySelector('#hud #hw-sack .vv'), a=sw&&sw.getBoundingClientRect(), b=val.getBoundingClientRect();
 if(a&&a.width){ const d=el('i','lfly'), sz=Math.max(18,Math.min(30,b.height*.7)); d.style.cssText=bpvT`left:${a.left+a.width/2-sz/2}px;top:${a.top+a.height/2-sz/2}px;width:${sz}px;height:${sz}px`; document.body.append(d);
  const dx=b.left+b.width/2-(a.left+a.width/2), dy=b.top+b.height/2-(a.top+a.height/2), arc=-Math.min(120,Math.hypot(dx,dy)*.28);
  await anim(d,[{transform:'translate(0,0) scale(.5) rotate(0deg)',opacity:0},{transform:`translate(${dx*.12}px,${dy*.12+arc*.5}px) scale(1.15) rotate(90deg)`,opacity:1,offset:.14},{transform:`translate(${dx*.55}px,${dy*.55+arc}px) scale(1) rotate(300deg)`,opacity:1,offset:.6},{transform:`translate(${dx}px,${dy}px) scale(.7) rotate(540deg)`,opacity:1}],{duration:520,easing:'cubic-bezier(.4,0,.5,1)',fill:'forwards',smooth:true}); d.remove(); }
 setCounter(to,true); AU('counter.step'); const [r,c]=mk();
 anim(r,[{transform:'scale(.96)',opacity:.95},{transform:'scale(1.3)',opacity:0}],{duration:640,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}).then(()=>r.remove());
 anim(c,[{opacity:0,transform:'translate(-50%,6px) scale(.85)'},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.16},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.8},{opacity:0,transform:'translate(-50%,-5px) scale(1)'}],{duration:1150,fill:'forwards',smooth:true}).then(()=>c.remove());
 await sleep(780); }
function setResult(v){ const r=document.getElementById('result'), b=r&&r.querySelector('b'); if(b) b.textContent=money(v); }
// ---------- счётчики (вариант H из hud-light.html, владелец 2026-10-10) ----------
// Окошки: тёмное стекло, подпись внутри (Barlow), янтарное число (VT323), красная обводка. Столбиком слева у поля (ландшафт), на телефоне — под логотипом
// (в «Камерах» — рядом над проёмом). Бонусы: FREE SPINS «7» (осталось спинов) и SACK (сумма + лампы = кражи до высыпания мешка, SACK_N). Зал: MODE, только когда режим включён.
// «Камеры» — те же окошки FREE SPINS и SACK, что в «Кухне» (REC-значки рисует cams-rec.js на самих клетках). Множитель над полем (#alt .ctr2) строит index.html, обновляет setCounter.
// Стили — ui.css («счётчики, вариант H»). Подгонка ширины сумм — hudFit(): зовётся после каждого изменения числа.
const hudU=w=>Math.max(.78,Math.min(1.3,w<804?.62+w/2100:w/804)); // масштаб «u» окошек от ширины поля: 1 на экране 1440, 0.78 на телефоне, до 1.3 на очень больших экранах (тот же расчёт — в index.html у плашки множителя)
const hLamps=n=>`<span class="lamps${SACK_N>5?' many':''}">${Array.from({length:SACK_N},(_,i)=>`<i class="lp${i<n?' on':''}"></i>`).join('')}</span>`;
const fsLeft=()=>Math.max(0,GS.fs||0); // окно FREE SPINS: одно число — сколько спинов осталось (владелец 2026-10-12; было «3 / 10»). +3 мешка и +5 приглашений прибавляются к GS.fs, число растёт вместе с «+N» у подписи; GS.fst (сколько всего) остаётся в состоянии бонуса, на экране его нет
// Окошко SACK: что показывать сейчас. Пока монетки летят в мешок (sack.js), GS уже новый, а окошко ещё старое: SKV.on — показывать SKV (v — сумма, n — горящие лампы), иначе GS.
const SKV={on:false,v:0,n:0,quiet:false}; window.bpTime=window.bpTime||{}; window.bpTime.SKV=SKV; // quiet — окошко пустеет при высыпании: пульсацию ожидания не показывать
const sackLamps=()=>SKV.on?SKV.n:((GS.sack>0&&GS.ksteals>0&&GS.ksteals%SACK_N===0)?SACK_N:((GS.ksteals||0)%SACK_N)); // кражи в текущей четвёрке: 4 горят до «высыпать мешок», после него снова 0
const sackAmt=()=>SKV.on?SKV.v:(GS.sack||0);
const SACK_ICO='<svg class="skic" viewBox="0 0 40 44" aria-hidden="true"><defs><linearGradient id="skg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset=".55" stop-color="#d9a94a"/><stop offset="1" stop-color="#9a6a1e"/></linearGradient></defs><path d="M14 6 L11 1.5 L17 4 L20 .5 L23 4 L29 1.5 L26 6 C27.5 9 28.5 11 28.5 12.5 C37 16.5 38 25 36 32 C34.5 38 28 42 20 42 C12 42 5.5 38 4 32 C2 25 3 16.5 11.5 12.5 C11.5 11 12.5 9 14 6 Z" fill="url(#skg)" stroke="#2b1704" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 12.6 C16.5 14.6 23.5 14.6 28 12.6" fill="none" stroke="#2b1704" stroke-width="2.2" stroke-linecap="round"/><path d="M12.5 12.6 C16.5 14.2 23.5 14.2 27.5 12.6" fill="none" stroke="#b3361f" stroke-width="1.1" stroke-linecap="round"/><path d="M11 22 C9 27 10 32 13 36" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-linecap="round"/><text x="20" y="33" text-anchor="middle" font-family="Black Ops One,Impact,sans-serif" font-size="16" fill="#5a3a0c" opacity=".85">$</text></svg>'; // иконка мешка у окошка SACK (рисуется кодом, без картинки нейросети)
function hWin(id,lb,val,o){ if(M1_IDS.includes(id)||id==='mode') return m1Win(id,lb,val,o); // MODE (HUNGRY ROCCO / DOUBLE INVITATION) — тоже плашка М1, в том же стиле, что FREE SPINS и SACK o=o||{}; const fit=o.mw?`data-fit style="--mw:${Math.round(o.mw)}px;--wm:${Math.round(o.wm||0)}px"`:`style="--wm:${Math.round(o.wm||0)}px"`;
 return `<div class="hw${o.hw?' '+o.hw:''}"${id==='mode'?' id="bp-mode" role="button" tabindex="0" aria-label="Active mode — open features"':` id="hw-${id}"`}><div class="hgl two${o.cls?' '+o.cls:''}" ${fit}><span class="lb">${lb}${o.ex||''}</span><span class="vv">${val}</span>${o.sub||''}${o.ico||''}</div>${id==='mode'?`<button class="off" aria-label="Turn off ${o.nm}"></button>`:''}</div>`; }
// ---------- плашки М1 «Вывеска в раме пульта» (владелец 2026-10-12; эскиз — hud-variants.html, стили — ui.css «плашки М1») ----------
// FREE SPINS, SACK и TOTAL: рама пульта с винтами (.hgl.m1) → ржавая плата (.in) → кремовая табличка с подписью (.lb) и тёмное стекло с золотыми цифрами (.wn > .vv); у SACK под стеклом лампы (.lamps .lp), значок мешка (.skic) стоит на табличке.
// Хуки прежних окон на месте: #hw-<id>, .vv, .lb (+.add), .lp (.on/.fl), .skic, класс .wait/.ready/.intro на .hw, .hgl (камера подпрыгивает TOTAL), [data-fit] (hudFit: он на стекле .wn). Окна Mode, Respins, Screens строятся как раньше.
// Цифры в .vv — в ячейках равной ширины (.c: .dg цифра, .pt точка/запятая, .cu валюта, .sl дробь, .x «×»): их ставит m1Set, и руками (textContent/innerHTML из hudUpdate, hudTotal, sack.js) тоже — за .vv следит MutationObserver (m1Watch), поэтому код бонусов менять не пришлось.
// Движение: стекло вспыхивает тонким золотым ободком (0,5 с, один раз на счёт, не на каждый кадр), цифра, которая шагнула сама (не в счёте), на 0,42 с вспыхивает и встаёт на место; лампа — хлопок в CSS (.lp.fl от sack.js). K(): Turbo/Quick короче, Skip и «меньше движения» — сразу.
const M1_IDS=['fs','sack','tot'];
const m1Fix=s=>typeof window.bpSocialFix==='function'?window.bpSocialFix(String(s)):String(s); // социальный режим (stake.us): «$84.20» → «84.20 SC» ещё до разбора на ячейки (обход текста по узлам видит по одному знаку)
const m1Canon=s=>m1Fix(s).replace(/\s*\/\s*/g,'/');
function m1Tok(s){ // «7 / 10», «$1,234.56», «84.20 SC», «×15» → [класс ячейки, знак]
 const out=[]; let dim=false; for(const m of m1Canon(s).matchAll(/(\d)|([.,])|(\s)|(\/)|(×)|([^\d.,\s\/×]+)/g)){ const t=m[0]; if(m[1]) out.push([dim?'c dg dim':'c dg',t]); else if(m[2]) out.push([dim?'c pt dim':'c pt',t]); else if(m[3]) out.push(['c sp',' ']); else if(m[4]){ out.push(['c sl',t]); dim=true; } else if(m[5]) out.push(['c x',t]); else out.push(['c cu',t]); }
 return out; }
const m1Cells=s=>m1Tok(s).map(([c,t])=>`<i class="${c}">${t}</i>`).join('');
// тон плашек М1: ?hudtone=0..5 главнее, потом sessionStorage 'bp-hudtone', потом HUDTONE_DEFAULT (0 — прежний тёмный вид; 1–4 — тона М1 в цвет рамки; 5 — «пульт»: плашки из деталей пульта, владелец 2026-10-12); ставит data-hudtone на <html>
const HUDTONE_DEFAULT='4';
(function(){ let t=null; try{ t=new URLSearchParams(location.search).get('hudtone'); }catch(e){} if(!/^[0-5]$/.test(t||'')){ try{ t=sessionStorage.getItem('bp-hudtone'); }catch(e){} } if(!/^[0-5]$/.test(t||'')) t=HUDTONE_DEFAULT; document.documentElement.dataset.hudtone=t; })();
// рамка плашек М1: ?hudframe=0|a..f главнее, потом sessionStorage 'bp-hudframe', потом HUDFRAME_DEFAULT (0 — прежняя красная рамка с винтами; a–f — рамки-предметы, ui.css «рамки плашек»); ставит data-hudframe на <html>
const HUDFRAME_DEFAULT='a';
(function(){ let t=null; try{ t=new URLSearchParams(location.search).get('hudframe'); }catch(e){} if(!/^[0a-f]$/.test(t||'')){ try{ t=sessionStorage.getItem('bp-hudframe'); }catch(e){} } if(!/^[0a-f]$/.test(t||'')) t=HUDFRAME_DEFAULT; document.documentElement.dataset.hudframe=t; })();
function m1Set(e){ // .vv → ячейки (код бонусов пишет в .vv обычный текст, ячейки строим заново); двигаем только то, что изменилось
 const c=m1Canon(e.textContent), prev=e.dataset.c;
 if(prev===c&&e.firstElementChild&&e.firstElementChild.classList.contains('c')) return;
 const tk=m1Tok(c); e.innerHTML=tk.map(([cl,t])=>`<i class="${cl}">${t}</i>`).join('');
 e.dataset.c=c; e.setAttribute('role','img'); e.setAttribute('aria-label',c); // читалке — число целиком, а не по знаку
 if(prev===undefined||prev===c||RM()||K()<=0) return; // первое построение, перерисовка того же числа, «меньше движения», Skip — без движения
 const now=performance.now(), step=now-(e._t||0)>220; e._t=now; // шаги чаще 0,22 с — это счёт (tween SACK/TOTAL): там цифры не вспыхивают, только стекло
 const cv=(n,d)=>getComputedStyle(e).getPropertyValue(n).trim()||d; // цвета плашки из переменных тона (--flr, --grim, --edge, --fl, --dg, --dg2); тон 0 — прежние
 const wn=e.closest('.wn'); if(wn&&!(wn._fl&&wn._fl.playState==='running')) wn._fl=animA(wn,[{boxShadow:`inset 0 0 0 1px ${cv('--flr','#e8c577')},inset 0 2px 3px rgba(0,0,0,.6),0 0 0 1px ${cv('--edge','#1a0705')},0 0 9px 1px ${cv('--fgl','rgba(255,200,97,.6)')}`},{boxShadow:`inset 0 0 0 1px ${cv('--grim','#8a6d30')},inset 0 2px 3px rgba(0,0,0,.6),0 0 0 1px ${cv('--edge','#1a0705')},0 0 0 0 rgba(255,200,97,0)`}],{duration:500,easing:'ease-out'});
 if(step){ const pt=m1Tok(prev), off=pt.length-tk.length; // цифры сравниваем с правого края: у суммы и «7/10» он общий
  [...e.children].forEach((k,i)=>{ const o=pt[i+off]; if(/\d/.test(tk[i][1])&&(!o||o[1]!==tk[i][1])) animA(k,[{color:cv('--fl','#ffe7a6'),transform:'translateY(-3px)'},{color:cv('--fl','#ffe7a6'),transform:'translateY(0)',offset:.35},{color:k.classList.contains('dim')?cv('--dg2','#B58837'):cv('--dg','#F2BC55'),transform:'translateY(0)'}],{duration:420,easing:'ease-out'}); }); }
}
function m1Watch(hud){ // стекла бонусных окон: любой текст, записанный в .vv кодом бонусов, превращается в ячейки (до отрисовки кадра)
 const seen=new Set(); const ob=new MutationObserver(ms=>{ seen.clear(); for(const m of ms){ const t=m.target.nodeType===1?m.target:m.target.parentElement, e=t&&t.closest&&t.closest('.hw.m1w .vv'); if(e&&!seen.has(e)){ seen.add(e); m1Set(e); } } });
 ob.observe(hud,{childList:true,subtree:true,characterData:true}); }
function m1Roll(n,html,go){ // ступень счётчика: старое число уезжает вверх, новое въезжает снизу (0,17 с); go=false — без движения
 const old=n._h!=null?n._h:n.innerHTML, t=n._rt=(n._rt||0)+1; n._h=html;
 if(!go||old===html){ n.innerHTML=html; n.style.height=n.style.overflow=''; return; }
 const h=n.offsetHeight; n.style.height=h+'px'; n.style.overflow='hidden'; n.innerHTML=`<span class="rl" style="--h:${h}px"><span>${old}</span><span>${html}</span></span>`;
 anim(n.firstChild,[{transform:'translateY(0)'},{transform:'translateY(-50%)'}],{duration:170,easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'}).then(()=>{ if(n._rt===t){ n.innerHTML=html; n.style.height=n.style.overflow=''; } }); }
function m1Win(id,lb,val,o){ o=o||{}; const txt=String(val).replace(/<[^>]*>/g,''), c=m1Canon(txt), mw=o.mw?` data-fit style="--mw:${Math.round(o.mw)}px"`:'', md=id==='mode';
 // MODE: имя режима и «×1.5» — обычный текст в .mv (не ячейки .vv: за .vv следит m1Set), кнопка выключения .off рядом с плашкой, вся плашка — кнопка «открыть Функции»
 const gl=md?`<span class="wn"${mw}><span class="mv">${val}</span></span>`:`<span class="wn"${mw}><span class="vv" data-c="${c}" role="img" aria-label="${c}">${m1Cells(c)}</span></span>`;
 const hd=md?` id="bp-mode" role="button" tabindex="0" aria-label="Active mode — open features"`:` id="hw-${id}"`;
 return `<div class="hw m1w${md?' mdw':''}${o.hw?' '+o.hw:''}"${hd}><div class="hgl m1"><i class="sc a"></i><i class="sc b"></i><i class="sc c"></i><i class="sc d"></i><div class="in"><span class="lb">${lb}</span>${gl}${o.ex||''}${o.ico||''}</div></div>${md?`<button class="off" aria-label="Turn off ${o.nm}"></button>`:''}</div>`; }
function hudItems(L,avail,u){
 const out=[], wm=L?Math.min(172*u,avail):100, mw=L?Math.min(290*u,avail):Math.min(218,innerWidth*.56); // ширины в «u»: на очень больших экранах окошки растут вместе с цифрами
 if(scene==='hall'){ if(modeOn){ const m=MODES.find(x=>x.k===modeOn); out.push(hWin('mode','Mode',`${m.nm} <span class="dim mxv">×${m.x}</span>`,{wm:L?wm:0,mw,nm:m.nm})); } }
 else if(bonusScene()){ out.push(hWin('fs','Free spins',`${fsLeft()}`,{wm}));
  out.push(hWin('sack','Sack',money(sackAmt()),{wm:L?wm:116,mw,ex:hLamps(sackLamps()),ico:SACK_ICO,cls:'sk',hw:sackLamps()===3&&!SKV.quiet?'wait':''})); }
 return out; }
function hudBuild(){
 document.getElementById('hud')?.remove();
 const fe=document.getElementById('field'), app=document.getElementById('app'); if(!fe||!app||document.getElementById('wel')) return;
 const W=innerWidth, H=innerHeight, land=W>H, f=fe.getBoundingClientRect(), sg=document.getElementById('sign'), sb=sg?sg.getBoundingClientRect().bottom:0, u=hudU(f.width);
 const sa=typeof SA!=='undefined'?SA:{t:0,r:0,b:0,l:0}; // вырез экрана (index.html?bpv=6c80e99c readSafe): окошки не уходят под него слева
 let edge=f.left-12*u, avail=Math.max(60,edge-Math.max(8,sa.l)), right=false;
 const pr=document.getElementById('pod')?.getBoundingClientRect(); // телефон боком (844×390): слева от поля всего ~80 px (логотип и «Функции»), а между полем и пультом справа пусто — столбик встаёт туда
 if(land&&H<=500&&scene!=='cameras'&&pr&&pr.left>f.right-10&&pr.left-f.right-16>=100){ right=true; avail=pr.left-f.right-16; }
 const items=hudItems(land,avail,u); if(!items.length) return;
 const hud=el('div'), top=Math.max(f.top+13*u,sb+8); hud.id='hud'; hud.style.setProperty('--u',u.toFixed(3));
 if(land&&right) hud.innerHTML=`<div class="wcol" style="left:${f.right+8}px;top:${Math.max(8,sa.t+6)}px">${items.join('')}</div>`; // телефон боком: столбик с самого верха (плашки М1 выше прежних окошек); Рокко в просвете ставится под ним (layout), иначе он сжимался бы
 else if(land) hud.innerHTML=`<div class="wcol r" style="left:${edge}px;top:${top}px;transform:translateX(-100%)">${items.join('')}</div>`; // у левой кромки поля, под логотипом
 else if(scene==='cameras'){ const pb=document.querySelector('#alt .ctr2'), pr2=pb&&pb.getBoundingClientRect(), ty=pr2&&pr2.height?Math.min(f.top-8*u,pr2.top-6-11*u):f.top-8*u; hud.innerHTML=`<div class="wrow" style="left:${f.left}px;width:${f.width}px;top:${ty}px;transform:translateY(-100%)">${items.join('')}</div>`; } // телефон, «Камеры»: рядом над проёмом, выше плашки счётчика и её значка трюка (он выступает на 11u над плашкой)
 else hud.innerHTML=`<div class="wcol" style="left:${Math.max(14,sa.l)}px;top:${sb+14}px">${items.join('')}</div>`; // телефон: столбиком слева под логотипом
 app.append(hud); m1Watch(hud);
 const mb=document.getElementById('bp-mode'); if(mb){ const m=MODES.find(x=>x.k===modeOn);
  mb.onclick=e=>{ if(e.target.closest('.off')){ e.stopPropagation(); modeOn=null; hudBuild(); syncHUD(); return; } openFeatures(); };
  mb.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openFeatures(); } }; mb.setAttribute('aria-label',`${m.nm} active — open features`); }
 if(sa.l>0&&land&&!right){ const col=hud.firstElementChild; col.dataset.edge=edge; col.dataset.lim=Math.max(8,sa.l); } // вырез слева: hudClamp() не пускает окошки под него (после hudFit, когда ширины известны)
 hudFit(); hudCamAvoid(); }
function hudCamAvoid(){ // «Камеры», пейзаж: столбик окошек не закрывает стекло монитора с записью главного зала (CAM 01, левый нижний монитор): если пересекаются — столбик едет ниже стекла (2026-10-12, ветка fb/cams-fix). Только позиция, вид окошек не трогается
 if(scene!=='cameras'||!window.bpCamFeeds) return; const col=document.querySelector('#hud .wcol.r'); if(!col) return; const g=(bpCamFeeds.geometry()||[]).find(m=>m.id==='hall'); if(!g) return;
 const xs=g.contour.map(p=>p[0]), ys=g.contour.map(p=>p[1]), m=[Math.min(...xs)-1,Math.min(...ys)-1,Math.max(...xs)+1,Math.max(...ys)+1], r=col.getBoundingClientRect();
 if(r.right<=m[0]||r.left>=m[2]||r.bottom<=m[1]||r.top>=m[3]) return; const top=m[3]+1, nb=top+r.height;
 if(nb<=innerHeight-4) col.style.top=top+'px'; }
let FITV=0; // версия метрик шрифта: растёт, когда догрузились шрифты — тогда подгонку надо сделать заново, даже если текст тот же
function hudFit(){ // длинные суммы ($25,000.00, 1,000,000.00 ARS): шрифт числа ужимается, пока оно не влезет в своё окно
 // Раньше: на каждое окошко «сбросил размер → прочитал ширину → записал → прочитал…», и так при каждом вызове (в «Камерах» — на каждый кадр счёта TOTAL: 80 пересчётов раскладки за бонус).
 // Теперь: окошко подгоняется, только если его текст (или шрифты, или ширина экрана) изменился; записи и чтения идут пакетами — один пересчёт раскладки на проход.
 const h=document.getElementById('hud'); if(!h) return; h.querySelectorAll('.hw.m1w .vv').forEach(e=>m1Set(e)); // плашки М1: сначала ячейки (ширину меряем по ним)
 // у стекла плашки М1 (.wn) цифры в ячейках равной ширины — как у моноширинного шрифта: ширина зависит только от числа знаков
 // у моноширинного шрифта (VT323 — числа окошек) ширина зависит только от числа знаков: пока идёт счёт TOTAL, цифры меняются каждый кадр, а знаков столько же — перемерять не надо
 const todo=[...h.querySelectorAll('[data-fit]')].filter(e=>{ if(e._mono==null) e._mono=/VT323/.test(getComputedStyle(e).fontFamily)||e.classList.contains('wn'); const k=(e._mono?e.textContent.length:e.textContent)+'|'+innerWidth+'|'+FITV; if(e._fk===k) return false; e._fk=k; return true; });
 if(!todo.length) return;
 todo.forEach(e=>{ e.style.fontSize=''; });
 const base=todo.map(e=>parseFloat(getComputedStyle(e).fontSize)), over=e=>e.scrollWidth>e.clientWidth+.5;
 let pend=todo.map((e,i)=>i).filter(i=>over(todo[i])); // чтения одним пакетом
 const fs=new Map(); pend.forEach(i=>{ const e=todo[i], v=Math.max(9,base[i]*e.clientWidth/e.scrollWidth*.99); fs.set(i,v); });
 pend.forEach(i=>{ todo[i].style.fontSize=fs.get(i)+'px'; });
 for(let g=0;g<40&&pend.length;g++){ pend=pend.filter(i=>over(todo[i])&&fs.get(i)>9); pend.forEach(i=>{ fs.set(i,fs.get(i)-.5); todo[i].style.fontSize=fs.get(i)+'px'; }); }
 hudClamp(); }
function hudClamp(){ // столбик окошек слева от поля шире места до выреза (cameras, телефон боком): сдвиг вправо на нехватку, зазор до поля (12u) это съедает. Без выреза слева data-lim нет — ничего не меняется
 const col=document.querySelector('#hud .wcol.r[data-lim]'); if(!col) return; const edge=+col.dataset.edge, lim=+col.dataset.lim;
 col.style.left=edge+'px'; const r=col.getBoundingClientRect(); if(r.left<lim-.5) col.style.left=(edge+lim-r.left)+'px'; }
function hudUpdate(){ // числа из состояния игры (GS / бонус «Камеры») в уже построенные окошки
 const h=document.getElementById('hud'); if(!h) return; const vv=id=>h.querySelector(`#hw-${id} .vv`); let e;
 if(bonusScene()){ if(e=vv('fs')) e.textContent=fsLeft(); if(e=vv('sack')) e.textContent=money(sackAmt());
  const n=sackLamps(); h.querySelectorAll('#hw-sack .lp').forEach((l,i)=>l.classList.toggle('on',i<n)); h.querySelector('#hw-sack')?.classList.toggle('wait',n===SACK_N-1&&!SKV.quiet); } // 3 лампы горят — мешок ждёт четвёртую кражу (мягкая пульсация окошка, мигает последняя лампа)
 hudFit(); }
function hudTotal(v){ const e=document.querySelector('#hud #hw-tot .vv'); if(e){ e.textContent=money(v); hudFit(); } } // hudFit сам пропускает неизменившийся текст
function hudAdd5(n){ const lb=document.querySelector('#hw-fs .lb'); if(!lb) return; lb.querySelector('.add')?.remove(); const a=el('span','add','+'+(n||5)); lb.append(a); setTimeout(()=>a.remove(),RM()?2200:3500); } // «+5» у подписи FREE SPINS коротко подмигивает
const setSpinsMeter=()=>hudUpdate(); // старое имя: зовётся из многих мест движка
window.bpTime.hud={build:hudBuild,update:hudUpdate,fit:hudFit,total:hudTotal};
document.fonts&&document.fonts.ready.then(()=>{ FITV++; hudFit(); }); // шрифты догружаются после первой вёрстки: метрики другие — подгонка заново

// --- Рокко ---
function roccoPoint(kind){ // куда лететь: kind 'mouth' (по умолчанию) — рот, 'hand' — рука с билетом; в портретном зале (старый Рокко 9:16) — его лицо, а не середина ролика
 const A=window.roccoAnchor; if(A&&document.getElementById('krocco')){ const p=A(kind); if(p&&isFinite(p[0])&&isFinite(p[1])) return p; }
 const r=document.getElementById('rocco'); if(r&&r.style.display!=='none'){ const b=r.getBoundingClientRect(); if(b.width) return [b.left+b.width*.41,b.top+b.height*(kind==='hand'?.4:.245)]; }
 const f=document.getElementById('field').getBoundingClientRect(); return [f.right,f.top+f.height/2]; }
const ROC_TRICK=new Set(['R-throw','R-slam','R-breaker','K-dump']), ROC_SND={'P-giggle':'rocco.giggle','W-clap':'rocco.cheer','W-dance':'rocco.cheer','W-huge':'rocco.huge'}; // звуки реакций (трюки озвучены в самих трюках)
function react(name,from,force){ // реакция Рокко: ролик в зале или на кухне. Turbo/Quick/удержание Space: только трюки (ролики Рокко никогда не ускоряются, а обычные реакции в быстрых режимах не играем); пропуск и «меньше движения» — роликов нет
 if(fast()||(K()<1&&!force&&!ROC_TRICK.has(name))) return; if(ROC_SND[name]) AU(ROC_SND[name]); // force — крупный выигрыш: ролик нужен и в быстрых режимах
 if(window.roccoPlay&&window.roccoPlay(name,force)) return;
 if(scene==='hall'&&typeof playRocco==='function') playRocco(name,null,from||0); }
// Каждый ролик скачивается ОДИН раз на страницу (QA m6): прежде <video preload=auto> браузер сам обрывал (net::ERR_ABORTED — «отложенная загрузка» после набора буфера), а при каждой перестройке (render → новые <video>) тот же файл просился заново (swallow и swallow2 — один файл дважды, лапа — на каждый render). Теперь файл берёт fetch (кэш по адресу), ролик получает blob:-адрес готового файла: ни обрывов, ни повторных запросов; fetch не удался — прежний путь, прямой src.
const clipBlobs=new Map();
function clipBlob(url,hi){ let p=clipBlobs.get(url); if(!p){ p=fetch(url,hi?{priority:'high'}:undefined).then(r=>{ if(!r.ok) throw 0; return r.blob(); }).then(b=>URL.createObjectURL(b.type.startsWith('video/')?b:b.slice(0,b.size,/\.mp4(\?|$)/.test(url)?'video/mp4':'video/webm'))).catch(()=>url); /* тип не пришёл с сервера (Safari по blob: без типа не играет) — ставим по расширению */ clipBlobs.set(url,p); } return p; }
function loadClip(v){ if(!v||v.src||v._ld||!v.dataset.src) return v; v._ld=1; v.preload='auto'; v.addEventListener('error',()=>{ if(v.src.startsWith('blob:')&&!v._fb){ v._fb=1; v.src=v.dataset.src; } }); clipBlob(v.dataset.src).then(u=>{ if(!v.src) v.src=u; }); return v; } // blob: не принят (политика страницы) — один раз пробуем прямой адрес // ролик с data-src: src появляется, когда файл готов (события canplay/error приходят как обычно)
window.bpTime.loadClip=loadClip; window.bpTime.clipBlob=clipBlob;
// Прогрев роликов — по одному, после первого кадра Рокко и в простое браузера: страница сначала показывает себя, а не качает десятки МБ.
// Замер 2026-10-10: 17 роликов зала разом = 17 МБ WebM (Safari: 33 МБ HEVC) в первые секунды; больше всех ломали открытие артефакта.
function warmQ(root,idle,items,wake){ // items — что греть по очереди; wake(item) запускает загрузку и возвращает <video> (или null); root пропал — очередь снимается
 let on=false; const when=f=>window.requestIdleCallback?requestIdleCallback(f,{timeout:1500}):setTimeout(f,250); // старт очереди — в простое страницы (в Safari requestIdleCallback нет)
 const step=()=>{ if(!root.isConnected||!items.length) return; const v=wake(items.shift()); if(!v){ step(); return; }
  let fin=false; const nx=()=>{ if(fin) return; fin=true; setTimeout(step,80); }; // следующий — когда этот набрал данные (или через 6 с, чтобы очередь не вставала)
  v.addEventListener('canplaythrough',nx,{once:true}); v.addEventListener('error',nx,{once:true}); setTimeout(nx,6000); if(v.readyState>=4) nx(); };
 const run=()=>{ if(on) return; on=true; when(step); };
 if(idle.readyState>=3&&idle.currentTime>0) run(); else { idle.addEventListener('playing',run,{once:true}); setTimeout(run,4000); } }
window.bpTime.warmQ=warmQ;
function warmClips(){ const ro=document.getElementById('rocco'), idle=ro&&ro.querySelector('video:not(.act)'); if(!idle||scene!=='hall'||ro.style.display==='none'||q.get('screen')) return; // в зале в полный рост (#krocco) старый Рокко скрыт, под заставкой он не нужен — греть нечего (после закрытия заставки render() снова вызовет warmClips)
 // только реакции, которые видно сразу; I-* (случайное «оживление» раз в 15–25 с) и запасной R-slam не греем: playRocco грузит их по требованию, а пока грузятся, на месте спокойный Рокко — позже на пару секунд не заметно
 warmQ(ro,idle,['R-grab','W-clap','R-throw','R-breaker','R-grab2','W-dance','P-giggle','W-huge','paw'],n=>{ if(n==='paw') return window.pawWake&&window.pawWake(); if(ro.querySelector(`video.act[data-n="${n}"]`)) return null; const v=document.createElement('video'); v.className='act'; v.dataset.n=n; v.dataset.src=clip(n); v.muted=true; v.playsInline=true; ro.append(v); return loadClip(v); }); }

// --- полёты и эффекты ---
function flyClone(src,from,to,dur,opt){ // картинка летит из точки/прямоугольника в точку/прямоугольник по дуге
 const o=opt||{}, d=document.createElement('div'); d.className='flyc'; const w=from.width||60, h=from.height||60;
 Object.assign(d.style,{left:(from.left)+'px',top:(from.top)+'px',width:w+'px',height:h+'px'}); d.innerHTML=`<img src="${src}" alt="">`; document.body.append(d);
 const tx=(to.left+(to.width||0)/2)-(from.left+w/2), ty=(to.top+(to.height||0)/2)-(from.top+h/2), sc=o.scale??.25, arc=o.arc??-70;
 return anim(d,[{transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1},...(o.pop?[{transform:'translate(0,0) rotate(0deg) scale(1.28)',opacity:1,offset:.12,easing:'ease-out'}]:[]),{transform:`translate(${tx*.5}px,${ty*.5+arc}px) rotate(${(o.rot||200)/2}deg) scale(${(1+sc)/1.6})`,opacity:1,offset:.5},{transform:`translate(${tx}px,${ty}px) rotate(${o.rot||200}deg) scale(${sc})`,opacity:o.fade??.0}],{duration:dur,delay:o.delay||0,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards',smooth:true}).then(()=>d.remove()); }
function sparks(x,y,n){ for(let i=0;i<n;i++){ const p=el('i','spark'); p.style.cssText=bpvT`position:fixed;left:${x}px;top:${y}px;width:${4+Math.random()*5}px;height:${4+Math.random()*5}px;z-index:70`; document.body.append(p);
  const dx=(Math.random()-.5)*150, dy=-20+Math.random()*120; anim(p,[{transform:'translate(0,0)',opacity:1},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:420+Math.random()*350,easing:'cubic-bezier(.3,.2,.6,1)',fill:'forwards'}).then(()=>p.remove()); } }
function fieldShake(f){ if(!RM()) anim(f,[{transform:'translate(0,0)'},{transform:'translate(0,6px)'},{transform:'translate(-3px,-2px)'},{transform:'translate(2px,1px)'},{transform:'translate(0,0)'}],{duration:340,easing:'ease-out',smooth:true}); }

// --- анимации поля ---
// ---- падение символов по ТЗ владельца (2026-10-10): конвейер, s(q)=0.25q+0.75q², приземление «садится от пола», штамп для WILD/скаттера ----
const FALL_T=300, LAND_T=190, STAGE_COL=.03, STAGE_ROW=.015, CASC_COL=.015; // STAGE_ROW — шаг между рядами в цепочке «старая доска + новая»: ряды идут друг за другом без наложений (см. dropIn)
const SQ=q=>.25*q+.75*q*q;
let SC_N=0; // сколько приглашений уже упало в этом спине: 1-е, 2-е, 3-е звучат по-разному
const LS={}, landSnd=c=>{ const t=performance.now(); if(t-(LS[c]||0)<150) return; LS[c]=t; AU('spin.land',{pan:c/(COLS-1)*1.4-.7}); }; // звук посадки колонки: один на колонку, слева направо
const fallKF2=(cells,out)=>{ const P=pitch(), kf=[]; for(let i=0;i<=16;i++){ const q=i/16, s=SQ(q); kf.push({transform:`translateY(${out? s*cells*P : -(1-s)*cells*P}px)`,offset:q}); } return kf; };
// Падение: одна кривая SQ для всех. Заходящий символ перед самой землёй чуть вытягивается (то же состояние, с которого начинается приземление) — стык падения и посадки без скачка.
const STRETCH='scale(.92,1.13)';
const fallAnim=(sp,cells,delaySec,out,durMs)=>{ const dur=durMs||FALL_T, img=out?null:sp.querySelector('img');
 if(img){ img.style.transformOrigin='50% 94%'; anim(img,[{transform:'scale(1)',offset:0},{transform:'scale(1)',offset:.55},{transform:STRETCH,offset:1}],{duration:dur,delay:delaySec*1000,easing:'ease-in',fill:'backwards'}); }
 return anim(sp,fallKF2(cells,out),{duration:dur,delay:delaySec*1000,easing:'linear',fill:out?'forwards':'backwards'}); };
// Время падения зависит от пути (гравитация: t ~ sqrt(путь)): пять клеток — FALL_T, одна — не короче 170 мс. Раньше путь в 1 клетку занимал те же 300 мс, что и 3 клетки: короткие падения выглядели вялыми.
const fallDur=d=>Math.max(170,Math.round(FALL_T*Math.sqrt(d/ROWS)));
const STAMP={ 'sym-wild':1,'sym-scatter-invitation':1,'sym-high-mask':1 }, stampOf=id=>STAMP[id]; // кубок (sym-high-mask) — самый дорогой: падает «штампом», как WILD (владелец 2026-10-10)
// Приземление: «садится от пола» (тот же ход, что раньше), но начинается ровно с вытянутого состояния падения и без мигания прозрачности. Штамп (WILD, скаттер, кубок, мониторы): тяжёлый
// нажим с лёгким поворотом — тоже из обычного вида, а не из «пустоты»: раньше символ долетал, пропадал и появлялся заново (у уже стоявших скаттеров и кубков при сдвиге вниз — тоже).
function landAnim(o,c,r){ const img=o.sp.querySelector('img'); if(!img||K()<=0||RM()) return Promise.resolve(); img.style.transformOrigin='50% 94%';
 if(stampOf(o.id)){ const pan=c/(COLS-1)*1.4-.7; if(o.id==='sym-scatter-invitation'){ SC_N++; AU('scatter.land.'+Math.min(3,SC_N),{pan}); if(SC_N===2&&c<COLS-1) AU('scatter.anticipation',{loop:true}); } else AU(o.id==='sym-wild'?'wild.land':'spin.land',{pan}); const sgn=((c*7+r*13)%2?1:-1), rot=.07*180/Math.PI*sgn; // направление поворота случайное, но стабильное для клетки
  if(o.id==='sym-high-mask') anim(o.sp,[{transform:'translate(0,0)'},{transform:'translate(0,3px)',offset:.35},{transform:'translate(-2px,-1px)',offset:.55},{transform:'translate(1px,1px)',offset:.75},{transform:'translate(0,0)'}],{duration:220,delay:60,smooth:true}); // весомо: клетка чуть вздрагивает (smooth: затухающее качание, без пилы)
  return anim(img,[{transform:'rotate(0deg) scale(.92,1.13)',offset:0},{transform:`rotate(${rot}deg) scale(1.14,1.14)`,offset:.12},{transform:`rotate(${rot*.35}deg) scale(1.06,1.06)`,offset:.36},{transform:'rotate(0deg) scale(1,1)',offset:1}],{duration:230,easing:'cubic-bezier(.4,0,.6,1)',smooth:16}); } // smooth: через те же кадры гладкая кривая — на разворотах (нажим → отдача) скорость плавно проходит через 0, а не меняет знак рывком
 const cell=pitch();
 return anim(img,[{transform:'translateY(0px) scale(.92,1.13)',offset:0},{transform:'translateY(0px) scale(1.15,.82)',offset:.28},{transform:`translateY(${-.035*cell}px) scale(.97,1.05)`,offset:.55},{transform:'translateY(0px) scale(1,1)',offset:1}],{duration:LAND_T,easing:'cubic-bezier(.4,0,.6,1)',smooth:16}); }
async function dropOut(B){ window.__OLD=B.map(r=>r.slice()); } // старые символы уезжают вместе с приходом новых (см. dropIn) — колонка ни на миг не пуста
// Цепочка колонки сверху вниз: новые ряды 0–4, затем старые 0–4. Каждый ряд стартует позже того, что под ним (низ — первым), поэтому расстояние между соседями никогда не меньше клетки:
// старый верх и новый низ раньше стартовали одновременно и на ~140 мс налезали друг на друга в одной клетке (стопки, обрезки у нижней кромки).
async function dropIn(B,ids){ const jobs=[], OLD=window.__OLD||[]; window.__OLD=null;
 for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++){ const dOld=c*STAGE_COL+(ROWS-1-r)*STAGE_ROW, delay=dOld+ROWS*STAGE_ROW;
  const old=OLD[r]&&OLD[r][c]; if(old) jobs.push(fallAnim(old.sp,ROWS,dOld,true).then(()=>old.sp.remove()));
  const id=ids[r][c], o={id,sp:spriteAt(id,r,c)}; B[r][c]=o; o.sp.style.visibility='visible'; if(r===ROWS-1) AU('spin.drop',{delay:c*STAGE_COL*1000*K()}); // звук начала падения колонки
  jobs.push(fallAnim(o.sp,ROWS,delay,false).then(()=>{ if(r===ROWS-1) landSnd(c); landAnim(o,c,r); })); }
 await Promise.all(jobs); }
// --- подсветка выигрыша «Камера» (владелец 2026-10-10; образец — win-highlight.html, вариант «Камера», контур тонкий) ---
// Выигравшие клетки: янтарные уголки-скобки (номера 01, 02… — по константе HL_NUM), остальные символы приглушены серым. Липкий WILD (столбец после «Удара» и столбы кухни):
// кадр LOCKED с красной точкой REC — слой под символами (#hlu) и над ними (#hlx); снимается при пересборке доски (buildLayer). Стили — ui.css («подсветка выигрыша»).
// «Меньше движения» — сразу итоговый вид: K()=0, длительности CSS = 0; Turbo/Quick — короче: --k на #field = K().
const HL_AR=1727/2206, f2=n=>(+n).toFixed(2), pad2=n=>String(n).padStart(2,'0'); // HL_AR — высота поля / ширина: размеры клеток в «u» (1u = 1% ширины поля)
function hlCell(i,n){ // [под символом, над символом] для выигравшей клетки i; n — номер по порядку
 const g=GEO.cs[i], W=g.w, H=g.h*HL_AR, a=3.1, o=.55, vb=`viewBox="0 0 ${f2(W)} ${f2(H)}" preserveAspectRatio="none"`;
 const d=`M${o} ${o+a}V${o}H${o+a}M${f2(W-o-a)} ${o}H${f2(W-o)}V${o+a}M${f2(W-o)} ${f2(H-o-a)}V${f2(H-o)}H${f2(W-o-a)}M${o+a} ${f2(H-o)}H${o}V${f2(H-o-a)}`;
 return [`<svg ${vb}><rect class="cfl" x=".55" y=".55" width="${f2(W-1.1)}" height="${f2(H-1.1)}"/></svg>`,
  `<svg ${vb}><g class="cbr tbx"><path class="cbd" d="${d}"/><path class="cb" d="${d}"/></g></svg>${HL_NUM?`<b class="tg">${pad2(n+1)}</b>`:''}`]; }
function hlCol(c){ // слои рамки вокруг столбца c, который Рокко только что превратил в WILD: {under, over}. Это не замок: рамка тонкая, без надписи, и гаснет, когда WILD уходят с выигрышем (dropFrames)
 const cs=GEO.cs, ex=2.4, ey=3.8, W=cs[c].w, last=(ROWS-1)*COLS+c, H=(cs[last].t+cs[last].h-cs[c].t)*HL_AR, o=-.62, a=5.4;
 const gy=(cs[COLS].t-(cs[0].t+cs[0].h))/2*HL_AR, rowY=r=>(cs[r*COLS+c].t-cs[c].t)*HL_AR, rowH=r=>cs[r*COLS+c].h*HL_AR;
 const style=`left:${f2(cs[c].l-ex)}%;top:${f2(cs[c].t-ey/HL_AR)}%;width:${f2(W+2*ex)}%;height:${f2((H+2*ey)/HL_AR)}%`, vb=`viewBox="${f2(-ex)} ${f2(-ey)} ${f2(W+2*ex)} ${f2(H+2*ey)}" preserveAspectRatio="none"`;
 const wrap=(cls,inner)=>`<div class="cfx ${cls}" data-c="${c}" style="${style}">${inner}</div>`;
 const d=`M${o} ${o+a}V${o}H${o+a}M${f2(W-o-a)} ${o}H${f2(W-o)}V${o+a}M${f2(W-o)} ${f2(H-o-a)}V${f2(H-o)}H${f2(W-o-a)}M${o+a} ${f2(H-o)}H${o}V${f2(H-o-a)}`;
 let tk=''; for(let r=0;r<ROWS;r++){ const yc=rowY(r)+rowH(r)/2; tk+=`M${o} ${f2(yc)}h.9M${f2(W-o)} ${f2(yc)}h-.9`; if(r){ const ys=rowY(r)-gy; tk+=`M${o} ${f2(ys)}h1.7M${f2(W-o)} ${f2(ys)}h-1.7`; } }
 return {under:wrap('under',`<svg ${vb}><rect class="ctint" x="${o}" y="${o}" width="${f2(W-2*o)}" height="${f2(H-2*o)}"/><rect x="${o}" y="${o}" width="${f2(W-2*o)}" height="${f2(H-2*o)}" fill="url(#hl-scan)"/></svg>`),
  over:wrap('ovr',`<svg ${vb} style="--H:${f2(H)}px"><g class="cfr tbx"><rect class="cfull" x="${o}" y="${o}" width="${f2(W-2*o)}" height="${f2(H-2*o)}"/><path class="cframe bd" d="${d}"/><path class="cframe" d="${d}"/><path class="ctk" d="${tk}"/></g><rect class="csw" x="${o}" y="0" width="${f2(W-2*o)}" height=".55"/></svg>`)}; }
function hlLayers(field){ // слои под (#hlu) и над (#hlx) символами; сами символы лежат в #symlayer, он обрезает края, поэтому рамка столбца — вне его
 if(!document.getElementById('hl-defs')) document.body.insertAdjacentHTML('afterbegin','<svg id="hl-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="hl-scan" width="4" height="1.1" patternUnits="userSpaceOnUse"><rect width="4" height=".36" fill="rgba(0,0,0,.3)"/></pattern></defs></svg>');
 let u=field.querySelector('#hlu'), x=field.querySelector('#hlx'); if(!u){ u=el('div'); u.id='hlu'; field.insertBefore(u,LAYER); } if(!x){ x=el('div'); x.id='hlx'; field.append(x); } return [u,x]; }
function wildFrame(c){ // рамка вокруг столбца c, ставший WILD после удара Рокко (зовётся из punchColumn; WILD ждут ближайший выигрыш)
 const field=document.getElementById('field'); if(!field||!GEO||!LAYER||!LAYER.isConnected) return; const [u,x]=hlLayers(field);
 if(u.querySelector(`[data-c="${c}"]`)) return; AU('wild.frame_on'); const k=hlCol(c); field.style.setProperty('--k',K());
 u.insertAdjacentHTML('beforeend',k.under); x.insertAdjacentHTML('beforeend',k.over); }
function dropFrames(){ // выигрыш подсвечен — рамки WILD-столбцов гаснут (сами WILD уходят вместе с выигрышем); без анимаций и при пропуске — сразу
 const field=document.getElementById('field'); if(!field) return;
 field.querySelectorAll('#hlu .cfx,#hlx .cfx').forEach(e=>{ if(e.dataset.out) return; e.dataset.out='1'; const a=(!fast()&&!RM())?e.animate([{opacity:1},{opacity:0}],{duration:160*K(),fill:'forwards'}):null; if(a) a.finished.catch(()=>{}).then(()=>e.remove()); else e.remove(); }); }
const HLV=()=>window.bpHl?window.bpHl.mode():'none'; // какая подсветка выигрыша включена: ?hl=cam|bulbs|spot|neon|pop, тест-панель, «Экраны макета» (hl.js). Без hl.js — «Камера»
function glow(cells,on){ // on=true: подсветить выигрыш, остальное приглушить; on=false: снять
 const field=document.getElementById('field'); if(!field||!BOARD) return;
 field.querySelectorAll('.hlrel').forEach(e=>e.remove());
 if(window.bpHl) window.bpHl.clear(); // слои прежней подсветки (лампочки, прожектор, неон, хлопок) снимаются сразу; их уход анимирует hlRelease
 if(on) dropFrames();
 BOARD.forEach(row=>row.forEach(o=>{ if(!o) return; o.rel=false; o.sp.classList.remove('win','dim'); o.sp.querySelectorAll('.hl,.ht').forEach(e=>e.remove()); }));
 if(!on||!cells.length) return;
 const hv=HLV(), set=new Set(cells.map(([r,c])=>r*COLS+c)), k=K(), gap=Math.min(45,330/cells.length); let n=0; field.style.setProperty('--k',k); // gap — шаг между клетками: при 17 выигравших «защёлкивание» шло 0,75 с, теперь не дольше ~0,33 с
 BOARD.forEach((row,r)=>row.forEach((o,c)=>{ if(!o) return; const i=r*COLS+c, sp=o.sp;
  if(!set.has(i)){ if(!(window.bpHl&&window.bpHl.nodim&&window.bpHl.nodim.includes(hv))) sp.classList.add('dim'); return; } // «Без выделения» (hl.js): остальные символы не приглушаются
  sp.classList.add('win'); sp.style.setProperty('--d',Math.round(n*gap*k)+'ms');
  if(hv==='cam'){ const [under,over]=hlCell(i,n); sp.insertAdjacentHTML('afterbegin',`<i class="hl">${under}</i>`); sp.insertAdjacentHTML('beforeend',`<i class="ht">${over}</i>`); } n++; }));
 if(hv!=='cam'&&window.bpHl) window.bpHl.show(hv,cells); } // остальные четыре подсветки рисует hl.js (слои над и под символами, только transform и opacity)
// Уход прицела (владелец 2026-10-11, п. 13): когда Рокко начинает забирать символы, янтарные уголки не пропадают разом, а сжимаются к символу и гаснут — как хват перед тем, как его берут.
// 0,26 с через K() (Turbo/Quick короче); «меньше движения» и пропуск — просто гаснут. Зовётся из runRound прямо перед steal(); коллект может вызвать её сам в нужный миг (window.hlRelease) — повторный вызов ничего не делает.
// Уголки при этом переезжают из символа в слой #hlx (.hlrel) на то же место, поэтому уход доигрывается, даже если коллект сразу убирает или двигает сам символ.
// Возвращает Promise «уголков больше нет». Сами символы и приглушение остальных не трогает: их снимает glow(...,false) после забирания.
const HL_REL_T=260;
function hlRelease(cells){
 const field=document.getElementById('field'); if(!field||!BOARD||!cells||!GEO||!LAYER||!LAYER.isConnected) return Promise.resolve();
 if(window.bpHl&&window.bpHl.active()) return window.bpHl.release(cells); // лампочки, прожектор, неон, хлопок: свой уход (hl.js), «Камера» — ниже
 const done=[], fr=field.getBoundingClientRect(); let n=0, host=null;
 // сначала читаем размеры всех клеток подряд (одна раскладка), потом пишем: раньше «прочитал — записал» по кругу заставляло браузер пересчитывать раскладку на каждой клетке (28 раз за выигрыш)
 const todo=[]; for(const [r,c] of cells){ const o=BOARD[r]&&BOARD[r][c]; if(!o||o.rel||!o.sp.isConnected) continue; const sp=o.sp, hl=sp.querySelector('.hl'), ht=sp.querySelector('.ht'); if(!hl&&!ht) continue; o.rel=true;
  todo.push({sp,hl,ht,rc:(!fast()&&ht)?sp.getBoundingClientRect():null}); }
 for(const {sp,hl,ht,rc} of todo){
  if(fast()||!ht){ hl&&hl.remove(); ht&&ht.remove(); continue; } // меньше движения / пропуск / расчёт: просто убрать
  const w=el('div','hlrel'), d=Math.min(n*12,90), t=HL_REL_T, jobs=[]; n++; host=host||hlLayers(field)[1];
  Object.assign(w.style,{left:(rc.left-fr.left)+'px',top:(rc.top-fr.top)+'px',width:rc.width+'px',height:rc.height+'px'}); w.append(ht); host.append(w);
  const br=ht.querySelector('.cbr'); // сжатие: рамка 100% клетки → вплотную к символу (он занимает ~90%); в конце гаснет
  if(br) jobs.push(anim(br,[{transform:'scale(1)',opacity:1,easing:'cubic-bezier(.15,.8,.3,1)'},{transform:'scale(.8)',opacity:1,offset:.5,easing:'ease-in'},{transform:'scale(.74)',opacity:0}],{duration:t,delay:d,easing:'linear',fill:'forwards'})); // быстрый «хват» (первая половина — резко и с замедлением к символу), затем гаснет
  const fl=hl&&hl.querySelector('.cfl'); // вспышка заливки в момент «хвата» (остаётся в символе: уйдёт вместе с ним)
  if(fl) jobs.push(anim(fl,[{opacity:0},{opacity:.2,offset:.45},{opacity:0}],{duration:t,delay:d,easing:'linear',fill:'forwards'}));
  const tg=ht.querySelector('.tg'); if(tg) jobs.push(anim(tg,[{opacity:1},{opacity:0}],{duration:t*.45,delay:d,easing:'linear',fill:'forwards'}));
  done.push(Promise.all(jobs).then(()=>{ w.remove(); hl&&hl.remove(); })); }
 return Promise.all(done).then(()=>{}); }
window.hlRelease=hlRelease; window.bpTime.hlRelease=hlRelease;
// Что нужно hl.js из этой области видимости (BOARD, GEO и LAYER меняются, поэтому геттеры).
window.bpHlCtx=()=>({K,RM,fast,anim,animA,el,COLS,ROWS,AR:HL_AR,layers:hlLayers,get GEO(){return GEO},get BOARD(){return BOARD},get LAYER(){return LAYER}});
// Показ подсветки на готовом поле (?state=idle&fx=hl, меню «Экраны макета» → «Подсветка выигрыша», кнопка в тест-панели): поле по seed с выигрышем, подсветка, надпись, уход, снятие. Исход раунда не трогает.
const HL_DEMO=[6,78,20,69,7]; // seed с выигрышем в первом шаге и WILD в составе (подобраны заново 2026-10-12 под новые веса: 2 символа и 3 WILD, 3 символа на 22 клетки, 2 символа, группа 13+WILD, одна группа 8+2 WILD)
async function hlDemo(n){ const field=document.getElementById('field'); if(!field||GS.spinning||scene==='cameras'||!window.bpHl) return;
 const ids=genIds(rngOf(HL_DEMO[((n||1)-1)%HL_DEMO.length]),null,false); if(!buildLayer(field)) return; GRIDIDS=ids.map(r=>r.slice()); BOARD=mkBoard(ids.map(r=>r.slice()));
 const ev=evalIds(ids,bet()); if(!ev.wins.length) return;
 glow(ev.cells,true); await sleep(300); const WL=showWins(ev,1,bet()); await sleep(1100); if(WL) WL.release(); const rel=hlRelease(ev.cells); await rel; await sleep(150); glow(ev.cells,false); }
window.bpHlDemo=hlDemo;
// Показ выигрыша (тест-панель «Эффекты выигрыша», ?state=idle): n шагов цепочки на готовом поле — надпись, счёт строки WIN, метка цепочки, мигание света; символы не забираются. Исход раунда не трогает.
async function winDemo(n,steps){ const field=document.getElementById('field'); if(!field||GS.spinning||scene==='cameras'||!window.WinFx) return; GS.spinning=true;
 try{ const ids=genIds(rngOf(HL_DEMO[((n||1)-1)%HL_DEMO.length]),null,false); if(!buildLayer(field)) return; GRIDIDS=ids.map(r=>r.slice()); BOARD=mkBoard(ids.map(r=>r.slice()));
  const ev=evalIds(ids,bet()); if(!ev.wins.length) return; let tot=0; setResult(0);
  for(let i=1;i<=(steps||2);i++){ const mult=i, sw=ev.base*mult; glow(ev.cells,true); await sleep(300); window.WinFx.step(i,sw/bet(),{free:false,mult}); const WL=showWins(ev,mult,bet()); AU('win.amount'); await wlWait(1000); if(WL) WL.release(); const t=tweenResult(tot,tot+sw,300); tot+=sw; await t; await sleep(200); glow(ev.cells,false); }
  if(window.WinFx) window.WinFx.end(); await sleep(900); }
 finally{ GS.spinning=false; } }
window.bpWinDemo=winDemo;
// --- утаскивание ---
// Обычный выигрыш: Рокко подзывает символы и глотает их (ролик swallow / «глотает» зал и кухня). Крупный выигрыш (bigSteal): из-за нижней рамки поля поднимается
// огромная лапа, символы стягиваются в кучку под ней, лапа сжимается в кулак и уходит обратно за рамку (ролик PAW_CLIP). Без анимаций (расчёт, «меньше движения»)
// символы просто исчезают, исход раунда тот же.
const bigSteal=(stepWin,bt,chain)=>{ const B=bonusScene()?30:10; return stepWin>=B*bt||(chain>=4&&stepWin>=B/5*bt); }; // «крупное»: выигрыш этого шага ≥ 10× ставки (в кухне, где множитель до ×100, ≥ 30×) или 4-й и далее шаг цепочки с выигрышем ≥ 1/5 этого порога. Симуляция: зал ≈ 1 спин из 250–300, кухня ≈ каждое пятое утаскивание
function centroidOf(cells){ // середина клеток, которые заберёт Рокко (экран, px): откуда летят монетки в мешок
 let x=0,y=0,n=0; for(const [r,c] of cells||[]){ const o=BOARD&&BOARD[r]&&BOARD[r][c]; if(!o||!o.sp.isConnected) continue; const b=o.sp.getBoundingClientRect(); x+=b.left+b.width/2; y+=b.top+b.height/2; n++; }
 return n?[x/n,y/n]:null; }
async function steal(cells,o){
 o=o||{}; const list=[];
 for(const [r,c] of cells){ const t=BOARD[r][c]; if(!t) continue; const sp=t.sp; list.push({r,c,o:t,rc:sp.getBoundingClientRect()}); }
 const gone=e=>{ e.o.sp.style.visibility='hidden'; e.o.sp.remove(); BOARD[e.r][e.c]=null; };
 if(!list.length) return;
 if(fast()){ if(RM()&&!window.__sim) AU(o.big?'rocco.steal_whoosh':(o.x||0)>=1.2?'rocco.grab':'rocco.swallow'); /* «меньше движения» не отключает звук */ if(RM()&&!window.__sim&&window.bpCollect&&window.bpCollect.mode(q)!=='old') await window.bpCollect.fade(list,gone); else list.forEach(gone); return; } // расчёт без анимаций и пропуск (Skip): символы просто исчезают; «меньше движения» — коротко гаснут (collect.js)
 if(window.bpCollect&&window.bpCollect.mode(q)!=='old'&&await window.bpCollect.run(list,gone,o,window.bpCollectCtx())) return; // новый коллект (collect.js); ?collect=old — прежний вид ниже
 if(o.big&&await pawGrab(list,gone)) return;
 const S=window.roccoSwallow&&window.roccoSwallow();
 if(S&&await skippable(S.ready)){ await swallowSteal(list,S,gone); return; }
 if(S&&S.cancel) S.cancel(); // Skip нажали, пока ролик «глотает» ждёт очереди или грузится: отменяем его (уже идущий ролик не трогаем — он доиграет сам)
 // запасной путь (портретный зал со старым Рокко или ролик не загрузился): реакция и полёт к его лицу
 react(o.name||'R-grab'); await sleep(260);
 const [dx,dy]=roccoPoint(), jobs=[]; let k=0;
 for(const e of list){ const rc=e.rc; gone(e); jobs.push(flyClone(SYM(e.o.id),{left:rc.left,top:rc.top,width:rc.width,height:rc.height},{left:dx,top:dy,width:0,height:0},520,{delay:k*24,scale:.18,rot:(k%2?-1:1)*(160+k*12),pop:true})); if(k<10&&!RM()) sparks(rc.left+rc.width/2,rc.top+rc.height/2,5); k++; }
 await Promise.all(jobs); }
// Что нужно collect.js из этой области видимости (BOARD и LAYER меняются, поэтому геттеры). glowOff — «уход прицела»: hlRelease(cells) (runRound зовёт её перед steal(), повторный вызов ничего не делает); если её нет — glow(cells,false)
window.bpCollectCtx=()=>({q,K,RM,fast,skippable,sleep,animA,anim,pitch,SYM,clip,el,readyV,seekV,vcue,shuffle,sparks,fieldShake,roccoPoint,react,scene,GS,COLS,ROWS,glow,get BOARD(){return BOARD},get LAYER(){return LAYER},glowOff:cells=>{ if(typeof window.hlRelease==='function') window.hlRelease(cells); else glow(cells,false); }});
// символ как отдельная картинка поверх страницы (вид тот же, что в клетке: тот же фильтр) — берём размер картинки, а не клетки: без «скачка» при замене
function cloneOf(e,host,rel){ const img=e.o.sp.querySelector('img'), rc=img.getBoundingClientRect(), d=document.createElement('div'); d.className=host?'pawp':'flyc';
 const ox=rel?rel.left:0, oy=rel?rel.top:0; Object.assign(d.style,{left:(rc.left-ox)+'px',top:(rc.top-oy)+'px',width:rc.width+'px',height:rc.height+'px'}); d.innerHTML=`<img src="${SYM(e.o.id)}" alt="">`; d.firstChild.style.filter=getComputedStyle(img).filter; (host||document.body).append(d); return {d,rc}; }
// Глотает: символы приподнимаются и дрожат, пока рука зовёт; затем по одному втягиваются в раскрытую пасть и прилетают, пока она открыта; челюсть смыкается после последнего.
// Все моменты — по времени ролика (S.cue), а не по таймерам: символы не прилетят в закрытый рот.
async function swallowSteal(list,S,gone){
 const ps=pitch(), n=list.length, order=shuffle([...Array(n).keys()],Math.random), flights=[];
 const A0=S.open+.08, A1=Math.min(S.shut-.14,A0+(S.span||.6)); // окно прилёта в времени ролика, с
 list.forEach((e,i)=>{ const sp=e.o.sp, img=sp.querySelector('img');
  animA(sp,[{transform:'translateY(0) scale(1)'},{transform:`translateY(${-.07*ps}px) scale(1.07)`}],{duration:340,delay:i*14,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
  if(img) animA(img,[{transform:'translate(0,0) rotate(0deg)'},{transform:`translate(${.022*ps}px,${-.01*ps}px) rotate(2deg)`},{transform:`translate(${-.022*ps}px,${.01*ps}px) rotate(-2deg)`},{transform:'translate(0,0) rotate(0deg)'}],{duration:120,delay:(i%5)*20,iterations:Infinity}); // дрожь
  const c0=[e.rc.left+e.rc.width/2,e.rc.top+e.rc.height/2], m0=S.mouth(), dist=Math.hypot(m0[0]-c0[0],m0[1]-c0[1]), dur=360+Math.min(1,dist/(ps*6))*180, arr=A0+(A1-A0)*order[i]/Math.max(1,n-1);
  flights.push(new Promise(res=>S.cue(arr-dur/1000*S.rB,()=>{ // старт полёта так, чтобы прилёт пришёлся на arr (скорость ролика после 2 с — ×rB)
   const cl=cloneOf(e,null), m=S.mouth(), {d,rc}=cl; gone(e);
   const tx=m[0]-(rc.left+rc.width/2), ty=m[1]-(rc.top+rc.height/2), rot=((i*7)%5-2)*9;
   const a=animA(d,[{transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1,offset:0},{transform:`translate(${tx*.5}px,${ty*.5-.22*rc.height}px) rotate(${rot*.5}deg) scale(.7)`,opacity:1,offset:.55},{transform:`translate(${tx}px,${ty}px) rotate(${rot}deg) scale(.17)`,opacity:1,offset:.9},{transform:`translate(${tx}px,${ty}px) rotate(${rot}deg) scale(.1)`,opacity:0,offset:1}],{duration:dur,easing:'cubic-bezier(.42,0,.9,.7)',fill:'forwards'});
   (a?a.finished.catch(()=>{}):Promise.resolve()).then(()=>{ d.remove(); res(); }); })));
 });
 await Promise.all(flights); list.forEach(e=>{ if(BOARD[e.r][e.c]===e.o) gone(e); });
 await S.at(S.shut-.04); } // челюсть начинает смыкаться — выигрыш проглочен, раунд идёт дальше, а он дожёвывает
// Лапа из-за нижней рамки (крупный выигрыш). Кулак ≈ 1,7 клетки. Кучка символов собирается над нижним краем поля, лапа поднимается под ней, смыкается — символы уходят под пальцы
// (они лежат ПОД лапой: масштаб и сдвиг к центру ладони, пока пальцы закрываются), лапа с добычей опускается за рамку. Лапа и кучка обрезаны по краю поля (контейнер #pawclip).
const PAW_CLIP='W-grab'; // 'W-grab' (старая, 3:4, 720×960) или 'W-grab2' (новая, 9:16, 540×960): переключать здесь
const PAWD={ // segs — скорость по участкам ролика (начало, где рука просто раскрыта, ×3: ролик не перематываем, Range локальный сервер не отдаёт), curl — пальцы начинают сжиматься, fist — кулак сжат (с); ax — x ладони, ay/ay2 — y центра ладони при curl/fist, fw — ширина кулака (px кадра)
 'W-grab':{W:720,H:960,segs:[[1.6,3],[9,1]],curl:2,fist:2.65,ax:372,ay:300,ay2:345,fw:290},
 'W-grab2':{W:540,H:960,segs:[[.6,3],[9,1]],curl:1.15,fist:2,ax:271,ay:330,ay2:400,fw:290}};
function pawEl(){ let c=document.getElementById('pawclip'); if(!c){ c=el('div',null,`<video muted playsinline preload="none" data-src="${clip(PAW_CLIP)}"></video><i class="pawlip"></i>`); c.id='pawclip'; document.body.append(c); } return c; }
window.pawWake=()=>loadClip(pawEl().querySelector('video')); // грузит ролик лапы (очередь прогрева warmQ)
{ const _rp=render; render=function(){ _rp(); document.getElementById('pawclip')?.remove(); }; }
async function pawGrab(list,gone){
 const D=PAWD[PAW_CLIP], G=document.getElementById('cellgrid'); if(!D||!G||!LAYER) return false;
 const c=pawEl(), v=window.pawWake(); if(!await readyV(v,1500)||!G.isConnected) return false;
 const gr=G.getBoundingClientRect(), ps=pitch(), sp=1.7*ps/D.fw; // sp — px экрана на px кадра ролика
 let cx=0; list.forEach(e=>cx+=e.rc.left+e.rc.width/2); cx/=list.length; cx=Math.max(gr.left+1.35*ps,Math.min(gr.right-1.35*ps,cx));
 const cy=gr.bottom-1.05*ps, fx=cx, fy=cy+(D.ay2-D.ay)*sp;
 Object.assign(c.style,{left:gr.left+'px',top:gr.top+'px',width:gr.width+'px',height:gr.height+'px',display:'block'});
 const vtop=cy-gr.top-D.ay*sp, down=gr.height-vtop+6; // down — на сколько опустить ролик, чтобы он целиком был за краем поля
 Object.assign(v.style,{left:(cx-gr.left-D.ax*sp)+'px',top:vtop+'px',width:D.W*sp+'px',height:D.H*sp+'px',transform:`translateY(${down}px)`});
 const kk=Math.max(.05,K()); v.playbackRate=Math.min(8,D.segs[0][1]/kk); await seekV(v,0);
 try{ await v.play(); }catch(e){ c.style.display='none'; return false; }
 const S=vcue(v,t=>D.segs.find(x=>t<x[0])[1]); S.go(); const fin=()=>{ S.stop(); v.pause(); c.style.display='none'; v.style.transform=''; c.querySelectorAll('.pawp').forEach(x=>x.remove()); };
 // 1) кучка: символы плавно стягиваются к точке над нижним краем (разгон-торможение), лапа в это время поднимается из-за рамки
 const pile=list.map((e,i)=>{ const {d,rc}=cloneOf(e,c,gr); gone(e); const a=i*2.39996, r=.22*ps*Math.sqrt((i+.5)/list.length), gx=cx+Math.cos(a)*r-(rc.left+rc.width/2), gy=cy+Math.sin(a)*r*.8-(rc.top+rc.height/2), rot=((i*5)%7-3)*4;
  return {d,rc,gx,gy,rot,i}; });
 await Promise.all(pile.map(p=>{ const an=animA(p.d,[{transform:'translate(0,0) rotate(0deg) scale(1)'},{transform:`translate(${p.gx}px,${p.gy}px) rotate(${p.rot}deg) scale(.52)`}],{duration:380+(p.i%4)*30,delay:p.i*8,easing:'cubic-bezier(.45,0,.2,1)',fill:'forwards'}); return an?an.finished.catch(()=>{}):0; }).concat([ (()=>{ const an=animA(v,[{transform:`translateY(${down}px)`},{transform:'translateY(0)'}],{duration:700,easing:'cubic-bezier(.3,.7,.2,1)',fill:'forwards'}); return an?an.finished.catch(()=>{}):0; })() ]));
 // 2) пальцы сжимаются: кучка уменьшается к центру ладони, пока её закрывает лапа
 await S.at(D.curl);
 const cl=(D.fist-D.curl)*1000;
 pile.forEach(p=>{ const tx=fx-(p.rc.left+p.rc.width/2), ty=fy-(p.rc.top+p.rc.height/2);
  animA(p.d,[{transform:`translate(${p.gx}px,${p.gy}px) rotate(${p.rot}deg) scale(.52)`,opacity:1},{transform:`translate(${(p.gx+tx)/2}px,${(p.gy+ty)/2}px) rotate(${p.rot*.5}deg) scale(.32)`,opacity:1,offset:.6},{transform:`translate(${tx}px,${ty}px) rotate(0deg) scale(.1)`,opacity:0}],{duration:cl,easing:'cubic-bezier(.4,0,.8,.6)',fill:'forwards'}); });
 await S.at(D.fist);
 // 3) кулак с добычей уходит за рамку
 const sk=animA(v,[{transform:'translateY(0)'},{transform:`translateY(${down}px)`}],{duration:520,easing:'cubic-bezier(.55,0,.8,.4)',fill:'forwards'}); if(sk) await sk.finished.catch(()=>{});
 list.forEach(e=>{ if(BOARD[e.r][e.c]===e.o) gone(e); }); fin(); return true; }

async function collapseRefill(rng,mk){ // остальные падают в пустые клетки по тому же закону, сверху входят новые; колонки — волной слева направо (как при спине)
 const jobs=[]; const dur=fallDur;
 for(let c=0;c<COLS;c++){ const dl=c*CASC_COL;
  const keep=[]; for(let r=ROWS-1;r>=0;r--) if(BOARD[r][c]) keep.push([r,BOARD[r][c]]); // снизу вверх
  const col=Array(ROWS).fill(null); let row=ROWS-1; const moves=[];
  for(const [r,o] of keep){ col[row]=o; if(row!==r) moves.push([o,row,row-r]); row--; }
  for(const [o,nr,d] of moves){ o.sp.style.top=rowTop(nr); jobs.push(fallAnim(o.sp,d,dl,false,dur(d)).then(()=>{ landSnd(c); landAnim(o,c,nr); })); }
  const n=row+1; // пустых сверху
  for(let r=0;r<n;r++){ const id=pickSym(rng,mk,countsOf(idsOf(BOARD))); const o={id,sp:spriteAt(id,r,c)}; col[r]=o; jobs.push(fallAnim(o.sp,n,dl,false,dur(n)).then(()=>{ landSnd(c); landAnim(o,c,r); })); }
  for(let r=0;r<ROWS;r++) BOARD[r][c]=col[r]; }
 await Promise.all(jobs); }

// --- трюки Рокко ---
// ===== эффекты трюков Рокко: «Бросок» WILD и «Удар» по рамке (владелец 2026-10-11, пункт 8: «непонятно, почему вылетают», «удар как нейрослоп») =====
// Принцип: игрок всегда видит ПРИЧИНУ. Бросок: билет у Рокко в руке → тени-цели на клетках → билеты летят каждый своей дугой (вращение, рост к зрителю) → «шлепок» и замена символа.
// Удар: кулак доходит до правой рамки → удар (вспышка, трещины, пыль, осколки, дрожь поля, стоп-кадр ролика) → «замыкание» бежит по рамке к столбцу → полоса пробегает столбец сверху вниз,
// символы по очереди перещёлкиваются в билеты WILD → кадр LOCKED. Момент контакта берётся из самого ролика (по currentTime), а не по таймеру: от скорости ролика не зависит.
// Слой #pfx лежит внутри #field (трясётся вместе с полем), координаты — пиксели поля. Turbo/Quick — короче через anim()/sleep() (K); «меньше движения» (K=0) — без полётов, сразу результат.
const fxOn=()=>K()>0&&!window.__sim&&!!LAYER&&LAYER.isConnected;
function fxLayer(){ const f=document.getElementById('field'); if(!f) return null; let l=f.querySelector(':scope>#pfx'); if(!l){ l=el('div'); l.id='pfx'; f.append(l); } return l; }
function fxGeo(){ const f=document.getElementById('field'), fr=f.getBoundingClientRect(), lr=LAYER.getBoundingClientRect(), kx=lr.width/GEO.Wd, ky=lr.height/GEO.Ht, cw=GEO.cs[0].w*kx, ch=GEO.cs[0].h*ky;
 return {f,fr,lr,kx,ky,cw,ch,u:clamp(cw/120,.55,1.35),ox:fr.left,oy:fr.top,W:fr.width,H:fr.height,rail:{t:lr.top-fr.top,r:fr.right-lr.right,l:lr.left-fr.left,b:fr.bottom-lr.bottom}}; }
function fxCellRect(g,r,c){ const s=GEO.cs[r*COLS+c]; return {x:g.lr.left+(s.l-GEO.L0)*g.kx,y:g.lr.top+(s.t-GEO.T0)*g.ky,w:s.w*g.kx,h:s.h*g.ky}; }
const fxGone=(n,a)=>{ if(a) a.finished.catch(()=>{}).then(()=>n.remove()); else n.remove(); };
function fxBox(l,g,cls,cx,cy,w,h,tag,html){ const n=el(tag||'div',cls,html); n.style.cssText=bpvT`left:${(cx-g.ox-w/2).toFixed(1)}px;top:${(cy-g.oy-h/2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px`; l.append(n); return n; } // cx, cy — центр в координатах экрана
const rnd=(a,b)=>a+Math.random()*(b-a);
function fxJag(pts,step,amp){ let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`; // рваная линия через опорные точки (координаты поля)
 for(let i=1;i<pts.length;i++){ const [x0,y0]=pts[i-1],[x1,y1]=pts[i], L=Math.hypot(x1-x0,y1-y0)||1, n=Math.max(1,Math.round(L/step)), nx=-(y1-y0)/L, ny=(x1-x0)/L;
  for(let k=1;k<=n;k++){ const t=k/n, j=k===n?0:rnd(-amp,amp); d+=` L${(x0+(x1-x0)*t+nx*j).toFixed(1)} ${(y0+(y1-y0)*t+ny*j).toFixed(1)}`; } }
 return d; }
function fxSvg(l,g,cls,inner){ const s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('class',cls); s.setAttribute('viewBox',`0 0 ${g.W.toFixed(1)} ${g.H.toFixed(1)}`); s.innerHTML=inner; l.append(s); return s; }
function fxBolt(l,g,pts,ms,o){ // «замыкание» бежит по линии pts (координаты поля) за ms; возвращает {done, fade(ms)}
 o=o||{}; const d=fxJag(pts,13*g.u,2.6*g.u), u=g.u, p=(c,w)=>`<path class="${c}" d="${d}" pathLength="1" stroke-width="${(w*u).toFixed(2)}"/>`;
 const sv=fxSvg(l,g,'pbolt',p('bg',16)+p('bg',8)+p('bc',4.2)+p('bh',2.4)), [pg,pg2,pc,ph]=sv.children;
 const A=[animA(pg,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:ms,easing:'linear',fill:'forwards'}),animA(pg2,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:ms,easing:'linear',fill:'forwards'}),animA(pc,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:ms,easing:'linear',fill:'forwards'}),
  animA(ph,[{strokeDashoffset:.06},{strokeDashoffset:-.94}],{duration:ms,easing:'linear',fill:'forwards'})];
 for(let k=0;k<(o.forks||2);k++){ const i=Math.floor(rnd(1,pts.length)), [x0,y0]=pts[i-1],[x1,y1]=pts[i], t=rnd(.25,.85), x=x0+(x1-x0)*t, y=y0+(y1-y0)*t, a=Math.atan2(y1-y0,x1-x0)+(Math.random()<.5?-1:1)*rnd(.7,1.2), L=rnd(10,22)*u;
  const fk=fxSvg(l,g,'pbolt pfork',`<path class="bc" d="${fxJag([[x,y],[x+Math.cos(a)*L,y+Math.sin(a)*L]],6*u,1.6*u)}" stroke-width="${(1.8*u).toFixed(2)}"/>`);
  const fa=animA(fk,[{opacity:0},{opacity:1,offset:.2},{opacity:.9,offset:.55},{opacity:0}],{duration:ms*.55,delay:ms*t*.9,easing:'linear'}); fxGone(fk,fa); }
 const done=A[0]?A[0].finished.catch(()=>{}):Promise.resolve();
 return {sv,done,fade(m){ const a=animA(sv,[{opacity:1},{opacity:.55,offset:.25},{opacity:.9,offset:.4},{opacity:0}],{duration:m,easing:'linear',fill:'forwards'}); fxGone(sv,a); }}; }
function fxFlare(l,g,x,y,s,star){ // вспышка в точке (экран): светлое ядро + лучи + кольцо; s — размер в клетках
 const R=g.cw*s, core=fxBox(l,g,'pcore',x,y,R,R); fxGone(core,animA(core,[{transform:'scale(.35)',opacity:1},{transform:'scale(1)',opacity:.9,offset:.4},{transform:'scale(1.25)',opacity:0}],{duration:200,easing:'ease-out',fill:'forwards'}));
 if(star){ const st=fxBox(l,g,'pstar',x,y,R*1.25,R*1.25,'div','<svg viewBox="-50 -50 100 100"><path d="M0-50L4-4L50 0L4 4L0 50L-4 4L-50 0L-4-4Z"/><path transform="rotate(45)" d="M0-34L3-3L34 0L3 3L0 34L-3 3L-34 0L-3-3Z"/></svg>');
  fxGone(st,animA(st,[{transform:`rotate(${rnd(-10,10)}deg) scale(.5)`,opacity:1},{transform:'rotate(0deg) scale(1)',opacity:1,offset:.35},{transform:'rotate(6deg) scale(1.08)',opacity:0}],{duration:240,easing:'ease-out',fill:'forwards'})); }
 const rg=fxBox(l,g,'pring',x,y,R,R); fxGone(rg,animA(rg,[{transform:'scale(.2)',opacity:.95},{transform:'scale(1.55)',opacity:0}],{duration:340,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'})); }
function fxSparks(l,g,x,y,n,o){ // искры веером: направление a0±spread (рад.), длина len, немного падают
 o=o||{}; const k=K()<.5?.55:1; n=Math.round(n*k); for(let i=0;i<n;i++){ const sz=rnd(2.6,5.4)*g.u, p=fxBox(l,g,'pspk',x,y,sz,sz), a=(o.a??Math.PI)+rnd(-1,1)*(o.spread??.9), L=rnd(.35,1)*(o.len??110)*g.u, dx=Math.cos(a)*L, dy=Math.sin(a)*L+rnd(8,34)*g.u;
  fxGone(p,animA(p,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.7}px,${dy*.55}px) scale(.8)`,opacity:1,offset:.45},{transform:`translate(${dx}px,${dy}px) scale(.2)`,opacity:0}],{duration:rnd(340,620),easing:'cubic-bezier(.2,.6,.5,1)',fill:'forwards'})); } }
function fxDust(l,g,x,y,n,o){ // пыль: мягкие пятна расползаются и гаснут (дрейф по a0)
 o=o||{}; const k=K()<.5?.6:1; n=Math.round(n*k); for(let i=0;i<n;i++){ const s=rnd(.18,.42)*g.cw*(o.s||1), p=fxBox(l,g,'pdust',x+rnd(-8,8)*g.u,y+rnd(-10,10)*g.u,s,s), dx=(o.dx??-34)*g.u*rnd(.5,1.3), dy=(o.dy??-22)*g.u*rnd(.4,1.3);
  fxGone(p,animA(p,[{transform:'translate(0,0) scale(.5)',opacity:0},{transform:`translate(${dx*.3}px,${dy*.3}px) scale(1)`,opacity:.8,offset:.18},{transform:`translate(${dx}px,${dy}px) scale(2.1)`,opacity:0}],{duration:rnd(560,940),delay:rnd(0,90),easing:'ease-out',fill:'forwards'})); } }
function fxChips(l,g,x,y,n){ // обломки краски и латуни от рамки: вылетают влево-вверх и падают
 const k=K()<.5?.5:1; n=Math.round(n*k); for(let i=0;i<n;i++){ const s=rnd(3,7)*g.u, p=fxBox(l,g,'pchip'+(i%3===0?' br':''),x,y,s,s*rnd(.6,1.1)), vx=-rnd(30,120)*g.u, vy=-rnd(40,120)*g.u, T=rnd(480,820), kf=[];
  for(let j=0;j<=8;j++){ const t=j/8; kf.push({transform:`translate(${(vx*t).toFixed(1)}px,${(vy*t+170*g.u*t*t).toFixed(1)}px) rotate(${(t*rnd(200,520)).toFixed(0)}deg)`,opacity:j<7?1:0,offset:t}); }
  fxGone(p,animA(p,kf,{duration:T,easing:'linear',fill:'forwards'})); } }
function fxCrack(l,g,x,y){ // трещины от точки удара: вдоль рамки вверх и вниз и одна внутрь поля, с веточками; тёмная линия с тонкой янтарной сердцевиной (ток просачивается); возвращает fade(ms)
 const u=g.u; let dd=''; [[-Math.PI/2+rnd(-.14,.14),rnd(54,90)],[Math.PI/2+rnd(-.14,.14),rnd(44,76)],[Math.PI+rnd(-.45,.45),rnd(34,58)]].forEach(([a,L])=>{ dd+=fxJag([[x,y],[x+Math.cos(a)*L*u,y+Math.sin(a)*L*u]],8*u,2.4*u)+' ';
  const t=rnd(.35,.65), tx=x+Math.cos(a)*L*u*t, ty=y+Math.sin(a)*L*u*t, b=a+(Math.random()<.5?-1:1)*rnd(.55,.95); dd+=fxJag([[tx,ty],[tx+Math.cos(b)*L*.38*u,ty+Math.sin(b)*L*.38*u]],6*u,1.5*u)+' '; });
 const sv=fxSvg(l,g,'pcrack',`<path class="cd" d="${dd}" pathLength="1" stroke-width="${(2.3*u).toFixed(2)}"/><path class="cg" d="${dd}" pathLength="1" stroke-width="${(.95*u).toFixed(2)}"/>`);
 [...sv.children].forEach(p=>{ p.style.strokeDasharray='1 1'; animA(p,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:150,easing:'ease-out',fill:'forwards'}); });
 return m=>{ const a=animA(sv,[{opacity:1},{opacity:0}],{duration:m,fill:'forwards'}); fxGone(sv,a); }; }
function fxGlint(l,g,x,y){ const n=fxBox(l,g,'pglint',x,y,g.rail.r*1.6,g.ch*2.2); fxGone(n,animA(n,[{opacity:0},{opacity:1,offset:.12},{opacity:0}],{duration:300,easing:'ease-out',fill:'forwards'})); } // блик на самой раме в месте удара
function fxJolt(f,a){ if(K()<=0) return; // тяжёлая дрожь поля: толчок влево (от кулака), отдача, затухание
 const s=v=>`${(v*a).toFixed(1)}px`; anim(f,[{transform:'translate(0,0)'},{transform:`translate(${s(-8)},${s(2)})`,offset:.12},{transform:`translate(${s(5.5)},${s(-1.6)})`,offset:.3},{transform:`translate(${s(-3.4)},${s(1)})`,offset:.48},{transform:`translate(${s(1.9)},${s(-.4)})`,offset:.66},{transform:`translate(${s(-.9)},0)`,offset:.82},{transform:'translate(0,0)'}],{duration:460,easing:'ease-out',smooth:true}); }
function clipCue(sel,t,fbMs){ // ждём, пока ролик (video по селектору sel) дойдёт до времени t (с) по СВОИМ часам: скорость воспроизведения не важна. Нет ролика / не стартовал / K=0 — таймер fbMs (мс при нормальной скорости, через sleep)
 const v=sel&&K()>0&&!window.__sim?(typeof sel==='string'?document.querySelector(sel):sel):null; if(!v||t<=0) return sleep(Math.max(0,fbMs));
 return new Promise(res=>{ let done=false; const fin=()=>{ if(done) return; done=true; res(); }, t0=performance.now(), lim=Math.max(0,fbMs)*K()+(K()>=.9?1800:500)*(window.__slow||1)+(window.roccoLagMs?window.roccoLagMs():0); // запас на загрузку ролика; в Turbo/Quick (ролика, скорее всего, нет) — короче
  const tick=()=>{ if(done) return; if(ST.fast||K()<=0||performance.now()-t0>lim||(!v.paused&&v.readyState>=2&&v.currentTime>=t&&v.currentTime<t+2)) return fin(); requestAnimationFrame(tick); }; tick(); }); }
function clipHold(sel,ms){ const v=sel&&(typeof sel==='string'?document.querySelector(sel):sel); if(!v||v.paused||K()<=0||ST.fast) return; // стоп-кадр на ударе: ролик замирает на миг, как у тяжёлого удара в играх
 v.pause(); setTimeout(()=>{ try{ if(!v.ended&&v.currentTime<(v.duration||9)-.12) v.play().catch(()=>{}); }catch(e){} },Math.max(14,ms*K())); }
function fxMark(l,g,r,c,i){ // «тень-цель» на клетке: куда упадёт билет (янтарные уголки и тень под клеткой)
 const R=fxCellRect(g,r,c), n=fxBox(l,g,'pmark',R.x+R.w/2,R.y+R.h/2,R.w,R.h,'div','<i class="sh"></i><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M5 26V5H26M74 5H95V26M95 74V95H74M26 95H5V74"/></svg>');
 animA(n,[{opacity:0,transform:'scale(1.14)'},{opacity:1,transform:'scale(1)'}],{duration:210,delay:i*100,easing:'ease-out',fill:'backwards'}); return n; }
// Билет в лапе (владелец 2026-10-12: «золотые билетики WILD он изначально некорректно держит в руке»). Ролик H-toss2 снят с пустой рукой (кадры 0–36 рука висит, 37–43 взмах, 44–48 кулак, 49–51 пальцы раскрываются, выпуск 2,1 с = кадр 50,4);
// билет кладёт игра: он лежит ЗА слоем руки Рокко (#krocco, z 6), поэтому кулак и пальцы закрывают его нижнюю часть — как зажатый в пальцах; вылезает из-за кисти на взмахе (кадры 37–43), едет с лапой по следу кисти из ролика (THROW_TRACK: кадр, x и y центра кисти в px ролика, наклон, доля размера, сдвиг билета от центра кисти) и в кадр выпуска уходит в полёт с тем же положением, наклоном и размером.
// След снят по кадрам очищенного ролика (маска альфы, 55 px у правого края руки); ролик без отражения → x зеркалится через window.roccoClipPt, наклон меняет знак.
const THROW_TRACK=[[37,1070,390,-30,0,0,0],[38,1097,388,-30,.3,3,-8],[39,1114,373,-25,.55,6,-15],[40,1121,352,-20,.75,8,-20],[41,1120,330,-15,.9,9,-24],[42,1111,309,-10,1,10,-26],[43,1101,295,-8,1,10,-26],[44,1089,285,-6,1,10,-26],[45,1081,280,-6,1,10,-26],[46,1080,276,-6,1,10,-26],[47,1086,275,-6,1,10,-26],[48,1095,284,-8,1,10,-26],[49,1109,284,-10,1,10,-26],[50,1127,280,-12,1,12,-26],[51,1145,282,-14,1,14,-26]];
window.bpThrowTrack=THROW_TRACK; // читает блок «Рокко в полный рост» (отдельная область видимости)
const HELD_W=60; // ширина билета в руке, px ролика (кулак ≈55 px): билет чуть крупнее кисти, как карточка в пальцах
function heldPose(v,i){ // положение i-го билета в руке по часам ролика: [x,y экрана, наклон°, масштаб к размеру в клетке-коробке] или null (ещё не взят / нет ролика)
 const T=window.roccoThrowTrack, P=window.roccoClipPt; if(!T||!P||!v||v.readyState<2) return null; const f=v.currentTime*24; if(f<T[0][0]) return null;
 let a=T[T.length-1],b=a; for(let j=0;j<T.length-1;j++) if(f<=T[j+1][0]){ a=T[j]; b=T[j+1]; break; }
 const q=a===b?0:(f-a[0])/(b[0]-a[0]), m=k=>a[k]+(b[k]-a[k])*q, fan=i*5; // веер: второй и третий билеты чуть смещены и довёрнуты
 const [x,y]=P(m(1)+m(5)+fan*.6,m(2)+m(6)+fan*.4); return [x,y,-(m(3)+fan),m(4)]; }
function heldTickets(g,picks,v){ // билеты в лапе до выпуска: возвращает по одному объекту на билет {d,pose,stop()}; без следа/ролика — null (тогда билет вылетает из точки руки, как раньше)
 if(!window.roccoThrowTrack||!v) return null; const R=fxCellRect(g,0,0), w=R.w*.96, h=R.h*.96, vis=Math.min(w,h*512/463), s=window.roccoClipScale?window.roccoClipScale():1;
 return picks.map(([r,c],i)=>{ const d=el('div','flyc ptk'); d.innerHTML=`<img src="${SYM('sym-wild')}" alt="">`; Object.assign(d.style,{left:'0',top:'0',width:w+'px',height:h+'px',zIndex:5,transformOrigin:'50% 50%',visibility:'hidden'}); document.body.append(d);
  const H={d,w,h,last:null,live:true,stop(){ H.live=false; },pose(){ return H.last; }}, loop=()=>{ if(!H.live||!d.isConnected) return; const p=heldPose(v,i); if(p){ const hs=(HELD_W*s)/vis*p[3]; H.last=[p[0],p[1],p[2],hs/Math.max(.001,p[3])||0]; d.style.visibility=p[3]>0?'':'hidden'; d.style.transform=`translate3d(${(p[0]-w/2).toFixed(1)}px,${(p[1]-h/2).toFixed(1)}px,0) rotate(${p[2].toFixed(1)}deg) scale(${Math.max(.001,hs).toFixed(3)})`; } requestAnimationFrame(loop); };
  loop(); return H; }); }
async function fxTicket(g,l,hx,hy,r,c,i,mark,H){ // один билет: вылетает из руки (hx,hy) в кадр броска ролика и летит по баллистической дуге в клетку (r,c). Физика считается по времени каждый кадр (rAF, 60 к/с): гравитация, лёгкое сопротивление воздуха по горизонтали, кувырок вокруг оси + 3D-трепет листа, затухающий к земле; растяжение по скорости вместо размытия; тень-цель на клетке растёт с приближением
 const o=BOARD[r][c]; if(!o){ H&&H.d.remove(); return; } const R=fxCellRect(g,r,c), cx=R.x+R.w/2, cy=R.y+R.h/2, w=R.w*.96, h=R.h*.96; let hrot=0, hs0=.4;
 await sleep(i*80); if(!o.sp.isConnected){ H&&H.d.remove(); return; } AU('toss.ticket',{pan:c/(COLS-1)*1.4-.7}); // билет вылетел из руки Рокко
 if(H){ H.stop(); if(H.last){ [hx,hy]=H.last; hrot=H.last[2]; hs0=Math.max(.2,H.last[3]||.4); } }
 const dx=cx-hx, dy=cy-hy, dist=Math.hypot(dx,dy);
 const T=Math.min(.74,.45+dist*.00023)*(.96+((i*37)%5)*.02), G=g.cw*27, vy0=dy/T-.5*G*T, kd=.55, ed=1-Math.exp(-kd*T), sg=i%2?-1:1, // T — полёт, с; G — гравитация (px/с², от размера клетки: на телефоне то же движение в масштабе); kd — сопротивление воздуха по x
  A0=(600+i*150)*sg, AY=64+(i*23)%28, AX=34+(i*17)%20, f1=1.5+((i*13)%4)*.18, f2=2.3+((i*11)%3)*.2, ph1=(i*1.9)%6.28, ph2=(i*2.7)%6.28, S0=hs0, z0=i%2?3:-3;
 let d=H?H.d:null; if(!d){ d=el('div','flyc ptk'); d.innerHTML=`<img src="${SYM('sym-wild')}" alt="">`; Object.assign(d.style,{left:'0',top:'0',width:w+'px',height:h+'px',zIndex:5,transformOrigin:'50% 50%'}); document.body.append(d); } d.style.visibility=''; // z 5: на старте билет ЗА рукой Рокко (#krocco, z 6) — он выходит из ладони, а не возникает в воздухе; выйдя из-за руки, переключается на 70 (.flyc)
 const sh=mark&&mark.querySelector('.sh'), hu=g.cw/100, ss=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
 const put=(p,t)=>{ // p — доля полёта 0…1, t — время полёта, с
  const e=ed?(1-Math.exp(-kd*t))/ed:t/T, x=hx+dx*e, y=hy+vy0*t+.5*G*t*t, vx=dx*(kd*Math.exp(-kd*t)/(ed||1)), vy=vy0+G*t, sp=Math.hypot(vx,vy), a=Math.atan2(vy,vx)*180/Math.PI, b=Math.min(.2,sp/(g.cw*55)), q=1-p, // растяжение вдоль скорости: сильнее в начале и в конце падения
   sc=S0+(1-S0)*ss(Math.min(1,p/.62))+.07*Math.sin(Math.PI*p), flt=Math.pow(q,1.15), rz=hrot*q+A0*Math.pow(q,1.5)+z0*Math.sin(Math.PI*p), ry=AY*Math.sin(6.283*f1*p+ph1)*flt, rx=AX*Math.sin(6.283*f2*p+ph2)*flt;
  d.style.transform=`translate3d(${(x-w/2).toFixed(2)}px,${(y-h/2).toFixed(2)}px,0) rotate(${a.toFixed(1)}deg) scale(${(1+b).toFixed(3)},${(1-b*.45).toFixed(3)}) rotate(${(-a).toFixed(1)}deg) perspective(${(g.cw*7.5).toFixed(0)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
  if(sh){ sh.style.transform=`scale(${(.6+.55*p*p).toFixed(3)})`; sh.style.opacity=(.28+.62*p*p).toFixed(3); } }; // тень-цель: растёт и темнеет, пока билет падает
 put(0,0); let raised=false; const ready=(()=>{ const im=new Image(); im.src=SYM('sym-wild'); return im.decode?im.decode().catch(()=>{}):Promise.resolve(); })();
 await new Promise(res=>{ let t=0,last=0; const step=ts=>{ if(!d.isConnected) return res(); const dt=last?Math.min(50*(window.__slow||1),ts-last):16.7; last=ts; const Kc=Math.max(.05,K()); t+=dt/1000/Kc; // время полёта идёт по часам кадра, Turbo/Quick/Skip укорачивают его (K), «меньше движения» — сразу итог
   if(t>=T){ return res(); } const p=t/T; put(p,t); if(!raised&&p>.2){ raised=true; d.style.zIndex=''; } requestAnimationFrame(step); }; requestAnimationFrame(step); });
 // приземление: билет ровно в позе клетки (все повороты и растяжение = 0, scale 1) — подмена спрайта в тот же кадр, старый символ исчезает именно в миг касания
 d.style.transform=`translate3d(${(cx-w/2).toFixed(2)}px,${(cy-h/2).toFixed(2)}px,0)`; d.style.zIndex='';
 setSprite(o,'sym-wild'); const img=o.sp.querySelector('img'); img.style.transformOrigin='50% 94%'; await Promise.race([img.decode?img.decode().catch(()=>{}):null,new Promise(rs=>setTimeout(rs,60))]); d.remove(); await ready;
 const H1=5*hu, H2=1.8*hu, kf=[], N=26; // мягкая посадка (владелец 2026-10-12: «мягко шлёпнуться»): отскок меньше, без вспышки; два подскока (5 и 1,8 px при клетке 100 px) со сплющиванием в касаниях, затухающим покачиванием; на последнем кадре — ровно поза клетки
 const hop=(s,H)=>H*(1-(2*s-1)*(2*s-1)), sq=s=>{ const m=Math.min(s,1-s); return m<.14?(1-m/.14):0; }; // s 0…1 внутри одного подскока; sq — сплющивание в касании
 for(let n=0;n<=N;n++){ const q=n/N, first=q<.58, s=first?q/.58:(q-.58)/.42, hy_=hop(s,first?H1:H2), sk=sq(s)*(first?1:.55); kf.push({offset:q,transform:`translateY(${(-hy_).toFixed(2)}px) scale(${(1+.09*sk-.012*(hy_/(H1||1))).toFixed(3)},${(1-.14*sk+.02*(hy_/(H1||1))).toFixed(3)}) rotate(${((first?1:-1)*(1-q)*(2.4*Math.sin(Math.PI*s))).toFixed(2)}deg)`}); } kf[N].transform='none';
 if(sh) animA(sh,[{transform:'scale(1.15)',opacity:.9},{transform:'scale(1.05)',opacity:.6,offset:.3},{transform:'scale(1.12)',opacity:.7,offset:.6},{transform:'scale(1.1)',opacity:.35}],{duration:330,easing:'linear',fill:'forwards'});
 fxDust(l,g,cx,R.y+R.h*.9,3,{dx:rnd(-14,14),dy:-8,s:.7}); fxJolt(g.f,.2);
 const A=animA(img,kf,{duration:330,easing:'linear'}); if(A) A.finished.catch(()=>{}).then(()=>{ img.style.transform=''; }); // отскок идёт сам, цепочка спина дальше не ждёт
 if(mark) fxGone(mark,animA(mark,[{opacity:1},{opacity:0}],{duration:140,fill:'forwards'})); }
// Бросок: пока Рокко замахивается — подсказка и тени-цели; в момент броска билеты летят из его руки
async function camToss(picks){ special('TOSS',`${picks.length} WILD${picks.length>1?'S':''}`); AU('toss.ticket');
 if(window.CamRec&&!window.__sim){ try{ await CamRec.toss(picks.map(([r,c])=>r*COLS+c),camOpts()); }catch(e){ console.error(e); } }
 picks.forEach(([r,c])=>{ const o=BOARD[r]&&BOARD[r][c]; if(o) setSprite(o,'sym-wild'); }); } // настоящие WILD ставим сразу после показа
async function camPunch(rng){ const col=(rng()*COLS)|0; special('PUNCH! WILD COLUMN','');
 if(window.CamRec&&!window.__sim){ try{ await CamRec.punchCol(col,camOpts()); }catch(e){ console.error(e); } }
 for(let r=0;r<ROWS;r++){ const o=BOARD[r]&&BOARD[r][col]; if(o){ setSprite(o,'sym-wild'); o.pw=true; o.sp.classList.add('pwild'); } }
 wildFrame(col); return col; }
let TRICK_EARLY=null; // трюк Рокко (бросок/удар) начинает свой ролик раньше: на старте падения поля / в миг, когда счётчик встал на ступень, — замах идёт, пока поле падает или досыпается (fb/tricks 2026-10-12, «очень долгая сцена»). Ролик не ускоряется: просто стартует раньше; бросок и удар по-прежнему ждут свой кадр по часам ролика
function trickEarly(kind){ if(window.__sim||scene==='cameras'||!window.roccoPlay||!document.getElementById('krocco')||K()<.99||fast()) return; try{ if(kind==='toss'){ react('R-throw'); TRICK_EARLY='toss'; } else if(kind==='punch'&&window.roccoPlay('R-slam')) TRICK_EARLY='punch'; }catch(e){ TRICK_EARLY=null; } }
async function toss(rng,n){ try{ return await toss0(rng,n); }finally{ if(BOARD) GRIDIDS=idsOf(BOARD); } } // WILD от удара/броска запоминаем в GRIDIDS: следующий спин роняет именно это поле, а не поле до шалости Рокко
async function toss0(rng,n){ const cand=[]; BOARD.forEach((row,r)=>row.forEach((o,c)=>{ if(o&&o.id!=='sym-wild'&&o.id!=='sym-scatter-invitation') cand.push([r,c]); }));
 const picks=shuffle(cand,rng).slice(0,n); // rng — как раньше (исход не меняется)
 await phase('toss',{n,cells:picks.map(([r,c])=>r*COLS+c)});
 if(scene==='cameras') return camToss(picks); // «Камеры»: Рокко не стоит у поля — билеты «прилетают» как сигнал камеры (CamRec.toss)
 const sel='#krocco video.ak[data-n="throw"],video[data-hall="H-throw"]', tT=window.roccoThrowAt||1.92, ms=(window.roccoKey&&window.roccoKey('R-throw'))||1050;
 document.querySelectorAll(sel).forEach(v=>{ v.style.clipPath=''; }); if(TRICK_EARLY==='toss') TRICK_EARLY=null; else react('R-throw'); const on=fxOn(), g=on?fxGeo():null, l=on?fxLayer():null;
 const vEl=on?document.querySelector(sel):null, HT_=on?heldTickets(g,picks,vEl):null; // билеты в лапе: лежат за рукой Рокко и едут с ней с кадра 37 ролика до выпуска
 try{
 await clipCue(sel,tT-.7,ms-700); special('TOSS',`${n} WILD${n>1?'S':''}`); const marks=on?picks.map(([r,c],i)=>fxMark(l,g,r,c,i)):[]; // подсказка ~1 с и цели
 await clipCue(sel,tT,700);
 const tv=on?document.querySelector(sel):null, mk=tv&&(tv.dataset.hall?{l:775,dt:.22}:window.roccoThrowMask); if(tv&&mk){ const W=tv.offsetWidth, cp=mk.l?`inset(0 0 0 ${(W*mk.l/1280).toFixed(0)}px)`:`inset(0 ${(W*(1-mk.r/1280)).toFixed(0)}px 0 0)`; clipCue(sel,tT+mk.dt,200).then(()=>{ tv.style.clipPath=cp; }); tv.addEventListener('ended',()=>{ tv.style.clipPath=''; },{once:true}); } // в самом ролике билет улетает смазанной полосой через поле — после выхода из руки прячем её, летят только настоящие билеты
 const [hx,hy]=roccoPoint('hand');
 await Promise.all(picks.map(([r,c],i)=>on?fxTicket(g,l,hx,hy,r,c,i,marks[i],HT_&&HT_[i]):(AU('toss.ticket'),setSprite(BOARD[r][c],'sym-wild'),null)));
 if(tv) tv.style.clipPath='';
 } finally { if(HT_) HT_.forEach(h=>{ h.stop(); h.d.remove(); }); }
 if(l) setTimeout(()=>{ if(l.isConnected&&!l.querySelector('.pmark,svg,.pcore')) l.remove(); },900); }
// Удар в зале: кулак Рокко доходит до рамки поля. Ролик R-punch снят 16:9, Рокко справа; сдвигаем его по X так, чтобы кулак в момент удара лёг на правую рамку поля.
// Ролики удара и броска 2026-10-11 (Kling, asset-source/openrouter/video/hall-punch2, hall-toss2, kitchen-punch2): H-punch2, H-toss2 (KS-punch2 и KS-punch удалены 2026-10-11: кухня бьёт роликом зала). Прежние R-punch, H-throw остались в assets/rocco: ?rclip=old[,punch,toss] включает их (сравнение, откат)
const RCOLD=new Set((q.get('rclip')||'').split(',').filter(Boolean)), rcOld=n=>RCOLD.has('old')||RCOLD.has(n);
const segMs=(sg,t)=>{ let ms=0,a=0; for(const [e,r] of sg){ const b=Math.min(t,e); if(b>a){ ms+=(b-a)/r*1000; a=b; } if(t<=e) break; } return ms; }; // мс (при обычной скорости) от старта ролика до его времени t при скоростях sg=[[до_с,скорость],…]
const HPSEGS=[[.65,3],[2.033,1],[2.683,3],[9,1]]; // H-punch2: до замаха (до 0,65 с) ×3, замах, удар и контакт (1,553 с) как есть до 2,03 с, удержание руки (2,03–2,68 с) ×3, возврат как есть. Размазанные кадры рывка (бывшие 1,50–1,67 с) вырезаны из самого ролика (hall-punch2-cut, владелец 2026-10-11 «Рокко размыт на несколько кадров»), всё после них на 4 кадра раньше
// Клипы удара зала и кухни (кадр 1280×720, торс на x=952). file; reach — торс → кончик кулака в контакт; umR — тело правее торса в клипе без отражения (хвост); fy — y кулака;
// t0/t1/t2 — контакт, начало и конец возврата руки (доля dur); dur, мс; segs — скорость по участкам клипа. По умолчанию punch4 (кадр покоя зеркальный, поворота нет); ?rclip=punch2 — прежний H-punch2, ?rclip=old (или punch) — R-punch.
const PCL={
 punch5:{file:'H-punch5',reach:238,umR:161,fy:334,t0:26/64,t1:40/64,t2:57/64,tf:47/64,dur:2667,segs:[[99,1]],fixed:true}, // H-punch5 (из hall-hammer5, один удар из пяти): кулак поднят к голове 0,6–1,04 с, контакт 1,083 с (кончик кулака со стороны мизинца x=714, y=334 кадра), рука держит до 1,667 с (t1), возврат до 2,375 с (t2); кулак уходит с рамки к 1,958 с (tf: x≥748, вдвое дальше половины рамки) — к этому моменту вмятина выпрямлена; всё в 1×. fixed — Рокко НЕ сдвигается: layout() ставит его так, что кулак с места ложится на середину правой рамки
 punch4:{file:'H-punch4',reach:247,umR:165,fy:323,t0:1.5833/4.25,t1:2.833/4.25,t2:3.833/4.25,dur:4250,segs:[[99,1]]}, // H-punch4: замах с 0,35 с, кулак вылетает за кадр (1,583 с), рука держит до 2,83 с, возврат до 3,83 с; всё в 1×; Рокко подаётся к рамке (onPunch)
 punch2:{file:'H-punch2',reach:260,umR:150,fy:307,t0:.3186,t1:.5566,t2:.6838,dur:4875,segs:HPSEGS},
 old:{file:'R-punch',reach:314,umR:112,fy:315,t0:.395,t1:.69,t2:.8,dur:5000,segs:[[.5,3],[9,1]]}};
const PC=PCL[rcOld('punch')?'old':RCOLD.has('punch2')?'punch2':RCOLD.has('punch4')?'punch4':'punch5']; // по умолчанию punch5; ?rclip=punch4 / punch2 / old (или punch) — прежние
window.bpTime.rc={rcOld,HPSEGS,segMs,PC}; // для блока «Рокко в полный рост» (отдельная область видимости)
const PUNCH=rcOld('punch')?{W:1280,H:720,bodyX:930,bodyBottom:699,fistX:638,fistY:315,t0:.41,t1:.73,t2:.88,dur:5000}:{W:1280,H:720,bodyX:952,bodyBottom:699,fistX:952-PC.reach,fistY:PC.fy,t0:PC.t0,t1:PC.t1,t2:PC.t2,dur:PC.dur,segs:PC.segs};
let hallBusy=false;
function hallAct(file,punch,segs){ const ro=document.getElementById('rocco'), f=document.getElementById('field'); if(!ro||!f||scene!=='hall'||RM()||window.__sim||fast()||hallBusy) return null;
 const idle=ro.querySelector('video:not(.act)'); if(!idle) return null;
 const b=ro.getBoundingClientRect(), bh=b.height, F=bh*1.0235, Wf=F*16/9, P=PUNCH;
 const left=b.left+.45*bh*9/16-P.bodyX/P.W*Wf, top=b.top+.958*bh-P.bodyBottom/P.H*F, fx=left+P.fistX/P.W*Wf, dx=punch?f.getBoundingClientRect().right-3-fx:0;
 const v=document.createElement('video'); v.dataset.hall=file; v.src=clip(file); v.muted=true; v.playsInline=true; v.preload='auto'; /* ролик не ускоряется в Turbo (2026-10-11) */
 Object.assign(v.style,{position:'fixed',left:left+'px',top:top+'px',width:Wf+'px',height:F+'px',zIndex:30,pointerEvents:'none',opacity:0,transition:'opacity .18s',filter:getComputedStyle(idle).filter});
 ro.querySelectorAll('video.act').forEach(o=>{ o.pause(); o.style.opacity=0; }); document.body.append(v); hallBusy=true;
 const total=segs?segMs(segs,P.dur/1000):P.dur, done=new Promise(res=>{ let fin=false; const end=()=>{ if(fin) return; fin=true; hallBusy=false; idle.style.opacity=1; v.style.opacity=0; setTimeout(()=>v.remove(),250); res(); };
  v.onended=end; setTimeout(end,total+800); v.play().then(()=>{ v.style.opacity=1; idle.style.opacity=0; if(punch){ const o=t=>segs?Math.min(1,segMs(segs,t*P.dur/1000)/total):t; v.animate([{transform:'translateX(0)'},{transform:'translateX(0)',offset:o(P.t0-.12)},{transform:`translateX(${dx}px)`,offset:o(P.t0)},{transform:`translateX(${dx}px)`,offset:o(P.t1)},{transform:'translateX(0)',offset:o(P.t2)},{transform:'translateX(0)'}],{duration:total,easing:'ease-in-out'}); }
   if(segs){ const rate=t=>segs.find(x=>t<x[0])[1], ctl=()=>{ if(fin) return; v.playbackRate=rate(v.currentTime); requestAnimationFrame(ctl); }; v.playbackRate=rate(0); ctl(); } }).catch(end); }); // segs — участки скорости ролика (как у Рокко в полный рост): ролик не зависит от Turbo
 return {impact:((segs?segMs(segs,P.t0*P.dur/1000):P.t0*P.dur)+120)/Math.max(.05,K()),done,v,fist:punch?[fx+dx,top+P.fistY/P.H*F]:null}; } // impact — мс до контакта (sleep умножает на K сам); fist — где кулак при ударе (экран, px); v — ролик (трюки ждут контакта по его currentTime)
const HALLSET=new Set(['hall-grab','hall-throw','hall-lever','hall-cheer','hall-wave','hall-mic','hall-hat','hall-look']);
const HALLMAP={'R-grab':'hall-grab','R-grab2':'hall-grab','R-throw':'hall-throw','R-breaker':'hall-lever','W-clap':'hall-cheer','W-dance':'hall-cheer','W-huge':'hall-cheer','P-giggle':'hall-cheer','A-rub':'hall-grab','I-wave':'hall-wave','I-mic':'hall-mic','I-hat':'hall-hat','I-look':'hall-look','I-sway':'hall-look','I-glitch':'hall-look'};
window.hallReact=n=>{ const m=HALLMAP[n]; return m&&(window.__hallClips||HALLSET).has(m)?hallAct(m.replace('hall-','H-')):null; };
const hallHP=()=>hallAct(PC.file,true,PUNCH.segs);
// Удар: Рокко бьёт кулаком по правой рамке поля → удар (вмятина, волна, пыль, стоп-кадр, дрожь) → «замыкание» бежит по рамке к столбцу → символы столбца по очереди перещёлкиваются в билеты WILD.
// Одинаково в зале и в «Кухне» (владелец 2026-10-11): столбец остаётся WILD, пока не будет ближайшего выигрыша, и уходит вместе с ним (в evalIds все WILD поля участвуют в выигрыше). mult — множитель ступени для подсказки («PUNCH ×8»).
const PFXM=['old','shake','blackout','glass','ribbon','scatter']; // варианты последствия удара; файлы punchfx-<имя>.js грузятся по требованию
const PHM=['old','dent','wave','arc','stop']; // варианты самого момента удара (все в punchhit.js); без выбора: при новом последствии — dent, при старом — old
function phMode(){ let m=q.get('punchhit'); if(!m){ try{ m=sessionStorage.getItem('bp-punchhit'); }catch(e){} } return PHM.includes(m)?m:'wave'; } // по умолчанию — «Волна + вмятина» (выбор владельца 2026-10-11)
function pfxMode(){ let m=q.get('punchfx'); if(!m){ try{ m=sessionStorage.getItem('bp-punchfx'); }catch(e){} } return PFXM.includes(m)?m:'scatter'; } // по умолчанию — «Лента» (понравилась владельцу; блэкаут — для особых моментов)
if(phMode()!=='old'&&!window.bpPunchHit){ const sc=document.createElement('script'); sc.src='punchhit.js'; sc.charset='utf-8'; document.head.append(sc); }
{ const m=pfxMode(); if(m!=='old'&&!(window.bpPunchFx&&window.bpPunchFx[m])){ const sc=document.createElement('script'); sc.src=`punchfx-${m}.js`; sc.charset='utf-8'; document.head.append(sc); } }
async function punchColumn(rng,mult){ try{ return await punchColumn0(rng,mult); }finally{ if(BOARD) GRIDIDS=idsOf(BOARD); } } // WILD от удара/броска запоминаем в GRIDIDS: следующий спин роняет именно это поле, а не поле до шалости Рокко
async function punchColumn0(rng,mult){ if(scene==='cameras') return camPunch(rng); if(window.roccoAfter){ await window.roccoAfter('K-dump',3.6); await window.roccoAfter('K-handoff'); } // K-handoff — Рокко убирал руку за раму для лапы мешка (sack.js): удар ждёт, пока рука вернулась и поза покоя
 const col=(rng()*COLS)|0; // любой из шести столбцов
 await phase('punch',{col});
 let sel=null, tC=0, hp=null, fb=1300, tB=0, tH=0; // tB, tH — секунды ролика: рука пошла назад от рамки / вернулась (по ним выпрямляется вмятина)
 if(window.roccoPlay&&(TRICK_EARLY==='punch'?(TRICK_EARLY=null,true):window.roccoPlay('R-slam'))){ sel='#krocco video.ak[data-n="punch"]'; tC=window.roccoPunchAt||1.98; fb=window.roccoPunchImpact()+120; tB=window.roccoPunchBack||0; tH=window.roccoPunchFree||window.roccoPunchHome||0; } // вмятина выпрямляется от tB до tH: кулак ушёл с рамки, а не рука вернулась домой (иначе вмятина висит, когда руки уже нет)
 else if(!document.getElementById('krocco')&&(hp=hallHP())){ sel=hp.v; tC=PUNCH.t0*PUNCH.dur/1000; fb=hp.impact; tB=PUNCH.t1*PUNCH.dur/1000; tH=PUNCH.t2*PUNCH.dur/1000; }
 else react('R-slam',.8);
 await clipCue(sel,tC-.95,fb-950); for(let w=0;w<10&&K()>0&&document.querySelector('#wlx .wl');w++) await sleep(60); // другая надпись (SACK после высыпания мешка) ещё висит — ждём, чтобы не наезжали
 special('PUNCH! WILD COLUMN',''); // подсказка ~1 с, за секунду до удара (владелец 2026-10-11: одна короткая строка — что делает Рокко и что это даёт)
 await clipCue(sel,tC,950); AU('punch.hit'); // контакт — по часам ролика
 const cells=[]; for(let r=0;r<ROWS;r++){ const o=BOARD[r][col]; if(o) cells.push([r,o]); }
 const lock=o=>{ setSprite(o,'sym-wild'); o.pw=true; o.sp.classList.add('pwild'); }; // pw — этот WILD от удара (варианты удара не трогают его дважды)
 if(!fxOn()){ cells.forEach(([r,o])=>lock(o)); wildFrame(col); if(hp&&hp.done) await hp.done; return col; } // «меньше движения»: сразу результат
 const f=document.getElementById('field'), g=fxGeo(), l=fxLayer();
 const fist=window.roccoAnchor&&document.getElementById('krocco')?window.roccoAnchor('fist'):(hp&&hp.fist)||null;
 const rx=g.fr.right-g.rail.r/2, ty=g.fr.top+g.rail.t/2, colX=(c0=>c0.x+c0.w/2)(fxCellRect(g,0,col)), iy=clamp(fist?fist[1]:g.fr.top+g.H*.62,g.fr.top+g.rail.t+g.ch*.35,g.fr.bottom-g.rail.b-g.ch*.35); // точка удара — середина правой рамки на высоте кулака
 const lx=x=>x-g.ox, ly=y=>y-g.oy;
 const ix=g.fr.right-15*g.u; // центр удара — чуть левее кончика кулака, чтобы вспышку не закрывала рука
 const PFX=window.bpPunchFx&&window.bpPunchFx[pfxMode()], PH=window.bpPunchHit&&window.bpPunchHit[phMode()]; // владелец 2026-10-11: «анимация последствия удара не нравится», «сам взрыв от удара тоже» — сам момент удара (punchhit.js, ?punchhit=…) и последствие (punchfx-<имя>.js, ?punchfx=…) выбираются отдельно; old — прежний вид ниже
 const ctx={l,g,f,col,cells,lock,ix,iy,rx,ty,colX,lx,ly,fist,ROWS,COLS,BOARD,sleep,anim,animA,fxBox,fxCellRect,fxGone,fxFlare,fxSparks,fxDust,fxChips,fxCrack,fxJolt,fxGlint,fxBolt,setSprite,K,RM,clamp,scene,skipped:()=>ST.fast,hold:ms=>clipHold(sel,ms),stick:()=>wildFrame(col),vid:()=>typeof sel==='string'?document.querySelector(sel):sel,tBack:tB,tHome:tH}; // stick() — вариант может зажечь рамку столбца раньше конца (повторный вызов wildFrame ничего не делает) // hold(ms) — стоп-кадр ролика Рокко в момент контакта
 if(PH){ try{ await PH(ctx); }catch(e){ console.error(e); } } else clipHold(sel,75); // момент удара: промис вариант отдаёт, когда можно начинать последствие (его затухание идёт дальше само)
 if(PFX){ try{ await PFX(ctx); }catch(e){ console.error(e); cells.forEach(([r,o])=>{ if(!o.pw) lock(o); }); } // вариант обязан превратить все cells в WILD через lock(o)
  wildFrame(col); if(hp&&hp.done) await hp.done;
  setTimeout(()=>{ if(l.isConnected&&!l.querySelector('.pmark')) l.remove(); },1100*K()+400); return col; }
 if(!PH){ fxJolt(f,clamp(g.W/809,.6,1.2)); fxGlint(l,g,rx,iy); fxFlare(l,g,ix,iy,2.3,true); fxSparks(l,g,ix,iy,26,{a:Math.PI,spread:1.05,len:190}); fxDust(l,g,ix,iy,9); fxChips(l,g,ix,iy,12); }
 const crackFade=PH?(()=>{}):fxCrack(l,g,lx(ix),ly(iy));
 await sleep(70); // «замыкание» от трещины бежит вверх по правой рамке, потом по верхней — к столбцу
 const pts=[[lx(ix),ly(iy)],[lx(rx),ly(iy)]]; if(Math.abs(iy-ty)>8) pts.push([lx(rx),ly(ty)]); pts.push([lx(colX),ly(ty)]); const len=pts.reduce((a,p,i)=>i?a+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);
 const bolt=fxBolt(l,g,pts,clamp(len/2.9,230,560)); await bolt.done;
 fxFlare(l,g,colX,ty,1.05,false); fxSparks(l,g,colX,ty,10,{a:Math.PI/2,spread:1.15,len:80}); // замыкание дошло до столбца
 const R0=fxCellRect(g,0,col), R1=fxCellRect(g,ROWS-1,col), ROW=70, band=fxBox(l,g,'pband',R0.x+R0.w/2,R0.y+g.ch*.32,R0.w+6*g.u,g.ch*.64), dy=R1.y-R0.y;
 animA(band,[{transform:'translateY(0)',opacity:0},{transform:'translateY(0)',opacity:1,offset:.07},{transform:`translateY(${dy}px)`,opacity:1,offset:.9},{transform:`translateY(${dy}px)`,opacity:0}],{duration:ROW*(ROWS-1)+190,easing:'linear',fill:'forwards'}); fxGone(band,null); setTimeout(()=>band.remove(),(ROW*(ROWS-1)+260)*K()+80);
 const jobs=cells.map(([r,o])=>(async()=>{ await sleep(r*ROW); const img=o.sp.querySelector('img'), R=fxCellRect(g,r,col);
  const pc=fxBox(l,g,'pcell',R.x+R.w/2,R.y+R.h/2,R.w*1.1,R.h*1.1); fxGone(pc,animA(pc,[{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'scale(1)',offset:.3},{opacity:0,transform:'scale(1.18)'}],{duration:340,easing:'ease-out',fill:'forwards'}));
  anim(o.sp,[{transform:'translateX(0)'},{transform:'translateX(-3px)',offset:.2},{transform:'translateX(3px)',offset:.45},{transform:'translateX(-2px)',offset:.7},{transform:'translateX(0)'}],{duration:150});
  await anim(img,[{filter:'brightness(1) saturate(1)'},{filter:'brightness(2.1) saturate(.25)',offset:.45},{filter:'brightness(1.3) saturate(.6)'}],{duration:130});
  img.style.transformOrigin='50% 50%'; img.style.transform='scaleX(.04)'; await anim(img,[{transform:'scaleX(1)'},{transform:'scaleX(.04)'}],{duration:80,easing:'ease-in'}); lock(o); // щёлк: старый символ схлопнулся — на его месте билет
  await anim(img,[{transform:'scaleX(.04) scaleY(.96)'},{transform:'scaleX(1.1) scaleY(1.07)',offset:.6},{transform:'scaleX(1) scaleY(1)'}],{duration:180,easing:'ease-out'}); img.style.transform=''; img.style.transformOrigin='50% 94%'; })());
 await Promise.all(jobs); wildFrame(col); bolt.fade(300); crackFade(520);
 if(hp&&hp.done) await hp.done;
 setTimeout(()=>{ if(l.isConnected&&!l.querySelector('.pmark')) l.remove(); },1100*K()+400); return col; }
// --- Цепь рубильника с потолка (fb/rocco-fix, 2026-10-12: «металлический рычаг, который он тянет, надо сделать из потолка, чтоб спускался к нему») ---
// В ролике H-lever цепь с кольцом висит прямо в воздухе: кадр роликa обрезает её на y≈26 (кадр 1280×720), выше — пустота. Теперь от потолка (верх окна, кронштейн) вниз до этого места тянется такая же цепь (потёртая сталь, чуть ржавчины, без свечения),
// а до появления кольца в ролике оно спускается из-под потолка само (0,95–1,46 с ролика), после тяги кольцо втягивается обратно вверх (4,55–5,3 с). Время — по currentTime ролика (ролик не ускоряется ни в Turbo, ни в Quick): цепь идёт ровно с рукой.
// Нет ролика (Turbo/Quick без ролика, Skip, «меньше движения», расчёт, портретный зал со старым Рокко) — цепи нет. Положение: x=1097, верх цепи в ролике y=26 (замер по альфе, раскачка ±5 px), зеркальный ролик — по его матрице.
const LCH={x:1097,y:26,D:58,tIn0:.95,tIn1:1.46,tX:1.62,tOut0:4.5,tOut1:4.72,tEnd:5.3};
function leverChain(){
 if(RM()||fast()||window.__sim||window.__swT!=null||!document.getElementById('krocco')) return null;
 const NS='http://www.w3.org/2000/svg', t0=performance.now(); let alive=true, host=null, v=null, tc=0, lastWall=0, seen=false;
 const mk=()=>{ host=document.createElement('div'); Object.assign(host.style,{position:'fixed',left:'0',top:'0',width:'0',height:'0',pointerEvents:'none',zIndex:'21',opacity:'0'});
  host.innerHTML=`<svg xmlns="${NS}" style="position:absolute;overflow:visible" width="1" height="1"><defs><pattern id="lchp" x="-10.5" width="21" height="21" patternUnits="userSpaceOnUse">
   <ellipse cx="10.5" cy="10.5" rx="4.6" ry="9.2" fill="none" stroke="#43372d" stroke-width="3.4"/><ellipse cx="10.5" cy="10.5" rx="4.6" ry="9.2" fill="none" stroke="#b09a84" stroke-width="1.2" stroke-dasharray="9 40" stroke-dashoffset="3"/>
   <rect x="9" y="19.2" width="3" height="3.6" rx="1" fill="#4a3a2d"/><rect x="9.1" y="-1.8" width="2.8" height="3.6" rx="1" fill="#4a3a2d"/><circle cx="12.2" cy="6" r=".9" fill="#7a4a2a" opacity=".8"/><circle cx="8.8" cy="14.5" r=".7" fill="#6a3f22" opacity=".8"/></pattern></defs>
   <g id="lchg"><rect id="lchr" fill="url(#lchp)"/><g id="lchring"><circle fill="none" stroke="#42362c" stroke-width="7.4"/><circle fill="none" stroke="#a08c76" stroke-width="2" stroke-dasharray="26 120" stroke-dashoffset="-10"/><circle r="1" fill="#7a4a2a" opacity="0"/></g></g>
   <g id="lchm"><rect x="-15" y="0" width="30" height="9" rx="2" fill="#2a2623"/><rect x="-15" y="7" width="30" height="2" fill="#15110e"/><circle cx="-10" cy="4" r="1.6" fill="#6d6458"/><circle cx="10" cy="4" r="1.6" fill="#6d6458"/><rect x="-5" y="9" width="10" height="5" rx="1.5" fill="#3b332c"/></g></svg>`;
  document.body.append(host); };
 const ez=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
 const stop=()=>{ if(!alive) return; alive=false; host&&host.remove(); };
 const tick=now=>{ if(!alive) return;
  if(!v){ v=document.querySelector('#krocco video.ak[data-n="lever"]'); if(!v||now-t0>12000) return v?stop():requestAnimationFrame(tick); }
  const op=+getComputedStyle(v).opacity;
  if(!seen){ if(op>.05&&(!v.paused||window.__lvT!=null)&&v.currentTime>.02){ seen=true; lastWall=now; tc=v.currentTime; mk(); } else if(now-t0>12000) return stop(); else return requestAnimationFrame(tick); }
  const live=op>.02&&(!v.paused||window.__lvT!=null)&&!v.ended; // __lvT — проверка по кадрам (tools/подмена времени ролика); ролик ещё идёт: время — по нему; кончился — досчитываем своими часами (ролик в реальном времени)
  if(window.__lvT!=null) tc=window.__lvT; else if(live) tc=Math.max(tc,v.currentTime); else tc+=(now-lastWall)/1000; lastWall=now;
  if(tc>=LCH.tEnd||(!live&&tc<LCH.tOut0-.4)) return stop(); // оборвали (Skip, ролик ушёл раньше времени): цепь исчезает, не дожидаясь конца
  const r=v.getBoundingClientRect(), s=r.width/1280; if(!(s>0)) return stop();
  const mir=/^matrix\(-/.test(getComputedStyle(v).transform), cx=mir?r.left+(1280-LCH.x)*s:r.left+LCH.x*s, yTop=Math.max(0,r.top+LCH.y*s), D=LCH.D*s, w=s;
  let B, ringA=0, vis=1; // B — низ кольца (экран, px), ringA — непрозрачность нарисованного кольца
  if(tc<LCH.tIn0) vis=0;
  else if(tc<LCH.tIn1){ B=ez((tc-LCH.tIn0)/(LCH.tIn1-LCH.tIn0))*(yTop+D); ringA=1; }
  else if(tc<LCH.tX){ B=yTop+D; ringA=1-ez((tc-LCH.tIn1)/(LCH.tX-LCH.tIn1)); }
  else if(tc<LCH.tOut0){ B=yTop+D; ringA=0; }
  else if(tc<LCH.tOut1){ B=yTop+D; ringA=ez((tc-LCH.tOut0)/(LCH.tOut1-LCH.tOut0)); }
  else { B=(yTop+D)*(1-ez((tc-LCH.tOut1)/(LCH.tEnd-LCH.tOut1))); ringA=1; }
  host.style.opacity=vis?'1':'0'; if(!vis) return requestAnimationFrame(tick);
  const lastY=ringA>0.02?B-D:Math.max(yTop+8*s,0), chainBottom=(tc>=LCH.tIn1&&tc<LCH.tOut0)?yTop+10*s:Math.max(0,B-D+3*s); // пока кольцо в ролике, цепь доходит до его кромки (+ нахлёст на цепь ролика)
  const g=host.querySelector('#lchg'), rect=host.querySelector('#lchr'), ring=host.querySelector('#lchring'), m=host.querySelector('#lchm');
  g.setAttribute('transform',`translate(${cx.toFixed(1)},0)`); host.querySelector('#lchp').setAttribute('patternTransform',`scale(${w.toFixed(3)})`); // узор звена 21×21 — по масштабу Рокко
  rect.setAttribute('x',(-10.5*w).toFixed(2)); rect.setAttribute('y',0); rect.setAttribute('width',(21*w).toFixed(2)); rect.setAttribute('height',Math.max(0,chainBottom).toFixed(1));
  ring.setAttribute('opacity',ringA.toFixed(3)); const rr=ring.querySelectorAll('circle'); rr.forEach((c,i)=>{ c.setAttribute('cx',0); c.setAttribute('cy',(B-D/2).toFixed(1)); c.setAttribute('r',(D/2-3.7*w).toFixed(1)); if(i<2) c.setAttribute('stroke-width',((i?2:7.4)*w).toFixed(2)); });
  m.setAttribute('transform',`scale(${w.toFixed(3)})`);
  requestAnimationFrame(tick); };
 requestAnimationFrame(tick);
 return {stop}; }
async function lever(rng){ await phase('lever'); react('R-breaker'); const LCx=leverChain(); /* цепь с потолка к руке (ниже, LCH) */
 // Свет гаснет в момент рывка по цепи — по часам самого ролика H-lever (рука берёт кольцо на 2,4 с, тянет 2,6–4,0 с, рывок ≈2,9 с, window.roccoLeverAt), а не по таймеру: раньше sleep(900) гасил свет за две секунды до тяги.
 // Ролик не ускоряем (ни в Turbo, ни в Quick): ждём его время, запасной таймер — roccoKey (мс ролика при 1×, делится на K) + запас clipCue; нет ролика (портрет, Skip, «меньше движения») — прежняя пауза 0,9 с.
 await clipCue('#krocco video.ak[data-n="lever"],video[data-hall="H-lever"]',window.roccoLeverAt||2.9,(window.roccoKey&&window.roccoKey('R-breaker'))||900);
 AU('lever.pull'); // звук — в момент рывка по цепи (в main стоял в начале, за ~2 с до тяги)
 const f=document.getElementById('field'), r=f.getBoundingClientRect();
 const o=el('div'); o.id='lightsout'; const rad=Math.max(80,r.width*.2); o.style.background=`radial-gradient(circle ${rad}px at 50% 50%,transparent 0,transparent ${rad*.4}px,rgba(0,0,0,.95) ${rad}px) 100% 0/300% 100% no-repeat`; Object.assign(o.style,{left:LAYER.style.left,top:LAYER.style.top,width:LAYER.style.width,height:LAYER.style.height}); f.append(o);
 AU('lever.blackout'); await anim(o,[{opacity:0},{opacity:1}],{duration:300,fill:'forwards'});
 const pick=rng()<.4?'sym-high-mask':REGULAR[(rng()*5)|0], jobs=[];
 const sweep=anim(o,[{backgroundPosition:'100% 0'},{backgroundPosition:'0% 0'}],{duration:1500,easing:'ease-in-out',fill:'forwards'});
 let k=0; for(let c=0;c<COLS;c++) for(let rr=0;rr<ROWS;rr++){ const s=BOARD[rr][c]; if(!s||s.id==='sym-scatter-invitation'||s.id==='sym-wild') continue; const d=(COLS-1-c)*240+rr*20; // за лучом фонарика (справа налево)
  jobs.push((async()=>{ await sleep(d); await anim(s.sp,[{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:130,fill:'forwards'}); setSprite(s,pick); AU('lever.flip'); await anim(s.sp,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:150,fill:'forwards'}); s.sp.style.transform=''; })()); k++; }
 await Promise.all(jobs); await sweep; AU('lever.on'); await anim(o,[{opacity:1},{opacity:0}],{duration:400,fill:'forwards'}); o.remove(); if(LCx) setTimeout(LCx.stop,2500); return pick; }

// --- надписи выигрыша (вариант «на символах», владелец 2026-10-10; образец — wins.html, раздел «B-место», placeStudy()/anchor(), стиль P1) ---
// Каскад: крупно сумма «$0.50» (Black Ops One, янтарь, без коробки), под ней мелко «10 × [значок] BALLOON × 2» (крем). Ставится в центре масс выигравших клеток группы, не ближе
// 1,5 клетки к краю поля, не на WILD и не наезжая на соседнюю надпись; две группы в каскаде — две суммы, каждая у своей группы. Порядок: подсветка → надпись появляется → держится →
// когда Рокко начинает забирать символы, надпись уплывает вверх и гаснет, а строка WIN в этот миг прибавляет (сумма вниз не летит; строка WIN — как была).
// Телефон (узкое поле) и Turbo — только сумма. «Меньше движения» — без уплывания: появилась, подержалась ~0,4 с, исчезла.
// Особые надписи (SACK = $…, +5 FREE SPINS, «Камеры») — тем же стилем по центру поля: special().
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wlWait=ms=>RM()&&!window.__sim?new Promise(r=>setTimeout(r,Math.min(ms,450))):sleep(ms); // «меньше движения»: время не умножается на 0 — надпись держится ~0,4 с, иначе выигрыш не успеть прочитать
function wlLayer(){ let b=document.getElementById('wlx'); if(!b){ b=el('div'); b.id='wlx'; document.getElementById('app').append(b); } return b; }
function wlAnchor(g,P,WP,taken,w,h){ // центр масс группы P, смещения до ±2 клеток; штраф за WILD, за наезд на соседнюю надпись, бонус — если надпись лежит на самом символе группы
 const {F,cw,ch,top,bottom}=g, cx=P.reduce((a,p)=>a+p[0],0)/P.length, cy=P.reduce((a,p)=>a+p[1],0)/P.length; let best=null;
 for(let dx=-2;dx<=2.01;dx+=.5) for(let dy=-2;dy<=2.01;dy+=.5){ const mx=Math.max(cw*1.5,w/2+8), x=clamp(cx+dx*cw,F.left+mx,F.right-mx), y=clamp(cy+dy*ch,top+ch*.95,bottom-ch*.95);
  let cost=Math.hypot((x-cx)/cw,(y-cy)/ch);
  for(const q of WP) if(Math.abs(x-q[0])<w/2+cw*.42&&Math.abs(y-q[1])<h/2+ch*.42) cost+=4;
  if(P.some(p=>Math.abs(x-p[0])<cw*.5&&Math.abs(y-p[1])<ch*.5)) cost-=.35;
  for(const r of taken) if(Math.abs(x-r.x)<(w+r.w)/2+cw*.15&&Math.abs(y-r.y)<(h+r.h)/2+ch*.1) cost+=8;
  if(!best||cost<best.c) best={x,y,c:cost}; }
 return best; }
const wlT=(x,y)=>`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
function wlFade(e,rise){ // надпись уплывает вверх и гаснет (без анимаций — просто исчезает)
 if(e._wf&&window.WinFx&&window.WinFx.fade(e,rise)) return; // winfx.js: свой уход у выбранного вида
 const k=e._k, a=animA(e,[{opacity:1,transform:`${wlT(e._x,e._y)} scale(${k})`},{opacity:0,transform:`${wlT(e._x,e._y-rise)} scale(${(k*1.05).toFixed(3)})`}],{duration:320,easing:'ease-in',fill:'forwards'});
 if(a) a.finished.catch(()=>{}).then(()=>e.remove()); else e.remove(); }
function wlPlace(e,x,y,k,i){ // поставить надпись в точку (x,y) экрана и показать (появление 0,22 с, у второй группы с запозданием)
 e._x=x; e._y=y; e._k=k; e.style.opacity=1; e.style.transform=`${wlT(x,y)} scale(${k})`;
 if(e._wf&&window.WinFx&&window.WinFx.place(e,i||0)) return; // winfx.js: своё появление у выбранного вида
 animA(e,[{opacity:0,transform:`${wlT(x,y)} scale(${(.8*k).toFixed(3)})`},{opacity:1,transform:`${wlT(x,y)} scale(${k})`}],{duration:220,delay:(i||0)*150,easing:'ease-out',fill:'backwards'}); }
function showWins(ev,mult,bt,opt){ // надписи группам выигрыша; null — если анимаций нет (расчёт без экрана). Возвращает {release(), mx} — mx: куда лететь множителю
 if(window.__sim||!LAYER||!LAYER.isConnected||!BOARD) return null;
 const F=document.getElementById('field').getBoundingClientRect(), Lr=LAYER.getBoundingClientRect(), cs=GEO.cs, kx=Lr.width/GEO.Wd, ky=Lr.height/GEO.Ht;
 const ctr=i=>[Lr.left+(cs[i].l+cs[i].w/2-GEO.L0)*kx,Lr.top+(cs[i].t+cs[i].h/2-GEO.T0)*ky], cw=cs[0].w*kx, ch=cs[0].h*ky, g={F,cw,ch,top:Lr.top,bottom:Lr.bottom};
 const WP=[]; BOARD.forEach((row,r)=>row.forEach((o,c)=>{ if(o&&o.id==='sym-wild') WP.push(ctr(r*COLS+c)); }));
 const short=true, box=wlLayer(), taken=[], out=[], amt={}; // владелец 2026-10-11: на поле только сумма выигрыша, формулу «10 × HORN × 3» убрали везде (как в популярных слотах; расчёт — в правилах)
 ev.wins.forEach((w,gi)=>{ const P=[]; BOARD.forEach((row,r)=>row.forEach((o,c)=>{ if(o&&o.id===w.s) P.push(ctr(r*COLS+c)); })); if(!P.length) return;
  const e=el('div','wl'+(w.s==='sym-high-mask'?' trophy':'')); e.style.setProperty('--amt',(cw*.56).toFixed(1)+'px'); e.style.setProperty('--fm',Math.max(11,cw*.2).toFixed(1)+'px');
  e.innerHTML=`<div class="amt">${moneyS((opt&&opt.pre?w.x/w.f:w.x)*bt*mult)}</div>`+(short?'':`<div class="fm">${w.m} × <img class="ico" src="${SYM(w.s)}" alt=""> <span>${PAY[w.s][0].toUpperCase()} <span class="mx">× ${mult}</span></span></div>`);
  if(window.WinFx) window.WinFx.dress(e,{gi,w,cw}); // winfx.js: вид суммы на поле (печатный ярлык, штамп, перекидные цифры…); «прежний» ничего не меняет
  box.append(e); const ww=e.offsetWidth, hh=e.offsetHeight, k=Math.min(1,F.width*.9/ww), a=wlAnchor(g,P,WP,taken,ww*k,hh*k); taken.push({x:a.x,y:a.y,w:ww*k,h:hh*k});
  wlPlace(e,a.x,a.y,k,gi); out.push(e); amt[w.s]=e.querySelector('.amt'); });
 if(!out.length) return null;
 return {mx:out[0].querySelector('.mx')||out[0].querySelector('.amt'),amt,release:()=>out.forEach(e=>wlFade(e,cw*.16)),
  final:()=>{ ev.wins.forEach(w=>{ const a=amt[w.s]; if(!a) return; a.textContent=moneyS(w.x*bt*mult); }); }}; } // final(): REC-метка села на сумму — сумма умножилась
function special(big,small,cls){ // особая надпись по центру поля: крупно big, под ней мелко small; сама гаснет через ~1,4 с (с анимациями) или ~1 с (без)
 if(window.__sim) return null; const field=document.getElementById('field'); if(!field) return null; const F=field.getBoundingClientRect(), cw=Math.min(F.width/6,F.height/5), e=el('div','wl ev'+(cls?' '+cls:''));
 e.style.setProperty('--amt',(cw*.5).toFixed(1)+'px'); e.style.setProperty('--fm',Math.max(11,cw*.2).toFixed(1)+'px'); e.innerHTML=`<div class="amt">${big}</div>${small?`<div class="fm">${small}</div>`:''}`;
 wlLayer().append(e); wlPlace(e,F.left+F.width/2,F.top+F.height/2,Math.min(1,F.width*.9/e.offsetWidth),0);
 setTimeout(()=>{ if(e.isConnected) wlFade(e,cw*.16); },RM()?1000:Math.max(450,1400*K())); return e; }
function demoWin(){ // страница без ?state=idle (по умолчанию зал «в выигрыше»): колпаки и WILD подсвечены, надпись «$1.20» — как показ, без раунда
 if(!(typeof st!=='undefined'&&st==='win'&&scene==='hall')||roccoCol||TRICK||!juice||q.get('screen')||GS.spinning||!BOARD||!LAYER) return;
 const cells=[]; BOARD.forEach((row,r)=>row.forEach((o,c)=>{ if(o&&(o.id==='sym-low-hat'||o.id==='sym-wild')) cells.push([r,c]); }));
 glow(cells,true); showWins({wins:[{s:'sym-low-hat',n:8,m:8,x:.4}]},3,bet()); }
function flyMult(m,tgt){ const v=document.querySelector('#alt .ctr2 .win .v'); if(!v||RM()||m<2||!tgt) return Promise.resolve(); const a=v.getBoundingClientRect(), b=tgt.getBoundingClientRect(); // множитель летит со счётчика к «× N» в надписи
 return flyClone('data:image/svg+xml,'+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><text x='60' y='44' text-anchor='middle' font-family='Black Ops One,Impact,sans-serif' font-size='44' fill='%23FFC861' stroke='%23000' stroke-width='3' paint-order='stroke'>×${m}</text></svg>`),{left:a.left,top:a.top-6,width:70,height:36},{left:b.left+b.width/2,top:b.top,width:0,height:b.height},520,{scale:1,rot:0,arc:-30,fade:0}); }
function tweenResult(from,to,ms){ if(window.WinFx&&window.WinFx.count){ const p=window.WinFx.count(from,to,ms,{setResult,AU,K,money,anim:animA,fast:()=>ST.fast}); if(p) return p; } // winfx.js: счёт строки WIN у выбранного вида; «прежний» — вернёт null, ниже обычный счёт
 return new Promise(res=>{ const d=ms*K(); if(d<=0){ setResult(to); res(); return; } const t0=performance.now(); let tk=0; const st=n=>{ const k=ST.fast?1:Math.max(0,Math.min(1,(n-t0)/d)); // Skip: число сразу доходит до итога setResult(from+(to-from)*(1-Math.pow(1-k,3))); if(k<1&&n-tk>60){ tk=n; AU('win.count_tick'); } // тик, пока число считает вверх
 if(k<1) requestAnimationFrame(st); else res(); }; requestAnimationFrame(st); }); }

// «выходки» Рокко в покое: раз в 15–25 секунд случайный ролик (зал)
(()=>{ const tick=()=>{ setTimeout(()=>{ if(scene==='hall'&&!GS.spinning&&!document.hidden&&!dialogOpen()&&K()>=1&&typeof playRocco==='function'&&!(window.RoccoAlive&&window.RoccoAlive.on())) { AU('rocco.idle'); if(window.roccoKitchenWake) window.roccoKitchenWake(); else playRocco(IDLE_CLIPS[(Math.random()*IDLE_CLIPS.length)|0]); } tick(); },15000+Math.random()*10000); }; tick(); })();
// --- спин ---
// Бесплатные спины «Кухни» идут сами один за другим до конца (владелец 2026-10-11, п.10). Таймер один: Play в паузе запускает спин сразу, а запоздавший таймер ничего не делает (раньше он нажимал «Skip»).
// Открыто окно (настройки, правила, история) — цепочка ждёт и продолжает, когда его закроют.
let fsT=0;
function freeChain(ms){ clearTimeout(fsT); let waited=false; fsT=setTimeout(function tick(){ fsT=0;
 if(window.__sim||!bonusScene()||GS.fs<=0||GS.replay||GS.spinning) return;
 if(dialogOpen()){ waited=true; fsT=setTimeout(tick,150); return; }
 if(waited){ waited=false; fsT=setTimeout(tick,380); return; } // окно только что закрылось (ворота гаснут) — даём взглянуть на поле, потом спин
 if(window.bpSack&&window.bpSack.introDue()){ window.bpSack.intro().then(()=>freeChain(250)); return; } // вход в «Кухню», один раз: окошко SACK загорается, подсказка «каждые 4 кражи мешок платит ещё раз»; тап пропускает
 spin(); },ms); }
function startBonus(n,rng,pre,kind){ kind=kind==='cameras'?'cameras':'kitchen'; if(window.__sim){ window.__bonuses=(window.__bonuses||0)+1; return; } GS.fs=n; GS.fst=n; GS.kstep=0; GS.ksteals=0; GS.sack=0; GS.kintro=false; GS.ktotal=0; GS.auto=0; GS.kgo=false; GS.kind=kind; GS.rec=kind==='cameras'?Array(30).fill(0):null; if(pre) pre(); save(); toScreen(`?scene=${kind}&screen=${kind}`); }
const spinTimer=()=>{ if(!GS.spinning) spin(); }; // автоигра: следующий спин по таймеру; если игрок уже сам начал спин, таймер не нажимает Skip
function spin(){
 if(GS.spinning){ AU('spin.skip'); GS.skip&&GS.skip(); return; } // второй Play / Space = Skip: домотать ФАЗУ, которая играет сейчас (skipPhase), а не весь спин
 if(dialogOpen()) return;
 if(window.BPLoad&&BPLoad.hold(spin)) return; // fb/perf: ролики Рокко и звуки первого спина ещё докачиваются — спин ждёт (не больше 10 с), внизу плашка с ходом загрузки; иначе глотание/бросок/радость шли бы запасным путём без ролика
 const field=document.getElementById('field'); if(!field) return;
 const replay=GS.replay, free=!replay&&bonusScene()&&GS.fs>0, cost=free?0:spinCost();
 if(!replay&&!free){ if(GS.bal<cost){ GS.auto=0; syncHUD(); flash('NOT ENOUGH BALANCE'); return; } GS.bal-=cost; }
 if(!replay) GS.lastWin=0;
 AU('spin.start'); SC_N=0; window.bpAudio&&bpAudio.stopLoop('scatter.anticipation');
 GS.spinning=true; document.getElementById('bp-menu')?.remove(); closeBets(true);
 document.querySelectorAll('.conf,#wlx').forEach(e=>e.remove()); syncHUD();
 ST.fast=false; ST.anims=[]; ST.sleeps=[];
 runRound(field,{replay,free,cost}).catch(err=>{ console.error(err); GS.spinning=false; GS.skip=null; ST.fast=false; syncHUD(); });
}
// --- «Камеры»: показ на мониторах-клетках (cams-rec.js, window.CamRec) ---
const moneyS=v=>(v>0&&v<.005&&!CUR)?'$'+v.toFixed(v<.0005?5:4):money(v); // суммы меньше полцента (выплаты «Камер» до множителей) — с дробной частью, иначе «$0.00»
const camOpts=()=>({K,fast:fast(),rm:RM()});
function camMath(w,WL,mult,bt){ if(window.__sim||!window.CamRec) return Promise.resolve(); const el=WL&&WL.amt&&WL.amt[w.s]; // значки выигрыша слетаются в метку «×N», она садится на сумму, сумма считается от суммы без REC до умноженной (WL.final() потом гарантирует итоговый текст)
 return Promise.resolve(CamRec.showMath(w.rc,w.f,{...camOpts(),target:el||undefined,amount:el?{el,from:(w.x/w.f)*bt*mult,to:w.x*bt*mult,fmt:moneyS}:undefined})).catch(e=>console.error(e)); }
function camRecShow(cells,rec){ if(window.__sim||!window.CamRec) return; if(fast()&&!RM()){ CamRec.recAll(rec); return; } const o=camOpts(); cells.forEach(([r,c])=>{ const i=r*COLS+c; Promise.resolve(CamRec.rec(i,rec[i],o)).catch(e=>console.error(e)); }); } // новые значки: только что украденные клетки получают REC ×2 / удваиваются
async function camSteal(cells){ // в «Камерах» Рокко не стоит у поля: он появляется на мониторах, где крадёт (CamRec.steal), символы исчезают по onTake
 const list=[]; for(const [r,c] of cells){ const t=BOARD[r][c]; if(t) list.push({r,c,o:t}); }
 const gone=e=>{ e.o.sp.style.visibility='hidden'; e.o.sp.remove(); if(BOARD[e.r][e.c]===e.o) BOARD[e.r][e.c]=null; };
 if(!list.length) return;
 if(window.__sim||!window.CamRec){ list.forEach(gone); return; }
 try{ await CamRec.steal(cells.map(([r,c])=>r*COLS+c),{onTake:()=>list.forEach(gone)},camOpts()); }catch(e){ console.error(e); }
 list.forEach(e=>{ if(BOARD[e.r][e.c]===e.o) gone(e); }); }
async function runRound(field,{replay,free,cost}){
 const seed=replay?replay.seed:(window.__seeds&&window.__seeds.length?window.__seeds.shift():(Math.random()*4294967296)>>>0), mk=replay?replay.mk:free?null:modeOn, rng=rngOf(seed), bt=bet();
 const BS=bonusScene(), CM=scene==='cameras', L=LADDER[BS?'kitchen':'hall']; let step=free?(GS.kstep||0):(mk==='hungry'?1:0), total=0, chain=0, steals=0, bigs=0;
 const room=Math.max(0,MAXX*bt-(free?(GS.ktotal||0):0)); // сколько ещё можно выиграть до 25 000× ставки (в бонусе — за весь бонус)
 const rec=CM&&free?(GS.rec||(GS.rec=Array(30).fill(0))):null; // REC-значки «Камер» по клеткам (0 — нет); правятся на месте и сохраняются (save)
 if(!buildLayer(field)) throw new Error('нет поля');
 BOARD=mkBoard((GRIDIDS||HALL).map(r=>r.slice())); // старое поле на новом слое
 GS.skip=skipPhase; GS.speedUp=()=>{};
 if(free){ GS.fs--; setSpinsMeter(); if(GS.fs<=0) AU('freespins.last'); }
 { const cv=document.querySelector('#alt .ctr2 .win .v'); if(cv&&!free&&(+cv.textContent)>1) AU('counter.reset'); } // новый спин: счётчик возвращается на ×1
 setCounter(step,false); setResult(0); if(free) setResult(GS.ktotal||0);
 const ids=genIds(rng,mk,free); TRICK_EARLY=null;
 let pre=null; if(free){ const pu=rng()<BONUS.startPunch; pre={pu}; if(!pu){ const a=BONUS.spinWild; pre.n=a[0]+((rng()*(a[1]-a[0]+1))|0); } trickEarly(pu?'punch':'toss'); } // ход Рокко в начале бесплатного спина решается сразу (порядок rng тот же), его ролик идёт параллельно падению поля
 // 1) старое поле уходит вниз, новое падает
 await phase('drop',{free,seed}); await dropOut(BOARD); BOARD=ids.map(r=>r.map(()=>null));
 await dropIn(BOARD,ids); AU('spin.stop'); window.bpAudio&&bpAudio.stopLoop('scatter.anticipation');
 GRIDIDS=idsOf(BOARD);
 // 2) шалость Рокко в начале спина (зал) / ход Рокко в начале каждого бесплатного спина (бонусы): либо подбросит WILD, либо ударит по рамке — столбец WILD
 if(!free&&rng()<.07){ await phase('giggle'); const tz=rng()<.5; if(tz) trickEarly('toss'); else { react('P-giggle'); await sleep(900); } if(tz){ await toss(rng,2+((rng()*2)|0)); } else if(step<1){ step=1; setCounter(step,true); } } // бросок — без хихиканья перед ним: его замах и есть вступление
 if(pre){ if(pre.pu) await punchColumn(rng,0); else await toss(rng,pre.n); }
 // 3) каскады
 let trophyWon=false;
 while(true){
  const ev=evalIds(idsOf(BOARD),bt,rec); if(!ev.wins.length) break; chain++;
  const mult=L[step], stepWin=ev.base*mult, big=ev.wins.reduce((a,w)=>a+w.x,0);
  await phase('win',{n:chain,x:+(stepWin/bt).toFixed(4)}); AU('win.cluster'); glow(ev.cells,true); await sleep(300); // уголки защёлкиваются, остальные символы серые
  if(ev.wins.some(w=>w.s==='sym-high-mask')) trophyWon=true;
  if(window.WinFx) window.WinFx.step(chain,stepWin/bt,{free,mult}); // winfx.js: метка цепочки, толчок поля, мигание света — по шагу выигрыша
  const recWins=rec?ev.wins.filter(w=>w.f>1):[], WL=showWins(ev,mult,bt,recWins.length?{pre:true}:null); AU('win.amount'); // сумма крупно на выигравших символах (в «Камерах» с REC — сначала сумма без REC); множитель летит к «× N»
  if(WL&&recWins.length){ await Promise.all(recWins.map(w=>camMath(w,WL,mult,bt))); WL.final(); } // REC-значки выигрыша слетаются в «×N», метка садится на сумму — сумма умножается; потом счётчик, как обычно
  const before=free?(GS.ktotal||0)+total:total; total+=stepWin; await Promise.all([flyMult(mult,WL&&WL.mx),wlWait(1000)]);
  // Рокко начинает забирать: надпись уплывает вверх и гаснет, строка WIN в этот же миг прибавляет (сумма вниз не летит)
  await phase('steal',{n:chain}); if(WL) WL.release(); const tw=tweenResult(before,before+stepWin,300);
  if(BS&&free){ const SK=window.bpSack; if(SK) SK.hold(); GS.sack=(GS.sack||0)+stepWin; setSpinsMeter(); } // сумма копится в состоянии сразу; окошко SACK держит старое число (SK.hold), пока монетки этой кражи не долетят (SK.gain ниже)
  const sfrom=BS&&free?centroidOf(ev.cells):null; // откуда полетят монетки: середина клеток, которые сейчас заберёт Рокко
  const bg=bigSteal(stepWin,bt,chain); if(bg) bigs++;
  hlRelease(ev.cells); // прицел уходит вместе с началом забирания (если коллект захочет другой миг — он вызовет window.hlRelease сам)
  if(CM) await camSteal(ev.cells); else await steal(ev.cells,{big:bg,x:stepWin/bt,chain,name:chain>=3?'R-grab2':'R-grab'});
  await tw; glow(ev.cells,false); steals++; GS.ksteals=free?(GS.ksteals||0)+1:GS.ksteals; if(free) setSpinsMeter(); if(BS&&free&&window.bpSack) window.bpSack.gain(stepWin,sfrom); // лампы мешка: сколько краж в текущей порции. Кража съедена: сумма превращается в монетки и летит в окошко SACK (не ждём: поле тем временем падает)
  if(rec){ ev.cells.forEach(([r,c])=>{ const i=r*COLS+c; rec[i]=rec[i]?Math.min(rec[i]*2,BONUS.recCap):2; }); camRecShow(ev.cells,rec); if(!window.__sim) save(); } // камера записала кражу: на клетке множитель ×2, при следующей краже там же — ×4, ×8… (значок виден уже после кражи — действует на следующий выигрыш)
  const prev=step; step=Math.min(step+1,L.length-1); if(step!==prev){ await phase('counter',{step}); setCounter(step,true); AU('counter.step'); const te=TRICK_AT[step]; if(te==='toss'||te==='punch') trickEarly(te); } await sleep(160);
  await phase('refill',{n:chain}); await collapseRefill(rng,mk); GRIDIDS=idsOf(BOARD);
  // трюк, если счётчик встал на нужную ступень
  const dumpDue=free&&GS.ksteals%SACK_N===0, trick=step!==prev?TRICK_AT[step]:null; if(trick) AU('counter.trick'); // dumpDue — каждая SACK_N-я кража: сразу после неё мешок
  if(trick==='toss') await toss(rng,2+((rng()*2)|0)); else if(trick==='punch') await punchColumn(rng,L[step]); else if(trick==='lever') await lever(rng);
  // бонусы: каждые SACK_N утаскиваний Рокко высыпает мешок: накопленное платится второй раз → счётчик на ступень выше → +3 спина → трюк новой ступени (если есть). Удара по рамке после высыпания нет (владелец 2026-10-12)
  if(dumpDue){ const sack=GS.sack||0, t0=(GS.ktotal||0)+total, SK=window.bpSack;
   const lift=async()=>{ const p0=step; step=Math.min(step+1,L.length-1); await counterLift(p0,step); // счётчик +1 на виду
    GS.fs+=BONUS.dumpSpins; GS.fst=(GS.fst||0)+BONUS.dumpSpins; setSpinsMeter(); hudAdd5(BONUS.dumpSpins); special('+'+BONUS.dumpSpins,'FREE SPINS'); AU('freespins.add'); await sleep(650); // мешок добавил спины
    const tr=step!==p0?TRICK_AT[step]:null; if(tr==='toss') await toss(rng,2+((rng()*2)|0)); else if(tr==='lever') await lever(rng); else if(tr==='punch') await punchColumn(rng,L[step]); };
   if(SK){ SK.hold(); GS.sack=0; total+=sack; await phase('sack',{x:+(sack/bt).toFixed(4)}); await SK.dump(sack,{from:t0,to:t0+sack,lift}); } // Рокко достаёт мешок и высыпает (sack.js), сумма платится второй раз, дальше lift
   else { react('K-dump'); await sleep((window.roccoKey&&window.roccoKey('K-dump'))||600); GS.sack=0; total+=sack; setSpinsMeter(); special(money(sack),'SACK'); await tweenResult(t0,t0+sack,320); await lift(); } }
  GRIDIDS=idsOf(BOARD); if(ST.fast===false) await sleep(120); if(total>=room||chain>=25) break;
 }
 total=Math.min(total,room);
 if(free&&window.bpSack){ await phase('coins'); await window.bpSack.idle(); } // монетки последней кражи долетели до окошка SACK — только потом итог раунда (и окно итога бонуса)
 if(free) GS.kstep=step;
 // 4) итог раунда
 if(window.WinFx) window.WinFx.end();
 if(total>0&&total<10*bt){ AU(total<2*bt?'win.small':total<5*bt?'win.medium':'win.big'); AU('win.end',{delay:420}); } // с 10× ставки говорит шоу большого выигрыша
 const inv=countsOf(idsOf(BOARD))['sym-scatter-invitation']||0;
 if(total>0&&(K()>=1||bigs>0||total>=(BS?30:10)*bt)){ if(!(window.RoccoAlive&&window.RoccoAlive.win(total/bt,{trophy:trophyWon,big:bigs>0,amt:money(total)}))) react(total>=20*bt||trophyWon?'W-huge':total>=8*bt?'W-dance':'W-clap',0,true); } // кубки — Рокко радуется сильнее; в Turbo/Quick — только после крупных выигрышей (≥10× ставки, в бонусе ≥30×, или был крупный шаг цепочки)
 let capped=false;
 if(!replay){ GS.lastWin=total; GS.bal+=total; if(free) GS.ktotal=(GS.ktotal||0)+total; const d=new Date();
  GS.hist.unshift({t:d.toTimeString().slice(0,5),mode:free?(CM?'Cameras':'Kitchen'):(mk?MODES.find(m=>m.k===mk).nm:'Base'),cost,win:total,seed,mk,norep:free}); GS.hist=GS.hist.slice(0,20);
  if(free&&(GS.ktotal||0)>=MAXX*bt-1e-9){ capped=true; GS.fs=0; } } // 25 000× за бонус: дальше бонус не идёт
 window.__last={seed,chain,steals,bigs,step,total:total/bt,inv}; setResult(free?GS.ktotal:total); GS.spinning=false; GS.skip=null; GS.speedUp=null; ST.fast=false; phaseEnd(); syncHUD(); setSpinsMeter();
 const turbo=GS.holdTurbo||GS.speed==='turbo';
 const next=()=>{ syncHUD(); if(replay||window.__sim) return;
  if(free&&GS.fs<=0){ setTimeout(()=>bonusEnd(),400); return; }
  if(GS.auto>0&&GS.autoOpt.stopWin&&total>=GS.autoOpt.stopWin*bt) GS.auto=0;
  if(GS.auto>0){ GS.auto--; syncHUD(); if(free) freeChain(turbo?250:700); else if(GS.auto>0) setTimeout(spinTimer,turbo?250:700); return; }
  if(free&&GS.fs>0) freeChain(turbo?250:900); };
 const retro=free&&inv>=3&&!capped; // 3+ приглашения в бонусе (в любом: 4 и больше ничего лишнего не дают) — +5 спинов
 const gate=()=>{ if(replay) return next();
  if(scene==='hall'){ const b=spinsFor(inv); if(b){ AU('scatter.trigger'); startBonus(b.n,rng,null,b.kind); return; } } // 3 приглашения — «Кухня», 4 и больше — «Камеры»
  if(retro){ GS.fs+=BONUS.retroSpins; GS.fst=(GS.fst||0)+BONUS.retroSpins; setSpinsMeter(); hudAdd5(BONUS.retroSpins); special('+'+BONUS.retroSpins,'FREE SPINS'); AU('freespins.add'); }
  next(); };
 const lastFree=free&&!replay&&GS.fs<=0&&!retro; // последний бесплатный спин: отдельного BIG WIN нет, итог бонуса (bonusEnd) сам покажет шоу с суммой всего бонуса
 if(lastFree) gate();
 else if(total>=MAXX*bt) bigWin(total,true,()=>{GS.auto=0;gate();},bt);
 else if(total>=10*bt) bigWin(total,false,gate,bt);
 else gate();
}

// ---------- проверка математики в странице (без анимаций); те же правила считает tools/rtp_sim/engine.js (check_ui_bonus.js сверяет по seed) ----------
// __kitchenSim(N, spins, cameras): N бонусов по spins бесплатных спинов («Кухня» с cameras=false или «Камеры» с cameras=true; +5 за 3+ приглашения, мешок со ступенью и +3 спина, REC); открывать с ?scene=kitchen или ?scene=cameras.
// Возвращает среднее, разброс, спины на бонус, максимум; со st — подробности по спинам и выплатам (процентили, доли ниже 20× и 50×, события на спин, REC).
window.__kitchenSim=async(N=20,spins=BONUS.spinsK,cameras=false,init=null)=>{ // init — необязательные поля GS для первого спина (для проверок: tools/skip_phase_check.js ищет seed)
 if(!bonusScene()) return 'открой страницу с ?scene=kitchen или ?scene=cameras';
 const field=document.getElementById('field'), keep={bal:GS.bal,hist:GS.hist,fs:GS.fs,fst:GS.fst,kstep:GS.kstep,ksteals:GS.ksteals,sack:GS.sack,ktotal:GS.ktotal,rec:GS.rec,mode:modeOn};
 window.__sim=true; modeOn=null; let sum=0, sq=0, played=0, max=0, over=0, dumps0=0, steals=0, dead=0, retr=0, wins=0, recWins=0, facSum=0; const tot=[];
 for(let k=0;k<N;k++){ GS.fs=spins; GS.fst=spins; GS.kstep=0; GS.ksteals=0; GS.sack=0; GS.ktotal=0; GS.rec=(cameras?Array(30).fill(0):null); if(init) Object.assign(GS,init); let guard=0;
  while(GS.fs>0&&guard++<400){ GS.replay=null; await runRound(field,{replay:null,free:true,cost:0}); const big=document.getElementById('bp-big'); if(big){ big.next(); big.next(); } played++; const L=window.__last; if(!L.steals) dead++; steals+=L.steals; if(GS.ktotal>=MAXX*bet()) break; }
  const t=Math.min(GS.ktotal/bet(),MAXX); tot.push(t); sum+=t; sq+=t*t; max=Math.max(max,t); over+=GS.ktotal>=MAXX*bet()?1:0; }
 window.__sim=false; Object.assign(GS,{bal:keep.bal,hist:keep.hist,fs:keep.fs,fst:keep.fst,kstep:keep.kstep,ksteals:keep.ksteals,sack:keep.sack,ktotal:keep.ktotal,rec:keep.rec}); GS.spinning=false; modeOn=keep.mode; save();
 tot.sort((a,b)=>a-b); const m=sum/N, pc=p=>tot[Math.min(N-1,Math.floor(p*N))];
 return {bonuses:N, mean:+m.toFixed(6), sd:+Math.sqrt(sq/N-m*m).toFixed(1), spinsPerBonus:+(played/N).toFixed(2), noWinSpins:+(dead/played).toFixed(3), p10:pc(.1),p50:pc(.5),p90:pc(.9), below20:tot.filter(v=>v<20).length/N, below50:tot.filter(v=>v<50).length/N, max:+max.toFixed(1), maxHits:over}; };
window.__baseSim=async(N=2000,mk=null)=>{ // проверка базы: средний выигрыш и как часто запускаются бонусы (без анимаций)
 const field=document.getElementById('field'), bal=GS.bal, hist=GS.hist; window.__sim=true; window.__bonuses=0; let win=0, hits=0, k3=0, k4=0, k5=0;
 for(let i=0;i<N;i++){ GS.replay=null; modeOn=mk; await runRound(field,{replay:null,free:false,cost:0}); const big=document.getElementById('bp-big'); if(big){ big.next(); big.next(); }
  const L=window.__last; win+=L.total; hits+=L.total>0?1:0; if(L.inv===3) k3++; else if(L.inv===4) k4++; else if(L.inv>=5) k5++; }
 window.__sim=false; GS.bal=bal; GS.hist=hist; GS.spinning=false; modeOn=null; save();
 return {spins:N,rtpBase:+(win/N).toFixed(3),hit:+(hits/N).toFixed(3),kitchenEvery:Math.round(N/Math.max(1,k3)),kitchen:k3,camerasEvery:Math.round(N/Math.max(1,k4+k5)),cameras:k4+k5,k3,k4,k5}; };

function flash(t){ AU('ui.error'); if(window.bpPlates) bpPlates.toast(t); const cap=document.getElementById('bp-playcap'); if(!cap) return; cap.textContent=t; setTimeout(syncHUD,1400); }

// ---------- кнопки пульта: одна точка входа ----------
document.addEventListener('click',e=>{
 const b=e.target.closest('#pod button,#pod [role="button"]'); if(!b) { // клик мимо панелей закрывает их
  if(!e.target.closest('#bp-menu')&&popEl('bp-menu')){ popOut(popEl('bp-menu')); syncHUD(); }
  if(!e.target.closest('#bp-bets')) closeBets(); return; }
 const l=(b.getAttribute('aria-label')||'').replace(/^Play (down|up|list)$/,'Bet $1'); // социальный режим переименовывает Bet → Play
 if(e.detail>0) setTimeout(()=>b.blur(),0); // после клика мышью фокус снимаем — иначе пробел рисует жёлтый ободок фокуса вокруг кнопки
 if(l==='Menu'){ e.stopPropagation(); if(!popEl('bp-menu')) AU('ui.open'); toggleMenu(); return; }
 if(l.startsWith('Spin speed')){ AU('ui.toggle'); GS.speed={normal:'quick',quick:'turbo',turbo:'normal'}[GS.speed]||'normal'; syncHUD(); return; } // по кругу: обычная → быстрая → турбо
 if(GS.replay&&/^(Bet|Autoplay)/.test(l)) return; // в реплее ставка и автоигра недоступны
 if(l==='Bet list'){ e.stopPropagation(); if(!GS.spinning&&!GS.auto) betList(); return; }
 if(l==='Bet down'||l==='Bet up'){ if(GS.spinning||GS.auto) return; AU(l==='Bet up'?'ui.bet_up':'ui.bet_down'); betI=Math.max(0,Math.min(BETS.length-1,betI+(l==='Bet up'?1:-1))); syncHUD(); return; }
 if(l==='Play'||l==='Skip'||l==='Replay'){ spin(); return; }
 if(l==='Stop autoplay'){ AU('ui.toggle'); GS.auto=0; syncHUD(); return; }
 if(l==='Autoplay'){ if(autoLocked()) return; if(GS.auto){ AU('ui.toggle'); GS.auto=0; syncHUD(); } else autoplay(); return; }
},true);

// ---------- клавиатура: пробел = Play/Skip, зажатый пробел = турбо; Escape закрывает ----------
let spaceDown=0, holdT=null;
addEventListener('keydown',e=>{
 if(e.key==='Escape'){ const hadBets=!!popEl('bp-bets'), mn=popEl('bp-menu'), wr=document.querySelector('.bp-wrap:not([data-out])'); popOut(mn); closeBets(); if(hadBets) podBtn('Bet list')?.focus(); wr?.close?.(); document.querySelector('#bp-big[data-sum]')?.next?.(); syncHUD();
  if(!hadBets){ const w=wr&&wr._ret?wr:mn; if(w) giveBack(w); } return; } // фокус вернуть на кнопку пульта, с которой открыли меню/окно (QA m5) // Esc закрывает список ставок (фокус — на окно BET) и окна
 if(e.key==='Enter'&&e.repeat&&e.target.closest&&e.target.closest('#pod [aria-label="Bet list"],#pod [aria-label="Play list"],#bp-bets')){ e.preventDefault(); return; } // зажатый Enter не должен открывать и закрывать список по кругу
 const chip=e.target.closest&&e.target.closest('#bp-bets .bp-chip'); // список ставок: стрелки двигают по сетке, Home/End — первая и последняя ставка
 if(chip&&/^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(e.key)){ const all=[...document.querySelectorAll('#bp-bets .bp-chip')], i=all.indexOf(chip), cols=getComputedStyle(document.getElementById('bp-bets')).gridTemplateColumns.split(' ').length||1;
  const to={ArrowLeft:i-1,ArrowRight:i+1,ArrowUp:i-cols,ArrowDown:i+cols,Home:0,End:all.length-1}[e.key]; e.preventDefault(); if(to>=0&&to<all.length) all[to].focus(); return; }
 if(e.code!=='Space') return;
 const big=document.querySelector('#bp-big:not([data-out])'); if(big){ e.preventDefault(); if(!e.repeat) big.next(); return; }
 if(document.getElementById('wel')&&window.Welcome){ e.preventDefault(); if(!e.repeat) Welcome.play(); return; } // приветствие: пробел = PLAY (спин не запускается)
 if(e.target.closest&&e.target.closest('.bp-wrap,#fmenu,#bp-menu,#bp-bets,#ovl,#wel,#pod [aria-label="Bet list"],#pod [aria-label="Play list"]')) return; // в окнах и на окне BET пробел нажимает кнопку
 e.preventDefault(); if(e.repeat) return; // автоповтор клавиши не делает новую ставку
 spaceDown=performance.now(); spin();
 clearTimeout(holdT); holdT=setTimeout(()=>{ if(spaceDown){ GS.holdTurbo=true; GS.speedUp&&GS.speedUp(); syncHUD(); } },350);
},true);
addEventListener('keyup',e=>{ if(e.code!=='Space') return; spaceDown=0; clearTimeout(holdT); if(GS.holdTurbo){ GS.holdTurbo=false; syncHUD(); } });
addEventListener('blur',()=>{ spaceDown=0; GS.holdTurbo=false; syncHUD(); });

after(); // первая отрисовка уже прошла в index.html
// Показ трюков Рокко настоящим движком на готовом поле (для разработки и ревью): window.bpFx.punch(seed,_,mult) / .toss(seed,n) / .dump(seed) (кухня); адрес ?state=idle&fx=punch|toss (зал) или ?state=idle&scene=kitchen&fx=punch|dump повторяет трюк по кругу
window.bpPunchPick=(k,v)=>{ try{ sessionStorage.setItem(k==='fx'?'bp-punchfx':'bp-punchhit',v); }catch(e){} const p='?state=idle&fx=punch'; if(typeof goQ==='function') goQ(p); else location.search=p; }; // меню «Экраны макета»: выбрать вариант удара и смотреть его по кругу на готовом поле
window.bpBwRoccoPick=v=>{ try{ sessionStorage.setItem('bp-bwrocco',v); }catch(e){} const p='?state=idle&screen=bigwin'; if(typeof goQ==='function') goQ(p); else location.search=p+'&bwrocco='+v; }; // меню «Экраны макета»: выбрать, как Рокко стоит на экране большого выигрыша (body|eyes|monitor|none, читает bigwin-show.js), и сразу показать шоу
window.bpFx={ hl:n=>hlDemo(n), punch:(seed,_,mult)=>punchColumn(rngOf(seed||1),mult), toss:(seed,n)=>toss(rngOf(seed||1),n||3), lever:seed=>lever(rngOf(seed||1)), lift:(a,b)=>counterLift(a,b), counter:(i,pop)=>setCounter(i,pop), board:()=>BOARD, restore:()=>{ document.querySelectorAll('#field .pmark').forEach(e=>e.remove()); restoreBoard(); },
 dump:async seed=>{ const SK=window.bpSack, amt=12.4*bet(), t0=GS.ktotal||0; let st=GS.kstep||0; setCounter(st,false); // «высыпание мешка» на готовом поле: 4 лампы, $12.40 (× ставка), потом счётчик +1, удар и столбец WILD
  const lift=async()=>{ const p=st; st=Math.min(st+1,LADDER.kitchen.length-1); await counterLift(p,st); GS.kstep=st; };
  if(!SK){ react('K-dump'); await sleep((window.roccoKey&&window.roccoKey('K-dump'))||600); special('$12.40','SACK'); await lift(); return; }
  GS.ksteals=SACK_N; GS.sack=amt; setSpinsMeter(); SK.hold(); GS.sack=0; await SK.dump(amt,{from:t0,to:t0+amt,lift}); GS.ksteals=0; setSpinsMeter(); },
 gain:async(a,n)=>{ const SK=window.bpSack; if(!SK) return; for(let i=0;i<(n||1);i++){ SK.hold(); GS.sack=(GS.sack||0)+a; GS.ksteals=(GS.ksteals||0)+1; setSpinsMeter(); SK.gain(a,centroidOf([[2,2],[2,3],[3,2]])); await SK.idle(); } }, intro:()=>window.bpSack&&window.bpSack.intro(true) };
window.bpTime.ex={SACK_N,DUMP_SPINS:BONUS.dumpSpins,bonusScene,sleep,anim,animA,tweenResult,setResult,hudFit,hudUpdate,hudBuild,pitch:()=>LAYER&&GEO?pitch():0,react,special,wlLayer,wlPlace,wlFade,clipCue,dialogOpen,roccoPoint,fxGeo,K,SKV,bet,rnd,clamp,syncHUD,save}; // всё, что нужно sack.js (мешок «Кухни»); sack.js грузится после ui.js
{ const fx=q.get('fx'); if(fx&&!q.get('screen')&&window.bpFx[fx]){ let n=0; const go=async()=>{ if(!document.getElementById('field')||!BOARD) return setTimeout(go,500); try{ await window.bpFx[fx](...({punch:[++n,0,8],toss:[++n,3],dump:[++n]}[fx]||[++n])); }catch(e){ console.error(e); } setTimeout(()=>{ restoreBoard(); setTimeout(go,1500); },2200*K()+800); }; setTimeout(go,2500); } }
})();

// ---------- социальный режим stake.us (2026-10-09): запрещённые слова Engine → замены, суммы без «$» в SC ----------
// В настоящей игре это отдельный языковой файл sweeps_en; здесь — проверочный слой поверх всех текстов, aria-label, title и alt.
(()=>{
 let on=false; try{ on=new URLSearchParams(location.search).get('social')==='1'; sessionStorage.removeItem('bp-social'); }catch(e){}
 window.bpSocialToggle=()=>{ const u=new URL(location.href); if(on) u.searchParams.delete('social'); else u.searchParams.set('social','1'); location.href=u.toString(); };
 window.bpSocial=on; if(!on) return;
 const MAP=[['buy bonus','get bonus'],['bonus buys','bonuses'],['bonus buy','bonus'],['total bet','total play'],['paytable','win table'],['payouts','wins'],['payout','win'],['pays out','wins'],['pays','wins'],['paid','won'],['pay','win'],
  ['bets','plays'],['betting','playing'],['bet','play'],['bought','instantly triggered'],['buy','get'],['purchase','play'],['price','for'],['costs','plays for'],['cost','play'],['money','coins'],['cash','coins'],['wager','play'],['gamble','play'],['credit','balance'],['deposit','get coins'],['currency','token'],['stake','play amount']];
 const re=new RegExp('\\b('+MAP.map(m=>m[0]).join('|')+')\\b','gi'), dict=Object.fromEntries(MAP);
 const fix=t=>t.replace(re,w=>{ const r=dict[w.toLowerCase()]; return w===w.toUpperCase()?r.toUpperCase():w[0]===w[0].toUpperCase()?r[0].toUpperCase()+r.slice(1):r; })
  .replace(/\$\s?(\d[\d,]*(?:\.\d+)?)/g,'$1 SC');
 window.bpSocialFix=fix; // шоу большого выигрыша (bigwin-show.js) разбирает сумму по ячейкам и тоже должно уйти в SC
 const walk=root=>{ const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n; while((n=tw.nextNode())){ if(n.parentElement&&(/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)||n.parentElement.closest('[data-raw]'))) continue; const v=fix(n.nodeValue); if(v!==n.nodeValue) n.nodeValue=v; }
  (root.querySelectorAll?root:document).querySelectorAll('[aria-label],[title],[alt]').forEach(e=>['aria-label','title','alt'].forEach(a=>{ const v=e.getAttribute(a); if(v){ const f=fix(v); if(f!==v) e.setAttribute(a,f); } })); };
 let busy=false; const run=()=>{ if(busy) return; busy=true; walk(document.body); busy=false; };
 new MutationObserver(()=>{ if(!busy) queueMicrotask(run); }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt']});
 run();
 const tag=el('div',null,'SOCIAL MODE · stake.us'); tag.dataset.raw='1'; // подпись макета, не текст игры Object.assign(tag.style,{position:'fixed',left:'50%',bottom:'4px',transform:'translateX(-50%)',zIndex:250,padding:'2px 10px',borderRadius:'999px',background:'#3FC8C0',color:'#06201f',font:'700 11px var(--ui)',letterSpacing:'.1em',pointerEvents:'none'}); document.body.append(tag);
})();
// кнопки пульта не забирают фокус от мыши — иначе браузер рисует жёлтую обводку фокуса (клавиатура по-прежнему работает)
document.addEventListener('mousedown',e=>{ const a=document.activeElement; if(a&&a!==document.body&&a.closest&&a.closest('#pod,#features')) a.blur(); // клик мышью снимает фокус клавиатуры — обводка не «зависает»
 if(e.target.closest('#pod button,#pod [role="button"],#features')) e.preventDefault(); },true);

// ---------- живой фон (владелец 2026-10-10): лампы мигают, автоматы и мониторы живут, свет иногда «проседает» ----------
(()=>{
 const HALL_BULBS=[[136, 7], [156, 10], [1199, 16], [119, 23], [1387, 28], [1193, 30], [1210, 33], [1400, 35], [1466, 34], [322, 39], [1454, 42], [1340, 56], [1410, 59], [1460, 56], [324, 55], [41, 59], [171, 71], [317, 75], [1404, 75], [348, 81], [1264, 86], [376, 88], [1190, 91], [209, 91], [305, 95], [385, 99], [1419, 99], [336, 102], [252, 105], [1131, 116], [1084, 118], [450, 119], [404, 121], [1297, 124], [1280, 131], [1380, 136], [480, 142], [1455, 139], [331, 149], [1383, 155], [413, 152], [1025, 154], [1261, 155], [1060, 169], [1202, 170], [475, 174], [454, 181], [1253, 184], [1203, 188], [489, 186], [1453, 183], [1515, 185], [1306, 187], [1006, 195], [537, 196], [1280, 209], [1072, 197], [1315, 202]];
 const SZ={hall:[1536,1024],kitchen:[1672,941],cameras:[1536,1024]};
 // координаты — в отражённой картинке (как видит игрок); для «Камер» — в исходной (там фон двигается вместе с проёмом)
 const SPOTS={
  hall:[{t:'exit',x:292,y:248,w:34,h:20},{t:'stage',x:1180,y:120,w:330,h:260}], // владелец 2026-10-10: без ламп на потолке и без анимации автоматов
  kitchen:[{t:'tube',x:770,y:8,w:50,h:60},{t:'oven',x:135,y:175,w:115,h:70},{t:'red',x:358,y:150,w:22,h:22},{t:'red',x:642,y:150,w:22,h:22},
           {t:'mist',x:1360,y:120,w:130,h:520}],
  cameras:[           {t:'lamp',x:1536-1300,y:585,r:120},{t:'lampfl',x:100,y:470,w:160,h:170},{t:'led',x:150,y:290},{t:'led',x:1468,y:288},{t:'led',x:152,y:480},{t:'led',x:1470,y:482}]};
 function map(){ const W=innerWidth,H=innerHeight; if(W<=H) return null; const [IW,IH]=SZ[scene];
  const bg=document.getElementById('bg'), cs=getComputedStyle(bg);
  if(scene==='cameras'){ const sz=cs.backgroundSize.split(' ').map(parseFloat), ps=cs.backgroundPosition.split(' ').map(parseFloat); const sc=sz[0]/IW;
   const flip=bg.style.transform.includes('-1'); return {sc,flip,pt:(x,y)=>[flip?W-(ps[0]+x*sc):ps[0]+x*sc, ps[1]+y*sc]}; }
  const sc=Math.max(W/IW,H/IH), ox=(W-IW*sc)/2, oy=(H-IH*sc)/2; return {sc,pt:(x,y)=>[ox+x*sc,oy+y*sc]}; }
 function liveBG(){
  document.getElementById('bgfx')?.remove(); if(!SPOTS[scene]) return; const M=map(); if(!M) return;
  const fx=el('div'); fx.id='bgfx'; document.getElementById('app').prepend(fx);
  const box=(cls,x,y,w,h)=>{ const [a,b]=M.pt(x,y), [c,d]=M.pt(x+w,y+h); const e=el('i',cls); Object.assign(e.style,{left:Math.min(a,c)+'px',top:b+'px',width:Math.abs(c-a)+'px',height:(d-b)+'px'}); fx.append(e); return e; };
  if(false) HALL_BULBS.forEach(([x,y],k)=>{ const [a,b]=M.pt(x,y); const e=el('i','bulb'); const r=Math.max(10,26*M.sc); Object.assign(e.style,{left:(a-r/2)+'px',top:(b-r/2)+'px',width:r+'px',height:r+'px',animationDelay:(-(k*1.37)%9).toFixed(2)+'s',animationDuration:(6+(k*7)%5)+'s'}); if(k%5===0) e.classList.add('weak'); fx.append(e); });
  for(const s of SPOTS[scene]){
   if(s.quad){ const pts=s.quad.map(([x,y])=>M.pt(x,y)), xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]), bx=Math.min(...xs), by=Math.min(...ys), bw=Math.max(...xs)-bx, bh=Math.max(...ys)-by;
    const c=document.createElement('canvas'); c.className='static'; c.width=64; c.height=48; Object.assign(c.style,{left:bx+'px',top:by+'px',width:bw+'px',height:bh+'px',clipPath:`polygon(${pts.map(([x,y])=>`${((x-bx)/bw*100).toFixed(1)}% ${((y-by)/bh*100).toFixed(1)}%`).join(',')})`}); fx.append(c); continue; }
   if(s.t==='lamp'){ const [a,b]=M.pt(s.x,s.y), r=s.r*M.sc*2; const e=el('i','lampglow'); Object.assign(e.style,{left:(a-r/2)+'px',top:(b-r/2)+'px',width:r+'px',height:r+'px'}); fx.append(e); continue; }
   if(s.t==='led'){ const [a,b]=M.pt(s.x,s.y), r=Math.max(4,8*M.sc); const e=el('i','led'); Object.assign(e.style,{left:(a-r/2)+'px',top:(b-r/2)+'px',width:r+'px',height:r+'px',animationDelay:(-(s.x%7)/2)+'s'}); fx.append(e); continue; }
   if(s.t==='mon'||s.t==='lampfl'){ const e=box(s.t==='mon'?'monfx':'lampfl',s.x,s.y,s.w,s.h); const u=bpvT`url(${A}fx/${s.t==='mon'?'mon'+s.k:'lamp'}.png)`; e.style.webkitMaskImage=e.style.maskImage=u; e.style.webkitMaskSize=e.style.maskSize='100% 100%'; if(M.flip) e.style.transform='scaleX(-1)';
    if(s.t==='mon'){ const c=document.createElement('canvas'); c.width=56; c.height=48; e.append(c); } continue; }
   box(s.t,s.x,s.y,s.w,s.h);
  }
  // шум на мониторах — 12 кадров в секунду
  const cs=[...fx.querySelectorAll('.monfx canvas')];
  if(cs.length&&!RM()){ let t=0; const tick=now=>{ if(!document.body.contains(cs[0])) return; if(now-t>80){ t=now; for(const c of cs){ const g=c.getContext('2d'), d=g.createImageData(c.width,c.height); for(let i=0;i<d.data.length;i+=4){ const v=Math.random()*255; d.data[i]=v*.6; d.data[i+1]=v; d.data[i+2]=v*.9; d.data[i+3]=255; } g.putImageData(d,0,0); } } requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
 }
 const _r=render; render=function(){ _r(); liveBG(); }; liveBG();
})();

// ---------- Рокко в полный рост (зал и кухня) ----------
// Ролики анфас/3-4 (1280×720, 5 с): все начинаются и кончаются в одной позе покоя. Тело в них повёрнуто к правому краю экрана, а поле слева, поэтому
// ролики показываются ЗЕРКАЛЬНО (владелец 2026-10-10, вариант 2): он смотрит на поле. Действия в сторону поля (удар, бросок билета, высыпание мешка)
// в зеркале ушли бы ОТ поля, они играют без отражения: торс совмещён с торсом зеркального покоя, смена — наплыв нового ролика поверх прежнего (XF мс).
(()=>{
 let timer=null, watchT=null; const {K,RM,GS,warmQ,fast,readyV,seekV,vcue}=window.bpTime;
 const SW_=1280, SH_=720, TX=952; // кадр роликов и ось торса в них (исходные пиксели; у всех роликов поза покоя одна)
 const TRICK=new Set(['R-throw','R-slam','R-breaker','K-dump']); // трюки: ролик играет при любой скорости (но не ускоряется)
 const wallAt=(sg,t)=>{ let ms=0,a=0; for(const [e,r] of sg){ const b=Math.min(t,e); if(b>a){ ms+=(b-a)/r*1000; a=b; } if(t<=e) break; } return ms; }; // мс (при нормальной скорости) от старта ролика до его времени t при скоростях sg=[[до_с,скорость],…]
 const MAPC={'R-grab':'swallow','R-grab2':'swallow','A-rub':'grab','R-throw':'throw','R-breaker':'lever','W-clap':'cheer','W-dance':'cheer','W-huge':'cheer','P-giggle':'cheer','R-slam':'punch','I-wave':'wave','I-mic':'mic','I-hat':'hat','I-look':'look','I-sway':'look','I-glitch':'look'};
 const {rcOld,PC}=window.bpTime.rc, HT=!rcOld('toss'); // новые ролики (см. rcOld в основном блоке)
 // Радость, хват и глотание 2026-10-11 (Kling v3.0 std, 24 к/с без «сдвоенных» кадров; asset-source/openrouter/video/hall-cheer3, hall-grab6-cut, hall-swallow4): H-cheer3, H-grab6, H-swallow4 вместо H-cheer, H-grab, H-swallow (?rclip=old или по одному ?rclip=cheer|grab|swallow возвращает прежние). H-grab6 снят с зеркального кадра покоя (рука тянется к полю): играет без отражения, как удар.
 const NEWC={...(rcOld('cheer')?{}:{cheer:'H-cheer3'}),...(rcOld('grab')?{}:{grab:'H-grab6'}),...(rcOld('swallow')?{}:{swallow:'H-swallow4',swallow2:'H-swallow4'})};
 // «подзывает и глотает» — моменты ролика (с) и рот в кадре (исходные px, ролик зеркалится): open — пасть начала раскрываться, shut — челюсть начала смыкаться, span — за сколько секунд после открытия прилетают символы. segs — прежние участки скорости (контроллер rocco-flow.js их не использует).
 // H-swallow4 (измерено по тёмному нутру рта на кадрах): 0–2,46 зовёт рукой с закрытым ртом, 2,50 пасть пошла, 2,58–4,04 раскрыта (рот по центру (964,229), нутро y 172–282), 4,08 челюсть смыкается за кадр, 4,12 закрыта, дальше жуёт. Прежний H-swallow: open 2,25, shut 3,08, рот (965,250).
 const SW=rcOld('swallow')?{segs:[[.45,3],[2,1.6],[9,1]],open:2.25,shut:3.08,span:.6,rB:1,mx:965,my:250}:{segs:[[99,1]],open:2.5,shut:4.08,span:1.2,rB:1,mx:964,my:234};
 // ---- ролик «Рокко поднимает мешок и трясёт» (?sackfx=rocco, sack.js) — СМЕННЫЙ: чтобы подключить другой ролик, достаточно новой записи здесь ----
 // file — файл без расширения в assets/rocco (WebM + .hevc.mp4, без отражения, торс как у остальных роликов); времена — секунды ролика (tools/clip_sack_track.py):
 //  appear — мешок впервые виден (Рокко поднимает его); pour — [начало, конец] высыпания: мешок висит горловиной вниз (тонкая струйка), потом тряска (основной поток); gone — мешок упал за кадр; done — Рокко в покое, можно начинать следующий ролик (удар);
 //  mouth — горловина мешка в кадре ролика [[с, x, y], …] (исходные px 1280×720, ролик без отражения): отсюда падают монеты, между точками линейно.
 //  Ролик собран tools/clip_sack_build.py из rocco-sackup1 + rocco-sackshake1 (8,67 с, 24 к/с; общий кадр «держит мешок вверх дном»), нейтральные окна — rocco-neutral.js (tools/rocco_neutral.py, ролик без отражения: UNM).
 const SACKCLIPS={
  roc1:{file:'KS-sackroc',appear:1.96,pour:[3.3,6.05],gone:6.9,done:8.3,
   mouth:[[2.917,714,607],[3.0,717,573],[3.083,718,555],[3.167,724,555],[3.25,727,558],[3.333,732,565],[3.417,738,574],[3.5,738,581],[3.583,735,581],[3.667,730,581],[3.75,726,581],[3.833,726,581],[3.917,725,582],[4.0,725,598],[4.083,733,616],[4.167,740,616],[4.25,740,568],[4.333,735,523],[4.417,692,523],[4.5,663,539],[4.583,677,573],[4.667,715,539],[4.75,688,512],[4.833,652,528],[4.917,619,556],[5.0,654,570],[5.083,702,523],[5.167,685,533],[5.25,665,543],[5.333,647,550],[5.417,701,579],[5.5,799,579],[5.583,805,559],[5.667,796,573],[5.75,708,597],[5.833,689,597],[5.917,679,556],[6.0,677,556],[6.083,673,621],[6.167,669,630],[6.25,639,630],[6.333,648,655]]}};
 const SACKCLIP=SACKCLIPS.roc1; window.bpSackClip=SACKCLIP;
 const CFG={
  hall:{pre:'H-',acts:['swallow','swallow2','grab','throw','lever','cheer','wave','mic','hat','look','punch','lean'],warm:['swallow','swallow2','cheer','throw','punch','lever','wave','look','paw'],file:{punch:PC.file,...NEWC,...(HT?{throw:'H-toss2'}:{})},unm:[...(HT?['punch']:['throw','punch']),...(NEWC.grab?['grab']:[])],map:MAPC,rand:['wave','hat','cheer','look'], // H-toss2 снят с той же позы, рука идёт ВПРАВО в кадре — в зеркале (как покой) это в сторону поля, поэтому он без «unm»
   hand:HT?[1175,265,false]:[1040,395,true],opt:{throw:{segs:HT?[[1.35,3],[2.5,1],[3.3,2],[9,1]]:[[.5,3],[9,1.5]]},punch:{segs:PC.segs}},throwAt:HT?2.1:1.92,leverAt:2.9,P:{feet:699,bodyH:640,rExt:160,lExt:119,reach:PC.reach,umR:PC.umR,t0:PC.t0,t1:PC.t1,t2:PC.t2,tf:PC.tf,dur:PC.dur,fy:PC.fy,fixed:!!PC.fixed}}}; // rExt — хвост справа от торса (зеркало), umR — правее торса в ролике удара без отражения, reach — торс → кулак при ударе; hand — рука с билетом в момент броска
 // Кухня (владелец 2026-10-11): мешок больше не стоит рядом с Рокко. Он прячется «под столом», мешок высыпают три варианта (?sackfx=paw|coins|rocco, sack.js); у «rocco» Рокко поднимает мешок роликом KS-sackroc (без отражения, как удар и бросок).
 // Раз мешка нет, Рокко на кухне тот же, что в зале: ролики H-* (swallow, cheer, look …), удар как в зале (H-punch4, PCL), размер, место и тень — как в зале (CFG.hall берётся по ссылке: что поправят у зала — поправится и здесь).
 // KS-handoff (владелец 2026-10-11): «Рокко кладёт руку за экран СПРАВА, забрав микрофон в другую руку, а возвращает руку, когда лапа уходит со слота; лицо двоиться не должно». Он перекладывает микрофон из правой руки в левую, правая рука уходит вправо за край экрана, лапа работает на слоте, рука возвращается и берёт микрофон назад. Ролик без отражения (как удар), только целые кадры Kling, времена (с ролика) — creative-studio/assets/rocco/KS-handoff.timings.json (tools/clip_handoff_build.py):
 // cue — рука вышла за край кадра (кисть за краем экрана на всех раскладках), можно поднимать лапу; out — рука у края кадра; back — рука начинает возвращаться (лапа в это время начинает уходить: «держит» 4,2 с); rest — микрофон снова в правой руке, поза покоя (нейтральный хвост, rocco-neutral.js: es); length — длина ролика.
 const HANDOFF={file:q.get('hoclip')||'KS-handoff',cue:2.642,out:2.542,back:6.75,rest:9.04,length:9.208,ready:q.get('handoff')!=='0'}; window.bpHandoffClip=HANDOFF; // ?handoff=0 — без ролика Рокко (лапа одна), ?hoclip=имя — другой ролик для проверок
 // Ролики оживления (rocco-alive.js, fb/rocco-alive 2026-10-12): H-lean (подаётся к полю: предвкушение, «выглядывает») — в зале и на кухне; KS-sniff (нюхает воздух), KS-rub (потирает живот) — только кухня. Пожатие плеч (H-shrug), кивок (H-nod) и «облизывает палец» (KS-lick) не получились у Kling (глаза чернеют, рука тает) — режиссёр их пропускает, пока нет файлов. Их не запускает игра: просит режиссёр, и только если файл успел загрузиться.
 const HALL_ESSENTIAL=['swallow','cheer','throw','punch','lever']; // нужны сразу: глотание (любой выигрыш), радость, бросок билета, удар, рычаг (ворота первого спина, loadgate.js)
 CFG.kitchen={...CFG.hall,acts:[...CFG.hall.acts,'sackpull','handoff','sniff','rub'],warm:['swallow','swallow2','punch','cheer','throw','lever','wave','look','paw'],file:{...CFG.hall.file,sackpull:SACKCLIP.file,handoff:HANDOFF.file,sniff:'KS-sniff',rub:'KS-rub'},unm:[...CFG.hall.unm,'sackpull','handoff'],map:{...MAPC,'K-dump':'sackpull','K-handoff':'handoff'},opt:{...CFG.hall.opt,sackpull:{segs:[[99,1]]},handoff:{segs:[[99,1]]}}}; // sackpull — ролик KS-sackroc (?sackfx=rocco); в общий прогрев не входит (1,3 МБ): sack.js просит его сам первой кражей четвёрки (window.roccoWarm)
 // Мелкие жесты оживления (fb/rocco-gestures 2026-10-12, rocco-alive.js «GESTURES»): H-sway «покачивается под музыку» — зал и кухня (файлы H-<имя>, как у H-lean); просит их только режиссёр, нет файла — пропускается.
 for(const s of [CFG.hall,CFG.kitchen]) s.acts=[...s.acts,'sway','rock','belly']; // rock (H-rock) — «качается из стороны в сторону», belly (H-belly) — «гладит живот и злится: голодный» (fb/gestures2 2026-10-12)

 // ---- размер и место Рокко (владелец 2026-10-11: «мелкий, прижат к правому нижнему углу») ----
 // Варианты (?rocco=a|b|c, основной a — владелец 2026-10-11: «то что стало, но чуть крупнее»; прежний a — a0): h — рост от высоты окна, ov — на сколько кулак при ударе может зайти за рамку поля (в клетках), m — отступ справа (доля ширины), fl — ноги выше нижнего края (доля высоты).
 // Правило: Рокко стоит в свободной зоне справа от поля так, чтобы кулак доставал до рамки (торс на «длине руки» от неё), а целиком он, с хвостом или мешком, влезал в экран с отступом; рост — меньший из «доли высоты» и «что влезает по ширине».
 // 2026-10-12 (fb/rocco-fix, «маскот сдвинут вправо»): отступ справа m .016→.035 (хвост был в 23 px от края при ширине 1440, торс — на 90% ширины; теперь ≈50 px, Рокко ~9% меньше в 1440×900)
 const RV={a:{h:.74,ov:.55,m:.035,fl:.034},a0:{h:.68,ov:.3,m:.02,fl:.04},b:{h:.8,ov:.9,m:.012,fl:.025},c:{h:.56,ov:0,m:.04,fl:.055}};
 const fistRail=f=>{ const sl=document.getElementById('symlayer'), rail=sl?Math.max(0,f.right-sl.getBoundingClientRect().right):12; return f.right-rail*.5; }; // экранный x середины правой рамки поля — сюда кладётся кончик кулака в ударе
 function layout(cf,f,W,H,land,V){
  const P=cf.P, ext=P.lExt+P.rExt, pod=document.getElementById('pod'), pb=pod&&pod.getBoundingClientRect(), side=land&&pb&&pb.left>f.right-10; // side — телефон боком: пульт столбцом справа от поля
  const hudB=[...document.querySelectorAll('#hud > *')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0);
  if(land&&!side){ // обычный экран: зона справа от поля
   const ps=f.width/6.35, m=Math.max(10,V.m*W), Z=W-f.right, rIn=P.rExt*(1-(P.rOff||0)), extIn=P.lExt+rIn; // rOff — какая доля хвоста/мешка может уйти за правый край (кухня: мешок частично за кадром, владелец 2026-10-11 «на кухне тоже чуть крупнее»)
   const ov=window.bpRoccoOv||0; // ov — на сколько px ролика правый край Рокко (хвост) заходит за линию отступа m: узкая раскладка index.html roccoSides() выносит хвост за экран, чтобы поле стояло по центру окна; 0 — всё в экране
   const Lmin=Math.max(f.right-.1*ps,pb?pb.right+4:0), fx=P.fixed?fistRail(f):0; // fixed (H-punch5): кулак встаёт на середину правой рамки с места, без сдвига Рокко в ударе: торс на «длине руки» от неё, а если справа не хватает места (тело и хвост в экране с отступом m) — Рокко делаем меньше
   if(P.fixed){ const sc=Math.min(V.h*H/P.bodyH,(W-(P.rOff?0:m)-Lmin)/(extIn-ov),(W-(P.rOff?0:m)-fx)/(P.reach+Math.max(P.umR,rIn)-ov)); return {bh:sc*P.bodyH,Sb:fx+P.reach*sc,feetY:H*(1-V.fl),shadow:true,lim:W-2}; }
   const sc=Math.min(V.h*H/P.bodyH,(W-(P.rOff?0:m)-Lmin)/extIn,(Z+10+V.ov*ps)/(P.reach+P.umR)), Tmax=W-(P.rOff?0:m)-rIn*sc, Tid=f.right-12+P.reach*sc; // три предела: доля высоты; в покое целиком (с хвостом/мешком) в зоне справа от поля, кромку рамки закрыть можно чуть; в ударе (ролик без отражения: хвост/мешок слева, справа только тело) торс на «длине руки» от рамки и в экране, при нехватке места кулак заходит за рамку не больше ov клеток
   return {bh:sc*P.bodyH,Sb:Math.min(Tid,Tmax),feetY:H*(1-V.fl),shadow:true,lim:W-2}; }
  if(land){ // телефон боком: Рокко в просвете между полем и пультом, под окошками счётчиков
   const g0=f.right+4, g1=pb.left-4, feetY=H-6, topL=Math.max(6,...hudB.filter(r=>r.right>g0&&r.left<g1).map(r=>r.bottom+6));
   if(P.fixed){ const fx=fistRail(f), sc=Math.min(V.h*H/P.bodyH,(g1-fx)/(P.reach+Math.max(P.umR,P.rExt)),(feetY-topL)/P.bodyH); // кулак на середине правой рамки с места: торс на «длине руки» от неё, хвост до пульта; не помещается — Рокко меньше
    return {bh:sc*P.bodyH,Sb:fx+P.reach*sc,feetY,shadow:true,lim:g1}; }
   const sc=Math.min(V.h*H/P.bodyH,(g1-g0)/ext,(feetY-topL)/P.bodyH);
   return {bh:sc*P.bodyH,Sb:g0+P.lExt*sc+((g1-g0)-ext*sc)/2,feetY,shadow:true,lim:g1}; }
  // телефон стоя: Рокко на верхней кромке поля справа от множителя
  const bd=document.querySelector('#alt > *'), br=bd&&bd.getBoundingClientRect(), g0=Math.max(br?br.right+6:W*.62,hudB.length?Math.max(...hudB.map(r=>r.right))+6:0), g1=W-4, feetY=f.top+2;
  const sc=Math.min((g1-g0)/ext,(feetY-8)/P.bodyH,W*.62/P.bodyH);
  return {bh:sc*P.bodyH,Sb:g0+P.lExt*sc+((g1-g0)-ext*sc)/2,feetY,shadow:false,lim:W-2}; }
 // Где Рокко стоит в зале/«Кухне» (экранные px) — тот же расчёт, что в mount(), но без роликов и без оглядки на ?screen=…: по этому месту экран большого выигрыша (bigwin-show.js, bigwin-rocco.js) ставит Рокко ровно туда же, где он стоит в игре (владелец 2026-10-11: «тот же Рокко отреагировал, а не новый выскочил»).
 // null — в этой сцене Рокко нет («Камеры») или он не помещается (телефон стоя, если места нет).
 window.roccoHallPlace=()=>{ const cf0=CFG[scene], field=document.getElementById('field'); if(!cf0||!field) return null;
  const f=field.getBoundingClientRect(), W=innerWidth, H=innerHeight; if(!f.width||!f.height) return null;
  const {bh,Sb,feetY,shadow}=layout(cf0,f,W,H,W>H,RV[(q.get('rocco')||'a').toLowerCase()]||RV.a); if(!(bh>=60)) return null;
  const s=bh/cf0.P.bodyH, P=cf0.P; return {Sb,feetY,s,bh,shadow,land:W>H,box:{l:Sb-P.lExt*s,r:Sb+P.rExt*s,t:feetY-P.bodyH*s,b:feetY}}; };
 function mount(){
  clearTimeout(timer); clearInterval(watchT); if(window.__roccoFlow){ window.__roccoFlow.destroy(); window.__roccoFlow=null; } // render() стирает весь #app, прежний контроллер останавливаем
  document.getElementById('krocco')?.remove(); const old=document.getElementById('rocco'); if(old) old.style.display='';
  window.roccoPlay=null; window.roccoRun=null; window.roccoHandoff=null; window.roccoWarm=null; window.roccoSwallow=null; window.roccoAnchor=null; window.roccoKey=null; window.roccoLag=null; window.roccoLagMs=null; window.roccoReady=null; window.roccoRestIn=null; window.roccoHush=null;
  const cf0=CFG[scene];
  if(cf0&&q.get('screen')==='welcome'&&window.BPLoad&&!RM()&&!window.__wprefetch){ window.__wprefetch=1; // fb/perf: пока игрок читает приветствие, ролики зала докачиваются в кэш браузера (по одному, с низким приоритетом): после PLAY они на месте
   try{ const nm=['idle',...HALL_ESSENTIAL]; BPLoad.prefetch(nm.map(n=>{ const u=clip(cf0.file[n]||(cf0.pre+n.replace(/2$/,''))); return window.bpvFix?window.bpvFix(u):u; }),200); }catch(e){} }
  if(!cf0||q.get('screen')){ if(window.BPLoad) BPLoad.seal('rocco'); return; }
  const cf={...cf0,opt:Object.fromEntries(cf0.acts.map(n=>[n,{...cf0.opt[n],segs:RoccoFlow.segsOf(cf0.file[n]||(cf0.pre+n.replace(/2$/,'')))}]))}; // скорость роликов всегда ×1 (rocco-flow.js): заданные в CFG участки ×1,5…×3 сняты; segsOf даёт только «пропуск» неподвижной головы (скорость ∞ на невидимом начале), wallAt(cf.opt.*.segs) считает ожидание по нему
  const field=document.getElementById('field'), app=document.getElementById('app'); if(!field) return;
  const f=field.getBoundingClientRect(), W=innerWidth, H=innerHeight, land=W>H, P=cf.P;
  const {bh,Sb,feetY,shadow,lim}=layout(cf,f,W,H,land,RV[(q.get('rocco')||'a').toLowerCase()]||RV.a);
  if(bh<60) return;
  const s=bh/P.bodyH, Wf=SW_*s, F=SH_*s; // Sb — экранный x оси торса (одинаков у зеркальных и прямых роликов)
  const left=Sb-(SW_-TX)*s, top=feetY-P.feet*s, umx=(SW_-2*TX)*s; // umx — сдвиг роликов без отражения (их торс на TX, у зеркальных на SW_-TX)
  const file=n=>cf.file[n]||(cf.pre+n.replace(/2$/,''));
  const mk=n=>n==='idle'?`<video class="ks idle" data-n="idle" src="${clip(file(n))}" muted playsinline preload="auto" ${RM()?'':'autoplay loop'}></video>`:`<video class="ks ak${cf.unm.includes(n)?' um':''}" data-n="${n}" data-src="${clip(file(n))}" ${cf.unm.includes(n)?`style="left:${umx.toFixed(1)}px"`:''} muted playsinline preload="none"></video>`; // ролики действий не грузятся вместе со страницей: по очереди после первого кадра покоя (warmQ) или при первом запуске
  const sh=shadow?`<i class="kr-sh" style="left:${((SW_-TX+(P.rExt-P.lExt)/2-(P.lExt+P.rExt)*.575)*s).toFixed(1)}px;top:${((P.feet-18)*s).toFixed(1)}px;width:${((P.lExt+P.rExt)*1.15*s).toFixed(1)}px;height:${(40*s).toFixed(1)}px"></i>`:''; // мягкая тень на полу под ногами (и мешком)
  const idle2Html=!RM()&&q.get('idle2')!=='0'?`<video class="ks idle2" data-n="idle2" data-src="${clip(file('idle'))}" style="opacity:0" muted playsinline preload="none" loop></video>`:''; // второй экземпляр покоя (rocco-flow.js: смена кругов без перемотки на виду); ?idle2=0 — как раньше, один покой с loop
  const k=el('div',null,`${sh}<div class="kr-body">${mk('idle')}${idle2Html}${cf.acts.map(mk).join('')}</div>`); k.id='krocco';
  Object.assign(k.style,{position:'absolute',left:left+'px',top:top+'px',width:Wf+'px',height:F+'px',zIndex:6});
  app.append(k); if(old) old.style.display='none';
  window.roccoBox=()=>({l:Sb-P.lExt*s,r:Sb+P.rExt*s,t:feetY-P.bodyH*s,b:feetY,s,bh,Sb}); // для проверки раскладки (тело в покое, без роликов действий)
  const idle=k.querySelector('.idle'), idle2=k.querySelector('.idle2'), act={}; k.querySelectorAll('.ak').forEach(v=>act[v.dataset.n]=v); const all=[idle,...Object.values(act)];
  const wake=v=>window.bpTime.loadClip(v); if(idle2){ const go=()=>wake(idle2); if(idle.readyState>=3&&idle.currentTime>0) go(); else { idle.addEventListener('playing',go,{once:true}); setTimeout(go,4000); } } // второй покой грузим после того, как заиграл первый: первый кадр Рокко (его ждёт шторка) не должен делить канал с ним
  // fb/perf: ролики, нужные в первых спинах (глотание, радость, бросок, удар, рычаг), качаем сразу и с высоким приоритетом, до звуков и роликов Big Win; первый Play ждёт их (loadgate.js)
  if(window.BPLoad){ if(!RM()){ [...new Set(HALL_ESSENTIAL.map(n=>file(n)))].forEach(f=>{ const url=clip(f); BPLoad.need('rocco',window.bpTime.clipBlob(window.bpvFix?window.bpvFix(url):url,true)); }); } BPLoad.seal('rocco'); } // адрес — как у data-src ролика (в сборке артефакта к нему дописан ?bpv=…): один файл — один запрос
  warmQ(k,idle,[...cf.warm],n=>n==='paw'?(window.pawWake&&window.pawWake()):wake(act[n]));
  // точки на экране: x зеркального ролика = left+(кадр-x)*s, прямого = left+umx+x*s
  let kRc=null; const pt=(x,y,um)=>{ if(!kRc){ kRc=k.getBoundingClientRect(); requestAnimationFrame(()=>{ kRc=null; }); } const b=kRc; return [b.left+(um?umx+x*s:(SW_-x)*s),b.top+y*s]; }; // рамка ролика читается один раз за кадр: коллект спрашивает рот по разу на каждый символ, и каждый раз браузер пересчитывал раскладку (29 раз за кражу)
  window.roccoAnchor=kind=>kind==='hand'?pt(...cf.hand):pt(SW.mx,SW.my,false);
  window.roccoUmPt=(x,y)=>pt(x,y,true); window.roccoScale=()=>s; // точка (x,y) кадра ролика без отражения (исходные px 1280×720) → экран; масштаб кадра (экранных px на px кадра)
  window.roccoKey=n=>{ if(fast()) return 0; const ms=n==='R-throw'?wallAt(cf.opt.throw?.segs||[[99,1]],cf.throwAt):n==='R-slam'?wallAt(cf.opt.punch.segs,P.t0*P.dur/1000):n==='K-dump'?wallAt(cf.opt.sackpull?.segs||[[99,1]],SACKCLIP.pour[0]):n==='R-breaker'?wallAt(cf.opt.lever?.segs||[[99,1]],cf.leverAt):0; return (ms+flow.lagMs())/Math.max(.05,K()); }; // + ожидание нейтрального окна прежнего ролика (flow.lagMs). Ролик идёт в реальном времени (в Turbo не ускоряется), а sleep() умножает на K — поэтому делим: ждать ровно столько, сколько до этого кадра ролика на самом деле // K-dump: монеты из мешка сыплются с SACKCLIP.pour[0] с ролика
  window.roccoAfter=(name,t)=>new Promise(res=>{ if(name==='K-dump') t=SACKCLIP.done; else if(name==='K-handoff') t=HANDOFF.rest; const n0=cf.map[name]||name, c0=flow.cur(), p0=flow.pend(), R=c0&&c0.n===n0?c0:p0&&p0.n===n0?p0:null, w0=performance.now(); if(!R) return res(); const chk=()=>{ if(!flow.alive(R)||fast()||R.v.currentTime>=t||performance.now()-w0>(6000+flow.lagMs())*(window.__slow||1)) res(); else setTimeout(chk,30); }; chk(); }); // ждать, пока идущий (или стоящий в очереди) ролик name дойдёт до времени t (с) // «ключевой момент» ролика: бросок билета, удар (мс для sleep(), см. roccoKey)
  // ---- ролики: контроллер rocco-flow.js — смена только в нейтральных моментах (по показанному кадру), очередь, скорость всегда ×1 (неподвижная голова пропускается), покой без шва круга (idle2) ----
  const flow=RoccoFlow.make({idle,idle2,act,K,RM,fast,wake,readyV,seekV,isOn:()=>k.isConnected}); window.__roccoFlow=flow; window.roccoRestIn=()=>flow.restIn(); window.roccoHush=()=>flow.hush(); window.roccoReady=()=>flow.ready; window.roccoLagMs=()=>flow.lagMs(); window.roccoLag=()=>flow.lagMs()/Math.max(.05,K());
  const onPunch=R=>{ const v=R.v; if(!land||RM()||P.fixed) return; // fixed (H-punch5, владелец 2026-10-11: «чтоб он не отодвигался вправо для удара»): Рокко стоит на месте, сдвига нет — layout() сразу поставил его так, что кулак ложится на рамку. Прежние ролики: кулак ровно в середину правой рамки (владелец 2026-10-11: «бьёт по слоту, а не по рамке»): если не достаёт — весь Рокко подаётся к полю; если заходит за рамку — на замахе отступает вправо, при нехватке места спина может на миг уйти за край экрана (до 60% правой стороны тела)
   const sl=document.getElementById('symlayer'), rail=sl?Math.max(0,f.right-sl.getBoundingClientRect().right):12, fistX=Sb-P.reach*s, need=f.right-rail*.5-fistX, dx=need<0?need:Math.min(need,Math.max(0,lim-(Sb+P.umR*s))+P.umR*s*.6);
   if(dx){ const T=P.dur/1000, a=(P.t0-.1)*T, b=P.t0*T, c=P.t1*T, d=P.t2*T, ez=x=>x<=0?0:x>=1?1:x*x*(3-2*x); let stop=false; // сдвиг идёт по времени самого ролика (currentTime), а не по часам: кулак встаёт на рамку ровно в кадр контакта, даже если ролик запустился с задержкой
    const mv=()=>{ if(stop||R.over){ k.style.transform=''; return; } const t=v.currentTime, e=t<b?ez((t-a)/(b-a)):t<c?1:1-ez((t-c)/(d-c)); k.style.transform=e?`translateX(${(dx*e).toFixed(1)}px)`:''; requestAnimationFrame(mv); };
    R.anim={cancel(){ stop=true; k.style.transform=''; }}; mv(); } };
  const run=(n,o)=>flow.play(n,{...o,onStart:n==='punch'?onPunch:null}); // R: {n,v,started,done,over,end(),trick}
  window.roccoPlay=(name,force)=>{ const n=cf.map[name]||(cf.acts.includes(name)?name:null); if(!n) return false;
   if(K()<1&&!force&&!TRICK.has(name)) return true; // Turbo/Quick/удержание Space (и пропуск, и «меньше движения»): обычные реакции и кражи роликами не играем, Рокко спокойно стоит; «обработано» = true, старого Рокко не зовём
   const R=run(n,{...cf.opt[n],force:!!force}); R.trick=TRICK.has(name); window.roccoRun=R; return true; }; // roccoRun — последний запрос ролика (R.started — пошёл ли; R.end() — отказаться): по нему sack.js понимает, что ролик Рокко пошёл
  window.roccoWarm=n=>{ const v=act[n]; if(v) wake(v); }; // загрузить ролик действия заранее (не входит в общий прогрев)
  window.roccoKitchenWake=()=>{ if(!flow.busy()&&K()>=1){ const n=cf.rand[(Math.random()*cf.rand.length)|0]; run(n,cf.opt[n]); } };
  // «подзывает и глотает» (ролик H-swallow4, моменты и рот — константа SW выше): рука зовёт с закрытым ртом до 2,5 с, пасть раскрыта 2,5–4,08 с, символы прилетают в окно [open+.06…open+.06+span], челюсть смыкается на shut, дальше жуёт. null — роликов нет (расчёт без анимаций, «меньше движения»)
  window.roccoSwallow=()=>{ if(RM()||K()<1||!k.isConnected||window.__sim) return null; // в Turbo/Quick на обычных кражах ролика нет — поле забирает символы само (запасной путь steal)
   const c0=flow.cur(), n=c0&&c0.n==='swallow'?'swallow2':'swallow'; if(!act[n]) return null; // идёт жевание прошлого — второй экземпляр ролика, ждёт нейтрального окна прежнего (цепочка выигрышей)
   const R=run(n,{segs:SW.segs}), S=vcue(R.v,null);
   S.mouth=()=>pt(SW.mx,SW.my,false); S.open=SW.open; S.shut=SW.shut; S.span=SW.span; S.rB=SW.rB;
   S.ready=R.started.then(ok=>{ if(ok) S.go(); else S.stop(); return ok; }); R.done.then(()=>S.stop());
   S.cancel=()=>{ S.stop(); if(!R.live) R.end(); }; // запрос ещё не пошёл (ждёт очереди или грузится) — отменить; пошедший ролик не обрывается
   return S; };
  // «Рокко отдаёт руку лапе» (KS-handoff, владелец 2026-10-11): Рокко перекладывает микрофон в ближнюю к полю руку, свободная правая рука уходит ВПРАВО за край экрана («за экран»), и тут снизу из-за рамы поля поднимается лапа с мешком (sack.js, хуки лапы).
  // Лапа начала уходить — рука возвращается из-за правого края, Рокко берёт микрофон назад и встаёт в покой.
  // null — ролика не будет: Turbo/Quick (ролики Рокко не ускоряются, лапа одна), «меньше движения», Skip, расчёт без анимаций, и раскладки, где правый край коробки ролика не доходит до края экрана (рука оборвалась бы в воздухе):
  // планшет стоя (зазор считается по месту, не по списку раскладок); телефон боком — там справа от Рокко пульт, его поднимаем над Рокко на время ролика (рука уходит за пульт). Иначе {v, R, started, at(t), leave(), release(), end()}:
  // started — ролик пошёл (false — нет); at(t) — промис «ролик дошёл до времени t с»; leave() — лапа начала уходить (рука может возвращаться: ролик ждёт кадра возврата, если лапа ещё не ушла, или перескакивает к нему, если лапа ушла раньше);
  // release() — лапа уехала совсем (подчистка: пульт на место). Ролик не ускоряется; кадры не смешиваются (cut: наплыв rocco-flow = жёсткая смена в нейтральных позах).
  window.roccoHandoff=()=>{ if(!HANDOFF.ready||scene!=='kitchen'||!act.handoff||RM()||K()<1||fast()||window.__sim||!k.isConnected) return null;
   const v=act.handoff, vr=v.getBoundingClientRect(), gap=innerWidth-vr.right; let pod=null;
   if(gap>1){ const pe=document.getElementById('pod'), pb=pe&&pe.getBoundingClientRect(); if(!pb||pb.left>=vr.right-8||pb.right<innerWidth-40||pb.top>vr.top+vr.height*.3||pb.bottom<vr.top+vr.height*.7) return null; pod=pe; } // справа пульта нет — рука оборвётся в воздухе: ролика нет
   const R=run('handoff',{...cf.opt.handoff,cut:true}); if(!R||R.dead) return null;
   const S=vcue(v,null); let left=false, gated=false, done=false; const pz=pod&&pod.style.zIndex; R.started.then(ok=>{ if(ok){ S.go(); if(pod) pod.style.zIndex=8; } else S.stop(); }); R.done.then(()=>{ S.stop(); if(pod&&!done){ done=true; pod.style.zIndex=pz||''; } });
   const when=(t,fn)=>{ const t0=performance.now(), lp=()=>{ if(!R.alive()||performance.now()-t0>20000*(window.__slow||1)) return; if(v.currentTime>=t) fn(); else requestAnimationFrame(lp); }; lp(); };
   when(HANDOFF.back-.04,()=>{ if(!left&&!v.paused&&!fast()){ gated=true; v.pause(); } }); // лапа ещё не начала уходить, а ролик дошёл до возврата руки — стоп-кадр «держит», пока не придёт leave()
   const jump=()=>{ if(v.currentTime<HANDOFF.back-.12){ try{ v.currentTime=HANDOFF.back; }catch(e){} } }; // лапа ушла раньше, чем «держит» кончилось: резкий переход к кадру возврата (поза почти та же), а не наплыв — иначе лицо двоится
   const H={v,R,started:R.started,at:t=>new Promise(res=>{ if(!R.alive()) return res(); when(t,res); setTimeout(res,20000*(window.__slow||1)); }),end:()=>{ left=true; R.end(); },
    leave:()=>{ if(left) return; left=true; if(!R.alive()) return; if(gated){ gated=false; v.play().catch(()=>{}); } else if(v.currentTime>=HANDOFF.out) jump(); else when(HANDOFF.out,jump); },
    release:()=>{ H.leave(); if(pod&&!done){ done=true; setTimeout(()=>{ pod.style.zIndex=pz||''; },R.alive()?900:0); } }}; // пульт возвращаем, когда рука ушла от его края (≈0,9 с после возврата)
   return H; };
  window.roccoPunchImpact=()=>window.roccoKey('R-slam'); // мс при нормальной скорости (sleep умножает на K сам)
  window.roccoPunchAt=P.t0*P.dur/1000; window.roccoThrowAt=cf.throwAt; window.roccoLeverAt=cf.leverAt; // момент контакта кулака с рамкой и момент броска билета — секунды ролика; трюки в ui.js ждут их по currentTime ролика (не по таймеру)
  window.roccoPunchBack=P.t1*P.dur/1000; window.roccoPunchHome=P.t2*P.dur/1000; window.roccoPunchFree=P.tf?P.tf*P.dur/1000:0; // рука уходит от рамки / вернулась / кулак ушёл с рамки (если известно) — секунды ролика удара
  { const A0=window.roccoAnchor; window.roccoAnchor=kind=>kind==='fist'?pt(TX-P.reach,P.fy,true):A0(kind); window.roccoThrowMask=HT?{r:1195,dt:.05}:{l:775,dt:.22}; window.roccoThrowTrack=HT?window.bpThrowTrack:null; window.roccoClipPt=(x,y)=>pt(x,y,false); window.roccoClipScale=()=>s; } // кулак при ударе: кончик кулака в кадре ролика (x = ось торса − reach, y = P.fy); roccoThrowMask — часть кадра ролика (px), которую прячем после броска: {l:775} — левее (старый H-throw: билет летит смазанной полосой), {r:1195} — правее (H-toss2: клочки белой бумаги за кистью, летят в сторону поля)
  // Ролик не доигран — не обрываем скачком: «пропуск» (второй Play/Space) и новый спин в Turbo/Quick уводят его в покой плавным наплывом XC мс
  // ...теперь (владелец 2026-10-11, «все переходы плавные») ролик не обрывается вообще: он доигрывает движение в обычном темпе до нейтрального хвоста и сам уходит в покой (rocco-flow.js), новые ролики в это время не запускаются; watchT и XC убраны
  const loop=()=>{ timer=setTimeout(()=>{ if(!document.hidden&&!GS.spinning) window.roccoKitchenWake(); loop(); },15000+Math.random()*9000); }; // прежнее оживление (?alive=0 или нет rocco-alive.js): раз в 15–25 с случайный ролик из cf.rand
  // «Живой» Рокко (rocco-alive.js, владелец 2026-10-12: «как вкопанный»): режиссёр сам решает, когда и что сыграть (оживление раз в ≈6–12 с тишины, малые реакции на спин, предвкушение, промах, малые выигрыши); ролики просит у контроллера rocco-flow.js
  if(!RM()&&!(window.RoccoAlive&&RoccoAlive.attach({scene,GS,K,RM,fast,flow,act,cf,hungry:()=>modeOn==='hungry',run:n=>run(n,cf.opt[n]),warm:n=>{ const v=act[n]; if(v) wake(v); },isOn:()=>k.isConnected,dialogOpen:window.bpTime.ex?window.bpTime.ex.dialogOpen:()=>false}))) loop();
 }
 window.kitchenRocco=mount;
 const _r=render; render=function(){ _r(); mount(); }; mount();
})();
