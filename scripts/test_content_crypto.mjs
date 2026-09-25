import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import { BROWSER_DECRYPTOR, encryptResponse, encryptedPageShell, keyResponse, sessionKey } from '../worker/content-crypto.js';

Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
const sessionId = 'a'.repeat(64);
const key = await sessionKey('test-secret', sessionId);

test('HTML and JSON content are authenticated ciphertext, not initial HTML', async () => {
  const html = '<html><head></head><body>私有帖子内容</body></html>';
  const encrypted = await encryptResponse(new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } }), key, 'text/html; charset=utf-8', true);
  const serialized = await encrypted.text();
  assert.equal(encrypted.headers.get('x-formula-encrypted'), '1');
  assert.doesNotMatch(serialized, /私有帖子内容/);
  const payload = JSON.parse(serialized);
  const decryptKey = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const plaintext = new TextDecoder().decode(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(atob(payload.iv), char => char.charCodeAt(0)) }, decryptKey, Uint8Array.from(atob(payload.data), char => char.charCodeAt(0))));
  assert.match(plaintext, /私有帖子内容/);
  assert.match(plaintext, /__formulaDecryptReady/);
  payload.data = payload.data.slice(0, -4) + 'AAAA';
  await assert.rejects(webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(atob(payload.iv), char => char.charCodeAt(0)) }, decryptKey, Uint8Array.from(atob(payload.data), char => char.charCodeAt(0))));

  const one = await encryptResponse(Response.json({ secret: 'only-in-ciphertext' }), key, 'application/json');
  const two = await encryptResponse(Response.json({ secret: 'only-in-ciphertext' }), key, 'application/json');
  assert.notEqual((await one.json()).iv, (await two.json()).iv);
  const shell = await encryptedPageShell(new URL('https://txgs888.q3665.com/posts/123'));
  assert.doesNotMatch(await shell.text(), /私有帖子内容/);
});

test('browser fetch shim decrypts authenticated JSON and leaves key endpoint plaintext', async () => {
  const original = await encryptResponse(Response.json({ answer: 42 }), key, 'application/json');
  const keyReply = keyResponse(key);
  let keyCalls = 0;
  const window = { fetch: async input => {
    if (input === '/_entry/key') { keyCalls += 1; return keyReply.clone(); }
    return original.clone();
  } };
  runInNewContext(BROWSER_DECRYPTOR, { window, crypto: webcrypto, atob, Headers, Response, Uint8Array, Error });
  const response = await window.fetch('/api/latest');
  assert.deepEqual(await response.json(), { answer: 42 });
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.equal(keyCalls, 1);
});
