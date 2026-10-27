// 執行：在裝有最新 playwright＋webkit 的目錄 node 此檔；本機伺服器 http://localhost:4000
const {webkit,chromium,devices}=require('playwright');const fs=require('fs');const B='http://localhost:4000',PW=fs.readFileSync('/workspace/calc-app/ADMIN_PASSWORD.txt','utf8').trim(),OUT='/workspace/calc-auto/screens/';const R=[];const ok=(k,v,d='')=>R.push((v?'PASS ':'FAIL ')+k+(d?' — '+d:''));
async function login(p,u,pw){await p.goto(B+'/login');await p.fill('[name=username]',u);await p.fill('[name=password]',pw);await Promise.all([p.waitForLoadState('networkidle'),p.click('button.btn')]);}
async function run(name,bt,opts,perm){const b=await bt.launch(bt===chromium?{executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}:{});const c=await b.newContext(opts);if(perm)await c.grantPermissions(['clipboard-read','clipboard-write'],{origin:B});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await login(p,'admin',PW);await p.goto(B+'/admin');await p.locator('#newu').locator('xpath=ancestor::div[contains(@class,"box")]').screenshot({path:OUT+name+'-create-before.png'});const v1=await p.inputValue('#newu');ok(name+' 會員預填 m+6碼',/^m\d{6}$/.test(v1),v1);
 await p.click('#regen');await p.waitForFunction(v=>document.getElementById('newu').value!==v,v1);const v2=await p.inputValue('#newu');ok(name+' 🔄 重新產生',/^m\d{6}$/.test(v2)&&v2!==v1,v2);
 await p.selectOption('form[action="/admin/create"] select[name=role]','agent');await p.waitForFunction(()=>/^a\d{6}$/.test(document.getElementById('newu').value));const ag=await p.inputValue('#newu');ok(name+' 選代理→a+6碼',true,ag);
 await Promise.all([p.waitForLoadState('networkidle'),p.click('form[action="/admin/create"] button:not(#regen)')]);
 const box=await p.locator('#newacct').isVisible(),txt=await p.textContent('#cptxt');ok(name+' 建立後結果框',box&&txt.includes('帳號：'+ag)&&txt.includes('密碼：12345678'),txt);
 await p.waitForTimeout(500);const auto=await p.textContent('#cpmsg');ok(name+' 自動複製結果有提示',/已自動複製|請按複製/.test(auto),auto);
 await p.click('#cpbtn');await p.waitForTimeout(300);const m2=await p.textContent('#cpmsg');ok(name+' 按複製',m2==='已複製',m2);
 if(perm){const clip=await p.evaluate(()=>navigator.clipboard.readText());ok(name+' 剪貼簿內容',clip==='帳號：'+ag+' 密碼：12345678',clip);}
 await p.locator('#newacct').scrollIntoViewIfNeeded();await p.locator('#newacct').locator('xpath=..').screenshot({path:OUT+name+'-create-block.png'});
 // 編輯帳號名
 await p.fill('#newu','zz_custom_'+name.slice(0,3));const custom=await p.inputValue('#newu');await Promise.all([p.waitForLoadState('networkidle'),p.click('form[action="/admin/create"] button:not(#regen)')]);ok(name+' 管理員可改帳號名',(await p.textContent('#cptxt')).includes(custom));
 // 代理登入：強制改密碼，然後預填 m
 const c2=await b.newContext(opts);const p2=await c2.newPage();await login(p2,ag,'12345678');ok(name+' 新代理首次登入強制改密碼',p2.url().endsWith('/password'));
 await p2.fill('[name=old]','12345678');await p2.fill('[name=new1]','Zz_agent_99');await p2.fill('[name=new2]','Zz_agent_99');await Promise.all([p2.waitForURL(/\/$/),p2.click('button.btn')]);
 await p2.goto(B+'/admin');const am=await p2.inputValue('#newu');ok(name+' 代理後台預填 m+6碼',/^m\d{6}$/.test(am),am);
 await Promise.all([p2.waitForLoadState('networkidle'),p2.click('form[action="/admin/create"] button:not(#regen)')]);ok(name+' 代理建立會員+結果框',(await p2.textContent('#cptxt')).includes('帳號：'+am));
 await p2.locator('#newacct').locator('xpath=..').screenshot({path:OUT+name+'-agent-create-block.png'});
 // 清理（本機）
 await p.goto(B+'/admin');const del=async u=>p.evaluate(async u=>{const c=document.querySelector('input[name=_csrf]').value;await fetch('/admin/delete',{method:'POST',body:new URLSearchParams({_csrf:c,username:u})});},u);await del(am);await del(ag);await del(custom);
 ok(name+' 無 JS 錯誤',errs.length===0,errs.join('|'));await b.close();}
(async()=>{await run('iphone-webkit',webkit,{...devices['iPhone 13']});await run('pc-chrome',chromium,{viewport:{width:1440,height:900}},true);console.log(R.join('\n'));})().catch(e=>{console.log(R.join('\n'));console.log('CRASH',e.message.slice(0,400));});
