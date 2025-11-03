'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Search, Calendar, X } from 'lucide-react';
import { IPurchase } from '@/models/Purchase';

export default function PurchaseManagementPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<IPurchase | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchPurchases(accessToken);
  }, [router, startDate, endDate]);

  const fetchPurchases = async (token: string) => {
    try {
      setLoading(true);
      let url = '/api/purchases?';
      
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;

      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch purchases');

      const data = await response.json();
      setPurchases(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPurchase = (purchase: IPurchase) => {
    setSelectedPurchase(purchase);
    setShowViewModal(true);
  };

  const handleEditPurchase = (purchase: IPurchase) => {
    setSelectedPurchase(purchase);
    setEditFormData({
      items: purchase.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        brand: item.brand,
        volumeML: item.volumeML,
        quantity: item.quantity,
        purchasePricePerUnit: item.purchasePricePerUnit,
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      })),
      taxAmount: purchase.taxAmount,
      paidAmount: purchase.paidAmount,
      notes: purchase.notes || '',
      invoiceNumber: purchase.invoiceNumber || '',
    });
    setShowEditModal(true);
  };

  const handleUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/purchases/${selectedPurchase._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update purchase');

      await fetchPurchases(accessToken);
      setShowEditModal(false);
      setSelectedPurchase(null);
      alert('Purchase updated successfully!');
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...editFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditFormData({ ...editFormData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = editFormData.items.filter((_: any, i: number) => i !== index);
    setEditFormData({ ...editFormData, items: newItems });
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = 
      purchase.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (purchase.invoiceNumber && purchase.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
        <p className="text-gray-600 mt-2">View and edit purchase orders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Purchase #, Vendor, Invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Start Date"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No purchases found
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.purchaseNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{purchase.vendorName}</div>
                      {purchase.invoiceNumber && (
                        <div className="text-sm text-gray-500">Invoice: {purchase.invoiceNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {purchase.items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{purchase.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        purchase.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {purchase.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewPurchase(purchase)}
                        className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleEditPurchase(purchase)}
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Purchase Modal */}
      {showViewModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Purchase Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Purchase #</p>
                  <p className="font-semibold">{selectedPurchase.purchaseNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">{new Date(selectedPurchase.purchaseDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendor</p>
                  <p className="font-semibold">{selectedPurchase.vendorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className="font-semibold">{selectedPurchase.paymentStatus.toUpperCase()}</p>
                </div>
                {selectedPurchase.invoiceNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Invoice Number</p>
                    <p className="font-semibold">{selectedPurchase.invoiceNumber}</p>
                  </div>
                )}
                {selectedPurchase.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="font-semibold">{selectedPurchase.notes}</p>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold mb-3">Items</h3>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Brand</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Volume</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price/Unit</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPurchase.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{item.productName}</td>
                        <td className="px-4 py-2 text-sm">{item.brand}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.volumeML}ml</td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">₹{item.purchasePricePerUnit.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">₹{item.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">₹{selectedPurchase.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-semibold">₹{selectedPurchase.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 mb-2">
                  <span>Total:</span>
                  <span>₹{selectedPurchase.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-semibold text-green-600">₹{selectedPurchase.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due:</span>
                  <span className="font-semibold text-red-600">₹{selectedPurchase.dueAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {showEditModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Edit Purchase - {selectedPurchase.purchaseNumber}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdatePurchase} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.invoiceNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Amount
                  </label>
                  <input
                    type="number"
                    value={editFormData.taxAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, taxAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid Amount
                  </label>
                  <input
                    type="number"
                    value={editFormData.paidAmount}
                    onChange={(e) => setEditFormData({ ...editFormData, paidAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-3">Items</h3>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Brand</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price/Unit</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Batch</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editFormData.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{item.productName}</td>
                        <td className="px-4 py-2 text-sm">{item.brand}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemField(idx, 'quantity', parseInt(e.target.value))}
                            className="w-20 px-2 py-1 border rounded text-right"
                            min="1"
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.purchasePricePerUnit}
                            onChange={(e) => updateItemField(idx, 'purchasePricePerUnit', parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 border rounded text-right"
                            min="0"
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) => updateItemField(idx, 'batchNumber', e.target.value)}
                            className="w-24 px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
