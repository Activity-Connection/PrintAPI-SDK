# API Reference

## PrintApiClient

### Constructor

```js
new PrintApiClient({ apiKey, accountId, baseUrl?, testMode? })
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `apiKey` | string | Yes | | Your API key (sent as `X-API-Key` header) |
| `accountId` | string | Yes | | Your account ID (auto-injected into requests) |
| `baseUrl` | string | No | `https://printapi.net/api/v1` | API base URL |
| `testMode` | boolean | No | `false` | When `true`, automatically sets `testOrder: true` on every `createOrder` call |

Throws `Error` if `apiKey` or `accountId` is missing or not a string.

#### Test Mode

When `testMode` is enabled, every order submitted via `createOrder()` is automatically marked as a test order. This is useful during development and integration testing to avoid creating real orders.

```js
const client = new PrintApiClient({
  apiKey: process.env.PRINTAPI_API_KEY,
  accountId: process.env.PRINTAPI_ACCOUNT_ID,
  testMode: process.env.PRINTAPI_TESTMODE === 'true'
});
```

Set the environment variable to activate test mode:

```bash
PRINTAPI_TESTMODE=true
```

When `testMode` is `true`:
- `testOrder: true` is injected into every `createOrder` request body
- This overrides any explicit `testOrder` value in the order data
- Your account must have test order permissions enabled (otherwise the API returns 403)

When `testMode` is `false` (default):
- No `testOrder` flag is added automatically
- You can still pass `testOrder: true` per-order if needed

---

### getCatalog()

Retrieve all active products available for ordering.

```js
const { catalog } = await client.getCatalog();
```

**Returns:** `{ catalog: CatalogProduct[] }`

#### CatalogProduct

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique catalog entry identifier |
| `productName` | string | Human-readable product name |
| `shortDescription` | string | Brief description |
| `description` | string | Detailed description |
| `sku` | string | SKU identifier (e.g. `TAB_2D_16P`, `LFP_CS`) |
| `sizingType` | string | `"LTR"`, `"TAB"`, or `"LFP"` |
| `productType` | string | `"Newsletter"`, `"Calendar"`, `"Flyer"`, or `"LFP"` |
| `productCategory` | string | Product category |
| `duplex` | boolean | Supports double-sided printing |
| `staple` | boolean | Supports stapling |
| `flat` | boolean | Can be delivered flat |
| `customSize` | boolean | Supports custom dimensions |
| `longEdgeMinDimension` | number? | Min long edge inches (custom size only) |
| `longEdgeMaxDimension` | number? | Max long edge inches (custom size only) |
| `shortEdgeMinDimension` | number? | Min short edge inches (custom size only) |
| `shortEdgeMaxDimension` | number? | Max short edge inches (custom size only) |
| `updatedAt` | string | ISO 8601 last update timestamp |

---

### checkPricing(orderItems)

Calculate pricing for items without creating an order. No files or shipping info needed.

```js
const pricing = await client.checkPricing(orderItems);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderItems` | OrderItem[] | Array of items to price |

#### OrderItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sku` | string | Yes | Product SKU from catalog |
| `productType` | string | Yes | `"Newsletter"`, `"Calendar"`, `"Flyer"`, or `"LFP"` |
| `quantity` | number | Yes | Quantity to print (1-1000) |
| `longEdge` | number | For `LFP_CS` | Long edge in inches |
| `shortEdge` | number | For `LFP_CS` | Short edge in inches |
| `staple` | boolean | No | Staple option (Newsletter >4 pages only) |
| `flat` | boolean | No | Ship flat (TAB Calendar only) |

**Returns:** `PricingResponse`

#### PricingResponse

| Field | Type | Description |
|-------|------|-------------|
| `fees` | Fee[] | Order-level fees |
| `totalFees` | number | Sum of all fees |
| `items` | PricedItem[] | Priced items |
| `totalItemCost` | number | Sum of item subtotals |
| `grandTotal` | number | Total including all fees |

#### Fee

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Fee name (e.g. `"Shipping Fee - Standard"`) |
| `amount` | number | Fee amount in dollars |

#### PricedItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Sequential item ID (1-based) |
| `quantity` | number | Quantity |
| `unitCost` | number | Cost per unit in dollars |
| `subtotal` | number | quantity x unitCost |
| `sku` | string | Product SKU |
| `stapleFee` | number? | Staple fee for this item (if applicable) |

---

### createOrder(orderData)

Submit a print order. The `accountId` is automatically injected.

```js
const order = await client.createOrder(orderData);
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderDatetime` | string | Yes | ISO 8601 datetime of when the order was placed in your system |
| `sourceReferenceOrderNumber` | string | Yes | Your unique order number (must be unique per account) |
| `orderItems` | OrderItem[] | Yes | Items to order (must include `files`) |
| `shippingCustomer` | ShippingCustomer | Yes | Shipping recipient |
| `sourceSystemBilling` | boolean | No | `true` (default) = you handle billing. `false` = AC handles billing |
| `billingCustomer` | BillingCustomer | When billing=false | Billing contact for AC invoicing |
| `testOrder` | boolean | No | Mark as test order (requires account permission) |

#### ShippingCustomer

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | First name |
| `lastName` | string | Yes | Last name |
| `email` | string | Yes | Email address |
| `phone` | string | Yes | Phone number |
| `address1` | string | Yes | Street address |
| `city` | string | Yes | City |
| `state` | string | Yes | 2-letter state code (lower 48 US) |
| `zip` | string | Yes | ZIP code |
| `shipmentTrackingEmail` | string[] | Yes | Tracking notification emails (1-3) |
| `company` | string | No | Company name |
| `address2` | string | No | Address line 2 |
| `address3` | string | No | Address line 3 |

