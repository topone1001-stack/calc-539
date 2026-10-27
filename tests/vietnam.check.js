// 越南 Vietlott：排程、解析、官方被擋→備援。全部用假資料／本機存檔，不連網。執行：node tests/vietnam.check.js
const assert=require('assert'),fs=require('fs'),path=require('path');const SC=require('../sched'),VN=require('../vn');let ok=0;const t=(n,f)=>{f();ok++;console.log('✓',n);};
const at=s=>new Date(s).getTime(),c=(a,b)=>({vn655:{latest:{period:'x',date:a}},vn645:{latest:{period:'y',date:b}}});
t('週二 18:50 台北還沒到時段',()=>assert.equal(SC.status('vn',at('2026-10-27T18:50:00+08:00'),c('2026-10-24','2026-10-25')).wait,false));
t('週二 19:05 等 Power 6/55',()=>assert.deepEqual(SC.status('vn',at('2026-10-27T19:05:00+08:00'),c('2026-10-24','2026-10-25')).games,['vn655']));
t('週三 19:05 等 Mega 6/45',()=>assert.deepEqual(SC.status('vn',at('2026-10-28T19:05:00+08:00'),c('2026-10-27','2026-10-25')).games,['vn645']));
t('拿到當天那期就停',()=>assert.equal(SC.status('vn',at('2026-10-27T19:20:00+08:00'),c('2026-10-27','2026-10-25')).wait,false));
t('週一不開',()=>assert.equal(SC.status('vn',at('2026-10-26T19:30:00+08:00'),c('x','x')).wait,false));
t('22:30 過時段不再快查',()=>assert.equal(SC.status('vn',at('2026-10-27T22:30:00+08:00'),{...c('2026-10-24','x'),vn535:{hist:[{period:'2026102721'}]}}).wait,false));
t('版本號含越南',()=>assert.notEqual(SC.verOf(c('a','b')),SC.verOf({...c('a','b'),vn655:{latest:{period:'20261027'}}})));
const h655=VN.parseMagayo(fs.readFileSync(path.join(__dirname,'fixtures-magayo-655.html'),'utf8'),'vn655');
t('magayo 6/55 解析：最新 10/24＋特別號 53、近期多期',()=>{assert.deepEqual(h655[0],{period:'20261024',date:'2026-10-24',nums:[6,7,18,41,44,50],special:53});assert.ok(h655.length>=10);assert.deepEqual(h655[1].nums,[14,19,24,31,34,42]);assert.equal(h655[1].special,37);});
const h645=VN.parseMagayo(fs.readFileSync(path.join(__dirname,'fixtures-magayo-645.html'),'utf8'),'vn645');
t('magayo 6/45 解析：無特別號、號碼 1–45',()=>{assert.ok(h645.length>=10);assert.equal(h645[0].special,null);h645.forEach(x=>{assert.equal(x.nums.length,6);x.nums.forEach(n=>assert.ok(n>=1&&n<=45));});});
t('官方頁解析',()=>{const html='<td>Thứ 3, 27/10/2026</td><td><a>#01250</a></td><td><span class="bong_tron">05</span><span class="bong_tron">11</span><span class="bong_tron">19</span><span class="bong_tron">27</span><span class="bong_tron">38</span><span class="bong_tron">50</span><span class="bong_tron">12</span></td>';
 assert.deepEqual(VN.parseOfficial(html,'vn655')[0],{period:'20261027',no:'01250',date:'2026-10-27',nums:[5,11,19,27,38,50],special:12});});
