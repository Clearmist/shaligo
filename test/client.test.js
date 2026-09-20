import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MetronClient, MetronApiError, MetronRateLimitError } from '../index.js';
import { startServer, rateLimitHeaders, sendJson } from './helpers/server.js';

let ctx;
let flakyCalls = 0;
let always429Calls = 0;

before(async () => {
  ctx = await startServer((req, res, url) => {
    if (url.pathname === '/api/echo/') {
      sendJson(
        res,
        200,
        { query: Object.fromEntries(url.searchParams), count: 0, next: null, previous: null, results: [] },
        rateLimitHeaders(),
      );
      return;
    }

    if (url.pathname === '/api/paged/' && !url.searchParams.has('page')) {
      sendJson(
        res,
        200,
        { count: 2, next: `${ctx.baseUrl}/api/paged/?page=2`, previous: null, results: [{ id: 1 }] },
        rateLimitHeaders({ burstRemaining: 18 }),
      );
      return;
    }

    if (url.pathname === '/api/paged/' && url.searchParams.get('page') === '2') {
      sendJson(res, 200, { count: 2, next: null, previous: 'x', results: [{ id: 2 }] }, rateLimitHeaders({ burstRemaining: 17 }));
      return;
    }

    if (url.pathname === '/api/retrieve/5/') {
      sendJson(res, 200, { id: 5, name: 'Five' }, rateLimitHeaders());
      return;
    }

    if (url.pathname === '/api/flaky/') {
      flakyCalls += 1;
      if (flakyCalls === 1) {
        sendJson(res, 429, { detail: 'Throttled' }, { ...rateLimitHeaders({ burstRemaining: 0 }), 'Retry-After': '1' });
        return;
      }
      sendJson(res, 200, { count: 0, next: null, previous: null, results: [] }, rateLimitHeaders());
      return;
    }

    if (url.pathname === '/api/always429/') {
      always429Calls += 1;
      sendJson(res, 429, { detail: 'Throttled' }, { ...rateLimitHeaders({ burstRemaining: 0 }), 'Retry-After': '1' });
      return;
    }

    if (url.pathname === '/api/exhausted/') {
      const resetIn = Number(url.searchParams.get('resetIn') ?? 1);
      sendJson(res, 200, { count: 0, next: null, previous: null, results: [] }, rateLimitHeaders({ burstRemaining: 0, burstResetIn: resetIn }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  });
});

after(() => ctx.close());

test('constructor requires a token', () => {
  assert.throws(() => new MetronClient({}), /token/i);
});

test('request() builds a query string, skipping null/undefined values, and returns parsed JSON', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  const data = await client.request('/api/echo/', { name: 'Batman', page: 2, skip: undefined, ignore: null });
  assert.equal(data.query.name, 'Batman');
  assert.equal(data.query.page, '2');
  assert.equal('skip' in data.query, false);
  assert.equal('ignore' in data.query, false);
});

test('sends the bearer token and standard headers', async () => {
  const client = new MetronClient({ token: 'secret-token', baseUrl: ctx.baseUrl, userAgent: 'test-agent' });
  await client.request('/api/echo/');
  const last = ctx.requests.at(-1);
  assert.equal(last.headers.authorization, 'Bearer secret-token');
  assert.equal(last.headers['user-agent'], 'test-agent');
  assert.equal(last.headers.accept, 'application/json');
});

test('paginate()/listAll() walks every page in order', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  const items = [];
  for await (const item of client.paginate('/api/paged/')) items.push(item);
  assert.deepEqual(items, [{ id: 1 }, { id: 2 }]);
});

test('getRateLimitStatus() reflects the most recent response headers', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  assert.deepEqual(client.getRateLimitStatus(), { burst: null, sustained: null });
  await client.request('/api/retrieve/5/');
  const status = client.getRateLimitStatus();
  assert.equal(status.burst.limit, 20);
  assert.equal(status.sustained.limit, 5000);
});

test('a 429 is retried and honors the Retry-After header', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  flakyCalls = 0;
  const start = Date.now();
  const data = await client.request('/api/flaky/');
  const elapsed = Date.now() - start;
  assert.equal(flakyCalls, 2);
  assert.ok(elapsed >= 950, `expected ~1s wait, got ${elapsed}ms`);
  assert.deepEqual(data.results, []);
});

test('exhausting maxRetries on repeated 429s throws MetronRateLimitError', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl, maxRetries: 1 });
  always429Calls = 0;
  await assert.rejects(
    () => client.request('/api/always429/'),
    (err) => {
      assert.ok(err instanceof MetronRateLimitError);
      assert.equal(err.status, 429);
      assert.equal(err.retryAfter, 1);
      assert.equal(err.limitType, 'burst');
      return true;
    },
  );
  assert.equal(always429Calls, 2);
});

