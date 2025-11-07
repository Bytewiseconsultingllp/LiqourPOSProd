'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Vendor } from '@/types/vendor';
import { Plus, Edit2, Trash2, Search, Loader2, X } from 'lucide-react';
import { Input } from '../../components/ui/input';

export default function VendorManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [vendorStockMap, setVendorStockMap] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    tin: '',
    cin: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    priority: 1,
    isActive: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast('Please login to continue', 'error');
      router.push('/login');
      return;
    }
    fetchVendors();
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const orgId = localStorage.getItem('organization')
        ? JSON.parse(localStorage.getItem('organization')!).id
        : 'default';

      const response = await apiFetch('/api/vendors');

      if (response.status === 401) {
        showToast('Session expired. Please login again', 'error');
        localStorage.removeItem('accessToken');
        router.push('/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        const list: Vendor[] = data.data || [];
        setVendors(list);
        // Fetch has-stock for each vendor in parallel
        const stockPairs = await Promise.all(
          list.map(async (v) => {
            if (!v._id) return [undefined, false] as const;
            try {
              const r = await apiFetch(`/api/vendors/${v._id}/has-stock`);
              if (!r.ok) return [v._id, false] as const;
              const j = await r.json();
              return [v._id, !!j?.data?.hasStock] as const;
            } catch {
              return [v._id, false] as const;
            }
          })
        );
        const map: Record<string, boolean> = {};
        stockPairs.forEach(([id, has]) => {
          if (id) map[id] = has;
        });
        setVendorStockMap(map);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to fetch vendors', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getNextPriority = () => {
    if (vendors.length === 0) return 1;
    const priorities = vendors.map(v => v.vendorPriority || 0);
    return Math.max(...priorities) + 1;
  };

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        name: vendor.name,
        tin: vendor.tin,
        cin: vendor.cin || '',
        contactPerson: vendor.contactPerson || '',
        email: vendor.email || vendor.contactInfo?.email || '',
        phone: vendor.phone || vendor.contactInfo?.phone || '',
        address: vendor.address || vendor.contactInfo?.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pincode: vendor.pincode || '',
        gstin: vendor.gstin || '',
        accountName: vendor.bankDetails?.accountName || '',
        bankName: vendor.bankDetails?.bankName || '',
        accountNumber: vendor.bankDetails?.accountNumber || '',
        ifscCode: vendor.bankDetails?.ifscCode || '',
        priority: vendor.vendorPriority || getNextPriority() ,
        isActive: vendor.isActive !== false,
      });
    } else {
      setEditingVendor(null);
      setFormData({
        name: '',
        tin: '',
        cin: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        accountName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        priority: getNextPriority(),
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVendor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.tin || !formData.cin) {
      showToast('Name, TIN, and CIN are required', 'error');
      return;
    }

    if (!formData.email || !formData.phone || !formData.address) {
      showToast('Email, Phone, and Address are required', 'error');
      return;
    }

    if (!formData.accountName || !formData.bankName || !formData.accountNumber || !formData.ifscCode) {
      showToast('All bank details are required', 'error');
      return;
    }

    // Check for duplicate priority
    const duplicatePriority = vendors.find(
      v => v.vendorPriority === formData.priority && v._id !== editingVendor?._id
    );
    if (duplicatePriority) {
      showToast(`Priority ${formData.priority} is already assigned to ${duplicatePriority.name}`, 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const orgId = localStorage.getItem('organization')
        ? JSON.parse(localStorage.getItem('organization')!).id
        : 'default';

      const url = editingVendor
        ? `/api/vendors/${editingVendor._id}`
        : '/api/vendors';

      const method = editingVendor ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          tin: formData.tin,
          cin: formData.cin,
          contactInfo: {
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
          },
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          gstin: formData.gstin,
          bankDetails: {
            accountName: formData.accountName,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
          },
          vendorPriority: formData.priority,
          priority: formData.priority,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save vendor');
      }

      showToast(
        editingVendor ? 'Vendor updated successfully!' : 'Vendor created successfully!',
        'success'
      );

      handleCloseModal();
      fetchVendors();
    } catch (error: any) {
      showToast(error.message || 'Failed to save vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to delete ${vendor.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const orgId = localStorage.getItem('organization')
        ? JSON.parse(localStorage.getItem('organization')!).id
        : 'default';

      const response = await apiFetch(`/api/vendors/${vendor._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete vendor');
      }

      showToast('Vendor deleted successfully!', 'success');
      fetchVendors();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors
    .filter(vendor =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.tin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.vendorPriority || 999) - (b.vendorPriority || 999));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
          {toast.message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <button
              onClick={() => router.push('/dashboard/management')}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-lg font-medium">Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Management</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add New Vendor
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Vendor Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">TIN</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading && vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'No vendors found' : 'No vendors yet'}
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                          {vendor.vendorPriority || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{vendor.name}</div>
                        {vendor.gstin && <div className="text-xs text-gray-500">GSTIN: {vendor.gstin}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{vendor.tin}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{vendor.name || '-'}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{vendor.contactInfo?.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{vendor.contactInfo?.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${vendor.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {vendor.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(vendor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vendor)}
                            className={`p-2 rounded-lg ${vendorStockMap[vendor._id!] ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                            title={vendorStockMap[vendor._id!] ? 'Cannot delete: vendor has stock' : 'Delete'}
                            disabled={!!vendorStockMap[vendor._id!]}
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

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Vendors</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{vendors.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{vendors.filter(v => v.isActive !== false).length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{vendors.filter(v => v.isActive === false).length}</div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Vendor Name *</label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter vendor name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">TIN *</label>
                    <Input
                      type="text"
                      value={formData.tin}
                      onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter TIN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CIN *</label>
                    <Input
                      type="text"
                      value={formData.cin}
                      onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                      required
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter CIN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Priority * (1 is highest)</label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      min="1"
                      required
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">Next available: {getNextPriority()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">GSTIN</label>
                    <Input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter GSTIN"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Person</label>
                    <Input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter contact person name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Address *</label>
                    <Input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter full address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State</label>
                    <Input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pincode</label>
                    <Input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Account Name *</label>
                    <Input
                      type="text"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter account holder name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bank Name *</label>
                    <Input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Account Number *</label>
                    <Input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      required
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">IFSC Code *</label>
                    <Input
                      type="text"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      required
                      className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter IFSC code"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <Input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Processing...</> : (editingVendor ? 'Update Vendor' : 'Create Vendor')}
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
