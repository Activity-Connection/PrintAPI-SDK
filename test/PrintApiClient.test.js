import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PrintApiClient } from '../src/PrintApiClient.js';
import { PrintApiError } from '../src/PrintApiError.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock fetch Response object. */
function mockResponse(body, { status = 200, ok = true } = {}) {
  return {
    ok,
    status,
    json: async () => body
  };
}

/**
 * Returns a realistic order payload using data pulled from the API docs
 * (llms-full.md example payloads) and SDK examples.
 */
function realOrderPayload(overrides = {}) {
  return {
    orderDatetime: '2024-01-15T10:30:00Z',
    sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
    orderItems: [
      {
        sku: 'TAB_2D_16P',
        productType: 'Newsletter',
        staple: true,
        quantity: 100,
        files: ['https://example.com/test-newsletter.pdf'],
        notes: 'Test order - Newsletter'
      }
    ],
    shippingCustomer: {
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corp',
      phone: '555-123-4567',
      email: 'john.doe@acme.com',
      shipmentTrackingEmail: ['john.doe@acme.com', 'logistics@acme.com'],
      address1: '123 Main St',
      address2: 'Suite 100',
      city: 'Anytown',
      state: 'CA',
      zip: '12345'
    },
    sourceSystemBilling: true,
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// PrintApiError
// ---------------------------------------------------------------------------

describe('PrintApiError', () => {
  it('sets name, status, errorType, message, and details', () => {
    const err = new PrintApiError(409, 'Conflict', 'Duplicate order', {
      existingOrderNumber: 'ATEST-0000001'
    });
    assert.equal(err.name, 'PrintApiError');
    assert.equal(err.status, 409);
    assert.equal(err.errorType, 'Conflict');
    assert.equal(err.message, 'Duplicate order');
    assert.deepEqual(err.details, { existingOrderNumber: 'ATEST-0000001' });
  });

  it('extends Error and is catchable as Error', () => {
    const err = new PrintApiError(500, 'Internal Server Error', 'kaboom');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof PrintApiError);
  });

  it('defaults details to empty object', () => {
    const err = new PrintApiError(401, 'Unauthorized', 'API key is required');
    assert.deepEqual(err.details, {});
  });

  it('produces a useful stack trace', () => {
    const err = new PrintApiError(400, 'Bad Request', 'Missing required fields');
    assert.ok(err.stack);
    assert.ok(err.stack.includes('PrintApiError'));
  });
});

// ---------------------------------------------------------------------------
// PrintApiClient
// ---------------------------------------------------------------------------

describe('PrintApiClient', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  describe('constructor', () => {
    it('throws if apiKey is missing', () => {
      assert.throws(
        () => new PrintApiClient({ accountId: '123' }),
        { message: 'apiKey is required' }
      );
    });

    it('throws if accountId is missing', () => {
      assert.throws(
        () => new PrintApiClient({ apiKey: 'key' }),
        { message: 'accountId is required' }
      );
    });

    it('throws if called with no arguments', () => {
      assert.throws(
        () => new PrintApiClient(),
        { message: 'apiKey is required' }
      );
    });

    it('throws if called with empty object', () => {
      assert.throws(
        () => new PrintApiClient({}),
        { message: 'apiKey is required' }
      );
    });

    it('throws if apiKey is empty string (falsy)', () => {
      assert.throws(
        () => new PrintApiClient({ apiKey: '', accountId: '123' }),
        { message: 'apiKey is required' }
      );
    });

    it('throws if accountId is empty string (falsy)', () => {
      assert.throws(
        () => new PrintApiClient({ apiKey: 'key', accountId: '' }),
        { message: 'accountId is required' }
      );
    });

    it('throws if apiKey is not a string', () => {
      assert.throws(
        () => new PrintApiClient({ apiKey: 12345, accountId: '123' }),
        { message: 'apiKey is required' }
      );
    });

    it('throws if accountId is not a string', () => {
      assert.throws(
        () => new PrintApiClient({ apiKey: 'key', accountId: 9999 }),
        { message: 'accountId is required' }
      );
    });

    it('creates client with valid config', () => {
      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      assert.ok(client instanceof PrintApiClient);
    });
  });

  // -----------------------------------------------------------------------
  // getCatalog
  // -----------------------------------------------------------------------

  describe('getCatalog', () => {
    it('sends GET /catalog with X-API-Key header and no body', async () => {
      const catalogData = {
        catalog: [
          {
            id: 7,
            productName: '12-Page Newsletter',
            shortDescription: '12 page, booklet style, double-sided 11x17, folded.',
            sku: 'TAB_2D_12P',
            sizingType: 'TAB',
            productType: 'Newsletter',
            duplex: true,
            staple: true,
            flat: false,
            customSize: false,
            updatedAt: '2025-11-16T22:09:10.000Z'
          }
        ]
      };

      globalThis.fetch = mock.fn(async (url, options) => {
        assert.equal(url.toString(), 'https://printapi.net/api/v1/catalog');
        assert.equal(options.method, 'GET');
        assert.equal(options.headers['X-API-Key'], 'test-key');
        // GET should not have Content-Type or body
        assert.equal(options.headers['Content-Type'], undefined);
        assert.equal(options.body, undefined);
        return mockResponse(catalogData);
      });

      const client = new PrintApiClient({ apiKey: 'test-key', accountId: '123' });
      const result = await client.getCatalog();
      assert.deepEqual(result, catalogData);
      assert.equal(globalThis.fetch.mock.calls.length, 1);
    });

    it('does not send accountId for catalog requests', async () => {
      globalThis.fetch = mock.fn(async (url) => {
        const parsed = new URL(url);
        // accountId should NOT appear as a query param on catalog
        assert.equal(parsed.searchParams.get('accountId'), null);
        return mockResponse({ catalog: [] });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await client.getCatalog();
    });
  });

  // -----------------------------------------------------------------------
  // checkPricing
  // -----------------------------------------------------------------------

  describe('checkPricing', () => {
    it('sends POST /pricing with accountId and orderItems', async () => {
      const items = [
        { sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100, staple: true }
      ];
      const pricingData = {
        fees: [{ name: 'Shipping Fee - Standard', amount: 15 }],
        totalFees: 15,
        items: [
          { id: 1, quantity: 100, unitCost: 3.5, subtotal: 350, sku: 'TAB_2D_16P', stapleFee: 10 }
        ],
        totalItemCost: 350,
        grandTotal: 365
      };

      globalThis.fetch = mock.fn(async (url, options) => {
        assert.equal(url.toString(), 'https://printapi.net/api/v1/pricing');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['Content-Type'], 'application/json');
        const body = JSON.parse(options.body);
        assert.equal(body.accountId, '123');
        assert.deepEqual(body.orderItems, items);
        return mockResponse(pricingData);
      });

      const client = new PrintApiClient({ apiKey: 'test-key', accountId: '123' });
      const result = await client.checkPricing(items);
      assert.deepEqual(result, pricingData);
    });

    it('sends multi-item pricing with real API doc data', async () => {
      // Full 6-item payload from the llms-full.md pricing example
      const items = [
        { sku: 'LFP_CS', productType: 'LFP', longEdge: 36, shortEdge: 24, quantity: 1 },
        { sku: 'LFP_CS', productType: 'LFP', longEdge: 120, shortEdge: 36, quantity: 1 },
        { sku: 'LFP_36x24', productType: 'LFP', quantity: 1 },
        { sku: 'TAB_2D_16P', productType: 'Newsletter', staple: true, quantity: 120 },
        { sku: 'TAB_1D', productType: 'Calendar', quantity: 200 },
        { sku: 'TAB_2D', productType: 'Calendar', flat: true, quantity: 150 }
      ];
      // Real response from the API docs
      const pricingResponse = {
        fees: [
          { name: 'Shipping Fee - Standard', amount: 15 },
          { name: 'Shipping Fee - LFP', amount: 10 },
          { name: 'Do not fold the prints, ship them flat', amount: 10 }
        ],
        totalFees: 35,
        items: [
          { id: 1, quantity: 1, unitCost: 25.5, subtotal: 25.5, sku: 'LFP_CS' },
          { id: 2, quantity: 1, unitCost: 135, subtotal: 135, sku: 'LFP_CS' },
          { id: 3, quantity: 1, unitCost: 25.5, subtotal: 25.5, sku: 'LFP_36x24' },
          { id: 4, quantity: 120, unitCost: 3.5, subtotal: 432, sku: 'TAB_2D_16P', stapleFee: 12 },
          { id: 5, quantity: 200, unitCost: 0.69, subtotal: 138, sku: 'TAB_1D' },
          { id: 6, quantity: 150, unitCost: 1.1, subtotal: 165, sku: 'TAB_2D' }
        ],
        totalItemCost: 921,
        grandTotal: 956
      };

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.orderItems.length, 6);
        // Verify LFP_CS items include dimensions
        assert.equal(body.orderItems[0].longEdge, 36);
        assert.equal(body.orderItems[0].shortEdge, 24);
        assert.equal(body.orderItems[1].longEdge, 120);
        assert.equal(body.orderItems[1].shortEdge, 36);
        return mockResponse(pricingResponse);
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '1234' });
      const result = await client.checkPricing(items);

      // Verify structure of real response
      assert.equal(result.fees.length, 3);
      assert.equal(result.items.length, 6);
      assert.equal(result.grandTotal, 956);
      assert.equal(result.totalFees, 35);
      assert.equal(result.totalItemCost, 921);
      // Verify stapleFee appears only on the newsletter item
      assert.equal(result.items[3].stapleFee, 12);
      assert.equal(result.items[0].stapleFee, undefined);
    });
  });

  // -----------------------------------------------------------------------
  // createOrder
  // -----------------------------------------------------------------------

  describe('createOrder', () => {
    it('sends POST /order with accountId injected into body', async () => {
      const orderData = realOrderPayload();
      const orderResponse = {
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
        fees: [{ name: 'Shipping Fee - Standard', amount: 15.50 }],
        totalFees: 15.50,
        items: [
          { product: 'Newsletter', id: 1, quantity: 100, unitCost: 0.25, subtotal: 25.00, sku: 'TAB_2D_16P', stapleFee: 5.00 }
        ],
        totalItemCost: 25.00,
        grandTotal: 40.50,
        expectedShipDateEstimate: '2024-01-20',
        testOrder: true
      };

      globalThis.fetch = mock.fn(async (url, options) => {
        assert.equal(url.toString(), 'https://printapi.net/api/v1/order');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['Content-Type'], 'application/json');
        const body = JSON.parse(options.body);
        assert.equal(body.accountId, '123');
        assert.equal(body.sourceReferenceOrderNumber, 'YOURORDERNUMBER1234');
        assert.equal(body.orderItems.length, 1);
        assert.equal(body.shippingCustomer.firstName, 'John');
        assert.equal(body.shippingCustomer.state, 'CA');
        assert.deepEqual(body.shippingCustomer.shipmentTrackingEmail, [
          'john.doe@acme.com', 'logistics@acme.com'
        ]);
        return mockResponse(orderResponse, { status: 201 });
      });

      const client = new PrintApiClient({ apiKey: 'test-key', accountId: '123' });
      const result = await client.createOrder(orderData);
      assert.equal(result.acOrderNumber, 'ATEST-0000001');
      assert.equal(result.grandTotal, 40.50);
      assert.equal(result.expectedShipDateEstimate, '2024-01-20');
    });

    it('constructor accountId always wins over accountId in orderData', async () => {
      // The SDK uses { ...orderData, accountId: this.#accountId }
      // So the constructor's accountId always takes precedence.
      const orderData = realOrderPayload();
      orderData.accountId = 'wrong-id';

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        // Constructor accountId overwrites any user-provided accountId
        assert.equal(body.accountId, 'correct-id');
        return mockResponse({ acOrderNumber: 'ATEST-0000002', grandTotal: 10 });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: 'correct-id' });
      await client.createOrder(orderData);
    });

    it('sends testOrder flag when provided', async () => {
      const orderData = realOrderPayload({ testOrder: true });

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.testOrder, true);
        return mockResponse({
          acOrderNumber: 'ATEST-0000001',
          sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
          grandTotal: 40.50,
          testOrder: true
        });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '12345' });
      const result = await client.createOrder(orderData);
      assert.equal(result.testOrder, true);
    });

    it('auto-sets testOrder when testMode is enabled', async () => {
      const orderData = realOrderPayload();

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.testOrder, true);
        return mockResponse({ acOrderNumber: 'ATEST-0000001', grandTotal: 10, testOrder: true });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123', testMode: true });
      const result = await client.createOrder(orderData);
      assert.equal(result.testOrder, true);
    });

    it('does not set testOrder when testMode is false (default)', async () => {
      const orderData = realOrderPayload();

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.testOrder, undefined);
        return mockResponse({ acOrderNumber: 'ATEST-0000001', grandTotal: 10 });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await client.createOrder(orderData);
    });

    it('testMode overrides explicit testOrder: false in orderData', async () => {
      const orderData = realOrderPayload({ testOrder: false });

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.testOrder, true);
        return mockResponse({ acOrderNumber: 'ATEST-0000001', grandTotal: 10, testOrder: true });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123', testMode: true });
      await client.createOrder(orderData);
    });

    it('sends billingCustomer when sourceSystemBilling is false', async () => {
      // Data from the "Order with Activity Connection Billing" example in llms-full.md
      const orderData = realOrderPayload({
        sourceReferenceOrderNumber: 'TEST-2025-002',
        sourceSystemBilling: false,
        billingCustomer: {
          firstName: 'Jane',
          lastName: 'Smith',
          company: 'Accounting Department',
          phone: '+1-555-987-6543',
          email: 'accounts@testcompany.com',
          billingInvoiceEmails: ['accounts@testcompany.com'],
          address1: '456 Finance Blvd',
          address2: 'Accounting',
          city: 'Portland',
          state: 'OR',
          zip: '97202'
        }
      });

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.sourceSystemBilling, false);
        assert.equal(body.billingCustomer.firstName, 'Jane');
        assert.equal(body.billingCustomer.email, 'accounts@testcompany.com');
        assert.deepEqual(body.billingCustomer.billingInvoiceEmails, ['accounts@testcompany.com']);
        return mockResponse({ acOrderNumber: 'ATEST-0000003', grandTotal: 100 });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '1234' });
      const result = await client.createOrder(orderData);
      assert.equal(result.acOrderNumber, 'ATEST-0000003');
    });

    it('sends multi-item order with mixed product types and LFP_CS dimensions', async () => {
      // From the "Order with Activity Connection Billing" example in llms-full.md
      const orderData = realOrderPayload({
        orderItems: [
          { sku: 'TAB_2D_8P', productType: 'Newsletter', staple: true, quantity: 100, files: ['https://example.com/test-newsletter.pdf'] },
          { sku: 'TAB_1D', productType: 'Calendar', flat: true, quantity: 200, files: ['https://example.com/test-calendar.pdf'] },
          { sku: 'LFP_36x24', productType: 'LFP', quantity: 25, files: ['https://example.com/test-poster.pdf'] },
          { sku: 'LFP_CS', productType: 'LFP', longEdge: 36, shortEdge: 24, quantity: 25, files: ['https://example.com/test-poster-custom.pdf'] }
        ]
      });

      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.orderItems.length, 4);
        // LFP_CS item has dimensions
        const lfpCsItem = body.orderItems.find(i => i.sku === 'LFP_CS');
        assert.equal(lfpCsItem.longEdge, 36);
        assert.equal(lfpCsItem.shortEdge, 24);
        // Calendar item has flat
        const calItem = body.orderItems.find(i => i.productType === 'Calendar');
        assert.equal(calItem.flat, true);
        return mockResponse({ acOrderNumber: 'ATEST-0000004', grandTotal: 500 });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '1234' });
      const result = await client.createOrder(orderData);
      assert.equal(result.acOrderNumber, 'ATEST-0000004');
    });
  });

  // -----------------------------------------------------------------------
  // getOrderStatus
  // -----------------------------------------------------------------------

  describe('getOrderStatus', () => {
    it('sends GET /orderstatus with accountId and orderNumber as query params', async () => {
      const statusData = {
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
        orderStatus: 'Pending',
        orderDate: '2024-01-15T10:30:00.000Z',
        expectedShipDateEstimate: '2024-01-20'
      };

      globalThis.fetch = mock.fn(async (url, options) => {
        const parsed = new URL(url);
        assert.equal(parsed.pathname, '/api/v1/orderstatus');
        assert.equal(parsed.searchParams.get('accountId'), '123');
        assert.equal(parsed.searchParams.get('orderNumber'), 'ATEST-0000001');
        assert.equal(options.method, 'GET');
        assert.equal(options.body, undefined);
        return mockResponse(statusData);
      });

      const client = new PrintApiClient({ apiKey: 'test-key', accountId: '123' });
      const result = await client.getOrderStatus('ATEST-0000001');
      assert.equal(result.orderStatus, 'Pending');
      assert.equal(result.expectedShipDateEstimate, '2024-01-20');
    });

    it('returns shipped order with tracking info', async () => {
      // From the "Shipped Order Response" example in llms-full.md
      const statusData = {
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
        orderStatus: 'Shipped',
        orderDate: '2024-01-15T10:30:00.000Z',
        shippedDate: '2024-01-20T14:00:00.000Z',
        shipmentProvider: 'USPS',
        trackingNumbers: ['9400111899223197428490']
      };

      globalThis.fetch = mock.fn(async () => mockResponse(statusData));

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      const result = await client.getOrderStatus('ATEST-0000001');

      assert.equal(result.orderStatus, 'Shipped');
      assert.equal(result.shippedDate, '2024-01-20T14:00:00.000Z');
      assert.equal(result.shipmentProvider, 'USPS');
      assert.deepEqual(result.trackingNumbers, ['9400111899223197428490']);
      // Shipped orders should NOT have expectedShipDateEstimate
      assert.equal(result.expectedShipDateEstimate, undefined);
    });

    it('returns shipped order with multiple tracking numbers', async () => {
      const statusData = {
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
        orderStatus: 'Shipped',
        orderDate: '2024-01-15T10:30:00.000Z',
        shippedDate: '2024-01-20T14:00:00.000Z',
        shipmentProvider: 'USPS',
        trackingNumbers: ['9400111899223197428490', '94001118992233497428490']
      };

      globalThis.fetch = mock.fn(async () => mockResponse(statusData));

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      const result = await client.getOrderStatus('ATEST-0000001');

      assert.equal(result.trackingNumbers.length, 2);
    });

    it('returns shipped order with multiple carriers', async () => {
      // From the "Multiple Carriers" example in llms-full.md
      const statusData = {
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
        orderStatus: 'Shipped',
        orderDate: '2024-01-15T10:30:00.000Z',
        shippedDate: '2024-01-20T14:00:00.000Z',
        shipmentProvider: 'UPS, USPS',
        trackingNumbers: ['1Z999AA10123456784', '9400111899223197428490']
      };

      globalThis.fetch = mock.fn(async () => mockResponse(statusData));

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      const result = await client.getOrderStatus('ATEST-0000001');

      assert.equal(result.shipmentProvider, 'UPS, USPS');
      assert.equal(result.trackingNumbers.length, 2);
      assert.equal(result.trackingNumbers[0], '1Z999AA10123456784');
      assert.equal(result.trackingNumbers[1], '9400111899223197428490');
    });

    it('returns test order with testOrder flag', async () => {
      // From the "Test Order Response" example in llms-full.md
      const statusData = {
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'TEST-ORDER-001',
        orderStatus: 'Received',
        orderDate: '2024-01-15T10:30:00.000Z',
        expectedShipDateEstimate: '2024-01-20',
        testOrder: true
      };

      globalThis.fetch = mock.fn(async () => mockResponse(statusData));

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      const result = await client.getOrderStatus('ATEST-0000001');

      assert.equal(result.testOrder, true);
      assert.equal(result.orderStatus, 'Received');
    });

    it('accepts source reference order number as lookup key', async () => {
      globalThis.fetch = mock.fn(async (url) => {
        const parsed = new URL(url);
        assert.equal(parsed.searchParams.get('orderNumber'), 'YOURORDERNUMBER1234');
        return mockResponse({
          acOrderNumber: 'ATEST-0000001',
          sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
          orderStatus: 'Production',
          orderDate: '2024-01-15T10:30:00.000Z',
          expectedShipDateEstimate: '2024-01-22'
        });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      const result = await client.getOrderStatus('YOURORDERNUMBER1234');
      assert.equal(result.orderStatus, 'Production');
    });
  });

  // -----------------------------------------------------------------------
  // cancelOrder
  // -----------------------------------------------------------------------

  describe('cancelOrder', () => {
    it('sends POST /cancelorder with accountId and orderNumber in body', async () => {
      // From the cancel order success response in llms-full.md
      const cancelData = {
        message: 'Order cancelled successfully',
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'YOURORDERNUMBER1234',
        orderStatus: 'Cancelled'
      };

      globalThis.fetch = mock.fn(async (url, options) => {
        assert.equal(url.toString(), 'https://printapi.net/api/v1/cancelorder');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['Content-Type'], 'application/json');
        const body = JSON.parse(options.body);
        assert.equal(body.accountId, '123');
        assert.equal(body.orderNumber, 'ATEST-0000001');
        return mockResponse(cancelData);
      });

      const client = new PrintApiClient({ apiKey: 'test-key', accountId: '123' });
      const result = await client.cancelOrder('ATEST-0000001');
      assert.equal(result.message, 'Order cancelled successfully');
      assert.equal(result.orderStatus, 'Cancelled');
      assert.equal(result.acOrderNumber, 'ATEST-0000001');
      assert.equal(result.sourceReferenceOrderNumber, 'YOURORDERNUMBER1234');
    });

    it('returns testOrder flag when cancelling a test order', async () => {
      // From the test order cancel response in llms-full.md
      const cancelData = {
        message: 'Order cancelled successfully',
        acOrderNumber: 'ATEST-0000001',
        sourceReferenceOrderNumber: 'TEST-ORDER-001',
        orderStatus: 'Cancelled',
        testOrder: true
      };

      globalThis.fetch = mock.fn(async () => mockResponse(cancelData));

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      const result = await client.cancelOrder('ATEST-0000001');
      assert.equal(result.testOrder, true);
    });

    it('accepts source reference order number to cancel', async () => {
      globalThis.fetch = mock.fn(async (url, options) => {
        const body = JSON.parse(options.body);
        assert.equal(body.orderNumber, 'MY-REF-12345');
        return mockResponse({
          message: 'Order cancelled successfully',
          acOrderNumber: 'ATEST-0000099',
          sourceReferenceOrderNumber: 'MY-REF-12345',
          orderStatus: 'Cancelled'
        });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      const result = await client.cancelOrder('MY-REF-12345');
      assert.equal(result.sourceReferenceOrderNumber, 'MY-REF-12345');
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('throws PrintApiError on 401 Unauthorized', async () => {
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          { error: 'Unauthorized', message: 'API key is required' },
          { status: 401, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'bad-key', accountId: '123' });
      await assert.rejects(
        () => client.getCatalog(),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 401);
          assert.equal(err.errorType, 'Unauthorized');
          assert.equal(err.message, 'API key is required');
          return true;
        }
      );
    });

    it('throws PrintApiError on 400 Bad Request', async () => {
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          { error: 'Bad Request', message: 'accountId and a non-empty orderItems array are required' },
          { status: 400, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 1 }]),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 400);
          assert.equal(err.errorType, 'Bad Request');
          assert.equal(err.message, 'accountId and a non-empty orderItems array are required');
          return true;
        }
      );
    });

    it('throws PrintApiError on 403 Forbidden (account mismatch)', async () => {
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          { error: 'Forbidden', message: 'Account ID does not match authenticated client' },
          { status: 403, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: 'wrong-account' });
      await assert.rejects(
        () => client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 1 }]),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 403);
          assert.equal(err.errorType, 'Forbidden');
          return true;
        }
      );
    });

    it('throws PrintApiError on 403 Forbidden (test order permission denied)', async () => {
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          { error: 'Forbidden', message: 'To submit test orders you must have Test Orders enabled in your print api account.' },
          { status: 403, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.createOrder(realOrderPayload({ testOrder: true })),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 403);
          assert.match(err.message, /Test Orders enabled/);
          return true;
        }
      );
    });

    it('throws PrintApiError on 404 Not Found', async () => {
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          { error: 'Not Found', message: 'Order not found' },
          { status: 404, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.getOrderStatus('NONEXISTENT-ORDER'),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 404);
          assert.equal(err.errorType, 'Not Found');
          assert.equal(err.message, 'Order not found');
          return true;
        }
      );
    });

    it('throws PrintApiError on 409 Conflict with existingOrderNumber detail', async () => {
      // From the 409 response in llms-full.md
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          {
            error: 'Conflict',
            message: 'Duplicate Customer Order Number Not Allowed - Invalid Field: sourceReferenceOrderNumber',
            existingOrderNumber: 'ATEST-0000001'
          },
          { status: 409, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.createOrder(realOrderPayload()),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 409);
          assert.equal(err.errorType, 'Conflict');
          assert.equal(err.details.existingOrderNumber, 'ATEST-0000001');
          return true;
        }
      );
    });

    it('throws PrintApiError on 400 cancel outside pending window', async () => {
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          {
            error: 'Bad Request',
            message: 'This order cannot be cancelled from the API outside the pending window, please contact Developer Feedback if you need further assistance.'
          },
          { status: 400, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.cancelOrder('ATEST-0000001'),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 400);
          assert.match(err.message, /cannot be cancelled/);
          return true;
        }
      );
    });

    it('throws PrintApiError on 500 Internal Server Error', async () => {
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          { error: 'Internal Server Error', message: 'Error processing order submission' },
          { status: 500, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.createOrder(realOrderPayload()),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 500);
          assert.equal(err.errorType, 'Internal Server Error');
          return true;
        }
      );
    });

    it('throws PrintApiError on network failure with status 0', async () => {
      globalThis.fetch = mock.fn(async () => { throw new Error('ECONNREFUSED'); });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.getCatalog(),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 0);
          assert.equal(err.errorType, 'NetworkError');
          assert.match(err.message, /ECONNREFUSED/);
          assert.match(err.message, /^Request failed: /);
          return true;
        }
      );
    });

    it('throws PrintApiError on DNS resolution failure', async () => {
      globalThis.fetch = mock.fn(async () => { throw new Error('getaddrinfo ENOTFOUND printapi.net'); });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.getCatalog(),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 0);
          assert.equal(err.errorType, 'NetworkError');
          assert.match(err.message, /ENOTFOUND/);
          return true;
        }
      );
    });

    it('throws PrintApiError with ParseError on non-JSON response body', async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => { throw new SyntaxError('Unexpected token < in JSON'); }
      }));

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.getCatalog(),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 502);
          assert.equal(err.errorType, 'ParseError');
          assert.match(err.message, /Failed to parse response/);
          assert.match(err.message, /502/);
          return true;
        }
      );
    });

    it('uses fallback errorType and message when API error response lacks them', async () => {
      // Edge case: API returns JSON but without the standard error/message fields
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          { code: 'WEIRD_ERROR', detail: 'something unexpected' },
          { status: 422, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.getCatalog(),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 422);
          // Fallback: errorType should be "HTTP 422" since no `error` field
          assert.equal(err.errorType, 'HTTP 422');
          // Fallback: message should be "Unknown error" since no `message` field
          assert.equal(err.message, 'Unknown error');
          // The rest fields (code, detail) should be in details
          assert.equal(err.details.code, 'WEIRD_ERROR');
          assert.equal(err.details.detail, 'something unexpected');
          return true;
        }
      );
    });

    it('throws PrintApiError with Validation Error containing item detail', async () => {
      // From llms-full.md: validation error includes the item that failed
      globalThis.fetch = mock.fn(async () =>
        mockResponse(
          {
            error: 'Validation Error',
            message: 'Invalid product configuration',
            item: { sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100 }
          },
          { status: 400, ok: false }
        )
      );

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await assert.rejects(
        () => client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100 }]),
        (err) => {
          assert.ok(err instanceof PrintApiError);
          assert.equal(err.status, 400);
          assert.equal(err.errorType, 'Validation Error');
          assert.equal(err.message, 'Invalid product configuration');
          // The `item` field should be captured in details
          assert.deepEqual(err.details.item, { sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100 });
          return true;
        }
      );
    });
  });

  // -----------------------------------------------------------------------
  // #request internals (tested via public API)
  // -----------------------------------------------------------------------

  describe('request behavior', () => {
    it('skips null query param values', async () => {
      // getOrderStatus passes accountId and orderNumber as query params.
      // The #request method should skip null/undefined values in the query object.
      // We can't test this directly, but we can verify the URL doesn't contain "null".
      globalThis.fetch = mock.fn(async (url) => {
        const urlStr = url.toString();
        assert.ok(!urlStr.includes('null'), 'URL should not contain literal "null"');
        assert.ok(!urlStr.includes('undefined'), 'URL should not contain literal "undefined"');
        return mockResponse({
          acOrderNumber: 'ATEST-0000001',
          orderStatus: 'Pending'
        });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await client.getOrderStatus('ATEST-0000001');
    });

    it('does not set Content-Type header for GET requests', async () => {
      globalThis.fetch = mock.fn(async (url, options) => {
        assert.equal(options.headers['Content-Type'], undefined);
        return mockResponse({ catalog: [] });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await client.getCatalog();
    });

    it('sets Content-Type to application/json for POST requests with body', async () => {
      globalThis.fetch = mock.fn(async (url, options) => {
        assert.equal(options.headers['Content-Type'], 'application/json');
        return mockResponse({ grandTotal: 10, fees: [], items: [], totalFees: 0, totalItemCost: 10 });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await client.checkPricing([{ sku: 'LTR_1D', productType: 'Flyer', quantity: 1 }]);
    });

    it('serializes body as JSON string', async () => {
      globalThis.fetch = mock.fn(async (url, options) => {
        assert.equal(typeof options.body, 'string');
        const parsed = JSON.parse(options.body);
        assert.equal(typeof parsed, 'object');
        return mockResponse({ grandTotal: 10, fees: [], items: [], totalFees: 0, totalItemCost: 10 });
      });

      const client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
      await client.checkPricing([{ sku: 'LTR_2D', productType: 'Flyer', quantity: 50 }]);
    });
  });

  // -----------------------------------------------------------------------
  // Custom baseUrl
  // -----------------------------------------------------------------------

  describe('custom baseUrl', () => {
    it('uses custom baseUrl for all requests', async () => {
      globalThis.fetch = mock.fn(async (url) => {
        assert.equal(url.toString(), 'https://staging.printapi.net/api/v1/catalog');
        return mockResponse({ catalog: [] });
      });

      const client = new PrintApiClient({
        apiKey: 'key',
        accountId: '123',
        baseUrl: 'https://staging.printapi.net/api/v1'
      });
      await client.getCatalog();
    });

    it('strips single trailing slash from baseUrl', async () => {
      globalThis.fetch = mock.fn(async (url) => {
        assert.equal(url.toString(), 'https://printapi.net/api/v1/catalog');
        return mockResponse({ catalog: [] });
      });

      const client = new PrintApiClient({
        apiKey: 'key',
        accountId: '123',
        baseUrl: 'https://printapi.net/api/v1/'
      });
      await client.getCatalog();
    });

    it('strips multiple trailing slashes from baseUrl', async () => {
      globalThis.fetch = mock.fn(async (url) => {
        assert.equal(url.toString(), 'https://printapi.net/api/v1/catalog');
        return mockResponse({ catalog: [] });
      });

      const client = new PrintApiClient({
        apiKey: 'key',
        accountId: '123',
        baseUrl: 'https://printapi.net/api/v1///'
      });
      await client.getCatalog();
    });
  });

  // -----------------------------------------------------------------------
  // Client-side validation
  // -----------------------------------------------------------------------

  describe('client-side validation', () => {
    let client;

    beforeEach(() => {
      // fetch should never be called — validation fails first
      globalThis.fetch = mock.fn(async () => {
        throw new Error('fetch should not be called during validation tests');
      });
      client = new PrintApiClient({ apiKey: 'key', accountId: '123' });
    });

    // -- Order items -------------------------------------------------------

    describe('order items', () => {
      it('rejects missing orderItems', async () => {
        await assert.rejects(
          () => client.checkPricing(),
          { message: 'orderItems must be a non-empty array' }
        );
      });

      it('rejects empty orderItems array', async () => {
        await assert.rejects(
          () => client.checkPricing([]),
          { message: 'orderItems must be a non-empty array' }
        );
      });

      it('rejects item with missing sku', async () => {
        await assert.rejects(
          () => client.checkPricing([{ productType: 'Newsletter', quantity: 1 }]),
          { message: 'orderItems[0].sku must be a non-empty string' }
        );
      });

      it('rejects null item in array', async () => {
        await assert.rejects(
          () => client.checkPricing([null]),
          { message: 'orderItems[0] must be an object' }
        );
      });

      it('rejects item with invalid productType', async () => {
        await assert.rejects(
          () => client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Poster', quantity: 1 }]),
          { message: 'orderItems[0].productType must be one of: Newsletter, Calendar, Flyer, LFP' }
        );
      });

      it('rejects quantity of 0', async () => {
        await assert.rejects(
          () => client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 0 }]),
          { message: 'orderItems[0].quantity must be an integer between 1 and 1000' }
        );
      });

      it('rejects quantity over 1000', async () => {
        await assert.rejects(
          () => client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 1001 }]),
          { message: 'orderItems[0].quantity must be an integer between 1 and 1000' }
        );
      });

      it('rejects non-integer quantity', async () => {
        await assert.rejects(
          () => client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 3.5 }]),
          { message: 'orderItems[0].quantity must be an integer between 1 and 1000' }
        );
      });

      it('rejects LFP_CS without longEdge', async () => {
        await assert.rejects(
          () => client.checkPricing([{ sku: 'LFP_CS', productType: 'LFP', quantity: 1, shortEdge: 24 }]),
          { message: 'orderItems[0].longEdge is required for LFP_CS and must be a positive number' }
        );
      });

      it('rejects LFP_CS without shortEdge', async () => {
        await assert.rejects(
          () => client.checkPricing([{ sku: 'LFP_CS', productType: 'LFP', quantity: 1, longEdge: 36 }]),
          { message: 'orderItems[0].shortEdge is required for LFP_CS and must be a positive number' }
        );
      });

      it('does not require files for checkPricing', async () => {
        globalThis.fetch = mock.fn(async () => mockResponse({ grandTotal: 10, fees: [], items: [], totalFees: 0, totalItemCost: 10 }));
        await client.checkPricing([{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 1 }]);
        assert.equal(globalThis.fetch.mock.calls.length, 1);
      });

      it('requires files for createOrder items', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            orderItems: [{ sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 1 }]
          })),
          { message: 'orderItems[0].files must be a non-empty array of HTTPS URLs' }
        );
      });

      it('rejects non-HTTPS file URL in createOrder', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            orderItems: [{
              sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 1,
              files: ['http://example.com/file.pdf']
            }]
          })),
          { message: 'orderItems[0].files[0] must be an HTTPS URL' }
        );
      });
    });

    // -- Customer ----------------------------------------------------------

    describe('customer', () => {
      it('rejects missing shippingCustomer', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({ shippingCustomer: undefined })),
          { message: 'shippingCustomer is required' }
        );
      });

      it('rejects missing required customer fields', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: { firstName: '', lastName: 'Doe', email: 'a@b.c', phone: '5551234567', address1: '123 Main', city: 'Portland', state: 'OR', zip: '97201', shipmentTrackingEmail: ['a@b.c'] }
          })),
          { message: 'shippingCustomer.firstName must be a non-empty string' }
        );
      });

      it('rejects invalid state code XX', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              state: 'XX'
            }
          })),
          { message: 'shippingCustomer.state must be a 2-letter US state code (lower 48 + DC)' }
        );
      });

      it('rejects Alaska (AK)', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              state: 'AK'
            }
          })),
          { message: 'shippingCustomer.state must be a 2-letter US state code (lower 48 + DC)' }
        );
      });

      it('rejects Hawaii (HI)', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              state: 'HI'
            }
          })),
          { message: 'shippingCustomer.state must be a 2-letter US state code (lower 48 + DC)' }
        );
      });

      it('rejects invalid email (no @ sign)', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              email: 'not-an-email'
            }
          })),
          { message: 'shippingCustomer.email must be a valid email address' }
        );
      });

      it('rejects shipmentTrackingEmail that is not an array', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              shipmentTrackingEmail: 'john@test.com'
            }
          })),
          { message: 'shippingCustomer.shipmentTrackingEmail must be an array of 1-3 email addresses' }
        );
      });

      it('rejects empty shipmentTrackingEmail array', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              shipmentTrackingEmail: []
            }
          })),
          { message: 'shippingCustomer.shipmentTrackingEmail must be an array of 1-3 email addresses' }
        );
      });

      it('rejects shipmentTrackingEmail with more than 3 entries', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              shipmentTrackingEmail: ['a@b.c', 'b@c.d', 'c@d.e', 'd@e.f']
            }
          })),
          { message: 'shippingCustomer.shipmentTrackingEmail must be an array of 1-3 email addresses' }
        );
      });

      it('rejects invalid email in shipmentTrackingEmail array', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            shippingCustomer: {
              ...realOrderPayload().shippingCustomer,
              shipmentTrackingEmail: ['valid@email.com', 'not-an-email']
            }
          })),
          { message: 'shippingCustomer.shipmentTrackingEmail[1] must be a valid email address' }
        );
      });

      it('rejects billingCustomer with phone too short', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            sourceSystemBilling: false,
            billingCustomer: {
              firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com',
              phone: '555-1234', address1: '456 Oak Ave', city: 'Portland',
              state: 'OR', zip: '97202'
            }
          })),
          { message: 'billingCustomer.phone must be a string with more than 9 characters' }
        );
      });

      it('rejects billingInvoiceEmails that is not an array', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            sourceSystemBilling: false,
            billingCustomer: {
              firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com',
              phone: '555-123-4567', address1: '456 Oak Ave', city: 'Portland',
              state: 'OR', zip: '97202',
              billingInvoiceEmails: 'jane@test.com'
            }
          })),
          { message: 'billingCustomer.billingInvoiceEmails must be an array of email addresses' }
        );
      });

      it('rejects invalid email in billingInvoiceEmails array', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            sourceSystemBilling: false,
            billingCustomer: {
              firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com',
              phone: '555-123-4567', address1: '456 Oak Ave', city: 'Portland',
              state: 'OR', zip: '97202',
              billingInvoiceEmails: ['bad-email']
            }
          })),
          { message: 'billingCustomer.billingInvoiceEmails[0] must be a valid email address' }
        );
      });

      it('rejects null orderData', async () => {
        await assert.rejects(
          () => client.createOrder(null),
          { message: 'orderData must be an object' }
        );
      });

      it('requires billingCustomer when sourceSystemBilling is false', async () => {
        await assert.rejects(
          () => client.createOrder(realOrderPayload({
            sourceSystemBilling: false,
            billingCustomer: undefined
          })),
          { message: 'billingCustomer is required when sourceSystemBilling is false' }
        );
      });
    });

    // -- Order number ------------------------------------------------------

    describe('order number', () => {
      it('rejects empty string orderNumber for getOrderStatus', async () => {
        await assert.rejects(
          () => client.getOrderStatus(''),
          { message: 'orderNumber must be a non-empty string' }
        );
      });

      it('rejects non-string orderNumber for cancelOrder', async () => {
        await assert.rejects(
          () => client.cancelOrder(123),
          { message: 'orderNumber must be a non-empty string' }
        );
      });

      it('accepts valid orderNumber for getOrderStatus', async () => {
        globalThis.fetch = mock.fn(async () => mockResponse({
          acOrderNumber: 'ATEST-0000001',
          orderStatus: 'Pending'
        }));
        await client.getOrderStatus('ATEST-0000001');
        assert.equal(globalThis.fetch.mock.calls.length, 1);
      });
    });

    // -- Error type distinction --------------------------------------------

    describe('error type', () => {
      it('throws Error (not PrintApiError) and never calls fetch', async () => {
        await assert.rejects(
          () => client.createOrder({}),
          (err) => {
            assert.ok(err instanceof Error);
            assert.ok(!(err instanceof PrintApiError));
            return true;
          }
        );
        assert.equal(globalThis.fetch.mock.calls.length, 0);
      });
    });
  });
});
