/* Blackout Party — приветствие, окошко 3, часть B: «Камеры».
   Правило бонуса (владелец 2026-10-12): «Камеры» — «Кухня» плюс одно новое: камеры записывают кражи. Клетки поля — мониторы; где Рокко своровал, на мониторе загорается значок ×2, повторная кража там — ×4, ×8…;
   значки остаются на весь бонус, выигрыш умножается на значки под ним (они слетаются в один ярлык «×N» и падают на сумму). Рокко по полю не ходит: на мониторах он появляется только в момент кражи.
   Часть B показывает это тремя бесплатными спинами подряд на одних и тех же восьми мониторах (владелец 2026-10-12: «в мультфильме приветствия дольше показать рост: ×2 → ×4 → ×8, чтобы игрок увидел, как рамка из золотой
   становится янтарной»; цвета ступеней не меняли — их выбрал владелец в CamRec). Окошко FREE SPINS считает спины: 10 → 9 → 8. После части A «Кухня» в том же окошке; welcome.js, D3:
     0) четыре приглашения на поле загораются; поле становится мониторами (CamRec.mount: помехи, фон — комната охраны, мониторы включаются волной, как кинескопы);
     1) спин 1 (FREE SPINS 10): выигрыш — 8 колпаков, сумма; кража (CamRec.steal); мониторы зажигают ×2 (CamRec.rec) — кремовая рамка на пустых экранах, пауза;
     2) спин 2 (9): поле падает целиком, на тех же восьми мониторах выигрыш — 8 кексов; CamRec.showMath: значки ×2 слетаются в «×16» на сумму ($0.30 → $4.80); кража; рамки растут до ×4 — янтарные, пауза;
     3) спин 3 (8): поле падает целиком, на тех же мониторах 8 пицц; showMath: «×32» ($0.50 → $16.00); кража; рамки растут до ×8 — янтарные с двойным кольцом; последняя пауза, затемнение в конец круга.
   Каждое повышение идёт на пустых мониторах (символы уже украдены, шум экрана кончился): видно только прежний цвет рамки и новый, с паузой на новом цвете до следующего спина.

   Подключение (index.html?bpv=0b88879c, после welcome.js; cams-rec.js — раньше):   <script src="welcome-cams.js"></script>
   welcome.js в D3 зовёт  WelcomeCams.d3(root, stage, KIT)  — KIT это помощники демонстраций (Board, Bracket, brState, frameStage, Amount, amtSet, Fsw, el, seg, lerp, eo, eob…).
   Возвращает {T, still, frame(t,fz), dispose()}: T — длина части B (сек); still — момент части B для статичного кадра «меньше движения» (последняя пауза: ×8); frame(t) получает время от начала части B (t<0 — идёт часть A: B прячется и гасит подсветку строки); frame(t≥0) возвращает true,
   welcome.js тогда гасит слои части A. dispose() — при закрытии приветствия (снять мониторы CamRec). Нет window.CamRec в момент показа — мониторы не ставятся (cams-rec.js подключён в index.html после этого файла, поэтому модуль ищется при вызове, а не при сборке окошка).
   Подпись окошка — две строки .cl в .cap; строка той части, что идёт, светлая, другая притушена (.cap[data-part]). «Меньше движения»: part не ставится, кадр окошка — часть B на последней паузе (welcome.js берёт X.still): мониторы ×8 с двойным кольцом, FREE SPINS 8.

   Как это связано со временем. Кадр демонстрации — функция времени t (стоп-кадр Demos.freeze, «меньше движения»). CamRec — живой модуль на Web Animations: его вызовы (steal, rec, showMath) запускаются, когда t проходит
   нужную отметку, и идут в реальном времени; куда делись символы, считает onTake (в раскадровке fz — по времени), значки в раскадровке ставит recAll без полётов. Поэтому в стоп-кадре видны состояния
   (мониторы, значки, символы, сумма), но не сами полёты (Рокко на мониторе, ярлык ×N) — их видно только в живом круге.
   Поле стоит в «настоящих» пикселях: держатель .cmf внутри экрана масштабируется обратно на 1/k (экран 240×150 растянут на k), поэтому у CamRec (его слои «ярлык» и «летящие значки» лежат в body) размеры
   клеток, шрифты значков и положения совпадают с тем, что видно на экране. Поле принадлежит только окошку 3: CamRec — один на страницу; мониторы стоят, пока играет часть B, и снимаются на её границах. */
