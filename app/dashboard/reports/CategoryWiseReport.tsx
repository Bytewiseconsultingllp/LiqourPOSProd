'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Input } from '@/app/dashboard/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import { Calendar, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface CategorySalesData {
  category: string;
  totalQuantity: number;
  totalVolumeML: number;
  totalAmount: number;
  productCount: number;
  billCount: number;
}

export function CategoryWiseReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CategorySalesData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

      const response = await fetch(`/api/reports/category-wise?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch report');
      
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching category report:', error);
      toast.error('Failed to load category report');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(cat =>
    cat.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filteredData.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalQuantity = filteredData.reduce((sum, c) => sum + c.totalQuantity, 0);

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
        <CardTitle className="text-2xl">Category-Wise Sales Report</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Sales breakdown by category
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

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Categories</p>
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
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-center">Bills</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-center">Volume (L)</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No data available for the selected date range
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((category, index) => (
                  <TableRow key={category.category}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-semibold">{category.category}</TableCell>
                    <TableCell className="text-center">{category.productCount}</TableCell>
                    <TableCell className="text-center">{category.billCount}</TableCell>
                    <TableCell className="text-center font-semibold">{category.totalQuantity}</TableCell>
                    <TableCell className="text-center">
                      {(category.totalVolumeML / 1000).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ₹{category.totalAmount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
