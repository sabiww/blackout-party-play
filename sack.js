// Blackout Party — мешок «Кухни» (владелец 2026-10-11: «пример, но качественные анимации, плавные, чтобы всё было понятно новичку»). Макет, не игра.
// Идея в одной фразе: каждая кража платится сразу И копится в мешке; каждые 4 кражи Рокко достаёт мешок из-под стола и высыпает — накопленное платится второй раз, счётчик идёт на ступень выше, потом удар по раме и столбец WILD (он ждёт ближайший выигрыш и уходит с ним; владелец 2026-10-11 убрал липкие столбцы).
// Что здесь (ui.js зовёт через window.bpSack, а без этого файла «Кухня» работает по-старому — просто число и надпись SACK):
//  · intro()  — вход в «Кухню» (один раз, перед первым спином, ~1,8 с, тап пропускает): окошко SACK загорается, иконка мешка, 4 лампы по очереди, подсказка «EVERY 4 STEALS — SACK PAYS AGAIN · COUNTER UP · +3 SPINS»;
//  · gain()   — каждая кража: сумма превращается в золотые монетки (3–8), они летят дугой в окошко SACK, число прибавляется, загорается следующая лампа; иногда монетка падает за нижнюю кромку поля — мешок «подпрыгивает»;
//  · три лампы горят — окошко мягко пульсирует, последняя лампа мигает (чистый CSS, класс .wait ставит ui.js hudUpdate);
//  · dump()   — четвёртая кража (владелец 2026-10-11: «всё через OpenRouter, полноценные анимации без рваности»): три сменных варианта, всё движение — в роликах Kling (WebM/HEVC с альфой), код только ставит ролик,
//               плавно двигает по прямой, считает число и летит монетами в строку WIN: ?sackfx=pawempty (по умолчанию: та же лапа, мешок пустеет и обмякает) и ?sackfx=paw (прежняя лапа с мешком выезжает из-за нижней рамки, переворачивает мешок, монеты сыплются в ролике), ?sackfx=coins
//               (монетный фонтан из окошка SACK, потом монеты в WIN), ?sackfx=rocco (Рокко поднимает мешок и трясёт, монеты из горловины кодом). Подробно — в блоке «три варианта высыпания» ниже и в docs/ANIMATIONS.md.
//               Затем зовётся o.lift() из ui.js: счётчик на ступень выше (counterLift), трюк этой ступени, удар по раме (punchColumn).
// Время: Turbo — без роликов (монеты сразу из окошка в WIN), Quick — ролики как есть (1×), код-часть короче через K(); «меньше движения» (K=0) — без полётов: число прибавляется, лампа горит, высыпание — короткая смена состояния.
// Посмотреть по отдельности на готовом поле: ?scene=kitchen&fx=intro (вход), ?scene=kitchen&fx=gain (кража → монетки), ?scene=kitchen&fx=dump (высыпание и удар); ?sackfx=… — вариант высыпания; ?sackintro=0 — без входа.
// Исход раунда и математику не трогаем: GS.sack / GS.ksteals меняет ui.js сразу, здесь только то, что видно (SKV — «что показывает окошко», пока монетки летят).
(()=>{
'use strict';
const T=window.bpTime||{}, X=T.ex, SKV=T.SKV, CL=window.bpSackClip;
if(!X||!SKV||!CL) return;
const {GS,RM,fast}=T, K=X.K, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), rnd=(a,b)=>a+Math.random()*(b-a), $=id=>document.getElementById(id);
const hw=()=>$('hw-sack'), vv=()=>{ const h=hw(); return h&&h.querySelector('.vv'); };
const SN=X.SACK_N||4, lampsGS=()=>(GS.sack>0&&GS.ksteals>0&&GS.ksteals%SN===0)?SN:((GS.ksteals||0)%SN); // SN — число ламп = краж до высыпания (ui.js BONUS.sackEvery)
const real=ms=>new Promise(r=>setTimeout(r,ms));
const SEL='#krocco video.ak[data-n="sackpull"]';
let pending=0, queue=Promise.resolve(), busy=false, watch=0;

// ---------- что показывает окошко SACK ----------
function hold(){ // зовёт ui.js ПЕРЕД тем, как поменять GS.sack / GS.ksteals: окошко остаётся на старом числе, пока монетки не долетят
 if(!SKV.on){ SKV.on=true; SKV.v=GS.sack||0; SKV.n=lampsGS(); }
 warm();
 clearTimeout(watch); watch=setTimeout(()=>{ if(!pending&&!busy) release(); },25000); } // страховка: если раунд оборвали, окошко не застревает на старом числе
function release(){ SKV.on=false; X.hudUpdate(); }
function refresh(){ X.hudUpdate(); }
function setVV(v){ const e=vv(); if(e) e.textContent=money.win(v); }
function flashLamp(i){ window.bpAudio&&bpAudio.play('sack.lamp_on'); const h=hw(), l=h&&h.querySelectorAll('.lp')[i]; if(!l||RM()) return; l.classList.remove('fl'); void l.offsetWidth; l.classList.add('fl'); setTimeout(()=>l.classList.remove('fl'),700); }
const winPt=()=>{ const e=vv(); if(!e) return null; const b=e.getBoundingClientRect(); return [b.left+b.width/2,b.top+b.height/2]; };
// soft(kf): гладкая кривая через ключевые кадры (smoothKF, ui.js) + копия первого кадра на .001 — ход стартует с нулевой скоростью и набирает её плавно, без «выстрела» с места;
// раньше между кадрами шла ломаная: на стыках скорость менялась рывком (в точке перелёта — разворот «уголком»)
const soft=kf=>[kf[0],{...kf[0],offset:.001},...kf.slice(1)];
function bump(s){ const h=hw(); if(!h) return; X.animA(h,soft([{transform:'translate(0px,0px) scale(1)'},{transform:`translate(${(rnd(-1,1)*2.2*s).toFixed(1)}px,${(1.6*s).toFixed(1)}px) scale(${(1+.045*s).toFixed(3)})`,offset:.32},{transform:`translate(${(rnd(-1,1)*s).toFixed(1)}px,${(-.6*s).toFixed(1)}px) scale(${(1-.01*s).toFixed(3)})`,offset:.66},{transform:'translate(0px,0px) scale(1)'}]),{duration:210,easing:'cubic-bezier(.2,.7,.3,1)',smooth:60}); }
function pulseNum(s){ const e=vv(); if(!e) return; X.animA(e,[{transform:'scale(1)',filter:'brightness(1)'},{transform:`scale(${(1+.16*s).toFixed(2)})`,filter:'brightness(1.7)',offset:.3},{transform:'scale(1)',filter:'brightness(1)'}],{duration:260,easing:'cubic-bezier(.2,.8,.3,1)'}); }
let vvGen=0; // номер последнего бега числа: более старый бег (он мог начаться при другой скорости, до Skip) после нового больше не пишет — иначе он заканчивался позже и возвращал в окошко устаревшее число
function tweenVV(a,b,ms){ // число в окошке «бежит» от a до b (ms × K), без перерисовки раскладки
 const g=++vvGen, d=ms*K(); if(d<=0||RM()){ setVV(b); return; } const t0=performance.now(); const st=n=>{ if(g!==vvGen) return; const k=fast()?1:clamp((n-t0)/d,0,1); setVV(a+(b-a)*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(st); }; requestAnimationFrame(st); }

// ---------- холст с частицами: монеты, билеты, конфетти, «пых» ----------
const FX=(()=>{
 let cv=null, ctx=null, P=[], raf=0, last=0, dpr=1, FXT=0; const spr={}, ts=()=>1/Math.max(.05,K()); // FXT — своё время частиц «мешка из лапы», секунды: идёт с поправкой на K (Turbo/Quick короче, __slow длиннее), как анимации лапы; z — слой холста (у «лапы» монеты поверх лапы и мешка)
 const ticket=new Image(); let tkOK=false; try{ ticket.onload=()=>{ tkOK=true; }; ticket.src=SYM('sym-wild'); }catch(e){}
 // Жетон «вечеринки» (2026-10-12, fb/coins): потёртая латунь, спереди енот-маска (рельеф), сзади звезда; лист из 48 кадров наклона 0…π (грань → ребро → обратная грань) с настоящей толщиной и рифлёным ребром, рисуется один раз кодом
 const TN=48, TC=112, TR=44, TT=TR*.22, PHR=1.06; // кадров в листе, размер клетки, радиус монеты в клетке, толщина, наклон лежащей монеты (≈ камера сверху)
 const tface=side=>{ const s=256,c=document.createElement('canvas'); c.width=c.height=s; const g=c.getContext('2d'), m=s/2; let seed=side?7:3; const rr=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const gr=g.createRadialGradient(m*.78,m*.72,s*.04,m,m,m); gr.addColorStop(0,'#dcb04f'); gr.addColorStop(.55,'#c28f2e'); gr.addColorStop(1,'#8a5f19'); g.fillStyle=gr; g.beginPath(); g.arc(m,m,m-1,0,6.2832); g.fill();
  g.lineWidth=s*.05; g.strokeStyle='#6a4511'; g.beginPath(); g.arc(m,m,m-s*.03,0,6.2832); g.stroke();
  g.lineWidth=s*.028; g.strokeStyle='#e6c26a'; g.beginPath(); g.arc(m,m,m-s*.09,Math.PI*1.05,Math.PI*1.85); g.stroke(); g.strokeStyle='#75501a'; g.beginPath(); g.arc(m,m,m-s*.09,Math.PI*.05,Math.PI*.85); g.stroke();
  g.lineWidth=s*.012; g.strokeStyle='rgba(66,40,8,.75)'; g.beginPath(); g.arc(m,m,m*.72,0,6.2832); g.stroke();
  for(let i=0;i<20;i++){ const a=i/20*6.2832, x=m+Math.cos(a)*m*.84, y=m+Math.sin(a)*m*.84; g.fillStyle='rgba(66,40,8,.7)'; g.beginPath(); g.arc(x+1.2,y+1.2,s*.017,0,6.2832); g.fill(); g.fillStyle='#d9ae55'; g.beginPath(); g.arc(x,y,s*.017,0,6.2832); g.fill(); }
  const emb=draw=>{ g.save(); g.translate(2.4,2.4); g.fillStyle='rgba(58,34,6,.8)'; draw(); g.restore(); g.save(); g.translate(-2,-2); g.fillStyle='rgba(255,233,168,.6)'; draw(); g.restore(); g.fillStyle='#c9972f'; draw(); };
  if(side){ emb(()=>{ g.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2?m*.2:m*.5; g.lineTo(m+Math.cos(a)*r,m+Math.sin(a)*r); } g.closePath(); g.fill(); }); }
  else { emb(()=>{ g.beginPath(); g.ellipse(m,m*1.06,m*.42,m*.36,0,0,6.2832); g.fill(); g.beginPath(); g.moveTo(m-m*.38,m*.9); g.lineTo(m-m*.34,m*.44); g.lineTo(m-m*.08,m*.72); g.fill(); g.beginPath(); g.moveTo(m+m*.38,m*.9); g.lineTo(m+m*.34,m*.44); g.lineTo(m+m*.08,m*.72); g.fill(); });
   g.fillStyle='#4a2f0c'; g.beginPath(); g.moveTo(m-m*.4,m*.98); g.quadraticCurveTo(m,m*.84,m+m*.4,m*.98); g.quadraticCurveTo(m+m*.34,m*1.16,m+m*.14,m*1.14); g.quadraticCurveTo(m,m*1.08,m-m*.14,m*1.14); g.quadraticCurveTo(m-m*.34,m*1.16,m-m*.4,m*.98); g.fill();
   g.fillStyle='#d3a748'; g.beginPath(); g.ellipse(m-m*.2,m*1.02,m*.065,m*.05,0,0,6.2832); g.fill(); g.beginPath(); g.ellipse(m+m*.2,m*1.02,m*.065,m*.05,0,0,6.2832); g.fill();
   g.fillStyle='#4a2f0c'; g.beginPath(); g.ellipse(m,m*1.24,m*.07,m*.05,0,0,6.2832); g.fill(); }
  g.globalCompositeOperation='source-atop'; // износ: тёмные крапинки, светлые потёртости по ободу, царапины
  for(let i=0;i<150;i++){ const a=rr()*6.2832, r=Math.sqrt(rr())*m*.97, x=m+Math.cos(a)*r, y=m+Math.sin(a)*r, w=rr()*s*.012+.6; g.fillStyle=rr()<.7?'rgba(70,42,10,.28)':'rgba(236,208,128,.3)'; g.beginPath(); g.arc(x,y,w,0,6.2832); g.fill(); }
  for(let i=0;i<7;i++){ const x=rr()*s,y=rr()*s; g.strokeStyle=rr()<.5?'rgba(52,30,6,.3)':'rgba(240,214,140,.35)'; g.lineWidth=.9; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(rr()-.5)*s*.34,y+(rr()-.5)*s*.34); g.stroke(); }
  const pt=g.createRadialGradient(m,m,m*.6,m,m,m); pt.addColorStop(0,'rgba(40,24,4,0)'); pt.addColorStop(1,'rgba(40,24,4,.34)'); g.fillStyle=pt; g.fillRect(0,0,s,s); return c; };
 const tsheet=()=>spr.tok||(spr.tok=(()=>{ const sh=document.createElement('canvas'); sh.width=TN*TC; sh.height=TC; const g=sh.getContext('2d'), fa=[tface(0),tface(1)], cx=TC/2, cy=TC/2;
  for(let k=0;k<TN;k++){ const ph=k/(TN-1)*Math.PI, cs=Math.cos(ph), sn=Math.sin(ph), ox=k*TC, ry=Math.max(.9,TR*Math.abs(cs)), off=TT/2*sn, nearA=cs>=0, ny=cy+(nearA?-off:off), fy=cy+(nearA?off:-off);
   g.save(); g.translate(ox,0);
   const eg=g.createLinearGradient(cx-TR,0,cx+TR,0); eg.addColorStop(0,'#5d3d0e'); eg.addColorStop(.3,'#a87821'); eg.addColorStop(.55,'#c89a38'); eg.addColorStop(1,'#5d3d0e');
   g.fillStyle='#5a3a0c'; g.beginPath(); g.ellipse(cx,fy,TR,ry,0,0,6.2832); g.fill();
   g.fillStyle=eg; g.beginPath(); g.moveTo(cx-TR,ny); g.lineTo(cx+TR,ny); g.lineTo(cx+TR,fy); g.lineTo(cx-TR,fy); g.closePath(); g.fill();
   g.strokeStyle='rgba(50,30,4,.4)'; g.lineWidth=1; for(let i=-6;i<=6;i++){ const x=cx+TR*Math.sin(i*.24); g.beginPath(); g.moveTo(x,ny); g.lineTo(x,fy); g.stroke(); }
   g.save(); g.beginPath(); g.ellipse(cx,ny,TR,ry,0,0,6.2832); g.clip(); g.drawImage(fa[nearA?0:1],cx-TR,ny-ry,2*TR,2*ry); g.fillStyle='rgba(36,20,2,'+(.4*(1-Math.abs(cs))).toFixed(3)+')'; g.fillRect(cx-TR,ny-ry,2*TR,2*ry); g.restore();
   g.strokeStyle='rgba(60,36,6,.85)'; g.lineWidth=1.3; g.beginPath(); g.ellipse(cx,ny,TR-.6,Math.max(.6,ry-.6),0,0,6.2832); g.stroke(); g.restore(); }
  return sh; })());
 const tri=th=>{ const m=((th%6.2832)+6.2832)%6.2832; return m>Math.PI?6.2832-m:m; };
 // жетон: x,y — центр, r — радиус, ph — наклон 0…π (0 лицом, π/2 ребром, π обратной стороной), rot — поворот в плоскости экрана
 const drawTok=(c,x,y,r,ph,rot,a)=>{ const sh=tsheet(), k=Math.round(clamp(ph,0,Math.PI)/Math.PI*(TN-1)), q=r/TR; c.save(); c.globalAlpha=a; c.translate(x,y); if(rot) c.rotate(rot); c.drawImage(sh,k*TC,0,TC,TC,-TC/2*q,-TC/2*q,TC*q,TC*q); c.restore(); };
 const glow=()=>spr.glow||(spr.glow=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,214,110,.95)'); gr.addColorStop(.35,'rgba(255,176,60,.35)'); gr.addColorStop(1,'rgba(255,170,60,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return c; })());
 function fit(){ if(!cv) return; dpr=Math.min(1.5,window.devicePixelRatio||1); cv.width=Math.round(innerWidth*dpr); cv.height=Math.round(innerHeight*dpr); ctx=cv.getContext('2d'); }
 addEventListener('resize',fit);
 function add(p){ if(!cv||!cv.isConnected){ cv=document.createElement('canvas'); cv.id='skfx'; document.body.append(cv); fit(); } cv.style.zIndex=FX.z||''; P.push(p); if(!raf){ last=performance.now(); raf=requestAnimationFrame(tick); } return p; }
 function tick(now){ raf=0; if(!cv) return; let rem=Math.min(.3,Math.max(0,(now-last)/1000)); last=now; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,innerWidth,innerHeight);
  // физика идёт по настоящему времени: если кадры редкие (слабая машина, запись экрана), шаг дробится, а не растягивается — монеты не «плывут» в замедлении
  do{ const dt=Math.min(rem,1/60); FXT+=dt*ts(); for(const p of P){ if(!p.dead) p.step(dt,now); } rem-=dt; }while(rem>1e-4);
  for(const p of P){ if(!p.dead&&!p.hide) p.draw(ctx); } P=P.filter(p=>!p.dead);
  if(P.length) raf=requestAnimationFrame(tick); else { cv.remove(); cv=null; } }
 function clear(){ P.forEach(p=>{ p.dead=true; p.onKill&&p.onKill(); }); P=[]; if(cv){ cv.remove(); cv=null; } }
 const drawCoin=(c,x,y,r,fl,rot,a)=>drawTok(c,x,y,r*1.08,tri(fl),rot*.35,a);
 // монетка летит в окошко SACK: настоящая баллистика (по x равномерно, по y парабола), в начале небольшой разброс; в конце «впитывается»
 function flyCoin(o){ const t0=performance.now()+o.delay, sx=rnd(-1,1)*o.spread, sy=-rnd(.35,1)*o.spread; let fl=rnd(0,6.28), rot=rnd(0,6.28); const vf=rnd(8,15)*(Math.random()<.5?-1:1), vr=rnd(-5,5);
  return add({x:o.from[0],y:o.from[1],hide:true,
   step(dt,now){ const k=(now-t0)/o.dur; if(fast()||k>=1){ this.dead=true; o.onLand&&o.onLand(); return; } if(k<0){ this.hide=true; return; } this.hide=false;
    const pop=Math.sin(clamp(k*1.7,0,1)*Math.PI), e=k; this.x=o.from[0]+(o.to[0]-o.from[0])*e+sx*pop; this.y=o.from[1]+(o.to[1]-o.from[1])*e-4*o.arc*k*(1-k)+sy*pop; fl+=vf*dt; rot+=vr*dt;
    this.s=k<.1?.55+k*4.5:(k>.86?1-(k-.86)*2.6:1); this.a=k>.9?1-(k-.9)*4:1; },
   draw(c){ const r=o.r*this.s; c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=.55*this.a; c.drawImage(glow(),this.x-r*2.3,this.y-r*2.3,r*4.6,r*4.6); c.restore(); drawCoin(c,this.x,this.y,r,fl,rot,this.a); }}); }
 function spark(x,y,r,vx,vy,life,delay){ let age=-(delay||0), px=x, py=y; return add({hide:true,step(dt){ age+=dt; if(age<0) return; this.hide=false; px+=vx*dt; py+=vy*dt; vy+=r*30*dt; if(age>=life) this.dead=true; },
   draw(c){ const k=clamp(age/life,0,1), s=r*(1-k*.6)*3; c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=1-k; c.drawImage(glow(),px-s,py-s,2*s,2*s); c.restore(); }}); }
 // ---- частицы мешка (свои часы FXT, поэтому Turbo/Quick и __slow ведут их так же, как ролики) ----
 const bz=(a,c,b,u)=>{ const w=1-u; return [w*w*a[0]+2*w*u*c[0]+u*u*b[0], w*w*a[1]+2*w*u*c[1]+u*u*b[1]]; };
 const glints=(c,x,y,r,a)=>{ c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=a; c.drawImage(glow(),x-r*2.3,y-r*2.3,r*4.6,r*4.6); c.restore(); };
 // монета из мешка: падает, отскакивает от скатерти (1–3 раза), лежит самую малость и по дуге летит в строку WIN (ускоряясь, как втягиваемая); o.sched() даёт время вылета (по очереди, поток), o.to() — точку WIN, o.onArrive() — прилёт
 function sackCoin(o){ let x=o.x,y=o.y,vx=o.vx,vy=o.vy,n=0,ph=0,t0=0,fly=0,dur=.5,P0,C,P1,s=1,a=1,fl=rnd(0,6.28),rot=rnd(0,6.28),rest=0; const vf=rnd(8,15)*(Math.random()<.5?-1:1), vr=rnd(-6,6), side=Math.random()<.5?-1:1, trail=[];
  return add({step(dt){ if(fast()){ this.dead=true; o.onArrive&&o.onArrive(true); return; }
    let r=dt*ts(); while(r>1e-6){ const d=Math.min(r,1/120); r-=d;
     if(ph===0){ vy+=o.g*d; x+=vx*d; y+=vy*d; fl+=vf*d; rot+=vr*d; if(y>=o.floor&&vy>0){ y=o.floor; n++; o.onHit&&o.onHit(n,x,y,vy); vy=-vy*(n===1?.46:.3); vx*=.72; if(Math.abs(vy)<o.g*.09||n>=3){ vy=0; ph=1; fly=o.sched(); } } }
     else if(ph===1){ x+=vx*d; vx*=Math.exp(-5.5*d); rest+=d; fl+=vf*d*.2*Math.max(0,1-rest*2); } }
    if(ph===1&&FXT>=fly){ ph=2; t0=FXT; P0=[x,y]; P1=o.to(); const dx=P1[0]-x, dy=P1[1]-y, L=Math.hypot(dx,dy)||1; dur=(.36+Math.min(.18,L/o.ps*.03))*rnd(.92,1.08); C=[x+dx*.22+side*L*.2,y+dy*.2-L*.2-o.ps*.25]; }
    if(ph===2){ const u=clamp((FXT-t0)/dur,0,1), e=Math.pow(u,1.75); [x,y]=bz(P0,C,P1,e); fl+=vf*dt*ts(); rot+=vr*dt*ts(); s=u<.12?.9+u*.8:1-.34*Math.pow(u,2.4); a=u>.9?1-(u-.9)*3:1; trail.unshift([x,y]); if(trail.length>4) trail.pop(); if(u>=1){ this.dead=true; o.onArrive&&o.onArrive(false,x,y); } } },
   draw(c){ if(ph<2){ const h=Math.max(0,o.floor-y), sh=clamp(1-h/(o.r*9),.15,1); c.save(); c.globalAlpha=.34*sh; c.fillStyle='#000'; c.beginPath(); c.ellipse(x,o.floor+o.r*.55,o.r*(.9+h*.002),o.r*.3,0,0,6.2832); c.fill(); c.restore(); drawCoin(c,x,y,o.r,fl,rot,1); }
    else { const r=o.r*s; for(let i=trail.length-1;i>=2;i--) glints(c,trail[i][0],trail[i][1],r*(1-i*.12),.17-i*.03); glints(c,x,y,r,.5*a); drawCoin(c,x,y,r,fl,rot,a); } }}); }

 // ---- высыпание настоящими монетами (2026-10-12): каждая монета — своё тело: падает, летит с вращением (грань/ребро), отскакивает от «пола» поля (нижняя рама), катится на ребре, дребезжит и ложится плашмя, часть ложится на другие (стопки);
 // потом, когда всё легло, монеты по одной (сверху вниз) улетают в строку WIN. Время идёт по FXT (K: Turbo/Quick/__slow как у остального), на редких кадрах шаг дробится (1/120 с), Skip (fast) — сразу приходы.
 // o: ps, R (радиус монеты, px), floor (y пола, px), D (глубина пола, px), xmin/xmax (стены), g, to() → [x,y] строки WIN, onArrive(skip,x,y), onDone(), hold (с лежат до сбора)
 function pour(o){ const cs=[], R=o.R, T=R*.24, g=o.g, D=o.D; let go=false, closed=false, nextRel=0, done=false, nid=0, ended=false, nArr=0, nTot=0;
  const LG=window.__pourLog, lg=n=>{ if(LG) LG.push([n,performance.now(),FXT]); }, A=window.bpAudio, clink=vi=>{ if(A) A.play('sack.coin_clink',{v:clamp(vi/(o.ps*12),0,1),jitter:0}); };   // звон: сила — по скорости удара; ограничения (интервал, ≤6 голосов) — в audio.js
  const rest=()=>cs.filter(c=>c.ph==='rest');
  const sup=c=>{ let h=0, b=null; for(const q of cs){ if(q===c||q.ph!=='rest') continue; if(Math.abs(q.x-c.x)<R*(q.edge?1:1.7)&&Math.abs(q.d-c.d)<R*.9){ const t=q.z+(q.edge?R*1.05:T*1.15); if(t>h){ h=t; b=q; } } } sup.b=b; return h; };   // стопка: монета ложится на самую высокую из лежащих рядом
  const arrive=(c,skip,x,y)=>{ c.ph='dead'; nArr++; if(!skip&&A) A.play('sack.coin_chink',{k:nArr/Math.max(1,nTot),jitter:0}); if(nArr===nTot) lg('lastArrive'); o.onArrive&&o.onArrive(skip,x,y); };
  const P=add({step(dt){ if(this.dead) return; if(fast()){ for(const c of cs) if(c.ph!=='dead') arrive(c,true); cs.length=0; this.fin(); return; }
    let r=dt*ts(); while(r>1e-6){ const h=Math.min(r,1/120); r-=h; for(const c of cs){ if(c.ph==='dead') continue; c.age+=h; const ph=c.ph;
      if(ph==='air'){ c.vz-=g*h; c.x+=c.vx*h; c.d+=c.vd*h; c.z+=c.vz*h; c.th+=c.om*h; c.rot+=c.vr*h; c.vr*=Math.exp(-.8*h);
       if(c.x<o.xmin){ c.x=o.xmin; c.vx=Math.abs(c.vx)*.45; } else if(c.x>o.xmax){ c.x=o.xmax; c.vx=-Math.abs(c.vx)*.45; }
       if(c.d<0){ c.d=0; c.vd=Math.abs(c.vd)*.4; } else if(c.d>D){ c.d=D; c.vd=-Math.abs(c.vd)*.4; }
       const hh=sup(c); if(c.z<=hh&&c.vz<0){ c.z=hh; const vi=-c.vz; c.n++; c.on=sup.b; clink(vi);
        if(vi<o.ps*1.7||c.n>=4){ c.vz=0; c.phi=tri(c.th); c.vr=0; if(hh>1&&Math.random()<.14&&c.on&&!c.on.edge){ c.ph='rest'; c.edge=true; c.phi=Math.PI/2+rnd(-.1,.1); c.vx=0; c.rot=(Math.random()<.5?-1:1)*rnd(.22,.5); c.rt=c.age; c.z=hh+R*.55; c.sz=c.z; } else if(Math.abs(c.vx)>o.ps*.8&&hh<1&&Math.random()<.3){ c.ph='roll'; c.sp0=Math.abs(c.vx); c.wp=0; c.wd=Math.random()<.5?-1:1; } else { c.ph='flop'; c.phd=c.om*.18*(Math.random()<.5?-1:1); } }
        else { c.vz=vi*(c.n===1?.5:.37); c.vx*=.8; c.vd+=rnd(-.3,.3)*o.ps*.35; c.om=c.om*.55+rnd(-7,7); o.onHit&&o.onHit(vi); } } }
      else if(ph==='roll'){ c.x+=c.vx*h; c.d+=c.vd*h; c.vd*=Math.exp(-3*h); c.vx*=Math.exp(-2.6*h); c.rot*=Math.exp(-6*h); const sf=clamp(Math.abs(c.vx)/c.sp0,0,1), A=.05+.62*Math.pow(1-sf,2.2); c.wp+=(9+34*(1-sf))*h; c.phi+=(Math.PI/2+c.wd*A*Math.sin(c.wp)-c.phi)*(1-Math.exp(-22*h));
       if(c.x<o.xmin){ c.x=o.xmin; c.vx=Math.abs(c.vx)*.4; } else if(c.x>o.xmax){ c.x=o.xmax; c.vx=-Math.abs(c.vx)*.4; } c.d=clamp(c.d,0,D);
       if(Math.abs(c.vx)<o.ps*.34){ c.ph='flop'; c.phd=c.wd*(3+Math.random()*3); } }
      else if(ph==='flop'){ const tg=c.phi<Math.PI/2?PHR:Math.PI-PHR; c.phd+=(-2200*(c.phi-tg)-20*c.phd)*h; c.phi+=c.phd*h; c.x+=c.vx*h; c.vx*=Math.exp(-7*h); c.rot*=Math.exp(-5*h); c.phi=clamp(c.phi,.05,Math.PI-.05);
       if(Math.abs(c.phi-tg)<.05&&Math.abs(c.phd)<.9){ c.phi=tg; c.ph='rest'; c.rt=c.age; const hh=sup(c); c.on=sup.b; c.z=hh; c.sz=hh; if(hh>1){ c.rot=rnd(-.2,.2); if(Math.random()<.5) c.x+=rnd(-.3,.3)*R; } } }
      else if(ph==='fly'){ const u=clamp((c.age-c.t0)/c.dur,0,1), e=Math.pow(u,1.6), w=1-e; c.px=c.px||[]; c.px.unshift([c.x,c.y]); if(c.px.length>3) c.px.pop(); c.x=w*w*c.P0[0]+2*w*e*c.C[0]+e*e*c.P1[0]; c.y=w*w*c.P0[1]+2*w*e*c.C[1]+e*e*c.P1[1]; c.th+=c.om*h; c.sc=u<.12?1+u*1.2:1.14-.55*Math.pow(u,2.2); if(u>=1) arrive(c,false,c.x,c.y); } } }
    // сбор: когда всё легло (go) — по одной, сверху вниз
    if(go){ const now=(this.t=(this.t||0)+dt*ts()); const q=cs.filter(c=>c.ph==='rest'&&c.age-c.rt>=o.hold&&!cs.some(w=>w.ph==='rest'&&w.on===c)).sort((a,b)=>(b.z-a.z)||(a.rt-b.rt)); let nrel=0; while(q.length&&now>=nextRel&&nrel++<3){ if(!this.fl1){ this.fl1=1; lg('firstFly'); } const c=q.shift(), sy=o.floor+c.d-c.z; c.ph='fly'; c.t0=c.age; c.x0=c.x; c.y=sy; c.P0=[c.x,sy]; c.P1=o.to(); c.P1[0]+=rnd(-5,5); c.P1[1]+=rnd(-3,3); const dx=c.P1[0]-c.x, dy=c.P1[1]-sy, L=Math.hypot(dx,dy)||1; c.dur=(.4+Math.min(.16,L/o.ps*.028))*rnd(.92,1.08); c.C=[c.x+dx*.25+(Math.random()<.5?-1:1)*L*.16,sy+dy*.2-L*.22-o.ps*.3]; c.om=rnd(10,18)*(Math.random()<.5?-1:1); c.th=c.phi; c.sc=1; c.edge=false; c.rot=0; nextRel=Math.max(nextRel,now-.03)+clamp(.85/Math.max(1,nTot),.012,.032); } }
    for(let i=cs.length-1;i>=0;i--) if(cs[i].ph==='dead') cs.splice(i,1);
    if(closed&&!cs.length) this.fin(); },
   fin(){ if(ended) return; ended=true; this.dead=true; o.onDone&&o.onDone(); },
   onKill(){ ended=true; },
   draw(c){ const live=cs.filter(q=>q.ph!=='dead'&&q.ph!=='fly').sort((a,b)=>(a.d-b.d)||(a.z-b.z)), fl=cs.filter(q=>q.ph==='fly');
    for(const q of live){ const fz=q.ph==='rest'?(q.sz||0):sup(q), h=Math.max(0,q.z-fz), sh=clamp(1-h/(o.ps*1.4),.1,1), sy=o.floor+q.d-fz; c.save(); c.globalAlpha=(q.ph==='rest'?.5:.38)*sh*clamp(q.age/.06,0,1); c.fillStyle='#000'; c.beginPath(); c.ellipse(q.x+R*.12,sy+R*.08,R*(1+h/o.ps*.2),R*.42,0,0,6.2832); c.fill(); c.restore(); }
    for(const q of live){ const sy=o.floor+q.d-q.z, ph=q.ph==='air'?tri(q.th):q.phi, al=clamp(q.age/.05,0,1), v=q.ph==='air'?Math.hypot(q.vx,q.vz):0;
     if(v>o.ps*5){ const k=Math.min(1,(v-o.ps*5)/(o.ps*10)); for(let j=2;j>=1;j--) drawTok(c,q.x-q.vx*j/90,sy+q.vz*j/90,R,tri(q.th-q.om*j/90),q.rot,al*(.2-.07*j)*(.6+.8*k)); }
     drawTok(c,q.x,sy,R,ph,q.rot,al); }
    for(const q of fl){ const r=R*q.sc, ph=tri(q.th), tr=q.px||[]; for(let j=Math.min(2,tr.length)-1;j>=0;j--) drawTok(c,tr[j][0],tr[j][1],r*(1-.08*j),ph,0,.17-.06*j); drawTok(c,q.x,q.y,r,ph,0,1); } }});
  return {spawn(x,y,vx,vy,om){ nTot++; if(nTot===1) lg('firstSpawn'); const d=rnd(0,D), c={id:nid++,ph:'air',x,d,z:o.floor+d-y,vx,vd:rnd(-.5,.5)*o.ps*.5,vz:-vy,th:rnd(0,6.28),om:om||rnd(9,22)*(Math.random()<.5?-1:1),phi:0,phd:0,rot:rnd(-.7,.7),vr:rnd(-2.5,2.5),n:0,age:0,rt:0,sz:0,sc:1}; cs.push(c); return c; },
   go(){ go=true; lg('go'); }, close(){ closed=true; lg('close'); }, count:()=>cs.length, isDone:()=>ended, restN:()=>rest().length, kill(){ P.dead=true; ended=true; } }; }
 // билет WILD из мешка (обрывок): кувыркается, тяжелее конфетти, на скатерти скользит и гаснет
 function sackScrap(o){ let x=o.x,y=o.y,vx=o.vx,vy=o.vy,rot=rnd(-.6,.6),n=0,rest=0,fl=rnd(0,6.28),a=1; const vr=rnd(-4,4), vf=rnd(3,6), w=o.w, h=o.w*.62;
  return add({step(dt){ if(fast()){ this.dead=true; return; } let r=dt*ts(); while(r>1e-6){ const d=Math.min(r,1/120); r-=d;
     if(n<2){ vy+=o.g*.8*d; vy*=Math.exp(-.8*d); x+=vx*d; y+=vy*d; rot+=vr*d; fl+=vf*d; if(y>=o.floor&&vy>0){ y=o.floor; n++; vy=-vy*.22; vx*=.6; if(n>=2||Math.abs(vy)<o.g*.05){ n=2; vy=0; } } }
     else { x+=vx*d; vx*=Math.exp(-4.5*d); rest+=d; if(rest>.7) this.dead=true; } } a=n>=2?clamp(1-(rest-.25)/.45,0,1):1; },
   draw(c){ c.save(); c.globalAlpha=a; c.translate(x,y); c.rotate(rot); c.scale(1,Math.max(.25,Math.abs(Math.cos(fl)))); if(tkOK) c.drawImage(ticket,-w/2,-h/2,w,h); else { c.fillStyle='#e9dcc0'; c.fillRect(-w/2,-h/2,w,h); c.fillStyle='#b02a1f'; c.fillRect(-w/2,-h*.1,w,h*.2); } c.restore(); }}); }
 return {add,clear,flyCoin,spark,sackCoin,sackScrap,pour,time:()=>FXT,ts,drawCoin,warm:()=>{ try{ tsheet(); }catch(e){} }};
})();

