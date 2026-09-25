const SESSION_COOKIE = '__Host-formula_session';
export const PUBLIC_HOST = 'txgs888.q3665.com';
const NONCE_LIFETIME_MS = 2 * 60 * 1000;
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;
const encoder = new TextEncoder();

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function secretMatches(provided, expected) {
  const [left, right] = await Promise.all([sha256(provided), sha256(expected)]);
  return crypto.subtle.timingSafeEqual(encoder.encode(left), encoder.encode(right));
}

async function ticketMac(secret, host, payload) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${host}:${payload}`)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function issueReferralTicket(secret, host = PUBLIC_HOST) {
  if (!secret) throw new Error('Entry secret unavailable');
  const expiry = (Date.now() + NONCE_LIFETIME_MS).toString(16).padStart(12, '0');
  const payload = expiry + randomToken();
  return payload + await ticketMac(secret, host, payload);
}

async function verifyReferralTicket(token, secret, host) {
  if (!secret || !/^[a-f0-9]{140}$/.test(token)) return null;
  const payload = token.slice(0, 76);
  const expiry = Number.parseInt(payload.slice(0, 12), 16);
  const now = Date.now();
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + NONCE_LIFETIME_MS + 30_000) return null;
  const expected = await ticketMac(secret, host, payload);
  return crypto.subtle.timingSafeEqual(encoder.encode(expected), encoder.encode(token.slice(76))) ? expiry : null;
}

function forbidden() {
  return new Response('禁止访问', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

export function cookieFrom(request) {
  const match = (request.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-formula_session=([a-f0-9]{64})(?:;|$)/);
  return match?.[1] || null;
}

function sessionStub(env, host, sessionId) {
  return env.ENTRY_SESSION.getByName(`${host}:${sessionId}`);
}

async function issueCredential(stub, host, sessionId) {
  const credential = randomToken();
  await stub.issue(await sha256(`${host}:${sessionId}:${credential}`), Date.now() + NONCE_LIFETIME_MS);
  return credential;
}

function indexUrl(url, credential) {
  const next = new URL('/index.html', url);
  next.searchParams.set('t', credential);
  const type = url.searchParams.get('type');
  if (['1', '5', '8'].includes(type)) next.searchParams.set('type', type);
  return next.pathname + next.search;
}

function outerPage(innerUrl) {
  const safeUrl = innerUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>常用网址导航</title><style>html,body{height:100%;margin:0}iframe{border:0;width:100%;height:100%}.ordinary-navigation{display:none}</style></head><body><nav class="ordinary-navigation"><a href="https://www.cloudflare.com/">常用网址</a></nav><iframe src="${safeUrl}" title="页面内容" referrerpolicy="no-referrer"></iframe></body></html>`;
}

function ordinaryNavigation() {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>常用网址导航</title></head><body><h1>常用网址导航</h1><nav><a href="https://www.cloudflare.com/">Cloudflare</a></nav></body></html>';
}

function htmlResponse(html, extraHeaders = {}) {
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...extraHeaders } });
}

export async function checkEntry(request, env) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:') return { response: forbidden() };
  const params = url.searchParams.getAll('t');
  const sessionId = cookieFrom(request);
  const existing = sessionId ? sessionStub(env, url.host, sessionId) : null;

  if (url.pathname === '/') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return { response: forbidden() };
    if (!params.length) {
      if (url.searchParams.has('__formula_inner') || url.searchParams.has('__formula_payload')) {
        if (url.searchParams.get('__formula_inner') !== '1' || url.searchParams.get('__formula_payload') !== '1' || !existing || !(await existing.active(Date.now()))) return { response: forbidden() };
        return { request };
      }
      return { response: htmlResponse(ordinaryNavigation()) };
    }
    if (params.length !== 1 || !params[0] || !env.ENTRY_FIXED_KEY || !(await secretMatches(params[0], env.ENTRY_FIXED_KEY))) return { response: forbidden() };
    const nextSession = randomToken();
    const stub = sessionStub(env, url.host, nextSession);
    const credential = await issueCredential(stub, url.host, nextSession);
    const response = htmlResponse(outerPage(indexUrl(url, credential)), {
      'set-cookie': `${SESSION_COOKIE}=${nextSession}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_LIFETIME_MS / 1000}`,
    });
    return { response };
  }

  if (url.pathname === '/_entry/home') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return { response: forbidden() };
    if (!existing || !(await existing.active(Date.now()))) return { response: forbidden() };
    const credential = await issueCredential(existing, url.host, sessionId);
    return { response: Response.redirect(new URL(indexUrl(url, credential), `https://${PUBLIC_HOST}`), 302) };
  }

  if (url.pathname === '/open') {
    if (request.method !== 'GET' || params.length !== 1 || !env.ENTRY_TICKET) return { response: forbidden() };
    const target = url.searchParams.get('to') || '/_entry/home';
    if (!target.startsWith('/') || target.startsWith('//') || !(target === '/_entry/home' || target.startsWith('/posts/'))) return { response: forbidden() };
    const expiry = await verifyReferralTicket(params[0], env.ENTRY_FIXED_KEY, PUBLIC_HOST);
    if (!expiry) return { response: forbidden() };
    const digest = await sha256(`${PUBLIC_HOST}:${params[0]}`);
    if (!(await env.ENTRY_TICKET.getByName(digest).consume(digest, expiry))) return { response: forbidden() };
    const nextSession = randomToken();
    await sessionStub(env, url.host, nextSession).activate(Date.now() + SESSION_LIFETIME_MS);
    const response = new Response(null, { status: 302, headers: {
      location: new URL(target, `https://${PUBLIC_HOST}`).toString(),
      'set-cookie': `${SESSION_COOKIE}=${nextSession}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_LIFETIME_MS / 1000}`,
    } });
    return { response };
  }

  if (url.pathname === '/index.html') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return { response: forbidden() };
    if (params.length !== 1 || !params[0] || !sessionId) return { response: forbidden() };
    const digest = await sha256(`${url.host}:${sessionId}:${params[0]}`);
    if (!(await existing.consume(digest, Date.now(), Date.now() + SESSION_LIFETIME_MS))) return { response: forbidden() };
    url.pathname = '/';
    url.searchParams.delete('t');
    url.searchParams.set('__formula_inner', '1');
    return { request: new Request(url.toString(), request) };
  }

  if (!existing || !(await existing.active(Date.now()))) return { response: forbidden() };
  if (params.length) return { response: forbidden() };
  return { request };
}
