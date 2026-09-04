"""Versioned 8/10-number expansion. Never expand predictions before activation."""
import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACTIVATION = {1: 97, 5: 248, 8: 248}
SIZES = {'22': 8, '33': 10}
VERSION = 'fushi-8-10-v1'


def wrap(value):
    while value > 49: value -= 12
    while value < 1: value += 12
    return value


@lru_cache(maxsize=1024)
def backups(numbers):
    result = []
    seen = set()
    for amount in range(1, 50):
        for index, number in enumerate(numbers):
            value = wrap(number + amount)
            if value not in seen:
                seen.add(value)
                result.append((('特码' if index == 6 else f'平{index+1}码') + f'加{amount}', value))
    return tuple(result)


def expanded(method, source, size):
    from board_sort_scores import calculate
    numbers = tuple(int(b['number']) for b in source['numbers'])
    if len(numbers) != 7 or len(set(numbers)) != 7 or not all(1 <= n <= 49 for n in numbers):
        raise ValueError('Expansion requires a complete valid source draw')
    original = [(b['name'], calculate(b, source)) for b in method['branches']]
    seen = set()
    result = []
    for name, number in original + list(backups(numbers)):
        if number in seen: continue
        seen.add(number)
        result.append((name, number))
        if len(result) == size: break
    if len(seen) != size or not {n for _, n in original} <= seen:
        raise ValueError('Cannot preserve originals and fill requested pool')
    return result


def score_expanded(method, pairs, required):
    from board_sort_scores import summarize
    rows = []
    for source, target in pairs:
        if int(target['period']) < method['activationIssue']: continue
        pool = {n for _, n in expanded(method, source, method['expansionSize'])}
        rows.append(len(pool & {int(b['number']) for b in target['numbers'][:6]}) >= required)
    return summarize(rows) if rows else dict(recentStreak=0, streak=0, totalRate=0,
                                           recent30Rate=0, recent30Hits=0, scoredPeriods=0)


TS_SELECTION = r'''
// fushi-8-10-v1: a fixed, prior-draw-only expansion; never applied retroactively.
const expandedWrap=(value:number)=>{let n=Math.trunc(value);while(n>49)n-=12;while(n<1)n+=12;return n;};
const selectBranches=(method:FushiMethod,source:FushiDraw,targetPeriod:number,kind:string)=>{
  const active=kind==='number'&&method.expansionSize&&targetPeriod>=(method.activationIssue||Infinity);
  const original=method.branches.map(branch=>({...evaluate(source,branch.name,!!active),name:branch.name}));
  if(!active)return original;
  if(source.numbers.length!==7)throw new Error('Incomplete expansion source');
  const result:typeof original=[],seen=new Set<number>();
  const add=(name:string)=>{const value={...evaluate(source,name,true),name};if(!seen.has(value.number)){seen.add(value.number);result.push(value);}};
  for(const branch of method.branches)add(branch.name);
  for(let amount=1;amount<=49&&result.length<method.expansionSize!;amount++){
    for(let position=1;position<=7&&result.length<method.expansionSize!;position++)add(`${position===7?'特码':`平${position}码`}加${amount}`);
  }
  if(result.length!==method.expansionSize)throw new Error('Incorrect expanded pool size');
  return result;
};
'''


def replace_once(text, old, new):
    if new in text: return text
    if text.count(old) != 1: raise RuntimeError('Unexpected source anchor: ' + old[:100])
    return text.replace(old, new)


