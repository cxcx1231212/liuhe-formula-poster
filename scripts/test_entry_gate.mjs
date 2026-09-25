import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timingSafeEqual, webcrypto } from 'node:crypto';
import { checkEntry, sha256, PUBLIC_HOST } from '../worker/entry-gate.js';

Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
  getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  subtle: { digest: webcrypto.subtle.digest.bind(webcrypto.subtle), timingSafeEqual },
} });

function environment() {
  const sessions = new Map();
  const tickets = new Map();
  return {
    ENTRY_FIXED_KEY: 'test-entry-key',
    ENTRY_SESSION: { getByName(name) {
      if (!sessions.has(name)) {
        const state = { tokens: new Set(), active: false };
        sessions.set(name, {
          async issue(digest) { state.tokens.add(digest); },
          async consume(digest) { if (!state.tokens.delete(digest)) return false; state.active = true; return true; },
          async active() { return state.active; },
          async activate() { state.active = true; },
        });
      }
      return sessions.get(name);
    } },
    ENTRY_TICKET: { getByName(name) {
      if (!tickets.has(name)) {
        const state = { digest: null };
        tickets.set(name, {
          async issue(digest) { state.digest = digest; },
          async consume(digest) { if (state.digest !== digest) return false; state.digest = null; return true; },
        });
      }
      return tickets.get(name);
    } },
  };
}

const request = (path, cookie = '') => new Request(`https://${PUBLIC_HOST}${path}`, { headers: cookie ? { cookie } : {} });

test('outer parameter cases, inner once-only, cookie-only rejection and return home', async () => {
  const env = environment();
  assert.equal((await checkEntry(new Request(`http://${PUBLIC_HOST}/?t=test-entry-key`), env)).response.status, 403);
  for (const path of ['/?t=', '/?t=wrong', '/?t=test-entry-key&t=test-entry-key']) {
    assert.equal((await checkEntry(request(path), env)).response.status, 403);
  }
  assert.equal((await checkEntry(request('/'), env)).response.status, 200);
  const outer = (await checkEntry(request('/?t=test-entry-key'), env)).response;
  assert.equal(outer.status, 200);
  assert.match(await outer.text(), /<iframe[^>]+title="页面内容"/);
  const cookie = outer.headers.get('set-cookie').split(';')[0];
  const html = await (await checkEntry(request('/?t=test-entry-key'), env)).response.text();
  assert.match(html, /常用网址导航/);
  const freshOuter = (await checkEntry(request('/?t=test-entry-key'), env)).response;
  const freshCookie = freshOuter.headers.get('set-cookie').split(';')[0];
  const nonce = (await freshOuter.text()).match(/index\.html\?t=([a-f0-9]{64})/)[1];
  assert.equal((await checkEntry(request('/index.html', freshCookie), env)).response.status, 403);
  assert.equal((await checkEntry(request('/posts/x', freshCookie), env)).response.status, 403);
  assert.equal((await checkEntry(request('/generated/home-board/type-5-zodiac-1.json'), env)).response.status, 403);
  assert.equal((await checkEntry(request('/_entry/key'), env)).response.status, 403);
  const first = await checkEntry(request(`/index.html?t=${nonce}`, freshCookie), env);
  assert.equal(new URL(first.request.url).searchParams.get('__formula_inner'), '1');
  assert.equal((await checkEntry(request(`/index.html?t=${nonce}`, freshCookie), env)).response.status, 403);
  assert.equal((await checkEntry(request('/?__formula_inner=1', freshCookie), env)).response.status, 403);
  assert.equal((await checkEntry(request('/?__formula_payload=1', freshCookie), env)).response.status, 403);
  assert.ok((await checkEntry(request('/?__formula_inner=1&__formula_payload=1', freshCookie), env)).request);
  assert.ok((await checkEntry(request('/posts/x', freshCookie), env)).request);
  assert.ok((await checkEntry(request('/generated/home-board/type-5-zodiac-1.json', freshCookie), env)).request);
  const home = (await checkEntry(request('/_entry/home', freshCookie), env)).response;
  assert.equal(home.status, 302);
  assert.match(home.headers.get('location'), /index\.html\?t=/);
  assert.notEqual(cookie, freshCookie);

  const parallelOuter = (await checkEntry(request('/?t=test-entry-key'), env)).response;
  const parallelCookie = parallelOuter.headers.get('set-cookie').split(';')[0];
  const parallelNonce = (await parallelOuter.text()).match(/index\.html\?t=([a-f0-9]{64})/)[1];
  const attempts = await Promise.all([
    checkEntry(request(`/index.html?t=${parallelNonce}`, parallelCookie), env),
    checkEntry(request(`/index.html?t=${parallelNonce}`, parallelCookie), env),
  ]);
  assert.equal(attempts.filter(result => result.request).length, 1);
  assert.equal(attempts.filter(result => result.response?.status === 403).length, 1);
});

test('123 ticket is one-time and creates a separate formula session', async () => {
  const env = environment();
  const token = 'a'.repeat(64);
  const digest = await sha256(`${PUBLIC_HOST}:${token}`);
  await env.ENTRY_TICKET.getByName(digest).issue(digest);
  const path = `/open?t=${token}`;
  const [first, second] = await Promise.all([checkEntry(request(path), env), checkEntry(request(path), env)]);
  assert.deepEqual([first, second].map(result => result.response.status).sort(), [302, 403]);
  const cookie = (first.response.status === 302 ? first : second).response.headers.get('set-cookie').split(';')[0];
  assert.notEqual(cookie.split('=')[1], token);
  assert.equal((await checkEntry(request('/_entry/home', cookie), env)).response.status, 302);
});
