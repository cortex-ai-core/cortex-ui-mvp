import assert from 'node:assert/strict';
import { test } from 'node:test';
import Fastify from '../../Cortex/node_modules/fastify/fastify.js';
import userSettings from '../../Cortex/backend/routes/settings/UserSettings.js';

async function fixture({ user = { id: 'signed-in-user', active: true }, stored = null, fail = false, authenticated = true } = {}) {
  const app = Fastify();
  const writes = [];
  const reads = [];
  app.decorate('supabase', {
    from(table) {
      const query = {
        select() { return query; },
        eq(column, value) { reads.push({ table, column, value }); return query; },
        async maybeSingle() { return table === 'user' ? { data: user } : { data: stored, error: fail ? new Error('database unavailable') : null }; },
        upsert(row, options) { writes.push({ row, options }); stored = { response_style: row.response_style }; return query; },
        async single() { return { data: stored, error: fail ? new Error('database unavailable') : null }; },
      };
      return query;
    },
  });
  app.addHook('preHandler', async (req) => { if (authenticated) req.user = { userId: 'signed-in-user' }; });
  await app.register(userSettings);
  return { app, writes, reads };
}

const url = '/api/settings/user/preferences';
test('missing preferences default to neutral without inserting a row', async () => {
  const { app, writes } = await fixture();
  try { const result = await app.inject({ url }); assert.equal(result.statusCode, 200); assert.equal(result.json().preferences.response_style, 'neutral'); assert.equal(writes.length, 0); } finally { await app.close(); }
});
test('save and reload persist the chosen style under the authenticated application ID', async () => {
  const { app, writes, reads } = await fixture();
  try {
    for (const response_style of ['ceo', 'neutral', 'king', 'advisory', 'recruiting', 'cybersecurity', 'datamanagement', 'ventures']) {
      const result = await app.inject({ method: 'PATCH', url, payload: { response_style } });
      assert.equal(result.statusCode, 200);
      assert.equal((await app.inject({ url })).json().preferences.response_style, response_style);
    }
    assert.ok(writes.every(({ row, options }) => row.user_id === 'signed-in-user' && options.onConflict === 'user_id'));
    assert.ok(reads.every(({ value }) => value === 'signed-in-user'));
  } finally { await app.close(); }
});
test('rejects invalid styles and caller-provided ownership', async () => {
  const { app, writes } = await fixture();
  try {
    for (const payload of [{}, { response_style: 'invalid' }, { response_style: 'ceo', user_id: 'someone-else' }, { response_style: null }, []]) {
      assert.equal((await app.inject({ method: 'PATCH', url, payload })).statusCode, 400);
    }
    assert.equal(writes.length, 0);
  } finally { await app.close(); }
});
test('inactive, missing, and unauthenticated users cannot read or write preferences', async () => {
  for (const options of [{ user: null }, { user: { id: 'signed-in-user', active: false } }, { authenticated: false }]) {
    const { app, writes } = await fixture(options);
    try {
      for (const method of ['GET', 'PATCH']) {
        const result = await app.inject({ method, url, ...(method === 'PATCH' ? { payload: { response_style: 'ceo' } } : {}) });
        assert.equal(result.statusCode, options.authenticated === false ? 401 : 403);
      }
      assert.equal(writes.length, 0);
    } finally { await app.close(); }
  }
});
test('database failures return errors instead of defaults or success', async () => {
  const { app } = await fixture({ fail: true });
  try {
    assert.equal((await app.inject({ url })).statusCode, 500);
    assert.equal((await app.inject({ method: 'PATCH', url, payload: { response_style: 'ceo' } })).statusCode, 500);
  } finally { await app.close(); }
});
