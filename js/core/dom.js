// js/core/dom.js
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Simple modal helpers using existing .modal-backdrop/.modal-card styles
export function modalConfirm({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel' } = {}){
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:520px">
        <header>
          <strong>${title}</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body">
          <p>${message}</p>
        </div>
        <footer>
          <button class="btn close">${cancelText}</button>
          <button class="btn primary" id="mc_ok">${confirmText}</button>
        </footer>
      </div>`;
    document.body.appendChild(wrap);
    const close = (val)=>{ wrap.remove(); resolve(val); };
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('close')) close(false); });
    wrap.querySelector('#mc_ok').addEventListener('click', ()=> close(true));
  });
}

export function modalPrompt({ title = 'Input', label = 'Value', placeholder = '', confirmText = 'Save', cancelText = 'Cancel', required = false } = {}){
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:560px">
        <header>
          <strong>${title}</strong>
          <button class="close" aria-label="Close">×</button>
        </header>
        <div class="body" style="display:grid; gap:8px">
          <label class="muted">${label}</label>
          <input id="mp_val" class="input" placeholder="${placeholder}">
        </div>
        <footer>
          <button class="btn close">${cancelText}</button>
          <button class="btn primary" id="mp_ok">${confirmText}</button>
        </footer>
      </div>`;
    document.body.appendChild(wrap);
    const input = wrap.querySelector('#mp_val');
    const close = (val)=>{ wrap.remove(); resolve(val); };
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.classList.contains('close')) close(null); });
    wrap.querySelector('#mp_ok').addEventListener('click', ()=>{
      const v = String(input.value||'').trim();
      if (required && !v){ input.focus(); return; }
      close(v);
    });
    input.addEventListener('keydown', e => { if (e.key==='Enter') wrap.querySelector('#mp_ok').click(); });
    setTimeout(()=> input.focus(), 0);
  });
}
