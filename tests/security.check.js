// 安全回歸：需以 STALE_MS_OVERRIDE=4000 啟動本機伺服器（只用本機假資料）
const fs=require('fs');const B=process.env.CALC_URL||'http://localhost:4000';
const PW=fs.readFileSync(process.env.ADMIN_PW_FILE||'/workspace/calc-app/ADMIN_PASSWORD.txt','utf8').trim();
const R=[];const ok=(k,v,d='')=>{R.push(v);console.log((v?'PASS ':'FAIL ')+k+(d?' — '+d:''));};
const IPB=10+Math.floor(Math.random()*200);let ipn=1;const newIp=()=>'10.'+IPB+'.'+(ipn++)+'.'+(1+Math.floor(Math.random()*250));
function C(ip){const c={ip,jar:'',async f(p,o={}){const h={...(o.headers||{}),'X-Forwarded-For':ip};if(c.jar)h.cookie=c.jar;const r=await fetch(B+p,{...o,headers:h,redirect:'manual'});const sc=r.headers.getSetCookie?r.headers.getSetCookie():[];for(const x of sc){const v=x.split(';')[0];if(v.startsWith('calc.sid='))c.jar=v;}return r;},
 async login(u,p){const r=await c.f('/login',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:u,password:p})});return r.headers.get('location')||'';},
 async csrf(){const t=await (await c.f('/admin')).text();return (t.match(/name="_csrf" value="([^"]+)"/)||[])[1];},
 async post(a,d){const t=await c.csrf();const r=await c.f('/admin/'+a,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:t,...d})});return r;},
 async flash(){return (await (await c.f('/admin')).text());}};return c;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const made=[];const ad=C(newIp());ok('admin 登入',(await ad.login('admin',PW))==='/');
 const mk=async(n,role,extra={})=>{await ad.post('create',{username:n,role,...extra});made.push(n);};
 const fresh=async(n,role)=>{await mk(n,role);const c=C(newIp());await c.login(n,'12345678');const t=await (await c.f('/password')).text();const k=(t.match(/name="_csrf" value="([^"]+)"/)||[])[1];await c.f('/password',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:k,old:'12345678',new1:'Zz!test9876',new2:'Zz!test9876'})});return c;};
 // (a) 24h 未改密碼：登入擋下 + 既有 session 也被踢
 await mk('zz_sec_st','user');const s1=C(newIp());const l1=await s1.login('zz_sec_st','12345678');ok('(a) 剛建立可登入',l1==='/',l1);const s1b=C(newIp());await s1b.login('zz_sec_st','12345678');
 await sleep(4500);
 const r1=await s1.f('/password');ok('(a) 既有 session 過期後被踢出',r1.status===302&&/e=stale/.test(r1.headers.get('location')),r1.headers.get('location'));
 const r2=await s1.f('/api/csrf');ok('(a) session 已銷毀，API 不可用',r2.status!==200,String(r2.status));
 const s2=C(newIp());const l2=await s2.login('zz_sec_st','12345678');ok('(a) 過期後正確密碼仍拒絕登入',/e=stale/.test(l2),l2);
 const s2c=await s1b.f('/api/csrf');ok('(a) 過期 API 回 401',s2c.status===401||s2c.status===302,String(s2c.status));
 await ad.post('reset',{username:'zz_sec_st'});const l3=await C(newIp()).login('zz_sec_st','12345678');ok('(a) 上線重設後重新計時可登入',l3==='/',l3);
 // 舊帳號（無 pwSetAt）不擋：直接改 users.json 不可行（記憶體快取），改以程式邏輯檢查
 const src=fs.readFileSync(__dirname+'/../server.js','utf8');ok('(a) 無 pwSetAt 的舊帳號不擋（stale 需 pwSetAt）',/r\.mustChange&&r\.pwSetAt&&/.test(src));
 // (b) 速率限制
 await fresh('zz_sec_ag','agent');
 const atk=C(newIp());const res=[];for(let i=0;i<6;i++)res.push(await atk.login('zz_sec_ag','wrong'+i));
 ok('(b) 同 IP+帳號 5 次錯誤後鎖定',res[5].includes('e=rate'),res.join(','));
 const t0=Date.now();const other=C(newIp());const lo=await other.login('zz_sec_ag','Zz!test9876');
 ok('(b) 被攻擊的代理從其他 IP 用正確密碼仍可登入（不硬鎖帳號）',lo==='/',lo+' '+(Date.now()-t0)+'ms');
 const a2=C(newIp());const ra=[];for(let i=0;i<5;i++)ra.push(await a2.login('admin','bad'+i));
 const t1=Date.now();const ad2=C(newIp());const la=await ad2.login('admin',PW);ok('(b) 管理員被猜錯後他 IP 仍可登入',la==='/',la+' '+(Date.now()-t1)+'ms');
 const a3=C(newIp());for(let i=0;i<5;i++)await a3.login('admin','bad'+i);const t2=Date.now();await C(newIp()).login('admin','bad');ok('(b) 跨 IP 連續猜錯有延遲',Date.now()-t2>=400,(Date.now()-t2)+'ms');
 await C(newIp()).login('admin',PW);// 清除 AF
 const ipx=C(newIp());const rx=[];for(let i=0;i<6;i++)rx.push(await ipx.login('zz_nobody'+i,'x'));ok('(b) 同 IP 換帳號亂猜也鎖 IP',rx[5].includes('e=rate'),rx[5]);
 // (c) 代理只能管自己下線
 await mk('zz_sec_m1','user',{parent:'zz_sec_ag'});await mk('zz_sec_m2','user');
 const ag=other;const rd=()=>JSON.parse(fs.readFileSync(__dirname+'/../users.json','utf8'))['zz_sec_m2'];for(const [a,d] of [['reset',{}],['toggle',{}],['perms',{role:'agent'}],['delete',{}]]){const before=JSON.stringify(rd());await ag.post(a,{username:'zz_sec_m2',...d});const h=await ag.flash();ok('(c) 代理對非下線 '+a+' 被拒',h.includes('無權管理此帳號')&&JSON.stringify(rd())===before);}
 const own=await ag.post('reset',{username:'zz_sec_m1'});const oh=await ag.flash();ok('(c) 代理對自己下線 reset 成功',/已重設 zz_sec_m1/.test(oh));
 const vis=await ag.flash();const vt=vis.replace(/→ zz_sec_m2/g,'');const ix=vt.indexOf('zz_sec_m2');ok('(c) 代理後台看不到非下線帳號',ix<0,ix<0?'':vt.slice(ix-150,ix+50));
 // 清理
 for(const n of made.reverse())await ad.post('delete',{username:n});const us=JSON.parse(fs.readFileSync(__dirname+'/../users.json','utf8'));ok('清理 zz_sec 帳號',!Object.keys(us).some(k=>k.startsWith('zz_sec')));
 console.log(R.every(Boolean)?'ALL PASS':'SOME FAIL');process.exit(R.every(Boolean)?0:1);})().catch(e=>{console.log('CRASH',e);process.exit(2)});
