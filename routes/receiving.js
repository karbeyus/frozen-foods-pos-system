const express = require('express');
const { pool } = require('../config/database');
const { generateId, generateReceiptNumber } = require('../utils/helpers');
const { checkPermission } = require('../middleware/auth');
const { ACTION_TYPES } = require('../config/constants');

const router = express.Router();

// Create receiving voucher
router.post('/', checkPermission('add_receiving'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { vendor_id, invoice_number, items, discount = 0, other_charges = 0, notes } = req.body;
    const received_by = req.user.id;

    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No items in receiving voucher' });
    }

    const voucherId = generateId();
    const voucher_number = generateReceiptNumber('GRN');

    // Calculate totals
    let total_cost = 0;
    for (const item of items) {
      total_cost += (item.cost_price * item.quantity);
    }

    const grand_total = total_cost - discount + other_charges;

    // Insert receiving voucher
    await client.query(
      `INSERT INTO receiving (id, voucher_number, vendor_id, invoice_number, total_cost, 
                             discount, other_charges, grand_total, received_by, status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10, NOW())`,
      [voucherId, voucher_number, vendor_id, invoice_number, total_cost, discount, 
       other_charges, grand_total, received_by, notes || '']
    );

    // Insert receiving items
    for (const item of items) {
      const itemId = generateId();
      await client.query(
        `INSERT INTO receiving_items (id, receiving_id, product_id, quantity, unit, cost_price, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [itemId, voucherId, item.product_id, item.quantity, item.unit, item.cost_price,
         item.cost_price * item.quantity]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: voucherId,
      voucher_number,
      grand_total
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get receiving vouchers
router.get('/', async (req, res) => {
  try {
    const { status, vendor_id, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT r.*, v.name as vendor_name FROM receiving r
                 JOIN vendors v ON r.vendor_id = v.id WHERE 1=1`;
    const params = [];

    if (status) {
      query += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }

    if (vendor_id) {
      query += ` AND r.vendor_id = $${params.length + 1}`;
      params.push(vendor_id);
    }

    if (start_date) {
      query += ` AND DATE(r.created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(r.created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single receiving voucher
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, v.name as vendor_name FROM receiving r
       JOIN vendors v ON r.vendor_id = v.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receiving voucher not found' });
    }

    const itemsResult = await pool.query(
      `SELECT ri.*, p.name as product_name FROM receiving_items ri
       JOIN products p ON ri.product_id = p.id
       WHERE ri.receiving_id = $1`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post receiving voucher (update inventory)
router.post('/:id/post', checkPermission('post_receiving'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get receiving details
    const receivingResult = await client.query(
      `SELECT * FROM receiving WHERE id = $1`,
      [req.params.id]
    );

    if (receivingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Receiving voucher not found' });
    }

    const receiving = receivingResult.rows[0];

    if (receiving.status === 'posted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Voucher already posted' });
    }

    // Get receiving items
    const itemsResult = await client.query(
      `SELECT * FROM receiving_items WHERE receiving_id = $1`,
      [req.params.id]
    );

    // Update inventory for each item
    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE products SET current_stock = current_stock + $1, cost_price = $2 WHERE id = $3`,
        [item.quantity, item.cost_price, item.product_id]
      );

      // Create inventory transaction
      await client.query(
        `INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, 
                                            unit, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [generateId(), item.product_id, 'purchase', item.quantity, item.unit, req.params.id]
      );
    }

    // Update receiving status
    await client.query(
      `UPDATE receiving SET status = 'posted', posted_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // Log action
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), req.user.id, ACTION_TYPES.RECEIVING_POSTED, 
       `Posted receiving: ${receiving.voucher_number}`, req.params.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Receiving voucher posted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Hold receiving voucher
router.post('/:id/hold', async (req, res) => {
  try {
    await pool.query(
      `UPDATE receiving SET status = 'held' WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Receiving voucher held' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
