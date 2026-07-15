import React, { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import { Download, Calendar, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PDFReportModal = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [rangeType, setRangeType] = useState('this-month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const getLocalDateString = (offsetMonths = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() + offsetMonths);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return { year, month };
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      let queryStart = '';
      let queryEnd = '';
      let reportTitle = '';
      let budgetMonth = null;
      let budgetYear = null;

      const today = new Date();
      const currentYear = today.getFullYear();

      if (rangeType === 'this-month') {
        const { year, month } = getLocalDateString(0);
        queryStart = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month), 0).getDate();
        queryEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        reportTitle = `Expense Report - This Month (${today.toLocaleString('default', { month: 'long' })} ${year})`;
        budgetMonth = parseInt(month);
        budgetYear = year;
      } else if (rangeType === 'last-month') {
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const year = lastMonthDate.getFullYear();
        const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
        queryStart = `${year}-${month}-01`;
        const lastDay = new Date(year, parseInt(month), 0).getDate();
        queryEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        reportTitle = `Expense Report - Last Month (${lastMonthDate.toLocaleString('default', { month: 'long' })} ${year})`;
        budgetMonth = parseInt(month);
        budgetYear = year;
      } else if (rangeType === 'full-year') {
        queryStart = `${currentYear}-01-01`;
        queryEnd = `${currentYear}-12-31`;
        reportTitle = `Expense Report - Full Year (${currentYear})`;
      } else if (rangeType === 'custom') {
        if (!startDate || !endDate) {
          showToast('Please select both start and end dates', 'error');
          setGenerating(false);
          return;
        }
        queryStart = startDate;
        queryEnd = endDate;
        reportTitle = `Expense Report - Custom Range (${startDate} to ${endDate})`;
      }

      // 1. Fetch expenses for the range (without pagination - limit large number)
      const res = await api.get(`/expenses?startDate=${queryStart}&endDate=${queryEnd}&limit=5000`);
      const expenses = res.data?.expenses || [];

      if (expenses.length === 0) {
        showToast('No expenses found in the selected date range', 'warning');
        setGenerating(false);
        return;
      }

      // 2. Fetch budget if applicable (single month range)
      let budgetAmount = null;
      if (budgetMonth && budgetYear) {
        try {
          const bRes = await api.get(`/budgets?month=${budgetMonth}&year=${budgetYear}`);
          budgetAmount = bRes.data?.amount || 0;
        } catch (err) {
          console.error('Failed to retrieve budget for PDF summary', err);
        }
      }

      // Calculate stats
      const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
      const categoryTotals = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {});

      // 3. Construct PDF
      const doc = new jsPDF();
      
      // Theme colors
      const primaryColor = [11, 15, 25]; // #0B0F19 Dark theme primary
      const accentColor = [20, 184, 166]; // #14B8A6 Teal accent

      // Header Banner
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 38, 'F');

      // Title & Branding
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('RupeeControl', 14, 18);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text('Premium Expense Management System', 14, 24);

      doc.setFontSize(11);
      doc.setTextColor(...accentColor);
      doc.setFont('helvetica', 'bold');
      doc.text(reportTitle, 14, 32);

      // Metadatas (Date generated)
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 140, 18);
      doc.text(`Range: ${queryStart} to ${queryEnd}`, 140, 24);

      // Stats Section
      let currentY = 48;
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Financial Summary', 14, currentY);

      currentY += 8;
      
      // Draw a summary stats table
      const summaryHead = [['Metrics', 'Amount (INR)']];
      const summaryBody = [
        ['Total Expenses Recorded', `${expenses.length}`],
        ['Total Capital Spent', `Rs. ${totalSpent.toFixed(2)}`],
      ];

      if (budgetAmount !== null) {
        const remaining = budgetAmount - totalSpent;
        summaryBody.push(['Allocated Monthly Budget', `Rs. ${budgetAmount.toFixed(2)}`]);
        summaryBody.push([
          remaining >= 0 ? 'Remaining Budget' : 'Exceeded Budget Limit',
          `Rs. ${remaining.toFixed(2)}`
        ]);
      }

      autoTable(doc, {
        startY: currentY,
        head: summaryHead,
        body: summaryBody,
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 15;

      // Category breakdown summary table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Category-wise Distribution', 14, currentY);

      currentY += 8;

      const categoryHead = [['Category', 'Total Spent (INR)', 'Percentage (%)']];
      const categoryBody = Object.keys(categoryTotals).map(cat => {
        const amt = categoryTotals[cat];
        const pct = ((amt / totalSpent) * 100).toFixed(1);
        return [
          cat.toUpperCase(),
          `Rs. ${amt.toFixed(2)}`,
          `${pct}%`
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: categoryHead,
        body: categoryBody,
        theme: 'striped',
        headStyles: { fillColor: [85, 85, 85] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 15;

      // Add a page break if itemized table is long or fits better
      doc.addPage();
      currentY = 20;

      // Itemized Expenses Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Itemized Transaction History', 14, currentY);

      currentY += 8;

      const itemsHead = [['Description', 'Category', 'Date', 'Time', 'Amount (INR)']];
      const itemsBody = expenses.map(e => {
        const expenseDate = new Date(e.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        });
        return [
          e.name,
          e.category.toUpperCase(),
          expenseDate,
          e.time,
          `Rs. ${e.amount.toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: itemsHead,
        body: itemsBody,
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });

      // Save PDF file
      const filename = `RupeeControl_Report_${queryStart}_to_${queryEnd}.pdf`;
      doc.save(filename);
      showToast('PDF downloaded successfully!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to compile PDF report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download PDF Statement">
      <div className="space-y-5">
        <p className="text-sm text-dark-muted">
          Select the timeframe to compile your transactions into a premium PDF report.
        </p>

        {/* Range Selection */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'this-month', label: 'This Month' },
              { id: 'last-month', label: 'Last Month' },
              { id: 'full-year', label: 'Full Year' },
              { id: 'custom', label: 'Custom Range' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRangeType(opt.id)}
                className={`py-3 px-4 rounded-2xl text-xs font-semibold text-center border transition-all duration-200 cursor-pointer ${
                  rangeType === opt.id
                    ? 'border-accent-teal/30 bg-accent-teal/10 text-accent-teal'
                    : 'border-dark-border bg-dark-input text-dark-muted hover:text-dark-text hover:bg-dark-border'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {rangeType === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 animate-[scaleUp_0.15s_ease-out]">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full pl-4 pr-10 py-3 bg-dark-input border border-dark-border/70 rounded-2xl text-dark-text focus:outline-none focus:ring-2 focus:ring-accent-teal/40 focus:border-accent-teal transition-all duration-200 text-xs"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-dark-muted" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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

        {/* Generate Trigger */}
        <div className="flex space-x-3 pt-4 border-t border-dark-border/30">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-2xl text-sm font-semibold border border-dark-border bg-dark-input hover:bg-dark-border text-dark-text transition-all duration-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="flex-grow py-3.5 px-4 rounded-2xl text-sm font-semibold text-dark-bg bg-accent-teal hover:bg-accent-tealHover transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-dark-bg" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-dark-bg" />
                <span>Download Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PDFReportModal;
