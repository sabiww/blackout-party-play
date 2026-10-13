// Blackout Party — звуковой движок макета (Web Audio). Макет, не игра.
// Подключение: <script src="audio.js"></script> в <head> (рядом с scene-trans.js). Без манифестов и файлов всё молча ничего не делает: игра работает без звука.
// Файлы: assets/audio/manifest-music.json?bpv=cbb50baf, manifest-sfx.json и папки music/ sfx/ (форматы манифестов — в docs/AUDIO.md). Пути в манифестах без расширения:
// берём .ogg (Opus), если браузер его играет, иначе .m4a. Буфер декодируем только когда он впервые нужен (+ небольшая подгрузка набора текущей сцены).
//
// Звук включается на первый жест игрока (PLAY на приветствии, любой клик, любая клавиша); до него ничего не играет и AudioContext не создаётся.
// Меню игры: SOUND ON/OFF = GS.mute, MUSIC % = GS.music, EFFECTS % = GS.sfx (ui.js, window.bpTime.GS); движок следит за ними сам (ui.js save() + опрос раз в 250 мс).
// SOUND OFF: звук гаснет за ~0,1 с, контекст приостанавливается, файлы не качаются; музыка (манифест и файлы) не качается и до первого жеста. Вкладка скрыта: контекст приостановлен (музыка продолжится с того же места).
//
// API (window.bpAudio):
//   play(событие, {flavour, i, pan, db, delay, force, jitter})  — эффект; true, если поставлен в очередь звучать. Событие вида spin.start (список — EVENTS ниже и в манифесте).
//   scene('welcome'|'hall'|'kitchen'|'cameras') — музыка и атмосфера сцены (равномощный кроссфейд 2 с). leave() — перед уходом со страницы (занавес): музыка гаснет.
//   Музыка — «одна механика» (владелец 2026-10-12): категории манифеста hall (зал и приветствие — одна общая спокойная дорожка), bonus (Кухня и Камеры — одна общая дорожка бонуса),
//   camlayer (необязательный тихий слой напряжения: играет поверх дорожки бонуса ТОЛЬКО в Камерах, свой уровень, по умолчанию −8 дБ к музыке), bigwin и maxwin (стинги). Старые ключи манифеста
//   welcome / kitchen / cameras сливаются в hall / bonus при загрузке. Переход Кухня → Камеры с той же дорожкой не перезапускает её.
//   bigwin(isMax) / bigwinEnd() — музыка сцены тише на 8 дБ (слой вместе с ней), играет стинг bigwin / maxwin; потом громкость возвращается.
//   tracks(сцена или категория) / pickMusic(сцена или категория,id) / pickLayer(id|'off') / flavour() / flavourKeys() / setFlavour(ключ вкуса | null — вернуть умолчания) / setEventFlavours({событие:вкус}) — выбор владельца. Умолчания (нет сохранённого выбора): manifest-music.json → default {категория:id}, manifest-sfx.json → defaultFlavour + defaultFlavours {событие:вкус}; выбор владельца (sessionStorage 'bp-snd'; старые выборы по сценам переносятся).
//   preview.* и state() — для звуковой доски (sound-board.html?bpv=abe1725e) и проверок.
// Журнал вызовов для проверок: window.__bpAudioTrace = [] до загрузки страницы — каждый play() допишет [событие, результат, мс].
(()=>{
'use strict';
if(window.bpAudio) return;

// ---------- пути ----------
const cs=document.currentScript, here=((cs&&cs.src)||'').split('?')[0];
const AB=(cs&&cs.getAttribute('data-audio'))||(/\/mockup\/[^\/]*$/.test(here)?'../assets/audio/':'assets/audio/');
const abs=p=>{ try{ return new URL(p,document.baseURI).href; }catch(e){ return p; } };
const ss={ get:k=>{ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set:(k,v)=>{ try{ sessionStorage.setItem(k,v); }catch(e){} } };
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dB=x=>Math.pow(10,x/20);

// ---------- каталог событий: описание для звуковой доски; f — частое (в Turbo/Quick/автоигре звучит один раз за спин) ----------
const EVENTS={
 'ui.click':['Нажатие кнопки на пульте или в окне'],
 'ui.open':['Открылось меню, список ставок или окно'],
 'ui.close':['Окно или меню закрылось'],
 'ui.bet_up':['Ставка стала больше'],
 'ui.bet_down':['Ставка стала меньше'],
 'ui.toggle':['Переключатель: скорость, автоигра'],
 'ui.buy':['Подтвердили покупку бонуса (кнопка BUY)'],
 'ui.error':['Не хватает баланса на ставку'],
 'ui.confirm':['Нажали CONTINUE на воротах бонуса или START в автоигре'],
 'ui.start':['Кнопка PLAY на экране приветствия'],
 'spin.start':['Нажали Play: старое поле уходит, начинается спин'],
 'spin.drop':['Колонка начинает падать (слева направо; в Turbo и автоигре — один звук за спин)','f'],
 'spin.land':['Колонка приземлилась (слева направо; в Turbo и автоигре — один звук за спин)','f'],
 'spin.stop':['Все символы встали на места'],
 'spin.skip':['Нажали Skip: домотали фазу, которая играла (одно нажатие — одна фаза)'],
 'scatter.land':['Приглашение упало на поле (1-е, 2-е, 3-е звучат по-разному)'],
 'scatter.anticipation':['Два приглашения уже лежат, остальные столбцы ещё падают: напряжённый цикл'],
 'scatter.trigger':['Хватило приглашений или мониторов: начинается бонус'],
 'win.cluster':['Выигрыш найден: янтарные уголки защёлкиваются на символах'],
 'win.amount':['Сумма выигрыша всплыла над символами'],
 'win.small':['Итог спина: маленький выигрыш (меньше 2× ставки)'],
 'win.medium':['Итог спина: средний выигрыш (от 2× до 5× ставки)'],
 'win.big':['Итог спина: крупный выигрыш (от 5× до 10× ставки; с 10× начинается шоу)'],
 'win.count_tick':['Тик, пока число в строке WIN считает вверх','f'],
 'win.end':['Итог спина озвучен: число досчитало'],
 'rocco.grab':['Рука Рокко хватает выигравшие символы (средний выигрыш)'],
 'rocco.swallow':['Рокко глотает выигравшие символы (мелкий выигрыш)'],
 'rocco.steal_whoosh':['Огромная лапа из-за нижней рамки сгребает крупный выигрыш'],
 'rocco.giggle':['Шалость Рокко в начале спина'],
 'rocco.cheer':['Рокко радуется после выигрыша'],
 'rocco.huge':['Рокко празднует очень крупный выигрыш'],
 'rocco.idle':['Рокко оживает в покое: машет, поправляет колпак'],
 'counter.step':['Счётчик множителя щёлкает на ступень выше'],
 'counter.reset':['Новый спин: счётчик множителя вернулся на ×1'],
 'counter.trick':['Счётчик дошёл до ступени с трюком: Подброс, Удар или Рубильник'],
 'toss.ticket':['Подброс: билет WILD вылетает из руки Рокко в клетку'],
 'wild.land':['WILD упал на поле вместе с остальными символами'],
 'wild.frame_on':['Удар: столбец обведён рамкой, WILD ждут выигрыша'],
 'punch.hit':['Кулак Рокко бьёт по правой рамке поля'],
 'punch.wave':['Удар: волна идёт по стеклу поля'],
 'punch.dent_pop':['Удар: рама прогибается, вмятина'],
 'lever.pull':['Рокко дёргает рубильник'],
 'lever.blackout':['Рубильник: свет на поле гаснет, идёт луч фонарика'],
 'lever.on':['Рубильник: свет возвращается'],
 'kitchen.enter':['Окно входа в «Кухню» (ворота бонуса)'],
 'kitchen.end':['Бонус «Кухня» закончился, итог'],
 'freespins.start':['Бесплатные спины начались (кнопка CONTINUE на воротах)'],
 'freespins.add':['Три новых приглашения: +5 бесплатных спинов'],
 'freespins.last':['Последний бесплатный спин'],
 'sack.intro':['Вход в «Кухню»: окошко SACK загорается'],
 'sack.coin_in':['Монетка прилетела в окошко SACK','f'],
 'sack.lamp_on':['Загорелась лампа мешка (кража из четырёх)'],
 'sack.dump':['Рокко достаёт мешок: четвёртая кража, мешок готов высыпаться'],
 'sack.coins_pour':['Монеты сыплются из мешка в строку WIN'],
 'sack.paid_again':['Надпись «SACK — PAID AGAIN»: мешок платит второй раз'],
 'sack.coin_clink':['Монета звякнула о поле при высыпании мешка (синтез кодом, сила — по скорости удара)','f'],
 'sack.coin_chink':['Монета влетела в строку WIN (синтез кодом, тихий «чинк», тон растёт к концу)','f'],
 'cams.enter':['Окно входа в «Камеры» (ворота бонуса)'],
 'cams.land':['Монитор с числом упал на поле'],
 'cams.restart':['Начался перезапуск «Камер» (экраны шипят помехами)'],
 'cams.monitor_lock':['Новый монитор защёлкнулся на стене','f'],
 'cams.respin_tick':['Перезапуск потрачен, нового монитора нет'],
 'cams.respin_reset':['Новый монитор: перезапуски снова 3'],
 'cams.rocco_step':['Рокко шагает на соседний экран'],
 'cams.double':['Число на мониторе удваивается'],
 'cams.full':['Заняты все 30 экранов: весь итог ×2'],
 'cams.total':['Числа летят в TOTAL, бонус кончается'],
 'bigwin.land':['Началось шоу большого выигрыша (10× ставки и больше): плашка падает на экран'],
 'bigwin.drum_tick':['Барабаны суммы в шоу крутятся (тик)','f'],
 'bigwin.tier_up':['Шоу переходит на новую главу: 10×, 25×, 50×, 100×'],
 'bigwin.lamp':['Загорелась лампа главы: 10×, 25×, 50×, 100× (четыре разных звука по порядку)'],
 'bigwin.end':['Счётчик шоу дошёл до итога'],
 'maxwin.hit':['Глава MAX WIN: свет гаснет, максимальный выигрыш']
};
const PFX_DESC={ui:'Интерфейс',spin:'Спин',scatter:'Приглашения',win:'Выигрыш',rocco:'Рокко',counter:'Счётчик множителя',toss:'Подброс WILD',wild:'WILD',punch:'Удар',lever:'Рубильник',kitchen:'Кухня',freespins:'Бесплатные спины',sack:'Мешок',cams:'Камеры',bigwin:'Большой выигрыш',maxwin:'Максимальный выигрыш'};
// Если нужного события нет в манифесте, берём ближайшее по смыслу (только когда точного нет)
const ALIAS={'ui.confirm':'ui.click','ui.start':'ui.click','ui.buy':'ui.click','ui.bet_up':'ui.click','ui.bet_down':'ui.click','ui.toggle':'ui.click','ui.close':'ui.open','win.big':'win.medium','win.medium':'win.small','win.end':'win.small',
 'bigwin.end':'win.end','maxwin.hit':'bigwin.land','bigwin.tier_up':'bigwin.land','cams.land':'spin.land','rocco.steal_whoosh':'rocco.grab'};
// Временно, до выбора владельца: события без своего звука играют ближайший по смыслу ГОТОВЫЙ звук (есть во всех наборах A–F). [звук, {db, delay, i}]; настоящий звук в манифесте с тем же id заменит подмену сам.
// Предел частоты и голоса считаются по самому событию (LIM[событие]), а не по звуку-подмене: win.amount не мешает sack.coin_in.
const PLACE={'win.cluster':['cams.monitor_lock',{db:-2}],'win.amount':['sack.coin_in',{db:-3}],'rocco.cheer':['bigwin.lamp.1',{db:-3}],'rocco.huge':['bigwin.lamp.4',{db:-3}],'rocco.giggle':['toss.ticket',{db:-4}],'rocco.idle':['cams.rocco_step',{db:-8}],
 'scatter.trigger':['freespins.add',{delay:250}],'counter.trick':['bigwin.tier_up',{db:-4,delay:150}],'freespins.start':['ui.buy',{}],'freespins.last':['sack.lamp_on',{i:1}],'kitchen.end':['cams.full',{}],
 'sack.intro':['sack.lamp_on',{i:0}],'cams.restart':['lever.blackout',{db:-4}],'cams.total':['sack.coins_pour',{}],'lever.on':['wild.frame_on',{db:-3}],'lever.flip':['ui.toggle',{db:-8}],'wild.land':['punch.hit',{db:-6}],'spin.skip':['ui.toggle',{}]};   // временно, до выбора владельца
const DUCK_EV={'kitchen.end':2.4,'cams.total':2.4};   // итог бонуса без шоу: музыка тише на это время, с
const FREQ=new Set(Object.keys(EVENTS).filter(k=>EVENTS[k][1]==='f'));
// Один и тот же эффект: не чаще cd мс и не больше voices голосов сразу (лишний голос вытесняет самый старый)
const LIM={'spin.land':{cd:40,voices:3},'spin.drop':{cd:40,voices:3},'spin.start':{cd:80,voices:1},'sack.coin_in':{cd:45,voices:4},'cams.monitor_lock':{cd:60,voices:3},'cams.respin_tick':{cd:80,voices:2},
 'win.cluster':{cd:140,voices:2},'win.amount':{cd:140,voices:2},'win.count_tick':{cd:55,voices:2},'win.end':{cd:200,voices:1},'ui.click':{cd:40,voices:2},'ui.bet_up':{cd:35,voices:2},'ui.bet_down':{cd:35,voices:2},
 'rocco.idle':{cd:4000,voices:1},'counter.step':{cd:140,voices:2},'toss.ticket':{cd:70,voices:3},'bigwin.drum_tick':{cd:70,voices:2},'bigwin.lamp':{cd:300,voices:2},'bigwin.tier_up':{cd:400,voices:1},'bigwin.land':{cd:800,voices:1},'maxwin.hit':{cd:800,voices:1},
 'sack.coins_pour':{cd:1500,voices:1},'sack.paid_again':{cd:800,voices:1},'lever.flip':{cd:60,voices:3},'wild.land':{cd:80,voices:3},'spin.skip':{cd:120,voices:1},'scatter.trigger':{cd:800,voices:1},'kitchen.end':{cd:800,voices:1},'cams.total':{cd:800,voices:1},'rocco.cheer':{cd:600,voices:1},'rocco.huge':{cd:800,voices:1},'rocco.giggle':{cd:600,voices:1}};
const LIM0={cd:30,voices:3,late:700};
// Что подгружаем заранее для сцены (все варианты выбранного набора)
const PRE_ALL=['ui.click','ui.open','ui.close','ui.bet_up','ui.bet_down','spin.start','spin.drop','spin.land','spin.stop','win.cluster','win.amount','win.small','win.medium','counter.step','rocco.swallow','rocco.grab'];
const PRE={welcome:['ui.start'],hall:['scatter.land.1','scatter.land.2','scatter.land.3','toss.ticket','punch.hit','punch.wave','punch.dent_pop','wild.frame_on','win.count_tick','counter.reset'],
 kitchen:['sack.coin_in','sack.lamp_on','sack.dump','sack.coins_pour','sack.paid_again','kitchen.enter','punch.hit','toss.ticket','wild.frame_on','rocco.steal_whoosh','win.count_tick'],
 cameras:['cams.monitor_lock','cams.rocco_step','cams.double','cams.respin_tick','cams.respin_reset','cams.enter','win.count_tick']};
const SCENES=['welcome','hall','kitchen','cameras'], STINGS=['bigwin','maxwin'];
const SCENE_NAME={welcome:'Приветствие',hall:'Зал',kitchen:'Кухня',cameras:'Камеры',bigwin:'Большой выигрыш',maxwin:'Максимальный выигрыш'};
// Музыка по «одной механике»: сцена → категория манифеста (hall: зал и приветствие; bonus: Кухня и Камеры); camlayer — слой только для Камер; bigwin / maxwin — стинги
const SCENE_CAT={welcome:'hall',hall:'hall',kitchen:'bonus',cameras:'bonus'};
const CATS=['hall','bonus','camlayer','bigwin','maxwin'];
const CAT_NAME={hall:'Зал и приветствие',bonus:'Бонус (Кухня и Камеры)',camlayer:'Слой Камер',bigwin:'Большой выигрыш',maxwin:'Максимальный выигрыш'};
const OLD_CAT={welcome:'hall',kitchen:'bonus',cameras:'bonus'};   // старые ключи манифеста и выбора владельца → новые
const catOf=x=>SCENE_CAT[x]||x;                                   // сцена или категория → категория
const LAYER_DB=-8, LAYER_DBS=[-8,-5,-3,-11,-14];                  // слой Камер: уровень относительно музыки, дБ (по умолчанию и шаги кнопки «Уровень слоя»)
const XF_SCENE=2, XF_PICK=.8;     // кроссфейд при смене сцены / при выборе дорожки вручную, с
const DUCK_DB=-8, DUCK_ATK=.02, DUCK_REL=.4;   // музыка под стингом и итогом бонуса: −8 дБ; постоянные времени setTargetAtTime: 95% за ~60 мс вниз (3·0,02) и за ~1,2 с вверх (3·0,4)
const TARGET_LUFS=-23;             // до этой громкости подтягиваем (или опускаем) каждую дорожку по полю lufs манифеста; ползунок MUSIC 100% = эта громкость (дорожки сделаны с −23, поэтому почти без изменений). Эффекты уже выровнены в файлах по категориям (ui −30 … стинг −20 LUFS): 100% = как в файле
const AMB_DB=-6;
const SFX_TRIM_DB=0;                // ОДИН общий подъём всех эффектов и атмосферы, дБ (поверх громкости в файлах и ползунка EFFECTS): короткие звуки сделаны на 4–10 дБ тише цели; игра кажется тихой — поднять здесь или ползунком «Подъём эффектов» (звуковая доска, «Экраны макета», тест-панель; запоминается в sessionStorage). Пики держит ограничитель
const TRIMS=[0,3,6,9,-3];           // шаги кнопки «Подъём эффектов» в панелях

// ---------- настройки владельца (sessionStorage) ----------
const PREF='bp-snd';
let pref={music:{},fl:null,fe:{},trim:0,layerDb:LAYER_DB}; try{ const p=JSON.parse(ss.get(PREF)||'null'); if(p&&typeof p==='object'){ pref.music=p.music&&typeof p.music==='object'?p.music:{}; pref.trim=isFinite(+p.trim)?clamp(+p.trim,-12,12):0; pref.fl=/^[A-Za-z0-9_-]{1,16}$/.test(p.fl||'')?p.fl:null; pref.fe=p.fe&&typeof p.fe==='object'&&!Array.isArray(p.fe)?p.fe:{}; pref.layerDb=p.layerDb!=null&&isFinite(+p.layerDb)?clamp(Math.round(+p.layerDb),-24,0):LAYER_DB; } }catch(e){}
// Вкусы эффектов: список и русские названия — из manifest-sfx.json, поле flavours — упорядоченный объект {ключ: название} (например {A:'Механика',…,D:'Вечеринка'}); порядок ключей = порядок кнопок.
// Нет поля — берём ключи-массивы из событий манифеста, нет и их — A, B, C. Сохранённый выбор (pref.fl), которого нет в списке, молча заменяется первым вкусом (в хранилище не трогаем: список мог ненадолго стать другим)
function flavKeys(){ const f=MS&&MS.flavours; if(f&&typeof f==='object'&&!Array.isArray(f)){ const k=Object.keys(f); if(k.length) return k; }
 const set=new Set(); if(MS&&MS.sfx) Object.keys(MS.sfx).forEach(id=>{ const e=MS.sfx[id]; if(e&&typeof e==='object') Object.keys(e).forEach(k=>{ if(Array.isArray(e[k])) set.add(k); }); });
 return set.size?[...set].sort():['A','B','C']; }
// Умолчания (без сохранённого выбора): manifest-sfx.json → defaultFlavour (общий вкус, 2026-10-12: E «Аниматроник») и defaultFlavours {событие: вкус} — исключения (выбор владельца, docs/SOUND-PICKS.md).
// Порядок: o.flavour вызова → pref.fe[событие] (выбор «Поставить в игру» на звуковой доске) → pref.fl (один вкус на всё, кнопка в тест-панели) → defaultFlavours[событие] → defaultFlavour → первый вкус.
// Нет файлов у выбранного вкуса — берём общий умолчательный, потом любой существующий (см. _play).
const okFl=f=>!!f&&flavKeys().includes(f);
const defFl=()=>{ const k=flavKeys(), d=MS&&MS.defaultFlavour; return k.includes(d)?d:k[0]; };
const curFl=()=>okFl(pref.fl)?pref.fl:defFl();
const flFor=id=>{ const k=flavKeys(); if(okFl(pref.fe&&pref.fe[id])) return pref.fe[id]; if(okFl(pref.fl)) return pref.fl; const d=MS&&MS.defaultFlavours&&MS.defaultFlavours[id]; return k.includes(d)?d:defFl(); };
const firstOf=e=>{ if(!e) return null; for(const k of flavKeys()){ if(Array.isArray(e[k])&&e[k].length) return e[k]; } return null; };   // первый непустой набор события (запасной, если у выбранного вкуса его нет)
const flavName=k=>{ const n=MS&&MS.flavours&&MS.flavours[k]; return typeof n==='string'?n:(n&&typeof n==='object'&&n.name)||''; };
const sfxMul=()=>dB(SFX_TRIM_DB+(pref.trim||0));
const savePref=()=>ss.set(PREF,JSON.stringify(pref));
// Старые выборы по сценам (welcome, kitchen, cameras) → категории: зал и приветствие делят hall (выбор зала главнее), Кухня и Камеры — bonus (выбор Кухни главнее). camlayer: id дорожки или 'off'
(()=>{ const m=pref.music; let ch=false;
 if('welcome' in m){ if(!m.hall) m.hall=m.welcome; delete m.welcome; ch=true; }
 if('kitchen' in m||'cameras' in m){ if(!m.bonus) m.bonus=m.kitchen||m.cameras; delete m.kitchen; delete m.cameras; ch=true; }
 if(ch) savePref(); })();

// ---------- громкости: из игры (GS) или, на отдельной странице, из sessionStorage 'bp-ui' (то же хранилище, что у игры) ----------
const GSo=()=>(window.bpTime&&window.bpTime.GS)||null;
function vol(){ const g=GSo(); if(g) return {mute:!!g.mute,music:+g.music>=0?+g.music:40,sfx:+g.sfx>=0?+g.sfx:60,speed:g.speed||'normal',hold:!!g.holdTurbo,auto:g.auto|0};
 let s={}; try{ s=JSON.parse(ss.get('bp-ui')||'{}')||{}; }catch(e){}
 return {mute:!!s.mute,music:+s.music>=0?+s.music:40,sfx:+s.sfx>=0?+s.sfx:60,speed:s.speed||'normal',hold:false,auto:0}; }
function setVol(p){ const g=GSo();
 if(g){ Object.assign(g,p); try{ window.bpTest&&window.bpTest.save&&window.bpTest.save(); }catch(e){} }
 else { let s={}; try{ s=JSON.parse(ss.get('bp-ui')||'{}')||{}; }catch(e){} Object.assign(s,p); ss.set('bp-ui',JSON.stringify(s)); }
 sync(); }
const curveM=v=>Math.pow(clamp(v,0,100)/100,1.35), curveS=v=>Math.pow(clamp(v,0,100)/100,1.2);   // ползунок → усиление: музыка 40% ≈ −11 дБ, эффекты 60% ≈ −5 дБ

// ---------- манифесты ----------
let MM=null, MS=null, manifestsDone=false; const readyCbs=[];
const OGG=(()=>{ try{ return !!document.createElement('audio').canPlayType('audio/ogg; codecs=opus'); }catch(e){ return false; } })();
const okJSON=r=>{ if(!r.ok) throw 0; return r.json(); };
// Манифест музыки: новые ключи (hall, bonus, camlayer, bigwin, maxwin) читаем как есть; старые welcome / kitchen / cameras (если остались) сливаются в hall / bonus в конец списка, одинаковые id не повторяются
function normMusic(src){ const out={};
 const add=(k,L)=>{ if(!Array.isArray(L)) return; const o=out[k]||(out[k]=[]); L.forEach(t=>{ if(t&&t.id&&t.file&&!o.some(x=>x.id===t.id)) o.push(t); }); };
 Object.keys(src).forEach(k=>{ if(!OLD_CAT[k]) add(k,src[k]); });
 Object.keys(OLD_CAT).forEach(k=>{ if(k in src) add(OLD_CAT[k],src[k]); });
 return out; }
const getJSON=name=>fetch(abs(AB+name),{cache:'no-cache'}).then(okJSON).catch(()=>null);
const setMusic=m=>{ if(m&&m.music&&typeof m.music==='object') MM=Object.assign({},m,{music:normMusic(m.music)}); };
// Музыку (манифест и файлы) не трогаем до первого жеста и пока SOUND OFF: список дорожек читаем, когда игрок нажал и звук включён (звуковая доска — сразу, ей нужен весь список)
let mmState=0;
function wantMusicManifest(){ if(mmState||MM) return; if(!window.__bpBoard&&(!unlocked||muted())) return; mmState=1;
 getJSON('manifest-music.json').then(m=>{ mmState=2; setMusic(m); if(MM){ renderNav(); preload(); if(live()) startScene(); } }); }
function loadManifests(){
 return Promise.all([window.__bpBoard?getJSON('manifest-music.json'):null,getJSON('manifest-sfx.json')]).then(([m,s])=>{
  setMusic(m); if(m) mmState=2;
  if(s&&s.sfx&&typeof s.sfx==='object'){ MS=s; if(s.packs) Object.keys(s.packs).forEach(f=>{ const pk=s.packs[f]; if(pk&&pk.file&&pk.clips) Object.keys(pk.clips).forEach(c=>{ packIdx[c]=[pk.file,+pk.clips[c][0],+pk.clips[c][1]]; }); }); }
  manifestsDone=true; readyCbs.splice(0).forEach(f=>{ try{ f(api); }catch(e){} }); flushPending(1500);
  preload(); wantMusicManifest(); if(live()) startScene(); }); }
function onReady(f){ if(manifestsDone){ try{ f(api); }catch(e){} } else readyCbs.push(f); }

// ---------- контекст и шины ----------
let ctx=null, master=null, limiter=null, musicBus=null, musicDuck=null, sfxBus=null, ambDuck=null;
let unlocked=false, hidden=document.hidden, unlockT=0, pendQ=[], suspendT=0;
const muted=()=>vol().mute;
const live=()=>!!(ctx&&unlocked&&ctx.state==='running'&&!hidden&&!muted());
function mkCtx(){
 const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
 try{ ctx=new AC({latencyHint:'interactive'}); }catch(e){ try{ ctx=new AC(); }catch(e2){ ctx=null; return false; } }
 master=ctx.createGain(); limiter=ctx.createDynamicsCompressor(); // запасной ограничитель: музыка + эффекты вместе не должны трещать
 limiter.threshold.value=-4; limiter.knee.value=6; limiter.ratio.value=14; limiter.attack.value=.004; limiter.release.value=.22;
 musicBus=ctx.createGain(); musicDuck=ctx.createGain(); sfxBus=ctx.createGain(); ambDuck=ctx.createGain();
 musicDuck.connect(musicBus); musicBus.connect(master); ambDuck.connect(sfxBus); sfxBus.connect(master); master.connect(limiter); limiter.connect(ctx.destination);
 const v=vol(); master.gain.value=v.mute?0:1; musicBus.gain.value=curveM(v.music); sfxBus.gain.value=curveS(v.sfx)*sfxMul();
 ctx.onstatechange=()=>{ if(ctx.state==='running'){ flushPending(); if(live()){ if(!M.cur) startScene(); preload(); } } };
 return true; }
function unlock(){
 if(!ctx&&!mkCtx()) return; if(!unlocked){ unlocked=true; unlockT=performance.now(); ss.set('bp-snd-u','1'); try{ const b=ctx.createBuffer(1,1,22050), s=ctx.createBufferSource(); s.buffer=b; s.connect(ctx.destination); s.start(0); }catch(e){} }
 reconcile(); wantMusicManifest(); }
// Жесты, которые браузер считает «пользователь нажал»: пока контекст не пошёл, пробуем снова на каждом
['pointerdown','mousedown','pointerup','touchend','keydown','click'].forEach(n=>addEventListener(n,()=>{ if(!muted()||!unlocked) unlock(); },{capture:true,passive:true}));
// Страница открыта переходом внутри игры (занавес): если игрок уже нажимал, браузер часто разрешает звук сразу — пробуем без ожидания жеста (получится — музыка новой сцены входит сама)
function tryEarly(){ if(unlocked||ss.get('bp-snd-u')!=='1'||muted()) return; if(!ctx&&!mkCtx()) return;
 ctx.resume().then(()=>{ if(ctx&&ctx.state==='running'&&!unlocked){ unlocked=true; unlockT=performance.now(); reconcile(); wantMusicManifest(); startScene(); preload(); flushPending(); } }).catch(()=>{}); }
addEventListener('DOMContentLoaded',()=>{ tryEarly(); setTimeout(tryEarly,800); setTimeout(tryEarly,2000); });
function reconcile(){
 if(!ctx) return; const want=unlocked&&!hidden&&!muted();
 if(want){ clearTimeout(suspendT); suspendT=0; if(ctx.state==='suspended'||ctx.state==='interrupted') ctx.resume().catch(()=>{}); }
 else if(ctx.state==='running'){ if(hidden){ clearTimeout(suspendT); suspendT=0; ctx.suspend().catch(()=>{}); }
  else if(!suspendT) suspendT=setTimeout(()=>{ suspendT=0; if(muted()&&ctx.state==='running') ctx.suspend().catch(()=>{}); },380); } } // при SOUND OFF сперва гаснет усиление (без щелчка), потом контекст замирает
document.addEventListener('visibilitychange',()=>{ hidden=document.hidden; reconcile(); });
// Громкости и «выключено»: сглаженно, без щелчков. Зовут ui.js (save) и опрос раз в 250 мс
let lastV={mute:false,music:-1,sfx:-1};
function sync(){
 const v=vol(), pv=lastV; lastV={mute:v.mute,music:v.music,sfx:v.sfx}; if(!ctx) return;
 if(pv.mute!==v.mute||pv.music!==v.music||pv.sfx!==v.sfx){
  const t=ctx.currentTime, to=(p,x,tc)=>{ try{ p.cancelScheduledValues(t); p.setTargetAtTime(x,t,tc); }catch(e){ p.value=x; } };
  to(master.gain,v.mute?0:1,.035); to(musicBus.gain,curveM(v.music),.05); to(sfxBus.gain,curveS(v.sfx)*sfxMul(),.05); }

 reconcile(); if(!v.mute) wantMusicManifest(); // SOUND ON после загрузки с выключенным звуком: список дорожек читаем только теперь
 if(live()&&((pv.music<=0&&v.music>0)||(pv.sfx<=0&&v.sfx>0))) startScene(); } // ползунок поднят с нуля — музыка и атмосфера включаются
setInterval(()=>{ if(!hidden) sync(); },250);

// Настройки в меню: сразу после нажатия/сдвига ползунка (не ждём опроса)
['click','input','change','keyup'].forEach(n=>addEventListener(n,()=>setTimeout(sync,0),true));
// Кнопки в окнах и меню: общий «клик» (пульт и важные кнопки озвучены в ui.js отдельно, закрытие окна — ui.close)
const NOSND='#pod,.x,.bp-x,.bu-x,.bp-chip,#bp-astart,#bp-buy,.btnplay,.plbtn,#bp-nav,#bp-test,#bp-sound-board,[data-nosnd]';
document.addEventListener('click',e=>{ const path=e.composedPath?e.composedPath():[e.target]; // окна F живут в shadow DOM: смотрим по пути события, а не по e.target
 const has=(n,sel)=>n&&n.matches&&n.matches(sel), t=path.find(n=>has(n,'button,[role=button],[role=switch],[role=radio],[role=checkbox],a[href]'));
 if(!t||t.disabled||path.some(n=>has(n,NOSND))||!path.some(n=>has(n,'.dlg,#bp-menu,#bp-bets,.bp-wrap,#fmenu,#ovl,#bp-big'))) return; play('ui.click'); },true);

// ---------- загрузка и декодирование (лениво) ----------
const bufs=new Map();   // путь без расширения → {p: Promise<AudioBuffer|null>, b: AudioBuffer|null}
const musicKeep=[];     // какие музыкальные буферы держим в памяти (последние 3: дорожка, слой Камер и стинг; файл в декодированном виде — десятки МБ)
const missing=new Set();
let dctx=null; // до первого жеста AudioContext создавать нельзя — файлы декодирует автономный контекст (буфер потом играет в обычном)
const decoder=()=>{ if(ctx) return ctx; if(!dctx){ try{ const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext; dctx=new OC(1,1,48000); }catch(e){ dctx=false; } } return dctx||null; };
function decode(ab){ return new Promise((res,rej)=>{ try{ const d=decoder(); if(!d) return rej(0); const p=d.decodeAudioData(ab,res,rej); if(p&&p.catch) p.catch(rej); }catch(e){ rej(e); } }); }
function fetchDecode(path){
 if(muted()) return Promise.resolve(null);   // SOUND OFF: больше ничего не качаем (не считается «нет файла»: после включения звука загрузится)
 const ex=['.aac.mp4','.ogg'];
 const at=i=>{ if(i>=ex.length){ missing.add(path); return Promise.resolve(null); }
  return fetch(abs(AB+path+ex[i])).then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(decode).catch(()=>at(i+1)); };
 return at(0); }
// Паки: в артефакте (tools/build_mockup_artifact.py) все клипы набора склеены в один файл на вкус — иначе не уложиться в лимит файлов. Манифест тогда содержит packs:{A:{file,clips:{путь:[начало,длительность]}}};
// клип нарезается из декодированного пака (пак декодируем один раз). В обычной папке паков нет — каждый звук отдельным файлом.
const packIdx={}, packBufs={};
const getPackBuf=pf=>packBufs[pf]||(packBufs[pf]=fetchDecode(pf));
function packSlice(path){ const [pf,t0,d]=packIdx[path]; let e=bufs.get(path); if(e) return e.p; e={b:null,p:null};
 e.p=getPackBuf(pf).then(pb=>{ if(!pb){ delete packBufs[pf]; bufs.delete(path); return null; } const dc=decoder(), sr=pb.sampleRate, a=Math.round(t0*sr), n=Math.max(1,Math.round(d*sr)), out=dc.createBuffer(pb.numberOfChannels,n,sr);
  for(let c=0;c<pb.numberOfChannels;c++) out.copyToChannel(pb.getChannelData(c).subarray(a,a+n),c); e.b=out; return out; }); bufs.set(path,e); return e.p; }
function getBuf(path,isMusic){
 if(!decoder()||!path||missing.has(path)) return Promise.resolve(null); if(packIdx[path]) return packSlice(path); let e=bufs.get(path);
 if(!e){ e={b:null,p:null}; e.p=fetchDecode(path).then(b=>{ e.b=b; if(!b) bufs.delete(path); return b; }); bufs.set(path,e);
  if(isMusic){ musicKeep.push(path); while(musicKeep.length>3){ const old=musicKeep.shift(); if(![M.cur,LY.cur,M.sting].some(t=>t&&t.path===old)) bufs.delete(old); } } }
 return e.p; }
const bufNow=path=>{ const e=bufs.get(path); return e&&e.b; };

// ---------- музыка ----------
const N=96, IN=new Float32Array(N), OUT=new Float32Array(N); for(let i=0;i<N;i++){ const t=i/(N-1); IN[i]=Math.sin(t*Math.PI/2); OUT[i]=Math.cos(t*Math.PI/2); } // равная мощность: sin/cos
const scaled=(c,k)=>{ const o=new Float32Array(c.length); for(let i=0;i<c.length;i++) o[i]=c[i]*k; return o; };
const M={cur:null,gen:0,sting:null,sgen:0}, AMB={cur:null,gen:0};
const LY={cur:null,gen:0,pend:null,pre:false,over:null};  // слой Камер: cur — играющий, pend — ждёт загрузки; pre — владелец слушает сочетание бонус + слой вне Камер; over — слой звуковой доски (не выбранный в игре)
let scn=null; // сцена, музыка которой должна играть
function listFor(x){ const L=MM&&MM.music&&MM.music[catOf(x)]; return Array.isArray(L)?L.filter(t=>t&&t.id&&t.file):[]; }   // x — сцена (welcome, hall, kitchen, cameras) или категория (hall, bonus, camlayer, bigwin, maxwin)
function defTrack(x){ const c=catOf(x), L=listFor(c), d=MM&&MM.default&&MM.default[c]; return L.find(t=>t.id===d)||L[0]||null; }   // умолчание категории: manifest-music.json → default {категория: id} (выбор владельца 2026-10-12, docs/SOUND-PICKS.md), иначе первая дорожка
function trackFor(x){ const c=catOf(x), L=listFor(c); if(!L.length) return null; if(c==='camlayer'&&pref.music.camlayer==='off') return null; return L.find(t=>t.id===pref.music[c])||defTrack(c); }   // слой Камер можно выключить ('off'); по умолчанию — первый в списке
function normOf(it){ const l=+it.lufs; return isFinite(l)&&it.lufs!=null?clamp(dB(TARGET_LUFS-l),.25,2):1; }
function loopOf(it,buf){ const L=it.loop; if(!L) return null; const a=+L.start||0, b=+L.end; if(!isFinite(b)||b<=a+.2) return null; const d=buf.duration; if(a>=d-.2) return null; return [Math.max(0,a),Math.min(b,d)]; }
function mkTrack(it,buf,o,dest){
 const t0=o.t0>ctx.currentTime?o.t0:ctx.currentTime+.04, s=ctx.createBufferSource(), g=ctx.createGain(), fo=ctx.createGain(); s.buffer=buf;
 const lp=o.once?null:loopOf(it,buf); if(lp){ s.loop=true; s.loopStart=lp[0]; s.loopEnd=lp[1]; } else if(!o.once){ s.loop=true; } // нет (или неверные) точки петли — крутим весь файл
 s.connect(g); g.connect(fo); fo.connect(dest);
 let off=+o.offset||0; if(off<0||off>=buf.duration-.05) off=0;
 const norm=(o.raw?1:normOf(it))*(o.level||1), xf=Math.max(.05,o.xf==null?XF_SCENE:o.xf);
 g.gain.setValueAtTime(0,t0); g.gain.setValueCurveAtTime(scaled(IN,norm),t0,xf);
 s.start(t0,off);
 const tr={it,path:it.file,s,g,fo,t0,off,lp,dur:buf.duration,norm,scene:o.scene||null,cat:o.cat||null,dying:false,once:!!o.once};
 s.onended=()=>{ try{ s.disconnect(); g.disconnect(); fo.disconnect(); }catch(e){} if(M.cur===tr) M.cur=null; if(LY.cur===tr) LY.cur=null; if(M.sting===tr){ M.sting=null; duck(false); } };
 return tr; }
function fadeOut(tr,xf,at){
 if(!tr||tr.dying) return; tr.dying=true; xf=Math.max(.05,xf); const t=Math.max(ctx.currentTime,at||0);
 try{ tr.fo.gain.cancelScheduledValues(0); tr.fo.gain.setValueAtTime(1,t); tr.fo.gain.setValueCurveAtTime(OUT,t,xf); tr.s.stop(t+xf+.08); }catch(e){ try{ tr.s.stop(); }catch(e2){} } }
// o.cat — категория дорожки (hall, bonus…): слой Камер ездит только на дорожке bonus. Та же дорожка уже играет (Кухня → Камеры, приветствие → зал) — не перезапускаем
function playTrack(it,o){
 o=o||{}; if(!it||!ctx) return Promise.resolve(false);
 if(M.cur&&M.cur.it===it&&!M.cur.dying&&!o.force&&!o.offset){ if(o.scene) M.cur.scene=o.scene; if(o.cat) M.cur.cat=o.cat; syncLayer(null,o.xf); return Promise.resolve(true); }
 const my=++M.gen;
 return whenLive().then(ok=>{ if(!ok) return null; const lit=o.cat==='bonus'&&layerCtx()?layerItem():null; return Promise.all([getBuf(it.file,true),lit?getBuf(lit.file,true):null]).then(r=>r[0]); }).then(buf=>{ if(!buf||my!==M.gen||!live()) return false; // слой грузим вместе с дорожкой: начинаются в один момент
  const old=M.cur, tr=mkTrack(it,buf,o,musicDuck); M.cur=tr; if(old) fadeOut(old,o.xf==null?XF_SCENE:o.xf,tr.t0); syncLayer(tr.t0,o.xf,true); return true; }); }
// Слой Камер: тихая петля напряжения поверх дорожки бонуса. Играет, пока идёт дорожка категории bonus и (сцена — Камеры или владелец слушает сочетание в панели / на доске); входит и выходит кроссфейдом
const layerItem=()=>LY.over||trackFor('camlayer');
const layerCtx=()=>scn==='cameras'||LY.pre||!!LY.over;
const layerOn=()=>{ const t=M.cur; return !!(t&&!t.dying&&t.cat==='bonus'&&layerCtx()); };
function syncLayer(at,xf,restart){ // at — момент старта новой дорожки (слой входит вместе с ней); restart — дорожка началась заново, слой тоже начинается с начала
 if(!ctx) return; xf=xf==null?XF_SCENE:xf; const it=layerOn()?layerItem():null;
 if(!it){ LY.gen++; LY.pend=null; const o=LY.cur; LY.cur=null; if(o) fadeOut(o,xf); return; }
 if(!restart&&(LY.pend===it||(LY.cur&&!LY.cur.dying&&LY.cur.it===it))) return;
 const my=++LY.gen; LY.pend=it;
 whenLive().then(ok=>ok&&getBuf(it.file,true)).then(buf=>{ if(my!==LY.gen) return; LY.pend=null; if(!buf||!live()||!layerOn()||layerItem()!==it) return;
  const base=M.cur; let off=0; // слой стартует вместе с дорожкой; если дорожка уже идёт — с той же позиции (по длине петли слоя), чтобы биты совпали
  if(!(at>ctx.currentTime)){ const p=pos(), lp=loopOf(it,buf), a=lp?lp[0]:0, len=lp?lp[1]-lp[0]:buf.duration; if(p&&base&&p.id===base.it.id&&len>1) off=a+((p.t-(base.lp?base.lp[0]:0)+.04)%len); }   // +0,04 с: слой стартует через 40 мс после этого вызова
  const tr=mkTrack(it,buf,{xf,level:dB(pref.layerDb),scene:'camlayer',cat:'camlayer',t0:at,offset:off},musicDuck);
  const old=LY.cur; LY.cur=tr; if(old) fadeOut(old,xf,tr.t0); }); }
// Контекст уже запущен — сразу; только что разблокирован (первый жест) — ждём, пока браузер его запустит (до 0,8 с)
function whenLive(){ if(live()) return Promise.resolve(true); if(!ctx||!unlocked||hidden||muted()) return Promise.resolve(false);
 return Promise.race([ctx.resume().catch(()=>{}).then(()=>live()),new Promise(r=>setTimeout(()=>r(false),800))]); }
function stopMusic(xf){ M.gen++; LY.pre=false; LY.over=null; const o=M.cur; M.cur=null; if(o&&ctx) fadeOut(o,xf==null?.4:xf); syncLayer(null,xf==null?.4:xf); }
function startScene(xf){
 if(!live()||!scn) return; const v=vol(); if(v.music>0){ const it=trackFor(scn); if(it) playTrack(it,{xf:xf==null?XF_SCENE:xf,scene:scn,cat:catOf(scn)}); } playAmb(scn); }
function setScene(sc){ if(!SCENES.includes(sc)) return; scn=sc; LY.pre=false; LY.over=null; startScene(); syncLayer(); preload(); navOpen.clear(); renderNav(); }
function resume(){ LY.pre=false; LY.over=null; startScene(XF_PICK); }   // «вернуть музыку сцены» (панель) и отмена ухода со страницы (scene-trans.js)
// Дорожка в петле: позиция воспроизведения (для звуковой доски)
function pos(){ const tr=M.cur; if(!tr||!ctx) return null; let t=tr.off+Math.max(0,ctx.currentTime-tr.t0);
 if(tr.lp&&t>tr.lp[1]){ const len=tr.lp[1]-tr.lp[0]; t=tr.lp[0]+((t-tr.lp[0])%len); } else if(!tr.lp&&!tr.once) t%=tr.dur; return {id:tr.it.id,t,dur:tr.dur,loop:tr.lp,scene:tr.scene}; }
// Причины приглушения (стинг шоу 'bw', итог бонуса 'ev'): музыка и атмосфера тихи, пока висит хоть одна; hold — сколько секунд держать (потом отпускаем сами)
const duckBy=new Set(), duckT={};
function duck(on,key,hold){ key=key||'bw'; clearTimeout(duckT[key]); delete duckT[key];
 if(on){ duckBy.add(key); if(hold>0) duckT[key]=setTimeout(()=>duck(false,key),hold*1000); } else duckBy.delete(key);
 if(!ctx) return; const d=duckBy.size>0, t=ctx.currentTime; const f=p=>{ try{ p.cancelScheduledValues(t); p.setTargetAtTime(d?dB(DUCK_DB):1,t,d?DUCK_ATK:DUCK_REL); }catch(e){} }; f(musicDuck.gain); f(ambDuck.gain); }
// Большой / максимальный выигрыш: стинг поверх, музыка сцены тише на 8 дБ; потом возвращается
function bigwin(isMax){
 if(!ctx||muted()) return; const kind=isMax?'maxwin':'bigwin', it=trackFor(kind);
 const my=++M.sgen; duck(true); if(!it||vol().music<=0){ return; } // музыка сцены приглушается под шоу и без файла стинга
 whenLive().then(ok=>ok&&getBuf(it.file,true)).then(buf=>{ if(!buf||my!==M.sgen||!live()){ if(my===M.sgen) duck(false); return; }
  if(M.sting) fadeOut(M.sting,.15);
  const L=it.loop, loops=!!(L&&+L.start>.3&&+L.end-+L.start>=3); // стинг играет один раз; в петле — только если в манифесте есть настоящая петля после вступления
  const tr=mkTrack(it,buf,{once:!loops,xf:.08,scene:kind,raw:true},musicBus); M.sting=tr; // стинги сведены громче музыки (−18 LUFS): уровень файла не трогаем
  if(loops) setTimeout(()=>{ if(M.sting===tr) fadeOut(tr,1.2); },40000); }); }
function bigwinEnd(){ M.sgen++; if(M.sting&&ctx) fadeOut(M.sting,.6); M.sting=null; duck(false); }
function leave(){ // уходим со страницы: музыка, слой и атмосфера гаснут за время занавеса
 M.gen++; AMB.gen++; M.sgen++; LY.gen++; LY.pend=null; if(!ctx) return; Object.keys(loops).forEach(k=>stopLoop(k,.2)); const o=M.cur, a=AMB.cur, s=M.sting, l=LY.cur; M.cur=AMB.cur=M.sting=LY.cur=null; fadeOut(o,.9); fadeOut(a,.9); fadeOut(s,.5); fadeOut(l,.9); }
// Атмосфера сцены: тихая петля
function ambFile(sc){ const e=MS&&MS.amb&&MS.amb[sc]; if(!e) return null; const f=curFl(); if(e[f]) return e[f]; for(const k of flavKeys()) if(e[k]) return e[k]; return null; }
function playAmb(sc){ if(!live()||vol().sfx<=0) return; const f=ambFile(sc); if(f) ambStart(f,sc); }
function ambStart(f,sc){
 if(AMB.cur&&AMB.cur.path===f&&!AMB.cur.dying) return; const my=++AMB.gen;
 return whenLive().then(ok=>ok&&getBuf(f)).then(buf=>{ if(!buf||my!==AMB.gen||!live()) return;
  const t0=ctx.currentTime+.04, s=ctx.createBufferSource(), g=ctx.createGain(), fo=ctx.createGain(); s.buffer=buf; s.loop=true; s.connect(g); g.connect(fo); fo.connect(ambDuck);
  const k=dB(AMB_DB+((MS.gain&&MS.gain['amb.'+sc])||0)); g.gain.setValueAtTime(0,t0); g.gain.setValueCurveAtTime(scaled(IN,k),t0,XF_SCENE); s.start(t0,Math.random()*buf.duration*.5);
  const tr={path:f,s,g,fo,dying:false}; s.onended=()=>{ try{ s.disconnect(); g.disconnect(); fo.disconnect(); }catch(e){} if(AMB.cur===tr) AMB.cur=null; };
  const old=AMB.cur; AMB.cur=tr; fadeOut(old,XF_SCENE); }); }

// ---------- эффекты ----------
const lastW={}, lastI={}, played={}, voices={}, fileT={}, loops={}; // loops — идущие циклы эффектов (scatter.anticipation)
let seq=0;
function resolve(ev){ if(!MS||!MS.sfx) return null; let id=ev; for(let n=0;n<3&&id;n++){ const e=MS.sfx[id]; if(firstOf(e)) return id; id=ALIAS[id]; } return null; }
// «scatter.land.2» без отдельного id в манифесте = второй файл «scatter.land» (порядковые звуки: приглашения, лампы глав)
function ordered(ev,o){ const m=/^(.+)\.(\d)$/.exec(ev); if(m&&!(MS&&MS.sfx&&MS.sfx[ev])&&MS&&MS.sfx&&MS.sfx[m[1]]){ o.i=+m[2]-1; return m[1]; } return ev; }
function flushPending(age){ const now=performance.now(), q=pendQ; pendQ=[]; q.forEach(([ev,o,t])=>{ if(now-t<(age||400)) play(ev,Object.assign({},o,{delay:Math.max(0,(+o.delay||0)-(now-t))})); }); } // события, пришедшие раньше манифестов или до запуска контекста, ждут и играют, если не устарели
function play(ev,o){ let r='err'; try{ r=_play(ev,o||{}); }catch(e){ r='err'; } const T=window.__bpAudioTrace; if(T){ try{ T.push([ev,r,Math.round(performance.now())]); }catch(e){} } return r==='ok'; }

// ---------- синтезированные эффекты (без файлов): звон монет при высыпании мешка (2026-10-12, fb/coins2) ----------
// Короткий всплеск шума через полосовой фильтр + 3–4 неточных гармоники (металл). Уважают звук выкл./громкость EFFECTS/«Подъём»/вкус (шины те же, что у файлов); лишние голоса вытесняют старый.
// play('sack.coin_clink',{v:0..1}) — сила удара (громкость и высота), play('sack.coin_chink',{k:0..1}) — доля монет, уже прилетевших в WIN.
const SYN={'sack.coin_clink':{cd:24,voices:6},'sack.coin_chink':{cd:34,voices:4}};
const SYN_FL={A:[1,1,1],B:[1.3,.7,1.1],C:[.82,1.2,.7],D:[1.1,1,1.2],E:[1,1,.9],F:[.9,.9,.5]};   // вкус → [высота, длина звона, яркость шума]
let noiseBuf=null; const synVoices={};
function mkNoise(){ if(noiseBuf) return noiseBuf; const n=Math.floor(ctx.sampleRate*.05); noiseBuf=ctx.createBuffer(1,n,ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1; return noiseBuf; }
function synth(ev,o){
 if(!ctx||!unlocked) return 'locked'; if(hidden) return 'hidden'; if(muted()) return 'muted'; if(vol().sfx<=0) return 'sfx0'; if(ctx.state!=='running') return 'suspended';
 const L=SYN[ev], now=performance.now(), v=vol(), cd=L.cd*(v.speed!=='normal'||v.hold||v.auto>0?2:1); if(!o.force){ if(now-(lastW[ev]||0)<cd) return 'cooldown'; lastW[ev]=now; }
 const vs=synVoices[ev]||(synVoices[ev]=[]); while(vs.length>=L.voices){ const x=vs.shift(); try{ const t=ctx.currentTime; x.g.gain.cancelScheduledValues(t); x.g.gain.setTargetAtTime(0,t,.01); x.stop(t+.06); }catch(e){} }
 const fl=SYN_FL[o.flavour||flFor(ev)]||SYN_FL.A, t=ctx.currentTime+Math.max(0,(+o.delay||0)/1000), rnd=(a,b)=>a+Math.random()*(b-a), sp=clamp(o.v==null?.5:+o.v,0,1), k=clamp(+o.k||0,0,1);
 const out=ctx.createGain(); out.connect(sfxBus); const end=[]; let dur;
 if(ev==='sack.coin_clink'){   // удар: чем быстрее, тем громче, выше и ярче; пара фиксированных «монетных» частот + случайность
  const f0=rnd(2100,2900)*fl[0]*(1+.18*sp), amp=.05+.5*Math.pow(sp,1.3); dur=(.07+.11*sp)*fl[1]; out.gain.value=amp;
  const nz=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), ng=ctx.createGain(); nz.buffer=mkNoise(); bp.type='bandpass'; bp.frequency.value=f0*2.6*fl[2]; bp.Q.value=1.4; ng.gain.setValueAtTime(.55*(.4+sp*.6),t); ng.gain.exponentialRampToValueAtTime(.001,t+.014); nz.connect(bp); bp.connect(ng); ng.connect(out); nz.start(t); nz.stop(t+.05);
  [[1,1],[2.32,.55],[4.16,.3],[6.7,.16]].forEach(([r,a],i)=>{ const os=ctx.createOscillator(), g=ctx.createGain(); os.type='sine'; os.frequency.value=f0*r*rnd(.985,1.015); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.0015); g.gain.exponentialRampToValueAtTime(.0008,t+dur/(1+i*.7)); os.connect(g); g.connect(out); os.start(t); os.stop(t+dur+.02); end.push(os); }); }
 else {   // чинк в WIN: тише и мягче, тон поднимается по ходу сбора (до ~4 полутонов)
  const f0=rnd(1750,2000)*fl[0]*Math.pow(2,k*4/12); dur=.09*fl[1]; out.gain.value=.07+.05*(1-k);
  [[1,1],[2.76,.35],[5.4,.12]].forEach(([r,a],i)=>{ const os=ctx.createOscillator(), g=ctx.createGain(); os.type='sine'; os.frequency.value=f0*r; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+.002); g.gain.exponentialRampToValueAtTime(.0008,t+dur/(1+i*.8)); os.connect(g); g.connect(out); os.start(t); os.stop(t+dur+.02); end.push(os); }); }
 const rec={g:out,stop:tt=>end.forEach(x=>{ try{ x.stop(tt); }catch(e){} })}; vs.push(rec); setTimeout(()=>{ const i=vs.indexOf(rec); if(i>=0) vs.splice(i,1); try{ out.disconnect(); }catch(e){} },(dur+.2+(+o.delay||0)/1000)*1000);
 return 'ok'; }
function _play(ev,o){
 if(ev==='spin.start'||ev==='cams.restart') seq++; ev=ordered(ev,o); o.__ev=ev; if(SYN[ev]) return synth(ev,o); // новый спин / перезапуск «Камер»: сброс счёта частых звуков
 if(!manifestsDone){ pendQ.push([ev,o,performance.now()]); return 'queued'; }
 if(!MS) return 'nomanifest';
 const pl=PLACE[ev]; if(pl&&!firstOf(MS.sfx[ev])){ o.__key=ev; o.db=(+pl[1].db||0)+(+o.db||0); o.delay=(+pl[1].delay||0)+(+o.delay||0); if(pl[1].i!=null&&o.i==null) o.i=pl[1].i; ev=pl[0]; } // событие без своего звука (временно, до выбора владельца)
 const id=resolve(ev); if(!id) return 'noevent'; const ck=o.__key||id;   // ck — ключ предела частоты и голосов
 if(!ctx||!unlocked){ if(ss.get('bp-snd-u')==='1'&&performance.now()<3500&&!muted()){ pendQ.push([ev,o,performance.now()]); return 'queued'; } return 'locked'; } // страница только открылась после перехода: контекст вот-вот стартует сам
 if(hidden) return 'hidden'; if(muted()) return 'muted';
 if(vol().sfx<=0) return 'sfx0'; if(o.loop&&loops[ev]) return 'running';
 if(ctx.state!=='running'){ if(ctx.state==='suspended'&&performance.now()-unlockT<500){ pendQ.push([ev,o,performance.now()]); return 'queued'; } return 'suspended'; }
 const L=LIM[ck]||LIM[id]||LIM0, now=performance.now(); let delay=Math.max(0,+o.delay||0);
 if(!o.force){
  const v=vol(); if((v.speed!=='normal'||v.hold||v.auto>0)&&(FREQ.has(id)||FREQ.has(ck))){ if(played[ck]===seq) return 'turbo'; played[ck]=seq; } // Turbo, Quick, автоигра: частые звуки — один за спин
  const want=now+delay, early=(lastW[ck]||0)+L.cd; if(want<early){ const sh=early-want; if(sh>(L.shift==null?70:L.shift)) return 'cooldown'; delay+=sh; } // слишком часто: сдвигаем на следующий «такт» (не больше чем на 70 мс), иначе пропускаем
  lastW[ck]=now+delay; }
 { const dh=DUCK_EV[o.__key||ev]; if(dh) duck(true,'ev',dh); } // итог бонуса: музыка тише на время звука
 const ent=MS.sfx[id], fl=o.flavour||flFor(id); let list=ent[fl]; if(!Array.isArray(list)||!list.length) list=ent[defFl()]; if(!Array.isArray(list)||!list.length) list=firstOf(ent); if(!Array.isArray(list)||!list.length) return 'novariant';
 let i; if(o.i!=null) i=((o.i%list.length)+list.length)%list.length; else { i=(Math.random()*list.length)|0; const k=id+fl; if(list.length>1&&i===lastI[k]) i=(i+1+((Math.random()*(list.length-1))|0))%list.length; lastI[k]=i; }
 const file=list[i]; if(!o.force&&Math.abs(now+delay-(fileT[file]||-1e9))<35) return 'dup'; // одинаковые звуки друг на друга не кладём
 fileT[file]=now+delay;
 const b=bufNow(file);
 if(b){ start(id,b,file,o,delay); return 'ok'; }
 getBuf(file).then(buf=>{ if(buf&&performance.now()-now<(L.late||LIM0.late)&&live()) start(id,buf,file,o,Math.max(0,delay-(performance.now()-now))); }); return 'loading'; }
function stopLoop(ev,fade){ const l=loops[ev]; if(!l||!ctx) return false; delete loops[ev]; clearTimeout(l.cap); const t=ctx.currentTime, f=Math.max(.03,fade==null?.15:fade); try{ l.g.gain.cancelScheduledValues(t); l.g.gain.setValueAtTime(l.g.gain.value,t); l.g.gain.linearRampToValueAtTime(0,t+f); l.s.stop(t+f+.03); }catch(e){} return true; }
function startLoop(id,ev,buf,o,delay){ // короткий цикл: тихо входит, живёт до stopLoop (или не дольше 8 с)
 const s=ctx.createBufferSource(), g=ctx.createGain(); s.buffer=buf; s.loop=true; const t=ctx.currentTime+Math.max(0,delay/1000), k=dB((MS.gain&&+MS.gain[id])||0)*(o.level||1);
 g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(k,t+.06); s.connect(g); g.connect(sfxBus); s.start(t);
 const rec={s,g,cap:setTimeout(()=>stopLoop(ev,.3),8000)}; loops[ev]=rec; s.onended=()=>{ try{ s.disconnect(); g.disconnect(); }catch(e){} if(loops[ev]===rec) delete loops[ev]; }; }
function start(id,buf,file,o,delay){
 if(o.loop){ startLoop(id,o.__ev||id,buf,o,delay); return; }
 const s=ctx.createBufferSource(), g=ctx.createGain(); s.buffer=buf; const j=o.jitter==null?.02:o.jitter; s.playbackRate.value=1+(Math.random()*2-1)*j; // ±2% высоты
 const db=((MS.gain&&+MS.gain[id])||0)+(+o.db||0)+(Math.random()*2-1)*.7; g.gain.value=dB(db);
 let out=g; if(o.pan!=null&&ctx.createStereoPanner){ try{ const p=ctx.createStereoPanner(); p.pan.value=clamp(+o.pan,-1,1); g.connect(p); out=p; }catch(e){} }
 s.connect(g); out.connect(sfxBus);
 const ck=o.__key||id, vs=voices[ck]||(voices[ck]=[]), L=LIM[ck]||LIM[id]||LIM0; while(vs.length>=L.voices){ const v=vs.shift(); try{ const t=ctx.currentTime; v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0,t,.012); v.s.stop(t+.07); }catch(e){} } // лишний голос: самый старый быстро затихает
 const rec={s,g}; vs.push(rec); s.onended=()=>{ const k=vs.indexOf(rec); if(k>=0) vs.splice(k,1); try{ s.disconnect(); g.disconnect(); out!==g&&out.disconnect(); }catch(e){} };
 s.start(ctx.currentTime+Math.max(0,(delay||0)/1000)); }
