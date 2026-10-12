// Последствие удара, вариант C «Стекло» (владелец 2026-10-11: прежнее последствие не нравится).
// От точки удара на правой рамке по стеклу бежит одна тонкая трещина к нужному столбцу, там раздваивается вверх и вниз вдоль всего столбца и обрастает паутиной;
// секция стекла над столбцом чуть вздрагивает, лопается на крупные осколки (многоугольники по линиям трещин), осколки падают и гаснут, за ними открываются билеты WILD и оседают сверху вниз.
// Трещина на остальных столбцах тонкая, под конец мягко гаснет. Всё кодом (SVG/DOM), без картинок. Вспышки и дыры от удара здесь нет — сам удар рисует punchhit.js; тут только последствие.
// Всё время — через anim/animA/sleep (K): Quick/Turbo короче сами. Все созданные узлы лежат в одном корне и снимаются в конце.
window.bpPunchFx=window.bpPunchFx||{};
window.bpPunchFx.glass=async ctx=>{
 const {l,g,col,cells,lock,iy,rx,lx,ly,ROWS,COLS,sleep,anim,animA,fxCellRect,fxGone,clamp,K}=ctx;
 const NS='http://www.w3.org/2000/svg', rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[(Math.random()*a.length)|0];
 const u=g.u, sp=Math.max(u,.7), ox=g.ox, oy=g.oy, ch=g.ch, lite=K()<.5, uid='pg'+(window.__pgN=(window.__pgN||0)+1);
 if(!document.getElementById('pg-css')){ const s=document.createElement('style'); s.id='pg-css'; s.textContent=
  '#pfx .pg-r{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}'+
  '#pfx .pg-r svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}'+
  '#pfx .pg-r .pg-sh{will-change:transform,opacity}'+
  '#pfx .pg-r .pg-b{position:absolute;border-radius:50%;background:radial-gradient(circle,#fffdf4 0,rgba(255,250,232,.8) 38%,rgba(255,250,232,0) 72%)}'+
  '#pfx .pg-r .pg-fl{position:absolute;background:linear-gradient(135deg,#fff,#cfe4dc);clip-path:polygon(0 12%,100% 0,52% 100%)}'+
  '#pfx .pg-r .pg-gl{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,253,242,.95) 0,rgba(255,248,226,.55) 24%,rgba(255,240,200,0) 68%);mix-blend-mode:screen}'; document.head.append(s); }
 const root=document.createElement('div'); root.className='pg-r'; l.append(root);
 const mk=(tag,a,par)=>{ const e=document.createElementNS(NS,tag); for(const k in a) e.setAttribute(k,a[k]); if(par) par.append(e); return e; };
 const full=()=>{ const s=mk('svg',{viewBox:`0 0 ${g.W.toFixed(1)} ${g.H.toFixed(1)}`}); s.style.cssText=bpvT`width:${g.W.toFixed(1)}px;height:${g.H.toFixed(1)}px`; root.append(s); return s; };
 const D=pts=>'M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');
 const cum=pts=>{ const c=[0]; for(let i=1;i<pts.length;i++) c.push(c[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])); return c; };
 const jag=(a,b,step,amp)=>{ // ломаная a→b: короткие звенья, смещение по нормали — блуждание с возвратом, редкие изломы; концы точные
  const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L, n=Math.max(2,Math.round(L/step)), ts=[]; for(let i=1;i<n;i++) ts.push(i/n+rnd(-.28,.28)/n); ts.sort((p,q)=>p-q);
  const P=[a], bow=rnd(-.035,.035)*L; let o=0; ts.forEach(t=>{ o=o*.6+rnd(-amp,amp)*(Math.random()<.14?2.6:.8); const e=Math.min(1,(1-t)*5,t*5), w=o*e+bow*Math.sin(Math.PI*t); P.push([a[0]+dx*t+nx*w,a[1]+dy*t+ny*w]); }); P.push(b); return P; }; // bow — плавный изгиб всей трещины
 const spread=(ys,lo,hi,gap)=>{ ys.sort((a,b)=>a-b); ys.forEach((y,i)=>{ ys[i]=clamp(y,lo,hi); if(i&&ys[i]<ys[i-1]+gap) ys[i]=ys[i-1]+gap; }); for(let i=ys.length-2;i>=0;i--) if(ys[i]>ys[i+1]-gap) ys[i]=ys[i+1]-gap; return ys; };

 // --- геометрия (координаты поля) ---
 const rect=(r,c)=>{ const q=fxCellRect(g,r,c); return {x:q.x-ox,y:q.y-oy,w:q.w,h:q.h}; };
 const R0=rect(0,col), R4=rect(ROWS-1,col), mg=7.5*u, gh=(col<COLS-1?rect(0,col+1).x-(R0.x+R0.w):R0.x-(rect(0,col-1).x+R0.w))/2;
 const P={xl:R0.x-gh,xr:R0.x+R0.w+gh,yt:R0.y-mg,yb:R4.y+R4.h+mg}; P.w=P.xr-P.xl; P.h=P.yb-P.yt;
 const yc=ly(iy), xin=lx(rx)+2.5*u-6*u, A=[xin-1.2*u,yc]; // начало трещины — у внутренней кромки правой рамки на высоте кулака
 const J=[R0.x+R0.w/2+rnd(-.06,.06)*R0.w, clamp(yc+rnd(-.12,.12)*ch,P.yt+.75*ch,P.yb-.75*ch)]; // развилка в столбце
 const out=A[0]-P.xr>8*u, tE=out?(A[0]-P.xr)/(A[0]-J[0]):0, E=[P.xr,A[1]+(J[1]-A[1])*tE]; // E — где трещина входит в секцию столбца
 const run=out?jag(A,E,16*u,1.5*u):null, inb=jag(E,J,14*u,1.3*u), M=out?run.concat(inb.slice(1)):inb; // run — по остальным столбцам; inb — внутри секции (она же ребро осколков)
 const xt=clamp(J[0]+rnd(-.12,.12)*R0.w,P.xl+.22*P.w,P.xr-.22*P.w), xb=clamp(J[0]+rnd(-.12,.12)*R0.w,P.xl+.22*P.w,P.xr-.22*P.w);
 const tUp=jag(J,[xt,P.yt],15*u,1.3*u), tDn=jag(J,[xb,P.yb],15*u,1.3*u), T=tUp.slice().reverse().concat(tDn.slice(1)), jI=tUp.length-1, cU=cum(tUp), cD=cum(tDn); // ствол сверху вниз, J — вершина jI
 const strat=(lo,hi,n)=>Array.from({length:n},(_,i)=>lo+(hi-lo)*(i+.5+rnd(-.3,.3))/n); // n позиций в диапазоне с разбросом
 const nearIdx=y=>{ let b=0,bd=1e9; T.forEach((p,i)=>{ const d=Math.abs(p[1]-y); if(d<bd){ bd=d; b=i; } }); return b; };
 const gap=.3*ch;
 const mkRibs=(s,ysAttach,lo,hi,iLo,iHi)=>{ // лучи от ствола к краю секции: точки старта на стволе по порядку (индексы вершин iLo..iHi), концы у кромки не пересекаются (расстояние ≥ gap)
  const ya=ysAttach.slice().sort((a,b)=>a-b).slice(0,Math.max(0,iHi-iLo+1)); if(!ya.length) return [];
  const ends=spread(ya.map(y=>y+rnd(-.5,.5)*ch*.85),lo,hi,gap), xs=s<0?P.xl:P.xr, ix=[]; ya.forEach((y,k)=>{ ix.push(clamp(Math.max(nearIdx(y),k?ix[k-1]+1:iLo),iLo,iHi)); }); for(let k=ix.length-2;k>=0;k--) if(ix[k]>=ix[k+1]) ix[k]=ix[k+1]-1;
  return ya.map((y,k)=>({i:ix[k],pts:jag(T[ix[k]],[xs,ends[k]],13*u,1.1*u)})); };
 const nL=clamp(Math.round(P.h/ch*.8+rnd(-.5,.7)),3,5), roomA=E[1]-gap-(P.yt+.3*ch), roomB=P.yb-.3*ch-(E[1]+gap);
 const nA=roomA<gap*.8?0:clamp(Math.round((J[1]-P.yt)/ch*.8+rnd(-.5,.5)),1,Math.min(3,Math.floor(roomA/gap)+1)), nB=roomB<gap*.8?0:clamp(Math.round((P.yb-J[1])/ch*.8+rnd(-.5,.5)),1,Math.min(3,Math.floor(roomB/gap)+1));
 const ribL=mkRibs(-1,strat(P.yt+.3*ch,P.yb-.3*ch,nL),P.yt+.3*ch,P.yb-.3*ch,1,T.length-2);
 const ribA=nA?mkRibs(1,strat(P.yt+.3*ch,J[1]-.3*ch,nA),P.yt+.3*ch,E[1]-gap,1,jI-1):[], ribB=nB?mkRibs(1,strat(J[1]+.3*ch,P.yb-.3*ch,nB),E[1]+gap,P.yb-.3*ch,jI+1,T.length-2):[];
 const ribR=[...ribA,{i:jI,pts:inb,inb:true},...ribB];
 const cap=(s,top)=>({i:top?0:T.length-1,pts:[T[top?0:T.length-1],[s<0?P.xl:P.xr,top?P.yt:P.yb]],cap:true}); // «рёбра» по верхней/нижней кромке
 const sides=[[ribL,-1],[ribR,1]].map(([rb,s])=>[cap(s,true),...rb,cap(s,false)]);
 const polys=[], web=[]; // polys — осколки (контуры); web — линии трещин внутри секции (для рисования)
 sides.forEach(rb=>{ for(let k=0;k<rb.length-1;k++){ const a=rb[k], b=rb[k+1], base=[...T.slice(a.i,b.i+1)];
   if(!a.cap&&!b.cap&&polys.length<12&&Math.random()<.45&&a.pts.length>3&&b.pts.length>3){ // «перемычка» — кольцевая трещина между соседними лучами: делит осколок надвое
    const ia=1+((Math.random()*(a.pts.length-2))|0), ib=1+((Math.random()*(b.pts.length-2))|0), ch2=jag(a.pts[ia],b.pts[ib],10*u,.9*u), rv=ch2.slice().reverse().slice(1,-1);
    polys.push([...base,...b.pts.slice(1,ib+1),...rv,...a.pts.slice(1,ia+1).reverse()]); polys.push([...a.pts.slice(ia),...b.pts.slice(ib).reverse(),...rv]); web.push({pts:ch2,after:[a,b]}); }
   else polys.push([...base,...b.pts.slice(1),...a.pts.slice().reverse().slice(0,-1)]); } });
 const cen=pl=>[pl.reduce((s,p)=>s+p[0],0)/pl.length,pl.reduce((s,p)=>s+p[1],0)/pl.length];
 const onB=(p,q)=>(Math.abs(p[0]-P.xl)<.6&&Math.abs(q[0]-P.xl)<.6)||(Math.abs(p[0]-P.xr)<.6&&Math.abs(q[0]-P.xr)<.6)||(Math.abs(p[1]-P.yt)<.6&&Math.abs(q[1]-P.yt)<.6)||(Math.abs(p[1]-P.yb)<.6&&Math.abs(q[1]-P.yb)<.6);
 const hair=polys.map(pl=>{ const c=cen(pl), r=[]; for(let h=0;h<(Math.random()<.5?1:0);h++){ const v=pick(pl.filter(p=>!(p[0]<P.xl+1||p[0]>P.xr-1||p[1]<P.yt+1||p[1]>P.yb-1))||pl); if(!v) continue; const a=Math.atan2(c[1]-v[1],c[0]-v[0])+rnd(-.5,.5), L=Math.hypot(c[0]-v[0],c[1]-v[1])*rnd(.2,.38);
   if(L>4*u) r.push(jag(v,[v[0]+Math.cos(a)*L,v[1]+Math.sin(a)*L],5*u,.7*u)); } return r; });

 // --- время (мс при обычной скорости, от начала последствия) ---
 const Lm=cum(M), Lh=Lm[Lm.length-1], Th=clamp(Lh/(2.3*sp),170,330), vRun=Lh/Th, t0=0;
 const vArm=2*sp, vRib=1.4*sp;
 const wB=Math.max(1.2,1.3*u), wS=wB*2.4, cB='rgba(252,251,242,.95)', cS='rgba(14,7,3,.52)';
 const svR=out?full():null, svW=full(), gS=mk('g',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}), gB=mk('g',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
 const gS2=mk('g',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round'}), gB2=mk('g',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
 // перед секцией (по остальным столбцам) и внутри секции — отдельные svg: первое остаётся до конца и гаснет, второе заменяют осколки
 if(svR){ svR.append(gS,gB); } svW.append(gS2,gB2);
 const anims=[]; let tEnd=0;
 const seg=(pts,ts,dur,w,op,inW)=>{ const [gs,gb]=inW?[gS2,gB2]:[gS,gB], d=D(pts), at={d,pathLength:1,'stroke-dasharray':'1 2','stroke-dashoffset':1};
  const ps=mk('path',{...at,stroke:cS,'stroke-width':(wS*w).toFixed(2),opacity:op},gs), pb=mk('path',{...at,stroke:cB,'stroke-width':(wB*w).toFixed(2),opacity:op},gb);
  [ps,pb].forEach(p=>anims.push(animA(p,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:dur,delay:ts,easing:'linear',fill:'forwards'}))); tEnd=Math.max(tEnd,ts+dur); };
 const tip=(pts,ts,dur,sz)=>{ const c=cum(pts), L=c[c.length-1], d=document.createElement('i'); d.className='pg-gl'; d.style.cssText=bpvT`left:${(-sz/2).toFixed(1)}px;top:${(-sz/2).toFixed(1)}px;width:${sz.toFixed(1)}px;height:${sz.toFixed(1)}px;opacity:0`; root.append(d);
  const kf=pts.map((p,i)=>{ const t=c[i]/L; return {transform:`translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`,opacity:Math.min(1,t*14+.01,(1-t)*7),offset:t}; }); const a=animA(d,kf,{duration:dur,delay:ts,easing:'linear',fill:'both'}); anims.push(a); fxGone(d,a); }; // блик бежит с кончиком трещины
 // 1) трещина от удара до столбца: по остальным столбцам (run), затем внутри секции (inb); ветки — по ходу
 const cR=out?cum(run):[0], Lr=cR[cR.length-1], Tr=Th*Lr/Lh;
 if(out) seg(run,t0,Tr,1.3,1,false); seg(inb,t0+Tr,Th-Tr,1.2,1,true); tip(M,t0,Th,15*u);
 if(out){ const nb=col>=COLS-2?1:(Math.random()<.5?2:3); for(let b=0;b<nb;b++){ const k=clamp(Math.round((.2+.7*(b+rnd(.1,.9))/nb)*(run.length-1)),1,run.length-2), p=run[k], q=run[Math.min(k+1,run.length-1)], dir=Math.atan2(q[1]-p[1],q[0]-p[0])+(Math.random()<.5?-1:1)*rnd(.38,.62), L=rnd(24,56)*u, e=[p[0]+Math.cos(dir)*L,clamp(p[1]+Math.sin(dir)*L,P.yt+3,P.yb-3)];
   seg(jag(p,e,8*u,1.5*u),t0+Th*cR[k]/Lh+10,L/vRib,.85,.9,false); } }
 // 2) ствол вверх и вниз от развилки, лучи и перемычки — по мере того как их проходит кончик
 const tA=t0+Th; seg(tUp,tA,cU[cU.length-1]/vArm,1.15,1,true); seg(tDn,tA,cD[cD.length-1]/vArm,1.15,1,true); tip(tUp,tA,cU[cU.length-1]/vArm,9*u); tip(tDn,tA,cD[cD.length-1]/vArm,9*u);
 const riseT=new Map(); // когда луч «вырос» из ствола (для перемычек)
 [...ribL,...ribA,...ribB].forEach(r=>{ const k=r.i<=jI?jI-r.i:r.i-jI, d=r.i<=jI?cU[k]:cD[k], ts=tA+d/vArm+8; riseT.set(r,ts); seg(r.pts,ts,Math.max(40,cum(r.pts).slice(-1)[0]/vRib),.9,.95,true); });
 web.forEach(w=>{ const ts=Math.max(...w.after.map(r=>riseT.get(r)||tA))+45; w.ts=ts; seg(w.pts,ts,Math.max(30,cum(w.pts).slice(-1)[0]/vRib),.8,.9,true); });
 hair.forEach(hs=>hs.forEach(h=>{ const ts=tA+rnd(.35,1)*(Math.max(cU[cU.length-1],cD[cD.length-1])/vArm)+60; seg(h,ts,45,.6,.8,true); }));
 const tCrack=tEnd, S=tCrack+120; // S — миг, когда секция лопается; перед этим ~0,1 с дрожит

 // --- стекло секции: лёгкий блеск (появляется, когда трещина дошла) и тот же градиент на осколках ---
 const gd=mk('svg',{width:0,height:0}), gdef=mk('defs',{},gd); gd.style.cssText='position:absolute;left:0;top:0'; root.append(gd);
 const th=.62, Lg=2.6*R0.w, gx2=P.xl+Math.cos(th)*Lg, gy2=P.yt+Math.sin(th)*Lg, gr=mk('linearGradient',{id:uid+'g',gradientUnits:'userSpaceOnUse',x1:P.xl,y1:P.yt,x2:gx2,y2:gy2,spreadMethod:'repeat'},gdef);
 [[0,.07],[.35,.07],[.46,.3],[.56,.07],[.8,.07],[.86,.17],[.92,.07],[1,.07]].forEach(([o,a])=>mk('stop',{offset:o,'stop-color':'rgb(226,242,236)','stop-opacity':a},gr));
 const svP=full(); svP.style.opacity=0; mk('rect',{x:P.xl,y:P.yt,width:P.w,height:P.h,fill:`url(#${uid}g)`,stroke:'rgba(235,245,238,.38)','stroke-width':wB*.8},svP); root.insertBefore(svP,svW);
 anims.push(animA(svP,[{opacity:0},{opacity:1}],{duration:150,delay:Math.max(0,t0+Th-60),easing:'ease-out',fill:'forwards'}));
 // осколки лежат поверх блеска; а в трещинах перед секцией остаётся тонкая линия до конца

 // --- мелкие стёклышки у начала трещины (вылетают влево и падают) ---
 const G=.0034*ch/115;
 const bit=(x,y,sz,vx,vy,T2,cls,d0)=>{ const e=document.createElement('i'); e.className=cls; e.style.cssText=bpvT`left:${(x-sz/2).toFixed(1)}px;top:${(y-sz/2).toFixed(1)}px;width:${sz.toFixed(1)}px;height:${(cls==='pg-fl'?sz*rnd(.6,1):sz).toFixed(1)}px;opacity:0`; root.append(e);
  const kf=[]; for(let j=0;j<=8;j++){ const t=T2*j/8; kf.push({transform:`translate(${(vx*t).toFixed(1)}px,${(vy*t+.5*G*t*t).toFixed(1)}px) rotate(${(j*rnd(30,60)).toFixed(0)}deg)`,opacity:j===0?0:j<5?1:1-(j-4)/4,offset:j/8}); }
  fxGone(e,animA(e,kf,{duration:T2,delay:d0||0,easing:'linear',fill:'both'})); };
 for(let i=0;i<(lite?3:5);i++) bit(A[0]-rnd(0,6)*u,A[1]+rnd(-5,5)*u,rnd(2.4,4.2)*u,-rnd(.05,.16)*sp,-rnd(.04,.14)*sp,rnd(380,560),'pg-fl',rnd(20,120));
 // перед разломом несколько крошек сыплются со ствола
 if(!lite) for(let i=0;i<4;i++){ const p=pick(T.filter((p,k)=>k%2)); bit(p[0]+rnd(-2,2)*u,p[1],rnd(1.4,2.4)*u,rnd(-.015,.015),0,rnd(300,420),'pg-b',tCrack*.6+rnd(0,100)); }
 // дрожь секции перед разломом
 const sh=[{transform:'translate(0,0)'},{transform:`translate(${-.9*u}px,${.3*u}px)`,offset:.2},{transform:`translate(${.8*u}px,${-.3*u}px)`,offset:.4},{transform:`translate(${-.55*u}px,${.2*u}px)`,offset:.6},{transform:`translate(${.35*u}px,0)`,offset:.8},{transform:'translate(0,0)'}];
 [svP,svW].forEach(s=>anims.push(animA(s,sh,{duration:115,delay:tCrack+4,easing:'linear'})));

 // --- ждём, пока трещина дойдёт и секция «замрёт» ---
 await sleep(S);

 // --- разлом: осколки вместо блеска и паутины ---
 const shards=[];
 polys.forEach((pl,i)=>{ const c=cen(pl), xs=pl.map(p=>p[0]), ys=pl.map(p=>p[1]), pad=4*u, bx=Math.min(...xs)-pad, by=Math.min(...ys)-pad, bw=Math.max(...xs)-bx+pad, bh=Math.max(...ys)-by+pad;
  const ar=pl.reduce((t,p,k)=>{ const q=pl[(k+1)%pl.length]; return t+p[0]*q[1]-q[0]*p[1]; },0)>0?1:-1; let ei='', eb='', e3=['','','']; // свет сверху-слева: кромки, обращённые к свету, ярче, обращённые от света — тусклее (толщина стекла)
  for(let k=0;k<pl.length;k++){ const p=pl[k], q=pl[(k+1)%pl.length], s='M'+p[0].toFixed(1)+' '+p[1].toFixed(1)+'L'+q[0].toFixed(1)+' '+q[1].toFixed(1); if(onB(p,q)){ eb+=s; continue; } ei+=s;
   const dx=q[0]-p[0], dy=q[1]-p[1], L=Math.hypot(dx,dy)||1, lt=(dy*-.6+dx*.8)*ar/L; e3[lt>.35?0:lt>-.25?1:2]+=s; } // lt — насколько внешняя нормаль кромки смотрит на свет
  const hd=hair[i].map(h=>D(h)).join('');
  const svg=document.createElementNS(NS,'svg'); svg.setAttribute('class','pg-sh'); svg.setAttribute('viewBox',`${bx.toFixed(1)} ${by.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}`);
  svg.style.cssText=bpvT`left:${bx.toFixed(1)}px;top:${by.toFixed(1)}px;width:${bw.toFixed(1)}px;height:${bh.toFixed(1)}px;transform-origin:${(c[0]-bx).toFixed(1)}px ${(c[1]-by).toFixed(1)}px`;
  const glint=!lite&&i%3===0?pick(pl):null; // у некоторых — крошечный блик
  svg.innerHTML=`<path d="${D(pl)}Z" fill="url(#${uid}g)"/><path d="${eb}" fill="none" stroke="rgba(235,245,238,.38)" stroke-width="${wB*.8}"/><path d="${ei}" fill="none" stroke="${cS}" stroke-width="${(wS*.8).toFixed(2)}" stroke-linecap="round"/><path d="${e3[2]}" fill="none" stroke="rgba(236,244,238,.55)" stroke-width="${(wB*.9).toFixed(2)}" stroke-linecap="round"/><path d="${e3[1]}" fill="none" stroke="rgba(246,250,244,.9)" stroke-width="${wB.toFixed(2)}" stroke-linecap="round"/><path d="${e3[0]}" fill="none" stroke="rgba(255,255,250,.98)" stroke-width="${(wB*1.3).toFixed(2)}" stroke-linecap="round"/>`
   +(hd?`<path d="${hd}" fill="none" stroke="rgba(250,250,240,.7)" stroke-width="${(wB*.6).toFixed(2)}" stroke-linecap="round"/>`:'')
   +(glint?`<circle class="gl" cx="${glint[0].toFixed(1)}" cy="${glint[1].toFixed(1)}" r="${(1.5*u).toFixed(1)}" fill="#fff" opacity="0"/>`:'');
  root.append(svg); shards.push({svg,c}); });
 svW.remove(); svP.remove(); // осколки на тех же местах — шва не видно
 const Ky=P.yb+.9*ch; // ниже этой линии осколок уже невидим
 shards.forEach(({svg,c},i)=>{ const dist=Math.hypot(c[0]-J[0],c[1]-J[1]), d0=clamp(dist/(ch*4)*90,0,90)+rnd(0,28), vx=((c[0]-J[0])/R0.w*rnd(.12,.3)+rnd(-.05,.05))*R0.w/700, vy0=-rnd(0,.05)*sp*(1-clamp(dist/(ch*2.5),0,1)),
   Dy=Ky-c[1], te=(-vy0+Math.sqrt(vy0*vy0+2*G*Math.max(Dy,ch*.4)))/G, Tm=clamp(te,320,680), N=18, kz=rnd(-1,1)*85, kx=rnd(-1,1)*55, ky=rnd(-1,1)*70, kf=[];
   for(let j=0;j<=N;j++){ const q=j/N, t=Tm*q, y=vy0*t+.5*G*t*t, x=vx*t, pf=clamp((Ky-(c[1]+y))/ch,0,1), op=Math.min(pf,1)*(1-.4*q*q)*(q>.85?(1-q)/.15:1), e=Math.pow(q,1.25);
    kf.push({transform:`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) perspective(${(7*ch)|0}px) rotateX(${(kx*e).toFixed(0)}deg) rotateY(${(ky*e).toFixed(0)}deg) rotateZ(${(kz*e).toFixed(0)}deg) scale(${(1+.12*q).toFixed(3)})`,opacity:+op.toFixed(3),offset:q}); }
   const a=animA(svg,kf,{duration:Tm,delay:d0,easing:'linear',fill:'forwards'}); anims.push(a); fxGone(svg,a);
   const gl=svg.querySelector('.gl'); if(gl) anims.push(animA(gl,[{opacity:0},{opacity:1,offset:.3},{opacity:.1,offset:.55},{opacity:.9,offset:.75},{opacity:0}],{duration:Tm*.7,delay:d0+Tm*.12,easing:'linear'})); });
 if(!lite) for(let i=0;i<14;i++){ const y=rnd(P.yt+.2*ch,P.yb-.3*ch), x=J[0]+rnd(-.5,.5)*R0.w; bit(x,y,rnd(1.4,3)*u,rnd(-.04,.04)*sp,-rnd(0,.04),rnd(380,620),'pg-b',rnd(0,170)); } // стеклянная пыль
 // --- билеты WILD: открываются за падающим стеклом и оседают сверху вниз ---
 const jobs=cells.map(([r,o])=>(async()=>{ await sleep(30+r*52); lock(o); const img=o.sp.querySelector('img'), a=animA(img,[{transform:`translateY(${(-.2*ch).toFixed(1)}px) scale(1.06)`,opacity:0,easing:'ease-in'},{transform:`translateY(${(.04*ch).toFixed(1)}px) scale(.99)`,opacity:1,offset:.46,easing:'ease-out'},{transform:`translateY(${(-.016*ch).toFixed(1)}px) scale(1.005)`,offset:.74,easing:'ease-in'},{transform:'translateY(0) scale(1)'}],{duration:360,fill:'backwards'}); if(a) await a.finished.catch(()=>{}); })());
 // --- конец: трещина на остальных столбцах гаснет мягко ---
 if(svR){ anims.push(animA(svR,[{opacity:1},{opacity:.7,offset:.3},{opacity:0}],{duration:430,delay:230,easing:'ease-in',fill:'forwards'})); }
 await Promise.all([...jobs,...anims.filter(Boolean).map(a=>a.finished.catch(()=>{}))]);
 root.remove();
};
