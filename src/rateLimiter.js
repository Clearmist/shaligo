/**
 * @typedef {object} RateLimitCounter
 * @property {number} limit - Total requests allowed in this window.
 * @property {number} remaining - Requests remaining in the current window.
 * @property {Date} resetAt - When the counter resets.
 */

/**
 * @typedef {object} RateLimitStatus
 * @property {RateLimitCounter|null} burst - Null until a response has been seen.
 * @property {RateLimitCounter|null} sustained - Null until a response has been seen.
 */

// Tracks the two independent counters described in the Metron rate-limit
// scheme: a short "burst" window and a longer "sustained" window.
// https://github.com/Metron-Project/metron/blob/master/api/RATELIMIT.md
export class RateLimitTracker {
  constructor() {
    /** @type {RateLimitCounter|null} */
    this.burst = null;
    /** @type {RateLimitCounter|null} */
    this.sustained = null;
  }

  /** @param {Headers} headers */
  update(headers) {
    this.burst = this._readCounter(headers, 'burst') ?? this.burst;
    this.sustained = this._readCounter(headers, 'sustained') ?? this.sustained;
  }

  /**
   * @param {Headers} headers
   * @param {'burst'|'sustained'} kind
   * @returns {RateLimitCounter|null}
   */
  _readCounter(headers, kind) {
    const limit = headers.get(`x-ratelimit-${kind}-limit`);
    const remaining = headers.get(`x-ratelimit-${kind}-remaining`);
    const reset = headers.get(`x-ratelimit-${kind}-reset`);
    if (limit === null || remaining === null || reset === null) return null;
    return {
      limit: Number(limit),
      remaining: Number(remaining),
      resetAt: new Date(Number(reset) * 1000),
    };
  }

  // Sustained is checked first since it takes far longer to recover from;
  // there is no point reporting a short burst wait if the sustained
  // counter is also exhausted.
  /**
   * @param {number} [now]
   * @returns {number} milliseconds to wait before the next request, or 0.
   */
  msUntilAvailable(now = Date.now()) {
    for (const counter of [this.sustained, this.burst]) {
      if (counter && counter.remaining <= 0) {
        const wait = counter.resetAt.getTime() - now;
        if (wait > 0) return wait;
      }
    }
    return 0;
  }

  /** @returns {'burst'|'sustained'|undefined} */
  exhaustedLimitType() {
    if (this.sustained && this.sustained.remaining <= 0) return 'sustained';
    if (this.burst && this.burst.remaining <= 0) return 'burst';
    return undefined;
  }
}
