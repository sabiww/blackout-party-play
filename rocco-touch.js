// Blackout Party — Рокко «касается» суммы выигрыша (2026-10-12, ветка fb/win2; владелец: «чтобы он как-то трогал плашку с выигрышем»).
// Макет, не игра. Ролик НЕ свой: запрашивает режиссёр (rocco-alive.js win(): ветка «касание»), играет существующий H-grab6 в обычной скорости ×1 (контроллер rocco-flow.js, двойного воспроизведения нет).
// Здесь только бумажная полоска с суммой раунда, привязанная к руке по кадрам этого ролика: время берётся из v.currentTime, а не из таймеров.
// Кадры H-grab6 (24 к/с, 1280×720, ролик без отражения; замер по альфа-каналу — «край руки» и центр кисти):
//   0,625 с (кадр 15) рука в рывке, 0,667 (16) раскрытая ладонь уже на вытянутой руке, 0,667–0,875 держится почти неподвижно (кисть ≈(696,307)), 0,917–1,125 отдёргивается к телу.
// Что видно: рука вытянута к рамке поля (кончик на правой кромке клеток), на кадре 16 полоска «пристаёт» к ладони правым концом и лежит на последнем столбце (хлопок: масштаб .72→1 за 0,09 с), держится, пока ладонь стоит, на отдёргивании (≥ 0,90 с) отпускается: падает вниз, чуть кружась, гаснет.
// Слой полоски — под роликом Рокко (z-index 5 против 6): пальцы лежат поверх неё, как будто держат. Turbo/Quick/Skip/«меньше движения»: режиссёр до сюда не доходит (k<1, okNow), Skip и новый спин убирают полоску сразу.
// Отладка: RoccoTouch.test(amt) — сразу запросить ролик и полоску (если режиссёр жив и Рокко свободен); RoccoTouch.track — таблица кадров.
(()=>{
'use strict';
const TR=[[.583,830,452,881,447],[.625,798,423,846,407],[.667,650,308,700,307],[.708,648,308,696,307],[.75,646,308,695,307],[.792,646,308,694,307],[.833,644,308,693,307],[.875,644,309,693,308],[.917,652,312,698,315],[.958,666,329,713,329],[1,686,337,731,341]]; // t, край руки x,y, центр кисти x,y (px кадра)
const T_ARRIVE=.66, T_LET=.9; // ладонь на месте / начало отдёргивания (с ролика)
const SL=()=>window.__slow||1; // замедленная съёмка проверок (tools/anim-check/cap.js): ролики и анимации игры идут в N раз медленнее
const lerp=(a,b,u)=>a+(b-a)*u;
function palm(t){ if(t<=TR[0][0]) return [TR[0][3],TR[0][4]]; for(let i=1;i<TR.length;i++){ if(t<=TR[i][0]){ const a=TR[i-1], b=TR[i], u=(t-a[0])/(b[0]-a[0]); return [lerp(a[3],b[3],u),lerp(a[4],b[4],u)]; } } const e=TR[TR.length-1]; return [e[3],e[4]]; }
function start(R,o,ctx){
 const v=R&&R.v, app=document.getElementById('app'); if(!v||!app||typeof window.roccoUmPt!=='function'||!o||!o.amt) return false;
 const GS=ctx&&ctx.GS||{}, s=Math.max(.35,(window.roccoScale&&window.roccoScale())||1), fs=Math.max(12,30*s);
 const e=document.createElement('div'); e.className='wfx-slip'; e.innerHTML='<b></b>'; e.firstChild.textContent=o.amt; e.style.fontSize=fs+'px'; e.style.opacity=0; app.appendChild(e);
 let st=0, dead=false, raf=0; // 0 ждёт ладонь, 1 держится, 2 отпущена
 const end=fast=>{ if(dead) return; dead=true; cancelAnimationFrame(raf); document.removeEventListener('bp-skip',onSkip); if(!e.isConnected) return; if(fast){ e.remove(); return; } const a=e.animate([{opacity:parseFloat(getComputedStyle(e).opacity)||0},{opacity:0}],{duration:120*SL(),fill:'forwards'}); a.finished.catch(()=>{}).then(()=>e.remove()); };
 const onSkip=()=>end(true); document.addEventListener('bp-skip',onSkip);
 const place=()=>{ const a=app.getBoundingClientRect(), p=palm(Math.min(Math.max(v.currentTime,TR[0][0]),TR[TR.length-1][0])), P=window.roccoUmPt(p[0],p[1]), w=e.offsetWidth, h=e.offsetHeight;
  if(!(P[0]>0&&P[0]<innerWidth&&P[1]>0&&P[1]<innerHeight)) return false; // Рокко за экраном (раскладка без роликов): без полоски
  e._x=P[0]-a.left-w*.97; e._y=P[1]-a.top-h*.5; e.style.left=e._x+'px'; e.style.top=e._y+'px'; return true; };
 const tick=()=>{ if(dead) return; if(!R.alive()||(GS.spinning)||v.paused&&v.currentTime<.1||!e.isConnected){ end(false); return; }
  const t=v.currentTime;
  if(st===0&&t>=T_ARRIVE){ if(!place()){ end(true); return; } st=1; e.style.transformOrigin='100% 50%'; e.animate([{opacity:0,transform:'scale(.72) rotate(-4deg)'},{opacity:1,transform:'scale(1) rotate(-2deg)'}],{duration:90*SL(),fill:'forwards',easing:'ease-out'}); }
  else if(st===1){ if(t>=T_LET||t<T_ARRIVE-.2){ st=2; const h=e.offsetHeight, a=getComputedStyle(e).transform; e.getAnimations().forEach(x=>x.cancel()); e.style.opacity=1; e.style.transformOrigin='50% 0'; // отпущена: оторвалась от пальцев и упала вниз, чуть кружась
    const an=e.animate([{opacity:1,transform:'rotate(-2deg) translate(0,0)'},{opacity:1,transform:`rotate(-9deg) translate(${-h*.1}px,${h*.55}px)`,offset:.4},{opacity:0,transform:`rotate(14deg) translate(${-h*.3}px,${h*3.2}px)`}],{duration:520*SL(),easing:'cubic-bezier(.4,0,.85,.55)',fill:'forwards'}); an.finished.catch(()=>{}).then(()=>{ dead=true; document.removeEventListener('bp-skip',onSkip); e.remove(); }); return; }
   place(); }
  if(st===2) return; raf=requestAnimationFrame(tick); };
 R.started.then(ok=>{ if(!ok||dead){ end(true); return; } raf=requestAnimationFrame(tick); });
 setTimeout(()=>{ if(!dead&&st===0) end(true); },6000*SL()); // ролик не дошёл до ладони
 return true; }
window.RoccoTouch={on:(()=>{ try{ return /[?&]rtouch=1/.test(location.search)||sessionStorage.getItem("bp-rtouch")==="1"; }catch(e){ return false; } })(), start,track:TR,palm,
 test(amt){ if(!window.roccoPlay||!window.roccoPlay('A-rub',true)) return false; const R=window.roccoRun; return start(R,{amt:amt||bpMoney.win(.72)},{GS:window.bpTime&&window.bpTime.GS}); } };
})();
