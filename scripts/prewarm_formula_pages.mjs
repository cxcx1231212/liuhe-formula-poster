import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ORIGIN = 'https://liuhe-formula-poster.xcx8088.workers.dev';
const BOARD_DIR = join(process.cwd(), 'public', 'generated', 'home-board');
const MAX_PAGES = 180;
const TOP_PER_BOARD = 4;
const CONCURRENCY = 12;
const pad = (value) => String(value).padStart(3, '0');

function linksFrom(html, type) {
  const links = [];
  const pattern = /href=["']([^"']*\/posts\/[^"'#]+)["']/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const url = new URL(match[1].replaceAll('&amp;', '&'), ORIGIN);
      if (url.origin !== ORIGIN) continue;
      if (!url.searchParams.has('type')) url.searchParams.set('type', type);
      links.push(url.toString());
    } catch {}
  }
  return links;
}

function postUrl(boardKey, issue, method, index, type) {
  const dash = boardKey.indexOf('-');
  const board = dash < 0 ? boardKey : boardKey.slice(0, dash);
  const category = dash < 0 ? '' : boardKey.slice(dash + 1);
  const rank = method.rank ?? pad(index + 1);
  let path;
  if (board === 'pingte') path = '/' + (category === 'two' ? 'posts/pingte2' : 'posts/pingte') + '/' + issue + '/' + pad(index + 1);
  else if (board === 'tema' || board === 'zodiac') path = '/posts/' + board + '/' + category + '/' + issue + '/' + pad(index + 1);
  else if (board === 'fushi' || board === 'kill') path = '/posts/' + board + '/' + category + '/' + issue + '/' + rank;
  else path = '/posts/' + board + '/' + issue + '/' + rank;
  return ORIGIN + path + '?type=' + type;
}

async function load(url) {
  const response = await fetch(url, {
    headers: { accept: 'text/html', 'user-agent': 'formula-cache-warmer/2.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(response.status + ' ' + url);
  return { html: await response.text(), cache: response.headers.get('x-formula-global-cache') };
}

const queue = [];
const seen = new Set();
for (const file of (await readdir(BOARD_DIR)).sort()) {
  const match = file.match(/^type-(\d+)-(.+)\.json$/);
  if (!match) continue;
  const [, type, boardKey] = match;
  if (type === '1' || boardKey.startsWith('zodiac-')) continue;
  const payload = JSON.parse(await readFile(join(BOARD_DIR, file), 'utf8'));
  for (const [index, method] of (payload.methods || []).slice(0, TOP_PER_BOARD).entries()) {
    const url = postUrl(boardKey, payload.issue, method, index, type);
    if (!seen.has(url)) { seen.add(url); queue.push(url); }
  }
}

let warmed = 0;
let hits = 0;
while (queue.length && warmed < MAX_PAGES) {
  const batch = queue.splice(0, Math.min(CONCURRENCY, MAX_PAGES - warmed));
  const results = await Promise.allSettled(batch.map(async (url) => {
    const type = new URL(url).searchParams.get('type') || '1';
    return { result: await load(url), type };
  }));
  for (const item of results) {
    warmed += 1;
    if (item.status !== 'fulfilled') { console.warn(item.reason?.message || item.reason); continue; }
    if (item.value.result.cache === 'HIT') hits += 1;
    for (const link of linksFrom(item.value.result.html, item.value.type)) {
      if (!seen.has(link) && seen.size < MAX_PAGES) { seen.add(link); queue.push(link); }
    }
  }
}
console.log('Prewarmed ' + warmed + ' pages; global hits ' + hits + '; discovered ' + seen.size + '.');
