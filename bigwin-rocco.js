/* Blackout Party — Рокко в полный рост на экране большого выигрыша (владелец 2026-10-11: «Рокко в рост, без нейрослопа, всё качественно, с переходами»).
   Макет, не игра. Подключается bigwin-show.js (?bwrocco=body, по умолчанию); своих глобалей кроме BigWinRocco нет.

   Что делает
   · «Тот же Рокко»: ставится ровно туда же и того же размера, где Рокко стоит в игре (window.roccoHallPlace() из ui.js — тот же расчёт, что у зала/«Кухни»), в позе покоя: тот же ролик H-idle в зеркале.
     Поверх зала он незаметно сливается с настоящим (одна поза, одно место). Нет места Рокко в сцене («Камеры») — ставится на правый край как в зале и «проявляется» светом, как гость.
   · Радость на время счётчика: BW-cheer (покой → радость → покой), петля, пока счётчик крутится; когда счётчик остановился, текущий круг доигрывается до покоя (петля идёт сквозь покой, шва нет).
     Максимальный выигрыш: BW-max включается там, где свет пропал (смена ролика скрыта темнотой, наплыва нет).
   · Покой без шва круга: BW-idle играл с loop — каждые 5 с перемотка в начало прямо на экране (seeking у видимого ролика: зависание 100–400 мс под нагрузкой, пауза/мигание в Safari). Теперь покоя два (idle и idle2, как у H-idle в rocco-flow.js):
     второй стоит скрытым на кадре 0, за 0,3 с до конца играющего запускается и, как только пошёл, меняется с ним жёстко в одном кадре; перематывается только скрытый. playbackRate покоя всегда 1. ?idle2=0 — как раньше (один покой с loop).
   · Ролики никогда не ускоряются (правило владельца): Turbo/Quick, пропуск (доматывание тапом) и «меньше движения» — Рокко стоит в покое (H-idle), роликов радости нет; недоигранный ролик уходит в покой наплывом.
   · Свет — кодом: конус прожектора сверху и пятно на полу, яркость Рокко следует свету сцены (мерцание глав — мерцание на Рокко). Тень на полу — как в зале.
   · Переход ролик ↔ покой — наплыв 2 кадра (0,083 с; было 4) между почти одинаковыми позами (BW-* начинаются и кончаются на кадре покоя base-rest-mirror.png); в движении наплывов нет.

   API:  const R=BigWinRocco.create({stage,before,a,ext,dev,K,RM,avoid}) → {draw(t,c),exact(t,c),layout(),ready,box,fits,state(),restNow(),destroy()}
         stage — сцена шоу (position:absolute, inset:0 окна), before — перед каким узлом сцены вставить слои Рокко (чтобы виньетка и занавес остались поверх него), a — путь к assets/, ext — '.webm' | '.hevc.mp4',
         dev — 'desk' | 'phone', K() — часы игры (≥1 — обычная скорость), RM() — «меньше движения», avoid() — прямоугольники экрана (плашка, заголовок), на которые Рокко не должен налезать (телефон стоя).
         draw(t,c) — из render(t) шоу: c={live,warp,st,tC,tF,tM,vis,lamp}: live — часы идут, warp — идёт доматывание, st — статичный режим, tC — когда начинает радоваться, tF — счётчик остановился,
         tM — свет пропал (MAX; Infinity — не максимум), vis — видимость 0…1 (темнота), lamp — свет сцены. exact(t,c) — раскадровка (root.seek): ролики не играют, а ставятся на кадр по расписанию → Promise. */
