"use client";
import heroBg from "@/assets/hero-bg.jpg";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useProducts } from "@/lib/hooks/useProducts";
import { Customer } from "@/types/customer";
import { apiFetch } from "@/lib/api-client";
import { ProductDetails } from "@/types/product";
import {
  AlertCircle,
  CreditCard,
  Loader2,
  Phone,
  User,
  Wallet,
  Eye,
  FileText,
  Layers,
  CreditCardIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { CustomerSelector } from "../sales/CustomerSelector";
import { ProductCard } from "../sales/ProductCard";
import { ProductFilters } from "../sales/ProductFilters";
import { ProductSearch } from "../sales/ProductSearch";
import { Input } from "../components/ui/input";
import { ThermalBillPrint } from "@/components/ThermalBillPrint";
import { SubBillsViewer } from "@/components/SubBillsViewer";
import { B2BShoppingCart } from "./B2BShoppingCart";
import { B2BQuantityDialog } from "./B2BQuantityDialog";

// B2B Cart Item interface (no discounts)
export interface B2BCartItem {
  _id: string;
  productId: string;
  vendorId: string;
  productName: string;
  brand: string;
  category: string;
  quantity: number;
  volumePerUnitML: number;
  rate: number; // Purchase price per bottle
  subTotal: number;
  finalAmount: number;
  imageUrl?: string;
}

// B2B Payment interface
export interface B2BPayment {
  mode: string;
  method: string;
  cashAmount: number;
  cash: number;
  onlineAmount: number;
  online: number;
  creditAmount: number;
  credit: number;
  totalAmount: number;
}

const B2BSalesPage = () => {
  // Fetch products and customers from API
  const {
    products,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts({ isActive: true });
  const {
    customers: allCustomers,
    loading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useCustomers({ isActive: true });

  // Filter only B2B customers
  const customers = useMemo(() => {
    return allCustomers.filter(c => c.type === 'B2B' || c._id === 'walk-in');
  }, [allCustomers]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedVolumes, setSelectedVolumes] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<B2BCartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(
    null
  );
  const [editingItem, setEditingItem] = useState<B2BCartItem | null>(null);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
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
    const updated = allCustomers.find((c) => c._id === selectedCustomer._id);
    if (updated && updated !== selectedCustomer) {
      setSelectedCustomer(updated);
    }
  }, [allCustomers, selectedCustomer]);

  const fetchRecentSales = async () => {
    try {
      setSalesLoading(true);
      const response = await apiFetch("/api/sales?limit=10");
      const data = await response.json();
      setRecentSales(data.data || []);
    } catch (error: any) {
      console.error("Failed to fetch recent sales:", error);
    } finally {
      setSalesLoading(false);
    }
  };

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

  // Get latest purchase price for a product
  const getLatestPurchasePrice = (product: ProductDetails): number => {
    if (!product.purchasePricePerUnit || product.purchasePricePerUnit.length === 0) {
      // Fallback to selling price if no purchase price
      return product.pricePerUnit;
    }
    // Sort by effectiveFrom date and get the latest
    const sorted = [...product.purchasePricePerUnit].sort((a, b) =>
      new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    );
    return sorted[0].purchasePrice || product.pricePerUnit;
  };

  const handleProductSelect = (product: ProductDetails) => {
    if (product.currentStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setSelectedProduct(product);
    setEditingItem(null);
    setQuantityDialogOpen(true);
  };

  const handleAddToCart = (quantity: number, vendorId: string) => {
    if (!selectedProduct) return;

    const purchasePrice = getLatestPurchasePrice(selectedProduct);
    const subTotal = purchasePrice * quantity;

    const newItem: B2BCartItem = {
      _id: Date.now().toString(),
      productId: selectedProduct._id,
      vendorId: vendorId,
      productName: selectedProduct.name,
      brand: selectedProduct.brand,
      category: selectedProduct.category || "",
      quantity,
      volumePerUnitML: selectedProduct.volumeML,
      rate: purchasePrice,
      subTotal,
      finalAmount: subTotal,
      imageUrl: selectedProduct.imageUrl,
    };

    setCartItems((prev) => [...prev, newItem]);
    setQuantityDialogOpen(false);
    setSelectedProduct(null);
    toast.success(`${selectedProduct.name} added to cart`);
  };

  const handleUpdateCart = (quantity: number, vendorId: string) => {
    if (!editingItem || !selectedProduct) return;

    const purchasePrice = getLatestPurchasePrice(selectedProduct);
    const subTotal = purchasePrice * quantity;

    setCartItems((prev) =>
      prev.map((item) =>
        item._id === editingItem._id
          ? {
            ...item,
            quantity,
            vendorId,
            rate: purchasePrice,
            subTotal,
            finalAmount: subTotal,
          }
          : item
      )
    );

    setQuantityDialogOpen(false);
    setEditingItem(null);
    setSelectedProduct(null);
    toast.success("Cart updated");
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item._id !== id));
    toast.success("Item removed from cart");
  };

  const handleEditItem = (item: B2BCartItem) => {
    const product = products.find((p) => p._id === item.productId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    setSelectedProduct(product);
    setEditingItem(item);
    setQuantityDialogOpen(true);
  };

  const handleCompleteSale = async (payment: B2BPayment) => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const totalQuantityBottles = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalVolumeML = cartItems.reduce(
        (sum, item) => sum + item.quantity * item.volumePerUnitML,
        0
      );

      // Calculate subtotal (sum of all item subtotals)
      const subTotalAmount = cartItems.reduce((sum, item) => sum + item.subTotal, 0);

      // Calculate VAT: 35% of subtotal
      const vatAmount = subTotalAmount * 0.35;

      // Calculate TCS: 1% of (subtotal + VAT) = 1% of (subtotal * 1.35)
      const tcsAmount = (subTotalAmount * 1.35) * 0.01;

      // Grand total
      const totalAmount = subTotalAmount + vatAmount + tcsAmount;

      // Prepare bill items
      const billItems = cartItems.map((item) => ({
        productId: item.productId,
        vendorId: item.vendorId,
        productName: item.productName,
        brand: item.brand,
        category: item.category,
        quantity: item.quantity,
        volumePerUnitML: item.volumePerUnitML,
        rate: item.rate,
        subTotal: item.subTotal,
        discountAmount: 0, // No discounts in B2B
        itemDiscountAmount: 0,
        promotionDiscountAmount: 0,
        finalAmount: item.finalAmount,
        vatAmount: (item.subTotal * 0.35), // VAT per item
        tcsAmount: ((item.subTotal * 1.35) * 0.01), // TCS per item
      }));

      const billData = {
        customerId: selectedCustomer._id === "walk-in" ? undefined : selectedCustomer._id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.contactInfo?.phone || "",
        customerType: selectedCustomer._id === "walk-in" ? "walk-in" : "registered",
        items: billItems,
        totalQuantityBottles,
        totalVolumeML,
        subTotalAmount,
        totalDiscountAmount: 0, // No discounts
        itemDiscountAmount: 0,
        billDiscountAmount: 0,
        promotionDiscountAmount: 0,
        appliedPromotions: [], // No promotions
        totalAmount: totalAmount,
        saleDate: new Date(billDate).toISOString(),
        payment: {
          mode: payment.mode,
          cashAmount: payment.cashAmount,
          onlineAmount: payment.onlineAmount,
          creditAmount: payment.creditAmount,
          totalAmount: payment.totalAmount,
        },
        // Store VAT and TCS for reference (not saved in schema but useful for reports)
        metadata: {
          vatAmount,
          tcsAmount,
          isB2BSale: true,
        },
      };

      const response = await apiFetch("/api/sales/B2BCreate", {
        method: "POST",
        body: JSON.stringify(billData),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("B2B Sale completed successfully!");

        // Show bill
        setViewingBill(data.data);
        setViewBillType('main');

        // Clear cart
        setCartItems([]);

        // Refresh data
        await Promise.all([
          refetchProducts(),
          refetchCustomers(),
          fetchRecentSales(),
        ]);
      } else {
        throw new Error(data.error || "Failed to complete sale");
      }
    } catch (error: any) {
      console.error("Sale error:", error);
      toast.error(error.message || "Failed to complete sale");
      throw error;
    }
  };

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

  const handleViewBill = (bill: any) => {
    setViewingBill(bill);
    setViewBillType('main');
  };

  const handleViewSubBills = (bill: any) => {
    setViewingSubBills(bill);
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
    // style={{ backgroundImage: `url(${heroBg.src})` }}
    >
      <div className="min-h-screen backdrop-blur-sm">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-black mb-2">B2B Sales (Purchase Price)</h1>
            <p className="text-black/80">
              Sales using purchase prices with VAT (35%) and TCS (1%) calculations
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Left Section - Products */}
            <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
              {/* Customer Selection */}
              {!selectedCustomer ? (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Select Customer</h2>
                  <CustomerSelector
                    customers={customers}
                    selectedCustomer={selectedCustomer}
                    onSelectCustomer={setSelectedCustomer}
                  />
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <User className="h-10 w-10 text-primary" />
                      <div className="flex items-center gap-4">
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
                              <p className="font-semibold">{selectedCustomer.contactInfo.phone}</p>
                            </div>
                          </div>
                        )}

                        {selectedCustomer._id !== "walk-in" &&
                          selectedCustomer.type !== "Walk-In" && (
                            <div className="flex items-center gap-2">
                              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Due Balance</p>
                                <p className="font-semibold text-primary">
                                  ₹{(selectedCustomer.outstandingBalance ?? 0)}
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      Change Customer
                    </Button>
                  </div>
                </Card>
              )}

              {/* Filters */}
              <div className="flex-shrink-0 space-y-4">
                <ProductSearch products={products} onSelectProduct={handleProductSelect} />
                <ProductFilters
                  selectedVolumes={selectedVolumes}
                  selectedCategories={selectedCategories}
                  onVolumeToggle={handleVolumeToggle}
                  onCategoryToggle={handleCategoryToggle}
                  onClearFilters={handleClearFilters}
                />
              </div>

              {/* Product List */}
              <div className="flex-1 overflow-y-auto pr-2 mt-2">
                {productsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading products...</span>
                  </div>
                ) : productsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {productsError}{" "}
                      <button onClick={refetchProducts} className="ml-2 underline font-semibold">
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

            {/* Cart */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
              <div className="sticky top-0 flex-1 overflow-y-auto">
                <B2BShoppingCart
                  items={cartItems}
                  customer={selectedCustomer}
                  onRemoveItem={handleRemoveItem}
                  onEditItem={handleEditItem}
                  onComplete={handleCompleteSale}
                />
              </div>
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="mt-8">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Recent B2B Sales</h2>
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
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${sale.payment?.mode === "Cash"
                                ? "bg-green-100 text-green-800"
                                : sale.payment?.mode === "Online"
                                  ? "bg-blue-100 text-blue-800"
                                  : sale.payment?.mode === "Credit"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                            >
                              {sale.payment?.mode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(sale.saleDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewBill(sale)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {sale.subBills && sale.subBills.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewSubBills(sale)}
                                >
                                  <Layers className="h-4 w-4" />
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
      </div>

      {/* Quantity Dialog */}
      {selectedProduct && (
        <B2BQuantityDialog
          open={quantityDialogOpen}
          onOpenChange={setQuantityDialogOpen}
          product={selectedProduct}
          editingItem={editingItem}
          onAdd={handleAddToCart}
          onUpdate={handleUpdateCart}
          purchasePrice={getLatestPurchasePrice(selectedProduct)}
        />
      )}

      {/* Bill Print Dialog */}
      {viewingBill && (
        <ThermalBillPrint
          billData={viewingBill}
          onClose={() => setViewingBill(null)}
          billType={viewBillType}
        />
      )}

      {/* Sub Bills Viewer */}
      {viewingSubBills && (
        <SubBillsViewer
          sale={viewingSubBills}
          onClose={() => setViewingSubBills(null)}
        />
      )}
    </div>
  );
};

export default B2BSalesPage;
