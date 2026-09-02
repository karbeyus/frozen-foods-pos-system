const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateId, generatePassword } = require('../utils/helpers');
const { checkPermission } = require('../middleware/auth');
const { ACTION_TYPES } = require('../config/constants');

const router = express.Router();

// Get all employees
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, r.name as role_name FROM employees e
       JOIN roles r ON e.role_id = r.id
       ORDER BY e.first_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single employee
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, r.name as role_name FROM employees e
       JOIN roles r ON e.role_id = r.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create employee
router.post('/', checkPermission('manage_employees'), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, role_id, is_active } = req.body;

    if (!first_name || !last_name || !email || !role_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const employeeId = generateId();
    const username = `${first_name.toLowerCase()}.${last_name.toLowerCase()}`;
    const tempPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user account
    const userResult = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, first_name, last_name, 
                         role_id, is_active, must_change_password, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
       RETURNING *`,
      [employeeId, username, email, hashedPassword, first_name, last_name, role_id, is_active !== false]
    );

    // Create employee record
    await pool.query(
      `INSERT INTO employees (id, user_id, first_name, last_name, email, phone, role_id, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [employeeId, employeeId, first_name, last_name, email, phone || '', role_id, is_active !== false]
    );

    // Get role permissions
    const permResult = await pool.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = $1`,
      [role_id]
    );

    // Assign permissions to user
    for (const perm of permResult.rows) {
      await pool.query(
        `INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2)`,
        [employeeId, perm.permission_id]
      );
    }

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), req.user.id, ACTION_TYPES.EMPLOYEE_CREATED, `Created employee: ${first_name} ${last_name}`, employeeId]
    );

    res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        id: employeeId,
        username,
        email,
        first_name,
        last_name,
        temporary_password: tempPassword
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update employee
router.put('/:id', checkPermission('manage_employees'), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, role_id, is_active } = req.body;

    await pool.query(
      `UPDATE employees SET first_name = $1, last_name = $2, email = $3, 
              phone = $4, role_id = $5, is_active = $6
       WHERE id = $7`,
      [first_name, last_name, email, phone, role_id, is_active, req.params.id]
    );

    // Update user record too
    await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, email = $3, role_id = $4, is_active = $5
       WHERE id = $6`,
      [first_name, last_name, email, role_id, is_active, req.params.id]
    );

    // Log action
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, description, record_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [generateId(), req.user.id, 'employee_edited', `Updated employee: ${first_name} ${last_name}`, req.params.id]
    );

    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employee activity
router.get('/:id/activity', checkPermission('view_employee_activity'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employee sales
router.get('/:id/sales', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sales WHERE cashier_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