// Подгрузка набора текущей сцены (можно и до первого жеста: декодирует автономный контекст): по три файла, без звука ничего не качаем
let preKey='';
function preload(){
 if((!MS&&!MM)||window.__bpBoard) return; const v=vol(); if(v.mute||hidden||!decoder()) return; const sc=scn||'hall', key=sc+curFl()+JSON.stringify(pref.fe||{}).length+(MM?'m':'')+(unlocked?'u':''); if(key===preKey) return; preKey=key;
 const files=[];
 if(v.sfx>0){ [...PRE_ALL,...(PRE[sc]||[])].forEach(ev=>{ const id=resolve(ev); if(!id) return; const e=MS.sfx[id], l=e[flFor(id)]||e[defFl()]||firstOf(e)||[]; l.forEach(f=>{ if(!files.includes(f)) files.push(f); }); }); }
 // fb/perf 2026-10-12: звуки качаются ПОСЛЕ роликов Рокко первого спина (loadgate.js: BPLoad.whenOpen('rocco')) и входят в ворота первого спина (need('audio')): раньше 3 потока звука делили канал
 // с роликами, и ролики первых спинов не успевали. Нет BPLoad (страница без loadgate.js) — как раньше.
 const L=window.BPLoad, later=(kind,f,ms)=>L?L.whenOpen(kind,f,ms):setTimeout(f,ms||0);
 let k=0, run=0, fin=null; const allDone=new Promise(r=>{ fin=r; });
 const pump=()=>{ while(run<3&&k<files.length&&!muted()){ run++; getBuf(files[k++]).then(()=>{ run--; setTimeout(pump,15); }); } if(k>=files.length&&run===0) fin(); };
 if(L&&!window.__audNeed){ window.__audNeed=1; if(files.length){ L.need('audio',allDone); L.seal('audio'); } else { L.need('audio',Promise.resolve()); L.seal('audio'); } }
 later('rocco',()=>(window.requestIdleCallback?requestIdleCallback(pump,{timeout:300}):setTimeout(pump,60)));
 if(!files.length) fin();
 later('rocco',()=>{ const v2=vol(); if(v2.music>0&&unlocked){ const it=trackFor(scn); if(it) getBuf(it.file,true); if(scn==='cameras'){ const l=trackFor('camlayer'); if(l) getBuf(l.file,true); } } // музыка сцены (в Камерах и слой): сразу после эффектов (игра их ждёт раньше)
  if(v2.sfx>0){ const af=ambFile(sc); if(af) setTimeout(()=>{ if(!muted()&&!hidden) getBuf(af); },400); } },200);
 later('audio',()=>{ const st=trackFor('bigwin'); if(st&&unlocked&&!muted()&&!hidden&&vol().music>0) getBuf(st.file,true); },6000); }

