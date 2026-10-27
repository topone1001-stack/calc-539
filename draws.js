// 資料來源：台灣彩券官方 API https://api.taiwanlottery.com/TLCAPIWeB/Lottery/{Daily539Result|Lotto649Result}
const S=require('./store');
const API='https://api.taiwanlottery.com/TLCAPIWeB/Lottery/';
let cache={d539:[],lotto:[],updated:null};const save=()=>S.set('draws',cache).catch(e=>console.error('save draws',e.message));
const tpe=()=>new Date(Date.now()+8*3600e3);
const months=()=>{const d=tpe(),a=d.toISOString().slice(0,7);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-1);return [a,d.toISOString().slice(0,7)];};
async function get(kind,key){let out=[];for(const m of months()){const r=await fetch(`${API}${kind}?period&month=${m}&pageNum=1&pageSize=50`,{signal:AbortSignal.timeout(15000)});const j=await r.json();if(j.rtCode!==0)throw new Error('rtCode '+j.rtCode);out=out.concat(j.content[key]||[]);}
 return out.sort((a,b)=>b.period-a.period);}
async function refresh(){try{
 const a=await get('Daily539Result','daily539Res'),b=await get('Lotto649Result','lotto649Res'),c=await get('SuperLotto638Result','superLotto638Res');
 cache={...cache,updated:new Date().toISOString(),
  d539:a.slice(0,20).map(x=>({period:x.period,date:x.lotteryDate.slice(0,10),nums:x.drawNumberSize,order:(x.drawNumberAppear||[]).slice(0,5)})),
  super:c.slice(0,20).map(x=>({period:x.period,date:x.lotteryDate.slice(0,10),nums:x.drawNumberSize.slice(0,6).sort((p,q)=>p-q),special:x.drawNumberSize[6],order:(x.drawNumberAppear||[]).slice(0,6)})),lotto:b.slice(0,20).map(x=>({period:x.period,date:x.lotteryDate.slice(0,10),nums:x.drawNumberSize.slice(0,6).sort((p,q)=>p-q),special:x.drawNumberSize[6],order:(x.drawNumberAppear||[]).slice(0,6)}))};
 save();console.log('draws updated',cache.d539[0]&&cache.d539[0].period);}catch(e){console.error('draws fetch failed:',e.message);}}
let last=0;function tick(){const d=tpe(),dow=d.getUTCDay(),hm=d.getUTCHours()*60+d.getUTCMinutes();
 const live=dow>=1&&dow<=6&&hm>=20*60+30&&hm<=22*60;if(live||Date.now()-last>3*3600e3){last=Date.now();refresh();}}
