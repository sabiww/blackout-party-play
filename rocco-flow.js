// Blackout Party — контроллер роликов Рокко в полный рост (2026-10-11, владелец: «все переходы — единым роликом, никакой рваности»).
// Макет, не игра. Данные — rocco-neutral.js (tools/rocco_neutral.py): для каждого ролика время h (кончается нейтральная голова), es/e (начинается «мягкий»/строгий нейтральный хвост) и расстояние кадров до позы покоя d[].
// Правила (подробнее — docs/ANIMATIONS.md, «Переходы»):
//  1. Ролик начинается и кончается в позе покоя, поэтому сшиваем только в нейтральные моменты: голова (до h) и хвост (с e; с es — «мягкий», растяжка подлиннее). Середина ролика — движение: в неё не входим и из неё не выходим.
//  2. Скорость роликов Рокко ВСЕГДА ×1 (владелец: «ролики Рокко никогда не ускоряются», 2026-10-12 — проверено замером playbackRate). Неподвижную голову ролика (Рокко стоит, как в покое) не прокручиваем быстрее, а пропускаем: ролик заранее
//     перематывается (скрытый, пока ждёт очереди) на кадр за 0,3 с до конца головы и показывается с него — жёсткая смена в одинаковых позах, без перемотки на ходу. Turbo/Quick/Skip скорость Рокко не меняют; segsOf() даёт участок «пропуск» (скорость ∞ только на невидимом начале), по нему ui.js считает ожидание.
//  3. Ролик ушёл в хвост (поза = покой) — отдаём покой (он всё время играет в петле) наплывом 2–6 кадров; хвост (0,4–0,9 с мёртвого покоя) не доигрываем.
//  4. Новый ролик, пока идёт прежний: ждёт нейтральное окно прежнего (очередь из одного места; важнее — трюк, потом глотание, потом реакция), не режет движение наплывом. Ждать дольше MAXW нельзя — запрос отклоняется (started=false), игра берёт запасной путь.
//  5. Новый ролик готовится заранее (загрузка, перемотка в 0), поэтому в нужный момент остаётся только play() и наплыв; показ — по первому показанному кадру (requestVideoFrameCallback).
//  6. Наплыв только между почти одинаковыми позами: длина 2…6 кадров по расстоянию d обеих поз; ролик не совмещён с покоем (al=0, другая ориентация) — 180 мс.
// API: RoccoFlow.make({idle,act:{имя:video},K,RM,fast,wake,readyV,seekV,isOn}) → {play(n,opt),cur(),pend(),busy(),lagMs(),alive(R),ready,destroy()}; RoccoFlow.segsOf(файл) — участки скорости для расчёта времени.
(()=>{
'use strict';
const FPS=24, FR=1000/FPS, SKIP_MARGIN=.3, SKIP_MIN=.25, SOFT_D=4, SOFT_F=1.2, CUT_D=3; // SOFT_F — и только пока доля пикселей силуэта с резким отличием от покоя (f, %: рот/зубы, глаза, шляпа — мелкие, но яркие детали, d их почти не видит) не больше 1,2 (2026-10-12: зубы жующего рта на d 4 давали двоение лица); SOFT_D — в «мягком» хвосте меняем ролик, только пока показанный кадр не дальше 4 от покоя (замер: на d 5–6 наплыв 2–3 кадра виден как двоение руки/челюсти; ждём кадр с d≤4, это 0,2–0,5 с); CUT_D — кадры ближе 3 к покою (зерно кодирования) меняем жёстко, без наплыва
const KIND={swallow:'swallow',swallow2:'swallow',throw:'trick',punch:'trick',lever:'trick',sackpull:'trick',handoff:'trick',grab:'react',cheer:'react',wave:'amb',mic:'amb',hat:'amb',look:'amb'};
Object.assign(KIND,{lean:'amb',shrug:'amb',nod:'amb',sniff:'amb',lick:'amb',rub:'amb'}); // ролики оживления (rocco-alive.js): как взмах и микрофон — не ждут нейтрального окна, уступают любому идущему ролику
Object.assign(KIND,{sway:'amb',rock:'amb',belly:'amb'}); Object.assign(KIND,{bowslide:'amb',bowtips:'amb',bowdust:'amb'}); // fb/bowtie3: «поправляет бант» // мелкие жесты оживления (fb/rocco-gestures): так же, как lean и rub
const PRIO={trick:3,swallow:2,react:1,amb:0}, MAXW={trick:5000,swallow:2600,react:1200,amb:0}; // сколько мс запрос ждёт нейтрального окна прежнего ролика
const data=f=>{ const D=window.RoccoNeutral; return (D&&D.clips&&D.clips[f])||null; };
const fileOf=v=>{ const m=/([^\/]+?)(?:\.hevc)?\.(?:webm|mp4)(?:\?.*)?$/.exec((v&&(v.dataset.src||v.currentSrc||v.src))||''); return m?m[1]:''; };
const dAt=(c,t)=>{ const d=c.d, i=Math.round(t*FPS); return d[Math.max(0,Math.min(d.length-1,i))]; };
const fAt=(c,t)=>{ const f=c.f; if(!f) return 0; const i=Math.round(t*FPS); return f[Math.max(0,Math.min(f.length-1,i))]/10; }; // f — доля пикселей силуэта с |Δ|>40 к покою, % (tools/rocco_neutral.py, в данных десятые доли)
const skipOf=c=>{ if(!c) return 0; const f=c.h-SKIP_MARGIN; return f>=SKIP_MIN?+f.toFixed(3):0; }; // с какого времени ролика его показываем: голова до этого кадра — Рокко стоит неподвижно, как в покое (поза почти равна позе покоя), её пропускаем
const segsOf=file=>{ const f=skipOf(data(file)); return f?[[f,Infinity],[99,1]]:[[99,1]]; }; // участки «скорости» для wallAt() в ui.js: [0…f] — пропуск (0 мс), дальше ×1

function make(E){
 const {idle,act,K,RM,fast,wake,readyV,seekV}=E, idle2=E.idle2||null, all=[idle,...(idle2?[idle2]:[]),...Object.values(act)], isOn=E.isOn||(()=>idle.isConnected);
 let F=idle, Bk=idle2; // F — покой, который сейчас играет (виден, когда над ним нет ролика действия); Bk — второй экземпляр, скрытый на кадре 0 (см. idleStep)
 let cur=null, pend=null, inflight=null, zc=10, swapT=0, mon=0, dead=false, starting=0;
 const now=()=>performance.now(), sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const op=(v,on,ms)=>{ v.style.transition=ms?`opacity ${ms}ms linear`:'none'; v.style.opacity=on?1:0; };
 const settle=(keep,ms)=>{ clearTimeout(swapT); const go=()=>{ const kp=keep===idle?F:keep; all.forEach(x=>{ if(x!==kp&&x.style.opacity!=='0') op(x,0,0); }); }; // keep===idle — «какой покой играет сейчас» (F меняется при смене кругов покоя)
   if(ms) swapT=setTimeout(go,ms+40); else if(window.RoccoFlow&&RoccoFlow.cutHold) requestAnimationFrame(()=>requestAnimationFrame(go)); else go(); }; // после наплыва всё, кроме нужного, гасим; жёсткая смена (ms=0): прежний гасим через 2 кадра — новый ролик, пока он ни разу не нарисован (был opacity 0), на 1–2 кадра пуст, и без этого Рокко мигал бы
 const swapIn=(v,ms)=>{ v.style.zIndex=++zc; if(ms&&v.style.opacity!=='1'){ op(v,0,0); void v.offsetWidth; } op(v,1,ms); settle(v,ms); }; // новый ролик появляется поверх прежнего: просвета не бывает
 const frame=v=>new Promise(res=>{ let d=false; const f=()=>{ if(!d){ d=true; res(); } }; if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(f); setTimeout(f,v.requestVideoFrameCallback?170:40); }); // ждём первый показанный кадр
 // ---- фаза ролика: head — нейтральная голова, act — движение, soft — мягкий хвост (позу можно сменить растяжкой), tail — строгий хвост
 const phase=(R,t)=>{ const c=R.c, en=R.v.ended; if(!c) return en?'tail':t<.2?'head':'act'; if(en||t>=c.e) return 'tail'; if(t<c.h) return 'head'; return t>=c.es?'soft':'act'; };
 const rate=R=>Math.max(1,R.v.playbackRate)/(window.__slow||1); // __slow — только съёмка в замедлении (ролики идут в N раз медленнее, ожидания в мс — тоже)
 // Время ролика по ПОКАЗАННОМУ кадру (requestVideoFrameCallback → mediaTime), а не по часам видео: на медленном устройстве часы бегут вперёд, а картинка отстаёт на сотни мс (кадры не успевают раскодироваться) —
 // решение «поза уже в покое, можно менять ролик» должно опираться на то, что человек видит сейчас, иначе смена придётся на чужую позу (двоение лица). Кадров нет дольше 250 мс (пауза, стоп-кадр удара) — берём часы.
 const shown=R=>(R.mt!=null&&now()-R.mtAt<250)?R.mt:R.v.currentTime;
 // Можно ли сейчас сменить ролик C (идёт) новым запросом N: хвост — всегда; «мягкий» хвост — только на кадре не дальше SOFT_D от покоя; голова — только если N не менее важен
 // (трюк и глотание — ролики, на которые завязана игра, — в своей голове не отменяем никем; реакцию/взмах — только равным или более важным) и это не тот же ролик
 const ripe=(C,N,t)=>{ const ph=phase(C,t); return ph==='tail'||(ph==='soft'&&dAt(C.c,t)<=SOFT_D&&fAt(C.c,t)<=SOFT_F)||(ph==='head'&&C.prio<2&&N.prio>=C.prio&&N.v!==C.v); };
 const waitMs=(C,N)=>{ const t=shown(C); if(ripe(C,N,t)) return 0; if(!C.c) return Math.max(0,((C.v.duration||5)-t)*1000/rate(C)); const ph=phase(C,t); return Math.max(0,((ph==='soft'?C.c.e:C.c.es)-t)*1000/rate(C)); }; // мс до нейтрального окна идущего ролика (для запроса N)
 const fade=(A,B)=>{ if((A&&A.o&&A.o.cut)||(B&&B.o&&B.o.cut)) return 0; /* cut: жёсткая смена (KS-handoff): у двигающейся головы наплыв двоит лицо */ if((A&&A.c&&!A.c.al)||(B&&B.c&&!B.c.al)) return 180; const dA=A&&A.c?dAt(A.c,shown(A)):2, dB=B&&B.c?dAt(B.c,B.s||0):2, m=Math.max(dA,dB); return m<=CUT_D?0:Math.round(m<=6?2:m<=10?3:m<=14?4:m<=18?5:6)*FR; }; // длина наплыва по расстоянию поз; 0 — жёсткая смена: кадры одинаковы до зерна кодирования, наплыв ничего не даёт
 // ---- уход ролика: в покой (toIdle) или под новый ролик (под ним он доигрывает наплыв)
 const leave=(P,ms,toIdle)=>{ if(P.over) return; P.over=true; if(cur===P){ cur=null; clearInterval(mon); } P.v.onended=null; P.v._rel=now()+ms+120;
  if(toIdle){ const I=F; I.style.zIndex=0; op(I,1,0); if(I.paused) I.play().catch(()=>{}); P.v.style.zIndex=++zc; if(ms||!window.RoccoFlow||!RoccoFlow.cutHold) op(P.v,0,ms); settle(idle,ms); }
  // Снова готов к показу с кадра старта: пауза и перемотка — когда ролик НА САМОМ ДЕЛЕ погас (transitionend), а не по таймеру: на загруженной странице переход начинается позже таймера, и перемотка приходилась на ещё видимый ролик (замер: SEEKING при op 0,2).
  { let fin=false; const rew=()=>{ if(fin) return; fin=true; clearTimeout(tm); P.v.removeEventListener('transitionend',te); if((cur&&cur.v===P.v)||inUse(P.v)) return; try{ P.v.pause(); P.v.currentTime=P.s||0; }catch(e){} };
   const te=e=>{ if(e.propertyName==='opacity') setTimeout(rew,30); }, tm=setTimeout(rew,ms+450); // ms=0 — смена жёсткая, ролик уже погашен: перематываем сразу (следующим заданием)
   if(ms) P.v.addEventListener('transitionend',te); else { clearTimeout(tm); let n=0; const chk=()=>{ if(fin) return; if(P.v.style.opacity==='0'||++n>40) setTimeout(rew,40); else setTimeout(chk,25); }; setTimeout(chk,25); } } // ms=0 — жёсткая смена: прежний ролик гасится через 2 кадра (cutHold в settle; на медленном устройстве это дольше 70 мс) — ждём, пока он действительно погас, и перематываем
  P.fin(); };
 const fail=R=>{ if(R.dead) return false; R.dead=true; R.over=true; if(pend===R) pend=null; if(inflight===R) inflight=null; clearTimeout(R.wd); R.ok(false); R.fin(); return false; };
 const toIdle=R=>{ if(R.over) return; leave(R,fade(R,null),true); if(pend){ const P=pend; pend=null; P.prep.then(ok=>ok&&!P.dead?go(P):fail(P)); } }; // в очереди кто-то есть — запускаем, прежний ушёл
 const prepare=async R=>{ const v=R.v; starting++; try{ wake(v); while(cur&&cur.v===v&&!R.dead) await sleep(40); /* тот же <video> ещё на экране (второй удар/бросок подряд): перематывать его нельзя */ if(v._rel>now()) await sleep(v._rel-now()); if(R.dead||!await readyV(v,1500)||R.dead) return false; await seekV(v,R.s||0); return !R.dead; } finally{ starting--; } }; // загрузить и встать на кадр старта (0 или конец пропускаемой головы), пока ждём своего момента
 const go=async R=>{ if(R.live||R.dead) return false; const v=R.v; R.live=true; clearTimeout(R.wd);
  v.playbackRate=1; // ролик Рокко не ускоряется никогда
  try{ await v.play(); }catch(e){ R.live=false; return fail(R); }
  await frame(v);
  if(R.dead||dead||!isOn()){ try{ v.pause(); }catch(e){} return fail(R); }
  const prev=cur, ms=fade(prev,R); if(prev) leave(prev,ms,false);
  if(inflight===R) inflight=null;
  cur=R; R.t0=now(); R.lt=-1; R.lw=now(); swapIn(v,ms);
  v.onended=()=>{ if(cur===R&&!R.next) tick(R); };
  clearInterval(mon); mon=setInterval(()=>{ try{ tick(R); }catch(e){ console.error(e); } },40); // запасной таймер: rVFC молчит, когда страница в фоне или ролик встал
  if(v.requestVideoFrameCallback){ const cb=(nw,md)=>{ if(cur!==R||R.over) return; if(md&&md.mediaTime!=null){ R.mt=md.mediaTime; R.mtAt=now(); } try{ tick(R); }catch(e){ console.error(e); } v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); } // ход ролика проверяем на каждом показанном кадре: смена в нейтральное окно ровно на его кадре
  R.ok(true); try{ R.o.onStart&&R.o.onStart(R); }catch(e){ console.error(e); }
  return true; };
 const takeover=R=>{ const P=pend; if(!P) return; pend=null; R.next=P; // нейтральное окно — отдаём место очереди
  if(P.v===R.v) leave(R,fade(R,null),true); // тот же ролик: сначала уходит в покой, потом заново
  P.prep.then(async ok=>{ const r=(!ok||P.dead)?fail(P):await go(P); if(!r) R.next=null; }); };
 const tick=R=>{ if(cur!==R||R.over) return; const v=R.v;
  if(dead||!isOn()){ clearInterval(mon); return; }
  const t=v.currentTime, n=now();
  if(v.playbackRate!==1) v.playbackRate=1; // защита: скорость ролика Рокко только ×1
  if(!v.paused&&!document.hidden&&!v.ended){ if(t!==R.lt){ R.lt=t; R.lw=n; } else if(n-R.lw>1600) return toIdle(R); } else R.lw=n; // ролик встал — отдаём покой
  const ts=shown(R), ph=phase(R,ts);
  if(pend&&ripe(R,pend,ts)) takeover(R);
  if(!pend&&ph==='tail'&&!R.next) toIdle(R); };
 const play=(n,o)=>{ o=o||{}; const v=act[n], kind=KIND[n]||'react', R={n,v,o,kind,prio:PRIO[kind],c:data(fileOf(v)),over:false,dead:false,live:false,next:null,t0:0,lt:-1,lw:0};
  R.s=skipOf(R.c); R.started=new Promise(r=>{ R.ok=r; }); R.done=new Promise(r=>{ R.fin=r; }); R.alive=()=>!R.dead&&!R.over; R.end=()=>{ if(pend===R||inflight===R) fail(R); else if(cur===R) toIdle(R); };
  if(!v||RM()||fast()||window.__sim||!isOn()||dead){ R.dead=R.over=true; R.ok(false); R.fin(); return R; }
  if(inflight){ if(R.prio<=inflight.prio){ fail(R); return R; } fail(inflight); inflight=null; } // уже готовится запуск: важнее — заменяем, иначе отклоняем (так бывает, когда два запроса почти одновременно)
  const cv=cur, wms=cv?waitMs(cv,R):0, maxw=(o.maxWait!=null?o.maxWait:(o.force&&kind==='react'?MAXW.swallow:MAXW[kind]))*(window.__slow||1);
  if(cv&&cv.v===v&&wms>0&&(kind==='react'||kind==='amb')){ fail(R); return R; } // этот же ролик уже показывает движение — второй раз не запускаем
  if(wms>maxw){ fail(R); return R; } // слишком долго ждать
  if(wms>0){ if(pend){ if(pend.prio>R.prio){ fail(R); return R; } fail(pend); } // в очереди одно место: важнее заменяет, менее важный отклоняется
   pend=R; R.eta=now()+wms; R.wd=setTimeout(()=>{ if(pend===R) fail(R); },wms+1800); R.prep=prepare(R); return R; } // ждёт нейтрального окна прежнего
  inflight=R; R.prep=prepare(R); if(cv&&cv.v===v) toIdle(cv); // прежний — в нейтральном окне: сразу под наплыв (тот же ролик — сначала в покой)
  R.prep.then(ok=>{ if(ok&&!R.dead) return go(R); if(inflight===R) inflight=null; return fail(R); }); return R; };
 // ---- покой без шва круга. <video loop> каждые 5,04 с перематывается в начало ПРЯМО НА ЭКРАНЕ (в Safari это заметная пауза/мигание, в Chrome при нагрузке — зависание на 100–400 мс; ролики покоя — один ключевой кадр на 121).
 // Поэтому покоя два (idle и idle2): второй стоит скрытым на кадре 0 с уже готовым кадром. Когда играющий подходит к концу (за IDLE_LEAD), второй запускается, и как только пошёл — жёсткая смена (поза покоя одна, разница кадров ≈ зерно кодирования),
 // а прежний тут же перематывается в 0 уже скрытый. Перемотки на виду нет. Не вышло (второй не загрузился, страница стоит) — как раньше работает loop у играющего.
 const IDLE_LEAD=.3;
 const idleSwap=()=>{ const A=F, B=Bk; B.style.zIndex=A.style.zIndex||0; if(A.style.opacity!=='0'){ op(B,1,0); op(A,0,0); } F=B; Bk=A; A._go=0; try{ A.pause(); A.currentTime=0; }catch(e){} }; // виден прежний покой — меняем в одном кадре; закрыт роликом действия — меняем только «кто играет»
 const idleStep=()=>{ if(!Bk||dead||!isOn()||document.hidden) return; const A=F, B=Bk, dur=A.duration||5.04;
  if(A.paused&&A.readyState>=2&&!A.ended) A.play().catch(()=>{}); // покой не должен стоять: вкладка вернулась из фона, браузер мог остановить
  // покой закрыт роликом действия (opacity 0) — его круг может кончиться под ним сам (loop), второй не запускаем: лишнее декодирование в самый ответственный момент
  if(!B._go){ if(A.style.opacity!=='0'&&!A.paused&&A.readyState>=2&&A.currentTime>=dur-IDLE_LEAD&&B.paused&&B.readyState>=2&&Math.abs(B.currentTime)<.03){ B._go=now(); B.play().catch(()=>{ B._go=0; }); } }
  else if(!B.paused&&B.currentTime>=.05) idleSwap(); // второй пошёл — меняем
  else if(now()-B._go>1500){ B._go=0; try{ B.pause(); B.currentTime=0; }catch(e){} } }; // второй не завёлся — оставляем первому его loop
 const idleT=Bk?setInterval(()=>{ try{ idleStep(); }catch(e){ console.error(e); } },30):0;
 // Ролик действия после загрузки сам встаёт на кадр старта (перемотка скрытая, один раз): в нужный момент остаётся play() — ни загрузки, ни перемотки на пути к первому кадру
 const inUse=v=>(cur&&cur.v===v)||(pend&&pend.v===v)||(inflight&&inflight.v===v);
 const prime=v=>{ if(dead||!v.isConnected||!v.paused||inUse(v)||v.readyState<2) return; const s=skipOf(data(fileOf(v))); if(Math.abs(v.currentTime-s)<.03) return; try{ v.currentTime=s; }catch(e){} };
 Object.values(act).forEach(v=>v.addEventListener('canplay',()=>prime(v)));
 const ready=new Promise(res=>{ let d=false; const f=()=>{ if(!d){ d=true; res(); } }; if(idle.readyState>=2&&idle.currentTime>0) return f(); idle.addEventListener('playing',f,{once:true}); idle.addEventListener('error',f,{once:true}); setTimeout(f,1500); }); // первый кадр покоя
 // Экран большого выигрыша (bigwin-show.js): Рокко в зале должен стоять в покое, когда поверх него встаёт «тот же» Рокко шоу. restIn — мс до нейтрального окна идущего ролика (0 — уже в покое: голова, мягкий и строгий хвост);
 // hush — снять ролики, которые ещё ждут своей очереди (идущий доигрывает сам, он наплывом уйдёт в покой).
 const restIn=()=>{ const C=cur; if(!C) return 0; const t=shown(C); if(phase(C,t)!=='act') return 0; return Math.max(0,((C.c?C.c.es:(C.v.duration||5))-t)*1000/rate(C)); };
 const hush=()=>{ if(pend) fail(pend); if(inflight&&!inflight.live) fail(inflight); };
 const api={restIn,hush,play,cur:()=>cur,pend:()=>pend,ready,busy:()=>!!(cur||pend||inflight),lagMs:()=>pend?Math.max(0,pend.eta-now())+200:0,alive:R=>!!R&&!R.dead&&!R.over,
  destroy:()=>{ dead=true; clearInterval(mon); clearInterval(idleT); clearTimeout(swapT); if(pend) fail(pend); if(inflight) fail(inflight); if(cur){ const R=cur; cur=null; R.over=true; R.fin(); } } }; // перестройка страницы: ролики не ждём, но кто ждал (S.stop у глотания) — освобождаем
 return api; }

window.RoccoFlow={make,segsOf,data,skipOf,ffOf:skipOf,cutHold:true};
})();