// ---------- каждая кража: сумма → монетки → окошко SACK ----------
function gain(amount,from){ pending++; queue=queue.then(()=>flightIn(amount,from)).catch(e=>console.error(e)).then(()=>{ pending--; if(!pending&&!busy) release(); }); return queue; }
async function flightIn(amount,from){
 const h=hw(), quick=window.__sim||RM()||fast()||!h||!from||K()<=0, n1=Math.min(SN,SKV.n+1);
 if(quick){ SKV.v+=amount; SKV.n=n1; refresh(); if(!RM()&&h) flashLamp(n1-1); else if(RM()&&h&&!window.__sim) window.bpAudio&&bpAudio.play('sack.lamp_on'); return; } // без полётов: число прибавилось, лампа загорелась
 const to=winPt(), ps=X.pitch()||90, bt=X.bet()||1, nc=clamp(Math.round(3+Math.log2(1+amount/bt)*1.15),3,8), part=amount/nc, v0=SKV.v;
 const dur=(700+Math.min(200,Math.hypot(to[0]-from[0],to[1]-from[1])*.12))*K(), jobs=[]; let landed=0; // landed — сколько монет уже долетело (долетают не по порядку: число считаем по счётчику, а не по номеру монеты, иначе оно на миг перескакивает через итог)
 for(let i=0;i<nc;i++){ jobs.push(new Promise(res=>{ FX.flyCoin({from:[from[0]+rnd(-.35,.35)*ps,from[1]+rnd(-.3,.3)*ps],to:[to[0]+rnd(-5,5),to[1]+rnd(-3,3)],delay:(i*46+rnd(0,50))*K(),dur:dur*rnd(.92,1.12),arc:ps*rnd(.9,1.7),r:Math.max(ps,64)*rnd(.11,.15),spread:ps*rnd(.45,.9),
   onLand:()=>{ window.bpAudio&&bpAudio.play('sack.coin_in'); const last=++landed===nc, a=SKV.v, b=last?v0+amount:v0+part*landed; SKV.v=b; tweenVV(a,b,150); bump(last?1:.55); if(last) pulseNum(1); FX.spark(to[0]+rnd(-.2,.2)*ps,to[1]+rnd(-.12,.12)*ps,Math.max(ps,64)*.05,rnd(-50,50),rnd(-80,-20),.24,0); res(); }}); })); }
 maybePeek(from,ps);
 await Promise.all(jobs); SKV.n=n1; SKV.v=v0+amount; refresh(); setVV(SKV.v); flashLamp(n1-1); bump(1.3); }

