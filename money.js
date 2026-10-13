// Blackout Party — деньги по правилам Stake Engine (макет, не игра). Подключается до основного скрипта index.html.
// Образец — money/index.ts из berserk-mode: таблица валют Engine (символ, знаки, до/после суммы), баланс обрезается, ставка округляется, выигрыш точный.
// Адрес: ?cur=USD|EUR|JPY|BRL|ARS|… (или ?currency=), ?social=1 (без ?cur — монеты SC; ?cur=XGC|XSC — GC / SC), ?scale=N — множитель сумм макета (проверка длинных сумм).
// Внутри макета суммы лежат в «долларах» (ставка 1 = $1); на экран идут как сумма × scale в выбранной валюте.
// API: money(v) — ставка и цены (округление); money.bal(v) — баланс (обрезка, не округляется вверх); money.win(v) — выигрыш (знаки валюты, а для суммы меньше самой мелкой единицы — до 4 знаков);
//      money.cnt(v) — то же во время счёта строки WIN: money.fin — итог счёта (ui.js, tweenResult); пока он задан, число пишется с точностью итога и не перескакивает через него.
(()=>{
'use strict';
// таблица Engine CurrencyMeta (как в berserk-mode); a:1 — символ после суммы через пробел, иначе перед суммой без пробела
const T={USD:['$',2],CAD:['CA$',2],JPY:['¥',0],EUR:['€',2],RUB:['₽',2],CNY:['CN¥',2],PHP:['₱',2],INR:['₹',2],IDR:['Rp',0],KRW:['₩',0],BRL:['R$',2],MXN:['MX$',2],
 DKK:['kr',2,1],PLN:['zł',2,1],VND:['₫',0,1],TRY:['₺',2],CLP:['CLP',0,1],ARS:['ARS',2,1],PEN:['S/',2],NGN:['₦',2],SAR:['SAR',2,1],ILS:['₪',2],AED:['AED',2,1],TWD:['NT$',2],
 NOK:['kr',2,1],KWD:['KD',3],JOD:['JD',3],CRC:['₡',2],TND:['TND',3,1],SGD:['SG$',2],MYR:['RM',2],OMR:['OMR',3,1],QAR:['QAR',2,1],BHD:['BD',3],PKR:['₨',2],EGP:['EGP',2,1],
 NZD:['NZ$',2],BOB:['Bs',2],GHS:['GH₵',2],KES:['KSh',2],MAD:['MAD',2,1],BAM:['KM',2],ISK:['kr',0,1],TZS:['TSh',2],UGX:['USh',0],XOF:['CFA',0,1],
 XGC:['GC',2,1],XSC:['SC',2,1],XEC:['SC',2,1]}; // XGC/XSC/XEC — стейк.ус: Gold Coins / Stake Cash, без «$»
// во сколько раз суммы макета больше «долларов» — чтобы ставка 0,10 не округлялась до ¥0; остальные валюты — 1 (длинные суммы: ?scale=10000)
const SC_DEF={JPY:100,KRW:1000,IDR:10000,VND:10000,CLP:1000,ISK:100,UGX:1000,XOF:500,ARS:1000};
const q=new URLSearchParams(location.search);
let code=(q.get('currency')||q.get('cur')||'').toUpperCase();
const social=q.get('social')==='1'||q.get('social')==='true'||/^X(GC|SC|EC)$/.test(code);
if(!/^[A-Z]{3}$/.test(code)) code='USD';
if(social&&!/^X(GC|SC|EC)$/.test(code)) code='XSC'; // социальный режим: только GC / SC, обычная валюта и «$» там запрещены (Engine); по умолчанию SC
const m=T[code]?{s:T[code][0],d:T[code][1],a:!!T[code][2]}:{s:code,d:2,a:true}; // кода нет в таблице — код после суммы, 2 знака (как у Engine)
const scale=+q.get('scale')>0?+q.get('scale'):(SC_DEF[code]||1);
const group=s=>s.replace(/\B(?=(\d{3})+(?!\d))/g,',');
// сумма макета → микроединицы валюты (BigInt): шум плавающей точки (1249.9999999999998) убираем до обрезки, иначе баланс «потеряет» цент
const micro=v=>{ let x=+v*scale; if(!isFinite(x)) x=0; return BigInt(Math.round(Number(x.toPrecision(15))*1e6)); };
// микроединицы → текст с d знаками; trunc — обрезка, иначе округление; символ валюты по таблице Engine
function render(u,d,trunc){
 const neg=u<0n, a=neg?-u:u, div=10n**BigInt(6-d), shown=trunc?a/div:(a+div/2n)/div, dg=shown.toString().padStart(d+1,'0');
 const num=group(d?dg.slice(0,-d):dg)+(d?'.'+dg.slice(-d):''), sign=neg&&shown>0n?'−':'';
 return m.a?sign+num+' '+m.s:sign+m.s+num; }
// знаки выигрыша: у валюты d; сумма меньше самой мелкой единицы — до 4 знаков без хвостовых нулей (но не меньше d)
function winDec(u){ const a=u<0n?-u:u; if(a===0n||a>=10n**BigInt(6-m.d)) return m.d;
 const t=(a+50n)/100n; let f=t.toString().padStart(5,'0').slice(-4).replace(/0+$/,''); return Math.max(m.d,Math.min(4,f.length)); }
const money=v=>render(micro(v),m.d,false); // ставка, цены: округление
money.bal=v=>render(micro(v),m.d,true); // баланс: обрезка
money.win=v=>{ const u=micro(v); return render(u,winDec(u),false); }; // выигрыш
money.cnt=v=>{ if(money.fin==null) return money.win(v); const u=micro(v), f=micro(money.fin); return render(u,winDec(f),u<f); }; // строка WIN во время счёта: точность итога (money.fin), обрезка до итога — число не перескакивает через него
money.fin=null;
money.code=code; money.symbol=m.s; money.decimals=m.d; money.after=m.a; money.scale=scale; money.social=social;
window.bpMoney=money;
})();
