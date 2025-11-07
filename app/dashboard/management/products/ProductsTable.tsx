'use client';

import UniversalBarcodeScanner from '@/components/UniversalBarcodeScanner';
import { ProductDetails } from '@/types/product';
import { AlertCircle, Barcode as BarcodeIcon, Edit, Eye, Image as ImageIcon, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '../../components/ui/input';

interface ProductsTableProps {
  products: ProductDetails[];
  onEdit: (product: ProductDetails) => void;
  onDelete: (productId: string) => void;
  onRefresh: () => void;
}

export default function ProductsTable({ products, onEdit, onDelete, onRefresh }: ProductsTableProps) {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodeManager, setShowBarcodeManager] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewBarcode, setViewBarcode] = useState<string | null>(null);


  const handleImageUpload = (product: ProductDetails) => {
    setSelectedProduct(product);
    setShowImageUpload(true);
  };

  const handleBarcodeUpdate = (product: ProductDetails) => {
    setSelectedProduct(product);
    setShowBarcodeScanner(true);
  };

  const handleBarcodeManage = (product: ProductDetails) => {
    setSelectedProduct(product);
    setShowBarcodeManager(true);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    if (!selectedProduct) return;

    try {
      const accessToken = localStorage.getItem('accessToken');
      const organization = localStorage.getItem('organization');
      const tenantId = organization ? JSON.parse(organization).id : 'default';

      const response = await fetch(`/api/products/${selectedProduct._id}/barcodes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ code: barcode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add barcode');
      }

      setShowBarcodeScanner(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteBarcode = async (barcodeCode: string) => {
    if (!selectedProduct) return;
    if (!confirm('Are you sure you want to delete this barcode?')) return;

    try {
      const accessToken = localStorage.getItem('accessToken');
      const organization = localStorage.getItem('organization');
      const tenantId = organization ? JSON.parse(organization).id : 'default';

      const response = await fetch(
        `/api/products/${selectedProduct._id}/barcodes?code=${encodeURIComponent(barcodeCode)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete barcode');
      }

      setShowBarcodeManager(false)
      onRefresh();

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadImage(e.target.files[0]);
    }
  };

  const uploadImage = async (file: File) => {
    if (!selectedProduct) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const accessToken = localStorage.getItem('accessToken');
      const organization = localStorage.getItem('organization');
      const tenantId = organization ? JSON.parse(organization).id : 'default';

      const response = await fetch(`/api/products/${selectedProduct._id}/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      setShowImageUpload(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Volume (ML)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bottles/Caret
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Barcodes
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative w-16 h-16">
                    {(product as any).imageBase64 && (product as any).imageMimeType ? (
                      <img
                        src={`data:${(product as any).imageMimeType};base64,${(product as any).imageBase64}`}
                        alt={product.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : product.imageUrl ? (
                      <img
                        src={`data:${(product as any).imageMimeType};base64,${(product as any).imageUrl}`}
                        alt={product.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={() => handleImageUpload(product)}
                      className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-full hover:bg-blue-600"
                      title="Upload Image"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  {product.description && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {product.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.sku || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.brand}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {product.volumeML} ml
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  ₹{product.pricePerUnit.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className={`font-medium ${product.currentStock < (product.reorderLevel || 0) ? 'text-red-600' : 'text-green-600'}`}>
                    {product.currentStock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {product.bottlesPerCaret || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleBarcodeUpdate(product)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Add Barcode"
                    >
                      <BarcodeIcon className="w-5 h-5" />
                    </button>
                    {(product.barcodes && product.barcodes.length > 0) && (
                      <>
                        <button
                          onClick={() => handleBarcodeManage(product)}
                          className="text-green-600 hover:text-green-900"
                          title="View/Delete Barcodes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          {product.barcodes.length}
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDelete(product._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Image Upload Dialog */}
      {showImageUpload && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Product Image</h3>
              <button
                onClick={() => setShowImageUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Product: <span className="font-medium">{selectedProduct.name}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop an image here, or
              </p>
              <label className="inline-block">
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                  Browse Files
                </span>
                <Input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileInput}
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                JPEG, PNG, WebP (Max 5MB)
              </p>
            </div>

            {uploading && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600 mt-2">Uploading...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal Barcode Scanner */}
      {showBarcodeScanner && selectedProduct && (
        <UniversalBarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
          title={`Scan Barcode for ${selectedProduct.name}`}
          description="Use any type of barcode scanner - USB, Bluetooth, Camera, or enter manually"
          autoConfirm={false}
          allowManualEntry={true}
          scannerType="auto"
        />
      )}

      {/* Barcode Manager Dialog */}
      {showBarcodeManager && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Barcodes</h3>
              <button
                onClick={() => setShowBarcodeManager(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Product: <span className="font-medium">{selectedProduct.name}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto">
              {selectedProduct.barcodes && selectedProduct.barcodes.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Barcode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Added On
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedProduct.barcodes.map((barcode, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                          {barcode.code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(barcode.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-3">
                          <button
                            onClick={() => setViewBarcode(barcode.code)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Barcode"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBarcode(barcode.code)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Barcode"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarcodeIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No barcodes added yet</p>
                </div>
              )}
            </div>


          </div>
        </div>
      )}
      {/* Barcode Image Preview Modal */}
      {viewBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              Barcode Preview
            </h3>

            <img
              src={`https://barcodeapi.org/api/128/${encodeURIComponent(viewBarcode)}`}
              alt="Barcode"
              className="mx-auto max-h-40 border border-gray-300 rounded-lg object-contain p-2"
            />
            <p className="mt-3 text-sm text-gray-600 font-mono">{viewBarcode}</p>

            <div className="mt-4">
              <button
                onClick={() => setViewBarcode(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
