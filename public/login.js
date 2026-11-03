const e=new URLSearchParams(location.search).get('e');if(e)document.getElementById('e').textContent=e==='rate'?'嘗試次數過多，請 15 分鐘後再試':e==='stale'?'帳號已停用，請聯絡上線重設':e==='off'?'帳號已停用或已過期':'帳號或密碼錯誤';

(function(){const K="calc.rememberUser",u=document.querySelector("[name=username]"),c=document.getElementById("remember"),p=document.querySelector("[name=password]");const v=localStorage.getItem(K);if(v){u.value=v;c.checked=true;p.focus();}
u.form.addEventListener("submit",()=>{c.checked&&u.value?localStorage.setItem(K,u.value.trim()):localStorage.removeItem(K);});})();

(function(){const v=document.getElementById("bgv");if(!v)return;const m=matchMedia("(prefers-reduced-motion: reduce)");const f=()=>{if(m.matches){v.pause();v.removeAttribute("autoplay");}else{v.muted=true;const p=v.play();p&&p.catch(()=>{});}};f();m.addEventListener&&m.addEventListener("change",f);})();
