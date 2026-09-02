# Frozen Foods & Supermarket POS System

A complete, production-ready Point of Sale (POS) system for frozen foods and supermarkets built with Node.js/Express, PostgreSQL, and vanilla JavaScript.

## Features

- **POS Sales Module**: Fast cashier interface with barcode scanning, product search, cart management
- **Inventory Management**: Real-time stock tracking, low stock alerts, inventory transactions
- **Receiving Module**: Purchase order creation, receiving vouchers, automatic inventory updates
- **Customer Management**: Customer database, purchase history, credit tracking
- **Product Management**: Complete product catalog with SKU, barcode, units, pricing
- **Employee Management**: User roles, permissions, activity tracking
- **Reports**: Daily/Weekly/Monthly sales, employee performance, inventory valuation, profit analysis
- **Audit Logs**: Complete transaction history and user activity tracking
- **Security**: JWT authentication, password hashing, role-based access control

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs

## Installation

### Prerequisites

- Node.js 14+ and npm
- PostgreSQL 12+

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/karbeyus/frozen-foods-pos-system.git
   cd frozen-foods-pos-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure database**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your PostgreSQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=frozen_foods_pos
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

4. **Initialize database**
   ```bash
   npm run setup-db
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open browser to: `http://localhost:5000`
   - Default credentials:
     - Username: `admin`
     - Password: `Admin@123456`
   - **⚠️ Change password after first login!**

## Default Login

- **Username**: admin
- **Password**: Admin@123456
- **First Action Required**: Change password on first login

## Project Structure

```
frozen-foods-pos-system/
├── config/
│   ├── database.js          # Database connection
│   └── constants.js         # Constants and permissions
├── routes/
│   ├── auth.js             # Authentication
│   ├── products.js         # Product management
│   ├── sales.js            # POS and sales
│   ├── customers.js        # Customer management
│   ├── vendors.js          # Vendor management
│   ├── employees.js        # Employee management
│   ├── inventory.js        # Inventory management
│   ├── receiving.js        # Receiving vouchers
│   ├── reports.js          # Reports and analytics
│   ├── expenses.js         # Expense tracking
│   ├── auditLogs.js        # Audit logs
│   ├── settings.js         # System settings
│   └── dashboard.js        # Dashboard data
├── middleware/
│   └── auth.js             # Authentication middleware
├── utils/
│   ├── helpers.js          # Utility functions
│   └── validators.js       # Input validation
├── scripts/
│   └── setupDatabase.js    # Database initialization
├── public/
│   ├── login.html          # Login page
│   ├── change-password.html # Password change
│   └── app/
│       ├── index.html      # Main application
│       ├── styles.css      # Stylesheets
│       └── app.js          # Frontend logic
└── server.js               # Main server file
```

## User Roles and Permissions

### Super Admin
- Full access to all features
- Can manage system settings
- Can manage all users

### Admin/Manager
- Access to POS, Inventory, Customers, Reports
- Can manage employees and settings
- Can view financial information

### Cashier
- Access to POS (sales)
- Can hold receipts
- Limited to assigned transactions

### Inventory Staff
- Access to inventory management
- Can create receiving vouchers
- Can perform stock counts

## Key Features

### 1. Point of Sale (POS)
- Fast product search by name, SKU, or barcode
- Shopping cart with quantity management
- Multiple payment methods (cash, card, transfer)
- Discount support with permission levels
- Hold receipt functionality
- Receipt printing

### 2. Inventory Management
- Real-time stock tracking
- Low stock and out-of-stock alerts
- Inventory transactions log
- Stock count sessions
- Automatic inventory updates on sales

### 3. Receiving Module
- Create receiving vouchers from vendors
- Item-level cost tracking
- Automatic inventory updates
- Hold and post functionality
- Purchase history tracking

### 4. Reports
- Daily, weekly, monthly sales reports
- Sales by product, employee, department
- Inventory valuation
- Gross profit analysis
- Low stock reports
- Employee performance metrics

### 5. Security
- Secure login with JWT tokens
- Password hashing with bcryptjs
- Role-based access control
- Audit logging of all transactions
- Session management

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/verify-token` - Verify JWT token

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `GET /api/products/search/:code` - Search by barcode/SKU

### Sales
- `POST /api/sales` - Create sale
- `GET /api/sales` - List sales
- `POST /api/sales/:id/void` - Void sale
- `POST /api/sales/:id/hold` - Hold receipt

### Inventory
- `GET /api/inventory` - List inventory
- `POST /api/inventory/stock-count/sessions` - Start stock count
- `POST /api/inventory/stock-count/:id/post` - Post stock count

### Receiving
- `POST /api/receiving` - Create receiving voucher
- `GET /api/receiving` - List vouchers
- `POST /api/receiving/:id/post` - Post voucher

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id/purchases` - Customer purchase history

### Reports
- `GET /api/reports/daily-sales` - Daily sales
- `GET /api/reports/sales-by-product` - Product sales
- `GET /api/reports/sales-by-employee` - Employee sales
- `GET /api/reports/inventory-valuation` - Inventory valuation
- `GET /api/reports/gross-profit` - Profit analysis

## Testing Checklist

- [ ] Login works with default credentials
- [ ] Password change required on first login
- [ ] Dashboard displays today's sales
- [ ] Can add new product
- [ ] Can add new customer
- [ ] Can add items to cart
- [ ] Can complete sale
- [ ] Inventory decreases after sale
- [ ] Can create receiving voucher
- [ ] Inventory increases after receiving
- [ ] Can perform stock count
- [ ] Reports generate correctly
- [ ] Audit logs record transactions
- [ ] Employee management works
- [ ] Settings can be saved

## Performance Optimization

- Database connection pooling
- Indexed queries for fast searches
- Pagination for large datasets
- Server-side calculations for accuracy
- Input validation before database operations

## Security Features

- All passwords hashed with bcryptjs
- JWT token expiration
- CORS enabled
- Helmet security headers
- Rate limiting on API
- SQL injection prevention via parameterized queries
- XSS protection

## Database Schema

The system uses PostgreSQL with the following main tables:

- `users` - User accounts
- `employees` - Employee records
- `roles` - User roles
- `permissions` - System permissions
- `products` - Product catalog
- `customers` - Customer data
- `vendors` - Supplier information
- `sales` - Sales transactions
- `sale_items` - Items in each sale
- `receiving` - Purchase orders
- `receiving_items` - Items in purchases
- `inventory_transactions` - Stock movement history
- `stock_count_sessions` - Stock taking records
- `expenses` - Expense tracking
- `audit_logs` - Audit trail
- `settings` - System configuration

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running
- Check DB credentials in `.env`
- Verify database exists

### Login fails
- Check user exists in database
- Verify password is correct
- Check JWT_SECRET is set

### Port already in use
- Change PORT in `.env`
- Or kill process using port 5000

## License

MIT License - See LICENSE file

## Support

For issues or feature requests, please create an issue on GitHub.
