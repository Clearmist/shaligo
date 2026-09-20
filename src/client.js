import { MetronApiError, MetronRateLimitError } from './errors.js';
import { RateLimitTracker } from './rateLimiter.js';
import { buildResources } from './resources.js';
import { sleep } from './util.js';

/** @typedef {import('./rateLimiter.js').RateLimitStatus} RateLimitStatus */
/** @typedef {import('./types.js').ArcApi} ArcApi */
/** @typedef {import('./types.js').CharacterApi} CharacterApi */
/** @typedef {import('./types.js').CreatorApi} CreatorApi */
/** @typedef {import('./types.js').ImprintApi} ImprintApi */
/** @typedef {import('./types.js').IssueApi} IssueApi */
/** @typedef {import('./types.js').PublisherApi} PublisherApi */
/** @typedef {import('./types.js').RoleApi} RoleApi */
/** @typedef {import('./types.js').SeriesApi} SeriesApi */
/** @typedef {import('./types.js').SeriesTypeApi} SeriesTypeApi */
/** @typedef {import('./types.js').TeamApi} TeamApi */
/** @typedef {import('./types.js').UniverseApi} UniverseApi */

const DEFAULT_BASE_URL = 'https://metron.cloud';

/**
 * @typedef {object} RequestOptions
 * @property {AbortSignal} [signal] - Aborts the in-flight `fetch`, or a pending proactive/retry wait, with the same `AbortError` `fetch` itself throws. Passed down from every resource method (`client.issue.get(id, { signal })`, etc.) and from `request()`/`paginate()` directly.
 */

/**
 * @callback OnThrottleCallback
 * @param {object} info
 * @param {'proactive'|'retry'} info.reason - `'proactive'` when a prior response already showed the limit exhausted and this wait happens before the request is even sent; `'retry'` when this request itself just got a 429.
 * @param {number} info.waitMs - How long the client is about to sleep.
 * @param {string} info.url - The request URL being waited on.
 * @param {number} [info.attempt] - The retry attempt number that got the 429; only present for `reason: 'retry'`.
 * @param {'burst'|'sustained'} [info.limitType] - Which counter is driving the wait, when known.
 */

/**
 * @callback OnResponseCallback
 * @param {object} info
 * @param {string} info.url - The full URL that was requested (including query string).
 * @param {Response} info.response - The raw `fetch` response, as a clone: its body is still unread, so the callback can call `.json()`/`.text()` and inspect `.headers`/`.status` without affecting the client. Fired for every response received, including 429s that get retried and non-2xx errors.
 * @param {number} info.attempt - Zero-based attempt number for this request (increments on 429 retries).
 * @returns {void|Promise<void>}
 */

/**
 * @typedef {object} MetronClientOptions
 * @property {string} token - Knox API token, generated from your account settings at metron.cloud.
 * @property {string} [baseUrl] - Override for testing against a different host.
 * @property {string} [userAgent]
 * @property {boolean} [autoThrottle] - Proactively pause before a request would exceed the tracked rate limit. Default true.
 * @property {number} [maxRetries] - Max retries on a 429 response before throwing MetronRateLimitError. Default 3.
 * @property {RateLimitStatus} [rateLimitStatus] - Previously-captured counters (from `getRateLimitStatus()`) to seed this client with. A fresh client otherwise starts with no rate-limit history, so `autoThrottle` can't help until its first response — this lets a caller that creates a short-lived `MetronClient` per request (rather than keeping one alive) persist the counters between calls and still throttle proactively instead of finding the limit by hitting it.
 * @property {OnThrottleCallback} [onThrottle] - Called immediately before the client sleeps for a rate limit, proactively or after a 429. A wait like this can run from seconds to minutes with nothing else observable happening — this is the hook for logging/UI feedback so it doesn't look indistinguishable from a hang.
 * @property {OnResponseCallback} [onResponse] - Called with the requested URL and the raw response for every response received, before the client processes it. The way for a parent app to log or capture exactly which endpoint was hit and what came back. May be async; the client awaits it, and if it throws, the request fails with that error.
 */

// Client for the read-only (list/retrieve) surface of the Metron API,
// authenticating with a Knox API token and honoring the rate-limit scheme
// described at https://github.com/Metron-Project/metron/blob/master/api/RATELIMIT.md
export class MetronClient {
  /** @param {MetronClientOptions} options */
  constructor({
    token,
    baseUrl = DEFAULT_BASE_URL,
    userAgent = 'shaligo/1.0 (+https://github.com/Metron-Project/shaligo)',
    autoThrottle = true,
    maxRetries = 3,
    rateLimitStatus,
    onThrottle,
    onResponse,
    // A zero-arg call falls through to the friendly runtime check below
    // rather than a native "cannot destructure" TypeError; `token` still
    // shows as required in the published types, since that's the real
    // contract for callers.
  } = /** @type {MetronClientOptions} */ ({})) {
    if (!token) {
      throw new Error('MetronClient requires an API token (see constructor options)');
    }

    this.token = token;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.userAgent = userAgent;
    this.autoThrottle = autoThrottle;
    this.maxRetries = maxRetries;
    this.onThrottle = onThrottle;
    this.onResponse = onResponse;
    this.rateLimiter = new RateLimitTracker();
    if (rateLimitStatus) {
      this.rateLimiter.restore(rateLimitStatus);
    }

    const resources = buildResources(this);
    this.arc = /** @type {ArcApi} */ (resources.arc);
    this.character = /** @type {CharacterApi} */ (resources.character);
    this.creator = /** @type {CreatorApi} */ (resources.creator);
    this.imprint = /** @type {ImprintApi} */ (resources.imprint);
    this.issue = /** @type {IssueApi} */ (resources.issue);
    this.publisher = /** @type {PublisherApi} */ (resources.publisher);
    this.role = /** @type {RoleApi} */ (resources.role);
    this.series = /** @type {SeriesApi} */ (resources.series);
    this.seriesType = /** @type {SeriesTypeApi} */ (resources.seriesType);
    this.team = /** @type {TeamApi} */ (resources.team);
    this.universe = /** @type {UniverseApi} */ (resources.universe);
  }

