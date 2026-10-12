// Blackout Party — «сам удар»: четыре варианта МОМЕНТА контакта кулака Рокко с правой рамкой (владелец 2026-10-11: «сам взрыв от удара мне не нравится»).
// Подключается ui.js по требованию (?punchhit=dent|wave|arc|stop или тест-панель). Без звезды-вспышки, искр веером и радужного свечения: только материал рамки, стекла, света и тряска.
// Контракт: window.bpPunchHit[имя]=async ctx=>{…} (ctx — из punchColumn в ui.js). Промис выходит, когда можно начинать последствие (~120–180 мс после контакта), затухание идёт само.
// Время — только через ctx.animA/ctx.sleep (K: Quick/Turbo короче автоматически), всё убирается само. Тряска полей — свойства translate/rotate/scale, а не transform: не мешают последствиям.
(()=>{
const B=window.bpPunchHit=window.bpPunchHit||{}, NS='http://www.w3.org/2000/svg', rnd=(a,b)=>a+Math.random()*(b-a), cl=(v,a,b)=>Math.min(b,Math.max(a,v));
let TRK=null; // узлы текущего удара: если вариант упал или что-то зависло, run() всё уберёт
const mk=(p,css,tag,html)=>{ const n=document.createElement(tag||'div'); n.className='phx'; n.style.cssText='position:absolute;pointer-events:none;'+css; if(html) n.innerHTML=html; p.append(n); if(TRK) TRK.push(n); return n; }; // элемент слоя; px — поля (родитель #pfx) или экрана (родитель body, position:fixed в css)
const sv=(p,css,inner)=>{ const s=document.createElementNS(NS,'svg'); s.setAttribute('class','phx'); s.style.cssText='position:absolute;pointer-events:none;overflow:visible;'+css; s.innerHTML=inner; p.append(s); if(TRK) TRK.push(s); return s; };
const gone=(n,a)=>{ if(a) a.finished.catch(()=>{}).then(()=>n.remove()); else n.remove(); };
const fmt=v=>v.toFixed(1);
function spring(T,z,step){ // отклик затухающей пружины на толчок: [[мс,значение]…]; пик первой волны = 1, дальше отдача и затухание; T — длительность первой полуволны, z — затухание (0,3 — звенит, 0,6 — глухо)
 const wd=Math.PI/T, w0=wd/Math.sqrt(1-z*z), tot=T*2.8, n=Math.ceil(tot/step), s=[]; let m=0;
 for(let i=0;i<=n;i++){ const t=i*tot/n, v=Math.exp(-z*w0*t)*Math.sin(wd*t); s.push([t,v]); m=Math.max(m,Math.abs(v)); }
 s.forEach(p=>{ p[1]/=m; }); s[n][1]=0; return {s,tot}; }
function kick(ctx,node,ax,ay,rot,sc,T,z,delay){ // толчок узла пружиной: сдвиг (-ax,+ay) px, поворот rot°, масштаб 1+sc; свойства translate/rotate/scale (transform остаётся свободным)
 const {s,tot}=spring(T,z,14), kf=s.map(([t,v])=>({translate:`${fmt(-ax*v)}px ${fmt(ay*v)}px`,rotate:`${(rot*v).toFixed(3)}deg`,scale:(1+sc*v).toFixed(4),offset:t/tot}));
 return ctx.animA(node,kf,{duration:tot,delay:delay||0,easing:'linear'}); }
const tween=(ctx,ms,fn)=>new Promise(res=>{ const d=ms*ctx.K(), t0=performance.now(); if(!(d>0)){ fn(1); return res(); } const st=()=>{ const p=ctx.skipped&&ctx.skipped()?1:Math.min(1,(performance.now()-t0)/d); fn(p); if(p<1) requestAnimationFrame(st); else res(); }; st(); }); // rAF-шаг (для того, что нельзя отдать WAAPI: атрибут фильтра, canvas)
const later=(ctx,ms,fn)=>setTimeout(fn,ms*ctx.K()+60);
const run=(name,fn)=>{ B[name]=async ctx=>{ const list=TRK=[]; later(ctx,2600,()=>list.forEach(n=>n.remove())); try{ return await fn(ctx); }catch(e){ list.forEach(n=>n.remove()); throw e; } }; }; // обёртка варианта: уборка и при ошибке, и по таймеру (с запасом)
const jag=(pts,step,amp)=>{ let d=`M${fmt(pts[0][0])} ${fmt(pts[0][1])}`; for(let i=1;i<pts.length;i++){ const [x0,y0]=pts[i-1],[x1,y1]=pts[i], L=Math.hypot(x1-x0,y1-y0)||1, n=Math.max(1,Math.round(L/step)), nx=-(y1-y0)/L, ny=(x1-x0)/L;
  for(let k=1;k<=n;k++){ const t=k/n, j=k===n?0:rnd(-amp,amp); d+=` L${fmt(x0+(x1-x0)*t+nx*j)} ${fmt(y0+(y1-y0)*t+ny*j)}`; } } return d; };
const bump=(dy,hh)=>Math.abs(dy)<hh?(1+Math.cos(Math.PI*dy/hh))/2:0; // гладкая «горка» прогиба по высоте
const railY=(ctx,hh)=>{ const g=ctx.g, a=g.fr.top+g.rail.t+hh, b=g.fr.bottom-g.rail.b-hh; return a<b?cl(ctx.iy,a,b):ctx.iy; }; // высота удара не ближе hh к угловым деталям рамки (на телефоне кулак не достаёт — точка у верхнего правого угла)

// Крошки краски и металла: баллистика (скорость, гравитация), кувырок; красная краска рамки, редкая голая сталь
function chips(ctx,x,y,n,o){ const {l,g}=ctx, u=g.u, k=ctx.K()<.5?.6:1; n=Math.round(n*k); o=o||{};
 for(let i=0;i<n;i++){ const bare=i%4===3, w=rnd(3.4,7)*u, h=w*rnd(.55,1), pts=Array.from({length:5},(_,j)=>{ const a=j/5*6.283+rnd(-.4,.4), r=rnd(.55,1); return `${(50+Math.cos(a)*50*r).toFixed(0)}% ${(50+Math.sin(a)*50*r).toFixed(0)}%`; }).join(',');
  const n0=mk(l,`left:${fmt(x-g.ox-w/2)}px;top:${fmt(y-g.oy-h/2)}px;width:${fmt(w)}px;height:${fmt(h)}px;clip-path:polygon(${pts});background:${bare?'linear-gradient(135deg,#c9c5b8,#7b7870)':'linear-gradient(135deg,#a8402f,#5c1a14)'}`);
  const a=rnd(-2.6,-.55), sp=rnd(70,190)*u*(o.v||1), vx=Math.cos(a)*sp+(o.vx||-30)*u, vy=Math.sin(a)*sp, G=950*u, T=rnd(520,780), kf=[], rot=rnd(-540,540), flip=rnd(5,9);
  for(let j=0;j<=12;j++){ const t=j/12, s=t*T/1000; kf.push({transform:`translate(${fmt(vx*s)}px,${fmt(vy*s+.5*G*s*s)}px) rotate(${(rot*t).toFixed(0)}deg) scaleY(${(Math.cos(t*flip)*.5+.5+.35).toFixed(2)})`,opacity:t<.82?1:1-(t-.82)/.18,offset:t}); }
  gone(n0,ctx.animA(n0,kf,{duration:T,delay:rnd(0,25),easing:'linear',fill:'both'})); } }
// Облачко пыли: мягкие серые пятна, расползаются и гаснут
function puff(ctx,x,y,n,o){ const {l,g}=ctx, u=g.u; o=o||{}; n=Math.round(n*(ctx.K()<.5?.67:1));
 for(let i=0;i<n;i++){ const s=rnd(.3,.5)*g.cw*(o.s||1), p=mk(l,`left:${fmt(x-g.ox-s/2+rnd(-5,5)*u)}px;top:${fmt(y-g.oy-s/2+rnd(-8,8)*u)}px;width:${fmt(s)}px;height:${fmt(s)}px;border-radius:50%;filter:blur(${fmt(2.2*u)}px);background:radial-gradient(circle,${o.c0||'rgba(168,158,140,.55)'},${o.c1||'rgba(128,118,102,.26)'} 48%,transparent 72%)`),
   dx=(o.dx??-30)*u*rnd(.6,1.3), dy=(o.dy??-22)*u*rnd(.5,1.3), T=rnd(620,960);
  gone(p,ctx.animA(p,[{transform:'translate(0,0) scale(.35)',opacity:0},{transform:`translate(${fmt(dx*.35)}px,${fmt(dy*.35)}px) scale(.8)`,opacity:o.a||.8,offset:.16},{transform:`translate(${fmt(dx)}px,${fmt(dy)}px) scale(${(o.g||1.7).toFixed(2)})`,opacity:0}],{duration:T,delay:(o.d||0)+rnd(0,60),easing:'cubic-bezier(.2,.6,.3,1)',fill:'both'})); } }

// Пыль от удара: мелкие мягкие крупинки вылетают влево-вверх и тормозят (сопротивление воздуха), плюс два еле заметных облачка; тёплый светло-серый, без свечения
function dust(ctx,x,y,n){ const {l,g}=ctx, u=g.u; n=Math.round(n*(ctx.K()<.5?.6:1));
 for(let i=0;i<n;i++){ const r=rnd(1.6,4.8)*u, a=rnd(-2.9,-.5), d=rnd(14,52)*u, dx=Math.cos(a)*d-10*u, dy=Math.sin(a)*d*.8-4*u, T=rnd(520,900), c=190+((Math.random()*30)|0),
   p=mk(l,`left:${fmt(x-g.ox-r)}px;top:${fmt(y-g.oy-r)}px;width:${fmt(2*r)}px;height:${fmt(2*r)}px;border-radius:50%;background:radial-gradient(circle,rgba(${c},${c-14},${c-40},.8),rgba(${c-40},${c-52},${c-76},.35) 55%,transparent 72%)`);
  gone(p,ctx.animA(p,[{transform:'translate(0,0) scale(.5)',opacity:0},{transform:`translate(${fmt(dx*.55)}px,${fmt(dy*.55)}px) scale(1)`,opacity:.9,offset:.14},{transform:`translate(${fmt(dx*.9)}px,${fmt(dy*.9+6*u)}px) scale(1.5)`,opacity:.5,offset:.6},{transform:`translate(${fmt(dx)}px,${fmt(dy+12*u)}px) scale(1.9)`,opacity:0}],{duration:T,delay:rnd(0,50),easing:'cubic-bezier(.1,.7,.3,1)',fill:'both'})); }
 puff(ctx,x-4*u,y,2,{dx:-18,dy:-14,s:.45,a:.4}); }

// 1 · ВМЯТИНА: удар гонит металл рамки внутрь, и полоса вздувается в сторону поля (копия полосы рамки + feDisplacementMap — текстура и краска настоящие, внешний край стоит), по гребню сколы краски; поле отбрасывает пружиной влево; пыль и крошки
// вмятина на правой раме (общая для «Вмятины» и «Волны»): копия полосы рамки + feDisplacementMap, гребень со сколами краски; depth(k) — глубина 0…1
function railDent(ctx){
 const {l,g,f}=ctx, u=g.u, rr=g.rail.r, X1=g.fr.right, X0=X1-rr, hh=2.2*rr, dl=.52*rr, cy=railY(ctx,hh), cyl=cy-g.oy, pad=Math.ceil(dl*1.4)+2;
 const cg=document.getElementById('cellgrid'), gx=cg&&cg.getBoundingClientRect().width>10?cg.getBoundingClientRect().right:g.lr.right, wl=Math.round(gx-g.ox), ww=Math.round(X1-g.ox)-wl, PT=Math.round(cyl-hh), PH=Math.round(2*hh), PL=wl-pad, PW=pad+ww; // патч целыми px поля: растр копии совпадает с растром рамки
 const box=mk(l,`left:${PL}px;top:${PT}px;width:${PW}px;height:${PH}px`), id='phd'+((performance.now()*1000)|0), sm=t=>t*t*(3-2*t);
 const cv=document.createElement('canvas'); cv.width=PW; cv.height=PH; { const c=cv.getContext('2d'), im=c.createImageData(PW,PH); // карта смещения: R — сдвиг влево (0,5 — нет), слева сдвиг полный, к внешнему краю затухает: полоса растягивается, внешний край на месте
  for(let y=0;y<PH;y++){ const b=bump(y+.5-PH/2,hh); for(let x=0;x<PW;x++){ const w=1-sm(cl((x-pad-.12*ww)/(.7*ww),0,1)), i=(y*PW+x)*4; im.data[i]=Math.round(128+127*b*w); im.data[i+1]=128; im.data[i+2]=0; im.data[i+3]=255; } } c.putImageData(im,0,0); }
 const defs=sv(box,'width:0;height:0',`<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${PW}" height="${PH}" color-interpolation-filters="sRGB"><feImage href="${cv.toDataURL()}" x="0" y="0" width="${PW}" height="${PH}" preserveAspectRatio="none" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>`), fe=defs.querySelector('feDisplacementMap');
 const outer=mk(box,`left:0;top:0;width:${PW}px;height:${PH}px;filter:url(#${id})`), win=mk(outer,`left:${pad}px;top:0;width:${ww}px;height:${PH}px;overflow:hidden`);
 const frm=f.querySelector(':scope>.frm'); let sheet; if(frm) sheet=frm.cloneNode(false); else { sheet=document.createElement('div'); sheet.style.background=`${getComputedStyle(f).backgroundImage} 0 0/100% 100% no-repeat`; }
 sheet.className=(frm?frm.className:'')+' phx'; Object.assign(sheet.style,{position:'absolute',inset:'auto',left:-wl+'px',top:-PT+'px',width:g.W+'px',height:g.H+'px',boxSizing:'border-box',pointerEvents:'none'}); win.append(sheet);
 // гребень вздутия: блик на выгнутом крае и сколы краски до голой стали (мелкие светлые чешуйки), две волосяные трещины
 const xl=pad+.04*ww, ys=[]; for(let y=0;y<=PH;y+=2) ys.push(y);
 const crest=ys.map(y=>`${fmt(xl-dl*bump(y-PH/2,hh)*.92)} ${y}`);
 let fl=''; for(let i=0;i<10;i++){ const y=PH/2+rnd(-.7,.7)*hh, b=bump(y-PH/2,hh), x=xl-dl*b+rnd(0,1.8)*u, w=rnd(1.3,3.4)*u, h=rnd(.9,2.4)*u; fl+=`<path d="M${fmt(x)} ${fmt(y)}l${fmt(w)} ${fmt(-h*.4)}l${fmt(w*.5)} ${fmt(h)}l${fmt(-w*.7)} ${fmt(h*.5)}z" fill="${i%3?'#8e8a80':'#cfcabb'}" opacity="${rnd(.6,.95).toFixed(2)}"/>`; }
 let cr=''; for(let i=0;i<2;i++){ const y=PH/2+rnd(-.35,.35)*hh, x=pad+rnd(.2,.55)*ww; cr+=`<path d="${jag([[x,y],[x+rnd(-.4,.4)*rr,y+(i?1:-1)*rnd(.5,.8)*rr]],3*u,.9*u)}" fill="none" stroke="#050202" stroke-width="${fmt(.9*u)}" stroke-linecap="round" opacity=".85"/>`; }
 const shd=ys.map(y=>`${fmt(xl-dl*bump(y-PH/2,hh)*.92-3.2*u*bump(y-PH/2,hh))} ${y}`).reverse();
 const sh=sv(box,`left:0;top:0;width:${PW}px;height:${PH}px;opacity:0`,`<g style="filter:blur(${fmt(1.4*u)}px)"><path d="M${crest.join('L')}L${shd.join('L')}Z" fill="rgba(0,0,0,.42)"/></g><path d="M${crest.join('L')}" fill="none" stroke="rgba(226,208,186,.55)" stroke-width="${fmt(.9*u)}" stroke-linecap="round" transform="translate(${fmt(-.4*u)} 0)"/>${cr}${fl}`);
 const depth=k=>{ fe.setAttribute('scale',fmt(2*dl*k)); sh.style.opacity=Math.min(1,k*1.25).toFixed(3); }; depth(0);
 return {box,depth,cy}; }

run('dent',async ctx=>{
 const {g,f,animA,sleep}=ctx, u=g.u, sm=t=>t*t*(3-2*t);
 ctx.hold(70);
 const D=railDent(ctx), cy=D.cy, box=D.box; window.bpAudio&&bpAudio.play('punch.dent_pop'); // звук вмятины (audio.js)
 tween(ctx,60,p=>D.depth(1-Math.pow(1-p,3))).then(()=>tween(ctx,200,p=>D.depth(1-.16*sm(p))));
 kick(ctx,f,Math.max(5,8*g.W/809),1.4,.1,0,95,.5); // поле — влево от кулака, малый перелёт назад, затухание
 dust(ctx,ctx.ix-2*u,cy,14);
 chips(ctx,ctx.ix+3*u,cy,8);
 later(ctx,880,()=>{ const a=animA(box,[{opacity:1},{opacity:0}],{duration:520,fill:'forwards'}); gone(box,a); }); later(ctx,1600,()=>box.remove());
 await sleep(150); });

// 2 · ВОЛНА ПО СТЕКЛУ + ВМЯТИНА (выбор владельца 2026-10-11: «давай 2 вариант, но ещё вмятину; как Рокко начинает убирать руку — вмятина убирается параллельно за его рукой»): от точки удара по стеклу идёт одно чистое кольцо (тонкий светлый гребень, за ним тёмная полоса, canvas), символы чуть отъезжают от волны и возвращаются
run('wave',async ctx=>{
 const {l,g,f,sleep,BOARD,ROWS,COLS}=ctx, u=g.u, cx0=ctx.ix, cy0=railY(ctx,g.ch*.5), gl=document.getElementById('cellgrid'), gr=(gl&&gl.getBoundingClientRect().width>10?gl:ctx.g.f.querySelector('#symlayer')||f).getBoundingClientRect();
 ctx.hold(55);
 const dpr=Math.min(1.5,window.devicePixelRatio||1), W=gr.width, H=gr.height, cvs=mk(l,`left:${fmt(gr.left-g.ox)}px;top:${fmt(gr.top-g.oy)}px;width:${fmt(W)}px;height:${fmt(H)}px`,'canvas'), c=cvs.getContext('2d');
 cvs.width=Math.round(W*dpr); cvs.height=Math.round(H*dpr); const px=(cx0-gr.left)*dpr, py=(cy0-gr.top)*dpr;
 const Rmax=Math.hypot(Math.max(cx0-gr.left,gr.right-cx0),Math.max(cy0-gr.top,gr.bottom-cy0))*1.02, T=560, ez=p=>1-Math.pow(1-p,1.8), inv=r=>1-Math.pow(1-Math.min(1,r/Rmax),1/1.8); // ez — путь гребня от времени; inv — время прихода гребня в точку на расстоянии r
 const draw=p=>{ c.clearRect(0,0,cvs.width,cvs.height); const R=Rmax*ez(p)*dpr, E=Math.pow(1-p,1.2), s=u*dpr*(1+.9*ez(p)); if(R<1||E<=.01) return; const r0=Math.max(0,R-19*s), r1=R+8*s, f=r=>cl((r-r0)/(r1-r0),0,1), gd=c.createRadialGradient(px,py,r0,px,py,r1);
  const st=[[-19,0,'8,5,3'],[-14.5,.07*E,'255,243,214'],[-12,0,'8,5,3'],[-8,.26*E,'8,5,3'],[-2.6,.18*E,'8,5,3'],[-.9,0,'8,5,3'],[-.3,0,'255,243,214'],[0,.88*E,'255,243,214'],[1.3,.34*E,'255,243,214'],[3.4,.09*E,'255,243,214'],[8,0,'255,243,214']];
  st.forEach(([d,a,col])=>gd.addColorStop(f(R+d*s),`rgba(${col},${a.toFixed(3)})`)); c.strokeStyle=gd; c.lineWidth=r1-r0; c.beginPath(); c.arc(px,py,(r0+r1)/2,0,6.2832); c.stroke(); };
 tween(ctx,T,draw).then(()=>cvs.remove()); // кольцо: гребень (светлый, тонкий), перед ним лёгкий ореол, за ним тёмная полоса
 // символы, до которых дошла волна: толчок от точки удара (затухает с расстоянием) и возврат пружиной, чуть «линзит» (масштаб)
 for(let r=0;r<ROWS;r++) for(let cc=0;cc<COLS;cc++){ const o=BOARD[r][cc]; if(!o||!o.sp) continue; const R=ctx.fxCellRect(g,r,cc), x=R.x+R.w/2-cx0, y=R.y+R.h/2-cy0, d=Math.hypot(x,y)||1, t=inv(d)*T, fo=1/(1+Math.pow(d/(2.4*g.cw),2)), E=Math.pow(1-inv(d),1.2), A=(2+7.5*fo)*u*(.4+.6*E);
  kick(ctx,o.sp,-x/d*A,y/d*A,0,.035*fo*E+.004,85,.5,Math.max(0,t-45)); }
 window.bpAudio&&(bpAudio.play('punch.wave'),bpAudio.play('punch.dent_pop',{delay:70})); // волна по стеклу и вмятина (audio.js)
 { const D=railDent(ctx), sm=t=>t*t*(3-2*t), K0=.84; for(let i=TRK.length-1;i>=0;i--) if(D.box.contains(TRK[i])) TRK.splice(i,1); // вмятину живёт дольше общей уборки (рука держится у рамки); убираем сами
  tween(ctx,60,p=>D.depth(1-Math.pow(1-p,3))).then(()=>tween(ctx,200,p=>D.depth(1-.16*sm(p))));
  const v=ctx.vid&&ctx.vid(), tb=ctx.tBack, th=ctx.tHome, end=()=>{ D.depth(0); D.box.remove(); }; setTimeout(end,6000);
  if(v&&tb>0&&th>tb){ const st=()=>{ if(!D.box.isConnected) return; const t=v.currentTime; if(!v.isConnected||v.ended||t>=th) return end(); if(t>tb) D.depth(K0*(1-sm(Math.min(1,(t-tb)/(th-tb))))); requestAnimationFrame(st); }; sleep(260).then(()=>requestAnimationFrame(st)); } // по времени ролика: рука пошла назад — металл выпрямляется следом, до конца отвода
  else later(ctx,700,()=>tween(ctx,450,p=>D.depth(K0*(1-sm(p)))).then(end)); }
 kick(ctx,f,3.4*g.W/809,.7,0,0,80,.55);
 later(ctx,T+700,()=>{ cvs.remove(); });
 await sleep(150); });

// 3 · ЗАМЫКАНИЕ: короткая дуга на рамке в точке удара (рваные голубовато-белые линии ~120 мс, 3 кадра треска), дымок вверх, свет сцены один раз проседает
run('arc',async ctx=>{
 const {g,animA,sleep}=ctx, u=g.u, rr=g.rail.r, xm=g.fr.right-.42*rr, ym=railY(ctx,g.ch*.6), ch=g.ch;
 ctx.hold(45);
 const top=document.body, dim=mk(top,'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:32;background:#05030a;opacity:0'), fx=mk(top,'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:33;mix-blend-mode:screen');
 const gl=mk(fx,`left:${fmt(xm-1.7*ch)}px;top:${fmt(ym-1.7*ch)}px;width:${fmt(3.4*ch)}px;height:${fmt(3.4*ch)}px;border-radius:50%;background:radial-gradient(circle,rgba(168,208,236,.5),rgba(120,170,215,.18) 40%,transparent 68%);opacity:0`);
 const frames=[]; for(let k=0;k<3;k++){ // три кадра треска: каждый — свой рисунок; общий скелет: вверх и вниз вдоль рамки и короткий прыжок на стекло
  const up=rnd(.9,1.3)*ch, dn=rnd(.6,1)*ch, hp=rnd(34,56)*u, hy=rnd(-.35,.35)*ch*.4, dirs=[[[xm,ym],[xm+rnd(-2,2)*u,ym-up*.5],[xm+rnd(-2,2)*u,ym-up]],[[xm,ym],[xm+rnd(-2,2)*u,ym+dn*.5],[xm+rnd(-2,2)*u,ym+dn]],[[xm,ym],[xm-hp*.5,ym+hy*.5+rnd(-5,5)*u],[xm-hp,ym+hy]]];
  let d=''; dirs.forEach(p=>{ d+=jag(p,7*u,2.8*u)+' '; }); const t=Math.floor(rnd(.35,.8)*2); // веточка от верхней линии
  const [bx,by]=dirs[t][1]; d+=jag([[bx,by],[bx+rnd(-1,1)*18*u,by+rnd(-1,1)*18*u]],5*u,1.6*u);
  frames.push(sv(fx,'left:0;top:0;width:100%;height:100%;opacity:0',`<g style="filter:blur(${fmt(2.4*u)}px)"><path d="${d}" fill="none" stroke="rgba(130,190,235,.6)" stroke-width="${fmt(7.5*u)}" stroke-linecap="round" stroke-linejoin="round"/></g><path d="${d}" fill="none" stroke="rgba(176,218,244,.92)" stroke-width="${fmt(2.9*u)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#f4fbff" stroke-width="${fmt(1.35*u)}" stroke-linecap="round" stroke-linejoin="round"/>`)); }
 const FT=130; frames.forEach((s,k)=>{ const a=k/3,b=(k+1)/3; gone(s,animA(s,[{opacity:0,offset:0},{opacity:0,offset:a},{opacity:1,offset:a},{opacity:1,offset:b-.001},{opacity:0,offset:b},{opacity:0}],{duration:FT,easing:'linear',fill:'both'})); });
 gone(gl,animA(gl,[{opacity:0},{opacity:1,offset:.1},{opacity:.55,offset:.34},{opacity:.95,offset:.46},{opacity:.3,offset:.74},{opacity:0}],{duration:FT*1.5,easing:'linear',fill:'both'}));
 gone(dim,animA(dim,[{opacity:0},{opacity:.24,offset:.07},{opacity:.07,offset:.2},{opacity:.2,offset:.34},{opacity:.04,offset:.5},{opacity:.11,offset:.62},{opacity:0}],{duration:340,easing:'linear',fill:'both'}));
 puff(ctx,xm-4*u,ym-2*u,3,{dx:-10,dy:-62,s:1.1,g:2.2,a:.95,d:35,c0:'rgba(118,114,118,.7)',c1:'rgba(70,66,70,.4)'});
 later(ctx,520,()=>{ dim.remove(); fx.remove(); });
 await sleep(150); });

// 4 · СТОП-КАДР: ничего не рисуется на раме. Ролик замирает (hold), два кадра «ударного кадра» (обесцвечивание, контраст, виньетка от кулака), потом тяжёлая быстро затухающая тряска поля и фона (HUD стоит) и крошечный наезд 1–2 %
run('stop',async ctx=>{
 const {g,f,K,animA,sleep}=ctx, px=ctx.ix, py=ctx.iy;
 ctx.hold(110);
 const fr=mk(document.body,`position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:32;backdrop-filter:grayscale(.78) contrast(1.3) brightness(.9);-webkit-backdrop-filter:grayscale(.78) contrast(1.3) brightness(.9);opacity:0`),
  vg=mk(document.body,`position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:32;background:radial-gradient(circle at ${fmt(px)}px ${fmt(py)}px,rgba(0,0,0,0) 0,rgba(0,0,0,0) 12%,rgba(0,0,0,.28) 62%,rgba(0,0,0,.42) 100%);opacity:0`);
 gone(fr,animA(fr,[{opacity:1},{opacity:1,offset:.98},{opacity:0}],{duration:Math.max(34,28/K()),easing:'linear',fill:'both'})); // 2 кадра при 60 Гц (в Quick/Turbo не короче ~28 мс)
 gone(vg,animA(vg,[{opacity:1},{opacity:1,offset:.1},{opacity:0}],{duration:230,easing:'cubic-bezier(.3,.6,.4,1)',fill:'both'}));
 const sel={plane:['#field','#lad','#alt','#garland','#gar2','#gar3'],world:['#bg','#bgblur','#bgfx','#fx-light','#sign','#spot','#features']}, A=9*Math.max(.6,Math.min(1.25,g.W/809)), TAU=105, FQ=11.5, N=Math.ceil(420/8), tot=420;
 const run=(els,a,z)=>els.forEach(n=>{ const kf=[]; for(let i=0;i<=N;i++){ const t=i*tot/N, e=Math.exp(-t/TAU), x=-a*e*Math.cos(2*Math.PI*FQ*t/1000), y=a*.42*e*Math.sin(2*Math.PI*FQ*1.31*t/1000+.7), sc=1+z*Math.max(0,Math.sin(Math.min(1,t/150)*Math.PI))*Math.exp(-t/180); kf.push({translate:`${fmt(x)}px ${fmt(y)}px`,scale:sc.toFixed(4),offset:i/N}); } kf[N].translate='0px 0px'; kf[N].scale='1'; animA(n,kf,{duration:tot,delay:34,easing:'linear'}); });
 run(sel.plane.map(s=>document.querySelector(s)).filter(Boolean),A,.016); run(sel.world.map(s=>document.querySelector(s)).filter(Boolean),A*.4,.01);
 later(ctx,600,()=>{ fr.remove(); vg.remove(); });
 await sleep(130); });
})();
