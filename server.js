const express=require('express'),session=require('express-session'),bcrypt=require('bcryptjs'),rateLimit=require('express-rate-limit'),crypto=require('crypto'),fs=require('fs'),path=require('path'),U=require('./users');
const DR=require('./draws'),S=require('./store'),HI=require('./hist');
(async()=>{await S.init();if(!S.get('users')){try{const f=require('path').join(__dirname,'users.json');if(require('fs').existsSync(f)){await S.set('users',JSON.parse(require('fs').readFileSync(f,'utf8')));console.log('users imported from file');}}catch(e){}}DR.start();HI.start().catch(e=>console.error('hist',e.message));
const app=express();app.set('trust proxy',1);
if(process.env.SEED_ADMIN_HASH){const us=U.load();if(!Object.values(us).some(u=>u.role==='admin'||!u.role)){us.admin={hash:process.env.SEED_ADMIN_HASH,role:'admin',enabled:true,expires:'',perms:['bao','col','car','prize','draw']};await S.set('users',us);console.log('seeded admin');}}
let store;if(S.pg()){const PS=require('connect-pg-simple')(session);store=new PS({pool:S.pg(),createTableIfMissing:true});}
app.use(require('compression')());app.use(express.urlencoded({extended:false}));app.use(express.json({limit:'20kb'}));
app.use(session({store,secret:S.get('secret'),resave:false,saveUninitialized:false,name:'calc.sid',cookie:{httpOnly:true,sameSite:'lax',secure:'auto',maxAge:7*864e5}}));
const FEATS=[['bao','包牌'],['col','立柱'],['car','車'],['prize','獎金'],['draw','開獎試算'],['hist','歷史開獎'],['stats','號碼統計'],['adv','進階分析'],['mynum','我的號碼'],['share','熱門分享'],['fun','沙盤浮字'],['other','3星/4星/Bingo']];
const ALL=FEATS.map(f=>f[0]);
const norm=(name,u)=>{const role=u.role||(name==='admin'?'admin':'user');return {hash:u.hash,parent:u.parent||'',created:u.created||'',createdBy:u.createdBy||'',role,enabled:u.enabled!==false,expires:u.expires||'',perms:role==='admin'?ALL.slice():(Array.isArray(u.perms)?u.perms:ALL.slice()),sets:u.sets||[]};};
const today=()=>new Date(Date.now()+8*3600e3).toISOString().slice(0,10); // Asia/Taipei
const usable=u=>u&&u.enabled&&(!u.expires||u.expires>=today());
const getU=n=>{const r=U.load()[n];return r?norm(n,r):null;};
const auth=(q,s,n)=>{const us=U.load(),nm=q.session.user;if(!nm||!us[nm])return q.session.destroy(()=>s.redirect('/login'));const e=eff(us,nm);if(!e.ok)return q.session.destroy(()=>s.redirect('/login'));q.u=e;n();};
const admin=(q,s,n)=>q.u.role==='admin'?n():s.status(403).send('403 無權限');
const P=f=>path.join(__dirname,'public',f);
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csrf=q=>q.session.csrf||(q.session.csrf=crypto.randomBytes(24).toString('hex'));
const chk=(q,s,n)=>{const t=q.body._csrf||'',r=q.session.csrf||'';if(t.length===r.length&&r&&crypto.timingSafeEqual(Buffer.from(t),Buffer.from(r)))return n();s.status(403).send('CSRF 驗證失敗');};
app.get('/login',(q,s)=>q.session.user?s.redirect('/'):s.sendFile(P('login.html')));
const DUMMY=bcrypt.hashSync('x',12);
app.post('/login',rateLimit({windowMs:15*60e3,limit:10,handler:(q,s)=>s.redirect('/login?e=rate')}),(q,s)=>{
 const name=q.body.username||'',u=getU(name);
 const ok=bcrypt.compareSync(q.body.password||'',u?u.hash:DUMMY);
 const LG=S.get('logins')||{};const rec=okk=>{if(!u)return;(LG[name]=LG[name]||[]).unshift({t:new Date().toISOString(),ip:q.ip,ok:okk});LG[name]=LG[name].slice(0,30);S.set('logins',LG).catch(()=>{});};
 if(ok&&u&&!eff(U.load(),name).ok){rec(false);return s.redirect('/login?e=off');}
 if(ok&&u){const us=U.load();us[name]={...us[name],lastLogin:new Date().toISOString(),lastIp:q.ip};U.save(us);rec(true);}else rec(false);
 if(ok&&u)return q.session.regenerate(()=>{q.session.user=name;s.redirect('/');});
 s.redirect('/login?e=1');});
app.post('/logout',(q,s)=>q.session.destroy(()=>{s.clearCookie('calc.sid');s.redirect('/login');}));
app.get('/layout.js',(q,s)=>s.sendFile(P('layout.js')));
app.get('/style.css',(q,s)=>s.sendFile(P('style.css')));
// server-side feature gating: strip sections the user lacks
const DRAWBOX='<details id="live" class="drawbox" open><summary><b>📺 開獎直播（全民i彩券）</b> <span class="note">週一至週六 20:30</span></summary><div id="livebox"></div></details><div id="draws" class="drawbox"><p class="note">載入開獎資料中…</p></div>';
const CALC=fs.readFileSync(P('calc.html'),'utf8');
app.get('/',auth,(q,s)=>{const i=CALC.indexOf('<h2>'),e=CALC.lastIndexOf('</div></div><script');const parts=CALC.slice(i,e).split(/(?=<h2>)/);
 let body=parts.map((p,k)=>q.u.perms.includes(ALL[k])?'<section class="sec sec-'+ALL[k]+'">'+p+'</section>':'').join('');body=body&&'<div class="secs">'+body+'</div>';if(!body)body='<p>此帳號尚未開通任何功能，請聯絡管理員。</p>';
 s.type('html').send(CALC.slice(0,i)+'<div class="tops">'+DRAWBOX+'</div>'+body+CALC.slice(e));});
app.get('/calc.js',auth,(q,s)=>s.sendFile(P('calc.js')));
app.get('/draws',auth,(q,s)=>s.set('Cache-Control','no-store').json(DR.get()));

// ---- 統計／歷史 API ----
const can=(...f)=>(q,s,n)=>f.some(x=>q.u.perms.includes(x))?n():s.status(403).json({error:'無權限'});
const jchk=(q,s,n)=>{const t=q.get('X-CSRF')||'',r=q.session.csrf||'';if(r&&t.length===r.length&&crypto.timingSafeEqual(Buffer.from(t),Buffer.from(r)))return n();s.status(403).json({error:'CSRF'});};
const GK=['539','lotto','super','ca','hk'];
app.get('/stats',auth,(q,s)=>s.sendFile(P('stats.html')));
app.get('/stats.js',auth,(q,s)=>s.sendFile(P('stats.js')));
app.get('/api/hist/:g',auth,can('hist','stats','adv','share','fun'),(q,s)=>{const g=q.params.g;if(!GK.includes(g))return s.status(404).end();const d={...HI.data(g),importing:HI.importing()};const tag='"'+g+d.total+(d.last||'')+d.importing+'"';if(q.get('If-None-Match')===tag)return s.status(304).end();s.set({ETag:tag,'Cache-Control':'private, no-cache'}).json(d);});
app.get('/api/hist-status',auth,admin,(q,s)=>s.json({...HI.status(),counts:Object.fromEntries(GK.map(g=>[g,HI.data(g).total]))}));
app.get('/api/csrf',auth,(q,s)=>s.json({csrf:csrf(q)}));
app.get('/api/mysets',auth,can('mynum'),(q,s)=>s.json({sets:q.u.sets}));
app.post('/api/mysets',auth,can('mynum'),jchk,(q,s)=>{const sets=(Array.isArray(q.body.sets)?q.body.sets:[]).slice(0,2).map(x=>({game:GK.includes(x.game)?x.game:'539',name:String(x.name||'').slice(0,20),nums:[...new Set((x.nums||[]).map(Number).filter(n=>n>=1&&n<=49))].slice(0,12)}));
 const us=U.load();us[q.session.user]={...us[q.session.user],sets};U.save(us);oplog(q,'修改我的號碼',q.session.user,sets.map(x=>x.nums.length+'碼').join('/'));s.json({ok:true,sets});});
// 彩迷熱門號碼分享：每人每期每遊戲一次，最多 10 碼
const nextKey=g=>{const d=HI.data(g);const L=d.rows[d.rows.length-1];if(!L)return 'next';if(g==='hk'){const [y,n]=L[0].split('/');return y+'/'+String(+n+1).padStart(3,'0');}return String(+L[0]+1);};
app.get('/api/share/:g',auth,can('share'),(q,s)=>{const g=q.params.g;if(!GK.includes(g))return s.status(404).end();const k=nextKey(g),all=(S.get('shares')||{})[g]||{},cur=all[k]||{};const cnt={};Object.values(cur).forEach(a=>a.forEach(n=>cnt[n]=(cnt[n]||0)+1));
 s.json({period:k,users:Object.keys(cur).length,cnt,mine:cur[q.session.user]||null});});
app.post('/api/share/:g',auth,can('share'),jchk,(q,s)=>{const g=q.params.g;if(!GK.includes(g))return s.status(404).end();const mx=HI.data(g).max||49;const nums=[...new Set((q.body.nums||[]).map(Number).filter(n=>n>=1&&n<=mx))].slice(0,10);if(!nums.length)return s.status(400).json({error:'請選號碼'});
 const sh=S.get('shares')||{},k=nextKey(g);sh[g]=sh[g]||{};for(const kk of Object.keys(sh[g]))if(kk!==k)delete sh[g][kk];sh[g][k]=sh[g][k]||{};if(sh[g][k][q.session.user])return s.status(409).json({error:'本期已分享過'});
 sh[g][k][q.session.user]=nums;S.set('shares',sh);oplog(q,'熱門分享',q.session.user,g+' '+k+'：'+nums.join(' '));s.json({ok:true});});
app.get('/api/other',auth,can('other'),(q,s)=>s.json(DR.get().other||{}));

// ---- 外部排程喚醒（GitHub Actions）：帶 X-Cron-Token 呼叫 ----
let cronLast=null;
app.all('/cron',async(q,s)=>{const tk=process.env.CRON_TOKEN||'',got=q.get('X-Cron-Token')||'';if(!tk||got.length!==tk.length||!crypto.timingSafeEqual(Buffer.from(got),Buffer.from(tk)))return s.status(403).json({error:'forbidden'});
 const t0=Date.now();await DR.refreshAll();const added=await HI.syncRecent();cronLast={at:new Date().toISOString(),added,ms:Date.now()-t0};
 const st=S.get('cronlog')||[];st.unshift(cronLast);S.set('cronlog',st.slice(0,50)).catch(()=>{});s.json({ok:true,...cronLast,counts:Object.fromEntries(GK.map(g=>[g,HI.data(g).total]))});});
app.get('/api/cron-log',auth,admin,(q,s)=>s.json(S.get('cronlog')||[]));
app.get('/me',auth,(q,s)=>s.json({user:q.session.user,role:q.u.role,perms:q.u.perms,sets:q.u.perms.includes('mynum')?q.u.sets:[]}));
// ---- 後台：管理員／代理（多層）----
const ROLES={admin:'管理員',agent:'代理',user:'會員'};
const parentOf=(us,n)=>us[n]&&us[n].parent||'';
const ups=(us,n)=>{const out=[];let p=parentOf(us,n),g=0;while(p&&us[p]&&g++<100){out.push(p);p=parentOf(us,p);}return out;};
const downs=(us,n)=>{const kids={};for(const k of Object.keys(us)){const p=parentOf(us,k);if(p)(kids[p]=kids[p]||[]).push(k);}const out=[];const st=[...(kids[n]||[])];while(st.length){const x=st.pop();out.push(x);st.push(...(kids[x]||[]));}return out;};
const direct=(us,n)=>Object.keys(us).filter(k=>parentOf(us,k)===n);
// 有效權限／到期：沿上線取交集與最早到期；任何上線停用或過期 → 整條下線不可用
function eff(us,n){const u=norm(n,us[n]);let perms=u.perms.slice(),exp=u.expires,ok=usable(u);for(const p of ups(us,n)){const x=norm(p,us[p]);if(!usable(x))ok=false;if(x.role!=='admin')perms=perms.filter(k=>x.perms.includes(k));if(x.expires&&(!exp||x.expires<exp))exp=x.expires;}if(exp&&exp<today())ok=false;return {...u,perms,effExpires:exp,ok};}
const visible=q=>{const us=U.load();return q.u.role==='admin'?Object.keys(us):downs(us,q.session.user);};
const mgr=(q,s,n)=>q.u.role==='admin'||q.u.role==='agent'?n():s.status(403).send('403 無權限');
const OPN=200;const oplog=(q,act,target,detail)=>{const L=S.get('oplog')||[];L.unshift({t:new Date().toISOString(),by:q.session.user,act,target,detail:detail||'',ip:q.ip});S.set('oplog',L.slice(0,1000)).catch(()=>{});};
const tpe=t=>t?new Date(t).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'—';
const latestOf=g=>{const d=DR.get();return g==='539'?d.d539&&d.d539[0]:g==='lotto'?d.lotto&&d.lotto[0]:g==='super'?d.super&&d.super[0]:d[g]&&d[g].latest;};
const GN={'539':'今彩539',lotto:'大樂透',super:'威力彩',ca:'加州天天樂',hk:'香港六合彩'};
const page=(q,msg)=>{const t=csrf(q),us=U.load(),me=q.session.user,isA=q.u.role==='admin',vis=new Set(visible(q)),f=q.query;
 const F=(a,inner)=>`<form method="post" action="/admin/${a}"><input type="hidden" name="_csrf" value="${t}">${inner}</form>`;
 const myEff=eff(us,me),capPerms=isA?ALL:myEff.perms;
 const agents=[...(isA?[]:[me]),...[...vis].filter(n=>norm(n,us[n]).role==='agent')];
 let list=[...vis];if(f.agent&&(f.agent===me||vis.has(f.agent))){const sub=new Set(downs(us,f.agent));list=list.filter(n=>sub.has(n));}
 if(f.role)list=list.filter(n=>norm(n,us[n]).role===f.role);
 if(f.st)list=list.filter(n=>{const e=eff(us,n);return f.st==='ok'?e.ok:!e.ok;});
 if(f.q){const k=String(f.q).toLowerCase();list=list.filter(n=>n.toLowerCase().includes(k)||(us[n].lastIp||'').includes(k)||ups(us,n).some(p=>p.toLowerCase().includes(k)));}
 list.sort((a,b)=>{const pa=[...ups(us,a)].reverse().concat(a).join('/'),pb=[...ups(us,b)].reverse().concat(b).join('/');return pa<pb?-1:1;});
 const shares=S.get('shares')||{},logins=S.get('logins')||{};
 const rows=list.map(n=>{const u=norm(n,us[n]),e=eff(us,n),H=`<input type="hidden" name="username" value="${esc(n)}">`,up=ups(us,n),dn=downs(us,n),depth=up.length;
  const st=!u.enabled?'<span class="b off">停用</span>':(u.expires&&u.expires<today()?'<span class="b off">已過期</span>':!e.ok?'<span class="b off">上線停用／過期</span>':'<span class="b on">正常</span>');
  const sets=(u.sets||[]).filter(x=>x.nums&&x.nums.length).map((x,i)=>{const L=latestOf(x.game);const h=L?L.nums.filter(v=>x.nums.includes(v)):[];return `${esc(x.name||'第'+(i+1)+'組')}（${GN[x.game]}）${x.nums.map(v=>String(v).padStart(2,'0')).join(' ')}${L?` → 第 ${L.period} 期中 <b>${h.length}</b> 顆`:''}`;}).join('<br>')||'—';
  const sh=Object.entries(shares).flatMap(([g,o])=>Object.entries(o).filter(([,m])=>m[n]).map(([k,m])=>`${GN[g]} 第 ${esc(k)} 期：${m[n].join(' ')}`)).join('<br>')||'—';
  const lh=(logins[n]||[]).slice(0,10).map(x=>`${tpe(x.t)} ${esc(x.ip||'')} ${x.ok?'✓':'✗失敗'}`).join('<br>')||'—';
  const permBox=FEATS.filter(([k])=>capPerms.includes(k)).map(([k,l])=>`<label class="ck"><input type="checkbox" name="perms" value="${k}" ${u.perms.includes(k)?'checked':''}>${l}</label>`).join('');
  return `<div class="u" style="margin-left:${Math.min(depth,6)*14}px;border-left:5px solid ${u.role==='admin'?'#dc2626':u.role==='agent'?'#2563eb':'#475569'}"><div class="h"><b>${esc(n)}</b> <span class="b">${ROLES[u.role]}</span> ${st}
  <span class="note">上線：${up.length?up.slice().reverse().map(esc).join(' › '):'（無）'}｜直屬下線 ${direct(us,n).length}／全部下線 ${dn.length}</span></div>
  <div class="note">到期：${esc(u.expires||'無')}${e.effExpires&&e.effExpires!==u.expires?`（受上線限制：${esc(e.effExpires)}）`:''}｜建立：${tpe(u.created)} 由 ${esc(u.createdBy||'—')}｜最後登入：${tpe(us[n].lastLogin)} ${esc(us[n].lastIp||'')}</div>
  <div class="note">有效權限：${e.perms.map(k=>(FEATS.find(x=>x[0]===k)||[,k])[1]).join('、')||'無'}</div>
  <details><summary>詳細：我的號碼／分享／登入紀錄</summary><div class="note"><b>我的號碼：</b><br>${sets}<br><b>熱門分享：</b><br>${sh}<br><b>最近登入：</b><br>${lh}</div></details>
  ${n===me?'':`<details><summary>編輯</summary>${F('perms',H+permBox+`<label class="ck">角色<select name="role">${(isA?['user','agent','admin']:['user','agent']).map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${ROLES[r]}</option>`).join('')}</select></label><label class="ck">到期<input type="date" name="expires" value="${esc(u.expires)}"${!isA&&myEff.effExpires?` max="${myEff.effExpires}"`:''}></label><button>儲存設定</button>`)}
  <div class="row">${F('reset',H+`<input type="password" name="password" placeholder="新密碼（至少8字）" minlength="8" required autocomplete="new-password"><button>重設密碼</button>`)}
  ${F('toggle',H+`<button>${u.enabled?'停用':'啟用'}</button>`)}${F('delete',H+`<button class="del" onclick="return confirm('確定刪除 ${esc(n)}？')">刪除</button>`)}</div></details>`}</div>`;}).join('');
 const ops=(S.get('oplog')||[]).filter(o=>isA||o.by===me||vis.has(o.target)||vis.has(o.by)).slice(0,OPN);
 const sel=(nm,opts,v)=>`<select name="${nm}">${opts.map(([k,l])=>`<option value="${esc(k)}" ${v===k?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
 return `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>管理後台</title><link rel="stylesheet" href="/style.css"><script src="/layout.js"></script><style>
body{display:block}.wrap{display:block;max-width:980px;margin:0 auto;padding:12px}.u{border:1px solid #334155;border-radius:10px;padding:8px 10px;margin:8px 0;background:#0f172a99}.h{margin-bottom:4px}.b{font-size:12px;padding:2px 8px;border-radius:9px;background:#334155}.on{background:#166534}.off{background:#991b1b}
form{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}.row{display:flex;flex-wrap:wrap;gap:6px}.ck{display:flex;gap:4px;align-items:center;margin:0;white-space:nowrap}.ck input[type=checkbox]{width:auto;margin:0}input,select{margin:0;padding:7px;width:auto}button{padding:7px 12px;border-radius:7px;border:0;background:#2563eb;color:#fff;cursor:pointer}.del{background:#b91c1c}.msg{background:#1e3a8a;padding:8px;border-radius:8px}.note{color:#94a3b8;font-size:12px}a{color:#60a5fa}summary{cursor:pointer;color:#93c5fd;font-size:13px;margin:4px 0}
.box{border:1px solid #334155;border-radius:10px;padding:10px;margin:10px 0}table{width:100%;border-collapse:collapse}td,th{border:1px solid #334155;padding:4px;font-size:12px}</style></head><body><div class="wrap">
<p><a href="/">← 回計算器</a></p><h1>${isA?'管理後台':'代理後台'}</h1><p class="note">登入身分：${esc(me)}（${ROLES[q.u.role]}）${isA?'':'｜只能管理自己的下線；權限與到期日不可超過自己'}</p>${msg?`<p class="msg">${esc(msg)}</p>`:''}
<div class="box"><h2>新增帳號</h2>${F('create',`<input name="username" placeholder="帳號" required pattern="[A-Za-z0-9_.\\-]{3,32}" autocomplete="off"><input type="password" name="password" placeholder="密碼（至少8字）" minlength="8" required autocomplete="new-password">
 ${sel('role',(isA?[['user','會員'],['agent','代理'],['admin','管理員']]:[['user','會員'],['agent','代理']]),'user')}<label class="ck">上線${sel('parent',[...(isA?[['','（無，直屬管理員）']]:[]),...agents.map(a=>[a,a===me?a+'（自己）':a])],isA?'':me)}</label>
 <label class="ck">到期<input type="date" name="expires"${!isA&&myEff.effExpires?` max="${myEff.effExpires}" value="${myEff.effExpires}"`:''}></label>`+FEATS.filter(([k])=>capPerms.includes(k)).map(([k,l])=>`<label class="ck"><input type="checkbox" name="perms" value="${k}" checked>${l}</label>`).join('')+'<button>新增</button>')}</div>
<div class="box"><form method="get" action="/admin"><input name="q" placeholder="搜尋帳號／IP／上線" value="${esc(f.q||'')}">${sel('agent',[['','全部代理線'],...agents.map(a=>[a,'代理：'+a])],f.agent||'')}${sel('role',[['','全部角色'],['admin','管理員'],['agent','代理'],['user','會員']],f.role||'')}${sel('st',[['','全部狀態'],['ok','正常'],['bad','停用／過期']],f.st||'')}<button>篩選</button> <a href="/admin">清除</a></form>
<h2>帳號樹（${list.length} / ${vis.size}）</h2>${rows||'<p class="note">沒有符合的帳號</p>'}</div>
<div class="box"><details ${ops.length?'':'open'}><summary><b>操作紀錄（最近 ${ops.length} 筆）</b></summary><div style="overflow:auto"><table><tr><th>時間</th><th>操作者</th><th>動作</th><th>對象</th><th>內容</th><th>IP</th></tr>${ops.map(o=>`<tr><td>${tpe(o.t)}</td><td>${esc(o.by)}</td><td>${esc(o.act)}</td><td>${esc(o.target)}</td><td>${esc(o.detail)}</td><td>${esc(o.ip||'')}</td></tr>`).join('')}</table></div></details></div>
</div></body></html>`;};
const go=(q,s,m)=>{q.session.flash=m;s.redirect('/admin'+(q.get('Referer')||'').replace(/^.*\/admin/,'').replace(/[^?=&\w%.\-]/g,'').slice(0,200));};
app.get('/admin',auth,mgr,(q,s)=>{const m=q.session.flash;delete q.session.flash;s.set('Cache-Control','no-store').type('html').send(page(q,m));});
const arr=x=>(Array.isArray(x)?x:x?[x]:[]).filter(k=>ALL.includes(k));
const date=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')?x:'';
// 每個操作：伺服器端檢查對象是否在自己的下線內
const A=(name,fn)=>app.post('/admin/'+name,auth,mgr,chk,(q,s)=>{const us=U.load(),n=String(q.body.username||'');
 if(name!=='create'){if(!us[n])return go(q,s,'找不到帳號');if(n===q.session.user)return go(q,s,'不能對自己操作');if(!new Set(visible(q)).has(n))return go(q,s,'無權管理此帳號');}
 const r=fn(q,us,n);if(typeof r==='string'&&!r.startsWith('✓'))return go(q,s,r);U.save(us);oplog(q,{create:'新增',reset:'重設密碼',toggle:'停用/啟用',delete:'刪除',perms:'修改設定'}[name],n,r.replace(/^✓\s*/,''));go(q,s,r);});
const lastAdmin=(us,n)=>norm(n,us[n]).role==='admin'&&Object.keys(us).filter(k=>{const u=norm(k,us[k]);return u.role==='admin'&&u.enabled;}).length<=1;
// 權限／到期上限＝上線（若為代理）與操作者的有效值
function limits(q,us,parent){const isA=q.u.role==='admin';let perms=isA?ALL.slice():eff(us,q.session.user).perms,exp=isA?'':eff(us,q.session.user).effExpires;
 if(parent&&us[parent]){const pe=eff(us,parent);if(norm(parent,us[parent]).role!=='admin'){perms=perms.filter(k=>pe.perms.includes(k));if(pe.effExpires&&(!exp||pe.effExpires<exp))exp=pe.effExpires;}}return {perms,exp};}
const clampExp=(e,cap)=>cap&&(!e||e>cap)?cap:e;
A('create',(q,us,n)=>{if(!/^[A-Za-z0-9_.\-]{3,32}$/.test(n))return '帳號格式錯誤（3–32 個英數字）';if(us[n])return '帳號已存在';if((q.body.password||'').length<8)return '密碼至少 8 字元';
 const isA=q.u.role==='admin';let role=['user','agent','admin'].includes(q.body.role)?q.body.role:'user';if(role==='admin'&&!isA)return '代理不能建立管理員';
 let parent=String(q.body.parent||'');if(!isA){if(parent!==q.session.user&&!(new Set(downs(us,q.session.user)).has(parent)&&norm(parent,us[parent]).role==='agent'))parent=q.session.user;}
 else if(parent&&!(us[parent]&&norm(parent,us[parent]).role==='agent'))parent='';if(role==='admin')parent='';
 const L=limits(q,us,parent);us[n]={hash:bcrypt.hashSync(q.body.password,12),role,parent,enabled:true,expires:clampExp(date(q.body.expires),L.exp),perms:arr(q.body.perms).filter(k=>L.perms.includes(k)),created:new Date().toISOString(),createdBy:q.session.user};
 return `✓ 已新增 ${ROLES[role]} ${n}${parent?'（上線 '+parent+'）':''}`;});
A('reset',(q,us,n)=>{if((q.body.password||'').length<8)return '密碼至少 8 字元';us[n]={...us[n],...norm(n,us[n]),hash:bcrypt.hashSync(q.body.password,12)};return '✓ 已重設 '+n+' 的密碼';});
A('toggle',(q,us,n)=>{if(norm(n,us[n]).enabled&&lastAdmin(us,n))return '至少要保留一位管理員';us[n]={...us[n],enabled:!norm(n,us[n]).enabled};const dn=downs(us,n).length;return '✓ 已'+(us[n].enabled?'啟用 ':'停用 ')+n+(dn&&!us[n].enabled?`（其 ${dn} 個下線同時無法登入）`:'');});
A('delete',(q,us,n)=>{const dn=downs(us,n).length;if(dn)return `${n} 還有 ${dn} 個下線，請先刪除或停用下線`;if(lastAdmin(us,n))return '至少要保留一位管理員';delete us[n];return '✓ 已刪除 '+n;});
A('perms',(q,us,n)=>{const isA=q.u.role==='admin';const u=norm(n,us[n]);let role=['user','agent','admin'].includes(q.body.role)?q.body.role:u.role;if(role==='admin'&&!isA)return '代理不能設定管理員';
 if(u.role==='agent'&&role==='user'&&direct(us,n).length)return '此代理還有下線，不能改成會員';if(u.role==='admin'&&role!=='admin'&&lastAdmin(us,n))return '至少要保留一位管理員';
 const L=limits(q,us,us[n].parent);const perms=arr(q.body.perms).filter(k=>L.perms.includes(k)||!isA&&false);const exp=clampExp(date(q.body.expires),L.exp);
 us[n]={...us[n],role,perms,expires:exp,...(role==='admin'?{parent:''}:{})};return `✓ 已更新 ${n}：${ROLES[role]}，到期 ${exp||'無'}，權限 ${perms.length} 項`;});
const port=process.env.PORT||3080;app.listen(port,()=>console.log('listening',port));
})().catch(e=>{console.error(e);process.exit(1);});
