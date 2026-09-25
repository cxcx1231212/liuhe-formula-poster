const encoder = new TextEncoder();
const MAX_PLAINTEXT_BYTES = 16 * 1024 * 1024;

async function readLimited(response) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_PLAINTEXT_BYTES) throw new Error('Business response exceeds encryption limit');
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const parts = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_PLAINTEXT_BYTES) {
      await reader.cancel();
      throw new Error('Business response exceeds encryption limit');
    }
    parts.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function base64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export async function sessionKey(secret, sessionId) {
  if (!secret || !/^[a-f0-9]{64}$/.test(sessionId || '')) throw new Error('Encrypted session unavailable');
  const master = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', master, encoder.encode(`formula-content-v1:${sessionId}`)));
}

export function keyResponse(keyBytes) {
  return Response.json({ key: base64(keyBytes) }, { headers: { 'cache-control': 'private, no-store', 'content-type': 'application/json; charset=utf-8' } });
}

export async function encryptResponse(response, keyBytes, plainType, html = false) {
  const source = await readLimited(response);
  let bytes = source;
  if (html) {
    const text = new TextDecoder().decode(source);
    const head = /<head(?:\s[^>]*)?>/i;
    if (!head.test(text)) throw new Error('Business page has no head element');
    bytes = encoder.encode(text.replace(head, match => `${match}<script>${BROWSER_DECRYPTOR}</script>`));
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('x-formula-encrypted', '1');
  headers.set('x-formula-plain-type', plainType);
  return new Response(JSON.stringify({ v: 1, iv: base64(iv), data: base64(ciphertext) }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const BROWSER_DECRYPTOR = `(function(){
  if(window.__formulaDecryptReady)return;
  window.__formulaDecryptReady=true;
  var originalFetch=window.fetch.bind(window);
  var keyPromise;
  function bytes(value){var raw=atob(value),out=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
  async function sessionKey(){
    if(!keyPromise)keyPromise=originalFetch('/_entry/key',{credentials:'same-origin',cache:'no-store'}).then(async function(response){
      if(!response.ok)throw new Error('加密密钥不可用');
      var payload=await response.json();
      return crypto.subtle.importKey('raw',bytes(payload.key),'AES-GCM',false,['decrypt']);
    });
    return keyPromise;
  }
  window.fetch=async function(){
    var response=await originalFetch.apply(null,arguments);
    if(response.headers.get('x-formula-encrypted')!=='1')return response;
    var payload=await response.json();
    if(payload.v!==1)throw new Error('不支持的加密载荷');
    var plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(payload.iv)},await sessionKey(),bytes(payload.data));
    var headers=new Headers(response.headers);
    headers.delete('x-formula-encrypted');headers.delete('x-formula-plain-type');headers.delete('content-length');
    headers.set('content-type',response.headers.get('x-formula-plain-type')||'application/octet-stream');
    return new Response(plain,{status:response.status,statusText:response.statusText,headers:headers});
  };
})();`;

export function encryptedPageShell(url) {
  const payload = new URL(url);
  payload.searchParams.set('__formula_payload', '1');
  const path = payload.pathname + payload.search;
  const script = `fetch(${JSON.stringify(path)},{credentials:'same-origin',cache:'no-store'}).then(function(response){if(!response.ok)throw new Error(response.status);return response.text()}).then(function(html){document.open();document.write(html);document.close()}).catch(function(){document.body.textContent='页面读取失败，请刷新重试'})`;
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面内容</title><script>${BROWSER_DECRYPTOR}</script></head><body><script>${script}</script></body></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
