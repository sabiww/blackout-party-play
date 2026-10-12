// Blackout Party — «живой» Рокко: режиссёр оживления (2026-10-12, владелец: «надо сделать маскот более живым», «на кухне он стоит как вкопанный»).
// Макет, не игра. Не рисует и не крутит видео сам: просит ролики у контроллера rocco-flow.js через ctx.run(имя) — «никогда два действия сразу», «не режет ролики механики» и «скорость ×1» остаются за ним
// (ролики оживления — вид 'amb': запрос отклоняется, пока идёт любой другой ролик; идущие кража, удар, рука-лапа, рубильник не прерываются никогда).
// Что делает:
//  1) оживление в покое — каждые ≈6–12 с тишины (случайно, без ритма: 15 % короче, 15 % длиннее) один ролик из набора сцены; выбор без повторов (мешок + штраф за недавние);
//     зал — взмах, шляпа, взгляд на поле, «подаётся к полю»; кухня — ещё и «нюхает воздух», «потирает живот». Только вне спина; в цепочках, где следующий спин идёт сам (Autoplay, бесплатные
//     спины «Кухни»), — только ролики, что успеют кончиться до первой кражи следующего спина (fits), иначе кража ждала бы их конца. Пожатие плеч, кивок, «облизывает палец» (shrug/nod/lick) в наборах есть,
//     но роликов у Kling не получилось (asset-source/openrouter/video/rocco-alive-2026-10-12.candidates.txt) — без файла режиссёр их пропускает;
//  2) малые реакции на ход игры (ev()): взгляд на поле в начале спина (короткий ролик), «подаётся к полю» на предвкушении (две карты-приглашения), «поправляет шляпу»/взгляд, когда приглашения не добрали,
//     «выглядывает» на кухне, когда в мешке 3 из 4 краж; малые выигрыши — шляпа/взгляд/«потирает живот» вместо большой радости (win()), крупная радость — как раньше;
//  3) скука: >25 с без действий игрока — чаще шляпа/взгляд/«подаётся к полю», >60 с — взмах игроку;
//  4) тише в Autoplay, Turbo, Quick (реже и без реакций на спин), «меньше движения», Skip и расчёт без анимаций — ничего; ?alive=0 — прежнее поведение (раз в 15–25 с случайный ролик, радость на каждый выигрыш).
// Подробности, замеры «до/после» и что пробовали и убрали — docs/ANIMATIONS.md, раздел 22.
// Отладка: RoccoAlive.dbg — журнал решений [{t, k, n, why}]; ?alive=log печатает его в консоль; RoccoAlive.state() — что сейчас в очереди.
(()=>{
'use strict';
const Q=new URLSearchParams(location.search), OFF=Q.get('alive')==='0', LOG=Q.get('alive')==='log';
const now=()=>performance.now(), U=(a,b)=>a+Math.random()*(b-a), pick=a=>a[(Math.random()*a.length)|0];
// Наборы оживления: имя ролика действия (ключ CFG.acts в ui.js) → вес. Ролик, которого в сцене нет (или не загрузился), тихо пропускается.
const AMB={
 hall:{wave:1,hat:1,look:1.1,lean:.8,shrug:.5,nod:.45}, // микрофона нет (2026-10-12): без звука жест пустой, файлы H-mic/I-mic остались
 kitchen:{sniff:1.3,lick:1,rub:1,look:.9,hat:.7,wave:.4,lean:.6,nod:.3}};
// Реакция на старт спина (взгляд на поле): набор и вероятность
const GLANCE={hall:{look:1},kitchen:{look:.45,rub:.3,sniff:.25}};
// «Малый выигрыш»: что делает Рокко вместо большой радости
const SMALLWIN={hall:{hat:1,look:.8,lean:.5,nod:1},kitchen:{rub:1,hat:.5,sniff:.5,lean:.3,nod:.6,lick:.8}};
// Тревога на приглашениях не добрала (две карты, третьей нет) — «ну почти»: пожатие плеч; нет такого ролика — поправляет шляпу
const NEARMISS={hall:{shrug:1,hat:.8,look:.4},kitchen:{shrug:1,hat:.6,look:.4}};
const BORED={hat:2.2,shrug:2.2,look:1.4,lean:1.6}, WAVY={wave:3.2}; // во сколько раз чаще, когда игрок давно ничего не нажимал
// ---- GESTURES (fb/rocco-gestures 2026-10-12, владелец: «ещё что-нибудь, чтоб маскот живее выглядел») — мелкие жесты без микрофона; отдельный блок: только дополняет таблицы выше ----
// H-sway «покачивается под музыку» (зал и кухня; нет файла — режиссёр пропускает). Те же правила, что у остальных: вне спина, fits() в цепочках, вид 'amb' в rocco-flow.js.
// H-bowtie «поправляет бабочку» и H-scratch «чешет за ухом» сняты, но отклонены (кисть на крупном плане — тёмная сегментная, «перчаточная»: правило владельца — кисть мохнатая), в игре их нет.
// KS-rub «потирает живот» (fb/rocco-alive) отклонён по тому же правилу (тёмная металлическая кисть): режиссёр его не просит; перегенерировать не вышло — бюджет $7 кончился.
// fb/gestures2 2026-10-12: H-rock «качается из стороны в сторону» (заметнее H-sway) и H-belly «гладит живот и злится — голодный» (режим HUNGRY ROCCO — в 6 раз чаще в покое). H-bowtie (бант) снят снова и отклонён: кисть тёмная глянцевая.
const GEST={ amb:{hall:{sway:.7,rock:1.1,belly:.5},kitchen:{sway:.6,rock:.9,belly:.5}},        // тихий покой: набор сцены
 smallwin:{hall:{sway:.6,rock:.8},kitchen:{sway:.5,rock:.7,belly:.4}},               // малый выигрыш: «доволен» — покачивание под музыку
 bored:{sway:1.6} };                                         // игрок давно ничего не нажимал: чаще
for(const sc of ['hall','kitchen']){ Object.assign(AMB[sc],GEST.amb[sc]); Object.assign(SMALLWIN[sc],GEST.smallwin[sc]); }
Object.assign(BORED,GEST.bored);
delete AMB.kitchen.rub; delete SMALLWIN.kitchen.rub; delete GLANCE.kitchen.rub; // KS-rub — см. выше
// H-lean «подаётся к полю» убран из режиссёра (владелец: резкий наклон вдвое быстрее остальных и потом долгая замёрзшая поза = «слайдшоу»; перегенерировать не вышло — бюджет $7 кончился). Файл остался; вернуть — убрать 'lean' из HID.
const HID=new Set(['lean']);
// ---- /GESTURES

let S=null, DBG=[];
const log=(k,n,why)=>{ const e={t:Math.round(now()),k,n:n||'',why:why||''}; DBG.push(e); if(DBG.length>400) DBG.shift(); if(LOG) console.log('[alive]',e.t,k,n||'',why||''); };

function make(c){
 const sc=c.scene, GS=c.GS, ambCfg=AMB[sc]||AMB.hall, t0=now();
 let lastBusy=t0, wasBusy=false, need=U(3500,6500), lastClip=0, lastTell=0, lastCheer=0, lastInput=t0, lastName='', recent=[], bags={}, warmAt=t0+5000, warmI=0, spPrev=false, pend=null, timer=0, dead=false, inflight=null, kitSeen=0;
 const R={sp:false,hot:false,anticip:false,land3:false,start:0,stopAt:0}; // раунд: идёт ли спин, началась ли механика выигрыша (кража/трюк — «горячий» раунд), была ли тревога на приглашениях
 const TOUCHN=window.RoccoTouch?['grab']:[]; // «касание суммы»: ролик H-grab6 (rocco-touch.js), просит только win()
 const want=[...new Set([...TOUCHN,...Object.keys(ambCfg),...Object.keys(GLANCE[sc]||{}),...Object.keys(SMALLWIN[sc]||{}),...Object.keys(NEARMISS[sc]||{}),'lean'])].filter(n=>c.act[n]&&!HID.has(n));
 // Сколько секунд ролик занимает Рокко (от кадра старта после пропуска неподвижной головы до «мягкого» хвоста, после него контроллер уже отдаёт покой) — по данным rocco-neutral.js
 const effS=n=>{ const v=c.act[n], m=v&&/([^\/]+?)(?:\.hevc)?\.(?:webm|mp4)/.exec(v.dataset.src||''), d=m&&window.RoccoNeutral&&window.RoccoNeutral.clips&&window.RoccoNeutral.clips[m[1]];
  if(!d) return 4.2; const sk=window.RoccoFlow&&RoccoFlow.skipOf?RoccoFlow.skipOf(d):0; return Math.max(1,d.es-sk); };
 // Цепочка спинов идёт сама (Autoplay, бесплатные спины «Кухни»): следующий спин начнётся через chainGap мс, а первая просьба о краже приходит не раньше чем через ≈3,2 с после его старта (замер).
 // Ролик, который не успеет кончиться к этому моменту, заставил бы кражу ждать его нейтрального окна (замер на нагруженной машине: до 3 с), поэтому в цепочке берём только короткие. Вручную (человек жмёт Play ≥2 с) — любые.
 const chainGap=()=>GS.auto>0?(c.K()<1?250:700):(sc==='kitchen'&&GS.fs>0?(c.K()<1?250:900):0);
 const fits=n=>{ const g=chainGap(); return !g||effS(n)*1000<=g+3500; }; // допуск +0,3 с: самые ранние просьбы о краже (3,2 с) подождут ≤0,5 с, обычные (3,6–5 с) — нет
 const idleFor=()=>now()-lastInput;
 const mult=()=>{ const k=c.K(); let m=1; if(k<1) m*=3; else if(GS.auto>0) m*=1.5; return m; }; // реже в Turbo/Quick и в Autoplay
 const poolOf=cfg=>Object.entries(cfg).filter(([n])=>c.act[n]&&!HID.has(n));
 const ready=n=>{ const v=c.act[n]; return !!v&&v.readyState>=3; };
 const okNow=()=>!dead&&c.isOn()&&!document.hidden&&!c.RM()&&!c.fast()&&!c.dialogOpen()&&!window.__sim;
 const drawNeed=()=>{ const r=Math.random(); let s=r<.15?U(4.8,6.2):r<.85?U(6.4,11.6):U(11.8,15); if(idleFor()>30000) s*=.8; return s*1000*mult(); }; // «около 6–12 с тишины, не на ровном ритме»
 // Выбор без повторов: «мешок» на каждый набор (каждый ролик по разу за круг), недавние — реже, у скуки свои веса; не загруженные ролики греем (по одному) и берём другие
 function choose(cfg,key,okFn){
  let list=poolOf(cfg); if(okFn) list=list.filter(([n])=>okFn(n)); if(!list.length) return null;
  const idle=idleFor(), hg=c.hungry&&c.hungry(), boost=n=>(idle>25000&&BORED[n]||1)*(idle>60000&&WAVY[n]||1)*(hg&&n==='belly'?6:1);
  list=list.map(([n,w])=>[n,w*boost(n)*(n===lastName?0:recent.includes(n)?.35:1)]);
  const un=list.find(([n])=>!ready(n)&&!c.act[n].error); if(un) c.warm(un[0]);
  const have=list.filter(([n])=>ready(n)); if(!have.length) return null;
  let bg=bags[key]||(bags[key]=[]), src=have.filter(([n])=>bg.includes(n));
  if(!src.length){ bg=bags[key]=have.map(h=>h[0]); src=have.filter(([n])=>n!==lastName); if(!src.length) src=have; } // круг кончился — новый, прежний выбранный первым не идёт
  const tot=src.reduce((a,x)=>a+x[1],0); if(!(tot>0)) return null; let r=Math.random()*tot, ch=src[src.length-1][0]; for(const [n,w] of src){ if((r-=w)<=0){ ch=n; break; } }
  bags[key]=bg.filter(n=>n!==ch); return ch; }
 function fire(n,k,why){ // просим контроллер; он сам откажет, если идёт другой ролик
  if(!n||!c.act[n]||!okNow()||c.flow.busy()) return false;
  const R_=c.run(n); if(!R_||R_.dead){ log('refused',n,why); return false; }
  const t=now(); lastClip=t; lastBusy=t; inflight=R_; lastName=n; recent.push(n); if(recent.length>3) recent.shift(); if(k==='tell') lastTell=t; if(k==='amb'){ try{ window.bpAudio&&window.bpAudio.play('rocco.idle'); }catch(e){} } log(k,n,why); // звук 'rocco.idle' — как у прежнего таймера (AU в ui.js)
  R_.started.then(ok=>{ if(inflight===R_) inflight=null; if(!ok) log('dropped',n,why); }); return true; }
 let lastBelly=0;
 function ambient(){ const hg=c.hungry&&c.hungry(); // HUNGRY ROCCO: «голодный живот» — отдельный бросок кубика поверх мешка (мешок даёт каждый ролик раз за круг), не чаще раза в ≈18 с
  if(hg&&c.act.belly&&ready('belly')&&fits('belly')&&now()-lastBelly>18000&&Math.random()<.55&&!HID.has('belly')){ if(fire('belly','amb','hungry')){ lastBelly=now(); return true; } }
  const n=choose(ambCfg,'amb',fits); if(n==='belly') lastBelly=now(); if(!n) return false; return fire(n,'amb','quiet '+Math.round((now()-lastBusy)/1000)+'s'); }
 // ---- ход раунда
 function roundEnd(){ R.sp=false; R.hot=false; R.stopAt=now();
  // кухня: в мешке 3 из 4 краж — Рокко «выглядывает»: следующая высыпет
  if(sc==='kitchen'&&GS.fs>0&&GS.ksteals%4===3&&(GS.sack||0)>0&&c.act.lean&&!HID.has('lean')&&Math.random()<.65) later('lean','sack 3/4',1400); }
 function later(n,why,ms,touch){ pend={n,why,until:now()+ms,at:now()+240,touch}; }
 function tick(){
  if(dead) return; const t=now();
  if(!c.isOn()){ detach(); return; }
  if(document.hidden||c.dialogOpen()){ lastBusy=t; return; }
  const sp=!!GS.spinning; if(spPrev&&!sp) roundEnd(); spPrev=sp; R.sp=sp;
  const busy=c.flow.busy(); if(busy){ lastBusy=t; wasBusy=true; return; }
  if(wasBusy){ wasBusy=false; need=drawNeed(); } // ролик кончился — новая тишина, каждый раз разной длины
  if(pend){ if(t>pend.until||R.hot) pend=null; else if(t>=pend.at){ const p=pend; pend=null; if((!sp||!R.hot)&&ready(p.n)){ const ok=fire(p.n,'tell',p.why); if(ok&&p.touch&&window.RoccoTouch) window.RoccoTouch.start(inflight,p.touch,c); } return; } }
  // подгружаем ролики набора по одному, пока Рокко стоит (иначе первый запрос отклонится: файл ещё не пришёл)
  if(t>warmAt){ const names=want.filter(n=>!ready(n)&&!c.act[n].error); if(names.length){ c.warm(names[0]); warmAt=t+1800; } else warmAt=t+60000; } // want — все ролики, которые режиссёр может просить; у не загрузившихся (нет файла) video.error — их пропускаем
  // оживление — только вне спина (в Кухне между бесплатными спинами всего ≈1 с, раньше из-за этого Рокко там не оживал вообще) и только те ролики, что успеют кончиться до первой просьбы механики следующего спина (fits).
  // На старте спина оживления нет: кража просится уже через ≈3,2 с, длинный ролик заставил бы её ждать. В «горячем» раунде (кража, трюк) — только «доволен после кражи» в окне до следующей просьбы
  if(t-lastBusy<need||sp||t-R.stopAt<150) return;
  if(!c.RM()&&c.K()>.06) ambient(); }
 // ---- события игры (звуковые имена AU из ui.js)
 function ev(e){ if(dead||!okNow()) { if(e==='spin.start'){ R.hot=false; R.anticip=false; R.land3=false; R.start=now(); lastInput=now(); } return; }
  const t=now();
  if(e==='spin.start'){ R.hot=false; R.anticip=false; R.land3=false; R.start=t; lastInput=t; pend=null;
   const k=c.K(); if(k<1||c.flow.busy()) return;
   if(t-lastClip<9000||t-lastTell<12000) return; // не чаще одного взгляда на 12 с
   if(Math.random()<(GS.auto>0?.14:sc==='kitchen'?.36:.3)){ const n=choose(GLANCE[sc]||GLANCE.hall,'glance',m=>effS(m)<=3.7); if(n) fire(n,'tell','spin start'); } return; }
  if(e==='scatter.anticipation'){ R.anticip=true; if(c.K()>=1&&t-lastTell>3500&&Math.random()<.85){ const n=c.act.lean&&!HID.has('lean')&&ready('lean')?'lean':c.act.look&&ready('look')?'look':null; if(n&&!c.flow.busy()) fire(n,'tell','anticipation'); } return; }
  if(e==='scatter.land.3'){ R.land3=true; return; }
  if(e==='win.cluster'||e==='counter.trick'||e==='lever.pull'||e==='punch.hit'||e==='toss.ticket'||e==='wild.frame_on'){ R.hot=true; pend=null; return; }
  if(e==='spin.stop'){ const had=R.anticip, three=R.land3; setTimeout(()=>{ // win.cluster идёт следом без пауз: если механика пошла — реакции не нужны
    if(dead||!had||three||R.hot||!okNow()||c.K()<1||c.flow.busy()) return; if(Math.random()<.85){ const n=choose(NEARMISS[sc]||NEARMISS.hall,'near',fits); if(n) fire(n,'tell','near miss'); } },140); return; } }
 // ---- малый выигрыш: ui.js зовёт win() в конце раунда вместо react('W-*'): true — сам ответил (или решил промолчать); false — играй прежнюю радость
 function win(x,o){ if(dead||!okNow()) return false; const t=now(); o=o||{};
  if(x>=8||o.trophy||o.big){ lastCheer=t; return false; } // крупный — радость как раньше
  const k=c.K(); if(k<1) return false;
  const smallP=x<1.5?.4:x<5?.65:.35, cheerOk=x>=5?(t-lastCheer>20000&&Math.random()<.8):(x>=1.5&&t-lastCheer>45000&&Math.random()<.25);
  if(cheerOk){ lastCheer=t; return false; }
  // «касание суммы» (fb/win2, rocco-touch.js): на малом и среднем выигрыше Рокко протягивает раскрытую руку (H-grab6) и «прикладывает» к ладони полоску с суммой; ролик тот же, ×1, просит режиссёр
  if(o.amt&&window.RoccoTouch&&window.RoccoTouch.on&&x>=.5&&x<8&&c.act.grab&&ready('grab')&&fits('grab')&&Math.random()<.55){ later('grab','touch '+x.toFixed(1)+'x',1600,{amt:o.amt}); return true; }
  if(Math.random()<smallP*(sc==='kitchen'?.7:1)){ const n=choose(SMALLWIN[sc]||SMALLWIN.hall,'win',fits); if(n){ later(n,'small win '+x.toFixed(1)+'x',1600); } }
  return true; }
 const input=()=>{ lastInput=now(); };
 document.addEventListener('pointerdown',input,true); document.addEventListener('keydown',input,true);
 timer=setInterval(()=>{ try{ tick(); }catch(e){ console.error(e); } },200);
 function detach(){ dead=true; clearInterval(timer); document.removeEventListener('pointerdown',input,true); document.removeEventListener('keydown',input,true); }
 return {ev,win,detach,state:()=>({need:Math.round(need),sinceBusy:Math.round(now()-lastBusy),pend,bags,recent:recent.slice(),idleFor:Math.round(idleFor())}),AMB:ambCfg}; }

window.RoccoAlive={
 get dbg(){ return DBG; }, off:OFF,
 on:()=>!!S,
 attach(c){ if(S){ S.detach(); S=null; } if(OFF||!c||c.RM()) return false; S=make(c); log('attach',c.scene); return true; },
 detach(){ if(S){ S.detach(); S=null; } },
 ev(e){ if(S) S.ev(e); },
 win(x,o){ return S?S.win(x,o):false; },
 state:()=>S?S.state():null };
})();
