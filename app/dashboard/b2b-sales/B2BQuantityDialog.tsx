import { useState, useEffect } from "react";
import { ProductDetails } from "@/types/product";
import { B2BCartItem } from "./page";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

interface B2BQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDetails;
  editingItem: B2BCartItem | null;
  onAdd: (quantity: number, vendorId: string) => void;
  onUpdate: (quantity: number, vendorId: string) => void;
  purchasePrice: number;
}

export function B2BQuantityDialog({
  open,
  onOpenChange,
  product,
  editingItem,
  onAdd,
  onUpdate,
  purchasePrice,
}: B2BQuantityDialogProps) {
  const [quantity, setQuantity] = useState(editingItem?.quantity || 1);
  const [selectedVendorId, setSelectedVendorId] = useState(
    editingItem?.vendorId || ""
  );

  // Get unique vendor IDs from purchase prices
  const vendorIds = product.purchasePricePerUnit
    ? Array.from(
        new Set(
          product.purchasePricePerUnit
            .map((p: any) => p.vendorId)
            .filter(Boolean)
        )
      )
    : [];

  useEffect(() => {
    if (editingItem) {
      setQuantity(editingItem.quantity);
      setSelectedVendorId(editingItem.vendorId);
    } else {
      setQuantity(1);
      setSelectedVendorId(vendorIds[0] || "");
    }
  }, [editingItem, product]);

  const handleSubmit = () => {
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (quantity > product.currentStock) {
      toast.error(
        `Only ${product.currentStock} units available in stock`
      );
      return;
    }

    if (!selectedVendorId && vendorIds.length > 0) {
      toast.error("Please select a vendor");
      return;
    }

    if (editingItem) {
      onUpdate(quantity, selectedVendorId);
    } else {
      onAdd(quantity, selectedVendorId);
    }
  };

  const subTotal = purchasePrice * quantity;
  const vatAmount = subTotal * 0.35;
  const tcsAmount = (subTotal * 1.35) * 0.01;
  const total = subTotal + vatAmount + tcsAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Update Quantity" : "Add to Cart"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="flex gap-4">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-20 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
              <p className="text-sm text-muted-foreground">
                {product.volumeML}ml
              </p>
              <p className="text-sm font-medium text-primary">
                Purchase Price: ₹{purchasePrice.toFixed(2)}/bottle
              </p>
            </div>
          </div>

          {/* Stock Info */}
          <div className="bg-muted p-3 rounded">
            <p className="text-sm">
              <span className="font-semibold">Available Stock:</span>{" "}
              {product.currentStock} bottles
            </p>
          </div>

          {/* Vendor Selection */}
          {vendorIds.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={selectedVendorId}
                onValueChange={setSelectedVendorId}
              >
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorIds.map((vendorId) => (
                    <SelectItem key={vendorId} value={vendorId}>
                      {vendorId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (Bottles)</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={product.currentStock}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              autoFocus
            />
          </div>

          {/* Price Breakdown */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({quantity} × ₹{purchasePrice.toFixed(2)}):</span>
              <span className="font-semibold">₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>VAT (35%):</span>
              <span>₹{vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>TCS (1% of ₹{(subTotal * 1.35).toFixed(2)}):</span>
              <span>₹{tcsAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              * VAT and TCS shown for reference only (not saved in bill)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingItem ? "Update" : "Add to Cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
