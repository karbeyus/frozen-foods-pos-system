const API_URL = '/api';
let currentUser = null;
let cart = [];
let products = [];
let customers = [];
let vendors = [];
let employees = [];

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initializeApp();
});

// Check authentication
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user'));
  currentUser = user;
  document.getElementById('userName').textContent = `${user.first_name} ${user.last_name}`;
}

// Initialize app
function initializeApp() {
  loadDashboard();
  loadProducts();
  loadCustomers();
  loadVendors();
  loadEmployees();
  showPage('dashboard');
}

// Navigate pages
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  const page = document.getElementById(pageName);
  if (page) {
    page.classList.add('active');

    // Load page-specific data
    if (pageName === 'sales-history') loadSalesHistory();
    if (pageName === 'inventory') loadInventory();
    if (pageName === 'receiving') loadReceivingVouchers();
    if (pageName === 'reports') loadReports();
    if (pageName === 'expenses') loadExpenses();
  }
}

// Modal management
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

// Close modal on background click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });
});

// Toggle sidebar on mobile
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// Logout
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  }
}

// API Helper
async function apiCall(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('token');
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'API Error');
    }

    return result;
  } catch (error) {
    console.error('API Error:', error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const data = await apiCall('/dashboard');
    document.getElementById('todaySales').textContent = formatCurrency(data.sales?.total_sales || 0);
    document.getElementById('todayTransactions').textContent = data.sales?.transactions || 0;
    document.getElementById('todayProfit').textContent = formatCurrency(data.sales?.total_profit || 0);
    document.getElementById('lowStock').textContent = data.low_stock || 0;
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

// Products
async function loadProducts() {
  try {
    products = await apiCall('/products');
    renderProductsGrid();
    renderProductsTable();
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

function renderProductsGrid() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => addToCart(product);
    card.innerHTML = `
      <div class="product-card-name">${product.name}</div>
      <div class="product-card-price">${formatCurrency(product.selling_price)}</div>
      <div style="font-size: 11px; color: #666;">${product.sku}</div>
    `;
    grid.appendChild(card);
  });
}

function renderProductsTable() {
  const tbody = document.querySelector('#productsTable tbody');
  tbody.innerHTML = '';
  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.sku}</td>
      <td>${product.name}</td>
      <td>${formatCurrency(product.cost_price)}</td>
      <td>${formatCurrency(product.selling_price)}</td>
      <td>${product.current_stock} ${product.base_unit}</td>
      <td>
        <button class="btn btn-small" onclick="editProduct('${product.id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function saveProduct(event) {
  event.preventDefault();

  const data = {
    sku: document.getElementById('productSku').value,
    name: document.getElementById('productName').value,
    barcode: document.getElementById('productBarcode').value,
    department_id: document.getElementById('productDept').value,
    category_id: document.getElementById('productCategory').value,
    cost_price: parseFloat(document.getElementById('productCost').value),
    selling_price: parseFloat(document.getElementById('productPrice').value),
    base_unit: 'Piece',
    opening_stock: parseFloat(document.getElementById('productStock').value),
    reorder_level: 10
  };

  try {
    await apiCall('/products', 'POST', data);
    alert('Product saved successfully!');
    closeModal('productModal');
    loadProducts();
  } catch (error) {
    console.error('Failed to save product:', error);
  }
}

// Customers
async function loadCustomers() {
  try {
    customers = await apiCall('/customers');
    renderCustomersTable();
  } catch (error) {
    console.error('Failed to load customers:', error);
  }
}

