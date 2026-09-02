const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateId, generatePassword } = require('../utils/helpers');
const { ROLES, ROLE_PERMISSIONS } = require('../config/constants');

async function setupDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Setting up database...');

    // Create extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Create roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create departments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        department_id UUID NOT NULL REFERENCES departments(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(department_id, name)
      )
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role_id UUID NOT NULL REFERENCES roles(id),
        is_active BOOLEAN DEFAULT true,
        must_change_password BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create employees table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        role_id UUID NOT NULL REFERENCES roles(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(50) PRIMARY KEY,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create role_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id),
        permission_id VARCHAR(50) NOT NULL REFERENCES permissions(id),
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    // Create user_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id UUID NOT NULL REFERENCES users(id),
        permission_id VARCHAR(50) NOT NULL REFERENCES permissions(id),
        PRIMARY KEY (user_id, permission_id)
      )
    `);

    // Create customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        notes TEXT,
        credit_limit DECIMAL(10, 2) DEFAULT 0,
        current_balance DECIMAL(10, 2) DEFAULT 0,
        is_walk_in BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create vendors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        contact_person VARCHAR(100),
        bank_info TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        barcode VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        department_id UUID NOT NULL REFERENCES departments(id),
        category_id UUID NOT NULL REFERENCES categories(id),
        brand VARCHAR(100),
        supplier_id UUID REFERENCES vendors(id),
        cost_price DECIMAL(10, 2) NOT NULL,
        selling_price DECIMAL(10, 2) NOT NULL,
        wholesale_price DECIMAL(10, 2),
        minimum_selling_price DECIMAL(10, 2),
        base_unit VARCHAR(50),
        current_stock DECIMAL(12, 2) DEFAULT 0,
        reorder_level DECIMAL(12, 2) DEFAULT 0,
        maximum_stock DECIMAL(12, 2),
        tax_rate DECIMAL(5, 2) DEFAULT 0,
        expiry_date DATE,
        batch_number VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_units table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_units (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id),
        unit_name VARCHAR(50) NOT NULL,
        selling_price DECIMAL(10, 2),
        conversion_factor DECIMAL(12, 4) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id UUID NOT NULL REFERENCES customers(id),
        cashier_id UUID NOT NULL REFERENCES users(id),
        payment_method VARCHAR(50),
        subtotal DECIMAL(10, 2),
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        total DECIMAL(10, 2) NOT NULL,
        paid_amount DECIMAL(10, 2),
        change_amount DECIMAL(10, 2),
        total_cost DECIMAL(10, 2),
        gross_profit DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'completed',
        held_reference VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sale_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID NOT NULL REFERENCES sales(id),
        product_id UUID NOT NULL REFERENCES products(id),
        quantity DECIMAL(12, 2) NOT NULL,
        unit VARCHAR(50),
        selling_price DECIMAL(10, 2) NOT NULL,
        cost_price DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0,
        item_total DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create receiving table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receiving (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        voucher_number VARCHAR(50) UNIQUE NOT NULL,
        vendor_id UUID NOT NULL REFERENCES vendors(id),
        invoice_number VARCHAR(100),
        total_cost DECIMAL(10, 2),
        discount DECIMAL(10, 2) DEFAULT 0,
        other_charges DECIMAL(10, 2) DEFAULT 0,
        grand_total DECIMAL(10, 2),
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        status VARCHAR(50) DEFAULT 'draft',
        received_by UUID REFERENCES users(id),
        posted_at TIMESTAMP,
        posted_by UUID REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create receiving_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receiving_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        receiving_id UUID NOT NULL REFERENCES receiving(id),
        product_id UUID NOT NULL REFERENCES products(id),
        quantity DECIMAL(12, 2) NOT NULL,
        unit VARCHAR(50),
        cost_price DECIMAL(10, 2),
        total DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create inventory_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id),
        transaction_type VARCHAR(50),
        quantity DECIMAL(12, 2),
        unit VARCHAR(50),
        reference_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create stock_count_sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_count_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        status VARCHAR(50) DEFAULT 'draft',
        started_by UUID REFERENCES users(id),
        posted_by UUID REFERENCES users(id),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        posted_at TIMESTAMP
      )
    `);

    // Create stock_count_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_count_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL REFERENCES stock_count_sessions(id),
        product_id UUID NOT NULL REFERENCES products(id),
        system_quantity DECIMAL(12, 2),
        physical_quantity DECIMAL(12, 2),
        difference DECIMAL(12, 2),
        adjustment_value DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category VARCHAR(100),
        amount DECIMAL(10, 2),
        description TEXT,
        payment_method VARCHAR(50),
        receipt_reference VARCHAR(100),
        recorded_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100),
        description TEXT,
        record_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default roles
    const roles = [
      { name: ROLES.SUPER_ADMIN, description: 'Super Administrator' },
      { name: ROLES.ADMIN, description: 'Administrator' },
      { name: ROLES.MANAGER, description: 'Manager' },
      { name: ROLES.CASHIER, description: 'Cashier' },
      { name: ROLES.INVENTORY_STAFF, description: 'Inventory Staff' }
    ];

    for (const role of roles) {
      await client.query(
        `INSERT INTO roles (name, description) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [role.name, role.description]
      );
    }

    // Get role IDs
    const rolesResult = await client.query('SELECT id, name FROM roles');
    const roleMap = {};
    rolesResult.rows.forEach(row => {
      roleMap[row.name] = row.id;
    });

    // Insert permissions
    const permissions = [
      'view_sales', 'add_sale', 'edit_sale', 'delete_sale', 'void_sale', 'print_receipt',
      'view_inventory', 'edit_inventory', 'stock_count', 'adjust_stock',
      'view_products', 'add_product', 'edit_product', 'delete_product', 'view_cost_price',
      'view_customers', 'add_customer', 'edit_customer', 'delete_customer',
      'view_vendors', 'add_vendor', 'edit_vendor', 'delete_vendor',
      'view_receiving', 'add_receiving', 'edit_receiving', 'post_receiving',
      'process_refund', 'view_refunds', 'give_discount', 'view_profit',
      'view_reports', 'export_reports', 'manage_employees', 'view_employee_activity',
      'view_expenses', 'add_expense', 'edit_expense',
      'manage_settings', 'view_audit_logs', 'manage_cash_drawer', 'close_day'
    ];

    for (const perm of permissions) {
      await client.query(
        `INSERT INTO permissions (id, description) VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [perm, perm.replace(/_/g, ' ')]
      );
    }

    // Assign permissions to roles
    for (const [roleName, rolePerms] of Object.entries(ROLE_PERMISSIONS)) {
      const roleId = roleMap[roleName];
      if (roleId) {
        for (const perm of rolePerms) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            [roleId, perm]
          );
        }
      }
    }

    // Insert default departments
    const departments = [
      'Frozen Foods', 'Beverages', 'Groceries', 'Household',
      'Snacks', 'Meat', 'Fish', 'Chicken', 'Cosmetics', 'Dairy'
    ];

    for (const dept of departments) {
      await client.query(
        `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [dept]
      );
    }

    // Get department ID for default category
    const deptResult = await client.query(`SELECT id FROM departments LIMIT 1`);
    const deptId = deptResult.rows[0].id;

    // Insert default categories
    const categories = ['General', 'Premium', 'Economy'];
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (department_id, name) VALUES ($1, $2)
         ON CONFLICT (department_id, name) DO NOTHING`,
        [deptId, cat]
      );
    }

    // Create default admin user
    const adminId = generateId();
    const tempPassword = 'Admin@123456';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await client.query(
      `INSERT INTO users (id, username, email, password_hash, first_name, last_name,
                         role_id, is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
       ON CONFLICT (username) DO NOTHING`,
      [adminId, 'admin', 'admin@frozenfoods.com', hashedPassword, 'Admin', 'User', roleMap[ROLES.SUPER_ADMIN]]
    );

    // Create walk-in customer
    await client.query(
      `INSERT INTO customers (name, phone, email, address, is_walk_in)
       VALUES ('Walk-in Customer', '', '', '', true)
       ON CONFLICT DO NOTHING`
    );

    // Insert default settings
    const defaultSettings = {
      business_name: 'Frozen Foods Supermarket',
      currency: 'NGN',
      currency_symbol: '₦',
      timezone: 'Africa/Lagos',
      low_stock_threshold: '10',
      allow_negative_stock: 'false',
      default_payment_method: 'cash',
      receipt_width: '80',
      tax_rate: '0'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, value]
      );
    }

    await client.query('COMMIT');
    console.log('✓ Database setup complete!');
    console.log(`\n  Default Admin Credentials:`);
    console.log(`  Username: admin`);
    console.log(`  Password: ${tempPassword}`);
    console.log(`\n  ⚠️  Change password after first login!\n`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Database setup failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Setup failed:', err);
      process.exit(1);
    });
}

module.exports = setupDatabase;
