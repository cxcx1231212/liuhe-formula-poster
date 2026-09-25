import { readFileSync, writeFileSync } from 'node:fs';

const path = 'dist/server/wrangler.json';
const config = JSON.parse(readFileSync(path, 'utf8'));
if (config.route || (Array.isArray(config.routes) && config.routes.length)) {
  throw new Error('Backend has public routes; refusing to deploy an unprotected backend');
}
config.workers_dev = false;
config.preview_urls = false;
writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log('Backend public routes disabled');
