import test from 'node:test';
import assert from 'node:assert/strict';
import { RateLimitTracker } from '../src/rateLimiter.js';

function headers(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const defaults = {
    'x-ratelimit-burst-limit': '20',
    'x-ratelimit-burst-remaining': '19',
    'x-ratelimit-burst-reset': String(now + 60),
    'x-ratelimit-sustained-limit': '5000',
    'x-ratelimit-sustained-remaining': '4999',
    'x-ratelimit-sustained-reset': String(now + 86400),
  };
  return new Headers({ ...defaults, ...overrides });
}

test('update() parses both counters from response headers', () => {
  const tracker = new RateLimitTracker();
  tracker.update(headers());
  assert.deepEqual(tracker.burst.limit, 20);
  assert.deepEqual(tracker.burst.remaining, 19);
  assert.ok(tracker.burst.resetAt instanceof Date);
  assert.deepEqual(tracker.sustained.remaining, 4999);
});

test('update() leaves prior state alone when headers are absent', () => {
  const tracker = new RateLimitTracker();
  tracker.update(headers());
  const before = tracker.burst;
  tracker.update(new Headers());
  assert.equal(tracker.burst, before);
});

test('msUntilAvailable() is 0 before any response has been seen', () => {
  const tracker = new RateLimitTracker();
  assert.equal(tracker.msUntilAvailable(), 0);
});

test('msUntilAvailable() is 0 when both counters have remaining capacity', () => {
  const tracker = new RateLimitTracker();
  tracker.update(headers());
  assert.equal(tracker.msUntilAvailable(), 0);
});

test('msUntilAvailable() waits for burst reset when burst is exhausted', () => {
  const tracker = new RateLimitTracker();
  const now = Date.now();
  tracker.update(headers({ 'x-ratelimit-burst-remaining': '0' }));
  const wait = tracker.msUntilAvailable(now);
  assert.ok(wait > 0 && wait <= 60_000, `expected wait within burst window, got ${wait}`);
});

test('msUntilAvailable() prioritizes the sustained reset when both are exhausted', () => {
  const tracker = new RateLimitTracker();
  const now = Date.now();
  tracker.update(
    headers({
      'x-ratelimit-burst-remaining': '0',
      'x-ratelimit-burst-reset': String(Math.floor(now / 1000) + 10),
      'x-ratelimit-sustained-remaining': '0',
      'x-ratelimit-sustained-reset': String(Math.floor(now / 1000) + 3600),
    }),
  );
  const wait = tracker.msUntilAvailable(now);
  assert.ok(wait > 10_000, `expected sustained's longer wait to win, got ${wait}`);
});

test('msUntilAvailable() is 0 once the reset instant has already passed', () => {
  const tracker = new RateLimitTracker();
  const now = Date.now();
  tracker.update(
    headers({
      'x-ratelimit-burst-remaining': '0',
      'x-ratelimit-burst-reset': String(Math.floor(now / 1000) - 5),
    }),
  );
  assert.equal(tracker.msUntilAvailable(now), 0);
});

test('restore() seeds both counters from a previously-captured status', () => {
  const tracker = new RateLimitTracker();
  const resetAt = new Date(Date.now() + 60_000);
  tracker.restore({ burst: { limit: 20, remaining: 0, resetAt }, sustained: { limit: 5000, remaining: 4999, resetAt } });
  assert.deepEqual(tracker.burst, { limit: 20, remaining: 0, resetAt });
  assert.equal(tracker.sustained.remaining, 4999);
});

test('restore() accepts a serialized (string) resetAt, e.g. read back from storage as JSON', () => {
  const tracker = new RateLimitTracker();
  const resetAt = new Date(Date.now() + 60_000);
  tracker.restore({ burst: { limit: 20, remaining: 0, resetAt: resetAt.toISOString() }, sustained: null });
  assert.ok(tracker.burst.resetAt instanceof Date);
  assert.equal(tracker.burst.resetAt.getTime(), resetAt.getTime());
  assert.equal(tracker.sustained, null);
});

test('restore() with no argument clears both counters', () => {
  const tracker = new RateLimitTracker();
  tracker.update(headers());
  tracker.restore();
  assert.equal(tracker.burst, null);
  assert.equal(tracker.sustained, null);
});

test('exhaustedLimitType() reports which counter is at zero', () => {
  const tracker = new RateLimitTracker();
  assert.equal(tracker.exhaustedLimitType(), undefined);

  tracker.update(headers());
  assert.equal(tracker.exhaustedLimitType(), undefined);

  tracker.update(headers({ 'x-ratelimit-burst-remaining': '0' }));
  assert.equal(tracker.exhaustedLimitType(), 'burst');

  tracker.update(headers({ 'x-ratelimit-sustained-remaining': '0' }));
  assert.equal(tracker.exhaustedLimitType(), 'sustained');
});
