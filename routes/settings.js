const express = require('express');
const { pool } = require('../config/database');
const { checkPermission } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', checkPermission('manage_settings'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM settings`);
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update setting
router.put('/:key', checkPermission('manage_settings'), async (req, res) => {
  try {
    const { value } = req.body;
    const result = await pool.query(
      `UPDATE settings SET value = $1 WHERE key = $2 RETURNING *`,
      [value, req.params.key]
    );

    if (result.rows.length === 0) {
      // Insert if not exists
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)`,
        [req.params.key, value]
      );
    }

    res.json({ message: 'Setting updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
