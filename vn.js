// 越南 Vietlott：Power 6/55（週二四六）、Mega 6/45（週三五日），越南 18:00＝台北 19:00 開獎。
// 原則用官方 vietlott.vn；官方擋連線（Cloudflare 驗證）或解析不到時，才用 magayo.com 備援，並標示 src。
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const G={vn655:{n:6,sp:true,off:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-655',mg:'power-655'},
 vn645:{n:6,sp:false,off:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-645',mg:'mega-645'}};
const p2=n=>String(n).padStart(2,'0');
const get=async u=>{const r=await fetch(u,{headers:{'User-Agent':UA,'Accept':'text/html'},signal:AbortSignal.timeout(20000)});const t=await r.text();if(!r.ok||/Just a moment|cf-mitigated|challenge-platform/i.test(t))throw new Error('blocked '+r.status);return t;};
// 官方頁：期別 #0xxxx、日期 dd/mm/yyyy、號碼 <span class="bong_tron">NN</span>
function parseOfficial(t,g){const out=[];const re=/(\d{2})\/(\d{2})\/(\d{4})[\s\S]{0,400}?#?0*(\d{4,6})[\s\S]{0,800}?((?:<span[^>]*bong_tron[^>]*>\s*\d{2}\s*<\/span>[\s\S]{0,80}?){6,7})/g;let m;
 while((m=re.exec(t))&&out.length<20){const b=(m[5].match(/>\s*(\d{2})\s*</g)||[]).map(x=>+x.replace(/\D/g,''));if(b.length<6)continue;
  out.push({period:String(m[4]).padStart(5,'0'),date:`${m[3]}-${m[2]}-${m[1]}`,nums:b.slice(0,6).sort((a,c)=>a-c),special:G[g].sp&&b.length>6?b[6]:null});}return out;}
// magayo：最新一期（球號圖片）＋近期列表（文字）
function parseMagayo(t,g){const out=[];const D=s=>{const m=s.match(/(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日/);return m&&`${m[1]}-${p2(m[2])}-${p2(m[3])}`;};
 const i=t.indexOf('<h3>最新');if(i>=0){const blk=t.slice(i,i+3000),d=D(blk),M=[...blk.matchAll(/p1=M&amp;p2=(\d+)/g)].map(x=>+x[1]),B=blk.match(/p1=B&amp;p2=(\d+)/);
  if(d&&M.length===6)out.push({date:d,nums:M.sort((a,c)=>a-c),special:G[g].sp&&B?+B[1]:null});}
 for(const r of t.matchAll(/<div class="col-md-4">([^<]+)<\/div><div class="col-md">([^<]+)<\/div>/g)){const d=D(r[1]);if(!d)continue;const [a,b]=r[2].split('特別號碼');const nums=(a.match(/\d+/g)||[]).map(Number);if(nums.length!==6)continue;
  out.push({date:d,nums:nums.sort((x,y)=>x-y),special:G[g].sp&&b?+(b.match(/\d+/)||[])[0]:null});}
 const seen=new Set();return out.filter(x=>!seen.has(x.date)&&seen.add(x.date)).slice(0,20).map(x=>({period:x.date.replace(/-/g,''),...x}));}
async function fetchGame(g){try{const h=parseOfficial(await get(G[g].off),g);if(h.length)return {src:'official',hist:h};throw new Error('parse');}
 catch(e){const h=parseMagayo(await get('https://www.magayo.com/zht/lotto-results/vietnam/'+G[g].mg+'/'),g);if(!h.length)throw new Error('magayo parse');return {src:'magayo',why:e.message,hist:h};}}
async function refreshVN(cur,save){const C=()=>typeof cur==='function'?cur():cur;for(const g of Object.keys(G)){try{const r=await fetchGame(g);C()[g]={updated:new Date().toISOString(),src:r.src,latest:r.hist[0],hist:r.hist};console.log('vn updated',g,r.src,r.hist[0].date);}catch(e){console.error('vn fetch failed',g,e.message);}}save();}
module.exports={refreshVN,parseOfficial,parseMagayo,GAMES:G};
