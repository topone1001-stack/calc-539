// 越南 Vietlott：Power 6/55（週二四六）、Mega 6/45（週三五日），越南 18:00＝台北 19:00 開獎。
// 原則用官方 vietlott.vn；官方擋連線（Cloudflare 驗證）或解析不到時，才用 magayo.com 備援，並標示 src。
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const G={vn655:{n:6,sp:true,off:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-655',mg:'power-655'},
 vn645:{n:6,sp:false,off:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-645',mg:'mega-645'},
 // Lotto 5/35：每天 13:00、21:00（越南）各一期；5 碼 1–35＋特別號 1–12。官方頁格式未能驗證（被擋），目前由 magayo 兩個時段頁取得
 vn535:{n:5,sp:true,max:35,off:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/winning-number-535',mg:['lotto-535-1300','lotto-535-2100'],slots:['13','21']}};
G.vn655.max=55;G.vn645.max=45;
// 期別一律用開獎日期（5/35 再加時段 13/21），換來源不會變號；官方期號另存 no
const dkey=(d,slot)=>d.replace(/-/g,'')+(slot||'');
const spOk=v=>Number.isInteger(v)&&v>=1&&v<=55?v:null;
const valid=(x,g)=>x&&Array.isArray(x.nums)&&x.nums.length===G[g].n&&new Set(x.nums).size===x.nums.length&&x.nums.every(n=>Number.isInteger(n)&&n>=1&&n<=G[g].max);
const p2=n=>String(n).padStart(2,'0');
const get=async u=>{const r=await fetch(u,{headers:{'User-Agent':UA,'Accept':'text/html'},signal:AbortSignal.timeout(20000)});const t=await r.text();if(!r.ok||/Just a moment|cf-mitigated|challenge-platform/i.test(t))throw new Error('blocked '+r.status);return t;};
// 官方頁：期別 #0xxxx、日期 dd/mm/yyyy、號碼 <span class="bong_tron">NN</span>
function parseOfficial(t,g){const out=[];const re=/(\d{2})\/(\d{2})\/(\d{4})[\s\S]{0,400}?#?0*(\d{4,6})[\s\S]{0,800}?((?:<span[^>]*bong_tron[^>]*>\s*\d{2}\s*<\/span>[\s\S]{0,80}?){6,7})/g;let m;
 while((m=re.exec(t))&&out.length<30){const b=(m[5].match(/>\s*(\d{2})\s*</g)||[]).map(x=>+x.replace(/\D/g,''));if(b.length<6)continue;
  const date=`${m[3]}-${m[2]}-${m[1]}`;out.push({period:dkey(date),no:String(m[4]).padStart(5,'0'),date,nums:b.slice(0,6).sort((a,c)=>a-c),special:G[g].sp&&b.length>6?spOk(b[6]):null});}return out.filter(x=>valid(x,g));}
// magayo：最新一期（球號圖片）＋近期列表（文字）
function parseMagayo(t,g,slot){const N=G[g].n;const out=[];const D=s=>{const m=s.match(/(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日/);return m&&`${m[1]}-${p2(m[2])}-${p2(m[3])}`;};
 const i=t.indexOf('<h3>最新');if(i>=0){const blk=t.slice(i,i+3000),d=D(blk),M=[...blk.matchAll(/p1=M&amp;p2=(\d+)/g)].map(x=>+x[1]),B=blk.match(/p1=B&amp;p2=(\d+)/);
  if(d&&M.length===N)out.push({date:d,nums:M.sort((a,c)=>a-c),special:G[g].sp&&B?spOk(+B[1]):null});}
 for(const r of t.matchAll(/<div class="col-md-4">([^<]+)<\/div><div class="col-md">([^<]+)<\/div>/g)){const d=D(r[1]);if(!d)continue;const [a,b]=r[2].split('特別號碼');const nums=(a.match(/\d+/g)||[]).map(Number);if(nums.length!==N)continue;
  out.push({date:d,nums:nums.sort((x,y)=>x-y),special:G[g].sp&&b?spOk(+(b.match(/\d+/)||[])[0]):null});}
 const seen=new Set();return out.filter(x=>!seen.has(x.date)&&seen.add(x.date)).map(x=>({period:dkey(x.date,slot),...x})).filter(x=>valid(x,g)).slice(0,30);}
const MG='https://www.magayo.com/zht/lotto-results/vietnam/';
async function fetchGame(g){try{const t=await get(G[g].off);if(g==='vn535')throw new Error('official 5/35 format unverified');const h=parseOfficial(t,g);if(h.length)return {src:'official',hist:h};throw new Error('parse');}
 catch(e){let h=[];if(Array.isArray(G[g].mg)){for(let i=0;i<G[g].mg.length;i++){try{h=h.concat(parseMagayo(await get(MG+G[g].mg[i]+'/'),g,G[g].slots[i]));}catch(e2){console.error('vn magayo',G[g].mg[i],e2.message);}}}
  else h=parseMagayo(await get(MG+G[g].mg+'/'),g);if(!h.length)throw new Error('magayo parse');return {src:'magayo',why:e.message,hist:h};}}
// 合併新舊資料：以期別（日期）為鍵，新的優先；保留最近 30 期
const merge=(a,b)=>{const m=new Map();for(const x of [...(b||[]),...(a||[])])m.set(String(x.period),x);return [...m.values()].sort((x,y)=>String(y.period).localeCompare(String(x.period))).slice(0,30);};
async function refreshVN(cur,save,store){const C=()=>typeof cur==='function'?cur():cur;for(const g of Object.keys(G)){try{const r=await fetchGame(g);const old=(C()[g]||{}).hist||[];const hist=merge(r.hist,old.filter(x=>/^\d{8}(\d{2})?$/.test(String(x.period))));C()[g]={updated:new Date().toISOString(),src:r.src,latest:hist[0],hist};console.log('vn updated',g,r.src,hist[0].period);if(store)try{await store(g,r.hist);}catch(e){console.error('vn store',g,e.message);}}catch(e){console.error('vn fetch failed',g,e.message);}}save();}
module.exports={refreshVN,parseOfficial,parseMagayo,merge,GAMES:G};
