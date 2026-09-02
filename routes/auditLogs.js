const express = require('express');
const { pool } = require('../config/database');
const { checkPermission } = require('../middleware/auth');

const router = express.Router();

// Get audit logs
router.get('/', checkPermission('view_audit_logs'), async (req, res) => {
  try {
    const { user_id, action, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT al.*, u.first_name, u.last_name FROM audit_logs al
                 LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const params = [];

    if (user_id) {
      query += ` AND al.user_id = $${params.length + 1}`;
      params.push(user_id);
    }

    if (action) {
      query += ` AND al.action = $${params.length + 1}`;
      params.push(action);
    }

    if (start_date) {
      query += ` AND DATE(al.created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(al.created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
