'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Search, Calendar, X, Tag } from 'lucide-react';
import { IExpense, IExpenseCategory } from '@/models/Expense';
import { Input } from '../components/ui/input';

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [categories, setCategories] = useState<IExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<IExpense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    categoryId: '',
    categoryName: '',
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash' as 'Cash' | 'Online' | 'Credit' | 'Cheque',
    transactionId: '',
    notes: '',
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }
    fetchCategories(accessToken);
    fetchExpenses(accessToken);
  }, [router, startDate, endDate, selectedCategory]);

  const fetchCategories = async (token: string) => {
    try {
      const response = await fetch('/api/expenses/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchExpenses = async (token: string) => {
    try {
      setLoading(true);
      let url = '/api/expenses?';
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (selectedCategory) url += `categoryId=${selectedCategory}&`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setSubmitting(true);
    setError('');

    try {
      const selectedCat = categories.find(c => c._id === formData.categoryId);
      if (!selectedCat) throw new Error('Please select a category');

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          categoryName: selectedCat.name,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create expense');

      await fetchExpenses(accessToken);
      resetForm();
      setShowCreateModal(false);
      alert('Expense created successfully!');
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setSubmitting(true);
    setError('');

    try {
      const selectedCat = categories.find(c => c._id === formData.categoryId);
      if (!selectedCat) throw new Error('Please select a category');

      const response = await fetch(`/api/expenses/${selectedExpense._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          categoryName: selectedCat.name,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update expense');

      await fetchExpenses(accessToken);
      setShowEditModal(false);
      setSelectedExpense(null);
      resetForm();
      alert('Expense updated successfully!');
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense');

      await fetchExpenses(accessToken);
      alert('Expense deleted successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryFormData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create category');

      await fetchCategories(accessToken);
      setCategoryFormData({ name: '', description: '' });
      setShowCategoryModal(false);
      alert('Category created successfully!');
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = (expense: IExpense) => {
    setSelectedExpense(expense);
    setFormData({
      categoryId: expense.categoryId.toString(),
      categoryName: expense.categoryName,
      amount: expense.amount.toString(),
      description: expense.description || '',
      expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
      paymentMode: expense.paymentMode,
      transactionId: expense.transactionId || '',
      notes: expense.notes || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      categoryId: '',
      categoryName: '',
      amount: '',
      description: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
      transactionId: '',
      notes: '',
    });
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses Management</h1>
          <p className="text-gray-600 mt-2">Track and manage business expenses</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Tag className="w-5 h-5" />
            New Category
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-sm">Total Expenses</p>
            <p className="text-3xl font-bold">₹{totalExpenses.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Number of Expenses</p>
            <p className="text-3xl font-bold">{filteredExpenses.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No expenses found</td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{expense.expenseNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {expense.categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{expense.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">₹{expense.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        expense.paymentMode === 'Cash' ? 'bg-green-100 text-green-800' :
                        expense.paymentMode === 'Online' ? 'bg-blue-100 text-blue-800' :
                        expense.paymentMode === 'Credit' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {expense.paymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => handleEditExpense(expense)} className="text-blue-600 hover:text-blue-900 mr-3">
                        <Edit className="w-4 h-4 inline mr-1" />Edit
                      </button>
                      <button onClick={() => handleDeleteExpense(expense._id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4 inline mr-1" />Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Expense Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{showCreateModal ? 'Add New Expense' : 'Edit Expense'}</h2>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={showCreateModal ? handleCreateExpense : handleUpdateExpense} className="p-6">
              {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" required>
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" min="0" step="0.01" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <Input type="date" value={formData.expenseDate} onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                  <select value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg" required>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Credit">Credit</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                  <Input type="text" value={formData.transactionId} onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" rows={2} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50" disabled={submitting}>Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400" disabled={submitting}>
                  {submitting ? (showCreateModal ? 'Creating...' : 'Updating...') : (showCreateModal ? 'Create Expense' : 'Update Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">New Category</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6">
              {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                  <Input type="text" value={categoryFormData.name} onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea value={categoryFormData.description} onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCategoryModal(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50" disabled={submitting}>Cancel</button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
