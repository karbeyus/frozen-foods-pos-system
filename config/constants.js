const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  INVENTORY_STAFF: 'inventory_staff'
};

const PERMISSIONS = {
  // Sales
  VIEW_SALES: 'view_sales',
  ADD_SALE: 'add_sale',
  EDIT_SALE: 'edit_sale',
  DELETE_SALE: 'delete_sale',
  VOID_SALE: 'void_sale',
  PRINT_RECEIPT: 'print_receipt',

  // Inventory
  VIEW_INVENTORY: 'view_inventory',
  EDIT_INVENTORY: 'edit_inventory',
  STOCK_COUNT: 'stock_count',
  ADJUST_STOCK: 'adjust_stock',

  // Products
  VIEW_PRODUCTS: 'view_products',
  ADD_PRODUCT: 'add_product',
  EDIT_PRODUCT: 'edit_product',
  DELETE_PRODUCT: 'delete_product',
  VIEW_COST_PRICE: 'view_cost_price',

  // Customers
  VIEW_CUSTOMERS: 'view_customers',
  ADD_CUSTOMER: 'add_customer',
  EDIT_CUSTOMER: 'edit_customer',
  DELETE_CUSTOMER: 'delete_customer',

  // Vendors
  VIEW_VENDORS: 'view_vendors',
  ADD_VENDOR: 'add_vendor',
  EDIT_VENDOR: 'edit_vendor',
  DELETE_VENDOR: 'delete_vendor',

  // Receiving
  VIEW_RECEIVING: 'view_receiving',
  ADD_RECEIVING: 'add_receiving',
  EDIT_RECEIVING: 'edit_receiving',
  POST_RECEIVING: 'post_receiving',

  // Refunds
  PROCESS_REFUND: 'process_refund',
  VIEW_REFUNDS: 'view_refunds',

  // Discounts
  GIVE_DISCOUNT: 'give_discount',
  VIEW_PROFIT: 'view_profit',

  // Reports
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',

  // Employees
  MANAGE_EMPLOYEES: 'manage_employees',
  VIEW_EMPLOYEE_ACTIVITY: 'view_employee_activity',

  // Settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_AUDIT_LOGS: 'view_audit_logs',

  // Expenses
  VIEW_EXPENSES: 'view_expenses',
  ADD_EXPENSE: 'add_expense',
  EDIT_EXPENSE: 'edit_expense',

  // Cash Drawer
  MANAGE_CASH_DRAWER: 'manage_cash_drawer',
  CLOSE_DAY: 'close_day'
};

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.ADD_SALE,
    PERMISSIONS.EDIT_SALE,
    PERMISSIONS.VOID_SALE,
    PERMISSIONS.PRINT_RECEIPT,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.EDIT_INVENTORY,
    PERMISSIONS.STOCK_COUNT,
    PERMISSIONS.ADJUST_STOCK,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.ADD_PRODUCT,
    PERMISSIONS.EDIT_PRODUCT,
    PERMISSIONS.VIEW_COST_PRICE,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.ADD_CUSTOMER,
    PERMISSIONS.EDIT_CUSTOMER,
    PERMISSIONS.VIEW_VENDORS,
    PERMISSIONS.ADD_VENDOR,
    PERMISSIONS.EDIT_VENDOR,
    PERMISSIONS.VIEW_RECEIVING,
    PERMISSIONS.ADD_RECEIVING,
    PERMISSIONS.EDIT_RECEIVING,
    PERMISSIONS.POST_RECEIVING,
    PERMISSIONS.PROCESS_REFUND,
    PERMISSIONS.VIEW_REFUNDS,
    PERMISSIONS.GIVE_DISCOUNT,
    PERMISSIONS.VIEW_PROFIT,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_EMPLOYEE_ACTIVITY,
    PERMISSIONS.VIEW_EXPENSES,
    PERMISSIONS.ADD_EXPENSE,
    PERMISSIONS.EDIT_EXPENSE,
    PERMISSIONS.MANAGE_CASH_DRAWER,
    PERMISSIONS.CLOSE_DAY,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.CASHIER]: [
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.ADD_SALE,
    PERMISSIONS.EDIT_SALE,
    PERMISSIONS.PRINT_RECEIPT,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.ADD_CUSTOMER,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.GIVE_DISCOUNT,
    PERMISSIONS.MANAGE_CASH_DRAWER,
    PERMISSIONS.PROCESS_REFUND,
    PERMISSIONS.VIEW_REFUNDS
  ],
  [ROLES.INVENTORY_STAFF]: [
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.EDIT_INVENTORY,
    PERMISSIONS.STOCK_COUNT,
    PERMISSIONS.ADJUST_STOCK,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_VENDORS,
    PERMISSIONS.VIEW_RECEIVING,
    PERMISSIONS.ADD_RECEIVING,
    PERMISSIONS.EDIT_RECEIVING,
    PERMISSIONS.POST_RECEIVING,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS
  ]
};

const TRANSACTION_TYPES = {
  SALE: 'sale',
  PURCHASE: 'purchase',
  ADJUSTMENT: 'adjustment',
  RETURN: 'return',
  DAMAGE: 'damage',
  STOCK_COUNT: 'stock_count'
};

const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  MOBILE_PAYMENT: 'mobile_payment',
  MIXED: 'mixed'
};

const UNITS = [
  'Carton',
  'Kg',
  'Half Kg',
  'Gram',
  'Piece',
  'Roll',
  'Pack',
  'Bag',
  'Bottle',
  'Sachet',
  'Liter',
  'Half Liter',
  'Meter',
  'Box',
  'Dozen'
];

const ACTION_TYPES = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  SALE_CREATED: 'sale_created',
  SALE_VOIDED: 'sale_voided',
  REFUND_PROCESSED: 'refund_processed',
  DISCOUNT_APPLIED: 'discount_applied',
  PRODUCT_CREATED: 'product_created',
  PRODUCT_EDITED: 'product_edited',
  PRICE_CHANGED: 'price_changed',
  STOCK_ADJUSTED: 'stock_adjusted',
  RECEIVING_POSTED: 'receiving_posted',
  VENDOR_EDITED: 'vendor_edited',
  CUSTOMER_EDITED: 'customer_edited',
  EMPLOYEE_CREATED: 'employee_created',
  EMPLOYEE_DELETED: 'employee_deleted',
  SETTINGS_CHANGED: 'settings_changed',
  DAY_CLOSED: 'day_closed'
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  UNITS,
  ACTION_TYPES
};
