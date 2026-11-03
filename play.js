// 娛樂虛擬點數＋小遊戲（老虎機風格）。點數無任何價值：不能買、不能兌現、不能轉讓，管理員也不能發點／改點。
// 結果一律伺服器端用 crypto.randomInt 決定；管理員只能調整每款遊戲的開關、賠率倍數和目標 RTP（有上下限、全部寫稽核紀錄）。
const crypto=require('crypto'),path=require('path');
const W=[1,2,3,4,5,6],WT=W.reduce((a,b)=>a+b,0);           // 6 種符號的固定出現權重（不開放調整）
const GAMES={
 moon:{name:'月砂神殿',theme:'egypt',syms:['月神寶石','金色聖眼','生命之符','金字塔','聖甲蟲','金幣'],
  def:{enabled:true,pays:[300,80,40,20,12,8],pair:2,rtp:92}},
 dodo:{name:'嘟嘟叢林探險',theme:'jungle',syms:['黃金寶箱','金鑰匙','獅子徽章','猴子徽章','香蕉','椰子'],
  def:{enabled:true,pays:[250,90,40,18,12,8],pair:2,rtp:92}}};
const SOON=[{id:'scarab',name:'聖甲蟲寶庫',img:'scarab'},{id:'sunking',name:'日鷹王座',img:'sunking.jpg'},{id:'river',name:'尼羅星河',img:'river'},{id:'parrot',name:'鸚鵡金島',img:'parrot'}];
const BETS=[10,50,100];const START_MIN=100,START_MAX=100000;
const LIM={payMax:1000,pairMax:10,rtpMin:50,rtpMax:99};
const LABEL='娛樂用虛擬點數，無任何價值';
const p=i=>W[i]/WT;
// 只看中間一條線：三個相同→pays[i]；前兩個相同→pair
const lineWin=(l,c)=>l[0]===l[1]&&l[1]===l[2]?c.pays[l[0]]:l[0]===l[1]?c.pair:0;
const baseRtp=c=>W.reduce((s,_,i)=>s+p(i)**3*c.pays[i]+p(i)**2*(1-p(i))*c.pair,0);
const pick=()=>{let r=crypto.randomInt(WT);for(let i=0;i<W.length;i++){if(r<W[i])return i;r-=W[i];}return W.length-1;};
const grid=()=>[0,1,2].map(()=>[pick(),pick(),pick()]);           // grid[reel][row]
const line=g=>g.map(c=>c[1]);
// 依目標 RTP 抽一次：先正常抽；中獎時以 rtp/base 的機率保留，否則重抽成不中獎的盤面 → 期望 RTP＝目標
function draw(c){const keep=Math.min(1,c.rtp/100/baseRtp(c));let g=grid(),m=lineWin(line(g),c);
 if(m>0&&crypto.randomInt(1e6)>=keep*1e6){for(let k=0;k<100;k++){g=grid();if(!lineWin(line(g),c))break;}if(lineWin(line(g),c)){g[1][1]=(g[0][1]+1)%6;}m=lineWin(line(g),c);}
 return {grid:g,mult:m};}
function validate(id,b,old){const e=[];const n=(v,lo,hi,lbl)=>{const x=Number(v);if(!Number.isInteger(x)||x<lo||x>hi){e.push(`${lbl} 要是 ${lo}–${hi} 的整數`);return null;}return x;};
 const pays=GAMES[id].syms.map((s,i)=>n(b['pay'+i],1,LIM.payMax,s+' 倍數'));const pair=n(b.pair,0,LIM.pairMax,'前兩格相同倍數');const rtp=n(b.rtp,LIM.rtpMin,LIM.rtpMax,'目標回饋率');
 const c={enabled:b.enabled==='1'||b.enabled===true,pays,pair,rtp};
 if(!e.length&&baseRtp(c)*100<rtp)e.push(`目前倍數最多只能做到 ${(baseRtp(c)*100).toFixed(1)}% 回饋，達不到 ${rtp}%，請調高倍數或調低目標`);
 return e.length?{err:e}:{c};}
