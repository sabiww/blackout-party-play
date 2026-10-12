/* Blackout Party — «Камеры»: метка кражи на мониторах («число на экране»), кража Рокко, подброс WILD, удар по столбцу, показ множителя (2026-10-12).
   Отдельный модуль без зависимости от ui.js. Правило бонуса («камеры записывают кражи»): клетки поля — мониторы стены охраны; где Рокко своровал символ,
   монитор отмечается: рамка светится цветом ступени, экран чуть подкрашен, внизу экрана крупное ×2; вторая кража там — ×4, ×8 …; метка живёт весь бонус и умножает выигрыши на этих клетках.
   Ступени (решение владельца 2026-10-12, вариант Б): ×2 кремовая рамка, ×4 янтарная, ×8 янтарная с двойным кольцом, ×16–×32 красная, ×64–×128 красная с медленной пульсацией. Слова REC, точки и плашки нет.
   Рокко по полю не ходит: он появляется на мониторе только в момент кражи. Символы на клетках-мониторах уменьшены, чтобы целиком лежать внутри экрана (не заходить на рамку).

   API (window.CamRec), клетка i = ряд*6 + столбец (6 столбцов, 5 рядов); последний аргумент каждого метода — необязательные opts {K, fast, rm}:
     mount(field)                    кожа-монитор на каждой клетке + слой чисел; можно вызывать сколько угодно раз; символы лежат поверх кожи («на экранах») и вписаны в экран
     rec(i, mult, opts)  -> Promise  первый раз: рамка, подкраска экрана и число ×N зажигаются с мерцанием кинескопа; повышение: пульс, цвет ступени, число прокручивается
     recAll(arr30, opts)             выставить все метки без анимации (перезагрузка, повтор, восстановление); 0 — нет метки
     clear(opts)         -> Promise  убрать все метки (конец бонуса), плавно гаснут
     steal(cells, {onTake}, opts) -> Promise   Рокко на мониторах «записи камер» тянется лапой; onTake(cells) вызывается, когда символы должны исчезнуть; экраны — в помехи и пустые
     toss(cells, opts)   -> Promise  билеты WILD «прилетают» на мониторы (скачок сигнала, билет проявляется); настоящие WILD ставит вызывающий после промиса
     punchCol(c, opts)   -> Promise  столбец c сбивается, как по кинескопу ударили: развёртка катится, на экранах WILD; настоящие WILD ставит вызывающий после промиса
     showMath(cells, factor, opts) -> Promise  мониторы выигрышных клеток вспыхивают, рамки светятся; их числа по очереди отрываются от экранов (передача в один кадр: число на экране гаснет в тот же кадр,
                                     когда его копия появляется на том же месте — вместе их не видно ни кадра) и слетаются в ОДИН итоговый «×N» (растёт с каждым прилётом); он падает на надпись выигрыша,
                                     на касании вжимается в неё и гаснет (сумма вздрагивает), и только потом сумма считается; opts.target — элемент/селектор/{x,y,w,h} (по умолчанию последняя надпись #wlx .wl .amt),
                                     opts.onLand(factor) — один раз, в миг, когда множитель применяется к сумме: ярлык уже погас, сумма начинает считаться (вызывающий здесь запускает свой счёт),
                                     opts.amount {el,from,to,fmt} — необязательный счёт числа (CamRec считает сам, после ярлыка); ярлык и считающаяся сумма на экране вместе не бывают
     finish()                        мгновенно довести все идущие показы до итога (кнопка пропуска); state() -> копия 30 значений; unmount() — снять слои; version
   opts: K — коэффициент скорости (1 обычный, меньше — Turbo/Quick короче), fast — пропуск (сразу итог), rm — «меньше движения» (итог без движения, короткая подсветка).
   Без opts K/fast/rm берутся из window.bpTime (K(), fast(), RM() из ui.js) или из системной настройки; window.__slow замедляет всё (для съёмки).
   Только transform и opacity (пульсация ×64–×128 — прозрачность и масштаб отдельного слоя свечения); слои размером с клетку; полноэкранной перерисовки на кадр нет. Ролики Рокко не используются (кадры камер и лапа — картинки), скорость роликов не трогаем. */
