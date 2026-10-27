const _D={value:'0',textContent:'',innerHTML:'',append(){},set onclick(x){}},$=i=>document.getElementById(i)||_D,v=i=>Math.max(0,parseFloat($(i).value)||0),f=n=>Math.round(n).toLocaleString('zh-TW');
fetch('/me').then(r=>r.json()).then(d=>{$('who').textContent='👤 '+d.user;if(d.role==='admin'||d.role==='agent'){const a=document.createElement('a');a.href='/admin';a.textContent=' ⚙️ 後台';a.style.color='#60a5fa';$('who').append(a);}});
function C(n,k){n=Math.floor(n);if(k>n)return 0;let r=1;for(let i=0;i<k;i++)r=r*(n-i)/(i+1);return Math.round(r);}
// 立柱: 從 k 個不同柱各取 1 號 → 柱大小的 k 次初等對稱多項式
function E(a,k){let e=[1];for(const x of a){const n=e.slice();n.push(0);for(let j=e.length;j>0;j--)n[j]=(n[j]||0)+e[j-1]*x;e=n;}return e[k]||0;}
let cols=[3,3];function drawCols(){$('cols').innerHTML='';cols.forEach((c,i)=>{const d=document.createElement('div');d.style.display='flex';d.style.gap='6px';d.innerHTML=`<span style="align-self:center;width:60px">第${i+1}柱</span><input class="n" type="number" min="0" step="1" inputmode="numeric" value="${c}"><button class="btn" style="width:60px;padding:6px;background:#475569">刪</button>`;{const inp=d.querySelector('input'),fix=x=>Math.max(0,Math.floor(+x||0));inp.oninput=e=>{cols[i]=fix(e.target.value);calc();};inp.onchange=e=>{cols[i]=fix(e.target.value);e.target.value=cols[i];calc();};}d.querySelector('button').onclick=()=>{cols.splice(i,1);drawCols();};$('cols').append(d);});calc();}
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
 b.classList.add('g539');b.innerHTML=`<span class="gb">今彩539</span> <b>最新開獎</b>　第 ${ESC(L.period)} 期　${ESC(L.date)}<div>${balls(L.nums,hit)}</div>${ordLine(L)}`+
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
 const src=live?`https://www.youtube.com/embed/live_stream?channel=${YT_CH}&autoplay=0`:(rp?`https://www.youtube.com/embed/${rp.id}?start=${rp.start||0}`:`https://www.youtube.com/embed/videoseries?list=${YT_PL}`);
 b.innerHTML=`<p class="note">${live?'🔴 直播時段（20:25–20:45，開獎結果出來即切回重播）：顯示目前直播（若尚未開始會顯示待播畫面）':'目前非直播時段，顯示最新開獎重播'+(rp?'：'+rp.title+(rp.start?`（已跳到 20:30 開播，片頭略過 ${Math.floor(rp.start/60)} 分 ${rp.start%60} 秒）`:''):'')}</p>
 <div class="vw"><iframe src="${src}" title="開獎直播" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
 <a class="vbtn" href="#" id="lsw">${live?'改看最新重播':'改看直播'}</a><a class="vbtn" target="_blank" rel="noopener" href="https://www.youtube.com/@48ilottery48/streams">YouTube 頻道</a><a class="vbtn" target="_blank" rel="noopener" href="https://www.youtube.com/playlist?list=${YT_PL}">開獎直播清單</a>`;
 document.getElementById('lsw').onclick=e=>{e.preventDefault();drawLive(!liveMode);};}
{const _l=loadDraws;let first=true;loadDraws=function(){fetch('/draws').then(r=>r.json()).then(d=>{DD=d;drawBox(d);markMine();const w=liveWindow();if(first||w!==window._lw){first=false;window._lw=w;drawLive();}});};loadDraws();}

