// 功能開關：全站層級（管理員設定，存在資料庫 kv 'features'）。只存「關閉」的鍵；沒設定或讀取失敗＝全部開啟
const S=require('./store');
const GROUPS=[
 ['彩種卡片',[['g_539','今彩539'],['g_lotto','大樂透'],['g_super','威力彩'],['g_ca','加州天天樂'],['g_hk','香港六合彩'],['g_vn655','越南 Power 6/55'],['g_vn645','越南 Mega 6/45'],['g_vn535','越南 Lotto 5/35'],['g_vnmn','越南南部各省彩'],['g_vnmt','越南中部各省彩'],['g_vnmb','越南北部各省彩']]],
 ['開獎卡片內容',[['ord','落球順序'],['recent','近N期開獎']]],
 ['統計頁分頁',[['t_hist','歷史／查詢'],['t_num','號碼統計'],['t_trend','走勢'],['t_adv','進階分析'],['t_ord','落球順序分頁'],['t_share','熱門分享分頁'],['t_sand','沙盤浮字'],['t_mine','我的號碼分頁'],['t_other','3星/4星/Bingo']]],
 ['功能',[['bao','包牌'],['draw','開獎試算'],['guess','歷史推測（下期機率分析）'],['share','熱門分享'],['mynum','我的號碼'],['live','開獎直播'],['auto','自動更新']]],
 ['娛樂（預設關閉）',[['play','娛樂點數＋小遊戲大廳（虛擬點數，無任何價值）']]]];
// 預設關閉的鍵：沒有明確開啟紀錄、設定壞掉或讀取失敗時一律視為關閉
const DEFAULT_OFF=['play'];
const KEYS=GROUPS.flatMap(g=>g[1].map(x=>x[0]));
const GAMEKEY={d539:'539',lotto:'lotto',super:'super',ca:'ca',hk:'hk',vn655:'vn655',vn645:'vn645',vn535:'vn535'};
let ver=1;
// 關閉的集合；任何讀取錯誤 → 空集合（全部開啟）
function off(){let f;try{f=S.get('features');}catch(e){f=null;}
 const base=f&&Array.isArray(f.off)?f.off.filter(k=>KEYS.includes(k)&&!DEFAULT_OFF.includes(k)):[];
 const onL=f&&Array.isArray(f.on)?f.on:[];
 return new Set([...base,...DEFAULT_OFF.filter(k=>!onL.includes(k))]);}
const on=k=>!off().has(k);
// list＝要關閉的鍵（沒勾的）。預設關閉的鍵另外記在 on，只有明確勾選才開
async function save(list){const o=[...new Set((list||[]).filter(k=>KEYS.includes(k)))];const onL=DEFAULT_OFF.filter(k=>!o.includes(k));await S.set('features',{off:o.filter(k=>!DEFAULT_OFF.includes(k)),on:onL,at:new Date().toISOString()});ver++;return o;}
// 使用者權限再和全站開關取交集（包牌、開獎試算、熱門分享、我的號碼）
const PERM={bao:'bao',draw:'draw',share:'share',mynum:'mynum'};
function perms(p,o=off()){return p.filter(k=>!(PERM[k]&&o.has(PERM[k])));}
const stripOrd=x=>{if(!x||typeof x!=='object')return x;const {order,...r}=x;return r;};
// /draws 回應過濾：關掉的彩種整個拿掉；落球順序／近N期／直播重播依開關移除
function draws(d,o=off()){if(!d||![...o].some(k=>!DEFAULT_OFF.includes(k)))return d;const out={...d};const ordOff=o.has('ord');
 for(const [k,g] of Object.entries(GAMEKEY)){if(out[k]==null)continue;if(o.has('g_'+g)){delete out[k];continue;}
  let v=out[k];if(Array.isArray(v)){if(ordOff)v=v.map(stripOrd);if(o.has('recent'))v=v.slice(0,1);}
  else if(typeof v==='object'){v={...v};if(ordOff){v.latest=stripOrd(v.latest);if(Array.isArray(v.hist))v.hist=v.hist.map(stripOrd);}if(o.has('recent')&&Array.isArray(v.hist))v.hist=v.hist.slice(0,1);}
  out[k]=v;}
 if(o.has('live'))delete out.replay;if(o.has('t_other'))delete out.other;return out;}
// 統計頁：這個遊戲的歷史資料要不要給
const gameOn=(g,o=off())=>!o.has('g_'+g);
// 統計頁裡用到歷史資料的分頁，全部關掉就不給資料
const HIST_TABS=['t_hist','t_num','t_trend','t_adv','t_ord','t_share','t_sand','t_mine'];
const histOn=(o=off())=>HIST_TABS.some(k=>!o.has(k)&&!(k==='t_adv'&&o.has('guess')));
function hist(d,o=off()){if(!(o.has('ord')||o.has('t_ord'))||!d||!Array.isArray(d.rows))return d;return {...d,rows:d.rows.map(r=>r.length>4?r.slice(0,4):r),ordN:0};}
module.exports={GROUPS,KEYS,DEFAULT_OFF,off,on,save,perms,draws,gameOn,histOn,hist,ver:()=>ver};
