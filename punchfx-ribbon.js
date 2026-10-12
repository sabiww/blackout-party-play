// Последствие удара D · «Лента»: машину стукнули, как застрявший автомат билетов, — над столбцом открывается латунная щель, из неё лента бумажных WILD-билетов
// выезжает вниз по столбцу «тик-тик» (как принтер), потом перфорация рвётся, билеты щёлкают в свои клетки, хвост втягивается в щель, щель закрывается.
// Сам момент удара рисует punchhit.js (или ui.js), здесь — только последствие. Билеты — готовая картинка sym-wild, довёрнутая на 14° до «ровного» (в клетке она лежит с наклоном),
// поэтому в конце накладной билет в точности совпадает с настоящим спрайтом клетки: наклон = поворот картинки на 14° → 0, подмена незаметна. Всё остальное — DOM/SVG/CSS, без картинок.
(()=>{
if(!document.getElementById('pfx-ribbon-css')){ const st=document.createElement('style'); st.id='pfx-ribbon-css'; st.textContent=`
#pfx .rb-h,#pfx .rb-w,#pfx .rb-c,#pfx .rb-p,#pfx .rb-t,#pfx .rb-d,#pfx .rb-s{position:absolute;pointer-events:none}
#pfx .rb-h{border-radius:3px;background:linear-gradient(180deg,#f2cc7c 0,#cf9334 20%,#a8701f 58%,#6c4312 100%);box-shadow:0 0 0 1px #1c0e05,0 2px 3px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,238,186,.8),inset 0 -1px 0 rgba(44,22,4,.85)}
#pfx .rb-h::before,#pfx .rb-h::after{content:"";position:absolute;top:50%;width:3.2%;aspect-ratio:1;transform:translateY(-50%);border-radius:50%;background:radial-gradient(circle at 35% 32%,#fff0c0,#c08428 55%,#4a2a08);box-shadow:0 0 0 .6px rgba(24,12,3,.8)}
#pfx .rb-h::before{left:1.3%}#pfx .rb-h::after{right:1.3%}
#pfx .rb-g{position:absolute;left:5.5%;right:5.5%;top:24%;bottom:24%;overflow:hidden;border-radius:1.5px;background:linear-gradient(180deg,#000,#160b04 55%,#2b1608);box-shadow:inset 0 2px 3px #000,0 1px 0 rgba(255,232,176,.45)}
#pfx .rb-l{position:absolute;left:0;right:0;height:50.5%;background:linear-gradient(180deg,#d8a044,#9a6420)}
#pfx .rb-l.a{top:0;box-shadow:inset 0 -1px 0 rgba(40,20,4,.9)}#pfx .rb-l.b{bottom:0;box-shadow:inset 0 1px 0 rgba(40,20,4,.9)}
#pfx .rb-w{left:0;top:0;width:100%;height:100%}
#pfx .rb-c{left:0;top:0;width:100%;height:100%;will-change:transform}
#pfx .rb-p{will-change:transform}
#pfx .rb-p svg.bd{position:absolute;left:0;top:0;overflow:visible;filter:drop-shadow(2px 4px 3.5px rgba(0,0,0,.34))}
#pfx .rb-p img{position:absolute;object-fit:contain;transform-origin:50% 50%;will-change:transform}
#pfx .rb-s{background:linear-gradient(180deg,rgba(6,2,0,.7),rgba(6,2,0,.28) 45%,transparent)}
#pfx .rb-d{background:#e3b050;box-shadow:0 1px 1px rgba(0,0,0,.5),inset 0 0 0 .5px rgba(90,48,8,.7)}
@media (prefers-reduced-motion:reduce){#pfx .rb-h,#pfx .rb-p,#pfx .rb-d{animation:none!important}}
`; document.head.append(st); }
const NS='http://www.w3.org/2000/svg', rnd=(a,b)=>a+Math.random()*(b-a), mk=(tag,cls,css)=>{ const n=document.createElement(tag); if(cls) n.className=cls; if(css) n.style.cssText=css; return n; };
let gid=0;
function band(W,P,nr,dot,top){ // кусок ленты W×P: золотая бумага, выемки по краям на линии перфорации (четверти кругов в углах), дырочки перфорации по верхнему краю, волокна бумаги
 const id='rbg'+(++gid), e=1.2, d=`M${nr} 0H${W-nr}A${nr} ${nr} 0 0 0 ${W} ${nr}V${P-nr}A${nr} ${nr} 0 0 0 ${W-nr} ${P}H${nr}A${nr} ${nr} 0 0 0 0 ${P-nr}V${nr}A${nr} ${nr} 0 0 0 ${nr} 0Z`; let h='';
 for(let x=nr*1.7;x<=W-nr*1.7;x+=dot*2.7) h+=`<circle cx="${x.toFixed(1)}" cy="0" r="${dot}" />`;
 let fb=''; for(let i=0;i<5;i++){ const y=rnd(P*.08,P*.92), x0=rnd(W*.04,W*.5), x1=x0+rnd(W*.2,W*.5); fb+=`<path d="M${x0.toFixed(1)} ${y.toFixed(1)}H${x1.toFixed(1)}"/>`; }
 const s=document.createElementNS(NS,'svg'); s.setAttribute('class','bd'); s.setAttribute('width',W); s.setAttribute('height',P+e); s.setAttribute('viewBox',`0 0 ${W} ${P+e}`);
 s.innerHTML=`<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#b3772a"/><stop offset=".09" stop-color="#d49a3b"/><stop offset=".5" stop-color="#ecc062"/><stop offset=".91" stop-color="#d49a3b"/><stop offset="1" stop-color="#a86d22"/></linearGradient>
<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a2e06" stop-opacity=".2"/><stop offset=".16" stop-color="#5a2e06" stop-opacity="0"/><stop offset=".86" stop-color="#5a2e06" stop-opacity="0"/><stop offset="1" stop-color="#5a2e06" stop-opacity=".16"/></linearGradient></defs>
<rect x="${nr}" y="${P-1}" width="${W-2*nr}" height="${e+1}" fill="url(#${id})"/><path d="${d}" fill="url(#${id})"/><path d="${d}" fill="url(#${id}v)"/>
<g fill="none" stroke="rgba(112,64,12,.15)" stroke-width=".7">${fb}</g><path d="M${nr} .5H${W-nr}" stroke="rgba(255,236,170,.55)" stroke-width="1" fill="none"/><g fill="rgba(34,15,3,.82)" stroke="rgba(255,226,150,.3)" stroke-width=".5">${h}</g>`;
 return s; }

window.bpPunchFx=window.bpPunchFx||{};
window.bpPunchFx.ribbon=async ctx=>{
 const {l,g,col,cells,lock,fxCellRect,fxDust,K,clamp}=ctx, SP=.68, tm=o=>({...o,duration:(o.duration||0)*SP,delay:(o.delay||0)*SP}), sleep=ms=>ctx.sleep(ms*SP), anim=(n,kf,o)=>ctx.anim(n,kf,tm(o||{})), animA=(n,kf,o)=>ctx.animA(n,kf,tm(o||{})), u=g.u, // SP — общий темп: владелец 2026-10-11 «лента хороший вариант, но пусть будет чуть быстрее» (≈1,65 → ≈1,25 с)
 ox=g.ox, oy=g.oy;
 const rows=cells.map(([r,o])=>({r,o,R:fxCellRect(g,r,col)})); if(!rows.length) return;
 const nodes=[]; const add=(n,p)=>{ (p||l).append(n); nodes.push(n); return n; };
 const done=()=>{ rows.forEach(w=>{ w.o.sp.style.visibility=''; if(!w.o.pw) lock(w.o); }); nodes.forEach(n=>n.remove()); }; // что бы ни случилось — все клетки WILD и видимы, лишнее убрано
 try{
 // --- размеры (координаты слоя: экран − начало поля) ---
 const n=rows.length, r0=rows[0].r, cx=rows[0].R.x+rows[0].R.w/2-ox, cw=rows[0].R.w, ch=rows[0].R.h;
 rows.forEach(w=>{ w.cy=w.R.y+w.R.h/2-oy; });
 const P=n>1?(rows[n-1].cy-rows[0].cy)/(rows[n-1].r-rows[0].r):ch*1.1, y0=rows[0].cy-P/2; // шаг клеток и верх первого куска ленты
 const w0=cw*.96, h0=ch*.96, k=Math.min(w0,h0*512/463)/512, Wb=Math.round(cw*.93), S=(cw*.97)/(500*k), nr=Math.max(3,P*.05), dot=Math.max(.9,P*.011); // w0×h0 — коробка картинки спрайта, S — масштаб «ровного» билета
 const Wh=Math.round(Wb*1.1), Hh=Math.round(clamp(g.rail.t*.8,12,26)); let gy=g.rail.t*.52; // люк: центр щели по высоте верхней рамы
 const pq=document.querySelector('#alt .ctr2'); if(pq){ const b=pq.getBoundingClientRect(); if(b.right>ox+cx-Wh/2&&b.left<ox+cx+Wh/2&&b.bottom>oy+gy-Hh/2) gy=Math.min(b.bottom-oy+Hh/2+1,g.rail.t+Hh*.2); } // под плашкой множителя — ниже, внутри стекла
 const hb=rows[n-1].cy+P/2, D=hb-gy, yp0=Math.max(y0,gy+Math.min(9*u,P*.1)); // D — путь ленты; yp0 — линия первого отрыва (под щелью, чтобы был виден хвостик)
 // --- картинка билета: подгрузка, фильтр как у настоящего WILD после удара ---
 const src=rows[0].o.sp.querySelector('img').src.replace(/[^/]*$/,'sym-wild.webp'), im=new Image(); im.src=src; const ready=im.decode?im.decode().catch(()=>{}):Promise.resolve();
 const fil=(()=>{ const c=rows[0].o.sp.cloneNode(true); c.dataset.id='sym-wild'; c.classList.add('pwild'); c.style.visibility='hidden'; rows[0].o.sp.parentNode.append(c); const v=getComputedStyle(c.querySelector('img')).filter; c.remove(); return v&&v!=='none'?v:'drop-shadow(0 4px 5px rgba(0,0,0,.75))'; })();
 // --- люк-податчик ---
 const hatch=add(mk('div','rb-h',`left:${cx-Wh/2}px;top:${gy-Hh/2}px;width:${Wh}px;height:${Hh}px;opacity:0`)); hatch.innerHTML='<div class="rb-g"><i class="rb-l a"></i><i class="rb-l b"></i></div>';
 const [lipA,lipB]=hatch.querySelectorAll('.rb-l');
 anim(hatch,[{opacity:0,transform:'translateY(-4px) scale(.94,.5)'},{opacity:1,transform:'translateY(1.5px) scale(1.02,1.08)',offset:.45},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:100,easing:'ease-out',fill:'forwards'});
 await sleep(45);
 fxDust(l,g,ox+cx-Wh*.32,oy+gy+Hh*.3,2,{dx:-12,dy:5,s:.5}); fxDust(l,g,ox+cx+Wh*.32,oy+gy+Hh*.3,2,{dx:12,dy:5,s:.5}); // пыль из щели
 anim(lipA,[{transform:'translateY(0)'},{transform:'translateY(-102%)'}],{duration:105,easing:'cubic-bezier(.3,.8,.35,1)',fill:'forwards'}); anim(lipB,[{transform:'translateY(0)'},{transform:'translateY(102%)'}],{duration:105,easing:'cubic-bezier(.3,.8,.35,1)',fill:'forwards'});
 // --- лента: люк режет её по линии щели; sway качает всю ленту, container выдвигает ---
 const wrap=add(mk('div','rb-w',`clip-path:inset(${gy}px 0 0 0)`)), sway=mk('div','rb-c',`transform-origin:${cx}px ${gy}px`), st=mk('div','rb-c',`transform:translateY(${-D}px)`); sway.append(st); wrap.append(sway);
 const mkPiece=(i,withTicket,top,H,cyT)=>{ const p=mk('div','rb-p',`left:${cx-Wb/2}px;top:${top}px;width:${Wb}px;height:${H}px;transform-origin:50% 0`), b=band(Wb,H,nr,dot); p.append(b);
  if(withTicket){ const t=mk('img',null,`left:${(Wb-w0)/2}px;top:${cyT-h0/2-top}px;width:${w0}px;height:${h0}px;filter:${fil};transform:rotate(14deg) scale(${S})`); t.src=src; t.alt=''; p.append(t); p.t=t; }
  p.b=b; st.append(p); return p; };
 const tail=mkPiece(-1,false,yp0-P,P); tail.style.zIndex=0; // хвост у щели: рвётся первым делом
 rows.forEach((w,i)=>{ const top=i?y0+(w.r-r0)*P:yp0; w.p=mkPiece(w.r,true,top,i?P:y0+P-yp0,w.cy); }); // у первого куска верх на линии отрыва (yp0)
 await Promise.race([ready,new Promise(res=>setTimeout(res,700))]); await sleep(15); // щель успевает приоткрыться, потом бумага
 const shade=add(mk('div','rb-s',`left:${cx-Wb/2}px;top:${gy}px;width:${Wb}px;height:${Math.max(5,Hh*.6)}px`)); // тень на бумаге там, где она выходит из щели
 // --- подача: n рывков по шагу, каждый короче и быстрее предыдущего, между ними «тик» ---
 const dur=rows.map((_,j)=>Math.round(112*Math.pow(.88,j))), pau=rows.map((_,j)=>Math.round(24*Math.pow(.86,j))), TF=dur.reduce((a,b)=>a+b,0)+pau.slice(0,n-1).reduce((a,b)=>a+b,0), EASE='cubic-bezier(.35,.1,.25,1.1)';
 const kf=[{offset:0,transform:`translateY(${-D}px)`,easing:EASE}]; let t=0; const ticks=[0];
 for(let j=0;j<n;j++){ t+=dur[j]; const y=`translateY(${(-D+D*(j+1)/n).toFixed(2)}px)`; kf.push({offset:t/TF,transform:y,easing:'linear'}); if(j<n-1){ t+=pau[j]; ticks.push(t); kf.push({offset:t/TF,transform:y,easing:EASE}); } }
 kf[kf.length-1].offset=1; kf[kf.length-1].easing='linear';
 const feed=animA(st,kf,{duration:TF,fill:'forwards'});
 { const ofs=kf.map(k=>k.offset), tys=kf.map(k=>parseFloat(k.transform.match(/-?[\d.]+/)[0])), tyAt=f=>{ if(f<=0) return tys[0]; for(let i=1;i<ofs.length;i++) if(f<=ofs[i]){ const q=(f-ofs[i-1])/((ofs[i]-ofs[i-1])||1); return tys[i-1]+(tys[i]-tys[i-1])*q; } return tys[tys.length-1]; };
  const cover=()=>{ if(!feed) return; const f=feed.effect.getComputedTiming().progress, fin=feed.playState==='finished'||feed.playState==='idle'||f>=1, ty=fin?0:tyAt(f||0); // символ клетки убираем в тот кадр, когда головной край ленты прошёл её нижнюю границу: клетка закрыта целиком, под лентой символа уже нет (и в щелях между кусками он не просвечивает)
   rows.forEach(w=>{ if(!w.cov&&hb+ty>=w.cy+P/2-1){ w.cov=true; lock(w.o); w.o.sp.style.visibility='hidden'; } }); if(!fin&&rows.some(w=>!w.cov)) requestAnimationFrame(cover); }; cover(); }
 ticks.forEach(tt=>anim(hatch,[{transform:'translateY(0)'},{transform:`translateY(${(1.3*u).toFixed(1)}px)`,offset:.35},{transform:'translateY(0)'}],{duration:80,delay:tt})); // люк вздрагивает на каждом рывке
 { const A=.5, N=18, kk=[]; for(let i=0;i<=N;i++){ const x=i/N, env=Math.sin(Math.PI*Math.min(1,x*1.15))*(1-x*.35); kk.push({offset:x,transform:`skewX(${(A*env*Math.sin(x*Math.PI*5.2)).toFixed(3)}deg)`}); } kk[N].transform='skewX(0deg)'; animA(sway,kk,{duration:TF+220,easing:'linear'}); } // лёгкое качание ленты
 { const last=rows[n-1].p, kk=[], N=16; for(let i=0;i<=N;i++){ const x=i/N, env=Math.sin(Math.PI*Math.min(1,x*1.1))*(1-x*.5); kk.push({offset:x,transform:`rotate(${(2.2*env*Math.sin(x*Math.PI*6.4+.8)).toFixed(3)}deg)`}); } kk[N].transform='rotate(0deg)'; animA(last,kk,{duration:TF+260,easing:'linear'}); } // свободный конец ленты подрагивает
 if(feed) await feed.finished.catch(()=>{}); st.style.transform='none'; feed&&feed.cancel();
 await sleep(12); // лента вытянута — на миг видно все билеты
 // --- билеты щёлкают в клетки снизу вверх (стоп головы идёт по ленте к щели); у каждого lock(o) ---
 const up=`rotate(14deg) scale(${S})`;
 const snap=async(w,delay)=>{ await sleep(delay); lock(w.o); const si=w.o.sp.querySelector('img'); w.o.sp.style.visibility='hidden'; si.style.transition='none'; // настоящий спрайт уже WILD, но спрятан до приземления — сквозь поворачивающийся билет ничего не просвечивает; фильтр без плавного перехода (иначе после показа «доезжал» бы)
  const dec=si.decode?si.decode().catch(()=>{}):null; // картинку декодируем заранее: спрятанный элемент не рисуется, и без этого кадр после показа мог бы быть пустым
  anim(w.p.b,[{opacity:1},{opacity:0}],{duration:150,delay:40,fill:'forwards'}); w.p.t.style.transform='none';
  const A=anim(w.p.t,[{transform:up,offset:0,easing:'cubic-bezier(.3,0,.2,1)'},{transform:'translateY(-5px) rotate(-5deg) scale(1.1)',offset:.34,easing:'cubic-bezier(.4,0,.6,1)'},{transform:'translateY(0) rotate(1.7deg) scale(.975)',offset:.7,easing:'ease-out'},{transform:'none',offset:1}],{duration:230});
  await Promise.all([dec,sleep(205)]); w.o.sp.style.visibility=''; // настоящий спрайт показываем чуть раньше конца (поза уже почти та же), накладной убираем по концу — пустого кадра между ними не бывает
  await A; w.p.remove(); setTimeout(()=>{ si.style.transition=''; },80); }; // накладной билет и настоящий — одна картинка в одной позе: подмена без скачка
 const STEP=38, jobs=rows.map((w,i)=>snap(w,(n-1-i)*STEP));
 // --- отрыв: у первого куска перфорация рвётся, хвостик взлетает в щель, из надрыва сыплются бумажные кусочки, щель закрывается ---
 jobs.push((async()=>{ await sleep((n-1)*STEP+4);
  animA(tail,[{transform:'translateY(0) rotate(0deg)'},{transform:`translateY(${-P*.22}px) rotate(-6deg)`,offset:.45},{transform:`translateY(${-P*.8}px) rotate(-11deg)`}],{duration:180,easing:'cubic-bezier(.4,0,.9,.55)',fill:'forwards'});
  const cnt=K()<.5?4:7; for(let i=0;i<cnt;i++){ const s=rnd(2.6,5.2)*u, d=add(mk('div','rb-d',`left:${cx+rnd(-.42,.42)*Wb}px;top:${yp0+rnd(-2,3)*u}px;width:${s}px;height:${s*rnd(.5,.9)}px`)), dx=rnd(-26,26)*u, dy=-rnd(6,22)*u, T=rnd(300,450), kk=[];
   for(let j=0;j<=6;j++){ const x=j/6; kk.push({transform:`translate(${(dx*x).toFixed(1)}px,${(dy*Math.sin(Math.PI*Math.min(1,x*1.1))+60*u*x*x).toFixed(1)}px) rotate(${(x*rnd(150,420)).toFixed(0)}deg)`,opacity:j<5?1:0,offset:x}); }
   animA(d,kk,{duration:T,easing:'linear',fill:'forwards'}); }
  await sleep(65); anim(lipA,[{transform:'translateY(-102%)'},{transform:'translateY(0)'}],{duration:100,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'}); await anim(lipB,[{transform:'translateY(102%)'},{transform:'translateY(0)'}],{duration:100,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'});
  anim(shade,[{opacity:1},{opacity:0}],{duration:80,fill:'forwards'}); wrap.style.visibility='hidden';
  await anim(hatch,[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-3px) scale(.97,.6)'}],{duration:100,delay:15,fill:'forwards'}); })());
 await Promise.all(jobs);
 } finally { done(); }
};
})();