// ---------- мешок «подпрыгивает» у нижней кромки поля (иногда): монетка упала не в окошко, а прямо в мешок под столом ----------
// Верх мешка (рисуется кодом, тот же мешок, что значок в окошке) поднимается из-за нижней рамки поля у правого угла, «ловит» монетку, подпрыгивает и прячется.
const PEEK_SVG='<svg viewBox="0 0 120 84" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs><linearGradient id="skp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e0a0"/><stop offset=".55" stop-color="#dcae55"/><stop offset="1" stop-color="#a4741f"/></linearGradient></defs><path d="M16 84 C12 58 28 42 46 35 L43 27 L33 20 L46 23 L52 12 L60 21 L68 12 L74 23 L87 20 L77 27 L74 35 C92 42 108 58 104 84 Z" fill="url(#skp)" stroke="#2b1704" stroke-width="2.6" stroke-linejoin="round"/><path d="M45 34 C55 40 65 40 75 34" stroke="#2b1704" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M46 34 C55 38.5 65 38.5 74 34" stroke="#b3361f" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M28 74 C31 60 38 50 47 44 M92 74 C89 60 82 50 73 44 M60 84 L60 46" stroke="rgba(110,64,8,.5)" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
function maybePeek(from,ps){
 if(Math.random()>.38||RM()||fast()) return; const f=$('field'), app=$('app'); if(!f||!app) return;
 const F=f.getBoundingClientRect(), g=X.fxGeo&&X.fxGeo(), w=ps*1.0, h=w*.7, cut=F.bottom-(g?g.rail.b*.5:ps*.08), x=F.right-ps*(1.2+rnd(0,1.3));
 $('skpeek')?.remove(); const box=document.createElement('div'); box.id='skpeek'; box.setAttribute('aria-hidden','true');
 Object.assign(box.style,{position:'fixed',left:(x-w/2)+'px',top:(cut-h*.62)+'px',width:w+'px',height:(h*.62)+'px',overflow:'hidden',zIndex:3,pointerEvents:'none'});
 box.innerHTML=PEEK_SVG; const sv=box.firstChild; Object.assign(sv.style,{position:'absolute',left:0,top:0,width:'100%',height:h+'px',transform:`translateY(${h*.66}px)`,transformOrigin:'50% 100%'}); app.append(box); // виден верх мешка (горловина с узлом и плечи), нижняя часть спрятана за рамкой
 const out=(ms,kf,o)=>X.animA(sv,kf,{duration:ms,fill:'forwards',easing:'cubic-bezier(.2,.8,.3,1)',...o});
 const gone=()=>{ box.remove(); };
 out(260,[{transform:`translateY(${h*.66}px)`},{transform:`translateY(${-h*.04}px)`,offset:.75},{transform:'translateY(0)'}]);
 FX.flyCoin({from:[from[0],from[1]],to:[x,cut-h*.5],delay:60*K(),dur:620*K(),arc:ps*1.2,r:Math.max(ps,64)*.12,spread:ps*.5,onLand:()=>{ // монетка в мешок: мешок подпрыгивает и приседает, потом прячется
  const a=out(380,[{transform:'translateY(0) scale(1,1)'},{transform:`translateY(${-h*.16}px) scale(.96,1.06)`,offset:.3},{transform:`translateY(${h*.03}px) scale(1.05,.94)`,offset:.62},{transform:'translateY(0) scale(1,1)'}]);
  setTimeout(()=>{ const b=out(300,[{transform:'translateY(0)'},{transform:`translateY(${h*.66}px)`}],{easing:'cubic-bezier(.5,0,.8,.4)'}); if(b) b.finished.catch(()=>{}).then(gone); else gone(); },(a?380:0)+260*K()); }});
 setTimeout(()=>{ if(box.isConnected) box.remove(); },3500); }

