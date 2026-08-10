const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const http = require('http');
const https = require('https');
const Expense = require('../models/Expense');

// Robust HTTP/HTTPS client to fallback on when native fetch is not available (older Node versions)
function safeFetch(url, options = {}) {
  if (typeof fetch === 'function') {
    return fetch(url, options);
  }

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const parsedUrl = new URL(url);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (url.startsWith('https') ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search
    };

    const req = client.request(reqOptions, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => body,
          json: async () => JSON.parse(body)
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Calculate SMA fallback directly from MongoDB
async function calculateSMAPrediction(userId) {
  try {
    const expenses = await Expense.find({ userId }).sort({ date: 1 });
    if (!expenses || expenses.length === 0) {
      return {
        userId,
        prediction: 0.0,
        isFallback: true,
        fallbackReason: 'No expense history available. Add some expenses to get started.',
        minAmount: 0.0,
        maxAmount: 0.0
      };
    }

    // Group by date (YYYY-MM-DD) and sum amounts
    const dailyMap = {};
    expenses.forEach(exp => {
      const dateStr = new Date(exp.date).toISOString().split('T')[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + exp.amount;
    });

    const dailyAmounts = Object.values(dailyMap);
    const totalDays = dailyAmounts.length;

    // Use a 7-day window
    const windowSize = Math.min(totalDays, 7);
    if (windowSize === 0) {
      return {
        userId,
        prediction: 0.0,
        isFallback: true,
        fallbackReason: 'No daily expense history available.',
        minAmount: 0.0,
        maxAmount: 0.0
      };
    }

    const lastDays = dailyAmounts.slice(-windowSize);
    const sum = lastDays.reduce((a, b) => a + b, 0);
    const prediction = sum / windowSize;
    const minAmount = Math.min(...lastDays);
    const maxAmount = Math.max(...lastDays);

    return {
      userId,
      prediction: Math.round(prediction * 100) / 100,
      isFallback: true,
      fallbackReason: 'ML service is warming up. Displaying Simple Moving Average fallback prediction.',
      metrics: null,
      minAmount: Math.round(minAmount * 100) / 100,
      maxAmount: Math.round(maxAmount * 100) / 100
    };
  } catch (err) {
    console.error('Failed to calculate SMA fallback in backend:', err);
    return null;
  }
}

// Get tomorrow's predicted expense
// GET /api/prediction
router.get('/', auth, async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const response = await safeFetch(`${mlServiceUrl}/predict/${req.userId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        message: 'ML prediction service returned an error',
        error: errorText
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.warn(`Warning: Failed to reach ML service (${error.message}). Calculating local SMA fallback...`);
    const fallbackData = await calculateSMAPrediction(req.userId);
    if (fallbackData) {
      return res.json(fallbackData);
    }
    res.status(500).json({
      message: 'Failed to communicate with prediction service and SMA fallback failed',
      error: error.message
    });
  }
});

// Trigger training of the user's prediction model
// POST /api/prediction/train
router.post('/train', auth, async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const response = await safeFetch(`${mlServiceUrl}/train/${req.userId}`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        message: 'ML training service returned an error',
        error: errorText
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to communicate with training service',
      error: error.message
    });
  }
});

module.exports = router;
