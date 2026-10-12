// Blackout Party — подсветка выигрыша: четыре новых варианта (2026-10-12, ветка fb/hl-variants).
// Отзыв тестера: «выделение символов при сыгровке не в тему». Прежний вид «Камера» (янтарные уголки + серые остальные, ui.js hlCell/glow) остаётся: `?hl=cam`, по умолчанию, пока владелец не выберет.
// Варианты (адрес ?hl=… главнее; иначе выбор в тест-панели или в «Экраны макета → Подсветка выигрыша» — sessionStorage 'bp-hl'; действует со следующего выигрыша, без перезагрузки):
//   bulbs — «Лампочки»: афишная рамка из тёплых лампочек вокруг группы; один раз пробегает по кругу и дальше горит. Соседние клетки сливаются в один контур.
//   spot  — «Прожектор»: поле гаснет (блэкаут), на каждый выигравший символ сверху падает тёплый луч с пылью и пятном света на скатерти.
//   neon  — «Неон»: янтарная трубка с красноватым ореолом по контуру группы, вспыхивает с коротким морганием, как настоящая.
//   none  — «Без выделения» (как в Sweet Bonanza и Gates of Olympus): ни рамки, ни затемнения — поле остаётся светлым; выигравшие символы на миг оживают (1,0 → 1,08 → 1,0 с лёгким покачиванием), за ними тёплое свечение.
//   pop   — «Хлопок»: рамки нет; выигравшие символы коротко «подпрыгивают» (сплющились — вытянулись — встали), конфетти и серпантин в цветах вечеринки, под символом тёплое пятно.
// Как это встроено: ui.js glow(cells,on) зовёт bpHl.show(вариант,cells) и bpHl.clear(); hlRelease(cells) зовёт bpHl.release(cells) — уход («хват» перед тем, как Рокко заберёт символы).
// Символы остаются на месте; приглушение остальных и яркость выигравших — фильтры в hl.css (во всех состояниях тот же список функций grayscale saturate contrast brightness drop-shadow: иначе переход щёлкает, а не плавится).
// Движение: только transform и opacity на слоях размером с группу/клетку (без перерисовки поля); время — anim() из ui.js (K(): Turbo/Quick короче, «меньше движения» — сразу итоговый вид, пропуск — доводит до конца),
// кривые — smooth:true (smoothKF). Итоговая картинка — обычные стили слоёв, анимации только «из» (fill backwards), поэтому при K()=0 остаётся готовый вид (у конфетти итог — пусто).
(()=>{
'use strict';
const NAMES=['none','dim','lamp','stamp','lift','breath','shade','dimjump','lampdim']; // выбор в тест-панели и меню: только чистые (владелец 2026-10-12: «нейрослопов не было во всех вариантах»)
const LEGACY=['cam','bulbs','spot','neon','pop']; // сняты с выбора: рамки/уголки, неон, лучи с пылью, конфетти читаются как нейрослоп; работают только по адресу ?hl=… для сравнения
const NODIM=['none','stamp','lift','breath']; // варианты, где ui.js glow() не ставит .dim остальным
const LABEL={cam:'Камера: янтарные уголки (основной)',bulbs:'Лампочки: бегут по кругу и горят',spot:'Прожектор: блэкаут и луч на символ',neon:'Неон: трубка вспыхивает по контуру',pop:'Хлопок: символы прыгают, конфетти',none:'Без выделения: поле светлое, выигравшие оживают',dim:'Дим: остальные тускнеют, выигравшие приседают',lamp:'Лампа: тёплое пятно света под выигравшими',stamp:'Штамп: выигравшие прыгают слева направо',lift:'Подъём: символ приподнимается, под ним тень',breath:'Вдох: символ раз плавно увеличивается (основной)',shade:'Тень: остальные чуть темнее, без серого',dimjump:'Дим + Прыжок: остальные тускнеют, выигравшие прыгают',lampdim:'Лампа + Дим: пятно света и тусклые остальные'};
const KEY='bp-hl';
const ssGet=()=>{ try{ return sessionStorage.getItem(KEY); }catch(e){ return null; } };
const ssSet=v=>{ try{ sessionStorage.setItem(KEY,v); }catch(e){} };
const fromUrl=()=>{ let v=null; try{ v=(typeof q!=='undefined'&&q&&q.get)?q.get('hl'):null; }catch(e){} if(!v){ try{ v=new URLSearchParams(location.search).get('hl'); }catch(e){} } return (NAMES.includes(v)||LEGACY.includes(v))?v:null; };
const mode=()=>fromUrl()||(NAMES.includes(ssGet())?ssGet():'breath'); // по умолчанию «Без выделения» (владелец 2026-10-12: как у Sweet Bonanza/Gates — рамок нет, символ сам вспыхивает, Рокко забирает)
const apply=()=>{ try{ document.documentElement.dataset.hl=mode(); }catch(e){} }; // html[data-hl] — по нему hl.css подбирает яркость выигравших и приглушение остальных
apply();

const X=()=>(window.bpHlCtx?window.bpHlCtx():null);
const f2=n=>(+n).toFixed(2);
const mulberry=seed=>{ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
const lerp=(a,b,t)=>a+(b-a)*t;
let RUN=null; // {v, exits:[], rel:false, done:Promise}

// ---------- общие определения (градиенты и размытия, один раз на страницу) ----------
function defs(){
 if(document.getElementById('hl-defs2')) return;
 document.body.insertAdjacentHTML('afterbegin',`<svg id="hl-defs2" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
 <radialGradient id="hlg-bulb"><stop offset="0" stop-color="#FFC861" stop-opacity=".62"/><stop offset=".42" stop-color="#FFA23C" stop-opacity=".22"/><stop offset="1" stop-color="#FF9030" stop-opacity="0"/></radialGradient>
 <radialGradient id="hlg-pool"><stop offset="0" stop-color="#FFD684" stop-opacity=".72"/><stop offset=".5" stop-color="#FFB448" stop-opacity=".28"/><stop offset="1" stop-color="#FFB040" stop-opacity="0"/></radialGradient>
 <radialGradient id="hlg-warm"><stop offset="0" stop-color="#FFD58A" stop-opacity=".24"/><stop offset=".6" stop-color="#FFC060" stop-opacity=".1"/><stop offset="1" stop-color="#FFC060" stop-opacity="0"/></radialGradient>
 <linearGradient id="hlg-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC25A" stop-opacity="0"/><stop offset=".5" stop-color="#FFC25A" stop-opacity=".17"/><stop offset="1" stop-color="#FFCB70" stop-opacity=".34"/></linearGradient>
 <filter id="hlf-soft" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation=".55"/></filter>
 <filter id="hlf-n1" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation=".62"/></filter>
 <filter id="hlf-n2" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="1.7"/></filter>
 </defs></svg>`); }

// ---------- геометрия: клетки выигрыша в «u» (1u = 1% ширины поля), группы по соседству, контуры ----------
function geo(cells,C){
 const {GEO,COLS,ROWS,AR}=C, idx=[...new Set(cells.map(([r,c])=>r*COLS+c))].sort((a,b)=>a-b), S=new Set(idx);
 const rect=i=>{ const g=GEO.cs[i]; return {x:g.l,y:g.t*AR,w:g.w,h:g.h*AR}; };
 const seen=new Set(), clusters=[];
 for(const i0 of idx){ if(seen.has(i0)) continue; const st=[i0], mem=[]; seen.add(i0);
  while(st.length){ const i=st.pop(); mem.push(i); const r=(i/COLS)|0, c=i%COLS;
   for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const rr=r+dr, cc=c+dc; if(rr<0||rr>=ROWS||cc<0||cc>=COLS) continue; const j=rr*COLS+cc; if(S.has(j)&&!seen.has(j)){ seen.add(j); st.push(j); } } }
  mem.sort((a,b)=>a-b); clusters.push({idx:mem}); }
 const g0=GEO.cs[0], gl=GEO.cs[COLS-1];
 return {idx,rect,clusters,COLS,ROWS,AR,grid:{x:GEO.L0,y:GEO.T0*AR,w:GEO.Wd,h:GEO.Ht*AR},cw:g0.w,ch:g0.h*AR,gapx:(GEO.cs[1].l-(g0.l+g0.w)),last:gl}; }

// контур группы клеток: замкнутые ломаные (по часовой), сдвинутые внутрь на inset; соседние клетки сливаются (прямые участки через зазор склеены)
function loopsOf(cl,G,inset){
 const {COLS,ROWS,rect}=G, S=new Set(cl.idx), has=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS&&S.has(r*COLS+c), E=[];
 for(const i of cl.idx){ const r=(i/COLS)|0, c=i%COLS, b=rect(i);
  if(!has(r-1,c)) E.push({ax:c,ay:r,bx:c+1,by:r,o:'h',k:b.y+inset});
  if(!has(r,c+1)) E.push({ax:c+1,ay:r,bx:c+1,by:r+1,o:'v',k:b.x+b.w-inset});
  if(!has(r+1,c)) E.push({ax:c+1,ay:r+1,bx:c,by:r+1,o:'h',k:b.y+b.h-inset});
  if(!has(r,c-1)) E.push({ax:c,ay:r+1,bx:c,by:r,o:'v',k:b.x+inset}); }
 const from=new Map(); for(const e of E){ const k=e.ax+','+e.ay; if(!from.has(k)) from.set(k,[]); from.get(k).push(e); }
 const used=new Set(), res=[];
 for(const e0 of E){ if(used.has(e0)) continue; const loop=[]; let e=e0;
  while(e&&!used.has(e)){ used.add(e); loop.push(e);
   const cand=(from.get(e.bx+','+e.by)||[]).filter(x=>!used.has(x)||x===e0); let nx=null;
   if(cand.length===1) nx=cand[0]; else if(cand.length>1){ const dx=e.bx-e.ax, dy=e.by-e.ay; nx=cand.find(x=>dx*(x.by-x.ay)-dy*(x.bx-x.ax)>0)||cand[0]; } // место, где две клетки касаются углом: поворачиваем направо, чтобы петли не склеились
   if(!nx||nx===e0) break; e=nx; }
  const V=[]; for(let i=0;i<loop.length;i++){ const a=loop[i], b=loop[(i+1)%loop.length]; if(a.o===b.o) continue; V.push(a.o==='h'?{x:b.k,y:a.k}:{x:a.k,y:b.k}); }
  if(V.length<3) continue;
  let m=0; V.forEach((p,i)=>{ if(p.y<V[m].y-1e-6||(Math.abs(p.y-V[m].y)<1e-6&&p.x<V[m].x)) m=i; }); res.push(V.slice(m).concat(V.slice(0,m))); } // старт — верхний левый угол: по группам бег идёт с него по часовой
 return res; }

// скруглённая ломаная: путь SVG и плотные точки вдоль него
function rounded(V,R){
 const n=V.length, A=[], B=[];
 for(let i=0;i<n;i++){ const p0=V[(i+n-1)%n], p1=V[i], p2=V[(i+1)%n], l1=Math.hypot(p1.x-p0.x,p1.y-p0.y)||1, l2=Math.hypot(p2.x-p1.x,p2.y-p1.y)||1, r=Math.min(R,l1/2,l2/2);
  A.push({x:p1.x+(p0.x-p1.x)/l1*r,y:p1.y+(p0.y-p1.y)/l1*r}); B.push({x:p1.x+(p2.x-p1.x)/l2*r,y:p1.y+(p2.y-p1.y)/l2*r}); }
 let d=`M${f2(B[0].x)} ${f2(B[0].y)}`; const pts=[B[0]];
 for(let k=1;k<=n;k++){ const i=k%n; d+=`L${f2(A[i].x)} ${f2(A[i].y)}Q${f2(V[i].x)} ${f2(V[i].y)} ${f2(B[i].x)} ${f2(B[i].y)}`; pts.push(A[i]);
  for(let t=1;t<6;t++){ const s=t/6, a=(1-s)*(1-s), b=2*(1-s)*s, c=s*s; pts.push({x:a*A[i].x+b*V[i].x+c*B[i].x,y:a*A[i].y+b*V[i].y+c*B[i].y}); } pts.push(B[i]); }
 const cum=[0]; for(let i=1;i<pts.length;i++) cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));
 const len=cum[cum.length-1];
 const at=s=>{ s=Math.max(0,Math.min(len,s)); let i=1; while(i<cum.length-1&&cum[i]<s) i++; const seg=(cum[i]-cum[i-1])||1, t=(s-cum[i-1])/seg, dx=pts[i].x-pts[i-1].x, dy=pts[i].y-pts[i-1].y; return {x:pts[i-1].x+dx*t,y:pts[i-1].y+dy*t,a:Math.atan2(dy,dx)}; };
 return {d:d+'Z',len,at}; }

