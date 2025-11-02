'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Input } from '@/app/dashboard/components/ui/input';
import { Calendar, Loader2, TrendingUp, Package, DollarSign, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface SalesSummary {
  totalBills: number;
  totalQuantity: number;
  totalVolumeML: number;
  subTotalAmount: number;
  totalDiscountAmount: number;
  totalAmount: number;
  cashAmount: number;
  onlineAmount: number;
  creditAmount: number;
  topProducts: {
    productName: string;
    quantity: number;
    amount: number;
  }[];
  topCategories: {
    category: string;
    quantity: number;
    amount: number;
  }[];
}

export function SalesSummaryReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SalesSummary | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    if (fromDate && toDate) {
      fetchReport();
    }
  }, [fromDate, toDate]);

  const fetchReport = async () => {
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

      const response = await fetch(`/api/reports/sales-summary?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch report');
      
      const result = await response.json();
      setData(result.data || null);
    } catch (error) {
      console.error('Error fetching sales summary:', error);
      toast.error('Failed to load sales summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sales Summary Report</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive overview of sales performance
          </p>

          {/* Date Range Selector */}
          <div className="grid grid-cols-2 gap-4 mt-4">
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
        </CardHeader>

        {data && (
          <CardContent>
            {/* Main Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bills</p>
                    <p className="text-2xl font-bold">{data.totalBills}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Quantity</p>
                    <p className="text-2xl font-bold">{data.totalQuantity}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Volume (L)</p>
                    <p className="text-2xl font-bold">{(data.totalVolumeML / 1000).toFixed(2)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">₹{data.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Financial Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">₹{data.subTotalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-₹{data.totalDiscountAmount.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold">₹{data.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Payment Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash:</span>
                    <span className="font-semibold">₹{data.cashAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Online:</span>
                    <span className="font-semibold">₹{data.onlineAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credit:</span>
                    <span className="font-semibold">₹{data.creditAmount.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Top Products & Categories */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Top 5 Products</h3>
                <div className="space-y-2">
                  {data.topProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">Qty: {product.quantity}</p>
                      </div>
                      <span className="font-semibold">₹{product.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Top 5 Categories</h3>
                <div className="space-y-2">
                  {data.topCategories.map((category, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-xs text-muted-foreground">Qty: {category.quantity}</p>
                      </div>
                      <span className="font-semibold">₹{category.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
