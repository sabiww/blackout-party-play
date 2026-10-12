/* Blackout Party — «осадки» экрана большого выигрыша: варианты вместо цветного конфетти (владелец 2026-10-12: «конфетти тоже как нейрослоп, надо варианты более естественные»).
   Макет, не игра. Подключается перед bigwin-show.js; без него шоу просто рисует прежнее конфетти.
   Варианты (адрес ?bwfx=…, в этой вкладке — sessionStorage 'bp-bwfx', кнопка в тест-панели; по умолчанию streamers):
     streamers — бумажный серпантин: хлопушки из нижних углов, полоса разматывается и летит с затуханием скорости, на падении трепещет и крутится ребром (ширина полосы = |cos угла поворота|, обратная сторона темнее);
     tickets   — призовые билеты сыплются сверху, как золотые билеты WILD: перфорация, печатная полоса, переворот вокруг длинной оси, раскачка;
     coins     — жетоны падают с отскоками и ложатся на пол у нижней кромки, остаются лежать (отскоки — формулой от времени, поэтому перемотка root.seek работает);
     dust      — только пыль и свет: труха сыплется с потолка, на ударах облачко у плеч плашки; лампочки плашки сами дают вспышку (bigwin-show.js);
     old       — прежний вид экрана целиком (конфетти, искры, кольца, плашка с колокольчиком, лампы 10×/25×/50×/100×).
   Все положения — формулы от времени (tau — секунды с рождения частицы), как у прежнего конфетти: перемотка, Turbo и «меньше движения» считаются тем же кодом.
   Цвета приглушённые, тянутся к цвету лампы: яркость зависит от света сцены (lamp) и от положения (в центре, под лампой, ярче). Ни свечения, ни блёсток.
   API: BigWinFx.mode(o) → имя варианта; BigWinFx.spawn(kind,burst,ctx,R,push) — рожает частицы из «выстрела» (burst из buildFx в bigwin-show.js); BigWinFx.draw(g,p,tau,ctx) — рисует одну частицу. */
