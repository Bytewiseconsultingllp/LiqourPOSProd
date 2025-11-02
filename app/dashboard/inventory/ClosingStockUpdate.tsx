'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Button } from '@/app/dashboard/components/ui/button';
import { Input } from '@/app/dashboard/components/ui/input';
import { ScrollArea } from '@/app/dashboard/components/ui/scroll-area';
import { Badge } from '@/app/dashboard/components/ui/badge';
import { Separator } from '@/app/dashboard/components/ui/separator';
import { 
  Search, 
  Save, 
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/dashboard/components/ui/table';
import { toast } from 'sonner';

interface Product {
  _id: string;
  name: string;
  volumePerUnitML: number;
  currentStock: number;
  morningStock: number;
  morningStockUpdateDate?: string;
  pricePerUnit: number;
  category: string;
}

interface DiscrepancyBill {
  _id: string;
  totalBillId: string;
  totalAmount: number;
  totalQuantityBottles: number;
  subBills?: any[];
  saleDate: string;
  createdAt: string;
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
}

export function ClosingStockUpdate() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [closingStocks, setClosingStocks] = useState<Map<string, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [salesData, setSalesData] = useState<Map<string, number>>(new Map());
  const [purchaseData, setPurchaseData] = useState<Map<string, number>>(new Map());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [minFromDate, setMinFromDate] = useState('');
  const [discrepancyBills, setDiscrepancyBills] = useState<DiscrepancyBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const billsPerPage = 5;

  useEffect(() => {
    fetchData();
    fetchDiscrepancyBills();
  }, []);

  // Auto-set fromDate from latest morningStockUpdateDate
  useEffect(() => {
    console.log("useEffect triggered, products.length:", products.length);
    if (products.length > 0) {
      console.log("First product:", products[0]);
      console.log("First product morningStockUpdateDate:", products[0].morningStockUpdateDate);
      console.log("Type:", typeof products[0].morningStockUpdateDate);
      
      const latestDate = products.reduce((latest, p) => {
        if (!p.morningStockUpdateDate) return latest;
        const pDate = new Date(p.morningStockUpdateDate);
        return pDate > latest ? pDate : latest;
      }, new Date(0));
      console.log("latestDate", latestDate)
      
      if (latestDate.getTime() > 0) {
        // Format date in local timezone to avoid UTC conversion issues
        const year = latestDate.getFullYear();
        const month = String(latestDate.getMonth() + 1).padStart(2, '0');
        const day = String(latestDate.getDate()).padStart(2, '0');
        const latestDateStr = `${year}-${month}-${day}`;
        console.log("morning date ", latestDateStr);
        setFromDate(latestDateStr);
        setMinFromDate(latestDateStr);
      } else {
        // Default to today if no morningStockUpdateDate found
        console.log("No valid morningStockUpdateDate found, using today");
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        console.log("today date ", `${year}-${month}-${day}`);
        setFromDate(`${year}-${month}-${day}`);
      }
    } else {
      console.log("No products loaded yet");
    }
  }, [products]);

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

  const fetchData = async () => {
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
      setProducts(productsData.data || []);
      setFilteredProducts(productsData.data || []);

      // Fetch sales and purchases for discrepancy calculation using date range
      const from = fromDate || new Date().toISOString().split('T')[0];
      const to = toDate || new Date().toISOString().split('T')[0];
      
      // Fetch sales
      const salesResponse = await fetch(`/api/inventory/daily-movements?fromDate=${from}&toDate=${to}`, {
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
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscrepancyBills = async (page: number = 1) => {
    try {
      setBillsLoading(true);
      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');
      
      if (!token || !orgData) return;

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      const response = await fetch(`/api/inventory/discrepancy-bills?limit=${billsPerPage}&page=${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscrepancyBills(data.data || []);
        setTotalBills(data.total || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching discrepancy bills:', error);
    } finally {
      setBillsLoading(false);
    }
  };

  const handleClosingStockChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
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
      };
    });
  };

  const getTotalDiscrepancyValue = (): number => {
    return getClosingStockItems().reduce((sum, item) => sum + item.discrepancyValue, 0);
  };

  const handleSubmit = async () => {
    try {
      // Validate that all products have closing stock entered
      const itemsWithoutClosingStock = filteredProducts.filter(
        product => !closingStocks.has(product._id)
      );

      if (itemsWithoutClosingStock.length > 0) {
        toast.error(`Please enter closing stock for all products (${itemsWithoutClosingStock.length} remaining)`);
        return;
      }

      setSubmitting(true);

      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');
      
      if (!token || !orgData) {
        toast.error('Please login again');
        return;
      }

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      // Calculate next morning date (toDate + 1 day at 4 AM)
      const nextMorning = new Date(toDate);
      nextMorning.setDate(nextMorning.getDate() + 1);
      nextMorning.setHours(4, 0, 0, 0);

      const closingStockData = {
        date: toDate,
        nextMorningDate: nextMorning.toISOString(),
        fromDate,
        toDate,
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
        throw new Error(error.message || 'Failed to update closing stock');
      }

      const result = await response.json();
      
      toast.success('Closing stock updated successfully!');
      
      if (result.bill) {
        toast.success(`Discrepancy bill generated: ${result.bill.billNumber}`);
      }

      // Refresh data
      await fetchData();
      await fetchDiscrepancyBills();
      setClosingStocks(new Map());

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

  const totalDiscrepancyValue = getTotalDiscrepancyValue();
  const itemsWithDiscrepancy = getClosingStockItems().filter(item => item.discrepancy !== 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Closing Stock Update</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enter closing stock for each product to calculate discrepancies
            </p>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || closingStocks.size === 0}
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
                Submit Closing Stock
              </>
            )}
          </Button>
        </div>

        {/* Date Selectors */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              From Date (Auto-set from last update)
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full"
              min={minFromDate}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sales filtered from {fromDate} 4:00 AM IST
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              To Date
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full"
              min={new Date(fromDate).toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sales filtered until {toDate} next day 3:59:59 AM IST
            </p>
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
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const closingStock = closingStocks.get(product._id) ?? product.currentStock;
              const expectedStock = calculateExpectedStock(product);
              const discrepancy = closingStock - expectedStock;
              const sales = salesData.get(product._id) || 0;
              const purchases = purchaseData.get(product._id) || 0;

              return (
                <Card key={product._id} className="p-4">
                  <div className="space-y-4">
                    {/* Product Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{product.volumePerUnitML}ml</Badge>
                          {product.category && (
                            <Badge variant="secondary">{product.category}</Badge>
                          )}
                        </div>
                      </div>
                      {discrepancy !== 0 && (
                        <Badge variant={discrepancy > 0 ? 'default' : 'destructive'}>
                          {discrepancy > 0 ? 'Excess' : 'Shortage'}: {Math.abs(discrepancy)}
                        </Badge>
                      )}
                    </div>

                    {/* Stock Details Grid */}
                    <div className="grid grid-cols-5 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Morning</p>
                        <p className="text-lg font-semibold">{product.morningStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Purchases</p>
                        <p className="text-lg font-semibold text-green-600">+{purchases}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sales</p>
                        <p className="text-lg font-semibold text-red-600">-{sales}</p>
                      </div>
                      {/* <div>
                        <p className="text-xs text-muted-foreground mb-1">Expected</p>
                        <p className="text-lg font-semibold text-blue-600">{expectedStock}</p>
                      </div> */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current</p>
                        <p className="text-lg font-semibold">{product.currentStock}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Closing Stock Input */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">
                          Enter Closing Stock
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={closingStock}
                          onChange={(e) => handleClosingStockChange(product._id, e.target.value)}
                          placeholder="Enter closing stock"
                          className="text-lg font-semibold"
                        />
                      </div>

                      {/* Discrepancy Display */}
                      {discrepancy !== 0 && (
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-2 block">
                            Discrepancy
                          </label>
                          <div className={`flex items-center gap-2 p-3 rounded-lg ${
                            discrepancy > 0 
                              ? 'bg-green-50 dark:bg-green-950 border border-green-200' 
                              : 'bg-red-50 dark:bg-red-950 border border-red-200'
                          }`}>
                            {discrepancy > 0 ? (
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <p className={`text-lg font-bold ${
                                discrepancy > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {discrepancy > 0 ? '+' : ''}{discrepancy} bottles
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₹{(Math.abs(discrepancy) * product.pricePerUnit).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Formula Display */}
                    <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                      <p>
                        <strong>Calculation:</strong> Expected = Morning ({product.morningStock || 0}) + Purchases ({purchases}) - Sales ({sales}) = {expectedStock}
                      </p>
                      <p className="mt-1">
                        <strong>Discrepancy:</strong> Closing ({closingStock}) - Expected ({expectedStock}) = {discrepancy}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

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
                  A discrepancy bill will be generated for walk-in customer upon submission.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Discrepancy Bills */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Recent Discrepancy Bills
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Last 10 discrepancy bills generated
              </p>
            </div>
          </div>

          {billsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : discrepancyBills.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No discrepancy bills found</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Sub-Bills</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancyBills.map((bill) => (
                    <TableRow key={bill._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          {bill.totalBillId}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(bill.saleDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {bill.totalQuantityBottles} bottles
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{bill.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {bill.subBills && bill.subBills.length > 0 ? (
                          <Badge variant="secondary">
                            {bill.subBills.length} sub-bills
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(bill.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination Controls */}
              {totalBills > billsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * billsPerPage) + 1} to {Math.min(currentPage * billsPerPage, totalBills)} of {totalBills} bills
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDiscrepancyBills(currentPage - 1)}
                      disabled={currentPage === 1 || billsLoading}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(totalBills / billsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first, last, current, and adjacent pages
                          const totalPages = Math.ceil(totalBills / billsPerPage);
                          return page === 1 || 
                                 page === totalPages || 
                                 Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, array) => {
                          // Add ellipsis
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;
                          
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && (
                                <span className="px-2 text-muted-foreground">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => fetchDiscrepancyBills(page)}
                                disabled={billsLoading}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDiscrepancyBills(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalBills / billsPerPage) || billsLoading}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