(()=>{
'use strict';
if(window.CamRec&&window.CamRec.version) return;
const COLS=6, ROWS=5, N=30;
const INS=3.2, FIT=84, FITW=85; // экран монитора отступает на INS% клетки с каждой стороны; символ целиком внутри экрана: FIT% клетки (WILD — FITW%), от края клетки ≈8% — с запасом на двойное кольцо ×8
const FS=+(FIT/(100-2*INS)*100).toFixed(2), FSW=+(FITW/(100-2*INS)*100).toFixed(2); // те же размеры в долях экрана (для кадров внутри .cr-scr)
const SCRIPT=(document.currentScript&&document.currentScript.src)||'';
const base=()=>{ try{ if(typeof A==='string') return A; }catch(e){} try{ return new URL('../assets/',SCRIPT||location.href).href; }catch(e){ return '../assets/'; } }; // A — путь к assets из index.html (в сборке артефакта 'assets/'); отдельная страница — рядом с mockup/
const IM={f2:'rocco/cam-C2.webp',f3:'rocco/cam-C3.webp',paw:'rocco/paw.png',wild:'sym-wild.webp'}; // C2 — вдали фигура, C3 — крупно лицо; кадры уже зелёные (ночное видение)
const src=k=>base()+IM[k];

/* ---------- мелочи ---------- */
const mk=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const idx=x=>Array.isArray(x)?x[0]*COLS+x[1]:+x;
const uniq=a=>[...new Set([].concat(a==null?[]:a).map(idx))].filter(i=>Number.isInteger(i)&&i>=0&&i<N);
const fmt=m=>m>=10000?Math.round(m/1000)+'K':String(m);
const tierOf=m=>m>=64?5:m>=16?4:m>=8?3:m>=4?2:1; // ступени: 1 ×2–3 крем, 2 ×4–7 янтарь, 3 ×8–15 янтарь с кольцом, 4 ×16–63 красный, 5 ×64+ красный с пульсацией
const jit=i=>(((i+3)*2654435761)>>>0)%100/100; // постоянный «случайный» сдвиг клетки 0..1: одинаковые экраны не двигаются в унисон
const RMq=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };

/* ---------- состояние ---------- */
const S={field:null,skin:null,over:null,m:[],c:[],R:[],key:'',cell:0,st:new Array(N).fill(0),ro:null,noise:undefined,pre:null,live:new Set(),watch:0};

/* ---------- скорость и пропуск: opts → o ---------- */
function norm(opts){
 const bt=window.bpTime, op=opts&&typeof opts==='object'&&!Array.isArray(opts)?opts:{};
 const rm=op.rm!=null?!!op.rm:(bt&&bt.RM?!!bt.RM():RMq());
 let K=op.K!=null?+op.K:(bt&&bt.K?+bt.K():1*(+window.__slow||1)); if(!(K>=0)) K=1;
 let fast=op.fast!=null?!!op.fast:(!rm&&!!(bt&&bt.fast&&bt.fast()));
 if(!rm&&K<=.06) fast=true;
 return {K,fast,rm:rm&&!fast,rmRaw:rm,anims:[],timers:[]};
}
function begin(o){ S.live.add(o); if(!S.watch) S.watch=setInterval(()=>{ // пропуск из игры (второй Play, Space) гасит и наши показы; поле убрали — тоже
  const bt=window.bpTime; if(!S.live.size){ clearInterval(S.watch); S.watch=0; return; }
  if((bt&&bt.fast&&bt.fast()&&!(bt.RM&&bt.RM()))||(S.field&&!S.field.isConnected)) finish(); },80); }
function end(o){ S.live.delete(o); }
function finish(){ S.live.forEach(o=>{ o.fast=true; o.rm=false; o.anims.slice().forEach(a=>{ try{ a.finish(); }catch(e){} }); o.timers.splice(0).forEach(([t,res])=>{ clearTimeout(t); res(); }); }); }
function an(o,node,kf,opt){ // анимация длиной opt.duration*K; в пропуске и «меньше движения» — ничего (итог ставит вызывающий)
 if(!node||o.fast||o.rm) return Promise.resolve(); const d=(opt.duration||0)*o.K; if(d<=0) return Promise.resolve();
 let a; try{ a=node.animate(kf,{fill:'backwards',easing:'linear',...opt,duration:d,delay:(opt.delay||0)*o.K}); }catch(e){ return Promise.resolve(); }
 o.anims.push(a); return a.finished.catch(()=>{}).then(()=>{ const i=o.anims.indexOf(a); if(i>=0) o.anims.splice(i,1); }); }
const kfs=(pts,total)=>{ const r=pts.map(([t,p,e])=>{ const k={...p,offset:clamp(t/total,0,1)}; if(e) k.easing=e; return k; }); const l=r[r.length-1]; if(l.offset<1){ const {offset,easing,...rest}=l; r.push({...rest,offset:1}); } return r; }; // кадры по времени в мс: [[мс,{свойства},кривая→следующий кадр]]; без кадра на 100% браузер вернул бы значение из CSS — добавляем последний кадр в конец
// fill по умолчанию backwards: после конца действует обычный CSS (так числа и рамки не копят «залипшие» анимации); где итог держится на экране без CSS — fill:'both'
const tl=(o,node,pts,total,opt)=>an(o,node,kfs(pts,total),{duration:total,...opt});
const T=(o,ms)=>new Promise(res=>{ const d=ms*o.K; if(o.fast||o.rm||d<=0) return res(); const rec=[0,res]; rec[0]=setTimeout(()=>{ const i=o.timers.indexOf(rec); if(i>=0) o.timers.splice(i,1); res(); },d); o.timers.push(rec); }); // пауза ×K
const W=(o,ms)=>new Promise(res=>{ if(o.fast) return res(); const rec=[0,res]; rec[0]=setTimeout(()=>{ const i=o.timers.indexOf(rec); if(i>=0) o.timers.splice(i,1); res(); },ms); o.timers.push(rec); }); // пауза в реальном времени («меньше движения»: время прочитать)
const frames=n=>new Promise(res=>{ const f=()=>n--<=0?res():requestAnimationFrame(f); f(); });

/* ---------- стили ---------- */
const CSS=`
.cr-skin,.cr-over,#cr-fly{--cr-cream:218,164,76;--cr-amber:255,200,97;--cr-red:200,50,38;--cr-ink:#070607} /* цвета ступеней: тёплый кремовый, янтарь #FFC861, тёмно-красный (светом, не предметом) */
.cr-m[data-t="1"],.cr-c[data-t="1"],.cr-b[data-t="1"],.cr-tag[data-t="1"]{--r:var(--cr-cream);--num:#F6D891} /* ×2 — тёплое золото (владелец 2026-10-12: «обводка должна быть цветной»; было почти белое #FFF0C8) */
.cr-m[data-t="2"],.cr-c[data-t="2"],.cr-b[data-t="2"],.cr-tag[data-t="2"],.cr-m[data-t="3"],.cr-c[data-t="3"],.cr-b[data-t="3"],.cr-tag[data-t="3"]{--r:var(--cr-amber);--num:#FFC861}
.cr-m[data-t="4"],.cr-c[data-t="4"],.cr-b[data-t="4"],.cr-tag[data-t="4"],.cr-m[data-t="5"],.cr-c[data-t="5"],.cr-b[data-t="5"],.cr-tag[data-t="5"]{--r:var(--cr-red);--num:#FFD98A}
.cr-skin,.cr-over{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;-webkit-user-select:none;user-select:none}
.cr-skin{z-index:var(--cr-z-skin,2)}
.cr-over{z-index:var(--cr-z-over,6)}
.cr-m,.cr-c{position:absolute}
/* кожа монитора: тёмный пластик и стекло. Метка кражи — класс .on и ступень data-t: рамка светится цветом ступени (.cr-rim), экран чуть подкрашен (.cr-tint), число — в слое над символами. Всё статично — перерисовки на кадр нет */
.cr-m.on{z-index:1}
.cr-m::before{content:"";position:absolute;inset:0;border-radius:calc(var(--cell)*.11);background:linear-gradient(155deg,#41372f 0%,#2a221d 42%,#17110e 100%);
 box-shadow:inset 0 0 0 1px rgba(0,0,0,.82),inset 0 1px 0 rgba(216,203,168,.2),inset 0 -2px 3px rgba(0,0,0,.55),0 1px 2px rgba(0,0,0,.65)}
.cr-g{position:absolute;inset:${INS}%;border-radius:calc(var(--cell)*.085);overflow:hidden;background:radial-gradient(120% 110% at 50% 38%,#12292d 0%,#0a161a 54%,#040a0c 100%);
 box-shadow:inset 0 0 0 1px rgba(0,0,0,.9),inset 0 0 calc(var(--cell)*.15) rgba(0,0,0,.9)}
.cr-g::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(127,184,154,.075) 0 1px,transparent 1px 3px)}
.cr-g::after{content:"";position:absolute;inset:0;background:linear-gradient(128deg,rgba(255,255,255,.08) 0%,rgba(255,255,255,0) 36%)}
.cr-tint{position:absolute;inset:0;opacity:0;background:radial-gradient(120% 110% at 50% 38%,rgba(var(--r),.24) 0%,rgba(var(--r),.15) 54%,rgba(var(--r),.11) 100%)}
.cr-m.on .cr-tint{opacity:1}
.cr-rim{position:absolute;inset:0;border-radius:calc(var(--cell)*.11);opacity:0;--w:max(1.5px,calc(var(--cell)*.03));
 box-shadow:inset 0 0 0 var(--w) rgb(var(--r)),inset 0 0 calc(var(--cell)*.14) rgba(var(--r),.42),0 0 calc(var(--cell)*.06) rgba(var(--r),.8),0 0 calc(var(--cell)*.18) rgba(var(--r),.34)}
.cr-m.on .cr-rim{opacity:1}
.cr-m[data-t="3"] .cr-rim{--w:max(1.25px,calc(var(--cell)*.018)); /* ×8: двойная рамка — две линии с тёмным зазором */
 box-shadow:inset 0 0 0 var(--w) rgb(var(--r)),inset 0 0 0 calc(var(--w)*2) rgba(10,9,12,.92),inset 0 0 0 calc(var(--w)*3) rgb(var(--r)),inset 0 0 calc(var(--cell)*.14) rgba(var(--r),.45),0 0 calc(var(--cell)*.07) rgba(var(--r),.85),0 0 calc(var(--cell)*.2) rgba(var(--r),.4)}
.cr-m[data-t="4"] .cr-rim,.cr-m[data-t="5"] .cr-rim{--w:max(2px,calc(var(--cell)*.04));
 box-shadow:inset 0 0 0 var(--w) rgb(var(--r)),inset 0 0 calc(var(--cell)*.16) rgba(var(--r),.55),0 0 calc(var(--cell)*.07) rgba(var(--r),.9),0 0 calc(var(--cell)*.2) rgba(var(--r),.5)}
/* ×64–×128: медленная пульсация — отдельный слой свечения, анимируются только opacity и transform (композитор) */
.cr-pulse{display:none;position:absolute;inset:0;border-radius:calc(var(--cell)*.11);opacity:0;will-change:opacity,transform;
 box-shadow:0 0 calc(var(--cell)*.15) calc(var(--cell)*.025) rgb(var(--r)),inset 0 0 calc(var(--cell)*.16) rgba(var(--r),.7)}
.cr-m.on[data-t="5"] .cr-pulse{display:block;animation:crpulse 2.8s ease-in-out infinite;animation-delay:var(--cr-pd,0s)}
@keyframes crpulse{0%,100%{opacity:0;transform:scale(1)}50%{opacity:1;transform:scale(1.045)}}
.cr-skin.cr-still .cr-pulse{animation:none!important;opacity:.55}
/* символы на мониторах целиком внутри экрана (не заходят на рамку): уменьшены до FIT% клетки, WILD — FITW% (в игре те же правила с !important в ui.css — перебиваем выше по специфичности) */
.cr-on #symlayer .sp img{width:${FIT}%!important;height:${FIT}%!important}
.cr-on #symlayer .sp[data-id="sym-wild"] img{width:${FITW}%!important;height:${FITW}%!important}
.cr-cellmode>.cell{background:none!important} /* символы лежат в самих клетках (нет #symlayer): кожа уходит под клетки */
.cr-cellmode>.cell>img{max-width:${FIT}%!important;max-height:${FIT}%!important}
/* верхний слой: лёгкий блик стекла над символами — символы «на экранах» */
.cr-gl{position:absolute;inset:${INS}%;border-radius:calc(var(--cell)*.085);background:linear-gradient(128deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 30%),repeating-linear-gradient(0deg,rgba(0,0,0,.05) 0 1px,transparent 1px 3px)}
/* число на экране: ×N крупно внизу слева, как показание камеры; цвет — ступени, тёмный контур и тень держат читаемость над любым символом */
.cr-b,.cr-tag{--ol:max(1px,.06em);color:var(--num);white-space:nowrap;letter-spacing:.01em;font-family:"Black Ops One",Impact,"Arial Narrow",sans-serif;font-weight:400;line-height:1;
 --sh:var(--ol) 0 0 var(--cr-ink),calc(-1*var(--ol)) 0 0 var(--cr-ink),0 var(--ol) 0 var(--cr-ink),0 calc(-1*var(--ol)) 0 var(--cr-ink),var(--ol) var(--ol) 0 var(--cr-ink),calc(-1*var(--ol)) var(--ol) 0 var(--cr-ink),var(--ol) calc(-1*var(--ol)) 0 var(--cr-ink),calc(-1*var(--ol)) calc(-1*var(--ol)) 0 var(--cr-ink),0 .07em .14em rgba(0,0,0,.95);
 text-shadow:var(--sh),0 0 .45em rgba(0,0,0,.9)}
.cr-b{position:absolute;left:9%;bottom:6.5%;z-index:3;font-size:clamp(15px,calc(var(--cell)*.34),46px);transform-origin:0 100%}
.cr-b.hot{filter:brightness(1.4)}
.cr-m.hot .cr-rim{filter:brightness(1.5)}
.cr-x{display:inline-flex;align-items:baseline;transform-origin:0 100%}
.cr-b[data-d="3"] .cr-x{font-size:.88em}
.cr-n{display:inline-grid;line-height:1.15;margin:-.1em 0}
.cr-n em{grid-area:1/1;font-style:normal;text-align:left}
.cr-fl{position:absolute;inset:${INS}%;z-index:2;border-radius:calc(var(--cell)*.085);background:rgba(var(--r),.34);box-shadow:inset 0 0 calc(var(--cell)*.12) rgba(var(--r),.55);opacity:0} /* вспышка — ровная прямоугольная заливка по форме экрана, без круглого пятна */
.cr-hl{position:absolute;inset:0;z-index:2;border-radius:calc(var(--cell)*.11);opacity:0;box-shadow:inset 0 0 0 max(2px,calc(var(--cell)*.035)) rgb(var(--r)),0 0 calc(var(--cell)*.1) calc(var(--cell)*.02) rgba(var(--r),.9),0 0 calc(var(--cell)*.26) rgba(var(--r),.45)} /* рамка светится ярче, пока числа выигрышных мониторов в пути (showMath) */
.cr-ring{position:absolute;inset:1%;z-index:2;border-radius:calc(var(--cell)*.12);border:max(2px,calc(var(--cell)*.03)) solid rgb(var(--r));box-shadow:0 0 calc(var(--cell)*.12) rgb(var(--r)),inset 0 0 calc(var(--cell)*.1) rgba(var(--r),.6);opacity:0}
/* экран на время показа: кадры камеры, лапа, помехи. Точно по стеклу монитора (как .cr-g), рамка и метка видны всё время; символ внутри экрана с запасом */
.cr-scr{position:absolute;inset:${INS}%;z-index:1;border-radius:calc(var(--cell)*.085);overflow:hidden;background:#040b0c;opacity:0;will-change:opacity,transform}
.cr-scr>*{position:absolute;left:0;top:0;width:100%;height:100%;will-change:transform,opacity}
.cr-scr img{object-fit:cover;display:block}
.cr-scr .cr-paw{object-fit:contain;filter:sepia(1) hue-rotate(72deg) saturate(1.9) brightness(.72) contrast(1.15);transform-origin:50% 100%;width:84%;left:8%;top:6%;height:100%}
.cr-scr .cr-ft{filter:brightness(1.3) contrast(1.08)}
.cr-scr .cr-f2{transform-origin:50% 40%}
.cr-scr .cr-ln{background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);will-change:auto}
.cr-scr .cr-vg{background:radial-gradient(120% 110% at 50% 45%,transparent 55%,rgba(0,0,0,.55) 100%);will-change:auto}
.cr-scr .cr-wh{background:#D6FBEA;opacity:0}
.cr-scr .cr-snow{background:#0b1c1a;opacity:0;overflow:hidden}
.cr-snow::before{content:"";position:absolute;left:-30%;top:-30%;width:160%;height:160%;background:0 0/96px 96px;image-rendering:pixelated;animation:crhiss .22s steps(1) infinite;will-change:transform}
.cr-snow::after{content:"";position:absolute;left:0;right:0;top:-35%;height:30%;background:linear-gradient(transparent,rgba(170,255,235,.4),transparent);animation:crroll .5s linear infinite;will-change:transform}
.cr-snow.still::before,.cr-snow.still::after{animation:none}
@keyframes crhiss{0%{transform:translate(0,0)}25%{transform:translate(-31px,17px)}50%{transform:translate(23px,-29px)}75%{transform:translate(-17px,-11px)}}
@keyframes crroll{from{transform:translateY(0)}to{transform:translateY(480%)}}
.cr-scr .cr-tear{height:26%;background:linear-gradient(transparent,rgba(210,255,240,.8) 45%,rgba(210,255,240,.9) 55%,transparent);opacity:0}
.cr-scr .cr-pic{display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 110% at 50% 38%,#12292d 0%,#0a161a 54%,#040a0c 100%)}
.cr-scr .cr-wob{background:none}
.cr-strip{position:absolute;left:0;top:0;width:100%;will-change:transform}
.cr-fr{position:relative;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.cr-bar{width:100%;background:#020707;box-shadow:0 -3px 6px rgba(150,255,220,.28),0 3px 6px rgba(150,255,220,.28)}
.cr-sym,.cr-wild{display:block;object-fit:contain!important;width:${FS}%;height:${FS}%;filter:grayscale(0) saturate(.72) contrast(1.1) brightness(.9) drop-shadow(0 4px 5px rgba(0,0,0,.75))} /* как у настоящих символов (#symlayer .sp img): те же FIT/FITW клетки, пересчитанные на экран */
.cr-wild{width:${FSW}%;height:${FSW}%}
.cr-cflash{position:absolute;z-index:5;border-radius:calc(var(--cell)*.1);background:linear-gradient(90deg,rgba(220,255,240,0),rgba(220,255,240,.75) 50%,rgba(220,255,240,0));opacity:0}
/* показ множителя: летящие числа и итоговое ×N — поверх всего окна */
#cr-fly{position:fixed;left:0;top:0;width:0;height:0;z-index:71;pointer-events:none}
.cr-chip,.cr-tag{position:fixed;left:0;top:0;pointer-events:none}
.cr-chip>div{position:absolute;left:0;top:0}
.cr-chip .cr-b{position:static;transform:none;font-size:var(--cfs,16px)}
.cr-tag{display:block;padding:.06em .1em;font-size:var(--tfs,28px);opacity:0;text-shadow:var(--sh),0 0 .6em rgba(0,0,0,.9),0 0 1em rgba(var(--r),.45);will-change:transform,opacity}
.cr-tag::before{content:"";position:absolute;inset:-.3em -.55em;z-index:-1;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.55),rgba(0,0,0,.26) 55%,transparent 76%)} /* тёмное пятно под числом, как под надписью выигрыша: число не сливается с суммой */
.cr-tag .cr-n{margin:-.06em 0}
.cr-hit{position:fixed;left:0;top:0;pointer-events:none;border-radius:50%;background:radial-gradient(closest-side,rgba(255,200,97,0) 56%,rgba(255,226,150,.5) 76%,rgba(255,200,97,0) 100%);opacity:0;will-change:transform,opacity} /* кольцо удара вокруг суммы: середина прозрачная, цифры суммы не закрывает */
@media (prefers-reduced-motion:reduce){.cr-snow::before,.cr-snow::after{animation:none}.cr-pulse{animation:none!important;opacity:.55}}
`;
function css(){ if(document.getElementById('cr-css')) return; const s=mk('style'); s.id='cr-css'; s.textContent=CSS+(noise()!=='none'?'\n.cr-snow::before{background-image:'+noise()+'}':''); document.head.append(s); } // зерно кладём прямо в правило, а не через var(): большая data-строка в переменной пересчитывалась бы на каждом кадре анимации помех (на кадр 7–10 мс стиля)
function noise(){ // зерно помех: маленькая картинка, один раз
 if(S.noise!==undefined) return S.noise;
 try{ const c=document.createElement('canvas'); c.width=c.height=96; const x=c.getContext('2d'), d=x.createImageData(96,96);
  for(let i=0;i<d.data.length;i+=4){ const v=Math.random(); d.data[i]=150; d.data[i+1]=235; d.data[i+2]=210; d.data[i+3]=v>.5?Math.round((v-.5)*2*235):0; }
  x.putImageData(d,0,0); S.noise='url('+c.toDataURL('image/png')+')'; }catch(e){ S.noise='none'; }
 return S.noise; }
function preload(){ if(S.pre) return; S.pre=Object.keys(IM).map(k=>{ const i=new Image(); i.decoding='async'; i.src=src(k); try{ i.decode&&i.decode().catch(()=>{}); }catch(e){} return i; }); }

/* ---------- слои и раскладка ---------- */
function rectsOf(f){ // прямоугольники клеток в пикселях поля; из .cell, иначе из #symlayer или всего поля
 const fw=f.clientWidth, fh=f.clientHeight, fr=f.getBoundingClientRect(); if(!fw||!fh||!fr.width) return null;
 const sx=fr.width/fw, sy=fr.height/fh, ox=fr.left+f.clientLeft*sx, oy=fr.top+f.clientTop*sy, loc=r=>[(r.left-ox)/sx,(r.top-oy)/sy,r.width/sx,r.height/sy];
 const cs=[...f.querySelectorAll('.cell')];
 if(cs.length===N){ const R=cs.map(c=>loc(c.getBoundingClientRect())); if(R.every(r=>r[2]>1&&r[3]>1)) return {R,fw,fh}; }
 const sl=f.querySelector('#symlayer'); let b=sl?loc(sl.getBoundingClientRect()):null; if(!b||b[2]<1) { const p=Math.min(fw,fh)*.006; b=[p,p,fw-2*p,fh-2*p]; }
 const cw=b[2]/COLS, ch=b[3]/ROWS, gx=cw*.014, R=[]; // без решётки .cell — ровная сетка с зазором 1,4% клетки
 for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) R.push([b[0]+c*cw+gx,b[1]+r*ch+gx,cw-2*gx,ch-2*gx]);
 return {R,fw,fh}; }