(()=>{
'use strict';
const SW=1280, SH=720, TX=952, FEET=699, BODY_H=640, L_EXT=119, R_EXT=160;   // кадр роликов и габариты Рокко в нём — те же числа, что у CFG.hall.P в ui.js
const FR=1000/24, FADE_S=2*FR/1000;                                           // кадр роликов 24 к/с; наплыв 2 кадра (0,083 с; было 4 — два Рокко на 0,167 с, 2026-10-12 fb/no-double): у BW-cheer текстура меха в покое отличается от покоя на 9–12 (rocco_neutral.py), у BW-max на 4–6
const SLOW=()=>Math.max(1,window.__slow||1), FD=()=>2*FR*SLOW();               // window.__slow — только для съёмки в замедлении (как в ui.js): наплывы растягиваются во столько же раз
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), sm=u=>{ u=clamp(u); return u*u*(3-2*u); }, lerp=(a,b,u)=>a+(b-a)*u;
/* Ролики (assets/rocco): idle — покой зала (играет зеркально, как в игре); BW-* сняты с кадра покоя base-rest-mirror.png и играют без отражения (unm: сдвиг на (SW−2·TX)·s).
   dur — запасная длина, пока видео не сообщило свою. */
const CLIPS={
 idle:{file:'BW-idle',unm:false},    // BW-idle = hall-idle.mp4 с чистым ключом (KEY=auto): у H-idle фон держит дымку 5–10 % прозрачности, на тёмной сцене шоу она видна светлым прямоугольником
 idle2:{file:'BW-idle',unm:false,of:'idle'},   // второй экземпляр покоя: меняется с первым без перемотки на виду (idleStep)
 cheer:{file:'BW-cheer',unm:true,dur:4.38},    // 4,38 с, покой → радость → покой, петля; собран из частей Kling (tools/clip_bw_build.py, asset-source/openrouter/bigwin-rocco/BW-cheer.provenance.txt)
 cheer2:{file:'BW-cheer',unm:true,dur:4.38,of:'cheer'},   // второй экземпляр того же ролика: петля идёт по очереди то на одном, то на другом (перемотка в 0 — пока другой играет), потому что перемотка под нагрузкой тянется и «loop» встаёт
 cheerIn:{file:'BW-cheer-in',unm:true,dur:.42},    // вход: покой → первый кадр петли за 10 кадров (tools/bw_cheer_inout.py), первый кадр ≡ покой, последний ≡ первый кадр BW-cheer; смена в обе стороны жёсткая
 cheerOut:{file:'BW-cheer-out',unm:true,dur:.42},  // выход: последний кадр петли → покой за 10 кадров, последний кадр ≡ покой
 max:{file:'BW-max',unm:true,dur:5.54}};     // 5,54 с, покой → оборот на месте и танец → покой, один проход (MAX WIN) 
const CSS=`
.bw-rk{position:absolute;pointer-events:none;opacity:var(--rkop,1)}
.bw-rk-body{position:absolute;inset:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.7)) brightness(var(--rkb,.92))}
.bw-rk-body video{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;opacity:0;transition:none}
.bw-rk-body video.fl{transform:scaleX(-1)}
.bw-rk-sh{position:absolute;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.85) 0,rgba(0,0,0,.52) 40%,rgba(0,0,0,0) 72%)}
.bw-rl{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;mix-blend-mode:screen;opacity:calc(var(--rkl,.6)*var(--rkop,1))}
.bw-rl-cone{position:absolute;filter:blur(.8vw);filter:blur(.7cqw)}
.bw-rl-cone i{position:absolute;inset:0;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);background:linear-gradient(to bottom,rgba(255,206,130,0) 0,rgba(255,206,130,.13) 34%,rgba(255,214,150,.36) 100%)}
.bw-rl-pool{position:absolute;background:radial-gradient(ellipse at 50% 50%,rgba(255,196,110,.56),rgba(255,170,80,.20) 46%,rgba(255,150,60,0) 72%)}
`;
let cssOn=false; const ensureCSS=()=>{ if(cssOn||document.getElementById('bw-rk-css')){ cssOn=true; return; } cssOn=true; const s=document.createElement('style'); s.id='bw-rk-css'; s.textContent=CSS; document.head.append(s); };
const urlOf=(a,ext,n)=>`${a}rocco/${CLIPS[n].file}${ext}`;
/* Загрузка: через общий кэш игры (bpTime.loadClip → blob), если он есть; иначе обычный src */
function wake(v,url){ v.dataset.src=url; const bt=window.bpTime; if(bt&&typeof bt.loadClip==='function') bt.loadClip(v); else v.src=url; }

function create(o){
 ensureCSS();
 const {stage,a,ext}=o, K=o.K||(()=>1), RM=o.RM||(()=>false);
 const light=document.createElement('div'); light.className='bw-rl'; light.innerHTML='<div class="bw-rl-cone"><i></i></div><div class="bw-rl-pool"></div>';
 const el=document.createElement('div'); el.className='bw-rk'; el.innerHTML='<i class="bw-rk-sh"></i><div class="bw-rk-body"></div>';
 light.style.visibility=el.style.visibility='hidden';
 const body=el.querySelector('.bw-rk-body'), cone=light.querySelector('.bw-rl-cone'), pool=light.querySelector('.bw-rl-pool'), sh=el.querySelector('.bw-rk-sh');
 const useIdle2=!RM()&&new URLSearchParams(location.search).get('idle2')!=='0';   // «меньше движения» — покой стоит на первом кадре, второй не нужен
 const V={}; for(const n of Object.keys(CLIPS)){ if(n==='idle2'&&!useIdle2) continue; const v=document.createElement('video'); v.className=CLIPS[n].unm?'um':'fl'; v.muted=true; v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.preload='auto'; v.loop=(n==='idle'||n==='idle2'); v.dataset.n=n; if(n==='idle2') v.style.opacity='0'; body.append(v); V[n]=v; }   // loop у покоя — запасной путь, если второй не завёлся
 if(o.before&&o.before.parentNode===stage){ stage.insertBefore(light,o.before); stage.insertBefore(el,o.before); } else { stage.append(light); stage.append(el); }
 const S={box:null,fit:false,fallback:false,cur:null,z:1,dead:false,cheerOn:false,cheerEnd:false,maxOn:false,maxArm:null,swapT:0,mon:0,warping:false,loaded:false,starting:false,retryAt:0};
 let F=V.idle, Bk=V.idle2||null;   // F — покой, который сейчас играет (виден, когда над ним нет ролика), Bk — второй, скрытый на кадре 0
 let _ready; const ready=new Promise(r=>{ _ready=r; });
 /* Прозрачность роликов — по кадрам отрисовки (rAF), а не CSS-переходом и не таймером: на тормозящей странице таймер срабатывает раньше, чем наплыв нарисован, и остаётся пустой кадр; здесь «ролик под низом гаснет» только на том кадре, где верхний уже виден целиком */
 const op=(v,on,ms,done)=>{ if(v._tw){ cancelAnimationFrame(v._tw); v._tw=0; } const to=on?1:0;
  if(!ms){ v.style.opacity=to; if(done) done(); return; }
  const from=parseFloat(v.style.opacity)||0, t0=performance.now();
  const step=now=>{ const u=clamp((now-t0)/ms); v.style.opacity=(from+(to-from)*u).toFixed(3); if(u<1) v._tw=requestAnimationFrame(step); else { v._tw=0; if(done) done(); } };
  v._tw=requestAnimationFrame(step); };
 const dur=n=>{ n=(CLIPS[n]&&CLIPS[n].of)||n; const v=V[n]; return (v&&isFinite(v.duration)&&v.duration>0)?v.duration:(CLIPS[n].dur||5); };
 const canPlay=()=>!RM()&&!window.__sim&&K()>=1;

 /* ---- место: то же, что у Рокко в игре ---- */
 function place(){
  let p=null; try{ p=typeof window.roccoHallPlace==='function'?window.roccoHallPlace():null; }catch(e){}
  S.fallback=false;
  if(!p&&o.dev!=='phone'){ // в этой сцене Рокко нет («Камеры») — правый край, как в зале (рост .74 высоты окна, ноги чуть выше низа)
   const W=innerWidth, H=innerHeight, s=Math.min(.74*H/BODY_H,(W*.3)/(L_EXT+R_EXT)), m=.016*W; p={Sb:W-m-R_EXT*s,feetY:H*(1-.034),s,bh:BODY_H*s,shadow:true}; S.fallback=true; }
  return p; }
 function layout(){
  const p=place(); if(!p||!(p.bh>=60)){ S.box=null; S.fit=false; el.style.display=light.style.display='none'; return false; }
  const s=p.s, left=p.Sb-(SW-TX)*s, top=p.feetY-FEET*s, umx=(SW-2*TX)*s;
  Object.assign(el.style,{display:'',left:left.toFixed(1)+'px',top:top.toFixed(1)+'px',width:(SW*s).toFixed(1)+'px',height:(SH*s).toFixed(1)+'px'}); light.style.display='';
  for(const n in V) V[n].style.left=CLIPS[n].unm?umx.toFixed(1)+'px':'0px';
  const bw=(L_EXT+R_EXT)*s, cx=p.Sb+(R_EXT-L_EXT)/2*s;   // bw — ширина Рокко с хвостом, cx — её середина на экране (слои света в координатах сцены)
  sh.style.cssText=p.shadow?`left:${((SW-TX+(R_EXT-L_EXT)/2-(L_EXT+R_EXT)*.575)*s).toFixed(1)}px;top:${((FEET-18)*s).toFixed(1)}px;width:${((L_EXT+R_EXT)*1.15*s).toFixed(1)}px;height:${(40*s).toFixed(1)}px`:'display:none';
  const cw=bw*2.4; cone.style.cssText=bpvT`left:${(cx-cw/2).toFixed(1)}px;top:-4px;width:${cw.toFixed(1)}px;height:${(p.feetY-FEET*s*.04+4).toFixed(1)}px`;
  const pw=bw*2.1, ph=pw*.2; pool.style.cssText=bpvT`left:${(cx-pw/2).toFixed(1)}px;top:${(p.feetY-ph*.5).toFixed(1)}px;width:${pw.toFixed(1)}px;height:${ph.toFixed(1)}px`;
  S.box={l:p.Sb-L_EXT*s,r:p.Sb+R_EXT*s,t:p.feetY-BODY_H*s,b:p.feetY,s};
  /* телефон стоя: Рокко на верхней кромке поля, там же в шоу плашка и заголовок. Налезает на них заметно (больше 15 % его рамки) — Рокко не показываем: лучше без Рокко, чем Рокко под цифрами.
     На ноутбуке плашка лишь чуть заходит на край рамки Рокко (рука и хвост) — это нормально, он стоит за ней */
  const b=S.box, rects=(o.avoid&&o.avoid())||[], A=(b.r-b.l)*(b.b-b.t); S.fit=true; S.cover=0;
  for(const r of rects){ if(!r||r.width<=0||r.height<=0) continue; const w=Math.min(b.r,r.right)-Math.max(b.l,r.left), h=Math.min(b.b,r.bottom)-Math.max(b.t,r.top); if(w>0&&h>0) S.cover+=w*h/A; }
  if(S.cover>.15) S.fit=false;
  return S.fit; }

 /* ---- ролики ---- */
 const all=()=>Object.values(V);
 const settle=keep=>all().forEach(x=>{ if(x!==keep&&x.style.opacity!=='0') op(x,0,0); });   // сверху остаётся один ролик; покой под ним тоже гасим (идёт невидимым): у позы с поднятыми руками силуэт уже, и покой выглядывал бы призраком
 const swapIn=(v,ms)=>{   // новый ролик сверху: просвета не бывает, остальные гаснут, когда наплыв дошёл до конца
  v.style.zIndex=++S.z;
  if(!ms){ op(v,1,0); settle(v); return; }
  if(v.style.opacity!=='1'&&!v._tw) v.style.opacity='0';
  op(v,1,ms,()=>settle(v)); };
 const frame=v=>new Promise(res=>{ let d=false; const f=()=>{ if(!d){ d=true; res(); } }; if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(f); setTimeout(f,v.requestVideoFrameCallback?170:40); });   // первый показанный кадр
 const rewind=v=>{ try{ v.pause(); if(v.currentTime>.01) v.currentTime=0; }catch(e){} };
 const idleOn=()=>{ const v=F; v.loop=true; if(v.playbackRate!==1) v.playbackRate=1; if(!RM()&&v.paused&&v.readyState>=2) v.play().catch(()=>{}); };   // скорость покоя всегда 1
 const seeked=v=>new Promise(r=>{ if(v.currentTime<=.01) return r(); const d=()=>{ v.removeEventListener('seeked',d); r(); }; v.addEventListener('seeked',d); setTimeout(d,300); try{ v.currentTime=0; }catch(e){ d(); } });
 const visible=v=>(parseFloat(v.style.opacity)||0)>.02;
 /* Покой без шва круга (как idle/idle2 в rocco-flow.js). Играющий покой F подходит к концу (за IDLE_LEAD) — второй Bk, стоящий скрытым на кадре 0 с готовым кадром, запускается; как только пошёл (≥0,05 с),
    меняем их жёстко в одном кадре (поза покоя одна, разница кадров — зерно кодирования), прежний перематывается в 0 уже скрытым. Перемотки на виду нет. Не вышло — у F работает его loop, как раньше. */
 const IDLE_LEAD=.3;
 const idleSwap=()=>{ const A=F, B=Bk; B.style.zIndex=A.style.zIndex||0; if(visible(A)){ op(B,1,0); op(A,0,0); } F=B; Bk=A; A._go=0; try{ A.pause(); A.currentTime=0; }catch(e){} };   // виден прежний — меняем в одном кадре; закрыт роликом — меняем только «кто играет»
 const idleStep=()=>{ if(!Bk||S.dead||S.ex||document.hidden||RM()) return; const A=F, B=Bk, d=A.duration||dur('idle');
  if(A.paused&&A.readyState>=2&&!A.ended&&!A.seeking) A.play().catch(()=>{});   // покой не должен стоять (вкладка вернулась из фона)
  if(!B._go){ if(visible(A)&&!A.paused&&A.readyState>=2&&A.currentTime>=d-IDLE_LEAD&&B.paused&&B.readyState>=2&&!B.seeking&&Math.abs(B.currentTime)<.03){ B._go=performance.now(); B.play().catch(()=>{ B._go=0; }); } }   // закрыт роликом (opacity 0) — второй не запускаем: лишнее декодирование в ответственный момент
  else if(!B.paused&&B.currentTime>=.05) idleSwap();
  else if(performance.now()-B._go>1500){ B._go=0; try{ B.pause(); B.currentTime=0; }catch(e){} } };   // второй не завёлся — остаётся loop у первого
 const idleT=Bk?setInterval(()=>{ try{ idleStep(); }catch(e){ console.error(e); } },60):0;   // 60 мс: старт второго за 0,3 с до конца и жёсткая смена не требуют чаще
 /* ролик ушёл — под ним снова покой: берём тот экземпляр, который сейчас не перематывается (круг мог кончиться под роликом) */
 const idleBack=()=>{ if(Bk&&F.seeking&&!Bk.seeking&&Bk.readyState>=2){ const A=F; F=Bk; Bk=A; A._go=0; Bk.style.opacity='0'; try{ A.pause(); A.currentTime=0; }catch(e){} } F.style.zIndex=0; op(F,1,0); if(Bk) op(Bk,0,0); idleOn(); };
 function leave(P,ms){   // ролик P уходит в покой (под ним идёт H-idle): сверху гаснет, потом перематывается на кадр 0
  if(!P||P.over) return; P.over=true; if(S.cur===P) S.cur=null; clearInterval(S.mon); P.v.onended=null;
  idleBack(); P.v.style.zIndex=++S.z; op(P.v,0,ms,()=>settle(F));
  setTimeout(()=>{ if(!S.cur||S.cur.v!==P.v) rewind(P.v); },ms+70); }
 const pick=n=>{ const a=V[n], b=V[n+'2']; return b&&S.cur&&S.cur.v===a?b:a; };   // у ролика с парой — свободный экземпляр
 /* start: opt {loop, instant, arm}. instant — без наплыва (Рокко не виден или шов в позе покоя), arm — встать на кадр 0 и ждать P.go() */
 async function start(n,opt){
  const v=pick(n); if(!v||S.dead||!canPlay()||v.readyState<2) return null;
  if(S.cur&&S.cur.v===v) return S.cur;
  v.loop=false; v.playbackRate=Math.max(.0625,1/SLOW());   // никогда не быстрее: скорость роликов Рокко не меняется (только для съёмки в замедлении — window.__slow)
  try{ await seeked(v); if(!opt.arm) await v.play(); else v.pause(); }catch(e){ return null; }
  if(!opt.arm) await frame(v);
  if(S.dead||!canPlay()||S.warping||(opt.chain&&(S.cur!==opt.chain||!opt.chain.loop))){ try{ v.pause(); }catch(e){} return null; }   // chain — продолжение петли: только если прежний круг всё ещё идёт и петля не кончилась
  const prev=S.cur, P={n,v,over:false,loop:!!opt.loop,chained:false}; if(prev){ prev.over=true; prev.v.onended=null; }
  S.cur=P; swapIn(v,opt.instant?0:FD());
  if(prev){ if(opt.instant){ op(prev.v,0,0); rewind(prev.v); } else setTimeout(()=>rewind(prev.v),FD()+80); }
  P.go=async()=>{ if(P.over||S.dead||!canPlay()||S.warping) return; try{ await v.play(); }catch(e){} watch(P); };
  if(!opt.arm) watch(P);
  return P; }
 function watch(P){   // конец ролика — в покой; петля — за 0,2 с до конца второй экземпляр уже стартует и встаёт на место (оба кадра — поза покоя); ролик встал — тоже в покой
  const v=P.v; v.onended=()=>{ if(S.cur!==P) return;
   if(P.n==='cheerIn'){ start('cheer',{loop:!S.cheerEnd,instant:true}).then(Q=>{ if(!Q&&S.cur===P) leave(P,FD()); }); return; }   // вход кончился (его последний кадр ≡ первый кадр петли) — петля жёстко
   if(P.n==='cheer'&&!P.loop){ start('cheerOut',{instant:true}).then(Q=>{ if(!Q&&S.cur===P) leave(P,FD()); }); return; }   // последний круг кончился — выход в покой роликом, а не наплывом
   leave(P,P.n==='cheerOut'?0:FD()); };   // выход кончился: его последний кадр ≡ покой — жёсткая смена
  let lt=-1, lw=performance.now(); clearInterval(S.mon);
  S.mon=setInterval(()=>{ if(S.cur!==P||P.over){ clearInterval(S.mon); return; } const t=v.currentTime, w=performance.now();
   if(P.loop&&!P.chained&&t>=dur(P.n)-.2/SLOW()){ P.chained=true; start(P.n,{loop:true,instant:true,chain:P}); }
   if(!v.paused&&!document.hidden&&!v.ended){ if(t!==lt){ lt=t; lw=w; } else if(w-lw>2500*SLOW()) leave(P,FD()); } else lw=w; },25); }
 function toRest(ms){ if(S.cur) leave(S.cur,ms==null?FD():ms); S.maxArm=null; }
 function finishLoop(){ const P=S.cur; if(P&&P.n==='cheer') P.loop=false; }   // счётчик остановился: круг доигрывается до покоя, ролик уходит наплывом сам (onended)

 /* ---- кадр шоу ---- */
 function draw(t,c){
  if(S.dead||!S.box) return;
  const vis=c.vis==null?1:c.vis, lamp=c.lamp==null?.6:c.lamp, intro=sm(t/.5), gain=S.fallback?sm((t-.3)/.5):1;
  const show=S.fit&&!(c.vis!=null&&vis<=.001);
  light.style.visibility=el.style.visibility=show?'visible':'hidden';
  el.style.setProperty('--rkop',(vis*gain).toFixed(3)); light.style.setProperty('--rkop',(vis*gain).toFixed(3));
  el.style.setProperty('--rkb',lerp(.92,.74+.3*lamp,intro).toFixed(3));   // у зала .92; дальше яркость следует свету сцены
  light.style.setProperty('--rkl',((.22+.78*lamp)*intro).toFixed(3));   // прожектор «проявляет» Рокко: с темноты первых кадров до полного света за 0,5 с
  if(!S.fit||c.exact) return;
  /* ролики по часам шоу: каждое событие один раз */
  if(c.warp||c.st||!canPlay()){ S.warping=!!c.warp; if(S.cur) toRest(c.warp?FD()*1.5:FD()); return; }   // пропуск, статичный режим, Turbo/Quick: ролика нет, Рокко в покое
  S.warping=false;
  if(c.tM<Infinity&&t>=c.tM){   // MAX: свет пропал — ролик меняется, пока Рокко не виден, и идёт, когда свет вернулся
   if(!S.maxOn&&vis<.05){ S.maxOn=true; S.cheerEnd=true; start('max',{loop:false,instant:true,arm:true}).then(P=>{ if(P) S.maxArm=P; else toRest(0); }); }
   else if(!S.maxOn&&t>=c.tM+.75){ S.maxOn=true; S.cheerEnd=true; start('max',{loop:false}).then(P=>{ if(!P) toRest(); }); }   // темноту не поймали (кадры шли редко): ролик меняется обычным наплывом
   if(S.maxArm&&vis>.12){ const P=S.maxArm; S.maxArm=null; P.go(); }
   return; }
  if(!c.live){ if(S.cheerOn&&!S.cheerEnd){ S.cheerEnd=true; finishLoop(); } return; }   // часы шоу встали (конец): круг доигрывается сам
  /* радость нужна с tC до tF: нет ролика (ещё не стартовал, не успел загрузиться, ролик встал и ушёл в покой) — запускаем заново, не чаще раза в 0,6 с; после tF новых кругов нет, текущий доигрывается */
  if(!S.cheerEnd&&t>=c.tC&&!S.cur&&!S.starting&&performance.now()>=S.retryAt){ S.cheerOn=true; S.starting=true; start('cheerIn',{instant:true}).then(P=>{ S.starting=false; if(!P){ S.retryAt=performance.now()+600; } }); }
  if(S.cheerOn&&!S.cheerEnd&&t>=c.tF){ S.cheerEnd=true; finishLoop(); } }
 /* раскадровка и запись: ролики не играют, а ставятся на кадр по расписанию (то же расписание, как функция времени) */
 const seekTo=(v,t)=>new Promise(res=>{ if(v.readyState<1||Math.abs(v.currentTime-t)<.01) return res(); let d=false; const f=()=>{ if(d) return; d=true; v.removeEventListener('seeked',f); res(); }; v.addEventListener('seeked',f); setTimeout(f,900); try{ v.currentTime=Math.max(0,Math.min(t,(v.duration||t)-.001)); }catch(e){ f(); } });
 function exact(t,c){
  if(S.dead||!S.box) return Promise.resolve();
  draw(t,{...c,exact:true});
  const D=dur('cheer'), tM=c.tM<Infinity?c.tM+.62:Infinity;   // BW-max начинается, когда вернулся свет
  let name='idle', ph=0, al=1;
  if(c.st||RM()||!(K()>=1)||!S.fit){ name='idle'; }
  else if(t>=tM){ const Dm=dur('max'); if(t<tM+Dm){ name='max'; ph=t-tM; al=clamp(ph/FADE_S)*clamp((Dm-ph)/FADE_S); } }
  else if(t>=c.tC&&!(c.tM<Infinity&&t>=c.tM)){ const end=c.tC+Math.max(1,Math.ceil((c.tF-c.tC)/D))*D; if(t<end){ name='cheer'; ph=(t-c.tC)%D; al=clamp((t-c.tC)/FADE_S)*clamp((end-t)/FADE_S); } }
  const waits=[]; S.ex=true; F=V.idle; Bk=V.idle2||null;   // раскадровка: покой один (idle), второй скрыт, смена кругов отключена
  for(const n of Object.keys(V)){ const v=V[n]; v.pause(); v.loop=false;
   if(n==='idle'){ op(v,1,0); v.style.zIndex=0; waits.push(seekTo(v,RM()?0:t%dur('idle'))); }
   else if(n===name){ v.style.zIndex=5; v.style.transition='none'; v.style.opacity=al.toFixed(3); waits.push(seekTo(v,ph)); }
   else op(v,0,0); }
  return Promise.all(waits); }

 /* ---- запуск ---- */
 for(const n of Object.keys(V)){ if(n!=='idle2') wake(V[n],urlOf(a,ext,n)); }
 if(V.idle2){ const go=()=>{ if(!V.idle2.dataset.woke){ V.idle2.dataset.woke='1'; wake(V.idle2,urlOf(a,ext,'idle2')); } }; V.idle.addEventListener('playing',go,{once:true}); setTimeout(go,4000); }   // второй покой грузим после того, как заиграл первый: первому кадру Рокко не делить канал
 { const v=V.idle; v.style.opacity='1'; v.style.zIndex=0; v.autoplay=!RM(); if(!RM()) v.play().catch(()=>{});   // покой играет сразу, как у зала и виден с первого же кадра ролика (пока кадра нет, видео прозрачное); «меньше движения» — первый кадр
  const fin=()=>{ if(!S.loaded){ S.loaded=true; v.style.opacity='1'; v.style.zIndex=0; _ready(); } };
  const chk=()=>{ if(v.readyState>=2){ if(v.requestVideoFrameCallback&&!RM()) v.requestVideoFrameCallback(fin); else fin(); return true; } return false; };
  if(!chk()) ['loadeddata','canplay','playing'].forEach(ev=>v.addEventListener(ev,chk));
  setTimeout(()=>{ v.style.opacity='1'; v.style.zIndex=0; _ready(); },900); }   // дольше не ждём: без Рокко шоу тоже можно
 layout();
 return {el,light,ready,draw,exact,layout,restNow:()=>toRest(FD()),get box(){ return S.box; },get fit(){ return S.fit; },get cover(){ return S.cover; },get fallback(){ return S.fallback; },
  state:()=>({cur:S.cur&&S.cur.n,cheerOn:S.cheerOn,cheerEnd:S.cheerEnd,maxOn:S.maxOn,t:S.cur?S.cur.v.currentTime:0,fit:S.fit}),
  destroy:()=>{ S.dead=true; clearInterval(S.mon); clearInterval(idleT); clearTimeout(S.swapT); all().forEach(v=>{ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} }); el.remove(); light.remove(); }}; }

/* прогрев: ролики лежат в кэше игры к моменту шоу (что не успело — пропускается, Рокко стоит в покое) */
let warmed=false;
function warm(a,ext){ if(warmed) return; warmed=true; try{ Object.keys(CLIPS).filter(n=>!CLIPS[n].of).forEach((n,i)=>setTimeout(()=>{ try{ const v=document.createElement('video'); v.muted=true; v.preload='auto'; wake(v,urlOf(a,ext,n)); }catch(e){} },n==='max'?12000:i*1500)); }catch(e){} } // fb/perf: по одному (покой, радость, потом MAX через 12 с), а не три файла разом
window.BigWinRocco={create,warm,CLIPS};
})();
