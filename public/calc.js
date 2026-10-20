const _D={value:'0',textContent:'',innerHTML:'',append(){},set onclick(x){}},$=i=>document.getElementById(i)||_D,v=i=>Math.max(0,parseFloat($(i).value)||0),f=n=>Math.round(n).toLocaleString('zh-TW');
fetch('/me').then(r=>r.json()).then(d=>{$('who').textContent='👤 '+d.user;if(d.role==='admin'){const a=document.createElement('a');a.href='/admin';a.textContent=' ⚙️ 後台';a.style.color='#60a5fa';$('who').append(a);}});
function C(n,k){n=Math.floor(n);if(k>n)return 0;let r=1;for(let i=0;i<k;i++)r=r*(n-i)/(i+1);return Math.round(r);}
// 立柱: 從 k 個不同柱各取 1 號 → 柱大小的 k 次初等對稱多項式
function E(a,k){let e=[1];for(const x of a){const n=e.slice();n.push(0);for(let j=e.length;j>0;j--)n[j]=(n[j]||0)+e[j-1]*x;e=n;}return e[k]||0;}
let cols=[3,3];function drawCols(){$('cols').innerHTML='';cols.forEach((c,i)=>{const d=document.createElement('div');d.style.display='flex';d.style.gap='6px';d.innerHTML=`<span style="align-self:center;width:60px">第${i+1}柱</span><input class="n" type="number" min="0" value="${c}"><button class="btn" style="width:60px;padding:6px;background:#475569">刪</button>`;d.querySelector('input').oninput=e=>{cols[i]=+e.target.value||0;calc();};d.querySelector('button').onclick=()=>{cols.splice(i,1);drawCols();};$('cols').append(d);});calc();}
$('addc').onclick=()=>{cols.push(2);drawCols();};
const CAR=[{n:38,w:5300,o:4},{n:48,w:5700,o:5},{n:48,w:5700,o:5}];
function calc(){const n=v('pick');let tot=0;for(const k of[2,3,4]){const c=C(n,k);$('c'+k).textContent=f(c);const t=c*v('p'+k)*v('s'+k);$('t'+k).textContent=f(t);tot+=t;$('k'+k).textContent=f(E(cols,k));}
$('tt').textContent=f(tot);$('nc').textContent=cols.length;
CAR.forEach((c,i)=>{$('b'+i).textContent=f(c.n*100*v('v'+i));$('w'+i).textContent=f(c.w*c.o*v('v'+i));});
$('g3').textContent=f(v('g0')*v('g1')*v('g2'));
const h=Math.min(5,v('hit'),n);let win=0;for(const k of[2,3,4]){const hc=C(h,k);$('h'+k).textContent=f(hc);const j=hc*v('r'+k)*v('s'+k);$('j'+k).textContent=f(j);win+=j;}$('net').textContent=f(win-tot);}
document.querySelectorAll('input').forEach(i=>i.oninput=calc);drawCols();
// ---- 開獎結果（台灣彩券官方資料，由伺服器快取）----
let LAST=null;const pad=n=>String(n).padStart(2,'0'),balls=(a,hit=[],sp)=>a.map(n=>`<span class="ball${hit.includes(n)?' hit':''}">${pad(n)}</span>`).join('')+(sp!=null?`<span class="ball sp">${pad(sp)}</span>`:'');
function mine(){const el=document.getElementById('mine');if(!el)return[];return [...new Set((el.value.match(/\d+/g)||[]).map(Number).filter(n=>n>=1&&n<=39))];}
function drawBox(d){const b=document.getElementById('draws');if(!b)return;const L=d.d539[0];const gs=document.getElementById('game');LAST=gs&&gs.value==='ca'?(d.ca&&d.ca.latest):L;if(!L){b.innerHTML='<p class="note">暫時取不到開獎資料</p>';return;}
 const gm=document.getElementById('game'),is539=!gm||gm.value==='539',m=mine(),hit=is539?L.nums.filter(n=>m.includes(n)):[],lo=d.lotto&&d.lotto[0];
 b.classList.add('g539');b.innerHTML=`<span class="gb">今彩539</span> <b>最新開獎</b>　第 ${L.period} 期　${L.date}<div>${balls(L.nums,hit)}</div>`+
 (lo?`<div style="margin-top:6px"><b>大樂透</b>　第 ${lo.period} 期　${lo.date}<div>${balls(lo.nums,[],lo.special)}</div></div>`:'')+
 `<details><summary><span class="gb">539</span> 近期開獎</summary><table class="hist">${d.d539.map(x=>`<tr><td>${x.period}</td><td>${x.date}</td><td>${x.nums.map(pad).join(' ')}</td></tr>`).join('')}</table></details>`+
 `<p class="note">資料來源：台灣彩券官方網站｜更新：${d.updated?new Date(d.updated).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'—'}</p>`;caBox(d.ca,is539?[]:m);}
