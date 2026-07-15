const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authentication token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkeyforexpensetracker12345');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Token verification failed, authorization denied' });
    }

    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid', error: error.message });
  }
};

module.exports = auth;
