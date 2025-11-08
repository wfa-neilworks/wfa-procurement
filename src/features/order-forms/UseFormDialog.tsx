import { useState, useEffect, useRef } from 'react'
import { X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
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
      className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-gray-300 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg text-gray-900 mb-1">
            {product.code}
          </div>
          <div className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.description}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              SOH: <span className="text-blue-600">{product.soh}</span>
            </span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Qty:</label>
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
  const firstInputRef = useRef<HTMLInputElement>(null)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

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

  const focusNextInput = (currentIndex: number) => {
    const nextIndex = currentIndex + 1
    if (nextIndex < products.length) {
      const nextProductId = products[nextIndex].id
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-white rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Use Form: {form?.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter quantities to deduct for each product
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading products...</div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={products.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product, index) => (
                    <SortableProductCard
                      key={product.id}
                      product={product}
                      quantity={product.quantity}
                      onQuantityChange={(qty) => updateQuantity(product.id, qty)}
                      isFirst={index === 0}
                      inputRef={index === 0 ? firstInputRef : undefined}
                      onTabPress={() => focusNextInput(index)}
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
        <div className="flex items-center justify-between p-6 border-t bg-white rounded-b-lg">
          <div className="text-sm text-gray-600">
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