let DD=null;function loadDraws(){fetch('/draws').then(r=>r.json()).then(d=>{DD=d;drawBox(d);markMine();});}
function markMine(){const el=document.getElementById('mine'),out=document.getElementById('mres');if(!el||!LAST)return;const m=mine();if(!m.length){out.textContent='';return;}
 const hit=LAST.nums.filter(n=>m.includes(n));out.textContent=`對照${(document.getElementById("game")||{}).value==="ca"?"加州天天樂":"539"} 第 ${LAST.period} 期：中 ${hit.length} 顆（${hit.map(pad).join(' ')||'無'}）`;
 const h=document.getElementById('hit');if(h){h.value=hit.length;}const p=document.getElementById('pick');if(p&&m.length&&+p.value<m.length){p.value=m.length;}calc();if(DD)drawBox(DD);}
{const el=document.getElementById('mine');if(el)el.oninput=markMine;}
setInterval(()=>loadDraws(),5*60e3);
// ---- 開獎直播：YouTube 全民i彩券 官方嵌入 ----
const YT_CH='UCX9q-HI41sFuh1Gs5X_ZZCw',YT_PL='PLkPNE4sIKVw9_RAzjrgBhmp0S2YNsVnSH';let liveMode=null;
function liveWindow(){const t=new Date(Date.now()+8*3600e3),d=t.getUTCDay(),m=t.getUTCHours()*60+t.getUTCMinutes();if(!(d>=1&&d<=6&&m>=20*60+25&&m<=20*60+45))return false;const td=t.toISOString().slice(0,10);return !(DD&&DD.d539&&DD.d539[0]&&DD.d539[0].date===td);}
function drawLive(force){const b=document.getElementById('livebox');if(!b)return;const live=force!=null?force:liveWindow();const rp=DD&&DD.replay;liveMode=live;
 const src=live?`https://www.youtube.com/embed/live_stream?channel=${YT_CH}&autoplay=0`:(rp?`https://www.youtube.com/embed/${rp.id}`:`https://www.youtube.com/embed/videoseries?list=${YT_PL}`);
 b.innerHTML=`<p class="note">${live?'🔴 直播時段（20:25–20:45，開獎結果出來即切回重播）：顯示目前直播（若尚未開始會顯示待播畫面）':'目前非直播時段，顯示最新開獎重播'+(rp?'：'+rp.title:'')}</p>
 <div class="vw"><iframe src="${src}" title="開獎直播" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
 <a class="vbtn" href="#" id="lsw">${live?'改看最新重播':'改看直播'}</a><a class="vbtn" target="_blank" rel="noopener" href="https://www.youtube.com/@48ilottery48/streams">YouTube 頻道</a><a class="vbtn" target="_blank" rel="noopener" href="https://www.youtube.com/playlist?list=${YT_PL}">開獎直播清單</a>`;
 document.getElementById('lsw').onclick=e=>{e.preventDefault();drawLive(!liveMode);};}
{const _l=loadDraws;let first=true;loadDraws=function(){fetch('/draws').then(r=>r.json()).then(d=>{DD=d;drawBox(d);markMine();const w=liveWindow();if(first||w!==window._lw){first=false;window._lw=w;drawLive();}});};loadDraws();}

