"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Edit, Trash2, TrendingUp, Package, X, Building2, Star } from "lucide-react";
import { Vendor } from "@/types/vendor";

export default function VendorManagementPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    paymentTerms: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    tin: "",
    cin: "",
    vendorPriority: 0,
    notes: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/login");
      return;
    }
    fetchVendors(accessToken);
  }, [router]);

  const fetchVendors = async (token: string) => {
    try {
      const response = await fetch("/api/vendors", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch vendors");
      const data = await response.json();
      setVendors(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^(\+91)?[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""));
  const validateGSTIN = (gstin?: string) => !gstin || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gstin);
  const validateIFSC = (ifsc: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Vendor name is required";
    if (!formData.phone.trim()) errors.phone = "Phone is required";
    else if (!validatePhone(formData.phone)) errors.phone = "Invalid phone number";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!validateEmail(formData.email)) errors.email = "Invalid email";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (formData.gstin && !validateGSTIN(formData.gstin)) errors.gstin = "Invalid GSTIN";
    if (!formData.accountName.trim()) errors.accountName = "Account name is required";
    if (!formData.accountNumber.trim()) errors.accountNumber = "Account number is required";
    if (!formData.bankName.trim()) errors.bankName = "Bank name is required";
    if (!formData.ifscCode.trim()) errors.ifscCode = "IFSC code is required";
    else if (!validateIFSC(formData.ifscCode)) errors.ifscCode = "Invalid IFSC code";
    if (!formData.tin.trim()) errors.tin = "TIN is required";
    if (!formData.cin.trim()) errors.cin = "CIN is required";
    if (formData.vendorPriority < 0) errors.vendorPriority = "Priority cannot be negative";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormErrors((prev) => { const copy = { ...prev }; delete copy[name]; return copy; });
    setFormData((prev) => ({ ...prev, [name]: name === "vendorPriority" ? Number(value) : value }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    try {
      const method = editingId ? "PUT" : "POST";
      const endpoint = editingId ? `/api/vendors/${editingId}` : "/api/vendors";
      const payload = {
        name: formData.name,
        contactInfo: { phone: formData.phone, email: formData.email, address: formData.address },
        gstin: formData.gstin,
        paymentTerms: formData.paymentTerms,
        bankDetails: {
          accountName: formData.accountName,
          accountNumber: formData.accountNumber,
          bankName: formData.bankName,
          ifscCode: formData.ifscCode,
        },
        tin: formData.tin,
        cin: formData.cin,
        vendorPriority: formData.vendorPriority,
        notes: formData.notes,
        isActive: formData.isActive,
      };

      const response = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save vendor");
      setSuccess(editingId ? "Vendor updated!" : "Vendor created!");
      setTimeout(() => setSuccess(""), 3000);
      resetForm();
      setShowModal(false);
      await fetchVendors(accessToken);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingId(vendor._id || null);
    setFormData({
      name: vendor.name,
      phone: vendor.contactInfo.phone,
      email: vendor.contactInfo.email,
      address: vendor.contactInfo.address,
      gstin: vendor.gstin || "",
      paymentTerms: vendor.paymentTerms || "",
      accountName: vendor.bankDetails.accountName,
      accountNumber: vendor.bankDetails.accountNumber,
      bankName: vendor.bankDetails.bankName,
      ifscCode: vendor.bankDetails.ifscCode,
      tin: vendor.tin,
      cin: vendor.cin,
      vendorPriority: vendor.vendorPriority,
      notes: vendor.notes || "",
      isActive: vendor.isActive ?? true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingVendor) return;
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/vendors/${deletingVendor._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to delete vendor");
      setSuccess("Vendor deleted!");
      setTimeout(() => setSuccess(""), 3000);
      setShowDeleteModal(false);
      setDeletingVendor(null);
      await fetchVendors(accessToken);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", address: "", gstin: "", paymentTerms: "", accountName: "", accountNumber: "", bankName: "", ifscCode: "", tin: "", cin: "", vendorPriority: 0, notes: "", isActive: true });
    setFormErrors({});
    setEditingId(null);
  };

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.contactInfo.phone.includes(searchQuery) || v.contactInfo.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = filterActive === "all" || (filterActive === "active" && v.isActive) || (filterActive === "inactive" && !v.isActive);
    return matchesSearch && matchesActive;
  });

  const stats = {
    total: vendors.length,
    active: vendors.filter((v) => v.isActive).length,
    inactive: vendors.filter((v) => !v.isActive).length,
    highPriority: vendors.filter((v) => v.vendorPriority >= 8).length,
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Truck className="h-10 w-10 text-blue-600" />Vendor Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage suppliers and vendors efficiently</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all">Add Vendor</button>
        </div>
      </div>

      {error && <div className="max-w-7xl mx-auto mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="max-w-7xl mx-auto mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg">{success}</div>}

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Vendors", value: stats.total, icon: Package, color: "blue" },
          { label: "Active", value: stats.active, icon: Building2, color: "green" },
          { label: "Inactive", value: stats.inactive, icon: Truck, color: "gray" },
          { label: "High Priority", value: stats.highPriority, icon: Star, color: "yellow" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input type="text" placeholder="Search by name, phone, or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2"><X className="h-5 w-5 text-gray-400" /></button>}
            </div>
            <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50 dark:bg-gray-700">
                <tr>
                  {["Name", "Contact", "Email", "GSTIN", "Priority", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredVendors.length > 0 ? filteredVendors.map((v) => (
                  <tr key={v._id} className="hover:bg-blue-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{v.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{v.contactInfo.phone}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{v.contactInfo.email}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{v.gstin || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className={`h-4 w-4 ${v.vendorPriority >= 8 ? "text-yellow-500 fill-yellow-500" : "text-gray-400"}`} />
                        <span className="text-gray-700 dark:text-gray-300">{v.vendorPriority}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${v.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(v)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => { setDeletingVendor(v); setShowDeleteModal(true); }} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No vendors found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{editingId ? "Edit" : "Add"} Vendor</h2>
              
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Name <span className="text-red-500">*</span></label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                      {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority (0-10)</label>
                      <input type="number" name="vendorPriority" min="0" max="10" value={formData.vendorPriority} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                      {formErrors.vendorPriority && <p className="text-sm text-red-500 mt-1">{formErrors.vendorPriority}</p>}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Phone", name: "phone", type: "tel", required: true },
                      { label: "Email", name: "email", type: "email", required: true },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                        <input type={field.type} name={field.name} value={(formData as any)[field.name]} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                        {formErrors[field.name] && <p className="text-sm text-red-500 mt-1">{formErrors[field.name]}</p>}
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address <span className="text-red-500">*</span></label>
                      <textarea name="address" rows={2} value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                      {formErrors.address && <p className="text-sm text-red-500 mt-1">{formErrors.address}</p>}
                    </div>
                  </div>
                </div>

                {/* Tax & Legal */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tax & Legal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "GSTIN", name: "gstin", required: false },
                      { label: "TIN", name: "tin", required: true },
                      { label: "CIN", name: "cin", required: true },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                        <input type="text" name={field.name} value={(formData as any)[field.name]} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                        {formErrors[field.name] && <p className="text-sm text-red-500 mt-1">{formErrors[field.name]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bank Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Account Name", name: "accountName" },
                      { label: "Account Number", name: "accountNumber" },
                      { label: "Bank Name", name: "bankName" },
                      { label: "IFSC Code", name: "ifscCode" },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label} <span className="text-red-500">*</span></label>
                        <input type="text" name={field.name} value={(formData as any)[field.name]} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                        {formErrors[field.name] && <p className="text-sm text-red-500 mt-1">{formErrors[field.name]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Additional Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                      <input type="text" name="paymentTerms" placeholder="e.g., Net 30 days" value={formData.paymentTerms} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                      <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-xl transition-all">{editingId ? "Update" : "Create"} Vendor</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Confirm Delete</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete this vendor? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeletingVendor(null); }} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