const bbox=(vs,m)=>{ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const p of vs){ x0=Math.min(x0,p.x); y0=Math.min(y0,p.y); x1=Math.max(x1,p.x); y1=Math.max(y1,p.y); } return {x:x0-m,y:y0-m,w:x1-x0+2*m,h:y1-y0+2*m}; };

// ---------- слои ----------
const place=(r,AR,o)=>{ o=o||{x:0,y:0,w:100,h:100*AR}; return `left:${f2((r.x-o.x)/o.w*100)}%;top:${f2((r.y-o.y)/o.h*100)}%;width:${f2(r.w/o.w*100)}%;height:${f2(r.h/o.h*100)}%`; };
const svg=(r,inner)=>`<svg viewBox="${f2(r.x)} ${f2(r.y)} ${f2(r.w)} ${f2(r.h)}" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`;
function host(layer,cls){ let w=layer.querySelector(cls?':scope>.hlv.'+cls:':scope>.hlv:not(.clip)'); if(!w){ w=document.createElement('div'); w.className='hlv'+(cls?' '+cls:''); layer.append(w); } return w; }
function node(h,cls,style,html){ const d=document.createElement('div'); d.className=cls; d.style.cssText=style; if(html) d.innerHTML=html; h.append(d); return d; }
const clipHost=(layer,G)=>{ const w=host(layer,'clip'); w.style.cssText=place(G.grid,G.AR); return w; }; // слой по размеру проёма поля, края обрезают лучи и пыль

