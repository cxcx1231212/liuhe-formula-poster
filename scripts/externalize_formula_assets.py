"""Idempotent source migration: load manifests through the existing ASSETS binding.

Only data access changes. Poster markup, formula logic, and history remain intact.
Run before the production build; commit the migrated sources after deployment.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

LOADER = '''// Manifest bytes belong in static assets, not the Worker executable.
async function loadManifest(path: string): Promise<any> {
  const assets = (env as unknown as {ASSETS: {fetch(request: Request): Promise<Response>}}).ASSETS;
  const response = await assets.fetch(new Request('https://assets.local' + path));
  if (!response.ok) throw new Error('Formula asset unavailable: ' + path + ' (' + response.status + ')');
  return response.json();
}
const map = (one: string, five: string, eight: string) => ({
  get 1() { return loadManifest(one); },
  get 5() { return loadManifest(five); },
  get 8() { return loadManifest(eight); },
} as Record<LotteryType, Promise<any>>);
'''


def migrate_library(source):
    if 'async function loadManifest(' in source:
        return source
    source, count = re.subn(r"import\s+(\w+)\s+from\s+['\"]\.\./public(/generated/[^'\"]+\.json)['\"];?", lambda m: f"const {m[1]} = {m[2]!r};", source)
    if not count:
        raise ValueError('No generated imports found; inspect manifest module before migration')
    # This unused analysis-only collection has no page consumers. The published
    # tema board continues to use the complete, existing tema-bundles manifests.
    source = re.sub(r"import temaOne[158] from '../data/tema/one-complete-type-[158]-2026.json';", '', source)
    source = source.replace('temaOne:map(temaOne1,temaOne5,temaOne8),', '')
    source, count = re.subn(r'const map\s*=.*?;\s*\n', LOADER, source, count=1)
    if count != 1:
        raise ValueError('Expected one manifest map declaration')
    return "import {env} from 'cloudflare:workers';\n" + source


ACCESS = re.compile(r'formulaManifests(?:\.\w+|\[kind\])\[type\]')


def migrate_page(source):
    if '/* asset-manifests-v1 */' in source:
        return source
    if not ACCESS.search(source):
        raise ValueError('Expected a known formula manifest access')
    source = source.replace('export default function TailHeadFormulaPost(', 'export default async function TailHeadFormulaPost(')
    if 'export default async function' not in source:
        raise ValueError('Manifest consumer is not an async server component')
    return '/* asset-manifests-v1 */\n' + ACCESS.sub(lambda m: '(await ' + m[0] + ')', source)


def main():
    library = ROOT / 'lib/formula-manifests.ts'
    changes = {library: migrate_library(library.read_text(encoding='utf-8'))}
    for path in (ROOT / 'app').rglob('*.tsx'):
        source = path.read_text(encoding='utf-8')
        if ACCESS.search(source):
            changes[path] = migrate_page(source)
    if len(changes) < 11:
        raise ValueError(f'Expected all 10 page consumers; found {len(changes)-1}')
    # Validate all transformations before touching any file.
    for path, source in changes.items():
        path.write_text(source, encoding='utf-8')
        print('Asset-backed formula data:', path.relative_to(ROOT), flush=True)


if __name__ == '__main__':
    main()