function layout(){
 const f=S.field; if(!f||!f.isConnected||!S.skin) return; const g=rectsOf(f); if(!g) return;
 const key=g.fw+'x'+g.fh+':'+g.R.map(r=>r.map(v=>Math.round(v*10)).join(',')).join(';'); if(key===S.key) return; S.key=key; S.R=g.R;
 const cell=Math.min(...g.R.map(r=>Math.min(r[2],r[3]))); S.cell=cell;
 for(let i=0;i<N;i++){ const [x,y,w,h]=g.R[i], st={left:(x/g.fw*100).toFixed(3)+'%',top:(y/g.fh*100).toFixed(3)+'%',width:(w/g.fw*100).toFixed(3)+'%',height:(h/g.fh*100).toFixed(3)+'%'}; Object.assign(S.m[i].style,st); Object.assign(S.c[i].style,st); }
 [S.skin,S.over].forEach(e=>e.style.setProperty('--cell',cell.toFixed(1)+'px')); mode(); }
function mode(){ // символы в #symlayer (z 4) — кожа над скатертью и под ним (z 2); символы в самих клетках — кожа первой в поле и под клетками
 const f=S.field; if(!f||!S.skin) return; const cm=!f.querySelector('#symlayer'); if(S.cm===cm) return; S.cm=cm; f.classList.toggle('cr-cellmode',cm); S.skin.style.zIndex=cm?0:''; if(cm) f.prepend(S.skin); }
