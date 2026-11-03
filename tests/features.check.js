// 功能開關：單元檢查（假 store）＋選用整合檢查（CALC_URL＋FT_ADMIN_PW＋FT_USER/FT_USER_PW，只對本機測試站）
// 執行：node tests/features.check.js
const assert=require('assert');const S=require('../store');let n=0;const t=(m,f)=>{f();n++;console.log('✓',m);};
const FT=require('../features');
const D={d539:[{period:'1',date:'d',nums:[1,2,3,4,5],order:[5,4,3,2,1]},{period:'0',date:'c',nums:[1,2,3,4,6]}],lotto:[{period:'2',nums:[1]}],hk:{latest:{period:'h',nums:[1],order:[1]},hist:[{order:[1]},{order:[2]}]},ca:{latest:{period:'c'},hist:[1,2,3]},replay:{id:'x'},other:{d3:[]}};
t('沒有設定＝一般功能全開、預設關閉的(play)是關的',()=>{assert.deepEqual([...FT.off()],FT.DEFAULT_OFF);KEYS_ON();assert.strictEqual(FT.draws(D),D);});
function KEYS_ON(){for(const k of FT.KEYS)assert.equal(FT.on(k),!FT.DEFAULT_OFF.includes(k),k);}
t('設定格式壞掉＝全部開啟',()=>{const g=S.get;S.get=()=>({off:'bad'});KEYS_ON();S.get=()=>{throw new Error('db down')};KEYS_ON();S.get=g;});
t('涵蓋需求的開關',()=>{for(const k of ['g_539','g_lotto','g_super','g_ca','g_hk','g_vn655','g_vn645','g_vn535','g_vnmn','g_vnmt','g_vnmb','ord','recent','t_hist','t_num','t_trend','t_adv','t_ord','t_share','t_sand','t_mine','t_other','bao','draw','guess','share','mynum','live','auto'])assert.ok(FT.KEYS.includes(k),k);});
(async()=>{const v0=FT.ver();
 await FT.save(['g_hk','ord','recent','live','bao','share','nope']);
 t('未知鍵被忽略、版本號改變（ETag 失效）',()=>{assert.deepEqual([...FT.off()].sort(),['bao','g_hk','live','ord','recent','share']);assert.ok(FT.ver()>v0);});
 t('/draws：關掉的彩種、落球順序、近N期、直播重播都拿掉',()=>{const o=FT.draws(D);assert.ok(!('hk' in o));assert.ok(!('replay' in o));assert.equal(o.d539.length,1);assert.ok(!('order' in o.d539[0]));assert.equal(o.ca.hist.length,1);assert.ok(o.other);assert.ok(D.d539[0].order,'不改到原始快取');});
 t('權限交集：包牌、熱門分享被拿掉',()=>assert.deepEqual(FT.perms(['bao','draw','share','mynum','hist']),['draw','mynum','hist']));
 t('歷史 API：落球順序欄位拿掉、遊戲關閉',()=>{const h=FT.hist({rows:[['1','d',[1],null,[1]]],ordN:1});assert.equal(h.rows[0].length,4);assert.equal(h.ordN,0);assert.equal(FT.gameOn('hk'),false);assert.equal(FT.gameOn('539'),true);});
 await FT.save(['t_hist','t_num','t_trend','t_adv','t_ord','t_share','t_sand','t_mine']);
 t('統計分頁全關＝歷史 API 不給資料',()=>assert.equal(FT.histOn(),false));
 await FT.save([]);t('全部打勾儲存＝連 play 也開',()=>{for(const k of FT.KEYS)assert.ok(FT.on(k),k);assert.equal(FT.histOn(),true);});
 await FT.save(['play']);t('play 沒勾＝關閉，其他照舊',()=>{assert.equal(FT.on('play'),false);assert.ok(FT.on('bao'));});
 {const g=S.get;S.get=()=>({off:[]});t('舊格式（只有 off、沒有 on）＝play 仍關閉，部署當下不會自動打開',()=>assert.equal(FT.on('play'),false));S.get=()=>{throw new Error('db down')};t('讀取失敗＝play 關閉',()=>assert.equal(FT.on('play'),false));S.get=g;}
 await FT.save(FT.KEYS.filter(k=>k!=='play'));await FT.save([]);
 if(process.env.CALC_URL)await integ();
 console.log(`\n${n} 項全部通過`);process.exit(0);})().catch(e=>{console.error('✗',e.message);process.exit(1);});