// ---------- общее: затемнение поля ----------
function veil(ctx,R,G,hu,alpha,ms){ const w=clipHost(hu,G), v=node(w,'hlveil','left:0;top:0;width:100%;height:100%;background:rgb(7 3 2 / '+alpha+')');
 ctx.anim(v,[{opacity:0},{opacity:1}],{duration:ms||320,easing:'ease-out',fill:'backwards'}); // затемнение входит плавно; итог — обычный стиль слоя
 R.exits.push(()=>ctx.anim(v,[{opacity:1},{opacity:0}],{duration:ms?ms*.85:260,delay:60,easing:'ease-in',fill:'forwards'})); return v; }

// ---------- «Лампочки» ----------
// По одному холсту на группу (размером с её рамку, а не с поле): пока лампочки зажигаются (~0,5 с), холст перерисовывается по кадрам, дальше стоит неподвижно — ни одного слоя размером с поле.
// Ход времени — анимация-часы на пустом элементе (anim из ui.js: Turbo/Quick короче, пропуск доводит её до конца, «меньше движения» — сразу итог), по ней же считается, какие лампочки уже горят.
const BULB_CH=520, BULB_PULSE=240, BULB_T0=70, BULB_TOTAL=BULB_T0+BULB_CH+BULB_PULSE;
const sstep=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const bulbA=x=>x<=0?0:x>=1?1:x<.4?sstep(x/.4):x<.72?1-.2*sstep((x-.4)/.32):.8+.2*sstep((x-.72)/.28); // вспыхнула, чуть притухла, осела (непрерывно, без изломов)
function showBulbs(C,G,R,hu,hx,s){
 const rb=.64*s, step=2.75*s, f=document.getElementById('field'), pxu=(f.clientWidth||600)/100, dpr=Math.min(2,window.devicePixelRatio||1), k=pxu*dpr;
 const cvs=[], draws=[];
 for(const cl of G.clusters){ const loops=loopsOf(cl,G,.9*s); if(!loops.length) continue; const bulbs=[], rails=[], vs=[];
  for(const V of loops){ const P=rounded(V,3.1*s), n=Math.max(8,Math.round(P.len/step)); vs.push(...V); rails.push(P.d);
   for(let j=0;j<n;j++){ const p=P.at(j*P.len/n); bulbs.push({x:p.x,y:p.y,t:BULB_T0+j/n*BULB_CH}); } }
  const U=bbox(vs,3.4*s), cw=Math.max(1,Math.ceil(U.w*k)), ch=Math.max(1,Math.ceil(U.h*k)), cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; cv.className='hlb'; cv.style.cssText=place(U,G.AR); hx.append(cv); cvs.push(cv);
  const base=document.createElement('canvas'); base.width=cw; base.height=ch; { const g=base.getContext('2d'); g.lineJoin='round'; g.setTransform(k,0,0,k,-U.x*k,-U.y*k); // рельса и гнёзда (лампочки погашены)
   for(const d of rails){ const P2=new Path2D(d); g.strokeStyle='rgba(9,4,2,.78)'; g.lineWidth=1.55*s; g.stroke(P2); g.strokeStyle='rgba(201,138,44,.42)'; g.lineWidth=.16*s; g.stroke(P2); }
   g.fillStyle='#2a190b'; g.strokeStyle='rgba(255,200,97,.32)'; g.lineWidth=.12*s; for(const b of bulbs){ g.beginPath(); g.arc(b.x,b.y,rb*.9,0,6.2832); g.fill(); g.stroke(); } }
  const R3=rb*3.3*k, sz=Math.ceil(R3*2)+2, lit=document.createElement('canvas'); lit.width=lit.height=sz; { const g=lit.getContext('2d'), c=sz/2, gr=g.createRadialGradient(c,c,0,c,c,R3); // лампочка: ореол, тело, блик
   gr.addColorStop(0,'rgba(255,200,97,.62)'); gr.addColorStop(.42,'rgba(255,162,60,.22)'); gr.addColorStop(1,'rgba(255,144,48,0)'); g.fillStyle=gr; g.beginPath(); g.arc(c,c,R3,0,6.2832); g.fill();
   g.fillStyle='#FFC861'; g.beginPath(); g.arc(c,c,rb*k,0,6.2832); g.fill(); g.fillStyle='#FFF3D2'; g.beginPath(); g.arc(c-rb*.12*k,c-rb*.14*k,rb*.46*k,0,6.2832); g.fill(); }
  const ctx2=cv.getContext('2d'), pts=bulbs.map(b=>({x:(b.x-U.x)*k-sz/2,y:(b.y-U.y)*k-sz/2,t:b.t}));
  draws.push(T=>{ ctx2.clearRect(0,0,cw,ch); ctx2.drawImage(base,0,0); for(const p of pts){ const a=bulbA((T-p.t)/BULB_PULSE); if(a<.004) continue; ctx2.globalAlpha=a; ctx2.drawImage(lit,p.x,p.y); } ctx2.globalAlpha=1; }); }
 const drawAll=T=>{ for(const d of draws) d(T); }; drawAll(0);
 const clock=document.createElement('i'); clock.style.cssText='left:0;top:0;width:0;height:0'; hx.append(clock);
 const A=C.animA(clock,[{opacity:1},{opacity:1}],{duration:BULB_TOTAL,fill:'forwards'});
 if(!A) drawAll(BULB_TOTAL); // «меньше движения»: сразу итог
 else { const dur=A.effect.getTiming().duration||BULB_TOTAL, tick=()=>{ if(!clock.isConnected) return; const T=Math.min(BULB_TOTAL,(A.currentTime||0)*BULB_TOTAL/dur); drawAll(T); if(T<BULB_TOTAL&&A.playState!=='finished') requestAnimationFrame(tick); else drawAll(BULB_TOTAL); }; requestAnimationFrame(tick); }
 R.exits.push(()=>cvs.map((n,i)=>C.anim(n,[{opacity:1},{opacity:0}],{duration:190,delay:i*12,easing:'ease-in',fill:'forwards'})));
 veil(C,R,G,hu,.34,300); }

