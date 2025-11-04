import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { Customer } from '@/types/customer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface QuantityDialogProps {
  product: Product | null;
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, discount: number) => void;
  initialQuantity?: number;
  initialDiscount?: number;
}

export function QuantityDialog({
  product,
  customer,
  open,
  onClose,
  onConfirm,
  initialQuantity = 1,
  initialDiscount = 0,
}: QuantityDialogProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [discount, setDiscount] = useState(initialDiscount);

  // Calculate max discount per bottle based on customer's maxDiscountPercentage
  const maxDiscountPerBottle = product && customer && customer.maxDiscountPercentage
    ? (product.pricePerUnit * customer.maxDiscountPercentage) / 100
    : product?.pricePerUnit || 0;

  useEffect(() => {
    if (open) {
      setQuantity(initialQuantity);
      setDiscount(initialDiscount);
    }
  }, [open, initialQuantity, initialDiscount]);

  const handleConfirm = () => {
    const maxQty = typeof product?.currentStock === 'number' ? product.currentStock : undefined;
    if (maxQty !== undefined && quantity > maxQty) {
      toast.error(`Quantity cannot exceed available stock (${maxQty}).`);
      return;
    }
    if (maxQty !== undefined && maxQty <= 0) {
      toast.error('This item is out of stock.');
      return;
    }
    onConfirm(quantity, discount);
    onClose();
  };

  if (!product) return null;

  const subtotal = product.pricePerUnit * quantity;
  const totalDiscount = discount * quantity;
  const total = subtotal - totalDiscount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Quantity & Discount</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h4 className="font-semibold">{product.name}</h4>
              <p className="text-sm text-muted-foreground">₹{product.pricePerUnit} per bottle</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity (Bottles)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string for backspace/delete
                  if (value === '' || value === '0') {
                    setQuantity(0);
                  } else {
                    const parsed = parseInt(value);
                    if (!isNaN(parsed) && parsed >= 0) {
                      const maxQty = typeof product.currentStock === 'number' ? product.currentStock : undefined;
                      const next = maxQty !== undefined ? Math.min(parsed, maxQty) : parsed;
                      setQuantity(next);
                    }
                  }
                }}
                onBlur={() => {
                  // Ensure minimum of 1 when user leaves the field
                  const maxQty = typeof product.currentStock === 'number' ? product.currentStock : undefined;
                  if (quantity === 0 || isNaN(quantity)) {
                    if (maxQty !== undefined && maxQty <= 0) {
                      setQuantity(0);
                    } else {
                      setQuantity(1);
                    }
                  } else if (maxQty !== undefined) {
                    setQuantity(Math.min(quantity, maxQty));
                  }
                }}
                className="text-center"
                min="1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newQty = (quantity || 0) + 1;
                  const cap = typeof product.currentStock === 'number' ? product.currentStock : Number.POSITIVE_INFINITY;
                  setQuantity(Math.min(cap, newQty));
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {product.currentStock != null && (
              <p className="text-xs text-muted-foreground">
                Max available: {(product.currentStock ?? 0)} bottles
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Discount per Bottle (₹)</Label>
              {customer && customer.maxDiscountPercentage && customer.maxDiscountPercentage < 100 && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium">
                  Max: {customer.maxDiscountPercentage}% (₹{maxDiscountPerBottle.toFixed(2)})
                </span>
              )}
            </div>
            <Input
              type="number"
              value={discount}
              onChange={(e) => {
                const value = Math.max(0, parseFloat(e.target.value) || 0);
                if (value > maxDiscountPerBottle) {
                  toast.error(`Discount per bottle cannot exceed ${customer?.maxDiscountPercentage || 100}% (₹${maxDiscountPerBottle.toFixed(2)})`);
                  setDiscount(maxDiscountPerBottle);
                } else {
                  setDiscount(value);
                }
              }}
              placeholder="0"
              min="0"
              max={maxDiscountPerBottle}
              disabled={customer?._id === 'walk-in' || customer?.type === 'Walk-In'}
            />
          </div>

          <div className="space-y-1 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Discount:</span>
              <span>-₹{totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              (typeof product.currentStock === 'number' && product.currentStock <= 0) ||
              quantity <= 0 ||
              (typeof product.currentStock === 'number' && quantity > product.currentStock)
            }
          >
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
