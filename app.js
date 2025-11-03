// v3 with ❤️ pricing (搞怪宇宙)
const state = {
  mode: 'pickup',
  categories: [],
  items: [],
  filtered: [],
  cart: JSON.parse(localStorage.getItem('zz_cart') || '[]'),
  points: parseInt(localStorage.getItem('zz_points') || '0', 10) || 0,
  history: JSON.parse(localStorage.getItem('zz_history') || '[]')
};
const $ = s=>document.querySelector(s), $$ = s=>Array.from(document.querySelectorAll(s));
const categoriesEl=$('#categories'), menuEl=$('#menu'), recEl=$('#recommend');
const cartbar=$('#cartbar'), cartCount=$('#cart-count'), cartTotal=$('#cart-total'), cartNote=$('#cart-note');
const drawer=$('#drawer'), drawerBackdrop=$('#drawerBackdrop'), btnCart=$('#btnCart'), btnCloseDrawer=$('#btnCloseDrawer');
const cartList=$('#cartList'), subtotalEl=$('#subtotal'), deliveryFeeEl=$('#deliveryFee'), deliveryFeeRow=$('#deliveryFeeRow'), grandTotalEl=$('#grandTotal');
const btnClear=$('#btnClear'), btnPlace=$('#btnPlace'), orderNotes=$('#orderNotes');
const timeSlot=$('#timeSlot'), addressInput=$('#address'), searchInput=$('#search');
const dlgOptions=$('#dlgOptions'), optTitle=$('#optTitle'), optBody=$('#optBody'), optAdd=$('#optAdd'), qtyInput=$('#qty'), minus=$('#minus'), plus=$('#plus');
const btnHistory=$('#btnHistory'), dlgHistory=$('#dlgHistory'), hisClose=$('#hisClose'), hisClose2=$('#hisClose2'), hisClear=$('#hisClear'), hisBody=$('#hisBody');
const pointsEl=$('#points'), btnGacha=$('#btnGacha');
const dlgPlace=$('#dlgPlace'), placeClose=$('#placeClose'), sendSMS=$('#sendSMS'), copyWeChat=$('#copyWeChat'), sendMail=$('#sendMail');

async function init(){
  try{const saved=JSON.parse(localStorage.getItem('zz_state')||'{}'); if(saved.mode)state.mode=saved.mode; if(saved.address)addressInput.value=saved.address; if(saved.time)timeSlot.value=saved.time;}catch(e){}
  updateModeUI(); updatePointsUI();
  const res=await fetch('data/menu.json'); const data=await res.json();
  state.categories=data.categories; state.items=data.items;
  renderCategories(); renderMenu(); renderRecommend(); renderCartbar();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js'); }
}
init();

function updatePointsUI(){ pointsEl.textContent='❤️ '+state.points; }

$$('.toggle .chip').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.toggle .chip').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active'); state.mode=btn.dataset.mode; updateModeUI(); persistState(); renderCartbar();
}));
function updateModeUI(){ if(state.mode==='delivery'){ addressInput.style.display='block'; deliveryFeeRow.style.display='grid'; cartNote.textContent='外送模式（不影响❤️）'; } else { addressInput.style.display='none'; deliveryFeeRow.style.display='none'; cartNote.textContent='自取模式（不影响❤️）'; } }
searchInput.addEventListener('input', ()=>{ const q=searchInput.value.toLowerCase(); state.filtered=state.items.filter(it=>(it.name+it.desc).toLowerCase().includes(q)); renderMenu(); });