// ---- 加州天天樂 ----
function caBox(c,m){let b=document.getElementById('cabox');const d=document.getElementById('draws');if(!d)return;if(!b){b=document.createElement('div');b.id='cabox';b.className='drawbox gca';d.after(b);}
 if(!c||!c.latest){b.innerHTML='<b>加州天天樂</b><p class="note">暫時取不到開獎資料</p>';return;}const L=c.latest,usd=n=>n==null?'—':'US$'+Number(n).toLocaleString('en-US');
 b.innerHTML=`<span class="gb">加州天天樂</span> <b>Fantasy 5 最新開獎</b>　第 ${L.period} 期　${L.date}<div>${balls(L.nums,L.nums.filter(n=>m.includes(n)))}</div>${ordLine(L)}`+
 
 `<details><summary>獎金表（第 ${L.period} 期）</summary><table class="prz"><tr><th>中獎</th><th>注數</th><th>每注</th></tr>${c.prizes.map(p=>`<tr><td>${p.desc.replace(/Matched (\d) of 5 numbers/,'中 $1 個')}</td><td>${Number(p.count).toLocaleString()}</td><td>${usd(p.amount)}</td></tr>`).join('')}</table></details>`+
 `<details><summary>近 20 期開獎</summary><table class="hist">${c.hist.map(x=>`<tr><td>${x.period}</td><td>${x.date}</td><td>${x.nums.map(pad).join(' ')}</td></tr>`).join('')}</table></details>`+
 `<p class="note">📺 開獎時間台北約 09:30（11/1 起約 10:30）｜號碼以加州彩券公布為準｜<a target="_blank" rel="noopener" href="https://www.lotterywang.com/lottoCA5" style="color:#60a5fa">加州開獎結果</a>｜資料來源：${(c.latest&&c.latest.src||c.src)==='official'?'California Lottery 官方':(c.latest&&c.latest.src||c.src)==='lotteryusa'?'lotteryusa.com（備援，請以官方為準）':'—'}｜更新：${new Date(c.updated).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>`;}
{const g=document.getElementById('game');if(g)g.onchange=()=>{if(DD)drawBox(DD);markMine();};}

