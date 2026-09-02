const express = require('express');
const { pool } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { validateProductInput } = require('../utils/validators');
const { checkPermission } = require('../middleware/auth');
const { ACTION_TYPES } = require('../config/constants');

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { search, department_id, category_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM products WHERE is_active = true`;
    const params = [];

    if (search) {
      query += ` AND (name ILIKE $${params.length + 1} OR sku ILIKE $${params.length + 2} OR barcode ILIKE $${params.length + 3})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department_id) {
      query += ` AND department_id = $${params.length + 1}`;
      params.push(department_id);
    }

    if (category_id) {
      query += ` AND category_id = $${params.length + 1}`;
      params.push(category_id);
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get product by barcode or SKU
router.get('/search/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT * FROM products WHERE (barcode = $1 OR sku = $1) AND is_active = true`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM products WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get product units
    const unitsResult = await pool.query(
      `SELECT * FROM product_units WHERE product_id = $1 ORDER BY conversion_factor DESC`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      units: unitsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', checkPermission('add_product'), async (req, res) => {
  try {
    const validation = validateProductInput(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error.message });
    }

    const { sku, barcode, name, description, department_id, category_id, brand, 
            supplier_id, cost_price, selling_price, base_unit, reorder_level, 
            opening_stock, tax_rate } = req.body;

    const productId = generateId();

    // Check for duplicate SKU
    const skuCheck = await pool.query(
      `SELECT id FROM products WHERE sku = $1`,
      [sku]
    );
    if (skuCheck.rows.length > 0) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    // Insert product
    const result = await pool.query(
      `INSERT INTO products (id, sku, barcode, name, description, department_id, 
                            category_id, brand, supplier_id, cost_price, selling_price, 
                            base_unit, current_stock, reorder_level, tax_rate, 
                            is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW())
       RETURNING *`,
      [productId, sku, barcode, name, description, department_id, category_id, brand, 
       supplier_id, cost_price, selling_price, base_unit, opening_stock, reorder_level, tax_rate]
    );

    // Create opening stock transaction
    if (opening_stock > 0) {
      await pool.query(
        `INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, 
                                            unit, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [generateId(), productId, 'opening_stock', opening_stock, base_unit, productId]
      );
    }

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), req.user.id, ACTION_TYPES.PRODUCT_CREATED, `Created product: ${name}`, productId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', checkPermission('edit_product'), async (req, res) => {
  try {
    const { name, description, cost_price, selling_price, reorder_level, tax_rate } = req.body;

    // Log price change if applicable
    if (cost_price || selling_price) {
      const oldProduct = await pool.query(
        `SELECT cost_price, selling_price FROM products WHERE id = $1`,
        [req.params.id]
      );
      if (oldProduct.rows.length > 0) {
        await pool.query(
          `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [generateId(), req.user.id, ACTION_TYPES.PRICE_CHANGED, 
           `Price changed from ${oldProduct.rows[0].selling_price} to ${selling_price}`, req.params.id]
        );
      }
    }

    const result = await pool.query(
      `UPDATE products SET name = COALESCE($1, name), 
                          description = COALESCE($2, description),
                          cost_price = COALESCE($3, cost_price),
                          selling_price = COALESCE($4, selling_price),
                          reorder_level = COALESCE($5, reorder_level),
                          tax_rate = COALESCE($6, tax_rate)
       WHERE id = $7 RETURNING *`,
      [name, description, cost_price, selling_price, reorder_level, tax_rate, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deactivate product
router.put('/:id/deactivate', checkPermission('edit_product'), async (req, res) => {
  try {
    await pool.query(
      `UPDATE products SET is_active = false WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