function mount(field){
 if(typeof field==='string') field=document.querySelector(field); field=field||document.getElementById('field'); if(!field||!field.appendChild) return false;
 css(); preload();
 if(S.field===field&&S.skin&&S.skin.parentNode===field&&S.over&&S.over.parentNode===field){ layout(); return true; }
 unmount(); S.field=field; field.classList.add('cr-on');
 if(getComputedStyle(field).position==='static') field.style.position='relative';
 const sk=mk('div','cr-skin'), ov=mk('div','cr-over'); sk.setAttribute('aria-hidden','true'); ov.setAttribute('aria-hidden','true');
 S.m=[]; S.c=[];
 for(let i=0;i<N;i++){ const m=mk('div','cr-m','<div class="cr-g"><i class="cr-tint"></i></div><i class="cr-rim"></i><i class="cr-pulse"></i>'), c=mk('div','cr-c','<i class="cr-gl"></i>'); m.style.setProperty('--cr-pd',(-jit(i)*2.8).toFixed(2)+'s'); sk.append(m); ov.append(c); S.m.push(m); S.c.push(c); }
 S.skin=sk; S.over=ov; S.key=''; S.cm=undefined; field.append(sk,ov); layout();
 try{ S.ro=new ResizeObserver(()=>{ if(S.raf) return; S.raf=requestAnimationFrame(()=>{ S.raf=0; layout(); }); }); S.ro.observe(field); S.mo=new MutationObserver(()=>{ if(S.raf) return; S.raf=requestAnimationFrame(()=>{ S.raf=0; mode(); layout(); }); }); S.mo.observe(field,{childList:true}); }catch(e){}
 if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>layout());
 S.st.forEach((m,i)=>{ if(m>0) setMark(i,m); }); stillSync(); // поле собрано заново (render()) — метки возвращаются из памяти
 return true; }
function unmount(){ finish(); if(S.ro){ try{ S.ro.disconnect(); }catch(e){} S.ro=null; } if(S.mo){ try{ S.mo.disconnect(); }catch(e){} S.mo=null; } if(S.field) S.field.classList.remove('cr-cellmode'); if(S.skin) S.skin.remove(); if(S.over) S.over.remove(); if(S.field) S.field.classList.remove('cr-on'); S.field=S.skin=S.over=null; S.m=[]; S.c=[]; S.R=[]; S.key=''; }
addEventListener('resize',()=>{ if(S.field) layout(); });

/* ---------- метки на мониторах: рамка + подкраска экрана + число ---------- */
const roOf=i=>S.c[i]&&S.c[i].querySelector(':scope>.cr-b');
const cancelAll=e=>e&&e.getAnimations({subtree:true}).forEach(a=>{ try{ a.cancel(); }catch(x){} });
const digits=m=>fmt(m).length>2?3:1;
function roEl(m){ const b=mk('div','cr-b','<span class="cr-x"><b>×</b><span class="cr-n"><em>'+fmt(m)+'</em></span></span>'); b.dataset.t=tierOf(m); b.dataset.d=digits(m); b.dataset.m=m; return b; }
const peakK=(i,b,max)=>{ const R=S.R[i]; if(!R) return max; const fz=parseFloat(getComputedStyle(b).fontSize)||16, avail=R[2]*(1-INS/100)-R[2]*.09-fz*.07-1, w=b.offsetWidth||1; return clamp(avail/w,1.04,max); }; // пик пульса числа: растёт от левого-нижнего угла и не должен уйти за правый край экрана (×128 на телефоне)
function tierSet(i,t){ const m=S.m[i], c=S.c[i], b=roOf(i); if(!m||!c) return; m.dataset.t=t; c.dataset.t=t; if(b) b.dataset.t=t; }
function stillSync(o){ if(!S.skin) return; const bt=window.bpTime, rm=o&&o.rmRaw!=null?o.rmRaw:(bt&&bt.RM?!!bt.RM():RMq()); S.skin.classList.toggle('cr-still',!!rm); } // «меньше движения»: пульсация ×64+ стоит
function setMark(i,m){ // без анимации
 const c=S.c[i], mon=S.m[i]; if(!c) return; let b=roOf(i); cancelAll(b); cancelAll(mon);
 if(m>0){ if(!b){ b=roEl(m); c.append(b); } else { b.querySelector('.cr-n').innerHTML='<em>'+fmt(m)+'</em>'; b.dataset.d=digits(m); b.dataset.m=m; b.classList.remove('hot'); } tierSet(i,tierOf(m)); }
 else { if(b) b.remove(); delete mon.dataset.t; delete c.dataset.t; }
 mon.classList.remove('hot'); mon.classList.toggle('on',m>0); S.st[i]=m>0?m:0; }
