// Blackout Party — коллект (2026-10-11): как Рокко забирает выигравшие символы с поля.
// Зовётся из ui.js, steal(): window.bpCollect.run(list, gone, o, ctx). Возвращает true, если забрал сам; false — тогда работает старый код ui.js (swallowSteal / pawGrab).
// Старый вид для сравнения: ?collect=old. Варианты (параметр адреса ?collect=):
//   swallow — Рокко глотает (все выигрыши, символы летят в раскрытую пасть);
//   paw1    — «Горсть»: одна лапа из-за нижней рамки, символы стягиваются в ладонь, кулак, лапа уходит вниз (крупнее и тяжелее при большом выигрыше);
//   paw2    — «Хваты»: рука со стороны Рокко (справа) делает 1–4 быстрых хвата по соседним группам символов;
//   mix     — по размеру выигрыша: мелкий — глотает, средний — «Хваты», крупный — «Горсть».
// Исход раунда не трогаем: сюда приходят уже решённые клетки, здесь только показ. Время — как везде в игре: длительности умножает K() (Turbo/Quick короче),
// «пропуск» — без полётов, «меньше движения» — символы просто гаснут (fade).
(()=>{
const DEFAULT='mix';
const PAW_REACT='I-look'; // что делает Рокко, пока лапа забирает символы: смотрит (поворот головы), без руки — иначе рядом с лапой тянется его собственная рука (раньше A-rub = H-grab, владелец 2026-10-11: «лапа справа раздваивается»); null — стоит в покое
const MIX_PAW2=1.2; // mix: выигрыш шага от этого числа ставок (но меньше «крупного» ui.js, там ≥10×) забирает рука со стороны, мельче — глотает Рокко (мелких выигрышей большинство)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const mulberry=seed=>{ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
const log=(k,v)=>{ if(!window.__cDebug) return; try{ (window.__cLog=window.__cLog||[]).push([k,Math.round(performance.now()),v]); }catch(e){} }; // журнал времени — только при window.__cDebug (проверки в браузере)
const MODES=['swallow','paw1','paw2','mix'];
// Какой вариант: адрес ?collect=… главнее, потом выбор в тест-панели (sessionStorage 'bp-collect'), потом DEFAULT. 'old' — прежний коллект ui.js
const modeOf=q=>{ let m=q&&q.get&&q.get('collect'); if(!m){ try{ m=sessionStorage.getItem('bp-collect'); }catch(e){} } return (m==='old'||MODES.includes(m))?m:DEFAULT; };
const done=a=>a?a.finished.catch(()=>{}):Promise.resolve();
const flt=F=>(F&&F!=='none')?F+' ':'';
const node=(tag,cls)=>{ const n=document.createElement(tag); if(cls) n.className=cls; return n; };
const tf=(x,y,r,m)=>`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${m.toFixed(3)})`;
// cubic-bezier как в CSS, но числом: нужен, когда путь лапы собирается из ключевых кадров сам (одна кривая на весь переезд — без остановок на стыках отрезков)
function bezier(x1,y1,x2,y2){ const cx=3*x1, bx=3*(x2-x1)-cx, ax=1-cx-bx, cy=3*y1, by=3*(y2-y1)-cy, ay=1-cy-by, X=t=>((ax*t+bx)*t+cx)*t, Y=t=>((ay*t+by)*t+cy)*t, dX=t=>(3*ax*t+2*bx)*t+cx;
 return x=>{ if(x<=0) return 0; if(x>=1) return 1; let t=x; for(let i=0;i<8;i++){ const e=X(t)-x; if(Math.abs(e)<1e-5) return Y(t); const d=dX(t); if(Math.abs(d)<1e-6) break; t-=e/d; }
  let lo=0, hi=1; t=x; for(let i=0;i<30;i++){ const v=X(t); if(Math.abs(v-x)<1e-5) break; if(v<x) lo=t; else hi=t; t=(lo+hi)/2; } return Y(t); }; }

// ---------- общие куски ----------
// Рамка картинки символа на экране сейчас, БЕЗ чтения раскладки. Замер getBoundingClientRect перед каждым запуском давал ~31 вынужденный пересчёт раскладки за спин (по одному на символ: перед замером шли запись вмятины и снятие дрожи,
// после — клон и вмятина следующего символа). Клетка на экране — это её рамка в начале (e.sb — из steal() в ui.js), сдвинутая и сжатая подготовкой prep(): translate(tx,ty) scale(s) вокруг центра клетки;
// картинка внутри клетки по центру (её рамка e.ib и фильтр e.F снимает sortByDist одним проходом ДО записей), поэтому рамка картинки получается теми же шагами. Поза подготовки — по прогрессу самой анимации (с учётом easing): тот же момент, что видит браузер при замере. Без prep (swallowBlind) поза — начало.
// null — рамок нет (запасной замер в mkFly). Сверка с замером — при window.__cDebug (журнал flyRect: разница в px).
function prepPose(e){ const K=e.pk; if(!K) return [0,0,1]; let p=0; try{ const pr=e.pa&&e.pa.effect.getComputedTiming().progress; if(pr!=null) p=pr; }catch(_){}
 if(p<=0) return [0,0,1]; if(p>=1) return K[2].slice(1); const a=p<=.3?K[0]:K[1], b=p<=.3?K[1]:K[2], u=p<=.3?p/.3:(p-.3)/.7; return [lerp(a[1],b[1],u),lerp(a[2],b[2],u),lerp(a[3],b[3],u)]; }
function flyRect(e){ const sb=e.sb, ib=e.ib; if(!sb||!ib) return null; const [tx,ty,k]=prepPose(e), cx=sb.left+sb.width/2, cy=sb.top+sb.height/2, ix=ib.left+ib.width/2, iy=ib.top+ib.height/2, w=ib.width*k, h=ib.height*k, x=cx+tx+k*(ix-cx), y=cy+ty+k*(iy-cy);
 return {left:x-w/2,top:y-h/2,width:w,height:h}; }
// Символ как отдельная картинка поверх страницы. Вид берём у картинки в клетке; фильтр подсветки выигрыша запоминаем в начале (после снятия подсветки он бы поменялся).
function mkFly(X,e){
 const img=e.o.sp.querySelector('img'); let rc=flyRect(e);
 if(e.jit){ try{ e.jit.cancel(); }catch(_){} e.jit=null; } // дрожь снимаем: у повёрнутой картинки рамка шире, клон встал бы крупнее на ~6% (запасной замер без готовых рамок — после снятия)
 if(!rc) rc=img.getBoundingClientRect();
 else if(window.__cDebug){ const g=img.getBoundingClientRect(); log('flyRect',[+(rc.left-g.left).toFixed(2),+(rc.top-g.top).toFixed(2),+(rc.width-g.width).toFixed(2),+(rc.height-g.height).toFixed(2)]); } // проверка: расчёт против замера (только при window.__cDebug)
 const d=node('div','cfly');
 Object.assign(d.style,{left:rc.left+'px',top:rc.top+'px',width:rc.width+'px',height:rc.height+'px'});
 const im=document.createElement('img'); im.alt=''; im.src=img.currentSrc||img.src; im.style.filter=e.F||''; d.append(im); document.body.append(d); return {d,im,rc}; }
// Клетка, откуда символ ушёл: тёмная вмятина на ткани (символ оторвали), быстро затягивается
function dent(X,e){ const L=X.LAYER; if(!L||!e.o.sp.isConnected) return; const d=node('i','cdent'), s=e.o.sp.style;
 Object.assign(d.style,{left:s.left,top:s.top,width:s.width,height:s.height}); L.prepend(d);
 done(X.animA(d,[{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'scale(1)',offset:.22},{opacity:0,transform:'scale(1.1)'}],{duration:680,easing:'ease-out',fill:'forwards'})).then(()=>d.remove()); }
// Пыль с ткани у кулака: несколько мягких пятен расходятся и тают
function puff(X,host,x,y,ps,n){ if(X.RM()) return; const rng=mulberry((x*3+y*5)|0);
 for(let i=0;i<n;i++){ const p=node('i','cpuff'), r=ps*(.5+rng()*.35), a=(i/n)*6.283+rng(); Object.assign(p.style,{left:x+'px',top:y+'px',width:r+'px',height:r+'px'}); host.prepend(p); // пыль ПОД рукой (на ткани): поверх гладкого металла светлая дымка читалась призраком-двойником кисти
  const dx=Math.cos(a)*ps*.85, dy=Math.sin(a)*ps*.5-ps*.12;
  done(X.animA(p,[{transform:'translate(-50%,-50%) scale(.35)',opacity:0},{transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy*.5}px)) scale(.8)`,opacity:.55,offset:.25},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.2)`,opacity:0}],{duration:560+rng()*160,easing:'ease-out',fill:'forwards'})).then(()=>p.remove()); } }

