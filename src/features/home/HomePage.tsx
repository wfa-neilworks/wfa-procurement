import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Plus, X, AlertTriangle, Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { Database } from '../../types/database'

type Product = Database['public']['Tables']['products']['Row']

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export function HomePage() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [selectedStockFilter, setSelectedStockFilter] = useState<'all' | 'critical' | 'very-low' | 'low'>('all')
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem('homeTodos')
    return saved ? JSON.parse(saved) : []
  })
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLowStockProducts()
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your inventory and tasks
        </p>
      </div>

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
                onClick={() => setSelectedStockFilter('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedStockFilter === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({lowStockProducts.length})
              </button>
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
                    if (selectedStockFilter === 'all') return true
                    const status = getStockStatus(product)
                    if (selectedStockFilter === 'critical') return status?.label === 'Critical'
                    if (selectedStockFilter === 'very-low') return status?.label === 'Very Low'
                    if (selectedStockFilter === 'low') return status?.label === 'Low'
                    return true
                  })
                  .map((product) => {
                  const status = getStockStatus(product)
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.code}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {product.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Min Stock: {product.min_stock}
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1">
                        <div className={`text-lg font-bold px-3 py-1 rounded ${status?.color || 'bg-gray-100 text-gray-700'}`}>
                          {product.soh}
                        </div>
                        {status && (
                          <span className="text-xs text-muted-foreground">
                            {status.label}
                          </span>
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
    </div>
  )
}
