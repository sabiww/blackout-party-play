/* Blackout Party — «Камеры»: живые записи камер на трёх мониторах стены охраны (2026-10-12, ветка fb/cam-feeds).
   Слева СНИЗУ (на экране) — главный зал (был слева сверху — его закрывали логотип и плашки; 2026-10-12, fb/cams-fix), справа сверху — коридор, справа снизу — кухня; четвёртый монитор (слева сверху) остаётся помехами фона.
   Запись лежит точно по стеклу монитора: углы стекла и контур шума замерены на bg-security-landscape/portrait (tools/cam_feeds_quads.py → данные MON ниже, координаты картинки 1536×1024 / 1024×1536),
   плоскость записи ставится matrix3d по четырём углам (проекция), контур вырезает clip-path. Отражение фона (flip) и сдвиг/масштаб фона берутся из render() (index.html?bpv=6c80e99c), поэтому запись едет вместе с фоном.
   Вид камеры: приглушённый (saturate), строки развёртки, виньетка, зерно, едва заметная полоса помех; метка «CAM 01 · MAIN HALL», время и REC — живой текст VT323 на плоскости записи, не в картинке.
   Рокко иногда проходит по одной из записей (ролики Kling сверху, 4–6 с): редко (первый раз через 6–10 с после входа, дальше раз в 18–42 с), на двух записях сразу — никогда, не когда он ворует на поле (CamRec.roccoOn),
   не при скрытой вкладке; «меньше движения» — запись стоит (без зерна, без проходов).
   API: CamFeeds.mount(app, {land,W,H,sc,ox,oy,flip,A,webkit}) → вызывается из render(); window.bpCamFeeds: walk(id[,n]), state(), geometry() — для проверок. Адрес: ?camfeeds=0 — выключить, ?camdbg=1 — залить стекла краской (проверка контура). */
