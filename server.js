const express=require('express'),session=require('express-session'),bcrypt=require('bcryptjs'),rateLimit=require('express-rate-limit'),crypto=require('crypto'),fs=require('fs'),path=require('path'),U=require('./users');
const DR=require('./draws'),S=require('./store');
(async()=>{await S.init();DR.start();
const app=express();app.set('trust proxy',1);
if(process.env.SEED_ADMIN_HASH){const us=U.load();if(!Object.values(us).some(u=>u.role==='admin'||!u.role)){us.admin={hash:process.env.SEED_ADMIN_HASH,role:'admin',enabled:true,expires:'',perms:['bao','col','car','prize','draw']};await S.set('users',us);console.log('seeded admin');}}
let store;if(S.pg()){const PS=require('connect-pg-simple')(session);store=new PS({pool:S.pg(),createTableIfMissing:true});}
app.use(express.urlencoded({extended:false}));
app.use(session({store,secret:S.get('secret'),resave:false,saveUninitialized:false,name:'calc.sid',cookie:{httpOnly:true,sameSite:'lax',secure:'auto',maxAge:7*864e5}}));
const FEATS=[['bao','包牌'],['col','立柱'],['car','車'],['prize','獎金'],['draw','開獎試算']];
const ALL=FEATS.map(f=>f[0]);
const norm=(name,u)=>({hash:u.hash,role:u.role||(name==='admin'?'admin':'user'),enabled:u.enabled!==false,expires:u.expires||'',perms:Array.isArray(u.perms)?u.perms:ALL.slice()});
const today=()=>new Date(Date.now()+8*3600e3).toISOString().slice(0,10); // Asia/Taipei
const usable=u=>u&&u.enabled&&(!u.expires||u.expires>=today());
const getU=n=>{const r=U.load()[n];return r?norm(n,r):null;};
const auth=(q,s,n)=>{const u=q.session.user&&getU(q.session.user);if(!usable(u)){return q.session.destroy(()=>s.redirect('/login'));}q.u=u;n();};
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
 if(ok&&u&&!usable(u))return s.redirect('/login?e=off');
 if(ok&&u)return q.session.regenerate(()=>{q.session.user=name;s.redirect('/');});
 s.redirect('/login?e=1');});
app.post('/logout',(q,s)=>q.session.destroy(()=>{s.clearCookie('calc.sid');s.redirect('/login');}));
app.get('/layout.js',(q,s)=>s.sendFile(P('layout.js')));
app.get('/style.css',(q,s)=>s.sendFile(P('style.css')));
// server-side feature gating: strip sections the user lacks
const DRAWBOX='<details id="live" class="drawbox" open><summary><b>📺 開獎直播（全民i彩券）</b> <span class="note">週一至週六 20:30</span></summary><div id="livebox"></div></details><div id="draws" class="drawbox"><p class="note">載入開獎資料中…</p></div>';
const CALC=fs.readFileSync(P('calc.html'),'utf8');
app.get('/',auth,(q,s)=>{const i=CALC.indexOf('<h2>'),e=CALC.lastIndexOf('</div></div><script');const parts=CALC.slice(i,e).split(/(?=<h2>)/);
 let body=parts.map((p,k)=>q.u.perms.includes(ALL[k])?'<section>'+p+'</section>':'').join('');body=body&&'<div class="secs">'+body+'</div>';if(!body)body='<p>此帳號尚未開通任何功能，請聯絡管理員。</p>';
 s.type('html').send(CALC.slice(0,i)+'<div class="tops">'+DRAWBOX+'</div>'+body+CALC.slice(e));});
