'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../components/ui/input';
import { Building2, Upload, Trash2, Star, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstNumber?: string;
  licenseNumber?: string;
  fssaiNumber?: string;
  panNumber?: string;
  website?: string;
}

interface QRCode {
  _id: string;
  name: string;
  imageBase64: string;
  isDefault: boolean;
  createdAt: string;
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'qrcodes'>('details');
  
  // QR Code form state
  const [showQRForm, setShowQRForm] = useState(false);
  const [qrFormData, setQRFormData] = useState({
    name: '',
    imageBase64: '',
    isDefault: false,
  });
  const [editingQRId, setEditingQRId] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchData(accessToken);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      setLoading(true);
      
      // Fetch organization details
      const orgResponse = await fetch('/api/organization', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!orgResponse.ok) throw new Error('Failed to fetch organization');
      const orgData = await orgResponse.json();
      setOrganization(orgData.data);

      // Fetch QR codes
      const qrResponse = await fetch('/api/qrcodes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!qrResponse.ok) throw new Error('Failed to fetch QR codes');
      const qrData = await qrResponse.json();
      setQRCodes(qrData.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      setSaving(true);
      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: organization.name,
          phone: organization.phone,
          address: organization.address,
          city: organization.city,
          state: organization.state,
          pincode: organization.pincode,
          country: organization.country,
          gstNumber: organization.gstNumber,
          licenseNumber: organization.licenseNumber,
          fssaiNumber: organization.fssaiNumber,
          panNumber: organization.panNumber,
          website: organization.website,
        }),
      });

      if (!response.ok) throw new Error('Failed to update organization');
      
      toast.success('Organization details updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setQRFormData(prev => ({
        ...prev,
        imageBase64: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrFormData.name || !qrFormData.imageBase64) {
      toast.error('Please provide QR code name and image');
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      setSaving(true);
      
      if (editingQRId) {
        // Update existing QR code
        const response = await fetch(`/api/qrcodes/${editingQRId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(qrFormData),
        });

        if (!response.ok) throw new Error('Failed to update QR code');
        toast.success('QR code updated successfully!');
      } else {
        // Create new QR code
        const response = await fetch('/api/qrcodes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(qrFormData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create QR code');
        }
        toast.success('QR code created successfully!');
      }

      // Reset form and refresh data
      setQRFormData({ name: '', imageBase64: '', isDefault: false });
      setEditingQRId(null);
      setShowQRForm(false);
      fetchData(accessToken);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save QR code');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (qrId: string) => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/qrcodes/${qrId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!response.ok) throw new Error('Failed to set default QR code');
      
      toast.success('Default QR code updated!');
      fetchData(accessToken);
    } catch (error: any) {
      toast.error(error.message || 'Failed to set default QR code');
    }
  };

  const handleDeleteQR = async (qrId: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/qrcodes/${qrId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete QR code');
      }
      
      toast.success('QR code deleted successfully!');
      fetchData(accessToken);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete QR code');
    }
  };

  const handleEditQR = (qr: QRCode) => {
    setQRFormData({
      name: qr.name,
      imageBase64: qr.imageBase64,
      isDefault: qr.isDefault,
    });
    setEditingQRId(qr._id);
    setShowQRForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          Organization Settings
        </h1>
        <p className="text-gray-600 mt-2">Manage your organization details and QR codes</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Organization Details
            </button>
            <button
              onClick={() => setActiveTab('qrcodes')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'qrcodes'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              QR Codes
            </button>
          </div>
        </div>

        {/* Organization Details Tab */}
        {activeTab === 'details' && organization && (
          <form onSubmit={handleOrgUpdate} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Basic Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <Input
                  type="text"
                  required
                  value={organization.name}
                  onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  disabled
                  value={organization.email}
                  className="w-full bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={organization.phone || ''}
                  onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
                  className="w-full"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <Input
                  type="url"
                  value={organization.website || ''}
                  onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                  className="w-full"
                  placeholder="https://www.example.com"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Address</h3>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={organization.address || ''}
                  onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <Input
                  type="text"
                  value={organization.city || ''}
                  onChange={(e) => setOrganization({ ...organization, city: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <Input
                  type="text"
                  value={organization.state || ''}
                  onChange={(e) => setOrganization({ ...organization, state: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pincode
                </label>
                <Input
                  type="text"
                  value={organization.pincode || ''}
                  onChange={(e) => setOrganization({ ...organization, pincode: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <Input
                  type="text"
                  value={organization.country || 'India'}
                  onChange={(e) => setOrganization({ ...organization, country: e.target.value })}
                  className="w-full"
                />
              </div>

              {/* Business Details */}
              <div className="md:col-span-2 mt-4">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Business Details</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <Input
                  type="text"
                  value={organization.gstNumber || ''}
                  onChange={(e) => setOrganization({ ...organization, gstNumber: e.target.value.toUpperCase() })}
                  className="w-full"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <Input
                  type="text"
                  value={organization.panNumber || ''}
                  onChange={(e) => setOrganization({ ...organization, panNumber: e.target.value.toUpperCase() })}
                  className="w-full"
                  placeholder="AAAAA0000A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number
                </label>
                <Input
                  type="text"
                  value={organization.licenseNumber || ''}
                  onChange={(e) => setOrganization({ ...organization, licenseNumber: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FSSAI Number
                </label>
                <Input
                  type="text"
                  value={organization.fssaiNumber || ''}
                  onChange={(e) => setOrganization({ ...organization, fssaiNumber: e.target.value })}
                  className="w-full"
                  placeholder="12345678901234"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* QR Codes Tab */}
        {activeTab === 'qrcodes' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">QR Codes</h3>
              <button
                onClick={() => {
                  setQRFormData({ name: '', imageBase64: '', isDefault: false });
                  setEditingQRId(null);
                  setShowQRForm(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add QR Code
              </button>
            </div>

            {/* QR Form */}
            {showQRForm && (
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold">
                    {editingQRId ? 'Edit QR Code' : 'Add New QR Code'}
                  </h4>
                  <button
                    onClick={() => {
                      setShowQRForm(false);
                      setEditingQRId(null);
                      setQRFormData({ name: '', imageBase64: '', isDefault: false });
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleQRSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Name *
                    </label>
                    <Input
                      type="text"
                      required
                      value={qrFormData.name}
                      onChange={(e) => setQRFormData({ ...qrFormData, name: e.target.value })}
                      placeholder="e.g., UPI Payment, PhonePe, Google Pay"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Image *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {qrFormData.imageBase64 && (
                      <div className="mt-4">
                        <img
                          src={qrFormData.imageBase64}
                          alt="QR Code Preview"
                          className="w-48 h-48 object-contain border rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={qrFormData.isDefault}
                      onChange={(e) => setQRFormData({ ...qrFormData, isDefault: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="isDefault" className="text-sm text-gray-700">
                      Set as default QR code
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : editingQRId ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQRForm(false);
                        setEditingQRId(null);
                        setQRFormData({ name: '', imageBase64: '', isDefault: false });
                      }}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* QR Codes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrCodes.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No QR codes added yet. Click "Add QR Code" to create one.
                </div>
              ) : (
                qrCodes.map((qr) => (
                  <div
                    key={qr._id}
                    className={`bg-white border-2 rounded-lg p-4 ${
                      qr.isDefault ? 'border-yellow-400' : 'border-gray-200'
                    }`}
                  >
                    {qr.isDefault && (
                      <div className="flex items-center gap-1 text-yellow-600 text-sm font-semibold mb-2">
                        <Star className="w-4 h-4 fill-current" />
                        Default
                      </div>
                    )}
                    <img
                      src={qr.imageBase64}
                      alt={qr.name}
                      className="w-full h-48 object-contain mb-3 bg-gray-50 rounded"
                    />
                    <h4 className="font-semibold text-gray-900 mb-3">{qr.name}</h4>
                    <div className="flex gap-2">
                      {!qr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(qr._id)}
                          className="flex-1 flex items-center justify-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-2 rounded hover:bg-yellow-100 text-sm"
                        >
                          <Star className="w-4 h-4" />
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEditQR(qr)}
                        className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded hover:bg-blue-100 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQR(qr._id)}
                        className="bg-red-50 text-red-700 px-3 py-2 rounded hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
