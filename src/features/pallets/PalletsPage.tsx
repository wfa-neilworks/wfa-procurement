import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
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

interface PalletUnload {
  id: string
  container: string
  date: string
  count: number
  note: string | null
  created_at: string
}

export function PalletsPage() {
  const { user } = useAuth()
  const [pallets, setPallets] = useState<PalletUnload[]>([])
  const [filteredPallets, setFilteredPallets] = useState<PalletUnload[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPallet, setEditingPallet] = useState<PalletUnload | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    container: '',
    date: new Date().toISOString().split('T')[0],
    count: '',
    note: '',
  })

  // Fetch pallets
  useEffect(() => {
    fetchPallets()
  }, [])

  // Filter pallets based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPallets(pallets)
    } else {
      const filtered = pallets.filter(
        (p) =>
          p.container.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.note?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredPallets(filtered)
    }
  }, [searchTerm, pallets])

  const fetchPallets = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pallet_unloads')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setPallets(data || [])
    } catch (error) {
      console.error('Error fetching pallets:', error)
      toast.error('Failed to load pallet data')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (pallet?: PalletUnload) => {
    if (pallet) {
      setEditingPallet(pallet)
      setFormData({
        container: pallet.container,
        date: pallet.date,
        count: pallet.count.toString(),
        note: pallet.note || '',
      })
    } else {
      setEditingPallet(null)
      setFormData({
        container: '',
        date: new Date().toISOString().split('T')[0],
        count: '',
        note: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingPallet(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.container || !formData.date || !formData.count) {
      toast.error('Please fill in all required fields')
      return
    }

    const count = parseInt(formData.count)
    if (isNaN(count) || count <= 0) {
      toast.error('Count must be a positive number')
      return
    }

    try {
      if (editingPallet) {
        // Update existing pallet
        const { error } = await supabase
          .from('pallet_unloads')
          .update({
            container: formData.container,
            date: formData.date,
            count: count,
            note: formData.note || null,
          })
          .eq('id', editingPallet.id)

        if (error) throw error
        toast.success(`Successfully updated pallet unload for ${formData.container}`)
      } else {
        // Create new pallet
        const { error } = await supabase
          .from('pallet_unloads')
          .insert({
            container: formData.container,
            date: formData.date,
            count: count,
            note: formData.note || null,
            created_by: user?.id,
          })

        if (error) throw error
        toast.success(`Successfully added pallet unload for ${formData.container}`)
      }

      handleCloseDialog()
      fetchPallets()
    } catch (error) {
      console.error('Error saving pallet:', error)
      toast.error('Failed to save pallet data')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pallet unload record?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('pallet_unloads')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Successfully deleted pallet unload record')
      fetchPallets()
    } catch (error) {
      console.error('Error deleting pallet:', error)
      toast.error('Failed to delete pallet record')
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
          <h1 className="text-3xl font-bold tracking-tight">Pallet Monitoring</h1>
          <p className="text-muted-foreground">Track pallet unloading logs</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pallet Unload
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by container or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredPallets.length} record{filteredPallets.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Container</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead>Note</TableHead>
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
              ) : filteredPallets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No pallets found matching your search' : 'No pallet unload records yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPallets.map((pallet) => (
                  <TableRow key={pallet.id}>
                    <TableCell className="font-medium">{formatDate(pallet.date)}</TableCell>
                    <TableCell>{pallet.container}</TableCell>
                    <TableCell className="text-right">{pallet.count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {pallet.note || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(pallet)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(pallet.id)}
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
              {editingPallet ? 'Edit Pallet Unload' : 'Add Pallet Unload'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Container *</label>
              <Input
                value={formData.container}
                onChange={(e) => setFormData({ ...formData, container: e.target.value })}
                placeholder="e.g., Container A"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Pallet Count *</label>
              <Input
                type="number"
                min="1"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                placeholder="Enter number of pallets"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note (Optional)</label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPallet ? 'Update' : 'Add'} Pallet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
