import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Minus, Plus } from 'lucide-react';

interface QuantityDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, discount: number) => void;
  initialQuantity?: number;
  initialDiscount?: number;
}

export function QuantityDialog({
  product,
  open,
  onClose,
  onConfirm,
  initialQuantity = 1,
  initialDiscount = 0,
}: QuantityDialogProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [discount, setDiscount] = useState(initialDiscount);

  useEffect(() => {
    if (open) {
      setQuantity(initialQuantity);
      setDiscount(initialDiscount);
    }
  }, [open, initialQuantity, initialDiscount]);

  const handleConfirm = () => {
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
                      setQuantity(parsed);
                    }
                  }
                }}
                onBlur={() => {
                  // Ensure minimum of 1 when user leaves the field
                  if (quantity === 0 || isNaN(quantity)) {
                    setQuantity(1);
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
                  setQuantity(Math.min(product.currentStock, newQty));
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Max available: {product.currentStock} bottles
            </p>
          </div>

          <div className="space-y-2">
            <Label>Discount per Bottle (₹)</Label>
            <Input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              min="0"
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
          <Button onClick={handleConfirm}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
