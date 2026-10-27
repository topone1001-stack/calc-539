// 熱修：越南資料不可因 cache 物件被換掉而遺失。執行：node tests/vn-cache.check.js
const assert=require('assert'),fs=require('fs'),path=require('path');const VN=require('../vn'),DR=require('../draws');
(async()=>{const real=global.fetch;
 global.fetch=async u=>{u=String(u);if(u.includes('vietlott.vn'))return new Response('Just a moment',{status:403});
  if(u.includes('magayo'))return new Response(fs.readFileSync(path.join(__dirname,u.includes('power')?'fixtures-magayo-655.html':'fixtures-magayo-645.html'),'utf8'));
  const tw={rtCode:0,content:{daily539Res:[{period:1,lotteryDate:'2026-10-26T00:00',drawNumberSize:[1,2,3,4,5]}],lotto649Res:[{period:1,lotteryDate:'2026-10-24T00:00',drawNumberSize:[1,2,3,4,5,6,7]}],superLotto638Res:[{period:1,lotteryDate:'2026-10-26T00:00',drawNumberSize:[1,2,3,4,5,6,7]}]}};return new Response(JSON.stringify(tw));};
 // 1) 抓取途中 cache 被換成新物件 → 寫進新物件
 let a={},b={};let cur=a;const p=VN.refreshVN(()=>cur,()=>{});cur=b;await p;assert.ok(b.vn655&&b.vn645,'寫入目前的 cache');console.log('✓ cache 換物件後越南資料仍在');
 // 2) 台彩 refresh 不會清掉越南資料
 DR._setCache({vn655:{latest:{date:'2026-10-24'}},vn645:{latest:{date:'2026-10-25'}}});await DR._run.tw();const c=DR.get();assert.ok(c.vn655&&c.vn645&&c.d539.length,'台彩更新保留越南');console.log('✓ 台彩更新保留越南資料');
 // 3) 透過 draws 的 refreshVN 寫入目前 cache
 DR._setCache({});await DR._run.vn();assert.ok(DR.get().vn655.hist.length>=10);console.log('✓ draws.refreshVN 寫入目前 cache');
 global.fetch=real;console.log('\n3 項全部通過');process.exit(0);})().catch(e=>{console.error('✗',e.message);process.exit(1);});
