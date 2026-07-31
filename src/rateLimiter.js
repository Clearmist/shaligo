// Tracks the two independent counters described in the Metron rate-limit
// scheme: a short "burst" window and a longer "sustained" window.
// https://github.com/Metron-Project/metron/blob/master/api/RATELIMIT.md
export class RateLimitTracker {
  constructor() {
    this.burst = null;
    this.sustained = null;
  }

  update(headers) {
    this.burst = this._readCounter(headers, 'burst') ?? this.burst;
    this.sustained = this._readCounter(headers, 'sustained') ?? this.sustained;
  }

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
  msUntilAvailable(now = Date.now()) {
    for (const counter of [this.sustained, this.burst]) {
      if (counter && counter.remaining <= 0) {
        const wait = counter.resetAt.getTime() - now;
        if (wait > 0) return wait;
      }
    }
    return 0;
  }

  exhaustedLimitType() {
    if (this.sustained && this.sustained.remaining <= 0) return 'sustained';
    if (this.burst && this.burst.remaining <= 0) return 'burst';
    return undefined;
  }
}
