const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateId, generatePassword, hashPassword } = require('../utils/helpers');
const { validateEmail, validatePassword } = require('../utils/validators');
const { authMiddleware } = require('../middleware/auth');
const { ACTION_TYPES } = require('../config/constants');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query(
      `SELECT id, username, password_hash, first_name, last_name, role_id, 
              is_active, last_login, must_change_password
       FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role_id: user.role_id,
        first_name: user.first_name,
        last_name: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    // Update last login
    await pool.query(
      `UPDATE users SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );

    // Log login action
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [generateId(), user.id, ACTION_TYPES.LOGIN, 'User login']
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role_id: user.role_id,
        must_change_password: user.must_change_password
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Log logout action
    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [generateId(), userId, ACTION_TYPES.LOGOUT, 'User logout']
    );

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    const userId = req.user.id;

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const validation = validatePassword(new_password);
    if (validation.error) {
      return res.status(400).json({ error: validation.error.message });
    }

    // Verify current password
    const userResult = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(current_password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.post('/reset-password', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body;
    const currentUser = req.user;

    // Check if current user has permission to reset passwords
    const permResult = await pool.query(
      `SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission_id = $2`,
      [currentUser.id, 'manage_employees']
    );

    if (permResult.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2`,
      [hashedPassword, user_id]
    );

    res.json({
      message: 'Password reset successfully',
      temporary_password: newPassword
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/verify-token', authMiddleware, async (req, res) => {
  try {
    res.json({ valid: true, user: req.user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
