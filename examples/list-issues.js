import { MetronClient } from '../index.js';

const client = new MetronClient({ token: process.env.METRON_TOKEN });

// Single page.
const page = await client.series.list({ name: 'Batman' });
console.log(`page 1 of ${page.count} series`);

// Every matching issue across all pages, fetched lazily and throttled
// automatically according to the API's rate-limit headers.
for await (const issue of client.issue.listAll({ series_name: 'Batman' })) {
  console.log(issue.id, issue.issue);
}

console.log(client.getRateLimitStatus());
