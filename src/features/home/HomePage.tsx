import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Plus, X, AlertTriangle, Package, CheckCircle, Clock, FileWarning, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { Database } from '../../types/database'
import { AddStockDialog } from './AddStockDialog'

type Product = Database['public']['Tables']['products']['Row']
type Supplier = Database['public']['Tables']['suppliers']['Row']
type Certificate = Database['public']['Tables']['supplier_certificates']['Row']
type SDSChemical = Database['public']['Tables']['sds_chemicals']['Row']

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

interface CertificateWithSupplier extends Certificate {
  supplier: Supplier
}

export function HomePage() {
  // Ribbon navigation state
  const [activeView, setActiveView] = useState<'stock-tasks' | 'certificates' | 'chemicals'>('stock-tasks')

  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [selectedStockFilter, setSelectedStockFilter] = useState<'critical' | 'very-low' | 'low' | 'ordered'>('critical')
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('homeTodos')
    return saved ? JSON.parse(saved) : []
  })
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Certificate state
  const [certificates, setCertificates] = useState<CertificateWithSupplier[]>([])
  const [certificatesLoading, setCertificatesLoading] = useState(true)
  const [selectedCertFilter, setSelectedCertFilter] = useState<'all' | 'expired' | 'expiring-soon'>('all')

  // SDS Chemical state
  const [sdsChemicals, setSdsChemicals] = useState<SDSChemical[]>([])
  const [sdsLoading, setSdsLoading] = useState(true)
  const [selectedSdsFilter, setSelectedSdsFilter] = useState<'all' | 'expired' | 'expiring-soon'>('all')

  useEffect(() => {
    fetchLowStockProducts()
    fetchCertificates()
    fetchSDSChemicals()
  }, [])

  useEffect(() => {
    localStorage.setItem('homeTodos', JSON.stringify(todos))
  }, [todos])

  const fetchLowStockProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .not('min_stock', 'is', null) // Only products with min_stock set
        .order('soh', { ascending: true })

      if (error) throw error

      // Filter products where SOH <= 120% of min_stock
      const filtered = (data || []).filter(product => {
        if (!product.min_stock) return false
        return product.soh <= product.min_stock * 1.2
      })

      setLowStockProducts(filtered)
    } catch (error) {
      console.error('Error fetching low stock products:', error)
      toast.error('Failed to load low stock products')
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (product: Product) => {
    if (!product.min_stock) return null

    const percentage = (product.soh / product.min_stock) * 100

    if (percentage <= 100) {
      return { color: 'bg-red-100 text-red-700', label: 'Critical' }
    } else if (percentage <= 110) {
      return { color: 'bg-orange-100 text-orange-700', label: 'Very Low' }
    } else if (percentage <= 120) {
      return { color: 'bg-yellow-100 text-yellow-700', label: 'Low' }
    }
    return null
  }

  const addTodo = () => {
    if (!newTodo.trim()) return

    const newTodoItem: TodoItem = {
      id: Date.now().toString(),
      text: newTodo,
      completed: false,
    }

    setTodos([...todos, newTodoItem])
    setNewTodo('')
  }

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  const markAsOrdered = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          order_status: 'ordered',
          order_date: new Date().toISOString()
        })
        .eq('id', productId)

      if (error) throw error

      toast.success('Product marked as ordered')
      fetchLowStockProducts()
    } catch (error) {
      console.error('Error marking as ordered:', error)
      toast.error('Failed to mark as ordered')
    }
  }

  const handleOpenAddStockDialog = (product: Product) => {
    setSelectedProduct(product)
    setAddStockDialogOpen(true)
  }

  const handleAddStockConfirm = async (addQuantity: number) => {
    if (!selectedProduct) return

    try {
      const updates: any = {
        order_status: 'none',
        order_date: null,
        expected_arrival: null
      }

      // If user wants to add quantity, update SOH
      if (addQuantity > 0) {
        updates.soh = selectedProduct.soh + addQuantity
      }

      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', selectedProduct.id)

      if (error) throw error

      if (addQuantity > 0) {
        toast.success(`Added ${addQuantity} to stock and marked as arrived`)
      } else {
        toast.success('Product marked as arrived')
      }

      fetchLowStockProducts()
    } catch (error) {
      console.error('Error marking as arrived:', error)
      toast.error('Failed to mark as arrived')
    }
  }

  const fetchCertificates = async () => {
    try {
      setCertificatesLoading(true)
      const { data: certData, error } = await supabase
        .from('supplier_certificates')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('valid_until', { ascending: true })

      if (error) throw error

      // Transform the data to match our interface
      const certificatesWithSupplier: CertificateWithSupplier[] = (certData || []).map(cert => ({
        ...cert,
        supplier: Array.isArray(cert.supplier) ? cert.supplier[0] : cert.supplier
      }))

      setCertificates(certificatesWithSupplier)
    } catch (error) {
      console.error('Error fetching certificates:', error)
      toast.error('Failed to load certificates')
    } finally {
      setCertificatesLoading(false)
    }
  }

  const calculateDaysRemaining = (validUntil: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiryDate = new Date(validUntil)
    expiryDate.setHours(0, 0, 0, 0)
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getCertificateStatus = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return {
        color: 'bg-red-100 text-red-700 border-red-300',
        label: 'Expired',
        textColor: 'text-red-700',
        badge: 'bg-red-600 text-white'
      }
    } else if (daysRemaining <= 60) {
      return {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        label: 'Expiring Soon',
        textColor: 'text-yellow-700',
        badge: 'bg-yellow-600 text-white'
      }
    }
    return {
      color: 'bg-green-100 text-green-700 border-green-300',
      label: 'Valid',
      textColor: 'text-green-700',
      badge: 'bg-green-600 text-white'
    }
  }

  const fetchSDSChemicals = async () => {
    try {
      setSdsLoading(true)
      const { data, error } = await supabase
        .from('sds_chemicals')
        .select('*')
        .not('valid_until', 'is', null)
        .order('valid_until', { ascending: true })

      if (error) throw error

      setSdsChemicals(data || [])
    } catch (error) {
      console.error('Error fetching SDS chemicals:', error)
      toast.error('Failed to load SDS chemicals')
    } finally {
      setSdsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your inventory and tasks
        </p>
      </div>

      {/* Ribbon Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveView('stock-tasks')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeView === 'stock-tasks'
              ? 'border-[#6D9197] text-[#6D9197]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Stock & Tasks
        </button>
        <button
          onClick={() => setActiveView('certificates')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeView === 'certificates'
              ? 'border-[#6D9197] text-[#6D9197]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Certificate Monitoring
          {certificates.filter(c => calculateDaysRemaining(c.valid_until) <= 60).length > 0 && (
            <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
              {certificates.filter(c => calculateDaysRemaining(c.valid_until) <= 60).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveView('chemicals')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeView === 'chemicals'
              ? 'border-[#6D9197] text-[#6D9197]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          SDS Expiration
          {sdsChemicals.filter(c => c.valid_until && calculateDaysRemaining(c.valid_until) <= 60).length > 0 && (
            <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
              {sdsChemicals.filter(c => c.valid_until && calculateDaysRemaining(c.valid_until) <= 60).length}
            </span>
          )}
        </button>
      </div>

      {/* Stock & Tasks View */}
      {activeView === 'stock-tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products - Left Side */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>Low Stock Alert</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLowStockProducts}
              >
                Refresh
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Products below 120% of minimum stock level
            </p>

            {/* Filter Tabs */}
            <div className="flex gap-2 mt-4 border-b">
              <button
                onClick={() => setSelectedStockFilter('critical')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedStockFilter === 'critical'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Critical ({lowStockProducts.filter(p => getStockStatus(p)?.label === 'Critical').length})
              </button>
              <button
                onClick={() => setSelectedStockFilter('very-low')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedStockFilter === 'very-low'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Very Low ({lowStockProducts.filter(p => getStockStatus(p)?.label === 'Very Low').length})
              </button>
              <button
                onClick={() => setSelectedStockFilter('low')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedStockFilter === 'low'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Low ({lowStockProducts.filter(p => getStockStatus(p)?.label === 'Low').length})
              </button>
              <button
                onClick={() => setSelectedStockFilter('ordered')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedStockFilter === 'ordered'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Ordered ({lowStockProducts.filter(p => p.order_status === 'ordered').length})
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {lowStockProducts
                  .filter(product => {
                    if (selectedStockFilter === 'ordered') return product.order_status === 'ordered'
                    const status = getStockStatus(product)
                    if (selectedStockFilter === 'critical') return status?.label === 'Critical'
                    if (selectedStockFilter === 'very-low') return status?.label === 'Very Low'
                    if (selectedStockFilter === 'low') return status?.label === 'Low'
                    return true
                  })
                  .sort((a, b) => {
                    // Sort: non-ordered items first, ordered items last
                    const aOrdered = a.order_status === 'ordered' ? 1 : 0
                    const bOrdered = b.order_status === 'ordered' ? 1 : 0
                    return aOrdered - bOrdered
                  })
                  .map((product) => {
                  const status = getStockStatus(product)
                  const isOrdered = product.order_status === 'ordered'
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">{product.code}</div>
                          {isOrdered && (
                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Ordered
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {product.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Min Stock: {product.min_stock}
                        </div>
                        {isOrdered && product.order_date && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(product.order_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <div className={`text-lg font-bold px-3 py-1 rounded ${status?.color || 'bg-gray-100 text-gray-700'}`}>
                            {product.soh}
                          </div>
                          {status && (
                            <span className="text-xs text-muted-foreground">
                              {status.label}
                            </span>
                          )}
                        </div>
                        {isOrdered ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAddStockDialog(product)}
                            className="text-xs h-7"
                          >
                            Mark Arrived
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsOrdered(product.id)}
                            className="text-xs h-7"
                          >
                            Mark Ordered
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* To-Do List / Notepad - Right Side */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle>To-Do List</CardTitle>
            <p className="text-sm text-muted-foreground">
              Keep track of your tasks and notes
            </p>
          </CardHeader>
          <CardContent>
            {/* Add New Todo */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Add a new task..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button onClick={addTodo} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Todo List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {todos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks yet. Add one to get started!
                </div>
              ) : (
                todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`break-words ${
                        todo.completed
                          ? 'line-through text-muted-foreground'
                          : 'text-foreground'
                      }`}>
                        {todo.text}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Certificates View */}
      {activeView === 'certificates' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-orange-500" />
                <CardTitle>Certificate Expiration Monitoring</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCertificates}
              >
                Refresh
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Track supplier certificates and their expiration dates
            </p>

            {/* Filter Tabs */}
            <div className="flex gap-2 mt-4 border-b">
              <button
                onClick={() => setSelectedCertFilter('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedCertFilter === 'all'
                    ? 'border-[#6D9197] text-[#6D9197]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({certificates.length})
              </button>
              <button
                onClick={() => setSelectedCertFilter('expired')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedCertFilter === 'expired'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Expired ({certificates.filter(c => calculateDaysRemaining(c.valid_until) < 0).length})
              </button>
              <button
                onClick={() => setSelectedCertFilter('expiring-soon')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedCertFilter === 'expiring-soon'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Expiring Soon (≤60 days) ({certificates.filter(c => {
                  const days = calculateDaysRemaining(c.valid_until)
                  return days >= 0 && days <= 60
                }).length})
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {certificatesLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading certificates...
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8">
                <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No certificates found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {certificates
                  .filter(cert => {
                    const daysRemaining = calculateDaysRemaining(cert.valid_until)
                    if (selectedCertFilter === 'expired') return daysRemaining < 0
                    if (selectedCertFilter === 'expiring-soon') return daysRemaining >= 0 && daysRemaining <= 60
                    return true
                  })
                  .map((cert) => {
                    const daysRemaining = calculateDaysRemaining(cert.valid_until)
                    const status = getCertificateStatus(daysRemaining)

                    return (
                      <div
                        key={cert.id}
                        className={`p-4 rounded-lg border-2 ${status.color} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left side - Certificate info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-base truncate">
                                {cert.supplier?.name || 'Unknown Supplier'}
                              </h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${status.badge}`}>
                                {status.label}
                              </span>
                            </div>

                            <div className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Certificate:</span> {cert.file_name}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                              <div>
                                <span className="font-medium">Valid Since:</span>{' '}
                                {new Date(cert.valid_since).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div>
                                <span className="font-medium">Valid Until:</span>{' '}
                                {new Date(cert.valid_until).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>

                            {/* Contact info if available */}
                            {(cert.supplier?.email || cert.supplier?.phone) && (
                              <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300">
                                {cert.supplier.contact && (
                                  <div>Contact: {cert.supplier.contact}</div>
                                )}
                                {cert.supplier.email && (
                                  <div>Email: {cert.supplier.email}</div>
                                )}
                                {cert.supplier.phone && (
                                  <div>Phone: {cert.supplier.phone}</div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right side - Days remaining and action */}
                          <div className="flex flex-col items-end gap-2">
                            <div className={`text-center px-4 py-2 rounded-lg bg-white/50`}>
                              <div className={`text-2xl font-bold ${status.textColor}`}>
                                {daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining}
                              </div>
                              <div className="text-xs text-gray-600">
                                {daysRemaining < 0 ? 'days ago' : 'days left'}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(cert.file_url, '_blank')}
                              className="text-xs"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Certificate
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SDS Chemicals View */}
      {activeView === 'chemicals' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-orange-500" />
                <CardTitle>SDS Expiration Monitoring</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSDSChemicals}
              >
                Refresh
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Track chemical SDS documents and their expiration dates
            </p>

            {/* Filter Tabs */}
            <div className="flex gap-2 mt-4 border-b">
              <button
                onClick={() => setSelectedSdsFilter('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedSdsFilter === 'all'
                    ? 'border-[#6D9197] text-[#6D9197]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({sdsChemicals.length})
              </button>
              <button
                onClick={() => setSelectedSdsFilter('expired')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedSdsFilter === 'expired'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Expired ({sdsChemicals.filter(c => c.valid_until && calculateDaysRemaining(c.valid_until) < 0).length})
              </button>
              <button
                onClick={() => setSelectedSdsFilter('expiring-soon')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedSdsFilter === 'expiring-soon'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Expiring Soon (≤60 days) ({sdsChemicals.filter(c => {
                  if (!c.valid_until) return false
                  const days = calculateDaysRemaining(c.valid_until)
                  return days >= 0 && days <= 60
                }).length})
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {sdsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading SDS chemicals...
              </div>
            ) : sdsChemicals.length === 0 ? (
              <div className="text-center py-8">
                <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No SDS chemicals with expiration dates found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {sdsChemicals
                  .filter(chem => {
                    if (!chem.valid_until) return false
                    const daysRemaining = calculateDaysRemaining(chem.valid_until)
                    if (selectedSdsFilter === 'expired') return daysRemaining < 0
                    if (selectedSdsFilter === 'expiring-soon') return daysRemaining >= 0 && daysRemaining <= 60
                    return true
                  })
                  .map((chem) => {
                    if (!chem.valid_until) return null
                    const daysRemaining = calculateDaysRemaining(chem.valid_until)
                    const status = getCertificateStatus(daysRemaining)

                    return (
                      <div
                        key={chem.id}
                        className={`p-4 rounded-lg border-2 ${status.color} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left side - Chemical info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-base truncate">
                                {chem.name}
                              </h3>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${status.badge}`}>
                                {status.label}
                              </span>
                            </div>

                            <div className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Location:</span> {chem.location}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                              <div>
                                <span className="font-medium">Valid Since:</span>{' '}
                                {chem.valid_since ? new Date(chem.valid_since).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium">Valid Until:</span>{' '}
                                {new Date(chem.valid_until).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Right side - Days remaining and action */}
                          <div className="flex flex-col items-end gap-2">
                            <div className={`text-center px-4 py-2 rounded-lg bg-white/50`}>
                              <div className={`text-2xl font-bold ${status.textColor}`}>
                                {daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining}
                              </div>
                              <div className="text-xs text-gray-600">
                                {daysRemaining < 0 ? 'days ago' : 'days left'}
                              </div>
                            </div>

                            {chem.pdf_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(chem.pdf_url!, '_blank')}
                                className="text-xs"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View SDS
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Stock Dialog */}
      {selectedProduct && (
        <AddStockDialog
          isOpen={addStockDialogOpen}
          onClose={() => setAddStockDialogOpen(false)}
          productCode={selectedProduct.code}
          productDescription={selectedProduct.description || ''}
          currentSOH={selectedProduct.soh}
          onConfirm={handleAddStockConfirm}
        />
      )}
    </div>
  )
}
