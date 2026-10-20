// 儲存層：有 DATABASE_URL 用 Postgres（kv 表），否則用本機檔案
const fs=require('fs'),path=require('path');const URL_=process.env.DATABASE_URL;let pool=null;const mem={};
const FILES={users:'users.json',draws:'draws.json'};
exports.pg=()=>pool;
exports.init=async()=>{if(URL_){const {Pool}=require('pg');pool=new Pool({connectionString:URL_,ssl:/localhost|127\.0\.0\.1/.test(URL_)?false:{rejectUnauthorized:false}});
  await pool.query('CREATE TABLE IF NOT EXISTS kv(k text PRIMARY KEY, v jsonb NOT NULL)');
  for(const r of (await pool.query('SELECT k,v FROM kv')).rows)mem[r.k]=r.v;}
 else for(const [k,f] of Object.entries(FILES)){const p=path.join(__dirname,f);if(fs.existsSync(p))mem[k]=JSON.parse(fs.readFileSync(p,'utf8'));}
 const sk=path.join(__dirname,'.session_secret');
 if(!mem.secret){mem.secret=!URL_&&fs.existsSync(sk)?fs.readFileSync(sk,'utf8').trim():require('crypto').randomBytes(32).toString('hex');await exports.set('secret',mem.secret);}};
exports.get=k=>mem[k];
exports.set=async(k,v)=>{mem[k]=v;if(pool)await pool.query('INSERT INTO kv(k,v) VALUES($1,$2) ON CONFLICT(k) DO UPDATE SET v=EXCLUDED.v',[k,JSON.stringify(v)]);
 else if(FILES[k]){const p=path.join(__dirname,FILES[k]);fs.writeFileSync(p,JSON.stringify(v,null,2));if(k==='users')fs.chmodSync(p,0o600);}
 else if(k==='secret')fs.writeFileSync(path.join(__dirname,'.session_secret'),v,{mode:0o600});};
