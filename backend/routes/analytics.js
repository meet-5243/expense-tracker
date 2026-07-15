const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// GET /api/analytics?startDate=2026-01-01&endDate=2026-12-31
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = { userId: new mongoose.Types.ObjectId(req.userId) };

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) {
        matchStage.date.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        matchStage.date.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // 1. Total spent, Highest expense, Average Daily Spend (Summary stats)
    const summaryStats = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          highestExpense: { $max: '$amount' },
          count: { $sum: 1 },
        }
      }
    ]);

    const totalSpent = summaryStats[0]?.totalSpent || 0;
    const highestExpense = summaryStats[0]?.highestExpense || 0;

    // Calculate unique days in range to get a realistic average daily spend
    const uniqueDaysStats = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        }
      },
      {
        $group: {
          _id: null,
          uniqueDaysCount: { $sum: 1 }
        }
      }
    ]);

    const activeDaysCount = uniqueDaysStats[0]?.uniqueDaysCount || 1;
    // Average daily spend based on days we actually spent money (or 1 if none)
    const avgDailySpend = totalSpent / activeDaysCount;

    // 2. Most frequent Description
    const mostFrequentDescriptionStats = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1, totalAmount: -1 } },
      { $limit: 1 }
    ]);
    const mostFrequentDescription = mostFrequentDescriptionStats[0]?._id || 'None';

    // 3. Most frequent category
    const mostFrequentCategoryStats = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1, totalAmount: -1 } },
      { $limit: 1 }
    ]);
    const mostFrequentCategory = mostFrequentCategoryStats[0]?._id || 'None';

    // 4. Daily Breakdown
    const dailyBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 5. Weekly Breakdown
    // We group by year and week
    const weeklyBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            week: { $week: '$date' }
          },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } }
    ]);
    
    // Map weekly aggregation for charts (format label like "Year-Wk")
    const formattedWeeklyBreakdown = weeklyBreakdown.map(item => ({
      label: `Wk ${item._id.week}, ${item._id.year}`,
      amount: item.amount
    }));

    // 6. Monthly Breakdown
    const monthlyBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 7. Yearly Breakdown
    const yearlyBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y', date: '$date' } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 8. Category-wise Breakdown (Pie/Donut)
    const categoryBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    res.json({
      summary: {
        totalSpent,
        highestExpense,
        avgDailySpend,
        mostFrequentDescription,
        mostFrequentCategory,
        activeDaysCount
      },
      daily: dailyBreakdown.map(d => ({ label: d._id, amount: d.amount })),
      weekly: formattedWeeklyBreakdown,
      monthly: monthlyBreakdown.map(m => ({ label: m._id, amount: m.amount })),
      yearly: yearlyBreakdown.map(y => ({ label: y._id, amount: y.amount })),
      category: categoryBreakdown.map(c => ({ name: c._id, value: c.amount }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error generating analytics', error: error.message });
  }
});

module.exports = router;
