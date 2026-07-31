/** Thrown for any non-2xx response from the Metron API. */
export class MetronApiError extends Error {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {number} [options.status] - HTTP status code.
   * @param {*} [options.body] - Parsed JSON body, or raw text if the response wasn't JSON.
   * @param {string} [options.url] - The request URL that failed.
   */
  constructor(message, { status, body, url } = {}) {
    super(message);
    this.name = 'MetronApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/** Thrown when MetronClient's `maxRetries` is exhausted on repeated 429 responses. */
export class MetronRateLimitError extends MetronApiError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {number} [options.status]
   * @param {*} [options.body]
   * @param {string} [options.url]
   * @param {number} [options.retryAfter] - Seconds from the last response's `Retry-After` header.
   * @param {'burst'|'sustained'} [options.limitType] - Which counter was exhausted.
   */
  constructor(message, { status, body, url, retryAfter, limitType } = {}) {
    super(message, { status, body, url });
    this.name = 'MetronRateLimitError';
    this.retryAfter = retryAfter;
    this.limitType = limitType;
  }
}
