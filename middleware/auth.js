const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        `SELECT up.permission_id FROM user_permissions up
         JOIN roles r ON up.role_id = r.id
         WHERE up.user_id = $1`,
        [userId]
      );

      const permissions = result.rows.map(row => row.permission_id);

      if (!permissions.includes(permission)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};

module.exports = { authMiddleware, checkPermission };
