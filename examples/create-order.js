// Create a print order
// Usage: node examples/create-order.js

import { PrintApiClient, PrintApiError } from '../src/index.js';

const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID
});

try {
  const order = await client.createOrder({
    orderDatetime: new Date().toISOString(),
    sourceReferenceOrderNumber: `SDK-EXAMPLE-${Date.now()}`,
    testOrder: true,
    orderItems: [
      {
        sku: 'TAB_2D_16P',
        productType: 'Newsletter',
        quantity: 50,
        staple: true,
        files: ['https://example.com/newsletter.pdf']
      },
      {
        sku: 'LFP_36x24',
        productType: 'LFP',
        quantity: 10,
        files: ['https://example.com/wall-calendar.pdf']
      }
    ],
    shippingCustomer: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-987-6543',
      address1: '456 Oak Ave',
      city: 'Portland',
      state: 'OR',
      zip: '97201',
      shipmentTrackingEmail: ['jane@example.com']
    }
  });

  console.log(`Order created: ${order.acOrderNumber}`);
  console.log(`Your reference: ${order.sourceReferenceOrderNumber}`);
  console.log(`Grand total: $${order.grandTotal}`);
  console.log(`Expected ship date: ${order.expectedShipDateEstimate}`);
} catch (err) {
  if (err instanceof PrintApiError && err.status === 409) {
    console.error(`Duplicate order number. Existing: ${err.details.existingOrderNumber}`);
  } else {
    throw err;
  }
}
