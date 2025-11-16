import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Mail, Phone, FileCheck, Upload, X, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
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

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
  })

  const [certificates, setCertificates] = useState<Array<{ title: string; url: string }>>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  // View certificates dialog state
  const [viewCertificatesOpen, setViewCertificatesOpen] = useState(false)
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null)

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

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        name: supplier.name,
        contact: supplier.contact || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
      })
      // Load existing certificates
      const existingCerts = supplier.certificates as any
      setCertificates(Array.isArray(existingCerts) ? existingCerts : [])
    } else {
      setEditingSupplier(null)
      setFormData({
        name: '',
        contact: '',
        email: '',
        phone: '',
      })
      setCertificates([])
    }
    setSelectedFiles([])
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingSupplier(null)
    setSelectedFiles([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFiles = files.filter(f => f.type === 'application/pdf')

    if (pdfFiles.length !== files.length) {
      toast.error('Only PDF files are allowed')
    }

    setSelectedFiles(prev => [...prev, ...pdfFiles])
  }

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteCertificate = async (cert: { title: string; url: string }) => {
    if (!confirm(`Delete certificate "${cert.title}"?`)) return

    try {
      // Extract file path from URL
      const urlParts = cert.url.split('/certificates/')
      if (urlParts.length === 2) {
        const filePath = urlParts[1]
        const { error } = await supabase.storage.from('certificates').remove([filePath])
        if (error) throw error
      }

      setCertificates(prev => prev.filter(c => c.url !== cert.url))
      toast.success(`Deleted certificate "${cert.title}"`)
    } catch (error) {
      console.error('Error deleting certificate:', error)
      toast.error('Failed to delete certificate')
    }
  }

  const uploadCertificates = async (supplierId: string, supplierName: string) => {
    if (selectedFiles.length === 0) return []

    setUploadingFiles(true)
    const uploadedCerts: Array<{ title: string; url: string }> = []

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${supplierId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('certificates')
          .getPublicUrl(fileName)

        uploadedCerts.push({
          title: file.name,
          url: publicUrl
        })
      }

      toast.success(`Uploaded ${uploadedCerts.length} certificate(s)`)
      return uploadedCerts
    } catch (error) {
      console.error('Error uploading certificates:', error)
      toast.error('Failed to upload some certificates')
      return uploadedCerts
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error('Please enter supplier name')
      return
    }

    try {
      let supplierId: string

      if (editingSupplier) {
        supplierId = editingSupplier.id

        // Upload new certificates if any
        const newCerts = await uploadCertificates(supplierId, formData.name)
        const allCerts = [...certificates, ...newCerts]

        const updateData: SupplierUpdate = {
          name: formData.name,
          contact: formData.contact || null,
          email: formData.email || null,
          phone: formData.phone || null,
          certificates: allCerts as any,
        }

        const { error } = await supabase
          .from('suppliers')
          .update(updateData)
          .eq('id', editingSupplier.id)

        if (error) throw error
        toast.success(`Successfully updated supplier "${formData.name}"`)
      } else {
        // Create supplier first
        const insertData: SupplierInsert = {
          name: formData.name,
          contact: formData.contact || null,
          email: formData.email || null,
          phone: formData.phone || null,
        }

        const { data, error } = await supabase
          .from('suppliers')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        supplierId = data.id

        // Upload certificates
        const newCerts = await uploadCertificates(supplierId, formData.name)

        if (newCerts.length > 0) {
          // Update supplier with certificates
          const { error: updateError } = await supabase
            .from('suppliers')
            .update({ certificates: newCerts as any })
            .eq('id', supplierId)

          if (updateError) throw updateError
        }

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
    if (!confirm(`Delete supplier "${name}"? This will not affect existing products.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success(`Successfully deleted supplier "${name}"`)
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Failed to delete supplier')
    }
  }

  const handleViewCertificates = (supplier: Supplier) => {
    setViewingSupplier(supplier)
    setViewCertificatesOpen(true)
  }

  const handleDownloadCertificate = (url: string, title: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage supplier information and contacts</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

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

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Certificates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No suppliers found' : 'No suppliers yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const certs = Array.isArray(supplier.certificates) ? supplier.certificates : []
                  return (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
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
                      <TableCell>
                        {certs.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCertificates(supplier)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View ({certs.length})
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
                placeholder="Company name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contact Person</label>
              <Input
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </div>

            {/* Certificates Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Certificates (PDF)</label>

              {/* File Upload */}
              <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors"
                   style={{ borderColor: 'hsl(var(--border))' }}>
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    PDF files only
                  </span>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files (to be uploaded) */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Ready to upload:</p>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border"
                         style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{file.name}</span>
                        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSelectedFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing Certificates */}
              {certificates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Uploaded certificates:</p>
                  {certificates.map((cert, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border"
                         style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{cert.title}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(cert.url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCertificate(cert)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingFiles}>
                {uploadingFiles ? 'Uploading...' : editingSupplier ? 'Update' : 'Add'} Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Certificates Dialog */}
      <Dialog open={viewCertificatesOpen} onOpenChange={setViewCertificatesOpen}>
        <DialogContent onClose={() => setViewCertificatesOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              Certificates - {viewingSupplier?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {viewingSupplier && Array.isArray(viewingSupplier.certificates) && viewingSupplier.certificates.length > 0 ? (
              (viewingSupplier.certificates as Array<{ title: string; url: string }>).map((cert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded border"
                  style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}
                >
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        {cert.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(cert.url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadCertificate(cert.url, cert.title)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No certificates available</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCertificatesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
