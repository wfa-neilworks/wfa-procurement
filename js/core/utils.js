// js/core/utils.js

export function escapeHtml(x){
  return String(x ?? '').replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
}
export const esc = escapeHtml;

export function slugify(s){ return String(s).toLowerCase().replace(/\s+/g,'-'); }

export function fmtDate(x){
  if (!x) return '';
  try{
    const d = x.toDate ? x.toDate() : new Date(x);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }catch{ return '' }
}

export function downloadCsv(filename, rows){
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