  /**
   * Last known state of both rate-limit counters, as reported by the most
   * recent response. Each counter is null until a request has been made.
   * @returns {RateLimitStatus}
   */
  getRateLimitStatus() {
    return { burst: this.rateLimiter.burst, sustained: this.rateLimiter.sustained };
  }

  /**
   * Issue a GET request against a Metron API path, e.g. `/api/series/`.
   * Prefer the resource namespaces (`client.series.list(...)`, etc.) for
   * the built-in endpoints; this is the low-level primitive they're built on.
   * @param {string} path
   * @param {Record<string, string|number|boolean|undefined|null>} [params]
   * @param {RequestOptions} [options]
   * @returns {Promise<any>}
   */
  request(path, params = {}, options = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    return this._requestUrl(url.toString(), options);
  }

  /**
   * Async generator yielding every result across all pages of a list
   * endpoint, sleeping/retrying as needed between page requests so callers
   * never have to think about the rate limit themselves.
   * @param {string} path
   * @param {Record<string, string|number|boolean|undefined|null>} [params]
   * @param {RequestOptions} [options]
   * @returns {AsyncGenerator<any>}
   */
  async *paginate(path, params = {}, options = {}) {
    let nextUrl;
    let page = await this.request(path, params, options);
    for (const item of page.results ?? []) yield item;
    nextUrl = page.next;

    while (nextUrl) {
      page = await this._requestUrl(nextUrl, options);
      for (const item of page.results ?? []) yield item;
      nextUrl = page.next;
    }
  }

  // Proactive throttling only applies before the *first* attempt at a
  // request. Once a 429 has actually been hit, the server's Retry-After
  // value is the authoritative wait time; re-running the proactive check
  // on retry would double up against still-stale counter state and can
  // massively over-sleep, so retries go straight to another fetch.
  /**
   * @private
   * @param {string} urlString
   * @param {RequestOptions} [options]
   * @returns {Promise<any>}
   */
  async _requestUrl(urlString, options = {}) {
    const { signal } = options;
    await this._waitIfThrottled(urlString, signal);

    for (let attempt = 0; ; attempt += 1) {
      const response = await fetch(urlString, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
        signal,
      });

      this.rateLimiter.update(response.headers);
      if (this.onResponse) {
        await this.onResponse({ url: urlString, response: response.clone(), attempt });
      }

      if (response.status === 429) {
        if (attempt >= this.maxRetries) {
          const retryAfter = Number(response.headers.get('retry-after')) || undefined;
          throw new MetronRateLimitError('Metron API rate limit exceeded and max retries reached', {
            status: response.status,
            body: await safeParseBody(response),
            url: urlString,
            retryAfter,
            limitType: this.rateLimiter.exhaustedLimitType(),
          });
        }
        const retryAfterSeconds = Number(response.headers.get('retry-after')) || 1;
        const waitMs = retryAfterSeconds * 1000;
        this.onThrottle?.({ reason: 'retry', waitMs, url: urlString, attempt, limitType: this.rateLimiter.exhaustedLimitType() });
        await sleep(waitMs, signal);
        continue;
      }

      if (!response.ok) {
        throw new MetronApiError(`Metron API request failed with status ${response.status}`, {
          status: response.status,
          body: await safeParseBody(response),
          url: urlString,
        });
      }

      return response.json();
    }
  }

  /**
   * @private
   * @param {string} urlString
   * @param {AbortSignal} [signal]
   */
  async _waitIfThrottled(urlString, signal) {
    if (!this.autoThrottle) return;
    const wait = this.rateLimiter.msUntilAvailable();
    if (wait > 0) {
      // Small buffer past the reset instant to avoid clock-skew edge cases.
      const waitMs = wait + 250;
      this.onThrottle?.({ reason: 'proactive', waitMs, url: urlString, limitType: this.rateLimiter.exhaustedLimitType() });
      await sleep(waitMs, signal);
    }
  }
}

/** @param {Response} response */
async function safeParseBody(response) {
  try {
    return await response.clone().json();
  } catch {
    return response.clone().text();
  }
}
