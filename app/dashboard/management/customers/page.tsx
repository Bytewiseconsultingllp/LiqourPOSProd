'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/types/customer';
import { Plus, Edit2, Trash2, Search, Loader2, X } from 'lucide-react';
import { Input } from '../../components/ui/input';

export default function CustomerManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Retail' as 'Retail' | 'Wholesale' | 'Walk-In' | 'B2B',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    creditLimit: 0,
    openingBalance: 0,
    maxDiscountPercentage: 10,
    isActive: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast('Please login to continue', 'error');
      router.push('/login');
      return;
    }
    fetchCustomers();
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const organizationData = localStorage.getItem('organization');
      
      if (!token || !organizationData) {
        return;
      }

      const organization = JSON.parse(organizationData);
      const orgId = organization._id || organization.id;

      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      if (response.status === 401) {
        showToast('Session expired. Please login again', 'error');
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        type: customer.type || 'Retail',
        phone: customer.contactInfo?.phone || '',
        email: customer.contactInfo?.email || '',
        address: customer.contactInfo?.address || '',
        city: '',
        state: '',
        pincode: '',
        creditLimit: customer.creditLimit || 0,
        openingBalance: customer.openingBalance || 0,
        maxDiscountPercentage: customer.maxDiscountPercentage || 10,
        isActive: customer.isActive !== false,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        type: 'Retail',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        creditLimit: 0,
        openingBalance: 0,
        maxDiscountPercentage: 10,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      showToast('Name and Phone are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const organizationData = localStorage.getItem('organization');
      
      if (!token || !organizationData) {
        showToast('Please login again', 'error');
        router.push('/login');
        return;
      }

      const organization = JSON.parse(organizationData);
      const orgId = organization._id || organization.id;

      const url = editingCustomer 
        ? `/api/customers/${editingCustomer._id}`
        : '/api/customers';
      
      const method = editingCustomer ? 'PUT' : 'POST';

      console.log(`${method} ${url}`, {
        name: formData.name,
        maxDiscountPercentage: formData.maxDiscountPercentage,
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': orgId,
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          contactInfo: {
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
          },
          creditLimit: formData.creditLimit,
          openingBalance: formData.openingBalance,
          outstandingBalance:formData.openingBalance,
          maxDiscountPercentage: formData.maxDiscountPercentage,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save customer');
      }

      showToast(
        editingCustomer ? 'Customer updated successfully!' : 'Customer created successfully!',
        'success'
      );
      
      handleCloseModal();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      showToast(error.message || 'Failed to save customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const organizationData = localStorage.getItem('organization');
      
      if (!token || !organizationData) {
        showToast('Please login again', 'error');
        router.push('/login');
        return;
      }

      const organization = JSON.parse(organizationData);
      const orgId = organization._id || organization.id;

      const response = await fetch(`/api/customers/${customer._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': orgId,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      showToast('Customer deleted successfully!', 'success');
      fetchCustomers();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactInfo?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contactInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pt-20">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Management</h1>
          <button
            onClick={() => router.push('/dashboard/management')}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase">Contact</th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase">Credit Limit</th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase">opening Balance</th>
                  <th className="px-6 py-4 text-right text-xs font-medium uppercase">Balance due</th>
                  <th className="px-6 py-4 text-center text-xs font-medium uppercase">Max Disc%</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase">created on</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading && customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'No customers found' : 'No customers yet'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="font-medium">{customer.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          customer.type === 'B2B' ? 'bg-purple-100 text-purple-800' :
                          customer.type === 'Wholesale' ? 'bg-yellow-100 text-yellow-800' :
                          customer.type === 'Walk-In' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.type || 'RETAIL'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{customer.contactInfo.phone || '-'}</div>
                        <div className="text-xs text-gray-500">{customer.contactInfo.email || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        ₹{customer.creditLimit?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        ₹{customer.openingBalance?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        ₹{customer.outstandingBalance?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          {customer.maxDiscountPercentage || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        {customer.createdAt?.split('T')[0] || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          customer.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(customer)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-3xl font-bold mt-2">{customers.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {customers.filter(c => c.isActive !== false).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">B2B</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {customers.filter(c => c.type === 'B2B').length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">Total Credit</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              ₹{customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Walk-In">Walk-In</option>
                    <option value="B2B">B2B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone *</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <Input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Credit Limit (₹)</label>
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Opening Balance (₹)</label>
                  <Input
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Discount (%)</label>
                  <Input
                    type="number"
                    value={formData.maxDiscountPercentage}
                    onChange={(e) => setFormData({ ...formData, maxDiscountPercentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700"
                    placeholder="0-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum discount percentage allowed for this customer (0-100%)</p>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingCustomer ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
