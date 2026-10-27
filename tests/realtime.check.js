// 即時開獎更新：排程判斷＋「新一期出現→版本改變→通知」流程。全部用假資料，不連網。
// 執行：node tests/realtime.check.js
const assert=require('assert');const SC=require('../sched');let ok=0;const t=(n,f)=>{f();ok++;console.log('✓',n);};
const at=s=>new Date(s).getTime();// 用含時區的字串
const tw=(d539,lotto,sup)=>({d539:[{period:'1',date:d539}],lotto:[{period:'2',date:lotto}],super:[{period:'3',date:sup}]});
t('週二 20:20 台北還沒到時段',()=>assert.equal(SC.status('tw',at('2026-10-27T20:20:00+08:00'),tw('2026-10-26','2026-10-23','2026-10-26')).wait,false));
t('週二 20:50 還沒公布→等 539＋大樂透',()=>{const s=SC.status('tw',at('2026-10-27T20:50:00+08:00'),tw('2026-10-26','2026-10-23','2026-10-26'));assert.equal(s.wait,true);assert.deepEqual(s.games,['d539','lotto']);});
t('539 到了大樂透還沒→繼續等大樂透',()=>assert.deepEqual(SC.status('tw',at('2026-10-27T20:55:00+08:00'),tw('2026-10-27','2026-10-23','2026-10-26')).games,['lotto']));
t('都到了→停止快速查詢',()=>assert.equal(SC.status('tw',at('2026-10-27T21:00:00+08:00'),tw('2026-10-27','2026-10-27','2026-10-26')).wait,false));
t('週日台彩不開',()=>assert.equal(SC.status('tw',at('2026-11-01T20:50:00+08:00'),tw('x','x','x')).wait,false));
t('加州夏令 台北 09:40 等待',()=>assert.equal(SC.status('ca',at('2026-10-27T09:40:00+08:00'),{ca:{latest:{period:'12042',date:'2026-10-25'}}}).wait,true));
t('加州 已有 10/26 期→不等',()=>assert.equal(SC.status('ca',at('2026-10-27T09:40:00+08:00'),{ca:{latest:{period:'12043',date:'2026-10-26'}}}).wait,false));
t('加州冬令 台北 09:40 還沒開（10:30 才開）',()=>assert.equal(SC.status('ca',at('2026-11-10T09:40:00+08:00'),{ca:{latest:{date:'2026-11-08'}}}).wait,false));
t('加州冬令 台北 10:35 等待',()=>assert.equal(SC.status('ca',at('2026-11-10T10:35:00+08:00'),{ca:{latest:{date:'2026-11-08'}}}).wait,true));
t('六合彩 21:40 等待、23:30 不等',()=>{assert.equal(SC.status('hk',at('2026-10-27T21:40:00+08:00'),{hk:{latest:{date:'2026-10-25'}}}).wait,true);assert.equal(SC.status('hk',at('2026-10-27T23:30:00+08:00'),{hk:{latest:{date:'2026-10-25'}}}).wait,false);});
t('版本號隨新一期改變',()=>assert.notEqual(SC.verOf(tw('a','b','c')),SC.verOf({...tw('a','b','c'),d539:[{period:'9',date:'a'}]})));
// 流程：假的官方來源，第 1 次沒新期、第 2 次出現新期 → fast() 觸發 onNew
(async()=>{const DR=require('../draws');let calls=0,fired=0;
 DR._setCache({...tw('2026-10-26','2026-10-23','2026-10-26')});
 DR._run.tw=async()=>{calls++;if(calls>=2)DR._setCache({...tw('2026-10-27','2026-10-27','2026-10-26'),d539:[{period:'115000256',date:'2026-10-27'}],lotto:[{period:'115000099',date:'2026-10-27'}]});};
 DR._run.ca=DR._run.hk=async()=>{};DR.onNew(()=>fired++);
 const base=at('2026-10-27T20:50:00+08:00');await DR.fast(base);DR.ver();
 // 第一次呼叫時建立基準版本
 assert.equal(fired,0);await DR.fast(base+60e3);assert.equal(calls,2);assert.equal(fired,1,'新一期要觸發通知');
 await DR.fast(base+120e3);assert.equal(calls,2,'拿到後不再一直問');ok++;console.log('✓ 新一期出現 → 通知一次、之後停止快速查詢');
 console.log(`\n${ok} 項全部通過`);process.exit(0);})().catch(e=>{console.error('✗',e.message);process.exit(1);});
