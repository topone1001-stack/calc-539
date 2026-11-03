(function(){
const u=document.getElementById('newu'),rs=document.querySelector('form[action="/admin/create"] select[name=role]');
const gn=async()=>{try{const j=await (await fetch('/admin/genname?role='+(rs?rs.value:'user'))).json();u.value=j.name;}catch(e){}};if(u&&rs)rs.addEventListener('change',gn);const rg=document.getElementById('regen');if(u&&rg)rg.addEventListener('click',gn);
const t=document.getElementById('cptxt'),b=document.getElementById('cpbtn'),m=document.getElementById('cpmsg');if(!t)return;
const legacy=s=>{const a=document.createElement('textarea');a.value=s;a.setAttribute('readonly','');a.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';document.body.append(a);a.focus();a.select();a.setSelectionRange(0,s.length);let ok=false;try{ok=document.execCommand('copy');}catch(e){}a.remove();return ok;};
const say=ok=>{m.textContent=ok?'已複製，可直接貼給客戶':'複製失敗，請長按上方文字複製';m.style.color=ok?'#86efac':'#fcd34d';};
b.onclick=()=>{const s=t.textContent;// 直接在點擊事件內複製（iPhone Safari 需要）
 if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(s).then(()=>say(true),()=>say(legacy(s)));}else say(legacy(s));};})();
document.addEventListener('click',e=>{const b=e.target.closest('[data-confirm]');if(b&&!confirm(b.dataset.confirm))e.preventDefault();});
