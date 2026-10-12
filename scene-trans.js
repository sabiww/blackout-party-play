// Blackout Party — переходы между сценами (2026-10-10). Макет, не игра.
// У каждой сцены свой переход (выбор владельца): в зал — «занавес плавный», в «Кухню» — ржавый ставень, в «Камеры» — мягкий шум.
// «Меньше движения» (prefers-reduced-motion) — простое затемнение 0,2 с. Turbo — вдвое быстрее, Quick — на четверть.
// Переход идёт через перезагрузку страницы: половина «закрыть» играет перед переходом, половина «открыть» — на новой странице.
//   SceneTrans.go(p, nav)  — закрыть экран и вызвать nav() (в игре это goQ(p) или location.search=p); сцена назначения берётся из p (?scene=…, по умолчанию зал).
//   SceneTrans.enter()     — на новой странице: накрыть экран сразу, дождаться сцены и открыть; вызывается сам при загрузке этого файла.
// Флаг между страницами — sessionStorage 'bp-trans' = «curtain|shutter|noise|fade:время»; он одноразовый и живёт не дольше 20 с.
// Подключать СИНХРОННЫМ <script> в <head>, раньше ui.js: первый кадр новой страницы уже накрыт, вспышки сцены нет.
// 2026-10-11 (п.1 «переходы»): (1) холодный запуск страницы без флага (открыли игру, перешли по «Экранам макета») тоже накрыт: тёмный экран и проявление, когда готовы шрифты и фон,
//   раньше пульт, поле и картинки появлялись кусками; (2) пока шторка закрыта, на <html> стоит data-trans — окна на новой странице (ворота бонуса) ждут подъёма шторки и показываются вместе с ней;
//   (3) готовность считается по фону сцены, который стоит на странице (а не по угаданной картинке); картинку сцены назначения качаем ещё во время закрытия шторки.
(()=>{
'use strict';
if(window.SceneTrans) return;
const KEY='bp-trans', TTL=20000;
const KIND={hall:'curtain',kitchen:'shutter',cameras:'noise'}; // сцена назначения → переход
const BG={curtain:'bg-hall',shutter:'bg-kitchen',noise:'bg-security'}; // фон сцены, который ждём перед открытием
const REVEAL={curtain:380,shutter:480,noise:360,fade:70}; // через сколько мс после начала подъёма сцена уже видна наполовину (×k скорости)
const cs=document.currentScript, here=((cs&&cs.src)||'').split('?')[0];
// картинки: рядом с макетом лежит ../assets/, в артефакте — assets/; можно задать атрибутом data-a у <script>
const AB=(cs&&cs.getAttribute('data-a'))||(/\/mockup\/[^\/]*$/.test(here)?'../assets/':'assets/');
const url=f=>{ try{ return new URL(AB+f,document.baseURI).href; }catch(e){ return AB+f; } };
const IMG={curtain:url('trans/curtain.webp'),shutter:url('trans/shutter.webp')};
// крошечные копии (≈190 байт), чтобы первый кадр новой страницы не был пустым, пока грузится настоящая картинка
const PH={curtain:'data:image/webp;base64,UklGRogAAABXRUJQVlA4IHwAAADwBACdASowABgAPsVOoEy0pCMiOrmYApAYiWUAw6MvxIntowh29EgK/oiCLlTrzwgA/vJ/vGHB9KmyI8u23Tx5ZQ6tcX1/y1LdQStnZY8Khv/ona7HXd7rBQns07mTAT6itzEej9mtimIphIXpH49fkBna48za5zw3oAAA',
 shutter:'data:image/webp;base64,UklGRoIAAABXRUJQVlA4IHYAAABQBQCdASowABkAPtlYo0yoJSMiMAqpABsJZQC84CG+xkm1OpWq5l3H5f689SHpWtNkIAAA/vVwdl++1uyBXEx39A4Dv8gjdhDdUDpTWVNVhCMS4xVhTum+Z/xZtHr1pc0OkFo85h5HTn8dfPckgojrLETsAAAA'};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const mk=(tag,css,par)=>{ const e=document.createElement(tag); if(css) e.style.cssText=css; if(par) par.appendChild(e); return e; };
const anim=(el,kf,o)=>{ try{ return el.animate(kf,o).finished.catch(()=>{}); }catch(e){ return Promise.resolve(); } };
const reduced=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
// скорость: Turbo (в меню или зажатый пробел) ×0.5, Quick ×0.75, обычная ×1; игра на новой странице ещё не готова — читаем сохранение
const speedK=()=>{ let s='normal', h=false;
 try{ const G=window.bpTime&&window.bpTime.GS; if(G){ s=G.speed; h=G.holdTurbo; } else s=(JSON.parse(sessionStorage.getItem('bp-ui')||'{}')).speed||'normal'; }catch(e){}
 return (h||s==='turbo'?.5:s==='quick'?.75:1)*Math.max(1,window.__slow||1); }; // window.__slow — только для съёмки в замедлении (как в ui.js): растягивает переход во столько же раз
const pre={}; // картинки держим в памяти и заранее декодируем
const load=k=>pre[k]||(pre[k]=new Promise(res=>{ const i=new Image(); i.src=IMG[k]; (i.decode?i.decode():new Promise(r=>{i.onload=i.onerror=r})).then(res,res); }));

// ---------- ставень: траектория считается по формулам, а не ломаной из нескольких ключевых кадров ----------
// Раньше падение шло тремя кусками с разной кривой (скорость обрывалась в ноль на стыке 35% и росла заново), а удар приходился на «−3%»: щель внизу экрана оставалась открытой, потом ставень отпрыгивал.
// Теперь: падение с ускорением (та же кривая 0,25q+0,75q², что у падения символов), удар точно об пол (0%), отскок и ещё один малый, покой. Положение дано 48 отсчётами, кривая «linear» между ними.
// Дрожь рамы — затухающие синусоиды (раньше зигзаг с резкими разворотами): мелкая при падении, резче и быстро гаснущая после удара.
const SHUT_Y=(()=>{ const N=48, T1=.6, kf=[]; for(let i=0;i<=N;i++){ const t=i/N; let y;
  if(t<T1){ const u=t/T1; y=-102*(1-(.25*u+.75*u*u)); }
  else if(t<.82){ const u=(t-T1)/(.82-T1); y=-4*4*u*(1-u); } // первый отскок: поднялся на 4% и упал
  else if(t<.92){ const u=(t-.82)/.10; y=-.8*4*u*(1-u); } // второй, малый
  else y=0;
  kf.push({transform:`translateY(${y.toFixed(3)}%)`,offset:t}); } return kf; })();
const SHUT_X=(()=>{ const N=60, kf=[]; for(let i=0;i<=N;i++){ const t=i/N; let x=0;
  if(t<.6) x=1.5*Math.sin(2*Math.PI*t/.14)*Math.sin(Math.PI*t/.6); // дрожит, пока едет
  else x=3*Math.exp(-(t-.6)/.07)*Math.sin(2*Math.PI*(t-.6)/.09); // удар об пол
  kf.push({transform:`translateX(${x.toFixed(2)}px)`,offset:t}); } return kf; })();
const LIFT_Y=(()=>{ const N=40, kf=[]; for(let i=0;i<=N;i++){ const t=i/N, e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; kf.push({transform:`translateY(${(-102*e).toFixed(3)}%)`,offset:t}); } return kf; })(); // подъём: мягкий разгон и торможение (раньше первые 10% шли рывком вверх на 6%, потом излом скорости)

// ---------- виды переходов: build(R, closed) кладёт слои в R; shut(k) закрывает, lift(k) открывает; k — множитель времени ----------
const KINDS={
 // простое затемнение: «меньше движения»
 fade:{ build(R,closed){ const d=mk('div','position:absolute;inset:0;background:#000;opacity:'+(closed?1:0),R);
  return { shut:k=>anim(d,[{opacity:0},{opacity:1}],{duration:200*k,easing:'ease-out',fill:'forwards'}), lift:k=>anim(d,[{opacity:1},{opacity:0}],{duration:200*k,easing:'ease-in-out',fill:'forwards'}) }; } },

 // ЗАНАВЕС ПЛАВНЫЙ (зал): полотно из тонких полос без зазоров, каждая едет по одной кривой с чуть другой задержкой — подол идёт волной
 curtain:{ build(R,closed){
  const W=innerWidth, H=innerHeight, NS=W<600?48:72, sh=H*1.12, bw=Math.max(W,sh*(1408/712)*.5); // на телефоне полотно шире экрана, иначе складки слипаются
  const E='cubic-bezier(.45,0,.2,1)', Y0='-91%', A=40; // -91%: подол начинает у самой верхней кромки
  const shade=mk('div','position:absolute;inset:0;background:#000;opacity:'+(closed?1:0),R), box=mk('div','position:absolute;inset:0',R), S=[];
  for(let i=0;i<NS;i++){ const L=i*W/NS, pos=-(L+(bw-W)/2)+'px 0';
   S.push(mk('i',`position:absolute;top:-12%;bottom:0;left:${L}px;width:${W/NS+1.5}px;background-color:#1c0709;background-image:url(${IMG.curtain}),url(${PH.curtain});background-position:${pos},${pos};background-size:${bw}px 100%,${bw}px 100%;background-repeat:no-repeat;will-change:transform;backface-visibility:hidden;transform:translateY(${closed?'0':Y0})`,box)); }
  const wave=(i,ph,k)=>A*k*(.5+.5*Math.sin(i*2*Math.PI/36+ph));
  const run=(y0,y1,dur,ph,k)=>Promise.all(S.map((s,i)=>anim(s,[{transform:`translateY(${y0})`},{transform:`translateY(${y1})`}],{duration:dur,delay:wave(i,ph,k),easing:E,fill:'both'})));
  return {
   shut:k=>{ anim(shade,[{opacity:0},{opacity:.55}],{duration:850*k+A*k,easing:E,fill:'forwards'}); return run(Y0,'0%',850*k,0,k); },
   lift:k=>{ anim(shade,[{opacity:.55},{opacity:0}],{duration:800*k+A*k,easing:E,fill:'forwards'}); return run('0%',Y0,800*k,2.4,k); } }; } },

 // РЖАВЫЙ СТАВЕНЬ (кухня): фото ставня едет вниз с дрожью, у пола подпрыгивает; сверху короб с тенью
 shutter:{ build(R,closed){
  // дрожь — на обёртке (transform, без перекладки), падение — на самом ставне; обёртка шире экрана на 8 px, чтобы при дрожи не открывались щели
  const wr=mk('div','position:absolute;top:0;bottom:0;left:-8px;right:-8px',R);
  const rol=mk('div',`position:absolute;inset:0;background-color:#1a1710;background-image:url(${IMG.shutter}),url(${PH.shutter});background-size:100% 100%,100% 100%;background-repeat:no-repeat;box-shadow:0 18px 30px rgba(0,0,0,.7);will-change:transform;transform:${closed?'none':'translateY(-102%)'}`,wr);
  mk('i','position:absolute;left:0;right:0;bottom:0;height:5%;background:linear-gradient(transparent,rgba(0,0,0,.45))',rol);
  const box=mk('div','position:absolute;left:0;right:0;top:0;height:5%;background:linear-gradient(rgba(0,0,0,.8),transparent);z-index:2;opacity:'+(closed?1:0),R);
  return {
   shut:k=>{ const D=900*k; anim(box,[{opacity:0},{opacity:1}],{duration:D*.5,fill:'forwards'});
    anim(wr,SHUT_X,{duration:D,easing:'linear'});
    return anim(rol,SHUT_Y,{duration:D,easing:'linear',fill:'forwards'}); },
   lift:k=>{ const D=900*k; anim(box,[{opacity:1},{opacity:0}],{duration:D*.4,delay:D*.6,fill:'forwards'});
    return anim(rol,LIFT_Y,{duration:D,easing:'linear',fill:'forwards'}); } }; } },
 // МЯГКИЙ ШУМ (камеры): полоса развёртки едет transform-ом (130% высоты слоя при высоте полосы 18% = 722% от неё), а не через top — раскладка не пересчитывается. Тёмный, приглушённый, без белых вспышек; нарастает и уходит мягко
 noise:{ build(R,closed){
  const n=mk('div','position:absolute;inset:0;background:#06100d;opacity:'+(closed?1:0),R), cv=mk('canvas','position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;opacity:.55;mix-blend-mode:screen',n);
  const px=Math.max(6,Math.round(Math.max(innerWidth,innerHeight)/128)); cv.width=Math.ceil(innerWidth/px); cv.height=Math.ceil(innerHeight/px); const g=cv.getContext('2d'); // квадратные «пиксели» шума на любом экране
  mk('div','position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 2px,transparent 2px 4px)',n);
  const band=mk('div','position:absolute;left:0;right:0;height:18%;top:-20%;background:linear-gradient(transparent,rgba(120,200,180,.08),transparent)',n);
  const lab=mk('span','position:absolute;left:24px;top:18px;font:400 min(38px,9vw) "VT323",ui-monospace,monospace;color:#c9a46a;opacity:.8;text-shadow:0 0 8px rgba(255,180,70,.6)',n); lab.textContent='CAM 02';
  const draw=()=>{ try{ const d=g.createImageData(cv.width,cv.height), a=d.data; for(let i=0;i<a.length;i+=4){ const v=30+Math.random()*70; a[i]=v*.55; a[i+1]=v; a[i+2]=v*.85; a[i+3]=255; } g.putImageData(d,0,0); }catch(e){} };
  draw(); const t=setInterval(draw,90);
  return { stop:()=>clearInterval(t),
   shut:k=>{ anim(band,[{transform:'translateY(0%)'},{transform:'translateY(722%)'}],{duration:1400*k,iterations:2}); return anim(n,[{opacity:0},{opacity:.55,offset:.5},{opacity:1}],{duration:650*k,easing:'ease-in',fill:'forwards'}); },
   lift:k=>{ anim(band,[{transform:'translateY(0%)'},{transform:'translateY(722%)'}],{duration:1400*k,iterations:2}); return anim(n,[{opacity:1},{opacity:.5,offset:.5},{opacity:0}],{duration:800*k,easing:'ease-out',fill:'forwards'}); } }; } }
};

// ---------- слой перехода ----------
let cur=null, busy=false, pend=null, entered=false, fallback=0;
const flag=on=>{ try{ const r=document.documentElement; if(on) r.setAttribute('data-trans','1'); else r.removeAttribute('data-trans'); }catch(e){} };
function mount(kind,closed){ unmount();
 const R=mk('div','position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;overflow:hidden;pointer-events:auto'); R.id='bp-trans'; R.setAttribute('aria-hidden','true');
 (document.body||document.documentElement).appendChild(R); // в <head> тела ещё нет — кладём в <html>, слой fixed
 return cur={R,kind,t:KINDS[kind].build(R,closed)}; }
function unmount(c){ if(c&&c!==cur) return; if(!cur) return; try{ cur.t.stop&&cur.t.stop(); }catch(e){} cur.R.remove(); cur=null; flag(false); }

// закрыть экран и перейти. nav — функция перехода (по умолчанию goQ/location.search, как у toScreen в ui.js)
function go(p,nav){
 p=String(p==null?'':p); const navigate=typeof nav==='function'?nav:()=>{ if(typeof goQ==='function') goQ(p); else location.search=p; };
 if(api.off||window.__noTrans||window.__sim){ navigate(); return; }
 pend={p,nav:navigate}; if(busy) return; busy=true; window.bpAudio&&bpAudio.leave(); // музыка гаснет вместе с шторкой (audio.js) // второй вызов, пока экран закрывается: переходим по последнему
 let sc='hall'; try{ sc=new URLSearchParams(p).get('scene')||'hall'; }catch(e){}
 const kind=reduced()?'fade':(KIND[sc]||'curtain'), c=mount(kind,false), k=speedK();
 if(BG[KIND[sc]||'curtain']){ const i=new Image(); i.src=url(BG[KIND[sc]||'curtain']+(innerWidth>innerHeight?'-landscape':'-portrait')+'.webp'); } // фон назначения догружается, пока шторка закрывается: новая страница берёт его из кэша
 Promise.race([kind==='fade'||kind==='noise'?0:load(kind),wait(500)]).then(()=>Promise.race([c.t.shut(k),wait(2200*k+400)])).then(()=>{ // запас: в фоновой вкладке анимации могут не доиграть — переходим всё равно
  try{ sessionStorage.setItem(KEY,kind+':'+Date.now()); }catch(e){}
  try{ pend.nav(); }catch(e){ console.error(e); abort(); return; }
  fallback=setTimeout(abort,8000); }); } // страница не ушла — не оставляем экран закрытым
function abort(){ window.bpAudio&&bpAudio.resume&&bpAudio.resume(); clearTimeout(fallback); busy=false; pend=null; try{ sessionStorage.removeItem(KEY); }catch(e){} unmount(); }

// ---------- на новой странице ----------
// Готово = страница загружена, шрифты на месте, фон сцены (тот, что стоит на странице) разобран, пройдено два кадра. При холодном запуске (boot) — без обязательной паузы и не дольше 2,2 с.
function pageBg(){ try{ const b=document.getElementById('bg'), m=b&&/url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(b).backgroundImage); return m?m[1]:''; }catch(e){ return ''; } }
function ready(kind,boot){
 const ld=document.readyState==='complete'?Promise.resolve():new Promise(r=>addEventListener('load',r,{once:true}));
 const fonts=ld.then(()=>document.fonts&&document.fonts.ready||0);
 const bg=ld.then(()=>new Promise(res=>{ const u=pageBg()||(BG[kind]?url(BG[kind]+(innerWidth>innerHeight?'-landscape':'-portrait')+'.webp'):''); if(!u) return res(); const i=new Image(); i.src=u; (i.decode?i.decode():new Promise(r=>{i.onload=i.onerror=r})).then(res,res); }));
 const raf=()=>new Promise(r=>{ requestAnimationFrame(()=>requestAnimationFrame(r)); setTimeout(r,120); });
 const rk=ld.then(()=>typeof window.roccoReady==='function'?window.roccoReady():0); // Рокко (первый кадр покоя) тоже должен быть на месте: иначе он появляется после того, как шторка открылась
 return Promise.race([Promise.all([ld,fonts,bg,rk,wait(boot?0:100)]),wait(boot?2200:3500)]).then(raf); } // не дольше 3,5 с (при запуске 2,2 с), даже если что-то не загрузилось
function enter(){
 if(entered) return; entered=true;
 if(api.off||window.__noTrans||window.__sim) return;
 let v=null; try{ v=sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); }catch(e){}
 let kind=null, boot=false;
 if(v){ const [k,ts]=v.split(':'); if(KINDS[k]&&(Date.now()-(+ts)<TTL)) kind=k; }
 if(!kind){ kind='fade'; boot=true; } // холодный запуск: тёмный экран и проявление
 const c=mount(kind,true), guard=setTimeout(()=>unmount(c),9000); flag(true);
 ready(kind,boot).then(()=>{ if(cur!==c) return; c.R.style.pointerEvents='none'; const k=boot?(reduced()?1:1.6):speedK();
  setTimeout(()=>{ if(cur===c) flag(false); },REVEAL[kind]*k); // окна новой страницы (ворота бонуса) начинают появляться, когда шторка приоткрыла сцену, а не раньше: иначе они успевают выехать под закрытой шторкой
  return Promise.race([c.t.lift(k),wait(3000)]); }).catch(()=>{}).then(()=>{ clearTimeout(guard); unmount(c); }); }

const api=window.SceneTrans={go,enter,off:false,kinds:KIND,busy:()=>busy||!!cur}; // busy: шторка закрывается / стоит / открывается — игра в это время не крутит спины и не открывает окна
window.bpGo=p=>go(p); // для кнопок панели «Экраны макета»
addEventListener('pageshow',e=>{ if(e.persisted) abort(); }); // «Назад» из кэша страниц не должен оставлять экран закрытым
addEventListener('load',()=>setTimeout(()=>{ if(!reduced()) ['curtain','shutter'].forEach(load); },400)); // картинки переходов грузим заранее
enter();
})();
