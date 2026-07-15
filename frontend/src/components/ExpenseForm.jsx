import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Search, Calendar, Clock, Tag } from 'lucide-react';

const ExpenseForm = ({ onSubmit, initialData = null, loading = false }) => {
  const { showToast } = useToast();

  // Form states
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  
  // Get local date/time string formatted correctly
  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeString = () => {
    const today = new Date();
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [date, setDate] = useState(getLocalDateString());
  const [time, setTime] = useState(getLocalTimeString());

  // Autocomplete states
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setAmount(initialData.amount?.toString() || '');
      setCategory(initialData.category || 'other');
      
      // Parse ISO Date back to YYYY-MM-DD
      if (initialData.date) {
        const d = new Date(initialData.date);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        setDate(`${y}-${m}-${day}`);
      }
      setTime(initialData.time || '');
    }
  }, [initialData]);

  // Click outside suggestions list to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when name (description) changes
  useEffect(() => {
    const queryAutocomplete = async () => {
      try {
        const url = name.trim()
          ? `/expenses/autocomplete/descriptions?query=${encodeURIComponent(name)}`
          : '/expenses/autocomplete/descriptions';
        const res = await api.get(url);
        setSuggestions(res.data);
      } catch (err) {
        console.error('Failed to load autocomplete descriptions:', err);
      }
    };

    const delayDebounce = setTimeout(() => {
      queryAutocomplete();
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [name]);

  const handleDescriptionSelect = async (selectedDesc) => {
    setName(selectedDesc);
    setShowSuggestions(false);

    try {
      // Query backend for the last details spent on this description
      const res = await api.get(`/expenses/autocomplete/last-details?description=${encodeURIComponent(selectedDesc)}`);
      if (res.data) {
        let autofilled = [];
        if (res.data.category !== null) {
          setCategory(res.data.category);
          autofilled.push(res.data.category);
        }
        if (autofilled.length > 0) {
          showToast(`Auto-filled Category: ${autofilled.join(', ')}`, 'info');
        }
      }
    } catch (err) {
      console.error('Error fetching last details:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !amount || !date || !time) {
      showToast('All fields are required!', 'error');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    onSubmit({
      name,
      amount: parsedAmount,
      category,
      date,
      time,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* Description Field with Autocomplete */}
      <div className="relative" ref={autocompleteRef}>
        <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
          Description
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onClick={() => setShowSuggestions(true)}
            className="block w-full pl-4 pr-10 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
            placeholder="e.g. Netflix, Morning coffee, House rent"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-dark-muted" />
          </div>
        </div>

        {/* Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-[50] w-full mt-1.5 bg-dark-card border border-dark-border rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-dark-border/40">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => handleDescriptionSelect(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-accent-teal/5 hover:text-accent-teal text-sm transition-colors duration-150"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Amount & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
            Amount (₹)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-dark-muted font-medium text-base">₹</span>
            </div>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full pl-8 pr-4 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
            Category
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full pl-4 pr-10 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text appearance-none focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
            >
              <option value="food">Food & Dining</option>
              <option value="travel">Travel & Transport</option>
              <option value="shopping">Shopping</option>
              <option value="bills">Bills & Utilities</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other / General</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Tag className="h-4 w-4 text-dark-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
            Date
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full pl-4 pr-10 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-dark-muted" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
            Time
          </label>
          <div className="relative">
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="block w-full pl-4 pr-10 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Clock className="h-4 w-4 text-dark-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-semibold text-dark-bg bg-accent-teal hover:bg-accent-tealHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-teal transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
        >
          {loading ? (
            <div className="h-5 w-5 border-2 border-dark-bg border-t-transparent rounded-full animate-spin"></div>
          ) : initialData ? (
            'Save Changes'
          ) : (
            'Add Expense'
          )}
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;
