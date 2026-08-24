import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Mail, Phone, Eye, Calendar, AlertCircle, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import type { Database } from '../../types/database'

type Supplier = Database['public']['Tables']['suppliers']['Row']
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert']
type SupplierUpdate = Database['public']['Tables']['suppliers']['Update']
type Certificate = Database['public']['Tables']['supplier_certificates']['Row']
type CertificateInsert = Database['public']['Tables']['supplier_certificates']['Insert']

export function SuppliersPage() {
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
  const [certFormData, setCertFormData] = useState({
    validSince: '',
    validUntil: '',
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers)
    } else {
      const filtered = suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSuppliers(filtered)
    }
  }, [searchTerm, suppliers])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const fetchCertificates = async (supplierId: string) => {
    try {
      setLoadingCerts(true)
      const { data, error } = await supabase
        .from('supplier_certificates')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('valid_until', { ascending: true })

      if (error) throw error
      setCertificates(data || [])
    } catch (error) {
      console.error('Error fetching certificates:', error)
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
      })
    } else {
      setEditingSupplier(null)
      setFormData({
        name: '',
        contact: '',
        email: '',
        phone: '',
        vendor_type: 'Supplier',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingSupplier(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error('Please enter a supplier name')
      return
    }

    try {
      if (editingSupplier) {
        const updateData: SupplierUpdate = {
          name: formData.name,
          contact: formData.contact || null,
          email: formData.email || null,
          phone: formData.phone || null,
          vendor_type: formData.vendor_type,
        } as any

        const { error } = await supabase
          .from('suppliers')
          .update(updateData)
          .eq('id', editingSupplier.id)

        if (error) throw error
        toast.success(`Successfully updated supplier "${formData.name}"`)
      } else {
        const insertData: SupplierInsert = {
          name: formData.name,
          contact: formData.contact || null,
          email: formData.email || null,
          phone: formData.phone || null,
          vendor_type: formData.vendor_type,
        } as any

        const { error } = await supabase.from('suppliers').insert(insertData)

        if (error) throw error
        toast.success(`Successfully added supplier "${formData.name}"`)
      }

      handleCloseDialog()
      fetchSuppliers()
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error('Failed to save supplier')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      return
    }

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)

      if (error) throw error
      toast.success(`Successfully deleted supplier "${name}"`)
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
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
    setCertFormData({
      validSince: '',
      validUntil: '',
    })
    setAddCertDialogOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    if (!certFormData.validSince || !certFormData.validUntil) {
      toast.error('Please enter both validity dates')
      return
    }

    if (new Date(certFormData.validSince) > new Date(certFormData.validUntil)) {
      toast.error('Valid since date must be before valid until date')
      return
    }

    if (!viewingSupplier) return

    try {
      setUploadingCert(true)

      // Upload file to storage
      const fileName = `suppliers/${viewingSupplier.id}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName)

      // Save certificate record
      const certData: CertificateInsert = {
        supplier_id: viewingSupplier.id,
        file_name: selectedFile.name,
        file_url: publicUrl,
        valid_since: certFormData.validSince,
        valid_until: certFormData.validUntil,
      }

      const { error: dbError } = await supabase
        .from('supplier_certificates')
        .insert(certData)

      if (dbError) throw dbError

      toast.success('Certificate added successfully')
      setAddCertDialogOpen(false)
      fetchCertificates(viewingSupplier.id)
    } catch (error) {
      console.error('Error adding certificate:', error)
      toast.error('Failed to add certificate')
    } finally {
      setUploadingCert(false)
    }
  }

  const handleDeleteCertificate = async (certId: string, fileName: string) => {
    if (!confirm(`Delete certificate "${fileName}"?`)) return

    try {
      const { error } = await supabase
        .from('supplier_certificates')
        .delete()
        .eq('id', certId)

      if (error) throw error
      toast.success('Certificate deleted successfully')
      if (viewingSupplier) {
        fetchCertificates(viewingSupplier.id)
      }
    } catch (error) {
      console.error('Error deleting certificate:', error)
      toast.error('Failed to delete certificate')
    }
  }

  const calculateDaysRemaining = (validUntil: string): number => {
    const today = new Date()
    const expiryDate = new Date(validUntil)
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysRemainingColor = (days: number): string => {
    if (days < 0) return 'text-red-600 font-bold' // Expired
    if (days <= 30) return 'text-orange-600 font-semibold' // Expiring soon
    if (days <= 90) return 'text-yellow-600' // Warning
    return 'text-green-600' // Good
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleExportPDF = async () => {
    // Fetch certificate counts for all suppliers
    const { data: certData } = await supabase
      .from('supplier_certificates')
      .select('supplier_id') as any

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

      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('Approved Supplier / Service Provider', pageWidth / 2, y + 10, { align: 'center' })

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Woodward Foods Australia', pageWidth / 2, y + 18, { align: 'center' })

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text('334C River Rd. Swan Hill VIC 3585', pageWidth / 2, y + 24, { align: 'center' })
      doc.setTextColor(0)

      autoTable(doc, {
        startY: y + 32,
        head: [['#', 'Supplier Name', 'Vendor Type', 'Contact Person', 'Email', 'Phone', 'Certificates']],
        body: filteredSuppliers.map((s, i) => [
          i + 1,
          s.name,
          (s as any).vendor_type || 'Supplier',
          s.contact || '-',
          s.email || '-',
          s.phone || '-',
          certCounts[s.id] ? 'Yes' : 'No',
        ]),
        headStyles: { fillColor: [40, 54, 61], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 249] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          6: { cellWidth: 28, halign: 'center' },
        },
        styles: { fontSize: 9, cellPadding: 3 },
        didDrawPage: () => {
          const pageH = doc.internal.pageSize.getHeight()
          const pageW = doc.internal.pageSize.getWidth()
          const totalPages = (doc as any).internal.getNumberOfPages()
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
          const printed = new Date().toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          doc.setFontSize(8)
          doc.setTextColor(120)
          doc.setFont('helvetica', 'normal')
          doc.text(`Page ${currentPage} of ${totalPages}`, 14, pageH - 8)
          doc.setFont('helvetica', 'italic')
          doc.text(`Printed: ${printed}`, pageW - 14, pageH - 8, { align: 'right' })
          doc.setTextColor(0)
        },
      })

      doc.save('Approved_Suppliers.pdf')
    }

    img.onload = buildPDF
    img.onerror = buildPDF
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage supplier information and certificates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Vendor Type</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No suppliers found' : 'No suppliers yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(supplier as any).vendor_type === 'Service Provider' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {(supplier as any).vendor_type || 'Supplier'}
                      </span>
                    </TableCell>
                    <TableCell>{supplier.contact || '-'}</TableCell>
                    <TableCell>
                      {supplier.email ? (
                        <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {supplier.phone ? (
                        <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSupplier(supplier)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(supplier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(supplier.id, supplier.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Supplier Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Acme Packaging Ltd"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Vendor Type *</label>
              <select
                value={formData.vendor_type}
                onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value as any })}
                className="w-full mt-1 rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option value="Supplier">Supplier</option>
                <option value="Service Provider">Service Provider</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Contact Person</label>
              <Input
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., john@acmepackaging.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +1 234 567 8900"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSupplier ? 'Update' : 'Add'} Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Supplier Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
          </DialogHeader>

          {viewingSupplier && (
            <div className="space-y-6">
              {/* Supplier Info Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Supplier Name</p>
                  <p className="font-semibold text-lg">{viewingSupplier.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendor Type</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${(viewingSupplier as any).vendor_type === 'Service Provider' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {(viewingSupplier as any).vendor_type || 'Supplier'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="font-medium">{viewingSupplier.contact || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">
                    {viewingSupplier.email ? (
                      <a href={`mailto:${viewingSupplier.email}`} className="text-primary hover:underline">
                        {viewingSupplier.email}
                      </a>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">
                    {viewingSupplier.phone ? (
                      <a href={`tel:${viewingSupplier.phone}`} className="text-primary hover:underline">
                        {viewingSupplier.phone}
                      </a>
                    ) : '-'}
                  </p>
                </div>
              </div>

              {/* Certificates Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Certificates</h3>
                  <Button onClick={handleOpenAddCertDialog} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Certificate
                  </Button>
                </div>

                {loadingCerts ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading certificates...
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No certificates uploaded yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Certificate Name</TableHead>
                        <TableHead>Valid Since</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Days Remaining</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((cert) => {
                        const daysRemaining = calculateDaysRemaining(cert.valid_until)
                        return (
                          <TableRow key={cert.id}>
                            <TableCell className="font-medium">{cert.file_name}</TableCell>
                            <TableCell>{formatDate(cert.valid_since)}</TableCell>
                            <TableCell>{formatDate(cert.valid_until)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {daysRemaining < 0 && (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className={getDaysRemainingColor(daysRemaining)}>
                                  {daysRemaining < 0
                                    ? `Expired ${Math.abs(daysRemaining)} days ago`
                                    : `${daysRemaining} days`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(cert.file_url, '_blank')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCertificate(cert.id, cert.file_name)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Certificate Dialog */}
      <Dialog open={addCertDialogOpen} onOpenChange={setAddCertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Certificate</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCertificate} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Certificate File (PDF) *</label>
              <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                <label htmlFor="cert-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Calendar className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {selectedFile ? selectedFile.name : 'Click to upload certificate PDF'}
                  </span>
                  <span className="text-xs text-gray-500">PDF files only</span>
                </label>
                <input
                  id="cert-file-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Valid Since *</label>
                <Input
                  type="date"
                  value={certFormData.validSince}
                  onChange={(e) => setCertFormData({ ...certFormData, validSince: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Valid Until *</label>
                <Input
                  type="date"
                  value={certFormData.validUntil}
                  onChange={(e) => setCertFormData({ ...certFormData, validUntil: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCertDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingCert}>
                {uploadingCert ? 'Uploading...' : 'Add Certificate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
