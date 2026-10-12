/* Фон поля «Праздничный стол» (вариант K1/K2 из field-styles.html).
   Рисует кодом (SVG, без картинок) то, на чём лежат символы: в зале и на кухне красная скатерть со строчкой (владелец 2026-10-10),
   запасной фон кухни — стальная столешница (?table=steel), в охране сукно на столе. Сетка 6×5 размечена только сгибами и швами, линий-таблицы нет.
   Ничего не двигается: символы падают поверх.
   Рамка поля лежит над скатертью (ui.css #field>.frm), скатерть режется по проёму (paint, только #cellgrid).

   Подключение (игра):
     <link rel="stylesheet" href="field-table.css">  и  <script src="field-table.js"></script>  (после ui.js нельзя, до него — можно)
     в buildLayer() (ui.js) сразу после  G.innerHTML=html; field.insertBefore(G,LAYER);  добавить одну строку:
       window.FieldTable&&FieldTable.paint(G,cs,gx2,gy2,scene);
   Вариант скатерти: 'light' (кремовая, K1, по умолчанию) или 'dark' (тёмная графитовая, K2) — пятый аргумент: {variant:'dark'}
   или адрес ?table=dark.

   Разделение клеток (владелец выбирает): opts.grid = 'none' (по умолчанию) | 'stitch' строчка | 'braid' тесьма | 'weave' узор ткани | 'relief' рельеф,
   или адрес ?grid=stitch. На стали (кухня) те же идеи рисуются металлом: точечная сварка, латунная полоса, гравировка, вмятины.

   FieldTable.render({cs,gx2,gy2,scene,variant,grid,aspect,id,boost}) -> {html,vars}   — чистая функция, только строки
     boost (по умолчанию 1) — во сколько раз утолщить все линии (stroke-width): на крошечных экранах, например демонстрациях приветствия (welcome.js, boost 1.6), строчка иначе тоньше пикселя
   FieldTable.paint(G,cs,gx2,gy2,scene,opts)                                 — вставляет результат в #cellgrid
   cs — массив из 30 клеток {l,t,w,h} в % поля (как в buildLayer); gx2, gy2 — полшага решётки в % поля;
   aspect — высота/ширина поля в пикселях (в игре 1727/2206).
   Единица внутри SVG — 1% ширины поля, поэтому всё масштабируется вместе с полем. */
