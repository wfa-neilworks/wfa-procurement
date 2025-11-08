// js/app.js
// -------------------------------------------------------------
// Firebase (auth + firestore helpers)
import {
  db, auth,
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit,
  serverTimestamp, Timestamp, doc,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  increment
} from './firebase.js';
import { $, $$, modalConfirm, modalPrompt } from './core/dom.js';
import { esc, escapeHtml, fmtDate, slugify, downloadCsv } from './core/utils.js';
import { INVENTORY_CATEGORIES, SDS_LOCATIONS } from './config.js';
import { renderHome as renderHomeFeature } from './features/home.js';

// DOM refs (assigned during init)
let sidebar, page, pageTitle, btnCollapse;

// Config moved to js/config.js

// ---------- Sidebar: categories + UI ----------
function buildCategories(){
  const wrap = $('#invCats');
  if (!wrap) return;
  wrap.innerHTML = '';
  INVENTORY_CATEGORIES.forEach(cat => {
    const slug = slugify(cat);
    const a = document.createElement('a');
    a.href = `#/inventory/${encodeURIComponent(slug)}`;
    a.textContent = cat;
    wrap.appendChild(a);
  });
}

// collapsed state handled in initApp

// expand/collapse the Inventory group
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.has-children');
  if (!btn) return;
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  const kids = btn.parentElement.querySelector('.nav-children');
  if (kids) kids.style.display = expanded ? 'none' : 'grid';
});

// ---------- Router ----------
export function initApp(){
  sidebar = $('#sidebar');
  page = $('#page');
  pageTitle = $('#pageTitle');
  btnCollapse = $('#btnCollapse');

  buildCategories();

  btnCollapse?.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('wf_sidebar_collapsed', collapsed ? '1' : '0');
  });
  if (localStorage.getItem('wf_sidebar_collapsed') === '1'){
    sidebar.classList.add('collapsed');
  }

  // Theme: load preference or system
  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
  applyTheme(initialTheme);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn){
    updateThemeButton(themeBtn);
    themeBtn.addEventListener('click', ()=>{
      const t = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
      applyTheme(t);
      updateThemeButton(themeBtn);
      localStorage.setItem('theme', t);
    });
  }

  renderRoute();
}

export function renderRoute(){
  const hash = location.hash || '#/home';
  setActiveNav(hash);

  if (hash.startsWith('#/home')) {
    pageTitle.textContent = 'Home';
    renderHomeFeature();
  } else if (hash.startsWith('#/inventory/')) {
    const slug = decodeURIComponent(hash.split('/')[2] || '');
    const catName = INVENTORY_CATEGORIES.find(c => slugify(c) === slug) || 'Inventory';
    pageTitle.textContent = catName;
    renderCategory(catName);
  } else if (hash.startsWith('#/pallets')) {
    pageTitle.textContent = 'Pallet Monitoring';
    renderPallets();
  } else if (hash.startsWith('#/sds')) {
    pageTitle.textContent = 'SDS Chemicals';
    renderSDS();
  } else if (hash.startsWith('#/suppliers')) {
    pageTitle.textContent = 'Suppliers';
    renderSuppliers();
  } else if (hash.startsWith('#/forms')) {
    pageTitle.textContent = 'Forms';
    renderForms();
  } else if (hash.startsWith('#/po')) {
    pageTitle.textContent = 'Purchase Orders';
    renderPO();
  } else if (hash.startsWith('#/reports')) {
    pageTitle.textContent = 'Reports';
    renderPlaceholder('Reports (coming soon)');
  } else if (hash.startsWith('#/settings')) {
    pageTitle.textContent = 'Settings';
    renderPlaceholder('Settings (coming soon)');
  } else {
    pageTitle.textContent = 'Not found';
    renderPlaceholder('Page not found');
  }
}

// ---------- Theme helpers ----------
function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
}
function updateThemeButton(btn){
  const t = document.documentElement.dataset.theme;
  btn.textContent = t === 'dark' ? 'Light' : 'Dark';
}

function setActiveNav(hash){
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const match = [...document.querySelectorAll('.nav a, .nav button')].find(el => {
    const href = el.getAttribute('href') || '';
    if (href && hash.startsWith(href)) return true;
    if (el.classList.contains('has-children') && hash.startsWith('#/inventory/')) return true;
    return false;
  });
  if (match) match.classList.add('active');
}

