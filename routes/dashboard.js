const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

// Get dashboard data
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's sales
    const salesResult = await pool.query(
      `SELECT COUNT(*) as transactions,
              SUM(total) as total_sales,
              SUM(discount_amount) as total_discount,
              SUM(total_cost) as total_cost,
              SUM(gross_profit) as total_profit
       FROM sales WHERE DATE(created_at) = $1 AND status != 'voided'`,
      [today]
    );

    // Low stock
    const lowStockResult = await pool.query(
      `SELECT COUNT(*) as count FROM products WHERE current_stock <= reorder_level AND is_active = true`
    );

    // Out of stock
    const outStockResult = await pool.query(
      `SELECT COUNT(*) as count FROM products WHERE current_stock = 0 AND is_active = true`
    );

    // Best sellers
    const bestSellersResult = await pool.query(
      `SELECT p.id, p.name, SUM(si.quantity) as quantity FROM products p
       LEFT JOIN sale_items si ON p.id = si.product_id
       LEFT JOIN sales s ON si.sale_id = s.id
       WHERE DATE(s.created_at) = $1 AND s.status != 'voided'
       GROUP BY p.id ORDER BY quantity DESC LIMIT 5`,
      [today]
    );

    // Recent transactions
    const recentResult = await pool.query(
      `SELECT s.id, s.receipt_number, s.total, s.created_at, c.name as customer_name,
              e.first_name, e.last_name
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN employees e ON s.cashier_id = e.id
       WHERE DATE(s.created_at) = $1
       ORDER BY s.created_at DESC LIMIT 10`,
      [today]
    );

    // Inventory valuation
    const valuationResult = await pool.query(
      `SELECT SUM(current_stock * cost_price) as total_cost_value,
              SUM(current_stock * selling_price) as total_sales_value
       FROM products WHERE is_active = true`
    );

    res.json({
      today,
      sales: salesResult.rows[0],
      low_stock: lowStockResult.rows[0].count,
      out_of_stock: outStockResult.rows[0].count,
      best_sellers: bestSellersResult.rows,
      recent_transactions: recentResult.rows,
      inventory_valuation: valuationResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
