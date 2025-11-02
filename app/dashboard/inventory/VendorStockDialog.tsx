'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/dashboard/components/ui/dialog';
import { ScrollArea } from '@/app/dashboard/components/ui/scroll-area';
import { Badge } from '@/app/dashboard/components/ui/badge';
import { Package, Building2 } from 'lucide-react';

interface VendorStock {
  vendorId: string;
  vendorName: string;
  quantity: number;
  pricePerUnit: number;
}

interface Product {
  _id: string;
  name: string;
  volumePerUnitML: number;
  currentStock: number;
}

interface VendorStockDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  vendorStocks: VendorStock[];
}

export function VendorStockDialog({
  open,
  onClose,
  product,
  vendorStocks,
}: VendorStockDialogProps) {
  const totalVendorStock = vendorStocks.reduce((sum, vs) => sum + vs.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Vendor Stocks - {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Stock</p>
                <p className="text-2xl font-bold">{product.currentStock}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Vendor Stock</p>
                <p className="text-2xl font-bold text-blue-600">{totalVendorStock}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Volume</p>
                <p className="text-2xl font-bold">{product.volumePerUnitML}ml</p>
              </div>
            </div>
          </div>

          {/* Vendor Stocks List */}
          {vendorStocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No vendor stocks available</p>
              <p className="text-sm mt-1">This product has no stock with any vendors</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {vendorStocks.map((vendorStock, index) => (
                  <div
                    key={vendorStock.vendorId}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold">{vendorStock.vendorName}</h4>
                          <Badge variant="outline" className="text-xs">
                            Priority {index + 1}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Available Quantity</p>
                            <p className="text-lg font-bold">{vendorStock.quantity} bottles</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Price per Unit</p>
                            <p className="text-lg font-bold">₹{vendorStock.pricePerUnit.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">Total Value</p>
                          <p className="text-lg font-semibold text-primary">
                            ₹{(vendorStock.quantity * vendorStock.pricePerUnit).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Priority Note */}
          {vendorStocks.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> Vendor stocks are deducted in priority order (top to bottom) during sales.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
