// xoso.com.vn 解析：Power 6/55、Mega 6/45 用固定頁面檢查號碼（答案取自 2026-10-24／25 官方結果）
const V=require('../vn'),fs=require('fs'),a=require('assert'),S=require('../sched');
const p=V.parseXoso(fs.readFileSync(__dirname+'/fixtures-xoso-655.html','utf8'),'vn655')[0];
a.deepStrictEqual([p.period,p.nums,p.special],['20261024',[6,7,18,41,44,50],53]);
const m=V.parseXoso(fs.readFileSync(__dirname+'/fixtures-xoso-645.html','utf8'),'vn645')[0];
a.deepStrictEqual([m.period,m.nums,m.special],['20261025',[4,13,22,25,40,41],null]);
// 2026-11-09：當期在頁首區塊（日期在 site-link「Mở thưởng ngày …」），舊正則抓不到，曾導致站上停在舊期
const L=V.parseXoso(fs.readFileSync(__dirname+'/fixtures-xoso-645-live.html','utf8'),'vn645');
a.deepStrictEqual([L[0].period,L[0].no,L[0].nums],['20261108','01586',[1,2,14,20,23,36]]);
a.ok(new Set(L.map(x=>x.period)).size===L.length,'no duplicate periods');
a.ok(Object.values(S.EVERY).every(x=>x===60e3));
console.log('6 項全部通過');
