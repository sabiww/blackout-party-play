/* Blackout Party — экран приветствия W2 (владелец 2026-10-10: «пульт охраны с янтарной линзой PLAY»).
   Источник эскиза: mockup/welcome-v2.html?v=2 (там же старые W1/W3 — в игру не переносились). Стили — ui.css, раздел «экран приветствия W2».

   Подключение (index.html?bpv=0b88879c, до ui.js):   <script src="welcome.js"></script>
   API:  Welcome.open(root, onPlay) — заполняет #wel (разметка, размеры по окну, три демонстрации) и ждёт PLAY; onPlay вызывается один раз
                                      по кнопке PLAY, по клику мимо пульта и (через Welcome.play()) по пробелу
         Welcome.play()            — то же, что нажать PLAY (пробел в ui.js)
         Welcome.stop()            — остановить часы демонстраций и выгрузить их видео (вызывается при закрытии и перед новой отрисовкой)
         Welcome.Demos             — модуль демонстраций (он же window.Demos): Demos.freeze(i,t) показывает момент t демонстрации i (0..2), Demos.unfreeze() — снова цикл
   Демонстрации на экранах CAM 01–03: кадр = функция времени (цикл 5,8 / 8,3 / 18,5 с). 1) красная скатерть со строчкой (FieldTable) + подсветка «Камера» + сумма на символах (только сумма) + строка WIN;
   2) то же + множитель H (×1 ▸ ×2) + Рокко «подзывает и глотает» (rocco/H-swallow4) + вставка «запись с камеры» (C-walk, C-vanish: Рокко смотрит в камеру);
   3) окошко в две части («Кухня» 7,6 с, затем «Камеры» 10,9 с, welcome-cams.js): A — три приглашения → ржавый ставень (trans/shutter.webp) → «Кухня» (Рокко тот же, что в зале) с окошками FREE SPINS и SACK:
      трюк в начале спина (Рокко бросает 2 WILD), 4 кражи наполняют мешок, полный мешок — «+3» на FREE SPINS и ступень счётчика; B — 4 приглашения → поле становится мониторами (CamRec) → три бесплатных спина на одних и тех же восьми мониторах (FREE SPINS 10 → 9 → 8): выигрыш, кража, значки ×2; выигрыш, ярлык ×16 на сумму, кража, значки ×4; выигрыш, ярлык ×32, кража, значки ×8 (рост рамок: кремовая → янтарная → янтарная с двойным кольцом).
   «Меньше движения» (системная настройка) — один статичный кадр на каждом экране, без часов и видео.
   Пути — от переменной A игры («../assets/», в артефакте «assets/»); ролики: .webm, в Safari (WebKit) .hevc.mp4 с альфой.
   Раскладка: wide — колонкой; short (высота ≤ 520) — логотип | MAX WIN в одной полосе, ниже пульт; tall (портрет) — экраны строками. Единица размера — em от одного числа --u (fit()). */
