'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/dashboard/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import { Input } from '@/app/dashboard/components/ui/input';
import { Button } from '@/app/dashboard/components/ui/button';
import { Card } from '@/app/dashboard/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  _id: string;
  name: string;
  outstandingBalance: number;
}

interface Bill {
  _id: string;
  totalBillId: string;
  saleDate: string;
  totalAmount: number;
  totalQuantityBottles: number;
  payment: {
    mode: string;
    cashAmount: number;
    onlineAmount: number;
    creditAmount: number;
  };
}

interface CustomerSalesDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
}

export function CustomerSalesDialog({
  customer,
  open,
  onClose,
}: CustomerSalesDialogProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (open) {
      fetchBills();
    }
  }, [open, fromDate, toDate]);

  const fetchBills = async () => {
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

      const response = await apiFetch(
        `/api/bills/customer/${customer._id}?fromDate=${fromDate}&toDate=${toDate}`
      );

      if (!response.ok) throw new Error('Failed to fetch bills');

      const result = await response.json();
      setBills(result.data || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const totalSales = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalQuantity = bills.reduce(
    (sum, bill) => sum + bill.totalQuantityBottles,
    0
  );
  const totalCash = bills.reduce(
    (sum, bill) => sum + (bill.payment?.cashAmount || 0),
    0
  );
  const totalOnline = bills.reduce(
    (sum, bill) => sum + (bill.payment?.onlineAmount || 0),
    0
  );
  const totalCredit = bills.reduce(
    (sum, bill) => sum + (bill.payment?.creditAmount || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Sales & Payment Summary - {customer.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Outstanding Balance: ₹{customer.outstandingBalance.toFixed(2)}
          </p>
        </DialogHeader>

        {/* Date Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bills Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Bills</h3>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Bill ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No bills found for the selected date range
                        </TableCell>
                      </TableRow>
                    ) : (
                      bills.map((bill) => (
                        <TableRow key={bill._id}>
                          <TableCell className="font-medium">
                            {bill.totalBillId}
                          </TableCell>
                          <TableCell>
                            {new Date(bill.saleDate).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right">
                            {bill.totalQuantityBottles}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{bill.totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Summary</h3>
            <div className="space-y-3">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Bills</p>
                <p className="text-2xl font-bold">{bills.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Quantity
                </p>
                <p className="text-2xl font-bold">{totalQuantity}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{totalSales.toFixed(2)}
                </p>
              </Card>

              <div className="pt-2">
                <h4 className="text-sm font-semibold mb-2">Payment Breakdown</h4>
                <div className="space-y-2">
                  <Card className="p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cash Payments</span>
                      <span className="font-semibold text-green-600">
                        ₹{totalCash.toFixed(2)}
                      </span>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Online Payments</span>
                      <span className="font-semibold text-blue-600">
                        ₹{totalOnline.toFixed(2)}
                      </span>
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Credit Payments</span>
                      <span className="font-semibold text-orange-600">
                        ₹{totalCredit.toFixed(2)}
                      </span>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
