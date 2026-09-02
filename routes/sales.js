const express = require('express');
const { pool } = require('../config/database');
const { generateId, generateReceiptNumber, calculateGrossProfit } = require('../utils/helpers');
const { checkPermission } = require('../middleware/auth');
const { ACTION_TYPES, PAYMENT_METHODS } = require('../config/constants');

const router = express.Router();

// Create sale
router.post('/', checkPermission('add_sale'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_id, payment_method, items, discount_amount = 0, paid_amount, notes } = req.body;
    const cashier_id = req.user.id;

    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No items in sale' });
    }

    const saleId = generateId();
    const receipt_number = generateReceiptNumber('SALE');

    // Calculate totals server-side
    let subtotal = 0;
    let total_cost = 0;
    let gross_profit = 0;

    for (const item of items) {
      const productResult = await client.query(
        `SELECT cost_price, current_stock FROM products WHERE id = $1`,
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Product not found: ${item.product_id}` });
      }

      const product = productResult.rows[0];

      // Check stock
      if (product.current_stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock for product` });
      }

      const item_total = (item.selling_price * item.quantity) - (item.discount || 0);
      const item_cost = product.cost_price * item.quantity;
      const item_profit = item_total - item_cost;

      subtotal += item_total;
      total_cost += item_cost;
      gross_profit += item_profit;
    }

    const total = subtotal - discount_amount;

    // Insert sale
    const saleResult = await client.query(
      `INSERT INTO sales (id, receipt_number, customer_id, cashier_id, payment_method, 
                         subtotal, discount_amount, total, paid_amount, total_cost, 
                         gross_profit, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [saleId, receipt_number, customer_id, cashier_id, payment_method, subtotal, 
       discount_amount, total, paid_amount || total, total_cost, gross_profit, notes || '']
    );

    // Insert sale items and update inventory
    for (const item of items) {
      const itemId = generateId();
      await client.query(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit, selling_price, 
                               cost_price, discount, item_total, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [itemId, saleId, item.product_id, item.quantity, item.unit, item.selling_price,
         item.cost_price, item.discount || 0, 
         (item.selling_price * item.quantity) - (item.discount || 0)]
      );

      // Update product stock
      await client.query(
        `UPDATE products SET current_stock = current_stock - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );

      // Create inventory transaction
      await client.query(
        `INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, 
                                            unit, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [generateId(), item.product_id, 'sale', -item.quantity, item.unit, saleId]
      );
    }

    // Log action
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), cashier_id, ACTION_TYPES.SALE_CREATED, `Sale: ${receipt_number}`, saleId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      id: saleId,
      receipt_number,
      total,
      gross_profit
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get sales
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, customer_id, cashier_id, payment_method, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM sales WHERE 1=1`;
    const params = [];

    if (start_date) {
      query += ` AND DATE(created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (customer_id) {
      query += ` AND customer_id = $${params.length + 1}`;
      params.push(customer_id);
    }

    if (cashier_id) {
      query += ` AND cashier_id = $${params.length + 1}`;
      params.push(cashier_id);
    }

    if (payment_method) {
      query += ` AND payment_method = $${params.length + 1}`;
      params.push(payment_method);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single sale
router.get('/:id', async (req, res) => {
  try {
    const saleResult = await pool.query(
      `SELECT * FROM sales WHERE id = $1`,
      [req.params.id]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const itemsResult = await pool.query(
      `SELECT * FROM sale_items WHERE sale_id = $1`,
      [req.params.id]
    );

    res.json({
      ...saleResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Void sale
router.post('/:id/void', checkPermission('void_sale'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { reason } = req.body;

    // Get sale items
    const itemsResult = await client.query(
      `SELECT * FROM sale_items WHERE sale_id = $1`,
      [req.params.id]
    );

    // Restore inventory
    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE products SET current_stock = current_stock + $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );

      // Create reversal transaction
      await client.query(
        `INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, 
                                            unit, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [generateId(), item.product_id, 'sale_void', item.quantity, item.unit, req.params.id]
      );
    }

    // Update sale status
    await client.query(
      `UPDATE sales SET status = 'voided' WHERE id = $1`,
      [req.params.id]
    );

    // Log action
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), req.user.id, ACTION_TYPES.SALE_VOIDED, reason || 'Sale voided', req.params.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Sale voided successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Hold receipt
router.post('/:id/hold', async (req, res) => {
  try {
    const { reference_name } = req.body;

    await pool.query(
      `UPDATE sales SET status = 'held', held_reference = $1 WHERE id = $2`,
      [reference_name, req.params.id]
    );

    res.json({ message: 'Receipt held successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve held receipt
router.get('/held/retrieve', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sales WHERE status = 'held' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
