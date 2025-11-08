import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, FileCheck, Package, ChevronDown, ChevronRight } from 'lucide-react'
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

type OrderForm = Database['public']['Tables']['order_forms']['Row']
type OrderFormInsert = Database['public']['Tables']['order_forms']['Insert']
type OrderFormUpdate = Database['public']['Tables']['order_forms']['Update']
type Product = Database['public']['Tables']['products']['Row']
type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert']

interface ProductWithSelected extends Product {
  selected: boolean
  deductQty: number
}

const CATEGORY_MAP: Record<string, string> = {
  'cartons-and-lids': 'Cartons and Lids',
  'shrinkbags': 'Shrinkbags',
  'carcass-bags': 'Carcass Bags',
  'soakerpads-liner-strapping': 'Soakerpads, Liner, Strapping',
  'other': 'Other'
}

export function OrderFormsPage() {
  const [orderForms, setOrderForms] = useState<OrderForm[]>([])
  const [filteredForms, setFilteredForms] = useState<OrderForm[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUseFormDialogOpen, setIsUseFormDialogOpen] = useState(false)
  const [editingForm, setEditingForm] = useState<OrderForm | null>(null)
  const [usingForm, setUsingForm] = useState<OrderForm | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
  })

  const [productsWithSelection, setProductsWithSelection] = useState<ProductWithSelected[]>([])
  const [useFormProducts, setUseFormProducts] = useState<ProductWithSelected[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchOrderForms()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredForms(orderForms)
    } else {
      const filtered = orderForms.filter((form) =>
        form.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredForms(filtered)
    }
  }, [searchTerm, orderForms])

  const fetchOrderForms = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('order_forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrderForms(data || [])
    } catch (error) {
      console.error('Error fetching order forms:', error)
      alert('Failed to load order forms')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('code', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleOpenDialog = (form?: OrderForm) => {
    if (form) {
      setEditingForm(form)
      setFormData({
        title: form.title,
      })
      // Set selected products based on form's item_ids
      const selected = products.map((p) => ({
        ...p,
        selected: form.item_ids.includes(p.id),
        deductQty: 0,
      }))
      setProductsWithSelection(selected)
    } else {
      setEditingForm(null)
      setFormData({
        title: '',
      })
      // Initialize all products as unselected
      const selected = products.map((p) => ({
        ...p,
        selected: false,
        deductQty: 0,
      }))
      setProductsWithSelection(selected)
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingForm(null)
  }

  const toggleProductSelection = (productId: string) => {
    setProductsWithSelection((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, selected: !p.selected } : p
      )
    )
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title) {
      alert('Please enter a form title')
      return
    }

    const selectedIds = productsWithSelection
      .filter((p) => p.selected)
      .map((p) => p.id)

    if (selectedIds.length === 0) {
      alert('Please select at least one product')
      return
    }

    try {
      if (editingForm) {
        const updateData: OrderFormUpdate = {
          title: formData.title,
          item_ids: selectedIds,
        }

        const { error } = await supabase
          .from('order_forms')
          .update(updateData)
          .eq('id', editingForm.id)

        if (error) throw error
      } else {
        const insertData: OrderFormInsert = {
          title: formData.title,
          item_ids: selectedIds,
        }

        const { error } = await supabase.from('order_forms').insert(insertData)

        if (error) throw error
      }

      handleCloseDialog()
      fetchOrderForms()
    } catch (error) {
      console.error('Error saving order form:', error)
      alert('Failed to save order form')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete order form "${title}"?`)) {
      return
    }

    try {
      const { error } = await supabase.from('order_forms').delete().eq('id', id)

      if (error) throw error
      fetchOrderForms()
    } catch (error) {
      console.error('Error deleting order form:', error)
      alert('Failed to delete order form')
    }
  }

  const handleOpenUseFormDialog = (form: OrderForm) => {
    setUsingForm(form)
    // Get products that are in this form
    const formProducts = products
      .filter((p) => form.item_ids.includes(p.id))
      .map((p) => ({
        ...p,
        selected: true,
        deductQty: 0,
      }))
    setUseFormProducts(formProducts)
    setIsUseFormDialogOpen(true)
  }

  const handleCloseUseFormDialog = () => {
    setIsUseFormDialogOpen(false)
    setUsingForm(null)
    setUseFormProducts([])
  }

  const updateDeductQty = (productId: string, qty: number) => {
    setUseFormProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, deductQty: qty } : p))
    )
  }

  const handleApplyForm = async () => {
    const itemsToDeduct = useFormProducts.filter((p) => p.deductQty > 0)

    if (itemsToDeduct.length === 0) {
      alert('Please enter quantities to deduct')
      return
    }

    // Validate stock levels
    for (const item of itemsToDeduct) {
      if (item.deductQty > item.soh) {
        alert(
          `Cannot deduct ${item.deductQty} from "${item.description}" - only ${item.soh} in stock`
        )
        return
      }
    }

    try {
      // Process each deduction
      for (const item of itemsToDeduct) {
        // Update product SOH
        const newSoh = item.soh - item.deductQty
        const { error: updateError } = await supabase
          .from('products')
          .update({
            soh: newSoh,
            total_out: item.total_out + item.deductQty,
          })
          .eq('id', item.id)

        if (updateError) throw updateError

        // Log stock movement
        const movement: StockMovementInsert = {
          product_id: item.id,
          qty_delta: -item.deductQty,
          note: `Deducted using form: ${usingForm?.title}`,
        }

        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert(movement)

        if (movementError) throw movementError
      }

      alert('Stock deducted successfully')
      handleCloseUseFormDialog()
      // Refresh products if needed
      fetchProducts()
    } catch (error) {
      console.error('Error applying form:', error)
      alert('Failed to apply deductions')
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Forms</h1>
          <p className="text-muted-foreground">
            Saved deduction templates for quick inventory adjustments
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredForms.length} form{filteredForms.length !== 1 ? 's' : ''}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form Title</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No forms found' : 'No forms created yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        {form.item_ids.length} product{form.item_ids.length !== 1 ? 's' : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(form.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUseFormDialog(form)}
                        >
                          <FileCheck className="h-4 w-4 mr-1" />
                          Use Form
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(form)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(form.id, form.title)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingForm ? 'Edit Form' : 'Create New Form'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Form Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Weekly Production Deduction"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Products *
              </label>
              <div className="border rounded-md max-h-[500px] overflow-y-auto">
                {Object.keys(CATEGORY_MAP).map((category) => {
                  const categoryProducts = productsWithSelection.filter(
                    (p) => p.category === category
                  )
                  if (categoryProducts.length === 0) return null

                  const isExpanded = expandedCategories.has(category)
                  const selectedCount = categoryProducts.filter((p) => p.selected).length

                  return (
                    <div key={category} className="border-b last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full px-4 py-3 font-semibold text-white text-sm flex items-center justify-between hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#6D9197' }}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>{CATEGORY_MAP[category]}</span>
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">
                          {selectedCount}/{categoryProducts.length} selected
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="divide-y bg-gray-50">
                          {categoryProducts.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer"
                              onClick={() => toggleProductSelection(product.id)}
                            >
                              <input
                                type="checkbox"
                                checked={product.selected}
                                onChange={() => {}}
                                className="h-4 w-4"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{product.code}</div>
                                <div className="text-sm text-muted-foreground">
                                  {product.description}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                SOH: {product.soh}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {productsWithSelection.filter((p) => p.selected).length} products selected
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingForm ? 'Update' : 'Create'} Form
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Use Form Dialog */}
      <Dialog open={isUseFormDialogOpen} onOpenChange={setIsUseFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Form: {usingForm?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter quantities to deduct for each product:
            </p>
            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <div className="divide-y">
                {useFormProducts.map((product) => (
                  <div key={product.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{product.code}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.description}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        SOH: {product.soh}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={product.soh}
                      value={product.deductQty || ''}
                      onChange={(e) =>
                        updateDeductQty(product.id, parseInt(e.target.value) || 0)
                      }
                      placeholder="Quantity to deduct"
                    />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseUseFormDialog}>
                Cancel
              </Button>
              <Button onClick={handleApplyForm}>Apply Deductions</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