// ---------- Pages ----------
function renderHome(){
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

  // render tiles for saved forms on Home
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
      // attach open handlers
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
          if (!(await modalConfirm({title:'Delete Form', message:'Delete this form?'}))) return;
          try{ await deleteDoc(doc(db,'order_forms', id)); loadHomeForms(); }
          catch(e){ alert(e.message || String(e)); }
        });
      });
    } catch (e) {
      err.textContent = 'Failed to load forms: ' + (e.message || String(e));
    }
  }
  loadHomeForms();

  // Modal: create form (category-based) from Home
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
      catsWrap.innerHTML = (INVENTORY_CATEGORIES || []).map(cat => `
        <button class="btn-ghost" data-cat="${esc(cat)}" ${cat===currentCat?'aria-current="true"':''}>${esc(cat)}</button>
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

  // Modal: edit existing form (title + product selection)
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
      catsWrap.innerHTML = (INVENTORY_CATEGORIES || []).map(cat => `
        <button class="btn-ghost" data-cat="${esc(cat)}" ${cat===currentCat?'aria-current="true"':''}>${esc(cat)}</button>
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
        // Pre-select using existing item_ids; resolve codes to ids if needed
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

  // Modal: open a form and post deductions inside Home
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
    // derive categories present in this form
    const present = new Map();
    items.forEach(it => {
      const key = itemCatKey(it);
      const label = knownCats.find(k=>k.key===key)?.label || 'Others';
      present.set(key, label);
    });
    // Always include All
    let currentCat = 'all';

    function paintCats(){
      catsWrap.className = 'segmented';
      const btns = [`<button class="seg ${currentCat==='all'?'active':''}" data-cat="all">All</button>`]
        .concat([...present.entries()].map(([key,label]) => `
          <button class="seg ${currentCat===key?'active':''}" data-cat="${esc(key)}">${esc(label)}</button>`));
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

    // Title field removed; header shows the form title.
    // CSV export removed per request

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
}

function renderPlaceholder(msg){
  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <p>${escapeHtml(msg)}</p>
        <a class="go" href="#/home">← Back to Home</a>
      </div>
    </div>
  `;
}

// =============================================================
// Purchase Orders — create + list + status management
//   Status values: 'pending' | 'backorder' | 'received'
//   Filters: All | Pending | Pending + Backorder | Closed
// =============================================================
function renderPO(){
  const page = $('#page');
  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <div class="card-header">
          <h3>Purchase Orders</h3>
          <div class="spacer"></div>
          <button id="po_new" class="btn">Add PO</button>
        </div>

        <div class="toolbar sticky" style="top:0; gap:8px; align-items:center">
          <div id="po_filters" style="display:flex; gap:8px; flex-wrap:wrap"></div>
          <div class="spacer"></div>
        </div>

        <div class="table-wrap">
          <table class="table-nice" id="po_table">
            <colgroup>
              <col style="width:160px"><!-- PO # -->
              <col style="width:220px"><!-- Supplier -->
              <col><!-- Description -->
              <col style="width:260px"><!-- Backorder Note -->
              <col style="width:180px"><!-- Status -->
              <col style="width:160px"><!-- Created -->
            </colgroup>
            <thead style="position:sticky; top: var(--toolbar-h); background: var(--panel); z-index:1">
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Description</th>
                <th>Backorder Note</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <small id="po_count" class="help"></small>
      </div>
    </div>
  `;

  const tbody = $('#po_table tbody');
  const countEl = $('#po_count');
  const filtersWrap = $('#po_filters');

  const FILTERS = [
    {key:'all', label:'All'},
    {key:'pending', label:'Pending'},
    {key:'pending_back', label:'Pending + Backorder'},
    {key:'closed', label:'Closed'}
  ];
  let currentFilter = 'all';
  function paintFilters(){
    filtersWrap.className = 'segmented';
    filtersWrap.innerHTML = FILTERS.map(f => `
      <button class="seg ${currentFilter===f.key?'active':''}" data-k="${esc(f.key)}">${esc(f.label)}</button>
    `).join('');
    filtersWrap.querySelectorAll('button[data-k]').forEach(b=>{
      b.addEventListener('click', ()=>{ currentFilter = b.dataset.k; paintFilters(); renderRows(); });
    });
  }
  paintFilters();

  $('#po_new').onclick = ()=> openPoCreateModal();

  let rows = [];
  (async ()=>{
    try{
      const snap = await getDocs(query(collection(db,'purchase_orders'), orderBy('created_at','desc')));
      rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      renderRows();
    }catch(e){
      alert('Failed to load POs: ' + (e.message||String(e)));
    }
  })();

  function byFilter(r){
    const s = String(r.status||'pending');
    if (currentFilter==='all') return true;
    if (currentFilter==='pending') return s==='pending';
    if (currentFilter==='pending_back') return s==='pending' || s==='backorder';
    if (currentFilter==='closed') return s==='received';
    return true;
  }

  function statusLabel(s){
    if (s==='backorder') return 'Received with Back Order';
    if (s==='received') return 'All Items Received';
    return 'Pending';
  }

  function applyStatusClass(sel){
    sel.classList.remove('status-pending','status-backorder','status-received');
    const v = sel.value || 'pending';
    if (v==='backorder') sel.classList.add('status-backorder');
    else if (v==='received') sel.classList.add('status-received');
    else sel.classList.add('status-pending');
  }

  function renderRows(){
    const list = rows.filter(byFilter);
    tbody.innerHTML = list.map(r => `
      <tr>
        <td class="mono">${esc(r.po_number||r.id)}</td>
        <td>${esc(r.supplier||'')}</td>
        <td>${esc(r.description||'')}</td>
        <td>${(r.status==='backorder' && (r.backorder_note||'').trim()) ? esc(r.backorder_note) : '<span class="muted">—</span>'}</td>
        <td>
          <select data-id="${esc(r.id)}" data-prev="${esc(r.status||'pending')}" class="select po-status">
            ${option('pending','Pending', r.status)}
            ${option('backorder','Received with Back Order', r.status)}
            ${option('received','All Items Received', r.status)}
          </select>
        </td>
        <td>${esc(fmtDate(r.created_at))}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('select[data-id]').forEach(sel =>{
      applyStatusClass(sel);
      sel.addEventListener('change', async ()=>{
        const id = sel.dataset.id; const next = sel.value; const prev = sel.dataset.prev || 'pending';
        const lbl = statusLabel(next);
        const ok = await modalConfirm({ title:'Change Status', message:`Change status from "${statusLabel(prev)}" to "${lbl}"?` });
        if (!ok){ sel.value = prev; applyStatusClass(sel); return; }
        if (!auth.currentUser){ alert('Login first'); sel.value = prev; applyStatusClass(sel); return; }
        try{
          let payload = {
            status: next,
            updated_at: serverTimestamp(),
            updated_by: auth.currentUser.email
          };
          if (next === 'backorder'){
            const input = await modalPrompt({ title:'Back Order Note', label:'Which items are on back order?', placeholder:'e.g., item codes or description', confirmText:'Save', required:true });
            if (input === null){ sel.value = prev; applyStatusClass(sel); return; }
            const note = String(input).trim();
            if (!note){ sel.value = prev; applyStatusClass(sel); return; }
            payload.backorder_note = note;
          } else {
            payload.backorder_note = null;
          }
          await updateDoc(doc(db,'purchase_orders', id), payload);
          const r = rows.find(x=>x.id===id); if (r){ r.status = next; r.backorder_note = payload.backorder_note; }
          sel.dataset.prev = next;
          applyStatusClass(sel);
          renderRows();
        }catch(e){ alert(e.message||String(e)); sel.value = prev; applyStatusClass(sel); }
      });
    });

    countEl.textContent = `${list.length} purchase orders`;
  }

  function option(val, label, curr){
    const sel = (String(curr||'pending')===val) ? 'selected' : '';
    return `<option value="${esc(val)}" ${sel}>${esc(label)}</option>`;
  }

  function openPoCreateModal(){
    if (!auth.currentUser) return alert('Login first');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:720px">
        <header>
          <strong>Add Purchase Order</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body" style="display:grid; gap:12px">
          <div>
            <label class="muted">PO Number</label>
            <input id="po_num" class="input" placeholder="e.g. PO-12345">
          </div>
          <div>
            <label class="muted">Supplier</label>
            <input id="po_sup" class="input" placeholder="Optional supplier name">
          </div>
          <div>
            <label class="muted">Description</label>
            <input id="po_desc" class="input" placeholder="Optional description or notes">
          </div>
        </div>
        <footer>
          <button class="btn close">Cancel</button>
          <button id="po_save" class="btn primary">Save</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e => { if (e.target===wrap || e.target.classList.contains('close')) close(); });

    wrap.querySelector('#po_save').addEventListener('click', async ()=>{
      const po_number = wrap.querySelector('#po_num').value.trim();
      const supplier = wrap.querySelector('#po_sup').value.trim();
      const description = wrap.querySelector('#po_desc').value.trim();
      if (!po_number) return alert('PO Number is required');
      try{
        await addDoc(collection(db,'purchase_orders'), {
          po_number,
          supplier: supplier || null,
          description: description || null,
          status: 'pending',
          created_at: serverTimestamp(),
          created_by: auth.currentUser.email
        });
        close();
        // reload rows
        const snap = await getDocs(query(collection(db,'purchase_orders'), orderBy('created_at','desc')));
        rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        renderRows();
      }catch(e){ alert(e.message||String(e)); }
    });
  }
}

// =============================================================
// Forms — list + detail + create
// =============================================================
// ====== Forms — list + detail + create (pretty UI) ======
// =============================================================
// Forms — list + single form view with DEDUCT posting
// Route: #/forms  (list)   |   #/forms?form=<id>  (single form)
// =============================================================
function renderForms(){
  // if a form id is present, go to detail view
  const hash = location.hash || '#/forms';
  const formId = new URLSearchParams(hash.split('?')[1] || '').get('form');
  if (formId) return renderFormView(formId);

  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <div class="card-header">
          <h3>Forms</h3>
          <div class="auth-inline">
            <input id="of_email" placeholder="Email" />
            <input id="of_pass" type="password" placeholder="Password" />
            <button id="of_login" class="btn">Login</button>
            <button id="of_logout" class="btn hidden">Logout</button>
            <span id="of_user" class="badge"></span>
          </div>
        </div>

        <div class="toolbar">
          <div class="spacer"></div>
          <button id="of_create" class="btn">Create Form</button>
        </div>

        <div id="of_list_wrap"></div>
      </div>
    </div>
  `;

  const email = $('#of_email'), pass = $('#of_pass'), userBadge = $('#of_user');
  const btnLogin = $('#of_login'), btnLogout = $('#of_logout');

  function setAuthUI(user){
    const loggedIn = !!user;
    btnLogin.classList.toggle('hidden', loggedIn);
    btnLogout.classList.toggle('hidden', !loggedIn);
    userBadge.textContent = loggedIn ? user.email : '';
  }
  onAuthStateChanged(auth, setAuthUI);

  btnLogin.onclick = async () => {
    try { await signInWithEmailAndPassword(auth, (email.value||'').trim(), pass.value); }
    catch (e) { alert(`${e.code || 'auth/error'}: ${e.message}`); }
  };
  btnLogout.onclick = async () => { await signOut(auth); };

  $('#of_create').onclick = ()=> openFormCreateModalV2();

  function openFormCreateModal(){
    if (!auth.currentUser) return alert('Login first');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:720px">
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
            <label class="muted">Product codes (one per line)</label>
            <textarea id="nf_codes" class="input" style="height:200px; font-family:ui-monospace,monospace;" placeholder="3050858\n3050868\n...\n"></textarea>
            <p class="help">Codes must match the product <b>code</b> field or document ID. Lines that don’t match will be marked as “(not found)” in the form.</p>
          </div>
        </div>
        <footer>
          <button class="btn close">Cancel</button>
          <button id="nf_create" class="btn primary">Create</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e => { if (e.target===wrap || e.target.classList.contains('close')) close(); });

    wrap.querySelector('#nf_create').onclick = async ()=>{
      if (!auth.currentUser) return alert('Login first');
      const title = (wrap.querySelector('#nf_title').value || '').trim() || 'Untitled';
      const lines = (wrap.querySelector('#nf_codes').value || '')
        .split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if (!lines.length){ alert('Enter at least one code'); return; }

      // Store provided entries directly. The form view resolves each to a product
      // by attempting doc(id) first, then where(code==...). This keeps creation fast.
      try{
        const docRef = await addDoc(collection(db,'order_forms'), {
          title,
          item_ids: lines,
          created_at: serverTimestamp(),
          created_by: auth.currentUser.email
        });
        close();
        location.hash = `#/forms?form=${docRef.id}`;
      }catch(e){
        console.error(e);
        alert(e.message);
      }
    };
  }

  // New category-based form creator with checkboxes
  function openFormCreateModalV2(){
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
    const selected = new Set(); // product ids

    function inCategory(p, cat){
      if (!cat) return true;
      const cRaw = (p.category == null ? '' : String(p.category));
      const c = cRaw.trim();
      const norm = s => String(s||'').trim().toLowerCase();
      if (cat === 'Others'){
        // Include explicit "Others", missing/blank, or categories not in the known list
        if (!c) return true;
        const inList = (INVENTORY_CATEGORIES || []).map(norm).includes(norm(c));
        return norm(c) === 'others' || !inList;
      }
      return norm(c) === norm(cat);
    }

    function paintCats(){
      catsWrap.innerHTML = (INVENTORY_CATEGORIES || []).map(cat => `
        <button class="btn-ghost" data-cat="${esc(cat)}" ${cat===currentCat?'aria-current="true"':''}>${esc(cat)}</button>
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

      // update select-all state
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
      if (selAll.checked){ list.forEach(p => selected.add(p.id)); }
      else { list.forEach(p => selected.delete(p.id)); }
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
      }catch(e){
        console.error(e);
        alert('Failed to load products: ' + (e.message || String(e)));
      }
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
        location.hash = `#/forms?form=${docRef.id}`;
      }catch(e){
        console.error(e);
        alert(e.message);
      }
    });
  }

  (async function loadList(){
    // very lightweight list: show id, title, created time
    const snap = await getDocs(query(collection(db,'order_forms'), orderBy('created_at','desc'), limit(50)));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('#of_list_wrap').innerHTML = `
      <div class="table-wrap">
        <table class="table-nice" id="of_list">
          <colgroup>
            <col style="width:260px"><col><col style="width:220px"><col style="width:130px">
          </colgroup>
          <thead><tr><th>ID</th><th>Title</th><th>Created</th><th>Open</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="mono">${esc(r.id)}</td>
                <td>${esc(r.title || 'Untitled')}</td>
                <td>${esc(fmtDate(r.created_at))}</td>
                <td class="td-num"><a class="btn" href="#/forms?form=${esc(r.id)}">Open</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  })();
}

async function renderFormView(formId){
  // load form
  const formSnap = await getDoc(doc(db,'order_forms', formId));
  if (!formSnap.exists()){
    page.innerHTML = `
      <div class="grid"><div class="card" style="grid-column:span 12">
        <h3>Form not found</h3>
        <a class="go" href="#/forms">← Back to Forms</a>
      </div></div>`;
    return;
  }
  const form = { id: formId, ...formSnap.data() };
  const codes = Array.isArray(form.item_ids) ? form.item_ids : [];

  // fetch products by *document id* first; fall back to where code==...
  const items = [];
  for (const code of codes){
    let snap = await getDoc(doc(db,'products', code));
    if (snap.exists()){
      items.push({ id: snap.id, ...snap.data() });
      continue;
    }
    // fallback: query by code if id mismatch (rare)
    const qs = await getDocs(query(collection(db,'products'), where('code','==', code), limit(1)));
    if (!qs.empty) items.push({ id: qs.docs[0].id, ...qs.docs[0].data() });
    else items.push({ id: code, code, description:'(not found)', soh:0, _missing:true });
  }

  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <div class="card-header">
          <h3>Saved Forms</h3>
          <div class="auth-inline">
            <input id="fv_email" placeholder="Email" />
            <input id="fv_pass" type="password" placeholder="Password" />
            <button id="fv_login" class="btn">Login</button>
            <button id="fv_logout" class="btn hidden">Logout</button>
            <span id="fv_user" class="badge"></span>
          </div>
        </div>

        <div class="toolbar sticky">
          <input id="fv_title" class="input" value="${esc(form.title||'Untitled')}" placeholder="Form title">
          <div class="spacer"></div>
          <button id="fv_export" class="btn">Export CSV</button>
          <a class="btn" href="#/forms">Back</a>
        </div>

        <div class="table-wrap">
          <table class="table-nice" id="fv_table">
            <colgroup>
              <col style="width:140px"><!-- Code -->
              <col><!-- Description -->
              <col style="width:120px"><!-- SOH -->
              <col style="width:160px"><!-- Deduct -->
              <col style="width:140px"><!-- Result -->
            </colgroup>
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>SOH</th>
                <th>Deduct</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div style="display:flex; gap:12px; align-items:center; margin-top:10px">
          <button id="fv_post" class="btn primary">Post Deductions</button>
          <small id="fv_hint" class="help">You must be logged in to post. Movements will be saved and SOH reduced.</small>
        </div>
      </div>
    </div>
  `;

  // auth UI
  const email = $('#fv_email'), pass = $('#fv_pass'), userBadge = $('#fv_user');
  const btnLogin = $('#fv_login'), btnLogout = $('#fv_logout'), btnPost = $('#fv_post');

  function setAuthUI(user){
    const loggedIn = !!user;
    btnLogin.classList.toggle('hidden', loggedIn);
    btnLogout.classList.toggle('hidden', !loggedIn);
    userBadge.textContent = loggedIn ? user.email : '';
    // show/hide the inputs and post button in a nice way
    document.querySelectorAll('#fv_table input').forEach(inp => inp.disabled = !loggedIn);
    btnPost.disabled = !loggedIn;
  }
  onAuthStateChanged(auth, setAuthUI);

  btnLogin.onclick = async () => {
    try { await signInWithEmailAndPassword(auth, (email.value||'').trim(), pass.value); }
    catch (e) { alert(`${e.code || 'auth/error'}: ${e.message}`); }
  };
  btnLogout.onclick = async () => { await signOut(auth); };

  // render rows
  const tbody = $('#fv_table tbody');
  function paintRows(){
    tbody.innerHTML = items.map(it => {
      const soh = Number(it.soh||0);
      return `
        <tr data-id="${esc(it.id)}">
          <td><span class="mono">${esc(it.code || it.id || '')}</span></td>
          <td>${esc(it.description||'')}</td>
          <td class="td-num"><span class="pill-count">${soh}</span></td>
          <td>
            ${it._missing
              ? '<span class="muted">—</span>'
              : `<input class="input qty-input" type="number" min="0" step="1"
                     data-id="${esc(it.id)}" data-code="${esc(it.code||'')}" placeholder="0">`}
          </td>
          <td class="td-result"><span class="muted">—</span></td>
        </tr>
      `;
    }).join('');
  }
  paintRows();

  // save title on blur
  $('#fv_title').addEventListener('change', async ()=>{
    try { await updateDoc(doc(db,'order_forms', formId), { title: $('#fv_title').value.trim() || 'Untitled' }); }
    catch(e){ console.warn(e); }
  });

  // export
  $('#fv_export').onclick = ()=>{
    const rows = [['code','description','soh']];
    items.forEach(it => rows.push([it.code||it.id||'', it.description||'', Number(it.soh||0)]));
    downloadCsv((form.title||'form') + '.csv', rows);
  };

  // post deductions
  btnPost.onclick = async ()=>{
    if (!auth.currentUser) return alert('Login first');
    const inputs = [...tbody.querySelectorAll('input[data-id]')];
    const changes = inputs.map(inp => ({
      id: inp.dataset.id, code: inp.dataset.code, qty: parseInt(inp.value,10) || 0, el: inp
    })).filter(x => x.qty > 0);

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
          product_id: ch.id,
          product_code: item.code || null,
          qty_delta: -ch.qty,
          note: `deduct (form: ${form.title||formId})`,
          created_by: auth.currentUser.email,
          created_at: serverTimestamp()
        });
        item.soh = curr - ch.qty; // reflect locally
        ch.el.value = '';
        markResult(ch.el, 'OK', false);
        ok++;
      }catch(e){
        console.error(e);
        fail++; msgs.push(`${item.code}: ${e.message}`);
        markResult(ch.el, 'Error', true);
      }
    }

    paintRows(); // refresh SOH pills
    alert(`Deductions complete — success: ${ok}${fail?`, failed: ${fail}\n${msgs.join('\n')}`:''}`);
  };

  function markResult(inputEl, msg, isErr){
    const tr = inputEl.closest('tr');
    const td = tr.querySelector('.td-result');
    td.innerHTML = `<span class="${isErr?'text-danger':'text-success'}">${esc(msg)}</span>`;
  }
}


