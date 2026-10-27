// 完整歷史開獎：匯入官方資料到 Postgres draws 表，之後自動補新期
const S=require('./store');const fs=require('fs'),path=require('path');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const TW='https://api.taiwanlottery.com/TLCAPIWeB/Lottery/';
const GAMES={'539':{ep:'Daily539Result',key:'daily539Res',n:5,from:'2007-01'},lotto:{ep:'Lotto649Result',key:'lotto649Res',n:6,sp:1,from:'2007-01'},super:{ep:'SuperLotto638Result',key:'superLotto638Res',n:6,sp:1,from:'2008-01'},ca:{n:5},hk:{n:6,sp:1}};
exports.GAMES=GAMES;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pool=()=>S.pg();
let mem={};// game -> sorted rows [period,date,nums,special]
// 僅本機測試：無資料庫且設 HIST_FAKE=1 時產生假歷史資料（正式環境不設）
function fake(){let z=12345;const rnd=k=>{z=(z*1103515245+12345)%2147483648;return 1+z%k;};for(const g of Object.keys(GAMES)){const G=GAMES[g],max=g==='lotto'||g==='hk'?49:g==='super'?38:39,rows=[];for(let i=0;i<1200;i++){const d=new Date(Date.now()-(1200-i)*864e5).toISOString().slice(0,10);const a=new Set();while(a.size<G.n)a.add(rnd(max));const per=g==='hk'?d.slice(0,4)+'/'+String(i%150+1).padStart(3,'0'):String(115000000+i+1);rows.push([per,d,[...a].sort((p,q)=>p-q),G.sp?rnd(g==='super'?8:max):null]);}mem[g]=rows;}built={};}
async function init(){if(!pool()){if(process.env.HIST_FAKE)fake();return;}await pool().query(`CREATE TABLE IF NOT EXISTS draws(game text, period text, ddate date, nums smallint[] NOT NULL, special smallint, PRIMARY KEY(game,period))`);await load();}
async function load(){if(!pool())return;const r=await pool().query('SELECT game,period,to_char(ddate,\'YYYY-MM-DD\') d,nums,special FROM draws ORDER BY game,ddate,period');mem={};for(const x of r.rows)(mem[x.game]=mem[x.game]||[]).push([x.period,x.d,x.nums,x.special]);built={};}
async function put(game,rows){if(!pool()||!rows.length)return 0;let n=0;for(let i=0;i<rows.length;i+=500){const ch=rows.slice(i,i+500),v=[],ps=[];ch.forEach((r,j)=>{ps.push(`($${j*5+1},$${j*5+2},$${j*5+3},$${j*5+4},$${j*5+5})`);v.push(game,String(r.period),r.date,r.nums,r.special==null?null:r.special);});
 const q=await pool().query(`INSERT INTO draws(game,period,ddate,nums,special) VALUES ${ps.join(',')} ON CONFLICT DO NOTHING`,v);n+=q.rowCount;}return n;}
async function twMonth(g,m){const G=GAMES[g];const j=await (await fetch(`${TW}${G.ep}?period&month=${m}&pageNum=1&pageSize=50`,{signal:AbortSignal.timeout(20000)})).json();if(j.rtCode!==0)throw new Error('tw rt');
 return (j.content[G.key]||[]).map(x=>({period:x.period,date:x.lotteryDate.slice(0,10),nums:x.drawNumberSize.slice(0,G.n).sort((a,b)=>a-b),special:G.sp?x.drawNumberSize[G.n]:null}));}
