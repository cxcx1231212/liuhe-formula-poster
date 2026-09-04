"""Keep original poster renderers aligned with the published lottery catalog."""
import json
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Repairs are applied before cache versioning, so old HTML cannot mask a fix.
def kill_value(category, number):
    number = int(number)
    while number > 49: number -= 12
    while number < 1: number += 12
    if category == 'code': return str(number)
    if category == 'animal': return '马蛇龙兔虎牛鼠猪狗鸡猴羊'[(number - 1) % 12]
    if category == 'tail': return str(number % 10)
    if category == 'head': return str(number // 10)
    if category == 'wave':
        red = {1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46}
        blue = {3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48}
        return '红波' if number in red else '蓝波' if number in blue else '绿波'
    raise ValueError('Unknown kill category: ' + category)


def kill_branch(name, draw, category):
    match = re.fullmatch(r'(.+)(加|减)(\d+)', name)
    if not match: raise ValueError('Unsupported kill formula: ' + name)
    base, operator, amount = match.groups()
    numbers = [int(row['number']) for row in draw['numbers']]
    if len(numbers) != 7: raise ValueError('Incomplete draw')
    if base in ('最小平码', '最大平码'):
        value = (min if base == '最小平码' else max)(numbers[:6])
        positions = [i + 1 for i, n in enumerate(numbers[:6]) if n == value]
        expression = str(value).zfill(2)
    else:
        parts = re.fullmatch(r'(平[1-6]码|特码)(?:([＋－])(平[1-6]码|特码))?', base)
        if not parts: raise ValueError('Unsupported kill base: ' + base)
        left, sign, right = parts.groups()
        positions = [7 if label == '特码' else int(label[1]) for label in (left, right) if label]
        value = numbers[positions[0] - 1]
        expression = str(value).zfill(2)
        if right:
            other = numbers[positions[1] - 1]
            value = value + other if sign == '＋' else value - other
            expression += sign + str(other).zfill(2)
    value += int(amount) if operator == '加' else -int(amount)
    result = kill_value(category, value)
    return {'name': name, 'next': result, 'result': result,
            'calculation': expression + ('＋' if operator == '加' else '－') + amount + '＝' + str(value) + '→杀' + result,
            'sourcePositions': positions}


KILL_ROUTE = '''/* asset-manifests-v1 */
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicSimpleFormulaPost from '@/app/DynamicSimpleFormulaPost';
import IssueScroller from '@/app/IssueScroller';
import {env} from 'cloudflare:workers';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function KillPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {category,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const manifest=await formulaManifests.kill[type];
  const group=manifest.groups[category];
  const index=group?.methods.findIndex((value:any)=>value.rank===method)??-1;
  const current=index>=0?group.methods[index]:null;
  const requested=Number(issue),latest=Number(manifest.issue);
  const fallback=<ArchivedFormulaPost type={type} path={`/posts/kill/${category}/${issue}/${method}`} backHref={`/?type=${type}#board-绝杀公式`} backLabel="返回绝杀板块"/>;
  if(!current||!Number.isInteger(requested)||requested>latest)return fallback;
  const assets=(env as unknown as {ASSETS:{fetch(request:Request):Promise<Response>}}).ASSETS;
  const response=await assets.fetch(new Request(`https://assets.local/generated/kill-history/type-${type}/${category}-${current.rank}.json`));
  if(!response.ok)throw new Error('Missing kill calculation history');
  const data=await response.json() as any;
  if(data.formulaId!==current.formulaId)throw new Error('Kill formula identity mismatch');
  const verified=data.history.find((row:any)=>row.targetPeriod===requested);
  if(requested!==latest&&!verified)return fallback;
  const isHistory=requested<latest;
  const history=data.history.filter((row:any)=>row.targetPeriod<=requested).slice(-5);
  const item={...current,label:group.label,branches:isHistory?verified.branches:data.branches,next:isHistory?verified.branches.map((b:any)=>b.result):current.next||current.values,history,...(isHistory?{verification:verified}:{})};
  const periods=history.map((row:any)=>row.targetPeriod);
  const displayIssue=isHistory?`${Math.min(...periods)}-${Math.max(...periods)}`:issue;
  const availableIssues:number[]=[latest,...data.history.map((row:any)=>Number(row.targetPeriod))];
  const draws=manifest.draws.filter((draw:any)=>draw.period<=(isHistory?requested:requested-1));
  return <DynamicSimpleFormulaPost type={type} issue={displayIssue} navigationIssue={issue} method={method} item={current} draws={draws} board="绝杀" hash="绝杀公式" basePath={`/posts/kill/${category}`} index={index} total={group.methods.length} note="历史分页按当前固定公式回算，不代表当时已发布；当期保存记录见公式历史。所杀结果全部避开下期特号才算准 · 仅供娱乐参考" posterItemOverride={item} periodNav={<IssueScroller issues={availableIssues} current={requested} basePath={`/posts/kill/${category}`} method={method} type={type}/>}/>;
}
'''


def repair_content(issues):
    from archive_formula_history import signature_of, stable_id
    def save(path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    for kind, issue in issues.items():
        folder = ROOT / 'public/generated/zodiac'
        combined = json.loads((folder / f'type-{kind}-{issue:03d}-manifest.json').read_text(encoding='utf-8'))
        for size in (1, 3, 6, 9):
            path = folder / f'type-{kind}-{issue:03d}-{size}-manifest.json'
            split = json.loads(path.read_text(encoding='utf-8'))
            for item in split['group']['methods']:
                item['formulaId'] = stable_id(f'zodiac-{size}', signature_of(item))
            save(path, split)
        # One compact file per selected formula, not the whole year's history
        # duplicated into a giant current manifest or into the Worker bundle.
        draws = sorted(combined['draws'], key=lambda row: int(row['period']))
        if int(draws[-1]['period']) != issue - 1: raise RuntimeError('Kill draw cutoff mismatch')
        path = ROOT / f'public/generated/kill/type-{kind}-{issue:03d}-manifest.json'
        payload = json.loads(path.read_text(encoding='utf-8'))
        for category, group in payload['groups'].items():
            for item in group['methods']:
                names = [branch['name'] for branch in item['branches']]
                branches = [kill_branch(name, draws[-1], category) for name in names]
                if set(b['result'] for b in branches) != set(map(str, item['values'])):
                    raise RuntimeError(f'Kill prediction mismatch: {kind}/{category}/{item["rank"]}')
                history = []
                for source, target in zip(draws, draws[1:]):
                    if int(target['period']) != int(source['period']) + 1: continue
                    bs = [kill_branch(name, source, category) for name in names]
                    special = target['numbers'][6]
                    actual = special['animal'] if category == 'animal' else kill_value(category, special['number'])
                    history.append({'sourcePeriod':int(source['period']), 'targetPeriod':int(target['period']), 'branches':bs,
                        'actualNumber':special['number'], 'actualAnimal':special['animal'], 'actualElement':special.get('element',''),
                        'hit':str(actual) not in {b['result'] for b in bs}})
                save(ROOT / f'public/generated/kill-history/type-{kind}/{category}-{item["rank"]}.json',
                     {'formulaId':item['formulaId'], 'branches':branches, 'history':history})
        payload['draws'] = draws
        save(path, payload)
    route = ROOT / 'app/posts/kill/[category]/[issue]/[method]/page.tsx'
    route.write_text(KILL_ROUTE, encoding='utf-8')
    route = ROOT / 'app/posts/wuxing/[issue]/[method]/page.tsx'
    source = route.read_text(encoding='utf-8')
    old = 'const item={...baseItem,history:(baseItem.history||[]).slice(-5)};'
    new = 'const item={...baseItem,branches:baseItem.branches.map((branch:any)=>({...branch,sourcePositions:(branch.sourcePositions||[]).map((position:number)=>position+1)})),history:(baseItem.history||[]).slice(-5)};'
    if old not in source and new not in source: raise RuntimeError('Unexpected wuxing route')
    route.write_text(source.replace(old,new), encoding='utf-8')
    # Historical min/max sources can differ from the current draw's positions.
    poster = ROOT / 'app/DynamicWuxingPoster.tsx'
    source = poster.read_text(encoding='utf-8')
    old = 'item.branches.flatMap(\n                          (branch) => branch.sourcePositions || [],'
    new = 'entry.branches.flatMap(\n                          (branch, branchIndex) => branch.sourcePositions || item.branches[branchIndex]?.sourcePositions || [],'
    source = source.replace(old, new).replace(': item.branches[0]?.sourcePositions || [];', ': entry.branches[0]?.sourcePositions || item.branches[0]?.sourcePositions || [];')
    poster.write_text(source, encoding='utf-8')
    history = ROOT / 'app/formula-history/page.tsx'
    source = history.read_text(encoding='utf-8')
    source = source.replace("Object.values(value as Record<string,unknown>).flatMap(item=>Array.isArray(item)?item:[item]).filter(item=>item!==null&&item!==undefined&&item!=='').join('、')", "[...new Set(Object.values(value as Record<string,unknown>).flatMap(item=>Array.isArray(item)?item:[item]).filter(item=>item!==null&&item!==undefined&&item!=='').map(String))].join('、')")
    history.write_text(source, encoding='utf-8')
    zodiac_history = ROOT / 'lib/zodiac-history.ts'
    source = zodiac_history.read_text(encoding='utf-8')
    source = source.replace('export type ZodiacMethod={name?:string;', 'export type ZodiacMethod={formulaId?:string;name?:string;')
    source = source.replace("history:histories.slice(-5),formulaId:'',", "history:histories.slice(-5),formulaId:method.formulaId||'',")
    source = source.replace('const wrap=(value:number)=>((Math.trunc(value)-1)%49+49)%49+1;', 'const wrap=(value:number)=>{let number=Math.trunc(value);while(number>49)number-=12;while(number<1)number+=12;return number;};')
    source = source.replace("operation==='modulo'?base%amount:base", "operation==='modulo'?((base%amount)+amount)%amount:base")
    source = source.replace("const sourcePositions=(base:string)=>Array.from(base.matchAll(/平([1-6])码|特码/g),match=>match[0]==='特码'?6:Number(match[1])-1);", "const sourcePositions=(base:string,draw:ZodiacDraw)=>{const ns=values(draw);if(base==='最小平码'||base==='最大平码'){const n=base==='最小平码'?Math.min(...ns.slice(0,6)):Math.max(...ns.slice(0,6));return ns.slice(0,6).flatMap((v,i)=>v===n?[i+1]:[]);}if(base==='六个平码总分')return [1,2,3,4,5,6];if(base==='七码总分')return [1,2,3,4,5,6,7];return Array.from(base.matchAll(/平([1-6])码|特码/g),match=>match[0]==='特码'?7:Number(match[1]));};")
    source = source.replace('result:answer.animal};', "result:answer.animal,sourcePositions:sourcePositions(definition.baseName||'',source)};")
    source = source.replace("sourcePositions:sourcePositions(definition.baseName||'')", "sourcePositions:sourcePositions(definition.baseName||'',forecastSource)")
    zodiac_history.write_text(source, encoding='utf-8')
    # Stored numeric kill predictions are strings. Compare like types; otherwise
    # a killed number was incorrectly marked as a hit in the saved history.
    archive = ROOT / 'scripts/archive_formula_history.py'
    source = archive.read_text(encoding='utf-8')
    source = source.replace("hit = actual not in set(prediction.get('values', []))", "hit = str(actual) not in set(map(str, prediction.get('values', [])))")
    source = source.replace('hit = actual not in set(prediction.get("values", []))', 'hit = str(actual) not in set(map(str, prediction.get("values", [])))')
    archive.write_text(source, encoding='utf-8')
    for snapshot in (ROOT / 'public/generated/formula-history').glob('type-*/snapshots/*.json'):
        payload = json.loads(snapshot.read_text(encoding='utf-8'))
        changed = False
        for row in payload.get('formulas', []):
            if row.get('board') != 'kill' or not row.get('actual'): continue
            actual = row['actual']
            values = (row.get('prediction') or {}).get('values')
            if not values: continue
            category = row.get('group')
            value = actual['animal'] if category == 'animal' else kill_value(category, actual['number'])
            status = 'miss' if str(value) in set(map(str, values)) else 'hit'
            if row.get('status') != status: row['status'] = status; changed = True
        if changed: save(snapshot, payload)
    from publish_history_shards import build
    build()
    print('Content repairs verified: source arrows, kill calculation history, zodiac IDs, prediction deduplication', flush=True)

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
    repair_content(issues)
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
    source = source.replace('sourcePositions:positions}', 'sourcePositions:positions.map(position=>position+1)}')
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
    # Both cache layers must change together; a new proxy must never refill
    # itself from the backend's old seven-day HTML cache.
    backend = ROOT / 'worker/index.ts'
    if backend.exists():
        source = backend.read_text(encoding='utf-8')
        source = source.replace("const isHistory = !html.includes('等待开奖');", "const isHistory = !html.includes('等待开奖') && !html.includes('wuxing-forecast-row');")
        backend.write_text(source, encoding='utf-8')
    # A changed page implementation must not reuse HTML cached by an older build.
    digest = hashlib.sha256(json.dumps(catalog, sort_keys=True).encode())
    sort_audit = ROOT / 'public/generated/home-board-sort-audit.json'
    if sort_audit.exists():
        digest.update(sort_audit.read_bytes())
    for folder in ('app', 'lib', 'worker'):
        for path in sorted((ROOT / folder).rglob('*')):
            if path.is_file() and path.suffix in ('.ts', '.tsx', '.css', '.js'):
                digest.update(str(path.relative_to(ROOT)).replace('\\', '/').encode())
                contents = path.read_text(encoding='utf-8')
                if folder == 'worker':
                    contents = re.sub(r"const CACHE_VERSION = '[^']*';", "const CACHE_VERSION = '<build>';", contents)
                digest.update(contents.encode('utf-8'))
    for proxy in (ROOT / 'worker/cache-proxy.js', ROOT / 'worker/index.ts'):
        if not proxy.exists(): continue
        text = proxy.read_text(encoding='utf-8')
        text, count = re.subn(r"const CACHE_VERSION = '[^']*';", "const CACHE_VERSION = 'poster-" + digest.hexdigest()[:16] + "';", text)
        if count != 1:
            raise RuntimeError('Cannot version HTML cache safely')
        proxy.write_text(text, encoding='utf-8')


if __name__ == '__main__':
    run()
