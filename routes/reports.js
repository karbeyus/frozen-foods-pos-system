const express = require('express');
const { pool } = require('../config/database');
const { checkPermission } = require('../middleware/auth');

const router = express.Router();

// Daily sales report
router.get('/daily-sales', checkPermission('view_reports'), async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as transactions, 
              SUM(total) as total_sales, SUM(discount_amount) as total_discount,
              SUM(gross_profit) as total_profit
       FROM sales WHERE DATE(created_at) = $1 AND status != 'voided'
       GROUP BY DATE(created_at)`,
      [queryDate]
    );

    res.json(result.rows[0] || { date: queryDate, transactions: 0, total_sales: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weekly sales report
router.get('/weekly-sales', checkPermission('view_reports'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE_TRUNC('week', created_at)::date as week_start,
              COUNT(*) as transactions,
              SUM(total) as total_sales,
              SUM(discount_amount) as total_discount,
              SUM(gross_profit) as total_profit
       FROM sales WHERE status != 'voided'
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY week_start DESC
       LIMIT 12`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly sales report
router.get('/monthly-sales', checkPermission('view_reports'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE_TRUNC('month', created_at)::date as month_start,
              COUNT(*) as transactions,
              SUM(total) as total_sales,
              SUM(discount_amount) as total_discount,
              SUM(gross_profit) as total_profit
       FROM sales WHERE status != 'voided'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month_start DESC
       LIMIT 12`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales by product
router.get('/sales-by-product', checkPermission('view_reports'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT p.id, p.sku, p.name, p.cost_price, p.selling_price,
                        COUNT(si.id) as quantity_sold,
                        SUM(si.item_total) as total_sales,
                        SUM(si.quantity * p.cost_price) as total_cost,
                        SUM(si.item_total - (si.quantity * p.cost_price)) as gross_profit
                 FROM products p
                 LEFT JOIN sale_items si ON p.id = si.product_id
                 LEFT JOIN sales s ON si.sale_id = s.id
                 WHERE s.status != 'voided' OR s.status IS NULL`;
    const params = [];

    if (start_date) {
      query += ` AND DATE(s.created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(s.created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` GROUP BY p.id ORDER BY quantity_sold DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales by employee
router.get('/sales-by-employee', checkPermission('view_reports'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT e.id, e.first_name, e.last_name,
                        COUNT(s.id) as transactions,
                        SUM(s.total) as gross_sales,
                        SUM(s.discount_amount) as total_discount,
                        SUM(s.total - s.discount_amount) as net_sales,
                        SUM(s.total_cost) as cost_of_goods,
                        SUM(s.gross_profit) as gross_profit,
                        AVG(s.total) as avg_transaction
                 FROM employees e
                 LEFT JOIN sales s ON e.id = s.cashier_id
                 WHERE s.status != 'voided' OR s.status IS NULL`;
    const params = [];

    if (start_date) {
      query += ` AND DATE(s.created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(s.created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` GROUP BY e.id ORDER BY gross_sales DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales by department
router.get('/sales-by-department', checkPermission('view_reports'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT d.id, d.name,
                        SUM(si.quantity) as quantity_sold,
                        SUM(si.item_total) as total_sales,
                        SUM(si.quantity * p.cost_price) as total_cost,
                        SUM(si.item_total - (si.quantity * p.cost_price)) as gross_profit
                 FROM departments d
                 LEFT JOIN products p ON d.id = p.department_id
                 LEFT JOIN sale_items si ON p.id = si.product_id
                 LEFT JOIN sales s ON si.sale_id = s.id
                 WHERE s.status != 'voided' OR s.status IS NULL`;
    const params = [];

    if (start_date) {
      query += ` AND DATE(s.created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(s.created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` GROUP BY d.id ORDER BY total_sales DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory valuation
router.get('/inventory-valuation', checkPermission('view_reports'), async (req, res) => {
  try {
    const { department_id, category_id } = req.query;
    let query = `SELECT p.id, p.sku, p.name, p.cost_price, p.selling_price,
                        p.current_stock,
                        (p.current_stock * p.cost_price) as inventory_cost_value,
                        (p.current_stock * p.selling_price) as potential_sales_value,
                        (p.current_stock * (p.selling_price - p.cost_price)) as potential_profit
                 FROM products p WHERE p.is_active = true`;
    const params = [];

    if (department_id) {
      query += ` AND p.department_id = $${params.length + 1}`;
      params.push(department_id);
    }

    if (category_id) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category_id);
    }

    query += ` ORDER BY p.name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gross profit report
router.get('/gross-profit', checkPermission('view_profit'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT DATE(created_at) as date,
                        SUM(total) as net_sales,
                        SUM(total_cost) as cogs,
                        SUM(gross_profit) as gross_profit,
                        ROUND((SUM(gross_profit) / SUM(total) * 100)::numeric, 2) as profit_margin
                 FROM sales WHERE status != 'voided'`;
    const params = [];

    if (start_date) {
      query += ` AND DATE(created_at) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(created_at) <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` GROUP BY DATE(created_at) ORDER BY date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Low stock report
router.get('/low-stock', checkPermission('view_reports'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.* FROM products p
       WHERE p.current_stock <= p.reorder_level AND p.is_active = true
       ORDER BY p.current_stock ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
