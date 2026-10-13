/* Blackout Party — шоу большого выигрыша (владелец 2026-10-10: «A1», плашка множителя на сцене; 2026-10-11: «слабые, нужны мощные анимации»).
   Один счётчик суммы растёт, на порогах 10× / 25× / 50× / 100× ставки включаются главы (SOMETHING MOVED, LIGHTS FLICKER, HE'S RIGHT BEHIND YOU, CAMERAS DOWN),
   на максимуме — финал PARTY'S OVER. Сцена — чистая функция времени render(t): перемотка, Turbo, доматывание тапом и «меньше движения» считаются одним кодом.
   2026-10-11 (владелец выбрал вид 3 из эскиза bigwin-v2 в цветах «Вывеска»): сумма и глава стоят на табло «Призовой счётчик» — ржавая краска, кремово-жёлтая плашка BIG WIN (на максимуме — MAX WIN, на итоге бонуса — «… COMPLETE»),
   окно с барабанами суммы (холст), под ним барабан с названием главы, четыре лампы 10× / 25× / 50× / 100× (на максимуме пятая — MAX) и колокольчик. Эскиз и цветовые варианты: mockup/bigwin-v2.html (&pc=1..6), табло 3 перенесено оттуда (PAL3, plq*).
   Цифры берутся из строки суммы (moneyFmt), поэтому любая длина и валюта («25,000,000,000.00 ARS», «15,234.50 SC») сама подбирает размер цифр; остальные картинки и шрифты — те же, что у игры.

   2026-10-11 (правка владельца: строки «× YOUR BET» убраны; шоу сделано мощнее):
   · вход с ударом: свет щёлкает, плашка падает с отскоком, дрожь сцены, искры, пушки с конфетти;
   · сумма — механическое табло на холсте: цифры на барабанах-цилиндрах, одометр (старший барабан движется при переносе младшего), на скорости размытие, копейки в конце тормозят и встают по очереди;
   · на каждом пороге: латунная вспышка плашки, блик по стеклу, «удар» по табло, звонит колокольчик, загорается лампа главы, строка главы перекатывается;
   · конфетти и серпантин в цветах игры с гравитацией и сопротивлением воздуха, лучи прожекторов, красная сирена на 50×, помехи камер на 100×;
   · финал: барабаны встают, плашка садится с отскоком, кромка светится, лампа у подсказки TAP TO CONTINUE мигает;
   · Рокко (параметр адреса ?bwrocco=body|eyes|monitor|none, по умолчанию body; в артефакте выбор лежит в sessionStorage 'bp-bwrocco' — меню «Экраны макета»; отрубленная голова убрана): body — Рокко в рост (bigwin-rocco.js): стоит там же и того же размера, где в игре, в позе покоя, радуется роликом BW-cheer, пока крутится счётчик,
     на MAX WIN — BW-max (подробнее в шапке bigwin-rocco.js; ролики не ускоряются, в Turbo/Quick, при пропуске и «меньше движения» он стоит в покое); eyes — глаза в темноте; monitor — Рокко на мониторе;
   · безопасное мерцание: сбои света на 50× и 100× — по расписанию, не чаще трёх вспышек в секунду; «меньше движения» — сразу итоговый кадр.

   Подключение (index.html?bpv=52316320, до ui.js):   <script src="bigwin-show.js"></script>
   API:  BigWinShow.play({amount, bet, isMax, moneyFmt, onDone, rocco}) → Promise (выполняется после закрытия)
         amount   — выигрыш в валюте (как money()), bet — ставка в валюте (пороги считаются от неё), isMax — раунд закончился максимальным выигрышем
         moneyFmt — money() игры: строка вида «$25,000.00», «25,000.00 SC» или «1,000,000.00 ARS»; префикс и код валюты разбираются сами
         onDone   — вызывается один раз при закрытии;   rocco — 'body' | 'eyes' | 'monitor' | 'none' (если не задан, берётся из адреса ?bwrocco= или из sessionStorage 'bp-bwrocco')
         summary  — {title, btn, hold}: шоу как ИТОГ БОНУСА (2026-10-11, QA m2: раньше после «Камер»/«Кухни» шли два экрана подряд с одной суммой). Когда шоу доиграно, надпись над названием главы
                    («BIG WIN») меняется на title («CAMERAS COMPLETE»), а подсказка — на кнопку btn («CONTINUE»); hold: true — оверлей остаётся на экране после закрытия, пока игра не уйдёт на другую сцену (шторка), или 9,5 с
   Оверлей — это #bp-big (его ищут dialogOpen(), обработчик пробела и симуляция в ui.js); у него есть .next(): первый вызов доматывает счётчик, второй закрывает; .seek(t) — для раскадровок.
   Скорость и «меньше движения» берутся у игры: window.bpTime.GS (holdTurbo / speed==='turbo') и window.bpTime.RM(). window.__sim — мгновенный режим без анимации.
   Пути к картинкам и роликам — от переменной A игры («../assets/», в артефакте «assets/»); ролики: .webm, а в Safari (WebKit) .hevc.mp4 с альфой. */
