const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const http = require('http');
const https = require('https');

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
    res.status(500).json({
      message: 'Failed to communicate with prediction service',
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
