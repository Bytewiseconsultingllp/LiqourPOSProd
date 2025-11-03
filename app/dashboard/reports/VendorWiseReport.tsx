'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/app/dashboard/components/ui/button';
import { Input } from '@/app/dashboard/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import { Calendar, Download, Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface VendorSalesData {
  vendorId: string;
  vendorName: string;
  totalQuantity: number;
  totalAmount: number;
  totalVolumeML: number;
  billCount: number;
  products: {
    productId: string;
    productName: string;
    brand: string;
    category: string;
    quantity: number;
    volumePerUnitML: number;
    totalVolumeML: number;
    amount: number;
  }[];
}

export function VendorWiseReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VendorSalesData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
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

      const response = await apiFetch(`/api/reports/vendor-wise?fromDate=${fromDate}&toDate=${toDate}`);

      if (!response.ok) throw new Error('Failed to fetch report');
      
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching vendor report:', error);
      toast.error('Failed to load vendor report');
    } finally {
      setLoading(false);
    }
  };

  const downloadTodayReport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');
      
      if (!token || !orgData) {
        toast.error('Please login again');
        return;
      }

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      // Calculate today's 4 AM to next day 3:59 AM
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const response = await apiFetch(`/api/reports/quick-report?date=${todayStr}`);

      if (!response.ok) throw new Error('Failed to download report');
      
      // Get PDF blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quick_Report_${todayStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const toggleVendor = (vendorId: string) => {
    setExpandedVendors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendorId)) {
        newSet.delete(vendorId);
      } else {
        newSet.add(vendorId);
      }
      return newSet;
    });
  };

  const filteredData = data.filter(vendor =>
    vendor.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filteredData.reduce((sum, v) => sum + v.totalAmount, 0);
  const totalQuantity = filteredData.reduce((sum, v) => sum + v.totalQuantity, 0);
  const totalVolume = filteredData.reduce((sum, v) => sum + v.totalVolumeML, 0);

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Vendor-Wise Sales Report</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sales breakdown by vendor
            </p>
          </div>
          <Button onClick={downloadTodayReport} className="gap-2">
            <Download className="h-4 w-4" />
            Today's Quick Report
          </Button>
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

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Vendors</p>
            <p className="text-2xl font-bold">{filteredData.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Quantity</p>
            <p className="text-2xl font-bold">{totalQuantity}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
          </Card>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead className="text-center">Bills</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-center">Volume (L)</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No data available for the selected date range
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((vendor, index) => {
                  const isExpanded = expandedVendors.has(vendor.vendorId);
                  return (
                    <>
                      <TableRow 
                        key={vendor.vendorId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleVendor(vendor.vendorId)}
                      >
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-semibold">{vendor.vendorName}</p>
                              <p className="text-xs text-muted-foreground">
                                {vendor.products.length} product(s)
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{vendor.billCount}</TableCell>
                        <TableCell className="text-center font-semibold">{vendor.totalQuantity}</TableCell>
                        <TableCell className="text-center">
                          {(vendor.totalVolumeML / 1000).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₹{vendor.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${vendor.vendorId}-products`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <p className="text-sm font-semibold mb-3">Product Details:</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Brand</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-center">Volume (ml)</TableHead>
                                    <TableHead className="text-center">Quantity</TableHead>
                                    <TableHead className="text-center">Total Volume (L)</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {vendor.products.map((product, pIndex) => (
                                    <TableRow key={product.productId}>
                                      <TableCell className="text-muted-foreground">{pIndex + 1}</TableCell>
                                      <TableCell className="font-medium">{product.productName}</TableCell>
                                      <TableCell>{product.brand}</TableCell>
                                      <TableCell>{product.category}</TableCell>
                                      <TableCell className="text-center">{product.volumePerUnitML}</TableCell>
                                      <TableCell className="text-center font-semibold">{product.quantity}</TableCell>
                                      <TableCell className="text-center">
                                        {(product.totalVolumeML / 1000).toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        ₹{product.amount.toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
