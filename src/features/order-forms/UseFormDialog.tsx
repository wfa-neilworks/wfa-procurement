import { useState, useEffect, useRef } from 'react'
import { X, GripVertical, Columns3, Columns2, Grid3x3 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import type { Database } from '../../types/database'

type Product = Database['public']['Tables']['products']['Row']
type OrderForm = Database['public']['Tables']['order_forms']['Row']

interface UseFormDialogProps {
  isOpen: boolean
  onClose: () => void
  form: OrderForm | null
  onSuccess: () => void
}

interface ProductWithQuantity extends Product {
  quantity: number
}

function SortableProductCard({ product, quantity, onQuantityChange, isFirst, inputRef, onTabPress, setInputRef }: {
  product: Product
  quantity: number
  onQuantityChange: (value: number) => void
  isFirst?: boolean
  inputRef?: React.RefObject<HTMLInputElement>
  onTabPress?: () => void
  setInputRef?: (el: HTMLInputElement | null) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
            {product.description}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {product.code}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              SOH: <span className="text-blue-600 dark:text-blue-400">{product.soh}</span>
            </span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Qty:</label>
              <Input
                ref={(el) => {
                  if (inputRef && 'current' in inputRef) {
                    inputRef.current = el
                  }
                  if (setInputRef) {
                    setInputRef(el)
                  }
                }}
                type="number"
                min="0"
                value={quantity || ''}
                onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && !e.shiftKey && onTabPress) {
                    e.preventDefault()
                    onTabPress()
                  }
                }}
                className="w-24 text-center"
                placeholder="0"
                autoFocus={isFirst}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UseFormDialog({ isOpen, onClose, form, onSuccess }: UseFormDialogProps) {
  const [products, setProducts] = useState<ProductWithQuantity[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [columns, setColumns] = useState<number>(() => {
    const saved = localStorage.getItem('useFormColumns')
    return saved ? parseInt(saved) : 3
  })
  const firstInputRef = useRef<HTMLInputElement>(null)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // Persist column preference
  useEffect(() => {
    localStorage.setItem('useFormColumns', columns.toString())
  }, [columns])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (isOpen && form) {
      loadProducts()
    }
  }, [isOpen, form])

  const loadProducts = async () => {
    if (!form) return

    try {
      setLoading(true)
      const itemIds = form.item_ids as string[]

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', itemIds)

      if (error) throw error

      // Sort products based on the order in item_ids
      const sortedProducts = itemIds
        .map(id => data?.find(p => p.id === id))
        .filter((p): p is Product => p !== undefined)
        .map(p => ({ ...p, quantity: 0 }))

      setProducts(sortedProducts)

      // Set first category as default
      if (sortedProducts.length > 0) {
        const firstCategory = sortedProducts[0].category
        setSelectedCategory(firstCategory || 'all')
      }

      // Focus first input after products are loaded
      setTimeout(() => {
        firstInputRef.current?.focus()
      }, 100)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Failed to load form products')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newOrder = arrayMove(items, oldIndex, newIndex)

        // Save new order to database
        saveProductOrder(newOrder.map(p => p.id))

        return newOrder
      })
    }
  }

  const saveProductOrder = async (newItemIds: string[]) => {
    if (!form) return

    try {
      const { error } = await supabase
        .from('order_forms')
        .update({ item_ids: newItemIds })
        .eq('id', form.id)

      if (error) throw error

      toast.success('Product order saved', { duration: 2000 })
    } catch (error) {
      console.error('Error saving product order:', error)
      toast.error('Failed to save product order')
    }
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, quantity } : p))
    )
  }

  const focusNextInput = (currentIndex: number, currentFilteredProducts: ProductWithQuantity[]) => {
    const nextIndex = currentIndex + 1
    if (nextIndex < currentFilteredProducts.length) {
      const nextProductId = currentFilteredProducts[nextIndex].id
      const nextInput = inputRefs.current.get(nextProductId)
      nextInput?.focus()
    }
  }

  const handleApplyDeductions = async () => {
    const productsToDeduct = products.filter(p => p.quantity > 0)

    if (productsToDeduct.length === 0) {
      toast.error('Please enter quantities to deduct')
      return
    }

    // Validate stock levels
    for (const product of productsToDeduct) {
      if (product.quantity > product.soh) {
        toast.error(`Cannot deduct ${product.quantity} from ${product.code} (SOH: ${product.soh})`)
        return
      }
    }

    try {
      setApplying(true)

      for (const product of productsToDeduct) {
        const newSOH = product.soh - product.quantity

        // Update product SOH
        const { error: productError } = await supabase
          .from('products')
          .update({ soh: newSOH })
          .eq('id', product.id)

        if (productError) throw productError

        // Record stock movement
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            product_id: product.id,
            qty_delta: -product.quantity,
            note: `Deducted using form: ${form?.title}`,
          })

        if (movementError) throw movementError
      }

      toast.success(`Successfully deducted stock using form "${form?.title}"`, {
        description: `${productsToDeduct.length} product(s) updated`
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error applying deductions:', error)
      toast.error('Failed to apply deductions')
    } finally {
      setApplying(false)
    }
  }

  if (!isOpen) return null

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]

  // Filter products by selected category
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Use Form: {form?.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Enter quantities to deduct for each product
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Column Selector */}
            <div className="flex items-center gap-2 border dark:border-gray-600 rounded-lg p-1 bg-gray-50 dark:bg-gray-700">
              <button
                onClick={() => setColumns(2)}
                className={`p-2 rounded transition-colors ${
                  columns === 2
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="2 columns"
              >
                <Columns2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setColumns(3)}
                className={`p-2 rounded transition-colors ${
                  columns === 3
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="3 columns"
              >
                <Columns3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setColumns(4)}
                className={`p-2 rounded transition-colors ${
                  columns === 4
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="4 columns"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                All ({products.length})
              </button>
              {categories.map(category => {
                const count = products.filter(p => p.category === category).length
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-3 text-sm font-semibold whitespace-nowrap rounded-t-lg transition-all ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    {category} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">Loading products...</div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredProducts.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={`grid gap-4 ${
                  columns === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  {filteredProducts.map((product, index) => (
                    <SortableProductCard
                      key={product.id}
                      product={product}
                      quantity={product.quantity}
                      onQuantityChange={(qty) => updateQuantity(product.id, qty)}
                      isFirst={index === 0}
                      inputRef={index === 0 ? firstInputRef : undefined}
                      onTabPress={() => focusNextInput(index, filteredProducts)}
                      setInputRef={(el) => {
                        if (el) {
                          inputRefs.current.set(product.id, el)
                        } else {
                          inputRefs.current.delete(product.id)
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {products.filter(p => p.quantity > 0).length} product(s) with quantities
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={applying}>
              Cancel
            </Button>
            <Button onClick={handleApplyDeductions} disabled={applying}>
              {applying ? 'Applying...' : 'Apply Deductions'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