function mkLabel(amount){ const f=$('field'), F=f.getBoundingClientRect(), cw=Math.min(F.width/6,F.height/5), e=el('div','wl sk'); e.style.setProperty('--amt',(cw*.5).toFixed(1)+'px'); e.style.setProperty('--fm',Math.max(11,cw*.2).toFixed(1)+'px');
 e.innerHTML=`<div class="amt">${money.win(amount)}</div><div class="fm">SACK — PAID AGAIN</div>`; X.wlLayer().append(e); return {e,k:Math.min(1,F.width*.9/e.offsetWidth),cx:F.left+F.width/2,cy:F.top+F.height/2,cw}; }
// ---------- четвёртая кража: три варианта высыпания (владелец 2026-10-11: «давай 1, 2 вариант и ещё доработай вариант как сейчас, но естественный, с плавными анимациями через OpenRouter») ----------
// Всё движение — в роликах (Kling через OpenRouter, ключ с синего фона в WebM/HEVC с альфой, tools/clip_sack_build.py); код только ставит ролик, плавно двигает его по прямой (въезд/уход лапы), считает число и летит монетами в строку WIN.
//  ?sackfx=pawempty (по умолчанию, 2026-10-12) — та же лапа, мешок пустеет и обмякает (ролик KS-pawempty, версия 1, 6,2 с); лапу уводит код;
//  ?sackfx=paw (прежний вариант) — лапа с мешком выезжает из-за нижней рамки, переворачивает мешок над полем, монеты сыплются в самом ролике и уходят за рамку, мешок обмякает, лапа возвращается и уезжает;
//  ?sackfx=coins              — монетный фонтан из окошка SACK (ролик монет поверх), потом монеты летят в строку WIN;
//  ?sackfx=rocco              — Рокко поднимает мешок, держит горловиной вниз и трясёт (один ролик из двух частей), монеты сыплются из горловины кодом, падают на пол, отскакивают и летят в WIN.
// Выбор: ?sackfx=… (главнее) или кнопка «Мешок: …» в тест-панели (sessionStorage bp-sackfx). Turbo — без роликов: монеты сразу из окошка в WIN. Quick — ролики идут как есть (1×), код-часть короче. «Меньше движения» — смена состояния (выше).
// Время в роликах — секунды самого ролика (currentTime): число в WIN, SACK и монеты привязаны к кадру, а не к таймеру.
const FXM=['coins','rocco','paw','pawempty'];
const isPaw=()=>fxMode()==='paw'||fxMode()==='pawempty', pawKey=()=>fxMode()==='pawempty'?'pawempty':'paw'; // paw и pawempty — одна лапа, один код (playPaw, хуки), разные ролики
const fxMode=()=>{ const u=q.get('sackfx'); if(FXM.includes(u)) return u; let m=null; try{ m=sessionStorage.getItem('bp-sackfx'); }catch(e){} return FXM.includes(m)?m:'pawempty'; };
// данные роликов: tools/clip_sack_track.py. paw: W×H — размер WebM (px), k — высота лапы в долях высоты поля, dx — сдвиг по ширине (доля ширины ролика), x — где струя монет падает за рамку (доля ширины),
// flow — доля монет, прошедших нижнюю рамку, по кадрам (24 к/с), in/out — въезд и уход (мс), hold — когда (с) начинается уход; coins: ox/oy — где в кадре фонтан бьёт из точки (доли), cloud — облако монет [с,cx,cy,sx,sy,доля]
const CLIPS={
 paw:{file:'KS-pawpour',W:530,H:600,k:1.0,dx:0,x:.432,in:520,out:480,hold:3.8,flow:[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.002,0.012,0.034,0.057,0.073,0.076,0.076,0.082,0.093,0.114,0.14,0.168,0.193,0.218,0.248,0.282,0.316,0.346,0.375,0.402,0.426,0.449,0.476,0.503,0.531,0.554,0.583,0.607,0.63,0.651,0.675,0.705,0.734,0.759,0.786,0.814,0.845,0.872,0.904,0.934,0.96,0.976,0.988,0.996,0.999,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0]},
 pawempty:{file:'KS-pawempty2',mouth:{f0:28,x:[263.1,263.0,263.0,263.0,263.0,272.0,272.0,263.0,262.0,256.5,256.5,242.0,241.0,241.0,241.0,242.0,248.5,249.5,252.0,255.0,255.0,261.0,261.0,261.0,261.5,261.5,261.0,261.0,250.5,242.0,239.0,239.0,237.0,237.0,235.5,235.0,230.0,230.0,228.5,228.5,228.5,228.5,228.5,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,228.0,232.0,232.0,232.0,232.0,232.0,232.0,232.0,232.0,232.0,232.0,232.0],y:[[28,396],[40,400],[76,432],[82,436]]},W:530,H:600,k:1.0,dx:0,x:0.432,in:520,out:480,hold:6.08,flow:[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.002,0.011,0.033,0.055,0.069,0.072,0.073,0.078,0.089,0.109,0.134,0.16,0.185,0.208,0.237,0.269,0.301,0.33,0.358,0.384,0.406,0.428,0.454,0.48,0.506,0.533,0.57,0.609,0.646,0.681,0.712,0.741,0.764,0.782,0.797,0.809,0.823,0.84,0.859,0.878,0.899,0.919,0.94,0.962,0.979,0.991,0.996,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.998,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,0.999,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0]}, // та же лапа, но мешок пустеет и обмякает — версия 1 (ролик из db5fb05, 6,2 с; владелец 2026-10-12: «предыдущий вариант ставь», версия 2 из e75bb93 снята); данные — clip_sack_track.py pawempty того же коммита; in/out — мягкие въезд и уход (fb/anim-paw)
};
const OV=new Map();
(()=>{ const st=document.createElement('style'); st.textContent='#skov{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none}#skov video{position:absolute;max-width:none;display:block;pointer-events:none;visibility:hidden}'; document.head.append(st); })();
function ovHost(){ let h=$('skov'); if(!h){ h=document.createElement('div'); h.id='skov'; h.setAttribute('aria-hidden','true'); document.body.append(h); } return h; }
function ovVideo(name){ let v=OV.get(name); if(v&&v.isConnected) return v; v=document.createElement('video'); v.muted=true; v.playsInline=true; v.preload='none'; v.disablePictureInPicture=true; v.dataset.src=clip(name); ovHost().append(v); OV.set(name,v); return v; }
async function openClip(name){ const v=ovVideo(name); T.loadClip(v); if(!await T.readyV(v,2600)) return null; await T.seekV(v,0); return v; }
function warm(){ if(window.__sim||RM()||K()<.5) return; const m=fxMode(); if(m==='rocco'){ if(window.roccoWarm) window.roccoWarm('sackpull'); } else if(m!=='coins'){ T.loadClip(ovVideo(CLIPS[m].file)); if(isPaw()&&K()>=1&&window.roccoWarm) window.roccoWarm('handoff'); } } // paw: заодно ролик «Рокко отдаёт руку лапе» // файл ролика берётся заранее (первая кража 4-ки), а не в момент высыпания
// по часам ролика: tick(t, конец?) каждый кадр, пока t < tEnd; пропуск (fast), оборванный ролик и «встал» — выход. Ролик не ускоряется и не замедляется (K тут не нужен)
function drive(v,tEnd,tick){ return new Promise(done=>{ const slow=window.__slow||1, cap=performance.now()+(tEnd+5)*1000*slow; let lt=-1, lw=performance.now();
 const loop=()=>{ const t=v.currentTime, now=performance.now();
  if(fast()||!v.isConnected||v.ended||t>=tEnd||now>cap){ tick(Math.min(t,tEnd),true); done(); return; }
  if(t!==lt){ lt=t; lw=now; } else if(!document.hidden&&!v.paused&&now-lw>1800*slow){ tick(t,true); done(); return; }
  tick(t,false); requestAnimationFrame(loop); }; loop(); }); }