// ---------- «Неон» ----------
const FLICK=[ // кадры моргания трубки (яркость): у соседних групп разные, чтобы не мигали в такт
 [[0,0],[.1,0],[.15,.7],[.24,.12],[.35,.6],[.43,.18],[.57,.95],[.68,.72],[.83,1],[1,1]],
 [[0,0],[.14,0],[.19,.5],[.27,.08],[.4,.82],[.48,.3],[.6,.65],[.74,1],[.88,.9],[1,1]],
 [[0,0],[.08,0],[.12,.36],[.2,.04],[.3,.88],[.38,.4],[.5,.2],[.62,.92],[.78,.78],[1,1]]];
function showNeon(C,G,R,hu,hx,s){
 const gl=2.1*s, cap=.78*s; let j=0; const els=[];
 for(const cl of G.clusters){ const L=loopsOf(cl,G,.8*s); if(!L.length) continue; let all=[], inner='', caps='';
  for(const V of L){ const P=rounded(V,3*s); all.push(...V); const g=Math.round(gl/P.len*1000), da=`stroke-dasharray="${1000-g} ${g}" pathLength="1000"`;
   inner+=`<g filter="url(#hlf-n2)"><path d="${P.d}" fill="none" stroke="#D4452B" stroke-opacity=".55" stroke-width="${f2(4.6*s)}" stroke-linecap="round" ${da}/></g>`+
    `<g filter="url(#hlf-n1)"><path d="${P.d}" fill="none" stroke="#FF9A3A" stroke-opacity=".7" stroke-width="${f2(2.1*s)}" stroke-linecap="round" ${da}/></g>`+
    `<path d="${P.d}" fill="none" stroke="#FFC861" stroke-width="${f2(1.05*s)}" stroke-linecap="round" ${da}/><path d="${P.d}" fill="none" stroke="#FFF2D2" stroke-width="${f2(.44*s)}" stroke-linecap="round" ${da}/>`;
   for(const [sp,dir] of [[0,-1],[P.len-gl,1]]){ const p=P.at(sp), tx=Math.cos(p.a)*dir, ty=Math.sin(p.a)*dir; // электрод: тёмный колпачок на концах трубки
    caps+=`<line x1="${f2(p.x)}" y1="${f2(p.y)}" x2="${f2(p.x+tx*cap)}" y2="${f2(p.y+ty*cap)}" stroke="#1a0e06" stroke-width="${f2(1.25*s)}"/><line x1="${f2(p.x+tx*cap)}" y1="${f2(p.y+ty*cap)}" x2="${f2(p.x+tx*(cap+.18*s))}" y2="${f2(p.y+ty*(cap+.18*s))}" stroke="#8a5a1c" stroke-width="${f2(1.25*s)}"/>`; } }
  const U=bbox(all,5.4*s), n=node(hx,'hln',place(U,G.AR),svg(U,inner+caps)); els.push(n);
  const pat=FLICK[j%FLICK.length]; C.anim(n,pat.map(([o,v])=>({opacity:v,offset:o})),{duration:620,delay:j*Math.min(45,330/G.clusters.length)+40,easing:'linear',fill:'backwards',smooth:44}); j++; }
 R.exits.push(()=>els.map((n,i)=>C.anim(n,[{opacity:1},{opacity:.5,offset:.3},{opacity:.85,offset:.5},{opacity:.12,offset:.78},{opacity:0}],{duration:240,delay:i*10,easing:'linear',fill:'forwards',smooth:true})));
 veil(C,R,G,hu,.42,320); }

