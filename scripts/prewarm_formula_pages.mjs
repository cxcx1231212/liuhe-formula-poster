const ORIGIN = 'https://liuhe-formula-poster.xcx8088.workers.dev';
const MAX_PAGES = 600;
const CONCURRENCY = 6;

function linksFrom(html, type) {
  const links = [];
  const pattern = /href=["']([^"']*\/posts\/[^"'#]+)["']/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const raw = match[1].replaceAll('&amp;', '&');
      const url = new URL(raw, ORIGIN);
      if (url.origin !== ORIGIN) continue;
      if (!url.searchParams.has('type')) url.searchParams.set('type', type);
      links.push(url.toString());
    } catch {}
  }
  return links;
}

async function load(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html',
      'user-agent': 'formula-cache-warmer/1.0',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(response.status + ' ' + url);
  return { html: await response.text(), cache: response.headers.get('x-formula-global-cache') };
}

const queue = [];
const seen = new Set();
for (const type of ['1', '5', '8']) {
  const home = await load(ORIGIN + '/?type=' + type);
  for (const link of linksFrom(home.html, type)) {
    if (!seen.has(link)) {
      seen.add(link);
      queue.push(link);
    }
  }
}

let warmed = 0;
let hits = 0;
while (queue.length && warmed < MAX_PAGES) {
  const batch = queue.splice(0, CONCURRENCY);
  const results = await Promise.allSettled(batch.map(async (url) => {
    const type = new URL(url).searchParams.get('type') || '1';
    const result = await load(url);
    return { result, type };
  }));

  for (const item of results) {
    warmed += 1;
    if (item.status !== 'fulfilled') {
      console.warn(item.reason?.message || item.reason);
      continue;
    }
    if (item.value.result.cache === 'HIT') hits += 1;
    for (const link of linksFrom(item.value.result.html, item.value.type)) {
      if (!seen.has(link) && seen.size < MAX_PAGES) {
        seen.add(link);
        queue.push(link);
      }
    }
  }
}

console.log('Prewarmed ' + warmed + ' pages; global hits ' + hits + '; discovered ' + seen.size + '.');