// окошко SACK: fr — какая доля уже высыпана (число убывает, лампы гаснут по одной)
function sackShow(amount,fr){ fr=clamp(fr,0,1); SKV.v=amount*(1-fr); setVV(SKV.v); const n=Math.max(0,4-Math.floor(fr*4.0001)); if(n!==SKV.n){ SKV.n=n; refresh(); setVV(SKV.v); } if(fr>0&&hw()) hw().classList.remove('ready'); }
// строка WIN: растёт к цели tgt (доля 0…1 от суммы мешка) плавно, на каждом «попадании» чуть подпрыгивает и вспыхивает искрой; end() ставит итог
function mkPay(amount,o,c){ const {res,F,ps}=c, pz=Math.max(ps,64), has=o.to!=null&&!!res, from=has?(o.from||0):0, to=has?o.to:0; let tgt=from, shown=from, pulse=0, last=performance.now(), dead=false;
 if(res) res.style.display='inline-block'; // число в WIN «подпрыгивает»: transform не работает на строчном элементе
 const spot=()=>{ const b=res?res.getBoundingClientRect():{left:F.left+F.width/2-30,top:F.bottom+ps*.15,width:60,height:ps*.3}; return [b.left+b.width/2,b.top+b.height/2]; };
 return {spot,
  frac(f){ if(has) tgt=Math.max(tgt,from+(to-from)*clamp(f,0,1)); },
  hit(spark){ pulse=Math.min(1,pulse+.34); if(spark&&!fast()){ const w=spot(); FX.spark(w[0]+rnd(-.14,.14)*(res?res.offsetWidth:60),w[1]+rnd(-.1,.1)*20,pz*.05,rnd(-50,50),rnd(-80,-20),.22,0); } },
  tick(){ if(!has||dead) return; const now=performance.now(), dtr=Math.min(.1,(now-last)/1000)*FX.ts(); last=now; shown+=(tgt-shown)*(1-Math.exp(-dtr/.07)); if(Math.abs(tgt-shown)<.004) shown=tgt; X.setResult(shown); pulse*=Math.exp(-dtr/.1); res.style.transform=`scale(${(1+.12*pulse).toFixed(3)})`; res.style.filter=`brightness(${(1+.7*pulse).toFixed(2)})`; },
  end(){ dead=true; if(!res) return; if(has) X.setResult(to); res.style.transform=''; res.style.filter=''; res.style.display=''; if(has&&!fast()) X.animA(res,[{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(1.16)',filter:'brightness(1.8)',offset:.3},{transform:'scale(1)',filter:'brightness(1)'}],{duration:380,easing:'cubic-bezier(.2,.8,.3,1)'}); }}; }
// подпись «SACK — PAID AGAIN» в свободном верхнем углу поля, пока сыплется
function labelOn(amount,F){ window.bpAudio&&(bpAudio.play('sack.coins_pour'),bpAudio.play('sack.paid_again',{delay:120})); const lab=mkLabel(amount), k=lab.k*.85, w=lab.e.offsetWidth*k; X.wlPlace(lab.e,clamp(F.left+F.width*.87,F.left+w/2+8,F.right-w/2-8),F.top+F.height*.16,k,0); let gone=false;
 return ()=>{ if(gone) return; gone=true; const out=()=>{ X.wlFade(lab.e,lab.cw*.16); setTimeout(()=>lab.e.remove(),1200); }; if(fast()) setTimeout(out,850); else out(); }; } // Skip: сумма на подписи всё равно читается ~1 с, а не мелькает кадр
const nCoins=(amount,lo,hi,a,b)=>clamp(Math.round(a+b*Math.log2(1+amount/(X.bet()||1))),lo,hi);
const winSink=(host,v)=>{ if(v){ try{ v.pause(); }catch(e){} v.style.visibility='hidden'; v.style.transform=''; v.style.transformOrigin=''; v.style.opacity=''; v.style.maskImage=v.style.webkitMaskImage=''; v.style.filter=''; } host.style.display='none'; host.style.clipPath=''; host.style.zIndex=''; FX.z=''; };
if(X.bonusScene()&&GS.fs>0&&!window.__sim) (window.requestIdleCallback?requestIdleCallback:f=>setTimeout(f,2500))(()=>{ try{ warm(); }catch(e){} },{timeout:4000}); // «Кухня» открыта (в том числе после перезагрузки с мешком на 3 кражах): ролик лапы берём заранее в простое страницы — к четвёртой краже он уже загружен

// ---- Turbo и запасной путь (ролик не загрузился/не запустился): монеты сразу из окошка SACK в строку WIN ----
async function playFly(amount,o,c){ const {h,F,ps,pay}=c, sb=h.getBoundingClientRect(), pz=Math.max(ps,64), n=nCoins(amount,6,14,7,1.2), t0=performance.now(), emptyMs=(n*34+260)*K(); let landed=0, cancel=null;
 if(K()>=.5||fast()) cancel=labelOn(amount,F); // Skip тоже показывает подпись с суммой (она часть выплаты, не анимация)
 await new Promise(done=>{ if(fast()||K()<=0) return done();
  for(let i=0;i<n;i++){ const w=pay.spot(); FX.flyCoin({from:[sb.left+sb.width*rnd(.3,.7),sb.top+sb.height*rnd(.3,.7)],to:[w[0]+rnd(-5,5),w[1]+rnd(-3,3)],delay:(i*34+rnd(0,40))*K(),dur:(520+rnd(0,120))*K(),arc:ps*rnd(.9,1.6),r:pz*rnd(.1,.14),spread:ps*rnd(.4,.8),
   onLand:()=>{ landed++; pay.frac(landed/n); pay.hit(true); if(landed>=n) done(); }}); }
  const lp=()=>{ pay.tick(); sackShow(amount,(performance.now()-t0)/emptyMs); if(landed<n&&!fast()) requestAnimationFrame(lp); }; lp(); });
 if(cancel) cancel(); return true; }

// ---- «Рокко отдаёт руку лапе» (владелец 2026-10-11: «когда лапа появляется на слоте, Рокко убирает руку за экран — как будто лапа его; когда лапа уходит, рука возвращается; плавно, одним роликом») ----
// В варианте paw дампом управляют три хука (все необязательны, могут быть async, ошибки глотаются; заменить: window.bpSack.hooks.beforePaw = … / leavePaw / afterPaw):
//   beforePaw(info) — ПЕРЕД подъёмом лапы (зовётся при входе в playPaw, пока грузится ролик лапы); вернул промис — лапа ждёт его, но не дольше PAW_HOOK_MS;
//   leavePaw(info)  — лапа НАЧИНАЕТ уходить (монеты высыпаны, начался уход вниз за раму; в этот момент рука Рокко начинает возвращаться). Не ждётся;
//   afterPaw(info)  — лапа ПОЛНОСТЬЮ уехала за раму (или ролик не пошёл / Skip). На каждый beforePaw приходится ровно один afterPaw. Не ждётся: счётчик и удар идут дальше, пока лапа уезжает.
// По умолчанию: beforePaw — запускает ролик Рокко KS-handoff (ui.js, window.roccoHandoff) и ждёт, пока его рука скроется за краем экрана (время ролика, а не таймер); leavePaw — отпускает руку назад; afterPaw — подчистка.
// Turbo/Quick, «меньше движения», Skip, раскладки, где край ролика не доходит до края экрана (планшет стоя) — ролика Рокко нет (window.roccoHandoff вернёт null), лапа одна. Рокко в это время не радуется (замена W-dance), удар (punchColumn) ждёт, пока рука вернулась (roccoAfter 'K-handoff').
const PAW_HOOK_MS=8500, hooks={}; let HC=null;
hooks.beforePaw=async()=>{ HC=null; const HO=window.bpHandoffClip, mk=window.roccoHandoff; if(!HO||!mk||!isPaw()) return; const h=mk(); if(!h) return; HC=h;
 const lim=real(((window.roccoLagMs?window.roccoLagMs():0)+7000)*(window.__slow||1)).then(()=>false); // нейтрального окна прежнего ролика ждём до 5 с (rocco-flow.js), потом ещё до cue
 if(!await Promise.race([h.started,lim])){ h.end(); if(HC===h) HC=null; return; }
 await h.at(HO.cue); };
hooks.leavePaw=()=>{ if(HC) HC.leave(); };
hooks.afterPaw=()=>{ const h=HC; HC=null; if(h) h.release(); };
async function pawHook(phase){ const f=hooks[phase==='before'?'beforePaw':phase==='leave'?'leavePaw':'afterPaw']; if(typeof f!=='function') return;
 try{ const r=f({phase,fast:!!fast()}); if(phase==='before'&&r&&typeof r.then==='function') await Promise.race([r,real(PAW_HOOK_MS*(window.__slow||1))]); }catch(e){} }

// ---- ?sackfx=pawempty (по умолчанию, ролик KS-pawempty, 6,2 с) и ?sackfx=paw (ролик KS-pawpour, 4,1 с): одна лапа и один код, ролик берёт pawKey() ----
async function playPaw(amount,o,c){
 const {h,F,ps,pay}=c, g=X.fxGeo&&X.fxGeo(), CP=CLIPS[pawKey()], pz=Math.max(ps,64); if(!g) return false;
 let began=true; const hb=pawHook('before'), finish=()=>{ if(began){ began=false; pawHook('after'); } }; // хук «перед подъёмом»: Рокко начинает убирать руку, пока грузится ролик лапы
 const v=await openClip(CP.file); if(!v){ finish(); return false; }
 let leaving=false; const lr=g.lr, Hc=lr.height*CP.k, Wc=Hc*CP.W/CP.H, host=ovHost(), xr=lr.left+lr.width/2+(CP.dx-.5)*Wc+CP.x*Wc, down=Hc+12; let cancel=null;
 host.style.zIndex=71; host.style.clipPath=`inset(0 0 ${Math.max(0,innerHeight-lr.bottom)}px 0)`; // лапа выезжает из-за нижней рамки (как лапа коллекта): всё, что ниже края сетки, обрезано
 Object.assign(v.style,{left:(lr.left+lr.width/2-Wc/2+CP.dx*Wc)+'px',top:(lr.bottom-Hc)+'px',width:Wc+'px',height:Hc+'px',transform:`translateY(${down}px)`,filter:'drop-shadow(0 6px 10px rgba(0,0,0,.55))',visibility:'visible'}); host.style.display='block'; FX.z=80;
 try{
  await hb; // лапа поднимается, когда рука Рокко за рамой (ролик Рокко идёт сам, ждём его кадр, а не таймер)
  try{ await v.play(); }catch(e){ return false; }
  X.animA(v,[{transform:`translateY(${down}px)`},{transform:'translateY(0)'}],{duration:CP.in,easing:'cubic-bezier(.25,.6,.3,1)',fill:'forwards'})||(v.style.transform='none'); // въезд снизу: прямая, плавное торможение (наклон кривой ≈2,4 вместо 5,3: лапа не «выскакивает» за 2–3 кадра); поворот и высыпание — в самом ролике
  const fl=t=>{ const k=clamp(t*24,0,CP.flow.length-1), i=k|0, a=CP.flow[i], b=CP.flow[Math.min(i+1,CP.flow.length-1)]; return a+(b-a)*(k-i); }; // доля монет, прошедших рамку
  // монеты — код (2026-10-12, fb/coins): ролик показывает только мешок и лапу (поток монет из ролика убран), из горловины по очереди выходят отдельные монеты со своей физикой; ложатся на «пол» (нижняя рама поля), потом улетают в WIN
  const MP=CP.mouth, nC=nCoins(amount,28,56,26,6), R=Math.max(ps*.15,7), scl=Hc/CP.H, ox=lr.left+lr.width/2-Wc/2+CP.dx*Wc, oy=lr.bottom-Hc;
  const mxAt=fr=>{ const A=MP.x, i=clamp(fr-MP.f0,0,A.length-1), j=i|0; return A[j]+(A[Math.min(j+1,A.length-1)]-A[j])*(i-j); };
  const myAt=fr=>{ const Y=MP.y; let i=0; while(i<Y.length-2&&Y[i+1][0]<fr) i++; const A=Y[i], B=Y[i+1]; return A[1]+(B[1]-A[1])*clamp((fr-A[0])/(B[0]-A[0]),0,1); };
  let spawned=0, arrived=0, closedAt=-1, goDone=false, finished=false;
  const PR=FX.pour({ps,R,floor:lr.bottom-ps*.34,D:ps*.2,xmin:lr.left+R*1.3,xmax:lr.right-R*1.3,g:ps*30,hold:.12,to:()=>pay.spot(),onArrive:skip=>{ arrived++; pay.frac(arrived/nC); pay.hit(!skip&&arrived%3===0); },onDone:()=>{ finished=true; }});
  try{
  await drive(v,CP.hold,(t,end)=>{ const f=fl(t);
   if(!cancel&&f>.01){ cancel=labelOn(amount,F); if(!HC) try{ X.react('W-dance'); }catch(e){} } // Рокко радуется, пока сыплется (react сам молчит в Quick и если Рокко занят); с KS-handoff его рука за рамой — он не радуется
   const want=fast()?nC:Math.round(nC*clamp(fl(t+.15)/.998,0,1));
   while(spawned<want&&!fast()){ const fr=t*24, mx=mxAt(fr), my=myAt(fr)-7, vm=(mxAt(fr+2)-mxAt(fr-2))/(4/24)*scl;
    PR.spawn(ox+mx*scl+rnd(-.4,.4)*R,oy+my*scl,vm*.4+rnd(-.9,.35)*ps,rnd(.1,.9)*ps); spawned++; }
   if(spawned>=nC&&closedAt<0){ closedAt=t; PR.close(); }
   if(closedAt>=0&&!goDone&&t>=closedAt+.1){ goDone=true; PR.go(); } // все монеты легли — собираем
   sackShow(amount,spawned/nC); pay.tick(); });
  if(!goDone){ while(spawned<nC&&!fast()){ const fr=CP.mouth.f0+60; PR.spawn(ox+mxAt(fr)*scl,oy+myAt(fr)*scl-7,rnd(-.9,.35)*ps,rnd(.1,.9)*ps); spawned++; } PR.close(); PR.go(); }
  const w0=performance.now(); while(!finished&&!fast()&&performance.now()-w0<7000*(window.__slow||1)){ pay.tick(); await new Promise(r=>requestAnimationFrame(r)); } // долетели все монеты
  } finally{ if(!finished) PR.kill(); }
  pay.frac(1); pawHook('leave'); const out=fast()?null:X.animA(v,[{transform:'translateY(0)'},{transform:`translateY(${down}px)`}],{duration:CP.out,easing:'cubic-bezier(.55,0,.8,.4)',fill:'forwards'}); // уход вниз за рамку: прямая, с разгоном
  if(cancel) cancel(); cancel=null; sackShow(amount,1);
  if(out){ leaving=true; out.finished.catch(()=>{}).then(()=>{ winSink(host,v); finish(); }); } // дальше (счётчик, удар) идёт, пока лапа уезжает: ролик убираем, когда доехал; afterPaw (рука Рокко возвращается) — тоже тут
  return true;
 } finally{ if(cancel) cancel(); if(!leaving){ winSink(host,v); finish(); } } }

// ---- ?sackfx=coins: фонтан монет из окошка SACK (ролик KS-coinfount, 4,4 с) ----
async function playCoins(amount,o,c){
 const {h,F,ps,pay}=c, sb=h.getBoundingClientRect(), nC=nCoins(amount,32,60,30,6), R=Math.max(ps*.15,7), fz=F.bottom-ps*.36, g=ps*30, D=ps*.22; let spawned=0, arrived=0, finished=false, cancel=null;
 const PR=FX.pour({ps,R,floor:fz,D,xmin:F.left+R*1.3,xmax:F.right-R*1.3,g,hold:.12,to:()=>pay.spot(),onArrive:skip=>{ arrived++; pay.frac(arrived/nC); pay.hit(!skip&&arrived%3===0); },onDone:()=>{ finished=true; }});
 FX.z=80; try{
  bump(1.7); FX.spark(sb.left+sb.width*.5,sb.top+sb.height*.5,Math.max(ps,64)*.5,0,0,.3,0); cancel=labelOn(amount,F); try{ X.react('W-dance'); }catch(e){} // Рокко радуется (react сам молчит в Quick и если Рокко занят)
  // фонтан из окошка SACK: монеты вылетают вверх-вправо дугой и падают на поле (2026-10-12: вместо ролика, каждая монета — отдельное тело)
  const SP=1.5, ts0=performance.now(); let goAt=-1;
  await new Promise(done=>{ const lp=()=>{ const el=(performance.now()-ts0)/1000*FX.ts(); if(fast()) return done();
   const want=Math.round(nC*clamp(el/SP,0,1)); while(spawned<want){ const x0=sb.right-sb.width*rnd(.05,.4), y0=sb.top+sb.height*rnd(.1,.4), vz=rnd(8,14)*ps, T=(vz+Math.sqrt(vz*vz+2*g*(fz+D*.5-y0)))/g, tx=F.left+F.width*rnd(.1,.72); PR.spawn(x0,y0,(tx-x0)/T,-vz,rnd(10,22)*(Math.random()<.5?-1:1)); spawned++; if(spawned%6===0) bump(.5); }
   sackShow(amount,spawned/nC); pay.tick();
   if(spawned>=nC&&goAt<0){ goAt=el; PR.close(); } if(goAt>=0&&el>=goAt+.15){ PR.go(); return done(); } requestAnimationFrame(lp); }; lp(); });
  if(fast()) return true; PR.go();
  const w0=performance.now(); while(!finished&&!fast()&&performance.now()-w0<8000*(window.__slow||1)){ pay.tick(); await new Promise(r=>requestAnimationFrame(r)); }
  cancel(); cancel=null; pay.frac(1); sackShow(amount,1); return true;
 } finally{ if(cancel) cancel(); if(!finished) PR.kill(); FX.z=''; } }

// ---- ?sackfx=rocco: Рокко поднимает мешок и трясёт (ролик KS-sackroc из двух частей, 8,7 с; без отражения, нейтральные окна — rocco-flow.js) ----
// Мешок рисует ролик, монеты — код: из горловины (положение по кадрам — CL.mouth) во время тряски; падают на пол под ногами Рокко, отскакивают и по очереди летят в строку WIN.
const mouthAt=t=>{ const M=CL.mouth; let i=0; while(i<M.length-2&&M[i+1][0]<t) i++; const a=M[i], b=M[i+1], k=clamp((t-a[0])/((b[0]-a[0])||1),0,1); return [a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k]; };
const pourProg=u=>u<.2?.15*u/.2:.15+.85*(u-.2)/.8; // сначала тонкая струйка (мешок висит), с началом тряски — основной поток
async function playRocco(amount,o,c){
 const {h,F,ps,pay}=c, pz=Math.max(ps,64); if(!window.roccoUmPt||!window.roccoBox||!$('krocco')) return false;
 const v=document.querySelector(SEL); if(!v) return false;
 if(window.roccoWarm) window.roccoWarm('sackpull');
 window.roccoRun=null; X.react('K-dump'); // ролик встаёт в очередь контроллера (ждёт нейтрального окна прежнего, rocco-flow.js)
 const R=window.roccoRun; if(!R||R.n!=='sackpull') return false; // roccoRun — запрос, который поставил roccoPlay (ui.js): started=true, когда ролик пошёл
 const lim=(3200+(window.roccoLagMs?window.roccoLagMs():0))*(window.__slow||1);
 if(!await Promise.race([R.started,real(lim).then(()=>false)])||fast()){ R.end(); return false; }
 const nC=nCoins(amount,26,48,26,8), nT=nCoins(amount,3,5,2,.8), p0=CL.pour[0], p1=CL.pour[1]; let spawned=0, ti=0, arrived=0, bumped=false, cancel=null, flyNext=0;
 const sched=()=>{ flyNext=Math.max(FX.time()+rnd(.03,.09),flyNext)+.011; return flyNext; }; // вылет монет с пола в WIN — потоком, примерно по 11 мс друг за другом
 const at=t=>{ const m=mouthAt(t), p=window.roccoUmPt(m[0],m[1]), m2=mouthAt(t+.06), p2=window.roccoUmPt(m2[0],m2[1]); return p&&p2&&isFinite(p[0])&&isFinite(p[1])?{x:p[0],y:p[1],vx:clamp((p2[0]-p[0])/.06,-1200,1200),vy:clamp((p2[1]-p[1])/.06,-1200,1200)}:null; };
 const spawnCoin=t=>{ const a=at(t); if(!a) return; const B=window.roccoBox(), fy=Math.max(B.b-rnd(0,.03)*innerHeight,a.y+.5*ps);
  FX.sackCoin({x:a.x+rnd(-.12,.12)*ps,y:a.y+rnd(0,.1)*ps,vx:a.vx*.5+rnd(-1,1)*ps*1.2,vy:a.vy*.3+ps*rnd(.2,1.4),floor:fy,g:ps*26,r:pz*rnd(.085,.125),ps,sched,to:pay.spot,
   onArrive:skip=>{ arrived++; pay.frac(arrived/nC); pay.hit(!skip); }}); };
 const spawnScrap=t=>{ const a=at(t); if(!a) return; const B=window.roccoBox(); FX.sackScrap({x:a.x,y:a.y,vx:a.vx*.4-ps*rnd(.2,1),vy:a.vy*.3+ps*rnd(.2,1),floor:Math.max(B.b-rnd(0,.03)*innerHeight,a.y+.5*ps),g:ps*26,w:pz*rnd(.36,.5)}); };
 try{
  await drive(v,p1,(t,end)=>{ if(!bumped&&t>=CL.appear){ bumped=true; bump(.7); }
   if(!cancel&&t>=p0-.2) cancel=labelOn(amount,F);
   const want=Math.round(nC*pourProg(clamp((t-p0)/(p1-p0),0,1))); while(spawned<want&&t>=p0){ spawnCoin(t); spawned++; if(spawned%7===0) bump(.5); }
   while(ti<nT&&t>=p0+(p1-p0)*.2*(ti+1)/(nT+1)+(p1-p0)*.1){ spawnScrap(t); ti++; }
   sackShow(amount,spawned/nC); pay.tick(); });
  while(spawned<nC&&!fast()){ spawnCoin(p1); spawned++; } // ролик ушёл дальше — досыпаем остаток там, где была горловина в конце тряски
  sackShow(amount,1); const w1=performance.now(); while(arrived<nC&&!fast()&&performance.now()-w1<6000*(window.__slow||1)){ pay.tick(); await new Promise(r=>requestAnimationFrame(r)); }
  if(cancel) cancel(); cancel=null; pay.frac(1); return true;
 } finally{ if(cancel) cancel(); } }

async function dump(amount,o){
 o=o||{}; await queue; busy=true; clearTimeout(watch); let pay=null;
 try{
  SKV.on=true; SKV.v=amount; SKV.n=SN; refresh();
  const h=hw(), f=$('field'), res=document.querySelector('#result b');
  if(window.__sim||!h||!f||(fast()&&!RM())){ SKV.v=0; SKV.n=0; SKV.on=false; refresh(); if(o.to!=null) X.setResult(o.to); if(!window.__sim&&f&&fast()){ try{ X.special(money.win(amount),'SACK — PAID AGAIN'); }catch(e){} } if(o.lift) await o.lift(); return; }
  if(RM()){ // «меньше движения»: короткая смена состояния — надпись, окошко $0.00, строка WIN
   window.bpAudio&&bpAudio.play('sack.paid_again'); SKV.v=0; SKV.n=0; SKV.on=false; refresh(); X.setResult(o.to); const e=X.special(money.win(amount),'SACK — PAID AGAIN'); await real(1000); if(o.lift) await o.lift(); return; }
  const F=f.getBoundingClientRect(), ps=X.pitch()||90, c={h,f,res,F,ps}; pay=c.pay=mkPay(amount,o,c);
  // 1) 4/4: окошко «готово» — читается, что мешок полон
  h.classList.add('ready'); bump(1); window.bpAudio&&bpAudio.play('sack.dump',{delay:350}); await X.sleep(300);
  // 2) высыпание: ?sackfx=pawempty|paw|coins|rocco (Turbo — сразу монетами); не вышло (ролик не загрузился, Рокко не показан) — тоже монетами
  const m=fxMode(); let ok=false; SKV.quiet=true;
  if(K()>=.5) ok=await (m==='coins'?playCoins:m==='rocco'?playRocco:playPaw)(amount,o,c);
  if(!ok) await playFly(amount,o,c);
  pay.end(); pay=null; SKV.v=0; SKV.n=0; SKV.on=false; SKV.quiet=false; refresh(); // окошко пусто, лампы погашены
  // 3) дальше — счётчик на ступень выше, трюк ступени, удар (o.lift из ui.js)
  if(o.lift){ await X.sleep(140); await o.lift(); }
 } finally{ if(pay) pay.end(); busy=false; SKV.quiet=false; if(!pending){ if(SKV.on) release(); } hw()&&hw().classList.remove('ready'); }
}

// ---------- вход в «Кухню» (один раз) ----------
const introDue=()=>X.bonusScene()&&GS.fs>0&&GS.fs===GS.fst&&!GS.kintro&&!GS.spinning&&!window.__sim&&!!hw()&&q.get('sackintro')!=='0';
let introRun=null;
async function intro(force){
 const h=hw(); if(!h||(!force&&!introDue())||introRun) return; GS.kintro=true; X.save(); warm(); // ролик высыпания начинает грузиться на входе в «Кухню», а не на первой краже
 let skipped=false, cap=null, big=null, onSkip=null; const skipP=new Promise(r=>{ onSkip=()=>{ skipped=true; r(); }; });
 const sink=()=>onSkip(); ['pointerdown','keydown'].forEach(n=>addEventListener(n,sink,true));
 const wait=ms=>Promise.race([RM()?real(Math.min(ms,380)):X.sleep(ms),skipP]);
 const ic=h.querySelector('.skic'); const clean=()=>{ ['pointerdown','keydown'].forEach(n=>removeEventListener(n,sink,true)); h.classList.remove('intro'); if(ic) ic.style.opacity=''; if(big) big.remove(); if(cap&&cap.isConnected) X.wlFade(cap,0); introRun=null; };
 introRun=skipP;
 try{
  h.classList.add('intro'); if(ic) ic.style.opacity='0';
  const lamps=[...h.querySelectorAll('.lp')];
  if(!RM()){
   bump(1.5); window.bpAudio&&bpAudio.play('sack.intro'); const r=ic?ic.getBoundingClientRect():h.getBoundingClientRect();
   if(ic){ big=document.createElement('div'); big.className='skbig'; big.innerHTML=ic.outerHTML; const s=Math.max(r.width,26)*2.6; Object.assign(big.style,{position:'fixed',left:(r.left+r.width/2-s/2)+'px',top:(r.top+r.height/2-s/2)+'px',width:s+'px',height:s*(r.height/r.width)+'px',zIndex:10,pointerEvents:'none',opacity:0,transformOrigin:'50% 80%'}); big.firstChild.style.cssText='position:static;width:100%;height:100%;margin:0'; document.body.append(big);
    const a=X.animA(big,soft([{opacity:0,transform:'scale(.15) rotate(-18deg)'},{opacity:1,transform:'scale(1.12) rotate(5deg)',offset:.5},{opacity:1,transform:'scale(.94) rotate(-2deg)',offset:.72},{opacity:1,transform:'scale(1) rotate(0deg)'}]),{duration:560,easing:'cubic-bezier(.2,.8,.3,1)',fill:'forwards',smooth:60}); if(!a){ big.style.opacity=1; } } // рост до 1,12, откат до .94 и посадка: на каждый ход по одному горбу скорости, без изломов на кадрах .5 и .72 (раньше — ломаная)
  }
  await wait(380);
  if(!skipped){ cap=X.special(`EVERY ${SN} STEALS`,`SACK PAYS AGAIN · COUNTER UP · +${X.DUMP_SPINS||3} SPINS`); }
  // 4 пустые лампы: по очереди вспыхивают «раз-два-три-четыре» и остаются пустыми
  for(let i=0;i<SN&&!skipped;i++){ flashLamp(i); await wait(SN>5?70:120); }
  if(!skipped&&ic&&big&&!RM()){ const r=ic.getBoundingClientRect(), b=big.getBoundingClientRect(); const a=X.animA(big,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${(r.left+r.width/2)-(b.left+b.width/2)}px,${(r.top+r.height/2)-(b.top+b.height/2)}px) scale(${(r.width/b.width).toFixed(3)})`,opacity:1}],{duration:320,easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'}); if(a) await Promise.race([a.finished.catch(()=>{}),skipP]); }
  if(ic) ic.style.opacity=''; if(big){ big.remove(); big=null; }
  await wait(RM()?400:520);
 } finally{ clean(); }
}

window.bpCoin={draw:FX.drawCoin,warm:FX.warm}; // жетон «вечеринки» для монет у плашки WIN (wincel.js, fb/win-drum)
window.bpSack={hold,gain,dump,intro,introDue,idle:()=>queue,sync:()=>{ if(!pending&&!busy&&SKV.on) release(); },clip:CL,clips:CLIPS,mode:fxMode,hooks,pawTimes:()=>{ const P=CLIPS[pawKey()]; return {mode:fxMode(),file:P.file,enter:P.in/1000,leave:P.hold,out:P.out/1000,gone:P.hold+P.out/1000}; }}; // clips/mode/hooks — для проверок и замены хуков лапы
})();
