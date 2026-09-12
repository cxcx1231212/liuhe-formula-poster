"""Repair saved predictions without changing poster designs or formula selection."""
import gzip
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = dict(pingte='pingte-all', pingte2='pingte-two', tema='tema-bundles', zodiac='zodiac', fushi='fushi', danshuang='danshuang', wave='wave', wuxing='wuxing', jiaye='jiaye', kill='kill', size='size', tail='tail', head='head')
KEYS = ('predictionAnimal','predictionNumber','predictionAnimals','predictionNumbers','numbers','nextAnimal','animals','next','values','outputs','output','prediction','result')
RED = {1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46}
BLUE = {3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48}

def wave(n): return '红波' if n in RED else '蓝波' if n in BLUE else '绿波'
def digit(n): return sum(map(int, str(abs(int(n)))))
def wrap49(n): return (int(n)-1) % 49 + 1

def base_value(name, draw):
    ns = [int(x['number']) for x in draw['numbers']]
    if len(ns) != 7: raise ValueError('Incomplete source draw')
    if name in ('最小平码','平码最小值'): return min(ns[:6])
    if name in ('最大平码','平码最大值'): return max(ns[:6])
    if name in ('六个平码总分','平码总分'): return sum(ns[:6])
    if name == '七码总分': return sum(ns)
    if name == '期数合数': return digit(draw['period'])
    def cell(label, feature):
        n = ns[6 if label == '特码' else int(label[1])-1]
        return digit(n) if feature == '合数' else n % 10 if feature == '尾数' else n
    m = re.fullmatch(r'(平[1-6]码|特码)(合数|尾数)?([＋－])(平[1-6]码|特码)(合数|尾数)?', name)
    if m:
        a, f, op, b, g = m.groups()
        return cell(a,f) + (1 if op == '＋' else -1)*cell(b,g)
    m = re.fullmatch(r'(平[1-6]码|特码)(合数|尾数)?',name)
    if m: return cell(*m.groups())
    raise ValueError('Unsupported base: '+name)

def spec_value(spec, draw, board):
    ns = [int(x['number']) for x in draw['numbers']]
    kind, raw_wrap = spec['kind'], True
    if kind == 'single':
        n = ns[spec['pos']]; feature = spec['feature']
        value = digit(n) if feature == 'digit' else n % 10 if feature == 'tail' else n
        raw_wrap = feature == 'raw'
    elif kind == 'global':
        op = spec['op']
        value = {'min':lambda:min(ns[:6]),'max':lambda:max(ns[:6]),'regular_sum':lambda:sum(ns[:6]),'all_sum':lambda:sum(ns),'period_digit_sum':lambda:digit(draw['period'])}[op]()
        raw_wrap = op != 'period_digit_sum'
    elif kind == 'pair':
        a,b,op = ns[spec['a']],ns[spec['b']],spec['op']
        value = {'sum':lambda:a+b,'a_minus_b':lambda:a-b,'b_minus_a':lambda:b-a,'digit_sum':lambda:digit(a)+digit(b),'tail_sum':lambda:a%10+b%10}[op]()
        raw_wrap = op in ('sum','a_minus_b','b_minus_a')
    else: raise ValueError('Unsupported spec')
    return wrap49(value) if board == 'size' or raw_wrap else value

