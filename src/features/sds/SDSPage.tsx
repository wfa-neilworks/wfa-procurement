import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, FileText, ExternalLink, Upload, X, Eye, FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import type { Database } from '../../types/database'

type SDSChemical = Database['public']['Tables']['sds_chemicals']['Row']

// ─── Shared input style (consistent with InventoryPage) ───────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white',
  'placeholder:text-slate-400 text-slate-800',
  'focus:outline-none focus:ring-2 focus:ring-[#2d9da8]/30 focus:border-[#2d9da8]',
  'transition-all disabled:opacity-50',
].join(' ')

const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

// ─── Category badge config ─────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  'Clean / Sanitation':      { bg: '#eff6ff', color: '#1d4ed8' },
  'Water Treatment':         { bg: '#f0fdfa', color: '#0f766e' },
  'Equipment / Machinery':   { bg: '#f1f5f9', color: '#475569' },
  'Pest Control':            { bg: '#fffbeb', color: '#92400e' },
  'Refrigeration / Cooling': { bg: '#f0f9ff', color: '#0369a1' },
  'Boiler / Steam Treatment':{ bg: '#fdf4ff', color: '#7e22ce' },
  'Laboratory':              { bg: '#fef9c3', color: '#854d0e' },
  'Meat Branding Ink':       { bg: '#fdf2f8', color: '#86198f' },
  'Other / General':         { bg: '#f8fafc', color: '#64748b' },
}

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES['Other / General']
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {category}
    </span>
  )
}

// ─── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({
  icon: Icon, label, color, hoverBg, onClick,
}: {
  icon: React.ElementType; label: string; color: string; hoverBg: string; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
      style={{ backgroundColor: hovered ? hoverBg : 'transparent' }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color }} />
    </button>
  )
}

