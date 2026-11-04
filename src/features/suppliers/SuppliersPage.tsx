import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Search, Mail, Phone, Eye,
  Calendar, AlertCircle, FileDown, Loader2, X, Upload,
} from 'lucide-react'
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

type Supplier = Database['public']['Tables']['suppliers']['Row']
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']
type Certificate = Database['public']['Tables']['supplier_certificates']['Row']
type CertificateInsert = Database['public']['Tables']['supplier_certificates']['Insert']

// ─── Shared style constants ───────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white',
  'placeholder:text-slate-400 text-slate-800',
  'focus:outline-none focus:ring-2 focus:ring-[#2d9da8]/30 focus:border-[#2d9da8]',
  'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

// ─── Badge components ─────────────────────────────────────────────────────────
function VendorBadge({ type }: { type: string }) {
  const isService = type === 'Service Provider'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={
        isService
          ? { backgroundColor: '#f3e8ff', color: '#7c3aed' }
          : { backgroundColor: '#eff6ff', color: '#1d4ed8' }
      }
    >
      {type || 'Supplier'}
    </span>
  )
}

function CategoryBadge({ cat }: { cat: string }) {
  const isFC = cat === 'Food Contact'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={
        isFC
          ? { backgroundColor: '#f0fdf4', color: '#16a34a' }
          : { backgroundColor: '#fff7ed', color: '#c2410c' }
      }
    >
      {cat || 'Non FC'}
    </span>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({
  icon: Icon, label, color, hoverBg, onClick,
}: {
  icon: React.ElementType
  label: string
  color: string
  hoverBg: string
  onClick: () => void
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

export function SuppliersPage() {
  const { profile } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Add/Edit supplier dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    vendor_type: 'Supplier' as 'Supplier' | 'Service Provider',
    category: 'Non FC' as 'Non FC' | 'Food Contact',
    items_summary: '',
  })

  // View supplier details dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loadingCerts, setLoadingCerts] = useState(false)

  // Add certificate dialog
  const [addCertDialogOpen, setAddCertDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [certFormData, setCertFormData] = useState({ validSince: '', validUntil: '' })

  // Delete supplier dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)

  // Delete certificate dialog
  const [isCertDeleteDialogOpen, setIsCertDeleteDialogOpen] = useState(false)
  const [deletingCert, setDeletingCert] = useState<Certificate | null>(null)

  useEffect(() => { fetchSuppliers() }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers)
    } else {
      const q = searchTerm.toLowerCase()
      setFilteredSuppliers(
        suppliers.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.contact?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
        )
      )
    }
  }, [searchTerm, suppliers])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers').select('*').order('name', { ascending: true })
      if (error) throw error
      setSuppliers(data || [])
    } catch {
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const fetchCertificates = async (supplierId: string) => {
    try {
      setLoadingCerts(true)
      const { data, error } = await supabase
        .from('supplier_certificates').select('*')
        .eq('supplier_id', supplierId).order('valid_until', { ascending: true })
      if (error) throw error
      setCertificates(data || [])
    } catch {
      toast.error('Failed to load certificates')
    } finally {
      setLoadingCerts(false)
    }
  }

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        name: supplier.name,
        contact: supplier.contact || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        vendor_type: (supplier as any).vendor_type || 'Supplier',
        category: (supplier as any).category || 'Non FC',
        items_summary: (supplier as any).items_summary || '',
      })
    } else {
      setEditingSupplier(null)
      setFormData({ name: '', contact: '', email: '', phone: '', vendor_type: 'Supplier', category: 'Non FC', items_summary: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) { toast.error('Please enter a supplier name'); return }
    try {
      if (editingSupplier) {
        const updateData: SupplierUpdate = {
          name: formData.name,
          contact: formData.contact || null,
          email: formData.email || null,
          phone: formData.phone || null,
          vendor_type: formData.vendor_type,
          category: formData.category,
          items_summary: formData.items_summary || null,
        } as any
        const { error } = await supabase.from('suppliers').update(updateData).eq('id', editingSupplier.id)
        if (error) throw error
        toast.success(`"${formData.name}" updated`)
      } else {
        const insertData: SupplierInsert = {
          name: formData.name,
          contact: formData.contact || null,
          email: formData.email || null,
          phone: formData.phone || null,
          vendor_type: formData.vendor_type,
          category: formData.category,
          items_summary: formData.items_summary || null,
        } as any
        const { error } = await supabase.from('suppliers').insert(insertData)
        if (error) throw error
        toast.success(`"${formData.name}" added`)
      }
      setIsDialogOpen(false)
      setEditingSupplier(null)
      fetchSuppliers()
    } catch {
      toast.error('Failed to save supplier')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', deletingSupplier.id)
      if (error) throw error
      toast.success(`"${deletingSupplier.name}" deleted`)
      setIsDeleteDialogOpen(false)
      setDeletingSupplier(null)
      fetchSuppliers()
    } catch {
      toast.error('Failed to delete supplier')
    }
  }

  const handleViewSupplier = (supplier: Supplier) => {
    setViewingSupplier(supplier)
    setViewDialogOpen(true)
    fetchCertificates(supplier.id)
  }

  const handleOpenAddCertDialog = () => {
    setSelectedFile(null)
    setCertFormData({ validSince: '', validUntil: '' })
    setAddCertDialogOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return }
      setSelectedFile(file)
    }
  }

  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) { toast.error('Please select a file'); return }
    if (!certFormData.validSince || !certFormData.validUntil) { toast.error('Please enter both validity dates'); return }
    if (new Date(certFormData.validSince) > new Date(certFormData.validUntil)) {
      toast.error('Valid since date must be before valid until date'); return
    }
    if (!viewingSupplier) return
    try {
      setUploadingCert(true)
      const fileName = `suppliers/${viewingSupplier.id}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('certificates').upload(fileName, selectedFile)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName)
      const certData: CertificateInsert = {
        supplier_id: viewingSupplier.id,
        file_name: selectedFile.name,
        file_url: publicUrl,
        valid_since: certFormData.validSince,
        valid_until: certFormData.validUntil,
      }
      const { error: dbError } = await supabase.from('supplier_certificates').insert(certData)
      if (dbError) throw dbError
      toast.success('Certificate added successfully')
      setAddCertDialogOpen(false)
      fetchCertificates(viewingSupplier.id)
    } catch {
      toast.error('Failed to add certificate')
    } finally {
      setUploadingCert(false)
    }
  }

  const handleDeleteCertConfirm = async () => {
    if (!deletingCert) return
    try {
      const { error } = await supabase.from('supplier_certificates').delete().eq('id', deletingCert.id)
      if (error) throw error
      toast.success('Certificate deleted')
      setIsCertDeleteDialogOpen(false)
      setDeletingCert(null)
      if (viewingSupplier) fetchCertificates(viewingSupplier.id)
    } catch {
      toast.error('Failed to delete certificate')
    }
  }

  const calculateDaysRemaining = (validUntil: string): number => {
    const today = new Date()
    const expiryDate = new Date(validUntil)
    return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDaysRemainingColor = (days: number): string => {
    if (days < 0) return '#dc2626'
    if (days <= 30) return '#ea580c'
    if (days <= 90) return '#ca8a04'
    return '#16a34a'
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const handleExportPDF = async () => {
    const { data: certData } = await supabase.from('supplier_certificates').select('supplier_id') as any
    const certCounts: Record<string, number> = {}
    for (const row of certData ?? []) {
      certCounts[row.supplier_id] = (certCounts[row.supplier_id] ?? 0) + 1
    }
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const img = new Image()
    img.src = '/APPLOGO.png'
    const buildPDF = () => {
      const logoW = 50
      const logoH = (img.naturalHeight / img.naturalWidth) * logoW
      doc.addImage(img, 'PNG', (pageWidth - logoW) / 2, 10, logoW, logoH)
      let y = 12 + logoH
      doc.setFontSize(24); doc.setFont('helvetica', 'bold')
      doc.text('Approved Supplier / Service Provider', pageWidth / 2, y + 10, { align: 'center' })
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text('Woodward Foods Australia', pageWidth / 2, y + 18, { align: 'center' })
      doc.setFontSize(10); doc.setTextColor(100)
      doc.text('334C River Rd. Swan Hill VIC 3585', pageWidth / 2, y + 24, { align: 'center' })
      doc.setTextColor(0)
      autoTable(doc, {
        startY: y + 32,
        head: [['#', 'Supplier Name', 'Vendor Type', 'Category', 'Items Summary', 'Contact', 'Email', 'Phone', 'Certs']],
        body: filteredSuppliers.map((s, i) => [
          i + 1, s.name, (s as any).vendor_type || 'Supplier', (s as any).category || 'Non FC',
          (s as any).items_summary || '-', s.contact || '-', s.email || '-', s.phone || '-',
          certCounts[s.id] ? 'Yes' : 'No',
        ]),
        headStyles: { fillColor: [40, 54, 61], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 249] },
        columnStyles: { 0: { cellWidth: 14, halign: 'center' }, 8: { cellWidth: 16, halign: 'center' } },
        styles: { fontSize: 8, cellPadding: 3 },
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
      doc.save('Approved_Suppliers.pdf')
    }
    img.onload = buildPDF
    img.onerror = buildPDF
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Page title — scrolls away */}
      <div className="pb-5">
        <h1 className="text-xl font-bold text-slate-800 leading-tight">Suppliers</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage supplier information and certificates</p>
      </div>

      {/* ── Sticky toolbar: action buttons + search ── */}
      <div
        className="sticky top-0 z-10 bg-slate-50 pb-3"
        style={{ boxShadow: '0 2px 8px -2px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Search + Count */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, contact, or email…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={inputCls + ' pl-9 pr-9'}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="text-sm font-medium text-slate-500 shrink-0">
              <span className="font-bold text-slate-700">{filteredSuppliers.length}</span>
              {' '}supplier{filteredSuppliers.length !== 1 ? 's' : ''}
              {searchTerm && suppliers.length !== filteredSuppliers.length && (
                <span className="text-slate-400"> of {suppliers.length}</span>
              )}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-slate-200 active:scale-95"
              style={{ backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1' }}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </button>
            <button
              onClick={() => handleOpenDialog()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#1a2535' }}
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 820 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 9 }}>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplier Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Vendor Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Items Summary</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Contact Person</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading suppliers…</span>
                  </div>
                </td>
              </tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-10 w-10 text-slate-200" />
                    <p className="text-sm text-slate-400">
                      {searchTerm ? 'No suppliers match your search' : 'No suppliers yet — add your first supplier'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier, idx) => (
                <tr
                  key={supplier.id}
                  className="transition-colors hover:bg-slate-50/80"
                  style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : undefined }}
                >
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                    {supplier.name}
                  </td>
                  <td className="px-4 py-3">
                    <VendorBadge type={(supplier as any).vendor_type || 'Supplier'} />
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge cat={(supplier as any).category || 'Non FC'} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[180px]">
                    {(supplier as any).items_summary
                      ? <span className="truncate block" title={(supplier as any).items_summary}>{(supplier as any).items_summary}</span>
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {supplier.contact || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {supplier.email
                      ? (
                        <a
                          href={`mailto:${supplier.email}`}
                          className="inline-flex items-center gap-1 text-[#2d9da8] hover:underline truncate block"
                          title={supplier.email}
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{supplier.email}</span>
                        </a>
                      )
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {supplier.phone
                      ? (
                        <a
                          href={`tel:${supplier.phone}`}
                          className="inline-flex items-center gap-1 text-[#2d9da8] hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </a>
                      )
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ActionBtn
                        icon={Eye}
                        label="View Details"
                        color="#2d9da8"
                        hoverBg="#f0fdfe"
                        onClick={() => handleViewSupplier(supplier)}
                      />
                      <ActionBtn
                        icon={Pencil}
                        label="Edit Supplier"
                        color="#3b82f6"
                        hoverBg="#eff6ff"
                        onClick={() => handleOpenDialog(supplier)}
                      />
                      <ActionBtn
                        icon={Trash2}
                        label="Delete Supplier"
                        color="#dc2626"
                        hoverBg="#fef2f2"
                        onClick={() => { setDeletingSupplier(supplier); setIsDeleteDialogOpen(true) }}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table footer */}
        {!loading && filteredSuppliers.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filteredSuppliers.length}</span> of{' '}
              <span className="font-semibold text-slate-600">{suppliers.length}</span> suppliers
            </span>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-xs text-[#2d9da8] hover:underline">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Add / Edit Supplier Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) setEditingSupplier(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className={labelCls}>Supplier Name <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Acme Packaging Ltd"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Vendor Type <span className="text-red-400">*</span></label>
                <select
                  value={formData.vendor_type}
                  onChange={e => setFormData(f => ({ ...f, vendor_type: e.target.value as any }))}
                  className={inputCls}
                >
                  <option value="Supplier">Supplier</option>
                  <option value="Service Provider">Service Provider</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Category <span className="text-red-400">*</span></label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value as any }))}
                  className={inputCls}
                >
                  <option value="Non FC">Non FC</option>
                  <option value="Food Contact">Food Contact</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Items Summary</label>
              <textarea
                value={formData.items_summary}
                onChange={e => setFormData(f => ({ ...f, items_summary: e.target.value }))}
                placeholder="e.g. Shrink bags, cartons, liners, soaker pads..."
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </div>
            <div>
              <label className={labelCls}>Contact Person</label>
              <input
                className={inputCls}
                value={formData.contact}
                onChange={e => setFormData(f => ({ ...f, contact: e.target.value }))}
                placeholder="e.g., John Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  className={inputCls}
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  className={inputCls}
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+61 3 1234 5678"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => { setIsDialogOpen(false); setEditingSupplier(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#1a2535' }}
              >
                {editingSupplier ? 'Save Changes' : 'Add Supplier'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Supplier Dialog ─── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              Delete Supplier
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 pb-2">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800">"{deletingSupplier?.name}"</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => { setIsDeleteDialogOpen(false); setDeletingSupplier(null) }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all"
            >
              Delete Supplier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Supplier Details Dialog ─── */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">
              Supplier Details
            </DialogTitle>
          </DialogHeader>

          {viewingSupplier && (
            <div className="space-y-5 pt-1">
              {/* Supplier info grid */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="col-span-2">
                  <p className={labelCls}>Supplier Name</p>
                  <p className="font-bold text-lg text-slate-800">{viewingSupplier.name}</p>
                </div>
                <div>
                  <p className={labelCls}>Vendor Type</p>
                  <VendorBadge type={(viewingSupplier as any).vendor_type || 'Supplier'} />
                </div>
                <div>
                  <p className={labelCls}>Category</p>
                  <CategoryBadge cat={(viewingSupplier as any).category || 'Non FC'} />
                </div>
                {(viewingSupplier as any).items_summary && (
                  <div className="col-span-2">
                    <p className={labelCls}>Items Summary</p>
                    <p className="text-sm text-slate-700">{(viewingSupplier as any).items_summary}</p>
                  </div>
                )}
                <div>
                  <p className={labelCls}>Contact Person</p>
                  <p className="text-sm text-slate-700">{viewingSupplier.contact || <span className="text-slate-400">—</span>}</p>
                </div>
                <div>
                  <p className={labelCls}>Phone</p>
                  <p className="text-sm text-slate-700">
                    {viewingSupplier.phone
                      ? <a href={`tel:${viewingSupplier.phone}`} className="text-[#2d9da8] hover:underline">{viewingSupplier.phone}</a>
                      : <span className="text-slate-400">—</span>
                    }
                  </p>
                </div>
                <div className="col-span-2">
                  <p className={labelCls}>Email</p>
                  <p className="text-sm text-slate-700">
                    {viewingSupplier.email
                      ? <a href={`mailto:${viewingSupplier.email}`} className="text-[#2d9da8] hover:underline">{viewingSupplier.email}</a>
                      : <span className="text-slate-400">—</span>
                    }
                  </p>
                </div>
              </div>

              {/* Certificates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Certificates</h3>
                  <button
                    onClick={handleOpenAddCertDialog}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: '#1a2535' }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Certificate
                  </button>
                </div>

                {loadingCerts ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading certificates…</span>
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No certificates uploaded yet
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Certificate</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Valid Since</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Valid Until</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Days Remaining</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certificates.map((cert, idx) => {
                          const days = calculateDaysRemaining(cert.valid_until)
                          return (
                            <tr
                              key={cert.id}
                              className="hover:bg-slate-50/80 transition-colors"
                              style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : undefined }}
                            >
                              <td className="px-4 py-2.5 font-medium text-slate-700">{cert.file_name}</td>
                              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(cert.valid_since)}</td>
                              <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(cert.valid_until)}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {days < 0 && <AlertCircle className="h-3.5 w-3.5" style={{ color: '#dc2626' }} />}
                                  <span className="text-xs font-semibold" style={{ color: getDaysRemainingColor(days) }}>
                                    {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <ActionBtn
                                    icon={Eye}
                                    label="View Certificate"
                                    color="#2d9da8"
                                    hoverBg="#f0fdfe"
                                    onClick={() => window.open(cert.file_url, '_blank')}
                                  />
                                  <ActionBtn
                                    icon={Trash2}
                                    label="Delete Certificate"
                                    color="#dc2626"
                                    hoverBg="#fef2f2"
                                    onClick={() => { setDeletingCert(cert); setIsCertDeleteDialogOpen(true) }}
                                  />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <button
              onClick={() => setViewDialogOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Certificate Dialog ─── */}
      <Dialog open={isCertDeleteDialogOpen} onOpenChange={setIsCertDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              Delete Certificate
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 pb-2">
            <p className="text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-800">"{deletingCert?.file_name}"</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => { setIsCertDeleteDialogOpen(false); setDeletingCert(null) }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCertConfirm}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Certificate Dialog ─── */}
      <Dialog open={addCertDialogOpen} onOpenChange={setAddCertDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">Add Certificate</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCertificate} className="space-y-4 pt-1">
            <div>
              <label className={labelCls}>Certificate File (PDF) <span className="text-red-400">*</span></label>
              <label
                htmlFor="cert-file-upload"
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-[#2d9da8] transition-colors"
              >
                <Upload className="h-7 w-7 text-slate-400" />
                <span className="text-sm text-slate-600 text-center">
                  {selectedFile ? selectedFile.name : 'Click to upload certificate PDF'}
                </span>
                <span className="text-xs text-slate-400">PDF files only</span>
                <input
                  id="cert-file-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Valid Since <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  className={inputCls}
                  value={certFormData.validSince}
                  onChange={e => setCertFormData(f => ({ ...f, validSince: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Valid Until <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  className={inputCls}
                  value={certFormData.validUntil}
                  onChange={e => setCertFormData(f => ({ ...f, validUntil: e.target.value }))}
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setAddCertDialogOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingCert}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#1a2535' }}
              >
                {uploadingCert
                  ? <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</span>
                  : 'Add Certificate'
                }
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