(()=>{
'use strict';
const A_BASE=()=>typeof A==='string'?A:'../assets/';
const IS_WEBKIT=()=>typeof WEBKIT==='boolean'?WEBKIT:(/AppleWebKit/.test(navigator.userAgent)&&!/Chrome|Chromium|Edg\//.test(navigator.userAgent));
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const sm=u=>{ u=clamp(u); return u*u*(3-2*u); };
const easeOut=u=>1-Math.pow(1-clamp(u),3);
const lerp=(a,b,u)=>a+(b-a)*u;
const osc=(u,a,w,d)=>u<0?0:a*Math.exp(-d*u)*Math.sin(w*u);   // затухающее качание после события (u — секунды с события)
const hash=n=>{ n=Math.imul(n^n>>>15,1|n); n=n+Math.imul(n^n>>>7,61|n)^n; return((n^n>>>14)>>>0)/4294967296; };
const rng32=seed=>{ let a=seed|0; return ()=>{ a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; }; };
const U=v=>`calc(${(+v).toFixed(2)}*var(--bw-u))`;               // длина в «единицах сцены» (1 единица = 1% ширины сцены 16:10)
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DEF_ROCCO='body';   // по умолчанию — Рокко в рост (выбор владельца 2026-10-11); отрубленная голова отклонена

/* ---------------------------------------------------------------- стили ----------------------------------------------------------------
   Пишутся в «cqw» от сцены 16:10, при вставке «Ncqw» превращается в calc(N * --bw-u): на широком окне единица берётся по высоте, поэтому ничего не вылезает.
   «@» — корень оверлея (#bp-big.bw-root: специфичнее старых правил #bp-big), CQW/CQH — настоящие единицы контейнера. */
const CSS=`
@{position:fixed;inset:0;z-index:220;display:block;margin:0;padding:0;overflow:hidden;background:#050304;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;isolation:isolate;container-type:size;color:#efe4c8;
 --bw-u:min(1CQW,1.6CQH);--cx:calc(50CQW - 8*var(--bw-u) - var(--rkdx,0px));--oy:35cqw;--bw-disp:"Black Ops One",Impact,sans-serif;--bw-ui:"Barlow SC",system-ui,sans-serif}
@[data-dev=phone]{--bw-u:1CQW;--cx:50CQW;--oy:37CQH}
@>*{position:absolute}
@ .bw-stage{inset:0;transform:translate(var(--shx,0px),var(--shy,0px)) rotate(var(--shr,0deg))}
@ .bw-stage>*{position:absolute}
@ .bw-bg{inset:-3%;background-position:50% 55%;background-size:cover;background-repeat:no-repeat;filter:saturate(.78);will-change:transform}   /* картинку ставит JS прямо на элемент (setBg): через var() каждое изменение любой переменной на корне (а их десятки за кадр) заставляло браузер заново рисовать весь фон с фильтром — вся сцена перерисовывалась каждый кадр. will-change: фон — свой слой, рисуется один раз */
@ .bw-dim{inset:0;background:#000;opacity:var(--dim,.65);will-change:opacity}   /* затемнение фона вместо filter:brightness — дешевле, цвет тот же */
@[data-dev=phone] .bw-bg{background-position:50% 40%}
@ .bw-wash{inset:0;background:rgb(170,10,8);opacity:calc(var(--i3,0)*.3);mix-blend-mode:multiply}
@ .bw-black{inset:0;background:#000;opacity:var(--blk,0);will-change:opacity}
@ .bw-cv{left:0;top:0;width:100%;height:100%;pointer-events:none}
@ .bw-cvb{mix-blend-mode:screen}
@ .bw-pool{left:60%;right:-4%;top:70%;height:36%;background:radial-gradient(ellipse at 50% 50%,rgba(255,196,110,.22),transparent 68%);opacity:var(--lamp,0)}
@[data-dev=phone] .bw-pool{left:10%;right:10%;top:70%;height:30%}
@ .bw-siren{left:50%;top:0;width:4.2cqw;height:2cqw;transform:translateX(-50%);opacity:var(--i3,0)}
@ .bw-siren b{position:absolute;left:0;right:0;top:0;height:100%;border-radius:0 0 2.1cqw 2.1cqw;background:#3a0f0a;box-shadow:inset 0 0 0 .2cqw #7e5418}
@ .bw-siren i{position:absolute;left:25%;right:25%;bottom:.15cqw;height:1.1cqw;border-radius:50%;background:#ff4a38;opacity:var(--pulse,1);box-shadow:0 0 1.4cqw rgba(255,60,40,.8)}
@[data-dev=phone] .bw-siren{width:9cqw;height:4cqw}
/* Рокко в полный рост (?bwrocco=body): слои .bw-rl (свет) и .bw-rk (сам Рокко) вставляет bigwin-rocco.js; на MAX WIN занавес сдвигается к центру и закрыл бы правый край — Рокко стоит ПЕРЕД ним (плашка .bw-ui поверх обоих) */
@.max .bw-rl,@.max .bw-rk{z-index:4}
/* камеры наблюдения на 100× */
@ .bw-cctv{inset:0;opacity:var(--i4,0)}
@ .bw-cctv>*{position:absolute}
@ .bw-scan{inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.34) 0 2px,transparent 2px 4px)}
@ .bw-tear{left:0;right:0;mix-blend-mode:screen;background:rgba(190,255,225,.2);opacity:var(--tg,0)}
@ .bw-tear.a{top:var(--ty1,10%);height:1.2cqw}@ .bw-tear.b{top:var(--ty2,50%);height:.5cqw}
@ .bw-roll{left:0;right:0;height:16%;top:0;transform:translateY(calc(var(--roll,0)*6.25%));   /* едет transform-ом (1% высоты сцены = 6,25% высоты полосы), а не через top: раскладка не пересчитывается */background:linear-gradient(transparent,rgba(160,220,190,.12),transparent)}
@ .bw-tint{inset:0;background:rgba(40,100,76,.22);mix-blend-mode:screen}
@ .bw-hud{font:400 max(2.1cqw,11px) "VT323",ui-monospace,monospace;color:#7FB89A;letter-spacing:.08em;text-shadow:0 0 .5cqw rgba(127,184,154,.5)}
@[data-dev=phone] .bw-hud{font-size:4.6cqw}
@ .bw-hud.tl{left:2.2cqw;top:1.6cqw}@ .bw-hud.tr{right:2.2cqw;top:1.6cqw}@ .bw-hud.bl{left:2.2cqw;bottom:2.2cqw}
@ .bw-hud .rec{display:inline-block;width:1.3cqw;height:1.3cqw;border-radius:50%;background:#e0402a;margin-right:.6cqw;vertical-align:-.1cqw;opacity:var(--blink,1)}
@ .bw-br{width:3cqw;height:3cqw;border:0 solid #7FB89A;opacity:.8}
@ .bw-br.a{left:1.4cqw;top:1.2cqw;border-left-width:.25cqw;border-top-width:.25cqw}@ .bw-br.b{right:1.4cqw;top:1.2cqw;border-right-width:.25cqw;border-top-width:.25cqw}
@ .bw-br.c{left:1.4cqw;bottom:1.2cqw;border-left-width:.25cqw;border-bottom-width:.25cqw}@ .bw-br.d{right:1.4cqw;bottom:1.2cqw;border-right-width:.25cqw;border-bottom-width:.25cqw}
@ .bw-drop{inset:0;background:#040504;opacity:var(--drop,0)}
@ .bw-noise{inset:-10%;opacity:calc(var(--drop,0)*.7);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='1' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 .8 0 0 0 0 .9 0 0 0 0 .85 0 0 0 1.4 -.35'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E");background-position:var(--nx,0) var(--ny,0)}
@ .bw-vig{inset:0;background:radial-gradient(ellipse 80% 78% at 50% 46%,transparent var(--vs,60%),rgba(0,0,0,.86) 100%)}
@ .bw-cur{top:0;bottom:0;width:19cqw;opacity:min(1,calc(var(--cur,0)*1000));   /* занавес въезжает целиком (transform), а не растёт по ширине: раскладка не пересчитывается; при --cur=0 он за краем и прозрачен (тень не торчит) */
 background:repeating-linear-gradient(90deg,#2a0908 0 1.2cqw,#170403 1.2cqw 2.2cqw);box-shadow:0 0 3cqw rgba(0,0,0,.9);z-index:3}
@[data-dev=phone] .bw-cur{width:14cqw}
@ .bw-cur.l{left:0;transform:translateX(calc((1 - var(--cur,0))*-100%));box-shadow:inset -.4cqw 0 0 #120303,3cqw 0 3cqw rgba(0,0,0,.8)}@ .bw-cur.r{right:0;transform:translateX(calc((1 - var(--cur,0))*100%));box-shadow:inset .4cqw 0 0 #120303,-3cqw 0 3cqw rgba(0,0,0,.8)}
@ .bw-ui{inset:0 16CQW 0 0;inset:0 calc(16*var(--bw-u)) 0 0;z-index:4}
@[data-dev=phone] .bw-ui{inset:0}
@ .bw-ui>*{position:absolute}
/* подсказка: лампа по краям мигает, когда шоу доиграно */
@ .bw-hint{left:0;right:0;bottom:max(3.4%,var(--sa-b,0px));text-align:center;font:600 max(1.5cqw,11px) var(--bw-ui);letter-spacing:.24em;text-transform:uppercase;color:#9c8a74;z-index:5;display:flex;align-items:center;justify-content:center;gap:1.6cqw}
@[data-dev=phone] .bw-hint{font-size:3.4cqw;bottom:max(2.6%,var(--sa-b,0px));letter-spacing:.14em;gap:3cqw}
@ .bw-hl{display:block;flex:none;width:1.05cqw;height:1.05cqw;border-radius:50%;background:#2a1a0c;box-shadow:inset 0 0 0 .18cqw #5a3c10,0 0 0 .14cqw #0d0705;opacity:.8}
@[data-dev=phone] .bw-hl{width:2.7cqw;height:2.7cqw}
@ .bw-hint.ready{color:#FFC861}
@ .bw-hint.btn{bottom:max(4.2%,var(--sa-b,0px));cursor:pointer;outline:none}
@ .bw-hint.btn .bw-hl{display:none}
@ .bw-hint.btn .bw-ht{display:inline-flex;align-items:center;justify-content:center;min-width:max(19cqw,190px);min-height:max(4.6cqw,48px);padding:.6cqw 2.6cqw;border-radius:.9cqw;font:400 max(2cqw,18px)/1.05 var(--bw-disp);letter-spacing:.06em;color:#2a1405;background:radial-gradient(ellipse at 50% 42%,#ffd07a,#f0a93c 66%,#c27a1c);box-shadow:inset 0 0 0 2px #5d3a0b,inset 0 0 0 4px rgba(0,0,0,.4),0 0 0 3px #0a0706,0 0 0 5px #c98a2c,0 0 20px rgba(255,190,80,.28),0 5px 0 #000;animation:none}
@[data-dev=phone] .bw-hint.btn{bottom:max(3.4%,var(--sa-b,0px))}
@[data-dev=phone] .bw-hint.btn .bw-ht{min-width:56cqw;min-height:14cqw;font-size:max(5.4cqw,18px);letter-spacing:.06em;border-radius:2.6cqw}
@ .bw-hint.ready.btn .bw-ht{animation:none;opacity:1}   /* кнопка не мигает (мигала подсказка) */
@ .bw-hint.btn:focus-visible .bw-ht{outline:2px solid #fff3d0;outline-offset:7px;filter:brightness(1.08)}
@ .bw-hint.ready .bw-hl{background:#FFC861;box-shadow:inset 0 0 0 .18cqw #8a5a14,0 0 1.2cqw rgba(255,200,97,.8),0 0 0 .14cqw #0d0705;animation:bw-hl 1.1s steps(1) infinite;opacity:1}
@ .bw-hint.ready .bw-hl.r{animation-delay:-.55s}
@ .bw-hint.ready .bw-ht{animation:bw-ht 1.1s ease-in-out infinite}
@keyframes bw-hl{0%{opacity:1}50%{opacity:.18}}
@keyframes bw-ht{50%{opacity:.62}}
@.bw-rm .bw-hint.ready .bw-hl,@.bw-rm .bw-hint.ready .bw-ht{animation:none}
@ .bw-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
/* ---- табло «Призовой счётчик» (владелец 2026-10-11: вид 3 из эскиза bigwin-v2 в цветах «Вывеска» — ржавая краска, кремово-жёлтая плашка, свет ламп).
   Размеры — в q = 1% ширины плашки (как в эскизе); барабаны и строка главы — холсты (bigwin-show.js, «табло 3») ---- */
@ .bw-obj{left:var(--cx);top:var(--oy);z-index:2;--pw:58;--q:calc(var(--pw)*var(--bw-u)/100);width:calc(var(--pw)*var(--bw-u));font-size:calc(var(--q)*15);transform:translate(-50%,-50%) translate(var(--jx,0px),calc(var(--py,0)*1em)) scale(var(--ps,1))}
@[data-dev=phone] .bw-obj{--pw:94}
/* без Рокко и с глазами плашка по центру (место справа не нужно); с Рокко в рост и на мониторе она сдвинута влево, как в эскизе */
@[data-dev=desk][data-rocco=none],@[data-dev=desk][data-rocco=eyes]{--cx:50CQW}
@[data-dev=desk][data-rocco=none] .bw-ui,@[data-dev=desk][data-rocco=eyes] .bw-ui{inset:0}
@[data-dev=desk][data-rocco=none] .bw-obj,@[data-dev=desk][data-rocco=eyes] .bw-obj{--pw:62}
@ .bw-obj *{box-sizing:border-box}
@ .bw3{position:relative;width:100%;padding-top:calc(5*var(--q));opacity:var(--pa,1);transform:translate(calc(var(--sx,0)*1em),calc((1 - var(--pa,1))*.45em));filter:drop-shadow(0 calc(1.8*var(--q)) calc(2.8*var(--q)) rgba(0,0,0,.62)) drop-shadow(0 0 calc(var(--fin,0)*.55em) rgba(255,190,90,calc(var(--fin,0)*.42)))}
@ .bw3-body{position:relative;border-radius:calc(3*var(--q)) calc(3*var(--q)) calc(2.2*var(--q)) calc(2.2*var(--q));padding:calc(3.2*var(--q)) calc(3.2*var(--q)) calc(2.6*var(--q));display:flex;flex-direction:column;gap:calc(1.8*var(--q));filter:brightness(calc(.55 + .45*var(--ob,1)));
 background-image:var(--bw-chips),var(--bw-wear),var(--bw-grain),linear-gradient(180deg,rgba(255,220,160,.24),rgba(255,220,160,0) 12%,rgba(0,0,0,0) 65%,rgba(30,6,0,.42)),linear-gradient(180deg,#a9402a,#8E2F24 45%,#74261b);background-blend-mode:normal,soft-light,overlay,normal,normal;background-size:calc(70*var(--q)) calc(70*var(--q)),auto,auto,auto,auto;
 box-shadow:inset 0 0 0 calc(.32*var(--q)) #F0D890,inset 0 0 0 calc(.62*var(--q)) rgba(40,8,2,.6),0 0 calc(3.2*var(--q)) rgba(246,224,150,.2),0 0 0 calc(.28*var(--q)) #2a0f0a}
@ .bw3-scr{position:absolute;z-index:1;width:calc(2.3*var(--q));height:calc(2.3*var(--q));border-radius:50%;background:radial-gradient(circle at 36% 30%,#a07a68,#432519 55%,#170a06);box-shadow:0 calc(.25*var(--q)) calc(.4*var(--q)) rgba(0,0,0,.65)}
@ .bw3-scr::after{content:'';position:absolute;left:14%;right:14%;top:calc(50% - .13*var(--q));height:calc(.26*var(--q));background:#0e0503;transform:rotate(var(--r,35deg));border-radius:1px;box-shadow:0 .05em 0 rgba(240,216,144,.25)}
@ .bw3-scr.tl{left:calc(.9*var(--q));top:calc(.9*var(--q));--r:30deg}@ .bw3-scr.tr{right:calc(.9*var(--q));top:calc(.9*var(--q));--r:-60deg}@ .bw3-scr.bl{left:calc(.9*var(--q));bottom:calc(.9*var(--q));--r:80deg}@ .bw3-scr.br{right:calc(.9*var(--q));bottom:calc(.9*var(--q));--r:10deg}
@ .bw3-sign{position:relative;height:calc(10*var(--q));border-radius:calc(1.2*var(--q));display:flex;align-items:center;justify-content:center;background:var(--bw-chips) 0 0/calc(32*var(--q)) calc(32*var(--q)),linear-gradient(180deg,#f8eab2,#ecd490 55%,#d8ba70);
 box-shadow:inset 0 0 0 calc(.25*var(--q)) #7a2418,inset 0 calc(.5*var(--q)) calc(.7*var(--q)) rgba(255,255,255,.45),inset 0 calc(-.5*var(--q)) calc(.7*var(--q)) rgba(120,60,10,.35),0 0 calc(2.4*var(--q)) rgba(246,224,150,.35),0 0 0 calc(.28*var(--q)) #2a0f0a}
@ .bw3-sign::before{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,#a43a24,#7f2a1f 60%,#661f16);opacity:var(--mxm,0);box-shadow:0 0 calc(3.4*var(--q)*var(--mxm,0)) calc(.5*var(--q)*var(--mxm,0)) rgba(246,224,150,.6);pointer-events:none}
@ .bw3-sign span{position:relative;font:400 calc(var(--sf,6.6)*var(--q))/1 var(--bw-disp);letter-spacing:.14em;padding-left:.14em;white-space:nowrap;background:linear-gradient(180deg,#962f22 0%,#7f2418 55%,#6a1b10 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 calc(.22*var(--q)) 0 rgba(255,246,200,.6))}
@ .bw3[data-mx="1"] .bw3-sign span{background-image:linear-gradient(180deg,#fffadb,#F6E096 55%,#ecc968);filter:drop-shadow(0 calc(.25*var(--q)) 0 #3a0f08) drop-shadow(0 0 calc(1*var(--q)) rgba(246,224,150,.5))}
@ .bw3-sign::after{content:'';position:absolute;inset:0;border-radius:inherit;background:var(--bw-wear);mix-blend-mode:overlay;opacity:.5;pointer-events:none}
@ .bw3-win,@ .bw3-tit{position:relative;border-radius:calc(1.4*var(--q));padding:calc(1.5*var(--q));background:linear-gradient(180deg,#2b1710,#190c08);box-shadow:inset 0 0 0 calc(.26*var(--q)) #F0D890,inset 0 calc(.5*var(--q)) calc(.6*var(--q)) rgba(0,0,0,.5),0 0 0 calc(.24*var(--q)) #2a0f0a}
@ .bw3-win canvas,@ .bw3-tit canvas{display:block;width:100%;border-radius:calc(.6*var(--q));box-shadow:0 0 0 calc(.15*var(--q)) #000,inset 0 0 calc(1*var(--q)) #000}
@ .bw3-win canvas{aspect-ratio:87.6/24}
@ .bw3-tit{width:calc(81*var(--q));align-self:center;padding:calc(1.1*var(--q))}@ .bw3-tit canvas{aspect-ratio:78/8.2}
@ .bw3-glass{position:absolute;inset:calc(1.2*var(--q));border-radius:calc(.8*var(--q));pointer-events:none;overflow:hidden;background:linear-gradient(112deg,rgba(255,255,255,.17) 0%,rgba(255,255,255,.05) 30%,rgba(255,255,255,0) 31%,rgba(255,255,255,0) 52%,rgba(255,255,255,.06) 53%,rgba(255,255,255,0) 70%),radial-gradient(ellipse 60% 40% at 20% 0%,rgba(255,235,200,.14),transparent 70%);box-shadow:inset 0 0 calc(.5*var(--q)) rgba(255,255,255,.1)}
@ .bw3-sweep{position:absolute;top:-10%;bottom:-10%;width:34%;left:-34%;background:linear-gradient(100deg,transparent,rgba(255,214,140,.5) 45%,rgba(255,240,200,.7) 52%,transparent);transform:translateX(calc(var(--sw,-1)*294.1176%)) skewX(-14deg);opacity:var(--swo,0)}   /* блик едет transform-ом: 100% ширины стекла = 294,1% ширины блика (34%) */
@ .bw3-fl{position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:0 0 0 calc(.3*var(--q)) #ffe6a8,0 0 calc(2.4*var(--q)) rgba(255,206,110,.9);opacity:var(--fl,0)}
@ .bw3-foot{display:flex;justify-content:center;gap:calc(var(--lg,6)*var(--q));margin-top:calc(.2*var(--q))}
@ .bw3l{display:flex;align-items:center;gap:calc(1*var(--q))}
@ .bw3l i{position:relative;width:calc(2.9*var(--q));height:calc(2.9*var(--q));border-radius:50%;background:radial-gradient(circle at 36% 30%,#6a3a24,#2a110a 70%);box-shadow:0 0 0 calc(.38*var(--q)) #E8D08C,0 0 0 calc(.62*var(--q)) #3a140c,inset 0 calc(.15*var(--q)) calc(.3*var(--q)) rgba(255,255,255,.2)}
@ .bw3l i::after{content:'';position:absolute;inset:calc(.14*var(--q));border-radius:50%;background:radial-gradient(circle at 38% 32%,#fffbe0 0%,#F6E096 42%,#d9b44c 88%);opacity:clamp(0,var(--on,0),1);box-shadow:0 0 calc(3*var(--q)*var(--on,0)) calc(.8*var(--q)*var(--on,0)) rgba(246,224,150,calc(.85*var(--on,0)))}
@ .bw3l em{font:700 calc(2.8*var(--q))/1 var(--bw-ui);font-style:normal;letter-spacing:.1em;color:#fff3c8;text-shadow:0 calc(.1*var(--q)) 0 rgba(40,6,0,.75)}
@ .bw3-bell{position:absolute;right:calc(7*var(--q));top:calc(.2*var(--q));width:calc(7.6*var(--q));height:calc(6.2*var(--q));transform-origin:50% 100%;transform:rotate(calc(var(--bl,0)*1deg));z-index:2}
@ .bw3-bell b{position:absolute;left:0;right:0;top:0;bottom:calc(1*var(--q));border-radius:50% 50% 14% 14%/90% 90% 14% 14%;background:linear-gradient(100deg,#b89448,#f6e7a8 34%,#dcc070 60%,#9a7a34);box-shadow:inset 0 calc(.3*var(--q)) calc(.4*var(--q)) rgba(255,250,220,.6),0 calc(.3*var(--q)) calc(.6*var(--q)) rgba(0,0,0,.5)}
@ .bw3-bell u{position:absolute;left:30%;right:30%;bottom:calc(-.2*var(--q));height:calc(1.8*var(--q));border-radius:50%;background:radial-gradient(circle at 40% 30%,#fff3bc,#8a6a2a)}
/* Рокко: глаза в темноте (?bwrocco=eyes) и Рокко на мониторе (?bwrocco=monitor) — из эскиза bigwin-v2; положение задаёт JS (--ex/--ey в пикселях) */
@ .bw-re{inset:0;opacity:var(--ea,0);pointer-events:none;z-index:1}
@ .bw-re>*{position:absolute;left:0;top:0}
@ .bw-re-pit,@ .bw-re-eyes{transform:translate(calc(var(--ex,0px) - 50%),calc(var(--ey,0px) - 50%))}
@ .bw-re-pit{width:calc(var(--es,2)*24*var(--bw-u));height:calc(var(--es,2)*11*var(--bw-u));background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.84),rgba(0,0,0,.55) 42%,transparent 72%)}
@ .bw-re-eyes{display:flex;gap:calc(var(--es,2)*.95*var(--bw-u));transform:translate(calc(var(--ex,0px) - 50%),calc(var(--ey,0px) - 50%)) rotate(calc(var(--tilt,0)*1deg))}
@ .bw-re-e{position:relative;width:calc(var(--es,2)*var(--bw-u));height:calc(var(--es,2)*var(--bw-u));border-radius:50%;transform:scaleY(var(--bk,1));background:radial-gradient(circle at calc(50% + var(--px,0)*22%) calc(50% + var(--py,0)*22%),#fff3cc 0%,#ffd273 24%,#f2a02e 52%,#a85d0e 80%,rgba(80,36,0,0) 100%);box-shadow:0 0 calc(var(--es,2)*.6*var(--bw-u)) calc(var(--es,2)*.06*var(--bw-u)) rgba(255,170,60,.5),0 0 calc(var(--es,2)*2*var(--bw-u)) rgba(255,130,40,.22)}
@ .bw-re-e b{position:absolute;left:50%;top:50%;width:calc(var(--ps,.34)*100%);height:calc(var(--ps,.34)*100%);border-radius:50%;background:radial-gradient(circle,#1a0c01 0 58%,rgba(26,12,1,0) 100%);transform:translate(calc(-50% + var(--px,0)*var(--es,2)*var(--bw-u)*.55),calc(-50% + var(--py,0)*var(--es,2)*var(--bw-u)*.55))}
@ .bw-mon{--mx:85.5;--my:21;--mw:24;left:calc(50% + (var(--mx) - 50)*var(--bw-u));top:calc(var(--my)*var(--bw-u));width:calc(var(--mw)*var(--bw-u));--q:calc(var(--mw)*var(--bw-u)/100);transform:translate(-50%,-50%) rotate(-2.5deg) translateY(calc(var(--mk,0)*var(--q)*.35));opacity:var(--mo,0);filter:drop-shadow(0 calc(2*var(--q)) calc(3*var(--q)) rgba(0,0,0,.7));z-index:1;pointer-events:none}
@[data-dev=phone] .bw-mon{--mx:71;--my:140;--mw:46}
@ .bw-mon-case{position:relative;border-radius:calc(7*var(--q)) calc(7*var(--q)) calc(5*var(--q)) calc(5*var(--q));padding:calc(6*var(--q)) calc(7*var(--q)) 0;background-image:var(--bw-grain),linear-gradient(180deg,#3a383c,#252428 45%,#19181b);background-blend-mode:overlay,normal;box-shadow:inset 0 calc(.5*var(--q)) 0 rgba(255,255,255,.14),inset 0 calc(-.8*var(--q)) calc(1.2*var(--q)) rgba(0,0,0,.6)}
@ .bw-mon-scr{position:relative;border-radius:calc(6*var(--q));overflow:hidden;aspect-ratio:4/3;background:#020604;box-shadow:0 0 0 calc(1.6*var(--q)) #08080a,inset 0 0 calc(4*var(--q)) #000}
@ .bw-mon-scr>*{position:absolute;inset:0}
@ .bw-mon-bg{background:radial-gradient(ellipse at 50% 60%,#16382a,#06130d 80%)}
@ .bw-mon-v{width:100%;height:100%;object-fit:cover;object-position:50% 38%;transform:scale(1.04)}
@ .bw-mon-nz{background:var(--bw-grain);background-size:calc(30*var(--q));background-position:var(--nzx,0) var(--nzy,0);mix-blend-mode:screen;opacity:var(--nz,.1)}
@ .bw-mon-scan{background:repeating-linear-gradient(180deg,rgba(0,0,0,.4) 0,rgba(0,0,0,.4) calc(.5*var(--q)),transparent calc(.5*var(--q)),transparent calc(1.3*var(--q)));mix-blend-mode:multiply}
@ .bw-mon-vg{background:radial-gradient(ellipse 85% 85% at 50% 48%,transparent 50%,rgba(0,0,0,.62) 100%)}
@ .bw-mon-vg::after{content:'';position:absolute;inset:0;background:rgba(var(--tint,30,90,60),var(--ti,.2));mix-blend-mode:color}
@ .bw-mon-gl{background:linear-gradient(128deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.03) 26%,transparent 27%),radial-gradient(ellipse 40% 22% at 22% 10%,rgba(255,255,255,.1),transparent 70%)}
@ .bw-mon-osd{inset:auto!important;left:5%;right:5%;top:6%;display:flex;justify-content:space-between;font:400 calc(6.4*var(--q))/1 "VT323",ui-monospace,monospace;color:#d9f2e0;text-shadow:0 0 calc(1*var(--q)) rgba(150,255,190,.6)}
@ .bw-mon-osd b{font-weight:400;display:flex;align-items:center;gap:calc(1.4*var(--q))}@ .bw-mon-osd i{position:static;width:calc(2.6*var(--q));height:calc(2.6*var(--q));border-radius:50%;background:#ff4a38;opacity:var(--rec,1);box-shadow:0 0 calc(1.4*var(--q)) rgba(255,70,50,.9)}
@ .bw-mon-pan{height:calc(13*var(--q));display:flex;align-items:center;gap:calc(4*var(--q))}
@ .bw-mon-pan span{font:700 calc(4.6*var(--q))/1 var(--bw-ui);letter-spacing:.2em;color:#16151a;padding:calc(1.4*var(--q)) calc(3*var(--q));border-radius:calc(.8*var(--q));background:linear-gradient(#b9b6ad,#8d8a82)}
@ .bw-mon-led{width:calc(2.6*var(--q));height:calc(2.6*var(--q));border-radius:50%;background:#7affa0;box-shadow:0 0 calc(2.4*var(--q)) rgba(120,255,160,.8)}
@ .bw-mon-kn{margin-left:auto;width:calc(5.6*var(--q));height:calc(5.6*var(--q));border-radius:50%;background:radial-gradient(circle at 36% 28%,#6a686d,#222124 70%);box-shadow:0 calc(.3*var(--q)) calc(.6*var(--q)) #000}
@ .bw-mon-arm{position:absolute;left:62%;bottom:calc(100% - 4*var(--q));width:calc(7*var(--q));height:calc(240*var(--q));background:linear-gradient(90deg,#141416,#58585d 40%,#222226 75%,#0b0b0c);border-radius:calc(1.2*var(--q));z-index:-1}
@ .bw-mon-cab{position:absolute;right:calc(14*var(--q));top:98%;width:calc(30*var(--q));height:calc(34*var(--q));border:calc(2*var(--q)) solid #060607;border-top:0;border-left:0;border-radius:0 0 100% 0;z-index:-1}
/* ============ чистый вид (bwfx ≠ old; владелец 2026-10-12: «без нейрослопа»): плашка — один предмет из игры, без колокольчика, сирены, дуг и свечения ============
   Красная потёртая сталь рамки слота, охристая эмалевая табличка с трафаретом, на нижней планке — настоящие лампочки (стекло, нить, латунный цоколь) и трафаретные цифры порогов; по верхней планке — ряд ламп-марки, часть тусклых и перегоревших.
   Плашка стоит ровно по центру окна (и по горизонтали, и по вертикали); рядом с Рокко ей хватает места из-за ширины --pw. */
@.cl,@.cl[data-dev=phone],@.cl[data-dev=desk][data-rocco=none],@.cl[data-dev=desk][data-rocco=eyes]{--cx:50CQW;--oy:50CQH}
@.cl .bw-ui,@.cl[data-dev=desk][data-rocco=none] .bw-ui,@.cl[data-dev=desk][data-rocco=eyes] .bw-ui{inset:0}
@.cl .bw-obj{--pw:56}
@.cl[data-dev=phone] .bw-obj{--pw:94}
@.cl[data-dev=desk][data-rocco=none] .bw-obj,@.cl[data-dev=desk][data-rocco=eyes] .bw-obj{--pw:60}
@.cl .bw-cvf{z-index:3!important}
@.cl .bw3{padding-top:0;filter:drop-shadow(0 calc(1.2*var(--q)) calc(2*var(--q)) rgba(0,0,0,.62))}
@.cl .bw3-body{border-radius:calc(1.5*var(--q));padding:calc(5.4*var(--q)) calc(3.2*var(--q)) calc(2.4*var(--q));gap:calc(1.8*var(--q));
 background-image:var(--bw-chips),var(--bw-wear),linear-gradient(rgba(150,44,28,.38),rgba(96,24,14,.5)),var(--bw-rust);background-blend-mode:normal,soft-light,normal,normal;background-size:calc(70*var(--q)) calc(70*var(--q)),auto,auto,calc(70*var(--q)) auto;background-color:#4a1810;
 box-shadow:inset 0 0 0 calc(.3*var(--q)) rgba(150,118,52,.5),inset 0 0 0 calc(.62*var(--q)) rgba(18,4,2,.7),0 0 0 calc(.28*var(--q)) #190704}
@.cl .bw3-scr{background:radial-gradient(circle at 36% 30%,#7a5a4a,#35190f 60%,#140805);box-shadow:0 calc(.2*var(--q)) calc(.3*var(--q)) rgba(0,0,0,.6)}
/* ряд ламп на верхней планке (марки): лампа — латунное кольцо, стекло, яркая сердцевина; светит от --e (яркость), мерцание и затухание — JS (plqUpdate) */
@.cl .bw3-rail{position:absolute;left:calc(8*var(--q));right:calc(8*var(--q));top:calc(1.5*var(--q));height:calc(2.6*var(--q));display:flex;justify-content:space-between;align-items:center;pointer-events:none}
@.cl .bw3rb{position:relative;width:calc(2.3*var(--q));height:calc(2.3*var(--q));border-radius:50%;background:#1a0d08;box-shadow:0 0 0 calc(.3*var(--q)) #5e4a22,0 0 0 calc(.55*var(--q)) #190704;--e:clamp(0,calc(var(--on,1)*var(--rf,1)),1.5)}
@.cl .bw3rb::before{content:'';position:absolute;inset:calc(.3*var(--q));border-radius:50%;background:radial-gradient(circle at 50% 50%,#fff0c0 0 22%,#f2b24e 58%,#b8741c);opacity:clamp(0,var(--e),1)}
@.cl .bw3rb::after{content:'';position:absolute;inset:calc(-1.4*var(--q));border-radius:50%;background:radial-gradient(circle,rgba(255,170,64,.5),rgba(255,170,64,0) 68%);opacity:calc(var(--e)*.55);pointer-events:none}
/* рамки окон: тусклая охра вместо светлого кремового канта */
@.cl .bw3-win,@.cl .bw3-tit{box-shadow:inset 0 0 0 calc(.26*var(--q)) #8a6d30,inset 0 calc(.5*var(--q)) calc(.6*var(--q)) rgba(0,0,0,.5),0 0 0 calc(.24*var(--q)) #190704}
@.cl .bw3-glass{opacity:.5}
@.cl .bw3-sweep{background:linear-gradient(100deg,transparent,rgba(255,222,160,.26) 45%,rgba(255,240,205,.36) 52%,transparent)}
@.cl .bw3-fl{box-shadow:0 0 0 calc(.3*var(--q)) #e8cf8c}
/* табличка BIG WIN: матовая охристая эмаль со сколами, красный трафарет без глянца и свечения; на MAX — красная табличка, золотые буквы */
@.cl .bw3-sign{height:calc(9.6*var(--q));border-radius:calc(.7*var(--q));background:var(--bw-chips) 0 0/calc(32*var(--q)) calc(32*var(--q)),linear-gradient(#cbae68,#c1a25a);
 box-shadow:inset 0 0 0 calc(.9*var(--q)) #c1a25a,inset 0 0 0 calc(1.2*var(--q)) #6c1e14,0 0 0 calc(.28*var(--q)) #190704}
@.cl .bw3-sign::before{background:#5c1912;box-shadow:none}
@.cl .bw3-sign span{background:none;-webkit-background-clip:border-box;background-clip:border-box;color:#6c1e14;filter:url(#bw-worn)}
@.cl .bw3[data-mx="1"] .bw3-sign span{background:none;color:#e4c26a;filter:url(#bw-worn)}
@.cl .bw3-sign::after{opacity:.4}
/* нижняя планка: тёмная стальная пластина, на ней — лампочки порогов и трафаретные цифры */
@.cl .bw3-foot{margin:calc(.2*var(--q)) calc(1.6*var(--q)) 0;padding:calc(1.4*var(--q)) calc(2*var(--q)) calc(1.2*var(--q));justify-content:space-around;gap:0;border-radius:calc(.7*var(--q));
 background-image:var(--bw-grain),linear-gradient(#17100c,#0c0706);background-blend-mode:overlay,normal;box-shadow:inset 0 0 0 calc(.2*var(--q)) #3a2418,inset 0 calc(.3*var(--q)) calc(.5*var(--q)) rgba(0,0,0,.6),0 0 0 calc(.24*var(--q)) #190704}
@.cl .bw3l{flex-direction:column;align-items:center;gap:calc(.5*var(--q));--e:clamp(0,calc(var(--on,0)*var(--fk,1)),1.6)}
@.cl .bw3l em{font:400 calc(3.1*var(--q))/1 var(--bw-disp);letter-spacing:.08em;text-shadow:none;color:#6e604a;color:color-mix(in srgb,#f1dfae calc(clamp(0,var(--e),1)*100%),#6e604a);filter:url(#bw-worn)}
@.cl .bw3-bulb{display:block;width:calc(3.7*var(--q));height:calc(5.9*var(--q));overflow:visible}
@.cl .bw3-bulb .gl{fill:#1f1510;stroke:#4a3a2a;stroke-width:1.1}
@.cl .bw3-bulb .lt{fill:#f0aa44;opacity:calc(clamp(0,var(--e),1)*.62)}
@.cl .bw3-bulb .f0{fill:none;stroke:#6a5842;stroke-width:1.5;stroke-linejoin:round}
@.cl .bw3-bulb .f1{fill:none;stroke:#fff1c2;stroke-width:2.2;stroke-linejoin:round;opacity:clamp(0,var(--e),1)}
@.cl .bw3-bulb .cp{fill:#6b5326}
@.cl .bw3-bulb .cp2{fill:#8a6d30}
@.cl .bw3-bulb .hl{fill:url(#bw-halo);opacity:calc(var(--e)*.7)}
@.cl .bw3-title{filter:none}
/* подсказка: потёртый трафарет на тёмной планке, как надпись на металле у пола; без свечения и мигания */
@.cl .bw-hint{left:50%;right:auto;transform:translateX(-50%);bottom:max(3.4%,var(--sa-b,0px));white-space:nowrap;gap:0;padding:calc(.72*var(--bw-u)) calc(2.6*var(--bw-u)) calc(.64*var(--bw-u));border-radius:calc(.25*var(--bw-u));
 background:var(--bw-grain),linear-gradient(#16100c,#0a0605);background-blend-mode:overlay,normal;box-shadow:inset 0 0 0 1px #33221a,0 0 0 1px #0a0504,0 calc(.3*var(--bw-u)) calc(.7*var(--bw-u)) rgba(0,0,0,.6);color:#a8987a;font:400 max(1.4cqw,11px)/1 var(--bw-disp);letter-spacing:.2em;text-shadow:none}
@.cl .bw-hint::before,@.cl .bw-hint::after{content:'';position:absolute;top:50%;width:calc(.62*var(--bw-u));height:calc(.62*var(--bw-u));margin-top:calc(-.31*var(--bw-u));border-radius:50%;background:radial-gradient(circle at 36% 30%,#6a5a4a,#2a1a10 70%);box-shadow:0 0 0 1px #0a0504}
@.cl .bw-hint::before{left:calc(.95*var(--bw-u))}@.cl .bw-hint::after{right:calc(.95*var(--bw-u))}
@.cl .bw-hint .bw-hl{display:none}
@.cl .bw-hint .bw-ht{display:inline-block;filter:url(#bw-worn)}
@.cl .bw-hint.ready{color:#d8c69a}
@.cl .bw-hint.ready .bw-ht,@.cl .bw-hint.ready .bw-hl{animation:none}
@.cl[data-dev=phone] .bw-hint{font-size:max(3.1cqw,11px);letter-spacing:.14em;padding:calc(1.5*var(--bw-u)) calc(6*var(--bw-u)) calc(1.4*var(--bw-u));bottom:max(3.4%,var(--sa-b,0px))}
@.cl[data-dev=phone] .bw-hint::before{left:calc(2.2*var(--bw-u));width:calc(1.5*var(--bw-u));height:calc(1.5*var(--bw-u));margin-top:calc(-.75*var(--bw-u))}
@.cl[data-dev=phone] .bw-hint::after{right:calc(2.2*var(--bw-u));width:calc(1.5*var(--bw-u));height:calc(1.5*var(--bw-u));margin-top:calc(-.75*var(--bw-u))}
@.cl .bw-hint.btn{padding:0;background:none;box-shadow:none;left:0;right:0;transform:none}
@.cl .bw-hint.btn::before,@.cl .bw-hint.btn::after{display:none}
/* ---- 2026-10-12 (fb/win2): пороги — простые плоские кружки (залит/пуст, без стекла, нити и свечения); верх плашки — болты / перфорация / бирка / ничего ---- */
@.cl[data-lamp=dots] .bw3l{gap:calc(.9*var(--q))}
@.cl .bw3dot{display:block;width:calc(3.5*var(--q));height:calc(3.5*var(--q));border-radius:50%;box-sizing:border-box;border:calc(.4*var(--q)) solid #d6a847;border:calc(.4*var(--q)) solid color-mix(in srgb,#d6a847 calc(clamp(0,calc(var(--e)*2.4 - .6),1)*100%),#6a5336);background:color-mix(in srgb,#d6a847 calc(clamp(0,calc(var(--e)*2.4 - .6),1)*100%),#120a07)}
@.cl[data-lamp=dots] .bw3-foot{padding:calc(1.5*var(--q)) calc(2*var(--q)) calc(1.3*var(--q))}
@.cl[data-top=bolts] .bw3-rail{top:calc(1.35*var(--q));height:calc(2*var(--q))}
@.cl[data-top=bolts] .bw3rb{width:calc(2.5*var(--q));height:calc(2.5*var(--q));background:#6b5a42;box-shadow:inset 0 0 0 calc(.3*var(--q)) #3a2a1c,0 calc(.2*var(--q)) 0 rgba(0,0,0,.6);--e:1}
@.cl[data-top=bolts] .bw3rb::before{inset:auto;left:16%;right:16%;top:calc(50% - .21*var(--q));height:calc(.42*var(--q));border-radius:0;background:#1a0d08;opacity:1;transform:rotate(calc(var(--k,0)*1deg))}
@.cl[data-top=bolts] .bw3rb::after{display:none}
@.cl[data-top=bolts] .bw3rb:nth-child(3n+1){--k:-24}@.cl[data-top=bolts] .bw3rb:nth-child(3n+2){--k:12}@.cl[data-top=bolts] .bw3rb:nth-child(3n){--k:58}@.cl[data-top=bolts] .bw3rb:nth-child(5n){--k:-70}
@.cl[data-top=bolts] .bw3-scr{display:none}
@.cl[data-top=perf] .bw3-body{padding-top:calc(6.6*var(--q))}
@.cl[data-top=perf] .bw3-body::before{content:'';position:absolute;left:calc(1.2*var(--q));right:calc(1.2*var(--q));top:calc(2.5*var(--q));height:calc(1*var(--q));background:radial-gradient(circle at 50% 50%,#0f0705 0 calc(.62*var(--q)),transparent calc(.66*var(--q))) 0 0/calc(2.6*var(--q)) 100% repeat-x;pointer-events:none}
@.cl[data-top=perf] .bw3-body::after{content:'';position:absolute;left:calc(1.2*var(--q));right:calc(1.2*var(--q));top:calc(4.6*var(--q));height:0;border-top:calc(.2*var(--q)) dashed rgba(14,5,3,.55);pointer-events:none}
@.cl[data-top=perf] .bw3-rail{display:none}
@.cl[data-top=tag] .bw3-body::before{content:'WINNER';position:absolute;right:calc(5*var(--q));top:calc(.9*var(--q));width:calc(15*var(--q));height:calc(3.6*var(--q));box-sizing:border-box;padding:calc(.78*var(--q)) 0 0 calc(3.4*var(--q));background:#d3c398;color:#5c1912;font:400 calc(1.9*var(--q))/1 var(--bw-disp);letter-spacing:.14em;clip-path:polygon(calc(1.6*var(--q)) 0,100% 0,100% 100%,calc(1.6*var(--q)) 100%,0 50%);transform:rotate(-3deg);transform-origin:0 50%;filter:url(#bw-worn);z-index:2;box-shadow:0 calc(.2*var(--q)) 0 rgba(0,0,0,.5)}
@.cl[data-top=tag] .bw3-body::after{content:'';position:absolute;right:calc(17.2*var(--q));top:calc(2.15*var(--q));width:calc(.8*var(--q));height:calc(.8*var(--q));border-radius:50%;background:#190704;box-shadow:0 0 0 calc(.22*var(--q)) #86724f;z-index:3}
@.cl[data-top=tag] .bw3-rail{display:none}
@.cl[data-top=none] .bw3-rail{display:none}
@.cl[data-top=none] .bw3-body{padding-top:calc(3.2*var(--q))}
/* ---- варианты плашки (data-pl), ламп (data-lamp) и надписи (data-hint): выбор в тест-панели, адрес ?bwpl= ?bwlamp= ?bwhint= ---- */
@.cl[data-pl=ticket] .bw3-body{background-image:var(--bw-grain),var(--bw-wear),linear-gradient(#dccfa8,#cdbd92);background-blend-mode:overlay,soft-light,normal;background-size:auto;background-color:#d6c89e;border-radius:calc(.8*var(--q));
 box-shadow:inset 0 0 0 calc(.5*var(--q)) #d6c89e,inset 0 0 0 calc(.8*var(--q)) #8a2f24;
 -webkit-mask:radial-gradient(circle at 0 62%,transparent calc(2.4*var(--q)),#000 calc(2.5*var(--q))) left/51% 100% no-repeat,radial-gradient(circle at 100% 62%,transparent calc(2.4*var(--q)),#000 calc(2.5*var(--q))) right/51% 100% no-repeat;mask:radial-gradient(circle at 0 62%,transparent calc(2.4*var(--q)),#000 calc(2.5*var(--q))) left/51% 100% no-repeat,radial-gradient(circle at 100% 62%,transparent calc(2.4*var(--q)),#000 calc(2.5*var(--q))) right/51% 100% no-repeat}
@.cl[data-pl=ticket] .bw3-scr,@.cl[data-pl=ticket] .bw3-rail,@.cl[data-pl=wood] .bw3-rail,@.cl[data-pl=board] .bw3-rail{display:none}
@.cl[data-pl=ticket] .bw3-body{padding-top:calc(3.2*var(--q))}
@.cl[data-pl=ticket] .bw3-sign{background:#8a2f24;box-shadow:0 0 0 calc(.28*var(--q)) #5c1912}
@.cl[data-pl=ticket] .bw3-sign span{color:#e6d6aa}
@.cl[data-pl=ticket] .bw3[data-mx="1"] .bw3-sign span{color:#f0cf74}
@.cl[data-pl=ticket] .bw3-sign::before{background:#4a120c}
@.cl[data-pl=wood] .bw3-body{background-image:var(--bw-wear),linear-gradient(rgba(30,8,4,.25),rgba(30,8,4,.35)),var(--bw-wood);background-blend-mode:soft-light,normal,normal;background-size:auto,auto,calc(80*var(--q)) auto;background-color:#3a1710;padding-top:calc(3.2*var(--q));
 box-shadow:inset 0 0 0 calc(.5*var(--q)) #9a7a38,inset 0 0 0 calc(.85*var(--q)) #2a0f08,0 0 0 calc(.28*var(--q)) #190704}
@.cl[data-pl=wood] .bw3-scr{background:radial-gradient(circle at 36% 30%,#d8b868,#8a6a28 60%,#4a3510)}
@.cl[data-pl=wood] .bw3-sign{background:linear-gradient(#b8923e,#a8852f);box-shadow:inset 0 0 0 calc(.3*var(--q)) #5a4010,0 0 0 calc(.28*var(--q)) #190704}
@.cl[data-pl=wood] .bw3-sign span{color:#2a1608}
@.cl[data-pl=wood] .bw3[data-mx="1"] .bw3-sign span{color:#f2d27a}
@.cl[data-pl=wood] .bw3-sign::before{background:#4a120c}
@.cl[data-pl=gun] .bw3-body{background-image:var(--bw-wear),linear-gradient(rgba(20,22,24,.22),rgba(10,12,14,.4)),var(--bw-gun);background-blend-mode:soft-light,normal,normal;background-size:auto,auto,calc(70*var(--q)) auto;background-color:#3c4044;
 box-shadow:inset 0 0 0 calc(.3*var(--q)) rgba(170,170,160,.35),inset 0 0 0 calc(.62*var(--q)) rgba(10,10,12,.65),0 0 0 calc(.28*var(--q)) #0e0f10}
@.cl[data-pl=gun] .bw3-sign{background:linear-gradient(#b4b0a2,#a9a596);box-shadow:inset 0 0 0 calc(.3*var(--q)) #6c1e14,0 0 0 calc(.28*var(--q)) #0e0f10}
@.cl[data-pl=board] .bw3-body{background-image:var(--bw-grain),var(--bw-wear),linear-gradient(#a98655,#977545);background-blend-mode:overlay,soft-light,normal;background-size:auto;background-color:#a07e4e;border-radius:calc(.4*var(--q));padding-top:calc(3.4*var(--q));
 box-shadow:inset 0 0 0 calc(.3*var(--q)) rgba(60,36,14,.5),0 0 0 calc(.2*var(--q)) #2a1a0a}
@.cl[data-pl=board] .bw3-scr{width:calc(7*var(--q));height:calc(2.6*var(--q));border-radius:calc(.2*var(--q));background:rgba(222,212,176,.62);box-shadow:0 0 calc(.3*var(--q)) rgba(0,0,0,.35);transform:rotate(var(--r,-35deg))}
@.cl[data-pl=board] .bw3-scr::after{display:none}
@.cl[data-pl=board] .bw3-scr.tl{left:calc(-1.6*var(--q));top:calc(.2*var(--q));--r:-38deg}@.cl[data-pl=board] .bw3-scr.tr{right:calc(-1.6*var(--q));top:calc(.2*var(--q));--r:38deg}@.cl[data-pl=board] .bw3-scr.bl{left:calc(-1.6*var(--q));bottom:calc(.2*var(--q));--r:38deg}@.cl[data-pl=board] .bw3-scr.br{right:calc(-1.6*var(--q));bottom:calc(.2*var(--q));--r:-38deg}
@.cl[data-pl=board] .bw3-sign{background:#ddd2b0;box-shadow:inset 0 0 0 calc(.3*var(--q)) #2a1a0a,0 0 0 calc(.2*var(--q)) #2a1a0a}
@.cl[data-pl=board] .bw3-sign span{color:#1c120a}
@.cl[data-pl=board] .bw3[data-mx="1"] .bw3-sign span{color:#e8c66e}
@.cl[data-pl=board] .bw3-sign::before{background:#4a120c}
/* лампы порогов: 2 — перекидные таблички, 3 — эмалевые диски */
@.cl[data-lamp=flip] .bw3-foot,@.cl[data-lamp=rings] .bw3-foot{padding:calc(1.5*var(--q)) calc(2*var(--q))}
@.cl .flt{position:relative;display:block;width:calc(15*var(--q));height:calc(8*var(--q));background:#1a1210;border-radius:calc(.5*var(--q));box-shadow:inset 0 0 0 calc(.2*var(--q)) #3a2a20,0 0 0 calc(.2*var(--q)) #0a0504;overflow:hidden}
@.cl .flt b,@.cl .flt s::before{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font:400 calc(5*var(--q))/1 var(--bw-disp);letter-spacing:.06em}
@.cl .flt b{color:#5a4c3a;font-weight:400}
@.cl .flt s{position:absolute;left:0;right:0;top:0;height:100%;background:#d9c9a0;transform-origin:50% 0;transform:scaleY(clamp(0,var(--e),1));text-decoration:none}
@.cl .flt s::before{content:attr(data-n);color:#2a1408;height:calc(8*var(--q));bottom:auto;transform:scaleY(calc(1/max(.001,clamp(0,var(--e),1))))}
@.cl .flt::after{content:'';position:absolute;left:0;right:0;top:calc(50% - .12*var(--q));height:calc(.24*var(--q));background:linear-gradient(90deg,#0a0504 0 7%,transparent 7% 93%,#0a0504 93%)}   /* шов перекидной таблички виден только по краям, цифру не перечёркивает */
@.cl .rgd{position:relative;display:flex;align-items:center;justify-content:center;width:calc(7.2*var(--q));height:calc(7.2*var(--q));border-radius:50%;background:#cf9a3a;background:color-mix(in srgb,#cf9a3a calc(clamp(0,var(--e),1)*100%),#231a14);box-shadow:0 0 0 calc(.5*var(--q)) #6b5326,0 0 0 calc(.8*var(--q)) #160905}
@.cl .rgd b{font:400 calc(2.7*var(--q))/1 var(--bw-disp);font-weight:400;letter-spacing:.04em;color:#2a1408;color:color-mix(in srgb,#2a1408 calc(clamp(0,var(--e),1)*100%),#6e604a)}
/* надпись: 2 — билетный корешок, 3 — краска на полу, 4 — строка камеры */
@.cl[data-hint=stub] .bw-hint{background:var(--bw-grain),linear-gradient(#dccfa6,#cdbe92);background-blend-mode:multiply,normal;color:#3a1d12;font:400 max(2.1cqw,14px)/1 "VT323",ui-monospace,monospace;letter-spacing:.14em;border-radius:calc(.15*var(--bw-u));box-shadow:0 calc(.3*var(--bw-u)) calc(.7*var(--bw-u)) rgba(0,0,0,.6);transform:translateX(-50%) rotate(-.7deg);
 -webkit-mask:radial-gradient(circle at 0 50%,transparent calc(.7*var(--bw-u)),#000 calc(.75*var(--bw-u))) left/51% 100% no-repeat,radial-gradient(circle at 100% 50%,transparent calc(.7*var(--bw-u)),#000 calc(.75*var(--bw-u))) right/51% 100% no-repeat;mask:radial-gradient(circle at 0 50%,transparent calc(.7*var(--bw-u)),#000 calc(.75*var(--bw-u))) left/51% 100% no-repeat,radial-gradient(circle at 100% 50%,transparent calc(.7*var(--bw-u)),#000 calc(.75*var(--bw-u))) right/51% 100% no-repeat}
@.cl[data-hint=stub] .bw-hint::before{content:'ADMIT ONE';left:calc(1.6*var(--bw-u));top:50%;width:auto;height:auto;margin:0;transform:translateY(-50%);background:none;box-shadow:none;border-radius:0;font-size:.62em;color:#8a2f24;letter-spacing:.2em;padding-right:calc(1.1*var(--bw-u));border-right:2px dashed #8a7a58}
@.cl[data-hint=stub] .bw-hint::after{display:none}
@.cl[data-hint=stub] .bw-hint{padding-left:calc(11*var(--bw-u))}
@.cl[data-hint=stub] .bw-hint .bw-ht{filter:none}
@.cl[data-hint=stub].ready .bw-hint,@.cl[data-hint=stub] .bw-hint.ready{color:#3a1d12}
@.cl[data-hint=paint] .bw-hint{background:none;box-shadow:none;color:#b9a47c;opacity:.78;padding:0;letter-spacing:.26em}
@.cl[data-hint=paint] .bw-hint::before,@.cl[data-hint=paint] .bw-hint::after{display:none}
@.cl[data-hint=paint] .bw-hint.ready{color:#cdb98e;opacity:.9}
@.cl[data-hint=crt] .bw-hint{background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 1px,transparent 1px 3px),#050806;box-shadow:inset 0 0 0 1px #1c2a22;color:#7FB89A;font:400 max(2.1cqw,14px)/1 "VT323",ui-monospace,monospace;letter-spacing:.1em;text-shadow:0 0 calc(.4*var(--bw-u)) rgba(127,184,154,.4);border-radius:calc(.15*var(--bw-u));padding:calc(.5*var(--bw-u)) calc(2.2*var(--bw-u))}
@.cl[data-hint=crt] .bw-hint::before{content:'>';position:static;display:inline-block;width:auto;height:auto;margin:0 .6em 0 0;background:none;box-shadow:none;border-radius:0}
@.cl[data-hint=crt] .bw-hint::after{content:'';position:static;display:inline-block;width:.5em;height:.8em;margin:0 0 0 .5em;border-radius:0;background:#7FB89A;box-shadow:none;animation:bw-cur 1s steps(1) infinite;vertical-align:-.08em}
@.cl[data-hint=crt] .bw-hint .bw-ht{filter:none}
/* ---- плашка «Записка на плите» (data-pl=note; по умолчанию в режиме плашек note, plates-note.js): рама — тот же ржавый материал, что у рамки слота (унаследована от .cl .bw3-body: hud-m1-rust, сколы, латунная линия),
   внутри кремовая бумага с неровным краем (слой ::after; ::before — узкая плотная тень без свечения), сумма красными чернилами прямо по бумаге, заголовок и главы чернилами, пороги — печатные коробки, «закрашиваются» красным, когда глава достигнута; два куска скотча ---- */
@.cl[data-pl=note] .bw3{filter:drop-shadow(0 calc(.9*var(--q)) calc(1.4*var(--q)) rgba(0,0,0,.6))}
@.cl[data-pl=note] .bw3::before,@.cl[data-pl=note] .bw3::after{content:'';position:absolute;z-index:4;pointer-events:none;filter:drop-shadow(0 calc(.1*var(--q)) 0 rgba(30,12,4,.35))}
@.cl[data-pl=note] .bw3::before{left:calc(-2.6*var(--q));top:calc(-.6*var(--q));width:calc(11*var(--q));height:calc(3.6*var(--q));background:var(--bw-tapeA) 0 0/100% 100% no-repeat;transform:rotate(-36deg)}
@.cl[data-pl=note] .bw3::after{right:calc(-1.6*var(--q));top:calc(-.2*var(--q));width:calc(8.4*var(--q));height:calc(3*var(--q));background:var(--bw-tapeB) 0 0/100% 100% no-repeat;transform:rotate(29deg)}
@.cl[data-pl=note] .bw3-body{border-radius:0;padding:calc(5.2*var(--q)) calc(5.6*var(--q)) calc(4.4*var(--q));gap:calc(1.8*var(--q))}
@.cl[data-pl=note] .bw3-body>*{position:relative;z-index:1}
@.cl[data-pl=note] .bw3-body::before,@.cl[data-pl=note] .bw3-body::after{content:'';position:absolute;z-index:0;inset:calc(2.3*var(--q));pointer-events:none}
@.cl[data-pl=note] .bw3-body::before{inset:calc(2.5*var(--q)) calc(2.2*var(--q)) calc(2.1*var(--q)) calc(2.4*var(--q));background:rgba(14,5,2,.55);filter:blur(calc(.3*var(--q)));border-radius:calc(.3*var(--q))}
@.cl[data-pl=note] .bw3-body::after{background:var(--bw-paper) 0 0/calc(46*var(--q)) auto,#dccfa9;clip-path:polygon(.2% .7%,9% .1%,26% .6%,47% 0,71% .5%,90% .1%,99.7% .5%,100% 14%,99.5% 36%,100% 61%,99.6% 83%,100% 99.4%,84% 99.9%,63% 99.3%,38% 100%,17% 99.4%,.3% 99.8%,0 80%,.5% 58%,0 33%,.4% 12%)}
@.cl[data-pl=note] .bw3-scr,@.cl[data-pl=note] .bw3-rail,@.cl[data-pl=note] .bw3-glass,@.cl[data-pl=note] .bw3-sweep,@.cl[data-pl=note] .bw3-fl,@.cl[data-pl=note] .bw3-bulb{display:none}
@.cl[data-pl=note] .bw3-sign{height:auto;padding:0 0 calc(.8*var(--q));border-radius:0;background:none;box-shadow:none}
@.cl[data-pl=note] .bw3-sign::before,@.cl[data-pl=note] .bw3-sign::after{display:none}
@.cl[data-pl=note] .bw3-sign span{font-family:"PN Stardos","Stardos Stencil",Impact,sans-serif;font-weight:700;letter-spacing:.1em;color:#241a12;filter:none;background:none}
@.cl[data-pl=note] .bw3[data-mx="1"] .bw3-sign span{color:#8e2a1c;background:none;filter:none}
@.cl[data-pl=note] .bw3-win,@.cl[data-pl=note] .bw3-tit{padding:0;border-radius:0;background:none;box-shadow:none}
@.cl[data-pl=note] .bw3-win canvas,@.cl[data-pl=note] .bw3-tit canvas{border-radius:0;box-shadow:none}
@.cl[data-pl=note] .bw3-tit{width:100%}
@.cl[data-pl=note] .bw3-foot{margin:calc(.8*var(--q)) 0 0;padding:0;gap:calc(1.6*var(--q));justify-content:space-between;border-radius:0;background:none;box-shadow:none}
@.cl[data-pl=note] .bw3l{flex:1 1 0;justify-content:center;min-width:0;padding:calc(1*var(--q)) 0 calc(.9*var(--q));border:calc(.3*var(--q)) solid #8e2a1c;border:calc(.3*var(--q)) solid color-mix(in srgb,#8e2a1c calc(clamp(0,var(--e),1)*100%),#8a7658);background:color-mix(in srgb,#8e2a1c calc(clamp(0,var(--e),1)*100%),transparent)}
@.cl[data-pl=note] .bw3l em{font:700 calc(3.3*var(--q))/1 "PN Stardos","Stardos Stencil",Impact,sans-serif;letter-spacing:.06em;filter:none;color:#e2d6b2;color:color-mix(in srgb,#e2d6b2 calc(clamp(0,var(--e),1)*100%),#5a4636)}
@.cl[data-pl=note] .bw3-title{filter:none}
/* надпись «тап» — записка на скотче (data-hint=note) */
@.cl[data-hint=note] .bw-hint{background:var(--bw-paper) 0 0/calc(34*var(--bw-u)) auto,#dccfa9;background-blend-mode:normal;color:#241a12;border-radius:0;box-shadow:none;filter:drop-shadow(0 calc(.3*var(--bw-u)) calc(.45*var(--bw-u)) rgba(0,0,0,.6));
 font:400 max(1.55cqw,13px)/1 "PN Elite","Special Elite",ui-monospace,monospace;letter-spacing:.12em;padding:calc(1*var(--bw-u)) calc(3.2*var(--bw-u)) calc(.9*var(--bw-u))}
@.cl[data-hint=note] .bw-hint::before,@.cl[data-hint=note] .bw-hint::after{content:'';position:absolute;top:calc(-.8*var(--bw-u));width:calc(5.4*var(--bw-u));height:calc(1.8*var(--bw-u));margin:0;border-radius:0;box-shadow:none;background:var(--bw-tapeC) 0 0/100% 100% no-repeat}
@.cl[data-hint=note] .bw-hint::before{left:calc(-1.6*var(--bw-u));transform:rotate(-31deg)}
@.cl[data-hint=note] .bw-hint::after{right:calc(-1.2*var(--bw-u));left:auto;transform:rotate(18deg);width:calc(4.2*var(--bw-u))}
@.cl[data-hint=note] .bw-hint .bw-ht{filter:none}
@.cl[data-hint=note] .bw-hint.ready .bw-ht{animation:none;opacity:1}
@.cl[data-hint=note] .bw-hint.ready{color:#241a12}
@.cl[data-dev=phone][data-hint=note] .bw-hint{font-size:max(3.2cqw,12px);letter-spacing:.08em;padding:calc(1.4*var(--bw-u)) calc(4*var(--bw-u))}
@.cl[data-hint=note] .bw-hint.btn{background:none;box-shadow:none;filter:none;padding:0}
@.cl[data-hint=note] .bw-hint.btn::before,@.cl[data-hint=note] .bw-hint.btn::after{display:none}
@.cl[data-hint=note] .bw-hint.btn .bw-ht{background:var(--bw-paper) 0 0/calc(34*var(--bw-u)) auto,#dccfa9;color:#241a12;border:calc(.26*var(--bw-u)) solid #241a12;border-radius:0;box-shadow:0 calc(.3*var(--bw-u)) calc(.45*var(--bw-u)) rgba(0,0,0,.55);text-shadow:none;font:700 max(2cqw,18px)/1.05 "PN Stardos","Stardos Stencil",Impact,sans-serif;letter-spacing:.07em}
@.cl[data-hint=note] .bw-hint.btn:hover .bw-ht{background:#241a12;color:#dccfa9}
@.cl[data-hint=note] .bw-hint.btn:focus-visible .bw-ht{outline:3px solid #fff3d0;outline-offset:6px}
/* ---- плашка «Тёмная» (data-pl=dlg; по умолчанию в режиме плашек dark, plates-note.js): те же ингредиенты, что у окон F (dialogs-f.css) — тёмно-коричневое тело #22120b → #1b0e09, тонкая рама dlg-frame.png по бокам и снизу,
   сверху потёртая красная стальная лента dlg-band.png с крошечным винтом (винты только в ленте), охристое название Black Ops One, тонкая линия с точками на концах, окна и пороги — тёмные ячейки с рамкой 1.5 px. Без свечения, без глянца ---- */
@.cl[data-pl=dlg] .bw3{filter:drop-shadow(0 calc(1.2*var(--q)) calc(2*var(--q)) rgba(0,0,0,.6))}
@.cl[data-pl=dlg] .bw3-body{--fw:max(var(--q),6px);--hd:max(calc(2.8*var(--q)),17px);border:solid transparent;border-width:0 calc(var(--fw)*.87) var(--fw);border-image:var(--bw-dframe) 92 80 92 80 round;border-radius:0;
 background:linear-gradient(180deg,#22120b,#1b0e09);background-clip:padding-box;background-origin:padding-box;box-shadow:0 0 0 1px #0a0302;
 padding:calc(var(--hd) + 2.4*var(--q)) calc(2.6*var(--q)) calc(2.6*var(--q));gap:calc(1.8*var(--q))}
@.cl[data-pl=dlg] .bw3-body::before{content:'';position:absolute;left:0;right:0;top:0;height:var(--hd);z-index:7;pointer-events:none;
 background:var(--bw-dscrew) right calc(var(--hd)*.7) top 50%/calc(var(--hd)*.72) calc(var(--hd)*.72) no-repeat,var(--bw-dband) center/auto 100% repeat-x #8a1a0c;box-shadow:0 1px 0 #0a0302,0 3px 8px rgba(0,0,0,.5)}
@.cl[data-pl=dlg] .bw3-body::after{content:'';position:absolute;left:0;right:0;bottom:0;top:var(--hd);z-index:6;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.085) 0 1px,transparent 1px 3px)}
@.cl[data-pl=dlg] .bw3-scr,@.cl[data-pl=dlg] .bw3-rail,@.cl[data-pl=dlg] .bw3-sweep,@.cl[data-pl=dlg] .bw3-fl{display:none}
@.cl[data-pl=dlg] .bw3-sign{height:auto;padding:0 0 calc(1.8*var(--q));border-radius:0;background:none;box-shadow:none}
@.cl[data-pl=dlg] .bw3-sign::before{inset:auto calc(-1.3*var(--q)) 0 calc(-1.3*var(--q));height:9px;border-radius:0;opacity:1;box-shadow:none;
 background:radial-gradient(circle at 35% 30%,#f6dcae 0 1px,#b8793f 2.4px,#4b2410 3.6px,#1a0a04 4px,transparent 4.3px) 0 50%/9px 9px no-repeat,radial-gradient(circle at 35% 30%,#f6dcae 0 1px,#b8793f 2.4px,#4b2410 3.6px,#1a0a04 4px,transparent 4.3px) 100% 50%/9px 9px no-repeat,linear-gradient(90deg,rgba(201,138,44,.2),rgba(201,138,44,.78) 14%,rgba(201,138,44,.78) 86%,rgba(201,138,44,.2)) 50% 50%/calc(100% - 26px) 1px no-repeat}
@.cl[data-pl=dlg] .bw3-sign::after{display:none}
@.cl[data-pl=dlg] .bw3-sign span{font-family:var(--bw-disp);letter-spacing:.07em;padding-left:.07em;background:none;color:#FFC861;filter:none}
@.cl[data-pl=dlg] .bw3[data-mx="1"] .bw3-sign span{background:none;color:#F8EEB8;filter:none}
@.cl[data-pl=dlg] .bw3-win,@.cl[data-pl=dlg] .bw3-tit{padding:0;border-radius:3px;background:#150b07;box-shadow:none}
@.cl[data-pl=dlg] .bw3-win canvas,@.cl[data-pl=dlg] .bw3-tit canvas{border-radius:3px;box-shadow:none}
@.cl[data-pl=dlg] .bw3-tit{width:100%}
@.cl[data-pl=dlg] .bw3-glass{inset:0;border-radius:3px;opacity:1;background:none;box-shadow:inset 0 0 0 1.5px rgba(240,200,140,.24)}
@.cl[data-pl=dlg] .bw3-foot{margin:calc(.2*var(--q)) 0 0;border-radius:3px;background:rgba(8,3,1,.34);box-shadow:inset 0 0 0 1.5px rgba(240,200,140,.24)}
@.cl[data-pl=dlg] .bw3l em{font:400 calc(3.1*var(--q))/1 var(--bw-disp);letter-spacing:.08em;filter:none;color:#7a6746;color:color-mix(in srgb,#FFC861 calc(clamp(0,var(--e),1)*100%),#7a6746)}
@.cl[data-pl=dlg] .bw3l i::after{display:none}
@.cl[data-pl=dlg] .bw3dot{box-shadow:none;border-color:#CDB27C;border-color:color-mix(in srgb,#FFC861 calc(clamp(0,calc(var(--e)*2.4 - .6),1)*100%),#5a4630);background:#FFC861;background:color-mix(in srgb,#FFC861 calc(clamp(0,calc(var(--e)*2.4 - .6),1)*100%),#150b07)}
@.cl[data-pl=dlg] .bw3-title{filter:none}
/* надпись «тап» — тёмная ячейка с рамкой (data-hint=dlg); кнопка CONTINUE — активная ячейка окон F */
@.cl[data-hint=dlg] .bw-hint{background:linear-gradient(180deg,#22120b,#1b0e09);box-shadow:inset 0 0 0 1.5px rgba(240,200,140,.24),0 0 0 1px #0a0302,0 calc(.3*var(--bw-u)) calc(.7*var(--bw-u)) rgba(0,0,0,.5);border-radius:3px;color:#CDB27C;
 font:400 max(1.4cqw,12px)/1 var(--bw-disp);letter-spacing:.2em;padding:calc(.9*var(--bw-u)) calc(2.6*var(--bw-u)) calc(.8*var(--bw-u))}
@.cl[data-hint=dlg] .bw-hint::before,@.cl[data-hint=dlg] .bw-hint::after{display:none}
@.cl[data-hint=dlg] .bw-hint .bw-ht{filter:none}
@.cl[data-hint=dlg] .bw-hint.ready{color:#F0D890}
@.cl[data-dev=phone][data-hint=dlg] .bw-hint{font-size:max(3.1cqw,11px);letter-spacing:.14em;padding:calc(1.5*var(--bw-u)) calc(4*var(--bw-u))}
@.cl[data-hint=dlg] .bw-hint.btn{background:none;box-shadow:none;padding:0}
@.cl[data-hint=dlg] .bw-hint.btn .bw-ht{display:inline-flex;align-items:center;justify-content:center;min-height:48px;min-width:max(18cqw,200px);padding:0 28px;background:#F0D890;color:#2a0f06;border-radius:3px;box-shadow:0 0 0 1px #0a0302,0 calc(.3*var(--bw-u)) calc(.7*var(--bw-u)) rgba(0,0,0,.5);font:400 max(2cqw,19px)/1.1 var(--bw-disp);letter-spacing:.06em;text-shadow:none}
@.cl[data-hint=dlg] .bw-hint.btn:hover .bw-ht{background:#F6ECB4}
@.cl[data-hint=dlg] .bw-hint.btn:focus-visible .bw-ht{outline:3px solid #fff4c4;outline-offset:3px}
@keyframes bw-cur{50%{opacity:0}}
@.bw-rm .bw-hint::after{animation:none}
`;
/* ---------------------------------------------------------------- плашки Big Win: ?bwplate=0|a|b|c|d (владелец 2026-10-13: «убрать снизу лампочки с иксами, изменить внешний вид плашки») ----------------------------------------------------------------
   Ряд ламп 10× 25× 50× 100× убран везде; уровень (глава) виден строкой названия под суммой, заголовок — BIG WIN (MAX WIN на максимуме). Всё плоское: без свечений, ореолов и глянца.
   0 — прежняя тёмная плашка (как окна F) без ряда ламп;  a — вывеска-шатёр: лампы по раме, кремовая эмаль, красная лента с названием;  b — табло автомата: красная жестяная рама на заклёпках, охристая табличка;
   c — кассовая лента: бумага с зубчатым краем на стальном зажиме, чернила;  d — минимум: заголовок и сумма прямо на затемнении, жестяная табличка с названием. */
const PLATES=[['0','0 · Прежняя тёмная, без ламп'],['a','a · Вывеска-шатёр: лампы по раме'],['b','b · Табло автомата: жесть и заклёпки'],['c','c · Кассовая лента'],['d','d · Минимум: заголовок и сумма на затемнении']];
const PLATE_DEF='a';
function plateOpt(o){ let m=o&&o.plate; if(!m){ try{ m=new URLSearchParams(location.search).get('bwplate'); }catch(e){} } if(!m){ try{ m=sessionStorage.getItem('bp-bwplate'); }catch(e){} } m=String(m||PLATE_DEF).toLowerCase(); return PLATES.some(p=>p[0]===m)?m:PLATE_DEF; }
const CSS2=(()=>{ const Q=n=>`calc(${n}*var(--q))`, P=k=>`@.cl[data-bwp=${k}]`, out=[];
 const r=(k,sel,d)=>out.push(sel.split(',').map(s=>P(k)+' '+s.trim()).join(',')+'{'+d+'}');
 const RUST=`background-image:var(--bw-chips),var(--bw-wear),linear-gradient(rgba(150,44,28,.38),rgba(96,24,14,.5)),var(--bw-rust);background-blend-mode:normal,soft-light,normal,normal;background-size:${Q(70)} ${Q(70)},auto,auto,${Q(70)} auto;background-color:#4a1810`;
 const LAMP='radial-gradient(circle closest-side,#f4e6b4 0 26%,#c9a24c 28% 46%,#2a0f0a 48% 66%,transparent 68%)';
 const RIV='radial-gradient(circle closest-side,#dcb877 0 14%,#b08436 16% 26%,#2a0f0a 28% 31%,transparent 33%)';
 const ring=(g,t,pad)=>`content:'';position:absolute;inset:${pad};z-index:2;pointer-events:none;background-image:${g},${g},${g},${g};background-size:${t} ${t};background-position:0 0,0 100%,0 0,100% 0;background-repeat:space no-repeat,space no-repeat,no-repeat space,no-repeat space`;
 /* общее для a b c d: ни винтов, ни стекла, ни бликов; тень — только тёмная, без ореола */
 for(const k of ['a','b','c','d']){
  r(k,'.bw3-scr,.bw3-rail,.bw3-glass,.bw3-sweep,.bw3-fl,.bw3-foot','display:none');
  r(k,'.bw3',`padding-top:0;filter:drop-shadow(0 ${Q(1)} ${Q(1.6)} rgba(0,0,0,.6))`);
  r(k,'.bw3-body>*','position:relative;z-index:1');
  r(k,'.bw3-sign::after','display:none');
 }
 /* a — вывеска-шатёр */
 r('a','.bw3-body',`border-radius:${Q(1.2)};padding:${Q(7.6)} ${Q(7.6)} ${Q(7.2)};gap:${Q(1.6)};${RUST};box-shadow:inset 0 0 0 ${Q(.4)} #2a0f0a,0 0 0 ${Q(.3)} #190704`);
 r('a','.bw3-body::before',ring(LAMP,Q(4),Q(.9)));
 r('a','.bw3-body::after',`content:'';position:absolute;z-index:0;inset:${Q(5)};pointer-events:none;background:var(--bw-paper) 0 0/${Q(46)} auto,#e3d6ae;box-shadow:0 0 0 ${Q(.3)} #190704,inset 0 0 0 ${Q(1)} #e3d6ae,inset 0 0 0 ${Q(1.3)} #8e2a1c`);
 r('a','.bw3-sign',`height:auto;padding:${Q(.6)} 0 ${Q(1.4)};border-radius:0;background:none;box-shadow:none`);
 r('a','.bw3-sign::before',`inset:${Q(-.4)} ${Q(-.6)} ${Q(.4)};border-radius:0;box-shadow:none;background:#8e2a1c`);
 r('a','.bw3-sign span','filter:none;background:none;color:#8e2a1c;letter-spacing:.1em');
 r('a','.bw3[data-mx="1"] .bw3-sign span','filter:none;background:none;color:#f1dfa4');
 r('a','.bw3-win',`padding:0;border-radius:0;background:none;box-shadow:none;border-top:${Q(.3)} solid #8e2a1c;border-bottom:${Q(.3)} solid #8e2a1c`);
 r('a','.bw3-win canvas,.bw3-tit canvas','border-radius:0;box-shadow:none');
 r('a','.bw3-tit',`width:100%;padding:${Q(.9)} ${Q(1)};border-radius:0;${RUST};box-shadow:0 0 0 ${Q(.3)} #2a0f0a`);
 /* b — табло автомата */
 r('b','.bw3-body',`border-radius:${Q(.8)};padding:${Q(6.6)} ${Q(6.6)} ${Q(6.2)};gap:${Q(2)};${RUST};box-shadow:inset 0 0 0 ${Q(.5)} rgba(18,4,2,.85),0 0 0 ${Q(.3)} #190704`);
 r('b','.bw3-body::before',ring(RIV,Q(7),Q(1.2)));
 r('b','.bw3-body::after',`content:'';position:absolute;z-index:0;inset:${Q(3.7)};pointer-events:none;border:${Q(.3)} solid rgba(18,4,2,.7);box-shadow:0 ${Q(.3)} 0 rgba(255,200,140,.14)`);
 r('b','.bw3-win,.bw3-tit','border-radius:0');
 r('b','.bw3-win canvas,.bw3-tit canvas','border-radius:0');
 r('b','.bw3-sign',`border-radius:${Q(.3)}`);
 /* c — кассовая лента */
 r('c','.bw3',`padding-top:${Q(2.4)}`);
 r('c','.bw3-body',`width:80%;margin:0 auto;border-radius:0;padding:${Q(6.2)} ${Q(5.4)} ${Q(7)};gap:${Q(1.8)};background:var(--bw-paper) 0 0/${Q(40)} auto,#ddd0a8;box-shadow:none;
 -webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/${Q(3)} 100% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) 50%/${Q(3)} 100% repeat-x;-webkit-mask-composite:source-in;
 mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/${Q(3)} 100% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) 50%/${Q(3)} 100% repeat-x;mask-composite:intersect`);
 r('c','.bw3-body::before,.bw3-body::after','display:none');
 out.push(`${P('c')} .bw3::before{content:'';position:absolute;z-index:3;left:18%;right:18%;top:0;height:${Q(4.6)};border-radius:${Q(.5)};${RUST};box-shadow:0 0 0 ${Q(.3)} #190704;pointer-events:none}`);
 out.push(`${P('c')} .bw3::after{content:'';position:absolute;z-index:4;left:18%;right:18%;top:0;height:${Q(4.6)};pointer-events:none;background:${RIV.replace(/closest-side/,'closest-side')} ${Q(2.4)} 50%/${Q(2.4)} ${Q(2.4)} no-repeat,${RIV} calc(100% - ${Q(2.4)}) 50%/${Q(2.4)} ${Q(2.4)} no-repeat}`);
 r('c','.bw3-sign',`height:auto;padding:0 0 ${Q(1.4)};border-radius:0;background:none;box-shadow:none;border-bottom:${Q(.35)} dashed #6a5a3a`);
 r('c','.bw3-sign::before','display:none');
 r('c','.bw3-sign span','filter:none;background:none;color:#241a12;font-family:"PN Stardos","Stardos Stencil",var(--bw-disp);font-weight:700;letter-spacing:.12em');
 r('c','.bw3[data-mx="1"] .bw3-sign span','filter:none;background:none;color:#8e2a1c');
 r('c','.bw3-win,.bw3-tit',`padding:0;border-radius:0;background:none;box-shadow:none`);
 r('c','.bw3-win',`padding-bottom:${Q(1.4)};border-bottom:${Q(.35)} dashed #6a5a3a`);
 r('c','.bw3-win canvas,.bw3-tit canvas','border-radius:0;box-shadow:none');
 r('c','.bw3-tit','width:100%');
 /* d — минимум */
 r('d','.bw3',`filter:none`);
 out.push(`${P('d')} .bw3::before{content:'';position:absolute;z-index:0;inset:${Q(-12)} ${Q(-18)};pointer-events:none;background:radial-gradient(ellipse closest-side,rgba(8,3,2,.84) 0 60%,rgba(8,3,2,0) 100%)}`);
 r('d','.bw3-body',`border-radius:0;padding:${Q(1)} 0;gap:${Q(2.2)};background:none;box-shadow:none;filter:none`);
 r('d','.bw3-sign',`height:auto;padding:${Q(1.2)} 0 ${Q(.4)};border-radius:0;background:none;box-shadow:none`);
 r('d','.bw3-sign::before','display:none');
 r('d','.bw3-sign span',`filter:none;background:none;color:#f3e6c4;font-size:calc(var(--sf,6.6)*1.35*var(--q));letter-spacing:.1em;-webkit-text-stroke:${Q(.9)} #1a0905;paint-order:stroke fill;text-shadow:0 ${Q(.6)} 0 #1a0905`);
 r('d','.bw3[data-mx="1"] .bw3-sign span','filter:none;background:none;color:#f6dc8a');
 out.push(`${P('d')}[data-sum] .bw3-sign span{font-size:calc(var(--sf,6.6)*var(--q))}`);
 r('d','.bw3-win',`padding:0;border-radius:0;background:none;box-shadow:none`);
 r('d','.bw3-win canvas','border-radius:0;box-shadow:none');
 r('d','.bw3-tit',`width:74%;padding:${Q(1)} ${Q(3.4)};border-radius:${Q(.3)};${RUST};box-shadow:0 0 0 ${Q(.3)} #190704,0 ${Q(.8)} 0 rgba(0,0,0,.45)`);
 r('d','.bw3-tit canvas','border-radius:0;box-shadow:none');
 out.push(`${P('d')}[data-dev=phone] .bw3-tit{width:96%;padding:${Q(1)} ${Q(2.6)}}`);
 out.push(`${P('d')} .bw3-tit::before{content:'';position:absolute;inset:0;pointer-events:none;background:${RIV} ${Q(.7)} 50%/${Q(2.4)} ${Q(2.4)} no-repeat,${RIV} calc(100% - ${Q(.7)}) 50%/${Q(2.4)} ${Q(2.4)} no-repeat}`);
 return out.join('\n'); })();
const SCOPE='#bp-big.bw-root';
const CQ_OK=(()=>{ try{ return !!(window.CSS&&CSS.supports&&CSS.supports('width','1cqw')); }catch(e){ return true; } })(); // Safari <16: нет единиц контейнера — сцена на vw/vh (оверлей fixed inset:0)
function buildCSS(){ texBuild(); return (CSS+CSS2).replace(/(-?\d*\.?\d+)cqw/g,(m,n)=>`calc(${n}*var(--bw-u))`).replace(/CQW/g,CQ_OK?'cqw':'vw').replace(/CQH/g,CQ_OK?'cqh':'vh').replace(/@(?=[\s\[.>{:])/g,SCOPE).replace(/var\(--bw-(chips|wear|grain)\)/g,(m,k)=>bpvT`url(${TEX[k]})`).replace(/var\(--bw-paper\)/g,()=>bpvT`url(${A_BASE()}plates-note/paper.webp)`).replace(/var\(--bw-tape([ABC])\)/g,(m,k)=>bpvT`url(${A_BASE()}plates-note/tape-${k.toLowerCase()}.webp)`).replace(/var\(--bw-rust\)/g,()=>bpvT`url(${A_BASE()}uikit/hud-m1-rust.webp)`).replace(/var\(--bw-dframe\)/g,()=>bpvT`url(${A_BASE()}ui2/dlg-frame.webp)`).replace(/var\(--bw-dband\)/g,()=>bpvT`url(${A_BASE()}ui2/dlg-band.webp)`).replace(/var\(--bw-dscrew\)/g,()=>bpvT`url(${A_BASE()}ui2/dlg-screw.svg)`).replace(/var\(--bw-gun\)/g,()=>bpvT`url(${A_BASE()}uikit/steel-gun.webp)`).replace(/var\(--bw-wood\)/g,()=>bpvT`url(${A_BASE()}uikit/wood-oxblood.webp)`); }   // текстуры подставляются ПОСЛЕДНИМ шагом: в base64 встречаются «CQW», «5cqw» и подобное, прежние замены испортили бы картинку
let cssDone=false;
function ensureCSS(){ if(cssDone&&document.getElementById('bw-css')) return; const s=document.createElement('style'); s.id='bw-css'; s.textContent=buildCSS(); document.head.append(s); cssDone=true; }

/* ---------------------------------------------------------------- главы и расписание ---------------------------------------------------------------- */
const CHAP=[null,
 {at:10,name:'SOMETHING MOVED',kick:'BIG WIN',col:'#efe4c8'},
 {at:25,name:'LIGHTS FLICKER',kick:'BIG WIN',col:'#ffd98a'},
 {at:50,name:"HE'S RIGHT BEHIND YOU",kick:'BIG WIN',col:'#ff6a48'},
 {at:100,name:'CAMERAS DOWN',kick:'BIG WIN',col:'#efe4c8'},
 {at:5000,name:"PARTY'S OVER",kick:'MAX WIN',col:'#f3e6c4'}]; // потолок — как MAXX в ui.js (математика 2.0.0: 5 000×)
const THRL=['10×','25×','50×','100×'];   // подписи ламп глав на табло (пятая — MAX — добавляется, если раунд закончился максимальным выигрышем)
const MAXX=5000, T0=.62, ROCCO_T0=.5;   // ROCCO_T0 — когда Рокко начинает радоваться: счётчик вот-вот пойдёт (до этого он стоит в покое, как в зале)   // T0 — с этой секунды счётчик начинает идти (до этого вход: свет, удар плашки, голова падает)
/* монотонная кубическая интерполяция (Fritsch–Carlson): счётчик не откатывается, в узлах скорость плавная */
function pchip(K){ const n=K.length,h=[],d=[],m=new Array(n).fill(0);
 for(let i=0;i<n-1;i++){ h[i]=K[i+1][0]-K[i][0]; d[i]=(K[i+1][1]-K[i][1])/h[i]; }
 for(let i=1;i<n-1;i++){ if(d[i-1]*d[i]<=0) m[i]=0; else{ const w1=2*h[i]+h[i-1], w2=h[i]+2*h[i-1]; m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]); } }
 return t=>{ if(t<=K[0][0]) return K[0][1]; if(t>=K[n-1][0]) return K[n-1][1]; let i=0; while(t>K[i+1][0]) i++; const s=(t-K[i][0])/h[i],s2=s*s,s3=s2*s;
  return (2*s3-3*s2+1)*K[i][1]+(s3-2*s2+s)*h[i]*m[i]+(-2*s3+3*s2)*K[i+1][1]+(s3-s2)*h[i]*m[i+1]; }; }
/* расписание: сколько секунд счётчик идёт между порогами (обычная скорость). Последний кусок до итога короче и пропорционален. */
function buildSc(final,bet,isMax){
 const x=final/bet, K=[[0,0],[T0,0]]; let t=T0; const seg=[[0,10,1.05],[10,25,1.9],[25,50,2.3],[50,100,2.8]]; let done=false;
 for(const [a,b,d] of seg){ if(x>=b){ t+=d; K.push([t,b]); } else { t+=.55+(x-a)/(b-a)*d*.9; K.push([t,x]); done=true; break; } }
 if(!done){ if(x<=100){ /* ровно 100× */ } else if(x<1000){ t+=.8+Math.log10(x/100)*2.2; K.push([t,x]); } else { t+=2.5; K.push([t,1000]); t+=x<MAXX?1.5:3.3; K.push([t,x]); } }
 const f=pchip(K), tF=t, T=[Infinity,Infinity,Infinity,Infinity,Infinity,Infinity];
 for(let k=1;k<=4;k++){ if(x<CHAP[k].at) break; let lo=0,hi=tF; for(let i=0;i<40;i++){ const mid=(lo+hi)/2; if(f(mid)>=CHAP[k].at) hi=mid; else lo=mid; } T[k]=hi; }
 if(isMax||x>=MAXX) T[5]=tF;
 const tEnd=tF+(T[5]<Infinity?4.3:1.25);
 return {final,x,f,tF,T,tEnd};
}

/* ---------------------------------------------------------------- табло: деньги по барабанам ---------------------------------------------------------------- */
/* Строка вида «$25,000.00» / «25,000.00 SC» / «1,000,000.00 ARS» → список ячеек. Цифры получают разряд (0 — последняя цифра центов), разделители — разряд цифры слева. */
function parseCells(s){ s=String(s); const first=s.search(/\d/); if(first<0) return [{t:'cy',ch:s}];
 let last=s.length-1; while(last>0&&!/\d/.test(s[last])) last--;
 const pre=s.slice(0,first).trim(), num=s.slice(first,last+1), suf=s.slice(last+1).trim(), out=[];
 for(const ch of pre) out.push({t:'cy',ch});
 const nd=(num.match(/\d/g)||[]).length; let di=0;
 for(const ch of num){ if(/\d/.test(ch)){ out.push({t:'dg',p:nd-1-di}); di++; } else out.push({t:'cm',ch,p:nd-1-(di-1)}); }   // разделитель стоит правее цифры di-1 → зажигается вместе с ней
 if(suf) out.push({t:'cc',ch:suf});
 return out; }
const STRIP='<b>'+[0,1,2,3,4,5,6,7,8,9,0].map(d=>`<s>${d}</s>`).join('')+'</b>';
const cellsHTML=cells=>cells.map(c=>c.t==='dg'?`<i class="bw-od">${STRIP}</i>`:`<i class="bw-${c.t}">${esc(c.ch)}</i>`).join('');
const cellsMeasure=cells=>cells.map(c=>c.t==='dg'?'<i class="bw-od"></i>':`<i class="bw-${c.t}">${esc(c.ch)}</i>`).join('');
const digitsOf=n=>n<1?1:Math.floor(Math.log10(n)+1e-9)+1;

/* ---------------------------------------------------------------- картинки света ---------------------------------------------------------------- */
const BEAM={};
function beamSprite(col){   // белый луч-веер с мягкими краями, вершина вверху по центру; окрашивается один раз
 if(BEAM[col]) return BEAM[col];
 const W=320,H=768,c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'), im=g.createImageData(W,H), d=im.data, tan=Math.tan(11*Math.PI/180);
 for(let y=0;y<H;y++){ const hw=Math.max(2,y*tan), fy=Math.pow(1-y/H,1.25)*sm(y/(H*.05));
  for(let x=0;x<W;x++){ const r=Math.abs(x-W/2)/hw; if(r>=1) continue; const e=1-sm((r-.62)/.38), a=e*fy; const i=(y*W+x)*4; d[i]=d[i+1]=d[i+2]=255; d[i+3]=Math.round(a*255); } }
 g.putImageData(im,0,0); g.globalCompositeOperation='source-in'; g.fillStyle=col; g.fillRect(0,0,W,H); BEAM[col]=c; return c; }
let GLOW=null;
function glowSprite(){ if(GLOW) return GLOW; const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), r=g.createRadialGradient(32,32,0,32,32,32);
 r.addColorStop(0,'rgba(255,248,220,1)'); r.addColorStop(.22,'rgba(255,214,120,.8)'); r.addColorStop(.55,'rgba(255,160,50,.22)'); r.addColorStop(1,'rgba(255,140,40,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); GLOW=c; return c; }

/* ---------------------------------------------------------------- табло «Призовой счётчик» (из эскиза bigwin-v2, вид 3, палитра «Вывеска») ---------------------------------------------------------------- */
/* Палитра холста: win — фон окна; col — три тона барабана; dig — верх/низ цифры; dsh — тень цифры; glow — [цвет, сила] ореола цифр; sep — разделитель барабанов;
   coin — [светлый, средний, тёмный тон, обводка, блик, цвет знака валюты]; dot — точка/запятая; tbg — фон окна главы; tsh — тень строки; tt — [верх, низ] строк глав 1–4 и MAX. Цвета корпуса, плашки и ламп — в CSS (.bw3-*). */
const PAL3={win:'#0d0705',col:['#1a0e0a','#241410','#150b08'],dig:['#fff7cf','#F0D890'],dsh:'rgba(0,0,0,.65)',glow:['rgba(246,224,150,.45)',.24],sep:['#4a1a10','#F0D890','#4a1a10'],
 coin:['#fff3bc','#F0D890','#b8923a','rgba(60,20,8,.6)','rgba(255,255,230,.5)','#7a2418'],dot:['#fff3bc','#b8923a'],tbg:'#120907',tsh:'rgba(0,0,0,.7)',
 tt:[['#fff7cf','#F0D890'],['#fff0a8','#F6C84a'],['#ff9a78','#e8603a'],['#fff7cf','#F0D890'],['#fffadb','#F6E096']]};
/* «Записка на плите» (data-pl=note): цифры красными чернилами прямо по бумаге плашки (холст прозрачный, бумага — CSS), печатная «монета» вместо золотой, строка главы чернилами; затемнение у краёв барабана — цвет бумаги, без чёрного и бликов */
const PAL3N={win:null,col:null,dig:['#9a2d1d','#8e2a1c'],dsh:'rgba(0,0,0,0)',glow:['rgba(0,0,0,0)',0],sep:['rgba(0,0,0,0)','rgba(0,0,0,0)','rgba(0,0,0,0)'],
 coin:['#8e2a1c','#8e2a1c','#8e2a1c','rgba(0,0,0,0)','rgba(0,0,0,0)','#dccfa9'],dot:['#8e2a1c','#8e2a1c'],tbg:null,tsh:'rgba(0,0,0,0)',paper:'220,207,169',
 tt:[['#241a12','#241a12'],['#241a12','#241a12'],['#241a12','#241a12'],['#241a12','#241a12'],['#8e2a1c','#8e2a1c']]};
/* «Тёмная» плашка (data-pl=dlg, как окна F): окна — тёмно-коричневые ячейки, цифры кремово-охристые без ореола, разделители барабанов — тусклая охра */
const PAL3D=Object.assign({},PAL3,{win:'#150b07',dsh:'rgba(0,0,0,.5)',glow:['rgba(0,0,0,0)',0],sep:['#3a2416','rgba(205,178,124,.5)','#3a2416'],tbg:'#150b07',coin:['#fff3bc','#F0D890','#b8923a','rgba(60,20,8,.6)','rgba(255,255,230,.5)','#3a1a0a'],tt:[['#FFC861','#F0D890'],['#FFC861','#F0D890'],['#FFC861','#F0D890'],['#FFC861','#F0D890'],['#fffadb','#F6E096']]});
/* плашки a–d (?bwplate=): cut — края барабана и строки уходят в прозрачность (холст без фона, цвет даёт плашка); ol — тёмный контур цифр */
const NOC=['rgba(0,0,0,0)','rgba(0,0,0,0)','rgba(0,0,0,0)'];
const PALA={win:null,col:null,tbg:null,cut:true,paper:'0,0,0',dig:['#9a2d1d','#8e2a1c'],dsh:'rgba(0,0,0,0)',glow:['rgba(0,0,0,0)',0],sep:NOC,coin:['#8e2a1c','#8e2a1c','#8e2a1c','rgba(0,0,0,0)','rgba(0,0,0,0)','#e3d6ae'],dot:['#8e2a1c','#8e2a1c'],tsh:'rgba(0,0,0,0)',tt:[['#efe3bd','#efe3bd'],['#efe3bd','#efe3bd'],['#efe3bd','#efe3bd'],['#efe3bd','#efe3bd'],['#f6e096','#f6e096']]};
const PALB=Object.assign({},PAL3D,{win:'#120a06',tbg:'#120a06',dig:['#fff1c0','#e8cf88']});
const PALC=Object.assign({},PALA,{dig:['#2e1d14','#241610'],coin:['#2e1d14','#2e1d14','#2e1d14','rgba(0,0,0,0)','rgba(0,0,0,0)','#ddd0a8'],dot:['#2e1d14','#2e1d14'],tt:[['#241a12','#241a12'],['#241a12','#241a12'],['#241a12','#241a12'],['#241a12','#241a12'],['#8e2a1c','#8e2a1c']]});
const PALD=Object.assign({},PALA,{ol:'#1a0905',dig:['#f7ecd0','#e5d3a2'],dsh:'rgba(10,3,1,.9)',dot:['#f3e3b0','#d2b46a'],coin:['#f3e3b0','#d2b46a','#a98a44','rgba(26,9,5,.9)','rgba(0,0,0,0)','#3a1a0a'],tsh:'rgba(10,3,1,.7)',tt:[['#f3e6c4','#f3e6c4'],['#f3e6c4','#f3e6c4'],['#f3e6c4','#f3e6c4'],['#f3e6c4','#f3e6c4'],['#f6dc8a','#f6dc8a']]});
const PALP={a:PALA,b:PALB,c:PALC,d:PALD};
const easeBack=u=>{ u=clamp(u); const c1=1.9, c3=c1+1; return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2); };
/* текстуры кодом (один раз на страницу): пятна и царапины, зерно, облупленная краска */
const TEX={};
/* Текстуры подставляются в CSS литералами (buildCSS): через var() на корне (его переменные меняются каждый кадр) табло и вывеска перерисовывались целиком на каждом кадре. */
function texBuild(){
 if(!TEX.wear){ const mk=()=>{ const c=document.createElement('canvas'); c.width=c.height=256; return c; };
  { const c=mk(), g=c.getContext('2d'), R=rng32(31); g.fillStyle='#808080'; g.fillRect(0,0,256,256);
   for(let i=0;i<46;i++){ const x=R()*256,y=R()*256,r=10+R()*50, gr=g.createRadialGradient(x,y,0,x,y,r), l=R()<.5; gr.addColorStop(0,l?'rgba(255,255,255,.09)':'rgba(0,0,0,.12)'); gr.addColorStop(1,'rgba(128,128,128,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,2*r,2*r); }
   for(let i=0;i<70;i++){ g.strokeStyle=R()<.5?'rgba(255,255,255,.12)':'rgba(0,0,0,.18)'; g.lineWidth=.6; g.beginPath(); const x=R()*256,y=R()*256; g.moveTo(x,y); g.lineTo(x+(R()-.5)*40,y+(R()-.5)*40); g.stroke(); }
   TEX.wear=c.toDataURL(); }
  { const c=mk(), g=c.getContext('2d'), R=rng32(5), im=g.createImageData(256,256), d=im.data; for(let i=0;i<d.length;i+=4){ const v=128+(R()-.5)*34; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; } g.putImageData(im,0,0); TEX.grain=c.toDataURL(); }
  { const c=mk(), g=c.getContext('2d'), R=rng32(404);
   for(let i=0;i<70;i++){ const cx=R()*256, cy=R()*256, n=2+Math.floor(R()*5); for(let j=0;j<n;j++){ const x=cx+(R()-.5)*22, y=cy+(R()-.5)*12, r=.7+R()*2.6, a=R()*6.28; g.fillStyle=R()<.62?`rgba(244,222,160,${.3+R()*.25})`:`rgba(28,10,4,${.35+R()*.25})`;
     g.beginPath(); for(let k=0;k<6;k++){ const aa=a+k*1.047+(R()-.5)*.7, rr=r*(.55+R()*.6), px=x+Math.cos(aa)*rr*1.5, py=y+Math.sin(aa)*rr*.9; k?g.lineTo(px,py):g.moveTo(px,py); } g.closePath(); g.fill(); } }
   TEX.chips=c.toDataURL(); } }
 }
/* позиция барабана разряда k (в цифрах): одометр — старший барабан сдвигается только при переносе младшего; на большой скорости перенос растягивается, и барабан катится плавно */
const colPos=(a,k,sp)=>{ const v=a/Math.pow(10,k), fl=Math.floor(v), fr=v-fl, w=k===0?1:clamp(.1+.9*sm((sp-4)/18),.1,1); return fl+sm((fr-(1-w))/w); };
let MCTX=null; const measureCtx=()=>MCTX||(MCTX=document.createElement('canvas').getContext('2d'));

/* ---------------------------------------------------------------- шоу ---------------------------------------------------------------- */

const defaultFmt=v=>window.bpMoney?bpMoney.win(v):'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

const gameTime=()=>window.bpTime||null;
const isRM=()=>{ const g=gameTime(); try{ return g&&g.RM?!!g.RM():matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const isTurbo=()=>{ const g=gameTime(); return !!(g&&g.GS&&(g.GS.holdTurbo||g.GS.speed==='turbo')); };
const fxMode=o=>window.BigWinFx?BigWinFx.mode(o):'old';   // вариант осадков и вида плашки (bigwin-fx.js): streamers | tickets | coins | dust | old (прежний вид целиком)
const ROCCO_MODES=['body','eyes','monitor','none'];
const roccoMode=o=>{ let m=o&&o.rocco; if(!m){ try{ m=new URLSearchParams(location.search).get('bwrocco'); }catch(e){} } if(!m){ try{ m=sessionStorage.getItem('bp-bwrocco'); }catch(e){} } m=String(m||DEF_ROCCO).toLowerCase(); return ROCCO_MODES.includes(m)?m:DEF_ROCCO; };   // в артефакте выбор лежит в sessionStorage 'bp-bwrocco' (меню «Экраны макета»)
/* Ролики Рокко в режиме body — таблица CLIPS в bigwin-rocco.js (idle BW-idle, cheer BW-cheer, max BW-max): ролики запускаются событиями шоу (радость — со счётчика, MAX — когда пропал свет), а не по времени шоу:
   ролик Рокко никогда не ускоряется (правило владельца) и доигрывается до покоя сам. Прежние ролики L (L-idle, L-column) и T (T-wake, T-break) из шоу убраны. */
let warmed=false;
function warm(){ if(warmed) return; warmed=true;
 // тяжёлое разовое (текстуры табло, CSS шоу, спрайты лучей) делаем в простое страницы по одному куску, а не на старте первого шоу: раньше вход в шоу был одной длинной задачей
 { const idle=window.requestIdleCallback?f=>requestIdleCallback(f,{timeout:3000}):f=>setTimeout(f,300), Q=[texBuild,ensureCSS,glowSprite,...['#ffd08a','#ffb9a0','#fff0cf','#ff3a28','#ffe2a0','#ffcf80'].map(c=>()=>beamSprite(c))];
  const next=()=>{ const f=Q.shift(); if(!f) return; try{ f(); }catch(e){} idle(next); }; idle(next); }
 try{ const a=A_BASE(), ext=IS_WEBKIT()?'.hevc.mp4':'.webm';
 if(roccoMode()==='body'&&window.BigWinRocco) window.BigWinRocco.warm(a,ext);
 new Image().src=`${a}bg-hall-${innerWidth<innerHeight?'portrait':'landscape'}.webp`; }catch(e){} }

/* палитры конфетти — цвета игры: янтарь, латунь, кремовая краска, ржаво-красный */
const PAL={warm:['#FFC861','#D8CBA8','#c0392b','#8E2F24','#c98a2c','#efe4c8','#FFC861','#D8CBA8'],
 red:['#d2402c','#8E2F24','#e8604a','#D8CBA8','#FFC861','#5b1710','#d2402c'],
 cctv:['#cfe0d4','#7FB89A','#26302a','#efe4c8','#cfe0d4','#7FB89A'],
 gold:['#FFC861','#f3e6c4','#e6a840','#c98a2c','#D8CBA8','#c0392b','#FFC861','#8E2F24']};

function play(o){
 o=o||{}; { const old=document.getElementById('bp-big'); if(old&&!old.dataset.out) return Promise.resolve(); if(old) old.remove(); }   // уходящий оверлей (data-out) не мешает: убираем его и показываем новый
 ensureCSS();
 const fmtRaw=o.moneyFmt||defaultFmt, fmt=c=>{ let s=fmtRaw(c===finalC&&o.amount>=0?o.amount:c/100);   /* итог — точная выплата игры, а не округлённые центы (иначе ARS и суммы с долями цента расходятся с WIN) */ if(typeof window.bpSocialFix==='function') s=window.bpSocialFix(s); return s; };
 const betC=Math.max(1,Math.round((o.bet>0?o.bet:1)*100)), finalC=Math.max(0,Math.round((o.amount||0)*100)), isMax=!!o.isMax||finalC>=MAXX*betC;
 const RMODE=roccoMode(o), SUM=o.summary&&o.summary.title?o.summary:null;   // SUM — шоу как итог бонуса (см. заголовок файла)
 const root=document.createElement('div'); const FXK=fxMode(o), CL=FXK!=='old'; root.id='bp-big'; root.className='bw-root'+(isMax?' max':'')+(CL?' cl':''); root.dataset.fx=FXK; const PLATE=CL?plateOpt(o):'', PLK=CL?(PLATE==='0'?'dlg':PLATE?'bp':BigWinFx.opt('pl',o)):'', HTK=CL?BigWinFx.opt('hint',o):''; const NOTE=PLK==='note', DLG=PLK==='dlg', LPK=CL?(NOTE?'bulbs':BigWinFx.opt('lamp',o)):'', TPK=CL?(NOTE||DLG?'none':BigWinFx.opt('top',o)):'', PALX=PALP[PLATE]||(NOTE?PAL3N:DLG?PAL3D:PAL3); if(CL){ root.dataset.pl=PLK; root.dataset.lamp=LPK; root.dataset.hint=HTK; root.dataset.top=TPK; root.dataset.bwp=PLATE; } if(SUM) root.dataset.sum='1'; root.setAttribute('role','dialog'); root.setAttribute('aria-label',(isMax?'Max win ':'Big win ')+fmt(finalC));
 let closed=false, resolve, onKey=null; const promise=new Promise(r=>resolve=r);
 const under=document.getElementById('app'), underVis=under?under.style.visibility:'';   // игра под непрозрачным шоу не рисуется: меньше нагрузки на слабых устройствах
 const gone=()=>{ if(root.isConnected) root.remove(); if(under) under.style.visibility=underVis; };
 const SLW=()=>Math.max(1,window.__slow||1), FADE_IN=.16, FADE_OUT=.22;   // с, плавное появление и уход оверлея: под ним тот же Рокко на том же месте, поэтому не «вырезка», а затемнение вокруг него
 const close=()=>{ if(closed) return; closed=true; clearTimeout(S.autoT); if(onKey) removeEventListener('keydown',onKey); window.bpAudio&&bpAudio.bigwinEnd(); cancelAnimationFrame(S.raf); if(onResize) removeEventListener('resize',onResize);
  const fade=!(SUM&&SUM.hold)&&!isRM()&&!window.__sim&&root.isConnected;   // обычное закрытие: оверлей гаснет за 0,22 с (data-out: игра его уже не считает окном, см. dialogOpen в ui.js); Рокко к этому времени в покое — под оверлеем тот же Рокко
  if(fade&&ROC) ROC.restNow();
  const hold=!!(SUM&&SUM.hold);
  if(!fade){ if(ROC&&!hold) ROC.destroy(); VIDS.forEach(v=>{ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} }); }
  if(hold){ if(ROC) ROC.restNow(); root.style.pointerEvents='none'; setTimeout(()=>{ if(ROC) ROC.destroy(); gone(); },9500); }   // итог бонуса под шторкой: Рокко стоит в покое на месте, пока шторка не закроет всё
  else if(fade){ root.dataset.out='1'; root.style.pointerEvents='none'; if(under) under.style.visibility=underVis; root.style.transition=`opacity ${FADE_OUT*SLW()}s ease`; root.style.opacity='0'; let d1=0; const outDone=()=>{ if(d1) return; d1=1; root.removeEventListener('transitionend',outEnd); if(ROC) ROC.destroy(); VIDS.forEach(v=>{ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} }); gone(); }, outEnd=e=>{ if(e.target===root) outDone(); };
   root.addEventListener('transitionend',outEnd); setTimeout(outDone,FADE_OUT*SLW()*2000+400); }
  else gone();   // hold: итог бонуса остаётся под шторкой, пока страница не ушла (иначе между закрытием и шторкой мелькает пустая сцена)
  try{ o.onDone&&o.onDone(); }finally{ resolve(); } };
 const S={sc:null,t:0,running:false,warp:null,ch:-1,finished:false,raf:0,static:false,dev:innerWidth<innerHeight?'phone':'desk',last:0};
 let VIDS=[], LPS=[], OBJ=null, onResize=null, ROC=null;

 /* мгновенный режим (симуляция раундов в ui.js): пустой оверлей без сцены; первый next() «доматывает», второй закрывает */
 if(window.__sim){ let fin=false; root.next=()=>{ if(closed) return; if(!fin){ fin=true; return; } close(); }; document.body.append(root); return promise; }

 root.dataset.dev=S.dev; root.dataset.rocco=RMODE; root.classList.toggle('bw-rm',isRM());
 const a=A_BASE(), ext=IS_WEBKIT()?'.hevc.mp4':'.webm';
 const setBg=()=>{ const e=root.querySelector('.bw-bg'); if(e) e.style.backgroundImage=bpvT`url(${a}bg-hall-${S.dev==='phone'?'portrait':'landscape'}.webp)`; };
const roccoHTML=RMODE==='eyes'?`<div class="bw-re" data-re><i class="bw-re-pit"></i><div class="bw-re-eyes"><i class="bw-re-e"><b></b></i><i class="bw-re-e"><b></b></i></div></div>`
  :RMODE==='monitor'?`<div class="bw-mon" data-rm><i class="bw-mon-arm"></i><div class="bw-mon-case"><div class="bw-mon-scr"><i class="bw-mon-bg"></i><video class="bw-mon-v" muted playsinline preload="auto" src="${a}rocco/K-cheer${ext}"></video><i class="bw-mon-nz"></i><i class="bw-mon-scan"></i><i class="bw-mon-vg"></i><i class="bw-mon-gl"></i><span class="bw-mon-osd"><b>CAM 02</b><b><i></i>REC</b></span></div><div class="bw-mon-pan"><i class="bw-mon-led"></i><span>CAM-02</span><i class="bw-mon-kn"></i></div></div><i class="bw-mon-cab"></i></div>`:'';
 const RAILN=11, railHTML=CL&&TPK==='bolts'?`<div class="bw3-rail">${Array.from({length:RAILN},()=>'<i class="bw3rb"></i>').join('')}</div>`:'';
 const defsHTML=CL?'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="bw-worn" x="-2%" y="-5%" width="104%" height="110%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 14 0 0 0 -3.7" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter><radialGradient id="bw-halo"><stop offset="0" stop-color="#ffb04a" stop-opacity=".75"/><stop offset=".45" stop-color="#ff9a30" stop-opacity=".22"/><stop offset="1" stop-color="#ff9a30" stop-opacity="0"/></radialGradient></defs></svg>':'';
 root.innerHTML=`<div class="bw-stage" data-stage><div class="bw-bg"></div><div class="bw-dim"></div><div class="bw-wash"></div><div class="bw-black"></div>
  <canvas class="bw-cv bw-cvb" data-cvb></canvas><div class="bw-pool"></div>${CL?'':'<div class="bw-siren"><b></b><i></i></div>'}
  ${roccoHTML}
  <div class="bw-cctv"><div class="bw-tint"></div><div class="bw-scan"></div><div class="bw-roll"></div><div class="bw-br a"></div><div class="bw-br b"></div><div class="bw-br c"></div><div class="bw-br d"></div>
   <div class="bw-hud tl">CAM 03 · HALL</div><div class="bw-hud tr"><i class="rec"></i>REC</div><div class="bw-hud bl" data-tc>02:14:07</div><div class="bw-tear a"></div><div class="bw-tear b"></div><div class="bw-drop"></div><div class="bw-noise"></div></div>
  <div class="bw-vig"></div><div class="bw-cur l"></div><div class="bw-cur r"></div>
  <div class="bw-ui">
   <div class="bw-obj" data-obj><div class="bw3">${CL?'':'<i class="bw3-bell"><b></b><u></u></i>'}<div class="bw3-body">${railHTML}<i class="bw3-scr tl"></i><i class="bw3-scr tr"></i><i class="bw3-scr bl"></i><i class="bw3-scr br"></i>
    <div class="bw3-sign" data-sign><span data-kick>BIG WIN</span></div>
    <div class="bw3-win"><canvas data-wcv></canvas><i class="bw3-glass"><i class="bw3-sweep"></i></i><i class="bw3-fl"></i></div>
    <div class="bw3-tit"><canvas data-tcv></canvas><i class="bw3-glass"></i></div>
    </div></div></div>
   <div class="bw-hint" data-hint><i class="bw-hl"></i><span class="bw-ht" data-ht></span><i class="bw-hl r"></i></div>
  </div>
  <canvas class="bw-cv bw-cvf" data-cvf style="z-index:6"></canvas></div>
  <div class="bw-sr" data-sr aria-live="polite"></div>${defsHTML}`;
 setBg(); document.body.append(root);
 if(under){ if(isRM()) under.style.visibility='hidden'; else { root.style.opacity='0'; void root.offsetWidth; root.style.transition=`opacity ${FADE_IN*SLW()}s linear`; root.style.opacity='1';
  let d0=0; const inDone=()=>{ if(d0) return; d0=1; root.removeEventListener('transitionend',inEnd); root.style.transition=''; root.style.opacity=''; if(!closed&&under) under.style.visibility='hidden'; }, inEnd=e=>{ if(e.target===root) inDone(); };
  root.addEventListener('transitionend',inEnd); setTimeout(inDone,FADE_IN*SLW()*2000+400); } }   // зал прячем, когда оверлей проявился (по окончании перехода, а не по таймеру: на тормозящей странице таймер раньше кадра)   // оверлей проявляется за 0,16 с поверх зала (зал скрывается после): Рокко шоу стоит ровно на Рокко зала и не прыгает
const q=s=>root.querySelector(s), STAGE=q('[data-stage]'), KICKT=q('[data-kick]'), SIGN=q('[data-sign]'), HINT=q('[data-hint]'), HT=q('[data-ht]'), SR=q('[data-sr]'), TC=q('[data-tc]'),
  CVB=q('[data-cvb]'), CVF=q('[data-cvf]'), WCV=q('[data-wcv]'), TCV=q('[data-tcv]'), SWEEP=q('.bw3-sweep'), BELL=q('.bw3-bell'), RAIL=[...root.querySelectorAll('.bw3rb')], RE=q('[data-re]'), RM=q('[data-rm]'), MV=q('.bw-mon-v'), REP=RE?[...RE.querySelectorAll('.bw-re-e b')]:[];
 OBJ=q('[data-obj]'); LPS=[...root.querySelectorAll('.bw3l')]; VIDS=[...root.querySelectorAll('video')];
 VIDS.forEach(v=>{ v.muted=true; v.setAttribute('playsinline',''); });
  const V=(n,v)=>root.style.setProperty(n,v), OV=(n,v)=>OBJ.style.setProperty(n,v);
 const hintText=()=>SUM&&S.finished?(SUM.btn||'CONTINUE'):CL?(S.dev==='phone'?(S.finished?(isMax?'MAX WIN — ROUND ENDS · TAP':'TAP ANYWHERE · CLOSE'):'TAP ANYWHERE · SKIP'):(S.finished?(isMax?'MAX WIN — ROUND ENDS · CLICK OR SPACE':'CLICK OR SPACE · CLOSE'):'CLICK OR SPACE · SKIP')):S.dev==='phone'?(S.finished?(isMax?'Max win · Tap to continue':'Tap to continue'):'Tap to skip'):(S.finished?(isMax?'The round ends at the max win. Tap or press Space to continue':'Tap or press Space to continue'):'Tap or press Space to skip');   // на телефоне пробела нет — короче и в одну строку

 /* ---- раскладка: размеры плашки, канвасы, события для частиц ---- */
 const L={cw:0,ch:0,u:10,dpr:1,px:0,py:0,pw:0,ph:0,em:10};
 /* Рокко в рост (?bwrocco=body): тот же Рокко, что в игре, на том же месте (bigwin-rocco.js); слои вставляются перед слоем камер, чтобы виньетка и занавес остались поверх. Плашка и подсказка — то, на что он не должен налезать
    (телефон стоя: налезает — Рокко нет; телефон боком: плашка сдвигается влево, roccoFit()). Размеры плашки берутся из раскладки (L), без масштаба удара: на входе плашка падает увеличенной */
 if(RMODE==='body'&&window.BigWinRocco){ ROC=window.BigWinRocco.create({stage:STAGE,before:q('.bw-cctv'),a,ext,dev:S.dev,K:()=>{ const g=gameTime(); return g&&g.K?g.K():1; },RM:isRM,
  avoid:()=>{ try{ const hr=HT.getBoundingClientRect(); return [{left:L.px-L.pw/2,right:L.px+L.pw/2,top:L.py-L.ph/2,bottom:L.py+L.ph/2,width:L.pw,height:L.ph},hr]; }catch(e){ return []; } }}); root.rocco=ROC; }
 /* Не поместился рядом с плашкой — на широком экране (телефон боком) сдвигаем плашку влево ровно настолько, чтобы Рокко встал на своё место (--rkdx в CSS у --cx); не хватает места и так — Рокко нет */
 function roccoFit(){ if(!ROC) return; root.style.setProperty('--rkdx','0px'); ROC.layout(); if(ROC.fit||!ROC.box||S.dev==='phone'||CL) return;
  const b=ROC.box, right=L.px+L.pw/2, left=L.px-L.pw/2, dx=Math.ceil(right-(b.l-6)); if(dx>0&&left-dx>=8){ root.style.setProperty('--rkdx',dx+'px'); layout(); ROC.layout(); } }
 const ctxB=CVB.getContext('2d'), ctxF=CVF.getContext('2d'), ctxW=WCV.getContext('2d'), ctxT=TCV.getContext('2d'), BW3=q('.bw3');
 let FX=[], IMP=[]; const DC={fx:FXK,W:0,H:0,u:10,dpr:1,lamp:.9,ps:1};   // DC — общие числа для рисования частиц bigwin-fx.js
 /* ---- табло: раскладка и барабаны (холсты), строка главы, лампы ---- */
 const NR=isMax?5:4, PQ={k:1,s:14,items:[],spr:null,ttl:null,coin:null,wh:24,sc:1};
 const vfAt=tt=>(tt>=S.sc.tF-1e-6?S.sc.final:Math.min(S.sc.final,S.sc.f(tt)*betC))*PQ.sc;   // сумма в «центах» ТОГО, ЧТО НАПИСАНО на табло, в момент tt (PQ.sc — масштаб: в проверочном режиме ?cur=ARS строка суммы в 10 000 раз больше внутренней, цифры барабанов берутся из строки)
 function plqFit(){
  const q=OBJ.offsetWidth/100||5, dpr=Math.min(2,window.devicePixelRatio||1), k=q*dpr*(q<5?1.3:1); PQ.k=k;
  /* ячейки суммы: монета-знак валюты (если есть), цифры-барабаны, разделители, код валюты (SC, ARS) в конце */
  const str=fmt(S.sc.final), raw=parseCells(str); let pre='', suf=''; const items=[]; { const dd=+str.replace(/[^0-9]/g,''); PQ.sc=S.sc.final>0&&dd>0?dd/S.sc.final:1; }   // цифры строки (сумма ×100) / внутренние центы
  for(const c of raw){ if(c.t==='cy') pre+=c.ch; else if(c.t==='cc') suf+=c.ch; else items.push({...c}); }
  if(pre) items.unshift({t:'pre',text:pre}); if(suf) items.push({t:'cc',text:suf});
  const m=measureCtx(); m.font='400 100px "Black Ops One"'; let adv=0; for(const d of '0123456789') adv=Math.max(adv,m.measureText(d).width/100);
  const rMin=adv*1.02*1.12, rMax=.97, COIN=.68, SEP=.243, GAP=.05, sufW=suf?(m.measureText(suf).width/100+suf.length*.12)*.34+.35:0;   // доли кегля цифры s
  const nd=items.filter(c=>c.t==='dg').length, nsep=items.filter(c=>c.t==='cm').length, rest=nsep*SEP+(pre?COIN:0)+sufW+(items.length-1)*GAP, AW=83.6;
  let s=14, r=(AW/14-rest)/Math.max(1,nd); if(r>=rMax) r=rMax; else if(r<rMin){ r=rMin; s=AW/(nd*rMin+rest); }
  PQ.s=s; PQ.r=r; PQ.wh=1.714*s;
  const wd=r*s; let tot=0; items.forEach(c=>{ c.w=c.t==='dg'?wd:c.t==='cm'?SEP*s:c.t==='pre'?COIN*s:sufW*s; tot+=c.w; }); tot+=(items.length-1)*GAP*s; let x=(87.6-tot)/2; items.forEach(c=>{ c.x=x; x+=c.w+GAP*s; c.pos=0; c.ps=0; c.blur=0; c.on=true; });
  PQ.items=items;
  WCV.width=Math.round(87.6*k); WCV.height=Math.round(PQ.wh*k); WCV.style.aspectRatio='87.6/'+PQ.wh.toFixed(3); TCV.width=Math.round(78*k); TCV.height=Math.round(8.2*k);
  OBJ.style.setProperty('--lg',NR>4?4.4:6);
  plqBake(); }
 function plqBake(){
  const k=PQ.k, pal=PALX, mk=(w,h)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
  /* цифры: краска по тёмному окну, лёгкая выпуклость и ореол (поля pad вокруг цифры) */
  const Hd=PQ.s*k, pad=Math.ceil(Hd*.3); PQ.Hd=Hd;
  PQ.spr=[...'0123456789'].map(d=>{ const w=Math.ceil(Hd*.9)+2*pad, h=Math.ceil(Hd*1.1)+2*pad, c=mk(w,h), g=c.getContext('2d'); g.font=`400 ${Hd*1.02}px "Black Ops One"`; g.textAlign='center'; g.textBaseline='alphabetic'; const by=h*.5+Hd*.37;
   g.save(); g.shadowColor=pal.glow[0]; g.shadowBlur=Hd*(CL?.05:pal.glow[1]);   // чистый вид: цифры без ореола g.fillStyle=pal.glow[0]; g.fillText(d,w/2,by); g.fillText(d,w/2,by); g.restore();
   if(pal.ol){ g.lineJoin='round'; g.lineWidth=Hd*.075; g.strokeStyle=pal.ol; g.strokeText(d,w/2,by); } g.fillStyle=pal.dsh; g.fillText(d,w/2,by+.35*k); const gr=g.createLinearGradient(0,by-Hd*.75,0,by); gr.addColorStop(0,pal.dig[0]); gr.addColorStop(1,pal.dig[1]); g.fillStyle=gr; g.fillText(d,w/2,by); return {c,w,h}; });
  /* строки глав (4, на MAX — 5) */
  const th=4.5*k; PQ.ttl=Array.from({length:NR},(_,j)=>{ const i=j+1, str=CHAP[i].name, c=mk(Math.ceil(76*k),Math.ceil(th*1.4)), g=c.getContext('2d'); g.font=`400 ${th}px "Black Ops One"`; g.textAlign='center'; g.textBaseline='alphabetic'; const by=th*1.05; g.letterSpacing=(th*.06)+'px';
   g.fillStyle=pal.tsh; g.fillText(str,c.width/2,by+.3*k); const gr=g.createLinearGradient(0,by-th*.75,0,by), col=pal.tt[i-1]; gr.addColorStop(0,col[0]); gr.addColorStop(1,col[1]); g.fillStyle=gr; g.fillText(str,c.width/2,by); return c; });
  /* знак валюты на монете */
  const it=PQ.items.find(c=>c.t==='pre'); if(it){ const dd=Math.ceil(PQ.s*.79*k), c=mk(dd,dd), g=c.getContext('2d'), cn=pal.coin; const rg=g.createRadialGradient(dd*.38,dd*.32,0,dd/2,dd/2,dd/2); rg.addColorStop(0,cn[0]); rg.addColorStop(.55,cn[1]); rg.addColorStop(1,cn[2]); g.fillStyle=rg; g.beginPath(); g.arc(dd/2,dd/2,dd/2-.4*k,0,6.283); g.fill(); g.strokeStyle=cn[3]; g.lineWidth=.35*k; g.stroke();
   const fs=dd*(it.text.length>1?.4:.62); g.font=`400 ${fs}px "Black Ops One"`; g.textAlign='center'; g.fillStyle=cn[4]; g.fillText(it.text,dd/2,dd*.69+.2*k); g.fillStyle=cn[5]; g.fillText(it.text,dd/2,dd*.68); PQ.coin=c; } else PQ.coin=null; }
 /* положение барабана p в момент tt: одометр; у копеечных барабанов последние 0,8 с — свободное вращение с торможением, чтобы остановка читалась (счёт копеек иначе слишком быстрый) */
 const TAIL=.8;
 function colAt(tt,p){ const sc=S.sc, e=1/90, p10=Math.pow(10,p), base=colPos(vfAt(tt),p,Math.abs(vfAt(tt+e)-vfAt(tt-e))/(2*e)/p10);
  if(p>1||tt<sc.tF-TAIL) return base;
  const t0=sc.tF-TAIL, p0=colPos(vfAt(t0),p,Math.abs(vfAt(t0+e)-vfAt(t0-e))/(2*e)/p10), tgt=Math.floor(Math.round(sc.final*PQ.sc)/p10+1e-9), D=p===0?58:41, T=tgt+10*Math.ceil((p0+D-tgt)/10), u=clamp((tt-t0)/TAIL), ez=1-Math.pow(1-u,3);
  return p0+(T-p0)*ez; }
 function plqState(t,st){   // положение, скорость и «зажжённость» барабанов в момент t
  const sc=S.sc, nInt=digitsOf(Math.floor(vfAt(t)+1e-6)), litN=Math.max(3,nInt), fin=t>=sc.tF-1e-6, uF=t-sc.tF;
  for(const c of PQ.items){ if(c.t==='dg'){ const a=colAt(t,c.p), b=colAt(t-1/60,c.p); c.pos=a+(fin&&!st?osc(uF-c.p*.045,.17*Math.pow(.8,c.p),26,8.5):0); c.ps=st?0:Math.abs(a-b)*60; c.blur=clamp((c.ps-5)/26); c.on=c.p<litN; } else if(c.t==='cm') c.on=c.p<litN; } }
 function plqWin(){
  const c=ctxW, k=PQ.k, W=WCV.width, H=WCV.height, Hd=PQ.Hd, R=Hd/(2*Math.sin(Math.PI/10)), cy=H/2, pal=PALX, it=PQ.items, fin=.7*k*PQ.s/14, n=it.length;
  c.clearRect(0,0,W,H); if(pal.win){ c.fillStyle=pal.win; c.fillRect(0,0,W,H); }
  it.forEach((cl,i)=>{ const x=cl.x*k, w=cl.w*k, cx=x+w/2;
   if(cl.t==='pre'){ if(PQ.coin){ const d=PQ.coin.width*.9; c.drawImage(PQ.coin,cx-d/2,cy-d/2,d,d); } }
   else if(cl.t==='cm'){ const r=1.1*k*PQ.s/14, yy=cy+Hd*.34, gr=c.createRadialGradient(cx-r*.3,yy-r*.3,0,cx,yy,r*1.2); gr.addColorStop(0,pal.dot[0]); gr.addColorStop(1,pal.dot[1]); c.globalAlpha=cl.on?1:.42; c.fillStyle=gr; c.beginPath(); c.arc(cx,yy,r,0,6.283); c.fill();
    if(cl.ch===','){ c.strokeStyle=pal.dot[1]; c.lineWidth=r*.8; c.lineCap='round'; c.beginPath(); c.moveTo(cx,yy+r*.4); c.quadraticCurveTo(cx,yy+r*2.2,cx-r*1.3,yy+r*2.7); c.stroke(); } c.globalAlpha=1; }
   else if(cl.t==='cc'){ const fs=Hd*.34; c.font=`400 ${fs}px "Black Ops One"`; c.textAlign='center'; c.textBaseline='alphabetic'; c.letterSpacing=(fs*.12)+'px'; const gr=c.createLinearGradient(0,cy,0,cy+fs); gr.addColorStop(0,pal.dig[0]); gr.addColorStop(1,pal.dig[1]); c.fillStyle=pal.dsh; c.fillText(cl.text,cx,cy+Hd*.37+.3*k); c.fillStyle=gr; c.fillText(cl.text,cx,cy+Hd*.37); c.letterSpacing='0px'; }
   else { c.save(); c.beginPath(); c.rect(x,0,w,H); c.clip();
    let gr; if(pal.col){ gr=c.createLinearGradient(x,0,x+w,0); gr.addColorStop(0,pal.col[0]); gr.addColorStop(.5,pal.col[1]); gr.addColorStop(1,pal.col[2]); c.fillStyle=gr; c.fillRect(x,0,w,H); }
    const ns=cl.blur>.1?9:1, spreadD=Math.min(1.35,cl.ps/60*.9), pos=cl.pos, dimA=cl.on?1:.42;
    for(let s=0;s<ns;s++){ const off=ns>1?((s/(ns-1))-.5)*spreadD:0, p=pos+off, al=ns>1?Math.min(1,1.35/ns+.04):1;
     for(let j=Math.floor(p)-3;j<=Math.floor(p)+3;j++){ const phi=(j-p)*Math.PI/5; if(Math.abs(phi)>1.45) continue; const sc=Math.cos(phi), y=cy+R*Math.sin(phi), sp=PQ.spr[((j%10)+10)%10], hh=sp.h*sc, ww=sp.w;
      c.globalAlpha=al*(.2+.8*sc*sc)*dimA; c.drawImage(sp.c,cx-ww/2,y-hh/2,ww,hh); } }
    c.globalAlpha=1;
    if(pal.paper){ gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,`rgba(${pal.paper},1)`); gr.addColorStop(.2,`rgba(${pal.paper},.97)`); gr.addColorStop(.3,`rgba(${pal.paper},.4)`); gr.addColorStop(.37,`rgba(${pal.paper},0)`); gr.addColorStop(.63,`rgba(${pal.paper},0)`); gr.addColorStop(.7,`rgba(${pal.paper},.4)`); gr.addColorStop(.8,`rgba(${pal.paper},.97)`); gr.addColorStop(1,`rgba(${pal.paper},1)`); if(pal.cut) c.globalCompositeOperation='destination-out'; c.fillStyle=gr; c.fillRect(x,0,w,H); c.restore(); }   // записка: края барабана уходят в цвет бумаги
    else {
    gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,'rgba(0,0,0,.9)'); gr.addColorStop(.2,'rgba(0,0,0,.32)'); gr.addColorStop(.38,'rgba(0,0,0,0)'); gr.addColorStop(.62,'rgba(0,0,0,0)'); gr.addColorStop(.8,'rgba(0,0,0,.4)'); gr.addColorStop(1,'rgba(0,0,0,.92)'); c.fillStyle=gr; c.fillRect(x,0,w,H);
    gr=c.createLinearGradient(0,cy-H*.34,0,cy-H*.14); gr.addColorStop(0,'rgba(255,240,215,0)'); gr.addColorStop(.5,'rgba(255,240,215,.09)'); gr.addColorStop(1,'rgba(255,240,215,0)'); c.fillStyle=gr; c.fillRect(x,cy-H*.34,w,H*.2);
    gr=c.createLinearGradient(x,0,x+w,0); gr.addColorStop(0,'rgba(255,230,190,.10)'); gr.addColorStop(.12,'rgba(255,230,190,0)'); gr.addColorStop(.88,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.35)'); c.fillStyle=gr; c.fillRect(x,0,w,H);
    c.restore(); } }
   if(i<n-1&&(cl.t==='dg'||it[i+1].t==='dg')){ const fx=x+w+fin/2, gg=c.createLinearGradient(fx-fin/2,0,fx+fin/2,0); gg.addColorStop(0,pal.sep[0]); gg.addColorStop(.5,pal.sep[1]); gg.addColorStop(1,pal.sep[2]); c.fillStyle=gg; c.fillRect(fx-fin/2,0,fin,H); } }); }
 function plqTitle(t,T){   // строка главы — барабан из строк (пусто, затем названия глав), на каждой главе перекатывается с отскоком
  const ct=ctxT, TW=TCV.width, TH=TCV.height, tcy=TH/2, Rt=TH*.9; ct.clearRect(0,0,TW,TH); if(PALX.tbg){ ct.fillStyle=PALX.tbg; ct.fillRect(0,0,TW,TH); }
  let tp=0; for(let i=1;i<=NR;i++){ if(T[i]<=t) tp=i-1+easeBack((t-T[i])/.62); }
  for(let j=Math.floor(tp)-2;j<=Math.ceil(tp)+2;j++){ if(j<1||j>NR) continue; const phi=(j-tp)*Math.PI/3.5; if(Math.abs(phi)>1.4) continue; const sc=Math.cos(phi), y=tcy+Rt*Math.sin(phi), sp=PQ.ttl[j-1], hh=sp.height*sc; ct.globalAlpha=.25+.75*sc*sc; ct.drawImage(sp,0,y-hh*.5,sp.width,hh); }
  ct.globalAlpha=1; const sh=PALX.paper||'0,0,0', sa=PALX.paper?.95:.72, g2=ct.createLinearGradient(0,0,0,TH); g2.addColorStop(0,`rgba(${sh},${sa})`); g2.addColorStop(.3,`rgba(${sh},0)`); g2.addColorStop(.7,`rgba(${sh},0)`); g2.addColorStop(1,`rgba(${sh},${sa})`); ct.fillStyle=g2; if(PALX.cut) ct.globalCompositeOperation='destination-out'; ct.fillRect(0,0,TW,TH); ct.globalCompositeOperation='source-over'; }
 const sagAt=(t,per,off)=>{ const p=((t+off)%per+per)%per; return Math.exp(-Math.pow((p-.25)/.12,2)); };   // короткий провал накала: раз в per секунд, ~0,3 с
 const RAIL_BASE=[1,1,.55,1,0,1,1,.5,1,0,1], RAIL_TIRED=5;   // ряд ламп верхней планки: 0 — перегорела, .55 — тусклая; одна (RAIL_TIRED) подмигивает
 const sv=(el,k,v)=>{ if(el._v===undefined) el._v={}; if(el._v[k]!==v){ el._v[k]=v; el.style.setProperty(k,v); } };
 function setKick(txt){ if(KICKT._s===txt) return; KICKT._s=txt; KICKT.textContent=txt; KICKT.style.setProperty('--sf',6.6); const wsg=SIGN.clientWidth*.9, wt=KICKT.offsetWidth; if(wt>wsg) KICKT.style.setProperty('--sf',(6.6*wsg/wt).toFixed(3)); }
 function fit(){ plqFit(); layout(); roccoFit(); }
 function sizeCanvas(c,w,h,dpr){ const W=Math.max(1,Math.round(w*dpr)), H=Math.max(1,Math.round(h*dpr)); if(c.width!==W) c.width=W; if(c.height!==H) c.height=H; }
 function layout(){
  const r=root.getBoundingClientRect(); L.cw=r.width||innerWidth; L.ch=r.height||innerHeight; L.dpr=Math.min(2,window.devicePixelRatio||1);
  L.u=S.dev==='phone'?L.cw/100:Math.min(L.cw/100,L.ch/62.5);
  L.dprB=.5; L.dprF=Math.min(1.5,L.dpr); sizeCanvas(CVB,L.cw,L.ch,L.dprB); sizeCanvas(CVF,L.cw,L.ch,L.dprF);
  L.pw=OBJ.offsetWidth; L.ph=OBJ.offsetHeight; L.em=parseFloat(getComputedStyle(OBJ).fontSize)||10; L.px=OBJ.offsetLeft+(OBJ.offsetParent&&OBJ.offsetParent!==root?OBJ.offsetParent.offsetLeft:0); L.py=OBJ.offsetTop;
  buildFx(); }
 /* ---- частицы: конфетти, серпантин, искры. Все положения — формулы от времени (с точностью до перемотки) ---- */
 function buildFx(){
  const sc=S.sc, T=sc.T, u=L.u, W=L.cw, H=L.ch, list=[], bursts=[];
  const ps=Math.max(1,6.2/u);                                  // на телефоне конфетти крупнее в единицах сцены, чтобы читалось
  const cannon=(t0,side,n,pal,seed,pw=1,ns=0)=>bursts.push({kind:'cannon',t0,side,n,pal,seed,pw,ns});
  const rain=(t0,n,pal,seed,dur,ns=0)=>bursts.push({kind:'rain',t0,n,pal,seed,dur,ns});
  const sparks=(t0,n,seed,pw=1)=>bursts.push({kind:'sparks',t0,n,seed,pw});
  const ring=(t0,col,amp=1)=>bursts.push({kind:'ring',t0,col,amp});
  const isM=T[5]<Infinity;
  /* вход: пушки с обеих сторон + искры от удара плашки */
  cannon(.2,-1,40,PAL.warm,11,1,2); cannon(.2,1,40,PAL.warm,12,1,2); sparks(.18,34,13); ring(.18,'#e0aa4a',.9);
  for(let k=1;k<=4;k++){ const t=T[k]; if(t===Infinity) break; const pal=k===3?PAL.red:k===4?PAL.cctv:PAL.warm;
   if(k===1){ cannon(t,-1,46,pal,21,1,2); cannon(t,1,46,pal,22,1,2); sparks(t,26,23); }
   if(k===2){ cannon(t,-1,56,pal,31,1.1,3); cannon(t,1,56,pal,32,1.1,3); rain(t+.1,60,pal,33,1.4,2); sparks(t,40,34,1.2); }
   if(k===3){ rain(t,100,pal,41,1.8,3); cannon(t,-1,50,pal,42,1.15,3); cannon(t,1,50,pal,43,1.15,3); sparks(t,48,44,1.3); }
   if(k===4){ rain(t,90,pal,51,1.4,0); cannon(t,-1,40,pal,52,1.05); cannon(t,1,40,pal,53,1.05); sparks(t,40,54,1.2); }
   ring(t,k===3?'#ff6a48':k===4?'#9fe0c0':'#e0aa4a',1+.12*k); }
  if(isM){ const t=T[5]+2.0; rain(t,200,PAL.gold,61,2.4,8); cannon(t,-1,90,PAL.gold,62,1.3,5); cannon(t,1,90,PAL.gold,63,1.3,5); sparks(t,70,64,1.4); ring(T[5],'#f3e6c4',1.8); ring(t,'#e0aa4a',1.6); }
  else { const pal=sc.x>=100?PAL.cctv:sc.x>=50?PAL.red:PAL.warm; cannon(sc.tF,-1,64,PAL.gold,71,1.15,3); cannon(sc.tF,1,64,PAL.gold,72,1.15,3); rain(sc.tF+.05,50,PAL.gold,73,1.2); sparks(sc.tF,30,74); ring(sc.tF,'#e0aa4a',1.2); }
  const FXC={fx:FXK,u,W,H,ps,px:L.px,py:L.py,pw:L.pw,ph:L.ph,lamp:.9,dpr:L.dprF};
  for(const b of bursts){
   if(b.kind==='ring'){ if(!CL) list.push({ty:'ring',t0:b.t0,col:b.col,amp:b.amp,life:.7}); continue; }
   const R=rng32(b.seed*977+1);
   if(CL){ BigWinFx.spawn(b.kind,b,FXC,R,p=>list.push(p)); continue; }   // новые осадки (bigwin-fx.js): серпантин, билеты, жетоны или пыль вместо цветного конфетти
   if(b.kind==='sparks'){ const side=[[-1,0],[1,0],[0,-1],[0,1]];
    for(let i=0;i<b.n;i++){ const s=side[i%4], bx=L.px+(s[0]?s[0]*L.pw*.5:(R()-.5)*L.pw*.96), by=L.py+(s[1]?s[1]*L.ph*.5:(R()-.5)*L.ph*.96), ang=Math.atan2(s[1]||(R()-.5)*1.4, s[0]||(R()-.5)*1.4)+(R()-.5)*1.1, sp=(30+R()*80)*u*b.pw;
     list.push({ty:'spark',t0:b.t0+R()*.06,x0:bx,y0:by,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp-14*u,k:1.9,g:60*u,life:.35+R()*.45,col:R()<.28?'#fff3d0':'#FFC861',len:.034}); }
    continue; }
   for(let i=0;i<b.n;i++){
    let x0,y0,vx,vy,k,g;
    if(b.kind==='cannon'){ const aim=b.side<0?1:-1, el=(50+R()*26)*Math.PI/180, A2=Math.atan2(-Math.sin(el),aim*Math.cos(el))+(R()-.5)*.16;   // из нижнего угла вверх и к центру
     const sp=(95+R()*100)*u*b.pw; x0=b.side<0?-1.2*u:W+1.2*u; y0=H+.5*u; vx=Math.cos(A2)*sp; vy=Math.sin(A2)*sp; k=1.45+R()*1.1; g=(15+R()*14)*k*u; }
    else { x0=R()*W; y0=-(2+R()*8)*u; vx=(R()-.5)*20*u; vy=(6+R()*18)*u; k=1.1+R()*1.0; g=(14+R()*16)*k*u; }
    const t0=b.t0+(b.kind==='rain'?R()*b.dur:R()*.09), isStream=i<b.ns;
    if(isStream){ list.push({ty:'str',t0,x0,y0,vx:vx*.62,vy:vy*.62,k:k*.78,g:g*.75,col:b.pal[(R()*b.pal.length)|0],w:Math.max(.34*u,2.2)*(1+R()*.5),ph:R()*6.28,fq:6+R()*5,amp:(.7+R()*1.2)*u,life:b.kind==='rain'?6:4.6}); continue; }
    list.push({ty:'c',t0,x0,y0,vx,vy,k,g,col:b.pal[(R()*b.pal.length)|0],w:(1.0+R()*.9)*ps*u*.9,h:(.55+R()*.5)*ps*u*.9,rot:R()*6.28,om:(R()-.5)*14,fo:3+R()*7,fp:R()*6.28,fa:(.6+R()*1.2)*u,life:7,sq:b.pal===PAL.cctv&&R()<.5}); }
  }
  FX=list.sort((p,q)=>p.t0-q.t0); }
 /* ---- название главы; длинное название не должно вылезать за край: ужимаем шрифт и «удар» по ширине сцены; на телефоне — в две строки ---- */
 /* ---- Рокко в шоу: body — bigwin-rocco.js, eyes — глаза в темноте, monitor — Рокко на мониторе, none ---- */
 function vidDrive(v,want,visible,holding){   // общий драйвер роликов: живое воспроизведение идёт само, при перемотке/«меньше движения» ставим кадр руками
  if(!v||!(v.readyState>=1)) return;
  if(S.static||!S.running||S.warp){ if(Math.abs(v.currentTime-want)>.02) v.currentTime=want; if(!v.paused) v.pause(); return; }
  if(!visible||holding){ if(!v.paused) v.pause(); if(holding&&Math.abs(v.currentTime-want)>.1) v.currentTime=want; return; }
  const pr=Math.min(8,isTurbo()?2.4:1); if(Math.abs(v.playbackRate-pr)>.01) v.playbackRate=pr;
  if(Math.abs(v.currentTime-want)>.4) v.currentTime=want; if(v.paused) v.play().catch(()=>{}); }
 function eyesUpdate(t,ch,st,dip,blk){
  const ph=S.dev==='phone', k=(L.pw/L.u)/60*(ph?.62:1), T=S.sc.T, tF=S.sc.tF, fin=t>=tF-1e-6, w=st?0:1;
  const E=[0,2.0,2.35,2.8,3.3], DX=[0,26,21,16,11], DY=[0,9,7.4,5.6,4], c=Math.max(1,Math.min(4,ch)), c0=Math.max(1,c-1), u=ch>1?sm((t-T[c])/.9):1;   // размер, сдвиг вправо от центра плашки, высота над верхом плашки — по главам; глаза подходят ближе
  const e=lerp(E[c0],E[c],u), dx=lerp(DX[c0],DX[c],u)*k, dy=lerp(DY[c0],DY[c],u);
  const ex=L.px+dx*L.u+w*Math.sin(t*.5)*.25*L.u, ey=L.py-L.ph/2-dy*(ph?1.3:1)*L.u+w*Math.sin(t*.7)*.18*L.u;
  const alpha=ch?clamp((t-T[1])/.5)*(1-.92*dip)*(1-blk):0;   // появляются плавно (без «зажигания» рывками: мерцание безопасное)
  let bk=0; if(!st){ for(let i=0;i<8;i++){ const tb=1.55+i*2.1+hash(i*7+3)*.9, x=(t-tb)/.17; if(x>=0&&x<1) bk=Math.max(bk,Math.sin(x*Math.PI)); } const xs=(t-tF-.25)/.55; if(xs>=0&&xs<1) bk=Math.max(bk,Math.sin(xs*Math.PI)); }   // моргание: изредка и медленное после остановки счёта
  const vx=L.px-ex, vy=L.py-ey, vl=Math.hypot(vx,vy)||1, still=fin||st, rd=.2+(still?0:.03*Math.sin(t*9)), px=vx/vl*rd+(still?0:Math.sin(t*3.1)*.05), py=vy/vl*rd+(still?0:Math.cos(t*2.3)*.03);   // зрачки смотрят на сумму
  sv(RE,'--ex',ex.toFixed(1)+'px'); sv(RE,'--ey',ey.toFixed(1)+'px'); sv(RE,'--es',e.toFixed(3)); sv(RE,'--ea',(alpha*.9).toFixed(3)); sv(RE,'--bk',(.9*(1-.93*bk)).toFixed(3)); sv(RE,'--tilt',(-5+w*Math.sin(t*.4)*1.2).toFixed(2));
  REP.forEach(p=>{ sv(p,'--px',px.toFixed(3)); sv(p,'--py',py.toFixed(3)); sv(p,'--ps',(.13+.025*ch+(fin?.02:0)).toFixed(3)); }); }
 const MP=4.88;   // длина петли ролика K-cheer, сек
 function monUpdate(t,ch,st,dip,blk){
  const T=S.sc.T, c=Math.min(ch,4), last=c?t-T[c]:99, want=((t-.2)%MP+MP)%MP;
  vidDrive(MV,want,true,false);
  const broken=!st&&ch>=4&&((last>=0&&last<.12)||(last>=.45&&last<.55));   // на 100× картинка рвётся — короткими провалами, не чаще трёх раз в секунду (безопасное мерцание)
  MV.style.opacity=(broken?0:(1-.8*dip)).toFixed(2);
  MV.style.filter=`${ch>=3?'sepia(.55) hue-rotate(-14deg) saturate(1.1)':'saturate(.8)'} contrast(1.08) brightness(1.05)`;
  const nzv=.12+(ch>=4&&!st?.55*Math.exp(-last*1.4):0)+(broken?.5:0)+(ch===1&&last<.4&&!st?.3:0); sv(RM,'--nz',Math.min(1,nzv).toFixed(2)); sv(RM,'--nzx',(hash(Math.floor(t*30)*3+1)*100).toFixed(0)+'%'); sv(RM,'--nzy',(hash(Math.floor(t*30)*3+2)*100).toFixed(0)+'%');
  sv(RM,'--tint',ch>=3?'180,40,30':'30,90,60'); sv(RM,'--ti',(ch>=3?.28*sm(last/.5):.2).toFixed(3)); sv(RM,'--rec',st||Math.floor(t*1.6)%2===0?1:.15);
  sv(RM,'--mk',(last<.5&&!st?osc(last,1.1,48,9):0).toFixed(2)); sv(RM,'--mo',(sm((t-.3)/.5)*(1-blk)).toFixed(3)); }

 /* ---- лучи, пыль ---- */
 function drawBack(t,st,s){   // s: {ch,lamp,pulse,u5,fin,hit}
  const g=ctxB, dpr=L.dprB, W=L.cw, H=L.ch; g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H); g.globalCompositeOperation='lighter';
  const beam=(col,ax,ay,ang,len,wid,al)=>{ if(al<.01||(CL&&!/[?&]bwbeam=1/.test(location.search))) return;   /* 2026-10-12 fb/win2: лучи-прожекторы — «типичная ИИ-картинка», в чистом виде убраны (?bwbeam=1 вернёт) */ const sp=beamSprite(col); g.save(); g.translate(ax,ay); g.rotate(ang); g.globalAlpha=al; g.drawImage(sp,-160*wid,0,320*wid,len); g.restore(); };
  const lamp=s.lamp, phone=S.dev==='phone', len=H*1.28;
  const sw=st?0:Math.sin(t*.9);
  if(s.ch<5||s.u5>1.3){
   const a1=.46*lamp*(s.ch===3?.45:1)*(s.ch===4?.4:1), col=s.ch===3?'#ffb9a0':'#ffd08a';
   beam(col,W*(phone?.1:.14),-H*.04,(-.34+.22*sw*(.5+.5*s.ch/4))*1,len,1.05,a1);
   beam(col,W*(phone?.9:.74),-H*.04,(.34-.22*Math.sin(t*.7+1))*1,len,1.05,a1);
   if(s.ch>=2) beam('#fff0cf',W*.5,-H*.05,.12*Math.sin(t*.55+2),len*.9,.8,.16*lamp);
  }
  if(s.ch===3){ const rot=t*2.5; for(let i=0;i<2;i++){ const ang=rot+i*Math.PI, k=Math.cos(ang); if(k>0){ beam('#ff3a28',W*.5,0,Math.sin(ang)*1.15,len*1.1,1.2,.62*k*s.i3); } } }
  if(s.ch===5&&s.u5>1.3&&!st){ beam('#ffe2a0',L.px,-H*.04,0,H*1.1,2.2,.2*sm((s.u5-1.3)/1.2)); }
  /* лучи-веер из центра плашки: на ударах и на финише */
  if(s.fan>.01&&!st&&!s.lq){ const n=12, base=t*.25; for(let i=0;i<n;i++){ beam('#ffcf80',L.px,L.py,base+i*Math.PI*2/n,Math.max(W,H)*.7,.28,.16*s.fan*(i%2?.7:1)); } }
  /* пыль в лучах */
  if(!st&&!s.lq){ g.globalCompositeOperation='lighter'; const R=14*L.u; for(let i=0;i<34;i++){ const h1=hash(i*31+7),h2=hash(i*17+3),h3=hash(i*5+11); const x=(h1*W+Math.sin(t*.2+i)*3*L.u)%W, y=((h2*H+t*(2+h3*5)*L.u*.5)%H); const tw=.5+.5*Math.sin(t*(1+h3*2)+i*3);
    g.fillStyle=`rgba(255,226,170,${(.16+.2*tw)*lamp})`; g.beginPath(); g.arc(x,y,Math.max(1,.16*L.u*(.6+h3)),0,6.283); g.fill(); } }
  g.globalCompositeOperation='source-over'; }
 /* ---- конфетти, серпантин, искры, кольца ---- */
 function drawFront(t,st,s){
  const g=ctxF, dpr=L.dprF, W=L.cw, H=L.ch, u=L.u; g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H); if(st) return;
  if(CL){ DC.W=W; DC.H=H; DC.u=u; DC.dpr=dpr; DC.lamp=s.lamp; }
  const dark=s.ch===4;   // на 100× часть конфетти — квадратики помех
  let ci=0;
  for(const p of FX){ if(p.t0>t) break; const tau=t-p.t0; if(p.fk){ if(tau>p.life||(s.lq&&(ci++&1))) continue; BigWinFx.draw(g,p,tau,DC); continue; } if(s.lq&&p.ty==='c'&&(ci++&1)) continue;
   if(p.ty==='ring'){ if(tau>p.life) continue; const e=easeOut(tau/p.life), d=e*(1.0*L.em)*p.amp+.3*L.em, a=Math.pow(1-e,1.6); g.save(); g.globalAlpha=a*.9; g.lineWidth=Math.max(1.2,.1*L.em*(1-e)); g.strokeStyle=p.col; g.globalCompositeOperation='lighter';
     g.beginPath(); const x=L.px-L.pw/2-d, y=L.py-L.ph/2-d, w=L.pw+2*d, h=L.ph+2*d, r=.3*L.em+d*.6; g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h); g.stroke(); g.restore(); continue; }
   if(tau>p.life) continue;
   if(p.ty==='spark'){ if(tau>p.life) continue; const ek=Math.exp(-p.k*tau), x=p.x0+p.vx*(1-ek)/p.k, y=p.y0+(p.vy-p.g/p.k)*(1-ek)/p.k+p.g/p.k*tau, vx=p.vx*ek, vy=(p.vy-p.g/p.k)*ek+p.g/p.k; const a=1-tau/p.life;
    g.globalCompositeOperation='lighter'; g.strokeStyle=p.col; g.globalAlpha=a; g.lineWidth=Math.max(1.2,.2*u); g.lineCap='round'; g.beginPath(); g.moveTo(x,y); g.lineTo(x-vx*p.len,y-vy*p.len); g.stroke(); g.globalCompositeOperation='source-over'; g.globalAlpha=1; continue; }
   const ek=Math.exp(-p.k*tau), X=p.x0+p.vx*(1-ek)/p.k, Y=p.y0+(p.vy-p.g/p.k)*(1-ek)/p.k+p.g/p.k*tau;
   if(Y>H+4*u||X<-6*u||X>W+6*u) { if(tau>.6) continue; }
   if(p.ty==='c'){ const fl=Math.cos(p.fp+tau*p.fo*(1-ek*.5)), rot=p.rot+p.om*tau*(.4+.6*(1-ek)), cs=Math.cos(rot), sn=Math.sin(rot), fx=X+Math.sin(p.fp*2+tau*p.fo*.6)*p.fa*(1-ek);
    const fadeOut=clamp((H+2*u-Y)/(6*u)); g.globalAlpha=(.5+.5*Math.abs(fl))*Math.min(1,fadeOut+.0)*(dark&&p.sq?.9:1);
    g.setTransform(dpr*cs,dpr*sn,-dpr*sn*fl,dpr*cs*fl,dpr*fx,dpr*Y); g.fillStyle=p.col; if(p.sq) g.fillRect(-p.w*.35,-p.w*.35,p.w*.7,p.w*.7); else g.fillRect(-p.w/2,-p.h/2,p.w,p.h); g.setTransform(dpr,0,0,dpr,0,0); g.globalAlpha=1; continue; }
   if(p.ty==='str'){ g.strokeStyle=p.col; g.lineWidth=p.w; g.lineCap='round'; g.lineJoin='round'; g.globalAlpha=.95; g.beginPath(); let started=false, ti=tau;   // лента фиксированной длины: шаги назад по времени обратно пропорциональны скорости
    for(let i=0;i<14&&ti>=0;i++){ const ei=Math.exp(-p.k*ti), xi=p.x0+p.vx*(1-ei)/p.k+Math.sin(p.ph+ti*p.fq)*p.amp*Math.min(1,i/3), yi=p.y0+(p.vy-p.g/p.k)*(1-ei)/p.k+p.g/p.k*ti;
     if(!started){ g.moveTo(xi,yi); started=true; } else g.lineTo(xi,yi);
     const sp=Math.hypot(p.vx*ei,(p.vy-p.g/p.k)*ei+p.g/p.k); ti-=clamp(1.15*u/(sp+1),.005,.07); }
    g.stroke(); g.globalAlpha=1; } }
  g.globalCompositeOperation='source-over'; }
 /* движение плашки: проявление, вспышка латуни на главах, дрожь, на финише — сияние */
 function motionA1(c){
  const st=c.st, t=c.t, ch=c.ch, sc=S.sc; let raw=1, fl=0, sx=0, fin=0, ps=1, py=0, sw=-1, swo=0, ls=0;
  if(!st){ raw=clamp((t-.12)/.07);
   const ui=t-.18; ps=ui<0?1.9:ui<.13?1+.9*Math.pow(1-ui/.13,2):1+osc(ui-.13,-.075,40,8.5);
   for(let k=1;k<=5;k++){ const u=c.u(k); if(u>=0){ fl+=Math.exp(-5*u)*(k===5?1.2:1); sx+=osc(u,.045+.008*k,38,7.5); ps+=osc(u,.055+.012*k,34,7); const sp=clamp(u/.5); if(sp<1){ sw=lerp(-.3,1.3,easeOut(sp)); swo=1-sp; } } }
   const uF=t-sc.tF; if(uF>=0){ ps+=osc(uF,.07,25,5.2); py=osc(uF,.05,25,5.2); fl+=Math.exp(-4*uF)*.9; sx+=osc(uF,.03,30,6); const sp=clamp(uF/.6); if(sp<1){ sw=lerp(-.3,1.3,easeOut(sp)); swo=1-sp; } ls=sm(uF/.6); fin=sm((uF-.15)/.6); }
   const u5=c.u(5); if(u5>=0){ fin=Math.max(fin,sm((u5-.7)/.8)); sx+=osc(u5-.7,.05,30,6); }
   fl=Math.min(1.25,fl);
   const spd=c.spd||0, rum=sc.tF>t?clamp(spd/1500):0; sx+=rum*.012*Math.sin(t*93); py+=rum*.006*Math.sin(t*71+1); }
  OV('--pa',sm(raw).toFixed(3)); OV('--fl',fl.toFixed(3)); OV('--sx',sx.toFixed(3)); OV('--fin',fin.toFixed(3)); OV('--ps',ps.toFixed(4)); OV('--py',py.toFixed(4)); OV('--ls',ls.toFixed(3));
  if(SWEEP){ SWEEP.style.setProperty('--sw',sw.toFixed(3)); SWEEP.style.setProperty('--swo',swo.toFixed(3)); }
  return {fin,fl}; }
function sumState(on){   // шоу доиграно (или перемотано назад): подсказка-кнопка итога бонуса; надпись плашки («… COMPLETE») ставит plqUpdate
  HINT.classList.toggle('btn',on); if(on){ HINT.setAttribute('role','button'); HINT.setAttribute('aria-label',SUM.btn||'CONTINUE'); HINT.tabIndex=0; try{ HINT.focus({preventScroll:true}); }catch(e){} SR.textContent=SUM.title+' '+fmt(finalC); root.setAttribute('aria-label',SUM.title+' '+fmt(finalC)); }
  else{ HINT.removeAttribute('role'); HINT.removeAttribute('aria-label'); HINT.removeAttribute('tabindex'); SR.textContent=S.ch>0?CHAP[S.ch].name:''; root.setAttribute('aria-label',(isMax?'Max win ':'Big win ')+fmt(finalC)); } }
 function plqUpdate(t,ch,st,fn){   // табло: барабаны суммы, строка главы, лампы глав, колокольчик, надпись плашки
  const sc=S.sc, T=sc.T;
  plqState(t,st); plqWin(); plqTitle(t,T);
  LPS.forEach((l,i)=>{ const u=t-T[i+1]; sv(l,'--on',(u<0?0:sm(u/.1)*(1+(st?0:1.1)*Math.exp(-u*7))).toFixed(3));
   if(CL){ const sag=st?1:1-(i===1?.5:.3)*sagAt(t,i===1?4.7:6.3,i*1.9); sv(l,'--fk',(sag*(i===0?.84:1)).toFixed(2)); } });   // лампочки порогов: самая старая чуть тусклее, у двух слабое «проседание» накала раз в 5–6 с (не мерцание: короткое, плавное, реже трёх в секунду)
  if(CL){ const evs=[...T.slice(1).filter(x=>isFinite(x)),sc.tF]; RAIL.forEach((b,i)=>{ const base=RAIL_BASE[i%RAIL_BASE.length]; let on=base*sm((t-.25-i*.045)/.14);
    if(!st&&base>0) for(const e of evs){ const u=t-e-i*.04; if(u>=0) on+=1.1*Math.exp(-u*7.5); }   // на пороге по ряду ламп бежит вспышка
    sv(b,'--on',on.toFixed(2)); if(i===RAIL_TIRED) sv(b,'--rf',(st?1:1-.7*sagAt(t,3.9,.6)).toFixed(2)); }); }
  let bell=0; if(!st){ const ev=[...new Set([...T.slice(1).filter(x=>isFinite(x)),sc.tF])]; ev.forEach(e=>{ if(t>=e) bell+=osc(t-e-.02,26,34,5.2); }); } if(BELL) sv(BELL,'--bl',bell.toFixed(2));
  const mxu=T[5]===Infinity?-1:t-T[5], on=mxu>=(st?0:.2)?1:0;   // MAX WIN: плашка «BIG WIN» перекрашивается и меняет надпись (один раз, за 0,4 с)
  sv(BW3,'--mxm',(mxu<0?0:st?1:sm(mxu/.4)).toFixed(3)); if(PQ.mx!==on){ PQ.mx=on; BW3.dataset.mx=on; }
  setKick(SUM&&fn?SUM.title:on?'MAX WIN':'BIG WIN'); }
  function render(t){
  const sc=S.sc, T=sc.T, st=S.static||isRM();   /* st — статичный режим: никакого мерцания, качания и мигания */
  const fin=t>=sc.tF-1e-6, vf=fin?sc.final:Math.min(sc.final,sc.f(t)*betC), vp=t>=sc.tF+.03?sc.final:Math.min(sc.final,sc.f(Math.max(0,t-.03))*betC), spd=Math.max(0,(vf-vp)/.03);
  let ch=0; for(let k=1;k<=5;k++) if(t>=T[k]) ch=k;
  const atEnd=t>=sc.tEnd-1e-6;
  if(!st&&!fin&&t-(S.tkT==null?-1:S.tkT)>.09){ S.tkT=t; window.bpAudio&&bpAudio.play('bigwin.drum_tick'); } // барабаны суммы крутятся: тик (audio.js)
  const tc=ch?t-T[ch]:t, I=k=>T[k]===Infinity?0:sm((t-T[k])/(k===5?.25:.6)), i0=sm(t/.5), dev=S.dev, u5=T[5]===Infinity?-1:t-T[5];
  if(ch!==S.ch){ S.ch=ch; SR.textContent=ch?CHAP[ch].name:''; if(ch>(S.sch||0)){ S.sch=ch; window.bpAudio&&(ch>=5?bpAudio.play('maxwin.hit'):(bpAudio.play('bigwin.tier_up'),bpAudio.play('bigwin.lamp.'+ch,{delay:90}))); } } // звук главы: один раз на каждую

  const pulse=st?0:(()=>{ const p=(t*1.15)%1; return Math.max(Math.exp(-Math.pow((p-.08)/.05,2)),.7*Math.exp(-Math.pow((p-.3)/.06,2))); })();
  /* свет: лампа над столом */
  let ropv=1, lamp=.6*sm(t/.3), bgb=.14+.3*lamp, rb=.42+.2*i0, jx=0, blk=0, drop=0, cur=0, rrot=0, vs=60;
  const slot=Math.floor(t*12), spike=st?0:Math.exp(-(t-.17)*16)*(t>=.17?1:0);   // вспышка света при ударе плашки: короткий скачок экспозиции фона
  if(!st&&t<.17){ lamp=.1; }   // до удара плашки свет «выбит»: одна тёмная пауза и один щелчок (раньше строб 40 Гц)
  if(ch===1){ lamp=tc<.14&&!st?.1:.6+.35*sm(tc/.5); bgb=.16+.34*lamp; rb=.5+.3*lamp; vs=58; }
  else if(ch===2){ const dipW=[[.06,.16],[.64,.74],[1.25,1.33],[1.9,1.98]].some(w=>tc>=w[0]&&tc<w[1]); lamp=st?.95:(dipW?.2:.95);  /* четыре провала света за первые 2 с главы, не чаще двух в любую секунду (раньше — случайные, до 12 раз в секунду) */ bgb=.12+.4*lamp; rb=.28+.62*lamp; jx=(!st&&lamp<.5)?(hash(slot*5)-.5)*.5:0; vs=54; }
  else if(ch===3){ lamp=.34+.1*pulse; bgb=.2+.08*pulse; rb=.62+.08*pulse; vs=46-6*pulse; }
  else if(ch===4){ lamp=.46; bgb=.25; rb=.78; vs=40; const sl=Math.floor((tc-.9)*2), ph2=(tc-.9)*2-sl, hv=sl>=0&&!st&&!atEnd?hash(sl*13+1):1, g=hv<.3&&ph2<.14, dr=!st&&!atEnd&&(tc<.12||(hv>=.3&&hv<.42&&ph2>=.2&&ph2<.3)); jx=g?(hash(slot*5)-.5)*1.4:0; drop=dr?1:0; lamp=g?.2:.46; }   // помехи редкие и по расписанию: после первой секунды главы — одна ячейка в полсекунды, и в ней либо сбой света, либо кадр «сигнал пропал» (не чаще двух вспышек в секунду)   // atEnd: последний кадр шоу стоит на экране (итог бонуса) — не должен застыть на кадре «сигнал пропал»
  else if(ch===5){ vs=34; const u=t-T[5]; lamp=sm((u-.7)/.5)*.95; bgb=u<.55?0:.05+.05*sm((u-.7)/1.5); rb=.85; blk=u<.05?sm(u/.05):u<.55?1:.7+.3*(1-sm((u-.55)/1.2)); cur=sm((u-2.1)/1.4);
   const b=sm((u-1.3)/.7)*(1-sm((u-2.3)/.8)); rrot=-5*b; ropv=u<.05?1-sm(u/.05):u<.62?0:sm((u-.62)/.35); }
  if(st&&ch===5){ blk=.7; lamp=.95; bgb=.08; cur=1; ropv=1; }
  bgb+=spike*.75; if(t<.17&&!st){ bgb=.05+.25*lamp; rb=.2; }
  for(const k of [1,2,3,4]){ const u=t-T[k]; if(!st&&u>=0&&u<.2){ bgb+=.38*Math.exp(-u*14); } }
  V('--i0',i0.toFixed(3)); for(let k=1;k<=5;k++) V('--i'+k,I(k).toFixed(3)); V('--i3',(I(3)*(1-.85*I(4))).toFixed(3)); V('--i4',(I(4)*(1-I(5))).toFixed(3));
  V('--lamp',lamp.toFixed(3)); V('--dim',(1-clamp(bgb)).toFixed(3)); V('--rb',rb.toFixed(3)); if(ch>=3) V('--pulse',pulse.toFixed(3));   /* сирена видна с главы 3: до неё переменная не меняется, и сирена (прозрачная) не перерисовывается каждый кадр */ V('--vs',vs+'%');
  V('--blk',blk.toFixed(3)); V('--drop',drop); V('--cur',cur.toFixed(3)); V('--jx',U(jx));

  /* дрожь всей сцены от ударов */
  let shx=0, shy=0, shr=0;
  if(!st) for(const im of IMP){ const u=t-im.t; if(u<0||u>1.3) continue; const e=im.A*Math.exp(-6.2*u); shx+=e*(Math.sin(u*83)+.5*Math.sin(u*131+1.3)); shy+=e*(.8*Math.sin(u*97+.7)+.4*Math.sin(u*149)); shr+=e*.1*Math.sin(u*71); }
  V('--shx',U(shx*.5)); V('--shy',U(shy*.5)); V('--shr',(shr*.5).toFixed(3)+'deg');


  const gc=I(3); V('--rx',U(dev==='phone'?-1.5*gc:-3*gc)); V('--rsc',(1+(dev==='phone'?.05:.08)*gc+.03*I(4)).toFixed(3)); V('--rrot',rrot.toFixed(2)+'deg');
  V('--rop',ropv.toFixed(3));
  if(ch>=4){ /* камеры наблюдения видны только с главы 4: раньше эти переменные менялись каждый кадр на всех главах и перерисовывали невидимый слой 1728×1080 */ V('--roll',((t*38)%150-20).toFixed(1)); V('--nx',(hash(slot*3)*220).toFixed(0)+'px'); V('--ny',(hash(slot*5)*220).toFixed(0)+'px'); const tg=!st&&!atEnd&&ch===4&&hash(Math.floor(t*9)*7+1)<.35; V('--tg',tg?1:0); V('--ty1',(hash(slot*11)*80+5).toFixed(1)+'%'); V('--ty2',(hash(slot*13)*80+8).toFixed(1)+'%'); V('--blink',(Math.floor(t*1.6)%2?.15:1)); }
  { const tcs='02:14:'+String(7+Math.floor(t)%50).padStart(2,'0'); if(tcs!==S.tcs){ S.tcs=tcs; TC.textContent=tcs; } }   // текст меняем раз в секунду: наблюдатель соцрежима (ui.js) просматривает всю страницу при каждой правке текста

  /* Рокко */
  const dip=(ch===2||ch===4)&&lamp<.5?1:0;
  if(RMODE==='body'){ if(ROC) ROC.draw(t,{live:S.running&&!S.warp,warp:!!S.warp,st,tC:ROCCO_T0,tF:sc.tF,tM:T[5]<Infinity?T[5]:Infinity,vis:ropv,lamp}); }   // vis — свет пропал на MAX (ropv) → ролик меняется в темноте else if(RMODE==='eyes') eyesUpdate(t,ch,st,dip,blk);
  else if(RMODE==='monitor') monUpdate(t,ch,st,dip,blk);
  /* картинки на канвасах */

  let fan=0; if(!st){ for(const k of [1,2,3,4,5]){ const u=t-T[k]; if(u>=0) fan=Math.max(fan,Math.exp(-3.2*u)); } const uF=t-sc.tF; if(uF>=0) fan=Math.max(fan,.8*Math.exp(-1.3*uF)); }

  const lq=S.lowq&&S.running; S.fc=(S.fc||0)+1;
  if(!lq||S.fc%3===0) drawBack(t,st,{ch,lamp,pulse,u5,i3:I(3)*(1-.85*I(4)),fan,lq});

  drawFront(t,st,{ch,lq,lamp});

  /* плашка */
  const lampN=clamp(lamp/.95); OV('--ob',(.5+.5*lampN).toFixed(3));
  motionA1({t,ch,st,spd,u:k=>T[k]===Infinity?-1:t-T[k]});
  /* подсказка и надпись плашки */
  const fn=t>=sc.tEnd-1e-6; if(fn!==S.finished){ S.finished=fn; if(SUM) sumState(fn); if(fn&&!S.sfin){ S.sfin=1; window.bpAudio&&bpAudio.play('bigwin.end'); } }
  plqUpdate(t,ch,st,fn);
  const ht=hintText(); if(HT.textContent!==ht) HT.textContent=ht; HINT.classList.toggle('ready',fn);
 }
 function frame(now){
  if(!S.running||closed) return;
  const raw=Math.max(0,(now-S.last)/1000), slow=Math.max(1,window.__slow||1), dt=Math.min(.25,raw/slow); S.last=now; let t;   // slow — window.__slow, только для съёмки в замедлении (как в ui.js)
  S.frames=(S.frames||0)+1; S.dtAvg=S.frames<3?.016:S.dtAvg*.92+Math.min(.2,raw)*.08; if(S.frames>45&&S.dtAvg>.045&&slow<=1) S.lowq=true;   // слабое устройство: меньше конфетти, лучи реже, без пыли и веера
  if(S.warp){ const u=Math.min(1,(now-S.warp.at)/S.warp.ms); t=S.warp.from+(S.sc.tEnd-S.warp.from)*(1-Math.pow(1-u,2.2)); }
  else t=S.t+dt*(isTurbo()?2.4:1);
  if(t>=S.sc.tEnd){ t=S.sc.tEnd; S.running=false; S.warp=null; S.finAt=performance.now(); }
  S.t=t; render(t); if(S.running) S.raf=requestAnimationFrame(frame); else armAuto();
 }
 /* тап: идёт шоу → доматываем (счётчик до итога, главы пролетают за 0,5 с); второй тап (или тап по доигранному) закрывает */
 /* Автозакрытие (владелец 2026-10-12: «можно чтоб он сам убирался»): после того как счёт встал и главы доиграли, плашка держится ещё немного и уходит сама — ≈2–2,5 с от конца счёта, дольше на крупных главах;
    в Turbo и Autoplay короче. Итог бонуса (SUM) сам не закрывается: там кнопка CONTINUE. Тап в ЛЮБОМ месте экрана (или пробел / Enter): идёт счёт — доматывает до итога; итог на экране — закрывает. */
 const armAuto=()=>{ if(SUM||closed||S.autoT||window.__sim||!S.sc) return; const sc=S.sc, k=sc.x>=100?3:sc.x>=50?2:sc.x>=25?1:0, turbo=isTurbo(), g=gameTime(), auto=!!(g&&g.GS&&g.GS.auto>0);
  let hold=isMax?2.4:[2,2.15,2.3,2.5][k]; if(turbo) hold*=.6; if(auto) hold*=.85;
  const done=isMax?0:Math.min(hold-.5,(sc.tEnd-sc.tF)/(turbo?2.4:1));   // сколько из «удержания» уже прошло: после конца счёта идёт заключительная часть шоу
  const ms=isRM()?(hold+1)*1000:S.skipped?Math.max(1200,hold*600):Math.max(600,(hold-done)*1000);
  S.autoT=setTimeout(()=>{ S.autoT=0; if(!closed) close(); },ms); };
 const GATE_LOCK=600;   // первые 600 мс после открытия шоу ввод игнорируется: один двойной тап не может и домотать счёт, и закрыть шоу
 root.next=()=>{
  if(closed) return; const now=performance.now();
  if(!S.openAt||now-S.openAt<GATE_LOCK) return;
  if(S.running&&!S.warp){ S.warp={from:S.t,at:now,ms:520}; S.skipped=1; S.tapT=now; return; }
  if(S.running&&S.warp){ S.t=S.sc.tEnd; S.running=false; S.warp=null; S.finAt=now; render(S.t); armAuto(); return; }   // тап во время счёта — только к итогу; закрывает отдельный тап после конца
  if(!S.sc) return;
  if(now-(S.finAt||0)<350) return;   // тап ровно в момент остановки счёта не закрывает шоу, пока итог не показан хотя бы треть секунды (и для итога бонуса тоже)
  close();
 };
 root.info=()=>({T:S.sc.T.slice(),tF:S.sc.tF,tEnd:S.sc.tEnd,dev:S.dev});   // для проверок
 root.seek=t=>{ S.running=false; S.warp=null; cancelAnimationFrame(S.raf); S.t=t; render(t); };   // для раскадровок и проверок
 root.addEventListener('click',()=>root.next());
 onKey=e=>{ if(e.key!=='Enter'||e.repeat||closed) return; const t=e.target; if(t&&t.closest&&t!==document.body&&!t.closest('#bp-big')&&t.closest('#bp-test,input,textarea,select,button,a,[role=button]')) return; e.preventDefault(); root.next(); };   // Enter — как тап; пробел ловит ui.js
 addEventListener('keydown',onKey);
 HINT.addEventListener('keydown',e=>{ if(SUM&&S.finished&&e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); root.next(); } });   // Space ловит игра (ui.js) для всех оверлеев; Enter — на кнопке CONTINUE
 onResize=()=>{ const d=innerWidth<innerHeight?'phone':'desk'; if(closed||!S.sc) return; if(d!==S.dev){ S.dev=d; root.dataset.dev=d; setBg(); S.ch=-1; } fit(); render(S.t); };
 addEventListener('resize',onResize);

 /* старт: ждём шрифты (макет цифр меряется по Black Ops One), сцена показывается сразу */
 const fontsReady=()=>{ try{ return Promise.race([Promise.all([document.fonts.load('400 40px "Black Ops One"'),document.fonts.load('600 20px "Barlow SC"')]),new Promise(r=>setTimeout(r,1500))]); }catch(e){ return Promise.resolve(); } };
 S.sc=buildSc(finalC,betC,isMax); HT.textContent=hintText();
 IMP=[{t:.18,A:1.15},{t:.4,A:.8}]; for(let k=1;k<=5;k++) if(S.sc.T[k]<Infinity) IMP.push({t:S.sc.T[k],A:[0,.9,1.1,1.4,1.7,2.3][k]}); IMP.push({t:S.sc.tF,A:1.1}); IMP.sort((p,q)=>p.t-q.t);
 const rockoReady=()=>ROC?Promise.race([ROC.ready,new Promise(r=>setTimeout(r,500))]):Promise.resolve();   // Рокко должен стоять на месте с первого кадра шоу (а не «выскакивать»), но дольше полсекунды его не ждём
 Promise.all([fontsReady(),rockoReady()]).then(()=>{
  if(closed) return; S.openAt=performance.now(); fit(); window.bpAudio&&(bpAudio.bigwin(isMax),bpAudio.play('bigwin.land')); // музыка сцены тише, стинг, звук открытия (audio.js)
  if(isRM()){ S.static=true; S.running=false; S.t=S.sc.tEnd; S.finAt=performance.now(); render(S.t); armAuto(); return; }
  S.running=true; S.last=performance.now(); S.t=0; render(0); S.raf=requestAnimationFrame(frame);
 });
 return promise;
}
window.BigWinShow={play,warm,MAXX,plates:{list:PLATES,def:PLATE_DEF,opt:plateOpt}};
// fb/perf 2026-10-12: прогрев шоу (CSS, текстуры, спрайты лучей, 3 ролика Рокко ≈3 МБ) — после роликов и звуков первого спина (loadgate.js), а не на старте: раньше он делил канал с глотанием/броском и давал длинные задачи (≈0,4 с при 4× замедлении процессора)
const warmLater=()=>{ const go=()=>(window.requestIdleCallback||setTimeout)(warm); if(window.BPLoad) BPLoad.whenOpen('audio',go,1500); else go(); };
if(document.readyState==='complete') warmLater(); else addEventListener('load',warmLater);
})();
