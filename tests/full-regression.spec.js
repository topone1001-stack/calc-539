// calc-539 全功能回歸測試：每個按鈕／控制項都要有反應、無 console 錯誤、無 NaN/undefined
// 建立暫時帳號 zz_reg_<裝置>，測完刪除；不碰其他帳號。測試分享會撤回。
const {test,expect}=require('@playwright/test');const fs=require('fs'),path=require('path');
const SHOT=path.join(__dirname,'..','screens','reg');fs.mkdirSync(SHOT,{recursive:true});
const ADMIN_PW=process.env.CALC_ADMIN_PW||fs.readFileSync(path.join(__dirname,'..','ADMIN_PASSWORD.txt'),'utf8').trim();
const BAD=/NaN|undefined|Infinity|\[object /;
const RES=[];const rec=(dev,k,ok,d='')=>{RES.push({dev,k,ok,d});expect.soft(ok,`${dev} ${k} ${d}`).toBeTruthy();};
test.afterAll(()=>{fs.appendFileSync(path.join(SHOT,'results.jsonl'),RES.map(r=>JSON.stringify(r)).join('\n')+'\n');});
const watch=pg=>{const e=[];pg.on('pageerror',x=>e.push('pageerror: '+x.message));pg.on('console',m=>{if(m.type()==='error'&&!/youtube|googlevideo|doubleclick|ytimg|favicon/i.test(m.text()+(m.location().url||'')))e.push('console: '+m.text().slice(0,150));});return e;};
const pageText=pg=>pg.evaluate(()=>document.body.innerText+' '+[...document.querySelectorAll('input,output')].map(i=>i.value).join(' '));
async function login(pg,u,p,rem){await pg.goto('/login');await pg.fill('[name=username]',u);await pg.fill('[name=password]',p);if(rem)await pg.check('#remember');await Promise.all([pg.waitForLoadState('networkidle'),pg.click('button.btn')]);await pg.waitForLoadState('networkidle');}
async function adminPost(pg,action,data){// 由後台頁取 csrf 後送表單
 return pg.evaluate(async([a,d])=>{const c=document.querySelector('input[name=_csrf]').value;const b=new URLSearchParams({_csrf:c});for(const [k,v] of Object.entries(d))(Array.isArray(v)?v:[v]).forEach(x=>b.append(k,x));const r=await fetch('/admin/'+a,{method:'POST',body:b});return r.status;},[action,data]);}

test('full regression',async({browser},ti)=>{const dev=ti.project.name,U='zz_reg_'+dev,NEWPW='Zz!'+Date.now().toString(36)+'q';
 const actx=await browser.newContext();const ap=await actx.newPage();const aerr=watch(ap);
 // ---- 登入頁：記住帳號、版面切換 ----
 await ap.goto('/login');rec(dev,'登入頁老虎影片',await ap.locator('video#bgv').count()===1);
 const lb=ap.locator('#laybtn');const t0=await lb.textContent();await lb.click();const t1=await lb.textContent();await lb.click();await lb.click();
 rec(dev,'版面切換按鈕',t0!==t1&&(await lb.textContent())===t0,`${t0}→${t1}`);
 await login(ap,'admin',ADMIN_PW);rec(dev,'admin 登入',ap.url().endsWith('/'),ap.url());
 await ap.screenshot({path:`${SHOT}/${dev}-01-calc-admin.png`});
 // ---- 後台：建立、權限、重設、搜尋、紀錄 ----
 await ap.goto('/admin');await ap.waitForLoadState('networkidle');
 await adminPost(ap,'delete',{username:U}).catch(()=>{});await ap.goto('/admin');
 const ALL=['bao','col','car','prize','draw','hist','stats','adv','mynum','share','fun','other'];
 await ap.fill('form[action="/admin/create"] [name=username]',U);await Promise.all([ap.waitForLoadState('networkidle'),ap.click('form[action="/admin/create"] button:not(#regen)')]);
 rec(dev,'後台 新增帳號',(await ap.content()).includes('已新增')&&(await ap.content()).includes(U));
 await adminPost(ap,'perms',{username:U,role:'user',perms:ALL.slice(0,3)});await ap.goto('/admin?q='+U);
 rec(dev,'後台 修改權限(3項)',/權限 3 項|已更新/.test(await ap.content()));
 await adminPost(ap,'perms',{username:U,role:'user',perms:ALL});
 await ap.goto('/admin');await ap.waitForSelector('form[action="/admin"] [name=q]');await ap.fill('form[action="/admin"] [name=q]',U);await Promise.all([ap.waitForLoadState('networkidle'),ap.press('form[action="/admin"] [name=q]','Enter')]);
 const rows=await ap.locator('.u').count();rec(dev,'後台 搜尋',rows===1&&(await ap.locator('.u').first().textContent()).includes(U),'rows='+rows);
 rec(dev,'後台 操作紀錄',(await ap.locator('table tr').count())>1);
 await ap.screenshot({path:`${SHOT}/${dev}-02-admin.png`,fullPage:true});
 // ---- 會員：首次登入強制改密碼 ----
 const uctx=await browser.newContext();const pg=await uctx.newPage();const err=watch(pg);
 await login(pg,U,'12345678');rec(dev,'首次登入導向改密碼',pg.url().endsWith('/password'),pg.url());
 await pg.fill('[name=old]','12345678');await pg.fill('[name=new1]','12345678');await pg.fill('[name=new2]','12345678');await Promise.all([pg.waitForLoadState('networkidle'),pg.click('button.btn')]);await pg.waitForSelector('.err');
 rec(dev,'拒絕預設密碼',(await pg.content()).includes('不能使用預設密碼'));
 await pg.fill('[name=old]','12345678');await pg.fill('[name=new1]',NEWPW);await pg.fill('[name=new2]',NEWPW);await Promise.all([pg.waitForURL(/\/$/),pg.click('button.btn')]);
 rec(dev,'改密碼成功',pg.url().endsWith('/'));
 // 記住帳號
 await pg.click('form[action="/logout"] button');await pg.waitForURL(/login/);
 await login(pg,U,NEWPW,true);await pg.click('form[action="/logout"] button');await pg.waitForURL(/login/);
 rec(dev,'記住帳號',(await pg.inputValue('[name=username]'))===U);
 await pg.fill('[name=password]',NEWPW);await Promise.all([pg.waitForURL(/\/$/),pg.click('button.btn')]);await pg.waitForTimeout(2500);
 // ---- 開獎、來源連結、倒數、直播 ----
 const body=await pg.evaluate(()=>document.body.innerText);
 for(const g of ['今彩539','大樂透','威力彩','加州天天樂','香港六合彩'])rec(dev,'開獎 '+g,body.includes(g)&&/最新開獎/.test(body));
 rec(dev,'加州來源有標示（官方或標明備援）',body.includes('California Lottery 官方')||body.includes('lotteryusa.com（官方 calottery 暫時無法連線'),body.includes('California Lottery 官方')?'官方':'備援');
 const hrefs=await pg.$$eval('a[href^="http"]',a=>a.map(x=>x.href));
 for(const d of ['taiwanlottery.com','calottery.com','hkjc.com'])rec(dev,'官方連結 '+d,hrefs.some(h=>h.includes(d)));
 const cd1=await pg.textContent('body');await pg.waitForTimeout(2200);const cd2=await pg.textContent('body');
 rec(dev,'倒數在跑',/\d+分\d+秒/.test(cd1)&&cd1!==cd2);
 const ifr=pg.locator('#livebox iframe');rec(dev,'直播/重播 iframe',(await ifr.count())===1&&/youtube\.com\/embed/.test(await ifr.getAttribute('src')));
 const s0=await ifr.getAttribute('src');await pg.click('#lsw');await pg.waitForTimeout(500);const s1=await pg.locator('#livebox iframe').getAttribute('src');
 rec(dev,'直播/重播切換',s0!==s1,`${s0} → ${s1}`);await pg.click('#lsw');
 await pg.screenshot({path:`${SHOT}/${dev}-03-calc-top.png`});
 // ---- 5 個計算器：每個欄位改值、每個按鈕都點 ----
 const secs=pg.locator('section.sec');rec(dev,'計算區數量=5',(await secs.count())===5);
 for(let i=0;i<await secs.count();i++){const s=secs.nth(i);const name=(await s.locator('h2').textContent()).slice(0,10);const before=await s.innerHTML();
  const ins=s.locator('input.n');const nIn=Math.min(await ins.count(),30);for(let k=0;k<nIn;k++){const el=ins.nth(k);if(!(await el.isEditable()))continue;const v=await el.inputValue();await el.fill(String((+v||3)+1));await el.dispatchEvent('input');await el.dispatchEvent('change');}
  const ms=s.locator('#mine');if(await ms.count())await ms.fill('1 2 3 4 5');
  const sel=s.locator('select');for(let k=0;k<await sel.count();k++){const o=await sel.nth(k).locator('option').evaluateAll(x=>x.map(y=>y.value));for(const v of o)await sel.nth(k).selectOption(v);await sel.nth(k).selectOption(o[0]);}
  const bs=s.locator('button');const nB=Math.min(await bs.count(),30);for(let k=0;k<nB;k++){const x=bs.nth(k);if(await x.count()&&await x.isVisible())await x.click({timeout:5000}).catch(()=>{});}
  await pg.waitForTimeout(300);const txt=await s.evaluate(e=>e.innerText+' '+[...e.querySelectorAll('input,output')].map(i=>i.value).join(' '));
  rec(dev,'計算器 '+name,!BAD.test(txt)&&(await s.innerHTML())!==before,BAD.test(txt)?'含 NaN/undefined':'');
  await s.screenshot({path:`${SHOT}/${dev}-04-calc-${i+1}.png`});}
 rec(dev,'計算頁無 JS 錯誤',err.length===0,err.slice(0,3).join(' | '));err.length=0;
 // ---- 統計 8 分頁 × 5 彩種 × 期數篩選 ----
 await pg.goto('/stats');await pg.waitForLoadState('networkidle');await pg.waitForTimeout(1500);
 const games=await pg.$$eval('#g option',o=>o.map(x=>x.value)),rngs=await pg.$$eval('#rng option',o=>o.map(x=>x.value));
 const tabs=await pg.$$eval('#tabs [data-t]',b=>b.map(x=>[x.dataset.t,x.innerText.trim()]));rec(dev,'統計分頁=8',tabs.length===8,tabs.map(t=>t[1]).join('/'));
 for(const [t,tn] of tabs){let bad=[];
  for(const g of games){await pg.selectOption('#g',g);await pg.waitForTimeout(700);await pg.click(`#tabs [data-t="${t}"]`);await pg.waitForTimeout(400);
   for(const r of (g===games[0]?rngs.filter(r=>r!=='d'):[rngs[0]])){await pg.selectOption('#rng',r);await pg.waitForTimeout(300);
    for(let w=0;w<40;w++){const tx=await pg.locator('#pane-'+t).innerText().catch(()=>'');if(tx.trim().length>=10&&!/載入中/.test(tx))break;await pg.waitForTimeout(200);}const x=await pg.locator('#pane-'+t).innerText();if(BAD.test(x)||x.trim().length<10)bad.push(g+'/'+r+'['+(BAD.exec(x)||['short:'+x.trim().slice(0,40)])[0]+']');}}
  await pg.selectOption('#g',games[0]);await pg.click(`#tabs [data-t="${t}"]`);await pg.waitForTimeout(500);await pg.screenshot({path:`${SHOT}/${dev}-05-stats-${t}.png`});
  // 分頁內按鈕全點（送出分享按鈕另外測）
  const bs=pg.locator(`#pane-${t} button:not(#sgo):not(#sdel):not([data-p])`);const n=Math.min(await bs.count(),40);for(let k=0;k<n;k++){if(await bs.nth(k).isVisible())await bs.nth(k).click({timeout:3000}).catch(e=>bad.push('btn'+k));}
  const x=await pg.locator('#pane-'+t).innerText();if(BAD.test(x))bad.push('after-click');
  rec(dev,'統計 '+tn+'（5 彩種+篩選+按鈕）',bad.length===0,bad.join(','));}
 // 自訂日期篩選
 if(rngs.includes('d')){await pg.selectOption('#rng','d');await pg.fill('#d1','2026-01-01');await pg.fill('#d2','2026-10-01');await pg.locator('#d2').dispatchEvent('change');await pg.waitForTimeout(500);rec(dev,'自訂日期篩選',!BAD.test(await pg.locator('#panes').innerText()));await pg.selectOption('#rng',rngs[0]);}
 // 選號匣按鈕
 for(const id of ['tosend','tobao','toclr'])if(await pg.locator('#'+id).isVisible()){await pg.click('#'+id).catch(()=>{});await pg.goto('/stats');await pg.waitForLoadState('networkidle');}
 // ---- 我的號碼（API 存→讀→清） ----
 const my=await pg.evaluate(async()=>{const c=(await (await fetch('/api/csrf')).json()).csrf,h={'Content-Type':'application/json','X-CSRF':c};
  const a=await (await fetch('/api/mysets',{method:'POST',headers:h,body:JSON.stringify({sets:[{game:'539',name:'回歸',nums:[1,2,3,4,5]}]})})).json();
  const b=await (await fetch('/api/mysets')).json();await fetch('/api/mysets',{method:'POST',headers:h,body:JSON.stringify({sets:[]})});return a.ok&&b.sets.length===1;});
 rec(dev,'我的號碼 存/讀/清',my);
 // ---- 熱門分享：送出 → 撤回 ----
 await pg.selectOption('#g','539');await pg.waitForTimeout(800);await pg.click('#tabs [data-t="share"]');await pg.waitForTimeout(800);
 for(const n of [7,17,27])await pg.click(`#pane-share [data-p="${n}"]`);await pg.click('#sgo');await pg.waitForSelector('#sdel',{timeout:8000}).catch(()=>{});
 rec(dev,'熱門分享 送出',await pg.locator('#sdel').isVisible());await pg.screenshot({path:`${SHOT}/${dev}-06-share-sent.png`});
 pg.once('dialog',d=>d.accept());await pg.click('#sdel');await pg.waitForSelector('#sgo',{timeout:8000}).catch(()=>{});
 const sh=await pg.evaluate(async()=>(await (await fetch('/api/share/539')).json()).mine);
 rec(dev,'熱門分享 撤回',(await pg.locator('#sgo').isVisible())&&!sh);await pg.screenshot({path:`${SHOT}/${dev}-07-share-withdrawn.png`});
 rec(dev,'統計頁無 JS 錯誤',err.length===0,err.slice(0,3).join(' | '));
 // ---- 後台：重設密碼回 12345678，再刪除 ----
 await ap.goto('/admin');rec(dev,'後台 重設密碼',(await adminPost(ap,'reset',{username:U}))<400);
 const c3=await browser.newContext();const p3=await c3.newPage();await login(p3,U,'12345678');rec(dev,'重設後須改密碼',p3.url().endsWith('/password'));await c3.close();
 await ap.goto('/admin');await adminPost(ap,'delete',{username:U});await ap.goto('/admin?q='+U);rec(dev,'刪除暫時帳號',!(await ap.content()).includes('<b>'+U+'</b>'));
 rec(dev,'後台無 JS 錯誤',aerr.length===0,aerr.slice(0,3).join(' | '));
 await uctx.close();await actx.close();});