(function(){
'use strict';
const f=n=>(+n).toFixed(2);
const rng=seed=>()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return((t^t>>>14)>>>0)/4294967296; };
const rgb=a=>`rgb(${a[0]},${a[1]},${a[2]})`;
const GRIDS=['none','stitch','braid','weave','relief'];
const mixc=(c,k)=>c.map(v=>Math.round(v*(1-k)));
const blur=(id,sd)=>`<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

/* Цвета. c — три тона заливки: свет лампы в центре, середина, тёмный край. S — свет лампы (RGB).
   hem — кайма, ink — тёмный тон складок, lit — светлый тон складок.
   Подобрано по палитре DESIGN.md: кремовая скатерть пожелтевшая и притемнённая (как столы на фоне зала), тёмная — холодный графит,
   чтобы красные символы читались; ржавчина и воск — теми же тонами, что стены и пол. */
const PAL={
 hall:{
  light:{kind:'cloth',c:[[134,116,100],[90,76,66],[28,22,20]],S:'255,196,108',hem:[134,44,32],ink:'14,6,4',lit:'255,236,214',stain:'118,50,28'},
  dark:{kind:'cloth',c:[[70,78,78],[43,49,50],[13,16,17]],S:'255,196,108',hem:[150,114,58],ink:'0,0,0',lit:'214,230,226',stain:'0,0,0'},

  // мутно-жёлтые потёртые скатерти (эскиз 2026-10-11, ?table=ochre|mustard|straw|smoke): тот же стол и строчка, другой цвет; worn — потёртости, thread — цвет нитки
  ochre:{kind:'cloth',worn:1,c:[[148,114,50],[100,74,30],[32,22,10]],S:'255,190,110',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'},
  mustard:{kind:'cloth',worn:1,c:[[128,110,44],[84,70,26],[26,22,8]],S:'255,200,120',hem:[110,34,26],ink:'20,14,2',lit:'240,230,160',stain:'54,44,10',thread:'118,34,26'},
  straw:{kind:'cloth',worn:1,c:[[156,136,92],[106,90,58],[34,28,18]],S:'255,200,130',hem:[110,34,26],ink:'26,18,8',lit:'255,240,200',stain:'90,60,24',thread:'126,40,30'},
  ochreD:{kind:'cloth',worn:1,halo:1,c:[[122,92,40],[82,60,24],[26,18,8]],S:'255,170,100',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'}, // охра темнее в центре + тёмный ореол у символов
  ochreB1:{kind:'cloth',worn:1,halo:1,c:[[138,104,44],[92,68,27],[29,20,9]],S:'255,180,105',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'}, // охра чуть ярче (эскиз 2026-10-11)
  ochreB2:{kind:'cloth',worn:1,halo:1,c:[[154,118,46],[104,78,30],[32,22,9]],S:'255,180,105',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'}, // ещё ярче и насыщеннее
  ochreB3:{kind:'cloth',worn:1,halo:1,c:[[168,130,50],[114,86,33],[34,24,10]],S:'255,180,105',hem:[110,34,26],ink:'26,14,4',lit:'255,232,170',stain:'70,40,12',thread:'124,36,28'},
  mustardD:{kind:'cloth',worn:1,halo:1,c:[[110,94,38],[74,62,22],[22,18,6]],S:'255,180,110',hem:[110,34,26],ink:'20,14,2',lit:'240,230,160',stain:'54,44,10',thread:'118,34,26'},
  smoke:{kind:'cloth',worn:2,c:[[138,110,58],[90,70,36],[28,20,10]],S:'255,186,110',hem:[110,34,26],ink:'22,12,4',lit:'250,220,160',stain:'64,36,12',thread:'214,190,140'},
  red:{kind:'cloth',c:[[110,31,26],[70,18,17],[30,6,7]],S:'255,150,104',hem:[196,180,138],ink:'8,1,1',lit:'255,170,140',stain:'10,2,2'}}, // красная скатерть «Праздничного стола» — выбор владельца 2026-10-10
 kitchen:{
  light:{kind:'steel',c:[[126,124,114],[80,78,72],[28,27,25]],S:'255,140,60',hem:[210,206,190],ink:'0,0,0',lit:'255,255,250',stain:'46,26,10'},
  dark:{kind:'steel',c:[[74,74,70],[46,46,43],[16,16,15]],S:'255,140,60',hem:[170,166,150],ink:'0,0,0',lit:'255,255,250',stain:'30,18,8'},

  // мутно-жёлтые потёртые скатерти (эскиз 2026-10-11, ?table=ochre|mustard|straw|smoke): тот же стол и строчка, другой цвет; worn — потёртости, thread — цвет нитки
  ochre:{kind:'cloth',worn:1,c:[[148,114,50],[100,74,30],[32,22,10]],S:'255,150,70',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'},
  mustard:{kind:'cloth',worn:1,c:[[128,110,44],[84,70,26],[26,22,8]],S:'255,150,70',hem:[110,34,26],ink:'20,14,2',lit:'240,230,160',stain:'54,44,10',thread:'118,34,26'},
  straw:{kind:'cloth',worn:1,c:[[156,136,92],[106,90,58],[34,28,18]],S:'255,150,70',hem:[110,34,26],ink:'26,18,8',lit:'255,240,200',stain:'90,60,24',thread:'126,40,30'},
  ochreD:{kind:'cloth',worn:1,halo:1,c:[[122,92,40],[82,60,24],[26,18,8]],S:'255,150,70',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'}, // охра темнее в центре + тёмный ореол у символов
  ochreB1:{kind:'cloth',worn:1,halo:1,c:[[138,104,44],[92,68,27],[29,20,9]],S:'255,150,70',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'}, // охра чуть ярче (эскиз 2026-10-11)
  ochreB2:{kind:'cloth',worn:1,halo:1,c:[[154,118,46],[104,78,30],[32,22,9]],S:'255,150,70',hem:[110,34,26],ink:'26,14,4',lit:'255,226,160',stain:'70,40,12',thread:'124,36,28'}, // ещё ярче и насыщеннее
  ochreB3:{kind:'cloth',worn:1,halo:1,c:[[168,130,50],[114,86,33],[34,24,10]],S:'255,150,70',hem:[110,34,26],ink:'26,14,4',lit:'255,232,170',stain:'70,40,12',thread:'124,36,28'},
  mustardD:{kind:'cloth',worn:1,halo:1,c:[[110,94,38],[74,62,22],[22,18,6]],S:'255,150,70',hem:[110,34,26],ink:'20,14,2',lit:'240,230,160',stain:'54,44,10',thread:'118,34,26'},
  smoke:{kind:'cloth',worn:2,c:[[138,110,58],[90,70,36],[28,20,10]],S:'255,150,70',hem:[110,34,26],ink:'22,12,4',lit:'250,220,160',stain:'64,36,12',thread:'214,190,140'},
  red:{kind:'cloth',c:[[110,31,26],[70,18,17],[30,6,7]],S:'255,140,60',hem:[196,180,138],ink:'8,1,1',lit:'255,170,140',stain:'10,2,2'}, // красная скатерть и на кухне (владелец 2026-10-10: фон как согласовали), свет от печи
  steel:{kind:'steel',c:[[86,84,78],[52,50,46],[24,23,21]],S:'255,140,60',hem:[190,186,170],ink:'0,0,0',lit:'255,255,250',stain:'46,26,10'}}, // запасной: стальная столешница (?table=steel)
 cameras:{
  light:{kind:'felt',c:[[92,102,88],[58,66,56],[20,24,20]],S:'150,235,195',hem:[190,198,170],ink:'0,4,2',lit:'220,240,220',stain:'0,0,0'},
  dark:{kind:'felt',c:[[54,62,58],[32,38,35],[11,14,12]],S:'150,235,195',hem:[150,160,140],ink:'0,4,2',lit:'200,224,210',stain:'0,0,0'}}
};
PAL.cameras.red=PAL.cameras.dark; ['ochre','mustard','straw','smoke','ochreD','mustardD','ochreB1','ochreB2','ochreB3'].forEach(k=>{ PAL.cameras[k]=PAL.cameras.dark; }); // в «Камерах» поле — мониторы, стол там не рисуется

const DEF='ochreB2'; // фон поля по умолчанию: мутно-жёлтая потёртая скатерть «охра» +2 ярче, с тёмным ореолом у символов (владелец 2026-10-11)
function render(o){
 const cs=o.cs, gx2=o.gx2, gy2=o.gy2, scene=PAL[o.scene]?o.scene:'hall', variant=PAL[scene][o.variant]?o.variant:DEF, AR=o.aspect>0?o.aspect:1727/2206, id=o.id||'ft', grid=GRIDS.includes(o.grid)?o.grid:'none';
 const boost=o.boost>0?+o.boost:1, P=PAL[scene][variant], hem=P.hem, R=rng(scene==='hall'?83:scene==='kitchen'?29:57), kind=P.kind;
 const gl=cs[0].l-gx2, gt=cs[0].t-gy2, gr=cs[5].l+cs[5].w+gx2, gb=cs[29].t+cs[29].h+gy2;
 const GW=gr-gl, GH=(gb-gt)*AR;
 const LC=cs.map(c=>({x:c.l-gl,y:(c.t-gt)*AR,w:c.w,h:c.h*AR}));
 const VX=[1,2,3,4,5].map(c=>cs[c].l-gx2-gl), HY=[1,2,3,4].map(r=>(cs[r*6].t-gy2-gt)*AR);
 const GAPX=2*gx2, GAPY=2*gy2*AR; // ширина и высота зазора между клетками
 const full=`width="${f(GW)}" height="${f(GH)}"`;
 const defs=`<radialGradient id="${id}P" cx=".5" cy=".34" r=".82"><stop offset="0" stop-color="${rgb(P.c[0])}"/><stop offset=".58" stop-color="${rgb(P.c[1])}"/><stop offset="1" stop-color="${rgb(P.c[2])}"/></radialGradient>${blur(id+'B',1.4)}${blur(id+'S',.3)}${blur(id+'W',.16)}${blur(id+'V',.55)}
  <radialGradient id="${id}D" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset=".6" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".10"/></radialGradient>`;
 let s=`<rect ${full} fill="url(#${id}P)"/>`;

 /* крупные мягкие неровности основы: светлее и темнее, без мелкого зерна */
 for(let i=0;i<9;i++){ const x=R()*GW,y=R()*GH,rx=6+R()*12,ry=3+R()*6,a=(R()-.5)*50,lite=i%2;
  s+=`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${lite?`rgba(${P.lit},.055)`:`rgba(${P.ink},.22)`}" transform="rotate(${f(a)} ${f(x)} ${f(y)})" filter="url(#${id}B)"/>`; }

 /* пятна по материалу */
 const blob=(x,y,rx,ry,col,filt)=>{ const n=6+((R()*3)|0); let d=''; for(let j=0;j<n;j++){ const a=j/n*6.283+R()*.6,k=.6+R()*.7; d+=(j?'L':'M')+f(x+Math.cos(a)*rx*k)+' '+f(y+Math.sin(a)*ry*k); } return `<path d="${d}Z" fill="${col}"${filt?` filter="url(#${filt})"`:''}/>`; };
 if(kind==='cloth'&&variant==='light'){ // ржавые и жёлтые потёки, как на скатертях в зале
  for(let i=0;i<11;i++) s+=blob(R()*GW,R()*GH,2.6+R()*6,1.8+R()*4,`rgba(${P.stain},${f(.20+R()*.14)})`,id+'V');
  for(let i=0;i<14;i++) s+=blob(R()*GW,R()*GH,.5+R()*1.3,.4+R()*.9,`rgba(${P.stain},${f(.26+R()*.16)})`,id+'W');
  for(let i=0;i<2;i++){ const x=GW*(.2+R()*.6),y=GH*(.25+R()*.5),rx=7+R()*5,ry=4+R()*3; s+=`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="rgba(60,26,10,.07)" stroke="rgba(70,32,14,.10)" stroke-width=".3" filter="url(#${id}W)"/>`; } // след от пролитого: кромка темнее
 } else if(kind==='cloth'&&P.worn){ // мутно-жёлтая, потёртая: вытертые светлые места, грязь к краям, бледные пятна — тихо, без мусора
  for(let i=0;i<7;i++) s+=blob(R()*GW,GH*(.15+R()*.7),4+R()*9,2.4+R()*5,`rgba(${P.lit},${f(.05+R()*.05)})`,id+'B'); // вытертые места
  for(let i=0;i<9;i++){ const e=R()<.5, x=e?(R()<.5?R()*GW*.18:GW*(1-R()*.18)):R()*GW, y=e?R()*GH:(R()<.5?R()*GH*.18:GH*(1-R()*.18)); s+=blob(x,y,4+R()*8,3+R()*5,`rgba(${P.ink},${f(.16+R()*.12)})`,id+'B'); } // грязь к краям
  for(let i=0;i<(P.worn>1?9:5);i++) s+=blob(R()*GW,R()*GH,1.6+R()*4.5,1.2+R()*3,`rgba(${P.stain},${f(.12+R()*.12)})`,id+'V'); // бледные пятна
  for(let i=0;i<40;i++){ const x=R()*GW,y=R()*GH,l=1+R()*3,a=R()*180; s+=`<path d="M${f(x)} ${f(y)}l${f(Math.cos(a)*l)} ${f(Math.sin(a)*l)}" stroke="rgba(${P.lit},${f(.05+R()*.06)})" stroke-width="${f(.08+R()*.1)}" stroke-linecap="round"/>`; } // мелкие потёртости ткани
 } else if(kind==='cloth'){ // тёмная: сырость и плесень, едва заметно
  for(let i=0;i<8;i++) s+=blob(R()*GW,R()*GH,3+R()*6,2+R()*3.5,`rgba(0,0,0,${f(.18+R()*.1)})`,id+'B');
  for(let i=0;i<4;i++) s+=blob(R()*GW,R()*GH,3+R()*4,1.6+R()*2,`rgba(150,176,150,.05)`,id+'B');
 } else if(kind==='steel'){
  for(let i=0;i<30;i++){ const y=R()*GH,x=R()*GW,l=14+R()*50; s+=`<path d="M${f(x)} ${f(y)}h${f(l)}" stroke="rgba(255,255,255,${f(.025+R()*.05)})" stroke-width="${f(.05+R()*.08)}"/>`; } // шлифовка
  for(let i=0;i<5;i++) s+=blob(R()*GW,R()*GH,3+R()*6,1.5+R()*3,`rgba(${P.stain},.28)`,id+'B');
  for(let i=0;i<4;i++) s+=blob(R()*GW,R()*GH,2+R()*5,1+R()*2.4,`rgba(238,232,214,.07)`,id+'B');
  for(let i=0;i<5;i++){ const x=R()*GW,y=R()*GH,r=.9+R()*1.5; s+=`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${id}D)"/>`; } // вмятины
 } else { // сукно: потёртости
  for(let i=0;i<8;i++) s+=blob(R()*GW,R()*GH,3+R()*7,1.6+R()*3,`rgba(${P.lit},.045)`,id+'B');
  for(let i=0;i<6;i++) s+=blob(R()*GW,R()*GH,3+R()*6,1.6+R()*2.6,`rgba(0,0,0,.22)`,id+'B');
 }

 /* лёгкая помятость ткани: широкие мягкие складки, чтобы сетка сгибов не читалась как таблица */
 if(kind!=='steel') for(let i=0;i<12;i++){ const x=R()*GW,y=R()*GH,l=4+R()*8,a=(R()<.5?1:-1)*(10+R()*36)+(R()<.5?0:90), w=1.1+R()*1.5;
  s+=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"><path d="M${f(-l)} 0Q0 ${f((R()-.5)*3)} ${f(l)} 0" stroke="rgba(${P.ink},${f(.06+R()*.06)})" stroke-width="${f(w)}" fill="none" stroke-linecap="round" filter="url(#${id}V)"/></g>`; }

 /* сгибы / швы: мягкие ложбины по границам клеток, неровные, кусками разной силы (где-то почти стёрты), без одинаковых линий */
 const steel=kind==='steel';
 const seam=(vert,pos,len)=>{ const n=4+((R()*3)|0); const pts=[]; for(let i=0;i<=n;i++) pts.push([i/n*len,(R()-.5)*(steel?.1:.7)]);
  let o='';
  for(let i=0;i<n;i++){ const a=pts[i],b=pts[i+1], k=R()<.3?.1+R()*.2:(steel?.4+R()*.5:.55+R()*.55);
   const P1=t=>vert?`${f(pos+t[1])} ${f(t[0])}`:`${f(t[0])} ${f(pos+t[1])}`;
   const d=`M${P1(a)}Q${P1([(a[0]+b[0])/2,(a[1]+b[1])/2+(R()-.5)*.4])} ${P1(b)}`;
   const sh=vert?'translate(.2 0)':'translate(0 .2)', hi=vert?'translate(-.5 0)':'translate(0 -.5)';
   o+=`<path d="${d}" stroke="rgba(${P.ink},${f((steel?.40:.46)*k)})" stroke-width="${steel?.5:1.35}" fill="none" stroke-linecap="round" filter="url(#${id}${steel?'S':'V'})" transform="${sh}"/>`
    +`<path d="${d}" stroke="rgba(${P.lit},${f((steel?.22:.17)*k)})" stroke-width="${steel?.2:.5}" fill="none" stroke-linecap="round" filter="url(#${id}W)" transform="${hi}"/>`; }
  return o; };
 if(kind!=='cloth'&&grid==='none'){ // на скатерти сгибов нет (владелец 2026-10-10: «это тоже убери»); у стали и сукна швы остаются
 VX.forEach(x=>{ s+=seam(true,x,GH); }); HY.forEach(y=>{ s+=seam(false,y,GW); });
 VX.forEach(x=>HY.forEach(y=>{ s+=`<circle cx="${f(x)}" cy="${f(y)}" r="1.9" fill="rgba(${P.ink},.16)" filter="url(#${id}B)"/>`; })); } // где два сгиба пересеклись, ткань собрана

 /* кайма по краю */
 const E=.3, bw=.62;
 if(kind==='cloth'){ // кайма убрана (владелец 2026-10-10)
 } else if(kind==='steel'){
  s+=`<rect x=".28" y=".28" width="${f(GW-.56)}" height="${f(GH-.56)}" rx=".4" fill="none" stroke="rgba(255,255,250,.2)" stroke-width=".18"/><rect x=".55" y=".55" width="${f(GW-1.1)}" height="${f(GH-1.1)}" rx=".3" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".14"/>`;
 } else {
  s+=`<rect x=".6" y=".6" width="${f(GW-1.2)}" height="${f(GH-1.2)}" rx=".5" fill="none" stroke="${rgb(hem)}" stroke-opacity=".42" stroke-width=".16" stroke-dasharray=".55 .4"/>`;
 }

 /* разделение клеток: тихое, внутри зазоров между клетками (символы закрывают ~90% клетки, поэтому всё уже ~1 единицы) */
 let xdefs='';
 if(grid!=='none'){
  const D=rng(scene==='hall'?311:scene==='kitchen'?313:317), jt=a=>(D()-.5)*2*a, metal=kind==='steel';
  const seams=[...VX.map(x=>[true,x,GH]),...HY.map(y=>[false,y,GW])];
  const pt=(vert,pos,t,off)=>vert?`${f(pos+off)} ${f(t)}`:`${f(t)} ${f(pos+off)}`;
  const line=(vert,pos,len)=>vert?`M${f(pos)} 0V${f(len)}`:`M0 ${f(pos)}H${f(len)}`;
  const nodes=[]; VX.forEach(x=>HY.forEach(y=>nodes.push([x,y])));
  const groove=(w,a)=>{ let d=''; seams.forEach(([v,pos,len])=>{ d+=line(v,pos,len); }); return `<path d="${d}" fill="none" stroke="rgba(${P.ink},${a})" stroke-width="${w}" filter="url(#${id}V)"/>`; };
  const lip=(w,a)=>{ let d=''; seams.forEach(([v,pos,len])=>{ d+=line(v,pos,len); }); return `<path d="${d}" fill="none" stroke="rgba(${P.lit},${a})" stroke-width="${w}" transform="translate(.5 .5)" filter="url(#${id}W)"/>`; };
  if(grid==='stitch'){
   // прошивка: ровный стежок вдоль шва, чуть неровный, с тенью от вдавленной ткани; в узлах крестик
   const thread=metal?'208,208,200':(P.thread||'228,212,178'), A=['','',''], sh=[];
   seams.forEach(([v,pos,len])=>{ const nd=v?HY:VX; let t=.8+D()*.8; while(t<len-.5){ if(!nd.some(n=>Math.abs(t-n)<1.25)){ const l=.85+D()*.42, off=jt(.08), tilt=jt(.1), d=`M${pt(v,pos,t-l/2,off)}L${pt(v,pos,t+l/2,off+tilt)}`; A[(D()*3)|0]+=d; sh.push(d); } t+=1.5+jt(.2); } });
   if(metal){ // кухня: точечная сварка, ряд маленьких точек над канавкой листов
    let dots='',dsh=''; seams.forEach(([v,pos,len])=>{ const nd=v?HY:VX; for(let t=.9+D()*.6;t<len-.4;t+=1.5){ if(nd.some(n=>Math.abs(t-n)<1.0)) continue; const c=v?[pos+jt(.03),t]:[t,pos+jt(.03)]; dots+=`M${f(c[0])} ${f(c[1])}h.01`; dsh+=`M${f(c[0]+.08)} ${f(c[1]+.11)}h.01`; } });
    s+=groove(.55,.42)+lip(.22,.20)+`<g fill="none" stroke-linecap="round"><path d="${dsh}" stroke="rgba(0,0,0,.5)" stroke-width=".4"/><path d="${dots}" stroke="rgba(232,232,226,.5)" stroke-width=".34"/></g>`;
   } else {
    let x='',xs=''; nodes.forEach(([nx,ny])=>{ const a=.5+jt(.06), d=`M${f(nx-a)} ${f(ny-a)}L${f(nx+a)} ${f(ny+a)}M${f(nx-a)} ${f(ny+a)}L${f(nx+a)} ${f(ny-a)}`; x+=d; });
    s+=groove(1.05,.34)+lip(.32,.10)
     +`<g fill="none" stroke-linecap="round"><path d="${sh.join('')}${x}" stroke="rgba(0,0,0,.5)" stroke-width=".26" transform="translate(.07 .1)"/><path d="${A[0]}" stroke="rgb(${thread})" stroke-opacity=".4" stroke-width=".2"/><path d="${A[1]}" stroke="rgb(${thread})" stroke-opacity=".58" stroke-width=".2"/><path d="${A[2]}" stroke="rgb(${thread})" stroke-opacity=".74" stroke-width=".2"/><path d="${x}" stroke="rgb(${thread})" stroke-opacity=".62" stroke-width=".2"/></g>`;
   }
  } else if(grid==='braid'){
   // тесьма: плоская выцветшая латунная лента с плетением «ёлочкой», в узлах латунные шурупы; матовая, без бликов
   const w=metal?.8:.88, hw=w/2-.1, bc=metal?[136,128,102]:[128,98,48], edge=metal?'52,46,32':'54,34,12'; let L='',T=[ '','','' ],T2='';
   seams.forEach(([v,pos,len])=>{ L+=line(v,pos,len); for(let t=.2;t<len;t+=.56){ const d=v?`M${f(pos-hw)} ${f(t+.3)}L${f(pos)} ${f(t)}L${f(pos+hw)} ${f(t+.3)}`:`M${f(t+.3)} ${f(pos-hw)}L${f(t)} ${f(pos)}L${f(t+.3)} ${f(pos+hw)}`; T[(D()*3)|0]+=d; T2+=d; } });
   s+=`<path d="${L}" fill="none" stroke="rgba(0,0,0,.42)" stroke-width="${f(w+.25)}" filter="url(#${id}S)" transform="translate(.1 .16)"/>`
    +`<g fill="none" opacity=".8"><path d="${L}" stroke="rgb(${edge})" stroke-width="${f(w+.02)}"/><path d="${L}" stroke="${rgb(bc)}" stroke-width="${f(w-.16)}"/>`
    +`<path d="${T2}" stroke="rgba(214,178,104,.26)" stroke-width=".08" transform="translate(0 .13)"/>`
    +`<path d="${T[0]}" stroke="rgba(${edge},.30)" stroke-width=".11"/><path d="${T[1]}" stroke="rgba(${edge},.44)" stroke-width=".11"/><path d="${T[2]}" stroke="rgba(${edge},.58)" stroke-width=".11"/></g>`;
   let b=''; nodes.forEach(([nx,ny])=>{ const a=D()*1.5; b+=`<circle cx="${f(nx+.12)}" cy="${f(ny+.16)}" r="1.0" fill="rgba(0,0,0,.45)"/><circle cx="${f(nx)}" cy="${f(ny)}" r=".96" fill="rgb(${edge})"/><circle cx="${f(nx)}" cy="${f(ny)}" r=".84" fill="${rgb(mixc(bc,.04))}"/><circle cx="${f(nx)}" cy="${f(ny)}" r=".56" fill="none" stroke="rgba(${edge},.5)" stroke-width=".1"/><path d="M${f(nx-.4*Math.cos(a))} ${f(ny-.4*Math.sin(a))}l${f(.8*Math.cos(a))} ${f(.8*Math.sin(a))}M${f(nx+.4*Math.sin(a))} ${f(ny-.4*Math.cos(a))}l${f(-.8*Math.sin(a))} ${f(.8*Math.cos(a))}" stroke="rgba(${edge},.85)" stroke-width=".14" stroke-linecap="round"/>`; });
   s+=b;
  } else if(grid==='weave'){
   // вытканный узор «окно»: тонкие двойные кремовые линии, выцветшие и местами стёртые; только линии, залитых квадратов нет
   const lc=metal?'210,210,202':'232,210,178'; let band='', out='';
   seams.forEach(([v,pos,len])=>{ band+=line(v,pos,len); let t=-2; while(t<len){ const l=8+D()*16, op=[.8,.8,.55,.34,.12][(D()*5)|0], t1=Math.min(len,t+l); t+=l;
     if(op>0) for(const off of [-.34,.34]){ const k=f(op*(.8+D()*.4)), d=`M${pt(v,pos,Math.max(0,t-l),off)}L${pt(v,pos,t1,off)}`;
      out+=metal?`<path d="${d}" stroke="rgba(0,0,0,${k})" stroke-width=".16"/><path d="${d}" stroke="rgba(255,255,250,${f(k*.8)})" stroke-width=".11" transform="translate(.12 .12)"/>`:`<path d="${d}" stroke="rgb(${lc})" stroke-opacity="${k}" stroke-width=".13"/>`; } } });
   s+=`<path d="${band}" fill="none" stroke="rgba(${P.lit},.065)" stroke-width="1.3" filter="url(#${id}V)"/><g fill="none" stroke-linecap="butt">${out}</g>`;
  } else if(grid==='relief'){
   // рельеф: клетки чуть вдавлены, как скатерть, натянутая на решётку: мягкая тень по краям и светлая кромка снизу; линий нет
   let cl='',ins='',rim='',bars='';
   LC.forEach((c,i)=>{ const r=`x="${f(c.x)}" y="${f(c.y)}" width="${f(c.w)}" height="${f(c.h)}" rx=".55"`;
    cl+=`<clipPath id="${id}c${i}"><rect ${r}/></clipPath>`;
    ins+=`<g clip-path="url(#${id}c${i})"><rect ${r} fill="none" stroke="rgba(${P.ink},${metal?.42:.44})" stroke-width="2" filter="url(#${id}R)"/><path d="M${f(c.x)} ${f(c.y)}H${f(c.x+c.w)}" stroke="rgba(${P.ink},.26)" stroke-width="1.3" fill="none" filter="url(#${id}R)"/></g>`;
    rim+=`M${f(c.x+.5)} ${f(c.y+c.h-.1)}H${f(c.x+c.w-.5)}`; });
   seams.forEach(([v,pos,len])=>{ bars+=line(v,pos,len); });
   xdefs+=cl+blur(id+'R',.7);
   s+=`<path d="${bars}" fill="none" stroke="rgba(${P.lit},.05)" stroke-width="${f(GAPX*.9)}" filter="url(#${id}V)"/>`+ins+`<path d="${rim}" fill="none" stroke="rgba(${P.lit},${metal?.2:.15})" stroke-width=".16" stroke-linecap="round"/>`;
  }
 }

 /* мелочи: реже и тише, чтобы не спорить с символами; лежат по сгибам и краям, где клетки их не закрывают */
 const nearSeam=()=>{ const v=R()<.5; return v?[VX[(R()*5)|0]+(R()-.5)*2.2,R()*GH]:[R()*GW,HY[(R()*4)|0]+(R()-.5)*2.2]; };
 if(scene==='hall'){
  // конфетти, воск и следы от стаканов убраны (владелец 2026-10-10): чистая скатерть, только свет и пятна
 } else if(scene==='kitchen'){
  if(kind==='steel') for(let i=0;i<14;i++){ const [x,y]=nearSeam(); s+=`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(.2+R()*.45)}" ry="${f(.1+R()*.2)}" fill="rgba(140,66,26,.26)"/>`; } // ржавые точки
 } else {
  for(let k=0;k<2;k++){ const x=k?GW+.5:-.5,y=GH*(k?.78:.2),w=8,h=10,a=k?11:-14; let l=''; for(let j=0;j<5;j++) l+=`<path d="M${f(-w/2+.8)} ${f(-h/2+1.4+j*h/6.2)}h${f(w-1.6-R()*3)}" stroke="rgba(40,40,36,.3)" stroke-width=".16"/>`;
   s+=`<g transform="translate(${f(x)} ${f(y)}) rotate(${a})" opacity=".4"><rect x="${f(-w/2+.2)}" y="${f(-h/2+.3)}" width="${w}" height="${h}" fill="rgba(0,0,0,.5)"/><rect x="${f(-w/2)}" y="${f(-h/2)}" width="${w}" height="${h}" fill="rgb(150,148,128)"/>${l}</g>`; } // бумаги выглядывают из-за края
  for(let i=0;i<2;i++){ const [x,y]=nearSeam(); s+=`<circle cx="${f(x)}" cy="${f(y)}" r="1.5" fill="none" stroke="rgba(20,10,4,.4)" stroke-width=".22"/>`; }
 }

 /* свет: лампа над столом и тень по краям; клетки перекрывать нельзя, поэтому слои прозрачные */
 const overlay=`<div class="ft-pool"></div>${scene==='kitchen'?'<div class="ft-oven"></div>':''}<div class="ft-vig"></div>`;
 if(boost!==1) s=s.replace(/stroke-width="([\d.]+)"/g,(m,w)=>`stroke-width="${f(w*boost)}"`); // утолщение всех линий (boost)
 return {html:`<svg viewBox="0 0 ${f(GW)} ${f(GH)}" preserveAspectRatio="none" aria-hidden="true"><defs>${defs}${xdefs}</defs>${s}</svg>`+overlay, vars:`--ft-s:${P.S}`};
}

function paint(G,cs,gx2,gy2,scene,opts){
 if(!G||!cs||cs.length<30) return false;
 opts=opts||{};
 const field=G.parentElement, w=field&&field.offsetWidth, h=field&&field.offsetHeight;
 let variant=opts.variant; if(!variant){ try{ variant=new URLSearchParams(location.search).get('table')||DEF; }catch(e){ variant=DEF; } } // по умолчанию — охра с правкой (владелец 2026-10-11); прежняя красная — ?table=red; ?table=light|dark — запасные
 let grid=opts.grid; if(!grid){ try{ grid=new URLSearchParams(location.search).get('grid')||'stitch'; }catch(e){ grid='stitch'; } } // в игре — «строчка» (выбор владельца 2026-10-10); ?grid=none|braid|weave|relief — запасные
 const out=render({cs,gx2,gy2,scene,variant,grid,aspect:w&&h?h/w:0,id:opts.id||'ft'});
 G.classList.add('ft','ft-'+scene);
 /* Скатерть ложится ровно в проём рамки (владелец 2026-10-11: «фон слота выходит за рамки, а должен чётко по контуру лежать»).
    Игровой #cellgrid (ui.js buildLayer) = проём: область клеток, она же внутренний край кольца рамки (ui.css #field>.frm лежит НАД скатертью). Сама ткань и её свет шире проёма на полшага решётки (--ft-ox, --ft-oy — доля проёма):
    лишнее уходит под кольцо рамки, а обрезка clip-path — проём +2 px — страхует стык без щели при любом размере и DPR и работает, пока картинка рамки ещё грузится (иначе ткань выглядывала бы на кольцо).
    У эскизов (hud-light.html, wins.html) контейнер = вся ткань и своя вёрстка рамки: им ничего этого не нужно. */
 if(G.id==='cellgrid'){ const gl=cs[0].l-gx2, gr=cs[5].l+cs[5].w+gx2, gt=cs[0].t-gy2, gb=cs[29].t+cs[29].h+gy2;
  G.classList.add('ft-bleed'); G.style.setProperty('--ft-ox',(gx2/(gr-gl-2*gx2)*100).toFixed(3)+'%'); G.style.setProperty('--ft-oy',(gy2/(gb-gt-2*gy2)*100).toFixed(3)+'%'); G.style.clipPath='inset(-2px)'; }
 { const P=PAL[PAL[scene]?scene:'hall'][variant]; if(field) field.toggleAttribute('data-ft-halo',!!(P&&P.halo)); } // на светлой скатерти символам нужен тёмный ореол, иначе золото сливается с тканью
 G.style.setProperty('--ft-s',out.vars.slice(7));
 G.innerHTML=out.html;
 return true;
}

window.FieldTable={render,paint,palette:PAL,grids:GRIDS};
})();
