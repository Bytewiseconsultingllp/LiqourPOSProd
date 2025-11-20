'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/dashboard/components/ui/dialog';
import { Input } from '@/app/dashboard/components/ui/input';
import { Button } from '@/app/dashboard/components/ui/button';
import { Card } from '@/app/dashboard/components/ui/card';
import { Label } from '@/app/dashboard/components/ui/label';
import { Loader2, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface Customer {
  _id: string;
  name: string;
  outstandingBalance: number;
}

interface CollectPaymentDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CollectPaymentDialog({
  customer,
  open,
  onClose,
  onSuccess,
}: CollectPaymentDialogProps) {
  const [cashAmount, setCashAmount] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPayment =
    parseFloat(cashAmount || '0') + parseFloat(onlineAmount || '0');
  const remainingBalance = customer.outstandingBalance - totalPayment;

  const handlePercentage = (percentage: number) => {
    const amount = (customer.outstandingBalance * percentage) / 100;
    setOnlineAmount('0')
    setCashAmount(amount.toFixed(2));
  };

  const handleFullCash = () => {
    setCashAmount(customer.outstandingBalance.toFixed(2));
    setOnlineAmount('0');
  };

  const handleFullOnline = () => {
    setCashAmount('0');
    setOnlineAmount(customer.outstandingBalance.toFixed(2));
  };

  const handleSubmit = async () => {
    if (totalPayment <= 0) {
      toast.error('Please enter a payment amount');
      return;
    }

    if (totalPayment > customer.outstandingBalance) {
      toast.error('Payment amount cannot exceed outstanding balance');
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch('/api/payments/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer._id,
          cashAmount: parseFloat(cashAmount || '0'),
          onlineAmount: parseFloat(onlineAmount || '0'),
          totalAmount: totalPayment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to collect payment');
      }

      toast.success('Payment collected successfully');
      setCashAmount('');
      setOnlineAmount('');
      onSuccess();
    } catch (error: any) {
      console.error('Error collecting payment:', error);
      toast.error(error.message || 'Failed to collect payment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCashAmount('');
    setOnlineAmount('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Collect Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">{customer.name}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Outstanding Balance */}
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Outstanding Balance</span>
              <span className="text-2xl font-bold text-red-600">
                ₹{customer.outstandingBalance.toFixed(2)}
              </span>
            </div>
          </Card>

          {/* Quick Percentage Buttons */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Quick Amount Selection
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePercentage(25)}
                className="h-12 text-lg"
              >
                <Percent className="h-4 w-4 mr-1" />
                25%
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePercentage(50)}
                className="h-12 text-lg"
              >
                <Percent className="h-4 w-4 mr-1" />
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePercentage(75)}
                className="h-12 text-lg"
              >
                <Percent className="h-4 w-4 mr-1" />
                75%
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePercentage(100)}
                className="h-12 text-lg"
              >
                <Percent className="h-4 w-4 mr-1" />
                100%
              </Button>
            </div>
          </div>

          {/* Payment Mode Buttons */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Full Payment Mode
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleFullCash}
                className="h-12 text-lg bg-green-50 hover:bg-green-100"
              >
                Full Cash
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleFullOnline}
                className="h-12 text-lg bg-blue-50 hover:bg-blue-100"
              >
                Full Online
              </Button>
            </div>
          </div>

          {/* Split Payment Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cashAmount" className="text-sm font-medium mb-2 block">
                Cash Amount
              </Label>
              <Input
                id="cashAmount"
                type="number"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="h-14 text-xl"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="onlineAmount" className="text-sm font-medium mb-2 block">
                Online Amount
              </Label>
              <Input
                id="onlineAmount"
                type="number"
                placeholder="0.00"
                value={onlineAmount}
                onChange={(e) => setOnlineAmount(e.target.value)}
                className="h-14 text-xl"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Total Payment */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Payment</span>
              <span className="text-2xl font-bold text-blue-600">
                ₹{totalPayment.toFixed(2)}
              </span>
            </div>
          </Card>

          {/* Remaining Balance */}
          {totalPayment > 0 && (
            <Card
              className={`p-4 ${remainingBalance > 0
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-green-50 border-green-200'
                }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Remaining Balance</span>
                <span
                  className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}
                >
                  ₹{remainingBalance.toFixed(2)}
                </span>
              </div>
            </Card>
          )}

          {/* Error Message */}
          {totalPayment > customer.outstandingBalance && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Payment amount exceeds outstanding balance
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-12 text-lg bg-green-600 hover:bg-green-700"
              disabled={loading || totalPayment <= 0 || totalPayment > customer.outstandingBalance}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Collect ₹${totalPayment.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
