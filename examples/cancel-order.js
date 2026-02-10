// Cancel a pending order
// Usage: node examples/cancel-order.js <orderNumber>

import { PrintApiClient, PrintApiError } from '../src/index.js';

const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID
});

const orderNumber = process.argv[2];
if (!orderNumber) {
  console.error('Usage: node examples/cancel-order.js <orderNumber>');
  process.exit(1);
}

try {
  const result = await client.cancelOrder(orderNumber);
  console.log(`Order ${result.acOrderNumber} cancelled successfully.`);
} catch (err) {
  if (err instanceof PrintApiError && err.status === 400) {
    console.error(`Cannot cancel: ${err.message}`);
    console.error('Orders can only be cancelled while in Pending status (~4 hours after submission).');
  } else {
    throw err;
  }
}