// =============================================================
// SDS — list + add/edit (public PDF links)
// =============================================================
function renderSDS(){
  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <div class="card-header">
          <h3>SDS Chemicals</h3>
          <div class="auth-inline">
            <input id="sds_email" placeholder="Email" />
            <input id="sds_pass" type="password" placeholder="Password" />
            <button id="sds_login" class="btn">Login</button>
            <button id="sds_logout" class="btn hidden">Logout</button>
            <span id="sds_user" class="badge"></span>
          </div>
        </div>

        <div class="toolbar sticky">
          <input id="sds_search" class="input" placeholder="Search name, location, description">
          <div class="spacer"></div>
          <button id="sds_new" class="btn">New SDS</button>
          <button id="sds_export" class="btn">Export CSV</button>
        </div>

        <div class="table-wrap">
          <table id="sds_table" class="table-nice">
            <colgroup>
              <col style="width:240px"><!-- Chemical -->
              <col style="width:200px"><!-- Location -->
              <col><!-- Description -->
              <col style="width:160px"><!-- SDS -->
              <col style="width:110px"><!-- Actions -->
            </colgroup>
            <thead>
              <tr>
                <th>Chemical</th>
                <th>Location</th>
                <th>Description</th>
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <small id="sds_count" class="help"></small>
      </div>
    </div>
  `;

  const email = $('#sds_email'), pass = $('#sds_pass'), userBadge = $('#sds_user');
  const btnLogin = $('#sds_login'), btnLogout = $('#sds_logout');
  const tBody = $('#sds_table tbody');
  const countLabel = $('#sds_count');

  function setAuthUI(user){
    const loggedIn = !!user;
    btnLogin.classList.toggle('hidden', loggedIn);
    btnLogout.classList.toggle('hidden', !loggedIn);
    userBadge.textContent = loggedIn ? user.email : '';
    $$('.sds-actions').forEach(td => td.style.display = loggedIn ? '' : 'none');
  }
  onAuthStateChanged(auth, setAuthUI);

  btnLogin.onclick = async () => {
    try { await signInWithEmailAndPassword(auth, (email.value||'').trim(), pass.value); }
    catch (e) { alert(`${e.code || 'auth/error'}: ${e.message}`); }
  };
  btnLogout.onclick = async () => { await signOut(auth); };

  $('#sds_new').onclick = () => openSdsModal();
  $('#sds_export').onclick = () => exportSdsCsv(currentRows);

  $('#sds_search').addEventListener('input', ()=> render(rows));

  let rows = [], currentRows = [];
  (async function load(){
    const snap = await getDocs(query(collection(db,'sdsChemicals'), orderBy('name')));
    rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render(rows);
  })();

  function render(list){
    const q = ($('#sds_search').value||'').toLowerCase().trim();
    currentRows = list.filter(r => !q || (
      String(r.name||'').toLowerCase().includes(q) ||
      String(r.location||'').toLowerCase().includes(q) ||
      String(r.description||'').toLowerCase().includes(q)
    ));

    tBody.innerHTML = currentRows.map(r => `
      <tr>
        <td>${esc(r.name||'')}</td>
        <td>${esc(r.location||'')}</td>
        <td>${esc(r.description||'')}</td>
        <td class="td-num">
          ${r.pdf_url ? `<a class="btn" target="_blank" rel="noopener" href="${esc(r.pdf_url)}">Open</a>` : '<span class="muted">—</span>'}
        </td>
        <td class="sds-actions" style="${auth.currentUser ? '' : 'display:none'}">
          <button class="btn-ghost" data-edit="${r.id}">Edit</button>
          <button class="btn-ghost" data-del="${r.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    tBody.querySelectorAll('[data-edit]').forEach(b=>{
      const r = currentRows.find(x => x.id === b.dataset.edit);
      b.onclick = ()=> openSdsModal(r);
    });
    tBody.querySelectorAll('[data-del]').forEach(b=>{
      b.onclick = async ()=>{
        if (!auth.currentUser) return alert('Login first');
        if (!(await modalConfirm({ title:'Delete SDS', message:'Delete this SDS?' }))) return;
        await deleteDoc(doc(db,'sdsChemicals', b.dataset.del));
        rows = rows.filter(x => x.id !== b.dataset.del);
        render(rows);
      };
    });

    countLabel.textContent = `${currentRows.length} chemicals`;
  }

  function openSdsModal(data){
    if (!auth.currentUser){ alert('Login first'); return; }
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:720px">
        <header>
          <strong>${data?'Edit':'New'} SDS</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body" style="display:grid; gap:12px">
          <div>
            <label class="muted">Chemical name</label>
            <input id="s_name" class="input" value="${esc(data?.name||'')}">
          </div>
          <div>
            <label class="muted">Location</label>
            <select id="s_loc" class="select">
              ${SDS_LOCATIONS.map(loc => `<option ${data?.location===loc?'selected':''}>${esc(loc)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="muted">Description</label>
            <input id="s_desc" class="input" value="${esc(data?.description||'')}">
          </div>
          <div>
            <label class="muted">PDF URL (public link)</label>
            <input id="s_url" class="input" value="${esc(data?.pdf_url||'')}" placeholder="https://.../file.pdf">
          </div>
        </div>
        <footer>
          <button class="btn close">Cancel</button>
          <button id="s_save" class="btn primary">Save</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('close')) close(); });

    wrap.querySelector('#s_save').onclick = async ()=>{
      const name = wrap.querySelector('#s_name').value.trim();
      const location = wrap.querySelector('#s_loc').value;
      const description = wrap.querySelector('#s_desc').value.trim();
      const pdf_url = wrap.querySelector('#s_url').value.trim();
      if (!name) return alert('Name is required');

      if (data){
        await updateDoc(doc(db,'sdsChemicals', data.id), { name, location, description, pdf_url });
      } else {
        await addDoc(collection(db,'sdsChemicals'), {
          name, location, description, pdf_url,
          created_at: serverTimestamp(), created_by: auth.currentUser.email
        });
      }
      close();
      renderRoute(); // reload
    };
  }

  function exportSdsCsv(list){
    const rows = [['name','location','description','pdf_url']];
    list.forEach(r => rows.push([r.name||'', r.location||'', r.description||'', r.pdf_url||'']));
    downloadCsv('sds_chemicals.csv', rows);
  }
}

// =============================================================
// Suppliers — list + certs modal + CSV + CRUD
// =============================================================
function renderSuppliers(){
  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <div class="card-header">
          <h3>Suppliers</h3>
          <div class="auth-inline">
            <input id="sup_email" placeholder="Email" />
            <input id="sup_pass" type="password" placeholder="Password" />
            <button id="sup_login" class="btn">Login</button>
            <button id="sup_logout" class="btn hidden">Logout</button>
            <span id="sup_user" class="badge"></span>
          </div>
        </div>

        <div class="toolbar sticky">
          <input id="sup_search" class="input" placeholder="Search name, category, location, contact">
          <div class="spacer"></div>
          <button id="sup_new" class="btn">New Supplier</button>
          <button id="sup_export" class="btn">Export CSV</button>
        </div>

        <div class="table-wrap">
          <table id="sup_table" class="table-nice">
            <colgroup>
              <col style="width:220px"><!-- name -->
              <col style="width:140px"><!-- category -->
              <col style="width:180px"><!-- contact -->
              <col style="width:230px"><!-- email -->
              <col style="width:120px"><!-- phone -->
              <col style="width:150px"><!-- location -->
              <col><!-- certificates -->
              <col style="width:110px"><!-- actions -->
            </colgroup>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Category</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Certificates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <small id="sup_count" class="help"></small>
      </div>
    </div>
  `;

  const email = $('#sup_email'), pass = $('#sup_pass'), badge = $('#sup_user');
  const btnLogin = $('#sup_login'), btnLogout = $('#sup_logout');
  const tbody = $('#sup_table tbody');
  const countLabel = $('#sup_count');

  function setAuthUI(user){
    const loggedIn = !!user;
    btnLogin.classList.toggle('hidden', loggedIn);
    btnLogout.classList.toggle('hidden', !loggedIn);
    badge.textContent = loggedIn ? user.email : '';
    $$('.sup-actions').forEach(td => td.style.display = loggedIn ? '' : 'none');
  }
  onAuthStateChanged(auth, setAuthUI);

  btnLogin.onclick = async ()=> {
    try { await signInWithEmailAndPassword(auth,(email.value||'').trim(),pass.value); }
    catch(e){ alert(`${e.code||'auth/error'}: ${e.message}`); }
  };
  btnLogout.onclick = async ()=> { await signOut(auth); };

  $('#sup_new').onclick = ()=> openSupplierModal();
  $('#sup_export').onclick = ()=> exportSupCsv(currentRows);
  $('#sup_search').addEventListener('input', ()=> render(rows));

  let rows=[], currentRows=[], all=[];
  (async function load(){
    const snap = await getDocs(query(collection(db,'suppliers'), orderBy('name')));
    rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    all = rows.slice();
    render(rows);
  })();

  function render(list){
    const q = ($('#sup_search').value||'').toLowerCase().trim();
    currentRows = list.filter(r => !q || (
      (r.name||'').toLowerCase().includes(q) ||
      (r.category||'').toLowerCase().includes(q) ||
      (r.location||'').toLowerCase().includes(q) ||
      (r.contact_person||'').toLowerCase().includes(q) ||
      (r.contact_email||'').toLowerCase().includes(q)
    ));

    tbody.innerHTML = currentRows.map(r => `
      <tr>
        <td>${esc(r.name||'')}</td>
        <td>${esc(r.category||'')}</td>
        <td>${esc(r.contact_person||'')}</td>
        <td>${esc(r.contact_email||'')}</td>
        <td>${esc(r.contact_phone||'')}</td>
        <td>${esc(r.location||'')}</td>
        <td>${certCellHTML(r.certificates, r.id)}</td>
        <td class="sup-actions" style="${auth.currentUser ? '' : 'display:none'}">
          <button class="btn-ghost" data-edit="${r.id}">Edit</button>
          <button class="btn-ghost" data-del="${r.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach(b=>{
      const item = currentRows.find(x=>x.id===b.dataset.edit);
      b.onclick = ()=> openSupplierModal(item);
    });
    tbody.querySelectorAll('[data-del]').forEach(b=>{
      b.onclick = async ()=>{
        if (!auth.currentUser) return alert('Login first');
        if (!(await modalConfirm({title:'Delete Supplier', message:'Delete this supplier?'}))) return;
        await deleteDoc(doc(db,'suppliers', b.dataset.del));
        rows = rows.filter(x=>x.id!==b.dataset.del);
        render(rows);
      };
    });

    // "+N more" certs modal
    tbody.querySelectorAll('.certs-more').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const supplier = currentRows.find(x => x.id === id) || all.find(x=>x.id===id);
        if (supplier) openCertModal(supplier);
      });
    });

    countLabel.textContent = `${currentRows.length} suppliers`;
  }

  function certCellHTML(certs, id){
    if (!Array.isArray(certs) || certs.length === 0) return '<span class="muted">—</span>';
    const maxInline = 3;
    const inline = certs.slice(0, maxInline).map(c =>
      `<a class="cert-pill" href="${esc(c.url||'#')}" target="_blank" rel="noopener" title="${esc(c.title||'Open')}">${esc(c.title||'Open')}</a>`
    ).join('');
    const more = certs.length > maxInline
      ? `<button class="btn-ghost certs-more" data-id="${id}">+${certs.length - maxInline} more</button>`
      : '';
    return `<div class="certs-inline">${inline}${more ? ' ' + more : ''}</div>`;
  }

  function openCertModal(supplier){
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:720px">
        <header>
          <strong>Certificates — ${esc(supplier.name||'')}</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body certs-scroll">
          ${
            Array.isArray(supplier.certificates) && supplier.certificates.length
            ? supplier.certificates.map(c => `
                <div class="cert-row">
                  <div class="cert-title">${esc(c.title || 'Untitled')}</div>
                  <div><a class="btn" href="${esc(c.url||'#')}" target="_blank" rel="noopener">Open</a></div>
                </div>
              `).join('')
            : '<p class="muted">No certificates.</p>'
          }
        </div>
        <footer>
          <button class="btn close">Close</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', e=>{
      if (e.target === wrap || e.target.classList.contains('close')) wrap.remove();
    });
  }

  function openSupplierModal(data){
    if (!auth.currentUser){ alert('Login first'); return; }
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:820px">
        <header>
          <strong>${data?'Edit':'New'} Supplier</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body" style="display:grid; gap:12px">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div>
              <label class="muted">Supplier Name</label>
              <input id="su_name" class="input" value="${esc(data?.name||'')}">
            </div>
            <div>
              <label class="muted">Category</label>
              <input id="su_category" class="input" value="${esc(data?.category||'')}">
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div>
              <label class="muted">Contact Person</label>
              <input id="su_contact" class="input" value="${esc(data?.contact_person||'')}">
            </div>
            <div>
              <label class="muted">Contact Email</label>
              <input id="su_email" class="input" value="${esc(data?.contact_email||'')}">
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
            <div>
              <label class="muted">Contact Phone</label>
              <input id="su_phone" class="input" value="${esc(data?.contact_phone||'')}">
            </div>
            <div>
              <label class="muted">Location</label>
              <input id="su_location" class="input" value="${esc(data?.location||'')}">
            </div>
          </div>
          <div>
            <label class="muted">Certificates (title | url) — one per line</label>
            <textarea id="su_certs" class="input" style="height:140px;font-family:ui-monospace,monospace;">${esc(formatCertsForTextarea(data?.certificates||[]))}</textarea>
            <p class="help">Example: <code>ISO 22000|https://example.com/cert.pdf</code></p>
          </div>
        </div>
        <footer>
          <button class="btn close">Cancel</button>
          <button id="su_save" class="btn primary">Save</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('close')) close(); });

    wrap.querySelector('#su_save').onclick = async ()=>{
      const payload = {
        name: wrap.querySelector('#su_name').value.trim(),
        category: wrap.querySelector('#su_category').value.trim(),
        contact_person: wrap.querySelector('#su_contact').value.trim(),
        contact_email: wrap.querySelector('#su_email').value.trim(),
        contact_phone: wrap.querySelector('#su_phone').value.trim(),
        location: wrap.querySelector('#su_location').value.trim(),
        certificates: parseCertsFromTextarea(wrap.querySelector('#su_certs').value)
      };
      if (!payload.name) return alert('Supplier Name is required.');

      if (data){
        await updateDoc(doc(db,'suppliers', data.id), payload);
      }else{
        payload.created_at = serverTimestamp();
        payload.created_by = auth.currentUser.email;
        await addDoc(collection(db,'suppliers'), payload);
      }
      close();
      renderRoute();
    };
  }

  function formatCertsForTextarea(certs){
    return certs.map(c => `${c.title||''}|${c.url||''}`).join('\n');
  }
  function parseCertsFromTextarea(v){
    const lines = String(v||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    return lines.map(l=>{
      const m = l.split('|');
      return { title: (m[0]||'').trim(), url:(m[1]||'').trim() };
    }).filter(x=>x.title || x.url);
  }

  function exportSupCsv(list){
    const rows = [['name','category','contact_person','contact_email','contact_phone','location','certificates']];
    list.forEach(r => rows.push([
      r.name||'', r.category||'', r.contact_person||'', r.contact_email||'',
      r.contact_phone||'', r.location||'',
      (Array.isArray(r.certificates)? r.certificates.map(c=>c.title).join('; ') : '')
    ]));
    downloadCsv('suppliers.csv', rows);
  }
}

// =============================================================
// Inventory — category view (stock level + add/deduct/import/new)
//   + Reorder alerts (min_stock / target_stock)
// =============================================================
function renderCategory(cat){
  const state = { items: [], deductMode: false, filter: '', reorderOnly: false };

  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <h3>${escapeHtml(cat)} — Stock Level</h3>

        <div class="toolbar sticky">
          <input id="inv_search" class="input" placeholder="Search code or description">
          <button id="btn_filter_reorder" class="btn">Reorder only</button>
          <div class="spacer"></div>
          <button id="btn_new_item" class="btn">New Item</button>
          <button id="btn_bulk_import" class="btn">Bulk Import</button>
          <button id="btn_add_stock" class="btn primary">Add Stock</button>
          <button id="btn_toggle_deduct" class="btn">Deduct Mode</button>
        </div>

        <div class="table-wrap">
          <table class="table-nice" id="inv_table">
            <colgroup>
              <col style="width:140px"><!-- Code -->
              <col><!-- Description -->
              <col style="width:110px"><!-- SOH -->
              <col style="width:160px"><!-- Deduct -->
              <col style="width:90px"><!-- Actions -->
            </colgroup>
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>SOH</th>
                <th id="th_deduct">Deduct</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div style="margin-top:8px">
          <button id="btn_apply_deductions" class="btn primary hidden">Apply Deductions</button>
          <small id="inv_count" class="help"></small>
        </div>
      </div>
    </div>
  `;

  const $id = (x)=>document.getElementById(x);
  const tbody = $id('inv_table').querySelector('tbody');
  const countLabel = $id('inv_count');

  // events
  $id('inv_search').addEventListener('input', e => {
    state.filter = String(e.target.value || '').toLowerCase().trim();
    renderRows();
  });
  $id('btn_toggle_deduct').addEventListener('click', () => {
    state.deductMode = !state.deductMode;
    $id('btn_toggle_deduct').textContent = state.deductMode ? 'Exit Deduct Mode' : 'Deduct Mode';
    $id('btn_apply_deductions').classList.toggle('hidden', !state.deductMode);
    renderRows();
  });
  $id('btn_filter_reorder').addEventListener('click', ()=>{
    state.reorderOnly = !state.reorderOnly;
    const b = $id('btn_filter_reorder');
    b.textContent = state.reorderOnly ? 'Show all' : 'Reorder only';
    renderRows();
  });

  $id('btn_new_item').addEventListener('click', () => openNewItemModal(cat));
  $id('btn_bulk_import').addEventListener('click', () => openBulkImportModal(cat));
  $id('btn_add_stock').addEventListener('click', () => openAddStockModal(cat, state.items));
  $id('btn_apply_deductions').addEventListener('click', applyDeductions);

  // data load
  (async function load(){
    const snap = await getDocs(query(collection(db,'products'), where('category','==', cat)));
    state.items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    state.items.sort((a,b)=> String(a.code||'').localeCompare(String(b.code||'')));
    renderRows();
  })();

  function renderRows(){
    let rows = state.items;
    if (state.filter){
      rows = rows.filter(r =>
        String(r.code||'').toLowerCase().includes(state.filter) ||
        String(r.description||'').toLowerCase().includes(state.filter)
      );
    }
    if (state.reorderOnly){
      rows = rows.filter(r => {
        const soh = Number(r.soh || 0);
        const min = Number(r.min_stock || 0);
        return (min > 0 && soh < min);
      });
    }

    tbody.innerHTML = rows.map(r => rowHtml(r, state.deductMode)).join('');
    countLabel.textContent = `${rows.length} items`;

    if (state.deductMode){
      const first = tbody.querySelector('input[data-code]');
      if (first) first.focus();
    }

    // Edit thresholds handlers
    tbody.querySelectorAll('button[data-edit]').forEach(btn=>{
      const id = btn.dataset.edit;
      const item = state.items.find(x => x.id === id);
      if (item){
        btn.addEventListener('click', ()=> openThresholdModal(item));
      }
    });
  }

  function rowHtml(r, deductMode){
    const soh = Number(r.soh || 0);
    const min = Number(r.min_stock || 0);
    const low = (min > 0 && soh < min);
    return `
      <tr data-id="${r.id}">
        <td><span class="mono">${esc(r.code||'')}</span></td>
        <td>${esc(r.description||'')}</td>
        <td class="td-num">
          <span class="pill-count ${low?'low':''}" title="${min?`Min: ${min}${r.target_stock?` · Target: ${Number(r.target_stock)}`:''}`:''}">${soh}</span>
          ${low ? `<span class="badge-reorder">Reorder</span>` : ``}
        </td>
        <td>
          ${deductMode
            ? `<input class="input qty-input" type="number" min="0" step="1" data-code="${esc(r.code||'')}" placeholder="0">`
            : `<span class="muted">—</span>`
          }
        </td>
        <td class="td-num">
          ${auth.currentUser ? `<button class="btn-ghost" data-edit="${r.id}">Edit</button>` : `<span class="muted">—</span>`}
        </td>
      </tr>
    `;
  }

  function openThresholdModal(item){
    if (!auth.currentUser){ alert('Login first'); return; }
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:520px">
        <header>
          <strong>Set thresholds — ${esc(item.code||'')}</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body" style="display:grid; gap:12px">
          <div>
            <label class="muted">Min stock</label>
            <input id="th_min" class="input qty-input" type="number" min="0" step="1" value="${Number(item.min_stock||0)}">
          </div>
          <div>
            <label class="muted">Target stock (optional)</label>
            <input id="th_target" class="input qty-input" type="number" min="0" step="1" value="${Number(item.target_stock||0)}">
          </div>
          <p class="help">Rows show a <b>Reorder</b> badge when SOH &lt; Min.</p>
        </div>
        <footer>
          <button class="btn close">Cancel</button>
          <button id="th_save" class="btn primary">Save</button>
        </footer>
      </div>
    `;
    document.body.appendChild(wrap);
    const close = ()=> wrap.remove();
    wrap.addEventListener('click', e=>{ if (e.target===wrap || e.target.classList.contains('close')) close(); });

    wrap.querySelector('#th_save').addEventListener('click', async ()=>{
      const min = Math.max(0, parseInt(wrap.querySelector('#th_min').value,10) || 0);
      const target = Math.max(0, parseInt(wrap.querySelector('#th_target').value,10) || 0);
      try{
        await updateDoc(doc(db,'products', item.id), { min_stock: min, target_stock: target });
        item.min_stock = min;
        item.target_stock = target;
        close();
        renderRows();
      }catch(e){ alert(e.message); }
    });
  }

  async function applyDeductions(){
    if (!auth.currentUser) return alert('Login first');
    const inputs = [...tbody.querySelectorAll('input[data-code]')];
    const changes = inputs
      .map(inp => ({ code: inp.dataset.code, qty: parseInt(inp.value,10) || 0 }))
      .filter(x => x.qty > 0);

    if (changes.length === 0) return alert('Nothing to deduct');

    let ok = 0, fail = 0, msgs = [];
    for (const ch of changes){
      const item = state.items.find(i => String(i.code) === ch.code);
      if (!item){ fail++; msgs.push(`${ch.code}: not found`); continue; }
      const curr = Number(item.soh || 0);
      if (ch.qty > curr){ fail++; msgs.push(`${ch.code}: not enough stock (have ${curr}, need ${ch.qty})`); continue; }

      try{
        const ref = doc(db,'products', item.id);
        await updateDoc(ref, {
          soh: increment(-ch.qty),
          total_out: increment(ch.qty)
        });
        await addDoc(collection(db,'stock_movements'), {
          product_id: item.id,
          product_code: item.code,
          qty_delta: -ch.qty,
          note: 'deduct (bulk form)',
          created_by: auth.currentUser.email,
          created_at: serverTimestamp()
        });
        ok++;
        item.soh = curr - ch.qty; // update local
        item.total_out = (item.total_out||0) + ch.qty;
      }catch(e){
        console.error(e);
        fail++; msgs.push(`${ch.code}: ${e.message}`);
      }
    }

    renderRows();
    inputs.forEach(inp => inp.value = '');
    alert(`Deductions complete — success: ${ok}${fail?`, failed: ${fail}\n${msgs.join('\n')}`:''}`);
  }
}

// ---------- Inventory: Add Stock modal ----------
function openAddStockModal(categoryName, items){
  if (!auth.currentUser){ alert('Login first'); return; }

  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <header>
        <strong>Add Stock — ${escapeHtml(categoryName)}</strong>
        <button class="close" aria-label="Close">×</button>
      </header>
      <div class="body">
        <div>
          <label class="muted">Item</label>
          <select id="add_item" class="select">
            ${items.map(i => `<option value="${esc(i.id)}">${esc(i.code||'')} — ${esc(i.description||'')}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; gap:8px; align-items:center">
          <div style="flex:0 0 140px">
            <label class="muted">Quantity</label>
            <input id="add_qty" type="number" min="1" step="1" class="input qty-input" placeholder="0">
          </div>
          <div style="flex:1">
            <label class="muted">Note</label>
            <input id="add_note" class="input" placeholder="Optional note">
          </div>
        </div>
      </div>
      <footer>
        <button class="btn close">Cancel</button>
        <button id="add_save" class="btn primary">Save</button>
      </footer>
    </div>
  `;
  document.body.appendChild(wrap);

  const close = ()=> { wrap.remove(); };
  wrap.addEventListener('click', (e)=>{ if (e.target === wrap || e.target.classList.contains('close')) close(); });
  wrap.querySelector('#add_qty').addEventListener('keydown', (e)=>{ if (e.key==='Enter') wrap.querySelector('#add_save').click(); });

  wrap.querySelector('#add_save').addEventListener('click', async ()=>{
    const id = wrap.querySelector('#add_item').value;
    const qty = parseInt(wrap.querySelector('#add_qty').value, 10);
    const note = wrap.querySelector('#add_note').value.trim();
    if (!id || !Number.isInteger(qty) || qty <= 0) return alert('Choose an item and enter a positive quantity');

    try{
      const item = items.find(x => x.id === id);
      const ref = doc(db,'products', id);
      await updateDoc(ref, {
        soh: increment(qty),
        total_in: increment(qty)
      });
      await addDoc(collection(db,'stock_movements'), {
        product_id: id,
        product_code: item?.code || null,
        qty_delta: qty,
        note: note || 'add stock',
        created_by: auth.currentUser.email,
        created_at: serverTimestamp()
      });
      alert('Stock added');
      close();
      renderRoute(); // refresh current page
    }catch(e){
      console.error(e);
      alert(e.message);
    }
  });
}

// ---------- Inventory: New Item modal ----------
function openNewItemModal(categoryName){
  if (!auth.currentUser){ alert('Login first'); return; }

  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <header>
        <strong>New Item — ${escapeHtml(categoryName)}</strong>
        <button class="close" aria-label="Close">×</button>
      </header>
      <div class="body">
        <div style="display:grid; gap:12px">
          <div>
            <label class="muted">Product Code</label>
            <input id="ni_code" class="input" placeholder="e.g. 3050858" autocomplete="off">
          </div>
          <div>
            <label class="muted">Description</label>
            <input id="ni_desc" class="input" placeholder="e.g. 175mm Chilled Stackflow Base - Large H/E">
          </div>
          <div style="display:flex; gap:12px">
            <div style="flex:1">
              <label class="muted">Unit</label>
              <select id="ni_unit" class="select">
                <option value="CTN" selected>CTN</option>
                <option value="PCS">PCS</option>
                <option value="ROLL">ROLL</option>
                <option value="PKT">PKT</option>
                <option value="BAG">BAG</option>
              </select>
            </div>
            <div style="flex:1">
              <label class="muted">Price</label>
              <input id="ni_price" class="input qty-input" type="number" min="0" step="0.01" value="0">
            </div>
          </div>
          <div style="display:flex; gap:12px">
            <div style="flex:1">
              <label class="muted">Qty / CTN</label>
              <input id="ni_qctn" class="input qty-input" type="number" min="0" step="1" value="0">
            </div>
            <div style="flex:1">
              <label class="muted">Qty / Pallet</label>
              <input id="ni_qpal" class="input qty-input" type="number" min="0" step="1" value="0">
            </div>
          </div>
          <div>
            <label class="muted">Supplier</label>
            <input id="ni_supplier" class="input" placeholder="e.g. Visy / Orora">
          </div>
          <div style="display:flex; gap:12px">
            <div style="flex:1">
              <label class="muted">Starting SOH</label>
              <input id="ni_soh" type="number" min="0" step="1" class="input qty-input" value="0">
            </div>
          </div>
          <div style="display:flex; gap:12px">
            <div style="flex:1">
              <label class="muted">Min stock</label>
              <input id="ni_min" type="number" min="0" step="1" class="input qty-input" value="0">
            </div>
            <div style="flex:1">
              <label class="muted">Target stock (optional)</label>
              <input id="ni_target" type="number" min="0" step="1" class="input qty-input" value="0">
            </div>
          </div>
        </div>
      </div>
      <footer>
        <button class="btn close">Cancel</button>
        <button id="ni_save" class="btn primary">Create</button>
      </footer>
    </div>
  `;
  document.body.appendChild(wrap);

  const close = ()=> wrap.remove();
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('close')) close(); });

  const codeEl = wrap.querySelector('#ni_code');
  codeEl.focus();
  codeEl.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().trimStart(); });

  wrap.querySelector('#ni_save').addEventListener('click', async ()=>{
    const code = codeEl.value.trim().toUpperCase();
    const description = wrap.querySelector('#ni_desc').value.trim();
    const unit = wrap.querySelector('#ni_unit').value;
    const price = parseFloat(wrap.querySelector('#ni_price').value) || 0;
    const qty_per_ctn = parseInt(wrap.querySelector('#ni_qctn').value, 10) || 0;
    const qty_per_pallet = parseInt(wrap.querySelector('#ni_qpal').value, 10) || 0;
    const supplier = wrap.querySelector('#ni_supplier').value.trim();
    const soh = parseInt(wrap.querySelector('#ni_soh').value, 10) || 0;
    const min_stock = parseInt(wrap.querySelector('#ni_min').value, 10) || 0;
    const target_stock = parseInt(wrap.querySelector('#ni_target').value, 10) || 0;

    if (!auth.currentUser) return alert('Login first');
    if (!code || !description) return alert('Code and Description are required');
    if (soh < 0) return alert('Starting SOH cannot be negative');

    const id = code.replace(/[^A-Z0-9_-]+/g, '-');
    try{
      const ref = doc(db,'products', id);
      const exists = await getDoc(ref);
      if (exists.exists()) return alert('An item with this code already exists.');

      await setDoc(ref, {
        code, description, unit, price, qty_per_ctn, qty_per_pallet,
        supplier, category: categoryName,
        soh, total_in: soh, total_out: 0,
        min_stock, target_stock,
        created_by: auth.currentUser.email, created_at: serverTimestamp()
      });

      if (soh > 0){
        await addDoc(collection(db,'stock_movements'), {
          product_id: id, product_code: code, qty_delta: soh,
          note: 'initial stock', created_by: auth.currentUser.email, created_at: serverTimestamp()
        });
      }

      alert('Item created');
      close();
      renderRoute();
    }catch(e){
      console.error(e);
      alert(e.message);
    }
  });
}

