# Examples

## Daily Catalog Sync

Poll the catalog once a day to keep your product listing up to date.

```js
import { PrintApiClient } from '@activityconnection/printapi-sdk';

const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID
});

const { catalog } = await client.getCatalog();

// Group products by type
const byType = {};
for (const product of catalog) {
  byType[product.productType] ??= [];
  byType[product.productType].push(product);
}
// byType = { Newsletter: [...], Calendar: [...], Flyer: [...], LFP: [...] }
```

## Shopping Cart Pricing

Show live pricing as customers add items to their cart.

```js
async function updateCartPricing(cartItems) {
  // Convert your cart format to API format
  const orderItems = cartItems.map(item => ({
    sku: item.sku,
    productType: item.productType,
    quantity: item.quantity,
    ...(item.staple && { staple: true }),
    ...(item.flat && { flat: true }),
    ...(item.sku === 'LFP_CS' && {
      longEdge: item.longEdge,
      shortEdge: item.shortEdge
    })
  }));

  const pricing = await client.checkPricing(orderItems);
  return {
    items: pricing.items,
    shipping: pricing.fees,
    total: pricing.grandTotal
  };
}
```

## Full Order Flow

Complete flow from pricing check to order creation.

```js
// 1. Price check first
const pricing = await client.checkPricing([
  { sku: 'TAB_2D_8P', productType: 'Newsletter', quantity: 200, staple: true }
]);

console.log(`Quote: $${pricing.grandTotal}`);

// 2. Customer confirms, submit the order
const order = await client.createOrder({
  orderDatetime: new Date().toISOString(),
  sourceReferenceOrderNumber: `ORD-${Date.now()}`,
  orderItems: [
    {
      sku: 'TAB_2D_8P',
      productType: 'Newsletter',
      quantity: 200,
      staple: true,
      files: ['https://your-server.com/files/newsletter-march.pdf']
    }
  ],
  shippingCustomer: {
    firstName: 'Jane', lastName: 'Smith',
    email: 'jane@community.org', phone: '555-0100',
    address1: '789 Elm St', city: 'Salem', state: 'OR', zip: '97301',
    shipmentTrackingEmail: ['jane@community.org', 'office@community.org']
  }
});

console.log(`Order ${order.acOrderNumber} created — $${order.grandTotal}`);
console.log(`Ships by: ${order.expectedShipDateEstimate}`);
```

## Order with Activity Connection Billing

When Activity Connection handles billing for you.

```js
const order = await client.createOrder({
  orderDatetime: new Date().toISOString(),
  sourceReferenceOrderNumber: 'BILL-001',
  sourceSystemBilling: false,
  orderItems: [{
    sku: 'LTR_2D', productType: 'Flyer', quantity: 500,
    files: ['https://your-server.com/flyer.pdf']
  }],
  shippingCustomer: {
    firstName: 'John', lastName: 'Doe',
    email: 'john@example.com', phone: '555-1234',
    address1: '123 Main St', city: 'Portland', state: 'OR', zip: '97201',
    shipmentTrackingEmail: ['john@example.com']
  },
  billingCustomer: {
    firstName: 'Accounting', lastName: 'Dept',
    email: 'ap@example.com', phone: '555-9999',
    address1: '100 Corporate Way', city: 'Portland', state: 'OR', zip: '97201',
    billingInvoiceEmails: ['ap@example.com']
  }
});
```

## Custom-Size Wall Calendar

Ordering a large format print with custom dimensions.

```js
const pricing = await client.checkPricing([
  { sku: 'LFP_CS', productType: 'LFP', quantity: 10, longEdge: 48, shortEdge: 36 }
]);

const order = await client.createOrder({
  orderDatetime: new Date().toISOString(),
  sourceReferenceOrderNumber: 'LFP-CUSTOM-001',
  orderItems: [{
    sku: 'LFP_CS', productType: 'LFP', quantity: 10,
    longEdge: 48, shortEdge: 36,
    files: ['https://your-server.com/wall-calendar-48x36.pdf']
  }],
  shippingCustomer: {
    firstName: 'Mike', lastName: 'Johnson',
    email: 'mike@example.com', phone: '555-4321',
    address1: '456 Pine Rd', city: 'Eugene', state: 'OR', zip: '97401',
    shipmentTrackingEmail: ['mike@example.com']
  }
});
```

## Order Status Polling

Check order status periodically until it ships.

```js
async function waitForShipment(orderNumber, intervalMs = 3600000) {
  while (true) {
    const status = await client.getOrderStatus(orderNumber);

    console.log(`[${new Date().toISOString()}] ${orderNumber}: ${status.orderStatus}`);

    if (status.orderStatus === 'Shipped') {
      return status;
    }
    if (status.orderStatus === 'Cancelled') {
      throw new Error(`Order ${orderNumber} was cancelled`);
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }
}

const shipped = await waitForShipment('ATEST-0000001');
console.log(`Tracking: ${shipped.trackingNumbers.join(', ')}`);
```

## Error Handling Patterns

```js
import { PrintApiClient, PrintApiError } from '@activityconnection/printapi-sdk';

try {
  const order = await client.createOrder(orderData);
} catch (err) {
  if (!(err instanceof PrintApiError)) throw err;

  switch (err.status) {
    case 400:
      console.error('Validation error:', err.message);
      break;
    case 409:
      console.error('Duplicate order. Existing:', err.details.existingOrderNumber);
      break;
    case 429:
      console.error('Rate limited. Retry later.');
      break;
    default:
      console.error(`API error ${err.status}: ${err.message}`);
  }
}
```