(()=>{
'use strict';
if(window.CamFeeds) return;
const MON={"land":{"TR":{"q":[[1363.6,149.0],[1485.7,120.5],[1490.4,251.8],[1368.4,274.1]],"c":[[1484.0,126.9],[1488.4,223.5],[1488.2,245.8],[1487.2,247.9],[1477.1,252.0],[1429.2,262.5],[1393.5,267.4],[1381.3,267.3],[1376.2,265.3],[1367.7,228.7],[1365.5,196.9],[1368.7,172.3],[1372.9,157.0],[1376.0,152.9],[1395.4,143.6],[1427.2,134.5],[1475.9,125.8],[1482.0,125.9]]},"TL":{"q":[[61.1,123.5],[190.1,154.2],[182.9,282.4],[52.7,255.3]],"c":[[64.0,131.9],[70.0,130.8],[90.3,132.7],[142.3,143.5],[175.0,155.9],[182.1,160.0],[186.5,191.7],[186.5,210.1],[182.1,249.0],[177.9,268.2],[175.8,272.2],[168.7,274.3],[129.0,270.5],[112.6,267.4],[73.9,257.0],[59.7,250.8],[55.7,246.7],[57.5,189.7],[63.0,132.9]]},"BL":{"q":[[39.8,331.6],[180.3,355.4],[173.6,466.9],[37.4,456.1]],"c":[[48.9,346.0],[61.1,340.8],[78.3,339.7],[113.0,344.5],[145.8,350.7],[149.9,352.8],[172.3,371.3],[175.4,385.6],[176.5,410.1],[175.4,424.4],[170.1,453.0],[167.0,460.1],[162.0,463.2],[148.8,463.3],[89.4,459.4],[61.8,448.0],[39.5,420.3],[38.5,399.9],[39.6,383.6]]},"BR":{"q":[[1367.0,351.8],[1504.4,333.5],[1510.4,462.7],[1370.3,474.7]],"c":[[1502.1,344.0],[1504.3,361.2],[1507.4,425.4],[1507.2,457.9],[1488.0,463.1],[1423.8,469.5],[1391.2,469.3],[1378.0,467.1],[1376.0,463.1],[1371.7,440.8],[1369.6,422.4],[1369.6,380.5],[1373.8,358.1],[1386.0,352.9],[1439.2,342.5],[1476.8,339.8],[1497.1,339.9]]}},"port":{"TR":{"q":[[949.3,152.4],[1067.7,124.8],[1072.2,252.1],[953.9,273.7]],"c":[[1062.7,131.7],[1063.7,132.7],[1064.0,256.1],[1063.0,257.1],[1014.8,260.3],[972.8,270.5],[961.5,269.4],[958.4,262.4],[952.9,235.0],[949.6,199.5],[950.8,187.1],[960.4,162.6],[968.6,152.5],[988.1,142.5],[1010.5,134.6]]},"TL":{"q":[[-48.7,130.4],[79.5,160.9],[72.3,288.1],[-57.0,261.2]],"c":[[-40.7,141.7],[11.4,142.6],[44.0,153.5],[69.6,165.6],[72.7,168.7],[76.2,200.2],[76.5,218.9],[73.0,251.1],[66.5,280.4],[64.4,283.4],[61.4,284.5],[48.1,282.5],[11.2,273.3],[-41.1,267.1]]},"BR":{"q":[[960.5,352.7],[1105.4,333.4],[1111.8,469.6],[964.1,482.3]],"c":[[1063.6,342.6],[1063.9,472.2],[1061.8,473.3],[1018.7,474.3],[990.1,479.5],[974.7,478.5],[972.6,474.4],[966.1,447.2],[961.5,421.1],[961.1,386.8],[963.4,361.6],[976.7,355.5],[1020.6,342.6]]},"BL":{"q":[[-73.5,338.1],[73.4,362.9],[66.4,479.4],[-76.0,468.2]],"c":[[-39.8,352.7],[13.5,351.6],[39.0,358.5],[62.6,367.6],[66.9,380.8],[70.3,401.3],[70.5,423.2],[64.9,452.2],[58.5,472.4],[55.4,477.4],[53.3,478.5],[36.9,478.5],[5.2,472.3],[-39.9,470.2],[-40.9,469.2],[-40.8,353.7]]}}}; // координаты картинки: q — четыре угла проекции (TL,TR,BR,BL), c — контур стекла (шум) с запасом 1,5 px
const ROLES={LB:{id:'hall',cam:'CAM 01',name:'MAIN HALL'},RT:{id:'corr',cam:'CAM 02',name:'CORRIDOR'},RB:{id:'kitchen',cam:'CAM 03',name:'KITCHEN'}}; // по положению на экране
const FEEDS={ // база — пустой кадр, ролики — Рокко проходит (имя без расширения: .webm и .hevc.mp4; corr-walk2 — первые 4 с старого C-walk, обрыв сигнала)
 hall:{base:'camfeeds/hall.webp',clips:['camfeeds/hall-walk1','camfeeds/hall-walk2']},
 corr:{base:'rocco/cam-C0.webp',clips:['camfeeds/corr-walk1','camfeeds/corr-walk2'],tint:'nv'},
 kitchen:{base:'camfeeds/kitchen.webp',clips:['camfeeds/kitchen-walk1','camfeeds/kitchen-walk2']}};
const q=new URLSearchParams(location.search), OFF=q.get('camfeeds')==='0', DBG=q.get('camdbg')==='1';
const S={els:[],A:'',webkit:false,next:0,last:'',cur:null,tick:0,t0:Date.now(),clock:(2*3600+47*60+13),noise:'',rm:null};
const mkn=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
const rnd=(a,b)=>a+Math.random()*(b-a);
const RM=()=>{ try{ if(window.bpTime&&bpTime.RM&&bpTime.RM()) return true; }catch(e){} try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };

/* ---------- геометрия ---------- */
function homography(src,dst){ // 4 точки → матрица 3×3 (h33 = 1): dst = H·src
 const M=[],b=[]; for(let i=0;i<4;i++){ const [x,y]=src[i],[u,v]=dst[i]; M.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u); M.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v); }
 const n=8; for(let i=0;i<n;i++){ let p=i; for(let r=i+1;r<n;r++) if(Math.abs(M[r][i])>Math.abs(M[p][i])) p=r; [M[i],M[p]]=[M[p],M[i]]; [b[i],b[p]]=[b[p],b[i]];
  for(let r=0;r<n;r++){ if(r===i) continue; const f=M[r][i]/M[i][i]; for(let c=i;c<n;c++) M[r][c]-=f*M[i][c]; b[r]-=f*b[i]; } }
 const h=b.map((v,i)=>v/M[i][i]); return [[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]]; }
