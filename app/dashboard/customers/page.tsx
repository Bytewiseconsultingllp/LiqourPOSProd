"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Edit, Trash2, TrendingUp, Package, X } from "lucide-react";
import { Customer } from "@/types/customer";
import { Input } from "../components/ui/input";

export default function CustomerManagementPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    name: "",
    type: "Retail" as "Retail" | "Wholesale" | "Walk-In" | "B2B",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    maxDiscountPercentage: 0,
    walletBalance: 0,
    creditLimit: 0,
    outstandingBalance: 0,
    openingBalance: 0,
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
    fetchCustomers(accessToken);
  }, [router]);

  const fetchCustomers = async (token: string) => {
    try {
      const response = await fetch("/api/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch customers");
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^(\+91)?[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""));
  const validateGSTIN = (gstin?: string) => !gstin || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gstin);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.phone.trim()) errors.phone = "Phone is required";
    else if (!validatePhone(formData.phone)) errors.phone = "Invalid phone";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!validateEmail(formData.email)) errors.email = "Invalid email";
    if (formData.gstin && !validateGSTIN(formData.gstin)) errors.gstin = "Invalid GSTIN";
    if (formData.maxDiscountPercentage < 0 || formData.maxDiscountPercentage > 100) errors.maxDiscountPercentage = "Must be 0-100";
    if (formData.creditLimit < 0) errors.creditLimit = "Cannot be negative";
    if (formData.outstandingBalance > formData.creditLimit) errors.outstandingBalance = "Cannot exceed credit limit";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormErrors((prev) => { const copy = { ...prev }; delete copy[name]; return copy; });
    setFormData((prev) => ({ ...prev, [name]: ["maxDiscountPercentage", "creditLimit", "outstandingBalance"].includes(name) ? Number(value) : value }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    try {
      const method = editingId ? "PUT" : "POST";
      const endpoint = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const payload = {
        name: formData.name,
        type: formData.type,
        contactInfo: { phone: formData.phone, email: formData.email, address: formData.address, gstin: formData.gstin },
        maxDiscountPercentage: formData.maxDiscountPercentage,
        walletBalance: formData.walletBalance,
        creditLimit: formData.creditLimit,
        outstandingBalance: formData.outstandingBalance,
        openingBalance: formData.openingBalance,
        notes: formData.notes,
        isActive: formData.isActive,
      };

      const response = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save customer");
      setSuccess(editingId ? "Customer updated!" : "Customer created!");
      setTimeout(() => setSuccess(""), 3000);
      resetForm();
      setShowModal(false);
      await fetchCustomers(accessToken);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer._id);
    setFormData({
      name: customer.name,
      type: customer.type,
      phone: customer.contactInfo.phone || "",
      email: customer.contactInfo.email || "",
      address: customer.contactInfo.address || "",
      gstin: customer.contactInfo.gstin || "",
      maxDiscountPercentage: customer.maxDiscountPercentage || 0,
      walletBalance: customer.walletBalance || 0,
      creditLimit: customer.creditLimit || 0,
      outstandingBalance: customer.outstandingBalance || 0,
      openingBalance: customer.openingBalance || 0,
      notes: customer.notes || "",
      isActive: customer.isActive ?? true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/customers/${deletingCustomer._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error("Failed to delete customer");
      setSuccess("Customer deleted!");
      setTimeout(() => setSuccess(""), 3000);
      setShowDeleteModal(false);
      setDeletingCustomer(null);
      await fetchCustomers(accessToken);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "Retail", phone: "", email: "", address: "", gstin: "", maxDiscountPercentage: 0, walletBalance: 0, creditLimit: 0, outstandingBalance: 0, openingBalance: 0, notes: "", isActive: true });
    setFormErrors({});
    setEditingId(null);
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.contactInfo.phone || "").includes(searchQuery) || (c.contactInfo.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: customers.length,
    retail: customers.filter((c) => c.type === "Retail").length,
    wholesale: customers.filter((c) => c.type === "Wholesale").length,
    b2b: customers.filter((c) => c.type === "B2B").length,
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-xl">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <User className="h-10 w-10 text-purple-600" />Customer Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage customers efficiently</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all">Add Customer</button>
        </div>
      </div>

      {error && <div className="max-w-7xl mx-auto mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="max-w-7xl mx-auto mb-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg">{success}</div>}

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, icon: Package, color: "purple" },
          { label: "Retail", value: stats.retail, icon: User, color: "blue" },
          { label: "Wholesale", value: stats.wholesale, icon: TrendingUp, color: "green" },
          { label: "B2B", value: stats.b2b, icon: Package, color: "orange" },
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
              <Input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2"><X className="h-5 w-5 text-gray-400" /></button>}
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
              <option value="all">All Types</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="B2B">B2B</option>
              <option value="Walk-In">Walk-In</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-50 dark:bg-gray-700">
                <tr>
                  {["Name", "Type", "Phone", "Email", "Credit Limit", "Outstanding", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomers.length > 0 ? filteredCustomers.map((c) => (
                  <tr key={c._id} className="hover:bg-purple-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">{c.type}</span></td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{c.contactInfo.phone || "-"}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{c.contactInfo.email || "-"}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">₹{(c.creditLimit || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">₹{(c.outstandingBalance || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => { setDeletingCustomer(c); setShowDeleteModal(true); }} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No customers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{editingId ? "Edit" : "Add"} Customer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Name", name: "name", type: "text", required: true },
                  { label: "Phone", name: "phone", type: "tel", required: true },
                  { label: "Email", name: "email", type: "email", required: true },
                  { label: "Address", name: "address", type: "text" },
                  { label: "GSTIN", name: "gstin", type: "text" },
                  { label: "Max Discount %", name: "maxDiscountPercentage", type: "number", min: 0, max: 100 },
                  { label: "Credit Limit", name: "creditLimit", type: "number", min: 0 },
                  { label: "Outstanding", name: "outstandingBalance", type: "number", min: 0 },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <Input type={field.type} name={field.name} value={(formData as any)[field.name]} onChange={handleChange} min={field.min} max={field.max} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" />
                    {formErrors[field.name] && <p className="text-sm text-red-500 mt-1">{formErrors[field.name]}</p>}
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select name="type" value={formData.type} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
                    {["Retail", "Wholesale", "B2B", "Walk-In"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-xl transition-all">{editingId ? "Update" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Confirm Delete</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete this customer?</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeletingCustomer(null); }} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
