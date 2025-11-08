import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, FileText, ExternalLink } from 'lucide-react'
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
  })

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
      alert('Failed to load SDS chemicals')
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
      })
    } else {
      setEditingChemical(null)
      setFormData({
        name: '',
        location: '',
        pdf_url: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingChemical(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.location) {
      alert('Please fill in all required fields')
      return
    }

    try {
      if (editingChemical) {
        // Update existing chemical
        const updateData: SDSChemicalUpdate = {
          name: formData.name,
          location: formData.location,
          pdf_url: formData.pdf_url || null,
        }

        const { error } = await supabase
          .from('sds_chemicals')
          .update(updateData)
          .eq('id', editingChemical.id)

        if (error) throw error
      } else {
        // Create new chemical
        const insertData: SDSChemicalInsert = {
          name: formData.name,
          location: formData.location,
          pdf_url: formData.pdf_url || null,
        }

        const { error } = await supabase
          .from('sds_chemicals')
          .insert(insertData)

        if (error) throw error
      }

      handleCloseDialog()
      fetchChemicals()
    } catch (error) {
      console.error('Error saving chemical:', error)
      alert('Failed to save chemical')
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
      fetchChemicals()
    } catch (error) {
      console.error('Error deleting chemical:', error)
      alert('Failed to delete chemical')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SDS Chemicals</h1>
          <p className="text-muted-foreground">Safety Data Sheet chemical registry</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Chemical
        </Button>
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
        <div className="overflow-x-auto">
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
            <div>
              <label className="text-sm font-medium">SDS Document URL (Optional)</label>
              <Input
                type="url"
                value={formData.pdf_url}
                onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                placeholder="https://example.com/sds/document.pdf"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide a link to the Safety Data Sheet PDF document
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingChemical ? 'Update' : 'Add'} Chemical
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