const apply=(H,[x,y])=>{ const w=H[2][0]*x+H[2][1]*y+1; return [(H[0][0]*x+H[0][1]*y+H[0][2])/w,(H[1][0]*x+H[1][1]*y+H[1][2])/w]; };
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function plan(g){ // список {id,role,w,h,H,clip,quad,contour} в координатах экрана
 const set=g.land?MON.land:MON.port, out=[];
 for(const key in set){ const m=set[key], toS=([x,y])=>{ const sx=x*g.sc+g.ox; return [g.flip?g.W-sx:sx,y*g.sc+g.oy]; };
  const qs=m.q.map(toS), cs=m.c.map(toS), cen=qs.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);
  const role=ROLES[(cen[0]<g.W/2?'L':'R')+(key[0])]; if(!role) continue;
  // углы по положению на экране: TL,TR,BR,BL (отражение фона меняет порядок, запись не зеркалится)
  const byY=qs.slice().sort((a,b)=>a[1]-b[1]), top=byY.slice(0,2).sort((a,b)=>a[0]-b[0]), bot=byY.slice(2).sort((a,b)=>a[0]-b[0]), c4=[top[0],top[1],bot[1],bot[0]];
  const w=Math.round((dist(c4[0],c4[1])+dist(c4[3],c4[2]))/2), h=Math.round((dist(c4[0],c4[3])+dist(c4[1],c4[2]))/2);
  const H=homography([[0,0],[w,0],[w,h],[0,h]],c4), Hi=homography(c4,[[0,0],[w,0],[w,h],[0,h]]);
  out.push({id:role.id,role,w,h,H,quad:c4,contour:cs,clip:cs.map(p=>apply(Hi,p))}); }
 return out; }
const m3d=H=>`matrix3d(${H[0][0]},${H[1][0]},0,${H[2][0]},${H[0][1]},${H[1][1]},0,${H[2][1]},0,0,1,0,${H[0][2]},${H[1][2]},0,1)`;

