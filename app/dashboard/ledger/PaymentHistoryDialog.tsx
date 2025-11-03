'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/dashboard/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/app/dashboard/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/dashboard/components/ui/alert-dialog';
import { Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  _id: string;
  name: string;
}

interface Payment {
  _id: string;
  cashAmount: number;
  onlineAmount: number;
  totalAmount: number;
  paymentDate: string;
  createdAt: string;
}

interface PaymentHistoryDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  onPaymentReverted: () => void;
}

export function PaymentHistoryDialog({
  customer,
  open,
  onClose,
  onPaymentReverted,
}: PaymentHistoryDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (open) {
      fetchPayments();
    }
  }, [open]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');

      if (!token || !orgData) {
        toast.error('Please login again');
        return;
      }

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      const response = await apiFetch(`/api/payments/history/${customer._id}`);

      if (!response.ok) throw new Error('Failed to fetch payment history');

      const result = await response.json();
      setPayments(result.data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleRevertClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowRevertDialog(true);
  };

  const handleRevertConfirm = async () => {
    if (!selectedPayment) return;

    try {
      setRevertingId(selectedPayment._id);
      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');

      if (!token || !orgData) {
        toast.error('Please login again');
        return;
      }

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      const response = await apiFetch(
        `/api/payments/revert/${selectedPayment._id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            customerId: customer._id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revert payment');
      }

      toast.success('Payment reverted successfully');
      fetchPayments();
      onPaymentReverted();
      setShowRevertDialog(false);
      setSelectedPayment(null);
    } catch (error: any) {
      console.error('Error reverting payment:', error);
      toast.error(error.message || 'Failed to revert payment');
    } finally {
      setRevertingId(null);
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalCash = payments.reduce((sum, p) => sum + p.cashAmount, 0);
  const totalOnline = payments.reduce((sum, p) => sum + p.onlineAmount, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Payment History - {customer.name}
            </DialogTitle>
          </DialogHeader>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-muted-foreground mb-1">
                Total Collected
              </p>
              <p className="text-2xl font-bold text-blue-600">
                ₹{totalCollected.toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-muted-foreground mb-1">Cash</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{totalCash.toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-sm text-muted-foreground mb-1">Online</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹{totalOnline.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Payments Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Online</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No payment history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {new Date(payment.paymentDate).toLocaleDateString(
                                'en-IN',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.paymentDate).toLocaleTimeString(
                                'en-IN',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          ₹{payment.cashAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-purple-600 font-semibold">
                          ₹{payment.onlineAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₹{payment.totalAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevertClick(payment)}
                            disabled={revertingId === payment._id}
                            className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {revertingId === payment._id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="hidden sm:inline">Reverting...</span>
                              </>
                            ) : (
                              <>
                                <Undo2 className="h-3 w-3" />
                                <span className="hidden sm:inline">Revert</span>
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert this payment of ₹
              {selectedPayment?.totalAmount.toFixed(2)}? This will add the amount
              back to the customer's outstanding balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevertConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Revert Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
