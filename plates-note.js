// Blackout Party — вид плашек «Записка на плите» (владелец 2026-10-12, направление 1 из plates-all.html: «сделай плашки в таком стиле, но без нейрослопа, рамки по цвету как рамка слота»).
// 2026-10-12 (fb/plates-dark): три режима — dark (умолчание: тёмные плашки окон F, их ингредиенты у всех плашек игры, plates-dark.css), note (бумага на плите), old (прежние красные). Окна F в dark и old одинаковые (dialogs-f.css без правок).
// Макет, не игра. Подключается ПЕРВЫМ в <head> (до всех стилей игры): ставит <html data-plates="note|old"> — весь вид записок включается только под этим атрибутом (plates-note.css, dialogs-f-note.css).
// Выбор: адрес ?plates=dark|note|old (главнее), sessionStorage 'bp-plates' (тест-панель, раздел «Плашки»), по умолчанию dark. «old» — прежний вид всех плашек без изменений.
// API: bpPlates.mode() → 'note'|'old'; bpPlates.on(); bpPlates.set('old'|'note') — запоминает выбор и перезагружает страницу (окна F живут в shadow DOM и читают стиль при создании);
//      bpPlates.toast(text[, ms]) — записка-уведомление у нижнего края поля («NOT ENOUGH BALANCE» и др.), в режиме old ничего не рисует.
(()=>{
'use strict';
const KEY='bp-plates';
const ss={get:k=>{ try{ return sessionStorage.getItem(k); }catch(e){ return null; } },set:(k,v)=>{ try{ sessionStorage.setItem(k,v); }catch(e){} },del:k=>{ try{ sessionStorage.removeItem(k); }catch(e){} }};
const OK=['dark','note','old'];
const urlMode=()=>{ let m=null; try{ m=(typeof q!=='undefined'&&q&&q.get)?q.get('plates'):new URLSearchParams(location.search).get('plates'); }catch(e){ try{ m=new URLSearchParams(location.search).get('plates'); }catch(e2){} } return OK.includes(m)?m:null; };
const mode=()=>{ const u=urlMode(); if(u) return u; const s=ss.get(KEY); return OK.includes(s)?s:'dark'; }; // умолчание dark (владелец 2026-10-12: «такие плашки оставь везде»)
const apply=()=>{ document.documentElement.setAttribute('data-plates',mode()); };
apply();
let tT=0;
function toast(text,ms){
 if(mode()==='old'||!document.body) return;
 let t=document.getElementById('pn-toast');
 if(!t){ t=document.createElement('div'); t.id='pn-toast'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.append(t); }
 t.innerHTML='<span class="pn-t-in"></span>'; t.firstChild.textContent=text;
 const pod=document.getElementById('pod'), r=pod&&pod.getBoundingClientRect(); // записка стоит над пультом, по его центру (нет пульта — по центру экрана)
 if(r&&r.width){ t.style.left=Math.max(8,Math.min(innerWidth-8,r.left+r.width/2))+'px'; t.style.top=Math.max(60,r.top-12)+'px'; } else { t.style.left='50%'; t.style.top=(innerHeight*.8)+'px'; }
 t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
 clearTimeout(tT); tT=setTimeout(()=>t.classList.remove('on'),ms||2600);
}
window.bpPlates={mode,on:()=>mode()==='note',dark:()=>mode()==='dark',apply,toast,
 set(v){ if(!OK.includes(v)) return; ss.set(KEY,v); let u=null; try{ u=new URL(location.href); u.searchParams.delete('plates'); }catch(e){} if(u) location.replace(u.toString()); else location.reload(); }};
// страница могла открыться без запроса, а q (index.html?bpv=ad37e15b) прочитать адрес позже — подстрахуемся после загрузки
document.addEventListener('DOMContentLoaded',apply);
})();
