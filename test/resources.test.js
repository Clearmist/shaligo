import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MetronClient } from '../index.js';
import { startServer, rateLimitHeaders, sendJson } from './helpers/server.js';

let ctx;
let client;

before(async () => {
  ctx = await startServer((req, res, url) => {
    sendJson(
      res,
      200,
      {
        pathname: url.pathname,
        query: Object.fromEntries(url.searchParams),
        id: 1,
        count: 0,
        next: null,
        previous: null,
        results: [],
      },
      rateLimitHeaders(),
    );
  });
  client = new MetronClient({ token: 't', baseUrl: ctx.baseUrl });
});

after(() => ctx.close());

const simpleResources = ['arc', 'character', 'creator', 'imprint', 'issue', 'publisher', 'series', 'team', 'universe'];

for (const name of simpleResources) {
  test(`${name}.list() hits /api/${name}/`, async () => {
    const data = await client[name].list({ name: 'x' });
    assert.equal(data.pathname, `/api/${name}/`);
    assert.equal(data.query.name, 'x');
  });

  test(`${name}.get(id) hits /api/${name}/{id}/`, async () => {
    const data = await client[name].get(42);
    assert.equal(data.pathname, `/api/${name}/42/`);
  });
}

test('role and seriesType have no get() (list-only endpoints)', () => {
  assert.equal(client.role.get, undefined);
  assert.equal(client.seriesType.get, undefined);
  assert.equal(typeof client.role.list, 'function');
  assert.equal(typeof client.seriesType.list, 'function');
});

test('role.list() hits /api/role/', async () => {
  const data = await client.role.list();
  assert.equal(data.pathname, '/api/role/');
});

test('seriesType.list() hits /api/series_type/', async () => {
  const data = await client.seriesType.list();
  assert.equal(data.pathname, '/api/series_type/');
});

test('arc.issueList(id) hits /api/arc/{id}/issue_list/', async () => {
  const data = await client.arc.issueList(7, { page: 2 });
  assert.equal(data.pathname, '/api/arc/7/issue_list/');
  assert.equal(data.query.page, '2');
});

test('character.issueList(id) hits /api/character/{id}/issue_list/', async () => {
  const data = await client.character.issueList(7);
  assert.equal(data.pathname, '/api/character/7/issue_list/');
});

test('publisher.seriesList(id) hits /api/publisher/{id}/series_list/', async () => {
  const data = await client.publisher.seriesList(7);
  assert.equal(data.pathname, '/api/publisher/7/series_list/');
});

test('series.issueList(id) hits /api/series/{id}/issue_list/', async () => {
  const data = await client.series.issueList(7);
  assert.equal(data.pathname, '/api/series/7/issue_list/');
});

test('team.issueList(id) hits /api/team/{id}/issue_list/', async () => {
  const data = await client.team.issueList(7);
  assert.equal(data.pathname, '/api/team/7/issue_list/');
});

test('sub-list *All() variants are async generators that paginate the sub path', async () => {
  const items = [];
  for await (const item of client.arc.issueListAll(7)) items.push(item);
  assert.deepEqual(items, []);
});

test('get()/list()/sub-list methods forward `signal` down to the underlying request', async () => {
  await assert.rejects(() => client.issue.get(42, { signal: AbortSignal.abort() }), { name: 'AbortError' });
  await assert.rejects(() => client.issue.list({}, { signal: AbortSignal.abort() }), { name: 'AbortError' });
  await assert.rejects(() => client.arc.issueList(7, {}, { signal: AbortSignal.abort() }), { name: 'AbortError' });
});