function renderCustomersTable() {
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';
  customers.forEach(customer => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${customer.name}</td>
      <td>${customer.phone}</td>
      <td>${customer.email}</td>
      <td>
        <button class="btn btn-small" onclick="editCustomer('${customer.id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function saveCustomer(event) {
  event.preventDefault();

  const data = {
    name: document.getElementById('customerName').value,
    phone: document.getElementById('customerPhone').value,
    email: document.getElementById('customerEmail').value,
    address: document.getElementById('customerAddress').value
  };

  try {
    await apiCall('/customers', 'POST', data);
    alert('Customer saved successfully!');
    closeModal('customerModal');
    loadCustomers();
  } catch (error) {
    console.error('Failed to save customer:', error);
  }
}

// Vendors
async function loadVendors() {
  try {
    vendors = await apiCall('/vendors');
    renderVendorsTable();
    renderVendorSelect();
  } catch (error) {
    console.error('Failed to load vendors:', error);
  }
}

function renderVendorsTable() {
  const tbody = document.querySelector('#vendorsTable tbody');
  tbody.innerHTML = '';
  vendors.forEach(vendor => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${vendor.name}</td>
      <td>${vendor.phone}</td>
      <td>${vendor.email}</td>
      <td>
        <button class="btn btn-small" onclick="editVendor('${vendor.id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderVendorSelect() {
  const select = document.getElementById('receivingVendor');
  select.innerHTML = '<option value="">Select Vendor</option>';
  vendors.forEach(vendor => {
    const option = document.createElement('option');
    option.value = vendor.id;
    option.textContent = vendor.name;
    select.appendChild(option);
  });
}

async function saveVendor(event) {
  event.preventDefault();

  const data = {
    name: document.getElementById('vendorName').value,
    phone: document.getElementById('vendorPhone').value,
    email: document.getElementById('vendorEmail').value,
    address: document.getElementById('vendorAddress').value
  };

  try {
    await apiCall('/vendors', 'POST', data);
    alert('Vendor saved successfully!');
    closeModal('vendorModal');
    loadVendors();
  } catch (error) {
    console.error('Failed to save vendor:', error);
  }
}

// Employees
async function loadEmployees() {
  try {
    employees = await apiCall('/employees');
    renderEmployeesTable();
  } catch (error) {
    console.error('Failed to load employees:', error);
  }
}

function renderEmployeesTable() {
  const tbody = document.querySelector('#employeesTable tbody');
  tbody.innerHTML = '';
  employees.forEach(employee => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${employee.first_name} ${employee.last_name}</td>
      <td>${employee.email}</td>
      <td>${employee.role_name}</td>
      <td>${employee.is_active ? 'Active' : 'Inactive'}</td>
      <td>
        <button class="btn btn-small" onclick="editEmployee('${employee.id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function saveEmployee(event) {
  event.preventDefault();

  const data = {
    first_name: document.getElementById('employeeFirst').value,
    last_name: document.getElementById('employeeLast').value,
    email: document.getElementById('employeeEmail').value,
    phone: document.getElementById('employeePhone').value,
    role_id: document.getElementById('employeeRole').value,
    is_active: true
  };

  try {
    await apiCall('/employees', 'POST', data);
    alert('Employee saved successfully!');
    closeModal('employeeModal');
    loadEmployees();
  } catch (error) {
    console.error('Failed to save employee:', error);
  }
}

// Sales/POS
function addToCart(product) {
  const existingItem = cart.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity: 1,
      unit: product.base_unit,
      discount: 0
    });
  }

  renderCart();
}

