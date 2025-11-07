'use client';

import { Button } from '@/app/dashboard/components/ui/button';
import { Card } from '@/app/dashboard/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/dashboard/components/ui/dialog';
import { Input } from '@/app/dashboard/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import { apiFetch } from '@/lib/api-client';
import { Calendar, Loader2, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Customer {
  _id: string;
  name: string;
  outstandingBalance: number;
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
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [viewBill, setViewBill] = useState<any | null>(null);

  useEffect(() => {
    if (open) {
      fetchBills();
    }
  }, [open, customer._id, fromDate, toDate]);

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
  const totalSubtotal = bills.reduce(
    (sum, bill) => sum + (bill.subTotalAmount || bill.totalAmount),
    0
  );
  const totalDiscount = bills.reduce(
    (sum, bill) => sum + ((bill.promotionDiscountAmount || 0) + (bill.billDiscountAmount || 0) + (bill.itemDiscountAmount || 0)),
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

        <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
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
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
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
                          <TableCell className="text-right">
                            ₹{(bill.subTotalAmount || bill.totalAmount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            ₹{(bill.totalDiscountAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{bill.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setViewBill(bill)}>
                              <Eye className="h-4 w-4" />
                            </Button>
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
                <p className="text-sm text-muted-foreground mb-1">Total Subtotal</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{totalSubtotal.toFixed(2)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Discount</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{totalDiscount.toFixed(2)}
                </p>
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

        <Dialog open={!!viewBill} onOpenChange={() => setViewBill(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Bill Items{viewBill?.totalBillId ? ` - ${viewBill.totalBillId}` : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">MRP/Piece</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const items = (viewBill?.items && viewBill.items.length > 0)
                      ? viewBill.items
                      : (viewBill?.subBills?.flatMap((sb: any) => sb.items) || []);
                    if (!items || items.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                            No items found for this bill
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return items.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(item.finalAmount ?? item.subTotal).toFixed(2)}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
