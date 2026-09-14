import test from 'node:test';
import assert from 'node:assert/strict';
import { sleep } from '../src/util.js';

test('sleep() resolves after roughly the given delay when there is no signal', async () => {
  const start = Date.now();
  await sleep(50);
  assert.ok(Date.now() - start >= 45, 'expected sleep to wait roughly 50ms');
});

test('sleep() resolves normally when the signal never aborts', async () => {
  const controller = new AbortController();
  await sleep(20, controller.signal);
});

test('sleep() rejects immediately if the signal is already aborted', async () => {
  const start = Date.now();
  await assert.rejects(() => sleep(10_000, AbortSignal.abort()), { name: 'AbortError' });
  assert.ok(Date.now() - start < 100, 'expected an immediate rejection, not a wait');
});

test('sleep() rejects as soon as the signal aborts mid-wait, without waiting out the full delay', async () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 20);
  const start = Date.now();
  await assert.rejects(() => sleep(10_000, controller.signal), { name: 'AbortError' });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 500, `expected the abort to cut the wait short, got ${elapsed}ms`);
});
