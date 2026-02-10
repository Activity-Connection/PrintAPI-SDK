# PrintAPI SDK

JavaScript SDK for the [Activity Connection Commercial Print API](https://printapi.net/api-guide).

> This SDK is a convenience wrapper for the Activity Connection Print API. Use requires an active Print API agreement.

## Installation

```bash
npm install github:Activity-Connection/PrintAPI-SDK
```

Requires Node.js 18 or later. Zero dependencies.

## Quick Start

```js
import { PrintApiClient } from '@activityconnection/printapi-sdk';

const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_API_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID,
  testMode: process.env.PRINTAPI_TESTMODE === 'true' // optional — auto-sets testOrder on every order
});
```

### Browse the Catalog

```js
const { catalog } = await client.getCatalog();
```

### Check Pricing

```js
const pricing = await client.checkPricing([
  { sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100, staple: true }
]);
console.log(`Total: $${pricing.grandTotal}`);
```

### Create an Order

```js
const order = await client.createOrder({
  orderDatetime: new Date().toISOString(),
  sourceReferenceOrderNumber: 'YOUR-ORDER-001',
  orderItems: [{
    sku: 'TAB_2D_16P',
    productType: 'Newsletter',
    quantity: 100,
    staple: true,
    files: ['https://your-server.com/newsletter.pdf']
  }],
  shippingCustomer: {
    firstName: 'John', lastName: 'Doe',
    email: 'john@example.com', phone: '555-1234',
    address1: '123 Main St', city: 'Portland', state: 'OR', zip: '97201',
    shipmentTrackingEmail: ['john@example.com']
  }
});
console.log(`AC Order #: ${order.acOrderNumber}`);
```

### Check Order Status

```js
const status = await client.getOrderStatus('ATEST-0000001');

if (status.orderStatus === 'Shipped') {
  console.log(`Tracking: ${status.trackingNumbers.join(', ')}`);
}
```

### Cancel an Order

```js
// Only works while order is in Pending status (~4 hours after submission)
const result = await client.cancelOrder('ATEST-0000001');
```

## Error Handling

```js
import { PrintApiClient, PrintApiError } from '@activityconnection/printapi-sdk';

try {
  await client.createOrder(orderData);
} catch (err) {
  if (err instanceof PrintApiError) {
    console.log(err.status);    // HTTP status code (e.g. 409)
    console.log(err.errorType); // API error type (e.g. "Conflict")
    console.log(err.message);   // API error message
    console.log(err.details);   // Extra fields (e.g. { existingOrderNumber: "..." })
  }
}
```

## Documentation

- [Getting Started](Docs/getting-started.md) - Prerequisites, install, first API call
- [API Reference](Docs/api-reference.md) - Full method reference with types
- [Examples](Docs/examples.md) - Real-world usage patterns

## API Coverage

| Method | API Endpoint | Description |
|--------|-------------|-------------|
| `getCatalog()` | `GET /catalog` | List active products |
| `checkPricing(items)` | `POST /pricing` | Preview pricing without creating an order |
| `createOrder(data)` | `POST /order` | Submit a print order |
| `getOrderStatus(num)` | `GET /orderstatus` | Check order status and tracking |
| `cancelOrder(num)` | `POST /cancelorder` | Cancel a pending order |

## License

Apache-2.0
