// 本機測試用：node -r ./tests/fake-sources.js server.js
// 把所有對外抓開獎的 fetch 換成假資料。建立 FAKE_FLAG 檔案（預設 /tmp/calc-fake-new）就會「出現新一期」。
const fs=require('fs');const FLAG=process.env.FAKE_FLAG||'/tmp/calc-fake-new';const real=global.fetch;
const J=o=>new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}});
const tw=(n,len,sp)=>{const now=new Date(Date.now()+8*3600e3).toISOString().slice(0,10),nw=fs.existsSync(FLAG);
 const rows=[{period:115000254,lotteryDate:'2026-10-24T00:00:00',drawNumberSize:[1,2,3,4,5,6,7].slice(0,len)},{period:115000255,lotteryDate:'2026-10-26T00:00:00',drawNumberSize:[3,8,15,22,30,33,9].slice(0,len)}];
 if(nw)rows.push({period:115000256,lotteryDate:now+'T00:00:00',drawNumberSize:[5,11,19,27,38,12,1].slice(0,len)});return rows;};
global.fetch=async(u,o)=>{u=String(u);
 if(u.includes('taiwanlottery.com')){if(u.includes('Daily539'))return J({rtCode:0,content:{daily539Res:tw(0,5)}});if(u.includes('Lotto649'))return J({rtCode:0,content:{lotto649Res:tw(0,7)}});
  if(u.includes('SuperLotto'))return J({rtCode:0,content:{superLotto638Res:tw(0,7)}});return J({rtCode:0,content:{lotto3DRes:[],lotto4DRes:[],bingoQueryResult:[]}});}
 if(u.includes('calottery.com'))return J({MostRecentDraw:{DrawNumber:12042,DrawDate:'2026-10-26T00:00:00',WinningNumbers:{0:{Number:'1'},1:{Number:'11'},2:{Number:'14'},3:{Number:'20'},4:{Number:'31'}},Prizes:{}},PreviousDraws:[]});
 if(u.includes('hkjc.com'))return J({data:{lotteryDraws:[{year:'26',no:110,drawDate:'2026-10-25+08:00',drawResult:{drawnNo:[2,9,16,23,35,44],xDrawnNo:7},lotteryPool:{lotteryPrizes:[]}}]}});
 if(u.includes('youtube.com'))return new Response('',{status:200});
 if(/^https?:\/\/(127\.0\.0\.1|localhost)/.test(u))return real(u,o);
 return new Response('blocked in test',{status:503});};
console.log('[fake-sources] 已啟用假開獎資料');