const HKQ=fs.readFileSync(path.join(__dirname,'hk-query.graphql'),'utf8');
async function hkRange(v){const r=await fetch('https://info.cld.hkjc.com/graphql/base/',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':UA,Origin:'https://bet.hkjc.com',Referer:'https://bet.hkjc.com/'},body:JSON.stringify({operationName:'marksixResult',variables:{...v,drawType:'All'},query:HKQ}),signal:AbortSignal.timeout(25000)});
 const j=await r.json();return ((j.data&&j.data.lotteryDraws)||[]).filter(x=>x.drawResult&&x.drawResult.drawnNo&&x.drawResult.drawnNo.length===6).map(x=>({period:x.year+'/'+String(x.no).padStart(3,'0'),date:x.drawDate.slice(0,10),nums:x.drawResult.drawnNo.slice().sort((a,b)=>a-b),special:x.drawResult.xDrawnNo}));}
// 加州 Fantasy 5：官方 calottery API 被 F5 防機器人擋（403），改抓 lotteryusa.com 年度結果頁；期號依每日一期由錨點推算
const CA_ANCHOR={period:12036,date:'2026-10-20'};// 官方期號錨點（與 calottery DrawNumber 一致）
const caPeriod=d=>CA_ANCHOR.period+Math.round((Date.parse(d)-Date.parse(CA_ANCHOR.date))/864e5);
const MON={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
async function caLotteryUSA(){const r=await fetch('https://www.lotteryusa.com/california/fantasy-5/year',{headers:{'User-Agent':UA,Accept:'text/html'},signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new Error('lotteryusa HTTP '+r.status);const h=await r.text(),out=[];
 for(const c of h.split('c-draw-card__date').slice(1)){const dm=c.match(/draw-date-sub">\s*([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);if(!dm||!MON[dm[1]])continue;
  const nums=[...c.split('c-draw-card__prize')[0].matchAll(/c-ball[^"]*">\s*(\d{1,2})\s*</g)].map(m=>+m[1]);if(nums.length!==5)continue;
  const date=`${dm[3]}-${MON[dm[1]]}-${dm[2].padStart(2,'0')}`;out.push({period:caPeriod(date),date,nums:nums.sort((a,b)=>a-b),special:null});}
 if(!out.length)throw new Error('lotteryusa parse: 0 rows');return out;}
async function caOfficial(p){const r=await fetch(`https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults/10/${p}/20`,{headers:{'User-Agent':UA,Accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('calottery HTTP '+r.status);const d=await r.json();if(!d)return [];
 return [d.MostRecentDraw,...(d.PreviousDraws||[])].filter(x=>x&&x.WinningNumbers&&Object.keys(x.WinningNumbers).length===5).map(x=>({period:x.DrawNumber,date:String(x.DrawDate).slice(0,10),nums:Object.values(x.WinningNumbers).map(n=>+n.Number).sort((a,b)=>a-b),special:null}));}
// 號碼檢查：5 個、皆為 1–39 的整數、不重複；不合格的整期丟掉，避免來源改版把錯資料寫進資料庫
const caValid=x=>!!x&&Array.isArray(x.nums)&&x.nums.length===5&&new Set(x.nums).size===5&&x.nums.every(n=>Number.isInteger(n)&&n>=1&&n<=39);
exports.caValid=caValid;
const caClean=(rows,src)=>{const ok=rows.filter(caValid);if(ok.length<rows.length)console.error('ca invalid rows dropped:',rows.length-ok.length,'src',src);return ok;};
// 第 1 頁先用 lotteryusa（近一年），失敗才退回官方。
// 刻意不翻頁：線上資料庫已有舊資料，這裡只需每天補新的一期，不靠翻頁補更早的歷史。
// 期號是由錨點推算的：每次官方抓得到時，就用同日期比對期號，對不上就記錄錯誤並改用官方資料。
async function caPage(p){if(p>1)return [];
 let usa=[];try{usa=caClean(await caLotteryUSA(),'lotteryusa');}catch(e){console.error('ca lotteryusa failed:',e.message);}
 let off=null;try{off=caClean(await caOfficial(1),'official');}catch(e){if(!usa.length)throw e;}
 if(off&&off.length){const byDate=new Map(off.map(x=>[x.date,x.period]));
  const bad=usa.filter(x=>byDate.has(x.date)&&String(byDate.get(x.date))!==String(x.period));
  if(!usa.length||bad.length){if(bad.length)console.error('ca period mismatch vs official:',bad.length,'e.g.',bad[0].date,bad[0].period,'!=',byDate.get(bad[0].date),'; using official');off.src='official';return off;}}
 if(!usa.length)throw new Error('ca: no valid rows from any source');usa.src='lotteryusa';return usa;}
exports.caPage=caPage;
const months=(from)=>{const out=[];let [y,m]=from.split('-').map(Number);const now=new Date(Date.now()+8*3600e3),ey=now.getUTCFullYear(),em=now.getUTCMonth()+1;while(y<ey||(y===ey&&m<=em)){out.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++;}}return out;};
let importing=false,status={};exports.status=()=>({importing,status});exports.importing=()=>importing;
async function fullImport(){if(!pool()||importing)return;importing=true;const done=S.get('histDone')||{};const cur=months('2000-01').slice(-2);
 try{for(const g of ['539','lotto','super']){let added=0;for(const m of months(GAMES[g].from)){const k=g+':'+m;if(done[k]&&!cur.includes(m))continue;try{added+=await put(g,await twMonth(g,m));if(!cur.includes(m))done[k]=1;}catch(e){console.error('import',k,e.message);}if(m.endsWith('-12'))await S.set('histDone',done);await sleep(150);}status[g]={added,at:new Date().toISOString()};await S.set('histDone',done);await load();}
  // 六合彩：每 3 個月一段
  {let added=0;const now=new Date();for(let y=1993;y<=now.getUTCFullYear();y++)for(const [a,b] of [['0101','0331'],['0401','0630'],['0701','0930'],['1001','1231']]){const k=`hk:${y}${a}`;const isCur=y===now.getUTCFullYear();if(done[k]&&!isCur)continue;if(new Date(`${y}-${a.slice(0,2)}-${a.slice(2)}`)>now)continue;
    try{added+=await put('hk',await hkRange({startDate:y+a,endDate:y+b}));if(!isCur)done[k]=1;}catch(e){console.error('import',k,e.message);}await sleep(300);}status.hk={added};await S.set('histDone',done);await load();}
  // 加州：官方 API 只提供近約 180 期，之後逐日累積
  {let added=0;for(let p=1;p<=12;p++){try{const r=await caPage(p);if(!r.length)break;added+=await put('ca',r);}catch(e){console.error('ca page',p,e.message);break;}await sleep(500);}status.ca={added};}
 }finally{importing=false;await load();console.log('hist import done',JSON.stringify(status));}}
async function syncRecent(){if(!pool())return;let n=0;const m=months('2000-01').slice(-1)[0];
 for(const g of ['539','lotto','super'])try{n+=await put(g,await twMonth(g,m));}catch(e){}
 try{n+=await put('hk',await hkRange({lastNDraw:5}));}catch(e){}try{n+=await put('ca',await caPage(1));}catch(e){}
 if(n){await load();console.log('hist +',n);}return n;}
exports.syncRecent=syncRecent;
exports.start=async()=>{await init();setTimeout(fullImport,3000);setInterval(()=>{const d=new Date(Date.now()+8*3600e3),hm=d.getUTCHours()*60+d.getUTCMinutes();
 const hot=(hm>=20*60+28&&hm<=21*60+10)||(hm>=21*60+15&&hm<=22*60+30)||(hm>=9*60+20&&hm<=11*60+30);if(hot||d.getUTCMinutes()%20===0)syncRecent();},60e3);setInterval(fullImport,24*3600e3);};
// 預先計算的統計（每次資料更新後重算一次）
let built={};
function build(g){const rows=mem[g]||[];const G=GAMES[g];const max=g==='lotto'||g==='hk'?49:g==='super'?38:39;
 const cnt=Array(max+1).fill(0),last=Array(max+1).fill(-1),maxGap=Array(max+1).fill(0),rep=Array(max+1).fill(0);
 rows.forEach((r,i)=>{for(const n of r[2]){if(n>max)continue;cnt[n]++;const gap=last[n]<0?i:i-last[n]-1;if(gap>maxGap[n])maxGap[n]=gap;if(last[n]===i-1&&i>0)rep[n]++;last[n]=i;}});
 const N=rows.length,cur=last.map((l,n)=>n===0?0:(l<0?N:N-1-l));for(let n=1;n<=max;n++)if(cur[n]>maxGap[n])maxGap[n]=cur[n];
 return built[g]={g,max,n:G.n,sp:!!G.sp,total:N,first:rows[0]&&rows[0][1],last:rows[N-1]&&rows[N-1][1],cnt,cur,maxGap,rep,
  rows:rows.map(r=>[r[0],r[1],r[2],r[3]])};}
exports.data=g=>built[g]||build(g);
exports.has=g=>!!(mem[g]&&mem[g].length);
