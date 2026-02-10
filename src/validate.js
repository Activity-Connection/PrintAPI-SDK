// Lower 48 US states + DC (excludes AK, HI)
const VALID_STATES = new Set([
  'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD',
  'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]);

const VALID_PRODUCT_TYPES = new Set(['Newsletter', 'Calendar', 'Flyer', 'LFP']);

function isEmail(v) {
  return typeof v === 'string' && v.includes('@') && v.includes('.');
}

function isHttpsUrl(v) {
  return typeof v === 'string' && v.startsWith('https://');
}

function isState(v) {
  return typeof v === 'string' && VALID_STATES.has(v.toUpperCase());
}

function requireString(val, label) {
  if (typeof val !== 'string' || val.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

/**
 * Validate an array of order items.
 * @param {Array} items - The order items to validate
 * @param {Object} [options]
 * @param {boolean} [options.requireFiles=false] - Whether files are required on each item
 */
export function validateOrderItems(items, { requireFiles = false } = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('orderItems must be a non-empty array');
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prefix = `orderItems[${i}]`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`${prefix} must be an object`);
    }

    requireString(item.sku, `${prefix}.sku`);

    if (!VALID_PRODUCT_TYPES.has(item.productType)) {
      throw new Error(`${prefix}.productType must be one of: Newsletter, Calendar, Flyer, LFP`);
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
      throw new Error(`${prefix}.quantity must be an integer between 1 and 1000`);
    }

    if (item.sku === 'LFP_CS') {
      if (typeof item.longEdge !== 'number' || item.longEdge <= 0) {
        throw new Error(`${prefix}.longEdge is required for LFP_CS and must be a positive number`);
      }
      if (typeof item.shortEdge !== 'number' || item.shortEdge <= 0) {
        throw new Error(`${prefix}.shortEdge is required for LFP_CS and must be a positive number`);
      }
    }

    if (requireFiles) {
      if (!Array.isArray(item.files) || item.files.length === 0) {
        throw new Error(`${prefix}.files must be a non-empty array of HTTPS URLs`);
      }
      for (let j = 0; j < item.files.length; j++) {
        if (!isHttpsUrl(item.files[j])) {
          throw new Error(`${prefix}.files[${j}] must be an HTTPS URL`);
        }
      }
    }
  }
}

/**
 * Validate a customer object (shipping or billing).
 * @param {Object} customer - The customer object
 * @param {string} label - "shippingCustomer" or "billingCustomer"
 */
export function validateCustomer(customer, label) {
  if (!customer || typeof customer !== 'object') {
    throw new Error(`${label} is required`);
  }

  requireString(customer.firstName, `${label}.firstName`);
  requireString(customer.lastName, `${label}.lastName`);
  requireString(customer.address1, `${label}.address1`);
  requireString(customer.city, `${label}.city`);
  requireString(customer.zip, `${label}.zip`);
  requireString(customer.phone, `${label}.phone`);

  if (typeof customer.phone !== 'string' || customer.phone.length <= 9) {
    throw new Error(`${label}.phone must be a string with more than 9 characters`);
  }

  if (!isEmail(customer.email)) {
    throw new Error(`${label}.email must be a valid email address`);
  }

  if (!isState(customer.state)) {
    throw new Error(`${label}.state must be a 2-letter US state code (lower 48 + DC)`);
  }

  if (label === 'shippingCustomer') {
    if (!Array.isArray(customer.shipmentTrackingEmail) ||
        customer.shipmentTrackingEmail.length < 1 ||
        customer.shipmentTrackingEmail.length > 3) {
      throw new Error(`${label}.shipmentTrackingEmail must be an array of 1-3 email addresses`);
    }
    for (let i = 0; i < customer.shipmentTrackingEmail.length; i++) {
      if (!isEmail(customer.shipmentTrackingEmail[i])) {
        throw new Error(`${label}.shipmentTrackingEmail[${i}] must be a valid email address`);
      }
    }
  }

  if (label === 'billingCustomer' && customer.billingInvoiceEmails != null) {
    if (!Array.isArray(customer.billingInvoiceEmails)) {
      throw new Error(`${label}.billingInvoiceEmails must be an array of email addresses`);
    }
    for (let i = 0; i < customer.billingInvoiceEmails.length; i++) {
      if (!isEmail(customer.billingInvoiceEmails[i])) {
        throw new Error(`${label}.billingInvoiceEmails[${i}] must be a valid email address`);
      }
    }
  }
}

/**
 * Validate the full createOrder payload.
 * @param {Object} orderData - The order data
 */
export function validateCreateOrderData(orderData) {
  if (!orderData || typeof orderData !== 'object') {
    throw new Error('orderData must be an object');
  }

  requireString(orderData.orderDatetime, 'orderDatetime');
  requireString(orderData.sourceReferenceOrderNumber, 'sourceReferenceOrderNumber');

  validateOrderItems(orderData.orderItems, { requireFiles: true });
  validateCustomer(orderData.shippingCustomer, 'shippingCustomer');

  if (orderData.sourceSystemBilling === false) {
    if (!orderData.billingCustomer) {
      throw new Error('billingCustomer is required when sourceSystemBilling is false');
    }
    validateCustomer(orderData.billingCustomer, 'billingCustomer');
  }
}

/**
 * Validate an order number string.
 * @param {string} orderNumber
 */
export function validateOrderNumber(orderNumber) {
  requireString(orderNumber, 'orderNumber');
}
