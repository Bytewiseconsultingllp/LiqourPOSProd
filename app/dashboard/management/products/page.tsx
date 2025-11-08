'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { ProductDetails, Barcode } from '@/types/product';
import ProductsTable from './ProductsTable';
import {
  Plus,
  Search,
  Filter,
  Printer,
  Upload,
  Download,
  X,
} from 'lucide-react';
import { printStockSheet } from '@/lib/printStockSheet';
import {
  downloadProductTemplate,
  parseProductExcel,
} from '@/lib/excelTemplates';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';


const ensurePriorityVendorExists = async (): Promise<boolean> => {
  try {
    const resp = await apiFetch('/api/vendors');
    if (!resp.ok) return false;
    const data = await resp.json();
    const vendors = Array.isArray(data.data) ? data.data : [];
    const hasPriority1 = vendors.some((v: any) => (v.priority === 1 || v.vendorPriority === 1) && v.isActive !== false);
    return hasPriority1;
  } catch {
    return false;
  }
};

export default function ProductsManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    brand: '',
    category: '',
    pricePerUnit: '',
    purchasePricePerCaret: '',
    volumeML: '',
    currentStock: '',
    reorderLevel: '',
    bottlesPerCaret: '',
    barcodes: [] as Barcode[],
  });

  // Dropdown options
  const categoryOptions = ['Whisky', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin', 'Beer', 'Tequila'];
  const volumeOptions = [60, 90, 150, 180, 275, 330, 375, 500, 650, 750, 1000];

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchProducts(accessToken);
  }, [router]);

  const fetchProducts = async (token: string) => {
    try {
      const response = await apiFetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      setIsSubmitting(true);
      // Build purchase price array if purchase price per caret is provided
      const purchasePricePerUnit = [];
      if (formData.purchasePricePerCaret && parseFloat(formData.purchasePricePerCaret) > 0 && formData.bottlesPerCaret && parseInt(formData.bottlesPerCaret) > 0) {
        const pricePerBottle = parseFloat(formData.purchasePricePerCaret) / parseInt(formData.bottlesPerCaret);
        purchasePricePerUnit.push({
          purchasePrice: pricePerBottle,
          effectiveFrom: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }

      const response = await apiFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          volumeML: parseInt(formData.volumeML),
          currentStock: parseInt(formData.currentStock),
          reorderLevel: formData.reorderLevel
            ? parseInt(formData.reorderLevel)
            : undefined,
          bottlesPerCaret: formData.bottlesPerCaret
            ? parseInt(formData.bottlesPerCaret)
            : undefined,
          isActive: true,
          purchasePricePerUnit: purchasePricePerUnit,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create product');
      await fetchProducts(accessToken);
      resetForm();
      setShowCreateModal(false);
      toast.success('Product created successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setUploadingFile(true);
    setBulkUploadResults(null);
    setError('');

    try {
      // Parse Excel file
      const productsData = await parseProductExcel(file);

      if (!productsData || productsData.length === 0) {
        toast.error('No valid products found in the file');
        return;
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        toast.error('Please login again');
        return;
      }

      // Upload products one by one
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < productsData.length; i++) {
        const product = productsData[i];
        try {
          // Build purchase price array if purchase price is provided
          const purchasePricePerUnit = [];
          if (product.purchasePrice && Number(product.purchasePrice) > 0) {
            purchasePricePerUnit.push({
              purchasePrice: Number(product.purchasePrice),
              batchNumber: product.batchNumber ? String(product.batchNumber) : undefined,
              effectiveFrom: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }

          // Ensure all fields are properly typed
          const productData = {
            name: String(product.name || ''),
            description: product.description ? String(product.description) : '',
            sku: product.sku ? String(product.sku) : '',
            brand: String(product.brand || ''),
            category: String(product.category || ''),
            pricePerUnit: Number(product.pricePerUnit) || 0,
            volumeML: Number(product.volumeML) || 0,
            currentStock: Number(product.currentStock) || 0,
            morningStock: product.morningStock ? Number(product.morningStock) : undefined,
            reorderLevel: product.reorderLevel ? Number(product.reorderLevel) : undefined,
            bottlesPerCaret: product.bottlesPerCaret ? Number(product.bottlesPerCaret) : undefined,
            barcode: product.barcode ? String(product.barcode) : undefined,
            isActive: product.isActive !== false,
            purchasePricePerUnit: purchasePricePerUnit,
          };

          const response = await apiFetch('/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
          });

          if (response.ok) {
            successCount++;
          } else {
            const data = await response.json();
            if (data.error?.includes('already exists') || data.error?.includes('duplicate')) {
              skippedCount++;
              errors.push(`Row ${i + 1}: ${product.name} - Already exists`);
            } else {
              failedCount++;
              errors.push(`Row ${i + 1}: ${product.name} - ${data.error || 'Failed to create'}`);
            }
          }
        } catch (err: any) {
          failedCount++;
          errors.push(`Row ${i + 1}: ${product.name} - ${err.message}`);
        }
      }

      // Set results
      setBulkUploadResults({
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        total: productsData.length,
        errors,
      });

      // Refresh products list
      await fetchProducts(accessToken);

      // Show summary toast
      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} product(s)`);
      }
      if (failedCount > 0) {
        toast.error(`Failed to create ${failedCount} product(s)`);
      }
      if (skippedCount > 0) {
        toast.warning(`Skipped ${skippedCount} duplicate product(s)`);
      }

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to process Excel file');
    } finally {
      setUploadingFile(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      setIsSubmitting(true);
      
      // Build purchase price update if purchase price per caret is provided
      let purchasePriceUpdate = undefined;
      if (formData.purchasePricePerCaret && parseFloat(formData.purchasePricePerCaret) > 0 && formData.bottlesPerCaret && parseInt(formData.bottlesPerCaret) > 0) {
        const pricePerBottle = parseFloat(formData.purchasePricePerCaret) / parseInt(formData.bottlesPerCaret);
        purchasePriceUpdate = {
          purchasePrice: pricePerBottle,
          effectiveFrom: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      }
      
      const response = await apiFetch(`/api/products/${selectedProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          volumeML: parseInt(formData.volumeML),
          currentStock: parseInt(formData.currentStock),
          reorderLevel: formData.reorderLevel
            ? parseInt(formData.reorderLevel)
            : undefined,
          bottlesPerCaret: formData.bottlesPerCaret
            ? parseInt(formData.bottlesPerCaret)
            : undefined,
          purchasePriceUpdate: purchasePriceUpdate,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update product');
      await fetchProducts(accessToken);
      setShowEditModal(false);
      setSelectedProduct(null);
      resetForm();
      toast.success('Product updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (product: ProductDetails) => {
    setSelectedProduct(product);
    
    // Calculate purchase price per caret from latest purchase price
    let purchasePricePerCaret = '';
    if (product.purchasePricePerUnit && product.purchasePricePerUnit.length > 0 && product.bottlesPerCaret) {
      const sorted = [...product.purchasePricePerUnit].sort((a, b) =>
        new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      );
      const latestPurchasePrice = sorted[0].purchasePrice;
      purchasePricePerCaret = (latestPurchasePrice * product.bottlesPerCaret).toFixed(2);
    }
    
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      brand: product.brand,
      category: product.category,
      pricePerUnit: product.pricePerUnit.toString(),
      purchasePricePerCaret: purchasePricePerCaret,
      volumeML: product.volumeML.toString(),
      currentStock: product.currentStock.toString(),
      reorderLevel: product.reorderLevel?.toString() || '',
      bottlesPerCaret: product.bottlesPerCaret?.toString() || '',
      barcodes: product.barcodes || [],
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      brand: '',
      category: '',
      pricePerUnit: '',
      purchasePricePerCaret: '',
      volumeML: '',
      currentStock: '',
      reorderLevel: '',
      bottlesPerCaret: '',
      barcodes: [],
    });
  };

  // 🆕 Handle multiple barcode uploads
  const handleBarcodesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const readers = Array.from(files).map(
      (file) =>
        new Promise<Barcode>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              code: reader.result as string,
              createdAt: new Date().toISOString(),
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers)
      .then((newBarcodes) => {
        setFormData((prev) => ({
          ...prev,
          barcodes: [...prev.barcodes, ...newBarcodes],
        }));
        toast.success(`${newBarcodes.length} barcode(s) added.`);
      })
      .catch(() => toast.error('Error reading barcode files.'));
  };

  const removeBarcode = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      barcodes: prev.barcodes.filter((_, i) => i !== index),
    }));
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.brand &&
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="text-gray-500" size={18} />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus size={18} /> New Product
          </button>

          <button
            onClick={() => printStockSheet(filteredProducts)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
          >
            <Printer size={18} /> Print Stock Sheet
          </button>

          <button
            onClick={downloadProductTemplate}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
            title="Download Excel Template"
          >
            <Download className="w-5 h-5" />
            Template
          </button>

          <button
            onClick={async () => {
              const ok = await ensurePriorityVendorExists();
              if (!ok) {
                toast.error('Bulk upload requires an active Vendor with priority 1. Please create one first in Vendors.');
                return;
              }
              setShowBulkUploadModal(true);
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 whitespace-nowrap"
            title="Bulk Upload Products"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload
          </button>
        </div>
      </div>

      {/* Table */}
      <ProductsTable
        products={filteredProducts}
        onEdit={openEditModal}
        onDelete={() => {
          const token = localStorage.getItem('accessToken');
          if (token) fetchProducts(token);
        }}
        onRefresh={() => {
          const token = localStorage.getItem('accessToken');
          if (token) fetchProducts(token);
        }}
      />

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {showCreateModal ? 'Create New Product' : 'Edit Product'}
              </h2>
            </div>

            <form
              onSubmit={
                showCreateModal ? handleCreateProduct : handleUpdateProduct
              }
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="space-y-1">
                <Label>Product Name</Label>
                <Input
                  placeholder="Product Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Brand</Label>
                <Input
                  placeholder="Brand"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>SKU</Label>
                <Input
                  placeholder="SKU"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>MRP</Label>
                <Input
                  placeholder="Price per Unit"
                  type="number"
                  value={formData.pricePerUnit}
                  onChange={(e) =>
                    setFormData({ ...formData, pricePerUnit: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Volume (ML)</Label>
                <Select
                  value={formData.volumeML}
                  onValueChange={(val) => setFormData({ ...formData, volumeML: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select volume" />
                  </SelectTrigger>
                  <SelectContent>
                    {volumeOptions.map((v) => (
                      <SelectItem key={v} value={String(v)}>{v} ML</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Current Stock</Label>
                <Input
                  disabled={showCreateModal ? false : true}
                  placeholder="Current Stock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) =>
                    setFormData({ ...formData, currentStock: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Reorder Level</Label>
                <Input
                  placeholder="Reorder Level"
                  type="number"
                  value={formData.reorderLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderLevel: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Bottles per caret</Label>
                <Input
                  placeholder="Bottles per caret"
                  type="number"
                  value={formData.bottlesPerCaret}
                  onChange={(e) =>
                    setFormData({ ...formData, bottlesPerCaret: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Purchase Price per Caret</Label>
                <Input
                  placeholder="Purchase Price per Caret"
                  type="number"
                  step="0.01"
                  value={formData.purchasePricePerCaret}
                  onChange={(e) =>
                    setFormData({ ...formData, purchasePricePerCaret: e.target.value })
                  }
                />
                {formData.purchasePricePerCaret && formData.bottlesPerCaret && (
                  <p className="text-xs text-gray-500 mt-1">
                    Per Bottle: ₹{(parseFloat(formData.purchasePricePerCaret) / parseInt(formData.bottlesPerCaret)).toFixed(2)}
                  </p>
                )}
              </div>


              {/* 🆕 Barcode Upload & Preview */}
              {/* <div className="md:col-span-2 mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barcode Images
                </label>
                <Input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleBarcodesUpload}
                  className="w-full border rounded-lg p-2"
                />
              </div> */}

              {/* {formData.barcodes.length > 0 && (
                <div className="md:col-span-2 grid grid-cols-3 gap-3 mt-3">
                  {formData.barcodes.map((b, i) => (
                    <div
                      key={i}
                      className="relative border rounded-lg p-2 bg-gray-50 flex items-center justify-center"
                    >
                      <img
                        src={b.code}
                        alt={`Barcode ${i + 1}`}
                        className="h-24 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => removeBarcode(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )} */}

              {/* Buttons */}
              <div className="md:col-span-2 flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : showCreateModal
                      ? 'Create Product'
                      : 'Update Product'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Bulk Upload Products</h2>
              <p className="text-sm text-gray-600 mt-1">Upload multiple products using an Excel file</p>
            </div>

            <div className="p-6">
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the Excel template using the "Template" button</li>
                  <li>Fill in the product details in the template</li>
                  <li>Required fields: Product Name, Brand, Category, Price, Volume, Stock</li>
                  <li>Delete the example rows before uploading</li>
                  <li>Upload the completed file below</li>
                </ol>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    disabled={uploadingFile}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={downloadProductTemplate}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Download className="w-5 h-5" />
                    Download Template
                  </button>
                </div>
              </div>

              {/* Upload Progress */}
              {uploadingFile && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                    <p className="text-yellow-800">Processing file...</p>
                  </div>
                </div>
              )}

              {/* Upload Results */}
              {bulkUploadResults && (
                <div className="mb-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <h3 className="font-semibold text-green-900 mb-2">Upload Summary</h3>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>✅ Successfully created: {bulkUploadResults.success} products</p>
                      {bulkUploadResults.skipped > 0 && (
                        <p>⏭️ Skipped (already exists): {bulkUploadResults.skipped} products</p>
                      )}
                      {bulkUploadResults.failed > 0 && (
                        <p>❌ Failed: {bulkUploadResults.failed} products</p>
                      )}
                    </div>
                  </div>

                  {bulkUploadResults.errors.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-h-48 overflow-y-auto">
                      <h3 className="font-semibold text-yellow-900 mb-2">Details:</h3>
                      <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                        {bulkUploadResults.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    setBulkUploadResults(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}