// ---- 加州天天樂 ----
function caBox(c,m){let b=document.getElementById('cabox');const d=document.getElementById('draws');if(!d)return;if(!b){b=document.createElement('div');b.id='cabox';b.className='drawbox gca';d.after(b);}
 if(!c||!c.latest){b.innerHTML='<b>加州天天樂</b><p class="note">暫時取不到開獎資料</p>';return;}const L=c.latest,usd=n=>n==null?'—':'US$'+Number(n).toLocaleString('en-US');
 b.innerHTML=`<span class="gb">加州天天樂</span> <b>Fantasy 5 最新開獎</b>　第 ${L.period} 期　${L.date}<div>${balls(L.nums,L.nums.filter(n=>m.includes(n)))}</div>`+
 
 `<details><summary>獎金表（第 ${L.period} 期）</summary><table class="prz"><tr><th>中獎</th><th>注數</th><th>每注</th></tr>${c.prizes.map(p=>`<tr><td>${p.desc.replace(/Matched (\d) of 5 numbers/,'中 $1 個')}</td><td>${Number(p.count).toLocaleString()}</td><td>${usd(p.amount)}</td></tr>`).join('')}</table></details>`+
 `<details><summary>近 20 期開獎</summary><table class="hist">${c.hist.map(x=>`<tr><td>${x.period}</td><td>${x.date}</td><td>${x.nums.map(pad).join(' ')}</td></tr>`).join('')}</table></details>`+
 `<p class="note">📺 開獎時間台北約 09:30（11/1 起約 10:30）｜號碼以官方網站公布為準｜<a target="_blank" rel="noopener" href="https://www.calottery.com/draw-games/fantasy-5" style="color:#60a5fa">官方網站</a>｜資料來源：California Lottery｜更新：${new Date(c.updated).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>`;}
{const g=document.getElementById('game');if(g)g.onchange=()=>{if(DD)drawBox(DD);markMine();};}

function gameTheme(){const g=document.getElementById('game');document.documentElement.dataset.game=g?g.value:'539';}
{const g=document.getElementById('game');if(g){g.addEventListener('change',gameTheme);}gameTheme();}
// ---- 多遊戲面板（覆寫前面的 drawBox/caBox/mine/markMine）----
const GAMES={'539':{name:'今彩539',cls:'g539',max:39,src:'台灣彩券'},lotto:{name:'大樂透',cls:'glo',max:49,sp:'特別號',src:'台灣彩券'},super:{name:'威力彩',cls:'gsu',max:38,sp:'第二區',src:'台灣彩券'},ca:{name:'加州天天樂',cls:'gca',max:39,src:'California Lottery'},hk:{name:'香港六合彩',cls:'ghk',max:49,sp:'特別號',src:'香港賽馬會'}};
const curGame=()=>{const g=document.getElementById('game');return g?g.value:'539';};
function gameData(k,d){d=d||DD||{};if(k==='539')return {latest:d.d539&&d.d539[0],hist:d.d539||[],updated:d.updated};if(k==='lotto')return {latest:d.lotto&&d.lotto[0],hist:d.lotto||[],updated:d.updated};if(k==='super')return {latest:d.super&&d.super[0],hist:d.super||[],updated:d.updated};const c=d[k];return c?{...c}:{hist:[]};}
function mine(){const el=document.getElementById('mine');if(!el)return[];const mx=GAMES[curGame()].max;return [...new Set((el.value.match(/\d+/g)||[]).map(Number).filter(n=>n>=1&&n<=mx))];}
const fmt=n=>n==null||n===''?'—':Number(n).toLocaleString('zh-TW');
function panel(k,d,extra,note){const G=GAMES[k],x=gameData(k,d),L=x.latest;const id='pn-'+k;let b=document.getElementById(id);
 if(!b){b=document.createElement('div');b.id=id;b.className='drawbox '+G.cls;const t=document.querySelector('.tops');(t||document.getElementById('draws').parentNode).append(b);}
 if(!L){b.innerHTML=`<span class="gb">${G.name}</span><p class="note">暫時取不到開獎資料</p>`;return;}
 const m=curGame()===k?mine():[],hit=L.nums.filter(n=>m.includes(n));
 b.innerHTML=`<span class="gb">${G.name}</span> <b>最新開獎</b>　第 ${L.period} 期　${L.date}<div>${balls(L.nums,hit,L.special)}${L.special!=null?`<span class="splabel">${G.sp}</span>`:''}</div>${extra||''}`+
 `<details><summary>近 ${x.hist.length} 期開獎</summary><table class="hist">${x.hist.map(h=>`<tr><td>${h.period}</td><td>${h.date}</td><td>${h.nums.map(pad).join(' ')}${h.special!=null?' ＋'+pad(h.special):''}</td></tr>`).join('')}</table></details>`+
 `<p class="note">${note?note+'｜':''}資料來源：${G.src}${x.updated?'｜更新：'+new Date(x.updated).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):''}</p>`;}
