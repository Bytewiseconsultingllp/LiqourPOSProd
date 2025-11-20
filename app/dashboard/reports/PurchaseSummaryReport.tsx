'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '@/app/dashboard/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { Input } from '@/app/dashboard/components/ui/input';
import { Calendar, Loader2, ShoppingCart, Package, DollarSign, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { downloadCSVFile } from '@/lib/download-report';

interface PurchaseSummary {
  totalPurchases: number;
  totalQuantity: number;
  totalVolumeML: number;
  totalAmount: number;
  topProducts: {
    productName: string;
    quantity: number;
    amount: number;
  }[];
  topVendors: {
    vendorName: string;
    quantity: number;
    amount: number;
  }[];
}

export function PurchaseSummaryReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PurchaseSummary | null>(null);
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

      const response = await apiFetch(`/api/reports/purchase-summary?fromDate=${fromDate}&toDate=${toDate}`);

      if (!response.ok) throw new Error('Failed to fetch report');
      
      const result = await response.json();
      setData(result.data || null);
    } catch (error) {
      console.error('Error fetching purchase summary:', error);
      toast.error('Failed to load purchase summary');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!data) {
      toast.error('No data to download');
      return;
    }

    const rows: (string | number)[][] = [
      ['Purchase Summary Report'],
      ['Period', `${fromDate} to ${toDate}`],
      [''],
      ['Metric', 'Value'],
      ['Total Purchases', data.totalPurchases],
      ['Total Quantity', data.totalQuantity],
      ['Total Volume (L)', Number((data.totalVolumeML / 1000).toFixed(2))],
      ['Total Amount', Number(data.totalAmount.toFixed(2))],
      [''],
      ['Top Products', 'Quantity', 'Amount'],
    ];

    data.topProducts.forEach((product) => {
      rows.push([
        product.productName,
        product.quantity,
        Number(product.amount.toFixed(2)),
      ]);
    });

    rows.push(['']);
    rows.push(['Top Vendors', 'Quantity', 'Amount']);

    data.topVendors.forEach((vendor) => {
      rows.push([
        vendor.vendorName,
        vendor.quantity,
        Number(vendor.amount.toFixed(2)),
      ]);
    });

    downloadCSVFile(
      `purchase_summary_${fromDate}_to_${toDate}.csv`,
      rows
    );
    toast.success('Report downloaded successfully');
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
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <CardTitle className="text-2xl">Purchase Summary Report</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive overview of purchase activities
              </p>
            </div>
            {data && (
              <Button
                onClick={handleDownloadCSV}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            )}
          </div>

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
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Purchases</p>
                    <p className="text-2xl font-bold">{data.totalPurchases}</p>
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
                    <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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

            {/* Top Products & Vendors */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Top 5 Purchased Products</h3>
                <div className="space-y-2">
                  {data.topProducts.length > 0 ? (
                    data.topProducts.map((product, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-xs text-muted-foreground">Qty: {product.quantity}</p>
                        </div>
                        <span className="font-semibold">₹{product.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No purchase data available
                    </p>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Top 5 Vendors</h3>
                <div className="space-y-2">
                  {data.topVendors.length > 0 ? (
                    data.topVendors.map((vendor, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{vendor.vendorName}</p>
                          <p className="text-xs text-muted-foreground">Qty: {vendor.quantity}</p>
                        </div>
                        <span className="font-semibold">₹{vendor.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No vendor data available
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