((W)=>{
'use strict';
const GX=54, GY=20, CW=28, CH=22, GG=2, PW=CW+GG, PH=CH+GG, GWd=6*PW, GHd=5*PH; // поле в «родных» пикселях экрана 240×150: клетка 28×22, зазор 2
const WIN=[[0,0],[0,1],[1,1],[0,2],[1,2],[0,3],[0,4],[1,4]], WI=WIN.map(([r,c])=>r*6+c); // клетки выигрыша: «лесенка» у верха столбцов; во всех трёх спинах выигрывают одни и те же восемь мониторов
const HALL=['cbikoh','gckhbi','ohpcbk','imbtgc','kcibho'];   // зал: 4 приглашения, больше ничего не набирает
const GRID=[                                                  // поле каждого из трёх спинов: в клетках WIN ровно 8 одинаковых, остальные 22 — другие (ни один символ не набирает 8; от спина к спину в каждой клетке другой)
 ['hhhhhg','bhhcho','mopcbt','gtmopc','bcgmto'],              // спин 1: 8 колпаков
 ['kkkkkp','okkpkt','gptghg','chghbh','omtpmc'],              // спин 2: 8 кексов
 ['pppppo','kppcpg','hghbgm','tmtmhk','hobkgo']];             // спин 3: 8 пицц
const BASE=[.40,.30,.50], MARK=[2,4,8];                        // сумма выигрыша спина; значок на мониторах ПОСЛЕ кражи спина (×2 → ×4 → ×8)
const SUMS=[0,WI.length*MARK[0],WI.length*MARK[1]];            // множитель выигрыша в спине 2 и 3 — сумма значков под ним: 8×2 = ×16, 8×4 = ×32 (спин 1 идёт без значков)
const TXT=BASE.map(v=>'$'+v.toFixed(2)), FIN=BASE.map((v,n)=>'$'+(v*(SUMS[n]||1)).toFixed(2)); // надпись суммы: до ярлыка и после счёта ($0.30 → $4.80, $0.50 → $16.00)

/* ---- время части B (сек от её начала) ---- */
const T_IN=.15, T_LATE=.45, T_LOCK=1.0;                        // зал: символы падают, приглашения загораются
const T_GL=[1.4,1.85], T_SWAP=1.62;                           // помехи, смена комнаты (за пиком помех); мониторы включаются волной сразу за сменой
const T_FS=1.95;                                              // окошко FREE SPINS (10)
/* Три спина идут цепочкой: выигрыш (TW) → [showMath (TM)] → кража (TS) → рамки растут (TK) → пауза на новом цвете → следующий спин (TSP: FREE SPINS −1, поле падает целиком).
   Длины шагов: D_WIN — выигрыш на виду до ярлыка; D_MATH — showMath (≈0,74 с у CamRec при 8 значках) и D_AMT — итоговая сумма на виду до кражи; D_REC — от начала кражи до роста рамок
   (кража 0,88 с, рамки растут, когда экраны уже схлопнулись в линию: видно прежний цвет, потом новый); D_HOLD — пауза на новом цвете до падения нового поля (рост 0,42 с + 0,21 с волной по экранам, на нём
   глаз ещё удерживается), D_DROP — падение нового поля до выигрыша. Первый спин: выигрыш без значков, шаг до кражи 0,45 с. */
const D_WIN=.34, D_MATH=.76, D_AMT=.12, D_REC=.76, D_HOLD=.65, D_DROP=.74;
const TW=[2.2], TM=[0], TS=[], TK=[], TSP=[T_SWAP];            // выигрыш, showMath, кража, рамки растут, начало спина — по спинам 0..2
TS[0]=TW[0]+.42; TK[0]=TS[0]+D_REC;
for(let n=1;n<3;n++){ TSP[n]=TK[n-1]+D_HOLD; TW[n]=TSP[n]+D_DROP; TM[n]=TW[n]+D_WIN; TS[n]=TM[n]+D_MATH+D_AMT; TK[n]=TS[n]+D_REC; }
const T_STILL=TK[2]+.9, T_END=TK[2]+1.15, TB=T_END+.35;         // кадр «меньше движения» — последняя пауза (×8 уже стоит); затемнение в конце круга
/* Пополнение после кражи (как collapseRefill в игре): рамка сперва вырастает на пустых экранах (RF0 с), затем в восемь опустевших мониторов падают новые случайные символы — не выигравшие. Они уходят вместе с полем следующего спина. */
const REFILL=['bctgmopk','tmcgbpoh','gcbmtkho'], RF0=.28, RF_DUR=.3, REF_S=.72, REF_UP=.03; // по спинам; порядок — как в WI; ни одного символа выигрыша спина (h / k / p)
const OUT=.26, OUTY=5.6, IN_D=.06, IN_DUR=.36, IN_Y=5;           // старые символы уходят вниз за 0,26 с; новые падают с высоты 5 рядов (0,38 с)

function d3(root,st,K){
 const {el,seg,clamp,lerp,eo,ei,eio,eob,A,SYMU,RM,Board,Bracket,brState,frameStage,Amount,amtSet,Fsw}=K, CR=()=>window.CamRec; // CamRec грузится после этого файла (index.html?bpv=0b88879c), а приветствие строится при первой отрисовке — ищем модуль в момент вызова
 if(!Board||!Amount||!Fsw) return null;
 const bay=root.closest('.bay'), cap=bay&&bay.querySelector('.cap'), hd=root.querySelector('.camhd>span');
 const k=(root.clientWidth/240)||1;                                  // во сколько раз экран растянут (меняется только перерисовкой приветствия)
 const wrap=el('div','cmw'); st.append(wrap);
 ['rocco/cam-C2.webp','rocco/cam-C3.webp','rocco/paw.png'].forEach(f=>{ const i=new Image(); i.decoding='async'; i.src=A+f; }); // кадры камеры и лапа: готовы к первой краже

 /* ---------- подпись окошка: часть, что идёт, светлая ---------- */
 let part=-1;
 const setPart=n=>{ if(part===n) return; part=n; if(cap&&!RM()) cap.dataset.part=n; };
 let hot=false; const setHot=on=>{ if(on===hot) return; hot=on; root._hot&&root._hot(on,1); };
 /* шапка: «CAM 03 · HALL» → «CAM 04 · CAMERAS» (своя строка, строку части A не трогаем: она ведёт своё имя комнаты) */
 const mh=el('span','cmh','CAM 03 · HALL'); mh.style.display='none'; if(hd) hd.parentNode.append(mh);
 let hdTxt='';
 const setHd=(on,txt)=>{ if(hd) hd.style.display=on?'none':''; mh.style.display=on?'':'none'; if(on&&txt!==hdTxt){ hdTxt=txt; mh.textContent=txt; } };

 /* ---------- слои: зал и комната охраны — один каркас, фон меняется под помехами ---------- */
 const F=frameStage(wrap,'bg-hall-landscape');
 const sc_=GWd/862, bgS=el('div','cambg cmbgs'); // проём стойки в bg-security-landscape — (337,118)–(1199,677) из 1536×1024: ложится ровно на поле
 bgS.style.cssText=bpvT`background:url(${A}bg-security-landscape.webp) ${(GX-337*sc_).toFixed(2)}px ${(GY-118*sc_).toFixed(2)}px/${(1536*sc_).toFixed(2)}px ${(1024*sc_).toFixed(2)}px no-repeat;opacity:0`;
 F.bg.after(bgS);
 const hold=el('div','cmf'); hold.style.cssText=bpvT`left:${GX}px;top:${GY}px;width:${GWd*k}px;height:${GHd*k}px;transform:scale(${1/k})`; F.cctv.append(hold); // внутри — настоящие пиксели
 const B=Board(hold,{x:0,y:0,cw:CW*k,ch:CH*k,g:GG*k,id:'ft5'}), ft=B.root.querySelector('.ft');
 for(let r=0;r<5;r++) for(let c=0;c<6;c++){ const e=el('div','cell'); e.style.cssText=bpvT`position:absolute;left:${c*B.pw+B.g/2}px;top:${r*B.ph+B.g/2}px;width:${B.cw}px;height:${B.ch}px`; B.root.append(e); } // клетки для CamRec (он берёт их размеры; своих стилей у них нет)
 const NB={cw:CW,ch:CH,g:GG,pw:PW,ph:PH,x:GX,y:GY,sx:c=>GX+c*PW+PW/2,sy:r=>GY+r*PH+PH/2}; // те же клетки в родных пикселях — для уголков, суммы и значка над ними
 const G0=[], SET=[[],[],[]], REF=[[],[],[]], ALL=[];
 HALL.forEach((row,r)=>[...row].forEach((ch,c)=>{ const s=B.spr(ch,c,r); s.g=0; s.isInv=ch==='i'; s.late=s.isInv&&r===4; G0.push(s); }));
 GRID.forEach((grid,n)=>grid.forEach((row,r)=>[...row].forEach((ch,c)=>{ const s=B.spr(ch,c,r); s.n=n; s.isW=WIN.some(w=>w[0]===r&&w[1]===c); SET[n].push(s); })));
 REFILL.forEach((str,n)=>[...str].forEach((ch,j)=>{ const s=B.spr(ch,WI[j]%6,WI[j]/6|0); s.n=n; s.ref=true; REF[n].push(s); }));
 ALL.push(...REF[0],...REF[1],...REF[2],...G0,...SET[0],...SET[1],...SET[2]);
 for(const s of ALL) if(!s.isInv&&s.n!=null){ s.w=B.cw*.84; s.h=B.ch*.84; s.e.style.width=s.w+'px'; s.e.style.height=s.h+'px'; } // на мониторах символ целиком внутри стекла (решение владельца 2026-10-12: символы не заходят на рамку монитора); в зале — как на поле
 for(const s of ALL) if(s.ref){ s.w=B.cw*REF_S; s.h=B.ch*REF_S; s.dy=-B.ch*REF_UP; s.e.style.width=s.w+'px'; s.e.style.height=s.h+'px'; } // в отмеченном мониторе нижнюю треть закрывает метка ×N и рамка: новый символ мельче и стоит выше центра, одинаково во всех восьми, целиком над меткой
 const INV=G0.filter(s=>s.isInv), brs=INV.map(s=>Bracket(F.hud,NB,s.r,s.c)), pings=INV.map(()=>{ const e=el('i','ping'); F.hud.append(e); return e; });
 const tears=[0,1].map(()=>{ const e=el('i','tear'); F.cctv.append(e); return e; });
 const amt=Amount(F.hud,NB.sx(2.1),NB.sy(2.15),TXT[0]), amtB=amt.querySelector('b'); amt.classList.add('cmamt'); // сумма: <b> — цель ярлыка ×N (CamRec анимирует его масштаб и счёт числа)
 const fs=Fsw(F.hud,4,40);
 const hash=(a,b)=>{ const x=Math.sin(a*127.1+b*311.7)*43758.5453; return x-Math.floor(x); };
 const OPT={K:1,fast:false,rm:false};                                // CamRec: обычная скорость, не зависит от настроек игры под приветствием

 /* ---------- состояние ---------- */
 let active=false, prev=-1, mounted=false, took=[false,false,false], done={}, bgOn=null, recKey='', fly=null;
 const fire=(key,t0,t,fn)=>{ if(done[key]||t<t0) return; done[key]=1; try{ fn(t-t0>.4); }catch(e){ console.error(e); } }; // отметка пройдена; «опоздали» больше чем на 0,4 с — сразу итог (CamRec fast)
 function flyEl(on){ // слой летящих значков и ярлыка (body) — шрифт ярлыка подогнан под экран (ui.css, #cr-fly[data-wel]); пока играет часть B
  fly=fly||document.getElementById('cr-fly'); if(!fly&&on){ fly=document.createElement('div'); fly.id='cr-fly'; document.body.append(fly); } if(!fly) return;
  if(on){ fly.dataset.wel='1'; fly.style.setProperty('--cmtfs',Math.max(7,CH*k*.6).toFixed(1)+'px'); } else { delete fly.dataset.wel; fly.style.removeProperty('--cmtfs'); } }
 function mountNow(anim){
  if(mounted||!CR()||!CR().mount(B.root)) return; mounted=true;
  if(anim) [...B.root.querySelectorAll('.cr-skin>.cr-m')].forEach((m,i)=>{ const r=i/6|0, c=i%6; // мониторы включаются волной от левого верхнего угла: линия → растяжка → картинка
   try{ m.animate([{opacity:0,transform:'scale(1.05,.03)',filter:'brightness(2.6)'},{opacity:1,transform:'scale(1.05,.03)',filter:'brightness(2.6)',offset:.3},{opacity:1,transform:'scale(1,1)',filter:'brightness(1.5)',offset:.72},{opacity:1,transform:'none',filter:'brightness(1)'}],{duration:380,delay:(r*.5+c)*30,fill:'backwards',easing:'cubic-bezier(.3,.7,.3,1)'}); }catch(e){} }); }
 function unmountNow(){ if(!mounted) return; mounted=false; try{ CR().finish(); CR().recAll([]); CR().unmount(); CR().recAll([]); }catch(e){} recKey=''; }
 function hardReset(){ unmountNow(); done={}; took=[false,false,false]; bgOn=null; recKey=''; ALL.forEach(s=>{ s._cl=null; s._z=false; }); amtB._t=null; amtB.textContent=TXT[0]; fs._n=-1; }
 function activate(){ active=true; hardReset(); flyEl(true); }
 function deactivate(){ active=false; hardReset(); flyEl(false); }

 function frame(t,fz){
  if(t<0){ if(active) deactivate(); wrap.style.display='none'; prev=-1; setPart(0); setHot(false); setHd(false); return false; }
  if(!active) activate(); else if(t<prev-1e-6) hardReset();
  prev=t;
  wrap.style.display='block'; setPart(1); setHd(true,t<T_SWAP?'CAM 03 · HALL':'CAM 04 · CAMERAS');
  const q=Math.floor(t*30), inCam=t>=T_SWAP;
  wrap.style.opacity=(seg(t,0,.22)*(1-seg(t,T_END,TB))).toFixed(3); // из темноты (как в части A после Кухни) и в темноту перед новым кругом

  /* ---- помехи при смене комнаты: рывки картинки и яркости, полосы ---- */
  const fk=Math.sin(Math.PI*seg(t,T_GL[0],T_GL[1])), g=fk>.02?fk:0;
  if(g){ const tr=`translate(${((hash(q,1)-.5)*6*g).toFixed(2)}px,${((hash(q,2)-.5)*2.6*g).toFixed(2)}px)`; F.cctv.style.transform=F.hud.style.transform=tr; F.cctv.style.filter=`brightness(${(1+(hash(q,3)-.4)*.9*g).toFixed(2)}) contrast(${(1+.4*g).toFixed(2)})`;
   tears.forEach((e,i)=>{ const on=g>.15&&hash(q,10+i)>.25; e.style.display=on?'block':'none'; if(on){ e.style.top=(hash(q,20+i)*140).toFixed(1)+'px'; e.style.height=(3+hash(q,30+i)*9).toFixed(1)+'px'; e.style.background=(i+q)%2?'rgba(190,255,230,.24)':'rgba(0,0,0,.5)'; } }); }
  else if(F.cctv.style.transform||F.cctv.style.filter){ F.cctv.style.transform=F.hud.style.transform=F.cctv.style.filter=''; tears.forEach(e=>{ e.style.display='none'; }); }
  if(bgOn!==inCam){ bgOn=inCam; F.bg.style.opacity=inCam?0:1; bgS.style.opacity=inCam?1:0; ft.style.opacity=inCam?0:1; }

  /* ---- мониторы: ставятся при смене комнаты; в раскадровке — без анимации, значки по времени ---- */
  if(inCam&&!mounted) mountNow(!fz); else if(!inCam&&mounted) unmountNow();
  const tk=n=>fz?t>=TS[n]+.7:(took[n]||t>=TS[n]+.72); // символы ушли: по сигналу CamRec (экраны уже закрыты помехами), запасной срок — по часам
  if(mounted){
   if(fz){ const a=new Array(30).fill(0), v=t>=TK[2]+.3?MARK[2]:t>=TK[1]+.3?MARK[1]:t>=TK[0]+.25?MARK[0]:0; if(v) WI.forEach(i=>{ a[i]=v; }); const key=a.join(); if(key!==recKey){ recKey=key; CR().recAll(a); } }
   else for(let n=0;n<3;n++){
    if(n) fire('m'+n,TM[n],t,late=>CR().showMath(WI,SUMS[n],{...OPT,fast:late,target:amtB,amount:{el:amtB,from:BASE[n],to:BASE[n]*SUMS[n],fmt:v=>'$'+v.toFixed(2)}}));
    fire('s'+n,TS[n],t,late=>CR().steal(WI,{onTake:()=>{ took[n]=true; }},{...OPT,fast:late}));
    WI.forEach((i,j)=>fire('r'+n+j,TK[n]+j*.015,t,late=>CR().rec(i,MARK[n],{...OPT,fast:late}))); } }

  /* ---- символы ---- */
  const lit0=t>=T_LOCK&&t<T_SWAP+.05, winN=n=>t>=TW[n]&&t<TS[n]+.35;
  const cls=(s,w)=>{ if(s._cl!==w){ s._cl=w; s.e.classList.toggle('win',w==='win'); s.e.classList.toggle('dim',w==='dim'); } };
  const put=(s,row,op,sc)=>{ if(op<=0){ if(s._z) return; s._z=true; } else s._z=false; B.put(s,row,{op,sc:sc||1,dy:s.dy||0}); };
  const outP=(s,T0)=>{ const d=T0+(4-s.r)*.012+s.c*.01; return seg(t,d,d+OUT); }; // старые символы новому спину уходят вниз, нижние первыми
  for(const s of G0){ const d=s.late?T_LATE:T_IN+s.c*.065+(4-s.r)*.026, du=s.late?.5:.46, pin=seg(t,d,d+du);
   put(s,s.r-(s.late?8:6.2)*(1-eob(pin)),pin>0&&!inCam?1:0,s.isInv?1+.07*Math.sin(Math.PI*seg(t,T_LOCK,T_LOCK+.5)):1); cls(s,lit0?(s.isInv?'win':'dim'):''); }
  for(const s of SET[0]){ const d=T_SWAP+.1+(s.r*.5+s.c)*.03; let op=inCam?seg(t,d,d+.14):0, row=s.r;
   if(s.isW){ if(tk(0)) op=0; } else { const p=outP(s,TSP[1]); if(p>=1) op=0; else row+=OUTY*ei(p); }
   put(s,row,op); cls(s,winN(0)?(s.isW?'win':'dim'):''); }
  for(let n=1;n<3;n++) for(const s of SET[n]){ const d=TSP[n]+IN_D+s.c*.03+(4-s.r)*.06, p=seg(t,d,d+IN_DUR); let op=p>0?1:0, row=s.r-IN_Y*(1-eob(p));
   if(s.isW){ if(tk(n)) op=0; } else if(n===1){ const o=outP(s,TSP[2]); if(o>=1) op=0; else row+=OUTY*ei(o); } // спин 3 до конца круга стоит
   put(s,row,op); cls(s,winN(n)?(s.isW?'win':'dim'):''); }
  for(let n=0;n<3;n++) for(const s of REF[n]){ const d=TK[n]+RF0+s.c*.025+(1-s.r)*.04, p=seg(t,d,d+RF_DUR); let op=p>0?1:0, row=s.r-IN_Y*(1-eo(p)); // новые символы падают (без отскока: приземление без дрожи) в опустевшие мониторы под выросшей рамкой
   if(n<2){ const o=outP(s,TSP[n+1]); if(o>=1) op=0; else if(o>0) row+=OUTY*ei(o); }
   put(s,row,op); cls(s,''); }
  INV.forEach((s,i)=>{ const d=s.late?T_LATE:T_IN+s.c*.065+(4-s.r)*.026, du=s.late?.5:.46, pp=seg(t,d+du*.72,d+du*.72+.5), e=pings[i]; e.style.cssText=bpvT`left:${NB.sx(s.c)}px;top:${NB.sy(s.r)}px;opacity:${(inCam?0:.75*(1-pp)*(pp>0?1:0)).toFixed(3)};transform:translate(-50%,-50%) scale(${lerp(.4,1.9,eo(pp)).toFixed(3)})`; });
  brs.forEach((b,i)=>brState(b,t,T_LOCK+i*.05,T_SWAP-.2));
  setHot(t>=T_LOCK&&t<T_SWAP+.1);

  /* ---- сумма (цель ярлыка), окошко FREE SPINS ---- */
  { const n=t>=TSP[2]?2:t>=TSP[1]?1:0, o=seg(t,TW[n]+.05,TW[n]+.25)*(1-seg(t,TS[n]+.3,TS[n]+.55)); // сумма держится и во время кражи (она в другом месте поля), гаснет к концу кражи
   amtSet(amt,o,lerp(.82,1,eob(seg(t,TW[n]+.05,TW[n]+.35))));
   const want=n&&t>=TM[n]?(fz?(t>=TM[n]+.55?FIN[n]:TXT[n]):null):TXT[n]; // после старта showMath число считает CamRec (в раскадровке — по времени)
   if(want!==null&&amtB._t!==want){ amtB._t=want; amtB.textContent=want; } }
  { const pw_=clamp(eob(seg(t,T_FS,T_FS+.35)),0,1.1), cnt=t>=TSP[2]?8:t>=TSP[1]?9:Math.round(10*eo(seg(t,T_FS+.15,T_FS+.8))); // FREE SPINS: 10 → 9 → 8, на каждом новом спине
   fs.style.opacity=seg(t,T_FS,T_FS+.2).toFixed(3); fs.style.transform=`scale(${lerp(.7,1,pw_).toFixed(3)})`; if(fs._n!==cnt){ fs._n=cnt; fs._v.textContent=cnt; }
   fs.classList.toggle('pop',(t>T_FS+.8&&t<T_FS+1.4)||(t>=TSP[1]&&t<TSP[1]+.6)||(t>=TSP[2]&&t<TSP[2]+.6)); }
  return true; }

 function dispose(){ deactivate(); wrap.style.display='none'; }
 return {T:TB,still:T_STILL,frame,dispose};
}

window.WelcomeCams={T:TB,d3};
})(window);