function drawBox(d){const old=document.getElementById('draws');if(!old)return;old.style.display='none';
 panel('539',d,'','每週一至六 20:30 開獎（全民i彩券直播）');
 panel('lotto',d,'','每週二、五 20:30 開獎（同上直播）');
 panel('super',d,'','每週一、四 20:30 開獎（同上直播）');
 const c=d.ca;panel('ca',d,c?`<details><summary>獎金表</summary><table class="prz"><tr><th>中獎</th><th>注數</th><th>每注</th></tr>${(c.prizes||[]).map(p=>`<tr><td>${p.desc.replace(/Matched (\d) of 5 numbers/,'中 $1 個')}</td><td>${fmt(p.count)}</td><td>US$${fmt(p.amount)}</td></tr>`).join('')}</table></details>`:'',
  '📺 開獎時間台北約 09:30（11/1 起約 10:30）｜號碼以官方網站公布為準｜<a target="_blank" rel="noopener" href="https://www.calottery.com/draw-games/fantasy-5" style="color:#60a5fa">官方網站</a>');
 const h=d.hk;panel('hk',d,h?`<p class="note">投注額 HK$${fmt(h.turnover)}${h.latest&&h.latest.snowball?'｜'+h.latest.snowball:''}</p><details><summary>派彩表</summary><table class="prz"><tr><th>獎項</th><th>中獎注數</th><th>每注派彩</th></tr>${(h.prizes||[]).map(p=>`<tr><td>${p.name}</td><td>${fmt(p.units)}</td><td>HK$${fmt(p.dividend)}</td></tr>`).join('')}</table></details>`:'',
  '📺 開獎：每週二、四、六或日 21:30（香港＝台北時間）｜號碼以官方網站公布為準｜<a target="_blank" rel="noopener" href="https://bet.hkjc.com/ch/marksix/results" style="color:#d8b4fe">馬會官方結果</a>');
 const cb=document.getElementById('cabox');if(cb)cb.remove();
 LAST=gameData(curGame(),d).latest||null;}
function caBox(){}
function markMine(){const el=document.getElementById('mine'),out=document.getElementById('mres');const k=curGame();LAST=gameData(k).latest;if(!el||!LAST){if(out)out.textContent='';return;}const m=mine();
 if(!m.length){out.textContent='';if(DD)drawBox(DD);return;}const hit=LAST.nums.filter(n=>m.includes(n)),sp=LAST.special!=null&&m.includes(LAST.special);
 out.textContent=`對照${GAMES[k].name} 第 ${LAST.period} 期：中 ${hit.length} 顆（${hit.map(pad).join(' ')||'無'}）`+(sp?`＋${GAMES[k].sp} ${pad(LAST.special)}`:'');
 const hh=document.getElementById('hit');if(hh)hh.value=Math.min(5,hit.length);const p=document.getElementById('pick');if(p&&+p.value<m.length)p.value=m.length;calc();if(DD)drawBox(DD);}
{const g=document.getElementById('game');if(g)g.onchange=()=>{gameTheme();if(DD)drawBox(DD);markMine();};}
