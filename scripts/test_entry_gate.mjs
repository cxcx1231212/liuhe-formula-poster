import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timingSafeEqual, webcrypto } from 'node:crypto';
import { checkEntry, issueReferralTicket, PUBLIC_HOST } from '../worker/entry-gate.js';

Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
  getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  randomUUID: () => 'test-random-nonce',
  subtle: { digest: webcrypto.subtle.digest.bind(webcrypto.subtle), importKey: webcrypto.subtle.importKey.bind(webcrypto.subtle), sign: webcrypto.subtle.sign.bind(webcrypto.subtle), timingSafeEqual },
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
        const state = { used: new Set() };
        tickets.set(name, {
          async consume(digest) { if (state.used.has(digest)) return false; state.used.add(digest); return true; },
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
  assert.equal((await checkEntry(request('/posts/x', freshCookie), env)).response.status,302);
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

test('automatic share link is reusable, scoped to one post and cannot enter home',async()=>{
 const env=environment();
 const outer=(await checkEntry(request('/?t=test-entry-key'),env)).response;
 const cookie=outer.headers.get('set-cookie').split(';')[0];
 const nonce=(await outer.text()).match(/index\.html\?t=([a-f0-9]{64})/)[1];
 await checkEntry(request('/index.html?t='+nonce,cookie),env);
 const opened=(await checkEntry(request('/posts/pingte/269/001?type=5',cookie),env)).response;
 assert.equal(opened.status,302);
 const link=opened.headers.get('location');
 assert.ok(link.includes('&s='));
 assert.ok(!link.includes(env.ENTRY_FIXED_KEY));
 const first=await checkEntry(request(link),env),second=await checkEntry(request(link),env);
 assert.ok(first.request);assert.ok(second.request);
 const sharedCookie=first.setCookie.split(';')[0];
 assert.ok((await checkEntry(request('/posts/pingte/269/001?type=5&__formula_payload=1',sharedCookie),env)).request);
 assert.ok((await checkEntry(request('/_entry/key',sharedCookie),env)).request);
 const token=new URL(link,'https://'+PUBLIC_HOST).searchParams.get('s');
 assert.ok((await checkEntry(new Request(`https://${PUBLIC_HOST}/posts/pingte/269/001?type=5&__formula_payload=1`,{headers:{'x-formula-share':token,cookie:'__Host-formula_share=wrong-tab-cookie'}}),env)).request);
 for(const path of ['/_entry/home','/index.html','/posts/pingte/269/002?type=5','/generated/home-board/type-5-zodiac-1.json','/api/formula-recommendations']) assert.equal((await checkEntry(request(path,sharedCookie),env)).response.status,403,path);
 assert.equal((await checkEntry(request(link.replace('/269/001','/269/002')),env)).response.status,403);
 assert.equal((await checkEntry(request(link+'&s=bad'),env)).response.status,403);
 const now=Date.now;Date.now=()=>now()+8*24*60*60*1000;
 try{assert.match(await (await checkEntry(request(link),env)).response.text(),/已过期/);}finally{Date.now=now;}
});

test('123 ticket is one-time and creates a separate formula session', async () => {
  const env = environment();
  const token = await issueReferralTicket(env.ENTRY_FIXED_KEY);
  assert.match(token, /^[a-f0-9]{140}$/);
  assert.equal((await checkEntry(request(`/open?t=${token.slice(0, -1)}${token.endsWith('0') ? '1' : '0'}`), env)).response.status, 403);
  const path = `/open?t=${token}`;
  const [first, second] = await Promise.all([checkEntry(request(path), env), checkEntry(request(path), env)]);
  assert.deepEqual([first, second].map(result => result.response.status).sort(), [302, 403]);
  const cookie = (first.response.status === 302 ? first : second).response.headers.get('set-cookie').split(';')[0];
  assert.notEqual(cookie.split('=')[1], token);
  assert.equal((await checkEntry(request('/_entry/home', cookie), env)).response.status, 302);
});

test('123 referral survives a reverse proxy and keeps the browser host', async () => {
  const env = environment();
  const proxyRequest = (path, cookie = '') => new Request(`https://gscf.668870.cc${path}`, { headers: cookie ? { cookie } : {} });
  const ticket = await issueReferralTicket(env.ENTRY_FIXED_KEY);
  const opened = (await checkEntry(proxyRequest(`/open?t=${ticket}`), env)).response;
  assert.equal(opened.status, 302);
  assert.equal(opened.headers.get('location'), '/_entry/home');
  const cookie = opened.headers.get('set-cookie').split(';')[0];
  const home = (await checkEntry(proxyRequest('/_entry/home', cookie), env)).response;
  assert.equal(home.status, 302);
  assert.match(home.headers.get('location'), /^\/index\.html\?t=/);
  assert.equal((await checkEntry(proxyRequest(`/open?t=${ticket}`), env)).response.status, 403);
});

test('return home on a second domain stays on that domain', async () => {
  const env = environment();
  const secondRequest = (path, cookie = '') => new Request(`https://new.example.com${path}`, { headers: cookie ? { cookie } : {} });
  const outer = (await checkEntry(secondRequest('/?t=test-entry-key'), env)).response;
  const cookie = outer.headers.get('set-cookie').split(';')[0];
  const nonce = (await outer.text()).match(/index\.html\?t=([a-f0-9]{64})/)[1];
  assert.ok((await checkEntry(secondRequest(`/index.html?t=${nonce}`, cookie), env)).request);
  const home = (await checkEntry(secondRequest('/_entry/home', cookie), env)).response;
  assert.match(home.headers.get('location'), /^\/index\.html\?t=/);
  const inner = (await checkEntry(secondRequest(home.headers.get('location'), cookie), env)).request;
  assert.equal(new URL(inner.url).host, 'new.example.com');
});
