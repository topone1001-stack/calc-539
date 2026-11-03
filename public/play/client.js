(function(){'use strict';
const $=s=>document.querySelector(s),pg=document.body.dataset.page;let CS='';
const fmt=n=>Number(n).toLocaleString('zh-TW');
async function csrf(){if(!CS)CS=(await (await fetch('/api/csrf')).json()).csrf;return CS;}
async function post(u,b){const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF':await csrf()},body:JSON.stringify(b)});let j={};try{j=await r.json();}catch(e){}return {ok:r.ok,status:r.status,j};}
const setPts=v=>{document.querySelectorAll('#pts,#ptsBig').forEach(e=>e.textContent=v==null?'—':fmt(v));};
const symImg=(g,i)=>'/play/a/'+g+i+'.svg';
const META={moon:{img:'moon.jpg',tag:'hot',max:'300x',f:['hot','egypt']},dodo:{img:'jungle.jpg',tag:'new',max:'250x',f:['new','jungle']}};
const SOONF={scarab:['egypt','new'],sunking:['egypt','hot'],river:['egypt'],parrot:['jungle','new']};
async function lobby(){const d=await (await fetch('/api/play/lobby')).json();$('#uname').textContent=d.user;setPts(d.wallet&&d.wallet.pts);
 const cards=d.games.map(g=>{const m=META[g.id];if(!g.on)return {f:m.f,html:`<div class="card soon ${g.theme}"><span class="rib ${m.tag}">${m.tag==='hot'?'熱門':'新'}</span><div class="in"><img src="/play/a/${m.img}" alt=""><div class="cs">即將開放</div><h3><b>${g.name}</b></h3></div></div>`};return {f:m.f,html:`<a class="card ${g.theme}" href="/play/game/${g.id}" data-id="${g.id}"><span class="rib ${m.tag}">${m.tag==='hot'?'熱門':'新'}</span><span class="badge">最高 ${m.max}</span><div class="in"><img src="/play/a/${m.img}" alt=""><h3><b>${g.name}</b></h3></div></a>`};})
  .concat(d.soon.map(s=>({f:SOONF[s.id]||[],html:`<div class="card soon"><div class="in"><img src="/play/a/${s.img.includes('.')?s.img:s.img+'.svg'}" alt=""><div class="cs">即將推出</div><h3><b>${s.name}</b></h3></div></div>`})));
 const draw=f=>{$('#grid').innerHTML=cards.filter(c=>f==='all'||c.f.includes(f)).map(c=>c.html).join('');};draw('all');
 $('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));draw(b.dataset.f);});}
async function points(){const d=await (await fetch('/api/play/lobby')).json();const w=d.wallet;setPts(w&&w.pts);$('#rng').textContent=fmt(d.startMin)+'–'+fmt(d.startMax);const inp=$('#startN');inp.min=d.startMin;inp.max=d.startMax;inp.value=1000;
 $('#spins').textContent=w?`已轉 ${fmt(w.spins)} 次`:'還沒有點數，請先輸入起始點數';$('#startF').hidden=!!(w&&w.pts>=d.bets[0]);
 $('#startF').addEventListener('submit',async e=>{e.preventDefault();const r=await post('/api/play/start',{points:Number(inp.value)});$('#startMsg').textContent=r.ok?'✓ 已設定，可以開始玩了':r.j.error||'失敗';if(r.ok){setPts(r.j.pts);$('#startF').hidden=true;}});}
async function game(){const id=location.pathname.split('/').pop();const d=await (await fetch('/api/play/lobby')).json();const g=d.games.find(x=>x.id===id);if(!g)return;
 document.title=g.name;$('#gname').textContent=g.name;$('#gtitle').textContent=g.name;document.body.classList.add('t-'+g.theme);let pts=d.wallet&&d.wallet.pts;setPts(pts);
 if(pts==null){$('#msg').innerHTML='還沒有點數，請先到 <a href="/play/points" style="text-decoration:underline">我的點數</a> 輸入起始點數';}
 let bet=d.bets[0];$('#bets').innerHTML=d.bets.map(b=>`<button data-b="${b}" class="${b===bet?'on':''}">${b}</button>`).join('');
 $('#bets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;bet=+b.dataset.b;document.querySelectorAll('#bets button').forEach(x=>x.classList.toggle('on',x===b));});
 const R=$('#reels');const rnd=()=>Math.floor(Math.random()*6); // 只用來畫轉動中的假圖案，結果以伺服器為準
 R.innerHTML=[0,1,2].map(()=>`<div class="reel"><div class="strip">${[rnd(),rnd(),rnd()].map(i=>`<img src="${symImg(id,i)}" alt="">`).join('')}</div></div>`).join('');
 const reels=[...R.querySelectorAll('.reel')];
 function animate(grid){return Promise.all(reels.map((el,k)=>new Promise(res=>{const st=el.querySelector('.strip');const n=14+k*6;const filler=Array.from({length:n},rnd);
  st.innerHTML=[...grid[k],...filler,...[...st.querySelectorAll('img')].slice(0,3).map(()=>rnd())].map(i=>`<img src="${symImg(id,i)}" alt="">`).join('');
  const h=el.clientHeight/3,total=(n+3)*h;st.style.transition='none';st.style.transform=`translateY(${-total}px)`;st.offsetHeight;
  st.style.transition=`transform ${1.1+k*.45}s cubic-bezier(.2,.7,.25,1.04)`;st.style.transform='translateY(0)';setTimeout(res,1150+k*450);})));}
 function celebrate(win,mult){const w=$('#win');$('#wt').textContent=mult>=50?'超級大獎！':mult>=10?'大獎！':'中獎！';$('#wv').textContent='+'+fmt(win)+' 點';
  $('#coins').innerHTML=Array.from({length:36},()=>`<i style="left:${Math.random()*100}%;animation-duration:${1.6+Math.random()*1.8}s;animation-delay:${Math.random()*.8}s"></i>`).join('');w.hidden=false;
  const close=()=>{w.hidden=true;w.removeEventListener('click',close);};w.addEventListener('click',close);setTimeout(close,3200);}
 $('#spin').addEventListener('click',async()=>{const b=$('#spin');b.disabled=true;$('#msg').textContent='轉動中…';
  try{const r=await post('/api/play/spin/'+id,{bet});if(!r.ok){$('#msg').textContent=r.j.error||('錯誤 '+r.status);return;}
   await animate(r.j.grid);setPts(r.j.pts);
   if(r.j.win>0){const l=r.j.line;reels.forEach((el,k)=>{if(k<2||l[2]===l[0])el.querySelectorAll('img')[1].classList.add('hit');});$('#msg').textContent=`中獎 ${r.j.mult} 倍，獲得 ${fmt(r.j.win)} 點`;celebrate(r.j.win,r.j.mult);}
   else $('#msg').textContent='沒中，再試一次！';}
  finally{b.disabled=false;}});}
({lobby,points,game}[pg]||(()=>{}))().catch(e=>console.error(e));
})();