// ---------- выбор владельца ----------
// x — сцена (welcome, hall, kitchen, cameras) или категория (hall, bonus, camlayer, bigwin, maxwin). Дорожка играет сразу; слой Камер — поверх выбранной дорожки бонуса (pickLayer)
function pickMusic(x,id){
 const cat=catOf(x); if(cat==='camlayer') return pickLayer(id);
 const L=listFor(cat), it=L.find(t=>t.id===id); if(!it) return false; pref.music[cat]=id; savePref(); unlock();
 if(STINGS.includes(cat)){ bigwin(cat==='maxwin'); return true; }  // стинг: слушаем сразу (музыка сцены под ним тише), как в игре
 if(cat!=='bonus'){ LY.pre=false; LY.over=null; }                   // другая категория — слой уходит; дорожки бонуса можно менять, слой остаётся
 playTrack(it,{xf:XF_PICK,scene:scn&&catOf(scn)===cat?scn:cat,cat,force:true}); return true; }
// Слой Камер: id или 'off'. Включённый слой слушаем сразу поверх выбранной дорожки бонуса (если она не играет — запускаем её)
function pickLayer(id){
 if(id==null||id==='off'){ pref.music.camlayer='off'; savePref(); LY.pre=false; LY.over=null; syncLayer(null,XF_PICK); return true; }
 const it=listFor('camlayer').find(t=>t.id===id); if(!it) return false; pref.music.camlayer=id; savePref(); unlock(); LY.pre=true; LY.over=null;
 const b=trackFor('bonus'); if(b) playTrack(b,{xf:XF_PICK,scene:scn==='cameras'?'cameras':'bonus',cat:'bonus'}); else syncLayer(null,XF_PICK); return true; }
