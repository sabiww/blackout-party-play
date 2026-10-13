// Blackout Party — окно Buy bonus в чистом виде, как в эталоне berserk-mode (2026-10-13): без доски, рамы и афиш — содержимое стоит прямо на затемнённой игре.
// Разметка окна одним местом: её зовут игра (index.html?bpv=52316320: fmenuHTML, ui.js: fpick — второй шаг покупки) и эскиз feature-cards.html. Стили — buy-board.css (префикс bb-).
// Сверху название и ставка ‹ ›, крестовой винт закрытия в углу; раздел SPIN MODE — по строке на режим; раздел BUY BONUS — карточки в ряд; внизу RTP и максимальный выигрыш.
// Всё строится из данных (MODES в index.html, цена = ставка × m.x): цены и тексты здесь не записаны.
// Логика не здесь: BuyBoard.window(o) / BuyBoard.confirm(o,m) только возвращают HTML.
// o: { modes:[{k,nm,img,d,x,kind:'mode'|'buy',tier}], bet, bal, on (ключ включённого режима или null), money(v), A (папка assets, с «/» на конце), screw() — SVG винта,
//      inline:{pick,bet,close} — готовые строки onclick (в эскизе не нужны), rtp (строка, '96.00%'), prov (true — значения черновые), maxx (максимальный выигрыш, × ставки) }
(()=>{
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;
 // описание «10 free spins · counter grows…»: до точки — подзаголовок на плашке названия, после — строка под картинкой
 const split=d=>{ const p=String(d||'').split(' · '); return p.length>1?{sub:p[0],line:cap(p.slice(1).join(' · '))}:{sub:'',line:cap(p[0])}; };
 const chev=d=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d<0?'M15 5l-7 7 7 7':'M9 5l7 7-7 7'}"/></svg>`;
 const xstr=o=>Number(o.maxx||0).toLocaleString('en-US');

 function close(o){ const I=o.inline||{}; return `<button class="bu-x bb-x" aria-label="Close"${I.close?` onclick="${I.close}"`:''}>${o.screw()}</button>`; }

 function top(o,title,withBet){
  const I=o.inline||{}, mn=o.money;
  const bet=withBet?`<div class="bb-bet"><button class="bb-key" aria-label="Bet down" data-bd${I.bet?` onclick="${I.bet(-1)}"`:''}>${chev(-1)}</button>
   <div class="bb-bv"><small>BET</small><b aria-live="polite">${mn(o.bet)}</b></div><button class="bb-key" aria-label="Bet up" data-bu${I.bet?` onclick="${I.bet(1)}"`:''}>${chev(1)}</button></div>`:'';
  return `<header class="bb-top"><h2 class="bb-h" id="bb-t">${esc(title)}</h2>${bet}</header>`; }

 // режим: строка — значок, название и строка, цена за спин, кнопка
 function modeRow(o,m){
  const on=o.on===m.k, pr=o.bet*m.x, off=!on&&o.bal<pr, mn=o.money, I=o.inline, t=split(m.d), id='bu-go-'+m.k;
  const need=off?`<small class="bb-need" id="need-${m.k}">NEED ${mn(pr-o.bal)} MORE</small>`:'';
  return `<article class="bb-mode${on?' on':''}${off?' off':''}">
   <img class="bb-ic" src="${o.A}${m.img}" alt="">
   <div class="bb-mt"><h4 class="bb-mn" id="nm-${m.k}">${esc(m.nm)}${on?'<span class="bb-chip">ACTIVE</span>':''}</h4><p class="bb-ml">${esc(t.line)}</p></div>
   <div class="bb-mp"><b>${mn(pr)}</b><small>PER SPIN</small>${need}</div>
   <button class="act bb-go bb-tg" id="${id}" data-k="${m.k}" aria-pressed="${on}" aria-labelledby="${id} nm-${m.k}"${off?` aria-disabled="true" aria-describedby="need-${m.k}"`:''}${I?` onclick="${I.pick(m.k)}"`:''}><span>${on?'TURN OFF':'ACTIVATE'}</span></button></article>`; }

 // покупка: плашка названия, картинка, строка, цена в ставках, красная кнопка с суммой; conf — второй шаг (одна большая карточка, кнопка без суммы)
 function card(o,m,conf){
  const pr=o.bet*m.x, off=o.bal<pr, mn=o.money, I=o.inline, t=split(m.d), id=conf?'bp-buy':'bu-go-'+m.k;
  const need=off?`<small class="bb-need" id="need-${m.k}">NEED ${mn(pr-o.bal)} MORE</small>`:'';
  const price=conf?`<p class="bb-tag"><span>${m.x}× BET</span><i aria-hidden="true">·</i><b>${mn(pr)}</b></p>`:`<p class="bb-cost">${m.x}× BET</p>`;
  return `<article class="bb-card${m.tier===2?' t2':''}${off?' off':''}${conf?' big':''}">
   <div class="bb-pl"><h4 class="bb-cn" id="nm-${m.k}">${esc(m.nm)}</h4>${t.sub?`<span class="bb-cs">${esc(t.sub)}</span>`:''}</div>
   <img class="bb-art" src="${o.A}${m.img}" alt="">
   <p class="bb-cl">${esc(t.line)}</p>${price}
   <button class="act bb-go bb-buy" id="${id}" data-k="${m.k}" aria-labelledby="${id} nm-${m.k}"${off?` aria-disabled="true" aria-describedby="need-${m.k}"`:''}${!conf&&I?` onclick="${I.pick(m.k)}"`:''}><span>${conf?'BUY':'BUY '+mn(pr)}</span></button>${need}</article>`; }

 const foot=o=>`<p class="bb-foot">RTP ${esc(o.rtp||'96.00%')}${o.prov===false?'':' (provisional)'}${o.maxx?` · MAX WIN ${xstr(o)}× THE BET`:''}</p>`;

 window.BuyBoard={
  // всё окно: режимы и покупки
  window(o){ const M=o.modes.filter(m=>m.kind==='mode'), B=o.modes.filter(m=>m.kind==='buy');
   const gm=M.length?`<section class="bb-g bb-gm" aria-labelledby="gh-m"><h3 class="bb-lab" id="gh-m"><span>SPIN MODE</span></h3>${M.map(m=>modeRow(o,m)).join('')}</section>`:'';
   const gb=B.length?`<section class="bb-g bb-gb" aria-labelledby="gh-b"><h3 class="bb-lab" id="gh-b"><span>BUY BONUS</span></h3><div class="bb-cards">${B.map(m=>card(o,m)).join('')}</div></section>`:'';
   return `<div class="bb" role="dialog" aria-modal="true" aria-labelledby="bb-t"><div class="bb-in"><div class="bb-col">${top(o,'FEATURES',true)}${gm}${gb}${foot(o)}</div></div>
    ${close(o)}<span class="bb-more" aria-hidden="true" hidden>MORE BONUSES <svg viewBox="0 0 24 24" focusable="false"><path d="M6 9l6 6 6-6"/></svg></span></div>`; },
  // второй шаг покупки: та же сцена, одна большая карточка, «200× BET · $200.00», BUY без суммы; стрелка назад слева сверху; ставка здесь не меняется. Внутренность окна (корень .bb.bb-sm создаёт ui.js)
  confirm(o,m){
   return `<div class="bb-in"><div class="bb-col">${top(o,m.nm,false)}<div class="bb-conf">${card(o,m,true)}</div></div></div>
    <button class="bb-back" id="bp-back" aria-label="Back to features">${chev(-1)}</button>${close(o)}`; }
 };
})();
