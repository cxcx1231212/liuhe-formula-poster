const encoder = new TextEncoder();
const LIFETIME = 7 * 24 * 60 * 60 * 1000;
export const SHARE_COOKIE = '__Host-formula_share';
const safePath = path => /^\/posts\/[a-z0-9/-]+$/.test(path) && !path.includes('//') && path.length <= 250;
const encode = text => btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
async function mac(secret, host, payload) {
  if (!secret) throw new Error('Share secret unavailable');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`post-share-v1:${host}:${payload}`))), byte => byte.toString(16).padStart(2,'0')).join('');
}
export async function createPostShare(secret, host, url) {
  if (!safePath(url.pathname)) throw new Error('Invalid share path');
  const type = ['1','5','8'].includes(url.searchParams.get('type')) ? url.searchParams.get('type') : '5';
  const payload = encode(JSON.stringify({path:url.pathname,type,expires:Date.now()+LIFETIME,nonce:crypto.randomUUID()}));
  return payload + '.' + await mac(secret,host,payload);
}
export async function verifyPostShare(secret, host, token) {
  try {
    if (!secret || typeof token !== 'string' || token.length > 1000 || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)) return null;
    const [payload, signature] = token.split('.');
    const expected = await mac(secret,host,payload);
    if (!crypto.subtle.timingSafeEqual(encoder.encode(expected),encoder.encode(signature))) return null;
    const data = JSON.parse(atob(payload.replaceAll('-','+').replaceAll('_','/')));
    if (!safePath(data.path) || !['1','5','8'].includes(data.type) || !Number.isSafeInteger(data.expires) || data.expires<=Date.now() || data.expires>Date.now()+LIFETIME+30000) return null;
    return data;
  } catch { return null; }
}
export function shareCookieFrom(request) {
  return (request.headers.get('cookie')||'').match(/(?:^|;\s*)__Host-formula_share=([A-Za-z0-9_.-]+)(?:;|$)/)?.[1] || null;
}
export function shareAllows(data, url, method) {
  if (method !== 'GET' && method !== 'HEAD' && !(method === 'POST' && url.pathname === '/api/view-count')) return false;
  if (url.pathname === data.path) return (url.searchParams.get('type')||'5') === data.type && [...url.searchParams.keys()].every(key=>['type','s','__formula_payload'].includes(key));
  if (url.pathname === '/api/view-count') return url.searchParams.get('path') === data.path;
  if (url.pathname === '/_entry/key' || ['/api/banner-ads','/api/site-list','/api/group-registration'].includes(url.pathname)) return true;
  // Only code/style/image assets needed to render this post, never business JSON.
  return /^\/(?:_next\/static|assets)\//.test(url.pathname) || /\.(?:css|js|woff2?|png|jpe?g|webp|svg|ico)$/.test(url.pathname) && !url.pathname.startsWith('/generated/');
}
