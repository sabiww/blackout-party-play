// Blackout Party — окна бонусов «Красная сталь» (bonus-ui.css): клавиатура и фокус. Подключается после ui.js.
// Окна: Buy bonus (#fmenu), вход в бонус (#ovl .bu-gate), итог бонуса (.bp-wrap .bu-end). Они сами стоят в разметке index.html и ui.js; здесь только доступность:
//  — Tab ходит по кругу внутри верхнего открытого окна и не уходит в игру за ним;
//  — вход в бонус: фокус сразу на CONTINUE, Esc = CONTINUE (ворота — не «закрыть», а «продолжить»);
//  — Esc в Buy bonus закрывает index.html (closeFeatures), в итоге — ui.js (w.close()); тут их не дублируем.
(()=>{
 const OPEN='#fmenu .bb,#fmenu .bu-panel,.bp-wrap .bu-panel,#ovl .bu-panel';
 const topPanel=()=>{ const a=document.querySelectorAll(OPEN); return a.length?a[a.length-1]:null; };
 const ring=p=>[...p.querySelectorAll('button,[href],input,select,textarea,[tabindex]')].filter(e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length);
 addEventListener('keydown',e=>{
  const p=topPanel(); if(!p) return;
  if(e.key==='Tab'){
   const f=ring(p); if(!f.length) return; const i=f.indexOf(document.activeElement);
   if(i<0||(e.shiftKey&&i===0)||(!e.shiftKey&&i===f.length-1)){ e.preventDefault(); f[e.shiftKey?f.length-1:0].focus(); }
  } else if(e.key==='Escape'&&p.classList.contains('bu-gate')){ e.preventDefault(); p.querySelector('.bu-lens')?.click(); }
 },true);
 const focusGate=()=>{ const b=document.querySelector('#ovl .bu-gate .bu-lens'); if(b&&!b.dataset.f){ b.dataset.f='1'; b.focus({preventScroll:true}); } };
 const app=document.getElementById('app'); if(app) new MutationObserver(focusGate).observe(app,{childList:true}); // ворота кладутся в #app при каждой перерисовке
 focusGate();
})();
