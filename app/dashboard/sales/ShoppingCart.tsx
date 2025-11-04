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
import { Trash2, Edit, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/types/customer";
import { PromotionsDisplay } from "./PromotionsDisplay";
import { AppliedPromotion } from "@/types/promotion";

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
  const [promotionDiscount, setPromotionDiscount] = useState(0);
  const [appliedPromotions, setAppliedPromotions] = useState<AppliedPromotion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalBottles = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0
  );
  const itemDiscounts = items.reduce(
    (sum, item) => sum + ((item.itemDiscountAmount || 0) * item.quantity),
    0
  );
  const totalBeforeRounding = subtotal - itemDiscounts - billDiscount - promotionDiscount;
  const grandTotal = Math.round(totalBeforeRounding);
  const roundOffAmount = grandTotal - totalBeforeRounding;

  // Calculate max discount allowed based on customer's maxDiscountPercentage
  const maxAllowedDiscount = customer && customer.maxDiscountPercentage 
    ? (subtotal * customer.maxDiscountPercentage) / 100 
    : subtotal;

  // Calculate total discount (item + bill + promotion)
  const totalDiscount = itemDiscounts + billDiscount + promotionDiscount;
  const totalDiscountPercentage = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;
  
  // Calculate remaining discount allowed for bill discount
  const remainingDiscountAllowed = Math.max(0, maxAllowedDiscount - itemDiscounts - promotionDiscount);

  // Calculate available credit for customer
  const availableCredit = customer && customer._id !== "walk-in"
    ? Math.max(0, (customer.creditLimit || 0) - (customer.outstandingBalance || 0))
    : 0;

  const handlePromotionsApplied = (promotions: AppliedPromotion[], totalDiscount: number) => {
    // Filter out invalid promotions (missing required fields)
    const validPromotions = promotions.filter(promo => 
      promo.promotionId && 
      promo.promotionName && 
      promo.promotionType && 
      promo.discountAmount !== undefined
    );
    setAppliedPromotions(validPromotions);
    setPromotionDiscount(totalDiscount);
  };

  useEffect(() => {
    if (paymentMethod === "cash") {
      setCashAmount(grandTotal);
      setOnlineAmount(0);
      setCreditAmount(0);
    } else {
      // Allocate up to available credit, remainder to cash
      const credit = Math.min(grandTotal, availableCredit);
      const cash = Math.max(0, grandTotal - credit);
      setCreditAmount(credit);
      setCashAmount(cash);
      setOnlineAmount(0);
    }
  }, [paymentMethod, grandTotal, availableCredit]);

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

    // Final validation: Check total discount doesn't exceed max allowed
    if (totalDiscount > maxAllowedDiscount) {
      toast.error(
        `Total discount (${totalDiscountPercentage.toFixed(1)}%) exceeds customer's maximum allowed discount (${customer?.maxDiscountPercentage || 100}%)`
      );
      return;
    }

    setIsProcessing(true);
    try {
      // Map payment method to proper mode
      const paymentMode = paymentMethod === 'cash' ? 'Cash' : 
                         paymentMethod === 'credit' ? 'Credit' : 
                         paymentMethod === 'online' ? 'Online' : 'Mixed';

      const payment: Payment & {
        billDiscountAmount?: number;
        promotionDiscountAmount?: number;
        appliedPromotions?: any[];
      } = {
        mode: paymentMode,
        method: paymentMethod,
        cashAmount: cashAmount,
        cash: cashAmount,
        onlineAmount: onlineAmount,
        online: onlineAmount,
        creditAmount: creditAmount,
        credit: creditAmount,
        totalAmount: grandTotal,
        billDiscountAmount: billDiscount,
        promotionDiscountAmount: promotionDiscount,
        appliedPromotions: appliedPromotions,
      };

      await onComplete(payment);
      toast.success("Sale completed successfully!");

      // Reset payment fields
      setBillDiscount(0);
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

          {/* Active Promotions */}
          <PromotionsDisplay
            items={items}
            totalAmount={subtotal}
            onPromotionsApplied={handlePromotionsApplied}
          />

          {/* Bill Summary */}
          <div className="space-y-2 mt-4">
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

              {promotionDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Promotion Discount:</span>
                  <span>-₹{promotionDiscount.toFixed(2)}</span>
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Additional Discount (₹)</Label>
                {customer && customer.maxDiscountPercentage && customer.maxDiscountPercentage < 100 && (
                  <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium">
                    Max: {customer.maxDiscountPercentage}% | Remaining: ₹{remainingDiscountAllowed.toFixed(2)}
                  </span>
                )}
              </div>
              <Input
                type="number"
                value={billDiscount}
                onChange={(e) => {
                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                  const newTotalDiscount = itemDiscounts + value + promotionDiscount;
                  
                  if (newTotalDiscount > maxAllowedDiscount) {
                    toast.error(
                      `Total discount (item + bill) cannot exceed ${customer?.maxDiscountPercentage || 100}%. ` +
                      `Item discounts: ₹${itemDiscounts.toFixed(2)}, Remaining: ₹${remainingDiscountAllowed.toFixed(2)}`
                    );
                    setBillDiscount(remainingDiscountAllowed);
                  } else {
                    setBillDiscount(value);
                  }
                }}
                placeholder="0"
                min="0"
                max={remainingDiscountAllowed}
                className="h-9"
                disabled={customer?._id === 'walk-in' || customer?.type === 'Walk-In'}
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
            
            {/* Customer Credit Info */}
            {customer && customer._id !== "walk-in" && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credit Limit:</span>
                  <span className="font-semibold">₹{(customer.creditLimit || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-semibold text-red-600">₹{(customer.outstandingBalance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1 mt-1">
                  <span className="text-muted-foreground">Available Credit:</span>
                  <span className="font-bold text-green-600">₹{availableCredit.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Tabs
              value={paymentMethod}
              onValueChange={handlePaymentMethodChange}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cash">Cash</TabsTrigger>
                <TabsTrigger 
                  value="credit" 
                  disabled={!customer || customer._id === "walk-in"}
                >
                  Credit {(!customer || customer._id === "walk-in") && "(Registered Only)"}
                </TabsTrigger>
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
                        // Compute desired credit from remaining and cap at availableCredit
                        const remaining = Math.max(0, grandTotal - cash - onlineAmount);
                        const credit = Math.min(remaining, availableCredit);
                        const adjustedCash = Math.max(0, grandTotal - onlineAmount - credit);
                        setCashAmount(adjustedCash);
                        setCreditAmount(credit);
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
                        // Compute desired credit from remaining and cap at availableCredit
                        const remaining = Math.max(0, grandTotal - cashAmount - online);
                        const credit = Math.min(remaining, availableCredit);
                        const adjustedCash = Math.max(0, grandTotal - online - credit);
                        setOnlineAmount(online);
                        setCreditAmount(credit);
                        setCashAmount(adjustedCash);
                      }}
                      min="0"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Credit (₹)
                      {availableCredit > 0 && (
                        <span className="text-green-600 ml-1">(Max: ₹{availableCredit.toFixed(2)})</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        let newCredit = Math.max(0, Math.min(value, availableCredit));
                        if (value > availableCredit) {
                          toast.error(`Credit amount cannot exceed available credit of ₹${availableCredit.toFixed(2)}`);
                        }
                        // Auto-balance cash so that cash + online + credit = grandTotal
                        const adjustedCash = Math.max(0, grandTotal - onlineAmount - newCredit);
                        setCreditAmount(newCredit);
                        setCashAmount(adjustedCash);
                      }}
                      min="0"
                      max={availableCredit}
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
            disabled={!customer || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Receipt className="h-5 w-5" />
                Complete Sale
              </>
            )}
          </Button>
        </>
      )}
    </Card>
  );
}
