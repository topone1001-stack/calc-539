// 開獎即時更新排程：依各彩種實際開獎時間（台北時間）判斷「現在是否在等新的一期」
// 純函式、不連網，方便測試。now 為毫秒時間戳。
const TPE=8*3600e3;
const p2=n=>String(n).padStart(2,'0');
const ymd=d=>d.getUTCFullYear()+'-'+p2(d.getUTCMonth()+1)+'-'+p2(d.getUTCDate());
function tpe(now){const d=new Date(now+TPE);return {date:ymd(d),dow:d.getUTCDay(),hm:d.getUTCHours()*60+d.getUTCMinutes()};}
// 洛杉磯當地時間（自動處理夏令／冬令）
function la(now){const s=new Date(now).toLocaleString('en-US',{timeZone:'America/Los_Angeles',hour12:false});const off=new Date(s+' UTC').getTime()-now;const d=new Date(now+off);return {date:ymd(d),hm:(d.getUTCHours()%24)*60+d.getUTCMinutes()};}
// 台灣彩券：539 週一至六、大樂透週二五、威力彩週一四，20:30 開獎，官方約 20:45–21:30 公布
const TW_DAYS={d539:[1,2,3,4,5,6],lotto:[2,5],super:[1,4]};
// 各來源的等待時段：[開始分鐘, 結束分鐘]，以該來源當地日期為準
const WIN={tw:[20*60+30,22*60+30],ca:[18*60+30,21*60],hk:[21*60+25,23*60]};
const latestDate=(c,k)=>{const x=c&&c[k];const r=Array.isArray(x)?x[0]:x&&x.latest;return r&&String(r.date).slice(0,10);};
// 回傳 {wait:是否在等新一期, due:今天這期的日期, games:今天要開的彩種}
function status(src,now,cache){
 if(src==='tw'){const t=tpe(now);const games=Object.keys(TW_DAYS).filter(k=>TW_DAYS[k].includes(t.dow));
  const inWin=games.length&&t.hm>=WIN.tw[0]&&t.hm<=WIN.tw[1];const missing=games.filter(k=>latestDate(cache,k)!==t.date);return {wait:!!inWin&&missing.length>0,due:t.date,games:missing};}
 if(src==='ca'){const t=la(now);const inWin=t.hm>=WIN.ca[0]&&t.hm<=WIN.ca[1];return {wait:inWin&&latestDate(cache,'ca')!==t.date,due:t.date,games:['ca']};}
 if(src==='hk'){const t=tpe(now);// 六合彩每週約 3–4 期、日期由馬會公布，所以每天這段都查（間隔較長）
  const inWin=t.hm>=WIN.hk[0]&&t.hm<=WIN.hk[1];return {wait:inWin&&latestDate(cache,'hk')!==t.date,due:t.date,games:['hk']};}
 return {wait:false};}
const EVERY={tw:60e3,ca:60e3,hk:120e3};// 等待中每 1–2 分鐘問一次官方
function anyWaiting(now,cache){return ['tw','ca','hk'].some(s=>status(s,now,cache).wait);}
// 「版本」＝各彩種最新一期期別；有變就代表有新開獎
function verOf(c){c=c||{};return ['d539','lotto','super','ca','hk'].map(k=>{const x=c[k];const r=Array.isArray(x)?x[0]:x&&x.latest;return r?r.period:'';}).join('|');}
module.exports={status,anyWaiting,verOf,EVERY,WIN,tpe,la};
