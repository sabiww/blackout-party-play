// Blackout Party — окно Buy bonus «Афиши на доске» (владелец 2026-10-12, вариант 1 из feature-cards.html: «мне нравится, но доработай картинки и плашку»).
// Разметка окна одним местом: её зовут и игра (index.html?bpv=6c80e99c: fmenuHTML, ui.js: fpick — второй шаг покупки), и эскиз feature-cards.html. Стили — buy-board.css (префикс bb-/po-).
// Окно — доска объявлений в пиццерии из потёртой красной стали (рама как у поля слота; раньше орех и пробка), планка-шапка (название, баланс, ставка, крестовой винт закрытия),
// афиши на магнитах-«булавках» (режимы: ряд ламп накаливания, штамп NOW PLAYING) и на скотче (покупки: «Камеры» — SUPER SHOW, двойная рамка и красный «+»).
// Логика не здесь: BuyBoard.window(o) / BuyBoard.confirm(o,m) только возвращают HTML.
// o: { modes:[{k,nm,img,d,x,kind:'mode'|'buy',tier}], bet, bal, on (ключ включённого режима или null), money(v), A (папка assets, с «/» на конце), screw() — SVG винта, inline:{pick,bet,close} — готовые строки onclick (в эскизе не нужны), mini — картинка чипа «KITCHEN +» }
(()=>{
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const GROUPS={m:['SPIN MODES','Stay on until turned off'],b:['BONUS BUYS','One purchase · starts at once']};
 // лампа накаливания: латунный цоколь с резьбой, стеклянная колба, вольфрамовая нить на двух стойках (SVG 16×28; градиент bb-gl лежит в defs окна)
 const bulb=`<span class="bb-bulb" aria-hidden="true"><svg viewBox="0 0 16 28" focusable="false"><rect x="5" y="0" width="6" height="7.4" rx="1" class="cap"/><path d="M5 2.4h6M5 4h6M5 5.6h6" class="thr"/>
  <path d="M5.3 7.2C5.3 9.4 1.4 11 1.4 16.4c0 5 3.1 8.8 6.6 8.8s6.6-3.8 6.6-8.8c0-5.4-3.9-7-3.9-9.2z" class="gl"/>
  <path d="M6.6 7.6l-.3 5.6M9.4 7.6l.3 5.6" class="pst"/><path d="M6.3 13.2l.9-1.5.9 2.6.9-2.6.9 2.6.8-1.1" class="fil"/><path d="M3.6 13.4c.1-1.8 1-3 2.1-3.7" class="hi"/></svg></span>`;
 const pin=`<i class="po-pin" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><ellipse cx="14" cy="16" rx="8" ry="4.6" fill="#000" opacity=".42"/><circle cx="11" cy="11.4" r="8" fill="#2a0a06"/><circle cx="11" cy="10.4" r="6.8" fill="#8a2a1e"/><circle cx="11" cy="10.4" r="3.6" fill="#6c1f16"/></svg></i>`;
 const defs=`<svg class="bb-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
  <radialGradient id="bb-gl" cx="46%" cy="42%" r="62%"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffd985"/><stop offset="1" stop-color="#e8962a"/></radialGradient>
  <filter id="bb-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4 3.35" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs></svg>`;

 function poster(o,m,conf){
  const mode=m.kind==='mode', t2=m.tier===2, on=o.on===m.k, pr=o.bet*m.x, off=!on&&o.bal<pr, mn=o.money;
  const nd=String(mn(pr)).replace(/\s+[A-Z]{2,4}$/,'').length; // число знаков суммы без кода валюты — подгонка размера цены под ширину афиши (CSS, --n)
  const need=Math.max(0,pr-o.bal), I=o.inline;
  const kick=mode?'EVERY SPIN':(t2?'SUPER SHOW':'THE SHOW');
  const pips=mode?'':`<span class="po-pips" aria-hidden="true"><i class="on"></i><i${t2?' class="on"':''}></i></span><span class="po-sr">Tier ${m.tier} of 2</span>`;
  const deco=mode?`<div class="po-bar" aria-hidden="true"><i class="po-sc l"></i>${bulb.repeat(4)}<i class="po-sc r"></i></div>${pin}`:`<i class="po-tape l" aria-hidden="true"></i><i class="po-tape r" aria-hidden="true"></i>`;
  const stamp=on?`<span class="po-stamp"><span>NOW PLAYING</span></span>`:'';
  const slip=off?`<span class="po-stamp po-need" id="need-${m.k}"><span>NEED ${mn(need)} MORE</span></span>`:'';
  const mini=t2&&o.mini?`<span class="po-mini"><img src="${o.A}${o.mini}" alt="">KITCHEN +</span>`:'';
  const plus=t2?`<i class="po-plus" aria-hidden="true">+</i>`:'';
  const lab=mode?(on?'TURN OFF':'TURN ON'):(conf?'BUY':'BUY BONUS');
  const sw=mode?`<i class="tg" aria-hidden="true"></i>`:'';
  const idg=conf?'bp-buy':'bu-go-'+m.k;
  const click=conf?'':(I?` onclick="${I.pick(m.k)}"`:'');
  const dis=off?` aria-disabled="true" aria-describedby="need-${m.k}"`:'';
  return `<article class="po ${mode?'po-m':'po-b'}${t2?' t2':''}${on?' on':''}${off?' off':''}">${plus}${deco}<div class="po-p">
   <div class="po-k">${pips}<span>${kick}</span></div>
   <div class="po-il"><img src="${o.A}${m.img}" alt="">${mini}${stamp}${slip}</div>
   <h3 class="po-nm" id="nm-${m.k}">${esc(m.nm)}</h3><p class="po-d">${esc(m.d)}</p>
   <div class="po-st"><div class="po-pr" style="--n:${nd}"><b>${mn(pr)}</b><small class="po-cap">${mode?'per spin':m.x+'× bet'}</small>${off?`<small class="po-nt" aria-hidden="true">NEED ${mn(need)} MORE</small>`:''}</div>
   <button class="act po-go" id="${idg}" data-k="${m.k}" aria-labelledby="${idg} nm-${m.k}"${dis}${click}>${sw}<span>${lab}</span></button></div></div></article>`; }

 function rail(o,title,withBet){
  const I=o.inline||{}, mn=o.money;
  const bet=withBet?`<div class="bb-bet"><button class="bb-key" aria-label="Bet down" data-bd${I.bet?` onclick="${I.bet(-1)}"`:''}><span aria-hidden="true">−</span></button><div class="bb-ro bb-rbet"><small>BET</small><b>${mn(o.bet)}</b></div><button class="bb-key" aria-label="Bet up" data-bu${I.bet?` onclick="${I.bet(1)}"`:''}><span aria-hidden="true">+</span></button></div>`:'<span></span>';
  return `<header class="bb-top"><div class="bb-ro bb-bal"><small>BALANCE</small><b style="--n:${String(mn(o.bal)).length}">${mn(o.bal)}</b></div><div class="bb-h" role="heading" aria-level="2">${esc(title)}</div>${bet}
   <button class="bu-x bb-x" aria-label="Close"${I.close?` onclick="${I.close}"`:''}>${o.screw()}</button></header>`; }

 function group(o,g,list){ const [t,sub]=GROUPS[g]; const id='gh-'+g;
  return `<section class="bb-g bb-g${g}" aria-labelledby="${id}"><div class="bb-gh"><h3 class="bb-lab" id="${id}">${t}</h3><p class="bb-sub">${sub}</p></div><div class="bb-row">${list.map(m=>poster(o,m)).join('')}</div></section>`; }

 window.BuyBoard={
  // всё окно (список режимов и покупок)
  window(o){ const M=o.modes.filter(m=>m.kind==='mode'), B=o.modes.filter(m=>m.kind==='buy');
   return `<div class="bb bu-buy" role="dialog" aria-modal="true" aria-label="Buy bonus">${defs}<div class="bb-in">${rail(o,'BUY BONUS',true)}
    <div class="bb-body">${group(o,'m',M)}<i class="bb-div" aria-hidden="true"></i>${group(o,'b',B)}</div></div></div>`; },
  // второй шаг покупки: одна афиша, кнопка BUY и тихая «Back»; внутренность окна (корень .bb.bb-sm создаёт ui.js)
  confirm(o,m){ const c={...o,on:null};
   return `${defs}<div class="bb-in">${rail(c,m.nm,false)}<div class="bb-body bb-conf">${poster(c,m,true)}<button class="bb-back" id="bp-back">Back</button></div></div>`; },
  defs
 };
})();
