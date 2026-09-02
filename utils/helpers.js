const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const generateId = () => uuidv4();

const generateReceiptNumber = (type = 'SALE') => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${type}-${dateStr}-${random}`;
};

const generatePassword = (length = 12) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const formatCurrency = (amount, currency = '₦') => {
  return `${currency}${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const calculateGrossProfit = (sellingPrice, costPrice) => {
  return sellingPrice - costPrice;
};

const calculateGrossProfitMargin = (sellingPrice, costPrice) => {
  if (costPrice === 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2);
};

const calculateTax = (amount, taxRate) => {
  return (amount * taxRate) / 100;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  generateId,
  generateReceiptNumber,
  generatePassword,
  hashPassword,
  formatCurrency,
  formatDate,
  calculateGrossProfit,
  calculateGrossProfitMargin,
  calculateTax,
  sleep
};