// ---------- «Прожектор» ----------
function showSpot(C,G,R,hu,hx,s){
 const w=clipHost(hx,G), O=G.grid, rnd=mulberry(7+G.idx.length*31+G.idx[0]), beams=[], motes=[[]];
 veil(C,R,G,hu,.66,380);
 let k=0; const gap=Math.min(45,330/G.idx.length);
 for(const i of G.idx){ const c=G.rect(i), xm=c.x+c.w/2, yTop=c.y-1.0*c.h, yb=c.y+.74*c.h, B={x:c.x-.5*c.w,y:yTop-.1*c.h,w:2*c.w,h:2.2*c.h};
  const poly=`${f2(xm-.12*c.w)},${f2(yTop)} ${f2(xm+.12*c.w)},${f2(yTop)} ${f2(xm+.58*c.w)},${f2(yb)} ${f2(xm-.58*c.w)},${f2(yb)}`;
  const el=node(w,'hls',place(B,G.AR,O),svg(B,`<polygon points="${poly}" fill="url(#hlg-beam)" filter="url(#hlf-soft)"/><ellipse cx="${f2(xm)}" cy="${f2(c.y+.8*c.h)}" rx="${f2(.74*c.w)}" ry="${f2(.2*c.h)}" fill="url(#hlg-pool)"/><circle cx="${f2(xm)}" cy="${f2(c.y+.5*c.h)}" r="${f2(.66*c.w)}" fill="url(#hlg-warm)"/>`));
  beams.push(el); C.anim(el,[{opacity:0,transform:'scaleY(.55)'},{opacity:1,transform:'scaleY(1.02)',offset:.34},{opacity:.84,transform:'scaleY(1)',offset:.62},{opacity:1,transform:'scaleY(1)'}],{duration:420,delay:110+k*gap,easing:'linear',fill:'backwards',smooth:true});
  for(let m=0;m<5;m++){ const t=Math.pow(rnd(),.9), y=Math.max(O.y+.4,lerp(yTop,c.y+.74*c.h,t)), hw=lerp(.12,.58,(y-yTop)/(yb-yTop))*c.w, x=xm+(rnd()*2-1)*hw*.82;
   motes[0].push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2((.1+rnd()*.14)*s)}" fill="#FFE8B6" fill-opacity="${f2(.45+rnd()*.5)}"/>`); }
  k++; }
 const dust=motes.map((m,n)=>{ const d=node(w,'hld','left:0;top:0;width:100%;height:100%',svg(O,m.join(''))); // пыль в луче: один слой пылинок медленно плывёт вверх, без перерисовки — только transform
  C.anim(d,[{opacity:0,transform:'translateY(0%)'},{opacity:1,transform:'translateY(-1.9%)',offset:.3},{opacity:1,transform:'translateY(-4.6%)'}],{duration:2400,delay:200,easing:'linear',fill:'both',smooth:true}); return d; });
 R.exits.push(()=>[...beams.map((n,i)=>C.anim(n,[{opacity:1},{opacity:0}],{duration:190,delay:i*8,easing:'ease-in',fill:'forwards'})),...dust.map(d=>C.anim(d,[{opacity:1},{opacity:0}],{duration:170,easing:'ease-in',fill:'forwards'}))]); }

