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
  Eye, 
  AlertTriangle, 
  Package, 
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { VendorStockDialog } from './VendorStockDialog';

interface Product {
  _id: string;
  name: string;
  volumePerUnitML: number;
  currentStock: number;
  morningStock: number;
  reorderLevel: number;
  pricePerUnit: number;
  category: string;
}

interface VendorStock {
  vendorId: string;
  vendorName: string;
  quantity: number;
  pricePerUnit: number;
}

export function StockOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [vendorStocks, setVendorStocks] = useState<VendorStock[]>([]);
  const [showVendorDialog, setShowVendorDialog] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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

      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      setProducts(data.data || []);
      setFilteredProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorStocks = async (productId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const orgData = localStorage.getItem('organization');
      
      if (!token || !orgData) {
        toast.error('Please login again');
        return;
      }

      const organization = JSON.parse(orgData);
      const orgId = organization._id || organization.id;

      const response = await fetch(`/api/inventory/vendor-stocks/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch vendor stocks');

      const data = await response.json();
      setVendorStocks(data.data || []);
    } catch (error) {
      console.error('Error fetching vendor stocks:', error);
      toast.error('Failed to load vendor stocks');
    }
  };

  const handleViewVendorStocks = async (product: Product) => {
    setSelectedProduct(product);
    await fetchVendorStocks(product._id);
    setShowVendorDialog(true);
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) {
      return { label: 'Out of Stock', color: 'bg-red-500' };
    } else if (product.reorderLevel && product.currentStock <= product.reorderLevel) {
      return { label: 'Low Stock', color: 'bg-yellow-500' };
    } else {
      return { label: 'In Stock', color: 'bg-green-500' };
    }
  };

  const getStockChange = (product: Product) => {
    const change = product.currentStock - product.morningStock;
    return change;
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Stock Overview</CardTitle>
            <Button onClick={fetchProducts} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No products found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-center">Volume</TableHead>
                    <TableHead className="text-center">Morning Stock</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Change</TableHead>
                    <TableHead className="text-center">Reorder Level</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => {
                    const status = getStockStatus(product);
                    const stockChange = getStockChange(product);

                    return (
                      <TableRow key={product._id}>
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
                          <span className="text-lg font-semibold">{product.morningStock || 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-lg font-bold">{product.currentStock}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {stockChange !== 0 ? (
                            <div className={`flex items-center justify-center gap-1 ${stockChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stockChange > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">{Math.abs(stockChange)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{product.reorderLevel || 0}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${status.color}`} />
                            <span className="text-sm font-medium">{status.label}</span>
                            {product.reorderLevel && product.currentStock <= product.reorderLevel && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVendorStocks(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Stock Dialog */}
      {selectedProduct && (
        <VendorStockDialog
          open={showVendorDialog}
          onClose={() => {
            setShowVendorDialog(false);
            setSelectedProduct(null);
            setVendorStocks([]);
          }}
          product={selectedProduct}
          vendorStocks={vendorStocks}
        />
      )}
    </>
  );
}