((A)=>{
'use strict';
/* ===================== ДЕМОНСТРАЦИИ W2: кадр — функция времени =====================
   Каждая демонстрация — T секунд цикла; frame(t) расставляет все слои для момента t (сек). Часы идут от rAF; для раскадровки
   Demos.freeze(i,t) останавливает цикл и показывает момент t. Видео Рокко (демонстрация 2) стартует в нужный момент цикла,
   а все «глотательные» события считаются от времени самого ролика (если видео задержалось, символы всё равно прилетают в открытую пасть).
   Размеры — в «родных» пикселях экрана 240×150; весь экран масштабируется через --k (transform на .stage). */
const Demos=(()=>{
const SW=240, SH=150, SYMU=id=>`${A}${id}.webp`;
const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x, seg=(t,a,b)=>clamp((t-a)/(b-a)), lerp=(a,b,p)=>a+(b-a)*p;
const eo=x=>1-Math.pow(1-x,3), ei=x=>x*x*x, eio=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const eob=x=>{ const c=1.35; return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2); };
const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
const SYM_={h:'sym-low-hat',c:'sym-low-cup',b:'sym-low-balloon',k:'sym-low-cupcake',o:'sym-low-horn',p:'sym-high-pizza',m:'sym-high-mic',g:'sym-high-gift',t:'sym-high-mask',w:'sym-wild',i:'sym-scatter-invitation'};
const WEBKIT=/AppleWebKit/.test(navigator.userAgent)&&!/Chrome|Chromium|Edg\//.test(navigator.userAgent);
const clipUrl=n=>`${A}rocco/${n}${WEBKIT?'.hevc.mp4':'.webm'}`;
const RM=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- поле 6×5: красная скатерть со строчкой (field-table.js) + символы ---------- */
function Board(stage,o){
 const cw=o.cw, ch=o.ch, g=o.g, pw=cw+g, ph=ch+g, GW=6*pw, GH=5*ph;
 const root=el('div','bd'); root.style.cssText=bpvT`left:${o.x}px;top:${o.y}px;width:${GW}px;height:${GH}px`;
 const cs=[]; for(let r=0;r<5;r++) for(let c=0;c<6;c++) cs.push({l:(c*pw+g/2)/GW*100,t:(r*ph+g/2)/GH*100,w:cw/GW*100,h:ch/GH*100});
 const cloth=el('div','ft');
 if(window.FieldTable){ const out=FieldTable.render({cs,gx2:(g/2)/GW*100,gy2:(g/2)/GH*100,scene:o.scene||'hall',grid:'stitch',aspect:GH/GW,id:o.id,boost:o.boost||1.6}); // на экране шириной 150 px строчка тоньше пикселя — boost утолщает линии скатерти
  cloth.style.setProperty('--ft-s',out.vars.slice(7)); cloth.innerHTML=out.html; }
 const layer=el('div','layer'); root.append(cloth,layer); stage.append(root);
 const B={root,layer,cw,ch,g,pw,ph,GW,GH,x:o.x,y:o.y,S:[],
  cx:c=>c*pw+pw/2, cy:r=>r*ph+ph/2, sx:c=>o.x+c*pw+pw/2, sy:r=>o.y+r*ph+ph/2};
 B.spr=(ch_,c,r)=>{ const id=SYM_[ch_]||ch_, w=cw*.98, h=ch*1.02, e=el('div','sy',`<img src="${SYMU(id)}" alt="">`);
  e.style.cssText=bpvT`width:${w}px;height:${h}px`; layer.append(e); const s={e,id,c,r,r0:r,rf:r,w,h,win:false}; B.S.push(s); return s; };
 B.put=(s,row,p)=>{ p=p||{}; const X=B.cx(s.c)+(p.dx||0), Y=B.cy(row)+(p.dy||0);
  s.e.style.transform=`translate(${(X-s.w/2).toFixed(2)}px,${(Y-s.h/2).toFixed(2)}px) rotate(${(p.rot||0).toFixed(1)}deg) scale(${(p.sc==null?1:p.sc).toFixed(3)})`;
  const op=p.op==null?1:p.op; if(s._op!==op){ s._op=op; s.e.style.opacity=op; } };
 B.fill=layout=>{ layout.forEach((row,r)=>[...row].forEach((ch_,c)=>B.spr(ch_,c,r))); };
 return B;
}
/* янтарные уголки «Камера» (стили — win-highlight.html, без номеров); живут в слое hud на уровне экрана, чтобы фильтр CCTV их не красил */
function Bracket(hud,B,r,c){
 const w=B.cw, h=B.ch, a=Math.min(w,h)*.3, o=.9, d=`M${o} ${o+a}V${o}H${o+a}M${w-o-a} ${o}H${w-o}V${o+a}M${w-o} ${h-o-a}V${h-o}H${w-o-a}M${o+a} ${h-o}H${o}V${h-o-a}`;
 const e=el('div','bk',`<svg viewBox="0 0 ${w} ${h}" style="overflow:visible"><rect class="cfl" x="1" y="1" width="${w-2}" height="${h-2}"/><path class="cbd" d="${d}"/><path class="cb" d="${d}"/></svg>`);
 e.style.cssText=bpvT`left:${B.x+c*B.pw+B.g/2}px;top:${B.y+r*B.ph+B.g/2}px;width:${w}px;height:${h}px;opacity:0`; hud.append(e); return {e,fl:e.querySelector('.cfl'),r,c};
}
function brState(b,t,t0,t1){ // замок: появление t0, пропажа t1 (<0 — не пропадает)
 const p=seg(t,t0,t0+.28), k=lerp(1.7,1,eo(p)), out=t1>0?1-seg(t,t1,t1+.18):1;
 b.e.style.opacity=(p>0?1:0)*out; b.e.style.transform=`scale(${k.toFixed(3)})`; b.fl.style.opacity=(.38*Math.sin(Math.PI*seg(t,t0,t0+.34))).toFixed(3); }
/* надпись «на символах»: только сумма крупно золотом, без коробки и без формулы (владелец 2026-10-11: формулу «N × СИМВОЛ × множитель» убрали везде); вид — как у надписи выигрыша в игре (#wlx .wl .amt, ui.css) */
function Amount(hud,x,y,sum){ const e=el('div','amt',`<b>${sum}</b>`); e.style.cssText=bpvT`left:${x}px;top:${y}px;opacity:0`; hud.append(e); return e; }
const amtSet=(e,op,sc)=>{ e.style.opacity=op.toFixed(3); e.style.transform=`translate(-50%,-50%) scale(${sc.toFixed(3)})`; };
/* строка WIN: «WIN $0.50», крем + янтарь, Black Ops One, без коробки */
function WinLine(hud,x,y,align){ const e=el('div','winl','WIN <b>$0.00</b>'); e.style.cssText=bpvT`left:${x}px;top:${y}px;opacity:0;${align==='l'?'transform:none':'transform:translateX(-50%)'}`; hud.append(e); e._b=e.querySelector('b'); e._v=-1; return e; }
const winSet=(e,op,v)=>{ e.style.opacity=op.toFixed(3); const s='$'+v.toFixed(2); if(e._v!==s){ e._v=s; e._b.textContent=s; } };
/* множитель — вариант H (hud-light.html): тонкая красная стальная плашка, внутри стекло с тонкой латунной линией, «×1 ▸ ×2» */
function Mult(hud,x,y,a,b,c){ const e=el('div','mp',`<div class="g"><span class="x">×</span><span class="v"><i><em>${a}</em><em>${b}</em></i></span><i class="ar"></i><span class="nx">×<span class="nv"><i><em>${b}</em><em>${c}</em></i></span></span></div>`);
 e.style.cssText=bpvT`left:${x}px;top:${y}px;opacity:0`; hud.append(e); e._v=e.querySelector('.v i'); e._n=e.querySelector('.nv i'); return e; }
const multSet=(e,op,roll,bump)=>{ e.style.opacity=op.toFixed(3); e._v.style.transform=`translateY(${(-roll*1.3).toFixed(3)}em)`; e._n.style.transform=`translateY(${(-roll*1.3).toFixed(3)}em)`; e.style.transform=`translateX(-50%) scale(${(1+.16*bump).toFixed(3)})`; e.classList.toggle('hot',bump>.05); };
/* окошко FREE SPINS: тёмное стекло, янтарь, тонкая красная обводка */
function Fsw(hud,x,y){ const e=el('div','fsw','<span class="lb">FREE SPINS</span><span class="vv">0</span>'); e.style.cssText=bpvT`left:${x}px;top:${y}px;opacity:0`; hud.append(e); e._v=e.querySelector('.vv'); e._n=-1; return e; }
/* окошко SACK (как hudItems в ui.js, мельче): подпись, 4 лампы (пустые — мешок спрятан под столом и появится только при высыпании), сумма $0.00 */
function Sackw(hud,x,y){ const e=el('div','fsw sk',`<span class="lb">SACK<span class="lamps">${'<i class="lp"></i>'.repeat(4)}</span></span><span class="vv">$0.00</span>`); e.style.cssText=bpvT`left:${x}px;top:${y}px;opacity:0`; hud.append(e); e._l=[...e.querySelectorAll('.lp')]; e._f=[0,0,0,0]; return e; }

/* ---------- каркас экрана ---------- */
function frameStage(stage,bg,cls){ // слои: cctv (фон, поле, Рокко) — под фильтром; hud — сумма, уголки, множитель — поверх, без фильтра
 const cctv=el('div','cctv'+(cls?' '+cls:'')), hud=el('div','hud');
 const b=el('div','cambg'); b.style.backgroundImage=bpvT`url(${A}${bg}.webp)`; cctv.append(b); stage.append(cctv,hud); return {cctv,hud,bg:b};
}
const ROCCO={s:.1844,left:129.5,top:19.1,mouth:[187.8,62.2]}; // кадр ролика 1280×720; торс на x=952 (отражён), рот (раскрытая пасть H-swallow4) в (964,234); ноги на y=699
// Рокко в приветствии играет ролик в обычном темпе, как в игре (2026-10-11, владелец: «все переходы — единым роликом»): участки ×3/×1,6 по движению сняты — на смене скорости рука «дёргалась». Времена демонстрации сдвинуты на 0,88 с (было: jaw открыт на 1,37 с цикла после старта ролика, стало 2,25 с).
const wallOf=vt=>vt; // время ролика → секунды цикла после его старта
const rateAt=()=>1;
const VOPEN=2.5, VSHUT=4.08, SWD=.2; // H-swallow4: пасть раскрывается на 2,50 с, смыкается на 4,08 с (прежний H-swallow: 2,25 и 3,08). SWD — на сколько позже прежнего всё, что завязано на раскрытую пасть (подъём символов, прилёт, каскад, множитель)

/* ======================== 1. CAM 01: 8+ одинаковых — выигрыш ======================== */
function D1(root){
 const T=5.8, st=root.querySelector('.stage'), {cctv,hud}=frameStage(st,'bg-hall-landscape');
 const B=Board(cctv,{x:45,y:19,cw:22.6,ch:19.1,g:2.4,id:'ft1'});
 const L=['chmbho','gkhcbo','htwbkh','ocghpk','kbcbth']; B.fill(L);
 const W=B.S.filter(s=>s.id==='sym-low-hat'||s.id==='sym-wild'), brs=W.map(s=>Bracket(hud,B,s.r,s.c));
 const mx=W.reduce((a,s)=>a+s.c,0)/W.length, my=W.reduce((a,s)=>a+s.r,0)/W.length;
 const amt=Amount(hud,B.sx(mx+.1),B.sy(1.05),'$0.50'), wl=WinLine(hud,120,132); // надпись сдвинута вверх: WILD не закрываем (как wlAnchor в игре)
 const tIn=.3, tLock=1.75, tAmt=2.12, tWin=2.5, tFade=4.8, tEx=5.05;
 W.forEach((s,i)=>{ s.wi=i; });
 let dim=null;
 function frame(t){
  for(const s of B.S){ const d=tIn+s.c*.07+(4-s.r)*.028, pin=seg(t,d,d+.5), pex=seg(t,tEx+s.c*.025+(4-s.r)*.018,tEx+s.c*.025+(4-s.r)*.018+.32);
   B.put(s,s.r-6.2*(1-eob(pin))+7*ei(pex),{op:pin>0&&pex<1?1:0,sc:s.wi!=null?1+.09*Math.sin(Math.PI*seg(t,tLock+s.wi*.045,tLock+s.wi*.045+.32)):1}); }
  const on=t>=tLock&&t<tFade+.2; if(on!==dim){ dim=on; B.S.forEach(s=>{ const w=W.includes(s); s.e.classList.toggle('win',on&&w); s.e.classList.toggle('dim',on&&!w); }); root._hot&&root._hot(on); }
  brs.forEach((b,i)=>brState(b,t,tLock+i*.045,tFade));
  amtSet(amt,seg(t,tAmt,tAmt+.2)*(1-seg(t,tFade,tFade+.2)),lerp(.82,1,eob(seg(t,tAmt,tAmt+.3))));
  winSet(wl,seg(t,tWin,tWin+.25)*(1-seg(t,tEx,tEx+.2)),.5*eo(seg(t,tWin,tWin+.5))); }
 return {T,frame,off:0,still:3.4};
}

/* ======================== 2. CAM 02: Рокко забирает выигрыш — множитель растёт ======================== */
const vOf=w=>w<=0?0:Math.min(4.99,w); // секунды цикла после старта ролика → время ролика
function D2(root){
 const T=9.18, st=root.querySelector('.stage'), {cctv,hud}=frameStage(st,'bg-hall-landscape','green');
 const gl=el('div','gl'); st.append(gl); gl.append(cctv,hud); // слой помех: дёргается и мерцает целиком
 const B=Board(cctv,{x:6,y:38,cw:18,ch:15.6,g:2,id:'ft2'});
 B.fill(['chmbho','gkhcbo','htwbkh','ocghpk','kbcbth']);
 const W=B.S.filter(s=>s.id==='sym-low-hat'||s.id==='sym-wild'), brs=W.map(s=>Bracket(hud,B,s.r,s.c));
 const ord=[...W].sort((a,b)=>(b.c-a.c)||(a.r-b.r)); ord.forEach((s,i)=>{ s.k=i; }); // ближние к Рокко (правые столбцы) глотаются раньше
 // после выигрыша: выжившие в столбце падают вниз, сверху приходят новые
 const NEWS='kcbogmpbcokgbmhc'.split(''); let ni=0;
 for(let c=0;c<6;c++){ const col=B.S.filter(s=>s.c===c&&!W.includes(s)&&!s.isNew).sort((a,b)=>b.r-a.r), rem=W.filter(s=>s.c===c).length;
  col.forEach((s,i)=>{ s.rf=4-i; });
  for(let j=0;j<rem;j++){ const rf=rem-1-j, s=B.spr(NEWS[ni++%NEWS.length],c,rf); s.isNew=true; s.rf=rf; s.r0=rf-rem-1; } }
 const wx=W.reduce((a,s)=>a+s.c,0)/W.length, wy=W.reduce((a,s)=>a+s.r,0)/W.length;
 const amt=Amount(hud,B.sx(wx+.1),B.sy(1.05),'$0.50'), wl=WinLine(hud,6,129,'l');
 const mp=Mult(hud,66,19,1,2,3);
 // Рокко: прозрачный ролик «подзывает и глотает»
 const R=ROCCO, rk=el('div','rk'); rk.style.cssText=bpvT`left:${R.left}px;top:${R.top}px;width:${1280*R.s}px;height:${720*R.s}px`;
 const v=el('video','rkv'); v.muted=true; v.setAttribute('playsinline',''); v.preload='auto'; v.src=clipUrl('H-swallow4'); rk.append(v); cctv.append(rk);
 let vOK=false; v.addEventListener('loadeddata',()=>{ vOK=true; rk.classList.add('on'); });
 v.addEventListener('error',()=>{ if(!v.getAttribute('src')) return; rk.innerHTML=`<img src="${A}uikit/rocco-hall-still.webp" alt="" style="position:absolute;height:${640*R.s}px;left:${(1280-952)*R.s-27}px;top:${60*R.s}px;transform:scaleX(-1)">`; vOK=false; rk.classList.add('on'); });
 const fly=ord.map(s=>{ const f=el('div','sy fl',`<img src="${SYMU(s.id)}" alt="">`); f.style.cssText=bpvT`width:${s.w}px;height:${s.h}px;opacity:0`; cctv.append(f); return f; });
 // вставка «запись с камеры» (как в первой версии приветствия): помеха → C-walk (Рокко идёт к камере, перемотка пустого коридора) → C-stare/C-vanish (смотрит в камеру, помеха, исчезает) → помеха → цикл заново
 const feed=el('div','cfeed'), fw=el('video'), fvn=el('video'); gl.append(feed); feed.append(fw,fvn);
 for(const [e,n] of [[fw,'C-walk'],[fvn,'C-vanish']]){ e.muted=true; e.setAttribute('playsinline',''); e.preload='auto'; e.src=`${A}rocco/${n}.mp4`; }
 const tears=[0,1,2].map(()=>{ const e=el('i','tear'); gl.append(e); return e; });
 const TG=5.18, TF=5.33, wWall=c=>c<=2.2?c/6:.3667+(c-2.2)/1.5, wClip=w=>w<=.3667?w*6:Math.min(4.4,2.2+(w-.3667)*1.5), vClip=w=>Math.min(3.0,w*1.6); // C-walk: до 2,2 с ролика ×6 (пустой коридор), дальше ×1,5 до 4,4 с; C-vanish: ×1,6 до 3,0 с (взгляд, помеха из ролика, пустой коридор)
 const TW1=TF+wWall(4.4);
 const hash=(a,b)=>{ const x=Math.sin(a*127.1+b*311.7)*43758.5453; return x-Math.floor(x); }, bmp=(t,a,b)=>Math.sin(Math.PI*seg(t,a,b));
 const V0=1.0, tIn=.2, tLock=1.1, tAmt=1.35, tLift=2.41+SWD, A0=3.5+SWD, A1=4+SWD, FD=.42, tCas=4.08+SWD, tEx=99;
 let dim=null, prev=-1, started=false, vst=false;
 const colDelay=s=>tCas+s.c*.05+s.rf*.02;
 function frame(t,fz){
  let tm=t; // часы глотания — от времени ролика, пока он идёт (если видео задержалось, символы всё равно прилетают в открытую пасть)
  if(!fz){
   if(prev>t){ started=false; vst=false; try{ v.pause(); v.currentTime=0; fw.pause(); fvn.pause(); fw.currentTime=0; fvn.currentTime=0; }catch(e){} }
   if(t>=TF&&prev<TF&&!RM()){ try{ v.pause(); fw.currentTime=0; fw.playbackRate=6; fw.play().catch(()=>{}); }catch(e){} }
   if(t>=TF&&!vst){ if(!fw.paused){ fw.playbackRate=fw.currentTime<2.2?6:1.5; } if(fw.currentTime>=4.4||t>=TW1+.25){ vst=true; try{ fw.pause(); fvn.currentTime=0; fvn.playbackRate=1.6; fvn.play().catch(()=>{}); }catch(e){} } }
   if(vst&&!fvn.paused&&fvn.currentTime>=3.0) fvn.pause();
   if(!started&&t>=V0&&t<V0+.5&&vOK&&!RM()){ started=true; try{ v.currentTime=0; v.playbackRate=1; v.play().catch(()=>{}); }catch(e){} }
   if(started&&!v.paused){ v.playbackRate=rateAt(v.currentTime); if(v.currentTime>.02) tm=V0+wallOf(v.currentTime); } else if(started&&v.ended) tm=Math.max(t,V0+5.04); }
  prev=t;
  { // запись с камеры: что показывать и какая сила помехи
   const inFeed=t>=TF&&t<T, vanish=fz?t>=TW1:vst;
   cctv.style.visibility=hud.style.visibility=inFeed?'hidden':'visible'; feed.style.visibility=inFeed?'visible':'hidden';
   fw.style.opacity=inFeed&&!vanish?1:0; fvn.style.opacity=inFeed&&vanish?1:0;
   if(inFeed&&vanish){ fvn.style.transform=`scale(${(1+.05*seg(t,TW1,TW1+1.3)).toFixed(3)})`; }
   const g=Math.max(bmp(t,TG,TF+.12),bmp(t,TW1-.1,TW1+.12),seg(t,T-.22,T),1-seg(t,0,.22)), q=Math.floor(t*30);
   if(g>.02){ gl.style.transform=`translate(${((hash(q,1)-.5)*6.8*g).toFixed(2)}px,${((hash(q,2)-.5)*2.8*g).toFixed(2)}px)`; gl.style.filter=`brightness(${(1+(hash(q,3)-.35)*.9*g).toFixed(2)}) contrast(${(1+.4*g).toFixed(2)})`;
    tears.forEach((e,i)=>{ const on=g>.15&&hash(q,10+i)>.3; e.style.display=on?'block':'none'; if(on){ e.style.top=(hash(q,20+i)*140).toFixed(1)+'px'; e.style.height=(3+hash(q,30+i)*10).toFixed(1)+'px'; e.style.background=(i+q)%2?'rgba(200,255,215,.26)':'rgba(0,0,0,.5)'; e.style.transform=`translateX(${((hash(q,40+i)-.5)*14*g).toFixed(1)}px)`; } }); }
   else { gl.style.transform=''; gl.style.filter=''; tears.forEach(e=>{ e.style.display='none'; }); } }
  for(const s of B.S){ let row, op=1, sc=1, dx=0, dy=0;
   if(s.isNew){ const d=colDelay(s), p=seg(t,d,d+.42); row=lerp(s.r0,s.rf,eob(p)); op=p>0?1:0; }
   else { const d=tIn+s.c*.05+(4-s.r)*.022, pin=seg(t,d,d+.45), dd=colDelay(s), pc=seg(t,dd,dd+.4);
    row=lerp(s.r,s.rf,eob(pc))-6.2*(1-eob(pin)); op=pin>0?1:0;
    if(W.includes(s)){ const k=seg(tm,tLift,tLift+.35); sc=1+.1*k; dy=-1.6*k; dx=Math.sin(tm*68+s.k*1.7)*.55*k; if(tm>=lerp(A0,A1,s.k/7)-FD) op=0; } }
   const de=tEx+s.c*.025+(4-s.rf)*.018, pex=seg(t,de,de+.32); row+=7*ei(pex); if(pex>=1) op=0;
   B.put(s,row,{op,sc,dx,dy}); }
  ord.forEach((s,i)=>{ const ar=lerp(A0,A1,i/7), p=seg(tm,ar-FD,ar), f=fly[i];
   if(p<=0||p>=1){ f.style.opacity=0; return; }
   const x0=B.sx(s.c), y0=B.sy(s.r)-1.6, x1=R.mouth[0], y1=R.mouth[1], cx=(x0+x1)/2, cy=Math.min(y0,y1)-26, q=p*p*(3-2*p), u=1-q;
   const X=u*u*x0+2*u*q*cx+q*q*x1, Y=u*u*y0+2*u*q*cy+q*q*y1, sc=lerp(1.1,.16,q*q), rot=(i%2?-1:1)*(40+i*14)*q;
   f.style.opacity=(1-seg(p,.85,1)).toFixed(3); f.style.transform=`translate(${(X-s.w/2).toFixed(2)}px,${(Y-s.h/2).toFixed(2)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`; });
  const dep=s=>lerp(A0,A1,s.k/7)-FD, d0=A0-FD; // момент, когда символ отрывается от поля
  const on=t>=tLock&&tm<d0; if(on!==dim){ dim=on; B.S.forEach(s=>{ const w=W.includes(s); s.e.classList.toggle('win',on&&w); s.e.classList.toggle('dim',on&&!w&&!s.isNew); }); }
  brs.forEach((b,i)=>brState(b,t,tLock+i*.04,-1)); brs.forEach((b,i)=>{ const o=1-seg(tm,dep(W[i])-.05,dep(W[i])+.12); if(o<1) b.e.style.opacity=(parseFloat(b.e.style.opacity)*o).toFixed(3); });
  amtSet(amt,seg(t,tAmt,tAmt+.2)*(1-seg(tm,d0-.12,d0+.1)),lerp(.82,1,eob(seg(t,tAmt,tAmt+.3))));
  winSet(wl,seg(tm,A0,A0+.25)*(1-seg(t,tEx,tEx+.2)),.5*eo(seg(tm,A0,A1+.1)));
  const roll=clamp(eob(seg(tm,3.98+SWD,4.3+SWD)),0,1), bump=Math.sin(Math.PI*seg(tm,3.98+SWD,4.58+SWD));
  multSet(mp,seg(t,tIn,tIn+.3)*(1-seg(t,tEx+.1,tEx+.3)),roll,bump);
  root._hot&&root._hot(tm>=3.93+SWD&&tm<4.98+SWD); }
 const loadPoster=async(e,url)=>{ if(e._pu===url) return; e._pu=url; e.poster=url; try{ const im=new Image(); im.src=url; await im.decode(); }catch(x){} };
 async function seekTo(t){
  if(t>=TF){ const walk=t<TW1, e=walk?fw:fvn, ct=walk?wClip(t-TF):vClip(t-TW1); // раскадровка: headless Chromium не играет H.264 — кадр подставляет Demos.poster(имя, время ролика)
   if(Demos.poster){ await loadPoster(e,Demos.poster(walk?'walk':'vanish',ct)); return; }
   await new Promise(res=>{ const k=setTimeout(res,1500); e.addEventListener('seeked',()=>{ clearTimeout(k); res(); },{once:true}); e.pause(); e.currentTime=ct; }); return; }
  if(!vOK) return; const vt=vOf(t-V0); if(Math.abs(v.currentTime-vt)<.01) return; await new Promise(res=>{ const k=setTimeout(res,1500); v.addEventListener('seeked',()=>{ clearTimeout(k); res(); },{once:true}); v.pause(); v.currentTime=vt; }); }
 return {T,frame,off:2.2,still:4.8,v,vids:[v,fw,fvn],seekTo};
}

/* ======================== 3. CAM 03: три приглашения — ставень — Кухня (часть A), затем Камеры (часть B, welcome-cams.js) ======================== */
function D3(root){
 const TA=7.6, st=root.querySelector('.stage'); // TA — длина части A (Кухня); после неё в том же окошке идёт часть B «Камеры» (welcome-cams.js), T — весь круг
 const X=window.WelcomeCams&&WelcomeCams.d3(root,st,{A,SYMU,el,clamp,seg,lerp,eo,ei,eio,eob,RM,Board,Bracket,brState,frameStage,Amount,amtSet,Fsw,multSet}), T=X?TA+X.T:TA;
 const H=frameStage(st,'bg-hall-landscape'), K=frameStage(st,'bg-kitchen-landscape','kit');
 const BH=Board(H.cctv,{x:45,y:19,cw:22.6,ch:19.1,g:2.4,id:'ft3'});
 const LAY=['cbmkoh','gckhbo','ohkcbk','pbmtgc','mkcbhk'], INVP=[[1,1,0],[2,4,0],[3,2,1]]; // приглашения: две приходят со всеми, третья — позже всех
 LAY.forEach((row,r)=>[...row].forEach((ch_,c)=>{ if(!INVP.some(p=>p[0]===r&&p[1]===c)) BH.spr(ch_,c,r); }));
 const INV=INVP.map(([r,c,late])=>{ const s=BH.spr('i',c,r); s.late=late; s.isInv=true; return s; });
 const brs=INV.map(s=>Bracket(H.hud,BH,s.r,s.c)), pings=INV.map(()=>{ const e=el('i','ping'); H.hud.append(e); return e; });
 const BK=Board(K.cctv,{x:53,y:38,cw:17,ch:15,g:2,scene:'kitchen',id:'ft4'}); BK.fill(['kbcmho','hgkcbo','ochkbg','mhbcpk','kcobhm']);
 const fs=Fsw(K.hud,4,40), sw=Sackw(K.hud,4,77), mp=Mult(K.hud,110,19,1,2,3);
 const rk=el('div','rkit',`<img src="${A}uikit/rocco-hall-still.webp" alt="">`); K.cctv.append(rk); // Рокко тот же, что в зале (кадр H-idle в покое, ролики H-*); мешок на «Кухне» спрятан под столом и виден только при высыпании — в демонстрации его нет
 const shut=el('div','shut'); st.append(shut);
 const cr=root.querySelector('.cr'); let crT='';
 /* Кухня, один спин «с начала»: трюк (Рокко бросает 2 WILD из свободной руки), потом четыре кражи кладут монетки в мешок, полный мешок — ступень счётчика и «+3» на FREE SPINS.
    Время — секунды части A; всё считается как функция t (стоп-кадр и «меньше движения» берут любой момент). */
 const tIn=.25, tLate=.95, tLock=1.55, S0=1.95, SD=.95, tHold=S0+SD, L0=3.5, LD=.9, tK=3.8, tOut=7.05;
 const tToss=4.75, TOSS=[[1,4],[3,2]], TDUR=.44;                       // [ряд, столбец] клеток, куда ляжет WILD; перелёт 0,44 с, второй билет на 0,12 с позже
 const tCoin=[5.45,5.61,5.77,5.93], CDUR=.32, CSRC=[[1,0],[3,0],[2,1],[4,1]], CSUM=['$0.40','$0.70','$1.20','$1.60']; // четыре кражи: монетка летит из клетки в окошко SACK, на её прилёте загорается лампа
 const tFull=tCoin[3]+CDUR;                                            // мешок полон (6,25 с): вспышка окошка, ступень счётчика, FREE SPINS 10 → 13
 const HAND=[193.5,110];                                               // свободная рука Рокко (кадр зеркальный, рука со стороны поля): к ней привязан вылет билетов
 const wt=TOSS.map(([r,c])=>{ const s=BK.spr('w',c,r); s.base=BK.S.find(x=>x!==s&&x.r===r&&x.c===c); return s; });
 const tk=TOSS.map(()=>{ const f=el('div','sy fl',`<img src="${SYMU('sym-wild')}" alt="">`); f.style.cssText=bpvT`width:${BK.cw*.98}px;height:${BK.ch*1.02}px;opacity:0`; K.cctv.append(f); return f; });
 const rings=TOSS.map(()=>{ const e=el('i','ping'); K.hud.append(e); return e; });
 const coins=tCoin.map(()=>{ const e=el('i','coin'); K.hud.append(e); return e; });
 const p3=el('div','fsp3','+3'); K.hud.append(p3);
 const sackC=()=>[4+sw.offsetWidth/2,77+sw.offsetHeight/2]; let SC=null; // центр окошка SACK (родные пиксели; offset* не зависят от масштаба экрана)
 const KF=[[0,-102,'in'],[.35,-70,'out'],[.82,-3,'out'],[.9,-5.5,'in'],[.96,-.6,'out'],[1,0,'in']]; // ржавый ставень: тяжело трогается, у пола резко тормозит, подпрыгивает (transitions3.tpl.html)
 const shY=p=>{ for(let i=1;i<KF.length;i++){ if(p<=KF[i][0]){ const a=KF[i-1], b=KF[i], q=(p-a[0])/(b[0]-a[0]); return lerp(a[1],b[1],b[2]==='in'?q*q:1-Math.pow(1-q,3)); } } return 0; };
 let dim=null;
 function frame(t,fz){
  if(X&&X.frame(t-TA,fz)){ [H.cctv,H.hud,K.cctv,K.hud].forEach(e=>{ e.style.display='none'; }); shut.style.visibility='hidden'; return; } // часть B играет сама и гасит слои части A
  const inKit=t>=tHold+.25;
  H.cctv.style.opacity=H.hud.style.opacity=seg(t,0,.25).toFixed(3); // начало круга: из темноты (часть B кончилась затемнением)
  H.cctv.style.display=H.hud.style.display=inKit?'none':'block'; K.cctv.style.display=K.hud.style.display=inKit?'block':'none';
  const dd=s=>s.isInv&&s.late?tLate:tIn+s.c*.065+(4-s.r)*.026;
  for(const s of BH.S){ const d=dd(s), du=s.late?.5:.46, pin=seg(t,d,d+du); BH.put(s,s.r-(s.late?8:6.2)*(1-eob(pin)),{op:pin>0?1:0,sc:s.isInv?1+.07*Math.sin(Math.PI*seg(t,tLock,tLock+.5)):1}); }
  INV.forEach((s,i)=>{ const d=dd(s), du=s.late?.5:.46, pp=seg(t,d+du*.72,d+du*.72+.5), e=pings[i]; e.style.cssText=bpvT`left:${BH.sx(s.c)}px;top:${BH.sy(s.r)}px;opacity:${(.75*(1-pp)*(pp>0?1:0)).toFixed(3)};transform:translate(-50%,-50%) scale(${lerp(.4,1.9,eo(pp)).toFixed(3)})`; });
  const on=t>=tLock&&t<S0+.6; if(on!==dim){ dim=on; BH.S.forEach(s=>{ s.e.classList.toggle('dim',on&&!s.isInv); s.e.classList.toggle('win',on&&!!s.isInv); }); }
  root._hot&&root._hot(t>=tLock&&t<S0+.9);
  brs.forEach((b,i)=>brState(b,t,tLock+i*.06,S0+.5));
  // ставень: падает, стук, пауза, поднимается
  const pf=seg(t,S0,S0+SD), pl_=seg(t,L0,L0+LD), y=t<L0?shY(pf):lerp(0,-102,eio(pl_));
  const shake=t>S0&&t<tHold?Math.sin(t*95)*1.2*(1-Math.abs(.5-pf)):0, th=seg(t,tHold,tHold+.32), tx=Math.sin(th*40)*(1-th)*1.6, ty=Math.sin(th*31)*(1-th)*1.4;
  shut.style.transform=`translate(${shake.toFixed(2)}px,${y.toFixed(2)}%)`; shut.style.visibility=(t>=S0&&t<L0+LD)?'visible':'hidden';
  H.cctv.style.transform=K.cctv.style.transform=(t>=tHold&&t<tHold+.35)?`translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px)`:'none';
  const room=(t>=tHold-.2&&t<tOut+.4)?'KITCHEN':'HALL'; if(room!==crT&&cr){ crT=room; cr.textContent=room; }
  // кухня: поле, окошко FREE SPINS «10», окошко SACK, множитель, Рокко в покое
  const swing=Math.sin(Math.PI*seg(t,tToss,tToss+.5)); // замах свободной руки: Рокко чуть подаётся к полю, билеты вылетают в самом начале замаха
  const tl_=TOSS.map((_,i)=>tToss+.1+i*.12+TDUR);                    // миг приземления каждого билета
  for(const s of BK.S){ const d=tK+s.c*.05+(4-s.r)*.022, pin=seg(t,d,d+.45); let op=pin>0?1:0, sc=1;
   const wi=wt.indexOf(s); if(wi>=0){ const pp=seg(t,tl_[wi],tl_[wi]+.26); op=pp>0?1:0; sc=lerp(.55,1,eob(pp)); }
   else { const bi=wt.findIndex(w=>w.base===s); if(bi>=0&&t>=tl_[bi]) op=0; }
   const ci=CSRC.findIndex(([r,c])=>r===s.r&&c===s.c); if(ci>=0) sc=1+.1*Math.sin(Math.PI*seg(t,tCoin[ci],tCoin[ci]+.26)); // клетка, из которой ушла монетка, чуть вздрагивает
   BK.put(s,s.r-6.2*(1-eob(pin)),{op,sc}); }
  TOSS.forEach(([r,c],i)=>{ const t0=tToss+.1+i*.12, p=seg(t,t0,t0+TDUR), f=tk[i];
   if(p<=0||p>=1){ f.style.opacity=0; } else { const x0=HAND[0], y0=HAND[1], x1=BK.sx(c), y1=BK.sy(r), X_=lerp(x0,x1,p), Y_=lerp(y0,y1,p)-26*4*p*(1-p), sc=lerp(.5,1,eo(p)), rot=(i?1:-1)*(1-p)*34;
    f.style.opacity=1; f.style.transform=`translate(${(X_-BK.cw*.49).toFixed(2)}px,${(Y_-BK.ch*.51).toFixed(2)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`; }
   const pr=seg(t,t0+TDUR,t0+TDUR+.45); rings[i].style.cssText=bpvT`left:${BK.sx(c)}px;top:${BK.sy(r)}px;opacity:${(.8*(1-pr)*(pr>0?1:0)).toFixed(3)};transform:translate(-50%,-50%) scale(${lerp(.4,1.7,eo(pr)).toFixed(3)})`; });
  const pw_=clamp(eob(seg(t,tK+.2,tK+.55)),0,1.1), fo=1-seg(t,tOut,tOut+.3);
  const cnt=t<tFull+.12?Math.round(10*eo(seg(t,tK+.35,tK+1.0))):t<tFull+.24?11:t<tFull+.36?12:13;
  fs.style.opacity=(seg(t,tK+.2,tK+.4)*fo).toFixed(3); fs.style.transform=`scale(${lerp(.7,1,pw_).toFixed(3)})`; if(fs._n!==cnt){ fs._n=cnt; fs._v.textContent=cnt; }
  fs.classList.toggle('pop',t>tK+1.0&&t<tK+1.6||t>tFull+.1&&t<tFull+.7);
  // «+3»: всплывает у FREE SPINS, чуть поднимается и держится до конца
  { const pp=seg(t,tFull+.08,tFull+.38), rise=seg(t,tFull+.08,tFull+.9); p3.style.opacity=(clamp(pp*3,0,1)*fo).toFixed(3); p3.style.transform=`translate(0,${(-lerp(0,5,eo(rise))).toFixed(2)}px) scale(${lerp(.5,1,eob(pp)).toFixed(3)})`; }
  sw.style.opacity=(seg(t,tK+.45,tK+.65)*fo).toFixed(3);
  { const fl=clamp(1-seg(t,tFull,tFull+.5),0,1)*(t>=tFull?1:0); sw.style.transform=`scale(${(lerp(.7,1,clamp(eob(seg(t,tK+.45,tK+.8)),0,1.1))*(1+.07*Math.sin(Math.PI*seg(t,tFull,tFull+.4)))).toFixed(3)})`; sw.classList.toggle('full',t>=tFull); sw.style.setProperty('--fl',fl.toFixed(3)); }
  const sum=tCoin.reduce((n,c,i)=>t>=c+CDUR?i:n,-1); // сколько монеток уже в мешке
  sw._l.forEach((l,i)=>{ const f=t>=tCoin[i]+CDUR?1:0; if(sw._f[i]!==f){ sw._f[i]=f; l.classList.toggle('fl',!!f); } });
  { const txt=sum<0?'$0.00':CSUM[sum], vv=sw.querySelector('.vv'); if(sw._s!==txt){ sw._s=txt; vv.textContent=txt; } }
  if(!SC&&inKit) SC=sackC(); // слои кухни показаны только после ставня: размеры окошка читаем, когда они видны
  coins.forEach((e,i)=>{ const p=seg(t,tCoin[i],tCoin[i]+CDUR);
   if(p<=0||p>=1){ e.style.opacity=0; return; }
   if(!SC) return; const s0=BK.sx(CSRC[i][1]), s1=BK.sy(CSRC[i][0]), q=eio(p), X_=lerp(s0,SC[0],q), Y_=lerp(s1,SC[1],q)-8*4*p*(1-p);
   e.style.opacity=clamp(p*8,0,1)*(1-seg(p,.85,1)); e.style.transform=`translate(${(X_-3).toFixed(2)}px,${(Y_-3).toFixed(2)}px) scale(${lerp(.6,1,eo(seg(p,0,.25))).toFixed(3)})`; });
  { const ml=clamp(eob(seg(t,tFull+.05,tFull+.4)),0,1), mb=Math.sin(Math.PI*seg(t,tFull+.05,tFull+.65)); multSet(mp,seg(t,tK+.7,tK+1.0)*fo,ml,mb); }
  rk.style.opacity=(seg(t,tK+.1,tK+.5)*fo).toFixed(3); rk.style.transform=`translate(${(-1.6*swing).toFixed(2)}px,${(lerp(10,0,eo(seg(t,tK+.1,tK+.6)))+Math.sin(t*2.2)*.8).toFixed(2)}px) rotate(${(-2.2*swing).toFixed(2)}deg)`;
  K.cctv.style.opacity=K.hud.style.opacity=(1-seg(t,tOut,tOut+.4)).toFixed(3); }
 const d={T,frame,off:4.0,still:X?TA+X.still:6.85,dispose:X&&X.dispose}; return d; // «меньше движения»: статичный кадр — последняя пауза части B (×8), без части B — «Кухня» 6,85 с
}

/* ---------- разметка и запуск ---------- */
const INST=[]; let raf=0, t0=0, frozen=null;
function markup(n){ return `<div class="stage dm"></div>`; }
function mount(wel){
 stop();
 wel.querySelectorAll('.scr[data-dm]').forEach(root=>{ const n=+root.dataset.dm, mk=[D1,D2,D3][n]; const d=mk(root); d.root=root; const bay=root.closest('.bay'); root._hot=(on,l)=>{ const b=bay&&bay.querySelectorAll('.cap b')[l||0]; if(b) b.classList.toggle('hot',!!on); }; INST.push(d); }); // _hot(on,l): l — номер строки подписи (окошко 3: две строки)
 const ro=RM(); INST.forEach(d=>d.frame(ro?d.still:0,ro)); if(ro) return;
 t0=performance.now(); raf=requestAnimationFrame(tick);
}
function tick(now){ raf=requestAnimationFrame(tick); if(frozen) return; const s=(now-t0)/1000; INST.forEach(d=>d.frame((s+d.off)%d.T)); }
function unload(v){ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} } // видео не держим после закрытия приветствия (декодер и память)
function stop(){ cancelAnimationFrame(raf); raf=0; frozen=null; INST.forEach(d=>{ (d.vids||[]).forEach(unload); if(d.dispose) d.dispose(); if(d.root) d.root.classList.remove('frz'); }); INST.length=0; } // dispose: часть B окошка 3 снимает мониторы CamRec и чистит таймеры
async function freeze(i,t){ frozen=true; const d=INST[i]; if(!d) return; if(d.root) d.root.classList.add('frz'); if(d.seekTo) await d.seekTo(t); d.frame(t,true); } // frz — затемнение символов в раскадровке без перехода (иначе кадр снимается посреди затухания)
function unfreeze(){ frozen=null; t0=performance.now(); INST.forEach(d=>{ if(d.root) d.root.classList.remove('frz'); }); }
const now=i=>{ const d=INST[i]; return d?(((performance.now()-t0)/1000+d.off)%d.T):0; };
return {markup,mount,stop,freeze,unfreeze,now,INST,poster:null};
})();