// ---------- «Хлопок» ----------
const CONF=['#FFC861','#D8CBA8','#C2452F','#E6A23C','#F2E2B4']; // янтарь, кремовый, ржаво-красный (светлее для тёмного фона), золото, бумага: цвета вечеринки из DESIGN.md
function burst(rnd,s,cnt){ let h=''; const n=Math.max(6,Math.min(12,Math.round(120/cnt)))+((rnd()*2)|0), ns=cnt>12?1:2; // чем больше выигравших клеток, тем меньше конфетти на каждую (всего ~100 штук)
 // размеры — в единицах viewBox (100 ед. = 2,1 клетки ≈ 30u): 4–8 ед. ≈ 1,2–2,4u
 for(let i=0;i<n;i++){ const a=(i/n+rnd()*.07)*Math.PI*2, r=17+rnd()*28, x=Math.cos(a)*r, y=Math.sin(a)*r, w=(4+rnd()*4.2)*s, hh=(1.9+rnd()*1.7)*s, rot=rnd()*180;
  h+=`<rect x="${f2(x-w/2)}" y="${f2(y-hh/2)}" width="${f2(w)}" height="${f2(hh)}" rx=".5" fill="${CONF[(rnd()*CONF.length)|0]}" transform="rotate(${f2(rot)} ${f2(x)} ${f2(y)})"/>`; }
 for(let i=0;i<ns;i++){ const a=(i/ns+rnd()*.2+.08)*Math.PI*2, r=13+rnd()*14, x=Math.cos(a)*r, y=Math.sin(a)*r, L=15+rnd()*8, sg=rnd()<.5?-1:1, am=3.6*s; // серпантин: тонкая волнистая лента
  h+=`<path d="M0 0c${f2(L*.18)} ${f2(-am*sg)} ${f2(L*.34)} ${f2(am*sg)} ${f2(L*.5)} 0s${f2(L*.32)} ${f2(-am*sg)} ${f2(L*.5)} 0" fill="none" stroke="${i%2?'#FFC861':'#C2452F'}" stroke-width="${f2(1.5*s)}" stroke-linecap="round" transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(a*180/Math.PI+rnd()*50-25)})"/>`; }
 return `<svg viewBox="-50 -50 100 100" preserveAspectRatio="none" aria-hidden="true">${h}</svg>`; }
const POP=[{transform:'translateY(0%) scale(1,1)',offset:0},{transform:'translateY(3%) scale(1.2,.82)',offset:.17},{transform:'translateY(-9%) scale(.88,1.2)',offset:.4},{transform:'translateY(0%) scale(1.08,.94)',offset:.62},{transform:'translateY(-1%) scale(.985,1.025)',offset:.8},{transform:'translateY(0%) scale(1,1)',offset:1}];
function showPop(C,G,R,hu,hx,s){
 const gap=Math.min(45,330/G.idx.length), glows=[]; let k=0;
 veil(C,R,G,hu,.2,300);
 for(const i of G.idx){ const c=G.rect(i), cx=c.x+c.w/2, cy=c.y+c.h/2, d=k*gap, rnd=mulberry(1000+i*17+G.idx.length);
  const g=node(hu,'hlp','',''); g.style.cssText=place({x:c.x-.35*c.w,y:c.y-.3*c.h,w:1.7*c.w,h:1.6*c.h},G.AR); glows.push(g); // мягкое тёплое пятно под символом
  C.anim(g,[{opacity:0,transform:'scale(.55)'},{opacity:1,transform:'scale(1.06)',offset:.55},{opacity:.9,transform:'scale(1)'}],{duration:460,delay:d,easing:'linear',fill:'backwards',smooth:true});
  if(G.idx.length<=10||k%2===0){ const b=node(hx,'hlk',place({x:cx-1.05*c.w,y:cy-1.05*c.h,w:2.1*c.w,h:2.1*c.h},G.AR),burst(rnd,s,G.idx.length)); // конфетти — один слой на клетку (при больше 10 выигравших — на каждой второй): разлетается и гаснет (итог без анимации — пусто)
  C.anim(b,[{opacity:0,transform:'translateY(0%) scale(.4) rotate(0deg)'},{opacity:1,transform:'translateY(1%) scale(.62) rotate(-2deg)',offset:.1},{opacity:1,transform:'translateY(2%) scale(.98) rotate(-5deg)',offset:.5},{opacity:0,transform:'translateY(6%) scale(1.16) rotate(-9deg)'}],{duration:780,delay:d+110,easing:'linear',fill:'both',smooth:true}).then(()=>{ if(b.isConnected) b.style.opacity='0'; }); }
  const o=C.BOARD[(i/G.COLS)|0]&&C.BOARD[(i/G.COLS)|0][i%G.COLS], sp=o&&o.sp; // хлопок двигает клетку целиком (.sp — уже свой композитный слой, у картинки внутри идёт переход фильтра: transform на ней перерисовывал бы её каждый кадр)
  if(sp&&sp.isConnected){ sp.style.transformOrigin='50% 87%'; C.anim(sp,POP,{duration:560,delay:d,easing:'linear',smooth:22}).then(()=>{ sp.style.transformOrigin=''; }); } // сплющился, вытянулся, встал (те же smoothKF, что у посадки)
  k++; }
 R.exits.push(()=>glows.map((n,i)=>C.anim(n,[{opacity:.9},{opacity:0}],{duration:200,delay:i*6,easing:'ease-in',fill:'forwards'}))); }

