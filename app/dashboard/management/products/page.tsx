// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { ProductDetails } from '@/types/product';
// import ProductsTable from './ProductsTable';
// import { Plus, Search, Filter } from 'lucide-react';

// export default function ProductsManagementPage() {
//   const router = useRouter();
//   const [products, setProducts] = useState<ProductDetails[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [showCreateModal, setShowCreateModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterCategory, setFilterCategory] = useState<string>('all');

//   const [formData, setFormData] = useState({
//     name: '',
//     description: '',
//     sku: '',
//     brand: '',
//     category: '',
//     pricePerUnit: '',
//     volumeML: '',
//     currentStock: '',
//     reorderLevel: '',
//     noOfBottlesPerCaret: '',
//     bottlesPerCaret: '',
//     noOfCarets: '',
//   });

//   useEffect(() => {
//     const accessToken = localStorage.getItem('accessToken');
//     if (!accessToken) {
//       router.push('/login');
//       return;
//     }
//     fetchProducts(accessToken);
//   }, [router]);

//   const fetchProducts = async (token: string) => {
//     try {
//       const response = await fetch('/api/products', {
//         headers: { 
//           'Authorization': `Bearer ${token}`,
//         },
//       });

//       if (!response.ok) throw new Error('Failed to fetch products');

//       const data = await response.json();
//       setProducts(data.data || []);
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');

//     const accessToken = localStorage.getItem('accessToken');
//     if (!accessToken) return;

//     try {
//       const response = await fetch('/api/products', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           name: formData.name,
//           description: formData.description,
//           sku: formData.sku,
//           brand: formData.brand,
//           category: formData.category,
//           pricePerUnit: parseFloat(formData.pricePerUnit),
//           volumeML: parseInt(formData.volumeML),
//           currentStock: parseInt(formData.currentStock),
//           reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : undefined,
//           noOfBottlesPerCaret: formData.noOfBottlesPerCaret ? parseInt(formData.noOfBottlesPerCaret) : undefined,
//           bottlesPerCaret: formData.bottlesPerCaret ? parseInt(formData.bottlesPerCaret) : undefined,
//           noOfCarets: formData.noOfCarets ? parseInt(formData.noOfCarets) : undefined,
//           isActive: true,
//           purchasePricePerUnit: [],
//         }),
//       });

//       const data = await response.json();
//       if (!response.ok) throw new Error(data.error || 'Failed to create product');

//       await fetchProducts(accessToken);
//       resetForm();
//       setShowCreateModal(false);
//     } catch (err: any) {
//       setError(err.message);
//     }
//   };

//   const handleUpdateProduct = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!selectedProduct) return;

//     const accessToken = localStorage.getItem('accessToken');
//     if (!accessToken) return;

//     try {
//       const response = await fetch(`/api/products/${selectedProduct._id}`, {
//         method: 'PUT',
//         headers: {
//           'Authorization': `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           name: formData.name,
//           description: formData.description,
//           sku: formData.sku,
//           brand: formData.brand,
//           category: formData.category,
//           pricePerUnit: parseFloat(formData.pricePerUnit),
//           volumeML: parseInt(formData.volumeML),
//           currentStock: parseInt(formData.currentStock),
//           reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : undefined,
//           noOfBottlesPerCaret: formData.noOfBottlesPerCaret ? parseInt(formData.noOfBottlesPerCaret) : undefined,
//           bottlesPerCaret: formData.bottlesPerCaret ? parseInt(formData.bottlesPerCaret) : undefined,
//           noOfCarets: formData.noOfCarets ? parseInt(formData.noOfCarets) : undefined,
//         }),
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.error || 'Failed to update product');
//       }

//       await fetchProducts(accessToken);
//       setShowEditModal(false);
//       setSelectedProduct(null);
//       resetForm();
//     } catch (err: any) {
//       setError(err.message);
//     }
//   };

//   const handleDeleteProduct = async (productId: string) => {
//     if (!confirm('Are you sure you want to delete this product?')) return;

//     const accessToken = localStorage.getItem('accessToken');
//     if (!accessToken) return;

//     try {
//       const response = await fetch(`/api/products/${productId}`, {
//         method: 'DELETE',
//         headers: { 'Authorization': `Bearer ${accessToken}` },
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.error || 'Failed to delete product');
//       }

//       await fetchProducts(accessToken);
//     } catch (err: any) {
//       setError(err.message);
//     }
//   };

//   const openEditModal = (product: ProductDetails) => {
//     setSelectedProduct(product);
//     setFormData({
//       name: product.name,
//       description: product.description || '',
//       sku: product.sku || '',
//       brand: product.brand,
//       category: product.category,
//       pricePerUnit: product.pricePerUnit.toString(),
//       volumeML: product.volumeML.toString(),
//       currentStock: product.currentStock.toString(),
//       reorderLevel: product.reorderLevel?.toString() || '',
//       noOfBottlesPerCaret: product.noOfBottlesPerCaret?.toString() || '',
//       bottlesPerCaret: product.bottlesPerCaret?.toString() || '',
//       noOfCarets: product.noOfCarets?.toString() || '',
//     });
//     setShowEditModal(true);
//   };

