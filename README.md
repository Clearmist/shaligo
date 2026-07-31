# shaligo

A zero-dependency JavaScript client for the [Metron](https://metron.cloud) comic book database API, with automatic handling of Metron's [rate-limit scheme](https://github.com/Metron-Project/metron/blob/master/api/RATELIMIT.md).

Covers the read-only (list/retrieve) surface of the API: `arc`, `character`, `creator`, `imprint`, `issue`, `publisher`, `role`, `series`, `seriesType`, `team`, `universe`, plus their nested sub-lists (`issue_list`, `series_list`). `credit` and `variant` are not included — the API only exposes create/update for those, no list or retrieve endpoints.

## Requirements

- Node.js 18+ (uses the built-in `fetch`)
- A Metron API token (generate one from your account settings at [metron.cloud](https://metron.cloud))

## Install

This isn't published to npm; use it directly from the repo, e.g. as a git dependency or by copying it into your project.

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

## Testing

```bash
npm test
```

Runs the suite with Node's built-in test runner against a local mock HTTP server — no network access or real token required.

## License

LGPL-2.1-only, see [LICENSE](LICENSE).