(()=>{
'use strict';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
/* Четыре независимых выбора (владелец 2026-10-12: «побольше вариантов»): fx — осадки, pl — материал плашки, lamp — лампы порогов, hint — надпись «тап». Адрес ?bwfx=…&bwpl=…&bwlamp=…&bwhint=…, в этой вкладке sessionStorage 'bp-bwfx|pl|lamp|hint' (кнопки тест-панели). */
const GROUPS={
 fx:{title:'Вместо конфетти',def:'streamers',list:[['streamers','1 · Серпантин — бумажные ленты'],['tickets','2 · Билеты сыплются сверху'],['coins','3 · Жетоны падают и ложатся на пол'],['balloons','4 · Шарики поднимаются и лопаются'],['cups','5 · Колпаки и бумажные стаканчики'],['dust','6 · Только пыль и свет ламп'],['old','0 · Прежний вид целиком (конфетти, колокольчик, сирена)']]},
 pl:{title:'Плашка',def:'steel',list:[['dlg','0 · Тёмная, как окна F: красная лента с винтом, охристое название (по умолчанию в режиме плашек «dark»)'],['note','0 · Записка на плите: бумага на плите цвета рамки слота (по умолчанию в режиме плашек «note»)'],['steel','1 · Красная сталь рамки, марка из ламп'],['ticket','2 · Билет: кремовая бумага с перфорацией'],['wood','3 · Тёмное дерево с латунной табличкой'],['gun','4 · Серая сталь пульта, красный трафарет'],['board','5 · Картон и малярная лента']]},
 lamp:{title:'Пороги (низ плашки)',def:'dots',list:[['dots','1 · Простые кружки: залит / пуст (выбор по умолчанию)'],['bulbs','0 · Прежние лампочки со стеклом и нитью'],['flip','2 · Механические таблички-перекидки'],['rings','3 · Эмалевые диски с цифрой']]},
 top:{title:'Верх плашки',def:'bolts',list:[['bolts','1 · Ряд болтов (по умолчанию)'],['perf','2 · Перфорация билета, отрывной край'],['tag','3 · Бирка на бечёвке'],['none','4 · Ничего']]},
 hint:{title:'Надпись «тап»',def:'strip',list:[['dlg','0 · Тёмная ячейка с рамкой, как окна F (по умолчанию в режиме плашек «dark»)'],['note','0 · Записка на скотче (по умолчанию в режиме плашек «note»)'],['strip','1 · Трафарет на тёмной планке'],['stub','2 · Билетный корешок'],['paint','3 · Облупленная краска без планки'],['crt','4 · Строка камеры наблюдения']]}};
const KEY={fx:'bwfx',pl:'bwpl',lamp:'bwlamp',top:'bwtop',hint:'bwhint'};
function opt(g,o){ const G=GROUPS[g], names=G.list.map(v=>v[0]), def=(g==='pl'||g==='hint')&&window.bpPlates&&window.bpPlates.on()?'note':(g==='pl'||g==='hint')&&window.bpPlates&&window.bpPlates.dark&&window.bpPlates.dark()?'dlg':G.def; let m=o&&o[g]; if(!m){ try{ m=new URLSearchParams(location.search).get(KEY[g]); }catch(e){} } if(!m){ try{ m=sessionStorage.getItem('bp-'+KEY[g]); }catch(e){} } m=String(m||def).toLowerCase(); return names.includes(m)?m:def; }
const mode=o=>opt('fx',o);
const VARIANTS=GROUPS.fx.list, NAMES=VARIANTS.map(v=>v[0]), DEF=GROUPS.fx.def;

/* приглушённые цвета праздника под вольфрамовой лампой: ржаво-красный, горчичный, кремовая бумага, тёмно-бордовый, вылинявший зелёно-серый */
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const PAPER=['#b04a37','#d2a24a','#d4c7a6','#8a2f24','#d2a24a','#d4c7a6','#4f6e60','#b04a37'].map(hex);
const TICKET=[['#e2b650','#b98a2c'],['#e2b650','#b98a2c'],['#d9cba6','#a89a74'],['#c9503a','#8f3324']].map(a=>a.map(hex));   // лицо / оборот: золотой билет WILD, кремовый, красный
const BALL=['#a8382c','#cdbf9c','#c79a3e','#4f6e60','#8a2f24'].map(hex);   // шарики: ржавый красный, кремовый, горчичный, вылинявший зелёный, бордо
const BRASS=['#c99a38','#7a5518','#e0bd6a'].map(hex);                                                                             // жетон: медь-латунь, ободок, лицо
/* свет на частице: ярче в середине экрана (там лампа) и зависит от света сцены; цвет чуть теплеет */
function lit(c,x,y,ctx,s){ const k=clamp((.34+.72*ctx.lamp)*(.62+.38*Math.exp(-Math.pow((x/ctx.W-.5)/.42,2)))*(s||1),.22,1.08); return `rgb(${(c[0]*k)|0},${(c[1]*k*.96)|0},${(c[2]*k*.86)|0})`; }

/* ---------------- рождение частиц ---------------- */
function spawn(kind,b,ctx,R,push){
 const u=ctx.u, W=ctx.W, H=ctx.H, ps=ctx.ps, fxk=ctx.fx;
 if(fxk==='streamers'){
  if(b.kind==='sparks'||b.kind==='ring') return;
  const n=Math.max(2,Math.round(b.n*(b.kind==='cannon'?.2:.1)));
  for(let i=0;i<n;i++){ let x0,y0,vx,vy;
   if(b.kind==='cannon'){ const aim=b.side<0?1:-1, el=(58+R()*22)*Math.PI/180, sp=(62+R()*34)*u*b.pw; x0=b.side<0?-.8*u:W+.8*u; y0=H+.5*u; vx=aim*Math.cos(el)*sp*(.55+R()*.5); vy=-Math.sin(el)*sp; }
   else { x0=(.08+R()*.84)*W; y0=-(3+R()*10)*u; vx=(R()-.5)*14*u; vy=(4+R()*10)*u; }
   const k=1.5+R()*.5;
   push({fk:'str',t0:b.t0+(b.kind==='rain'?R()*b.dur:R()*.12),x0,y0,vx,vy,k,g:k*(7+R()*4)*u,   // предельная скорость падения g/k = 7–11 ед./с: бумага тормозит о воздух
    c:PAPER[(R()*PAPER.length)|0],w:(.5+R()*.35)*Math.max(1,ps*.8)*u,len:(8+R()*9)*u*Math.max(1,ps*.6),ph:R()*6.28,ph2:R()*6.28,fq:1.6+R()*1.4,amp:(.9+R()*1.5)*u,tw:.16+R()*.2,life:9}); }
  return; }
 if(fxk==='tickets'){
  if(b.kind==='sparks'||b.kind==='ring') return;
  const n=Math.max(2,Math.round(b.n*(b.kind==='cannon'?.2:.46)));
  for(let i=0;i<n;i++){ const cn=b.kind==='cannon';
   const x0=cn?(b.side<0?(.04+R()*.3):(.66+R()*.3))*W:(.04+R()*.92)*W, y0=-(2+R()*(cn?5:16))*u, vx=cn?(b.side<0?1:-1)*(4+R()*9)*u:(R()-.5)*10*u, vy=(2+R()*8)*u, k=1.1+R()*.4;
   const cc=TICKET[(R()*TICKET.length)|0], L=(3.3+R()*1)*u*ps;
   push({fk:'tk',t0:b.t0+(cn?R()*.12:R()*b.dur),x0,y0,vx,vy,k,g:k*(11+R()*5)*u,front:cc[0],back:cc[1],L,Wd:L*.5,ph:R()*6.28,fq:2+R()*1.6,amp:(1.6+R()*2.2)*u,om:2.4+R()*4,fl0:R()*6.28,rot0:(R()-.5)*1.4,ra:.5+R()*.7,life:9,mark:(R()*3)|0}); }
  return; }
 if(fxk==='coins'){
  if(b.kind==='sparks'||b.kind==='ring') return;
  const n=Math.max(3,Math.round(b.n*(b.kind==='cannon'?.18:.42)));
  for(let i=0;i<n;i++){ const cn=b.kind==='cannon';
   const x0=cn?(b.side<0?(.03+R()*.28):(.69+R()*.28))*W:(.03+R()*.94)*W, y0=-(2+R()*(cn?5:14))*u, vx=cn?(b.side<0?1:-1)*(3+R()*9)*u:(R()-.5)*8*u;
   push({fk:'coin',t0:b.t0+(cn?R()*.14:R()*b.dur),x0,y0,vx,vy:(R()*6)*u,g:(54+R()*14)*u,e:.34+R()*.14,kx:1.1+R()*.9,fl:H-(1.4+R()*6.2)*u,r:(.82+R()*.3)*ps*u*.9,ph:R()*6.28,om:7+R()*8,rot:(R()-.5)*.5,life:40,sh:.85+R()*.3}); }
  return; }
 if(fxk==='balloons'){
  if(b.kind==='sparks'||b.kind==='ring') return;
  const n=Math.max(2,Math.round(b.n*(b.kind==='cannon'?.26:.16)));
  for(let i=0;i<n;i++){ const x0=(.04+R()*.92)*W, vy=-(9+R()*8)*u, tp=.8+R()*1.5, t0=b.t0+(b.kind==='rain'?R()*b.dur:R()*.25), sz=(1.3+R()*.5)*Math.max(1,ps*.75)*u, c=BALL[(R()*BALL.length)|0], ph=R()*6.28, y0=H+3*u;
   const bp={fk:'bal',t0,x0,y0,vy,sz,c,ph,fq:1.1+R()*1,amp:(.5+R()*1)*u,life:tp};
   push(bp); const px=x0+Math.sin(ph+tp*bp.fq)*bp.amp, py=y0+vy*tp;   // место, где шарик лопнет
   for(let j=0;j<7;j++){ const a=R()*6.283, sp=(14+R()*26)*u; push({fk:'shred',t0:t0+tp,x0:px,y0:py,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-6*u,k:2.2+R()*1.2,g:(18+R()*10)*u,c,len:(.6+R()*.9)*sz,rot:R()*6.28,om:(R()-.5)*14,ph:R()*6.28,life:2.4}); } }
  return; }
 if(fxk==='cups'){
  if(b.kind==='sparks'||b.kind==='ring') return;
  const n=Math.max(2,Math.round(b.n*(b.kind==='cannon'?.2:.34)));
  for(let i=0;i<n;i++){ const cn=b.kind==='cannon', k=.9+R()*.4;
   push({fk:R()<.5?'cup':'hat',t0:b.t0+(cn?R()*.14:R()*b.dur),x0:cn?(b.side<0?(.04+R()*.3):(.66+R()*.3))*W:(.04+R()*.92)*W,y0:-(2+R()*(cn?5:14))*u,vx:cn?(b.side<0?1:-1)*(3+R()*9)*u:(R()-.5)*8*u,vy:(2+R()*6)*u,k,g:k*(15+R()*7)*u,sz:(2.1+R()*.6)*Math.max(1,ps*.8)*u,c:PAPER[(R()*PAPER.length)|0],c2:PAPER[(R()*PAPER.length)|0],rot0:R()*6.28,om:(R()-.5)*6,ph:R()*6.28,fq:1.2+R()*1.5,amp:(.8+R()*1.6)*u,life:9}); }
  return; }
 if(fxk==='dust'){
  if(b.kind==='cannon') return;
  if(b.kind==='sparks'){   // удар: облачко у плеч плашки и труха с её верха
   for(const sd of [-1,1]) push({fk:'puff',t0:b.t0+(sd>0?.03:0),x0:ctx.px+sd*ctx.pw*.46,y0:ctx.py-ctx.ph*.5,vx:sd*(2+R()*3)*u,vy:-(.5+R()*1.5)*u,r0:.8*u*ps,r1:(3+R()*1.6)*u*ps,life:1.7,a:.2+Math.min(.12,b.n/400)});
   const m=Math.round(b.n*1.8);
   for(let i=0;i<m;i++) push({fk:'mote',t0:b.t0+R()*.2,x0:ctx.px+(R()-.5)*ctx.pw*1.05,y0:ctx.py-ctx.ph*.5-(R()*1.5)*u,vx:(R()-.5)*8*u,vy:-(R()*6)*u,k:1.6+R()*1.2,g:(2.2+R()*2.4)*u*2,s:(.07+R()*.16)*Math.max(1,ps*.7)*u,ph:R()*6.28,fq:1.5+R()*2,amp:(.3+R()*.8)*u,life:2.8+R()*1.8});
   return; }
  const m=Math.round(b.n*2);   // rain: труха сыплется с потолка по всей ширине
  for(let i=0;i<m;i++) push({fk:'mote',t0:b.t0+R()*b.dur,x0:R()*W,y0:-(1+R()*8)*u,vx:(R()-.5)*5*u,vy:(1+R()*5)*u,k:.9+R()*.8,g:(1.6+R()*2.2)*u,s:(.07+R()*.18)*Math.max(1,ps*.7)*u,ph:R()*6.28,fq:1.4+R()*2,amp:(.4+R()*1)*u,life:6});
 } }

/* ---------------- рисование ---------------- */
const pos=(p,ti)=>{ const e=Math.exp(-p.k*ti); return [p.x0+p.vx*(1-e)/p.k, p.y0+(p.vy-p.g/p.k)*(1-e)/p.k+p.g/p.k*ti, Math.hypot(p.vx*e,(p.vy-p.g/p.k)*e+p.g/p.k)]; };

function drawStreamer(g,p,tau,ctx){
 const N=22, seg=p.len/N; let [hx,hy]=pos(p,tau), pts=[[hx+Math.sin(p.ph+tau*p.fq)*p.amp*clamp(tau/.5)*.0,hy]], ti=tau;
 for(let i=1;i<=N&&ti>0;i++){ const sp=pos(p,ti)[2]; ti-=clamp(seg/(sp+1),.004,.09); if(ti<0) break;   // шаги назад по времени обратно пропорциональны скорости: равные куски ленты
  const q=pos(p,ti), a=Math.min(1,i/4)*clamp(ti/.5);   // у головы лента ровная, дальше трепещет; в начале полёта (первые полсекунды) полоса ещё не размоталась и летит прямой
  pts.push([q[0]+Math.sin(p.ph+ti*p.fq+i*.07)*p.amp*a, q[1]+Math.cos(p.ph*1.7+ti*p.fq*.8+i*.1)*p.amp*.25*a]); }
 if(pts.length<2) return;
 g.lineCap='round'; g.lineJoin='round';
 for(let i=1;i<pts.length;i++){ const a=pts[i-1], b=pts[i], cs=Math.cos(p.ph2+i*p.tw+tau*1.7), w=p.w*(.3+.7*Math.abs(cs));
  g.strokeStyle=lit(p.c,(a[0]+b[0])/2,(a[1]+b[1])/2,ctx,cs>0?1:.74); g.lineWidth=Math.max(.7,w); g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.stroke(); } }

function drawTicket(g,p,tau,ctx){
 const [x,y]=pos(p,tau), sx=x+Math.sin(p.ph+tau*p.fq)*p.amp*(1-Math.exp(-p.k*tau)), sy=y;
 if(sy>ctx.H+3*ctx.u) return;
 const fl=Math.cos(p.fl0+tau*p.om*(1-.4*(1-Math.exp(-p.k*tau)))), rot=p.rot0+Math.sin(p.ph*1.3+tau*p.fq*.9)*p.ra, L=p.L, Wd=p.Wd, cs=Math.cos(rot), sn=Math.sin(rot), a=Math.abs(fl), n=Wd*.17;
 const col=fl>=0?p.front:p.back;   // лицевая сторона золотая, оборот темнее
 g.setTransform(ctx.dpr*cs,ctx.dpr*sn,-ctx.dpr*sn*Math.max(.12,a),ctx.dpr*cs*Math.max(.12,a),ctx.dpr*sx,ctx.dpr*sy);
 g.fillStyle=lit(col,sx,sy,ctx,fl>=0?1:.78);
 g.beginPath(); g.moveTo(-L/2,-Wd/2); g.lineTo(L/2,-Wd/2); g.lineTo(L/2,-n); g.arc(L/2,0,n,-Math.PI/2,Math.PI/2,true); g.lineTo(L/2,Wd/2); g.lineTo(-L/2,Wd/2); g.lineTo(-L/2,n); g.arc(-L/2,0,n,Math.PI/2,-Math.PI/2,true); g.closePath(); g.fill();   // концы с полукруглой выемкой — перфорация отрывного билета
 if(a>.3&&fl>0){ g.fillStyle=lit(p.back,sx,sy,ctx,.85); g.fillRect(-L*.36,-Wd*.3,L*.72,Wd*.1); g.fillRect(-L*.36,Wd*.2,L*(.28+.15*p.mark),Wd*.08); g.fillRect(L*.08,Wd*.2,L*.28,Wd*.08); }   // печатная полоса и строки
 g.setTransform(ctx.dpr,0,0,ctx.dpr,0,0); }

function fall(p,tau){ let t=tau, y=p.y0, v=p.vy, n=0;
 for(;;){ const a=.5*p.g, c=y-p.fl, th=c>=0?0:(-v+Math.sqrt(v*v-4*a*c))/(2*a);
  if(t<th) return {y:y+v*t+a*t*t,n,air:true};
  t-=th; v=-(v+p.g*th)*p.e; y=p.fl; n++;
  if(Math.abs(v)<p.g*.06||n>=5) return {y:p.fl,n,air:false}; } }
function drawCoin(g,p,tau,ctx){
 const s=fall(p,tau); let x=p.x0+p.vx*(1-Math.exp(-p.kx*tau))/p.kx; if(s.y<-3*ctx.u) return;
 const f=s.air?[0,.35,.6,.8,.9,.95][s.n]:1, spin=p.ph+p.om*tau*(s.air?1:Math.exp(-3*Math.max(0,tau-.1))), rx=p.r*(Math.abs(Math.cos(spin))*(1-f)+f), ry=p.r*(1-.58*f);
 const y=s.y, thick=p.r*.16*(1-f*.4);
 g.save(); g.translate(x,y); g.rotate(p.rot*f);
 g.fillStyle=lit(BRASS[1],x,y,ctx,p.sh); g.beginPath(); g.ellipse(0,thick,Math.max(.6,rx),ry,0,0,6.2832); g.fill();   // ребро
 g.fillStyle=lit(Math.cos(spin)>=0||f>.9?BRASS[0]:BRASS[1],x,y,ctx,p.sh); g.beginPath(); g.ellipse(0,0,Math.max(.6,rx),ry,0,0,6.2832); g.fill();   // лицо
 if(rx>p.r*.35){ g.strokeStyle=lit(BRASS[1],x,y,ctx,p.sh*.95); g.lineWidth=Math.max(.8,p.r*.09); g.beginPath(); g.ellipse(0,0,rx*.68,ry*.68,0,0,6.2832); g.stroke(); }   // чеканка по кругу
 g.restore(); }

function drawPuff(g,p,tau,ctx){
 const e=1-Math.pow(1-clamp(tau/p.life),2.2), r=p.r0+(p.r1-p.r0)*e, x=p.x0+p.vx*tau, y=p.y0+p.vy*tau+tau*tau*.9*ctx.u, a=p.a*Math.pow(1-clamp(tau/p.life),1.4)*(.5+.5*ctx.lamp);
 const gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,`rgba(176,160,128,${a})`); gr.addColorStop(1,'rgba(176,160,128,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,2*r,2*r); }
function drawMote(g,p,tau,ctx){
 const [x0,y0]=pos(p,tau), x=x0+Math.sin(p.ph+tau*p.fq)*p.amp, y=y0; if(y>ctx.H+ctx.u) return;
 const a=clamp(tau/.15)*clamp((p.life-tau)/.8)*(.3+.5*ctx.lamp); g.globalAlpha=a; g.fillStyle=lit([226,206,160],x,y,ctx,1); g.beginPath(); g.arc(x,y,Math.max(.7,p.s),0,6.2832); g.fill(); g.globalAlpha=1; }

function drawBal(g,p,tau,ctx){
 const x=p.x0+Math.sin(p.ph+tau*p.fq)*p.amp, y=p.y0+p.vy*tau, sz=p.sz*(tau<.12?.6+.4*tau/.12:1); if(y<-4*sz) return;
 g.strokeStyle=lit([150,140,118],x,y,ctx,.9); g.lineWidth=Math.max(.8,sz*.05); g.beginPath(); g.moveTo(x,y+sz*1.25); g.quadraticCurveTo(x+Math.sin(p.ph+tau*p.fq*1.6)*sz*.6,y+sz*2.2,x+Math.sin(p.ph+tau*p.fq*.9)*sz*.3,y+sz*3.4); g.stroke();   // нитка
 const col=lit(p.c,x,y,ctx,1); g.fillStyle=col; g.beginPath(); g.moveTo(x,y+sz*1.2); g.lineTo(x-sz*.13,y+sz*1.4); g.lineTo(x+sz*.13,y+sz*1.4); g.closePath(); g.fill();
 g.beginPath(); g.ellipse(x,y,sz*.86,sz*1.08,0,0,6.2832); g.fill();
 g.fillStyle='rgba(255,236,200,.14)'; g.beginPath(); g.ellipse(x-sz*.3,y-sz*.4,sz*.17,sz*.3,-.5,0,6.2832); g.fill(); }
function drawShred(g,p,tau,ctx){
 const [x,y]=pos(p,tau), a=clamp((p.life-tau)/.8); if(y>ctx.H+ctx.u||a<=0) return; const r=p.rot+p.om*tau, l=p.len;
 g.save(); g.translate(x,y); g.rotate(r); g.globalAlpha=a; g.fillStyle=lit(p.c,x,y,ctx,.9); g.beginPath(); g.moveTo(-l,0); g.quadraticCurveTo(0,-l*.5*Math.cos(p.ph+tau*8),l,l*.1); g.quadraticCurveTo(0,l*.18,-l,0); g.fill(); g.restore(); }
function drawCup(g,p,tau,ctx){
 const [x0,y]=pos(p,tau), x=x0+Math.sin(p.ph+tau*p.fq)*p.amp*(1-Math.exp(-p.k*tau)); if(y>ctx.H+3*ctx.u) return; const s=p.sz, r=p.rot0+p.om*tau;
 g.save(); g.translate(x,y); g.rotate(r);
 if(p.fk==='cup'){ const w1=s*.62, w2=s*.4, h=s*.95;   // стаканчик: усечённый конус, ободок, полоса
  g.fillStyle=lit(p.c,x,y,ctx,1); g.beginPath(); g.moveTo(-w1,-h/2); g.lineTo(w1,-h/2); g.lineTo(w2,h/2); g.lineTo(-w2,h/2); g.closePath(); g.fill();
  g.fillStyle=lit([212,199,166],x,y,ctx,1); g.beginPath(); g.moveTo(-w1*.93,-h*.12); g.lineTo(w1*.93,-h*.12); g.lineTo(w1*.84,h*.12); g.lineTo(-w1*.84,h*.12); g.closePath(); g.fill();
  g.fillStyle=lit([60,40,30],x,y,ctx,1); g.beginPath(); g.ellipse(0,-h/2,w1,s*.13,0,0,6.2832); g.fill(); }
 else { const w=s*.55, h=s*1.25;   // колпак: конус, полоса, помпон
  g.fillStyle=lit(p.c,x,y,ctx,1); g.beginPath(); g.moveTo(-w,h/2); g.lineTo(0,-h/2); g.lineTo(w,h/2); g.closePath(); g.fill();
  g.fillStyle=lit(p.c2,x,y,ctx,.95); g.beginPath(); g.moveTo(-w*.64,h*.12); g.lineTo(w*.64,h*.12); g.lineTo(w*.76,h*.3); g.lineTo(-w*.76,h*.3); g.closePath(); g.fill();
  g.fillStyle=lit([212,199,166],x,y,ctx,1); g.beginPath(); g.arc(0,-h/2,s*.12,0,6.2832); g.fill(); }
 g.restore(); }

function draw(g,p,tau,ctx){
 if(p.fk==='bal') return drawBal(g,p,tau,ctx); if(p.fk==='shred') return drawShred(g,p,tau,ctx); if(p.fk==='cup'||p.fk==='hat') return drawCup(g,p,tau,ctx);
 if(p.fk==='str') drawStreamer(g,p,tau,ctx); else if(p.fk==='tk') drawTicket(g,p,tau,ctx); else if(p.fk==='coin') drawCoin(g,p,tau,ctx); else if(p.fk==='puff') drawPuff(g,p,tau,ctx); else if(p.fk==='mote') drawMote(g,p,tau,ctx); }

window.BigWinFx={variants:VARIANTS,names:NAMES,def:DEF,mode,opt,groups:GROUPS,keys:KEY,spawn,draw};
})();