async function rec(i,mult,opts){
 i=idx(i); mult=Math.floor(+mult)||0; if(!(i>=0&&i<N)) return; const had=S.st[i]|0;
 if(mult<=0){ setMark(i,0); return; }
 if(!S.skin){ S.st[i]=mult; return; } // слои ещё не стоят: только запоминаем, mount() выставит
 if(mult===had) return; if(mult<had){ setMark(i,mult); return; }
 const o=norm(opts); begin(o); S.st[i]=mult; stillSync(o);
 try{
  if(o.fast){ setMark(i,mult); return; }
  if(o.rm){ setMark(i,mult); const b=roOf(i), m=S.m[i]; b&&b.classList.add('hot'); m.classList.add('hot'); await W(o,420); b&&b.classList.remove('hot'); m.classList.remove('hot'); return; }
  if(!had) await light(i,mult,o); else await upgrade(i,had,mult,o);
 } finally{ const b=roOf(i); if(S.st[i]===mult&&(!b||b.dataset.m!=String(mult)||b.querySelectorAll('.cr-n em').length!==1||S.m[i].dataset.t!=String(tierOf(mult)))) setMark(i,mult); end(o); } }
async function light(i,mult,o){ // первый раз: рамка и подкраска экрана загораются, число мерцает, как кинескоп при включении
 const c=S.c[i], m=S.m[i], fl=mk('div','cr-fl'), rim=m.querySelector('.cr-rim'), tint=m.querySelector('.cr-tint');
 m.dataset.t=c.dataset.t=tierOf(mult); const b=roEl(mult); c.append(fl,b); m.classList.add('on');
 const S1='step-end';
 await Promise.all([
  tl(o,b,[[0,{opacity:0,transform:'translate(-2.5%,0)'},S1],[40,{opacity:1,transform:'translate(2%,0)'},S1],[85,{opacity:.1,transform:'translate(-1%,0)'},S1],[125,{opacity:1,transform:'none'},S1],[165,{opacity:.35},S1],[205,{opacity:1},S1],[250,{opacity:1}]],250),
  tl(o,rim,[[0,{opacity:0},S1],[40,{opacity:.9},S1],[85,{opacity:.15},S1],[125,{opacity:1},S1],[165,{opacity:.45},S1],[205,{opacity:1},S1],[300,{opacity:1}]],300),
  tl(o,tint,[[0,{opacity:0},'ease-out'],[300,{opacity:1}]],300),
  tl(o,fl,[[0,{opacity:0},'ease-out'],[70,{opacity:.9},'ease-in'],[360,{opacity:0}]],360)]);
 fl.remove(); }
async function upgrade(i,from,to,o){ // повышение: пульс числа и рамки, кольцо, цвет ступени, число прокручивается вверх
 const c=S.c[i], m=S.m[i], b=roOf(i); if(!b) return setMark(i,to);
 const nb=b.querySelector('.cr-n'), old=nb.querySelector('em'), nu=mk('em',null,fmt(to)), rim=m.querySelector('.cr-rim'), fl=mk('div','cr-fl');
 tierSet(i,tierOf(to)); const d0=+b.dataset.d||1, d1=digits(to); b.dataset.d=d1; // трёхзначное (×128) мельче: размер ставим сразу, чтобы число не вылезало за экран, а вид плавно сжимается из прежнего размера масштабом от того же левого-нижнего угла
 const ring=mk('div','cr-ring'); nb.append(nu); c.append(ring,fl); // цвет новой ступени сразу: вспышка и кольцо закрывают смену
 const E='cubic-bezier(.25,.8,.3,1)';
 await Promise.all([
  tl(o,b,[[0,{transform:'scale(1)'},'cubic-bezier(.2,.7,.3,1)'],[120,{transform:'scale('+peakK(i,b,1.36).toFixed(3)+')'},'cubic-bezier(.4,0,.3,1)'],[330,{transform:'scale(1)'}]],330),
  tl(o,rim,[[0,{transform:'scale(1)'},'cubic-bezier(.2,.7,.3,1)'],[110,{transform:'scale(1.045)'},'cubic-bezier(.4,0,.3,1)'],[330,{transform:'scale(1)'}]],330),
  tl(o,fl,[[0,{opacity:0},'ease-out'],[60,{opacity:.85},'ease-in'],[300,{opacity:0}]],300),
  tl(o,old,[[0,{transform:'translateY(0)',opacity:1},E],[120,{transform:'translateY(-40%)',opacity:0},'linear'],[240,{transform:'translateY(-70%)',opacity:0}]],240,{delay:50,fill:'both'}), // старое число уходит вверх и гаснет (без маски: ничего не обрезается, тень и контур целые); остаётся скрытым до удаления
  tl(o,nu,[[0,{transform:'translateY(70%)',opacity:0},E],[160,{transform:'translateY(20%)',opacity:1},E],[240,{transform:'translateY(0)',opacity:1}]],240,{delay:50}), // новое выплывает снизу и проявляется, пока старое гаснет: пустого места между цифрами нет
  tl(o,ring,[[0,{opacity:.95,transform:'scale(.9)'},'cubic-bezier(.2,.7,.3,1)'],[420,{opacity:0,transform:'scale(1.13)'}]],420),
  d1>d0?tl(o,b.querySelector('.cr-x'),[[0,{transform:'scale('+(1/.88).toFixed(4)+')'},'cubic-bezier(.4,0,.3,1)'],[120,{transform:'scale(1)'}]],120):null]);
 old.remove(); ring.remove(); fl.remove(); b.dataset.t=tierOf(to); b.dataset.d=digits(to); b.dataset.m=to; }
function recAll(arr,opts){ arr=Array.from(arr||[]); for(let i=0;i<N;i++){ const m=Math.floor(+arr[i])||0; if(S.skin) setMark(i,m); else S.st[i]=m>0?m:0; } stillSync(norm(opts)); }
async function clear(opts){
 const o=norm(opts); const had=S.st.some(m=>m>0); S.st.fill(0); if(!S.skin) return;
 const bs=S.c.map((c,i)=>[i,roOf(i)]).filter(x=>x[1]), ms=S.m.map((m,i)=>[i,m]).filter(x=>x[1].classList.contains('on'));
 if(!bs.length&&!ms.length) return;
 begin(o);
 try{
  if(!o.fast&&!o.rm){ const fade=(n,i)=>tl(o,n,[[0,{opacity:1},'ease-in'],[260,{opacity:0}]],260,{delay:jit(i)*90,fill:'both'});
   await Promise.all(bs.map(([i,b])=>fade(b,i)).concat(ms.map(([i,m])=>fade(m.querySelector('.cr-rim'),i)),ms.map(([i,m])=>fade(m.querySelector('.cr-tint'),i)),ms.map(([i,m])=>fade(m.querySelector('.cr-pulse'),i)))); }
 } finally{ S.m.forEach((m,i)=>{ cancelAll(m); m.classList.remove('on','hot'); delete m.dataset.t; delete S.c[i].dataset.t; }); bs.forEach(([i,b])=>b.remove()); end(o); } }

/* ---------- экраны: общее для кражи, подброса и удара ---------- */
const cellRectPx=i=>{ const fr=S.field.getBoundingClientRect(), f=S.field, sx=fr.width/(f.clientWidth||1), sy=fr.height/(f.clientHeight||1), r=S.R[i]; return {left:fr.left+f.clientLeft*sx+r[0]*sx,top:fr.top+f.clientTop*sy+r[1]*sy,width:r[2]*sx,height:r[3]*sy}; };
function spriteSrc(i){ // картинка символа, лежащего на клетке (для прокрутки развёртки)
 const sl=S.field&&S.field.querySelector('#symlayer'); if(!sl) return null; const cr=cellRectPx(i);
 for(const sp of sl.querySelectorAll('.sp')){ const r=sp.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2; if(x>cr.left&&x<cr.left+cr.width&&y>cr.top&&y<cr.top+cr.height){ const im=sp.querySelector('img'); return im&&im.src||null; } }
 return null; }
function screenOf(i,html){ const s=mk('div','cr-scr',html); S.c[i].insertBefore(s,S.c[i].querySelector('.cr-b')||null); return s; }
const retire=(nodes,o)=>{ frames(2).then(()=>{ // итоговая картинка держится ещё 2 кадра, чтобы вызывающий успел поставить настоящие символы; потом плавно уходит
  const d=o.fast||o.rm?0:110*o.K; nodes.forEach(n=>{ if(!n.isConnected) return; if(d<=0){ n.remove(); return; } let a; try{ a=n.animate([{opacity:1},{opacity:0}],{duration:d,fill:'forwards'}); }catch(e){} if(a) a.finished.catch(()=>{}).then(()=>n.remove()); else n.remove(); }); }); };

