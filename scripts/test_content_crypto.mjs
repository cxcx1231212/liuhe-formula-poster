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
  let decrypted=await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(atob(payload.iv), char => char.charCodeAt(0)) }, decryptKey, Uint8Array.from(atob(payload.data), char => char.charCodeAt(0)));
  if(payload.encoding==='gzip')decrypted=await new Response(new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const plaintext = new TextDecoder().decode(decrypted);
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
  runInNewContext(BROWSER_DECRYPTOR, { window, crypto: webcrypto, atob, Headers, Response, Uint8Array, Error, Blob, DecompressionStream });
  const response = await window.fetch('/api/latest');
  assert.deepEqual(await response.json(), { answer: 42 });
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.equal(keyCalls, 1);
});

test('large encrypted boards compress before encryption and decrypt in browser',async()=>{
 const data={methods:Array.from({length:1000},()=>({title:'算法过程完整展示',value:42}))};
 const original=await encryptResponse(Response.json(data),key,'application/json');
 const envelope=await original.clone().json();
 assert.equal(envelope.encoding,'gzip');
 assert.ok(envelope.data.length<JSON.stringify(data).length/5);
 const window={fetch:async input=>input==='/_entry/key'?keyResponse(key):original.clone()};
 runInNewContext(BROWSER_DECRYPTOR,{window,crypto:webcrypto,atob,Headers,Response,Uint8Array,Error,Blob,DecompressionStream});
 assert.deepEqual(await (await window.fetch('/generated/board.json')).json(),data);
});

test('each shared tab keeps its own credential and never sends it cross-origin',async()=>{
 const requests=[];const encrypted=await encryptResponse(Response.json({answer:42}),key,'application/json');
 const window={location:{href:'https://example.com/posts/pingte/269/001?type=5&s=tab-token',origin:'https://example.com'},fetch:async(input,init)=>{requests.push({input,headers:new Headers(init?.headers)});return input==='/_entry/key'?keyResponse(key):encrypted.clone()}};
 runInNewContext(BROWSER_DECRYPTOR,{window,crypto:webcrypto,atob,Headers,Response,Uint8Array,Error,Blob,DecompressionStream,URL});
 assert.deepEqual(await (await window.fetch('/posts/pingte/269/001?__formula_payload=1')).json(),{answer:42});
 assert.ok(requests.every(row=>row.headers.get('x-formula-share')==='tab-token'));
 await window.fetch('https://external.example.com/data');
 assert.equal(requests.at(-1).headers.has('x-formula-share'),false);
});
