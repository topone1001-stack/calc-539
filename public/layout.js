// 版面切換：auto（依螢幕寬度）/ m 手機版 / d 電腦版，記在 localStorage
(function(){const K='calc.layout',vp=document.querySelector('meta[name=viewport]');
 const get=()=>localStorage.getItem(K)||'auto';
 function apply(){const m=get(),h=document.documentElement;h.classList.remove('lay-m','lay-d');
  const eff=m==='auto'?(innerWidth>=900?'d':'m'):m;h.classList.add('lay-'+eff);
  if(vp)vp.setAttribute('content',m==='d'?'width=1200':'width=device-width,initial-scale=1');
  const b=document.getElementById('laybtn');if(b){const L=m==='auto'?'🔄 自動':m==='m'?'📱 手機版':'🖥️ 電腦版';b.textContent=innerWidth<600?L.split(' ')[0]+'▾':L+' ▾';b.setAttribute('aria-label','版面：'+L);}}
 function btn(){if(document.getElementById('laybtn'))return;const b=document.createElement('button');b.id='laybtn';b.type='button';b.title='切換手機版／電腦版';
  b.onclick=()=>{const o=['auto','m','d'],n=o[(o.indexOf(get())+1)%3];n==='auto'?localStorage.removeItem(K):localStorage.setItem(K,n);apply();};document.body.append(b);apply();
  let t;const wake=()=>{b.classList.add('on');clearTimeout(t);t=setTimeout(()=>b.classList.remove('on'),1500)};b.addEventListener('touchstart',wake,{passive:true});b.addEventListener('focus',wake);}
 apply();addEventListener('resize',apply);
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',btn):btn();})();