//   const resetForm = () => {
//     setFormData({
//       name: '', description: '', sku: '', brand: '', category: '',
//       pricePerUnit: '', volumeML: '', currentStock: '', reorderLevel: '',
//       noOfBottlesPerCaret: '', bottlesPerCaret: '', noOfCarets: '',
//     });
//   };

//   const categories = Array.from(new Set(products.map(p => p.category)));
//   const filteredProducts = products.filter(product => {
//     const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
//                          (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
//     const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
//     return matchesSearch && matchesCategory;
//   });

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6">
//       {/* Header */}
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
//         <p className="text-gray-600">Manage your product inventory and details</p>
//       </div>

//       {/* Error Message */}
//       {error && (
//         <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
//           {error}
//         </div>
//       )}

//       {/* Filters and Actions */}
//       <div className="mb-6 flex flex-col sm:flex-row gap-4">
//         <div className="flex-1 relative">
//           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//           <Input
//             type="text"
//             placeholder="Search products by name, SKU, or brand..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//           />
//         </div>

//         <div className="flex gap-2">
//           <div className="relative">
//             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//             <select
//               value={filterCategory}
//               onChange={(e) => setFilterCategory(e.target.value)}
//               className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
//             >
//               <option value="all">All Categories</option>
//               {categories.map(cat => (
//                 <option key={cat} value={cat}>{cat}</option>
//               ))}
//             </select>
//           </div>

//           <button
//             onClick={() => setShowCreateModal(true)}
//             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
//           >
//             <Plus className="w-5 h-5" />
//             Add Product
//           </button>
//         </div>
//       </div>

//       {/* Products Table */}
//       <ProductsTable
//         products={filteredProducts}
//         onEdit={openEditModal}
//         onDelete={handleDeleteProduct}
//         onRefresh={() => {
//           const accessToken = localStorage.getItem('accessToken');
//           if (accessToken) fetchProducts(accessToken);
//         }}
//       />

//       {/* Create/Edit Modal */}
//       {(showCreateModal || showEditModal) && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
//           <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
//             <div className="p-6 border-b border-gray-200">
//               <h2 className="text-2xl font-bold text-gray-900">
//                 {showCreateModal ? 'Create New Product' : 'Edit Product'}
//               </h2>
//             </div>

//             <form onSubmit={showCreateModal ? handleCreateProduct : handleUpdateProduct} className="p-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="md:col-span-2">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
//                   <Input
//                     type="text"
//                     required
//                     value={formData.name}
//                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div className="md:col-span-2">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
//                   <textarea
//                     value={formData.description}
//                     onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//                     rows={3}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
//                   <Input
//                     type="text"
//                     value={formData.sku}
//                     onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
//                   <Input
//                     type="text"
//                     required
//                     value={formData.brand}
//                     onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
//                   <Input
//                     type="text"
//                     required
//                     value={formData.category}
//                     onChange={(e) => setFormData({ ...formData, category: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Volume (ML) *</label>
//                   <Input
//                     type="number"
//                     required
//                     value={formData.volumeML}
//                     onChange={(e) => setFormData({ ...formData, volumeML: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Unit (₹) *</label>
//                   <Input
//                     type="number"
//                     step="0.01"
//                     required
//                     value={formData.pricePerUnit}
//                     onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock *</label>
//                   <Input
//                     type="number"
//                     required
//                     value={formData.currentStock}
//                     onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Level</label>
//                   <Input
//                     type="number"
//                     value={formData.reorderLevel}
//                     onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Bottles Per Caret</label>
//                   <Input
//                     type="number"
//                     value={formData.bottlesPerCaret}
//                     onChange={(e) => setFormData({ ...formData, bottlesPerCaret: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Number of Carets</label>
//                   <Input
//                     type="number"
//                     value={formData.noOfCarets}
//                     onChange={(e) => setFormData({ ...formData, noOfCarets: e.target.value })}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//               </div>

//               <div className="flex gap-3 mt-6">
//                 <button
//                   type="submit"
//                   className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//                 >
//                   {showCreateModal ? 'Create Product' : 'Update Product'}
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowCreateModal(false);
//                     setShowEditModal(false);
//                     setSelectedProduct(null);
//                     resetForm();
//                   }}
//                   className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { ProductDetails } from '@/types/product';
import ProductsTable from './ProductsTable';
import { Plus, Search, Filter, AlertCircle, Printer, Upload, Download } from 'lucide-react';
import { printStockSheet } from '@/lib/printStockSheet';
import { downloadProductTemplate, parseProductExcel } from '@/lib/excelTemplates';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';