function setLayerDb(db){ pref.layerDb=clamp(Math.round(+db||0),-24,0); savePref(); const l=LY.cur; if(l&&ctx&&!l.dying){ const t=ctx.currentTime, k=normOf(l.it)*dB(pref.layerDb); try{ l.g.gain.cancelScheduledValues(t); l.g.gain.setValueAtTime(l.g.gain.value,t); l.g.gain.linearRampToValueAtTime(k,t+.15); l.norm=k; }catch(e){} } return pref.layerDb; }
function cycleLayerDb(){ const i=LAYER_DBS.indexOf(pref.layerDb); return setLayerDb(LAYER_DBS[(i+1)%LAYER_DBS.length]); }
// звуковая доска: заранее скачать и декодировать все файлы события (всех наборов) / дорожку
function warm(ev){ const id=resolveP(ev); if(!id) return; const e=MS.sfx[id]; flavKeys().forEach(f=>(e[f]||[]).forEach(x=>getBuf(x))); }
function warmTrack(it){ if(it) getBuf(it.file,true); }
function setPick(x,id){ const c=catOf(x); if(c==='camlayer'&&id==='off'){ pref.music.camlayer='off'; savePref(); return true; } if(!listFor(c).some(t=>t.id===id)) return false; pref.music[c]=id; savePref(); return true; }
function setSfxTrim(db){ pref.trim=clamp(Math.round(+db||0),-12,12); savePref(); lastV.sfx=-1; sync(); return pref.trim; } // подъём всех эффектов, дБ
function setEventFlavours(m){ pref.fe={}; if(m&&typeof m==='object') Object.keys(m).forEach(ev=>{ if(okFl(m[ev])) pref.fe[ev]=m[ev]; }); savePref(); preKey=''; if(live()){ playAmb(scn); preload(); } return Object.keys(pref.fe).length; }   // вкус по событиям (звуковая доска → «Поставить в игру»); {} — вернуть умолчания
function cycleSfxTrim(){ const i=TRIMS.indexOf(pref.trim||0); return setSfxTrim(TRIMS[(i+1)%TRIMS.length]); }
function setFlavour(f){ if(f==null||f==='default'){ pref.fl=null; pref.fe={}; } else { if(!flavKeys().includes(f)) return; pref.fl=f; pref.fe={}; } savePref(); preKey=''; if(live()){ playAmb(scn); preload(); } }
function toggleMute(){ const m=!vol().mute; setVol({mute:m}); return m; }

