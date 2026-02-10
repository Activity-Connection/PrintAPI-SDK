import { PrintApiError } from './PrintApiError.js';
import { validateOrderItems, validateCreateOrderData, validateOrderNumber } from './validate.js';

/**
 * @typedef {Object} CatalogProduct
 * @property {number} id - Unique catalog entry identifier
 * @property {string} productName - Human-readable product name
 * @property {string} shortDescription - Brief product description
 * @property {string} description - Detailed product description
 * @property {string} sku - Stock Keeping Unit identifier (e.g. "TAB_2D_16P", "LFP_CS")
 * @property {string} sizingType - Size category: "LTR", "TAB", or "LFP"
 * @property {string} productType - Product type: "Newsletter", "Calendar", "Flyer", or "LFP"
 * @property {string} productCategory - Product category classification
 * @property {boolean} duplex - Supports double-sided printing
 * @property {boolean} staple - Supports stapling
 * @property {boolean} flat - Can be delivered flat (unfolded)
 * @property {boolean} customSize - Supports custom sizing
 * @property {number} [longEdgeMinDimension] - Min long edge in inches (when customSize is true)
 * @property {number} [longEdgeMaxDimension] - Max long edge in inches (when customSize is true)
 * @property {number} [shortEdgeMinDimension] - Min short edge in inches (when customSize is true)
 * @property {number} [shortEdgeMaxDimension] - Max short edge in inches (when customSize is true)
 * @property {string} updatedAt - ISO 8601 timestamp of last update
 */

/**
 * @typedef {Object} CatalogResponse
 * @property {CatalogProduct[]} catalog - Array of active products
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} sku - Product SKU from catalog (e.g. "TAB_2D_16P", "LFP_36x24", "LFP_CS")
 * @property {string} productType - "Newsletter", "Calendar", "Flyer", or "LFP"
 * @property {number} quantity - Number of items to print (1-1000)
 * @property {string[]} [files] - Array of HTTPS file URLs (required for createOrder, not needed for checkPricing)
 * @property {number} [longEdge] - Long edge in inches (required when sku is "LFP_CS")
 * @property {number} [shortEdge] - Short edge in inches (required when sku is "LFP_CS")
 * @property {boolean} [staple] - Staple the item (Newsletter with >4 pages only)
 * @property {boolean} [flat] - Ship flat/unfolded (TAB Calendar only)
 * @property {string} [notes] - Production notes for this item
 */

/**
 * @typedef {Object} Fee
 * @property {string} name - Fee name (e.g. "Shipping Fee - Standard", "Shipping Fee - LFP")
 * @property {number} amount - Fee amount in dollars
 */

/**
 * @typedef {Object} PricedItem
 * @property {number} id - Sequential item ID (1-based)
 * @property {number} quantity - Quantity of items
 * @property {number} unitCost - Cost per unit in dollars
 * @property {number} subtotal - Total cost for this item (quantity x unitCost)
 * @property {string} sku - Product SKU
 * @property {string} [product] - Product type (present in order response)
 * @property {number} [stapleFee] - Per-item staple fee if applicable
 */

/**
 * @typedef {Object} PricingResponse
 * @property {Fee[]} fees - Array of order-level fees
 * @property {number} totalFees - Sum of all fees
 * @property {PricedItem[]} items - Array of priced items
 * @property {number} totalItemCost - Sum of all item subtotals (before fees)
 * @property {number} grandTotal - Total cost including all items and fees
 */

/**
 * @typedef {Object} ShippingCustomer
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} email - Email address
 * @property {string} phone - Phone number
 * @property {string} address1 - Primary street address
 * @property {string} city - City
 * @property {string} state - 2-letter state code (lower 48 US states only)
 * @property {string} zip - ZIP code
 * @property {string[]} shipmentTrackingEmail - Tracking notification emails (1-3)
 * @property {string} [company] - Company or community name
 * @property {string} [address2] - Secondary address line
 * @property {string} [address3] - Tertiary address line
 */

/**
 * @typedef {Object} BillingCustomer
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} email - Email address
 * @property {string} phone - Phone number
 * @property {string} address1 - Primary street address
 * @property {string} city - City
 * @property {string} state - 2-letter state code
 * @property {string} zip - ZIP code
 * @property {string[]} [billingInvoiceEmails] - Invoice notification emails
 * @property {string} [company] - Company name
 * @property {string} [address2] - Secondary address line
 * @property {string} [address3] - Tertiary address line
 */

