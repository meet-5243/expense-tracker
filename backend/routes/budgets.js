const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const auth = require('../middleware/auth');

// Get budget for a specific month and year
// GET /api/budgets?month=7&year=2026
router.get('/', auth, async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year parameters are required' });
    }

    const budget = await Budget.findOne({ userId: req.userId, month, year });
    if (!budget) {
      return res.json({ amount: 0, month, year });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving budget', error: error.message });
  }
});

// Set or update budget for a specific month and year
// POST /api/budgets
router.post('/', auth, async (req, res) => {
  try {
    const { month, year, amount } = req.body;

    if (!month || !year || amount === undefined) {
      return res.status(400).json({ message: 'Month, year, and amount are required' });
    }

    if (amount < 0) {
      return res.status(400).json({ message: 'Budget amount cannot be negative' });
    }

    // Upsert budget (update if exists, insert if not)
    const budget = await Budget.findOneAndUpdate(
      { userId: req.userId, month, year },
      { amount },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Server error setting budget', error: error.message });
  }
});

module.exports = router;