/* ---------- вид ---------- */
function style(){
 if(document.getElementById('camfeeds-css')) return; const st=mkn('style'); st.id='camfeeds-css';
 st.textContent=`.cf{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;pointer-events:none;background:#0a1210;contain:strict}
.cf>*{position:absolute;inset:0;width:100%;height:100%}
.cf img,.cf video{object-fit:cover;object-position:50% 58%;filter:saturate(.62) contrast(1.08) brightness(1.12)}
.cf.nv img,.cf.nv video{filter:none}
.cf video{opacity:0}.cf video.on{opacity:1}
.cf .tint{background:#6f9c90;mix-blend-mode:soft-light;opacity:.34}
.cf.nv .tint{display:none}
.cf .scan{background:repeating-linear-gradient(0deg,rgba(0,0,0,.30) 0 1px,rgba(0,0,0,0) 1px 3px)}
.cf .vig{background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 52%,rgba(0,0,0,.58) 100%)}
.cf .gr{background-size:96px 96px;mix-blend-mode:overlay;opacity:.34;animation:cfgr .5s steps(1) infinite}
@keyframes cfgr{0%{background-position:0 0}17%{background-position:-37px 21px}33%{background-position:19px -53px}50%{background-position:-71px -9px}67%{background-position:41px 33px}83%{background-position:-12px 66px}}
.cf .bar{height:22%;top:-30%;left:0;right:0;bottom:auto;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(215,240,230,.07) 50%,rgba(255,255,255,0));animation:cfbar 9.5s linear infinite}
@keyframes cfbar{0%{transform:translateY(0)}100%{transform:translateY(560%)}}
.cf .tx{font-family:"VT323",monospace;color:#d4e9de;text-shadow:1px 1px 0 rgba(0,0,0,.85);line-height:1;letter-spacing:.04em;white-space:nowrap;inset:auto;width:auto;height:auto}
.cf .cam{left:14%;top:14%}.cf .ts{left:14%;bottom:15%}
.cf .rec{right:14%;top:14%;display:flex;align-items:center;gap:.35em}
.cf .rec i{display:block;width:.55em;height:.55em;border-radius:50%;background:#e0402f;animation:cfrec 1.2s steps(1) infinite}
@keyframes cfrec{50%{opacity:0}}
.cf.gl{animation:cfgl .16s steps(2) 1}
@keyframes cfgl{0%{filter:brightness(1.7) contrast(1.4)}50%{filter:brightness(.8)}100%{filter:none}}
.cf.gl video,.cf.gl img{transform:translateX(3%)}
.cf.dbg>*{display:none}.cf.dbg{background:#f0f}
.cf.still .gr,.cf.still .bar,.cf.still .rec i{animation:none}.cf.off .gr,.cf.off .bar,.cf.off .rec i{animation-play-state:paused}`;
 document.head.append(st); }
function noiseURL(){ if(S.noise) return S.noise; try{ const c=document.createElement('canvas'); c.width=c.height=96; const x=c.getContext('2d'), d=x.createImageData(96,96); for(let i=0;i<d.data.length;i+=4){ const v=Math.random()*255|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } x.putImageData(d,0,0); S.noise=bpvT`url(${c.toDataURL('image/png')})`; }catch(e){ S.noise='none'; } return S.noise; }
const pad=n=>String(n).padStart(2,'0');
const clock=()=>{ const t=(S.clock+(RM()?0:Math.floor((Date.now()-S.t0)/1000)))%86400; return `10-12  ${pad(t/3600|0)}:${pad(t/60%60|0)}:${pad(t%60)}`; };

function build(p,A){
 const f=FEEDS[p.id], e=mkn('div','cf'+(f.tint==='nv'?' nv':'')+(RM()?' still':'')+(DBG?' dbg':'')); e.dataset.cam=p.id;
 e.style.width=p.w+'px'; e.style.height=p.h+'px'; e.style.transform=m3d(p.H); e.style.clipPath=`polygon(${p.clip.map(([x,y])=>x.toFixed(2)+'px '+y.toFixed(2)+'px').join(',')})`;
 const fs=Math.max(9,Math.round(p.w*.072));
 e.innerHTML=`<img alt="" decoding="async" src="${A}${f.base}"><video muted playsinline preload="none"></video><div class="tint"></div><div class="gr"></div><div class="bar"></div><div class="scan"></div><div class="vig"></div>`+
  `<span class="tx cam" style="font-size:${fs}px">${p.role.cam} ${p.role.name}</span><span class="tx ts" style="font-size:${fs}px">${clock()}</span><span class="tx rec" style="font-size:${fs}px"><i></i>REC</span>`;
 e.querySelector('.gr').style.backgroundImage=noiseURL();
 return e; }

function mount(app,g){
 if(OFF||!g||!app) return; style(); S.A=g.A||''; S.webkit=!!g.webkit;
 const was=S.cur&&S.cur.el.isConnected?S.cur.id:null; S.els=[]; S.plans=plan(g);
 for(const p of S.plans){ const e=build(p,S.A); app.append(e); S.els.push({id:p.id,el:e,p}); }
 S.cur=null; warm(); if(!S.next) S.next=Date.now()+rnd(6000,10000);
 if(!S.tick) S.tick=setInterval(tick,500);
 document.addEventListener('visibilitychange',vis); vis(); }