// ---------- звуковая доска и проверки ----------
const preview={
 music(it,o){ unlock(); LY.pre=false; LY.over=null; o=Object.assign({xf:.3,scene:'preview',force:true},o||{}); return playTrack(it,o); },   // дорожка одна, без слоя (слой — только в preview.combo)
 combo(bonusIt,layerIt){ unlock(); if(!bonusIt||!layerIt) return Promise.resolve(false); LY.pre=false; LY.over=layerIt; return playTrack(bonusIt,{xf:.3,scene:'preview',cat:'bonus',force:true}); },   // доска: дорожка бонуса и слой вместе с начала
 layerId:()=>LY.cur&&!LY.cur.dying?LY.cur.it.id:null,
 stop(xf){ stopMusic(xf); },
 seam(it){ unlock(); return getBuf(it.file,true).then(buf=>{ const lp=buf&&loopOf(it,buf); if(!buf) return false; const end=lp?lp[1]:buf.duration; return playTrack(it,{xf:.15,offset:Math.max(0,end-3),scene:'preview',force:true}); }); },
 pos,
 amb(sc,fl){ unlock(); const e=MS&&MS.amb&&MS.amb[sc], f=e&&e[fl]; if(!f) return false; if(AMB.cur&&AMB.cur.path===f&&!AMB.cur.dying){ AMB.gen++; fadeOut(AMB.cur,.4); AMB.cur=null; return true; } ambStart(f,sc); return true; }, // послушать атмосферу; ещё раз — стоп
 sfx(ev,fl,n,gap){ unlock(); n=n||1; gap=gap||520; let k=0; const one=()=>{ play(ev,{flavour:fl,force:true,jitter:.02}); if(++k<n) setTimeout(one,gap); }; one(); return n; }
};
const resolveP=ev=>{ const p=PLACE[ev]; return resolve(p&&!(MS&&MS.sfx&&firstOf(MS.sfx[ev]))?p[0]:ev); };   // событие → id звука, который реально сыграет (с подменой)
function describe(ev){ const e=EVENTS[ev]; return e?e[0]:(PFX_DESC[ev.split('.')[0]]?PFX_DESC[ev.split('.')[0]]+': '+ev:ev); }
function state(){ const v=vol(); const g=p=>p?+p.value.toFixed(4):null;
 return {unlocked,ctx:ctx?ctx.state:'none',hidden,muted:v.mute,hasMusic:!!MM,hasSfx:!!MS,scene:scn,flavour:curFl(),flavours:flavKeys(),master:ctx?g(master.gain):null,music:ctx?g(musicBus.gain):null,sfx:ctx?g(sfxBus.gain):null,duck:ctx?g(musicDuck.gain):null,
  track:M.cur?M.cur.it.id:null,trackScene:M.cur?M.cur.scene:null,trackCat:M.cur?M.cur.cat:null,trackNorm:M.cur?+M.cur.norm.toFixed(4):null,trackDying:M.cur?M.cur.dying:null,
  layer:LY.cur&&!LY.cur.dying?LY.cur.it.id:null,layerNorm:LY.cur?+LY.cur.norm.toFixed(4):null,layerDb:pref.layerDb,layerPre:LY.pre,layerPend:LY.pend?LY.pend.id:null,sting:M.sting?M.sting.it.id:null,amb:AMB.cur?AMB.cur.path:null,pick:pref.music,time:ctx?ctx.currentTime:0,missing:[...missing],seq,loaded:[...bufs.values()].filter(e=>e.b).length,loading:[...bufs.values()].filter(e=>!e.b).length}; }

