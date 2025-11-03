'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Search, Calendar, X } from 'lucide-react';
import { IBill } from '@/models/Bill';

export default function SalesManagementPage() {
  const router = useRouter();
  const [bills, setBills] = useState<IBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBill, setSelectedBill] = useState<IBill | null>(null);
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
    fetchBills(accessToken);
  }, [router, startDate, endDate]);

  const fetchBills = async (token: string) => {
    try {
      setLoading(true);
      let url = '/api/bills?';
      
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;

      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch bills');

      const data = await response.json();
      setBills(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = (bill: IBill) => {
    setSelectedBill(bill);
    setShowViewModal(true);
  };

  const handleEditBill = (bill: IBill) => {
    setSelectedBill(bill);
    setEditFormData({
      items: bill.items.map(item => ({
        productId: item.productId,
        vendorId: item.vendorId,
        productName: item.productName,
        brand: item.brand,
        category: item.category,
        quantity: item.quantity,
        rate: item.rate,
        discountAmount: item.discountAmount || 0,
      })),
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || '',
      customerType: bill.customerType,
      customerId: bill.customerId,
      payment: bill.payment,
      subBills: bill.subBills || [],
    });
    setShowEditModal(true);
  };

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/bills/${selectedBill._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update bill');

      await fetchBills(accessToken);
      setShowEditModal(false);
      setSelectedBill(null);
      alert('Bill updated successfully!');
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

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.totalBillId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.customerPhone && bill.customerPhone.includes(searchTerm));
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
        <p className="text-gray-600 mt-2">View and edit sales bills</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Bill ID, Customer..."
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

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bill ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
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
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No bills found
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bill.totalBillId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{bill.customerName}</div>
                      {bill.customerPhone && (
                        <div className="text-sm text-gray-500">{bill.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(bill.saleDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bill.items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{bill.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        bill.payment.mode === 'Cash' ? 'bg-green-100 text-green-800' :
                        bill.payment.mode === 'Online' ? 'bg-blue-100 text-blue-800' :
                        bill.payment.mode === 'Credit' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {bill.payment.mode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewBill(bill)}
                        className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleEditBill(bill)}
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

      {/* View Bill Modal */}
      {showViewModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Bill Details</h2>
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
                  <p className="text-sm text-gray-600">Bill ID</p>
                  <p className="font-semibold">{selectedBill.totalBillId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">{new Date(selectedBill.saleDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">{selectedBill.customerName}</p>
                  {selectedBill.customerPhone && (
                    <p className="text-sm text-gray-500">{selectedBill.customerPhone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Mode</p>
                  <p className="font-semibold">{selectedBill.payment.mode}</p>
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
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Discount</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedBill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{item.productName}</td>
                        <td className="px-4 py-2 text-sm">{item.brand}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">₹{item.rate.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right">₹{(item.discountAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">₹{item.finalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">₹{selectedBill.subTotalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold text-red-600">-₹{selectedBill.totalDiscountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{selectedBill.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {showEditModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Edit Bill - {selectedBill.totalBillId}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateBill} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    value={editFormData.customerPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
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
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Discount</th>
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
                            value={item.rate}
                            onChange={(e) => updateItemField(idx, 'rate', parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 border rounded text-right"
                            min="0"
                            step="0.01"
                            required
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.discountAmount}
                            onChange={(e) => updateItemField(idx, 'discountAmount', parseFloat(e.target.value))}
                            className="w-24 px-2 py-1 border rounded text-right"
                            min="0"
                            step="0.01"
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
                  {submitting ? 'Updating...' : 'Update Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
