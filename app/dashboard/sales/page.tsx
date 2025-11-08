"use client";
import { SubBillsViewer } from "@/components/SubBillsViewer";
import { ThermalBillPrint } from "@/components/ThermalBillPrint";
import { apiFetch } from "@/lib/api-client";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useProducts } from "@/lib/hooks/useProducts";
import { Customer } from "@/types/customer";
import { CartItem, Payment, Product, ProductDetails } from "@/types/product";
import {
  AlertCircle,
  CreditCard,
  CreditCardIcon,
  Eye,
  FileText,
  Layers,
  Loader2,
  Phone,
  Scan,
  User,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { CollectPaymentDialog } from "../ledger/CollectPaymentDialog";
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
    refetch: refetchCustomers,
  } = useCustomers({ isActive: true });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedVolumes, setSelectedVolumes] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    null
  );
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [creditPaymentDialogOpen, setCreditPaymentDialogOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [billDate, setBillDate] = useState(() => {
    const date = new Date();
    date.setHours(4, 5, 0, 0); // Set time to 4:05 AM
    return date.toISOString();
  });
  const [viewingBill, setViewingBill] = useState<any | null>(null);
  const [viewBillType, setViewBillType] = useState<'main' | 'sub'>('main');
  const [viewingSubBills, setViewingSubBills] = useState<any | null>(null);

  // Barcode scanner states
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [scannerActive, setScannerActive] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const volumeMatch =
        selectedVolumes.length === 0 ||
        selectedVolumes.includes(product.volumeML);
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category || "");
      return volumeMatch && categoryMatch;
    });
  }, [products, selectedVolumes, selectedCategories]);

  useEffect(() => {
    if (!selectedCustomer) return;
    const updated = customers.find((c) => c._id === selectedCustomer._id);
    if (updated && updated !== selectedCustomer) {
      setSelectedCustomer(updated);
    }
  }, [customers, selectedCustomer]);

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

  const handleProductSelect = (product: Product) => {
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
      currentStock: selectedProduct?.currentStock || 0, // Not available in CartItem
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

  const handleQuantityConfirm = (quantity: number, discountPerBottle: number) => {
    if (!selectedProduct) return;

    if (editingItem) {
      setCartItems((prev) =>
        prev.map((item) => {
          if (item._id === editingItem._id) {
            const subTotal = item.rate * quantity;
            const itemDiscountAmount = discountPerBottle || 0;
            const totalDiscount = itemDiscountAmount * quantity;
            const finalAmount = subTotal - totalDiscount;
            return {
              ...item,
              quantity,
              itemDiscountAmount,
              discountAmount: totalDiscount,
              subTotal,
              finalAmount
            };
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
              const itemDiscountAmount = discountPerBottle || 0;
              const totalDiscount = itemDiscountAmount * newQuantity;
              const finalAmount = subTotal - totalDiscount;
              return {
                ...item,
                quantity: newQuantity,
                itemDiscountAmount,
                discountAmount: totalDiscount,
                subTotal,
                finalAmount,
              };
            }
            return item;
          })
        );
      } else {
        const subTotal = selectedProduct.pricePerUnit * quantity;
        const itemDiscountAmount = discountPerBottle || 0;
        const totalDiscount = itemDiscountAmount * quantity;
        const finalAmount = subTotal - totalDiscount;

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
          itemDiscountAmount,
          discountAmount: totalDiscount,
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

  const handleCompleteSale = async (payment: Payment & {
    itemDiscountAmount?: number;
    billDiscountAmount?: number;
    promotionDiscountAmount?: number;
    appliedPromotions?: any[];
  }) => {
    try {
      const token = localStorage.getItem("accessToken");
      const organizationData = localStorage.getItem("organization");

      if (!token || !organizationData) {
        alert("Please login again");
        return;
      }

      const organization = JSON.parse(organizationData);
      const orgId = organization._id || organization.id;

      if (!selectedCustomer) {
        alert("Please select a customer");
        return;
      }

      // Calculate discount breakdown
      const itemDiscounts = cartItems.reduce(
        (sum, item) => sum + ((item.itemDiscountAmount || 0) * item.quantity),
        0
      );

      // Prepare sale data
      const saleData = {
        customerId: selectedCustomer?._id !== "walk-in"
          ? selectedCustomer?._id
          : undefined,
        customerName: selectedCustomer?.name || "Walk-in Customer",
        customerPhone: selectedCustomer?.contactInfo?.phone,
        customerType: selectedCustomer?._id === "walk-in"
          ? "walk-in"
          : selectedCustomer.type,
        items: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          brand: item.brand,
          category: item.category,
          quantity: item.quantity,
          volumePerUnitML: item.volumePerUnitML,
          rate: item.rate,
          subTotal: item.subTotal,
          discountAmount: item.discountAmount || 0,
          itemDiscountAmount: item.itemDiscountAmount || 0,
          promotionDiscountAmount: item.promoDiscountAmount || 0,
          finalAmount: item.finalAmount,
          vatAmount: item.vatAmount || 0,
          tcsAmount: item.tcsAmount || 0,
        })),
        payment: {
          mode: payment.mode || "Cash",
          cashAmount: payment.cashAmount || payment.cash || 0,
          onlineAmount: payment.onlineAmount || payment.online || 0,
          creditAmount: payment.creditAmount || payment.credit || 0,
          totalAmount: payment.totalAmount || 0,
          transactionId: payment.transactionId,
        },
        itemDiscountAmount: itemDiscounts,
        billDiscountAmount: payment.billDiscountAmount || 0,
        promotionDiscountAmount: payment.promotionDiscountAmount || 0,
        appliedPromotions: payment.appliedPromotions || [],
        saleDate: billDate,
      };

      const response = await apiFetch("/api/sales/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create sale');
      }

      // Show success message
      toast.success(data.message || 'Sale completed successfully!');
      if (data.data.message) {
        toast.info(data.data.message);
      }

      // Show bill print option
      if (data.data.sale) {
        const shouldPrint = window.confirm('Sale completed! Would you like to print the bill?');
        if (shouldPrint) {
          handleViewBill(data.data.sale, 'main');
        }
      }

      // Reset cart and state
      setCartItems([]);
      // Auto-select walk-in customer after sale
      const walkInCustomer = customers.find(c => c._id === "walk-in" || c.name === "Walk-in Customer");
      if (walkInCustomer) {
        setSelectedCustomer(walkInCustomer);
      } else {
        // Create walk-in customer if not found
        const walkIn: Customer = {
          _id: 'walk-in',
          name: 'Walk-in Customer',
          type: 'Walk-In',
          contactInfo: { phone: '', email: '', address: '' },
          creditLimit: 0,
          outstandingBalance: 0,
          walletBalance: 0,
          isActive: true,
          organizationId: '',
          createdAt: new Date().toISOString(),
          maxDiscountPercentage: 100,
        };
        setSelectedCustomer(walkIn);
      }

      // Refresh recent sales
      fetchRecentSales();
      refetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete sale');
    }
  };

  const handlePaymentSuccess = async () => {
    setCreditPaymentDialogOpen(false);
    try {
      await refetchCustomers();
      if (selectedCustomer) {
        const updated = customers.find(c => c._id === selectedCustomer._id);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (_) {
      // noop: UI will reflect once hook updates
    }
  };

  const handleViewBill = (sale: any, billType: 'main' | 'sub' = 'main') => {
    setViewingBill(sale);
    setViewBillType(billType);
  };

  const handleCloseBillView = () => {
    setViewingBill(null);
  };

  const handleViewSubBills = (sale: any) => {
    setViewingSubBills(sale);
  };

  const handleCloseSubBills = () => {
    setViewingSubBills(null);
  };

  const fetchRecentSales = async () => {
    try {
      setSalesLoading(true);
      const token = localStorage.getItem('accessToken');
      const organizationData = localStorage.getItem('organization');

      if (!token || !organizationData) return;

      const organization = JSON.parse(organizationData);
      const orgId = organization._id || organization.id;

      const response = await apiFetch('/api/sales?limit=10');

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

  // Auto-select walk-in customer when customers load (only once)
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer) {
      const walkInCustomer = customers.find(c => c._id === "walk-in" || c.name === "Walk-in Customer");
      if (walkInCustomer) {
        setSelectedCustomer(walkInCustomer);
      } else {
        // Create walk-in customer if not found
        const walkIn: Customer = {
          _id: 'walk-in',
          name: 'Walk-in Customer',
          type: 'Walk-In',
          contactInfo: { phone: '', email: '', address: '' },
          creditLimit: 0,
          outstandingBalance: 0,
          walletBalance: 0,
          isActive: true,
          organizationId: '',
          createdAt: new Date().toISOString(),
          maxDiscountPercentage: 100,
        };
        setSelectedCustomer(walkIn);
      }
    }
  }, [customers]);

  // Barcode scanner: Auto-sleep after 5 minutes of inactivity
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityTime;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (inactiveTime >= fiveMinutes && scannerActive) {
        setScannerActive(false);
        toast.info('Barcode scanner sleeping due to inactivity');
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInactivity);
  }, [lastActivityTime, scannerActive]);

  // Barcode scanner: Wake up on any activity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());
      if (!scannerActive) {
        setScannerActive(true);
        toast.success('Barcode scanner activated');
      }
    };

    // Listen for mouse movement, clicks, and keyboard activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [scannerActive]);

  // Barcode scanner: Listen for barcode input
  useEffect(() => {
    if (!scannerActive) return;

    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Enter key means barcode scan is complete
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault();
        handleBarcodeScanned(barcodeBuffer);
        setBarcodeBuffer('');
        clearTimeout(timeout);
        return;
      }

      // Build barcode buffer
      if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);

        // Clear buffer after 100ms of no input (barcode scanners are fast)
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setBarcodeBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [scannerActive, barcodeBuffer, products, cartItems]);

  // Handle barcode scanned
  const handleBarcodeScanned = (barcode: string) => {
    // Find product by SKU, old barcode field, or new barcodes array
    const product = products.find(
      p => p.sku?.toLowerCase() === barcode.toLowerCase() ||
        p._id === barcode ||
        p.barcodes?.some(b => b.code === barcode)
    );

    if (!product) {
      toast.error(`Product not found for barcode: ${barcode}`);
      return;
    }

    if (product.currentStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    // Check if product already in cart
    const existingItem = cartItems.find(item => item.productId === product._id);

    if (existingItem) {
      // Increment quantity
      setCartItems(prev =>
        prev.map(item => {
          if (item.productId === product._id) {
            const newQuantity = item.quantity + 1;
            const subTotal = item.rate * newQuantity;
            const itemDiscountAmount = item.itemDiscountAmount || 0;
            const totalDiscount = itemDiscountAmount * newQuantity;
            const finalAmount = subTotal - totalDiscount;

            toast.success(`${product.name} quantity updated to ${newQuantity}`);

            return {
              ...item,
              quantity: newQuantity,
              discountAmount: totalDiscount,
              subTotal,
              finalAmount,
            };
          }
          return item;
        })
      );
    } else {
      // Add new item to cart with quantity 1
      const subTotal = product.pricePerUnit;
      const finalAmount = subTotal;

      const newCartItem: CartItem = {
        _id: product._id,
        productId: product._id,
        vendorId: "",
        billId: 0,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        quantity: 1,
        volumePerUnitML: product.volumeML,
        rate: product.pricePerUnit,
        subTotal,
        itemDiscountAmount: 0,
        discountAmount: 0,
        finalAmount,
        vatAmount: product.taxInfo?.vat,
        tcsAmount: product.taxInfo?.tcs,
      };

      setCartItems(prev => [...prev, newCartItem]);
      toast.success(`${product.name} added to cart`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Wider Container */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-4">
        {/* Customer Selection Section */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <CustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />

          {/* Date input — visible only when customer is not Walk-In */}
          {selectedCustomer && selectedCustomer.type !== "Walk-In" && (
            <Input
              type="date"
              value={billDate.slice(0, 10)}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                selectedDate.setHours(4, 5, 0, 0);
                setBillDate(selectedDate.toISOString());
              }}
              min={
                products.at(0)?.morningStockLastUpdatedDate
                  ? products.at(0)?.morningStockLastUpdatedDate?.slice(0, 10)
                  : new Date().toISOString().slice(0, 10)
              }
              max={(new Date()).toDateString().split('T')[0]}
              className="w-full sm:w-auto"
            />
          )}

          {/* Scanner + Credit Payment */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${scannerActive
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
                }`}
            >
              <Scan className={`h-4 w-4 ${scannerActive ? "animate-pulse" : ""}`} />
              <span className="text-sm font-medium">
                Scanner: {scannerActive ? "Active" : "Sleeping"}
              </span>
            </div>

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
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row flex-1 gap-6 h-[100dvh] overflow-hidden">
          {/* Left Side: Product Section */}
          <div className="flex flex-col flex-[0.65] min-w-0 overflow-hidden">
            {/* Customer Info */}
            {selectedCustomer && (
              <Card className="p-4 mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
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

                  {selectedCustomer._id !== "walk-in" &&
                    selectedCustomer.type !== "Walk-In" && (
                      <>
                        <div className="flex items-center gap-2">
                          <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Due Balance
                            </p>
                            <p className="font-semibold text-primary">
                              ₹{selectedCustomer.outstandingBalance ?? 0}
                            </p>
                          </div>
                        </div>

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
                      </>
                    )}
                </div>
              </Card>
            )}

            {/* Filters */}
            <div className="flex-shrink-0 space-y-4">
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

            {/* Product List */}
            <div className="flex-1 overflow-y-auto pr-1 mt-2">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
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

          {/* Right Side: Shopping Cart */}
          <div className="flex flex-col flex-[0.35] h-full overflow-hidden mt-4 md:mt-0">
            <div className="sticky top-0 flex-1 overflow-y-auto">
              <ShoppingCart
                items={cartItems}
                customer={selectedCustomer}
                onRemoveItem={handleRemoveItem}
                onEditItem={handleEditItem}
                onComplete={handleCompleteSale}
              />
            </div>
          </div>
        </div>

        {/* Recent Sales Table (Unchanged) */}
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
                      <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
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
                          <span className={`px-2 py-1 rounded text-xs font-medium ${sale.payment?.mode === 'Cash' ? 'bg-green-100 text-green-800' :
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
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleViewBill(sale, 'main')}
                              title="View Main Bill"
                            >
                              <Eye className="h-3 w-3" />
                              Bill
                            </Button>
                            {sale.subBills && sale.subBills.length > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 bg-blue-50 border-blue-200 hover:bg-blue-100"
                                onClick={() => handleViewSubBills(sale)}
                                title={`View ${sale.subBills.length} Sub-Bills`}
                              >
                                <Layers className="h-3 w-3" />
                                {sale.subBills.length} Sub
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => handleViewBill(sale, 'sub')}
                                title="View Sub Bill"
                              >
                                <FileText className="h-3 w-3" />
                                Sub
                              </Button>
                            )}
                          </div>
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
        customer={selectedCustomer}
        open={quantityDialogOpen}
        onClose={() => setQuantityDialogOpen(false)}
        onConfirm={handleQuantityConfirm}
        initialQuantity={editingItem?.quantity}
        initialDiscount={editingItem?.itemDiscountAmount}
      />

      {selectedCustomer && (
        <CollectPaymentDialog
          customer={{
            _id: selectedCustomer._id,
            name: selectedCustomer.name,
            outstandingBalance: (selectedCustomer as any).outstandingBalance ?? 0,
          }}
          open={creditPaymentDialogOpen}
          onClose={() => setCreditPaymentDialogOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Bill Viewer */}
      {viewingBill && (
        <ThermalBillPrint
          billData={viewingBill}
          billType={viewBillType}
          onClose={handleCloseBillView}
        />
      )}

      {/* Sub-Bills Viewer */}
      {viewingSubBills && (
        <SubBillsViewer
          customer={selectedCustomer}
          sale={viewingSubBills}
          onClose={handleCloseSubBills}
        />
      )}
    </div>
  );


};

export default Index;