// ---------- Inventory: Bulk Import (paste CODE<TAB>DESC) ----------
function openBulkImportModal(categoryName){
  if (!auth.currentUser){ alert('Login first'); return; }

  const isShrink = categoryName === 'Shrink Bags';

  const presetShrink = `
ANG-400X750	400X750 PLATINUM ANGUS AI2306 SWANHILL
ANG-400X600	400X600 PLATINUM ANGUS AI2306 SWANHILL
ANG-400X500	400X500 PLATINUM ANGUS AI2306 SWANHILL
ANG-350X750	350X750 PLATINUM ANGUS AI2306 SWANHILL
ANG-350X600	350X600 PLATINUM ANGUS AI2306 SWANHILL
ANG-300X810	300X810 PLATINUM ANGUS AI2306 SWANHILL
ANG-250X550	250X550 PLATINUM ANGUS AI2306 SWANHILL
ANG-200X750	200X750 PLATINUM ANGUS AI2306 SWANHILL
PTD-400X750	400X750 WOODWARD AI2306 SWANHILL
PTD-400X600	400X600 WOODWARD AI2306 SWANHILL
PTD-400X500	400X500 WOODWARD AI2306 SWANHILL
PTD-350X750	350X750 WOODWARD AI2306 SWANHILL
PTD-350X600	350X600 WOODWARD AI2306 SWANHILL
PTD-300X810	300X810 WOODWARD AI2306 SWANHILL
PTD-300X700	300X700 WOODWARD AI2306 SWANHILL
PTD-300X500	300X500 WOODWARD AI2306 SWANHILL
PTD-250X550	250X550 WOODWARD AI2306 SWANHILL
PTD-250X450	250X450 WOODWARD AI2306 SWANHILL
PTD-200X700	200X700 WOODWARD AI2306 SWANHILL
PTD-225X335	225X335 WOODWARD AI2306 SWANHILL
ILP-300X700	300X700 AI2306 SWAN HILL ILP
ILP-300X450	300X450 AI2306 SWAN HILL ILP
ILP-250X550	250X550 AI2306 SWAN HILL ILP
ILP-225X335	225X335 AI2306 SWAN HILL ILP
MSA-400X750	400X750 FINEST SHRINK BAG
MSA-400X600	400X600 FINEST SHRINK BAG
MSA-400X500	400X500 FINEST SHRINK BAG
MSA-350-750	750 FINEST SHRINK BAG
MSA-350-600	600 FINEST SHRINK BAG
MSA-300X810	300X810 FINEST SHRINK BAG
MSA-250X550	250X550 FINEST SHRINK BAG
MSA-200X750	200X750 FINEST SHRINK BAG
NAT-400X750	400X750 NATURAL SHRINK BAG
NAT-400X600	400X600 NATURAL SHRINK BAG
NAT-400X500	400X500 NATURAL SHRINK BAG
NAT-350X750	300X750 NATURAL SHRINK BAG
NAT-350X600	300X600 NATURAL SHRINK BAG
NAT-300X810	300X810 NATURAL SHRINK BAG
NAT-250X550	250X550 NATURAL SHRINK BAG
NAT-200X750	200X750 NATURAL SHRINK BAG
  `.trim();

  const presetCartons = `
3050858	175mm Chilled Stackflow Base - Large H/E
3050868	120mm Chilled Stackflow Base - Small H/E
3159929	60LB Frozen Base H/E
3159931	60LB Frozen Full Depth Lid
2748071	GENERIC - HRW White Cap Lid
L060083	Red Australian Lamb
46857	Gold Finest Beef
L243130	Green Natural Lid
VP146382	Platinum Angus Lid
3050871	Export Coffin - Frozen OSC Carton (220mm Deep )
3050873	30LB FROZEN OFFAL OSC Carton
3050877	60LB Trim & Runners Frozen OSC Carton
  `.trim();

  const preset = isShrink ? presetShrink : (categoryName === 'Cartons & Lids' ? presetCartons : '');

  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <header>
        <strong>Bulk Import — ${escapeHtml(categoryName)}</strong>
        <button class="close" aria-label="Close">×</button>
      </header>
      <div class="body">
        <p class="help">Paste rows as <b>CODE TAB DESCRIPTION</b>. One row per line.</p>
        <textarea id="bi_text" class="input" style="height:220px; font-family:ui-monospace,monospace;"></textarea>
        <div style="display:flex; gap:10px; margin-top:6px">
          <label><input type="checkbox" id="bi_upper" checked> Uppercase codes</label>
          <label><input type="checkbox" id="bi_unit_default" checked> Default unit = ${isShrink ? 'BAG' : 'CTN'}</label>
        </div>
      </div>
      <footer>
        <button class="btn close">Cancel</button>
        <button id="bi_parse" class="btn">Preview</button>
        <button id="bi_save" class="btn primary">Create Items</button>
      </footer>
    </div>
  `;
  document.body.appendChild(wrap);
  const close = ()=> wrap.remove();
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('close')) close(); });

  const ta = wrap.querySelector('#bi_text');
  ta.value = preset;

  function parseLines(){
    const upper = wrap.querySelector('#bi_upper').checked;
    const lines = ta.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows = [];
    for (const l of lines){
      const m = l.match(/^(\S+)\s+(.+)$/);
      if (!m) continue;
      let code = m[1];
      const description = m[2];
      if (upper) code = code.toUpperCase();
      rows.push({ code, description });
    }
    return rows;
  }

  wrap.querySelector('#bi_parse').addEventListener('click', ()=>{
    const rows = parseLines();
    alert(rows.length ? rows.map(r => `${r.code} — ${r.description}`).join('\n') : 'No rows parsed.');
  });

  wrap.querySelector('#bi_save').addEventListener('click', async ()=>{
    if (!auth.currentUser) return alert('Login first');
    const rows = parseLines();
    if (!rows.length) return alert('Nothing to import');

    const defaultUnit = wrap.querySelector('#bi_unit_default').checked ? (isShrink ? 'BAG' : 'CTN') : 'PCS';

    let ok=0, skip=0, fail=0, msgs=[];
    for (const r of rows){
      const id = r.code.replace(/[^A-Z0-9_-]+/g, '-');
      try{
        const ref = doc(db,'products', id);
        const exists = await getDoc(ref);
        if (exists.exists()){ skip++; continue; }
        await setDoc(ref, {
          code: r.code,
          description: r.description,
          unit: defaultUnit,
          price: 0,
          qty_per_ctn: 0,
          qty_per_pallet: 0,
          supplier: '',
          category: categoryName,
          soh: 0, total_in: 0, total_out: 0,
          min_stock: 0, target_stock: 0,
          created_by: auth.currentUser.email, created_at: serverTimestamp()
        });
        ok++;
      }catch(e){
        console.error(e); fail++; msgs.push(`${r.code}: ${e.message}`);
      }
    }
    alert(`Import done: created ${ok}, skipped ${skip}, failed ${fail}${fail?`\n${msgs.join('\n')}`:''}`);
    close();
    renderRoute();
  });
}

// =============================================================
// Pallet Monitoring — centered columns + CSV export
// =============================================================
function renderPallets(){
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  page.innerHTML = `
    <div class="grid">
      <div class="card" style="grid-column:span 12">
        <div class="card-header">
          <h3>Unload Entry</h3>
          <div class="auth-inline">
            <input id="pm_email" placeholder="Email" />
            <input id="pm_pass" type="password" placeholder="Password" />
            <button id="pm_btn_login" class="btn">Login</button>
            <button id="pm_btn_logout" class="btn hidden">Logout</button>
            <span id="pm_user" class="badge"></span>
          </div>
        </div>

        <div class="form-grid">
          <div class="field field--date">
            <label for="pm_date">Date</label>
            <input id="pm_date" type="date" value="${todayStr}">
          </div>
          <div class="field field--container">
            <label for="pm_container">Container No.</label>
            <input id="pm_container" placeholder="e.g. MSKU1234567">
          </div>
          <div class="field field--count">
            <label for="pm_count">Pallets Count</label>
            <input id="pm_count" type="number" min="0" placeholder="0">
          </div>
          <div class="field field--wide">
            <label for="pm_note">Note</label>
            <input id="pm_note" placeholder="Optional note">
          </div>
          <div class="actions">
            <button id="pm_add" class="btn primary">Save</button>
            <button id="pm_clear" class="btn">Clear</button>
            <button id="pm_export" class="btn">Export CSV</button>
            <span class="help">Writes require login (reads are open).</span>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column:span 12">
        <h3>Recent Unloads</h3>
        <div class="table-wrap">
          <table id="pm_table" class="table-nice table-center">
            <colgroup>
              <col style="width:140px"><!-- Date -->
              <col style="width:180px"><!-- Container No. -->
              <col style="width:110px"><!-- Pallets -->
              <col><!-- Note -->
              <col style="width:110px"><!-- Actions -->
            </colgroup>
            <thead>
              <tr>
                <th>Date</th>
                <th>Container No.</th>
                <th>Pallets</th>
                <th>Note</th>
                <th class="col-actions pm-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <small id="pm_count_label" class="help"></small>
      </div>
    </div>
  `;

  const email = $('#pm_email'), pass = $('#pm_pass'), userBadge = $('#pm_user');
  const btnLogin = $('#pm_btn_login'), btnLogout = $('#pm_btn_logout');
  const tBody = $('#pm_table tbody');
  const countLabel = $('#pm_count_label');

  function setAuthUI(user){
    const loggedIn = !!user;
    btnLogin.classList.toggle('hidden', loggedIn);
    btnLogout.classList.toggle('hidden', !loggedIn);
    userBadge.textContent = loggedIn ? user.email : '';
    document.querySelectorAll('.pm-col-actions').forEach(th => th.style.display = loggedIn ? '' : 'none');
    document.querySelectorAll('.pm-actions').forEach(td => td.style.display = loggedIn ? '' : 'none');
  }
  onAuthStateChanged(auth, setAuthUI);

  btnLogin.onclick = async () => {
    try {
      await signInWithEmailAndPassword(auth, (email.value||'').trim(), pass.value);
      alert('Logged in');
    } catch (e) {
      console.error(e);
      alert(`${e.code || 'auth/error'}: ${e.message}`);
    }
  };
  btnLogout.onclick = async () => { await signOut(auth); alert('Logged out'); };

  $('#pm_export').onclick = ()=> exportPalletsCsv(cacheRows);

  $('#pm_container').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase().trimStart();
  });
  ['pm_date','pm_container','pm_count','pm_note'].forEach(id=>{
    $('#'+id).addEventListener('keydown', e => { if (e.key === 'Enter') $('#pm_add').click(); });
  });

  $('#pm_add').onclick = async ()=>{
    if (!auth.currentUser){ alert('Login first'); return; }
    const d = $('#pm_date').value;
    const container = $('#pm_container').value.trim();
    const pallets = parseInt($('#pm_count').value, 10);
    const note = $('#pm_note').value.trim();
    if (!d || !container || !Number.isInteger(pallets) || pallets < 0){
      alert('Please fill DATE, CONTAINER NO., and non-negative integer PALLETS COUNT.');
      return;
    }
    const ts = Timestamp.fromDate(new Date(d + 'T00:00:00'));
    try{
      await addDoc(collection(db, 'pallet_unloads'), {
        date: ts,
        container_no: container,
        pallets_count: pallets,
        note: note || null,
        created_by: auth.currentUser.email,
        created_at: serverTimestamp()
      });
      ['pm_count','pm_note'].forEach(id => $('#'+id).value = '');
      await loadRows();
      $('#pm_container').focus();
    }catch(e){ alert(e.message); }
  };

  $('#pm_clear').onclick = ()=>{ ['pm_container','pm_count','pm_note'].forEach(id => $('#'+id).value=''); };

  let cacheRows = [];

  async function loadRows(){
    const q1 = query(collection(db, 'pallet_unloads'), orderBy('date','desc'), limit(200));
    const snap = await getDocs(q1);
    const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    cacheRows = rows;

    tBody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td><time datetime="${fmtDate(r.date)}">${fmtDate(r.date)}</time></td>
        <td><span class="mono">${esc(r.container_no)}</span></td>
        <td class="td-num"><span class="pill-count">${Number(r.pallets_count||0)}</span></td>
        <td class="note-td" title="${esc(r.note||'')}">${esc(r.note || '—')}</td>
        <td class="pm-actions" style="${auth.currentUser ? '' : 'display:none'}">
          <button data-id="${r.id}" class="btn-ghost">Delete</button>
        </td>
      </tr>
    `).join('');

    tBody.querySelectorAll('button[data-id]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if (!auth.currentUser) return alert('Login first');
        if (!(await modalConfirm({title:'Delete Entry', message:'Delete this entry?'}))) return;
        try{ await deleteDoc(doc(db, 'pallet_unloads', btn.dataset.id)); await loadRows(); }
        catch(e){ alert(e.message); }
      });
    });

    countLabel.textContent = `${rows.length} rows`;
  }

  loadRows();

  function exportPalletsCsv(list){
    const rows = [['date','container_no','pallets','note','created_by']];
    list.forEach(r=>{
      rows.push([fmtDate(r.date), r.container_no||'', Number(r.pallets_count||0), r.note||'', r.created_by||'']);
    });
    downloadCsv('pallet_unloads.csv', rows);
  }
}

// =============================================================
// Helpers
// =============================================================
// moved to core/utils.js


