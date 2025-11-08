// js/features/home.js
import {
  db, auth,
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit,
  serverTimestamp, Timestamp, doc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  increment
} from '../firebase.js';
import { $, $$, modalConfirm } from '../core/dom.js';
import { esc, fmtDate } from '../core/utils.js';
import { INVENTORY_CATEGORIES } from '../config.js';

export function renderHome(){
  const page = $('#page');
  page.innerHTML = `
    <div class="grid" style="margin-top:0">
      <div class="card" style="grid-column:span 12">
        <div class="card-header">
          <h3>Saved Forms</h3>
          <div class="spacer"></div>
          <button id="forms_new" class="btn">Create Form</button>
        </div>
        <div id="forms_list" class="list-table"></div>
        <small id="forms_err" class="help"></small>
      </div>
    </div>
  `;

  const list = $('#forms_list');
  const err = $('#forms_err');

  $('#forms_new').onclick = () => { openHomeFormCreateModal(); };

  async function loadHomeForms(){
    try {
      const qs = await getDocs(query(collection(db,'order_forms'), orderBy('created_at','desc'), limit(100)));
      const rows = qs.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!rows.length){
        list.innerHTML = `<p class="muted">No forms yet.</p>`;
        return;
      }
      const grid = `
        <div class="grid">
          ${rows.map(r => `
            <div class="card" style="grid-column:span 3; display:flex; flex-direction:column; gap:8px">
              <h4 style="margin:0">${esc(r.title || r.id)}</h4>
              <div class="muted">${esc(r.created_by || '')}</div>
              <div class="muted">${fmtDate(r.created_at)}</div>
              <div class="spacer"></div>
              <div style="display:flex; gap:8px; justify-content:flex-end">
                <button class="btn" data-open-form="${esc(r.id)}">Open</button>
                <button class="btn-ghost" data-edit-form="${esc(r.id)}">Edit</button>
                <button class="btn-ghost" data-del-form="${esc(r.id)}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>`;
      list.innerHTML = grid;
      list.querySelectorAll('[data-open-form]').forEach(btn => {
        btn.addEventListener('click', () => openHomeFormViewModal(btn.getAttribute('data-open-form')));
      });
      list.querySelectorAll('[data-edit-form]').forEach(btn => {
        btn.addEventListener('click', () => openHomeFormEditModal(btn.getAttribute('data-edit-form')));
      });
      list.querySelectorAll('[data-del-form]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-del-form');
          if (!auth.currentUser) return alert('Login first');
          const ok = await modalConfirm({ title:'Delete Form', message:'Delete this form?' });
          if (!ok) return;
          try{ await deleteDoc(doc(db,'order_forms', id)); loadHomeForms(); }
          catch(e){ alert(e.message || String(e)); }
        });
      });
    } catch (e) {
      err.textContent = 'Failed to load forms: ' + (e.message || String(e));
    }
  }
  loadHomeForms();

  function openHomeFormCreateModal(){
    if (!auth.currentUser) return alert('Login first');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:900px">
        <header>
          <strong>New Deduction Form</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body" style="display:grid; gap:12px">
          <div>
            <label class="muted">Title</label>
            <input id="nf_title" class="input" placeholder="e.g. Afternoon Shift Deductions">
          </div>
          <div>
            <label class="muted">Choose products</label>
            <div id="nf_cats" style="display:flex; gap:8px; flex-wrap:wrap; margin:6px 0"></div>
            <div style="display:flex; gap:8px; align-items:center; margin:6px 0">
              <input id="nf_search" class="input" placeholder="Search code or description" style="flex:1">
              <label style="white-space:nowrap"><input id="nf_all" type="checkbox"> Select all in view</label>
            </div>
            <div class="table-wrap" style="max-height:50vh; overflow:auto">
              <table class="table-nice" id="nf_table">
                <colgroup>
                  <col style="width:40px"><col style="width:140px"><col>
                </colgroup>
                <thead><tr><th></th><th>Code</th><th>Description</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
            <small class="help"><span id="nf_count">0</span> selected</small>
          </div>
        </div>
        <footer>
          <button class="btn close">Cancel</button>
          <button id="nf_create" class="btn primary" disabled>Create</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e => { if (e.target===wrap || e.target.classList.contains('close')) close(); });

    const catsWrap = wrap.querySelector('#nf_cats');
    const tbody = wrap.querySelector('#nf_table tbody');
    const search = wrap.querySelector('#nf_search');
    const selAll = wrap.querySelector('#nf_all');
    const countEl = wrap.querySelector('#nf_count');
    const btnCreate = wrap.querySelector('#nf_create');

    let allProducts = [];
    let currentCat = (INVENTORY_CATEGORIES && INVENTORY_CATEGORIES[0]) || '';
    const selected = new Set();

    const norm = s => String(s||'').trim().toLowerCase();
    function inCategory(p, cat){
      if (!cat) return true;
      const c = String(p.category||'').trim();
      if (cat === 'Others'){
        if (!c) return true;
        const inList = (INVENTORY_CATEGORIES||[]).map(norm).includes(norm(c));
        return norm(c) === 'others' || !inList;
      }
      return norm(c) === norm(cat);
    }

    function paintCats(){
      catsWrap.className = 'segmented';
      catsWrap.innerHTML = (INVENTORY_CATEGORIES || []).map(cat => `
        <button class="seg ${cat===currentCat?'active':''}" data-cat="${esc(cat)}">${esc(cat)}</button>
      `).join('');
      catsWrap.querySelectorAll('[data-cat]').forEach(btn=>{
        btn.addEventListener('click', ()=>{ currentCat = btn.dataset.cat; paintCats(); renderList(); });
      });
    }

    function renderList(){
      const q = (search.value||'').toLowerCase().trim();
      const list = allProducts.filter(p => inCategory(p, currentCat) && (
        !q || (String(p.code||'').toLowerCase().includes(q) || String(p.description||'').toLowerCase().includes(q))
      ));
      tbody.innerHTML = list.map(p => `
        <tr>
          <td class="td-num"><input type="checkbox" data-id="${esc(p.id)}" ${selected.has(p.id)?'checked':''}></td>
          <td class="mono">${esc(p.code||'')}</td>
          <td>${esc(p.description||'')}</td>
        </tr>
      `).join('');

      const allChecked = list.length>0 && list.every(p => selected.has(p.id));
      selAll.checked = allChecked;
      tbody.querySelectorAll('input[type=checkbox][data-id]').forEach(chk =>{
        chk.addEventListener('change', ()=>{
          const id = chk.dataset.id;
          if (chk.checked) selected.add(id); else selected.delete(id);
          countEl.textContent = String(selected.size);
          btnCreate.disabled = selected.size === 0;
        });
      });
    }

    selAll.addEventListener('change', ()=>{
      const q = (search.value||'').toLowerCase().trim();
      const list = allProducts.filter(p => inCategory(p, currentCat) && (
        !q || (String(p.code||'').toLowerCase().includes(q) || String(p.description||'').toLowerCase().includes(q))
      ));
      if (selAll.checked){ list.forEach(p => selected.add(p.id)); } else { list.forEach(p => selected.delete(p.id)); }
      renderList();
      countEl.textContent = String(selected.size);
      btnCreate.disabled = selected.size === 0;
    });

    search.addEventListener('input', ()=>{ renderList(); });

    (async ()=>{
      try{
        const snap = await getDocs(collection(db,'products'));
        allProducts = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        paintCats();
        renderList();
      }catch(e){ console.error(e); alert('Failed to load products: ' + (e.message||String(e))); }
    })();

    btnCreate.addEventListener('click', async ()=>{
      if (!auth.currentUser) return alert('Login first');
      if (selected.size === 0) return;
      const title = (wrap.querySelector('#nf_title').value || '').trim() || 'Untitled';
      try{
        const docRef = await addDoc(collection(db,'order_forms'), {
          title,
          item_ids: Array.from(selected),
          created_at: serverTimestamp(),
          created_by: auth.currentUser.email
        });
        close();
        openHomeFormViewModal(docRef.id);
        loadHomeForms();
      }catch(e){ console.error(e); alert(e.message); }
    });
  }

  async function openHomeFormViewModal(formId){
    const formSnap = await getDoc(doc(db,'order_forms', formId));
    if (!formSnap.exists()) return alert('Form not found');
    const form = { id: formId, ...formSnap.data() };
    const codes = Array.isArray(form.item_ids) ? form.item_ids : [];

    const items = [];
    for (const code of codes){
      let snap = await getDoc(doc(db,'products', code));
      if (snap.exists()){ items.push({ id: snap.id, ...snap.data() }); continue; }
      const qs = await getDocs(query(collection(db,'products'), where('code','==', code), limit(1)));
      if (!qs.empty) items.push({ id: qs.docs[0].id, ...qs.docs[0].data() });
      else items.push({ id: code, code, description:'(not found)', soh:0, _missing:true });
    }

    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:920px">
        <header>
          <strong>${esc(form.title || 'Saved Form')}</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body">
          <div class="toolbar sticky" style="top:0; gap:12px; align-items:center">
            <div id="fv_cats" class="cats-ribbon" style="display:flex; gap:8px; flex-wrap:wrap"></div>
            <div class="spacer"></div>
            <button id="fv_post" class="btn primary">Post Deductions</button>
          </div>
          <div class="table-wrap">
            <table class="table-nice" id="fv_table">
              <colgroup>
                <col style="width:140px"><col><col style="width:120px"><col style="width:160px"><col style="width:140px">
              </colgroup>
              <thead style="position:sticky; top: var(--toolbar-h); background: var(--panel); z-index: 1"><tr><th>Code</th><th>Description</th><th>SOH</th><th>Deduct</th><th>Result</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e => { if (e.target===wrap || e.target.classList.contains('close')) close(); });

    const $w = sel => wrap.querySelector(sel);
    const tbody = $w('#fv_table tbody');
    const btnPost = $w('#fv_post');
    const catsWrap = $w('#fv_cats');

    const norm = s => String(s||'').trim().toLowerCase();
    const knownCats = (INVENTORY_CATEGORIES||[]).map(c=>({label:c, key:norm(c)}));
    const itemCatKey = it => {
      const c = norm(it.category);
      if (!c) return 'others';
      const inKnown = knownCats.some(k=>k.key===c);
      return inKnown ? c : (c==='others' ? 'others' : 'others');
    };
    const present = new Map();
    items.forEach(it => {
      const key = itemCatKey(it);
      const label = knownCats.find(k=>k.key===key)?.label || 'Others';
      present.set(key, label);
    });
    let currentCat = 'all';

    function paintCats(){
      const btns = [`<button class="${currentCat==='all'?'btn':'btn-ghost'}" data-cat="all">All</button>`]
        .concat([...present.entries()].map(([key,label]) => `
          <button class="${currentCat===key?'btn':'btn-ghost'}" data-cat="${esc(key)}">${esc(label)}</button>`));
      catsWrap.innerHTML = btns.join('');
      catsWrap.querySelectorAll('[data-cat]').forEach(b=>{
        b.addEventListener('click', ()=>{ currentCat = b.dataset.cat; paintCats(); paintRows(); });
      });
    }
    paintCats();

    function paintRows(){
      const list = items.filter(it => currentCat==='all' || itemCatKey(it)===currentCat);
      tbody.innerHTML = list.map(it => `
        <tr data-id="${esc(it.id)}">
          <td><span class="mono">${esc(it.code || it.id || '')}</span></td>
          <td>${esc(it.description||'')}</td>
          <td class="td-num"><span class="pill-count">${Number(it.soh||0)}</span></td>
          <td>${it._missing ? '<span class="muted">—</span>' : `<input class="input qty-input" type="number" min="0" step="1" data-id="${esc(it.id)}" data-code="${esc(it.code||'')}" placeholder="0">`}</td>
          <td class="td-result"><span class="muted">—</span></td>
        </tr>`).join('');
    }
    paintRows();

    btnPost.onclick = async ()=>{
      if (!auth.currentUser) return alert('Login first');
      const inputs = [...wrap.querySelectorAll('#fv_table input[data-id]')];
      const changes = inputs.map(inp => ({ id: inp.dataset.id, code: inp.dataset.code, qty: parseInt(inp.value,10) || 0, el: inp })).filter(x => x.qty > 0);
      if (!changes.length) return alert('Nothing to deduct.');

      let ok=0, fail=0, msgs=[];
      for (const ch of changes){
        const item = items.find(i => i.id === ch.id);
        if (!item){ fail++; msgs.push(`${ch.code||ch.id}: not found`); markResult(ch.el, 'Not found', true); continue; }
        const curr = Number(item.soh||0);
        if (ch.qty > curr){ fail++; msgs.push(`${item.code}: not enough stock (have ${curr}, need ${ch.qty})`); markResult(ch.el, 'Insufficient', true); continue; }
        try{
          const pref = doc(db,'products', ch.id);
          await updateDoc(pref, { soh: increment(-ch.qty), total_out: increment(ch.qty) });
          await addDoc(collection(db,'stock_movements'), {
            product_id: ch.id, product_code: item.code || null, qty_delta: -ch.qty,
            note: `deduct (form: ${form.title||formId})`, created_by: auth.currentUser.email, created_at: serverTimestamp()
          });
          item.soh = curr - ch.qty;
          ch.el.value = '';
          markResult(ch.el, 'OK', false);
          ok++;
        }catch(e){ console.error(e); fail++; msgs.push(`${item.code}: ${e.message}`); markResult(ch.el, 'Error', true); }
      }
      paintRows();
      alert(`Deductions complete — success: ${ok}${fail?`, failed: ${fail}\n${msgs.join('\n')}`:''}`);
    };

    function markResult(inputEl, msg, isErr){
      const tr = inputEl.closest('tr');
      const td = tr.querySelector('.td-result');
      td.innerHTML = `<span class="${isErr?'text-danger':'text-success'}">${esc(msg)}</span>`;
    }
  }

  async function openHomeFormEditModal(formId){
    if (!auth.currentUser) return alert('Login first');
    const snapForm = await getDoc(doc(db,'order_forms', formId));
    if (!snapForm.exists()) return alert('Form not found');
    const form = { id: formId, ...snapForm.data() };

    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:900px">
        <header>
          <strong>Edit Form</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body" style="display:grid; gap:12px">
          <div>
            <label class="muted">Title</label>
            <input id="ef_title" class="input" value="${esc(form.title||'')}" placeholder="Form title">
          </div>
          <div>
            <label class="muted">Choose products</label>
            <div id="ef_cats" style="display:flex; gap:8px; flex-wrap:wrap; margin:6px 0"></div>
            <div style="display:flex; gap:8px; align-items:center; margin:6px 0">
              <input id="ef_search" class="input" placeholder="Search code or description" style="flex:1">
              <label style="white-space:nowrap"><input id="ef_all" type="checkbox"> Select all in view</label>
            </div>
            <div class="table-wrap" style="max-height:50vh; overflow:auto">
              <table class="table-nice" id="ef_table">
                <colgroup>
                  <col style="width:40px"><col style="width:140px"><col>
                </colgroup>
                <thead><tr><th></th><th>Code</th><th>Description</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
            <small class="help"><span id="ef_count">0</span> selected</small>
          </div>
        </div>
        <footer>
          <button class="btn close">Cancel</button>
          <button id="ef_save" class="btn primary">Save</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e => { if (e.target===wrap || e.target.classList.contains('close')) close(); });

    const catsWrap = wrap.querySelector('#ef_cats');
    const tbody = wrap.querySelector('#ef_table tbody');
    const search = wrap.querySelector('#ef_search');
    const selAll = wrap.querySelector('#ef_all');
    const countEl = wrap.querySelector('#ef_count');
    const btnSave = wrap.querySelector('#ef_save');

    let allProducts = [];
    let currentCat = (INVENTORY_CATEGORIES && INVENTORY_CATEGORIES[0]) || '';
    const selected = new Set();

    const norm = s => String(s||'').trim().toLowerCase();
    function inCategory(p, cat){
      if (!cat) return true;
      const c = String(p.category||'').trim();
      if (cat === 'Others'){
        if (!c) return true;
        const inList = (INVENTORY_CATEGORIES||[]).map(norm).includes(norm(c));
        return norm(c) === 'others' || !inList;
      }
      return norm(c) === norm(cat);
    }

    function paintCats(){
      catsWrap.className = 'segmented';
      catsWrap.innerHTML = (INVENTORY_CATEGORIES || []).map(cat => `
        <button class="seg ${cat===currentCat?'active':''}" data-cat="${esc(cat)}">${esc(cat)}</button>
      `).join('');
      catsWrap.querySelectorAll('[data-cat]').forEach(btn=>{
        btn.addEventListener('click', ()=>{ currentCat = btn.dataset.cat; paintCats(); renderList(); });
      });
    }

    function renderList(){
      const q = (search.value||'').toLowerCase().trim();
      const list = allProducts.filter(p => inCategory(p, currentCat) && (
        !q || (String(p.code||'').toLowerCase().includes(q) || String(p.description||'').toLowerCase().includes(q))
      ));
      tbody.innerHTML = list.map(p => `
        <tr>
          <td class="td-num"><input type="checkbox" data-id="${esc(p.id)}" ${selected.has(p.id)?'checked':''}></td>
          <td class="mono">${esc(p.code||'')}</td>
          <td>${esc(p.description||'')}</td>
        </tr>
      `).join('');

      const allChecked = list.length>0 && list.every(p => selected.has(p.id));
      selAll.checked = allChecked;
      tbody.querySelectorAll('input[type=checkbox][data-id]').forEach(chk =>{
        chk.addEventListener('change', ()=>{
          const id = chk.dataset.id;
          if (chk.checked) selected.add(id); else selected.delete(id);
          countEl.textContent = String(selected.size);
        });
      });
      countEl.textContent = String(selected.size);
    }

    selAll.addEventListener('change', ()=>{
      const q = (search.value||'').toLowerCase().trim();
      const list = allProducts.filter(p => inCategory(p, currentCat) && (
        !q || (String(p.code||'').toLowerCase().includes(q) || String(p.description||'').toLowerCase().includes(q))
      ));
      if (selAll.checked){ list.forEach(p => selected.add(p.id)); } else { list.forEach(p => selected.delete(p.id)); }
      renderList();
    });

    search.addEventListener('input', ()=>{ renderList(); });

    (async ()=>{
      try{
        const snap = await getDocs(collection(db,'products'));
        allProducts = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        const given = new Set((Array.isArray(form.item_ids)? form.item_ids: []).map(String));
        allProducts.forEach(p => { if (given.has(String(p.id)) || given.has(String(p.code))) selected.add(p.id); });
        paintCats();
        renderList();
      }catch(e){ console.error(e); alert('Failed to load products: ' + (e.message||String(e))); }
    })();

    btnSave.addEventListener('click', async ()=>{
      if (!auth.currentUser) return alert('Login first');
      const title = (wrap.querySelector('#ef_title').value || '').trim() || 'Untitled';
      try{
        await updateDoc(doc(db,'order_forms', formId), {
          title,
          item_ids: Array.from(selected),
          updated_at: serverTimestamp(),
          updated_by: auth.currentUser.email
        });
        close();
        loadHomeForms();
      }catch(e){ console.error(e); alert(e.message); }
    });
  }
}
