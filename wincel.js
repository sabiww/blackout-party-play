// Blackout Party — праздник малого и среднего выигрыша (2026-10-12, ветка fb/win-drum; владелец: «когда барабан считает выигрыш — монеты чуть вскакивают вверх с макушки барабана и летят вниз по сторонам», «падают небольшие конфетти, как фанфары, свет сверху мигает»).
// Макет, не игра. Три вещи, все без свечений и ореолов:
//  1) монеты из верхней кромки плашки WIN (#result .wn) во время счёта строки: короткий подскок вверх, потом по параболе вниз влево/вправо, с вращением (спрайт жетона из sack.js), уходят за низ экрана или под пульт; количество — по величине прибавки к ставке, тихий звон (sack.coin_clink);
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
const S={cv:null,cx:null,P:[],raf:0,last:0,dpr:1,flick:0,pod:null,t0:0};
const LIM_CONF=64, LIM_COIN=40;

// ---------- холст ----------
function canvas(){ const app=$('app'); if(!app) return null; if(S.cv&&S.cv.isConnected) return S.cv;
 const c=document.createElement('canvas'); c.id='wcel'; c.setAttribute('aria-hidden','true'); c.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6'; app.appendChild(c); S.cv=c; fit(); return c; }
function fit(){ const c=S.cv; if(!c) return; S.dpr=Math.min(1.5,window.devicePixelRatio||1); c.width=Math.round(innerWidth*S.dpr); c.height=Math.round(innerHeight*S.dpr); S.cx=c.getContext('2d'); }
addEventListener('resize',()=>{ if(S.cv) fit(); });
function wake(){ if(!canvas()) return false; if(!S.raf){ S.last=performance.now(); S.raf=requestAnimationFrame(tick); } return true; }
function podRect(){ const p=$('pod'); if(!p) return null; const r=p.getBoundingClientRect(); return r.width>20&&r.height>10?r:null; }
function clear(){ S.P.length=0; if(S.cv){ S.cv.remove(); S.cv=null; S.cx=null; } if(S.raf){ cancelAnimationFrame(S.raf); S.raf=0; } }

// ---------- жетон: спрайт из sack.js (window.bpCoin), запасной — плоский кружок ----------
function drawCoin(c,x,y,r,fl,rot,a){ if(window.bpCoin&&window.bpCoin.draw){ window.bpCoin.draw(c,x,y,r,fl,rot,a); return; }
 c.save(); c.globalAlpha=a; c.translate(x,y); c.rotate(rot); c.scale(1,Math.max(.15,Math.abs(Math.cos(fl)))); c.fillStyle='#c28f2e'; c.beginPath(); c.arc(0,0,r,0,6.2832); c.fill(); c.strokeStyle='#6a4511'; c.lineWidth=Math.max(1,r*.18); c.stroke(); c.restore(); }

// ---------- кадр ----------
function tick(now){ S.raf=0; const cx=S.cx; if(!cx||!S.cv||!S.cv.isConnected){ S.P.length=0; return; }
 const big=$('bp-big'); if(big&&S.P.length) S.P.forEach(p=>{ p.kill=true; }); // шоу Big Win: всё убираем сразу, чтобы не мешать
 const dt=Math.min(.05,Math.max(0,(now-S.last)/1000)); S.last=now; S.pod=podRect();
 cx.setTransform(S.dpr,0,0,S.dpr,0,0); cx.clearRect(0,0,innerWidth,innerHeight);
 cx.save(); if(S.pod){ cx.beginPath(); cx.rect(0,0,innerWidth,innerHeight); cx.rect(S.pod.left,S.pod.top+Math.min(8,S.pod.height*.1),S.pod.width,S.pod.height); cx.clip('evenodd'); } // за пультом монеты и бумажки скрываются
 for(const p of S.P){ if(p.kill){ p.dead=true; continue; } p.age+=dt; if(p.age<p.delay) continue; if(!p.born){ p.born=true; p.onBorn&&p.onBorn(p); } p.step(dt); p.draw(cx); }
 cx.restore();
 S.P=S.P.filter(p=>!p.dead);
 if(S.P.length) S.raf=requestAnimationFrame(tick); else { S.cv.remove(); S.cv=null; S.cx=null; } }

// ---------- монеты из верхней кромки плашки WIN ----------
function coinsFor(x){ return x<.5?3:x<1?4:x<2?6:x<5?9:x<10?13:16; }
function coins(delta,ms){ if(!(delta>0)) return; const k=K(); if(!RMq()&&k<.12) return; // Skip — без монет
 const win=document.querySelector('#result .wn'); if(!win||$('bp-big')) return; if(!canvas()) return;
 let n=coinsFor(delta/bet()); if(RMq()) n=Math.min(n,3); else if(k<1) n=Math.max(2,Math.round(n*.6));
 n=Math.min(n,Math.max(0,LIM_COIN-S.P.filter(p=>p.coin).length)); if(!n) return;
 const T=clamp((ms||300)*.5/1000*(k||1),.16,.34), n0=S.t0++; // монеты выходят в течение счёта (≥ 0,16 с)
 for(let i=0;i<n;i++){ const delay=n>1?i/(n-1)*T+rnd(0,.03):0; S.P.push(coin(win,delay,i,n)); } wake(); }
function coin(win,delay,i,n){ let x=0,y=0,vx=0,vy=0,fl=rnd(0,6.28),rot=rnd(0,6.28),r=7,sc=1,g=1500,om=0,vr=0,a=1,life=0;
 const side=(i%2?1:-1)*(Math.random()<.2?-1:1);
 return {coin:1,age:0,delay,born:false,dead:false,
  onBorn(){ const R=win.getBoundingClientRect(); sc=clamp(R.height/25,.6,1.4); r=8.6*sc; g=1500*sc;
   x=R.left+R.width*rnd(.14,.86); y=R.top+R.height*.1; vy=-rnd(215,300)*sc; vx=side*rnd(90,300)*sc*(.55+.45*Math.abs(x-(R.left+R.width/2))/(R.width/2)+.2); om=rnd(11,19)*(Math.random()<.5?-1:1); vr=rnd(-5,5);
   AU('sack.coin_clink',{v:rnd(.07,.2),jitter:0}); }, // тихий звон при вылете
  step(dt){ vy+=g*dt; x+=vx*dt; y+=vy*dt; fl+=om*dt; rot+=vr*dt; life+=dt; const pr=S.pod; if(y>innerHeight+r*2||life>2.6||x<-r*3||x>innerWidth+r*3) this.dead=true; else if(pr&&x>pr.left&&x<pr.right&&y>pr.top+pr.height*.12) this.dead=true; },
  draw(c){ drawCoin(c,x,y,r,fl,rot,a); }}; }

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
