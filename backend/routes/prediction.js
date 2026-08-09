const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get tomorrow's predicted expense
// GET /api/prediction
router.get('/', auth, async (req, res) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${mlServiceUrl}/predict/${req.userId}`);
    
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
    const response = await fetch(`${mlServiceUrl}/train/${req.userId}`, {
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