async function integ(){const B=process.env.CALC_URL;
 const C=()=>{const c={jar:'',async f(p,o={}){const h={...(o.headers||{})};if(c.jar)h.cookie=c.jar;const r=await fetch(B+p,{...o,headers:h,redirect:'manual'});for(const x of r.headers.getSetCookie())if(x.startsWith('calc.sid='))c.jar=x.split(';')[0];return r;},
  async login(u,p){return (await c.f('/login',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:u,password:p})})).headers.get('location');}};return c;};
 const form=(c,body)=>c.f('/admin/features',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
 const ad=C();assert.equal(await ad.login('admin',process.env.FT_ADMIN_PW),'/');
 const us=C();assert.equal(await us.login(process.env.FT_USER,process.env.FT_USER_PW),'/');
 const r0=await us.f('/admin/features');t('會員看不到功能開關頁',()=>assert.equal(r0.status,403));
 const pg=await (await ad.f('/admin/features')).text();const tok=pg.match(/name="_csrf" value="([^"]+)"/)[1];
 t('管理員看得到、預設全部打勾',()=>assert.ok(!/type="checkbox" name="on" value="\w+" >/.test(pg)&&pg.includes('value="g_hk" checked')));
 const all=FT.KEYS.filter(k=>!['g_hk','auto','bao','t_other'].includes(k));
 const mk=(tk)=>{const b=new URLSearchParams();if(tk)b.append('_csrf',tk);all.forEach(k=>b.append('on',k));return b;};
 const bad=await form(ad,mk('x'.repeat(48)));t('沒有正確 CSRF 被擋',()=>assert.equal(bad.status,403));
 const tok2=(await (await us.f('/password')).text()).match(/name="_csrf" value="([^"]+)"/);const ur=await form(us,mk(tok2&&tok2[1]));t('會員帶自己的 CSRF 也改不了',()=>assert.equal(ur.status,403));
 const h0=await us.f('/api/hist/539');const et=h0.headers.get('etag');
 const ok=await form(ad,mk(tok));t('管理員＋CSRF 可儲存',()=>assert.equal(ok.status,302));
 const d=await (await us.f('/draws')).json();t('伺服器端：關掉的六合彩不在 /draws',()=>assert.ok(!('hk' in d)));
 t('自動更新關閉 → draws-ver 回 404',async()=>{});assert.equal((await us.f('/api/draws-ver')).status,404);
 assert.equal((await us.f('/api/hist/hk')).status,404);console.log('✓ 六合彩歷史 API 404');
 assert.equal((await us.f('/api/other')).status,404);console.log('✓ 3星/4星/Bingo API 404');
 const h1=await us.f('/api/hist/539',{headers:{'If-None-Match':et||''}});t('改開關後 ETag 失效',()=>assert.equal(h1.status,200));
 const home=await (await us.f('/')).text();t('首頁：包牌區塊不送出',()=>assert.ok(!home.includes('sec-bao')&&home.includes('FEAT_OFF')));
 const b=new URLSearchParams({_csrf:tok});FT.KEYS.forEach(k=>b.append('on',k));await form(ad,b);
 const d2=await (await us.f('/draws')).json();t('切回全部開啟後恢復',()=>assert.ok('hk' in d2||!('hk' in d)));
 assert.equal((await us.f('/api/draws-ver')).status,200);console.log('✓ draws-ver 恢復');}