// ---------- «Без выделения» ----------
// Поле не темнеет (в ui.js glow() не ставит .dim для этого варианта), рамок и слоя затемнения нет. Выигравшие: короткий всплеск 1,0 → 1,08 → 1,0 с лёгким покачиванием и тёплое свечение за ними (оно потом приглушается и держится до ухода).
const BUMP=[{transform:'scale(1) rotate(0deg)',offset:0},{transform:'scale(1.08) rotate(-1.3deg)',offset:.3},{transform:'scale(1.03) rotate(1deg)',offset:.55},{transform:'scale(1.005) rotate(-.4deg)',offset:.8},{transform:'scale(1) rotate(0deg)',offset:1}];
function showNone(C,G,R,hu,hx,s){
 const gap=Math.min(45,330/G.idx.length); let k=0;
 for(const i of G.idx){ const c=G.rect(i), d=k*gap;
  const o=C.BOARD[(i/G.COLS)|0]&&C.BOARD[(i/G.COLS)|0][i%G.COLS], sp=o&&o.sp; // всплеск двигает клетку целиком (.sp — свой композитный слой)
  if(sp&&sp.isConnected){ sp.style.transformOrigin='50% 58%'; C.anim(sp,BUMP,{duration:440,delay:d,easing:'linear',smooth:20}).then(()=>{ sp.style.transformOrigin=''; }); }
  k++; }
 }


// ---------- Чистые варианты без рамок и бликов (владелец 2026-10-12: «подсветку без нейрослопа») ----------
// Как у студий (Pragmatic, Hacksaw, Nolimit): двигаются сами выигравшие символы, остальные тускнеют, рамок, свечения-ореолов, искр нет.
// dim   — «Дим»: остальные ~45% яркости и бледнее (hl.css), выигравшие один раз приседают и встают (squash-bounce), по порядку слева направо.
// lamp  — «Лампа»: под каждым выигравшим символом на скатерти тёплое пятно света, как от лампочки сверху; остальные чуть темнее. Пятно — плоский градиент, не ореол вокруг символа.
// stamp — «Штамп»: выигравшие по очереди слева направо коротко подпрыгивают (подъём, тень растёт, посадка), больше ничего. Остальные не меняются.
const ordLR=G=>[...G.idx].sort((a,b)=>(a%G.COLS)-(b%G.COLS)||a-b); // слева направо, внутри столбца сверху вниз
const cellSp=(C,G,i)=>{ const o=C.BOARD[(i/G.COLS)|0]&&C.BOARD[(i/G.COLS)|0][i%G.COLS]; return o&&o.sp&&o.sp.isConnected?o.sp:null; };
const DIM=[{transform:'translateY(0%) scale(1,1)',offset:0},{transform:'translateY(2.5%) scale(1.07,.9)',offset:.3},{transform:'translateY(-1.5%) scale(.97,1.05)',offset:.6},{transform:'translateY(0%) scale(1,1)',offset:1}];
function showDim(C,G,R){
 const gap=Math.min(40,300/G.idx.length); let k=0;
 for(const i of ordLR(G)){ const sp=cellSp(C,G,i); if(sp){ sp.style.transformOrigin='50% 87%'; C.anim(sp,DIM,{duration:340,delay:k*gap,easing:'linear',smooth:20}).then(()=>{ sp.style.transformOrigin=''; }); } k++; } }
