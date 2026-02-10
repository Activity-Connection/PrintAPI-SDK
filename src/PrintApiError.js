/**
 * Error thrown when the PrintAPI returns a non-2xx response.
 *
 * @example
 * try {
 *   await client.createOrder(orderData);
 * } catch (err) {
 *   if (err instanceof PrintApiError) {
 *     console.log(err.status);    // 409
 *     console.log(err.errorType); // "Conflict"
 *     console.log(err.message);   // "Duplicate Customer Order Number..."
 *     console.log(err.details);   // { existingOrderNumber: "ATEST-0000001" }
 *   }
 * }
 */
export class PrintApiError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} errorType - Error type from the API (e.g. "Bad Request", "Conflict")
   * @param {string} message - Error message from the API
   * @param {Object} [details={}] - Additional error fields from the response
   */
  constructor(status, errorType, message, details = {}) {
    super(message);
    this.name = 'PrintApiError';
    /** @type {number} HTTP status code */
    this.status = status;
    /** @type {string} Error type from the API */
    this.errorType = errorType;
    /** @type {Object} Additional error details (e.g. existingOrderNumber on 409) */
    this.details = details;
  }
}
