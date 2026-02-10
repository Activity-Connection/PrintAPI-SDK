// Check pricing for a set of items (no files needed)
// Usage: node examples/pricing.js

import { PrintApiClient } from '../src/index.js';

const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID
});

const pricing = await client.checkPricing([
  { sku: 'TAB_2D_16P', productType: 'Newsletter', quantity: 100, staple: true },
  { sku: 'TAB_1D', productType: 'Calendar', quantity: 200 },
  { sku: 'LFP_36x24', productType: 'LFP', quantity: 5 },
  { sku: 'LFP_CS', productType: 'LFP', quantity: 2, longEdge: 48, shortEdge: 36 }
]);

console.log('Items:');
for (const item of pricing.items) {
  console.log(`  ${item.sku} x${item.quantity} — $${item.subtotal}`);
  if (item.stapleFee) console.log(`    + staple fee: $${item.stapleFee}`);
}

console.log('\nFees:');
for (const fee of pricing.fees) {
  console.log(`  ${fee.name}: $${fee.amount}`);
}

console.log(`\nGrand Total: $${pricing.grandTotal}`);