function gameTheme(){const g=document.getElementById('game');document.documentElement.dataset.game=g?g.value:'539';}
{const g=document.getElementById('game');if(g){g.addEventListener('change',gameTheme);}gameTheme();}
// ---- 多遊戲面板（覆寫前面的 drawBox/caBox/mine/markMine）----
const GAMES={'539':{name:'今彩539',cls:'g539',max:39,src:'台灣彩券'},lotto:{name:'大樂透',cls:'glo',max:49,sp:'特別號',src:'台灣彩券'},super:{name:'威力彩',cls:'gsu',max:38,sp:'第二區',src:'台灣彩券'},ca:{name:'加州天天樂',cls:'gca',max:39,src:'California Lottery'},hk:{ordSrc:'biga（非官方）',name:'香港六合彩',cls:'ghk',max:49,sp:'特別號',src:'香港賽馬會'},vn655:{name:'越南 Power 6/55',cls:'gvn',max:55,sp:'特別號',src:'Vietlott'},vn645:{name:'越南 Mega 6/45',cls:'gvn',max:45,src:'Vietlott'},vn535:{name:'越南 Lotto 5/35',cls:'gvn',max:35,sp:'特別號',src:'Vietlott'}};
const ESC=x=>String(x==null?'':x).replace(/[&<>"'`]/g,c=>'&#'+c.charCodeAt(0)+';');
// 落球順序：只有官方有提供的彩種（台灣彩券）才顯示，沒有就標明
const ordLine=(L,os)=>Array.isArray(L.order)&&L.order.length?`<div class="ordrow"><span class="ordlb">落球順序</span>${L.order.map((n,i)=>`<span class="ball mini">${pad(n)}</span>`).join('')}${L.special!=null?`<span class="ball sp mini">${pad(L.special)}</span>`:''}</div>${os?`<div class="note">落球順序來源：${ESC(os)}</div>`:''}`:'<div class="note">來源未提供落球順序</div>';
const curGame=()=>{const g=document.getElementById('game');return g?g.value:'539';};
function gameData(k,d){d=d||DD||{};if(k==='539')return {latest:d.d539&&d.d539[0],hist:d.d539||[],updated:d.updated};if(k==='lotto')return {latest:d.lotto&&d.lotto[0],hist:d.lotto||[],updated:d.updated};if(k==='super')return {latest:d.super&&d.super[0],hist:d.super||[],updated:d.updated};const c=d[k];return c?{...c}:{hist:[]};}
function mine(){const el=document.getElementById('mine');if(!el)return[];const mx=GAMES[curGame()].max;return [...new Set((el.value.match(/\d+/g)||[]).map(Number).filter(n=>n>=1&&n<=mx))];}
const fmt=n=>n==null||n===''?'—':Number(n).toLocaleString('zh-TW');
function panel(k,d,extra,note){const G=GAMES[k],x=gameData(k,d),L=x.latest;const id='pn-'+k;let b=document.getElementById(id);
 if(!b){b=document.createElement('div');b.id=id;b.className='drawbox '+G.cls;const t=document.querySelector('.tops');(t||document.getElementById('draws').parentNode).append(b);}
 if(!L){b.innerHTML=`<div class="dh"><span class="gb">${G.name}</span></div><p class="note">暫時取不到開獎資料</p>`;return;}
 const m=curGame()===k?mine():[],hit=L.nums.filter(n=>m.includes(n));
 b.innerHTML=`<div class="dh"><span class="gb">${G.name}</span><span class="per">第 ${ESC(L.period)} 期</span></div><div class="dd">最新開獎・${ESC(L.date)}</div><div class="brow">${balls(L.nums,hit,L.special)}${L.special!=null?`<span class="splabel">${G.sp}</span>`:''}</div>${ordLine(L,G.ordSrc)}${extra||''}`+
 `<details><summary>近 ${x.hist.length} 期開獎</summary><table class="hist">${x.hist.map(h=>`<tr><td>${ESC(h.period)}</td><td>${ESC(h.date)}</td><td>${h.nums.map(pad).join(' ')}${h.special!=null?' ＋'+pad(h.special):''}</td></tr>`).join('')}</table></details>`+
 metaBox(note,'資料來源：'+srcLabel(k,G,L,x),x.updated?'更新：'+new Date(x.updated).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'');}
// 資料來源：以「最新一期」實際抓到的來源為準（每期存 src），沒有就用整包的 src；台彩、六合彩只抓官方
const ALT={lotteryusa:'lotteryusa.com',magayo:'magayo.com',xoso:'xoso.com.vn'};
function srcLabel(k,G,L,x){const s=(L&&L.src)||x.src||(['539','lotto','super','hk'].includes(k)?'official':'');return s==='official'?G.src+' 官方':ALT[s]?ALT[s]+'（備援，請以官方為準）':'來源未標示（請以官方為準）';}
// 卡片底部說明：拆成短的小灰字行（開獎時間／號碼與連結／資料來源／更新時間）
function metaBox(note,src,upd){const seg=(note||'').split('｜').filter(Boolean),t=seg.filter(x=>/開獎/.test(x)&&!x.includes('href=')),o=seg.filter(x=>!t.includes(x));
 return `<div class="meta">${t.map(x=>`<div>${x}</div>`).join('')}${o.length?`<div>${o.join('・')}</div>`:''}<div>${src}</div>${upd?`<div>${upd}</div>`:''}</div>`;}
function drawBox(d){const old=document.getElementById('draws');if(!old)return;old.style.display='none';
 panel('539',d,'','每週一至六 20:30 開獎（全民i彩券直播）｜號碼以官方網站公布為準｜<a target="_blank" rel="noopener" href="https://www.taiwanlottery.com/" style="color:#fdba74">台灣彩券官網</a>');
 panel('lotto',d,'','每週二、五 20:30 開獎（同上直播）｜號碼以官方網站公布為準｜<a target="_blank" rel="noopener" href="https://www.taiwanlottery.com/" style="color:#fdba74">台灣彩券官網</a>');
 panel('super',d,'','每週一、四 20:30 開獎（同上直播）｜號碼以官方網站公布為準｜<a target="_blank" rel="noopener" href="https://www.taiwanlottery.com/" style="color:#fdba74">台灣彩券官網</a>');
 const c=d.ca;panel('ca',d,c?`<details><summary>獎金表</summary><table class="prz"><tr><th>中獎</th><th>注數</th><th>每注</th></tr>${(c.prizes||[]).map(p=>`<tr><td>${p.desc.replace(/Matched (\d) of 5 numbers/,'中 $1 個')}</td><td>${fmt(p.count)}</td><td>US$${fmt(p.amount)}</td></tr>`).join('')}</table></details>`:'',
  '📺 開獎時間台北約 09:30（11/1 起約 10:30）｜號碼以加州彩券公布為準｜<a target="_blank" rel="noopener" href="https://www.lotterywang.com/lottoCA5" style="color:#60a5fa">加州開獎結果</a>');
 const h=d.hk;panel('hk',d,h?`<p class="note">投注額 HK$${fmt(h.turnover)}${h.latest&&h.latest.snowball?'｜'+h.latest.snowball:''}</p><details><summary>派彩表</summary><table class="prz"><tr><th>獎項</th><th>中獎注數</th><th>每注派彩</th></tr>${(h.prizes||[]).map(p=>`<tr><td>${p.name}</td><td>${fmt(p.units)}</td><td>HK$${fmt(p.dividend)}</td></tr>`).join('')}</table></details>`:'',
  '📺 開獎：每週二、四、六或日 21:30（香港＝台北時間）｜號碼以官方網站公布為準｜<a target="_blank" rel="noopener" href="https://bet.hkjc.com/ch/marksix/results" style="color:#d8b4fe">馬會官方結果</a>');
 const VL='｜號碼以 Vietlott 官方公布為準｜<a target="_blank" rel="noopener" href="https://www.magayo.com/zht/lotto-results/vietnam/%m/" style="color:#4ade80">越南開獎結果</a>';
 panel('vn655',d,'','📺 開獎：每週二、四、六 台北 19:00（越南 18:00）'+VL.replace('%m','power-655'));
 panel('vn645',d,'','📺 開獎：每週三、五、日 台北 19:00（越南 18:00）'+VL.replace('%m','mega-645'));
 panel('vn535',d,'','📺 開獎：每天 台北 14:00、22:00（越南 13:00、21:00）'+VL.replace('%m','lotto-535-2100'));
 const cb=document.getElementById('cabox');if(cb)cb.remove();
 LAST=gameData(curGame(),d).latest||null;}
function caBox(){}
function markMine(){const el=document.getElementById('mine'),out=document.getElementById('mres');const k=curGame();LAST=gameData(k).latest;if(!el||!LAST){if(out)out.textContent='';return;}const m=mine();
 if(!m.length){out.textContent='';if(DD)drawBox(DD);return;}const hit=LAST.nums.filter(n=>m.includes(n)),sp=LAST.special!=null&&m.includes(LAST.special);
 out.textContent=`對照${GAMES[k].name} 第 ${LAST.period} 期：中 ${hit.length} 顆（${hit.map(pad).join(' ')||'無'}）`+(sp?`＋${GAMES[k].sp} ${pad(LAST.special)}`:'');
 const hh=document.getElementById('hit');if(hh)hh.value=Math.min(5,hit.length);const p=document.getElementById('pick');if(p&&+p.value<m.length)p.value=m.length;calc();if(DD)drawBox(DD);}
{const g=document.getElementById('game');if(g)g.onchange=()=>{gameTheme();if(DD)drawBox(DD);markMine();};}
// ---- 頂部：統計連結、開獎倒數、我的號碼對獎、接收統計頁選號 ----
(function(){const t=document.querySelector('.tops');if(!t)return;const bar=document.createElement('div');bar.id='topbar';t.before(bar);
 bar.innerHTML='<div class="drawbox" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><a href="/stats" class="btn" style="width:auto;padding:8px 14px;text-decoration:none">📊 統計分析／歷史／我的號碼</a><span id="cd" style="font-size:14px"></span></div><div id="myck"></div>';
 const TPE=8*3600e3;function laOffset(d){const s=d.toLocaleString('en-US',{timeZone:'America/Los_Angeles',hour12:false});return new Date(s+' UTC').getTime()-d.getTime();}
 function nextTW(days){const now=Date.now();for(let i=0;i<8;i++){const d=new Date(now+TPE+i*864e5);const t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),20,30)-TPE;if(days.includes(new Date(t+TPE).getUTCDay())&&t>now-15*60e3)return t;}}
 function nextCA(){const now=Date.now();for(let i=0;i<3;i++){const d=new Date(now+i*864e5),o=laOffset(d),la=new Date(now+o+i*864e5);let t=Date.UTC(la.getUTCFullYear(),la.getUTCMonth(),la.getUTCDate(),18,30)-o;if(t>now-15*60e3)return t;}}
 const G=[['今彩539',()=>nextTW([1,2,3,4,5,6]),'#fb923c'],['大樂透',()=>nextTW([2,5]),'#fde047'],['威力彩',()=>nextTW([1,4]),'#f9a8d4'],['加州天天樂',nextCA,'#60a5fa']];
 const fmtT=ms=>{if(ms<=0)return '開獎中';const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);return (h?h+'時':'')+String(m).padStart(2,'0')+'分'+String(s).padStart(2,'0')+'秒';};
 function tick(){const now=Date.now();document.getElementById('cd').innerHTML='⏰ '+G.map(([n,f,c])=>{const t=f();return t?`<span style="color:${c}">${n} ${fmtT(t-now)}</span>`:'';}).join('｜')+'<span class="note">｜六合彩依馬會公布</span>';}
 tick();setInterval(tick,1000);
 // 開獎時段加快更新
 // 即時更新：問伺服器版本號，開獎時段每 15 秒、平常每 60 秒；有新一期就重抓並提示，不用重新整理
 {let V=null;const poll=()=>fetch('/api/draws-ver',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>{if(!x)return setTimeout(poll,60e3);
  if(V!==null&&x.v!==V){loadDraws();const t=document.createElement('div');t.id='newdraw';t.textContent='🎉 有新開獎，已自動更新';t.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:8px 16px;border-radius:9px;z-index:99';document.body.appendChild(t);setTimeout(()=>t.remove(),8000);}
  V=x.v;setTimeout(poll,x.live?15e3:60e3);}).catch(()=>setTimeout(poll,60e3));poll();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadDraws();});}
 fetch('/me').then(r=>r.json()).then(me=>{if(!me.sets||!me.sets.length)return;const K={'539':'d539',lotto:'lotto',super:'super'};const chk=()=>{if(!DD)return setTimeout(chk,800);
  const h=me.sets.filter(s=>s.nums&&s.nums.length).map((s,i)=>{const L=K[s.game]?DD[K[s.game]]&&DD[K[s.game]][0]:DD[s.game]&&DD[s.game].latest;if(!L)return '';const hit=L.nums.filter(n=>s.nums.includes(n));
   return `<div>⭐ ${String(s.name||('第'+(i+1)+'組')).replace(/[&<>"']/g,'')}（${GAMES[s.game].name} 第 ${L.period} 期）：中 <b>${hit.length}</b> 顆 ${balls(hit,hit)}${L.special!=null&&s.nums.includes(L.special)?'＋'+GAMES[s.game].sp:''}</div>`;}).join('');
  document.getElementById('myck').innerHTML=h?`<div class="drawbox" style="border-left:6px solid #22c55e">${h}</div>`:'';};chk();});
 const pk=localStorage.getItem('calc.picks');if(pk){localStorage.removeItem('calc.picks');try{const x=JSON.parse(pk);const g=document.getElementById('game');if(g&&[...g.options].some(o=>o.value===x.game)){g.value=x.game;gameTheme();}
  const mi=document.getElementById('mine');if(mi){mi.value=x.nums.join(' ');}const p=document.getElementById('pick');if(p){p.value=x.nums.length;}
  const go=()=>{if(!DD)return setTimeout(go,500);markMine();calc();const sec=document.querySelector(x.to==='bao'?'.sec-bao':'.sec-draw');if(sec)sec.scrollIntoView({behavior:'smooth'});};go();}catch(e){}}
})();
