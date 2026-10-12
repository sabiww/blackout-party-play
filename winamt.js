// Blackout Party — шесть стилей САМИХ ЦИФР суммы на поле (2026-10-12, ветка fb/field-amount; владелец: «интересный стиль для суммы выигрыша на поле», без табличек и подложек).
// Подключается к winfx.js как новые значения p: bulbs, neon, stencil, tin, reg, icing. Умолчание winfx (p=old) не менялось. Выбор: ?winp=bulbs|neon|stencil|tin|reg|icing или тест-панель «Эффекты выигрыша».
// Без свечений, ореолов, глянца и ровных одинаковых обводок: материал даёт форма (лампа с ободком только снизу-справа, трубка на скобах, подтёк краски, штамп с толщиной, глазурь с тенью вниз).
// Время идёт через animA/K игры (Turbo, Quick, Skip, «меньше движения»); при K=0 цифры сразу в итоговом виде. Вне игры (лист сравнения) — обычный Element.animate.
(()=>{
'use strict';
const LIST=['bulbs','neon','stencil','tin','reg','icing'];
const X=()=>window.bpHlCtx&&window.bpHlCtx(), K=()=>{ const x=X(); return x?x.K():1; };
const A=(n,kf,o)=>{ if(!n||!n.isConnected) return null; const x=X(); if(x) return x.animA(n,kf,o); try{ return n.animate(kf,o); }catch(e){ return null; } };
const rnd=(a,b)=>a+Math.random()*(b-a), NS='http://www.w3.org/2000/svg';
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

// ---- фильтры «краска/жесть» (один скрытый svg на страницу) ----
function ensureSvg(){ if(document.getElementById('wa-svg')) return; const d=document.createElement('div'); d.id='wa-svg'; d.setAttribute('aria-hidden','true'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
 d.innerHTML=`<svg xmlns="${NS}" width="0" height="0"><defs>
 <filter id="wa-spray" x="-6%" y="-6%" width="112%" height="165%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="5" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="2.6" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 10 -2.9" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>
 <filter id="wa-chip" x="-4%" y="-4%" width="110%" height="115%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 14 -9.4" result="m"/><feFlood flood-color="#9a9488" result="steel"/><feComposite in="steel" in2="m" operator="in" result="f"/><feComposite in="f" in2="SourceGraphic" operator="atop" result="fa"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fa"/></feMerge></filter></defs></svg>`;
 document.body.appendChild(d); }

// ---- точечные цифры 5×7 для ламп ----
const DM={'0':['01110','10001','10001','10001','10001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','11110','00001','00001','10001','01110'],'6':['00110','01000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00010','01100'],
 '.':['0','0','0','0','0','0','1'],',':['0','0','0','0','0','1','1'],'$':['00100','01111','10100','01110','00101','11110','00100'],'€':['00111','01000','11110','01000','11110','01000','00111'],'£':['00110','01001','01000','11100','01000','01000','11111'],' ':['0','0','0','0','0','0','0']};
// ---- штриховые цифры (одна линия — для трубки и глазури), клетка 6×10 ----
const SG={'0':['M1.6 0H4.4Q6 0 6 1.6V8.4Q6 10 4.4 10H1.6Q0 10 0 8.4V1.6Q0 0 1.6 0Z'],'1':['M1 2.4L3.6 0V10'],'2':['M.2 2.2Q.4 0 3 0Q5.8 0 5.8 2.6Q5.8 4.6 3 6.4L0 10H6'],'3':['M.2 1.2Q1 0 3 0Q5.8 0 5.8 2.5Q5.8 4.8 2.6 5Q6 5.2 6 7.6Q6 10 3 10Q1 10 0 8.8'],'4':['M4.6 10V0L0 7H6.4'],'5':['M5.8 0H.9L.4 4.6Q1.6 4 3.2 4Q6 4 6 7Q6 10 3 10Q1 10 0 9'],'6':['M5.2 .6Q4.4 0 3.1 0Q0 0 0 4.2V7Q0 10 3 10Q6 10 6 7.2Q6 4.6 3.2 4.6Q.8 4.6 0 6.4'],'7':['M0 0H6L2.2 10'],'8':['M3 0Q.5 0 .5 2.4Q.5 4.8 3 5Q5.5 4.8 5.5 2.4Q5.5 0 3 0Z','M3 5Q0 5.2 0 7.6Q0 10 3 10Q6 10 6 7.6Q6 5.2 3 5Z'],'9':['M.8 9.4Q1.6 10 2.9 10Q6 10 6 5.8V3Q6 0 3 0Q0 0 0 2.8Q0 5.4 2.8 5.4Q5.2 5.4 6 3.6'],
 '$':['M5.4 2Q5 .6 3 .6Q.6 .6 .6 2.6Q.6 4.4 3 5Q5.6 5.6 5.6 7.4Q5.6 9.4 3 9.4Q1 9.4 .5 8','M3 -.8V10.8'],'€':['M5.6 1.6Q4.8 0 3.2 0Q.4 0 .4 5Q.4 10 3.2 10Q4.8 10 5.6 8.4','M-.4 3.8H4.6','M-.4 6.2H4.6'],'£':['M5.2 1.2Q4.6 0 3.2 0Q1.4 0 1.4 2.4V10','M0 10H5.6','M0 5H4']};
const SW={'.':2,',':2,' ':2.2};

function tok(t){ return [...String(t)]; }

// ---- построение разметки по виду ----
function html(v,t){ ensureSvg(); const cs=tok(t);
 if(v==='bulbs') return bulbs(cs);
 if(v==='neon') return strokes(cs,'neon');
 if(v==='icing') return strokes(cs,'icing');
 if(v==='stencil') return `<span class="sx">${cs.map((c,i)=>`<span class="ch" data-i="${i}">${esc(c)}</span>`).join('')}</span>`;
 if(v==='tin') return cs.map((c,i)=>`<span class="ch" style="--tr:${rnd(-2.6,2.6).toFixed(2)}deg;--ty:${rnd(-.025,.03).toFixed(3)}em">${esc(c)}</span>`).join('');
 if(v==='reg') return cs.map((c,i)=>`<span class="ch" style="--ty:${rnd(-.02,.03).toFixed(3)}em"><i>${esc(c)}</i></span>`).join('');
 return esc(t); }
function bulbs(cs){ const P=1, G=1.35; let x=0, out='', n=0; const order=[];
 cs.forEach((c,ci)=>{ const g=DM[c]; if(!g){ x+=3; return; } const w=g[0].length; g.forEach((row,r)=>{ [...row].forEach((b,k)=>{ if(b==='1'){ const cx=x+k+.5, cy=r+.5, id=n++; order.push(id); out+=`<g class="bb" data-n="${id}" data-c="${ci}"><circle class="bo" cx="${cx}" cy="${cy}" r=".42"/><g class="bl"><circle cx="${(cx+.07).toFixed(2)}" cy="${(cy+.09).toFixed(2)}" r=".42" fill="#9c5a1c"/><circle cx="${(cx-.03).toFixed(2)}" cy="${(cy-.04).toFixed(2)}" r=".37" fill="#f6c868"/><circle cx="${(cx-.1).toFixed(2)}" cy="${(cy-.12).toFixed(2)}" r=".2" fill="#fff0c2"/></g></g>`; } }); }); x+=w+G; });
 const W=Math.max(1,x-G), H=7; return `<svg class="wa bulbs" viewBox="-.4 -.4 ${(W+.8).toFixed(2)} ${H+.8}" style="width:${((W+.8)*.17).toFixed(3)}em;height:${((H+.8)*.17).toFixed(3)}em" aria-hidden="true">${out}</svg>`; }
function strokes(cs,kind){ let x=1.2, out='', ci=0, G=2.2; const lw=kind==='neon'?1.15:2.1;
 cs.forEach(c=>{ const sg=SG[c], w=SW[c]!==undefined?SW[c]:6;
  if(sg){ out+=`<g class="gl" data-c="${ci}" transform="translate(${x.toFixed(2)} 1.6)">${sg.map(d=>glyph(d,kind)).join('')}</g>`; }
  else if(c==='.'||c===','){ out+=`<g class="gl" data-c="${ci}" transform="translate(${x.toFixed(2)} 1.6)"><path class="p" d="M1 9.2h.01${c===','?'l-.7 1.6':''}"/></g>`; }
  x+=w+G; ci++; });
 const W=x-G+1.2, H=13.2; const u=kind==='neon'?.082:.082;
 return `<svg class="wa ${kind}" viewBox="0 0 ${W.toFixed(2)} ${H}" style="width:${(W*u).toFixed(3)}em;height:${(H*u).toFixed(3)}em" aria-hidden="true">${out}</svg>`; }
function glyph(d,kind){ if(kind==='icing') return `<path class="s2" d="${d}" pathLength="1" transform="translate(.35 .5)"/><path class="s1" d="${d}" pathLength="1"/>`;
 return `<path class="sh" d="${d}" transform="translate(.4 .55)"/><path class="off" d="${d}"/><g class="lit"><path class="tb" d="${d}"/><path class="cr" d="${d}"/></g>`; }

// скобы трубки: короткие тёмные штрихи поперёк линии в двух-трёх местах каждой цифры
function clamps(root){ root.querySelectorAll('.gl').forEach(g=>{ const p=g.querySelector('path.off'); if(!p||!p.getTotalLength) return; let L=0; try{ L=p.getTotalLength(); }catch(e){} if(L<4) return; const at=[.1,.52,.93]; at.forEach((f,i)=>{ if(L<9&&i===1) return; const a=p.getPointAtLength(L*f), b=p.getPointAtLength(Math.min(L,L*f+.4)), c=p.getPointAtLength(Math.max(0,L*f-.4)); let dx=b.x-c.x, dy=b.y-c.y; const m=Math.hypot(dx,dy)||1; dx/=m; dy/=m; const nx=-dy*1.15, ny=dx*1.15; const ln=document.createElementNS(NS,'path'); ln.setAttribute('class','cl'); ln.setAttribute('d',`M${(a.x-nx).toFixed(2)} ${(a.y-ny).toFixed(2)}L${(a.x+nx).toFixed(2)} ${(a.y+ny).toFixed(2)}`); g.appendChild(ln); }); }); }

// REC-метки «Камер» и пересчёт суммы переписывают textContent у .amt — для рисованных видов перерисовываем без анимации
function wire(e,v){ const a=e.querySelector('.amt'); if(!a||!(v==='bulbs'||v==='neon'||v==='icing')) return; let cur=a.textContent;
 Object.defineProperty(a,'textContent',{configurable:true,get(){ return cur; },set(t){ cur=String(t); a.innerHTML=html(v,cur); if(v==='neon') clamps(a); a.setAttribute('aria-label',cur); }}); }
function wrap(e,v,t){ const a=e.querySelector('.amt'); a.innerHTML=html(v,t); a.setAttribute('aria-label',t); if(v==='neon') clamps(a); }

// ---- появление ----
function place(e,w,v,d,chn){ const a=w.querySelector('.amt'); if(!a) return false; chn=chn||0; const base={fill:'backwards'};
 if(v==='bulbs'){ // лампы загораются по очереди, столбцами слева направо; у каждой короткая вспышка «горячая — тёплая»
  const bs=[...a.querySelectorAll('.bb')], nC=Math.max(1,bs.length), per=Math.min(14,Math.max(4,520/nC));
  bs.forEach((b,i)=>{ const l=b.querySelector('.bl'), j=Math.round(+b.dataset.c*70+ (i%7)*7); A(l,[{opacity:0},{opacity:0,offset:.001},{opacity:1,offset:.001},{opacity:.35,offset:.45},{opacity:1}],{...base,delay:d+j,duration:160,easing:'steps(1,end)'}); }); return true; }
 if(v==='neon'){ // трубка мигает и схватывается: цифры зажигаются слева направо, у каждой 2–3 срыва
  [...a.querySelectorAll('.gl')].forEach((g,i)=>{ const lit=g.querySelectorAll('.lit'), n=2+(i%2); const kf=[{opacity:0,offset:0},{opacity:1,offset:.12},{opacity:0,offset:.2},{opacity:n>2?1:0,offset:.3},{opacity:0,offset:.4},{opacity:1,offset:.6},{opacity:.0,offset:.68},{opacity:1,offset:.78},{opacity:1}]; lit.forEach(l=>A(l,kf,{...base,delay:d+i*95,duration:430,easing:'steps(1,end)'})); }); return true; }
 if(v==='icing'){ // глазурь выдавливается по линии: цифры по очереди, каждая вычерчивается от начала до конца
  [...a.querySelectorAll('.gl')].forEach((g,i)=>{ g.querySelectorAll('path.s1,path.s2').forEach(p=>{ p.style.strokeDasharray='1 1'; A(p,[{strokeDashoffset:1},{strokeDashoffset:0}],{...base,delay:d+i*120,duration:150+rnd(0,40),easing:'cubic-bezier(.4,.1,.6,1)'}); }); }); return true; }
 if(v==='stencil'){ // брызг: проступает за 0,16 с, потом подтёки ползут вниз у части цифр
  A(a.querySelector('.sx'),[{opacity:0},{opacity:.55,offset:.35},{opacity:1}],{...base,delay:d,duration:170,easing:'steps(5,end)'});
  const chs=[...a.querySelectorAll('.ch')], pick=chs.filter(c=>/\d/.test(c.textContent)); const n=Math.max(1,Math.min(3,Math.round(pick.length/2.3))); const idx=new Set(); while(idx.size<Math.min(n,pick.length)) idx.add((Math.random()*pick.length)|0);
  [...idx].forEach((ix,k)=>{ const c=pick[ix], dr=document.createElement('i'); dr.className='dr'; dr.style.left=rnd(26,64).toFixed(0)+'%'; dr.style.setProperty('--dl',rnd(.38,.7).toFixed(2)+'em'); c.appendChild(dr); A(dr,[{transform:'scaleY(0)'},{transform:'scaleY(.35)',offset:.3},{transform:'scaleY(.5)',offset:.55},{transform:'scaleY(1)'}],{...base,delay:d+170+k*80,duration:650+rnd(0,250),easing:'cubic-bezier(.5,0,.9,.7)'}); }); return true; }
 if(v==='tin'){ // штамп: цифры по одной ударяют по полю слева направо — падают с увеличением, тень сжимается, у удара лёгкий отскок
  [...a.querySelectorAll('.ch')].forEach((c,i)=>{ const j=d+i*58; A(c,[{opacity:0,transform:'scale(1.55) translateY(-.2em)',offset:0},{opacity:1,transform:'scale(1.55) translateY(-.2em)',offset:.01},{transform:'scale(.96) translateY(.015em)',offset:.5},{transform:'scale(1.02)',offset:.72},{transform:'scale(1)'}],{...base,delay:j,duration:200+chn*0,easing:'cubic-bezier(.55,0,1,.55)'}); }); return true; }
 if(v==='reg'){ // как кассовые флажки: цифры выскакивают снизу справа налево, туго и с короткой дрожью
  const cs=[...a.querySelectorAll('.ch i')]; cs.forEach((c,i)=>{ const j=d+(cs.length-1-i)*52; A(c,[{transform:'translateY(1.05em)',opacity:0,offset:0},{transform:'translateY(1.05em)',opacity:1,offset:.01},{transform:'translateY(-.14em)',offset:.55},{transform:'translateY(.04em)',offset:.75},{transform:'translateY(-.02em)',offset:.88},{transform:'translateY(0)'}],{...base,delay:j,duration:230,easing:'cubic-bezier(.3,.7,.4,1)'}); }); return true; }
 return false; }

// ---- уход ----
function fade(e,w,v,r){ const a=w.querySelector('.amt'); if(!a) return null; let an=null; const o={fill:'forwards'}; r=r||12;
 if(v==='bulbs'){ const bs=[...a.querySelectorAll('.bb .bl')]; if(K()<.2||!bs.length) return null; bs.forEach(l=>A(l,[{opacity:1},{opacity:0}],{...o,delay:rnd(0,160),duration:40,easing:'steps(1,end)'})); an=A(w,[{opacity:1},{opacity:1}],{...o,duration:210}); return an; }
 if(v==='neon'){ const ls=[...a.querySelectorAll('.lit')]; if(K()<.2||!ls.length) return null; ls.forEach((l,i)=>A(l,[{opacity:1,offset:0},{opacity:0,offset:.15},{opacity:1,offset:.3},{opacity:0,offset:.45},{opacity:.6,offset:.55},{opacity:0,offset:.7},{opacity:0}],{...o,delay:i*20,duration:300,easing:'steps(1,end)'})); return A(w,[{opacity:1},{opacity:1}],{...o,duration:300+ls.length*20}); }
 if(v==='icing'){ return A(w,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:`translateY(${(-r*.8).toFixed(1)}px)`}],{...o,duration:300,easing:'ease-in'}); }
 if(v==='stencil'){ return A(w,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:`translateY(${(r*.5).toFixed(1)}px)`}],{...o,duration:420,easing:'ease-in'}); }
 if(v==='tin'){ const cs=[...a.querySelectorAll('.ch')]; if(K()<.2||!cs.length) return null; cs.forEach((c,i)=>A(c,[{opacity:1,transform:'translateY(0) rotate(0deg)'},{opacity:0,transform:`translateY(${(r*1.6).toFixed(1)}px) rotate(${(i%2?9:-9)}deg)`}],{...o,delay:i*30,duration:230,easing:'cubic-bezier(.5,0,1,.6)'})); return A(w,[{opacity:1},{opacity:1}],{...o,duration:230+cs.length*30}); }
 if(v==='reg'){ const cs=[...a.querySelectorAll('.ch i')]; if(K()<.2||!cs.length) return null; cs.forEach((c,i)=>A(c,[{transform:'translateY(0)',opacity:1},{transform:'translateY(-.1em)',offset:.25},{transform:'translateY(1.05em)',opacity:1,offset:.9},{transform:'translateY(1.05em)',opacity:0}],{...o,delay:i*40,duration:240,easing:'ease-in'})); return A(w,[{opacity:1},{opacity:1}],{...o,duration:240+cs.length*40}); }
 return null; }

window.WinAmt={list:LIST,has:v=>LIST.includes(v),html,wrap,wire,place,fade,ensureSvg};
})();