/* ---------- кража: Рокко на мониторах «записи камер» ---------- */
async function steal(cells,cfg,opts){
 const list=uniq(cells), c0=typeof cfg==='function'?{onTake:cfg}:(cfg&&typeof cfg==='object'?cfg:{}), o=norm({...c0,...(opts||{})});
 let taken=false; const take=()=>{ if(taken) return; taken=true; try{ c0.onTake&&c0.onTake(list.slice()); }catch(e){ console.error(e); } };
 if(!list.length||!S.skin){ take(); return; }
 begin(o); const scr=[];
 try{
  if(o.fast){ take(); return; }
  const mkScr=i=>{ const s=screenOf(i,'<img class="cr-ft cr-f2" alt=""><img class="cr-ft cr-f3" alt=""><img class="cr-paw" alt=""><div class="cr-ln"></div><div class="cr-vg"></div><div class="cr-snow"></div><div class="cr-wh"></div>'); s.querySelector('.cr-f2').src=src('f2'); s.querySelector('.cr-f3').src=src('f3'); s.querySelector('.cr-paw').src=src('paw'); scr.push(s); return s; };
  if(o.rm){ // меньше движения: кадр «Рокко крупно» стоит, потом символы уходят, статичные помехи, пусто
   list.forEach(i=>{ const s=mkScr(i); s.style.opacity=1; s.querySelector('.cr-f2').style.opacity=0; s.querySelector('.cr-paw').style.opacity=0; });
   await W(o,480); take(); scr.forEach(s=>{ s.querySelector('.cr-f3').style.opacity=0; const n=s.querySelector('.cr-snow'); n.classList.add('still'); n.style.opacity=1; });
   await W(o,300); return; }
  const TOT=820, TAKE=620, jm=60; // TAKE+jm — после того, как экран самой поздней клетки стал сплошными помехами (610+jm) и до схлопывания (700)
  const done=list.map(i=>{ const s=mkScr(i), d=jit(i)*jm, q=n=>s.querySelector(n);
   return Promise.all([
    tl(o,s,[[0,{opacity:0,transform:'scale(1,1)'},'linear'],[26,{opacity:1},'linear'],[700,{opacity:1,transform:'scale(1,1)'},'cubic-bezier(.5,0,.9,.5)'],[775,{opacity:1,transform:'scale(1.05,.04)'},'linear'],[820,{opacity:0,transform:'scale(1.05,.02)'}]],TOT,{delay:d}),
    tl(o,q('.cr-snow'),[[0,{opacity:1},'linear'],[60,{opacity:1},'ease-out'],[175,{opacity:.1},'linear'],[318,{opacity:.1},'linear'],[331,{opacity:.9},'ease-out'],[374,{opacity:.1},'linear'],[600,{opacity:.1},'linear'],[610,{opacity:1}]],TOT,{delay:d}),
    tl(o,q('.cr-f2'),[[0,{opacity:1,transform:'scale(1.05)'},'cubic-bezier(.35,.1,.6,1)'],[330,{opacity:1,transform:'scale(1.8)'},'linear'],[331,{opacity:0}]],TOT,{delay:d}),
    tl(o,q('.cr-f3'),[[0,{opacity:0}],[330,{opacity:0},'linear'],[331,{opacity:1,transform:'scale(.95)'},'cubic-bezier(.5,0,.9,.55)'],[588,{opacity:1,transform:'scale(1.2)'},'linear'],[606,{opacity:1},'linear'],[607,{opacity:0}]],TOT,{delay:d}),
    tl(o,q('.cr-paw'),[[0,{opacity:0,transform:'translate(14%,82%) rotate(-17deg) scale(.82)'}],[420,{opacity:0,transform:'translate(14%,82%) rotate(-17deg) scale(.82)'},'linear'],[434,{opacity:1,transform:'translate(12%,72%) rotate(-15deg) scale(.86)'},'cubic-bezier(.12,.7,.25,1)'],[596,{opacity:1,transform:'translate(0,-5%) rotate(-3deg) scale(1.5)'},'linear'],[606,{opacity:1},'linear'],[607,{opacity:0}]],TOT,{delay:d}),
    tl(o,q('.cr-wh'),[[0,{opacity:0}],[548,{opacity:0},'ease-in'],[598,{opacity:.92},'linear'],[608,{opacity:.92},'ease-out'],[645,{opacity:0}]],TOT,{delay:d})]); });
  await T(o,TAKE+jm); take();
  await Promise.all(done);
 } finally{ take(); scr.forEach(s=>s.remove()); end(o); } }

/* ---------- подброс WILD: билет «проявляется» на мониторе ---------- */
async function toss(cells,opts){
 const list=uniq(cells), o=norm(opts); if(!list.length||!S.skin) return;
 begin(o); const scr=[];
 try{
  if(o.fast){ return; }
  const mkS=i=>{ const s=screenOf(i,'<div class="cr-pic"><img class="cr-wild" alt=""></div><div class="cr-ln"></div><div class="cr-vg"></div><div class="cr-tear"></div><div class="cr-snow"></div><div class="cr-wh"></div>'); s.querySelector('.cr-wild').src=src('wild'); scr.push(s); return s; };
  if(o.rm){ list.forEach(i=>{ const s=mkS(i); s.style.opacity=1; }); await W(o,350); retire(scr,o); return; }
  const TOT=520;
  const done=list.map(i=>{ const s=mkS(i), d=jit(i)*60, q=n=>s.querySelector(n), ring=mk('div','cr-ring'); S.c[i].append(ring);
   return Promise.all([
    tl(o,s,[[0,{opacity:0},'linear'],[24,{opacity:1}]],TOT,{delay:d,fill:'both'}),
    tl(o,q('.cr-snow'),[[0,{opacity:1},'linear'],[70,{opacity:1},'ease-out'],[215,{opacity:0}]],TOT,{delay:d}),
    tl(o,q('.cr-tear'),[[0,{opacity:0,transform:'translateY(-100%)'},'linear'],[40,{opacity:1,transform:'translateY(-60%)'},'cubic-bezier(.5,0,.8,.6)'],[210,{opacity:1,transform:'translateY(390%)'},'linear'],[211,{opacity:0}]],TOT,{delay:d}),
    tl(o,q('.cr-pic'),[[0,{transform:'translateY(-74%) rotate(-9deg)'},'linear'],[85,{transform:'translateY(-74%) rotate(-9deg)'},'cubic-bezier(.2,.8,.25,1)'],[255,{transform:'translateY(4%) rotate(1.4deg)'},'cubic-bezier(.3,0,.3,1)'],[345,{transform:'none'}]],TOT,{delay:d}),
    tl(o,q('.cr-wh'),[[0,{opacity:0}],[285,{opacity:0},'ease-out'],[320,{opacity:.55},'ease-out'],[470,{opacity:0}]],TOT,{delay:d}),
    tl(o,ring,[[0,{opacity:0,transform:'scale(.9)'}],[300,{opacity:0,transform:'scale(.9)'},'ease-out'],[320,{opacity:.9,transform:'scale(.95)'},'cubic-bezier(.2,.7,.3,1)'],[520,{opacity:0,transform:'scale(1.16)'}]],TOT,{delay:d}).then(()=>ring.remove())]); });
  await Promise.all(done);
 } finally{ if(!o.fast||true) retire(scr,o); end(o); } }

