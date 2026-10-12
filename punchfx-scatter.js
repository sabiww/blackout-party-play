// Последствие удара E · «Разлёт» (владелец 2026-10-12: «как аниматроник раскидывает символы — каша непонятная, сделать естественнее»).
// Что видно: кулак ударил по правой раме на высоте iy — символы столбца вылетают ПО ОЧЕРЕДИ (ближайшие к точке удара первыми, пауза между ними 30–60 мс), каждый по своей баллистике:
// начальная скорость направлена от точки удара (влево) и чуть вверх, сила падает с расстоянием, дальше гравитация и вращение; уходят за край стекла (слева или вниз), там их обрезает стекло.
// Пустые клетки ждут, пока вылетит последний, и билеты WILD падают сверху ровно как в обычном каскаде (кривая SQ, вытянутый перед землёй, «штамп» при посадке). Без вспышек, свечения и искр.
// Физика считается по времени каждый кадр (rAF): x = x0 + vx·t, y = y0 + vy·t + g·t²/2, поворот = ω·t; шаг по часам кадра (dt ≤ 50 мс), Quick/Turbo сжимают время через K, Skip — сразу итог.
(()=>{
const rnd=(a,b)=>a+Math.random()*(b-a);
const STRETCH='scale(.92,1.13)', FALL_T=300, SQ=q=>.25*q+.75*q*q;
const dropKF=(cells,P)=>{ const kf=[]; for(let i=0;i<=16;i++){ const q=i/16; kf.push({transform:`translateY(${(-(1-SQ(q))*cells*P).toFixed(2)}px)`,offset:q}); } return kf; };
if(!document.getElementById('pxc-css')){ const st=document.createElement('style'); st.id='pxc-css'; st.textContent=
 `#pfx .pxc{position:absolute;overflow:hidden;pointer-events:none}#pfx .pxc>*{position:absolute;left:0;top:0;pointer-events:none;will-change:transform}#pfx .pxc img{display:block;width:100%;height:100%;object-fit:contain}
  #pfx .pxc .dust{border-radius:50%;background:radial-gradient(circle,rgba(190,166,134,.6),rgba(130,108,84,.3) 55%,transparent 72%)}`; document.head.append(st); }

window.bpPunchFx=window.bpPunchFx||{}; window.bpPunchFx.scatter=async ctx=>{
 const {l,g,col,cells,lock,ix,iy,sleep,anim,animA,fxCellRect,K,ROWS}=ctx, u=g.u, cw=g.cw, ch=g.ch;
 const R0=fxCellRect(g,0,col), P=ROWS>1?fxCellRect(g,1,col).y-R0.y:ch;
 const wg=document.createElement('div'); wg.className='pxc'; wg.style.cssText=bpvT`left:${g.lr.left-g.ox}px;top:${g.lr.top-g.oy}px;width:${g.lr.width}px;height:${g.lr.height}px`; l.append(wg); // обёртка по краю стекла: символы уходят за стекло, а не висят над рамой
 const ox=g.lr.left, oy=g.lr.top, G=ch*34, flying=[];  // G — гравитация, px/с² (от размера клетки: на телефоне то же движение в масштабе)
 const live=new Set(); let stop=false;
 // --- один шаг физики для всех летящих символов: по часам кадра, с учётом K ---
 let last=0, raf=0;
 const loop=ts=>{ raf=0; const dt=last?Math.min(50*(window.__slow||1),ts-last):16.7; last=ts; const Kc=Math.max(.05,K()), s=dt/1000/Kc;
  live.forEach(p=>{ p.t+=s; const t=p.t; if(t<0) return; const gk=Math.min(1,t/.28); p.vy+=G*gk*gk*s; p.x+=p.vx*s; p.y+=p.vy*s; // гравитация нарастает за 0,28 с: сначала подброс вверх, потом падение
   const a=p.w*t, sc=1-.24*Math.min(1,t/.35); // над соседями символ уменьшается (уходит от поля к зрителю) и темнеет — не путается с символами поля
   p.n.style.transform=`translate3d(${(p.x-ox-p.w0/2).toFixed(1)}px,${(p.y-oy-p.h0/2).toFixed(1)}px,0) rotate(${a.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
   if(p.y-oy>g.lr.height+p.h0||p.x-ox<-p.w0*1.3||t>1.6){ live.delete(p); p.n.remove(); p.done&&p.done(); } });
  if(live.size&&!stop) raf=requestAnimationFrame(loop); else last=0; };
 const kick=()=>{ if(!raf){ last=0; raf=requestAnimationFrame(loop); } };
 const puff=(x,y,s,dx,dy,T)=>{ const p=document.createElement('div'); p.className='dust'; p.style.cssText=bpvT`left:${(x-ox-s/2).toFixed(1)}px;top:${(y-oy-s/2).toFixed(1)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px`; wg.append(p);
  const a=animA(p,[{transform:'translate(0,0) scale(.5)',opacity:0},{transform:`translate(${dx*.3}px,${dy*.3}px) scale(1)`,opacity:.5,offset:.2},{transform:`translate(${dx}px,${dy}px) scale(1.8)`,opacity:0}],{duration:T,easing:'ease-out',fill:'both'}); if(a) a.finished.catch(()=>{}).then(()=>p.remove()); else p.remove(); };
 try{
 // порядок вылета: ближайшие к точке удара (по высоте) первыми; пауза 30–60 мс — не все сразу
 const order=[...cells].filter(([r,o])=>!o.pw).sort((a,b)=>Math.abs(fxCellRect(g,a[0],col).y+ch/2-iy)-Math.abs(fxCellRect(g,b[0],col).y+ch/2-iy));
 const gaps=order.map(()=>rnd(30,60)); let tl=0; const lands=[];
 const launches=order.map(([r,o],k)=>{ const at=k?(tl+=gaps[k]):0; return (async()=>{ await sleep(at); const R=fxCellRect(g,r,col), cx=R.x+R.w/2, cy=R.y+R.h/2, im=o.sp.querySelector('img');
   const dxi=cx-ix, dyi=cy-iy, dist=Math.hypot(dxi,dyi)||1, near=Math.max(.45,1.15-dist/(cw*5.5)); // сила удара падает с расстоянием от кулака
   const dir=Math.atan2(dyi*.35,dxi), sp=rnd(6.8,11.2)*cw*near, vx=Math.cos(dir)*sp-rnd(0,1.6)*cw, vy=Math.sin(dir)*sp*.3-rnd(3,4.6)*ch; // от точки удара влево — вдвое быстрее прежнего, заметный подброс вверх в первые 0,1 с
   const n=document.createElement('div'), w0=R.w*.96, h0=R.h*.96; n.style.cssText=bpvT`width:${w0.toFixed(1)}px;height:${h0.toFixed(1)}px`;
   const c=document.createElement('img'); c.src=im.src; c.alt=''; const fl=getComputedStyle(im).filter; c.style.filter=(fl&&fl!=='none'?fl+' ':'')+'brightness(.72)'; n.append(c); wg.append(n);
   const p={n,x:cx,y:cy,vx,vy,w:rnd(160,380)*(Math.random()<.5?-1:1),t:0,w0,h0}; flying.push(new Promise(res=>{ p.done=res; }));
   o.sp.style.visibility='hidden'; live.add(p); kick(); // клетка опустела: настоящий символ уже в полёте
   puff(R.x+R.w*.7,R.y+R.h*.55,rnd(.2,.3)*cw,-rnd(6,14)*u,-rnd(2,6)*u,rnd(360,520)); })(); });
 await Promise.all(launches);
 // билеты: сверху по одному, как в каскаде; начало — когда вылетел последний, а первые уже ушли за стекло
 await Promise.race([Promise.all(flying),new Promise(res=>setTimeout(res,(900*Math.max(.05,K())+200)*(window.__slow||1)))]); await sleep(60); // ждём, пока уйдёт последний летящий символ (но не дольше ~0,9 с)
 const down=[...cells].filter(([r,o])=>!o.pw).sort((a,b)=>b[0]-a[0]), STG_IN=70, last_=down.length-1;
 const jobs=down.map(([r,o],k)=>(async()=>{ await sleep(k*STG_IN); const sp=o.sp, img=sp.querySelector('img'); lock(o); sp.style.visibility=''; img.style.transformOrigin='50% 94%';
  anim(img,[{transform:'scale(1)',offset:0},{transform:'scale(1)',offset:.55},{transform:STRETCH,offset:1}],{duration:FALL_T,easing:'ease-in',fill:'backwards'});
  await anim(sp,dropKF(ROWS,P),{duration:FALL_T,easing:'linear',fill:'backwards'});
  const sg=((col*7+r*13)%2?1:-1), rg=.07*180/Math.PI*sg, Rr=fxCellRect(g,r,col), e='ease-out'; // посадка — «штамп» WILD, лёгкий отскок клетки
  [-1,1].forEach(sd=>puff(Rr.x+Rr.w*(.5+sd*.4),Rr.y+Rr.h*.92,rnd(.24,.36)*cw,sd*rnd(10,20)*u,-rnd(3,9)*u,rnd(420,620)));
  anim(sp,[{transform:'translateY(0)',easing:e},{transform:`translateY(${(-.035*P).toFixed(2)}px)`,offset:.4,easing:'ease-in'},{transform:'translateY(0)'}],{duration:230,delay:50});
  await anim(img,[{transform:STRETCH,offset:0},{transform:`rotate(${rg}deg) scale(1.14)`,offset:.12},{transform:`rotate(${rg*.35}deg) scale(1.06)`,offset:.36},{transform:'rotate(0deg) scale(1)',offset:1}],{duration:230,easing:'cubic-bezier(.4,0,.6,1)'}); })());
 await Promise.all(jobs);
 } finally { // что бы ни случилось: все клетки — WILD и видимы, летящие убраны
  stop=true; if(raf) cancelAnimationFrame(raf); live.clear(); cells.forEach(([r,o])=>{ if(!o.pw) lock(o); o.sp.style.visibility=''; }); wg.remove(); }
};
})();