function renderCategories(){ categoriesEl.innerHTML=''; state.categories.forEach((c,i)=>{ const b=document.createElement('button'); b.className='tab'+(i===0?' active':''); b.textContent=c; b.addEventListener('click',()=>{ $$('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); scrollToCategory(c); }); categoriesEl.appendChild(b); }); }
function scrollToCategory(cat){ const el=document.querySelector(`[data-cat="${CSS.escape(cat)}"]`); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }

function heartLabel(h){ if(h==='INF') return '∞❤️'; const v=Number(h); if(Number.isNaN(v)) return '❤️'; if(Math.abs(v%1)===0.5) return (v<0?'-':'')+'0.5❤️'; return v+'❤️'; }

function renderMenu(){ const list=state.filtered.length?state.filtered:state.items; menuEl.innerHTML=''; const frag=document.createDocumentFragment(); let lastCat=null; list.forEach(it=>{ if(it.category!==lastCat){ lastCat=it.category; const sep=document.createElement('div'); sep.textContent=lastCat; sep.className='tab active'; sep.setAttribute('data-cat',lastCat); sep.style.margin='8px 0'; frag.appendChild(sep);} const node=renderItem(it); frag.appendChild(node); }); menuEl.appendChild(frag); }
function renderItem(it){ const tpl=document.getElementById('tplItem'); const node=tpl.content.firstElementChild.cloneNode(true); node.querySelector('.name').textContent=it.name; node.querySelector('.desc').textContent=it.desc||''; node.querySelector('.price').textContent=heartLabel(it.hearts); node.querySelector('.add').addEventListener('click',()=>openOptions(it)); return node; }

let pendingItem=null;
function openOptions(it){ pendingItem=it; qtyInput.value=1; optTitle.textContent=it.name; optBody.innerHTML='';
  if(it.options&&it.options.length){ it.options.forEach(group=>{ const box=document.createElement('div'); box.className='option-group'; const title=document.createElement('div'); title.className='title'; title.textContent=group.title+(group.required?'（必选）':''); box.appendChild(title);
    group.choices.forEach(ch=>{ const row=document.createElement('label'); row.className='option'; const left=document.createElement('div'); left.textContent=ch.name; const right=document.createElement('input'); right.type=group.multiple?'checkbox':'radio'; right.name=group.title; right.value=ch.name; row.appendChild(left); row.appendChild(right); box.appendChild(row); }); optBody.appendChild(box); });
  } else { const p=document.createElement('div'); p.className='muted'; p.textContent='此菜品无可选项。'; optBody.appendChild(p); }
  dlgOptions.showModal();
}
minus.addEventListener('click',()=>{ qtyInput.value=Math.max(1,(+qtyInput.value||1)-1) }); plus.addEventListener('click',()=>{ qtyInput.value=(+qtyInput.value||1)+1 });
optAdd.addEventListener('click',(e)=>{ e.preventDefault(); if(!pendingItem) return; const selections=[]; $$('.option input').forEach(inp=>{ if(inp.checked){ selections.push(inp.value); } });
  if(pendingItem.options){ const all=$$('.option-group'); for(const g of all){ const required=g.querySelector('.title').textContent.includes('（必选）'); if(required && g.querySelectorAll('input:checked').length===0){ alert('请完成必选项'); return; } } }
  const qty=+qtyInput.value||1; const cartItem={ id:pendingItem.id, name:pendingItem.name, hearts:pendingItem.hearts, selections, qty }; state.cart.push(cartItem); persistCart(); dlgOptions.close(); renderCartbar(true);
});

function renderCartbar(show=false){ const {count,total,inf,neg}=cartTotals(); cartCount.textContent=count; cartTotal.textContent = (inf?'∞❤️':(total.toFixed(1).replace('.0','')+'❤️')) + (neg? '（含偷吃-❤️）':'' ); cartbar.hidden=count===0; if(show) openDrawer(); }

function cartTotals(){ const count=state.cart.reduce((a,b)=>a+b.qty,0); let total=0; let inf=false; let neg=false;
  state.cart.forEach(it=>{ if(it.hearts==='INF'){inf=true; } else { const v=Number(it.hearts)||0; if(v<0) neg=true; total += v*it.qty; } });
  return {count,total,inf,neg};
}

function openDrawer(){ drawer.classList.add('show'); drawer.setAttribute('open',''); drawer.setAttribute('aria-hidden','false'); renderCartList(); }
function closeDrawer(){ drawer.classList.remove('show'); drawer.removeAttribute('open'); drawer.setAttribute('aria-hidden','true'); }
btnCart.addEventListener('click', openDrawer); btnCloseDrawer.addEventListener('click', closeDrawer); drawerBackdrop.addEventListener('click', closeDrawer);

function renderCartList(){ cartList.innerHTML=''; state.cart.forEach((it,idx)=>{ const row=document.createElement('div'); row.className='cart-row';
  const left=document.createElement('div'); const name=document.createElement('div'); name.className='name'; name.textContent=it.name; const sel=document.createElement('div'); sel.className='small muted'; sel.textContent=it.selections&&it.selections.length?it.selections.join('，'):''; left.appendChild(name); left.appendChild(sel);
  const right=document.createElement('div'); right.className='qty'; const minus=document.createElement('button'); minus.textContent='–'; const num=document.createElement('div'); num.textContent=it.qty; const plus=document.createElement('button'); plus.textContent='+'; const del=document.createElement('button'); del.textContent='删除'; del.style.marginLeft='8px'; del.style.border='1px solid #ddd'; del.style.background='#fff'; del.style.borderRadius='8px'; del.style.padding='6px 8px';
  minus.addEventListener('click',()=>{ it.qty=Math.max(1,it.qty-1); persistCart(); renderCartList(); renderCartbar(); }); plus.addEventListener('click',()=>{ it.qty+=1; persistCart(); renderCartList(); renderCartbar(); }); del.addEventListener('click',()=>{ state.cart.splice(idx,1); persistCart(); renderCartList(); renderCartbar(); });
  const price=document.createElement('div'); price.textContent= (it.hearts==='INF'?'∞❤️':((Number(it.hearts)||0)*it.qty).toFixed(1).replace('.0','')+'❤️');
  const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gap='4px'; wrap.appendChild(left); wrap.appendChild(sel);
  row.appendChild(wrap); row.appendChild(price); row.appendChild(right); cartList.appendChild(row);
});
const {total,inf,neg}=cartTotals(); subtotalEl.textContent = inf?'∞❤️':(total.toFixed(1).replace('.0','')+'❤️'); deliveryFeeEl.textContent='0❤️'; grandTotalEl.textContent = inf?'∞❤️':(total.toFixed(1).replace('.0','')+'❤️');
}
btnClear.addEventListener('click',()=>{ if(confirm('清空购物车？')){ state.cart=[]; persistCart(); renderCartList(); renderCartbar(); }});

// Place workflow
btnPlace.addEventListener('click',()=>{ const {count}=cartTotals(); if(count===0) return; dlgPlace.showModal(); });
placeClose?.addEventListener('click',()=> dlgPlace.close());
sendSMS.addEventListener('click',()=>{ const msg=buildOrderMessage(); location.href=`sms:?&body=${encodeURIComponent(msg)}`; dlgPlace.close(); finalizeOrder(msg); });
copyWeChat.addEventListener('click', async()=>{ const msg=buildOrderMessage(); try{ await navigator.clipboard.writeText(msg); alert('已复制微信下单模板，去微信粘贴发送即可'); }catch(e){ alert('复制失败，请手动长按复制'); } dlgPlace.close(); finalizeOrder(msg); });
sendMail.addEventListener('click',()=>{ const msg=buildOrderMessage(); location.href=`mailto:?subject=${encodeURIComponent('峥峥的食堂 下单')}&body=${encodeURIComponent(msg)}`; dlgPlace.close(); finalizeOrder(msg); });

function finalizeOrder(message){
  const order={ time:new Date().toISOString(), mode:state.mode, address:addressInput.value, timeSlot:timeSlot.value||'尽快',
    items: state.cart.map(x=>({id:x.id,name:x.name,qty:x.qty,selections:x.selections})), note: orderNotes.value||'', summary:message };
  state.history.unshift(order); localStorage.setItem('zz_history', JSON.stringify(state.history));
  state.points += 1; localStorage.setItem('zz_points', String(state.points)); updatePointsUI(); if(state.points>0 && state.points%10===0){ alert('🎁 情侣积分+1：已满10分，解锁一个小愿望！'); }
  state.cart=[]; persistCart(); renderCartbar(); closeDrawer(); renderRecommend();
}

function buildOrderMessage(){
  const {total,inf}=cartTotals();
  const lines=[]; lines.push('【峥峥的食堂】下单'); lines.push('模式：'+(state.mode==='delivery'?'外送':'自取'));
  if(timeSlot.value) lines.push('时间：'+timeSlot.value); else lines.push('时间：尽快');
  if(state.mode==='delivery') lines.push('地址：'+addressInput.value.trim()); lines.push('———');
  state.cart.forEach((it,idx)=>{ const s=(it.selections&&it.selections.length)?'（'+it.selections.join('，')+'）':''; lines.push(`${idx+1}. ${it.name}${s} ×${it.qty}`); });
  lines.push('———'); lines.push('合计：'+(inf?'∞❤️':(total.toFixed(1).replace('.0','')+'❤️')));
  if(orderNotes.value.trim()) lines.push('备注：'+orderNotes.value.trim()); lines.push('— 由峥峥的食堂 App 生成'); const msg=lines.join('\\n'); try{ localStorage.setItem('zz_lastOrder', msg); }catch(e){} return msg;
}
function persistCart(){ localStorage.setItem('zz_cart', JSON.stringify(state.cart)); }
function persistState(){ localStorage.setItem('zz_state', JSON.stringify({ mode:state.mode, address:addressInput.value, time:timeSlot.value })); }
[addressInput, timeSlot].forEach(el=>el.addEventListener('change', persistState));

btnHistory.addEventListener('click',()=>{ hisBody.innerHTML=''; if(state.history.length===0){ hisBody.innerHTML='<div class="muted">暂无历史订单</div>'; } else {
  state.history.forEach((o,idx)=>{ const box=document.createElement('div'); box.className='option-group'; const title=document.createElement('div'); title.className='title';
    const t=new Date(o.time); title.textContent = `${t.toLocaleString()} · ${o.mode==='delivery'?'外送':'自取'} · ${o.timeSlot}`;
    const pre=document.createElement('pre'); pre.textContent=o.summary; pre.style.whiteSpace='pre-wrap'; pre.style.font='inherit'; pre.style.background='#f7f7f7'; pre.style.padding='8px'; pre.style.borderRadius='8px';
    const row=document.createElement('div'); row.style.display='flex'; row.style.gap='8px'; row.style.marginTop='6px';
    const btnCopy=document.createElement('button'); btnCopy.className='btn-plain'; btnCopy.textContent='复制';
    const btnRe=document.createElement('button'); btnRe.className='btn-primary'; btnRe.textContent='再来一单';
    btnCopy.addEventListener('click', async()=>{ try{ await navigator.clipboard.writeText(o.summary); alert('已复制'); }catch(e){ alert('复制失败'); } });
    btnRe.addEventListener('click',()=>{ state.cart = o.items.map(x=>({id:x.id,name:x.name,hearts: (state.items.find(i=>i.id===x.id)?.hearts)||1, selections:x.selections||[], qty:x.qty})); persistCart(); renderCartbar(true); dlgHistory.close(); });
    row.appendChild(btnCopy); row.appendChild(btnRe); box.appendChild(title); box.appendChild(pre); box.appendChild(row); hisBody.appendChild(box); });
}
  dlgHistory.showModal();
});
hisClose.addEventListener('click',()=> dlgHistory.close()); hisClose2.addEventListener('click',()=> dlgHistory.close()); hisClear.addEventListener('click',()=>{ if(confirm('清空所有历史记录？')){ state.history=[]; localStorage.setItem('zz_history','[]'); dlgHistory.close(); }});

btnGacha.addEventListener('click',()=>{ const pool=state.items.slice(); if(pool.length===0) return; const pick=pool[Math.floor(Math.random()*pool.length)]; openOptions(pick); });
