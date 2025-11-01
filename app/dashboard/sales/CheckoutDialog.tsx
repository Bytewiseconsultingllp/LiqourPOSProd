import { useState, useEffect } from 'react';
import { toast } from '../components/ui/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Button } from '../components/ui/button';
import { Customer } from '@/types/customer';
import { CartItem, Payment } from '@/types/product';


interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: Customer | null;
  onComplete: (payment: Payment) => void;
}

export function CheckoutDialog({ open, onClose, items, customer, onComplete }: CheckoutDialogProps) {
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemDiscounts = items.reduce((sum, item) => sum + item.discount * item.quantity, 0);
  const grandTotal = subtotal - itemDiscounts - billDiscount;

  useEffect(() => {
    if (open) {
      if (paymentMethod === 'cash') {
        setCashAmount(grandTotal);
        setOnlineAmount(0);
        setCreditAmount(0);
      } else {
        setCreditAmount(grandTotal);
        setCashAmount(0);
        setOnlineAmount(0);
      }
    }
  }, [paymentMethod, grandTotal, open]);

  const handleComplete = () => {
    if (!customer) {
      toast.error('Please select a customer');
      return;
    }

    const totalPaid = cashAmount + onlineAmount + creditAmount;
    if (Math.abs(totalPaid - grandTotal) > 0.01) {
      toast.error('Payment amounts do not match the total');
      return;
    }

    if (paymentMethod === 'credit' && customer._id === 'walk-in') {
      toast.error('Cannot process credit payment for walk-in customer');
      return;
    }

    const payment: Payment = {
      method: paymentMethod,
      cash: cashAmount,
      online: onlineAmount,
      credit: creditAmount,
    };

    onComplete(payment);
    toast.success('Sale completed successfully!');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Sale</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bill Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold">Bill Summary</h3>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {item.name} × {item.quantity}
                    {item.discount > 0 && ` (-₹${item.discount}/bottle)`}
                  </span>
                  <span>₹{((item.price - item.discount) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Item Discounts:</span>
                <span>-₹{itemDiscounts.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Discount (₹)</Label>
              <Input
                type="number"
                value={billDiscount}
                onChange={(e) => setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                min="0"
              />
            </div>

            {billDiscount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Bill Discount:</span>
                <span>-₹{billDiscount.toFixed(2)}</span>
              </div>
            )}

            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Grand Total:</span>
              <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <h3 className="font-semibold">Payment Method</h3>
            <RadioGroup value={paymentMethod} onValueChange={(value:any) => setPaymentMethod(value as 'cash' | 'credit')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="cursor-pointer">Cash Payment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit" className="cursor-pointer">Credit Payment</Label>
              </div>
            </RadioGroup>

            {paymentMethod === 'cash' ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Cash Amount (₹)</Label>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => {
                      const cash = parseFloat(e.target.value) || 0;
                      setCashAmount(cash);
                      setOnlineAmount(Math.max(0, grandTotal - cash));
                    }}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Online Amount (₹)</Label>
                  <Input
                    type="number"
                    value={onlineAmount}
                    onChange={(e) => {
                      const online = parseFloat(e.target.value) || 0;
                      setOnlineAmount(online);
                      setCashAmount(Math.max(0, grandTotal - online));
                    }}
                    min="0"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Cash Amount (₹)</Label>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => {
                      const cash = parseFloat(e.target.value) || 0;
                      setCashAmount(cash);
                      const remaining = grandTotal - cash - onlineAmount;
                      setCreditAmount(Math.max(0, remaining));
                    }}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Online Amount (₹)</Label>
                  <Input
                    type="number"
                    value={onlineAmount}
                    onChange={(e) => {
                      const online = parseFloat(e.target.value) || 0;
                      setOnlineAmount(online);
                      const remaining = grandTotal - cashAmount - online;
                      setCreditAmount(Math.max(0, remaining));
                    }}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Credit Amount (₹)</Label>
                  <Input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>
            )}

            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total Received:</span>
                <span className="font-semibold">
                  ₹{(cashAmount + onlineAmount + creditAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleComplete} className="gap-2">
            Complete Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
