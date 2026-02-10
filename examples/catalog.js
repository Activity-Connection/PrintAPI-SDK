// Fetch the product catalog
// Usage: node examples/catalog.js

import { PrintApiClient } from '../src/index.js';

const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID
});

const { catalog } = await client.getCatalog();

console.log(`Found ${catalog.length} products:\n`);
for (const product of catalog) {
  const options = [
    product.staple && 'staple',
    product.flat && 'flat',
    product.customSize && 'custom-size'
  ].filter(Boolean);

  console.log(`  ${product.sku} — ${product.productName}`);
  if (options.length) console.log(`    Options: ${options.join(', ')}`);
}
