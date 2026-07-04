import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface BatchReference {
  id: number
  product_code: string
  product_name: string
  category: string | null
  batch_references: string[]
  supplier_id: string | null
  supplier_name: string | null
}

interface Supplier {
  id: string
  name: string
}

const CATEGORIES = [
  { slug: 'shrink-bag', label: 'Shrink Bag' },
  { slug: 'carton', label: 'Carton' },
  { slug: 'liners', label: 'Liners' },
  { slug: 'soakerpad', label: 'Soakerpad' },
  { slug: 'poly-label', label: 'Poly Label' },
]

function EditModal({
  row,
  suppliers,
  onClose,
  onSaved,
}: {
  row: Partial<BatchReference> | null
  suppliers: Supplier[]
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !row?.id
  const [productCode, setProductCode] = useState(row?.product_code ?? '')
  const [productName, setProductName] = useState(row?.product_name ?? '')
  const [category, setCategory] = useState(row?.category ?? '')
  const [supplierId, setSupplierId] = useState(row?.supplier_id ?? '')
  const [refsText, setRefsText] = useState((row?.batch_references ?? []).join('\n'))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!productCode.trim() || !productName.trim()) {
      toast.error('Product code and name are required')
      return
    }
    if (!supplierId) {
      toast.error('Please select a supplier')
      return
    }
    const refs = refsText.split('\n').map(s => s.trim()).filter(Boolean)
    const selectedSupplier = suppliers.find(s => s.id === supplierId)

    setSaving(true)
    try {
      const payload = {
        product_code: productCode.trim(),
        product_name: productName.trim(),
        category: category || null,
        supplier_id: supplierId,
        supplier_name: selectedSupplier?.name ?? null,
        batch_references: refs,
      }
      if (isNew) {
        const { error } = await supabase.from('batch_references').insert(payload as any)
        if (error) throw error
      } else {
        const { error } = await supabase.from('batch_references').update(payload as any).eq('id', row!.id!)
        if (error) throw error
      }
      toast.success(isNew ? 'Reference added' : 'Reference updated')
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-xl p-6 space-y-4" style={{ backgroundColor: '#0d1625', border: '1px solid #1e3a5a' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{isNew ? 'Add Batch Reference' : 'Edit Batch Reference'}</h2>
          <button onClick={onClose} className="text-blue-300/50 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#4a7a9a' }}>Product Code</label>
              <input
                value={productCode}
                onChange={e => setProductCode(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#0a1520', border: '1px solid #1e3a5a' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#4a7a9a' }}>Product Name</label>
              <input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#0a1520', border: '1px solid #1e3a5a' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#4a7a9a' }}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#0a1520', border: '1px solid #1e3a5a' }}
              >
                <option value="">— None —</option>
                {CATEGORIES.map(c => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#4a7a9a' }}>
                Supplier <span className="text-red-400">*</span>
              </label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#0a1520', border: `1px solid ${!supplierId ? '#5a2a2a' : '#1e3a5a'}` }}
              >
                <option value="">— Select supplier —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#4a7a9a' }}>
              Batch References <span className="opacity-50">(one per line)</span>
            </label>
            <textarea
              value={refsText}
              onChange={e => setRefsText(e.target.value)}
              rows={6}
              className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white outline-none resize-none"
              style={{ backgroundColor: '#0a1520', border: '1px solid #1e3a5a' }}
              placeholder={'ABC123\nDEF456\nGHI789'}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ color: '#4a7a9a', border: '1px solid #1e3a5a' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#1a4a7a' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isNew ? 'Add' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GroupedTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: BatchReference[]
  onEdit: (r: BatchReference) => void
  onDelete: (r: BatchReference) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (slug: string) => setExpanded(p => ({ ...p, [slug]: !p[slug] }))

  const renderRows = (catRows: BatchReference[]) => (
    <table className="w-full text-sm">
      <thead>
        <tr style={{ borderBottom: '1px solid #1e3a5a' }}>
          <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#3a6a8a' }}>Code</th>
          <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#3a6a8a' }}>Product Name</th>
          <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#3a6a8a' }}>Supplier</th>
          <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: '#3a6a8a' }}>Batch References</th>
          <th className="px-4 py-2 w-20" />
        </tr>
      </thead>
      <tbody>
        {catRows.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-4 text-xs text-center" style={{ color: '#2a4a6a' }}>No entries</td>
          </tr>
        ) : catRows.map(row => (
          <tr key={row.id} style={{ borderTop: '1px solid #0f2035' }}>
            <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#6ab0d4' }}>{row.product_code}</td>
            <td className="px-4 py-2.5 text-white">{row.product_name}</td>
            <td className="px-4 py-2.5 text-xs" style={{ color: '#4a8aaa' }}>
              {row.supplier_name ?? <span style={{ color: '#2a4a6a' }}>—</span>}
            </td>
            <td className="px-4 py-2.5">
              <div className="flex flex-wrap gap-1">
                {row.batch_references.slice(0, 4).map(ref => (
                  <span key={ref} className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: '#0a1a2a', color: '#4a9fd4' }}>
                    {ref}
                  </span>
                ))}
                {row.batch_references.length > 4 && (
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{ color: '#2a5a7a' }}>
                    +{row.batch_references.length - 4} more
                  </span>
                )}
                {row.batch_references.length === 0 && (
                  <span style={{ color: '#2a4a6a', fontSize: '0.75rem' }}>No references yet</span>
                )}
              </div>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#4a7aaa' }}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onDelete(row)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: '#7a3a3a' }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="space-y-3">
      {CATEGORIES.map(cat => {
        const catRows = rows.filter(r => r.category === cat.slug)
        const isOpen = expanded[cat.slug] ?? true
        return (
          <div key={cat.slug} className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5a' }}>
            <button
              onClick={() => toggle(cat.slug)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: '#0d1e30' }}
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                {cat.label}
              </div>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1a3a5a', color: '#6ab0d4' }}>
                {catRows.length}
              </span>
            </button>
            {isOpen && renderRows(catRows)}
          </div>
        )
      })}

      {/* Uncategorised */}
      {(() => {
        const uncategorised = rows.filter(r => !r.category)
        if (uncategorised.length === 0) return null
        const isOpen = expanded['__none__'] ?? true
        return (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5a' }}>
            <button
              onClick={() => toggle('__none__')}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: '#0d1e30', color: '#4a6a7a' }}
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                Uncategorised
              </div>
              <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1a3a5a', color: '#6ab0d4' }}>
                {uncategorised.length}
              </span>
            </button>
            {isOpen && renderRows(uncategorised)}
          </div>
        )
      })()}
    </div>
  )
}

