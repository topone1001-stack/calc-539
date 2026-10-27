// 越南各省彩（xổ số kiến thiết）：北部 1 場、中部、南部每天各 2–4 省。資料來源 xskt.com.vn（非官方開獎站，標示為備援）
// 只收「完整且格式正確」的一期（每個獎項個數與位數都對才寫入），直播中尚未開完的不收
const S=require('./store');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const REG={vnmb:{name:'越南北部各省彩',path:'xsmb',id:'MB0'},vnmt:{name:'越南中部各省彩',path:'xsmt',id:'MT0'},vnmn:{name:'越南南部各省彩',path:'xsmn',id:'MN0'}};
exports.REG=REG;
// 每個獎項 [個數, 位數]
const SPEC={vnmb:{DB:[1,5],G1:[1,5],G2:[2,5],G3:[6,5],G4:[4,4],G5:[6,4],G6:[3,3],G7:[4,2]},
 vnmn:{G8:[1,2],G7:[1,3],G6:[3,4],G5:[1,4],G4:[7,5],G3:[2,5],G2:[1,5],G1:[1,5],DB:[1,6]}};SPEC.vnmt=SPEC.vnmn;
exports.SPEC=SPEC;
const ORDER=['DB','G1','G2','G3','G4','G5','G6','G7','G8'];exports.ORDER=ORDER;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const strip=t=>t.replace(/<[^>]+>/g,' ');
const lab=t=>{t=strip(t).replace(/\s|\./g,'');if(/ĐB/.test(t))return 'DB';const m=t.match(/^G(\d)$/);return m?'G'+m[1]:null;};
function okPrizes(r,P){const sp=SPEC[r];for(const k of Object.keys(sp)){const v=P[k];if(!Array.isArray(v)||v.length!==sp[k][0]||!v.every(x=>new RegExp('^\\d{'+sp[k][1]+'}$').test(x)))return false;}return Object.keys(P).length===Object.keys(sp).length;}
exports.okPrizes=okPrizes;
// 解析 xskt 單日頁；date = 'YYYY-MM-DD'
function parse(r,html,date){const R=REG[r];const i=html.indexOf(`id="${R.id}"`);if(i<0)return [];const t=html.slice(i,html.indexOf('</table>',i));
 const [y,m,d]=date.split('-');if(!t.includes(`${d}-${m}-${y}`)&&!t.includes(`${d}/${m}`))return [];
 const rows=[...t.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(x=>x[1]);const out=[];
 if(r==='vnmb'){const pm=t.match(/\(([^)<]+)\)<\/b>/);const P={};for(const row of rows){const tds=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x=>x[1]);if(tds.length<2)continue;const k=lab(tds[0]);if(!k)continue;P[k]=(strip(tds[1]).match(/\d+/g)||[]);}
  if(okPrizes(r,P))out.push({region:r,date,prov:'Miền Bắc'+(pm?' ('+pm[1].trim()+')':''),prizes:P,src:'xskt'});return out;}
 const head=rows[0]||'';const provs=[...head.matchAll(/<th>\s*<a[^>]*>([^<]+)<\/a>/g)].map(x=>x[1].trim()).filter(x=>!/^Thứ|^Chủ/i.test(x));
 const P=provs.map(()=>({}));for(const row of rows.slice(1)){const tds=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x=>x[1]);const k=lab(tds[0]||'');if(!k)continue;tds.slice(1).forEach((c,j)=>{if(P[j])P[j][k]=strip(c.replace(/<br\s*\/?>/g,' ')).match(/\d+/g)||[];});}
 provs.forEach((p,j)=>{if(okPrizes(r,P[j]))out.push({region:r,date,prov:p,prizes:P[j],src:'xskt'});});return out;}
