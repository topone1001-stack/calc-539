// 娛樂點數＋小遊戲：單元檢查＋整合檢查（PLAY_URL＋PLAY_PW，只對本機測試站；帳號 admin/m_alice/m_bob）
// 執行：node tests/play.check.js　或　PLAY_URL=http://localhost:4100 PLAY_PW=... node tests/play.check.js
const assert=require('assert');const P=require('../play');let n=0;const t=async(m,f)=>{await f();n++;console.log('✓',m);};
(async()=>{
 await t('預設賠率的理論回饋率 > 目標 RTP，目標可達',()=>{for(const g of Object.values(P.GAMES))assert.ok(P.baseRtp(g.def)*100>=g.def.rtp);});
 await t('模擬 30 萬轉：實際回饋率接近目標 92%（±2%）',()=>{for(const g of Object.values(P.GAMES)){let b=0,w=0;for(let i=0;i<3e5;i++){const d=P.draw(g.def);b++;w+=d.mult;}const r=w/b*100;assert.ok(Math.abs(r-g.def.rtp)<2,g.name+' '+r.toFixed(2));console.log('   ',g.name,r.toFixed(2)+'%');}});
 await t('目標 RTP 60%：模擬結果跟著降',()=>{const c={...P.GAMES.moon.def,rtp:60};let w=0;for(let i=0;i<3e5;i++)w+=P.draw(c).mult;assert.ok(Math.abs(w/3e5*100-60)<2,String(w/3e5));});
 await t('結果和盤面一致（中間線算出的倍數＝回傳倍數）',()=>{for(let i=0;i<2e4;i++){const d=P.draw(P.GAMES.dodo.def);assert.equal(P.lineWin(d.grid.map(c=>c[1]),P.GAMES.dodo.def),d.mult);}});
 const ok={enabled:'1',pay0:300,pay1:80,pay2:40,pay3:20,pay4:12,pay5:8,pair:2,rtp:92};
 await t('後台輸入檢查：RTP 超出 50–99、倍數超過 1000、非整數、達不到目標都擋',()=>{assert.ok(P.validate('moon',ok).c);for(const b of [{...ok,rtp:120},{...ok,rtp:10},{...ok,pay0:5000},{...ok,pay1:'1.5'},{...ok,pay2:-1},{...ok,pair:99},{...ok,pay0:1,pay1:1,pay2:1,pay3:1,pay4:1,pay5:1,pair:0,rtp:90}])assert.ok(P.validate('moon',b).err,JSON.stringify(b));});
 if(process.env.PLAY_URL)await integ();
 console.log(`\n${n} 項全部通過`);process.exit(0);})().catch(e=>{console.error('✗',e.message);process.exit(1);});
