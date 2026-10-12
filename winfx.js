// Blackout Party — эффекты выигрыша (2026-10-12, ветка fb/winfx; владелец: «эффекты выигрыша и т.д. тоже варианты делай много», «без нейрослопа»).
// Макет, не игра. Малые и средние выигрыши в зале и в «Кухне»/«Камерах»: сумма на поле (p), счёт строки WIN (r), метка цепочки (c), мигание света и толчок (t).
// НЕ трогает экран Большого выигрыша (bigwin-*.js) и подсветку символов (hl.js). Каждый выбор — отдельная группа; «0 · прежний» не меняет ни строчки старого вида.
// Выбор: тест-панель «Эффекты выигрыша», адрес ?winp= ?winr= ?winc= ?wint= (главнее), sessionStorage bp-winfx-p|r|c|t.
// Время: все длительности идут через animA/K игры (Turbo, Quick, Skip, «меньше движения» — тот же множитель); ничего здесь не ждёт и не удлиняет шаг раунда.
// Крючки в ui.js: WinFx.dress (showWins), place/fade (wlPlace/wlFade), count (tweenResult), step (после паузы подсветки каждого шага), end (итог раунда).
(()=>{
'use strict';
const GROUPS={
 p:{title:'Сумма на поле',def:'old',list:[['old','0 · прежний (золото с тёмной тенью)'],['tag','1 · Ценник на верёвочке'],['stamp','2 · Штамп чернилами'],['flip','3 · Перекидные цифры'],['receipt','4 · Чековая лента'],['chalk','5 · Мел на грифельной доске'],['tape','6 · Лента этикет-принтера'],['drift','7 · Просто цифра, тень и всплытие'],['bulbs','8 · Лампочки шатра'],['neon','9 · Неоновая трубка на скобах'],['stencil','10 · Трафаретная краска с подтёками'],['tin','11 · Жестяные цифры, штамп'],['reg','12 · Кассовые цифры-флажки'],['icing','13 · Глазурь, выдавлена кремом']]},
 r:{title:'Строка WIN',def:'odo',list:[['old','0 · прежний'],['odo','1 · Барабаны-одометр (выбор владельца)'],['steps','2 · Ступенями с толчком'],['blink','3 · Сразу итог, цифры мигнут']]},
 c:{title:'Цепочка',def:'old',list:[['old','0 · прежний (без акцента)'],['tag','1 · Табличка CHAIN N у счёта'],['grow','2 · Сумма крупнее с каждым шагом'],['lamps','3 · Ряд ламп под счётом'],['nudge','4 · Толчок поля растёт с шагом']]},
 t:{title:'Малый и средний выигрыш',def:'nudge',list:[['old','0 · Без акцента'],['nudge','1 · Короткий толчок поля (выбор владельца)'],['thump','2 · Поле «садится»: сжатие и возврат'],['dust','3 · Пыль сыплется с верхней рамки'],['tally','4 · Чёрточки счёта у строки WIN']]}};
const KEYS={p:'winp',r:'winr',c:'winc',t:'wint'};
const opt=g=>{ const G=GROUPS[g], names=G.list.map(v=>v[0]); let m=null; try{ m=new URLSearchParams(location.search).get(KEYS[g]); }catch(e){} if(!m){ try{ m=sessionStorage.getItem('bp-winfx-'+g); }catch(e){} } m=String(m||G.def).toLowerCase(); return names.includes(m)?m:G.def; };
const X=()=>window.bpHlCtx&&window.bpHlCtx(), K=()=>{ const x=X(); return x?x.K():1; }, RMq=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const A=(n,kf,o)=>{ const x=X(); return x&&n&&n.isConnected?x.animA(n,kf,o):null; }; // animA: длительность и задержка × K, при K=0 — null (сразу итоговое состояние)
const S={chain:0,tag:null,lamps:null,endT:0};
const $=id=>document.getElementById(id);

// фильтры «грубой печати»: чернила штампа и мел — края и пятна, без свечения; один скрытый svg на страницу
function ensureSvg(){ if($('wf-svg')) return; const d=document.createElement('div'); d.id='wf-svg'; d.setAttribute('aria-hidden','true'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
 d.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><defs>
 <filter id="wf-ink" x="-4%" y="-8%" width="108%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="2" seed="7" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 9 -3.05" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>
 <filter id="wf-chalk" x="-4%" y="-8%" width="108%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="11" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="2" result="d"/><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 6 -1.7" result="m"/><feComposite in="d" in2="m" operator="in"/></filter></defs></svg>`;
 document.body.appendChild(d); }

// ---------------- сумма на поле ----------------
const TEETH=7, rcPoly=h=>{ const pts=['0 0','100% 0']; for(let i=TEETH*2;i>=0;i--){ pts.push((i/(TEETH*2)*100).toFixed(2)+'% calc('+h+'% '+(i%2?'':'- .17em')+')'); } return 'polygon('+pts.join(',')+')'; };
const rnd=(a,b)=>a+Math.random()*(b-a);
function dress(e,o){
 if(opt('c')==='grow'&&S.chain>1){ const f=1+Math.min(.3,.075*(S.chain-1)), cur=parseFloat(e.style.getPropertyValue('--amt')); if(cur) e.style.setProperty('--amt',(cur*f).toFixed(1)+'px'); }
 let v=opt('p'); if(v==='old') return; try{ if(v==='flip'&&typeof scene!=='undefined'&&scene==='cameras') v='tape'; }catch(e){} // «Камеры»: REC-метки переписывают текст суммы, ячейки перекидных цифр не выживают — там лента
 ensureSvg();
 const a=e.querySelector('.amt'); if(!a) return; const t=a.textContent; e._wf=v; e.dataset.wp=v;
 const rot={tag:0,stamp:rnd(-4.5,-1.5),flip:0,receipt:rnd(-1.6,1.6),chalk:rnd(-1.4,1.4),tape:rnd(-1.4,1.4),drift:0,bulbs:rnd(-1,1),neon:rnd(-2.5,-.5),stencil:rnd(-2,2),tin:0,reg:0,icing:rnd(-1.5,1.5)}[v]||0; e.style.setProperty('--rot',rot.toFixed(2)+'deg');
 let inner='';
 if(v==='tag') inner=`<i class="wf-s"></i><div class="amt">${t}</div>`;
 else if(v==='receipt'){ inner=`<i class="rc-h">WIN</i><div class="amt">${t}</div>`; }
 else if(v==='flip') inner=`<div class="amt">${[...t].map(ch=>/\d/.test(ch)?`<span class="c"><i>${ch}</i></span>`:`<span class="c p"><i>${ch}</i></span>`).join('')}</div>`;
 else inner=`<div class="amt">${t}</div>`;
 e.innerHTML=`<div class="wf">${inner}</div>`;
 if(window.WinAmt&&WinAmt.has(v)){ WinAmt.wrap(e,v,t); WinAmt.wire(e,v); } // winamt.js: цифры из ламп, трубки, краски, жести, кассовых флажков, глазури
 if(v==='receipt') e.querySelector('.wf').style.clipPath=rcPoly(100); }
const wfOf=e=>e.querySelector('.wf');
function place(e,i){ const w=wfOf(e), v=e._wf, d=(i||0)*150; if(!w) return false; const base={fill:'backwards',delay:d};
 const chn=Math.min(S.chain,6)-1; // чем длиннее цепочка, тем жёстче «посадка» (вместе с вариантом «Сумма крупнее»)
 if(v==='tag'){ w.style.transformOrigin='50% 0'; A(w,[{opacity:0,transform:'rotate(-16deg)',offset:0},{opacity:1,transform:'rotate(-16deg)',offset:.08},{transform:'rotate(10deg)',offset:.36},{transform:'rotate(-5.5deg)',offset:.58},{transform:'rotate(2.5deg)',offset:.8},{transform:'rotate(0deg)'}],{...base,duration:620,easing:'ease-in-out'}); }
 else if(v==='stamp'){ A(w,[{opacity:0,transform:'scale(1.55)',offset:0},{opacity:1,transform:'scale(1.55)',offset:.01},{opacity:1,transform:'scale(.97)',offset:.55},{opacity:.82,transform:'scale(1)',offset:.7},{opacity:1,transform:'scale(1)'}],{...base,duration:150+chn*0,easing:'cubic-bezier(.5,0,1,.6)'}); }
 else if(v==='flip') flipIn(e,d);
 else if(v==='receipt'){ A(w,[{clipPath:rcPoly(0),opacity:1},{clipPath:rcPoly(100),opacity:1}],{...base,duration:300,easing:'steps(9,end)'}); }
 else if(v==='chalk'){ A(w,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{...base,duration:300,easing:'cubic-bezier(.3,.1,.5,1)'}); }
 else if(v==='tape'){ A(w,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{...base,duration:260,easing:'steps(11,end)'}); }
 else if(window.WinAmt&&WinAmt.has(v)) return WinAmt.place(e,w,v,d,chn);
 else if(v==='drift'){ A(w,[{opacity:0,transform:'translateY(.28em) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{...base,duration:210,easing:'cubic-bezier(.2,.8,.3,1)'}); }
 return true; }
function flipIn(e,d){ // каждая цифра перекидывается несколько раз и садится на своё значение; при Turbo и «меньше движения» — сразу итог
 const cells=[...e.querySelectorAll('.c:not(.p) i')], k=K(); if(k<.2||!cells.length) return;
 cells.forEach((c,j)=>{ const fin=c.textContent, n=2+(j%3); c.dataset.f=fin; for(let s=0;s<=n;s++){ const at=(d+j*38+s*56)*k; setTimeout(()=>{ if(!c.isConnected||c.dataset.f==null) return; c.textContent=s===n?fin:String((Math.random()*10)|0); A(c,[{transform:'scaleY(1)'},{transform:'scaleY(.12)'},{transform:'scaleY(1)'}],{duration:56,easing:'ease-in-out'}); },at); } c.textContent=String((Math.random()*10)|0); }); }
function fade(e,rise){ const w=wfOf(e), v=e._wf; if(!w) return false; let a=null, r=Math.max(6,rise||12);
 if(v==='tag') a=A(w,[{opacity:1,transform:'rotate(0deg)'},{opacity:1,transform:'rotate(6deg) translateY(-.15em)',offset:.4},{opacity:0,transform:`rotate(12deg) translateY(${-r}px)`}],{duration:260,easing:'ease-in',fill:'forwards'});
 else if(v==='stamp') a=A(w,[{opacity:1},{opacity:0}],{duration:200,easing:'ease-out',fill:'forwards'});
 else if(v==='flip'){ const cs=[...e.querySelectorAll('.c')]; if(K()<.2||!cs.length){ a=null; } else { cs.forEach((c,j)=>A(c,[{transform:'scaleY(1)',opacity:1},{transform:'scaleY(.05)',opacity:0}],{duration:130,delay:j*22,easing:'ease-in',fill:'forwards'})); a=A(w,[{opacity:1},{opacity:1}],{duration:130+cs.length*22,fill:'forwards'}); } }
 else if(v==='receipt') a=A(w,[{opacity:1,transform:'translateY(0) rotate(0deg)'},{opacity:0,transform:`translateY(${-r}px) rotate(3deg)`}],{duration:240,easing:'cubic-bezier(.5,0,1,.6)',fill:'forwards'});
 else if(v==='chalk') a=A(w,[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(.2em) skewX(-6deg)'}],{duration:260,easing:'ease-in',fill:'forwards'});
 else if(v==='tape') a=A(w,[{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 100% 0 0)'}],{duration:200,easing:'steps(8,end)',fill:'forwards'});
 else if(v==='drift') a=A(w,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:`translateY(${-r*1.6}px)`}],{duration:380,easing:'cubic-bezier(.3,.6,.4,1)',fill:'forwards'});
 else if(window.WinAmt&&WinAmt.has(v)) a=WinAmt.fade(e,w,v,r);
 if(a) a.finished.catch(()=>{}).then(()=>e.remove()); else e.remove(); return true; }

// ---------------- строка WIN ----------------
const bOf=()=>{ const r=$('result'); return r&&r.querySelector('b'); };
const ease=k=>1-Math.pow(1-k,3);
// 2026-10-12 (fb/win-drum, владелец: «сделать подсчёт быстрее»): счёт вдвое короче прежнего (300 мс → 150 мс), крупная прибавка читается чуть дольше (+60 мс на порядок суммы), потолок 1,6 × 150 = 240 мс
const countMs=(ms,delta)=>ms*.5*(1+Math.min(.6,Math.log10(1+Math.max(0,delta))*.3));
function count(from,to,ms,H){ const v=opt('r'); if(v==='old') return null; const d=countMs(ms,to-from)*H.K(), b=bOf();
 if(!b||d<=0||!(to>from)||(H.fast&&H.fast())){ H.setResult(to); return Promise.resolve(); }
 if(v==='odo') return odo(b,from,to,d,H);
 if(v==='steps') return steps(b,from,to,d,H);
 if(v==='blink') return blink(b,from,to,d,H);
 return null; }
function odo(b,from,to,d,H){ const fm=H.money(to), dm=/[.,](\d+)$/.exec(fm), dec=dm&&fm.length-dm[0].length>=0&&/\./.test(fm)?(dm[1].length):0, sc=Math.pow(10,dec);
 if(!/^[^\d]*\d[\d,.\s]*[^\d]*$/.test(fm)){ H.setResult(to); return Promise.resolve(); }
 b.textContent=''; const od=document.createElement('span'); od.className='od'; const cols=[]; const chars=[...fm]; let di=0; const nd=chars.filter(c=>/\d/.test(c)).length;
 chars.forEach(ch=>{ if(/\d/.test(ch)){ const c=document.createElement('span'); c.className='dc'; const s=document.createElement('span'); s.className='dcs'; for(let n=0;n<=10;n++){ const i=document.createElement('i'); i.textContent=String(n%10); s.appendChild(i); } c.appendChild(s); od.appendChild(c); cols[nd-1-di]=[c,s]; di++; } else { const c=document.createElement('span'); c.className='dch'; c.textContent=ch; od.appendChild(c); } });
 b.appendChild(od);
 const em=()=>parseFloat(getComputedStyle(od).fontSize)*1.15||18, hh=em();
 const set=v=>{ const x=Math.round(v*sc*100)/100; cols.forEach(([c,s],i)=>{ const xi=x/Math.pow(10,i), fl=Math.floor(xi), fr=xi-fl, sm=fr<.7?0:(t=>t*t*(3-2*t))((fr-.7)/.3), p=(fl%10)+sm; s.style.transform=`translateY(${(-p*hh).toFixed(2)}px)`; c.style.opacity=(fl===0&&i>dec)?0:1; }); };
 return new Promise(res=>{ const t0=performance.now(); let tk=0; set(from);
  const st=n=>{ if(!od.isConnected){ res(); return; } const k=H.fast()?1:Math.max(0,Math.min(1,(n-t0)/d)); set(from+(to-from)*ease(k)); if(k<1&&n-tk>60){ tk=n; H.AU('win.count_tick'); } if(k<1) requestAnimationFrame(st); else { H.setResult(to); res(); } }; requestAnimationFrame(st); }); }
function steps(b,from,to,d,H){ const N=Math.min(9,Math.max(4,Math.round(d/42))); b.style.display='inline-block';
 return new Promise(res=>{ const t0=performance.now(); let last=-1; const st=n=>{ if(!b.isConnected){ res(); return; } const k=H.fast()?1:Math.max(0,Math.min(1,(n-t0)/d)), i=k>=1?N:Math.floor(ease(k)*N);
  if(i!==last){ last=i; H.setResult(from+(to-from)*i/N); if(i>0){ H.AU('win.count_tick'); H.anim(b,[{transform:'translateY(0)'},{transform:'translateY(-.13em)',offset:.35},{transform:'translateY(0)'}],{duration:110,easing:'ease-out'}); } }
  if(k<1) requestAnimationFrame(st); else { b.style.display=''; res(); } }; requestAnimationFrame(st); }); }
function blink(b,from,to,d,H){ H.setResult(to); H.AU('win.count_tick');
 H.anim(b,[{opacity:.1,offset:0},{opacity:1,offset:.2},{opacity:.1,offset:.38},{opacity:1,offset:.56},{opacity:.1,offset:.72},{opacity:1,offset:.86},{opacity:1}],{duration:ms2(d),easing:'steps(1,end)'});
 return new Promise(res=>{ const f=()=>{ document.removeEventListener('bp-skip',f); clearTimeout(t); res(); }, t=setTimeout(f,d); document.addEventListener('bp-skip',f); }); }
const ms2=d=>d/Math.max(.001,K()); // anim() умножает на K ещё раз, поэтому отдаём «в игровых мс»

// ---------------- цепочка ----------------
function uiRect(){ const r=$('result'), app=$('app'); if(!r||!app) return null; const a=app.getBoundingClientRect(); let b=r.getBoundingClientRect(); try{ const g=document.createRange(); g.selectNodeContents(r); const t=g.getBoundingClientRect(); if(t.width>0) b=t; }catch(e){} return {a,b,fs:parseFloat(getComputedStyle(r).fontSize)||16}; }
function clearChain(now){ [S.tag,S.lamps].forEach(n=>{ if(!n) return; if(now||RMq()||K()<.1) n.remove(); else { const a=A(n,[{opacity:1},{opacity:0}],{duration:180,fill:'forwards'}); if(a) a.finished.catch(()=>{}).then(()=>n.remove()); else n.remove(); } }); S.tag=S.lamps=null; }
function showTag(chain){ const R=uiRect(); if(!R) return; const fs=R.fs*.82;
 if(!S.tag||!S.tag.isConnected){ const t=document.createElement('div'); t.id='wfx-chain'; t.className='wfx-tag'; t.innerHTML='<i>CHAIN</i><b></b>'; $('app').appendChild(t); S.tag=t; }
 const t=S.tag; t.style.fontSize=fs+'px'; t.querySelector('b').textContent=chain; t.style.left=(R.b.right-R.a.left+R.fs*.7)+'px'; t.style.top=(R.b.top-R.a.top+R.b.height/2)+'px';
 A(t,[{transform:'translate(0,-50%) rotate(-2deg) scale(1.5)',opacity:.2},{transform:'translate(0,-50%) rotate(-2deg) scale(.97)',opacity:1,offset:.6},{transform:'translate(0,-50%) rotate(-2deg) scale(1)',opacity:1}],{duration:150,easing:'ease-in'}); }
function showLamps(chain){ const R=uiRect(); if(!R) return; const fs=R.fs, N=6;
 if(!S.lamps||!S.lamps.isConnected){ const l=document.createElement('div'); l.id='wfx-chain'; l.className='wfx-lamps'; l.innerHTML='<i></i>'.repeat(N); $('app').appendChild(l); S.lamps=l; l._on=0; }
 const l=S.lamps; l.style.setProperty('--ls',(fs*.5).toFixed(1)+'px'); l.style.left=(R.b.left-R.a.left+R.b.width/2)+'px'; l.style.top=(R.b.bottom-R.a.top+fs*.1)+'px';
 const lamps=[...l.children], on=Math.min(chain,N); lamps.forEach((n,i)=>{ if(i<on&&!n.classList.contains('on')){ n.classList.add('on'); A(n,[{opacity:.25},{opacity:1},{opacity:.4},{opacity:1}],{duration:150,easing:'steps(1,end)'}); } }); l._on=on; }
function nudge(a){ const f=$('field'); if(!f||RMq()) return; A(f,[{transform:'translate(0,0)'},{transform:`translate(0,${a}px)`,offset:.22},{transform:`translate(${(-a*.35).toFixed(2)}px,${(-a*.45).toFixed(2)}px)`,offset:.55},{transform:`translate(0,${(a*.15).toFixed(2)}px)`,offset:.8},{transform:'translate(0,0)'}],{duration:210,easing:'ease-out',composite:'add'}); }

// ---------------- малый/средний выигрыш ----------------
function tier(lv){ const t=opt('t'); if(t==='old'||RMq()) return; // 2026-10-12 (fb/win2): «мигание света» и вуаль убраны (владелец: «типичная ИИ-картинка»); теперь без акцента или грубая механика — толчок, осадка, пыль, чёрточки
 const f=$('field'), fw=f?Math.max(.6,f.getBoundingClientRect().width/700):1;
 if(t==='nudge') nudge([0,1.8,3,4.2][lv]*fw);
 else if(t==='thump'&&f) A(f,[{transform:'scale(1,1)'},{transform:`scale(${(1-.0035*lv).toFixed(4)},${(1-.0075*lv).toFixed(4)})`,offset:.28},{transform:`scale(${(1+.0012*lv).toFixed(4)},${(1+.0022*lv).toFixed(4)})`,offset:.62},{transform:'scale(1,1)'}],{duration:260,easing:'ease-out',composite:'add'});
 else if(t==='dust') dust(lv);
 else if(t==='tally') tally(lv); }
// пыль: мелкие серо-бурые крошки отрываются от верхней рамки и падают по тяжести (падение ∝ t², без свечения); число и дальность растут с уровнем
function dust(lv){ const f=$('field'), app=$('app'); if(!f||!app) return; const a=app.getBoundingClientRect(), r=f.getBoundingClientRect(), n=[0,6,11,18][lv], u=r.width/700, box=document.createElement('div'); box.className='wfx-dust'; box.style.cssText='position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:6'; app.appendChild(box);
 const done=[]; for(let i=0;i<n;i++){ const e=document.createElement('i'), sz=Math.max(2.5,(2.4+Math.random()*3)*u), x=r.left-a.left+r.width*(.06+Math.random()*.88), y=r.top-a.top+3*u, fall=r.height*(.07+Math.random()*.16)*(.8+.25*lv), dx=(Math.random()-.5)*10*u;
  e.style.cssText=bpvT`position:absolute;left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${['#a89878','#8a7b62','#b9ab8c'][i%3]};opacity:0`; box.appendChild(e);
  const an=A(e,[{opacity:0,transform:'translate(0,0)'},{opacity:.9,transform:`translate(${dx*.2}px,${fall*.06}px)`,offset:.08},{opacity:.7,transform:`translate(${dx*.6}px,${fall*.42}px)`,offset:.55},{opacity:0,transform:`translate(${dx}px,${fall}px)`}],{duration:520+Math.random()*320,delay:Math.random()*90,easing:'cubic-bezier(.45,0,.9,.6)',fill:'both'}); if(an) done.push(an.finished.catch(()=>{})); }
 if(!done.length){ box.remove(); return; } Promise.all(done).then(()=>box.remove()); }
// чёрточки счёта: от одной до трёх коротких штрихов слева от строки WIN, появляются по одному и сходят (как зарубки)
function tally(lv){ const R=uiRect(), app=$('app'); if(!R||!app) return; const old=$('wfx-tally'); if(old) old.remove(); const t=document.createElement('div'); t.id='wfx-tally'; t.className='wfx-tally'; t.innerHTML='<i></i>'.repeat(lv);
 t.style.fontSize=R.fs+'px'; t.style.left=(R.b.left-R.a.left-R.fs*.55)+'px'; t.style.top=(R.b.top-R.a.top+R.b.height/2)+'px'; app.appendChild(t);
 [...t.children].forEach((c,i)=>{ c.style.setProperty('--r',((i*5)%7-3)+'deg'); A(c,[{opacity:0,transform:'scaleY(0)'},{opacity:1,transform:'scaleY(1)'}],{duration:90,delay:i*90,fill:'backwards',easing:'ease-out'}); });
 const an=A(t,[{opacity:1},{opacity:1,offset:.7},{opacity:0}],{duration:900,fill:'forwards'}); if(an) an.finished.catch(()=>{}).then(()=>t.remove()); else t.remove(); }
function step(chain,x){ clearTimeout(S.endT); S.chain=chain; if(chain<=1) clearChain(true);
 const c=opt('c'); if(chain>=2){ if(c==='tag') showTag(chain); else if(c==='lamps') showLamps(chain); else if(c==='nudge'){ const f=$('field'); nudge(1.3*Math.min(chain,5)*(f?Math.max(.6,f.getBoundingClientRect().width/700):1)); } }
 const lv=x<2?1:x<5?2:x<10?3:0; if(lv) tier(lv); }
function end(){ clearTimeout(S.endT); S.endT=setTimeout(()=>{ S.chain=0; clearChain(false); },Math.max(120,900*K())); }

document.addEventListener('bp-skip',()=>{ document.querySelectorAll('#wlx .c i[data-f]').forEach(i=>{ i.textContent=i.dataset.f; delete i.dataset.f; }); }); // Skip: перекидные цифры сразу садятся на итог, таймеры больше не меняют
window.WinFx={groups:GROUPS,keys:KEYS,opt,dress,place,fade,count,step,end,state:S};
})();
