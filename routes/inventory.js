const express = require('express');
const { pool } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { checkPermission } = require('../middleware/auth');
const { ACTION_TYPES } = require('../config/constants');

const router = express.Router();

// Get inventory
router.get('/', async (req, res) => {
  try {
    const { department_id, category_id, search, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT p.* FROM products p WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (p.name ILIKE $${params.length + 1} OR p.sku ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (department_id) {
      query += ` AND p.department_id = $${params.length + 1}`;
      params.push(department_id);
    }

    if (category_id) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category_id);
    }

    if (status === 'low') {
      query += ` AND p.current_stock <= p.reorder_level`;
    } else if (status === 'out') {
      query += ` AND p.current_stock = 0`;
    }

    query += ` ORDER BY p.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stock count sessions
router.get('/stock-count/sessions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM stock_count_sessions ORDER BY created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create stock count session
router.post('/stock-count/sessions', checkPermission('stock_count'), async (req, res) => {
  try {
    const sessionId = generateId();
    const result = await pool.query(
      `INSERT INTO stock_count_sessions (id, started_by, started_at) VALUES ($1, $2, NOW())
       RETURNING *`,
      [sessionId, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add stock count item
router.post('/stock-count/:session_id/items', checkPermission('stock_count'), async (req, res) => {
  try {
    const { product_id, physical_quantity } = req.body;
    const { session_id } = req.params;

    // Get product
    const productResult = await pool.query(
      `SELECT current_stock, cost_price FROM products WHERE id = $1`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];
    const difference = physical_quantity - product.current_stock;
    const adjustment_value = difference * product.cost_price;

    const itemId = generateId();
    const result = await pool.query(
      `INSERT INTO stock_count_items (id, session_id, product_id, system_quantity, 
                                     physical_quantity, difference, adjustment_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [itemId, session_id, product_id, product.current_stock, physical_quantity, difference, adjustment_value]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post stock count (apply adjustments)
router.post('/stock-count/:session_id/post', checkPermission('adjust_stock'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { session_id } = req.params;

    // Get all items for this session
    const itemsResult = await client.query(
      `SELECT * FROM stock_count_items WHERE session_id = $1`,
      [session_id]
    );

    // Apply adjustments
    for (const item of itemsResult.rows) {
      if (item.difference !== 0) {
        await client.query(
          `UPDATE products SET current_stock = $1 WHERE id = $2`,
          [item.physical_quantity, item.product_id]
        );

        // Create inventory transaction
        const transactionType = item.difference > 0 ? 'adjustment_increase' : 'adjustment_decrease';
        await client.query(
          `INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, 
                                              reference_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [generateId(), item.product_id, transactionType, Math.abs(item.difference), session_id]
        );
      }
    }

    // Update session status
    await client.query(
      `UPDATE stock_count_sessions SET status = 'posted', posted_by = $1, posted_at = NOW() WHERE id = $2`,
      [req.user.id, session_id]
    );

    // Log action
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), req.user.id, ACTION_TYPES.STOCK_ADJUSTED, 'Stock count posted', session_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Stock count posted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get inventory transactions
router.get('/transactions', async (req, res) => {
  try {
    const { product_id, start_date, end_date, type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM inventory_transactions WHERE 1=1`;
    const params = [];

    if (product_id) {
      query += ` AND product_id = $${params.length + 1}`;
      params.push(product_id);
    }

    if (type) {
      query += ` AND transaction_type = $${params.length + 1}`;
      params.push(type);
    }

    if (start_date) {
      query += ` AND DATE(created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
