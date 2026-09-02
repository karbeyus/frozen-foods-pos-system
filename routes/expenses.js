const express = require('express');
const { pool } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { checkPermission } = require('../middleware/auth');

const router = express.Router();

// Get all expenses
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, category, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (start_date) {
      query += ` AND DATE(created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create expense
router.post('/', checkPermission('add_expense'), async (req, res) => {
  try {
    const { category, amount, description, payment_method, receipt_reference } = req.body;

    if (!category || !amount) {
      return res.status(400).json({ error: 'Category and amount required' });
    }

    const expenseId = generateId();
    const result = await pool.query(
      `INSERT INTO expenses (id, category, amount, description, payment_method, 
                            receipt_reference, recorded_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [expenseId, category, amount, description || '', payment_method || '', receipt_reference || '', req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense
router.put('/:id', checkPermission('edit_expense'), async (req, res) => {
  try {
    const { category, amount, description, payment_method } = req.body;

    const result = await pool.query(
      `UPDATE expenses SET category = COALESCE($1, category),
                          amount = COALESCE($2, amount),
                          description = COALESCE($3, description),
                          payment_method = COALESCE($4, payment_method)
       WHERE id = $5 RETURNING *`,
      [category, amount, description, payment_method, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
