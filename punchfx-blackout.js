// Последствие удара, вариант B «Блэкаут» (владелец 2026-10-11): удар закоротил питание зала — свет мигает и гаснет, из темноты луч прожектора находит столбец,
// билеты WILD вспыхивают в луче один за другим, свет с треском возвращается. Сам момент удара (вспышка, пыль, дрожь) — отдельный модуль punchhit.js, здесь только последствие.
// Темнота — один полноэкранный слой с mix-blend-mode:multiply (тёплая «ночь» ~89% тёмная), в нём «дырой» работают светлые пятна (blend screen): луч (canvas-конус с мягким краем) и приподнятые
// плашки интерфейса (пульт, множитель, вывеска остаются читаемыми). Над слоем — тонкая дымка луча и пылинки в нём, глаза Рокко тлеют в темноте. Всё кодом, без картинок; время — через animA/sleep (K).
window.bpPunchFx=window.bpPunchFx||{};
window.bpPunchFx.blackout=async ctx=>{
 const {g,l,col,cells,lock,sleep,animA,fxBox,fxCellRect,K,clamp,COLS}=ctx;
 if(!document.getElementById('pbo-css')){ const st=document.createElement('style'); st.id='pbo-css'; st.textContent=`
#pbo-dark{position:fixed;inset:0;z-index:40;pointer-events:none;mix-blend-mode:multiply;opacity:0;background:radial-gradient(ellipse 80% 75% at 46% 52%,#2e2018 0,#1e140f 100%)}
#pbo-dark>*{position:absolute;pointer-events:none;mix-blend-mode:screen}
#pbo-dark .lift{border-radius:14px;background:#8a7868;box-shadow:0 0 14px 9px #8a7868}
#pbo-glow{position:fixed;inset:0;z-index:41;pointer-events:none;mix-blend-mode:screen;overflow:hidden}
#pbo-dark .rig,#pbo-glow .rig{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;pointer-events:none}
.pbo-mote{position:absolute;border-radius:50%;background:rgba(255,240,206,.95);box-shadow:0 0 4px 1px rgba(255,198,118,.55);opacity:0;pointer-events:none}

#pfx .pbo-halo{border-radius:50%;opacity:0;mix-blend-mode:screen;background:radial-gradient(ellipse,rgba(255,214,140,.34),rgba(255,170,70,.13) 55%,transparent 76%)}
#pfx .pbo-sh{overflow:hidden;opacity:0;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}
#pfx .pbo-sh i{position:absolute;top:-12%;bottom:-12%;left:0;width:42%;transform:translateX(-120%) skewX(-16deg);background:linear-gradient(90deg,transparent,rgba(255,246,222,.78) 50%,transparent)}`; document.head.append(st); }
 const k0=K()/(window.__slow||1), nf=k0>.8?3:k0>.5?2:1, u=g.u, rnd=(a,b)=>a+Math.random()*(b-a), ROWS=cells.length; // k0 — настоящая скорость без отладочного window.__slow: от неё зависит число миганий
 const mk=(tag,id,cls)=>{ const n=document.createElement(tag); if(id) n.id=id; if(cls) n.className=cls; return n; }, junk=[], add=(p,n)=>{ p.append(n); junk.push(n); return n; };
 const sm=t=>t<=0?0:t>=1?1:t*t*(3-2*t), A=(n,pts,o)=>{ const T=pts[pts.length-1][0]; return animA(n,pts.map(([t,v,e])=>({...v,offset:t/T,easing:e||'linear'})),{duration:T,fill:'both',easing:'linear',...o}); }; // pts: [[мс,{свойства}],…] → кадры
 // --- сценарий (мс при нормальной скорости от начала последствия): мигание → темнота → луч → билеты → свет возвращается; в Quick/Turbo меньше миганий и пауз
 const DOWN={3:[[0,0],[18,.45],[50,.12],[85,.7],[115,.28],[155,.86],[190,.5],[235,.97],[262,.82],[310,1]],2:[[0,0],[18,.5],[55,.15],[100,.8],[135,.42],[190,1]],1:[[0,0],[22,.55],[65,.2],[120,1]]}[nf]; // доля темноты (0 — свет, 1 — ночь): нервное мигание сети, с каждой вспышкой слабее
 const UP={3:[[0,1],[45,.3],[95,.88],[135,.22],[175,.55],[215,0]],2:[[0,1],[40,.3],[90,.85],[130,.2],[170,0]],1:[[0,1],[45,.25],[95,0]]}[nf]; // свет возвращается рывками
 const Td=DOWN[DOWN.length-1][0], Tb=Td+{3:160,2:120,1:90}[nf], pop=({3:75,2:60,1:45})[nf], Tp=Tb+60, Tup=Math.max(Tp+pop*(ROWS-1)+410,Tb+300+Math.max(420,300/Math.max(k0,.3))), Tend=Tup+UP[UP.length-1][0]; // Tb — луч включается, Tp — первый билет, Tup — свет начинает возвращаться
 // --- геометрия: луч — конус от далёкой вершины над полем, на поле почти столб шириной в клетку с мягким краем
 const cR=fxCellRect(g,0,col), colX=cR.x+cR.w/2, pw=(fxCellRect(g,0,COLS-1).x-fxCellRect(g,0,0).x)/(COLS-1), cw=cR.w, // colX из ctx считается без зазоров между клетками и уезжает — берём настоящий центр клетки
  yT=g.fr.top-10*u, yB=g.fr.bottom+10*u, Hf=yB-yT, yc=(yT+yB)/2, fcx=g.lr.left+g.lr.width/2;
 const yaL=yT-6*Hf, yaH=yT-2.4*Hf; // вершины конусов: резкого (на поверхности) и дымки (в воздухе)
 const cone=(y0,y1,ya,yr,h0,f0,al,ft,fb,fall,rgb)=>{ // canvas-конус: полуширина h0 на экранной высоте yr, мягкий край f0 (растёт книзу), плавные начало и конец по вертикали
  const fm=(y1-ya)/(yr-ya), W=Math.ceil((h0+f0)*fm*2)+8, H=Math.ceil(y1-y0), c=document.createElement('canvas'), x=c.getContext('2d'); c.width=W; c.height=H;
  for(let y=0;y<H;y+=2){ const f=(y0+y+1-ya)/(yr-ya), hw=h0*f, fe=f0*f, a0=Math.max(0,hw-fe), L=hw+fe, av=sm(y/ft)*sm((H-y)/fb)*(1-(1-fall)*y/H)*al; if(av<.003) continue;
   const gr=x.createLinearGradient(W/2-L,0,W/2+L,0), n=6, c4=s=>`rgba(${rgb},${(av*s).toFixed(3)})`;
   for(let i=0;i<=n;i++){ const s=i/n, d=L-(L-a0)*s; gr.addColorStop(clamp((L-d)/(2*L),0,1),c4(sm(s))); }
   for(let i=0;i<=n;i++){ const s=i/n, d=a0+(L-a0)*s; gr.addColorStop(clamp((L+d)/(2*L),0,1),c4(1-sm(s))); }
   x.fillStyle=gr; x.fillRect(0,y,W,2); }
  c.style.cssText=bpvT`position:absolute;left:${-W/2}px;top:${y0-ya}px;width:${W}px;height:${H}px;opacity:0`; return c; };
 const rig=(p,ya)=>{ const r=mk('div',null,'rig'); r.style.cssText=bpvT`left:${colX.toFixed(1)}px;top:${ya.toFixed(1)}px`; p.append(r); return r; };
 const dx0=(colX<=fcx?1:-1)*clamp(Math.abs(fcx-colX),1.5*pw,2.6*pw); // луч сначала включается чуть в стороне (от середины поля) и «находит» столбец
 const ang=ya=>-Math.atan(dx0/(yc-ya))*180/Math.PI;
 const dark=add(document.body,mk('div','pbo-dark')), glow=add(document.body,mk('div','pbo-glow')); let live=true;
 try{
  // плашки интерфейса: свет на них приподнят, чтобы пульт и множитель читались и в темноте
  [...document.querySelectorAll('#pod,#alt>*,#hud>*,#sign,#features')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>10&&r.height>10&&r.width*r.height<innerWidth*innerHeight*.2&&r.bottom>0&&r.top<innerHeight).forEach(r=>{ const n=mk('i',null,'lift'); n.style.cssText=bpvT`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`; dark.append(n); });
  const lit=cone(yT-18*u,yB+18*u,yaL,yT,.55*cw,Math.max(.11*cw,6),1,22*u,22*u,.93,'255,255,255'), rl=rig(dark,yaL); rl.append(lit);
  const hz=cone(-30,yB+8*u,yaH,yT,.6*cw,.35*cw,.17,50,90,.4,'255,206,128'), rh=rig(glow,yaH); rh.append(hz);
  A(dark,[...DOWN.map(([t,v])=>[t,{opacity:v},'ease-in-out']),...UP.map(([t,v])=>[Tup+t,{opacity:v},'ease-in-out'])]);
  // луч: включение «дугой» (вспыхнул — просел — встал), качнулся на столбец с лёгким перелётом, после паузы гаснет
  const beam=[[0,{opacity:0}],[28,{opacity:.9}],[52,{opacity:.5}],[92,{opacity:1}],[Tup-Tb,{opacity:1}],[Tup-Tb+150,{opacity:0}]];
  [lit,hz].forEach(c=>A(c,beam,{delay:Tb}));
  [[rl,yaL],[rh,yaH]].forEach(([r,ya])=>{ const a=ang(ya); A(r,[[0,{transform:`rotate(${a.toFixed(2)}deg)`},'cubic-bezier(.3,0,.2,1)'],[180,{transform:`rotate(${(-a*.09).toFixed(2)}deg)`},'ease-in-out'],[300,{transform:'rotate(0deg)'}]],{delay:Tb}); });
  // пылинки в луче
  const n=K()/(window.__slow||1)<.5?8:14, lo=g.fr.top-.3*g.ch, hi=g.fr.bottom-.4*g.ch;
  for(let i=0;i<n;i++){ const s=rnd(1.3,3.2)*u, m=add(glow,mk('i',null,'pbo-mote')), d=Tb+150+rnd(0,320), life=Math.min(rnd(900,1300),Tup+110-d);
   m.style.cssText=bpvT`left:${(colX+rnd(-.42,.42)*cw-s/2).toFixed(1)}px;top:${rnd(lo,hi).toFixed(1)}px;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px`;
   A(m,[[0,{opacity:0,transform:'translate(0,0)'}],[.25*life,{opacity:rnd(.5,.95)}],[.7*life,{opacity:rnd(.4,.8)}],[life,{opacity:0,transform:`translate(${(rnd(-14,14)*u).toFixed(1)}px,${(rnd(-34,6)*u).toFixed(1)}px)`}]],{delay:d}); }
  await sleep(Td+10); // в полной темноте столбец превращается в WILD — глазу не видно
  cells.forEach(([r,o])=>lock(o));
  sleep(Math.max(0,Tp-Td-10)).then(()=>{ if(live&&ctx.stick) ctx.stick(); }); // рамка столбца загорается вместе со светом на билетах (владелец 2026-10-11), а не после того, как вернётся свет
  const t1=Td+10; // билеты в луче: сверху вниз, маленький «подскок» и блик по самому билету, под ним тёплое сияние
  cells.forEach(([r,o],i)=>{ const img=o.sp.querySelector('img'), R=fxCellRect(g,r,col), cx=R.x+R.w/2, cy=R.y+R.h/2, d=Tp+i*pop-t1;
   A(img,[[0,{transform:'scale(1)'}],[115,{transform:'scale(1.14)'},'ease-out'],[210,{transform:'scale(.985)'},'ease-in-out'],[300,{transform:'scale(1)'}]],{delay:d,fill:'none'});
   const h=add(l,fxBox(l,g,'pbo-halo',cx,cy,R.w*1.15,R.h*1.15)); A(h,[[0,{opacity:0}],[140,{opacity:.85}],[300,{opacity:.55}],[Tup-Tp-i*pop,{opacity:.55}],[Tup-Tp-i*pop+150,{opacity:0}]],{delay:d});
   const sh=add(l,fxBox(l,g,'pbo-sh',cx,cy,R.w*.96,R.h*.96,'div','<i></i>')), url=`url("${img.src}")`; sh.style.webkitMaskImage=sh.style.maskImage=url;
   A(sh,[[0,{opacity:0}],[1,{opacity:1}],[420,{opacity:1}]],{delay:d+50,fill:'both'}); A(sh.firstChild,[[0,{transform:'translateX(-120%) skewX(-16deg)'}],[420,{transform:'translateX(270%) skewX(-16deg)'},'ease-in-out']],{delay:d+50}); });
  await sleep(Tend-t1+40);
 }finally{ live=false; junk.forEach(n=>n.remove()); } // всё убрать, сцена как была
};
