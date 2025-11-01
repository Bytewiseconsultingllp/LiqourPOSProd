import { useState, useEffect } from "react";
import { CartItem, Payment } from "@/types/product";
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
import { Trash2, Edit, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/types/customer";

interface ShoppingCartProps {
  items: CartItem[];
  customer: Customer | null;
  onRemoveItem: (id: string) => void;
  onEditItem: (item: CartItem) => void;
  onComplete: (payment: Payment) => void;
}

export function ShoppingCart({
  items,
  customer,
  onRemoveItem,
  onEditItem,
  onComplete,
}: ShoppingCartProps) {
  const [billDiscount, setBillDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);

  const totalBottles = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0
  );
  const itemDiscounts = items.reduce(
    (sum, item) => sum + (item.itemDiscountAmount || 0),
    0
  );
  const totalBeforeRounding = subtotal - itemDiscounts - billDiscount;
  const grandTotal = Math.round(totalBeforeRounding);
  const roundOffAmount = grandTotal - totalBeforeRounding;

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

  const handleComplete = () => {
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

    if (paymentMethod === "credit" && customer._id === "walk-in") {
      toast.error("Cannot process credit payment for walk-in customer");
      return;
    }

    const payment: Payment = {
      method: paymentMethod,
      cash: cashAmount,
      online: onlineAmount,
      credit: creditAmount,
    };

    onComplete(payment);
    toast.success("Sale completed successfully!");

    // Reset payment fields
    setBillDiscount(0);
    setPaymentMethod("cash");
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Shopping Cart</h2>
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
                    {/* <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded"
                    /> */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm line-clamp-1">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {item.volumePerUnitML}ml
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm">
                          ₹{item.rate} × {item.quantity}
                        </span>
                        {(item.itemDiscountAmount || 0) > 0 && (
                          <span className="text-xs text-destructive">
                            (-₹{item.itemDiscountAmount}/bottle)
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-primary mt-1">
                        ₹
                        {(
                          (item.rate - (item.itemDiscountAmount || 0)) *
                          item.quantity
                        ).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onRemoveItem(item._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <Separator className="my-4" />

          {/* Bill Summary */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Bill Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>
                  Subtotal ({totalBottles}{" "}
                  {totalBottles === 1 ? "bottle" : "bottles"}):
                </span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              {itemDiscounts > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Item Discounts:</span>
                  <span>-₹{itemDiscounts.toFixed(2)}</span>
                </div>
              )}

              {billDiscount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Bill Discount:</span>
                  <span>-₹{billDiscount.toFixed(2)}</span>
                </div>
              )}

              {roundOffAmount !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Round Off:</span>
                  <span>
                    {roundOffAmount >= 0 ? "+" : ""}₹{roundOffAmount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <Separator className="my-2" />

            <div className="space-y-2">
              <Label className="text-xs">Additional Discount (₹)</Label>
              <Input
                type="number"
                value={billDiscount}
                onChange={(e) =>
                  setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="0"
                min="0"
                className="h-9"
              />
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between font-bold text-xl">
              <span>Grand Total:</span>
              <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Payment Method */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Payment Method</h3>

            <Tabs
              value={paymentMethod}
              onValueChange={handlePaymentMethodChange}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cash">Cash</TabsTrigger>
                <TabsTrigger value="credit">Credit</TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="space-y-3 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cash (₹)</Label>
                    <Input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => {
                        const cash = parseFloat(e.target.value) || 0;
                        setCashAmount(cash);
                        setOnlineAmount(Math.max(0, grandTotal - cash));
                      }}
                      min="0"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Online (₹)</Label>
                    <Input
                      type="number"
                      value={onlineAmount}
                      onChange={(e) => {
                        const online = parseFloat(e.target.value) || 0;
                        setOnlineAmount(online);
                        setCashAmount(Math.max(0, grandTotal - online));
                      }}
                      min="0"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Credit (₹)</Label>
                    <Input
                      type="number"
                      value={0}
                      disabled
                      className="h-9 bg-muted"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="credit" className="space-y-3 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cash (₹)</Label>
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
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Online (₹)</Label>
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
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Credit (₹)</Label>
                    <Input
                      type="number"
                      value={creditAmount}
                      onChange={(e) =>
                        setCreditAmount(parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      className="h-9"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="bg-muted p-2.5 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Total Received:</span>
                <span className="font-semibold">
                  ₹{(cashAmount + onlineAmount + creditAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Button
            className="w-full gap-2 mt-4"
            size="lg"
            onClick={handleComplete}
            disabled={!customer}
          >
            <Receipt className="h-5 w-5" />
            Complete Sale
          </Button>
        </>
      )}
    </Card>
  );
}