function renderCart() {
  const cartItems = document.getElementById('cartItems');
  cartItems.innerHTML = '';

  let subtotal = 0;
  let totalDiscount = 0;

  cart.forEach((item, index) => {
    const itemTotal = (item.selling_price * item.quantity) - item.discount;
    subtotal += itemTotal;
    totalDiscount += item.discount;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-name">${item.name}</div>
      <div class="cart-item-qty">${item.quantity}</div>
      <div class="cart-item-price">${formatCurrency(itemTotal)}</div>
      <button class="cart-item-remove" onclick="removeFromCart(${index})">Remove</button>
    `;
    cartItems.appendChild(div);
  });

  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('discountAmount').textContent = formatCurrency(totalDiscount);
  document.getElementById('total').textContent = formatCurrency(subtotal - totalDiscount);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  if (confirm('Clear cart?')) {
    cart = [];
    renderCart();
  }
}

async function completeSale() {
  if (cart.length === 0) {
    alert('Cart is empty');
    return;
  }

  const customer = customers.find(c => c.is_walk_in);

  const saleData = {
    customer_id: customer?.id,
    payment_method: 'cash',
    items: cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      unit: item.unit,
      selling_price: item.selling_price,
      cost_price: item.cost_price,
      discount: item.discount
    })),
    discount_amount: 0,
    paid_amount: parseFloat(document.getElementById('total').textContent.replace(/[^0-9.]/g, ''))
  };

  try {
    const result = await apiCall('/sales', 'POST', saleData);
    alert(`Sale completed! Receipt: ${result.receipt_number}`);
    cart = [];
    renderCart();
    loadDashboard();
  } catch (error) {
    console.error('Failed to complete sale:', error);
  }
}

function holdReceipt() {
  if (cart.length === 0) {
    alert('Cart is empty');
    return;
  }
  alert('Hold receipt feature coming soon');
}

// Sales History
async function loadSalesHistory() {
  try {
    const sales = await apiCall('/sales');
    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = '';
    sales.forEach(sale => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${sale.receipt_number}</td>
        <td>${new Date(sale.created_at).toLocaleDateString()}</td>
        <td>Customer</td>
        <td>${formatCurrency(sale.total)}</td>
        <td>
          <button class="btn btn-small" onclick="viewReceipt('${sale.id}')">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Failed to load sales history:', error);
  }
}

// Inventory
async function loadInventory() {
  try {
    const inventory = await apiCall('/inventory');
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';
    inventory.forEach(product => {
      const status = product.current_stock === 0 ? 'Out of Stock' :
                     product.current_stock <= product.reorder_level ? 'Low Stock' : 'In Stock';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.name}</td>
        <td>${product.sku}</td>
        <td>${product.current_stock}</td>
        <td>${product.reorder_level}</td>
        <td>${status}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Failed to load inventory:', error);
  }
}

function filterInventory(status) {
  document.querySelectorAll('.inventory-filters .filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  loadInventory();
}

// Receiving
async function loadReceivingVouchers() {
  try {
    const receiving = await apiCall('/receiving');
    const tbody = document.querySelector('#receivingTable tbody');
    tbody.innerHTML = '';
    receiving.forEach(voucher => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${voucher.voucher_number}</td>
        <td>${voucher.vendor_name}</td>
        <td>${new Date(voucher.created_at).toLocaleDateString()}</td>
        <td>${formatCurrency(voucher.grand_total)}</td>
        <td>${voucher.status}</td>
        <td>
          <button class="btn btn-small" onclick="postReceiving('${voucher.id}')">Post</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Failed to load receiving vouchers:', error);
  }
}

async function saveReceiving(event) {
  event.preventDefault();
  alert('Receiving creation coming soon');
}

function addReceivingItem() {
  const container = document.getElementById('receivingItems');
  const itemCount = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'form-group';
  div.innerHTML = `
    <input type="text" placeholder="Product" class="receiving-product-${itemCount}">
    <input type="number" placeholder="Quantity" class="receiving-qty-${itemCount}" step="0.01">
    <input type="number" placeholder="Cost" class="receiving-cost-${itemCount}" step="0.01">
  `;
  container.appendChild(div);
}

async function postReceiving(id) {
  try {
    await apiCall(`/receiving/${id}/post`, 'POST');
    alert('Receiving voucher posted!');
    loadReceivingVouchers();
  } catch (error) {
    console.error('Failed to post receiving:', error);
  }
}

// Reports
async function loadReports() {
  const reportType = document.getElementById('reportType').value || 'daily-sales';
  await generateReport();
}

async function generateReport() {
  const reportType = document.getElementById('reportType').value;
  try {
    const data = await apiCall(`/reports/${reportType}`);
    const content = document.getElementById('reportContent');
    content.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
}

// Expenses
async function loadExpenses() {
  try {
    const expenses = await apiCall('/expenses');
    const tbody = document.querySelector('#expensesTable tbody');
    tbody.innerHTML = '';
    expenses.forEach(expense => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${expense.category}</td>
        <td>${formatCurrency(expense.amount)}</td>
        <td>${new Date(expense.created_at).toLocaleDateString()}</td>
        <td>${expense.description}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Failed to load expenses:', error);
  }
}

async function saveExpense(event) {
  event.preventDefault();

  const data = {
    category: document.getElementById('expenseCategory').value,
    amount: parseFloat(document.getElementById('expenseAmount').value),
    description: document.getElementById('expenseDesc').value,
    payment_method: 'cash'
  };

  try {
    await apiCall('/expenses', 'POST', data);
    alert('Expense saved successfully!');
    closeModal('expenseModal');
    loadExpenses();
  } catch (error) {
    console.error('Failed to save expense:', error);
  }
}

// Settings
async function saveSettings() {
  const businessName = document.getElementById('businessName').value;
  const currency = document.getElementById('currency').value;
  const currencySymbol = document.getElementById('currencySymbol').value;

  try {
    await apiCall('/settings/business_name', 'PUT', { value: businessName });
    await apiCall('/settings/currency', 'PUT', { value: currency });
    await apiCall('/settings/currency_symbol', 'PUT', { value: currencySymbol });
    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Utility functions
function formatCurrency(amount) {
  return '₦' + parseFloat(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-NG');
}

// Placeholder functions for edit operations
function editProduct(id) { alert('Edit product coming soon'); }
function editCustomer(id) { alert('Edit customer coming soon'); }
function editVendor(id) { alert('Edit vendor coming soon'); }
function editEmployee(id) { alert('Edit employee coming soon'); }
function viewReceipt(id) { alert('View receipt coming soon'); }
