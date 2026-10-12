// Последствие удара — вариант A «Тряска» (владелец 2026-10-11: прежнее последствие не нравится). Сам момент удара (вмятина, толчок поля, пыль) — отдельный модуль punchhit.js; здесь только следствие.
// Идея: удар встряхнул автомат — символы дребезжат волной справа налево, символы ЭТОГО столбца срываются и вылетают вниз из стекла (снизу вверх, с гравитацией),
// а следом сверху по одному падают билеты WILD — тем же ходом, что и в обычном каскаде (кривая SQ, 300 мс, вытянутый «штамп» при посадке). Без вспышек, искр и молний.
// Всё рисуется кодом внутри #pfx (обёртка с обрезкой по краю стекла), время — только через sleep/anim (Quick/Turbo короче сами). Отсчёт — от конца момента удара.
(()=>{
const rnd=(a,b)=>a+Math.random()*(b-a), rs=()=>Math.random()<.5?-1:1;
if(!document.getElementById('pxs-css')){ const st=document.createElement('style'); st.id='pxs-css'; st.textContent=
 `#pfx .pxs{position:absolute;overflow:hidden;pointer-events:none}#pfx .pxs>*{position:absolute;pointer-events:none}
  #pfx .pxs .dust{border-radius:50%;background:radial-gradient(circle,rgba(190,166,134,.72),rgba(130,108,84,.4) 55%,transparent 72%)}
  #pfx .pxs .gl{mix-blend-mode:screen;background:linear-gradient(180deg,transparent,rgba(255,222,150,.28) 36%,rgba(255,240,205,.5) 50%,rgba(255,222,150,.28) 64%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 24%,#000 76%,transparent);mask-image:linear-gradient(90deg,transparent,#000 24%,#000 76%,transparent)}`; document.head.append(st); }

const STRETCH='scale(.92,1.13)', FALL_T=300, SQ=q=>.25*q+.75*q*q; // как в ui.js (падение символов): кривая s(q)=.25q+.75q², вытянутое состояние перед землёй
function knockKF(D,P,Ts,T,rot,dx){ // «сорвало»: символ подпрыгивает от толчка и дрожит (Ts мс), затем падает с ускорением q² и вращением; offsets — по времени
 const tot=Ts+T, kf=[], H=.07*P;
 for(let i=0;i<=6;i++){ const x=i/6; kf.push({transform:`translate(0,${(-H*Math.sin(Math.PI/2*x)).toFixed(2)}px) rotate(${(3.2*Math.sin(Math.PI*3*x)*(1-.4*x)).toFixed(2)}deg)`,offset:x*Ts/tot}); }
 for(let i=1;i<=12;i++){ const q=i/12; kf.push({transform:`translate(${(dx*q).toFixed(2)}px,${(-H+(D+H)*q*q).toFixed(2)}px) rotate(${(rot*q).toFixed(2)}deg)`,offset:(Ts+T*q)/tot}); }
 return kf; }
const dropKF=(cells,P)=>{ const kf=[]; for(let i=0;i<=16;i++){ const q=i/16; kf.push({transform:`translateY(${(-(1-SQ(q))*cells*P).toFixed(2)}px)`,offset:q}); } return kf; }; // вход сверху — та же кривая, что в dropIn (fallKF2)

window.bpPunchFx=window.bpPunchFx||{}; window.bpPunchFx.shake=async ctx=>{
 const {l,g,col,cells,lock,iy,colX,sleep,anim,animA,fxBox,fxCellRect,fxGone,clamp,ROWS,COLS,BOARD}=ctx, u=g.u;
 const R0=fxCellRect(g,0,col), P=ROWS>1?fxCellRect(g,1,col).y-R0.y:g.ch; // P — шаг рядов, экранные пиксели
 const gg={...g,ox:g.lr.left,oy:g.lr.top}; // координаты внутри стекла
 const wg=document.createElement('div'); wg.className='pxs'; wg.style.cssText=bpvT`left:${g.lr.left-g.ox}px;top:${g.lr.top-g.oy}px;width:${g.lr.width}px;height:${g.lr.height}px`; l.append(wg); // обёртка по краю стекла (как обрезка слоя символов): пыль и блик не выходят за стекло
 const outs=[];
 const puff=(par,gx,x,y,s,dx,dy,T,d,op)=>{ const p=fxBox(par,gx,'dust',x,y,s,s); fxGone(p,animA(p,[{transform:'translate(0,0) scale(.5)',opacity:0},{transform:`translate(${dx*.3}px,${dy*.3}px) scale(1)`,opacity:op,offset:.2},{transform:`translate(${dx}px,${dy}px) scale(1.9)`,opacity:0}],{duration:T,delay:d,easing:'ease-out',fill:'both'})); };
 try{
 // 1. Ударная волна: символы других столбцов вздрагивают волной справа налево (внутри стекла они отстают от рамы — сначала вправо)
 { const rI=clamp(Math.round((iy-R0.y)/P-.5),0,ROWS-1);
  BOARD.forEach((row,r)=>row.forEach((o,c)=>{ if(!o||c===col||o.pw) return; const d=20+(COLS-1-c)*38+Math.abs(r-rI)*9, a=rnd(.85,1.15)*2.6*u, e='ease-in-out';
   anim(o.sp,[{transform:'translate(0,0)',easing:e},{transform:`translate(${a.toFixed(2)}px,${(-.5*u).toFixed(2)}px)`,offset:.28,easing:e},{transform:`translate(${(-a*.55).toFixed(2)}px,0)`,offset:.56,easing:e},{transform:`translate(${(a*.22).toFixed(2)}px,0)`,offset:.8,easing:e},{transform:'translate(0,0)'}],{duration:270,delay:d});
   const im=o.sp.querySelector('img'); if(im) anim(im,[{transform:'rotate(0deg)',easing:e},{transform:`rotate(${(rs()*rnd(.8,1.8)).toFixed(2)}deg)`,offset:.35,easing:e},{transform:`rotate(${(rs()*rnd(.3,.8)).toFixed(2)}deg)`,offset:.7,easing:e},{transform:'rotate(0deg)'}],{duration:270,delay:d}); })); }

 // 2. Вылет: символы столбца срываются снизу вверх и падают сквозь нижний край стекла (слой символов обрезается по стеклу)
 // 3. Билеты: сверху по одному, как в каскаде — вытянутый перед землёй, «штамп» при посадке, лёгкий отскок и пыль по бокам
 const order=[...cells].sort((a,b)=>b[0]-a[0]), T_OUT=90, STG_OUT=42, T_IN=500, STG_IN=70, last=order.length-1; let glint=Promise.resolve();
 const jobs=order.map(([r,o],k)=>(async()=>{ if(o.pw) return;
  const sp=o.sp, img=sp.querySelector('img'), Ts=80, D=(ROWS-r)*P+.12*P, T=Math.round(Math.max(150,300*Math.sqrt(D/(ROWS*P))*1.1)), rot=((r+k)%2?1:-1)*rnd(9,20), t0=T_OUT+k*STG_OUT, tin=sleep(T_IN+k*STG_IN); // tin — отсчёт входа билета от удара
  const a=animA(sp,knockKF(D,P,Ts,T,rot,rnd(-.07,.07)*P),{duration:Ts+T,delay:t0,easing:'linear',fill:'forwards'}); outs.push(a);
  if(a) await a.finished.catch(()=>{}); lock(o); await tin; // старый символ ушёл за стекло — на его месте (пока невидимо) уже билет; ждём свой черёд
  if(a) a.cancel(); img.style.transformOrigin='50% 94%';
  anim(img,[{transform:'scale(1)',offset:0},{transform:'scale(1)',offset:.55},{transform:STRETCH,offset:1}],{duration:FALL_T,easing:'ease-in',fill:'backwards'});
  await anim(sp,dropKF(ROWS,P),{duration:FALL_T,easing:'linear',fill:'backwards'});
  const sg=((col*7+r*13)%2?1:-1), rg=.07*180/Math.PI*sg, Rr=fxCellRect(g,r,col), e='ease-out'; // посадка — «штамп» WILD из landAnim, плюс лёгкий отскок всей клетки
  if(k===last) glint=glintDown();
  [-1,1].forEach(sd=>puff(wg,gg,Rr.x+Rr.w*(.5+sd*.4),Rr.y+Rr.h*.92,rnd(.24,.38)*g.cw,sd*rnd(10,22)*u,-rnd(3,10)*u,rnd(440,680),0,.55));
  anim(sp,[{transform:'translateY(0)',easing:e},{transform:`translateY(${(-.035*P).toFixed(2)}px)`,offset:.4,easing:'ease-in'},{transform:'translateY(0)'}],{duration:230,delay:50});
  await anim(img,[{transform:STRETCH,offset:0},{transform:`rotate(${rg}deg) scale(1.14)`,offset:.12},{transform:`rotate(${rg*.35}deg) scale(1.06)`,offset:.36},{transform:'rotate(0deg) scale(1)',offset:1}],{duration:230,easing:'cubic-bezier(.4,0,.6,1)'}); })());
 const glintDown=()=>{ const h=g.ch*.9, n=fxBox(wg,gg,'gl',colX,g.lr.top-h/2,R0.w*1.12,h); n.style.opacity=0; // 4. Финал: один мягкий блик вниз по столбцу
  const a=animA(n,[{transform:'translateY(0)',opacity:0},{opacity:1,offset:.18},{opacity:1,offset:.78},{transform:`translateY(${(g.lr.height+h).toFixed(1)}px)`,opacity:0}],{duration:380,easing:'ease-in-out',fill:'forwards'}); fxGone(n,a); return a?a.finished.catch(()=>{}):Promise.resolve(); };
 await Promise.all(jobs); await glint;
 } finally { // что бы ни случилось: все клетки — WILD, никаких хвостов анимаций и лишних элементов
  outs.forEach(a=>{ try{ a&&a.cancel(); }catch(e){} }); cells.forEach(([r,o])=>{ if(!o.pw) lock(o); }); wg.remove(); }
};
})();