def prediction_for(item, board='', group='', source=None):
    if board=='fushi' and group in ('22','33') and item.get('expansionActive'):
        from fushi_expansion import expanded
        if source is None or int(source['period'])+1 < item['activationIssue']:
            raise ValueError('Missing valid expansion source')
        return {'numbers':[n for _,n in expanded(item,source,item['expansionSize'])]}
    result = {k:item[k] for k in KEYS if k in item and item[k] is not None}
    branches = item.get('branches') or []
    # Save only prediction values, never entire branch metadata as predictions.
    for key, branch_key in (('numbers','number'),('animals','animal')):
        if not result.get(key):
            values = [b[branch_key] for b in branches if b.get(branch_key) is not None]
            if values: result[key] = values
    if not result.get('next'):
        values = [b['next'] for b in branches if b.get('next') is not None]
        if values: result['next'] = values
    if source and board in ('danshuang','wave') and all(k in item for k in ('baseName','operation','amount')):
        raw = base_value(item['baseName'],source)
        if item['operation'] not in ('add','subtract','alternate_add_subtract','double_alternate_add_subtract','triple_alternate_add_subtract','asymmetric_alternate','cyclic_step'): raise ValueError('Unsupported operation')
        period=int(source['period']);op=item['operation']
        subtract = op=='subtract' or (op=='alternate_add_subtract' and period%2==0) or (op=='double_alternate_add_subtract' and ((period-1)//2)%2==1) or (op=='triple_alternate_add_subtract' and ((period-1)//3)%2==1)
        amount=int(item['amount'])
        delta=(amount//100 if period%2 else -(amount%100)) if op=='asymmetric_alternate' else (((period-1)%3+1)*amount if op=='cyclic_step' else (-amount if subtract else amount))
        n = wrap49(raw + delta)
        result = {'next': [wave(n) if board=='wave' else ('合' if '合数' in item.get('label','') else '') + ('单' if (digit(n) if '合数' in item.get('label','') else n)%2 else '双')]}
    if source and board in ('tail','head','size') and item.get('spec'):
        n = spec_value(item['spec'],source,board)
        result = {'next':['大' if n>=25 else '小']} if board=='size' else {'values':[n%10 if board=='tail' else n//10]}
    return result or None

def values(prediction, *keys):
    if not isinstance(prediction,dict): return []
    for key in keys:
        value = prediction.get(key)
        if value is not None and value != [] and value != '':
            return value if isinstance(value,list) else [value]
    return []

def settle(snapshot, draw):
    balls = draw.get('numberList') or []
    if len(balls) != 7: raise ValueError('Refusing settlement with incomplete draw')
    ns = [int(b['number']) for b in balls]
    if len(set(ns)) != 7 or any(n<1 or n>49 for n in ns): raise ValueError('Invalid draw numbers')
    special = balls[6]; n = ns[6]
    all_animals = {b.get('shengXiao') for b in balls}
    regular_animals = {b.get('shengXiao') for b in balls[:6]}
    for row in snapshot.get('formulas',[]):
        p,b,g = row.get('prediction'),row['board'],row.get('group','')
        hit = None
        try:
            if b in ('pingte','pingte2','zodiac'):
                pool = values(p,'predictionAnimal','predictionAnimals','animals','nextAnimal','next')
                if pool:
                    hit = special.get('shengXiao') in pool if b=='zodiac' else (len(set(pool))==2 and set(pool)<=all_animals) if b=='pingte2' else set(pool)<=all_animals
            elif b in ('tema','fushi'):
                animal_game = b=='fushi' and g in ('2x','3x')
                pool = values(p, *('animals','predictionAnimals') if animal_game else ('numbers','predictionNumbers'))
                if pool:
                    pool = set(pool) if animal_game else set(map(int,pool))
                    required = 3 if g in ('33','3x') else 2
                    hit = n in pool if b=='tema' else len(pool & (regular_animals if animal_game else set(ns[:6])))>=required
            elif b in ('danshuang','wave','wuxing','jiaye','size','tail','head','kill'):
                pool = values(p,'values','next','result','output')
                if pool:
                    pool = set(map(str,pool))
                    if b=='danshuang':
                        heshu = '合数' in row.get('label','')
                        actual = ('合' if heshu else '')+('单' if (digit(n) if heshu else n)%2 else '双')
                    elif b=='wave': actual = wave(n)
                    elif b=='wuxing': actual = special.get('wuXing')
                    elif b=='jiaye': actual = '家肖' if special.get('shengXiao') in {'牛','马','羊','鸡','狗','猪'} else '野肖'
                    elif b=='size': actual = '大' if n>=25 else '小'
                    elif b=='tail': actual = str(n%10)
                    elif b=='head': actual = str(n//10)
                    else: actual = str(n) if g=='code' else special.get('shengXiao') if g=='animal' else str(n%10) if g=='tail' else str(n//10) if g=='head' else wave(n)
                    if actual is not None: hit = actual not in pool if b=='kill' else actual in pool
        except (TypeError, ValueError):
            hit = None
        row['status'] = 'unknown' if hit is None else 'hit' if hit else 'miss'
        row['actual'] = {'number':n,'animal':special.get('shengXiao',''),'date':draw.get('lotteryTime','')}

def backup(path):
    content = path.read_bytes()
    digest = hashlib.sha256(content).hexdigest()[:16]
    target = ROOT / 'data/repair-backups/history-integrity-v1' / path.relative_to(ROOT)
    target = target.with_name(target.name+'.'+digest+'.gz')
    target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists(): target.write_bytes(gzip.compress(content,mtime=0))

def save(path, payload):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

def materialize_legacy(directory):
    legacy = directory.parent.with_suffix('.json')
    if not legacy.exists(): return
    for saved in json.loads(legacy.read_text(encoding='utf-8')).get('snapshots',[]):
        saved_path = directory / f"{int(saved['issue']):03d}.json"
        if not saved_path.exists(): save(saved_path,saved)
        # Old periods must retain all original identities even after migration.
        existing = json.loads(saved_path.read_text(encoding='utf-8'))
        ids = {r['formulaId'] for r in existing.get('formulas',[])}
        missing = [r for r in saved.get('formulas',[]) if r['formulaId'] not in ids]
        if missing:
            backup(saved_path)
            existing.setdefault('formulas',[]).extend(missing)
            existing['formulaCount'] = len(existing['formulas'])
            save(saved_path,existing)

def patch_archiver():
    path = ROOT / 'scripts/archive_formula_history.py'
    source = path.read_text(encoding='utf-8')
    if '# history-integrity-v1' in source: return
    a,b = source.index('def prediction_of('),source.index('def score_of(')
    source = source[:a]+'from repair_history_integrity import prediction_for as prediction_of, settle\n# history-integrity-v1\n\n\n'+source[b:]
    a,b = source.index('def settle('),source.index('def snapshot(')
    source = source[:a]+source[b:]
    source = source.replace('"prediction": prediction_of(item),','"prediction": prediction_of(item, board, group, source_draw),')
    source = source.replace('    records = []\n', '    from search_pingte_methods import fetch_year\n    source_draw = next((draw_record(x) for x in fetch_year(lottery_type, year) if int(x["period"]) == issue-1), None)\n    records = []\n')
    source = source.replace('from repair_history_integrity import prediction_for as prediction_of, settle','from repair_history_integrity import prediction_for as prediction_of, settle, draw_record, backup')
    source = source.replace('    current_path.write_text(', '    if current_path.exists(): backup(current_path)\n    current_path.write_text(')
    path.write_text(source,encoding='utf-8')

def draw_record(row):
    if 'numbers' in row: return row
    return {'period':int(row['period']),'date':row.get('lotteryTime',''),'numbers':[{'number':b['number'],'animal':b.get('shengXiao',''),'element':b.get('wuXing','')} for b in row['numberList']]}

def raw_draw(row):
    if 'numberList' in row: return row
    return {'period':row['period'],'lotteryTime':row.get('date',''),'numberList':[{'number':b['number'],'shengXiao':b.get('animal',''),'wuXing':b.get('element','')} for b in row['numbers']]}

def repair_snapshots(catalog):
    from archive_formula_history import signature_of, stable_id, iter_methods, snapshot
    counts = {'restored':0,'unknown':0,'settlementChanged':0,'rejectedManifests':[],'unverifiedPredictions':[]}
    for entry in catalog:
        kind,issue = int(entry['lotteryType']),int(entry['nextPeriod'])
        # Use the same saved draw history as the deployed content pages.
        draw_path = ROOT / f'public/generated/wuxing/type-{kind}-{issue:03d}-manifest.json'
        draws = {int(d['period']):d for d in json.loads(draw_path.read_text(encoding='utf-8'))['draws']}
        directory = ROOT / f'public/generated/formula-history/type-{kind}-2026/snapshots'
        directory.mkdir(parents=True,exist_ok=True)
        # Some lotteries still store older periods only in the annual archive.
        # Materialize every absent period before the shard builder prefers this directory.
        materialize_legacy(directory)
        current = directory / f'{issue:03d}.json'
        if current.exists(): backup(current)
        # Refresh only the current snapshot; historic identities are never replaced.
        save(current,snapshot(kind,2026,issue))
        for path in sorted(directory.glob('*.json')):
            payload = json.loads(path.read_text(encoding='utf-8')); period = int(payload['issue'])
            original = json.dumps(payload,ensure_ascii=False,sort_keys=True)
            lookup = {}
            for board,folder in FOLDERS.items():
                manifest = ROOT / f'public/generated/{folder}/type-{kind}-{period:03d}-manifest.json'
                if not manifest.exists(): continue
                data = json.loads(manifest.read_text(encoding='utf-8'))
                if int(data.get('issue',data.get('nextPeriod',-1))) != period:
                    counts['rejectedManifests'].append(str(manifest.relative_to(ROOT)))
                    print('Do not restore from mismatched period:',manifest,flush=True)
                    continue
                for group,_,item in iter_methods(data):
                    signature = signature_of(item)
                    fid = stable_id(f'{board}-{group}',signature)
                    lookup[fid] = (board,group,signature,item)
            for row in payload.get('formulas',[]):
                match = lookup.get(row['formulaId'])
                if match and match[2] == row['signature']:
                    try:
                        prediction = prediction_for(match[3],match[0],match[1],draws.get(period-1))
                    except (KeyError,ValueError,TypeError) as error:
                        counts['unverifiedPredictions'].append({'type':kind,'issue':period,'formulaId':row['formulaId'],'reason':str(error)})
                        row['prediction'] = None
                        prediction = None
                    if prediction:
                        if not row.get('prediction'): counts['restored'] += 1
                        row['prediction'] = prediction
                        row['predictionSource'] = 'matching-period-manifest'
                # Missing historic manifests remain missing: never use a new rank.
            old = [r.get('status') for r in payload.get('formulas',[])]
            if period in draws: settle(payload,raw_draw(draws[period]))
            counts['settlementChanged'] += sum(a!=r.get('status') for a,r in zip(old,payload.get('formulas',[])))
            counts['unknown'] += sum(r.get('status')=='unknown' for r in payload.get('formulas',[]))
            if json.dumps(payload,ensure_ascii=False,sort_keys=True)!=original:
                backup(path); save(path,payload)
        print('History integrity',kind,counts,flush=True)
    save(ROOT/'data/history-integrity-report.json',counts)

PREDICTION_TEXT = '''const predictionText=(value:unknown):string=>{
  const keys=['predictionAnimal','predictionNumber','predictionAnimals','predictionNumbers','animals','numbers','nextAnimal','next','values','outputs','output','prediction','result'];
  const collect=(input:unknown):string[]=>{
    if(input==null||input==='')return [];
    if(Array.isArray(input))return input.flatMap(collect);
    if(typeof input==='object'){const row=input as Record<string,unknown>;return keys.flatMap(key=>collect(row[key]));}
    return typeof input==='string'||typeof input==='number'?[String(input)]:[];
  };
  return [...new Set(collect(value))].join('、')||'暂无预测数据';
};
'''

def patch_pages():
    path = ROOT / 'app/formula-history/page.tsx'
    source = path.read_text(encoding='utf-8')
    a,b = source.index('const predictionText='),source.index('export default')
    version = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()[:16]
    path.write_text(source[:a]+PREDICTION_TEXT+f'\n// history-integrity-build:{version}\n\n'+source[b:],encoding='utf-8')
    # A fallback selected only by rank could attach a different formula's prediction.
    path = ROOT / 'lib/formula-history.ts'
    source = path.read_text(encoding='utf-8')
    source = source.replace("const wanted=String(row.rank??'').padStart(3,'0');", "const wanted=row.formulaId;")
    source = source.replace("String(item.rank??index+1).padStart(3,'0')===wanted", "item.formulaId===wanted")
    source = source.replace('if(!payload)return null;', 'if(!payload||Number(payload.issue??payload.nextPeriod)!==issue)return null;')
    path.write_text(source,encoding='utf-8')
    path = ROOT / 'app/posts/zodiac/[size]/[issue]/[method]/page.tsx'
    source = path.read_text(encoding='utf-8')
    source = source.replace('for(let value=currentIssue;value>=minimumIssue;value-=6)', 'for(let value=currentIssue;value>=minimumIssue;value--)')
    path.write_text(source,encoding='utf-8')
    path = ROOT / 'app/IssueScroller.tsx'
    source = path.read_text(encoding='utf-8')
    # Include a final partial page without changing the original layout.
    anchor = 'for(let issue=newest-6;issue>=oldest;issue-=5)pageIssues.push(issue);'
    replacement = anchor+"\n  if(pageIssues.at(-1)!>oldest+4)pageIssues.push(oldest);"
    if replacement not in source: source=source.replace(anchor,replacement)
    path.write_text(source,encoding='utf-8')

def run():
    # Fail before any live-data changes if the known regression returns.
    fixture = {'numberList':[{'number':n,'shengXiao':a,'wuXing':'金'} for n,a in zip([22,24,19,10,20,1,30],['鸡','羊','鼠','鸡','猪','马','牛'])]}
    rows = [{'board':'fushi','group':'22','prediction':{'numbers':[19,20]}}, {'board':'pingte2','prediction':None}, {'board':'fushi','group':'2x','prediction':{'animals':['牛','鼠']}}]
    settle({'formulas':rows},fixture)
    if [r['status'] for r in rows] != ['hit','unknown','miss']:
        raise RuntimeError('History regression checks failed')
    catalog = json.loads((ROOT/'public/generated/lottery-catalog.json').read_text(encoding='utf-8'))
    for entry in catalog:
        kind,issue = int(entry['lotteryType']),int(entry['nextPeriod'])
        path = ROOT / f'public/generated/wuxing/type-{kind}-{issue:03d}-manifest.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        if data.get('historyFormat') != 'branch-gzip-v1':
            backup(path)
            subprocess.run([sys.executable,'-u',str(ROOT/'scripts/generate_wuxing_posters.py'),'--type',str(kind),'--year','2026'],check=True,cwd=ROOT)
            data = json.loads(path.read_text(encoding='utf-8'))
            if data.get('historyFormat')!='branch-gzip-v1' or not any(m.get('lineCount')==1 for m in data['methods']):
                raise RuntimeError('Wuxing regeneration did not produce a complete current manifest')
    patch_archiver()
    repair_snapshots(catalog)
    patch_pages()
    print('History integrity repair completed; original layouts retained',flush=True)

if __name__ == '__main__': run()