def patch_sources():
    changes = {}
    path = ROOT / 'lib/fushi-history.ts'
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, 'export type FushiMethod={rank:string;',
                        'export type FushiMethod={expansionSize?:number;activationIssue?:number;expansionActive?:boolean;formulaId?:string;rank:string;')
    text = replace_once(text, 'const evaluate=(draw:FushiDraw,name:string)=>{',
                        'const evaluate=(draw:FushiDraw,name:string,useExpandedWrap=false)=>{')
    text = replace_once(text, 'const result=wrap(raw),animal=',
                        'const result=useExpandedWrap?expandedWrap(raw):wrap(raw),animal=')
    text = replace_once(text, 'export function buildFushiPosterItem(', TS_SELECTION+'\nexport function buildFushiPosterItem(')
    text = replace_once(text, 'if(target.period>requestedIssue)continue;',
                        "if(target.period>requestedIssue||target.period!==source.period+1||source.numbers.length!==7||target.numbers.length!==7)continue;\n    if(kind==='number'&&method.expansionSize&&requestedIssue>=(method.activationIssue||Infinity)&&target.period<method.activationIssue!)continue;")
    text = replace_once(text, 'const evaluated=method.branches.map(branch=>evaluate(source,branch.name));',
                        'const evaluated=selectBranches(method,source,target.period,kind);')
    text = replace_once(text, 'name:method.branches[branchIndex].name,calculation:displayCalculation(item)',
                        "name:item.name,sourcePositions:Array.from(item.name.matchAll(/平([1-6])码|特码/g),m=>m[0]==='特码'?7:Number(m[1])),calculation:displayCalculation(item)")
    text = replace_once(text, 'const forecast=method.branches.map(branch=>evaluate(source,branch.name));',
                        'const forecast=selectBranches(method,source,requestedIssue,kind);')
    text = replace_once(text, 'branches:method.branches.map((branch,index)=>', 'branches:forecast.map((branch,index)=>')
    text = replace_once(text, 'sourcePositions:sourcePositions(branch.name)',
                        "sourcePositions:kind==='number'&&method.expansionSize&&requestedIssue>=(method.activationIssue||Infinity)?Array.from(branch.name.matchAll(/平([1-6])码|特码/g),m=>m[0]==='特码'?7:Number(m[1])):sourcePositions(branch.name)")
    text = replace_once(text, 'formulaId:`FUSHI-${method.rank}`', 'formulaId:method.formulaId||`FUSHI-${method.rank}`')
    changes[path] = text
    path = ROOT / 'scripts/board_sort_scores.py'
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, '    def score(self,board,group,item):\n',
        "    def score(self,board,group,item):\n        if board=='fushi' and group in ('22','33') and item.get('expansionActive'):\n            from fushi_expansion import score_expanded\n            return score_expanded(item,self.pairs,3 if group=='33' else 2)\n")
    changes[path] = text
    path = ROOT / 'scripts/repair_history_integrity.py'
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, "def prediction_for(item, board='', group='', source=None):\n",
        "def prediction_for(item, board='', group='', source=None):\n    if board=='fushi' and group in ('22','33') and item.get('expansionActive'):\n        from fushi_expansion import expanded\n        if source is None or int(source['period'])+1 < item['activationIssue']:\n            raise ValueError('Missing valid expansion source')\n        return {'numbers':[n for _,n in expanded(item,source,item['expansionSize'])]}\n")
    changes[path] = text
    path = ROOT / 'app/posts/fushi/[category]/[issue]/[method]/page.tsx'
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, '</section></article>',
        '</section>{info.kind===\'number\'&&raw.expansionSize&&<p className="formula-note">{raw.activationIssue}期起启用{raw.expansionSize}码扩展方案：保留原公式结果，按固定分支去重补足；只计六个正码，命中至少{info.required}码才算中。启用前保留旧方案，启用后成绩单独累计，不保证盈利。</p>}</article>')
    changes[path] = text
    for path, text in changes.items(): path.write_text(text, encoding='utf-8')


def prepare():
    patch_sources()
    catalog = json.loads((ROOT/'public/generated/lottery-catalog.json').read_text(encoding='utf-8'))
    checks = []
    for entry in catalog:
        kind, issue = int(entry['lotteryType']), int(entry['nextPeriod'])
        if kind not in ACTIVATION: raise ValueError('Unknown lottery type')
        path = ROOT / f'public/generated/fushi/type-{kind}-{issue:03d}-manifest.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        if int(data['issue']) != issue: raise ValueError('Stale fushi manifest')
        source = next((d for d in data['draws'] if int(d['period']) == issue-1), None)
        if source is None: raise ValueError('Missing immediately previous draw')
        for group, size in SIZES.items():
            active = issue >= ACTIVATION[kind]
            metadata = data['groups'][group]
            if active: metadata['poolSize'] = size
            for method in metadata['methods']:
                method.update(expansionSize=size, activationIssue=ACTIVATION[kind],
                              expansionActive=active, expansionVersion=VERSION)
                if active:
                    suffix = f'【{size}码扩展v1】'
                    if not method['sourceKey'].endswith(suffix): method['sourceKey'] += suffix
                    method['numbers'] = [n for _, n in expanded(method, source, size)]
                    for key in ('next','predictionNumbers','predictionNumber'): method.pop(key, None)
                test_source = {**source,'period':ACTIVATION[kind]-1}
                checks.append({'method':method,'source':test_source,
                               'issue':ACTIVATION[kind], 'size':size, 'required':2 if group=='22' else 3,
                               'expected':[n for _,n in expanded(method,test_source,size)]})
            print('Fushi expansion', kind, issue, group, size, 'active' if active else f'from {ACTIVATION[kind]}', flush=True)
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    (ROOT/'fushi-expansion-checks.json').write_text(json.dumps(checks,ensure_ascii=False),encoding='utf-8')


if __name__ == '__main__': prepare()