function vis(){ const off=document.hidden; S.els.forEach(f=>{ f.el.classList.toggle('off',off); if(off){ try{ f.el.querySelector('video').pause(); }catch(e){} } else if(S.cur&&S.cur.v&&!S.cur.v.ended){ try{ S.cur.v.play(); }catch(e){} } }); }

/* ---------- проходы Рокко ---------- */
function warm(){ if(S.warmed||RM()) return; S.warmed=1; let k=0; const all=[]; for(const id in FEEDS) FEEDS[id].clips.forEach(c=>all.push(c)); // ролики по 60–90 КБ: подтягиваем в кэш заранее, чтобы первый проход не ждал сети
 all.forEach(c=>setTimeout(()=>{ try{ fetch(srcOf(c),{cache:'force-cache'}).catch(()=>{}); }catch(e){} },1200+(k++)*350)); }
const roccoBusy=()=>{ try{ return !!(window.CamRec&&CamRec.roccoOn&&CamRec.roccoOn()); }catch(e){ return false; } };
function pickClip(id){ const f=FEEDS[id], list=f.clips; return list[Math.floor(Math.random()*list.length)]; }
const srcOf=n=>/\.mp4$/.test(n)?S.A+n:S.A+n+(S.webkit?'.hevc.mp4':'.webm');
function walk(id,n){
 if(S.cur) return false; const f=S.els.find(x=>x.id===id); if(!f||RM()||document.hidden) return false;
 const clips=FEEDS[id].clips, name=n==null?pickClip(id):clips[n%clips.length], v=f.el.querySelector('video'), img=f.el.querySelector('img');
 const cur={id,el:f.el,v,t:Date.now()}; S.cur=cur; S.last=id;
 const done=()=>{ if(S.cur!==cur) return; S.cur=null; cur.v.classList.remove('on'); glitch(f.el); try{ cur.v.pause(); }catch(e){} };
 cur.done=done; v.onended=done; v.onerror=done;
 v.oncanplay=()=>{ v.oncanplay=null; if(S.cur!==cur) return; glitch(f.el); v.classList.add('on'); try{ v.currentTime=0; const pr=v.play(); if(pr&&pr.catch) pr.catch(done); }catch(e){ done(); } };
 v.src=srcOf(name); v.load();
 setTimeout(()=>{ if(S.cur===cur&&!v.classList.contains('on')) done(); },2500); // не загрузился — отмена без следа
 return true; }
function glitch(el){ el.classList.remove('gl'); void el.offsetWidth; el.classList.add('gl'); setTimeout(()=>el.classList.remove('gl'),200); }
function tick(){
 if(!S.els.length||!S.els[0].el.isConnected){ clearInterval(S.tick); S.tick=0; S.cur=null; return; }
 const rm=RM(); S.els.forEach(f=>{ f.el.classList.toggle('still',rm); const t=f.el.querySelector('.ts'); if(t&&!document.hidden) t.textContent=clock(); });
 if(S.cur){ if(roccoBusy()||rm) S.cur.done(); return; } // Рокко ворует на поле — запись сразу возвращается к пустому кадру
 if(document.hidden||rm||Date.now()<S.next) return;
 if(roccoBusy()){ S.next=Date.now()+2000; return; }
 const ids=S.els.map(f=>f.id).filter(i=>i!==S.last), id=(ids.length?ids:S.els.map(f=>f.id))[Math.floor(Math.random()*(ids.length||S.els.length))];
 S.next=Date.now()+rnd(18000,42000); if(id) walk(id); }

window.CamFeeds={mount,plan};
window.bpCamFeeds={walk:(id,n)=>walk(id,n),state:()=>({cur:S.cur&&S.cur.id,last:S.last,inMs:Math.max(0,S.next-Date.now()),feeds:S.els.map(f=>f.id)}),geometry:()=>S.plans&&S.plans.map(p=>({id:p.id,w:p.w,h:p.h,quad:p.quad,contour:p.contour})),stop:()=>{ S.next=Date.now()+1e9; }};
})();
