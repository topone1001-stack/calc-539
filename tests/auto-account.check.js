// 執行：NODE_PATH=/tmp/wk/node_modules node tests/auto-account.check.js（需本機伺服器 :4000 與 playwright+webkit）
const {webkit,chromium,devices}=require('playwright');const fs=require('fs');const B='http://localhost:4000',PW=fs.readFileSync('/workspace/calc-app/ADMIN_PASSWORD.txt','utf8').trim(),OUT='/workspace/calc-auto/screens/';const R=[];const ok=(k,v,d='')=>R.push((v?'PASS ':'FAIL ')+k+(d?' — '+d:''));
async function login(p,u,pw){await p.goto(B+'/login');await p.fill('[name=username]',u);await p.fill('[name=password]',pw);await Promise.all([p.waitForLoadState('networkidle'),p.click('button.btn')]);}
const create=async p=>{await Promise.all([p.waitForNavigation(),p.click('form[action="/admin/create"] button:not(#regen)')]);if(!await p.locator('#cptxt').count())throw new Error('no cptxt: '+p.url()+' '+(await p.textContent('body')).slice(0,300));return (await p.textContent('#cptxt')).match(/帳號：(\S+)/)[1];};
async function run(name,bt,opts,perm){const b=await bt.launch(bt===chromium?{executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}:{});const c=await b.newContext(opts);if(perm)await c.grantPermissions(['clipboard-read','clipboard-write'],{origin:B});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const made=[];
 await login(p,'admin',PW);await p.goto(B+'/admin');const v1=await p.inputValue('#newu');ok(name+' 會員預填隨機帳號(無易混字)',/^m[23456789abcdefghjkmnpqrstuvwxyz]{6}$/.test(v1),v1);await p.click('#regen');await p.waitForFunction(v=>document.getElementById('newu').value!==v,v1);const v1b=await p.inputValue('#newu');ok(name+' 換一個 產生新帳號',/^m[23456789abcdefghjkmnpqrstuvwxyz]{6}$/.test(v1b)&&v1b!==v1,v1b);await p.fill('#newu',v1);
 await p.locator('#newu').locator('xpath=ancestor::div[contains(@class,"box")]').screenshot({path:OUT+name+'-rand-before.png'});
 const u1=await create(p);made.push(u1);ok(name+' 建立 = 預填',u1===v1,u1);ok(name+' 建立後無自動複製',(await p.textContent('#cpmsg'))==='');ok(name+' 只有一個複製按鈕',await p.locator('#newacct button').count()===1);
 const v2=await p.inputValue('#newu');ok(name+' 下一個預填為新隨機帳號',/^m[23456789abcdefghjkmnpqrstuvwxyz]{6}$/.test(v2)&&v2!==u1,v2);
 await p.click('#cpbtn');await p.waitForTimeout(300);const m=await p.textContent('#cpmsg');ok(name+' 點複製',m.startsWith('已複製'),m);
 if(perm){const clip=await p.evaluate(()=>navigator.clipboard.readText());ok(name+' 剪貼簿內容',clip==='帳號：'+u1+' 密碼：12345678',clip);}
 await p.locator('#newacct').locator('xpath=..').screenshot({path:OUT+name+'-rand-created.png'});
 // 撞號：第二個分頁拿到同一預填，先後送出
 const c3=await b.newContext(opts);const p2=await c3.newPage();await login(p2,'admin',PW);await p2.goto(B+'/admin');await p2.fill('#newu',await p.inputValue('#newu'));const pa=await p.inputValue('#newu'),pb=await p2.inputValue('#newu');
 const [x1,x2]=await Promise.all([create(p),create(p2)]);made.push(x1,x2);ok(name+' 兩人同時新增不撞號',pa===pb&&x1!==x2,`預填 ${pa}/${pb} → ${x1},${x2}`);
 await p.selectOption('form[action="/admin/create"] select[name=role]','agent');await p.waitForFunction(()=>/^a[2-9a-z]{6}$/.test(document.getElementById('newu').value));const ag=await create(p);made.push(ag);ok(name+' 代理 a 開頭隨機',/^a[23456789abcdefghjkmnpqrstuvwxyz]{6}$/.test(ag),ag);
 const c2=await b.newContext(opts);const q=await c2.newPage();await login(q,ag,'12345678');ok(name+' 首次登入強制改密碼',q.url().endsWith('/password'));await c2.close();
 await p.goto(B+'/admin');for(const u of made)await p.evaluate(async u=>{const c=document.querySelector('input[name=_csrf]').value;await fetch('/admin/delete',{method:'POST',body:new URLSearchParams({_csrf:c,username:u})});},u);
 ok(name+' 無 JS 錯誤',errs.length===0,errs.join('|'));await b.close();}
(async()=>{await run('iphone-webkit',webkit,{...devices['iPhone 13']});await run('pc-chrome',chromium,{viewport:{width:1440,height:900}},true);console.log(R.join('\n'));})().catch(e=>{console.log(R.join('\n'));console.log('CRASH',e.message.slice(0,400));});
