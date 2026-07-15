import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  RefreshCw, TrendingUp, AlertTriangle, 
  Tag, Activity, HelpCircle, Utensils, 
  Car, ShoppingBag, FileText, Film 
} from 'lucide-react';

const COLORS = ['#14B8A6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#10B981', '#64748B'];

const CATEGORY_ICONS = {
  food: Utensils,
  travel: Car,
  shopping: ShoppingBag,
  bills: FileText,
  entertainment: Film,
  other: HelpCircle,
};

const Analytics = () => {
  const { showToast } = useToast();
  
  // Date selection states
  const today = new Date();
  const currentYear = today.getFullYear();
  const initialStartDate = `${currentYear}-01-01`; // Default to Year-to-Date
  const initialEndDate = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  
  // Chart types / display states
  const [temporalType, setTemporalType] = useState('monthly'); // daily, weekly, monthly, yearly
  const [chartVisual, setChartVisual] = useState('bar'); // bar, line

  // Analytics states
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/analytics';
      if (startDate || endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load analytical metrics', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleResetDates = () => {
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  };

  const formatRupee = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  // Get current active temporal chart data based on dropdown choice
  const getTemporalChartData = () => {
    if (!data) return [];
    switch (temporalType) {
      case 'daily':
        return data.daily;
      case 'weekly':
        return data.weekly;
      case 'monthly':
        return data.monthly;
      case 'yearly':
        return data.yearly;
      default:
        return data.monthly;
    }
  };

  const temporalData = getTemporalChartData();
  const categoryData = data?.category || [];

  return (
    <div className="space-y-6 animate-[scaleUp_0.25s_ease-out]">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-dark-muted mt-1">Visualize your cash flow, habits, and spending patterns.</p>
        </div>
        
        {/* Date Filter Bar */}
        <div className="flex items-center space-x-2 bg-dark-card border border-dark-border/60 p-2 rounded-2xl shadow-md">
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-accent-teal"
            />
          </div>
          <span className="text-dark-muted text-xs font-semibold">to</span>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-accent-teal"
            />
          </div>
          <button
            onClick={handleResetDates}
            className="p-1.5 bg-dark-input hover:bg-dark-border text-dark-muted hover:text-white rounded-xl transition-all duration-150"
            title="Reset to Year-to-Date"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        /* Loading skeletons */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-28 bg-dark-card border border-dark-border/40 rounded-3xl animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[400px] bg-dark-card border border-dark-border/40 rounded-3xl animate-pulse"></div>
            <div className="h-[400px] bg-dark-card border border-dark-border/40 rounded-3xl animate-pulse"></div>
          </div>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-dark-muted">Failed to generate reports.</div>
      ) : (
        /* Real Content */
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Spent */}
            <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-15 text-accent-teal group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-16 w-16" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">Total Expenses</span>
              <h3 className="text-2xl font-extrabold text-white mt-2">{formatRupee(data.summary.totalSpent)}</h3>
              <p className="text-[10px] text-accent-teal mt-2 font-medium">Accumulated sum</p>
            </div>

            {/* Daily Avg */}
            <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-15 text-accent-violet group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-16 w-16" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">Daily Average</span>
              <h3 className="text-2xl font-extrabold text-white mt-2">{formatRupee(data.summary.avgDailySpend)}</h3>
              <p className="text-[10px] text-accent-violet mt-2 font-medium">Over {data.summary.activeDaysCount} active days</p>
            </div>

            {/* Highest Expense */}
            <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-15 text-accent-amber group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-16 w-16" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">Highest Spent</span>
              <h3 className="text-2xl font-extrabold text-accent-amber mt-2">{formatRupee(data.summary.highestExpense)}</h3>
              <p className="text-[10px] text-dark-muted mt-2 font-medium">Single transaction peak</p>
            </div>

            {/* Most Freq Description */}
            <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-15 text-accent-emerald group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-16 w-16" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">Top Expense</span>
              <h3 className="text-lg font-bold text-white mt-2.5 truncate">{data.summary.mostFrequentDescription}</h3>
              <p className="text-[10px] text-accent-emerald mt-2 font-medium">Most frequent item</p>
            </div>

            {/* Most Freq Category */}
            <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-15 text-accent-rose group-hover:scale-110 transition-transform duration-300">
                <Tag className="h-16 w-16" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-dark-muted">Top Category</span>
              <h3 className="text-lg font-bold text-white mt-2.5 capitalize">{data.summary.mostFrequentCategory}</h3>
              <p className="text-[10px] text-accent-rose mt-2 font-medium">Primary channel</p>
            </div>
          </div>

          {/* Charts Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Temporal Chart */}
            <div className="lg:col-span-2 bg-dark-card border border-dark-border/60 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-2 border-b border-dark-border/30">
                <h3 className="text-base font-bold text-white">Spend Progression</h3>
                
                {/* Visual Settings Controls */}
                <div className="flex items-center space-x-2">
                  {/* Daily/Weekly/Monthly/Yearly Selector */}
                  <select
                    value={temporalType}
                    onChange={(e) => setTemporalType(e.target.value)}
                    className="px-3 py-1.5 bg-dark-input border border-dark-border rounded-xl text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-accent-teal"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>

                  {/* Toggle Visual Type (Bar vs Line) */}
                  <div className="flex rounded-xl bg-dark-input border border-dark-border p-0.5">
                    <button
                      onClick={() => setChartVisual('bar')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150 ${
                        chartVisual === 'bar'
                          ? 'bg-accent-teal text-dark-bg'
                          : 'text-dark-muted hover:text-white'
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setChartVisual('line')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-150 ${
                        chartVisual === 'line'
                          ? 'bg-accent-teal text-dark-bg'
                          : 'text-dark-muted hover:text-white'
                      }`}
                    >
                      Line
                    </button>
                  </div>
                </div>
              </div>

              {/* Temporal Chart Render */}
              <div className="h-80 w-full pt-4">
                {temporalData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-dark-muted">
                    No data points available for this selection
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartVisual === 'bar' ? (
                      <BarChart data={temporalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222F4D" vertical={false} />
                        <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4D', borderRadius: '16px' }}
                          labelStyle={{ color: '#9CA3AF', fontWeight: 'bold' }}
                          formatter={(value) => [`₹${value.toFixed(2)}`, 'Amount']}
                        />
                        <Bar dataKey="amount" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={temporalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222F4D" vertical={false} />
                        <XAxis dataKey="label" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4D', borderRadius: '16px' }}
                          labelStyle={{ color: '#9CA3AF', fontWeight: 'bold' }}
                          formatter={(value) => [`₹${value.toFixed(2)}`, 'Amount']}
                        />
                        <Line type="monotone" dataKey="amount" stroke="#14B8A6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category Breakdown (Pie/Donut Chart) */}
            <div className="bg-dark-card border border-dark-border/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white pb-3 border-b border-dark-border/30 mb-4">Category Distribution</h3>
                <div className="h-60 w-full relative flex items-center justify-center">
                  {categoryData.length === 0 ? (
                    <div className="text-sm text-dark-muted">No transactions found</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#151D30', borderColor: '#222F4D', borderRadius: '16px' }}
                          itemStyle={{ color: '#F3F4F6' }}
                          formatter={(value) => [`₹${value.toFixed(2)}`, 'Spent']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Category Legend list with colors */}
              <div className="mt-4 max-h-32 overflow-y-auto space-y-2.5 pr-1">
                {categoryData.map((item, index) => {
                  const Icon = CATEGORY_ICONS[item.name.toLowerCase()] || HelpCircle;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <Icon className="h-3.5 w-3.5 text-dark-muted" />
                        <span className="capitalize text-dark-text font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-white">{formatRupee(item.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
