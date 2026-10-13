// Blackout Party — праздник малого и среднего выигрыша (2026-10-12, ветка fb/win-drum; владелец: «когда барабан считает выигрыш — монеты чуть вскакивают вверх с макушки барабана и летят вниз по сторонам», «падают небольшие конфетти, как фанфары, свет сверху мигает»).
// Макет, не игра. Три вещи, все без свечений и ореолов:
//  1) монеты из верхней кромки окошка WIN там, где оно сейчас на экране (ПК — окошко в пульте, телефон — плашка WIN; прямоугольник берём по факту, 2026-10-13, fb/pod-coins): выходят по одной с шагом 60–120 мс, подскок вверх 30–60 px, парабола влево/вправо по очереди, переворот жетона (виден ребро) и лёгкий поворот; часть монет ударяется о верхнюю кромку пульта и отскакивает один раз, остальные уходят за кромку или за край экрана; тень на кромке пульта; звон при вылете (sack.coin_chink) и стук при отскоке (sack.coin_clink), не чаще раза в 50 мс; количество 3–14 — по величине выигрыша;
//  2) конфетти сверху: бумажки цветов игры (красный, охра, крем), кувыркаются и падают медленно; чем больше выигрыш, тем больше;
//  3) свет сверху мигает: фон сцены (#bg, вместе с нарисованной лампой) коротко темнеет и светлеет жёсткими ступенями, как плохая лампа; не чаще раза в 1,1 с.
// Крючки без правок ui.js: обёртки поверх WinFx.count (ui.js tweenResult зовёт его на каждом счёте) и WinFx.step (каждый шаг выигрыша). Свой холст #wcel (в #app, под плашками HUD, над полем), свой цикл кадров, на время простоя цикл стоит.
// Не мешают Big Win: шаги от 10× ставки пропускаются, а когда на экране шоу (#bp-big) — частицы мгновенно убираются. «Меньше движения»: частиц втрое меньше, света нет. Turbo/Quick — меньше частиц, Skip — ничего.
(()=>{
'use strict';
const $=id=>document.getElementById(id), rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const RMq=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const X=()=>window.bpHlCtx&&window.bpHlCtx(), K=()=>{ const x=X(); return x?x.K():1; };
const bet=()=>{ try{ return window.bpTime.ex.bet()||1; }catch(e){ return 1; } };
const AU=(ev,o)=>{ try{ if(window.bpAudio) window.bpAudio.play(ev,o||{}); }catch(e){} };
const COL=[['#b0392b','#7d231a'],['#8e2f24','#5e1f18'],['#ffc861','#c9922f'],['#e0a63c','#a8771f'],['#e9dcc0','#b3a583'],['#d8cba8','#a29672']]; // [лицо, изнанка]: красный, охра, крем (палитра игры)
const S={cv:null,cx:null,P:[],raf:0,last:0,dpr:1,flick:0,g:null,tail:0,snd:0};
const LIM_CONF=64, LIM_COIN=40;

// ---------- холст ----------
function canvas(){ const app=$('app'); if(!app) return null; if(S.cv&&S.cv.isConnected) return S.cv;
 const c=document.createElement('canvas'); c.id='wcel'; c.setAttribute('aria-hidden','true'); c.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:8'; app.appendChild(c); S.cv=c; fit(); return c; }
function fit(){ const c=S.cv; if(!c) return; S.dpr=Math.min(1.5,window.devicePixelRatio||1); c.width=Math.round(innerWidth*S.dpr); c.height=Math.round(innerHeight*S.dpr); S.cx=c.getContext('2d'); }
addEventListener('resize',()=>{ if(S.cv) fit(); });
function wake(){ if(!canvas()) return false; if(!S.raf){ S.last=performance.now(); S.raf=requestAnimationFrame(tick); } return true; }
// где окошко WIN и что под ним: окно (откуда вылет), «кромки» — верхние края пульта/плашки, о которые бьются монеты и за которыми они прячутся
function geo(){ const res=$('result'); if(!res) return null; const w=res.querySelector('.wn')||res, R=w.getBoundingClientRect(); if(R.width<12||R.height<8||R.bottom<0||R.top>innerHeight) return null;
 const cand=[], pod=$('pod'), led=[]; const rc=e=>{ const r=e.getBoundingClientRect(); return r.width>20&&r.height>10?r:null; };
 if(pod){ const pr=pod.getBoundingClientRect(); if(pr.width<innerWidth*.97||pr.height<innerHeight*.6){ const q=rc(pod); if(q) cand.push(q); } pod.querySelectorAll('.grp.fr').forEach(g=>{ const q=rc(g); if(q) cand.push(q); }); }
 const mx=R.left+R.width/2; let surf=null; for(const c of cand){ if(mx<c.left||mx>c.right||c.bottom<=R.top+2||c.top>R.bottom+120) continue; if(!surf||c.top<surf.top) surf=c; }
 const inside=surf&&surf.top<=R.top+2; let top=R.top, inL=R.left, inW=R.width;
 if(inside){ top=R.top+R.height*.06; inL=R.left+R.width*.04; inW=R.width*.92; } // окошко в пульте: рамка окошка чуть уже блока
 else { const pl=(res.querySelector('.rwp')||res).getBoundingClientRect(); if(pl.width>20&&pl.height>8) led.push(pl); }
 if(surf) led.push(surf); led.sort((a,b)=>a.top-b.top);
 return {top,l:inL,w:inW,h:R.height,led:led.map(r=>({l:r.left,r:r.right,t:r.top,b:r.bottom,o:r.top+Math.min(8,r.height*.2)}))}; }
function clear(){ S.P.length=0; S.tail=0; if(S.cv){ S.cv.remove(); S.cv=null; S.cx=null; } if(S.raf){ cancelAnimationFrame(S.raf); S.raf=0; } }

// ---------- жетон: спрайт из sack.js (window.bpCoin), запасной — плоский кружок ----------
function drawCoin(c,x,y,r,fl,rot,a){ if(window.bpCoin&&window.bpCoin.draw){ window.bpCoin.draw(c,x,y,r,fl,rot,a); return; }
 c.save(); c.globalAlpha=a; c.translate(x,y); c.rotate(rot); c.scale(1,Math.max(.15,Math.abs(Math.cos(fl)))); c.fillStyle='#c28f2e'; c.beginPath(); c.arc(0,0,r,0,6.2832); c.fill(); c.strokeStyle='#6a4511'; c.lineWidth=Math.max(1,r*.18); c.stroke(); c.restore(); }

// ---------- кадр ----------
function tick(now){ S.raf=0; const cx=S.cx; if(!cx||!S.cv||!S.cv.isConnected){ S.P.length=0; return; }
 const big=$('bp-big'); if(big&&S.P.length) S.P.forEach(p=>{ p.kill=true; }); // шоу Big Win: всё убираем сразу, чтобы не мешать
 const dt=Math.min(.05,Math.max(0,(now-S.last)/1000)); S.last=now; S.g=geo();
 cx.setTransform(S.dpr,0,0,S.dpr,0,0); cx.clearRect(0,0,innerWidth,innerHeight);
 for(const p of S.P){ if(p.kill){ p.dead=true; continue; } p.age+=dt; if(p.age<p.delay) continue; if(!p.born){ p.born=true; p.onBorn&&p.onBorn(p); } p.step(dt); }
 const G=S.g, holes=()=>{ cx.beginPath(); cx.rect(0,0,innerWidth,innerHeight); if(G) for(const e of G.led) cx.rect(e.l,e.o,e.r-e.l,innerHeight); };
 cx.save(); if(G&&G.led.length){ holes(); cx.clip('evenodd'); } // за пультом (и за плашкой) монеты и бумажки скрываются
 for(const p of S.P) if(!p.dead&&p.born&&!p.em&&!p.coin) p.draw(cx);
 cx.restore();
 for(const p of S.P) if(!p.dead&&p.born&&!p.em&&p.coin) p.draw(cx); // владелец 2026-10-13: монета выходит из-за окошка WIN (сзади), а падает ПЕРЕД пультом/плашкой — без обрезки
 if(G){ cx.save(); cx.beginPath(); cx.rect(0,0,innerWidth,G.top+1); cx.clip(); for(const p of S.P) if(!p.dead&&p.born&&p.em) p.draw(cx); cx.restore(); } // монета, пока выходит из окошка, видна только над его верхней кромкой
 S.P=S.P.filter(p=>!p.dead);
 if(S.P.length) S.raf=requestAnimationFrame(tick); else { S.cv.remove(); S.cv=null; S.cx=null; } }

// ---------- монеты из верхней кромки окошка WIN ----------
function coinsFor(x){ return x<.5?3:x<1?4:x<2?6:x<5?9:x<10?12:14; }
const snd=(ev,o)=>{ const t=performance.now(); if(t-S.snd<50) return; S.snd=t; AU(ev,o); }; // не чаще раза в 50 мс — без каши
function coins(delta,ms){ if(!(delta>0)) return; const k=K(); if(!RMq()&&k<.12) return; // Skip — без монет
 if($('bp-big')||!geo()||!canvas()) return;
 let n=coinsFor(delta/bet()); if(RMq()) n=Math.min(n,3); else if(k<1) n=Math.max(2,Math.round(n*.6));
 n=Math.min(n,Math.max(0,LIM_COIN-S.P.filter(p=>p.coin).length)); if(!n) return;
 const pace=clamp(k||1,.5,1), nowS=performance.now()/1000; let t=Math.max(0,S.tail-nowS); // монеты выходят по одной, шаг 60–120 мс, и новая пачка встаёт в хвост прежней
 const slots=[...Array(n).keys()].sort(()=>Math.random()-.5), flip=Math.random()<.5;
 for(let i=0;i<n;i++){ S.P.push(coin(t,slots[i]/Math.max(1,n-1),(i%2?1:-1)*(flip?-1:1))); t+=rnd(.06,.12)*pace; }
 S.tail=nowS+t; wake(); }
function coin(delay,u,side){ let x=0,y=0,vx=0,vy=0,fl=rnd(0,6.28),rot=rnd(0,6.28),r=8,g=1500,om=0,vr=0,life=0,bounced=false,wb=false,sc=1;
 const bounce=Math.random()<.45;
 return {coin:1,age:0,delay,born:false,dead:false,em:true,
  onBorn(){ const G=S.g; if(!G){ this.dead=true; return; } sc=clamp(G.h/34,.9,1.3); r=12.6*sc; g=1500*sc; // владелец 2026-10-13: монеты крупнее (было 8.4)
   x=G.l+G.w*(.08+.84*u); y=G.top; const rise=rnd(30,60)*sc; vy=-Math.sqrt(2*g*rise); // подскок 30–60 px
   const fall=Math.abs(side)*rnd(105,290)*sc; vx=side*fall*(.8+.3*Math.abs(u-.5)*2)+rnd(-12,12); // чем дальше от середины, тем дальше разлёт; малой скорости нет — монета не падает обратно в окно
   om=rnd(9,16)*(Math.random()<.5?-1:1); vr=rnd(-2.5,2.5);
   snd('sack.coin_chink',{k:Math.random(),g:rnd(.7,1.2)}); }, // собственный тихий звон при вылете: высота по случайному k
  step(dt){ while(dt>0){ const h=Math.min(dt,1/120); dt-=h; vy+=g*h; x+=vx*h; y+=vy*h; fl+=om*h; rot+=vr*h; life+=h;
    const G=S.g; if(G){ if(this.em&&y<G.top-r*1.3) this.em=false;
     } } // перед пультом: без отскока от кромки и без пряток за неё — падает до края экрана
   if(y>innerHeight+r*2||life>12||x<-r*3||x>innerWidth+r*3) this.dead=true; }, // владелец: монета исчезает только за краем экрана (life — лишь страховка)
  draw(c){ const G=S.g; if(false&&G&&!this.em&&vy>-1e9){ for(const e of G.led){ if(x<e.l||x>e.r||y>e.t) continue; const h=e.t-y, a=clamp(1-h/(r*9),.12,1)*.34; c.save(); c.globalAlpha=a; c.fillStyle='#000'; c.beginPath(); c.ellipse(x,e.t+2,r*(.85+h*.002),r*.26,0,0,6.2832); c.fill(); c.restore(); break; } } // тень на кромке пульта: чем выше монета, тем бледнее
   drawCoin(c,x,y,r,fl,rot,1); }}; }

// ---------- конфетти сверху ----------
function confFor(x){ return x<.5?5:x<1?8:x<2?12:x<5?20:30; }
function confetti(x){ const k=K(); if(!RMq()&&k<.12) return; if($('bp-big')) return; if(!canvas()) return;
 let n=confFor(x); if(RMq()) n=Math.ceil(n/3); else if(k<1) n=Math.max(3,Math.round(n*.55));
 n=Math.min(n,Math.max(0,LIM_CONF-S.P.filter(p=>p.conf).length)); if(!n) return;
 const f=$('field'), F=f?f.getBoundingClientRect():{left:innerWidth*.2,width:innerWidth*.6}, u=clamp(F.width/616,.7,1.25), x0=Math.max(8,F.left-70*u), x1=Math.min(innerWidth-8,F.left+F.width+70*u);
 for(let i=0;i<n;i++){ const c=COL[(Math.random()*COL.length)|0], w=rnd(7.5,11)*u, h=rnd(12,17)*u, vyy=rnd(115,190)*u, sw=rnd(14,34)*u, sf=rnd(1.4,2.6), ph=rnd(0,6.28), om=rnd(4,9)*(Math.random()<.5?-1:1), vr=rnd(-2.2,2.2);
  let px=rnd(x0,x1), py=-h-rnd(0,40), fl=rnd(0,6.28), rot=rnd(0,6.28), t=0;
  S.P.push({conf:1,age:0,delay:rnd(0,.6),born:false,dead:false,step(dt){ t+=dt; py+=vyy*dt; px+=Math.cos(t*sf+ph)*sw*sf*dt*.6; fl+=om*dt; rot+=vr*dt; if(py>innerHeight+h||t>7) this.dead=true; },
   draw(cx){ const a=t>6?clamp(7-t,0,1):1, sy=Math.cos(fl); cx.save(); cx.globalAlpha=a; cx.translate(px,py); cx.rotate(rot); cx.scale(1,Math.max(.1,Math.abs(sy))); cx.fillStyle=sy>=0?c[0]:c[1]; cx.fillRect(-w/2,-h/2,w,h); cx.restore(); }}); }
 wake(); }

// ---------- свет сверху мигает: фон сцены темнеет и светлеет жёсткими ступенями ----------
function flicker(x){ if(RMq()||K()<.35) return; const bg=$('bg'); if(!bg||$('bp-big')) return; const now=performance.now(); if(now-S.flick<1100) return; S.flick=now;
 let base=''; try{ base=getComputedStyle(bg).filter; }catch(e){} if(!base||base==='none') base=''; else base+=' ';
 const f=b=>({filter:base+'brightness('+b+')',easing:'steps(1,end)'}); // ступень держится до следующего ключа (easing ключа, не всего эффекта)
 const small=x<2, mid=x<5; // мелкий выигрыш — один короткий провал; средний и крупнее — провал, вспышка, провал
 const kf=small?[{...f(1),offset:0},{...f(.7),offset:.02},{...f(1),offset:.3},{...f(1)}]
  :[{...f(1),offset:0},{...f(.58),offset:.02},{...f(1.14),offset:.2},{...f(.66),offset:.36},{...f(1),offset:.52},{...f(1)}];
 try{ bg.animate(kf,{duration:small?420:mid?600:700}); }catch(e){} }

// ---------- вход: шаг выигрыша ----------
function win(x){ if(!(x>0)||x>=10) return; confetti(x); flicker(x); }

// ---------- крючки поверх WinFx ----------
function hook(){ const W=window.WinFx; if(!W||W.__cel) return false; W.__cel=1;
 const c0=W.count, s0=W.step;
 W.count=function(from,to,ms,H){ try{ if(to>from) coins(to-from,ms); }catch(e){} return c0.apply(this,arguments); };
 W.step=function(chain,x,o){ try{ win(x); }catch(e){} return s0.apply(this,arguments); };
 return true; }
if(!hook()) addEventListener('load',hook);
setTimeout(()=>{ try{ if(window.bpCoin&&window.bpCoin.warm) window.bpCoin.warm(); }catch(e){} },2500); // лист жетона рисуется один раз кодом — заранее, чтобы первый подскок не тормозил
window.WinCel={coins,confetti,flicker,win,clear,state:S};
})();
