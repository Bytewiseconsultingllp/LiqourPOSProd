
'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, ShoppingCart, Trash2, Edit2, Loader2 } from "lucide-react";
import { VendorSelect } from "./VendorSelect";
import { ProductSelect } from "./ProductSelect";
import { CalculationCard } from "./CalculationCard";
import { RecentPurchasesTable } from "./RecentPurchasesTable";
import { Purchase, PurchaseItem } from "@/types/purchase";
import { ProductDetails } from "@/types/product";
import { Vendor } from "@/types/vendor";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const purchaseSchema = z.object({
  vendorId: z.string().min(1, "Please select a vendor"),
  productId: z.string().min(1, "Please select a product"),
  carets: z.number().min(0, "Carets must be 0 or more"),
  pieces: z.number().min(0, "Pieces must be 0 or more"),
  pricePerCaret: z.number().min(0.01, "Price must be greater than 0"),
}).refine((data) => data.carets > 0 || data.pieces > 0, {
  message: "Please enter at least one caret or piece",
  path: ["carets"],
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

const Index = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currentItems, setCurrentItems] = useState<PurchaseItem[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      vendorId: "",
      productId: "",
      carets: 0,
      pieces: 0,
      pricePerCaret: 0,
    },
  });

  const watchVendorId = watch("vendorId");
  const watchProductId = watch("productId");
  const watchCarets = watch("carets");
  const watchPieces = watch("pieces");
  const watchPrice = watch("pricePerCaret");

  // Fetch data on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please login to continue",
      });
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const orgId = localStorage.getItem('organization') 
        ? JSON.parse(localStorage.getItem('organization')!).id 
        : 'default';

      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch products
      const productsRes = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });
      
      if (productsRes.status === 401) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please login again",
        });
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }
      
      const productsData = await productsRes.json();
      if (productsData.success) {
        setProducts(productsData.data || []);
      }

      // Fetch vendors
      const vendorsRes = await fetch('/api/vendors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });
      
      if (vendorsRes.status === 401) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please login again",
        });
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }
      
      const vendorsData = await vendorsRes.json();
      if (vendorsData.success) {
        setVendors(vendorsData.data || []);
      }

      // Fetch purchases
      const purchasesRes = await fetch('/api/purchases', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });
      
      if (purchasesRes.status === 401) {
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please login again",
        });
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }
      
      const purchasesData = await purchasesRes.json();
      if (purchasesData.success) {
        setPurchases(purchasesData.data || []);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to fetch data',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for current items
  const calculateTotals = (items: PurchaseItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const vat = subtotal * 0.35; // 35% VAT
    const subtotalPlusVat = subtotal + vat;
    const tcs = subtotalPlusVat * 0.01; // 1% TCS
    const grandTotal = subtotalPlusVat + tcs;

    return { subtotal, vat, tcs, grandTotal };
  };

  const { subtotal, vat, tcs, grandTotal } = calculateTotals(currentItems);

  const onDeleteItem = (index: number) => {
    const updatedItems = currentItems.filter((_, i) => i !== index);
    setCurrentItems(updatedItems);
    toast({
      title: "Item removed",
      description: "Item removed from purchase cart",
    });
  };

  const onEditItem = (index: number) => {
    const item = currentItems[index];
    setValue("productId", item.productId);
    setValue("carets", item.carets || 0);
    setValue("pieces", item.pieces || 0);
    setValue("pricePerCaret", item.pricePerCaret || 0);
    
    // Remove the item from cart since we're editing it
    const updatedItems = currentItems.filter((_, i) => i !== index);
    setCurrentItems(updatedItems);
    
    toast({
      title: "Editing item",
      description: "Item loaded into form for editing",
    });
  };

  const onAddItem = (data: PurchaseFormData) => {
    const product = products.find((p) => p._id === data.productId);
    if (!product) return;

    // Calculate quantity: 1 caret = 12 bottles
    const totalBottles = (data.carets * 12) + data.pieces;
    const amount = data.carets * data.pricePerCaret + data.pieces * (data.pricePerCaret / 12);

    const newItem: PurchaseItem = {
      productId: data.productId,
      productName: product.name,
      brand: product.brand,
      volumeML: product.volumeML,
      quantity: totalBottles,
      purchasePricePerUnit: amount / totalBottles,
      totalAmount: amount,
    };

    setCurrentItems([...currentItems, newItem]);
    setValue("productId", "");
    setValue("carets", 0);
    setValue("pieces", 0);
    setValue("pricePerCaret", 0);

    toast({
      title: "Item added",
      description: `${product.name} added to purchase`,
    });
  };

  const onSavePurchase = async () => {
    if (!watchVendorId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a vendor",
      });
      return;
    }

    if (currentItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one item",
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const orgId = localStorage.getItem('organization') 
        ? JSON.parse(localStorage.getItem('organization')!).id 
        : 'default';

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': orgId,
        },
        body: JSON.stringify({
          vendorId: watchVendorId,
          purchaseDate,
          items: currentItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            purchasePricePerUnit: item.purchasePricePerUnit,
          })),
          taxAmount: vat + tcs,
          paidAmount: 0,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create purchase');
      }

      toast({
        title: "Purchase saved",
        description: `Purchase order ${data.data.purchaseNumber} created successfully`,
      });

      // Reset form and refresh data
      setCurrentItems([]);
      setSelectedVendor("");
      reset();
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || 'Failed to create purchase',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b bg-card z-10 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Liquor POS - Purchase Entry</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area - Scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-6 max-w-5xl">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    New Purchase Entry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Vendor *</Label>
                      <VendorSelect
                        vendors={vendors}
                        value={watchVendorId}
                        onChange={(value) => {
                          setValue("vendorId", value);
                          setSelectedVendor(value);
                        }}
                      />
                      {errors.vendorId && (
                        <p className="text-sm text-destructive">{errors.vendorId.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">Purchase Date *</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={purchaseDate}
                        onChange={(e:any) => setPurchaseDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit(onAddItem)} className="space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="product">Product *</Label>
                      <ProductSelect
                        products={products}
                        value={watchProductId}
                        onChange={(value) => setValue("productId", value)}
                      />
                      {errors.productId && (
                        <p className="text-sm text-destructive">{errors.productId.message}</p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="carets">Carets</Label>
                        <Input
                          id="carets"
                          type="number"
                          min="0"
                          {...register("carets", { valueAsNumber: true })}
                        />
                        {errors.carets && (
                          <p className="text-sm text-destructive">{errors.carets.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pieces">Pieces</Label>
                        <Input
                          id="pieces"
                          type="number"
                          min="0"
                          max="11"
                          {...register("pieces", { valueAsNumber: true })}
                        />
                        {errors.pieces && (
                          <p className="text-sm text-destructive">{errors.pieces.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pricePerCaret">Price/Caret (₹)</Label>
                        <Input
                          id="pricePerCaret"
                          type="number"
                          step="0.01"
                          min="0"
                          {...register("pricePerCaret", { valueAsNumber: true })}
                        />
                        {errors.pricePerCaret && (
                          <p className="text-sm text-destructive">{errors.pricePerCaret.message}</p>
                        )}
                      </div>
                    </div>

                    {watchCarets > 0 || watchPieces > 0 ? (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Item Amount:</span>
                        <span className="font-semibold text-primary">
                          ₹{(watchCarets * watchPrice + watchPieces * (watchPrice / 12)).toFixed(2)}
                        </span>
                      </div>
                    ) : null}

                    <Button type="submit" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item to Purchase
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Purchases</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentPurchasesTable purchases={purchases} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Cart (Always Visible) */}
        <aside className="w-96 border-l bg-card flex-shrink-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Purchase Cart
                {currentItems.length > 0 && (
                  <span className="ml-auto text-sm font-normal bg-primary text-primary-foreground px-3 py-1 rounded-full">
                    {currentItems.length} {currentItems.length === 1 ? "item" : "items"}
                  </span>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {watchVendorId ? vendors.find(v => v._id === watchVendorId)?.name : "No vendor selected"}
              </p>
            </div>

            {currentItems.length > 0 ? (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Items in Cart</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {currentItems.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-secondary rounded-lg space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.productName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.brand} • {item.volumeML}ml • Qty: {item.quantity}
                            </p>
                          </div>
                          <span className="font-semibold text-primary">₹{item.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 pt-1 border-t border-border/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditItem(index)}
                            className="flex-1 h-8"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteItem(index)}
                            className="flex-1 h-8"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <CalculationCard subtotal={subtotal} vat={vat} tcs={tcs} grandTotal={grandTotal} />

                <Button
                  onClick={onSavePurchase}
                  disabled={loading || currentItems.length === 0 || !watchVendorId}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Save Purchase Order'
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No items in cart</p>
                <p className="text-xs mt-1">Add items to see the summary</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;
