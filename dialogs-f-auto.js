// Blackout Party — окно «Autoplay» в стиле F (владелец 2026-10-11: «сделай нормальный дизайн для автоигры»).
// Подключается после dialogs-f.js и до ui.js. ui.js autoplay() зовёт DlgF.auto(ctx), если DlgF.on() (то есть без ?dlg=old); логика старта автоигры остаётся в ui.js (ctx.setAuto, ctx.spin).
// Оболочка (рама, лента, винт, плита, заголовок, разделители) — общая, из dialogs-f.css/js; с 2026-10-13 окно в чистом виде, как Buy bonus: раму, ленту и плиту снимает dialogs-f-auto.css, затемнение ставим здесь (фон хоста).
// Свои стили окна — dialogs-f-auto.css; их текст берём так же, как у общих:
// локально это <link id="bp-dlgauto" media="not all"> (читаем fetch-ем при загрузке страницы), в сборке артефакта — <style id="bp-dlgauto" media="not all">.
// Шрифты и разделители у этого окна зафиксированы по выбору владельца: набор 2 (Black Ops One мелко для подписей, кнопок, пунктов и чисел; Barlow — только длинная фраза) и разделитель 2 (латунная линейка с заклёпками).
(()=>{
'use strict';
const D=window.DlgF; if(!D) return;
const COUNTS=[10,25,50,100,500], DEF_N=25, WIN_X=100; // число спинов; порог «один выигрыш ×100 ставки и больше» — как в прежнем окне

// ---------- стили окна ----------
let CSS=null;
(()=>{ const l=document.getElementById('bp-dlgauto'); if(l&&l.tagName==='LINK'&&l.href) fetch(l.href).then(r=>r.ok?r.text():null).then(t=>{ if(t) CSS=t; }).catch(()=>{}); })();
function cssText(){
 if(CSS) return CSS;
 const l=document.getElementById('bp-dlgauto'); if(l&&l.tagName==='STYLE'&&l.textContent.trim()){ CSS=l.textContent; return CSS; }
 return '@import url("dialogs-f-auto.css");'; // успели открыть окно раньше, чем скачался файл: подключаем по ссылке
}

const IC={
 check:'<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4.5 10.5l3.8 3.8 7.2-8.4"/></svg>',
 play:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4.5v15l12.5-7.5z"/></svg>'};

function auto(C){
 const GS=C.GS; let n=DEF_N;
 const w=C.el('div','bp-wrap'); w.setAttribute('role','dialog'); w.setAttribute('aria-modal','true'); w.setAttribute('aria-label','Autoplay'); C.takeRet(w);
 Object.assign(w.style,{background:'radial-gradient(ellipse 72% 66% at 50% 46%,rgba(14,5,4,.8) 0%,rgba(9,3,3,.88) 58%,rgba(3,1,1,.95) 100%)',backdropFilter:'none',webkitBackdropFilter:'none'}); // затемнение как у Buy bonus (#fmenu): окно без панели, без размытия
 const {sh,stage,layer}=D.shell(w,false,cssText());
 stage.dataset.type='2'; stage.dataset.line='2'; // выбор владельца: набор шрифтов 2 и разделитель 2 (переключатели ?dlgtype / ?dlgline этого окна не меняют)
 const tiles=COUNTS.map(v=>`<button type="button" class="a-n" role="radio" aria-checked="${v===n}" aria-label="${v} spins" data-n="${v}" tabindex="${v===n?0:-1}">${v}</button>`).join('');
 const opt=(a,on,txt)=>`<button type="button" class="a-opt" role="checkbox" aria-checked="${on}" ${a}><i class="ck" aria-hidden="true">${IC.check}</i><span class="t">${txt}</span></button>`;
 const body=`<div class="a-body">
  <section class="a-sec a-sec-n"><h3 class="a-lab" id="a-ln">Number of spins</h3><div class="a-cnt" role="radiogroup" aria-labelledby="a-ln">${tiles}</div></section>
  <section class="a-sec a-sec-w"><h3 class="a-lab" id="a-lw">Stop when</h3><div class="a-stop" role="group" aria-labelledby="a-lw">
   ${opt('data-sb',true,'A bonus starts')}${opt('data-sw',false,`A single win is ${WIN_X}<span class="xs">×</span> or more`)}</div></section></div>`;
 const foot=`<div class="a-go"><button type="button" class="a-start" id="bp-astart">${IC.play}<span class="st">START ${n} SPINS</span></button>
  <p class="a-note">Each spin costs ${D.moneyH(C,C.spinCost())}. Press Play to stop at any time.</p></div>`;
 layer.innerHTML=D.frame('auto','Autoplay',body,foot);
 const dlg=layer.querySelector('.dlg'), startB=sh.querySelector('#bp-astart'), startT=startB.querySelector('.st');
 const sb=sh.querySelector('[data-sb]'), sw=sh.querySelector('[data-sw]'), cnt=sh.querySelector('.a-cnt');
 const close=e=>{ if(w.dataset.out) return; C.winOut(w); C.syncHUD(); if(e&&e.detail===0) C.giveBack(w); }; w.close=close; // Esc и клик мимо окна закрывают через w.close (ui.js)
 const pick=(v,focus)=>{ n=v; cnt.querySelectorAll('[data-n]').forEach(b=>{ const on=+b.dataset.n===n; b.setAttribute('aria-checked',String(on)); b.tabIndex=on?0:-1; if(on&&focus) b.focus({preventScroll:true}); });
  startT.textContent=`START ${n} SPINS`; };
 const flip=b=>b.setAttribute('aria-checked',String(b.getAttribute('aria-checked')!=='true'));
 sh.addEventListener('click',e=>{ const t=e.target; if(w.dataset.out) return; // окно уже закрывается: повторный клик (в том числе второй START) ничего не делает
  if(t.closest('.x')){ close(e); return; }
  const c=t.closest('[data-n]'); if(c){ pick(+c.dataset.n); return; }
  const o=t.closest('.a-opt'); if(o){ flip(o); return; }
  if(t.closest('#bp-astart')){ // явное подтверждение: автоигра начинается только отсюда
   window.bpAudio&&bpAudio.play('ui.confirm');
   C.setAuto(n,{stopBonus:sb.getAttribute('aria-checked')==='true',stopWin:sw.getAttribute('aria-checked')==='true'?WIN_X:0});
   close(e); if(!GS.spinning) C.spin(); } });
 w.addEventListener('click',e=>{ if(e.composedPath()[0]===w) close(); }); // клик мимо окна
 cnt.addEventListener('keydown',e=>{ if(!/^(Arrow(Left|Right|Up|Down)|Home|End)$/.test(e.key)) return; e.preventDefault(); // выбор числа спинов: стрелки, Home, End — как у группы переключателей
  const i=COUNTS.indexOf(n), j=e.key==='Home'?0:e.key==='End'?COUNTS.length-1:Math.max(0,Math.min(COUNTS.length-1,i+(/Right|Down/.test(e.key)?1:-1))); pick(COUNTS[j],true); });
 D.trap(sh); document.body.append(w); D.socialize(sh); D.rise(dlg); D.follow(w,stage);
 setTimeout(()=>dlg.focus({preventScroll:true}),30);
}
D.auto=auto;
})();