function showLamp(C,G,R,hu){
 const gap=Math.min(40,300/G.idx.length), pools=[]; let k=0;
 for(const i of ordLR(G)){ const c=G.rect(i), d=k*gap;
  const p=node(hu,'hlpool','',''); p.style.cssText=place({x:c.x-.22*c.w,y:c.y+.38*c.h,w:1.44*c.w,h:.72*c.h},G.AR); pools.push(p); // эллипс света на скатерти под символом
  C.anim(p,[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1)'}],{duration:380,delay:d,easing:'cubic-bezier(.2,.7,.3,1)',fill:'backwards'});
  k++; }
 R.exits.push(()=>pools.map((n,i)=>C.anim(n,[{opacity:1},{opacity:0}],{duration:200,delay:i*5,easing:'ease-in',fill:'forwards'}))); }
const STAMP=[{transform:'translateY(0%)',offset:0,easing:'cubic-bezier(.2,.7,.4,1)'},{transform:'translateY(-13%)',offset:.42,easing:'cubic-bezier(.6,0,.9,.4)'},{transform:'translateY(0%) scale(1.05,.95)',offset:.8},{transform:'translateY(0%) scale(1,1)',offset:1}];
const SHADOW=[{opacity:1,transform:'scale(1)',offset:0},{opacity:.45,transform:'scale(1.22)',offset:.42},{opacity:1,transform:'scale(1)',offset:.8},{opacity:1,transform:'scale(1)',offset:1}];
function showStamp(C,G,R,hu){
 const gap=Math.min(70,480/G.idx.length); let k=0;
 for(const i of ordLR(G)){ const c=G.rect(i), d=k*gap, sp=cellSp(C,G,i);
  if(sp){ sp.style.transformOrigin='50% 87%'; C.anim(sp,STAMP,{duration:380,delay:d,easing:'linear',smooth:24}).then(()=>{ sp.style.transformOrigin=''; });
   const sh=node(hu,'hlshad','',''); sh.style.cssText=place({x:c.x+.12*c.w,y:c.y+.74*c.h,w:.76*c.w,h:.2*c.h},G.AR); // тень под символом: пока он в воздухе — шире и бледнее; после посадки её нет (итог — прозрачная)
   C.anim(sh,SHADOW,{duration:380,delay:d,easing:'linear',smooth:12}).then(()=>{ if(sh.isConnected) sh.remove(); }); }
  k++; } }

// lift — «Подъём»: выигравший символ приподнимается и остаётся приподнятым, под ним тень (до ухода). Остальные не меняются.
function showLift(C,G,R,hu){
 const gap=Math.min(40,300/G.idx.length), shs=[]; let k=0; R.anims=R.anims||[];
 for(const i of ordLR(G)){ const c=G.rect(i), d=k*gap, sp=cellSp(C,G,i);
  if(sp){ sp.style.transformOrigin='50% 87%'; const a=C.animA(sp,[{transform:'translateY(0%)'},{transform:'translateY(-8%)'}],{duration:260,delay:d,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}); if(a) R.anims.push(a); else sp.style.transform='translateY(-8%)', R.anims.push({cancel(){ sp.style.transform=''; }});
   const sh=node(hu,'hlshad','',''); sh.style.cssText=place({x:c.x+.1*c.w,y:c.y+.74*c.h,w:.8*c.w,h:.2*c.h},G.AR); shs.push(sh);
   C.anim(sh,[{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'scale(1)'}],{duration:260,delay:d,easing:'ease-out',fill:'backwards'}); }
  k++; }
 R.exits.push(()=>{ R.anims.forEach(a=>{ try{ a.cancel(); }catch(e){} }); R.anims=[]; return shs.map((n,i)=>C.anim(n,[{opacity:1},{opacity:0}],{duration:180,delay:i*5,easing:'ease-in',fill:'forwards'})); }); }
// breath — «Вдох»: каждый выигравший раз плавно увеличивается на 11% и возвращается; без теней и слоёв.
const BREATH=[{transform:'scale(1)',offset:0},{transform:'scale(1.11)',offset:.45},{transform:'scale(1)',offset:1}];
function showBreath(C,G){
 const gap=Math.min(40,300/G.idx.length); let k=0;
 for(const i of ordLR(G)){ const sp=cellSp(C,G,i); if(sp){ sp.style.transformOrigin='50% 55%'; C.anim(sp,BREATH,{duration:560,delay:k*gap,easing:'linear',smooth:20}).then(()=>{ sp.style.transformOrigin=''; }); } k++; } }
const noop=()=>{};
const MIX={dimjump:(C,G,R,hu)=>showStamp(C,G,R,hu),lampdim:(C,G,R,hu)=>showLamp(C,G,R,hu)};

// ---------- API ----------
function clear(){ if(RUN&&RUN.anims) RUN.anims.forEach(a=>{ try{ a.cancel(); }catch(e){} }); RUN=null; const f=document.getElementById('field'); if(f) f.querySelectorAll('#hlu>.hlv,#hlx>.hlv').forEach(e=>e.remove()); }
function show(v,cells){
 const C=X(), f=document.getElementById('field'); if(!C||!f||!C.GEO||!C.LAYER||!C.LAYER.isConnected||!cells||!cells.length) return;
 defs(); clear(); const [lu,lx]=C.layers(f), G=geo(cells,C), uPx=(f.clientWidth||600)/100, s=Math.max(1,Math.min(1.5,5.1/uPx)); // s: на узком экране u мелкая, лампочки и трубка толще (≈5 px на 1u)
 const hu=host(lu), hx=host(lx); RUN={v,exits:[],rel:false,done:null};
 ({bulbs:showBulbs,spot:showSpot,neon:showNeon,pop:showPop,none:showNone,dim:showDim,lamp:showLamp,stamp:showStamp,lift:showLift,breath:showBreath,shade:noop,dimjump:MIX.dimjump,lampdim:MIX.lampdim}[v]||(()=>{}))(C,G,RUN,hu,hx,s); }
function release(){
 const C=X(); if(!RUN||RUN.rel||!C) return Promise.resolve(); const R=RUN; R.rel=true;
 const ps=R.exits.flatMap(fn=>{ try{ const r=fn(); return Array.isArray(r)?r:[r]; }catch(e){ return []; } });
 R.done=Promise.all(ps).then(()=>{ if(RUN===R){ const f=document.getElementById('field'); if(f) f.querySelectorAll('#hlu>.hlv,#hlx>.hlv').forEach(e=>e.remove()); } });
 return R.done; }
const set=v=>{ if(NAMES.includes(v)) ssSet(v); apply(); return mode(); };
window.bpHl={names:NAMES,nodim:NODIM,label:LABEL,mode,set,show,clear,release,active:()=>!!RUN&&!RUN.rel,urlLocked:()=>!!fromUrl()};
// меню «Экраны макета»: выбрать подсветку и сразу смотреть её по кругу на готовом поле (?state=idle&fx=hl — ui.js hlDemo)
window.bpHlPick=v=>{ set(v); const p='?state=idle&fx=hl'; if(typeof goQ==='function') goQ(p); else { const u=new URL(location.href); u.search=p; location.href=u.toString(); } };
})();
