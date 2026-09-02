const Joi = require('joi');

const validateEmail = (email) => {
  const schema = Joi.string().email().required();
  return schema.validate(email);
};

const validatePassword = (password) => {
  const schema = Joi.string()
    .min(8)
    .pattern(/[A-Z]/) // At least one uppercase
    .pattern(/[0-9]/) // At least one number
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase letter and number'
    });
  return schema.validate(password);
};

const validatePhone = (phone) => {
  const schema = Joi.string().min(10).max(15).required();
  return schema.validate(phone);
};

const validateProductInput = (data) => {
  const schema = Joi.object({
    sku: Joi.string().required(),
    barcode: Joi.string().allow(''),
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    department_id: Joi.string().uuid().required(),
    category_id: Joi.string().uuid().required(),
    brand: Joi.string().allow(''),
    supplier_id: Joi.string().uuid().allow(null),
    cost_price: Joi.number().positive().required(),
    selling_price: Joi.number().positive().required(),
    base_unit: Joi.string().required(),
    reorder_level: Joi.number().min(0).required(),
    opening_stock: Joi.number().min(0).required(),
    tax_rate: Joi.number().min(0).max(100).default(0)
  });
  return schema.validate(data);
};

const validateSaleInput = (data) => {
  const schema = Joi.object({
    customer_id: Joi.string().uuid().required(),
    payment_method: Joi.string().required(),
    discount_amount: Joi.number().min(0).default(0),
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.string().uuid().required(),
        quantity: Joi.number().positive().required(),
        unit: Joi.string().required(),
        selling_price: Joi.number().positive().required(),
        discount: Joi.number().min(0).default(0)
      })
    ).required()
  });
  return schema.validate(data);
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateProductInput,
  validateSaleInput
};
