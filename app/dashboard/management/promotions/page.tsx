'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Power, PowerOff, X } from 'lucide-react';
import { Promotion } from '@/types/promotion';
import { ProductDetails } from '@/types/product';
import { apiFetch } from '@/lib/api-client';
import { Input } from '../../components/ui/input';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/promotions');

      if (response.ok) {
        const data = await response.json();
        setPromotions(data.data);
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await apiFetch(`/api/promotions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchPromotions();
      }
    } catch (error) {
      console.error('Error toggling promotion status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/promotions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchPromotions();
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingPromotion(null);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPromotionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      percentage: 'Percentage Off',
      fixed: 'Fixed Amount',
      buy_x_get_y: 'Buy X Get Y',
    };
    return labels[type] || type;
  };

  const getApplicableOnLabel = (applicableOn: string) => {
    const labels: Record<string, string> = {
      all: 'All Products',
      category: 'Specific Categories',
      product: 'Specific Products',
      brand: 'Specific Brands',
    };
    return labels[applicableOn] || applicableOn;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions & Offers</h1>
          <p className="text-gray-600 mt-1">Manage your promotional campaigns</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add Promotion
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicable On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No promotions found. Create your first promotion to get started.
                  </td>
                </tr>
              ) : (
                promotions.map((promotion) => (
                  <tr key={promotion._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{promotion.name}</div>
                        {promotion.description && (
                          <div className="text-sm text-gray-500">{promotion.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getPromotionTypeLabel(promotion.type)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {promotion.type === 'percentage' && `${promotion.discountPercentage}%`}
                      {promotion.type === 'fixed' && `₹${promotion.discountAmount}`}
                      {promotion.type === 'buy_x_get_y' &&
                        `Buy ${promotion.buyQuantity} Get ${promotion.getQuantity}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{getApplicableOnLabel(promotion.applicableOn)}</div>
                        {promotion.applicableOn === 'category' && promotion.categoryIds && promotion.categoryIds.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {promotion.categoryIds.slice(0, 2).join(', ')}
                            {promotion.categoryIds.length > 2 && ` +${promotion.categoryIds.length - 2} more`}
                          </div>
                        )}
                        {promotion.applicableOn === 'brand' && promotion.brandNames && promotion.brandNames.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {promotion.brandNames.slice(0, 2).join(', ')}
                            {promotion.brandNames.length > 2 && ` +${promotion.brandNames.length - 2} more`}
                          </div>
                        )}
                        {promotion.applicableOn === 'product' && promotion.productIds && promotion.productIds.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {promotion.productIds.length} product{promotion.productIds.length > 1 ? 's' : ''} selected
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{formatDate(promotion.startDate)}</div>
                      <div className="text-gray-500">to {formatDate(promotion.endDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          promotion.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {promotion.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(promotion._id, promotion.isActive)}
                          className={`p-1 rounded hover:bg-gray-100 ${
                            promotion.isActive ? 'text-red-600' : 'text-green-600'
                          }`}
                          title={promotion.isActive ? 'Disable' : 'Enable'}
                        >
                          {promotion.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                        </button>
                        <button
                          onClick={() => handleEdit(promotion)}
                          className="p-1 text-blue-600 rounded hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(promotion._id)}
                          className="p-1 text-red-600 rounded hover:bg-gray-100"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PromotionModal
          promotion={editingPromotion}
          onClose={() => {
            setShowModal(false);
            setEditingPromotion(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingPromotion(null);
            fetchPromotions();
          }}
        />
      )}
    </div>
  );
}

// Promotion Modal Component
function PromotionModal({
  promotion,
  onClose,
  onSuccess,
}: {
  promotion: Promotion | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: promotion?.name || '',
    description: promotion?.description || '',
    type: promotion?.type || 'percentage',
    discountPercentage: promotion?.discountPercentage || 0,
    discountAmount: promotion?.discountAmount || 0,
    buyQuantity: promotion?.buyQuantity || 1,
    getQuantity: promotion?.getQuantity || 1,
    applicableOn: promotion?.applicableOn || 'all',
    categoryIds: promotion?.categoryIds || [],
    productIds: promotion?.productIds || [],
    brandNames: promotion?.brandNames || [],
    minPurchaseAmount: promotion?.minPurchaseAmount || 0,
    maxDiscountAmount: promotion?.maxDiscountAmount || 0,
    startDate: promotion?.startDate
      ? new Date(promotion.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    endDate: promotion?.endDate
      ? new Date(promotion.endDate).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: promotion?.isActive !== undefined ? promotion.isActive : true,
    priority: promotion?.priority || 0,
  });

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchProductsAndOptions();
  }, []);

  const fetchProductsAndOptions = async () => {
    try {
      setLoadingData(true);
      const response = await apiFetch('/api/products');

      if (response.ok) {
        const data = await response.json();
        const productsList = data.data || [];
        setProducts(productsList);

        // Extract unique categories and brands
        const uniqueCategories = Array.from(new Set(productsList.map((p: ProductDetails) => p.category)));
        const uniqueBrands = Array.from(new Set(productsList.map((p: ProductDetails) => p.brand)));
        
        setCategories(uniqueCategories.filter(Boolean) as string[]);
        setBrands(uniqueBrands.filter(Boolean) as string[]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const url = promotion ? `/api/promotions/${promotion._id}` : '/api/promotions';
      const method = promotion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save promotion');
      }
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {promotion ? 'Edit Promotion' : 'Create Promotion'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promotion Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promotion Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="percentage">Percentage Off</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value="buy_x_get_y">Buy X Get Y</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applicable On *
                </label>
                <select
                  value={formData.applicableOn}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      applicableOn: e.target.value as any,
                      categoryIds: [],
                      productIds: [],
                      brandNames: [],
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="all">All Products</option>
                  <option value="category">Specific Categories</option>
                  <option value="product">Specific Products</option>
                  <option value="brand">Specific Brands</option>
                </select>
              </div>
            </div>

            {/* Category Selection */}
            {formData.applicableOn === 'category' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Categories *
                </label>
                {loadingData ? (
                  <div className="text-sm text-gray-500">Loading categories...</div>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onChange={(e) => {
                        const category = e.target.value;
                        if (category && !formData.categoryIds.includes(category)) {
                          setFormData({
                            ...formData,
                            categoryIds: [...formData.categoryIds, category],
                          });
                        }
                        e.target.value = '';
                      }}
                      value=""
                    >
                      <option value="">Select a category...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat} disabled={formData.categoryIds.includes(cat)}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {formData.categoryIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.categoryIds.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  categoryIds: formData.categoryIds.filter((c) => c !== cat),
                                });
                              }}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Product Selection */}
            {formData.applicableOn === 'product' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Products *
                </label>
                {loadingData ? (
                  <div className="text-sm text-gray-500">Loading products...</div>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onChange={(e) => {
                        const productId = e.target.value;
                        if (productId && !formData.productIds.includes(productId)) {
                          setFormData({
                            ...formData,
                            productIds: [...formData.productIds, productId],
                          });
                        }
                        e.target.value = '';
                      }}
                      value=""
                    >
                      <option value="">Select a product...</option>
                      {products.map((product) => (
                        <option
                          key={product._id}
                          value={product._id}
                          disabled={formData.productIds.includes(product._id)}
                        >
                          {product.name} - {product.brand} ({product.volumeML}ml)
                        </option>
                      ))}
                    </select>
                    {formData.productIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.productIds.map((productId) => {
                          const product = products.find((p) => p._id === productId);
                          return product ? (
                            <span
                              key={productId}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {product.name} - {product.brand}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    productIds: formData.productIds.filter((id) => id !== productId),
                                  });
                                }}
                                className="hover:bg-blue-200 rounded-full p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Brand Selection */}
            {formData.applicableOn === 'brand' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Brands *
                </label>
                {loadingData ? (
                  <div className="text-sm text-gray-500">Loading brands...</div>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onChange={(e) => {
                        const brand = e.target.value;
                        if (brand && !formData.brandNames.includes(brand)) {
                          setFormData({
                            ...formData,
                            brandNames: [...formData.brandNames, brand],
                          });
                        }
                        e.target.value = '';
                      }}
                      value=""
                    >
                      <option value="">Select a brand...</option>
                      {brands.map((brand) => (
                        <option key={brand} value={brand} disabled={formData.brandNames.includes(brand)}>
                          {brand}
                        </option>
                      ))}
                    </select>
                    {formData.brandNames.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.brandNames.map((brand) => (
                          <span
                            key={brand}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {brand}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  brandNames: formData.brandNames.filter((b) => b !== brand),
                                });
                              }}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {formData.type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%) *
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discountPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, discountPercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            {formData.type === 'fixed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount (₹) *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.discountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, discountAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            {formData.type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buy Quantity *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.buyQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, buyQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Get Quantity Free *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.getQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, getQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Purchase Amount (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minPurchaseAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minPurchaseAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Discount Amount (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority applies first</p>
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : promotion ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