/* ---------- удар по столбцу: кинескоп сбит, развёртка катится, на экранах WILD ---------- */
async function punchCol(c,opts){
 c=+c|0; const o=norm(opts); if(!(c>=0&&c<COLS)||!S.skin) return;
 const list=[0,1,2,3,4].map(r=>r*COLS+c); begin(o); const scr=[], extra=[];
 try{
  if(o.fast) return;
  const mkS=(i,sym)=>{ const R=S.R[i], gh=R[3]*.96, bh=gh*.14; // кадр = экран (96% клетки), между кадрами чёрная полоса гашения
   const fr=(s,w)=>`<div class="cr-fr" style="height:${gh.toFixed(1)}px"><img class="${w?'cr-wild':'cr-sym'}" src="${s}" alt=""></div>`, bar=`<div class="cr-bar" style="height:${bh.toFixed(1)}px"></div>`;
   const sy=sym||src('wild'), sp=fr(sy,0)+bar+fr(sy,0)+bar+fr(sy,0)+bar+fr(src('wild'),1);
   const s=screenOf(i,`<div class="cr-pic"></div><div class="cr-wob"><div class="cr-strip">${sp}</div></div><div class="cr-ln"></div><div class="cr-vg"></div><div class="cr-snow"></div><div class="cr-wh"></div>`);
   scr.push(s); return {s,unit:gh+bh,gh}; };
  if(o.rm){ list.forEach(i=>{ const m=mkS(i,null); m.s.style.opacity=1; m.s.querySelector('.cr-strip').style.transform=`translateY(${-3*m.unit}px)`; }); await W(o,350); retire(scr,o); return; }
  const TOT=640, R0=S.R[c], hit=mk('div','cr-cflash'); // вспышка по всей высоте столбца в миг удара
  const top=Math.min(...list.map(i=>S.R[i][1])), bot=Math.max(...list.map(i=>S.R[i][1]+S.R[i][3])), fw=S.field.clientWidth||1, fh=S.field.clientHeight||1;
  Object.assign(hit.style,{left:(R0[0]/fw*100)+'%',top:(top/fh*100)+'%',width:(R0[2]/fw*100)+'%',height:((bot-top)/fh*100)+'%'}); S.over.append(hit); extra.push(hit);
  const sbar=mk('div','cr-cflash'); Object.assign(sbar.style,{left:hit.style.left,top:hit.style.top,width:hit.style.width,height:(R0[3]*.22/fh*100)+'%'}); sbar.style.background='linear-gradient(transparent,rgba(210,255,240,.9),transparent)'; S.over.append(sbar); extra.push(sbar);
  const colH=bot-top, dist=colH-R0[3]*.22;
  const done=[tl(o,hit,[[0,{opacity:0},'linear'],[16,{opacity:.6},'ease-out'],[150,{opacity:0}]],TOT),
   tl(o,sbar,[[0,{opacity:0,transform:'translateY(0)'},'linear'],[20,{opacity:1,transform:'translateY(0)'},'cubic-bezier(.4,0,.6,1)'],[260,{opacity:1,transform:`translateY(${dist/(R0[3]*.22)*100}%)`},'linear'],[261,{opacity:0}]],TOT,{delay:60})];
  list.forEach(i=>{ const m=mkS(i,spriteSrc(i)), s=m.s, d=jit(i)*35, q=n=>s.querySelector(n), st=q('.cr-strip'), fin=-3*m.unit;
   done.push(tl(o,s,[[0,{opacity:1}],[TOT,{opacity:1}]],TOT,{delay:d,fill:'both'}),
    tl(o,st,[[0,{transform:'translateY(0)'},'cubic-bezier(.12,.62,.2,1)'],[430,{transform:`translateY(${fin*1.012}px)`},'cubic-bezier(.3,0,.3,1)'],[520,{transform:`translateY(${fin}px)`}]],TOT,{delay:60+d,fill:'both'}),
    tl(o,q('.cr-wob'),[[0,{transform:'translateX(-5%) skewX(5deg)'},'linear'],[30,{transform:'translateX(5%) skewX(-6deg)'},'linear'],[75,{transform:'translateX(-4%) skewX(4deg)'},'linear'],[130,{transform:'translateX(3%) skewX(-3deg)'},'linear'],[200,{transform:'translateX(-2%) skewX(2deg)'},'linear'],[290,{transform:'translateX(1%) skewX(-1deg)'},'linear'],[380,{transform:'none'}]],TOT,{delay:d}),
    tl(o,q('.cr-snow'),[[0,{opacity:.55},'linear'],[90,{opacity:.28},'linear'],[220,{opacity:.12},'ease-out'],[420,{opacity:0}]],TOT,{delay:d}),
    tl(o,q('.cr-wh'),[[0,{opacity:.55},'ease-out'],[90,{opacity:.1},'linear'],[430,{opacity:.08},'ease-out'],[455,{opacity:.42},'ease-out'],[560,{opacity:0}]],TOT,{delay:d})); });
  await Promise.all(done);
 } finally{ extra.forEach(n=>n.remove()); retire(scr,o); end(o); } }

/* ---------- показ множителя: числа на экранах → одно итоговое ×N → падает на сумму ---------- */
const cellCenter=i=>{ const r=cellRectPx(i); return [r.left+r.width/2,r.top+r.height/2]; };
function targetOf(op,list){
 let t=op.target; if(typeof t==='string') t=document.querySelector(t);
 if(!t){ const w=document.querySelectorAll('#wlx .wl .amt'); t=w.length?w[w.length-1]:null; } if(!t) t=document.querySelector('#result b')||document.getElementById('result');
 if(t&&t.getBoundingClientRect){ const r=t.getBoundingClientRect(); if(r.width||r.height) return {el:t,x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}; }
 if(t&&typeof t.x==='number') return {el:null,x:t.x,y:t.y,w:t.w||0,h:t.h||0};
 const p=list.map(cellCenter); return {el:null,x:p.reduce((a,v)=>a+v[0],0)/p.length,y:p.reduce((a,v)=>a+v[1],0)/p.length,w:0,h:0}; }
function tween(o,a,ms){ // счёт числа в надписи суммы
 if(!a||!a.el) return Promise.resolve(); const f=a.fmt||(v=>'$'+v.toFixed(2)), from=+a.from, to=+a.to; if(!(isFinite(from)&&isFinite(to))) return Promise.resolve();
 if(o.fast||o.rm||o.K<=0){ a.el.textContent=f(to); return Promise.resolve(); }
 return new Promise(res=>{ const d=ms*o.K, t0=performance.now(); const st=n=>{ const k=clamp((n-t0)/d,0,1); a.el.textContent=f(from+(to-from)*(1-Math.pow(1-k,3))); if(k<1&&!o.fast) requestAnimationFrame(st); else { a.el.textContent=f(to); res(); } }; requestAnimationFrame(st); }); }