/* ---------- разметка ---------- */
const RTP='RTP 96.0%'; // как в правилах (ui.js RULES, dialogs-f.js, index.html): общей константы пока нет — при смене RTP поправить везде
const CAM=[['CAM 01','HALL'],['CAM 02','HALL'],['CAM 03','KITCHEN']];
const CAPS=['<b>8+</b> same symbols anywhere — win','Rocco steals the win — <b>multiplier</b> grows','<span class="cl"><b>3</b> invitations — Kitchen: free spins</span> <span class="cl"><b>4+</b> invitations — Cameras: ×2 ×4 ×8</span>'];
const rv=(x,y)=>`<i class="rv" style="left:${x};top:${y}"></i>`;
const corners=(o='.22em')=>[[o,o],[`calc(100% - ${o} - .42em)`,o],[o,`calc(100% - ${o} - .42em)`],[`calc(100% - ${o} - .42em)`,`calc(100% - ${o} - .42em)`]].map(([x,y])=>rv(x,y)).join('');
const scr=n=>`<div class="scr" data-dm="${n}" role="img" aria-label="${CAPS[n].replace(/<[^>]+>/g,'')}">${Demos.markup(n)}<div class="camhd"><span>${CAM[n][0]} · <span class="cr">${CAM[n][1]}</span></span></div><div class="glass"></div></div>`;
function html(){
 return `<div class="wbg"></div><div class="wvig"></div><div class="col">
  <div class="logo"><div class="glow"></div><img class="base" src="${A}ui/logo-base.webp" alt="Blackout Party"><img class="y" src="${A}ui/logo-y.webp" alt=""></div>
  <div class="wmax"><span class="a">MAX WIN</span><span class="b">25,000×</span></div>
  <div class="console">${[0,1,2].map(n=>`${n?`<i class="sep">${rv('0','.5em')}<i class="rv" style="bottom:.5em"></i></i>`:''}<div class="bay"><div class="bezel">${corners()}${scr(n)}</div><div class="label"><i class="led"></i><div class="cap">${CAPS[n]}</div></div></div>`).join('')}
   <div class="deck"><button class="plbtn" aria-label="Play"><span class="lens"><i></i></span><span class="engr">${rv('.38em','')}PLAY${rv('calc(100% - .8em)','')}</span></button></div></div>
  <div class="rtp">${RTP}</div></div>`;
}