// Дуга полёта. Точка отсчёта — центр символа в начале (после отрыва от ткани); dx,dy — смещение до цели.
// Замах (чуть назад и вверх, символ собирается), потом разгон по дуге — медленно в начале, быстро у цели (инерция), вращение нарастает, у цели вытягивается
// по направлению движения. gulp — в конце сжимается и темнеет (уходит в горло); land — в конце гасит вытягивание и «садится» (в ладонь).
function arcKF(dx,dy,o){
 const L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L; let nx=-uy, ny=ux; if(ny>0){ nx=-nx; ny=-ny; } // нормаль к пути — в ту сторону, где «выше»
 let cx=dx*.4+nx*o.bulge, cy=dy*.4+ny*o.bulge-o.lift; if(o.endDrop){ cx=dx*.86; cy=dy-o.endDrop; } /* endDrop — в рот: управляющая точка над целью, дуга заканчивается сверху вниз (символ падает в рот), а не вбок через лицо */ const ta=o.ta, N=clamp(Math.ceil((o.dur||500)/11),24,56), kf=[]; // ключевой кадр примерно на каждый кадр экрана (≈11 мс), но не меньше 24
 const th0=Math.atan2(cy,cx)*180/Math.PI; let prev=th0; // направление в начале полёта; угол собирается непрерывно (без скачков на 360° у atan2 на ±180°: иначе спрайт за один шаг делал полный оборот вытягивания)
 for(let i=0;i<=N;i++){ const t=i/N; let x,y,s,rot,th,st=1,op=1;
  if(t<=ta){ const w=Math.pow(Math.sin(Math.PI*t/ta),2); x=-ux*o.rec*w; y=-uy*o.rec*w-o.hop*w; s=1+.07*w; rot=-o.sgn*6*w; th=th0; } // замах: sin² — скорость в начале и в конце ровно ноль, к началу полёта (он тоже стартует с нуля) стыкуется без скачка скорости
  else { const k=(t-ta)/(1-ta), u=Math.pow(k,o.pow), a=2*(1-u)*u, b=u*u; x=a*cx+b*dx; y=a*cy+b*dy;
   const bx=2*(1-2*u)*cx+2*u*dx, by=2*(1-2*u)*cy+2*u*dy; th=Math.atan2(by,bx)*180/Math.PI;
   s=lerp(1,o.endS,Math.pow(u,1.7)); rot=o.spin*Math.pow(u,1.25); st=1+o.stretch*Math.pow(u,1.4)*(o.land?Math.max(0,1-Math.pow(Math.max(0,(k-.8)/.2),1.5)):1);
   if(o.gulp&&k>.88){ const g=(k-.88)/.12; s*=1-.6*g*g; } if(o.gulp&&i===N) op=0;
   if(o.land&&k>.9){ const g=(k-.9)/.1; s*=1+.12*Math.sin(Math.PI*g); } }  // «плюх» в ладонь: чуть вспухает и садится
  while(th-prev>180) th-=360; while(th-prev<-180) th+=360; prev=th;
  kf.push({transform:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${th.toFixed(1)}deg) scale(${(s*st).toFixed(3)},${(s/Math.sqrt(st)).toFixed(3)}) rotate(${(rot-th).toFixed(1)}deg)`,opacity:op,offset:t}); }
 const nn=kf.length-1, pa=/translate\(([-\d.]+)px,([-\d.]+)px\)/, a=pa.exec(kf[nn].transform), b=pa.exec(kf[nn-1].transform); kf.vEnd=a&&b?[(a[1]-b[1])/((o.dur||500)/N),(a[2]-b[2])/((o.dur||500)/N)]:[0,0]; // скорость в конце дуги, px на мс (по двум последним ключевым кадрам): падение в рот продолжает её, а не стартует с нуля
 return kf; }

// Запуск одного символа к цели m=[x,y] (экран). Возвращает {p — промис «прилетел», d — картинка, last — конечный transform, cx,cy — откуда стартовал, dx,dy — на сколько сдвинулся}.
// o: dur — мс (до умножения на K), gulp/land — см. arcKF, keep — не убирать картинку по прилёту (лапа держит кучку), z — слой.
function launch(X,e,m,o){
 const {d,im,rc}=mkFly(X,e), ps=o.ps, rng=o.rng, cx=rc.left+rc.width/2, cy=rc.top+rc.height/2, jx=(rng()-.5)*(o.jit??.16)*ps, jy=(rng()-.5)*(o.jit??.16)*.75*ps;
 const dx=m[0]+jx-cx, dy=m[1]+jy-cy, sgn=dx>=0?1:-1; if(o.z) d.style.zIndex=o.z; const spinV=sgn*(o.spin||(210+rng()*210));
 const kf=arcKF(dx,dy,{bulge:(.12+rng()*.14)*Math.hypot(dx,dy)*(rng()<.5?1:-1),lift:ps*(.25+rng()*.3)*(o.liftK??1),rec:ps*(.06+rng()*.04),hop:ps*.05,sgn,ta:.14,pow:o.pow||1.6,dur:o.dur,
  spin:spinV,endS:o.endS??.46,stretch:o.stretch??.24,gulp:!!o.gulp,land:!!o.land,endDrop:o.endDrop||0});
 const a=X.animA(d,kf,{duration:o.dur,easing:'linear',fill:'forwards'}), F=flt(e.F);
 if(o.gulp) X.animA(im,[{filter:`${F}brightness(1)`},{filter:`${F}brightness(1)`,offset:.84},{filter:`${F}brightness(.18)`}],{duration:o.dur,easing:'linear',fill:'forwards'});
 const r={d,im,cx,cy,last:kf[kf.length-1].transform,dx,dy,v:kf.vEnd,a,spin:spinV,endS:o.endS??.46};
 r.p=done(a).then(()=>{ if(window.__cDebug){ const q=d.getBoundingClientRect(); log('land',[Math.round(q.left+q.width/2),Math.round(q.top+q.height/2),Math.round(q.width),Math.round(m[0]),Math.round(m[1])]); } if(!o.keep) d.remove(); });
 return r; }

// Порядок: ближайшие к цели — первыми (волна идёт от цели наружу)
function sortByDist(list,m){ list.forEach(e=>{ e.dist=Math.hypot(e.rc.left+e.rc.width/2-m[0],e.rc.top+e.rc.height/2-m[1]); }); const o=list.slice().sort((a,b)=>a.dist-b.dist); o.forEach((e,i)=>{ e.rank=i; e.rng=mulberry((e.r*17+e.c*29+i*7)|0); });
 // читаем всё одним проходом (рамка картинки, фильтр подсветки), пишем вторым — раньше чтение и запись чередовались по символам
 o.forEach(e=>{ const img=e.o.sp.querySelector('img'); e.sb=e.rc; e.ib=img.getBoundingClientRect(); e.F=getComputedStyle(img).filter; if(!(e.sb.width>0&&e.sb.height>0)) e.sb=e.ib=null; }); // e.sb — рамка клетки, снятая в steal() (ui.js) тем же проходом: второй раз не читаем
 o.forEach(e=>{ e.o.sp.querySelector('img').style.filter=e.F; }); return o; }

// Подготовка: символ отрывается от ткани — приседает, вздрагивает, поднимается и дрожит. Волной от ближнего к дальнему (delay), чтобы читалось «очередью».
function prep(X,e,ps,delay,toward){ const sp=e.o.sp, img=sp.querySelector('img'), rng=e.rng; sp.style.zIndex=3;
 const ux=toward[0],uy=toward[1];
 e.pk=[[0,0,0,1],[.3,-ux*.012*ps,.02*ps-uy*.012*ps,.972],[1,ux*.03*ps,-.12*ps+uy*.02*ps,1.11]]; // те же ключи числами: по ним flyRect считает позу клетки без чтения раскладки
 const a=e.pa=X.animA(sp,[{transform:'translate(0,0) scale(1)'},{transform:`translate(${-ux*.012*ps}px,${.02*ps-uy*.012*ps}px) scale(.972)`,offset:.3},{transform:`translate(${ux*.03*ps}px,${-.12*ps+uy*.02*ps}px) scale(1.11)`}],{duration:340,delay,easing:'cubic-bezier(.3,.75,.3,1)',fill:'forwards'});
 if(img){ const A=.016*ps, kf=[{transform:'translate(0,0) rotate(0deg)',easing:'ease-in-out'}]; for(let i=0;i<5;i++) kf.push({transform:`translate(${((rng()-.5)*2*A).toFixed(1)}px,${((rng()-.5)*2*A*.6).toFixed(1)}px) rotate(${((rng()-.5)*5).toFixed(1)}deg)`,easing:'ease-in-out'});
  kf.push({transform:'translate(0,0) rotate(0deg)'}); // дрожь: мягкое подрагивание ~7 Гц от нулевой позы и обратно. Раньше easing:'steps(1,end)' стоял на всём цикле и держал первый ключ: символ получал одну случайную позу (до 3,5°) и стоял, а при вылете клон вставал без поворота — щелчок
  e.jit=X.animA(img,kf,{duration:300+rng()*70,delay:delay+260,iterations:Infinity,easing:'linear'}); }
 return a; }

// ---------- рот Рокко по кадрам ----------
// assets/rocco/H-swallow4.mouth.json?bpv=53f4732f (tools/swallow_mouth.py): на каждый кадр ролика — контур чёрного нутра пасти (px кадра 1280×720), центр и радиус вписанной окружности, плюс рамка головы и глаз (face). Голова в ролике качается, пасть раскрывается 2,50 с и смыкается 4,08 с:
// символ входит не в одну точку, а в настоящее нутро этого кадра. MX,MY — опорная точка кадра (как SW.mx/SW.my в ui.js: S.mouth() даёт её на экране); ролик в зале зеркальный, поэтому экранный x = опорный + (MX − x)·масштаб.
const MX=964, MY=234;
let MOUTH=null, mouthReady=null;
const loadMouth=()=>mouthReady||(mouthReady=fetch(assetUrl('H-swallow4.mouth.json')).then(r=>r.ok?r.json():null).then(d=>{ if(d&&d.frames&&d.frames.length) MOUTH=d; return MOUTH; }).catch(()=>null));
(window.requestIdleCallback?requestIdleCallback:f=>setTimeout(f,1800))(()=>loadMouth(),{timeout:5000}); // маленький файл (≈8 КБ): грузим в простое страницы
// нутро для кадра, который показан на времени ролика t (с): кадры идут по 1/24 с, виден кадр floor(t·fps); нет такого — ближайший открытый в 3 кадрах от него, иначе null
function mouthAt(t){ const M=MOUTH; if(!M) return null; const i=Math.floor(t*M.fps+1e-3)-M.f0, F=M.frames; for(let d=0;d<=3;d++){ const f=F[i-d]||F[i+d]; if(f) return f; } return null; }
// контур нутра кадра на экране: массив [x,y]; A — опорная точка на экране (S.mouth()), k — экранных px на px кадра
const mouthPoly=(f,A,k)=>{ const p=f.p, o=[]; for(let i=0;i<p.length;i+=2) o.push([A[0]+(MX-p[i])*k,A[1]+(p[i+1]-MY)*k]); return o; };
function polyBox(P){ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; P.forEach(([x,y])=>{ if(x<x0) x0=x; if(x>x1) x1=x; if(y<y0) y0=y; if(y>y1) y1=y; }); return {x0,y0,x1,y1,w:x1-x0,h:y1-y0}; }
const polyArea=P=>{ let s=0; for(let i=0,n=P.length;i<n;i++){ const a=P[i], b=P[(i+1)%n]; s+=a[0]*b[1]-b[0]*a[1]; } return s/2; };
const dot2=(a,b)=>a[0]*b[0]+a[1]*b[1];
// луч из точки p по единичному направлению u: расстояние до первого пересечения с границей многоугольника (из нутра — до края) или null
function rayExit(P,p,u){ let best=1e9; for(let i=0,n=P.length;i<n;i++){ const a=P[i], b=P[(i+1)%n], ex=b[0]-a[0], ey=b[1]-a[1], den=u[0]*ey-u[1]*ex; if(Math.abs(den)<1e-9) continue;
  const wx=a[0]-p[0], wy=a[1]-p[1], t=(wx*ey-wy*ex)/den, s=(wx*u[1]-wy*u[0])/den; if(t>1e-6&&s>=0&&s<=1&&t<best) best=t; } return best<1e9?best:null; }
const rot2=(v,a)=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a)];
const bez=(a,b,c,d,t)=>{ const m=1-t, w0=m*m*m, w1=3*m*m*t, w2=3*m*t*t, w3=t*t*t; return [w0*a[0]+w1*b[0]+w2*c[0]+w3*d[0],w0*a[1]+w1*b[1]+w2*c[1]+w3*d[1]]; };

// ---------- 1) Рокко глотает ----------
// Символы приподнимаются волной от ближнего к дальнему и дрожат, пока рука зовёт; потом по одному летят к раскрытой пасти. Всё движение — функция времени ролика (S.t()), а не таймеров: пасть качается вместе с головой, символ едет за ней, и они не расходятся.
// Подход (fb/swallow2, отзыв владельца 2026-10-12 «глотание доработай, чтобы нейрослопа не было»):
//  · Путь. Не поверх лица: символ снизу-сбоку идёт к прямому отрезку к рту под углом ≥ AMIN ниже горизонта (с телефона, где поле под Роком, — снизу вверх). Верхний край символа не выше верхней кромки нутра (верхней губы/зубов), пока символ над головой по ширине:
//    глаза, нос и лоб не закрываются никогда. Проверка пути при планировании: не прошла — путь опускается ниже. Скорость растёт к рту (путь ~ τ^PW: втягивает), размер по пути уменьшается плавно, у рта — до размера нутра (SWN.FIT его меньшей стороны).
//  · Вход. С первого касания кромки нутра символ уходит ЗА лицо: видно только то, что лежит перед плоскостью лица или внутри контура нутра ЭТОГО кадра (линия плоскости — через точку входа на кромке, поперёк движения; объединение «половина плоскости ∪ нутро» — clip-path polygon с «мостом»).
//    Выше верхней губы и зубов символ не рисуется — их закрывает кадр ролика. Рывка среза нет: до касания лицо символа не закрывает, дальше срез растёт сам по мере въезда.
//  · Вглубь. Продолжение того же движения в перспективе: расстояние до точки «горла» и размер падают как 1/(1+κ₁x+κ₂x²) (скорость на входе = скорость конца подхода, дальше ускоряется), символ темнеет (b ∝ ρ^2,5, к цвету нутра) и теряет цвет к цвету нутра (оно чёрное), слегка сжимается по перспективе (rotateY),
//    при ρ ≤ RHO — убран (к этому моменту он чёрный и ≈ 0,1 от входа). В нутре одновременно ≤ 1 символа: вход каждого — по кадрам ролика, окно 2,6–3,98 с, шаг GMIN…GMAX; их больше, чем влезает — тесный поток (подход в воздухе внахлёст, во рту по одному).
//  · Вытягивание вдоль движения вместо размытия (до 20 %), без «призраков». Челюсть смыкается в ролике — ничего не дорисовываем (крошек и вспышки нет).
const SWN={PW:1.45,AMIN:40,LW:150,FIT:1.05,RHO:.1,B0:.94,PL:.55,GMIN:.04,GMAX:.22,DIN:.24,AOPEN:.85,PAD:4}; // 2026-10-12 (fb/rocco-fix, «символы летят в пустоту»): символ раньше мельчал (FIT .8, min .14) и темнел (B0 .7) ещё в воздухе, а плоскость «за лицом» шла по самой кромке нутра — у чёрного нутра он исчезал, не дойдя до рта. Теперь крупнее и ярче до самого входа; плоскость PL — глубже кромки (доля пути кромка→центр нутра): символ виден поверх губы, пока центр не вошёл в пасть
// «условное» нутро без данных рта (ролик не загрузился, Turbo/Quick): овал вокруг опорной точки, маски нет
function synHole(A,k){ const w=44*k, h=56*k, bb={x0:A[0]-w/2,y0:A[1]-h*.5,x1:A[0]+w/2,y1:A[1]+h*.5,w,h}; return {P:null,bb,V:[A[0],A[1]+.06*h]}; }
function holeAt(env,t){ let fr=env.M&&mouthAt(t); if(env.M&&!fr){ const F=env.M.frames, i=Math.floor(t*env.M.fps+1e-3)-env.M.f0; fr=i<(F.length>>1)?F.find(Boolean):F.slice().reverse().find(Boolean); } /* вне раскрытия пасти — ближайший открытый кадр: символ у закрытого рта едет с головой, а не прыгает при появлении нутра */ if(fr){ const P=mouthPoly(fr,env.A,env.k), bb=polyBox(P); return env.last={P,bb,V:[env.A[0]+(MX-fr.c[0])*env.k,env.A[1]+(fr.c[1]-MY)*env.k+.06*bb.h]}; } return env.last||env.syn; }
// Раскладка одного символа: путь от клетки P0 до рта, касание кромки в момент it.tc. Все числа — в px экрана.
function planItem(env,it,P0,iw,ih){
 const {k,ps,head}=env, md=Math.max(iw,ih), h0=env.holeAt(it.tc), V=h0.V, bb=h0.bb;
 let dx=P0[0]-V[0], dy=P0[1]-V[1]; const L0=Math.hypot(dx,dy)||1; dx/=L0; dy/=L0;
 const sx=Math.abs(dx)>.15?(dx<0?-1:1):env.sx, al=Math.atan2(dy,Math.max(Math.abs(dx),1e-6)), rnd=it.e.rng, sg=rnd()<.6?-1:1, bul=(10+rnd()*9)*Math.PI/180; let pl=null;
 for(let tr=0;tr<5;tr++){
  const a=Math.max(al,(SWN.AMIN+tr*9)*Math.PI/180), din=[sx*Math.cos(a),Math.sin(a)], u=[-din[0],-din[1]], nrm=[-u[1],u[0]];
  const dE=(h0.P&&rayExit(h0.P,V,din))||bb.w*.5, pts=h0.P||[[bb.x0,bb.y0],[bb.x1,bb.y0],[bb.x1,bb.y1],[bb.x0,bb.y1]]; let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9; // размеры нутра вдоль движения и поперёк
  pts.forEach(p=>{ const q=dot2(p,u), r=dot2(p,nrm); if(q<a0) a0=q; if(q>a1) a1=q; if(r<b0) b0=r; if(r>b1) b1=r; });
  const sc=clamp(SWN.FIT*Math.min(a1-a0,b1-b0)/md,.26,.75), rc=.5*sc*md; // размер к касанию кромки: влезает в нутро; rc — половина размера символа вдоль движения (кромка касается передним краем)
  const Lw=Math.max(Math.min(Math.max(SWN.LW*k,2.2*(dE+rc)),L0*.6),dE+rc+4), W=[V[0]+din[0]*Lw,V[1]+din[1]*Lw], vw=[W[0]-P0[0],W[1]-P0[1]], L1=Math.hypot(vw[0],vw[1])||1, t0=rot2([vw[0]/L1,vw[1]/L1],sg*bul);
  const C1=[P0[0]+t0[0]*.34*L1,P0[1]+t0[1]*.34*L1], C2=[W[0]+din[0]*.34*L1,W[1]+din[1]*.34*L1], N=36, pts1=[P0], cl=[0]; // конец дуги — вдоль последнего отрезка (к нутру)
  for(let i=1;i<=N;i++){ const p=bez(P0,C1,C2,W,i/N); pts1.push(p); cl.push(cl[i-1]+Math.hypot(p[0]-pts1[i-1][0],p[1]-pts1[i-1][1])); }
  const S1=cl[N]; pl={din,u,dE,sc,rc,W,pts1,cl,S1,Lw,len:S1+Lw-(dE+rc),V,md,h0,tr};
  let ok=true; for(let i=0;i<=40&&ok;i++){ const q=i/40, p=pathAt(pl,q*pl.len), half=.5*(1-(1-sc)*Math.pow(q,1.5))*md*1.15; if(p[0]>head.xl-half&&p[0]<head.xr+half&&p[1]-half<bb.y0+SWN.PAD*k) ok=false; } // верх символа не выше верхней кромки нутра, пока он над головой по ширине
  if(ok) break; }
 it.pl=pl; pl.md=md; return pl; }
function pathAt(pl,s){ if(s<=pl.S1){ const cl=pl.cl; let lo=0,hi=cl.length-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(cl[m]<=s) lo=m; else hi=m; } const f=(s-cl[lo])/((cl[hi]-cl[lo])||1), a=pl.pts1[lo], b=pl.pts1[hi]; return [lerp(a[0],b[0],f),lerp(a[1],b[1],f)]; }
 const r=s-pl.S1; return [pl.W[0]+pl.u[0]*r,pl.W[1]+pl.u[1]*r]; }
// Объединение «половина плоскости перед лицом ∪ нутро»: один polygon с «мостом» (nonzero: пересечение заливается, мост обходится туда и обратно и площади не даёт). E — точка входа на кромке, u — направление движения (в нутро)
function unionClip(P,E,u){ const n=[-u[1],u[0]], B=4000, q1=[E[0]+n[0]*B,E[1]+n[1]*B], q2=[E[0]-n[0]*B,E[1]-n[1]*B], q3=[q2[0]-u[0]*B,q2[1]-u[1]*B], q4=[q1[0]-u[0]*B,q1[1]-u[1]*B], Q=[q1,q2,q3,q4];
 const H=polyArea(Q)*polyArea(P)>0?P:P.slice().reverse(), pt=p=>`${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`; // оба обхода в одну сторону — иначе вместо объединения получилась бы разность
 return 'polygon('+[...Q,q1,...H,H[0]].map(pt).join(',')+')'; }

async function swallow(X,list,gone,o,S){
 const M=await loadMouth(); // нет данных рта — те же полёты, но к условному нутру и без маски
 const ps=X.pitch(), n=list.length, A=S.mouth(), k=(window.roccoScale&&window.roccoScale())||1, order=sortByDist(list,A);
 const env=mkEnv(X,{A,k,ps,M});
 let tA=S.open+.12, tB=S.shut-.1; // окно входов в нутро (время ролика, с): от «пасть открыта почти полностью» до «челюсть вот-вот пойдёт смыкаться»
 if(M){ const open=M.frames.map((f,i)=>f?[M.f0+i,f.a]:null).filter(Boolean), amax=Math.max(...open.map(q=>q[1])); tA=Math.max(tA,open.find(q=>q[1]>=SWN.AOPEN*amax)[0]/M.fps); }
 const gap=clamp((tB-tA)/n,SWN.GMIN,SWN.GMAX), t0=tA+Math.max(0,tB-tA-n*gap)*.35; // входы по одному с шагом gap; их мало — шаг не длиннее GMAX, начало чуть позже открытия
 const items=order.map((e,i)=>{ const toward=[(A[0]-(e.rc.left+e.rc.width/2)),(A[1]-(e.rc.top+e.rc.height/2))], L=Math.hypot(toward[0],toward[1])||1; prep(X,e,ps,i*26,[toward[0]/L,toward[1]/L]);
  const D=.5+clamp(e.dist/(ps*7),0,1)*.2, tc=t0+i*gap; return {e,i,D,tc,td:tc-D,dIn:Math.min(SWN.DIN,gap*.96),spin:(i%2?-1:1)*(55+e.rng()*95),state:'wait'}; });
 await runItems(X,list,gone,env,items,{clock:{t:()=>window.__swT!=null?window.__swT:S.t(),watch:true},first:()=>X.glowOff(list.map(x=>[x.r,x.c]))});
 list.forEach(x=>{ if(X.BOARD[x.r][x.c]===x.o) gone(x); });
 await S.at(S.shut-.04); } // челюсть начинает смыкаться — выигрыш проглочен, раунд идёт дальше, а он дожёвывает
function mkEnv(X,o){ const {A,k,ps,M}=o, fh=(M&&M.face&&M.face.head)||[874,60,1052,212], G=document.getElementById('cellgrid'), gr=G&&G.getBoundingClientRect(); // fh — рамка головы в кадре ролика; на экране зеркально: левый край (к полю) = правый край в кадре
 const env={A,k,ps,M,last:null,syn:synHole(A,k),head:{xl:A[0]+(MX-fh[2])*k,xr:A[0]+(MX-fh[0])*k},sx:gr&&gr.left+gr.width/2<A[0]?-1:1}; env.holeAt=t=>holeAt(env,t); return env; }
// Общий цикл полётов: по часам clock.t() (время ролика; в Turbo/Quick — своё) каждому символу — положение, размер, яркость, маска. Один цикл на все символы.
function runItems(X,list,gone,env,items,o){ return new Promise(res=>{ const clock=o.clock, nTot=items.length; let alive=true, lt=-1, lw=performance.now(), firstDone=false, fb=null;
  const kill=it=>{ if(it.state==='done') return; it.state='done'; if(it.host) it.host.remove(); };
  const finish=()=>{ if(!alive) return; alive=false; items.forEach(kill); res(); };
  const spawn=it=>{ const e=it.e; if(!firstDone){ firstDone=true; o.first&&o.first(); } dent(X,e);
   const {d,im,rc}=mkFly(X,e), host=node('div','cmouth'), cx=rc.left+rc.width/2, cy=rc.top+rc.height/2; host.style.zIndex=70+(nTot-it.i);
   d.style.cssText=bpvT`position:absolute;left:${rc.left}px;top:${rc.top}px;width:${rc.width}px;height:${rc.height}px;will-change:transform,filter;pointer-events:none`; host.append(d); document.body.append(host); gone(e);
   const pl=planItem(env,it,[cx,cy],rc.width,rc.height), v=pl.len*SWN.PW/it.D, dEr=pl.dE+pl.rc, k1=v/dEr, Z=1/SWN.RHO-1;
   Object.assign(it,{d,im,host,cx,cy,pl,v,k1,k2:Math.max(0,Z-k1*it.dIn)/(it.dIn*it.dIn),F:flt(e.F),state:'fly'}); };
  const step=(it,t)=>{ const pl=it.pl, h=env.holeAt(t), th=Math.atan2(pl.u[1],pl.u[0])*180/Math.PI; let x,y,sc,rot,brt,sat,phi=0,st=1;
   if(t<it.tc){ const tau=clamp((t-it.td)/it.D,0,1), u=Math.pow(tau,SWN.PW), p=pathAt(pl,u*pl.len), w=u*u; x=p[0]+(h.V[0]-pl.V[0])*w; y=p[1]+(h.V[1]-pl.V[1])*w; // голова качается — к рту символ едет вместе с ней
    sc=1-(1-pl.sc)*Math.pow(u,1.5); rot=it.spin*(1-Math.pow(1-tau,2)); const vv=pl.len*SWN.PW*Math.pow(tau,SWN.PW-1)/it.D; st=1+clamp(vv/(pl.md*11),0,1)*.2; brt=1-(1-SWN.B0)*u*u; sat=1-.12*u*u; }
   else { const xx=t-it.tc, rho=1/(1+it.k1*xx+it.k2*xx*xx); if(rho<=SWN.RHO||xx>it.dIn+.1) return kill(it); const r=pl.dE+pl.rc;
    x=h.V[0]+pl.din[0]*r*rho; y=h.V[1]+pl.din[1]*r*rho; sc=pl.sc*rho; rot=it.spin; brt=SWN.B0*Math.pow(rho,1.3); sat=.4+.6*rho; phi=34*(1-rho); st=1+.2*clamp(it.v/(pl.md*11),0,1)*rho; }
   let clip='none'; if(h.P){ const dEn=(rayExit(h.P,h.V,pl.din)||pl.dE)*(1-SWN.PL), E=[h.V[0]+pl.din[0]*dEn,h.V[1]+pl.din[1]*dEn]; if((x-E[0])*pl.u[0]+(y-E[1])*pl.u[1]+.6*sc*pl.md>0) clip=unionClip(h.P,E,pl.u); }
   it.host.style.clipPath=clip;
   it.d.style.transform=`translate(${(x-it.cx).toFixed(1)}px,${(y-it.cy).toFixed(1)}px) rotate(${th.toFixed(1)}deg) ${phi>.5?`perspective(${(pl.md*1.6).toFixed(0)}px) rotateY(${phi.toFixed(1)}deg) `:''}scale(${(sc*st).toFixed(3)},${(sc/Math.sqrt(st)).toFixed(3)}) rotate(${(rot-th).toFixed(1)}deg)`;
   it.im.style.filter=`${it.F}brightness(${brt.toFixed(3)}) saturate(${sat.toFixed(2)})`;
   if(window.__cDebug&&it.lt!==t){ it.lt=t; log('sw',[it.i,+t.toFixed(4),+x.toFixed(1),+y.toFixed(1),+(sc*pl.md).toFixed(1),+brt.toFixed(3),clip==='none'?0:1,t<it.tc?0:1]); } };
  const frame=now=>{ if(!alive) return; if(X.fast()) return finish();
   let t=clock.t();
   if(clock.watch&&window.__swT==null){ if(fb) t=fb.t0+(now-fb.w0)/1000/Math.max(.05,X.K()); else if(t!==lt){ lt=t; lw=now; } else if(!document.hidden&&now-lw>1500) fb={t0:Math.max(t,Math.min(1e9,...items.filter(i=>i.state==='wait').map(i=>i.td))),w0:now}; } // ролик встал (не загрузился, завис) — прежде символы дрожали и просто исчезали (fb/tricks 2026-10-12, «трясутся и просто исчезают»); теперь дальше летят к пасти по настенным часам с того же времени: исчезновения без полёта нет
   for(const it of items) if(it.state==='wait'&&t>=it.td) spawn(it);
   for(const it of items) if(it.state==='fly') step(it,t);
   if(items.every(it=>it.state==='done')) return finish();
   requestAnimationFrame(frame); };
  window.__swFrame=()=>frame(performance.now()); requestAnimationFrame(frame); }); }
// Запасной путь без ролика рта (Turbo/Quick, портретный зал со старым Рокко, ролик не загрузился): тот же подход снизу, не по лицу, тот же разгон и уход вглубь к точке рта; ролика нет — нутра нет, маски нет:
// символ уходит в точку рта, мельчает, темнеет и пропадает чёрным пятнышком. Часы — свои (время идёт в обычных секундах: длительности Turbo/Quick короче в K раз)
async function swallowBlind(X,list,gone,o){
 X.react(o.name||'R-grab'); if(X.K()>=1) await X.sleep(260); // в Turbo/Quick Рокко не реагирует (react молчит) — ждать нечего
 const m=X.roccoPoint(), ps=X.pitch(), k=(window.roccoScale&&window.roccoScale())||ps/95, order=sortByDist(list,m), n=list.length, env=mkEnv(X,{A:m,k,ps,M:null}), gap=n>14?.035:.055;
 const items=order.map((e,i)=>{ const D=.43+clamp(e.dist/(ps*7),0,1)*.2; return {e,i,D,tc:.02+D+i*gap,td:.02+i*gap,dIn:.11,spin:(i%2?-1:1)*(55+e.rng()*95),state:'wait'}; }), t0=performance.now();
 await runItems(X,list,gone,env,items,{clock:{t:()=>window.__swT!=null?window.__swT:(performance.now()-t0)/1000/Math.max(.05,X.K())},first:()=>X.glowOff(list.map(x=>[x.r,x.c]))});
 list.forEach(x=>{ if(X.BOARD[x.r][x.c]===x.o) gone(x); }); }

// ---------- лапа: общие части ----------
// Спрайт лапы (tools/paw_match_build.py из ролика paw-oc1 → assets/rocco/paw3-palm.webp?bpv=3ac68c93, paw3-fingers.webp, paw3-arm.webp, paw3.json). Три слоя вместо одного целого кадра:
//   предплечье (полоса меха без шва) и ладонь с манжетой — ПОД символами, 20 кадров ПАЛЬЦЕВ (сжимаются в кулак) — ПОВЕРХ них: согнутые пальцы закрывают символы в ладони, открытые лежат по краям.
// Рука — рука Рокко из его роликов (H-wave, H-grab6, H-idle): латунная ладонная пластина, тонкие пальцы из бронзовых звеньев с тёмными шарнирами и коническими кончиками, ржавая бронзовая манжета, предплечье в потёртом меху;
// открытая и закрытая — кадры ОДНОГО ролика (раньше: мохнатая лапа W-grab, у кулака — белые когти, «две разные руки»). Старый спрайт (paw2-*, tools/paw_rebuild.py) остаётся в репозитории: PAWF='paw2'.
// В спрайте ладонь не уезжает при сжатии (кадры выровнены), поэтому кучка символов остаётся на ней. Размеры (в пикселях спрайта) — в PW из paw3.json.
const PAWF=(()=>{ let v=null; try{ v=(typeof q!=='undefined'&&q&&q.get)?q.get('paw'):null; }catch(e){} if(!v){ try{ v=new URLSearchParams(location.search).get('paw'); }catch(e){} } if(!v){ try{ v=sessionStorage.getItem('bp-paw'); }catch(e){} } return v==='old'?'paw2':v==='gold'?'paw3':v==='fur5'?'paw5':'paw4'; })(); // владелец 2026-10-12: основная — paw4 (форма прежней руки, мех; ?paw=fur5 — новая мохнатая с нуля) // набор файлов спрайта в assets/rocco: paw5 — мохнатая кисть Рокко целиком (мех на тыле, ладони и пальцах, без металла, tools/paw5_build.py, fb/paw-fur 2026-10-12; основной); ?paw=fur4 — paw4 (латунная paw3, перетекстурированная мехом); прежнее: paw4 — рука Рокко, цвет сведён к рукам из роликов (тёмная состаренная бронза) и предплечье с изгибом (основной, fb/rocco-fix 2026-10-12); ?paw=gold (тест-панель, sessionStorage bp-paw) — прежняя золотая латунь paw3 с прямой «трубой»; ?paw=old — мохнатая лапа paw2
let PW=null; // метрики спрайта; ax,ay — центр «чаши» ладони (сюда ложатся символы, вокруг этой точки поворачивается рука)
const assetUrl=n=>(typeof A!=='undefined'?A:'../assets/')+'rocco/'+n;
let pawReady=null, pawBmp=null, palmBmp=null, pawGen=0; // кисть — холсты: ладонь рисуется один раз, пальцы — по кадру; обе картинки расшифрованы заранее (ImageBitmap), чтобы webp не расшифровывался заново на каждом коллекте (≈70 мс процессора)
const loadImg=n=>new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>(i.decode?i.decode().catch(()=>{}):Promise.resolve()).then(()=>res(i)); i.onerror=rej; i.src=assetUrl(n); });
const loadPaw=()=>pawReady||(pawReady=(async()=>{ try{
  const [meta,palm,fing]=await Promise.all([fetch(assetUrl(PAWF+'.json')).then(r=>r.json()),loadImg(PAWF+'-palm.webp'),loadImg(PAWF+'-fingers.webp')]);
  const bm=i=>window.createImageBitmap?createImageBitmap(i).catch(()=>i):i; [palmBmp,pawBmp]=await Promise.all([bm(palm),bm(fing)]);
  PW={...meta,ax:meta.bowl[0],ay:meta.bowl[1],armOv:60*meta.sc}; window.bpCollect&&window.bpCollect.paw&&(window.bpCollect.paw.PW=PW);
  await loadImg(PAWF+'-arm.webp').catch(()=>{}); // полоса предплечья — фон CSS, но расшифровываем заранее
  return true; }catch(e){ pawReady=null; return false; } })());
{ const idle=()=>(window.requestIdleCallback?requestIdleCallback:f=>setTimeout(f,1500))(()=>loadPaw(),{timeout:4000}); if(window.BPLoad) BPLoad.whenOpen('audio',idle,2500); else idle(); } // грузим и расшифровываем заранее, в простое страницы — после роликов и звуков первого спина (fb/perf, loadgate.js); лапе нужен спрайт 8400×470 (≈16 МБ после расшифровки)
function pawHost(){ const G=document.getElementById('cellgrid'); if(!G||!G.isConnected) return null; const gr=G.getBoundingClientRect(); let h=document.getElementById('cpawclip');
 if(!h){ h=node('div'); h.id='cpawclip'; document.body.append(h); } pawKill(h); const gen=++pawGen; Object.assign(h.style,{left:gr.left+'px',top:gr.top+'px',width:gr.width+'px',height:gr.height+'px',display:'block'}); return {h,gr,gen}; }
function pawKill(host){ try{ host.getAnimations({subtree:true}).forEach(a=>{ try{ a.cancel(); }catch(_){} }); }catch(_){} host.innerHTML=''; }
// gen — номер этой лапы: если уже началась следующая (pawHost подняла номер), запоздалая уборка старой её не тронет
const pawOff=(host,gen)=>{ if(gen!=null&&gen!==pawGen) return; if(host.isConnected){ pawKill(host); host.style.display='none'; } };
// уборка по концу анимации ухода (а не по таймеру: на медленной машине таймер срабатывал раньше, чем лапа покидала поле)
const pawLeave=(host,gen,anim)=>{ if(anim&&anim.finished) anim.finished.catch(()=>{}).then(()=>pawOff(host,gen)); else pawOff(host,gen); };
// Лапа: root в центре чаши ладони (повороты вокруг неё), внутри (снизу вверх) предплечье, ладонь, КУЧА символов, пальцы; рядом тень на ткани. k — экранных пикселей на пиксель спрайта, reach — длина руки от ладони до края обрезки
function mkPaw(host,k,reach,ps){ const root=node('div','cpaw'), sh=node('i','cpaw-sh'), arm=node('i','cpaw-arm'), palm=document.createElement('canvas'), heap=node('div','cpaw-heap'), fing=document.createElement('canvas');
 const M=Math.ceil(18+ps*.04), d=Math.min(2,window.devicePixelRatio||1); palm.className='cpaw-hand'; fing.className='cpaw-hand cpaw-fing';
 const cv=(c,w,h)=>{ c.width=Math.round((w*k+2*M)*d); c.height=Math.round((h*k+2*M)*d); Object.assign(c.style,{left:(-PW.ax*k-M)+'px',top:(-PW.ay*k-M)+'px',width:(w*k+2*M)+'px',height:(h*k+2*M)+'px'}); };
 cv(palm,PW.pw,PW.ph); cv(fing,PW.fw,PW.fh);
 const paint=(c,bmp,sx,sw,sh_)=>{ const g=c.getContext('2d'); g.setTransform(d,0,0,d,0,0); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.shadowColor='rgba(0,0,0,.6)'; g.shadowBlur=7*d; g.shadowOffsetX=0; g.shadowOffsetY=5*d; // тень на ткани (как у прежнего drop-shadow(0 5px 7px)); тень пальцев ложится и на символы под ними
  g.drawImage(bmp,sx,0,sw,sh_,M,M,sw*k,sh_*k); return g; };
 paint(palm,palmBmp,0,PW.pw,PW.ph);
 // предплечье: полоса меха из того же ролика, начинается на armOv строк выше шва (под ладонью, тем же мехом) и идёт по оси руки (наклон lean): верх полосы — точка на оси выше шва на armOv
 const th=PW.lean*Math.PI/180, tx=PW.seam[0]+PW.armOv*Math.sin(th), ty=PW.seam[1]-PW.armOv*Math.cos(th), len=Math.max(40,reach-Math.hypot(tx-PW.ax,ty-PW.ay)*k+40);
 Object.assign(arm.style,{left:(tx-PW.ax-PW.armW/2)*k+'px',top:(ty-PW.ay)*k+'px',width:PW.armW*k+'px',height:len+'px',backgroundImage:bpvT`url(${assetUrl(PAWF+'-arm.webp')})`,backgroundSize:`${PW.armW*k}px ${PW.armH*k}px`,transform:`rotate(${PW.lean}deg)`});
 const sw=2.4*ps, shh=1.7*ps; Object.assign(sh.style,{width:sw+'px',height:shh+'px',marginLeft:-sw/2+'px',marginTop:-shh/2+'px',opacity:0});
 root.append(arm,palm,heap,fing); host.append(sh,root);
 return {root,hand:fing,arm,sh,heap,k,ps,x:0,y:0,r:0,m:1,cx:null,M,d,paint:()=>paint(fing,pawBmp,0,PW.fw,PW.fh),frame:-1,sq:0,items:[]}; }
// Поза лапы: p={x,y — центр чаши в координатах поля, r — поворот руки, m — «высота» (1 — на ткани, >1 — поднята к камере), so — сила тени}
// Тень на ткани: чем выше лапа — тем дальше, больше и бледнее; когда прижата — маленькая и тёмная (так читается глубина)
const shadowOf=(paw,p)=>{ const h=clamp((p.m-1)/.14,0,1.4), ox=(.10+.30*h)*paw.ps, oy=(.16+.42*h)*paw.ps; return {transform:`translate(${(p.x+ox).toFixed(1)}px,${(p.y+oy).toFixed(1)}px) scale(${(1+.45*h).toFixed(3)})`,opacity:clamp(.62-.25*h,0,1)*(p.so??1)}; };
function movePaw(X,paw,poses,opt){ const kf=poses.map(p=>({offset:p.o,transform:tf(p.x,p.y,p.r,p.m),easing:p.e||opt.easing||'linear'})), sk=poses.map(p=>({offset:p.o,easing:p.e||opt.easing||'linear',...shadowOf(paw,p)}));
 const L=poses[poses.length-1]; paw.x=L.x; paw.y=L.y; paw.r=L.r; paw.m=L.m;
 X.animA(paw.sh,sk,{duration:opt.dur,delay:opt.delay||0,fill:'forwards'}); return X.animA(paw.root,kf,{duration:opt.dur,delay:opt.delay||0,fill:'forwards'}); }
// Переезд лапы к следующей группе по ОДНОЙ кривой: путь собираем сами по ключевым кадрам (≈ раз в 12 мс) с одним easing на весь переезд.
// Раньше было два отрезка с разными easing: первый кончался нулевой скоростью на середине, второй стартовал с двойной — лапа «спотыкалась» в воздухе.
// Дуга: поднимается к камере (m до 1,17) и уходит по bump sin(πe) в сторону arc; поворот и тень — по тому же e
const E_ARC=bezier(.3,0,.25,1);
function arcPaw(X,paw,A,B,arc,opt){ const n=clamp(Math.ceil(opt.dur/12),8,28), kf=[], sk=[];
 for(let i=0;i<=n;i++){ const t=i/n, e=E_ARC(t), b=Math.sin(Math.PI*e), p={x:lerp(A.x,B.x,e)+arc[0]*b,y:lerp(A.y,B.y,e)+arc[1]*b,r:lerp(A.r,B.r,e),m:1+.17*b,so:1-.4*b};
  kf.push({offset:t,transform:tf(p.x,p.y,p.r,p.m),easing:'linear'}); sk.push({offset:t,easing:'linear',...shadowOf(paw,p)}); }
 paw.x=B.x; paw.y=B.y; paw.r=B.r; paw.m=1;
 X.animA(paw.sh,sk,{duration:opt.dur,delay:opt.delay||0,fill:'forwards'}); return X.animA(paw.root,kf,{duration:opt.dur,delay:opt.delay||0,fill:'forwards'}); }
// Кадр пальцев: рисуем кадр f спрайта в холст (если кадр тот же — ничего не делаем)
function setFrame(paw,f){ f=clamp(Math.round(f),0,PW.n-1); if(paw.frame===f||!pawBmp||!paw.hand.isConnected) return; paw.frame=f; const c=paw.cx||(paw.cx=paw.hand.getContext('2d')), d=paw.d, M=paw.M;
 c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,paw.hand.width,paw.hand.height); c.setTransform(d,0,0,d,0,0); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
 c.shadowColor='rgba(0,0,0,.6)'; c.shadowBlur=7*d; c.shadowOffsetX=0; c.shadowOffsetY=5*d; c.drawImage(pawBmp,f*PW.fw,0,PW.fw,PW.fh,M,M,PW.fw*paw.k,PW.fh*paw.k); }
// Пальцы: кадры спрайта по очереди; быстрее к концу при сжатии (pw 1,15), при разжатии — наоборот (0,8). Время идёт по обычной анимации WAAPI (Skip и K работают как везде), кадр выбираем по её progress;
// paw.sq (0…1) — доля сжатия, по ней куча в ладони сжимается и уходит под пальцы
function curlPaw(X,paw,dur,delay,back){ const N=PW.n, end=back?0:N-1, pw=back?.8:1.15, a=X.animA(paw.hand,[{opacity:1},{opacity:1}],{duration:dur,delay:delay||0,fill:'forwards'});
 if(!a){ setFrame(paw,end); paw.sq=back?0:1; return null; }
 const frameAt=p=>{ const i=Math.min(N-1,Math.floor((N-1)*Math.pow(clamp(p,0,1),1/pw)+1e-6)); return back?N-1-i:i; };
 const tick=()=>{ if(!paw.hand.isConnected) return; const pr=a.effect.getComputedTiming().progress; if(pr!=null){ setFrame(paw,frameAt(pr)); paw.sq=back?1-clamp(pr,0,1):clamp(pr,0,1); } if(a.playState==='finished'||a.playState==='idle'){ setFrame(paw,end); paw.sq=back?0:1; return; } requestAnimationFrame(tick); };
 requestAnimationFrame(tick); return a; }
// Куда рука уходит за край: расстояние от точки (x,y) по направлению u до границы поля w×h
const exitDist=(x,y,ux,uy,w,h)=>{ let t=1e9; if(ux>1e-6) t=Math.min(t,(w-x)/ux); if(ux<-1e-6) t=Math.min(t,(0-x)/ux); if(uy>1e-6) t=Math.min(t,(h-y)/uy); if(uy<-1e-6) t=Math.min(t,(0-y)/uy); return Math.max(0,t); };
const rotFor=(ux,uy)=>Math.atan2(-ux,uy)*180/Math.PI-PW.lean; // рука на спрайте уже наклонена; чтобы её ось смотрела вдоль u, поворачиваем на угол(u) минус наклон
// Вмятина на скатерти под кулаком (крупный выигрыш): тёмное пятно от «шлепка», держится, пока лапа на ткани, потом тает
function press(X,host,x,y,ps,hold){ const p=node('i','cpress'), w=2.7*ps, h=2.0*ps; Object.assign(p.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'}); host.prepend(p);
 const T=hold+520; done(X.animA(p,[{opacity:0,transform:'translate(-50%,-50%) scale(.7)',offset:0},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.12,easing:'ease-out'},{opacity:.9,transform:'translate(-50%,-50%) scale(1.04)',offset:hold/T},{opacity:0,transform:'translate(-50%,-50%) scale(1.15)',offset:1}],{duration:T,fill:'forwards'})).then(()=>p.remove()); }
// Прилёт в ладонь: ладонь на миг продавливается
const dip=(X,paw,UX,UY)=>{ if(paw.dipA&&paw.dipA.playState==='running') return paw.dipA; // одна «продавка» за раз: до 14 наложенных анимаций на одном корне лапы (по одной на символ) браузер не отдавал компоситору
 paw.dipA=X.animA(paw.root,[{transform:tf(paw.x,paw.y,paw.r,paw.m)},{transform:tf(paw.x+UX*.05*paw.ps,paw.y+UY*.05*paw.ps,paw.r,paw.m*.99),offset:.35},{transform:tf(paw.x,paw.y,paw.r,paw.m)}],{duration:150}); return paw.dipA; };

// ---------- куча символов в ладони ----------
// Символы лежат в «чаше» ладони (над подушками, под основаниями пальцев) и едут вместе с лапой: это дети корня лапы. Размер — по чаше: чем больше символов, тем мельче (чтобы все лежали ладонью, а не торчали за неё).
// Порядок укладки — спиралью от центра: поздние ложатся выше (z-index) и слегка на ранние (перекрытие), каждый отбрасывает мягкую тень на ладонь и нижние символы (тень выше у верхних: свет сверху-слева, как у тени лапы на ткани).
// Физика: на корне лапы читаем её позу (из WAAPI), считаем ускорение и сдвигаем символы навстречу ему (инерция) на пружине с небольшим перерегулированием — рывок лапы тянет кучку с отставанием, потом она оседает.
// Гравитация — «вниз в экран»: лапа лежит ладонью вверх на ткани, смотрим сверху, поэтому символы не скатываются по экрану, а лишь сдвигаются инерцией и оседают; тень — вниз-вправо.
const heapSize=(n,ps)=>ps*clamp(.68-.012*n,.3,.52);
function heapSpots(paw,n,rng){ const k=paw.k, rx=PW.bowl[2]*k, ry=PW.bowl[3]*k, out=[]; for(let i=0;i<n;i++){ const a=i*2.39996+(rng()-.5)*.5, r=Math.sqrt((i+.45)/Math.max(1,n))*(.92+rng()*.16); out.push([Math.cos(a)*rx*r,Math.sin(a)*ry*r]); } return out; }
const rotPt=(x,y,deg)=>{ const a=deg*Math.PI/180, c=Math.cos(a), s=Math.sin(a); return [x*c-y*s,x*s+y*c]; };
// Символ на ладонь: берём картинку из конца дуги, переносим в кучу (корень лапы) на то же место на экране и дальше им правит heapLoop
function heapAdopt(X,paw,f,e,spot,i,sz,rng){ const d=f.d, im=f.im, w=d.offsetWidth, h=d.offsetHeight, k=paw.k;
 const rm=new DOMMatrix(getComputedStyle(paw.root).transform), H=document.getElementById('cpawclip').getBoundingClientRect(), sx=f.cx+f.dx-H.left, sy=f.cy+f.dy-H.top, inv=rm.inverse(), lp=inv.transformPoint(new DOMPoint(sx,sy)); // экран → координаты корня лапы
 const sc=f.endS, it={d,im,w,h,sc,spot,i,ox:lp.x-spot[0],oy:lp.y-spot[1],vx:f.v[0]*.12,vy:f.v[1]*.12,rot:f.spin,rv:0,t:0,rng};
 const shd=node('i','csh'); const sw=w*.92, shh=h*.5; Object.assign(shd.style,{width:sw+'px',height:shh+'px',left:(w-sw)/2+'px',top:h*.58+'px'}); d.prepend(shd); it.sh=shd;
 d.style.cssText=bpvT`position:absolute;left:${-w/2}px;top:${-h/2}px;width:${w}px;height:${h}px;z-index:${10+i};will-change:transform;pointer-events:none`; try{ f.a&&f.a.cancel(); }catch(_){}
 paw.heap.append(d); paw.items.push(it); heapPlace(paw,it); if(!paw.loop) heapStart(X,paw); return it; }
// Поза предмета: spot + отставание (ox,oy — в координатах корня), поворот, размер; при сжатии кулака — к центру зоны под пальцами и мельче
function heapPlace(paw,it){ const sq=paw.sq, cc=PW.cover, k=paw.k, ce=sq*sq*(3-2*sq), tx=lerp(it.spot[0]+it.ox,(cc[0]-PW.ax)*k,ce*.9), ty=lerp(it.spot[1]+it.oy,(cc[1]-PW.ay)*k-(.1+.14*(it.i%3))*paw.ps*.3,ce*.9), s=it.sc*(1-.42*ce);
 it.d.style.transform=`translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${it.rot.toFixed(1)}deg) scale(${s.toFixed(3)})`;
 const lift=.5+.5*Math.min(1,it.i/10), o=(.03+.045*lift)*paw.ps, a=-paw.r; const [sox,soy]=rotPt(o,o*1.15,a); // верхние (поздние) символы выше: тень дальше и мягче; смещение тени в экране постоянно (против поворота лапы)
 it.sh.style.transform=`translate(${(sox/s).toFixed(1)}px,${(soy/s).toFixed(1)}px) rotate(${(-it.rot).toFixed(1)}deg)`; it.sh.style.opacity=(.5-.12*lift)*(1-.7*ce); }
function heapStart(X,paw){ let last=performance.now(), pp=null, pv=[0,0], alive=true; paw.loop=true; const OM=.026, ZT=.4, KAP=1.6; // OM — частота пружины, рад/мс (≈ период 0,24 с); ZT — затухание (доля критического): лёгкое перерегулирование; KAP — сколько ускорения лапы передаётся символам (вес)
 const tick=now=>{ if(!alive) return; if(!paw.root.isConnected||X.fast()){ paw.loop=false; return; }
  const K=Math.max(.02,X.K()), dt=Math.min(40,(now-last)/K); last=now; const m=new DOMMatrix(getComputedStyle(paw.root).transform), pos=[m.e,m.f], r=Math.atan2(m.b,m.a)*180/Math.PI, ms=Math.hypot(m.a,m.b)||1;
  let ax=0,ay=0; if(pp&&dt>0){ const vx=(pos[0]-pp[0])/dt, vy=(pos[1]-pp[1])/dt; ax=(vx-pv[0])/dt; ay=(vy-pv[1])/dt; pv=[vx,vy]; const q=Math.hypot(ax,ay), lim=.02; if(q>lim){ ax*=lim/q; ay*=lim/q; } } pp=pos; // ускорение лапы, px/мс² (ограничено: кадры редкие — не взрываем пружину)
  const [lax,lay]=rotPt(ax,ay,-r); // в координаты корня (он повёрнут)
  for(const it of paw.items){ it.t+=dt; const kap=KAP; let ox=it.ox,oy=it.oy,vx=it.vx,vy=it.vy;
   for(let s=dt;s>0;){ const h=Math.min(8,s); s-=h; vx+=(-OM*OM*ox-2*ZT*OM*vx-kap*lax/ms)*h; vy+=(-OM*OM*oy-2*ZT*OM*vy-kap*lay/ms)*h; ox+=vx*h; oy+=vy*h; }
   const lim=.12*paw.ps; ox=clamp(ox,-lim,lim); oy=clamp(oy,-lim,lim); it.ox=ox; it.oy=oy; it.vx=vx; it.vy=vy;
   heapPlace(paw,it); }
  if(window.__cDebug&&paw.items.length) log('heap',[+Math.hypot(lax,lay).toFixed(4),+Math.max(...paw.items.map(q=>Math.hypot(q.ox,q.oy))).toFixed(1),+paw.sq.toFixed(2),Math.round(dt)]);
  requestAnimationFrame(tick); };
 paw.stopLoop=()=>{ alive=false; paw.loop=false; }; requestAnimationFrame(tick); }
// Убрать кучу (кулак закрылся — символы под пальцами и не видны)
function heapClear(paw){ if(paw.stopLoop) paw.stopLoop(); paw.items.forEach(it=>it.d.remove()); paw.items.length=0; paw.heap.innerHTML=''; }

// ---------- 2) paw1 «Горсть»: одна лапа из-за нижней рамки ----------
// Символы отрываются волной от ближнего к дальнему и по дугам летят в ладонь, пока лапа выезжает снизу (с «шлепком» о ткань: на миг приподнята и тень далеко, прижимается — тень сжимается). Прилетевший символ ложится в чашу ладони
// (куча: размер по чаше, спираль от центра, поздние выше и на ранние, тени, инерция); каждый прилёт слегка продавливает ладонь. Потом лапа «взвешивает» добычу (приподнимается и оседает — кучка отстаёт и садится),
// пальцы сжимаются (слой пальцев поверх символов: они уходят под них), пыль с ткани; кулак с добычей уходит вниз с разгоном, как рывок. Крупный выигрыш — лапа больше, дольше держит, сильнее хлопок и встряска поля.
async function paw1(X,list,gone,o){
 if(!await loadPaw()) return false; const H=pawHost(); if(!H) return false; const {h:host,gr,gen}=H, ps=X.pitch(), n=list.length, big=!!o.big, sz=big?1:.82;
 try{ if(PAW_REACT) X.react(PAW_REACT); }catch(e){} // Рокко только смотрит (PAW_REACT): его собственная рука не тянется рядом с лапой, в Turbo/Quick не играет
 const k=(big?1.9:1.6)*ps/PW.fist; let cx=0,cy=0; list.forEach(e=>{ cx+=e.rc.left+e.rc.width/2; cy+=e.rc.top+e.rc.height/2; }); cx=cx/n-gr.left; cy=cy/n-gr.top;
 const px=clamp(cx,1.5*ps,gr.width-1.5*ps), py=clamp(cy+.4*ps,2.0*ps,gr.height-1.4*ps), P=[gr.left+px,gr.top+py];
 const ul=Math.hypot(.2,.98), UX=.2/ul, UY=.98/ul, rot=rotFor(UX,UY), tEx=exitDist(px,py,UX,UY,gr.width,gr.height), D0=tEx+2.1*ps;
 const paw=mkPaw(host,k,D0+ps,ps), order=sortByDist(list,P), t0=performance.now(), K=()=>Math.max(.02,X.K());
 const poseAt=(d,r,m,so)=>({x:px+UX*d,y:py+UY*d,r:rot+r,m,so});
 setFrame(paw,0); const tIn=440*sz; if(big) X.sleep(tIn*.72).then(()=>press(X,host,px+UX*.1*ps,py+UY*.1*ps,ps,1500*sz)); // 1) лапа выезжает: быстро, с «шлепком» — на миг чуть выше цели (m 1.14), прижимается к ткани
 movePaw(X,paw,[{o:0,...poseAt(D0,-7,1.14,0),e:'cubic-bezier(.26,.62,.26,1)'},{o:.72,...poseAt(-.08*ps,1.5,1.06,1),e:'cubic-bezier(.4,0,.6,1)'},{o:1,...poseAt(0,0,1,1)}],{dur:tIn});
 const rngH=mulberry((n*131+list[0].r*17+list[0].c)|0), spots=heapSpots(paw,n,rngH), size=heapSize(n,ps), jobs=[]; let first=true; const dep0=170*sz, gap=(n>16?20:26)*sz; // 2) символы: подготовка волной, потом по очереди летят в чашу ладони
 order.forEach((e,i)=>{ const c0=[e.rc.left+e.rc.width/2,e.rc.top+e.rc.height/2], L=Math.hypot(P[0]-c0[0],P[1]-c0[1])||1; prep(X,e,ps,i*18*sz,[(P[0]-c0[0])/L,(P[1]-c0[1])/L]);
  const dur=(380+clamp(e.dist/(ps*6),0,1)*170)*sz, t=dep0+i*gap, [sx,sy]=rotPt(spots[i][0],spots[i][1],rot), tgt=[P[0]+sx,P[1]+sy], eS=clamp(size/Math.max(8,(e.ib?e.ib.width:ps*.9)*1.1),.18,.6);
  jobs.push(X.sleep(t).then(()=>{ // X.sleep, а не setTimeout: «пропуск» (Skip) снимает такие паузы сразу
   if(first){ first=false; X.glowOff(list.map(x=>[x.r,x.c])); }
   dent(X,e); const f=launch(X,e,tgt,{dur,ps,rng:e.rng,pow:1.5,endS:eS,stretch:.2,jit:0,keep:true,land:true,z:72,spin:(i%2?-1:1)*(120+e.rng()*160)}); gone(e); log('dep',Math.round(performance.now()-t0));
   return f.p.then(()=>{ if(!paw.root.isConnected) return; heapAdopt(X,paw,f,e,spots[i],i,size,e.rng); dip(X,paw,UX,UY); }); })); });
 await Promise.all(jobs); log('landed',Math.round(performance.now()-t0));
 await X.sleep(40*sz); const tHold=210*sz; // 3) «взвесить»: лапа приподнимается и оседает, кучка отстаёт на инерции и садится
 movePaw(X,paw,[{o:0,x:px,y:py,r:rot,m:1,so:1,e:'cubic-bezier(.3,0,.4,1)'},{o:.4,x:px-UX*.09*ps,y:py-UY*.09*ps,r:rot-1.4,m:1.05,so:.8,e:'cubic-bezier(.4,0,.5,1)'},{o:1,x:px,y:py,r:rot,m:1,so:1}],{dur:tHold}); await X.sleep(tHold*1.15);
 const tCurl=230*sz; // 4) пальцы сжимаются поверх кучки, она уходит под них; пыль, встряска
 curlPaw(X,paw,tCurl,0); await X.sleep(tCurl*.96); heapClear(paw); await X.sleep(tCurl*.04);
 puff(X,host,px,py+.1*ps,ps,big?7:5); if(big){ try{ X.fieldShake(document.getElementById('field')); }catch(e){} }
 movePaw(X,paw,[{o:0,x:px,y:py,r:rot,m:1,so:1,e:'ease-out'},{o:.5,x:px-UX*.06*ps,y:py-UY*.06*ps,r:rot,m:.95,so:1.3},{o:1,x:px,y:py,r:rot,m:1,so:1}],{dur:120*sz}); await X.sleep(120*sz);
 const tOut=(big?470:380)*sz; // 5) рывок вниз: сначала чуть приподнимается (тень растёт), потом уходит с разгоном
 const out=movePaw(X,paw,[{o:0,x:px,y:py,r:rot,m:1,so:1,e:'cubic-bezier(.3,0,.5,1)'},{o:.18,...poseAt(-.1*ps,2,1.12,.7),e:'cubic-bezier(.5,0,.7,.55)'},{o:1,...poseAt(D0+ps,-6,1.18,.1)}],{dur:tOut});
 await X.sleep(tOut*.45); // раунд идёт дальше, пока рука ещё уходит
 pawLeave(host,gen,out); return true; } // лапу убираем, когда анимация ухода кончилась (раньше — таймером на 78% пути: на медленной машине рука пропадала внутри поля)

// ---------- 3) paw2 «Хваты»: рука со стороны Рокко ----------
// Выигравшие символы делятся на 1–4 группы по соседству. Рука идёт от правого края (где Рокко): быстро тянется к группе, символы группы слетаются в ладонь, кулак схватывает, рука
// перелетает к следующей группе (по дороге ладонь раскрывается), в конце уходит обратно к плечу. Плечо — за правым краем: при любом положении ладони предплечье смотрит туда.
function cluster(list,kk){ const pts=list.map(e=>[e.rc.left+e.rc.width/2,e.rc.top+e.rc.height/2]); const cs=[pts.reduce((a,b)=>a[0]>b[0]?a:b).slice()]; // первый центр — самый правый
 while(cs.length<kk){ let bi=0,bd=-1; pts.forEach((p,i)=>{ const d=Math.min(...cs.map(c=>Math.hypot(p[0]-c[0],p[1]-c[1]))); if(d>bd){ bd=d; bi=i; } }); cs.push(pts[bi].slice()); }
 let asg=[]; for(let it=0;it<6;it++){ asg=pts.map(p=>{ let bi=0,bd=1e9; cs.forEach((c,i)=>{ const d=Math.hypot(p[0]-c[0],p[1]-c[1]); if(d<bd){ bd=d; bi=i; } }); return bi; });
  cs.forEach((c,i)=>{ const m=pts.filter((p,j)=>asg[j]===i); if(m.length){ c[0]=m.reduce((a,p)=>a+p[0],0)/m.length; c[1]=m.reduce((a,p)=>a+p[1],0)/m.length; } }); }
 return cs.map((c,i)=>({c,items:list.filter((e,j)=>asg[j]===i)})).filter(g=>g.items.length); }
async function paw2(X,list,gone,o){
 if(!await loadPaw()) return false; const H=pawHost(); if(!H) return false; const {h:host,gr,gen}=H, ps=X.pitch(), n=list.length, W=gr.width, Hh=gr.height, K=()=>Math.max(.02,X.K());
 try{ if(PAW_REACT) X.react(PAW_REACT); }catch(e){} // в Turbo/Quick react сам промолчит (обычные кражи без ролика Рокко)
 const kk=n<=8?2:n<=13?3:4, groups=cluster(list,kk).sort((a,b)=>b.c[0]-a.c[0]), nG=groups.length, sz=nG>=4?.88:1; // правые группы — первыми
 const k=1.3*ps/PW.fist, A=[W*1.55,Hh*.58]; // плечо — за правым краем поля
 const stops=groups.map(g=>{ const x=clamp(g.c[0]-gr.left,1.1*ps,W-1.1*ps), y=clamp(g.c[1]-gr.top+.15*ps,1.3*ps,Hh-1.0*ps), dx=A[0]-x, dy=A[1]-y, l=Math.hypot(dx,dy), ux=dx/l, uy=dy/l;
  return {g,x,y,ux,uy,rot:rotFor(ux,uy),tEx:exitDist(x,y,ux,uy,W,Hh),P:[gr.left+x,gr.top+y]}; });
 const paw=mkPaw(host,k,Math.max(...stops.map(s=>s.tEx))+1.2*ps,ps), t0=performance.now(); sortByDist(list,stops[0].P); // готовит вид символов (e.rng, e.F)
 const poseOf=(s,d,m,so)=>({x:s.x+s.ux*d,y:s.y+s.uy*d,r:s.rot,m,so}); let first=true; setFrame(paw,0);
 for(let gi=0;gi<nG;gi++){ const s=stops[gi], items=s.g.items, last=gi===nG-1, prev=gi?stops[gi-1]:null, tMove=(gi?170:270)*sz;
  items.forEach(e=>{ e.dist=Math.hypot(e.rc.left+e.rc.width/2-s.P[0],e.rc.top+e.rc.height/2-s.P[1]); }); items.sort((a,b)=>a.dist-b.dist);
  if(!prev) movePaw(X,paw,[{o:0,...poseOf(s,s.tEx+2.0*ps,1.12,0),e:'cubic-bezier(.24,.64,.24,1)'},{o:.78,...poseOf(s,-.05*ps,1.05,1),e:'cubic-bezier(.4,0,.6,1)'},{o:1,...poseOf(s,0,1,1)}],{dur:tMove});
  else { arcPaw(X,paw,{x:prev.x,y:prev.y,r:prev.rot},{x:s.x,y:s.y,r:s.rot},[prev.ux*.5*ps,-.2*ps],{dur:tMove}); curlPaw(X,paw,tMove*.6,0,true); }
  const jobs=[], gap=22*sz, rngH=mulberry((gi*977+items.length*31+items[0].r*7+items[0].c)|0), spots=heapSpots(paw,items.length,rngH), size=heapSize(items.length,ps); // символы группы: подготовка и полёт в чашу ладони, пока рука подходит
  items.forEach((e,i)=>{ const c0=[e.rc.left+e.rc.width/2,e.rc.top+e.rc.height/2], L=Math.hypot(s.P[0]-c0[0],s.P[1]-c0[1])||1; prep(X,e,ps,i*12*sz,[(s.P[0]-c0[0])/L,(s.P[1]-c0[1])/L]);
   const dur=(240+clamp(e.dist/(ps*5),0,1)*130)*sz, t=(60*sz)+i*gap, [sx,sy]=rotPt(spots[i][0],spots[i][1],s.rot), tgt=[s.P[0]+sx,s.P[1]+sy], eS=clamp(size/Math.max(8,(e.ib?e.ib.width:ps*.9)*1.1),.18,.6);
   jobs.push(X.sleep(t).then(()=>{ if(first){ first=false; X.glowOff(list.map(x=>[x.r,x.c])); } dent(X,e);
    const f=launch(X,e,tgt,{dur,ps,rng:e.rng,pow:1.45,endS:eS,stretch:.2,jit:0,keep:true,land:true,z:72,spin:(i%2?-1:1)*(100+e.rng()*120)}); gone(e); log('dep',Math.round(performance.now()-t0));
    return f.p.then(()=>{ if(!paw.root.isConnected) return; heapAdopt(X,paw,f,e,spots[i],i,size,e.rng); }); })); });
  await Promise.all(jobs); // хват: пальцы сжимаются поверх кучки, она уходит под них, чуть пыли
  const tCurl=115*sz; curlPaw(X,paw,tCurl,0); await X.sleep(tCurl*.95); heapClear(paw); await X.sleep(tCurl*.1); puff(X,host,s.x,s.y+.1*ps,ps*.8,3);
  if(last) break; await X.sleep(35*sz); }
 const sl=stops[nG-1], tOut=340*sz; // уход: рывок к плечу с разгоном, пока кулак закрыт
 const out=movePaw(X,paw,[{o:0,x:sl.x,y:sl.y,r:sl.rot,m:1,so:1,e:'cubic-bezier(.3,0,.5,1)'},{o:.15,...poseOf(sl,-.08*ps,1.1,.8),e:'cubic-bezier(.5,0,.7,.55)'},{o:1,...poseOf(sl,sl.tEx+2.0*ps,1.18,.1)}],{dur:tOut});
 await X.sleep(tOut*.4); pawLeave(host,gen,out); return true; }

// «Меньше движения»: символы просто гаснут (без полёта), коротко, не по K
async function fade(list,gone){ const jobs=list.map(e=>{ const a=e.o.sp.animate([{opacity:1},{opacity:0}],{duration:170,easing:'linear',fill:'forwards'}); return a.finished.catch(()=>{}); });
 await Promise.all(jobs); list.forEach(gone); }

// ---------- вход ----------
// Рука Рокко не ускоряется в Turbo/Quick (так решено для всех роликов Рокко): лапа и всё, что к ней привязано (полёты в ладонь, кучка, вмятина), идут в обычном времени.
// «Пропуск» (Skip) и «меньше движения» работают как везде. Обычные кражи в Turbo/Quick — без руки, символы сами летят к Рокко (запасной путь).
function realTime(X){ const k=()=>X.fast()?1:Math.max(.05,X.K()), W=Object.create(X);
 W.animA=(n,kf,o)=>X.animA(n,kf,{...o,duration:(o.duration||0)/k(),delay:(o.delay||0)/k()}); W.sleep=ms=>X.sleep(ms/k()); W.K=()=>X.fast()?X.K():1; return W; }
const kindOf=(mode,o,fastMode)=>mode==='mix'?(o.big?'paw1':(!fastMode&&(o.x||0)>=MIX_PAW2)?'paw2':'swallow'):mode;
async function run(list,gone,o,X){
 try{
  const slow=X.K()<1&&!X.fast(), kind=kindOf(modeOf(X.q),o,slow), XP=slow?realTime(X):X; // slow — Turbo/Quick/удержание Space
  window.bpAudio&&bpAudio.play(kind==='paw1'?'rocco.steal_whoosh':kind==='paw2'?'rocco.grab':'rocco.swallow'); // звук забирания (audio.js)
  if(kind==='paw1'&&await paw1(XP,list,gone,o)) return true;
  if(kind==='paw2'&&await paw2(XP,list,gone,o)) return true;
  const S=window.roccoSwallow&&window.roccoSwallow();
  if(S&&await X.skippable(S.ready)){ await swallow(X,list,gone,o,S); return true; }
  if(S&&S.cancel) S.cancel(); // Skip нажали, пока ролик ещё ждёт очереди или грузится: отменить (идущий ролик доиграет сам)
  await swallowBlind(X,list,gone,o); return true;
 }catch(err){ console.error('collect',err); list.forEach(e=>{ try{ if(X.BOARD[e.r][e.c]===e.o) gone(e); }catch(_){} }); document.querySelectorAll('.cfly,.cmouth').forEach(n=>n.remove()); const h=document.getElementById('cpawclip'); if(h){ h.innerHTML=''; h.style.display='none'; } return true; }
}
window.bpCollect={run,fade,kindOf,mode:modeOf,MODES:['mix','swallow','paw1','paw2','old']};
window.bpCollect.paw={PW:null,load:loadPaw,make:mkPaw,rotFor,assetUrl}; // спрайты лапы для sack.js (лапа приносит мешок): размеры спрайта, загрузка, сборка лапы, поворот руки
})();
