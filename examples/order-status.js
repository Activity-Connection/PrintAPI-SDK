// Check the status of an order
// Usage: node examples/order-status.js <orderNumber>

import { PrintApiClient } from '../src/index.js';

const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID
});

const orderNumber = process.argv[2];
if (!orderNumber) {
  console.error('Usage: node examples/order-status.js <orderNumber>');
  process.exit(1);
}

const status = await client.getOrderStatus(orderNumber);

console.log(`Order: ${status.acOrderNumber}`);
console.log(`Your ref: ${status.sourceReferenceOrderNumber}`);
console.log(`Status: ${status.orderStatus}`);

if (status.orderStatus === 'Shipped') {
  console.log(`Shipped: ${status.shippedDate}`);
  console.log(`Carrier: ${status.shipmentProvider}`);
  console.log(`Tracking: ${status.trackingNumbers.join(', ')}`);
} else {
  console.log(`Expected ship date: ${status.expectedShipDateEstimate}`);
}
