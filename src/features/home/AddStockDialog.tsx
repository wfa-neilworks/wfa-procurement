import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { PackagePlus } from 'lucide-react'

interface AddStockDialogProps {
  isOpen: boolean
  onClose: () => void
  productCode: string
  productDescription: string
  currentSOH: number
  onConfirm: (addQuantity: number) => void
}

export function AddStockDialog({
  isOpen,
  onClose,
  productCode,
  productDescription,
  currentSOH,
  onConfirm,
}: AddStockDialogProps) {
  const [quantity, setQuantity] = useState('')

  const handleConfirm = () => {
    const qty = parseInt(quantity)
    if (qty && qty > 0) {
      onConfirm(qty)
    } else {
      // User didn't add quantity, just mark as arrived without adding stock
      onConfirm(0)
    }
    setQuantity('')
    onClose()
  }

  const handleSkip = () => {
    // Mark as arrived without adding stock
    onConfirm(0)
    setQuantity('')
    onClose()
  }

  const handleCancel = () => {
    setQuantity('')
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Product Arrived
          </DialogTitle>
          <DialogDescription>
            Do you want to add stock for this product?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Product Code:</span>
              <span className="font-semibold">{productCode}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">Description:</span>
              <span className="text-sm text-right max-w-[60%]">{productDescription}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current SOH:</span>
              <span className="font-semibold">{currentSOH}</span>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium mb-2">
              Quantity to Add (optional)
            </label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter quantity to add..."
              autoFocus
            />
            {quantity && parseInt(quantity) > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                New SOH will be: <span className="font-semibold">{currentSOH + parseInt(quantity)}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
          >
            Skip & Mark Arrived
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
          >
            {quantity && parseInt(quantity) > 0 ? 'Add Stock & Mark Arrived' : 'Mark Arrived'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