t('magayo 6/55 近期列表最多 30 期',()=>assert.ok(h655.length>=30&&h655.length<=30));
t('特別號缺漏 → null，不會 NaN',()=>{const html=fs.readFileSync(path.join(__dirname,'fixtures-magayo-655.html'),'utf8').replace(/p1=B&amp;p2=\d+/,'p1=B&amp;p2=xx').replace(/特別號碼&ensp;37/,'特別號碼&ensp;');const h=VN.parseMagayo(html,'vn655');h.forEach(x=>assert.ok(x.special===null||Number.isInteger(x.special)));assert.equal(h[1].special,null);});
t('換來源（官方→magayo）同一天不算新一期、期別格式一致',()=>{const off=[{period:'20261024',no:'01250',date:'2026-10-24',nums:[1,2,3,4,5,6],special:7}];const mg=[{period:'20261024',date:'2026-10-24',nums:[1,2,3,4,5,6],special:7}];
 const a={vn655:{latest:VN.merge(off,[])[0]}},b={vn655:{latest:VN.merge(mg,off)[0]}};assert.equal(SC.verOf(a),SC.verOf(b));assert.equal(VN.merge(mg,off).length,1);});
const h535=VN.parseMagayo(fs.readFileSync(path.join(__dirname,'fixtures-magayo-535-2100.html'),'utf8'),'vn535','21');
t('magayo 5/35 21:00 解析：5 碼＋特別號、期別加時段',()=>{assert.deepEqual(h535[0],{period:'2026102621',date:'2026-10-26',nums:[3,9,16,26,29],special:9});});
t('5/35 台北 14:05 等 13 時段，拿到就停',()=>{assert.deepEqual(SC.status('vn',at('2026-10-26T14:05:00+08:00'),{}).games,['vn535']);assert.equal(SC.status('vn',at('2026-10-26T14:05:00+08:00'),{vn535:{hist:[{period:'2026102613'}]}}).wait,false);});
t('5/35 台北 22:10 等 21 時段',()=>assert.ok(SC.status('vn',at('2026-10-26T22:10:00+08:00'),{vn535:{hist:[{period:'2026102613'}]}}).games.includes('vn535')));
t('越南期別只用日期鍵，不混官方期號',()=>VN.merge(h655,[]).forEach(x=>assert.ok(/^\d{8}$/.test(x.period))));
(async()=>{const real=global.fetch;let seen=[];
 // 1) 官方回 Cloudflare 驗證頁 → 用 magayo，src 標 magayo
 global.fetch=async u=>{u=String(u);seen.push(u);if(u.includes('vietlott.vn'))return new Response('<title>Just a moment...</title>',{status:403});
  return new Response(fs.readFileSync(path.join(__dirname,u.includes('power')?'fixtures-magayo-655.html':u.includes('535')?'fixtures-magayo-535-2100.html':'fixtures-magayo-645.html'),'utf8'),{status:200});};
 let cache={},saved=0;await VN.refreshVN(cache,()=>saved++);assert.equal(cache.vn655.src,'magayo');assert.equal(cache.vn645.src,'magayo');assert.equal(cache.vn655.latest.date,'2026-10-24');assert.ok(seen[0].includes('vietlott.vn'),'先試官方');ok++;console.log('✓ 官方被擋 → 備援 magayo，並標示來源');
 // 2) 官方可用 → 用官方，不碰 magayo
 seen=[];global.fetch=async u=>{u=String(u);seen.push(u);return new Response('<td>27/10/2026</td><td>#01250</td>'+[5,11,19,27,38,44,12].map(n=>`<span class="bong_tron">${String(n).padStart(2,'0')}</span>`).join(''),{status:200});};
 cache={};await VN.refreshVN(cache,()=>{});assert.equal(cache.vn655.src,'official');assert.equal(cache.vn645.src,'official');assert.ok(seen.filter(u=>!u.includes('vietlott.vn')).every(u=>u.includes('lotto-535')),'6/55、6/45 不碰 magayo');ok++;console.log('✓ 官方可連 → 用官方');
 // 3) 都失敗 → 不覆蓋舊資料
 global.fetch=async()=>new Response('x',{status:500});cache={vn655:{latest:{date:'old'}}};await VN.refreshVN(cache,()=>{});assert.equal(cache.vn655.latest.date,'old');ok++;console.log('✓ 全部失敗 → 保留舊資料');
 global.fetch=real;console.log(`\n${ok} 項全部通過`);})().catch(e=>{console.error('✗',e.message);process.exit(1);});
