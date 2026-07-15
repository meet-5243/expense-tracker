const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  category: {
    type: String,
    enum: ['food', 'travel', 'shopping', 'bills', 'entertainment', 'utilities', 'other'],
    default: 'other',
    index: true,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true,
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
  },
}, {
  timestamps: true,
});

// Compound index to speed up description autocomplete search by user
expenseSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