#### BillingCustomer

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | Yes | First name |
| `lastName` | string | Yes | Last name |
| `email` | string | Yes | Email address |
| `phone` | string | Yes | Phone number |
| `address1` | string | Yes | Street address |
| `city` | string | Yes | City |
| `state` | string | Yes | 2-letter state code |
| `zip` | string | Yes | ZIP code |
| `billingInvoiceEmails` | string[] | No | Invoice notification emails |
| `company` | string | No | Company name |
| `address2` | string | No | Address line 2 |
| `address3` | string | No | Address line 3 |

**Returns:** `OrderResponse`

| Field | Type | Description |
|-------|------|-------------|
| `acOrderNumber` | string | Activity Connection order number (e.g. `"ATEST-0000001"`) |
| `sourceReferenceOrderNumber` | string | Your order number |
| `fees` | Fee[] | Order-level fees |
| `totalFees` | number | Sum of all fees |
| `items` | PricedItem[] | Priced order items |
| `totalItemCost` | number | Sum of item subtotals |
| `grandTotal` | number | Total including all fees |
| `expectedShipDateEstimate` | string | Estimated ship date (YYYY-MM-DD) |
| `testOrder` | boolean? | Present if this is a test order |

**Error 409** — Duplicate `sourceReferenceOrderNumber`. The `details` object will include `existingOrderNumber`.

---

### getOrderStatus(orderNumber)

Get the current status and tracking info for an order.

```js
const status = await client.getOrderStatus(orderNumber);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderNumber` | string | AC order number or your reference number |

**Returns:** `OrderStatusResponse`

| Field | Type | Description |
|-------|------|-------------|
| `acOrderNumber` | string | AC order number |
| `sourceReferenceOrderNumber` | string | Your order number |
| `orderStatus` | string | `"Pending"`, `"Received"`, `"Production"`, `"QC"`, `"Shipped"`, or `"Cancelled"` |
| `orderDate` | string | ISO 8601 order creation datetime |
| `expectedShipDateEstimate` | string? | Estimated ship date (non-shipped orders) |
| `shippedDate` | string? | ISO 8601 ship datetime (shipped orders) |
| `shipmentProvider` | string? | Carrier name (shipped orders) |
| `trackingNumbers` | string[]? | Tracking numbers (shipped orders) |
| `testOrder` | boolean? | Present if test order |

---

### cancelOrder(orderNumber)

Cancel a pending order. Only works within ~4 business hours of submission while the order is in "Pending" status.

```js
const result = await client.cancelOrder(orderNumber);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderNumber` | string | AC order number or your reference number |

**Returns:** `CancelOrderResponse`

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | `"Order cancelled successfully"` |
| `acOrderNumber` | string | AC order number |
| `sourceReferenceOrderNumber` | string | Your order number |
| `orderStatus` | string | `"Cancelled"` |
| `testOrder` | boolean? | Present if test order |

---

## Client-Side Validation

The SDK validates input locally before making API calls. This catches obvious structural errors instantly without a network round-trip.

Validation errors throw a regular `Error` (not `PrintApiError`), so you can distinguish local validation failures from remote API errors:

```js
try {
  await client.createOrder(orderData);
} catch (err) {
  if (err instanceof PrintApiError) {
    // API rejected the request (network/server error)
    console.log(err.status, err.errorType);
  } else {
    // SDK caught a structural problem locally
    console.log(err.message); // e.g. "orderItems[0].quantity must be an integer between 1 and 1000"
  }
}
```

### What Gets Validated

| Method | Checks |
|--------|--------|
| `getCatalog()` | None |
| `checkPricing(orderItems)` | `orderItems` is a non-empty array; each item has a valid `sku` (non-empty string), `productType` (Newsletter/Calendar/Flyer/LFP), and `quantity` (integer 1-1000); `LFP_CS` items require `longEdge` and `shortEdge` |
| `createOrder(orderData)` | All `checkPricing` checks **plus**: `orderDatetime` and `sourceReferenceOrderNumber` required; each item must have `files` (non-empty array of HTTPS URLs); `shippingCustomer` required with validated fields (name, address, email, phone >9 chars, state in lower 48 + DC, 1-3 tracking emails); `billingCustomer` required when `sourceSystemBilling` is `false` |
| `getOrderStatus(orderNumber)` | `orderNumber` must be a non-empty string |
| `cancelOrder(orderNumber)` | `orderNumber` must be a non-empty string |

### State Codes

The SDK accepts the lower 48 US states plus DC. Alaska (AK) and Hawaii (HI) are excluded because the API only ships to contiguous US states.

---

## PrintApiError

Thrown on any non-2xx API response.

```js
import { PrintApiError } from '@activityconnection/printapi-sdk';
```

| Property | Type | Description |
|----------|------|-------------|
| `status` | number | HTTP status code (0 for network errors) |
| `errorType` | string | Error type from API (e.g. `"Bad Request"`, `"Conflict"`) |
| `message` | string | Error message from API |
| `details` | object | Additional fields from the error response |

### Common Error Codes

| Status | Meaning | When |
|--------|---------|------|
| 400 | Bad Request | Missing/invalid fields, order not cancellable |
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | Account ID mismatch, missing permission |
| 404 | Not Found | Order not found |
| 409 | Conflict | Duplicate sourceReferenceOrderNumber |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