export default function ProductsManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null);
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
    volumeML: '',
    currentStock: '',
    reorderLevel: '',
    bottlesPerCaret: '',
  });

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
    setError('');
    if (isSubmitting) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      setIsSubmitting(true);
      const response = await apiFetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          sku: formData.sku,
          brand: formData.brand,
          category: formData.category,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          volumeML: parseInt(formData.volumeML),
          currentStock: parseInt(formData.currentStock),
          reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : undefined,
          bottlesPerCaret: formData.bottlesPerCaret ? parseInt(formData.bottlesPerCaret) : undefined,
          isActive: true,
          purchasePricePerUnit: [],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create product');

      await fetchProducts(accessToken);
      resetForm();
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message);
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      const organization = localStorage.getItem('organization');
      const tenantId = organization ? JSON.parse(organization).id : 'default';

      const response = await apiFetch(`/api/products/${selectedProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          sku: formData.sku,
          brand: formData.brand,
          category: formData.category,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          volumeML: parseInt(formData.volumeML),
          currentStock: parseInt(formData.currentStock),
          reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : undefined,
          bottlesPerCaret: formData.bottlesPerCaret ? parseInt(formData.bottlesPerCaret) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update product');
      }

      const data = await response.json();
      console.log('Product updated successfully:', data);

      await fetchProducts(accessToken);
      setShowEditModal(false);
      setSelectedProduct(null);
      resetForm();
      setError(''); // Clear any previous errors

      // Show success message (you can replace this with a toast notification)
      alert('Product updated successfully!');
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      const organization = localStorage.getItem('organization');
      const tenantId = organization ? JSON.parse(organization).id : 'default';

      const response = await apiFetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      await fetchProducts(accessToken);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (product: ProductDetails) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      brand: product.brand,
      category: product.category,
      pricePerUnit: product.pricePerUnit.toString(),
      volumeML: product.volumeML.toString(),
      currentStock: product.currentStock.toString(),
      reorderLevel: product.reorderLevel?.toString() || '',
      bottlesPerCaret: product.bottlesPerCaret?.toString() || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', sku: '', brand: '', category: '',
      pricePerUnit: '', volumeML: '', currentStock: '', reorderLevel: '',
      bottlesPerCaret: '',
    });
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setBulkUploadResults(null);

    try {
      // Parse Excel file
      const products = await parseProductExcel(file);

      if (products.length === 0) {
        toast.error('No valid products found in the file');
        return;
      }

      // Upload to API
      const response = await apiFetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });

      const data = await response.json();

      if (data.success) {
        setBulkUploadResults(data.results);
        toast.success(data.message);

        // Refresh products list
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) fetchProducts(accessToken);
      } else {
        toast.error(data.error || 'Bulk upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process file');
    } finally {
      setUploadingFile(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category)));
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
        <p className="text-gray-600">Manage your product inventory and details</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search products by name, SKU, or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button
            onClick={downloadProductTemplate}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
            title="Download Excel Template"
          >
            <Download className="w-5 h-5" />
            Template
          </button>

          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 whitespace-nowrap"
            title="Bulk Upload Products"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload
          </button>

          <button
            onClick={() => printStockSheet(products)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
            title="Print Stock Sheet"
          >
            <Printer className="w-5 h-5" />
            Stock Sheet
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <ProductsTable
        products={filteredProducts}
        onEdit={openEditModal}
        onDelete={handleDeleteProduct}
        onRefresh={() => {
          const accessToken = localStorage.getItem('accessToken');
          if (accessToken) fetchProducts(accessToken);
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

            <form onSubmit={showCreateModal ? handleCreateProduct : handleUpdateProduct} className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                  <Input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
                  <Input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Select a category</option>
                    <option value="Beer">Beer</option>
                    <option value="Wine">Wine</option>
                    <option value="Whisky">Whisky</option>
                    <option value="Vodka">Vodka</option>
                    <option value="Rum">Rum</option>
                    <option value="Gin">Gin</option>
                    <option value="Brandy">Brandy</option>
                    <option value="Tequila">Tequila</option>
                    <option value="Scotch">Scotch</option>
                    <option value="Other">Other</option>
                  </select>
                </div>



                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Volume (ML) *</label>
                  <Input
                    type="number"
                    required
                    value={formData.volumeML}
                    onChange={(e) => setFormData({ ...formData, volumeML: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Per Unit (₹) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formData.pricePerUnit}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">VAT%</label>
                  <Input
                    type="number"
                    required
                    disabled
                    value='35'
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">TCS%</label>
                  <Input
                    type="number"
                    required
                    disabled
                    value='1'
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock *</label>
                  <Input
                    type="number"
                    required
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Level</label>
                  <Input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bottles Per Caret</label>
                  <Input
                    type="number"
                    value={formData.bottlesPerCaret}
                    onChange={(e) => setFormData({ ...formData, bottlesPerCaret: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSubmitting ? 'Saving...' : (showCreateModal ? 'Create Product' : 'Update Product')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedProduct(null);
                    resetForm();
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
                  <Input
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