const amtFinal=a=>{ if(a&&a.el&&isFinite(+a.to)) a.el.textContent=(a.fmt||(v=>'$'+v.toFixed(2)))(+a.to); };
async function showMath(cells,factor,opts){
 const op=opts&&typeof opts==='object'?opts:{}, o=norm(op), list=uniq(cells).filter(i=>S.st[i]>0&&S.c[i]);
 let landed=false; const land=()=>{ if(landed) return; landed=true; try{ op.onLand&&op.onLand(total); }catch(e){ console.error(e); } };
 if(!list.length||!S.skin) return; // выигрыш без меток: показывать нечего, множитель вызывающий не применяет
 const bi=list.filter(i=>roOf(i)), vals=bi.map(i=>S.st[i]), sum=vals.reduce((a,b)=>a+b,0), total=+factor>0?+factor:sum;
 if(o.fast||!bi.length){ land(); tween(o,op.amount); return; }
 begin(o); const nodes=[], tg=targetOf(op,list), badges=bi.map(i=>roOf(i)), mons=bi.map(i=>S.m[i]);
 let fly=document.getElementById('cr-fly'); if(!fly){ fly=mk('div'); fly.id='cr-fly'; document.body.append(fly); }
 const tfs=clamp((S.cell||60)*.46,24,42), vw=document.documentElement.clientWidth||innerWidth, vh=document.documentElement.clientHeight||innerHeight;
 const tag=mk('div','cr-tag','<span class="cr-x"><b>×</b><span class="cr-n"><em class="cr-tn"></em></span></span>'); tag.style.setProperty('--tfs',tfs+'px'); fly.append(tag); nodes.push(tag);
 const tn=tag.querySelector('.cr-tn'), setTag=v=>{ tn.textContent=fmt(v); tag.dataset.t=tierOf(v); }; setTag(total); const th=tag.offsetHeight, tw=tag.offsetWidth; setTag(vals[0]); // цвет итога — по ступени текущей суммы (растёт вместе с числом)
 const ax=clamp(tg.x,tw/2+8,vw-tw/2-8), above=tg.y-tg.h/2-th*.8-6, up=above>=th/2+8, ay=clamp(up?above:tg.y+tg.h/2+th*.8+6,th/2+8,vh-th/2-8), dir=ay<=tg.y?1:-1; // итоговое число собирается над суммой (под ней, если сверху нет места); dir — откуда оно падает
 const pos=(x,y,k)=>`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${k})`, tx=tg.x, ty=tg.y-tg.h*.08, cy=tg.y-dir*(tg.h*.46+th*.45); // ty — центр суммы; cy — где ярлык касается суммы (нижний край ярлыка у верхнего края надписи; дальше он вжимается внутрь)
 tag.style.transform=pos(ax,ay,.6);
 try{
  if(o.rm){ // меньше движения: числа и рамки подсвечены, итог стоит над суммой; подержался — исчез, сумма сменилась одним шагом (ярлык и сумма никогда не лежат друг на друге)
   badges.forEach(b=>b.classList.add('hot')); mons.forEach(m=>m.classList.add('hot')); setTag(total); tag.style.opacity=1; tag.style.transform=pos(ax,ay,1);
   await W(o,550); tag.style.opacity=0; land(); tween(o,op.amount); await W(o,250); return; }
  // Времена в мс при K=1. Числа уходят с экранов по очереди (T0, +sp …), летят FL, итог растёт с каждым прилётом; HOLD — итог держится; DROP — падает на верхний край надписи суммы (касание);
  // ABS — ярлык вжимается в сумму и гаснет; только потом сумма считается (CNT). Всё от касания до конца счёта: ярлык и считающаяся сумма не пересекаются.
  const n=badges.length, sp=clamp(100/n,20,44), T0=40, FL=140, HOLD=50, DROP=80, ABS=70, CNT=220, RET=150, t0=performance.now();
  const tDrop=T0+(n-1)*sp+FL+HOLD, tHit=tDrop+DROP;
  const until=ms=>new Promise(res=>{ const d=t0+ms*o.K-performance.now(); if(o.fast||d<=0) return res(); const rec=[0,res]; rec[0]=setTimeout(()=>{ const i=o.timers.indexOf(rec); if(i>=0) o.timers.splice(i,1); res(); },d); o.timers.push(rec); });
  const F='forwards', N='none';
  // 1) мониторы выигрышных клеток вспыхивают, рамка светится всё время, пока числа в пути (по ней видно, какие экраны считаются); сами числа на экранах не двигаем
  badges.forEach((b,k)=>{ const c=b.parentNode, f=mk('div','cr-fl'), h=mk('i','cr-hl'); c.append(f,h); nodes.push(f,h);
   tl(o,f,[[0,{opacity:0},'ease-out'],[50,{opacity:.85},'ease-in'],[190,{opacity:0}]],190,{delay:k*8});
   tl(o,h,[[0,{opacity:0},'ease-out'],[50,{opacity:1},'linear'],[tHit,{opacity:1},'ease-in'],[tHit+160,{opacity:0}]],tHit+160,{delay:k*8}); });
  // 2) числа слетаются в одно итоговое «×N». Передача — в один кадр: число на экране гаснет ровно тогда, когда его копия появляется на том же месте, того же размера и вида
  //    (оба действия — анимации с одним и тем же delay на одной шкале времени), так что вместе их не видно ни одного кадра. Вернётся число на экран, когда копии уже нет (с началом падения итога).
  badges.forEach((b,k)=>{ const r=b.getBoundingClientRect(), sx=r.left+r.width/2, sy=r.top+r.height/2, cl=mk('div','cr-chip'), inn=mk('div'), cb=b.cloneNode(true), x=b.querySelector('.cr-x'), dly=T0+k*sp, Y=v=>`translateY(${v.toFixed(3)}px)`;
   cb.style.setProperty('--cfs',getComputedStyle(b).fontSize); inn.append(cb); cl.append(inn); fly.append(cl); nodes.push(cl);
   inn.style.marginLeft=(-r.width/2)+'px'; inn.style.marginTop=(-r.height/2)+'px'; cl.style.transform=`translateX(${sx.toFixed(3)}px)`; inn.style.transform=Y(sy); inn.style.opacity=0; // копия до своего кадра невидима
   an(o,x,[{opacity:0},{opacity:0}],{duration:tDrop-dly+2,delay:dly,fill:N}); // число на экране: пусто с кадра передачи и до возврата (+2 мс запаса, чтобы между скрытием и возвратом не мигнуло)
   an(o,x,[{opacity:0},{opacity:1}],{duration:RET,delay:tDrop,easing:'cubic-bezier(.2,.7,.3,1)',fill:N});
   an(o,cl,[{transform:`translateX(${sx.toFixed(3)}px)`},{transform:`translateX(${ax.toFixed(1)}px)`}],{duration:FL,delay:dly,easing:'cubic-bezier(.5,0,.55,1)',fill:F});
   an(o,inn,[{transform:Y(sy)+' scale(1)'},{transform:Y(sy+(ay-sy)*.14)+' scale(1.16)',offset:.2},{transform:Y(ay)+' scale(.62)'}],{duration:FL,delay:dly,easing:'cubic-bezier(.35,.12,.3,1)',fill:F}); // отрыв: чуть крупнее, потом летит и уменьшается
   tl(o,inn,[[0,{opacity:1},'linear'],[FL*.3,{opacity:1},'ease-in'],[FL*.7,{opacity:0}]],FL,{delay:dly,fill:F}); }); // копия гаснет, не долетая до итога: поверх цифр итога ничего не лежит
  // каждый прилёт прибавляет число в итоге
  let run=0;
  for(let k=0;k<n;k++){ await until(T0+k*sp+FL-10); run+=vals[k]; setTag(k===n-1?total:Math.min(run,total)); tag.style.opacity=1;
   an(o,tag,k?[{transform:pos(ax,ay,1)},{transform:pos(ax,ay,1.17)},{transform:pos(ax,ay,1)}]:[{transform:pos(ax,ay,.6),opacity:0},{transform:pos(ax,ay,1.17),opacity:1,offset:.55},{transform:pos(ax,ay,1),opacity:1}],{duration:k?100:130,easing:'cubic-bezier(.2,.8,.3,1)'}); tag.style.transform=pos(ax,ay,1); }
  setTag(total);
  await until(tDrop);
  // 3) итог приседает и падает на верхний край надписи суммы (касание)
  await an(o,tag,[{transform:pos(ax,ay,1)},{transform:pos(ax,ay-dir*th*.12,1.16),offset:.3},{transform:pos(tx,cy,.9)}],{duration:DROP,easing:'cubic-bezier(.5,0,.85,.5)',fill:F});
  // 4) касание: сумма вздрагивает, по краям — кольцо; ярлык вжимается в сумму и гаснет за ABS; число суммы при этом стоит, считать начнёт после
  const hs=Math.max(tg.w*1.5,tfs*4), hit=mk('div','cr-hit'), P=`translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
  Object.assign(hit.style,{width:hs+'px',height:hs*.7+'px',marginLeft:(-hs/2)+'px',marginTop:(-hs*.35)+'px',transform:P}); fly.append(hit); nodes.push(hit);
  const side=Promise.all([
   an(o,hit,[{opacity:0,transform:P+' scale(.7)'},{opacity:1,transform:P+' scale(1)',offset:.3},{opacity:0,transform:P+' scale(1.4)'}],{duration:220,easing:'ease-out',fill:F}),
   tg.el?an(o,tg.el,[{transform:'scale(1)'},{transform:'scale(1.13)',offset:.3},{transform:'scale(.985)',offset:.7},{transform:'scale(1)'}],{duration:150,easing:'cubic-bezier(.3,.6,.3,1)'}):null]);
  await Promise.all([
   tl(o,tag,[[0,{transform:pos(tx,cy,.9)},'cubic-bezier(.4,0,.7,1)'],[ABS,{transform:pos(tx,cy+(ty-cy)*.5,.5)}]],ABS,{fill:F}),
   tl(o,tag,[[0,{opacity:1},'ease-in'],[ABS*.35,{opacity:.45},'linear'],[ABS*.8,{opacity:0}]],ABS,{fill:F})]);
  tag.style.opacity=0; // ярлыка больше нет; теперь множитель применяется к сумме — она считается
  land(); await Promise.all([side,tween(o,op.amount,CNT)]);
 } finally{ land(); amtFinal(op.amount); badges.forEach(b=>{ b.classList.remove('hot'); cancelAll(b); }); mons.forEach(m=>m.classList.remove('hot')); nodes.forEach(n=>n.remove()); end(o); } }

let ROC=0; const stealR=async(...a)=>{ ROC++; try{ return await steal(...a); } finally{ ROC--; } }; // roccoOn() — Рокко сейчас на мониторах поля (кража): записи камер на фоне (camfeeds.js) в это время его не показывают
window.CamRec={version:1,mount,unmount,rec,recAll,clear,steal:stealR,roccoOn:()=>ROC>0,toss,punchCol,showMath,finish,state:()=>S.st.slice()};
})();