export function BellAdminPage() {
  const [rows, setRows] = useState<BatchReference[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [editRow, setEditRow] = useState<Partial<BatchReference> | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: refs }, { data: sups }] = await Promise.all([
      supabase.from('batch_references').select('*').order('product_code') as any,
      supabase.from('suppliers').select('id, name').order('name') as any,
    ])
    setRows(refs ?? [])
    setSuppliers(sups ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleDelete = async (row: BatchReference) => {
    if (!confirm(`Delete "${row.product_name}" (${row.supplier_name ?? 'no supplier'})?`)) return
    const { error } = await supabase.from('batch_references').delete().eq('id', row.id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted')
    fetchAll()
  }

  return (
    <div className="p-6 space-y-5" style={{ color: 'white' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batch References</h1>
          <p className="text-sm mt-0.5" style={{ color: '#3a6a8a' }}>Manage valid batch reference codes per product and supplier</p>
        </div>
        <button
          onClick={() => { setEditRow({}); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ backgroundColor: '#1a4a7a' }}
        >
          <Plus className="h-4 w-4" />
          Add Reference
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#2a6a9a' }} />
        </div>
      ) : (
        <GroupedTable
          rows={rows}
          onEdit={r => { setEditRow(r); setShowModal(true) }}
          onDelete={handleDelete}
        />
      )}

      {showModal && (
        <EditModal
          row={editRow}
          suppliers={suppliers}
          onClose={() => setShowModal(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  )
}
