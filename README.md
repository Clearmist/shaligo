# shaligo

A zero-dependency JavaScript client for the [Metron](https://metron.cloud) comic book database API, with automatic handling of Metron's [rate-limit scheme](https://github.com/Metron-Project/metron/blob/master/api/RATELIMIT.md) and full TypeScript types.

Covers the read-only (list/retrieve) surface of the API: `arc`, `character`, `creator`, `imprint`, `issue`, `publisher`, `role`, `series`, `seriesType`, `team`, `universe`, plus their nested sub-lists (`issue_list`, `series_list`). `credit` and `variant` are not included — the API only exposes create/update for those, no list or retrieve endpoints.

## Requirements

- Node.js 18+ (uses the built-in `fetch`)
- A Metron API token (generate one from your account settings at [metron.cloud](https://metron.cloud))

## Install

```bash
npm install shaligo
```

The runtime is plain JavaScript (no build step for consumers); TypeScript types are published alongside it in `dist/*.d.ts` and picked up automatically.

## Documentation

Full API reference (every resource, method, and type) is generated from source with [TypeDoc](https://typedoc.org) and published at each push to `main`: see the "Deploy docs" GitHub Actions workflow. To build it locally:

```bash
npm run docs   # writes static HTML to docs/
```

## Quick start

```js
import { MetronClient } from 'shaligo';

const client = new MetronClient({ token: process.env.METRON_TOKEN });

const page = await client.series.list({ name: 'Batman' });
console.log(page.count, page.results);

const series = await client.series.get(8477);
console.log(series);
```

## Pagination

Every `list()` method returns a single page (`{ count, next, previous, results }`). Each resource also has a `listAll()` async generator that walks every page for you, sleeping/retrying between requests as needed:

```js
for await (const issue of client.issue.listAll({ series_name: 'Batman' })) {
  console.log(issue.id, issue.issue);
}
```

## Nested sub-lists

A few resources expose a related list of issues or series:

```js
await client.arc.issueList(arcId, { page: 2 });
await client.character.issueList(characterId);
await client.publisher.seriesList(publisherId);
await client.series.issueList(seriesId);
await client.team.issueList(teamId);
```

Each has an `*All()` variant (`arc.issueListAll(arcId)`, etc.) that pages through the sub-list the same way `listAll()` does.

`role` and `seriesType` are list-only — they have no `get()`.

## Rate limiting

Metron enforces two independent counters per token: a short **burst** window and a longer **sustained** window. The actual limits vary by account (e.g. supporters get elevated sustained limits) and may change, so they're never hardcoded — `MetronClient` reads the live values from the `X-RateLimit-*` response headers on every request and, by default, pauses proactively before a request would exceed whichever counter is closer to its reset — sustained is checked first since it's slower to recover.

If a request still comes back `429`, the client honors the `Retry-After` header exactly and retries (up to `maxRetries`, default `3`) before giving up.

```js
const client = new MetronClient({
  token: process.env.METRON_TOKEN,
  autoThrottle: true, // set false to disable proactive waiting
  maxRetries: 3,
});

// Inspect the last known counter state without making a request:
client.getRateLimitStatus();
// => { burst: { limit, remaining, resetAt }, sustained: { limit, remaining, resetAt } }
```

A proactive wait or a 429 retry can each take anywhere from a couple of seconds to several minutes, with nothing else observable happening in between. This applies no matter how long the client lives. Pass `onThrottle` to hook into it (for logging, a UI status message, etc.) instead of it looking like a hang:

```js
const client = new MetronClient({
  token: process.env.METRON_TOKEN,
  onThrottle: ({ reason, waitMs, limitType }) => {
    console.warn(`waiting ${Math.round(waitMs / 1000)}s on the ${limitType} limit (${reason})`);
  },
});
```

### Inspecting requests and raw responses

Pass `onResponse` to see the exact URL requested and the raw `fetch` `Response` for every request the client makes, including paginated follow-ups. The response is a clone, so reading its body doesn't interfere with the client. It also fires for 429s that get retried and for non-2xx responses (`attempt` is zero-based and increments on retries):

```js
const client = new MetronClient({
  token: process.env.METRON_TOKEN,
  onResponse: async ({ url, response, attempt }) => {
    log.debug({ url, status: response.status, attempt, raw: await response.text() });
  },
});
```

### Short-lived clients

If a single `MetronClient` can stay alive for the life of your process, the normal case for a long-running server, skip this section: `autoThrottle` already works because the client accumulates real rate-limit history over time.

This section only matters when you can't rely on that: serverless functions (Lambda, Cloudflare Workers) may run each invocation on a different instance, or cold-start a fresh one with no memory of past requests, so anything you kept in a module-level variable isn't guaranteed to still be there next time. The same problem shows up in any code that constructs a new `MetronClient` per request instead of reusing one.

A fresh client always starts blind. With no rate-limit history of its own, `autoThrottle` can't act until its *own* first response, so it discovers an already-exhausted limit by hitting it, the same as if `autoThrottle` were off. The fix is to persist `getRateLimitStatus()` somewhere that *does* survive between invocations (a cache, a database row) and pass it back in as `rateLimitStatus` next time:

```js
const status = await loadPersistedRateLimitStatus(); // however you stored the last getRateLimitStatus()
const client = new MetronClient({ token: process.env.METRON_TOKEN, rateLimitStatus: status });

await client.series.get(8477);
await savePersistedRateLimitStatus(client.getRateLimitStatus());
```

`resetAt` round-trips fine as either a `Date` or the ISO string you get back from `JSON.stringify`.

### Cancelling a request

Every method that talks to the network (`request()`, `paginate()`, and every resource's `list()`/`get()`/`*List()`/`*All()`) takes an `AbortSignal` as its last argument. This cancels the underlying `fetch`, but just as importantly it also cuts short a proactive throttle wait or a 429 retry wait, either of which can otherwise run for minutes:

```js
const controller = new AbortController();
const promise = client.issue.get(2345, { signal: controller.signal });

// e.g. the caller gave up, or a client disconnected:
controller.abort();

await promise; // rejects with an AbortError
```

## Errors

- `MetronApiError` — thrown for any non-2xx response; has `status`, `body`, and `url`.
- `MetronRateLimitError` (extends `MetronApiError`) — thrown when `maxRetries` is exhausted on repeated 429s; also has `retryAfter` and `limitType` (`'burst'` or `'sustained'`).

```js
import { MetronApiError, MetronRateLimitError } from 'shaligo';

try {
  await client.series.get(999999999);
} catch (err) {
  if (err instanceof MetronApiError) {
    console.error(err.status, err.body);
  }
}
```

## Documentation

Full API reference can be found at [GitHub Pages](https://metron-project.github.io/shaligo/), generated with TypeDoc and published on each push to `main`.

## Development

```bash
npm test          # runs the suite (Node's built-in test runner + a local mock HTTP server, no real token needed)
npm run build:types  # type-checks src/*.js against the JSDoc annotations and emits dist/*.d.ts
npm run docs       # builds the TypeDoc reference site into docs/
```

Types are authored as JSDoc comments in `src/*.js` (see `src/types.js` for the response/param shapes) — there's no separate TypeScript source to keep in sync.

## License

LGPL-2.1-only, see [LICENSE](LICENSE).
