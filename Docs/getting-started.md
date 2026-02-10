# Getting Started

## Prerequisites

- **Node.js 18+** (uses native `fetch`)
- **API Key** from Activity Connection - contact [Developer Support](https://printapi.net/feedback)
- **Account ID** provided with your API key

## Installation

Install directly from GitHub:

```bash
npm install github:Activity-Connection/PrintAPI-SDK
```

Or pin to a specific version:

```bash
npm install github:Activity-Connection/PrintAPI-SDK#v1.0.0
```

## Setup

```js
import { PrintApiClient } from '@activityconnection/printapi-sdk';

const client = new PrintApiClient({
  apiKey: 'your-api-key',
  accountId: 'your-account-id'
});
```

Store credentials in environment variables rather than hardcoding them:

```js
const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_API_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID,
  testMode: process.env.PRINTAPI_TESTMODE === 'true'
});
```

When `testMode` is `true`, every order submitted via `createOrder()` is automatically marked as a test order — no need to pass `testOrder: true` on each call. Set `PRINTAPI_TESTMODE=true` in your `.env` during development, and remove it (or set to `false`) for production.

## Your First API Call

The simplest operation is fetching the catalog:

```js
const { catalog } = await client.getCatalog();

for (const product of catalog) {
  console.log(`${product.sku} — ${product.productName}`);
}
```

This returns all active products with their SKUs, which you'll need for pricing and ordering.

## Typical Workflow

1. **Browse catalog** to discover available products and SKUs
2. **Check pricing** to show costs to your customer (no files needed)
3. **Create order** with file URLs, shipping info, and your reference number
4. **Check status** periodically to track production and get tracking numbers
5. **Cancel order** if needed (within ~4 hours of submission)

## What Ships Where

The API ships to the lower 48 US states via USPS and UPS. Alaska, Hawaii, and international destinations are not supported.

## Rate Limits

- **100 requests per 10 seconds** per IP (across all endpoints)
- **240 requests per minute** per endpoint per account

The API returns `429 Too Many Requests` when limits are exceeded. Implement backoff in your application.

## Next Steps

- [API Reference](api-reference.md) for full method documentation
- [Examples](examples.md) for real-world usage patterns
- Check out the runnable scripts in the `examples/` directory