app.get('/calc.js',auth,(q,s)=>s.sendFile(P('calc.js')));
app.get('/draws',auth,(q,s)=>s.set('Cache-Control','no-store').json(DR.get()));
app.get('/me',auth,(q,s)=>s.json({user:q.session.user,role:q.u.role,perms:q.u.perms}));
// ---- admin ----
const page=(q,msg)=>{const t=csrf(q),us=U.load(),td=today();const F=(a,inner,cls='')=>`<form method="post" action="/admin/${a}" class="${cls}"><input type="hidden" name="_csrf" value="${t}">${inner}</form>`;
 const rows=Object.keys(us).sort().map(n=>{const u=norm(n,us[n]),H=`<input type="hidden" name="username" value="${esc(n)}">`;
  const st=!u.enabled?'<span class="b off">停用</span>':(u.expires&&u.expires<td?'<span class="b off">已過期</span>':'<span class="b on">啟用</span>');
  return `<div class="u"><div class="h"><b>${esc(n)}</b> <span class="b">${u.role==='admin'?'管理員':'使用者'}</span> ${st} <span class="note">到期：${esc(u.expires||'無')}</span></div>
  ${F('perms',H+FEATS.map(([k,l])=>`<label class="ck"><input type="checkbox" name="perms" value="${k}" ${u.perms.includes(k)?'checked':''}>${l}</label>`).join('')+`<label class="ck">角色<select name="role"><option value="user">使用者</option><option value="admin" ${u.role==='admin'?'selected':''}>管理員</option></select></label><label class="ck">到期<input type="date" name="expires" value="${esc(u.expires)}"></label><button>儲存設定</button>`)}
  <div class="row">${F('reset',H+`<input type="password" name="password" placeholder="新密碼（至少8字）" minlength="8" required autocomplete="new-password"><button>重設密碼</button>`)}
  ${F('toggle',H+`<button>${u.enabled?'停用':'啟用'}</button>`)}
  ${F('delete',H+`<button class="del" onclick="return confirm('確定刪除 ${esc(n)}？')">刪除</button>`)}</div></div>`;}).join('');
 return `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>管理後台</title><link rel="stylesheet" href="/style.css"><script src="/layout.js"></script><style>
body{display:block}.wrap{display:block;max-width:860px;margin:0 auto;padding:12px}.u{border:1px solid #334155;border-radius:10px;padding:10px;margin:10px 0}.h{margin-bottom:6px}.b{font-size:12px;padding:2px 8px;border-radius:9px;background:#334155}.on{background:#166534}.off{background:#991b1b}
form{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}.row{display:flex;flex-wrap:wrap;gap:6px}.ck{display:flex;gap:4px;align-items:center;margin:0;white-space:nowrap}.ck input[type=checkbox]{width:auto;margin:0}input,select{margin:0;padding:7px;width:auto}button{padding:7px 12px;border-radius:7px;border:0;background:#2563eb;color:#fff;cursor:pointer}.del{background:#b91c1c}.msg{background:#1e3a8a;padding:8px;border-radius:8px}.note{color:#94a3b8;font-size:12px}a{color:#60a5fa}</style></head><body><div class="wrap">
<p><a href="/">← 回計算器</a></p><h1>管理後台</h1>${msg?`<p class="msg">${esc(msg)}</p>`:''}
<h2>新增帳號</h2>${F('create',`<input name="username" placeholder="帳號" required pattern="[A-Za-z0-9_.\\-]{3,32}" autocomplete="off"><input type="password" name="password" placeholder="密碼（至少8字）" minlength="8" required autocomplete="new-password"><select name="role"><option value="user">使用者</option><option value="admin">管理員</option></select><label class="ck">到期<input type="date" name="expires"></label>`+FEATS.map(([k,l])=>`<label class="ck"><input type="checkbox" name="perms" value="${k}" checked>${l}</label>`).join('')+'<button>新增</button>')}
<h2>使用者列表（${Object.keys(us).length}）</h2>${rows}</div></body></html>`;};
const go=(q,s,m)=>{q.session.flash=m;s.redirect('/admin');};
app.get('/admin',auth,admin,(q,s)=>{const m=q.session.flash;delete q.session.flash;s.set('Cache-Control','no-store').type('html').send(page(q,m));});
const arr=x=>(Array.isArray(x)?x:x?[x]:[]).filter(k=>ALL.includes(k));
const date=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')?x:'';
const A=(name,fn)=>app.post('/admin/'+name,auth,admin,chk,(q,s)=>{const us=U.load(),n=q.body.username||'';const r=fn(q,us,n);if(typeof r==='string'&&!r.startsWith('✓'))return go(q,s,r);U.save(us);go(q,s,r);});
const lastAdmin=(us,n)=>norm(n,us[n]).role==='admin'&&Object.keys(us).filter(k=>{const u=norm(k,us[k]);return u.role==='admin'&&u.enabled;}).length<=1;
A('create',(q,us,n)=>{if(!/^[A-Za-z0-9_.\-]{3,32}$/.test(n))return '帳號格式錯誤（3–32 個英數字）';if(us[n])return '帳號已存在';if((q.body.password||'').length<8)return '密碼至少 8 字元';
 us[n]={hash:bcrypt.hashSync(q.body.password,12),role:q.body.role==='admin'?'admin':'user',enabled:true,expires:date(q.body.expires),perms:arr(q.body.perms)};return '✓ 已新增 '+n;});
A('reset',(q,us,n)=>{if(!us[n])return '找不到帳號';if((q.body.password||'').length<8)return '密碼至少 8 字元';us[n]=norm(n,us[n]);us[n].hash=bcrypt.hashSync(q.body.password,12);return '✓ 已重設 '+n+' 的密碼';});
A('toggle',(q,us,n)=>{if(!us[n])return '找不到帳號';if(n===q.session.user)return '不能停用自己';us[n]=norm(n,us[n]);us[n].enabled=!us[n].enabled;return '✓ 已'+(us[n].enabled?'啟用 ':'停用 ')+n;});
A('delete',(q,us,n)=>{if(!us[n])return '找不到帳號';if(n===q.session.user)return '不能刪除自己';delete us[n];return '✓ 已刪除 '+n;});
A('perms',(q,us,n)=>{if(!us[n])return '找不到帳號';const u=norm(n,us[n]);const role=q.body.role==='admin'?'admin':'user';if(n===q.session.user&&role!=='admin')return '不能移除自己的管理員身分';if(role!=='admin'&&lastAdmin(us,n))return '至少要保留一位管理員';
 Object.assign(u,{perms:arr(q.body.perms),role,expires:date(q.body.expires)});if(n===q.session.user)u.expires='';us[n]=u;return '✓ 已更新 '+n;});
const port=process.env.PORT||3080;app.listen(port,()=>console.log('listening',port));
})().catch(e=>{console.error(e);process.exit(1);});
