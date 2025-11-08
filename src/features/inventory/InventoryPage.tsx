import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, TrendingUp, TrendingDown, Package } from 'lucide-react'
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
import type { Database } from '../../types/database'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert']

const CATEGORY_MAP: Record<string, string> = {
  'cartons-and-lids': 'Cartons and Lids',
  'shrinkbags': 'Shrinkbags',
  'carcass-bags': 'Carcass Bags',
  'soakerpads-liner-strapping': 'Soakerpads, Liner, Strapping',
  'other': 'Other'
}

export function InventoryPage() {
  const { category } = useParams<{ category: string }>()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog state
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Form state
  const [productForm, setProductForm] = useState({
    code: '',
    description: '',
    min_stock: '',
    target_stock: '',
    price: '',
  })

  const [stockForm, setStockForm] = useState({
    type: 'add' as 'add' | 'deduct',
    quantity: '',
    note: '',
  })

  const categoryLabel = category ? CATEGORY_MAP[category] || 'Inventory' : 'Inventory'

  // Fetch products
  useEffect(() => {
    if (category) {
      fetchProducts()
    }
  }, [category])

  // Filter products based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(
        (p) =>
          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category || '')
        .order('code', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        code: product.code,
        description: product.description,
        min_stock: product.min_stock?.toString() || '',
        target_stock: product.target_stock?.toString() || '',
        price: product.price?.toString() || '',
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        code: '',
        description: '',
        min_stock: '',
        target_stock: '',
        price: '',
      })
    }
    setIsProductDialogOpen(true)
  }

  const handleOpenStockDialog = (product: Product, type: 'add' | 'deduct') => {
    setSelectedProduct(product)
    setStockForm({
      type,
      quantity: '',
      note: '',
    })
    setIsStockDialogOpen(true)
  }

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productForm.code || !productForm.description) {
      alert('Please fill in all required fields')
      return
    }

    try {
      if (editingProduct) {
        // Update existing product
        const updateData: ProductUpdate = {
          code: productForm.code,
          description: productForm.description,
          min_stock: productForm.min_stock ? parseInt(productForm.min_stock) : null,
          target_stock: productForm.target_stock ? parseInt(productForm.target_stock) : null,
          price: productForm.price ? parseFloat(productForm.price) : null,
        }

        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', editingProduct.id)

        if (error) throw error
      } else {
        // Create new product
        const insertData: ProductInsert = {
          code: productForm.code,
          description: productForm.description,
          category: category || '',
          min_stock: productForm.min_stock ? parseInt(productForm.min_stock) : null,
          target_stock: productForm.target_stock ? parseInt(productForm.target_stock) : null,
          price: productForm.price ? parseFloat(productForm.price) : null,
          soh: 0,
        }

        const { error } = await supabase
          .from('products')
          .insert(insertData)

        if (error) throw error
      }

      setIsProductDialogOpen(false)
      fetchProducts()
    } catch (error: any) {
      console.error('Error saving product:', error)
      if (error.code === '23505') {
        alert('Product code already exists')
      } else {
        alert('Failed to save product')
      }
    }
  }

  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProduct || !stockForm.quantity) {
      alert('Please enter a quantity')
      return
    }

    const quantity = parseInt(stockForm.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      alert('Quantity must be a positive number')
      return
    }

    try {
      const delta = stockForm.type === 'add' ? quantity : -quantity
      const newSOH = selectedProduct.soh + delta

      if (newSOH < 0) {
        alert('Cannot deduct more than current stock')
        return
      }

      // Update product SOH
      const productUpdateData: ProductUpdate = { soh: newSOH }
      const { error: productError } = await supabase
        .from('products')
        .update(productUpdateData)
        .eq('id', selectedProduct.id)

      if (productError) throw productError

      // Record stock movement
      const movementInsertData: StockMovementInsert = {
        product_id: selectedProduct.id,
        qty_delta: delta,
        note: stockForm.note || `${stockForm.type === 'add' ? 'Added' : 'Deducted'} ${quantity} units`,
        created_by: user?.id,
      }

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert(movementInsertData)

      if (movementError) throw movementError

      setIsStockDialogOpen(false)
      fetchProducts()
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Failed to update stock')
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete product "${code}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const getLowStockStatus = (product: Product) => {
    if (!product.min_stock) return null
    if (product.soh <= product.min_stock) {
      return 'low'
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{categoryLabel}</h1>
          <p className="text-muted-foreground">Manage inventory and stock levels</p>
        </div>
        <Button onClick={() => handleOpenProductDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, description, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">
              {filteredProducts.filter(p => getLowStockStatus(p) === 'low').length} low stock
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">SOH</TableHead>
                <TableHead className="text-right">Min Stock</TableHead>
                <TableHead className="text-right">Target Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No products found matching your search' : 'No products yet. Add your first product!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const lowStock = getLowStockStatus(product)
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.code}</TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell className="text-right">
                        <span className={lowStock === 'low' ? 'text-destructive font-semibold' : ''}>
                          {product.soh}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.min_stock || '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.target_stock || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.price ? `$${product.price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.supplier_name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenStockDialog(product, 'add')}
                            title="Add Stock"
                          >
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenStockDialog(product, 'deduct')}
                            title="Deduct Stock"
                          >
                            <TrendingDown className="h-4 w-4 text-orange-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenProductDialog(product)}
                            title="Edit Product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id, product.code)}
                            title="Delete Product"
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

      {/* Add/Edit Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Product Code *</label>
                <Input
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  placeholder="e.g., CTN-001"
                  required
                  disabled={!!editingProduct}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Min Stock Level</label>
                <Input
                  type="number"
                  min="0"
                  value={productForm.min_stock}
                  onChange={(e) => setProductForm({ ...productForm, min_stock: e.target.value })}
                  placeholder="Minimum stock"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Stock Level</label>
                <Input
                  type="number"
                  min="0"
                  value={productForm.target_stock}
                  onChange={(e) => setProductForm({ ...productForm, target_stock: e.target.value })}
                  placeholder="Target stock"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingProduct ? 'Update' : 'Add'} Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockForm.type === 'add' ? 'Add Stock' : 'Deduct Stock'}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="font-medium">{selectedProduct.code}</div>
              <div className="text-sm text-muted-foreground">{selectedProduct.description}</div>
              <div className="text-sm mt-2">Current Stock: <span className="font-semibold">{selectedProduct.soh}</span></div>
            </div>
          )}
          <form onSubmit={handleSubmitStock} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                min="1"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                placeholder="Enter quantity"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note (Optional)</label>
              <Input
                value={stockForm.note}
                onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                placeholder="Reason for adjustment..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" style={{ backgroundColor: stockForm.type === 'add' ? '#10b981' : '#f97316' }}>
                {stockForm.type === 'add' ? 'Add' : 'Deduct'} Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}