// 資料來源：台灣彩券官方 API https://api.taiwanlottery.com/TLCAPIWeB/Lottery/{Daily539Result|Lotto649Result}
const fs=require('fs'),path=require('path');const F=path.join(__dirname,'draws.json');
const API='https://api.taiwanlottery.com/TLCAPIWeB/Lottery/';
let cache=fs.existsSync(F)?JSON.parse(fs.readFileSync(F,'utf8')):{d539:[],lotto:[],updated:null};
const tpe=()=>new Date(Date.now()+8*3600e3);
const months=()=>{const d=tpe(),a=d.toISOString().slice(0,7);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-1);return [a,d.toISOString().slice(0,7)];};
async function get(kind,key){let out=[];for(const m of months()){const r=await fetch(`${API}${kind}?period&month=${m}&pageNum=1&pageSize=50`,{signal:AbortSignal.timeout(15000)});const j=await r.json();if(j.rtCode!==0)throw new Error('rtCode '+j.rtCode);out=out.concat(j.content[key]||[]);}
 return out.sort((a,b)=>b.period-a.period);}
async function refresh(){try{
 const a=await get('Daily539Result','daily539Res'),b=await get('Lotto649Result','lotto649Res');
 cache={replay:cache.replay,updated:new Date().toISOString(),
  d539:a.slice(0,20).map(x=>({period:x.period,date:x.lotteryDate.slice(0,10),nums:x.drawNumberSize})),
  lotto:b.slice(0,10).map(x=>({period:x.period,date:x.lotteryDate.slice(0,10),nums:x.drawNumberSize.slice(0,6).sort((p,q)=>p-q),special:x.drawNumberSize[6]}))};
 fs.writeFileSync(F,JSON.stringify(cache));console.log('draws updated',cache.d539[0]&&cache.d539[0].period);}catch(e){console.error('draws fetch failed:',e.message);}}
let last=0;function tick(){const d=tpe(),dow=d.getUTCDay(),hm=d.getUTCHours()*60+d.getUTCMinutes();
 const live=dow>=1&&dow<=6&&hm>=20*60+30&&hm<=22*60;if(live||Date.now()-last>3*3600e3){last=Date.now();refresh();}}
const CH='UCX9q-HI41sFuh1Gs5X_ZZCw';let vid={};
async function videos(){try{const x=await (await fetch('https://www.youtube.com/feeds/videos.xml?channel_id='+CH,{signal:AbortSignal.timeout(15000)})).text();
 const es=[...x.matchAll(/<entry>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>/g)].map(m=>({id:m[1],title:m[2]}));
 const r=es.find(e=>/彩券開獎/.test(e.title)&&!/發票/.test(e.title));if(r){vid=r;cache.replay=r;fs.writeFileSync(F,JSON.stringify(cache));}}catch(e){console.error('yt rss failed:',e.message);}}
exports.start=()=>{videos();setInterval(videos,15*60e3);last=Date.now();refresh();setInterval(tick,10*60e3);};
exports.get=()=>cache;
