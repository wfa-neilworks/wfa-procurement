import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Search, PlusCircle, MinusCircle,
  Package, AlertTriangle, CheckCircle, XCircle, Loader2,
  ArrowUpDown, X,
} from 'lucide-react'
import { toast } from 'sonner'
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

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']
type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert']

const CATEGORY_MAP: Record<string, string> = {
  'cartons-and-lids': 'Cartons and Lids',
  'shrinkbags': 'Shrinkbags',
  'carcass-bags': 'Carcass Bags',
  'soakerpads-liner-strapping': 'Soakerpads, Liner, Strapping',
  'other': 'Other',
}

type StockFilter = 'all' | 'healthy' | 'low' | 'critical' | 'out'
type SortKey = 'code' | 'soh' | 'description'

function getStockStatus(product: Product): 'out' | 'critical' | 'low' | 'healthy' {
  if (product.soh === 0) return 'out'
  if (!product.min_stock) return 'healthy'
  const pct = (product.soh / product.min_stock) * 100
  if (pct <= 50) return 'critical'
  if (pct <= 100) return 'low'
  return 'healthy'
}

const STATUS_CONFIG = {
  healthy: { label: 'Healthy', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  low:     { label: 'Low',     color: '#ca8a04', bg: '#fefce8', border: '#fde68a', text: '#92400e' },
  critical:{ label: 'Critical',color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  out:     { label: 'Out',     color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white',
  'placeholder:text-slate-400 text-slate-800',
  'focus:outline-none focus:ring-2 focus:ring-[#2d9da8]/30 focus:border-[#2d9da8]',
  'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

const labelCls = 'block text-xs font-semibold text-slate-600 mb-1'

export function InventoryPage() {
  const { category } = useParams<{ category: string }>()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('code')
  const [sortAsc, setSortAsc] = useState(true)

  // Dialog state
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const [productForm, setProductForm] = useState({
    code: '', description: '', min_stock: '', target_stock: '', price: '',
  })
  const [stockForm, setStockForm] = useState({
    type: 'add' as 'add' | 'deduct', quantity: '', note: '',
  })

  const categoryLabel = category ? CATEGORY_MAP[category] || 'Inventory' : 'Inventory'

  useEffect(() => { if (category) fetchProducts() }, [category])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products').select('*')
        .eq('category', category || '')
        .order('code', { ascending: true })
      if (error) throw error
      setProducts(data || [])
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Derived filtered + sorted list
  const filteredProducts = products
    .filter(p => {
      const q = searchTerm.toLowerCase()
      const matchSearch = !q ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.supplier_name?.toLowerCase().includes(q)
      const status = getStockStatus(p)
      const matchFilter =
        stockFilter === 'all' ? true :
        stockFilter === 'healthy' ? status === 'healthy' :
        stockFilter === 'low' ? status === 'low' :
        stockFilter === 'critical' ? status === 'critical' :
        stockFilter === 'out' ? status === 'out' : true
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      let va: string | number = sortKey === 'soh' ? a.soh : sortKey === 'description' ? a.description : a.code
      let vb: string | number = sortKey === 'soh' ? b.soh : sortKey === 'description' ? b.description : b.code
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      return sortAsc ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
    })

  // Metrics
  const total = products.length
  const healthy = products.filter(p => getStockStatus(p) === 'healthy').length
  const lowCount = products.filter(p => getStockStatus(p) === 'low').length
  const critical = products.filter(p => getStockStatus(p) === 'critical').length
  const outCount = products.filter(p => getStockStatus(p) === 'out').length

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
      setProductForm({ code: '', description: '', min_stock: '', target_stock: '', price: '' })
    }
    setIsProductDialogOpen(true)
  }

  const handleOpenStockDialog = (product: Product, type: 'add' | 'deduct') => {
    setSelectedProduct(product)
    setStockForm({ type, quantity: '', note: '' })
    setIsStockDialogOpen(true)
  }

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.code || !productForm.description) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      if (editingProduct) {
        const updateData: ProductUpdate = {
          code: productForm.code,
          description: productForm.description,
          min_stock: productForm.min_stock ? parseInt(productForm.min_stock) : null,
          target_stock: productForm.target_stock ? parseInt(productForm.target_stock) : null,
          price: productForm.price ? parseFloat(productForm.price) : null,
        }
        const { error } = await supabase.from('products').update(updateData).eq('id', editingProduct.id)
        if (error) throw error
        toast.success(`"${productForm.code}" updated`)
      } else {
        const insertData: ProductInsert = {
          code: productForm.code,
          description: productForm.description,
          category: category || '',
          min_stock: productForm.min_stock ? parseInt(productForm.min_stock) : null,
          target_stock: productForm.target_stock ? parseInt(productForm.target_stock) : null,
          price: productForm.price ? parseFloat(productForm.price) : null,
          soh: 0,
        }
        const { error } = await supabase.from('products').insert(insertData)
        if (error) throw error
        toast.success(`"${productForm.code}" added`)
      }
      setIsProductDialogOpen(false)
      fetchProducts()
    } catch (error: any) {
      if (error.code === '23505') toast.error('Product code already exists')
      else toast.error('Failed to save product')
    }
  }

  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !stockForm.quantity) { toast.error('Please enter a quantity'); return }
    const quantity = parseInt(stockForm.quantity)
    if (isNaN(quantity) || quantity <= 0) { toast.error('Quantity must be a positive number'); return }
    try {
      const delta = stockForm.type === 'add' ? quantity : -quantity
      const newSOH = selectedProduct.soh + delta
      if (newSOH < 0) { toast.error('Cannot deduct more than current stock'); return }
      const { error: pe } = await supabase.from('products').update({ soh: newSOH } as ProductUpdate).eq('id', selectedProduct.id)
      if (pe) throw pe
      const movement: StockMovementInsert = {
        product_id: selectedProduct.id,
        qty_delta: delta,
        note: stockForm.note || `${stockForm.type === 'add' ? 'Added' : 'Deducted'} ${quantity} units`,
        created_by: user?.id,
      }
      const { error: me } = await supabase.from('stock_movements').insert(movement)
      if (me) throw me
      toast.success(`${stockForm.type === 'add' ? 'Added' : 'Deducted'} ${quantity} units`, { description: `New stock: ${newSOH}` })
      setIsStockDialogOpen(false)
      fetchProducts()
    } catch {
      toast.error('Failed to update stock')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', deletingProduct.id)
      if (error) throw error
      toast.success(`"${deletingProduct.code}" deleted`)
      setIsDeleteDialogOpen(false)
      setDeletingProduct(null)
      fetchProducts()
    } catch {
      toast.error('Failed to delete product')
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const SortBtn = ({ col }: { col: SortKey }) => (
    <button onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors">
      <ArrowUpDown className="h-3 w-3" style={{ color: sortKey === col ? '#2d9da8' : undefined }} />
    </button>
  )

  // Filter tab config with counts
  const filterTabs: { key: StockFilter; label: string; count: number; activeColor: string; activeBg: string; activeBorder: string }[] = [
    { key: 'all',      label: 'All',      count: total,              activeColor: '#1d4ed8', activeBg: '#eff6ff', activeBorder: '#bfdbfe' },
    { key: 'healthy',  label: 'Healthy',  count: healthy,            activeColor: '#16a34a', activeBg: '#f0fdf4', activeBorder: '#bbf7d0' },
    { key: 'low',      label: 'Low',      count: lowCount,           activeColor: '#92400e', activeBg: '#fffbeb', activeBorder: '#fde68a' },
    { key: 'critical', label: 'Critical', count: critical,           activeColor: '#991b1b', activeBg: '#fef2f2', activeBorder: '#fecaca' },
    { key: 'out',      label: 'Out',      count: outCount,           activeColor: '#7f1d1d', activeBg: '#fef2f2', activeBorder: '#fca5a5' },
  ]

  return (
    <div className="flex flex-col min-h-0">
      {/* Page Header — scrolls away */}
      <div className="flex items-start justify-between gap-4 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 leading-tight">{categoryLabel}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage inventory and stock levels</p>
        </div>
        <button
          onClick={() => handleOpenProductDialog()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
          style={{ backgroundColor: '#1a2535' }}
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* ── Sticky inventory toolbar ── */}
      <div
        className="sticky top-0 z-10 bg-slate-50 pb-3"
        style={{ boxShadow: '0 2px 8px -2px rgba(0,0,0,0.08)' }}
      >
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Total Products', value: total,              icon: Package,       color: '#2d9da8', bg: '#f0fdfe', border: '#a5f3fc' },
            { label: 'Healthy Stock',  value: healthy,            icon: CheckCircle,   color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Low / Critical', value: lowCount + critical, icon: AlertTriangle, color: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
            { label: 'Out of Stock',   value: outCount,            icon: XCircle,       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border p-3.5 flex items-center gap-3" style={{ borderColor: m.border }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: m.bg }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
              <div>
                <div className="text-xl font-bold leading-none" style={{ color: m.color }}>{m.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by code, description, or supplier…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={inputCls + ' pl-9 pr-9'}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Segmented filter control */}
          <div className="flex gap-1 p-1 rounded-xl shrink-0" style={{ backgroundColor: '#e2e8f0' }}>
            {filterTabs.map(f => {
              const active = stockFilter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setStockFilter(f.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={active
                    ? {
                        backgroundColor: f.activeBg,
                        color: f.activeColor,
                        border: `1px solid ${f.activeBorder}`,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                      }
                    : { color: '#64748b', border: '1px solid transparent' }
                  }
                >
                  {f.label}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                    style={active
                      ? { backgroundColor: f.activeColor, color: '#fff' }
                      : { backgroundColor: '#cbd5e1', color: '#475569' }
                    }
                  >
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 760 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  <span className="flex items-center gap-1.5">Code <SortBtn col="code" /></span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5">Description <SortBtn col="description" /></span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  <span className="flex items-center justify-center gap-1.5">SOH <SortBtn col="soh" /></span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Min Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Target</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplier</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading products…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-10 w-10 text-slate-200" />
                      <p className="text-sm text-slate-400">
                        {searchTerm || stockFilter !== 'all'
                          ? 'No products match your search or filter'
                          : 'No products yet — add your first product'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, idx) => {
                  const status = getStockStatus(product)
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <tr
                      key={product.id}
                      className="transition-colors hover:bg-slate-50/80"
                      style={{ borderTop: idx > 0 ? '1px solid #f1f5f9' : undefined }}
                    >
                      {/* Code */}
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {product.code}
                      </td>
                      {/* Description */}
                      <td className="px-4 py-3 text-slate-700 max-w-[220px]">
                        <span className="line-clamp-2">{product.description}</span>
                      </td>
                      {/* SOH */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                        >
                          {product.soh}
                        </span>
                      </td>
                      {/* Min Stock */}
                      <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                        {product.min_stock ?? <span className="text-slate-300">—</span>}
                      </td>
                      {/* Target */}
                      <td className="px-4 py-3 text-center tabular-nums text-slate-500">
                        {product.target_stock ?? <span className="text-slate-300">—</span>}
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600 whitespace-nowrap">
                        {product.price != null ? `$${product.price.toFixed(2)}` : <span className="text-slate-300">—</span>}
                      </td>
                      {/* Supplier */}
                      <td className="px-4 py-3 text-slate-500 max-w-[140px]">
                        {product.supplier_name
                          ? <span className="truncate block">{product.supplier_name}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn
                            icon={PlusCircle}
                            label="Add Stock"
                            color="#16a34a"
                            hoverBg="#f0fdf4"
                            onClick={() => handleOpenStockDialog(product, 'add')}
                          />
                          <ActionBtn
                            icon={MinusCircle}
                            label="Deduct Stock"
                            color="#ea580c"
                            hoverBg="#fff7ed"
                            onClick={() => handleOpenStockDialog(product, 'deduct')}
                          />
                          <ActionBtn
                            icon={Pencil}
                            label="Edit Product"
                            color="#3b82f6"
                            hoverBg="#eff6ff"
                            onClick={() => handleOpenProductDialog(product)}
                          />
                          <ActionBtn
                            icon={Trash2}
                            label="Delete Product"
                            color="#dc2626"
                            hoverBg="#fef2f2"
                            onClick={() => { setDeletingProduct(product); setIsDeleteDialogOpen(true) }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

        {/* Table footer */}
        {!loading && filteredProducts.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filteredProducts.length}</span> of <span className="font-semibold text-slate-600">{total}</span> products
            </span>
            {(searchTerm || stockFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setStockFilter('all') }}
                className="text-xs text-[#2d9da8] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Add / Edit Product Dialog ─── */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitProduct} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Product Code <span className="text-red-400">*</span></label>
                <input
                  className={inputCls}
                  value={productForm.code}
                  onChange={e => setProductForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. CTN-001"
                  required
                  disabled={!!editingProduct}
                />
              </div>
              <div>
                <label className={labelCls}>Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number" step="0.01" min="0"
                    className={inputCls + ' pl-7'}
                    value={productForm.price}
                    onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls}>Description <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                value={productForm.description}
                onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Product description"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Min Stock Level</label>
                <input
                  type="number" min="0"
                  className={inputCls}
                  value={productForm.min_stock}
                  onChange={e => setProductForm(f => ({ ...f, min_stock: e.target.value }))}
                  placeholder="Minimum stock"
                />
              </div>
              <div>
                <label className={labelCls}>Target Stock Level</label>
                <input
                  type="number" min="0"
                  className={inputCls}
                  value={productForm.target_stock}
                  onChange={e => setProductForm(f => ({ ...f, target_stock: e.target.value }))}
                  placeholder="Target stock"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsProductDialogOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#1a2535' }}
              >
                {editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Stock Adjustment Dialog ─── */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              {stockForm.type === 'add'
                ? <PlusCircle className="h-4 w-4 text-green-600" />
                : <MinusCircle className="h-4 w-4 text-orange-500" />
              }
              {stockForm.type === 'add' ? 'Add Stock' : 'Deduct Stock'}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-800 text-sm">{selectedProduct.code}</div>
              <div className="text-xs text-slate-500 mt-0.5">{selectedProduct.description}</div>
              <div className="text-xs text-slate-600 mt-2">
                Current SOH: <span className="font-bold text-slate-800">{selectedProduct.soh}</span>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmitStock} className="space-y-4 pt-1">
            <div>
              <label className={labelCls}>Quantity <span className="text-red-400">*</span></label>
              <input
                type="number" min="1"
                className={inputCls}
                value={stockForm.quantity}
                onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="Enter quantity"
                required autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Note <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                className={inputCls}
                value={stockForm.note}
                onChange={e => setStockForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Reason for adjustment…"
              />
            </div>
            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsStockDialogOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: stockForm.type === 'add' ? '#16a34a' : '#ea580c' }}
              >
                {stockForm.type === 'add' ? 'Add Stock' : 'Deduct Stock'}
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
              Delete Product
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 pb-2">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-800">"{deletingProduct?.code}"</span>?
              This action cannot be undone.
            </p>
            {deletingProduct && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
                {deletingProduct.description}
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => { setIsDeleteDialogOpen(false); setDeletingProduct(null) }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all"
            >
              Delete Product
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Action button component ──────────────────────────────────────────────────
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