async function integ(){const B=process.env.PLAY_URL,PW=process.env.PLAY_PW;
 const C=()=>{const c={jar:'',async f(p,o={}){const h={...(o.headers||{})};if(c.jar)h.cookie=c.jar;const r=await fetch(B+p,{...o,headers:h,redirect:'manual'});for(const x of r.headers.getSetCookie())if(x.startsWith('calc.sid='))c.jar=x.split(';')[0];return r;},
  async login(u){return (await c.f('/login',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:u,password:PW})})).headers.get('location');},
  async tok(){return (await (await c.f('/api/csrf')).json()).csrf;},
  async j(p,b,tk){return c.f(p,{method:'POST',headers:{'content-type':'application/json',...(tk===false?{}:{'X-CSRF':tk||await c.tok()})},body:JSON.stringify(b)});},
  async form(p,b){const pg=await (await c.f(p.replace(/\/?$/,''))).text();const m=pg.match(/name="_csrf" value="([^"]+)"/);const u=new URLSearchParams();u.append('_csrf',m?m[1]:'');for(const [k,v] of b)u.append(k,v);return c.f(p,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:u});}};return c;};
 const ad=C(),al=C(),bo=C();for(const [c,u] of [[ad,'admin'],[al,'m_alice'],[bo,'m_bob']])assert.equal(await c.login(u),'/',u);
 const FT=require('../features');
 await t('功能開關預設關閉：/play、API 都 404',async()=>{assert.equal((await al.f('/play')).status,404);assert.equal((await al.f('/api/play/lobby')).status,404);});
 await t('管理員在 /admin/features 勾選「娛樂」後開啟',async()=>{const r=await ad.form('/admin/features',FT.KEYS.map(k=>['on',k]));assert.equal(r.status,302);assert.equal((await al.f('/play')).status,200);});
 await t('會員看不到賠率設定（lobby 不含 pays/rtp）',async()=>{const s=await (await al.f('/api/play/lobby')).text();assert.ok(!/pays|rtp|pair/.test(s),s.slice(0,200));});
 await t('會員進不了賠率頁',async()=>assert.equal((await al.f('/admin/play-odds')).status,403));
 await t('轉動沒帶 CSRF 被擋',async()=>assert.equal((await al.j('/api/play/spin/moon',{bet:10},false)).status,403));
 await t('沒有點數不能轉',async()=>assert.equal((await al.j('/api/play/spin/moon',{bet:10})).status,409));
 await t('起始點數範圍檢查',async()=>{for(const v of [0,50,100001,'abc',1.5,-100])assert.equal((await al.j('/api/play/start',{points:v})).status,400,String(v));});
 await t('會員自己輸入起始點數；還有點數時不能再補',async()=>{assert.equal((await al.j('/api/play/start',{points:100000})).status,200);assert.equal((await al.j('/api/play/start',{points:100000})).status,409);});
 await t('管理員帶別人帳號也只會動到自己（不能發點給會員）',async()=>{const r=await ad.j('/api/play/start',{points:500,username:'m_bob',user:'m_bob'});assert.equal(r.status,200);const b=await (await bo.f('/api/play/lobby')).json();assert.equal(b.wallet,null);});
 await t('沒有任何發點／改點的後台路徑',async()=>{for(const p of ['/admin/play-points','/admin/play/grant','/api/play/grant','/api/play/set','/api/play/admin'])assert.equal((await ad.j(p,{username:'m_bob',points:9999})).status,404,p);});
 await t('押注只能 10/50/100',async()=>{for(const v of [0,-10,7,1e9,'10'])assert.equal((await al.j('/api/play/spin/moon',{bet:v})).status,400,String(v));});
 await t('同時連按 20 次（餘額只夠 10 次）：不會變負、不會多扣多加，帳對得起來',async()=>{assert.equal((await bo.j('/api/play/start',{points:100})).status,200);const tk=await bo.tok();
  const rs=await Promise.all(Array.from({length:20},()=>bo.j('/api/play/spin/moon',{bet:10},tk)));const okR=[];for(const r of rs)if(r.status===200)okR.push(await r.json());else assert.equal(r.status,409);
  const w=await (await bo.f('/api/play/lobby')).json();const exp=100+okR.reduce((s,x)=>s-x.bet+x.win,0);assert.ok(w.wallet.pts>=0);assert.equal(w.wallet.pts,exp);assert.equal(w.wallet.spins,okR.length);console.log(`    成功 ${okR.length} 次，被擋 ${20-okR.length} 次，餘額 ${w.wallet.pts}（應為 ${exp}）`);});
 await t('每個帳號每分鐘最多 30 轉，第 31 轉回 429',async()=>{const tk=await al.tok();let c429=0,c200=0;for(let i=0;i<32;i++){const r=await al.j('/api/play/spin/dodo',{bet:10},tk);if(r.status===429)c429++;else if(r.status===200)c200++;}assert.ok(c200<=30&&c429>=2&&c200+c429===32,c200+'/'+c429);console.log('    本分鐘成功 '+c200+' 轉（前面測試已用掉部分額度），之後 '+c429+' 次回 429');});
 await t('後台改賠率：超出範圍被擋、不寫入',async()=>{const r=await ad.form('/admin/play-odds',[['game','moon'],['enabled','1'],['pay0','300'],['pay1','80'],['pay2','40'],['pay3','20'],['pay4','12'],['pay5','8'],['pair','2'],['rtp','120']]);assert.equal(r.status,302);const pg=await (await ad.f('/admin/play-odds')).text();assert.ok(pg.includes('未儲存'));assert.ok(pg.includes('尚無紀錄'));});
 await t('會員送賠率表單被擋',async()=>{const r=await al.form('/admin/play-odds',[['game','moon'],['rtp','99']]);assert.equal(r.status,403);});
 await t('後台改賠率：合法值寫入＋稽核紀錄（管理員、前後值、台北時間）',async()=>{const r=await ad.form('/admin/play-odds',[['game','moon'],['enabled','1'],['pay0','320'],['pay1','80'],['pay2','40'],['pay3','20'],['pay4','12'],['pay5','8'],['pair','2'],['rtp','90']]);assert.equal(r.status,302);const pg=await (await ad.f('/admin/play-odds')).text();assert.ok(pg.includes('✓ 已儲存'));assert.ok(/（台北）<\/td><td>admin<\/td><td>月砂神殿<\/td><td>開｜RTP 92%.*?<\/td><td>開｜RTP 90%｜前兩格 2x｜320/.test(pg),'audit row');});
 await t('後台關閉單一遊戲：頁面和轉動都 404',async()=>{await ad.form('/admin/play-odds',[['game','dodo'],['pay0','250'],['pay1','90'],['pay2','40'],['pay3','18'],['pay4','12'],['pay5','8'],['pair','2'],['rtp','92']]);assert.equal((await al.f('/play/game/dodo')).status,404);assert.equal((await bo.j('/api/play/spin/dodo',{bet:10})).status,404);
  await ad.form('/admin/play-odds',[['game','dodo'],['enabled','1'],['pay0','250'],['pay1','90'],['pay2','40'],['pay3','18'],['pay4','12'],['pay5','8'],['pair','2'],['rtp','92']]);assert.equal((await al.f('/play/game/dodo')).status,200);});
 await t('頁面沒有 inline script',async()=>{for(const p of ['/play','/play/game/moon','/play/points']){const h=await (await al.f(p)).text();assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(h)&&!/\son[a-z]+=/.test(h),p);}const h=await (await ad.f('/admin/play-odds')).text();assert.ok(!/<script/.test(h)&&!/\son[a-z]+=/.test(h));});
 await t('頁面沒有儲值／購買／兌換字樣（說明文字的「不能…」除外）',async()=>{for(const p of ['/play','/play/game/moon']){const h=await (await al.f(p)).text();assert.ok(!/NT\$|MyCard|VIP|商城|立即儲值/.test(h),p);}});}
