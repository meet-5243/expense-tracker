const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// Create a new expense
// POST /api/expenses
router.post('/', auth, async (req, res) => {
  try {
    const { name, amount, category, date, time } = req.body;

    if (!name || amount === undefined || !date || !time) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const newExpense = new Expense({
      userId: req.userId,
      name,
      amount: parseFloat(amount),
      category: category || 'other',
      date: new Date(date + 'T00:00:00.000Z'), // Keep consistent UTC midnight
      time,
    });

    const savedExpense = await newExpense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating expense', error: error.message });
  }
});

// Get all expenses for a user (with search, category filter, date filter, pagination)
// GET /api/expenses?page=1&limit=10&search=coffee&category=food&startDate=2026-07-01&endDate=2026-07-15
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, category, startDate, endDate } = req.query;

    const query = { userId: req.userId };

    // Search filter (description name)
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    // Fetch records sorted by date descending, then time descending, then createdAt descending
    const expenses = await Expense.find(query)
      .sort({ date: -1, time: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Expense.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      expenses,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving expenses', error: error.message });
  }
});

// Get distinct descriptions used by user for autocomplete
// GET /api/expenses/autocomplete/descriptions?query=st
router.get('/autocomplete/descriptions', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    const matchStage = { userId: new mongoose.Types.ObjectId(req.userId) };
    if (query) {
      matchStage.name = { $regex: query, $options: 'i' }; // Substring match
    }

    const descriptions = await Expense.aggregate([
      { $match: matchStage },
      { $sort: { date: -1, createdAt: -1 } },
      { $group: { _id: "$name", lastUsed: { $first: "$date" } } },
      { $sort: { lastUsed: -1 } },
      { $limit: 15 }
    ]);

    res.json(descriptions.map(d => d._id));
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving autocomplete descriptions', error: error.message });
  }
});

// Get last details (amount and category) spent on a description
// GET /api/expenses/autocomplete/last-details?description=Starbucks
router.get('/autocomplete/last-details', auth, async (req, res) => {
  try {
    const { description } = req.query;
    if (!description) {
      return res.status(400).json({ message: 'Description parameter is required' });
    }

    const lastExpense = await Expense.findOne({ userId: req.userId, name: description })
      .sort({ date: -1, createdAt: -1 });

    if (!lastExpense) {
      return res.json({ amount: null, category: null });
    }

    res.json({ amount: lastExpense.amount, category: lastExpense.category });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving last details', error: error.message });
  }
});

// Update an expense
// PUT /api/expenses/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, amount, category, date, time } = req.body;

    const expense = await Expense.findOne({ _id: req.params.id, userId: req.userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    if (name !== undefined) expense.name = name;
    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (category !== undefined) expense.category = category;
    if (date) expense.date = new Date(date + 'T00:00:00.000Z');
    if (time) expense.time = time;

    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating expense', error: error.message });
  }
});

// Delete an expense
// DELETE /api/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting expense', error: error.message });
  }
});

module.exports = router;
