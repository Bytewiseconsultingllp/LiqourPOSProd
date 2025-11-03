import { useState, useEffect } from "react";
import { B2BCartItem, B2BPayment } from "./page";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { Trash2, Edit, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/types/customer";

interface B2BShoppingCartProps {
  items: B2BCartItem[];
  customer: Customer | null;
  onRemoveItem: (id: string) => void;
  onEditItem: (item: B2BCartItem) => void;
  onComplete: (payment: B2BPayment) => void;
}

export function B2BShoppingCart({
  items,
  customer,
  onRemoveItem,
  onEditItem,
  onComplete,
}: B2BShoppingCartProps) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalBottles = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subTotal, 0);
  
  // Calculate VAT: 35% of subtotal
  const vatAmount = subtotal * 0.35;
  
  // Calculate TCS: 1% of (subtotal + VAT) = 1% of (subtotal * 1.35)
  const tcsAmount = (subtotal * 1.35) * 0.01;
  
  // Grand total
  const grandTotal = subtotal + vatAmount + tcsAmount;

  // Calculate available credit for customer
  const availableCredit = customer && customer._id !== "walk-in"
    ? Math.max(0, (customer.creditLimit || 0) - (customer.outstandingBalance || 0))
    : 0;

  useEffect(() => {
    if (paymentMethod === "cash") {
      setCashAmount(grandTotal);
      setOnlineAmount(0);
      setCreditAmount(0);
    } else {
      setCreditAmount(grandTotal);
      setCashAmount(0);
      setOnlineAmount(0);
    }
  }, [paymentMethod, grandTotal]);

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value as "cash" | "credit");
  };

  const handleComplete = async () => {
    if (!customer) {
      toast.error("Please select a customer");
      return;
    }

    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const totalPaid = cashAmount + onlineAmount + creditAmount;
    if (Math.abs(totalPaid - grandTotal) > 0.01) {
      toast.error("Payment amounts do not match the total");
      return;
    }

    if (paymentMethod === "credit" && (!customer || customer._id === "walk-in")) {
      toast.error("Cannot process credit payment for walk-in customer");
      return;
    }

    setIsProcessing(true);
    try {
      // Map payment method to proper mode
      const paymentMode = paymentMethod === 'cash' ? 'Cash' : 
                         paymentMethod === 'credit' ? 'Credit' : 
                         paymentMethod === 'online' ? 'Online' : 'Mixed';

      const payment: B2BPayment = {
        mode: paymentMode,
        method: paymentMethod,
        cashAmount: cashAmount,
        cash: cashAmount,
        onlineAmount: onlineAmount,
        online: onlineAmount,
        creditAmount: creditAmount,
        credit: creditAmount,
        totalAmount: grandTotal,
      };

      await onComplete(payment);
      toast.success("B2B Sale completed successfully!");

      // Reset payment fields
      setPaymentMethod("cash");
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Shopping Cart (B2B)</h2>
        {items.length > 0 && (
          <span className="text-sm font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-full">
            {totalBottles} {totalBottles === 1 ? "Bottle" : "Bottles"}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Cart is empty</p>
          <p className="text-sm">Add products to get started</p>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item._id} className="p-3">
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {item.productName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.brand} • {item.volumePerUnitML}ml
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium">
                          {item.quantity} × ₹{item.rate.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          = ₹{item.finalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <Separator className="my-4" />

          {/* Price Summary */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>VAT (35%):</span>
              <span>₹{vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>TCS (1.35%):</span>
              <span>₹{tcsAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Grand Total:</span>
              <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              * VAT and TCS for reference only
            </p>
          </div>

          <Separator className="my-4" />

          {/* Payment Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Payment Method</h3>
            <Tabs value={paymentMethod} onValueChange={handlePaymentMethodChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cash">Cash/Online</TabsTrigger>
                <TabsTrigger 
                  value="credit"
                  disabled={!customer || customer._id === "walk-in"}
                >
                  Credit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cash">Cash Amount</Label>
                  <Input
                    id="cash"
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="online">Online Amount</Label>
                  <Input
                    id="online"
                    type="number"
                    value={onlineAmount}
                    onChange={(e) => setOnlineAmount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Paid:</span>
                  <span className="font-semibold">
                    ₹{(cashAmount + onlineAmount).toFixed(2)}
                  </span>
                </div>
                {cashAmount + onlineAmount > grandTotal && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Change:</span>
                    <span className="font-semibold">
                      ₹{(cashAmount + onlineAmount - grandTotal).toFixed(2)}
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="credit" className="space-y-4">
                {customer && customer._id !== "walk-in" && (
                  <>
                    <div className="bg-muted p-3 rounded space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Credit Limit:</span>
                        <span className="font-semibold">
                          ₹{customer.creditLimit?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Outstanding:</span>
                        <span className="font-semibold text-destructive">
                          ₹{customer.outstandingBalance?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Available Credit:</span>
                        <span className="font-semibold text-green-600">
                          ₹{availableCredit.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {grandTotal > availableCredit && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded text-sm">
                        Insufficient credit limit. Please use cash/online payment.
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="credit">Credit Amount</Label>
                      <Input
                        id="credit"
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        min="0"
                        step="0.01"
                        disabled
                      />
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <Button
              className="w-full"
              size="lg"
              onClick={handleComplete}
              disabled={isProcessing || items.length === 0 || !customer}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Receipt className="mr-2 h-4 w-4" />
                  Complete Sale - ₹{grandTotal.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