// ---------- панель «Экраны макета» (артефакт): раздел «Звук» ----------
const navOpen=new Set(); // какие группы музыки раскрыты в «Экранах макета» (по умолчанию — музыка текущей сцены; в Камерах ещё и слой)
const NAV_GROUPS=[['hall','Музыка — Зал и приветствие',['hall']],['bonus','Музыка — Бонус (Кухня и Камеры)',['bonus']],['camlayer','Слой Камер',['camlayer']],['stings','Вставки большого и максимального выигрыша',['bigwin','maxwin']]];
function renderNav(){
 const host=document.getElementById('bp-snd-sec'); if(!host) return; host.textContent=''; host.style.cssText='display:grid;gap:2px';
 const b=(t,fn,on)=>{ const e=document.createElement('button'); e.type='button'; e.textContent=(on?'✓ ':'')+t; if(on) e.style.color='#FFC861'; e.onclick=ev=>{ ev.stopPropagation(); fn(); }; host.append(e); return e; };
 const h=t=>{ const e=document.createElement('b'); e.textContent=t; host.append(e); };
 b('Звук: '+(vol().mute?'выключен — включить':'включён — выключить'),()=>{ toggleMute(); renderNav(); });
 b('Музыка этой сцены — вернуть',()=>{ if(scn) resume(); stopStingPrev(); });

 b('Подъём эффектов: '+(api.sfxTrim()>0?'+':'')+api.sfxTrim()+' дБ — ещё',()=>{ cycleSfxTrim(); play('spin.stop',{force:true}); renderNav(); });
 h('Эффекты — вариант'); flavKeys().forEach(f=>b(f+(flavName(f)?' · '+flavName(f):''),()=>{ setFlavour(f); play('spin.stop',{force:true}); renderNav(); },curFl()===f));
 if(!MM&&!MS){ const e=document.createElement('span'); e.textContent='Файлов звука пока нет'; e.style.cssText='padding:4px 10px;font:600 13px var(--ui);opacity:.7'; host.append(e); }
 if(navOpen.size===0&&scn){ navOpen.add(catOf(scn)); if(scn==='cameras') navOpen.add('camlayer'); }
 const sub=t=>{ const e=document.createElement('i'); e.textContent=t; e.style.cssText='padding:4px 10px 0;font:700 11px var(--ui);letter-spacing:.12em;text-transform:uppercase;color:#d8cba8;opacity:.6;font-style:normal'; host.append(e); };
 NAV_GROUPS.forEach(([key,title,cats])=>{ const n=cats.reduce((a,c)=>a+listFor(c).length,0); if(!n&&key!=='camlayer') return; const open=navOpen.has(key);
  const g=b((open?'▾ ':'▸ ')+title+' ('+n+')',()=>{ if(navOpen.has(key)) navOpen.delete(key); else navOpen.add(key); renderNav(); }); g.style.cssText='font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#d8cba8;opacity:.85;min-height:30px';
  if(!open) return;
  cats.forEach(c=>{ const L=listFor(c), cur=trackFor(c);
   if(cats.length>1&&L.length) sub(CAT_NAME[c]);
   if(c==='camlayer'){ if(!L.length){ sub('Файлов слоя пока нет'); return; }
    b('Выкл. (только дорожка бонуса)',()=>{ pickLayer('off'); renderNav(); },pref.music.camlayer==='off');
    L.forEach(it=>b(it.title||it.id,()=>{ pickLayer(it.id); renderNav(); },cur&&cur.id===it.id));
    b('Уровень слоя: '+(pref.layerDb<0?'−':'')+Math.abs(pref.layerDb)+' дБ — ещё',()=>{ cycleLayerDb(); renderNav(); }); return; }
   L.forEach(it=>b(it.title||it.id,()=>{ pickMusic(c,it.id); renderNav(); },cur&&cur.id===it.id)); }); });
 const a=document.createElement('button'); a.type='button'; a.textContent='Все звуки — прослушать'; a.onclick=()=>{ location.href='sound-board.html?bpv=abe1725e'; }; host.append(a); }
