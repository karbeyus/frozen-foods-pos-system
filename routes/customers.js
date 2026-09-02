const express = require('express');
const { pool } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { checkPermission } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM customers`;
    const params = [];

    if (search) {
      query += ` WHERE name ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 2}`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM customers WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get walk-in customer
router.get('/default/walk-in', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM customers WHERE name = 'Walk-in Customer' LIMIT 1`
    );
    if (result.rows.length === 0) {
      // Create default walk-in customer if not exists
      const id = generateId();
      await pool.query(
        `INSERT INTO customers (id, name, phone, email, address, is_walk_in, created_at)
         VALUES ($1, 'Walk-in Customer', '', '', '', true, NOW())`,
        [id]
      );
      return res.json({ id, name: 'Walk-in Customer', is_walk_in: true });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
router.post('/', checkPermission('add_customer'), async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name required' });
    }

    const customerId = generateId();
    const result = await pool.query(
      `INSERT INTO customers (id, name, phone, email, address, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [customerId, name, phone || '', email || '', address || '', notes || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer
router.put('/:id', checkPermission('edit_customer'), async (req, res) => {
  try {
    const { name, phone, email, address, notes, credit_limit } = req.body;

    const result = await pool.query(
      `UPDATE customers SET name = COALESCE($1, name),
                           phone = COALESCE($2, phone),
                           email = COALESCE($3, email),
                           address = COALESCE($4, address),
                           notes = COALESCE($5, notes),
                           credit_limit = COALESCE($6, credit_limit)
       WHERE id = $7 RETURNING *`,
      [name, phone, email, address, notes, credit_limit, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get customer purchase history
router.get('/:id/purchases', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, COUNT(si.id) as item_count FROM sales s
       LEFT JOIN sale_items si ON s.id = si.sale_id
       WHERE s.customer_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
