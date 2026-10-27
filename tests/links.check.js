// 「不要有按了沒反應」：public/ 內所有對外連結都要打得開（2xx/3xx），外部連結要開新分頁，
// 不可有空 href、href="#"（除非有對應 onclick）、javascript:，按鈕要有處理（id 在 JS 裡被用到、在 form 裡、或有 onclick）。
// 執行：node tests/links.check.js（每天由 GitHub 排程跑一次）
const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'..','public');
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const EXP={'%m':['power-655','mega-645','lotto-535-2100']};
const files=fs.readdirSync(dir).filter(f=>/\.(js|html)$/.test(f)).map(f=>[f,fs.readFileSync(path.join(dir,f),'utf8')]);const JS=files.map(x=>x[1]).join('\n');
let bad=0;const fail=(m)=>{bad++;console.log('FAIL',m);};
for(const [f,t] of files){
 for(const m of t.matchAll(/<a\s[^>]*>/g)){const a=m[0],h=(a.match(/href="([^"]*)"/)||[])[1];
  if(h==null||h===''||/^javascript:/i.test(h))fail(`${f} 空連結 ${a}`);
  else if(h==='#'){const id=(a.match(/id="([^"]+)"/)||[])[1];if(!id||!new RegExp(`getElementById\\('${id}'\\)\\.onclick|\\$\\('${id}'\\)\\.onclick`).test(JS))fail(`${f} href="#" 沒有點擊處理 ${a}`);}
  else if(/^https?:/.test(h)&&!/target="_blank"/.test(a))fail(`${f} 外部連結沒開新分頁 ${a}`);}
 if(f.endsWith('.html'))for(const m of t.matchAll(/<button([^>]*)>/g)){const a=m[1],id=(a.match(/id="([^"]+)"/)||[])[1];const inForm=t.lastIndexOf('<form',m.index)>t.lastIndexOf('</form>',m.index);
  if(!/onclick/.test(a)&&!inForm&&!(id&&JS.includes(id)))fail(`${f} 按鈕沒有處理 ${m[0]}`);}}
const urls=new Set();for(const [,t] of files)for(const m of t.matchAll(/href="(https?:\/\/[^"]+)"/g)){const u=m[1];if(u.includes('${'))continue;const k=Object.keys(EXP).find(k=>u.includes(k));if(k)EXP[k].forEach(v=>urls.add(u.replace(k,v)));else urls.add(u);}
(async()=>{for(const u of urls){let c;try{const r=await fetch(u,{headers:{'User-Agent':UA},redirect:'follow',signal:AbortSignal.timeout(20000)});c=r.status;}catch(e){c='ERR '+e.message;}
 const ok=typeof c==='number'&&c<400;if(!ok)fail(`${c} ${u}`);else console.log('OK  ',c,u);}
 console.log(bad?`\n${bad} 項有問題`:`\n${urls.size} 個對外連結全部可開，沒有空按鈕`);process.exit(bad?1:0);})();