/**
 * @typedef {Object} CreateOrderRequest
 * @property {string} orderDatetime - ISO 8601 datetime of when the order was placed in your system
 * @property {string} sourceReferenceOrderNumber - Your unique order number (must be unique per account)
 * @property {OrderItem[]} orderItems - Array of order items (files required)
 * @property {ShippingCustomer} shippingCustomer - Shipping recipient
 * @property {boolean} [sourceSystemBilling=true] - true = you handle billing; false = Activity Connection handles billing
 * @property {BillingCustomer} [billingCustomer] - Required when sourceSystemBilling is false
 * @property {boolean} [testOrder=false] - Mark as test order (requires account permission)
 */

/**
 * @typedef {Object} OrderResponse
 * @property {string} acOrderNumber - Activity Connection order number (e.g. "ATEST-0000001")
 * @property {string} sourceReferenceOrderNumber - Your original order number
 * @property {Fee[]} fees - Array of order-level fees
 * @property {number} totalFees - Sum of all fees
 * @property {PricedItem[]} items - Array of priced order items
 * @property {number} totalItemCost - Sum of all item subtotals
 * @property {number} grandTotal - Total cost including all items and fees
 * @property {string} expectedShipDateEstimate - Estimated ship date (YYYY-MM-DD)
 * @property {boolean} [testOrder] - Present and true if this is a test order
 */

/**
 * @typedef {Object} OrderStatusResponse
 * @property {string} acOrderNumber - Activity Connection order number
 * @property {string} sourceReferenceOrderNumber - Your original order number
 * @property {string} orderStatus - "Pending", "Received", "Production", "QC", "Shipped", or "Cancelled"
 * @property {string} orderDate - ISO 8601 datetime of order creation
 * @property {string} [expectedShipDateEstimate] - Estimated ship date YYYY-MM-DD (when not shipped)
 * @property {string} [shippedDate] - ISO 8601 datetime of shipment (when shipped)
 * @property {string} [shipmentProvider] - Carrier name e.g. "USPS", "UPS" (when shipped)
 * @property {string[]} [trackingNumbers] - Tracking numbers (when shipped)
 * @property {boolean} [testOrder] - Present and true if this is a test order
 */

/**
 * @typedef {Object} CancelOrderResponse
 * @property {string} message - "Order cancelled successfully"
 * @property {string} acOrderNumber - Activity Connection order number
 * @property {string} sourceReferenceOrderNumber - Your original order number
 * @property {string} orderStatus - "Cancelled"
 * @property {boolean} [testOrder] - Present and true if this is a test order
 */

/**
 * Client for the Activity Connection Commercial Print API.
 *
 * @example
 * import { PrintApiClient } from '@activityconnection/printapi-sdk';
 *
 * const client = new PrintApiClient({
 *   apiKey: 'your-api-key',
 *   accountId: '1234'
 * });
 *
 * const { catalog } = await client.getCatalog();
 */
export class PrintApiClient {
  #apiKey;
  #accountId;
  #baseUrl;
  #testMode;

