import { MetronApiError, MetronRateLimitError } from './errors.js';
import { RateLimitTracker } from './rateLimiter.js';
import { buildResources } from './resources.js';
import { sleep } from './util.js';

const DEFAULT_BASE_URL = 'https://metron.cloud';

// Client for the read-only (list/retrieve) surface of the Metron API,
// authenticating with a Knox API token and honoring the rate-limit scheme
// described at https://github.com/Metron-Project/metron/blob/master/api/RATELIMIT.md
export class MetronClient {
  constructor({
    token,
    baseUrl = DEFAULT_BASE_URL,
    userAgent = 'shaligo/0.1 (+https://github.com/bpepple/shaligo)',
    autoThrottle = true,
    maxRetries = 3,
  } = {}) {
    if (!token) {
      throw new Error('MetronClient requires an API token (see constructor options)');
    }

    this.token = token;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.userAgent = userAgent;
    this.autoThrottle = autoThrottle;
    this.maxRetries = maxRetries;
    this.rateLimiter = new RateLimitTracker();

    Object.assign(this, buildResources(this));
  }

  // Last known state of both rate-limit counters, as reported by the most
  // recent response. Returns { burst, sustained }, each either null (no
  // request made yet) or { limit, remaining, resetAt }.
  getRateLimitStatus() {
    return { burst: this.rateLimiter.burst, sustained: this.rateLimiter.sustained };
  }

  request(path, params = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
    return this._requestUrl(url.toString());
  }

  // Async generator yielding every result across all pages of a list
  // endpoint, sleeping/retrying as needed between page requests so callers
  // never have to think about the rate limit themselves.
  async *paginate(path, params = {}) {
    let nextUrl;
    let page = await this.request(path, params);
    for (const item of page.results ?? []) yield item;
    nextUrl = page.next;

    while (nextUrl) {
      page = await this._requestUrl(nextUrl);
      for (const item of page.results ?? []) yield item;
      nextUrl = page.next;
    }
  }

  // Proactive throttling only applies before the *first* attempt at a
  // request. Once a 429 has actually been hit, the server's Retry-After
  // value is the authoritative wait time; re-running the proactive check
  // on retry would double up against still-stale counter state and can
  // massively over-sleep, so retries go straight to another fetch.
  async _requestUrl(urlString) {
    await this._waitIfThrottled();

    for (let attempt = 0; ; attempt += 1) {
      const response = await fetch(urlString, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
      });

      this.rateLimiter.update(response.headers);

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
        await sleep(retryAfterSeconds * 1000);
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

  async _waitIfThrottled() {
    if (!this.autoThrottle) return;
    const wait = this.rateLimiter.msUntilAvailable();
    if (wait > 0) {
      // Small buffer past the reset instant to avoid clock-skew edge cases.
      await sleep(wait + 250);
    }
  }
}

async function safeParseBody(response) {
  try {
    return await response.clone().json();
  } catch {
    return response.clone().text();
  }
}