test('proactively waits for the counter reset before the next request', async () => {
  // resetIn=3 gives enough margin over the reset header's 1-second
  // granularity that flooring jitter can't make this test flaky.
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  await client.request('/api/exhausted/', { resetIn: 3 });
  const start = Date.now();
  await client.request('/api/retrieve/5/');
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 1700, `expected a multi-second proactive wait, got ${elapsed}ms`);
});

test('rateLimitStatus seeds the tracker so a fresh client can throttle proactively', async () => {
  const client = new MetronClient({
    token: 't',
    baseUrl: ctx.baseUrl,
    rateLimitStatus: { burst: { limit: 20, remaining: 0, resetAt: new Date(Date.now() + 1500) }, sustained: null },
  });
  assert.deepEqual(client.getRateLimitStatus().burst.remaining, 0);
  const start = Date.now();
  await client.request('/api/retrieve/5/');
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 1000, `expected the seeded counter to trigger a proactive wait, got ${elapsed}ms`);
});

test('onThrottle fires with reason "retry" when a request itself gets a 429', async () => {
  const calls = [];
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl, onThrottle: (info) => calls.push(info) });
  flakyCalls = 0;
  await client.request('/api/flaky/');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].reason, 'retry');
  assert.equal(calls[0].attempt, 0);
  assert.equal(calls[0].limitType, 'burst');
  assert.ok(calls[0].waitMs >= 900, `expected ~1s waitMs, got ${calls[0].waitMs}`);
  assert.ok(calls[0].url.includes('/api/flaky/'));
});

test('onThrottle fires with reason "proactive" before a request that would exceed a known-exhausted counter', async () => {
  const calls = [];
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl, onThrottle: (info) => calls.push(info) });
  await client.request('/api/exhausted/', { resetIn: 2 });
  await client.request('/api/retrieve/5/');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].reason, 'proactive');
  assert.equal(calls[0].limitType, 'burst');
  assert.ok(calls[0].url.includes('/api/retrieve/5/'));
});

test('onResponse receives the requested URL and a readable raw response', async () => {
  const calls = [];
  const client = new MetronClient({
    token: 't',
    baseUrl: ctx.baseUrl,
    onResponse: async ({ url, response, attempt }) => {
      calls.push({ url, status: response.status, attempt, raw: await response.text() });
    },
  });
  const body = await client.request('/api/retrieve/5/', { foo: 'bar' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${ctx.baseUrl}/api/retrieve/5/?foo=bar`);
  assert.equal(calls[0].status, 200);
  assert.equal(calls[0].attempt, 0);
  assert.deepEqual(JSON.parse(calls[0].raw), body);
});

test('onResponse also fires for each 429 retry attempt', async () => {
  const attempts = [];
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl, onResponse: ({ response, attempt }) => attempts.push([response.status, attempt]) });
  flakyCalls = 0;
  await client.request('/api/flaky/');
  assert.deepEqual(attempts, [[429, 0], [200, 1]]);
});

test('autoThrottle: false skips the proactive wait', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl, autoThrottle: false });
  await client.request('/api/exhausted/');
  const start = Date.now();
  await client.request('/api/retrieve/5/');
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 500, `expected no proactive wait, got ${elapsed}ms`);
});

test('an already-aborted signal rejects request() without waiting on anything', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  await assert.rejects(() => client.request('/api/retrieve/5/', {}, { signal: AbortSignal.abort() }), { name: 'AbortError' });
});

test('signal aborts a request stuck in a 429 retry wait, well before Retry-After elapses', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  always429Calls = 0;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 100);
  const start = Date.now();
  await assert.rejects(() => client.request('/api/always429/', {}, { signal: controller.signal }), { name: 'AbortError' });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 900, `expected the abort to cut the 1s retry wait short, got ${elapsed}ms`);
});

test('signal aborts a request stuck in a proactive throttle wait, well before the counter resets', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  await client.request('/api/exhausted/', { resetIn: 3 });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 100);
  const start = Date.now();
  await assert.rejects(() => client.request('/api/retrieve/5/', {}, { signal: controller.signal }), { name: 'AbortError' });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 1000, `expected the abort to cut the multi-second proactive wait short, got ${elapsed}ms`);
});

test('non-2xx responses throw MetronApiError with status and body', async () => {
  const client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
  await assert.rejects(
    () => client.request('/api/does-not-exist/'),
    (err) => {
      assert.ok(err instanceof MetronApiError);
      assert.equal(err.status, 404);
      assert.equal(err.body, 'not found');
      return true;
    },
  );
});
