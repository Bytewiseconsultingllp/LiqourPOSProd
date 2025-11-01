"use client";
import heroBg from "@/assets/hero-bg.jpg";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useProducts } from "@/lib/hooks/useProducts";
import { Customer } from "@/types/customer";
import { CartItem, Payment, ProductDetails } from "@/types/product";
import {
  AlertCircle,
  CreditCard,
  Loader2,
  Phone,
  User,
  Wallet,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { CreditPaymentDialog } from "./CreditPaymentDialog";
import { CustomerSelector } from "./CustomerSelector";
import { ProductCard } from "./ProductCard";
import { ProductFilters } from "./ProductFilters";
import { ProductSearch } from "./ProductSearch";
import { QuantityDialog } from "./QuantityDialog";
import { ShoppingCart } from "./ShoppingCart";

const Index = () => {
  // Fetch products and customers from API
  const {
    products,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts({ isActive: true });
  const {
    customers,
    loading: customersLoading,
    error: customersError,
  } = useCustomers({ isActive: true });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedVolumes, setSelectedVolumes] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(
    null
  );
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [creditPaymentDialogOpen, setCreditPaymentDialogOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const volumeMatch =
        selectedVolumes.length === 0 ||
        selectedVolumes.includes(product.volumeML);
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);
      return volumeMatch && categoryMatch;
    });
  }, [products, selectedVolumes, selectedCategories]);

  const handleVolumeToggle = (volume: number) => {
    setSelectedVolumes((prev) =>
      prev.includes(volume)
        ? prev.filter((v) => v !== volume)
        : [...prev, volume]
    );
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleClearFilters = () => {
    setSelectedVolumes([]);
    setSelectedCategories([]);
  };

  const handleProductSelect = (product: ProductDetails) => {
    setSelectedProduct(product);
    setEditingItem(null);
    setQuantityDialogOpen(true);
  };

  const handleEditItem = (item: CartItem) => {
    // Convert CartItem back to ProductDetails structure for editing
    const productDetails: ProductDetails = {
      _id: item.productId,
      name: item.productName,
      brand: item.brand,
      category: item.category,
      volumeML: item.volumePerUnitML,
      pricePerUnit: item.rate,
      currentStock: 0, // Not available in CartItem
      taxInfo: {
        vat: item.vatAmount,
        tcs: item.tcsAmount,
      },
      createdAt: new Date().toISOString(),
      purchasePricePerUnit: [],
    };

    setSelectedProduct(productDetails);
    setEditingItem(item);
    setQuantityDialogOpen(true);
  };

  const handleQuantityConfirm = (quantity: number, discount: number) => {
    if (!selectedProduct) return;

    if (editingItem) {
      setCartItems((prev) =>
        prev.map((item) => {
          if (item._id === editingItem._id) {
            const subTotal = item.rate * quantity;
            const discountAmount = discount || 0;
            const finalAmount = subTotal - discountAmount;
            return { ...item, quantity, discountAmount, subTotal, finalAmount };
          }
          return item;
        })
      );
    } else {
      const existingItem = cartItems.find(
        (item) => item._id === selectedProduct._id
      );
      if (existingItem) {
        setCartItems((prev) =>
          prev.map((item) => {
            if (item._id === selectedProduct._id) {
              const newQuantity = item.quantity + quantity;
              const subTotal = item.rate * newQuantity;
              const discountAmount = discount || 0;
              const finalAmount = subTotal - discountAmount;
              return {
                ...item,
                quantity: newQuantity,
                discountAmount,
                subTotal,
                finalAmount,
              };
            }
            return item;
          })
        );
      } else {
        const subTotal = selectedProduct.pricePerUnit * quantity;
        const discountAmount = discount || 0;
        const finalAmount = subTotal - discountAmount;

        const newCartItem: CartItem = {
          _id: selectedProduct._id,
          productId: selectedProduct._id,
          vendorId: "", // TODO: Add vendor selection logic
          billId: 0, // Will be set when bill is created
          productName: selectedProduct.name,
          brand: selectedProduct.brand,
          category: selectedProduct.category,
          quantity,
          volumePerUnitML: selectedProduct.volumeML,
          rate: selectedProduct.pricePerUnit,
          subTotal,
          discountAmount,
          finalAmount,
          vatAmount: selectedProduct.taxInfo?.vat,
          tcsAmount: selectedProduct.taxInfo?.tcs,
        };

        setCartItems((prev) => [...prev, newCartItem]);
      }
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item._id !== id));
  };

  const handleCheckoutComplete = async (payment: Payment) => {
    try {
      const token = localStorage.getItem('accessToken');
      const orgId = localStorage.getItem('organization') 
        ? JSON.parse(localStorage.getItem('organization')!).id 
        : 'default';

      if (!token) {
        alert('Please login to continue');
        return;
      }

      // Prepare sale data
      const saleData = {
        customerId: selectedCustomer?._id !== 'walk-in' ? selectedCustomer?._id : undefined,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: selectedCustomer?.contactInfo?.phone,
        customerType: selectedCustomer?._id === 'walk-in' ? 'walk-in' : 'registered',
        items: cartItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          brand: item.brand,
          category: item.category,
          quantity: item.quantity,
          volumePerUnitML: item.volumePerUnitML,
          rate: item.rate,
          subTotal: item.subTotal,
          discountAmount: item.discountAmount || 0,
          finalAmount: item.finalAmount,
          vatAmount: item.vatAmount || 0,
          tcsAmount: item.tcsAmount || 0,
        })),
        payment: {
          mode: payment.mode || 'Cash',
          cashAmount: payment.cashAmount || payment.cash || 0,
          onlineAmount: payment.onlineAmount || payment.online || 0,
          creditAmount: payment.creditAmount || payment.credit || 0,
          totalAmount: payment.totalAmount || 0,
          transactionId: payment.transactionId,
        },
      };

      const response = await fetch('/api/sales/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': orgId,
        },
        body: JSON.stringify(saleData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create sale');
      }

      // Show success message
      alert(data.message + (data.data.message ? '\n' + data.data.message : ''));

      // Reset cart and state
      setCartItems([]);
      setSelectedCustomer(null);

      // Refresh recent sales
      fetchRecentSales();
      refetchProducts();
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Failed to complete sale'));
    }
  };

  const handleRecordCreditPayment = (amount: number) => {
    // This would typically update the customer's credit balance in a database
    console.log(
      `Recording credit payment of ₹${amount} for customer ${selectedCustomer?._id}`
    );
  };

  const fetchRecentSales = async () => {
    try {
      setSalesLoading(true);
      const token = localStorage.getItem('accessToken');
      const orgId = localStorage.getItem('organization') 
        ? JSON.parse(localStorage.getItem('organization')!).id 
        : 'default';

      if (!token) return;

      const response = await fetch('/api/sales?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRecentSales(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch recent sales on mount
  useEffect(() => {
    fetchRecentSales();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="relative bg-primary text-primary-foreground py-8 px-6 shadow-lg"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Liquor POS</h1>
          <p className="text-primary-foreground/90">
            Professional Point of Sale System
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Customer Selection */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <CustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setCreditPaymentDialogOpen(true)}
            disabled={!selectedCustomer || selectedCustomer._id === "walk-in"}
          >
            <CreditCard className="h-4 w-4" />
            Record Credit Payment
          </Button>
        </div>

        {/* Customer Details Card */}
        {selectedCustomer && (
          <Card className="mb-6 p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-semibold">{selectedCustomer.name}</p>
                  </div>
                </div>
                {selectedCustomer.contactInfo.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-semibold">
                        {selectedCustomer.contactInfo.phone}
                      </p>
                    </div>
                  </div>
                )}
                {selectedCustomer._id !== "walk-in" && (
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Credit Balance
                      </p>
                      <p className="font-semibold text-primary">
                        ₹
                        {selectedCustomer.creditLimit -
                          (selectedCustomer.outstandingBalance ?? 0) || 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Filters */}
            <div className="space-y-4">
              <ProductSearch
                products={products}
                onSelectProduct={handleProductSelect}
              />
              <ProductFilters
                selectedVolumes={selectedVolumes}
                selectedCategories={selectedCategories}
                onVolumeToggle={handleVolumeToggle}
                onCategoryToggle={handleCategoryToggle}
                onClearFilters={handleClearFilters}
              />
            </div>

            {/* Product Gallery - Scrollable */}
            <div className="h-[calc(100vh-420px)] overflow-y-auto pr-2">
              {productsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">
                    Loading products...
                  </span>
                </div>
              ) : productsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {productsError}
                    <button
                      onClick={refetchProducts}
                      className="ml-2 underline font-semibold"
                    >
                      Retry
                    </button>
                  </AlertDescription>
                </Alert>
              ) : filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onSelect={handleProductSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div>
            <ShoppingCart
              items={cartItems}
              customer={selectedCustomer}
              onRemoveItem={handleRemoveItem}
              onEditItem={handleEditItem}
              onComplete={handleCheckoutComplete}
            />
          </div>
        </div>

        {/* Recent Sales Table */}
        <div className="mt-8">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Recent Sales</h2>
            {salesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent sales
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Bill ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Items</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Volume</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Total Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentSales.map((sale) => (
                      <tr key={sale._id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm font-medium">{sale.totalBillId}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{sale.customerName}</div>
                            {sale.customerPhone && (
                              <div className="text-xs text-muted-foreground">{sale.customerPhone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{sale.items?.length || 0}</td>
                        <td className="px-4 py-3 text-sm">{sale.totalQuantityBottles}</td>
                        <td className="px-4 py-3 text-sm">{(sale.totalVolumeML / 1000).toFixed(2)}L</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">₹{sale.totalAmount?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            sale.payment?.mode === 'Cash' ? 'bg-green-100 text-green-800' :
                            sale.payment?.mode === 'Online' ? 'bg-blue-100 text-blue-800' :
                            sale.payment?.mode === 'Credit' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sale.payment?.mode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(sale.saleDate || sale.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <QuantityDialog
        product={selectedProduct}
        open={quantityDialogOpen}
        onClose={() => setQuantityDialogOpen(false)}
        onConfirm={handleQuantityConfirm}
        initialQuantity={editingItem?.quantity}
        initialDiscount={editingItem?.discountAmount}
      />

      <CreditPaymentDialog
        open={creditPaymentDialogOpen}
        onClose={() => setCreditPaymentDialogOpen(false)}
        customer={selectedCustomer}
        onRecordPayment={handleRecordCreditPayment}
      />
    </div>
  );
};

export default Index;
