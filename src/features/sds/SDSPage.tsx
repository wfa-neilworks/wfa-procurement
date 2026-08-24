import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, FileText, ExternalLink, Upload, X, Eye, FileDown } from 'lucide-react'
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

type SDSChemical = Database['public']['Tables']['sds_chemicals']['Row']
type SDSChemicalInsert = Database['public']['Tables']['sds_chemicals']['Insert']
type SDSChemicalUpdate = Database['public']['Tables']['sds_chemicals']['Update']

export function SDSPage() {
  const [chemicals, setChemicals] = useState<SDSChemical[]>([])
  const [filteredChemicals, setFilteredChemicals] = useState<SDSChemical[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingChemical, setEditingChemical] = useState<SDSChemical | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    pdf_url: '',
    valid_since: '',
    valid_until: '',
  })

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Fetch chemicals
  useEffect(() => {
    fetchChemicals()
  }, [])

  // Filter chemicals based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredChemicals(chemicals)
    } else {
      const filtered = chemicals.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredChemicals(filtered)
    }
  }, [searchTerm, chemicals])

  const fetchChemicals = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sds_chemicals')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setChemicals(data || [])
    } catch (error) {
      console.error('Error fetching chemicals:', error)
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
      })
    } else {
      setEditingChemical(null)
      setFormData({
        name: '',
        location: '',
        pdf_url: '',
        valid_since: '',
        valid_until: '',
      })
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
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null)
  }

  const uploadPDF = async (chemicalId: string, chemicalName: string) => {
    if (!selectedFile) return null

    setUploadingFile(true)
    try {
      const fileName = `sds/${chemicalId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName)

      toast.success('SDS document uploaded successfully')
      return publicUrl
    } catch (error) {
      console.error('Error uploading PDF:', error)
      toast.error('Failed to upload SDS document')
      return null
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.location) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      let chemicalId: string
      let pdfUrl = formData.pdf_url

      if (editingChemical) {
        chemicalId = editingChemical.id

        // Upload new PDF if selected
        if (selectedFile) {
          const uploadedUrl = await uploadPDF(chemicalId, formData.name)
          if (uploadedUrl) {
            pdfUrl = uploadedUrl
          }
        }

        // Update existing chemical
        const updateData: SDSChemicalUpdate = {
          name: formData.name,
          location: formData.location,
          pdf_url: pdfUrl || null,
          valid_since: formData.valid_since || null,
          valid_until: formData.valid_until || null,
        }

        const { error } = await supabase
          .from('sds_chemicals')
          .update(updateData)
          .eq('id', editingChemical.id)

        if (error) throw error
        toast.success(`Successfully updated chemical "${formData.name}"`)
      } else {
        // Create new chemical first
        const insertData: SDSChemicalInsert = {
          name: formData.name,
          location: formData.location,
          valid_since: formData.valid_since || null,
          valid_until: formData.valid_until || null,
        }

        const { data, error } = await supabase
          .from('sds_chemicals')
          .insert(insertData)
          .select()
          .single()

        if (error) throw error
        chemicalId = data.id

        // Upload PDF if selected
        if (selectedFile) {
          const uploadedUrl = await uploadPDF(chemicalId, formData.name)
          if (uploadedUrl) {
            // Update the chemical with the PDF URL
            const { error: updateError } = await supabase
              .from('sds_chemicals')
              .update({ pdf_url: uploadedUrl })
              .eq('id', chemicalId)

            if (updateError) throw updateError
          }
        }

        toast.success(`Successfully added chemical "${formData.name}"`)
      }

      handleCloseDialog()
      fetchChemicals()
    } catch (error) {
      console.error('Error saving chemical:', error)
      toast.error('Failed to save chemical')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('sds_chemicals')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success(`Successfully deleted chemical "${name}"`)
      fetchChemicals()
    } catch (error) {
      console.error('Error deleting chemical:', error)
      toast.error('Failed to delete chemical')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Load logo and build PDF
    const img = new Image()
    img.src = '/APPLOGO.png'
    img.onload = () => {
      // Logo — centered at top
      const logoW = 60
      const logoH = (img.height / img.width) * logoW
      doc.addImage(img, 'PNG', (pageWidth - logoW) / 2, 12, logoW, logoH)

      let y = 14 + logoH

      // Title
      doc.setFontSize(26)
      doc.setFont('helvetica', 'bold')
      doc.text('Chemical Register', pageWidth / 2, y + 10, { align: 'center' })

      // Company name
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Woodward Foods Australia', pageWidth / 2, y + 18, { align: 'center' })

      // Address
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text('334C River Rd. Swan Hill VIC 3585', pageWidth / 2, y + 24, { align: 'center' })
      doc.setTextColor(0)

      // Table
      autoTable(doc, {
        startY: y + 32,
        head: [['#', 'Chemical Name', 'Location', 'SDS']],
        body: filteredChemicals.map((c, i) => [
          i + 1,
          c.name,
          c.location,
          c.pdf_url ? 'Yes' : 'No',
        ]),
        headStyles: { fillColor: [40, 54, 61], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 249] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
        },
        styles: { fontSize: 10, cellPadding: 4 },
      })

      doc.save('Chemical_Register.pdf')
    }
    img.onerror = () => {
      // Fallback without logo
      let y = 14
      doc.setFontSize(26)
      doc.setFont('helvetica', 'bold')
      doc.text('Chemical Register', pageWidth / 2, y + 10, { align: 'center' })
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Woodward Foods Australia', pageWidth / 2, y + 18, { align: 'center' })
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text('334C River Rd. Swan Hill VIC 3585', pageWidth / 2, y + 24, { align: 'center' })
      doc.setTextColor(0)
      autoTable(doc, {
        startY: y + 32,
        head: [['#', 'Chemical Name', 'Location', 'SDS']],
        body: filteredChemicals.map((c, i) => [i + 1, c.name, c.location, c.pdf_url ? 'Yes' : 'No']),
        headStyles: { fillColor: [40, 54, 61], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 248, 249] },
        columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 3: { cellWidth: 20, halign: 'center' } },
        styles: { fontSize: 10, cellPadding: 4 },
      })
      doc.save('Chemical_Register.pdf')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SDS Chemicals</h1>
          <p className="text-muted-foreground">Safety Data Sheet chemical registry</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Chemical
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredChemicals.length} chemical{filteredChemicals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chemical Name</TableHead>
                <TableHead>Storage Location</TableHead>
                <TableHead>SDS Document</TableHead>
                <TableHead>Last Updated</TableHead>
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
              ) : filteredChemicals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No chemicals found matching your search' : 'No chemicals registered yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredChemicals.map((chemical) => (
                  <TableRow key={chemical.id}>
                    <TableCell className="font-medium">{chemical.name}</TableCell>
                    <TableCell>{chemical.location}</TableCell>
                    <TableCell>
                      {chemical.pdf_url ? (
                        <a
                          href={chemical.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          View SDS
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No document</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(chemical.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(chemical)}
                          title="Edit Chemical"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(chemical.id, chemical.name)}
                          title="Delete Chemical"
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChemical ? 'Edit Chemical' : 'Add New Chemical'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Chemical Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sodium Hypochlorite"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Storage Location *</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Chemical Storage Room A, Shelf 3"
                required
              />
            </div>

            {/* Validity Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Valid Since</label>
                <Input
                  type="date"
                  value={formData.valid_since}
                  onChange={(e) => setFormData({ ...formData, valid_since: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Valid Until</label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            {/* SDS Document Upload Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium">SDS Document (PDF)</label>

              {/* File Upload */}
              <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors"
                   style={{ borderColor: 'hsl(var(--border))' }}>
                <label htmlFor="sds-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                    Click to upload SDS PDF
                  </span>
                  <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    PDF files only
                  </span>
                </label>
                <input
                  id="sds-file-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected File Preview */}
              {selectedFile && (
                <div className="flex items-center justify-between p-2 rounded border"
                     style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                    <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{selectedFile.name}</span>
                    <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveSelectedFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Existing PDF URL */}
              {formData.pdf_url && !selectedFile && (
                <div className="flex items-center justify-between p-2 rounded border"
                     style={{ backgroundColor: 'hsl(var(--muted))', borderColor: 'hsl(var(--border))' }}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                    <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>Current SDS Document</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(formData.pdf_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingFile}>
                {uploadingFile ? 'Uploading...' : editingChemical ? 'Update' : 'Add'} Chemical
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
