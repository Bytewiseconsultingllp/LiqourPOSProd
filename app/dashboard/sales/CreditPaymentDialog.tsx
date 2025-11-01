import { useState } from "react";

import { toast } from "../components/ui/use-toast";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Customer } from "@/types/customer";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";

interface CreditPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onRecordPayment: (amount: number) => void;
}

export function CreditPaymentDialog({
  open,
  onClose,
  customer,
  onRecordPayment,
}: CreditPaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState(0);

  const handleSubmit = () => {
    if (!customer || customer._id === "walk-in") {
      toast.error("Invalid customer selected");
      return;
    }

    if (paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (
      paymentAmount >
      (customer.creditLimit - (customer.outstandingBalance ?? 0) || 0)
    ) {
      toast.error("Payment amount exceeds credit balance");
      return;
    }

    onRecordPayment(paymentAmount);
    toast.success(`Payment of ₹${paymentAmount} recorded successfully`);
    setPaymentAmount(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Credit Payment</DialogTitle>
        </DialogHeader>

        {customer && customer._id !== "walk-in" ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{customer.name}</p>
                {customer.contactInfo.phone && (
                  <p className="text-sm text-muted-foreground">
                    {customer.contactInfo.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Credit Balance</Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  ₹
                  {(
                    customer.creditLimit - (customer.outstandingBalance ?? 0)
                  )?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) =>
                  setPaymentAmount(parseFloat(e.target.value) || 0)
                }
                placeholder="Enter amount"
                min="0"
                max={(
                    customer.creditLimit - (customer.outstandingBalance ?? 0)
                  ) || 0}
              />
            </div>

            {paymentAmount > 0 && (
              <div className="space-y-2">
                <Label>New Balance After Payment</Label>
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xl font-bold text-success">
                    ₹
                    {(((
                    customer.creditLimit - (customer.outstandingBalance ?? 0)
                  ) || 0) - paymentAmount).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Please select a valid customer to record payment</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !customer || customer._id === "walk-in" || paymentAmount <= 0
            }
          >
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
