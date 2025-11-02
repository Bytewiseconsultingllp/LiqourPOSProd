'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Button } from '@/app/dashboard/components/ui/button';
import { Input } from '@/app/dashboard/components/ui/input';
import { Badge } from '@/app/dashboard/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import { 
  Search, 
  Save,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  _id: string;
  name: string;
  volumePerUnitML: number;
  currentStock: number;
  morningStock: number;
  morningStockLastUpdatedDate?: string;
  pricePerUnit: number;
  category: string;
}

interface ClosingStockItem {
  productId: string;
  productName: string;
  volumePerUnitML: number;
  morningStock: number;
  currentStock: number;
  closingStock: number;
  expectedStock: number;
  discrepancy: number;
  pricePerUnit: number;
  discrepancyValue: number;
  sales: number;
  purchases: number;
}

export function ClosingStockUpdateTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [closingStocks, setClosingStocks] = useState<Map<string, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [salesData, setSalesData] = useState<Map<string, number>>(new Map());
  const [purchaseData, setPurchaseData] = useState<Map<string, number>>(new Map());
  
  // Date range state
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [minFromDate, setMinFromDate] = useState<string>('');

  // Initial load: fetch products only
  useEffect(() => {
    fetchProducts();
  }, []);

  // Set fromDate from latest morningStockLastUpdatedDate when products load
  useEffect(() => {
    if (products.length > 0 && !fromDate) {
      const latestDate = products.reduce((latest, p) => {
        if (!p.morningStockLastUpdatedDate) return latest;
        const pDate = new Date(p.morningStockLastUpdatedDate);
        return pDate > latest ? pDate : latest;
      }, new Date(0));
      console.log("Latest morning stock date:", latestDate)
      
      if (latestDate.getTime() > 0) {
        // Format date in local timezone to avoid UTC conversion issues
        const year = latestDate.getFullYear();
        const month = String(latestDate.getMonth() + 1).padStart(2, '0');
        const day = String(latestDate.getDate()).padStart(2, '0');
        const latestDateStr = `${year}-${month}-${day}`;
        console.log("latestDateStr", latestDateStr)
        setFromDate(latestDateStr);
        setMinFromDate(latestDateStr);
      } else {
        // Default to today if no morningStockUpdateDate found
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        console.log("today", `${year}-${month}-${day}`)
        setFromDate(`${year}-${month}-${day}`);
      }
    }
  }, [products]);

  // Fetch sales/purchase data when dates change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchSalesAndPurchases();
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
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

      // Fetch products
      const productsResponse = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (!productsResponse.ok) throw new Error('Failed to fetch products');
      const productsData = await productsResponse.json();
      const productsList = productsData.data || [];
      setProducts(productsList);
      setFilteredProducts(productsList);

      // Initialize closing stocks with current stock
      const initialStocks = new Map<string, number>();
      productsList.forEach((product: Product) => {
        initialStocks.set(product._id, product.currentStock);
      });
      setClosingStocks(initialStocks);

    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesAndPurchases = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');
      
      if (!token || !orgData) return;

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      // Fetch sales and purchases for date range
      const salesResponse = await fetch(`/api/inventory/daily-movements?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        const salesMap = new Map<string, number>();
        salesData.sales?.forEach((item: any) => {
          salesMap.set(item.productId, item.quantity);
        });
        setSalesData(salesMap);

        const purchaseMap = new Map<string, number>();
        salesData.purchases?.forEach((item: any) => {
          purchaseMap.set(item.productId, item.quantity);
        });
        setPurchaseData(purchaseMap);
      }

    } catch (error) {
      console.error('Error fetching sales/purchases:', error);
      toast.error('Failed to load sales and purchase data');
    }
  };

  const handleClosingStockChange = (productId: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setClosingStocks(new Map(closingStocks.set(productId, numValue)));
  };

  const calculateExpectedStock = (product: Product): number => {
    const morningStock = product.morningStock || 0;
    const sales = salesData.get(product._id) || 0;
    const purchases = purchaseData.get(product._id) || 0;
    
    return morningStock + purchases - sales;
  };

  const calculateDiscrepancy = (product: Product): number => {
    const closingStock = closingStocks.get(product._id) ?? product.currentStock;
    const expectedStock = calculateExpectedStock(product);
    
    return closingStock - expectedStock;
  };

  const getClosingStockItems = (): ClosingStockItem[] => {
    return filteredProducts.map(product => {
      const closingStock = closingStocks.get(product._id) ?? product.currentStock;
      const expectedStock = calculateExpectedStock(product);
      const discrepancy = closingStock - expectedStock;
      const discrepancyValue = Math.abs(discrepancy) * product.pricePerUnit;
      const sales = salesData.get(product._id) || 0;
      const purchases = purchaseData.get(product._id) || 0;

      return {
        productId: product._id,
        productName: product.name,
        volumePerUnitML: product.volumePerUnitML,
        morningStock: product.morningStock || 0,
        currentStock: product.currentStock,
        closingStock,
        expectedStock,
        discrepancy,
        pricePerUnit: product.pricePerUnit,
        discrepancyValue,
        sales,
        purchases,
      };
    });
  };

  const getTotalDiscrepancyValue = (): number => {
    return getClosingStockItems().reduce((sum, item) => sum + item.discrepancyValue, 0);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');
      
      if (!token || !orgData) {
        toast.error('Please login again');
        return;
      }

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      // Calculate bill date: toDate at 3:59:59.999 AM
      const billDate = new Date(toDate);
      billDate.setHours(3, 59, 59, 999);
      
      // Calculate next morning stock date: day after toDate at 4:00 AM
      const nextMorningDate = new Date(toDate);
      nextMorningDate.setDate(nextMorningDate.getDate() + 1);
      nextMorningDate.setHours(4, 0, 0, 0);
      
      const closingStockData = {
        date: billDate.toISOString(),
        nextMorningDate: nextMorningDate.toISOString(),
        fromDate: fromDate,
        toDate: toDate,
        items: getClosingStockItems(),
      };

      const response = await fetch('/api/inventory/closing-stock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': orgId,
        },
        body: JSON.stringify(closingStockData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update closing stock');
      }

      const result = await response.json();
      
      toast.success('Closing stock updated successfully!');
      
      if (result.data.bill) {
        toast.success(`Main bill generated: ${result.data.bill.billNumber}`);
      }

      // Refresh data
      await fetchProducts();
      await fetchSalesAndPurchases();

    } catch (error: any) {
      console.error('Error updating closing stock:', error);
      toast.error(error.message || 'Failed to update closing stock');
    } finally {
      setSubmitting(false);
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

  const itemsWithDiscrepancy = getClosingStockItems().filter(item => item.discrepancy !== 0);
  const totalDiscrepancyValue = getTotalDiscrepancyValue();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Closing Stock Update</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enter closing stock for all products
            </p>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            size="lg"
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Submit All
              </>
            )}
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
                min={minFromDate}
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
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Products</p>
            <p className="text-2xl font-bold">{filteredProducts.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Items with Discrepancy</p>
            <p className="text-2xl font-bold text-yellow-600">{itemsWithDiscrepancy.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Discrepancy Value</p>
            <p className="text-2xl font-bold text-red-600">₹{totalDiscrepancyValue.toFixed(2)}</p>
          </Card>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-center">Volume</TableHead>
                <TableHead className="text-center">Morning</TableHead>
                <TableHead className="text-center">Purchases</TableHead>
                <TableHead className="text-center">Sales</TableHead>
                {/* <TableHead className="text-center">Expected</TableHead> */}
                <TableHead className="text-center">Current</TableHead>
                <TableHead className="text-center w-[120px]">Closing Stock</TableHead>
                <TableHead className="text-center">Discrepancy</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, index) => {
                const closingStock = closingStocks.get(product._id) ?? product.currentStock;
                const expectedStock = calculateExpectedStock(product);
                const discrepancy = closingStock - expectedStock;
                const sales = salesData.get(product._id) || 0;
                const purchases = purchaseData.get(product._id) || 0;
                const discrepancyValue = Math.abs(discrepancy) * product.pricePerUnit;

                return (
                  <TableRow key={product._id} className={discrepancy !== 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        {product.category && (
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{product.volumePerUnitML}ml</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{product.morningStock || 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600 font-semibold">+{purchases}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-red-600 font-semibold">-{sales}</span>
                    </TableCell>
                    {/* 
                     */}
                    <TableCell className="text-center">
                      <span className="font-semibold">{product.currentStock}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        value={closingStock}
                        onChange={(e) => handleClosingStockChange(product._id, e.target.value)}
                        className="text-center font-bold"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {discrepancy !== 0 ? (
                        <div className={`flex items-center justify-center gap-1 ${discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {discrepancy > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="font-bold">{discrepancy > 0 ? '+' : ''}{discrepancy}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-semibold">0</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {discrepancy !== 0 ? (
                        <span className={`font-bold ${discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{discrepancyValue.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        {itemsWithDiscrepancy.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Discrepancy Detected
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  {itemsWithDiscrepancy.length} product(s) have stock discrepancies totaling ₹{totalDiscrepancyValue.toFixed(2)}. 
                  A main bill with sub-bills will be generated upon submission.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