/* ---------- размер: одна единица --u на всё окно; режимы wide / short / tall (ширина W2: 1130 — wide, 905 — short) ---------- */
function fit(wel){
 const S=typeof readSafe==='function'?readSafe({t:0,r:0,b:0,l:0}):{t:0,r:0,b:0,l:0}, W=innerWidth-S.l-S.r, H=innerHeight-S.t-S.b; let mode,u; // без выреза/углов/«домой» (index.html?bpv=0b88879c readSafe; без выреза 0 — как было)
 if(W<H*.9){ mode='tall'; u=Math.min(W/390,H/885,1.25); } // высота: 850 → 885 (2026-10-12: подпись окошка 3 стала в две строки — «Кухня» и «Камеры»)
 else if(H<=520){ mode='short'; u=Math.min(H/465,W/905,1.1); } // 345 → 465: раньше высота почти не ограничивала (ширина была уже), теперь окошко 3 выше на 2–3 строки подписи
 else { mode='wide'; u=Math.min(H/820,W/1130,1.15); }
 wel.dataset.mode=mode; wel.style.setProperty('--u',u.toFixed(4));
 const bg=wel.querySelector('.wbg'); if(bg) bg.style.backgroundImage=bpvT`url(${A}bg-hall-${mode==='tall'?'portrait':'landscape'}.webp)`;
}

/* ---------- открыть / закрыть ---------- */
let playCb=null;
function open(wel,onPlay){
 stop(); playCb=onPlay||null;
 wel.innerHTML=html(); fit(wel);
 // PLAY закрывает; клик по пустому месту (в т.ч. по логотипу и MAX WIN) тоже; клик по пульту с демонстрациями — нет
 wel.onclick=e=>{ if(e.target.closest('.plbtn')||!e.target.closest('.console')) play(); };
 Demos.mount(wel);
}
function play(){ const cb=playCb; playCb=null; if(cb) cb(); }
function stop(){ playCb=null; Demos.stop(); }

window.Welcome={open,play,stop,Demos};
window.Demos=Demos;
})(typeof A==='string'?A:'../assets/');
