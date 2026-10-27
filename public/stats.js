// 開獎統計分析（資料由伺服器預先整理，前端依範圍即時計算）
const H=x=>String(x==null?'':x).replace(/[&<>"'`]/g,c=>'&#'+c.charCodeAt(0)+';'),$=i=>document.getElementById(i),pad=n=>String(n).padStart(2,'0'),fmt=n=>Number(n).toLocaleString('zh-TW');
const GM={'539':{name:'今彩539',c:'#ea580c',b:'#fb923c'},lotto:{name:'大樂透',c:'#ca8a04',b:'#fde047'},super:{name:'威力彩',c:'#be185d',b:'#f9a8d4'},ca:{name:'加州天天樂',c:'#1d4ed8',b:'#60a5fa'},hk:{name:'香港六合彩',c:'#7e22ce',b:'#c084fc'}};
let ME={},D=null,R=[],SEL=new Set(),charts={},CSRF='';
const TABS=[['hist','📜 歷史／查詢','hist'],['num','🔢 號碼統計','stats'],['trend','📈 走勢','stats'],['adv','🧪 進階分析','adv'],['share','🔥 熱門分享','share'],['sand','🎲 沙盤浮字','fun'],['mine','⭐ 我的號碼','mynum'],['other','🎰 3星/4星/Bingo','other']];
const ball=(n,sp)=>`<span class="ball${sp?' sp':''}${SEL.has(n)&&!sp?' sel':''}" data-n="${n}">${pad(n)}</span>`;
const api=(u,o)=>fetch(u,o).then(r=>r.json());
const post=(u,b)=>api(u,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF':CSRF},body:JSON.stringify(b)});
function chart(id,cfg){if(charts[id])charts[id].destroy();const c=$(id);if(!c||!window.Chart)return;charts[id]=new Chart(c,cfg);}
window.Chart&&(Chart.defaults.color='#cbd5e1',Chart.defaults.borderColor='#334155');
// ---- 選號托盤 ----
function tray(){$('trayn').innerHTML=SEL.size?[...SEL].sort((a,b)=>a-b).map(n=>ball(n)).join(''):'（點任何號碼加入）';document.querySelectorAll('[data-n]').forEach(e=>e.classList.toggle('sel',SEL.has(+e.dataset.n)&&!e.classList.contains('sp')));}
document.addEventListener('click',e=>{const t=e.target.closest('[data-n]');if(!t||t.closest('#tray')&&!t.dataset.n)return;if(t.classList.contains('sp'))return;const n=+t.dataset.n;SEL.has(n)?SEL.delete(n):SEL.add(n);tray();});
const send=to=>{localStorage.setItem('calc.picks',JSON.stringify({game:$('g').value,nums:[...SEL].sort((a,b)=>a-b),to}));location.href='/#'+to;};
$('tosend').onclick=()=>SEL.size&&send('draw');$('tobao').onclick=()=>SEL.size&&send('bao');$('toclr').onclick=()=>{SEL.clear();tray();};
// ---- 範圍 ----
function applyRange(){const v=$('rng').value;$('dr').style.display=v==='d'?'':'none';let rows=D.rows;
 if(v==='d'){const a=$('d1').value,b=$('d2').value;rows=rows.filter(r=>(!a||r[1]>=a)&&(!b||r[1]<=b));}else if(+v)rows=rows.slice(-v);R=rows;
 $('info').textContent=`${GM[D.g].name}：資料庫共 ${fmt(D.total)} 期（${D.first||'—'} ～ ${D.last||'—'}），目前分析 ${fmt(R.length)} 期`+(D.importing?'（其他遊戲仍在匯入中）':'');render();}
['rng','d1','d2'].forEach(i=>$(i).onchange=applyRange);
async function load(){const g=$('g').value;document.documentElement.style.setProperty('--gc',GM[g].c);document.documentElement.style.setProperty('--gb',GM[g].b);$('info').textContent='載入中…';
 D=await api('/api/hist/'+g);SEL.clear();tray();if(!D.total){$('info').textContent='⏳ 正在從官方匯入完整歷史資料（首次約 5 分鐘），完成後本頁會自動更新…';$('panes').querySelectorAll('.pane').forEach(p=>p.innerHTML='');setTimeout(()=>{if($('g').value===g)load();},20000);return;}
 if(D.importing)$('info').dataset.imp=1;applyRange();}
$('g').onchange=load;
let tab=localStorage.getItem('stats.tab')||'';
function render(){const p=$('pane-'+tab);if(!p)return;({hist:rHist,num:rNum,trend:rTrend,adv:rAdv,share:rShare,sand:rSand,mine:rMine,other:rOther})[tab](p);tray();}
// ---- 1. 歷史／查詢 ----
let hp=0,hdesc=true,hball=true,hq='';
function rHist(p){let rows=R.slice();if(hq){const nums=(hq.match(/\d+/g)||[]).map(Number);rows=rows.filter(r=>r[0].includes(hq)||r[1].includes(hq)||(nums.length&&nums.every(n=>r[2].includes(n)||r[3]===n)));}
 if(hdesc)rows.reverse();const per=20,pages=Math.max(1,Math.ceil(rows.length/per));hp=Math.min(hp,pages-1);const pg=rows.slice(hp*per,hp*per+per);
 p.innerHTML=`<div class="card2"><h3>快速查詢</h3><div class="bar"><input id="hq" placeholder="期別、日期(2026-10)、或號碼(例 5 12)" value="${H(hq)}" style="flex:1;min-width:200px"><button class="btn2" id="hsort">${hdesc?'新→舊':'舊→新'}</button><button class="btn2 g" id="hview">${hball?'球號':'文字'}</button></div>
 <p class="note">找到 ${fmt(rows.length)} 期。查號碼＝同時包含這些號碼的期數；點號碼加入選號。</p>
 <table><tr><th>期別</th><th>日期</th><th>開獎號碼</th><th></th></tr>${pg.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td style="text-align:left">${hball?r[2].map(n=>ball(n)).join('')+(r[3]!=null?ball(r[3],1):''):r[2].map(pad).join(' ')+(r[3]!=null?' ＋'+pad(r[3]):'')}</td><td><button class="btn2 g" data-use="${r[2].join(',')}">用這組</button></td></tr>`).join('')}</table>
 <div class="pg"><button class="btn2 g" id="hp0">«</button><button class="btn2 g" id="hpp">‹</button><span>${hp+1} / ${pages}</span><button class="btn2 g" id="hpn">›</button><button class="btn2 g" id="hpl">»</button></div></div>`;
 $('hq').onchange=e=>{hq=e.target.value.trim();hp=0;rHist(p);tray();};$('hsort').onclick=()=>{hdesc=!hdesc;hp=0;rHist(p);tray();};$('hview').onclick=()=>{hball=!hball;rHist(p);tray();};
 $('hp0').onclick=()=>{hp=0;rHist(p);tray();};$('hpp').onclick=()=>{hp=Math.max(0,hp-1);rHist(p);tray();};$('hpn').onclick=()=>{hp=Math.min(pages-1,hp+1);rHist(p);tray();};$('hpl').onclick=()=>{hp=pages-1;rHist(p);tray();};
 p.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{SEL=new Set(b.dataset.use.split(',').map(Number));tray();});}
// ---- 統計核心（依目前範圍）----
function stat(){const mx=D.max,cnt=Array(mx+1).fill(0),last=Array(mx+1).fill(-1),maxGap=Array(mx+1).fill(0),rep=Array(mx+1).fill(0),N=R.length;
 R.forEach((r,i)=>{for(const n of r[2]){cnt[n]++;const g=last[n]<0?i:i-last[n]-1;if(g>maxGap[n])maxGap[n]=g;if(i>0&&last[n]===i-1)rep[n]++;last[n]=i;}});
 const cur=last.map((l,n)=>l<0?N:N-1-l);for(let n=1;n<=mx;n++)maxGap[n]=Math.max(maxGap[n],cur[n]);
 let repDraw=0;for(let i=1;i<N;i++)if(R[i][2].some(n=>R[i-1][2].includes(n)))repDraw++;return {mx,cnt,cur,maxGap,rep,N,repDraw};}
const nums=mx=>Array.from({length:mx},(_,i)=>i+1);
// ---- 2. 號碼統計（次數圖／冷熱／未開／連莊）----
function rNum(p){const s=stat(),ns=nums(s.mx),exp=s.N*D.n/s.mx;const hot=ns.slice().sort((a,b)=>s.cnt[b]-s.cnt[a]),cold=hot.slice().reverse();
 p.innerHTML=`<div class="card2"><h3>各號碼開出次數（點長條看詳細）</h3><div style="height:260px"><canvas id="cCnt"></canvas></div><div id="ndet" class="note">平均每號 ${exp.toFixed(1)} 次</div></div>
 <div class="two"><div class="card2"><h3>🔥 熱門 Top 10</h3>${hot.slice(0,10).map(n=>`<span class="chip" data-n="${n}">${pad(n)} <b>${s.cnt[n]}</b></span>`).join('')}<h3 style="margin-top:10px">🧊 冷門 Top 10</h3>${cold.slice(0,10).map(n=>`<span class="chip" data-n="${n}">${pad(n)} <b>${s.cnt[n]}</b></span>`).join('')}</div>
 <div class="card2"><h3>🔁 連莊率</h3><p>相鄰兩期至少有 1 個號碼重複：<b>${s.N>1?(s.repDraw/(s.N-1)*100).toFixed(1):0}%</b>（${s.repDraw}/${Math.max(0,s.N-1)}）</p><p class="note">各號碼連莊率＝連續兩期都開出的次數 ÷ 該號開出次數</p>
 <table><tr><th>號碼</th><th>連莊</th><th>率</th></tr>${ns.slice().sort((a,b)=>s.rep[b]/(s.cnt[b]||1)-s.rep[a]/(s.cnt[a]||1)).slice(0,8).map(n=>`<tr><td>${ball(n)}</td><td>${s.rep[n]}</td><td>${s.cnt[n]?(s.rep[n]/s.cnt[n]*100).toFixed(1):0}%</td></tr>`).join('')}</table></div></div>
 <div class="card2"><h3>⏳ 未開期數（目前／範圍內最大）</h3><table><tr><th>號碼</th><th>目前未開</th><th>最大未開</th><th>次數</th></tr>${ns.slice().sort((a,b)=>s.cur[b]-s.cur[a]).map(n=>`<tr><td>${ball(n)}</td><td>${s.cur[n]}</td><td>${s.maxGap[n]}</td><td>${s.cnt[n]}</td></tr>`).join('')}</table>
 <p class="note">全部歷史的最大未開：${ns.slice().sort((a,b)=>D.maxGap[b]-D.maxGap[a]).slice(0,5).map(n=>pad(n)+'＝'+D.maxGap[n]+'期').join('、')}</p></div>`;
 chart('cCnt',{type:'bar',data:{labels:ns.map(pad),datasets:[{label:'次數',data:ns.map(n=>s.cnt[n]),backgroundColor:ns.map(n=>s.cnt[n]>=exp?GM[D.g].c:'#475569')}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},
  onClick:(e,el)=>{if(!el.length)return;const n=el[0].index+1;$('ndet').innerHTML=`${ball(n)} 開出 <b>${s.cnt[n]}</b> 次（${(s.cnt[n]/s.N*100).toFixed(1)}% 的期數）｜目前 ${s.cur[n]} 期未開｜最大未開 ${s.maxGap[n]} 期｜連莊 ${s.rep[n]} 次　<button class="btn2" id="addn">加入選號</button>`;$('addn').onclick=()=>{SEL.add(n);tray();};}}});}
// ---- 3. 走勢（位數走勢／尾數合＋隨機選號）----
function rTrend(p){const L=R.slice(-20),L30=R.slice(-30),tail=r=>r[2].reduce((a,n)=>a+n%10,0);
 p.innerHTML=`<div class="card2"><h3>位數走勢（號碼由小到大的第 1～${D.n} 位，最近 20 期）</h3><div style="height:280px"><canvas id="cPos"></canvas></div></div>
 <div class="card2"><h3>尾數合走勢（各號個位數相加，最近 30 期）</h3><div style="height:220px"><canvas id="cTail"></canvas></div>
 <div class="bar"><label>指定尾數合 <input id="ts" type="number" min="0" max="${9*D.n}" value="${L30.length?tail(L30[L30.length-1]):20}" style="width:80px"></label><button class="btn2" id="tgo">🎲 隨機產生一組</button><span id="tout"></span></div></div>`;
 const cols=['#f87171','#fb923c','#facc15','#4ade80','#38bdf8','#a78bfa'];
 chart('cPos',{type:'line',data:{labels:L.map(r=>r[0].slice(-3)),datasets:Array.from({length:D.n},(_,i)=>({label:'第'+(i+1)+'位',data:L.map(r=>r[2][i]),borderColor:cols[i],backgroundColor:cols[i],tension:.25}))},options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false}}});
 chart('cTail',{type:'line',data:{labels:L30.map(r=>r[0].slice(-3)),datasets:[{label:'尾數合',data:L30.map(tail),borderColor:GM[D.g].b,backgroundColor:GM[D.g].c,tension:.25}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}}}});
 $('tgo').onclick=()=>{const t=+$('ts').value;for(let k=0;k<20000;k++){const a=new Set();while(a.size<D.n)a.add(1+Math.floor(Math.random()*D.max));const x=[...a].sort((p,q)=>p-q);if(x.reduce((s,n)=>s+n%10,0)===t){$('tout').innerHTML=x.map(n=>ball(n)).join('')+` <button class="btn2 g" id="tuse">用這組</button>`;$('tuse').onclick=()=>{SEL=new Set(x);tray();};tray();return;}}$('tout').textContent='找不到符合的組合';};}
// ---- 4. 進階（三星組合／下期機率分析／拖牌）----
let advF='',dragX=1,dragN=1;
function rAdv(p){const mx=D.max,s=stat();const m3=new Map();for(const r of R){const a=r[2];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)for(let k=j+1;k<a.length;k++){const key=a[i]*10000+a[j]*100+a[k];m3.set(key,(m3.get(key)||0)+1);}}
 const f=(advF.match(/\d+/g)||[]).map(Number);let top=[...m3.entries()].filter(([k])=>{const t=[Math.floor(k/10000),Math.floor(k/100)%100,k%100];return f.every(n=>t.includes(n));}).sort((a,b)=>b[1]-a[1]).slice(0,30);
 const L30=R.slice(-30),c30=Array(mx+1).fill(0);L30.forEach(r=>r[2].forEach(n=>c30[n]++));const base=D.n/mx;
 const score=nums(mx).map(n=>{const fr=s.N?s.cnt[n]/s.N:0,rec=L30.length?c30[n]/L30.length:0,gap=Math.min(1,s.cur[n]/(mx/D.n*3));return {n,v:(fr*0.4+rec*0.4)/base*50+gap*20};}).sort((a,b)=>b.v-a.v);
 p.innerHTML=`<div class="card2"><h3>三星組合開出次數（同一期出現的 3 碼組合）</h3><div class="bar"><input id="af" placeholder="篩選：必含號碼，例 7 或 7 15" value="${H(advF)}"><span class="note">範圍內共 ${fmt(m3.size)} 種組合出現過</span></div>
 <div>${top.map(([k,c])=>{const t=[Math.floor(k/10000),Math.floor(k/100)%100,k%100];return `<span class="chip" data-use="${t.join(',')}">${t.map(pad).join('-')} <b>${c}</b></span>`;}).join('')||'<span class="note">無</span>'}</div></div>
 <div class="card2"><h3>下期機率分析　<span class="note" style="color:#fbbf24">⚠️ 統計參考，非預測；每期開獎都是獨立隨機</span></h3><p class="note">分數＝範圍內頻率 40%＋最近 30 期頻率 40%＋未開期數 20%（50 分＝平均）</p>
 <div>${score.slice(0,12).map(x=>`<span class="chip" data-n="${x.n}">${pad(x.n)} <b>${x.v.toFixed(0)}</b></span>`).join('')}</div><button class="btn2" id="usetop" style="margin-top:6px">把前 ${D.n} 名加入選號</button>
 <h3 style="margin-top:10px">最近 30 期走勢圖（■＝開出）</h3><div style="overflow:auto"><table class="heat"><tr><th>期</th>${nums(mx).map(n=>`<th>${n}</th>`).join('')}</tr>${L30.slice().reverse().map(r=>`<tr><td style="font-size:10px;width:auto;padding:0 3px">${r[0].slice(-3)}</td>${nums(mx).map(n=>`<td style="background:${r[2].includes(n)?GM[D.g].c:'transparent'}">${r[2].includes(n)?n:''}</td>`).join('')}</tr>`).join('')}</table></div></div>
 <div class="card2"><h3>拖牌分析（某號開出後，第 N 期各號的開出率）</h3><div class="bar"><label>當 <select id="dx">${nums(mx).map(n=>`<option ${n===dragX?'selected':''}>${n}</option>`).join('')}</select> 開出後</label><label>第 <select id="dn">${[1,2,3,4,5].map(n=>`<option ${n===dragN?'selected':''}>${n}</option>`).join('')}</select> 期</label></div><div id="dout"></div></div>`;
 const doDrag=()=>{const c=Array(mx+1).fill(0);let t=0;R.forEach((r,i)=>{if(r[2].includes(dragX)&&i+dragN<R.length){t++;R[i+dragN][2].forEach(n=>c[n]++);}});const rows=nums(mx).sort((a,b)=>c[b]-c[a]).slice(0,15);
  $('dout').innerHTML=t?`<p class="note">${pad(dragX)} 在範圍內開出 ${t} 次（可對照）；一般機率約 ${(D.n/mx*100).toFixed(1)}%</p><table><tr><th>號碼</th><th>次數</th><th>開出率</th></tr>${rows.map(n=>`<tr><td>${ball(n)}</td><td>${c[n]}</td><td>${(c[n]/t*100).toFixed(1)}%</td></tr>`).join('')}</table>`:'<p class="note">範圍內樣本不足</p>';tray();};
 $('dx').onchange=e=>{dragX=+e.target.value;doDrag();};$('dn').onchange=e=>{dragN=+e.target.value;doDrag();};doDrag();
 $('af').onchange=e=>{advF=e.target.value;rAdv(p);tray();};$('usetop').onclick=()=>{SEL=new Set(score.slice(0,D.n).map(x=>x.n));tray();};
 p.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{b.dataset.use.split(',').map(Number).forEach(n=>SEL.add(n));tray();});}
// ---- 5. 熱門分享 ----
async function rShare(p){const g=D.g,x=await api('/api/share/'+g);const ns=nums(D.max);const pick=new Set(x.mine||[]);
 p.innerHTML=`<div class="card2"><h3>彩迷熱門號碼（第 ${x.period} 期，${x.users} 人分享）</h3><div style="height:240px"><canvas id="cSh"></canvas></div></div>
 <div class="card2"><h3>${x.mine?'你本期已分享：'+x.mine.map(pad).join(' ')+' <button class="btn2" id="sdel" style="margin-left:8px">撤回我的分享</button> <span id="smsg" class="note"></span>':'分享我的號碼（最多 10 碼，每期一次）'}</h3>${x.mine?'':`<div class="grid" id="sg">${ns.map(n=>`<button data-p="${n}">${pad(n)}</button>`).join('')}</div><button class="btn2" id="sgo" style="margin-top:8px">送出分享</button> <span id="smsg" class="note"></span>`}</div>`;
 chart('cSh',{type:'bar',data:{labels:ns.map(pad),datasets:[{label:'人數',data:ns.map(n=>x.cnt[n]||0),backgroundColor:GM[g].c}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},onClick:(e,el)=>{if(el.length){SEL.add(el[0].index+1);tray();}}}});
 if(x.mine)$('sdel').onclick=async()=>{if(!confirm('確定撤回本期分享？撤回後可重新分享。'))return;const r=await api('/api/share/'+g,{method:'DELETE',headers:{'X-CSRF':CSRF}});if(r&&r.ok)rShare(p);else $('smsg').textContent=(r&&r.error)||'撤回失敗';};
 if(!x.mine){p.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const n=+b.dataset.p;if(pick.has(n))pick.delete(n);else if(pick.size<10)pick.add(n);b.classList.toggle('sel',pick.has(n));});
  $('sgo').onclick=async()=>{const r=await post('/api/share/'+g,{nums:[...pick]});if(r.ok)rShare(p);else $('smsg').textContent=r.error||'失敗';};}}
// ---- 6. 沙盤浮字 ----
function rSand(p){p.innerHTML=`<div class="card2"><h3>🎲 沙盤浮字（娛樂用隨機選號）</h3><div id="sand"></div><div class="bar"><label>抽 <select id="sk">${[1,2,3,4,5,6].map(n=>`<option ${n===D.n?'selected':''}>${n}</option>`).join('')}</select> 個</label><button class="btn2" id="sshake">搖一搖</button><button class="btn2" id="spick">浮出號碼</button><span id="sres"></span></div></div>`;
 const box=$('sand'),ns=nums(D.max);box.innerHTML=ns.map(n=>`<span data-s="${n}">${n}</span>`).join('');const mv=()=>box.querySelectorAll('span').forEach(e=>{e.style.left=Math.random()*90+'%';e.style.top=Math.random()*85+'%';e.style.fontSize=(12+Math.random()*10)+'px';e.style.opacity=.35+Math.random()*.4;e.style.transform=`rotate(${Math.random()*60-30}deg)`;});mv();
 $('sshake').onclick=mv;$('spick').onclick=()=>{mv();const k=+$('sk').value,a=new Set();while(a.size<k)a.add(1+Math.floor(Math.random()*D.max));setTimeout(()=>{box.querySelectorAll('span').forEach(e=>{if(a.has(+e.dataset.s)){e.style.opacity=1;e.style.fontSize='34px';e.style.color='#fff';e.style.transform='none';}else e.style.opacity=.12;});
  const x=[...a].sort((p,q)=>p-q);$('sres').innerHTML=x.map(n=>ball(n)).join('')+` <button class="btn2 g" id="suse">用這組</button>`;$('suse').onclick=()=>{SEL=new Set(x);tray();};tray();},1300);};}
// ---- 7. 我的號碼 ----
async function rMine(p){const x=await api('/api/mysets');const sets=[0,1].map(i=>x.sets[i]||{game:'539',name:'',nums:[]});
 const latest=async g=>{const d=g===D.g?D:await api('/api/hist/'+g);return d.rows[d.rows.length-1];};
 const chk=await Promise.all(sets.map(async s=>{if(!s.nums.length)return '';const L=await latest(s.game);if(!L)return '';const h=L[2].filter(n=>s.nums.includes(n));return `對 ${GM[s.game].name} 第 ${L[0]} 期：中 <b>${h.length}</b> 顆 ${h.map(n=>ball(n)).join('')}${L[3]!=null&&s.nums.includes(L[3])?'＋特別號':''}`;}));
 p.innerHTML=sets.map((s,i)=>`<div class="card2"><h3>第 ${i+1} 組</h3><div class="bar"><select id="mg${i}">${Object.entries(GM).map(([k,v])=>`<option value="${k}" ${s.game===k?'selected':''}>${v.name}</option>`).join('')}</select><input id="mn${i}" placeholder="名稱（選填）" value="${H(s.name)}" style="width:140px"><input id="mx${i}" placeholder="號碼，最多 12 個" value="${s.nums.join(' ')}" style="flex:1;min-width:180px"><button class="btn2 g" data-fill="${i}">用已選號碼</button></div><p>${chk[i]||'<span class="note">尚未設定</span>'}</p></div>`).join('')+
 `<button class="btn2" id="msave">儲存</button> <span id="mmsg" class="note">登入計算器時會自動對獎</span>`;
 p.querySelectorAll('[data-fill]').forEach(b=>b.onclick=()=>{$('mx'+b.dataset.fill).value=[...SEL].sort((a,b)=>a-b).join(' ');});
 $('msave').onclick=async()=>{const r=await post('/api/mysets',{sets:[0,1].map(i=>({game:$('mg'+i).value,name:$('mn'+i).value,nums:($('mx'+i).value.match(/\d+/g)||[]).map(Number)}))});$('mmsg').textContent=r.ok?'✓ 已儲存':'儲存失敗';if(r.ok)rMine(p);};}
// ---- 8. 3星/4星/Bingo ----
async function rOther(p){const o=await api('/api/other');const row=(a,f)=>(a||[]).map(f).join('');
 p.innerHTML=`<div class="two"><div class="card2"><h3>3星彩</h3><table>${row(o.d3,x=>`<tr><td>${x.period}</td><td>${x.date}</td><td><b style="font-size:18px">${x.nums.join(' ')}</b></td></tr>`)}</table></div>
 <div class="card2"><h3>4星彩</h3><table>${row(o.d4,x=>`<tr><td>${x.period}</td><td>${x.date}</td><td><b style="font-size:18px">${x.nums.join(' ')}</b></td></tr>`)}</table></div></div>
 <div class="card2"><h3>BINGO BINGO 賓果賓果（今日最近 10 期）</h3><table><tr><th>期別</th><th>號碼</th><th>超級獎號</th></tr>${row(o.bingo,x=>`<tr><td>${x.period}</td><td style="text-align:left">${x.nums.map(pad).join(' ')}</td><td>${x.super!=null?pad(x.super):'—'}</td></tr>`)}</table>
 <p class="note">資料來源：台灣彩券｜更新：${o.updated?new Date(o.updated).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'—'}</p></div>`;}
// ---- 啟動 ----
(async()=>{ME=await api('/me');CSRF=(await api('/api/csrf')).csrf;const t=TABS.filter(x=>ME.perms.includes(x[2]));if(!t.length){$('info').textContent='此帳號尚未開通統計功能';return;}
 if(!t.find(x=>x[0]===tab))tab=t[0][0];$('tabs').innerHTML=t.map(x=>`<button data-t="${x[0]}" class="${x[0]===tab?'on':''}">${x[1]}</button>`).join('');$('panes').innerHTML=t.map(x=>`<div class="pane ${x[0]===tab?'on':''}" id="pane-${x[0]}"></div>`).join('');
 $('tabs').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;tab=b.dataset.t;localStorage.setItem('stats.tab',tab);document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.t===tab));document.querySelectorAll('.pane').forEach(x=>x.classList.toggle('on',x.id==='pane-'+tab));render();};
 const q=new URLSearchParams(location.search);if(q.get('g'))$('g').value=q.get('g');await load();})();