function stopStingPrev(){ bigwinEnd(); }
onReady(renderNav); document.addEventListener('DOMContentLoaded',renderNav);

// ---------- запуск ----------
const api=window.bpAudio={setSfxTrim,cycleSfxTrim,sfxTrim:()=>(pref.trim||0)+SFX_TRIM_DB,buf:bufNow,resume,play,stopLoop,setPick,warm,warmTrack,scene:setScene,leave,bigwin,bigwinEnd,sync,unlock,pickMusic,pickLayer,setLayerDb,cycleLayerDb,layerDb:()=>pref.layerDb,setFlavour,setEventFlavours,toggleMute,setVol,vol,
 tracks:sc=>listFor(sc), flavour:curFl, flavourFor:ev=>{ const id=resolveP(ev)||ev; return flFor(id); }, flavourDefault:ev=>{ const id=resolveP(ev)||ev, d=MS&&MS.defaultFlavours&&MS.defaultFlavours[id]; return flavKeys().includes(d)?d:defFl(); }, flavourExplicit:()=>okFl(pref.fl)||Object.keys(pref.fe||{}).length>0, flavourKeys:flavKeys, flavours:()=>{ const o={}; flavKeys().forEach(k=>{ o[k]=flavName(k)||k; }); return o; }, events:()=>MS?Object.keys(MS.sfx):[], variants:(ev,f)=>{ const e=MS&&MS.sfx[ev]; return (e&&e[f||curFl()])||[]; },
 amb:()=>(MS&&MS.amb)||{}, gains:()=>(MS&&MS.gain)||{}, manifest:()=>({music:MM,sfx:MS}), describe,hasEvent:ev=>!!SYN[ev]||!!resolveP(ev),catalog:EVENTS,sceneNames:SCENE_NAME,
 selected:x=>trackFor(x), defaultTrack:x=>defTrack(x), onReady, renderNav, preview, state, stop:stopMusic, path:AB, ogg:OGG, scenes:SCENES, stings:STINGS, cats:CATS, catNames:CAT_NAME, catOf, layerOn:()=>!!(LY.cur&&!LY.cur.dying)};
// сцена: приветствие, зал, кухня или камеры — по адресу страницы (ui.js переключает приветствие → зал сам: bpAudio.scene('hall'))
function detect(){ try{ const Q=typeof q!=='undefined'&&q&&q.get?q:new URLSearchParams(location.search); const sc=(typeof scene==='string'&&scene)||Q.get('scene')||'hall'; return Q.get('screen')==='welcome'?'welcome':(SCENES.includes(sc)?sc:'hall'); }catch(e){ return 'hall'; } }
function boot(){ if(boot.done) return; boot.done=true; if(!scn&&!window.__bpBoard) scn=detect(); preload(); renderNav(); } // звуковая доска (sound-board.html?bpv=abe1725e) ставит window.__bpBoard=1: сцены нет, заранее ничего не качаем
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
loadManifests();
})();
