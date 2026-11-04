import { useState, useEffect } from 'react'
import {
  Plus, X, AlertTriangle, Package, CheckCircle, Clock,
  FileWarning, ExternalLink, RefreshCw, ClipboardList,
  TrendingDown, Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { Database } from '../../types/database'
import { AddStockDialog } from './AddStockDialog'
import { ReplaceCertificateDialog } from './ReplaceCertificateDialog'
import { ReplaceSdsDialog } from './ReplaceSdsDialog'

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

// ─── Shared filter tab strip ─────────────────────────────────────────────────

interface FilterTab {
  key: string
  label: string
  count: number
  activeColor: string
  activeBg: string
  activeBorder: string
}

function FilterTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: FilterTab[]
  active: string
  onChange: (k: string) => void
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-slate-100" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
          style={
            active === t.key
              ? { backgroundColor: 'white', color: t.activeColor, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
              : { color: '#64748b' }
          }
        >
          {t.label}
          <span
            className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
            style={
              active === t.key
                ? { backgroundColor: t.activeBg, color: t.activeColor }
                : { backgroundColor: '#e2e8f0', color: '#94a3b8' }
            }
          >
            {t.count}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomePage() {
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

  const [certificates, setCertificates] = useState<CertificateWithSupplier[]>([])
  const [certificatesLoading, setCertificatesLoading] = useState(true)
  const [selectedCertFilter, setSelectedCertFilter] = useState<'all' | 'expired' | 'expiring-soon'>('all')

  const [sdsChemicals, setSdsChemicals] = useState<SDSChemical[]>([])
  const [sdsLoading, setSdsLoading] = useState(true)
  const [selectedSdsFilter, setSelectedSdsFilter] = useState<'all' | 'expired' | 'expiring-soon'>('all')

  const [replaceCertDialogOpen, setReplaceCertDialogOpen] = useState(false)
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithSupplier | null>(null)

  const [replaceSdsDialogOpen, setReplaceSdsDialogOpen] = useState(false)
  const [selectedSdsChemical, setSelectedSdsChemical] = useState<SDSChemical | null>(null)

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
        .not('min_stock', 'is', null)
        .order('soh', { ascending: true })
      if (error) throw error
      const filtered = (data || []).filter(p => p.min_stock && p.soh <= p.min_stock * 1.2)
      setLowStockProducts(filtered)
    } catch {
      toast.error('Failed to load low stock products')
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (product: Product) => {
    if (!product.min_stock) return null
    const pct = (product.soh / product.min_stock) * 100
    if (pct <= 100) return { label: 'Critical', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
    if (pct <= 110) return { label: 'Very Low', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' }
    if (pct <= 120) return { label: 'Low', color: '#ca8a04', bg: '#fefce8', border: '#fde68a' }
    return null
  }

  const addTodo = () => {
    if (!newTodo.trim()) return
    setTodos(prev => [...prev, { id: Date.now().toString(), text: newTodo.trim(), completed: false }])
    setNewTodo('')
  }

  const toggleTodo = (id: string) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

  const deleteTodo = (id: string) =>
    setTodos(prev => prev.filter(t => t.id !== id))

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTodo()
  }

  const markAsOrdered = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ order_status: 'ordered', order_date: new Date().toISOString() })
        .eq('id', productId)
      if (error) throw error
      toast.success('Product marked as ordered')
      fetchLowStockProducts()
    } catch {
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
      const updates: Record<string, unknown> = { order_status: 'none', order_date: null, expected_arrival: null }
      if (addQuantity > 0) updates.soh = selectedProduct.soh + addQuantity
      const { error } = await supabase.from('products').update(updates).eq('id', selectedProduct.id)
      if (error) throw error
      toast.success(addQuantity > 0 ? `Added ${addQuantity} to stock and marked as arrived` : 'Product marked as arrived')
      fetchLowStockProducts()
    } catch {
      toast.error('Failed to mark as arrived')
    }
  }

  const fetchCertificates = async () => {
    try {
      setCertificatesLoading(true)
      const { data: certData, error } = await supabase
        .from('supplier_certificates')
        .select('*, supplier:suppliers(*)')
        .order('valid_until', { ascending: true })
      if (error) throw error
      const withSupplier: CertificateWithSupplier[] = (certData || []).map(cert => ({
        ...cert,
        supplier: Array.isArray(cert.supplier) ? cert.supplier[0] : cert.supplier,
      }))
      setCertificates(withSupplier)
    } catch {
      toast.error('Failed to load certificates')
    } finally {
      setCertificatesLoading(false)
    }
  }

  const calculateDaysRemaining = (validUntil: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exp = new Date(validUntil)
    exp.setHours(0, 0, 0, 0)
    return Math.ceil((exp.getTime() - today.getTime()) / 86400000)
  }

  const getCertificateStatus = (days: number) => {
    if (days < 0) return { label: 'Expired', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', badgeBg: '#dc2626' }
    if (days <= 60) return { label: 'Expiring Soon', color: '#ca8a04', bg: '#fefce8', border: '#fde68a', badgeBg: '#ca8a04' }
    return { label: 'Valid', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', badgeBg: '#16a34a' }
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
    } catch {
      toast.error('Failed to load SDS chemicals')
    } finally {
      setSdsLoading(false)
    }
  }

  // Counts for tab badges
  const criticalCount = lowStockProducts.filter(p => getStockStatus(p)?.label === 'Critical').length
  const veryLowCount = lowStockProducts.filter(p => getStockStatus(p)?.label === 'Very Low').length
  const lowCount = lowStockProducts.filter(p => getStockStatus(p)?.label === 'Low').length
  const orderedCount = lowStockProducts.filter(p => p.order_status === 'ordered').length

  const certAlertCount = certificates.filter(c => calculateDaysRemaining(c.valid_until) <= 60).length
  const sdsAlertCount = sdsChemicals.filter(c => c.valid_until && calculateDaysRemaining(c.valid_until) <= 60).length

  return (
    <div className="space-y-5">
      {/* Top navigation tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { key: 'stock-tasks', label: 'Stock & Tasks', alert: 0 },
          { key: 'certificates', label: 'Certificate Monitoring', alert: certAlertCount },
          { key: 'chemicals', label: 'SDS Expiration', alert: sdsAlertCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key as typeof activeView)}
            className="relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-150"
            style={{
              color: activeView === tab.key ? '#1e293b' : '#64748b',
              borderBottom: activeView === tab.key ? '2px solid #2d9da8' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            {tab.alert > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: tab.alert > 0 ? '#f59e0b' : '#94a3b8' }}
              >
                {tab.alert}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Stock & Tasks ─── */}
      {activeView === 'stock-tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Low Stock Alert */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#fff7ed' }}>
                    <TrendingDown className="h-5 w-5" style={{ color: '#ea580c' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">Low Stock Alert</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Below 120% of minimum stock level</p>
                  </div>
                </div>
                <button
                  onClick={fetchLowStockProducts}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              <div className="mt-4">
                <FilterTabs
                  active={selectedStockFilter}
                  onChange={k => setSelectedStockFilter(k as typeof selectedStockFilter)}
                  tabs={[
                    { key: 'critical', label: 'Critical', count: criticalCount, activeColor: '#dc2626', activeBg: '#fee2e2', activeBorder: '' },
                    { key: 'very-low', label: 'Very Low', count: veryLowCount, activeColor: '#ea580c', activeBg: '#ffedd5', activeBorder: '' },
                    { key: 'low', label: 'Low', count: lowCount, activeColor: '#ca8a04', activeBg: '#fef9c3', activeBorder: '' },
                    { key: 'ordered', label: 'Ordered', count: orderedCount, activeColor: '#16a34a', activeBg: '#dcfce7', activeBorder: '' },
                  ]}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ maxHeight: '480px' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading stock data…</span>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                    <Package className="h-6 w-6 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">All stock levels are healthy</p>
                  <p className="text-xs text-slate-400 mt-1">No items below minimum threshold</p>
                </div>
              ) : (() => {
                const filtered = lowStockProducts
                  .filter(p => {
                    if (selectedStockFilter === 'ordered') return p.order_status === 'ordered'
                    const s = getStockStatus(p)
                    if (selectedStockFilter === 'critical') return s?.label === 'Critical'
                    if (selectedStockFilter === 'very-low') return s?.label === 'Very Low'
                    if (selectedStockFilter === 'low') return s?.label === 'Low'
                    return true
                  })
                  .sort((a, b) => (a.order_status === 'ordered' ? 1 : 0) - (b.order_status === 'ordered' ? 1 : 0))

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-slate-400">No items in this category</p>
                    </div>
                  )
                }

                return filtered.map(product => {
                  const status = getStockStatus(product)
                  const isOrdered = product.order_status === 'ordered'
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{product.code}</span>
                          {isOrdered && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                              <CheckCircle className="h-2.5 w-2.5" />
                              Ordered
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{product.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-slate-400">Min: <span className="font-medium text-slate-500">{product.min_stock}</span></span>
                          {isOrdered && product.order_date && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(product.order_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="text-center px-2.5 py-1.5 rounded-lg min-w-[52px]"
                          style={{
                            backgroundColor: isOrdered ? '#f0fdf4' : (status?.bg ?? '#f8fafc'),
                            border: `1px solid ${isOrdered ? '#bbf7d0' : (status?.border ?? '#e2e8f0')}`,
                          }}
                        >
                          <div
                            className="text-base font-bold leading-none"
                            style={{ color: isOrdered ? '#16a34a' : (status?.color ?? '#475569') }}
                          >
                            {product.soh}
                          </div>
                          <div className="text-[9px] font-medium mt-0.5" style={{ color: isOrdered ? '#16a34a' : (status?.color ?? '#94a3b8') }}>
                            {isOrdered ? 'Ordered' : (status?.label ?? 'SOH')}
                          </div>
                        </div>

                        {isOrdered ? (
                          <button
                            onClick={() => handleOpenAddStockDialog(product)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                            style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}
                          >
                            Arrived
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsOrdered(product.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          >
                            Order
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* To-Do List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#eff6ff' }}>
                  <ClipboardList className="h-5 w-5" style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">To-Do List</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {todos.length === 0 ? 'No tasks yet' : `${todos.filter(t => t.completed).length} of ${todos.length} completed`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  placeholder="Add a new task…"
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2d9da8]/30 focus:border-[#2d9da8] transition-all"
                />
                <button
                  onClick={addTodo}
                  disabled={!newTodo.trim()}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  style={{ backgroundColor: '#2d9da8' }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ maxHeight: '480px' }}>
              {todos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <ClipboardList className="h-6 w-6 text-blue-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No tasks yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add a task above to get started</p>
                </div>
              ) : (
                todos.map(todo => (
                  <div
                    key={todo.id}
                    className="group flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: todo.completed ? '#2d9da8' : '#cbd5e1',
                        backgroundColor: todo.completed ? '#2d9da8' : 'white',
                      }}
                    >
                      {todo.completed && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <p
                      className="flex-1 text-sm leading-relaxed break-words min-w-0"
                      style={{ color: todo.completed ? '#94a3b8' : '#334155', textDecoration: todo.completed ? 'line-through' : 'none' }}
                    >
                      {todo.text}
                    </p>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 mt-0.5 p-0.5 rounded text-slate-300 hover:text-red-400 transition-all shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Certificate Monitoring ─── */}
      {activeView === 'certificates' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#fff7ed' }}>
                  <FileWarning className="h-5 w-5" style={{ color: '#ea580c' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Certificate Expiration Monitoring</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Track supplier certificates and their expiration dates</p>
                </div>
              </div>
              <button
                onClick={fetchCertificates}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            <div className="mt-4">
              <FilterTabs
                active={selectedCertFilter}
                onChange={k => setSelectedCertFilter(k as typeof selectedCertFilter)}
                tabs={[
                  { key: 'all', label: 'All', count: certificates.length, activeColor: '#2d9da8', activeBg: '#cffafe', activeBorder: '' },
                  { key: 'expired', label: 'Expired', count: certificates.filter(c => calculateDaysRemaining(c.valid_until) < 0).length, activeColor: '#dc2626', activeBg: '#fee2e2', activeBorder: '' },
                  {
                    key: 'expiring-soon', label: 'Expiring ≤60d',
                    count: certificates.filter(c => { const d = calculateDaysRemaining(c.valid_until); return d >= 0 && d <= 60 }).length,
                    activeColor: '#ca8a04', activeBg: '#fef9c3', activeBorder: '',
                  },
                ]}
              />
            </div>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '640px' }}>
            {certificatesLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading certificates…</span>
              </div>
            ) : certificates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileWarning className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">No certificates found</p>
              </div>
            ) : (
              certificates
                .filter(cert => {
                  const d = calculateDaysRemaining(cert.valid_until)
                  if (selectedCertFilter === 'expired') return d < 0
                  if (selectedCertFilter === 'expiring-soon') return d >= 0 && d <= 60
                  return true
                })
                .map(cert => {
                  const days = calculateDaysRemaining(cert.valid_until)
                  const status = getCertificateStatus(days)
                  return (
                    <div
                      key={cert.id}
                      className="flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm"
                      style={{ backgroundColor: status.bg, borderColor: status.border }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-slate-800">{cert.supplier?.name || 'Unknown Supplier'}</span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: status.badgeBg }}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Certificate:</span> {cert.file_name}
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                          <span><span className="font-medium">From:</span> {new Date(cert.valid_since).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          <span><span className="font-medium">Until:</span> {new Date(cert.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        {(cert.supplier?.email || cert.supplier?.phone) && (
                          <div className="mt-2 pt-2 border-t text-xs text-slate-500 space-y-0.5" style={{ borderColor: status.border }}>
                            {cert.supplier.contact && <div>Contact: {cert.supplier.contact}</div>}
                            {cert.supplier.email && <div>Email: {cert.supplier.email}</div>}
                            {cert.supplier.phone && <div>Phone: {cert.supplier.phone}</div>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-center px-3 py-2 rounded-lg bg-white/60 min-w-[60px]">
                          <div className="text-xl font-bold leading-none" style={{ color: status.color }}>
                            {Math.abs(days)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{days < 0 ? 'days ago' : 'days left'}</div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          <button
                            onClick={() => window.open(cert.file_url, '_blank')}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/80 bg-white/60 text-slate-600 hover:bg-white transition-all"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </button>
                          {days <= 60 && (
                            <button
                              onClick={() => { setSelectedCertificate(cert); setReplaceCertDialogOpen(true) }}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                              style={{ backgroundColor: '#2d9da8' }}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Replace
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      )}

      {/* ─── SDS Chemicals ─── */}
      {activeView === 'chemicals' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#fff7ed' }}>
                  <FileWarning className="h-5 w-5" style={{ color: '#ea580c' }} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">SDS Expiration Monitoring</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Track chemical SDS documents and their expiration dates</p>
                </div>
              </div>
              <button
                onClick={fetchSDSChemicals}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            <div className="mt-4">
              <FilterTabs
                active={selectedSdsFilter}
                onChange={k => setSelectedSdsFilter(k as typeof selectedSdsFilter)}
                tabs={[
                  { key: 'all', label: 'All', count: sdsChemicals.length, activeColor: '#2d9da8', activeBg: '#cffafe', activeBorder: '' },
                  { key: 'expired', label: 'Expired', count: sdsChemicals.filter(c => c.valid_until && calculateDaysRemaining(c.valid_until) < 0).length, activeColor: '#dc2626', activeBg: '#fee2e2', activeBorder: '' },
                  {
                    key: 'expiring-soon', label: 'Expiring ≤60d',
                    count: sdsChemicals.filter(c => { if (!c.valid_until) return false; const d = calculateDaysRemaining(c.valid_until); return d >= 0 && d <= 60 }).length,
                    activeColor: '#ca8a04', activeBg: '#fef9c3', activeBorder: '',
                  },
                ]}
              />
            </div>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: '640px' }}>
            {sdsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading SDS records…</span>
              </div>
            ) : sdsChemicals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileWarning className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">No SDS chemicals with expiration dates found</p>
              </div>
            ) : (
              sdsChemicals
                .filter(chem => {
                  if (!chem.valid_until) return false
                  const d = calculateDaysRemaining(chem.valid_until)
                  if (selectedSdsFilter === 'expired') return d < 0
                  if (selectedSdsFilter === 'expiring-soon') return d >= 0 && d <= 60
                  return true
                })
                .map(chem => {
                  if (!chem.valid_until) return null
                  const days = calculateDaysRemaining(chem.valid_until)
                  const status = getCertificateStatus(days)
                  return (
                    <div
                      key={chem.id}
                      className="flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm"
                      style={{ backgroundColor: status.bg, borderColor: status.border }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-slate-800">{chem.name}</span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: status.badgeBg }}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Location:</span> {chem.location}
                        </p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                          <span>
                            <span className="font-medium">From:</span>{' '}
                            {chem.valid_since
                              ? new Date(chem.valid_since).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : 'N/A'}
                          </span>
                          <span>
                            <span className="font-medium">Until:</span>{' '}
                            {new Date(chem.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="text-center px-3 py-2 rounded-lg bg-white/60 min-w-[60px]">
                          <div className="text-xl font-bold leading-none" style={{ color: status.color }}>
                            {Math.abs(days)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{days < 0 ? 'days ago' : 'days left'}</div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          {chem.pdf_url && (
                            <button
                              onClick={() => window.open(chem.pdf_url!, '_blank')}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/80 bg-white/60 text-slate-600 hover:bg-white transition-all"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </button>
                          )}
                          {days <= 60 && (
                            <button
                              onClick={() => { setSelectedSdsChemical(chem); setReplaceSdsDialogOpen(true) }}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                              style={{ backgroundColor: '#2d9da8' }}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Replace
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
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

      <ReplaceCertificateDialog
        isOpen={replaceCertDialogOpen}
        onClose={() => { setReplaceCertDialogOpen(false); setSelectedCertificate(null) }}
        certificate={selectedCertificate}
        onSuccess={() => { fetchCertificates(); setReplaceCertDialogOpen(false); setSelectedCertificate(null) }}
      />

      <ReplaceSdsDialog
        isOpen={replaceSdsDialogOpen}
        onClose={() => { setReplaceSdsDialogOpen(false); setSelectedSdsChemical(null) }}
        chemical={selectedSdsChemical}
        onSuccess={() => { fetchSDSChemicals(); setReplaceSdsDialogOpen(false); setSelectedSdsChemical(null) }}
      />
    </div>
  )
}
