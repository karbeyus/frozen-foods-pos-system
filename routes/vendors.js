const express = require('express');
const { pool } = require('../config/database');
const { generateId } = require('../utils/helpers');
const { checkPermission } = require('../middleware/auth');

const router = express.Router();

// Get all vendors
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM vendors WHERE is_active = true`;
    const params = [];

    if (search) {
      query += ` AND name ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single vendor
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vendors WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create vendor
router.post('/', checkPermission('add_vendor'), async (req, res) => {
  try {
    const { name, phone, email, address, contact_person, bank_info, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vendor name required' });
    }

    const vendorId = generateId();
    const result = await pool.query(
      `INSERT INTO vendors (id, name, phone, email, address, contact_person, bank_info, notes, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
       RETURNING *`,
      [vendorId, name, phone || '', email || '', address || '', contact_person || '', bank_info || '', notes || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update vendor
router.put('/:id', checkPermission('edit_vendor'), async (req, res) => {
  try {
    const { name, phone, email, address, contact_person, bank_info, notes } = req.body;

    const result = await pool.query(
      `UPDATE vendors SET name = COALESCE($1, name),
                         phone = COALESCE($2, phone),
                         email = COALESCE($3, email),
                         address = COALESCE($4, address),
                         contact_person = COALESCE($5, contact_person),
                         bank_info = COALESCE($6, bank_info),
                         notes = COALESCE($7, notes)
       WHERE id = $8 RETURNING *`,
      [name, phone, email, address, contact_person, bank_info, notes, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