  /**
   * Create a new PrintAPI client.
   *
   * @param {Object} config
   * @param {string} config.apiKey - Your API key (sent as X-API-Key header)
   * @param {string} config.accountId - Your account ID (auto-injected into requests)
   * @param {string} [config.baseUrl='https://printapi.net/api/v1'] - API base URL
   * @param {boolean} [config.testMode=false] - When true, automatically sets testOrder on every createOrder call
   * @throws {Error} If apiKey or accountId is missing
   */
  constructor({ apiKey, accountId, baseUrl = 'https://printapi.net/api/v1', testMode = false } = {}) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('apiKey is required');
    if (typeof accountId !== 'string' || !accountId.trim()) throw new Error('accountId is required');
    this.#apiKey = apiKey;
    this.#accountId = accountId;
    this.#baseUrl = baseUrl.replace(/\/+$/, '');
    this.#testMode = testMode;
  }

  /**
   * Make an HTTP request to the API.
   * @param {string} method - HTTP method
   * @param {string} path - API path (e.g. "/catalog")
   * @param {Object} [options]
   * @param {Object} [options.query] - Query parameters
   * @param {Object} [options.body] - Request body (JSON)
   * @returns {Promise<Object>} Parsed JSON response
   * @throws {PrintApiError} On non-2xx responses
   */
  async #request(method, path, { query, body } = {}) {
    const url = new URL(this.#baseUrl + path);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value != null) url.searchParams.set(key, value);
      }
    }

    const headers = { 'X-API-Key': this.#apiKey };
    const options = { method, headers };

    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      throw new PrintApiError(0, 'NetworkError', `Request failed: ${err.message}`);
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new PrintApiError(
        response.status,
        'ParseError',
        `Failed to parse response (HTTP ${response.status})`
      );
    }

    if (!response.ok) {
      const { error: errorType, message, ...rest } = data;
      throw new PrintApiError(
        response.status,
        errorType || `HTTP ${response.status}`,
        message || 'Unknown error',
        rest
      );
    }

    return data;
  }

  /**
   * Retrieve the product catalog. Returns all active products available for ordering.
   *
   * Only requires an API key (no accountId needed for this endpoint).
   *
   * @returns {Promise<CatalogResponse>} Object with a `catalog` array of products
   * @throws {PrintApiError} On API error
   *
   * @example
   * const { catalog } = await client.getCatalog();
   * catalog.forEach(product => {
   *   console.log(`${product.productName} (${product.sku})`);
   * });
   */
  async getCatalog() {
    return this.#request('GET', '/catalog');
  }

  /**
   * Check pricing for order items without creating an order.
   * No files or shipping info needed -- just items and quantities.
   *
   * @param {OrderItem[]} orderItems - Items to price
   * @returns {Promise<PricingResponse>} Pricing breakdown with fees, items, and totals
   * @throws {PrintApiError} On API error
   *
   * @example
   * const pricing = await client.checkPricing([
   *   { sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100, staple: true },
   *   { sku: 'LFP_36x24', productType: 'LFP', quantity: 5 }
   * ]);
   * console.log(`Grand total: $${pricing.grandTotal}`);
   */
  async checkPricing(orderItems) {
    validateOrderItems(orderItems);
    return this.#request('POST', '/pricing', {
      body: { accountId: this.#accountId, orderItems }
    });
  }

  /**
   * Submit a print order.
   *
   * The `accountId` is automatically injected from the client configuration.
   * You must provide `orderDatetime`, `sourceReferenceOrderNumber`, `orderItems`
   * (with file URLs), and `shippingCustomer`.
   *
   * @param {CreateOrderRequest} orderData - Order details
   * @returns {Promise<OrderResponse>} Created order with AC order number and pricing
   * @throws {PrintApiError} On API error (409 if duplicate sourceReferenceOrderNumber)
   *
   * @example
   * const order = await client.createOrder({
   *   orderDatetime: '2024-01-15T10:30:00Z',
   *   sourceReferenceOrderNumber: 'MY-ORDER-001',
   *   orderItems: [{
   *     sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100,
   *     staple: true, files: ['https://example.com/newsletter.pdf']
   *   }],
   *   shippingCustomer: {
   *     firstName: 'John', lastName: 'Doe', email: 'john@test.com',
   *     phone: '555-1234', address1: '123 Main St', city: 'Portland',
   *     state: 'OR', zip: '97201', shipmentTrackingEmail: ['john@test.com']
   *   }
   * });
   * console.log(`Order created: ${order.acOrderNumber}`);
   */
  async createOrder(orderData) {
    validateCreateOrderData(orderData);
    return this.#request('POST', '/order', {
      body: {
        ...orderData,
        accountId: this.#accountId,
        ...(this.#testMode && { testOrder: true })
      }
    });
  }

  /**
   * Get the status of an order.
   *
   * Accepts either an Activity Connection order number (e.g. "ATEST-0000001")
   * or your original source reference order number.
   *
   * Shipped orders include `shippedDate`, `shipmentProvider`, and `trackingNumbers`.
   * Non-shipped orders include `expectedShipDateEstimate`.
   *
   * @param {string} orderNumber - AC order number or your reference number
   * @returns {Promise<OrderStatusResponse>} Order status with tracking info (if shipped)
   * @throws {PrintApiError} On API error (404 if order not found)
   *
   * @example
   * const status = await client.getOrderStatus('ATEST-0000001');
   * if (status.orderStatus === 'Shipped') {
   *   console.log(`Tracking: ${status.trackingNumbers.join(', ')}`);
   * } else {
   *   console.log(`Expected ship date: ${status.expectedShipDateEstimate}`);
   * }
   */
  async getOrderStatus(orderNumber) {
    validateOrderNumber(orderNumber);
    return this.#request('GET', '/orderstatus', {
      query: { accountId: this.#accountId, orderNumber }
    });
  }

  /**
   * Cancel a pending order.
   *
   * Orders can only be cancelled while in "Pending" status (~4 business hours
   * after submission). After that, contact Activity Connection for assistance.
   *
   * Accepts either an AC order number or your source reference number.
   *
   * @param {string} orderNumber - AC order number or your reference number
   * @returns {Promise<CancelOrderResponse>} Cancellation confirmation
   * @throws {PrintApiError} On API error (400 if order is not in Pending status)
   *
   * @example
   * const result = await client.cancelOrder('ATEST-0000001');
   * console.log(result.orderStatus); // "Cancelled"
   */
  async cancelOrder(orderNumber) {
    validateOrderNumber(orderNumber);
    return this.#request('POST', '/cancelorder', {
      body: { accountId: this.#accountId, orderNumber }
    });
  }
}