exports.parse=parse;
const fmtD=d=>{const [y,m,dd]=d.split('-');return `${+dd}-${+m}-${y}`;};
exports.url=(r,date)=>`https://xskt.com.vn/${REG[r].path}/ngay-${fmtD(date)}`;
async function fetchDay(r,date){const res=await fetch(exports.url(r,date),{headers:{'User-Agent':UA,Accept:'text/html'},signal:AbortSignal.timeout(20000)});if(!res.ok)throw new Error('xskt HTTP '+res.status);return parse(r,await res.text(),date);}
exports.fetchDay=fetchDay;
// 儲存：Postgres vnprov 表；沒有資料庫時只放記憶體
let mem={vnmb:[],vnmt:[],vnmn:[]},ver=0;const pool=()=>S.pg();
async function init(){if(!pool())return;await pool().query('CREATE TABLE IF NOT EXISTS vnprov(region text, ddate date, prov text, prizes jsonb NOT NULL, src text, PRIMARY KEY(region,ddate,prov))');await load();}
async function load(){if(!pool())return;const q=await pool().query("SELECT region,to_char(ddate,'YYYY-MM-DD') d,prov,prizes,src FROM vnprov ORDER BY ddate,prov");const m={vnmb:[],vnmt:[],vnmn:[]};for(const x of q.rows)if(m[x.region])m[x.region].push({date:x.d,prov:x.prov,prizes:x.prizes,src:x.src});mem=m;ver++;}
async function put(rows){let n=0;if(!rows.length)return 0;if(!pool()){for(const x of rows){const a=mem[x.region];if(!a.some(y=>y.date===x.date&&y.prov===x.prov)){a.push({date:x.date,prov:x.prov,prizes:x.prizes,src:x.src});n++;}a.sort((p,q)=>p.date<q.date?-1:p.date>q.date?1:p.prov<q.prov?-1:1);}if(n)ver++;return n;}
 for(const x of rows)n+=(await pool().query('INSERT INTO vnprov(region,ddate,prov,prizes,src) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[x.region,x.date,x.prov,JSON.stringify(x.prizes),x.src])).rowCount;if(n)await load();return n;}
const tpe=()=>new Date(Date.now()+8*3600e3);const dstr=d=>d.toISOString().slice(0,10);
const has=(r,date)=>mem[r].some(x=>x.date===date);
// 補歷史：每區最近 DAYS 天，缺哪天補哪天；每次請求間隔 1.2 秒，在背景跑，不擋網頁
const DAYS=+process.env.VNPROV_DAYS||120;let busy=false;
async function backfill(){if(busy)return;busy=true;let n=0;try{for(let i=1;i<=DAYS;i++){const date=dstr(new Date(tpe().getTime()-i*864e5));for(const r of Object.keys(REG)){if(has(r,date))continue;try{n+=await put(await fetchDay(r,date));}catch(e){console.error('vnprov',r,date,e.message);}await sleep(1200);}}}finally{busy=false;console.log('vnprov backfill done +',n);}}
// 今天：開獎時段（台北 17:10–20:00）每分鐘查，其餘每 30 分鐘
async function today(){const date=dstr(tpe());let n=0;for(const r of Object.keys(REG)){if(has(r,date))continue;try{n+=await put(await fetchDay(r,date));}catch(e){}await sleep(500);}if(n)console.log('vnprov today +',n);return n;}
exports.start=async()=>{try{await init();}catch(e){console.error('vnprov init',e.message);}setTimeout(()=>today().then(()=>backfill()).catch(e=>console.error('vnprov',e.message)),8000);
 setInterval(()=>{const d=tpe(),hm=d.getUTCHours()*60+d.getUTCMinutes();if((hm>=17*60+10&&hm<=20*60)||d.getUTCMinutes()%30===0)today();},60e3);setInterval(backfill,12*3600e3);};
exports.ver=()=>ver;
exports.data=(r,days)=>{const a=mem[r]||[];if(!days)return a;const ds=[...new Set(a.map(x=>x.date))].slice(-days);const s=new Set(ds);return a.filter(x=>s.has(x.date));};
exports.latest=()=>Object.fromEntries(Object.keys(REG).map(r=>{const a=mem[r];const d=a.length?a[a.length-1].date:null;return [r,{name:REG[r].name,date:d,rows:a.filter(x=>x.date===d),url:'https://xskt.com.vn/'+REG[r].path}];}));