const CH='UCX9q-HI41sFuh1Gs5X_ZZCw';let vid={};
async function videos(){try{const x=await (await fetch('https://www.youtube.com/feeds/videos.xml?channel_id='+CH,{signal:AbortSignal.timeout(15000)})).text();
 const es=[...x.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>/g)].map(m=>({id:m[1],title:m[2]}));
 const r=es.find(e=>/彩券開獎/.test(e.title)&&!/發票/.test(e.title));if(r){try{const w=await (await fetch('https://www.youtube.com/watch?v='+r.id,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36','Accept-Language':'zh-TW'},signal:AbortSignal.timeout(15000)})).text();
  const st=(w.match(/"liveBroadcastDetails":\{[^}]*"startTimestamp":"([^"]+)"/)||[])[1];if(st){const t0=new Date(st),d=new Date(t0.getTime()+8*3600e3);const show=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),12,30,0);r.start=Math.max(0,Math.round((show-t0.getTime())/1000));r.liveStart=st;}}catch(e){}
  if(r.start==null)r.start=120;vid=r;cache.replay=r;save();}}catch(e){console.error('yt rss failed:',e.message);}}
// 加州天天樂 Fantasy 5：官方 calottery API 被防機器人擋（403），改以 lotteryusa.com 為主（共用 hist.caPage），官方當備援
const CA='https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults/10/1/20';let caLast=0;
const caNums=d=>Object.values(d.WinningNumbers||{}).map(x=>+x.Number).sort((a,b)=>a-b);
// 號碼檢查：5 個、皆為 1–39 的整數、不重複；不合格的整期丟掉，避免對方改版寫入錯資料
const caValid=x=>require('./hist').caValid(x);
async function caOfficialFull(){const r=await fetch(CA,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36','Accept':'application/json'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();const m=d.MostRecentDraw;
 const map=x=>({period:x.DrawNumber,date:String(x.DrawDate).slice(0,10),nums:caNums(x)});
 return {rows:[m,...(d.PreviousDraws||[])].map(map),prizes:Object.values(m.Prizes||{}).map(p=>({desc:p.PrizeTypeDescription,count:p.Count,amount:p.Amount})),
  next:d.NextDraw?{period:d.NextDraw.DrawNumber,date:String(d.NextDraw.DrawDate).slice(0,10),jackpot:d.NextDraw.JackpotAmount}:null};}
async function refreshCA(){caLast=Date.now();try{let src='lotteryusa',rows=[],prizes=[],next=null;
 try{const o=await caOfficialFull();if(o.rows.filter(caValid).length){src='official';rows=o.rows;prizes=o.prizes;next=o.next;}}catch(e){console.error('ca official failed:',e.message);cache.caOfficialErr=e.message;}
 if(!rows.filter(caValid).length){src='lotteryusa';rows=await require('./hist').caPage(1);}
 const bad=rows.filter(x=>!caValid(x)).length;if(bad)console.error('ca invalid rows dropped:',bad,'src',src);
 const seen=new Set(),hist=rows.filter(caValid).sort((a,b)=>b.date<a.date?-1:b.date>a.date?1:0).filter(x=>!seen.has(x.period)&&seen.add(x.period)).slice(0,20);
 if(!hist.length)throw new Error('no valid rows from '+src);
 const prev=cache.ca||{};// lotteryusa 沒有獎金和下期資訊：沿用上次官方抓到的值
 cache.ca={updated:new Date().toISOString(),src,latest:hist[0],hist,prizesPeriod:prizes.length?hist[0].period:prev.prizesPeriod,prizes:prizes.length?prizes:(String(prev.prizesPeriod)===String(hist[0].period)?(prev.prizes||[]):[]),next:next||(prev.next&&prev.next.date>hist[0].date?prev.next:null)};
 save();console.log('ca updated',src,hist[0].period);}catch(e){console.error('ca fetch failed:',e.message);}}
function tickCA(){const d=tpe(),hm=d.getUTCHours()*60+d.getUTCMinutes();if((hm>=9*60+30&&hm<=11*60+30)||Date.now()-caLast>=60*60e3-30e3)refreshCA();}
// 香港六合彩：HKJC 官方 GraphQL（查詢字串須與官網完全一致，存在 hk-query.graphql）
const HKQ=require('fs').readFileSync(require('path').join(__dirname,'hk-query.graphql'),'utf8');let hkLast=0;
const HKP=['頭獎','二獎','三獎','四獎','五獎','六獎','七獎'];
async function refreshHK(){hkLast=Date.now();try{const r=await fetch('https://info.cld.hkjc.com/graphql/base/',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36','Origin':'https://bet.hkjc.com','Referer':'https://bet.hkjc.com/'},body:JSON.stringify({operationName:'marksixResult',variables:{lastNDraw:20,drawType:'All'},query:HKQ}),signal:AbortSignal.timeout(20000)});
 const j=await r.json();const d=(j.data&&j.data.lotteryDraws)||[];if(!d.length)throw new Error(JSON.stringify(j.errors||'empty'));
 const hist=d.filter(x=>x.drawResult&&x.drawResult.drawnNo&&x.drawResult.drawnNo.length===6).map(x=>({period:x.year+'/'+String(x.no).padStart(3,'0'),date:x.drawDate.slice(0,10),nums:x.drawResult.drawnNo.slice().sort((a,b)=>a-b),special:x.drawResult.xDrawnNo,snowball:x.snowballName_ch||''}));
 const L=d.find(x=>x.drawResult&&x.drawResult.drawnNo&&x.drawResult.drawnNo.length===6),pool=L&&L.lotteryPool||{};
 cache.hk={updated:new Date().toISOString(),latest:hist[0],hist:hist.slice(0,20),turnover:pool.totalInvestment,jackpotCarry:pool.jackpot,prizes:(pool.lotteryPrizes||[]).map(p=>({name:HKP[p.type-1]||('第'+p.type+'獎'),units:p.winningUnit,dividend:p.dividend}))};save();console.log('hk updated',hist[0]&&hist[0].period);}catch(e){console.error('hk fetch failed:',e.message);}}
function tickHK(){const d=tpe(),hm=d.getUTCHours()*60+d.getUTCMinutes();if((hm>=21*60+15&&hm<=22*60+30)||Date.now()-hkLast>=60*60e3-30e3)refreshHK();}
async function refreshOther(){try{const m=tpe().toISOString().slice(0,7),o={};
 for(const [k,ep,key] of [['d3','3DResult','lotto3DRes'],['d4','4DResult','lotto4DRes']]){const j=await (await fetch(`${API}${ep}?period&month=${m}&pageNum=1&pageSize=10`,{signal:AbortSignal.timeout(15000)})).json();o[k]=(j.content[key]||[]).sort((a,b)=>b.period-a.period).slice(0,10).map(x=>({period:x.period,date:x.lotteryDate.slice(0,10),nums:x.drawNumberAppear}));}
 const day=tpe().toISOString().slice(0,10);const j=await (await fetch(`${API}BingoResult?openDate=${day}&pageNum=1&pageSize=10`,{signal:AbortSignal.timeout(15000)})).json();
 o.bingo=((j.content&&j.content.bingoQueryResult)||[]).slice(0,10).map(x=>({period:x.drawTerm,nums:(x.bigShowOrder||[]).map(Number).sort((a,b)=>a-b),super:x.bullEyeTop!=null&&x.bullEyeTop!=='－'?+x.bullEyeTop:null}));
 o.updated=new Date().toISOString();cache.other=o;save();}catch(e){console.error('other fetch failed:',e.message);}}
exports.refreshOther=refreshOther;
// ---- 即時更新：開獎時段每 1–2 分鐘問官方，直到新一期出現 ----
const SC=require('./sched');let ver='';const listeners=[];const lastTry={tw:0,ca:0,hk:0,vn:0};const VN=require('./vn');let vnLast=0;const refreshVN=()=>{vnLast=Date.now();return VN.refreshVN(()=>cache,save,(g,rows)=>require('./hist').putVN(g,rows));};
const RUN={tw:()=>refresh(),ca:()=>refreshCA(),hk:()=>refreshHK(),vn:()=>refreshVN()};
// 開獎首次看到的時間紀錄（之後依實際資料收窄等待時段）
const KEYS=SC.KEYS;let lastP=null;const latestOf=(c,k)=>{const x=c&&c[k];return Array.isArray(x)?x[0]:x&&x.latest;};
function seen(now=Date.now()){const cur={};KEYS.forEach(k=>{const r=latestOf(cache,k);cur[k]=r?String(r.period):'';});const prev=lastP;lastP=cur;if(!prev)return [];
 const t=new Date(now+8*3600e3).toISOString(),min=t.slice(0,10)+' '+t.slice(11,16);const add=KEYS.filter(k=>cur[k]&&prev[k]&&cur[k]!==prev[k]).map(k=>{const r=latestOf(cache,k);return {game:k,period:cur[k],date:String(r.date).slice(0,10),seen:min};});
 if(add.length){add.forEach(x=>console.log('draw seen',x.game,x.date,x.period,'at',x.seen,'Taipei'));const L=(S.get('drawSeen')||[]).concat(add).slice(-500);S.set('drawSeen',L).catch(()=>{});}return add;}
exports._seen=seen;
function bump(){const v=SC.verOf(cache);if(v===ver)return false;const was=ver;ver=v;cache.ver=v;seen();if(!was)return false;listeners.forEach(f=>{try{f(v)}catch(e){console.error('onNew',e.message);}});return true;}
async function fast(now=Date.now()){for(const s of ['tw','ca','hk','vn']){const st=SC.status(s,now,cache);if(!st.wait||now-lastTry[s]<SC.EVERY[s]-5e3)continue;lastTry[s]=now;
  try{await RUN[s]();}catch(e){}if(bump())console.log('new draw',s,ver);}}
exports.fast=fast;exports.onNew=f=>listeners.push(f);exports.ver=()=>ver||SC.verOf(cache);exports.live=()=>SC.anyWaiting(Date.now(),cache);
exports._setCache=c=>{cache=c;};exports._run=RUN;
exports.start=()=>{setInterval(()=>{if(Date.now()-vnLast>=60*60e3-30e3)refreshVN();},10*60e3);setInterval(()=>fast().catch(()=>{}),30e3);setInterval(bump,60e3);refreshOther();setInterval(refreshOther,5*60e3);refreshHK();setInterval(tickHK,10*60e3);refreshCA();setInterval(tickCA,10*60e3);cache=S.get('draws')||cache;refreshVN();videos();setInterval(videos,15*60e3);last=Date.now();refresh();setInterval(tick,10*60e3);};
exports.get=()=>cache;
exports.refreshAll=async()=>{await Promise.allSettled([refresh(),refreshCA(),refreshHK(),refreshOther(),refreshVN(),videos()]);bump();return cache;};
