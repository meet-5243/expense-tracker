import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import PDFReportModal from '../components/PDFReportModal';
import { 
  Search as SearchIcon, Filter, Calendar, ChevronLeft, 
  ChevronRight, Edit, Trash2, Download, Eye,
  Utensils, Car, ShoppingBag, FileText, Film, HelpCircle
} from 'lucide-react';

const CATEGORY_MAP = {
  food: { icon: Utensils, bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  travel: { icon: Car, bg: 'bg-blue-500/10', text: 'text-blue-400' },
  shopping: { icon: ShoppingBag, bg: 'bg-violet-500/10', text: 'text-violet-400' },
  bills: { icon: FileText, bg: 'bg-amber-500/10', text: 'text-amber-400' },
  entertainment: { icon: Film, bg: 'bg-pink-500/10', text: 'text-pink-400' },
  other: { icon: HelpCircle, bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

const History = () => {
  const { showToast } = useToast();

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [datePreset, setDatePreset] = useState('all'); // all, today, yesterday, 7days, 30days, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination states
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Helper date formatter
  const formatDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Main loader for paginated expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/expenses?page=${page}&limit=10`;

      if (search.trim()) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (category !== 'all') {
        url += `&category=${category}`;
      }

      // Add date filters
      const today = new Date();
      const todayStr = formatDateString(today);

      if (datePreset === 'today') {
        url += `&startDate=${todayStr}&endDate=${todayStr}`;
      } else if (datePreset === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = formatDateString(yesterday);
        url += `&startDate=${yestStr}&endDate=${yestStr}`;
      } else if (datePreset === '7days') {
        const sevDaysAgo = new Date();
        sevDaysAgo.setDate(sevDaysAgo.getDate() - 7);
        url += `&startDate=${formatDateString(sevDaysAgo)}&endDate=${todayStr}`;
      } else if (datePreset === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        url += `&startDate=${formatDateString(thirtyDaysAgo)}&endDate=${todayStr}`;
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          url += `&startDate=${customStartDate}`;
        }
        if (customEndDate) {
          url += `&endDate=${customEndDate}`;
        }
      }

      const res = await api.get(url);
      setExpenses(res.data?.expenses || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotalCount(res.data?.totalCount || 0);
    } catch (err) {
      console.error(err);
      showToast('Error loading transaction history', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, datePreset, customStartDate, customEndDate, showToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Handle filter changes (Reset page to 1)
  const handleFilterReset = () => {
    setSearch('');
    setCategory('all');
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [search, category, datePreset, customStartDate, customEndDate]);

  // Edit Expense callback
  const handleEditExpense = async (formData) => {
    if (!selectedExpense) return;
    setSubmitLoading(true);
    try {
      await api.put(`/expenses/${selectedExpense._id}`, formData);
      setIsEditOpen(false);
      setSelectedExpense(null);
      showToast('Expense updated successfully!', 'success');
      fetchExpenses();
    } catch (err) {
      console.error(err);
      showToast('Failed to update expense', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Expense callback
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    setSubmitLoading(true);
    try {
      await api.delete(`/expenses/${selectedExpense._id}`);
      setIsDeleteOpen(false);
      setSelectedExpense(null);
      showToast('Expense deleted successfully', 'success');
      fetchExpenses();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete expense', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatRupee = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="space-y-6 animate-[scaleUp_0.25s_ease-out]">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Transaction History</h1>
          <p className="text-sm text-dark-muted mt-1">Review and manage your complete historical ledger.</p>
        </div>
        <button
          onClick={() => setIsPDFOpen(true)}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-dark-card border border-dark-border text-accent-teal font-semibold text-sm hover:bg-dark-border transition-all duration-200 cursor-pointer shadow-lg hover:scale-[1.01]"
        >
          <Download className="h-4.5 w-4.5" />
          <span>Export PDF Report</span>
        </button>
      </div>

      {/* Filter Options Panel */}
      <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-dark-border/30 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Filter className="h-4 w-4 text-accent-teal" />
            <span>Search & Filter Parameters</span>
          </h3>
          <button 
            onClick={handleFilterReset}
            className="text-xs font-bold text-accent-teal hover:underline"
          >
            Clear Filters
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
              Search Description
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200 text-sm"
                placeholder="Search description..."
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-dark-muted" />
              </div>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full px-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text appearance-none focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="food">Food & Dining</option>
              <option value="travel">Travel & Transport</option>
              <option value="shopping">Shopping</option>
              <option value="bills">Bills & Utilities</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other / General</option>
            </select>
          </div>

          {/* Date Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
              Date Preset Range
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="block w-full px-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text appearance-none focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today Only</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Custom Date Ranges inputs */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-dark-border/30 animate-[scaleUp_0.15s_ease-out]">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="block w-full pl-4 pr-10 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200 text-xs"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-dark-muted" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="block w-full pl-4 pr-10 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200 text-xs"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-dark-muted" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main ledger Table */}
      <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Expenses ({totalCount} items)</h2>
        </div>

        {loading ? (
          /* Skeletons */
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center justify-between py-3.5 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-dark-input rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-dark-input rounded"></div>
                    <div className="h-3 w-24 bg-dark-input rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-20 bg-dark-input rounded"></div>
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-dark-input rounded-full mb-4">
              <Eye className="h-8 w-8 text-dark-muted" />
            </div>
            <h4 className="text-base font-bold text-white">No expenses matched filters</h4>
            <p className="text-sm text-dark-muted mt-1 max-w-xs">Try tweaking your search keywords or range options.</p>
          </div>
        ) : (
          /* Table ledger */
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/40 text-xs text-dark-muted uppercase font-semibold">
                    <th className="pb-3 pl-2">Details</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Date/Time</th>
                    <th className="pb-3 text-right pr-2">Amount</th>
                    <th className="pb-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/30">
                  {expenses.map((expense) => {
                    const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP.other;
                    const IconComponent = cat.icon;
                    const expenseDate = new Date(expense.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'UTC',
                    });

                    return (
                      <tr key={expense._id} className="hover:bg-dark-input/20 transition-colors duration-150">
                        {/* Name & Place */}
                        <td className="py-4 pl-2">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-xl ${cat.bg} ${cat.text}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-white block">{expense.name}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider ${cat.bg} ${cat.text}`}>
                            {expense.category}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-4 text-sm text-dark-muted">
                          <span>{expenseDate}</span>
                          <span className="block text-xs mt-0.5 text-dark-muted/70">{expense.time}</span>
                        </td>

                        {/* Amount */}
                        <td className="py-4 text-right pr-2 font-bold text-sm text-white">
                          {formatRupee(expense.amount)}
                        </td>

                        {/* Actions */}
                        <td className="py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedExpense(expense);
                                setIsEditOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-dark-border bg-dark-input text-dark-muted hover:text-accent-teal hover:border-accent-teal/20 transition-all duration-150"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedExpense(expense);
                                setIsDeleteOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-dark-border bg-dark-input text-dark-muted hover:text-accent-rose hover:border-accent-rose/25 transition-all duration-150"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-dark-border/40 pt-4 text-sm text-dark-muted">
                <span>
                  Showing page <b>{page}</b> of <b>{totalPages}</b>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="p-2 border border-dark-border bg-dark-input rounded-xl hover:text-white hover:bg-dark-border disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-2 border border-dark-border bg-dark-input rounded-xl hover:text-white hover:bg-dark-border disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Expense Modal */}
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedExpense(null); }} title="Modify Expense Record">
        <ExpenseForm 
          onSubmit={handleEditExpense} 
          initialData={selectedExpense} 
          loading={submitLoading} 
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => { setIsDeleteOpen(false); setSelectedExpense(null); }} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-sm text-dark-muted leading-relaxed">
            Are you sure you want to permanently delete this expense? This action is irreversible.
          </p>
          {selectedExpense && (
            <div className="p-4 bg-dark-input rounded-2xl border border-dark-border/60">
              <span className="font-bold text-sm text-white block">{selectedExpense.name}</span>
              <span className="text-sm font-extrabold text-accent-rose block mt-2">{formatRupee(selectedExpense.amount)}</span>
            </div>
          )}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={() => { setIsDeleteOpen(false); setSelectedExpense(null); }}
              className="flex-1 py-3 px-4 rounded-2xl text-sm font-semibold border border-dark-border bg-dark-input hover:bg-dark-border text-dark-text transition-all duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteExpense}
              disabled={submitLoading}
              className="flex-grow py-3 px-4 rounded-2xl text-sm font-semibold text-white bg-accent-rose hover:bg-opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {submitLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                'Delete Record'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* PDF Export Modal */}
      <PDFReportModal isOpen={isPDFOpen} onClose={() => setIsPDFOpen(false)} />
    </div>
  );
};

export default History;