export function SDSPage() {
  const { profile } = useAuth()
  const [chemicals, setChemicals] = useState<SDSChemical[]>([])
  const [filteredChemicals, setFilteredChemicals] = useState<SDSChemical[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingChemical, setEditingChemical] = useState<SDSChemical | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingChemical, setDeletingChemical] = useState<SDSChemical | null>(null)

  const [formData, setFormData] = useState({
    name: '', location: '', pdf_url: '',
    valid_since: '', valid_until: '', category: 'Other / General',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => { fetchChemicals() }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredChemicals(chemicals)
    } else {
      const q = searchTerm.toLowerCase()
      setFilteredChemicals(chemicals.filter(c =>
        c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
      ))
    }
  }, [searchTerm, chemicals])

  const fetchChemicals = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('sds_chemicals').select('*').order('name', { ascending: true })
      if (error) throw error
      setChemicals(data || [])
    } catch {
      toast.error('Failed to load SDS chemicals')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (chemical?: SDSChemical) => {
    if (chemical) {
      setEditingChemical(chemical)
      setFormData({
        name: chemical.name,
        location: chemical.location,
        pdf_url: chemical.pdf_url || '',
        valid_since: chemical.valid_since || '',
        valid_until: chemical.valid_until || '',
        category: (chemical as any).category || 'Other / General',
      })
    } else {
      setEditingChemical(null)
      setFormData({ name: '', location: '', pdf_url: '', valid_since: '', valid_until: '', category: 'Other / General' })
    }
    setSelectedFile(null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingChemical(null)
    setSelectedFile(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return }
      setSelectedFile(file)
    }
  }

  const uploadPDF = async (chemicalId: string) => {
    if (!selectedFile) return null
    setUploadingFile(true)
    try {
      const fileName = `sds/${chemicalId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('certificates').upload(fileName, selectedFile)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName)
      toast.success('SDS document uploaded successfully')
      return publicUrl
    } catch {
      toast.error('Failed to upload SDS document')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.location) { toast.error('Please fill in all required fields'); return }
    try {
      let pdfUrl = formData.pdf_url
      if (editingChemical) {
        if (selectedFile) { const u = await uploadPDF(editingChemical.id); if (u) pdfUrl = u }
        const { error } = await supabase.from('sds_chemicals').update({
          name: formData.name, location: formData.location, pdf_url: pdfUrl || null,
          valid_since: formData.valid_since || null, valid_until: formData.valid_until || null,
          category: formData.category,
        } as any).eq('id', editingChemical.id)
        if (error) throw error
        toast.success(`Updated "${formData.name}"`)
      } else {
        const { data, error } = await supabase.from('sds_chemicals').insert({
          name: formData.name, location: formData.location,
          valid_since: formData.valid_since || null, valid_until: formData.valid_until || null,
          category: formData.category,
        } as any).select().single()
        if (error) throw error
        if (selectedFile) {
          const u = await uploadPDF(data.id)
          if (u) {
            const { error: ue } = await supabase.from('sds_chemicals').update({ pdf_url: u }).eq('id', data.id)
            if (ue) throw ue
          }
        }
        toast.success(`Added "${formData.name}"`)
      }
      handleCloseDialog()
      fetchChemicals()
    } catch {
      toast.error('Failed to save chemical')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingChemical) return
    try {
      const { error } = await supabase.from('sds_chemicals').delete().eq('id', deletingChemical.id)
      if (error) throw error
      toast.success(`Deleted "${deletingChemical.name}"`)
      setIsDeleteDialogOpen(false)
      setDeletingChemical(null)
      fetchChemicals()
    } catch {
      toast.error('Failed to delete chemical')
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const img = new Image()
    img.src = '/APPLOGO.png'
    img.onload = () => {
      const logoW = 60
      const logoH = (img.naturalHeight / img.naturalWidth) * logoW
      doc.addImage(img, 'PNG', (pageWidth - logoW) / 2, 12, logoW, logoH)
      let y = 14 + logoH
      doc.setFontSize(26); doc.setFont('helvetica', 'bold')
      doc.text('Chemical Register', pageWidth / 2, y + 10, { align: 'center' })
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text('Woodward Foods Australia', pageWidth / 2, y + 18, { align: 'center' })
      doc.setFontSize(10); doc.setTextColor(100)
      doc.text('334C River Rd. Swan Hill VIC 3585', pageWidth / 2, y + 24, { align: 'center' })
      doc.setTextColor(0)
      autoTable(doc, {
        startY: y + 32,
        head: [['#', 'Chemical Name', 'Category', 'Location', 'SDS']],
        body: filteredChemicals.map((c, i) => [i + 1, c.name, (c as any).category || 'Other / General', c.location, c.pdf_url ? 'Yes' : 'No']),
        headStyles: { fillColor: [40, 54, 61], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 249] },
        columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 44 }, 4: { cellWidth: 20, halign: 'center' } },
        styles: { fontSize: 10, cellPadding: 4 },
      })
      const totalPages = (doc as any).internal.getNumberOfPages()
      const pageH = doc.internal.pageSize.getHeight()
      const pageW = doc.internal.pageSize.getWidth()
      const printed = new Date().toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      const printedBy = profile?.full_name ?? 'Unknown'
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.setFont('helvetica', 'normal')
        doc.text(`Page ${i} of ${totalPages}`, 14, pageH - 8)
        doc.text(`Printed By: ${printedBy}`, pageW / 2, pageH - 8, { align: 'center' })
        doc.setFont('helvetica', 'italic')
        doc.text(`Printed: ${printed}`, pageW - 14, pageH - 8, { align: 'right' })
        doc.setTextColor(0)
      }
      doc.save('Chemical_Register.pdf')
    }
    img.onerror = () => {
      let y = 14
      doc.setFontSize(26); doc.setFont('helvetica', 'bold')
      doc.text('Chemical Register', pageWidth / 2, y + 10, { align: 'center' })
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text('Woodward Foods Australia', pageWidth / 2, y + 18, { align: 'center' })
      doc.setFontSize(10); doc.setTextColor(100)
      doc.text('334C River Rd. Swan Hill VIC 3585', pageWidth / 2, y + 24, { align: 'center' })
      doc.setTextColor(0)
      autoTable(doc, {
        startY: y + 32,
        head: [['#', 'Chemical Name', 'Category', 'Location', 'SDS']],
        body: filteredChemicals.map((c, i) => [i + 1, c.name, (c as any).category || 'Other / General', c.location, c.pdf_url ? 'Yes' : 'No']),
        headStyles: { fillColor: [40, 54, 61], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 249] },
        columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 44 }, 4: { cellWidth: 20, halign: 'center' } },
        styles: { fontSize: 10, cellPadding: 4 },
      })
      const totalPages = (doc as any).internal.getNumberOfPages()
      const pageH = doc.internal.pageSize.getHeight()
      const pageW = doc.internal.pageSize.getWidth()
      const printed = new Date().toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      const printedBy = profile?.full_name ?? 'Unknown'
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.setFont('helvetica', 'normal')
        doc.text(`Page ${i} of ${totalPages}`, 14, pageH - 8)
        doc.text(`Printed By: ${printedBy}`, pageW / 2, pageH - 8, { align: 'center' })
        doc.setFont('helvetica', 'italic')
        doc.text(`Printed: ${printed}`, pageW - 14, pageH - 8, { align: 'right' })
        doc.setTextColor(0)
      }
      doc.save('Chemical_Register.pdf')
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 leading-tight">SDS Chemicals</h1>
          <p className="text-sm text-slate-400 mt-0.5">Safety Data Sheet chemical registry</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export PDF — secondary */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border"
            style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#1e293b' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e2e8f0' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9' }}
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </button>
          {/* Add Chemical — primary */}
          <button
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#1a2535' }}
          >
            <Plus className="h-4 w-4" />
            Add Chemical
          </button>
        </div>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or location…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={inputCls + ' pl-9'}
          />
        </div>
        <div className="text-sm font-medium text-slate-500">
          <span className="font-bold text-slate-700">{filteredChemicals.length}</span>{' '}
          chemical{filteredChemicals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table — key fix: overflow container is the direct parent of <table>,
          thead uses position:sticky top:0 with solid bg + z-index */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          <table className="w-full text-sm border-collapse">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Chemical Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Storage Location
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  SDS Document
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Last Updated
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading chemicals…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredChemicals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-10 w-10 text-slate-200" />
                      <p className="text-sm text-slate-400">
                        {searchTerm ? 'No chemicals match your search' : 'No chemicals registered yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredChemicals.map((chemical, idx) => (
                  <tr
                    key={chemical.id}
                    className="transition-colors hover:bg-slate-50/80"
                    style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : undefined }}
                  >
                    {/* Chemical Name */}
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                      <span className="line-clamp-2" title={chemical.name}>{chemical.name}</span>
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3">
                      <CategoryBadge category={(chemical as any).category || 'Other / General'} />
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3 text-slate-600 max-w-[180px]">
                      <span className="line-clamp-2" title={chemical.location}>{chemical.location}</span>
                    </td>
                    {/* SDS Document */}
                    <td className="px-4 py-3">
                      {chemical.pdf_url ? (
                        <a
                          href={chemical.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                          style={{ color: '#2d9da8' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#1a7a85' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2d9da8' }}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          View SDS
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                    {/* Last Updated */}
                    <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">
                      {formatDate(chemical.updated_at)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <ActionBtn
                          icon={Pencil}
                          label="Edit Chemical"
                          color="#3b82f6"
                          hoverBg="#eff6ff"
                          onClick={() => handleOpenDialog(chemical)}
                        />
                        <ActionBtn
                          icon={Trash2}
                          label="Delete Chemical"
                          color="#dc2626"
                          hoverBg="#fef2f2"
                          onClick={() => { setDeletingChemical(chemical); setIsDeleteDialogOpen(true) }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && filteredChemicals.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filteredChemicals.length}</span> of{' '}
              <span className="font-semibold text-slate-600">{chemicals.length}</span> chemicals
            </span>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-xs text-[#2d9da8] hover:underline">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">
              {editingChemical ? 'Edit Chemical' : 'Add New Chemical'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className={labelCls}>Chemical Name <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Sodium Hypochlorite"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Storage Location <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                value={formData.location}
                onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g., Chemical Storage Room A, Shelf 3"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                className={inputCls}
              >
                <option>Clean / Sanitation</option>
                <option>Water Treatment</option>
                <option>Equipment / Machinery</option>
                <option>Pest Control</option>
                <option>Refrigeration / Cooling</option>
                <option>Boiler / Steam Treatment</option>
                <option>Laboratory</option>
                <option>Meat Branding Ink</option>
                <option>Other / General</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Valid Since</label>
                <input type="date" className={inputCls} value={formData.valid_since} onChange={e => setFormData(f => ({ ...f, valid_since: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Valid Until</label>
                <input type="date" className={inputCls} value={formData.valid_until} onChange={e => setFormData(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <label className={labelCls}>SDS Document (PDF)</label>
              <label
                htmlFor="sds-file-upload"
                className="flex flex-col items-center gap-2 cursor-pointer rounded-lg border-2 border-dashed p-4 transition-all"
                style={{ borderColor: '#cbd5e1' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2d9da8' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1' }}
              >
                <Upload className="h-7 w-7 text-slate-400" />
                <span className="text-sm text-slate-500">Click to upload SDS PDF</span>
                <span className="text-xs text-slate-400">PDF files only</span>
              </label>
              <input id="sds-file-upload" type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className="hidden" />

              {selectedFile && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#2d9da8]" />
                    <span className="text-sm text-slate-700 truncate max-w-[260px]">{selectedFile.name}</span>
                    <span className="text-xs text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button type="button" onClick={() => setSelectedFile(null)} className="p-1 rounded hover:bg-slate-200 transition-colors">
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              )}

              {formData.pdf_url && !selectedFile && (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#2d9da8]" />
                    <span className="text-sm text-slate-700">Current SDS Document</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(formData.pdf_url, '_blank')}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[#2d9da8] hover:bg-slate-100 transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={handleCloseDialog}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingFile}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: '#1a2535' }}
              >
                {uploadingFile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {uploadingFile ? 'Uploading…' : editingChemical ? 'Save Changes' : 'Add Chemical'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              Delete Chemical
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 pb-2">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800">"{deletingChemical?.name}"</span>?
              This action cannot be undone.
            </p>
            {deletingChemical && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                Location: {deletingChemical.location}
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => { setIsDeleteDialogOpen(false); setDeletingChemical(null) }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all"
            >
              Delete Chemical
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
