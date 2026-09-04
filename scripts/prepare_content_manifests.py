"""Keep original poster renderers aligned with the published lottery catalog."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PINGTE = '''import type {LotteryType} from './lottery';
import {env} from 'cloudflare:workers';
import catalog from '../public/generated/lottery-catalog.json';

async function load(type:LotteryType,folder:string){
  const current=catalog.find(row=>String(row.lotteryType)===String(type));
  if(!current)throw new Error('Missing lottery catalog: '+type);
  const issue=String(current.nextPeriod).padStart(3,'0');
  const path='/generated/'+folder+'/type-'+type+'-'+issue+'-manifest.json';
  const assets=(env as unknown as {ASSETS:{fetch(request:Request):Promise<Response>}}).ASSETS;
  const response=await assets.fetch(new Request('https://assets.local'+path));
  if(!response.ok)throw new Error('Missing current manifest: '+path);
  const data=await response.json() as any;
  if(Number(data.issue)!==Number(current.nextPeriod))throw new Error('Stale content manifest: '+path);
  return data;
}
const map=(folder:string)=>({get 1(){return load('1',folder)},get 5(){return load('5',folder)},get 8(){return load('8',folder)}});
export const pingteManifests={pingte:map('pingte-all'),wuxing:map('wuxing')};
export function requestedLotteryType(query:Record<string,string|string[]|undefined>):LotteryType{
  const value=typeof query.type==='string'?query.type:'5';
  return value==='1'||value==='8'?value:'5';
}
'''


def run():
    catalog = json.loads((ROOT / 'public/generated/lottery-catalog.json').read_text(encoding='utf-8'))
    issues = {str(row['lotteryType']): int(row['nextPeriod']) for row in catalog}
    if set(issues) != {'1', '5', '8'}:
        raise RuntimeError('Incomplete lottery catalog')
    # Check every current board and every zodiac size before touching readers.
    folders = ('pingte-all', 'pingte-two', 'tema-bundles', 'zodiac', 'fushi', 'danshuang', 'wave', 'wuxing', 'jiaye', 'kill', 'size', 'tail', 'head')
    for kind, issue in issues.items():
        for folder in folders:
            path = ROOT / f'public/generated/{folder}/type-{kind}-{issue:03d}-manifest.json'
            data = json.loads(path.read_text(encoding='utf-8'))
            if int(data.get('issue', data.get('nextPeriod', -1))) != issue:
                raise RuntimeError(f'Stale board manifest: {path}')
        for size in (1, 3, 6, 9):
            path = ROOT / f'public/generated/zodiac/type-{kind}-{issue:03d}-{size}-manifest.json'
            data = json.loads(path.read_text(encoding='utf-8'))
            if int(data['issue']) != issue or not data['group']['methods']:
                raise RuntimeError(f'Invalid zodiac split: {path}')
        print(f'Content catalog verified: type={kind} issue={issue} boards={len(folders)} zodiac_sizes=4', flush=True)
    (ROOT / 'lib/pingte-manifests.ts').write_text(PINGTE, encoding='utf-8')
    zodiac = ROOT / 'lib/zodiac-manifests.ts'
    source = zodiac.read_text(encoding='utf-8')
    if 'lottery-catalog.json' not in source:
        source = "import catalog from '../public/generated/lottery-catalog.json';\n" + source
    source, count = re.subn(r'const issues(?::Record<LotteryType,string>)?=.*?;', "const issues=Object.fromEntries(catalog.map(row=>[String(row.lotteryType),String(row.nextPeriod).padStart(3,'0')])) as Record<LotteryType,string>;", source)
    if count != 1:
        raise RuntimeError('Unexpected zodiac issue selector')
    zodiac.write_text(source, encoding='utf-8')
    route = ROOT / 'app/posts/pingte/[issue]/[method]/page.tsx'
    source = route.read_text(encoding='utf-8')
    source = source.replace('const manifest=pingteManifests.pingte[type];', 'const manifest=await pingteManifests.pingte[type];')
    source = source.replace('pingteManifests.wuxing[type].draws', '(await pingteManifests.wuxing[type]).draws')
    if 'const manifest=await pingteManifests.pingte[type];' not in source or '(await pingteManifests.wuxing[type]).draws' not in source:
        raise RuntimeError('Unexpected pingte reader')
    route.write_text(source, encoding='utf-8')
    common = ROOT / 'lib/formula-manifests.ts'
    if common.exists():
        source = common.read_text(encoding='utf-8')
        source = re.sub(r'type-([158])-\d+-manifest\.json', lambda match: f'type-{match[1]}-{issues[match[1]]:03d}-manifest.json', source)
        common.write_text(source, encoding='utf-8')
    # Reject any remaining stale hard-coded generated references in page readers.
    for path in (ROOT / 'lib').glob('*manifests.ts'):
        for kind, period in re.findall(r'type-([158])-(\d+)-manifest\.json', path.read_text(encoding='utf-8')):
            if int(period) != issues[kind]:
                raise RuntimeError(f'Stale hard-coded reference in {path}: type={kind} issue={period}')


if __name__ == '__main__':
    run()