const tpe=t=>new Date(t).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})+'（台北）';

module.exports=function mount(app,X){const {S,FT,auth,admin,chk,jchk,csrf,esc,oplog,rateLimit,express}=X;const pool=()=>S.pg();
 const MEM={}; // 沒有資料庫時的錢包（單執行緒、同步扣加＝不可分割）
 const cfg=id=>{const all=S.get('play_config')||{};return {...GAMES[id].def,...(all[id]||{})};};
 async function init(){if(pool()){await pool().query(`CREATE TABLE IF NOT EXISTS play_wallet(u text PRIMARY KEY, pts bigint NOT NULL CHECK(pts>=0), started timestamptz NOT NULL DEFAULT now(), spins int NOT NULL DEFAULT 0)`);
   await pool().query(`CREATE TABLE IF NOT EXISTS play_spin(id bigserial PRIMARY KEY, u text NOT NULL, game text NOT NULL, bet int NOT NULL, win bigint NOT NULL, grid jsonb NOT NULL, t timestamptz NOT NULL DEFAULT now())`);
   await pool().query(`CREATE TABLE IF NOT EXISTS play_audit(id bigserial PRIMARY KEY, t timestamptz NOT NULL DEFAULT now(), by_user text NOT NULL, game text NOT NULL, old jsonb, new jsonb)`);}
  else Object.assign(MEM,S.get('play_wallets')||{});}
 const persist=()=>{if(!pool())S.set('play_wallets',MEM).catch(()=>{});};
 const W_={async get(u){if(pool()){const r=await pool().query('SELECT pts,spins FROM play_wallet WHERE u=$1',[u]);return r.rows[0]?{pts:+r.rows[0].pts,spins:r.rows[0].spins}:null;}return MEM[u]?{...MEM[u]}:null;},
  // 自己輸入起始點數：沒有錢包或餘額不夠最低押注時才能（重新）開始
  async start(u,n){if(pool()){const r=await pool().query(`INSERT INTO play_wallet(u,pts) VALUES($1,$2) ON CONFLICT(u) DO UPDATE SET pts=EXCLUDED.pts,started=now() WHERE play_wallet.pts<$3 RETURNING pts`,[u,n,BETS[0]]);return r.rowCount?+r.rows[0].pts:null;}
   if(MEM[u]&&MEM[u].pts>=BETS[0])return null;MEM[u]={pts:n,spins:MEM[u]?MEM[u].spins:0};persist();return n;},
  // 扣押注＋加贏分一次完成；餘額不夠就整筆不做（不會變負、連按不會重複扣）
  async settle(u,bet,win,game,g){if(pool()){const c=await pool().connect();try{await c.query('BEGIN');const r=await c.query('UPDATE play_wallet SET pts=pts-$2+$3,spins=spins+1 WHERE u=$1 AND pts>=$2 RETURNING pts',[u,bet,win]);
     if(!r.rowCount){await c.query('ROLLBACK');return null;}await c.query('INSERT INTO play_spin(u,game,bet,win,grid) VALUES($1,$2,$3,$4,$5)',[u,game,bet,win,JSON.stringify(g)]);await c.query('COMMIT');return +r.rows[0].pts;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
   const w=MEM[u];if(!w||w.pts<bet)return null;w.pts=w.pts-bet+win;w.spins++;persist();return w.pts;}};
 const on=(q,s,n)=>FT.on('play')?n():s.status(404).type('text').send('404');
 const me=q=>q.session.user; // 一律只用自己的登入身分，body 裡的帳號欄位全部忽略
 const spinLimit=rateLimit({windowMs:60e3,limit:+process.env.SPIN_LIMIT||30,standardHeaders:true,legacyHeaders:false,keyGenerator:q=>'spin:'+me(q),validate:{keyGeneratorIpFallback:false},handler:(q,s)=>s.status(429).json({error:'轉太快了，每分鐘最多 '+(+process.env.SPIN_LIMIT||30)+' 次'})});
 const P=f=>path.join(__dirname,'public','play',f);
 app.get('/play',auth,on,(q,s)=>s.set('Cache-Control','no-store').sendFile(P('lobby.html')));
 app.get('/play/game/:id',auth,on,(q,s)=>Object.hasOwn(GAMES,q.params.id)&&cfg(q.params.id).enabled?s.set('Cache-Control','no-store').sendFile(P('game.html')):s.status(404).type('text').send('404'));
 app.get('/play/points',auth,on,(q,s)=>s.set('Cache-Control','no-store').sendFile(P('points.html')));
 app.get(/^\/play\/a\/([a-z0-9_-]+\.(css|js|jpg|svg))$/,auth,on,(q,s)=>s.sendFile(P(q.params[0]),{maxAge:'1h'}));
 // 會員只拿得到名稱和開關，不給賠率設定
 app.get('/api/play/lobby',auth,on,async(q,s)=>{const w=await W_.get(me(q));s.set('Cache-Control','no-store').json({user:me(q),label:LABEL,wallet:w,bets:BETS,startMin:START_MIN,startMax:START_MAX,
  games:Object.entries(GAMES).map(([id,g])=>({id,name:g.name,theme:g.theme,syms:g.syms,on:cfg(id).enabled})),soon:SOON});});
 app.post('/api/play/start',auth,on,jchk,async(q,s)=>{const n=q.body&&q.body.points;if(typeof n!=='number'||!Number.isInteger(n)||n<START_MIN||n>START_MAX)return s.status(400).json({error:`起始點數要是 ${START_MIN}–${START_MAX} 的整數`});
  const r=await W_.start(me(q),n);if(r==null)return s.status(409).json({error:'目前還有點數，用完才能重新輸入起始點數'});s.json({ok:true,pts:r});});
 app.post('/api/play/spin/:id',auth,on,spinLimit,jchk,async(q,s)=>{const id=q.params.id;if(!Object.hasOwn(GAMES,id))return s.status(404).json({error:'沒有這款遊戲'});const c=cfg(id);if(!c.enabled)return s.status(404).json({error:'這款遊戲已關閉'});
  const bet=q.body&&q.body.bet;if(typeof bet!=='number'||!BETS.includes(bet))return s.status(400).json({error:'押注只能是 '+BETS.join('/')});
  const d=draw(c),win=bet*d.mult;const pts=await W_.settle(me(q),bet,win,id,d.grid);if(pts==null)return s.status(409).json({error:'點數不足'});
  s.set('Cache-Control','no-store').json({grid:d.grid,line:line(d.grid),bet,win,mult:d.mult,pts});});
 // ---- 管理員：每款遊戲的開關／賠率／目標 RTP ----
 const auditList=async()=>pool()?(await pool().query('SELECT t,by_user,game,old,new FROM play_audit ORDER BY id DESC LIMIT 50')).rows:(S.get('play_audit')||[]);
 const page=async(q,msg)=>{const t=csrf(q),L=await auditList();const fmt=c=>c?`${c.enabled?'開':'關'}｜RTP ${c.rtp}%｜前兩格 ${c.pair}x｜${(c.pays||[]).join('/')}`:'—';
  return `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>小遊戲賠率設定</title><link rel="stylesheet" href="/play/a/admin.css"></head><body><div class="wrap">
<p><a href="/admin">← 回管理後台</a>｜<a href="/admin/features">功能開關</a></p><h1>小遊戲賠率設定</h1>
<p class="note">${LABEL}。這裡只能調整遊戲開關、賠率倍數和目標回饋率（RTP ${LIM.rtpMin}–${LIM.rtpMax}%）；不能發點、改點。每次儲存都會記錄管理員、修改前後和台北時間。大廳總開關在「功能開關 → 娛樂」${FT.on('play')?'（目前：開）':'（目前：關）'}。</p>${msg?`<p class="msg">${esc(msg)}</p>`:''}
${Object.entries(GAMES).map(([id,g])=>{const c=cfg(id);return `<form class="box" method="post" action="/admin/play-odds"><input type="hidden" name="_csrf" value="${t}"><input type="hidden" name="game" value="${id}"><h2>${esc(g.name)}</h2>
<label class="ck"><input type="checkbox" name="enabled" value="1" ${c.enabled?'checked':''}> 開放這款遊戲</label>
<div class="gr">${g.syms.map((sy,i)=>`<label>${esc(sy)} 三連（倍）<input type="number" name="pay${i}" min="1" max="${LIM.payMax}" value="${c.pays[i]}" required></label>`).join('')}
<label>前兩格相同（倍）<input type="number" name="pair" min="0" max="${LIM.pairMax}" value="${c.pair}" required></label><label>目標回饋率 RTP（%）<input type="number" name="rtp" min="${LIM.rtpMin}" max="${LIM.rtpMax}" value="${c.rtp}" required></label></div>
<p class="note">依目前倍數，最高可做到 ${(baseRtp(c)*100).toFixed(1)}%；實際中獎率約 ${(c.rtp/100/baseRtp(c)*W.reduce((a,_,i)=>a+p(i)**2,0)*100).toFixed(1)}%。</p><button>儲存 ${esc(g.name)}</button></form>`;}).join('')}
<div class="box"><h2>修改紀錄（最近 50 筆）</h2><table><tr><th>時間</th><th>管理員</th><th>遊戲</th><th>修改前</th><th>修改後</th></tr>${L.map(a=>`<tr><td>${tpe(a.t)}</td><td>${esc(a.by_user)}</td><td>${esc((GAMES[a.game]||{}).name||a.game)}</td><td>${esc(fmt(a.old))}</td><td>${esc(fmt(a.new))}</td></tr>`).join('')||'<tr><td colspan="5">尚無紀錄</td></tr>'}</table></div></div></body></html>`;};
 app.get('/admin/play-odds',auth,admin,async(q,s)=>{const m=q.session.flash;delete q.session.flash;s.set('Cache-Control','no-store').type('html').send(await page(q,m));});
 app.post('/admin/play-odds',auth,admin,chk,async(q,s)=>{const id=String(q.body.game||'');if(!Object.hasOwn(GAMES,id)){q.session.flash='沒有這款遊戲';return s.redirect('/admin/play-odds');}
  const v=validate(id,q.body);if(v.err){q.session.flash='未儲存：'+v.err.join('；');return s.redirect('/admin/play-odds');}
  const old=cfg(id),all={...(S.get('play_config')||{}),[id]:v.c};await S.set('play_config',all);
  const rec={t:new Date().toISOString(),by_user:me(q),game:id,old,new:v.c};
  if(pool())await pool().query('INSERT INTO play_audit(by_user,game,old,new) VALUES($1,$2,$3,$4)',[rec.by_user,id,JSON.stringify(old),JSON.stringify(v.c)]);else{const L=S.get('play_audit')||[];L.unshift(rec);await S.set('play_audit',L.slice(0,500));}
  oplog(q,'修改小遊戲賠率',GAMES[id].name,`RTP ${old.rtp}→${v.c.rtp}%｜${old.enabled?'開':'關'}→${v.c.enabled?'開':'關'}`);q.session.flash='✓ 已儲存 '+GAMES[id].name;s.redirect('/admin/play-odds');});
 return init();};
module.exports.GAMES=GAMES;module.exports.baseRtp=baseRtp;module.exports.draw=draw;module.exports.validate=validate;module.exports.lineWin=lineWin;module.exports.LIM=LIM;
