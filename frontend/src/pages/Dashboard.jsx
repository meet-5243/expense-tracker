import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import { 
  Plus, Edit, Trash2, TrendingUp, AlertTriangle, 
  DollarSign, Calendar, Eye, PieChart, ShoppingBag, 
  Utensils, Car, FileText, Film, HelpCircle 
} from 'lucide-react';

// Map categories to icons and colors
const CATEGORY_MAP = {
  food: { icon: Utensils, bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  travel: { icon: Car, bg: 'bg-blue-500/10', text: 'text-blue-400' },
  shopping: { icon: ShoppingBag, bg: 'bg-violet-500/10', text: 'text-violet-400' },
  bills: { icon: FileText, bg: 'bg-amber-500/10', text: 'text-amber-400' },
  entertainment: { icon: Film, bg: 'bg-pink-500/10', text: 'text-pink-400' },
  other: { icon: HelpCircle, bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

const Dashboard = () => {
  const { showToast } = useToast();

  // Date constants
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();
  const monthName = today.toLocaleString('default', { month: 'long' });

  // Page States
  const [budget, setBudget] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    totalSpent: 0,
    highestExpense: 0,
    avgDailySpend: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  // Selected item states
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Date range utility
  const getMonthDateRange = useCallback((month, year) => {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate: startStr, endDate: endStr };
  }, []);

  // Main loader function
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getMonthDateRange(currentMonth, currentYear);
      
      // Fetch budget
      const budgetRes = await api.get(`/budgets?month=${currentMonth}&year=${currentYear}`);
      setBudget(budgetRes.data?.amount || 0);
      setNewBudgetAmount(budgetRes.data?.amount?.toString() || '0');

      // Fetch analytics for current month summary
      const analyticsRes = await api.get(`/analytics?startDate=${startDate}&endDate=${endDate}`);
      if (analyticsRes.data && analyticsRes.data.summary) {
        setSummary(analyticsRes.data.summary);
      }

      // Fetch last 5 expenses
      const expensesRes = await api.get('/expenses?page=1&limit=5');
      setExpenses(expensesRes.data?.expenses || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      showToast('Failed to retrieve dashboard stats', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, getMonthDateRange, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Budget management
  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(newBudgetAmount);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Please enter a valid budget amount', 'error');
      return;
    }

    setSubmitLoading(true);
    try {
      await api.post('/budgets', {
        month: currentMonth,
        year: currentYear,
        amount: parsed,
      });
      setBudget(parsed);
      setIsBudgetOpen(false);
      showToast(`Budget for ${monthName} updated to ₹${parsed}`, 'success');
      loadDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update monthly budget', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Add Expense
  const handleAddExpense = async (formData) => {
    setSubmitLoading(true);
    try {
      await api.post('/expenses', formData);
      setIsAddOpen(false);
      showToast('Expense added successfully!', 'success');
      loadDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Failed to create expense', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Edit Expense
  const handleEditExpense = async (formData) => {
    if (!selectedExpense) return;
    setSubmitLoading(true);
    try {
      await api.put(`/expenses/${selectedExpense._id}`, formData);
      setIsEditOpen(false);
      setSelectedExpense(null);
      showToast('Expense updated successfully!', 'success');
      loadDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update expense', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;
    setSubmitLoading(true);
    try {
      await api.delete(`/expenses/${selectedExpense._id}`);
      setIsDeleteOpen(false);
      setSelectedExpense(null);
      showToast('Expense deleted successfully', 'success');
      loadDashboardData();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete expense', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Calculations for progress bar
  const percentSpent = budget > 0 ? (summary.totalSpent / budget) * 100 : 0;
  
  // Progress Bar styling color logic
  let progressColorClass = 'bg-accent-emerald';
  let progressTextColorClass = 'text-accent-emerald';
  if (percentSpent >= 90) {
    progressColorClass = 'bg-accent-rose';
    progressTextColorClass = 'text-accent-rose';
  } else if (percentSpent >= 75) {
    progressColorClass = 'bg-accent-amber';
    progressTextColorClass = 'text-accent-amber';
  }

  // Helper formatting for Rupees
  const formatRupee = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="space-y-6 animate-[scaleUp_0.25s_ease-out]">
      {/* Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview</h1>
          <p className="text-sm text-dark-muted mt-1">Hello, welcome to your financial summary for {monthName} {currentYear}.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-accent-teal hover:bg-accent-tealHover text-dark-bg font-semibold text-sm shadow-lg shadow-accent-teal/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Main Stats Panel (Budget & Progress) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Budget Meter Card */}
        <div className="lg:col-span-2 bg-dark-card border border-dark-border/60 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Monthly Budget ({monthName})</span>
              <h2 className="text-3xl font-extrabold text-white mt-1">{formatRupee(budget)}</h2>
            </div>
            <button
              onClick={() => setIsBudgetOpen(true)}
              className="px-4 py-2 border border-dark-border bg-dark-input hover:bg-dark-border text-xs font-bold text-accent-teal rounded-xl transition-all duration-200"
            >
              Set Budget
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="mt-8 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-muted font-medium">Spent: <b className="text-white">{formatRupee(summary.totalSpent)}</b></span>
              <span className={`font-bold ${progressTextColorClass}`}>{percentSpent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-dark-input rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out ${progressColorClass}`}
                style={{ width: `${Math.min(percentSpent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-dark-muted pt-1">
              {budget - summary.totalSpent >= 0 ? (
                <span>Remaining: <b className="text-accent-emerald font-semibold">{formatRupee(budget - summary.totalSpent)}</b></span>
              ) : (
                <span className="flex items-center space-x-1 text-accent-rose font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                  Over budget by {formatRupee(Math.abs(budget - summary.totalSpent))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Highlight Stats: Quick summary card */}
        <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-dark-muted">Summary Metrics</span>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-dark-border/30">
                <span className="text-sm text-dark-muted">Daily Avg Spend</span>
                <span className="text-sm font-bold text-white">{formatRupee(summary.avgDailySpend)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-border/30">
                <span className="text-sm text-dark-muted">Highest Expense</span>
                <span className="text-sm font-bold text-accent-teal">{formatRupee(summary.highestExpense)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-dark-muted">Spent This Month</span>
                <span className="text-sm font-bold text-white">{formatRupee(summary.totalSpent)}</span>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-dark-border/30 mt-4 flex items-center justify-between text-xs text-dark-muted">
            <span>Range: Current Calendar Month</span>
          </div>
        </div>
      </div>

      {/* Recent Expenses & Skeleton loaders */}
      <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
          <a href="/history" className="text-xs font-bold text-accent-teal hover:underline flex items-center space-x-1">
            <span>View All</span>
          </a>
        </div>

        {loading ? (
          /* Loading skeleton */
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center justify-between py-3 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-dark-input rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-dark-input rounded"></div>
                    <div className="h-3 w-20 bg-dark-input rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-16 bg-dark-input rounded"></div>
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-dark-input rounded-full mb-4">
              <Eye className="h-8 w-8 text-dark-muted" />
            </div>
            <h4 className="text-base font-bold text-white">No expenses recorded yet</h4>
            <p className="text-sm text-dark-muted mt-1 max-w-xs">Start filling your wallet records by adding your first transaction!</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-5 px-5 py-2.5 rounded-xl bg-dark-input border border-dark-border hover:bg-dark-border text-sm font-semibold text-accent-teal transition-all duration-200 cursor-pointer"
            >
              Add Expense
            </button>
          </div>
        ) : (
          /* List of recent expenses */
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
                    timeZone: 'UTC', // Ensure consistent display of stored UTC date
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
        )}
      </div>

      {/* Budget Set Modal */}
      <Modal isOpen={isBudgetOpen} onClose={() => setIsBudgetOpen(false)} title="Configure Budget">
        <form onSubmit={handleBudgetSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
              Monthly Budget Amount (₹)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-dark-muted font-medium text-base">₹</span>
              </div>
              <input
                type="number"
                required
                value={newBudgetAmount}
                onChange={(e) => setNewBudgetAmount(e.target.value)}
                className="block w-full pl-8 pr-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
                placeholder="Enter budget limit"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitLoading}
            className="w-full flex justify-center py-3.5 px-4 rounded-2xl text-sm font-semibold text-dark-bg bg-accent-teal hover:bg-accent-tealHover transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {submitLoading ? (
              <div className="h-5 w-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Save Budget Limit'
            )}
          </button>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Expense Record">
        <ExpenseForm onSubmit={handleAddExpense} loading={submitLoading} />
      </Modal>

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
    </div>
  );
};

export default Dashboard;
