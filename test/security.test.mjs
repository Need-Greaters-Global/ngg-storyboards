// Security regression tests for the storyboard APIs. Run with: npm test
// These never touch a real database: every case is decided before a query runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAdminKey, MIN_ADMIN_KEY_LENGTH } from '../api/_lib/admin-auth.js';
import adminHandler from '../api/admin/comments.js';
import commentsHandler from '../api/comments.js';

const GOOD_KEY = 'k'.repeat(MIN_ADMIN_KEY_LENGTH + 8); // test-only value

function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.end = () => res;
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  return res;
}

async function call(handler, req, env = {}) {
  const saved = { ADMIN_KEY: process.env.ADMIN_KEY, DATABASE_URL: process.env.DATABASE_URL };
  delete process.env.ADMIN_KEY;
  delete process.env.DATABASE_URL;
  Object.assign(process.env, env);
  try {
    const res = fakeRes();
    await handler({ headers: {}, query: {}, ...req }, res);
    return res;
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

test('checkAdminKey refuses everything when ADMIN_KEY is missing', () => {
  assert.deepEqual(checkAdminKey('anything', undefined).status, 503);
  assert.deepEqual(checkAdminKey('', '').status, 503);
});

test('checkAdminKey refuses a short ADMIN_KEY even when the header matches it', () => {
  const short = 'x'.repeat(MIN_ADMIN_KEY_LENGTH - 1);
  assert.equal(checkAdminKey(short, short).status, 503);
});

test('checkAdminKey accepts only the exact configured key', () => {
  assert.equal(checkAdminKey(GOOD_KEY, GOOD_KEY).ok, true);
  assert.equal(checkAdminKey(GOOD_KEY + 'x', GOOD_KEY).status, 401);
  assert.equal(checkAdminKey(undefined, GOOD_KEY).status, 401);
  assert.equal(checkAdminKey([GOOD_KEY], GOOD_KEY).status, 401);
});

test('admin API has no built-in key: unset ADMIN_KEY gives 503 for any header', async () => {
  const res = await call(adminHandler, { method: 'GET', headers: { 'x-admin-key': 'guess' } });
  assert.equal(res.statusCode, 503);
});

test('admin API rejects a wrong key with 401 and sends no CORS header', async () => {
  const res = await call(adminHandler, { method: 'GET', headers: { 'x-admin-key': 'wrong' } }, { ADMIN_KEY: GOOD_KEY });
  assert.equal(res.statusCode, 401);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('admin API passes auth with the right key (then stops at the missing database)', async () => {
  const res = await call(adminHandler, { method: 'GET', headers: { 'x-admin-key': GOOD_KEY } }, { ADMIN_KEY: GOOD_KEY });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'Database is not configured');
});

test('admin PATCH rejects an unknown status', async () => {
  const res = await call(
    adminHandler,
    { method: 'PATCH', headers: { 'x-admin-key': GOOD_KEY }, body: { id: 1, status: 'hacked' } },
    { ADMIN_KEY: GOOD_KEY, DATABASE_URL: 'postgresql://user:pass@localhost.invalid/db' }
  );
  assert.equal(res.statusCode, 400);
});

test('comments API reports a missing database instead of crashing', async () => {
  const res = await call(commentsHandler, { method: 'GET', query: { client: 'a', project: 'b' } });
  assert.equal(res.statusCode, 503);
});

test('comments API rejects over-long fields and sends no CORS header', async () => {
  const res = await call(
    commentsHandler,
    { method: 'POST', body: { client: 'a', project: 'b', author_name: 'n', comment_text: 'x'.repeat(5001) } },
    { DATABASE_URL: 'postgresql://user:pass@localhost.invalid/db' }
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('comments API rejects a non-numeric scene', async () => {
  const res = await call(
    commentsHandler,
    { method: 'POST', body: { client: 'a', project: 'b', scene: 'x', author_name: 'n', comment_text: 'hi' } },
    { DATABASE_URL: 'postgresql://user:pass@localhost.invalid/db' }
  );
  assert.equal(res.statusCode, 400);
});
